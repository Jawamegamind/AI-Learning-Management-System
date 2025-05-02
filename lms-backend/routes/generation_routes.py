# import numpy as np
import os
import logging
from database.retriever import Retriever
from fastapi import APIRouter, HTTPException, Request
from utils.generation_workflow import generate_assignment_workflow
from models.generation_model import AssignmentRequest, QuizRequest, SummarizeRequest

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

generation_router = APIRouter()
retriever = Retriever()

@generation_router.post("/generate-assignment")
async def generate_assignment(request: AssignmentRequest):
    try:
        print("hitting router, urls should be filepaths not urls", request.lecture_urls)
        print(request)
        result = generate_assignment_workflow(
            input_content=request.prompt,
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY"),
            assignmentorquiz= "assignment",
            human_feedback = request.feedback,
            prev_version = request.prev_version,
            urls=request.lecture_urls
        )

        if result["status"] == "failed":
            raise HTTPException(status_code=400, detail=result["assignment"])

        if result["status"] == "awaiting_feedback":
            print("awaiting-feedback")
            return {
                "status": "awaiting_feedback",
                "assignment": result["assignment"]
            }

        # return {
        #     "status": "success",
        #     "assignment": result["assignment"],
        #     "score": result['scores'][-1]
        # }

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
        print("hitting router, urls should be filepaths not urls", request.lecture_urls)
        result = generate_assignment_workflow(
            input_content=request.prompt,
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY"),
            assignmentorquiz= "quiz",
            human_feedback = request.feedback,
            prev_version = request.prev_version,
            urls=request.lecture_urls
        )
        if result["status"] == "failed":
            raise HTTPException(status_code=400, detail=result["assignment"])

        return {
            "status": "success",
            "assignment": result["assignment"],
            "score": result['scores'][-1]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quiz: {str(e)}"
        )


@generation_router.post("/summarize-lecture")
async def summarize_lecture(request: SummarizeRequest):
    """
    Generate a summary of a lecture based on its content.
    """
    try:
        logger.info(f"Received request to summarize lecture with URL: {request.lecture_url}")

        # Get document ID for the lecture URL
        logger.info("Fetching document IDs for URL")
        doc_ids = retriever.get_document_ids_by_urls([request.lecture_url])
        logger.info(f"Retrieved document IDs: {doc_ids}")

        if not doc_ids:
            logger.warning(f"No document IDs found for URL: {request.lecture_url}")
            raise HTTPException(
                status_code=404,
                detail="Lecture not found"
            )

        # Get all chunks for this document
        logger.info(f"Performing filtered search for doc_ids: {doc_ids}")
        chunks = retriever.filtered_search(
            query_embedding=[0] * 768,  # Dummy embedding since we want all chunks
            relevant_doc_ids=doc_ids,
            limit_rows=100  # Get all chunks
        )
        logger.info(f"Retrieved {len(chunks)} chunks")

        # Validate chunk format
        if not chunks:
            logger.warning("No chunks retrieved for the document")
            raise HTTPException(
                status_code=404,
                detail="No content found for the lecture"
            )

        # Extract content from chunks
        content = []
        for i, chunk in enumerate(chunks):
            if not isinstance(chunk, dict) or 'content' not in chunk:
                logger.error(f"Invalid chunk format at index {i}: {chunk}")
                raise HTTPException(
                    status_code=500,
                    detail="Invalid chunk format returned from retriever"
                )
            content.append(chunk['content'])
        content = "\n".join(content)
        logger.info(f"Extracted content length: {len(content)} characters")

        if not content.strip():
            logger.warning("Extracted content is empty")
            raise HTTPException(
                status_code=404,
                detail="Lecture content is empty"
            )

        # TODO: Add your LLM call here to generate the summary using summarization_model.py
        logger.info("Returning placeholder summary")
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

    except HTTPException as he:
        logger.error(f"HTTPException: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to summarize lecture: {str(e)}"
        )