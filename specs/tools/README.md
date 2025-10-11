# DAWAI ヘルスチェックツール

DAWAI プロジェクトの健全性を包括的に検証するツール群です。

## 📋 ツール一覧

### 1. `health_checker.py` - 統合ヘルスチェッカー

プロジェクト全体の健全性を包括的に検証する統合ツールです。

#### 機能

- **レベル1**: 仕様書整合性チェック（sync_checker.pyを統合）
- **レベル2**: コード品質チェック
- **レベル3**: クリーンアップ対象の検出
- **レベル4**: トークン最適化チェック

#### 使用方法

```bash
# 基本的な使用方法（プロジェクトルートから実行）
cd DAWAI_server/specs/tools
python health_checker.py --project-root ../../..

# CI/CDモード（簡潔な出力）
python health_checker.py --project-root ../../.. --ci-mode

# 自動修正モード（将来実装予定）
python health_checker.py --project-root ../../.. --auto-fix
```

#### 出力

- `reports/health_report_YYYYMMDD_HHMMSS.md` - Markdown形式のレポート
- `reports/health_data_YYYYMMDD_HHMMSS.yaml` - YAML形式の詳細データ
- `reports/health_data_YYYYMMDD_HHMMSS.json` - JSON形式のデータ（CI/CD向け）

### 2. `code_quality_checker.py` - コード品質チェッカー

コードの品質を検証し、潜在的な問題を検出します。

#### チェック項目

1. **console.log検出**
   - console.log/warn/error/debug/infoの検出
   - ファイルごとの出現回数と行番号
   - 100件以上で警告

2. **大規模ファイル検出**
   - 1000行以上: 警告
   - 1500行以上: クリティカル
   - JavaScript/JSX/Pythonファイルが対象

3. **デッドコード検出（簡易版）**
   - 過剰なインポート文（20個以上）
   - 大きなコメントアウトブロック

4. **命名規則チェック**
   - Reactコンポーネントファイル名
   - 大文字開始の推奨

5. **セキュリティパターン検出**
   - `eval()` の使用
   - `dangerouslySetInnerHTML` の使用
   - `document.write()` の使用
   - `innerHTML` への直接代入

#### 使用方法

```bash
# 単独実行
python code_quality_checker.py --project-root ../../..
```

### 3. `cleanup_manager.py` - クリーンアップマネージャー

不要なファイルを検出し、クリーンアップを支援します。

#### 検出対象

1. **古いログファイル**
   - 30日以上経過した.log, .log.*, .outファイル
   - サイズと経過日数を表示

2. **古い仕様書**
   - `old_devs/`ディレクトリ内のファイル
   - `*old*.md`パターンのファイル

3. **バックアップファイル**
   - .bak, .old, .backup, ~, .swp, .swoファイル

4. **一時ファイル**
   - .tmp, .temp, .DS_Store, Thumbs.db, desktop.ini

5. **Gitバックアップディレクトリ**
   - `git_backup_*`パターンのディレクトリ

6. **重複node_modules**
   - 標準位置以外のnode_modulesディレクトリ

#### 使用方法

```bash
# スキャンのみ
python cleanup_manager.py --project-root ../../.. --scan-only

# クリーンアップスクリプト生成
python cleanup_manager.py --project-root ../../.. --generate-script

# 生成されたスクリプトの実行
bash ../../../cleanup_script.sh
```

### 4. `sync_checker.py` - 仕様書整合性チェッカー（既存）

階層型仕様書2.0の整合性を検証します。

#### チェック項目

1. 実装ファイルの存在確認
2. 要件トレーサビリティチェック
3. ダイアグラム同期状態チェック
4. ID命名規則チェック
5. 実装率検証
6. セキュリティ課題チェック

#### 使用方法

```bash
# 標準チェック
python sync_checker.py --project-root ../../..

# セキュリティ重点チェック
python sync_checker.py --project-root ../../.. --security-focus
```

## 🚀 推奨ワークフロー

### 日々の開発時

