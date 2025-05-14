from fastapi import APIRouter
from database.supabase_db import create_supabase_client
from models.summarization_model import SummarizationRequest, FlashcardsRequest, ChatRequest
import pypdf
import os
import requests
import json
import tempfile
from dotenv import load_dotenv

load_dotenv()

API_TOKEN = os.getenv("API_TOKEN")
API_URL = os.getenv("API_URL")

headers = {
    'Authorization': f'Bearer {API_TOKEN}',
    'Content-Type': 'application/json',
}

summarization_router = APIRouter()
supabase = create_supabase_client()

# Defining helper functions for summarization
# Function for extracting text from a variety of file types
def extract_text_from_file(file_path):
    if file_path.endswith('.pdf'):
        return extract_text_from_pdf(file_path)
    elif file_path.endswith('.docx'):
        return extract_text_from_docx(file_path)
    # elif file_path.endswith('.html'):
    #     return extract_text_from_html(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_path}")

# Function for extracting text from a PDF file
def extract_text_from_pdf(file_path):
    with open(file_path, 'rb') as file:
        reader = pypdf.PdfReader(file)
        text = ''
        for page in reader.pages:
            text += page.extract_text()
        return text

# Function for extracting text from a Docx file
def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    text = ''
    for paragraph in doc.paragraphs:
        text += paragraph.text
    return text

# Function to preprocess text
def preprocess_text(text):
    # Remove excessive whitespace and newlines
    text = ' '.join(text.split())
    # Remove special characters if needed
    text = text.replace('\n', ' ')
    return text

# def query_openrouter_api(text, model="deepseek/deepseek-r1-zero:free"):
#     meta_prompt = (
#         "You are an expert educational summarizer. Your task is to read the following lecture content carefully "
#         "and generate a clear and concise summary that captures all key ideas, main points, and concepts. "
#         "Use simple language where possible so students can understand it easily. Avoid repetition and unnecessary detail.\n\n"
#         f"Lecture Content:\n{text}\n\nSummary:"
#     )

#     payload = {
#         "model": model,
#         "messages": [
#             {
#                 "role": "user",
#                 "content": meta_prompt
#             }
#         ],
#         # "max_tokens": max_length
#     }

#     response = requests.post(API_URL, headers=headers, json=payload)
#     print("The response is:", response.json())

#     if response.status_code == 200:
#         try:
#             response_data = response.json()
#             if "choices" in response_data and len(response_data["choices"]) > 0:
#                 return response_data["choices"][0]["message"]["content"]
#             else:
#                 print("Unexpected response structure:", response_data)
#                 return None
#         except json.JSONDecodeError as e:
#             print(f"Error decoding JSON response: {e}")
#             return None
#     else:
#         print(f'API Error: {response.status_code} - {response.text}')
#         return None

def query_openrouter_api(user_prompt, model="meta-llama/llama-4-maverick:free"):
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": user_prompt
            }
        ]
    }

    response = requests.post(API_URL, headers=headers, json=payload)
    print("The response is:", response.json())

    if response.status_code == 200:
        try:
            response_data = response.json()
            if "choices" in response_data and len(response_data["choices"]) > 0:
                return response_data["choices"][0]["message"]["content"]
            else:
                print("Unexpected response structure:", response_data)
                return None
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON response: {e}")
            return None
    else:
        print(f'API Error: {response.status_code} - {response.text}')
        return None


