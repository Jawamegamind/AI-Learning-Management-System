# import numpy as np
import os
import logging
from database.retriever import Retriever
from fastapi import APIRouter, HTTPException, Request
from utils.generation_workflow import generate_assignment_workflow
from models.generation_model import AssignmentRequest, QuizRequest, SummarizeRequest
from fastapi import  UploadFile, File
from fastapi.responses import JSONResponse
import os
import tempfile
import base64
from utils.markscheme_utils import (
    extract_text_from_pdf,
    generate_markscheme_json,
    approve_markscheme,
    export_markscheme_to_pdf
)
from utils.assignment_markscheme_utils import generate_assignment_markscheme

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

generation_router = APIRouter()
retriever = Retriever()

@generation_router.post("/generate-assignment")
async def generate_assignment(request: AssignmentRequest):
    try:
        print("hitting router, urls should be filepaths not urls", request.lecture_urls)
        result = generate_assignment_workflow(
            input_content=request.prompt,
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY"),
            assignmentorquiz= "assignment",
            urls=request.lecture_urls,
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
            urls=request.lecture_urls,
        )
        if result["status"] == "failed":
            raise HTTPException(status_code=400, detail=result["assignment"])

        return {
            "status": "success",
            "assignment": result["assignment"],
            "score": ""  #inapplicable as of now, since no feedback loop for quizzes yet
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
    
@generation_router.post("/generate-markscheme")
async def generate_markscheme(file: UploadFile = File(...)):
    try:
        logger.info(f"i come here to generate markscheme: {file}")
        # Step 1: Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Step 2: Extract text from PDF
        quiz_text = extract_text_from_pdf(tmp_path)
        logger.info(f"is quiz text generated: {quiz_text}")

        # Step 3: Generate and auto-approve JSON
        markscheme = generate_markscheme_json(quiz_text)
        logger.info(f"the inital markscheme is: {markscheme}")
        # approved = approve_markscheme(markscheme, quiz_text)

        # Step 4: Export to PDF
        pdf_output_path = tmp_path.replace(".pdf", "_solution.pdf")
        # export_markscheme_to_pdf(approved, pdf_output_path)
        export_markscheme_to_pdf(markscheme, pdf_output_path)

        # Step 5: Return base64 encoded PDF
        with open(pdf_output_path, "rb") as f:
            encoded_pdf = base64.b64encode(f.read()).decode("utf-8")

        # Clean up temp files
        os.remove(tmp_path)
        os.remove(pdf_output_path)

        return {
            "status": "success",
            "markscheme_pdf": encoded_pdf
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@generation_router.post("/generate-assignment-markscheme")
async def generate_assignment_markscheme_route(file: UploadFile = File(...)):
    try:
        logger.info(f"i come here: {file}")

        # Save uploaded .ipynb to a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".ipynb") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Your actual OpenRouter API key here
        # api_key = os.getenv("OPENROUTER_API_KEY")
        # logger.info(f"Loaded OpenRouter key: {api_key[:5]}...")  # Do NOT print full key in production


        # Generate marking scheme (returns base64-encoded PDF)
        pdf_base64 = generate_assignment_markscheme(tmp_path)

        # Clean up temp file
        os.remove(tmp_path)

        return JSONResponse(content={
            "status": "success",
            "markscheme_pdf": pdf_base64  # ✅ fixed key name
        })

    except Exception as e:
        return JSONResponse(content={
            "status": "error",
            "message": str(e)
        }, status_code=500)
