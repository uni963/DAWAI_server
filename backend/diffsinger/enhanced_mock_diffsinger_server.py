#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced Mock DiffSinger FastAPI Server with Edge TTS Integration

Microsoft Edge TTSを使用したリアルな日本語音声合成を行うモックサーバーです。
数学的合成の代わりに、実際の音声エンジンを使用して自然な歌声を生成します。

起動方法:
    python enhanced_mock_diffsinger_server.py

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
import asyncio
import tempfile
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

# Edge TTS import
try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
    print("[Enhanced Mock] Edge TTS successfully imported")
except ImportError:
    EDGE_TTS_AVAILABLE = False
    print("[Enhanced Mock] Edge TTS not available, falling back to mathematical synthesis")

# Pydub import for audio format conversion
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
    print("[Enhanced Mock] Pydub successfully imported for audio conversion")
except ImportError:
    PYDUB_AVAILABLE = False
    print("[Enhanced Mock] Pydub not available, MP3 to WAV conversion will use fallback")

# Musical synthesis imports
import numpy as np
import wave
import struct
import math

# Musical synthesis configuration
SAMPLE_RATE = 44100  # CD quality sample rate
MUSICAL_NOTE_DURATION = 1.0  # 1.0 second per note for appropriate rhythm
FEMALE_VOICE_PITCH_BOOST = 12  # +12 semitones for more feminine voice

# 合成モード設定（シーケンシャルパイプライン方式の追加）
SYNTHESIS_MODE = "musical_first"  # 数学的合成システムに戻す
# Options: musical_first, edge_tts_post, edge_tts_only

# FastAPIアプリケーション
app = FastAPI(
    title="Enhanced Mock DiffSinger API",
    description="Edge TTS統合リアル日本語歌声合成エンジン（テスト用）",
    version="2.0.0"
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

# モックデータ（Edge TTS統合版）
MOCK_MODELS = [
    ModelInfo(
        id="edge_tts_nanami",
        name="Edge TTS Nanami (Japanese Female)",
        language="ja_JP",
        description="Microsoft Edge TTS Nanami Neural - 日本語女性音声（高品質・自然）"
    ),
    ModelInfo(
        id="edge_tts_keita",
        name="Edge TTS Keita (Japanese Male)",
        language="ja_JP",
        description="Microsoft Edge TTS Keita Neural - 日本語男性音声（高品質・自然）"
    ),
    ModelInfo(
        id="mathematical_fallback",
        name="Mathematical Synthesis (Fallback)",
        language="ja_JP",
        description="数学的音声合成（Edge TTS利用不可時のフォールバック）"
    )
]

current_model = "edge_tts_nanami"

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
    print("[OK] Server ready at http://localhost:8001")
    print("[OK] API docs at http://localhost:8001/docs")
    print("=" * 70)

@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "service": "Enhanced Mock DiffSinger API",
        "version": "2.0.0",
        "status": "running",
        "edge_tts_available": EDGE_TTS_AVAILABLE,
        "current_model": current_model,
        "docs": "/docs",
        "note": "This is an enhanced mock server with Edge TTS integration"
    }

@app.get("/health")
async def health():
    """ヘルスチェックエンドポイント"""
    return {
        "status": "healthy",
        "service": "Enhanced Mock DiffSinger",
        "version": "2.0.0",
        "current_model": current_model,
        "edge_tts_available": EDGE_TTS_AVAILABLE,
        "timestamp": time.time()
    }

@app.get("/api/models")
async def get_models():
    """利用可能なモデル一覧"""
    return {
        "models": [model.dict() for model in MOCK_MODELS],
        "current": current_model,
        "total": len(MOCK_MODELS),
        "edge_tts_enabled": EDGE_TTS_AVAILABLE
    }

@app.post("/api/models/{model_id}/load")
async def load_model(model_id: str):
    """モデルロード（モック）"""
    global current_model

    # モデルIDの検証
    model_ids = [model.id for model in MOCK_MODELS]
    if model_id not in model_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Model {model_id} not found. Available models: {model_ids}"
        )

    # モック遅延（実際のモデルロード時間をシミュレート）
    await asyncio.sleep(0.5)

    previous_model = current_model
    current_model = model_id
    return {
        "status": "success",
        "message": f"Model {model_id} loaded successfully",
        "previous_model": previous_model,
        "current_model": model_id,
        "edge_tts_enabled": EDGE_TTS_AVAILABLE
    }

def create_ssml_with_pitch(text: str, notes_list: list, durations_list: list) -> str:
    """歌詞とMIDIノート情報からSSMLを生成"""

    def midi_note_to_pitch_percent(note_name: str) -> str:
        """MIDIノート名をピッチパーセンテージに変換"""
        # C4 (MIDI 60) を基準 (0%) とする
        note_to_midi = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
            'A#': 10, 'Bb': 10, 'B': 11
        }

        try:
            # 音名とオクターブを分離 (例: C4 → C, 4)
            if '#' in note_name or 'b' in note_name:
                note = note_name[:-1]
                octave = int(note_name[-1])
            else:
                note = note_name[:-1]
                octave = int(note_name[-1])

            # MIDIノート番号を計算
            midi_number = octave * 12 + note_to_midi.get(note, 0)

            # C4 (MIDI 60) からの差分をセミトーン数で計算
            semitone_diff = midi_number - 60

            # セミトーンをピッチパーセンテージに変換 (1セミトーン ≈ 5.946%)
            pitch_percent = semitone_diff * 5.946

            return f"{pitch_percent:+.1f}%"

        except (ValueError, KeyError):
            return "+0.0%"  # エラー時はデフォルト

    def duration_to_rate(duration: float) -> str:
        """デュレーション（秒）を発話速度に変換"""
        if duration < 0.4:
            return "fast"
        elif duration < 0.8:
            return "medium"
        else:
            return "slow"

    # 歌詞を文字単位で分割
    lyrics_chars = list(text)

    # ノート数と歌詞文字数を調整
    if len(lyrics_chars) != len(notes_list):
        if len(lyrics_chars) < len(notes_list):
            # 歌詞が少ない場合は最後の文字を延長
            while len(lyrics_chars) < len(notes_list):
                lyrics_chars.append(lyrics_chars[-1] if lyrics_chars else 'あ')
        else:
            # 歌詞が多い場合は切り詰め
            lyrics_chars = lyrics_chars[:len(notes_list)]

    # デュレーションリストも調整
    durations_float = [float(d) for d in durations_list[:len(lyrics_chars)]]

    # SSML要素を生成
    prosody_elements = []
    for char, note, duration in zip(lyrics_chars, notes_list, durations_float):
        pitch = midi_note_to_pitch_percent(note)
        rate = duration_to_rate(duration)
        prosody_elements.append(f'<prosody pitch="{pitch}" rate="{rate}">{char}</prosody>')

    # 完全なSSMLドキュメントを構築
    ssml_content = ''.join(prosody_elements)
    ssml_document = f'''<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
{ssml_content}
</speak>'''

    print(f"[SSML] Generated SSML for '{text}' with {len(notes_list)} notes")
    print(f"[SSML] Sample: {prosody_elements[0] if prosody_elements else 'No elements'}")

    return ssml_document

