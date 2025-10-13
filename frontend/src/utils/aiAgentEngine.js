// AI Agent Engine - 改善版（メモリ管理・RAG統合版）
import MemoryManager from './memoryManager.js'
import RAGSystem from './ragSystem.js'

class AIAgentEngine {
  constructor() {
    this.isInitialized = false
    this.isGenerating = false
    this.currentModel = null
    this.availableModels = []
    this.apiKeys = {}
    this.globalSettings = null
    this.listeners = []
    this.projectCallbacks = null
    this.generationHistory = []
    this.pendingChanges = {
      tracks: new Map(),
      notes: new Map(),
      sessionId: null
    }
    this.lastCreatedTrackId = null  // 最後に作成されたトラックIDを保存

    // 承認セッションの状態
    this.approvalSessionActive = false
    this.approvalSessionId = null

    // 拒否処理中のフラグ
    this.isRejectingChanges = false

    // 自動承認設定（デフォルトはtrue - 即座に変更を適用）
    // ユーザーは承認/拒否UIを使わずに直接変更が反映される
    this.autoApprove = true
    
    // getPendingChangesのキャッシュ機能
    this.pendingChangesCache = null
    this.pendingChangesCacheTime = 0
    this.pendingChangesCacheTimeout = 100 // 100ms間キャッシュ

    // 新しいメモリ管理システムとRAGシステム
    this.memoryManager = new MemoryManager()
    this.ragSystem = new RAGSystem()
    
    // セッション管理
    this.currentSessionId = null
    this.sessionStartTime = null
    
    // メモリとRAGの統合設定
    this.useMemorySystem = true
    this.useRAGSystem = true
    this.maxMemoryTokens = 800
    this.maxRAGTokens = 1200
  }

