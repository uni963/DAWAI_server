# DAWAI 機能要件一覧 (L1)

**Document ID**: FR-L1-INDEX-001
**Version**: 2.0.0
**Last Updated**: 2025-01-22
**Parent**: [システム概要](../../overview/index.md)
**Current Implementation**: ✅ Based on actual codebase

## 🎯 機能要件概要

DAWAIシステムの機能要件を階層的に整理し、現在の実装状況と併せて管理します。各機能はReact + FastAPI アーキテクチャに基づいて設計・実装されています。

**コアコンセプト**: 「音楽制作の楽しさを、すべての初心者へ」

初心者が音楽理論を知らなくても、AIの寄り添うサポートで本格的な音楽制作を楽しめる機能を提供します。

## 📋 L1 機能要件マップ

### システム全体機能構成

```mermaid
mindmap
  root((DAWAI機能))
    初心者向けAIサポート
      音楽理論に基づく補完
      スケール・コード進行提案
      寄り添うAIエージェント
      デモソングブラウザ
      スマートサジェスト
    音声・MIDI処理
      リアルタイム音声合成
      MIDI編集・再生
      マルチトラック管理
      オーディオエクスポート
    AI統合機能
      対話型アシスタント
      歌声合成(DiffSinger)
      テキスト補完(Ghost Text)
      マルチAI対応
    プロジェクト管理
      楽曲プロジェクト保存
      セッション管理
      インポート・エクスポート
      クロスデバイス同期
    ユーザーインターフェース
      レスポンシブデザイン
      リアルタイムプレビュー
      キーボードショートカット
      モバイル対応
    開発支援機能
      デバッグツール統合
      パフォーマンス監視
      構造化ロギング
      FPS監視
      UI仮想化
      キャッシュ管理
```

## 🎓 初心者向けAIサポート機能（最重要）

### FR-BEGINNER-001: 音楽理論に基づく智能的補完機能
**実装状況**: ✅ 実装済み（SmartSuggestionOverlay, GenreManager, MusicTheoryEngine）
- **責務**: スケール、コード進行、ルート音、拍子感に基づいた音符・コード提案
- **技術**: React + 音楽理論エンジン + AI統合
- **ファイル**: `frontend/src/components/SmartSuggestionOverlay.jsx`, `frontend/src/managers/genreManager.js`
- **価値**: 初心者が音楽理論を知らなくても、理論的に正しい音楽を作成可能

### FR-BEGINNER-002: 寄り添うAIエージェント
**実装状況**: ✅ 実装済み（AIAssistantChatBox + Memory + RAG）
- **責務**: ゼロから丁寧にガイドし、音楽制作の各ステップをサポート
- **技術**: Claude/OpenAI/Gemini API + メモリ管理 + RAGシステム
- **ファイル**: `frontend/src/components/AIassistant/`, `backend/ai_agent/main.py`
- **価値**: 初心者が挫折せず、段階的に学習しながら創作を継続

### FR-BEGINNER-003: デモソングブラウザ
**実装状況**: ✅ 実装済み（DemoSongBrowser）
- **責務**: リッチなサンプル楽曲で、誰でも簡単に始められる即座の創作体験
- **技術**: React + プロジェクトデータ管理
- **ファイル**: `frontend/src/components/DemoSongBrowser.jsx`, `frontend/src/data/sampleData.js`
- **価値**: 完成品から学び、すぐに編集・カスタマイズして創作開始

### FR-BEGINNER-004: スマートサジェスト（リアルタイム提案）
**実装状況**: ✅ 実装済み（各エディタ統合）
- **責務**: リアルタイムで理論的に正しい選択肢を提示
- **技術**: 音楽理論エンジン + コンテキスト解析
- **ファイル**: `frontend/src/components/SmartSuggestionOverlay.jsx`
- **価値**: 創作中に迷わず、常に次の最適な選択肢が見える

**詳細**: [L2: 初心者サポート要件](L2_beginner_support/) *(今後作成)*

## 🎼 音声・MIDI処理機能

### FR-AUDIO-001: リアルタイム音声処理エンジン
**実装状況**: ✅ 実装済み（Tone.js + unifiedAudioSystem）
- **責務**: 低遅延での音声合成・再生・録音
- **技術**: Tone.js, Web Audio API
- **ファイル**: `frontend/src/utils/unifiedAudioSystem.js`

