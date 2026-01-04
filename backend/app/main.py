from fastapi import FastAPI, Request, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import asyncio
import uuid
import logging
from typing import Optional
import requests

app = FastAPI(title="Gemini Clone Backend")


# Structured JSON logging setup
import json
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(message)s'))
# Respect environment to reduce logs in production
env = os.getenv("PYTHON_ENV") or os.getenv("ENV") or "development"
if env == "production":
    logging.getLogger().setLevel(logging.INFO)
else:
    logging.getLogger().setLevel(logging.DEBUG)
logging.getLogger().addHandler(handler)


ALLOWED_MODELS = ["gemini-2.0-flash", "gemini-3.0-pro-preview"]
REQUEST_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days for request mappings
ABORTED_TTL_SECONDS = 60 * 60 * 24  # 1 day for aborted streams
IMAGE_RATE_LIMIT_PER_HOUR = 5
VIDEO_RATE_LIMIT_PER_HOUR = 2
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
MAX_ATTACHMENT_SIZE_BYTES = int(os.getenv("MAX_ATTACHMENT_SIZE_BYTES", str(10 * 1024 * 1024)))
STREAM_UPDATE_INTERVAL_MS = int(os.getenv("STREAM_UPDATE_INTERVAL_MS", "500"))
# Retention defaults: how long to keep generated media and requests. Adjust via operator-run cleanup.
MEDIA_RETENTION_DAYS = int(os.getenv("MEDIA_RETENTION_DAYS", "30"))  # purge generated media older than this



@app.middleware("http")
async def request_timing_middleware(request: Request, call_next):
    start = time.time()
    # Do not consume request body here; prefer header or query param for request id
    request_id = request.headers.get("X-Request-Id") or request.query_params.get("request_id")
    uid = None
    try:
        # attempt to read auth header minimally
        auth = request.headers.get("authorization")
        if auth and auth.startswith("Bearer "):
            # do not verify token here, just include header present
            uid = "auth"
    except Exception:
        pass
    # attempt to read lightweight metadata from headers/query to improve logs
    model = request.headers.get("X-Model") or request.query_params.get("model")
    chat_id = request.headers.get("X-Chat-Id") or request.query_params.get("chat_id")
    generation_type = request.headers.get("X-Generation-Type") or request.query_params.get("type")

    resp = await call_next(request)
    latency = time.time() - start
    log = {
        "path": request.url.path,
        "method": request.method,
        "status_code": resp.status_code,
        "latency": latency,
        "request_id": request_id,
        "uid": uid,
        "chat_id": chat_id,
        "model": model,
        "generation_type": generation_type,
    }
    logging.info(json.dumps(log))
    return resp

origins = [os.getenv("FRONTEND_ORIGIN", "*")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Firebase Admin initialization
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials


def init_firebase():
    """
    Initialize Firebase Admin SDK with service account credentials.
    Returns True if initialization succeeded, False otherwise.
    Gracefully handles missing or invalid credentials.
    """
    if firebase_admin._apps:
        return True
    
    proj_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")
    
    if not (proj_id and client_email and private_key):
        # Skip Firebase initialization if credentials are missing
        logging.warning("Firebase credentials not fully configured. Firebase services will be unavailable.")
        return False
    
    try:
        # private_key in env may have escaped newlines - handle both \n and \\n
        private_key = private_key.replace('\\n', '\n')
        
        service_account = {
            "type": "service_account",
            "project_id": proj_id,
            "private_key": private_key,
            "client_email": client_email,
        }
        cred = credentials.Certificate(service_account)
        firebase_admin.initialize_app(cred)
        
        # Test firestore client initialization
        try:
            from firebase_admin import firestore as _fs
            _fs.client()
        except Exception as e:
            logging.warning(f"Firestore client initialization warning: {e}")
        
        logging.info("Firebase Admin SDK initialized successfully")
        return True
    except Exception as e:
        logging.error(f"Failed to initialize Firebase Admin SDK: {e}")
        return False


init_firebase()


# Environment variables split into REQUIRED (fatal if missing) and OPTIONAL (degraded features)
# For now, we treat all as optional to allow graceful degradation
# Adjust this list if certain vars become truly fatal for core operation
REQUIRED_ENV_VARS = []  # Empty for now - all features degrade gracefully

OPTIONAL_ENV_VARS = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_STORAGE_BUCKET",
    "GEMINI_API_KEY",
    "NANO_BANANA_API_KEY",
    "VEO_API_KEY",
    "TAVILY_API_KEY",
]


def _check_http_endpoint(url: Optional[str], api_key_name: str) -> bool:
    if not url:
        return False
    try:
        # lightweight HEAD request to verify reachability
        r = requests.head(url, timeout=5)
        return r.status_code < 500
    except Exception:
        return False


