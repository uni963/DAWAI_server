# L2 コンポーネント状態遷移図 - DAWAI

**階層レベル**: L2 (コンポーネント)
**対象読者**: 開発者、フロントエンド・バックエンド担当者
**目的**: DAWAIの各コンポーネントの状態遷移ロジックを理解し、実装と整合性を確認する
**関連文書**:
- データフロー図: `specs/design/flows/L1_system/index.md`
- シーケンス図: `specs/design/sequences/L2_component_flows.md`
- アーキテクチャ: `specs/architecture/logical/L2_frontend/index.md`

---

## 📊 設計図アプローチ

このドキュメントは**Diagram-First Approach**に基づき、状態遷移図を中心に構成されています。
各ダイアグラムは実装コードの実際の状態管理ロジックと完全に同期しています。

---

## 🎯 Core Application State Machine

### ST-001: アプリケーション全体状態遷移

```mermaid
stateDiagram-v2
    [*] --> Initializing: アプリ起動

    Initializing --> LoadingAssets: React初期化完了
    LoadingAssets --> InitializingAudio: 音声アセット読み込み
    InitializingAudio --> Ready: AudioContext起動完了

    Ready --> Idle: 待機状態
    Idle --> Playing: 再生ボタン押下
    Idle --> Recording: 録音ボタン押下
    Idle --> Editing: MIDI編集開始

    Playing --> Paused: 一時停止
    Paused --> Playing: 再生再開
    Paused --> Idle: 停止ボタン押下

    Recording --> RecordingComplete: 録音停止
    RecordingComplete --> Idle: 録音データ保存

    Editing --> Idle: 編集完了

    Idle --> Exporting: エクスポート開始
    Exporting --> Idle: エクスポート完了

    Idle --> Error: エラー発生
    Playing --> Error: 再生エラー
    Recording --> Error: 録音エラー
    Exporting --> Error: エクスポートエラー

    Error --> Idle: エラー復旧

    note right of Initializing
        App.jsx: L1-100
        useEffect初期化処理
    end note

    note right of Ready
        isAudioInitialized: true
        AudioContext.state: 'running'
    end note

    note right of Playing
        isPlaying: true
        Transport.state: 'started'
    end note

    note right of Error
        エラーログ記録
        ユーザー通知表示
        LocalStorageから復元試行
    end note
```

**実装状況**: ✅ 100%実装済み

**実装ファイル**:
- `frontend/src/App.jsx` (L150-400): 主要状態管理
- State定義: `App.jsx` (L200-250)

**状態変数**:
```javascript
const [isPlaying, setIsPlaying] = useState(false)
const [isRecording, setIsRecording] = useState(false)
const [isAudioInitialized, setIsAudioInitialized] = useState(false)
```

---

## 🎹 MIDI Editor State Transitions

### ST-002: MIDI編集モード状態遷移

```mermaid
stateDiagram-v2
    [*] --> ViewMode: エディタ起動

    ViewMode --> SelectMode: ノート選択開始
    ViewMode --> DrawMode: ペンツール選択
    ViewMode --> EraseMode: 消しゴムツール選択

    SelectMode --> DraggingNote: ノートドラッグ開始
    SelectMode --> ResizingNote: ノートリサイズ開始
    SelectMode --> MultiSelect: Shift+クリック

    DraggingNote --> SelectMode: ドロップ完了
    ResizingNote --> SelectMode: リサイズ完了
    MultiSelect --> SelectMode: 選択解除

    DrawMode --> AddingNote: クリック
    AddingNote --> DrawMode: ノート追加完了

    EraseMode --> DeletingNote: クリック
    DeletingNote --> EraseMode: ノート削除完了

    SelectMode --> ViewMode: Escキー
    DrawMode --> ViewMode: Escキー
    EraseMode --> ViewMode: Escキー

    ViewMode --> QuantizeMode: Qキー押下
    QuantizeMode --> ViewMode: クオンタイゼーション適用

    ViewMode --> VelocityEditMode: Vキー押下
    VelocityEditMode --> ViewMode: ベロシティ編集完了

    note right of DrawMode
        EnhancedMidiEditor.jsx: L200-300
        ノート追加ロジック
        グリッドスナップ適用
    end note

    note right of SelectMode
        selectedNotes: Note[]
        dragOffset: {x, y}
    end note

    note right of QuantizeMode
        quantizeResolution: 1/16
        全選択ノートに適用
    end note
```

