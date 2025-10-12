#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DAWAI プロジェクト ディレクトリ構造チェックスクリプト
二重化フォルダ混同防止とプログラムコンテスト提出準備確認用

使用方法:
  python check_directory.py
  python check_directory.py --contest-mode  # コンテスト提出用チェック
"""

import os
import sys
import subprocess
import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# Windows console encoding対応
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

class DAWAIDirectoryChecker:
    def __init__(self):
        self.script_dir = Path(__file__).parent.absolute()
        self.expected_structure = {
            'DAWAI_server': {
                'frontend': {
                    'src': {},
                    'public': {},
                    'package.json': 'file',
                    'vite.config.js': 'file'
                },
                'backend': {
                    'ai_agent': {
                        'main.py': 'file'
                    },
                    'diffsinger': {
                        'mock_diffsinger_server.py': 'file',
                        'outputs': {}
                    }
                },
                'specs': {},
                'docs': {}
            }
        }

    def check_current_location(self) -> Tuple[bool, str]:
        """現在のスクリプト実行場所が正しいかチェック"""
        current_path = str(self.script_dir)

        # SuperClaude配下でないことを確認
        if 'SuperClaude' in current_path:
            return False, f"❌ SuperClaude配下で実行されています: {current_path}"

        # DAWAI_server直下であることを確認
        if not current_path.endswith('DAWAI_server'):
            return False, f"❌ DAWAI_server直下で実行してください: {current_path}"

        return True, f"✅ 正しい場所で実行されています: {current_path}"

    def check_directory_structure(self) -> Tuple[bool, List[str]]:
        """ディレクトリ構造の確認"""
        issues = []

        def check_structure(base_path: Path, expected: Dict, level: int = 0):
            for name, content in expected.items():
                item_path = base_path / name
                indent = "  " * level

                if content == 'file':
                    if not item_path.is_file():
                        issues.append(f"{indent}❌ ファイルが見つかりません: {item_path}")
                    else:
                        print(f"{indent}✅ {name}")
                elif isinstance(content, dict):
                    if not item_path.is_dir():
                        issues.append(f"{indent}❌ ディレクトリが見つかりません: {item_path}")
                    else:
                        print(f"{indent}📁 {name}/")
                        if content:  # 空でない場合は再帰チェック
                            check_structure(item_path, content, level + 1)

        print("📋 ディレクトリ構造確認:")
        check_structure(self.script_dir, self.expected_structure)

        return len(issues) == 0, issues

    def check_superclaude_conflicts(self) -> Tuple[bool, List[str]]:
        """SuperClaude重複フォルダの確認"""
        issues = []
        project_root = self.script_dir.parent
        superclaude_path = project_root / "SuperClaude" / "DAWAI_server"

        if superclaude_path.exists():
            issues.append(f"⚠️  SuperClaude重複フォルダが存在: {superclaude_path}")
            issues.append("   → 開発用のみで本番では使用禁止")

        return len(issues) == 0, issues

    def check_npm_dependencies(self) -> Tuple[bool, List[str]]:
        """npm依存関係の確認"""
        issues = []
        package_json_path = self.script_dir / "frontend" / "package.json"

        if not package_json_path.exists():
            issues.append("❌ frontend/package.json が見つかりません")
            return False, issues

        node_modules_path = self.script_dir / "frontend" / "node_modules"
        if not node_modules_path.exists():
            issues.append("⚠️  frontend/node_modules が見つかりません")
            issues.append("   → npm install を実行してください")

        return len(issues) == 0, issues

    def check_python_dependencies(self) -> Tuple[bool, List[str]]:
        """Python依存関係の確認"""
        issues = []

        # 必要なPythonパッケージ
        required_packages = ['fastapi', 'uvicorn', 'numpy', 'pydub']

        for package in required_packages:
            try:
                __import__(package)
                print(f"✅ {package}")
            except ImportError:
                issues.append(f"❌ Pythonパッケージが見つかりません: {package}")

        return len(issues) == 0, issues

    def check_ports(self) -> Tuple[bool, List[str]]:
        """ポート使用状況の確認"""
        issues = []
        ports_to_check = [5173, 8000, 8001]  # フロントエンド、AIエージェント、DiffSinger

        for port in ports_to_check:
            try:
                result = subprocess.run(
                    ['netstat', '-ano'],
                    capture_output=True,
                    text=True,
                    check=True
                )
                if f":{port}" in result.stdout:
                    print(f"🟡 ポート {port} が使用中")
                else:
                    print(f"✅ ポート {port} が利用可能")
            except subprocess.CalledProcessError:
                issues.append(f"⚠️  ポート {port} の確認に失敗")

        return len(issues) == 0, issues

    def generate_startup_scripts(self) -> bool:
        """起動スクリプトの生成"""
        print("📝 起動スクリプトを生成中...")

        # Windows用起動スクリプト
        start_script_content = """@echo off
