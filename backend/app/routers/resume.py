from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.dependencies import get_current_user
from app.db.mongodb import get_database
from app.models.schemas import ATSAnalysisRequest, ATSAnalysisResponse, ResumeDetailResponse, ResumeListItem, ResumeUploadResponse
from app.services.ats_service import ATSAnalysisInput, analyze_resume_with_groq
from app.services.pdf_service import extract_text_from_pdf, parse_resume_text
from app.utils.serializers import serialize_resume

router = APIRouter(prefix="/resume", tags=["resume"])

ALLOWED_CONTENT_TYPES = {"application/pdf"}


def _resume_upload_path(filename: str) -> Path:
    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_filename = filename.replace(" ", "_")
    return upload_dir / f"{uuid4().hex}_{safe_filename}"


async def _load_resume_document(resume_id: str, user_id: ObjectId):
    database = get_database()
    try:
        document = await database.resumes.find_one({"_id": ObjectId(resume_id), "user_id": user_id})
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume id") from exc

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return document


@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    role: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")

    database = get_database()
    upload_path = _resume_upload_path(file.filename)
    file_bytes = await file.read()
    upload_path.write_bytes(file_bytes)

    extracted_text = extract_text_from_pdf(upload_path)
    parsed_data = parse_resume_text(extracted_text)

    document = {
        "user_id": current_user["_id"],
        "role": role.strip() or current_user.get("role", "Software Engineer"),
        "resume_file_name": file.filename,
        "resume_file_path": str(upload_path),
        "uploaded_at": datetime.now(timezone.utc),
        "extracted_text": extracted_text,
        "parsed_data": parsed_data,
    }

    result = await database.resumes.insert_one(document)
    document["_id"] = result.inserted_id
    return serialize_resume(document)


@router.get("/user-resumes", response_model=list[ResumeListItem])
async def get_user_resumes(current_user=Depends(get_current_user)):
    database = get_database()
    cursor = database.resumes.find({"user_id": current_user["_id"]}).sort("uploaded_at", -1)
    resumes = [serialize_resume(document) async for document in cursor]
    return resumes


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
async def get_resume(resume_id: str, current_user=Depends(get_current_user)):
    document = await _load_resume_document(resume_id, current_user["_id"])
    return serialize_resume(document)


@router.get("/download/{resume_id}")
async def download_resume(resume_id: str, current_user=Depends(get_current_user)):
    document = await _load_resume_document(resume_id, current_user["_id"])
    file_path = Path(document["resume_file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume file not found")
    return FileResponse(path=file_path, filename=document["resume_file_name"], media_type="application/pdf")


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, current_user=Depends(get_current_user)):
    database = get_database()
    document = await _load_resume_document(resume_id, current_user["_id"])
    file_path = Path(document["resume_file_path"])
    if file_path.exists():
        file_path.unlink()
    await database.resumes.delete_one({"_id": document["_id"]})
    return {"message": "Resume deleted successfully"}


@router.post("/analyze-ats", response_model=ATSAnalysisResponse)
async def analyze_ats(payload: ATSAnalysisRequest, current_user=Depends(get_current_user)):
    del current_user
    analysis_input = ATSAnalysisInput(
        selected_role=payload.selected_role.strip(),
        resume_text=payload.resume_text.strip(),
    )
    return analyze_resume_with_groq(analysis_input)
