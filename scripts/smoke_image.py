"""
Smoke test for image generation.
Requires:
 - BACKEND_URL (defaults to http://localhost:8000)
 - FIREBASE_ID_TOKEN in env

Behaviour:
 - POST /image/generate
 - Poll GET /history/chats/{chat_id} for message images
 - Assert images array contains at least one URL
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
    body = {"prompt": "A simple test image for validation", "request_id": req_id}
    try:
        r = requests.post(f"{BACKEND}/image/generate", json=body, headers=HEADERS, timeout=15)
    except requests.RequestException as e:
        print(f"FAIL: request error: {e}")
        sys.exit(3)
    if r.status_code != 200:
        print(f"FAIL: /image/generate returned {r.status_code} {r.text}")
        sys.exit(4)
    data = r.json()
    chat_id = data.get("chat_id")
    message_id = data.get("message_id")
    if not chat_id or not message_id:
        print("FAIL: response missing chat_id or message_id")
        sys.exit(5)
    print(f"Started image job: chat_id={chat_id}, message_id={message_id}")

    deadline = time.time() + 120
    while time.time() < deadline:
        try:
            rr = requests.get(f"{BACKEND}/history/chats/{chat_id}", headers={"Authorization": f"Bearer {ID_TOKEN}"}, timeout=10)
            if rr.status_code != 200:
                time.sleep(2)
                continue
            j = rr.json()
            msgs = j.get("messages", [])
            for m in msgs:
                if m.get("id") == message_id:
                    st = m.get("status")
                    if st == "done":
                        imgs = m.get("images") or []
                        if any(i.get("url") for i in imgs):
                            print("PASS: image generation completed and image URL present")
                            sys.exit(0)
                        else:
                            print("FAIL: message done but no image URLs saved")
                            sys.exit(6)
                    if st == "error":
                        print(f"FAIL: message error: {m.get('error')}")
                        sys.exit(7)
            time.sleep(3)
        except Exception as e:
            print(f"WARN: polling error: {e}")
            time.sleep(2)
    print("FAIL: timeout waiting for image generation to complete")
    sys.exit(8)

if __name__ == '__main__':
    main()
