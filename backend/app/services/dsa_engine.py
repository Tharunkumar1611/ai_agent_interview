from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple
from uuid import uuid4

from bson import ObjectId

from app.db.mongodb import get_database
from app.services.code_runner import run_code_for_question
from app.services.dsa_bank import DEFAULT_DURATION_MINUTES, build_assessment_document, get_question, get_public_bank, get_public_question, select_daily_questions
from app.utils.serializers import serialize_mongo_document

QUESTION_TOPIC_TARGETS = {
    "Arrays": {
        "strength_threshold": 75,
        "moderate_floor": 50,
        "concepts": ["Prefix sum", "Kadane's algorithm", "Sliding window", "Two pointers"],
        "algorithms": ["Kadane's algorithm", "Prefix sum", "Two pointers"],
        "practice": 20,
        "progression": ["Easy", "Medium", "Hard"],
    },
    "Strings": {
        "strength_threshold": 75,
        "moderate_floor": 50,
        "concepts": ["Hashing", "Sliding window", "Two pointers", "Frequency maps"],
        "algorithms": ["Sliding window", "Hash map", "Two pointers"],
        "practice": 25,
        "progression": ["Easy", "Medium", "Hard"],
    },
    "Trees": {
        "strength_threshold": 75,
        "moderate_floor": 50,
        "concepts": ["Tree traversal", "Recursion", "DFS", "BFS"],
        "algorithms": ["DFS", "BFS", "Recursion"],
        "practice": 20,
        "progression": ["Easy", "Medium", "Hard"],
    },
    "Graphs": {
        "strength_threshold": 75,
        "moderate_floor": 50,
        "concepts": ["Graph traversal", "BFS", "DFS", "Topological sort", "Union find"],
        "algorithms": ["BFS", "DFS", "Topological sort", "Dijkstra", "Union find"],
        "practice": 30,
        "progression": ["Medium", "Hard", "Very Hard"],
    },
    "Dynamic Programming": {
        "strength_threshold": 75,
        "moderate_floor": 50,
        "concepts": ["Recursion", "Memoization", "Tabulation", "State transition"],
        "algorithms": ["Memoization", "Tabulation", "State optimization"],
        "practice": 30,
        "progression": ["Easy", "Medium", "Hard"],
    },
}


async def ensure_dsa_collections() -> None:
    database = get_database()
    await database.dsa_questions.create_index([("topic", 1), ("difficulty", 1)])
    await database.dsa_questions.create_index([("id", 1)], unique=True)
    await database.dsa_assessments.create_index([("user_id", 1), ("created_at", -1)])
    await database.dsa_assessments.create_index([("status", 1)])
    await database.dsa_submissions.create_index([("assessment_id", 1), ("user_id", 1)], unique=True)
    await database.dsa_results.create_index([("assessment_id", 1)], unique=True)
    await database.dsa_violations.create_index([("assessment_id", 1), ("created_at", -1)])
    await database.dsa_roadmaps.create_index([("assessment_id", 1)], unique=True)

    existing_questions = await database.dsa_questions.count_documents({})
    if existing_questions == 0:
        await database.dsa_questions.insert_many(get_public_bank())


async def get_questions_by_ids(question_ids: List[str]) -> List[Dict[str, Any]]:
    database = get_database()
    cursor = database.dsa_questions.find({"id": {"$in": question_ids}})
    documents = await cursor.to_list(length=None)
    documents_by_id = {document["id"]: document for document in documents}
    return [documents_by_id[question_id] for question_id in question_ids if question_id in documents_by_id]


