# DAWAI システムアーキテクチャ (L1)

**Document ID**: LA-L1-SYSTEM-001
**Version**: 2.0.0
**Last Updated**: 2025-01-22
**Parent**: [システム概要](../../overview/index.md)
**Implementation Status**: ✅ Based on Current Codebase

## 🏗️ システム全体アーキテクチャ

DAWAIは、React フロントエンド + FastAPI バックエンドのWeb アプリケーションアーキテクチャを採用し、AI統合により音楽制作を支援するシステムです。

### L1 システム構成図

```mermaid
graph TB
    subgraph "ユーザー環境"
        Browser[ウェブブラウザ]
        Audio[オーディオデバイス]
        MIDI[MIDI機器]
    end

    subgraph "フロントエンド層 (React)"
        subgraph "プレゼンテーション層"
            UI[React コンポーネント]
            Router[React Router]
            State[状態管理]
        end

        subgraph "ビジネスロジック層"
            AudioEngine[音声処理エンジン]
            AIClient[AI統合クライアント]
            ProjectManager[プロジェクト管理]
        end

        subgraph "データアクセス層"
            LocalStorage[ローカルストレージ]
            IndexedDB[IndexedDB]
            APIClient[API クライアント]
        end
    end

    subgraph "バックエンド層 (FastAPI)"
        subgraph "API Gateway"
            FastAPI[FastAPI Server]
            WebSocket[WebSocket Hub]
            CORS[CORS管理]
        end

        subgraph "アプリケーション層"
            AIAgent[AI統合エージェント]
            DiffSinger[歌声合成サービス]
            GhostText[テキスト補完]
        end

        subgraph "インフラ層"
            FileSystem[ファイルシステム]
            Models[AIモデル]
            Cache[キャッシュ]
        end
    end

    subgraph "外部サービス"
        Claude[Claude API]
        OpenAI[OpenAI API]
        Gemini[Gemini API]
    end

    Browser --> UI
    Audio --> AudioEngine
    MIDI --> AudioEngine

    UI --> AudioEngine
    UI --> AIClient
    UI --> ProjectManager

    AudioEngine --> LocalStorage
    AIClient --> APIClient
    ProjectManager --> IndexedDB

    APIClient --> FastAPI
    APIClient --> WebSocket

    FastAPI --> AIAgent
    WebSocket --> AIAgent
    FastAPI --> DiffSinger
    FastAPI --> GhostText

    AIAgent --> Claude
    AIAgent --> OpenAI
    AIAgent --> Gemini

    DiffSinger --> Models
    GhostText --> Models
    AIAgent --> Cache

    style FastAPI fill:#e1f5fe
    style AudioEngine fill:#fff3e0
    style AIAgent fill:#e8f5e9
    style Browser fill:#fce4ec
```

## 🌐 フロントエンド アーキテクチャ

### React アプリケーション構成
**実装ベース**: `frontend/src/` ディレクトリ

```mermaid
graph TB
    subgraph "React フロントエンド"
        subgraph "エントリーポイント"
            Main[main.jsx]
            App[App.jsx]
            Index[index.html]
        end

        subgraph "コンポーネント層"
            UIComponents[UIコンポーネント]
            FeatureComponents[機能コンポーネント]
            LayoutComponents[レイアウト]
        end

        subgraph "ビジネスロジック"
            Hooks[カスタムフック]
            Utils[ユーティリティ]
            Services[サービス]
        end

        subgraph "状態管理"
            LocalState[ローカル状態]
            Context[React Context]
            Persistence[永続化]
        end

        subgraph "外部依存"
            ToneJS[Tone.js]
            WebAudio[Web Audio API]
            TensorFlow[TensorFlow.js]
        end
    end

    Main --> App
    App --> UIComponents
    App --> FeatureComponents

    UIComponents --> Hooks
    FeatureComponents --> Hooks
    Hooks --> Utils
    Utils --> Services

    Services --> LocalState
    LocalState --> Context
    Context --> Persistence

    Hooks --> ToneJS
    Utils --> WebAudio
    Services --> TensorFlow

    style App fill:#e1f5fe
    style Hooks fill:#fff3e0
    style ToneJS fill:#e8f5e9
```

