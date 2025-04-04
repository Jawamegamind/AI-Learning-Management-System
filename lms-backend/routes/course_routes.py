from fastapi import APIRouter
from database.supabase_db import create_supabase_client
from datetime import datetime, timezone
from models.course_model import Course, CourseCreate, CourseEnrollment
from models.user_model import User

course_router = APIRouter()
supabase = create_supabase_client()

# Rouyte to create a new course
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

# Route to get all courses
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

# Route to retrieve a specific course and its enrollments by course ID
@course_router.get("/get_course/{course_ID}")
def get_course_by_id(course_ID: int):
    print("Course ID received:", course_ID)
    try:
        course_response = supabase.from_("courses").select("*").eq("id", course_ID).execute()
        enrolments_response = supabase.from_("courseEnrolments").select("*").eq("course_id", course_ID).execute()

        if not course_response.data:
            print("Course not found")
            return {"message": "Course not found"}

        course = course_response.data[0]
        enrolments = enrolments_response.data

        print("Course data:", course)
        print("Enrollments data:", enrolments)

        return {"course": course, "enrolments": enrolments}
    except Exception as e:
        print("Error:", e)
        return {"message": "Failed to retrieve course"}

@course_router.post("/{course_id}/enroll_user")
def enroll_user(course_id: int, payload: dict):
    print("Payload received:", payload)
    print("Course ID received:", course_id)
    try:
        user_id = payload["user_id"]
        role = payload["role"]

        # Check if the user is already enrolled in the course
        existing_enrollment = supabase.from_("courseEnrolments").select("*").eq("course_id", course_id).eq("user_id", user_id).execute()

        if existing_enrollment.data:
            return {"message": "User already enrolled in this course"}

        # Insert new enrollment
        enrollment_data = {
            "course_id": course_id,
            "user_id": user_id,
            "role": role,
            "enrolled_at": datetime.now(timezone.utc).isoformat(),
        }

        response = supabase.from_("courseEnrolments").insert(enrollment_data).execute()

        if not response.data:
            return {"message": "Enrollment failed"}
        else:
            return {"message": "User enrolled successfully", "enrollment": response.data[0]}
    except Exception as e:
        print("Error:", e)
        return {"message": "Enrollment failed", "error": str(e)}

@course_router.delete("/{course_id}/unenroll_user/{user_id}")
def unenroll_user(course_id: int, user_id: str):
    supabase.from_("courseEnrolments")\
        .delete()\
        .eq("course_id", course_id)\
        .eq("user_id", user_id)\
        .execute()
    return {"message": "User unenrolled"}

@course_router.post("/{course_id}/update_role")
def update_role(course_id: int, payload: dict):
    print("Payload received:", payload)
    print("Course ID received:", course_id)
    try:
        user_id = payload["user_id"]
        role = payload["role"]

        # Update the user's role in the course
        response = supabase.from_("courseEnrolments").update({"role": role}).eq("course_id", course_id).eq("user_id", user_id).execute()

        if not response.data:
            return {"message": "Role update failed"}
        else:
            return {"message": "User role updated successfully", "enrollment": response.data[0]}
    except Exception as e:
        print("Error:", e)
        return {"message": "Role update failed", "error": str(e)}

