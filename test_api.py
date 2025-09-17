#!/usr/bin/env python3
import os
import requests

API_HOST = "active-jobs-db.p.rapidapi.com"
BASE_URL = f"https://{API_HOST}/active-ats-7d"
HEADERS = {
    "x-rapidapi-host": API_HOST,
    "x-rapidapi-key": os.getenv("RAPIDAPI_KEY")
}

PARAMS = {
    "limit": 10,
    "offset": 0,
    "title_filter": '"Help Desk" OR "IT Helpdesk" OR "IT Support"',
    "location_filter": '"Cinco Ranch, Texas" OR "Houston, Texas"',
    "description_type": "text",
    "ai_has_salary": "true",
}

print("Testing API connection...")
print(f"API Key set: {bool(HEADERS['x-rapidapi-key'])}")

try:
    rsp = requests.get(BASE_URL, headers=HEADERS, params=PARAMS, timeout=15)
    print(f"Status code: {rsp.status_code}")
    
    if rsp.status_code == 200:
        data = rsp.json()
        print(f"Response keys: {list(data.keys())}")
        print(f"Response type: {type(data)}")
        
        if "jobs" in data:
            jobs = data["jobs"]
            print(f"Number of jobs returned: {len(jobs)}")
            if jobs:
                print(f"First job keys: {list(jobs[0].keys())}")
        else:
            print(f"Full response: {data}")
    else:
        print(f"Error response: {rsp.text}")
        
except Exception as e:
    print(f"Exception: {e}") 