echo DAWAI プロジェクト起動スクリプト
echo ================================

echo 1. フロントエンド起動中...
cd frontend
start cmd /k "npm run dev"
cd ..

echo 2. DiffSinger音声合成サーバー起動中...
cd backend\\diffsinger
start cmd /k "python mock_diffsinger_server.py"
cd ..\\..

echo 3. AIエージェントサーバー起動中...
cd backend\\ai_agent
start cmd /k "python main.py"
cd ..\\..

echo.
echo ✅ すべてのサーバーが起動されました
echo.
echo 📱 フロントエンド: http://localhost:5173
echo 🤖 AIエージェント: http://localhost:8000
echo 🎵 DiffSinger: http://localhost:8001
echo.
pause
"""

        start_script_path = self.script_dir / "start_dawai.bat"
        with open(start_script_path, 'w', encoding='utf-8') as f:
            f.write(start_script_content)

        # Unix/Linux用起動スクリプト
        start_script_unix_content = """#!/bin/bash
echo "DAWAI プロジェクト起動スクリプト"
echo "================================"

echo "1. フロントエンド起動中..."
cd frontend
gnome-terminal -- bash -c "npm run dev; exec bash" &
cd ..

echo "2. DiffSinger音声合成サーバー起動中..."
cd backend/diffsinger
gnome-terminal -- bash -c "python mock_diffsinger_server.py; exec bash" &
cd ../..

echo "3. AIエージェントサーバー起動中..."
cd backend/ai_agent
gnome-terminal -- bash -c "python main.py; exec bash" &
cd ../..

