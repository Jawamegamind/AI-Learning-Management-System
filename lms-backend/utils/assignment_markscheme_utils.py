# # ---------------------- utils/assignment_markscheme_utils.py ----------------------
# import json
# import re
# from openai import OpenAI
# from pathlib import Path

# # ========== LLM Query ==========
# def query_openrouter(prompt: str, api_key: str, model: str = "meta-llama/llama-4-maverick:free") -> str:
#     client = OpenAI(
#         base_url="https://openrouter.ai/api/v1",
#         api_key=api_key
#     )
#     completion = client.chat.completions.create(
#         model=model,
#         messages=[{"role": "user", "content": prompt}]
#     )
#     return completion.choices[0].message.content

# # ========== Notebook Parsing ==========
# def extract_markdown_cells(notebook_path: Path):
#     with open(notebook_path, 'r', encoding='utf-8') as f:
#         notebook = json.load(f)

#     marking_scheme = {}
#     current_task = None
#     total_tasks = sum(1 for cell in notebook['cells'] if cell['cell_type'] == 'markdown' and re.search(r'##\s*Task\s*\d+', ''.join(cell['source']), re.IGNORECASE))
#     default_points = 100 / total_tasks if total_tasks > 0 else 0

#     for cell in notebook['cells']:
#         if cell['cell_type'] == 'markdown':
#             content = ''.join(cell['source'])
#             task_match_with_points = re.search(r'##\s*(Task\s*\d+)[^\n]*?(\d+)\s*[Pp]oints', content)
#             task_match = re.search(r'##\s*(Task\s*\d+)', content)

#             if task_match_with_points:
#                 current_task = task_match_with_points.group(1)
#                 points = int(task_match_with_points.group(2))
#             elif task_match:
#                 current_task = task_match.group(1)
#                 points = default_points

#             if current_task and (task_match_with_points or task_match):
#                 marking_scheme[current_task] = {
#                     'description': content,
#                     'subtasks': [],
#                     'points': points
#                 }

#             elif current_task and 'Sub-tasks:' in content:
#                 subtasks = re.findall(r'\d+\.\s*([^\n]+)', content)
#                 if subtasks:
#                     points_per_subtask = marking_scheme[current_task]['points'] / len(subtasks)
#                     marking_scheme[current_task]['subtasks'] = [
#                         {'description': s.strip(), 'points': points_per_subtask} for s in subtasks
#                     ]

#     return marking_scheme

# # ========== Scheme Generation ==========
# def generate_marking_scheme(marking_scheme: dict, api_key: str) -> str:
#     output = "# Assignment Marking Scheme\n\n"
#     total_points = 0

#     for task, details in marking_scheme.items():
#         task_prompt = f"""
#         Generate feedback criteria for the following task:
#         Task: {task}
#         Description: {details['description']}
#         Points: {details['points']}
#         Provide 2-3 specific criteria for grading this task.
#         """
#         task_feedback = query_openrouter(task_prompt, api_key)

#         output += f"## {task} ({details['points']} points)\n"
#         output += f"### Grading Criteria:\n{task_feedback}\n\n"

#         for i, subtask in enumerate(details['subtasks'], 1):
#             subtask_prompt = f"""
#             Generate specific grading criteria for this subtask:
#             Task: {task}
#             Subtask: {subtask['description']}
#             Points: {subtask['points']:.1f}
#             Provide 1-2 concrete evaluation points.
#             """
#             subtask_feedback = query_openrouter(subtask_prompt, api_key)
#             output += f"{i}. {subtask['description']} ({subtask['points']:.1f} points)\n"
#             output += f"   Evaluation criteria:\n   {subtask_feedback}\n\n"

#         total_points += details['points']

#     output += f"\nTotal Points: {total_points:.1f}"
#     return output

# # ========== Full Pipeline ==========
# def generate_assignment_markscheme(notebook_path: str, api_key: str) -> str:
#     scheme = extract_markdown_cells(Path(notebook_path))
#     if not scheme:
#         raise ValueError("No valid tasks found in notebook.")
#     return generate_marking_scheme(scheme, api_key)
# ---------------------- utils/assignment_markscheme_utils.py ----------------------
# ---------------------- utils/assignment_markscheme_utils.py ----------------------
import json
import re
from openai import OpenAI
from pathlib import Path
from tempfile import NamedTemporaryFile
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
import base64
import os

client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY")
    )

# ========== LLM Query ==========
def query_openrouter(prompt: str, model: str = "meta-llama/llama-4-maverick:free") -> str:
    
    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}]
    )
    return completion.choices[0].message.content

