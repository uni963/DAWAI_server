# DemoRunnerベース AI統合DAW 技術仕様書

**バージョン**: 2.0  
**作成日**: 2025年6月19日  
**対象読者**: エンジニア、技術コンサルタント、開発チーム  
**プロジェクト**: Composer Copilot - AI統合DAW  

## 概要

本技術仕様書は、Tracktion Engineの公式デモアプリケーションであるDemoRunnerを基盤として、AI統合DAW「Composer Copilot」を開発するための詳細な技術仕様を定義します。従来のゼロベースでのDAW開発アプローチから、DemoRunnerという実証済みの安定したコードベースを活用することで、開発リスクを大幅に低減し、AI機能の実装に特化できる効率的な開発プロセスを採用します。

DemoRunnerは、MIDI再生・録音、プラグインシステム、エフェクト処理、パターン生成など、DAWとして必要不可欠な基本機能を網羅しています。これらの堅牢な既存機能を最大限に活用し、その上にAI統合レイヤーを構築することで、短期間での高品質なAI統合DAWの実現を目指します。本仕様書では、特に「Agent機能」と「Ghost Text機能」という二つの主要なAI機能の技術的詳細、アーキテクチャ、および実装アプローチに焦点を当てます。




## アーキテクチャ概要

### システム全体構成

DemoRunnerベースのAI統合DAW「Composer Copilot」は、既存のDemoRunnerの堅牢なアーキテクチャを基盤とし、その上にAI機能を追加レイヤーとして統合するモジュラー設計を採用します。これにより、既存の安定性とパフォーマンスを維持しつつ、革新的なAI機能を提供します。システムは大きく以下の3つの主要レイヤーで構成されます。

#### 1. 基盤レイヤー（DemoRunner既存機能）
このレイヤーは、Tracktion Engine DemoRunnerが提供するコアDAW機能と、それを支えるJUCEフレームワークで構成されます。AI機能は、この基盤レイヤーの機能を拡張または利用する形で統合されます。

-   **Tracktion Engine Core**: オーディオ/MIDI処理、トラック管理、プラグインホスティング、オートメーション、タイムライン管理など、DAWの核となる機能を提供します。
-   **JUCE Framework**: クロスプラットフォームなUI構築、オーディオデバイスI/O、ファイルシステムアクセス、ネットワーク通信など、アプリケーションの基盤となる汎用機能を提供します。
-   **デモシステム**: DemoRunnerが持つ各機能のデモンストレーションロジック。AI機能もこのデモシステムに組み込むことで、既存のモジュラー設計を維持します。

#### 2. AI統合レイヤー（新規追加機能）
このレイヤーは、「Composer Copilot」の主要な差別化要因となるAI機能群で構成されます。これらの機能は、基盤レイヤーのデータと機能を活用し、ユーザーにインテリジェントな音楽制作体験を提供します。

-   **Agent機能**: ユーザーの自然言語プロンプトを解釈し、音楽理論に基づいたMIDIパターン（ドラム、ベースライン、メロディなど）を自動生成します。MCP (Model Context Protocol) を介して大規模言語モデル (LLM) と連携します。
-   **Ghost Text機能**: ユーザーのリアルタイムMIDI入力を分析し、次に入力される可能性のあるノートやコードを予測し、インラインで視覚的に提案します。プライバシー保護のため、ローカルで動作するPython AIサーバーと連携します。
-   **AI管理システム**: Agent機能とGhost Text機能のライフサイクル、設定、リソース（LLMプロバイダー、ローカルAIモデルなど）を一元的に管理するシステムです。

#### 3. 通信レイヤー（新規追加機能）
AI統合レイヤーが外部のAIサービスやローカルAIモデルと連携するための通信メカニズムを提供します。また、製品の収益化を支えるライセンス管理機能もこのレイヤーに含まれます。

-   **MCP Client**: Agent機能が外部のLLMプロバイダー（Claude, ChatGPT, Geminiなど）と安全かつ効率的に通信するためのクライアントモジュールです。音楽制作に特化したコンテキスト情報をLLMに渡し、生成された音楽データを適切に処理します。
-   **Python API Client**: Ghost Text機能がローカルで動作するPython AIサーバーとリアルタイムで通信するためのクライアントモジュールです。低レイテンシーでの予測データ交換を実現します。
-   **ライセンス管理**: 製品のフリーミアム戦略をサポートするためのライセンス認証および使用量追跡システムです。Agent機能の利用制限や、将来的な追加機能の有料化を制御します。

### システムアーキテクチャ図

```mermaid
graph TD
    subgraph User Interface (JUCE)
        UI_Main[メインUI]
        UI_Agent[Agent機能UI]
        UI_GhostText[Ghost Text UI]
    end

    subgraph Core DAW (Tracktion Engine)
        TE_Engine[Tracktion Engine Core]
        TE_MIDI[MIDI処理]
        TE_Audio[オーディオ処理]
        TE_Plugin[プラグインホスティング]
        TE_Pattern[パターン生成]
    end

    subgraph AI Integration Layer
        AI_Agent[Agent機能ロジック]
        AI_GhostText[Ghost Textロジック]
        AI_Manager[AI管理システム]
    end

    subgraph Communication Layer
        Comm_MCP[MCP Client]
        Comm_Python[Python API Client]
        Comm_License[ライセンス管理]
    end

    subgraph External Services
        Ext_LLM[LLMプロバイダー (Claude, ChatGPT, Gemini)]
        Ext_LicenseServer[ライセンス認証サーバー]
    end

    subgraph Local AI Service
        Local_PythonAI[Python AIサーバー (Ghost Text)]
    end

    UI_Main --> TE_Engine
    UI_Agent --> AI_Agent
    UI_GhostText --> AI_GhostText

    AI_Agent --> Comm_MCP
    AI_GhostText --> Comm_Python
    AI_Manager --> Comm_License

    Comm_MCP --> Ext_LLM
    Comm_License --> Ext_LicenseServer
    Comm_Python --> Local_PythonAI

    TE_Engine --> AI_Agent
    TE_Engine --> AI_GhostText
    TE_Engine --> TE_MIDI
    TE_Engine --> TE_Audio
    TE_Engine --> TE_Plugin
    TE_Engine --> TE_Pattern

    AI_Agent --> TE_MIDI
    AI_GhostText --> TE_MIDI

    style UI_Main fill:#f9f,stroke:#333,stroke-width:2px
    style UI_Agent fill:#f9f,stroke:#333,stroke-width:2px
    style UI_GhostText fill:#f9f,stroke:#333,stroke-width:2px

    style TE_Engine fill:#bbf,stroke:#333,stroke-width:2px
    style TE_MIDI fill:#bbf,stroke:#333,stroke-width:2px
    style TE_Audio fill:#bbf,stroke:#333,stroke-width:2px
    style TE_Plugin fill:#bbf,stroke:#333,stroke-width:2px
    style TE_Pattern fill:#bbf,stroke:#333,stroke-width:2px

    style AI_Agent fill:#ccf,stroke:#333,stroke-width:2px
    style AI_GhostText fill:#ccf,stroke:#333,stroke-width:2px
    style AI_Manager fill:#ccf,stroke:#333,stroke-width:2px

    style Comm_MCP fill:#cfc,stroke:#333,stroke-width:2px
    style Comm_Python fill:#cfc,stroke:#333,stroke-width:2px
    style Comm_License fill:#cfc,stroke:#333,stroke-width:2px

    style Ext_LLM fill:#ffc,stroke:#333,stroke-width:2px
    style Ext_LicenseServer fill:#ffc,stroke:#333,stroke-width:2px
    style Local_PythonAI fill:#ffc,stroke:#333,stroke-width:2px
```

上記はシステム全体の高レベルなアーキテクチャ図です。各コンポーネント間のデータフローと依存関係を示しています。UIレイヤーはJUCEフレームワークで構築され、Core DAWレイヤーはTracktion Engineを中核とします。AI統合レイヤーは、これらの基盤の上に構築され、通信レイヤーを介して外部サービスやローカルAIと連携します。

### DemoRunnerの既存アーキテクチャ活用

DemoRunnerは、各機能を独立したデモクラスとして実装するモジュラー設計を採用しています。この設計パターンは、AI機能の統合において非常に有利です。具体的には、Agent機能やGhost Text機能も、既存のデモクラス（例: `PatternGeneratorDemo`, `MidiRecordingDemo`）を参考に、独立した`Component`として実装することで、既存コードとの整合性を保ちながら新機能を追加できます。これにより、開発の複雑性を低減し、機能ごとの独立したテストとデバッグを容易にします。

```cpp
// 既存のデモクラス例（DemoRunnerより）
class MidiPlaybackDemo : public Component
{
public:
    MidiPlaybackDemo (Engine& e);
    void paint (Graphics& g) override;
    void resized() override;
    
private:
    Engine& engine;
    std::unique_ptr<Edit> edit;
    std::unique_ptr<AudioTrack> track;
};

// 新規追加するAIデモクラスの例
// AIAgentDemoは、既存のPatternGeneratorDemoの機能を拡張し、
// AIによるMIDI生成ロジックを統合します。
class AIAgentDemo : public Component
{
public:
    AIAgentDemo (Engine& e);
    void generateMidiFromText (const String& prompt);
    void paint (Graphics& g) override;
    void resized() override;
    
private:
    Engine& engine;
    std::unique_ptr<MCPClient> mcpClient; // MCP通信クライアント
    std::unique_ptr<LicenseManager> licenseManager; // ライセンス管理
};
```

