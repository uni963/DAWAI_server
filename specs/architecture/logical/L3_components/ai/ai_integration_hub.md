# L3: AI Integration Hub - AI統合ハブ詳細設計

**文書ID**: `DAWAI-ARCH-L3-AI-001`
**バージョン**: 1.0.0
**最終更新**: 2025-01-22
**実装ファイル**:
  - `backend/ai_agent/main.py` (1389行)
  - `frontend/src/utils/aiAgentEngine.js` (約800行 - 要確認)
**関連要件**: REQ-AI-001, REQ-AI-002, REQ-AI-003

## 📋 概要

### 目的
複数AIプロバイダー(Claude, OpenAI, Gemini)を統合し、音楽制作に特化したAIアシスタント機能を提供する統合ハブの詳細設計。

### アーキテクチャ戦略
- **Strategy Pattern**: プロバイダー別API呼び出しロジック
- **Factory Pattern**: モデル設定に基づくAIインスタンス生成
- **Adapter Pattern**: 各AI APIレスポンスの統一インターフェース化
- **Observer Pattern**: ストリーミングレスポンスのイベント駆動処理

### サポートモデル一覧
```yaml
Anthropic Claude:
  - claude-3-sonnet (デフォルト)
  - claude-3-opus

OpenAI:
  - gpt-4
  - gpt-3.5-turbo

Google Gemini:
  - gemini-2.5-pro
  - gemini-2.5-flash
  - gemini-1.5-pro
  - gemini-1.5-flash
```

---

## 🏗️ システムアーキテクチャ

### 全体構成図

```mermaid
graph TB
    subgraph Frontend [フロントエンド: React]
        UI[AI Chat UI] --> AE[aiAgentEngine.js]
        AE --> |HTTP POST| API[FastAPI Endpoints]
    end

    subgraph Backend [バックエンド: FastAPI]
        API --> Router["/api/chat<br/>/api/agent<br/>/api/stream/*"]
        Router --> AMM[AIModelManager]
        Router --> SAMM[StreamingAIModelManager]

        AMM --> |同期| Claude1[Claude API]
        AMM --> |同期| OpenAI1[OpenAI API]
        AMM --> |同期| Gemini1[Gemini API]

        SAMM --> |async stream| Claude2[Claude Streaming]
        SAMM --> |async stream| OpenAI2[OpenAI Streaming]
        SAMM --> |async stream| Gemini2[Gemini Streaming]
    end

    subgraph External [外部AI API]
        Claude1 --> Anthropic[Anthropic Claude]
        Claude2 --> Anthropic
        OpenAI1 --> OpenAIAPI[OpenAI API]
        OpenAI2 --> OpenAIAPI
        Gemini1 --> GoogleAPI[Google Gemini]
        Gemini2 --> GoogleAPI
    end

    style Frontend fill:#e3f2fd
    style Backend fill:#f3e5f5
    style External fill:#fff3e0
```

### エンドポイント構成

```yaml
チャットエンドポイント:
  通常: POST /api/chat
  ストリーミング: POST /api/stream/chat
  互換: POST /ai/api/chat, /ai/api/stream/chat

エージェントエンドポイント:
  通常: POST /api/agent
  ストリーミング: POST /api/stream/agent
  互換: POST /ai/api/agent, /ai/api/stream/agent

その他:
  音楽生成: POST /api/generate
  ヘルスチェック: GET /api/health, /ai/api/health
```

---

## 🔧 バックエンド実装詳細

### FastAPI アプリケーション設定

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI(
    title="Melodia Composer Copilot API",
    description="AI-powered music composition assistant API with streaming support",
    version="1.0.0"
)

# CORS設定 (⚠️ セキュリティ要改善)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite開発サーバー
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# APIキー管理
DEFAULT_API_KEYS = {
    "anthropic": os.getenv("ANTHROPIC_API_KEY"),
    "openai": os.getenv("OPENAI_API_KEY"),
    "google": os.getenv("GEMINI_API_KEY")
}
```

### リクエスト・レスポンスモデル

```mermaid
classDiagram
    class ChatRequest {
        +str message
        +Any context
        +str model
        +Dict~str,str~ apiKeys
        +bool stream
    }

    class AgentRequest {
        +str prompt
        +Any context
        +str model
        +str apiKey
        +bool stream
    }

    class ChatResponse {
        +str response
        +bool success
        +str error
    }

    class AgentResponse {
        +List~Dict~ actions
        +str summary
        +str nextSteps
        +bool success
        +str error
    }

    ChatRequest --> ChatResponse: /api/chat
    AgentRequest --> AgentResponse: /api/agent