**実装状況**: ✅ 100%実装済み

**実装ファイル**:
- `frontend/src/components/EnhancedMidiEditor.jsx` (L1-800)
- ノート操作: `EnhancedMidiEditor.jsx` (L300-500)

**状態変数**:
```javascript
const [editMode, setEditMode] = useState('select') // 'select' | 'draw' | 'erase'
const [selectedNotes, setSelectedNotes] = useState([])
const [isDragging, setIsDragging] = useState(false)
const [isResizing, setIsResizing] = useState(false)
```

---

## 🤖 AI Assistant Session State

### ST-003: AI対話セッション状態遷移

```mermaid
stateDiagram-v2
    [*] --> Idle: チャットボックス起動

    Idle --> WaitingInput: ユーザー入力待機
    WaitingInput --> ValidatingInput: メッセージ送信

    ValidatingInput --> BuildingContext: 入力検証OK
    ValidatingInput --> Idle: 入力検証NG

    BuildingContext --> ConnectingAPI: コンテキスト構築完了
    ConnectingAPI --> Streaming: API接続成功
    ConnectingAPI --> Error: API接続失敗

    Streaming --> ProcessingChunk: チャンクデータ受信
    ProcessingChunk --> Streaming: 次チャンク待機
    ProcessingChunk --> ResponseComplete: ストリーム終了

    ResponseComplete --> DisplayingResponse: 応答表示
    DisplayingResponse --> Idle: 表示完了

    Error --> RetryAttempt: リトライ判定
    RetryAttempt --> ConnectingAPI: リトライ実行
    RetryAttempt --> DisplayError: リトライ上限到達

    DisplayError --> Idle: エラー通知完了

    Idle --> SwitchingModel: モデル切り替え
    SwitchingModel --> Idle: モデル変更完了

    note right of Streaming
        processingState: 'streaming'
        streamingMessage: 累積テキスト
        streamingPhase: 'thinking' | 'responding'
    end note

    note right of BuildingContext
        projectInfo: プロジェクト情報
        currentTrack: トラック情報
        chatHistory: 対話履歴
    end note

    note right of Error
        エラーコード記録
        フォールバック応答生成
        ユーザー通知
    end note
```

**実装状況**: ✅ 100%実装済み

**実装ファイル**:
- `frontend/src/components/AIassistant/AIAssistantChatBox.jsx` (L40-100)
- ストリーミング処理: `AIAssistantChatBox.jsx` (L400-600)

**状態変数**:
```javascript
const [processingState, setProcessingState] = useState('idle')
// 'idle' | 'streaming' | 'error' | 'complete'

const [streamingMessage, setStreamingMessage] = useState(null)
const [streamingPhase, setStreamingPhase] = useState(null)
// 'thinking' | 'responding' | 'complete'
```

**フェーズ遷移ロジック** (`backend/ai_agent/main.py` L200-250):
```python
# thinking → responding → complete
yield f"data: {json.dumps({'phase': 'thinking'})}\n\n"
# ... AI処理 ...
yield f"data: {json.dumps({'phase': 'responding', 'content': chunk})}\n\n"
# ... ストリーム完了 ...
yield f"data: {json.dumps({'phase': 'complete'})}\n\n"
```

---

## 🎵 Track State Machine

### ST-004: トラック状態遷移

```mermaid
stateDiagram-v2
    [*] --> Created: トラック作成

    Created --> Active: トラック選択
    Active --> Muted: ミュートボタン押下
    Active --> Solo: ソロボタン押下
    Active --> Recording: 録音待機 (Armed)

    Muted --> Active: ミュート解除
    Solo --> Active: ソロ解除
    Recording --> Active: 録音完了

    Active --> Editing: MIDI編集開始
    Editing --> Active: 編集完了

    Active --> Processing: エフェクト適用中
    Processing --> Active: エフェクト適用完了

    Active --> Exporting: トラックエクスポート
    Exporting --> Active: エクスポート完了

    Active --> Archived: トラック非表示
    Archived --> Active: トラック表示

    Active --> Deleted: トラック削除
    Deleted --> [*]

    note right of Muted
        track.muted: true
        unifiedAudioSystem
        .setTrackMuted(trackId, true)
    end note

    note right of Solo
        track.solo: true
        他トラック自動ミュート
    end note

    note right of Recording
        track.armed: true
        録音待機状態
        入力監視開始
    end note
```

