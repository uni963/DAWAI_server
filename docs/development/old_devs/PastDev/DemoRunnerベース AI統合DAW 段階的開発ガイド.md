# DemoRunnerベース AI統合DAW 段階的開発ガイド

**バージョン**: 2.0  
**作成日**: 2025年6月19日  
**対象読者**: 開発者、エンジニア、プロジェクトマネージャー  
**プロジェクト**: Composer Copilot - AI統合DAW  

## はじめに

本開発ガイドは、Tracktion Engineの公式デモアプリケーションであるDemoRunnerを基盤として、AI統合DAW「Composer Copilot」を段階的に開発するための詳細な手順書です。従来のゼロベースでのDAW開発アプローチから、DemoRunnerという実証済みの安定したコードベースを活用することで、開発リスクを最小化し、短期間での市場投入を実現します。

このガイドでは、AI統合DAWの主要機能であるAgent機能とGhost Text機能をDemoRunnerに統合するための、明確で実践的なステップを定義します。各ステップには、具体的な実装コード例、必要なツールとライブラリ、そして成果物と検証方法が示されています。また、CursorやWindsurfなどのAI支援開発ツールとの連携を前提とした構成となっており、各ステップには明確な`// STEP X:`タグが付けられているため、AI開発アシスタントが開発段階を正確に把握し、適切なサポートを提供できます。

DemoRunnerベースのアプローチを採用することで、MIDI再生・録音、プラグインシステム、エフェクト処理、パターン生成といったDAWの基本的な機能が既に実装された状態から開発を開始できます。これにより、開発チームはAI機能の革新的な部分に集中でき、開発期間を大幅に短縮し、高品質な製品を効率的に市場に投入することが可能になります。




## Phase 1: 環境構築とDemoRunner基盤準備

### // STEP 1: 開発環境のセットアップ

このステップでは、DemoRunnerベースのAI統合DAW開発に必要な環境を構築します。Tracktion Engineのソースコードを取得し、DemoRunnerプロジェクトの初期ビルドが正常に動作することを確認します。これにより、今後の開発作業の安定した基盤を確立します。

#### 必要なツールとライブラリ

Windows 11環境での開発を想定し、以下のツールとライブラリを準備します。macOSやLinux環境でも同様のツールが利用可能ですが、コマンドやパスは適宜読み替えてください。

-   **Visual Studio 2022 Community Edition以上**: C++開発環境。CMakeとの連携に必要です。
-   **CMake 3.22以上**: ビルドシステムの生成ツール。
-   **Git**: Tracktion Engineのソースコード管理に使用します。
-   **Python 3.9以上**: Ghost Text機能のローカルAIサーバー開発に必要です。pipも同時にインストールされます。
-   **Cursorエディタ**: AI支援開発に最適化されたIDEです。WindsurfなどのAIアシスタントとの連携を強化します。
-   **vcpkg (推奨)**: C++ライブラリのパッケージマネージャー。JUCEやTracktion Engineの依存関係管理に役立ちます。

#### Tracktion Engineの取得

Tracktion EngineのGitHubリポジトリからソースコードをクローンします。`--recursive`オプションを使用することで、JUCEなどのサブモジュールも同時に取得されます。DemoRunnerプロジェクトは、クローンしたリポジトリ内の`examples/DemoRunner`ディレクトリに配置されています。

```bash
git clone --recursive https://github.com/Tracktion/tracktion_engine.git
cd tracktion_engine
```

#### 初期ビルドの実行

クローンしたTracktion Engineリポジトリのルートディレクトリで、DemoRunnerの初期ビルドを実行します。これにより、開発環境が正しく設定されているか、およびDemoRunnerが正常に動作するかを確認します。以下のコマンドは、CMakeを使用してビルドシステムを生成し、その後ビルドを実行する一般的な手順です。

```bash
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release # リリースビルド設定
cmake --build . --config Release # ビルド実行
```

ビルドが成功すると、`build/examples/DemoRunner/Release` (Windowsの場合) または `build/examples/DemoRunner` (macOS/Linuxの場合) ディレクトリ内に実行可能ファイルが生成されます。この実行可能ファイルを起動し、DemoRunnerが正常に動作することを確認してください。

#### 成果物と検証方法

-   **成果物**: 正常にビルドされたDemoRunner実行可能ファイル。
-   **検証方法**: 
    1.  DemoRunnerアプリケーションがエラーなく起動すること。
    2.  アプリケーション内でMIDI再生、録音、プラグインのロード、エフェクト処理など、基本的なDAW機能が正常に動作すること。
    3.  特に、`MidiPlaybackDemo`や`PatternGeneratorDemo`などの既存デモが期待通りに機能することを確認してください。

このステップが完了すれば、AI統合DAW開発のための強固な基盤が整ったことになります。



### // STEP 2: プロジェクト構造の理解と分析

このステップでは、DemoRunnerの既存コード構造を詳細に分析し、AI機能を統合するための最適な拡張ポイントを特定します。Tracktion EngineとJUCEフレームワークのモジュラー設計を理解することは、クリーンで保守性の高いAI統合DAWを構築するために不可欠です。

#### コードベース分析

DemoRunnerの主要なクラス構造と、各機能がどのように実装されているかを理解します。`DemoRunner.cpp`がアプリケーションのエントリポイントであり、各デモ機能は独立した`juce::Component`を継承したクラスとして`Source/demos`ディレクトリに配置されています。このモジュラー設計は、AI機能も同様に独立したコンポーネントとして追加できることを示唆しています。

```cpp
// DemoRunnerの主要なデモクラスの例
// Source/demos/MidiPlaybackDemo.h および .cpp
class MidiPlaybackDemo : public Component
{
    // MIDIファイルのロード、再生、UI表示などの機能が実装されています。
    // AI Agent機能が生成したMIDIデータを再生する際の参考になります。
};

// Source/demos/PatternGeneratorDemo.h および .cpp
class PatternGeneratorDemo : public Component  
{
    // 既存のパターン生成ロジックとUIが実装されています。
    // AI Agent機能が、この既存のパターン生成機能を拡張する形で統合されます。
};

// Source/demos/MidiRecordingDemo.h および .cpp
class MidiRecordingDemo : public Component
{
    // MIDI入力の処理、録音、UI表示などの機能が実装されています。
    // AI Ghost Text機能が、このMIDI入力ストリームを監視し、予測を提供します。
};
```

これらの既存のデモクラスを分析することで、AI機能がどのように既存のDAW機能と連携すべきかのヒントが得られます。例えば、Agent機能は`PatternGeneratorDemo`のロジックを拡張し、AIが生成したパターンをDAWに挿入する形になるでしょう。Ghost Text機能は`MidiRecordingDemo`のMIDI入力処理にフックし、リアルタイム予測を提供します。

#### AI統合ポイントの特定

AI機能をDemoRunnerに統合するための具体的なポイントを特定します。

-   **Agent機能**: `PatternGeneratorDemo`が既存のパターン生成ロジックを持っているため、このデモを拡張するか、または独立した`AIAgentDemo`を作成し、`MCPClient`を介してLLMと通信し、生成されたMIDIデータをTracktion Engineの`Edit`（プロジェクト）に挿入するロジックを実装します。
-   **Ghost Text機能**: `MidiRecordingDemo`がMIDI入力処理を担っているため、このデモを拡張するか、または独立した`GhostTextDemo`を作成し、`GhostTextClient`を介してローカルPython AIサーバーと通信し、予測されたノートをUIに描画するロジックを実装します。
-   **ライセンス管理**: アプリケーション全体でライセンス状態を管理するため、`DemoRunner.cpp`やメインのアプリケーションクラスからアクセス可能な`LicenseManager`クラスを設計します。

#### 依存関係の分析

Tracktion EngineとJUCEのビルドシステム（CMake）を分析し、AI機能追加時に必要となる追加の依存関係を特定します。特に、ネットワーク通信（HTTP/HTTPS）、JSONデータのパース、およびPython AIサーバーとの連携に必要なライブラリを考慮する必要があります。

-   **HTTP通信**: JUCEには`juce::URL::DownloadTask`などのHTTP通信機能が内蔵されていますが、より高度な機能や安定性を求める場合は、`libcurl`などの外部ライブラリの導入も検討します。
-   **JSON処理**: JUCEには`juce::JSON::parse`などのJSON処理機能が内蔵されており、これを利用してLLMからのレスポンスやPython AIサーバーとの通信データを処理します。
-   **Python連携**: Python AIサーバーとの通信はHTTP経由で行うため、C++側で特別なPythonバインディングライブラリは不要ですが、Python環境の管理（`requirements.txt`など）が必要になります。

#### 成果物と検証方法

-   **成果物**: DemoRunnerのコード構造とAI統合ポイントをまとめた詳細な設計メモ（内部ドキュメントとして）。
-   **検証方法**: 
    1.  主要なDemoRunnerのクラス（`DemoRunner.cpp`, `MainComponent.h/cpp`, 各デモクラス）の役割と相互作用を明確に説明できること。
    2.  Agent機能とGhost Text機能が、既存のDemoRunnerのアーキテクチャにどのように適合するかを具体的に説明できること。
    3.  AI機能の実装に必要なC++およびPythonの主要な依存関係をリストアップできること。

このステップで得られた知見は、次のステップでのプロジェクト構造設計と、その後の実装フェーズの基盤となります。



### // STEP 3: AI機能用プロジェクト構造の設計

このステップでは、DemoRunnerの既存のプロジェクト構造を保持しつつ、AI機能を効率的に統合するための新しいディレクトリ構造とビルドシステム（CMakeLists.txt）の設計を行います。既存のコードベースとの整合性を保ちながら、AI関連のファイルが明確に分離され、管理しやすい構造を目指します。

#### ディレクトリ構造の拡張

AI機能に関連するC++ソースファイル、Pythonスクリプト、設定ファイルなどを、既存の`DemoRunner`プロジェクト内に論理的に配置します。これにより、プロジェクトの可読性と保守性が向上します。推奨されるディレクトリ構造は以下の通りです。

```
DemoRunner/                                 # DemoRunnerプロジェクトのルート
├── Source/                                 # C++ソースコード
│   ├── DemoRunner.cpp                      # メインアプリケーションファイル
│   ├── DemoRunner.h
│   ├── demos/                              # 既存のデモクラス
│   │   ├── MidiPlaybackDemo.h
│   │   ├── PatternGeneratorDemo.h
│   │   └── ...
│   └── AI/                                 # 新規AI機能関連のC++ソース
│       ├── AIAgentDemo.cpp                 # Agent機能のUIとロジック
│       ├── AIAgentDemo.h
│       ├── GhostTextDemo.cpp               # Ghost Text機能のUIとロジック
│       ├── GhostTextDemo.h
│       ├── MCPClient.cpp                   # MCP通信クライアントの実装
│       ├── MCPClient.h
│       ├── GhostTextClient.cpp             # Ghost Text用Pythonサーバー通信クライアント
│       ├── GhostTextClient.h
│       ├── LicenseManager.cpp              # ライセンス管理の実装
│       └── LicenseManager.h
├── python_ai/                              # Python AIサーバー関連ファイル
│   ├── ghost_text_server.py                # Ghost Text機能のPython AIサーバー
│   ├── requirements.txt                    # Python依存ライブラリリスト
│   └── models/                             # AIモデルファイル（必要に応じて）
│       └── ...
├── scripts/                                # 開発・運用スクリプト
│   ├── start_ghost_server.bat              # Ghost Textサーバー起動スクリプト (Windows)
│   ├── start_ghost_server.sh               # Ghost Textサーバー起動スクリプト (macOS/Linux)
│   └── setup_environment.bat               # 開発環境セットアップスクリプト (Windows)
└── resources/                              # リソースファイル（アイコン、画像など）
    └── ...
```

この構造により、C++コードとPythonコードが明確に分離され、それぞれの開発・デプロイが独立して行えるようになります。また、AI関連のC++クラスは`Source/AI`ディレクトリに集約され、既存の`demos`ディレクトリのコードとの混在を避けます。

#### CMakeLists.txtの拡張設計

既存の`DemoRunner`の`CMakeLists.txt`ファイルを拡張し、新しく追加されるAI関連のC++ソースファイルと、必要な外部ライブラリへの依存関係を適切に管理します。特に、HTTP通信やJSON処理のためのライブラリ（JUCEの内蔵機能を使用する場合も、CMakeでの設定が必要になることがあります）の追加を考慮します。

`DemoRunner/CMakeLists.txt`に、`Source/AI`ディレクトリ内のソースファイルを追加し、必要に応じてJUCEのモジュール設定や外部ライブラリのリンク設定を更新します。

```cmake
# DemoRunner/CMakeLists.txt (抜粋)

# 既存のソースファイルに追加
set(DEMORUNNER_SOURCES
    Source/DemoRunner.cpp
    Source/demos/MidiPlaybackDemo.cpp
    # ... 既存のデモソースファイル
    Source/AI/AIAgentDemo.cpp
    Source/AI/GhostTextDemo.cpp
    Source/AI/MCPClient.cpp
    Source/AI/GhostTextClient.cpp
    Source/AI/LicenseManager.cpp
)

# JUCEモジュールの追加（必要に応じて）
juce_add_module_path(${CMAKE_SOURCE_DIR}/modules)
juce_add_module(juce_core)
juce_add_module(juce_gui_basics)
juce_add_module(juce_audio_basics)
juce_add_module(juce_audio_devices)
juce_add_module(juce_audio_formats)
juce_add_module(juce_audio_processors)
juce_add_module(juce_audio_utils)
juce_add_module(juce_graphics)
juce_add_module(juce_data_structures)
juce_add_module(juce_events)
juce_add_module(juce_dsp)
juce_add_module(juce_osc) # OSC通信が必要な場合
juce_add_module(juce_web_browser) # Webビューが必要な場合
juce_add_module(juce_cryptography) # ライセンス管理で暗号化が必要な場合
juce_add_module(juce_curl) # libcurlを使用する場合

# Tracktion Engineモジュールの追加
juce_add_module_path(${CMAKE_SOURCE_DIR}/modules/tracktion_engine/modules)
juce_add_module(tracktion_engine)

# 外部ライブラリのリンク（例: JSONライブラリ、HTTPクライアントなど）
# find_package(nlohmann_json CONFIG REQUIRED)
# target_link_libraries(DemoRunner PRIVATE nlohmann_json::nlohmann_json)

# ... その他の設定

# 実行可能ファイルの生成
add_executable(DemoRunner ${DEMORUNNER_SOURCES})

# インクルードディレクトリの追加
target_include_directories(DemoRunner PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/Source/AI
)
```

#### 設定管理システムの設計

AI機能の設定（例: LLMプロバイダーのAPIキー、Ghost TextサーバーのURL、ライセンスサーバーのURLなど）は、アプリケーション内で一元的に管理されるべきです。DemoRunnerの既存の設定システム（もしあれば）を拡張するか、またはJUCEの`ApplicationProperties`クラスやカスタムの設定ファイル（例: JSONファイル）を使用して、これらの設定を永続化する仕組みを設計します。

-   **JUCE `ApplicationProperties`**: JUCEアプリケーションの永続的な設定を保存するのに適しています。ユーザーがUIから設定を変更できるようにする場合に便利です。
-   **カスタム設定ファイル**: アプリケーションの起動時に読み込まれるJSONやINI形式のファイルを使用することで、開発者や高度なユーザーが直接設定を編集できるようにします。APIキーなどの機密情報は、環境変数や安全なストレージに保存することを検討します。

`LicenseManager`や`MCPClient`などのクラスは、これらの設定値にアクセスできるよう設計します。例えば、`MCPClient`は設定システムからLLMのAPIキーを読み込み、`LicenseManager`はライセンスサーバーのURLを読み込むといった形です。

#### 成果物と検証方法

-   **成果物**: AI機能統合のためのプロジェクト構造設計書（ディレクトリ構造図、CMakeLists.txtの変更点、設定管理の概要）。
-   **検証方法**: 
    1.  設計されたディレクトリ構造が、AI関連のファイルを論理的に分離し、既存のDemoRunnerコードと衝突しないことを確認する。
    2.  `CMakeLists.txt`の変更案が、すべてのAI関連C++ソースファイルをビルドに含め、必要な依存関係を正しくリンクできることを確認する（実際にCMakeを再実行し、プロジェクトファイルを生成してみる）。
    3.  設定管理の設計が、AI機能に必要なすべての設定項目を網羅し、安全かつ柔軟に管理できることを確認する。

このステップで設計された構造は、今後の実装フェーズにおけるコードの組織化とビルドプロセスの基盤となります。



### // STEP 4: 基本的なAIインフラストラクチャの実装

このステップでは、AI統合DAWの核となるAIインフラストラクチャの基盤クラスを実装します。具体的には、LLMとの通信を担う`MCPClient`クラスと、有料機能の管理を行う`LicenseManager`クラスの基本的な構造を構築します。これらのクラスは、後のステップでAgent機能とGhost Text機能に統合されます。

#### MCPClientクラスの実装

`MCPClient`クラスは、Model Context Protocol (MCP) を使用して、Claude、ChatGPT、Geminiなどの大規模言語モデル (LLM) と通信するためのインターフェースを提供します。このクラスは非同期通信をサポートし、DAWのUIスレッドをブロックすることなくLLMからの応答を待ち受けます。

`Source/AI/MCPClient.h`
```cpp
#pragma once

#include <JuceHeader.h>
#include "../Engine/Engine.h" // Tracktion EngineのEngineクラスへのパスを調整

// 音楽コンテキストを保持する構造体（必要に応じて詳細化）
struct MusicContext
{
    double tempo = 120.0;
    juce::String timeSignature = "4/4";
    juce::String key = "C major";
    // その他のDAWの状態情報（例: 既存のMIDIクリップ、トラック情報など）
    juce::String existingTracks = ""; 
};

// LLMから返されるMIDIシーケンスの抽象化
// 実際にはjuce::MidiBufferやjuce::MidiMessageの配列として扱う
struct MidiSequence
{
    juce::Array<juce::MidiMessage> messages;
    // その他のメタデータ（例: テンポ、拍子、キーなど）
};

// 非同期処理のためのFuture/Promiseライクなクラス（JUCEには直接ないため、簡易実装または外部ライブラリ）
// ここでは簡略化のため、コールバックベースのFutureを想定
template <typename T>
class Future
{
public:
    using CallbackType = std::function<void(const T&)>;
    using ErrorCallbackType = std::function<void(const juce::String&)>;

    Future() = default;

    void then(CallbackType cb) { successCallback = cb; }
    void onError(ErrorCallbackType cb) { errorCallback = cb; }

    void resolve(const T& result) { if (successCallback) successCallback(result); }
    void reject(const juce::String& error) { if (errorCallback) errorCallback(error); }

private:
    CallbackType successCallback;
    ErrorCallbackType errorCallback;
};

class MCPClient : public juce::URL::DownloadTask::Listener
{
public:
    enum class LLMProvider
    {
        Claude,
        ChatGPT,
        Gemini
    };
    
    MCPClient();
    ~MCPClient() override;
    
    void setProvider(LLMProvider provider);
    void setApiKey(const juce::String& apiKey);
    
    // 音楽生成リクエストをLLMに送信
    Future<MidiSequence> generateMidi(const juce::String& prompt, 
                                     const MusicContext& context);
    
    // juce::URL::DownloadTask::Listener のオーバーライド
    void downloadFinished (juce::URL::DownloadTask* task, bool success) override;
    void downloadProgress (juce::URL::DownloadTask* task, int bytesReceived, int totalBytes) override;

private:
    LLMProvider currentProvider = LLMProvider::Claude;
    juce::String apiKey;
    std::unique_ptr<juce::URL::DownloadTask> currentTask;
    Future<MidiSequence> currentFuture; // 現在のリクエストに対応するFuture

    // プロバイダーごとの設定
    struct ProviderConfig
    {
        juce::String baseUrl;
        juce::String modelName;
        int maxTokens;
        float temperature;
    };
    
    std::map<LLMProvider, ProviderConfig> providerConfigs;

    juce::String buildJsonRequest(const juce::String& prompt, const MusicContext& context);
    MidiSequence parseLlmResponse(const juce::String& responseJson);
};
```