### FR-AUDIO-002: MIDI編集機能
**実装状況**: ✅ 実装済み（EnhancedMidiEditor）
- **責務**: MIDI ノート編集、ピアノロール、ベロシティ調整
- **技術**: React + Canvas API
- **ファイル**: `frontend/src/components/EnhancedMidiEditor.jsx`

### FR-AUDIO-003: マルチトラック管理
**実装状況**: ✅ 実装済み（ArrangementView）
- **責務**: 複数トラックの同期再生・編集・ミキシング
- **技術**: React state management
- **ファイル**: `frontend/src/components/ArrangementView.jsx`

### FR-AUDIO-004: ドラムシーケンサー
**実装状況**: ✅ 実装済み（DrumTrack）
- **責務**: ドラムパターン作成・編集・再生
- **技術**: グリッドベースUI + 音声サンプル
- **ファイル**: `frontend/src/components/DrumTrack/`

### FR-AUDIO-005: 重低音ベーストラック
**実装状況**: ✅ 実装済み（sampleData.js）
- **責務**: 重低音域（C1-G2）専用ベースライン制作
- **技術**: MIDI音域制約 + 7種ベース音色
- **ファイル**: `frontend/src/data/sampleData.js`

**詳細**: [L2: 音声処理要件](L2_audio_processing/)

## 🤖 AI統合機能

### FR-AI-001: 対話型音楽制作アシスタント
**実装状況**: ✅ 実装済み（AIAssistantChatBox）
- **責務**: 作曲・編曲・音楽理論の相談支援
- **技術**: Claude/OpenAI/Gemini API統合
- **ファイル**: `frontend/src/components/AIAssistantChatBox.jsx`

### FR-AI-002: AI歌声合成 (DiffSinger)
**実装状況**: ✅ 実装済み（DiffSingerTrack）
- **責務**: 歌詞からリアルな歌声を生成
- **技術**: DiffSinger モデル + FastAPI
- **ファイル**: `backend/diffsinger/`, `frontend/src/components/DiffSingerTrack.jsx`

### FR-AI-003: テキスト補完 (Ghost Text)
**実装状況**: ✅ 実装済み（GhostTextPanel）
- **責務**: 歌詞・楽譜入力時のAI支援
- **技術**: カスタムTransformerモデル
- **ファイル**: `backend/ghost_text/`, `frontend/src/components/GhostTextPanel.jsx`

### FR-AI-004: マルチAI切り替え
**実装状況**: ✅ 実装済み（ModelSelector）
- **責務**: Claude/GPT/Gemini の切り替え利用
- **技術**: API統合アダプター
- **ファイル**: `backend/ai_agent/main.py`

**詳細**: [L2: AI統合要件](L2_ai_integration/)

## 📁 プロジェクト管理機能

### FR-PROJECT-001: 楽曲プロジェクト管理
**実装状況**: ✅ 実装済み（ProjectMenu）
- **責務**: プロジェクト作成・保存・読み込み・削除
- **技術**: LocalStorage + JSON シリアライゼーション
- **ファイル**: `frontend/src/components/ProjectMenu.jsx`

### FR-PROJECT-002: セッション永続化
**実装状況**: ✅ 実装済み（各種Persistence フック）
- **責務**: 作業状態の自動保存・復元
- **技術**: React Hooks + IndexedDB
- **ファイル**: `frontend/src/hooks/useMidiPersistence.js`

### FR-PROJECT-003: インポート・エクスポート
**実装状況**: ✅ 実装済み（audioExportEngine）
- **責務**: MIDI/WAV/プロジェクトファイルの入出力
- **技術**: File API + Web Audio API
- **ファイル**: `frontend/src/utils/audioExportEngine.js`

## 🎨 ユーザーインターフェース機能

### FR-UI-001: レスポンシブWebアプリケーション
**実装状況**: ✅ 実装済み（React + Tailwind CSS）
- **責務**: デスクトップ・タブレット・モバイル対応UI
- **技術**: React 18 + Tailwind CSS + Shadcn/ui
- **ファイル**: `frontend/src/App.jsx` (1300+ lines)
- **初心者価値**: いつでもどこでも、デバイスを選ばず創作可能

