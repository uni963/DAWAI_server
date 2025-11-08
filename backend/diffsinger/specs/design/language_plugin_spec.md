# 言語プラグイン仕様

**最終更新**: 2025-10-05
**バージョン**: 1.0.0

---

## 📋 プラグインインターフェース

### 必須実装メソッド

全ての言語プラグインは`BaseSynthesisEngine`を継承し、以下のメソッドを実装する必要があります。

```python
from abc import ABC, abstractmethod
from typing import List

class BaseSynthesisEngine(ABC):
    """言語プラグイン基底クラス"""

    # クラス変数（必須）
    language_code: str  # 例: "zh_CN", "ja_JP"

    @abstractmethod
    def text_to_phonemes(self, text: str) -> List[str]:
        """
        テキスト → 音素列変換

        Args:
            text: 入力テキスト

        Returns:
            音素文字列のリスト

        Raises:
            ValueError: テキストが空または無効な場合
        """
        pass

    @abstractmethod
    def get_phoneme_dict(self) -> List[str]:
        """
        言語の音素辞書取得

        Returns:
            全音素のリスト（特殊トークン含む）
        """
        pass
```

---

## 📁 プラグイン構造

### 必須ファイル

```
languages/{lang_code}/
├── __init__.py              # 自動登録コード
├── config.yaml              # 言語設定
├── engine.py                # {Lang}Engine(BaseSynthesisEngine)
├── processor.py             # {Lang}TextProcessor
├── phoneme_dict.json        # 音素辞書
└── checkpoints/             # モデルファイル
    ├── acoustic/
    ├── vocoder/
    └── pe/
```

### __init__.py テンプレート

```python
"""
{言語名}プラグイン自動登録
"""
from .engine import {Lang}Engine
from registry.language_registry import language_registry

# 自動登録
language_registry.register({Lang}Engine.language_code, {Lang}Engine)

__all__ = ['{Lang}Engine']
```

### config.yaml スキーマ

```yaml
language:
  code: str                  # ISO 639-1_ISO 3166-1 (例: "ja_JP")
  display_name: str          # 表示名（例: "日本語")
  native_name: str           # ネイティブ表記（例: "日本語")
  iso_639_1: str             # ISO 639-1コード（例: "ja")

phoneme_system:
  type: str                  # 音素体系（例: "romaji", "pinyin"）
  separator: str             # 音素区切り文字
  use_tone: bool             # 声調対応フラグ

text_processor:
  class: str                 # プロセッサクラスパス
  dependencies: List[str]    # 必要ライブラリ

model:
  acoustic: str              # Acousticモデルパス
  vocoder: str               # Vocoderモデルパス
  pitch_extractor: str       # Pitch Extractorパス

audio:
  sample_rate: int           # サンプルレート（通常24000）
  mel_bins: int              # Melビン数（通常80）
  hop_size: int              # Hopサイズ（通常128）
  win_size: int              # 窓サイズ（通常512）
  fmin: int                  # 最小周波数
  fmax: int                  # 最大周波数

features:
  supports_tone: bool        # 声調対応
  supports_slur: bool        # スラー対応
  max_phoneme_length: int    # 最大音素長

inference:
  timesteps: int             # Diffusion steps
  K_step: int                # Shallow diffusion depth
  diff_loss_type: str        # Loss関数タイプ
```

### phoneme_dict.json スキーマ

```json
{
  "phonemes": ["音素1", "音素2", ...],
  "special_tokens": ["SP", "AP"],
  "vowels": ["a", "i", "u", "e", "o"],
  "metadata": {
    "total_count": 60,
    "created": "2025-10-05",
    "version": "1.0.0"
  }
}
```

---

## 🔧 実装例

### 中国語プラグイン（参考実装）

**languages/zh_CN/engine.py**:
```python
from typing import List
import yaml
from pathlib import Path
import json

from core.base_engine import BaseSynthesisEngine
from languages.zh_CN.processor import ChineseTextProcessor


class ChineseEngine(BaseSynthesisEngine):
    """中国語歌声合成エンジン"""

    language_code = "zh_CN"

    def __init__(self):
        super().__init__()

        # 設定ロード
        config_path = Path(__file__).parent / "config.yaml"
        with open(config_path, encoding='utf-8') as f:
            self.config = yaml.safe_load(f)

        # テキストプロセッサ
        self.text_processor = ChineseTextProcessor()

        # 音素辞書
        phoneme_dict_path = Path(__file__).parent / "phoneme_dict.json"
        with open(phoneme_dict_path, encoding='utf-8') as f:
            self.phoneme_list = json.load(f)["phonemes"]

        # モデルロード
        self._load_models()

    def text_to_phonemes(self, text: str) -> List[str]:
        """中国語テキスト → 拼音音素"""
        return self.text_processor.convert(text)

    def get_phoneme_dict(self) -> List[str]:
        """中国語音素辞書"""
        return self.phoneme_list
```

