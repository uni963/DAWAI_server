#!/usr/bin/env python3
"""
DAWAI クリーンアップマネージャー
古いファイル、ログ、バックアップを検出・整理
"""

from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List


class CleanupManager:
    """クリーンアップ管理"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.cleanup_targets = {
            'old_logs': [],
            'old_specs': [],
            'backup_files': [],
            'temp_files': [],
            'git_backups': [],
            'node_modules_duplicates': []
        }

    def scan_cleanup_targets(self) -> Dict:
        """クリーンアップ対象スキャン"""
        self._find_old_logs()
        self._find_old_specs()
        self._find_backup_files()
        self._find_temp_files()
        self._find_git_backups()
        self._find_node_modules_duplicates()

        return self.cleanup_targets

    def _find_old_logs(self):
        """古いログファイル検出"""
        print("  🔍 古いログファイル検出中...")

        log_patterns = ["*.log", "*.log.*", "*.out"]
        cutoff_date = datetime.now() - timedelta(days=30)

        for pattern in log_patterns:
            for log_file in self.project_root.rglob(pattern):
                # node_modules内は除外
                if 'node_modules' in log_file.parts:
                    continue

                try:
                    mtime = datetime.fromtimestamp(log_file.stat().st_mtime)
                    if mtime < cutoff_date:
                        size_kb = log_file.stat().st_size // 1024
                        self.cleanup_targets['old_logs'].append({
                            'file': str(log_file.relative_to(self.project_root)),
                            'age_days': (datetime.now() - mtime).days,
                            'size_kb': size_kb,
                            'size_mb': round(size_kb / 1024, 2)
                        })
                except Exception:
                    pass

        total_size_mb = sum(item['size_mb'] for item in self.cleanup_targets['old_logs'])
        print(f"    ℹ️ 検出: {len(self.cleanup_targets['old_logs'])}個の古いログ (合計: {total_size_mb:.2f} MB)")

    def _find_old_specs(self):
        """古い仕様書検出"""
        print("  🔍 古い仕様書検出中...")

        # old_devs/ディレクトリ内のファイル
        old_docs_dir = self.project_root / "DAWAI_server" / "docs" / "development" / "old_devs"
        if old_docs_dir.exists():
            old_docs = list(old_docs_dir.rglob("*.md"))
            for doc in old_docs:
                try:
                    size_kb = doc.stat().st_size // 1024
                    self.cleanup_targets['old_specs'].append({
                        'file': str(doc.relative_to(self.project_root)),
                        'size_kb': size_kb
                    })
                except Exception:
                    pass

        # specs/old_*, specs/*_old.mdなどのパターン
        specs_dir = self.project_root / "DAWAI_server" / "specs"
        if specs_dir.exists():
            for spec_file in specs_dir.rglob("*old*.md"):
                if spec_file.is_file():
                    try:
                        size_kb = spec_file.stat().st_size // 1024
                        self.cleanup_targets['old_specs'].append({
                            'file': str(spec_file.relative_to(self.project_root)),
                            'size_kb': size_kb
                        })
                    except Exception:
                        pass

        total_size_kb = sum(item['size_kb'] for item in self.cleanup_targets['old_specs'])
        print(f"    ℹ️ 検出: {len(self.cleanup_targets['old_specs'])}個の古い仕様書 (合計: {total_size_kb} KB)")

    def _find_backup_files(self):
        """バックアップファイル検出"""
        print("  🔍 バックアップファイル検出中...")

        backup_patterns = ["*.bak", "*.old", "*.backup", "*~", "*.swp", "*.swo"]

        for pattern in backup_patterns:
            for backup_file in self.project_root.rglob(pattern):
                # node_modules, .git内は除外
                if 'node_modules' in backup_file.parts or '.git' in backup_file.parts:
                    continue

                try:
                    size_kb = backup_file.stat().st_size // 1024
                    self.cleanup_targets['backup_files'].append({
                        'file': str(backup_file.relative_to(self.project_root)),
                        'pattern': pattern,
                        'size_kb': size_kb
                    })
                except Exception:
                    pass

        total_size_kb = sum(item['size_kb'] for item in self.cleanup_targets['backup_files'])
        print(f"    ℹ️ 検出: {len(self.cleanup_targets['backup_files'])}個のバックアップファイル (合計: {total_size_kb} KB)")

    def _find_temp_files(self):
        """一時ファイル検出"""
        print("  🔍 一時ファイル検出中...")

        temp_patterns = ["*.tmp", "*.temp", ".DS_Store", "Thumbs.db", "desktop.ini"]

        for pattern in temp_patterns:
            for temp_file in self.project_root.rglob(pattern):
                # node_modules内は除外
                if 'node_modules' in temp_file.parts:
                    continue

                try:
                    size_kb = temp_file.stat().st_size // 1024
                    self.cleanup_targets['temp_files'].append({
                        'file': str(temp_file.relative_to(self.project_root)),
                        'pattern': pattern,
                        'size_kb': size_kb
                    })
                except Exception:
                    pass

        total_size_kb = sum(item['size_kb'] for item in self.cleanup_targets['temp_files'])
        print(f"    ℹ️ 検出: {len(self.cleanup_targets['temp_files'])}個の一時ファイル (合計: {total_size_kb} KB)")

    def _find_git_backups(self):
        """Gitバックアップディレクトリ検出"""
        print("  🔍 Gitバックアップディレクトリ検出中...")

        # git_backup_*パターンのディレクトリ
        for item in self.project_root.iterdir():
            if item.is_dir() and item.name.startswith('git_backup_'):
                try:
                    # ディレクトリサイズを計算
                    total_size = sum(f.stat().st_size for f in item.rglob('*') if f.is_file())
                    size_mb = total_size / (1024 * 1024)

                    self.cleanup_targets['git_backups'].append({
                        'directory': str(item.relative_to(self.project_root)),
                        'size_mb': round(size_mb, 2)
                    })
                except Exception:
                    pass

        total_size_mb = sum(item['size_mb'] for item in self.cleanup_targets['git_backups'])
        print(f"    ℹ️ 検出: {len(self.cleanup_targets['git_backups'])}個のGitバックアップ (合計: {total_size_mb:.2f} MB)")

    def _find_node_modules_duplicates(self):
        """重複node_modulesディレクトリ検出"""
        print("  🔍 重複node_modulesディレクトリ検出中...")

        node_modules_dirs = list(self.project_root.rglob('node_modules'))

        # プロジェクト直下以外のnode_modules
        for nm_dir in node_modules_dirs:
            # DAWAI_server/frontend/node_modules以外は重複の可能性
            if nm_dir.parent.name != 'frontend' or 'DAWAI_server' not in str(nm_dir):
                try:
                    # サイズ計算（時間がかかるので概算）
                    self.cleanup_targets['node_modules_duplicates'].append({
                        'directory': str(nm_dir.relative_to(self.project_root))
                    })
                except Exception:
                    pass

        print(f"    ℹ️ 検出: {len(self.cleanup_targets['node_modules_duplicates'])}個の潜在的重複node_modules")

    def get_total_cleanup_size(self) -> float:
        """クリーンアップ可能な総サイズ（MB）"""
        total_mb = 0.0

        # 古いログ
        total_mb += sum(item.get('size_mb', 0) for item in self.cleanup_targets['old_logs'])

        # 古い仕様書
        total_mb += sum(item.get('size_kb', 0) for item in self.cleanup_targets['old_specs']) / 1024

        # バックアップファイル
        total_mb += sum(item.get('size_kb', 0) for item in self.cleanup_targets['backup_files']) / 1024

        # 一時ファイル
        total_mb += sum(item.get('size_kb', 0) for item in self.cleanup_targets['temp_files']) / 1024

        # Gitバックアップ
        total_mb += sum(item.get('size_mb', 0) for item in self.cleanup_targets['git_backups'])

        return round(total_mb, 2)

    def generate_cleanup_script(self, output_path: Path = None):
        """クリーンアップスクリプト生成"""
        if output_path is None:
            output_path = self.project_root / "cleanup_script.sh"

        script_lines = [
            "#!/bin/bash",
            "# DAWAI 自動生成クリーンアップスクリプト",
            f"# 生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "echo '🧹 DAWAIクリーンアップ開始...'",
            ""
        ]

        # 古いログの削除
        if self.cleanup_targets['old_logs']:
            script_lines.append("# 古いログファイルの削除")
            for item in self.cleanup_targets['old_logs']:
                script_lines.append(f"rm -f '{item['file']}'")
            script_lines.append("")

        # バックアップファイルの削除
        if self.cleanup_targets['backup_files']:
            script_lines.append("# バックアップファイルの削除")
            for item in self.cleanup_targets['backup_files']:
                script_lines.append(f"rm -f '{item['file']}'")
            script_lines.append("")

        # 一時ファイルの削除
        if self.cleanup_targets['temp_files']:
            script_lines.append("# 一時ファイルの削除")
            for item in self.cleanup_targets['temp_files']:
                script_lines.append(f"rm -f '{item['file']}'")
            script_lines.append("")

        script_lines.append("echo '✅ クリーンアップ完了'")

        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(script_lines))
            print(f"\n📝 クリーンアップスクリプト生成: {output_path}")
            print(f"    実行方法: bash {output_path}")
        except Exception as e:
            print(f"⚠️ スクリプト生成失敗: {e}")


def main():
    """テスト実行用メイン関数"""
    import argparse

    parser = argparse.ArgumentParser(description="DAWAI クリーンアップマネージャー")
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path("."),
        help="プロジェクトルート"
    )
    parser.add_argument(
        "--scan-only",
        action="store_true",
        help="スキャンのみ（削除は行わない）"
    )
    parser.add_argument(
        "--generate-script",
        action="store_true",
        help="クリーンアップスクリプトを生成"
    )

    args = parser.parse_args()

    print("🧹 DAWAI クリーンアップマネージャー起動...")
    print("=" * 70)

    manager = CleanupManager(args.project_root)
    results = manager.scan_cleanup_targets()

    # 結果サマリー
    print("\n" + "=" * 70)
    print("📊 クリーンアップ対象サマリー")
    print("=" * 70)
    print(f"\n📈 検出結果:")
    print(f"  - 古いログ: {len(results['old_logs'])}個")
    print(f"  - 古い仕様書: {len(results['old_specs'])}個")
    print(f"  - バックアップファイル: {len(results['backup_files'])}個")
    print(f"  - 一時ファイル: {len(results['temp_files'])}個")
    print(f"  - Gitバックアップ: {len(results['git_backups'])}個")
    print(f"  - 重複node_modules: {len(results['node_modules_duplicates'])}個")

    total_size = manager.get_total_cleanup_size()
    print(f"\n💾 削減可能容量: {total_size} MB")

    if args.generate_script:
        manager.generate_cleanup_script()

    print(f"\n📝 スキャン完了: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
