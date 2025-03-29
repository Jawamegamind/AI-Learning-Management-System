from fastapi import APIRouter
from database.supabase_db import create_supabase_client
from datetime import datetime, timezone
from models.course_model import Course, CourseCreate
from models.user_model import User

course_router = APIRouter()
supabase = create_supabase_client()

@course_router.post("/create_course")
def create_course(payload: dict):
    try:
        # print("Payload received:", payload)
        current_user = payload.get("currentUser")
        current_user = current_user["user"]
        course = payload.get("formdata")
        # First check if the user is an admin
        print("The current user is:", current_user)
        print("The course data is:", course)

        start_date = datetime.strptime(course["course_start_date"], "%Y-%m-%d")
        end_date = datetime.strptime(course["course_end_date"], "%Y-%m-%d")
        course_data = {
            "title": course["course_title"],
            "description": course["course_description"],
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "max_students": course["max_students"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user["user_id"],  # admin's email
        }

        response = supabase.from_("courses").insert(course_data).execute()

        if not response.data:
            return {"message": "Course creation failed"}
        else:
            return {"message": "Course created successfully", "course": response.data[0]}

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