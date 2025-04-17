from fastapi import APIRouter, HTTPException
from database.retriever import Retriever
from typing import List, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
import os
from models.assignment_generation_model import generate_assignment_workflow
from pydantic import BaseModel
from typing import List

generation_router = APIRouter()
retriever = Retriever()


class AssignmentRequest(BaseModel):
    prompt: str
    lecture_urls: List[str]

class QuizRequest(BaseModel):
    prompt: str
    lecture_urls: List[str]

@generation_router.post("/generate-assignment")
async def generate_assignment(request: AssignmentRequest):
    try:
        result = generate_assignment_workflow(
            input_content=request.prompt,
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY"),
            urls=request.lecture_urls
        )

        if result["status"] == "failed":
            raise HTTPException(status_code=400, detail=result["assignment"])

        return {
            "status": "success",
            "assignment": result["assignment"]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate assignment: {str(e)}"
        )


@generation_router.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):
    """
    Generate a quiz based on the prompt and lecture materials.
    """
    try:
        # TODO: Add your LLM call here to generate the quiz
        # For now, return a placeholder response
        return {
            "status": "success",
            "quiz": {
                "title": "Generated Quiz",
                "description": "This is a placeholder for the generated quiz",
                "questions": [
                    {
                        "question": "Sample question 1?",
                        "options": ["A", "B", "C", "D"],
                        "correct_answer": "A"
                    }
                ],
                "context_used": "..."  # First 500 chars of context
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quiz: {str(e)}"
        )

@generation_router.post("/summarize-lecture")
async def summarize_lecture(lecture_url: str):
    """
    Generate a summary of a lecture based on its content.
    """
    try:
        # Get document ID for the lecture URL
        doc_ids = retriever.get_document_ids_by_urls([lecture_url])
        
        if not doc_ids:
            raise HTTPException(
                status_code=404,
                detail="Lecture not found"
            )
        
        # Get all chunks for this document
        chunks = retriever.filtered_search(
            query_embedding=[0] * 768,  # Dummy embedding since we want all chunks
            relevant_doc_ids=doc_ids,
            limit_rows=100  # Get all chunks
        )
        
        # Extract content from chunks
        content = "\n".join([chunk[1] for chunk in chunks])
        
        # TODO: Add your LLM call here to generate the summary
        # For now, return a placeholder response
        return {
            "status": "success",
            "summary": {
                "title": "Lecture Summary",
                "content": "This is a placeholder for the lecture summary",
                "key_points": [
                    "Key point 1",
                    "Key point 2",
                    "Key point 3"
                ]
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to summarize lecture: {str(e)}"
        )
