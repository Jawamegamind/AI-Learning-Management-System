import re
import ast
import json
import base64
import nbformat
from io import BytesIO
from openai import OpenAI
from reportlab.pdfgen import canvas
from typing import List, Optional
from database.retriever import Retriever
from reportlab.lib.pagesizes import LETTER
from langgraph.graph import StateGraph, START, END
from sentence_transformers import SentenceTransformer
from models.generation_model import AssignmentState, PracticeQAState
from nbformat.v4 import new_notebook, new_code_cell, new_markdown_cell
from .prompts import getmetaprompt, getgenerationprompt, getquizverificationprompt, getgenerationwithfeedbackprompt, getragoptimizationprompt, QUIZ_COMPONENT_WEIGHTAGES

# Initialize embedding model
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
        print("Completion choice Finish Reason", completion.choices[0].finish_reason)
        return completion.choices[0].message.content
    except Exception as e:
        print("api call to llm error", completion.error['message'])
        return ""

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

    score = sum(scores_dict[k] * v for k, v in QUIZ_COMPONENT_WEIGHTAGES.items())
    return score * 10

def extract_notebook_from_json(json_notebook_str):
    json_notebook = json.loads(json_notebook_str)
    cells = json_notebook.get("cells", [])
    extracted_parts = []

    for cell in cells:
        if cell["cell_type"] == "markdown":
            markdown_text = "".join(cell.get("source", []))
            extracted_parts.append(f"# Markdown Cell\n{markdown_text.strip()}\n")
        elif cell["cell_type"] == "code":
            code_text = "".join(cell.get("source", []))
            extracted_parts.append(f"# Code Cell\n{code_text.strip()}\n")

    return "\n".join(extracted_parts).strip()

def retrieval_node(state: AssignmentState, api_key: str) -> AssignmentState:
    raw_prompt = state['input_content']
    rag_query_optimization_system_prompt = getragoptimizationprompt()
    optimization_prompt = f"{rag_query_optimization_system_prompt}\n\nInput:\n{raw_prompt}\n\nOptimized Query:"
    optimized_query = query_openrouter(optimization_prompt, api_key)
    print("Optimized Query:", optimized_query)
    return {**state, "optimized_query": optimized_query}

def metaprompt_node(state: AssignmentState, api_key: str) -> AssignmentState:
    raw_prompt = state['input_content']
    optimized_query = state.get('optimized_query', raw_prompt)  # Fallback to raw_prompt if optimized_query is missing
    urls = state.get('urls', None)

    # Initialize retriever
    retriever = Retriever()

    # Generate embedding for optimized_query
    query_embedding = embedding_model.encode(optimized_query).tolist()

    # Fetch context using retriever
    context = ""
    try:
        if urls:
            # Get document IDs from URLs
            relevant_doc_ids = retriever.get_document_ids_by_urls(urls)
            if relevant_doc_ids:
                # Use filtered hybrid search to get relevant chunks
                results = retriever.filtered_hybrid_search(
                    query_text=optimized_query,
                    query_embedding=query_embedding,
                    relevant_doc_ids=relevant_doc_ids,
                    limit_rows= 10
                )
                if len(results) == 0:
                    print("no relevant chunk found from the docs")
                else:
                    print("relevant chunks found from docs")
                    safe_results = [
                       r[1].encode('utf-8', errors='replace').decode('utf-8')
                        for r in results
                    ]
                    print(safe_results)
                # Format context from results (id, content, embedding_id, similarity)
                context = "\n".join(safe_results)
            else:
                context = "No documents found for provided URLs."
        else:
            # Use hybrid search for general context
            results = retriever.hybrid_search(
                query_text=optimized_query,
                query_embedding=query_embedding,
                limit_rows= 10
            )
            safe_results = [
                        r[1].encode('utf-8', errors='replace').decode('utf-8')
                        for r in results
                    ]
            context = "\n".join(safe_results)
        if not context:
            context = "No relevant documents found."
        with open('retrieval_output.txt', 'a', encoding='utf-8') as f:
            f.write(f"--- New Retrieval ---\n")
            f.write(f"Optimized Query: {optimized_query}\n")
            f.write(f"Context:\n{context}\n")
            f.write(f"--- End Retrieval ---\n")


    except Exception as e:
        print(f"Retriever error: {e}")
        context = "Failed to retrieve context."

    # Augment metaprompt with retrieved context, using raw_prompt
    print("metaprompt node call", state['option'])
    metaprompt = getmetaprompt(raw_prompt, context, state['option'])
    output = query_openrouter(metaprompt, api_key)
    print("[METAPROMPT]========", output)
    if output.lower().startswith("invalid prompt"):
        return {**state, "assignment": output, "status": "failed"}
    return {**state, "assignment": output, "status": "pending", "attempts": 0}