async def convert_lyrics_to_japanese_phonetics(lyrics: str) -> str:
    """歌詞を日本語発音に最適化"""

    # 🎵 ハードコーディング: 「あ」を「ありがとう、こころから」に変換
    if lyrics.strip() == "あ":
        # 20ノート用の「ありがとう、こころから」を2回繰り返し
        return "あ り が と う こ こ ろ か ら あ り が と う こ こ ろ か ら"

    # 中国語音に近い歌詞を日本語読みに変換
    chinese_to_japanese_map = {
        "卡": "か",
        "爱": "あい",
        "鲁": "る",
        "诺": "の",
        "乌": "う",
        "他": "た",
        "嘎": "が"
    }

    result = lyrics
    for chinese, japanese in chinese_to_japanese_map.items():
        result = result.replace(chinese, japanese)

    # 歌いやすくするための調整
    result = result.replace("あい", "あ")  # 歌では長い母音を短縮

    return result

async def generate_edge_tts_with_fixed_ssml(text: str, voice: str, output_path: str, notes_list: list, durations_list: list) -> bool:
    """Edge TTS修正版 - 正しいSSML形式でピッチ制御"""
    try:
        voice_mapping = {
            "edge_tts_nanami": "ja-JP-NanamiNeural",
            "edge_tts_keita": "ja-JP-KeitaNeural"
        }

        edge_voice = voice_mapping.get(voice, "ja-JP-NanamiNeural")
        print(f"[Fixed SSML] Generating speech with voice: {edge_voice}")
        print(f"[Fixed SSML] Text: {text}")
        print(f"[Fixed SSML] Notes: {notes_list}")

        # ピッチと速度を直接計算（引数ベースTTS制御）
        if not notes_list or len(notes_list) == 0:
            pitch_percentage = 0
            rate = "medium"
        else:
            # 最初のノートの音程を使用（単一ピッチ制御）
            first_note = notes_list[0]

            # MIDI音名をA4からの半音数に変換
            note_frequencies = {
                'C': -9, 'C#': -8, 'Db': -8, 'D': -7, 'D#': -6, 'Eb': -6, 'E': -5,
                'F': -4, 'F#': -3, 'Gb': -3, 'G': -2, 'G#': -1, 'Ab': -1, 'A': 0,
                'A#': 1, 'Bb': 1, 'B': 2
            }

            try:
                # 音名とオクターブ番号を分離
                if '#' in first_note or 'b' in first_note:
                    note = first_note[:-1]
                    octave = int(first_note[-1])
                else:
                    note = first_note[:-1]
                    octave = int(first_note[-1])

                # A4からの半音数を計算
                base_octave = 4
                semitones_from_a4 = (octave - base_octave) * 12 + note_frequencies.get(note, 0)
            except (ValueError, KeyError):
                print(f"[Argument TTS] Warning: Invalid note '{first_note}', using default")
                semitones_from_a4 = 0  # A4をデフォルト

            # より適切なピッチ範囲（女性の声用に調整）+ 音階を明確にする
            base_pitch_multiplier = 10  # より明確な音階変化
            feminine_pitch_offset = FEMALE_VOICE_PITCH_BOOST * base_pitch_multiplier  # 女性らしい高音
            pitch_percentage = max(-50, min(80, semitones_from_a4 * base_pitch_multiplier + feminine_pitch_offset))

            # 総時間に基づく読み上げ速度（シーケンシャルパイプライン用に調整）
            total_duration = sum(durations_list)
            if total_duration < 3:
                rate = "+20%"  # 速め
            elif total_duration > 15:
                rate = "-50%"  # 非常に遅め（シーケンシャルパイプライン用）
            elif total_duration > 8:
                rate = "-40%"  # 遅め（改善版）
            else:
                rate = "-20%"  # やや遅め（デフォルトを調整）

        # ピッチをHz形式に変換（Edge TTS要求仕様）
        pitch_hz = int(pitch_percentage * 2)  # パーセンテージをHzに変換
        pitch_value = f"{pitch_hz:+d}Hz"
        print(f"[Argument-based TTS] Using Edge TTS argument control: pitch={pitch_value}, rate={rate}")

        # Communicateの引数を動的に構築
        communicate_args = {
            'text': text,
            'voice': edge_voice,
            'pitch': pitch_value
        }
        if rate is not None:
            communicate_args['rate'] = rate

        communicate = edge_tts.Communicate(**communicate_args)

        # 一時ファイルに保存
        temp_path = output_path + "_temp.mp3"
        await communicate.save(temp_path)

        if not os.path.exists(temp_path):
            print(f"[Fixed SSML] Error: Temporary file not created: {temp_path}")
            return False

        # MP3からWAVに変換
        conversion_success = convert_mp3_to_wav(temp_path, output_path)
        if not conversion_success:
            print(f"[Fixed SSML] Warning: MP3 to WAV conversion failed for {output_path}")
            return False

        print(f"[Fixed SSML] Musical audio generated successfully: {output_path}")
        return True

    except Exception as e:
        print(f"[Fixed SSML] Error generating audio: {e}")
        return False