`Source/AI/MCPClient.cpp`
```cpp
#include "MCPClient.h"

MCPClient::MCPClient()
{
    // プロバイダーごとの設定を初期化
    providerConfigs[LLMProvider::Claude] = {"https://api.anthropic.com/v1/messages", "claude-3-5-sonnet-20240620", 2048, 0.7f};
    providerConfigs[LLMProvider::ChatGPT] = {"https://api.openai.com/v1/chat/completions", "gpt-4o", 2048, 0.7f};
    providerConfigs[LLMProvider::Gemini] = {"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent", "gemini-pro", 2048, 0.7f};
}

MCPClient::~MCPClient()
{
    if (currentTask)
        currentTask->cancel();
}

void MCPClient::setProvider(LLMProvider provider)
{
    currentProvider = provider;
}

void MCPClient::setApiKey(const juce::String& key)
{
    apiKey = key;
}

Future<MidiSequence> MCPClient::generateMidi(const juce::String& prompt, 
                                             const MusicContext& context)
{
    if (apiKey.isEmpty())
    {
        currentFuture.reject("API Key is not set.");
        return currentFuture;
    }

    if (currentTask && currentTask->isCurrentlyRunning())
    {
        currentFuture.reject("Another request is already in progress.");
        return currentFuture;
    }

    juce::String jsonRequest = buildJsonRequest(prompt, context);
    ProviderConfig config = providerConfigs[currentProvider];

    juce::URL apiUrl (config.baseUrl);
    juce::StringPairArray headers;
    headers.set ("Content-Type", "application/json");

    if (currentProvider == LLMProvider::Claude)
    {
        headers.set ("x-api-key", apiKey);
        headers.set ("anthropic-version", "2023-06-01");
    }
    else if (currentProvider == LLMProvider::ChatGPT)
    {
        headers.set ("Authorization", "Bearer " + apiKey);
    }
    else if (currentProvider == LLMProvider::Gemini)
    {
        apiUrl = apiUrl.withParameter("key", apiKey); // GeminiはURLパラメータでAPIキーを渡す
    }

    currentTask = apiUrl.create  // createDownloadTaskを直接呼び出す
    (juce::URL::DownloadTaskOptions()
        .withExtraHeaders(headers)
        .withPOSTData(jsonRequest)
        .withListener(this)
    );

    if (currentTask)
        currentTask->start();
    else
        currentFuture.reject("Failed to create download task.");

    return currentFuture;
}

void MCPClient::downloadFinished (juce::URL::DownloadTask* task, bool success)
{
    if (task != currentTask.get())
        return; // 別のタスクが完了した場合は無視

    if (success)
    {
        juce::File tempFile = task->getTargetFile();
        juce::String responseJson = tempFile.loadFileAsString();
        MidiSequence sequence = parseLlmResponse(responseJson);
        currentFuture.resolve(sequence);
    }
    else
    {
        currentFuture.reject("Network error or LLM API call failed.");
    }
    currentTask.reset();
}

void MCPClient::downloadProgress (juce::URL::DownloadTask* task, int bytesReceived, int totalBytes)
{
    // 進捗表示が必要な場合はここに実装
}

juce::String MCPClient::buildJsonRequest(const juce::String& prompt, const MusicContext& context)
{
    juce::var requestData;

    if (currentProvider == LLMProvider::Claude)
    {
        requestData = juce::JSON::parse("{}");
        requestData.getDynamicObject()->setProperty("model", providerConfigs[currentProvider].modelName);
        requestData.getDynamicObject()->setProperty("max_tokens", providerConfigs[currentProvider].maxTokens);
        requestData.getDynamicObject()->setProperty("temperature", providerConfigs[currentProvider].temperature);

        juce::Array<juce::var> messages;
        juce::var userMessage = juce::JSON::parse("{}");
        userMessage.getDynamicObject()->setProperty("role", "user");
        userMessage.getDynamicObject()->setProperty("content", "Generate MIDI for: " + prompt + ". Current context: Tempo=" + juce::String(context.tempo) + ", TimeSignature=" + context.timeSignature + ", Key=" + context.key + ". Existing tracks: " + context.existingTracks + ". Output only MIDI data in a structured JSON format.");
        messages.add(userMessage);
        requestData.getDynamicObject()->setProperty("messages", messages);
    }
    else if (currentProvider == LLMProvider::ChatGPT)
    {
        requestData = juce::JSON::parse("{}");
        requestData.getDynamicObject()->setProperty("model", providerConfigs[currentProvider].modelName);
        requestData.getDynamicObject()->setProperty("max_tokens", providerConfigs[currentProvider].maxTokens);
        requestData.getDynamicObject()->setProperty("temperature", providerConfigs[currentProvider].temperature);

        juce::Array<juce::var> messages;
        juce::var systemMessage = juce::JSON::parse("{}");
        systemMessage.getDynamicObject()->setProperty("role", "system");
        systemMessage.getDynamicObject()->setProperty("content", "You are a music composition AI. Generate MIDI data based on user requests.");
        messages.add(systemMessage);

        juce::var userMessage = juce::JSON::parse("{}");
        userMessage.getDynamicObject()->setProperty("role", "user");
        userMessage.getDynamicObject()->setProperty("content", "Generate MIDI for: " + prompt + ". Current context: Tempo=" + juce::String(context.tempo) + ", TimeSignature=" + context.timeSignature + ", Key=" + context.key + ". Existing tracks: " + context.existingTracks + ". Output only MIDI data in a structured JSON format.");
        messages.add(userMessage);
        requestData.getDynamicObject()->setProperty("messages", messages);
    }
    else if (currentProvider == LLMProvider::Gemini)
    {
        requestData = juce::JSON::parse("{}");
        requestData.getDynamicObject()->setProperty("model", providerConfigs[currentProvider].modelName);
        requestData.getDynamicObject()->setProperty("max_output_tokens", providerConfigs[currentProvider].maxTokens);
        requestData.getDynamicObject()->setProperty("temperature", providerConfigs[currentProvider].temperature);

        juce::Array<juce::var> contents;
        juce::var userContent = juce::JSON::parse("{}");
        juce::Array<juce::var> parts;
        juce::var textPart = juce::JSON::parse("{}");
        textPart.getDynamicObject()->setProperty("text", "Generate MIDI for: " + prompt + ". Current context: Tempo=" + juce::String(context.tempo) + ", TimeSignature=" + context.timeSignature + ", Key=" + context.key + ". Existing tracks: " + context.existingTracks + ". Output only MIDI data in a structured JSON format.");
        parts.add(textPart);
        userContent.getDynamicObject()->setProperty("parts", parts);
        contents.add(userContent);
        requestData.getDynamicObject()->setProperty("contents", contents);
    }

    return juce::JSON::toString(requestData);
}

MidiSequence MCPClient::parseLlmResponse(const juce::String& responseJson)
{
    MidiSequence sequence;
    juce::var parsedResponse = juce::JSON::parse(responseJson);

    // ここでLLMの応答からMIDIデータをパースするロジックを実装
    // LLMが返すJSON構造に応じて、適切にMidiMessageオブジェクトを生成し、sequence.messagesに追加
    // 例: LLMが以下のようなJSONを返す場合
    /*
    {
        "midi_data": [
            {"note": 60, "velocity": 100, "start_time": 0.0, "duration": 1.0},
            {"note": 64, "velocity": 100, "start_time": 0.5, "duration": 1.0}
        ]
    }
    */
    
    if (parsedResponse.hasProperty("midi_data"))
    {
        juce::Array<juce::var>* midiDataArray = parsedResponse.getArray();
        if (midiDataArray)
        {
            for (auto& midiNoteVar : *midiDataArray)
            {
                if (midiNoteVar.isObject())
                {
                    juce::DynamicObject* midiNoteObj = midiNoteVar.getDynamicObject();
                    int note = midiNoteObj->getProperty("note");
                    int velocity = midiNoteObj->getProperty("velocity");
                    double startTime = midiNoteObj->getProperty("start_time");
                    double duration = midiNoteObj->getProperty("duration");

                    // MIDI Note On/Off メッセージを作成
                    juce::MidiMessage noteOn = juce::MidiMessage::noteOn(1, note, (juce::uint8)velocity);
                    noteOn.setTimeStamp(startTime);
                    sequence.messages.add(noteOn);

                    juce::MidiMessage noteOff = juce::MidiMessage::noteOff(1, note);
                    noteOff.setTimeStamp(startTime + duration);
                    sequence.messages.add(noteOff);
                }
            }
        }
    }
    // 必要に応じて、他のLLMの出力形式に対応するパースロジックを追加

    return sequence;
}
```

#### LicenseManagerクラスの実装

`LicenseManager`クラスは、アプリケーションの有料機能を管理し、ユーザーのライセンス状態に基づいて機能へのアクセスを制御します。これは、フリーミアムモデルをサポートするために不可欠です。

`Source/AI/LicenseManager.h`
```cpp
#pragma once

#include <JuceHeader.h>

class LicenseManager : public juce::Timer
{
public:
    enum class LicenseType
    {
        Free,           // 基本機能のみ
        Agent,          // Agent機能付き
        Professional    // 全機能 + 追加特典
    };
    
    enum class LicenseStatus
    {
        Valid,
        Expired,
        Invalid,
        NetworkError,
        DeviceLimitExceeded
    };
    
    LicenseManager();
    ~LicenseManager() override;
    
    // ライセンス検証
    bool hasValidLicense (LicenseType requiredType) const;
    LicenseStatus validateLicense();
    
    // 使用量制限
    bool canUseAgent() const;
    void recordAgentUsage();
    int getRemainingAgentCalls() const;
    
    // デバイス認証
    juce::String getDeviceFingerprint() const;
    bool isDeviceAuthorized() const;
    
    // Timer override
    void timerCallback() override;
    
private:
    LicenseType currentLicenseType = LicenseType::Free;
    LicenseStatus currentStatus = LicenseStatus::Invalid;
    
    // 使用量追跡
    int agentCallsThisMonth = 0;
    int maxAgentCallsPerMonth = 0;
    juce::Time lastResetTime;
    
    // デバイス情報
    juce::String deviceFingerprint;
    juce::String licenseKey;
    juce::String userEmail;
    
    // ネットワーク通信
    std::unique_ptr<juce::URL::DownloadTask> validationTask;
    
    // ライセンスサーバーとの通信
    void validateWithServer();
    void handleValidationResponse (const juce::String& response);
    juce::String generateDeviceFingerprint();
    
    // ローカルライセンス情報の管理
    void saveLicenseInfo();
    void loadLicenseInfo();
    juce::File getLicenseFilePath() const;
};
```

`Source/AI/LicenseManager.cpp`
```cpp
#include "LicenseManager.h"

LicenseManager::LicenseManager()
{
    loadLicenseInfo(); // アプリケーション起動時にローカルのライセンス情報をロード
    startTimer(60 * 60 * 1000); // 1時間ごとにライセンスを検証 (本番ではもっと頻繁に)
}

LicenseManager::~LicenseManager()
{
    stopTimer();
}

bool LicenseManager::hasValidLicense (LicenseType requiredType) const
{
    if (currentStatus != LicenseStatus::Valid)
        return false;

    switch (requiredType)
    {
        case LicenseType::Free:
            return true; // 無料機能は常に利用可能
        case LicenseType::Agent:
            return currentLicenseType == LicenseType::Agent || currentLicenseType == LicenseType::Professional;
        case LicenseType::Professional:
            return currentLicenseType == LicenseType::Professional;
    }
    return false;
}

LicenseStatus LicenseManager::validateLicense()
{
    // サーバーとの通信ロジックをここに実装
    // 非同期でサーバーにライセンスキーとデバイスフィンガープリントを送信し、応答を待つ
    // 応答に基づいてcurrentStatusとcurrentLicenseTypeを更新
    validateWithServer();
    return currentStatus;
}

bool LicenseManager::canUseAgent() const
{
    if (!hasValidLicense(LicenseType::Agent))
        return false;

    if (currentLicenseType == LicenseType::Agent)
        return agentCallsThisMonth < maxAgentCallsPerMonth;

    return true; // Professionalライセンスは無制限
}

void LicenseManager::recordAgentUsage()
{
    if (currentLicenseType == LicenseType::Free)
        return;

    auto now = juce::Time::getCurrentTime();
    if (now.getMonth() != lastResetTime.getMonth() || now.getYear() != lastResetTime.getYear())
    {
        agentCallsThisMonth = 0;
        lastResetTime = now;
        saveLicenseInfo();
    }

    agentCallsThisMonth++;
    saveLicenseInfo();

    // サーバーに使用状況を報告するロジックをここに追加
    // reportUsageToServer();
}

int LicenseManager::getRemainingAgentCalls() const
{
    if (currentLicenseType == LicenseType::Agent)
        return maxAgentCallsPerMonth - agentCallsThisMonth;
    return -1; // 無制限または非適用
}

juce::String LicenseManager::getDeviceFingerprint() const
{
    if (deviceFingerprint.isEmpty())
        deviceFingerprint = generateDeviceFingerprint();
    return deviceFingerprint;
}

bool LicenseManager::isDeviceAuthorized() const
{
    // サーバーからの応答に基づいてデバイスが認証されているかを確認
    // この情報はvalidateLicense()によって更新される
    return true; // 仮実装
}

void LicenseManager::timerCallback()
{
    validateLicense(); // 定期的にライセンスを検証
}

void LicenseManager::validateWithServer()
{
    // ライセンスサーバーのURL (仮)
    juce::URL licenseServerUrl ("http://127.0.0.1:5000/validate_license");

    juce::var requestData = juce::JSON::parse("{}");
    requestData.getDynamicObject()->setProperty("license_key", licenseKey);
    requestData.getDynamicObject()->setProperty("device_fingerprint", getDeviceFingerprint());
    requestData.getDynamicObject()->setProperty("email", userEmail);

    juce::String jsonRequest = juce::JSON::toString(requestData);

    juce::StringPairArray headers;
    headers.set ("Content-Type", "application/json");

    validationTask = licenseServerUrl.create
    (juce::URL::DownloadTaskOptions()
        .withExtraHeaders(headers)
        .withPOSTData(jsonRequest)
        .withListener(this)
    );

    if (validationTask)
        validationTask->start();
}

void LicenseManager::handleValidationResponse (const juce::String& response)
{
    juce::var parsedResponse = juce::JSON::parse(response);
    if (parsedResponse.hasProperty("success") && parsedResponse["success"]){
        juce::String statusStr = parsedResponse["status"].toString();
        if (statusStr == "Valid") currentStatus = LicenseStatus::Valid;
        else if (statusStr == "Expired") currentStatus = LicenseStatus::Expired;
        else if (statusStr == "Invalid") currentStatus = LicenseStatus::Invalid;
        else if (statusStr == "DeviceLimitExceeded") currentStatus = LicenseStatus::DeviceLimitExceeded;

        juce::String typeStr = parsedResponse["license_type"].toString();
        if (typeStr == "Free") currentLicenseType = LicenseType::Free;
        else if (typeStr == "Agent") currentLicenseType = LicenseType::Agent;
        else if (typeStr == "Professional") currentLicenseType = LicenseType::Professional;

        maxAgentCallsPerMonth = parsedResponse["max_agent_calls"].getInt();
        agentCallsThisMonth = parsedResponse["agent_calls_this_month"].getInt();
        lastResetTime = juce::Time(parsedResponse["last_reset_time"].toString().getLargeIntValue());

        saveLicenseInfo();
    } else {
        currentStatus = LicenseStatus::NetworkError; // サーバーからのエラー応答もネットワークエラーとして扱う
    }
}

juce::String LicenseManager::generateDeviceFingerprint()
{
    // デバイス固有の情報を組み合わせてフィンガープリントを生成
    // 例: MACアドレス、CPU情報、OS情報などをハッシュ化
    // JUCEのSystemStats::getMacAddress()などを利用
    juce::String macAddress = juce::SystemStats::getMacAddress();
    juce::String cpuInfo = juce::SystemStats::getCpuVendor() + juce::SystemStats::getCpuModel();
    juce::String osInfo = juce::SystemStats::getOperatingSystemName();

    juce::String rawFingerprint = macAddress + cpuInfo + osInfo;
    return juce::String::toHexString(rawFingerprint.hashCode64());
}

juce::File LicenseManager::getLicenseFilePath() const
{
    return juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory)
           .getChildFile("ComposerCopilot")
           .getChildFile("license.json");
}

void LicenseManager::saveLicenseInfo()
{
    juce::var licenseData = juce::JSON::parse("{}");
    licenseData.getDynamicObject()->setProperty("license_key", licenseKey);
    licenseData.getDynamicObject()->setProperty("user_email", userEmail);
    licenseData.getDynamicObject()->setProperty("license_type", (int)currentLicenseType);
    licenseData.getDynamicObject()->setProperty("current_status", (int)currentStatus);
    licenseData.getDynamicObject()->setProperty("agent_calls_this_month", agentCallsThisMonth);
    licenseData.getDynamicObject()->setProperty("max_agent_calls_per_month", maxAgentCallsPerMonth);
    licenseData.getDynamicObject()->setProperty("last_reset_time", lastResetTime.toMilliseconds());

    juce::File licenseFile = getLicenseFilePath();
    licenseFile.createDirectory();
    licenseFile.replaceWithText(juce::JSON::toString(licenseData));
}

void LicenseManager::loadLicenseInfo()
{
    juce::File licenseFile = getLicenseFilePath();
    if (licenseFile.existsAsFile())
    {
        juce::var parsedData = juce::JSON::parse(licenseFile.loadFileAsString());
        if (parsedData.isObject())
        {
            licenseKey = parsedData.getProperty("license_key", "").toString();
            userEmail = parsedData.getProperty("user_email", "").toString();
            currentLicenseType = (LicenseType)(int)parsedData.getProperty("license_type", (int)LicenseType::Free);
            currentStatus = (LicenseStatus)(int)parsedData.getProperty("current_status", (int)LicenseStatus::Invalid);
            agentCallsThisMonth = parsedData.getProperty("agent_calls_this_month", 0);
            maxAgentCallsPerMonth = parsedData.getProperty("max_agent_calls_per_month", 0);
            lastResetTime = juce::Time(parsedData.getProperty("last_reset_time", 0LL));
        }
    }
}

void LicenseManager::downloadFinished (juce::URL::DownloadTask* task, bool success)
{
    if (task != validationTask.get())
        return;

    if (success)
    {
        juce::File tempFile = task->getTargetFile();
        juce::String responseJson = tempFile.loadFileAsString();
        handleValidationResponse(responseJson);
    }
    else
    {
        currentStatus = LicenseStatus::NetworkError;
    }
    validationTask.reset();
}

void LicenseManager::downloadProgress (juce::URL::DownloadTask* task, int bytesReceived, int totalBytes)
{
    // 進捗表示が必要な場合はここに実装
}
```

#### 設定管理システムの実装

AI機能の設定（LLMのAPIキー、ライセンスサーバーのURLなど）は、JUCEの`ApplicationProperties`クラスを使用して永続化します。これにより、ユーザーがアプリケーションの設定画面からこれらの値を変更できるようになります。

```cpp
// DemoRunner.cpp (またはメインのアプリケーションクラス) にて
// 設定の保存とロードの例

// 設定を保存
void saveAppSettings()
{
    juce::PropertiesFile::Options options;
    options.applicationName = "ComposerCopilot";
    options.filenameSuffix = ".settings";
    options.folderName = "Application Support"; // OSによって適切なパスに保存

    std::unique_ptr<juce::PropertiesFile> properties = juce::PropertiesFile::create(options);
    if (properties)
    {
        properties->setValue("llmApiKey", "YOUR_LLM_API_KEY_HERE"); // 例: APIキー
        properties->setValue("licenseServerUrl", "http://127.0.0.1:5000"); // 例: ライセンスサーバーURL
        properties->saveIfNeeded();
    }
}

// 設定をロード
void loadAppSettings()
{
    juce::PropertiesFile::Options options;
    options.applicationName = "ComposerCopilot";
    options.filenameSuffix = ".settings";
    options.folderName = "Application Support";

    std::unique_ptr<juce::PropertiesFile> properties = juce::PropertiesFile::create(options);
    if (properties)
    {
        juce::String llmApiKey = properties->getValue("llmApiKey", "");
        // MCPClientインスタンスにAPIキーを設定
        // mcpClient->setApiKey(llmApiKey);

        juce::String licenseServerUrl = properties->getValue("licenseServerUrl", "");
        // LicenseManagerインスタンスにURLを設定
        // licenseManager->setServerUrl(licenseServerUrl);
    }
}
```

#### 成果物と検証方法

-   **成果物**: `MCPClient.h`, `MCPClient.cpp`, `LicenseManager.h`, `LicenseManager.cpp`の各ファイルが`Source/AI`ディレクトリに配置され、基本的なクラス構造とメソッドが実装されていること。
-   **検証方法**: 
    1.  これらのファイルがコンパイルエラーなくビルドできること。
    2.  `MCPClient`の`generateMidi`メソッドが呼び出された際に、HTTPリクエストが正しく構築されること（デバッガやネットワークプロキシツールで確認）。
    3.  `LicenseManager`がローカルのライセンス情報を正しく保存・ロードできること。
    4.  `hasValidLicense`や`canUseAgent`メソッドが、設定されたライセンスタイプに基づいて正しいブール値を返すこと。

このステップで実装されたAIインフラストラクチャは、次のフェーズでAgent機能とGhost Text機能の具体的な実装を進めるための基盤となります。



## Phase 2: Agent機能の実装

