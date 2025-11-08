#!/bin/bash
# ========================================
# DiffSinger Checkpoint ダウンロードスクリプト
# ========================================
# 使用方法: ./scripts/download_checkpoints.sh
#
# このスクリプトはDAWAI DiffSinger統合に必要な
# 学習済みモデルファイルをダウンロードします。
#
# 必要な容量: 約2.7GB
# ========================================

set -e  # エラー時に即座に終了

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# プロジェクトルート確認
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CHECKPOINT_DIR="$PROJECT_ROOT/backend/diffsinger_engine/checkpoints"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}DiffSinger Checkpoint ダウンロード${NC}"
echo -e "${BLUE}========================================${NC}"

# ディレクトリ存在確認
if [ ! -d "$CHECKPOINT_DIR" ]; then
    echo -e "${RED}エラー: checkpointディレクトリが見つかりません${NC}"
    echo "場所: $CHECKPOINT_DIR"
    exit 1
fi

# ディスク容量確認
AVAILABLE_SPACE=$(df -BG "$PROJECT_ROOT" | tail -1 | awk '{print $4}' | sed 's/G//')
REQUIRED_SPACE=3

if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
    echo -e "${RED}エラー: ディスク容量が不足しています${NC}"
    echo "必要: ${REQUIRED_SPACE}GB, 利用可能: ${AVAILABLE_SPACE}GB"
    exit 1
fi

echo -e "${GREEN}✓ ディスク容量確認完了 (${AVAILABLE_SPACE}GB 利用可能)${NC}"

# ダウンロードツール確認
if command -v wget &> /dev/null; then
    DOWNLOAD_CMD="wget -c -O"
    echo -e "${GREEN}✓ ダウンロードツール: wget${NC}"
elif command -v curl &> /dev/null; then
    DOWNLOAD_CMD="curl -L -o"
    echo -e "${GREEN}✓ ダウンロードツール: curl${NC}"
else
    echo -e "${RED}エラー: wget または curl が必要です${NC}"
    exit 1
fi

# Google Drive ダウンロード関数（gdown使用）
download_from_gdrive() {
    local FILE_ID=$1
    local OUTPUT_PATH=$2

    if command -v gdown &> /dev/null; then
        gdown --id "$FILE_ID" -O "$OUTPUT_PATH"
    else
        echo -e "${YELLOW}警告: gdown がインストールされていません${NC}"
        echo "インストール: pip install gdown"
        return 1
    fi
}

# Hugging Face ダウンロード関数
download_from_huggingface() {
    local REPO=$1
    local FILENAME=$2
    local OUTPUT_PATH=$3

    local URL="https://huggingface.co/$REPO/resolve/main/$FILENAME"
    $DOWNLOAD_CMD "$OUTPUT_PATH" "$URL"
}

# ========================================
# モデルファイル定義
# ========================================

# 以下のURLは例です。実際のプロジェクトに応じて更新してください。

# Acoustic Model
ACOUSTIC_MODEL_URL="https://github.com/openvpi/DiffSinger/releases/download/v1.4.0/opencpop-cascade-150k.ckpt"
ACOUSTIC_MODEL_PATH="$CHECKPOINT_DIR/acoustic/model_ckpt_steps_160000.ckpt"

# Vocoder
VOCODER_MODEL_URL="https://github.com/openvpi/vocoders/releases/download/nsf-hifigan-v1/nsf_hifigan_24k.ckpt"
VOCODER_MODEL_PATH="$CHECKPOINT_DIR/vocoder/model_ckpt_steps_280000.ckpt"

# Pitch Extractor
PE_MODEL_URL="https://github.com/openvpi/DiffSinger/releases/download/v1.4.0/rmvpe.ckpt"
PE_MODEL_PATH="$CHECKPOINT_DIR/pe/model_ckpt_steps_60000.ckpt"

# ========================================
# ダウンロード実行
# ========================================

download_model() {
    local MODEL_NAME=$1
    local MODEL_URL=$2
    local MODEL_PATH=$3

    echo ""
    echo -e "${BLUE}----------------------------------------${NC}"
    echo -e "${BLUE}ダウンロード: $MODEL_NAME${NC}"
    echo -e "${BLUE}----------------------------------------${NC}"

    # 既存ファイル確認
    if [ -f "$MODEL_PATH" ]; then
        echo -e "${YELLOW}既に存在します: $MODEL_PATH${NC}"
        read -p "上書きしますか？ (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}スキップしました${NC}"
            return 0
        fi
    fi

    # ディレクトリ作成
    mkdir -p "$(dirname "$MODEL_PATH")"

    # ダウンロード
    echo "URL: $MODEL_URL"
    echo "保存先: $MODEL_PATH"

    if $DOWNLOAD_CMD "$MODEL_PATH" "$MODEL_URL"; then
        echo -e "${GREEN}✓ ダウンロード完了: $MODEL_NAME${NC}"

        # ファイルサイズ確認
        FILE_SIZE=$(du -h "$MODEL_PATH" | cut -f1)
        echo "ファイルサイズ: $FILE_SIZE"
    else
        echo -e "${RED}✗ ダウンロード失敗: $MODEL_NAME${NC}"
        return 1
    fi
}

# 1. Acoustic Model
download_model "Acoustic Model" "$ACOUSTIC_MODEL_URL" "$ACOUSTIC_MODEL_PATH"

# 2. Vocoder
download_model "Vocoder" "$VOCODER_MODEL_URL" "$VOCODER_MODEL_PATH"

# 3. Pitch Extractor
download_model "Pitch Extractor" "$PE_MODEL_URL" "$PE_MODEL_PATH"

# ========================================
# 検証
# ========================================

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}ダウンロード完了 - 検証中...${NC}"
echo -e "${BLUE}========================================${NC}"

VALIDATION_PASSED=true

# ファイル存在確認
check_file() {
    local FILE_PATH=$1
    local FILE_NAME=$2

    if [ -f "$FILE_PATH" ]; then
        FILE_SIZE=$(du -h "$FILE_PATH" | cut -f1)
        echo -e "${GREEN}✓ $FILE_NAME: $FILE_SIZE${NC}"
    else
        echo -e "${RED}✗ $FILE_NAME: 見つかりません${NC}"
        VALIDATION_PASSED=false
    fi
}

check_file "$ACOUSTIC_MODEL_PATH" "Acoustic Model"
check_file "$VOCODER_MODEL_PATH" "Vocoder"
check_file "$PE_MODEL_PATH" "Pitch Extractor"

echo ""

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ すべてのモデルファイルの準備完了！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "次のステップ:"
    echo "1. DiffSingerバックエンドを起動:"
    echo "   cd backend/diffsinger_engine"
    echo "   python diffsinger.py"
    echo ""
    echo "2. 動作確認:"
    echo "   curl http://localhost:8001/health"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ エラー: 一部のファイルが不足しています${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "手動ダウンロード方法については以下を参照:"
    echo "CHECKPOINT_SETUP.md"
    exit 1
fi
