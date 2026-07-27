from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.mock_interview import (
    MockInterviewAnswerRequest,
    MockInterviewCompleteRequest,
    MockInterviewNextRequest,
    MockInterviewStartRequest,
)
from app.services.mock_interview_engine import (
    complete_mock_interview,
    get_interview_report,
    get_user_interview_history,
    next_question,
    start_mock_interview,
    submit_voice_answer,
)

router = APIRouter(prefix="/mock-interview", tags=["mock-interview"])


@router.post("/start")
async def start_interview(payload: MockInterviewStartRequest, current_user=Depends(get_current_user)):
    try:
        user_id = current_user["id"] if "id" in current_user else str(current_user["_id"])
        resume_context = None
        try:
            from app.db.mongodb import get_database

            database = get_database()
            latest_resume = await database.resumes.find({"user_id": user_id}).sort("uploaded_at", -1).limit(1).to_list(length=1)
            resume_context = latest_resume[0].get("parsed_data") if latest_resume else None
        except Exception:
            resume_context = None
        return await start_mock_interview(user_id, payload.selected_role, resume_context)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.post("/answer")
async def submit_answer(payload: MockInterviewAnswerRequest, current_user=Depends(get_current_user)):
    try:
        user_id = current_user["id"] if "id" in current_user else str(current_user["_id"])
        return await submit_voice_answer(user_id, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/next")
async def move_next(payload: MockInterviewNextRequest, current_user=Depends(get_current_user)):
    try:
        user_id = current_user["id"] if "id" in current_user else str(current_user["_id"])
        return await next_question(user_id, payload.interview_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/complete")
async def complete_interview(payload: MockInterviewCompleteRequest, current_user=Depends(get_current_user)):
    try:
        user_id = current_user["id"] if "id" in current_user else str(current_user["_id"])
        return await complete_mock_interview(user_id, payload.interview_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/report/{interview_id}")
async def get_report(interview_id: str, current_user=Depends(get_current_user)):
    try:
        user_id = current_user["id"] if "id" in current_user else str(current_user["_id"])
        return await get_interview_report(user_id, interview_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/history")
async def get_history(current_user=Depends(get_current_user)):
    user_id = current_user["id"] if "id" in current_user else str(current_user["_id"])
    return {"interviews": await get_user_interview_history(user_id)}
