# L1 システムフローシーケンス - DAWAI

**階層レベル**: L1 (システム)
**対象読者**: アーキテクト、シニア開発者、プロダクトマネージャー
**目的**: DAWAIシステムの主要処理フローとコンポーネント間連携を理解する
**関連文書**: `specs/architecture/logical/L1_system.md`, `specs/requirements/functional/L1_index.md`

## 🏗️ システムアーキテクチャフロー概要

DAWAIは React フロントエンド + FastAPI バックエンド + AI統合ハブの3層構成で、リアルタイム音楽制作を実現します。

### 主要システムコンポーネント
- **React Frontend**: ユーザーインターフェース・音声処理 (Tone.js)
- **FastAPI Backend**: AI統合・API管理
- **AI Hub**: Claude/OpenAI/Gemini 統合管理
- **Audio Engine**: Tone.js ベース音声合成エンジン

## 🚀 Core System Sequences

### SF-001: システム起動・初期化フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant React as React Frontend
    participant API as FastAPI Backend
    participant Audio as Tone.js Engine
    participant AI as AI Hub

    Note over User, AI: システム起動プロセス

    User->>React: アプリケーション起動
    React->>React: React 18.3.1 初期化
    React->>Audio: Tone.js 15.1.22 ロード
    Audio->>Audio: AudioContext 初期化

    React->>API: 接続性チェック (FastAPI)
    API->>AI: AI サービス状態確認
    AI->>API: Claude/OpenAI/Gemini ステータス
    API->>React: システム状態レスポンス

    React->>User: DAW インターフェース表示
    React->>Audio: 音声エンジン準備完了

    Note over User, AI: 制作環境準備完了 (~3秒)
```

### SF-002: AI チャット統合フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant React as React Frontend
    participant API as FastAPI Backend
    participant Claude as Claude API
    participant OpenAI as OpenAI API
    participant Gemini as Gemini API

    Note over User, Gemini: マルチAI対話システム

    User->>React: AI アシスタント起動
    React->>API: チャット セッション開始

    User->>React: AI モデル選択 (Claude/GPT/Gemini)
    React->>API: モデル切り替え要求

    alt Claude選択時
        API->>Claude: Claude API 認証・接続
        Claude->>API: 音楽制作専門応答
    else OpenAI選択時
        API->>OpenAI: OpenAI API 認証・接続
        OpenAI->>API: 創作支援応答
    else Gemini選択時
        API->>Gemini: Gemini API 認証・接続
        Gemini->>API: 多角的分析応答
    end

    API->>React: AI 応答データ
    React->>User: チャット UI 表示

    Note over User, Gemini: ~2秒でAI応答提供
```

### SF-003: 音声処理フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant React as React Frontend
    participant Tone as Tone.js Engine
    participant Audio as unifiedAudioSystem
    participant MIDI as MidiEditor

    Note over User, MIDI: リアルタイム音声制作フロー

    User->>React: 音声制作開始
    React->>Audio: 統合音声システム起動
    Audio->>Tone: Tone.js エンジン初期化

    User->>MIDI: MIDI ノート入力
    MIDI->>Audio: MIDI データ変換
    Audio->>Tone: 音声合成指示
    Tone->>User: リアルタイム音声出力 (~30ms遅延)

    User->>React: マルチトラック追加
    React->>Audio: トラック管理更新
    Audio->>Tone: 新トラック音声合成

    User->>React: ミキシング調整
    React->>Audio: ボリューム・エフェクト適用
    Audio->>Tone: リアルタイム音声処理
    Tone->>User: 最終音声出力

    Note over User, MIDI: 遅延30ms以下の高応答性