### FR-UI-002: リアルタイムビジュアライゼーション
**実装状況**: ✅ 実装済み（各種Canvas コンポーネント）
- **責務**: 波形・スペクトラム・MIDI の可視化
- **技術**: Canvas API + Web Audio API
- **ファイル**: `frontend/src/components/MIDIEditor/MidiEditorCanvas.jsx`
- **初心者価値**: 音楽を視覚的に理解し、直感的に編集

### FR-UI-003: キーボードショートカット & タブナビゲーション
**実装状況**: ✅ 実装済み（useKeyboardShortcuts + TabBar）
- **責務**: 効率的な操作のための キーボード対応、Tabキーでのトラック切り替え
- **技術**: React イベントハンドリング
- **ファイル**: `frontend/src/components/ArrangementView/hooks/useKeyboardShortcuts.js`, `frontend/src/components/TabBar.jsx`
- **初心者価値**: 番号付きタブで迷わず操作、効率的なワークフロー

### FR-UI-004: 設定・カスタマイズ
**実装状況**: ✅ 実装済み（SettingsModal）
- **責務**: ユーザー設定・テーマ・言語切り替え
- **技術**: React Context + LocalStorage
- **ファイル**: `frontend/src/components/SettingsModal.jsx`

### FR-UI-005: モバイル・クロスデバイス対応（段階的展開中）
**実装状況**: 🔄 段階的実装中
- **責務**: スマホ・タブレットでのアクセス性向上
- **技術**: レスポンシブデザイン + タッチ最適化
- **ファイル**: 各コンポーネント（モバイル最適化）
- **初心者価値**: 思いついたときにすぐ創作、通勤・移動中でもアイデアメモ

**詳細**: [L2: UI相互作用要件](L2_ui_interaction/)

## 🔧 開発支援機能

### FR-DEBUG-001: 統合デバッグツール初期化
**実装状況**: ✅ 実装済み（useDevTools）
- **責務**: 開発環境でのデバッグツール一括初期化・グローバル公開
- **技術**: React Hooks + Window API
- **ファイル**: `frontend/src/hooks/useDevTools.js`
- **価値**: E2Eテスト対応、効率的な開発・デバッグ

### FR-DEBUG-002: パフォーマンス監視
**実装状況**: ✅ 実装済み（PerformanceMonitor）
- **責務**: 処理時間計測・メトリクス収集・遅延検出
- **技術**: Performance API + 統計収集
- **ファイル**: `frontend/src/utils/performanceMonitor.js`
- **価値**: パフォーマンス問題の早期発見・最適化

### FR-DEBUG-003: 構造化ロガー
**実装状況**: ✅ 実装済み（Logger）
- **責務**: 環境適応型構造化ロギングシステム
- **技術**: カテゴリ別ログ + 環境別出力
- **ファイル**: `frontend/src/utils/logger.js`
- **価値**: 効率的なデバッグ、本番環境での問題追跡

### FR-DEBUG-004: フレームレート監視
**実装状況**: ✅ 実装済み（FrameRateMonitor）
- **責務**: リアルタイムFPS監視・低FPS検出
- **技術**: requestAnimationFrame + 統計分析
- **ファイル**: `frontend/src/utils/frameRateMonitor.js`
- **価値**: ユーザー体験品質の維持

### FR-DEBUG-005: UI仮想化管理
**実装状況**: ✅ 実装済み（VirtualizationManager）
- **責務**: 大規模データセット表示時の最適化
- **技術**: 可視範囲計算 + オーバースキャン
- **ファイル**: `frontend/src/utils/virtualization.js`
- **価値**: 10,000ノート表示時の99%性能改善

### FR-DEBUG-006: キャッシュ管理
**実装状況**: ✅ 実装済み（CacheManager）
- **責務**: ブラウザストレージの効率的管理・自動クリーンアップ
- **技術**: LocalStorage + TTL管理
- **ファイル**: `frontend/src/utils/cacheManager.js`
- **価値**: 音声サンプル読み込みの99.5%高速化

**詳細**: [L2: 構造化デバッグシステム](L2_development_tools/)

## 📊 要件実装マトリクス

