import os
import httpx
from fastapi import FastAPI, Request, Response
from dotenv import load_dotenv

load_dotenv()

NODE_URL = os.environ.get("NODE_SERVER_URL", "http://localhost:8080")

app = FastAPI()

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy_api(request: Request, path: str):
    url = f"{NODE_URL}/api/{path}"
    if request.url.query:
        url += f"?{request.url.query}"
    body = await request.body()
    headers = dict(request.headers)
    headers.pop("host", None)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.request(
            method=request.method,
            url=url,
            content=body,
            headers=headers,
        )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=dict(resp.headers),
    )
