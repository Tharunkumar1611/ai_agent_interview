from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple
from uuid import uuid4

from app.db.mongodb import get_database
from app.services.aptitude_bank import (
    DEFAULT_DURATION_MINUTES,
    QUESTION_BANK,
    build_assessment_document,
    get_public_bank,
    get_public_question,
    get_question,
    select_assessment_questions,
)
from app.utils.serializers import serialize_mongo_document


async def ensure_aptitude_collections() -> None:
    database = get_database()
    await database.aptitude_questions.create_index([("section", 1), ("difficulty", 1)])
    await database.aptitude_questions.create_index([("id", 1)], unique=True)
    await database.aptitude_assessments.create_index([("user_id", 1), ("created_at", -1)])
    await database.aptitude_assessments.create_index([("status", 1)])
    await database.aptitude_submissions.create_index([("assessment_id", 1), ("user_id", 1)], unique=True)
    await database.aptitude_results.create_index([("assessment_id", 1)], unique=True)
    await database.aptitude_roadmaps.create_index([("assessment_id", 1)], unique=True)
    await database.aptitude_progress.create_index([("user_id", 1)], unique=True)

    existing_questions = await database.aptitude_questions.count_documents({})
    if existing_questions == 0:
        await database.aptitude_questions.insert_many(QUESTION_BANK)


async def get_questions_by_ids(question_ids: List[str]) -> List[Dict[str, Any]]:
    database = get_database()
    cursor = database.aptitude_questions.find({"id": {"$in": question_ids}})
    documents = await cursor.to_list(length=None)
    documents_by_id = {document["id"]: document for document in documents}
    return [documents_by_id[question_id] for question_id in question_ids if question_id in documents_by_id]


async def start_test(user_id: str, duration_minutes: int = DEFAULT_DURATION_MINUTES) -> Dict[str, Any]:
    await ensure_aptitude_collections()
    selected_questions = select_assessment_questions()
    database = get_database()
    assessment_id = str(uuid4())
    assessment_document = build_assessment_document(user_id, selected_questions, duration_minutes)
    assessment_document["_id"] = assessment_id
    assessment_document["assessment_id"] = assessment_id
    assessment_document["questions"] = [question["id"] for question in selected_questions]
    await database.aptitude_assessments.insert_one(assessment_document)
    return {
        "assessment_id": assessment_id,
        "user_id": user_id,
        "duration_minutes": duration_minutes,
        "started_at": assessment_document["started_at"],
        "ends_at": datetime.fromtimestamp(assessment_document["ends_at"], tz=timezone.utc),
        "questions": [get_public_question(question) for question in selected_questions],
    }


def _score_question(is_correct: bool, marks: int) -> float:
    return float(marks if is_correct else 0)


def _question_result(question: Dict[str, Any], attempt: Dict[str, Any], time_spent_seconds: float) -> Dict[str, Any]:
    selected_option = attempt.get("selected_option")
    is_correct = bool(selected_option) and selected_option == question["correct_answer"]
    marks_awarded = _score_question(is_correct, int(question.get("marks", 1)))
    return {
        "section": question["section"],
        "section_label": question["section_label"],
        "topic": question["topic"],
        "question_id": question["id"],
        "question": question["question"],
        "difficulty": question["difficulty"],
        "selected_option": selected_option,
        "correct_answer": question["correct_answer"],
        "explanation": question["explanation"],
        "marks": int(question.get("marks", 1)),
        "marks_awarded": marks_awarded,
        "is_correct": is_correct,
        "time_spent_seconds": round(float(time_spent_seconds), 2),
    }


