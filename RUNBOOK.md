Pre-deploy checklist (operator)

- Verify required env vars set for the deployment environment (see top of this RUNBOOK). Use secrets manager; never embed secrets in build.
- Set `FRONTEND_ORIGIN`/`CORS_ALLOWED_ORIGINS` to the expected Vercel domain.
- Set `STREAM_UPDATE_INTERVAL_MS` to 500 (default) or higher if under heavy load.
- Set `GUNICORN_WORKERS` appropriate to instance CPU (or leave unset to auto-calc).
- Ensure `FIREBASE_PRIVATE_KEY` secret has correct IAM scopes for Firestore and Storage.
- Configure `MAX_ATTACHMENT_SIZE_BYTES` and retention envs before public beta.

Post-deploy verification

- Hit `/health` and confirm all services `true`.
- Open frontend, start a chat, enable grounding and verify Sources render under assistant messages.
- Start a long streaming chat and observe backend logs: look for `start_stream` log entries and ensure latency is reasonable.
- Run `scripts/smoke_chat.py` and `scripts/smoke_image.py` from a CI runner against the deployed backend.

Rollback plan

- If the deployment fails health checks, immediately roll back to the previous stable release via your hosting platform.
- Revoke any newly provisioned API keys if they may have been compromised during a failed rollout and replace them in the secrets manager.

Common production issues + fixes

- `/health` shows `storage: false` → verify `FIREBASE_STORAGE_BUCKET` and service account permissions.
- Token/HW limits → increase `GUNICORN_WORKERS` or scale horizontally; ensure `STREAM_UPDATE_INTERVAL_MS` is not too low.
- Excessive storage costs → lower `MAX_IMAGE_SIZE_BYTES` and implement stricter retention TTLs; run admin cleanup.

Admin cleanup

- The backend exposes `/admin/cleanup` to remove old request mappings and aborted streams. Run it as an authenticated admin user:

```bash
curl -X POST $BACKEND_URL/admin/cleanup -H "Authorization: Bearer $FIREBASE_ID_TOKEN"
```

This is best-effort and may need to be scheduled via a platform cron job for regular maintenance.

Key rotation

- Rotate `GEMINI_API_KEY`, `NANO_BANANA_API_KEY`, `VEO_API_KEY`, and `TAVILY_API_KEY` in your secrets manager following platform guidelines. Update the running services by pushing new secret revisions and triggering a restart. Verify `/health` and run smoke scripts after rotation.

RUNBOOK — Validation & Smoke Test Guide

Purpose
- This runbook enables an operator to validate the backend and generation flows safely and reproducibly.
- No secrets are stored in this repo. All credentials must be provided via environment variables at runtime.

Required environment variables (names only)
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- FIREBASE_STORAGE_BUCKET
- GEMINI_API_KEY
- NANO_BANANA_API_KEY
- NANO_BANANA_ENDPOINT (optional)
- VEO_API_KEY
- VEO_ENDPOINT (optional)
 - TAVILY_API_KEY
 - TAVILY_ENDPOINT (optional)
 - TAVILY_SEARCH_DEPTH (optional; defaults to "advanced")
 - TAVILY_MAX_RESULTS (optional; defaults to 5)
 - TAVILY_MAX_QUERIES_PER_HOUR (optional; defaults to 20)
- DEFAULT_MODEL (optional)
- BACKEND_URL (optional; defaults to http://localhost:8000 for scripts)
- FIREBASE_ID_TOKEN (for smoke scripts; operator obtains a valid ID token for a test user)

Principles
- Do not hardcode secrets.
- Scripts only read env vars and do not print secret values.
- Startup fails fast: the backend will exit if critical services are not reachable or required env vars are missing.

Start the backend (example)

1) Export env vars in your shell (do not paste secrets into logs). Example (bash):

```bash
export FIREBASE_PROJECT_ID=your-project-id
export FIREBASE_CLIENT_EMAIL=service-account-email@project.iam.gserviceaccount.com
export FIREBASE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
export FIREBASE_STORAGE_BUCKET=your-bucket-name
export GEMINI_API_KEY=xxxxx
export NANO_BANANA_API_KEY=xxxxx
export NANO_BANANA_ENDPOINT=https://api.nanobanana.example/generate
export VEO_API_KEY=xxxxx
export VEO_ENDPOINT=https://api.veo.example/jobs
export DEFAULT_MODEL=gemini-2.0-flash
```

2) Start the backend (inside the project root):

