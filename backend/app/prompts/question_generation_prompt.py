from __future__ import annotations


def build_question_generation_prompt(role: str, resume_context: dict | None = None, previous_report: dict | None = None) -> str:
    resume_summary = resume_context or {}
    skills = ", ".join(resume_summary.get("skills", [])[:8]) or "general software engineering"
    projects = ", ".join(resume_summary.get("projects", [])[:4]) or "portfolio projects"
    previous_focus = ", ".join(previous_report.get("weaknesses", [])[:4]) if previous_report else "none"

    return f"""You are an expert interview coach for placement interviews.
Generate 10 unique, entry-level interview questions for the role '{role}'.
The questions should gradually increase in difficulty and cover technical concepts, coding/problem solving, project-based discussion, real-world scenarios, behavioral questions, and HR questions.
Use the candidate's resume context and any prior weakness areas to tailor the questions.
Make every question unique from the others and avoid repeating the same wording or topic.
Return 10 questions, not fewer, and ensure variety across categories.

Resume context:
- Skills: {skills}
- Projects: {projects}
- Previous weak areas: {previous_focus}

Return STRICT JSON only with this shape:
{{
  "questions": [
    {{
      "id": "",
      "question": "",
      "category": "technical|coding|project|scenario|behavioral|hr",
      "difficulty": 1,
      "expected_skill": ""
    }}
  ]
}}
Do not include markdown or explanations.
"""