async def start_assessment(user_id: str, duration_minutes: int = DEFAULT_DURATION_MINUTES) -> Dict[str, Any]:
    await ensure_dsa_collections()
    selected_questions = select_daily_questions()
    database = get_database()
    assessment_id = str(uuid4())
    assessment_document = build_assessment_document(user_id, selected_questions, duration_minutes)
    assessment_document["_id"] = assessment_id
    assessment_document["assessment_id"] = assessment_id
    assessment_document["questions"] = [question["id"] for question in selected_questions]
    await database.dsa_assessments.insert_one(assessment_document)
    return {
        "assessment_id": assessment_id,
        "user_id": user_id,
        "duration_minutes": duration_minutes,
        "started_at": assessment_document["started_at"],
        "ends_at": datetime.fromtimestamp(assessment_document["ends_at"], tz=timezone.utc),
        "questions": [get_public_question(question) for question in selected_questions],
    }


def _runtime_efficiency_score(runtime_ms: float, question: Dict[str, Any]) -> float:
    threshold = 200.0
    if question["topic"] == "Graphs":
        threshold = 400.0
    elif question["topic"] == "Trees":
        threshold = 300.0
    elif question["topic"] == "Dynamic Programming":
        threshold = 350.0
    ratio = min(max(runtime_ms / threshold, 0.0), 1.0)
    return round((1.0 - ratio) * 100.0, 2)


def _time_taken_score(time_spent_seconds: float) -> float:
    ratio = min(max(time_spent_seconds / (DEFAULT_DURATION_MINUTES * 60), 0.0), 1.0)
    return round((1.0 - ratio) * 100.0, 2)


def _question_score(question: Dict[str, Any], result: Dict[str, Any], time_spent_seconds: float) -> Tuple[float, float, float]:
    if result["status"] != "success":
        return 0.0, 0.0, 0.0
    pass_rate = result["passed"] / max(result["total"], 1)
    test_score = pass_rate * 70.0
    efficiency_score = _runtime_efficiency_score(result["average_runtime_ms"], question)
    time_score = _time_taken_score(time_spent_seconds)
    final_score = round(test_score + (efficiency_score * 0.2) + (time_score * 0.1), 2)
    return final_score, round(efficiency_score, 2), round(time_score, 2)


async def run_question_code(assessment_id: str, user_id: str, question_id: str, language: str, code: str, hidden: bool = False) -> Dict[str, Any]:
    question = get_question(question_id)
    result = run_code_for_question(question_id, language, code, hidden=hidden)
    question_score, efficiency_score, time_score = _question_score(question, result, 0)
    detail = {
        "topic": question["topic"],
        "question_id": question_id,
        "title": question["title"],
        "language": language,
        "test_cases_passed": result["passed"],
        "total_test_cases": result["total"],
        "execution_efficiency": efficiency_score,
        "time_taken_seconds": 0.0,
        "score": question_score,
        "runtime_ms": result["average_runtime_ms"],
        "status": result["status"],
        "details": result["test_results"],
        "message": result["message"],
    }
    database = get_database()
    await database.dsa_submissions.update_one(
        {"assessment_id": assessment_id, "user_id": user_id},
        {
            "$set": {
                "assessment_id": assessment_id,
                "user_id": user_id,
                "updated_at": datetime.now(timezone.utc),
            },
            "$push": {"runtime_checks": detail},
        },
        upsert=True,
    )
    return detail