このアプローチにより、DemoRunnerの既存の安定したMIDI処理、オーディオ処理、UI管理の機能を再利用しつつ、AI機能に特化した開発を進めることが可能になります。各AI機能は、DemoRunnerのメインアプリケーションから独立したモジュールとしてロード・アンロードできるため、開発中のデバッグや将来的な機能拡張も容易です。




## Agent機能の技術仕様

### 概要と設計思想

Agent機能は、「Composer Copilot」の中核をなすAI機能の一つであり、ユーザーが自然言語で入力したプロンプトを解釈し、それに基づいて音楽的なMIDIパターン（ドラムパターン、ベースライン、メロディ、コード進行など）を自動生成することを目的としています。この機能は、DemoRunnerの既存の`PatternGeneratorDemo`および`MidiPlaybackDemo`の機能を拡張し、AI生成ロジックを統合することで実現されます。この設計思想により、Tracktion Engineが提供する堅牢なMIDI処理機能と再生機能を最大限に活用しながら、AIによる創造的な音楽生成能力を付加します。

設計のポイントは以下の通りです。

-   **自然言語インターフェース**: ユーザーは複雑な音楽理論の知識がなくても、直感的な言葉で音楽のアイデアを表現できます。
-   **コンテキスト認識**: 現在のプロジェクトのテンポ、キー、既存のトラック情報などをAIに提供し、より文脈に沿った音楽生成を可能にします。
-   **モジュラー統合**: DemoRunnerの既存のモジュラー設計に則り、Agent機能を独立した`Component`として実装することで、既存システムへの影響を最小限に抑え、将来的な機能拡張やメンテナンスを容易にします。
-   **多様なLLMサポート**: MCP (Model Context Protocol) を介して複数の大規模言語モデル (LLM) プロバイダーをサポートし、ユーザーが最適なAIモデルを選択できるようにします。

### 技術スタック

Agent機能の実現には、主に以下の技術要素が使用されます。

#### MCP (Model Context Protocol) 統合

Agent機能は、MCPサーバーを通じてClaude、ChatGPT、Geminiなどの大規模言語モデル (LLM) と通信します。MCPは、AIアプリケーションとデータソース間の標準化された通信プロトコルであり、異なるLLMプロバイダーを統一的なインターフェースで扱うことを可能にします。これにより、特定のLLMに依存することなく、将来的なモデルの変更や追加に柔軟に対応できます。

MCPClientクラスは、JUCEの`URL::DownloadTask`を利用して非同期HTTP通信を行い、LLMへのリクエスト送信とレスポンスの受信を管理します。音楽生成リクエストには、ユーザープロンプトに加え、現在のDAWプロジェクトの音楽的コンテキスト（テンポ、拍子、キー、既存のMIDIデータなど）を含めることで、LLMがより高品質で整合性の取れた音楽を生成できるよう促します。

```cpp
class MCPClient
{
public:
    // コンストラクタとデストラクタ
    MCPClient();
    ~MCPClient();
    
    // LLMプロバイダーの設定
    // @param provider 使用するLLMプロバイダーのタイプ
    void setProvider(LLMProvider provider);
    
    // 音楽生成リクエストをLLMに送信
    // @param prompt ユーザーからの自然言語プロンプト
    // @param context 現在のDAWプロジェクトの音楽的コンテキスト
    // @return 生成されたMIDIシーケンスを非同期で返すFutureオブジェクト
    Future<MidiSequence> generateMidi(const String& prompt, 
                                     const MusicContext& context);
    
    // LLMからのレスポンスを処理
    // @param response MCPサーバーからのレスポンスデータ
    void handleResponse(const MCPResponse& response);
    
private:
    std::unique_ptr<juce::URL::DownloadTask> currentTask; // 現在実行中のダウンロードタスク
    LLMProvider currentProvider; // 現在選択されているLLMプロバイダー
    String apiKey; // LLMプロバイダーのAPIキー
    
    // プロバイダーごとの設定（ベースURL、モデル名、トークン制限、温度など）
    struct ProviderConfig
    {
        String baseUrl;
        String modelName;
        int maxTokens;
        float temperature;
    };
    
    std::map<LLMProvider, ProviderConfig> providerConfigs; // プロバイダー設定のマップ
};
```

#### 推奨LLMプロバイダー

複数のLLMプロバイダーを評価した結果、音楽生成タスクにおいて以下のプロバイダーを推奨します。これらは、音楽理論の理解度、創造性、出力の構造化能力、コストパフォーマンスを総合的に考慮して選定されました。

1.  **Claude 3.5 Sonnet（最優先）**: 複雑な音楽理論や構造を理解し、高品質で構造化されたMIDI出力を生成する能力に優れています。特に、楽曲の全体的な構成やハーモニーの整合性を重視する場合に最適です。
2.  **ChatGPT-4**: 汎用性が高く、ユーザーの多様な意図を正確に汲み取り、創造的なアイデアを具現化する能力に長けています。幅広い音楽ジャンルやスタイルに対応可能です。
3.  **Gemini Pro**: コストパフォーマンスに優れており、日常的な音楽生成や、上記2つのプロバイダーのバックアップとして非常に有用です。迅速なプロトタイピングや、大量の生成タスクに適しています。

これらのプロバイダーは、MCPClientを通じて動的に切り替えることができ、ユーザーは自身のニーズや予算に応じて最適なモデルを選択できます。

### AIAgentDemo実装

Agent機能は、DemoRunnerの既存のデモクラスのパターンに倣い、`AIAgentDemo`という新しい`juce::Component`クラスとして実装されます。このクラスは、ユーザーインターフェースの管理、MCPClientを介したLLMとの通信、生成されたMIDIデータの処理とDAWへの統合を担当します。既存の`PatternGeneratorDemo`の機能を拡張し、AIによる高度なパターン生成機能を提供します。

```cpp
class AIAgentDemo : public Component, // JUCEのUIコンポーネントとして機能
                   public TextEditor::Listener, // テキスト入力イベントを処理
                   public Button::Listener, // ボタンクリックイベントを処理
                   public Timer // 定期的な処理（例: UI更新、ステータスチェック）
{
public:
    // コンストラクタ: Tracktion EngineのEngineインスタンスを受け取る
    AIAgentDemo (Engine& e);
    // デストラクタ
    ~AIAgentDemo() override;
    
    // Componentクラスのオーバーライドメソッド
    void paint (Graphics& g) override; // UIの描画処理
    void resized() override; // UIのサイズ変更イベント処理
    
    // TextEditor::Listenerクラスのオーバーライドメソッド
    void textEditorReturnKeyPressed (TextEditor& editor) override; // テキストエディタでEnterキーが押された時の処理
    
    // Button::Listenerクラスのオーバーライドメソッド
    void buttonClicked (Button* button) override; // ボタンがクリックされた時の処理
    
    // Timerクラスのオーバーライドメソッド
    void timerCallback() override; // タイマーイベント発生時の処理
    
private:
    Engine& engine; // Tracktion Engineのインスタンス
    std::unique_ptr<Edit> edit; // 現在のDAWプロジェクトのEditオブジェクト
    std::unique_ptr<AudioTrack> midiTrack; // MIDIデータを配置するオーディオトラック
    
    // UIコンポーネント
    std::unique_ptr<TextEditor> promptEditor; // ユーザープロンプト入力用テキストエディタ
    std::unique_ptr<TextButton> generateButton; // MIDI生成開始ボタン
    std::unique_ptr<ComboBox> providerSelector; // LLMプロバイダー選択用ドロップダウン
    std::unique_ptr<Slider> creativitySlider; // 生成の創造性を調整するスライダー
    std::unique_ptr<Label> statusLabel; // 現在のステータス表示ラベル
    
    // AI統合関連オブジェクト
    std::unique_ptr<MCPClient> mcpClient; // MCP通信クライアント
    std::unique_ptr<LicenseManager> licenseManager; // ライセンス管理オブジェクト
    
    // 生成状態管理
    bool isGenerating = false; // 現在MIDI生成中かどうかのフラグ
    String currentPrompt; // 現在のプロンプト
    
    // ヘルパーメソッド
    void startGeneration(); // MIDI生成プロセスを開始
    void handleGenerationComplete(const MidiSequence& sequence); // MIDI生成完了時の処理
    void handleGenerationError(const String& error); // MIDI生成エラー時の処理
    void updateUI(); // UIの状態を更新
    void validateLicense(); // ライセンスの有効性を検証
};
```

### MIDI生成プロセス

Agent機能におけるMIDI生成プロセスは、ユーザーのプロンプトから最終的なMIDIデータがDAWに統合されるまでの一連のステップで構成されます。このプロセスは非同期で実行され、ユーザーインターフェースの応答性を維持します。