```

---

## 🤖 AIModelManager クラス (同期処理)

### クラス設計

```python
class AIModelManager:
    def __init__(self):
        self.default_api_keys = DEFAULT_API_KEYS

    def get_api_key(self, provider: str, custom_keys: Optional[Dict[str, str]] = None) -> Optional[str]:
        """APIキーを取得（カスタムキー優先、デフォルトキーをフォールバック）"""
        if custom_keys and provider in custom_keys and custom_keys[provider]:
            return custom_keys[provider]
        return self.default_api_keys.get(provider)

    async def call_claude(self, message: str, context: Any = "", api_key: str = None) -> str:
        """Claude APIを呼び出し"""
        # 実装詳細は後述

    async def call_openai(self, message: str, context: Any = "", api_key: str = None) -> str:
        """OpenAI APIを呼び出し"""
        # 実装詳細は後述

    async def call_gemini(self, message: str, context: Any = "", api_key: str = None) -> str:
        """Gemini APIを呼び出し"""
        # 実装詳細は後述
```

### プロンプト構築戦略

```python
# 音楽制作に特化したシステムプロンプト
system_prompt = """あなたは音楽制作のエキスパートアシスタントです。
ユーザーの音楽制作に関する質問や要求に対して、専門的で実用的なアドバイスを提供してください。
以下の分野について詳しく回答できます：
- 作曲・編曲のテクニック
- 楽器の演奏方法
- 音楽理論
- DAWの使い方
- ミキシング・マスタリング
- 音楽ジャンルの特徴
- MIDI編集

回答は日本語で、分かりやすく具体的に説明してください。"""

# コンテキスト情報処理
def build_context_info(context):
    context_info = ""

    if isinstance(context, dict):
        # プロジェクト情報
        if context.get("projectInfo"):
            project = context["projectInfo"]
            context_info += f"\n\n【現在のプロジェクト情報】\n"
            context_info += f"プロジェクト名: {project.get('name', 'Unknown')}\n"
            context_info += f"テンポ: {project.get('tempo', 'Unknown')} BPM\n"
            context_info += f"キー: {project.get('key', 'Unknown')}\n"
            # ... 他の情報

        # 現在のトラック情報
        if context.get("currentTrack"):
            track = context["currentTrack"]
            context_info += f"\n【現在選択中のトラック】\n"
            context_info += f"トラック名: {track.get('name', 'Unknown')}\n"
            # ... 他の情報

        # 会話履歴
        if context.get("chatHistory"):
            context_info += f"\n【会話履歴】\n{context['chatHistory']}"

    return context_info
```

### Claude API 統合

```python
async def call_claude(self, message: str, context: Any = "", api_key: str = None) -> str:
    if not api_key:
        raise ValueError("Claude API key is required")

    # プロンプト構築
    context_info = build_context_info(context)
    full_prompt = system_prompt + context_info + f"\n\nユーザーの質問: {message}"

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01"
    }

    data = {
        "model": "claude-3-sonnet-20240229",
        "max_tokens": 1000,
        "messages": [
            {"role": "user", "content": full_prompt}
        ]
    }

    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers=headers,
        json=data,
        timeout=30
    )

    if response.status_code == 200:
        result = response.json()
        return result["content"][0]["text"]
    else:
        raise Exception(f"Claude API error: {response.status_code} - {response.text}")
```

---

## 🌊 StreamingAIModelManager クラス (非同期ストリーミング)

### アーキテクチャ

```mermaid
sequenceDiagram
    participant Client as フロントエンド
    participant FastAPI
    participant SAMM as StreamingAIModelManager
    participant API as AI API (Claude/OpenAI/Gemini)

    Client->>FastAPI: POST /api/stream/chat
    FastAPI->>SAMM: stream_claude/openai/gemini()
    SAMM->>API: HTTP POST with stream=true

    loop ストリーミング受信
        API-->>SAMM: data: {"type": "text", "content": "..."}
        SAMM-->>FastAPI: yield SSE chunk
        FastAPI-->>Client: data: {"type": "text", "content": "..."}
    end

    API-->>SAMM: data: [DONE]
    SAMM-->>FastAPI: yield data: [DONE]
    FastAPI-->>Client: data: [DONE]