### // STEP 5: Agent機能 (AIAgentDemo) の実装

このステップでは、AI統合DAWの主要機能の一つであるAgent機能のC++実装を行います。`AIAgentDemo`クラスを新たに作成し、ユーザーインターフェースの構築、`MCPClient`との連携、およびLLMから生成されたMIDIデータのDAWへの統合ロジックを実装します。このデモは、DemoRunnerの既存のデモと同様に、独立したコンポーネントとして機能します。

#### AIAgentDemoクラスの定義

`AIAgentDemo`は、JUCEの`Component`を継承し、ユーザーからのプロンプト入力、LLMプロバイダーの選択、MIDI生成のトリガー、および生成ステータスの表示を行います。また、`TextEditor::Listener`と`Button::Listener`を実装してUIイベントを処理し、`Timer`を使用して定期的なUI更新やステータスチェックを行います。

`Source/AI/AIAgentDemo.h`
```cpp
#pragma once

#include <JuceHeader.h>
#include "../Engine/Engine.h" // Tracktion EngineのEngineクラスへのパスを調整
#include "MCPClient.h"
#include "LicenseManager.h"

// AIAgentDemoクラスの定義
class AIAgentDemo : public juce::Component,
                   public juce::TextEditor::Listener,
                   public juce::Button::Listener,
                   public juce::Timer
{
public:
    AIAgentDemo (tracktion_engine::Engine& e);
    ~AIAgentDemo() override;
    
    // juce::Component のオーバーライド
    void paint (juce::Graphics& g) override;
    void resized() override;
    
    // juce::TextEditor::Listener のオーバーライド
    void textEditorReturnKeyPressed (juce::TextEditor& editor) override;
    
    // juce::Button::Listener のオーバーライド
    void buttonClicked (juce::Button* button) override;
    
    // juce::Timer のオーバーライド
    void timerCallback() override;
    
private:
    tracktion_engine::Engine& engine;
    std::unique_ptr<tracktion_engine::Edit> currentEdit; // 現在のEditを保持
    
    // UIコンポーネント
    juce::Label headerLabel; // ヘッダーラベル
    juce::TextEditor promptEditor; // プロンプト入力用テキストエディタ
    juce::TextButton generateButton; // 生成ボタン
    juce::ComboBox providerSelector; // LLMプロバイダー選択
    juce::Slider creativitySlider; // 創造性スライダー
    juce::Label statusLabel; // ステータス表示
    
    // AI関連オブジェクト
    MCPClient mcpClient; // MCPクライアント
    LicenseManager licenseManager; // ライセンスマネージャー
    
    // 内部状態
    bool isGenerating = false;
    juce::String currentPrompt;
    
    // ヘルパーメソッド
    void startGeneration();
    void handleGenerationComplete(const MidiSequence& sequence);
    void handleGenerationError(const juce::String& error);
    void updateUI();
    void setupUI();
    void loadSettings();
    void saveSettings();
    
    // Tracktion Engine関連ヘルパー
    tracktion_engine::AudioTrack* getOrCreateMidiTrack();
    MusicContext getCurrentMusicContext();
};
```

#### AIAgentDemoクラスの実装

`AIAgentDemo.cpp`では、UIの初期化、イベントハンドリング、および`MCPClient`と`LicenseManager`を使用したAI生成ロジックを実装します。

`Source/AI/AIAgentDemo.cpp`
```cpp
#include "AIAgentDemo.h"

AIAgentDemo::AIAgentDemo (tracktion_engine::Engine& e)
    : engine (e)
{
    // UIコンポーネントの初期化と追加
    setupUI();
    
    // MCPClientとLicenseManagerの初期設定
    // APIキーやライセンスサーバーURLは設定ファイルからロードする
    loadSettings();
    
    // デモ用のEditを作成または既存のEditを使用
    currentEdit = std::make_unique<tracktion_engine::Edit> (engine, tracktion_engine::createEmptyEdit (engine), tracktion_engine::Edit::forTesting);
    
    // 定期的なUI更新のためのタイマー開始
    startTimer (100); // 100msごとにtimerCallbackを呼び出す
}

AIAgentDemo::~AIAgentDemo()
{
    stopTimer();
    saveSettings();
    currentEdit = nullptr; // Editを適切に解放
}

void AIAgentDemo::setupUI()
{
    addAndMakeVisible (headerLabel);
    headerLabel.setText ("AI Agent: Generate MIDI", juce::dontSendNotification);
    headerLabel.setFont (juce::Font (24.0f, juce::Font::bold));
    headerLabel.setJustificationType (juce::Justification::centred);

    addAndMakeVisible (promptEditor);
    promptEditor.setMultiLine (true);
    promptEditor.setReturnKeySendsText (true);
    promptEditor.addListener (this);
    promptEditor.setText ("Generate a groovy bassline in C minor, 120bpm.", juce::dontSendNotification);

    addAndMakeVisible (generateButton);
    generateButton.setButtonText ("Generate MIDI");
    generateButton.addListener (this);

    addAndMakeVisible (providerSelector);
    providerSelector.addItem ("Claude 3.5 Sonnet", (int)MCPClient::LLMProvider::Claude + 1);
    providerSelector.addItem ("ChatGPT-4", (int)MCPClient::LLMProvider::ChatGPT + 1);
    providerSelector.addItem ("Gemini Pro", (int)MCPClient::LLMProvider::Gemini + 1);
    providerSelector.setSelectedId ((int)MCPClient::LLMProvider::Claude + 1, juce::dontSendNotification);
    providerSelector.onChange = [this] { mcpClient.setProvider ((MCPClient::LLMProvider)(providerSelector.getSelectedId() - 1)); };

    addAndMakeVisible (creativitySlider);
    creativitySlider.setRange (0.0, 1.0, 0.01);
    creativitySlider.setValue (0.7, juce::dontSendNotification);
    creativitySlider.setTextBoxStyle (juce::Slider::TextBoxRight, false, 50, 20);
    creativitySlider.setSliderStyle (juce::Slider::LinearHorizontal);

    addAndMakeVisible (statusLabel);
    statusLabel.setText ("Ready.", juce::dontSendNotification);
    statusLabel.setJustificationType (juce::Justification::centred);
}

void AIAgentDemo::paint (juce::Graphics& g)
{
    g.fillAll (getLookAndFeel().findColour (juce::ResizableWindow::backgroundColourId));
}

void AIAgentDemo::resized()
{
    auto bounds = getLocalBounds();
    headerLabel.setBounds (bounds.removeFromTop (50));
    promptEditor.setBounds (bounds.removeFromTop (150).reduced (10));
    
    auto buttonArea = bounds.removeFromTop (50).reduced (10);
    generateButton.setBounds (buttonArea.removeFromLeft (buttonArea.getWidth() / 2 - 5));
    providerSelector.setBounds (buttonArea.reduced (5));

    creativitySlider.setBounds (bounds.removeFromTop (30).reduced (10));
    statusLabel.setBounds (bounds.removeFromBottom (30));
}

void AIAgentDemo::textEditorReturnKeyPressed (juce::TextEditor& editor)
{
    if (&editor == &promptEditor)
    {
        generateButton.triggerClick(); // Enterキーで生成を開始
    }
}

void AIAgentDemo::buttonClicked (juce::Button* button)
{
    if (button == &generateButton)
    {
        startGeneration();
    }
}

void AIAgentDemo::timerCallback()
{
    updateUI();
}

void AIAgentDemo::startGeneration()
{
    if (isGenerating)
        return;

    currentPrompt = promptEditor.getText();
    if (currentPrompt.isEmpty())
    {
        statusLabel.setText ("Please enter a prompt.", juce::dontSendNotification);
        return;
    }

    // ライセンス検証
    if (!licenseManager.hasValidLicense(LicenseManager::LicenseType::Agent))
    {
        statusLabel.setText ("Agent feature requires a valid license.", juce::dontSendNotification);
        return;
    }
    
    isGenerating = true;
    updateUI();
    statusLabel.setText ("Generating MIDI...", juce::dontSendNotification);

    // 現在の音楽コンテキストを収集
    MusicContext context = getCurrentMusicContext();
    
    // LLMにリクエストを送信
    mcpClient.generateMidi(currentPrompt, context)
        .then([this](const MidiSequence& sequence)
        {
            juce::MessageManager::callAsync ([this, sequence] {
                handleGenerationComplete(sequence);
            });
        })
        .onError([this](const juce::String& error)
        {
            juce::MessageManager::callAsync ([this, error] {
                handleGenerationError(error);
            });
        });

    licenseManager.recordAgentUsage(); // 使用量を記録
}

void AIAgentDemo::handleGenerationComplete(const MidiSequence& sequence)
{
    isGenerating = false;
    updateUI();
    statusLabel.setText ("MIDI generation complete!", juce::dontSendNotification);

    // 生成されたMIDIデータをDAWに統合
    tracktion_engine::AudioTrack* midiTrack = getOrCreateMidiTrack();
    if (midiTrack)
    {
        auto& clipManager = currentEdit->getClipManager();
        auto newMidiClip = clipManager.createMidiClip (*midiTrack, currentEdit->getTransport().getCurrentPosition(), 4.0); // 4拍のクリップを仮作成
        
        if (newMidiClip)
        {
            auto& midiList = newMidiClip->getMidiList();
            for (const auto& msg : sequence.messages)
            {
                midiList.addMidiMessage (msg);
            }
            newMidiClip->getMidiList().sort(); // MIDIメッセージを時間順にソート
            newMidiClip->getMidiList().updateMatchedPairs(); // Note On/Offペアを更新
            newMidiClip->getMidiList().updateMissingOffs(); // 欠落したNote Offを追加
            newMidiClip->getMidiList().updateNoteLengthFromOffEvents(); // Note Offイベントからノート長を更新
            newMidiClip->getMidiList().updateQuantisation(); // クオンタイズ情報を更新
            newMidiClip->getMidiList().updateLoopPoints(); // ループポイントを更新
            
            // クリップの長さをMIDIデータに合わせて調整
            newMidiClip->setLength (newMidiClip->getMidiList().getEndTime() - newMidiClip->getMidiList().getStartTime());
            newMidiClip->setPosition (newMidiClip->getMidiList().getStartTime());
        }
    }
}

void AIAgentDemo::handleGenerationError(const juce::String& error)
{
    isGenerating = false;
    updateUI();
    statusLabel.setText ("Error: " + error, juce::dontSendNotification);
}

void AIAgentDemo::updateUI()
{
    promptEditor.setEnabled (!isGenerating);
    generateButton.setEnabled (!isGenerating && licenseManager.canUseAgent());
    providerSelector.setEnabled (!isGenerating);
    creativitySlider.setEnabled (!isGenerating);

    // ライセンスの状態に応じてボタンのテキストを更新
    if (!licenseManager.hasValidLicense(LicenseManager::LicenseType::Agent))
    {
        generateButton.setButtonText ("Requires License");
    }
    else if (!licenseManager.canUseAgent())
    {
        generateButton.setButtonText ("Usage Limit Reached");
    }
    else
    {
        generateButton.setButtonText ("Generate MIDI");
    }
}

void AIAgentDemo::loadSettings()
{
    // JUCEのApplicationPropertiesから設定をロード
    juce::PropertiesFile::Options options;
    options.applicationName = "ComposerCopilot";
    options.filenameSuffix = ".settings";
    options.folderName = "Application Support";

    std::unique_ptr<juce::PropertiesFile> properties = juce::PropertiesFile::create(options);
    if (properties)
    {
        juce::String llmApiKey = properties->getValue ("llmApiKey", "");
        mcpClient.setApiKey (llmApiKey);
        
        int providerId = properties->getIntValue ("llmProvider", (int)MCPClient::LLMProvider::Claude);
        providerSelector.setSelectedId (providerId + 1, juce::dontSendNotification);
        mcpClient.setProvider ((MCPClient::LLMProvider)providerId);

        // ライセンスキーやユーザーメールもここでロードし、LicenseManagerに設定
        licenseManager.licenseKey = properties->getValue("licenseKey", "");
        licenseManager.userEmail = properties->getValue("userEmail", "");
        licenseManager.validateLicense(); // ロード後に一度検証
    }
}

void AIAgentDemo::saveSettings()
{
    // JUCEのApplicationPropertiesに設定を保存
    juce::PropertiesFile::Options options;
    options.applicationName = "ComposerCopilot";
    options.filenameSuffix = ".settings";
    options.folderName = "Application Support";

    std::unique_ptr<juce::PropertiesFile> properties = juce::PropertiesFile::create(options);
    if (properties)
    {
        properties->setValue ("llmProvider", providerSelector.getSelectedId() - 1);
        // APIキーは機密情報のため、通常は保存しないか、暗号化して保存する
        // properties->setValue ("llmApiKey", mcpClient.getApiKey());
        properties->saveIfNeeded();
    }
}

tracktion_engine::AudioTrack* AIAgentDemo::getOrCreateMidiTrack()
{
    // 現在のEditにMIDIトラックが存在しない場合、新しいトラックを作成
    if (currentEdit->getTrackList().getNumTracks() == 0)
    {
        return currentEdit->getTrackList().insertAudioTrack (0);
    }
    // 既存の最初のオーディオトラックをMIDIトラックとして使用
    return currentEdit->getTrackList().getAudioTrack(0);
}

MusicContext AIAgentDemo::getCurrentMusicContext()
{
    MusicContext context;
    if (currentEdit)
    {
        context.tempo = currentEdit->getTransport().getTempo();
        context.timeSignature = currentEdit->getTransport().getTimeSignature().toString();
        // TODO: 現在のキーを検出するロジックを追加
        // TODO: 既存のMIDIクリップ情報をcontext.existingTracksに追加するロジックを追加
    }
    return context;
}
```

#### DemoRunnerへの統合

`AIAgentDemo`をDemoRunnerのメインアプリケーションに統合するには、`DemoRunner.cpp`または`MainComponent.cpp`で`AIAgentDemo`のインスタンスを作成し、メインウィンドウに追加します。これにより、Agent機能がDemoRunnerの他のデモと並行して表示され、アクセス可能になります。

```cpp
// DemoRunner.cpp (または MainComponent.cpp) の一部
// 例えば、DemoRunnerのメインウィンドウにタブとして追加する場合

// MainComponent::MainComponent(Engine& e) コンストラクタ内
// ... 既存のデモの追加 ...

// AI Agent Demoの追加
addTab ("AI Agent", juce::Colours::lightgrey, new AIAgentDemo (e), true);

// ...
```

#### 成果物と検証方法

-   **成果物**: `Source/AI/AIAgentDemo.h`および`Source/AI/AIAgentDemo.cpp`ファイルが実装され、DemoRunnerプロジェクトに統合されていること。
-   **検証方法**: 
    1.  DemoRunnerをビルドし、起動すること。
    2.  アプリケーションのUIに「AI Agent」タブまたはセクションが表示され、`AIAgentDemo`のUIコンポーネント（プロンプトエディタ、生成ボタン、プロバイダー選択など）が正しく表示されること。
    3.  プロンプトを入力し、「Generate MIDI」ボタンをクリックした際に、`statusLabel`が「Generating MIDI...」と表示され、その後「MIDI generation complete!」またはエラーメッセージが表示されること。
    4.  生成が完了した後、DAWのタイムラインに新しいMIDIクリップが追加され、再生可能であること。
    5.  ライセンスがない場合や使用量制限に達した場合に、生成ボタンが非活性化され、適切なメッセージが表示されること。
    6.  `MCPClient`がLLMと正しく通信し、有効なMIDIデータを返すことを確認するために、デバッガやネットワークプロキシツールを使用して通信内容を監視すること。

このステップが完了すると、AI統合DAWの主要な機能であるAgent機能が動作するようになります。



## Phase 3: Ghost Text機能の実装

### // STEP 6: Ghost Text機能 (GhostTextDemo) の実装

このステップでは、AI統合DAWのもう一つの主要機能であるGhost Text機能のC++実装を行います。`GhostTextDemo`クラスを新たに作成し、ユーザーのMIDI入力をリアルタイムで監視し、ローカルPython AIサーバーと連携して予測されたノートをDAWのピアノロール上に視覚的に表示するロジックを実装します。このデモも、DemoRunnerの既存のデモと同様に、独立したコンポーネントとして機能します。

#### GhostTextDemoクラスの定義

`GhostTextDemo`は、JUCEの`Component`と`MidiInputCallback`を継承し、MIDI入力の処理、予測結果のUI表示、およびPython AIサーバーとの通信を管理します。また、`Timer`を使用して定期的な予測更新を行います。

`Source/AI/GhostTextDemo.h`
```cpp
#pragma once

#include <JuceHeader.h>
#include "../Engine/Engine.h" // Tracktion EngineのEngineクラスへのパスを調整
#include "GhostTextClient.h"

// 予測されたノートの構造体
struct PredictedNote
{
    int noteNumber;
    int velocity;
    double startTime;
    double duration;
    float probability;
    int rank;
};

// GhostTextDemoクラスの定義
class GhostTextDemo : public juce::Component,
                     public juce::MidiInputCallback,
                     public juce::Timer
{
public:
    GhostTextDemo (tracktion_engine::Engine& e);
    ~GhostTextDemo() override;
    
    // juce::Component のオーバーライド
    void paint (juce::Graphics& g) override;
    void resized() override;
    
    // juce::MidiInputCallback のオーバーライド
    void handleIncomingMidiMessage (juce::MidiInput* source, 
                                   const juce::MidiMessage& message) override;
    
    // juce::Timer のオーバーライド
    void timerCallback() override;
    
private:
    tracktion_engine::Engine& engine;
    std::unique_ptr<tracktion_engine::Edit> currentEdit; // 現在のEditを保持
    
    // UIコンポーネント
    juce::Label headerLabel; // ヘッダーラベル
    juce::ToggleButton ghostTextToggle; // Ghost Text機能の有効/無効切り替え
    juce::ComboBox midiInputSelector; // MIDI入力デバイス選択
    juce::Slider sensitivitySlider; // 予測感度調整
    juce::Label statusLabel; // ステータス表示
    
    // AI関連オブジェクト
    GhostTextClient ghostClient; // Python AIサーバー通信クライアント
    
    // 内部状態
    juce::Array<juce::MidiMessage> recentInput; // 最近のMIDI入力履歴
    juce::Array<PredictedNote> currentPredictions; // 現在の予測結果
    juce::Time lastInputTime; // 最後のMIDI入力時刻
    
    // ヘルパーメソッド
    void setupUI();
    void loadSettings();
    void saveSettings();
    void updateUI();
    void paintGhostNotes (juce::Graphics& g); // ゴーストノートの描画
    void updatePredictions(); // 予測の更新とUI反映
    void addToRecentInput (const juce::MidiMessage& message); // 入力履歴に追加
    void clearRecentInput(); // 入力履歴をクリア
    
    // 定数
    static constexpr int maxRecentInputSize = 64; // 最近の入力履歴の最大サイズ
    static constexpr int predictionUpdateIntervalMs = 100; // 予測更新間隔（ミリ秒）
};
```

#### GhostTextDemoクラスの実装

`GhostTextDemo.cpp`では、UIの初期化、MIDI入力の処理、`GhostTextClient`との連携、および予測されたノートの描画ロジックを実装します。

