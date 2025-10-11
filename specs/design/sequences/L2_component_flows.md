# L2 コンポーネントフローシーケンス - DAWAI

**階層レベル**: L2 (コンポーネント)
**対象読者**: 開発者、専門領域担当者
**目的**: DAWAI主要コンポーネントの詳細処理フローと内部連携を理解する
**関連文書**: `specs/requirements/functional/L2_audio_processing/`, `specs/requirements/functional/L2_ai_integration/`

## 🎵 Audio Processing Component Flows

### CF-001: MIDI編集コンポーネントフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Editor as EnhancedMidiEditor
    participant Canvas as MidiEditorCanvas
    participant Data as MIDI Data Model
    participant Audio as unifiedAudioSystem

    Note over User, Audio: ピアノロール MIDI編集 (1100+行実装)

    User->>Editor: MIDI エディタ起動
    Editor->>Canvas: Canvas API 初期化
    Canvas->>Data: 既存 MIDI データ読み込み
    Data->>Canvas: ノート配置データ

    User->>Canvas: ノート描画・編集操作
    Canvas->>Canvas: マウス・キーボード イベント処理
    Canvas->>Data: MIDI ノート データ更新
    Data->>Audio: リアルタイム音声合成指示

    Audio->>User: 即座音声フィードバック
    User->>Editor: 編集継続・調整

    loop リアルタイム編集
        Canvas->>Data: 増分更新
        Data->>Audio: 差分音声合成
        Audio->>User: 遅延30ms以下再生
    end

    Note over User, Audio: 高応答性 MIDI 編集環境
```

### CF-002: マルチトラック管理フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Arrangement as ArrangementView
    participant Track as Track Manager
    participant Mixer as Audio Mixer
    participant Tone as Tone.js Engine

    Note over User, Tone: 複数トラック同期再生システム

    User->>Arrangement: トラック追加要求
    Arrangement->>Track: 新規トラック作成
    Track->>Mixer: ミキサー チャンネル追加
    Mixer->>Tone: Tone.js パート初期化

    User->>Arrangement: 楽器・音色選択
    Arrangement->>Track: トラック設定更新
    Track->>Tone: シンセサイザー設定

    User->>Arrangement: 再生開始
    Arrangement->>Track: 全トラック同期再生
    Track->>Mixer: 各トラック音声送信
    Mixer->>Tone: ミックス音声合成
    Tone->>User: 統合音声出力

    User->>Arrangement: トラック ボリューム調整
    Arrangement->>Mixer: リアルタイム ミキシング
    Mixer->>Tone: 音量バランス適用
    Tone->>User: 調整後音声出力

    Note over User, Tone: 同期精度±1ms の高精度制御
```

### CF-003: ドラムシーケンサーフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Drum as DrumTrack Component
    participant Grid as Grid Sequencer
    participant Samples as Drum Samples
    participant Scheduler as Audio Scheduler

    Note over User, Scheduler: グリッドベース ドラムパターン制作

    User->>Drum: ドラムトラック起動
    Drum->>Grid: 16ステップ グリッド初期化
    Grid->>Samples: ドラムサンプル ロード
    Samples->>Grid: キック・スネア・ハイハット準備

    User->>Grid: ステップ入力 (クリック・タップ)
    Grid->>Grid: パターン データ更新
    Grid->>Scheduler: 再生スケジュール設定

    User->>Drum: パターン再生開始
    Drum->>Scheduler: BPM同期再生指示
    Scheduler->>Samples: タイミング制御サンプル再生
    Samples->>User: リズム パターン出力

    User->>Grid: リアルタイム編集
    Grid->>Scheduler: 動的スケジュール更新
    Scheduler->>User: 編集即反映再生

    Note over User, Scheduler: 1ms精度 リズム制御
```

## 🤖 AI Integration Component Flows

### CF-004: マルチAI切り替えフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Selector as ModelSelector
    participant Hub as AI Hub
    participant Claude as Claude API
    participant OpenAI as OpenAI API
    participant Gemini as Gemini API

    Note over User, Gemini: 動的AI プロバイダー切り替え

    User->>Selector: AI モデル選択 UI
    Selector->>Hub: 利用可能モデル確認
    Hub->>Selector: Claude/GPT/Gemini ステータス

    User->>Selector: Claude 選択
    Selector->>Hub: Claude API 切り替え指示
    Hub->>Claude: 接続・認証確認
    Claude->>Hub: 接続ステータス OK
    Hub->>Selector: 切り替え完了通知

    User->>Selector: 音楽制作質問投稿
    Selector->>Hub: Claude に質問転送
    Hub->>Claude: 専門的音楽知識要求
    Claude->>Hub: 音楽理論・創作アドバイス
    Hub->>User: 高品質制作支援提供

    alt モデル切り替え時
        User->>Selector: OpenAI 切り替え
        Selector->>Hub: API プロバイダー変更
        Hub->>OpenAI: 接続切り替え
        Hub->>User: シームレス移行完了
    end

    Note over User, Gemini: 0.5秒以下でのAI切り替え
```

