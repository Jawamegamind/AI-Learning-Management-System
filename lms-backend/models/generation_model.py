from typing import TypedDict, List, Optional
from pydantic import BaseModel

class AssignmentState(TypedDict):
    input_content: str    # Course content or topic
    assignment: str       # Generated assignment
    status: str           # 'pending', 'verified', 'failed', 'complete', 'awaiting_feedback'
    attempts: int         # Number of generation attempts
    feedback: str         # Feedback of the assignment
    urls: Optional[List[str]]  # Optional URLs for document context
    option: str             # "quiz" or "assignment"
    scores: List[int]       #list of all scores
    optimized_query: str     # optimized query for rag after metaprocessing
    human_feedback: str
    assignment_prev_version: str


class PracticeQAState(TypedDict):
    input_content: str    # Course content or topic
    status: str           # 'pending', 'verified', 'failed', 'complete'
    urls: Optional[List[str]]  # Optional URLs for document context
    difficulty: str             # "easy" or "medium" or "hard"
    topics: List[str]       #list of all topics
    optimized_query: str     # optimized query for rag after metaprocessing
    practiceqas: str        #final output


class AssignmentRequest(BaseModel):
    prompt: str
    lecture_urls: List[str]
    feedback: str
    prev_version: str

class QuizRequest(BaseModel):
    prompt: str
    lecture_urls: List[str]

class PracticeQARequest(BaseModel):
    prompt: str
    lecture_urls: List[str]
    difficulty: str

class SummarizeRequest(BaseModel):
    lecture_url: str