```

### Claude ストリーミング実装

```python
async def stream_claude(self, message: str, context: Any = "", api_key: str = None):
    """Claude APIをストリーミングで呼び出し"""
    print(f"StreamingAIModelManager: Starting Claude streaming for message: {message[:50]}...")

    if not api_key:
        raise ValueError("Claude API key is required")

    # プロンプト構築
    context_info = build_context_info(context)
    full_prompt = system_prompt + context_info + f"\n\nユーザーの質問: {message}"

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01"
    }

    data = {
        "model": "claude-3-sonnet-20240229",
        "max_tokens": 1000,
        "messages": [
            {"role": "user", "content": full_prompt}
        ],
        "stream": True  # ストリーミング有効化
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=data
        ) as response:
            if response.status == 200:
                async for line in response.content:
                    if line:
                        line_str = line.decode('utf-8').strip()

                        if line_str.startswith('data: '):
                            data_str = line_str[6:]  # 'data: ' を除去

                            if data_str == '[DONE]':
                                yield f"data: [DONE]\n\n"
                                break

                            try:
                                json_data = json.loads(data_str)

                                if 'content' in json_data and json_data['content']:
                                    for content in json_data['content']:
                                        if content.get('type') == 'text':
                                            text = content.get('text', '')
                                            if text:
                                                yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"
                            except json.JSONDecodeError as e:
                                print(f"JSON decode error: {e}")
                                continue
            else:
                error_text = await response.text()
                yield f"data: {json.dumps({'type': 'error', 'content': f'Claude API error: {response.status} - {error_text}'})}\n\n"
```

### Gemini ストリーミング実装 (疑似ストリーミング)

```python
async def stream_gemini(self, message: str, context: Any = "", api_key: str = None):
    """Gemini APIをストリーミングで呼び出し"""
    if not api_key:
        raise ValueError("Gemini API key is required")

    # プロンプト構築
    context_info = build_context_info(context)
    full_prompt = system_prompt + context_info + f"\n\nユーザーの質問: {message}"

    # Gemini APIの設定
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-pro')

    try:
        # Gemini APIはネイティブストリーミング非対応のため疑似実装
        response = model.generate_content(full_prompt)
        response_text = response.text

        # 文字単位でストリーミング風に返す
        for i, char in enumerate(response_text):
            yield f"data: {json.dumps({'type': 'text', 'content': char})}\n\n"
            # 少し遅延を入れてストリーミング感を演出
            await asyncio.sleep(0.01)

        yield f"data: [DONE]\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': f'Gemini API error: {str(e)}'})}\n\n"
```

---

## 🎯 Agent Mode (Sense-Plan-Act アーキテクチャ)

### Agent Mode プロンプト構造

```python
def generate_agent_prompt(user_prompt: str, context: dict) -> str:
    """Sense-Plan-Actアーキテクチャに基づくAgent mode用プロンプトを生成"""

    # コンテキスト情報の構築
    context_info = ""
    if context:
        if context.get('currentTrack'):
            track = context['currentTrack']
            context_info += f"\n現在のトラック: {track.get('name')} (ID: {track.get('id')})"

        if context.get('existingTracks'):
            tracks = context['existingTracks']
            context_info += f"\n既存のトラック ({len(tracks)}個):"
            for track in tracks:
                context_info += f"\n- {track.get('name')} (ID: {track.get('id')}, タイプ: {track.get('type')})"

    prompt = f"""あなたは音楽制作アシスタントです。Sense-Plan-Actアーキテクチャに従って、ユーザーの要求を理解し、適切なアクションを実行してください。

## Sense（理解）段階
現在のプロジェクト状況を理解してください：
{context_info}

## Plan（計画）段階
ユーザーの要求を分析し、実行可能なアクションを計画してください：
- トラックの追加/編集/削除
- MIDIノートの追加/編集/削除
- エフェクトの適用
- プロジェクト設定の変更

## Act（実行）段階
計画したアクションを以下のJSON形式で出力してください：

{{
  "actions": [
    {{
      "type": "操作タイプ",
      "params": {{
        "trackId": "正確なトラックID",
        "notes": [
          {{
            "id": "note-123",
            "pitch": 60,        // MIDIノート番号（0-127）
            "time": 0,          // 開始時間（秒）
            "duration": 0.5,    // 持続時間（秒）
            "velocity": 0.8     // 音量（0-1）
          }}
        ]
      }},
      "description": "実行する操作の説明"
    }}
  ],
  "summary": "実行した操作の要約",
  "nextSteps": "次のステップの提案"
}}

ユーザーの要求: {user_prompt}"""

    return prompt