def analyze_attempts(question_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    topic_scores: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for item in question_results:
        topic_scores[item["topic"]].append(item)

    topic_score_items = []
    for topic in ["Arrays", "Strings", "Trees", "Graphs", "Dynamic Programming"]:
        items = topic_scores.get(topic, [])
        if items:
            score = round(sum(entry["score"] for entry in items) / len(items), 2)
            time_spent = round(sum(entry.get("time_spent_seconds", 0) for entry in items), 2)
            passed = sum(entry["test_cases_passed"] for entry in items)
            total = sum(entry["total_test_cases"] for entry in items)
            difficulty = items[0]["difficulty"] if "difficulty" in items[0] else "Medium"
        else:
            score = 0.0
            time_spent = 0.0
            passed = 0
            total = 0
            difficulty = "Medium"
        topic_score_items.append(
            {
                "topic": topic,
                "score": score,
                "difficulty": difficulty,
                "time_spent_seconds": time_spent,
                "test_cases_passed": passed,
                "total_test_cases": total,
            }
        )

    strengths = [item["topic"] for item in topic_score_items if item["score"] > 75]
    moderate = [item["topic"] for item in topic_score_items if 50 <= item["score"] <= 75]
    weak = [item["topic"] for item in topic_score_items if item["score"] < 50]

    recommendations: List[str] = []
    roadmap: List[Dict[str, Any]] = []
    for topic in weak:
        profile = QUESTION_TOPIC_TARGETS[topic]
        recommendations.append(f"{topic}: revisit {', '.join(profile['concepts'][:3])} and practice deliberate problem decomposition.")
        roadmap.append(
            {
                "topic": topic,
                "concepts_to_learn": profile["concepts"],
                "important_algorithms": profile["algorithms"],
                "recommended_practice_count": profile["practice"],
                "difficulty_progression": profile["progression"],
            }
        )

    for topic in moderate:
        recommendations.append(f"{topic}: keep the momentum and focus on accuracy under timed conditions.")
    if not strengths and not moderate and not weak:
        recommendations.append("Complete the assessment to generate a personalized report.")

    overall_score = round(sum(item["score"] for item in topic_score_items) / max(len(topic_score_items), 1), 2)

    performance_summary = {
        "overall_score": overall_score,
        "strengths": strengths,
        "moderate_areas": moderate,
        "weak_areas": weak,
        "topic_labels": [item["topic"] for item in topic_score_items],
        "topic_scores": [item["score"] for item in topic_score_items],
        "time_spent": [item["time_spent_seconds"] for item in topic_score_items],
        "accuracy": [round((item["test_cases_passed"] / item["total_test_cases"] * 100), 2) if item["total_test_cases"] else 0 for item in topic_score_items],
    }
    return {
        "overall_score": overall_score,
        "topic_scores": topic_score_items,
        "strengths": strengths,
        "moderate_areas": moderate,
        "weak_areas": weak,
        "ai_recommendations": recommendations,
        "roadmap": roadmap,
        "performance_summary": performance_summary,
    }


async def submit_assessment(assessment_id: str, user_id: str, attempts: List[Dict[str, Any]]) -> Dict[str, Any]:
    database = get_database()
    assessment = await database.dsa_assessments.find_one({"assessment_id": assessment_id, "user_id": user_id})
    if not assessment:
        raise ValueError("Assessment not found")

    selected_questions = await get_questions_by_ids(assessment["question_ids"])
    attempt_map = {attempt["question_id"]: attempt for attempt in attempts}
    question_results: List[Dict[str, Any]] = []

    for question in selected_questions:
        attempt = attempt_map.get(question["id"])
        if not attempt:
            question_results.append(
                {
                    "topic": question["topic"],
                    "question_id": question["id"],
                    "title": question["title"],
                    "language": "unknown",
                    "test_cases_passed": 0,
                    "total_test_cases": len(question["hidden_test_cases"]),
                    "execution_efficiency": 0.0,
                    "time_taken_seconds": 0.0,
                    "score": 0.0,
                    "runtime_ms": 0.0,
                    "status": "not_attempted",
                    "details": [],
                    "message": "Question not attempted",
                    "difficulty": question["difficulty"],
                }
            )
            continue

        result = run_code_for_question(question["id"], attempt["language"], attempt["code"], hidden=True)
        question_score, efficiency_score, time_score = _question_score(question, result, attempt.get("time_spent_seconds", 0))
        question_results.append(
            {
                "topic": question["topic"],
                "question_id": question["id"],
                "title": question["title"],
                "language": attempt["language"],
                "test_cases_passed": result["passed"],
                "total_test_cases": result["total"],
                "execution_efficiency": efficiency_score,
                "time_taken_seconds": attempt.get("time_spent_seconds", 0),
                "score": question_score,
                "runtime_ms": result["average_runtime_ms"],
                "status": result["status"],
                "details": result["test_results"],
                "message": result["message"],
                "difficulty": question["difficulty"],
            }
        )

    analysis = analyze_attempts(question_results)
    roadmap = analysis["roadmap"]
    now = datetime.now(timezone.utc)
    total_violations = int(assessment.get("violation_count", 0))

    result_document = {
        "assessment_id": assessment_id,
        "user_id": user_id,
        "overall_score": analysis["overall_score"],
        "topic_scores": analysis["topic_scores"],
        "strengths": analysis["strengths"],
        "moderate_areas": analysis["moderate_areas"],
        "weak_areas": analysis["weak_areas"],
        "ai_recommendations": analysis["ai_recommendations"],
        "roadmap": roadmap,
        "performance_summary": analysis["performance_summary"],
        "question_results": question_results,
        "total_violations": total_violations,
        "submitted_at": now,
        "status": "submitted",
    }

    await database.dsa_results.update_one({"assessment_id": assessment_id, "user_id": user_id}, {"$set": result_document}, upsert=True)
    await database.dsa_roadmaps.update_one(
        {"assessment_id": assessment_id, "user_id": user_id},
        {"$set": {"assessment_id": assessment_id, "user_id": user_id, "roadmap": roadmap, "updated_at": now}},
        upsert=True,
    )
    await database.dsa_assessments.update_one(
        {"assessment_id": assessment_id, "user_id": user_id},
        {"$set": {"status": "submitted", "updated_at": now, "submitted_at": now, "overall_score": analysis["overall_score"]}},
    )
    return result_document


async def log_violation(assessment_id: str, user_id: str, violation_type: str, message: str | None = None) -> Dict[str, Any]:
    database = get_database()
    assessment = await database.dsa_assessments.find_one({"assessment_id": assessment_id, "user_id": user_id})
    if not assessment:
        raise ValueError("Assessment not found")

    violation_count = int(assessment.get("violation_count", 0)) + 1
    warning_level = "warning"
    auto_submit_required = False
    if violation_count == 2:
        warning_level = "final_warning"
    elif violation_count >= 3:
        warning_level = "auto_submit"
        auto_submit_required = True

    violation_document = {
        "assessment_id": assessment_id,
        "user_id": user_id,
        "violation_type": violation_type,
        "message": message,
        "violation_count": violation_count,
        "created_at": datetime.now(timezone.utc),
        "warning_level": warning_level,
    }
    await database.dsa_violations.insert_one(violation_document)
    await database.dsa_assessments.update_one(
        {"assessment_id": assessment_id, "user_id": user_id},
        {"$set": {"violation_count": violation_count, "updated_at": datetime.now(timezone.utc)}}
    )
    return {
        "assessment_id": assessment_id,
        "violation_count": violation_count,
        "warning_level": warning_level,
        "auto_submit_required": auto_submit_required,
    }


async def get_assessment_report(assessment_id: str, user_id: str) -> Dict[str, Any]:
    database = get_database()
    result = await database.dsa_results.find_one({"assessment_id": assessment_id, "user_id": user_id})
    if not result:
        raise ValueError("Report not found")
    assessment = await database.dsa_assessments.find_one({"assessment_id": assessment_id, "user_id": user_id})
    violations = await database.dsa_violations.find({"assessment_id": assessment_id, "user_id": user_id}).sort("created_at", -1).to_list(length=None)
    return {
        "result": serialize_mongo_document(result),
        "assessment": serialize_mongo_document(assessment or {}),
        "violation_logs": [serialize_mongo_document(violation) for violation in violations],
    }


async def get_latest_insight(user_id: str) -> Dict[str, Any]:
    database = get_database()
    result = await database.dsa_results.find({"user_id": user_id, "status": "submitted"}).sort("submitted_at", -1).limit(1).to_list(length=1)
    if not result:
        return {"has_result": False, "result": None, "assessment": None}

    latest_result = serialize_mongo_document(result[0])
    assessment = await database.dsa_assessments.find_one({"assessment_id": latest_result["assessment_id"], "user_id": user_id})
    return {
        "has_result": True,
        "result": latest_result,
        "assessment": serialize_mongo_document(assessment or {}),
    }
