from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Dict
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import get_settings


GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


ROLE_PROFILES: Dict[str, Dict[str, list[str]]] = {
    "software engineer": {
        "required_skills": ["python", "java", "javascript", "data structures", "algorithms", "git"],
        "preferred_skills": ["system design", "rest api", "testing", "docker", "cloud"],
        "keywords": ["agile", "microservices", "object oriented", "api", "debugging"],
        "certifications": ["aws certified developer", "oracle certified professional java"],
        "projects": ["full stack web app", "api service", "scalable backend system"],
        "recommended_skills": ["system design", "testing", "docker", "cloud deployment", "rest api"],
    },
    "full stack developer": {
        "required_skills": ["react", "javascript", "html", "css", "node.js", "python"],
        "preferred_skills": ["express", "rest api", "mongodb", "typescript", "git"],
        "keywords": ["frontend", "backend", "ui", "api", "responsive"],
        "certifications": ["meta front-end developer", "aws certified developer"],
        "projects": ["e-commerce app", "dashboard app", "auth system"],
        "recommended_skills": ["typescript", "express", "mongodb", "testing", "deployment"],
    },
    "devops engineer": {
        "required_skills": ["linux", "docker", "kubernetes", "jenkins", "terraform", "git"],
        "preferred_skills": ["aws", "ci/cd", "monitoring", "shell scripting", "yaml"],
        "keywords": ["automation", "pipeline", "infrastructure", "deployment", "orchestration"],
        "certifications": ["aws cloud practitioner", "cka", "ckad"],
        "projects": ["ci/cd pipeline", "kubernetes deployment", "infra as code"],
        "recommended_skills": ["aws", "terraform", "kubernetes", "jenkins", "monitoring"],
    },
    "data scientist": {
        "required_skills": ["python", "pandas", "numpy", "machine learning", "statistics", "sql"],
        "preferred_skills": ["scikit-learn", "matplotlib", "feature engineering", "nlp", "deep learning"],
        "keywords": ["model", "analysis", "prediction", "data cleaning", "visualization"],
        "certifications": ["google data analytics", "ibm data science"],
        "projects": ["predictive model", "data analysis dashboard", "ml classification project"],
        "recommended_skills": ["machine learning", "sql", "feature engineering", "model evaluation", "statistics"],
    },
    "ai engineer": {
        "required_skills": ["python", "machine learning", "deep learning", "pytorch", "tensorflow", "sql"],
        "preferred_skills": ["llm", "nlp", "prompt engineering", "vector database", "rag"],
        "keywords": ["ai", "model", "generation", "retrieval", "deployment"],
        "certifications": ["aws machine learning specialty", "google professional machine learning engineer"],
        "projects": ["rag assistant", "llm app", "model deployment pipeline"],
        "recommended_skills": ["pytorch", "rag", "llm", "prompt engineering", "vector database"],
    },
}


@dataclass(frozen=True)
class ATSAnalysisInput:
    selected_role: str
    resume_text: str


def _normalize_text(text: str) -> str:
    return re.sub(r"[^a-z0-9+.#/\-\s]", " ", text.lower())


def _role_profile(role: str) -> Dict[str, list[str]]:
    normalized_role = role.lower().strip()
    for key, profile in ROLE_PROFILES.items():
        if key in normalized_role:
            return profile
    return {
        "required_skills": ["python", "sql", "git", "communication"],
        "preferred_skills": ["docker", "cloud", "testing"],
        "keywords": ["project", "experience", "development", "analysis", "api"],
        "certifications": ["aws cloud practitioner"],
        "projects": ["portfolio project", "automation project", "api project"],
        "recommended_skills": ["sql", "git", "testing", "cloud", "docker"],
    }


def _present_terms(text: str, terms: list[str]) -> list[str]:
    normalized_text = _normalize_text(text)
    return [term for term in terms if term.lower() in normalized_text]


def _missing_terms(text: str, terms: list[str]) -> list[str]:
    present = set(_present_terms(text, terms))
    return [term for term in terms if term not in present]


def _score_component(found: list[str], total: int, weight: int) -> int:
    if total <= 0:
        return 0
    return round((len(found) / total) * weight)


def _local_project_recommendations(role: str, profile: Dict[str, list[str]]) -> list[Dict[str, Any]]:
    projects = []
    for title in profile.get("projects", [])[:3]:
        projects.append(
            {
                "title": title.title(),
                "technologies": profile.get("required_skills", [])[:4],
                "difficulty": "Intermediate" if len(profile.get("required_skills", [])) > 4 else "Beginner",
                "reason": f"Builds role-relevant experience for {role} and adds ATS keywords around {title}.",
            }
        )
    return projects