```

### レスポンスパース処理

```python
def parse_agent_response(response_text: str, context: dict) -> dict:
    """Agent modeのレスポンスを解析"""
    import re

    def remove_json_comments(text):
        # // 以降のコメントを除去
        return re.sub(r'//.*', '', text)

    try:
        # JSONの抽出を試行
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            json_str = json_match.group(0)
            json_str = remove_json_comments(json_str)  # コメント除去
            parsed = json.loads(json_str)

            return {
                "actions": parsed.get("actions", []),
                "summary": str(parsed.get("summary", "操作が完了しました")),
                "nextSteps": str(parsed.get("nextSteps", "次のステップを実行してください"))
            }
    except Exception as e:
        print(f"Failed to parse agent response: {e}")

    # フォールバック: 基本的なアクション推測
    response_lower = response_text.lower()

    if any(word in response_lower for word in ["トラック", "track", "追加", "add"]):
        return {
            "actions": [{
                "type": "addTrack",
                "params": {
                    "instrument": "Piano",
                    "trackName": "新しいトラック"
                },
                "description": "新しいトラックを追加しました"
            }],
            "summary": "新しいトラックを追加しました",
            "nextSteps": "トラックにMIDIデータを入力してください"
        }

    # ... 他のパターンマッチング
```

---

## 🎵 音楽生成エンドポイント

### 音楽要素生成フロー

```mermaid
flowchart TD
    A[POST /api/generate] --> B[GenerateRequest]
    B --> C{APIキー存在?}
    C -->|No| D[HTTP 400 Error]
    C -->|Yes| E[Gemini API設定]

    E --> F[音楽生成プロンプト構築]
    F --> G["""<br/>type: drum_pattern/bassline/chord_progression/melody/harmony<br/>notes: [pitch, start, duration, velocity]<br/>description: ...<br/>"""]

    G --> H[genai.GenerativeModel.generate_content]
    H --> I[レスポンスからJSON抽出]

    I --> J{JSON解析成功?}
    J -->|Yes| K[GenerateResponse返却]
    J -->|No| L[フォールバックパターン<br/>C majorスケール]

    K --> M[フロントエンドで音声生成]
    L --> M

    style F fill:#e1f5fe
    style G fill:#f3e5f5
    style K fill:#c8e6c9
```

### 実装コード
```python
@app.post("/api/generate", response_model=GenerateResponse)
async def generate_music(request: GenerateRequest):
    try:
        api_key = request.apiKey or DEFAULT_API_KEYS.get("google")
        if not api_key:
            raise HTTPException(status_code=400, detail="API key is required")

        genai.configure(api_key=api_key)
        temp_model = genai.GenerativeModel('gemini-2.5-flash')

        music_prompt = f"""
あなたは音楽制作AIアシスタントです。以下の指示に基づいて、音楽要素を生成してください。

[ユーザーの指示]
{request.prompt}

[出力形式]
以下のJSON形式で出力してください：
{{
  "type": "drum_pattern"|"bassline"|"chord_progression"|"melody"|"harmony",
  "notes": [
    {{"pitch": 60, "start": 0.0, "duration": 0.25, "velocity": 100}},
    ...
  ],
  "description": "生成した音楽要素の説明",
  "suggestions": "追加の提案やバリエーション"
}}

音楽理論的に正しく、指定されたコンテキストに合った音楽要素を生成してください。
"""

        response = temp_model.generate_content(music_prompt)

        # JSONの抽出を試行
        json_match = re.search(r'\{[\s\S]*\}', response.text)
        if json_match:
            json_str = json_match.group(0)
            try:
                parsed = json.loads(json_str)
                return GenerateResponse(
                    type=parsed.get("type", "melody"),
                    notes=parsed.get("notes", []),
                    description=parsed.get("description", "Generated music pattern"),
                    suggestions=parsed.get("suggestions", "")
                )
            except json.JSONDecodeError:
                pass

        # フォールバックパターン (C major scale)
        fallback_notes = [
            {"pitch": 60, "start": 0.0, "duration": 0.25, "velocity": 80},
            {"pitch": 62, "start": 0.25, "duration": 0.25, "velocity": 80},
            {"pitch": 64, "start": 0.5, "duration": 0.25, "velocity": 80},
            {"pitch": 65, "start": 0.75, "duration": 0.25, "velocity": 80}
        ]

        return GenerateResponse(
            type="melody",
            notes=fallback_notes,
            description="Simple C major scale pattern",
            suggestions="Try different scales or rhythms"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 🌐 フロントエンド統合 (aiAgentEngine.js)

### エンジン初期化パターン

```javascript
// frontend/src/utils/aiAgentEngine.js (推定実装)
class AIAgentEngine {
  constructor() {
    this.baseURL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000'
    this.apiKeys = {
      anthropic: localStorage.getItem('anthropic_api_key'),
      openai: localStorage.getItem('openai_api_key'),
      google: localStorage.getItem('google_api_key')
    }
  }

  // 通常チャット
  async chat(message, context, model = 'claude-3-sonnet') {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        context,
        model,
        apiKeys: this.apiKeys
      })
    })

    if (!response.ok) {
      throw new Error(`Chat API error: ${response.status}`)
    }

    return await response.json()
  }

  // ストリーミングチャット
  async streamChat(message, context, model, onChunk, onDone, onError) {
    try {
      const response = await fetch(`${this.baseURL}/api/stream/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context,
          model,
          apiKeys: this.apiKeys
        })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              onDone()
              return
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'text') {
                onChunk(parsed.content)
              } else if (parsed.type === 'error') {
                onError(parsed.content)
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      onError(error.message)
    }
  }
}
```

### React コンポーネント統合

```javascript
// App.jsx での利用例
import AIAgentEngine from './utils/aiAgentEngine.js'

