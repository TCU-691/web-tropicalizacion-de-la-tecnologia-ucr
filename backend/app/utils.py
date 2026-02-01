import pandas as pd
from fastapi import UploadFile
from typing import List, Dict
import io

async def process_csv_file(file: UploadFile) -> dict:
    """
    Process the uploaded CSV file and return time and power data.
    
    Expected CSV format:
    timestamp,power
    2023-10-09 00:00:00,100.5
    2023-10-09 00:15:00,95.2
    ...
    """
    try:
        # Read the file content
        content = await file.read()
        
        # Convert to pandas DataFrame
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        
        # Assuming the CSV has 'timestamp' and 'power' columns
        # Adjust column names based on your actual CSV structure
        time_data = df['timestamp'].tolist()
        power_data = df['power'].tolist()
        
        return {
            "time": time_data,
            "power": power_data
        }
    except Exception as e:
        raise Exception(f"Error processing CSV file: {str(e)}")

async def process_multiple_csv_files(files: List[UploadFile]) -> dict:
    """
    Process multiple uploaded CSV files and return combined data.
    
    Expected CSV format for each file:
    timestamp,power
    2023-10-09 00:00:00,100.5
    2023-10-09 00:15:00,95.2
    ...
    
    Returns a dictionary with:
    - time: list of timestamps (from the first file, assuming all files use the same timeline)
    - profiles: dict mapping filename to power data list
    """
    try:
        profiles: Dict[str, List[float]] = {}
        time_data: List[str] = []
        
        for idx, file in enumerate(files):
            # Read the file content
            content = await file.read()
            
            # Convert to pandas DataFrame
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
            
            # Get filename without extension for profile identification
            filename = file.filename.replace('.csv', '') if file.filename else f"profile_{idx}"
            
            # Assuming the CSV has 'timestamp' and 'power' columns
            if idx == 0:
                # Use the first file's timestamps as the reference
                time_data = df['timestamp'].tolist()
            
            # Store power data with filename as key
            profiles[filename] = df['power'].tolist()
        
        return {
            "time": time_data,
            "profiles": profiles
        }
    except Exception as e:
        raise Exception(f"Error processing CSV files: {str(e)}")