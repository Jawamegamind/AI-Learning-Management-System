import os
import shutil
import requests
import json
from pathlib import Path
import re
import openai
from openai import OpenAI
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.units import inch
from io import BytesIO

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)

def query_openrouter(prompt: str) -> str:
    print("⏳ Querying LLM...")
    completion = client.chat.completions.create(
        model="meta-llama/llama-4-maverick:free",
        messages=[{"role": "user", "content": prompt}]
    )
    return completion.choices[0].message.content


def extract_markdown_cells(notebook_path):
    """
    Extract and process markdown cells from a Jupyter notebook
    
    Args:
        notebook_path (str or Path): Path to the notebook file
        
    Returns:
        dict: Dictionary containing task sections and their point values
    """
    try:
        # Read the notebook
        with open(notebook_path, 'r', encoding='utf-8') as f:
            notebook = json.load(f)
            
        marking_scheme = {}
        current_task = None
        total_tasks = 0
        
        # First pass: Count total tasks
        for cell in notebook['cells']:
            if cell['cell_type'] == 'markdown':
                content = ''.join(cell['source'])
                task_match = re.search(r'##\s*(Task\s*\d+)', content, re.IGNORECASE)
                if task_match:
                    total_tasks += 1
        
        default_points = 100 / total_tasks if total_tasks > 0 else 0
        
        # Second pass: Extract tasks and points
        for cell in notebook['cells']:
            if cell['cell_type'] == 'markdown':
                content = ''.join(cell['source'])
                
                # Try to find task header with explicit points
                task_match_with_points = re.search(r'##\s*(Task\s*\d+)[^\n]*?(\d+)\s*[Pp]oints', content, re.IGNORECASE)
                task_match_without_points = re.search(r'##\s*(Task\s*\d+)', content, re.IGNORECASE)
                
                if task_match_with_points:
                    current_task = task_match_with_points.group(1)
                    points = int(task_match_with_points.group(2))
                elif task_match_without_points:
                    current_task = task_match_without_points.group(1)
                    points = default_points
                
                if task_match_with_points or task_match_without_points:
                    marking_scheme[current_task] = {
                        'description': content,
                        'subtasks': [],
                        'points': points
                    }
                
                # Handle subtasks
                elif current_task and 'Sub-tasks:' in content:
                    subtasks = re.findall(r'\d+\.\s*([^\n]+)', content)
                    if subtasks:
                        points_per_subtask = marking_scheme[current_task]['points'] / len(subtasks)
                        marking_scheme[current_task]['subtasks'] = [
                            {
                                'description': subtask.strip(),
                                'points': points_per_subtask
                            }
                            for subtask in subtasks
                        ]
        
        if not marking_scheme:
            print("No tasks found in the notebook.")
            return None
            
        return marking_scheme
    
    except Exception as e:
        print(f"Error processing notebook: {str(e)}")
        return None

def extract_code_cells(notebook_path):
    """
    Extract and analyze code cells from a Jupyter notebook
    
    Args:
        notebook_path (str or Path): Path to the notebook file
        
    Returns:
        dict: Dictionary containing code cells mapped to their corresponding tasks
    """
    try:
        # Read the notebook
        with open(notebook_path, 'r', encoding='utf-8') as f:
            notebook = json.load(f)
            
        code_cells = {}
        current_task = None
        
        # Iterate through cells
        for i, cell in enumerate(notebook['cells']):
            # Look for task headers in markdown cells
            if cell['cell_type'] == 'markdown':
                content = ''.join(cell['source'])
                task_match = re.search(r'##\s*(Task\s*\d+):', content, re.IGNORECASE)
                if task_match:
                    current_task = task_match.group(1)
                    code_cells[current_task] = {
                        'implementation': [],
                        'test_cases': [],
                        'outputs': []
                    }
            
            # Extract code cells
            elif cell['cell_type'] == 'code' and current_task:
                code_content = ''.join(cell['source'])
                
                # Skip empty cells
                if not code_content.strip():
                    continue
                
                # Analyze code content
                if 'test' in code_content.lower() or 'assert' in code_content.lower():
                    code_cells[current_task]['test_cases'].append({
                        'code': code_content,
                        'cell_index': i
                    })
                else:
                    code_cells[current_task]['implementation'].append({
                        'code': code_content,
                        'cell_index': i
                    })
                
                # Extract outputs if available
                if 'outputs' in cell:
                    code_cells[current_task]['outputs'].append({
                        'cell_index': i,
                        'output': cell['outputs']
                    })
        
        return code_cells
    
    except Exception as e:
        print(f"Error extracting code cells: {str(e)}")
        return None