```mermaid
graph TD
    A[ユーザープロンプト入力] --> B{ライセンス検証}
    B -- 無効 --> C[エラーメッセージ表示]
    B -- 有効 --> D[UI更新: 生成中ステータス]
    D --> E[現在のプロジェクトコンテキスト収集]
    E --> F[MCPClient: LLMにリクエスト送信]
    F -- 非同期通信 --> G[LLMプロバイダー (Claude, ChatGPT, Gemini)]
    G --> H[LLMレスポンス受信]
    H --> I[LLM出力のMIDI変換]
    I --> J[生成されたMIDIをDAWに統合]
    J --> K[UI更新: 完了ステータス]
    F -- エラー --> L[エラーハンドリング]
    L --> C

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#fcc,stroke:#333,stroke-width:2px
    style D fill:#cfc,stroke:#333,stroke-width:2px
    style E fill:#cfc,stroke:#333,stroke-width:2px
    style F fill:#cfc,stroke:#333,stroke-width:2px
    style G fill:#ffc,stroke:#333,stroke-width:2px
    style H fill:#cfc,stroke:#333,stroke-width:2px
    style I fill:#cfc,stroke:#333,stroke-width:2px
    style J fill:#cfc,stroke:#333,stroke-width:2px
    style K fill:#9f9,stroke:#333,stroke-width:2px
    style L fill:#fcc,stroke:#333,stroke-width:2px
```

1.  **入力解析**: ユーザーが`promptEditor`に入力した自然言語プロンプトを解析します。このプロンプトは、生成したい音楽のジャンル、ムード、楽器、テンポ、特定のフレーズなど、あらゆる指示を含みます。
2.  **ライセンス検証**: `LicenseManager`を介して、ユーザーがAgent機能を使用するための有効なライセンスを持っているかを確認します。ライセンスがない場合、生成プロセスは停止し、ユーザーに通知されます。
3.  **コンテキスト構築**: 現在のDAWプロジェクトの状態（例: テンポ、拍子、キー、既存のMIDIトラックの内容、選択範囲など）を収集し、`MusicContext`オブジェクトとしてLLMに渡すための準備をします。これにより、生成されるMIDIが既存のプロジェクトと音楽的に整合性が取れるようになります。
4.  **LLM通信**: 構築されたプロンプトとコンテキストを`MCPClient`に渡し、選択されたLLMプロバイダー（Claude, ChatGPT, Geminiなど）に非同期でリクエストを送信します。この通信はバックグラウンドで行われ、UIはフリーズしません。
5.  **MIDI変換**: LLMからテキスト形式で返された音楽生成結果を、JUCEの`MidiMessage`オブジェクトの配列、すなわち`MidiSequence`に変換します。このステップでは、LLMの出力形式に応じて適切なパースと音楽理論的な解釈（例: 音符名からMIDIノート番号への変換、リズム情報の解釈）が行われます。
6.  **トラック統合**: 変換された`MidiSequence`を、現在の`Edit`（DAWプロジェクト）内の指定された`AudioTrack`または新しく作成されたトラックに統合します。これにより、生成されたMIDIデータがDAWのタイムライン上に表示され、再生可能になります。
7.  **UI更新**: 生成プロセスの進捗状況や完了、エラーなどのステータスを`statusLabel`に表示し、ユーザーにフィードバックを提供します。

以下は、`AIAgentDemo`クラス内でMIDI生成プロセスを開始する際の主要なコードスニペットです。

```cpp
void AIAgentDemo::startGeneration()
{
    // 1. ライセンス検証
    if (!licenseManager->hasValidLicense(LicenseType::Agent))
    {
        statusLabel->setText("Agent機能には有効なライセンスが必要です。", dontSendNotification);
        return;
    }
    
    isGenerating = true; // 生成中フラグをセット
    updateUI(); // UIを「生成中」の状態に更新
    
    // 2. 現在のプロジェクトコンテキストを収集
    MusicContext context; // MusicContextはDAWの状態を保持する構造体
    context.tempo = edit->tempoSequence.getTempo(0)->getBpm(); // 現在のテンポ
    context.timeSignature = edit->tempoSequence.getTimeSignature(0); // 現在の拍子
    context.key = getCurrentKey(); // 現在のキー（ヘルパー関数で取得）
    context.existingTracks = getTrackInfo(); // 既存トラックの概要情報（ヘルパー関数で取得）
    
    // 3. 非同期でMIDI生成を開始
    // MCPClientのgenerateMidiメソッドはFutureオブジェクトを返し、
    // その.then()メソッドで成功時のコールバック、.onError()でエラー時のコールバックを登録
    mcpClient->generateMidi(currentPrompt, context)
        .then([this](const MidiSequence& sequence)
        {
            // 成功時: 生成されたMIDIシーケンスを処理
            handleGenerationComplete(sequence);
        })
        .onError([this](const String& error)
        {
            // エラー時: エラーメッセージを処理
            handleGenerationError(error);
        });
}
```

この設計により、Agent機能はDAWの既存機能とシームレスに連携し、ユーザーに強力なAI支援音楽制作体験を提供します。



## Ghost Text機能の技術仕様

### 概要と設計思想

Ghost Text機能は、「Composer Copilot」のもう一つの主要なAI機能であり、ユーザーがMIDIキーボードなどからリアルタイムで入力するMIDIデータを分析し、次に入力される可能性の高いノートやコードを予測して、DAWのピアノロールやシーケンサー上にインラインで視覚的に提案する機能です。この機能は、ユーザーの音楽制作フローを中断することなく、直感的なアシストを提供し、作曲のインスピレーションを刺激することを目的としています。

この機能は、DemoRunnerの既存の`MidiRecordingDemo`を基盤として実装されます。既存のMIDI入力処理と録音機能を活用し、その上にAI予測機能を統合することで、低レイテンシーでのリアルタイムアシストを実現します。

設計のポイントは以下の通りです。

-   **リアルタイム性**: ユーザーの入力に即座に反応し、予測結果をほぼリアルタイムで表示することで、シームレスな音楽制作体験を提供します。
-   **プライバシー保護**: ユーザーのMIDI入力データは、外部のクラウドサービスに送信されることなく、ローカルで動作するPython AIサーバーによって処理されます。これにより、ユーザーのプライバシーが保護されます。
-   **インライン提案**: 予測されたノートは、ピアノロールなどのUI上に「ゴースト」のように表示され、ユーザーがそれを採用するかどうかを直感的に判断できます。
-   **適応的予測**: ユーザーの入力速度や複雑さに応じて、予測の頻度や詳細度を動的に調整し、最適なアシストを提供します。

### アーキテクチャ設計

Ghost Text機能は、プライバシー保護とリアルタイム性を最優先に考慮したアーキテクチャを採用しています。主要なコンポーネントは、DAWアプリケーション内のC++クライアントと、ローカルで動作するPython AIサーバーです。この分離されたアーキテクチャにより、DAWのメインスレッドの負荷を軽減し、AI処理を効率的に実行できます。

```mermaid
graph TD
    A[ユーザーMIDI入力 (MIDIキーボード)] --> B[JUCE MidiInputCallback]
    B --> C[GhostTextDemo (C++)]
    C --> D[GhostTextClient (C++)]
    D -- HTTP/JSON --> E[Python AIサーバー (ローカル)]
    E --> F[AIモデル (PyTorch/Transformers)]
    F --> E
    E -- HTTP/JSON --> D
    D --> C
    C --> G[UI更新: ゴーストノート表示]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#ccf,stroke:#333,stroke-width:2px
    style D fill:#cfc,stroke:#333,stroke-width:2px
    style E fill:#ffc,stroke:#333,stroke-width:2px
    style F fill:#fcc,stroke:#333,stroke-width:2px
    style G fill:#9f9,stroke:#333,stroke-width:2px
```

#### Python AI サーバー

Ghost Text機能の核となるAI推論は、ローカルで動作するPython AIサーバーによって行われます。このサーバーはFlaskフレームワークで構築され、PyTorchとHugging Face Transformersライブラリを使用して音楽予測モデルをホストします。ユーザーのMIDIデータは、このサーバーに送信され、予測結果がC++クライアントに返されます。このサーバーは、GPU加速をサポートし、高速な推論を実現します。

