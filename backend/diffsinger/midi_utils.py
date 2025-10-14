#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MIDI Utilities for DiffSinger

このモジュールはMIDI音名から周波数への変換などのユーティリティ関数を提供します。
"""

from typing import Dict

# MIDI音名からA4までの半音数へのマッピング
NOTE_TO_SEMITONE: Dict[str, int] = {
    'C': -9, 'C#': -8, 'Db': -8, 'D': -7, 'D#': -6, 'Eb': -6, 'E': -5,
    'F': -4, 'F#': -3, 'Gb': -3, 'G': -2, 'G#': -1, 'Ab': -1, 'A': 0,
    'A#': 1, 'Bb': 1, 'B': 2
}

# A4の基準周波数
A4_FREQUENCY = 440.0
C4_FREQUENCY = 261.63


def midi_note_to_frequency(note_name: str) -> float:
    """
    MIDI音名を正確な周波数（Hz）に変換

    Args:
        note_name: MIDI音名（例: "A4", "C#5", "Db3"）

    Returns:
        float: 周波数（Hz）

    Examples:
        >>> midi_note_to_frequency("A4")
        440.0
        >>> midi_note_to_frequency("C4")
        261.63
    """
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
        semitones_from_a4 = (octave - base_octave) * 12 + NOTE_TO_SEMITONE.get(note, 0)

        # 12平均律で周波数を計算: f = 440 * 2^(n/12)
        frequency = A4_FREQUENCY * (2.0 ** (semitones_from_a4 / 12.0))

        print(f"[Musical] {note_name} → {frequency:.2f} Hz")
        return frequency

    except (ValueError, KeyError) as e:
        print(f"[Musical] Warning: Invalid note '{note_name}' ({e}), using C4 ({C4_FREQUENCY} Hz)")
        return C4_FREQUENCY  # C4のデフォルト値


def midi_note_to_pitch_percent(note_name: str) -> str:
    """
    MIDIノート名をピッチパーセンテージに変換（SSML用）

    Args:
        note_name: MIDI音名（例: "C4", "D#5"）

    Returns:
        str: ピッチパーセンテージ文字列（例: "+10.0%", "-5.0%"）
    """
    try:
        # 音名とオクターブを分離
        if '#' in note_name or 'b' in note_name:
            note = note_name[:-1]
            octave = int(note_name[-1])
        else:
            note = note_name[:-1]
            octave = int(note_name[-1])

        # MIDIノート番号を計算
        midi_number = octave * 12 + NOTE_TO_SEMITONE.get(note, 0)

        # C4 (MIDI 60) からの差分をセミトーン数で計算
        semitone_diff = midi_number - 60

        # セミトーンをピッチパーセンテージに変換 (1セミトーン ≈ 5.946%)
        pitch_percent = semitone_diff * 5.946

        return f"{pitch_percent:+.1f}%"

    except (ValueError, KeyError) as e:
        print(f"[SSML] Warning: Invalid note format '{note_name}': {e}. Using default pitch.")
        return "+0.0%"  # エラー時はデフォルト


def parse_note_for_pitch_control(note_name: str, base_multiplier: int = 10, offset: int = 0) -> int:
    """
    MIDI音名をピッチ制御値に変換（Edge TTS用）

    Args:
        note_name: MIDI音名
        base_multiplier: ピッチ変化の倍率
        offset: ピッチオフセット（女性らしさなどの調整用）

    Returns:
        int: ピッチ制御値（-50から80の範囲に制限）
    """
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
        semitones_from_a4 = (octave - base_octave) * 12 + NOTE_TO_SEMITONE.get(note, 0)

        # ピッチ値を計算（倍率とオフセットを適用）
        pitch_value = semitones_from_a4 * base_multiplier + offset

        # 範囲を制限
        return max(-50, min(80, pitch_value))

    except (ValueError, KeyError) as e:
        print(f"[Pitch Control] Warning: Invalid note '{note_name}' ({e}), using default (0)")
        return offset  # エラー時はオフセットのみ返す
