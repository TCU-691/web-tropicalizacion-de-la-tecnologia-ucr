import pandas as pd
from fastapi import UploadFile
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