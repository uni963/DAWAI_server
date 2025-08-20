from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

# 環境変数を読み込み
load_dotenv()

# FastAPIアプリケーションを初期化
app = FastAPI(
    title="DAWAI Server API",
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

# ヘルスチェックエンドポイント
@app.get("/")
async def root():
    return {"message": "DAWAI Server is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "DAWAI Server"}

# AI Agentのルートをインポート
from ai_agent.main import app as ai_agent_app

# AI Agentのルートをマウント
app.mount("/ai", ai_agent_app)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