```python
# ghost_text_server.py
from flask import Flask, request, jsonify
import torch
from transformers import AutoModel, AutoTokenizer
import numpy as np
from music21 import stream, note, chord # 音楽理論的な処理に利用
import threading
import queue
import time
from functools import lru_cache

app = Flask(__name__)

class GhostTextPredictor:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.prediction_queue = queue.Queue() # 非同期処理のためのキュー
        self.load_model()
    
    def load_model(self):
        # 初期は公開されている音楽予測モデルを使用
        # 将来的には独自モデルに置き換え、より音楽に特化したモデルを開発
        model_name = "microsoft/DialoGPT-medium"  # 仮の例: 音楽予測に特化したモデルに置き換える
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name).to(self.device)
        self.model.eval() # 推論モードに設定
        
        # 推論最適化: torch.compileはPyTorch 2.0以降で利用可能
        if hasattr(torch, 'compile'):
            try:
                self.model = torch.compile(self.model)
                print("PyTorch compileによる推論最適化を適用しました。")
            except Exception as e:
                print(f"PyTorch compileの適用に失敗しました: {e}")

    # MIDIシーケンスをトークン化するヘルパー関数（仮実装）
    def midi_to_tokens(self, midi_sequence):
        # 実際のMIDIデータをモデルが理解できるトークンシーケンスに変換するロジック
        # 例: [60, 64, 67, 72] -> [token_C4, token_E4, token_G4, token_C5]
        # ここでは簡略化のため、MIDIノート番号をそのままトークンとして扱う
        return [m['noteNumber'] for m in midi_sequence]

    # トークンをMIDIノート情報に変換するヘルパー関数（仮実装）
    def token_to_note(self, token_id):
        # モデルの出力トークンを実際のMIDIノート情報に変換するロジック
        # 例: token_C4 -> {'noteNumber': 60, 'velocity': 80, 'duration': 0.5}
        return {'noteNumber': token_id, 'velocity': 80, 'duration': 0.5}

    @lru_cache(maxsize=1000) # 予測結果をキャッシュし、同じ入力に対する再計算を避ける
    def predict_next_notes(self, midi_sequence_tuple, context_length=32):
        """
        MIDIシーケンスから次のノートを予測します。
        """
        midi_sequence = list(midi_sequence_tuple) # タプルをリストに変換
        
        # MIDIシーケンスをトークン化
        tokens = self.midi_to_tokens(midi_sequence)
        
        # 最新のコンテキストを取得
        context = tokens[-context_length:] if len(tokens) > context_length else tokens
        
        if not context: # コンテキストが空の場合は予測しない
            return []

        # モデルで予測
        with torch.no_grad():
            # モデルへの入力形式に合わせてテンソルを準備
            input_ids = torch.tensor([context], device=self.device)
            outputs = self.model(input_ids)
            
            # 最後のトークンに対する予測確率分布を取得
            predictions = torch.softmax(outputs.logits[0, -1, :], dim=-1)
        
        # 上位候補を取得
        # ここでは仮に上位5つの予測を取得
        top_predictions = torch.topk(predictions, k=5)
        
        # トークンをMIDIノートに変換
        predicted_notes = []
        for i, (prob, token_id) in enumerate(zip(top_predictions.values, top_predictions.indices)):
            note_info = self.token_to_note(token_id.item())
            if note_info:
                predicted_notes.append({
                    'note': note_info, # 例: {'noteNumber': 60, 'velocity': 80, 'duration': 0.5}
                    'probability': prob.item(),
                    'rank': i + 1
                })
        
        return predicted_notes

predictor = GhostTextPredictor()

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    midi_sequence = data.get('midi_sequence', [])
    
    try:
        # キャッシュキーとして利用するため、リストをタプルに変換
        predictions = predictor.predict_next_notes(tuple(midi_sequence))
        return jsonify({
            'success': True,
            'predictions': predictions,
            'timestamp': time.time() # 応答時刻を追加
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """サーバーのヘルスチェックエンドポイント"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': predictor.model is not None,
        'device': str(predictor.device)
    })

if __name__ == '__main__':
    # 本番環境ではdebug=Falseに設定
    app.run(host='127.0.0.1', port=8888, threaded=True, debug=False)
```

#### C++ クライアント実装

DAWアプリケーション側では、`GhostTextDemo`クラスがユーザーのMIDI入力を監視し、`GhostTextClient`を介してPython AIサーバーと通信します。`GhostTextDemo`は、DemoRunnerの`MidiRecordingDemo`を拡張する形で実装され、既存のMIDI入力処理パイプラインにAI予測機能を統合します。

```cpp
class GhostTextDemo : public Component, // JUCEのUIコンポーネントとして機能
                     public MidiInputCallback, // MIDI入力イベントを処理
                     public Timer // 定期的な処理（例: 予測更新）
{
public:
    // コンストラクタ: Tracktion EngineのEngineインスタンスを受け取る
    GhostTextDemo (Engine& e);
    // デストラクタ
    ~GhostTextDemo() override;
    
    // Componentクラスのオーバーライドメソッド
    void paint (Graphics& g) override; // UIの描画処理
    void resized() override; // UIのサイズ変更イベント処理
    
    // MidiInputCallbackクラスのオーバーライドメソッド
    void handleIncomingMidiMessage (MidiInput* source, 
                                   const MidiMessage& message) override; // 受信したMIDIメッセージの処理
    
    // Timerクラスのオーバーライドメソッド
    void timerCallback() override; // タイマーイベント発生時の処理
    
private:
    Engine& engine; // Tracktion Engineのインスタンス
    std::unique_ptr<Edit> edit; // 現在のDAWプロジェクトのEditオブジェクト
    std::unique_ptr<AudioTrack> midiTrack; // MIDIデータを配置するオーディオトラック
    
    // MIDI録音関連（既存のMidiRecordingDemoから継承）
    std::unique_ptr<MidiInputDevice> midiInput; // MIDI入力デバイス
    Array<MidiMessage> recordedMessages; // 録音されたMIDIメッセージ
    bool isRecording = false; // 録音中かどうかのフラグ
    
    // Ghost Text機能固有のメンバー
    std::unique_ptr<GhostTextClient> ghostClient; // Python AIサーバーとの通信クライアント
    Array<PredictedNote> currentPredictions; // 現在の予測結果
    Array<MidiMessage> recentInput; // 最近のMIDI入力履歴（予測コンテキスト用）
    
    // UIコンポーネント
    std::unique_ptr<TextButton> recordButton; // 録音開始/停止ボタン
    std::unique_ptr<ToggleButton> ghostTextToggle; // Ghost Text機能の有効/無効切り替えトグル
    std::unique_ptr<Slider> sensitivitySlider; // 予測感度調整スライダー
    std::unique_ptr<Label> statusLabel; // ステータス表示ラベル
    
    // 描画関連
    void paintGhostNotes (Graphics& g); // ゴーストノートの描画処理
    void updatePredictions(); // 予測を更新し、UIに反映
    void addToRecentInput (const MidiMessage& message); // 最近の入力履歴にMIDIメッセージを追加
    
    // 設定
    static constexpr int maxRecentInputSize = 64; // 最近の入力履歴の最大サイズ
    static constexpr int predictionUpdateIntervalMs = 100; // 予測更新間隔（ミリ秒）
};

class GhostTextClient : public juce::URL::DownloadTask::Listener // JUCEのHTTPダウンロードリスナーを継承
{
public:
    // コンストラクタとデストラクタ
    GhostTextClient();
    ~GhostTextClient();
    
    // Python AIサーバーに予測リクエストを送信
    // @param recentInput 最近のMIDI入力シーケンス
    void requestPrediction (const Array<MidiMessage>& recentInput);
    
    // 最新の予測結果を取得
    // @return 予測されたノートの配列
    Array<PredictedNote> getLatestPredictions() const;
    
    // Python AIサーバーの接続状態を確認
    // @return サーバーが利用可能であればtrue
    bool isServerAvailable() const;
    
private:
    std::unique_ptr<juce::URL::DownloadTask> currentTask; // 現在実行中のHTTPリクエスト
    Array<PredictedNote> latestPredictions; // 最新の予測結果
    bool serverAvailable = false; // サーバーの利用可能性フラグ
    
    // Python APIサーバーとの通信処理
    void sendPredictionRequest (const String& jsonData); // JSONデータを送信
    void handlePredictionResponse (const String& response); // サーバーからの応答を処理
    
    // MIDIメッセージとJSON間の変換ユーティリティ
    String midiMessagesToJson (const Array<MidiMessage>& messages); // MIDIメッセージ配列をJSON文字列に変換
    Array<PredictedNote> jsonToPredictions (const String& json); // JSON文字列を予測ノート配列に変換

    // URL::DownloadTask::Listenerのオーバーライド
    void downloadFinished (juce::URL::DownloadTask* task, bool success) override;
    void downloadProgress (juce::URL::DownloadTask* task, int bytesReceived, int totalBytes) override;
};
```

### リアルタイム処理最適化

Ghost Text機能は、ユーザー体験に直結するリアルタイム性が極めて重要です。以下の最適化手法を実装することで、低レイテンシーでスムーズな予測表示を実現します。

#### 1. 予測キャッシュシステム

同じMIDI入力シーケンスに対して繰り返し予測リクエストを送信するのを避けるため、予測結果をキャッシュします。これにより、AIサーバーへのリクエスト数を減らし、応答時間を短縮します。

