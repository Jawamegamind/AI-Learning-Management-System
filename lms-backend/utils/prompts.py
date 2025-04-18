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
            3. 1–2 Short Answer or Reasoning-based questions — prompt students to explain concepts or compare ideas in 1–3 sentences.

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
               - Ask 3–4 conceptual or comparative / analytical questions.
               - These should test **theoretical understanding** of the concepts and should be HARD difficulty

            Ensure questions are concept-focused and avoid code-level implementation unless it's conceptual (e.g., algorithm behavior, model choices, complexity tradeoffs).

            Anything you want to be HIGHLIGHTED in the final file should be enclosed within 3 asterisks, example: ***MCQs***

            DO NOT unnecessarily include other symbols in your text like double asterisks ** or ## signs etc. Only for formatting, use triple asterisks.

            Return the quiz in plain text and write according to the instructions above.
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



# used to calculate final score during the verification stage / feedback loop
COMPONENT_WEIGHTAGES = {
        'clarity': 0.05,
        'boilerplate': 0.25,
        'todo': 0.25,
        'overlap': 0.1,
        'formatting': 0.05,
        'feedback': 0.3
}