# DiffSinger Checkpoint セットアップガイド

**重要**: このリポジトリにはAIモデルのcheckpointファイル（合計2.7GB）は含まれていません。
以下の手順に従って、必要なモデルファイルをダウンロードしてください。

---

## 📋 必要なCheckpointファイル

DAWAIのDiffSinger機能を動作させるには、以下の3つのモデルファイルが必要です：

| モデルタイプ | ファイル名 | サイズ | 用途 |
|------------|-----------|--------|------|
| **Acoustic Model** | `model_ckpt_steps_160000.ckpt` | 374MB | 音響モデル（メイン） |
| **Vocoder** | `model_ckpt_steps_280000.ckpt` | 970MB | ボコーダー（音声生成） |
| **Pitch Extractor** | `model_ckpt_steps_60000.ckpt` | 38MB | ピッチ抽出器 |

**合計サイズ**: 約1.4GB（圧縮後）～2.7GB（展開後）

---

## 🔗 ダウンロード方法

### オプション1: 公式リポジトリから取得（推奨）

DiffSingerの公式学習済みモデルを使用する場合：

```bash
# プロジェクトルートディレクトリで実行
cd /mnt/d/Git/dawai_diffsinger

# セットアップスクリプトを実行
chmod +x scripts/download_checkpoints.sh
./scripts/download_checkpoints.sh
```

### オプション2: 手動ダウンロード