def analyze_and_grade_implementation(code_cells, marking_scheme):
    """
    Analyze code implementation and grade according to marking scheme
    
    Args:
        code_cells (dict): Dictionary containing code cells
        marking_scheme (dict): Marking scheme with points distribution
        api_key (str): API key for OpenRouter
        
    Returns:
        dict: Grading results and feedback for each task
    """
    grading_results = {}
    total_score = 0
    feedback_report = "# Assignment Grading Report\n\n"
    
    for task, content in code_cells.items():
        # Check if implementation exists and is not empty
        has_implementation = bool(content['implementation'])
        implementation_code = "\n".join([cell['code'] for cell in content['implementation']])
        max_points = marking_scheme[task]['points']
        
        # Analyze implementation
        analysis_prompt = f"""
        Analyze the following code implementation for {task} worth {max_points} points.
        Code:
        ```python
        {implementation_code}
        ```
        
        Evaluate based on:
        1. Code quality and readability (40% of points)
        2. Implementation completeness (40% of points)
        3. Testing and documentation (20% of points)
        
        Provide:
        1. Score for each criterion (as percentage)
        2. Specific feedback and areas of improvement
        3. Justification for any point deductions

        keep the feedback concise and actionable.
        """
        
        analysis = query_openrouter(analysis_prompt)
        
        # Generate score and feedback
        code_quality_score = max_points * 0.4  # 40% for code quality
        implementation_score = max_points * 0.4  # 40% for implementation
        testing_score = max_points * 0.2  # 20% for testing
        
        # Adjust scores based on specific criteria
        if not has_implementation:
            implementation_score = 0
            code_quality_score *= 0.5
        
        if not content['test_cases']:
            testing_score = 0
        
        task_score = code_quality_score + implementation_score + testing_score
        
        # Store results
        grading_results[task] = {
            'score': task_score,
            'max_points': max_points,
            'analysis': analysis,
            'code_quality_score': code_quality_score,
            'implementation_score': implementation_score,
            'testing_score': testing_score,
            'has_implementation': has_implementation
        }
        
        
        total_score += task_score
        
    return grading_results

def save_grading_results_to_pdf_reportlab(grading_results, student_id="Anonymous"):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=0.75 * inch,
                            leftMargin=0.75 * inch,
                            topMargin=1 * inch,
                            bottomMargin=1 * inch)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="CenteredHeading", fontSize=16, alignment=TA_CENTER, spaceAfter=12, fontName="Helvetica-Bold"))
    styles.add(ParagraphStyle(name="TaskTitle", fontSize=14, spaceBefore=12, fontName="Helvetica-Bold"))
    styles.add(ParagraphStyle(name="ScoreText", fontSize=12, fontName="Helvetica"))
    styles.add(ParagraphStyle(name="FeedbackText", fontSize=11, leading=14, alignment=TA_LEFT))

    elements = []

    elements.append(Paragraph(f"Grading Results - {student_id}", styles["CenteredHeading"]))

    total_score = 0
    total_possible = 0

    for task, result in grading_results.items():
        total_score += result['score']
        total_possible += result['max_points']

        elements.append(Paragraph(task, styles["TaskTitle"]))
        elements.append(Paragraph(f"Score: {result['score']:.1f} / {result['max_points']}", styles["ScoreText"]))
        elements.append(Paragraph(f"• Code Quality: {result['code_quality_score']:.1f} / {result['max_points'] * 0.4:.1f}", styles["ScoreText"]))
        elements.append(Paragraph(f"• Implementation: {result['implementation_score']:.1f} / {result['max_points'] * 0.4:.1f}", styles["ScoreText"]))
        elements.append(Paragraph(f"• Testing: {result['testing_score']:.1f} / {result['max_points'] * 0.2:.1f}", styles["ScoreText"]))

        deductions = []
        if result['code_quality_score'] < (result['max_points'] * 0.4):
            deduction = (result['max_points'] * 0.4) - result['code_quality_score']
            deductions.append(f"Code Quality (-{deduction:.1f}): Needs improvement in organization/readability")
        if result['implementation_score'] < (result['max_points'] * 0.4):
            deduction = (result['max_points'] * 0.4) - result['implementation_score']
            deductions.append(f"Implementation (-{deduction:.1f}): Incomplete or incorrect implementation")
        if result['testing_score'] < (result['max_points'] * 0.2):
            deduction = (result['max_points'] * 0.2) - result['testing_score']
            deductions.append(f"Testing (-{deduction:.1f}): Missing or insufficient test cases")

        if deductions:
            elements.append(Paragraph("Points Deducted:", styles["ScoreText"]))
            for d in deductions:
                elements.append(Paragraph(f"- {d}", styles["FeedbackText"]))

        if 'analysis' in result and result['analysis']:
            elements.append(Paragraph("Grading Justification:", styles["ScoreText"]))
            for line in result['analysis'].split('\n'):
                elements.append(Paragraph(line.strip(), styles["FeedbackText"]))

        elements.append(Spacer(1, 0.3 * inch))

    percentage = (total_score / total_possible) * 100 if total_possible > 0 else 0
    elements.append(Paragraph(f"Final Grade: {total_score:.1f} / {total_possible} ({percentage:.1f}%)", styles["TaskTitle"]))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()

