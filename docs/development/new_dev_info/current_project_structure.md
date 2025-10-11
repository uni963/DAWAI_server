# DAWAI プロジェクト - 現在のフォルダ構成分析

**作成日**: 2025-08-02  
**プロジェクト**: AI統合型ブラウザDAW (DAWAI)  
**バージョン**: 1.0.0  

## プロジェクト概要

DAWAIは、AI機能を統合したブラウザベースのDAW（Digital Audio Workstation）です。React（フロントエンド）とPython FastAPI（バックエンド）で構築されたモノレポ構成のプロジェクトです。

## ルートレベル構成

```
DAWAI_dev/
├── LICENSE                    # プロジェクトライセンス
├── README.md                  # プロジェクト説明
├── package.json              # ルートレベルの依存関係管理（melodia-composer-copilot）
├── package-lock.json          # 依存関係ロック
├── Reference/                 # 参考実装（OpenUtau）
├── docs/                      # プロジェクトドキュメント
└── packages/                  # メインコードベース
```

## 詳細フォルダ構成

### 1. Reference/ - 参考実装
```
Reference/
└── OpenUtau-master/          # OpenUtauの完全なソースコード
    ├── OpenUtau.Core/        # コアライブラリ（C#）
    ├── OpenUtau.Plugin.Builtin/ # 内蔵プラグイン
    ├── OpenUtau.Test/        # テストコード
    ├── OpenUtau/             # メインアプリケーション（Avalonia UI）
    ├── cpp/                  # C++実装（Worldlineレンダラー）
    └── py/                   # Python実装（G2Pモデル）
```

**目的**: 既存のDAW実装の参考として使用。音声合成やMIDI処理のアルゴリズムの理解に活用。

### 2. docs/ - ドキュメント
```
docs/
├── api/                      # API仕様書（空）
├── development/              # 開発関連ドキュメント
│   ├── new_dev_info/        # 新しい開発情報（このファイルを含む）
│   └── old_devs/            # 過去の開発ドキュメント
└── user-guide/              # ユーザーガイド（空）
```

**現状**: 多くの古いドキュメントがold_devsに移動されており、整理が必要。

### 3. packages/ - メインコードベース

#### 3.1 packages/backend/ - Python FastAPI バックエンド
```
packages/backend/
├── main.py                   # メインAPIアプリケーション
├── requirements.txt          # Python依存関係
├── requirements-basic.txt    # 基本依存関係
├── diffsinger/              # AI歌声合成システム
│   ├── api.py               # DiffSinger API
│   ├── synthesis_service.py # 音声合成サービス
│   ├── model_manager.py     # AIモデル管理
│   ├── cache_manager.py     # キャッシュ管理
│   ├── vocoder_manager.py   # ボコーダー管理
│   └── [その他30以上のファイル]
├── ghost_text/              # AI テキスト補完機能
│   ├── service.py           # Ghost Text サービス
│   ├── phi2_engine.py       # Phi-2 AIエンジン
│   ├── analyzer.py          # テキスト分析
│   └── [その他関連ファイル]
└── [各種テスト・デバッグファイル]
```

**主要機能**:
- **AI Chat API**: Claude, OpenAI, Gemini対応の音楽制作アシスタント
- **DiffSinger**: AI歌声合成システム
- **Ghost Text**: AI補完機能
- **ストリーミング対応**: リアルタイムAI応答

#### 3.2 packages/frontend/ - React フロントエンド
```
packages/frontend/
├── package.json              # フロントエンド依存関係（dawai）
├── vite.config.js           # Vite設定
├── tailwind.config.js       # Tailwind CSS設定
├── src/
│   ├── App.jsx              # メインアプリケーション（1300+行）
│   ├── components/          # UIコンポーネント
│   │   ├── ui/              # Shadcn/ui基本コンポーネント（40+ファイル）
│   │   ├── ArrangementView/ # アレンジメントビュー
│   │   ├── MIDIEditor/      # MIDI編集機能
│   │   ├── DrumTrack/       # ドラムトラック機能
│   │   ├── DiffSinger/      # AI歌声合成UI
│   │   ├── AIassistant/     # AIアシスタント機能
│   │   └── [その他多数のコンポーネント]
│   ├── hooks/               # React カスタムフック
│   ├── utils/               # ユーティリティ関数（40+ファイル）
│   └── lib/                 # ライブラリコード
└── public/                  # 静的ファイル
```

