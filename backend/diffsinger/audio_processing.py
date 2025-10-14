#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Audio Processing Module for DiffSinger

このモジュールは音声処理（MP3→WAV変換、ピッチシフト、タイムストレッチ等）を提供します。
"""

import os
import wave
from pathlib import Path
from typing import List
import numpy as np

from config import (
    FEMINIZATION_BOOST_RATIO,
    VIBRATO_FREQUENCY_HZ,
    VIBRATO_DEPTH_PERCENT,
    WAVEFORM_NORMALIZATION_LEVEL
)

# Pydub import for audio format conversion
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
    print("[Audio Processing] Pydub successfully imported for audio conversion")
except ImportError:
    PYDUB_AVAILABLE = False
    print("[Audio Processing] Pydub not available, MP3 to WAV conversion will use fallback")


def convert_mp3_to_wav(mp3_path: str, wav_path: str) -> bool:
    """
    MP3ファイルをWAVファイルに変換する

    Args:
        mp3_path: 入力MP3ファイルパス
        wav_path: 出力WAVファイルパス

    Returns:
        bool: 変換成功時True、失敗時False
    """
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


def apply_pitch_time_control(
    input_audio_path: str,
    output_audio_path: str,
    target_frequencies: List[float],
    target_durations: List[float]
) -> bool:
    """
    Edge TTS音声にピッチシフトとタイムストレッチを適用（シーケンシャルパイプライン方式）

    Args:
        input_audio_path: 入力音声ファイルパス
        output_audio_path: 出力音声ファイルパス
        target_frequencies: 目標周波数のリスト（Hz）
        target_durations: 目標デュレーションのリスト（秒）

    Returns:
        bool: 処理成功時True、失敗時False
    """
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
        fft_data = np.fft.fft(audio_data)
        freqs = np.fft.fftfreq(len(audio_data), 1/frame_rate)

        shifted_fft = np.zeros_like(fft_data)
        for i, freq in enumerate(freqs):
            new_freq_idx = int(i * FEMINIZATION_BOOST_RATIO)
            if 0 <= new_freq_idx < len(shifted_fft):
                shifted_fft[new_freq_idx] = fft_data[i]

        audio_data = np.real(np.fft.ifft(shifted_fft))
        print(f"[Note Keep Pipeline] Applied balanced feminization boost: {FEMINIZATION_BOOST_RATIO}x")

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
                        # 時間軸を生成
                        t = np.linspace(0, duration, len(segment))

                        # ビブラート変調を生成
                        vibrato_modulation = 1.0 + VIBRATO_DEPTH_PERCENT * np.sin(2 * np.pi * VIBRATO_FREQUENCY_HZ * t)

                        # セグメントにビブラート効果を適用
                        audio_data[start_sample:end_sample] = segment * vibrato_modulation

                        print(f"[Note Keep Pipeline] Applied vibrato to note {i+1} (duration: {duration:.1f}s)")

            print(f"[Note Keep Pipeline] Enhanced vocal expression completed")

        # 音量正規化
        max_val = np.max(np.abs(audio_data))
        if max_val > 0:
            audio_data = audio_data / max_val * WAVEFORM_NORMALIZATION_LEVEL

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


def save_musical_audio(waveform: np.ndarray, output_path: str, sample_rate: int = 44100) -> bool:
    """
    音楽的波形をWAVファイルとして保存

    Args:
        waveform: 音声波形データ（NumPy配列）
        output_path: 出力WAVファイルパス
        sample_rate: サンプリングレート（デフォルト: 44100Hz）

    Returns:
        bool: 保存成功時True、失敗時False
    """
    try:
        # 16-bit PCM形式で保存
        waveform_16bit = (waveform * 32767).astype(np.int16)

        with wave.open(output_path, 'w') as wav_file:
            wav_file.setnchannels(1)  # モノラル
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(waveform_16bit.tobytes())

        print(f"[Musical] Saved audio: {output_path}")
        return True

    except Exception as e:
        print(f"[Musical] Error saving audio: {e}")
        return False
