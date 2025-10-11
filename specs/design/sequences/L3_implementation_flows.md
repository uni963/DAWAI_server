# L3 実装詳細フローシーケンス - DAWAI

**階層レベル**: L3 (実装詳細)
**対象読者**: 実装担当者、新規開発者、デバッガー
**目的**: DAWAI主要実装の内部処理フローと技術詳細を理解する
**関連文書**: 具体的実装ファイル、API仕様、パフォーマンス要件

## 🔧 Core Implementation Flows

### IF-001: unifiedAudioSystem.js 内部フロー

```mermaid
sequenceDiagram
    participant App as App.jsx
    participant Unified as unifiedAudioSystem
    participant Tone as Tone.js Core
    participant Context as AudioContext
    participant Buffer as AudioBuffer

    Note over App, Buffer: 統合音声システム内部実装 (230行)

    App->>Unified: initializeAudio()
    Unified->>Tone: Tone.start()
    Tone->>Context: AudioContext 作成・起動
    Context->>Unified: context.state = "running"

    App->>Unified: createSynthesizer(type)
    Unified->>Tone: new Tone.Synth(options)
    Tone->>Context: OscillatorNode 作成
    Context->>Buffer: バッファ割り当て
    Buffer->>Unified: シンセ インスタンス返却

    App->>Unified: playNote(note, duration)
    Unified->>Tone: synth.triggerAttackRelease()
    Tone->>Context: AudioNode グラフ処理

    Context->>Context: DSP チェーン実行
    Context->>Buffer: 音声バッファ書き込み
    Buffer->>App: 音声出力 (~30ms遅延)

    Note over App, Buffer: ハードウェア最適化音声処理
```

### IF-002: EnhancedMidiEditor.jsx Canvas実装

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Editor as EnhancedMidiEditor
    participant Canvas as Canvas 2D API
    participant Events as Event Handlers
    participant State as Component State

    Note over User, State: MIDI エディタ Canvas 実装 (1100+行)

    User->>Editor: コンポーネント マウント
    Editor->>Canvas: canvas.getContext('2d')
    Canvas->>Editor: CanvasRenderingContext2D
    Editor->>Events: addEventListener('mousedown', ...)

    User->>Events: マウス クリック (x, y)
    Events->>Editor: calculateNoteFromPosition(x, y)
    Editor->>State: setState({ notes: [...notes, newNote] })
    State->>Canvas: drawPianoRoll()

    Canvas->>Canvas: clearRect() + fillRect()
    Canvas->>Canvas: drawGrid() + drawNotes()
    Canvas->>User: 視覚的フィードバック

    User->>Events: マウス ドラッグ
    Events->>Editor: handleNoteDrag(startX, endX)
    Editor->>State: updateNoteLength()
    State->>Canvas: requestAnimationFrame(redraw)
    Canvas->>User: リアルタイム描画更新

    Note over User, State: 60FPS Canvas 高性能描画
```

### IF-003: FastAPI Backend AI統合実装

```mermaid
sequenceDiagram
    participant Client as React Client
    participant FastAPI as main.py
    participant Router as API Router
    participant Claude as Claude Client
    participant OpenAI as OpenAI Client

    Note over Client, OpenAI: AI統合バックエンド実装詳細

    Client->>FastAPI: POST /chat HTTP/1.1
    FastAPI->>Router: route_handler(@app.post)
    Router->>Router: validate_request_body()

    Router->>Router: determine_ai_provider(model)

    alt Claude選択時
        Router->>Claude: anthropic.Anthropic(api_key)
        Claude->>Claude: client.messages.create()
        Claude->>Router: response.content[0].text
    else OpenAI選択時
        Router->>OpenAI: openai.OpenAI(api_key)
        OpenAI->>OpenAI: client.chat.completions.create()
        OpenAI->>Router: completion.choices[0].message
    end

    Router->>FastAPI: JSONResponse(response_data)
    FastAPI->>Client: HTTP 200 + JSON payload

    Note over Client, OpenAI: マルチAI プロバイダー抽象化
