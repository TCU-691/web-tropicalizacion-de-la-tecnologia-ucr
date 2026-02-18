#!/usr/bin/env python3
import requests

# Test the upload endpoint
files_to_upload = [
    ('files', ('test_power_data.csv', open('tests/test_power_data.csv', 'rb'), 'text/csv')),
]

print("Testing /api/v1/upload-multiple endpoint...")
try:
    response = requests.post(
        'http://localhost:8000/api/v1/upload-multiple',
        files=files_to_upload
    )
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
