"""
Validate required environment variables and lightweight endpoint checks.
Does NOT start the server and does NOT log secrets.
"""
import os
import sys
import requests

REQUIRED = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_STORAGE_BUCKET",
    "GEMINI_API_KEY",
    "NANO_BANANA_API_KEY",
    "VEO_API_KEY",
    "TAVILY_API_KEY",
]

OPTIONAL_ENDPOINTS = {
    "NANO_BANANA_ENDPOINT": os.getenv("NANO_BANANA_ENDPOINT"),
    "VEO_ENDPOINT": os.getenv("VEO_ENDPOINT"),
}

OPTIONAL_ENDPOINTS["TAVILY_ENDPOINT"] = os.getenv("TAVILY_ENDPOINT")

def main():
    missing = [k for k in REQUIRED if not os.getenv(k)]
    if missing:
        print("MISSING_ENV_VARS:")
        for m in missing:
            print(f" - {m}")
    else:
        print("All required env vars present (values not shown).")

    # Check optional endpoints reachability (best-effort)
    for name, url in OPTIONAL_ENDPOINTS.items():
        if not url:
            print(f"{name}: not set (ok if using default endpoint)")
            continue
        try:
            r = requests.head(url, timeout=5)
            ok = r.status_code < 500
        except Exception as e:
            ok = False
        print(f"{name}: {'reachable' if ok else 'unreachable'} (checked by HEAD request)")

    if missing:
        print("\nResult: INVALID — fix missing env vars before starting the backend.")
        sys.exit(2)
    else:
        print("\nResult: OK — environment variables appear configured.")
        sys.exit(0)

if __name__ == '__main__':
    main()