def generate_assignment_node(state: AssignmentState, api_key: str) -> AssignmentState:
    prompt = state["assignment"]
    feedback = state['human_feedback']
    if feedback == '':
        gen_prompt = getgenerationprompt(prompt, state['option'])
        assignment = query_openrouter(gen_prompt, api_key)
    else:
        assignment_prev_version = extract_notebook_from_json(state['assignment_prev_version'])
        gen_wfeedback_prompt = getgenerationwithfeedbackprompt(assignment_prev_version, feedback)
        assignment = query_openrouter(gen_wfeedback_prompt, api_key)

    state["assignment"] = assignment
    print("[ASSIGNMENT]========", assignment)
    return {**state, "assignment": assignment}

def verify_assignment_node(state: AssignmentState, api_key: str) -> AssignmentState:
    # if state['option'] == 'quiz':
    #     return {**state, "status": "verified"}
    if state['option'] == 'assignment':
        state["status"] = "awaiting_feedback"
        return {**state, "status": "awaiting_feedback"}

    feedback_prompt = "This is the first draft so give full marks (10/10)" if state['feedback'] == "" else f"Feedback: {state['feedback']}. If the given feedback has NOT been FULLY incorporated, PENALIZE HARSHLY."
    print("######################################feedback_prompt", feedback_prompt)
    # critique_prompt = getverificationprompt(state['assignment'], feedback_prompt)
    critique_prompt = getquizverificationprompt(state['assignment'], feedback_prompt)
    review = query_openrouter(critique_prompt, api_key)
    state['feedback'] = review
    score = extract_score(review)
    print('Last 3 Scores', state['scores'])
    print("New Score:", score, "@ Attempt", state['attempts'])
    print("Review:", review)
    not_improving = len(state['scores']) >= 3 and state['scores'][-1] == state['scores'][-2] == state['scores'][-3]
    state['scores'].append(score)

    if score >= 90.0 or state['attempts'] >= 5 or not_improving:
        return {**state, "status": "verified"}

    return {**state, "status": "pending", "attempts": state["attempts"] + 1}

def convert_to_notebook_node(state: AssignmentState) -> AssignmentState:
    print("converting assignment to notebook")
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
    return {**state, "status": "awaiting_feedback", "assignment": notebook_json}

def convert_to_pdf_node(state: AssignmentState) -> AssignmentState:
    print("converting quiz to pdf")
    try:
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=LETTER)
        width, height = LETTER
        x_margin = 50
        y_position = height - 50
        line_height = 14

        lines = state['assignment'].splitlines()

        for line in lines:
            if line.strip() == "":
                y_position -= line_height
                continue

            # Break line into styled segments
            segments = re.split(r'(\*\*\*.*?\*\*\*)', line)
            styled_segments = []
            for seg in segments:
                if seg.startswith('***') and seg.endswith('***'):
                    styled_segments.append((seg[3:-3], "Helvetica-Bold"))
                else:
                    styled_segments.append((seg, "Helvetica"))

            current_x = x_margin
            for text, font in styled_segments:
                words = text.split(' ')
                for word in words:
                    word_width = c.stringWidth(word + ' ', font, 11)

                    # Wrap to next line if necessary
                    if current_x + word_width > width - x_margin:
                        y_position -= line_height
                        if y_position < 50:
                            c.showPage()
                            y_position = height - 50
                        current_x = x_margin

                    c.setFont(font, 11)
                    c.drawString(current_x, y_position, word + ' ')
                    current_x += word_width

            y_position -= line_height
            if y_position < 50:
                c.showPage()
                y_position = height - 50

        c.save()
        buffer.seek(0)
        pdf_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    except Exception as e:
        print("error while generating pdf from text",e)
    return {**state, "status": "complete", "assignment": pdf_base64}

# def wait_for_human_feedback(state):
#     print("waiting for feedback")
#     state["status"] = "awaiting_feedback"
#     return state