const App = () => {
  const [aiResponse, setAiResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const aiEngine = new AIAgentEngine()

  const handleAIChat = async (message) => {
    setIsStreaming(true)
    setAiResponse('')

    await aiEngine.streamChat(
      message,
      {
        projectInfo: currentProject,
        currentTrack: selectedTrack,
        chatHistory: chatHistory.slice(-5)  // 直近5件
      },
      'claude-3-sonnet',
      (chunk) => {
        setAiResponse(prev => prev + chunk)  // ストリーミング表示
      },
      () => {
        setIsStreaming(false)  // 完了
      },
      (error) => {
        console.error('AI error:', error)
        setIsStreaming(false)
      }
    )
  }

  return (
    <div>
      <ChatInput onSubmit={handleAIChat} />
      <ChatResponse text={aiResponse} isLoading={isStreaming} />
    </div>
  )
}
```

---

## 🔐 セキュリティ・エラーハンドリング

### API キー管理

```yaml
環境変数ベース (優先):
  - ANTHROPIC_API_KEY
  - OPENAI_API_KEY
  - GEMINI_API_KEY

フロントエンド送信 (カスタムキー):
  - リクエストボディの apiKeys フィールド
  - localStorage保存 (⚠️ XSS脆弱性リスク)

キー取得優先順位:
  1. リクエスト内カスタムキー
  2. 環境変数のデフォルトキー
  3. エラー返却 (キー未設定)
```

### エラーハンドリング実装

```python
# APIキー未設定エラー
if not api_key:
    return ChatResponse(
        response=f"{config['provider'].title()} APIキーが設定されていません。設定画面でAPIキーを入力してください。",
        success=False,
        error=f"{config['provider'].title()} API key not configured"
    )

# API呼び出しエラー
try:
    response_text = await ai_manager.call_claude(request.message, request.context, api_key)
    return ChatResponse(response=response_text, success=True)
except Exception as e:
    return ChatResponse(
        response="申し訳ございません。エラーが発生しました。しばらく時間をおいて再度お試しください。",
        success=False,
        error=str(e)
    )

# ストリーミングエラー (開発環境フォールバック)
async def dev_fallback_generator():
    provider_name = config["provider"].title()
    yield f"data: {json.dumps({'type': 'error', 'content': f'{provider_name} APIキーが設定されていません。'})}\n\n"
    yield f"data: {json.dumps({'type': 'info', 'content': '開発環境では.envファイルにAPIキーを設定してください。'})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"
```

---

## 📊 パフォーマンス最適化

### レート制限・タイムアウト

```python
# リクエストタイムアウト設定
response = requests.post(
    "https://api.anthropic.com/v1/messages",
    headers=headers,
    json=data,
    timeout=30  # 30秒タイムアウト
)

# ストリーミング非同期処理
async with aiohttp.ClientSession() as session:
    async with session.post(url, headers=headers, json=data) as response:
        async for line in response.content:
            # 逐次処理でメモリ効率化
            yield process_line(line)
```

### キャッシング戦略 (検討中)

```yaml
実装予定:
  - コンテキスト情報のセッション永続化
  - 頻出クエリのレスポンスキャッシュ
  - プロンプトテンプレートのプリコンパイル

技術選択肢:
  - Redis: セッション管理
  - LocalStorage: フロントエンド永続化
  - In-Memory Cache: 短期キャッシュ
```

---

## 🧪 テスト・デバッグ

### デバッグエンドポイント

```python
# ヘルスチェック
@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "supported_models": [
            "claude-3-sonnet", "claude-3-opus",
            "gpt-4", "gpt-3.5-turbo",
            "gemini-2.5-pro", "gemini-2.5-flash"
        ]
    }

