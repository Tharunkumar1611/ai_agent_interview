from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict, List

SECTION_ORDER = ["Quantitative Aptitude", "Logical Reasoning", "Analytical & Verbal Ability"]
DEFAULT_DURATION_MINUTES = 60


def question(
    question_id: str,
    section: str,
    topic: str,
    difficulty: str,
    question_text: str,
    options: List[str],
    correct_answer: str,
    explanation: str,
    marks: int = 1,
) -> Dict[str, Any]:
    return {
        "id": question_id,
        "section": section,
        "section_label": section,
        "topic": topic,
        "difficulty": difficulty,
        "question": question_text,
        "options": options,
        "correct_answer": correct_answer,
        "explanation": explanation,
        "marks": marks,
    }


QUESTION_BANK: List[Dict[str, Any]] = [
    question("quant-01", "Quantitative Aptitude", "Percentages", "Easy", "What is 25% of 640?", ["120", "160", "180", "200"], "160", "25% means one-fourth, so 640 ÷ 4 = 160."),
    question("quant-02", "Quantitative Aptitude", "Profit and Loss", "Easy", "A shirt is bought for 400 and sold for 460. What is the profit percentage?", ["10%", "12.5%", "15%", "20%"], "15%", "Profit is 60, and 60/400 × 100 = 15%."),
    question("quant-03", "Quantitative Aptitude", "Time and Work", "Medium", "A can finish a job in 12 days and B in 18 days. Together, how long will they take?", ["6 days", "7.2 days", "8 days", "9 days"], "7.2 days", "Combined rate is 5/36 work per day, so time = 36/5 = 7.2 days."),
    question("quant-04", "Quantitative Aptitude", "Time, Speed and Distance", "Easy", "A car travels 180 km in 3 hours. What is its speed?", ["50 km/h", "55 km/h", "60 km/h", "65 km/h"], "60 km/h", "Speed = distance ÷ time = 180 ÷ 3 = 60 km/h."),
    question("quant-05", "Quantitative Aptitude", "Ratio and Proportion", "Easy", "If boys:girls = 3:5 and there are 40 students, how many are boys?", ["12", "15", "18", "24"], "15", "Total parts = 8, so boys = 3/8 × 40 = 15."),
    question("quant-06", "Quantitative Aptitude", "Average", "Easy", "Find the average of 12, 18, 20, 30 and 40.", ["18", "20", "24", "26"], "24", "Sum is 120, and 120/5 = 24."),
    question("quant-07", "Quantitative Aptitude", "Simple Interest", "Easy", "What is the simple interest on 5000 at 8% per annum for 2 years?", ["600", "700", "800", "900"], "800", "SI = P × R × T / 100 = 5000 × 8 × 2 / 100 = 800."),
    question("quant-08", "Quantitative Aptitude", "Compound Interest", "Medium", "What is the compound interest on 1000 at 10% per annum for 2 years?", ["200", "210", "220", "250"], "210", "Amount = 1000 × 1.1 × 1.1 = 1210, so CI = 210."),
    question("quant-09", "Quantitative Aptitude", "Number System", "Easy", "What is the remainder when 17^2 is divided by 5?", ["0", "1", "2", "4"], "4", "17^2 = 289 and 289 mod 5 = 4."),
    question("quant-10", "Quantitative Aptitude", "HCF and LCM", "Easy", "The HCF of 12 and 18 is 6. What is their LCM?", ["24", "30", "36", "48"], "36", "HCF × LCM = 12 × 18, so LCM = 36."),
    question("quant-11", "Quantitative Aptitude", "Probability", "Easy", "A fair die is rolled once. What is the probability of getting an even number?", ["1/2", "1/3", "2/3", "1/6"], "1/2", "Three even outcomes out of six total outcomes."),
    question("quant-12", "Quantitative Aptitude", "Permutation and Combination", "Medium", "How many 3-letter arrangements can be made from A, B, C, D without repetition?", ["12", "18", "24", "36"], "24", "P(4,3) = 4 × 3 × 2 = 24."),
    question("quant-13", "Quantitative Aptitude", "Pipes and Cisterns", "Medium", "Pipe A fills a tank in 10 hours and pipe B in 15 hours. How long together?", ["5 hours", "6 hours", "7.5 hours", "8 hours"], "6 hours", "Combined rate = 1/10 + 1/15 = 1/6, so time = 6 hours."),
    question("quant-14", "Quantitative Aptitude", "Ages", "Easy", "A father is 4 times as old as his son. In 10 years, he will be twice as old. What is the son's present age?", ["5", "10", "12", "15"], "10", "Let son's age be x. Then 4x + 10 = 2(x + 10), so x = 10."),
    question("quant-15", "Quantitative Aptitude", "Mixtures and Allegations", "Medium", "In what ratio should water be mixed with milk worth 60 per litre to make a mixture worth 45 per litre?", ["1:2", "1:3", "1:4", "2:3"], "1:3", "By allegation, water:milk = 15:45 = 1:3."),

    question("reason-01", "Logical Reasoning", "Blood Relations", "Easy", "Pointing to a man, Riya said, 'He is the son of my grandfather's only daughter.' How is the man related to Riya?", ["Brother", "Cousin", "Father", "Uncle"], "Brother", "Grandfather's only daughter is Riya's mother, so the man is her son."),
    question("reason-02", "Logical Reasoning", "Coding-Decoding", "Easy", "If CAT is coded as DBU, how is DOG coded?", ["EPH", "EPI", "CPI", "EOG"], "EPH", "Each letter is shifted one step forward."),
    question("reason-03", "Logical Reasoning", "Number Series", "Easy", "Find the next number: 2, 6, 12, 20, 30, ?", ["36", "40", "42", "44"], "42", "Differences are 4, 6, 8, 10, so next is 12 and 30 + 12 = 42."),
    question("reason-04", "Logical Reasoning", "Alphabet Series", "Easy", "What comes next: A, C, F, J, O, ?", ["T", "U", "V", "W"], "U", "Steps are +2, +3, +4, +5, so next is +6 and O + 6 = U."),
    question("reason-05", "Logical Reasoning", "Seating Arrangement", "Medium", "A, B, C, D sit in a row. A is left of B and D is right of C. Who is in the middle if A sits at one end and D at the other?", ["A", "B", "C", "D"], "B", "The arrangement is A-B-C-D, so B is second from the left."),
    question("reason-06", "Logical Reasoning", "Direction Sense", "Easy", "A person walks 5 km north, then 3 km east, then 2 km south. How far from the start?", ["3 km", "4 km", "4.24 km", "6 km"], "4.24 km", "Net movement is 3 km north and 3 km east, so distance = sqrt(18) ≈ 4.24 km."),
    question("reason-07", "Logical Reasoning", "Syllogism", "Easy", "Statements: All pens are books. All books are papers. Conclusion: All pens are papers.", ["True", "False", "Cannot be determined", "Only if pens are blue"], "True", "The statements chain logically from pens to books to papers."),
    question("reason-08", "Logical Reasoning", "Statement and Conclusion", "Medium", "Statement: Some students are athletes. Conclusion: Some athletes are students.", ["Follows", "Does not follow", "Both", "Neither"], "Follows", "The statement is reversible in set logic, so the conclusion follows."),
    question("reason-09", "Logical Reasoning", "Puzzles", "Medium", "Three friends like apple, banana, and mango. If A does not like apple and B does not like banana, who likes mango?", ["A", "B", "C", "Cannot be determined"], "B", "A consistent arrangement gives B as the mango lover."),
    question("reason-10", "Logical Reasoning", "Data Sufficiency", "Medium", "Is x greater than 10? Statement 1: x > 12. Statement 2: x < 8.", ["Statement 1 sufficient", "Statement 2 sufficient", "Both together sufficient", "Neither sufficient"], "Statement 1 sufficient", "Statement 1 alone answers yes; statement 2 alone answers no."),
    question("reason-11", "Logical Reasoning", "Logical Sequence", "Easy", "Arrange in logical order: Seed, Tree, Fruit, Flower.", ["Seed, Flower, Tree, Fruit", "Seed, Tree, Flower, Fruit", "Seed, Fruit, Flower, Tree", "Flower, Seed, Tree, Fruit"], "Seed, Tree, Flower, Fruit", "A seed grows into a tree, which produces flowers and then fruit."),
    question("reason-12", "Logical Reasoning", "Analogy", "Easy", "Book is to Reading as Fork is to ?", ["Cooking", "Eating", "Writing", "Cutting"], "Eating", "A book is used for reading; a fork is used for eating."),
    question("reason-13", "Logical Reasoning", "Odd One Out", "Easy", "Choose the odd one out: Triangle, Square, Circle, Cube.", ["Triangle", "Square", "Circle", "Cube"], "Cube", "The first three are 2D shapes; cube is 3D."),
    question("reason-14", "Logical Reasoning", "Ranking", "Easy", "In a class of 10 students, A ranks 4th from the top. What is A's rank from the bottom?", ["6th", "7th", "8th", "9th"], "7th", "Rank from bottom = 10 - 4 + 1 = 7."),
    question("reason-15", "Logical Reasoning", "Clock and Calendar", "Medium", "If a clock shows 3:00, what is the angle between the hands?", ["0°", "30°", "60°", "90°"], "90°", "At 3:00, the hour hand is at 3 and the minute hand at 12, forming 90°."),

    question("verb-01", "Analytical & Verbal Ability", "Reading Comprehension", "Easy", "Passage: 'Practice improves speed and accuracy.' What is the main idea?", ["Practice is optional", "Practice helps improvement", "Speed is irrelevant", "Accuracy decreases with practice"], "Practice helps improvement", "The passage directly states that practice improves both speed and accuracy."),
    question("verb-02", "Analytical & Verbal Ability", "Sentence Correction", "Easy", "Choose the correct sentence.", ["He don't like tea.", "He doesn't likes tea.", "He doesn't like tea.", "He not like tea."], "He doesn't like tea.", "The correct auxiliary form is 'doesn't like'."),
    question("verb-03", "Analytical & Verbal Ability", "Error Spotting", "Easy", "Find the error: 'Each of the players have arrived.'", ["Each", "of the", "have", "arrived"], "have", "'Each' is singular, so the verb should be 'has'."),
    question("verb-04", "Analytical & Verbal Ability", "Synonyms", "Easy", "Choose the synonym of 'rapid'.", ["Slow", "Quick", "Weak", "Late"], "Quick", "Rapid means quick or fast."),
    question("verb-05", "Analytical & Verbal Ability", "Antonyms", "Easy", "Choose the antonym of 'ancient'.", ["Old", "Modern", "Tiny", "Rare"], "Modern", "Ancient means old; the opposite is modern."),
    question("verb-06", "Analytical & Verbal Ability", "Fill in the Blanks", "Easy", "She is good ___ mathematics.", ["in", "at", "on", "for"], "at", "The standard phrase is 'good at mathematics'."),
    question("verb-07", "Analytical & Verbal Ability", "Para Jumbles", "Medium", "Choose the best order: 1. He opened the door. 2. He heard a noise. 3. He walked inside. 4. He stopped suddenly.", ["2-1-3-4", "1-2-3-4", "2-3-1-4", "1-3-2-4"], "2-1-3-4", "He hears a noise, opens the door, walks inside, and then stops."),
    question("verb-08", "Analytical & Verbal Ability", "Critical Reasoning", "Medium", "If all companies value problem-solving, and this company values problem-solving, what can be inferred?", ["It is a company", "It values problem-solving", "It hires only engineers", "It cannot be a startup"], "It values problem-solving", "The inference directly matches the given statement."),
    question("verb-09", "Analytical & Verbal Ability", "Data Interpretation", "Medium", "A student scores 40, 50 and 60 in three tests. What is the average score?", ["45", "50", "55", "60"], "50", "Average = (40 + 50 + 60) / 3 = 50."),
    question("verb-10", "Analytical & Verbal Ability", "Tables", "Easy", "If a table has 4 rows and 5 columns, how many cells does it contain?", ["9", "15", "20", "25"], "20", "Cells = rows × columns = 4 × 5 = 20."),
    question("verb-11", "Analytical & Verbal Ability", "Pie Charts", "Easy", "In a pie chart, a 25% sector represents what angle?", ["45°", "60°", "90°", "120°"], "90°", "25% of 360° is 90°."),
    question("verb-12", "Analytical & Verbal Ability", "Bar Graphs", "Easy", "A bar graph shows sales of 20, 30 and 50 units. What is the total sales?", ["80", "90", "100", "110"], "100", "Total = 20 + 30 + 50 = 100."),
    question("verb-13", "Analytical & Verbal Ability", "Line Graphs", "Medium", "A line graph increases from 10 to 40 over 3 days. What is the average daily increase?", ["5", "8", "10", "15"], "10", "Increase = 30 over 3 days, so average per day = 10."),
    question("verb-14", "Analytical & Verbal Ability", "Vocabulary", "Easy", "Choose the meaning of 'elated'.", ["Sad", "Angry", "Very happy", "Tired"], "Very happy", "Elated means extremely happy or joyful."),
    question("verb-15", "Analytical & Verbal Ability", "Grammar", "Easy", "Choose the correct sentence.", ["Neither of the answers are correct.", "Neither of the answers is correct.", "Neither of the answer is correct.", "Neither of the answers were correct."], "Neither of the answers is correct.", "'Neither' takes a singular verb here."),
]

