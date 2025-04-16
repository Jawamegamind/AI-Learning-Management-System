from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from database.supabase_db import create_supabase_client
from datetime import datetime, timezone
from models.course_model import Course, CourseCreate, CourseEnrollment
from models.user_model import User
from utils.storage_manager import StorageManager
import os
from typing import Optional
import requests

course_router = APIRouter()
supabase = create_supabase_client()
storage_manager = StorageManager(os.getenv("PROJECT_URL"),os.getenv("API_KEY"))

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

# Route for getting the user ernollments using their user ID
@course_router.get("/get_user_enrollments/{user_id}")
def get_user_enrollments(user_id: str):
    print("User ID received:", user_id)
    try:
        response = supabase.from_("courseEnrolments").select("*").eq("user_id", user_id).execute()

        if not response.data:
            return {"message": "No enrollments found"}

        return {"enrollments": response.data}
    except Exception as e:
        print("Error:", e)
        return {"message": "Failed to retrieve enrollments"}

# Route for getting courses by their IDs
@course_router.post("/get_courses_by_ids")
def get_courses_by_ids(course_ids: list[int]):
    print("Course IDs received:", course_ids)
    try:
        response = supabase.from_("courses").select("*").in_("id", course_ids).execute()

        if not response.data:
            return {"message": "No courses found"}

        return {"courses": response.data}
    except Exception as e:
        print("Error:", e)
        return {"message": "Failed to retrieve courses", "error": str(e)}

@course_router.post("/process_file")
async def process_course_file(
    courseId: str = Query(...),
    filePath: str = Query(...),
    signedUrl: str = Query(...)
):
    print("courseID:", courseId,"filePath:", filePath)
    # print("signedUrl:", signedUrl)
    signed_url = signedUrl
    try:
        # Extract folder and filename from filePath
        parts = filePath.split('/')
        course_id = int(courseId)
        folder = parts[1]
        filename = parts[2]

        try:
            # Download the file using the signed URL
            response = requests.get(signed_url)
            response.raise_for_status()
            file_data = response.content
            # print("got cont", file_data)

            # Create a temporary file to store the download
            temp_file_path = f"temp_{filename}"
            with open(temp_file_path, "wb") as buffer:
                buffer.write(file_data)
            print("wrote temp files locally ", temp_file_path)

            # Process the file using StorageManager
            result = storage_manager.process_file(
                file_path=temp_file_path,
                course_id=course_id,
                originalFilePath= filePath,
                folder= folder
            )
            # print("processed file w storage manager")
            return {
                "message": "File uploaded and processed successfully",
                "embedding_info": result
            }

        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process file: {str(e)}"
        )