# BaseSynthesisEngine - 多言語DiffSinger基底クラス
"""
多言語音声合成エンジンの基底クラス。

このクラスは、異なる言語のDiffSingerエンジンを統一的に扱うための
抽象基底クラスです。新しい言語のサポートを追加する際は、
この基底クラスを継承して実装してください。
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path


@dataclass
class SynthesisRequest:
    """音声合成リクエストの統一データクラス"""
    text: str
    language: str
    notes: Optional[List[Dict[str, Any]]] = None
    duration: Optional[List[float]] = None
    style_params: Optional[Dict[str, Any]] = None


@dataclass
class SynthesisResult:
    """音声合成結果の統一データクラス"""
    audio_data: bytes
    sample_rate: int = 24000
    format: str = "wav"
    metadata: Optional[Dict[str, Any]] = None
    processing_time: float = 0.0


class BaseSynthesisEngine(ABC):
    """多言語音声合成エンジンの基底クラス"""

    def __init__(self, language_code: str, config_path: Optional[Path] = None):
        """
        基底エンジンの初期化

        Args:
            language_code: 言語コード (例: "zh_CN", "ja_JP", "en_US")
            config_path: エンジン設定ファイルのパス
        """
        self.language_code = language_code
        self.config_path = config_path
        self.is_initialized = False
        self._model_cache = {}

    @abstractmethod
    async def initialize(self) -> bool:
        """
        エンジンの初期化

        Returns:
            bool: 初期化成功時はTrue
        """
        pass

    @abstractmethod
    async def synthesize(self, request: SynthesisRequest) -> SynthesisResult:
        """
        音声合成の実行

        Args:
            request: 合成リクエスト

        Returns:
            SynthesisResult: 合成結果
        """
        pass

    @abstractmethod
    def preprocess_text(self, text: str) -> List[str]:
        """
        テキストの前処理（音素変換など）

        Args:
            text: 入力テキスト

        Returns:
            List[str]: 音素列
        """
        pass

    @abstractmethod
    def get_supported_features(self) -> Dict[str, bool]:
        """
        サポートされている機能の取得

        Returns:
            Dict[str, bool]: 機能名と対応状況のマッピング
        """
        pass

    def get_language_info(self) -> Dict[str, Any]:
        """
        言語情報の取得

        Returns:
            Dict[str, Any]: 言語情報
        """
        return {
            "code": self.language_code,
            "name": self._get_language_name(),
            "script": self._get_script_type(),
            "features": self.get_supported_features()
        }

    def _get_language_name(self) -> str:
        """言語名の取得（サブクラスでオーバーライド可能）"""
        language_names = {
            "zh_CN": "中国語（簡体字）",
            "ja_JP": "日本語",
            "en_US": "英語"
        }
        return language_names.get(self.language_code, "Unknown")

    def _get_script_type(self) -> str:
        """文字体系の取得（サブクラスでオーバーライド可能）"""
        script_types = {
            "zh_CN": "漢字",
            "ja_JP": "ひらがな・カタカナ・漢字",
            "en_US": "ラテン文字"
        }
        return script_types.get(self.language_code, "Unknown")

    async def health_check(self) -> Dict[str, Any]:
        """
        エンジンのヘルスチェック

        Returns:
            Dict[str, Any]: ヘルスチェック結果
        """
        return {
            "language": self.language_code,
            "initialized": self.is_initialized,
            "model_cache_size": len(self._model_cache),
            "status": "healthy" if self.is_initialized else "not_initialized"
        }


class LanguageRegistry:
    """言語エンジンの登録・管理クラス"""

    def __init__(self):
        self._engines: Dict[str, BaseSynthesisEngine] = {}
        self._default_language = "zh_CN"

    def register_engine(self, language_code: str, engine: BaseSynthesisEngine):
        """
        言語エンジンの登録

        Args:
            language_code: 言語コード
            engine: エンジンインスタンス
        """
        self._engines[language_code] = engine

    def get_engine(self, language_code: str) -> Optional[BaseSynthesisEngine]:
        """
        指定言語のエンジンを取得

        Args:
            language_code: 言語コード

        Returns:
            Optional[BaseSynthesisEngine]: エンジンインスタンス
        """
        return self._engines.get(language_code)

    def get_default_engine(self) -> Optional[BaseSynthesisEngine]:
        """
        デフォルトエンジンの取得

        Returns:
            Optional[BaseSynthesisEngine]: デフォルトエンジン
        """
        return self._engines.get(self._default_language)

    def list_supported_languages(self) -> List[str]:
        """
        サポート言語一覧の取得

        Returns:
            List[str]: サポート言語コード一覧
        """
        return list(self._engines.keys())

    def set_default_language(self, language_code: str):
        """
        デフォルト言語の設定

        Args:
            language_code: 言語コード
        """
        if language_code in self._engines:
            self._default_language = language_code

    async def initialize_all(self) -> Dict[str, bool]:
        """
        全エンジンの初期化

        Returns:
            Dict[str, bool]: 言語コードと初期化結果のマッピング
        """
        results = {}
        for lang_code, engine in self._engines.items():
            try:
                results[lang_code] = await engine.initialize()
            except Exception as e:
                print(f"Failed to initialize {lang_code} engine: {e}")
                results[lang_code] = False
        return results

    async def health_check_all(self) -> Dict[str, Dict[str, Any]]:
        """
        全エンジンのヘルスチェック

        Returns:
            Dict[str, Dict[str, Any]]: 言語コードとヘルスチェック結果のマッピング
        """
        results = {}
        for lang_code, engine in self._engines.items():
            try:
                results[lang_code] = await engine.health_check()
            except Exception as e:
                results[lang_code] = {
                    "language": lang_code,
                    "status": "error",
                    "error": str(e)
                }
        return results


# グローバルレジストリインスタンス
language_registry = LanguageRegistry()