def generate_assignment_workflow(input_content: str, openrouter_api_key: str, assignmentorquiz: str, human_feedback:str, prev_version:str,  urls: Optional[List[str]] = None) -> dict:
    workflow = StateGraph(AssignmentState)

    # Nodes
    workflow.add_node("retrieval", lambda s: retrieval_node(s, openrouter_api_key))
    workflow.add_node("metaprompt", lambda s: metaprompt_node(s, openrouter_api_key))
    workflow.add_node("generate_assignment", lambda s: generate_assignment_node(s, openrouter_api_key))
    workflow.add_node("verify_assignment", lambda s: verify_assignment_node(s, openrouter_api_key))
    workflow.add_node("convert_to_notebook", convert_to_notebook_node)
    workflow.add_node("convert_to_pdf", convert_to_pdf_node)
    # workflow.add_node("human_feedback", wait_for_human_feedback)


    # Edges
    # workflow.add_edge(START, "retrieval")
    workflow.add_conditional_edges(START, lambda state: "retrieval" if state.get("human_feedback", "") == "" else "generate_assignment", {
        "retrieval": "retrieval",
        "generate_assignment": "generate_assignment",
    })
    workflow.add_edge("retrieval", "metaprompt")
    workflow.add_conditional_edges("metaprompt", lambda s: s["status"], {
        "failed": END,
        "pending": "generate_assignment"
    })
    workflow.add_edge("generate_assignment", "verify_assignment")

    # Conditional routing after verification
    def handle_verified_routing(state):
        if state["status"] == "verified":
            return "convert_to_notebook" if state["option"] == "assignment" else "convert_to_pdf"
        elif state["status"] == "pending":
            return "generate_assignment"
            # return "generate_assignment" if state["option"] == "quiz" else "human_feedback"
        elif state["status"] == "awaiting_feedback":
            return "convert_to_notebook"
        else:
            print("should-never-enter-this-part-of-workflow")
            return END

    workflow.add_conditional_edges("verify_assignment", handle_verified_routing, {
        "convert_to_notebook": "convert_to_notebook",
        "convert_to_pdf": "convert_to_pdf",
        "generate_assignment": "generate_assignment",
        # "human_feedback" : "human_feedback"
    })

    workflow.add_edge("convert_to_notebook", END)
    workflow.add_edge("convert_to_pdf", END)

    graph = workflow.compile()
    initial_state = {
        "input_content": input_content,
        "assignment": "",   #stores either assignment or quiz depending on api call
        "feedback": "",
        "status": "pending",
        "attempts": 0,
        "urls": urls,
        "option": assignmentorquiz,
        "scores": [],
        "optimized_query": "",
        "human_feedback" : human_feedback,
        "assignment_prev_version" : prev_version
    }

    # Generate Mermaid diagram
    try:
        mermaid_code = graph.get_graph().draw_mermaid()
        with open("workflow_graph.mmd", "w", encoding="utf-8") as f:
            f.write(mermaid_code)
        print("Mermaid diagram saved as workflow_graph.mmd")
        print("Render it at: https://mermaid.live/")
        # print("\nMermaid Code:\n")
        # print(mermaid_code)
    except Exception as e:
        print(f"Failed to generate Mermaid diagram: {e}")

    return graph.invoke(initial_state)











############ functions for generate practice Q/As workflow ####################