```

### SF-004: プロジェクト管理フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant React as React Frontend
    participant Storage as LocalStorage
    participant Export as Export Engine
    participant Import as Import Engine

    Note over User, Import: プロジェクト ライフサイクル管理

    User->>React: 新規プロジェクト作成
    React->>Storage: プロジェクト データ初期化
    Storage->>React: プロジェクト ID 発行

    User->>React: 楽曲制作・編集
    React->>Storage: 自動保存 (30秒間隔)
    Storage->>React: 保存状態確認

    User->>React: プロジェクト保存
    React->>Storage: プロジェクト永続化
    Storage->>React: 保存完了通知

    alt エクスポート時
        User->>React: エクスポート要求
        React->>Export: MIDI/WAV/プロジェクト出力
        Export->>User: ファイル ダウンロード
    else インポート時
        User->>React: ファイル選択
        React->>Import: ファイル解析・変換
        Import->>React: プロジェクト データ復元
    end

    Note over User, Import: データ損失なし の安全設計
```

## 🔧 Technical System Sequences

### SF-005: DiffSinger 歌声合成フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant React as React Frontend
    participant API as FastAPI Backend
    participant DiffSinger as DiffSinger AI
    participant Audio as Audio Engine

    Note over User, Audio: AI歌声合成処理

    User->>React: 歌詞・メロディ入力
    React->>API: 歌声合成リクエスト
    API->>DiffSinger: 歌詞・MIDI データ送信

    DiffSinger->>DiffSinger: AI歌声モデル処理
    DiffSinger->>API: 歌声音声データ生成
    API->>React: 合成音声データ

    React->>Audio: 歌声トラック追加
    Audio->>User: 歌声付き楽曲再生

    Note over User, Audio: 高品質AI歌声の自動生成
```

### SF-006: Ghost Text 補完フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant React as React Frontend
    participant API as FastAPI Backend
    participant Ghost as Ghost Text AI

    Note over User, Ghost: テキスト入力支援システム

    User->>React: 歌詞入力開始
    React->>API: テキスト補完要求
    API->>Ghost: 部分テキスト解析

    Ghost->>Ghost: 文脈理解・予測
    Ghost->>API: 補完候補生成
    API->>React: 補完テキスト候補

    React->>User: リアルタイム補完表示
    User->>React: 補完採用・修正
    React->>API: 学習データ フィードバック

    Note over User, Ghost: 創作支援の知的入力システム
```

## ⚡ パフォーマンス フロー

### SF-007: 最適化・応答性確保フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant React as React Frontend
    participant Worker as Web Worker
    participant Cache as Cache System
    participant Monitor as Performance Monitor

    Note over User, Monitor: システム性能最適化

    User->>React: 重い処理要求
    React->>Worker: バックグラウンド処理移譲
    Worker->>Worker: CPU集約タスク実行

    React->>Cache: 計算結果キャッシュ
    Cache->>React: 高速データ取得

    Monitor->>Monitor: 性能メトリクス収集
    Monitor->>React: 最適化推奨提案
    React->>User: スムーズな操作体験

    Note over User, Monitor: 応答性30ms以下維持
```

## 📊 システム品質指標

### 性能目標
```mermaid
sequenceDiagram
    participant Latency as 音声遅延
    participant Response as AI応答
    participant Memory as メモリ使用
    participant Reliability as 信頼性

    Latency->>Latency: <30ms (目標達成)
    Response->>Response: <3秒 (目標達成)
    Memory->>Memory: <512MB (目標達成)
    Reliability->>Reliability: >99.5% (監視中)
```

## 🔒 セキュリティ・統合フロー

### SF-008: API セキュリティ フロー

```mermaid
sequenceDiagram
    participant Client as React Client
    participant API as FastAPI API
    participant Auth as 認証システム
    participant AI as AI Services

    Note over Client, AI: セキュア API 統合

    Client->>API: API リクエスト
    API->>Auth: 認証・認可チェック
    Auth->>API: アクセス許可

    API->>AI: 外部AI API 呼び出し
    AI->>API: セキュア レスポンス
    API->>Client: フィルタ済み データ

    Note over Client, AI: エンドツーエンド セキュリティ
```

---

**次のレベル**: コンポーネントレベルの詳細フローは `specs/design/sequences/L2_component_flows.md` を参照してください。

**関連文書**:
- `specs/architecture/logical/L1_system.md` - システム全体アーキテクチャ
- `specs/requirements/functional/L1_index.md` - 機能要件詳細
- `specs/design/sequences/L0_business_flows.md` - ビジネスフロー概要