@summarization_router.post("/generate_summarization")
async def generate_summarization(request: SummarizationRequest):
    print("Summarization request received at backend", request)

    combined_text = ""

    for url in request.lecture_urls:
        try:
            # Download the file from the Supabase signed URL
            response = requests.get(url)
            response.raise_for_status()

            # Create a temporary file and write the content
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name

            print(f"Downloaded lecture file to temp path: {tmp_path}")

            # Extract text from the downloaded file
            text = extract_text_from_file(tmp_path)
            combined_text += text + "\n"

            # Optionally delete the temp file
            os.remove(tmp_path)

        except Exception as e:
            print(f"Error processing file {url}: {e}")
            continue

    if not combined_text.strip():
        return {"summary": "No text could be extracted from the provided files."}

    # print("Text extracted from the uploaded files", text)

    # Preprocess the extracted text
    preprocessed_text = preprocess_text(combined_text)
    # print("Preprocessed text", preprocessed_text)

    # Combine the custom prompt with extracted content
    full_prompt = (
        "You are an expert educational summarizer with years of experience in creating clear, concise, and comprehensive summaries of academic content. "
        "Your task is to analyze the provided lecture content and generate a high-quality summary that captures the essence of the material while maintaining accuracy and clarity.\n\n"
        "Guidelines for creating the summary:\n"
        "1. Content Analysis:\n"
        "   - Identify and extract key concepts, main ideas, and supporting details\n"
        "   - Recognize the hierarchical structure of information (main points vs. supporting points)\n"
        "   - Distinguish between essential and non-essential information\n"
        "   - Maintain the logical flow and progression of ideas\n\n"
        "2. Writing Style:\n"
        "   - Use clear, academic language appropriate for the subject matter\n"
        "   - Maintain a formal but accessible tone\n"
        "   - Ensure coherence and logical connections between ideas\n"
        "   - Use appropriate academic terminology while explaining complex concepts\n\n"
        "3. Structure and Organization:\n"
        "   - Begin with a brief overview of the main topics\n"
        "   - Organize content into logical sections with clear headings\n"
        "   - Use bullet points or numbered lists for key points when appropriate\n"
        "   - Include relevant examples or illustrations to clarify complex ideas\n\n"
        "4. Quality Control:\n"
        "   - Ensure factual accuracy and avoid misinterpretation\n"
        "   - Maintain objectivity and avoid personal opinions\n"
        "   - Preserve the original meaning and context\n"
        "   - Check for completeness of coverage\n\n"
        "5. Format Requirements:\n"
        "   - Use clear section headers marked with ***Topic***\n"
        "   - Include a brief introduction if the content warrants it\n"
        "   - End with a concise conclusion that ties key points together\n"
        "   - Maintain consistent formatting throughout\n\n"
        "Guardrails:\n"
        "1. If the content is unclear or insufficient:\n"
        "   - Return 'Insufficient content for a meaningful summary. Please ensure the lecture content is clear and contains enough information.'\n"
        "2. If the content is too technical or complex:\n"
        "   - Break down complex concepts into simpler terms\n"
        "   - Provide additional context or explanations where needed\n"
        "3. If the content contains multiple topics:\n"
        "   - Focus on the most relevant and important topics\n"
        "   - Clearly separate different topics with headers\n"
        "4. If the content is too long:\n"
        "   - Prioritize key concepts and main ideas\n"
        "   - Use concise language while maintaining clarity\n\n"
        f"Based on these guidelines, create a summary based on the following user prompt: {request.summarization_prompt.strip()}\n\n"
        f"Lecture Content:\n{preprocessed_text}\n\n"
        "Summary:"
    )

    # Generate the summary using the user-defined prompt
    summary = query_openrouter_api(full_prompt, model="meta-llama/llama-4-maverick:free")
    print("Summary generated", summary)

    # Add guardrails for the summary
    if not summary or len(summary.strip()) < 50:
        return {"summary": "Insufficient content for a meaningful summary. Please ensure the lecture content is clear and contains enough information."}

    return {"summary": summary}

