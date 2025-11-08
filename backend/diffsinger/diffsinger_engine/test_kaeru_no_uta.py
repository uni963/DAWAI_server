#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
カエルの歌 DiffSinger生成テスト

使用方法:
    # サーバー起動（別ターミナルまたはバックグラウンド）
    python diffsinger.py --port 8001

    # テスト実行
    python test_kaeru_no_uta.py
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

def test_kaeru_no_uta():
    """カエルの歌 生成テスト"""
    print("=" * 70)
    print("カエルの歌 DiffSinger生成テスト")
    print("=" * 70)

    # リクエストデータ
    # 歌詞: 中国語の音に近い文字で "ka e ru no u ta ga"
    # メロディ: ド レ ミ ファ ミ レ ド (C4 D4 E4 F4 E4 D4 C4)
    data = {
        "lyrics": "卡爱鲁诺乌他嘎",  # ka ai lu nuo wu ta ga
        "notes": "C4 | D4 | E4 | F4 | E4 | D4 | C4",
        "durations": "0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5",
        "output_path": "outputs/kaeru_no_uta.wav"
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

            print("\n" + "=" * 70)
            print("[OK] テスト成功！カエルの歌が生成されました")
            print(f"   再生: {result['audio_path']}")
            print("=" * 70)
        else:
            print(f"\n[ERROR] エラー (HTTP {response.status_code}):")
            print(response.text)

    except requests.exceptions.ConnectionError:
        print("\n[ERROR] エラー: サーバーに接続できません")
        print("   サーバーを起動してください: python diffsinger.py --port 8001")
    except requests.exceptions.Timeout:
        print("\n[ERROR] エラー: リクエストタイムアウト (>60秒)")
    except Exception as e:
        print(f"\n[ERROR] エラー: {e}")


if __name__ == "__main__":
    test_kaeru_no_uta()
