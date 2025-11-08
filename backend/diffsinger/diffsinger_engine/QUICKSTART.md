# DiffSinger クイックスタート

## 🚀 3ステップで起動

### 1. 依存関係インストール

```bash
pip install fastapi uvicorn pydantic
```

### 2. サーバー起動

```bash
cd backend/diffsinger_engine
python diffsinger.py
```

### 3. テスト実行

**別ターミナルで:**
```bash
python test_api.py
```

**または cURL:**
```bash
curl -X POST "http://localhost:8000/api/synthesize" \
  -H "Content-Type: application/json" \
  -d '{
    "lyrics": "小酒窝长睫毛",
    "notes": "C#4/Db4 | F#4/Gb4 | G#4/Ab4 | A#4/Bb4",
    "durations": "0.4 | 0.4 | 0.4 | 0.4"
  }'
```

## 📊 期待される出力

```
🎤 DiffSinger Server Starting...
   Device: cuda
   Sample Rate: 24000 Hz
   Timesteps: 100
   K_step: 100
✅ DiffSinger Engine initialized successfully
🚀 Server ready at http://localhost:8000
📖 API docs at http://localhost:8000/docs

🎵 Synthesis Request:
   Lyrics: 小酒窝长睫毛
   Notes: C#4/Db4 | F#4/Gb4 | G#4/Ab4 | A#4/Bb4
   Durations: 0.4 | 0.4 | 0.4 | 0.4
   🔄 Running inference...
   💾 Saving to outputs/synthesis.wav...
   ✅ Success! Duration: 1.60s
```

## 🎧 生成された音声

`outputs/synthesis.wav` - 合成された歌声

## 📖 詳細ドキュメント

- **API仕様**: http://localhost:8000/docs (Swagger UI)
- **README**: `README.md`
- **アーキテクチャ**: `result/specs/`