```cpp
class PredictionCache
{
public:
    struct CacheEntry
    {
        Array<MidiMessage> inputSequence; // 入力MIDIシーケンス
        Array<PredictedNote> predictions; // 予測結果
        Time timestamp; // キャッシュされた時刻
        int64 hash; // 入力シーケンスのハッシュ値
    };
    
    // キャッシュされた予測結果を取得
    // @param input 入力MIDIシーケンス
    // @param output 予測結果を格納する配列
    // @return キャッシュヒットした場合true
    bool getCachedPrediction (const Array<MidiMessage>& input, 
                             Array<PredictedNote>& output);
    
    // 予測結果をキャッシュに保存
    // @param input 入力MIDIシーケンス
    // @param predictions 予測結果
    void cachePrediction (const Array<MidiMessage>& input, 
                         const Array<PredictedNote>& predictions);
    
private:
    Array<CacheEntry> cache; // キャッシュエントリの配列
    static constexpr int maxCacheSize = 1000; // キャッシュの最大サイズ
    
    int64 calculateHash (const Array<MidiMessage>& input); // 入力シーケンスのハッシュ値を計算
    void cleanupOldEntries(); // 古いキャッシュエントリを削除
};
```

#### 2. 適応的予測頻度

ユーザーのMIDI入力の速度や頻度に応じて、Python AIサーバーへの予測リクエストの頻度を動的に調整します。例えば、ユーザーが高速でノートを入力している間は予測頻度を下げ、入力が落ち着いた時に詳細な予測を提供するなど、リソースの効率的な利用とユーザー体験のバランスを取ります。

```cpp
void GhostTextDemo::timerCallback()
{
    // 入力の変化率に基づいて予測頻度を調整
    auto currentTime = Time::getCurrentTime();
    auto timeSinceLastInput = currentTime - lastInputTime; // 最後の入力からの経過時間
    
    if (timeSinceLastInput.inMilliseconds() < 50) // 高速入力中
    {
        // 予測頻度を下げ、UIの更新間隔を長くする
        startTimer (200); 
    }
    else if (timeSinceLastInput.inMilliseconds() > 1000) // 入力が止まった
    {
        // 予測を停止し、リソースを解放
        stopTimer();
    }
    else // 通常の入力速度
    {
        // 通常の予測頻度で予測を更新
        startTimer (predictionUpdateIntervalMs); // predictionUpdateIntervalMsは通常100ms
        updatePredictions();
    }
}
```

#### 3. GPU加速対応

Python AIサーバーは、実行環境で利用可能な場合はNVIDIA GPUなどのハードウェア加速を自動的に利用します。PyTorchはCUDAをサポートしており、GPUが利用可能であれば、CPUと比較して大幅に高速な推論性能を発揮します。これにより、リアルタイム予測のレイテンシーを最小限に抑えます。

```python
def __init__(self):
    # GPU利用可能性をチェックし、最適なデバイスを選択
    if torch.cuda.is_available():
        self.device = torch.device("cuda")
        print(f"GPU加速を使用: {torch.cuda.get_device_name(self.device)}")
    else:
        self.device = torch.device("cpu")
        print("CPU推論を使用")
    
    # モデルを適切なデバイスに移動
    self.model = self.model.to(self.device)
    
    # 推論最適化: PyTorch 2.0以降のtorch.compileを利用
    if hasattr(torch, 'compile'):
        try:
            self.model = torch.compile(self.model)
            print("PyTorch compileによる推論最適化を適用しました。")
        except Exception as e:
            print(f"PyTorch compileの適用に失敗しました: {e}")
```

これらの最適化により、Ghost Text機能はユーザーにスムーズで応答性の高いリアルタイム音楽予測アシストを提供し、作曲プロセスを強力にサポートします。



## 有料化アーキテクチャ

### 概要と戦略

AI統合DAW「Composer Copilot」は、フリーミアム戦略を採用し、ユーザーベースの拡大と収益化の両立を目指します。この戦略では、基本的なDAW機能とGhost Text機能は無料で提供することで、幅広いユーザーに製品を体験してもらい、導入障壁を低減します。一方、高度なAI機能であるAgent機能は有料機能として提供し、これにより収益を確保します。

このアプローチの利点は以下の通りです。

-   **ユーザー獲得**: 無料で提供されるコア機能とGhost Text機能により、多くのユーザーが製品を試用しやすくなります。
-   **価値の明確化**: Agent機能という明確な付加価値を有料化することで、ユーザーは支払う価値を理解しやすくなります。
-   **持続可能な開発**: 有料機能からの収益は、製品の継続的な開発とAIモデルの改善に再投資され、より高品質なサービス提供に繋がります。

### ライセンス管理システム

製品の有料化を支えるため、堅牢なライセンス管理システムを導入します。このシステムは、ユーザーのライセンスタイプを識別し、Agent機能の利用可否や使用量制限を制御します。主要なコンポーネントは、DAWアプリケーション内に組み込まれる`LicenseManager`クラスと、外部のライセンス認証サーバーです。

#### LicenseManagerクラス

`LicenseManager`クラスは、DAWアプリケーション内でライセンスの状態を管理し、有料機能へのアクセスを制御する役割を担います。このクラスは、ライセンスの検証、使用量追跡、デバイス認証、およびライセンスサーバーとの通信を非同期で行います。

```cpp
class LicenseManager : public Timer // 定期的なライセンスチェックのためにTimerを継承
{
public:
    // ライセンスタイプを定義
    enum class LicenseType
    {
        Free,           // 基本機能のみ利用可能
        Agent,          // Agent機能が利用可能
        Professional    // 全機能（Agent、Ghost Textの高度機能など）が利用可能 + 追加特典
    };
    
    // ライセンスの状態を定義
    enum class LicenseStatus
    {
        Valid,                  // 有効なライセンス
        Expired,                // 期限切れ
        Invalid,                // 無効なライセンスキー
        NetworkError,           // ネットワーク接続エラー
        DeviceLimitExceeded     // デバイス制限超過
    };
    
    // コンストラクタとデストラクタ
    LicenseManager();
    ~LicenseManager() override;
    
    // 指定されたライセンスタイプが有効であるかを確認
    // @param requiredType 必要なライセンスタイプ
    // @return 有効であればtrue
    bool hasValidLicense (LicenseType requiredType) const;
    
    // ライセンスの有効性をサーバーと同期して検証
    // @return 現在のライセンス状態
    LicenseStatus validateLicense();
    
    // Agent機能が現在利用可能かを確認（使用量制限も考慮）
    // @return 利用可能であればtrue
    bool canUseAgent() const;
    
    // Agent機能の使用を記録
    void recordAgentUsage();
    
    // 今月のAgent機能の残り利用回数を取得
    // @return 残り利用回数
    int getRemainingAgentCalls() const;
    
    // デバイスのフィンガープリントを取得
    // @return デバイス固有の識別子
    String getDeviceFingerprint() const;
    
    // 現在のデバイスがライセンスで認証されているかを確認
    // @return 認証されていればtrue
    bool isDeviceAuthorized() const;
    
    // Timerクラスのオーバーライドメソッド
    void timerCallback() override; // 定期的なライセンス検証や使用量リセット処理
    
private:
    LicenseType currentLicenseType = LicenseType::Free; // 現在のライセンスタイプ
    LicenseStatus currentStatus = LicenseStatus::Invalid; // 現在のライセンス状態
    
    // 使用量追跡
    int agentCallsThisMonth = 0; // 今月のAgent機能利用回数
    int maxAgentCallsPerMonth = 0; // 月ごとのAgent機能最大利用回数（有料版のみ適用）
    Time lastResetTime; // 最後に使用量がリセットされた日時
    
    // デバイス情報とライセンスキー
    String deviceFingerprint; // デバイス固有の識別子
    String licenseKey; // ユーザーのライセンスキー
    String userEmail; // ユーザーのメールアドレス
    
    // ネットワーク通信
    std::unique_ptr<juce::URL::DownloadTask> validationTask; // ライセンス検証用のダウンロードタスク
    
    // ライセンスサーバーとの通信ヘルパー
    void validateWithServer(); // サーバーにライセンス検証リクエストを送信
    void handleValidationResponse (const String& response); // サーバーからの応答を処理
    String generateDeviceFingerprint(); // デバイスフィンガープリントを生成
    
    // ローカルライセンス情報の管理
    void saveLicenseInfo(); // ライセンス情報をローカルに保存
    void loadLicenseInfo(); // ローカルからライセンス情報をロード
    String getLicenseFilePath() const; // ライセンスファイルのパスを取得
};
```

#### 使用量制限の実装

`LicenseManager`クラスは、特にAgent機能の無料試用版やサブスクリプションプランにおける使用量制限を管理します。例えば、無料版ではAgent機能が利用不可、特定の有料プランでは月間の利用回数に制限がある、といったビジネスロジックを実装します。

