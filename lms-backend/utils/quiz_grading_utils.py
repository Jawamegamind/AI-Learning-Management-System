import requests
import fitz  # for PDF
from docx import Document
import re
import os
import json
from openai import OpenAI
from typing import Tuple, Dict
from typing import Dict
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from io import BytesIO


client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)

def query_hf_api(prompt: str) -> str:
    print("⏳ Querying LLM...")
    completion = client.chat.completions.create(
        model="meta-llama/llama-4-maverick:free",
        messages=[{"role": "user", "content": prompt}]
    )
    return completion.choices[0].message.content

def extract_text_from_student_file(file_path: str) -> str:
    if file_path.lower().endswith(".pdf"):
        doc = fitz.open(file_path)
        return "\n".join([page.get_text() for page in doc])
    elif file_path.lower().endswith(".docx"):
        doc = Document(file_path)
        return "\n".join([p.text for p in doc.paragraphs])
    else:
        raise ValueError("Unsupported file format. Only PDF and DOCX supported.")

def load_markscheme_from_path(path: str) -> dict:
    if path.endswith(".json"):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise ValueError("Markscheme must be a JSON file.")

def extract_student_info_and_answers(text: str) -> Dict:
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    roll_number = "UNKNOWN"
    name = "Unknown Student"

    # Extract name and roll number
    for i in range(min(5, len(lines))):
        line = lines[i]
        if re.search(r'\d{8}', line):
            roll_match = re.search(r'\d{8}', line)
            roll_number = roll_match.group() if roll_match else roll_number

        if 'name' in line.lower():
            name = line.split(":", 1)[-1].strip()
        elif name == "Unknown Student" and re.match(r'^[A-Za-z\s]+$', line):
            name = line.strip()

    if roll_number == "UNKNOWN" and len(lines) >= 1:
        match = re.match(r"(.*?)(\d{8})", lines[0])
        if match:
            name = match.group(1).strip()
            roll_number = match.group(2)

    mcqs, true_false, short_answers = {}, {}, {}
    mode = None
    current_short_q = None

    print(f"\n lines is: {lines}")

    for line in lines:
        line_lower = line.lower()

        # Section headers
        if 'mcqs' in line_lower:
            mode = 'mcq'
            continue
        elif 'true/false' in line_lower:
            mode = 'tf'
            continue
        elif 'short question' in line_lower or 'short answers' in line_lower:
            mode = 'short'
            continue

        # Matches lines like "1) A", "2) True"
        match = re.match(r'^(\d+)\)\s*(.+)', line)
        if match:
            q_num = match.group(1)
            answer = match.group(2).strip()

            if mode == 'mcq' and answer.upper() in ['A', 'B', 'C', 'D']:
                mcqs[q_num] = answer.upper()
            elif mode == 'tf':
                tf_ans = 'True' if answer.lower() in ['true', 't'] else 'False'
                true_false[q_num] = tf_ans
            elif mode == 'short':
                current_short_q = q_num
                short_answers[current_short_q] = answer
        elif mode == 'short' and current_short_q:
            # Append continuation lines to the current short answer
            short_answers[current_short_q] += " " + line

    return {
        "roll_number": roll_number,
        "name": name,
        "mcqs": mcqs,
        "true_false": true_false,
        "short_answers": short_answers
    }

