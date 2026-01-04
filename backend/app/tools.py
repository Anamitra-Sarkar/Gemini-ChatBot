from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/tools", tags=["tools"])

class ToolRequest(BaseModel):
    tool: str
    prompt: str

@router.post("/invoke")
async def invoke_tool(request: ToolRequest):
    """Invoke a tool with the given prompt"""
    
    if request.tool == "canvas":
        return {
            "success": True,
            "result": "Canvas tool invoked. This is a placeholder response.",
        }
    
    elif request.tool == "study":
        return {
            "success": True,
            "flashcards": [
                {"front": f"What is {request.prompt}?", "back": f"{request.prompt} is..."},
                {"front": f"Key concepts of {request.prompt}", "back": "Main concepts are..."},
            ],
        }
    
    elif request.tool == "image":
        return {
            "success": True,
            "image_url": "placeholder",
            "message": "Image generation API not configured. This is a placeholder.",
        }
    
    elif request.tool == "video":
        return {
            "success": True,
            "video_url": "placeholder",
            "status": "processing",
            "message": "Video generation API not configured. This is a placeholder.",
        }
    
    elif request.tool == "search":
        return {
            "success": True,
            "results": [
                {
                    "title": "Search Result 1",
                    "url": "https://example.com",
                    "snippet": "This is a placeholder search result.",
                },
                {
                    "title": "Search Result 2",
                    "url": "https://example.com",
                    "snippet": "Tavily API not configured. Using mock data.",
                },
            ],
        }
    
    return {"success": False, "error": "Unknown tool"}

@router.get("/health")
async def tools_health():
    """Check tool availability"""
    return {
        "canvas": {"available": True, "status": "active"},
        "study": {"available": True, "status": "active"},
        "image": {"available": True, "status": "mock"},
        "video": {"available": True, "status": "mock"},
        "search": {"available": True, "status": "mock"},
    }