def _local_analysis(input_data: ATSAnalysisInput) -> Dict[str, Any]:
    profile = _role_profile(input_data.selected_role)
    resume_text = input_data.resume_text
    normalized_resume = _normalize_text(resume_text)

    required_skills = profile.get("required_skills", [])
    preferred_skills = profile.get("preferred_skills", [])
    keywords = profile.get("keywords", [])
    certifications = profile.get("certifications", [])
    recommended_skills = profile.get("recommended_skills", [])

    found_required = _present_terms(resume_text, required_skills)
    found_preferred = _present_terms(resume_text, preferred_skills)
    found_keywords = _present_terms(resume_text, keywords)
    found_certs = _present_terms(resume_text, certifications)
    found_projects = _present_terms(resume_text, profile.get("projects", []))

    skills_score = _score_component(found_required + found_preferred, len(required_skills) + len(preferred_skills), 40)
    experience_score = 20 if any(term in normalized_resume for term in ["internship", "experience", "worked", "developed", "built"]) else 8
    project_score = 15 if found_projects else 5
    education_score = 10 if any(term in normalized_resume for term in ["bachelor", "master", "b.tech", "m.tech", "bsc", "msc", "education"]) else 4
    certification_score = 5 if found_certs else 0
    structure_score = 10 if len(found_keywords) >= 3 and len(found_required) >= 3 else 6

    ats_score = min(100, skills_score + experience_score + project_score + education_score + certification_score + structure_score)

    missing_skills = _missing_terms(resume_text, required_skills + preferred_skills)
    missing_certs = _missing_terms(resume_text, certifications)
    missing_keywords = _missing_terms(resume_text, keywords)

    strengths = []
    if found_required:
        strengths.append(f"Relevant skills found: {', '.join(found_required[:4])}")
    if found_preferred:
        strengths.append(f"Additional role-aligned tools found: {', '.join(found_preferred[:4])}")
    if found_projects:
        strengths.append("Contains role-relevant project experience")
    if found_certs:
        strengths.append(f"Relevant certification keywords present: {', '.join(found_certs)}")
    if any(term in normalized_resume for term in ["internship", "experience", "worked", "developed", "built"]):
        strengths.append("Shows practical experience and outcome-oriented language")

    improvement_suggestions = []
    if missing_skills:
        improvement_suggestions.append(f"Add {missing_skills[0]} in the skills section and show it in a project or experience bullet.")
    if missing_certs:
        improvement_suggestions.append(f"Earn or mention {missing_certs[0]} if it matches your target role.")
    if missing_keywords:
        improvement_suggestions.append(f"Use ATS keywords such as {missing_keywords[0]} in your summary, bullets, or project descriptions.")
    if not found_projects:
        improvement_suggestions.append("Add 1-2 role-specific projects with measurable outcomes.")

    expected_after = min(100, ats_score + 15 if ats_score < 85 else 100)

    return {
        "role": input_data.selected_role,
        "ats_score": ats_score,
        "strengths": strengths or ["Resume has some relevant role-aligned content"],
        "missing_skills": missing_skills,
        "missing_certifications": missing_certs,
        "missing_keywords": missing_keywords,
        "recommended_skills": recommended_skills,
        "ats_keywords": (found_required + found_preferred + found_keywords)[:20] or keywords[:20],
        "recommended_projects": _local_project_recommendations(input_data.selected_role, profile),
        "improvement_suggestions": improvement_suggestions or ["Refine the resume summary and add role-specific keywords."],
        "career_roadmap": {
            "skills_to_learn": missing_skills[:5] or recommended_skills[:5],
            "certifications": missing_certs[:3] or certifications[:3],
            "projects": profile.get("projects", [])[:3],
            "expected_ats_after_improvement": expected_after,
        },
    }


def _analysis_prompt(role: str, resume_text: str) -> str:
    return f"""You are an expert ATS Resume Analyzer Agent.

Analyze the resume against the selected role and return STRICT JSON only.

Selected role: {role}

Resume text:
{resume_text}

Rules:
- Be strict and realistic.
- Do not inflate the ATS score.
- Calculate ATS score out of 100 using:
  Skills Match 40%, Experience Relevance 20%, Project Relevance 15%, Education Relevance 10%, Certifications 5%, Resume Structure & Keywords 10%.
- Tailor recommendations specifically to the selected role.
- Return valid JSON only. No markdown. No code fences. No explanations.
- The JSON must match this schema exactly:
{{
  "role": "",
  "ats_score": 0,
  "strengths": [],
  "missing_skills": [],
  "missing_certifications": [],
  "missing_keywords": [],
  "recommended_skills": [],
  "ats_keywords": [],
  "recommended_projects": [
    {{
      "title": "",
      "technologies": [],
      "difficulty": "",
      "reason": ""
    }}
  ],
  "improvement_suggestions": [],
  "career_roadmap": {{
    "skills_to_learn": [],
    "certifications": [],
    "projects": [],
    "expected_ats_after_improvement": 0
  }}
}}
"""


def _extract_json(content: str) -> Dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("Groq response did not contain JSON")

    return json.loads(cleaned[start : end + 1])


def analyze_resume_with_groq(input_data: ATSAnalysisInput) -> Dict[str, Any]:
    settings = get_settings()
    if not settings.groq_api_key:
        return _local_analysis(input_data)

    payload = {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": "You return strict JSON only."},
            {"role": "user", "content": _analysis_prompt(input_data.selected_role, input_data.resume_text)},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }

    request = Request(
        GROQ_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=60) as response:
            raw_response = response.read().decode("utf-8")
    except (HTTPError, URLError):
        return _local_analysis(input_data)

    try:
        response_json = json.loads(raw_response)
    except json.JSONDecodeError:
        return _local_analysis(input_data)

    choices = response_json.get("choices") or []
    if not choices:
        return _local_analysis(input_data)

    content = choices[0].get("message", {}).get("content", "")
    try:
        return _extract_json(content)
    except (ValueError, json.JSONDecodeError):
        return _local_analysis(input_data)