```

### IF-004: DiffSinger AI歌声合成パイプライン

```mermaid
sequenceDiagram
    participant Client as React Frontend
    participant API as FastAPI /synthesize
    participant Preprocess as Text Preprocessor
    participant Model as DiffSinger Model
    participant Postprocess as Audio Postprocessor

    Note over Client, Postprocess: DiffSinger 歌声合成内部実装

    Client->>API: POST /api/synthesize
    API->>Preprocess: normalize_lyrics(text)
    Preprocess->>Preprocess: phoneme_conversion()
    Preprocess->>Model: phoneme_sequence + midi_data

    Model->>Model: diffusion_process()
    Model->>Model: vocoder_synthesis()
    Model->>Postprocess: raw_audio_tensor

    Postprocess->>Postprocess: apply_effects()
    Postprocess->>Postprocess: normalize_audio()
    Postprocess->>API: final_wav_bytes

    API->>Client: multipart/form-data WAV
    Client->>Client: Audio.decodeAudioData()
    Client->>Client: 歌声トラック統合

    Note over Client, Postprocess: ニューラル歌声合成品質
```

## 📊 State Management Implementation

### IF-005: useMidiPersistence Hook実装

```mermaid
sequenceDiagram
    participant Component as React Component
    participant Hook as useMidiPersistence
    participant LocalStorage as window.localStorage
    participant Debounce as useDebounce
    participant Effect as useEffect

    Note over Component, Effect: MIDI永続化 React Hook 実装

    Component->>Hook: const { save, load } = useMidiPersistence()
    Hook->>LocalStorage: localStorage.getItem('dawai_project')
    LocalStorage->>Hook: existing_project_data || null

    Component->>Hook: updateMidiData(newNotes)
    Hook->>Debounce: debounced_save(newNotes, 500ms)
    Debounce->>LocalStorage: localStorage.setItem()
    LocalStorage->>Hook: save_confirmation

    Hook->>Effect: useEffect([midiData], ...)
    Effect->>Hook: auto_save_interval = 30s
    Hook->>LocalStorage: incremental_backup()

    Component->>Hook: exportProject()
    Hook->>Hook: JSON.stringify(complete_project)
    Hook->>Component: downloadable_blob

    Note over Component, Effect: データ損失ゼロ設計
```

### IF-006: AI Provider Switching実装

```mermaid
sequenceDiagram
    participant UI as ModelSelector.jsx
    participant Context as AIContext
    parameter State as useReducer
    participant API as Axios Instance
    participant Backend as FastAPI Router

    Note over UI, Backend: AI プロバイダー動的切り替え実装

    UI->>Context: const { switchModel } = useAI()
    Context->>State: dispatch({ type: 'SWITCH_MODEL' })
    State->>State: aiReducer(state, action)

    State->>API: axios.post('/api/switch-model')
    API->>Backend: model_switch_request
    Backend->>Backend: update_active_provider()
    Backend->>API: switch_confirmation

    API->>State: response.data.success
    State->>Context: provider_switched_successfully
    Context->>UI: UI状態更新・表示切り替え

    UI->>Context: sendMessage(text)
    Context->>API: axios.post('/api/chat', { model: active })
    API->>Backend: routed_to_correct_provider
    Backend->>UI: ai_response_from_active_model

    Note over UI, Backend: 0.5秒以下プロバイダー切り替え