def parse_pdf_markscheme_to_dict(pdf_path: str) -> dict:
    import fitz
    doc = fitz.open(pdf_path)
    lines = [line.strip() for page in doc for line in page.get_text().splitlines() if line.strip()]

    section_type = None
    questions = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Detect section type
        if "MCQ Questions" in line:
            section_type = "MCQ"
            i += 1
            continue
        elif "True/False Questions" in line:
            section_type = "True/False"
            i += 1
            continue
        elif "Reasoning-Based Questions" in line:
            section_type = "Reasoning-Based"
            i += 1
            continue

        # Detect start of a question
        if line.startswith("Q") and ':' in line:
            try:
                # Accumulate question text (multi-line)
                question_text_lines = [line.split(":", 1)[1].strip()]
                i += 1
                while i < len(lines) and not lines[i].startswith("Marks:"):
                    question_text_lines.append(lines[i])
                    i += 1
                question_text = " ".join(question_text_lines).strip()

                # Extract marks
                marks = 1
                if i < len(lines) and lines[i].startswith("Marks:"):
                    marks = int(lines[i].split(":", 1)[1].strip())
                    i += 1

                # Extract correct answer
                correct_answer = "UNKNOWN"
                if i < len(lines) and lines[i].startswith("Correct Answer:"):
                    correct_answer_lines = [lines[i].split(":", 1)[1].strip()]
                    i += 1
                    while i < len(lines):
                        if lines[i].startswith(("Accepted Alternatives:", "Grading Notes:", "Q")) or "Questions" in lines[i]:
                            break
                        correct_answer_lines.append(lines[i])
                        i += 1
                    correct_answer = " ".join(correct_answer_lines).strip()

                # Append question
                questions.append({
                    "question_type": section_type,
                    "question_text": question_text,
                    "correct_answer": correct_answer,
                    "marks": marks
                })

            except Exception as e:
                print(f"⚠️ Error parsing question at line {i}: {e}")

        else:
            i += 1

    return {"questions": questions}


def grade_answers_with_llm(student: dict, markscheme: dict, model="meta-llama/llama-4-maverick:free") -> list:
    graded = []
    counters = {"MCQ": 1, "True/False": 1, "Reasoning-Based": 1}

    for q in markscheme["questions"]:
        qtype = q["question_type"]
        qtext = q["question_text"]
        correct = q["correct_answer"]
        max_marks = q["marks"]
        qnum = str(counters[qtype])
        counters[qtype] += 1

        # Fetch student answer based on question type and section-local question number
        student_answer = (
            student["mcqs"].get(qnum) if qtype == "MCQ" else
            student["true_false"].get(qnum) if qtype.lower().startswith("true") else
            student["short_answers"].get(qnum) if qtype.lower().startswith("reasoning") or qtype.lower().startswith("short") else
            None
        )

        # Handle missing answer
        if not student_answer:
            graded.append({
                "question_type": qtype,
                "question_number": qnum,
                "question_text": qtext,
                "student_answer": "Not Attempted",
                "correct_answer": correct,
                "marks_awarded": 0,
                "max_marks": max_marks,
                "feedback": "No answer submitted."
            })
            continue

        # Build LLM grading prompt with examples
        prompt = f"""
You are a university-level teaching assistant helping evaluate a student's quiz.

Your job is to assign marks (out of {max_marks}) and provide feedback. The question may be an MCQ, True/False, or Reasoning-Based answer.

Below are examples of how to grade each question type:

---

Example 1: (MCQ)
Question: What is 2 + 2?
Correct Answer: B
Student Answer: A

Your Evaluation (JSON format):
{{
  "marks_awarded": 0,
  "max_marks": 1,
  "feedback": "Incorrect. The correct answer is B.",
  "correct_answer": "B) 4"
}}

---

Example 2: (True/False)
Question: True or False: The Earth is flat.
Correct Answer: False
Student Answer: False

Your Evaluation:
{{
  "marks_awarded": 1,
  "max_marks": 1,
  "feedback": "Correct.",
  "correct_answer": "False"
}}

---

Example 3: (Reasoning-Based)
Question: Why is the sky blue?
Correct Answer: Due to Rayleigh scattering of sunlight in the atmosphere.
Student Answer: Because of light refraction.

Your Evaluation:
{{
  "marks_awarded": 0.5,
  "max_marks": 1,
  "feedback": "Partially correct. Student mentioned light, but missed Rayleigh scattering and atmospheric explanation.",
  "correct_answer": "Due to Rayleigh scattering of sunlight in the atmosphere."
}}

---

Now grade the following student answer. Respond strictly in the same JSON format.

Question: {qtext}
Correct Answer: {correct}
Student Answer: {student_answer}
"""

        # response = None  # ensure 'response' is defined even if API fails
        try:
            # print("⏳ Grading question...")
            response = query_hf_api(prompt)
            # print("✅ Response:", response)

            if response is None or not response.strip():
                raise ValueError("Empty or null response from LLM.")

            # Strip optional markdown formatting if included
            response = response.strip().removeprefix("```json").removesuffix("```").strip()

            result = json.loads(response)

            if not isinstance(result, dict) or "marks_awarded" not in result:
                raise ValueError("LLM returned invalid format.")

            result.update({
                "question_type": qtype,
                "question_number": qnum,
                "question_text": qtext,
                "student_answer": student_answer
            })
            graded.append(result)

        except Exception as e:
            graded.append({
                "question_type": qtype,
                "question_number": qnum,
                "question_text": qtext,
                "student_answer": student_answer,
                "correct_answer": correct,
                "marks_awarded": 0,
                "max_marks": max_marks,
                "feedback": f"Grading failed: {str(e)}"
            })


    return graded

