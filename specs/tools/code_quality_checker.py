#!/usr/bin/env python3
"""
DAWAI コード品質チェッカー
デッドコード、console.log、コーディング規約違反を検出
"""

import re
from pathlib import Path
from typing import Dict, List


class CodeQualityChecker:
    """コード品質チェック"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.frontend_dir = project_root / "DAWAI_server" / "frontend" / "src"
        self.backend_dir = project_root / "DAWAI_server" / "backend"

        self.issues = {
            'console_logs': [],
            'large_files': [],
            'dead_code': [],
            'naming_violations': [],
            'security_patterns': []
        }

    def check_all(self) -> Dict:
        """全コード品質チェック"""
        self._check_console_logs()
        self._check_large_files()
        self._check_dead_code()
        self._check_naming_conventions()
        self._check_security_patterns()

        return self.issues

    def _check_console_logs(self):
        """console.log検出"""
        print("  🔍 console.log 検出中...")

        # JavaScriptファイルのチェック
        if self.frontend_dir.exists():
            for js_file in self.frontend_dir.rglob("*.js"):
                self._scan_console_in_file(js_file)

            for jsx_file in self.frontend_dir.rglob("*.jsx"):
                self._scan_console_in_file(jsx_file)

        total_console = sum(item['count'] for item in self.issues['console_logs'])
        print(f"    ℹ️ 検出: {total_console}件のconsole文")

        if total_console > 100:
            print(f"    ⚠️ 警告: console文が多すぎます（推奨: <100件）")

    def _scan_console_in_file(self, file_path: Path):
        """ファイル内のconsole文をスキャン"""
        try:
            content = file_path.read_text(encoding='utf-8')

            # console.log, console.warn, console.error, console.debug, console.infoを検出
            pattern = r'console\.(log|warn|error|debug|info)'
            matches = re.findall(pattern, content)

            if matches:
                # 行番号も取得
                lines_with_console = []
                for i, line in enumerate(content.splitlines(), 1):
                    if re.search(pattern, line):
                        lines_with_console.append(i)

                self.issues['console_logs'].append({
                    'file': str(file_path.relative_to(self.project_root)),
                    'count': len(matches),
                    'types': list(set(matches)),
                    'lines': lines_with_console[:10]  # 最初の10件のみ保存
                })
        except Exception as e:
            # エラーは無視（バイナリファイルなど）
            pass

    def _check_large_files(self):
        """大規模ファイル検出（1000行超）"""
        print("  🔍 大規模ファイル検出中...")

        threshold = 1000
        critical_threshold = 1500

        if self.frontend_dir.exists():
            # JavaScriptファイルのチェック
            for code_file in self.frontend_dir.rglob("*.js"):
                self._check_file_size(code_file, threshold, critical_threshold)

            # JSXファイルのチェック
            for jsx_file in self.frontend_dir.rglob("*.jsx"):
                self._check_file_size(jsx_file, threshold, critical_threshold)

        if self.backend_dir.exists():
            # Pythonファイルのチェック
            for py_file in self.backend_dir.rglob("*.py"):
                self._check_file_size(py_file, threshold, critical_threshold)

        print(f"    ℹ️ 検出: {len(self.issues['large_files'])}個の大規模ファイル")

        critical_files = [f for f in self.issues['large_files'] if f['severity'] == 'critical']
        if critical_files:
            print(f"    ⚠️ 警告: {len(critical_files)}個のファイルが1500行を超えています")

    def _check_file_size(self, file_path: Path, threshold: int, critical_threshold: int):
        """ファイルサイズチェック"""
        try:
            lines = len(file_path.read_text(encoding='utf-8').splitlines())
            if lines > threshold:
                self.issues['large_files'].append({
                    'file': str(file_path.relative_to(self.project_root)),
                    'lines': lines,
                    'severity': 'critical' if lines > critical_threshold else 'warning'
                })
        except Exception:
            pass

    def _check_dead_code(self):
        """デッドコード検出（簡易版）"""
        print("  🔍 デッドコード検出中...")

        # 未使用インポートの簡易チェック
        if self.frontend_dir.exists():
            for js_file in self.frontend_dir.rglob("*.js"):
                self._check_unused_imports(js_file)

            for jsx_file in self.frontend_dir.rglob("*.jsx"):
                self._check_unused_imports(jsx_file)

        dead_code_count = len(self.issues['dead_code'])
        print(f"    ℹ️ 検出: {dead_code_count}件の疑わしいコード")

        if dead_code_count > 0:
            print(f"    💡 ヒント: 詳細なデッドコード検出にはESLintやtypescriptの使用を推奨")

    def _check_unused_imports(self, file_path: Path):
        """未使用インポートの簡易チェック"""
        try:
            content = file_path.read_text(encoding='utf-8')

            # import文を抽出
            import_pattern = r'import\s+(?:{[^}]+}|\w+)\s+from\s+[\'"]([^\'"]+)[\'"]'
            imports = re.findall(import_pattern, content)

            # 極端に多いimport文を検出（20個以上）
            if len(imports) > 20:
                self.issues['dead_code'].append({
                    'file': str(file_path.relative_to(self.project_root)),
                    'type': 'excessive_imports',
                    'count': len(imports),
                    'message': 'インポート文が多すぎます（未使用の可能性）'
                })

            # コメントアウトされた大きなコードブロックを検出
            commented_blocks = re.findall(r'/\*[\s\S]{100,}\*/', content)
            if commented_blocks:
                self.issues['dead_code'].append({
                    'file': str(file_path.relative_to(self.project_root)),
                    'type': 'commented_code',
                    'count': len(commented_blocks),
                    'message': 'コメントアウトされた大きなコードブロックがあります'
                })
        except Exception:
            pass

    def _check_naming_conventions(self):
        """命名規則チェック"""
        print("  🔍 命名規則チェック中...")

        # コンポーネント名のチェック（Reactコンポーネントは大文字で始まる）
        if self.frontend_dir.exists():
            for jsx_file in self.frontend_dir.rglob("*.jsx"):
                self._check_component_naming(jsx_file)

        violations_count = len(self.issues['naming_violations'])
        print(f"    ℹ️ 検出: {violations_count}件の命名規則違反の疑い")

        if violations_count > 0:
            print(f"    💡 ヒント: ESLintの命名規則ルールの使用を推奨")

    def _check_component_naming(self, file_path: Path):
        """コンポーネント命名規則チェック"""
        try:
            # ファイル名が小文字で始まる場合、潜在的な問題
            filename = file_path.stem
            if filename[0].islower() and filename not in ['index', 'utils', 'helpers', 'constants']:
                content = file_path.read_text(encoding='utf-8')

                # export default や export function を含む場合、コンポーネントの可能性
                if 'export default' in content or 'export function' in content:
                    self.issues['naming_violations'].append({
                        'file': str(file_path.relative_to(self.project_root)),
                        'type': 'component_naming',
                        'message': f'コンポーネントファイル名は大文字で始めることを推奨: {filename}'
                    })
        except Exception:
            pass

    def _check_security_patterns(self):
        """セキュリティパターンチェック"""
        print("  🔍 セキュリティパターン検出中...")

        # eval(), dangerouslySetInnerHTML等の危険なパターン
        dangerous_patterns = [
            (r'\beval\s*\(', 'eval関数の使用'),
            (r'dangerouslySetInnerHTML', 'dangerouslySetInnerHTMLの使用'),
            (r'document\.write\s*\(', 'document.writeの使用'),
            (r'innerHTML\s*=', 'innerHTMLへの直接代入'),
        ]

        if self.frontend_dir.exists():
            for js_file in self.frontend_dir.rglob("*.js"):
                self._scan_security_patterns(js_file, dangerous_patterns)

            for jsx_file in self.frontend_dir.rglob("*.jsx"):
                self._scan_security_patterns(jsx_file, dangerous_patterns)

        security_count = len(self.issues['security_patterns'])
        print(f"    ℹ️ 検出: {security_count}件のセキュリティ懸念パターン")

        if security_count > 0:
            print(f"    ⚠️ 警告: 潜在的なセキュリティリスクが検出されました")

    def _scan_security_patterns(self, file_path: Path, patterns: List):
        """セキュリティパターンのスキャン"""
        try:
            content = file_path.read_text(encoding='utf-8')

            for pattern, description in patterns:
                matches = re.findall(pattern, content)
                if matches:
                    self.issues['security_patterns'].append({
                        'file': str(file_path.relative_to(self.project_root)),
                        'pattern': description,
                        'count': len(matches)
                    })
        except Exception:
            pass


def main():
    """テスト実行用メイン関数"""
    import argparse
    from datetime import datetime

    parser = argparse.ArgumentParser(description="DAWAI コード品質チェッカー")
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path("."),
        help="プロジェクトルート"
    )

    args = parser.parse_args()

    print("🔧 DAWAI コード品質チェック開始...")
    print("=" * 70)

    checker = CodeQualityChecker(args.project_root)
    results = checker.check_all()

    # 結果サマリー
    print("\n" + "=" * 70)
    print("📊 コード品質チェック結果")
    print("=" * 70)
    print(f"\n📈 サマリー:")
    print(f"  - console文: {sum(item['count'] for item in results['console_logs'])}件")
    print(f"  - 大規模ファイル: {len(results['large_files'])}個")
    print(f"  - デッドコード疑い: {len(results['dead_code'])}件")
    print(f"  - 命名規則違反: {len(results['naming_violations'])}件")
    print(f"  - セキュリティ懸念: {len(results['security_patterns'])}件")

    print(f"\n📝 チェック完了: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
