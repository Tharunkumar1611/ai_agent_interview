from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4

from app.core.config import get_settings
from app.db.mongodb import get_database
from app.prompts.answer_evaluation_prompt import build_answer_evaluation_prompt
from app.prompts.question_generation_prompt import build_question_generation_prompt
from app.prompts.roadmap_generation_prompt import build_roadmap_generation_prompt
from app.utils.serializers import serialize_mongo_document

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


async def ensure_mock_interview_collections() -> None:
    database = get_database()
    await database.mock_interviews.create_index([("user_id", 1), ("created_at", -1)])
    await database.mock_interviews.create_index(["interview_id"], unique=True)


def _normalize_role(role: Optional[str]) -> str:
    return (role or "Software Engineer").strip() or "Software Engineer"


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


def _call_groq(prompt: str) -> Dict[str, Any]:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ API key not configured")

    payload = {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": "You return strict JSON only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
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
    except (HTTPError, URLError) as exc:
        raise RuntimeError(f"Groq request failed: {exc}") from exc

    try:
        response_json = json.loads(raw_response)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Groq response was not valid JSON") from exc

    choices = response_json.get("choices") or []
    if not choices:
        raise RuntimeError("Groq response did not contain choices")

    content = choices[0].get("message", {}).get("content", "")
    try:
        return _extract_json(content)
    except (ValueError, json.JSONDecodeError) as exc:
        raise RuntimeError("Groq response could not be parsed") from exc


def _build_resume_context(user_record: Dict[str, Any], resume_record: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not resume_record:
        return {"skills": [], "projects": []}
    parsed = resume_record.get("parsed_data") or {}
    return {
        "skills": [str(item).strip() for item in parsed.get("skills", []) if str(item).strip()],
        "projects": [str(item).strip() for item in parsed.get("projects", []) if str(item).strip()],
        "experience": [str(item).strip() for item in parsed.get("experience", []) if str(item).strip()],
        "education": [str(item).strip() for item in parsed.get("education", []) if str(item).strip()],
    }


def _build_local_questions(role: str, resume_context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    skills = [str(item).strip() for item in (resume_context or {}).get("skills", []) if str(item).strip()]
    primary_skill = skills[0] if skills else "software development"
    role_label = role.lower()

    templates = [
        {
            "question": f"Tell me about yourself and why you want to work as a {role}.",
            "category": "hr",
            "difficulty": 1,
            "expected_skill": "self introduction",
        },
        {
            "question": f"Describe one project from your resume and explain your contribution to it.",
            "category": "project",
            "difficulty": 1,
            "expected_skill": "project explanation",
        },
        {
            "question": f"What are the core responsibilities of a {role} in a modern team?",
            "category": "technical",
            "difficulty": 2,
            "expected_skill": "role awareness",
        },
        {
            "question": f"How would you explain {primary_skill} in a way that a non-technical interviewer can understand?",
            "category": "technical",
            "difficulty": 2,
            "expected_skill": primary_skill,
        },
        {
            "question": "Walk me through your approach to debugging a production issue under time pressure.",
            "category": "scenario",
            "difficulty": 3,
            "expected_skill": "debugging",
        },
        {
            "question": "How would you optimize a slow API, database query, or application workflow?",
            "category": "coding",
            "difficulty": 3,
            "expected_skill": "optimization",
        },
        {
            "question": "Describe a time you had to learn a new tool or framework quickly and how you handled it.",
            "category": "behavioral",
            "difficulty": 4,
            "expected_skill": "adaptability",
        },
        {
            "question": "If requirements changed halfway through implementation, how would you communicate and adjust your plan?",
            "category": "scenario",
            "difficulty": 4,
            "expected_skill": "communication",
        },
        {
            "question": "Compare two possible solutions for a real-world problem and explain which one you would choose and why.",
            "category": "coding",
            "difficulty": 5,
            "expected_skill": "decision making",
        },
        {
            "question": f"What are your strengths, weaknesses, and growth areas for becoming a strong {role_label}?",
            "category": "hr",
            "difficulty": 5,
            "expected_skill": "self assessment",
        },
    ]

    unique_questions: List[Dict[str, Any]] = []
    seen_questions: set[str] = set()
    for index, template in enumerate(templates, start=1):
        question_text = template["question"]
        if question_text in seen_questions:
            continue
        seen_questions.add(question_text)
        unique_questions.append(
            {
                "id": f"question-{index}",
                "question": question_text,
                "category": template["category"],
                "difficulty": template["difficulty"],
                "expected_skill": template["expected_skill"],
            }
        )
    return unique_questions[:10]


def _build_interview_roadmap(weaknesses: List[str], strengths: List[str]) -> List[Dict[str, Any]]:
    weakness_topics = [item for item in weaknesses if item][:3] or ["Structured storytelling", "Role-specific depth", "Confidence under pressure"]
    strength_topics = [item for item in strengths if item][:2] or ["Basic role awareness", "Willingness to improve"]

    return [
        {
            "week": "Week 1",
            "focus": "Answering basics",
            "topics": weakness_topics[:2] + ["Self-introduction"],
            "practice_tasks": ["Record 3 self-introduction answers", "Practice 5 STAR stories"],
        },
        {
            "week": "Week 2",
            "focus": "Technical clarity",
            "topics": ["Project walkthroughs", "Core concepts", "Role fundamentals"],
            "practice_tasks": ["Explain one project in 2 minutes", "Answer 3 scenario questions aloud"],
        },
        {
            "week": "Week 3",
            "focus": "Communication confidence",
            "topics": strength_topics + ["Behavioral stories"],
            "practice_tasks": ["Practice 5 behavioral answers", "Run one live mock interview"],
        },
    ]


def _build_fallback_evaluation(role: str, questions: List[Dict[str, Any]], answers: List[Dict[str, Any]]) -> Dict[str, Any]:
    answered_entries = [
        answer for answer in answers
        if str(answer.get("answer") or "").strip() or str(answer.get("transcript") or "").strip()
    ]
    answered_count = len(answered_entries)
    unanswered_count = max(0, len(questions) - answered_count)
    answered_ratio = answered_count / max(len(questions), 1)

    base_score = max(20, int(round(100 * answered_ratio * 0.7)))
    technical_score = max(15, base_score - 8)
    problem_solving_score = max(12, base_score - 10)
    communication_score = max(18, base_score - 6)
    confidence_score = max(16, base_score - 9)
    readiness_percentage = max(10, min(95, base_score))

    if unanswered_count > 0:
        technical_score = max(10, technical_score - (unanswered_count * 4))
        problem_solving_score = max(10, problem_solving_score - (unanswered_count * 4))
        communication_score = max(10, communication_score - (unanswered_count * 3))
        confidence_score = max(10, confidence_score - (unanswered_count * 3))
        readiness_percentage = max(10, readiness_percentage - (unanswered_count * 5))

    overall_score = round((technical_score + problem_solving_score + communication_score + confidence_score) / 4, 0)

    if answered_count == 0:
        summary = "No interview answers were provided, so the evaluation is based on an incomplete interview and a low-confidence baseline."
        strengths = ["Basic role awareness", "Willingness to participate"]
        weaknesses = ["No substantive answers were provided", "Need to practice structured storytelling", "Need stronger role-specific preparation"]
        recommended_topics = ["Self-introduction", "Project walkthroughs", "Behavioral examples", "Role-specific fundamentals"]
        skill_gap_analysis = ["Structured answer framing", "Technical explanation depth", "Confidence under pressure"]
        interview_readiness = "Low"
    else:
        summary = "The candidate gave a partial interview response set; the evaluation reflects incomplete coverage and areas to build further."
        strengths = ["Some relevant points were shared", "The candidate showed effort and structure"]
        weaknesses = ["More depth is needed in technical answers", "Practice more role-specific examples", "Improve confidence and pacing"]
        recommended_topics = ["Project deep dives", "Behavioral examples", "Technical trade-offs", "Problem-solving walkthroughs"]
        skill_gap_analysis = ["Answer depth", "Trade-off explanation", "Response organization"]
        interview_readiness = "Moderate"

    return {
        "overall_score": int(overall_score),
        "technical_score": int(technical_score),
        "problem_solving_score": int(problem_solving_score),
        "communication_score": int(communication_score),
        "confidence_score": int(confidence_score),
        "summary": summary,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommended_topics": recommended_topics,
        "skill_gap_analysis": skill_gap_analysis,
        "question_feedback": [],
        "roadmap": _build_interview_roadmap(weaknesses, strengths),
        "readiness_percentage": int(readiness_percentage),
        "interview_readiness": interview_readiness,
    }


async def start_mock_interview(user_id: str, selected_role: Optional[str], resume_context: Optional[Dict[str, Any]] = None, previous_report: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    await ensure_mock_interview_collections()
    database = get_database()
    role = _normalize_role(selected_role)

    try:
        generated = _call_groq(build_question_generation_prompt(role, resume_context, previous_report))
    except RuntimeError:
        generated = {"questions": _build_local_questions(role, resume_context)}

    normalized_questions = []
    seen_questions: set[str] = set()
    for index, item in enumerate(generated.get("questions", [])[:10], start=1):
        question_text = str(item.get("question") or f"Tell me about your experience with {role}.").strip()
        if not question_text or question_text in seen_questions:
            continue
        seen_questions.add(question_text)
        normalized_questions.append(
            {
                "id": item.get("id") or f"question-{index}",
                "question": question_text,
                "category": item.get("category") or "technical",
                "difficulty": max(1, int(item.get("difficulty", index))),
                "expected_skill": item.get("expected_skill") or "general fundamentals",
            }
        )

    if len(normalized_questions) < 10:
        for question in _build_local_questions(role, resume_context):
            if len(normalized_questions) >= 10:
                break
            if question["question"] in seen_questions:
                continue
            seen_questions.add(question["question"])
            normalized_questions.append({
                "id": question.get("id") or f"question-{len(normalized_questions) + 1}",
                "question": question["question"],
                "category": question.get("category", "technical"),
                "difficulty": question.get("difficulty", 1),
                "expected_skill": question.get("expected_skill", "general fundamentals"),
            })

    interview_id = str(uuid4())
    now = datetime.now(timezone.utc)
    document = {
        "interview_id": interview_id,
        "user_id": user_id,
        "selected_role": role,
        "questions": normalized_questions,
        "answers": [],
        "created_at": now,
        "updated_at": now,
        "status": "in_progress",
        "report": None,
    }
    await database.mock_interviews.insert_one(document)
    return serialize_mongo_document(
        {
            "interview_id": interview_id,
            "selected_role": role,
            "questions": normalized_questions,
            "status": "in_progress",
            "message": "Mock interview started successfully.",
        }
    )


async def submit_voice_answer(user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    database = get_database()
    interview = await database.mock_interviews.find_one({"interview_id": payload["interview_id"], "user_id": user_id})
    if not interview:
        raise ValueError("Interview not found")

    answer_text = str(payload.get("answer") or "").strip()
    transcript_text = str(payload.get("transcript") or "").strip()
    if not answer_text and not transcript_text:
        await database.mock_interviews.update_one(
            {"interview_id": payload["interview_id"], "user_id": user_id},
            {"$set": {"updated_at": datetime.now(timezone.utc)}},
        )
        return serialize_mongo_document({"status": "skipped", "answer": None})

    answer_entry = {
        "question_id": payload.get("question_id"),
        "question": next((item["question"] for item in interview.get("questions", []) if item.get("id") == payload.get("question_id")), ""),
        "answer": answer_text,
        "transcript": transcript_text,
        "answer_duration_seconds": int(payload.get("answer_duration_seconds", 0) or 0),
        "confidence": payload.get("confidence"),
        "answered_at": datetime.now(timezone.utc),
    }

    await database.mock_interviews.update_one(
        {"interview_id": payload["interview_id"], "user_id": user_id},
        {"$push": {"answers": answer_entry}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    return serialize_mongo_document({"status": "saved", "answer": answer_entry})


async def next_question(user_id: str, interview_id: str) -> Dict[str, Any]:
    database = get_database()
    interview = await database.mock_interviews.find_one({"interview_id": interview_id, "user_id": user_id})
    if not interview:
        raise ValueError("Interview not found")
    return serialize_mongo_document({"status": "ok", "current_progress": len(interview.get("answers", []))})


async def complete_mock_interview(user_id: str, interview_id: str, resume_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    database = get_database()
    interview = await database.mock_interviews.find_one({"interview_id": interview_id, "user_id": user_id})
    if not interview:
        raise ValueError("Interview not found")

    answers = interview.get("answers", [])
    conversation = [
        {
            "question": answer.get("question"),
            "answer": answer.get("answer") or answer.get("transcript") or "",
            "confidence": answer.get("confidence"),
        }
        for answer in answers
    ]

    try:
        evaluation = _call_groq(build_answer_evaluation_prompt(interview.get("selected_role", "Software Engineer"), interview.get("questions", []), conversation, resume_context))
    except RuntimeError:
        answered_count = len(answers)
        unanswered_count = max(0, len(interview.get("questions", [])) - answered_count)
        answered_ratio = answered_count / max(len(interview.get("questions", [])), 1)

        base_score = max(20, int(round(100 * answered_ratio * 0.7)))
        technical_score = max(15, base_score - 8)
        problem_solving_score = max(12, base_score - 10)
        communication_score = max(18, base_score - 6)
        confidence_score = max(16, base_score - 9)
        readiness_percentage = max(10, min(95, base_score))

        if unanswered_count > 0:
            technical_score = max(10, technical_score - (unanswered_count * 4))
            problem_solving_score = max(10, problem_solving_score - (unanswered_count * 4))
            communication_score = max(10, communication_score - (unanswered_count * 3))
            confidence_score = max(10, confidence_score - (unanswered_count * 3))
            readiness_percentage = max(10, readiness_percentage - (unanswered_count * 5))

        overall_score = round((technical_score + problem_solving_score + communication_score + confidence_score) / 4, 0)
        if answered_count == 0:
            summary = "No interview answers were provided, so the evaluation is based on incomplete responses and a low confidence baseline."
            strengths = ["Basic role awareness", "Willingness to participate"]
            weaknesses = ["No substantive answers were provided", "Need to practice structured storytelling", "Need stronger domain-specific preparation"]
            recommended_topics = ["Self-introduction", "Project walkthroughs", "Behavioral examples", "Role-specific fundamentals"]
            skill_gap_analysis = ["Structured answer framing", "Technical explanation depth", "Confidence under pressure"]
            question_feedback = []
            roadmap = [
                {"week": "Week 1", "focus": "Answering basics", "topics": ["Tell me about yourself", "Project summary", "Role basics"], "practice_tasks": ["Record 3 self-introduction answers", "Practice 5 STAR stories"]},
                {"week": "Week 2", "focus": "Technical clarity", "topics": ["Core concepts", "Debugging", "System design basics"], "practice_tasks": ["Explain one project in 2 minutes", "Solve 3 coding scenarios"]},
                {"week": "Week 3", "focus": "Communication confidence", "topics": ["Behavioral stories", "Scenario handling", "Leadership examples"], "practice_tasks": ["Practice 5 behavioral answers", "Answer mock questions aloud"]},
            ]
            interview_readiness = "Low"
        else:
            summary = "The candidate gave a partial interview response set; the evaluation reflects incomplete coverage and areas to build further."
            strengths = ["Some relevant points were shared", "The candidate showed effort and structure"]
            weaknesses = ["More depth is needed in technical answers", "Practice more role-specific examples", "Improve confidence and pacing"]
            recommended_topics = ["Project deep dives", "Behavioral examples", "Technical trade-offs", "Problem-solving walkthroughs"]
            skill_gap_analysis = ["Answer depth", "Trade-off explanation", "Response organization"]
            question_feedback = []
            roadmap = [
                {"week": "Week 1", "focus": "Strengthen core answers", "topics": ["Self introduction", "Project walkthroughs"], "practice_tasks": ["Practice 5 concise introductions", "Record 3 project explanations"]},
                {"week": "Week 2", "focus": "Improve technical depth", "topics": ["System design", "Debugging", "Optimization"], "practice_tasks": ["Explain 3 technical concepts clearly", "Answer 5 scenario questions"]},
                {"week": "Week 3", "focus": "Behavioral readiness", "topics": ["Leadership", "Teamwork", "Adaptability"], "practice_tasks": ["Prepare 5 STAR stories", "Practice live mock interviews"]},
            ]
            interview_readiness = "Moderate"

        evaluation = {
            "overall_score": int(overall_score),
            "technical_score": int(technical_score),
            "problem_solving_score": int(problem_solving_score),
            "communication_score": int(communication_score),
            "confidence_score": int(confidence_score),
            "summary": summary,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommended_topics": recommended_topics,
            "skill_gap_analysis": skill_gap_analysis,
            "question_feedback": question_feedback,
            "roadmap": roadmap,
            "readiness_percentage": int(readiness_percentage),
            "interview_readiness": interview_readiness,
        }

    report = {
        "interview_id": interview_id,
        "user_id": user_id,
        "selected_role": interview.get("selected_role"),
        "questions": interview.get("questions", []),
        "answers": answers,
        "overall_score": evaluation.get("overall_score", 0),
        "technical_score": evaluation.get("technical_score", 0),
        "problem_solving_score": evaluation.get("problem_solving_score", 0),
        "communication_score": evaluation.get("communication_score", 0),
        "confidence_score": evaluation.get("confidence_score", 0),
        "summary": evaluation.get("summary", ""),
        "strengths": evaluation.get("strengths", []),
        "weaknesses": evaluation.get("weaknesses", []),
        "recommended_topics": evaluation.get("recommended_topics", []),
        "skill_gap_analysis": evaluation.get("skill_gap_analysis", []),
        "question_feedback": evaluation.get("question_feedback", []),
        "roadmap": evaluation.get("roadmap", []),
        "readiness_percentage": evaluation.get("readiness_percentage", 0),
        "interview_readiness": evaluation.get("interview_readiness", ""),
        "created_at": interview.get("created_at"),
        "completed_at": datetime.now(timezone.utc),
    }

    await database.mock_interviews.update_one(
        {"interview_id": interview_id, "user_id": user_id},
        {"$set": {"status": "completed", "report": report, "updated_at": datetime.now(timezone.utc)}},
    )
    return serialize_mongo_document({"status": "completed", "report": report})


async def get_interview_report(user_id: str, interview_id: str) -> Dict[str, Any]:
    database = get_database()
    interview = await database.mock_interviews.find_one({"interview_id": interview_id, "user_id": user_id})
    if not interview:
        raise ValueError("Interview not found")
    return {"interview": serialize_mongo_document(interview)}


async def get_user_interview_history(user_id: str) -> List[Dict[str, Any]]:
    database = get_database()
    interviews = await database.mock_interviews.find({"user_id": user_id}).sort("created_at", -1).to_list(length=None)
    return [
        {
            "interview_id": item.get("interview_id"),
            "selected_role": item.get("selected_role"),
            "status": item.get("status"),
            "overall_score": (item.get("report") or {}).get("overall_score"),
            "created_at": item.get("created_at"),
        }
        for item in interviews
    ]