```cpp
bool LicenseManager::canUseAgent() const
{
    switch (currentLicenseType)
    {
        case LicenseType::Free:
            return false;  // 無料版ではAgent機能は使用不可
            
        case LicenseType::Agent:
            // Agentライセンスの場合、月間の利用回数制限をチェック
            return agentCallsThisMonth < maxAgentCallsPerMonth;
            
        case LicenseType::Professional:
            return true;  // Professionalライセンスでは無制限
    }
    return false; // 未定義のライセンスタイプの場合
}

void LicenseManager::recordAgentUsage()
{
    if (currentLicenseType == LicenseType::Free)
        return; // 無料版では使用量を記録しない
    
    // 月初に利用回数をリセットするロジック
    auto now = Time::getCurrentTime();
    if (now.getMonth() != lastResetTime.getMonth() || 
        now.getYear() != lastResetTime.getYear())
    {
        agentCallsThisMonth = 0; // 新しい月になったらリセット
        lastResetTime = now; // リセット日時を更新
        saveLicenseInfo(); // ローカルに保存
    }
    
    agentCallsThisMonth++; // 利用回数をインクリメント
    saveLicenseInfo(); // ローカルに保存
    
    // 使用量をライセンスサーバーに報告（非同期処理）
    reportUsageToServer(); // この関数は別途実装される
}
```

### ライセンス認証サーバー

ライセンス認証サーバーは、ユーザーのライセンスキーの検証、デバイス認証、使用量データの集計と管理を行うバックエンドシステムです。このサーバーは、セキュアなAPIエンドポイントを提供し、DAWアプリケーションからのリクエストを処理します。PythonのFlaskフレームワークで実装され、データベース（SQLiteなど）でライセンス情報を管理し、Stripeなどの決済サービスと連携します。

```python
# license_server.py
from flask import Flask, request, jsonify
from flask_cors import CORS # CORS対応のため
import sqlite3
import hashlib # デバイスフィンガープリントのハッシュ化に利用
import jwt # JWTトークンによる認証に利用
import datetime
from cryptography.fernet import Fernet # ライセンスキーの暗号化に利用
import stripe # 決済サービス連携

app = Flask(__name__)
CORS(app) # クロスオリジンリクエストを許可

# Stripe APIキーの設定（本番環境では環境変数から読み込むべき）
stripe.api_key = "sk_test_..." 

class LicenseManager:
    def __init__(self):
        self.db_path = "licenses.db" # ライセンス情報を保存するデータベースファイル
        self.secret_key = "your-secret-key" # JWT署名や暗号化に使う秘密鍵（本番環境では強力なものを使用）
        self.fernet = Fernet(Fernet.generate_key()) # ライセンスキー暗号化用のFernetインスタンス
        self.init_database() # データベースの初期化
    
    def init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                license_key TEXT UNIQUE NOT NULL,
                license_type TEXT NOT NULL, -- 'Free', 'Agent', 'Professional'
                start_date TEXT NOT NULL,
                end_date TEXT,
                is_active INTEGER DEFAULT 1
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS device_activations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_id INTEGER NOT NULL,
                device_fingerprint TEXT NOT NULL,
                activation_date TEXT NOT NULL,
                FOREIGN KEY (license_id) REFERENCES licenses(id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_id INTEGER NOT NULL,
                month TEXT NOT NULL,
                agent_calls INTEGER DEFAULT 0,
                FOREIGN KEY (license_id) REFERENCES licenses(id)
            )
        """)
        conn.commit()
        conn.close()

    # 以下、ライセンス生成、検証、使用量記録などのAPIエンドポイントの実装が続く
    # 例: /register_license, /validate_license, /record_usage

# Flaskアプリケーションのルート定義
# @app.route('/register_license', methods=['POST'])
# def register_license():
#    ...

# @app.route('/validate_license', methods=['POST'])
# def validate_license():
#    ...

# @app.route('/record_usage', methods=['POST'])
# def record_usage():
#    ...

if __name__ == '__main__':
    license_manager = LicenseManager()
    app.run(host='0.0.0.0', port=5000, debug=True) # 本番環境ではdebug=False
```

この有料化アーキテクチャにより、「Composer Copilot」は安定した収益基盤を確立し、継続的な製品改善と革新的なAI機能の開発を推進することが可能になります。



クを使用し、以下の機能を提供します。

-   **MIDIデータ受信**: JUCEアプリケーションから送信されたMIDIシーケンス（JSON形式）を受信します。
-   **AI推論**: 受信したMIDIシーケンスを基に、訓練済みのAIモデル（例: Transformerベースの音楽生成モデル）を使用して、次に来る可能性のあるノートやコードを予測します。
-   **予測結果送信**: 予測結果をJSON形式でJUCEアプリケーションに返します。

Python AIサーバーは、以下のエンドポイントを提供します。

-   `/predict` (POST): MIDIシーケンスを受け取り、予測されたノートのリストを返します。
-   `/health` (GET): サーバーの稼働状況をチェックします。

#### GhostTextClient実装

`GhostTextClient`クラスは、JUCEアプリケーションからPython AIサーバーへのHTTP通信を管理します。このクライアントは、JUCEの`URL::DownloadTask`を利用して非同期通信を行い、DAWのUIスレッドをブロックすることなくAI推論リクエストを送信します。

```cpp
class GhostTextClient
{
public:
    // コンストラクタとデストラクタ
    GhostTextClient();
    ~GhostTextClient();
    
    // Python AIサーバーに予測リクエストを送信
    // @param recentInput 最近のMIDI入力メッセージの配列
    // @return 予測されたノートの配列を非同期で返すFutureオブジェクト
    Future<juce::Array<PredictedNote>> requestPrediction (const juce::Array<juce::MidiMessage>& recentInput);
    
    // Python AIサーバーの接続状態を確認
    bool isServerAvailable() const; // ヘルスチェックエンドポイントを叩く

private:
    juce::String serverUrl; // Python AIサーバーのURL
    std::unique_ptr<juce::URL::DownloadTask> currentTask; // 現在実行中のダウンロードタスク
    
    // MIDIメッセージとJSON間の変換ユーティリティ
    juce::String midiMessagesToJson (const juce::Array<juce::MidiMessage>& messages);
    juce::Array<PredictedNote> jsonToPredictions (const juce::String& json);
};
```

`midiMessagesToJson`メソッドは、JUCEの`MidiMessage`オブジェクトの配列を、Pythonサーバーが解釈できるJSON形式に変換します。`jsonToPredictions`メソッドは、Pythonサーバーから返されたJSON形式の予測結果を、JUCEアプリケーションで利用可能な`PredictedNote`構造体の配列に変換します。

### GhostTextDemo実装

Ghost Text機能は、`GhostTextDemo`という新しい`juce::Component`クラスとして実装されます。このクラスは、以下の主要な役割を担います。

-   **MIDI入力監視**: JUCEの`MidiInputCallback`を実装し、ユーザーからのリアルタイムMIDI入力を監視します。入力されたノートは、予測のために`GhostTextClient`に送信されます。
-   **予測結果の描画**: `GhostTextClient`から受け取った予測されたノートの情報を、DAWのピアノロールビューにオーバーレイ表示します。これらの「ゴーストノート」は、半透明で表示され、ユーザーがそれを採用するかどうかを視覚的に判断できるようにします。
-   **UI管理**: Ghost Text機能の有効/無効切り替え、MIDI入力デバイスの選択、予測感度の調整などのUI要素を提供します。

```cpp
class GhostTextDemo : public Component,
                     public MidiInputCallback,
                     public Timer
{
public:
    // コンストラクタとデストラクタ
    GhostTextDemo (Engine& e);
    ~GhostTextDemo() override;
    
    // UI描画とレイアウト
    void paint (Graphics& g) override;
    void resized() override;
    
    // MIDI入力イベントハンドリング
    void handleIncomingMidiMessage (MidiInput* source, const MidiMessage& message) override;
    
    // タイマーコールバック（定期的な予測更新）
    void timerCallback() override;
    
private:
    Engine& engine;
    
    // UIコンポーネント
    std::unique_ptr<ToggleButton> ghostTextToggle; // 機能有効/無効
    std::unique_ptr<ComboBox> midiInputSelector; // MIDI入力デバイス選択
    std::unique_ptr<Slider> sensitivitySlider; // 予測感度
    std::unique_ptr<Label> statusLabel; // ステータス表示
    
    // AI関連オブジェクト
    std::unique_ptr<GhostTextClient> ghostClient; // Python AIサーバー通信クライアント
    
    // 内部状態
    juce::Array<juce::MidiMessage> recentInput; // 最近のMIDI入力履歴
    juce::Array<PredictedNote> currentPredictions; // 現在の予測結果
    juce::Time lastInputTime; // 最後のMIDI入力時刻
    
    // ヘルパーメソッド
    void paintGhostNotes (Graphics& g); // ゴーストノートの描画ロジック
    void updatePredictions(); // 予測を更新し、UIに反映
    void addToRecentInput (const MidiMessage& message); // 入力履歴に追加
    void clearRecentInput(); // 入力履歴をクリア
};
```

### リアルタイム予測フロー

Ghost Text機能のリアルタイム予測フローは以下のステップで進行します。