@summarization_router.post("/generate_flashcards")
async def generate_flashcards(request: FlashcardsRequest):
    print("Flashcards request received at backend", request)

    combined_text = ""

    for url in request.lecture_urls:
        try:
            # Download the file from the Supabase signed URL
            response = requests.get(url)
            response.raise_for_status()

            # Create a temporary file and write the content
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name

            print(f"Downloaded lecture file to temp path: {tmp_path}")

            # Extract text from the downloaded file
            text = extract_text_from_file(tmp_path)
            combined_text += text + "\n"

            # Optionally delete the temp file
            os.remove(tmp_path)

        except Exception as e:
            print(f"Error processing file {url}: {e}")
            continue

    if not combined_text.strip():
        return {"flashcards": "No text could be extracted from the provided files."}

    # Preprocess the extracted text
    preprocessed_text = preprocess_text(combined_text)
    print("Preprocessed text", preprocessed_text)

    # Combine the custom prompt with extracted content
    full_prompt = (
        "You are an expert educational content creator specializing in creating effective flashcards for academic learning. "
        "Your task is to analyze the provided lecture content and generate high-quality flashcards that promote deep understanding and retention of key concepts.\n\n"
        "Guidelines for creating flashcards:\n"
        "1. Content Analysis:\n"
        "   - Identify core concepts, definitions, and key relationships\n"
        "   - Recognize important facts, formulas, and principles\n"
        "   - Distinguish between fundamental and supplementary information\n"
        "   - Ensure coverage of both basic and advanced concepts\n\n"
        "2. Question Design:\n"
        "   - Create clear, focused questions that test understanding\n"
        "   - Use a mix of question types (definition, application, analysis)\n"
        "   - Avoid ambiguous or overly complex questions\n"
        "   - Ensure questions are specific and testable\n\n"
        "3. Answer Quality:\n"
        "   - Provide complete, accurate, and concise answers\n"
        "   - Include relevant examples or explanations when needed\n"
        "   - Use appropriate academic terminology\n"
        "   - Ensure answers are self-contained and understandable\n\n"
        "4. Learning Objectives:\n"
        "   - Focus on promoting deep understanding over rote memorization\n"
        "   - Include questions that test application of concepts\n"
        "   - Create questions that encourage critical thinking\n"
        "   - Ensure progression from basic to complex concepts\n\n"
        "5. Format Requirements:\n"
        "   - Use clear topic headers marked with ***Topic***\n"
        "   - Follow consistent Q: and A: format\n"
        "   - Keep questions and answers concise but complete\n"
        "   - Maintain consistent formatting throughout\n\n"
        "Guardrails:\n"
        "1. If the content is unclear or insufficient:\n"
        "   - Return 'Insufficient content for meaningful flashcards. Please ensure the lecture content is clear and contains enough information.'\n"
        "2. If the content is too technical or complex:\n"
        "   - Break down complex concepts into simpler questions\n"
        "   - Provide additional context in answers when needed\n"
        "3. If the content contains multiple topics:\n"
        "   - Create separate flashcard sets for each major topic\n"
        "   - Ensure clear topic separation with headers\n"
        "4. If the content is too long:\n"
        "   - Focus on the most important concepts\n"
        "   - Prioritize fundamental principles\n"
        "5. If the content lacks clear concepts:\n"
        "   - Create questions that test understanding of relationships\n"
        "   - Focus on application and analysis questions\n\n"
        f"Based on these guidelines, create flashcards based on the following user prompt: {request.flashcards_prompt.strip()}\n\n"
        f"Lecture Content:\n{preprocessed_text}\n\n"
        "The final output should be in the following format ONLY:\n"
        "***<Topic1>***\n"
        "Q: [Question1]\n"
        "A: [Answer1]\n\n"
        "Q: [Question2]\n"
        "A: [Answer2]\n\n"
        "***<Topic2>***\n"
    )

    # Generate the flashcards using the user-defined prompt
    flashcards = query_openrouter_api(full_prompt, model="meta-llama/llama-4-maverick:free")
    print("Flashcards generated", flashcards)

    # Add guardrails for the flashcards
    if not flashcards or len(flashcards.strip()) < 50:
        return {"flashcards": "Insufficient content for meaningful flashcards. Please ensure the lecture content is clear and contains enough information."}

    return {"flashcards": flashcards}

@summarization_router.post("/chat_with_lecture")
async def chat_with_lecture(request: ChatRequest):
    print("Chat request received at backend", request)

    combined_text = ""

    for url in request.lecture_urls:
        try:
            # Download the file from the Supabase signed URL
            response = requests.get(url)
            response.raise_for_status()

            # Create a temporary file and write the content
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name

            print(f"Downloaded lecture file to temp path: {tmp_path}")

            # Extract text from the downloaded file
            text = extract_text_from_file(tmp_path)
            combined_text += text + "\n"

            # Optionally delete the temp file
            os.remove(tmp_path)

        except Exception as e:
            print(f"Error processing file {url}: {e}")
            continue

    if not combined_text.strip():
        return {"response": "No text could be extracted from the provided files."}

    # Preprocess the extracted text
    preprocessed_text = preprocess_text(combined_text)

    # Format conversation history
    conversation_context = ""
    for msg in request.conversation_history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        conversation_context += f"{role}: {content}\n"

    # Combine the custom prompt with extracted content and conversation history
    full_prompt = (
        "You are an expert educational assistant that helps students understand lecture content through conversation. "
        "You have access to the lecture material and can answer questions, explain concepts, and provide additional context.\n\n"
        "Guidelines for the conversation:\n"
        "1. Always base your responses on the actual lecture content\n"
        "2. Be clear and concise in your explanations\n"
        "3. If asked about something not covered in the lecture, say so\n"
        "4. Use examples from the lecture when possible\n"
        "5. Maintain a helpful and educational tone\n\n"
        f"Previous conversation:\n{conversation_context}\n\n"
        f"Lecture Content:\n{preprocessed_text}\n\n"
        f"User's latest message: {request.message}\n\n"
        "Your response:"
    )

    # Generate the response using the user's message and conversation history
    response = query_openrouter_api(full_prompt, model="meta-llama/llama-4-maverick:free")
    print("Response generated", response)

    if not response or len(response.strip()) < 10:
        return {"response": "I apologize, but I couldn't generate a meaningful response. Please try rephrasing your question."}

    return {"response": response}