# ========== Notebook Parsing ==========
def extract_markdown_cells(notebook_path: Path):
    with open(notebook_path, 'r', encoding='utf-8') as f:
        notebook = json.load(f)

    marking_scheme = {}
    current_task = None
    total_tasks = sum(1 for cell in notebook['cells'] if cell['cell_type'] == 'markdown' and re.search(r'##\s*Task\s*\d+', ''.join(cell['source']), re.IGNORECASE))
    default_points = 100 / total_tasks if total_tasks > 0 else 0

    for cell in notebook['cells']:
        if cell['cell_type'] == 'markdown':
            content = ''.join(cell['source'])
            task_match_with_points = re.search(r'##\s*(Task\s*\d+)[^\n]*?(\d+)\s*[Pp]oints', content)
            task_match = re.search(r'##\s*(Task\s*\d+)', content)

            if task_match_with_points:
                current_task = task_match_with_points.group(1)
                points = int(task_match_with_points.group(2))
            elif task_match:
                current_task = task_match.group(1)
                points = default_points

            if current_task and (task_match_with_points or task_match):
                marking_scheme[current_task] = {
                    'description': content,
                    'subtasks': [],
                    'points': points
                }

            elif current_task and 'Sub-tasks:' in content:
                subtasks = re.findall(r'\d+\.\s*([^\n]+)', content)
                if subtasks:
                    points_per_subtask = marking_scheme[current_task]['points'] / len(subtasks)
                    marking_scheme[current_task]['subtasks'] = [
                        {'description': s.strip(), 'points': points_per_subtask} for s in subtasks
                    ]

    return marking_scheme

# ========== PDF Export ==========
def export_assignment_markscheme_to_pdf(data: dict) -> str:
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="SectionHeading", fontSize=14, spaceAfter=10, spaceBefore=20, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name="CodeBlock", fontName="Courier", fontSize=9, leading=12))
    elements = []

    elements.append(Paragraph("<b>Assignment Marking Scheme</b>", styles["Title"]))
    elements.append(Spacer(1, 0.25 * inch))

    total_points = 0
    for task, details in data.items():
        # Clean markdown headers
        cleaned_description = re.sub(r'#* ?', '', details['description']).strip()
        elements.append(Paragraph(f"<b>{task} ({details['points']} points)</b>", styles["Heading2"]))
        elements.append(Spacer(1, 0.1 * inch))
        elements.append(Paragraph(f"<b>Description:</b>", styles["Normal"]))
        elements.append(Paragraph(cleaned_description, styles["Normal"]))
        elements.append(Spacer(1, 0.15 * inch))

        task_prompt = f"Generate 2-3 specific grading criteria for this task: {cleaned_description}"
        feedback = query_openrouter(task_prompt)

        elements.append(Paragraph("<b>Grading Criteria:</b>", styles["Normal"]))
        for line in feedback.strip().split('\n'):
            elements.append(Paragraph(line.strip(), styles["Normal"]))
        elements.append(Spacer(1, 0.15 * inch))

        for idx, subtask in enumerate(details.get("subtasks", []), 1):
            sub_prompt = f"Generate 1-2 grading points for this subtask: {subtask['description']}"
            sub_feedback = query_openrouter(sub_prompt)

            elements.append(Paragraph(f"<b>Subtask {idx}: {subtask['description']} ({subtask['points']:.1f} points)</b>", styles["Normal"]))
            elements.append(Paragraph("<i>Evaluation Criteria:</i>", styles["Italic"]))
            for line in sub_feedback.strip().split('\n'):
                elements.append(Paragraph(line.strip(), styles["Normal"]))
            elements.append(Spacer(1, 0.15 * inch))

        total_points += details['points']
        elements.append(PageBreak())

    elements.append(Paragraph(f"<b>Total Points: {total_points:.1f}</b>", styles["Heading3"]))

    with NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        doc = SimpleDocTemplate(tmp.name, pagesize=A4, rightMargin=0.75 * inch, leftMargin=0.75 * inch, topMargin=1 * inch, bottomMargin=1 * inch)
        doc.build(elements)
        tmp.seek(0)
        encoded_pdf = base64.b64encode(tmp.read()).decode("utf-8")

    return encoded_pdf


# ========== Full Pipeline ==========
def generate_assignment_markscheme(notebook_path: str) -> str:
    scheme = extract_markdown_cells(Path(notebook_path))
    print(f"scheme is: {scheme}")
    if not scheme:
        raise ValueError("No valid tasks found in notebook.")
    return export_assignment_markscheme_to_pdf(scheme)
