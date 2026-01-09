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

# Run simulation (adjust the payload as needed)
curl -X POST http://127.0.0.1:8000/api/v1/simulate \
  -H "Content-Type: application/json" \
  -d '{"your": "data"}'
```

### Available Endpoints

- `GET /` - Root endpoint, confirms API is running
- `POST /api/v1/upload` - Upload CSV file with power profile data
- `POST /api/v1/simulate` - Run microgrid simulation

### Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

