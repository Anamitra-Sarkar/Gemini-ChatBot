"""
Smoke test for video generation.
Requires:
 - BACKEND_URL (defaults to http://localhost:8000)
 - FIREBASE_ID_TOKEN in env

Behaviour:
 - POST /video/generate
 - Poll /video/status/{job_id} until done or error
 - Validate job doc contains video_url when done
"""
import os
import sys
import time
import requests
import uuid

BACKEND = os.getenv("BACKEND_URL", "http://localhost:8000")
ID_TOKEN = os.getenv("FIREBASE_ID_TOKEN")
if not ID_TOKEN:
    print("FIREBASE_ID_TOKEN not set in env — cannot authenticate. Set it and retry.")
    sys.exit(2)

HEADERS = {"Authorization": f"Bearer {ID_TOKEN}", "Content-Type": "application/json"}


def main():
    req_id = str(uuid.uuid4())
    body = {"prompt": "Short test video for validation", "request_id": req_id}
    try:
        r = requests.post(f"{BACKEND}/video/generate", json=body, headers=HEADERS, timeout=15)
    except requests.RequestException as e:
        print(f"FAIL: request error: {e}")
        sys.exit(3)
    if r.status_code != 200:
        print(f"FAIL: /video/generate returned {r.status_code} {r.text}")
        sys.exit(4)
    data = r.json()
    job_id = data.get("job_id")
    chat_id = data.get("chat_id")
    message_id = data.get("message_id")
    if not job_id:
        print("FAIL: response missing job_id")
        sys.exit(5)
    print(f"Started video job: job_id={job_id}, chat_id={chat_id}, message_id={message_id}")

    deadline = time.time() + 300
    while time.time() < deadline:
        try:
            rr = requests.get(f"{BACKEND}/video/status/{job_id}", headers={"Authorization": f"Bearer {ID_TOKEN}"}, timeout=10)
            if rr.status_code != 200:
                print(f"WARN: /video/status returned {rr.status_code}")
                time.sleep(3)
                continue
            j = rr.json()
            job = j.get("job") or {}
            status = job.get("status")
            if status == "done" or status == "completed":
                video_url = job.get("video_url") or job.get("result_url") or job.get("video_url")
                if video_url:
                    print("PASS: video job completed and video_url present")
                    sys.exit(0)
                else:
                    print("FAIL: job completed but no video URL in job doc")
                    sys.exit(6)
            if status == "error" or status == "failed":
                print(f"FAIL: job failed: {job.get('error')}")
                sys.exit(7)
            time.sleep(5)
        except Exception as e:
            print(f"WARN: polling error: {e}")
            time.sleep(3)
    print("FAIL: timeout waiting for video job to complete")
    sys.exit(8)

if __name__ == '__main__':
    main()