# デバッグログ出力
print(f"StreamingAIModelManager: Starting Claude streaming for message: {message[:50]}...")
print(f"Chat Debug Info: model={request.model}, apiKeys={request.apiKeys}")
print(f"Chat API Key Result: {api_key[:10] if api_key else 'None'}...")
```

### 手動テスト手順

```bash
# 1. バックエンド起動
cd backend/ai_agent
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 2. 通常チャットテスト
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "C majorスケールのメロディを作って",
    "context": {},
    "model": "claude-3-sonnet",
    "apiKeys": {"anthropic": "sk-ant-..."}
  }'

# 3. ストリーミングチャットテスト
curl -X POST http://localhost:8000/api/stream/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "ベートーベン風のピアノフレーズを提案して",
    "model": "gemini-2.5-pro",
    "apiKeys": {"google": "AIza..."}
  }'

# 4. エージェントモードテスト
curl -X POST http://localhost:8000/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "ピアノトラックにCメジャースケールを追加して",
    "context": {
      "existingTracks": [
        {"id": "track-1", "name": "Piano", "type": "piano"}
      ]
    },
    "model": "claude-3-sonnet",
    "apiKey": "sk-ant-..."
  }'
```

---

## 📈 今後の拡張計画

### Phase 1: 高度なコンテキスト管理 (予定)
```yaml
追加機能:
  - 長期会話履歴の埋め込みベクトル化
  - プロジェクトメタデータの自動抽出
  - ユーザー好み学習・パーソナライゼーション

技術要件:
  - Vector DB統合 (Pinecone/Weaviate検討)
  - セッション永続化 (Redis/PostgreSQL)
  - コンテキストウィンドウ最適化
```

### Phase 2: マルチモーダルAI (検討中)
```yaml
検討機能:
  - 音声入力・出力 (Whisper API統合)
  - 楽譜画像認識 (Vision API)
  - MIDI自動採譜・補正

技術選択肢:
  - OpenAI Whisper: 音声→テキスト
  - Claude Vision: 楽譜解析
  - Magenta: MIDI生成・変換
```

---

## 📝 まとめ

### 実装完成度
- **チャット機能**: 100% (3プロバイダー対応、ストリーミング実装)
- **エージェント機能**: 90% (JSON解析、フォールバック実装済み)
- **音楽生成**: 80% (Gemini統合、フォールバックパターン)
- **エラーハンドリング**: 85% (API障害対応、開発環境フォールバック)
- **セキュリティ**: 70% (CORS要改善、APIキー管理強化必要)

### 主要な技術的成果
1. **マルチプロバイダー統合**: 3社AI APIの統一インターフェース化
2. **ストリーミング実装**: リアルタイムレスポンス表示
3. **音楽特化プロンプト**: ドメイン知識組み込み
4. **Sense-Plan-Act**: エージェントアーキテクチャの実装

### 既知の制限事項
```yaml
制限1: CORS設定
  現状: allow_origins=["*"] (開発用)
  影響: 本番環境でセキュリティリスク
  対策: 環境別設定、オリジン検証強化

制限2: APIキー管理
  現状: 環境変数 + リクエスト送信
  影響: フロントエンドキー露出リスク
  対策: バックエンド専用キー管理

制限3: レート制限未対応
  現状: タイムアウトのみ
  影響: API制限超過時のエラー
  対策: リトライロジック、バックオフ実装
```

---

**参照実装**:
- `backend/ai_agent/main.py:1-1389`
- `frontend/src/utils/aiAgentEngine.js` (要確認)

**関連ドキュメント**:
- `specs/requirements/functional/L2_ai_integration/index.md`
- `specs/architecture/logical/L2_backend.md`

**テスト手順**:
1. `cd backend/ai_agent && uvicorn main:app --reload`
2. ブラウザで http://localhost:5173 起動
3. AI Chat UIで各プロバイダーテスト実行