1. **Acoustic Model（音響モデル）**
   - ダウンロード先: [OpenVPI/DiffSinger Releases](https://github.com/openvpi/DiffSinger/releases)
   - モデル: `opencpop-cascade-150k` または類似モデル
   - 配置場所: `backend/diffsinger_engine/checkpoints/acoustic/`
   - ファイル名: `model_ckpt_steps_160000.ckpt`

2. **Vocoder（ボコーダー）**
   - ダウンロード先: [NSF-HiFiGAN Vocoder](https://github.com/openvpi/vocoders/releases)
   - モデル: `nsf_hifigan_44.1k` または `nsf_hifigan_24k`
   - 配置場所: `backend/diffsinger_engine/checkpoints/vocoder/`
   - ファイル名: `model_ckpt_steps_280000.ckpt`

3. **Pitch Extractor（ピッチ抽出器）**
   - ダウンロード先: DiffSinger公式リポジトリ
   - モデル: RMVPE または CREPE
   - 配置場所: `backend/diffsinger_engine/checkpoints/pe/`
   - ファイル名: `model_ckpt_steps_60000.ckpt`

### オプション3: Google DriveまたはHugging Face

プロジェクト専用の事前設定済みモデルセット：

```bash
# Google Drive経由（gdown必要）
pip install gdown

# Acoustic Model
gdown --id <GOOGLE_DRIVE_FILE_ID> -O backend/diffsinger_engine/checkpoints/acoustic/model_ckpt_steps_160000.ckpt

# Vocoder
gdown --id <VOCODER_FILE_ID> -O backend/diffsinger_engine/checkpoints/vocoder/model_ckpt_steps_280000.ckpt

# Pitch Extractor
gdown --id <PE_FILE_ID> -O backend/diffsinger_engine/checkpoints/pe/model_ckpt_steps_60000.ckpt
```

**注意**: `<GOOGLE_DRIVE_FILE_ID>` は実際のファイルIDに置き換えてください。

---

## 📁 ディレクトリ構成

ダウンロード完了後、以下の構成になっていることを確認してください：

```
backend/diffsinger_engine/checkpoints/
├── acoustic/
│   ├── config.yaml                      # ✅ Git管理対象
│   └── model_ckpt_steps_160000.ckpt    # ❌ Gitignore対象（374MB）
├── vocoder/
│   ├── config.yaml                      # ✅ Git管理対象
│   └── model_ckpt_steps_280000.ckpt    # ❌ Gitignore対象（970MB）
└── pe/
    ├── config.yaml                      # ✅ Git管理対象
    └── model_ckpt_steps_60000.ckpt     # ❌ Gitignore対象（38MB）
```

---

## ✅ セットアップ検証

### 1. ファイル存在確認

```bash
# Linuxディレクトリで実行
cd /mnt/d/Git/dawai_diffsinger

# すべてのcheckpointファイルが存在するか確認
ls -lh backend/diffsinger_engine/checkpoints/*/*.ckpt
```

**期待される出力**:
```
-rw-r--r-- 1 user user 374M ... backend/diffsinger_engine/checkpoints/acoustic/model_ckpt_steps_160000.ckpt
-rw-r--r-- 1 user user 970M ... backend/diffsinger_engine/checkpoints/vocoder/model_ckpt_steps_280000.ckpt
-rw-r--r-- 1 user user  38M ... backend/diffsinger_engine/checkpoints/pe/model_ckpt_steps_60000.ckpt
```

### 2. 動作確認

```bash
# DiffSingerバックエンド起動
cd backend/diffsinger_engine
python diffsinger.py

# 別ターミナルでテストリクエスト
curl -X POST http://localhost:8001/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "lyrics": "小酒窝长睫毛",
    "notes": "C#4/Db4 | F#4/Gb4 | G#4/Ab4 | A#4/Bb4",
    "durations": "0.4 | 0.4 | 0.4 | 0.4"
  }'
```

**期待されるレスポンス**:
```json
{
  "status": "success",
  "message": "Synthesis completed",
  "audio_path": "outputs/synthesis.wav",
  "duration": 1.6
}
```

### 3. エラー対処

#### エラー: "FileNotFoundError: checkpoint not found"
→ checkpointファイルが正しいディレクトリに配置されているか確認

#### エラー: "RuntimeError: CUDA out of memory"
→ GPUメモリ不足。CPUモードで実行するか、小さいバッチサイズを使用

#### エラー: "Model version mismatch"
→ config.yamlとcheckpointファイルのバージョンが一致しているか確認

---

## 🔧 高度な設定

### カスタムモデルの使用

独自に学習したモデルを使用する場合：

1. **Checkpointファイル配置**
   ```bash
   cp your_model.ckpt backend/diffsinger_engine/checkpoints/acoustic/model_ckpt_steps_160000.ckpt
   ```

2. **Config更新**
   ```yaml
   # backend/diffsinger_engine/checkpoints/acoustic/config.yaml
   model_ckpt_path: model_ckpt_steps_160000.ckpt
   # その他のハイパーパラメータを調整
   ```

3. **互換性確認**
   - DiffSingerバージョン互換性
   - サンプリングレート一致（24kHz推奨）
   - メルスペクトログラム次元数（80bins推奨）

### モデル切り替え

複数のモデルを切り替える場合：

```bash
# モデルディレクトリ構造
checkpoints/
├── acoustic/
│   ├── chinese_model/
│   │   └── model_ckpt_steps_160000.ckpt
│   └── japanese_model/
│       └── model_ckpt_steps_200000.ckpt
└── ...

# シンボリックリンクで切り替え
ln -sf chinese_model/model_ckpt_steps_160000.ckpt checkpoints/acoustic/model_ckpt_steps_160000.ckpt
```

---

## 📚 参考リンク

- **DiffSinger公式リポジトリ**: https://github.com/openvpi/DiffSinger
- **OpenVPI Vocoders**: https://github.com/openvpi/vocoders
- **Hugging Face Models**: https://huggingface.co/models?search=diffsinger
- **DiffSinger論文**: https://arxiv.org/abs/2105.02446

---

## ❓ トラブルシューティング

### Q1: ダウンロードが途中で止まる
**A**: 大きなファイルのため、安定したネットワーク環境が必要です。`wget -c`（継続ダウンロード）や`aria2c`（並列ダウンロード）を使用してください。

### Q2: Gitに間違ってcheckpointをコミットしてしまった
**A**: 以下のコマンドでGit履歴から削除：
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/diffsinger_engine/checkpoints/**/*.ckpt" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

### Q3: ディスク容量が不足している
**A**: 最小限のセットアップ：
- Acoustic Model（374MB）のみダウンロード
- Vocoderは軽量版を使用（Griffin-Lim等）
- 合計500MB程度で動作可能（品質は低下）

---

## 🔒 セキュリティ注意事項

- ✅ `.gitignore`に`*.ckpt`が含まれていることを確認
- ✅ `git status`で大きなファイルがステージングされていないか確認
- ✅ GitHub Actions等のCI/CDでcheckpointをアップロードしない
- ✅ 本番環境では環境変数でcheckpointパスを管理

---

**次のステップ**: セットアップ完了後、[CLAUDE.md](./CLAUDE.md)の開発ガイドに従ってDAWAI開発を開始してください。