### 主要コンポーネント階層

| レベル | コンポーネント | ファイル | 責務 |
|--------|----------------|----------|------|
| **L1** | App.jsx | `App.jsx` (1300+ lines) | アプリケーション全体統制 |
| **L2** | ArrangementView | `ArrangementView.jsx` | マルチトラック管理 |
| **L2** | EnhancedMidiEditor | `EnhancedMidiEditor.jsx` | MIDI編集 |
| **L2** | DrumTrack | `DrumTrack/DrumTrack.jsx` | ドラム編集 |
| **L2** | AIAssistantChatBox | `AIAssistantChatBox.jsx` | AI対話UI |
| **L3** | MidiEditorCanvas | `MIDIEditor/MidiEditorCanvas.jsx` | MIDI描画 |
| **L3** | DrumTrackGrid | `DrumTrack/DrumTrackGrid.jsx` | ドラムグリッド |

### 技術スタック詳細

#### 基盤技術
- **React**: 18.3.1 (関数コンポーネント + Hooks)
- **Vite**: 6.3.5 (ビルドツール)
- **TypeScript**: 一部導入 (段階的移行中)

#### UI フレームワーク
- **Tailwind CSS**: 4.1.7 (スタイリング)
- **Shadcn/ui**: コンポーネントライブラリ
- **Radix UI**: アクセシブルなプリミティブ

#### 音声・メディア処理
- **Tone.js**: 15.1.22 (音声合成・処理)
- **Web Audio API**: ブラウザネイティブ音声
- **Canvas API**: 波形・MIDI可視化

#### AI・機械学習
- **TensorFlow.js**: 2.8.6 (クライアントサイド推論)
- **Magenta**: 1.23.1 (音楽AI機能)

## 🔧 バックエンド アーキテクチャ

### FastAPI アプリケーション構成
**実装ベース**: `backend/` ディレクトリ

```mermaid
graph TB
    subgraph "FastAPI バックエンド"
        subgraph "エントリーポイント"
            MainPy[main.py]
            AgentMain[ai_agent/main.py]
            Config[設定管理]
        end

        subgraph "API層"
            ChatAPI[Chat API]
            DiffAPI[DiffSinger API]
            GhostAPI[Ghost Text API]
            HealthAPI[Health Check]
        end

        subgraph "サービス層"
            AIService[AI統合サービス]
            SynthService[歌声合成サービス]
            TextService[テキスト補完]
            CacheService[キャッシュサービス]
        end

        subgraph "モデル管理"
            ModelManager[モデル管理]
            VocoderManager[ボコーダー管理]
            CacheManager[キャッシュ管理]
        end

        subgraph "外部API統合"
            ClaudeClient[Claude クライアント]
            OpenAIClient[OpenAI クライアント]
            GeminiClient[Gemini クライアント]
        end
    end

    MainPy --> ChatAPI
    AgentMain --> AIService

    ChatAPI --> AIService
    DiffAPI --> SynthService
    GhostAPI --> TextService

    AIService --> ClaudeClient
    AIService --> OpenAIClient
    AIService --> GeminiClient

    SynthService --> ModelManager
    TextService --> ModelManager
    CacheService --> CacheManager

    style MainPy fill:#e1f5fe
    style AIService fill:#fff3e0
    style ModelManager fill:#e8f5e9
```

### API エンドポイント構成

#### REST API エンドポイント
```http
# AI チャット
POST /api/chat/stream          # ストリーミングチャット
POST /api/chat/simple          # シンプルチャット

# DiffSinger 歌声合成
POST /diffsinger/synthesize    # 歌声合成
GET  /diffsinger/models        # モデル一覧
POST /diffsinger/cache/clear   # キャッシュクリア

# Ghost Text
POST /ghost_text/complete      # テキスト補完
POST /ghost_text/analyze       # テキスト解析

# システム
GET  /health                   # ヘルスチェック
GET  /metrics                  # メトリクス
```

