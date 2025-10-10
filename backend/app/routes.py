from fastapi import APIRouter, UploadFile, HTTPException
from app.utils import process_csv_file
from app.models import PowerProfileData

router = APIRouter()

@router.post("/upload", response_model=PowerProfileData)
async def upload_csv(file: UploadFile):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        data = await process_csv_file(file)
        return PowerProfileData(**data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))