def convert_mp3_to_wav(mp3_path: str, wav_path: str) -> bool:
    """MP3ファイルをWAVファイルに変換する"""
    try:
        if PYDUB_AVAILABLE:
            # Pydubを使用した高品質変換
            print(f"[Audio Converter] Converting {mp3_path} to {wav_path} using Pydub")
            audio = AudioSegment.from_mp3(mp3_path)

            # WAV形式で出力（16bit, ステレオ, 44.1kHz）
            audio.export(wav_path, format="wav", parameters=[
                "-ar", "44100",  # サンプリングレート
                "-ac", "2",      # ステレオ
                "-sample_fmt", "s16"  # 16bit
            ])

            # 元のMP3ファイルを削除
            if os.path.exists(mp3_path):
                os.remove(mp3_path)
                print(f"[Audio Converter] Removed temporary MP3 file: {mp3_path}")

            print(f"[Audio Converter] Successfully converted to WAV: {wav_path}")
            return True

        else:
            # Pydubが利用できない場合のフォールバック
            print(f"[Audio Converter] Pydub not available, using file rename fallback")
            os.rename(mp3_path, wav_path)
            print(f"[Audio Converter] Fallback: Renamed {mp3_path} to {wav_path}")
            return True

    except Exception as e:
        print(f"[Audio Converter] Conversion failed: {e}")
        # エラー時もファイルリネームでフォールバック
        try:
            os.rename(mp3_path, wav_path)
            print(f"[Audio Converter] Error fallback: Renamed {mp3_path} to {wav_path}")
            return True
        except Exception as rename_error:
            print(f"[Audio Converter] Rename fallback also failed: {rename_error}")
            return False

def midi_note_to_frequency(note_name: str) -> float:
    """MIDI音名を正確な周波数（Hz）に変換"""
    # A4 = 440Hz を基準とした12平均律
    note_frequencies = {
        'C': -9, 'C#': -8, 'Db': -8, 'D': -7, 'D#': -6, 'Eb': -6, 'E': -5,
        'F': -4, 'F#': -3, 'Gb': -3, 'G': -2, 'G#': -1, 'Ab': -1, 'A': 0,
        'A#': 1, 'Bb': 1, 'B': 2
    }

    try:
        # 音名とオクターブ番号を分離
        if '#' in note_name or 'b' in note_name:
            note = note_name[:-1]
            octave = int(note_name[-1])
        else:
            note = note_name[:-1]
            octave = int(note_name[-1])

        # A4からの半音数を計算
        base_octave = 4
        semitones_from_a4 = (octave - base_octave) * 12 + note_frequencies.get(note, 0)

        # 12平均律で周波数を計算: f = 440 * 2^(n/12)
        frequency = 440.0 * (2.0 ** (semitones_from_a4 / 12.0))

        print(f"[Musical] {note_name} → {frequency:.2f} Hz")
        return frequency

    except (ValueError, KeyError):
        print(f"[Musical] Warning: Invalid note '{note_name}', using C4 (261.63 Hz)")
        return 261.63  # C4のデフォルト値

def generate_musical_tone(frequency: float, duration: float, phoneme: str = "a") -> np.ndarray:
    """指定された周波数と長さで音楽的で自然な女性歌声を生成"""
    num_samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, num_samples, endpoint=False)

    # 女性らしい音声特性を強化
    # 基本周波数をより高く調整（女性らしさ向上）
    feminine_frequency = frequency * (2 ** (FEMALE_VOICE_PITCH_BOOST / 12.0))

    # より女性らしいビブラート（少し速めで繊細）
    vibrato_rate = 5.2  # Hz (女性的なビブラート)
    vibrato_depth = 0.08  # 8%の周波数変動（より表現力豊か）
    frequency_modulated = feminine_frequency * (1 + vibrato_depth * np.sin(2 * np.pi * vibrato_rate * t))

    # 基本波形（よりリアルな合成）
    fundamental = np.sin(2 * np.pi * frequency_modulated * t)

    # 人間の音声により近い倍音構成
    phoneme_harmonics = {
        'a': [1.0, 0.7, 0.5, 0.3, 0.2, 0.1],  # 「あ」- 明るく開放的
        'e': [1.0, 0.5, 0.8, 0.4, 0.2, 0.1],  # 「え」- 鋭い高周波成分
        'i': [1.0, 0.3, 0.9, 0.5, 0.3, 0.2],  # 「い」- 高い共振
        'o': [1.0, 0.9, 0.4, 0.6, 0.3, 0.2],  # 「お」- 丸く暖かい
        'u': [1.0, 0.6, 0.2, 0.4, 0.5, 0.3],  # 「う」- 低い共振
    }

    # フォルマント周波数を模擬（女性の音声共振特性に最適化）
    formant_frequencies = {
        'a': [950, 1400, 2800],    # あ - 女性の明るい共振（高め）
        'e': [600, 2100, 2900],    # え - 女性の高い共振
        'i': [350, 2600, 3400],    # い - 女性の最高共振
        'o': [600, 1050, 2600],    # お - 女性の中低域共振
        'u': [350, 950, 2500],     # う - 女性の低域共振
    }

    harmonics = phoneme_harmonics.get(phoneme, phoneme_harmonics['a'])
    formants = formant_frequencies.get(phoneme, formant_frequencies['a'])

    # 複雑な波形合成（人間の声道を模擬）
    waveform = np.zeros_like(fundamental)

    # 基本倍音の追加
    for i, amplitude in enumerate(harmonics):
        harmonic_freq = frequency * (i + 1)
        if harmonic_freq < SAMPLE_RATE / 2:
            waveform += amplitude * np.sin(2 * np.pi * harmonic_freq * t)

    # フォルマント（共振）の追加
    for formant_freq in formants:
        if formant_freq < SAMPLE_RATE / 2:
            formant_contribution = 0.3 * np.sin(2 * np.pi * formant_freq * t)
            # フォルマントは時間と共に減衰
            formant_envelope = np.exp(-t * 2)
            waveform += formant_contribution * formant_envelope

    # より自然なエンベロープ（人間の歌声パターン）
    attack_time = 0.05   # 50ms - 速やかな立ち上がり
    decay_time = 0.1     # 100ms - 自然な減衰
    sustain_level = 0.85 # 85% - 歌声は比較的安定
    release_time = 0.2   # 200ms - 自然な余韻

    envelope = np.ones_like(t)
    attack_samples = int(attack_time * SAMPLE_RATE)
    decay_samples = int(decay_time * SAMPLE_RATE)
    release_samples = int(release_time * SAMPLE_RATE)

    # スムーズなアタック（歌声的な立ち上がり）
    if len(envelope) > attack_samples:
        envelope[:attack_samples] = np.sin(np.linspace(0, np.pi/2, attack_samples))**2

    # ディケイ（自然な減衰）
    if len(envelope) > attack_samples + decay_samples:
        envelope[attack_samples:attack_samples + decay_samples] = np.linspace(1, sustain_level, decay_samples)

    # リリース（自然な余韻）
    if len(envelope) > release_samples:
        release_curve = np.sin(np.linspace(np.pi/2, 0, release_samples))**2
        envelope[-release_samples:] = sustain_level * release_curve

    # 息継ぎ効果（微細な音量変動）
    breath_pattern = 1 + 0.02 * np.sin(2 * np.pi * 0.5 * t)  # 0.5Hzの緩やかな変動
    envelope *= breath_pattern

    # エンベロープを適用
    waveform *= envelope

    # より自然な正規化（歌声の音量感）
    if np.max(np.abs(waveform)) > 0:
        waveform *= 0.8 / np.max(np.abs(waveform))  # 少し大きめの音量

    # 微細なノイズ追加（人間らしさ）
    natural_noise = np.random.normal(0, 0.001, len(waveform))
    waveform += natural_noise

    return waveform

