#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mock DiffSinger FastAPI Server

一時的なテスト用のDiffSingerサーバーです。
実際の音声合成は行わず、APIの統合テストのために作成されています。

起動方法:
    python mock_diffsinger_server.py

APIエンドポイント:
    POST /api/synthesize
    GET /health
    GET /api/models
"""

import sys
import os
import io
import json
import time
from pathlib import Path
from typing import Optional

# Windows環境でUTF-8出力を強制
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import uvicorn

# FastAPIアプリケーション
app = FastAPI(
    title="Mock DiffSinger API",
    description="モックAI歌声合成エンジン（テスト用）",
    version="1.0.0"
)

# CORS設定（フロントエンドからのアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

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

# モックデータ
MOCK_MODELS = [
    ModelInfo(
        id="popcs_ds_beta6",
        name="PopCS DiffSinger Beta 6",
        language="zh_CN",
        description="中国語歌声合成モデル（高品質）"
    ),
    ModelInfo(
        id="opencpop",
        name="OpenCPop",
        language="zh_CN",
        description="中国語歌声合成モデル（標準）"
    ),
    ModelInfo(
        id="japanese_v1",
        name="Japanese Singer V1",
        language="ja_JP",
        description="日本語歌声合成モデル（開発中）"
    )
]

current_model = "popcs_ds_beta6"

@app.on_event("startup")
async def startup_event():
    """サーバー起動時の初期化"""
    print("=" * 70)
    print("Mock DiffSinger Server Starting...")
    print("=" * 70)
    print("[OK] Mock DiffSinger Engine initialized successfully")
    print("[OK] Server ready at http://localhost:8001")
    print("[OK] API docs at http://localhost:8001/docs")
    print("=" * 70)

@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "service": "Mock DiffSinger API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "note": "This is a mock server for testing integration"
    }

@app.get("/health")
async def health():
    """ヘルスチェックエンドポイント"""
    return {
        "status": "healthy",
        "service": "Mock DiffSinger",
        "version": "1.0.0",
        "current_model": current_model,
        "timestamp": time.time()
    }

@app.get("/api/models")
async def get_models():
    """利用可能なモデル一覧"""
    return {
        "models": [model.dict() for model in MOCK_MODELS],
        "current": current_model,
        "total": len(MOCK_MODELS)
    }

@app.post("/api/models/{model_id}/load")
async def load_model(model_id: str):
    """モデルロード（モック）"""
    global current_model
    import asyncio

    # モデルIDの検証
    model_ids = [model.id for model in MOCK_MODELS]
    if model_id not in model_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Model {model_id} not found. Available models: {model_ids}"
        )

    # モック遅延（実際のモデルロード時間をシミュレート）
    await asyncio.sleep(1)

    previous_model = current_model
    current_model = model_id
    return {
        "status": "success",
        "message": f"Model {model_id} loaded successfully",
        "previous_model": previous_model,
        "current_model": model_id
    }

@app.post("/api/synthesize", response_model=SynthesisResponse)
async def synthesize(request: SynthesisRequest):
    """音声合成（モック）"""
    try:
        print(f"[Mock DiffSinger] Synthesis request received:")
        print(f"  Lyrics: {request.lyrics}")
        print(f"  Notes: {request.notes}")
        print(f"  Durations: {request.durations}")
        print(f"  Output path: {request.output_path}")

        # 入力検証
        notes_list = [note.strip() for note in request.notes.split('|')]
        durations_list = [dur.strip() for dur in request.durations.split('|')]

        if len(notes_list) != len(durations_list):
            raise HTTPException(
                status_code=400,
                detail=f"Notes count ({len(notes_list)}) must match durations count ({len(durations_list)})"
            )

        # 総再生時間計算
        total_duration = sum(float(dur) for dur in durations_list)

        # モック合成処理（実際の合成時間をシミュレート）
        import asyncio
        synthesis_time = min(total_duration * 0.5, 5.0)  # 最大5秒
        print(f"[Mock DiffSinger] Simulating synthesis for {synthesis_time:.1f} seconds...")
        await asyncio.sleep(synthesis_time)

        # 出力ディレクトリ作成
        output_path = Path(request.output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # モック音声ファイル作成（実際に聞こえる正弦波ベースのテスト音）
        # 実際の実装では、ここで実際のDiffSinger音声合成が行われます
        with open(output_path, 'wb') as f:
            import math

            # 音声パラメータ
            sample_rate = 44100
            channels = 1  # モノラル
            bits_per_sample = 16
            audio_samples = int(sample_rate * total_duration)
            data_size = audio_samples * channels * (bits_per_sample // 8)
            file_size = 36 + data_size

            # RIFFヘッダー
            f.write(b'RIFF')                                    # ChunkID
            f.write(file_size.to_bytes(4, 'little'))            # ChunkSize
            f.write(b'WAVE')                                    # Format

            # fmtチャンク
            f.write(b'fmt ')                                    # Subchunk1ID
            f.write((16).to_bytes(4, 'little'))                 # Subchunk1Size
            f.write((1).to_bytes(2, 'little'))                  # AudioFormat (PCM)
            f.write(channels.to_bytes(2, 'little'))             # NumChannels
            f.write(sample_rate.to_bytes(4, 'little'))          # SampleRate
            f.write((sample_rate * channels * bits_per_sample // 8).to_bytes(4, 'little'))  # ByteRate
            f.write((channels * bits_per_sample // 8).to_bytes(2, 'little'))              # BlockAlign
            f.write(bits_per_sample.to_bytes(2, 'little'))      # BitsPerSample

            # dataチャンク
            f.write(b'data')                                    # Subchunk2ID
            f.write(data_size.to_bytes(4, 'little'))           # Subchunk2Size

            # 実際の音声データ（明瞭なハミング音「あ」）
            # ノートの音程に基づいた動的な音程変化を持つハミング音
            notes_list = [note.strip() for note in request.notes.split('|')]
            durations_list = [float(dur.strip()) for dur in request.durations.split('|')]

            # 各ノートの周波数を計算（MIDI音名から周波数変換）
            def note_to_freq(note_name):
                """MIDI音名（C4, A4等）を周波数に変換"""
                if len(note_name) < 2:
                    return 440.0  # デフォルト
                note = note_name[:-1]
                octave = int(note_name[-1])

                # 音名から半音数への変換
                note_offsets = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
                if note not in note_offsets:
                    return 440.0

                # A4(440Hz)を基準とした周波数計算（自然な音域）
                midi_number = (octave - 4) * 12 + note_offsets[note] - 9  # A4からの半音差
                base_freq = 440.0 * (2 ** (midi_number / 12))
                return base_freq  # 標準的な音域を使用

            audio_data = bytearray()
            current_sample = 0

            for note_idx, (note_name, duration) in enumerate(zip(notes_list, durations_list)):
                # このノートの基本周波数
                base_freq = note_to_freq(note_name)
                note_samples = int(sample_rate * duration)

                # 日本語母音フォルマント辞書（より自然なハミング音重視）
                vowel_formants = {
                    'a': [750, 1180, 2350],   # あ（ハミング向けに少し暖かく）
                    'i': [300, 2200, 2900],   # い（明るくも柔らかく）
                    'u': [320, 950, 2100],    # う（より丸みを帯びて自然に）
                    'e': [420, 1650, 2400],   # え（中間音域を強調）
                    'o': [450, 950, 2200],    # お（暖かく深い響き）
                    'n': [220, 1250, 2000],   # ん（鼻音、より自然な響き）
                    'm': [180, 1000, 1900],   # ム（ハミング専用、口を閉じた音）
                    'r': [380, 1200, 2100],   # ら行（流れるような音）
                    'f': [250, 800, 1800],    # ふ（息音要素を含む）
                    's': [180, 1500, 3000],   # さ行（摩擦音、優しく）
                }

                # 基音と倍音（ハミング専用の自然な音質）
                harmonic_freqs = [
                    base_freq,           # 基音（ハミングの核となる音）
                    base_freq * 2.0,     # 2倍音（暖かさを追加）
                    base_freq * 3.0,     # 3倍音（豊かさを追加）
                    base_freq * 4.0,     # 4倍音（明るさを少し）
                    base_freq * 5.0,     # 5倍音（自然な響きのため）
                ]
                # ハミング向けの倍音バランス（機械的でない自然な響き）
                harmonic_amps = [0.85, 0.35, 0.2, 0.12, 0.08]

                # 日本語音節分析と発音パターン生成
                def analyze_japanese_syllables(lyrics):
                    """日本語歌詞を音節（モーラ）に分析"""
                    # 簡易的な日本語音節マッピング
                    syllable_map = {
                        'さ': [('s', 0.0, 0.1), ('a', 0.1, 1.0)],
                        'く': [('k', 0.0, 0.1), ('u', 0.1, 1.0)],
                        'ら': [('r', 0.0, 0.15), ('a', 0.15, 1.0)],
                        'ん': [('n', 0.0, 1.0)],
                        'ぼ': [('m', 0.0, 0.1), ('o', 0.1, 1.0)],
                        'あ': [('a', 0.0, 1.0)],
                        'い': [('i', 0.0, 1.0)],
                        'う': [('u', 0.0, 1.0)],
                        'え': [('e', 0.0, 1.0)],
                        'お': [('o', 0.0, 1.0)],
                    }

                    result = []
                    for char in lyrics:
                        if char in syllable_map:
                            result.extend(syllable_map[char])

                    return result if result else [('a', 0.0, 1.0)]

                def get_vowel_progression(lyrics, note_idx, duration):
                    """日本語歌詞に基づいた正確な音韻変化を生成"""
                    syllables = analyze_japanese_syllables(lyrics)

                    if not syllables:
                        return [('a', 0.0, 1.0)]

                    # 複数ノートにわたる歌詞の場合、ノートインデックスに基づいて適切な音節を選択
                    chars_in_lyrics = [c for c in lyrics if c not in ' 　']
                    if chars_in_lyrics and note_idx < len(chars_in_lyrics):
                        target_char = chars_in_lyrics[note_idx]

                        # 対応する音節パターンを取得
                        syllable_patterns = {
                            'さ': [('s', 0.0, 0.12), ('a', 0.12, 1.0)],
                            'く': [('k', 0.0, 0.08), ('u', 0.08, 1.0)],
                            'ら': [('r', 0.0, 0.15), ('a', 0.15, 1.0)],
                            'ん': [('n', 0.0, 1.0)],
                            'ぼ': [('m', 0.0, 0.1), ('o', 0.1, 1.0)],
                        }

                        if target_char in syllable_patterns:
                            return syllable_patterns[target_char]

                    # デフォルト：母音中心の自然な日本語パターン
                    return [('a', 0.0, 0.4), ('u', 0.4, 0.8), ('a', 0.8, 1.0)]

                vowel_progression = get_vowel_progression(request.lyrics, note_idx, duration)

                for sample_idx in range(note_samples):
                    time = sample_idx / sample_rate
                    total_time = current_sample / sample_rate

                    # 時間に基づいて現在の母音を決定
                    normalized_time = time / duration  # 0-1の範囲に正規化
                    current_vowel = 'a'  # デフォルト
                    vowel_blend_ratio = 1.0

                    # 母音の時間変化を計算
                    for vowel, start_time, end_time in vowel_progression:
                        if start_time <= normalized_time <= end_time:
                            current_vowel = vowel
                            # 母音間の滑らかな遷移
                            if normalized_time < start_time + 0.05:  # 遷移開始
                                blend_progress = (normalized_time - start_time) / 0.05
                                vowel_blend_ratio = blend_progress
                            elif normalized_time > end_time - 0.05:  # 遷移終了
                                blend_progress = (end_time - normalized_time) / 0.05
                                vowel_blend_ratio = blend_progress
                            else:
                                vowel_blend_ratio = 1.0
                            break

                    # 人間らしい歌声を合成（動的フォルマント + ピッチ揺れ）
                    sample_value = 0.0

                    # 1. 人間らしいピッチ制御（ビブラート + 自然な揺れ）
                    base_pitch_variation = 1.0 + 0.002 * math.sin(2 * math.pi * 1.3 * time)  # 基本的な揺れ

                    # ビブラートを削除し、自然な音程の微細な揺らぎのみを保持
                    pitch_variation = base_pitch_variation  # ビブラートなしのシンプルな音程

                    # 2. 基本倍音構造（ピッチ揺れ付き）
                    for freq, amp in zip(harmonic_freqs, harmonic_amps):
                        actual_freq = freq * pitch_variation
                        sample_value += amp * math.sin(2 * math.pi * actual_freq * time)

                    # 3. 動的フォルマント（現在の母音に基づく）
                    current_formant_freqs = vowel_formants[current_vowel]
                    formant_amps = [0.6, 0.4, 0.25]  # フォルマントの強度

                    for formant_freq, formant_amp in zip(current_formant_freqs, formant_amps):
                        # フォルマント強度を母音ブレンド比で調整
                        adjusted_amp = formant_amp * vowel_blend_ratio

                        # メインフォルマント
                        formant_modulation = adjusted_amp * math.sin(2 * math.pi * formant_freq * time)
                        # 帯域幅表現（自然な響き）
                        formant_modulation += adjusted_amp * 0.3 * math.sin(2 * math.pi * (formant_freq * 1.02) * time)
                        formant_modulation += adjusted_amp * 0.3 * math.sin(2 * math.pi * (formant_freq * 0.98) * time)
                        sample_value += formant_modulation * 0.5

                    # 4. 声らしさのための複数ノイズ成分
                    import random
                    # 呼吸音ノイズ
                    breath_noise = (random.random() - 0.5) * 0.015
                    # 鼻音成分（特に「ん」「ム」音の時）
                    if current_vowel in ['n', 'm']:
                        nasal_component = 0.1 * math.sin(2 * math.pi * 150 * time)  # 低周波鼻音
                        sample_value += nasal_component

                    sample_value += breath_noise

                    # エンベロープ（女性らしい柔らかい音量変化）
                    # ノートの開始と終了で音量を調整
                    if time < 0.08:  # アタック（ゆったりとした立ち上がり）
                        envelope = time / 0.08
                    elif time > duration - 0.15:  # リリース（優雅な減衰）
                        envelope = (duration - time) / 0.15
                    else:  # サステイン（安定した持続）
                        envelope = 1.0

                    # 全体的なフェードイン・フェードアウト
                    if total_time < 0.1:
                        envelope *= total_time / 0.1
                    elif total_time > total_duration - 0.3:
                        envelope *= (total_duration - total_time) / 0.3

                    sample_value *= envelope

                    # 16bitサンプルに変換（女性らしい控えめな音量）
                    sample_16bit = int(sample_value * 18000)  # かわいらしい女性の声の音量
                    sample_16bit = max(-32768, min(32767, sample_16bit))  # クリッピング防止

                    # リトルエンディアンで書き込み
                    audio_data.extend(sample_16bit.to_bytes(2, 'little', signed=True))
                    current_sample += 1

            f.write(audio_data)

        print(f"[Mock DiffSinger] Synthesis completed successfully")
        print(f"[Mock DiffSinger] Output file: {output_path}")

        return SynthesisResponse(
            status="success",
            message=f"Mock synthesis completed for '{request.lyrics}' ({len(notes_list)} notes)",
            audio_path=str(output_path),
            duration=total_duration
        )

    except ValueError as e:
        print(f"[Mock DiffSinger] Input error: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid input: {str(e)}"
        )
    except Exception as e:
        print(f"[Mock DiffSinger] Synthesis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Synthesis failed: {str(e)}"
        )

@app.get("/api/synthesize/{request_id}")
async def get_synthesis_status(request_id: str):
    """合成ステータス取得（将来の非同期処理用）"""
    return {
        "request_id": request_id,
        "status": "completed",
        "progress": 100,
        "message": "Mock synthesis completed immediately"
    }

@app.get("/api/generated/{filename}")
@app.head("/api/generated/{filename}")
async def serve_generated_audio(filename: str):
    """生成された音声ファイルを配信"""
    output_path = Path("outputs") / filename

    if not output_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Audio file {filename} not found"
        )

    print(f"[Mock DiffSinger] Serving audio file: {output_path}")
    return FileResponse(
        path=str(output_path),
        media_type="audio/wav",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
        }
    )

# サーバー起動設定
if __name__ == "__main__":
    import uvicorn
    import asyncio

    print("Starting Mock DiffSinger Server...")
    uvicorn.run(app, host="127.0.0.1", port=8001)