# ファイル構造設計（デッドコード・キングファイル回避）

**最終更新**: 2025-10-05
**バージョン**: 1.0.0

---

## 📋 目次

1. [設計原則](#設計原則)
2. [推奨ディレクトリ構造](#推奨ディレクトリ構造)
3. [ファイル責務表](#ファイル責務表)
4. [現状の問題点と解決策](#現状の問題点と解決策)
5. [移行計画](#移行計画)

---

## 設計原則

### 1. 単一責務原則（SRP）

**原則**: 1ファイル = 1つの明確な責務

```python
# ❌ 悪い例: 多責務（キングファイル）
# engine.py (2000行)
class SynthesisEngine:
    def text_to_phonemes(self): ...  # テキスト処理
    def load_model(self): ...         # モデル管理
    def synthesize(self): ...         # 推論実行
    def save_wav(self): ...           # ファイルIO
    def log_metrics(self): ...        # ロギング

# ✅ 良い例: 責務分離
# text_processor.py (200行)
class TextProcessor:
    def convert_to_phonemes(self): ...

# model_loader.py (150行)
class ModelLoader:
    def load_acoustic_model(self): ...

# inference_engine.py (300行)
class InferenceEngine:
    def run_inference(self): ...

# audio_writer.py (100行)
class AudioWriter:
    def save_wav(self): ...
```

### 2. 言語別分離

**原則**: 言語固有コードは`languages/{lang}/`に隔離

```
❌ 悪い例:
backend/
└── engine.py  # 全言語のコードが混在

✅ 良い例:
backend/
├── core/      # 言語非依存
└── languages/
    ├── zh_CN/ # 中国語専用
    └── ja_JP/ # 日本語専用
```

### 3. プラグイン構造

**原則**: 新言語追加時に既存コード変更不要

```python
# 新言語追加時
# ✅ 新ファイル追加のみ（既存コード無変更）
languages/
├── zh_CN/  # 既存（変更なし）
├── ja_JP/  # 既存（変更なし）
└── en_US/  # 🆕 新規追加
    ├── __init__.py
    ├── config.yaml
    ├── engine.py
    └── processor.py
```

---

## 推奨ディレクトリ構造

### 完全構造

```
backend/diffsinger_engine/
│
├── core/                                # 言語非依存コアエンジン
│   ├── __init__.py
│   ├── base_engine.py                   # BaseSynthesisEngine抽象クラス
│   ├── acoustic_model.py                # GaussianDiffusion wrapper
│   ├── vocoder.py                       # HiFi-GAN wrapper
│   ├── pitch_extractor.py               # Pitch Extractor wrapper
│   └── utils.py                         # 共通ユーティリティ
│
├── languages/                           # 言語別プラグイン
│   ├── __init__.py
│   │
│   ├── base/                            # 基底クラス
│   │   ├── __init__.py
│   │   └── processor.py                 # BaseLanguageProcessor
│   │
│   ├── zh_CN/                           # 中国語実装
│   │   ├── __init__.py                  # 自動登録コード
│   │   ├── config.yaml                  # 中国語設定
│   │   ├── engine.py                    # ChineseEngine(BaseSynthesisEngine)
│   │   ├── processor.py                 # G2pM統合
│   │   ├── phoneme_dict.json            # 音素辞書
│   │   └── checkpoints/                 # 中国語モデル
│   │       ├── acoustic/
│   │       ├── vocoder/
│   │       └── pe/
│   │
│   └── ja_JP/                           # 日本語実装（将来）
│       ├── __init__.py
│       ├── config.yaml                  # 日本語設定
│       ├── engine.py                    # JapaneseEngine(BaseSynthesisEngine)
│       ├── processor.py                 # MeCab統合
│       ├── phoneme_dict.json            # 音素辞書
│       └── checkpoints/                 # 日本語モデル
│           ├── acoustic/
│           ├── vocoder/
│           └── pe/
│
├── registry/                            # プラグインレジストリ
│   ├── __init__.py
│   ├── language_registry.py             # 言語エンジン管理
│   ├── plugin_discovery.py              # 自動プラグイン検出
│   └── compatibility.py                 # 互換性チェック
│
├── api/                                 # FastAPI統合
│   ├── __init__.py
│   ├── routes.py                        # REST endpoints
│   ├── models.py                        # Pydanticモデル
│   └── dependencies.py                  # DI設定
│
├── utils/                               # ユーティリティ
│   ├── __init__.py
│   ├── audio_writer.py                  # WAV保存
│   ├── midi_parser.py                   # MIDI文字列パース
│   ├── config_loader.py                 # YAML設定ロード
│   └── logger.py                        # ロギング設定
│
├── tests/                               # テストコード
│   ├── __init__.py
│   ├── test_core/
│   ├── test_languages/
│   │   ├── test_zh_CN.py
│   │   └── test_ja_JP.py
│   └── test_api/
│
└── __init__.py                          # パッケージエントリポイント
```

### 主要ファイルの詳細

#### `core/base_engine.py`

```python
"""
言語非依存の基底エンジンクラス

責務:
- 推論パイプライン定義
- モデル管理の抽象化
- 言語固有メソッドのインターフェース定義

LOC: ~200行
依存: torch, numpy
"""
from abc import ABC, abstractmethod
from typing import List, Dict
import torch

class BaseSynthesisEngine(ABC):
    """全言語共通の基底クラス"""

    def __init__(self):
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.acoustic_model = None
        self.vocoder = None
        self.pitch_extractor = None

    @abstractmethod
    def text_to_phonemes(self, text: str) -> List[str]:
        """言語固有の音素変換（サブクラスで実装）"""
        pass

    @abstractmethod
    def get_phoneme_dict(self) -> List[str]:
        """言語の音素辞書（サブクラスで実装）"""
        pass

    def synthesize(self, text: str, notes: str, durations: str) -> bytes:
        """歌声合成（全言語共通）"""
        phonemes = self.text_to_phonemes(text)
        mel = self._acoustic_inference(phonemes, notes, durations)
        wav = self._vocoder_inference(mel)
        return wav
```

#### `languages/zh_CN/engine.py`

```python
"""
中国語歌声合成エンジン

責務:
- 中国語専用音素変換
- 中国語設定管理
- BaseSynthesisEngineの具象化

LOC: ~250行
依存: g2pM, jieba, pypinyin, core.base_engine
"""
from core.base_engine import BaseSynthesisEngine
from .processor import ChineseTextProcessor
import yaml

class ChineseEngine(BaseSynthesisEngine):
    language_code = "zh_CN"

    def __init__(self):
        super().__init__()
        self.config = self._load_config()
        self.processor = ChineseTextProcessor()

    def text_to_phonemes(self, text: str) -> List[str]:
        return self.processor.convert(text)

    def get_phoneme_dict(self) -> List[str]:
        return self.config["phonemes"]
```

#### `registry/language_registry.py`

```python
"""
言語エンジンレジストリ

責務:
- 言語エンジンの登録・管理
- 動的プラグイン検出
- エンジンインスタンス生成

LOC: ~150行
依存: core.base_engine, registry.plugin_discovery
"""
from typing import Dict, Type
from core.base_engine import BaseSynthesisEngine

class LanguageRegistry:
    def __init__(self):
        self._engines: Dict[str, Type[BaseSynthesisEngine]] = {}
        self._discover_plugins()

    def register(self, language: str, engine_class: Type[BaseSynthesisEngine]):
        self._engines[language] = engine_class

    def get_engine(self, language: str) -> BaseSynthesisEngine:
        if language not in self._engines:
            raise LanguageNotSupportedError(language)
        return self._engines[language]()
```

#### `api/routes.py`

```python
"""
FastAPI REST エンドポイント

責務:
- HTTP通信処理
- リクエストバリデーション
- レスポンスフォーマット

LOC: ~200行
依存: fastapi, registry.language_registry, api.models
"""
from fastapi import APIRouter, HTTPException
from api.models import SynthesisRequest
from registry.language_registry import language_registry

router = APIRouter()

@router.post("/api/synthesize")
async def synthesize_voice(request: SynthesisRequest):
    try:
        engine = language_registry.get_engine(request.language)
        audio = await engine.synthesize(
            text=request.text,
            notes=request.notes,
            durations=request.durations
        )
        return {"status": "success", "audio": audio}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## ファイル責務表

| ファイル | 責務 | 依存 | LOC目安 | 更新頻度 |
|---------|------|------|---------|----------|
| `core/base_engine.py` | 推論抽象化 | torch | 200 | 低 |
| `core/acoustic_model.py` | Acoustic Model wrapper | torch, usr.diff | 150 | 低 |
| `core/vocoder.py` | Vocoder wrapper | torch, vocoders | 100 | 低 |
| `languages/zh_CN/engine.py` | 中国語実装 | base_engine | 250 | 中 |
| `languages/zh_CN/processor.py` | 中国語テキスト処理 | g2pM, jieba | 200 | 中 |
| `languages/ja_JP/engine.py` | 日本語実装 | base_engine | 250 | 高（新規） |
| `languages/ja_JP/processor.py` | 日本語テキスト処理 | MeCab, pykakasi | 250 | 高（新規） |
| `registry/language_registry.py` | 動的ロード | base_engine | 150 | 低 |
| `registry/plugin_discovery.py` | プラグイン自動検出 | importlib | 100 | 低 |
| `api/routes.py` | REST API | fastapi | 200 | 中 |
| `api/models.py` | データモデル | pydantic | 100 | 低 |
| `utils/audio_writer.py` | WAV保存 | scipy | 80 | 低 |
| `utils/midi_parser.py` | MIDI解析 | - | 120 | 低 |

---

## 現状の問題点と解決策

### 問題1: ディレクトリ重複

**現状**:
```
backend/diffsinger_engine/
├── data_gen/              # 公式コード
├── inference/             # 公式コード
├── modules/               # 公式コード
└── DiffSinger/            # 🚨 重複
    ├── data_gen/          # 同じ内容
    ├── inference/         # 同じ内容
    └── modules/           # 同じ内容
```

**影響**:
- ディスク使用量: 2倍
- 保守性: 変更時2箇所修正必要
- 混乱: 正しいソースが不明確

**解決策**:
```bash
# DiffSingerディレクトリ削除
cd backend/diffsinger_engine
rm -rf DiffSinger/

# インポートパス修正
find . -name "*.py" -exec sed -i 's/from DiffSinger\./from /g' {} \;
```

### 問題2: ハードコーディング

**現状**:
```python
# backend/diffsinger_engine/inference/svs/base_svs_infer.py:25-28
phone_list = ["AP", "SP", "a", "ai", "an", "ang", ...]  # 🚨 中国語固定
self.ph_encoder = TokenTextEncoder(None, vocab_list=phone_list)
self.pinyin2phs = cpop_pinyin2ph_func()  # 🚨 中国語専用
```

**解決策**:
```python
# core/base_engine.py
class BaseSynthesisEngine(ABC):
    def __init__(self):
        # 言語ごとに音素辞書を動的ロード
        phone_list = self.get_phoneme_dict()
        self.ph_encoder = TokenTextEncoder(None, vocab_list=phone_list)

    @abstractmethod
    def get_phoneme_dict(self) -> List[str]:
        """言語の音素辞書（サブクラスで実装）"""
        pass

# languages/zh_CN/engine.py
class ChineseEngine(BaseSynthesisEngine):
    def get_phoneme_dict(self) -> List[str]:
        # JSON設定から動的ロード
        with open("languages/zh_CN/phoneme_dict.json") as f:
            return json.load(f)["phonemes"]
```

### 問題3: 言語依存コード混在

**現状**:
```python
# 推論エンジンに中国語専用処理が混在
def preprocess_word_level_input(self, inp):
    text_raw = inp['text'].replace('最长', '最常')  # 🚨 中国語多音字処理
    pinyins = lazy_pinyin(text_raw)  # 🚨 拼音変換
```

**解決策**:
```python
# languages/zh_CN/processor.py
class ChineseTextProcessor:
    def convert(self, text: str) -> List[str]:
        # 多音字補正（中国語専用処理）
        text = text.replace('最长', '最常')
        pinyins = lazy_pinyin(text)
        return self._split_pinyins(pinyins)

# core/base_engine.py
class BaseSynthesisEngine(ABC):
    def synthesize(self, text: str, ...):
        # 言語非依存の処理のみ
        phonemes = self.text_to_phonemes(text)  # 言語固有処理は委譲
        ...
```

---

## 移行計画

### Phase 1: 重複削除（Week 1）

**手順**:
```bash
# 1. バックアップ
cp -r backend/diffsinger_engine backend/diffsinger_engine.backup

# 2. DiffSingerディレクトリ削除
rm -rf backend/diffsinger_engine/DiffSinger

# 3. インポートパス一括修正
cd backend/diffsinger_engine
find . -name "*.py" -type f | while read file; do
    sed -i 's/from DiffSinger\./from /g' "$file"
    sed -i 's/import DiffSinger\./import /g' "$file"
done

# 4. 動作確認
python neural_inference.py --lyrics "你好"
```

### Phase 2: ディレクトリ再構成（Week 2）

```bash
# 新ディレクトリ作成
mkdir -p core languages/base languages/zh_CN registry api utils

# ファイル移動
mv inference/svs/base_svs_infer.py core/base_engine.py
mv data_gen/tts/txt_processors/zh_g2pM.py languages/zh_CN/processor.py
```

### Phase 3: リファクタリング（Week 3-4）

1. `BaseSynthesisEngine` 抽象クラス作成
2. `ChineseEngine` 具象クラス実装
3. `LanguageRegistry` 実装
4. FastAPI統合

---

**作成者**: Claude Code
**レビュー**: 未
**承認**: 未