**実装状況**: ✅ 100%実装済み

**実装ファイル**:
- `frontend/src/App.jsx` (L500-800): トラック管理ロジック
- トラック構造: `App.jsx` (L69-101)

**状態変数** (各トラックが保持):
```javascript
const createTrack = (id, name, type, subtype, color) => ({
  id,
  name,
  type,
  subtype,
  volume: 75,      // 0-100
  pan: 0,          // -100 ~ +100
  muted: false,    // ミュート状態
  solo: false,     // ソロ状態
  armed: false,    // 録音待機状態
  clips: [],
  effects: [],
  // ...
})
```

---

## 🔊 Audio Context State

### ST-005: Audio Context状態遷移

```mermaid
stateDiagram-v2
    [*] --> Suspended: 初期状態

    Suspended --> Starting: ユーザー操作トリガー
    Starting --> Running: resume()成功
    Starting --> Suspended: resume()失敗

    Running --> Playing: 音声再生開始
    Playing --> Running: 音声再生停止

    Running --> Suspended: ページバックグラウンド化
    Suspended --> Running: ページフォアグラウンド復帰

    Running --> Interrupted: システム割り込み
    Interrupted --> Running: 割り込み解除

    Running --> Closing: AudioContext.close()
    Closing --> Closed: クローズ完了
    Closed --> [*]

    note right of Suspended
        AudioContext.state: 'suspended'
        ユーザー操作待機
        Chrome自動再生ポリシー対応
    end note

    note right of Running
        AudioContext.state: 'running'
        音声処理可能
        unifiedAudioSystem.isInitialized: true
    end note

    note right of Interrupted
        システム音声デバイス変更
        ヘッドホン抜き差し
        自動復旧試行
    end note
```

**実装状況**: ✅ 100%実装済み

**実装ファイル**:
- `frontend/src/utils/unifiedAudioSystem.js` (L29-60): 初期化ロジック
- 状態監視: `unifiedAudioSystem.js` (L35-43)

**状態遷移コード**:
```javascript
// Suspended → Running
if (this.audioContext.state === 'suspended') {
  console.log('🎵 AudioContextが停止状態です。開始中...');
  await this.audioContext.resume();
  console.log('🎵 AudioContext開始完了:', this.audioContext.state);
}
```

---

## 📝 Project Lifecycle State

### ST-006: プロジェクトライフサイクル状態

```mermaid
stateDiagram-v2
    [*] --> New: 新規プロジェクト作成

    New --> Untitled: 初期状態
    Untitled --> Named: プロジェクト名入力
    Named --> Editing: 編集開始

    Editing --> Modified: データ変更検知
    Modified --> AutoSaving: 5秒経過
    AutoSaving --> Saved: LocalStorage保存完了
    Saved --> Editing: 編集継続

    Editing --> ManualSaving: Ctrl+S押下
    ManualSaving --> Saved: 手動保存完了

    Saved --> Exporting: エクスポート開始
    Exporting --> ExportComplete: JSON/Audio出力完了
    ExportComplete --> Saved: エクスポート終了

    Saved --> Loading: プロジェクト再読み込み
    Loading --> Editing: 読み込み完了

    Editing --> Closing: プロジェクトクローズ
    Closing --> ConfirmSave: 未保存変更確認
    ConfirmSave --> ManualSaving: 保存選択
    ConfirmSave --> Discarding: 破棄選択
    Discarding --> [*]

    note right of AutoSaving
        useMidiPersistence.js
        5秒間隔デバウンス
        アイドル時のみ保存
    end note

    note right of Modified
        hasUnsavedChanges: true
        UI に * マーク表示
    end note

    note right of Saved
        hasUnsavedChanges: false
        LocalStorage更新完了
    end note
```

**実装状況**: ✅ 100%実装済み

**実装ファイル**:
- `frontend/src/hooks/useMidiPersistence.js` (L50-150): 自動保存ロジック
- プロジェクト管理: `App.jsx` (L900-1100)

**状態変数**:
```javascript
const [projectInfo, setProjectInfo] = useState({
  name: 'Untitled Project',
  tempo: 120,
  key: 'C',
  timeSignature: '4/4'
})
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
```

**自動保存ロジック** (`useMidiPersistence.js`):
```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    if (hasUnsavedChanges) {
      saveToLocalStorage()
      setHasUnsavedChanges(false)
    }
  }, 5000) // 5秒デバウンス

  return () => clearTimeout(timer)
}, [hasUnsavedChanges])
```

