# How to Run the Project

## Backend Setup and Running

### First Time Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a Python virtual environment:**
   ```bash
   python3 -m venv venv
   ```

3. **Activate the virtual environment:**
   ```bash
   source venv/bin/activate
   ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

### Running the Backend Server

1. **Activate the virtual environment** (if not already activated):
   ```bash
   cd backend
   source venv/bin/activate
   ```

2. **Start the FastAPI server:**
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```

   The server will start at: `http://127.0.0.1:8000`

### Testing the Backend

**Option 1: Interactive API Documentation**
- Open your browser and visit: http://127.0.0.1:8000/docs
- This provides a Swagger UI where you can test all endpoints interactively

**Option 2: Test Root Endpoint**
- Visit: http://127.0.0.1:8000/
- Or use curl: `curl http://127.0.0.1:8000/`

**Option 3: Test Endpoints with curl**

```bash
# Test root endpoint
curl http://127.0.0.1:8000/

# Upload a CSV file
curl -X POST http://127.0.0.1:8000/api/v1/upload \
  -F "file=@backend/tests/test_power_data.csv"

# Upload multiple CSV files
curl -X POST http://127.0.0.1:8000/api/v1/upload-multiple \
  -F "files=@backend/tests/test_power_data.csv" \
  -F "files=@backend/tests/test_power_profile.csv" \
  -F "files=@backend/tests/test.csv"

# Run simulation (adjust the payload as needed)
curl -X POST http://127.0.0.1:8000/api/v1/simulate \
  -H "Content-Type: application/json" \
  -d '{"your": "data"}'
```

### Available Endpoints

- `GET /` - Root endpoint, confirms API is running
- `POST /api/v1/upload` - Upload a single CSV file with power profile data
- `POST /api/v1/upload-multiple` - **Upload multiple CSV files** with different power profiles (e.g., PV, wind, demand)
- `POST /api/v1/simulate` - Run microgrid simulation

#### Using the Multiple CSV Upload Feature

The `/api/v1/upload-multiple` endpoint allows you to upload multiple CSV files at once. This is useful when you have separate files for different power profiles (e.g., solar generation, wind generation, load demand).

**Expected CSV format for each file:**
```
timestamp,power
2023-10-09 00:00:00,100.5
2023-10-09 00:15:00,95.2
...
```

**Example response:**
```json
{
  "time": ["2023-10-09 00:00:00", "2023-10-09 00:15:00", ...],
  "profiles": {
    "test_power_data": [100.5, 95.2, ...],
    "test_power_profile": [50.3, 48.1, ...],
    "test": [25.7, 30.2, ...]
  }
}
```

The response includes:
- `time`: Timestamp array (taken from the first file)
- `profiles`: Dictionary mapping each filename (without .csv extension) to its power data array

**Note:** All CSV files should have the same timestamps. The system uses the first file's timestamps as the reference timeline.

### Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

