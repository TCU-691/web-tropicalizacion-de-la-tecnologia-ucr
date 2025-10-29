from fastapi import APIRouter, UploadFile, HTTPException
from app.utils import process_csv_file
from app.models import PowerProfileData, SimulationRequest, SimulationResult
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

# Endpoint for simulation
@router.post("/simulate", response_model=SimulationResult)
async def simulate(req: SimulationRequest):
    try:
        result = simulate_microgrid(req)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))