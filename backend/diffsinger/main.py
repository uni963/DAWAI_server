#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced Mock DiffSinger FastAPI Server - Main Entry Point

Microsoft Edge TTSを使用したリアルな日本語音声合成を行うモックサーバーです。
数学的合成の代わりに、実際の音声エンジンを使用して自然な歌声を生成します。

起動方法:
    python main.py

APIエンドポイント:
    POST /api/synthesize
    GET /health
    GET /api/models
"""

import sys
import os
import io

# Windows環境でUTF-8出力を強制
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import (
    SERVER_HOST,
    SERVER_PORT,
    SERVER_TITLE,
    SERVER_DESCRIPTION,
    SERVER_VERSION,
    ALLOWED_ORIGINS
)
from models import SynthesisRequest, SynthesisResponse
from api_routes import (
    root_route,
    health_route,
    get_models_route,
    load_model_route,
    synthesize_route,
    get_synthesis_status_route,
    serve_generated_audio_route
)
from edge_tts_handler import EDGE_TTS_AVAILABLE

# FastAPIアプリケーション
app = FastAPI(
    title=SERVER_TITLE,
    description=SERVER_DESCRIPTION,
    version=SERVER_VERSION
)

# CORS設定（フロントエンドからのアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """サーバー起動時の初期化"""
    print("=" * 70)
    print("Enhanced Mock DiffSinger Server Starting...")
    print("=" * 70)
    if EDGE_TTS_AVAILABLE:
        print("[OK] Edge TTS successfully loaded")
        print("[OK] Japanese voices: Nanami (Female), Keita (Male)")
        print("[OK] Real Japanese speech synthesis enabled")
    else:
        print("[WARN] Edge TTS not available - falling back to mathematical synthesis")
    print("[OK] Enhanced Mock DiffSinger Engine initialized successfully")
    print(f"[OK] Server ready at http://{SERVER_HOST}:{SERVER_PORT}")
    print(f"[OK] API docs at http://{SERVER_HOST}:{SERVER_PORT}/docs")
    print("=" * 70)


# === ルート登録 ===

@app.get("/")
async def root():
    """ルートエンドポイント"""
    return root_route()


@app.get("/health")
async def health():
    """ヘルスチェックエンドポイント"""
    return health_route()


@app.get("/api/models")
async def get_models():
    """利用可能なモデル一覧"""
    return get_models_route()


@app.post("/api/models/{model_id}/load")
async def load_model(model_id: str):
    """モデルロード（モック）"""
    return await load_model_route(model_id)


@app.post("/api/synthesize", response_model=SynthesisResponse)
async def synthesize(request: SynthesisRequest):
    """音声合成（Edge TTS統合版）"""
    return await synthesize_route(request)


@app.get("/api/synthesize/{request_id}")
async def get_synthesis_status(request_id: str):
    """合成ステータス取得（将来の非同期処理用）"""
    return await get_synthesis_status_route(request_id)


@app.get("/api/generated/{filename}")
@app.head("/api/generated/{filename}")
async def serve_generated_audio(filename: str):
    """生成された音声ファイルを配信"""
    return await serve_generated_audio_route(filename)


# サーバー起動設定
if __name__ == "__main__":
    print("Starting Enhanced Mock DiffSinger Server with Edge TTS...")
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT)
