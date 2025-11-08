#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
カエルの歌 日本語歌詞DiffSinger生成テスト

Edge TTS統合による日本語歌詞の直接入力テスト

使用方法:
    # Enhanced Mock DiffSinger サーバー起動（別ターミナルまたはバックグラウンド）
    python enhanced_mock_diffsinger_server.py --port 8001

    # テスト実行
    python test_kaeru_no_uta_japanese.py
"""
import sys
import io
import requests
import json

# Windows環境でUTF-8出力を強制
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

API_URL = "http://localhost:8001/api/synthesize"

def test_kaeru_no_uta_japanese():
    """カエルの歌 日本語歌詞生成テスト"""
    print("=" * 70)
    print("カエルの歌 日本語歌詞 DiffSinger生成テスト")
    print("=" * 70)

    # リクエストデータ
    # 歌詞: 日本語歌詞 "かえるのうたが"
    # メロディ: ド レ ミ ファ ミ レ ド (C4 D4 E4 F4 E4 D4 C4)
    data = {
        "lyrics": "かえるのうたが",  # 直接日本語歌詞
        "notes": "C4 | D4 | E4 | F4 | E4 | D4 | C4",
        "durations": "0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5",
        "output_path": "outputs/kaeru_no_uta_japanese.wav"
    }

    print("\n[REQUEST] リクエストデータ:")
    print(json.dumps(data, indent=2, ensure_ascii=False))

    try:
        # APIリクエスト
        print("\n[API] 通信中...")
        response = requests.post(API_URL, json=data, timeout=60)

        # レスポンス確認
        if response.status_code == 200:
            result = response.json()
            print("\n[OK] レスポンス (成功):")
            print(json.dumps(result, indent=2, ensure_ascii=False))

            print(f"\n[AUDIO] 音声生成完了:")
            print(f"   ファイルパス: {result['audio_path']}")
            print(f"   長さ: {result['duration']:.2f}秒")
            print(f"   ステータス: {result['status']}")

            # Edge TTS使用の確認
            if "Edge TTS" in result['message']:
                print(f"\n[TTS] Edge TTS音声合成エンジン使用:")
                print(f"   エンジン: Microsoft Edge TTS")
                print(f"   音声: 日本語Neural Voice")
                print(f"   品質: 高品質・自然な日本語音声")
            else:
                print(f"\n[TTS] フォールバック数学的合成使用")

            print("\n" + "=" * 70)
            print("[OK] テスト成功！日本語カエルの歌が生成されました")
            print(f"   再生: {result['audio_path']}")
            print("=" * 70)
        else:
            print(f"\n[ERROR] エラー (HTTP {response.status_code}):")
            print(response.text)

    except requests.exceptions.ConnectionError:
        print("\n[ERROR] エラー: サーバーに接続できません")
        print("   Enhanced Mock DiffSinger サーバーを起動してください:")
        print("   python enhanced_mock_diffsinger_server.py")
    except requests.exceptions.Timeout:
        print("\n[ERROR] エラー: リクエストタイムアウト (>60秒)")
    except Exception as e:
        print(f"\n[ERROR] エラー: {e}")


if __name__ == "__main__":
    test_kaeru_no_uta_japanese()