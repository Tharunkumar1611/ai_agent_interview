from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List

import fitz  # PyMuPDF


SECTION_HEADINGS = {
    "skills": ["skills", "technical skills", "core skills", "expertise"],
    "education": ["education", "academic background"],
    "projects": ["projects", "project experience"],
    "experience": ["experience", "work experience", "professional experience", "employment"],
    "certifications": ["certifications", "certificates", "licenses"],
}

EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_PATTERN = re.compile(
    r"(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}(?:\s?(?:x|ext\.?|extension)\s?\d{1,5})?"
)


def extract_text_from_pdf(file_path: str | Path) -> str:
    pdf_path = Path(file_path)
    with fitz.open(pdf_path) as document:
        pages = [page.get_text("text") for page in document]
    return "\n".join(pages).strip()


def _clean_lines(text: str) -> List[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def _extract_name(lines: List[str], email: str | None) -> str | None:
    if not lines:
        return None

    if email:
        for index, line in enumerate(lines[:12]):
            if email in line:
                for candidate in reversed(lines[:index]):
                    if 2 <= len(candidate.split()) <= 5 and re.search(r"[A-Za-z]", candidate):
                        return candidate
                break

    for line in lines[:8]:
        if 2 <= len(line.split()) <= 5 and re.fullmatch(r"[A-Za-z ,.'-]+", line):
            return line

    return lines[0] if lines else None


def _extract_contact(text: str) -> tuple[str | None, str | None]:
    email_match = EMAIL_PATTERN.search(text)
    phone_match = PHONE_PATTERN.search(text)
    return (
        email_match.group(0) if email_match else None,
        phone_match.group(0).strip() if phone_match else None,
    )


def _find_heading_index(lines: List[str], headings: List[str], start_index: int) -> int | None:
    for index in range(start_index, len(lines)):
        normalized = lines[index].lower().rstrip(":")
        if normalized in headings:
            return index
    return None


def _extract_section(lines: List[str], section_key: str) -> List[str]:
    headings = SECTION_HEADINGS[section_key]
    start_index = _find_heading_index(lines, headings, 0)
    if start_index is None:
        return []

    collected: List[str] = []
    for index in range(start_index + 1, len(lines)):
        normalized = lines[index].lower().rstrip(":")
        if any(normalized in candidate_headings for candidate_headings in SECTION_HEADINGS.values()):
            break
        collected.append(lines[index])
    return collected


def _split_list_items(items: List[str]) -> List[str]:
    joined = " ".join(items)
    parts = [part.strip(" -•;\t") for part in re.split(r"[,|/\n]", joined) if part.strip(" -•;\t")]
    return [part for part in parts if part]


def parse_resume_text(text: str) -> Dict[str, object]:
    lines = _clean_lines(text)
    email, phone_number = _extract_contact(text)
    name = _extract_name(lines, email)

    skills_section = _split_list_items(_extract_section(lines, "skills"))
    education_section = _extract_section(lines, "education")
    projects_section = _extract_section(lines, "projects")
    experience_section = _extract_section(lines, "experience")
    certifications_section = _extract_section(lines, "certifications")

    return {
        "name": name,
        "email": email,
        "phone_number": phone_number,
        "skills": skills_section,
        "education": education_section,
        "projects": projects_section,
        "experience": experience_section,
        "certifications": certifications_section,
    }
