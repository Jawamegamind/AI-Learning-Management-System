from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.supabase_db import create_supabase_client
import bcrypt
from models.user_model import User
from models.login_model import LoginRequestModel
from routes.auth_routes import auth_router

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

# Setting up the imported routers
app.include_router(auth_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "FastAPI Backend is Running"}

@app.get("/api/test")
def test_api():
    return {"message": "This is a test API"}