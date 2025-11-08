# Ghost Text System - Phi-2統合版

## 概要

このディレクトリには、Phi-2モデルベースの新しいGhost Text MIDI予測システムが実装されています。既存のMagentaモデルやfallbackシステムとは別に動作し、高速な予測機能を提供します。

## ⚠️ 重要：2つのGhost Textシステム

現在、プロジェクトには2つの独立したGhost Textシステムが存在します：

### 1. **Magentaベースシステム（現在使用中）** ✅
- **場所**: `src/components/EnhancedMidiEditor.jsx`
- **エンジン**: `src/utils/magentaGhostTextEngine.js`
- **特徴**: 音楽理論統合、MusicTheorySystem連携
- **ステータス**: PR #148で強化済み、実運用中

### 2. **Phi-2ベースシステム（開発版・未使用）** 🚧
- **場所**: `src/components/MIDIEditor/Phi2MidiEditor.jsx` ⭐ **リネーム済み**
- **エンジン**: このディレクトリ内の各種ファイル
- **特徴**: FastAPI統合、高速予測、要約ベース
- **ステータス**: 実装完了済みだが未配置

## 実装完了状況

### ✅ 完了済みタスク

#### タスク1: プロジェクト構造の設定
- [x] Ghost Textシステム用のディレクトリ構造を作成
- [x] バックエンドとフロントエンドの分離設計

#### タスク2: バックエンドコンポーネント実装
- [x] **TrackAnalyzer**: キー検出、テンポ解析、パターン認識
- [x] **SummaryGenerator**: ルールベース要約、感情検出
- [x] **PromptAssembler**: テンプレート、ノート整形、カーソル対応

#### タスク3: Phi-2モデル統合
- [x] **Phi2PredictionEngine**: モデルローダー、予測エンジン、最適化
- [x] **FastAPIサービス**: APIエンドポイント、パフォーマンス監視
- [x] **ヘルスチェック**: `/health`エンドポイント
- [x] **要約管理**: `/update-summary`、`/summary/{track_id}`エンドポイント

#### タスク4: フロントエンド統合 ✅ **完了**
- [x] **GhostTextInputContext**: MIDI入力コンテキスト管理
- [x] **GhostTextEngineClient**: バックエンドAPI通信クライアント
- [x] **GhostPredictionRenderer**: ゴーストノート描画
- [x] **GhostTextSystem**: 統合システムクラス
- [x] **useGhostTextIntegration**: Reactフック
- [x] **InstrumentSettingsPanel統合**: AIモデル選択と要約管理
- [x] **Phi2MidiEditor統合**: Phi-2システムとの統合

## ファイル構成

```
ghostText/
├── GhostTextSystem.js              # メイン統合クラス
├── GhostTextInputContext.js        # 入力コンテキスト管理
├── GhostTextEngineClient.js        # API通信クライアント
├── GhostPredictionRenderer.js      # ゴーストノート描画
├── useGhostTextIntegration.js      # React統合フック
├── test-integration.js             # 統合テスト
└── README.md                       # このファイル
```

## 主要機能

### 1. 高速予測システム
- **Phi-2モデル**: 軽量で高速な予測
- **要約ベース予測**: 事前要約による高速応答
- **キャッシュ機能**: 重複予測の回避
- **リトライ機能**: ネットワークエラーの自動復旧

### 2. インテリジェントコンテキスト管理
- **トラック解析**: キー、テンポ、パターンの自動検出
- **要約生成**: 音楽的特徴の自動抽出
- **手動要約更新**: ユーザー制御による要約タイミング

### 3. 視覚的フィードバック
- **ゴーストノート表示**: 半透明の予測ノート
- **カスタマイズ可能**: 色、透明度の調整
- **インタラクティブ**: クリックで確定

### 4. パフォーマンス監視
- **リアルタイムメトリクス**: 応答時間、成功率
- **システム状態**: 接続状況、モデル状態
- **エラー追跡**: 詳細なエラーログ

## ユーザー体験設計

### 🎯 **要約ボタン方式**
- **ユーザーコントロール**: 要約タイミングをユーザーが制御
- **パフォーマンス最適化**: 事前要約により高速予測が可能
- **リソース効率**: 不要なAPI呼び出しを削減
- **予測精度**: 最新の要約に基づく高精度予測

### 🔄 **ワークフロー**
1. **MIDI入力**: ユーザーがノートを入力
2. **要約更新**: 「要約を更新」ボタンをクリック
3. **高速予測**: 要約に基づく即座の予測
4. **ゴーストノート**: 視覚的フィードバック
5. **確定**: クリックでノートを確定

## 使用方法

### 1. バックエンド起動
```bash
cd backend
python -m uvicorn ghost_text.service:app --reload --port 8000
```

### 2. フロントエンド統合
```javascript
// Phi2MidiEditor内で自動統合済み（未使用）
// 現在使用中: EnhancedMidiEditor.jsx（Magentaベース）
// InstrumentSettingsPanelから制御可能
```

### 3. AIモデル選択
```
MIDI Editor Settings
├── AI Model Selection
│   ├── Disabled (無効)
│   ├── Magenta (従来)
│   └── Phi-2 (高速)
├── Summary Management
│   ├── "Update Summary" ボタン
│   ├── Last Updated: 2024-12-XX XX:XX
│   └── Summary Status: ✓ Ready / ⚠ Needs Update
└── Prediction Settings
    ├── Auto-predict: ON/OFF
    ├── Prediction Delay: 100ms
    └── Ghost Note Opacity: 50%
```

## 設定オプション

| オプション | デフォルト | 説明 |
|-----------|-----------|------|
| `aiModel` | `'magenta'` | AIモデル選択 |
| `ghostTextEnabled` | `false` | Ghost Text有効/無効 |
| `autoPredict` | `true` | 自動予測ON/OFF |
| `predictionDelay` | `100` | 予測遅延時間（ms） |
| `ghostNoteOpacity` | `0.5` | ゴーストノート透明度 |

## パフォーマンス目標

- **予測応答時間**: 300ms以内
- **システム初期化**: 5秒以内
- **メモリ使用量**: 100MB以下
- **CPU使用率**: 10%以下（アイドル時）

## テスト

統合テストの実行:
```javascript
// ブラウザコンソールで実行
window.runGhostTextTests();
```

## 既存システムとの関係

この新しいGhost Textシステムは、既存のMagentaベースシステムとは完全に独立して動作します：

- **並行動作**: 両システムを同時に有効化可能
- **個別制御**: それぞれ独立した設定と制御
- **フォールバック**: 新システムが失敗した場合の既存システムへの切り替え
- **段階的移行**: 既存システムから新システムへの段階的移行が可能

## 次のステップ

1. **パフォーマンス最適化**: 300ms以内の応答時間達成
2. **モデル精度向上**: より音楽的な予測の実現
3. **ユーザビリティ改善**: UI/UXの向上
4. **統合テスト**: 本格的なテストスイートの実装

## 技術仕様

- **バックエンド**: FastAPI + Phi-2
- **フロントエンド**: React + Canvas API
- **通信**: RESTful API + WebSocket（将来）
- **キャッシュ**: メモリベース + Redis（将来）

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/health` | GET | ヘルスチェック |
| `/predict-next-note` | POST | 次のノート予測 |
| `/update-summary` | POST | トラック要約更新 |
| `/summary/{track_id}` | GET | 要約取得 |
| `/metrics` | GET | パフォーマンス指標 |
| `/clear-cache` | POST | キャッシュクリア |

---

**実装完了日**: 2024年12月
**バージョン**: 1.0.0
**ステータス**: タスク4完了、要約ボタン方式実装完了 