  // 技術的な詳細をフィルタリングして、ユーザーフレンドリーなテキストのみを抽出
  filterTechnicalContent(responseText) {
    if (!responseText || typeof responseText !== 'string') {
      return ''
    }

    // JSON形式のコードブロックを除去（```json ... ```）
    let filtered = responseText.replace(/```json[\s\S]*?```/g, '')

    // 単独のJSON構造を除去（{ ... } や [ ... ]）
    filtered = filtered.replace(/\{[\s\S]*?"actions"[\s\S]*?\}/g, '')
    filtered = filtered.replace(/\{[\s\S]*?"type"[\s\S]*?"params"[\s\S]*?\}/g, '')

    // 技術的なパラメータリストを除去
    filtered = filtered.replace(/[\[{]\s*"(?:pitch|velocity|time|duration|id)"[\s\S]*?[\]}]/g, '')

    // 「技術的詳細」や「必要なパラメータ」などのセクションを除去
    filtered = filtered.replace(/### 技術的詳細[\s\S]*?(?=###|$)/g, '')
    filtered = filtered.replace(/\*\*技術的詳細\*\*[\s\S]*?(?=\n\n|$)/g, '')
    filtered = filtered.replace(/【技術的詳細】[\s\S]*?(?=\n\n|$)/g, '')
    filtered = filtered.replace(/- 使用する操作タイプ[\s\S]*?(?=\n\n|$)/g, '')
    filtered = filtered.replace(/- 必要なパラメータ[\s\S]*?(?=\n\n|$)/g, '')

    // MIDIノートの詳細リストを除去
    filtered = filtered.replace(/\{ "id": "note-[^}]*\}/g, '')
    filtered = filtered.replace(/pitch: \d+, velocity: [\d.]+, start: [\d.]+, duration: [\d.]+/g, '')

    // 空行の連続を整理
    filtered = filtered.replace(/\n{3,}/g, '\n\n')

    // 前後の空白を削除
    filtered = filtered.trim()

    return filtered
  }

  // Load global settings from localStorage
  loadGlobalSettings() {
    try {
      // App.jsxと同じキーを使用
      const savedSettings = localStorage.getItem('dawai_ai_settings')
      console.log('=== AI AGENT ENGINE SETTINGS LOAD DEBUG ===')
      console.log('Raw localStorage value:', savedSettings)
      
      if (savedSettings) {
        let parsedSettings = JSON.parse(savedSettings)
        console.log('Parsed settings from localStorage:', parsedSettings)
        
        // Check if the settings are in the new format (with aiAssistant key)
        if (!parsedSettings.aiAssistant && (parsedSettings.apiKeys || parsedSettings.availableModels)) {
          console.log("AIAgentEngine: Converting old format settings to new format")
          // If in old format, convert to new format
          parsedSettings = {
            aiAssistant: {
              models: parsedSettings.availableModels || {},
              apiKeys: parsedSettings.apiKeys || {}
            }
          }
          console.log("AIAgentEngine: Converted settings:", parsedSettings)
        }
        this.globalSettings = parsedSettings
        console.log("AIAgentEngine: Final global settings stored:", this.globalSettings)
        
        // Ensure aiAssistant and its sub-keys exist
        if (!this.globalSettings.aiAssistant) {
          this.globalSettings.aiAssistant = {}
          console.warn("AIAgentEngine: aiAssistant key missing in globalSettings, initialized empty.")
        }
        if (!this.globalSettings.aiAssistant.apiKeys) {
          this.globalSettings.aiAssistant.apiKeys = {}
          console.warn("AIAgentEngine: aiAssistant.apiKeys missing in globalSettings, initialized empty.")
        }
        if (!this.globalSettings.aiAssistant.models) {
          this.globalSettings.aiAssistant.models = {}
          console.warn("AIAgentEngine: aiAssistant.models missing in globalSettings, initialized empty.")
        }

        // Update API keys from global settings
        this.apiKeys = { ...this.globalSettings.aiAssistant.apiKeys }
        console.log("AIAgentEngine: API keys loaded:", this.apiKeys)
        
        // Filter available models based on global settings
        const originalModels = [
          { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
          { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' },
          { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google' },
          { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google' }
        ]
        
        console.log("AIAgentEngine: Original models:", originalModels)
        console.log("AIAgentEngine: Model settings from global settings:", this.globalSettings.aiAssistant.models)
        
        this.availableModels = originalModels.filter(model => {
          const isEnabled = this.globalSettings.aiAssistant.models[model.id] === true
          console.log(`AIAgentEngine: Model ${model.id}: enabled=${isEnabled}`)
          return isEnabled
        })
        
        console.log("AIAgentEngine: Filtered available models:", this.availableModels)
        
        // Set current model to first available if current is not available
        if (!this.availableModels.find(m => m.id === this.currentModel)) {
          if (this.availableModels.length > 0) {
            this.currentModel = this.availableModels[0].id
            console.log("AIAgentEngine: Current model updated to first available:", this.currentModel)
          } else {
            this.currentModel = null
            console.log("AIAgentEngine: No models available, current model set to null")
          }
        } else {
          console.log("AIAgentEngine: Current model is still available:", this.currentModel)
        }

        // メモリシステムの初期化
        this.initializeMemorySystem()
        
        return true
      } else {
        console.log("AIAgentEngine: No settings found in localStorage")
      }
    } catch (error) {
      console.error("AIAgentEngine: Failed to load global settings:", error)
    }
    return false
  }

  // メモリシステムの初期化
  initializeMemorySystem() {
    try {
      // 保存されたメモリデータの読み込み
      const savedMemory = localStorage.getItem('dawai_memory_data')
      if (savedMemory) {
        const memoryData = JSON.parse(savedMemory)
        this.memoryManager.importMemory(memoryData)
        console.log('AIAgentEngine: Memory data loaded from localStorage')
      }

      // 新しいセッションを開始
      this.startNewSession()

      console.log('AIAgentEngine: Memory system initialized')
    } catch (error) {
      console.error('AIAgentEngine: Failed to initialize memory system:', error)
    }
  }

  // 新しいセッション開始
  startNewSession() {
    this.currentSessionId = `session_${Date.now()}`
    this.sessionStartTime = Date.now()
    this.memoryManager.startSession(this.currentSessionId)
    
    console.log(`AIAgentEngine: New session started: ${this.currentSessionId}`)
  }

  // セッション終了と要約
  async endCurrentSession() {
    if (this.currentSessionId) {
      await this.memoryManager.endSession()
      
      // メモリデータを保存
      const memoryData = this.memoryManager.exportMemory()
      localStorage.setItem('dawai_memory_data', JSON.stringify(memoryData))
      
      console.log(`AIAgentEngine: Session ended: ${this.currentSessionId}`)
      this.currentSessionId = null
      this.sessionStartTime = null
    }
  }

  // Get API key for current model
  getApiKeyForModel(modelId = null) {
    const targetModel = modelId || this.currentModel
    const model = this.availableModels.find(m => m.id === targetModel)
    console.log('Getting API key for model:', targetModel, 'Provider:', model?.provider, 'Available keys:', this.apiKeys)
    
    if (model && this.apiKeys[model.provider]) {
      return this.apiKeys[model.provider]
    }
    
    // グローバル設定からも取得を試行
    if (this.globalSettings?.aiAssistant?.apiKeys?.[model?.provider]) {
      console.log('Found API key in global settings for provider:', model?.provider)
      return this.globalSettings.aiAssistant.apiKeys[model.provider]
    }
    
    console.warn('No API key found for provider:', model?.provider)
    return null
  }

  // Reinitialize method for settings changes
  async reinitialize(settings = null) {
    console.log("AIAgentEngine: reinitialize called with settings:", settings)
    this.isInitialized = false
    
    if (settings) {
      // Update API keys from provided settings
      if (settings.apiKeys) {
        this.apiKeys = { ...settings.apiKeys }
        console.log("AIAgentEngine: API keys updated during reinitialization:", this.apiKeys)
      }
      
      // Filter available models based on provided settings
      const originalModels = [
        { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' },
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google' },
        { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google' }
      ]
      
      if (settings.models) {
        this.availableModels = originalModels.filter(model => 
          settings.models[model.id] === true
        )
        console.log("AIAgentEngine: Available models filtered during reinitialization:", this.availableModels)
      } else {
        this.availableModels = originalModels
        console.log("AIAgentEngine: No models in settings, using all original models.", this.availableModels)
      }
      
      // Set current model to first available if current is not available
      if (!this.availableModels.find(m => m.id === this.currentModel)) {
        if (this.availableModels.length > 0) {
          this.currentModel = this.availableModels[0].id
          console.log("AIAgentEngine: Current model updated to first available:", this.currentModel)
        } else {
          this.currentModel = null // No models available
          console.warn("AIAgentEngine: No models available after reinitialization.")
        }
      }
      
      console.log("AIAgentEngine: AI Agent Engine re-initialized successfully with settings:", {
        availableModels: this.availableModels.length,
        currentModel: this.currentModel,
        apiKeysConfigured: Object.keys(this.apiKeys).filter(k => this.apiKeys[k]).length,
        apiKeys: this.apiKeys
      })
      this.isInitialized = true
    } else {
      console.warn("AIAgentEngine: No settings provided for reinitialization. Initializing with default.")
      // If no settings are provided, ensure apiKeys and availableModels are reset to default/empty
      this.apiKeys = {}
      this.availableModels = [
        { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' },
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google' },
        { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google' }
      ]
      this.currentModel = this.availableModels.length > 0 ? this.availableModels[0].id : null
      this.isInitialized = false // Not fully initialized without proper settings
    }
    
    // Re-initialize
    return await this.initialize()
  }

  getAvailableModels() {
    console.log('AIAgentEngine: getAvailableModels called, returning:', this.availableModels)
    return this.availableModels
  }

  getCurrentModel() {
    return this.currentModel
  }

  setModel(modelId) {
    if (this.availableModels.find(m => m.id === modelId)) {
      this.currentModel = modelId
      console.log("AIAgentEngine: Model set to:", this.currentModel)
      this.notifyListeners("modelChanged", { model: { id: modelId } })
    } else {
      console.warn("AIAgentEngine: Attempted to set unavailable model:", modelId)
    }
  }

  // 初期化
  async initialize() {
    console.log('AIAgentEngine: Initializing AI Agent Engine...')
    try {
      // Load global settings first
      const settingsLoaded = this.loadGlobalSettings()
      console.log('AIAgentEngine: Global settings loaded status:', settingsLoaded)
      
      // デフォルト設定の確保
      if (!this.globalSettings) {
        this.globalSettings = {
          aiAssistant: {
            models: {
              'claude-3-opus': true,
              'claude-3-sonnet': false,
              'gpt-4': false,
              'gpt-3.5-turbo': false,
              'gemini-2.5-pro': false,
              'gemini-2.5-flash': false,
              'gemini-1.5-pro': false,
              'gemini-1.5-flash': false,
              'gemini-pro': false
            },
            apiKeys: {}
          }
        }
        console.log('AIAgentEngine: Created default global settings')
      }
      
      // 利用可能なモデルの確保
      if (!this.availableModels || this.availableModels.length === 0) {
        this.availableModels = [
          { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
          { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' },
          { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google' },
          { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google' }
        ]
        console.log('AIAgentEngine: Set default available models')
      }
      
      // 現在のモデルの確保
      if (!this.currentModel) {
        this.currentModel = this.availableModels[0]?.id || null
        console.log('AIAgentEngine: Set default current model:', this.currentModel)
      }
      
      // バックエンドサーバーの接続確認（オプショナル）
      try {
        console.log('AIAgentEngine: Checking backend server health...')
        const response = await fetch('/ai/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // タイムアウトを設定
          signal: AbortSignal.timeout(3000) // 3秒でタイムアウト
        })
        
        if (response.ok) {
          console.log('AIAgentEngine: Backend server is available')
        } else {
          console.warn('AIAgentEngine: Backend server not available, continuing with local mode')
        }
      } catch (error) {
        // ネットワークエラーやタイムアウトは正常な動作として扱う
        if (error.name === 'AbortError' || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('ERR_CONNECTION_REFUSED')) {
          console.warn('AIAgentEngine: Backend server connection failed, continuing with local mode:', error.message)
        } else {
          console.warn('AIAgentEngine: Backend server connection failed, continuing with local mode:', error.message)
        }
      }
      
      this.isInitialized = true
      console.log('AIAgentEngine: AI Agent Engine initialized successfully with:', {
        availableModels: this.availableModels.length,
        currentModel: this.currentModel,
        apiKeysConfigured: Object.keys(this.apiKeys).filter(k => this.apiKeys[k]).length
      })
      this.notifyListeners('initialized', { success: true })
      return true
    } catch (error) {
      console.error('AIAgentEngine: Failed to initialize AI Agent Engine:', error)
      this.notifyListeners('initialized', { success: false, error: error.message })
      return false
    }
  }

  // リスナー管理
  addListener(callback) {
    console.log('AIAgentEngine: Listener added.')
    this.listeners.push(callback)
  }

  removeListener(callback) {
    console.log('AIAgentEngine: Listener removed.')
    this.listeners = this.listeners.filter(listener => listener !== callback)
  }

  notifyListeners(eventType, data) {
    console.log(`AIAgentEngine: Notifying listeners for event: ${eventType}`, data)
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data)
      } catch (error) {
        console.error('AIAgentEngine: Error in AI Agent listener:', error)
      }
    })
  }

  // プロンプト生成の改善
  generateEnhancedPrompt(userPrompt, context = {}) {
    console.log('AIAgentEngine: Generating enhanced prompt for userPrompt:', userPrompt, 'and context:', context)
    const {
      currentTrack = {},
      projectInfo = {},
      existingTracks = [],
      musicContext = {}
    } = context

    // 基本的なプロンプトテンプレート
    let enhancedPrompt = `あなたは音楽制作AIアシスタントです。以下の指示に基づいて、音楽要素を生成してください.\n\n[ユーザーの指示]\n${userPrompt}\n\n[現在のプロジェクト情報]`

    // プロジェクト情報の追加
    if (projectInfo.tempo) {
      enhancedPrompt += `\nテンポ: ${projectInfo.tempo} BPM`
    }
    if (projectInfo.key) {
      enhancedPrompt += `\nキー: ${projectInfo.key}`
    }
    if (projectInfo.timeSignature) {
      enhancedPrompt += `\n拍子: ${projectInfo.timeSignature}`
    }
    if (projectInfo.genre) {
      enhancedPrompt += `\nジャンル: ${projectInfo.genre}`
    }

    // 現在のトラック情報
    if (currentTrack.type) {
      enhancedPrompt += `\n\n[対象トラック]\n楽器: ${currentTrack.type}\n名前: ${currentTrack.name || 'Untitled Track'}`
      
      if (currentTrack.volume !== undefined) {
        enhancedPrompt += `\n音量: ${currentTrack.volume}%`
      }
    }

    // 既存トラックの情報
    if (existingTracks.length > 0) {
      enhancedPrompt += `\n\n[既存のトラック]`
      enhancedPrompt += existingTracks.map((track, index) => `\n${index + 1}. ${track.name} (${track.type})`).join('')
    }

    // 音楽的コンテキスト
    if (musicContext.chordProgression) {
      enhancedPrompt += `\n\n[コード進行]\n${musicContext.chordProgression}`
    }

    // 出力形式の指定
    enhancedPrompt += `\n\n[出力形式]\n以下のJSON形式で出力してください：\n{\n  "type": "drum_pattern"|"bassline"|"chord_progression"|"melody"|"harmony",\n  "notes": [\n    {"pitch": 60, "start": 0.0, "duration": 0.25, "velocity": 100},\n    ...\n  ],\n  "description": "生成した音楽要素の説明",\n  "suggestions": "追加の提案やバリエーション"\n}\n\n音楽理論的に正しく、指定されたコンテキストに合った音楽要素を生成してください。`

    console.log('AIAgentEngine: Generated enhanced prompt:', enhancedPrompt)
    return enhancedPrompt
  }

  // AI生成の実行（改善版）
  async generateMusic(userPrompt, context = {}) {
    console.log('AIAgentEngine: generateMusic called with userPrompt:', userPrompt, 'and context:', context)
    if (!this.isInitialized) {
      console.error('AIAgentEngine: Generation failed - AI Agent Engine not initialized.')
      throw new Error('AI Agent Engine not initialized')
    }

    if (this.isGenerating) {
      console.warn('AIAgentEngine: Generation already in progress, ignoring new request.')
      throw new Error('Generation already in progress')
    }

    // Get API key for current model
    const apiKey = this.getApiKeyForModel()
    if (!apiKey) {
      console.error(`AIAgentEngine: Generation failed - API Key is not set for current model (${this.currentModel}).`)
      throw new Error(`API Key is not set for current model (${this.currentModel}). Please configure it in Settings > AI Assistant.`)
    }

    this.isGenerating = true
    this.notifyListeners('generationStarted', { prompt: userPrompt })
    console.log('AIAgentEngine: Generation started.')

    try {
      // 拡張プロンプトの生成
      const enhancedPrompt = this.generateEnhancedPrompt(userPrompt, context)
      
      // コンテキストキャッシュの更新
      const contextKey = this.generateContextKey(context)
      this.contextCache.set(contextKey, {
        timestamp: Date.now(),
        context: context
      })
      console.log('AIAgentEngine: Context cached with key:', contextKey)

      // バックエンドへのリクエスト
      const requestBody = {
        prompt: enhancedPrompt,
        model: this.currentModel,
        apiKey: apiKey
      }
      console.log('AIAgentEngine: Sending request to backend:', requestBody)

      const response = await fetch('/ai/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('AIAgentEngine: Backend response error:', errorData)
        throw new Error(errorData.detail || 'Generation failed')
      }

      // JSONレスポンスの処理
      const result = await response.json()
      console.log('AIAgentEngine: Generation successful, received result:', result)
      
      // 履歴に追加
      this.generationHistory.push({
        id: Date.now(),
        prompt: userPrompt,
        context: context,
        result: result,
        timestamp: new Date().toISOString()
      })
      console.log('AIAgentEngine: Generation added to history.')

      this.notifyListeners('generationCompleted', {
        prompt: userPrompt,
        result: result
      })

      return result

    } catch (error) {
      console.error('AIAgentEngine: AI generation error:', error)
      this.notifyListeners('generationError', {
        error: error.message,
        prompt: userPrompt
      })
      throw error
    } finally {
      this.isGenerating = false
      console.log('AIAgentEngine: Generation process finished.')
    }
  }

  // ストリーミングチャット機能
  async streamChat(message, context = {}, onChunk = null) {
    console.log('AIAgentEngine: streamChat called with message:', message, 'and context:', context)
    
    if (!this.isInitialized) {
      throw new Error('AI Agent Engine not initialized')
    }

    if (this.isGenerating) {
      throw new Error('Generation already in progress')
    }

    const apiKey = this.getApiKeyForModel()
    if (!apiKey) {
      throw new Error(`API Key is not set for current model (${this.currentModel})`)
    }

    this.isGenerating = true
    this.notifyListeners('streamingStarted', { message })

    try {
      console.log('AIAgentEngine: Chat Debug Info:', {
        currentModel: this.currentModel,
        apiKey: apiKey,
        apiKeys: this.apiKeys,
        availableModels: this.availableModels
      })
      
      const response = await fetch('/ai/api/stream/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          message: message,
          context: context,
          model: this.currentModel,
          apiKeys: this.apiKeys
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6) // 'data: ' を除去
            
            if (dataStr === '[DONE]') {
              console.log('AIAgentEngine: Streaming completed')
              break
            }

            try {
              const data = JSON.parse(dataStr)
              
              if (data.type === 'text' && data.content) {
                fullResponse += data.content

                // チャンクごとのコールバック（リアルタイム更新）
                if (onChunk) {
                  // フィルタリングされたテキストをユーザーに表示
                  const filteredResponse = this.filterTechnicalContent(fullResponse)
                  onChunk(data.content, filteredResponse)
                }

                // リスナーに通知
                this.notifyListeners('streamingChunk', {
                  chunk: data.content,
                  fullResponse: fullResponse
                })
              } else if (data.type === 'error') {
                throw new Error(data.content)
              }
            } catch (parseError) {
              console.warn('AIAgentEngine: Failed to parse streaming chunk:', parseError)
            }
          }
        }
      }

      // 履歴に追加
      this.generationHistory.push({
        id: Date.now(),
        prompt: message,
        context: context,
        result: { response: fullResponse },
        timestamp: new Date().toISOString(),
        type: 'streaming'
      })

      this.notifyListeners('streamingCompleted', {
        message: message,
        response: fullResponse
      })

      return fullResponse

    } catch (error) {
      console.error('AIAgentEngine: Streaming error:', error)
      this.notifyListeners('streamingError', {
        error: error.message,
        message: message
      })
      throw error
    } finally {
      this.isGenerating = false
    }
  }

  // ストリーミングAgent mode機能（Sense-Plan-Act対応）
  async streamAgentAction(prompt, context = {}, onChunk = null) {
    console.log('AIAgentEngine: streamAgentAction called with prompt:', prompt, 'and context:', context)
    
    if (!this.isInitialized) {
      throw new Error('AI Agent Engine not initialized')
    }

    if (this.isGenerating) {
      throw new Error('Generation already in progress')
    }

    const apiKey = this.getApiKeyForModel()
    if (!apiKey) {
      throw new Error(`API Key is not set for current model (${this.currentModel})`)
    }

    this.isGenerating = true
    this.notifyListeners('agentStreamingStarted', { prompt })

    try {
      // Phase 1: Sense - 現状把握
      console.log('AIAgentEngine: Starting Sense phase...')
      const senseResult = await this.executeSensePhase(prompt, context, onChunk)
      
      if (!senseResult.understood) {
        this.notifyListeners('agentStreamingCompleted', {
          prompt: prompt,
          result: {
            actions: [],
            summary: 'コンテキストの理解が不完全です',
            nextSteps: 'より具体的な指示をください',
            success: false,
            error: 'Context understanding failed',
            phase: 'sense_failed'
          }
        })
        return {
          actions: [],
          summary: 'コンテキストの理解が不完全です',
          nextSteps: 'より具体的な指示をください',
          success: false,
          error: 'Context understanding failed'
        }
      }

      // Phase 2: Plan - 実行計画の策定
      console.log('AIAgentEngine: Starting Plan phase...')
      const planResult = await this.executePlanPhase(prompt, context, senseResult, onChunk)
      
      if (!planResult.actions || planResult.actions.length === 0) {
        this.notifyListeners('agentStreamingCompleted', {
          prompt: prompt,
          result: {
            actions: [],
            summary: '実行可能なアクションが見つかりませんでした',
            nextSteps: '別の方法で指示をください',
            success: false,
            error: 'No actionable plan found',
            phase: 'plan_failed'
          }
        })
        return {
          actions: [],
          summary: '実行可能なアクションが見つかりませんでした',
          nextSteps: '別の方法で指示をください',
          success: false,
          error: 'No actionable plan found'
        }
      }

      // Phase 3: Act - アクションの実行
      console.log('AIAgentEngine: Starting Act phase...')
      const actResult = await this.executeActPhase(prompt, context, planResult, onChunk)

      // 最終結果を返す
      const finalResult = {
        actions: actResult.actions || [],
        summary: actResult.summary || '操作が完了しました',
        nextSteps: actResult.nextSteps || '次のステップを実行してください',
        success: actResult.success !== false,
        error: actResult.error || '',
        hasPendingChanges: this.hasPendingChanges(),
        phase: 'completed'
      }

      this.notifyListeners('agentStreamingCompleted', {
        prompt: prompt,
        result: finalResult
      })

      return finalResult

    } catch (error) {
      console.error('AIAgentEngine: Agent streaming error:', error)
      this.notifyListeners('agentStreamingError', {
        error: error.message,
        prompt: prompt
      })
      throw error
    } finally {
      this.isGenerating = false
    }
  }

  // Sense段階の実行
  async executeSensePhase(prompt, context, onChunk) {
    console.log('AIAgentEngine: Executing Sense phase')
    
    const sensePrompt = this.generateSensePrompt(prompt, context)
    
    try {
      const response = await fetch('/ai/api/stream/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          prompt: sensePrompt,
          context: context,
          model: this.currentModel,
          apiKey: this.getApiKeyForModel()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            
            if (dataStr === '[DONE]') {
              console.log('AIAgentEngine: Sense phase streaming completed')
              break
            }

            try {
              const data = JSON.parse(dataStr)
              
              if (data.type === 'text' && data.content) {
                fullResponse += data.content

                if (onChunk) {
                  // フィルタリングされたテキストをユーザーに表示
                  const filteredResponse = this.filterTechnicalContent(fullResponse)
                  onChunk(data.content, filteredResponse, 'sense')
                }
                
                this.notifyListeners('agentStreamingChunk', {
                  chunk: data.content,
                  fullResponse: fullResponse,
                  phase: 'sense'
                })
              } else if (data.type === 'error') {
                throw new Error(data.content)
              }
            } catch (parseError) {
              console.warn('AIAgentEngine: Failed to parse sense streaming chunk:', parseError)
            }
          }
        }
      }

      // Sense段階の理解度を評価
      const senseResult = this.evaluateSenseUnderstanding(fullResponse, context)
      
      // メモリシステムに会話を保存
      if (this.useMemorySystem) {
        this.memoryManager.addToShortTermMemory({
          type: 'conversation',
          userMessage: prompt,
          assistantResponse: fullResponse,
          phase: 'sense',
          importance: 0.6
        })
      }

      // Sense段階の結果をチャットメッセージとして通知
      this.notifyListeners('sensePhaseCompleted', {
        response: fullResponse,
        understood: senseResult.understood,
        understandingRatio: senseResult.ratio,
        context: context
      })

      return senseResult

    } catch (error) {
      console.error('AIAgentEngine: Sense phase error:', error)
      throw error
    }
  }

  // Plan段階の実行
  async executePlanPhase(prompt, context, senseResult, onChunk) {
    console.log('AIAgentEngine: Executing Plan phase')
    
    const planPrompt = this.generatePlanPrompt(prompt, context, senseResult)
    
    try {
      const response = await fetch('/ai/api/stream/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          prompt: planPrompt,
          context: context,
          model: this.currentModel,
          apiKey: this.getApiKeyForModel()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            
            if (dataStr === '[DONE]') {
              console.log('AIAgentEngine: Plan phase streaming completed')
              break
            }

            try {
              const data = JSON.parse(dataStr)
              
              if (data.type === 'text' && data.content) {
                fullResponse += data.content

                if (onChunk) {
                  // フィルタリングされたテキストをユーザーに表示
                  const filteredResponse = this.filterTechnicalContent(fullResponse)
                  onChunk(data.content, filteredResponse, 'plan')
                }

                this.notifyListeners('agentStreamingChunk', {
                  chunk: data.content,
                  fullResponse: fullResponse,
                  phase: 'plan'
                })
              } else if (data.type === 'error') {
                throw new Error(data.content)
              }
            } catch (parseError) {
              console.warn('AIAgentEngine: Failed to parse plan streaming chunk:', parseError)
            }
          }
        }
      }

      // Plan段階の結果を解析
      const planResult = this.parsePlanResponse(fullResponse, context)
      
      // メモリシステムに会話を保存
      if (this.useMemorySystem) {
        this.memoryManager.addToShortTermMemory({
          type: 'conversation',
          userMessage: prompt,
          assistantResponse: fullResponse,
          phase: 'plan',
          actions: planResult.actions,
          importance: 0.7
        })
      }

      // Plan段階の結果をチャットメッセージとして通知
      this.notifyListeners('planPhaseCompleted', {
        response: fullResponse,
        actions: planResult.actions,
        summary: planResult.summary,
        nextSteps: planResult.nextSteps
      })

      return planResult

    } catch (error) {
      console.error('AIAgentEngine: Plan phase error:', error)
      throw error
    }
  }

  // Act段階の実行
  async executeActPhase(prompt, context, planResult, onChunk) {
    console.log('AIAgentEngine: Executing Act phase')
    
    // Act段階用のプロンプトを生成（JSONファイル生成用）
    const actPrompt = this.generateActPrompt(prompt, context, planResult)
    
    try {
      const response = await fetch('/ai/api/stream/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          prompt: actPrompt,
          context: context,
          model: this.currentModel,
          apiKey: this.getApiKeyForModel()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            
            if (dataStr === '[DONE]') {
              console.log('AIAgentEngine: Act phase streaming completed')
              break
            }

            try {
              const data = JSON.parse(dataStr)
              
              if (data.type === 'text' && data.content) {
                fullResponse += data.content

                if (onChunk) {
                  // フィルタリングされたテキストをユーザーに表示
                  const filteredResponse = this.filterTechnicalContent(fullResponse)
                  onChunk(data.content, filteredResponse, 'act')
                }

                this.notifyListeners('agentStreamingChunk', {
                  chunk: data.content,
                  fullResponse: fullResponse,
                  phase: 'act'
                })
              } else if (data.type === 'error') {
                throw new Error(data.content)
              }
            } catch (parseError) {
              console.warn('AIAgentEngine: Failed to parse act streaming chunk:', parseError)
            }
          }
        }
      }

      // Act段階のJSONレスポンスを解析
      const actResult = this.parseActResponse(fullResponse, context)
      
      // 承認セッションを開始
      this.startApprovalSession()

      // アクションを実行
      if (actResult.actions && Array.isArray(actResult.actions)) {
        console.log('AIAgentEngine: Executing actions from Act phase:', actResult.actions)
        await this.executeActions(actResult.actions, context)
      }

      // 自動承認が有効な場合、即座に承認
      if (this.autoApprove && this.hasPendingChanges()) {
        console.log('AIAgentEngine: Auto-approving changes')
        await this.approveAllChanges()
      }

      // メモリシステムに会話を保存
      if (this.useMemorySystem) {
        this.memoryManager.addToShortTermMemory({
          type: 'conversation',
          userMessage: prompt,
          assistantResponse: fullResponse,
          phase: 'act',
          actions: actResult.actions,
          importance: 0.8
        })
      }

      // Act段階の結果をチャットメッセージとして通知
      const hasPendingChanges = this.hasPendingChanges()
      this.notifyListeners('actPhaseCompleted', {
        response: fullResponse,
        actions: actResult.actions,
        summary: actResult.summary,
        nextSteps: actResult.nextSteps,
        hasPendingChanges: hasPendingChanges
      })

      return {
        actions: actResult.actions || [],
        summary: actResult.summary || '操作が完了しました',
        nextSteps: actResult.nextSteps || '次のステップを実行してください',
        success: true,
        hasPendingChanges: hasPendingChanges
      }

    } catch (error) {
      console.error('AIAgentEngine: Act phase error:', error)
      throw error
    }
  }

  // Act段階用のプロンプト生成（JSONファイル生成用）
  generateActPrompt(prompt, context, planResult) {
    // RAGシステムから音楽知識とコード進行を取得
    let ragContent = ''
    if (this.useRAGSystem) {
      const ragResults = this.ragSystem.searchAll(prompt, {
        musicKnowledgeLimit: 1,
        chordProgressionLimit: 3,
        trackInfoLimit: 2,
        maxTotalTokens: this.maxRAGTokens
      })
      
      if (ragResults.musicKnowledge.length > 0) {
        ragContent = `\n[音楽知識]\n`
        ragResults.musicKnowledge.forEach(item => {
          ragContent += `${item.title}:\n${item.content}\n\n`
        })
      }
      
      if (ragResults.chordProgressions.length > 0) {
        ragContent += `[利用可能なコード進行]\n`
        ragResults.chordProgressions.forEach(item => {
          ragContent += `- ${item.name}: ${item.chords.join(' - ')} (${item.description})\n`
        })
        ragContent += `\n`
      }
    }

    const tracksInfo = context.existingTracks?.map(track => 
      `- ID: "${track.id}", 名前: "${track.name}", タイプ: ${track.type}, ノート数: ${track.midiData?.notes?.length || 0}`
    ).join('\n') || 'なし';

    return `前回の計画を基に、JSONアクションを生成し実行します。

[実行計画]
${planResult.summary || '計画が策定されました'}

[プロジェクト情報]
プロジェクト: ${context.projectInfo?.name || 'Unknown'}, テンポ: ${context.projectInfo?.tempo || 120}BPM, キー: ${context.projectInfo?.key || 'C'}, 拍子: ${context.projectInfo?.timeSignature || '4/4'}

[利用可能なトラック]
${tracksInfo}${ragContent}

[ユーザーの要求]
${prompt}

**重要**: JSONのみ生成し、説明は summary と nextSteps に簡潔に記載してください。

JSON形式:
{
  "actions": [
    {
      "type": "addMidiNotes|updateTrack等",
      "params": { "trackId": "正確なID", "notes": [...] },
      "description": "操作の簡潔な説明"
    }
  ],
  "summary": "実行内容の1行要約",
  "nextSteps": "次のステップの簡潔な提案"
}

操作タイプ: addTrack, updateTrack, deleteTrack, addMidiNotes, updateMidiNotes, deleteMidiNotes, applyEffect, updateProjectSettings, useChordProgression

**JSONのみを出力し、技術的な説明や詳細パラメータの解説は不要です。**`
  }

  // Act段階のJSONレスポンス解析
  parseActResponse(responseText, context) {
    console.log('AIAgentEngine: Parsing act response')
    
    try {
      // JSONの抽出を試行
      const jsonPatterns = [
        /\{[\s\S]*"actions"[\s\S]*\}/,
        /\{[\s\S]*\}/,
        /\[[\s\S]*\]/
      ]
      
      for (const pattern of jsonPatterns) {
        const match = responseText.match(pattern)
        if (match) {
          try {
            const parsed = JSON.parse(match[0])
            if (parsed.actions && Array.isArray(parsed.actions)) {
              // アクションの検証
              const validatedActions = this.validateActions(parsed.actions, context)
              
              return {
                actions: validatedActions,
                summary: parsed.summary || 'アクションが実行されました',
                nextSteps: parsed.nextSteps || '操作が完了しました'
              }
            }
          } catch (parseError) {
            console.warn('AIAgentEngine: JSON parse failed for act:', parseError)
          }
        }
      }
      
      // JSONが見つからない場合は自然言語から解析
      return this.parseNaturalLanguageAct(responseText, context)
      
    } catch (error) {
      console.error('AIAgentEngine: Failed to parse act response:', error)
      return {
        actions: [],
        summary: 'アクションの解析に失敗しました',
        nextSteps: '手動で操作を実行してください'
      }
    }
  }

  // 自然言語のActレスポンス解析
  parseNaturalLanguageAct(responseText, context) {
    console.log('AIAgentEngine: Parsing natural language act response')
    
    // 基本的なアクションを推測
    const responseLower = responseText.toLowerCase()
    
    // トラック追加の要求
    if (responseLower.includes('トラック') && (responseLower.includes('追加') || responseLower.includes('作成'))) {
      return {
        actions: [{
          type: 'addTrack',
          params: {
            name: '新しいトラック',
            type: 'piano'
          },
          description: '新しいトラックを追加します'
        }],
        summary: '新しいトラックが追加されました',
        nextSteps: 'トラックの設定を調整してください'
      }
    }
    
    // MIDIノート追加の要求
    if (responseLower.includes('ノート') || responseLower.includes('note') || responseLower.includes('メロディ')) {
      return {
        actions: [{
          type: 'addMidiNotes',
          params: {
            trackId: context.currentTrack?.id || 'default',
            notes: this.generateFallbackPattern()
          },
          description: 'MIDIノートを追加します'
        }],
        summary: 'MIDIノートが追加されました',
        nextSteps: 'ノートの調整を行ってください'
      }
    }
    
    return {
      actions: [],
      summary: '実行可能なアクションが見つかりませんでした',
      nextSteps: 'より具体的な指示をください'
    }
  }

  // Sense段階用のプロンプト生成
  generateSensePrompt(prompt, context) {
    // RAGシステムからトラック情報を取得
    let ragTrackInfo = ''
    if (this.useRAGSystem && context.existingTracks) {
      // 各トラックをベクトル化
      context.existingTracks.forEach(track => {
        this.ragSystem.vectorizeTrackInfo(track)
      })
      
      // トラック情報を検索
      const trackSearchResults = this.ragSystem.searchTrackInfo(prompt, 5)
      if (trackSearchResults.length > 0) {
        ragTrackInfo = `\n[RAG検索結果 - 関連トラック情報]\n`
        trackSearchResults.forEach(track => {
          ragTrackInfo += `- ${track.name} (${track.type}): ${track.notes.length} notes, 音量 ${track.volume}%, パン ${track.pan}%\n`
        })
      }
    }

    // メモリシステムから関連記憶を取得
    let memoryInfo = ''
    if (this.useMemorySystem) {
      const memoryResults = this.memoryManager.buildPromptMemory(prompt, this.maxMemoryTokens)
      if (memoryResults.memories.length > 0) {
        memoryInfo = `\n[関連記憶情報]\n`
        memoryResults.memories.forEach(memory => {
          if (memory.type === 'conversation') {
            memoryInfo += `- 過去の会話: ${memory.content.userMessage} → ${memory.content.assistantResponse}\n`
          } else if (memory.type === 'action') {
            memoryInfo += `- 実行された操作: ${memory.content.action} → ${memory.content.result}\n`
          }
        })
        memoryInfo += `\n`
      }
    }

    const tracksInfo = context.existingTracks?.map(track => 
      `- ID: "${track.id}", 名前: "${track.name}", タイプ: ${track.type}, ノート数: ${track.midiData?.notes?.length || 0}`
    ).join('\n') || 'なし';

    const currentTrackInfo = context.currentTrack ? 
      `ID: "${context.currentTrack.id}", 名前: "${context.currentTrack.name}", タイプ: ${context.currentTrack.type}, ノート数: ${context.currentTrack.midiData?.notes?.length || 0}` : 
      'なし';

    return `DAWAIアシスタントとして、現状を把握してください。

[プロジェクト]
プロジェクト: ${context.projectInfo?.name || 'Unknown'}, テンポ: ${context.projectInfo?.tempo || 120}BPM, キー: ${context.projectInfo?.key || 'C'}, 拍子: ${context.projectInfo?.timeSignature || '4/4'}, トラック数: ${context.existingTracks?.length || 0}

[トラック]
${tracksInfo}

[現在のトラック]
${currentTrackInfo}${ragTrackInfo}${memoryInfo}

[ユーザーの要求]
${prompt}

**簡潔に3-4文で状況を説明してください:**
- 現在の状態
- ユーザーの要求
- 次に何をするか`
  }

  // Plan段階用のプロンプト生成
  generatePlanPrompt(prompt, context, senseResult) {
    // RAGシステムから音楽知識を取得
    let ragMusicKnowledge = ''
    if (this.useRAGSystem) {
      const ragResults = this.ragSystem.searchAll(prompt, {
        musicKnowledgeLimit: 2,
        chordProgressionLimit: 2,
        trackInfoLimit: 2,
        maxTotalTokens: this.maxRAGTokens
      })
      
      if (ragResults.musicKnowledge.length > 0) {
        ragMusicKnowledge = `\n[音楽知識ベース]\n`
        ragResults.musicKnowledge.forEach(item => {
          ragMusicKnowledge += `${item.title}:\n${item.content}\n\n`
        })
      }
      
      if (ragResults.chordProgressions.length > 0) {
        ragMusicKnowledge += `[コード進行ライブラリ]\n`
        ragResults.chordProgressions.forEach(item => {
          ragMusicKnowledge += `${item.name}: ${item.chords.join(' - ')} (${item.description})\n`
        })
        ragMusicKnowledge += `\n`
      }
    }

    const tracksInfo = context.existingTracks?.map(track => 
      `- ID: "${track.id}", 名前: "${track.name}", タイプ: ${track.type}, ノート数: ${track.midiData?.notes?.length || 0}`
    ).join('\n') || 'なし';

    return `分析を踏まえ、簡潔な実行計画を立ててください。

[プロジェクト情報]
プロジェクト: ${context.projectInfo?.name || 'Unknown'}, テンポ: ${context.projectInfo?.tempo || 120}BPM, キー: ${context.projectInfo?.key || 'C'}, 拍子: ${context.projectInfo?.timeSignature || '4/4'}

[トラック]
${tracksInfo}${ragMusicKnowledge}

[ユーザーの要求]
${prompt}

利用可能な操作: addTrack, updateTrack, deleteTrack, addMidiNotes, updateMidiNotes, deleteMidiNotes, updateProjectSettings, useChordProgression

**簡潔に計画を説明してください（3-5文程度）:**
1. 何をするか
2. どのトラックに
3. どんな効果が期待できるか

**技術的詳細や長い説明は不要です。**`
  }

  // Sense段階の理解度評価
  evaluateSenseUnderstanding(responseText, context) {
    console.log('AIAgentEngine: Evaluating sense understanding')

    const responseLower = responseText.toLowerCase()

    if (!context || Object.keys(context).length === 0) {
      console.log('AIAgentEngine: No context provided, assuming understood')
      return {
        understood: true,
        ratio: 1.0,
        keywords: [],
        matchedKeywords: []
      }
    }

    // 基本音楽用語（最優先で評価）
    const basicMusicTerms = [
      'track', 'トラック', 'note', 'ノート', 'music', '音楽', 'melody', 'メロディ',
      'piano', 'ピアノ', 'drum', 'ドラム', 'bass', 'ベース', 'chord', 'コード',
      'tempo', 'テンポ', 'key', 'キー', 'project', 'プロジェクト', 'create', '作成',
      'add', '追加', 'play', '再生', 'sound', '音', 'arrange', 'アレンジ'
    ]

    let basicMatchCount = 0
    const matchedBasicTerms = []

    for (const term of basicMusicTerms) {
      if (responseLower.includes(term.toLowerCase())) {
        basicMatchCount++
        matchedBasicTerms.push(term)
      }
    }

    console.log(`AIAgentEngine: Basic music terms matched: ${basicMatchCount}/${basicMusicTerms.length}`, matchedBasicTerms)

    // 基本音楽用語が2つ以上含まれていれば理解OKと判定
    if (basicMatchCount >= 2) {
      console.log('AIAgentEngine: Understanding OK (basic music terms >= 2)')
      return {
        understood: true,
        ratio: basicMatchCount / basicMusicTerms.length,
        keywords: basicMusicTerms,
        matchedKeywords: matchedBasicTerms,
        reason: 'basic_terms'
      }
    }

    // 意味的キーワードで評価（技術的詳細を除外）
    const semanticKeywords = this.extractSemanticKeywords(context)

    if (semanticKeywords.length === 0) {
      console.log('AIAgentEngine: No semantic keywords, checking basic ratio')
      const basicRatio = basicMatchCount / basicMusicTerms.length
      return {
        understood: basicRatio >= 0.1,
        ratio: basicRatio,
        keywords: basicMusicTerms,
        matchedKeywords: matchedBasicTerms,
        reason: 'basic_ratio'
      }
    }

    let semanticMatchCount = 0
    const matchedSemanticKeywords = []

    for (const keyword of semanticKeywords) {
      if (responseLower.includes(keyword.toLowerCase())) {
        semanticMatchCount++
        matchedSemanticKeywords.push(keyword)
      }
    }

    const semanticRatio = semanticMatchCount / semanticKeywords.length
    console.log(`AIAgentEngine: Semantic keywords matched: ${semanticMatchCount}/${semanticKeywords.length} (${(semanticRatio * 100).toFixed(1)}%)`, matchedSemanticKeywords)

    // 15%以上マッチすれば理解OKと判定
    const understood = semanticRatio >= 0.15

    console.log(`AIAgentEngine: Final understanding: ${understood ? 'OK' : 'NG'} (threshold: 15%)`)

    return {
      understood: understood,
      ratio: semanticRatio,
      keywords: semanticKeywords,
      matchedKeywords: matchedSemanticKeywords,
      reason: 'semantic_ratio'
    }
  }

  // 意味的キーワードの抽出（技術的詳細を除外）
  extractSemanticKeywords(context) {
    console.log('AIAgentEngine: Extracting semantic keywords from context')
    const keywords = []

    if (!context) {
      console.log('AIAgentEngine: No context provided')
      return keywords
    }

    // 技術的IDかどうかを判定するヘルパー関数
    const isTechnicalId = (str) => {
      if (!str || typeof str !== 'string') return false
      // track-1234... のようなパターンを除外
      return /^(track|note|project)-[a-f0-9-]+$/i.test(str.trim())
    }

    // 現在のトラック情報
    if (context.currentTrack) {
      const track = context.currentTrack
      if (track.name && !isTechnicalId(track.name)) {
        keywords.push(track.name)
      }
      if (track.type && !isTechnicalId(track.type)) {
        keywords.push(track.type)
      }
      // track.id は技術的詳細なので除外
      console.log('AIAgentEngine: Added current track semantic keywords:', [track.name, track.type])
    }

    // 既存のトラック情報
    if (context.existingTracks && Array.isArray(context.existingTracks)) {
      context.existingTracks.forEach((track, index) => {
        if (track.name && !isTechnicalId(track.name)) {
          keywords.push(track.name)
        }
        if (track.type && !isTechnicalId(track.type)) {
          keywords.push(track.type)
        }
        // track.id は除外
        if (index < 3) {
          console.log('AIAgentEngine: Added existing track semantic keywords:', [track.name, track.type])
        }
      })
    }

    // プロジェクト設定情報
    if (context.projectSettings) {
      const settings = context.projectSettings
      if (settings.name && !isTechnicalId(settings.name)) {
        keywords.push(settings.name)
      }
      if (settings.tempo) {
        keywords.push('tempo')
        keywords.push(settings.tempo.toString())
      }
      if (settings.key) {
        keywords.push(settings.key)
      }
      console.log('AIAgentEngine: Added project settings semantic keywords')
    }

    // プロジェクト情報（別の形式）
    if (context.projectInfo) {
      const info = context.projectInfo
      if (info.name && !isTechnicalId(info.name)) {
        keywords.push(info.name)
      }
      if (info.tempo) {
        keywords.push('tempo')
        keywords.push(info.tempo.toString())
      }
      if (info.key) {
        keywords.push(info.key)
      }
      if (info.timeSignature) {
        keywords.push(info.timeSignature)
      }
      console.log('AIAgentEngine: Added project info semantic keywords')
    }

    // 音楽コンテキスト情報
    if (context.musicContext) {
      const music = context.musicContext
      if (music.projectName && !isTechnicalId(music.projectName)) {
        keywords.push(music.projectName)
      }
      if (music.tempo) {
        keywords.push('tempo')
        keywords.push(music.tempo.toString())
      }
      if (music.key) {
        keywords.push(music.key)
      }
      if (music.timeSignature) {
        keywords.push(music.timeSignature)
      }
      console.log('AIAgentEngine: Added music context semantic keywords')
    }

    // 現在のトラック詳細情報
    if (context.musicContext?.currentTrackDetails) {
      const trackDetails = context.musicContext.currentTrackDetails
      if (trackDetails.name && !isTechnicalId(trackDetails.name)) {
        keywords.push(trackDetails.name)
      }
      if (trackDetails.type && !isTechnicalId(trackDetails.type)) {
        keywords.push(trackDetails.type)
      }
      // trackDetails.id は除外
      console.log('AIAgentEngine: Added current track details semantic keywords')
    }

    // ノートを持つトラック情報
    if (context.musicContext?.tracksWithNotes && Array.isArray(context.musicContext.tracksWithNotes)) {
      context.musicContext.tracksWithNotes.forEach((track, index) => {
        if (track.name && !isTechnicalId(track.name)) {
          keywords.push(track.name)
        }
        if (track.type && !isTechnicalId(track.type)) {
          keywords.push(track.type)
        }
        // track.id は除外
        if (index < 2) {
          console.log('AIAgentEngine: Added tracks with notes semantic keywords')
        }
      })
    }

    // 重複を除去
    const uniqueKeywords = [...new Set(keywords.filter(k => k && k.toString().trim() !== ''))]

    console.log('AIAgentEngine: Final semantic keywords:', uniqueKeywords)
    return uniqueKeywords
  }

  // Plan段階のレスポンス解析
  parsePlanResponse(responseText, context) {
    console.log('AIAgentEngine: Parsing plan response')
    
    try {
      // JSONの抽出を試行
      const jsonPatterns = [
        /\{[\s\S]*"actions"[\s\S]*\}/,
        /\{[\s\S]*\}/,
        /\[[\s\S]*\]/
      ]
      
      for (const pattern of jsonPatterns) {
        const match = responseText.match(pattern)
        if (match) {
          try {
            const parsed = JSON.parse(match[0])
            if (parsed.actions && Array.isArray(parsed.actions)) {
              return {
                actions: parsed.actions,
                summary: parsed.summary || '実行計画が策定されました',
                nextSteps: parsed.nextSteps || '計画に基づいて操作を実行します'
              }
            }
          } catch (parseError) {
            console.warn('AIAgentEngine: JSON parse failed for plan:', parseError)
          }
        }
      }

      // 自然言語からの解析
      return this.parseNaturalLanguagePlan(responseText, context)
      
    } catch (error) {
      console.error('AIAgentEngine: Plan parsing error:', error)
      return { actions: [], summary: '', nextSteps: '' }
    }
  }

  // 自然言語からのプラン解析
  parseNaturalLanguagePlan(responseText, context) {
    console.log('AIAgentEngine: Parsing natural language plan')
    
    const responseLower = responseText.toLowerCase()
    const actions = []
    
    // トラック操作の検出
    if (responseLower.includes('トラック') || responseLower.includes('track')) {
      if (responseLower.includes('追加') || responseLower.includes('add') || responseLower.includes('作成') || responseLower.includes('create')) {
        const instrument = this.extractInstrument(responseText)
        const trackName = this.extractTrackName(responseText) || '新しいトラック'
        
        actions.push({
          type: 'addTrack',
          params: {
            instrument: instrument,
            trackName: trackName
          },
          description: '新しいトラックを追加します'
        })
      }
    }
    
    // MIDIノート操作の検出
    if (responseLower.includes('ノート') || responseLower.includes('note') || responseLower.includes('メロディ') || responseLower.includes('melody')) {
      const trackId = this.extractTrackId(context) || 'new-piano-track'
      const notes = this.generateNotesFromText(responseText)
      
      if (notes.length > 0) {
        actions.push({
          type: 'addMidiNotes',
          params: {
            trackId: trackId,
            notes: notes
          },
          description: 'MIDIノートを追加します'
        })
      }
    }
    
    return {
      actions: actions,
      summary: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
      nextSteps: '生成されたアクションを確認してください'
    }
  }

  // アクションの検証
  validateActions(actions, context) {
    console.log('AIAgentEngine: Validating actions:', actions)
    
    const validatedActions = []
    
    for (const action of actions) {
      if (this.isValidAction(action, context)) {
        validatedActions.push(action)
      } else {
        console.warn('AIAgentEngine: Invalid action filtered out:', action)
      }
    }
    
    return validatedActions
  }

  // アクションの妥当性チェック
  isValidAction(action, context) {
    if (!action || typeof action !== 'object') return false
    if (!action.type || typeof action.type !== 'string') return false
    
    // 必須パラメータのチェック
    switch (action.type) {
      case 'addTrack':
        return action.params && (action.params.instrument || action.params.trackName)
      case 'addMidiNotes':
        return action.params && action.params.trackId && Array.isArray(action.params.notes)
      case 'updateMidiNotes':
        return action.params && action.params.trackId && Array.isArray(action.params.notes)
      case 'deleteMidiNotes':
        return action.params && action.params.trackId && Array.isArray(action.params.noteIds)
      default:
        return true // その他のアクションは基本的に許可
    }
  }

  // コンテキストキーワードの抽出
  extractContextKeywords(context) {
    console.log('AIAgentEngine: Extracting context keywords from:', context)
    const keywords = []
    
    if (!context) {
      console.log('AIAgentEngine: No context provided')
      return keywords
    }
    
    // 現在のトラック情報
    if (context.currentTrack) {
      const track = context.currentTrack
      if (track.name) keywords.push(track.name)
      if (track.type) keywords.push(track.type)
      if (track.id) keywords.push(track.id)
      console.log('AIAgentEngine: Added current track keywords:', [track.name, track.type, track.id])
    }
    
    // 既存のトラック情報
    if (context.existingTracks && Array.isArray(context.existingTracks)) {
      context.existingTracks.forEach((track, index) => {
        if (track.name) keywords.push(track.name)
        if (track.type) keywords.push(track.type)
        if (track.id) keywords.push(track.id)
        // 最初の3トラックのみ詳細をログ
        if (index < 3) {
          console.log('AIAgentEngine: Added existing track keywords:', [track.name, track.type, track.id])
        }
      })
    }
    
    // プロジェクト設定情報
    if (context.projectSettings) {
      const settings = context.projectSettings
      if (settings.name) keywords.push(settings.name)
      if (settings.tempo) keywords.push(`tempo ${settings.tempo}`)
      if (settings.key) keywords.push(settings.key)
      console.log('AIAgentEngine: Added project settings keywords:', [settings.name, settings.tempo, settings.key])
    }
    
    // プロジェクト情報（別の形式）
    if (context.projectInfo) {
      const info = context.projectInfo
      if (info.name) keywords.push(info.name)
      if (info.tempo) keywords.push(`tempo ${info.tempo}`)
      if (info.key) keywords.push(info.key)
      if (info.timeSignature) keywords.push(info.timeSignature)
      console.log('AIAgentEngine: Added project info keywords:', [info.name, info.tempo, info.key, info.timeSignature])
    }
    
    // 音楽コンテキスト情報
    if (context.musicContext) {
      const music = context.musicContext
      if (music.projectName) keywords.push(music.projectName)
      if (music.tempo) keywords.push(`tempo ${music.tempo}`)
      if (music.key) keywords.push(music.key)
      if (music.timeSignature) keywords.push(music.timeSignature)
      console.log('AIAgentEngine: Added music context keywords:', [music.projectName, music.tempo, music.key, music.timeSignature])
    }
    
    // 現在のトラック詳細情報
    if (context.musicContext?.currentTrackDetails) {
      const trackDetails = context.musicContext.currentTrackDetails
      if (trackDetails.name) keywords.push(trackDetails.name)
      if (trackDetails.type) keywords.push(trackDetails.type)
      if (trackDetails.id) keywords.push(trackDetails.id)
      console.log('AIAgentEngine: Added current track details keywords:', [trackDetails.name, trackDetails.type, trackDetails.id])
    }
    
    // ノートを持つトラック情報
    if (context.musicContext?.tracksWithNotes && Array.isArray(context.musicContext.tracksWithNotes)) {
      context.musicContext.tracksWithNotes.forEach((track, index) => {
        if (track.name) keywords.push(track.name)
        if (track.type) keywords.push(track.type)
        if (track.id) keywords.push(track.id)
        if (index < 2) { // 最初の2トラックのみログ
          console.log('AIAgentEngine: Added tracks with notes keywords:', [track.name, track.type, track.id])
        }
      })
    }
    
    // 基本的な音楽用語を追加
    const basicMusicTerms = ['track', 'トラック', 'note', 'ノート', 'music', '音楽', 'melody', 'メロディ', 'piano', 'ピアノ', 'guitar', 'ギター']
    keywords.push(...basicMusicTerms)
    
    // 重複を除去
    const uniqueKeywords = [...new Set(keywords.filter(k => k && k.toString().trim() !== ''))]
    
    console.log('AIAgentEngine: Final extracted keywords:', uniqueKeywords)
    return uniqueKeywords
  }

  // 楽器名の抽出
  extractInstrument(text) {
    const instrumentPatterns = [
      /ピアノ|piano/i,
      /ギター|guitar/i,
      /ベース|bass/i,
      /ドラム|drum/i,
      /バイオリン|violin/i,
      /トランペット|trumpet/i
    ]
    
    for (const pattern of instrumentPatterns) {
      const match = text.match(pattern)
      if (match) {
        return match[0]
      }
    }
    
    return 'Piano' // デフォルト
  }

  // トラック名の抽出
  extractTrackName(text) {
    const nameMatch = text.match(/「([^」]+)」|"([^"]+)"|'([^']+)'/)
    if (nameMatch) {
      return nameMatch[1] || nameMatch[2] || nameMatch[3]
    }
    return null
  }

