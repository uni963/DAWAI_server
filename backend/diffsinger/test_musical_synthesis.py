#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
新しい音楽合成システムのテスト

使用方法:
    python test_musical_synthesis.py
"""
import sys
import io
import os
from pathlib import Path

# Windows環境でUTF-8出力を強制
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# enhanced_mock_diffsinger_server.pyから音楽合成関数をインポート
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from enhanced_mock_diffsinger_server import create_musical_vocals, convert_lyrics_to_japanese_phonetics
import asyncio

def test_musical_synthesis():
    """新しい音楽合成システムのテスト"""
    print("=" * 70)
    print("新しい音楽合成システム - 直接テスト")
    print("=" * 70)

    # テスト用データ
    lyrics = "かえるのうたが"
    notes_list = ["C4", "D4", "E4", "F4", "E4", "D4", "C4"]
    durations_list = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
    output_path = "outputs/test_musical_synthesis.wav"

    print(f"\n[TEST] テストデータ:")
    print(f"   歌詞: {lyrics}")
    print(f"   音程: {notes_list}")
    print(f"   長さ: {durations_list}")
    print(f"   出力: {output_path}")

    try:
        # 歌詞を日本語発音に最適化
        japanese_lyrics = asyncio.run(convert_lyrics_to_japanese_phonetics(lyrics))
        print(f"\n[CONVERT] 変換後歌詞: '{lyrics}' -> '{japanese_lyrics}'")

        # 新しい音楽合成システムでテスト
        print(f"\n[SYNTHESIS] 音楽合成開始...")
        success = create_musical_vocals(
            japanese_lyrics,
            notes_list,
            durations_list,
            output_path
        )

        if success:
            print(f"\n[SUCCESS] 音楽合成成功！")
            print(f"   出力ファイル: {output_path}")

            # ファイルが存在するか確認
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                print(f"   ファイルサイズ: {file_size} bytes")
                print(f"   ファイル形式: WAV")
                print(f"\n[OK] テスト完了！音楽的な日本語歌声が生成されました")
            else:
                print(f"\n[ERROR] 出力ファイルが見つかりません: {output_path}")
        else:
            print(f"\n[ERROR] 音楽合成に失敗しました")

    except Exception as e:
        print(f"\n[ERROR] テスト中にエラーが発生: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 70)

if __name__ == "__main__":
    test_musical_synthesis()