#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Edge TTS Handler for DiffSinger

このモジュールはMicrosoft Edge TTSを使用した音声合成機能を提供します。
"""

import os
from pathlib import Path
from typing import List, Optional

from config import (
    VOICE_MAPPING,
    FEMALE_VOICE_PITCH_BOOST,
    BASE_PITCH_MULTIPLIER
)
from midi_utils import NOTE_TO_SEMITONE, parse_note_for_pitch_control
from audio_processing import convert_mp3_to_wav

# Edge TTS import
try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
    print("[Edge TTS Handler] Edge TTS successfully imported")
except ImportError:
    EDGE_TTS_AVAILABLE = False
    print("[Edge TTS Handler] Edge TTS not available")


async def generate_edge_tts_with_pitch_control(
    text: str,
    voice: str,
    output_path: str,
    notes_list: List[str],
    durations_list: List[float]
) -> bool:
    """
    Edge TTS修正版 - 正しいSSML形式でピッチ制御

    Args:
        text: 合成する歌詞テキスト
        voice: 使用する音声モデル名（"edge_tts_nanami", "edge_tts_keita"等）
        output_path: 出力WAVファイルパス
        notes_list: MIDIノート名のリスト
        durations_list: デュレーションのリスト（秒）

    Returns:
        bool: 合成成功時True、失敗時False
    """
    if not EDGE_TTS_AVAILABLE:
        print("[Edge TTS] Edge TTS is not available")
        return False

    try:
        edge_voice = VOICE_MAPPING.get(voice, "ja-JP-NanamiNeural")
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
                semitones_from_a4 = (octave - base_octave) * 12 + NOTE_TO_SEMITONE.get(note, 0)
            except (ValueError, KeyError):
                print(f"[Argument TTS] Warning: Invalid note '{first_note}', using default")
                semitones_from_a4 = 0  # A4をデフォルト

            # より適切なピッチ範囲（女性の声用に調整）+ 音階を明確にする
            feminine_pitch_offset = FEMALE_VOICE_PITCH_BOOST * BASE_PITCH_MULTIPLIER  # 女性らしい高音
            pitch_percentage = max(-50, min(80, semitones_from_a4 * BASE_PITCH_MULTIPLIER + feminine_pitch_offset))

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


async def generate_edge_tts_audio(text: str, voice: str, output_path: str) -> bool:
    """
    Edge TTSを使用して音声生成（旧バージョン、互換性維持）

    Args:
        text: 合成するテキスト
        voice: 使用する音声モデル名
        output_path: 出力WAVファイルパス

    Returns:
        bool: 合成成功時True、失敗時False
    """
    if not EDGE_TTS_AVAILABLE:
        print("[Edge TTS] Edge TTS is not available")
        return False

    try:
        edge_voice = VOICE_MAPPING.get(voice, "ja-JP-NanamiNeural")

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