---

## 🎛️ Mixer Channel State

### ST-007: ミキサーチャンネル状態遷移

```mermaid
stateDiagram-v2
    [*] --> Initialized: チャンネル初期化

    Initialized --> Active: 音声入力あり
    Active --> AdjustingVolume: フェーダー操作中
    Active --> AdjustingPan: パン操作中
    Active --> AddingEffect: エフェクト追加

    AdjustingVolume --> Active: フェーダー操作完了
    AdjustingPan --> Active: パン操作完了
    AddingEffect --> EffectActive: エフェクト適用

    EffectActive --> Active: エフェクトOFF
    EffectActive --> ConfiguringEffect: エフェクト設定変更
    ConfiguringEffect --> EffectActive: 設定完了

    Active --> Muted: ミュートON
    Muted --> Active: ミュートOFF

    Active --> Solo: ソロON
    Solo --> Active: ソロOFF

    Active --> Metering: レベルメーター表示
    Metering --> Active: メーター更新

    Active --> Automating: オートメーション記録
    Automating --> Active: オートメーション停止

    note right of AdjustingVolume
        volume: 0-100
        リアルタイム更新
        masterGain.gain.value 反映
    end note

    note right of Solo
        他チャンネル自動ミュート
        Solo解除時に復元
    end note

    note right of Metering
        VUメーター
        ピークホールド
        クリッピング検出
    end note
```

**実装状況**: ✅ 100%実装済み

**実装ファイル**:
- `frontend/src/components/Mixer.jsx`
- 音量制御: `unifiedAudioSystem.js` (L100-140)

**状態変数** (Mixerコンポーネント内):
```javascript
const [channels, setChannels] = useState([])
const [isAdjusting, setIsAdjusting] = useState(false)
const [soloActiveChannels, setSoloActiveChannels] = useState([])
```

---

## 🎤 Recording State Machine

### ST-008: 録音状態遷移

```mermaid
stateDiagram-v2
    [*] --> Idle: 録音機能初期化

    Idle --> Armed: トラック録音待機
    Armed --> CountIn: 録音開始 (カウントイン)
    CountIn --> Recording: カウント完了

    Recording --> RecordingPaused: 一時停止
    RecordingPaused --> Recording: 録音再開
    RecordingPaused --> ProcessingRecording: 録音停止

    Recording --> ProcessingRecording: 録音停止

    ProcessingRecording --> ValidatingData: 録音データ検証
    ValidatingData --> SavingData: データ正常
    ValidatingData --> RecordingError: データ異常

    SavingData --> RecordingComplete: 保存完了
    RecordingComplete --> Idle: 次録音待機

    RecordingError --> Idle: エラー通知

    note right of CountIn
        カウントイン: 1小節
        メトロノーム再生
        ユーザー準備時間
    end note

    note right of Recording
        リアルタイム入力監視
        MIDI/Audio バッファリング
        時間同期 (Transport)
    end note

    note right of ValidatingData
        データ欠損チェック
        タイミング検証
        ノイズ除去
    end note
```

**実装状況**: 🔄 80%実装済み (カウントイン機能は今後実装)

**実装ファイル**:
- 録音ロジック: `App.jsx` (L600-700)
- 音声入力: `useMidiAudio.js` (L250-350)

**状態変数**:
```javascript
const [isRecording, setIsRecording] = useState(false)
const [recordingTrackId, setRecordingTrackId] = useState(null)
const [recordedData, setRecordedData] = useState([])
```

---

## 🌐 Backend API State

### ST-009: バックエンドAPI状態遷移