  // トラックIDの抽出
  extractTrackId(context) {
    if (context.currentTrack && context.currentTrack.id) {
      return context.currentTrack.id
    }
    
    if (context.existingTracks && context.existingTracks.length > 0) {
      // ピアノトラックを優先
      const pianoTrack = context.existingTracks.find(track => 
        track.type === 'piano' || track.name.toLowerCase().includes('piano')
      )
      if (pianoTrack) return pianoTrack.id
      
      // 最初のトラックを返す
      return context.existingTracks[0].id
    }
    
    return null
  }

  // テキストからノート生成
  generateNotesFromText(text) {
    const notes = []
    const textLower = text.toLowerCase()
    
    // 基本的なメロディーパターンの検出
    if (textLower.includes('ドレミ') || textLower.includes('c major') || textLower.includes('スケール')) {
      // C major scale
      const pitches = [60, 62, 64, 65, 67, 69, 71, 72] // C, D, E, F, G, A, B, C
      pitches.forEach((pitch, index) => {
        notes.push({
          id: `note-${Date.now()}-${index}`,
          pitch: pitch,
          time: index * 0.5,
          duration: 0.5,
          velocity: 0.8
        })
      })
    } else if (textLower.includes('ベートーベン') || textLower.includes('beethoven')) {
      // ベートーベンスタイル
      const pitches = [60, 62, 64, 65, 67] // C, D, E, F, G
      pitches.forEach((pitch, index) => {
        notes.push({
          id: `note-${Date.now()}-${index}`,
          pitch: pitch,
          time: index * 0.5,
          duration: index === pitches.length - 1 ? 1.0 : 0.5,
          velocity: 0.8
        })
      })
    } else {
      // デフォルトパターン
      notes.push({
        id: `note-${Date.now()}-1`,
        pitch: 60,
        time: 0,
        duration: 1,
        velocity: 0.8
      })
    }
    
    return notes
  }

