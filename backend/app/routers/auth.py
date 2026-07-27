from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.dependencies import get_current_user
from app.db.mongodb import ensure_database_connection, get_database, is_database_connected, get_database_startup_error
from app.models.schemas import LoginRequest, RegisterRequest, RoleUpdateRequest, TokenResponse
from app.utils.security import create_access_token, hash_password, verify_password
from app.utils.serializers import serialize_user

router = APIRouter(prefix="/auth", tags=["auth"])
DEFAULT_ROLE = "Software Engineer"


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    if not is_database_connected():
        try:
            await ensure_database_connection()
        except Exception as exc:
            startup_error = get_database_startup_error()
            detail = str(startup_error or exc) or "Database is unavailable"
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail) from exc

    database = get_database()
    existing_user = await database.users.find_one({"email": payload.email.lower()})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_document = {
        "name": payload.name.strip(),
        "email": payload.email.lower(),
        "password": hash_password(payload.password),
        "role": DEFAULT_ROLE,
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = await database.users.insert_one(user_document)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered") from exc

    user_document["_id"] = result.inserted_id
    token = create_access_token(subject=user_document["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user_document),
    }


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    if not is_database_connected():
        try:
            await ensure_database_connection()
        except Exception as exc:
            startup_error = get_database_startup_error()
            detail = str(startup_error or exc) or "Database is unavailable"
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail) from exc

    database = get_database()
    user = await database.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(subject=user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@router.get("/profile")
async def profile(current_user=Depends(get_current_user)):
    return serialize_user(current_user)


@router.patch("/profile/role")
async def update_profile_role(payload: RoleUpdateRequest, current_user=Depends(get_current_user)):
    if not is_database_connected():
        try:
            await ensure_database_connection()
        except Exception as exc:
            startup_error = get_database_startup_error()
            detail = str(startup_error or exc) or "Database is unavailable"
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail) from exc

    database = get_database()
    await database.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"role": payload.role.strip()}},
    )
    updated_user = await database.users.find_one({"_id": current_user["_id"]})
    return serialize_user(updated_user)