```

## ⚡ Performance Critical Implementations

### IF-007: Audio Engine Real-time Processing

```mermaid
sequenceDiagram
    participant Browser as Web Browser
    participant Worker as Audio Worklet
    participant Buffer as Ring Buffer
    participant DSP as DSP Pipeline
    participant Output as Audio Output

    Note over Browser, Output: リアルタイム音声処理最適化

    Browser->>Worker: new AudioWorkletNode()
    Worker->>Buffer: allocate_ring_buffer(4096)
    Buffer->>DSP: initialize_processing_chain()

    Browser->>Worker: process(inputs, outputs)
    Worker->>Buffer: read_input_samples()
    Buffer->>DSP: apply_effects_chain()
    DSP->>Buffer: write_processed_samples()
    Buffer->>Output: commit_output_buffer()

    Output->>Browser: hardware_audio_callback()
    Browser->>Worker: next_process_cycle()

    loop 44.1kHz/128 samples
        Worker->>DSP: process_audio_block()
        DSP->>Output: 2.9ms processing_deadline
    end

    Note over Browser, Output: ハードウェア最適化 低遅延処理
```

### IF-008: Canvas High-Performance Rendering

```mermaid
sequenceDiagram
    participant React as React Component
    participant RAF as requestAnimationFrame
    participant Canvas as OffscreenCanvas
    participant Worker as Canvas Worker
    participant GPU as WebGL Context

    Note over React, GPU: 高性能 Canvas 描画最適化

    React->>RAF: requestAnimationFrame(renderLoop)
    RAF->>Canvas: transferControlToOffscreen()
    Canvas->>Worker: postMessage(render_data)

    Worker->>GPU: gl.useProgram(shader)
    GPU->>GPU: vertex_buffer_upload()
    GPU->>GPU: fragment_shader_execution()
    GPU->>Worker: render_complete

    Worker->>Canvas: ImageBitmap transfer
    Canvas->>React: 60FPS smooth_rendering

    React->>RAF: next_animation_frame()
    RAF->>React: continuous_render_loop()

    Note over React, GPU: GPU加速 60FPS描画維持
```

## 🔒 Security Implementation Details

### IF-009: API Key Management Implementation

```mermaid
sequenceDiagram
    participant Client as Frontend
    participant Env as Environment Variables
    participant Validation as Input Validator
    participant Encryption as API Key Handler
    participant Provider as AI Provider

    Note over Client, Provider: セキュアAPI キー管理実装

    Client->>Validation: validate_request()
    Validation->>Validation: sanitize_input()
    Validation->>Encryption: safe_api_call()

    Encryption->>Env: os.getenv('CLAUDE_API_KEY')
    Env->>Encryption: encrypted_key_value
    Encryption->>Provider: headers={'Authorization': f'Bearer {key}'}

    Provider->>Encryption: api_response
    Encryption->>Validation: filter_sensitive_data()
    Validation->>Client: safe_response_data

    Note over Client, Provider: エンドツーエンド セキュリティ
```

### IF-010: CORS & Security Headers実装

```mermaid
sequenceDiagram
    participant Browser as Web Browser
    participant Middleware as CORS Middleware
    participant Security as Security Headers
    participant API as FastAPI Router
    participant Response as HTTP Response

    Note over Browser, Response: セキュリティヘッダー実装 (要改善)

    Browser->>Middleware: OPTIONS preflight_request
    Middleware->>Middleware: validate_origin() # 現在 allow_origins=["*"]
    Middleware->>Security: add_security_headers()

    Security->>Security: X-Content-Type-Options: nosniff
    Security->>Security: X-Frame-Options: DENY
    Security->>API: secure_request_forwarding()

    API->>Response: process_api_request()
    Response->>Security: apply_response_headers()
    Security->>Browser: secure_http_response()

    Note over Browser, Response: ⚠️ CORS設定要セキュリティ強化
```

---

**実装最適化**: この階層の詳細は実際のコード実装と密接に関連します。パフォーマンス問題発生時はこのレベルでの分析が必要です。

**関連実装ファイル**:
- `frontend/src/utils/unifiedAudioSystem.js` - 音声エンジン詳細実装
- `frontend/src/components/EnhancedMidiEditor.jsx` - MIDI編集実装
- `backend/ai_agent/main.py` - AI統合バックエンド実装
- `frontend/src/hooks/useMidiPersistence.js` - データ永続化実装