from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class PublicUser(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    created_at: datetime


class RoleUpdateRequest(BaseModel):
    role: str = Field(min_length=2, max_length=80)


class ResumeUploadResponse(BaseModel):
    id: str
    user_id: str
    role: str
    resume_file_name: str
    resume_file_path: str
    uploaded_at: datetime
    extracted_text: str
    parsed_data: Dict[str, Any]


class ResumeListItem(BaseModel):
    id: str
    user_id: str
    role: str
    resume_file_name: str
    resume_file_path: str
    uploaded_at: datetime
    parsed_data: Dict[str, Any]


class ResumeDetailResponse(ResumeUploadResponse):
    pass


class ResumeSummaryResponse(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    skills: List[str] = []
    education: List[str] = []
    projects: List[str] = []
    experience: List[str] = []
    certifications: List[str] = []


class ATSAnalysisRequest(BaseModel):
    selected_role: str = Field(min_length=2, max_length=120)
    resume_text: str = Field(min_length=20)


class ATSRecommendedProject(BaseModel):
    title: str
    technologies: List[str] = []
    difficulty: str
    reason: str


class ATSCareerRoadmap(BaseModel):
    skills_to_learn: List[str] = []
    certifications: List[str] = []
    projects: List[str] = []
    expected_ats_after_improvement: int = Field(ge=0, le=100)


class ATSAnalysisResponse(BaseModel):
    role: str
    ats_score: int = Field(ge=0, le=100)
    strengths: List[str] = []
    missing_skills: List[str] = []
    missing_certifications: List[str] = []
    missing_keywords: List[str] = []
    recommended_skills: List[str] = []
    ats_keywords: List[str] = []
    recommended_projects: List[ATSRecommendedProject] = []
    improvement_suggestions: List[str] = []
    career_roadmap: ATSCareerRoadmap
