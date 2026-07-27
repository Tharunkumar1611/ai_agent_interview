from datetime import datetime

from bson import ObjectId

from app.services.mock_interview_engine import _build_local_questions
from app.utils.serializers import serialize_mongo_document


def test_local_questions_are_unique_and_complete():
    questions = _build_local_questions("Software Engineer", {"skills": ["Python", "FastAPI"]})

    assert len(questions) == 10
    assert len({question["question"] for question in questions}) == 10
    assert all(question["question"].strip() for question in questions)


def test_serializer_converts_mongo_values_to_json_safe_types():
    now = datetime(2024, 1, 2, 3, 4, 5)
    payload = {"_id": ObjectId("507f1f77bcf86cd799439011"), "created_at": now}

    serialized = serialize_mongo_document(payload)

    assert serialized["_id"] == "507f1f77bcf86cd799439011"
    assert serialized["created_at"] == "2024-01-02T03:04:05"