def generate_feedback_pdf(student_name: str, roll_number: str, graded: list, output_path):
    """
    Generates the feedback PDF. Output can be a filepath or a BytesIO buffer.
    """
    total_awarded = sum(q['marks_awarded'] for q in graded)
    total_possible = sum(q['max_marks'] for q in graded)

    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            rightMargin=0.75 * inch,
                            leftMargin=0.75 * inch,
                            topMargin=1 * inch,
                            bottomMargin=1 * inch)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="QuestionHeader", fontSize=12, spaceBefore=10, spaceAfter=4, leading=14, fontName="Helvetica-Bold"))
    styles.add(ParagraphStyle(name="CustomBodyText", fontSize=11, leading=14, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name="CenteredHeading", fontSize=14, leading=18, alignment=TA_CENTER, spaceAfter=10, fontName="Helvetica-Bold"))

    elements = []

    # Header
    elements.append(Paragraph("Student Quiz Feedback Report", styles["CenteredHeading"]))
    elements.append(Paragraph(f"<b>Name:</b> {student_name}", styles["CustomBodyText"]))
    elements.append(Paragraph(f"<b>Roll Number:</b> {roll_number}", styles["CustomBodyText"]))
    elements.append(Paragraph(f"<b>Total Marks:</b> {total_awarded} / {total_possible}", styles["CustomBodyText"]))
    elements.append(Spacer(1, 0.2 * inch))

    # Per-question feedback
    for q in graded:
        elements.append(Paragraph(f"Q{q['question_number']} - {q['question_type']}", styles["QuestionHeader"]))
        elements.append(Paragraph(f"<b>Question:</b> {q['question_text']}", styles["CustomBodyText"]))
        elements.append(Paragraph(f"<b>Student Answer:</b> {q['student_answer']}", styles["CustomBodyText"]))
        elements.append(Paragraph(f"<b>Correct Answer:</b> {q['correct_answer']}", styles["CustomBodyText"]))
        elements.append(Paragraph(f"<b>Marks Awarded:</b> {q['marks_awarded']} / {q['max_marks']}", styles["CustomBodyText"]))
        elements.append(Paragraph(f"<b>Feedback:</b> {q['feedback']}", styles["CustomBodyText"]))
        elements.append(Spacer(1, 0.2 * inch))

    doc.build(elements)


def generate_student_feedback(student_info: dict, graded: list) -> bytes:
    """
    Generates feedback PDF and returns it as bytes.
    """
    name = student_info.get("name", "Unknown")
    roll = student_info.get("roll_number", "Unknown")

    buffer = BytesIO()
    generate_feedback_pdf(
        student_name=name,
        roll_number=roll,
        graded=graded,
        output_path=buffer
    )
    buffer.seek(0)
    return buffer.read()


def fetch_url_to_file(url: str, destination_path: str):
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Failed to download file from {url}")
    with open(destination_path, "wb") as f:
        f.write(response.content)