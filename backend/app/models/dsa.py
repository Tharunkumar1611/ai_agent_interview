from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DSAQuestionPublic(BaseModel):
    id: str
    topic: str
    difficulty: str
    title: str
    problem_statement: str
    constraints: List[str] = []
    sample_input: str
    sample_output: str
    explanation: str
    function_name: str
    starter_code: Dict[str, str]


class DSAQuestionSelectionResponse(BaseModel):
    assessment_id: str
    user_id: str
    duration_minutes: int
    started_at: datetime
    ends_at: datetime
    questions: List[DSAQuestionPublic]


class DSAExecuteRequest(BaseModel):
    assessment_id: str
    question_id: str
    language: str = Field(min_length=2, max_length=32)
    code: str = Field(min_length=1)


class DSAQuestionRunResult(BaseModel):
    topic: str
    question_id: str
    title: str
    language: str
    test_cases_passed: int
    total_test_cases: int
    execution_efficiency: float
    time_taken_seconds: float
    score: float
    runtime_ms: float
    status: str
    details: List[Dict[str, Any]] = []
    message: Optional[str] = None


class DSAExecuteResponse(BaseModel):
    assessment_id: str
    question: DSAQuestionPublic
    result: DSAQuestionRunResult


class DSAQuestionAttempt(BaseModel):
    question_id: str
    language: str = Field(min_length=2, max_length=32)
    code: str = Field(min_length=1)
    time_spent_seconds: float = Field(default=0, ge=0)


class DSASubmitRequest(BaseModel):
    assessment_id: str
    attempts: List[DSAQuestionAttempt]


class DSAViolationRequest(BaseModel):
    assessment_id: str
    violation_type: str = Field(min_length=2, max_length=64)
    message: Optional[str] = None


class DSAViolationResponse(BaseModel):
    assessment_id: str
    violation_count: int
    warning_level: str
    auto_submit_required: bool


class TopicScoreItem(BaseModel):
    topic: str
    score: float
    difficulty: str
    time_spent_seconds: float
    test_cases_passed: int
    total_test_cases: int


class DSARoadmapItem(BaseModel):
    topic: str
    concepts_to_learn: List[str]
    important_algorithms: List[str]
    recommended_practice_count: int
    difficulty_progression: List[str]


class DSAInsightBlock(BaseModel):
    title: str
    items: List[str]


class DSAResultResponse(BaseModel):
    assessment_id: str
    user_id: str
    overall_score: float
    topic_scores: List[TopicScoreItem]
    strengths: List[str]
    moderate_areas: List[str]
    weak_areas: List[str]
    ai_recommendations: List[str]
    roadmap: List[DSARoadmapItem]
    performance_summary: Dict[str, Any]
    question_results: List[DSAQuestionRunResult]
    total_violations: int
    submitted_at: datetime
    status: str


class DSAReportResponse(BaseModel):
    result: DSAResultResponse
    assessment: Dict[str, Any]
    violation_logs: List[Dict[str, Any]]
