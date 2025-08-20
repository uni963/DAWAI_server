#!/usr/bin/env python3
"""
DAWAI Server - Main Entry Point
This file starts the backend FastAPI server.
"""

import sys
import os
import uvicorn

# バックエンドディレクトリをPythonパスに追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# 直接ai_agentのmain.pyからFastAPIアプリをインポート
from ai_agent.main import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🎵 Starting DAWAI Server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
