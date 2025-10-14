#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DiffSinger FastAPI Server

起動方法:
    python diffsinger.py

APIエンドポイント:
    POST /api/synthesize
    {
        "lyrics": "小酒窝长睫毛",
        "notes": "C#4/Db4 | F#4/Gb4 | G#4/Ab4 | A#4/Bb4",
        "durations": "0.4 | 0.4 | 0.4 | 0.4"
    }
"""
import sys
import os
import io
from pathlib import Path
from typing import Optional

# Windows環境でUTF-8出力を強制
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# DiffSingerモジュールパス追加
DIFFSINGER_PATH = Path(__file__).parent
sys.path.insert(0, str(DIFFSINGER_PATH))
os.environ['PYTHONPATH'] = str(DIFFSINGER_PATH)

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import uvicorn

from inference.svs.ds_e2e import DiffSingerE2EInfer
from utils.audio import save_wav
from utils.hparams import set_hparams, hparams
import numpy as np

# FastAPIアプリケーション
app = FastAPI(
    title="DiffSinger API",
    description="AI歌声合成エンジン",
    version="1.0.0"
)

# グローバル推論エンジン（起動時に初期化）
engine: Optional[DiffSingerE2EInfer] = None


class SynthesisRequest(BaseModel):
    """合成リクエストモデル"""
    lyrics: str = Field(..., min_length=1, max_length=1000, description="歌詞（中国語）")
    notes: str = Field(..., description="MIDI音名（|区切り）例: C4 | D4 | E4")
    durations: str = Field(..., description="ノート長さ秒（|区切り）例: 0.5 | 0.5 | 1.0")
    output_path: str = Field(default="outputs/synthesis.wav", description="出力WAVパス")


class SynthesisResponse(BaseModel):
    """合成レスポンスモデル"""
    status: str
    message: str
    audio_path: str
    duration: float


@app.on_event("startup")
async def startup_event():
    """サーバー起動時の初期化"""
    global engine
    print("=" * 70)
    print("DiffSinger Server Starting...")
    print("=" * 70)

    try:
        # 設定ファイル読み込み
        config_path = 'checkpoints/acoustic/config.yaml'
        set_hparams(config_path, exp_name='acoustic', print_hparams=False)

        # チェックポイントパス設定
        hparams['pe_ckpt'] = 'checkpoints/pe'
        hparams['vocoder_ckpt'] = 'checkpoints/vocoder'

        # 推論エンジン初期化
        engine = DiffSingerE2EInfer(hparams)
        print("[OK] DiffSinger Engine initialized successfully")
        print(f"   Sample Rate: {hparams['audio_sample_rate']} Hz")
        print(f"   Device: {'cuda' if engine.device == 'cuda' else 'cpu'}")
        print("[OK] Server ready at http://localhost:8001")
        print("[OK] API docs at http://localhost:8001/docs")
        print("=" * 70)
    except Exception as e:
        print(f"[ERROR] Failed to initialize engine: {e}")
        import traceback
        traceback.print_exc()
        raise


@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "service": "DiffSinger API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    return {
        "status": "healthy",
        "engine": "ready" if engine else "not_initialized"
    }


@app.post("/api/synthesize", response_model=SynthesisResponse)
async def synthesize_voice(request: SynthesisRequest):
    """
    歌声合成APIエンドポイント

    Args:
        request: 合成リクエスト（歌詞、ノート、長さ）

    Returns:
        合成結果（WAVファイルパス、長さ等）

    Raises:
        HTTPException: 推論エラー時
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")

    try:
        print(f"\n[SYNTHESIS] Request:")
        print(f"   Lyrics: {request.lyrics}")
        print(f"   Notes: {request.notes}")
        print(f"   Durations: {request.durations}")

        # 入力準備
        inp = {
            'text': request.lyrics,
            'notes': request.notes,
            'notes_duration': request.durations,
            'input_type': 'word'
        }

        # 推論実行
        print("   [INFERENCE] Running...")
        wav_out = engine.infer_once(inp)

        # WAV保存
        print(f"   [SAVE] Saving to {request.output_path}...")
        output_path = Path(request.output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # 正規化してWAV保存
        sample_rate = hparams['audio_sample_rate']
        save_wav(wav_out, str(output_path), sample_rate, norm=True)

        # 長さ計算
        duration = len(wav_out) / sample_rate

        print(f"   [OK] Success! Duration: {duration:.2f}s")

        return SynthesisResponse(
            status="success",
            message="Synthesis completed",
            audio_path=str(output_path),
            duration=duration
        )

    except Exception as e:
        print(f"   [ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")


@app.get("/api/download/{filename}")
async def download_audio(filename: str):
    """
    生成された音声ファイルダウンロード

    Args:
        filename: ファイル名

    Returns:
        WAVファイル
    """
    file_path = Path("outputs") / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(file_path),
        media_type="audio/wav",
        filename=filename
    )


def main():
    """メイン実行"""
    import argparse

    parser = argparse.ArgumentParser(description="DiffSinger FastAPI Server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host")
    parser.add_argument("--port", type=int, default=8001, help="Bind port")
    parser.add_argument("--reload", action="store_true", help="Auto-reload on code changes")
    args = parser.parse_args()

    # サーバー起動
    uvicorn.run(
        "diffsinger:app",
        host=args.host,
        port=args.port,
        reload=args.reload
    )


if __name__ == "__main__":
    main()
