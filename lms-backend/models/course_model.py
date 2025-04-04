from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CourseBase(BaseModel):
    title: str
    description: str
    start_date: datetime
    end_date: datetime
    max_students: Optional[int] = None
    is_active: bool = True

class CourseCreate(CourseBase):
    pass

class Course(CourseBase):
    id: int
    created_at: datetime
    created_by: str  # admin's email
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CourseEnrollment(BaseModel):
    course_id: int
    user_id: str
    role: str  # 'instructor' or 'student'
    enrolled_at: datetime = datetime.now()

    class Config:
        from_attributes = True

class CourseWithEnrollments(Course):
    enrollments: List[CourseEnrollment] = []

    class Config:
        from_attributes = True 
