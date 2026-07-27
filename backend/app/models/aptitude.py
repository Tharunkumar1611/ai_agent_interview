from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AptitudeQuestionPublic(BaseModel):
    id: str
    section: str
    section_label: str
    topic: str
    difficulty: str
    question: str
    options: List[str]
    marks: int = 1


class AptitudeAssessmentStartResponse(BaseModel):
    assessment_id: str
    user_id: str
    duration_minutes: int
    started_at: datetime
    ends_at: datetime
    questions: List[AptitudeQuestionPublic]


class AptitudeQuestionAttempt(BaseModel):
    question_id: str
    selected_option: Optional[str] = None
    marked_for_review: bool = False
    time_spent_seconds: float = Field(default=0, ge=0)


class AptitudeSubmitRequest(BaseModel):
    assessment_id: str
    attempts: List[AptitudeQuestionAttempt]


class AptitudeQuestionResult(BaseModel):
    section: str
    section_label: str
    topic: str
    question_id: str
    question: str
    difficulty: str
    selected_option: Optional[str] = None
    correct_answer: str
    explanation: str
    marks: int
    marks_awarded: float
    is_correct: bool
    time_spent_seconds: float


class AptitudeSectionScore(BaseModel):
    section: str
    section_label: str
    score: float
    correct_answers: int
    wrong_answers: int
    total_questions: int
    accuracy_percentage: float
    time_spent_seconds: float


class AptitudeTopicScore(BaseModel):
    section: str
    topic: str
    score: float
    correct_answers: int
    wrong_answers: int
    total_questions: int
    accuracy_percentage: float
    time_spent_seconds: float
    difficulty_breakdown: Dict[str, float]


class AptitudeDifficultyPerformance(BaseModel):
    difficulty: str
    score: float
    correct_answers: int
    wrong_answers: int
    total_questions: int
    accuracy_percentage: float


class AptitudeRoadmapItem(BaseModel):
    week: str
    focus: str
    topics: List[str]
    practice: List[str]
    goal: str


class AptitudeDailyPracticeItem(BaseModel):
    day: str
    focus: str
    drills: List[str]
    target_questions: int
    mode: str


class AptitudeResultResponse(BaseModel):
    assessment_id: str
    user_id: str
    overall_score: float
    correct_answers: int
    wrong_answers: int
    total_questions: int
    accuracy_percentage: float
    time_taken_minutes: float
    section_scores: List[AptitudeSectionScore]
    topic_scores: List[AptitudeTopicScore]
    difficulty_performance: List[AptitudeDifficultyPerformance]
    strong_topics: List[str]
    weak_topics: List[str]
    most_incorrect_areas: List[str]
    speed_issues: List[str]
    accuracy_issues: List[str]
    confidence_level: str
    overall_readiness: str
    ai_feedback: Dict[str, List[str]]
    ai_summary: List[str]
    roadmap: List[AptitudeRoadmapItem]
    daily_practice_plan: List[AptitudeDailyPracticeItem]
    question_results: List[AptitudeQuestionResult]
    performance_summary: Dict[str, Any]
    submitted_at: datetime
    status: str


class AptitudeReportResponse(BaseModel):
    result: AptitudeResultResponse
    assessment: Dict[str, Any]


class AptitudeDashboardResponse(BaseModel):
    has_result: bool
    result: Optional[AptitudeResultResponse] = None
    assessment: Optional[Dict[str, Any]] = None
    progress: Dict[str, Any] = {}
    practice_history: List[Dict[str, Any]] = []