```mermaid
stateDiagram-v2
    [*] --> Starting: FastAPI起動

    Starting --> Initializing: 環境変数読み込み
    Initializing --> ConnectingAI: AI API接続試行
    ConnectingAI --> Ready: 全AI接続成功
    ConnectingAI --> PartialReady: 一部AI接続失敗

    Ready --> Listening: リクエスト待機
    PartialReady --> Listening: リクエスト待機

    Listening --> ValidatingRequest: リクエスト受信
    ValidatingRequest --> RoutingRequest: 検証OK
    ValidatingRequest --> RejectingRequest: 検証NG

    RoutingRequest --> ProcessingClaude: Claude選択
    RoutingRequest --> ProcessingOpenAI: OpenAI選択
    RoutingRequest --> ProcessingGemini: Gemini選択

    ProcessingClaude --> Streaming: ストリーム応答
    ProcessingOpenAI --> Streaming: ストリーム応答
    ProcessingGemini --> Streaming: ストリーム応答

    Streaming --> ResponseComplete: ストリーム完了
    ResponseComplete --> Listening: 次リクエスト待機

    RejectingRequest --> Listening: エラー応答送信

    ProcessingClaude --> APIError: API呼び出し失敗
    ProcessingOpenAI --> APIError: API呼び出し失敗
    ProcessingGemini --> APIError: API呼び出し失敗

    APIError --> Listening: エラー応答送信

    note right of Ready
        全AIサービス利用可能
        - Claude API
        - OpenAI API
        - Gemini API
    end note

    note right of Streaming
        Server-Sent Events (SSE)
        チャンク単位で送信
        phase: thinking/responding
    end note

    note right of APIError
        リトライロジック (最大3回)
        フォールバック応答生成
        エラーログ記録
    end note
```

**実装状況**: ✅ 100%実装済み

**実装ファイル**:
- `backend/ai_agent/main.py` (L20-100): FastAPI初期化
- API接続: `main.py` (L100-200)
- ストリーミング: `main.py` (L200-400)

**状態管理**:
```python
# AI接続状態
class StreamingAIModelManager:
    def __init__(self):
        self.default_api_keys = DEFAULT_API_KEYS
        # 各APIの接続状態を内部管理
```

---

## 📊 実装状況サマリー

| 状態遷移図 | 実装率 | 主要実装ファイル | 状態変数数 | 備考 |
|---|---|---|---|---|
| ST-001: アプリ全体 | ✅ 100% | App.jsx | 3 | 完全実装 |
| ST-002: MIDI編集 | ✅ 100% | EnhancedMidiEditor.jsx | 4 | 全編集モード対応 |
| ST-003: AI対話 | ✅ 100% | AIAssistantChatBox.jsx | 3 | ストリーミング完全対応 |
| ST-004: トラック | ✅ 100% | App.jsx | 6 (各トラック) | Mute/Solo完全実装 |
| ST-005: AudioContext | ✅ 100% | unifiedAudioSystem.js | 1 | ブラウザAPI準拠 |
| ST-006: プロジェクト | ✅ 100% | useMidiPersistence.js | 2 | 自動保存5秒間隔 |
| ST-007: ミキサー | ✅ 100% | Mixer.jsx | 3 | リアルタイム制御 |
| ST-008: 録音 | 🔄 80% | App.jsx, useMidiAudio.js | 3 | カウントイン未実装 |
| ST-009: バックエンド | ✅ 100% | main.py | - | 3AI対応完了 |

**全体実装完了度**: 98% ✅

---

## 🔧 状態管理パターン

### React State Management
```javascript
// useState: コンポーネントローカル状態
const [isPlaying, setIsPlaying] = useState(false)

// useRef: 再レンダリング不要な状態
const volumeRef = useRef(0.7)

// Custom Hooks: 状態ロジックの再利用
const { playNote, stopNote } = useMidiAudio()
const { saveProject, loadProject } = useMidiPersistence()
```

### Global State (window object)
```javascript
// 音声システム: グローバルシングルトン
window.unifiedAudioSystem = new UnifiedAudioSystem()

// AI エンジン: グローバルシングルトン
window.aiAgentEngine = aiAgentEngine
```

---

## 🔗 関連ドキュメント

### 設計図シリーズ
- **データフロー図**: `specs/design/flows/L1_system/index.md` (7フロー完成)
- **シーケンス図**: `specs/design/sequences/L2_component_flows.md` (31フロー完成)
- **クラス図**: `specs/design/classes/L2_component/index.md` (次作成予定)

### アーキテクチャ
- `specs/architecture/logical/L2_frontend/index.md` - React状態管理詳細
- `specs/architecture/logical/L2_backend/index.md` - FastAPI状態管理

### 要件定義
- `specs/requirements/functional/L2_ui_interaction/index.md` - UI状態要件
- `specs/requirements/non_functional/performance.md` - 状態更新パフォーマンス要件

---

**最終更新**: 2025-01-22
**バージョン**: 1.0.0
**ステータス**: ✅ 実装完了・ドキュメント同期済み
