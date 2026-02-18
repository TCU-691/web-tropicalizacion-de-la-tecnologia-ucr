# How to Run the Project

## Important: Running Both Servers

This project requires running TWO servers simultaneously:

1. Backend (FastAPI) - Port 8000
2. Frontend (Next.js) - Port 9002

Two separate terminal windows are needed, one for each server.

>[!NOTE]
>This is temporary, once the simulator is ready it should all get integrated as a single project that runs at the same time.


## Backend Setup and Running

### First Time Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a Python virtual environment:
   ```bash
   python3 -m venv venv
   ```

3. Activate the virtual environment:
   ```bash
   source venv/bin/activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Backend Server

1. Activate the virtual environment (if not already activated):
   ```bash
   cd backend
   source venv/bin/activate
   ```

2. Start the FastAPI server:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```

   The server will start at: `http://127.0.0.1:8000`

### Testing the Backend

**Option 1: Interactive API Documentation**
- Open a browser and visit: http://127.0.0.1:8000/docs
- This provides a Swagger UI to test all endpoints interactively

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
- `POST /api/v1/upload-multiple` - Upload multiple CSV files with different power profiles (e.g., PV, wind, demand)
- `POST /api/v1/simulate` - Run microgrid simulation

#### Using the Multiple CSV Upload Feature

The `/api/v1/upload-multiple` endpoint allows uploading multiple CSV files at once. This is useful when there are separate files for different power profiles (e.g., solar generation, wind generation, load demand).

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

## Frontend Setup and Running

### First Time Setup

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Create environment file (if needed):
   ```bash
   cp .env.example .env.local
   ```
   Then configure the environment variables.

### Running the Frontend

```bash
npm run dev
```

The frontend will start at: `http://localhost:9002`

### Using the Simulator

1. Navigate to: http://localhost:9002/upload-profiles
2. Click to select or drag multiple CSV files
3. For each file, select what it represents:
   - Energy Demand
   - Solar Generation (PV)
   - Wind Generation
   - Hydro Generation
   - Other (with custom label)
4. Click "Upload files" to submit
5. View the results showing all loaded profiles

## Quick Start Guide

### Starting the Complete Project

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Verifying Both Servers are Running

```bash
# In another terminal, verify the backend
curl http://localhost:8000/

# Verify the frontend
curl http://localhost:9002/
```

### Application Access Points

- Main page: http://localhost:9002
- Simulator (Upload CSV): http://localhost:9002/upload-profiles
- API Documentation: http://localhost:8000/docs
- API Root: http://localhost:8000

### Stopping the Servers

- Press `Ctrl+C` in each terminal window
- Or if running in background:
  ```bash
  # Kill backend
  pkill -f uvicorn
  
  # Kill frontend
  pkill -f next
  ```

## Complete Usage Example

### 1. Start Both Servers (in separate terminals)

```bash
# Terminal 1
cd /path/to/project/backend
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000

# Terminal 2
cd /path/to/project
npm run dev
```

### 2. Using the Web Interface

1. Open a browser at: http://localhost:9002/upload-profiles
2. Drag or select multiple CSV files from `backend/tests/`
3. Assign a type to each file (Demand, PV, Wind, etc.)
4. Click "Upload files"
5. View the results with all loaded profiles

### 3. Testing the API Directly (optional)

```bash
# Upload a single file
curl -X POST http://localhost:8000/api/v1/upload \
  -F "file=@backend/tests/test_power_data.csv"

# Upload multiple files
curl -X POST http://localhost:8000/api/v1/upload-multiple \
  -F "files=@backend/tests/test_power_data.csv" \
  -F "files=@backend/tests/test_power_profile.csv"
```

