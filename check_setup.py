#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DAWAI プロジェクト簡易セットアップチェック
Windows Console対応版（絵文字なし）
"""

import os
import sys
import subprocess
from pathlib import Path

def check_current_directory():
    """現在のディレクトリが正しいかチェック"""
    current_dir = Path.cwd()
    print(f"現在のディレクトリ: {current_dir}")

    if 'SuperClaude' in str(current_dir):
        print("警告: SuperClaude配下で実行されています")
        print("正しいパス: C:\\...\\003_DAWAI\\DAWAI_server")
        return False

    if not str(current_dir).endswith('DAWAI_server'):
        print("警告: DAWAI_server直下で実行してください")
        return False

    print("OK: 正しい場所で実行されています")
    return True

def check_directory_structure():
    """基本的なディレクトリ構造をチェック"""
    required_dirs = [
        'frontend',
        'backend',
        'backend/ai_agent',
        'backend/diffsinger',
        'specs'
    ]

    required_files = [
        'frontend/package.json',
        'frontend/vite.config.js',
        'backend/ai_agent/main.py',
        'backend/diffsinger/mock_diffsinger_server.py'
    ]

    print("\nディレクトリ構造確認:")
    all_ok = True

    for dir_path in required_dirs:
        if Path(dir_path).exists():
            print(f"OK: {dir_path}/")
        else:
            print(f"NG: {dir_path}/ が見つかりません")
            all_ok = False

    for file_path in required_files:
        if Path(file_path).exists():
            print(f"OK: {file_path}")
        else:
            print(f"NG: {file_path} が見つかりません")
            all_ok = False

    return all_ok

def check_node_modules():
    """node_modulesの確認"""
    node_modules_path = Path('frontend/node_modules')
    print(f"\nnode_modules確認:")

    if node_modules_path.exists():
        print("OK: frontend/node_modules が存在します")
        return True
    else:
        print("警告: frontend/node_modules が見つかりません")
        print("次のコマンドを実行してください:")
        print("  cd frontend")
        print("  npm install")
        return False

def check_ports():
    """ポート使用状況の確認"""
    print("\nポート確認:")
    ports = [5173, 8000, 8001]

    for port in ports:
        try:
            result = subprocess.run(
                ['netstat', '-ano'],
                capture_output=True,
                text=True,
                shell=True
            )
            if f":{port}" in result.stdout:
                print(f"使用中: ポート {port}")
            else:
                print(f"利用可能: ポート {port}")
        except:
            print(f"確認失敗: ポート {port}")

def create_startup_scripts():
    """起動スクリプトの作成"""
    print("\n起動スクリプト作成:")

    # Windows用バッチファイル
    batch_content = """@echo off
chcp 65001 > nul
echo DAWAI 開発サーバー起動スクリプト
echo ===============================

echo [1] フロントエンド起動...
cd frontend
start "Frontend" cmd /k "npm run dev"
cd ..

echo [2] DiffSinger音声合成サーバー起動...
cd backend\\diffsinger
start "DiffSinger" cmd /k "python mock_diffsinger_server.py"
cd ..\\..

echo [3] AIエージェントサーバー起動...
cd backend\\ai_agent
start "AI Agent" cmd /k "python main.py"
cd ..\\..

echo.
echo すべてのサーバーが起動されました
echo フロントエンド: http://localhost:5173
echo DiffSinger: http://localhost:8001
echo AIエージェント: http://localhost:8000
echo.
pause
"""

    with open('start_servers.bat', 'w', encoding='utf-8') as f:
        f.write(batch_content)

    print("作成完了: start_servers.bat")

def main():
    """メイン関数"""
    print("DAWAI プロジェクト セットアップチェック")
    print("=====================================")

    # チェック実行
    dir_ok = check_current_directory()
    structure_ok = check_directory_structure()
    modules_ok = check_node_modules()
    check_ports()
    create_startup_scripts()

    print("\n" + "="*40)
    if dir_ok and structure_ok:
        print("セットアップ確認完了！")
        if not modules_ok:
            print("注意: npm install を実行してください")
        print("\n次の手順:")
        print("1. start_servers.bat をダブルクリック")
        print("2. ブラウザで http://localhost:5173 を開く")
        print("3. DEMO SONG のテスト")
    else:
        print("設定に問題があります。上記のエラーを確認してください。")

if __name__ == "__main__":
    main()