def extract_prompt_node(state: PracticeQAState, api_key: str) -> dict:

    raw_prompt = state['input_content']
    optimized_query = state.get('optimized_query', raw_prompt)  # Fallback to raw_prompt if optimized_query is missing
    urls = state.get('urls', None)

    # Initialize retriever
    retriever = Retriever()

    # Generate embedding for optimized_query
    query_embedding = embedding_model.encode(optimized_query).tolist()

    # Fetch context using retriever
    context = ""
    try:
        if urls:
            # Get document IDs from URLs
            relevant_doc_ids = retriever.get_document_ids_by_urls(urls)
            if relevant_doc_ids:
                # Use filtered hybrid search to get relevant chunks
                results = retriever.filtered_hybrid_search(
                    query_text=optimized_query,
                    query_embedding=query_embedding,
                    relevant_doc_ids=relevant_doc_ids,
                    limit_rows= 10
                )
                if len(results) == 0:
                    print("no relevant chunk found from the docs")
                else:
                    print("relevant chunks found from docs")
                    safe_results = [
                       r[1].encode('utf-8', errors='replace').decode('utf-8')
                        for r in results
                    ]
                    print(safe_results)
                # Format context from results (id, content, embedding_id, similarity)
                context = "\n".join(safe_results)
            else:
                context = "No documents found for provided URLs."
        else:
            # Use hybrid search for general context
            results = retriever.hybrid_search(
                query_text=optimized_query,
                query_embedding=query_embedding,
                limit_rows= 10
            )
            safe_results = [
                        r[1].encode('utf-8', errors='replace').decode('utf-8')
                        for r in results
                    ]
            context = "\n".join(safe_results)
        if not context:
            context = "No relevant documents found."
        with open('retrieval_output.txt', 'a', encoding='utf-8') as f:
            f.write(f"--- New Retrieval ---\n")
            f.write(f"Optimized Query: {optimized_query}\n")
            f.write(f"Context:\n{context}\n")
            f.write(f"--- End Retrieval ---\n")


    except Exception as e:
        print(f"Retriever error: {e}")
        context = "Failed to retrieve context."

    # Augment metaprompt with retrieved context, using raw_prompt
    print("metaprompt node call for practice Q/As")
    metaprompt = getmetaprompt(raw_prompt, context, 'practice')
    # print("metaprompt ....",metaprompt)
    output = query_openrouter(metaprompt, api_key)
    print("[METAPROMPT]========", output)
    if output.lower().startswith("invalid prompt"):
        return {**state, "practiceqas": output, "status": "invalid"}
    return {**state, "practiceqas": output, "status": "valid"}


def retrieval_qa_node(state: PracticeQAState, api_key: str) -> PracticeQAState:
    raw_prompt = state['input_content']
    rag_query_optimization_system_prompt = getragoptimizationprompt()
    optimization_prompt = f"{rag_query_optimization_system_prompt}\n\nInput:\n{raw_prompt}\n\nOptimized Query:"
    optimized_query = query_openrouter(optimization_prompt, api_key)
    print("Optimized Query:", optimized_query)
    return {**state, "optimized_query": optimized_query}


def generate_practice_qa_node(state: PracticeQAState, api_key: str) -> dict:
    print("gen----")
    prompt = state["practiceqas"]
    print("FINALPROMPT-FOR-PRACTICE-QA",prompt)
    gen_prompt = getgenerationprompt(prompt, 'practice')
    gen_prompt += f' All the generated questions MUST meet this difficulty level: {state["difficulty"].upper()}.'
    print(gen_prompt)
    result = query_openrouter(gen_prompt, api_key)

    state["practiceqas"] = result
    print("[PRACTICE-Q-A-s]========", result)
    return {**state, "practiceqas": result}

def generate_practice_qa_workflow(input_content: str, openrouter_api_key: str, difficulty: str, urls: Optional[List[str]] = None) -> dict:
    workflow = StateGraph(PracticeQAState)

    # Nodes
    workflow.add_node("extract_contextualized_prompt", lambda s: extract_prompt_node(s, openrouter_api_key))
    workflow.add_node("retrieval", lambda s: retrieval_qa_node(s, openrouter_api_key))
    workflow.add_node("generate_qa", lambda s: generate_practice_qa_node(s, openrouter_api_key))

    is_lec_urls = urls is not None and len(urls) > 0

    # Edges
    workflow.add_edge(START, "extract_contextualized_prompt")
    workflow.add_conditional_edges("extract_contextualized_prompt", lambda s: s["status"], {
        "invalid": END,
        "valid": "retrieval" if is_lec_urls else "generate_qa"
    })

    if is_lec_urls:
        workflow.add_edge("retrieval", "generate_qa")

    workflow.add_edge("generate_qa", END)

    graph = workflow.compile()

    initial_state = {
        "input_content": input_content,
        "urls": urls,
        "difficulty": difficulty,
        "topics": [],
        "status": "pending",
        "optimized_query" : "",
        "practiceqas": ""
    }

    # try:
    #     mermaid_code = graph.get_graph().draw_mermaid()
    #     with open("practice_qa_graph.mmd", "w", encoding="utf-8") as f:
    #         f.write(mermaid_code)
    #     print("Mermaid diagram saved as practice_qa_graph.mmd")
    #     print("Render it at: https://mermaid.live/")
    # except Exception as e:
    #     print(f"Failed to generate Mermaid diagram: {e}")

    return graph.invoke(initial_state)

