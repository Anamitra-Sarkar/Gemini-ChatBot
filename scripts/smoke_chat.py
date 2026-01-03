"""
Smoke test for chat streaming.
Requires:
 - BACKEND_URL (defaults to http://localhost:8000)
 - FIREBASE_ID_TOKEN (an ID token for a test user) in env — script will not print it

Behavior:
 - POST /chat/stream and read SSE headers until 'meta' event arrives
 - Extract chat_id and message_id from 'meta'
 - Poll GET /history/chats/{chat_id} until message status is 'done' or timeout
 - Print concise PASS/FAIL and reasons
"""
import os
import sys
import time
import requests

BACKEND = os.getenv("BACKEND_URL", "http://localhost:8000")
ID_TOKEN = os.getenv("FIREBASE_ID_TOKEN")
if not ID_TOKEN:
    print("FIREBASE_ID_TOKEN not set in env — cannot authenticate. Set it and retry.")
    sys.exit(2)

HEADERS = {"Authorization": f"Bearer {ID_TOKEN}", "Accept": "text/event-stream"}

import uuid

def parse_sse_line(line):
    # naive parsing: lines like 'event: meta' and 'data: { ... }'
    if line.startswith("event:"):
        return ("event", line.split(":",1)[1].strip())
    if line.startswith("data:"):
        return ("data", line.split(":",1)[1].strip())
    return (None, None)


def main():
    req_id = str(uuid.uuid4())
    body = {"message": "Smoke test message - verify streaming", "request_id": req_id}
    try:
        with requests.post(f"{BACKEND}/chat/stream", json=body, headers=HEADERS, stream=True, timeout=60) as r:
            if r.status_code != 200:
                print(f"FAIL: /chat/stream returned {r.status_code} {r.text}")
                sys.exit(3)
            chat_id = None
            message_id = None
            start = time.time()
            for raw in r.iter_lines(decode_unicode=True):
                if not raw:
                    continue
                typ, payload = parse_sse_line(raw)
                if typ == "event" and payload == "meta":
                    # next data line expected
                    continue
                if typ == "data":
                    # attempt to parse meta JSON
                    import json
                    try:
                        j = json.loads(payload)
                        if j.get("chat_id") and j.get("message_id"):
                            chat_id = j.get("chat_id")
                            message_id = j.get("message_id")
                            print(f"Meta received: chat_id={chat_id}, message_id={message_id}")
                            break
                    except Exception:
                        pass
                if time.time() - start > 15:
                    print("FAIL: timed out waiting for meta event on SSE stream")
                    sys.exit(4)
    except requests.exceptions.RequestException as e:
        print(f"FAIL: request error: {e}")
        sys.exit(5)

    if not chat_id or not message_id:
        print("FAIL: did not receive chat_id/message_id from stream")
        sys.exit(6)

    # Poll chat messages until assistant message reaches status 'done'
    deadline = time.time() + 60
    while time.time() < deadline:
        try:
            rr = requests.get(f"{BACKEND}/history/chats/{chat_id}", headers={"Authorization": f"Bearer {ID_TOKEN}"}, timeout=10)
            if rr.status_code != 200:
                print(f"WARN: /history/chats returned {rr.status_code}")
                time.sleep(2)
                continue
            data = rr.json()
            msgs = data.get("messages", [])
            for m in msgs:
                if m.get("id") == message_id:
                    st = m.get("status")
                    if st == "done":
                        print("PASS: chat streaming completed and persisted (status=done)")
                        sys.exit(0)
                    if st == "error":
                        print(f"FAIL: assistant message status=error (error={m.get('error')})")
                        sys.exit(7)
            time.sleep(2)
        except Exception as e:
            print(f"WARN: polling error: {e}")
            time.sleep(2)
    print("FAIL: timeout waiting for assistant message to reach done state")
    sys.exit(8)

if __name__ == '__main__':
    main()
