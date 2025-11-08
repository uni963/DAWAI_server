#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
「あ」のハミング音生成スクリプト

本物のDiffSinger音声合成の代替として、
合成された「あ」のハミング音を生成します。
"""

import numpy as np
import wave
import struct

def generate_ah_humming(duration=1.6, sample_rate=44100, frequency=440):
    """
    「あ」のハミング音を生成します

    Args:
        duration (float): 音声の長さ（秒）
        sample_rate (int): サンプリングレート
        frequency (float): 基本周波数（Hz）

    Returns:
        np.ndarray: 生成された音声データ
    """
    # 時間軸
    t = np.linspace(0, duration, int(sample_rate * duration), False)

    # 基本的な「あ」の音のフォルマント周波数（概算）
    # F1: 730Hz (低域), F2: 1090Hz (中域), F3: 2440Hz (高域)
    f1, f2, f3 = 730, 1090, 2440

    # 基音（ハミング音の基本）
    fundamental = 0.8 * np.sin(2 * np.pi * frequency * t)

    # フォルマント（母音「あ」の特性を表現）
    formant1 = 0.3 * np.sin(2 * np.pi * f1 * t)
    formant2 = 0.2 * np.sin(2 * np.pi * f2 * t)
    formant3 = 0.1 * np.sin(2 * np.pi * f3 * t)

    # 倍音（自然な音質）
    harmonic2 = 0.4 * np.sin(2 * np.pi * frequency * 2 * t)
    harmonic3 = 0.2 * np.sin(2 * np.pi * frequency * 3 * t)
    harmonic4 = 0.1 * np.sin(2 * np.pi * frequency * 4 * t)

    # 合成
    audio = fundamental + formant1 + formant2 + formant3 + harmonic2 + harmonic3 + harmonic4

    # エンベロープ（滑らかな開始・終了）
    envelope_length = int(0.1 * sample_rate)  # 0.1秒のフェード
    envelope = np.ones_like(audio)

    # フェードイン
    envelope[:envelope_length] = np.linspace(0, 1, envelope_length)
    # フェードアウト
    envelope[-envelope_length:] = np.linspace(1, 0, envelope_length)

    audio = audio * envelope

    # 正規化
    audio = audio / np.max(np.abs(audio)) * 0.8

    return audio

def save_wav(audio_data, filename, sample_rate=44100):
    """
    音声データをWAVファイルとして保存

    Args:
        audio_data (np.ndarray): 音声データ
        filename (str): 出力ファイル名
        sample_rate (int): サンプリングレート
    """
    # 16ビット整数に変換
    audio_int16 = (audio_data * 32767).astype(np.int16)

    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # モノラル
        wav_file.setsampwidth(2)  # 16ビット
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_int16.tobytes())

def main():
    """
    メイン実行：「あ」のハミング音を生成して保存
    """
    print("「あ」のハミング音を生成中...")

    # 音声生成
    ah_humming = generate_ah_humming(
        duration=1.6,  # 1.6秒
        sample_rate=44100,
        frequency=220  # A3 (低め)
    )

    # 保存
    output_path = "sample_humming.wav"
    save_wav(ah_humming, output_path)

    print(f"「あ」のハミング音を保存しました: {output_path}")
    print("これは合成された「あ」の母音特性を持つハミング音です。")

if __name__ == "__main__":
    main()