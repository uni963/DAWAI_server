# DiffSinger Mock Server 起動ガイド

## 🚀 クイックスタート

### Windows

```batch
cd C:\Users\Yohei\Documents\1_Digital_Notes\SBS\1_Projects\003_DAWAI\DAWAI_server\backend\diffsinger
python mock_diffsinger_server.py
```

### Linux / macOS

```bash
cd ~/Documents/1_Digital_Notes/SBS/1_Projects/003_DAWAI/DAWAI_server/backend/diffsinger
python3 mock_diffsinger_server.py
```

---

## ✅ 起動確認

### サーバー起動メッセージ

```
======================================================================
Mock DiffSinger Server Starting...
======================================================================
[OK] Mock DiffSinger Engine initialized successfully
[OK] Server ready at http://localhost:8001
[OK] API docs at http://localhost:8001/docs
======================================================================
```

### ヘルスチェック

ブラウザまたはcurlで以下にアクセス:

```bash
curl http://localhost:8001/health
```

**期待されるレスポンス**:
```json
{
  "status": "healthy",
  "service": "Mock DiffSinger",
  "version": "1.0.0",
  "current_model": "popcs_ds_beta6",
  "timestamp": 1728200000.0
}
```

---

## 🎤 主な機能

### 1. 音声合成API

**エンドポイント**: `POST http://localhost:8001/api/synthesize`

**リクエスト例**:
```json
{
  "lyrics": "あ あ あ あ",
  "notes": "C4 | E4 | G4 | C5",
  "durations": "0.5 | 0.5 | 0.5 | 0.5",
  "output_path": "outputs/synthesis.wav"
}
```

**レスポンス**:
```json
{
  "status": "success",
  "message": "Mock synthesis completed for 'あ あ あ あ' (4 notes)",
  "audio_path": "http://localhost:8001/outputs/synthesis.wav",
  "duration": 2.0
}
```

### 2. 生成音声ファイルアクセス

**URL**: `http://localhost:8001/outputs/synthesis.wav`

ブラウザでアクセスするか、curlでダウンロード:
```bash
curl -O http://localhost:8001/outputs/synthesis.wav
```

### 3. API仕様確認

**Swagger UI**: `http://localhost:8001/docs`

インタラクティブなAPI仕様書とテストツール

---

## 🔧 トラブルシューティング

### ポート8001が既に使用されている

```bash
# Windowsでポート使用状況確認
netstat -ano | findstr :8001

# プロセスを終了（PIDを確認後）
taskkill /F /PID <PID>

# Linux/macOSでポート使用状況確認
lsof -i :8001

# プロセスを終了
kill -9 <PID>
```

### モジュールが見つからないエラー

```bash
# 必要なパッケージをインストール
pip install fastapi uvicorn numpy

# または requirements.txt がある場合
pip install -r requirements.txt
```

### 音声ファイルが生成されない

1. `outputs/` ディレクトリの存在を確認
   ```bash
   mkdir -p outputs
   ```

2. numpy のインストールを確認
   ```bash
   python -c "import numpy; print(numpy.__version__)"
   ```

3. サーバーログで詳細エラーを確認
   ```
   [Mock DiffSinger] Error generating dynamic audio: ...
   ```

---

## 🎯 Voice Track統合テスト

### 1. サーバー起動
```bash
python mock_diffsinger_server.py
```

### 2. フロントエンド起動
```bash
cd ../../frontend
npm run dev
```

### 3. DEMO Song再生
1. ブラウザで `http://localhost:5175` にアクセス
2. サンプルプロジェクト「Demo Song」を読み込み
3. 再生ボタン▶️をクリック
4. **「あ」のハミング音が聞こえることを確認** ✅

### 4. デバッグコンソール確認

ブラウザのDevToolsコンソールで以下のログを確認:

```
🎤 [ArrangementAudio] Starting DiffSinger track playback: sample-voice-track
🎤 [DiffSinger] API Request data: { lyrics: 'あ あ あ ...', notes: 'C3 | E3 | ...' }
🎤 [DiffSinger] API Response status: 200
✅ [ArrangementAudio] DiffSinger track playback started successfully
```

---

## 📊 開発モード統合

### 推奨起動順序

```
1. DiffSingerサーバー (port 8001) ← 最初に起動
2. AIエージェント (オプション)
3. フロントエンド (port 5175) ← 最後に起動
```

### ワンコマンド起動（将来実装予定）

```bash
# 全サービス同時起動
npm run dev:all

# または
docker-compose up
```

---

## 🔗 関連リソース

- **API仕様**: http://localhost:8001/docs
- **ヘルスチェック**: http://localhost:8001/health
- **音声出力**: http://localhost:8001/outputs/
- **プロジェクトガイド**: `../../../CLAUDE.md`
- **根本原因分析**: `../../../docs/root_cause_analysis_diffsinger_playback.md`

---

## 💡 ベストプラクティス

1. **常に最初に起動**: フロントエンドよりも前にDiffSingerサーバーを起動
2. **ヘルスチェック習慣化**: 問題発生時は最初に `curl http://localhost:8001/health` で確認
3. **ログ監視**: サーバーコンソール出力を注視してエラーを早期発見
4. **定期再起動**: 長時間開発時は定期的にサーバーを再起動して安定性維持

---

**最終更新**: 2025-10-06
**サポート**: プロジェクト内で問題が発生した場合は、上記のトラブルシューティングセクションを参照してください。
