from fastapi import APIRouter
from database.supabase_db import create_supabase_client
import os
import requests
import json

summarization_router = APIRouter()
supabase = create_supabase_client()