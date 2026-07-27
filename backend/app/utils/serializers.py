from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from bson import ObjectId


def object_id_to_str(value: ObjectId | str | None) -> str | None:
    if value is None:
        return None
    return str(value)


def to_isoformat(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def serialize_mongo_value(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: serialize_mongo_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [serialize_mongo_value(item) for item in value]
    return value


def serialize_mongo_document(document: Dict[str, Any]) -> Dict[str, Any]:
    return serialize_mongo_value(document)


def serialize_user(document: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": object_id_to_str(document.get("_id")),
        "name": document.get("name"),
        "email": document.get("email"),
        "role": document.get("role", "Software Engineer"),
        "created_at": to_isoformat(document.get("created_at")),
    }


def serialize_resume(document: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": object_id_to_str(document.get("_id")),
        "user_id": object_id_to_str(document.get("user_id")),
        "role": document.get("role"),
        "resume_file_name": document.get("resume_file_name"),
        "resume_file_path": document.get("resume_file_path"),
        "uploaded_at": to_isoformat(document.get("uploaded_at")),
        "extracted_text": document.get("extracted_text", ""),
        "parsed_data": document.get("parsed_data", {}),
    }