`Source/AI/GhostTextDemo.cpp`
```cpp
#include "GhostTextDemo.h"

GhostTextDemo::GhostTextDemo (tracktion_engine::Engine& e)
    : engine (e)
{
    setupUI();
    loadSettings();
    
    currentEdit = std::make_unique<tracktion_engine::Edit> (engine, tracktion_engine::createEmptyEdit (engine), tracktion_engine::Edit::forTesting);
    
    // MIDI入力デバイスの列挙と選択
    auto midiInputs = juce::MidiInput::get=AvailableDevices();
    for (int i = 0; i < midiInputs.size(); ++i)
    {
        midiInputSelector.addItem (midiInputs[i].name, i + 1);
    }
    midiInputSelector.onChange = [this, midiInputs] {
        auto index = midiInputSelector.getSelectedId() - 1;
        if (index >= 0 && index < midiInputs.size())
        {
            engine.getDeviceManager().setMidiInputDeviceEnabled (midiInputs[index].identifier, true);
            engine.getDeviceManager().addMidiInputDeviceCallback (midiInputs[index].identifier, this);
        }
    };
    if (midiInputs.size() > 0)
        midiInputSelector.setSelectedId (1, juce::dontSendNotification);

    startTimer (predictionUpdateIntervalMs); // 定期的な予測更新のためのタイマー開始
}

GhostTextDemo::~GhostTextDemo()
{
    stopTimer();
    saveSettings();
    // MIDI入力デバイスのコールバックを解除
    auto midiInputs = juce::MidiInput::getAvailableDevices();
    for (int i = 0; i < midiInputs.size(); ++i)
    {
        engine.getDeviceManager().removeMidiInputDeviceCallback (midiInputs[i].identifier, this);
    }
    currentEdit = nullptr;
}

void GhostTextDemo::setupUI()
{
    addAndMakeVisible (headerLabel);
    headerLabel.setText ("AI Ghost Text: Real-time MIDI Prediction", juce::dontSendNotification);
    headerLabel.setFont (juce::Font (24.0f, juce::Font::bold));
    headerLabel.setJustificationType (juce::Justification::centred);

    addAndMakeVisible (ghostTextToggle);
    ghostTextToggle.setButtonText ("Enable Ghost Text");
    ghostTextToggle.onClick = [this] { updateUI(); };

    addAndMakeVisible (midiInputSelector);
    midiInputSelector.setEditableText (false);

    addAndMakeVisible (sensitivitySlider);
    sensitivitySlider.setRange (0.0, 1.0, 0.01);
    sensitivitySlider.setValue (0.5, juce::dontSendNotification);
    sensitivitySlider.setTextBoxStyle (juce::Slider::TextBoxRight, false, 50, 20);
    sensitivitySlider.setSliderStyle (juce::Slider::LinearHorizontal);

    addAndMakeVisible (statusLabel);
    statusLabel.setText ("Waiting for MIDI input...", juce::dontSendNotification);
    statusLabel.setJustificationType (juce::Justification::centred);
}

void GhostTextDemo::paint (juce::Graphics& g)
{
    g.fillAll (getLookAndFeel().findColour (juce::ResizableWindow::backgroundColourId));
    
    if (ghostTextToggle.getToggleState())
    {
        paintGhostNotes (g);
    }
}

void GhostTextDemo::resized()
{
    auto bounds = getLocalBounds();
    headerLabel.setBounds (bounds.removeFromTop (50));
    ghostTextToggle.setBounds (bounds.removeFromTop (30).reduced (10));
    midiInputSelector.setBounds (bounds.removeFromTop (30).reduced (10));
    sensitivitySlider.setBounds (bounds.removeFromTop (30).reduced (10));
    statusLabel.setBounds (bounds.removeFromBottom (30));
}

void GhostTextDemo::handleIncomingMidiMessage (juce::MidiInput* source, 
                                               const juce::MidiMessage& message)
{
    if (ghostTextToggle.getToggleState())
    {
        // リアルタイムMIDI入力を処理
        if (message.isNoteOn() || message.isNoteOff())
        {
            addToRecentInput (message);
            lastInputTime = juce::Time::getCurrentTime();
            // 予測を即座に更新
            updatePredictions();
        }
    }
}

void GhostTextDemo::timerCallback()
{
    // 定期的に予測を更新（入力がない場合でも）
    if (ghostTextToggle.getToggleState())
    {
        auto timeSinceLastInput = juce::Time::getCurrentTime() - lastInputTime;
        // 一定時間入力がない場合は予測を停止またはクリア
        if (timeSinceLastInput.inMilliseconds() > 2000 && !currentPredictions.isEmpty())
        {
            currentPredictions.clear();
            repaint();
            statusLabel.setText ("Waiting for MIDI input...", juce::dontSendNotification);
        }
        else if (timeSinceLastInput.inMilliseconds() <= 2000)
        {
            // 入力がある場合は予測を継続
            updatePredictions();
        }
    }
}

void GhostTextDemo::paintGhostNotes (juce::Graphics& g)
{
    // ここで予測されたノートをDAWのピアノロール風に描画するロジックを実装
    // 簡略化のため、矩形として描画
    g.setColour (juce::Colours::cyan.withAlpha (0.5f)); // 半透明のシアン

    // 実際のピアノロールの座標系に変換する必要がある
    // ここでは仮の描画ロジック
    float noteHeight = 20.0f; // ノートの高さ
    float startX = 50.0f; // 描画開始X座標
    float startY = 100.0f; // 描画開始Y座標

    for (const auto& predictedNote : currentPredictions)
    {
        // MIDIノート番号をY座標に変換 (高いノートほど上に来るように)
        float y = startY + (127 - predictedNote.noteNumber) * (noteHeight / 2);
        // 予測の開始時刻と長さをX座標と幅に変換
        float x = startX + (float)predictedNote.startTime * 50.0f; // 仮のスケール
        float width = (float)predictedNote.duration * 50.0f; // 仮のスケール

        g.drawRect (x, y, width, noteHeight, 2.0f); // 枠線
        g.fillRect (x, y, width, noteHeight); // 塗りつぶし

        // 予測確率を表示（オプション）
        g.setColour (juce::Colours::white);
        g.drawText (juce::String (predictedNote.noteNumber) + " (" + juce::String (predictedNote.probability, 2) + ")",
                    x, y, width, noteHeight, juce::Justification::centred, true);
        g.setColour (juce::Colours::cyan.withAlpha (0.5f)); // 色を戻す
    }
}

void GhostTextDemo::updatePredictions()
{
    if (!ghostTextToggle.getToggleState())
    {
        currentPredictions.clear();
        repaint();
        return;
    }

    if (recentInput.isEmpty())
    {
        currentPredictions.clear();
        repaint();
        statusLabel.setText ("Waiting for MIDI input...", juce::dontSendNotification);
        return;
    }

    statusLabel.setText ("Predicting next notes...", juce::dontSendNotification);

    // GhostTextClientを介してPython AIサーバーにリクエストを送信
    ghostClient.requestPrediction (recentInput)
        .then([this](const juce::Array<PredictedNote>& predictions)
        {
            juce::MessageManager::callAsync ([this, predictions] {
                currentPredictions = predictions;
                repaint(); // UIを再描画してゴーストノートを表示
                statusLabel.setText ("Prediction updated.", juce::dontSendNotification);
            });
        })
        .onError([this](const juce::String& error)
        {
            juce::MessageManager::callAsync ([this, error] {
                statusLabel.setText ("Prediction Error: " + error, juce::dontSendNotification);
                currentPredictions.clear();
                repaint();
            });
        });
}

void GhostTextDemo::addToRecentInput (const juce::MidiMessage& message)
{
    recentInput.add (message);
    if (recentInput.size() > maxRecentInputSize)
        recentInput.remove (0); // 古いメッセージを削除
}

void GhostTextDemo::clearRecentInput()
{
    recentInput.clear();
}

void GhostTextDemo::loadSettings()
{
    juce::PropertiesFile::Options options;
    options.applicationName = "ComposerCopilot";
    options.filenameSuffix = ".settings";
    options.folderName = "Application Support";

    std::unique_ptr<juce::PropertiesFile> properties = juce::PropertiesFile::create(options);
    if (properties)
    {
        ghostTextToggle.setToggleState (properties->getBoolValue ("ghostTextEnabled", false), juce::dontSendNotification);
        sensitivitySlider.setValue (properties->getDoubleValue ("ghostTextSensitivity", 0.5), juce::dontSendNotification);
    }
}

void GhostTextDemo::saveSettings()
{
    juce::PropertiesFile::Options options;
    options.applicationName = "ComposerCopilot";
    options.filenameSuffix = ".settings";
    options.folderName = "Application Support";

    std::unique_ptr<juce::PropertiesFile> properties = juce::PropertiesFile::create(options);
    if (properties)
    {
        properties->setValue ("ghostTextEnabled", ghostTextToggle.getToggleState());
        properties->setValue ("ghostTextSensitivity", sensitivitySlider.getValue());
        properties->saveIfNeeded();
    }
}
```

#### GhostTextClientクラスの実装

`GhostTextClient`クラスは、ローカルで動作するPython AIサーバーとHTTP通信を行うためのクライアントです。MIDIメッセージのJSON変換、HTTPリクエストの送信、およびサーバーからのJSON応答のパースを担当します。

`Source/AI/GhostTextClient.h`
```cpp
#pragma once

#include <JuceHeader.h>

// PredictedNote構造体はGhostTextDemo.hで定義済み
struct PredictedNote;

// 非同期処理のためのFuture/Promiseライクなクラス（MCPClientと同様）
template <typename T>
class Future
{
public:
    using CallbackType = std::function<void(const T&)>;
    using ErrorCallbackType = std::function<void(const juce::String&)>;

    Future() = default;

    void then(CallbackType cb) { successCallback = cb; }
    void onError(ErrorCallbackType cb) { errorCallback = cb; }

    void resolve(const T& result) { if (successCallback) successCallback(result); }
    void reject(const juce::String& error) { if (errorCallback) errorCallback(error); }

private:
    CallbackType successCallback;
    ErrorCallbackType errorCallback;
};

class GhostTextClient : public juce::URL::DownloadTask::Listener
{
public:
    GhostTextClient();
    ~GhostTextClient() override;
    
    // Python AIサーバーに予測リクエストを送信
    Future<juce::Array<PredictedNote>> requestPrediction (const juce::Array<juce::MidiMessage>& recentInput);
    
    // Python AIサーバーの接続状態を確認
    bool isServerAvailable() const;
    
    // juce::URL::DownloadTask::Listener のオーバーライド
    void downloadFinished (juce::URL::DownloadTask* task, bool success) override;
    void downloadProgress (juce::URL::DownloadTask* task, int bytesReceived, int totalBytes) override;

private:
    juce::String serverUrl = "http://127.0.0.1:8888/predict"; // Python AIサーバーのURL
    juce::String healthCheckUrl = "http://127.0.0.1:8888/health"; // ヘルスチェックURL
    std::unique_ptr<juce::URL::DownloadTask> currentTask;
    Future<juce::Array<PredictedNote>> currentFuture; // 現在のリクエストに対応するFuture
    
    // MIDIメッセージとJSON間の変換ユーティリティ
    juce::String midiMessagesToJson (const juce::Array<juce::MidiMessage>& messages);
    juce::Array<PredictedNote> jsonToPredictions (const juce::String& json);
};
```

`Source/AI/GhostTextClient.cpp`
```cpp
#include "GhostTextClient.h"
#include "GhostTextDemo.h" // PredictedNoteの定義のため

GhostTextClient::GhostTextClient()
{
}

GhostTextClient::~GhostTextClient()
{
    if (currentTask)
        currentTask->cancel();
}

Future<juce::Array<PredictedNote>> GhostTextClient::requestPrediction (const juce::Array<juce::MidiMessage>& recentInput)
{
    if (currentTask && currentTask->isCurrentlyRunning())
    {
        currentFuture.reject("Another request is already in progress.");
        return currentFuture;
    }

    juce::String jsonRequest = midiMessagesToJson(recentInput);

    juce::URL apiUrl (serverUrl);
    juce::StringPairArray headers;
    headers.set ("Content-Type", "application/json");

    currentTask = apiUrl.create
    (juce::URL::DownloadTaskOptions()
        .withExtraHeaders(headers)
        .withPOSTData(jsonRequest)
        .withListener(this)
    );

    if (currentTask)
        currentTask->start();
    else
        currentFuture.reject("Failed to create download task.");

    return currentFuture;
}

bool GhostTextClient::isServerAvailable() const
{
    // ヘルスチェックエンドポイントを叩いてサーバーの稼働状況を確認
    // 同期的に確認するか、定期的な非同期チェックを実装する
    // ここでは簡略化のため常にtrueを返す（実際にはHTTPリクエストを送信）
    return true; 
}

void GhostTextClient::downloadFinished (juce::URL::DownloadTask* task, bool success)
{
    if (task != currentTask.get())
        return;

    if (success)
    {
        juce::File tempFile = task->getTargetFile();
        juce::String responseJson = tempFile.loadFileAsString();
        juce::Array<PredictedNote> predictions = jsonToPredictions(responseJson);
        currentFuture.resolve(predictions);
    }
    else
    {
        currentFuture.reject("Network error or Python AI server not responding.");
    }
    currentTask.reset();
}

void GhostTextClient::downloadProgress (juce::URL::DownloadTask* task, int bytesReceived, int totalBytes)
{
    // 進捗表示が必要な場合はここに実装
}

juce::String GhostTextClient::midiMessagesToJson (const juce::Array<juce::MidiMessage>& messages)
{
    juce::Array<juce::var> midiArray;
    for (const auto& msg : messages)
    {
        juce::var midiMsgObj = juce::JSON::parse("{}");
        midiMsgObj.getDynamicObject()->setProperty("timestamp", msg.getTimeStamp());
        midiMsgObj.getDynamicObject()->setProperty("isNoteOn", msg.isNoteOn());
        midiMsgObj.getDynamicObject()->setProperty("isNoteOff", msg.isNoteOff());
        midiMsgObj.getDynamicObject()->setProperty("noteNumber", msg.getNoteNumber());
        midiMsgObj.getDynamicObject()->setProperty("velocity", msg.getVelocity());
        midiMsgObj.getDynamicObject()->setProperty("channel", msg.getChannel());
        midiArray.add(midiMsgObj);
    }
    juce::var requestData = juce::JSON::parse("{}");
    requestData.getDynamicObject()->setProperty("midi_sequence", midiArray);
    return juce::JSON::toString(requestData);
}

juce::Array<PredictedNote> GhostTextClient::jsonToPredictions (const juce::String& json)
{
    juce::Array<PredictedNote> predictions;
    juce::var parsedResponse = juce::JSON::parse(json);

    if (parsedResponse.hasProperty("predictions"))
    {
        juce::Array<juce::var>* predictionsArray = parsedResponse["predictions"].getArray();
        if (predictionsArray)
        {
            for (auto& predVar : *predictionsArray)
            {
                if (predVar.isObject())
                {
                    juce::DynamicObject* predObj = predVar.getDynamicObject();
                    PredictedNote pn;
                    pn.noteNumber = predObj->getProperty("note", juce::var()).getProperty("noteNumber", 0);
                    pn.velocity = predObj->getProperty("note", juce::var()).getProperty("velocity", 0);
                    pn.startTime = predObj->getProperty("note", juce::var()).getProperty("startTime", 0.0);
                    pn.duration = predObj->getProperty("note", juce::var()).getProperty("duration", 0.0);
                    pn.probability = (float)predObj->getProperty("probability", 0.0);
                    pn.rank = predObj->getProperty("rank", 0);
                    predictions.add(pn);
                }
            }
        }
    }
    return predictions;
}
```

#### Python AIサーバーの準備

Ghost Text機能が動作するためには、ローカルでPython AIサーバーを起動しておく必要があります。`python_ai/ghost_text_server.py`ファイルを作成し、必要なPythonライブラリをインストールします。

`python_ai/requirements.txt`
```
flask
torch
transformers
music21
```

`python_ai/ghost_text_server.py` (詳細は技術仕様書を参照)
```python
# ... (技術仕様書に記載のPythonコードをここに配置) ...
```

Python AIサーバーを起動するためのスクリプトも作成します。

`scripts/start_ghost_server.bat` (Windows)
```batch
@echo off
cd python_ai
call venv\Scripts\activate
python ghost_text_server.py
pause
```

`scripts/start_ghost_server.sh` (macOS/Linux)
```bash
#!/bin/bash
cd python_ai
source venv/bin/activate
python ghost_text_server.py
```

#### DemoRunnerへの統合

`GhostTextDemo`をDemoRunnerのメインアプリケーションに統合するには、`DemoRunner.cpp`または`MainComponent.cpp`で`GhostTextDemo`のインスタンスを作成し、メインウィンドウに追加します。

```cpp
// DemoRunner.cpp (または MainComponent.cpp) の一部
// 例えば、DemoRunnerのメインウィンドウにタブとして追加する場合

// MainComponent::MainComponent(Engine& e) コンストラクタ内
// ... 既存のデモの追加 ...

// AI Ghost Text Demoの追加
addTab ("AI Ghost Text", juce::Colours::lightgrey, new GhostTextDemo (e), true);

// ...
```

#### 成果物と検証方法

-   **成果物**: `Source/AI/GhostTextDemo.h`, `Source/AI/GhostTextDemo.cpp`, `Source/AI/GhostTextClient.h`, `Source/AI/GhostTextClient.cpp`ファイルが実装され、`python_ai`ディレクトリにPython AIサーバー関連ファイルが配置されていること。
-   **検証方法**: 
    1.  Python AIサーバーを起動し、正常に動作していることを確認する。
    2.  DemoRunnerをビルドし、起動すること。
    3.  アプリケーションのUIに「AI Ghost Text」タブまたはセクションが表示され、`GhostTextDemo`のUIコンポーネントが正しく表示されること。
    4.  MIDI入力デバイスを選択し、Ghost Text機能を有効にした状態でMIDIキーボードからノートを入力すると、ピアノロール風の領域に予測されたゴーストノートが表示されること。
    5.  `GhostTextClient`がPython AIサーバーと正しく通信し、予測結果を取得していることを確認するために、デバッガやネットワークプロキシツールを使用して通信内容を監視すること。

このステップが完了すると、AI統合DAWのもう一つの主要な機能であるGhost Text機能が動作するようになります。



()->setProperty("messages", juce::JSON::parse("[]"));
        requestData.getDynamicObject()->getProperty("messages").getArray()->add(juce::JSON::parse("{\"role\": \"user\", \"content\": \"" + prompt + "\"}"));
        
        // 音楽コンテキストをシステムプロンプトとして追加
        juce::String systemPrompt = "You are a music generation AI. Generate MIDI data based on the user's prompt. Current music context: Tempo: " + juce::String(context.tempo) + ", Time Signature: " + context.timeSignature + ", Key: " + context.key + ". Existing tracks: " + context.existingTracks + ". Output only the MIDI data in a JSON format like: {\"midi_sequence\": [{\"note\": 60, \"velocity\": 100, \"start_time\": 0.0, \"duration\": 1.0}, ...]}.";
        requestData.getDynamicObject()->getProperty("messages").getArray()->insert(0, juce::JSON::parse("{\"role\": \"system\", \"content\": \"" + systemPrompt + "\"}"));

        requestData.getDynamicObject()->setProperty("max_tokens", providerConfigs[currentProvider].maxTokens);
        requestData.getDynamicObject()->setProperty("temperature", providerConfigs[currentProvider].temperature);
        requestData.getDynamicObject()->setProperty("model", providerConfigs[currentProvider].modelName);

        // Claude specific
        requestData.getDynamicObject()->setProperty("stream", false);
    }
    else if (currentProvider == LLMProvider::ChatGPT)
    {
        requestData = juce::JSON::parse("{}");
        requestData.getDynamicObject()->setProperty("model", providerConfigs[currentProvider].modelName);
        requestData.getDynamicObject()->setProperty("messages", juce::JSON::parse("[]"));
        requestData.getDynamicObject()->getProperty("messages").getArray()->add(juce::JSON::parse("{\"role\": \"user\", \"content\": \"" + prompt + "\"}"));

        // 音楽コンテキストをシステムプロンプトとして追加
        juce::String systemPrompt = "You are a music generation AI. Generate MIDI data based on the user's prompt. Current music context: Tempo: " + juce::String(context.tempo) + ", Time Signature: " + context.timeSignature + ", Key: " + context.key + ". Existing tracks: " + context.existingTracks + ". Output only the MIDI data in a JSON format like: {\"midi_sequence\": [{\"note\": 60, \"velocity\": 100, \"start_time\": 0.0, \"duration\": 1.0}, ...]}.";
        requestData.getDynamicObject()->getProperty("messages").getArray()->insert(0, juce::JSON::parse("{\"role\": \"system\", \"content\": \"" + systemPrompt + "\"}"));

        requestData.getDynamicObject()->setProperty("max_tokens", providerConfigs[currentProvider].maxTokens);
        requestData.getDynamicObject()->setProperty("temperature", providerConfigs[currentProvider].temperature);
    }
    else if (currentProvider == LLMProvider::Gemini)
    {
        requestData = juce::JSON::parse("{}");
        requestData.getDynamicObject()->setProperty("contents", juce::JSON::parse("[]"));
        requestData.getDynamicObject()->getProperty("contents").getArray()->add(juce::JSON::parse("{\"role\": \"user\", \"parts\": [{\"text\": \"" + prompt + "\"}]}"));

        // 音楽コンテキストをシステムプロンプトとして追加
        juce::String systemPrompt = "You are a music generation AI. Generate MIDI data based on the user's prompt. Current music context: Tempo: " + juce::String(context.tempo) + ", Time Signature: " + context.timeSignature + ", Key: " + context.key + ". Existing tracks: " + context.existingTracks + ". Output only the MIDI data in a JSON format like: {\"midi_sequence\": [{\"note\": 60, \"velocity\": 100, \"start_time\": 0.0, \"duration\": 1.0}, ...]}.";
        requestData.getDynamicObject()->getProperty("contents").getArray()->insert(0, juce::JSON::parse("{\"role\": \"user\", \"parts\": [{\"text\": \"" + systemPrompt + "\"}]}"));

        juce::var generationConfig = juce::JSON::parse("{}");
        generationConfig.getDynamicObject()->setProperty("maxOutputTokens", providerConfigs[currentProvider].maxTokens);
        generationConfig.getDynamicObject()->setProperty("temperature", providerConfigs[currentProvider].temperature);
        requestData.getDynamicObject()->setProperty("generationConfig", generationConfig);
    }

    return juce::JSON::toString(requestData);
}

