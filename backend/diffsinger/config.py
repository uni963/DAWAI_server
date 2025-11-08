#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Configuration Module for DiffSinger Server

このモジュールは設定定数とグローバル設定を管理します。
"""

from typing import List
from models import ModelInfo

# === 音声合成設定 ===
SAMPLE_RATE = 44100  # CD quality sample rate
MUSICAL_NOTE_DURATION = 1.0  # 1.0 second per note for appropriate rhythm
FEMALE_VOICE_PITCH_BOOST = 12  # +12 semitones for more feminine voice

# === 合成モード設定 ===
SYNTHESIS_MODE = "musical_first"  # 数学的合成システムに戻す
# Options: musical_first, edge_tts_post, edge_tts_only

# === ピッチ制御設定 ===
BASE_PITCH_MULTIPLIER = 10  # より明確な音階変化
FEMINIZATION_BOOST_RATIO = 1.2  # 20%高く（バランス調整）
VIBRATO_FREQUENCY_HZ = 5.0  # Hz
VIBRATO_DEPTH_PERCENT = 0.02  # ±2%

# === ビブラート設定 ===
VIBRATO_RATE = 5.2  # Hz (女性的なビブラート)
VIBRATO_DEPTH = 0.08  # 8%の周波数変動（より表現力豊か）

# === エンベロープ設定 ===
ATTACK_TIME = 0.05   # 50ms - 速やかな立ち上がり
DECAY_TIME = 0.1     # 100ms - 自然な減衰
SUSTAIN_LEVEL = 0.85 # 85% - 歌声は比較的安定
RELEASE_TIME = 0.2   # 200ms - 自然な余韻

# === 音量設定 ===
WAVEFORM_NORMALIZATION_LEVEL = 0.8  # 少し大きめの音量
NATURAL_NOISE_LEVEL = 0.001  # 微細なノイズレベル（人間らしさ）

# === CORS設定 ===
ALLOWED_ORIGINS: List[str] = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175"
]

# === サーバー設定 ===
SERVER_HOST = "127.0.0.1"
SERVER_PORT = 8001
SERVER_TITLE = "Enhanced Mock DiffSinger API"
SERVER_DESCRIPTION = "Edge TTS統合リアル日本語歌声合成エンジン（テスト用）"
SERVER_VERSION = "2.0.0"

# === Edge TTS音声マッピング ===
VOICE_MAPPING = {
    "edge_tts_nanami": "ja-JP-NanamiNeural",
    "edge_tts_keita": "ja-JP-KeitaNeural"
}

# === モックモデル定義 ===
MOCK_MODELS: List[ModelInfo] = [
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

# === グローバル状態 ===
# Note: この変数は後で状態管理クラスに移行する予定
current_model = "edge_tts_nanami"

# === 音素とフォルマント周波数の定義 ===
PHONEME_HARMONICS = {
    'a': [1.0, 0.7, 0.5, 0.3, 0.2, 0.1],  # 「あ」- 明るく開放的
    'e': [1.0, 0.5, 0.8, 0.4, 0.2, 0.1],  # 「え」- 鋭い高周波成分
    'i': [1.0, 0.3, 0.9, 0.5, 0.3, 0.2],  # 「い」- 高い共振
    'o': [1.0, 0.9, 0.4, 0.6, 0.3, 0.2],  # 「お」- 丸く暖かい
    'u': [1.0, 0.6, 0.2, 0.4, 0.5, 0.3],  # 「う」- 低い共振
}

FORMANT_FREQUENCIES = {
    'a': [950, 1400, 2800],    # あ - 女性の明るい共振（高め）
    'e': [600, 2100, 2900],    # え - 女性の高い共振
    'i': [350, 2600, 3400],    # い - 女性の最高共振
    'o': [600, 1050, 2600],    # お - 女性の中低域共振
    'u': [350, 950, 2500],     # う - 女性の低域共振
}

# === 日本語音素マッピング ===
PHONEME_MAP = {
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

# === 中国語から日本語への変換マッピング ===
CHINESE_TO_JAPANESE_MAP = {
    "卡": "か",
    "爱": "あい",
    "鲁": "る",
    "诺": "の",
    "乌": "う",
    "他": "た",
    "嘎": "が"
}
