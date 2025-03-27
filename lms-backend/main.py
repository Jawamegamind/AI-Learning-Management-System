from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.supabase_db import create_supabase_client
import bcrypt
from models.user_model import User
from models.login_model import LoginRequestModel

app = FastAPI()

# Initializing the Supabase client
supabase = create_supabase_client()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "FastAPI Backend is Running"}

@app.get("/api/test")
def test_api():
    return {"message": "This is a test API"}

def user_exists(key: str = "email", value: str = None):
    user = supabase.from_("users").select("*").eq(key, value).execute()
    return len(user.data) > 0

# Route to register a new user
@app.post("/api/register")
def create_user(user: User):
    try:
        # Print the retrieved user data
        print(user)
        # Convert email to lowercase
        user_email = user.email.lower()
        # Hash password
        hased_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        print("The hashed password is", hased_password)

        # Check if user already exists
        if user_exists(value=user_email):
            return {"message": "User already exists"}

        # Add user to users table
        user = supabase.from_("users")\
            .insert({"user_id": user.user_id,"name": user.name, "email": user_email, "password": hased_password, "role": user.role})\
            .execute()

        # Check if user was added
        if user:
            return {"message": "User created successfully"}
        else:
            return {"message": "User creation failed"}
    except Exception as e:
        print("Error: ", e)
        return {"message": "User creation failed"}

# Route to login a user
@app.post("/api/login")
def login_user(login_request: LoginRequestModel):
    try:
        # Convert email to lowercase
        user_email = login_request.email.lower()

        # Retrieve user from users table
        response = supabase.from_("users").select("*").eq("email", user_email).execute()

        # Check if user exists
        if not response.data:
            return {"message": "User not found"}

        # Extract user info
        db_user = response.data[0]
        
        # Check if password matches
        if bcrypt.checkpw(login_request.password.encode('utf-8'), db_user['password'].encode('utf-8')):
            return {"message": "Login successful"}
        else:
            return {"message": "Invalid password"}

    except Exception as e:
        print("Error:", e)
        return {"message": "Login failed"}