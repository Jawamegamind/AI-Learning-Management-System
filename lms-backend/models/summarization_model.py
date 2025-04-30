from pydantic import BaseModel
from typing import List

class SummarizationRequest(BaseModel):
    summarization_prompt: str
    lecture_urls: List[str]

class FlashcardsRequest(BaseModel):
    flashcards_prompt: str
    lecture_urls: List[str]