```mermaid
graph TD
    A[ユーザーMIDI入力] --> B[GhostTextDemo::handleIncomingMidiMessage]
    B --> C{Ghost Text有効?}
    C -- Yes --> D[入力履歴に追加]
    D --> E[GhostTextClient::requestPrediction (非同期)]
    E -- HTTP/JSON --> F[Python AIサーバー]
    F --> G[AIモデル推論]
    G --> F
    F -- HTTP/JSON --> E
    E --> H[GhostTextDemo::updatePredictions (コールバック)]
    H --> I[UI更新: ゴーストノート描画]
    C -- No --> J[何もしない]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bbf,stroke:#333,stroke-width:2px
    style D fill:#cfc,stroke:#333,stroke-width:2px
    style E fill:#cfc,stroke:#333,stroke-width:2px
    style F fill:#ffc,stroke:#333,stroke-width:2px
    style G fill:#fcc,stroke:#333,stroke-width:2px
    style H fill:#cfc,stroke:#333,stroke-width:2px
    style I fill:#9f9,stroke:#333,stroke-width:2px
    style J fill:#eee,stroke:#333,stroke-width:2px
```

1.  **MIDI入力**: ユーザーがMIDIキーボードを演奏すると、JUCEの`MidiInputCallback`を通じて`GhostTextDemo::handleIncomingMidiMessage`が呼び出されます。
2.  **入力履歴の更新**: 受信したMIDIメッセージは、`recentInput`配列に追加され、直近の演奏履歴が保持されます。
3.  **予測リクエスト**: `GhostTextClient::requestPrediction`が非同期で呼び出され、現在の`recentInput`をJSON形式でPython AIサーバーに送信します。
4.  **AI推論**: Python AIサーバーは、受信したMIDIシーケンスをAIモデルに入力し、次のノートやコードの予測を行います。
5.  **予測結果の受信と描画**: Python AIサーバーからの予測結果が`GhostTextClient`を通じて`GhostTextDemo`に返されます。`GhostTextDemo`は、この予測結果を解析し、DAWのピアノロール上に半透明の「ゴーストノート」として描画します。これにより、ユーザーはリアルタイムでAIの提案を確認できます。
6.  **タイマーによる更新**: `timerCallback`は定期的に呼び出され、一定時間MIDI入力がない場合でも予測を更新したり、古い予測をクリアしたりする役割を担います。これにより、UIの表示が常に最新の状態に保たれます。

このリアルタイム予測フローにより、Ghost Text機能はユーザーの音楽制作を強力にアシストし、創造性を刺激する革新的な体験を提供します。



## 有料化アーキテクチャ

### 概要と戦略

AI統合DAW「Composer Copilot」は、フリーミアムモデルを採用し、基本的なDAW機能と一部のAI機能を無料で提供しつつ、高度なAI機能や追加サービスを有料サブスクリプションとして提供します。この戦略により、幅広いユーザーベースを獲得しつつ、持続可能な収益モデルを確立することを目指します。

有料化の主な対象は、大規模言語モデル (LLM) を利用する「Agent機能」と、ローカルAIモデルを利用する「Ghost Text機能」の高度な利用です。特にLLMの利用にはコストが発生するため、その利用量に応じた課金や、一定回数以上の利用に対するサブスクリプションモデルを導入します。

### ライセンス管理システム

ライセンス管理システムは、ユーザーのライセンス状態を検証し、AI機能の利用を制御する役割を担います。このシステムは、クライアントサイドの`LicenseManager`クラスと、サーバーサイドのライセンス認証サーバーで構成されます。

```mermaid
graph TD
    A[DAWアプリケーション (Composer Copilot)] --> B[LicenseManager (C++)]
    B -- HTTPS --> C[ライセンス認証サーバー (バックエンド)]
    C --> D[データベース (ユーザー, ライセンス, 使用量)]
    D --> C
    C -- HTTPS --> B
    B --> E[AI機能 (Agent/Ghost Text)]
    E --> B

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#ccf,stroke:#333,stroke-width:2px
    style C fill:#ffc,stroke:#333,stroke-width:2px
    style D fill:#fcc,stroke:#333,stroke-width:2px
    style E fill:#9f9,stroke:#333,stroke-width:2px
```

#### LicenseManagerクラス

`LicenseManager`クラスは、JUCEアプリケーション内で動作し、以下の機能を提供します。

-   **ライセンスキーの管理**: ユーザーが入力したライセンスキーを安全に保存・管理します。
-   **ライセンス検証**: 起動時やAI機能利用時に、ライセンス認証サーバーに対してライセンスキーの有効性を問い合わせます。これにより、不正利用を防ぎます。
-   **利用状況の追跡**: Agent機能の利用回数やGhost Text機能の利用時間など、AI機能の利用状況をローカルで追跡し、定期的にサーバーに同期します。これにより、利用制限の適用や課金情報の収集を可能にします。
-   **利用制限の適用**: ライセンスの種類や利用状況に応じて、AI機能の利用を制限します（例: 無料ユーザーはAgent機能の利用回数に制限がある）。

```cpp
class LicenseManager
{
public:
    enum class LicenseType
    {
        Agent,      // Agent機能のライセンス
        GhostText,  // Ghost Text機能のライセンス
        Pro         // 全機能利用可能なプロライセンス
    };

    // コンストラクタとデストラクタ
    LicenseManager();
    ~LicenseManager();

    // ライセンスキーを設定
    void setLicenseKey(const juce::String& key);

    // ライセンスの有効性を検証（サーバーと通信）
    Future<bool> validateLicense();

    // 特定の機能が利用可能かチェック
    bool hasValidLicense(LicenseType type) const;
    bool canUseAgent() const; // Agent機能が利用可能か
    bool canUseGhostText() const; // Ghost Text機能が利用可能か

    // AI機能の利用を記録
    void recordAgentUsage();
    void recordGhostTextUsage(double durationSeconds);

private:
    juce::String licenseKey; // ユーザーのライセンスキー
    juce::String userEmail; // ユーザーのメールアドレス（認証用）
    bool agentLicensed = false; // Agent機能のライセンス状態
    bool ghostTextLicensed = false; // Ghost Text機能のライセンス状態
    int agentUsageCount = 0; // Agent機能の利用回数
    // ... その他の利用状況追跡変数

    // サーバーとの通信用ヘルパー
    juce::String serverUrl = "https://api.composer-copilot.com/license"; // ライセンスサーバーURL
    std::unique_ptr<juce::URL::DownloadTask> currentValidationTask;

    // ローカル設定の保存とロード
    void loadLocalSettings();
    void saveLocalSettings();
};
```

#### ライセンス認証サーバー

ライセンス認証サーバーは、バックエンドで動作し、以下の機能を提供します。

-   **ライセンスキーの生成と管理**: 新しいライセンスキーを発行し、データベースに保存します。
-   **ライセンス検証API**: クライアントからのライセンス検証リクエストを受け取り、データベースと照合して有効性を判断します。
-   **利用状況の同期と集計**: クライアントから送信される利用状況データを受け取り、集計します。これにより、利用制限の適用や課金処理のトリガーとします。
-   **ユーザー管理**: ユーザーアカウント、サブスクリプションプラン、支払い情報などを管理します。

サーバーサイドは、PythonのFlaskフレームワークとSQLAlchemy ORMを使用して実装されます。データベースにはPostgreSQLなどのリレーショナルデータベースを使用し、ユーザー、ライセンスキー、利用状況などの情報を格納します。

`license_server/src/main.py`
```python
from flask import Flask, request, jsonify
from models.license import License, db
from routes.license import license_bp

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///licenses.db' # 実際の運用ではPostgreSQLなどを使用
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

app.register_blueprint(license_bp, url_prefix='/license')

@app.route('/')
def index():
    return "Composer Copilot License Server"

if __name__ == '__main__':
    with app.app_context():
        db.create_all() # データベーステーブルを作成
    app.run(debug=True, port=5000)
```

`license_server/src/models/license.py`
```python
from flask_sqlalchemy import SQLAlchemy
import datetime
import uuid

db = SQLAlchemy()

class License(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    user_email = db.Column(db.String(120), unique=True, nullable=False)
    license_type = db.Column(db.String(50), nullable=False) # 'Agent', 'GhostText', 'Pro'
    expires_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    agent_usage_count = db.Column(db.Integer, default=0)
    ghost_text_usage_seconds = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)

    def __repr__(self):
        return f'<License {self.key}>'
```

