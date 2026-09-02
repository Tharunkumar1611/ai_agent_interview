from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.dsa import (
    DSAExecuteRequest,
    DSAExecuteResponse,
    DSAQuestionSelectionResponse,
    DSAReportResponse,
    DSASubmitRequest,
    DSAViolationRequest,
    DSAViolationResponse,
)
from app.services.dsa_bank import DEFAULT_DURATION_MINUTES
from app.services.dsa_engine import (
    get_assessment_report,
    get_latest_insight,
    log_violation,
    start_assessment,
    submit_assessment,
)
from app.services.code_runner import run_code_for_question

router = APIRouter(prefix="/dsa", tags=["dsa-assessment"])


@router.get("/questions")
async def list_questions(current_user=Depends(get_current_user)):
    del current_user
    from app.services.dsa_bank import get_public_bank

    return {"questions": get_public_bank()}


@router.post("/assessments/start", response_model=DSAQuestionSelectionResponse)
async def create_assessment(current_user=Depends(get_current_user)):
    try:
        assessment = await start_assessment(current_user["id"] if "id" in current_user else str(current_user["_id"]), DEFAULT_DURATION_MINUTES)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    return assessment


@router.post("/execute", response_model=DSAExecuteResponse)
async def execute_question(payload: DSAExecuteRequest, current_user=Depends(get_current_user)):
    assessment_id = payload.assessment_id
    user_id = current_user["id"] if "id" in current_user else str(current_user["_id"])
    try:
        question = run_code_for_question(payload.question_id, payload.language, payload.code, hidden=False)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    from app.services.dsa_bank import get_question, get_public_question

    question_document = get_public_question(get_question(payload.question_id))
    result = {
        "topic": question_document["topic"],
        "question_id": question_document["id"],
        "title": question_document["title"],
        "language": payload.language,
        "test_cases_passed": question["passed"],
        "total_test_cases": question["total"],
        "execution_efficiency": 0.0,
        "time_taken_seconds": 0.0,
        "score": round((question["passed"] / max(question["total"], 1)) * 70.0, 2),
        "runtime_ms": question["average_runtime_ms"],
        "status": question["status"],
        "details": question["test_results"],
        "message": question["message"],
    }
    return {"assessment_id": assessment_id, "question": question_document, "result": result}


@router.post("/assessments/{assessment_id}/violations", response_model=DSAViolationResponse)
async def record_violation(assessment_id: str, payload: DSAViolationRequest, current_user=Depends(get_current_user)):
    try:
        return await log_violation(assessment_id, current_user["id"] if "id" in current_user else str(current_user["_id"]), payload.violation_type, payload.message)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/assessments/{assessment_id}/submit")
async def submit_assessment_route(assessment_id: str, payload: DSASubmitRequest, current_user=Depends(get_current_user)):
    try:
        result = await submit_assessment(assessment_id, current_user["id"] if "id" in current_user else str(current_user["_id"]), [attempt.model_dump() for attempt in payload.attempts])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return result


@router.get("/assessments/{assessment_id}/report", response_model=DSAReportResponse)
async def get_report(assessment_id: str, current_user=Depends(get_current_user)):
    try:
        return await get_assessment_report(assessment_id, current_user["id"] if "id" in current_user else str(current_user["_id"]))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/insights/latest")
async def get_latest_insights(current_user=Depends(get_current_user)):
    return await get_latest_insight(current_user["id"] if "id" in current_user else str(current_user["_id"]))
