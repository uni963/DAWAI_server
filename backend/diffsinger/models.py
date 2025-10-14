#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pydantic Models for DiffSinger API

このモジュールはDiffSinger APIで使用されるPydanticモデルを定義します。
"""

from pydantic import BaseModel, Field


class SynthesisRequest(BaseModel):
    """合成リクエストモデル"""
    lyrics: str = Field(..., min_length=1, max_length=1000, description="歌詞（中国語・日本語）")
    notes: str = Field(..., description="MIDI音名（|区切り）例: C4 | D4 | E4")
    durations: str = Field(..., description="ノート長さ秒（|区切り）例: 0.5 | 0.5 | 1.0")
    output_path: str = Field(default="outputs/synthesis.wav", description="出力WAVパス")


class SynthesisResponse(BaseModel):
    """合成レスポンスモデル"""
    status: str
    message: str
    audio_path: str
    duration: float


class ModelInfo(BaseModel):
    """モデル情報"""
    id: str
    name: str
    language: str
    description: str