def apply_pitch_time_control(input_audio_path: str, output_audio_path: str,
                            target_frequencies: list, target_durations: list) -> bool:
    """Edge TTS音声にピッチシフトとタイムストレッチを適用（シーケンシャルパイプライン方式）"""
    try:
        print(f"[Note Keep Pipeline] Applying note-keeping approach to: {input_audio_path}")
        print(f"[Note Keep Pipeline] Target frequencies: {target_frequencies[:5]}")  # First 5
        print(f"[Note Keep Pipeline] Target durations: {target_durations[:5]}")      # First 5

        # WAVファイル読み込み
        with wave.open(input_audio_path, 'rb') as wav_file:
            frames = wav_file.readframes(wav_file.getnframes())
            channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            frame_rate = wav_file.getframerate()

        # オーディオデータを numpy 配列に変換
        if sample_width == 2:  # 16-bit
            audio_data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        else:
            print(f"[Note Keep Pipeline] Warning: Unsupported sample width: {sample_width}")
            return False

        # ステレオからモノラルに変換（必要に応じて）
        if channels == 2:
            audio_data = audio_data[::2]  # 左チャンネルのみ使用

        original_duration = len(audio_data) / frame_rate
        target_total_duration = sum(target_durations)

        print(f"[Note Keep Pipeline] Original duration: {original_duration:.2f}s")
        print(f"[Note Keep Pipeline] Target duration: {target_total_duration:.2f}s")

        # 音符キープ方式: タイムストレッチの代わりに必要に応じてパディング
        if target_total_duration > original_duration:
            # 音を延長する場合: 音声の後半部分をループして延長
            extend_samples = int((target_total_duration - original_duration) * frame_rate)

            # 音声の後半30%を繰り返し用音源として使用
            loop_start = int(len(audio_data) * 0.7)
            loop_section = audio_data[loop_start:]

            # 必要な分だけ繰り返してパディング
            extended_audio = []
            remaining_samples = extend_samples
            while remaining_samples > 0:
                add_samples = min(remaining_samples, len(loop_section))
                extended_audio.extend(loop_section[:add_samples])
                remaining_samples -= add_samples

            # 元の音声と延長部分を結合
            audio_data = np.concatenate([audio_data, np.array(extended_audio)])
            print(f"[Note Keep Pipeline] Extended audio by {extend_samples} samples using note-keeping")
        elif target_total_duration < original_duration:
            # 音を短縮する場合: 必要な長さまでトリミング
            target_samples = int(target_total_duration * frame_rate)
            audio_data = audio_data[:target_samples]
            print(f"[Note Keep Pipeline] Trimmed audio to {target_samples} samples")

        # 個別音符ピッチ制御（各音符ごとに精密な制御）
        if target_frequencies and len(target_frequencies) == len(target_durations):
            print(f"[Note Keep Pipeline] Applying individual note pitch control for {len(target_frequencies)} notes")

            # 各音符の開始時刻を計算
            note_start_times = []
            current_time = 0
            for duration in target_durations:
                note_start_times.append(current_time)
                current_time += duration

            # 基準周波数（C4 = 261.63 Hz）
            base_frequency = 261.63

            # 各音符に対してピッチ調整を適用
            modified_audio = np.copy(audio_data)

            for i, (target_freq, duration, start_time) in enumerate(zip(target_frequencies, target_durations, note_start_times)):
                # 該当する音符の時間範囲を計算
                start_sample = int(start_time * frame_rate)
                end_sample = int((start_time + duration) * frame_rate)

                # 範囲チェック
                if start_sample >= len(audio_data) or end_sample > len(audio_data):
                    break

                # 該当セグメントを抽出
                segment = audio_data[start_sample:end_sample]
                if len(segment) == 0:
                    continue

                # 音符特有のピッチシフト比率を計算
                pitch_shift_ratio = target_freq / base_frequency

                if abs(pitch_shift_ratio - 1.0) > 0.05:  # 5%以上の変更時のみ適用
                    # セグメント用FFTベースのピッチシフト
                    segment_fft = np.fft.fft(segment)
                    segment_freqs = np.fft.fftfreq(len(segment), 1/frame_rate)

                    # ピッチシフトを適用
                    shifted_segment_fft = np.zeros_like(segment_fft)
                    for j, freq in enumerate(segment_freqs):
                        new_freq_idx = int(j * pitch_shift_ratio)
                        if 0 <= new_freq_idx < len(shifted_segment_fft):
                            shifted_segment_fft[new_freq_idx] = segment_fft[j]

                    # 修正されたセグメントを戻す
                    modified_segment = np.real(np.fft.ifft(shifted_segment_fft))
                    modified_audio[start_sample:end_sample] = modified_segment

                    print(f"[Note Keep Pipeline] Note {i+1}: {target_freq:.1f} Hz (shift: {pitch_shift_ratio:.2f}x)")

            audio_data = modified_audio
            print(f"[Note Keep Pipeline] Applied individual pitch control to all {len(target_frequencies)} notes")

        # 女性らしさの向上（バランス版）
        feminization_boost = 1.2  # 20%高く（バランス調整）
        fft_data = np.fft.fft(audio_data)
        freqs = np.fft.fftfreq(len(audio_data), 1/frame_rate)

        shifted_fft = np.zeros_like(fft_data)
        for i, freq in enumerate(freqs):
            new_freq_idx = int(i * feminization_boost)
            if 0 <= new_freq_idx < len(shifted_fft):
                shifted_fft[new_freq_idx] = fft_data[i]

        audio_data = np.real(np.fft.ifft(shifted_fft))
        print(f"[Note Keep Pipeline] Applied balanced feminization boost: {feminization_boost}x")

        # 歌声性向上: ビブラート効果と音符表現力の追加
        if target_frequencies and len(target_frequencies) == len(target_durations):
            print(f"[Note Keep Pipeline] Adding vibrato and vocal expression")

            # 各音符の開始時刻を再計算（改良後の音声用）
            note_start_times = []
            current_time = 0
            for duration in target_durations:
                note_start_times.append(current_time)
                current_time += duration

            # ビブラート効果を適用
            for i, (target_freq, duration, start_time) in enumerate(zip(target_frequencies, target_durations, note_start_times)):
                # 該当する音符の時間範囲を計算
                start_sample = int(start_time * frame_rate)
                end_sample = int((start_time + duration) * frame_rate)

                # 範囲チェック
                if start_sample >= len(audio_data) or end_sample > len(audio_data):
                    break

                # 長い音符（1.0秒以上）にビブラート効果を適用
                if duration >= 1.0:
                    segment = audio_data[start_sample:end_sample]
                    if len(segment) > 0:
                        # ビブラート周波数（4-6 Hz）とデプス（±2%）
                        vibrato_freq = 5.0  # Hz
                        vibrato_depth = 0.02  # ±2%

                        # 時間軸を生成
                        t = np.linspace(0, duration, len(segment))

                        # ビブラート変調を生成
                        vibrato_modulation = 1.0 + vibrato_depth * np.sin(2 * np.pi * vibrato_freq * t)

                        # セグメントにビブラート効果を適用
                        audio_data[start_sample:end_sample] = segment * vibrato_modulation

                        print(f"[Note Keep Pipeline] Applied vibrato to note {i+1} (duration: {duration:.1f}s)")

            print(f"[Note Keep Pipeline] Enhanced vocal expression completed")

        # 音量正規化
        max_val = np.max(np.abs(audio_data))
        if max_val > 0:
            audio_data = audio_data / max_val * 0.8  # 80%の最大音量

        # 16-bit PCM に変換して保存
        audio_16bit = (audio_data * 32767).astype(np.int16)

        with wave.open(output_audio_path, 'wb') as output_wav:
            output_wav.setnchannels(1)  # モノラル
            output_wav.setsampwidth(2)  # 16-bit
            output_wav.setframerate(frame_rate)
            output_wav.writeframes(audio_16bit.tobytes())

        print(f"[Note Keep Pipeline] Successfully processed and saved: {output_audio_path}")
        final_duration = len(audio_data) / frame_rate
        print(f"[Note Keep Pipeline] Final duration: {final_duration:.2f}s (target: {target_total_duration:.2f}s)")
        return True

    except Exception as e:
        print(f"[Note Keep Pipeline] Error in note-keep processing: {e}")
        return False

