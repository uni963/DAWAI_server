@echo off
REM Demo Song読み込み問題 - Viteキャッシュクリア＆再起動スクリプト
REM 作成: 2025-10-10

echo ========================================
echo  DAWAI - Viteキャッシュクリア＆再起動
echo ========================================
echo.

echo [1/5] ポート5175のプロセスを確認中...
netstat -ano | findstr :5175
echo.

echo [2/5] Viteキャッシュディレクトリをクリア中...
if exist "node_modules\.vite" (
    echo   - node_modules\.vite を削除中...
    rmdir /s /q "node_modules\.vite"
    echo   ✓ node_modules\.vite を削除しました
) else (
    echo   - node_modules\.vite は存在しません
)

if exist ".vite-cache" (
    echo   - .vite-cache を削除中...
    rmdir /s /q ".vite-cache"
    echo   ✓ .vite-cache を削除しました
) else (
    echo   - .vite-cache は存在しません
)
echo.

echo [3/5] ポート5175を使用しているプロセスを停止中...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5175') do (
    echo   - PID %%a を強制終了中...
    taskkill /F /PID %%a >nul 2>&1
    if errorlevel 1 (
        echo   - PID %%a は既に終了しています
    ) else (
        echo   ✓ PID %%a を終了しました
    )
)
echo.

echo [4/5] 3秒待機中...
timeout /t 3 /nobreak >nul
echo.

echo [5/5] Vite開発サーバーを起動中...
echo   - http://localhost:5175 でアプリケーションが起動します
echo   - Ctrl+C でサーバーを停止できます
echo.
echo ========================================
echo  起動後の確認事項:
echo ========================================
echo  1. ブラウザで http://localhost:5175 を開く
echo  2. F12 で開発者ツールを開く
echo  3. Network タブで "Disable cache" にチェック
echo  4. Ctrl+Shift+R でハードリロード
echo  5. コンソールで Manager初期化ログを確認
echo ========================================
echo.

npm run dev
