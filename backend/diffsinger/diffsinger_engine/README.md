# DiffSinger API Server

最小限・無駄のないDiffSinger歌声合成APIサーバー

## 📁 ファイル構成

```
backend/diffsinger_engine/
├── diffsinger.py              # FastAPIメインサーバー（130行）
├── core/
│   ├── __init__.py
│   └── inference_engine.py    # 推論エンジン（130行）
└── utils/
    ├── __init__.py
    └── audio.py               # 音声処理（50行）
```

**総行数**: 約310行（コメント・空行含む）

## 🚀 起動方法

### 1. 依存関係インストール

```bash
pip install fastapi uvicorn pydantic
```

### 2. サーバー起動

```bash
cd backend/diffsinger_engine
python diffsinger.py
```

**起動確認**:
```
🎤 DiffSinger Server Starting...
   Device: cuda
   Sample Rate: 24000 Hz
   Timesteps: 100
   K_step: 100
✅ DiffSinger Engine initialized successfully
🚀 Server ready at http://localhost:8000
📖 API docs at http://localhost:8000/docs
```

### 3. オプション

```bash
# ホスト・ポート指定
python diffsinger.py --host 0.0.0.0 --port 8080

# 自動リロード（開発時）
python diffsinger.py --reload
```

## 📡 API仕様

### エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/` | ルート（サービス情報） |
| GET | `/health` | ヘルスチェック |
| POST | `/api/synthesize` | 歌声合成 |
| GET | `/api/download/{filename}` | 音声ファイルダウンロード |
| GET | `/docs` | API仕様書（Swagger UI） |

### POST /api/synthesize

**リクエスト**:
```json
{
  "lyrics": "小酒窝长睫毛",
  "notes": "C#4/Db4 | F#4/Gb4 | G#4/Ab4 | A#4/Bb4",
  "durations": "0.4 | 0.4 | 0.4 | 0.4",
  "output_path": "outputs/synthesis.wav"
}
```

**レスポンス**:
```json
{
  "status": "success",
  "message": "Synthesis completed",
  "audio_path": "outputs/synthesis.wav",
  "duration": 1.6
}
```

## 🧪 テスト方法

### 1. cURLでテスト

```bash
curl -X POST "http://localhost:8000/api/synthesize" \
  -H "Content-Type: application/json" \
  -d '{
    "lyrics": "小酒窝长睫毛",
    "notes": "C#4/Db4 | F#4/Gb4 | G#4/Ab4 | A#4/Bb4",
    "durations": "0.4 | 0.4 | 0.4 | 0.4"
  }'
```

### 2. Pythonクライアント

```python
import requests

url = "http://localhost:8000/api/synthesize"
data = {
    "lyrics": "小酒窝长睫毛",
    "notes": "C#4/Db4 | F#4/Gb4 | G#4/Ab4 | A#4/Bb4",
    "durations": "0.4 | 0.4 | 0.4 | 0.4"
}

response = requests.post(url, json=data)
result = response.json()

print(f"Status: {result['status']}")
print(f"Audio: {result['audio_path']}")
print(f"Duration: {result['duration']}s")
```

### 3. Swagger UI

ブラウザで http://localhost:8000/docs を開き、インタラクティブにテスト可能

## 📊 パフォーマンス

| 項目 | 値 |
|-----|-----|
| 起動時間 | ~5秒（モデルロード含む） |
| 推論時間（5秒音声） | ~2秒（RTX 3090） |
| メモリ使用量 | ~2GB（GPU） |
| サンプルレート | 24000 Hz |

## 🔧 設定

### チェックポイントパス

デフォルトパス:
```
checkpoints/
├── acoustic/config.yaml
├── pe/
└── vocoder/
```

変更する場合は`core/inference_engine.py`の`__init__`を修正:
```python
def __init__(self, config_path: str = None):
    if config_path is None:
        config_path = 'path/to/your/config.yaml'  # ここを変更
```

## ⚠️ トラブルシューティング

### エラー: Engine not initialized

**原因**: モデルロード失敗

**解決**:
1. チェックポイントパス確認
2. GPU/CPUデバイス確認
3. 依存ライブラリインストール確認

### エラー: CUDA out of memory

**原因**: GPUメモリ不足

**解決**:
- 他のプロセスを終了
- CPUモードで起動（自動フォールバック）

### ポート使用中エラー

**解決**:
```bash
python diffsinger.py --port 8080  # 別ポート使用
```

## 📝 今後の拡張

現在の実装は中国語のみ対応。日本語対応は以下を追加:

1. `languages/ja_JP/engine.py` - 日本語エンジン
2. `languages/ja_JP/processor.py` - MeCab統合
3. `languages/ja_JP/config.yaml` - 日本語設定
4. `registry/language_registry.py` - 言語切り替え

詳細は`result/specs/`のドキュメント参照。

## 📄 ライセンス

元のDiffSingerプロジェクトのライセンスに従う

## 🙏 謝辞

- [DiffSinger](https://github.com/MoonInTheRiver/DiffSinger) - 元実装
- FastAPI - Webフレームワーク