```bash
# from repo root
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

Health endpoint

- URL: `GET /health`
- Example curl:

```bash
curl -sS $BACKEND_URL/health | jq
```

- Expected response when ready:

```json
{
  "ok": true,
  "services": {
    "firestore": true,
    "storage": true,
    "gemini": true,
    "nano_banana": true,
    "veo": true
  }
}
```

- If any service is false, the startup will have failed earlier and logs will include a grouped JSON error describing missing env vars or connectivity issues.

Smoke tests (no secrets printed)

The repository includes `scripts/validate_env.py`, `scripts/smoke_chat.py`, `scripts/smoke_image.py`, `scripts/smoke_video.py` for operator validation.

1) Validate environment variables (quick check):

```bash
python3 scripts/validate_env.py
```

- Output: lists any missing env vars and returns non-zero on failure.

2) Chat streaming smoke test

- Purpose: Verify SSE streaming starts and the assistant message reaches `status: done` in Firestore via the backend listing endpoint.
- Run:

```bash
export BACKEND_URL=http://localhost:8000
export FIREBASE_ID_TOKEN=<id_token_for_test_user>
python3 scripts/smoke_chat.py
```

- Expected:
  - Script prints meta containing `chat_id` and `message_id` and then prints `PASS: chat streaming completed and persisted (status=done)`.

- Quick curl variant (manual):

```bash
curl -N -H "Authorization: Bearer $FIREBASE_ID_TOKEN" -X POST $BACKEND_URL/chat/stream -d '{"message":"hello","request_id":"req-123"}' -H "Content-Type: application/json"
```

- Expected SSE initial meta event containing `chat_id` and `message_id`, followed by `token` events and final `done` event.

3) Image generation smoke test

- Run the script:

```bash
python3 scripts/smoke_image.py
```

- Expected: script prints `PASS: image generation completed and image URL present` within a couple minutes.

- Manual curl:

```bash
curl -X POST $BACKEND_URL/image/generate -H "Authorization: Bearer $FIREBASE_ID_TOKEN" -H "Content-Type: application/json" -d '{"prompt":"test image"}' | jq
```

- Expected response: `{"ok": true, "chat_id": "...", "message_id": "..."}` then poll `GET /history/chats/{chat_id}` until message with `type: "image"` and `images: [ {"url": ...} ]` appears.

4) Video generation smoke test

- Run the script:

```bash
python3 scripts/smoke_video.py
```

- Expected: script prints `PASS: video job completed and video_url present` (may take several minutes depending on provider).

- Manual curl to submit:

```bash
curl -X POST $BACKEND_URL/video/generate -H "Authorization: Bearer $FIREBASE_ID_TOKEN" -H "Content-Type: application/json" -d '{"prompt":"test video"}' | jq
```

- Then poll:

```bash
curl -H "Authorization: Bearer $FIREBASE_ID_TOKEN" $BACKEND_URL/video/status/<job_id> | jq
```

Common failure modes and fixes

- Backend exits immediately on start with a grouped JSON error in logs:
  - Cause: missing env vars or cannot reach Firestore/Storage.
  - Fix: ensure service account env vars (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) are set and correct, ensure `FIREBASE_STORAGE_BUCKET` is set and the service account has permission. Check network egress rules.

- `/health` returns a service as false:
  - If `firestore: false` — verify Firebase Admin creds and that project exists. Try running `python3 -c "import firebase_admin; print(firebase_admin)"` and check logs.
  - If `storage: false` — verify the `FIREBASE_STORAGE_BUCKET` name and that the service account has storage access.
  - If `gemini`/`nano_banana`/`veo` are false — ensure respective API keys are provided.

- Smoke test times out waiting for `done`:
  - For chat: check backend logs for errors. Ensure the `GEMINI_API_KEY` is valid and the generator endpoint can be reached.
  - For image/video: check `NANO_BANANA_API_KEY`, `VEO_API_KEY` and their endpoints. Check logs for background task errors and for request failure status recorded in Firestore under `users/{uid}/requests/{request_id}`.

- Authentication failures (401):
  - Ensure the `FIREBASE_ID_TOKEN` used for tests is valid and not expired. Obtain a fresh ID token via the client or Firebase CLI.

Logging & traceability

- All requests are logged as structured JSON. Logs include the following fields when available:
  - `request_id` — X-Request-Id or provided request_id
  - `uid` — anonymized presence from Authorization header (scripts send a real token; logs show presence)
  - `chat_id`
  - `model`
  - `generation_type` — one of `text`, `image`, `video`

Example log lines (one per flow)

- Text stream start:

```json
{"path":"/chat/stream","method":"POST","status_code":200,"latency":0.123,"request_id":"req-...","uid":"auth","chat_id":"chat-...","model":"gemini-2.0-flash","generation_type":"text"}
```

- Image generation request:

```json
{"path":"/image/generate","method":"POST","status_code":200,"latency":0.45,"request_id":"req-...","uid":"auth","chat_id":"chat-...","model":"gemini-2.0-flash","generation_type":"image"}
```

- Video generation request:

```json
{"path":"/video/generate","method":"POST","status_code":200,"latency":0.34,"request_id":"req-...","uid":"auth","chat_id":"chat-...","model":"gemini-2.0-flash","generation_type":"video","job_id":"videojob-..."}
```

Troubleshooting tips

- If background tasks are failing (image/video): check backend logs for background error blocks; the Firestore `requests` doc for the given `request_id` will contain `status: "error"` and an `error` string.
- If uploads to storage fail: ensure the service account used by `FIREBASE_PRIVATE_KEY` has `roles/storage.objectAdmin` or appropriate permissions.
- For intermittent network errors: verify outbound firewall rules and provider rate limits.

Safety notes

- Do not paste private keys or tokens into shared logs.
- Smoke scripts will not print secrets; they only print PASS/FAIL and identifiers.

Contact
Grounding (Tavily) validation

- Ensure `TAVILY_API_KEY` is set and backend started; `/health` will report `tavily: true` when present.
- To test grounding manually: send a message with grounding enabled (frontend toggle) or via curl:

```bash
curl -X POST $BACKEND_URL/chat/stream -H "Authorization: Bearer $FIREBASE_ID_TOKEN" -H "Content-Type: application/json" -d '{"message":"Who is the current president of France?","grounding":true}' -N
```

- Expected: SSE stream will emit a `meta` event; the corresponding assistant message in Firestore will include `grounding` (array of results) and `citations` (index/url/title). The assistant content should include inline markers like `[1]` and the UI will render a "Sources" list beneath the message.
- If Tavily fails, the stream returns an `error` event and the request doc will show `status: "error"` with an `error` string describing the failure.


- For further help, include the exact grouped startup log (it does not include secret values) and the output of the smoke script that failed.
