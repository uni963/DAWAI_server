#!/usr/bin/env python3
"""
DAWAI 統合ヘルスチェックシステム
プロジェクト全体の健全性を包括的に検証
"""

import sys
from pathlib import Path
from datetime import datetime
import yaml
import json

# 既存ツールをインポート
from sync_checker import DAWAISpecSyncChecker
# 新規ツールをインポート
from code_quality_checker import CodeQualityChecker
from cleanup_manager import CleanupManager


class DAWAIHealthChecker:
    """DAWAI プロジェクト統合ヘルスチェッカー"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'checks': {},
            'overall_status': 'UNKNOWN',
            'critical_issues': [],
            'warnings': [],
            'info': [],
            'summary': {}
        }

    def run_full_check(self, auto_fix=False) -> bool:
        """全チェック実行"""
        print("🔍 DAWAI 統合ヘルスチェック開始...")
        print("=" * 70)
        print(f"実行時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"プロジェクトルート: {self.project_root}")
        print("=" * 70)

        # レベル1: 仕様書整合性チェック
        print("\n📚 レベル1: 仕様書整合性チェック")
        print("-" * 70)
        spec_result = self._check_spec_sync()
        self.results['checks']['spec_sync'] = spec_result

        # レベル2: コード品質チェック
        print("\n🔧 レベル2: コード品質チェック")
        print("-" * 70)
        code_result = self._check_code_quality()
        self.results['checks']['code_quality'] = code_result

        # レベル3: クリーンアップチェック
        print("\n🧹 レベル3: クリーンアップチェック")
        print("-" * 70)
        cleanup_result = self._check_cleanup_targets()
        self.results['checks']['cleanup'] = cleanup_result

        # レベル4: トークン最適化チェック
        print("\n📊 レベル4: トークン最適化チェック")
        print("-" * 70)
        token_result = self._check_token_optimization()
        self.results['checks']['token_optimization'] = token_result

        if auto_fix:
            print("\n🔨 自動修正モード: 安全な修正を実行中...")
            self._apply_safe_fixes()

        # レポート生成
        self._generate_comprehensive_report()

        # 総合判定
        return self._calculate_overall_status()

    def _check_spec_sync(self) -> dict:
        """仕様書整合性チェック"""
        try:
            specs_dir = self.project_root / "DAWAI_server" / "specs"
            checker = DAWAISpecSyncChecker(specs_dir, self.project_root)
            success = checker.check_all()

            result = {
                'status': 'PASSED' if success else 'FAILED',
                'errors': checker.errors,
                'warnings': checker.warnings,
                'info': checker.info
            }

            # 重要な問題を抽出
            for error in checker.errors:
                if 'セキュリティリスク' in error:
                    self.results['critical_issues'].append({
                        'category': 'security',
                        'message': error
                    })
                else:
                    self.results['critical_issues'].append({
                        'category': 'spec_sync',
                        'message': error
                    })

            for warning in checker.warnings:
                self.results['warnings'].append({
                    'category': 'spec_sync',
                    'message': warning
                })

            return result

        except Exception as e:
            return {
                'status': 'ERROR',
                'error_message': str(e)
            }

    def _check_code_quality(self) -> dict:
        """コード品質チェック"""
        try:
            checker = CodeQualityChecker(self.project_root)
            issues = checker.check_all()

            # console.logの統計
            total_console = sum(item['count'] for item in issues['console_logs'])
            if total_console > 100:
                self.results['warnings'].append({
                    'category': 'code_quality',
                    'message': f'console文が多すぎます: {total_console}件（推奨: <100件）'
                })

            # 大規模ファイルの警告
            critical_files = [f for f in issues['large_files'] if f['severity'] == 'critical']
            for file_info in critical_files:
                self.results['warnings'].append({
                    'category': 'code_quality',
                    'message': f"大規模ファイル: {file_info['file']} ({file_info['lines']}行)"
                })

            # セキュリティパターンの警告
            for security_issue in issues['security_patterns']:
                self.results['critical_issues'].append({
                    'category': 'security',
                    'message': f"セキュリティ懸念: {security_issue['file']} - {security_issue['pattern']}"
                })

            result = {
                'status': 'PASSED' if len(critical_files) == 0 else 'WARNING',
                'console_logs_count': total_console,
                'large_files_count': len(issues['large_files']),
                'critical_files_count': len(critical_files),
                'dead_code_count': len(issues['dead_code']),
                'naming_violations_count': len(issues['naming_violations']),
                'security_patterns_count': len(issues['security_patterns']),
                'details': issues
            }

            return result

        except Exception as e:
            return {
                'status': 'ERROR',
                'error_message': str(e)
            }

    def _check_cleanup_targets(self) -> dict:
        """クリーンアップ対象チェック"""
        try:
            manager = CleanupManager(self.project_root)
            targets = manager.scan_cleanup_targets()

            total_size_mb = manager.get_total_cleanup_size()

            # 警告の追加
            if len(targets['old_logs']) > 10:
                self.results['warnings'].append({
                    'category': 'cleanup',
                    'message': f"古いログファイルが多数: {len(targets['old_logs'])}個"
                })

            if total_size_mb > 100:
                self.results['warnings'].append({
                    'category': 'cleanup',
                    'message': f"削減可能容量が大きい: {total_size_mb} MB"
                })

            result = {
                'status': 'INFO',
                'old_logs_count': len(targets['old_logs']),
                'old_specs_count': len(targets['old_specs']),
                'backup_files_count': len(targets['backup_files']),
                'temp_files_count': len(targets['temp_files']),
                'git_backups_count': len(targets['git_backups']),
                'total_cleanup_size_mb': total_size_mb,
                'details': targets
            }

            return result

        except Exception as e:
            return {
                'status': 'ERROR',
                'error_message': str(e)
            }

    def _check_token_optimization(self) -> dict:
        """トークン最適化チェック"""
        try:
            specs_dir = self.project_root / "DAWAI_server" / "specs"

            if not specs_dir.exists():
                return {
                    'status': 'SKIPPED',
                    'message': '仕様書ディレクトリが見つかりません'
                }

            # 仕様書ファイルのサイズを計測
            spec_files = list(specs_dir.rglob("*.md"))
            total_chars = 0
            total_lines = 0
            large_specs = []

            for spec_file in spec_files:
                try:
                    content = spec_file.read_text(encoding='utf-8')
                    chars = len(content)
                    lines = len(content.splitlines())

                    total_chars += chars
                    total_lines += lines

                    # 10KB以上の仕様書を検出
                    if chars > 10000:
                        large_specs.append({
                            'file': str(spec_file.relative_to(self.project_root)),
                            'chars': chars,
                            'lines': lines,
                            'kb': round(chars / 1024, 2)
                        })
                except Exception:
                    pass

            # トークン数の概算（英語: 1トークン≒4文字、日本語: 1トークン≒2文字）
            # 混在を考慮して平均3文字/トークンと仮定
            estimated_tokens = total_chars // 3

            self.results['info'].append({
                'category': 'token_optimization',
                'message': f'仕様書総文字数: {total_chars:,}文字 (推定トークン数: {estimated_tokens:,})'
            })

            if estimated_tokens > 50000:
                self.results['warnings'].append({
                    'category': 'token_optimization',
                    'message': f'仕様書のトークン数が多い: 推定{estimated_tokens:,}トークン'
                })

            result = {
                'status': 'INFO',
                'total_spec_files': len(spec_files),
                'total_chars': total_chars,
                'total_lines': total_lines,
                'estimated_tokens': estimated_tokens,
                'large_specs_count': len(large_specs),
                'large_specs': large_specs
            }

            return result

        except Exception as e:
            return {
                'status': 'ERROR',
                'error_message': str(e)
            }

    def _calculate_overall_status(self) -> bool:
        """総合ステータス計算"""
        critical_count = len(self.results['critical_issues'])
        warning_count = len(self.results['warnings'])

        if critical_count == 0 and warning_count == 0:
            self.results['overall_status'] = 'HEALTHY'
            return True
        elif critical_count == 0 and warning_count < 10:
            self.results['overall_status'] = 'GOOD'
            return True
        elif critical_count < 5:
            self.results['overall_status'] = 'NEEDS_ATTENTION'
            return False
        else:
            self.results['overall_status'] = 'CRITICAL'
            return False

    def _apply_safe_fixes(self):
        """安全な自動修正を適用"""
        print("  ℹ️ 自動修正機能は現在開発中です")
        print("  ℹ️ 将来のバージョンで以下の修正が可能になります:")
        print("    - 一時ファイルの自動削除")
        print("    - バックアップファイルの自動削除")
        print("    - 古いログファイルの自動削除")

    def _generate_comprehensive_report(self):
        """包括的レポート生成"""
        report_dir = self.project_root / "DAWAI_server" / "specs" / "tools" / "reports"
        report_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # Markdownレポート
        md_report = report_dir / f"health_report_{timestamp}.md"
        self._write_markdown_report(md_report)

        # YAMLデータ
        yaml_report = report_dir / f"health_data_{timestamp}.yaml"
        with open(yaml_report, 'w', encoding='utf-8') as f:
            yaml.dump(self.results, f, allow_unicode=True, default_flow_style=False)

        # JSONデータ（CI/CD用）
        json_report = report_dir / f"health_data_{timestamp}.json"
        with open(json_report, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)

        print(f"\n📄 レポート生成完了:")
        print(f"  - {md_report.relative_to(self.project_root)}")
        print(f"  - {yaml_report.relative_to(self.project_root)}")
        print(f"  - {json_report.relative_to(self.project_root)}")

    def _write_markdown_report(self, output_path: Path):
        """Markdownレポート作成"""
        lines = [
            "# DAWAI プロジェクト ヘルスチェックレポート",
            "",
            f"**生成日時**: {self.results['timestamp']}",
            f"**総合ステータス**: {self.results['overall_status']}",
            "",
            "---",
            "",
            "## 📊 サマリー",
            "",
            f"- **クリティカル問題**: {len(self.results['critical_issues'])}件",
            f"- **警告**: {len(self.results['warnings'])}件",
            f"- **情報**: {len(self.results['info'])}件",
            ""
        ]

        # チェック結果の概要
        lines.extend([
            "## 🔍 チェック結果",
            ""
        ])

        for check_name, check_data in self.results['checks'].items():
            status = check_data.get('status', 'UNKNOWN')
            status_emoji = {
                'PASSED': '✅',
                'WARNING': '⚠️',
                'FAILED': '❌',
                'INFO': 'ℹ️',
                'ERROR': '❌',
                'SKIPPED': '⏭️'
            }.get(status, '❓')

            lines.append(f"### {status_emoji} {check_name}")
            lines.append(f"**ステータス**: {status}")
            lines.append("")

            # 詳細情報
            if check_name == 'code_quality':
                lines.append(f"- console文: {check_data.get('console_logs_count', 0)}件")
                lines.append(f"- 大規模ファイル: {check_data.get('large_files_count', 0)}個")
                lines.append(f"- デッドコード疑い: {check_data.get('dead_code_count', 0)}件")
                lines.append(f"- セキュリティ懸念: {check_data.get('security_patterns_count', 0)}件")
            elif check_name == 'cleanup':
                lines.append(f"- 古いログ: {check_data.get('old_logs_count', 0)}個")
                lines.append(f"- バックアップ: {check_data.get('backup_files_count', 0)}個")
                lines.append(f"- 削減可能容量: {check_data.get('total_cleanup_size_mb', 0)} MB")
            elif check_name == 'token_optimization':
                lines.append(f"- 仕様書ファイル数: {check_data.get('total_spec_files', 0)}個")
                lines.append(f"- 推定トークン数: {check_data.get('estimated_tokens', 0):,}")

            lines.append("")

        # クリティカル問題
        if self.results['critical_issues']:
            lines.extend([
                "## ❌ クリティカル問題",
                ""
            ])
            for issue in self.results['critical_issues'][:20]:  # 最初の20件
                category = issue.get('category', 'unknown')
                message = issue.get('message', '')
                lines.append(f"- **[{category}]** {message}")
            if len(self.results['critical_issues']) > 20:
                lines.append(f"\n... 他{len(self.results['critical_issues']) - 20}件")
            lines.append("")

        # 警告
        if self.results['warnings']:
            lines.extend([
                "## ⚠️ 警告",
                ""
            ])
            for warning in self.results['warnings'][:20]:  # 最初の20件
                category = warning.get('category', 'unknown')
                message = warning.get('message', '')
                lines.append(f"- **[{category}]** {message}")
            if len(self.results['warnings']) > 20:
                lines.append(f"\n... 他{len(self.results['warnings']) - 20}件")
            lines.append("")

        # 推奨アクション
        lines.extend([
            "## 🔧 推奨アクション",
            ""
        ])

        if len(self.results['critical_issues']) > 0:
            lines.append("1. **クリティカル問題を優先的に対応**")
            lines.append("   - セキュリティ問題は即座に修正")
            lines.append("   - 実装ファイルの整合性を確認")
            lines.append("")

        if self.results['checks'].get('code_quality', {}).get('console_logs_count', 0) > 100:
            lines.append("2. **console文のクリーンアップ**")
            lines.append("   - 本番環境向けロガーの導入を検討")
            lines.append("   - デバッグ用console文の削除")
            lines.append("")

        cleanup_size = self.results['checks'].get('cleanup', {}).get('total_cleanup_size_mb', 0)
        if cleanup_size > 50:
            lines.append("3. **不要ファイルのクリーンアップ**")
            lines.append(f"   - 削減可能容量: {cleanup_size} MB")
            lines.append("   - cleanup_manager.pyでスクリプト生成可能")
            lines.append("")

        lines.extend([
            "---",
            "",
            f"レポート生成: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            ""
        ])

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))


def main():
    import argparse

    parser = argparse.ArgumentParser(description="DAWAI 統合ヘルスチェック")
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path("."),
        help="プロジェクトルート"
    )
    parser.add_argument(
        "--auto-fix",
        action="store_true",
        help="安全な修正を自動適用"
    )
    parser.add_argument(
        "--ci-mode",
        action="store_true",
        help="CI/CD向け簡潔出力"
    )

    args = parser.parse_args()

    checker = DAWAIHealthChecker(args.project_root)
    success = checker.run_full_check(auto_fix=args.auto_fix)

    # 結果サマリー表示
    if not args.ci_mode:
        print("\n" + "=" * 70)
        print("📊 総合判定")
        print("=" * 70)
        print(f"ステータス: {checker.results['overall_status']}")
        print(f"クリティカル問題: {len(checker.results['critical_issues'])}件")
        print(f"警告: {len(checker.results['warnings'])}件")
        print("=" * 70)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