def check_and_increment_grounding_quota(uid: str) -> bool:
    """Per-user grounding quota. Uses Firestore quota doc under users/{uid}/quota/usage."""
    fs = get_fs()
    ref = user_quota_ref(uid)
    now = time.time()
    hour_start = int(now // 3600) * 3600

    limit = int(os.getenv("TAVILY_MAX_QUERIES_PER_HOUR", "20"))

    def txn(tx):
        doc = tx.get(ref)
        data = {"grounding": {}, "updatedAt": server_timestamp()}
        if doc and doc.exists:
            data = doc.to_dict()
        counts = data.get("grounding", {}) or {}
        count = counts.get(str(hour_start), 0)
        if count >= limit:
            raise Exception("quota_exceeded")
        counts[str(hour_start)] = count + 1
        data["grounding"] = counts
        tx.set(ref, data, merge=True)

    try:
        fs.transaction().run(lambda t: txn(t))
        return True
    except Exception:
        return False


@app.on_event("startup")
def startup_checks():
    """
    Perform startup validation and diagnostics.
    Logs warnings for missing optional services but does NOT exit.
    Only truly fatal misconfigurations should prevent startup.
    """
    errors = []
    warnings = []
    
    # Check for missing optional environment variables
    missing_optional = [k for k in OPTIONAL_ENV_VARS if not os.getenv(k)]
    if missing_optional:
        warnings.append({"missing_optional_env_vars": missing_optional})
        logging.warning(f"Optional environment variables not set: {missing_optional}")
    
    # Check for missing required environment variables (if any)
    missing_required = [k for k in REQUIRED_ENV_VARS if not os.getenv(k)]
    if missing_required:
        errors.append({"missing_required_env_vars": missing_required})
        logging.error(f"Required environment variables not set: {missing_required}")
    
    # Verify Firestore connectivity (non-fatal)
    fs_ok = False
    try:
        from firebase_admin import firestore as _fs
        _fs.client().collections()
        fs_ok = True
        logging.info("Firestore connectivity: OK")
    except Exception as e:
        warnings.append({"firestore_warning": str(e)})
        logging.warning(f"Firestore not available: {e}")
    
    # Verify storage bucket access if configured (non-fatal)
    storage_ok = False
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
    if bucket_name:
        try:
            from firebase_admin import storage as _storage
            b = _storage.bucket(bucket_name)
            # attempt to get bucket metadata
            _ = b.name
            storage_ok = True
            logging.info("Firebase Storage connectivity: OK")
        except Exception as e:
            warnings.append({"storage_warning": str(e)})
            logging.warning(f"Firebase Storage not available: {e}")
    else:
        warnings.append({"storage_warning": "FIREBASE_STORAGE_BUCKET not set"})
        logging.warning("Firebase Storage not configured")
    
    # External generator endpoints - check for API keys (non-fatal)
    gemini_ok = bool(os.getenv("GEMINI_API_KEY"))
    nano_ok = bool(os.getenv("NANO_BANANA_API_KEY"))
    veo_ok = bool(os.getenv("VEO_API_KEY"))
    tavily_ok = bool(os.getenv("TAVILY_API_KEY"))
    
    if not gemini_ok:
        logging.warning("GEMINI_API_KEY not set - chat functionality will be unavailable")
    if not nano_ok:
        logging.warning("NANO_BANANA_API_KEY not set - image generation will be unavailable")
    if not veo_ok:
        logging.warning("VEO_API_KEY not set - video generation will be unavailable")
    if not tavily_ok:
        logging.warning("TAVILY_API_KEY not set - grounding/search will be unavailable")
    
    # Create startup diagnostics summary
    diagnostics = {
        "ok": len(errors) == 0,  # Only false if there are true errors
        "checks": {
            "firestore": fs_ok,
            "storage": storage_ok,
            "gemini": gemini_ok,
            "nano_banana": nano_ok,
            "veo": veo_ok,
            "tavily": tavily_ok,
        },
        "warnings": warnings,
        "errors": errors,
    }
    
    # Log comprehensive startup diagnostics
    logging.info(json.dumps({"startup_diagnostics": diagnostics}))
    
    # Only exit if there are truly fatal errors (required env vars missing)
    if missing_required:
        logging.error("Fatal: Required environment variables missing. Cannot start.")
        raise SystemExit("Startup validation failed due to missing required configuration")
    
    # Otherwise, start normally with degraded features
    if warnings:
        logging.warning("Service started with some features unavailable. Check /health endpoint for details.")



async def verify_firebase_token(request: Request):
    auth = request.headers.get("authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    id_token = auth.split(" ", 1)[1]
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token")
    user = {
        "uid": decoded.get("uid"),
        "email": decoded.get("email"),
        "is_anonymous": decoded.get("firebase", {}).get("sign_in_provider") == "anonymous",
        "provider": decoded.get("firebase", {}).get("sign_in_provider"),
    }
    request.state.user = user
    return user


def make_error(code: str, message: str):
    return {"ok": False, "error": {"code": code, "message": message}}


def log_info(uid: Optional[str], request_id: Optional[str], msg: str, **kwargs):
    base = {"uid": uid, "request_id": request_id}
    base.update(kwargs)
    logging.info(f"{msg} | %s", base)


@app.get("/health")
async def health():
    """
    Health check endpoint that reports status of all services and dependencies.
    Returns 200 OK even if some services are unavailable, with details about each service.
    """
    checks = {"firestore": False, "storage": False, "gemini": False, "nano_banana": False, "veo": False, "tavily": False}
    missing_env_vars = []
    
    # Check environment variables
    for var in OPTIONAL_ENV_VARS:
        if not os.getenv(var):
            missing_env_vars.append(var)
    
    # Firestore
    try:
        from firebase_admin import firestore as _fs
        _fs.client().collections()
        checks["firestore"] = True
    except Exception:
        checks["firestore"] = False

    # Storage
    try:
        bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
        if bucket_name:
            from firebase_admin import storage as _storage
            b = _storage.bucket(bucket_name)
            _ = b.name
            checks["storage"] = True
    except Exception:
        checks["storage"] = False

    # External services: presence of API keys
    checks["gemini"] = bool(os.getenv("GEMINI_API_KEY"))
    checks["nano_banana"] = bool(os.getenv("NANO_BANANA_API_KEY"))
    checks["veo"] = bool(os.getenv("VEO_API_KEY"))
    checks["tavily"] = bool(os.getenv("TAVILY_API_KEY"))

    ok = all(checks.values())
    
    response = {
        "ok": ok,
        "services": checks,
    }
    
    # Include missing env vars if any, to help with debugging
    if missing_env_vars:
        response["missing_env_vars"] = missing_env_vars
        response["message"] = "Some services unavailable due to missing configuration"
    
    return response


@app.get("/auth/verify")
async def auth_verify(user=Depends(verify_firebase_token)):
    return {"ok": True, "user": user}


@app.get("/auth/me")
async def auth_me(request: Request, user=Depends(verify_firebase_token)):
    return {"ok": True, "user": request.state.user}


@app.post("/files/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(verify_firebase_token)):
    uid = user["uid"]
    fs = get_fs()
    contents = await file.read()
    size = len(contents)
    if size > MAX_ATTACHMENT_SIZE_BYTES:
        return JSONResponse(status_code=400, content=make_error("TOO_LARGE", f"Attachment exceeds {MAX_ATTACHMENT_SIZE_BYTES} bytes"))
    allowed_prefixes = os.getenv("ALLOWED_ATTACHMENT_PREFIXES", "image/,application/pdf,text/").split(",")
    ctype = (file.content_type or "")
    if not any(ctype.startswith(p) for p in allowed_prefixes):
        return JSONResponse(status_code=400, content=make_error("INVALID_TYPE", "Attachment type not allowed"))

    # store in Firebase Storage if configured
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
    attachment_id = str(uuid.uuid4())
    storage_path = None
    try:
        if bucket_name:
            from firebase_admin import storage
            bucket = storage.bucket(bucket_name)
            path = f"attachments/{uid}/{attachment_id}/{file.filename}"
            blob = bucket.blob(path)
            blob.upload_from_string(contents, content_type=ctype)
            storage_path = path
        else:
            dest = f"/tmp/{int(time.time())}_{attachment_id}_{file.filename}"
            with open(dest, "wb") as f:
                f.write(contents)
            storage_path = dest
    except Exception as e:
        return JSONResponse(status_code=500, content=make_error("STORAGE_ERROR", str(e)))

    # persist metadata in Firestore under users/{uid}/attachments/{attachment_id}
    att_ref = fs.collection("users").document(uid).collection("attachments").document(attachment_id)
    att_ref.set({"filename": file.filename, "contentType": ctype, "size": size, "storagePath": storage_path, "createdAt": server_timestamp(), "owner": uid})
    return {"ok": True, "attachment_id": attachment_id}


def get_fs():
    from firebase_admin import firestore
    return firestore.client()


def server_timestamp():
    from firebase_admin import firestore
    return firestore.SERVER_TIMESTAMP


def chat_doc_ref(uid: str, chat_id: str):
    fs = get_fs()
    return fs.collection("users").document(uid).collection("chats").document(chat_id)


def message_doc_ref(uid: str, chat_id: str, message_id: str):
    return chat_doc_ref(uid, chat_id).collection("messages").document(message_id)


def user_quota_ref(uid: str):
    fs = get_fs()
    return fs.collection("users").document(uid).collection("quota").document("usage")


def check_and_increment_quota(uid: str, kind: str) -> bool:
    """Return True if allowed; increment counter."""
    fs = get_fs()
    ref = user_quota_ref(uid)
    now = time.time()
    hour_start = int(now // 3600) * 3600

    def txn(tx):
        doc = tx.get(ref)
        data = {"images": {}, "videos": {}, "updatedAt": server_timestamp()}
        if doc and doc.exists:
            data = doc.to_dict()
        counts = data.get(kind, {})
        count = counts.get(str(hour_start), 0) if counts else 0
        limit = IMAGE_RATE_LIMIT_PER_HOUR if kind == "images" else VIDEO_RATE_LIMIT_PER_HOUR
        if count >= limit:
            raise Exception("quota_exceeded")
        # increment
        counts = counts or {}
        counts[str(hour_start)] = count + 1
        data[kind] = counts
        tx.set(ref, data, merge=True)

    try:
        fs.transaction().run(lambda t: txn(t))
        return True
    except Exception:
        return False



@app.post("/chat/stream")
async def chat_stream(request: Request, user=Depends(verify_firebase_token)):
    body = await request.json()
    prompt = body.get("message") or body.get("prompt") or ""
    model = body.get("model") or os.getenv("DEFAULT_MODEL", "gemini-2.0-flash")
    chat_id = body.get("chat_id")
    request_id = body.get("request_id") or str(uuid.uuid4())
    grounding = bool(body.get("grounding", False))

    uid = request.state.user["uid"]
    fs = get_fs()

    # Enforce simple server-side validations
    if not prompt or len(prompt) > 20000:
        return JSONResponse(status_code=400, content=make_error("INVALID_INPUT", "Message missing or too long"))

    # Rate limiting / max concurrent streams: single active stream per user
    meta_ref = fs.collection("users").document(uid).collection("meta").document("state")
    requests_ref = fs.collection("users").document(uid).collection("requests").document(request_id)

    uid = request.state.user["uid"]
    fs = get_fs()

    # Validate model choice server-side. If chat exists, use chat.model; otherwise use provided model but ensure allowed.
    if model not in ALLOWED_MODELS:
        return JSONResponse(status_code=400, content=make_error("MODEL_NOT_ALLOWED", f"Model {model} is not permitted"))

    # Use transaction to create chat (if needed), user message, assistant message and register request mapping
    def create_txn(transaction):
        # simple rate-limit: ensure no other active request
        meta_snap = None
        try:
            meta_snap = transaction.get(meta_ref)
        except Exception:
            meta_snap = None
        if meta_snap and meta_snap.exists:
            m = meta_snap.to_dict()
            active = m.get("active_request_id")
            if active and active != request_id:
                raise HTTPException(status_code=429, detail="Active stream in progress")

        req_snap = None
        try:
            req_snap = transaction.get(requests_ref)
        except Exception:
            req_snap = None

        if req_snap and req_snap.exists:
            # Idempotent: if request already created, reuse mapping
            r = req_snap.to_dict()
            return {"chat_id": r.get("chat_id"), "assistant_msg_id": r.get("assistant_msg_id"), "user_msg_id": r.get("user_msg_id")}

        # create or reuse chat
        effective_model = model
        if chat_id:
            chat_ref = chat_doc_ref(uid, chat_id)
            # enforce ownership: ensure chat exists and belongs to user (document path ensures that)
            # also read chat model and override incoming model
            try:
                snap = transaction.get(chat_ref)
                if snap and snap.exists:
                    chat_model = snap.to_dict().get("model")
                    if chat_model and chat_model in ALLOWED_MODELS:
                        effective_model = chat_model
            except Exception:
                pass
        else:
            new_chat_id = fs.collection("users").document(uid).collection("chats").document().id
            chat_ref = chat_doc_ref(uid, new_chat_id)
            transaction.set(chat_ref, {
                "title": "New chat",
                "model": model,
                "createdAt": server_timestamp(),
                "updatedAt": server_timestamp(),
                "pinned": False,
            })

        # deterministic message ids per request for idempotency
        user_msg_id = f"{request_id}-user"
        assistant_msg_id = f"{request_id}-assistant"
        user_msg_ref = chat_ref.collection("messages").document(user_msg_id)
        assistant_msg_ref = chat_ref.collection("messages").document(assistant_msg_id)

        # attachments: validate attachments belong to user
        attachments = []
        try:
            req_attach_ids = body.get("attachments") or []
            for aid in req_attach_ids:
                att_doc = fs.collection("users").document(uid).collection("attachments").document(aid).get()
                if att_doc.exists:
                    attachments.append(aid)
        except Exception:
            attachments = []

        transaction.set(user_msg_ref, {"role": "user", "content": prompt, "createdAt": server_timestamp(), "status": "done", "attachments": attachments, "grounding": grounding})
        transaction.set(assistant_msg_ref, {"role": "assistant", "content": "", "createdAt": server_timestamp(), "status": "streaming"})

        # update chat title from first user message if default
        try:
            chat_snap = transaction.get(chat_ref)
            if chat_snap.exists and chat_snap.to_dict().get("title") == "New chat":
                transaction.update(chat_ref, {"title": prompt[:120], "updatedAt": server_timestamp()})
        except Exception:
            pass

        # register request mapping and mark active
        transaction.set(requests_ref, {"chat_id": chat_ref.id, "user_msg_id": user_msg_id, "assistant_msg_id": assistant_msg_id, "status": "streaming", "createdAt": server_timestamp()})
        transaction.set(meta_ref, {"active_request_id": request_id, "active_assistant_msg_id": assistant_msg_id, "last_stream_at": server_timestamp()}, merge=True)

        return {"chat_id": chat_ref.id, "assistant_msg_id": assistant_msg_id, "user_msg_id": user_msg_id, "effective_model": effective_model}

    fs_transaction = fs.transaction()
    try:
        mapping = fs_transaction.run(create_txn)
    except HTTPException as he:
        return JSONResponse(status_code=429, content=make_error("RATE_LIMIT", str(he.detail)))
    except Exception as e:
        return JSONResponse(status_code=500, content=make_error("UNKNOWN", str(e)))

    chat_id = mapping["chat_id"]
    assistant_msg_id = mapping["assistant_msg_id"]
    model = mapping.get("effective_model", model)

    # structured log for stream start
    try:
        log_info(uid, request_id, "start_stream", chat_id=chat_id, model=model, generation_type="text")
    except Exception:
        pass

    chat_ref = chat_doc_ref(uid, chat_id)
    assistant_msg_ref = chat_ref.collection("messages").document(assistant_msg_id)

    from .chat import _gemini_token_stream

    async def event_generator():
        # emit meta event so frontend knows authoritative ids
        meta = f"event: meta\ndata: {{ \"chat_id\": \"{chat_id}\", \"message_id\": \"{assistant_msg_id}\" }}\n\n"
        yield meta

        # If request mapping already exists and is streaming, do not start a new model generation.
        try:
            req_doc = fs.collection("users").document(uid).collection("requests").document(request_id).get()
            if req_doc.exists and req_doc.to_dict().get("status") == "streaming":
                # Let the client know the message is still generating; don't spawn a duplicate generation.
                yield f"event: status\ndata: {{\"status\": \"streaming\"}}\n\n"
                return
        except Exception:
            pass

        # If grounding requested, perform web search via Tavily, persist grounding results, and inject system context
        system_context = None
        try:
            if grounding:
                # quota
                allowed = check_and_increment_grounding_quota(uid)
                if not allowed:
                    try:
                        fs.collection("users").document(uid).collection("requests").document(request_id).update({"status": "error", "error": "grounding_quota_exceeded", "updatedAt": server_timestamp()})
                    except Exception:
                        pass
                    yield f"event: error\ndata: {{\"message\": \"Grounded queries quota exceeded\"}}\n\n"
                    return

                # import local search service
                try:
                    from backend.services.search import web_search
                except Exception:
                    from services.search import web_search

                try:
                    results = web_search(prompt)
                except Exception as e:
                    # surface structured error
                    try:
                        fs.collection("users").document(uid).collection("requests").document(request_id).update({"status": "error", "error": str(e), "updatedAt": server_timestamp()})
                        chat_ref.collection("messages").document(assistant_msg_id).update({"status": "error", "error": str(e), "updatedAt": server_timestamp()})
                    except Exception:
                        pass
                    yield f"event: error\ndata: {{\"message\": \"Grounding failed: {str(e)}\"}}\n\n"
                    return

                # store grounding results and citations on assistant message
                citations = []
                for r in results:
                    citations.append({"index": r.get("index"), "url": r.get("url"), "title": r.get("title")})

                try:
                    chat_ref.collection("messages").document(assistant_msg_id).update({"grounding": results, "citations": citations, "status": "streaming", "updatedAt": server_timestamp()})
                    fs.collection("users").document(uid).collection("requests").document(request_id).update({"grounding": True, "status": "streaming", "updatedAt": server_timestamp()})
                except Exception:
                    pass

                try:
                    log_info(uid, request_id, "start_generation", chat_id=chat_ref.id, model=model, generation_type="grounded")
                except Exception:
                    pass

                # Build system_context for the model. We include numbered summaries (title + snippet + published_date).
                lines = ["You have access to the following web search results. Cite sources using [n] markers where n is the index. Use only these sources for factual claims and never invent URLs."]
                for r in results:
                    pd = r.get("published_date")
                    pd_str = f" ({pd})" if pd else ""
                    lines.append(f"[{r.get('index')}] {r.get('title')}{pd_str}: {r.get('snippet')}")
                system_context = "\n".join(lines)

                # add headers so middleware logs include generation_type
                try:
                    request._headers = {**getattr(request, "_headers", {}), "X-Generation-Type": "grounded"}
                except Exception:
                    pass
        except Exception:
            # If anything unexpected happens, surface an error
            yield f"event: error\ndata: {{\"message\": \"Grounding pipeline failure\"}}\n\n"
            return

        update_buffer = ""
        last_update = time.time()
        try:
            try:
                token_stream = _gemini_token_stream(prompt, model, system_context=system_context)
            except Exception as e:
                # mark error
                try:
                    assistant_msg_ref.update({"status": "error", "updatedAt": server_timestamp()})
                    fs.collection("users").document(uid).collection("requests").document(request_id).update({"status": "error", "error": str(e), "updatedAt": server_timestamp()})
                except Exception:
                    pass
                yield f"event: error\ndata: {{\"message\": \"{str(e)}\"}}\n\n"
                return

            async for token in token_stream:
                # handle client disconnect
                try:
                    if await request.is_disconnected():
                        # mark aborted
                        try:
                            assistant_msg_ref.update({"status": "error", "updatedAt": server_timestamp()})
                            fs.collection("users").document(uid).collection("requests").document(request_id).update({"status": "error", "error": "client_disconnected", "updatedAt": server_timestamp()})
                        except Exception:
                            pass
                        yield f"event: error\ndata: {{\"message\": \"client disconnected\"}}\n\n"
                        return
                except Exception:
                    pass

                token_payload = token.replace("\n", "\\n")
                yield f"event: token\ndata: {{\"text\": \"{token_payload}\"}}\n\n"

                update_buffer += token

                if time.time() - last_update > (STREAM_UPDATE_INTERVAL_MS / 1000.0):
                    # atomically append buffered content
                    def append_txn(transaction):
                        doc = transaction.get(assistant_msg_ref)
                        cur = ""
                        if doc and doc.exists:
                            cur = doc.to_dict().get("content", "") or ""
                        transaction.update(assistant_msg_ref, {"content": cur + update_buffer, "updatedAt": server_timestamp()})
                    try:
                        fs.transaction().run(append_txn)
                    except Exception:
                        # best-effort fallback
                        try:
                            cur = assistant_msg_ref.get().to_dict().get("content", "")
                            assistant_msg_ref.update({"content": cur + update_buffer, "updatedAt": server_timestamp()})
                        except Exception:
                            pass
                    update_buffer = ""
                    last_update = time.time()

            # flush remaining
            if update_buffer:
                try:
                    def append_txn2(transaction):
                        doc = transaction.get(assistant_msg_ref)
                        cur = ""
                        if doc and doc.exists:
                            cur = doc.to_dict().get("content", "") or ""
                        transaction.update(assistant_msg_ref, {"content": cur + update_buffer, "updatedAt": server_timestamp()})
                    fs.transaction().run(append_txn2)
                except Exception:
                    try:
                        cur = assistant_msg_ref.get().to_dict().get("content", "")
                        assistant_msg_ref.update({"content": cur + update_buffer, "updatedAt": server_timestamp()})
                    except Exception:
                        pass

            # finalize
            try:
                def finalize_tx(transaction):
                    transaction.update(assistant_msg_ref, {"status": "done", "updatedAt": server_timestamp()})
                    transaction.update(chat_ref, {"updatedAt": server_timestamp()})
                    transaction.update(fs.collection("users").document(uid).collection("requests").document(request_id), {"status": "done", "updatedAt": server_timestamp()})
                    transaction.set(meta_ref, {"active_request_id": None, "active_assistant_msg_id": None}, merge=True)
                fs.transaction().run(finalize_tx)
            except Exception:
                try:
                    assistant_msg_ref.update({"status": "done", "updatedAt": server_timestamp()})
                except Exception:
                    pass

            yield "event: done\ndata: {}\n\n"
        except Exception as e:
            try:
                assistant_msg_ref.update({"status": "error", "updatedAt": server_timestamp()})
                fs.collection("users").document(uid).collection("requests").document(request_id).update({"status": "error", "error": str(e), "updatedAt": server_timestamp()})
                fs.collection("users").document(uid).collection("meta").document("state").set({"active_request_id": None, "active_assistant_msg_id": None}, merge=True)
            except Exception:
                pass
            yield f"event: error\ndata: {{\"message\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/image/generate")
async def image_generate(request: Request, user=Depends(verify_firebase_token)):
    body = await request.json()
    prompt = body.get("prompt")
    chat_id = body.get("chat_id")
    request_id = body.get("request_id") or str(uuid.uuid4())
    model = body.get("model") or os.getenv("DEFAULT_MODEL", "gemini-2.0-flash")
    uid = user["uid"]
    fs = get_fs()

    if not prompt:
        return JSONResponse(status_code=400, content=make_error("INVALID_INPUT", "prompt required"))

    # quota
    allowed = check_and_increment_quota(uid, "images")
    if not allowed:
        return JSONResponse(status_code=429, content=make_error("RATE_LIMIT", "Image generation limit exceeded"))

    # create assistant message transactionally (idempotent)
    chat_ref = chat_doc_ref(uid, chat_id) if chat_id else None
    if not chat_ref:
        # create chat
        chat_id = fs.collection("users").document(uid).collection("chats").document().id
        chat_ref = chat_doc_ref(uid, chat_id)
        chat_ref.set({"title": prompt[:120], "model": model, "createdAt": server_timestamp(), "updatedAt": server_timestamp()})

    assistant_msg_id = f"{request_id}-assistant-image"
    assistant_msg_ref = chat_ref.collection("messages").document(assistant_msg_id)
    # create assistant message with status generating
    try:
        def create_tx(tx):
            if tx.get(assistant_msg_ref).exists:
                return
            tx.set(assistant_msg_ref, {"role": "assistant", "content": "", "type": "image", "images": [], "createdAt": server_timestamp(), "status": "generating", "model": model})
            tx.set(fs.collection("users").document(uid).collection("requests").document(request_id), {"chat_id": chat_ref.id, "assistant_msg_id": assistant_msg_id, "type": "image", "status": "generating", "createdAt": server_timestamp()})
            tx.set(fs.collection("users").document(uid).collection("meta").document("state"), {"active_request_id": request_id, "active_assistant_msg_id": assistant_msg_id}, merge=True)
        fs.transaction().run(create_tx)
    except Exception as e:
        return JSONResponse(status_code=500, content=make_error("UNKNOWN", str(e)))

    # structured log for video generation request
    try:
        log_info(uid, request_id, "start_generation", chat_id=chat_ref.id, model=model, generation_type="video", job_id=job_id)
    except Exception:
        pass

    # structured log for image generation request
    try:
        log_info(uid, request_id, "start_generation", chat_id=chat_ref.id, model=model, generation_type="image")
    except Exception:
        pass

    # background task to call Nano Banana and store results
    async def bg():
        try:
            api_key = os.getenv("NANO_BANANA_API_KEY")
            if not api_key:
                raise RuntimeError("NANO_BANANA_API_KEY not configured")
            # call external API (pseudo)
            import requests
            nb_url = os.getenv("NANO_BANANA_ENDPOINT", "https://api.nanobanana.example/generate")
            r = requests.post(nb_url, json={"prompt": prompt, "model": model}, headers={"Authorization": f"Bearer {api_key}"}, timeout=120)
            if r.status_code != 200:
                raise RuntimeError(f"nanobanana error: {r.status_code}")
            data = r.json()
            # data expected: {images: [{url: ...}, ...]}
            imgs = data.get("images") or []
            stored = []
            bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
            for it in imgs:
                url = it.get("url")
                # fetch remote bytes
                rr = requests.get(url, timeout=60)
                if rr.status_code != 200:
                    continue
                content = rr.content
                if len(content) > MAX_IMAGE_SIZE_BYTES:
                    continue
                filename = f"images/{uid}/{assistant_msg_id}/{str(uuid.uuid4())}.jpg"
                try:
                    if bucket_name:
                        from firebase_admin import storage
                        bucket = storage.bucket(bucket_name)
                        blob = bucket.blob(filename)
                        blob.upload_from_string(content, content_type=rr.headers.get('Content-Type', 'image/jpeg'))
                        storage_path = filename
                        public_url = blob.public_url
                    else:
                        dest = f"/tmp/{int(time.time())}_{uuid.uuid4()}.jpg"
                        with open(dest, "wb") as f:
                            f.write(content)
                        storage_path = dest
                        public_url = url
                except Exception:
                    storage_path = None
                    public_url = url
                stored.append({"url": public_url, "storagePath": storage_path, "size": len(content)})

            # update message
            chat_ref.collection("messages").document(assistant_msg_id).update({"images": stored, "status": "done", "updatedAt": server_timestamp()})
            fs.collection("users").document(uid).collection("requests").document(request_id).update({"status": "done", "updatedAt": server_timestamp()})
            fs.collection("users").document(uid).collection("meta").document("state").set({"active_request_id": None, "active_assistant_msg_id": None}, merge=True)
        except Exception as e:
            try:
                chat_ref.collection("messages").document(assistant_msg_id).update({"status": "error", "error": str(e), "updatedAt": server_timestamp()})
                fs.collection("users").document(uid).collection("requests").document(request_id).update({"status": "error", "error": str(e), "updatedAt": server_timestamp()})
            except Exception:
                pass

    asyncio.create_task(bg())
    return JSONResponse({"ok": True, "chat_id": chat_ref.id, "message_id": assistant_msg_id})


@app.post("/video/generate")
async def video_generate(request: Request, user=Depends(verify_firebase_token)):
    body = await request.json()
    prompt = body.get("prompt")
    chat_id = body.get("chat_id")
    request_id = body.get("request_id") or str(uuid.uuid4())
    model = body.get("model") or os.getenv("DEFAULT_MODEL", "gemini-2.0-flash")
    uid = user["uid"]
    fs = get_fs()

    if not prompt:
        return JSONResponse(status_code=400, content=make_error("INVALID_INPUT", "prompt required"))

    # quota
    allowed = check_and_increment_quota(uid, "videos")
    if not allowed:
        return JSONResponse(status_code=429, content=make_error("RATE_LIMIT", "Video generation limit exceeded"))

    # create chat if missing
    if not chat_id:
        chat_id = fs.collection("users").document(uid).collection("chats").document().id
        chat_ref = chat_doc_ref(uid, chat_id)
        chat_ref.set({"title": prompt[:120], "model": model, "createdAt": server_timestamp(), "updatedAt": server_timestamp()})
    else:
        chat_ref = chat_doc_ref(uid, chat_id)

    assistant_msg_id = f"{request_id}-assistant-video"
    assistant_msg_ref = chat_ref.collection("messages").document(assistant_msg_id)
    job_id = f"videojob-{str(uuid.uuid4())}"

    try:
        def create_tx(tx):
            if tx.get(assistant_msg_ref).exists:
                return
            tx.set(assistant_msg_ref, {"role": "assistant", "content": "", "type": "video", "video": {"job_id": job_id, "status": "queued"}, "createdAt": server_timestamp(), "status": "queued", "model": model})
            tx.set(fs.collection("users").document(uid).collection("video_jobs").document(job_id), {"prompt": prompt, "status": "queued", "createdAt": server_timestamp(), "request_id": request_id, "chat_id": chat_ref.id, "assistant_msg_id": assistant_msg_id})
            tx.set(fs.collection("users").document(uid).collection("requests").document(request_id), {"chat_id": chat_ref.id, "assistant_msg_id": assistant_msg_id, "type": "video", "status": "queued", "job_id": job_id, "createdAt": server_timestamp()})
        fs.transaction().run(create_tx)
    except Exception as e:
        return JSONResponse(status_code=500, content=make_error("UNKNOWN", str(e)))

    # start background submission to Veo
    async def bg():
        try:
            api_key = os.getenv("VEO_API_KEY")
            if not api_key:
                raise RuntimeError("VEO_API_KEY not configured")
            import requests
            veo_endpoint = os.getenv("VEO_ENDPOINT", "https://api.veo.example/jobs")
            r = requests.post(veo_endpoint, json={"prompt": prompt, "model": model}, headers={"Authorization": f"Bearer {api_key}"}, timeout=30)
            if r.status_code != 200:
                raise RuntimeError(f"veo submit error: {r.status_code}")
            res = r.json()
            external_job_id = res.get("job_id")
            # update job doc
            job_ref = fs.collection("users").document(uid).collection("video_jobs").document(job_id)
            job_ref.update({"external_job_id": external_job_id, "status": "generating", "updatedAt": server_timestamp()})
            # poll status until done/error
            status = "generating"
            video_url = None
            while status == "generating":
                try:
                    poll = requests.get(f"{veo_endpoint}/{external_job_id}", headers={"Authorization": f"Bearer {api_key}"}, timeout=30)
                    if poll.status_code != 200:
                        status = "error"
                        break
                    pj = poll.json()
                    status = pj.get("status")
                    if status == "completed":
                        video_url = pj.get("result_url")
                        break
                    if status == "failed":
                        break
                except Exception:
                    # sleep and retry
                    await asyncio.sleep(5)
                await asyncio.sleep(3)

            # finalize
            if status == "completed" and video_url:
                # fetch and store or keep external URL
                try:
                    job_ref.update({"status": "done", "video_url": video_url, "updatedAt": server_timestamp()})
                    chat_ref.collection("messages").document(assistant_msg_id).update({"video": {"url": video_url, "status": "done"}, "status": "done", "updatedAt": server_timestamp()})
                    fs.collection("users").document(uid).collection("requests").document(request_id).update({"status": "done", "updatedAt": server_timestamp()})
                except Exception:
                    pass
            else:
                job_ref.update({"status": "error", "updatedAt": server_timestamp()})
                chat_ref.collection("messages").document(assistant_msg_id).update({"video": {"status": "error"}, "status": "error", "updatedAt": server_timestamp()})
                fs.collection("users").document(uid).collection("requests").document(request_id).update({"status": "error", "updatedAt": server_timestamp()})
        except Exception as e:
            try:
                fs.collection("users").document(uid).collection("video_jobs").document(job_id).update({"status": "error", "error": str(e), "updatedAt": server_timestamp()})
                chat_ref.collection("messages").document(assistant_msg_id).update({"status": "error", "error": str(e), "updatedAt": server_timestamp()})
            except Exception:
                pass

    asyncio.create_task(bg())
    return JSONResponse({"ok": True, "job_id": job_id, "chat_id": chat_ref.id, "message_id": assistant_msg_id})


@app.get("/video/status/{job_id}")
async def video_status(job_id: str, user=Depends(verify_firebase_token)):
    uid = user["uid"]
    fs = get_fs()
    job_ref = fs.collection("users").document(uid).collection("video_jobs").document(job_id)
    doc = job_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    data = doc.to_dict()
    return {"ok": True, "job": data}


@app.get("/history/list")
async def history_list(user=Depends(verify_firebase_token)):
    # legacy: redirect to chats list
    uid = user["uid"]
    fs = get_fs()
    chats_q = fs.collection("users").document(uid).collection("chats").order_by("updatedAt", direction="DESCENDING")
    docs = chats_q.stream()
    out = []
    for d in docs:
        data = d.to_dict()
        out.append({"id": d.id, "title": data.get("title"), "model": data.get("model"), "pinned": data.get("pinned", False), "createdAt": data.get("createdAt"), "updatedAt": data.get("updatedAt")})
    return {"ok": True, "conversations": out}


@app.get("/history/chats")
async def get_chats(user=Depends(verify_firebase_token)):
    uid = user["uid"]
    fs = get_fs()
    chats_q = fs.collection("users").document(uid).collection("chats").order_by("updatedAt", direction="DESCENDING")
    docs = chats_q.stream()
    out = []
    for d in docs:
        data = d.to_dict()
        out.append({"id": d.id, "title": data.get("title"), "model": data.get("model"), "pinned": data.get("pinned", False), "createdAt": data.get("createdAt"), "updatedAt": data.get("updatedAt")})
    return {"ok": True, "chats": out}


@app.post("/history/chats")
async def create_chat(request: Request, user=Depends(verify_firebase_token)):
    body = await request.json()
    title = body.get("title") or "New chat"
    model = body.get("model") or os.getenv("DEFAULT_MODEL", "gemini-2.0-flash")
    uid = user["uid"]
    fs = get_fs()
    chat_ref = fs.collection("users").document(uid).collection("chats").document()
    chat_ref.set({"title": title, "model": model, "createdAt": server_timestamp(), "updatedAt": server_timestamp(), "pinned": False})
    return {"ok": True, "chat_id": chat_ref.id}


@app.get("/history/chats/{chat_id}")
async def get_chat(chat_id: str, user=Depends(verify_firebase_token)):
    uid = user["uid"]
    fs = get_fs()
    chat_ref = chat_doc_ref(uid, chat_id)
    snap = chat_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Chat not found")
    chat_data = snap.to_dict()
    msgs_q = chat_ref.collection("messages").order_by("createdAt", direction="ASCENDING")
    msgs = [ {"id": m.id, **m.to_dict()} for m in msgs_q.stream() ]
    return {"ok": True, "chat": {"id": chat_id, **chat_data}, "messages": msgs}


@app.get("/models")
async def list_models(user=Depends(verify_firebase_token)):
    return {"ok": True, "models": ALLOWED_MODELS}


@app.delete("/history/chats/{chat_id}")
async def delete_chat(chat_id: str, user=Depends(verify_firebase_token)):
    uid = user["uid"]
    fs = get_fs()
    chat_ref = chat_doc_ref(uid, chat_id)
    # delete messages in a batch to avoid orphaned docs
    try:
        batch = fs.batch()
        msgs = list(chat_ref.collection("messages").stream())
        for m in msgs:
            batch.delete(m.reference)
        batch.delete(chat_ref)
        batch.commit()

        # reassign active chat in settings if needed
        settings_ref = fs.collection("users").document(uid).collection("settings").document("meta")
        try:
            sdoc = settings_ref.get()
            last_active = None
            if sdoc.exists:
                last_active = sdoc.to_dict().get("lastActiveChat")
            if last_active == chat_id:
                # pick newest chat
                chats_q = fs.collection("users").document(uid).collection("chats").order_by("updatedAt", direction="DESCENDING").limit(1)
                docs = list(chats_q.stream())
                new_active = docs[0].id if docs else None
                settings_ref.set({"lastActiveChat": new_active, "updatedAt": server_timestamp()}, merge=True)
        except Exception:
            pass

        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete chat: {e}")


@app.post("/history/messages")
async def create_message(request: Request, user=Depends(verify_firebase_token)):
    body = await request.json()
    chat_id = body.get("chat_id")
    role = body.get("role")
    content = body.get("content")
    status = body.get("status") or ("done" if role == "user" else "streaming")
    if not chat_id or not role:
        raise HTTPException(status_code=400, detail="chat_id and role required")
    uid = user["uid"]
    fs = get_fs()
    chat_ref = chat_doc_ref(uid, chat_id)
    msg_ref = chat_ref.collection("messages").document()
    msg_ref.set({"role": role, "content": content or "", "createdAt": server_timestamp(), "status": status})
    chat_ref.update({"updatedAt": server_timestamp()})
    return {"ok": True, "message_id": msg_ref.id}


@app.patch("/history/messages/{message_id}")
async def patch_message(message_id: str, request: Request, user=Depends(verify_firebase_token)):
    body = await request.json()
    chat_id = body.get("chat_id")
    updates = {}
    if "content" in body:
        updates["content"] = body.get("content")
    if "status" in body:
        updates["status"] = body.get("status")
    if not chat_id:
        raise HTTPException(status_code=400, detail="chat_id required")
    uid = user["uid"]
    msg_ref = message_doc_ref(uid, chat_id, message_id)
    try:
        msg_ref.update({**updates, "updatedAt": server_timestamp()})
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to update message")
    return {"ok": True}


@app.post("/history/messages/{message_id}/feedback")
async def message_feedback(message_id: str, request: Request, user=Depends(verify_firebase_token)):
    body = await request.json()
    chat_id = body.get("chat_id")
    score = body.get("score")
    note = body.get("note")
    if not chat_id:
        raise HTTPException(status_code=400, detail="chat_id required")
    uid = user["uid"]
    fs = get_fs()
    msg_ref = message_doc_ref(uid, chat_id, message_id)
    try:
        # store feedback as subcollection for audit
        fb_ref = msg_ref.collection("feedback").document()
        fb_ref.set({"score": score, "note": note, "uid": uid, "createdAt": server_timestamp()})
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/history/messages/{message_id}/regenerate")
async def message_regenerate(message_id: str, request: Request, user=Depends(verify_firebase_token)):
    body = await request.json()
    chat_id = body.get("chat_id")
    if not chat_id:
        raise HTTPException(status_code=400, detail="chat_id required")
    uid = user["uid"]
    fs = get_fs()
    # fetch the assistant message; find the preceding user message to re-run
    msg_ref = message_doc_ref(uid, chat_id, message_id)
    snap = msg_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Message not found")
    data = snap.to_dict()
    if data.get("role") != "assistant":
        raise HTTPException(status_code=400, detail="Can only regenerate assistant messages")

    # find previous user message by createdAt
    msgs_q = chat_doc_ref(uid, chat_id).collection("messages").order_by("createdAt", direction="DESCENDING")
    prev_user = None
    for m in msgs_q.stream():
        d = m.to_dict()
        if d.get("createdAt") and d.get("createdAt") < data.get("createdAt") and d.get("role") == "user":
            prev_user = {"id": m.id, **d}
            break
    if not prev_user:
        raise HTTPException(status_code=400, detail="No preceding user message to regenerate from")

    # return the prompt and attachments for client to call /chat/stream
    return {"ok": True, "prompt": prev_user.get("content"), "attachments": prev_user.get("attachments", []), "grounding": prev_user.get("grounding", False)}


@app.post("/admin/cleanup")
async def admin_cleanup(user=Depends(verify_firebase_token)):
    uid = user["uid"]
    fs = get_fs()
    now = time.time()
    cutoff = now - REQUEST_TTL_SECONDS
    # cleanup requests older than TTL
    reqs = fs.collection("users").document(uid).collection("requests").stream()
    deleted = 0
    for r in reqs:
        data = r.to_dict()
        created = data.get("createdAt")
        try:
            # created is a Firestore timestamp; compare by seconds since epoch if possible
            if created and hasattr(created, "timestamp"):
                ts = created.timestamp()
            else:
                ts = now
        except Exception:
            ts = now
        if ts < cutoff:
            try:
                r.reference.delete()
                deleted += 1
            except Exception:
                pass

    # aborts older than ABORTED_TTL_SECONDS: scan messages with status error/streaming and createdAt older
    # This is best-effort; complex queries may be costly.
    return {"ok": True, "deleted_requests": deleted}


@app.get("/settings")
async def get_settings(user=Depends(verify_firebase_token)):
    uid = user["uid"]
    fs = get_fs()
    doc = fs.collection("users").document(uid).collection("settings").document("meta").get()
    if not doc.exists:
        return {"ok": True, "settings": {"theme": "system", "defaultModel": os.getenv("DEFAULT_MODEL", "gemini-2.0-flash")}}
    return {"ok": True, "settings": doc.to_dict()}


@app.patch("/settings")
async def patch_settings(request: Request, user=Depends(verify_firebase_token)):
    body = await request.json()
    uid = user["uid"]
    fs = get_fs()
    settings_ref = fs.collection("users").document(uid).collection("settings").document("meta")
    updates = {}
    for k in ("theme", "defaultModel", "lastActiveChat"):
        if k in body:
            updates[k] = body[k]
    updates["updatedAt"] = server_timestamp()
    settings_ref.set(updates, merge=True)
    return {"ok": True, "settings": updates}