`license_server/src/routes/license.py`
```python
from flask import Blueprint, request, jsonify
from models.license import db, License
import datetime

license_bp = Blueprint('license', __name__)

@license_bp.route('/validate', methods=['POST'])
def validate_license():
    data = request.get_json()
    key = data.get('key')
    user_email = data.get('user_email')

    license = License.query.filter_by(key=key, user_email=user_email, is_active=True).first()

    if license and (license.expires_at is None or license.expires_at > datetime.datetime.now()):
        return jsonify({
            'valid': True,
            'license_type': license.license_type,
            'agent_usage_count': license.agent_usage_count,
            'ghost_text_usage_seconds': license.ghost_text_usage_seconds
        }), 200
    return jsonify({'valid': False, 'message': 'Invalid or expired license'}), 403

@license_bp.route('/record_usage', methods=['POST'])
def record_usage():
    data = request.get_json()
    key = data.get('key')
    user_email = data.get('user_email')
    agent_increment = data.get('agent_increment', 0)
    ghost_text_increment_seconds = data.get('ghost_text_increment_seconds', 0)

    license = License.query.filter_by(key=key, user_email=user_email, is_active=True).first()

    if license:
        license.agent_usage_count += agent_increment
        license.ghost_text_usage_seconds += ghost_text_increment_seconds
        db.session.commit()
        return jsonify({'success': True, 'message': 'Usage recorded'}), 200
    return jsonify({'success': False, 'message': 'License not found'}), 404

@license_bp.route('/generate', methods=['POST'])
def generate_license():
    data = request.get_json()
    user_email = data.get('user_email')
    license_type = data.get('license_type', 'Agent')
    duration_days = data.get('duration_days')

    expires_at = None
    if duration_days:
        expires_at = datetime.datetime.now() + datetime.timedelta(days=duration_days)

    new_license = License(user_email=user_email, license_type=license_type, expires_at=expires_at)
    db.session.add(new_license)
    db.session.commit()

    return jsonify({'key': new_license.key, 'user_email': new_license.user_email, 'license_type': new_license.license_type}), 201
```

### 課金モデル

-   **フリーミアム**: 基本的なDAW機能と、Agent機能の月間X回、Ghost Text機能の月間Y時間までの利用を無料で提供します。
-   **サブスクリプション（Proプラン）**: 月額または年額のサブスクリプションモデル。Agent機能の無制限利用、Ghost Text機能の無制限利用、将来的な追加AI機能へのアクセス、優先サポートなどを提供します。
-   **従量課金（オプション）**: 大規模なスタジオやプロフェッショナル向けに、LLMのトークン利用量に応じた従量課金モデルも検討します。これは、Proプランのオプションとして提供されるか、エンタープライズ契約の一部となる可能性があります。

この有料化アーキテクチャにより、「Composer Copilot」は幅広いユーザーに価値を提供しつつ、持続的な開発と成長を可能にする強固なビジネス基盤を構築します。



## 結論

本技術仕様書では、Tracktion EngineのDemoRunnerを基盤としたAI統合DAW「Composer Copilot」の開発における、主要なAI機能（Agent機能、Ghost Text機能）および有料化アーキテクチャの詳細な技術仕様を定義しました。DemoRunnerの堅牢な既存機能を活用し、その上にモジュラー形式でAI統合レイヤーを構築するというアプローチは、開発効率とシステムの安定性を両立させるための最適な戦略です。

「Agent機能」は、大規模言語モデル (LLM) との連携を通じて、ユーザーの自然言語プロンプトから音楽的なMIDIパターンを自動生成し、創造的なプロセスを加速します。一方、「Ghost Text機能」は、ローカルで動作するPython AIサーバーとのリアルタイム連携により、ユーザーのMIDI入力に対してインラインで予測的な提案を行い、直感的な作曲アシストを提供します。これらの機能は、音楽制作の新たな可能性を切り開き、ユーザー体験を革新します。

また、フリーミアムモデルとサブスクリプションモデルを組み合わせた有料化アーキテクチャは、持続可能なビジネス成長を支えるための重要な要素です。ライセンス管理システムは、AI機能の公正な利用を保証し、将来的な機能拡張や収益化戦略に柔軟に対応できる基盤を提供します。

本仕様書に記載されたアーキテクチャと実装アプローチに基づき、開発チームは効率的かつ高品質なAI統合DAWの開発を進めることができます。これにより、「Composer Copilot」は、日本の次のユニコーン企業となるための強力な一歩を踏み出すでしょう。



## 参考文献

[1] Tracktion Engine GitHub Repository. [https://github.com/Tracktion/tracktion_engine](https://github.com/Tracktion/tracktion_engine)

[2] JUCE Framework Documentation. [https://docs.juce.com/](https://docs.juce.com/)

[3] Flask Documentation. [https://flask.palletsprojects.com/](https://flask.palletsprojects.com/)

[4] SQLAlchemy Documentation. [https://docs.sqlalchemy.org/](https://docs.sqlalchemy.org/)

[5] PyTorch Documentation. [https://pytorch.org/docs/](https://pytorch.org/docs/)

[6] Hugging Face Transformers Library. [https://huggingface.co/docs/transformers/](https://huggingface.co/docs/transformers/)

[7] Music21 Documentation. [https://web.mit.edu/music21/doc/](https://web.mit.edu/music21/doc/)





### システム全体構成図

![システム全体構成図](https://private-us-east-1.manuscdn.com/sessionFile/0gYXe0rAvTatSZ5LyKQRYF/sandbox/cY0beGwEvmH53wrrwg4CkN-images_1750328108421_na1fn_L2hvbWUvdWJ1bnR1L3N5c3RlbV9hcmNoaXRlY3R1cmU.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvMGdZWGUwckF2VGF0U1o1THlLUVJZRi9zYW5kYm94L2NZMGJlR3dFdm1INTN3cnJ3ZzRDa04taW1hZ2VzXzE3NTAzMjgxMDg0MjFfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwzTjVjM1JsYlY5aGNtTm9hWFJsWTNSMWNtVS5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3NjcyMjU2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=Izy8e7-b4ui0PQH2i~xOg9ZZSpVD-4PH8Pf5Wzp39MGlQEafgTYbGXVx6n0y3Sydv9SKWI3DxRDTkP2EqC6JpaEDARbrN4HsOlqgJmTYcJWnjL~QGbkRDYfcDJsUUEhPtFlEzD0wCH-06UsHJR1DTuvqvCkmGxkEigoCMgkAFXRRG~oow15rqc4iXgc52TKY~iZmqzvao0Dsc-UL4NrHD-h30A63JdX~57jtnDRv86vwNbJ~4io5mhilOvlZ11Hhj6nAhM4CO5EN0dDtMnc-wcizuL-71sQszwNCrcx3e-2bdgXIMTFX0dIDmmDx-8iS9NGSMYIJLRDZALzmaFbigA__)

### Agent機能データフロー図

![Agent機能データフロー図](https://private-us-east-1.manuscdn.com/sessionFile/0gYXe0rAvTatSZ5LyKQRYF/sandbox/cY0beGwEvmH53wrrwg4CkN-images_1750328108422_na1fn_L2hvbWUvdWJ1bnR1L2FnZW50X2RhdGFfZmxvdw.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvMGdZWGUwckF2VGF0U1o1THlLUVJZRi9zYW5kYm94L2NZMGJlR3dFdm1INTN3cnJ3ZzRDa04taW1hZ2VzXzE3NTAzMjgxMDg0MjJfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwyRm5aVzUwWDJSaGRHRmZabXh2ZHcucG5nIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzY3MjI1NjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=hZhe6TY1IcdIh7X3ooQKDPKaPtXtWa3x~QArWRav5ACAO31Ewtc6FS0tq~MKWdo9vMHupfbbX8wKwBusFwJVEV~dzk5dD9359I~iCaPYJz6sZNtx~seSyUswAMjpSsvMu68nppMcd4zni6eePsayFXoSRyLVVWzMj61Dljz~Ir~pL2GHsrqJOaiUmVT7N3p6MEvM3~AYMHDJwyqRnBZmhabiOTVOkJrDo5iTcI3AI5Ni0v2cJfIC7XCjQAiEbq4T3B80LHQ5LsGu0lb~PltVqYbo-FAFXo8pQY8wStZBhbRUSIXoHTUgoplkgU~kT65VGNjji-xHGrA3h5WfHwUN2Q__)

### Ghost Text機能アーキテクチャ図

![Ghost Text機能アーキテクチャ図](https://private-us-east-1.manuscdn.com/sessionFile/0gYXe0rAvTatSZ5LyKQRYF/sandbox/cY0beGwEvmH53wrrwg4CkN-images_1750328108422_na1fn_L2hvbWUvdWJ1bnR1L2dob3N0X3RleHRfYXJjaGl0ZWN0dXJl.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvMGdZWGUwckF2VGF0U1o1THlLUVJZRi9zYW5kYm94L2NZMGJlR3dFdm1INTN3cnJ3ZzRDa04taW1hZ2VzXzE3NTAzMjgxMDg0MjJfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwyZG9iM04wWDNSbGVIUmZZWEpqYUdsMFpXTjBkWEpsLnBuZyIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc2NzIyNTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=C7ytUhu0VZQoZFRksNOnL1bvTXggwzB1j0w5Tu68z9PUdL6fpir-RKyQvTU2BVtBxADoiI1rDD7qx7WsfRq3Wm0rqqWnpLmQ9jkNY3VCcotdlIl0LFuH0jlpBtpFXy2mzVp5JPYBqxvt5Bdhk05VkgAq6vD31zF3T8MFjTgp79Gfb-dSWkfuBx-Rrt-qdumJqE6tbFs-8VTBTO5xS8AIPNBYNC~Xw1r0Y0vqR7ko9oUiPRuc6aWhKFk4~c53vRd44XJiI43zfpzpiLYE5TIvjiJc1C4nAJ30Cph9jC4LGPmQpNmCdeuSvBaivbcTzO~9gU9i-cM2g0zhJL4P2h0CbQ__)