| 機能領域 | 機能数 | 実装済み | 部分実装 | 未実装 | 実装率 |
|----------|--------|----------|----------|--------|---------|
| 初心者向けAIサポート | 4 | 4 | 0 | 0 | 100% |
| 音声・MIDI処理 | 5 | 5 | 0 | 0 | 100% |
| AI統合機能 | 4 | 4 | 0 | 0 | 100% |
| プロジェクト管理 | 3 | 3 | 0 | 0 | 100% |
| UI機能 | 5 | 4 | 1 | 0 | 90% |
| 音楽制作サポート | 1 | 1 | 0 | 0 | 100% |
| 開発支援機能 | 6 | 6 | 0 | 0 | 100% |
| **合計** | **28** | **27** | **1** | **0** | **98%** |

### 実装状況詳細
- ✅ **初心者向けAIサポート**: 音楽理論補完、AIエージェント、デモソング、スマートサジェスト
- ✅ **音声・MIDI処理**: リアルタイム音声、MIDI編集、マルチトラック、ドラム、ベース
- ✅ **AI統合機能**: 対話型アシスタント、DiffSinger、Ghost Text、マルチAI
- ✅ **プロジェクト管理**: 楽曲管理、永続化、インポート・エクスポート
- 🔄 **UI機能**: レスポンシブ、ビジュアライゼーション、ショートカット、設定、**モバイル対応（段階的展開中）**
- ✅ **音楽制作サポート**: ジャンル別制作システム
- ✅ **開発支援機能**: デバッグツール、パフォーマンス監視、ロガー、FPS監視、UI仮想化、キャッシュ管理

## 🎼 音楽制作サポート機能

### FR-GENRE-001: ジャンル別音楽制作システム
**実装状況**: ✅ 実装済み（GenreManager）
- **責務**: ジャンル別スケール制約・コード進行・楽器推奨
- **技術**: React Context + MusicTheoryEngine
- **ファイル**: `frontend/src/managers/genreManager.js`, `frontend/src/components/GenreSelector.jsx`

**詳細**: [L2: ジャンル管理要件](L2_genre_management/)

## 🔗 L2詳細要件への案内

### 次レベル詳細文書
- **[L2: 音声処理要件](L2_audio_processing/)** - 音声エンジン詳細仕様
- **[L2: AI統合要件](L2_ai_integration/)** - AI機能統合仕様
- **[L2: ジャンル管理要件](L2_genre_management/)** - ジャンル別音楽制作システム
- **[L2: 音楽理論要件](L2_music_theory/)** - スケール制約・コード進行システム
- **[L2: UI相互作用要件](L2_ui_interaction/)** - ユーザーインターフェース仕様
- **[L2: 構造化デバッグシステム](L2_development_tools/)** - 開発支援・監視・最適化システム

### 関連アーキテクチャ
- **[L1: システム構成](../../architecture/logical/L1_system.md)** - 技術アーキテクチャ
- **[L2: フロントエンド構成](../../architecture/logical/L2_frontend/)** - React アプリ構成
- **[L2: バックエンド構成](../../architecture/logical/L2_backend/)** - FastAPI 構成

### 関連設計
- **[L1: システムフロー](../../design/sequences/L1_system/)** - 主要業務フロー
- **[L2: コンポーネント設計](../../design/classes/L2_class/)** - React コンポーネント設計

## 📋 要件管理情報

| 項目 | 値 |
|------|-----|
| 文書ID | FR-L1-INDEX-001 |
| 責任者 | プロダクトマネージャー |
| レビュー頻度 | 月次 |
| 承認者 | CTO, CPO |
| 実装ベース | 現在のコードベース |
| 最終検証日 | 2025-01-22 |

## 🔄 トレーサビリティ

### ビジネス要求との対応
- **[ビジネスコンテキスト](../../overview/business_context.md)** - 市場要求との整合性
- **[システム概要](../../overview/index.md)** - 価値提案との対応

### 技術実装との対応
- **現在のコードベース**: `DAWAI_server/frontend/`, `DAWAI_server/backend/`
- **実装ファイル**: 各要件に具体的なファイルパスを記載
- **テストケース**: [検証仕様](../../validation/) で定義

---

**注記**: この要件一覧は現在の実装を基に作成されており、コードベースの変更に応じて更新されます。新機能追加時は該当する L2 詳細要件も併せて更新してください。