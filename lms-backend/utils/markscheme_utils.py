import fitz  # PyMuPDF
import json
import time
import re
from openai import OpenAI
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
import os

# ---------------- CONFIG ----------------
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")  # Replace with your actual key or load from env
)

# ---------------- HELPER FUNCTIONS ----------------
def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_json_from_response(response: str) -> dict:
    cleaned = response.strip()
    if "```" in cleaned:
        cleaned = re.sub(r"```(?:json)?", "", cleaned).strip()

    try:
        first_brace = cleaned.index("{")
        last_brace = cleaned.rindex("}")
        json_text = cleaned[first_brace:last_brace + 1]
        return json.loads(json_text)
    except Exception as e:
        raise json.JSONDecodeError(f"Failed to extract valid JSON: {e}", response, 0)

def query_hf_api(prompt: str) -> str:
    completion = client.chat.completions.create(
        model="meta-llama/llama-4-maverick:free",
        messages=[{"role": "user", "content": prompt}]
    )
    return completion.choices[0].message.content

def generate_markscheme_json(quiz_text: str, max_retries: int = 5, delay: int = 3) -> dict:
#     prompt = f"""
# You are an expert teaching assistant. Your job is to create a complete, valid JSON-based marking scheme for the following quiz.

# === QUIZ START ===
# {quiz_text}
# === QUIZ END ===

# For each question, return the following fields:
# - question_number
# - question_text
# - question_type (one of: MCQ, True/False, Reasoning-Based)
# - correct_answer
# - accepted_answers
# - marks
# - notes

# Strictly output only the raw JSON object.
# """
    prompt = f"""
You are an expert teaching assistant. Your job is to create a complete, valid JSON-based marking scheme for the following quiz.

=== QUIZ START ===
{quiz_text}
=== QUIZ END ===

For each question, return the following fields:
- question_number
- question_text
- question_type (one of: MCQ, True/False, Reasoning-Based)
- correct_answer: a complete model answer or best possible response (even for reasoning-based)
- accepted_answers: acceptable variations or key phrases (can be ["N/A"] for open-ended answers only if absolutely necessary)
- marks: marks allocated
- notes: any specific rubric or marking guideline

Strictly output a JSON in this format:

{{
  "questions": [
    {{
      "question_number": "1",
      "question_text": "...",
      "question_type": "Reasoning-Based",
      "correct_answer": "A complete, high-quality answer that would earn full marks",
      "accepted_answers": ["key points or partial credit answers..."],
      "marks": 5,
      "notes": "Explain what earns full marks, partial marks, etc."
    }}
  ]
}}

{{
  "questions": [
    {{
      "question_number": "1",
      "question_text": "What is the primary purpose of clustering algorithms like K-Means?",
      "question_type": "MCQ",
      "correct_answer": "B",
      "accepted_answers": ["B", "b", "To group similar data points into clusters"],
      "marks": 1,
      "notes": "Award marks only if they select the correct option. Do not accept vague answers."
    }}
    // more questions here...
  ]
}}

⚠️ Important:
- Do not output 'N/A' for correct_answer unless the question is opinion-based.
- Strictly output *only* a raw JSON object — no preamble, explanation, markdown, or comments. If unsure about any field, still return a syntactically valid placeholder.

"""
    for attempt in range(1, max_retries + 1):
        response = query_hf_api(prompt)
        try:
            markscheme = extract_json_from_response(response)
            return markscheme
        except json.JSONDecodeError:
            time.sleep(delay)
    raise Exception("Markscheme generation failed after maximum retries.")

def evaluate_markscheme_quality(markscheme: dict) -> float:
    prompt = f"""
You are a university professor reviewing a generated marking scheme for a quiz.
Please evaluate it across the following dimensions (score out of 10):
1. Completeness
2. Clarity
3. Rubric Quality
4. Answer Validity

Here is the marking scheme:
{json.dumps(markscheme, indent=2)}

Return JSON like:
{{"completeness": 8, "clarity": 9, "rubric_quality": 9, "answer_validity": 8}}
"""
    try:
        response = query_hf_api(prompt)
        print("🔍 Raw LLM Response:", repr(response))

        # Extract JSON using regex
        match = re.search(r"\{[^{}]*\"completeness\"[^{}]*\}", response, re.DOTALL)
        if not match:
            raise ValueError("❌ No valid JSON block found in response.")
        
        scores = json.loads(match.group(0))

        average_score = sum(scores.values()) / len(scores)
        print(f"📊 Evaluation Scores: {scores} | Average: {average_score:.2f}")
        return average_score

    except Exception as e:
        print(f"❌ Exception during evaluation: {e}")
        return 0.0

def approve_markscheme(markscheme: dict, quiz_text: str, threshold: float = 6.5, max_attempts: int = 2, delay: int = 3) -> dict:
    attempt = 1
    while attempt <= max_attempts:
        print(f"evaluating markscheme")
        avg_score = evaluate_markscheme_quality(markscheme)
        print(f"the avg score is: {avg_score:.2f}")
        if avg_score >= threshold:
            return markscheme
        print(f"❌ Markscheme rejected (score: {avg_score:.2f}). Retrying...\n")
        attempt += 1
        time.sleep(delay)
        markscheme = generate_markscheme_json(quiz_text)
    return markscheme

def export_markscheme_to_pdf(markscheme: dict, pdf_path: str = "markscheme_for_students.pdf"):
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=1 * inch,
        bottomMargin=1 * inch
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="SectionHeading", fontSize=14, spaceAfter=10, spaceBefore=20, alignment=TA_CENTER))
    elements = []

    elements.append(Paragraph("<b>Official Quiz Markscheme</b>", styles["Title"]))
    elements.append(Spacer(1, 0.25 * inch))

    grouped = {"MCQ": [], "True/False": [], "Reasoning-Based": []}
    for q in markscheme["questions"]:
        grouped[q["question_type"]].append(q)

    for section_name, questions in grouped.items():
        if not questions:
            continue
        elements.append(Paragraph(f"{section_name} Questions", styles["SectionHeading"]))
        for q in questions:
            block = f"""
            <b>Q{q['question_number']}: {q['question_text']}</b><br/>
            <b>Marks:</b> {q['marks']}<br/>
            <b>Correct Answer:</b> {q['correct_answer']}<br/>
            <b>Accepted Alternatives:</b> {', '.join(q['accepted_answers'])}<br/>
            <b>Grading Notes:</b> {q['notes']}<br/><br/>
            """
            elements.append(Paragraph(block, styles["Normal"]))
            elements.append(Spacer(1, 0.15 * inch))

    def add_header_footer(canvas_obj, doc):
        canvas_obj.saveState()
        width, height = A4
        canvas_obj.setFont("Helvetica-Bold", 12)
        canvas_obj.drawCentredString(width / 2, height - 0.5 * inch, "LUMS Computer Science Department")
        canvas_obj.setFont("Helvetica", 9)
        canvas_obj.drawString(0.75 * inch, 0.5 * inch, f"Generated Markscheme")
        canvas_obj.drawRightString(width - 0.75 * inch, 0.5 * inch, f"Page {doc.page}")
        canvas_obj.restoreState()

    doc.build(elements, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