**主要機能**:
- **マルチトラック編集**: MIDI、ドラム、AI歌声
- **AIアシスタント**: 音楽制作支援
- **リアルタイム音声処理**: Tone.js使用
- **高度なUI**: Shadcn/ui + Tailwind CSS

#### 3.3 packages/shared/ - 共有ライブラリ
```
packages/shared/
└── (現在空)
```

**予定**: フロントエンドとバックエンドの共通型定義、ユーティリティ

## 技術スタック分析

### フロントエンド
- **フレームワーク**: React 18.3.1 + Vite 6.3.5
- **UI**: Shadcn/ui + Tailwind CSS 4.1.7
- **音声処理**: Tone.js 15.1.22
- **AI機能**: TensorFlow.js 2.8.6, Magenta 1.23.1
- **状態管理**: React Hooks（useState, useEffect中心）

### バックエンド
- **フレームワーク**: FastAPI 0.104.1
- **AI**: PyTorch, Transformers, DiffSinger
- **音声処理**: librosa, soundfile, pyworld
- **API**: Claude, OpenAI, Gemini統合

## データフロー分析

### 1. AI Chat フロー
```
Frontend (AIAssistant) → FastAPI (/api/chat) → AI API (Claude/OpenAI/Gemini) → Response
```

### 2. 音声合成フロー
```
Frontend (DiffSinger) → FastAPI (/diffsinger/*) → DiffSingerシステム → WAVファイル生成
```

### 3. MIDI処理フロー
```
Frontend (MIDIEditor) → Tone.js処理 → 音声出力
```

## 現在の課題と問題点

### 1. 構造的問題
- **モノリシックなApp.jsx**: 1300+行の巨大ファイル
- **共有ライブラリ不足**: packages/sharedが空
- **型定義の不統一**: TypeScriptの不完全な活用
- **テストカバレッジ低**: 体系的なテスト不足

### 2. 依存関係の問題
- **ルートpackage.json**: 古いメロディア名残存
- **重複する設定**: フロントエンドとルートの設定重複
- **依存関係の散在**: 管理が複雑

### 3. ドキュメント問題
- **古いドキュメント**: 過去の開発履歴が混在
- **API仕様書不足**: 現在のAPI仕様が未文書化
- **開発ガイド不備**: 新規開発者向け情報不足

### 4. パフォーマンス問題
- **大きなバンドルサイズ**: 最適化不足
- **メモリ使用量**: 音声処理での高メモリ使用
- **キャッシュ戦略**: 効率的でないキャッシュ

## コンポーネント間の依存関係

### フロントエンド主要依存関係
```
App.jsx
├── ArrangementView (トラック管理)
├── MIDIEditor (MIDI編集)
├── DrumTrack (ドラム編集)
├── DiffSingerTrack (AI歌声)
├── AIAssistantChatBox (AIチャット)
└── 各種ユーティリティ (40+ファイル)
```

### バックエンド主要依存関係
```
main.py
├── ghost_text.service (Ghost Text機能)
├── diffsinger API群 (30+ファイル)
├── AI Model Manager (Claude/OpenAI/Gemini)
└── ストリーミング機能
```

## 使用されているパッケージ分析

### 重要なフロントエンド依存関係
- **@magenta/music**: 音楽AI機能
- **@tensorflow/tfjs**: 機械学習
- **tone**: 音声合成・処理
- **@radix-ui/***: UI コンポーネント基盤
- **framer-motion**: アニメーション
- **soundfont-player**: サウンドフォント再生

### 重要なバックエンド依存関係
- **torch**: PyTorch機械学習
- **transformers**: Hugging Face変換器
- **librosa**: 音声分析
- **google-generativeai**: Gemini API
- **diffsinger**: AI歌声合成

## まとめ

DAWAIプロジェクトは機能豊富なAI統合DAWとして発展していますが、コード構造の整理と最適化が必要な段階にあります。特に大きなファイルの分割、共有ライブラリの整備、ドキュメントの更新が急務です。

次のドキュメント「ideal_project_structure.md」では、これらの問題を解決する理想的な構成を提案します。