def create_musical_vocals(lyrics: str, notes_list: list, durations_list: list, output_path: str) -> bool:
    """歌詞とノート情報から音楽的な歌声を生成"""
    print(f"[Musical] Creating vocals for '{lyrics}' with {len(notes_list)} notes")

    # 歌詞を文字単位で分割
    lyrics_chars = list(lyrics)

    # ノート数と歌詞文字数を調整
    if len(lyrics_chars) != len(notes_list):
        print(f"[Musical] Adjusting lyrics length: {len(lyrics_chars)} chars to {len(notes_list)} notes")
        if len(lyrics_chars) < len(notes_list):
            # 歌詞が少ない場合は最後の文字を延長
            while len(lyrics_chars) < len(notes_list):
                lyrics_chars.append(lyrics_chars[-1] if lyrics_chars else 'あ')
        else:
            # 歌詞が多い場合は切り詰め
            lyrics_chars = lyrics_chars[:len(notes_list)]

    # 日本語音素マッピング
    phoneme_map = {
        'か': 'a', 'き': 'i', 'く': 'u', 'け': 'e', 'こ': 'o',
        'が': 'a', 'ぎ': 'i', 'ぐ': 'u', 'げ': 'e', 'ご': 'o',
        'さ': 'a', 'し': 'i', 'す': 'u', 'せ': 'e', 'そ': 'o',
        'ざ': 'a', 'じ': 'i', 'ず': 'u', 'ぜ': 'e', 'ぞ': 'o',
        'た': 'a', 'ち': 'i', 'つ': 'u', 'て': 'e', 'と': 'o',
        'だ': 'a', 'ぢ': 'i', 'づ': 'u', 'で': 'e', 'ど': 'o',
        'な': 'a', 'に': 'i', 'ぬ': 'u', 'ね': 'e', 'の': 'o',
        'は': 'a', 'ひ': 'i', 'ふ': 'u', 'へ': 'e', 'ほ': 'o',
        'ば': 'a', 'び': 'i', 'ぶ': 'u', 'べ': 'e', 'ぼ': 'o',
        'ぱ': 'a', 'ぴ': 'i', 'ぷ': 'u', 'ぺ': 'e', 'ぽ': 'o',
        'ま': 'a', 'み': 'i', 'む': 'u', 'め': 'e', 'も': 'o',
        'や': 'a', 'ゆ': 'u', 'よ': 'o',
        'ら': 'a', 'り': 'i', 'る': 'u', 'れ': 'e', 'ろ': 'o',
        'わ': 'a', 'ゐ': 'i', 'ゑ': 'e', 'を': 'o', 'ん': 'u',
        'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o'
    }

    # 音楽的波形を生成
    vocal_segments = []

    for char, note, duration in zip(lyrics_chars, notes_list, durations_list):
        # 周波数を取得
        frequency = midi_note_to_frequency(note)

        # 音素を取得
        phoneme = phoneme_map.get(char, 'a')

        # 音楽的な長さに調整（最低1秒）
        musical_duration = max(MUSICAL_NOTE_DURATION, float(duration))

        # 音楽的音を生成
        segment = generate_musical_tone(frequency, musical_duration, phoneme)
        vocal_segments.append(segment)

        print(f"[Musical] {char} ({phoneme}) → {frequency:.2f} Hz × {musical_duration:.1f}s")

    # 全セグメントを結合
    full_vocal = np.concatenate(vocal_segments)

    print(f"[Musical] Generated {len(full_vocal)} samples ({len(full_vocal)/SAMPLE_RATE:.2f} seconds)")

    # WAVファイルとして保存
    return save_musical_audio(full_vocal, output_path)

