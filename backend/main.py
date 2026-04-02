import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client, create_client

# 1. LOAD ENVIRONMENT VARIABLES FIRST
load_dotenv()

# 2. THEN IMPORT THE ROUTER
from api.routes import business

# Setup primary database (New Finance App)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing primary Supabase environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(
    title="Finance Portal API",
    description="Backend services for personal and business financial routing.",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost:3000",
    # "https://your-vercel-domain.vercel.app" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Mount the business router
# This means the endpoint will be accessible at /api/business/financials
app.include_router(business.router, prefix="/api/business", tags=["Business Data"])

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Finance Portal API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)