### CF-005: DiffSinger歌声合成フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Singer as DiffSingerTrack
    parameter Lyrics as 歌詞エディタ
    participant API as FastAPI Backend
    participant DiffSinger as DiffSinger AI
    participant Audio as Audio Pipeline

    Note over User, Audio: AI歌声合成パイプライン

    User->>Singer: DiffSinger トラック作成
    Singer->>Lyrics: 歌詞入力 UI 表示
    User->>Lyrics: 歌詞・発音記号入力

    User->>Singer: メロディ MIDI 指定
    Singer->>API: 歌詞・MIDI データ送信
    API->>DiffSinger: 歌声合成要求

    DiffSinger->>DiffSinger: ニューラル歌声モデル処理
    DiffSinger->>API: 高品質歌声 WAV 生成
    API->>Singer: 合成音声データ受信

    Singer->>Audio: 歌声トラック統合
    Audio->>User: 楽曲＋歌声 統合再生

    User->>Singer: 歌声調整 (ピッチ・タイミング)
    Singer->>API: パラメータ調整要求
    API->>DiffSinger: 再合成実行
    DiffSinger->>User: 調整後歌声提供

    Note over User, Audio: 人間レベル歌声品質実現
```

### CF-006: Ghost Text補完フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Panel as GhostTextPanel
    participant API as FastAPI Backend
    participant Ghost as Ghost Text AI
    participant Context as 文脈エンジン

    Note over User, Context: インテリジェント テキスト補完

    User->>Panel: 歌詞エディタでタイピング開始
    Panel->>API: 部分テキスト・文脈送信
    API->>Ghost: テキスト解析要求

    Ghost->>Context: 音楽・歌詞文脈理解
    Context->>Ghost: ジャンル・感情分析結果
    Ghost->>API: 補完候補複数生成

    API->>Panel: 候補テキスト配信
    Panel->>User: リアルタイム補完表示

    User->>Panel: Tab/Enter で候補採用
    Panel->>API: 採用フィードバック送信
    API->>Ghost: 学習データ更新

    loop 継続入力
        User->>Panel: 次の文字入力
        Panel->>Ghost: 動的補完更新
        Ghost->>User: 精度向上した予測提供
    end

    Note over User, Context: 創作支援 知的入力システム
```

## 🎛️ UI Component Flows

### CF-007: リアルタイムビジュアライゼーション

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Visual as Visualization
    participant Canvas as Canvas Renderer
    participant Audio as Audio Analysis
    participant Spectrum as Spectrum Analyzer

    Note over User, Spectrum: 音声・MIDI リアルタイム可視化

    User->>Visual: ビジュアライゼーション起動
    Visual->>Canvas: Canvas 2D/WebGL 初期化
    Canvas->>Audio: 音声解析パイプライン接続

    Audio->>Spectrum: リアルタイム周波数解析
    Spectrum->>Canvas: スペクトラム データ送信
    Canvas->>User: 波形・スペクトラム描画

    User->>Visual: MIDI ノート演奏
    Visual->>Canvas: MIDI イベント可視化
    Canvas->>User: ノート・ピッチ アニメーション

    loop 60FPS 更新
        Audio->>Spectrum: 音声バッファ解析
        Spectrum->>Canvas: 可視化データ更新
        Canvas->>User: スムーズ アニメーション
    end

    Note over User, Spectrum: 60FPS 高品質ビジュアル
```

### CF-008: キーボードショートカットフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Keyboard as useKeyboardShortcuts
    participant Actions as Action Dispatcher
    participant Editor as Active Editor
    participant Audio as Audio Control

    Note over User, Audio: 効率的キーボード操作システム

    User->>Keyboard: キー押下イベント
    Keyboard->>Keyboard: ショートカット パターンマッチ

    alt 再生制御 (Spacebar)
        Keyboard->>Actions: 再生/停止 アクション
        Actions->>Audio: 音声制御実行
        Audio->>User: 再生状態変更
    else 編集操作 (Ctrl+C/V)
        Keyboard->>Actions: コピー/ペースト
        Actions->>Editor: MIDI データ操作
        Editor->>User: 編集結果反映
    else 表示制御 (Tab/Shift+Tab)
        Keyboard->>Actions: フォーカス移動
        Actions->>User: UI フォーカス切り替え
    end

    Keyboard->>Actions: ショートカット履歴更新
    Actions->>User: 操作効率化実現

    Note over User, Audio: キーボード中心の高速制作環境
```

## 📊 Data Flow & State Management

### CF-009: プロジェクト永続化フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Persistence as useMidiPersistence
    participant LocalStorage as LocalStorage
    parameter Sync as Auto Sync
    participant Export as Export Engine

    Note over User, Export: プロジェクト データ永続化システム

    User->>Persistence: プロジェクト作業開始
    Persistence->>LocalStorage: 既存データ復元
    LocalStorage->>User: 前回セッション復元

    User->>Persistence: MIDI・設定変更
    Persistence->>Sync: 変更検知・自動保存開始
    Sync->>LocalStorage: 30秒間隔データ保存
    LocalStorage->>Persistence: 保存完了確認

    User->>Persistence: 手動保存実行
    Persistence->>LocalStorage: 即座完全保存
    LocalStorage->>User: 保存ステータス表示

    User->>Export: プロジェクト エクスポート
    Export->>LocalStorage: 全データ取得
    LocalStorage->>Export: プロジェクトJSON生成
    Export->>User: ファイル ダウンロード提供

    Note over User, Export: データ損失ゼロの安全設計
```

---

**次のレベル**: 実装詳細レベルのフローは `specs/design/sequences/L3_implementation_flows.md` を参照してください。

**関連文書**:
- `specs/requirements/functional/L2_audio_processing/index.md` - 音声処理詳細要件
- `specs/requirements/functional/L2_ai_integration/index.md` - AI統合詳細要件
- `specs/design/sequences/L1_system_flows.md` - システムレベルフロー