#### WebSocket エンドポイント
```http
WS /ws/chat                    # リアルタイムチャット
WS /ws/synthesis              # 歌声合成進捗
WS /ws/collaboration          # コラボレーション（将来）
```

### 技術スタック詳細

#### 基盤技術
- **FastAPI**: 0.104.1 (高性能Webフレームワーク)
- **Python**: 3.11+ (実行環境)
- **Uvicorn**: ASGI サーバー

#### AI・機械学習
- **PyTorch**: DiffSinger モデル実行
- **Transformers**: Hugging Face モデル
- **Google GenerativeAI**: Gemini API
- **OpenAI**: GPT API
- **Anthropic**: Claude API

#### データ・キャッシュ
- **ファイルシステム**: プロジェクト・モデル保存
- **メモリキャッシュ**: 高速アクセス用
- **Redis**: 将来のスケーリング用

## 🔄 データフロー アーキテクチャ

### 主要データフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as React UI
    participant API as FastAPI
    participant AI as AI Service
    participant Audio as Audio Engine

    User->>UI: 楽曲制作開始
    UI->>Audio: 音声エンジン初期化
    Audio-->>UI: 準備完了

    User->>UI: AI相談要求
    UI->>API: チャットリクエスト
    API->>AI: AI処理依頼
    AI-->>API: ストリーム応答
    API-->>UI: リアルタイム表示

    User->>UI: MIDI編集
    UI->>Audio: 音声合成
    Audio-->>UI: 再生

    User->>UI: 歌声合成要求
    UI->>API: DiffSinger要求
    API->>AI: 歌声生成
    AI-->>API: 音声データ
    API-->>UI: WAVファイル
    UI->>Audio: 歌声再生

    User->>UI: プロジェクト保存
    UI->>UI: ローカル保存
```

### データ永続化戦略

#### フロントエンド (クライアントサイド)
```javascript
// データ永続化実装例
const persistenceStrategy = {
  // 軽量データ: LocalStorage
  settings: localStorage,
  userPreferences: localStorage,

  // 大容量データ: IndexedDB
  projectData: indexedDB,
  audioSamples: indexedDB,
  midiData: indexedDB,

  // 一時データ: SessionStorage
  currentSession: sessionStorage,
  tempSettings: sessionStorage
}
```

#### バックエンド (サーバーサイド)
```python
# データ管理実装例
class DataManager:
    def __init__(self):
        # AIモデル: ファイルシステム
        self.model_storage = "/app/models/"

        # キャッシュ: メモリ
        self.cache = {}

        # ログ: ファイル
        self.log_storage = "/app/logs/"

        # 設定: 環境変数
        self.config = os.environ
```

## 🔐 セキュリティ アーキテクチャ

### セキュリティ層

```mermaid
graph TB
    subgraph "セキュリティ構成"
        subgraph "フロントエンド セキュリティ"
            CSP[Content Security Policy]
            HTTPS[HTTPS強制]
            SRI[Subresource Integrity]
        end

        subgraph "API セキュリティ"
            CORSPolicy[CORS設定]
            RateLimit[レート制限]
            InputValidation[入力検証]
        end

        subgraph "データ セキュリティ"
            APIKeyManagement[APIキー管理]
            DataEncryption[データ暗号化]
            AccessControl[アクセス制御]
        end

        subgraph "インフラ セキュリティ"
            NetworkSecurity[ネットワークセキュリティ]
            ContainerSecurity[コンテナセキュリティ]
            Monitoring[監視・ログ]
        end
    end

    CSP --> CORSPolicy
    HTTPS --> RateLimit
    SRI --> InputValidation

    CORSPolicy --> APIKeyManagement
    RateLimit --> DataEncryption
    InputValidation --> AccessControl

    APIKeyManagement --> NetworkSecurity
    DataEncryption --> ContainerSecurity
    AccessControl --> Monitoring

    style CORSPolicy fill:#ffebee
    style APIKeyManagement fill:#fff3e0
    style NetworkSecurity fill:#e8f5e9