```bash
# 開発開始前に軽量チェック
python health_checker.py --project-root ../../.. --ci-mode
```

### プルリクエスト前

```bash
# 完全なチェックを実行
python health_checker.py --project-root ../../..

# レポートを確認
cat reports/health_report_*.md
```

### 提出前のクリーンアップ

```bash
# 1. ヘルスチェック実行
python health_checker.py --project-root ../../..

# 2. クリーンアップ対象をスキャン
python cleanup_manager.py --project-root ../../.. --generate-script

# 3. スクリプトを確認後、実行
bash ../../../cleanup_script.sh

# 4. 最終確認
python health_checker.py --project-root ../../.. --ci-mode
```

## 📊 レポートの見方

### 総合ステータス

- **HEALTHY**: 問題なし
- **GOOD**: 軽微な警告のみ（10件未満）
- **NEEDS_ATTENTION**: 対応が必要（クリティカル問題 1-4件）
- **CRITICAL**: 緊急対応が必要（クリティカル問題 5件以上）

### チェックステータス

- ✅ **PASSED**: 問題なし
- ⚠️ **WARNING**: 警告あり
- ❌ **FAILED**: エラーあり
- ℹ️ **INFO**: 情報のみ
- ⏭️ **SKIPPED**: スキップ

## 🤖 GitHub Actions統合

`.github/workflows/daily-health-check.yml`を作成することで、毎日自動でヘルスチェックを実行できます。

```yaml
name: Daily Health Check

on:
  schedule:
    - cron: '0 3 * * *'  # 毎日午前3時（UTC）
  workflow_dispatch:  # 手動実行も可能

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install pyyaml

      - name: Run health check
        run: |
          cd DAWAI_server/specs/tools
          python health_checker.py --project-root ../../.. --ci-mode

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: health-report
          path: DAWAI_server/specs/tools/reports/
```

## 📝 開発者向け情報

### 依存関係

- Python 3.11+
- pyyaml（YAMLファイル処理）
- 標準ライブラリのみ（その他）

### 拡張方法

新しいチェックを追加する場合：

1. `health_checker.py`に新しいチェックメソッドを追加
2. `run_full_check()`メソッド内で呼び出し
3. 結果を`self.results['checks']`に格納

### ファイル構成

```
specs/tools/
├── health_checker.py          # 統合ヘルスチェッカー
├── code_quality_checker.py    # コード品質チェック
├── cleanup_manager.py         # クリーンアップ管理
├── sync_checker.py            # 仕様書整合性チェック（既存）
├── reports/                   # レポート出力ディレクトリ
│   ├── .gitkeep
│   ├── health_report_*.md
│   ├── health_data_*.yaml
│   └── health_data_*.json
└── README.md                  # このファイル
```

## ⚠️ 注意事項

1. **自動修正機能**: 現在開発中です。手動での確認・修正を推奨します。
2. **大規模プロジェクト**: 初回実行時は時間がかかる場合があります。
3. **セキュリティ**: 検出された問題は速やかに対応してください。
4. **バックアップ**: クリーンアップ前に必ずバックアップを取ってください。

## 🔧 トラブルシューティング

### ModuleNotFoundError: No module named 'yaml'

```bash
pip install pyyaml
```

### パスエラー

プロジェクトルートからの相対パスを正しく指定してください：

```bash
# OK: DAWAI_server/specs/toolsから実行
python health_checker.py --project-root ../../..

# OK: プロジェクトルートから実行
python DAWAI_server/specs/tools/health_checker.py --project-root .
```

### 権限エラー

`cleanup_script.sh`に実行権限を付与してください：

```bash
chmod +x cleanup_script.sh
```

## 📚 関連ドキュメント

- [階層型仕様書2.0](../overview/index.md)
- [CLAUDE.md](../../../CLAUDE.md)
- [開発ガイド](../../docs/development/)

---

**バージョン**: 1.0.0
**最終更新**: 2025-10-11
**作成者**: Claude Code
