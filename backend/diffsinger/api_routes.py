#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FastAPI Routes for DiffSinger API

このモジュールはDiffSinger APIのエンドポイントを定義します。
"""

import time
import asyncio
from pathlib import Path
from typing import List

from fastapi import HTTPException
from fastapi.responses import FileResponse

from models import SynthesisRequest, SynthesisResponse, ModelInfo
from config import MOCK_MODELS
from audio_synthesis import synthesize_audio
from edge_tts_handler import EDGE_TTS_AVAILABLE

# グローバル状態（将来的には状態管理クラスに移行予定）
# Note: この変数はconfig.pyから参照されていますが、APIルートで更新されるためここに配置
import config


def get_models_route():
    """利用可能なモデル一覧を取得"""
    return {
        "models": [model.dict() for model in MOCK_MODELS],
        "current": config.current_model,
        "total": len(MOCK_MODELS),
        "edge_tts_enabled": EDGE_TTS_AVAILABLE
    }


async def load_model_route(model_id: str):
    """
    モデルロード（モック）

    Args:
        model_id: ロードするモデルのID

    Returns:
        dict: モデルロード結果

    Raises:
        HTTPException: モデルが見つからない場合
    """
    # モデルIDの検証
    model_ids = [model.id for model in MOCK_MODELS]
    if model_id not in model_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Model {model_id} not found. Available models: {model_ids}"
        )

    # モック遅延（実際のモデルロード時間をシミュレート）
    await asyncio.sleep(0.5)

    previous_model = config.current_model
    config.current_model = model_id
    return {
        "status": "success",
        "message": f"Model {model_id} loaded successfully",
        "previous_model": previous_model,
        "current_model": model_id,
        "edge_tts_enabled": EDGE_TTS_AVAILABLE
    }


async def synthesize_route(request: SynthesisRequest) -> SynthesisResponse:
    """
    音声合成エンドポイント

    Args:
        request: 合成リクエスト

    Returns:
        SynthesisResponse: 合成結果

    Raises:
        HTTPException: 入力が不正な場合、または合成に失敗した場合
    """
    try:
        print(f"[API Route] Synthesis request received:")
        print(f"  Lyrics: {request.lyrics}")
        print(f"  Notes: {request.notes}")
        print(f"  Durations: {request.durations}")
        print(f"  Current model: {config.current_model}")

        # 入力検証
        notes_list = [note.strip() for note in request.notes.split('|')]
        durations_list = [float(dur.strip()) for dur in request.durations.split('|')]

        if len(notes_list) != len(durations_list):
            raise HTTPException(
                status_code=400,
                detail=f"Notes count ({len(notes_list)}) must match durations count ({len(durations_list)})"
            )

        # 総再生時間計算
        total_duration = sum(durations_list)

        # 出力ディレクトリ作成
        output_path = Path(request.output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # 音声合成を実行
        synthesis_success, engine_info = await synthesize_audio(
            request.lyrics,
            notes_list,
            durations_list,
            str(output_path),
            config.current_model
        )

        return SynthesisResponse(
            status="success",
            message=f"Enhanced synthesis completed using {engine_info} for '{request.lyrics}' ({len(notes_list)} notes)",
            audio_path=str(output_path),
            duration=total_duration
        )

    except ValueError as e:
        print(f"[API Route] Input error: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid input: {str(e)}"
        )
    except Exception as e:
        print(f"[API Route] Synthesis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Synthesis failed: {str(e)}"
        )


async def get_synthesis_status_route(request_id: str):
    """
    合成ステータス取得（将来の非同期処理用）

    Args:
        request_id: リクエストID

    Returns:
        dict: 合成ステータス
    """
    return {
        "request_id": request_id,
        "status": "completed",
        "progress": 100,
        "message": "Enhanced musical synthesis completed",
        "engine": "Musical Synthesis"
    }


async def serve_generated_audio_route(filename: str):
    """
    生成された音声ファイルを配信

    Args:
        filename: 音声ファイル名

    Returns:
        FileResponse: 音声ファイル

    Raises:
        HTTPException: ファイルが見つからない場合
    """
    output_path = Path("outputs") / filename

    if not output_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Audio file {filename} not found"
        )

    print(f"[API Route] Serving audio file: {output_path}")

    # Edge TTSで生成されたファイルの場合、MP3として配信
    if EDGE_TTS_AVAILABLE and config.current_model.startswith("edge_tts_"):
        media_type = "audio/mpeg"
    else:
        media_type = "audio/wav"

    return FileResponse(
        path=str(output_path),
        media_type=media_type,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
        }
    )


def root_route():
    """ルートエンドポイント"""
    return {
        "service": "Enhanced Mock DiffSinger API",
        "version": "2.0.0",
        "status": "running",
        "edge_tts_available": EDGE_TTS_AVAILABLE,
        "current_model": config.current_model,
        "docs": "/docs",
        "note": "This is an enhanced mock server with Edge TTS integration"
    }


def health_route():
    """ヘルスチェックエンドポイント"""
    return {
        "status": "healthy",
        "service": "Enhanced Mock DiffSinger",
        "version": "2.0.0",
        "current_model": config.current_model,
        "edge_tts_available": EDGE_TTS_AVAILABLE,
        "timestamp": time.time()
    }
