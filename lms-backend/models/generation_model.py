from typing import TypedDict, List, Optional
from pydantic import BaseModel

class AssignmentState(TypedDict):
    input_content: str    # Course content or topic
    assignment: str       # Generated assignment
    status: str           # 'pending', 'verified', 'failed', 'complete'
    attempts: int         # Number of generation attempts
    feedback: str         # Feedback of the assignment
    urls: Optional[List[str]]  # Optional URLs for document context
    option: str             # "quiz" or "assignment"


class AssignmentRequest(BaseModel):
    prompt: str
    lecture_urls: List[str]

class QuizRequest(BaseModel):
    prompt: str
    lecture_urls: List[str]

class SummarizeRequest(BaseModel):
    lecture_url: str
