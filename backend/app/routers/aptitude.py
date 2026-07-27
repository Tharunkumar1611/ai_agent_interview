from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.aptitude import (
    AptitudeAssessmentStartResponse,
    AptitudeDashboardResponse,
    AptitudeReportResponse,
    AptitudeResultResponse,
    AptitudeSubmitRequest,
)
from app.services.aptitude_bank import DEFAULT_DURATION_MINUTES
from app.services.aptitude_engine import get_assessment_report, get_dashboard, get_latest_insight, start_test, submit_test

router = APIRouter(prefix="/aptitude", tags=["aptitude-assessment"])


@router.get("/questions")
async def list_questions(current_user=Depends(get_current_user)):
    del current_user
    from app.services.aptitude_bank import get_public_bank

    return {"questions": get_public_bank()}


@router.post("/start-test", response_model=AptitudeAssessmentStartResponse)
async def create_test(current_user=Depends(get_current_user)):
    try:
        return await start_test(current_user["id"] if "id" in current_user else str(current_user["_id"]), DEFAULT_DURATION_MINUTES)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.post("/submit-test", response_model=AptitudeResultResponse)
async def submit_test_route(payload: AptitudeSubmitRequest, current_user=Depends(get_current_user)):
    try:
        return await submit_test(payload.assessment_id, current_user["id"] if "id" in current_user else str(current_user["_id"]), [attempt.model_dump() for attempt in payload.attempts])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/result/{assessment_id}", response_model=AptitudeReportResponse)
async def get_result(assessment_id: str, current_user=Depends(get_current_user)):
    try:
        return await get_assessment_report(assessment_id, current_user["id"] if "id" in current_user else str(current_user["_id"]))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/roadmap/{assessment_id}")
async def get_roadmap(assessment_id: str, current_user=Depends(get_current_user)):
    try:
        report = await get_assessment_report(assessment_id, current_user["id"] if "id" in current_user else str(current_user["_id"]))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    result = report["result"]
    return {
        "assessment_id": assessment_id,
        "roadmap": result.get("roadmap", []),
        "daily_practice_plan": result.get("daily_practice_plan", []),
    }


@router.get("/dashboard/{user_id}", response_model=AptitudeDashboardResponse)
async def dashboard(user_id: str, current_user=Depends(get_current_user)):
    authenticated_user_id = current_user["id"] if "id" in current_user else str(current_user["_id"])
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return await get_dashboard(user_id)


@router.get("/insights/latest")
async def latest(current_user=Depends(get_current_user)):
    return await get_latest_insight(current_user["id"] if "id" in current_user else str(current_user["_id"]))
