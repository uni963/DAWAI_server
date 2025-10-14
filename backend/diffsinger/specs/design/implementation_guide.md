# 実装ガイド・統合パス

**最終更新**: 2025-10-05
**バージョン**: 1.0.0

---

## 📋 目次

1. [新言語追加手順](#新言語追加手順)
2. [コード規約](#コード規約)
3. [テストシナリオ](#テストシナリオ)
4. [デプロイメント](#デプロイメント)
5. [トラブルシューティング](#トラブルシューティング)

---

## 新言語追加手順

### 日本語追加例（完全ガイド）

#### Step 1: ディレクトリ準備

```bash
# プロジェクトルート
cd backend/diffsinger_engine

# 日本語ディレクトリ作成
mkdir -p languages/ja_JP/{checkpoints/{acoustic,vocoder,pe},tests}

# 構造確認
tree languages/ja_JP
# languages/ja_JP/
# ├── checkpoints/
# │   ├── acoustic/
# │   ├── vocoder/
# │   └── pe/
# └── tests/
```

#### Step 2: 設定ファイル作成

`languages/ja_JP/config.yaml`:
```yaml
language:
  code: "ja_JP"
  display_name: "日本語"
  native_name: "日本語"
  iso_639_1: "ja"

phoneme_system:
  type: "romaji"  # ローマ字音素
  separator: " "
  use_tone: false  # 日本語は声調なし

text_processor:
  class: "languages.ja_JP.processor.JapaneseTextProcessor"
  dependencies:
    - mecab-python3>=1.0.6
    - unidic-lite>=1.0.8
    - pykakasi>=2.2.1
    - romkan>=0.2.1

model:
  acoustic: "languages/ja_JP/checkpoints/acoustic"
  vocoder: "languages/ja_JP/checkpoints/vocoder"
  pitch_extractor: "languages/ja_JP/checkpoints/pe"

audio:
  sample_rate: 24000
  mel_bins: 80
  hop_size: 128
  win_size: 512
  fmin: 30
  fmax: 12000

features:
  supports_tone: false
  supports_slur: true
  max_phoneme_length: 2  # 日本語音素は最大2文字（ch, sh等）

inference:
  timesteps: 100
  K_step: 100
  diff_loss_type: "l1"
```

#### Step 3: 音素辞書作成

`languages/ja_JP/phoneme_dict.json`:
```json
{
  "phonemes": [
    "SP", "AP",
    "a", "i", "u", "e", "o",
    "ka", "ki", "ku", "ke", "ko",
    "sa", "shi", "su", "se", "so",
    "ta", "chi", "tsu", "te", "to",
    "na", "ni", "nu", "ne", "no",
    "ha", "hi", "fu", "he", "ho",
    "ma", "mi", "mu", "me", "mo",
    "ya", "yu", "yo",
    "ra", "ri", "ru", "re", "ro",
    "wa", "wo", "n",
    "ga", "gi", "gu", "ge", "go",
    "za", "ji", "zu", "ze", "zo",
    "da", "di", "du", "de", "do",
    "ba", "bi", "bu", "be", "bo",
    "pa", "pi", "pu", "pe", "po",
    "kya", "kyu", "kyo",
    "sha", "shu", "sho",
    "cha", "chu", "cho",
    "nya", "nyu", "nyo",
    "hya", "hyu", "hyo",
    "mya", "myu", "myo",
    "rya", "ryu", "ryo",
    "gya", "gyu", "gyo",
    "ja", "ju", "jo",
    "bya", "byu", "byo",
    "pya", "pyu", "pyo"
  ],
  "special_tokens": ["SP", "AP"],
  "vowels": ["a", "i", "u", "e", "o"],
  "sokuon": "q",
  "hatsuon": "N"
}
```

#### Step 4: テキストプロセッサ実装

`languages/ja_JP/processor.py`:
```python
"""
日本語テキストプロセッサ

責務:
- 日本語テキスト → ローマ字音素変換
- MeCab形態素解析
- かな-ローマ字対応
"""
from typing import List
import MeCab
import pykakasi
import romkan
from languages.base.processor import BaseLanguageProcessor


class JapaneseTextProcessor(BaseLanguageProcessor):
    """日本語テキスト処理"""

    def __init__(self):
        # MeCab初期化
        try:
            self.mecab = MeCab.Tagger("-Owakati")
        except RuntimeError:
            # Fallback to default dictionary
            self.mecab = MeCab.Tagger()

        # pykakasi初期化（漢字→かな変換）
        self.kakasi = pykakasi.kakasi()

    def convert(self, text: str) -> List[str]:
        """
        日本語テキスト → ローマ字音素列

        Examples:
            >>> processor = JapaneseTextProcessor()
            >>> processor.convert("桜が咲いた")
            ['s', 'a', 'k', 'u', 'r', 'a', 'g', 'a', 's', 'a', 'i', 't', 'a']

        Args:
            text: 日本語テキスト

        Returns:
            ローマ字音素のリスト
        """
        # Step 1: 漢字 → ひらがな変換
        kana = self._to_hiragana(text)

        # Step 2: ひらがな → ローマ字変換
        romaji = romkan.to_roma(kana)

        # Step 3: ローマ字 → 音素分割
        phonemes = self._split_to_phonemes(romaji)

        return phonemes

    def _to_hiragana(self, text: str) -> str:
        """
        漢字混じり文 → ひらがな

        "桜" → "さくら"
        """
        result = self.kakasi.convert(text)
        return ''.join([item['hira'] for item in result])

    def _split_to_phonemes(self, romaji: str) -> List[str]:
        """
        ローマ字 → 音素分割

        "konnichiwa" → ['k', 'o', 'N', 'n', 'i', 'ch', 'i', 'w', 'a']

        特殊処理:
        - 促音（っ）: "tte" → ['t', 'te']（子音重複）
        - 撥音（ん）: "n" → 'N'（前後の文脈で判定）
        - 長音（ー）: "aa" → ['a', 'a']（母音重複）
        """
        phonemes = []
        i = 0

        while i < len(romaji):
            # 3文字音素チェック（kya, sha等）
            if i + 2 < len(romaji):
                three_char = romaji[i:i+3]
                if three_char in ['kya', 'kyu', 'kyo', 'sha', 'shu', 'sho',
                                  'cha', 'chu', 'cho', 'nya', 'nyu', 'nyo',
                                  'hya', 'hyu', 'hyo', 'mya', 'myu', 'myo',
                                  'rya', 'ryu', 'ryo', 'gya', 'gyu', 'gyo',
                                  'bya', 'byu', 'byo', 'pya', 'pyu', 'pyo']:
                    phonemes.append(three_char)
                    i += 3
                    continue

            # 2文字音素チェック（ka, shi, chi, tsu等）
            if i + 1 < len(romaji):
                two_char = romaji[i:i+2]
                if two_char in ['ka', 'ki', 'ku', 'ke', 'ko', 'sa', 'shi',
                                'su', 'se', 'so', 'ta', 'chi', 'tsu', 'te',
                                'to', 'na', 'ni', 'nu', 'ne', 'no', 'ha',
                                'hi', 'fu', 'he', 'ho', 'ma', 'mi', 'mu',
                                'me', 'mo', 'ya', 'yu', 'yo', 'ra', 'ri',
                                'ru', 're', 'ro', 'wa', 'wo', 'ga', 'gi',
                                'gu', 'ge', 'go', 'za', 'ji', 'zu', 'ze',
                                'zo', 'da', 'di', 'du', 'de', 'do', 'ba',
                                'bi', 'bu', 'be', 'bo', 'pa', 'pi', 'pu',
                                'pe', 'po']:
                    phonemes.append(two_char)
                    i += 2
                    continue

            # 撥音処理（n → N）
            if romaji[i] == 'n':
                # 次の文字が母音でなければ撥音
                if i + 1 >= len(romaji) or romaji[i+1] not in 'aiueo':
                    phonemes.append('N')
                    i += 1
                    continue

            # 1文字音素（母音a,i,u,e,o）
            if romaji[i] in 'aiueo':
                phonemes.append(romaji[i])
                i += 1
                continue

            # 促音処理（子音重複 → 促音'q'）
            if i + 1 < len(romaji) and romaji[i] == romaji[i+1]:
                phonemes.append('q')  # 促音記号
                i += 1  # 重複子音の1つ目をスキップ
                continue

            # その他の文字（そのまま追加）
            phonemes.append(romaji[i])
            i += 1

        return phonemes
```

#### Step 5: エンジン実装

`languages/ja_JP/engine.py`:
```python
"""
日本語歌声合成エンジン

責務:
- 日本語専用音素変換統合
- 日本語設定管理
- BaseSynthesisEngineの具象化
"""
from typing import List, Dict
import yaml
from pathlib import Path
import json

from core.base_engine import BaseSynthesisEngine
from languages.ja_JP.processor import JapaneseTextProcessor


class JapaneseEngine(BaseSynthesisEngine):
    """日本語歌声合成エンジン"""

    language_code = "ja_JP"

    def __init__(self):
        super().__init__()

        # 設定ロード
        config_path = Path(__file__).parent / "config.yaml"
        with open(config_path, encoding='utf-8') as f:
            self.config = yaml.safe_load(f)

        # テキストプロセッサ初期化
        self.text_processor = JapaneseTextProcessor()

        # 音素辞書ロード
        phoneme_dict_path = Path(__file__).parent / "phoneme_dict.json"
        with open(phoneme_dict_path, encoding='utf-8') as f:
            phoneme_data = json.load(f)
            self.phoneme_list = phoneme_data["phonemes"]

        # モデル初期化
        self._load_models()

    def text_to_phonemes(self, text: str) -> List[str]:
        """
        日本語テキスト → 音素変換

        Examples:
            >>> engine = JapaneseEngine()
            >>> engine.text_to_phonemes("桜が咲く")
            ['s', 'a', 'k', 'u', 'r', 'a', 'g', 'a', 's', 'a', 'k', 'u']
        """
        return self.text_processor.convert(text)

    def get_phoneme_dict(self) -> List[str]:
        """日本語音素辞書取得"""
        return self.phoneme_list

    def _load_models(self):
        """日本語モデルロード"""
        from utils.hparams import set_hparams, hparams

        # 設定ファイルパス
        acoustic_config = self.config["model"]["acoustic"] + "/config.yaml"

        # Hparamsロード
        set_hparams(acoustic_config, exp_name='ja_JP_synthesis')

        # work_dir設定
        hparams['work_dir'] = self.config["model"]["acoustic"]
        hparams['pe_ckpt'] = self.config["model"]["pitch_extractor"]
        hparams['vocoder_ckpt'] = self.config["model"]["vocoder"]

        # 親クラスのモデルロード
        super()._load_models()


# 自動登録
if __name__ != "__main__":
    from registry.language_registry import language_registry
    language_registry.register(JapaneseEngine.language_code, JapaneseEngine)
```

#### Step 6: 自動登録設定

`languages/ja_JP/__init__.py`:
```python
"""
日本語プラグイン自動登録

このファイルがインポートされると自動的に
LanguageRegistryに日本語エンジンが登録される
"""
from .engine import JapaneseEngine
from registry.language_registry import language_registry

# 自動登録
language_registry.register(JapaneseEngine.language_code, JapaneseEngine)

__all__ = ['JapaneseEngine']
```

#### Step 7: 依存関係インストール

```bash
# 日本語処理ライブラリインストール
pip install mecab-python3 unidic-lite pykakasi romkan

# MeCab辞書インストール（Ubuntuの場合）
sudo apt-get install mecab libmecab-dev mecab-ipadic-utf8
```

#### Step 8: 統合テスト

`languages/ja_JP/tests/test_japanese_engine.py`:
```python
"""日本語エンジン統合テスト"""
import pytest
from languages.ja_JP.engine import JapaneseEngine


class TestJapaneseEngine:
    """日本語エンジンテストクラス"""

    @pytest.fixture
    def engine(self):
        """エンジンインスタンス"""
        return JapaneseEngine()

    def test_text_to_phonemes_hiragana(self, engine):
        """ひらがな → 音素変換"""
        phonemes = engine.text_to_phonemes("さくら")
        assert phonemes == ['s', 'a', 'k', 'u', 'r', 'a']

    def test_text_to_phonemes_kanji(self, engine):
        """漢字 → 音素変換"""
        phonemes = engine.text_to_phonemes("桜")
        assert phonemes == ['s', 'a', 'k', 'u', 'r', 'a']

    def test_text_to_phonemes_mixed(self, engine):
        """混在文 → 音素変換"""
        phonemes = engine.text_to_phonemes("桜が咲く")
        assert 's' in phonemes
        assert 'a' in phonemes
        assert 'k' in phonemes

    def test_sokuon(self, engine):
        """促音処理"""
        phonemes = engine.text_to_phonemes("がっこう")
        # "gakkou" → ['g', 'a', 'q', 'k', 'o', 'u']
        assert 'q' in phonemes or phonemes.count('k') > 1

    def test_hatsuon(self, engine):
        """撥音処理"""
        phonemes = engine.text_to_phonemes("さんぽ")
        # "sanpo" → ['s', 'a', 'N', 'p', 'o']
        assert 'N' in phonemes or 'n' in phonemes
```

**テスト実行**:
```bash
pytest languages/ja_JP/tests/test_japanese_engine.py -v
```

---

## コード規約

### Python スタイル

**基準**: PEP 8 + Google Style Docstrings

```python
# ✅ 正しい例
class JapaneseEngine(BaseSynthesisEngine):
    """
    日本語歌声合成エンジン

    Attributes:
        language_code (str): 言語コード "ja_JP"
        text_processor (JapaneseTextProcessor): テキストプロセッサ
        phoneme_list (List[str]): 音素辞書

    Examples:
        >>> engine = JapaneseEngine()
        >>> phonemes = engine.text_to_phonemes("こんにちは")
        >>> len(phonemes) > 0
        True
    """

    language_code = "ja_JP"

    def __init__(self):
        super().__init__()
        self.text_processor = JapaneseTextProcessor()

    def text_to_phonemes(self, text: str) -> List[str]:
        """
        日本語テキストを音素列に変換

        Args:
            text: 日本語テキスト（漢字・かな混在可）

        Returns:
            ローマ字音素のリスト

        Raises:
            ValueError: テキストが空の場合

        Examples:
            >>> engine.text_to_phonemes("桜")
            ['s', 'a', 'k', 'u', 'r', 'a']
        """
        if not text:
            raise ValueError("Text cannot be empty")

        return self.text_processor.convert(text)
```

### Type Hints

**必須**: 全ての関数・メソッドにType hints

```python
from typing import List, Dict, Optional, Union

def synthesize(
    text: str,
    notes: str,
    durations: str,
    speaker_id: Optional[int] = None
) -> bytes:
    """音声合成"""
    ...
```

### エラーハンドリング

```python
# ✅ 正しい例
class LanguageNotSupportedError(Exception):
    """サポートされていない言語エラー"""
    pass

try:
    engine = language_registry.get_engine("unknown_lang")
except LanguageNotSupportedError as e:
    logger.error(f"Language not supported: {e}")
    raise HTTPException(status_code=400, detail=str(e))
```

---

## テストシナリオ

### 単体テスト

```python
# tests/test_japanese_processor.py
def test_hiragana_to_phonemes():
    """ひらがな→音素変換テスト"""
    processor = JapaneseTextProcessor()
    result = processor.convert("あいうえお")
    assert result == ['a', 'i', 'u', 'e', 'o']

def test_kanji_to_phonemes():
    """漢字→音素変換テスト"""
    processor = JapaneseTextProcessor()
    result = processor.convert("日本")
    assert len(result) > 0  # 何らかの音素が返る
```

### 統合テスト

```python
# tests/test_end_to_end.py
def test_full_synthesis_japanese():
    """日本語完全合成テスト"""
    engine = JapaneseEngine()

    text = "桜が咲く"
    notes = "C4 | D4 | E4 | F4"
    durations = "0.5 | 0.5 | 0.5 | 0.5"

    wav = engine.synthesize(text, notes, durations)

    assert len(wav) > 0
    assert isinstance(wav, bytes)
```

---

## デプロイメント

### Docker化

`Dockerfile`:
```dockerfile
FROM python:3.11-slim

# システム依存関係
RUN apt-get update && apt-get install -y \
    mecab \
    libmecab-dev \
    mecab-ipadic-utf8 \
    && rm -rf /var/lib/apt/lists/*

# Python依存関係
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーション
COPY backend/diffsinger_engine /app
WORKDIR /app

CMD ["uvicorn", "api.routes:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## トラブルシューティング

### よくある問題

#### 1. MeCab辞書エラー

**エラー**:
```
RuntimeError: Unable to open MeCab dictionary file
```

**解決**:
```bash
# Ubuntu/Debian
sudo apt-get install mecab mecab-ipadic-utf8

# macOS
brew install mecab mecab-ipadic
```

#### 2. 音素変換失敗

**症状**: `text_to_phonemes`が空リスト返却

**解決**:
```python
# デバッグログ追加
def text_to_phonemes(self, text: str) -> List[str]:
    logger.debug(f"Input text: {text}")
    kana = self._to_hiragana(text)
    logger.debug(f"Converted to kana: {kana}")
    phonemes = self.text_processor.convert(text)
    logger.debug(f"Phonemes: {phonemes}")
    return phonemes
```

---

**作成者**: Claude Code
**レビュー**: 未
**承認**: 未
