# DAWAI Server - プロジェクト構成

このドキュメントは、DAWAI Serverプロジェクトの完全なファイル構造を示しています。
サーバーデプロイ時にはこのファイル構成でうまくいきました。

最終更新日: 2025年10月12日

---

## 📁 ルートディレクトリ

```
DAWAI_server/
├── backend/                    # バックエンドアプリケーション
├── frontend/                   # フロントエンドアプリケーション
├── build.sh                    # ビルドスクリプト
├── LICENSE                     # ライセンスファイル
├── main.py                     # メインPythonファイル
├── nixpacks.toml              # Nixpacks設定
├── Procfile                    # プロセス定義ファイル
├── README.md                   # プロジェクト README
├── requirements.txt            # Python依存関係
└── runtime.txt                 # ランタイム指定
```

---

## 🔧 Backend (`backend/`)

```
backend/
├── ai_agent/
│   ├── __init__.py
│   └── main.py                # AI エージェントメインロジック
└── requirements.txt           # バックエンド依存関係
```

---

## 🎨 Frontend (`frontend/`)

### 📦 設定ファイル

```
frontend/
├── index.html                 # エントリーHTML
├── jsconfig.json             # JavaScript設定
├── package.json              # npm依存関係
├── package.light.json        # 軽量版パッケージ定義
└── vite.config.js            # Vite設定
```

### 🖼️ Public Assets (`frontend/public/`)

```
public/
├── DAWAI logo.png
├── dawai-logo.png
├── favicon.ico
└── sounds/                    # サウンドアセット
    └── MuseScore_General/
        └── samples/
            ├── 58_74_HALFCRASH1.wav
            ├── 58_76_HIHAT1.wav
            ├── 58_77_SIZZLE1.wav
            ├── 58_84_BELLTAP1.wav
            ├── MBass-2 hit 3.wav
            ├── MBass-3 hit 1.wav
            ├── MBass-4 hit 1.wav
            ├── MBass-5 hit 1.wav
            ├── MBass-6 hit 1.wav
            ├── MCym1 crash ff3.wav
            ├── MSnr-backstick 3.wav
            ├── MSnr-hit 4.wav
            ├── MSnr-rim 3.wav
            ├── MSnr-rim shot 4.wav
            ├── MSnr-stick click 4.wav
            ├── MTnr-1 hit 4.wav
            ├── MTnr-2 hit 1.wav
            ├── MTnr-3 hit 4.wav
            ├── MTnr-4 hit 3.wav
            ├── Orchcrash.wav
            └── piano/         # 80個のピアノサンプル (.wav)
```

### 📂 Source Code (`frontend/src/`)

#### メインファイル
```
src/
├── App.css                   # メインスタイル
├── App.jsx                   # メインアプリケーションコンポーネント
├── index.css                 # グローバルスタイル
├── main.jsx                  # エントリーポイント
└── assets/
    └── react.svg
```

---

## 🧩 Components (`frontend/src/components/`)

### 🤖 AI Assistant (`components/AIassistant/`)

```
AIassistant/
├── index.jsx                  # メインエクスポート
├── AIAssistantChatBox.jsx    # チャットボックス
├── ChatHeader.jsx             # チャットヘッダー
├── ChatInput.jsx              # 入力フィールド
├── ChatMessage.jsx            # メッセージコンポーネント
├── ChatMessages.jsx           # メッセージリスト
├── ModelSelector.jsx          # モデル選択
├── ModeToggleButton.jsx       # モード切替
├── SectionSelector.jsx        # セクション選択
└── constants.js               # 定数定義
```

### 🎼 Arrangement View (`components/ArrangementView/`)

```
ArrangementView/
├── index.js
├── components/                # 7個のJSXコンポーネント
├── hooks/                     # 8個のカスタムフック (.js)
└── utils/
    └── arrangementUtils.js
```

### 🥁 Drum Track (`components/DrumTrack/`)

```
DrumTrack/
├── DrumTrack.jsx              # メインコンポーネント
├── DrumTrackGrid.jsx          # グリッド表示
├── DrumTrackStatusBar.jsx     # ステータスバー
├── DrumTrackTimeline.jsx      # タイムライン
├── DrumTrackToolbar.jsx       # ツールバー
├── constants.js               # 定数
└── hooks/                     # 4個のカスタムフック (.js)
```

### 🎹 MIDI Editor (`components/MIDIEditor/`)

```
MIDIEditor/
├── EnhancedMidiEditor.jsx     # 拡張MIDIエディタ
├── MidiEditorCanvas.jsx       # キャンバス描画
├── MidiEditorEventHandlers.jsx # イベントハンドラ
├── MidiEditorStatusBar.jsx    # ステータスバー
├── MidiEditorToolbar.jsx      # ツールバー
├── InstrumentSelector.jsx     # 楽器選択
├── InstrumentSettingsPanel.jsx # 楽器設定
├── constants.js               # 定数
└── hooks/
    ├── useMidiNoteEdit.js     # ノート編集フック
    └── useMidiPlayback.js     # 再生フック
```

### 🎤 DiffSinger (`components/DiffSinger/`)

```
DiffSinger/
├── AudioQualityPanel.jsx      # 音質設定パネル
├── DiffSingerCanvas.jsx       # キャンバス
└── GenerationProgress.jsx     # 生成進捗表示
```

### 🎛️ その他のコンポーネント