  // 生成結果の解析
  parseGenerationResult(rawResponse) {
    console.log('AIAgentEngine: Parsing generation result:', rawResponse)
    try {
      // JSONの抽出を試行
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[0]
        console.log('AIAgentEngine: Extracted JSON string:', jsonStr)
        const parsed = JSON.parse(jsonStr)
        
        // 基本的な検証
        if (parsed.type && parsed.notes && Array.isArray(parsed.notes)) {
          console.log('AIAgentEngine: Successfully parsed valid music pattern.')
          return {
            type: parsed.type,
            notes: parsed.notes.map(note => ({
              pitch: parseInt(note.pitch) || 60,
              start: parseFloat(note.start) || 0,
              duration: parseFloat(note.duration) || 0.25,
              velocity: parseInt(note.velocity) || 100
            })),
            description: parsed.description || 'Generated music pattern',
            suggestions: parsed.suggestions || ''
          }
        }
      }

      // JSONが見つからない場合のフォールバック
      console.warn('AIAgentEngine: No valid JSON found in response, falling back to default pattern.')
      return {
        type: 'melody',
        notes: this.generateFallbackPattern(),
        description: 'Fallback pattern generated due to parsing error',
        suggestions: 'Try rephrasing your request for better results'
      }

    } catch (error) {
      console.error('AIAgentEngine: Failed to parse generation result:', error)
      return {
        type: 'melody',
        notes: this.generateFallbackPattern(),
        description: 'Error occurred during generation',
        suggestions: 'Please try again with a different prompt'
      }
    }
  }

  // フォールバックパターンの生成
  generateFallbackPattern() {
    console.log('AIAgentEngine: Generating fallback pattern.')
    // 簡単なCメジャースケールのパターン
    const cMajorScale = [60, 62, 64, 65, 67, 69, 71, 72] // C4 to C5
    const pattern = []
    
    for (let i = 0; i < 8; i++) {
      pattern.push({
        pitch: cMajorScale[i % cMajorScale.length],
        start: i * 0.5,
        duration: 0.25,
        velocity: 80
      })
    }
    
    return pattern
  }

  // コンテキストキーの生成
  generateContextKey(context) {
    const keyParts = [
      context.currentTrack?.type || 'unknown',
      context.projectInfo?.tempo || 120,
      context.projectInfo?.key || 'C',
      context.existingTracks?.length || 0
    ]
    const generatedKey = keyParts.join('_')
    console.log('AIAgentEngine: Generated context key:', generatedKey)
    return generatedKey
  }

  // モデル設定
  setModel(modelId) {
    console.log('AIAgentEngine: Attempting to set model to:', modelId)
    const model = this.availableModels.find(m => m.id === modelId)
    if (model) {
      this.currentModel = modelId
      this.notifyListeners('modelChanged', { model: model })
      console.log('AIAgentEngine: Model successfully set to:', modelId)
      return true
    }
    console.warn('AIAgentEngine: Failed to set model. Model not found:', modelId)
    return false
  }

  getModel() {
    console.log('AIAgentEngine: Getting current model:', this.currentModel)
    return this.currentModel
  }

  getAvailableModels() {
    console.log('AIAgentEngine: Getting available models:', this.availableModels)
    return [...this.availableModels]
  }

  // 生成のキャンセル
  cancelGeneration() {
    console.log('AIAgentEngine: Attempting to cancel generation.')
    if (this.isGenerating) {
      this.isGenerating = false
      this.notifyListeners('generationCancelled', {})
      console.log('AIAgentEngine: Generation cancelled.')
    }
  }

  // 履歴管理
  getGenerationHistory() {
    console.log('AIAgentEngine: Getting generation history.')
    return [...this.generationHistory]
  }

  clearHistory() {
    console.log('AIAgentEngine: Clearing generation history.')
    this.generationHistory = []
    this.notifyListeners('historyCleared', {})
  }

  // 状態取得
  getStatus() {
    console.log('AIAgentEngine: Getting agent status.')
    return {
      isInitialized: this.isInitialized,
      isGenerating: this.isGenerating,
      currentModel: this.currentModel,
      historyCount: this.generationHistory.length
    }
  }

  // クリーンアップ
  destroy() {
    console.log('AIAgentEngine: Destroying AI Agent Engine instance.')
    this.cancelGeneration()
    this.listeners = []
    this.generationHistory = []
    this.contextCache.clear()
    this.isInitialized = false
  }

  // Agent mode用のプロジェクト操作コールバックを設定
  setProjectCallbacks(callbacks) {
    this.projectCallbacks = { ...this.projectCallbacks, ...callbacks }
    console.log('AIAgentEngine: Project callbacks set:', Object.keys(callbacks))
  }

  // Agent modeでの実行（実際のプロジェクト操作）
  async executeAgentAction(userPrompt, context = {}) {
    console.log('AIAgentEngine: executeAgentAction called with:', userPrompt, context)
    
    if (!this.isInitialized) {
      throw new Error('AI Agent Engine not initialized')
    }

    if (this.isGenerating) {
      throw new Error('Generation already in progress')
    }

    const apiKey = this.getApiKeyForModel()
    if (!apiKey) {
      throw new Error(`API Key is not set for current model (${this.currentModel})`)
    }

    this.isGenerating = true
    this.notifyListeners('generationStarted', { prompt: userPrompt, mode: 'agent' })

    try {
      // Agent mode用のプロンプトを生成
      const agentPrompt = this.generateAgentPrompt(userPrompt, context)
      
      // バックエンドにリクエスト
      const response = await fetch('/ai/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          prompt: agentPrompt,
          context: context,
          model: this.currentModel,
          apiKey: apiKey
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Agent action failed')
      }

      const result = await response.json()
      console.log('AIAgentEngine: Agent action result:', result)
      console.log('AIAgentEngine: Result actions:', result.actions)
      console.log('AIAgentEngine: Actions is array:', Array.isArray(result.actions))
      console.log('AIAgentEngine: Actions length:', result.actions?.length || 0)

      // 承認セッションを開始
      this.startApprovalSession()

      // 結果を解析して実際の操作を実行
      if (result.actions && Array.isArray(result.actions)) {
        console.log('AIAgentEngine: Executing actions:', result.actions)
        await this.executeActions(result.actions, context)
      } else {
        console.warn('AIAgentEngine: No actions found in result')
        console.warn('AIAgentEngine: Result type:', typeof result.actions)
        console.warn('AIAgentEngine: Result actions value:', result.actions)
      }

      // 自動承認が有効な場合、即座に承認
      if (this.autoApprove && this.hasPendingChanges()) {
        console.log('AIAgentEngine: Auto-approving changes')
        await this.approveAllChanges()
      }

      // 承認待ちの変更があるかチェック
      const hasPendingChanges = this.hasPendingChanges()
      console.log('AIAgentEngine: Has pending changes after execution:', hasPendingChanges)

      this.notifyListeners('generationCompleted', {
        prompt: userPrompt,
        result: {
          ...result,
          hasPendingChanges: hasPendingChanges
        },
        mode: 'agent'
      })

      // 正しい形式でレスポンスを返す
      return {
        actions: result.actions || [],
        summary: result.summary || '操作が完了しました',
        nextSteps: result.nextSteps || '次のステップを実行してください',
        success: result.success !== false,
        error: result.error || '',
        hasPendingChanges: hasPendingChanges
      }

    } catch (error) {
      console.error('AIAgentEngine: Agent action error:', error)
      this.notifyListeners('generationError', {
        error: error.message,
        prompt: userPrompt,
        mode: 'agent'
      })
      throw error
    } finally {
      this.isGenerating = false
    }
  }

  // Agent mode用のプロンプト生成
  generateAgentPrompt(userPrompt, context = {}) {
    console.log('generateAgentPrompt: Context received:', {
      existingTracks: context.existingTracks?.map(t => ({ id: t.id, name: t.name })),
      currentTrack: context.currentTrack ? { id: context.currentTrack.id, name: context.currentTrack.name } : null,
      projectInfo: context.projectInfo
    })
    
    // トラック情報を詳細に含める
    const tracksInfo = context.existingTracks?.map(track => 
      `- ID: "${track.id}", 名前: "${track.name}", タイプ: ${track.type}, ノート数: ${track.midiData?.notes?.length || 0}`
    ).join('\n') || 'なし';

    const currentTrackInfo = context.currentTrack ? 
      `ID: "${context.currentTrack.id}", 名前: "${context.currentTrack.name}", タイプ: ${context.currentTrack.type}, ノート数: ${context.currentTrack.midiData?.notes?.length || 0}` : 
      'なし';

    let prompt = `あなたは音楽制作アシスタントです。ユーザーの要求に応じて、実際のプロジェクト操作を実行してください。

[利用可能な操作]
1. トラック操作:
   - addTrack: 新しいトラックを追加
   - updateTrack: 既存トラックを更新
   - deleteTrack: トラックを削除

2. MIDI操作:
   - addMidiNotes: MIDIノートを追加
   - updateMidiNotes: MIDIノートを更新
   - deleteMidiNotes: MIDIノートを削除

3. プロジェクト設定:
   - updateProjectSettings: テンポ、キー、拍子記号などを更新

4. 再生制御:
   - playAudio: 再生開始
   - stopAudio: 再生停止
   - setCurrentTime: 再生位置を設定

[現在のプロジェクト情報]
- プロジェクト名: ${context.projectInfo?.name || 'Unknown'}
- テンポ: ${context.projectInfo?.tempo || 120} BPM
- キー: ${context.projectInfo?.key || 'C'}
- 拍子記号: ${context.projectInfo?.timeSignature || '4/4'}
- トラック数: ${context.existingTracks?.length || 0}

[利用可能なトラック]
${tracksInfo}

[現在のトラック]
${currentTrackInfo}

[重要な注意事項]
- トラックIDは必ず引用符で囲んでください（例: "track-1234567890-abc123"）
- 既存のトラックに操作する場合は、上記のトラックIDを正確に使用してください
- トラックIDは文字列として扱い、数値ではありません

[出力形式]
以下のJSON形式で出力してください：
{
  "actions": [
    {
      "type": "操作タイプ",
      "params": {
        "trackId": "正確なトラックID",
        // その他の操作に必要なパラメータ
        // MIDIノートの場合:
        "notes": [
          {
            "id": "note-123",
            "pitch": 60,        // MIDIノート番号（0-127）
            "time": 0,          // 開始時間（秒）
            "duration": 0.5,    // 持続時間（秒）
            "velocity": 0.8     // 音量（0-1）
          }
        ]
      },
      "description": "実行する操作の説明"
    }
  ],
  "summary": "実行した操作の要約",
  "nextSteps": "次のステップの提案"
}

ユーザーの要求: ${userPrompt}`

    return prompt
  }

  // アクションの実行
  async executeActions(actions, context) {
    console.log('AIAgentEngine: executeActions called with:', { actionsCount: actions.length, actions })
    
    for (const action of actions) {
      try {
        console.log('AIAgentEngine: About to execute action:', action)
        await this.executeSingleAction(action, context)
        console.log('AIAgentEngine: Action executed successfully:', action.type)
      } catch (error) {
        console.error(`AIAgentEngine: Failed to execute action ${action.type}:`, error)
        this.notifyListeners('actionError', {
          action: action,
          error: error.message
        })
      }
    }
    
    console.log('AIAgentEngine: All actions executed')
  }

  // 単一アクションの実行
  async executeSingleAction(action, context) {
    console.log('AIAgentEngine: Executing single action:', action)
    
    switch (action.type) {
      case 'addTrack':
        if (this.projectCallbacks.addTrack) {
          const newTrack = await this.projectCallbacks.addTrack(action.params)
          console.log('AIAgentEngine: Track added:', newTrack)
          
          // 承認待ち状態に追加
          if (newTrack && newTrack.id) {
            this.addPendingTrackChange(newTrack.id, null, newTrack, 'add')
            this.lastCreatedTrackId = newTrack.id
            console.log('AIAgentEngine: Last created track ID saved:', this.lastCreatedTrackId)
          }
        }
        break
        
      case 'updateTrack':
        if (this.projectCallbacks.updateTrack) {
          await this.projectCallbacks.updateTrack(action.params)
        }
        break
        
      case 'deleteTrack':
        if (this.projectCallbacks.deleteTrack) {
          await this.projectCallbacks.deleteTrack(action.params)
        }
        break
        
      case 'addMidiNotes':
        if (this.projectCallbacks.addMidiNotes) {
          // trackIdがプレースホルダーの場合、最後に作成されたトラックIDを使用
          if (action.params.trackId === 'new-piano-track' && this.lastCreatedTrackId) {
            action.params.trackId = this.lastCreatedTrackId
            console.log('AIAgentEngine: Using last created track ID for MIDI notes:', this.lastCreatedTrackId)
          }
          
          await this.projectCallbacks.addMidiNotes(action.params)
          // 注意: addMidiNotesコールバック内で既にaddPendingNoteChangeが呼び出されているため、
          // ここでは重複して呼び出さない
        }
        break
        
      case 'updateMidiNotes':
        if (this.projectCallbacks.updateMidiNotes) {
          await this.projectCallbacks.updateMidiNotes(action.params)
          // 注意: updateMidiNotesコールバック内で既にaddPendingNoteChangeが呼び出されているため、
          // ここでは重複して呼び出さない
        }
        break
        
      case 'deleteMidiNotes':
        if (this.projectCallbacks.deleteMidiNotes) {
          await this.projectCallbacks.deleteMidiNotes(action.params)
          // 注意: deleteMidiNotesコールバック内で既にaddPendingNoteChangeが呼び出されているため、
          // ここでは重複して呼び出さない
        }
        break
        
      case 'applyEffect':
        if (this.projectCallbacks.applyEffect) {
          await this.projectCallbacks.applyEffect(action.params)
        }
        break
        
      case 'updateProjectSettings':
        if (this.projectCallbacks.updateProjectSettings) {
          await this.projectCallbacks.updateProjectSettings(action.params)
        }
        break
        
      case 'useChordProgression':
        await this.executeUseChordProgressionAction(action.params, context)
        break
        
      case 'playAudio':
        if (this.projectCallbacks.playAudio) {
          await this.projectCallbacks.playAudio(action.params)
        }
        break
        
      case 'stopAudio':
        if (this.projectCallbacks.stopAudio) {
          await this.projectCallbacks.stopAudio(action.params)
        }
        break
        
      case 'setCurrentTime':
        if (this.projectCallbacks.setCurrentTime) {
          await this.projectCallbacks.setCurrentTime(action.params)
        }
        break
        
      default:
        console.warn('AIAgentEngine: Unknown action type:', action.type)
    }
    
    this.notifyListeners('actionExecuted', {
      action: action,
      success: true
    })
  }

  // コード進行アクションの実行
  async executeUseChordProgressionAction(params, context) {
    console.log('AIAgentEngine: Executing chord progression action:', params)
    
    try {
      const { progressionId, trackId } = params
      
      // RAGシステムからコード進行を取得
      const progression = this.ragSystem.chordProgressionLibrary.get(progressionId)
      if (!progression) {
        throw new Error(`Chord progression not found: ${progressionId}`)
      }
      
      // コード進行をMIDIノートに変換
      const notes = this.convertChordProgressionToNotes(progression, context)
      
      // MIDIノートを追加
      if (this.projectCallbacks.addMidiNotes) {
        await this.projectCallbacks.addMidiNotes({
          trackId: trackId,
          notes: notes
        })
      }
      
      console.log('AIAgentEngine: Chord progression applied successfully:', progressionId)
      
      // メモリシステムにアクションを保存
      if (this.useMemorySystem) {
        this.memoryManager.addToShortTermMemory({
          type: 'action',
          action: `useChordProgression: ${progressionId}`,
          result: `Applied ${progression.name} to track ${trackId}`,
          importance: 0.7
        })
      }
      
    } catch (error) {
      console.error('AIAgentEngine: Error executing chord progression action:', error)
      throw error
    }
  }

  // コード進行をMIDIノートに変換
  convertChordProgressionToNotes(progression, context) {
    const notes = []
    const tempo = context.projectInfo?.tempo || 120
    const beatDuration = 60 / tempo // 1拍の長さ（秒）
    const chordDuration = beatDuration * 4 // 1コード4拍
    
    progression.chords.forEach((chord, index) => {
      const startTime = index * chordDuration
      const chordNotes = this.getChordNotes(chord, context.projectInfo?.key || 'C')
      
      chordNotes.forEach(notePitch => {
        notes.push({
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          pitch: notePitch,
          time: startTime,
          duration: chordDuration,
          velocity: 0.8
        })
      })
    })
    
    return notes
  }

  // コード名からMIDIノート番号を取得
  getChordNotes(chordName, key = 'C') {
    const keyOffset = this.getKeyOffset(key)
    const chordPatterns = {
      'C': [0, 4, 7],      // C major
      'Cm': [0, 3, 7],     // C minor
      'C7': [0, 4, 7, 10], // C dominant 7th
      'Cmaj7': [0, 4, 7, 11], // C major 7th
      'Am': [9, 0, 4],     // A minor
      'F': [5, 9, 0],      // F major
      'G': [7, 11, 2],     // G major
      'G7': [7, 11, 2, 5], // G dominant 7th
      'Dm7': [2, 5, 9, 0], // D minor 7th
      'C5': [0, 7],        // C power chord
      'F5': [5, 0],        // F power chord
      'G5': [7, 2]         // G power chord
    }
    
    const pattern = chordPatterns[chordName]
    if (!pattern) {
      console.warn(`AIAgentEngine: Unknown chord pattern: ${chordName}`)
      return [60, 64, 67] // デフォルトはC major
    }
    
    return pattern.map(note => note + keyOffset + 60) // 60 = middle C
  }

  // キーからオフセットを取得
  getKeyOffset(key) {
    const keyOffsets = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
      'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    }
    return keyOffsets[key] || 0
  }

  // 承認待ち状態の管理メソッド
  
  // 新しい承認セッションを開始
  startApprovalSession() {
    this.pendingChanges.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.pendingChanges.tracks.clear()
    this.pendingChanges.notes.clear()
    console.log('AIAgentEngine: Started new approval session:', this.pendingChanges.sessionId)
    this.notifyListeners('approvalSessionStarted', { sessionId: this.pendingChanges.sessionId })
  }
  
  // トラック変更を承認待ちに追加
  addPendingTrackChange(trackId, originalTrack, newTrack, type) {
    // 拒否処理中は新しい承認待ち変更を追加しない
    if (this.isRejectingChanges) {
      console.log('AIAgentEngine: Rejection in progress, skipping pending track change:', { trackId, type })
      return
    }
    
    this.pendingChanges.tracks.set(trackId, {
      originalTrack,
      newTrack,
      type,
      timestamp: new Date().toISOString()
    })
    console.log('AIAgentEngine: Added pending track change:', { trackId, type })
    this.notifyListeners('pendingTrackChangeAdded', { trackId, type })
  }
  
  // ノート変更を承認待ちに追加
  addPendingNoteChange(noteId, originalNote, newNote, trackId, type) {
    // 拒否処理中は新しい承認待ち変更を追加しない
    if (this.isRejectingChanges) {
      console.log('AIAgentEngine: Rejection in progress, skipping pending note change:', { noteId, trackId, type })
      return
    }
    
    this.pendingChanges.notes.set(noteId, {
      originalNote,
      newNote,
      trackId,
      type,
      timestamp: new Date().toISOString()
    })
    
    console.log('AIAgentEngine: Added pending note change:', { noteId, trackId, type })
    console.log('AIAgentEngine: Current pending changes state:', {
      notesCount: this.pendingChanges.notes.size,
      tracksCount: this.pendingChanges.tracks.size,
      sessionId: this.pendingChanges.sessionId,
      hasChanges: this.hasPendingChanges()
    })
    
    this.notifyListeners('pendingNoteChangeAdded', { noteId, trackId, type })
    
    // MIDIエディタの状態を強制的に更新するためのグローバルイベントを発火
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('midiDataUpdated', {
        detail: {
          trackId: trackId,
          noteId: noteId,
          type: type
        }
      }))
      console.log('AIAgentEngine: Dispatched midiDataUpdated event for note:', noteId)
    }
  }
  
  // 承認待ちの変更があるかチェック
  hasPendingChanges() {
    return this.pendingChanges.tracks.size > 0 || this.pendingChanges.notes.size > 0
  }
  
  // 承認待ちの変更を取得
  getPendingChanges() {
    const result = {
      tracks: Array.from(this.pendingChanges.tracks.entries()),
      notes: Array.from(this.pendingChanges.notes.entries()),
      sessionId: this.pendingChanges.sessionId
    }
    
    return result
  }
  
  // すべての変更を承認
  async approveAllChanges() {
    console.log('AIAgentEngine: Approving all pending changes')
    
    try {
      // 承認待ち状態を保存（クリア前に）
      const sessionId = this.pendingChanges.sessionId
      const trackCount = this.pendingChanges.tracks.size
      const noteCount = this.pendingChanges.notes.size
      
      // 変更内容を保存（クリア前に）
      const tracksToApply = Array.from(this.pendingChanges.tracks.entries())
      const notesToApply = Array.from(this.pendingChanges.notes.entries())
      
      // 承認待ち状態を即座にクリア（UIの更新を防ぐため）
      this.clearPendingChanges()
      
      // 承認完了イベントを即座に発火
      this.notifyListeners('allChangesApproved', {
        sessionId: sessionId,
        trackCount: trackCount,
        noteCount: noteCount
      })
      
      // トラック変更を適用（緑色を元の色に戻す）
      for (const [trackId, change] of tracksToApply) {
        await this.applyTrackChange(trackId, change)
      }
      
      // ノート変更を適用（isPendingフラグをクリア）
      for (const [noteId, change] of notesToApply) {
        await this.applyNoteChange(noteId, change)
      }
      
      // MIDIエディタの強制更新をトリガー
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('midiDataApproved', {
          detail: {
            sessionId: sessionId,
            trackCount: trackCount,
            noteCount: noteCount
          }
        }))
        console.log('AIAgentEngine: Dispatched midiDataApproved event')
      }
      
      return { success: true, message: 'すべての変更が承認されました' }
    } catch (error) {
      console.error('AIAgentEngine: Error approving changes:', error)
      return { success: false, error: error.message }
    }
  }
  
  // すべての変更を拒否
  async rejectAllChanges() {
    console.log('AIAgentEngine: Rejecting all pending changes')
    
    try {
      // 承認待ち状態を保存（クリア前に）
      const sessionId = this.pendingChanges.sessionId
      const trackCount = this.pendingChanges.tracks.size
      const noteCount = this.pendingChanges.notes.size
      
      console.log('AIAgentEngine: Pending changes to reject:', {
        sessionId,
        trackCount,
        noteCount,
        tracks: Array.from(this.pendingChanges.tracks.entries()),
        notes: Array.from(this.pendingChanges.notes.entries())
      })
      
      // 変更内容を保存（クリア前に）
      const tracksToRevert = Array.from(this.pendingChanges.tracks.entries())
      const notesToRevert = Array.from(this.pendingChanges.notes.entries())
      
      // 拒否処理中フラグを設定（承認待ちシステムを一時的に無効化）
      this.isRejectingChanges = true
      console.log('AIAgentEngine: Rejection processing flag set to true')
      
      // 拒否完了イベントは処理完了後に発火するように変更
      
      // トラック変更を元に戻す
      console.log('AIAgentEngine: Reverting track changes...')
      for (const [trackId, change] of tracksToRevert) {
        console.log('AIAgentEngine: Reverting track:', trackId, change)
        try {
          await this.revertTrackChange(trackId, change)
          console.log('AIAgentEngine: Successfully reverted track:', trackId)
        } catch (error) {
          console.error('AIAgentEngine: Error reverting track:', trackId, error)
        }
      }
      
      // ノート変更を元に戻す
      console.log('AIAgentEngine: Reverting note changes...')
      for (const [noteId, change] of notesToRevert) {
        console.log('AIAgentEngine: Reverting note:', noteId, change)
        try {
          await this.revertNoteChange(noteId, change)
          console.log('AIAgentEngine: Successfully reverted note:', noteId)
        } catch (error) {
          console.error('AIAgentEngine: Error reverting note:', noteId, error)
        }
      }
      
      // 承認待ち状態をクリア（拒否処理完了後）
      this.clearPendingChanges()
      console.log('AIAgentEngine: Pending changes cleared after rejection')
      
      // MIDIエディタの強制更新をトリガー
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('midiDataRejected', {
          detail: {
            sessionId: sessionId,
            trackCount: trackCount,
            noteCount: noteCount
          }
        }))
        console.log('AIAgentEngine: Dispatched midiDataRejected event')
      }
      
      // 拒否処理中フラグをクリア
      this.isRejectingChanges = false
      console.log('AIAgentEngine: Rejection processing flag set to false')
      
      // 拒否完了イベントを発火（処理完了後）
      this.notifyListeners('allChangesRejected', {
        sessionId: sessionId,
        trackCount: trackCount,
        noteCount: noteCount
      })
      
      console.log('AIAgentEngine: All changes rejected successfully')
      console.log('AIAgentEngine: Final pending changes state:', {
        tracksCount: this.pendingChanges.tracks.size,
        notesCount: this.pendingChanges.notes.size,
        sessionId: this.pendingChanges.sessionId,
        isRejectingChanges: this.isRejectingChanges
      })
      return { success: true, message: 'すべての変更が拒否されました' }
    } catch (error) {
      // エラーが発生した場合も拒否処理中フラグをクリア
      this.isRejectingChanges = false
      console.error('AIAgentEngine: Error rejecting changes:', error)
      return { success: false, error: error.message }
    }
  }
  
  // トラック変更を元に戻す
  async revertTrackChange(trackId, change) {
    if (!this.projectCallbacks) return
    
    switch (change.type) {
      case 'add':
        // 追加されたトラックを削除
        if (this.projectCallbacks.deleteTrack) {
          await this.projectCallbacks.deleteTrack({ trackId })
        }
        break
      case 'update':
        // 元の状態に戻す
        if (this.projectCallbacks.updateTrack && change.originalTrack) {
          await this.projectCallbacks.updateTrack({
            trackId,
            updates: change.originalTrack
          })
        }
        break
      case 'delete':
        // 削除されたトラックを復元
        if (this.projectCallbacks.addTrack && change.originalTrack) {
          await this.projectCallbacks.addTrack(change.originalTrack)
        }
        break
    }
  }
  
  // ノート変更を元に戻す
  async revertNoteChange(noteId, change) {
    console.log('AIAgentEngine: revertNoteChange called with:', { noteId, change })
    
    if (!this.projectCallbacks) {
      console.error('AIAgentEngine: No project callbacks available')
      return
    }
    
    switch (change.type) {
      case 'add':
        // 追加されたノートを削除
        console.log('AIAgentEngine: Deleting added note:', noteId, 'from track:', change.trackId)
        if (this.projectCallbacks.rejectMidiNotes) {
          try {
            console.log('AIAgentEngine: Calling rejectMidiNotes with:', {
              trackId: change.trackId,
              noteIds: [noteId]
            })
            await this.projectCallbacks.rejectMidiNotes({
              trackId: change.trackId,
              noteIds: [noteId]
            })
            console.log('AIAgentEngine: Successfully deleted note:', noteId)
          } catch (error) {
            console.error('AIAgentEngine: Error deleting note:', noteId, error)
            throw error
          }
        } else {
          console.error('AIAgentEngine: rejectMidiNotes callback not available')
        }
        break
      case 'update':
        // 元の状態に戻す
        console.log('AIAgentEngine: Reverting updated note:', noteId, 'to original state')
        if (this.projectCallbacks.updateMidiNotes && change.originalNote) {
          try {
            await this.projectCallbacks.updateMidiNotes({
              trackId: change.trackId,
              notes: [change.originalNote]
            })
            console.log('AIAgentEngine: Successfully reverted note:', noteId)
          } catch (error) {
            console.error('AIAgentEngine: Error reverting note:', noteId, error)
            throw error
          }
        } else {
          console.error('AIAgentEngine: updateMidiNotes callback not available or no original note')
        }
        break
      case 'delete':
        // 削除されたノートを復元
        console.log('AIAgentEngine: Restoring deleted note:', noteId)
        if (this.projectCallbacks.addMidiNotes && change.originalNote) {
          try {
            await this.projectCallbacks.addMidiNotes({
              trackId: change.trackId,
              notes: [change.originalNote]
            })
            console.log('AIAgentEngine: Successfully restored note:', noteId)
          } catch (error) {
            console.error('AIAgentEngine: Error restoring note:', noteId, error)
            throw error
          }
        } else {
          console.error('AIAgentEngine: addMidiNotes callback not available or no original note')
        }
        break
      default:
        console.error('AIAgentEngine: Unknown change type:', change.type)
        break
    }
  }

  // 承認待ち状態をクリア
  clearPendingChanges() {
    this.pendingChanges.tracks.clear()
    this.pendingChanges.notes.clear()
    this.pendingChanges.sessionId = null
    this.approvalSessionActive = false
    this.approvalSessionId = null
    this.lastCreatedTrackId = null  // 最後に作成されたトラックIDもリセット
    this.isRejectingChanges = false  // 拒否処理中フラグもクリア
    console.log('AIAgentEngine: Pending changes cleared')
  }
  
  // トラック変更を適用
  async applyTrackChange(trackId, change) {
    if (!this.projectCallbacks) return
    
    switch (change.type) {
      case 'add':
        if (this.projectCallbacks.addTrack) {
          // 緑色を元の色に戻す
          const approvedTrack = { ...change.newTrack }
          delete approvedTrack.isPending
          if (approvedTrack.color === '#10B981') {
            approvedTrack.color = '#3B82F6' // デフォルトの青色に戻す
          }
          await this.projectCallbacks.addTrack(approvedTrack)
        }
        break
      case 'update':
        if (this.projectCallbacks.updateTrack) {
          // 緑色を元の色に戻す
          const approvedUpdates = { ...change.newTrack }
          delete approvedUpdates.isPending
          if (approvedUpdates.color === '#10B981') {
            approvedUpdates.color = change.originalTrack?.color || '#3B82F6'
          }
          await this.projectCallbacks.updateTrack({
            trackId,
            updates: approvedUpdates
          })
        }
        break
      case 'delete':
        if (this.projectCallbacks.deleteTrack) {
          await this.projectCallbacks.deleteTrack({ trackId })
        }
        break
    }
    
    // UIの再描画を促す
    this.notifyListeners('projectStateChanged', { trackId, changeType: change.type })
  }
  
  // ノート変更を適用
  async applyNoteChange(noteId, change) {
    if (!this.projectCallbacks) return
    
    switch (change.type) {
      case 'add':
        // 追加されたノートのisPendingフラグをクリア
        if (this.projectCallbacks.approveMidiNotes) {
          const approvedNote = { ...change.newNote }
          delete approvedNote.isPending
          await this.projectCallbacks.approveMidiNotes({
            trackId: change.trackId,
            notes: [approvedNote]
          })
        }
        break
      case 'update':
        if (this.projectCallbacks.approveMidiNotes) {
          // 更新されたノートのisPendingフラグをクリア
          const approvedNote = { ...change.newNote }
          delete approvedNote.isPending
          await this.projectCallbacks.approveMidiNotes({
            trackId: change.trackId,
            notes: [approvedNote]
          })
        }
        break
      case 'delete':
        if (this.projectCallbacks.deleteMidiNotes) {
          await this.projectCallbacks.deleteMidiNotes({
            trackId: change.trackId,
            noteIds: [noteId]
          })
        }
        break
    }
    
    // UIの再描画を促す
    this.notifyListeners('projectStateChanged', { noteId, trackId: change.trackId, changeType: change.type })
  }
}

// シングルトンインスタンス
const aiAgentEngine = new AIAgentEngine()

// Expose to window for debugging (initialization handled in App.jsx)
if (typeof window !== 'undefined') {
  window.aiAgentEngine = aiAgentEngine
  console.log('AIAgentEngine: Exposed to window (initialization will be handled by App.jsx)')
}

export default aiAgentEngine