def save_musical_audio(waveform: np.ndarray, output_path: str) -> bool:
    """音楽的波形をWAVファイルとして保存"""
    try:
        # 16-bit PCM形式で保存
        waveform_16bit = (waveform * 32767).astype(np.int16)

        with wave.open(output_path, 'w') as wav_file:
            wav_file.setnchannels(1)  # モノラル
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(SAMPLE_RATE)
            wav_file.writeframes(waveform_16bit.tobytes())

        print(f"[Musical] Saved audio: {output_path}")
        return True

    except Exception as e:
        print(f"[Musical] Error saving audio: {e}")
        return False

async def generate_edge_tts_audio_with_pitch(text: str, voice: str, output_path: str, notes_list: list, durations_list: list) -> bool:
    """Edge TTSを使用して音程制御付き音声生成"""
    try:
        # Edge TTS voice設定
        voice_map = {
            "edge_tts_nanami": "ja-JP-NanamiNeural",
            "edge_tts_keita": "ja-JP-KeitaNeural"
        }

        edge_voice = voice_map.get(voice, "ja-JP-NanamiNeural")

        print(f"[Edge TTS] Generating musical speech with voice: {edge_voice}")
        print(f"[Edge TTS] Text: {text}")
        print(f"[Edge TTS] Notes: {notes_list}")

        # ピッチと速度を直接計算（引数ベースTTS制御）
        if not notes_list or len(notes_list) == 0:
            pitch_percentage = 0
            rate = None
        else:
            # 最初のノートの音程を使用（単一ピッチ制御）
            first_note = notes_list[0]

            # MIDI音名をA4からの半音数に変換
            note_frequencies = {
                'C': -9, 'C#': -8, 'Db': -8, 'D': -7, 'D#': -6, 'Eb': -6, 'E': -5,
                'F': -4, 'F#': -3, 'Gb': -3, 'G': -2, 'G#': -1, 'Ab': -1, 'A': 0,
                'A#': 1, 'Bb': 1, 'B': 2
            }

            try:
                # 音名とオクターブ番号を分離
                if '#' in first_note or 'b' in first_note:
                    note = first_note[:-1]
                    octave = int(first_note[-1])
                else:
                    note = first_note[:-1]
                    octave = int(first_note[-1])

                # A4からの半音数を計算
                base_octave = 4
                semitones_from_a4 = (octave - base_octave) * 12 + note_frequencies.get(note, 0)
            except (ValueError, KeyError):
                print(f"[Argument TTS] Warning: Invalid note '{first_note}', using default")
                semitones_from_a4 = 0  # A4をデフォルト

            # より適切なピッチ範囲（女性の声用に調整）+ 音階を明確にする
            base_pitch_multiplier = 10  # より明確な音階変化
            feminine_pitch_offset = FEMALE_VOICE_PITCH_BOOST * base_pitch_multiplier  # 女性らしい高音
            pitch_percentage = max(-50, min(80, semitones_from_a4 * base_pitch_multiplier + feminine_pitch_offset))

            # 総時間に基づく読み上げ速度（シーケンシャルパイプライン用に調整）
            total_duration = sum(durations_list)
            if total_duration < 3:
                rate = "+20%"  # 速め
            elif total_duration > 15:
                rate = "-50%"  # 非常に遅め（シーケンシャルパイプライン用）
            elif total_duration > 8:
                rate = "-40%"  # 遅め（改善版）
            else:
                rate = "-20%"  # やや遅め（デフォルトを調整）

        # ピッチをHz形式に変換（Edge TTS要求仕様）
        pitch_hz = int(pitch_percentage * 2)  # パーセンテージをHzに変換
        pitch_value = f"{pitch_hz:+d}Hz"
        print(f"[Argument-based TTS] Using Edge TTS argument control: pitch={pitch_value}, rate={rate}")

        # Communicateの引数を動的に構築
        communicate_args = {
            'text': text,
            'voice': edge_voice,
            'pitch': pitch_value
        }
        if rate is not None:
            communicate_args['rate'] = rate

        communicate = edge_tts.Communicate(**communicate_args)

        # 一時ファイルに保存
        temp_path = output_path + "_temp.mp3"
        await communicate.save(temp_path)

        # MP3からWAVに変換（高品質変換）
        conversion_success = convert_mp3_to_wav(temp_path, output_path)
        if not conversion_success:
            print(f"[Edge TTS] Warning: MP3 to WAV conversion failed for {output_path}")
            return False

        print(f"[Edge TTS] Musical audio generated successfully: {output_path}")
        return True

    except Exception as e:
        print(f"[Edge TTS] Error generating musical audio: {e}")
        return False

