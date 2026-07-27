from __future__ import annotations

from typing import Optional
from urllib.parse import quote, unquote

import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING

from app.core.config import get_settings

client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None
_startup_error: Optional[Exception] = None


def normalize_mongodb_url(raw_url: str) -> str:
    if not raw_url:
        return raw_url

    if "://" not in raw_url:
        return raw_url

    scheme, rest = raw_url.split("://", 1)
    if "@" not in rest or ":" not in rest.split("@", 1)[0]:
        return raw_url

    credentials, host_and_query = rest.rsplit("@", 1)
    username, password = credentials.split(":", 1)

    encoded_username = quote(unquote(username), safe="")
    encoded_password = quote(unquote(password), safe="")
    return f"{scheme}://{encoded_username}:{encoded_password}@{host_and_query}"


def get_database() -> AsyncIOMotorDatabase:
    if _database is None:
        raise RuntimeError("MongoDB is not connected")
    return _database


async def connect_to_mongodb() -> None:
    global client, _database, _startup_error

    settings = get_settings()
    mongodb_url = normalize_mongodb_url(settings.mongodb_url)
    if not mongodb_url:
        raise RuntimeError("MONGODB_URL is not configured")

    client = AsyncIOMotorClient(
        mongodb_url,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=5000,
    )
    await client.admin.command("ping")
    _database = client[settings.mongodb_db_name]
    _startup_error = None

    await _database.users.create_index([("email", ASCENDING)], unique=True)
    await _database.resumes.create_index([("user_id", ASCENDING), ("uploaded_at", ASCENDING)])


def is_database_connected() -> bool:
    return _database is not None


def get_database_startup_error() -> Optional[Exception]:
    return _startup_error


async def ensure_database_connection() -> None:
    if is_database_connected():
        return

    try:
        await connect_to_mongodb()
    except Exception as exc:
        global _startup_error
        _startup_error = exc
        raise


async def close_mongodb_connection() -> None:
    global client, _database, _startup_error

    if client is not None:
        client.close()
    client = None
    _database = None
    _startup_error = None
