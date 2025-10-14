#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Musical Synthesis Module for DiffSinger

このモジュールは数学的音声合成機能を提供します。
"""

import math
from typing import List
import numpy as np

from config import (
    SAMPLE_RATE,
    MUSICAL_NOTE_DURATION,
    FEMALE_VOICE_PITCH_BOOST,
    PHONEME_HARMONICS,
    FORMANT_FREQUENCIES,
    PHONEME_MAP,
    VIBRATO_RATE,
    VIBRATO_DEPTH,
    ATTACK_TIME,
    DECAY_TIME,
    SUSTAIN_LEVEL,
    RELEASE_TIME,
    WAVEFORM_NORMALIZATION_LEVEL,
    NATURAL_NOISE_LEVEL
)
from midi_utils import midi_note_to_frequency
from audio_processing import save_musical_audio


def generate_musical_tone(frequency: float, duration: float, phoneme: str = "a") -> np.ndarray:
    """
    指定された周波数と長さで音楽的で自然な女性歌声を生成

    Args:
        frequency: 基本周波数（Hz）
        duration: ノートの長さ（秒）
        phoneme: 音素（"a", "e", "i", "o", "u"）

    Returns:
        np.ndarray: 生成された音声波形
    """
    num_samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, num_samples, endpoint=False)

    # 女性らしい音声特性を強化
    # 基本周波数をより高く調整（女性らしさ向上）
    feminine_frequency = frequency * (2 ** (FEMALE_VOICE_PITCH_BOOST / 12.0))

    # より女性らしいビブラート（少し速めで繊細）
    frequency_modulated = feminine_frequency * (1 + VIBRATO_DEPTH * np.sin(2 * np.pi * VIBRATO_RATE * t))

    # 基本波形（よりリアルな合成）
    fundamental = np.sin(2 * np.pi * frequency_modulated * t)

    # 人間の音声により近い倍音構成
    harmonics = PHONEME_HARMONICS.get(phoneme, PHONEME_HARMONICS['a'])
    formants = FORMANT_FREQUENCIES.get(phoneme, FORMANT_FREQUENCIES['a'])

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
    envelope = np.ones_like(t)
    attack_samples = int(ATTACK_TIME * SAMPLE_RATE)
    decay_samples = int(DECAY_TIME * SAMPLE_RATE)
    release_samples = int(RELEASE_TIME * SAMPLE_RATE)

    # スムーズなアタック（歌声的な立ち上がり）
    if len(envelope) > attack_samples:
        envelope[:attack_samples] = np.sin(np.linspace(0, np.pi/2, attack_samples))**2

    # ディケイ（自然な減衰）
    if len(envelope) > attack_samples + decay_samples:
        envelope[attack_samples:attack_samples + decay_samples] = np.linspace(1, SUSTAIN_LEVEL, decay_samples)

    # リリース（自然な余韻）
    if len(envelope) > release_samples:
        release_curve = np.sin(np.linspace(np.pi/2, 0, release_samples))**2
        envelope[-release_samples:] = SUSTAIN_LEVEL * release_curve

    # 息継ぎ効果（微細な音量変動）
    breath_pattern = 1 + 0.02 * np.sin(2 * np.pi * 0.5 * t)  # 0.5Hzの緩やかな変動
    envelope *= breath_pattern

    # エンベロープを適用
    waveform *= envelope

    # より自然な正規化（歌声の音量感）
    if np.max(np.abs(waveform)) > 0:
        waveform *= WAVEFORM_NORMALIZATION_LEVEL / np.max(np.abs(waveform))

    # 微細なノイズ追加（人間らしさ）
    natural_noise = np.random.normal(0, NATURAL_NOISE_LEVEL, len(waveform))
    waveform += natural_noise

    return waveform


def create_musical_vocals(
    lyrics: str,
    notes_list: List[str],
    durations_list: List[float],
    output_path: str
) -> bool:
    """
    歌詞とノート情報から音楽的な歌声を生成

    Args:
        lyrics: 歌詞テキスト
        notes_list: MIDIノート名のリスト
        durations_list: デュレーションのリスト（秒）
        output_path: 出力WAVファイルパス

    Returns:
        bool: 合成成功時True、失敗時False
    """
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

    # 音楽的波形を生成
    vocal_segments = []

    for char, note, duration in zip(lyrics_chars, notes_list, durations_list):
        # 周波数を取得
        frequency = midi_note_to_frequency(note)

        # 音素を取得
        phoneme = PHONEME_MAP.get(char, 'a')

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
    return save_musical_audio(full_vocal, output_path, SAMPLE_RATE)


def create_mathematical_audio_fallback(
    lyrics: str,
    notes_list: List[str],
    durations_list: List[float],
    output_path: str,
    total_duration: float
) -> None:
    """
    Edge TTS利用不可時のフォールバック（数学的合成）

    Args:
        lyrics: 歌詞テキスト
        notes_list: MIDIノート名のリスト
        durations_list: デュレーションのリスト（秒）
        output_path: 出力WAVファイルパス
        total_duration: 総再生時間（秒）
    """
    print("[Fallback] Using mathematical synthesis (Edge TTS not available)")

    def note_to_freq(note_name: str) -> float:
        """簡易的なMIDI音名→周波数変換"""
        if len(note_name) < 2:
            return 440.0
        note = note_name[:-1]
        octave = int(note_name[-1])
        note_offsets = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
        if note not in note_offsets:
            return 440.0
        midi_number = (octave - 4) * 12 + note_offsets[note] - 9
        return 440.0 * (2 ** (midi_number / 12))

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
