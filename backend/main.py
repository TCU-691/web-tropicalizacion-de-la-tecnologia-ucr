from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from app.routes import router

# Load environment variables
load_dotenv()

app = FastAPI(title="Power Profile API")

# Include routes
app.include_router(router, prefix="/api/v1")

# Configure CORS
origins = [
    "http://localhost:3000",  # Next.js development server
    "http://localhost",
    # Add your production domain here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Power Profile API is running"}