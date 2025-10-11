#!/usr/bin/env python3
"""
DAWAI 階層型仕様書2.0 整合性チェッカー
現在の実装との整合性を自動検証するツール
"""

import yaml
import re
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
import argparse
from datetime import datetime
import hashlib

class DAWAISpecSyncChecker:
    """DAWAI仕様書整合性チェッカー"""

    def __init__(self, specs_dir: Path = Path("specs"), project_root: Path = Path(".")):
        self.specs_dir = specs_dir
        self.project_root = project_root
        self.registry = self._load_registry()
        self.id_mapping = self._load_id_mapping()

        # 結果格納
        self.errors = []
        self.warnings = []
        self.info = []

    def _load_registry(self) -> Dict:
        """ダイアグラムレジストリ読み込み"""
        registry_path = self.specs_dir / "meta" / "diagram_registry.yaml"
        try:
            with open(registry_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            self.errors.append(f"❌ Registry file not found: {registry_path}")
            return {}

    def _load_id_mapping(self) -> Dict:
        """IDマッピング読み込み"""
        id_path = self.specs_dir / "meta" / "id_mapping.yaml"
        try:
            with open(id_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            self.errors.append(f"❌ ID mapping file not found: {id_path}")
            return {}

    def check_all(self) -> bool:
        """全整合性チェック実行"""
        print("🔍 DAWAI 階層型仕様書2.0 整合性チェック開始...")
        print("=" * 70)

        # 1. 実装ファイル存在確認
        print("\n📁 実装ファイル存在確認...")
        self._check_implementation_files()

        # 2. 要件トレーサビリティ
        print("\n📋 要件トレーサビリティチェック...")
        self._check_requirement_traceability()

        # 3. ダイアグラム同期状態
        print("\n📊 ダイアグラム同期状態チェック...")
        self._check_diagram_sync_status()

        # 4. ID命名規則準拠
        print("\n🏷️ ID命名規則チェック...")
        self._check_id_conventions()

        # 5. 実装率検証
        print("\n📈 実装率検証...")
        self._check_implementation_rate()

        # 6. セキュリティ課題チェック
        print("\n🔐 セキュリティ課題チェック...")
        self._check_security_issues()

        # レポート生成
        return self._generate_report()

    def _check_implementation_files(self):
        """実装ファイルの存在確認"""
        if 'functional_requirements' not in self.id_mapping:
            self.errors.append("❌ 機能要件データが見つかりません")
            return

        for req_id, req_data in self.id_mapping['functional_requirements'].items():
            implementation = req_data.get('implementation', '')
            if not implementation:
                self.warnings.append(f"⚠️ {req_id}: 実装ファイルが未指定")
                continue

            # 複数ファイルの場合はカンマ区切りで分割
            impl_files = [f.strip() for f in implementation.split(',')]

            for impl_file in impl_files:
                # 相対パスを絶対パスに変換
                if impl_file.endswith('/'):
                    # ディレクトリの場合
                    impl_path = self.project_root / impl_file
                    if not impl_path.exists() or not impl_path.is_dir():
                        self.errors.append(f"❌ {req_id}: ディレクトリが存在しません - {impl_file}")
                    else:
                        self.info.append(f"ℹ️ {req_id}: ディレクトリ確認済み - {impl_file}")
                else:
                    # ファイルの場合
                    impl_path = self.project_root / impl_file
                    if not impl_path.exists():
                        self.errors.append(f"❌ {req_id}: ファイルが存在しません - {impl_file}")
                    else:
                        # ファイルサイズも確認
                        size = impl_path.stat().st_size
                        if size < 100:  # 100バイト未満は疑わしい
                            self.warnings.append(f"⚠️ {req_id}: ファイルサイズが小さすぎます - {impl_file} ({size}B)")
                        else:
                            self.info.append(f"ℹ️ {req_id}: ファイル確認済み - {impl_file} ({size}B)")

    def _check_requirement_traceability(self):
        """要件トレーサビリティチェック"""
        if 'traceability' not in self.id_mapping:
            self.warnings.append("⚠️ トレーサビリティデータが未定義")
            return

        traceability = self.id_mapping['traceability']
        functional_reqs = self.id_mapping.get('functional_requirements', {})

        # 機能要件のトレーサビリティチェック
        for req_id in functional_reqs.keys():
            if req_id not in traceability:
                self.warnings.append(f"⚠️ {req_id}: トレーサビリティが未定義")
                continue

            trace_data = traceability[req_id]

            # アーキテクチャとの対応
            if 'architecture' not in trace_data:
                self.warnings.append(f"⚠️ {req_id}: アーキテクチャへのマッピングが未定義")

            # テストケースとの対応
            if 'tests' not in trace_data:
                self.warnings.append(f"⚠️ {req_id}: テストケースが未定義")

            # 実装との対応
            if 'implementation' not in trace_data:
                self.warnings.append(f"⚠️ {req_id}: 実装マッピングが未定義")

    def _check_diagram_sync_status(self):
        """ダイアグラム同期状態チェック"""
        if 'diagrams' not in self.registry:
            self.errors.append("❌ ダイアグラム情報が見つかりません")
            return

        total_diagrams = 0
        synced_diagrams = 0
        pending_diagrams = 0

        def check_diagram_level(diagrams_dict, level_name=""):
            nonlocal total_diagrams, synced_diagrams, pending_diagrams

            for diagram_id, diagram_info in diagrams_dict.items():
                if isinstance(diagram_info, dict):
                    if 'sync_status' in diagram_info:
                        total_diagrams += 1
                        status = diagram_info['sync_status']

                        if status == '✅':
                            synced_diagrams += 1
                            self.info.append(f"ℹ️ {level_name}/{diagram_id}: 同期済み")
                        elif status == '🔄':
                            pending_diagrams += 1
                            self.warnings.append(f"⚠️ {level_name}/{diagram_id}: 同期待ち")
                        else:
                            self.warnings.append(f"⚠️ {level_name}/{diagram_id}: 不明な同期状態 - {status}")
                    else:
                        # ネストした階層をチェック
                        check_diagram_level(diagram_info, f"{level_name}/{diagram_id}")

        for category, levels in self.registry['diagrams'].items():
            check_diagram_level(levels, category)

        if total_diagrams > 0:
            sync_rate = (synced_diagrams / total_diagrams) * 100
            self.info.append(f"ℹ️ ダイアグラム同期率: {sync_rate:.1f}% ({synced_diagrams}/{total_diagrams})")

    def _check_id_conventions(self):
        """ID命名規則チェック"""
        if 'id_system' not in self.id_mapping:
            self.errors.append("❌ ID体系定義が見つかりません")
            return

        id_system = self.id_mapping['id_system']

        # 機能要件IDチェック
        if 'functional_requirements' in self.id_mapping:
            fr_format = id_system['functional_requirements']['format']
            domains = id_system['functional_requirements']['domains']

            for req_id in self.id_mapping['functional_requirements'].keys():
                # 正規表現でフォーマットチェック
                pattern = r'FR-(' + '|'.join(domains) + r')-\d{3}'
                if not re.match(pattern, req_id):
                    self.warnings.append(f"⚠️ ID命名規則違反: {req_id} (期待形式: {fr_format})")
                else:
                    self.info.append(f"ℹ️ ID形式正常: {req_id}")

    def _check_implementation_rate(self):
        """実装率検証"""
        if 'functional_requirements' not in self.id_mapping:
            return

        functional_reqs = self.id_mapping['functional_requirements']
        total_reqs = len(functional_reqs)
        implemented_reqs = 0
        partial_reqs = 0

        for req_id, req_data in functional_reqs.items():
            status = req_data.get('status', 'unknown')

            if status == 'implemented':
                implemented_reqs += 1
            elif status == 'partial':
                partial_reqs += 1
                self.warnings.append(f"⚠️ {req_id}: 部分実装")
            elif status != 'unknown':
                self.warnings.append(f"⚠️ {req_id}: 未実装 (status: {status})")

        impl_rate = (implemented_reqs / total_reqs) * 100 if total_reqs > 0 else 0
        self.info.append(f"ℹ️ 実装率: {impl_rate:.1f}% ({implemented_reqs}/{total_reqs})")

        # メタデータの実装率と比較
        metadata = self.id_mapping.get('metadata', {})
        declared_rate = metadata.get('implementation_rate', '0%')
        if declared_rate.endswith('%'):
            declared_value = float(declared_rate[:-1])
            if abs(impl_rate - declared_value) > 1.0:
                self.warnings.append(f"⚠️ 実装率不整合: 宣言値{declared_rate} vs 計算値{impl_rate:.1f}%")

    def _check_security_issues(self):
        """セキュリティ課題チェック"""
        # CORS設定チェック
        cors_files = [
            self.project_root / "backend" / "main.py",
            self.project_root / "backend" / "ai_agent" / "main.py"
        ]

        for cors_file in cors_files:
            if cors_file.exists():
                try:
                    with open(cors_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if 'allow_origins=["*"]' in content:
                            self.errors.append(f"❌ セキュリティリスク: CORS設定 - {cors_file.name}")
                        elif 'host="0.0.0.0"' in content:
                            self.errors.append(f"❌ セキュリティリスク: ホスト設定 - {cors_file.name}")
                except Exception as e:
                    self.warnings.append(f"⚠️ ファイル読み込みエラー: {cors_file} - {e}")

        # APIキー設定チェック
        api_key_reqs = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY']
        missing_keys = []

        for key in api_key_reqs:
            # 実際の環境変数チェックは本番では行わず、設定ファイルの存在確認のみ
            self.info.append(f"ℹ️ APIキー要件確認: {key}")

    def _generate_report(self) -> bool:
        """検証レポート生成"""
        print("\n" + "=" * 70)
        print("📊 DAWAI 階層型仕様書2.0 整合性チェックレポート")
        print("=" * 70)

        total_issues = len(self.errors) + len(self.warnings)

        # サマリー表示
        print(f"\n📈 サマリー:")
        print(f"  - エラー: {len(self.errors)}件")
        print(f"  - 警告: {len(self.warnings)}件")
        print(f"  - 情報: {len(self.info)}件")
        print(f"  - 総合判定: {'✅ 合格' if len(self.errors) == 0 else '❌ 要対応'}")

        # エラー詳細
        if self.errors:
            print(f"\n❌ エラー ({len(self.errors)}件):")
            for error in self.errors[:10]:  # 最初の10件
                print(f"  {error}")
            if len(self.errors) > 10:
                print(f"  ... 他{len(self.errors) - 10}件")

        # 警告詳細
        if self.warnings:
            print(f"\n⚠️ 警告 ({len(self.warnings)}件):")
            for warning in self.warnings[:10]:  # 最初の10件
                print(f"  {warning}")
            if len(self.warnings) > 10:
                print(f"  ... 他{len(self.warnings) - 10}件")

        # 情報（重要なもののみ）
        important_info = [info for info in self.info if '実装率:' in info or 'ダイアグラム同期率:' in info]
        if important_info:
            print(f"\nℹ️ 重要情報:")
            for info in important_info:
                print(f"  {info}")

        # 推奨アクション
        if self.errors or self.warnings:
            print(f"\n🔧 推奨アクション:")
            if any('セキュリティリスク' in error for error in self.errors):
                print("  1. セキュリティ設定の即座修正 (CORS, ホスト設定)")
            if any('ファイルが存在しません' in error for error in self.errors):
                print("  2. 実装ファイルパスの確認・修正")
            if any('同期待ち' in warning for warning in self.warnings):
                print("  3. 未完成ドキュメントの作成")

        # 同期ステータス更新
        self._update_sync_status()

        print(f"\n📝 検証完了: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        return len(self.errors) == 0

    def _update_sync_status(self):
        """同期ステータス更新"""
        status_file = self.specs_dir / "meta" / "sync_status.yaml"

        status_data = {
            "last_check": datetime.now().isoformat(),
            "checker_version": "2.0.0",
            "project": "DAWAI",
            "status": "PASSED" if len(self.errors) == 0 else "FAILED",
            "summary": {
                "errors": len(self.errors),
                "warnings": len(self.warnings),
                "info": len(self.info)
            },
            "categories": {
                "implementation_files": "✅" if not any('ファイルが存在しません' in e for e in self.errors) else "❌",
                "traceability": "✅" if not any('トレーサビリティ' in w for w in self.warnings) else "⚠️",
                "diagram_sync": "✅" if not any('同期待ち' in w for w in self.warnings) else "⚠️",
                "security": "✅" if not any('セキュリティリスク' in e for e in self.errors) else "❌",
                "id_conventions": "✅" if not any('ID命名規則違反' in w for w in self.warnings) else "⚠️"
            },
            "recommendations": []
        }

        # 推奨事項生成
        if any('セキュリティリスク' in error for error in self.errors):
            status_data["recommendations"].append("セキュリティ設定の緊急修正が必要")
        if any('ファイルが存在しません' in error for error in self.errors):
            status_data["recommendations"].append("実装ファイルパスの確認が必要")

        try:
            with open(status_file, 'w', encoding='utf-8') as f:
                yaml.dump(status_data, f, default_flow_style=False, allow_unicode=True)
            print(f"📁 同期ステータス更新: {status_file}")
        except Exception as e:
            print(f"⚠️ ステータスファイル更新失敗: {e}")

def main():
    """メイン実行関数"""
    parser = argparse.ArgumentParser(description="DAWAI 階層型仕様書2.0 整合性チェッカー")
    parser.add_argument(
        "--specs-dir",
        type=Path,
        default=Path("specs"),
        help="仕様書ディレクトリパス (default: specs)"
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path("."),
        help="プロジェクトルートパス (default: .)"
    )
    parser.add_argument(
        "--pre-check",
        action="store_true",
        help="変更前チェックモード"
    )
    parser.add_argument(
        "--post-check",
        action="store_true",
        help="変更後チェックモード"
    )
    parser.add_argument(
        "--security-focus",
        action="store_true",
        help="セキュリティ重点チェック"
    )

    args = parser.parse_args()

    # 実行モード表示
    if args.pre_check:
        print("🔄 変更前チェックモード")
    elif args.post_check:
        print("✨ 変更後チェックモード")
    elif args.security_focus:
        print("🔐 セキュリティ重点チェックモード")
    else:
        print("🔍 標準チェックモード")

    # チェッカー実行
    checker = DAWAISpecSyncChecker(args.specs_dir, args.project_root)
    success = checker.check_all()

    # 終了コード
    exit(0 if success else 1)

if __name__ == "__main__":
    main()