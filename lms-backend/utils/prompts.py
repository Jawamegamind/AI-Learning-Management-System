def getmetaprompt(raw_prompt, context,option):
    if option == 'assignment':
        return f"""
            You are an expert assignment designer for programming and coding assignments covering various domains like fullstack development and data science / AI in Python.

            Given the raw input prompt: "{raw_prompt}", and the following context from course materials:

            === Context ===
            {context}
            === End Context ===

            Determine if this is a valid topic on which a detailed assignment can be made. Use the context to inform the assignment's scope, examples, or specific requirements (e.g., datasets, models, or techniques mentioned).

            If valid, expand it into a structured assignment plan with sections like:
            1. Introduction / Background
            2. Task 1: Coding-based problem
            3. Task 2: Analytical comparison
            4. Expected output formats

            Clearly mention sub-topics to cover, model types, variations, etc., incorporating relevant details from the context.

            If it's a nonsense or fake prompt or if you are unsure and not confident about the prompt, respond with: "Invalid prompt: [reason]".

            Respond ONLY with the structured assignment plan or invalid message.
        """
    else:
        return  f"""
            You are an expert educational content creator specializing in designing conceptual quizzes to test theoretical understanding in subjects like machine learning, AI, data science, and fullstack development.

            Given the raw input topic: "{raw_prompt}", and the following context from course materials:

            === Context ===
            {context}
            === End Context ===

            Determine whether this is a valid and meaningful topic for a conceptual quiz. If valid, generate a quiz that includes:

            1. 3–5 Multiple Choice Questions (MCQs) — clearly indicate the correct answer with reasoning.
            2. 2–3 True/False questions — also justify each answer briefly.
            3. 4-5 Short Answer or Reasoning-based questions — prompt students to explain concepts or compare ideas in 1–3 sentences.

            Ensure the quiz focuses on **core concepts**, **theory**, and **understanding**, not implementation or coding.

            Use the context provided to guide the level of difficulty, terminology, and topics. If the prompt is invalid or nonsensical, respond with: "Invalid prompt: [reason]".

            Respond ONLY with the generated quiz or invalid message.
        """


def getgenerationprompt(prompt, option):
    if option == 'assignment':
        return f"""
            You are an AI assignment generator. Convert the following structured prompt into a markdown-based programming assignment.

            For each coding task:
            - Use markdown to describe the task.
            - Add appropriate Python code cells with TODO brackets.
            - Import necessary libraries.
            - Initialize basic models or datasets.
            - Ensure logical progression (with NO OVERLAP) from task to task.

            Prompt:
            {prompt}

            Return the assignment in plain text with clear separation between markdown and code blocks.
            ALWAYS enclose code blocks starting with <```python> format and ending in <```> format.
        """
    else:
        return f"""
            You are an AI quiz generator. Convert the following structured quiz plan into a well-formatted, text-based quiz aimed at testing theoretical understanding of the topic.

            Prompt:
            {prompt}

            Generate the quiz with the following format:
            1. **Multiple Choice Questions (MCQs)**
               - List 3–5 MCQs.
               - Use clear formatting (e.g., A, B, C, D).
               - These should test **practical and theoretical understanding** of the ideas and should be MEDIUM difficulty.

            2. **True/False Questions**
               - List 2–3 T/F questions.
               - These should test **factual knowledge** of the ideas and should be MEDIUM difficulty.

            3. **Reasoning-Based or Short Answer Questions**
               - Ask 4–5 conceptual or comparative / analytical questions.
               - These should test **theoretical understanding** of the concepts and should be HARD difficulty

            Ensure questions are concept-focused and avoid code-level implementation unless it's conceptual (e.g., algorithm behavior, model choices, complexity tradeoffs).

            DO NOT write the answers for any question of the quiz, it SHOULD BE UNSOLVED.

            Anything you want to be HIGHLIGHTED in the final file should be enclosed within 3 asterisks, example: ***MCQs***

            DO NOT unnecessarily include other symbols in your text like double asterisks ** or ## signs etc. Only for formatting, use triple asterisks.

            Return the quiz in plain text and write according to the instructions above.
        """

def getgenerationwithfeedbackprompt(assignment, feedback_prompt):
    return f"""
        You are editing and regenerating a programming assignment.
        DO NOT write anything else (your thought process) other than the updated assignment in final answer, just return the assignment.
        The assignment content is below:
        =====================
        {assignment}
        =====================

        RECONSIDER it STRICTLY based on the following feedback given, and then comprehensively regenerate the assignment,
        editing only the relevant portions such that the following feedback is incorporated thoroughly.
        If it needs a complete revision, then please follow through with it. DO NOT change the content unless specified in the feedback.

        **Feedback**:
        {feedback_prompt}

         At the end, ONLY return the updated assignment in plain text with clear separation between markdown and code blocks.
         ALWAYS enclose code blocks starting with <```python> format and ending in <```> format.
    """