**languages/zh_CN/processor.py**:
```python
from typing import List
from g2pM import G2pM
import jieba


class ChineseTextProcessor:
    """中国語テキスト処理"""

    def __init__(self):
        self.g2p = G2pM()

    def convert(self, text: str) -> List[str]:
        """
        中国語テキスト → 拼音音素

        "你好" → ["n", "i", "h", "ao"]
        """
        # 多音字補正
        text = self._fix_polyphones(text)

        # 拼音変換
        pinyins = self.g2p(text, tone=True, char_split=True)

        # 声母・韻母分割
        phonemes = []
        for pinyin in pinyins:
            phonemes.extend(self._split_pinyin(pinyin))

        return phonemes

    def _fix_polyphones(self, text: str) -> str:
        """多音字補正"""
        return text.replace('最长', '最常').replace('长睫毛', '常睫毛')

    def _split_pinyin(self, pinyin: str) -> List[str]:
        """拼音 → 声母・韻母"""
        # 実装省略
        ...
```

---

## ✅ プラグイン検証チェックリスト

### 必須項目

- [ ] `BaseSynthesisEngine`を継承
- [ ] `language_code`クラス変数定義
- [ ] `text_to_phonemes()`実装
- [ ] `get_phoneme_dict()`実装
- [ ] `config.yaml`作成
- [ ] `phoneme_dict.json`作成
- [ ] `__init__.py`に自動登録コード
- [ ] 単体テスト作成（カバレッジ>80%）
- [ ] 統合テスト作成

### 推奨項目

- [ ] Docstring（Google Style）
- [ ] Type hints完備
- [ ] エラーハンドリング
- [ ] ロギング設定
- [ ] パフォーマンステスト
- [ ] ドキュメント作成

---

## 🧪 テスト要件

### 最小テストケース

```python
import pytest
from languages.{lang}/engine import {Lang}Engine


class Test{Lang}Engine:
    """基本テストスイート"""

    @pytest.fixture
    def engine(self):
        return {Lang}Engine()

    def test_initialization(self, engine):
        """初期化テスト"""
        assert engine.language_code == "{lang_code}"
        assert len(engine.get_phoneme_dict()) > 0

    def test_text_to_phonemes_basic(self, engine):
        """基本音素変換テスト"""
        phonemes = engine.text_to_phonemes("テスト文字列")
        assert len(phonemes) > 0
        assert all(isinstance(p, str) for p in phonemes)

    def test_text_to_phonemes_empty(self, engine):
        """空文字列エラーテスト"""
        with pytest.raises(ValueError):
            engine.text_to_phonemes("")

    def test_synthesize_integration(self, engine):
        """統合合成テスト"""
        wav = engine.synthesize(
            text="テスト",
            notes="C4 | D4",
            durations="0.5 | 0.5"
        )
        assert len(wav) > 0
```

---

## 📊 品質基準

### コードメトリクス

| 指標 | 目標 | 測定方法 |
|-----|------|---------|
| テストカバレッジ | >80% | `pytest --cov` |
| Cyclomatic複雑度 | <10 | `radon cc` |
| 保守性指数 | >60 | `radon mi` |
| Docstring網羅率 | 100% | `interrogate` |

### パフォーマンス基準

| 処理 | 目標レイテンシ | 測定方法 |
|-----|--------------|---------|
| text_to_phonemes | <100ms | `timeit` |
| 完全合成（5秒音声） | <3秒 | 実測 |

---

## 🔄 バージョニング

### Semantic Versioning

プラグインは`config.yaml`の`metadata.version`でバージョン管理：

```yaml
metadata:
  version: "1.2.3"  # MAJOR.MINOR.PATCH
  api_version: "2.0"  # BaseSynthesisEngine互換性
```

**バージョン更新ルール**:
- **MAJOR**: 非互換的API変更
- **MINOR**: 後方互換的機能追加
- **PATCH**: バグ修正

---

**作成者**: Claude Code
**レビュー**: 未
**承認**: 未
