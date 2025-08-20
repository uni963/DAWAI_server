#!/usr/bin/env python3
"""
DAWAI Server - Main Entry Point
This file starts both backend (FastAPI) and frontend (Vite) servers.
"""

import sys
import os
import subprocess
import threading
import time
import signal
import uvicorn
from pathlib import Path

# 環境変数のデフォルト値を設定（.envファイルに依存しない）
os.environ.setdefault("PORT", "3000")
os.environ.setdefault("HOST", "0.0.0.0")
os.environ.setdefault("NODE_ENV", "production")

# バックエンドディレクトリをPythonパスに追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# 直接ai_agentのmain.pyからFastAPIアプリをインポート
from ai_agent.main import app

# グローバル変数でプロセス管理
frontend_process = None
backend_server = None

def start_frontend():
    """フロントエンドのVite開発サーバーを起動"""
    global frontend_process
    try:
        frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
        if os.path.exists(frontend_dir):
            print("🚀 Starting frontend development server...")
            # Vite開発サーバーを起動
            frontend_process = subprocess.Popen(
                ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"],
                cwd=frontend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            print("✅ Frontend server started on http://localhost:3000")
        else:
            print("⚠️  Frontend directory not found, skipping frontend server")
    except Exception as e:
        print(f"❌ Failed to start frontend server: {e}")

def start_backend():
    """バックエンドのFastAPIサーバーを起動"""
    global backend_server
    try:
        print("🚀 Starting backend FastAPI server...")
        port = int(os.getenv("PORT", 8000))
        backend_server = uvicorn.Server(
            uvicorn.Config(
                app=app,
                host="0.0.0.0",
                port=port,
                log_level="info"
            )
        )
        backend_server.run()
    except Exception as e:
        print(f"❌ Failed to start backend server: {e}")

def signal_handler(signum, frame):
    """シグナルハンドラーでプロセスを適切に終了"""
    print("\n🛑 Shutting down servers...")
    
    if frontend_process:
        frontend_process.terminate()
        frontend_process.wait()
        print("✅ Frontend server stopped")
    
    if backend_server:
        backend_server.should_exit = True
        print("✅ Backend server stopped")
    
    print("👋 Goodbye!")
    sys.exit(0)

def main():
    """メイン関数"""
    print("🎵 DAWAI Server Starting...")
    print("=" * 50)
    
    # シグナルハンドラーを設定
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # フロントエンドサーバーを別スレッドで起動
    frontend_thread = threading.Thread(target=start_frontend, daemon=True)
    frontend_thread.start()
    
    # 少し待ってからバックエンドサーバーを起動
    time.sleep(2)
    
    # バックエンドサーバーをメインスレッドで起動
    start_backend()

if __name__ == "__main__":
    main()