def _aggregate_scores(question_results: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    section_scores: List[Dict[str, Any]] = []
    topic_scores: List[Dict[str, Any]] = []
    difficulty_scores: List[Dict[str, Any]] = []

    section_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    topic_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    difficulty_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    for item in question_results:
        section_groups[item["section"]].append(item)
        topic_groups[f'{item["section"]}:{item["topic"]}'].append(item)
        difficulty_groups[item["difficulty"]].append(item)

    for section in ["Quantitative Aptitude", "Logical Reasoning", "Analytical & Verbal Ability"]:
        items = section_groups.get(section, [])
        correct = sum(1 for item in items if item["is_correct"])
        wrong = len(items) - correct
        score = round((correct / max(len(items), 1)) * 100, 2)
        section_scores.append(
            {
                "section": section,
                "section_label": section,
                "score": score,
                "correct_answers": correct,
                "wrong_answers": wrong,
                "total_questions": len(items),
                "accuracy_percentage": score,
                "time_spent_seconds": round(sum(item["time_spent_seconds"] for item in items), 2),
            }
        )

    ordered_topics = []
    for section in ["Quantitative Aptitude", "Logical Reasoning", "Analytical & Verbal Ability"]:
        ordered_topics.extend(sorted({item["topic"] for item in question_results if item["section"] == section}))
    for topic_key in ordered_topics:
        items = []
        section_name = ""
        for section_topic_key, grouped_items in topic_groups.items():
            section_name_part, topic_name = section_topic_key.split(":", 1)
            if topic_name == topic_key:
                section_name = section_name_part
                items = grouped_items
                break
        correct = sum(1 for item in items if item["is_correct"])
        wrong = len(items) - correct
        score = round((correct / max(len(items), 1)) * 100, 2)
        difficulty_breakdown = defaultdict(int)
        for item in items:
            if item["is_correct"]:
                difficulty_breakdown[item["difficulty"]] += 1
        topic_scores.append(
            {
                "section": section_name,
                "topic": topic_key,
                "score": score,
                "correct_answers": correct,
                "wrong_answers": wrong,
                "total_questions": len(items),
                "accuracy_percentage": score,
                "time_spent_seconds": round(sum(item["time_spent_seconds"] for item in items), 2),
                "difficulty_breakdown": dict(difficulty_breakdown),
            }
        )

    for difficulty in ["Easy", "Medium", "Hard"]:
        items = difficulty_groups.get(difficulty, [])
        correct = sum(1 for item in items if item["is_correct"])
        wrong = len(items) - correct
        score = round((correct / max(len(items), 1)) * 100, 2)
        difficulty_scores.append(
            {
                "difficulty": difficulty,
                "score": score,
                "correct_answers": correct,
                "wrong_answers": wrong,
                "total_questions": len(items),
                "accuracy_percentage": score,
            }
        )

    return section_scores, topic_scores, difficulty_scores


def _build_roadmap(section_scores: List[Dict[str, Any]], weak_topics: List[str]) -> List[Dict[str, Any]]:
    weakest_sections = [item["section_label"] for item in sorted(section_scores, key=lambda item: item["score"])]
    top_weak_topics = weak_topics[:6]
    return [
        {
            "week": "Week 1",
            "focus": f"Revise {weakest_sections[0] if weakest_sections else 'core concepts'}",
            "topics": top_weak_topics[:3] or ["Arithmetic basics", "Formula revision"],
            "practice": ["50 easy questions", "daily formula review", "timed accuracy drills"],
            "goal": "Build accuracy on fundamentals before increasing speed.",
        },
        {
            "week": "Week 2",
            "focus": f"Strengthen {weakest_sections[1] if len(weakest_sections) > 1 else 'reasoning depth'}",
            "topics": top_weak_topics[3:6] or ["Logical puzzles", "Data sufficiency"],
            "practice": ["40 medium questions", "mixed topic sets", "short timed quizzes"],
            "goal": "Solve standard questions without hesitation.",
        },
        {
            "week": "Week 3",
            "focus": "Timed mixed practice",
            "topics": ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"],
            "practice": ["3 sectional mocks", "review every mistake", "note recurring traps"],
            "goal": "Improve speed while keeping accuracy stable.",
        },
        {
            "week": "Week 4",
            "focus": "Full mock tests",
            "topics": ["All sections"],
            "practice": ["3 full-length aptitude tests", "performance analysis", "formula revision"],
            "goal": "Enter placement tests with confidence and pacing control.",
        },
    ]


def _build_daily_practice_plan(weak_topics: List[str], section_scores: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    section_names = [item["section_label"] for item in sorted(section_scores, key=lambda item: item["score"])]
    weak_cycle = weak_topics or ["Percentages", "Coding-Decoding", "Reading Comprehension"]
    practice_plan: List[Dict[str, Any]] = []
    day_patterns = [
        ("Arithmetic focus", ["20 arithmetic questions", "formula revision", "speed drills"], 20, "Easy"),
        ("Reasoning focus", ["15 reasoning questions", "puzzle solving", "pattern spotting"], 25, "Medium"),
        ("Verbal focus", ["reading comprehension", "vocabulary practice", "grammar revision"], 15, "Easy"),
        ("Mixed timed set", ["section mix", "mock review", "mistake log"], 30, "Timed"),
        ("Mini mock test", ["45-question simulation", "accuracy review", "speed analysis"], 45, "Timed"),
    ]
    for day in range(1, 31):
        pattern = day_patterns[(day - 1) % len(day_patterns)]
        primary_topic = weak_cycle[(day - 1) % len(weak_cycle)]
        section_name = section_names[(day - 1) % len(section_names)] if section_names else "General Practice"
        practice_plan.append(
            {
                "day": f"Day {day}",
                "focus": f"{section_name} - {primary_topic}",
                "drills": pattern[1],
                "target_questions": pattern[2],
                "mode": pattern[3],
            }
        )
    return practice_plan


def _build_feedback(section_scores: List[Dict[str, Any]], topic_scores: List[Dict[str, Any]], difficulty_scores: List[Dict[str, Any]], time_taken_minutes: float, overall_score: float) -> Dict[str, List[str]]:
    strongest_section = max(section_scores, key=lambda item: item["score"], default=None)
    weakest_sections = [item["section_label"] for item in sorted(section_scores, key=lambda item: item["score"])[:2]]
    weak_topics = [item["topic"] for item in sorted(topic_scores, key=lambda item: item["score"])[:5]]
    hard_score = next((item["accuracy_percentage"] for item in difficulty_scores if item["difficulty"] == "Hard"), 0)

    strengths: List[str] = []
    if strongest_section and strongest_section["score"] >= 75:
        strengths.append(f"Strong performance in {strongest_section['section_label']}.")
    if overall_score >= 70:
        strengths.append("Good overall placement readiness across all sections.")
    if hard_score >= 60:
        strengths.append("You are solving harder questions with reasonable accuracy.")

    weaknesses: List[str] = []
    for section in weakest_sections:
        weaknesses.append(f"{section} needs more timed practice.")
    if weak_topics:
        weaknesses.append(f"Most incorrect topics: {', '.join(weak_topics[:4])}.")
    if time_taken_minutes > 60:
        weaknesses.append("Time management needs improvement during full-length mocks.")

    recommendations: List[str] = []
    if overall_score < 40:
        recommendations.extend(["Start from basics.", "Practice easy questions daily.", "Learn core formulas and patterns."])
    elif overall_score < 60:
        recommendations.extend(["Practice medium-level questions.", "Improve accuracy before speed.", "Use timed sectional drills."])
    elif overall_score < 80:
        recommendations.extend(["Focus on speed.", "Solve full mock tests.", "Revise advanced topics and traps."])
    else:
        recommendations.extend(["Placement ready.", "Attempt company-specific aptitude tests.", "Keep revising formulas and shortcuts."])

    if time_taken_minutes > 45:
        recommendations.append("Trim time spent on lengthy calculations by using shortcuts.")

    return {"strengths": strengths, "weaknesses": weaknesses, "recommendations": recommendations}


def _readiness_message(overall_score: float) -> Tuple[str, str]:
    if overall_score >= 80:
        return "High", "Placement ready for advanced aptitude rounds."
    if overall_score >= 60:
        return "Moderate", "Good base, but speed and consistency still need refinement."
    if overall_score >= 40:
        return "Developing", "Core concepts are present, but accuracy is inconsistent."
    return "Low", "Start from basics and build accuracy section by section."


def _section_progress(section_scores: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "labels": [item["section_label"] for item in section_scores],
        "scores": [item["score"] for item in section_scores],
        "accuracy": [item["accuracy_percentage"] for item in section_scores],
        "time_spent_minutes": [round(item["time_spent_seconds"] / 60, 2) for item in section_scores],
    }


def _topic_progress(topic_scores: List[Dict[str, Any]]) -> Dict[str, Any]:
    ordered = sorted(topic_scores, key=lambda item: (item["section"], item["topic"]))
    return {
        "labels": [item["topic"] for item in ordered],
        "scores": [item["score"] for item in ordered],
        "accuracy": [item["accuracy_percentage"] for item in ordered],
        "time_spent_minutes": [round(item["time_spent_seconds"] / 60, 2) for item in ordered],
    }


def _difficulty_progress(difficulty_scores: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "labels": [item["difficulty"] for item in difficulty_scores],
        "scores": [item["score"] for item in difficulty_scores],
        "accuracy": [item["accuracy_percentage"] for item in difficulty_scores],
    }


def _build_result_document(assessment_id: str, user_id: str, question_results: List[Dict[str, Any]], submitted_at: datetime) -> Dict[str, Any]:
    section_scores, topic_scores, difficulty_scores = _aggregate_scores(question_results)
    correct_answers = sum(1 for item in question_results if item["is_correct"])
    wrong_answers = len(question_results) - correct_answers
    overall_score = round((correct_answers / max(len(question_results), 1)) * 100, 2)
    time_taken_minutes = round(sum(item["time_spent_seconds"] for item in question_results) / 60, 2)

    weak_topics = [item["topic"] for item in sorted(topic_scores, key=lambda item: item["score"]) if item["score"] < 60]
    most_incorrect_areas = [item["topic"] for item in sorted(topic_scores, key=lambda item: (item["score"], -item["wrong_answers"]))[:5]]
    speed_issues = [item["section_label"] for item in sorted(section_scores, key=lambda item: item["time_spent_seconds"], reverse=True) if item["time_spent_seconds"] > 0]
    accuracy_issues = [item["section_label"] for item in sorted(section_scores, key=lambda item: item["score"]) if item["score"] < 70]
    confidence_level, readiness_message = _readiness_message(overall_score)
    feedback = _build_feedback(section_scores, topic_scores, difficulty_scores, time_taken_minutes, overall_score)
    roadmap = _build_roadmap(section_scores, weak_topics)
    daily_practice_plan = _build_daily_practice_plan(weak_topics, section_scores)

    performance_summary = {
        "overall_score": overall_score,
        "accuracy_percentage": overall_score,
        "section_progress": _section_progress(section_scores),
        "topic_progress": _topic_progress(topic_scores),
        "difficulty_progress": _difficulty_progress(difficulty_scores),
        "section_labels": [item["section_label"] for item in section_scores],
        "section_scores": [item["score"] for item in section_scores],
        "topic_labels": [item["topic"] for item in topic_scores],
        "topic_scores": [item["score"] for item in topic_scores],
        "time_spent_minutes": [round(item["time_spent_seconds"] / 60, 2) for item in topic_scores],
    }

    return {
        "assessment_id": assessment_id,
        "user_id": user_id,
        "overall_score": overall_score,
        "correct_answers": correct_answers,
        "wrong_answers": wrong_answers,
        "total_questions": len(question_results),
        "accuracy_percentage": overall_score,
        "time_taken_minutes": time_taken_minutes,
        "section_scores": section_scores,
        "topic_scores": topic_scores,
        "difficulty_performance": difficulty_scores,
        "strong_topics": [item["topic"] for item in topic_scores if item["score"] >= 75],
        "weak_topics": weak_topics,
        "most_incorrect_areas": most_incorrect_areas,
        "speed_issues": speed_issues,
        "accuracy_issues": accuracy_issues,
        "confidence_level": confidence_level,
        "overall_readiness": readiness_message,
        "ai_feedback": feedback,
        "ai_summary": [
            f"Overall score: {overall_score}%",
            f"Accuracy: {overall_score}%",
            f"Confidence level: {confidence_level}",
        ],
        "roadmap": roadmap,
        "daily_practice_plan": daily_practice_plan,
        "question_results": question_results,
        "performance_summary": performance_summary,
        "submitted_at": submitted_at,
        "status": "submitted",
    }


async def submit_test(assessment_id: str, user_id: str, attempts: List[Dict[str, Any]]) -> Dict[str, Any]:
    database = get_database()
    assessment = await database.aptitude_assessments.find_one({"assessment_id": assessment_id, "user_id": user_id})
    if not assessment:
        raise ValueError("Assessment not found")

    selected_questions = await get_questions_by_ids(assessment["question_ids"])
    attempt_map = {attempt["question_id"]: attempt for attempt in attempts}
    question_results: List[Dict[str, Any]] = []

    for question in selected_questions:
        attempt = attempt_map.get(question["id"], {})
        question_results.append(_question_result(question, attempt, attempt.get("time_spent_seconds", 0)))

    submitted_at = datetime.now(timezone.utc)
    result_document = _build_result_document(assessment_id, user_id, question_results, submitted_at)

    await database.aptitude_results.update_one({"assessment_id": assessment_id, "user_id": user_id}, {"$set": result_document}, upsert=True)
    await database.aptitude_roadmaps.update_one(
        {"assessment_id": assessment_id, "user_id": user_id},
        {"$set": {"assessment_id": assessment_id, "user_id": user_id, "roadmap": result_document["roadmap"], "daily_practice_plan": result_document["daily_practice_plan"], "updated_at": submitted_at}},
        upsert=True,
    )
    await database.aptitude_assessments.update_one(
        {"assessment_id": assessment_id, "user_id": user_id},
        {"$set": {"status": "submitted", "updated_at": submitted_at, "submitted_at": submitted_at, "overall_score": result_document["overall_score"], "accuracy_percentage": result_document["accuracy_percentage"]}},
    )
    await database.aptitude_progress.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "user_id": user_id,
                "assessment_id": assessment_id,
                "latest_score": result_document["overall_score"],
                "latest_accuracy": result_document["accuracy_percentage"],
                "latest_section_scores": result_document["section_scores"],
                "latest_topic_scores": result_document["topic_scores"],
                "updated_at": submitted_at,
            },
            "$push": {
                "history": {
                    "$each": [
                        {
                            "assessment_id": assessment_id,
                            "submitted_at": submitted_at,
                            "score": result_document["overall_score"],
                            "accuracy": result_document["accuracy_percentage"],
                            "time_taken_minutes": result_document["time_taken_minutes"],
                        }
                    ],
                    "$slice": -20,
                }
            },
        },
        upsert=True,
    )
    return result_document


