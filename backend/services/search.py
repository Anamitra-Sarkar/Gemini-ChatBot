import os
import requests
from typing import List, Dict, Optional


TAVILY_ENDPOINT = os.getenv("TAVILY_ENDPOINT", "https://api.tavily.example/search")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
TAVILY_SEARCH_DEPTH = os.getenv("TAVILY_SEARCH_DEPTH", "advanced")
TAVILY_MAX_RESULTS = int(os.getenv("TAVILY_MAX_RESULTS", "5"))


def _normalize_result(raw: Dict, index: int) -> Dict:
    # Map provider fields to our canonical SearchResult fields
    title = raw.get("title") or raw.get("headline") or raw.get("name") or ""
    url = raw.get("url") or raw.get("link") or raw.get("source_url") or ""
    snippet = raw.get("snippet") or raw.get("summary") or raw.get("excerpt") or ""
    published = raw.get("published_date") or raw.get("date") or None
    source = raw.get("source") or raw.get("domain") or None
    return {
        "index": index,
        "title": title,
        "url": url,
        "snippet": snippet,
        "published_date": published,
        "source": source,
    }


def web_search(query: str, *, recency_days: Optional[int] = None) -> List[Dict]:
    """Run a web search via Tavily API and return a deterministic list of SearchResult dicts.

    Each result: {title, url, snippet, published_date, source, index}
    """
    if not TAVILY_API_KEY:
        raise RuntimeError("TAVILY_API_KEY not configured")

    payload = {"q": query, "depth": TAVILY_SEARCH_DEPTH, "max_results": TAVILY_MAX_RESULTS}
    if recency_days:
        payload["recency_days"] = recency_days

    headers = {"Authorization": f"Bearer {TAVILY_API_KEY}", "Content-Type": "application/json"}
    try:
        r = requests.post(TAVILY_ENDPOINT, json=payload, headers=headers, timeout=15)
    except Exception as e:
        raise RuntimeError(f"Tavily request failed: {e}")

    if r.status_code != 200:
        raise RuntimeError(f"Tavily API returned status {r.status_code}")

    try:
        data = r.json()
    except Exception:
        raise RuntimeError("Tavily returned non-JSON response")

    raw_results = data.get("results") or data.get("items") or []

    results = []
    for i, item in enumerate(raw_results[:TAVILY_MAX_RESULTS], start=1):
        results.append(_normalize_result(item, i))

    # Deterministic ordering: sort by published_date (newest first) then by title
    def _key(x):
        pd = x.get("published_date") or ""
        return (pd, x.get("title") or "")

    results = sorted(results, key=_key, reverse=True)
    # Re-index deterministically
    for idx, r in enumerate(results, start=1):
        r["index"] = idx

    return results
