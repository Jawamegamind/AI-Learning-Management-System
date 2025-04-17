import re
import ast
import json
import nbformat
from openai import OpenAI
from typing import List, Optional
from database.retriever import Retriever
from langgraph.graph import StateGraph, START, END
from sentence_transformers import SentenceTransformer
from models.generation_model import AssignmentState
from nbformat.v4 import new_notebook, new_code_cell, new_markdown_cell


# Initialize embedding model (adjust model as needed)
embedding_model = SentenceTransformer('thenlper/gte-base')

def query_openrouter(prompt: str, api_key: str, max_length: int = 500, model: str = "meta-llama/llama-4-maverick:free") -> str:
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key
    )
    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}]
    )
    try:
      print("Completion choice Finish Reason",completion.choices[0].finish_reason)
      return completion.choices[0].message.content
    except Exception as e:
      print("api call to llm error", completion.error['message'])
      return ""
    # return completion.choices[0].message.content

def extract_score(text: str) -> float:
    matchh = re.search(r"\[\[\[REVIEW_SCHEME\]\]\] = (\{.*\})", text)
    if not matchh:
        print("No scores dictionary found.")
        return 0.0
    scores_str = matchh.group(1)
    try:
        scores_dict = ast.literal_eval(scores_str)
    except Exception as e:
        print(f"Failed to parse scores dict: {e}")
        return 0.0
    weightages = {
        'clarity': 0.05,
        'boilerplate': 0.25,
        'todo': 0.25,
        'overlap': 0.1,
        'formatting': 0.05,
        'feedback': 0.3
    }
    score = sum(scores_dict[k] * v for k, v in weightages.items())
    return score * 10

def metaprompt_node(state: AssignmentState, api_key: str) -> AssignmentState:
    raw_prompt = state['input_content']
    urls = state.get('urls', None)

    # Initialize retriever
    retriever = Retriever()

    # Generate embedding for input_content
    query_embedding = embedding_model.encode(raw_prompt).tolist()

    # Fetch context using retriever
    context = ""
    try:
        if urls:
            # Get document IDs from URLs
            relevant_doc_ids = retriever.get_document_ids_by_urls(urls)
            if relevant_doc_ids:
                # Use filtered hybrid search to get relevant chunks
                results = retriever.filtered_search(
                    query_embedding=query_embedding,
                    relevant_doc_ids=relevant_doc_ids,
                    limit_rows=5  # Limit to avoid overwhelming prompt
                )
                if len(results)==0:
                  print("no relevant chunk found from the docs")
                else:
                  print("relevant chunks found from docs")
                  print(results)
                # Format context from results (id, content, embedding_id, similarity)
                context = "\n".join([
                    f"Document Chunk (Similarity: {r['similarity']:.2f}): {r['content']}"
                    for r in results
                ])
            else:
                context = "No documents found for provided URLs."
        else:
            # Use hybrid search for general context
            results = retriever.hybrid_search(
                query_text=raw_prompt,
                query_embedding=query_embedding,
                limit_rows=5
            )
            print("no-url-res",results)
            context = "\n".join([
                f"Document Chunk (Similarity: {r[3]:.2f}): {r[1]}"
                for r in results
            ])
        if not context:
            context = "No relevant documents found."
    except Exception as e:
        print(f"Retriever error: {e}")
        context = "Failed to retrieve context."

    # Augment metaprompt with retrieved context
    metaprompt = f"""
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
    output = query_openrouter(metaprompt, api_key)
    print("[METAPROMPT]========",output)
    if output.lower().startswith("invalid prompt"):
        return {**state, "assignment": output, "status": "failed"}
    return {**state, "assignment": output, "status": "pending", "attempts": 0}

def generate_assignment_node(state: AssignmentState, api_key: str) -> AssignmentState:
    prompt = state["assignment"]
    gen_prompt = f"""
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
    assignment = query_openrouter(gen_prompt, api_key)
    state["assignment"] = assignment
    print("[ASSIGNMENT]========",assignment)
    return {**state, "assignment": assignment}

def verify_assignment_node(state: AssignmentState, api_key: str) -> AssignmentState:
    feedback_prompt = "This is the first draft so give full marks (10/10)" if state['feedback'] == "" else f"Feedback: {state['feedback']}. If the given feedback has NOT been FULLY incorporated, PENALIZE HARSHLY."
    print("######################################feedback_prompt",feedback_prompt)
    critique_prompt = f"""
        You are reviewing a programming assignment. The assignment content is below:
        =====================
        {state['assignment']}
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
    review = query_openrouter(critique_prompt, api_key)
    state['feedback'] = review
    score = extract_score(review)
    print("Score:", score, "attempt", state['attempts'])
    print("Review:", review)

    if score >= 90.0 or state['attempts'] >=5 :
        return {**state, "status": "verified"}
    return {**state, "status": "pending", "attempts": state["attempts"] + 1}

def convert_to_notebook_node(state: AssignmentState) -> AssignmentState:
    text = state["assignment"]
    cells = []
    lines = text.split("\n")
    is_code = False
    buffer = []

    for line in lines:
        if line.strip().startswith("```python"):
            if buffer:
                cells.append(new_markdown_cell("\n".join(buffer)))
                buffer = []
            is_code = True
        elif line.strip().startswith("```") and is_code:
            cells.append(new_code_cell("\n".join(buffer)))
            buffer = []
            is_code = False
        else:
            buffer.append(line)

    if buffer:
        if is_code:
            cells.append(new_code_cell("\n".join(buffer)))
        else:
            cells.append(new_markdown_cell("\n".join(buffer)))

    notebook = new_notebook(cells=cells)
    notebook_json_str = nbformat.writes(notebook)
    notebook_json = json.loads(notebook_json_str)
    return {**state, "status": "complete", "assignment": notebook_json}

def generate_assignment_workflow(input_content: str, openrouter_api_key: str, assignmentorquiz: str, urls: Optional[List[str]] = None) -> dict:
    workflow = StateGraph(AssignmentState)
    workflow.add_node("metaprompt", lambda s: metaprompt_node(s, openrouter_api_key))
    workflow.add_node("generate_assignment", lambda s: generate_assignment_node(s, openrouter_api_key))
    workflow.add_node("verify_assignment", lambda s: verify_assignment_node(s, openrouter_api_key))
    workflow.add_node("convert_to_notebook", convert_to_notebook_node)
    workflow.add_edge(START, "metaprompt")
    workflow.add_conditional_edges("metaprompt", lambda s: s["status"], {
        "failed": END,
        "pending": "generate_assignment"
    })
    workflow.add_edge("generate_assignment", "verify_assignment")
    workflow.add_conditional_edges("verify_assignment", lambda s: s["status"], {
        "verified": "convert_to_notebook",
        "pending": "generate_assignment"
    })
    workflow.add_edge("convert_to_notebook", END)
    graph = workflow.compile()
    initial_state = {
        "input_content": input_content,
        "assignment": "",
        "feedback": "",
        "status": "pending",
        "attempts": 0,
        "urls": urls,
        "option":assignmentorquiz
    }
    return graph.invoke(initial_state)