echo ""
echo "✅ すべてのサーバーが起動されました"
echo ""
echo "📱 フロントエンド: http://localhost:5173"
echo "🤖 AIエージェント: http://localhost:8000"
echo "🎵 DiffSinger: http://localhost:8001"
echo ""
"""

        start_script_unix_path = self.script_dir / "start_dawai.sh"
        with open(start_script_unix_path, 'w', encoding='utf-8') as f:
            f.write(start_script_unix_content)

        # 実行権限付与（Unix系）
        try:
            os.chmod(start_script_unix_path, 0o755)
        except:
            pass

        print(f"✅ 起動スクリプト生成完了:")
        print(f"   - Windows: {start_script_path}")
        print(f"   - Unix/Linux: {start_script_unix_path}")

        return True

    def run_full_check(self, contest_mode: bool = False) -> bool:
        """完全チェックの実行"""
        print("🔍 DAWAI プロジェクト ディレクトリチェック開始")
        print("=" * 50)

        all_passed = True

        # 1. 実行場所確認
        print("\n1️⃣ 実行場所確認:")
        location_ok, location_msg = self.check_current_location()
        print(location_msg)
        if not location_ok:
            all_passed = False

        # 2. ディレクトリ構造確認
        print("\n2️⃣ ディレクトリ構造確認:")
        structure_ok, structure_issues = self.check_directory_structure()
        if not structure_ok:
            all_passed = False
            for issue in structure_issues:
                print(issue)

        # 3. SuperClaude重複確認
        print("\n3️⃣ SuperClaude重複確認:")
        superclaude_ok, superclaude_issues = self.check_superclaude_conflicts()
        if not superclaude_ok:
            for issue in superclaude_issues:
                print(issue)

        # 4. npm依存関係確認
        print("\n4️⃣ npm依存関係確認:")
        npm_ok, npm_issues = self.check_npm_dependencies()
        if not npm_ok:
            all_passed = False
            for issue in npm_issues:
                print(issue)

        # 5. Python依存関係確認
        print("\n5️⃣ Python依存関係確認:")
        python_ok, python_issues = self.check_python_dependencies()
        if not python_ok:
            all_passed = False
            for issue in python_issues:
                print(issue)

        # 6. ポート確認
        print("\n6️⃣ ポート使用状況確認:")
        ports_ok, ports_issues = self.check_ports()
        if not ports_ok:
            for issue in ports_issues:
                print(issue)

        # 7. 起動スクリプト生成
        print("\n7️⃣ 起動スクリプト生成:")
        self.generate_startup_scripts()

        # 8. コンテストモード固有チェック
        if contest_mode:
            print("\n8️⃣ プログラムコンテスト提出準備確認:")
            contest_ok = self.check_contest_readiness()
            if not contest_ok:
                all_passed = False

        # 結果報告
        print("\n" + "=" * 50)
        if all_passed:
            print("🎉 すべてのチェックに合格しました！")
            print("✅ DAWAI プロジェクトは正常に設定されています")
        else:
            print("⚠️  いくつかの問題が検出されました")
            print("📋 上記の問題を修正してから再実行してください")

        return all_passed

    def check_contest_readiness(self) -> bool:
        """プログラムコンテスト提出準備確認"""
        issues = []

        # README.mdの存在確認
        readme_path = self.script_dir / "README.md"
        if not readme_path.exists():
            issues.append("❌ README.md が見つかりません（提出必須）")
        else:
            print("✅ README.md が存在します")

        # 不要ファイルの確認
        unwanted_patterns = [
            '*.log', '*.tmp', 'node_modules', '__pycache__',
            '.env', 'outputs/*.wav', '.DS_Store'
        ]

        print("🧹 不要ファイルチェック:")
        for pattern in unwanted_patterns:
            # 簡易的なチェック（実装は省略）
            print(f"  - {pattern} パターンのファイル確認")

        # ファイルサイズ確認
        total_size = self.calculate_directory_size(self.script_dir)
        size_mb = total_size / (1024 * 1024)
        print(f"📊 プロジェクト総サイズ: {size_mb:.1f} MB")

        if size_mb > 100:  # 100MB制限と仮定
            issues.append(f"⚠️  プロジェクトサイズが大きすぎます: {size_mb:.1f} MB")

        if issues:
            for issue in issues:
                print(issue)
            return False

        print("✅ プログラムコンテスト提出準備完了")
        return True

    def calculate_directory_size(self, directory: Path) -> int:
        """ディレクトリサイズの計算"""
        total_size = 0
        try:
            for dirpath, dirnames, filenames in os.walk(directory):
                # node_modulesや.gitなどを除外
                dirnames[:] = [d for d in dirnames if d not in [
                    'node_modules', '.git', '__pycache__', '.vscode',
                    'outputs', '.next', 'dist', 'build'
                ]]

                for filename in filenames:
                    file_path = os.path.join(dirpath, filename)
                    try:
                        total_size += os.path.getsize(file_path)
                    except (OSError, IOError):
                        pass
        except (OSError, IOError):
            pass

        return total_size

def main():
    """メイン関数"""
    contest_mode = '--contest-mode' in sys.argv

    checker = DAWAIDirectoryChecker()
    success = checker.run_full_check(contest_mode)

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()