```

### セキュリティ実装状況

#### 🔴 高優先度対応必要
- **CORS設定**: `allow_origins=["*"]` → 適切なオリジン制限
- **ホスト設定**: `host="0.0.0.0"` → 適切なホスト制限
- **APIキー保護**: 環境変数未設定時のハンドリング強化

#### 🟡 中優先度改善推奨
- **レート制限**: API乱用防止
- **入力検証**: XSS・インジェクション対策
- **HTTPS強制**: 本番環境でのHTTPS必須化

#### ✅ 実装済み
- **環境変数**: APIキーの環境変数管理
- **FastAPI検証**: 自動入力検証
- **CORS基盤**: CORS機能は実装済み（設定要調整）

## 📊 パフォーマンス アーキテクチャ

### パフォーマンス最適化戦略

```mermaid
graph LR
    subgraph "パフォーマンス最適化"
        subgraph "フロントエンド最適化"
            CodeSplitting[コード分割]
            LazyLoading[遅延読み込み]
            Memoization[メモ化]
            VirtualDOM[仮想DOM最適化]
        end

        subgraph "音声処理最適化"
            AudioBuffer[音声バッファリング]
            WebWorker[WebWorker活用]
            Streaming[ストリーミング処理]
            Compression[音声圧縮]
        end

        subgraph "バックエンド最適化"
            AsyncIO[非同期IO]
            ModelCache[モデルキャッシュ]
            BatchProcess[バッチ処理]
            LoadBalance[負荷分散]
        end

        subgraph "ネットワーク最適化"
            CDN[CDN配信]
            Gzip[Gzip圧縮]
            Caching[HTTPキャッシュ]
            Prefetch[プリフェッチ]
        end
    end

    CodeSplitting --> AudioBuffer
    LazyLoading --> WebWorker
    Memoization --> Streaming
    VirtualDOM --> Compression

    AudioBuffer --> AsyncIO
    WebWorker --> ModelCache
    Streaming --> BatchProcess
    Compression --> LoadBalance

    AsyncIO --> CDN
    ModelCache --> Gzip
    BatchProcess --> Caching
    LoadBalance --> Prefetch

    style AudioBuffer fill:#e1f5fe
    style AsyncIO fill:#fff3e0
    style CDN fill:#e8f5e9
```

### パフォーマンス指標

| 領域 | 目標 | 現状 | 改善アクション |
|------|------|------|----------------|
| **初回ロード** | <5秒 | ~3秒 | ✅ 目標達成 |
| **音声遅延** | <50ms | ~30ms | ✅ 目標達成 |
| **AI応答開始** | <3秒 | ~2秒 | ✅ 目標達成 |
| **メモリ使用量** | <512MB | ~300MB | ✅ 目標達成 |
| **音声アセット** | 最適化要 | 54MB | 🔄 圧縮・CDN化 |

## 🔗 関連ドキュメント

### 上位概要
- **[L0: システム概要](../../overview/index.md)** - ビジネス・技術概要
- **[L0: ビジネスコンテキスト](../../overview/business_context.md)** - 市場・競合分析

### 同レベル要件
- **[L1: 機能要件一覧](../../requirements/functional/L1_index.md)** - システム機能要件
- **[L1: 非機能要件](../../requirements/non-functional/)** - パフォーマンス・セキュリティ要件

### 下位詳細
- **[L2: フロントエンド構成](L2_frontend/)** - React詳細アーキテクチャ
- **[L2: バックエンド構成](L2_backend/)** - FastAPI詳細アーキテクチャ
- **[L3: コンポーネント設計](L3_components/)** - 詳細コンポーネント設計

### 設計詳細
- **[L1: システムフロー](../../design/sequences/L1_system/)** - 主要処理フロー
- **[L1: データフロー](../../design/flows/L1_system/)** - データ処理フロー
- **[L1: デプロイメント](../physical/L1_deployment.md)** - インフラ・デプロイ構成

---

**実装ベースファイル**:
- **フロントエンド**: `frontend/src/` (162ファイル、React + Vite構成)
- **バックエンド**: `backend/` (3ファイル、FastAPI + AI統合)
- **設定**: `vite.config.js`, `package.json`, `requirements.txt`