```
components/
├── AIAssistantChatBox.jsx
├── ArrangementView.jsx
├── DiffSingerTrack.jsx
├── EffectsPanel.jsx           # エフェクトパネル
├── EnhancedMidiEditor.jsx
├── GhostTextPanel.jsx         # ゴーストテキストパネル
├── Header.jsx                 # ヘッダー
├── LoginModal.jsx             # ログインモーダル
├── LyricsPanel.jsx            # 歌詞パネル
├── Mixer.jsx                  # ミキサー
├── ProjectMenu.jsx            # プロジェクトメニュー
├── RecordingPanel.jsx         # 録音パネル
├── SettingsModal.jsx          # 設定モーダル
├── TabBar.jsx                 # タブバー
└── ui/                        # 46個のUIコンポーネント (.jsx)
```

---

## 🪝 Custom Hooks (`frontend/src/hooks/`)

```
hooks/
├── use-mobile.js              # モバイル検出
├── useGhostText.js            # ゴーストテキスト
├── useInstrumentSettings.js   # 楽器設定
├── useMidiAudio.js            # MIDIオーディオ
├── useMidiEditorState.js      # MIDIエディタ状態
├── useMidiNoteOperations.js   # MIDIノート操作
└── useMidiPersistence.js      # MIDI永続化
```

---

## 🛠️ Utilities (`frontend/src/utils/`)

### オーディオ関連

```
utils/
├── audioExportEngine.js       # オーディオエクスポート
├── audioTrack.js              # オーディオトラック
├── debugAudio.js              # オーディオデバッグ
├── directWavEngine.js         # WAVエンジン
├── effectsEngine.js           # エフェクトエンジン
├── enhancedPianoEngine.js     # 拡張ピアノエンジン
├── externalPianoEngine.js     # 外部ピアノエンジン
├── physicalPianoEngine.js     # 物理ピアノエンジン
├── sampledPianoEngine.js      # サンプリングピアノエンジン
├── sf2Parser.js               # SF2パーサー
├── sf2SoundFontEngine.js      # SF2サウンドフォントエンジン
├── sfzParser.js               # SFZパーサー
├── toneJSManager.js           # Tone.js マネージャー
└── unifiedAudioSystem.js      # 統合オーディオシステム
```

### MIDI関連

```
utils/
├── midiEngine.js              # MIDIエンジン
├── instrumentEngine.js        # 楽器エンジン
└── recordingEngine.js         # 録音エンジン
```

### ドラム関連

```
utils/
├── drumTest.js                # ドラムテスト
├── drumTrackDataStructure.js  # ドラムデータ構造
└── drumTrackManager.js        # ドラムトラックマネージャー
```

### DiffSinger関連

```
utils/
├── diffSingerApiClient.js     # DiffSinger APIクライアント
├── diffsingerClient.js        # DiffSingerクライアント
└── phonemeConverter.js        # 音素変換
```

### AI/ゴーストテキスト関連 (`utils/ghostText/`)

```
ghostText/
├── GhostPredictionRenderer.js # 予測レンダリング
├── GhostTextEngineClient.js   # エンジンクライアント
├── GhostTextInputContext.js   # 入力コンテキスト
├── GhostTextSystem.js         # システムメイン
├── useGhostTextIntegration.js # 統合フック
└── README.md                  # ドキュメント
```

### その他ユーティリティ

```
utils/
├── aiAgentEngine.js           # AIエージェントエンジン
├── apiConfig.js               # API設定
├── cacheManager.js            # キャッシュマネージャー
├── enhancedProjectManager.js  # 拡張プロジェクトマネージャー
├── frameRateMonitor.js        # フレームレート監視
├── keyboardShortcuts.js       # キーボードショートカット
├── magentaGhostTextEngine.js  # Magentaゴーストテキスト
├── memoryManager.js           # メモリマネージャー
├── performanceMonitor.js      # パフォーマンス監視
├── pianoTest.js               # ピアノテスト
├── projectManager.js          # プロジェクトマネージャー
├── ragSystem.js               # RAGシステム
└── virtualization.js          # 仮想化
```

### ライブラリ (`src/lib/`)

```
lib/
└── utils.js                   # 共通ユーティリティ
```

---

## 📊 統計情報

### ファイル数

- **Backend**: ~3ファイル
- **Frontend Components**: ~70+ JSXファイル
- **Frontend Hooks**: 7ファイル
- **Frontend Utils**: ~40ファイル
- **Sound Samples**: 100+ WAVファイル
- **UI Components**: 46ファイル

### 主要技術スタック

#### Frontend
- **Framework**: React
- **Build Tool**: Vite
- **Styling**: CSS
- **Audio**: Tone.js, Web Audio API
- **MIDI**: 独自実装

#### Backend
- **Language**: Python
- **AI Agent**: カスタム実装

---

## 🔍 主要機能モジュール

### 1. **音楽制作**
- MIDIエディタ
- ドラムトラック
- アレンジメントビュー
- ミキサー

### 2. **AI機能**
- AIアシスタント
- ゴーストテキスト予測
- DiffSinger音声合成

### 3. **オーディオエンジン**
- 複数のピアノエンジン（物理、サンプリング、SF2、SFZ）
- エフェクト処理
- オーディオエクスポート

### 4. **プロジェクト管理**
- プロジェクトの保存/読み込み
- キャッシュ管理
- メモリ最適化

---

## 📝 注意事項

- `node_modules/`ディレクトリは.gitignoreに含まれています
- サウンドサンプルはMuseScore General SoundFontから取得
- `.vite-cache/`は未追跡のビルドキャッシュです

---

## 🚀 デプロイ

このプロジェクトは以下の環境でデプロイ可能です：
- **Coolify**: nixpacks.toml + Procfile使用
- **その他**: requirements.txt + build.shでセットアップ

---

*このドキュメントはプロジェクト構造の概要を提供します。詳細な実装については各ファイルを参照してください。*

