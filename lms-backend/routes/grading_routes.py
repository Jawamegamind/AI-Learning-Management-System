
from fastapi import APIRouter, UploadFile, HTTPException, Form, File
from fastapi.responses import JSONResponse
import tempfile
import os
import base64

from utils.quiz_grading_utils import (
    extract_text_from_student_file,
    extract_student_info_and_answers,
    parse_pdf_markscheme_to_dict,
    grade_answers_with_llm,
    generate_student_feedback,
)

from utils.assignment_grading_utils import (
    extract_code_cells,
    extract_markdown_cells,
    analyze_and_grade_implementation,
    save_grading_results_to_pdf_reportlab
)


grading_router = APIRouter()

@grading_router.post("/grade-quiz")
async def grade_quiz(
    student_id: str = Form(...),
    quiz: UploadFile = File(...),
    quiz_solution: UploadFile = File(...)
):
    try:
        print(f"📥 Grading Request Received")
        print(f"Student ID: {student_id}")
        print(f"Quiz File Name: {quiz.filename}")
        print(f"Submission File Name: {quiz_solution.filename}")

        # Step 1: Save uploaded files to temp
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_q, \
             tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_s:
            tmp_q.write(await quiz.read())
            tmp_s.write(await quiz_solution.read())
            quiz_path = tmp_q.name
            sol_path = tmp_s.name

        print(f"📁 Saved quiz to: {quiz_path}")
        print(f"📁 Saved student submission to: {sol_path}")

        # Step 2: Extract student answers
        student_text = extract_text_from_student_file(sol_path)
        print(f"📄 Extracted student text:\n{student_text[:500]}...")
        student_info = extract_student_info_and_answers(student_text)
        print(f"🧑‍🎓 Student Info Parsed: {student_info}")

        # Step 3: Parse markscheme
        markscheme = parse_pdf_markscheme_to_dict(quiz_path)
        print(f"✅ Loaded markscheme with {len(markscheme['questions'])} questions")

        # Step 4: Grade with LLM
        graded = grade_answers_with_llm(student_info, markscheme)
        print(f"📝 Grading Complete. Sample result:\n{graded[0] if graded else 'None'}")
        total_marks = sum(q["marks_awarded"] for q in graded)
        print(f"💯 Total Marks: {total_marks}")

        # Step 5: Generate feedback PDF in memory
        pdf_bytes = generate_student_feedback(student_info, graded)
        print(f"\n pdf bytes are: {pdf_bytes}")
        feedback_base64 = base64.b64encode(pdf_bytes).decode("utf-8")
        print(f"📄 Feedback PDF generated and encoded")

        return JSONResponse(content={
            "status": "success",
            "marks": total_marks,
            "feedback_pdf_base64": feedback_base64,
            "student_roll_number": student_info.get("roll_number", "Unknown"),
        })

    except Exception as e:
        print(f"❌ Grading failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Grading failed: {str(e)}")

@grading_router.post("/grade-assignment")
async def grade_assignment(
    student_id: str = Form(...),
    assignment: UploadFile = File(...),
    assignment_solution: UploadFile = File(...),
):
    try:
        print("\n📥 Assignment Grading Request Received")
        print(f"Student ID: {student_id}")
        print(f"Assignment File: {assignment.filename}")
        print(f"Student Solution File: {assignment_solution.filename}")

        # Save uploaded notebook files
        with tempfile.NamedTemporaryFile(delete=False, suffix=".ipynb") as tmp_assignment_file:
            assignment_content = await assignment.read()
            tmp_assignment_file.write(assignment_content)
            tmp_assignment_path = tmp_assignment_file.name

        print(f"📁 Saved student submission to: {tmp_assignment_path}")

        # Extract code cells and markdown-based marking scheme
        code_cells = extract_code_cells(tmp_assignment_path)
        print(f"the code cells are: {code_cells}")
        marking_scheme = extract_markdown_cells(tmp_assignment_path)
        print(f"the marking scheme cells are: {marking_scheme}")

        if not code_cells or not marking_scheme:
            raise ValueError("Code cells or marking scheme could not be extracted.")

        print("✅ Extracted code and markdown cells")

        # Perform grading
        # api_key = os.getenv("OPENROUTER_API_KEY")
        grading_results = analyze_and_grade_implementation(code_cells, marking_scheme)
        print("🧠 Grading complete")

        # Generate feedback PDF
        pdf_bytes = save_grading_results_to_pdf_reportlab(grading_results, student_id)
        feedback_base64 = base64.b64encode(pdf_bytes).decode("utf-8")
        print("📄 Feedback PDF generated and encoded")

        # Calculate total score
        total_marks = sum(result['score'] for result in grading_results.values())

        return {
            "status": "success",
            "marks": round(total_marks, 2),
            "feedback_pdf_base64": feedback_base64,
            "student_id": student_id
        }

    except Exception as e:
        print(f"❌ Assignment grading failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Assignment grading failed: {str(e)}")
