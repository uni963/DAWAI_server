#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Audio Synthesis Integration Module for DiffSinger

このモジュールは複数の音声合成手法を統合し、最適な合成方法を選択します。
"""

from pathlib import Path
from typing import List, Tuple

from config import SYNTHESIS_MODE
from edge_tts_handler import (
    EDGE_TTS_AVAILABLE,
    generate_edge_tts_with_pitch_control
)
from musical_synthesis import create_musical_vocals, create_mathematical_audio_fallback
from audio_processing import apply_pitch_time_control
from midi_utils import midi_note_to_frequency
from ssml_generator import convert_lyrics_to_japanese_phonetics


async def synthesize_audio(
    lyrics: str,
    notes_list: List[str],
    durations_list: List[float],
    output_path: str,
    current_model: str
) -> Tuple[bool, str]:
    """
    複数の合成手法を統合した音声合成

    Args:
        lyrics: 歌詞テキスト
        notes_list: MIDIノート名のリスト
        durations_list: デュレーションのリスト（秒）
        output_path: 出力WAVファイルパス
        current_model: 使用するモデル名

    Returns:
        Tuple[bool, str]: (合成成功フラグ, エンジン情報文字列)
    """
    # 歌詞を日本語発音に最適化
    japanese_lyrics = await convert_lyrics_to_japanese_phonetics(lyrics)
    print(f"[Audio Synthesis] Converted lyrics: '{lyrics}' -> '{japanese_lyrics}'")

    synthesis_success = False
    engine_info = "Unknown"
    total_duration = sum(durations_list)

    print(f"[Audio Synthesis] Synthesis mode: {SYNTHESIS_MODE}")

    # シーケンシャルパイプライン方式（edge_tts_post モード）
    if SYNTHESIS_MODE == "edge_tts_post" and EDGE_TTS_AVAILABLE and current_model.startswith("edge_tts_"):
        print(f"[Audio Synthesis] Using Sequential Pipeline: Edge TTS + Post-processing")
        try:
            # Step 1: Edge TTSで基本音声生成
            temp_edge_output = str(output_path).replace(".wav", "_temp_edge.wav")
            edge_success = await generate_edge_tts_with_pitch_control(
                japanese_lyrics,
                current_model,
                temp_edge_output,
                notes_list,
                durations_list
            )

            if edge_success and Path(temp_edge_output).exists():
                print(f"[Audio Synthesis] Edge TTS step completed, applying post-processing...")

                # Step 2: 音階と音長の後処理を適用
                target_frequencies = [midi_note_to_frequency(note) for note in notes_list]
                post_success = apply_pitch_time_control(
                    temp_edge_output,
                    str(output_path),
                    target_frequencies,
                    durations_list
                )

                if post_success:
                    synthesis_success = True
                    engine_info = f"Sequential Pipeline (Edge TTS + Post-processing)"
                    print(f"[Audio Synthesis] Sequential pipeline completed successfully")

                # 一時ファイルを削除
                try:
                    Path(temp_edge_output).unlink()
                except:
                    pass
            else:
                print(f"[Audio Synthesis] Edge TTS step failed in sequential pipeline")

        except Exception as e:
            print(f"[Audio Synthesis] Sequential pipeline error: {e}")

    # Edge TTS のみモード（edge_tts_only）
    elif SYNTHESIS_MODE == "edge_tts_only" and EDGE_TTS_AVAILABLE and current_model.startswith("edge_tts_"):
        print(f"[Audio Synthesis] Using Edge TTS only mode")
        try:
            success = await generate_edge_tts_with_pitch_control(
                japanese_lyrics,
                current_model,
                str(output_path),
                notes_list,
                durations_list
            )

            if success:
                synthesis_success = True
                engine_info = f"Edge TTS Only ({current_model})"
                print(f"[Audio Synthesis] Edge TTS only mode completed successfully")

        except Exception as e:
            print(f"[Audio Synthesis] Edge TTS only mode error: {e}")

    # 従来の優先順位システム（musical_first または他のモード）
    if not synthesis_success:
        # 優先順位1: 新しい音楽的合成システム（正確な音階・音長制御）
        print(f"[Audio Synthesis] Using Musical Synthesis System for accurate pitch and duration control")
        try:
            success = create_musical_vocals(
                japanese_lyrics,
                notes_list,
                durations_list,
                str(output_path)
            )

            if success:
                synthesis_success = True
                engine_info = "Musical Synthesis (Accurate Pitch & Duration)"
                print(f"[Audio Synthesis] Musical synthesis completed successfully")
            else:
                print(f"[Audio Synthesis] Musical synthesis failed, trying Edge TTS fallback")

        except Exception as e:
            print(f"[Audio Synthesis] Musical synthesis error: {e}")

        # 優先順位2: Edge TTS（音楽的合成失敗時のフォールバック）
        if not synthesis_success and EDGE_TTS_AVAILABLE and current_model.startswith("edge_tts_"):
            print(f"[Audio Synthesis] Fallback to Edge TTS: {current_model}")
            try:
                success = await generate_edge_tts_with_pitch_control(
                    japanese_lyrics,
                    current_model,
                    str(output_path),
                    notes_list,
                    durations_list
                )

                if success:
                    synthesis_success = True
                    engine_info = f"Edge TTS Fallback ({current_model})"
                    print(f"[Audio Synthesis] Edge TTS fallback completed successfully")
                else:
                    print(f"[Audio Synthesis] Edge TTS fallback failed")

            except Exception as e:
                print(f"[Audio Synthesis] Edge TTS fallback error: {e}")

    # 優先順位3: レガシー音楽的合成システム（最終フォールバック）
    if not synthesis_success:
        print(f"[Audio Synthesis] Using improved musical synthesis system as fallback...")
        try:
            success = create_musical_vocals(
                japanese_lyrics,
                notes_list,
                durations_list,
                str(output_path)
            )

            if success:
                synthesis_success = True
                engine_info = "Musical Synthesis (Frequency-based)"
                print(f"[Audio Synthesis] Musical synthesis completed successfully")
            else:
                print(f"[Audio Synthesis] Musical synthesis failed, using final fallback")

        except Exception as e:
            print(f"[Audio Synthesis] Musical synthesis error: {e}")

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
        print(f"[Audio Synthesis] Mathematical synthesis completed")

    print(f"[Audio Synthesis] Output file: {output_path}")
    return synthesis_success, engine_info