QUESTION_SECTION_INDEX: Dict[str, List[Dict[str, Any]]] = {}
for item in QUESTION_BANK:
    QUESTION_SECTION_INDEX.setdefault(item["section"], []).append(item)

QUESTION_TOPIC_INDEX = {question["topic"]: question for question in QUESTION_BANK}
QUESTION_ID_INDEX = {question["id"]: question for question in QUESTION_BANK}


def get_question(question_id: str) -> Dict[str, Any]:
    return deepcopy(QUESTION_ID_INDEX[question_id])


def get_questions_by_section(section: str) -> List[Dict[str, Any]]:
    return [deepcopy(question) for question in QUESTION_SECTION_INDEX.get(section, [])]


def get_public_question(question: Dict[str, Any]) -> Dict[str, Any]:
    public_question = deepcopy(question)
    public_question.pop("correct_answer", None)
    public_question.pop("explanation", None)
    return public_question


def get_public_bank() -> List[Dict[str, Any]]:
    return [get_public_question(question) for question in QUESTION_BANK]


def build_assessment_document(user_id: str, selected_questions: List[Dict[str, Any]], duration_minutes: int = DEFAULT_DURATION_MINUTES) -> Dict[str, Any]:
    started_at = datetime.now(timezone.utc)
    return {
        "user_id": user_id,
        "duration_minutes": duration_minutes,
        "started_at": started_at,
        "ends_at": started_at.timestamp() + duration_minutes * 60,
        "status": "in_progress",
        "question_ids": [question["id"] for question in selected_questions],
        "created_at": started_at,
        "updated_at": started_at,
    }


def select_assessment_questions() -> List[Dict[str, Any]]:
    return [deepcopy(question) for question in QUESTION_BANK]
