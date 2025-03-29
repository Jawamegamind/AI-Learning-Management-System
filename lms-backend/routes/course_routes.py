from fastapi import APIRouter
from database.supabase_db import create_supabase_client
from models.course_model import Course, CourseCreate
from models.user_model import User

course_router = APIRouter()
supabase = create_supabase_client()

@course_router.post("/courses_create")
def create_course(course: CourseCreate, current_user: User):
    try:
        # First check if the user is an admin
        print("The current user is:", current_user)
        course_data = {
            "title": course.title,
            "description": course.description,
            "start_date": course.start_date,
            "end_date": course.end_date,
            "max_students": course.max_students,
            "is_active": course.is_active,
            "created_at": course.created_at,
            "created_by": course.created_by,  # admin's email
        }

        response = supabase.from_("courses").insert(course_data).execute()

        if response.status_code == 201:
            return {"message": "Course created successfully", "course": response.data}
        else:
            return {"message": "Course creation failed", "error": response.error}

    except Exception as e:
        print("Error:", e)
        return {"message": "Course creation failed", "error": str(e)}

@course_router.get("/get_courses")
def get_all_courses():
    try:
        response = supabase.from_("courses").select("*").execute()

        if not response.data:
            return {"message": "No courses available"}

        return {"courses": response.data}
    except Exception as e:
        print("Error:", e)
        return {"message": "Failed to retrieve courses"}