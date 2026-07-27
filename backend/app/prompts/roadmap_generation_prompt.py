from __future__ import annotations


def build_roadmap_generation_prompt(role: str, weak_areas: list[str], strengths: list[str]) -> str:
    return f"""You are a career coach.
Generate a 6-week personalized learning roadmap for a candidate targeting the role '{role}'.
Use the following weak areas and strengths to create a practical plan.
Return STRICT JSON only with this shape:
{{
  "roadmap": [
    {{
      "week": "Week 1",
      "focus": "",
      "topics": [],
      "practice_tasks": []
    }}
  ]
}}
Weak areas:
{weak_areas}
Strengths:
{strengths}
"""