async def get_assessment_report(assessment_id: str, user_id: str) -> Dict[str, Any]:
    database = get_database()
    result = await database.aptitude_results.find_one({"assessment_id": assessment_id, "user_id": user_id})
    if not result:
        raise ValueError("Report not found")
    assessment = await database.aptitude_assessments.find_one({"assessment_id": assessment_id, "user_id": user_id})
    roadmap = await database.aptitude_roadmaps.find_one({"assessment_id": assessment_id, "user_id": user_id})
    return {
        "result": serialize_mongo_document(result),
        "assessment": serialize_mongo_document(assessment or {}),
        "roadmap": serialize_mongo_document(roadmap or {}),
    }


def _calculate_streak(history: List[Dict[str, Any]]) -> int:
    if not history:
        return 0
    dates = sorted({item["submitted_at"].date() for item in history if item.get("submitted_at")})
    if not dates:
        return 0
    streak = 1
    for index in range(len(dates) - 1, 0, -1):
        if (dates[index] - dates[index - 1]).days == 1:
            streak += 1
        else:
            break
    return streak


def _build_dashboard_progress(result: Dict[str, Any], progress_document: Dict[str, Any]) -> Dict[str, Any]:
    history = progress_document.get("history", [])
    accuracy_trend = [item.get("accuracy", 0) for item in history]
    time_trend = [item.get("time_taken_minutes", 0) for item in history]
    completion_percent = round(min(100, max(result.get("overall_score", 0), len(history) * 10 + result.get("overall_score", 0) * 0.4)))
    practice_streak = _calculate_streak(history)
    roadmap_progress = round(min(100, result.get("overall_score", 0) * 0.85 + len(history) * 2))
    return {
        "completion_percent": completion_percent,
        "practice_streak": practice_streak,
        "roadmap_progress": roadmap_progress,
        "accuracy_trend": accuracy_trend,
        "time_trend": time_trend,
        "section_scores": result.get("section_scores", []),
        "strong_topics": result.get("strong_topics", []),
        "weak_topics": result.get("weak_topics", []),
        "latest_score": result.get("overall_score", 0),
        "latest_accuracy": result.get("accuracy_percentage", 0),
    }


async def get_latest_insight(user_id: str) -> Dict[str, Any]:
    database = get_database()
    result = await database.aptitude_results.find({"user_id": user_id, "status": "submitted"}).sort("submitted_at", -1).limit(1).to_list(length=1)
    if not result:
        return {"has_result": False, "result": None, "assessment": None, "progress": {}, "practice_history": []}

    latest_result = serialize_mongo_document(result[0])
    assessment = await database.aptitude_assessments.find_one({"assessment_id": latest_result["assessment_id"], "user_id": user_id})
    progress = await database.aptitude_progress.find_one({"user_id": user_id})
    practice_history = serialize_mongo_document((progress or {}).get("history", []))
    return {
        "has_result": True,
        "result": latest_result,
        "assessment": serialize_mongo_document(assessment or {}),
        "progress": _build_dashboard_progress(latest_result, progress or {}),
        "practice_history": practice_history,
    }


async def get_dashboard(user_id: str) -> Dict[str, Any]:
    return await get_latest_insight(user_id)
