from fastapi import APIRouter
from database.supabase_db import create_supabase_client
from models.user_model import User
from models.login_model import LoginRequestModel
import bcrypt

auth_router = APIRouter()
supabase = create_supabase_client()

def user_exists(key: str = "email", value: str = None):
    user = supabase.from_("users").select("*").eq(key, value).execute()
    return len(user.data) > 0

@auth_router.post("/register")
def create_user(user: User):
    try:
        user_email = user.email.lower()
        hased_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        if user_exists(value=user_email):
            return {"message": "User already exists"}

        user = supabase.from_("users").insert({
            "user_id": user.user_id,
            "name": user.name,
            "email": user_email,
            "password": hased_password,
            "role": user.role
        }).execute()

        if user:
            return {"message": "User created successfully"}
        else:
            return {"message": "User creation failed"}
    except Exception as e:
        print("Error:", e)
        return {"message": "User creation failed"}

@auth_router.post("/login")
def login_user(login_request: LoginRequestModel):
    try:
        user_email = login_request.email.lower()
        response = supabase.from_("users").select("*").eq("email", user_email).execute()

        if not response.data:
            return {"message": "User not found"}

        db_user = response.data[0]

        if bcrypt.checkpw(login_request.password.encode('utf-8'), db_user['password'].encode('utf-8')):
            return {"message": "Login successful", "user": db_user}
        else:
            return {"message": "Invalid password"}

    except Exception as e:
        print("Error:", e)
        return {"message": "Login failed"}

@auth_router.get("/user/{user_id}")
def get_user(user_id: str):
    try:
        response = supabase.from_("users").select("*").eq("user_id", user_id).execute()

        if not response.data:
            return {"message": "User not found"}

        return {"user": response.data[0]}
    except Exception as e:
        print("Error:", e)
        return {"message": "Failed to retrieve user"}

@auth_router.get("/users")
def get_all_users():
    try:
        response = supabase.from_("users").select("*").execute()

        if not response.data:
            return {"message": "No users found"}

        return {"users": response.data}
    except Exception as e:
        print("Error:", e)
        return {"message": "Failed to retrieve users"}
