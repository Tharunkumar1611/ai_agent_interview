from __future__ import annotations


def build_answer_evaluation_prompt(role: str, questions: list[dict], conversation: list[dict], resume_context: dict | None = None) -> str:
    resume_summary = resume_context or {}
    skills = ", ".join(resume_summary.get("skills", [])[:8]) or "general software engineering"
    projects = ", ".join(resume_summary.get("projects", [])[:4]) or "portfolio projects"

    return f"""You are an expert interview evaluator.
Evaluate the candidate for the role '{role}' using the following interview conversation.
Return STRICT JSON only with this schema:
{{
  "overall_score": 0,
  "technical_score": 0,
  "problem_solving_score": 0,
  "communication_score": 0,
  "confidence_score": 0,
  "summary": "",
  "strengths": [],
  "weaknesses": [],
  "recommended_topics": [],
  "skill_gap_analysis": [],
  "question_feedback": [
    {{
      "question": "",
      "user_answer": "",
      "score_out_of_10": 0,
      "what_was_correct": "",
      "mistakes": "",
      "ideal_answer": "",
      "improvement_suggestion": ""
    }}
  ],
  "roadmap": [
    {{
      "week": "Week 1",
      "focus": "",
      "topics": [],
      "practice_tasks": []
    }}
  ],
  "readiness_percentage": 0,
  "interview_readiness": ""
}}

Resume context:
- Skills: {skills}
- Projects: {projects}

Interview questions and answers:
{conversation}
"""
