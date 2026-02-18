from fastapi import APIRouter, UploadFile, HTTPException
from typing import List
from app.utils import process_csv_file, process_multiple_csv_files
from app.models import PowerProfileData, MultipleProfilesData, SimulationRequest, SimulationResult
from app.simulator import simulate_microgrid

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

@router.post("/upload-multiple", response_model=MultipleProfilesData)
async def upload_multiple_csv(files: List[UploadFile]):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Validate all files are CSVs
    for file in files:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail=f"File {file.filename} must be a CSV")
    
    try:
        data = await process_multiple_csv_files(files)
        return MultipleProfilesData(**data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Endpoint for simulation
@router.post("/simulate", response_model=SimulationResult)
async def simulate(req: SimulationRequest):
    try:
        result = simulate_microgrid(req)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))