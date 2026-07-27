from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class MockInterviewStartRequest(BaseModel):
    selected_role: Optional[str] = None


class MockInterviewAnswerRequest(BaseModel):
    interview_id: str
    question_id: str
    answer: str = ""
    transcript: str = ""
    answer_duration_seconds: int = Field(default=0, ge=0)
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class MockInterviewNextRequest(BaseModel):
    interview_id: str


class MockInterviewCompleteRequest(BaseModel):
    interview_id: str