def getverificationprompt(assignment, feedback_prompt):
    return f"""
        You are reviewing a programming assignment. The assignment content is below:
        =====================
        {assignment}
        =====================

        EVALUATE it STRICTLY based on the following criteria. Assign a score out of 10 for each and justify with 1-2 sentences.

        For each criterion, do the following:
        1. Give a score out of 10.
        2. Justify the score with 1-2 sentences.

        1. **Clarity and Completeness**:
          - Does the prompt clearly explain each task's objective and context?
          - Are all terms and technical jargon explained briefly or linked with external references?
          - Does it clearly state which frameworks / libraries / models the student is expected to use?

        2. **Boilerplate & Setup Code**:
          - Does it import and/or install the required libraries?
          - Does it include boilerplate setup code like loading a model or writing classes with init functions?
          - Are models, datasets, utility functions initialized or setup so students can jump to the main logic?

        3. **Code Quality & TODOs**:
          - Are TODOs specific, technical, and meaningful?
          - Do they isolate complex logic while keeping reusable code provided?
          - Is there an outline of the entire pipeline: preprocessing, pruning, retraining, evaluation, reporting?

        4. **Task Redundancy / Overlap**:
          - Tasks should be distinct and may be divided into subtasks if complex.
          - Avoid repetition and ensure flow and progression in learning.

        5. **Formatting**:
          - Are code blocks correctly formatted with "```python" and not raw Jupyter magic?

        6. **Feedback Incorporation**:
          {feedback_prompt}

         At the end, write the following in one line ... [[[REVIEW_SCHEME]]] = {{ 'clarity': CLARITY_SCORE, 'boilerplate': BOILERPLATE_SCORE, 'todo': TODO_SCORE, 'overlap': OVERLAP_SCORE, 'formatting': FORMATTING_SCORE, 'feedback': FEEDBACK_SCORE }}
    """

def getquizverificationprompt(quiz, feedback_prompt):
    return f"""
        You are reviewing a quiz designed to assess students' theoretical understanding and practical application of topics taught in class. The quiz content is below:
        =====================
        {quiz}
        =====================

        EVALUATE it STRICTLY based on the following criteria. Assign a score out of 10 for each and justify with 1-2 sentences.

        For each criterion, do the following:
        1. Give a score out of 10.
        2. Justify the score with 1-2 sentences.

        1. **Clarity and Relevance**:
          - Are the questions clearly worded and free from ambiguity?
          - Are they appropriate for the level of the course and relevant to topics taught?
          - Do they reflect the expected knowledge and skill level of students?

        2. **Coverage of Concepts**:
          - Does the quiz cover a diverse and representative set of concepts taught?
          - Are both theoretical and practical aspects of the topic included?
          - Does it balance breadth and depth appropriately?

        3. **Question Quality and Structure**:
          - Are MCQs structured well with plausible distractors?
          - Are True/False statements precise and unambiguous?
          - Are short/medium questions open-ended enough to assess understanding, but focused enough to guide students?

        4. **Cognitive Depth and Usefulness**:
          - Do questions vary in difficulty and promote higher-order thinking (not just recall)?
          - Are there any case-based or real-world application questions?
          - Does it test understanding, analysis, and application?

        5. **Task Redundancy / Overlap**:
          - Tasks should be distinct and may be divided into subtasks if complex.
          - Avoid repetition and ensure flow and progression in learning.

        6. **Feedback Incorporation**:
          {feedback_prompt}

         At the end, write the following in one line ... [[[REVIEW_SCHEME]]] = {{ 'clarity': CLARITY_SCORE, 'coverage': COVERAGE_SCORE, 'structure': STRUCTURE_SCORE, 'overlap': OVERLAP_SCORE, 'depth': DEPTH_SCORE, 'feedback': FEEDBACK_SCORE }}
    """

def getragoptimizationprompt():
  return """
    You are an expert in information retrieval and vector-based semantic search.

    Your job is to take a **messy, human-authored prompt** and extract from it a **precise, minimal query** that will retrieve only the most **relevant context** for solving the assignment.

    Focus on **what information is actually needed** to perform the task (definitions, algorithms, math, code examples, etc). Strip away instructional text, formatting details, and conversational fluff.

    You MUST:
    - Use exact technical phrasing when possible
    - Retain any important entities (e.g., "ResNet", "variational autoencoder", "KL divergence")
    - Avoid vague filler like "please", "as a student", "write an assignment"
    - Output a single sentence or question optimized for retrieval

    Example:

    Input:
    You are a TA for a course on transformers. Write an assignment where students have to implement multi-head attention from scratch, evaluate it on a toy dataset, and compare it with a PyTorch version.

    Optimized Query:
    Multi-head attention implementation and evaluation compared to PyTorch version

    Respond ONLY with the optimized query.
  """

# used to calculate final score during the verification stage / feedback loop
COMPONENT_WEIGHTAGES = {
        'clarity': 0.05,
        'boilerplate': 0.25,
        'todo': 0.25,
        'overlap': 0.1,
        'formatting': 0.05,
        'feedback': 0.3
}

QUIZ_COMPONENT_WEIGHTAGES = {
        'clarity': 0.15,
        'coverage': 0.2,
        'structure': 0.05,
        'depth': 0.2,
        'overlap': 0.1,
        'feedback': 0.3
}