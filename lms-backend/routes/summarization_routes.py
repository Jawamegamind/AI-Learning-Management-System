from fastapi import APIRouter
from database.supabase_db import create_supabase_client
from models.summarization_model import SummarizationRequest, FlashcardsRequest
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
        f"{request.summarization_prompt.strip()}\n\n"
        f"Lecture Content:\n{preprocessed_text}\n\nSummary:"
    )

    # Generate the summary using the user-defined prompt
    summary = query_openrouter_api(full_prompt, model="meta-llama/llama-4-maverick:free")

    # Generate the summary
    # summary = query_openrouter_api(preprocessed_text, model="meta-llama/llama-4-maverick:free")
    print("Summary generated", summary)

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
        f"Create flashcards for the following topics: {request.flashcards_prompt.strip()}\n\n"
        f"Based on this lecture content:\n{preprocessed_text}\n\n"
        "Generate flashcards that cover key concepts, definitions, and important points."
        "The final output should be in the following format ONLY, DO NOT write anything else but strictly follow this format"
        "If some topic is NOT present in the lectures, JUST EXCLUDE the topic, NO need to mention it in final output"
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

    return {"flashcards": flashcards}

