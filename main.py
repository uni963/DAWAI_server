#!/usr/bin/env python3
"""
DAWAI Server - Full Stack Application
This file starts the backend FastAPI server and serves the frontend.
"""

import sys
import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

# バックエンドディレクトリをPythonパスに追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# 直接ai_agentのmain.pyからFastAPIアプリをインポート
from ai_agent.main import app as ai_agent_app

# メインのFastAPIアプリケーションを作成
app = FastAPI(
    title="DAWAI Server",
    description="AI-powered music composition and DAW server",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# フロントエンドのビルドファイルを配信
frontend_build_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_build_path):
    app.mount("/static", StaticFiles(directory=frontend_build_path), name="static")

# AI Agentのルートをマウント
app.mount("/ai", ai_agent_app)

# ヘルスチェックエンドポイント
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "DAWAI Server"}

# フロントエンドのメインページを配信
@app.get("/")
async def root():
    index_path = os.path.join(frontend_build_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "DAWAI Server is running! Frontend not built yet."}

# フロントエンドのルートをキャッチ（SPA対応）
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # APIルートは除外
    if full_path.startswith("ai/") or full_path.startswith("health"):
        raise HTTPException(status_code=404, detail="Not found")
    
    # 静的ファイルの場合は直接配信
    static_file_path = os.path.join(frontend_build_path, full_path)
    if os.path.exists(static_file_path) and os.path.isfile(static_file_path):
        return FileResponse(static_file_path)
    
    # それ以外はフロントエンドのindex.htmlを返す（SPAルーティング対応）
    index_path = os.path.join(frontend_build_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    raise HTTPException(status_code=404, detail="Not found")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🎵 Starting DAWAI Server on port {port}...")
    print(f"🎨 Frontend build path: {frontend_build_path}")
    print(f"✅ Frontend exists: {os.path.exists(frontend_build_path)}")
    uvicorn.run(app, host="0.0.0.0", port=port)