MidiSequence MCPClient::parseLlmResponse(const juce::String& responseJson)
{
    MidiSequence sequence;
    juce::var parsedResponse = juce::JSON::parse(responseJson);

    if (currentProvider == LLMProvider::Claude)
    {
        if (parsedResponse.hasProperty("content"))
        {
            juce::Array<juce::var>* contentArray = parsedResponse["content"].getArray();
            if (contentArray && contentArray->size() > 0)
            {
                juce::String textContent = (*contentArray)[0].getProperty("text", "");
                // Extract JSON from markdown code block
                int jsonStart = textContent.indexOf("```json");
                int jsonEnd = textContent.indexOf("```", jsonStart + 7);
                if (jsonStart != -1 && jsonEnd != -1)
                {
                    juce::String jsonBlock = textContent.substring(jsonStart + 7, jsonEnd).trim();
                    juce::var midiData = juce::JSON::parse(jsonBlock);
                    if (midiData.hasProperty("midi_sequence"))
                    {
                        juce::Array<juce::var>* midiArray = midiData["midi_sequence"].getArray();
                        if (midiArray)
                        {
                            for (auto& noteVar : *midiArray)
                            {
                                if (noteVar.isObject())
                                {
                                    juce::DynamicObject* noteObj = noteVar.getDynamicObject();
                                    int noteNumber = noteObj->getProperty("note", 0);
                                    int velocity = noteObj->getProperty("velocity", 0);
                                    double startTime = noteObj->getProperty("start_time", 0.0);
                                    double duration = noteObj->getProperty("duration", 0.0);

                                    // Convert start_time and duration to MIDI ticks or quarter notes if necessary
                                    // For simplicity, assuming start_time and duration are in quarter notes
                                    // and converting to seconds for JUCE MidiMessage
                                    // This needs proper tempo handling for accurate conversion
                                    juce::MidiMessage noteOn = juce::MidiMessage::noteOn(1, noteNumber, (juce::uint8)velocity);
                                    noteOn.setTimeStamp(startTime); // Assuming startTime is in seconds
                                    sequence.messages.add(noteOn);

                                    juce::MidiMessage noteOff = juce::MidiMessage::noteOff(1, noteNumber, (juce::uint8)0);
                                    noteOff.setTimeStamp(startTime + duration); // Assuming duration is in seconds
                                    sequence.messages.add(noteOff);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    else if (currentProvider == LLMProvider::ChatGPT)
    {
        if (parsedResponse.hasProperty("choices"))
        {
            juce::Array<juce::var>* choicesArray = parsedResponse["choices"].getArray();
            if (choicesArray && choicesArray->size() > 0)
            {
                juce::var message = (*choicesArray)[0].getProperty("message", juce::var());
                if (message.hasProperty("content"))
                {
                    juce::String textContent = message.getProperty("content", "");
                    // Extract JSON from markdown code block
                    int jsonStart = textContent.indexOf("```json");
                    int jsonEnd = textContent.indexOf("```", jsonStart + 7);
                    if (jsonStart != -1 && jsonEnd != -1)
                    {
                        juce::String jsonBlock = textContent.substring(jsonStart + 7, jsonEnd).trim();
                        juce::var midiData = juce::JSON::parse(jsonBlock);
                        if (midiData.hasProperty("midi_sequence"))
                        {
                            juce::Array<juce::var>* midiArray = midiData["midi_sequence"].getArray();
                            if (midiArray)
                            {
                                for (auto& noteVar : *midiArray)
                                {
                                    if (noteVar.isObject())
                                    {
                                        juce::DynamicObject* noteObj = noteVar.getDynamicObject();
                                        int noteNumber = noteObj->getProperty("note", 0);
                                        int velocity = noteObj->getProperty("velocity", 0);
                                        double startTime = noteObj->getProperty("start_time", 0.0);
                                        double duration = noteObj->getProperty("duration", 0.0);

                                        juce::MidiMessage noteOn = juce::MidiMessage::noteOn(1, noteNumber, (juce::uint8)velocity);
                                        noteOn.setTimeStamp(startTime);
                                        sequence.messages.add(noteOn);

                                        juce::MidiMessage noteOff = juce::MidiMessage::noteOff(1, noteNumber, (juce::uint8)0);
                                        noteOff.setTimeStamp(startTime + duration);
                                        sequence.messages.add(noteOff);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    else if (currentProvider == LLMProvider::Gemini)
    {
        if (parsedResponse.hasProperty("candidates"))
        {
            juce::Array<juce::var>* candidatesArray = parsedResponse["candidates"].getArray();
            if (candidatesArray && candidatesArray->size() > 0)
            {
                juce::var content = (*candidatesArray)[0].getProperty("content", juce::var());
                if (content.hasProperty("parts"))
                {
                    juce::Array<juce::var>* partsArray = content["parts"].getArray();
                    if (partsArray && partsArray->size() > 0)
                    {
                        juce::String textContent = (*partsArray)[0].getProperty("text", "");
                        // Extract JSON from markdown code block
                        int jsonStart = textContent.indexOf("```json");
                        int jsonEnd = textContent.indexOf("```", jsonStart + 7);
                        if (jsonStart != -1 && jsonEnd != -1)
                        {
                            juce::String jsonBlock = textContent.substring(jsonStart + 7, jsonEnd).trim();
                            juce::var midiData = juce::JSON::parse(jsonBlock);
                            if (midiData.hasProperty("midi_sequence"))
                            {
                                juce::Array<juce::var>* midiArray = midiData["midi_sequence"].getArray();
                                if (midiArray)
                                {
                                    for (auto& noteVar : *midiArray)
                                    {
                                        if (noteVar.isObject())
                                        {
                                            juce::DynamicObject* noteObj = noteVar.getDynamicObject();
                                            int noteNumber = noteObj->getProperty("note", 0);
                                            int velocity = noteObj->getProperty("velocity", 0);
                                            double startTime = noteObj->getProperty("start_time", 0.0);
                                            double duration = noteObj->getProperty("duration", 0.0);

                                            juce::MidiMessage noteOn = juce::MidiMessage::noteOn(1, noteNumber, (juce::uint8)velocity);
                                            noteOn.setTimeStamp(startTime);
                                            sequence.messages.add(noteOn);

                                            juce::MidiMessage noteOff = juce::MidiMessage::noteOff(1, noteNumber, (juce::uint8)0);
                                            noteOff.setTimeStamp(startTime + duration);
                                            sequence.messages.add(noteOff);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return sequence;
}
```

#### LicenseManagerクラスの実装

`LicenseManager`クラスは、アプリケーションのライセンス状態を管理し、AI機能の利用制限を適用します。ライセンスの検証は、リモートのライセンス認証サーバーと通信して行われます。

`Source/AI/LicenseManager.h`
```cpp
#pragma once

#include <JuceHeader.h>

// 非同期処理のためのFuture/Promiseライクなクラス（MCPClientと同様）
template <typename T>
class Future;

class LicenseManager : public juce::URL::DownloadTask::Listener
{
public:
    enum class LicenseType
    {
        Agent,      // Agent機能のライセンス
        GhostText,  // Ghost Text機能のライセンス
        Pro         // 全機能利用可能なプロライセンス
    };

    LicenseManager();
    ~LicenseManager() override;

    void setLicenseKey(const juce::String& key);
    void setUserEmail(const juce::String& email);

    // ライセンスの有効性をサーバーと通信して検証
    Future<bool> validateLicense();

    // 特定の機能が利用可能かチェック
    bool hasValidLicense(LicenseType type) const;
    bool canUseAgent() const; // Agent機能が利用可能か
    bool canUseGhostText() const; // Ghost Text機能が利用可能か

    // AI機能の利用を記録（サーバーに同期）
    void recordAgentUsage();
    void recordGhostTextUsage(double durationSeconds);

    juce::String licenseKey; // ユーザーのライセンスキー
    juce::String userEmail; // ユーザーのメールアドレス

private:
    bool agentLicensed = false;
    bool ghostTextLicensed = false;
    int agentUsageCount = 0;
    double ghostTextUsageSeconds = 0.0;

    juce::String serverUrl = "https://api.composer-copilot.com/license"; // ライセンスサーバーURL
    std::unique_ptr<juce::URL::DownloadTask> currentValidationTask;
    Future<bool> currentFuture; // 現在のリクエストに対応するFuture

    void loadLocalSettings();
    void saveLocalSettings();

    // juce::URL::DownloadTask::Listener のオーバーライド
    void downloadFinished (juce::URL::DownloadTask* task, bool success) override;
    void downloadProgress (juce::URL::DownloadTask* task, int bytesReceived, int totalBytes) override;
};
```

`Source/AI/LicenseManager.cpp`
```cpp
#include "LicenseManager.h"

LicenseManager::LicenseManager()
{
    loadLocalSettings();
}

LicenseManager::~LicenseManager()
{
    if (currentValidationTask)
        currentValidationTask->cancel();
    saveLocalSettings();
}

void LicenseManager::setLicenseKey(const juce::String& key)
{
    licenseKey = key;
    saveLocalSettings();
}

void LicenseManager::setUserEmail(const juce::String& email)
{
    userEmail = email;
    saveLocalSettings();
}

Future<bool> LicenseManager::validateLicense()
{
    if (licenseKey.isEmpty() || userEmail.isEmpty())
    {
        currentFuture.reject("License key or user email is empty.");
        return currentFuture;
    }

    if (currentValidationTask && currentValidationTask->isCurrentlyRunning())
    {
        currentFuture.reject("Another validation is already in progress.");
        return currentFuture;
    }

    juce::URL apiUrl (serverUrl + "/validate");
    juce::StringPairArray headers;
    headers.set ("Content-Type", "application/json");

    juce::var requestData = juce::JSON::parse("{}");
    requestData.getDynamicObject()->setProperty("key", licenseKey);
    requestData.getDynamicObject()->setProperty("user_email", userEmail);

    currentValidationTask = apiUrl.create
    (juce::URL::DownloadTaskOptions()
        .withExtraHeaders(headers)
        .withPOSTData(juce::JSON::toString(requestData))
        .withListener(this)
    );

    if (currentValidationTask)
        currentValidationTask->start();
    else
        currentFuture.reject("Failed to create download task.");

    return currentFuture;
}

bool LicenseManager::hasValidLicense(LicenseType type) const
{
    if (type == LicenseType::Agent)
        return agentLicensed;
    if (type == LicenseType::GhostText)
        return ghostTextLicensed;
    if (type == LicenseType::Pro)
        return agentLicensed && ghostTextLicensed; // Proは両方有効と仮定
    return false;
}

bool LicenseManager::canUseAgent() const
{
    // 無料利用枠やサブスクリプションの状態に応じて判断
    // 例: 無料ユーザーは月5回まで、Proユーザーは無制限
    return agentLicensed; // 今はシンプルにライセンスがあればOK
}

bool LicenseManager::canUseGhostText() const
{
    return ghostTextLicensed; // 今はシンプルにライセンスがあればOK
}

void LicenseManager::recordAgentUsage()
{
    agentUsageCount++;
    saveLocalSettings();
    // TODO: サーバーに利用状況を同期するロジックを追加
}

void LicenseManager::recordGhostTextUsage(double durationSeconds)
{
    ghostTextUsageSeconds += durationSeconds;
    saveLocalSettings();
    // TODO: サーバーに利用状況を同期するロジックを追加
}

void LicenseManager::downloadFinished (juce::URL::DownloadTask* task, bool success)
{
    if (task != currentValidationTask.get())
        return;

    if (success)
    {
        juce::File tempFile = task->getTargetFile();
        juce::String responseJson = tempFile.loadFileAsString();
        juce::var parsedResponse = juce::JSON::parse(responseJson);

        if (parsedResponse.hasProperty("valid") && parsedResponse["valid"]){
            juce::String licenseType = parsedResponse.getProperty("license_type", "");
            agentLicensed = (licenseType == "Agent" || licenseType == "Pro");
            ghostTextLicensed = (licenseType == "GhostText" || licenseType == "Pro");
            agentUsageCount = parsedResponse.getProperty("agent_usage_count", 0);
            ghostTextUsageSeconds = parsedResponse.getProperty("ghost_text_usage_seconds", 0.0);
            currentFuture.resolve(true);
        } else {
            agentLicensed = false;
            ghostTextLicensed = false;
            currentFuture.resolve(false);
        }
    }
    else
    {
        agentLicensed = false;
        ghostTextLicensed = false;
        currentFuture.reject("License server not reachable or invalid response.");
    }
    currentValidationTask.reset();
    saveLocalSettings();
}

void LicenseManager::downloadProgress (juce::URL::DownloadTask* task, int bytesReceived, int totalBytes)
{
    // 進捗表示が必要な場合はここに実装
}

void LicenseManager::loadLocalSettings()
{
    juce::PropertiesFile::Options options;
    options.applicationName = "ComposerCopilot";
    options.filenameSuffix = ".settings";
    options.folderName = "Application Support";

    std::unique_ptr<juce::PropertiesFile> properties = juce::PropertiesFile::create(options);
    if (properties)
    {
        licenseKey = properties->getValue ("licenseKey", "");
        userEmail = properties->getValue ("userEmail", "");
        agentLicensed = properties->getBoolValue ("agentLicensed", false);
        ghostTextLicensed = properties->getBoolValue ("ghostTextLicensed", false);
        agentUsageCount = properties->getIntValue ("agentUsageCount", 0);
        ghostTextUsageSeconds = properties->getDoubleValue ("ghostTextUsageSeconds", 0.0);
    }
}

void LicenseManager::saveLocalSettings()
{
    juce::PropertiesFile::Options options;
    options.applicationName = "ComposerCopilot";
    options.filenameSuffix = ".settings";
    options.folderName = "Application Support";

    std::unique_ptr<juce::PropertiesFile> properties = juce::PropertiesFile::create(options);
    if (properties)
    {
        properties->setValue ("licenseKey", licenseKey);
        properties->setValue ("userEmail", userEmail);
        properties->setValue ("agentLicensed", agentLicensed);
        properties->setValue ("ghostTextLicensed", ghostTextLicensed);
        properties->setValue ("agentUsageCount", agentUsageCount);
        properties->setValue ("ghostTextUsageSeconds", ghostTextUsageSeconds);
        properties->saveIfNeeded();
    }
}
```

#### 成果物と検証方法

-   **成果物**: `Source/AI/MCPClient.h`, `Source/AI/MCPClient.cpp`, `Source/AI/LicenseManager.h`, `Source/AI/LicenseManager.cpp`ファイルが実装されていること。
-   **検証方法**: 
    1.  これらのクラスがコンパイルエラーなくビルドできること。
    2.  `MCPClient`が、ダミーのLLMエンドポイント（またはモックサーバー）に対してHTTPリクエストを正常に送信し、レスポンスをパースできること。
    3.  `LicenseManager`が、ダミーのライセンス認証サーバー（またはモックサーバー）に対してライセンス検証リクエストを正常に送信し、レスポンスに基づいてライセンス状態を更新できること。
    4.  `LicenseManager`がライセンスキーとユーザーメールをローカルに保存・ロードできること。

このステップが完了すると、AI機能と有料化モデルを支える基本的なインフラストラクチャが確立されます。



## Phase 2: Agent機能の実装

### // STEP 5: Agent機能 (AIAgentDemo) の実装

このステップでは、AI統合DAWの主要機能の一つであるAgent機能のC++実装を行います。`AIAgentDemo`クラスを新たに作成し、ユーザーインターフェースの構築、`MCPClient`との連携、およびLLMから生成されたMIDIデータのDAWへの統合ロジックを実装します。このデモは、DemoRunnerの既存のデモと同様に、独立したコンポーネントとして機能します。

#### AIAgentDemoクラスの定義

`AIAgentDemo`は、JUCEの`Component`を継承し、ユーザーからのプロンプト入力、LLMプロバイダーの選択、MIDI生成のトリガー、および生成ステータスの表示を行います。また、`TextEditor::Listener`と`Button::Listener`を実装してUIイベントを処理し、`Timer`を使用して定期的なUI更新やステータスチェックを行います。

`Source/AI/AIAgentDemo.h`
```cpp
#pragma once

#include <JuceHeader.h>
#include "../Engine/Engine.h" // Tracktion EngineのEngineクラスへのパスを調整
#include "MCPClient.h"
#include "LicenseManager.h"

// AIAgentDemoクラスの定義
class AIAgentDemo : public juce::Component,
                   public juce::TextEditor::Listener,
                   public juce::Button::Listener,
                   public juce::Timer
{
public:
    AIAgentDemo (tracktion_engine::Engine& e);
    ~AIAgentDemo() override;
    
    // juce::Component のオーバーライド
    void paint (juce::Graphics& g) override;
    void resized() override;
    
    // juce::TextEditor::Listener のオーバーライド
    void textEditorReturnKeyPressed (juce::TextEditor& editor) override;
    
    // juce::Button::Listener のオーバーライド
    void buttonClicked (juce::Button* button) override;
    
    // juce::Timer のオーバーライド
    void timerCallback() override;
    
private:
    tracktion_engine::Engine& engine;
    std::unique_ptr<tracktion_engine::Edit> currentEdit; // 現在のEditを保持
    
    // UIコンポーネント
    juce::Label headerLabel; // ヘッダーラベル
    juce::TextEditor promptEditor; // プロンプト入力用テキストエディタ
    juce::TextButton generateButton; // 生成ボタン
    juce::ComboBox providerSelector; // LLMプロバイダー選択
    juce::Slider creativitySlider; // 創造性スライダー
    juce::Label statusLabel; // ステータス表示
    
    // AI関連オブジェクト
    MCPClient mcpClient; // MCPクライアント
    LicenseManager licenseManager; // ライセンスマネージャー
    
    // 内部状態
    bool isGenerating = false;
    juce::String currentPrompt;
    
    // ヘルパーメソッド
    void startGeneration();
    void handleGenerationComplete(const MidiSequence& sequence);
    void handleGenerationError(const juce::String& error);
    void updateUI();
    void setupUI();
    void loadSettings();
    void saveSettings();
    
    // Tracktion Engine関連ヘルパー
    tracktion_engine::AudioTrack* getOrCreateMidiTrack();
    MusicContext getCurrentMusicContext();
};
```

#### AIAgentDemoクラスの実装

`AIAgentDemo.cpp`では、UIの初期化、イベントハンドリング、および`MCPClient`と`LicenseManager`を使用したAI生成ロジックを実装します。

`Source/AI/AIAgentDemo.cpp`
```cpp
#include "AIAgentDemo.h"

AIAgentDemo::AIAgentDemo (tracktion_engine::Engine& e)
    : engine (e)
{
    // UIコンポーネントの初期化と追加
    setupUI();
    
    // MCPClientとLicenseManagerの初期設定
    // APIキーやライセンスサーバーURLは設定ファイルからロードする
    loadSettings();
    
    // デモ用のEditを作成または既存のEditを使用
    currentEdit = std::make_unique<tracktion_engine::Edit> (engine, tracktion_engine::createEmptyEdit (engine), tracktion_engine::Edit::forTesting);
    
    // 定期的なUI更新のためのタイマー開始
    startTimer (100); // 100msごとにtimerCallbackを呼び出す
}

AIAgentDemo::~AIAgentDemo()
{
    stopTimer();
    saveSettings();
    currentEdit = nullptr; // Editを適切に解放
}

void AIAgentDemo::setupUI()
{
    addAndMakeVisible (headerLabel);
    headerLabel.setText ("AI Agent: Generate MIDI", juce::dontSendNotification);
    headerLabel.setFont (juce::Font (24.0f, juce::Font::bold));
    headerLabel.setJustificationType (juce::Justification::centred);

    addAndMakeVisible (promptEditor);
    promptEditor.setMultiLine (true);
    promptEditor.setReturnKeySendsText (true);
    promptEditor.addListener (this);
    promptEditor.setText ("Generate a groovy bassline in C minor, 120bpm.", juce::dontSendNotification);

    addAndMakeVisible (generateButton);
    generateButton.setButtonText ("Generate MIDI");
    generateButton.addListener (this);

    addAndMakeVisible (providerSelector);
    providerSelector.addItem ("Claude 3.5 Sonnet", (int)MCPClient::LLMProvider::Claude + 1);
    providerSelector.addItem ("ChatGPT-4", (int)MCPClient::LLMProvider::ChatGPT + 1);
    providerSelector.addItem ("Gemini Pro", (int)MCPClient::LLMProvider::Gemini + 1);
    providerSelector.setSelectedId ((int)MCPClient::LLMProvider::Claude + 1, juce::dontSendNotification);
    providerSelector.onChange = [this] { mcpClient.setProvider ((MCPClient::LLMProvider)(providerSelector.getSelectedId() - 1)); };

    addAndMakeVisible (creativitySlider);
    creativitySlider.setRange (0.0, 1.0, 0.01);
    creativitySlider.setValue (0.7, juce::dontSendNotification);
    creativitySlider.setTextBoxStyle (juce::Slider::TextBoxRight, false, 50, 20);
    creativitySlider.setSliderStyle (juce::Slider::LinearHorizontal);

    addAndMakeVisible (statusLabel);
    statusLabel.setText ("Ready.", juce::dontSendNotification);
    statusLabel.setJustificationType (juce::Justification::centred);
}

void AIAgentDemo::paint (juce::Graphics& g)
{
    g.fillAll (getLookAndFeel().findColour (juce::ResizableWindow::backgroundColourId));
}

void AIAgentDemo::resized()
{
    auto bounds = getLocalBounds();
    headerLabel.setBounds (bounds.removeFromTop (50));
    promptEditor.setBounds (bounds.removeFromTop (150).reduced (10));
    
    auto buttonArea = bounds.removeFromTop (50).reduced (10);
    generateButton.setBounds (buttonArea.removeFromLeft (buttonArea.getWidth() / 2 - 5));
    providerSelector.setBounds (buttonArea.reduced (5));

    creativitySlider.setBounds (bounds.removeFromTop (30).reduced (10));
    statusLabel.setBounds (bounds.removeFromBottom (30));
}

void AIAgentDemo::textEditorReturnKeyPressed (juce::TextEditor& editor)
{
    if (&editor == &promptEditor)
    {
        generateButton.triggerClick(); // Enterキーで生成を開始
    }
}

void AIAgentDemo::buttonClicked (juce::Button* button)
{
    if (button == &generateButton)
    {
        startGeneration();
    }
}

void AIAgentDemo::timerCallback()
{
    updateUI();
}

void AIAgentDemo::startGeneration()
{
    if (isGenerating)
        return;

    currentPrompt = promptEditor.getText();
    if (currentPrompt.isEmpty())
    {
        statusLabel.setText ("Please enter a prompt.", juce::dontSendNotification);
        return;
    }

    // ライセンス検証
    if (!licenseManager.hasValidLicense(LicenseManager::LicenseType::Agent))
    {
        statusLabel.setText ("Agent feature requires a valid license.", juce::dontSendNotification);
        return;
    }
    
    isGenerating = true;
    updateUI();
    statusLabel.setText ("Generating MIDI...", juce::dontSendNotification);

    // 現在の音楽コンテキストを収集
    MusicContext context = getCurrentMusicContext();
    
    // LLMにリクエストを送信
    mcpClient.generateMidi(currentPrompt, context)
        .then([this](const MidiSequence& sequence)
        {
            juce::MessageManager::callAsync ([this, sequence] {
                handleGenerationComplete(sequence);
            });
        })
        .onError([this](const juce::String& error)
        {
            juce::MessageManager::callAsync ([this, error] {
                handleGenerationError(error);
            });
        });

    licenseManager.recordAgentUsage(); // 使用量を記録
}

void AIAgentDemo::handleGenerationComplete(const MidiSequence& sequence)
{
    isGenerating = false;
    updateUI();
    statusLabel.setText ("MIDI generation complete!", juce::dontSendNotification);

    // 生成されたMIDIデータをDAWに統合
    tracktion_engine::AudioTrack* midiTrack = getOrCreateMidiTrack();
    if (midiTrack)
    {
        auto& clipManager = currentEdit->getClipManager();
        auto newMidiClip = clipManager.createMidiClip (*midiTrack, currentEdit->getTransport().getCurrentPosition(), 4.0); // 4拍のクリップを仮作成
        
        if (newMidiClip)
        {
            auto& midiList = newMidiClip->getMidiList();
            for (const auto& msg : sequence.messages)
            {
                midiList.addMidiMessage (msg);
            }
            newMidiClip->getMidiList().sort(); // MIDIメッセージを時間順にソート
            newMidiClip->getMidiList().updateMatchedPairs(); // Note On/Offペアを更新
            newMidiClip->getMidiList().updateMissingOffs(); // 欠落したNote Offを追加
            newMidiClip->getMidiList().updateNoteLengthFromOffEvents(); // Note Offイベントからノート長を更新
            newMidiClip->getMidiList().updateQuantisation(); // クオンタイズ情報を更新
            newMidiClip->getMidiList().updateLoopPoints(); // ループポイントを更新
            
            // クリップの長さをMIDIデータに合わせて調整
            newMidiClip->setLength (newMidiClip->getMidiList().getEndTime() - newMidiClip->getMidiList().getStartTime());
            newMidiClip->setPosition (newMidiClip->getMidiList().getStartTime());
        }
    }
}

void AIAgentDemo::handleGenerationError(const juce::String& error)
{
    isGenerating = false;
    updateUI();
    statusLabel.setText ("Error: " + error, juce::dontSendNotification);
}

void AIAgentDemo::updateUI()
{
    promptEditor.setEnabled (!isGenerating);
    generateButton.setEnabled (!isGenerating && licenseManager.canUseAgent());
    providerSelector.setEnabled (!isGenerating);
    creativitySlider.setEnabled (!isGenerating);

    // ライセンスの状態に応じてボタンのテキストを更新
    if (!licenseManager.hasValidLicense(LicenseManager::LicenseType::Agent))
    {
        generateButton.setButtonText ("Requires License");
    }
    else if (!licenseManager.canUseAgent())
    {
        generateButton.setButtonText ("Usage Limit Reached");
    }
    else
    {
        generateButton.setButtonText ("Generate MIDI");
    }
}

void AIAgentDemo::loadSettings()
{
    // JUCEのApplicationPropertiesから設定をロード
    juce::PropertiesFile::Options options;
    options.applicationName = "ComposerCopilot";
    options.filenameSuffix = ".settings";
    options.folderName = "Application Support";

    std::unique_ptr<juce::PropertiesFile> properties = juce::PropertiesFile::create(options);
    if (properties)
    {
        juce::String llmApiKey = properties->getValue ("llmApiKey", "");
        mcpClient.setApiKey (llmApiKey);
        
        int providerId = properties->getIntValue ("llmProvider", (int)MCPClient::LLMProvider::Claude);
        providerSelector.setSelectedId ((int)MCPClient::LLMProvider::Claude + 1, juce::dontSendNotification);
        mcpClient.setProvider ((MCPClient::LLMProvider)providerId);

        // ライセンスキーやユーザーメールもここでロードし、LicenseManagerに設定
        licenseManager.licenseKey = properties->getValue("licenseKey", "");
        licenseManager.userEmail = properties->getValue("userEmail", "");
        licenseManager.validateLicense(); // ロード後に一度検証
    }
}

void AIAgentDemo::saveSettings()
{
    // JUCEのApplicationPropertiesに設定を保存
    juce::PropertiesFile::Options options;
    options.applicationName = "ComposerCopilot";
    options.filenameSuffix = ".settings";
    options.folderName = "Application Support";

    std::unique_ptr<juce::PropertiesFile> properties = juce::PropertiesFile::create(options);
    if (properties)
    {
        properties->setValue ("llmProvider", providerSelector.getSelectedId() - 1);
        // APIキーは機密情報のため、通常は保存しないか、暗号化して保存する
        // properties->setValue ("llmApiKey", mcpClient.getApiKey());
        properties->saveIfNeeded();
    }
}

tracktion_engine::AudioTrack* AIAgentDemo::getOrCreateMidiTrack()
{
    // 現在のEditにMIDIトラックが存在しない場合、新しいトラックを作成
    if (currentEdit->getTrackList().getNumTracks() == 0)
    {
        return currentEdit->getTrackList().insertAudioTrack (0);
    }
    // 既存の最初のオーディオトラックをMIDIトラックとして使用
    return currentEdit->getTrackList().getAudioTrack(0);
}

MusicContext AIAgentDemo::getCurrentMusicContext()
{
    MusicContext context;
    if (currentEdit)
    {
        context.tempo = currentEdit->getTransport().getTempo();
        context.timeSignature = currentEdit->getTransport().getTimeSignature().toString();
        // TODO: 現在のキーを検出するロジックを追加
        // TODO: 既存のMIDIクリップ情報をcontext.existingTracksに追加するロジックを追加
    }
    return context;
}
```

#### DemoRunnerへの統合

`AIAgentDemo`をDemoRunnerのメインアプリケーションに統合するには、`DemoRunner.cpp`または`MainComponent.cpp`で`AIAgentDemo`のインスタンスを作成し、メインウィンドウに追加します。これにより、Agent機能がDemoRunnerの他のデモと並行して表示され、アクセス可能になります。

```cpp
// DemoRunner.cpp (または MainComponent.cpp) の一部
// 例えば、DemoRunnerのメインウィンドウにタブとして追加する場合

// MainComponent::MainComponent(Engine& e) コンストラクタ内
// ... 既存のデモの追加 ...

// AI Agent Demoの追加
addTab ("AI Agent", juce::Colours::lightgrey, new AIAgentDemo (e), true);

// ...
```

#### 成果物と検証方法

-   **成果物**: `Source/AI/AIAgentDemo.h`および`Source/AI/AIAgentDemo.cpp`ファイルが実装され、DemoRunnerプロジェクトに統合されていること。
-   **検証方法**: 
    1.  DemoRunnerをビルドし、起動すること。
    2.  アプリケーションのUIに「AI Agent」タブまたはセクションが表示され、`AIAgentDemo`のUIコンポーネント（プロンプトエディタ、生成ボタン、プロバイダー選択など）が正しく表示されること。
    3.  プロンプトを入力し、「Generate MIDI」ボタンをクリックした際に、`statusLabel`が「Generating MIDI...」と表示され、その後「MIDI generation complete!」またはエラーメッセージが表示されること。
    4.  生成が完了した後、DAWのタイムラインに新しいMIDIクリップが追加され、再生可能であること。
    5.  ライセンスがない場合や使用量制限に達した場合に、生成ボタンが非活性化され、適切なメッセージが表示されること。
    6.  `MCPClient`がLLMと正しく通信し、有効なMIDIデータを返すことを確認するために、デバッガやネットワークプロキシツールを使用して通信内容を監視すること。

このステップが完了すると、AI統合DAWの主要な機能であるAgent機能が動作するようになります。



## Phase 3: Ghost Text機能の実装

### // STEP 6: Ghost Text機能 (GhostTextDemo) の実装

このステップでは、AI統合DAWのもう一つの主要機能であるGhost Text機能のC++実装を行います。`GhostTextDemo`クラスを新たに作成し、ユーザーのMIDI入力をリアルタイムで監視し、ローカルPython AIサーバーと連携して予測されたノートをDAWのピアノロール上に視覚的に表示するロジックを実装します。このデモも、DemoRunnerの既存のデモと同様に、独立したコンポーネントとして機能します。

#### GhostTextDemoクラスの定義

`GhostTextDemo`は、JUCEの`Component`と`MidiInputCallback`を継承し、MIDI入力の処理、予測結果のUI表示、およびPython AIサーバーとの通信を管理します。また、`Timer`を使用して定期的な予測更新を行います。

`Source/AI/GhostTextDemo.h`
```cpp
#pragma once

#include <JuceHeader.h>
#include "../Engine/Engine.h" // Tracktion EngineのEngineクラスへのパスを調整
#include "GhostTextClient.h"

// 予測されたノートの構造体
struct PredictedNote
{
    int noteNumber;
    int velocity;
    double startTime;
    double duration;
    float probability;
    int rank;
};

// GhostTextDemoクラスの定義
class GhostTextDemo : public juce::Component,
                     public juce::MidiInputCallback,
                     public juce::Timer
{
public:
    GhostTextDemo (tracktion_engine::Engine& e);
    ~GhostTextDemo() override;
    
    // juce::Component のオーバーライド
    void paint (juce::Graphics& g) override;
    void resized() override;
    
    // juce::MidiInputCallback のオーバーライド
    void handleIncomingMidiMessage (juce::MidiInput* source, 
                                   const juce::MidiMessage& message) override;
    
    // juce::Timer のオーバーライド
    void timerCallback() override;
    
private:
    tracktion_engine::Engine& engine;
    std::unique_ptr<tracktion_engine::Edit> currentEdit; // 現在のEditを保持
    
    // UIコンポーネント
    juce::Label headerLabel; // ヘッダーラベル
    juce::ToggleButton ghostTextToggle; // Ghost Text機能の有効/無効切り替え
    juce::ComboBox midiInputSelector; // MIDI入力デバイス選択
    juce::Slider sensitivitySlider; // 予測感度調整
    juce::Label statusLabel; // ステータス表示
    
    // AI関連オブジェクト
    GhostTextClient ghostClient; // Python AIサーバー通信クライアント
    
    // 内部状態
    juce::Array<juce::MidiMessage> recentInput; // 最近のMIDI入力履歴
    juce::Array<PredictedNote> currentPredictions; // 現在の予測結果
    juce::Time lastInputTime; // 最後のMIDI入力時刻
    
    // ヘルパーメソッド
    void setupUI();
    void loadSettings();
    void saveSettings();
    void updateUI();
    void paintGhostNotes (juce::Graphics& g); // ゴーストノートの描画
    void updatePredictions(); // 予測の更新とUI反映
    void addToRecentInput (const juce::MidiMessage& message); // 入力履歴に追加
    void clearRecentInput(); // 入力履歴をクリア
    
    // 定数
    static constexpr int maxRecentInputSize = 64; // 最近の入力履歴の最大サイズ
    static constexpr int predictionUpdateIntervalMs = 100; // 予測更新間隔（ミリ秒）
};
```

#### GhostTextDemoクラスの実装

`GhostTextDemo.cpp`では、UIの初期化、MIDI入力の処理、`GhostTextClient`との連携、および予測されたノートの描画ロジックを実装します。

`Source/AI/GhostTextDemo.cpp`
```cpp
#include "GhostTextDemo.h"

GhostTextDemo::GhostTextDemo (tracktion_engine::Engine& e)
    : engine (e)
{
    setupUI();
    loadSettings();
    
    currentEdit = std::make_unique<tracktion_engine::Edit> (engine, tracktion_engine::createEmptyEdit (engine), tracktion_engine::Edit::forTesting);
    
    // MIDI入力デバイスの列挙と選択
    auto midiInputs = juce::MidiInput::getAvailableDevices();
    for (int i = 0; i < midiInputs.size(); ++i)
    {
        midiInputSelector.addItem (midiInputs[i].name, i + 1);
    }
    midiInputSelector.onChange = [this, midiInputs] {
        auto index = midiInputSelector.getSelectedId() - 1;
        if (index >= 0 && index < midiInputs.size())
        {
            engine.getDeviceManager().setMidiInputDeviceEnabled (midiInputs[index].identifier, true);
            engine.getDeviceManager().addMidiInputDeviceCallback (midiInputs[index].identifier, this);
        }
    };
    if (midiInputs.size() > 0)
        midiInputSelector.setSelectedId (1, juce::dontSendNotification);

    startTimer (predictionUpdateIntervalMs); // 定期的な予測更新のためのタイマー開始
}

GhostTextDemo::~GhostTextDemo()
{
    stopTimer();
    saveSettings();
    // MIDI入力デバイスのコールバックを解除
    auto midiInputs = juce::MidiInput::getAvailableDevices();
    for (int i = 0; i < midiInputs.size(); ++i)
    {
        engine.getDeviceManager().removeMidiInputDeviceCallback (midiInputs[i].identifier, this);
    }
    currentEdit = nullptr;
}

void GhostTextDemo::setupUI()
{
    addAndMakeVisible (headerLabel);
    headerLabel.setText ("AI Ghost Text: Real-time MIDI Prediction", juce::dontSendNotification);
    headerLabel.setFont (juce::Font (24.0f, juce::Font::bold));
    headerLabel.setJustificationType (juce::Justification::centred);

    addAndMakeVisible (ghostTextToggle);
    ghostTextToggle.setButtonText ("Enable Ghost Text");
    ghostTextToggle.onClick = [this] { updateUI(); };

    addAndMakeVisible (midiInputSelector);
    midiInputSelector.setEditableText (false);

    addAndMakeVisible (sensitivitySlider);
    sensitivitySlider.setRange (0.0, 1.0, 0.01);
    sensitivitySlider.setValue (0.5, juce::dontSendNotification);
    sensitivitySlider.setTextBoxStyle (juce::Slider::TextBoxRight, false, 50, 20);
    sensitivitySlider.setSliderStyle (juce::Slider::LinearHorizontal);

    addAndMakeVisible (statusLabel);
    statusLabel.setText ("Waiting for MIDI input...", juce::dontSendNotification);
    statusLabel.setJustificationType (juce::Justification::centred);
}

void GhostTextDemo::paint (juce::Graphics& g)
{
    g.fillAll (getLookAndFeel().findColour (juce::ResizableWindow::backgroundColourId));
    
    if (ghostTextToggle.getToggleState())
    {
        paintGhostNotes (g);
    }
}

void GhostTextDemo::resized()
{
    auto bounds = getLocalBounds();
    headerLabel.setBounds (bounds.removeFromTop (50));
    ghostTextToggle.setBounds (bounds.removeFromTop (30).reduced (10));
    midiInputSelector.setBounds (bounds.removeFromTop (30).reduced (10));
    sensitivitySlider.setBounds (bounds.removeFromTop (30).reduced (10));
    statusLabel.setBounds (bounds.removeFromBottom (30));
}

void GhostTextDemo::handleIncomingMidiMessage (juce::MidiInput* source, 
                                               const juce::MidiMessage& message)
{
    if (ghostTextToggle.getToggleState())
    {
        // リアルタイムMIDI入力を処理
        if (message.isNoteOn() || message.isNoteOff())
        {
            addToRecentInput (message);
            lastInputTime = juce::Time::getCurrentTime();
            // 予測を即座に更新
            updatePredictions();
        }
    }
}

void GhostTextDemo::timerCallback()
{
    // 定期的に予測を更新（入力がない場合でも）
    if (ghostTextToggle.getToggleState())
    {
        auto timeSinceLastInput = juce::Time::getCurrentTime() - lastInputTime;
        // 一定時間入力がない場合は予測を停止またはクリア
        if (timeSinceLastInput.inMilliseconds() > 2000 && !currentPredictions.isEmpty())
        {
            currentPredictions.clear();
            repaint();
            statusLabel.setText ("Waiting for MIDI input...", juce::dontSendNotification);
        }
        else if (timeSinceLastInput.inMilliseconds() <= 2000)
        {
            // 入力がある場合は予測を継続
            updatePredictions();
        }
    }
}

void GhostTextDemo::paintGhostNotes (juce::Graphics& g)
{
    // ここで予測されたノートをDAWのピアノロール風に描画するロジックを実装
    // 簡略化のため、矩形として描画
    g.setColour (juce::Colours::cyan.withAlpha (0.5f)); // 半透明のシアン

    // 実際のピアノロールの座標系に変換する必要がある
    // ここでは仮の描画ロジック
    float noteHeight = 20.0f; // ノートの高さ
    float startX = 50.0f; // 描画開始X座標
    float startY = 100.0f; // 描画開始Y座標

    for (const auto& predictedNote : currentPredictions)
    {
        // MIDIノート番号をY座標に変換 (高いノートほど上に来るように)
        float y = startY + (127 - predictedNote.noteNumber) * (noteHeight / 2);
        // 予測の開始時刻と長さをX座標と幅に変換
        float x = startX + (float)predictedNote.startTime * 50.0f; // 仮のスケール
        float width = (float)predictedNote.duration * 50.0f; // 仮のスケール

        g.drawRect (x, y, width, noteHeight, 2.0f); // 枠線
        g.fillRect (x, y, width, noteHeight); // 塗りつぶし

        // 予測確率を表示（オプション）
        g.setColour (juce::Colours::white);
        g.drawText (juce::String (predictedNote.noteNumber) + " (" + juce::String (predictedNote.probability, 2) + ")",
                    x, y, width, noteHeight, juce::Justification::centred, true);
        g.setColour (juce::Colours::cyan.withAlpha (0.5f)); // 色を戻す
    }
}

void GhostTextDemo::updatePredictions()
{
    if (!ghostTextToggle.getToggleState())
    {
        currentPredictions.clear();
        repaint();
        return;
    }

    if (recentInput.isEmpty())
    {
        currentPredictions.clear();
        repaint();
        statusLabel.setText ("Waiting for MIDI input...", juce::dontSendNotification);
        return;
    }

    statusLabel.setText ("Predicting next notes...", juce::dontSendNotification);

    // GhostTextClientを介してPython AIサーバーにリクエストを送信
    ghostClient.requestPrediction (recentInput)
        .then([this](const juce::Array<PredictedNote>& predictions)
        {
            juce::MessageManager::callAsync ([this, predictions] {
                currentPredictions = predictions;
                repaint(); // UIを再描画してゴーストノートを表示
                statusLabel.setText ("Prediction updated.", juce::dontSendNotification);
            });
        })
        .onError([this](const juce::String& error)
        {
            juce::MessageManager::callAsync ([this, error] {
                statusLabel.setText ("Prediction Error: " + error, juce::dontSendNotification);
                currentPredictions.clear();
                repaint();
            });
        });
}

void GhostTextDemo::addToRecentInput (const juce::MidiMessage& message)
{
    recentInput.add (message);
    if (recentInput.size() > maxRecentInputSize)
        recentInput.remove (0); // 古いメッセージを削除
}

void GhostTextDemo::clearRecentInput()
{
    recentInput.clear();
}

void GhostTextDemo::loadSettings()
{
    juce::PropertiesFile::Options options;
    options.applicationName = "ComposerCopilot";
    options.filenameSuffix = ".settings";
    options.folderName = "Application Support";

    std::unique_ptr<juce::PropertiesFile> properties = juce::PropertiesFile::create(options);
    if (properties)
    {
        ghostTextToggle.setToggleState (properties->getBoolValue ("ghostTextEnabled", false), juce::dontSendNotification);
        sensitivitySlider.setValue (properties->getDoubleValue ("ghostTextSensitivity", 0.5), juce::dontSendNotification);
    }
}

void GhostTextDemo::saveSettings()
{
    juce::PropertiesFile::Options options;
    options.applicationName = "ComposerCopilot";
    options.filenameSuffix = ".settings";
    options.folderName = "Application Support";

    std::unique_ptr<juce::PropertiesFile> properties = juce::PropertiesFile::create(options);
    if (properties)
    {
        properties->setValue ("ghostTextEnabled", ghostTextToggle.getToggleState());
        properties->setValue ("ghostTextSensitivity", sensitivitySlider.getValue());
        properties->saveIfNeeded();
    }
}
```

#### GhostTextClientクラスの実装

`GhostTextClient`クラスは、ローカルで動作するPython AIサーバーとHTTP通信を行うためのクライアントです。MIDIメッセージのJSON変換、HTTPリクエストの送信、およびサーバーからのJSON応答のパースを担当します。

`Source/AI/GhostTextClient.h`
```cpp
#pragma once

#include <JuceHeader.h>

// PredictedNote構造体はGhostTextDemo.hで定義済み
struct PredictedNote;

// 非同期処理のためのFuture/Promiseライクなクラス（MCPClientと同様）
template <typename T>
class Future
{
public:
    using CallbackType = std::function<void(const T&)>;
    using ErrorCallbackType = std::function<void(const juce::String&)>;

    Future() = default;

    void then(CallbackType cb) { successCallback = cb; }
    void onError(ErrorCallbackType cb) { errorCallback = cb; }

    void resolve(const T& result) { if (successCallback) successCallback(result); }
    void reject(const juce::String& error) { if (errorCallback) errorCallback(error); }

private:
    CallbackType successCallback;
    ErrorCallbackType errorCallback;
};

class GhostTextClient : public juce::URL::DownloadTask::Listener
{
public:
    GhostTextClient();
    ~GhostTextClient() override;
    
    // Python AIサーバーに予測リクエストを送信
    Future<juce::Array<PredictedNote>> requestPrediction (const juce::Array<juce::MidiMessage>& recentInput);
    
    // Python AIサーバーの接続状態を確認
    bool isServerAvailable() const;
    
    // juce::URL::DownloadTask::Listener のオーバーライド
    void downloadFinished (juce::URL::DownloadTask* task, bool success) override;
    void downloadProgress (juce::URL::DownloadTask* task, int bytesReceived, int totalBytes) override;

private:
    juce::String serverUrl = "http://127.0.0.1:8888/predict"; // Python AIサーバーのURL
    juce::String healthCheckUrl = "http://127.0.0.1:8888/health"; // ヘルスチェックURL
    std::unique_ptr<juce::URL::DownloadTask> currentTask;
    Future<juce::Array<PredictedNote>> currentFuture; // 現在のリクエストに対応するFuture
    
    // MIDIメッセージとJSON間の変換ユーティリティ
    juce::String midiMessagesToJson (const juce::Array<juce::MidiMessage>& messages);
    juce::Array<PredictedNote> jsonToPredictions (const juce::String& json);
};
```

`Source/AI/GhostTextClient.cpp`
```cpp
#include "GhostTextClient.h"
#include "GhostTextDemo.h" // PredictedNoteの定義のため

GhostTextClient::GhostTextClient()
{
}

GhostTextClient::~GhostTextClient()
{
    if (currentTask)
        currentTask->cancel();
}

Future<juce::Array<PredictedNote>> GhostTextClient::requestPrediction (const juce::Array<juce::MidiMessage>& recentInput)
{
    if (currentTask && currentTask->isCurrentlyRunning())
    {
        currentFuture.reject("Another request is already in progress.");
        return currentFuture;
    }

    juce::String jsonRequest = midiMessagesToJson(recentInput);

    juce::URL apiUrl (serverUrl);
    juce::StringPairArray headers;
    headers.set ("Content-Type", "application/json");

    currentTask = apiUrl.create
    (juce::URL::DownloadTaskOptions()
        .withExtraHeaders(headers)
        .withPOSTData(jsonRequest)
        .withListener(this)
    );

    if (currentTask)
        currentTask->start();
    else
        currentFuture.reject("Failed to create download task.");

    return currentFuture;
}

bool GhostTextClient::isServerAvailable() const
{
    // ヘルスチェックエンドポイントを叩いてサーバーの稼働状況を確認
    // 同期的に確認するか、定期的な非同期チェックを実装する
    // ここでは簡略化のため常にtrueを返す（実際にはHTTPリクエストを送信）
    return true; 
}

void GhostTextClient::downloadFinished (juce::URL::DownloadTask* task, bool success)
{
    if (task != currentTask.get())
        return;

    if (success)
    {
        juce::File tempFile = task->getTargetFile();
        juce::String responseJson = tempFile.loadFileAsString();
        juce::Array<PredictedNote> predictions = jsonToPredictions(responseJson);
        currentFuture.resolve(predictions);
    }
    else
    {
        currentFuture.reject("Network error or Python AI server not responding.");
    }
    currentTask.reset();
}

void GhostTextClient::downloadProgress (juce::URL::DownloadTask* task, int bytesReceived, int totalBytes)
{
    // 進捗表示が必要な場合はここに実装
}

juce::String GhostTextClient::midiMessagesToJson (const juce::Array<juce::MidiMessage>& messages)
{
    juce::Array<juce::var> midiArray;
    for (const auto& msg : messages)
    {
        juce::var midiMsgObj = juce::JSON::parse("{}");
        midiMsgObj.getDynamicObject()->setProperty("timestamp", msg.getTimeStamp());
        midiMsgObj.getDynamicObject()->setProperty("isNoteOn", msg.isNoteOn());
        midiMsgObj.getDynamicObject()->setProperty("isNoteOff", msg.isNoteOff());
        midiMsgObj.getDynamicObject()->setProperty("noteNumber", msg.getNoteNumber());
        midiMsgObj.getDynamicObject()->setProperty("velocity", msg.getVelocity());
        midiMsgObj.getDynamicObject()->setProperty("channel", msg.getChannel());
        midiArray.add(midiMsgObj);
    }
    juce::var requestData = juce::JSON::parse("{}");
    requestData.getDynamicObject()->setProperty("midi_sequence", midiArray);
    return juce::JSON::toString(requestData);
}

juce::Array<PredictedNote> GhostTextClient::jsonToPredictions (const juce::String& json)
{
    juce::Array<PredictedNote> predictions;
    juce::var parsedResponse = juce::JSON::parse(json);

    if (parsedResponse.hasProperty("predictions"))
    {
        juce::Array<juce::var>* predictionsArray = parsedResponse["predictions"].getArray();
        if (predictionsArray)
        {
            for (auto& predVar : *predictionsArray)
            {
                if (predVar.isObject())
                {
                    juce::DynamicObject* predObj = predVar.getDynamicObject();
                    PredictedNote pn;
                    pn.noteNumber = predObj->getProperty("note", juce::var()).getProperty("noteNumber", 0);
                    pn.velocity = predObj->getProperty("note", juce::var()).getProperty("velocity", 0);
                    pn.startTime = predObj->getProperty("note", juce::var()).getProperty("startTime", 0.0);
                    pn.duration = predObj->getProperty("note", juce::var()).getProperty("duration", 0.0);
                    pn.probability = (float)predObj->getProperty("probability", 0.0);
                    pn.rank = predObj->getProperty("rank", 0);
                    predictions.add(pn);
                }
            }
        }
    }
    return predictions;
}
```

#### Python AIサーバーの準備

Ghost Text機能が動作するためには、ローカルでPython AIサーバーを起動しておく必要があります。`python_ai/ghost_text_server.py`ファイルを作成し、必要なPythonライブラリをインストールします。

`python_ai/requirements.txt`
```
flask
torch
transformers
music21
```

`python_ai/ghost_text_server.py` (詳細は技術仕様書を参照)
```python
# ... (技術仕様書に記載のPythonコードをここに配置) ...
```

Python AIサーバーを起動するためのスクリプトも作成します。

`scripts/start_ghost_server.bat` (Windows)
```batch
@echo off
cd python_ai
call venv\Scripts\activate
python ghost_text_server.py
pause
```

`scripts/start_ghost_server.sh` (macOS/Linux)
```bash
#!/bin/bash
cd python_ai
source venv/bin/activate
python ghost_text_server.py
```

#### DemoRunnerへの統合

`GhostTextDemo`をDemoRunnerのメインアプリケーションに統合するには、`DemoRunner.cpp`または`MainComponent.cpp`で`GhostTextDemo`のインスタンスを作成し、メインウィンドウに追加します。

```cpp
// DemoRunner.cpp (または MainComponent.cpp) の一部
// 例えば、DemoRunnerのメインウィンドウにタブとして追加する場合

// MainComponent::MainComponent(Engine& e) コンストラクタ内
// ... 既存のデモの追加 ...

// AI Ghost Text Demoの追加
addTab ("AI Ghost Text", juce::Colours::lightgrey, new GhostTextDemo (e), true);

// ...
```

#### 成果物と検証方法

-   **成果物**: `Source/AI/GhostTextDemo.h`, `Source/AI/GhostTextDemo.cpp`, `Source/AI/GhostTextClient.h`, `Source/AI/GhostTextClient.cpp`ファイルが実装され、`python_ai`ディレクトリにPython AIサーバー関連ファイルが配置されていること。
-   **検証方法**: 
    1.  Python AIサーバーを起動し、正常に動作していることを確認する。
    2.  DemoRunnerをビルドし、起動すること。
    3.  アプリケーションのUIに「AI Ghost Text」タブまたはセクションが表示され、`GhostTextDemo`のUIコンポーネントが正しく表示されること。
    4.  MIDI入力デバイスを選択し、Ghost Text機能を有効にした状態でMIDIキーボードからノートを入力すると、ピアノロール風の領域に予測されたゴーストノートが表示されること。
    5.  `GhostTextClient`がPython AIサーバーと正しく通信し、予測結果を取得していることを確認するために、デバッガやネットワークプロキシツールを使用して通信内容を監視すること。

このステップが完了すると、AI統合DAWのもう一つの主要な機能であるGhost Text機能が動作するようになります。



## Phase 4: 有料化機能の実装

### // STEP 7: ライセンス管理機能の統合

このステップでは、`LicenseManager`クラスを`AIAgentDemo`と`GhostTextDemo`に統合し、AI機能の利用をライセンスに基づいて制御するロジックを実装します。これにより、有料化戦略を技術的にサポートします。

#### AIAgentDemoへの統合

`AIAgentDemo`クラス内で`LicenseManager`のインスタンスを使用し、MIDI生成ボタンの活性化/非活性化を制御します。ユーザーが有効なライセンスを持っていない場合、または利用制限に達している場合、生成ボタンは無効化され、適切なメッセージが表示されます。

```cpp
// AIAgentDemo::startGeneration() メソッド内
void AIAgentDemo::startGeneration()
{
    // ... (既存のプロンプトチェックなど) ...

    // ライセンス検証
    if (!licenseManager.hasValidLicense(LicenseManager::LicenseType::Agent))
    {
        statusLabel.setText ("Agent feature requires a valid license.", juce::dontSendNotification);
        return;
    }
    
    // ... (既存の生成ロジック) ...

    licenseManager.recordAgentUsage(); // 使用量を記録
}

// AIAgentDemo::updateUI() メソッド内
void AIAgentDemo::updateUI()
{
    // ... (既存のUI要素の有効/無効化) ...

    // ライセンスの状態に応じてボタンのテキストを更新
    if (!licenseManager.hasValidLicense(LicenseManager::LicenseType::Agent))
    {
        generateButton.setButtonText ("Requires License");
    }
    else if (!licenseManager.canUseAgent())
    {
        generateButton.setButtonText ("Usage Limit Reached");
    }
    else
    {
        generateButton.setButtonText ("Generate MIDI");
    }
}
```

#### GhostTextDemoへの統合

`GhostTextDemo`クラス内で`LicenseManager`のインスタンスを使用し、Ghost Text機能の有効/無効切り替えボタンの活性化/非活性化を制御します。同様に、ライセンスがない場合や利用制限に達している場合、機能は無効化されます。

```cpp
// GhostTextDemo::updateUI() メソッド内
void GhostTextDemo::updateUI()
{
    // ... (既存のUI要素の有効/無効化) ...

    // ライセンスの状態に応じてGhost Text機能のトグルを制御
    ghostTextToggle.setEnabled (licenseManager.canUseGhostText());

    if (!licenseManager.hasValidLicense(LicenseManager::LicenseType::GhostText))
    {
        statusLabel.setText ("Ghost Text feature requires a valid license.", juce::dontSendNotification);
    }
    else if (!licenseManager.canUseGhostText())
    {
        statusLabel.setText ("Ghost Text usage limit reached.", juce::dontSendNotification);
    }
    else
    {
        // 通常のステータス表示
        if (ghostTextToggle.getToggleState())
            statusLabel.setText ("Waiting for MIDI input...", juce::dontSendNotification);
        else
            statusLabel.setText ("Ghost Text disabled.", juce::dontSendNotification);
    }
}

// GhostTextDemo::handleIncomingMidiMessage() メソッド内
void GhostTextDemo::handleIncomingMidiMessage (juce::MidiInput* source, 
                                               const juce::MidiMessage& message)
{
    if (ghostTextToggle.getToggleState() && licenseManager.canUseGhostText())
    {
        // ... (既存のMIDI入力処理) ...

        // Ghost Text機能の利用時間を記録
        licenseManager.recordGhostTextUsage(0.01); // 仮に0.01秒として記録
    }
}
```

#### ライセンス入力UIの追加

ユーザーがライセンスキーとメールアドレスを入力できるUIを、DemoRunnerのメインアプリケーションまたは設定画面に追加します。これにより、ユーザーは自身のライセンス情報を設定し、`LicenseManager`がそれを検証できるようになります。

```cpp
// DemoRunner.cpp (または MainComponent.cpp) の一部
// 例えば、設定タブにライセンス入力フィールドを追加する場合

// MainComponent::MainComponent(Engine& e) コンストラクタ内
// ...

// ライセンス設定UIの追加
addTab ("License Settings", juce::Colours::lightgrey, new LicenseSettingsComponent (e, licenseManager), true);

// LicenseSettingsComponent クラスの定義例
class LicenseSettingsComponent : public juce::Component,
                                 public juce::Button::Listener,
                                 public juce::TextEditor::Listener
{
public:
    LicenseSettingsComponent (tracktion_engine::Engine& e, LicenseManager& lm)
        : engine (e), licenseManager (lm)
    {
        addAndMakeVisible (licenseKeyEditor);
        licenseKeyEditor.setMultiLine (false);
        licenseKeyEditor.setReturnKeySendsText (false);
        licenseKeyEditor.addListener (this);
        licenseKeyEditor.setText (licenseManager.licenseKey, juce::dontSendNotification);

        addAndMakeVisible (userEmailEditor);
        userEmailEditor.setMultiLine (false);
        userEmailEditor.setReturnKeySendsText (false);
        userEmailEditor.addListener (this);
        userEmailEditor.setText (licenseManager.userEmail, juce::dontSendNotification);

        addAndMakeVisible (validateButton);
        validateButton.setButtonText ("Validate License");
        validateButton.addListener (this);

        addAndMakeVisible (statusLabel);
        statusLabel.setText ("", juce::dontSendNotification);
    }

    void paint (juce::Graphics& g) override { g.fillAll (getLookAndFeel().findColour (juce::ResizableWindow::backgroundColourId)); }
    void resized() override
    {
        auto bounds = getLocalBounds().reduced (10);
        licenseKeyEditor.setBounds (bounds.removeFromTop (30));
        userEmailEditor.setBounds (bounds.removeFromTop (30));
        validateButton.setBounds (bounds.removeFromTop (30));
        statusLabel.setBounds (bounds.removeFromTop (30));
    }

    void buttonClicked (juce::Button* button) override
    {
        if (button == &validateButton)
        {
            licenseManager.setLicenseKey (licenseKeyEditor.getText());
            licenseManager.setUserEmail (userEmailEditor.getText());
            statusLabel.setText ("Validating license...", juce::dontSendNotification);
            licenseManager.validateLicense()
                .then([this](bool valid) {
                    juce::MessageManager::callAsync ([this, valid] {
                        statusLabel.setText (valid ? "License Valid!" : "License Invalid.", juce::dontSendNotification);
                    });
                })
                .onError([this](const juce::String& error) {
                    juce::MessageManager::callAsync ([this, error] {
                        statusLabel.setText ("Validation Error: " + error, juce::dontSendNotification);
                    });
                });
        }
    }

    void textEditorReturnKeyPressed (juce::TextEditor& editor) override
    {
        // Enterキーが押されたら自動的に検証ボタンをクリック
        validateButton.triggerClick();
    }

private:
    tracktion_engine::Engine& engine;
    LicenseManager& licenseManager;
    juce::TextEditor licenseKeyEditor;
    juce::TextEditor userEmailEditor;
    juce::TextButton validateButton;
    juce::Label statusLabel;
};
```

#### 成果物と検証方法

-   **成果物**: `AIAgentDemo.cpp`と`GhostTextDemo.cpp`が`LicenseManager`と統合され、ライセンス入力UIがDemoRunnerに追加されていること。
-   **検証方法**: 
    1.  DemoRunnerをビルドし、起動すること。
    2.  ライセンス設定画面で有効なライセンスキーとメールアドレスを入力し、ライセンスが「Valid」と表示されること。
    3.  ライセンスが有効な場合、Agent機能とGhost Text機能が正常に動作すること。
    4.  ライセンスが無効な場合、または入力されていない場合、Agent機能の「Generate MIDI」ボタンとGhost Text機能のトグルが非活性化され、適切なメッセージが表示されること。
    5.  Agent機能の利用回数やGhost Text機能の利用時間が、`LicenseManager`によって正しく記録され、サーバーに同期されることを確認する（サーバー側のログやデータベースを確認）。

このステップが完了すると、AI統合DAWの有料化モデルが機能的に実装され、ライセンスに基づいた機能制御が可能になります。



## Phase 5: Python AIサーバーの実装と連携

### // STEP 8: Ghost Text用Python AIサーバーの実装

このステップでは、Ghost Text機能のバックエンドとなるPython AIサーバーを実装します。このサーバーは、Flaskフレームワークを使用し、リアルタイムMIDI予測のためのAIモデルをホストします。プライバシー保護のため、このサーバーはローカル環境で動作することを前提とします。

#### Python環境のセットアップ

`python_ai`ディレクトリを作成し、必要なPythonライブラリをインストールします。`requirements.txt`ファイルに依存関係を記述します。

```bash
mkdir python_ai
cd python_ai
python -m venv venv
venv\Scripts\activate # Windows
# source venv/bin/activate # macOS/Linux
pip install -r requirements.txt
```

`python_ai/requirements.txt`
```
flask
torch
transformers
music21
```

#### Flaskアプリケーションの作成

`python_ai/ghost_text_server.py`ファイルを作成し、Flaskアプリケーションを実装します。このアプリケーションは、`/predict`エンドポイントでMIDIシーケンスを受け取り、AIモデルで処理し、予測結果を返します。

`python_ai/ghost_text_server.py`
```python
from flask import Flask, request, jsonify
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import music21
import numpy as np

app = Flask(__name__)

# 仮のAIモデルとトークナイザーのロード
# 実際には、訓練済みの音楽生成モデルや予測モデルをロードします。
# ここではダミーのモデルとして、簡単な予測ロジックを実装します。
class DummyMusicPredictor:
    def __init__(self):
        # モデルの初期化（実際にはHugging Faceなどからロード）
        pass

    def predict_next_notes(self, midi_sequence_json):
        # midi_sequence_jsonはJUCEから送られてくるJSON形式のMIDIデータ
        # 例: [{\"timestamp\": 0.0, \"isNoteOn\": true, \"noteNumber\": 60, \"velocity\": 100, \"channel\": 1}, ...]
        
        # ここに実際のAI予測ロジックを実装
        # 例: 直前のノートに基づいて次のノートを予測
        last_note = 0
        if midi_sequence_json:
            # 最後のNote Onイベントを探す
            for msg in reversed(midi_sequence_json):
                if msg.get("isNoteOn"):
                    last_note = msg.get("noteNumber", 0)
                    break

        predictions = []
        # ダミーの予測: 直前のノートの半音上、全音上、長3度上を予測
        for i, offset in enumerate([1, 2, 4]): # 半音、全音、長3度
            predicted_note_number = last_note + offset
            if 21 <= predicted_note_number <= 108: # MIDIノート範囲内 (A0 to C8)
                predictions.append({
                    "note": {
                        "noteNumber": predicted_note_number,
                        "velocity": 90, # 仮のベロシティ
                        "startTime": 0.0, # 仮の開始時間
                        "duration": 0.5 # 仮の長さ
                    },
                    "probability": 0.8 - (i * 0.1), # 仮の確率
                    "rank": i + 1
                })
        
        return predictions

predictor = DummyMusicPredictor()

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    midi_sequence = data.get("midi_sequence", [])
    
    # AIモデルによる予測
    predictions = predictor.predict_next_notes(midi_sequence)
    
    return jsonify({"predictions": predictions})

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Ghost Text AI server is running."}), 200

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8888, debug=True)
```

#### サーバー起動スクリプトの作成

Python AIサーバーを簡単に起動できるように、プラットフォームごとのスクリプトを作成します。

`scripts/start_ghost_server.bat` (Windows)
```batch
@echo off
cd python_ai
call venv\Scripts\activate
python ghost_text_server.py
pause
```

`scripts/start_ghost_server.sh` (macOS/Linux)
```bash
#!/bin/bash
cd python_ai
source venv/bin/activate
python ghost_text_server.py
```

#### 成果物と検証方法

-   **成果物**: `python_ai`ディレクトリ内に`ghost_text_server.py`と`requirements.txt`が作成され、`scripts`ディレクトリ内に起動スクリプトが作成されていること。
-   **検証方法**: 
    1.  `scripts/start_ghost_server.bat`または`scripts/start_ghost_server.sh`を実行し、Python AIサーバーが正常に起動することを確認する。
    2.  Webブラウザまたは`curl`コマンドを使用して、`http://127.0.0.1:8888/health`にアクセスし、`{"status": "ok"}`が返されることを確認する。
    3.  Postmanや`curl`コマンドを使用して、`/predict`エンドポイントにダミーのMIDIデータを含むPOSTリクエストを送信し、適切な予測結果が返されることを確認する。

```bash
# 例: curl を使用した /predict エンドポイントのテスト
curl -X POST -H "Content-Type: application/json" \
-d "{\"midi_sequence\": [{\"timestamp\": 0.0, \"isNoteOn\": true, \"noteNumber\": 60, \"velocity\": 100, \"channel\": 1}]}" \
http://127.0.0.1:8888/predict
```

このステップが完了すると、Ghost Text機能のバックエンドであるPython AIサーバーが動作可能になります。



## Phase 6: 全体統合とテスト

### // STEP 9: DemoRunnerへのAI機能統合とビルド

このステップでは、これまで実装してきた`AIAgentDemo`と`GhostTextDemo`をDemoRunnerのメインアプリケーションに統合し、全体をビルドして動作確認を行います。これにより、AI統合DAWのMVPが完成します。

#### MainComponent.cppの修正

`DemoRunner/Source/MainComponent.cpp` (または`DemoRunner.cpp`、プロジェクトの構成による) を修正し、`AIAgentDemo`と`GhostTextDemo`のインスタンスを生成し、メインウィンドウにタブとして追加します。また、`LicenseManager`のインスタンスもここで管理し、各AIデモに渡します。

```cpp
// DemoRunner/Source/MainComponent.h (抜粋)
#pragma once

#include <JuceHeader.h>
#include "../Engine/Engine.h"
#include "AI/AIAgentDemo.h"
#include "AI/GhostTextDemo.h"
#include "AI/LicenseManager.h"
#include "LicenseSettingsComponent.h" // 新しく作成したライセンス設定UI

// ... 既存のクラス定義 ...

class MainComponent  : public juce::TabbedComponent
{
public:
    MainComponent (tracktion_engine::Engine& e);
    ~MainComponent() override;

private:
    tracktion_engine::Engine& engine;
    LicenseManager licenseManager; // LicenseManagerのインスタンス

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (MainComponent)
};
```

```cpp
// DemoRunner/Source/MainComponent.cpp (抜粋)
#include "MainComponent.h"
#include "demos/MidiPlaybackDemo.h"
#include "demos/PatternGeneratorDemo.h"
#include "demos/MidiRecordingDemo.h"
// ... その他の既存デモのインクルード ...

MainComponent::MainComponent (tracktion_engine::Engine& e)
    : juce::TabbedComponent (juce::TabbedButtonBar::TabsAtTop),
      engine (e)
{
    // 既存のデモタブを追加
    addTab ("MIDI Playback", juce::Colours::lightgrey, new MidiPlaybackDemo (engine), true);
    addTab ("Pattern Generator", juce::Colours::lightgrey, new PatternGeneratorDemo (engine), true);
    addTab ("MIDI Recording", juce::Colours::lightgrey, new MidiRecordingDemo (engine), true);
    // ...

    // AI Agent Demoの追加
    addTab ("AI Agent", juce::Colours::lightgrey, new AIAgentDemo (engine), true);

    // AI Ghost Text Demoの追加
    addTab ("AI Ghost Text", juce::Colours::lightgrey, new GhostTextDemo (engine), true);

    // ライセンス設定タブの追加
    addTab ("License Settings", juce::Colours::lightgrey, new LicenseSettingsComponent (engine, licenseManager), true);

    // 初期タブを選択
    setCurrentTabIndex (0);

    setSize (800, 600);
}

MainComponent::~MainComponent()
{
}
```

#### CMakeLists.txtの最終調整

`DemoRunner/CMakeLists.txt`ファイルが、すべての新しいC++ソースファイル（`AIAgentDemo.cpp`, `GhostTextDemo.cpp`, `MCPClient.cpp`, `GhostTextClient.cpp`, `LicenseManager.cpp`, `LicenseSettingsComponent.cpp`）をビルドに含めていることを確認します。また、`Source/AI`ディレクトリがインクルードパスに追加されていることも確認します。

```cmake
# DemoRunner/CMakeLists.txt (抜粋 - 関連部分のみ)

# 既存のソースファイルに追加
set(DEMORUNNER_SOURCES
    Source/DemoRunner.cpp
    Source/MainComponent.cpp # MainComponentを使用する場合
    # ... 既存のデモソースファイル
    Source/AI/AIAgentDemo.cpp
    Source/AI/GhostTextDemo.cpp
    Source/AI/MCPClient.cpp
    Source/AI/GhostTextClient.cpp
    Source/AI/LicenseManager.cpp
    Source/LicenseSettingsComponent.cpp # ライセンス設定UIのソース
)

# インクルードディレクトリの追加
target_include_directories(DemoRunner PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/Source/AI
)

# ... その他の設定 ...
```

#### ビルドと実行

修正した`CMakeLists.txt`を使用してプロジェクトを再生成し、ビルドを実行します。

```bash
cd tracktion_engine/build
cmake .. -DCMAKE_BUILD_TYPE=Release # 設定変更があった場合は再実行
cmake --build . --config Release
```

ビルドが成功したら、生成された実行可能ファイル（例: `build/examples/DemoRunner/Release/DemoRunner.exe`）を起動します。

#### 成果物と検証方法

-   **成果物**: AI統合DAWの実行可能ファイル。
-   **検証方法**: 
    1.  アプリケーションが正常に起動し、新しい「AI Agent」、「AI Ghost Text」、「License Settings」タブが表示されること。
    2.  「License Settings」タブでライセンスキーとメールアドレスを入力し、ライセンスが有効になることを確認する。
    3.  「AI Agent」タブでプロンプトを入力し、MIDIが生成され、DAWのタイムラインに表示されること。
    4.  「AI Ghost Text」タブでMIDI入力デバイスを選択し、Ghost Text機能を有効にした状態でMIDIキーボードを演奏すると、ゴーストノートがリアルタイムで表示されること。
    5.  各機能がライセンスの状態に応じて正しく制御されること（例: ライセンスがない場合にボタンが非活性化される）。
    6.  アプリケーションが安定して動作し、クラッシュや予期せぬエラーが発生しないこと。

このステップが完了すると、AI統合DAWのMVPが完成し、主要なAI機能がDemoRunner上で動作するようになります。



## Phase 7: ドキュメントと成果物の最終化

### // STEP 10: パッケージREADMEの作成

このステップでは、AI統合DAWプロジェクトの全体概要、ビルド方法、主要機能、および使用方法をまとめた`README.md`ファイルを作成します。このREADMEは、開発者だけでなく、プロジェクトに新しく参加するメンバーや、将来的にプロジェクトを評価する関係者にとっても重要なドキュメントとなります。

#### README.mdの構成要素

`README.md`は、以下のセクションを含むように構成します。

1.  **プロジェクト名と概要**: 「Composer Copilot - AI統合DAW」の目的と、DemoRunnerをベースとしていることを明確に記述します。
2.  **主要機能**: Agent機能とGhost Text機能について、それぞれの概要と提供する価値を簡潔に説明します。
3.  **技術スタック**: JUCE, Tracktion Engine, C++, Python, Flask, LLM (Claude, ChatGPT, Gemini) などの主要技術をリストアップします。
4.  **開発環境セットアップ**: 
    -   必要なツールとライブラリ（Visual Studio, CMake, Git, Python, Cursorなど）
    -   Tracktion Engineのクローン方法（`--recursive`オプションを含む）
    -   Python環境のセットアップ（`venv`, `pip install -r requirements.txt`）
    -   CMakeを使用したビルド手順
5.  **AIサーバーの起動**: Ghost Text機能に必要なPython AIサーバーの起動方法を説明します。
6.  **ライセンス管理**: ライセンスキーの取得方法と、アプリケーション内での設定方法を説明します。
7.  **使用方法**: 各AI機能（Agent, Ghost Text）の基本的な使用方法を説明します。
8.  **貢献ガイドライン（オプション）**: 将来的にオープンソース化する場合や、チーム開発の場合に含めます。
9.  **ライセンス情報**: プロジェクトのライセンス（例: MIT, GPLなど）を明記します。

#### コード例とコマンド

セットアップ手順やサーバー起動方法については、具体的なコードブロックとコマンド例を含めます。これにより、ユーザーが手順を正確に実行できるようになります。

```markdown
# Composer Copilot - AI統合DAW

## 概要

「Composer Copilot」は、Tracktion EngineのDemoRunnerを基盤とした次世代のAI統合デジタルオーディオワークステーション（DAW）です。AIを活用して音楽制作プロセスを革新し、ユーザーの創造性を最大限に引き出すことを目指します。

## 主要機能

### Agent機能

自然言語プロンプトに基づいて、AIが自動的にMIDIパターン（ドラム、ベースライン、メロディなど）を生成します。大規模言語モデル（LLM）との連携により、ユーザーの意図を汲み取った高品質な音楽アイデアを提供します。

### Ghost Text機能

リアルタイムのMIDI入力に基づいて、次に来る可能性のあるノートやコードを予測し、DAWのピアノロール上に視覚的に提案します。ユーザーのプライバシーを保護するため、ローカルで動作するPython AIサーバーを利用します。

## 技術スタック

-   **DAW Core**: JUCE Framework, Tracktion Engine
-   **Programming Language**: C++, Python
-   **AI/ML**: Flask, PyTorch, Hugging Face Transformers, music21
-   **LLM Integration**: Claude, ChatGPT, Gemini (via MCP)

## 開発環境セットアップ

### 1. 必要なツールのインストール

-   [Visual Studio 2022 Community Edition以上](https://visualstudio.microsoft.com/vs/community/)
-   [CMake 3.22以上](https://cmake.org/download/)
-   [Git](https://git-scm.com/downloads)
-   [Python 3.9以上](https://www.python.org/downloads/) (pipを含む)
-   [Cursorエディタ](https://cursor.sh/) (推奨)

### 2. Tracktion Engineのクローン

```bash
git clone --recursive https://github.com/Tracktion/tracktion_engine.git
cd tracktion_engine
```

### 3. Python環境のセットアップ

```bash
cd python_ai
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
```

### 4. プロジェクトのビルド

```bash
cd tracktion_engine
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release
```

ビルドが成功すると、`build/examples/DemoRunner/Release/DemoRunner.exe` (Windows) または `build/examples/DemoRunner` (macOS/Linux) に実行可能ファイルが生成されます。

## AIサーバーの起動

Ghost Text機能を利用するには、ローカルのPython AIサーバーを起動する必要があります。

### Windows

`tracktion_engine/scripts/start_ghost_server.bat` を実行してください。

### macOS/Linux

```bash
chmod +x scripts/start_ghost_server.sh
./scripts/start_ghost_server.sh
```

サーバーが起動したら、ブラウザで `http://127.0.0.1:8888/health` にアクセスし、`{"status": "ok"}` が表示されることを確認してください。

## ライセンス管理

Agent機能とGhost Text機能の高度な利用にはライセンスが必要です。アプリケーション内の「License Settings」タブで、提供されたライセンスキーとメールアドレスを入力してライセンスを有効化してください。

## 使用方法

### Agent機能

1.  アプリケーションを起動し、「AI Agent」タブに移動します。
2.  プロンプト入力欄に、生成したい音楽のアイデア（例: 「ジャジーなドラムパターンを生成して」「明るいメロディラインをCメジャーで」）を入力します。
3.  「Generate MIDI」ボタンをクリックします。
4.  生成が完了すると、DAWのタイムラインに新しいMIDIクリップが追加されます。

### Ghost Text機能

1.  アプリケーションを起動し、「AI Ghost Text」タブに移動します。
2.  MIDI入力デバイスを選択し、「Enable Ghost Text」トグルをオンにします。
3.  MIDIキーボードを演奏すると、ピアノロール上に次に予測されるノートが半透明の「ゴーストノート」として表示されます。

## ライセンス

本プロジェクトは [ライセンスタイプ] の下で公開されています。詳細については、[LICENSE.md](LICENSE.md) を参照してください。
```

#### 成果物と検証方法

-   **成果物**: プロジェクトのルートディレクトリに`README.md`ファイルが作成されていること。
-   **検証方法**: 
    1.  `README.md`の内容が、プロジェクトの概要、セットアップ、使用方法を正確かつ簡潔に説明していること。
    2.  すべてのコマンド例が正しく、実行可能であること。
    3.  新規ユーザーがこのREADMEを読んで、プロジェクトをセットアップし、主要機能を試すことができること。

このステップが完了すると、プロジェクトの基本的なドキュメントが整備され、他の開発者や関係者との共有が容易になります。



### // STEP 11: 最終成果物の確認と整理

このステップでは、これまでに作成したすべてのドキュメントとコードを最終確認し、プロジェクト全体を整理します。最終的な成果物をユーザーに提供する準備をします。

#### ドキュメントの最終確認

-   `demorunner_tech_spec_new.md`: 技術仕様書の内容が正確で、矛盾がなく、すべてのセクションが網羅されていることを確認します。特に、アーキテクチャ図やコード例が最新かつ正確であることを確認します。
-   `demorunner_dev_guide_new.md`: 開発ガイドの各ステップが明確で、手順が正確であり、コード例が動作することを確認します。誤字脱字がないか、フォーマットが統一されているかを確認します。
-   `README.md`: プロジェクトの概要が正確で、セットアップ手順が明確であることを確認します。

#### コードの整理とコメント

-   すべてのC++ソースファイル（`AIAgentDemo.h/cpp`, `GhostTextDemo.h/cpp`, `MCPClient.h/cpp`, `LicenseManager.h/cpp`, `LicenseSettingsComponent.h/cpp`）に適切なコメントが追加されていることを確認します。特に、クラス、メソッド、複雑なロジックには詳細な説明を付与します。
-   Python AIサーバーのコード（`ghost_text_server.py`）にも同様にコメントを追加し、AIモデルのロジックやAPIエンドポイントの役割を明確にします。
-   不要なデバッグコードやコメントアウトされたコードを削除し、コードベースをクリーンに保ちます。

#### 成果物のパッケージング

最終的な成果物として、以下のファイルを整理し、ユーザーに提供できる形式で準備します。

-   **ドキュメント**: 
    -   `demorunner_tech_spec_new.md` (技術仕様書)
    -   `demorunner_dev_guide_new.md` (開発ガイド)
    -   `README.md` (プロジェクト概要)
-   **コード**: 
    -   `tracktion_engine`ディレクトリ全体（AI機能が統合された状態）
    -   `python_ai`ディレクトリ全体
    -   `scripts`ディレクトリ全体

これらのファイルをZIPアーカイブまたはtarballとしてパッケージングすることを検討します。

#### 成果物と検証方法

-   **成果物**: 最終化されたドキュメントと、AI機能が統合されたコードベース。
-   **検証方法**: 
    1.  すべてのドキュメントが最終レビューされ、品質基準を満たしていること。
    2.  コードベースがクリーンで、コメントが適切であり、ビルドと実行が正常に行えること。
    3.  パッケージングされた成果物が、すべての必要なファイルを含んでおり、展開後にすぐに利用できること。

このステップが完了すると、AI統合DAWプロジェクトのすべての成果物が最終化され、ユーザーに提供する準備が整います。



## Phase 8: PDFドキュメントの生成

### // STEP 12: MarkdownドキュメントのPDF変換

このステップでは、作成したMarkdown形式の技術仕様書と開発ガイドをPDF形式に変換します。これにより、ドキュメントの可搬性と閲覧性が向上し、様々な環境での共有が容易になります。

#### `manus-md-to-pdf`ユーティリティの使用

サンドボックス環境にプリインストールされている`manus-md-to-pdf`ユーティリティを使用して、MarkdownファイルをPDFに変換します。このツールは、Markdownの書式を保持しつつ、高品質なPDFを生成します。

```bash
manus-md-to-pdf demorunner_tech_spec_new.md demorunner_tech_spec_new.pdf
manus-md-to-pdf demorunner_dev_guide_new.md demorunner_dev_guide_new.pdf
manus-md-to-pdf README.md README.pdf
```

#### 成果物と検証方法

-   **成果物**: `demorunner_tech_spec_new.pdf`, `demorunner_dev_guide_new.pdf`, `README.pdf`ファイルが生成されていること。
-   **検証方法**: 
    1.  生成されたPDFファイルが、元のMarkdownの内容を正確に反映していること。
    2.  PDF内の図やコードブロックが正しく表示されていること。
    3.  PDFファイルが破損しておらず、正常に開いて閲覧できること。

このステップが完了すると、主要なドキュメントがPDF形式で利用可能になり、ユーザーへの提供準備がさらに進みます。



## Phase 9: 成果物の提供

### // STEP 13: 成果物のユーザーへの提供

この最終ステップでは、完成したAI統合DAWの技術仕様書、開発ガイド、および関連コードをユーザーに提供します。すべての成果物をメッセージツールに添付し、プロジェクトの完了を報告します。

#### 成果物の添付

`message_notify_user`ツールを使用して、作成したすべてのドキュメント（MarkdownおよびPDF）と、必要に応じてコードベースのアーカイブファイルを添付します。

```python
print(default_api.message_notify_user(
    text="AI統合DAWプロジェクトの技術仕様書と開発ガイドが完成しました。以下のファイルを添付します。",
    attachments=[
        "/home/ubuntu/demorunner_tech_spec_new.md",
        "/home/ubuntu/demorunner_tech_spec_new.pdf",
        "/home/ubuntu/demorunner_dev_guide_new.md",
        "/home/ubuntu/demorunner_dev_guide_new.pdf",
        "/home/ubuntu/README.md",
        "/home/ubuntu/README.pdf",
        # "/home/ubuntu/tracktion_engine.zip" # 必要に応じてコードベースのアーカイブも添付
    ]
))
```

#### プロジェクト完了の報告

成果物の提供後、`agent_end_task`ツールを使用してタスクを終了します。

#### 成果物と検証方法

-   **成果物**: ユーザーへのメッセージにすべての必要なファイルが添付されていること。
-   **検証方法**: 
    1.  ユーザーが添付されたファイルを正常にダウンロードし、開くことができること。
    2.  ユーザーがプロジェクトの完了を認識し、満足していること。

このステップが完了すると、AI統合DAWプロジェクトは正式に完了となります。