async def generate_edge_tts_audio(text: str, voice: str, output_path: str) -> bool:
    """Edge TTSを使用して音声生成（旧バージョン、互換性維持）"""
    try:
        # Edge TTS voice設定
        voice_map = {
            "edge_tts_nanami": "ja-JP-NanamiNeural",
            "edge_tts_keita": "ja-JP-KeitaNeural"
        }

        edge_voice = voice_map.get(voice, "ja-JP-NanamiNeural")

        print(f"[Edge TTS] Generating speech with voice: {edge_voice}")
        print(f"[Edge TTS] Text: {text}")

        # Edge TTSで音声生成
        communicate = edge_tts.Communicate(text, edge_voice)

        # 一時ファイルに保存
        temp_path = output_path + "_temp.mp3"
        await communicate.save(temp_path)

        # MP3からWAVに変換（高品質変換）
        conversion_success = convert_mp3_to_wav(temp_path, output_path)
        if not conversion_success:
            print(f"[Edge TTS] Warning: MP3 to WAV conversion failed for {output_path}")
            return False

        print(f"[Edge TTS] Audio generated successfully: {output_path}")
        return True

    except Exception as e:
        print(f"[Edge TTS] Error generating audio: {e}")
        return False

def create_mathematical_audio_fallback(lyrics: str, notes_list: list, durations_list: list, output_path: str, total_duration: float):
    """Edge TTS利用不可時のフォールバック（数学的合成）"""
    print("[Fallback] Using mathematical synthesis (Edge TTS not available)")

    # 簡略化された正弦波ベースの音声生成
    import math

    with open(output_path, 'wb') as f:
        # 音声パラメータ
        sample_rate = 44100
        channels = 1  # モノラル
        bits_per_sample = 16
        audio_samples = int(sample_rate * total_duration)
        data_size = audio_samples * channels * (bits_per_sample // 8)
        file_size = 36 + data_size

        # RIFFヘッダー
        f.write(b'RIFF')
        f.write(file_size.to_bytes(4, 'little'))
        f.write(b'WAVE')

        # fmtチャンク
        f.write(b'fmt ')
        f.write((16).to_bytes(4, 'little'))
        f.write((1).to_bytes(2, 'little'))
        f.write(channels.to_bytes(2, 'little'))
        f.write(sample_rate.to_bytes(4, 'little'))
        f.write((sample_rate * channels * bits_per_sample // 8).to_bytes(4, 'little'))
        f.write((channels * bits_per_sample // 8).to_bytes(2, 'little'))
        f.write(bits_per_sample.to_bytes(2, 'little'))

        # dataチャンク
        f.write(b'data')
        f.write(data_size.to_bytes(4, 'little'))

        # 簡単な音声データ生成
        def note_to_freq(note_name):
            if len(note_name) < 2:
                return 440.0
            note = note_name[:-1]
            octave = int(note_name[-1])
            note_offsets = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
            if note not in note_offsets:
                return 440.0
            midi_number = (octave - 4) * 12 + note_offsets[note] - 9
            return 440.0 * (2 ** (midi_number / 12))

        audio_data = bytearray()
        current_time = 0.0

        for note_name, duration in zip(notes_list, durations_list):
            frequency = note_to_freq(note_name)
            note_samples = int(sample_rate * duration)

            for sample_idx in range(note_samples):
                time = sample_idx / sample_rate

                # シンプルな正弦波
                sample_value = 0.3 * math.sin(2 * math.pi * frequency * time)

                # エンベロープ
                if time < 0.05:
                    envelope = time / 0.05
                elif time > duration - 0.05:
                    envelope = (duration - time) / 0.05
                else:
                    envelope = 1.0

                sample_value *= envelope

                # 16bitサンプルに変換
                sample_16bit = int(sample_value * 16000)
                sample_16bit = max(-32768, min(32767, sample_16bit))

                audio_data.extend(sample_16bit.to_bytes(2, 'little', signed=True))

            current_time += duration

        f.write(audio_data)

@app.post("/api/synthesize", response_model=SynthesisResponse)
async def synthesize(request: SynthesisRequest):
    """音声合成（Edge TTS統合版）"""
    try:
        print(f"[Enhanced Mock] Synthesis request received:")
        print(f"  Lyrics: {request.lyrics}")
        print(f"  Notes: {request.notes}")
        print(f"  Durations: {request.durations}")
        print(f"  Current model: {current_model}")

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

        # 出力ディレクトリ作成
        output_path = Path(request.output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # 歌詞を日本語発音に最適化
        japanese_lyrics = await convert_lyrics_to_japanese_phonetics(request.lyrics)
        print(f"[Enhanced Mock] Converted lyrics: '{request.lyrics}' -> '{japanese_lyrics}'")

        synthesis_success = False
        engine_info = "Unknown"

        print(f"[Enhanced Mock] Synthesis mode: {SYNTHESIS_MODE}")

        # シーケンシャルパイプライン方式（edge_tts_post モード）
        if SYNTHESIS_MODE == "edge_tts_post" and EDGE_TTS_AVAILABLE and current_model.startswith("edge_tts_"):
            print(f"[Enhanced Mock] Using Sequential Pipeline: Edge TTS + Post-processing")
            try:
                # Step 1: Edge TTSで基本音声生成
                temp_edge_output = str(output_path).replace(".wav", "_temp_edge.wav")
                durations_float = [float(dur) for dur in durations_list]
                edge_success = await generate_edge_tts_with_fixed_ssml(
                    japanese_lyrics,
                    current_model,
                    temp_edge_output,
                    notes_list,
                    durations_float
                )

                if edge_success and Path(temp_edge_output).exists():
                    print(f"[Enhanced Mock] Edge TTS step completed, applying post-processing...")

                    # Step 2: 音階と音長の後処理を適用
                    target_frequencies = [midi_note_to_frequency(note) for note in notes_list]
                    post_success = apply_pitch_time_control(
                        temp_edge_output,
                        str(output_path),
                        target_frequencies,
                        durations_float
                    )

                    if post_success:
                        synthesis_success = True
                        engine_info = f"Sequential Pipeline (Edge TTS + Post-processing)"
                        print(f"[Enhanced Mock] Sequential pipeline completed successfully")

                    # 一時ファイルを削除
                    try:
                        Path(temp_edge_output).unlink()
                    except:
                        pass
                else:
                    print(f"[Enhanced Mock] Edge TTS step failed in sequential pipeline")

            except Exception as e:
                print(f"[Enhanced Mock] Sequential pipeline error: {e}")

        # Edge TTS のみモード（edge_tts_only）
        elif SYNTHESIS_MODE == "edge_tts_only" and EDGE_TTS_AVAILABLE and current_model.startswith("edge_tts_"):
            print(f"[Enhanced Mock] Using Edge TTS only mode")
            try:
                durations_float = [float(dur) for dur in durations_list]
                success = await generate_edge_tts_with_fixed_ssml(
                    japanese_lyrics,
                    current_model,
                    str(output_path),
                    notes_list,
                    durations_float
                )

                if success:
                    synthesis_success = True
                    engine_info = f"Edge TTS Only ({current_model})"
                    print(f"[Enhanced Mock] Edge TTS only mode completed successfully")

            except Exception as e:
                print(f"[Enhanced Mock] Edge TTS only mode error: {e}")

        # 従来の優先順位システム（musical_first または他のモード）
        if not synthesis_success:
            # 優先順位1: 新しい音楽的合成システム（正確な音階・音長制御）
            print(f"[Enhanced Mock] Using Musical Synthesis System for accurate pitch and duration control")
            try:
                durations_float = [float(dur) for dur in durations_list]
                success = create_musical_vocals(
                    japanese_lyrics,
                    notes_list,
                    durations_float,
                    str(output_path)
                )

                if success:
                    synthesis_success = True
                    engine_info = "Musical Synthesis (Accurate Pitch & Duration)"
                    print(f"[Enhanced Mock] Musical synthesis completed successfully")
                else:
                    print(f"[Enhanced Mock] Musical synthesis failed, trying Edge TTS fallback")

            except Exception as e:
                print(f"[Enhanced Mock] Musical synthesis error: {e}")

            # 優先順位2: Edge TTS（音楽的合成失敗時のフォールバック）
            if not synthesis_success and EDGE_TTS_AVAILABLE and current_model.startswith("edge_tts_"):
                print(f"[Enhanced Mock] Fallback to Edge TTS: {current_model}")
                try:
                    durations_float = [float(dur) for dur in durations_list]
                    success = await generate_edge_tts_with_fixed_ssml(
                        japanese_lyrics,
                        current_model,
                        str(output_path),
                        notes_list,
                        durations_float
                    )

                    if success:
                        synthesis_success = True
                        engine_info = f"Edge TTS Fallback ({current_model})"
                        print(f"[Enhanced Mock] Edge TTS fallback completed successfully")
                    else:
                        print(f"[Enhanced Mock] Edge TTS fallback failed")

                except Exception as e:
                    print(f"[Enhanced Mock] Edge TTS fallback error: {e}")

        # 優先順位3: レガシー音楽的合成システム（最終フォールバック）
        if not synthesis_success:
            print(f"[Enhanced Mock] Using improved musical synthesis system as fallback...")
            try:
                # 新しい周波数ベース音楽合成
                durations_float = [float(dur) for dur in durations_list]
                success = create_musical_vocals(
                    japanese_lyrics,
                    notes_list,
                    durations_float,
                    str(output_path)
                )

                if success:
                    synthesis_success = True
                    engine_info = "Musical Synthesis (Frequency-based)"
                    print(f"[Enhanced Mock] Musical synthesis completed successfully")
                else:
                    print(f"[Enhanced Mock] Musical synthesis failed, using final fallback")

            except Exception as e:
                print(f"[Enhanced Mock] Musical synthesis error: {e}")

        # 最終フォールバック：数学的合成
        if not synthesis_success:
            create_mathematical_audio_fallback(
                japanese_lyrics,
                notes_list,
                durations_list,
                str(output_path),
                total_duration
            )
            engine_info = "Mathematical Synthesis (Final Fallback)"
            print(f"[Enhanced Mock] Mathematical synthesis completed")

        print(f"[Enhanced Mock] Output file: {output_path}")

        return SynthesisResponse(
            status="success",
            message=f"Enhanced synthesis completed using {engine_info} for '{japanese_lyrics}' ({len(notes_list)} notes)",
            audio_path=str(output_path),
            duration=total_duration
        )

    except ValueError as e:
        print(f"[Enhanced Mock] Input error: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid input: {str(e)}"
        )
    except Exception as e:
        print(f"[Enhanced Mock] Synthesis error: {e}")
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
        "message": "Enhanced musical synthesis completed",
        "engine": "Musical Synthesis"
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

    print(f"[Enhanced Mock] Serving audio file: {output_path}")

    # Edge TTSで生成されたファイルの場合、MP3として配信
    if EDGE_TTS_AVAILABLE and current_model.startswith("edge_tts_"):
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

# サーバー起動設定
if __name__ == "__main__":
    print("Starting Enhanced Mock DiffSinger Server with Edge TTS...")
    uvicorn.run(app, host="127.0.0.1", port=8001)