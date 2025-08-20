// Magenta Ghost Text Engine - Google Magenta統合版
import * as tf from '@tensorflow/tfjs'

class MagentaGhostTextEngine {
  constructor() {
    this.isInitialized = false
    this.isActive = false
    this.model = null
    this.modelType = 'phi2' // デフォルトをPhi-2に変更
    this.predictionCache = new Map()
    this.listeners = []
    this.currentSequence = []
    this.maxSequenceLength = 32
    this.predictionThreshold = 0.6
    this.debounceTimeout = null
    this.debounceDelay = 100 // ms
    this.lastPrediction = null
    this.contextWindow = 16
    
    // 予測設定
    this.predictionCount = 5 // 予測するノートの個数（デフォルト5個）
    this.displayCount = 1 // 表示するノートの個数（デフォルト1個）
    this.generateSequentialPredictions = true // 連続予測を有効にする
    this.restProbability = 0.15 // 休符の確率（デフォルト15%）
    this.restDetectionThreshold = 0.1 // 休符検出閾値（デフォルト0.1秒）
    
    // Magentaモデル設定（動的に設定）
    this.magentaConfig = {}
    this.mm = null // Magentaライブラリの参照
    this.quantizeFunction = null // 量子化関数の参照
    
    // パフォーマンス監視
    this.performanceMetrics = {
      predictionTime: [],
      cacheHitRate: 0,
      totalPredictions: 0,
      cacheHits: 0,
      modelLoadTime: 0
    }
  }

  // Magentaライブラリのインポート
  async importMagenta() {
    try {
      const mm = await import('@magenta/music')
      
      // 様々な方法でquantizeNoteSequenceを検索
      const possiblePaths = [
        'quantizeNoteSequence',
        'sequences_lib.quantizeNoteSequence',
        'core.quantizeNoteSequence',
        'sequences.quantizeNoteSequence'
      ]
      
      for (const path of possiblePaths) {
        try {
          const pathParts = path.split('.')
          let func = mm
          for (const part of pathParts) {
            func = func[part]
            if (!func) break
          }
          if (func && typeof func === 'function') {
            this.quantizeFunction = func
            break
          }
        } catch (e) {
          // パスが存在しない場合は次を試す
        }
      }
      
      if (!this.quantizeFunction) {
        // 利用可能な関数を探索
        const searchForQuantize = (obj, prefix = '') => {
          for (const key in obj) {
            if (typeof obj[key] === 'function' && key.toLowerCase().includes('quantiz')) {
              this.quantizeFunction = obj[key]
              break
            } else if (typeof obj[key] === 'object' && obj[key] !== null && prefix.split('.').length < 3) {
              searchForQuantize(obj[key], `${prefix}${key}.`)
            }
          }
        }
        searchForQuantize(mm)
      }
      
      this.mm = mm
      return true
    } catch (error) {
      this.mm = null
      return false
    }
  }

  // Magenta設定の初期化
  initializeMagentaConfig() {
    // Phi-2モデルの場合は、this.mmが未定義でも設定を初期化
    if (this.modelType === 'phi2') {
      try {
        this.magentaConfig = {
          // Phi-2 - 高速予測（バックエンドAPI使用）
          phi2: {
            url: 'http://localhost:8001/predict',
            name: 'Phi-2 (高速)',
            description: 'Phi-2モデルによる高速予測',
            modelClass: null, // バックエンドAPIを使用するためnull
            isBackendModel: true
          }
        }
        
        console.log('🔮 Phi-2: Magenta config initialized for Phi-2 model')
        return true
      } catch (error) {
        console.error('🔮 Phi-2: Error initializing Magenta config for Phi-2:', error)
        return false
      }
    }
    
    // その他のモデルの場合は、this.mmが必要
    if (!this.mm) {
      return false
    }

    try {
      this.magentaConfig = {
        // Music RNN - 基本的な音楽予測
        musicRnn: {
          url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn',
          name: 'Music RNN',
          description: '基本的な音楽予測',
          modelClass: this.mm.MusicRNN
        },
        // Music VAE - 変分オートエンコーダー
        musicVae: {
          url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2',
          name: 'Music VAE',
          description: '変分オートエンコーダーによる音楽生成',
          modelClass: this.mm.MusicVAE
        },
        // Melody RNN - メロディ予測（利用可能な場合）
        melodyRnn: {
          url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn',
          name: 'Melody RNN',
          description: 'メロディライン予測',
          modelClass: this.mm.MusicRNN // MusicRNNを使用
        },
        // Phi-2 - 高速予測（バックエンドAPI使用）
        phi2: {
          url: 'http://localhost:8001/predict',
          name: 'Phi-2 (高速)',
          description: 'Phi-2モデルによる高速予測',
          modelClass: null, // バックエンドAPIを使用するためnull
          isBackendModel: true
        }
      }
      
      // モデルクラスが利用可能かチェック（Phi-2は除外）
      for (const [key, config] of Object.entries(this.magentaConfig)) {
        if (!config.isBackendModel && typeof config.modelClass !== 'function') {
          delete this.magentaConfig[key]
        }
      }
      
      return Object.keys(this.magentaConfig).length > 0
    } catch (error) {
      return false
    }
  }

  // 初期化
  async initialize() {
    console.log('🎵 GhostText: Initializing with modelType =', this.modelType)
    
    try {
      // TensorFlow.jsの初期化
      try {
        await tf.ready()
      } catch (tfError) {
        // TensorFlow.jsの初期化に失敗しても、フォールバック予測は動作する
        this.isInitialized = true
        this.notifyListeners('initialized', { 
          success: true, 
          modelType: 'fallback',
          loadTime: 0,
          warning: 'Using fallback prediction mode due to TensorFlow.js initialization failure'
        })
        return true
      }
      
      // Phi-2モデルの場合はバックエンドの可用性をチェック
      if (this.modelType === 'phi2') {
        console.log('🔮 Phi-2: Checking backend availability...')
        try {
          const response = await fetch('http://localhost:8001/health', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          })
          
          if (response.ok) {
            console.log('🔮 Phi-2: Backend is available, using backend API')
            
            // Magentaモデル設定の初期化（Phi-2の設定を含む）
            const magentaConfigSuccess = this.initializeMagentaConfig()
            if (!magentaConfigSuccess) {
              throw new Error('Failed to initialize Magenta configuration')
            }
            
            // Phi-2モデルの場合は、loadMagentaModelを呼び出してから初期化を完了
            const success = await this.loadMagentaModel('phi2')
            if (success) {
              this.isInitialized = true
              this.notifyListeners('initialized', { 
                success: true, 
                modelType: 'phi2',
                loadTime: this.performanceMetrics.modelLoadTime
              })
              return true
            } else {
              throw new Error('Failed to load Phi-2 model')
            }
          } else {
            throw new Error(`Backend health check failed: ${response.status}`)
          }
        } catch (error) {
          console.warn('🔮 Phi-2: Backend unavailable, switching to fallback mode:', error.message)
          this.modelType = 'fallback'
          this.isInitialized = true
          this.notifyListeners('initialized', { 
            success: true, 
            modelType: 'fallback',
            loadTime: 0,
            warning: 'Phi-2 backend unavailable, using fallback prediction mode'
          })
          return true
        }
      }
      
      // Magentaライブラリのインポート
      const magentaImportSuccess = await this.importMagenta()
      if (!magentaImportSuccess) {
        console.warn('Magenta library import failed, using fallback mode')
        this.isInitialized = true
        this.modelType = 'fallback'
        this.notifyListeners('initialized', { 
          success: true, 
          modelType: 'fallback',
          loadTime: 0,
          warning: 'Using fallback prediction mode due to Magenta library import failure'
        })
        return true
      }
      
      // Magentaモデル設定の初期化
      const magentaConfigSuccess = this.initializeMagentaConfig()
      if (!magentaConfigSuccess) {
        console.warn('Magenta model configuration failed, using fallback mode')
        this.isInitialized = true
        this.modelType = 'fallback'
        this.notifyListeners('initialized', { 
          success: true, 
          modelType: 'fallback',
          loadTime: 0,
          warning: 'Using fallback prediction mode due to model configuration failure'
        })
        return true
      }
      
      // モデルタイプに応じてモデルをロード
      const modelToLoad = this.modelType === 'phi2' ? 'phi2' : 'musicRnn'
      const success = await this.loadMagentaModel(modelToLoad)
      
      if (success) {
        this.isInitialized = true
        this.notifyListeners('initialized', { 
          success: true, 
          modelType: this.modelType,
          loadTime: this.performanceMetrics.modelLoadTime
        })
        return true
      } else {
        // モデルロードに失敗した場合、フォールバックモードで初期化
        this.isInitialized = true
        this.modelType = 'fallback'
        this.notifyListeners('initialized', { 
          success: true, 
          modelType: 'fallback',
          loadTime: 0,
          warning: 'Using fallback prediction mode due to model loading failure'
        })
        return true
      }
    } catch (error) {
      // エラーが発生しても、フォールバックモードで初期化
      this.isInitialized = true
      this.modelType = 'fallback'
      this.notifyListeners('initialized', { 
        success: true, 
        modelType: 'fallback',
        loadTime: 0,
        warning: 'Using fallback prediction mode due to initialization error'
      })
      return true
    }
  }

  // Magentaモデルのロード
  async loadMagentaModel(modelKey = 'musicRnn') {
    console.log('🎵 GhostText: Loading model:', modelKey, 'current modelType:', this.modelType)
    
    try {
      // フォールバックモデルの場合は特別処理
      if (modelKey === 'fallback') {
        this.modelType = 'fallback'
        this.model = null
        this.performanceMetrics.modelLoadTime = 0
        
        this.notifyListeners('status', {
          isInitialized: true,
          isActive: this.isActive,
          modelType: this.modelType,
          modelName: 'Fallback Prediction'
        })
        
        return true
      }
      
      const startTime = performance.now()
      const config = this.magentaConfig[modelKey]
      
      if (!config) {
        throw new Error(`Unknown model: ${modelKey}`)
      }
      
      // 既存のモデルをクリーンアップ
      if (this.model) {
        try {
          this.model.dispose()
        } catch (disposeError) {
          // エラーは無視
        }
        this.model = null
      }
      
      // Phi-2モデルの場合は特別処理
      if (modelKey === 'phi2') {
        console.log('🔮 Phi-2: Setting up backend model')
        try {
          this.modelType = 'phi2'
          this.model = { isBackendModel: true, config: config }
          this.performanceMetrics.modelLoadTime = performance.now() - startTime
          
          console.log('🔮 Phi-2: Model setup completed successfully')
          console.log('🔮 Phi-2: this.model =', this.model)
          console.log('🔮 Phi-2: this.modelType =', this.modelType)
          
          this.notifyListeners('status', {
            isInitialized: true,
            isActive: this.isActive,
            modelType: this.modelType,
            modelName: config.name
          })
          
          console.log('🔮 Phi-2: Returning true from loadMagentaModel')
          return true
        } catch (phi2Error) {
          console.error('🔮 Phi-2: Error in Phi-2 model setup:', phi2Error)
          throw phi2Error
        }
      }
      
      // 新しいモデルを作成
      this.model = new config.modelClass(config.url)
      
      // モデルをロード
      await this.model.initialize()
      
      this.modelType = modelKey
      this.performanceMetrics.modelLoadTime = performance.now() - startTime
      
      this.notifyListeners('status', {
        isInitialized: true,
        isActive: this.isActive,
        modelType: this.modelType,
        modelName: config.name
      })
      
      return true
    } catch (error) {
      // エラーが発生した場合、フォールバックモードに切り替え
      console.error('🎵 GhostText: Error in loadMagentaModel:', error)
      console.error('🎵 GhostText: Error stack:', error.stack)
      console.error('🎵 GhostText: modelKey was:', modelKey)
      console.error('🎵 GhostText: this.modelType before error:', this.modelType)
      
      this.modelType = 'fallback'
      this.model = null
      
      console.log('🎵 GhostText: Switched to fallback mode due to error')
      
      this.notifyListeners('status', {
        isInitialized: true,
        isActive: this.isActive,
        modelType: 'fallback',
        modelName: 'Fallback Prediction'
      })
      
      return false
    }
  }

  // MIDI入力の処理
  processMidiInput(note) {
    if (!this.isInitialized || !this.isActive) {
      return
    }

    // シーケンスに追加
    this.currentSequence.push({
      pitch: note.pitch,
      velocity: note.velocity,
      timestamp: Date.now(),
      duration: note.duration || 0.25,
      time: note.time || 0
    })

    // シーケンス長の制限
    if (this.currentSequence.length > this.maxSequenceLength) {
      this.currentSequence.shift()
    }

    // デバウンス処理で予測を実行
    this.debouncedPredict()
  }

  // デバウンス処理
  debouncedPredict() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }
    
    // 重い処理を非同期で実行し、setTimeout違反を回避
    this.debounceTimeout = setTimeout(() => {
      // requestIdleCallbackを使用してブラウザのアイドル時間に実行
      if (window.requestIdleCallback) {
        requestIdleCallback(() => {
          this.generatePrediction()
        }, { timeout: 100 })
      } else {
        // フォールバック: より短いタイムアウトで実行
        setTimeout(() => {
          this.generatePrediction()
        }, 0)
      }
    }, this.debounceDelay)
  }

  // 予測生成
  async generatePrediction() {
    if (this.currentSequence.length === 0) {
      return
    }

    console.log('🎵 GhostText: Generating prediction with modelType =', this.modelType)
    console.log('🎵 GhostText: this.model =', this.model)
    console.log('🎵 GhostText: this.modelType =', this.modelType)

    const startTime = performance.now()

    try {
      // キャッシュチェック（デバッグ中は無効化）
      const cacheKey = this.generateCacheKey(this.currentSequence)
      
      // デバッグ中はキャッシュを無効化
      const useCache = false // デバッグ中はfalseに設定
      
      if (useCache && this.predictionCache.has(cacheKey)) {
        const cachedPrediction = this.predictionCache.get(cacheKey)
        this.handlePredictionResult(cachedPrediction, startTime, true)
        return
      }

      // コンテキストウィンドウの適用
      const contextSequence = this.currentSequence.slice(-this.contextWindow)
      
      let prediction = []
      
      // モデルタイプに応じて予測を実行
      if (this.model && this.modelType !== 'fallback') {
        console.log('🎵 GhostText: Using model prediction, calling predictWithMagenta')
        // Magentaモデルで予測（非同期で実行）
        prediction = await this.predictWithMagenta(contextSequence)
      } else {
        console.log('🎵 GhostText: Using fallback prediction')
        // フォールバック予測
        prediction = this.fallbackPrediction(contextSequence)
      }
      
      // キャッシュに保存
      this.predictionCache.set(cacheKey, prediction)
      
      // キャッシュサイズの制限
      if (this.predictionCache.size > 1000) {
        const firstKey = this.predictionCache.keys().next().value
        this.predictionCache.delete(firstKey)
      }
      
      this.handlePredictionResult(prediction, startTime, false)
      
    } catch (error) {
      // エラーが発生した場合、フォールバック予測を使用
      const fallbackPrediction = this.fallbackPrediction(this.currentSequence.slice(-this.contextWindow))
      this.handlePredictionResult(fallbackPrediction, startTime, false)
    }
  }

  // Magentaモデルを使用した予測
  async predictWithMagenta(sequence) {
    if (!this.model) {
      return []
    }
    
    if (sequence.length === 0) {
      return []
    }
    
    // Phi-2モデルの場合はバックエンドAPIを使用
    if (this.modelType === 'phi2' && this.model.isBackendModel) {
      console.log('🎵 GhostText: Phi-2 model detected, calling predictWithPhi2')
      return await this.predictWithPhi2(sequence)
    }
    
    // モデルの初期化状態をチェック
    if (!this.model.isInitialized) {
      // モデルの初期化を待つ
      await new Promise(resolve => setTimeout(resolve, 1000))
      if (!this.model.isInitialized) {
        return this.fallbackPrediction(sequence)
      }
    }

    try {
      // シーケンスをMagenta形式に変換
      const magentaSequence = this.convertToMagentaSequence(sequence)
      
      let predictions = null
      
      try {
        // MusicRNNの正しいメソッドを使用
        if (this.modelType === 'musicRnn' || this.modelType === 'melodyRnn') {
          // 利用可能なメソッドを確認
          const availableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.model))
          
          // 予測に使用できるメソッドを探す
          let predictionMethod = null
          let methodParams = null
          
          // 優先順位1: continueSequence
          if (typeof this.model.continueSequence === 'function') {
            predictionMethod = 'continueSequence'
            methodParams = [magentaSequence, 3, 0.5]
          }
          // 優先順位2: predict
          else if (typeof this.model.predict === 'function') {
            predictionMethod = 'predict'
            methodParams = [magentaSequence, 3, 0.5]
          }
          // 優先順位3: generate
          else if (typeof this.model.generate === 'function') {
            predictionMethod = 'generate'
            methodParams = [magentaSequence, 3, 0.5]
          }
          // 優先順位4: その他の可能性のあるメソッド
          else {
            for (const methodName of availableMethods) {
              if (methodName.toLowerCase().includes('predict') || 
                  methodName.toLowerCase().includes('continue') ||
                  methodName.toLowerCase().includes('generate') ||
                  methodName.toLowerCase().includes('sample')) {
                if (typeof this.model[methodName] === 'function') {
                  predictionMethod = methodName
                  methodParams = [magentaSequence, 3, 0.5]
                  break
                }
              }
            }
          }
          
          if (predictionMethod) {
            predictions = await this.model[predictionMethod](...methodParams)
          } else {
            throw new Error('No suitable prediction method found')
          }
        } else if (this.modelType === 'musicVae') {
          // MusicVAEの場合はサンプリングを使用
          predictions = await this.model.interpolate([magentaSequence], 3)
        } else {
          // フォールバック
          throw new Error(`Unknown model type: ${this.modelType}`)
        }
      } catch (methodError) {
        // 代替メソッドを試行
        try {
          if (this.modelType === 'musicRnn' || this.modelType === 'melodyRnn') {
            // 別のアプローチを試す
            if (typeof this.model.continueSequence === 'function') {
              predictions = await this.model.continueSequence(magentaSequence, 1, 0.5)
            } else if (typeof this.model.predict === 'function') {
              predictions = await this.model.predict(magentaSequence, 1, 0.5)
            }
          }
        } catch (altError) {
          throw altError
        }
      }
      
      // 予測結果をMIDI形式に変換
      const midiPredictions = this.convertFromMagentaPredictions(predictions, sequence)
      
      return midiPredictions
      
    } catch (error) {
      // フォールバック: 簡単な統計的予測
      const fallbackPredictions = this.fallbackPrediction(sequence)
      return fallbackPredictions
    }
  }

  // Phi-2モデルを使用した予測
  async predictWithPhi2(sequence) {
    try {
      console.log('🔮 Phi-2: predictWithPhi2 called with', sequence.length, 'notes')
      console.log('🔮 Phi-2: Sending prediction request with', sequence.length, 'notes')
      
      const requestData = {
        track_summary: "This is a melody track in C major at 120 BPM.",
        current_notes: sequence.map(note => ({
          pitch: parseInt(note.pitch),
          start: parseFloat(note.time),
          duration: parseFloat(note.duration),
          velocity: parseFloat(note.velocity || 0.8)
        })),
        cursor_position: sequence.length > 0 ? parseFloat(sequence[sequence.length - 1].time + sequence[sequence.length - 1].duration) : 0.0,
        track_type: "melody"
      }
      
      console.log('🔮 Phi-2: Request data:', JSON.stringify(requestData, null, 2))
      
      const response = await fetch('http://localhost:8001/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔮 Phi-2: Received prediction response:', data)
      console.log('🔮 Phi-2: Response structure:', {
        predicted_notes: data.predicted_notes?.length || 0,
        confidence_scores: data.confidence_scores?.length || 0,
        metadata: data.prediction_metadata,
        source: data.source
      })
      
      // 複数予測に対応
      if (data.predicted_notes && data.predicted_notes.length > 0) {
        // 最初の予測を使用（後でUIで選択できるように拡張予定）
        const firstPrediction = data.predicted_notes[0]
        console.log('🔮 Phi-2: Using first prediction:', firstPrediction)
        
        return [{
          pitch: firstPrediction.pitch,
          velocity: firstPrediction.velocity || 100,
          duration: firstPrediction.duration || 0.25,
          time: firstPrediction.start || 0
        }]
      }
      
      // 後方互換性のため、単一予測形式もサポート
      if (data.predicted_next_note) {
        console.log('🔮 Phi-2: Using legacy single prediction format')
        return [{
          pitch: data.predicted_next_note.pitch,
          velocity: data.predicted_next_note.velocity || 100,
          duration: data.predicted_next_note.duration || 0.25,
          time: data.predicted_next_note.start || 0
        }]
      }
      
      return []
    } catch (error) {
      console.error('🔮 Phi-2: Prediction error:', error)
      console.warn('🔮 Phi-2: Backend unavailable, disabling predictions for Phi-2 model')
      // Phi-2モデルの場合はバックエンドが利用できない場合、予測を無効にする
      return []
    }
  }

  // 手動で量子化されたシーケンスを作成
  createQuantizedSequence(sequence, stepsPerQuarter = 4) {
    try {
      // 量子化されたコピーを作成
      const quantizedSequence = JSON.parse(JSON.stringify(sequence))
      
      // 量子化情報を追加
      quantizedSequence.quantizationInfo = {
        stepsPerQuarter: stepsPerQuarter
      }
      
      // ノートのタイミングを量子化
      if (quantizedSequence.notes) {
        const stepSize = 1.0 / stepsPerQuarter // 1拍あたりのステップサイズ
        
        quantizedSequence.notes = quantizedSequence.notes.map(note => {
          const quantizedStartTime = Math.round(note.startTime / stepSize) * stepSize
          const quantizedEndTime = Math.round(note.endTime / stepSize) * stepSize
          
          return {
            ...note,
            startTime: quantizedStartTime,
            endTime: Math.max(quantizedEndTime, quantizedStartTime + stepSize) // 最小デュレーションを保証
          }
        })
        
        // 総時間も量子化
        const maxEndTime = Math.max(...quantizedSequence.notes.map(n => n.endTime))
        quantizedSequence.totalTime = Math.ceil(maxEndTime / stepSize) * stepSize
      }
      
      return quantizedSequence
    } catch (error) {
      return sequence
    }
  }

  // シーケンスをMagenta形式に変換
  convertToMagentaSequence(sequence) {
    if (sequence.length === 0) {
      // 空のNoteSequenceを作成
      if (this.mm && this.mm.NoteSequence) {
        const emptySequence = new this.mm.NoteSequence()
        emptySequence.tempos.push({ time: 0, qpm: 120 })
        return emptySequence
      }
      return {
        notes: [],
        totalTime: 1,
        tempos: [{ time: 0, qpm: 120 }]
      }
    }
    
    // 時間を正規化（0から開始）
    const minTime = Math.min(...sequence.map(n => n.time))
    const normalizedSequence = sequence.map(note => ({
      ...note,
      time: note.time - minTime
    }))
    
    // MagentaのNoteSequenceオブジェクトを作成
    let magentaSequence
    if (this.mm && this.mm.NoteSequence) {
      magentaSequence = new this.mm.NoteSequence()
      
      // ノートを追加（ピッチ範囲を検証）
      normalizedSequence.forEach((note, index) => {
        // ピアノトラックの有効なピッチ範囲：12-96 (C1-C7) - 実際の範囲に調整
        let validPitch = note.pitch
        
        // ピッチが範囲外の場合、最も近い有効なピッチに調整
        if (validPitch < 12) {
          validPitch = 12 + (validPitch % 12) // オクターブを上げて調整
        } else if (validPitch > 96) {
          validPitch = 96 - (12 - (validPitch % 12)) // オクターブを下げて調整
          if (validPitch < 12) validPitch = 12 + (validPitch % 12)
        }
        
        const magentaNote = {
          pitch: validPitch,
          velocity: Math.round(note.velocity * 127),
          startTime: note.time,
          endTime: note.time + note.duration,
          instrument: 0
        }
        magentaSequence.notes.push(magentaNote)
      })
      
      // テンポを設定
      magentaSequence.tempos.push({ time: 0, qpm: 120 })
      
      // 総時間を設定
      const totalTime = Math.max(...magentaSequence.notes.map(n => n.endTime)) + 1
      magentaSequence.totalTime = totalTime
      
    } else {
      // フォールバック: 通常のオブジェクト（ピッチ範囲を検証）
      const notes = normalizedSequence.map((note, index) => {
        // ピアノトラックの有効なピッチ範囲：12-96 (C1-C7) - 実際の範囲に調整
        let validPitch = note.pitch
        
        if (validPitch < 12) {
          validPitch = 12 + (validPitch % 12)
        } else if (validPitch > 96) {
          validPitch = 96 - (12 - (validPitch % 12))
          if (validPitch < 12) validPitch = 12 + (validPitch % 12)
        }
        
        return {
          pitch: validPitch,
          velocity: Math.round(note.velocity * 127),
          startTime: note.time,
          endTime: note.time + note.duration,
          instrument: 0
        }
      })
      
      const totalTime = Math.max(...notes.map(n => n.endTime)) + 1
      
      magentaSequence = {
        notes: notes,
        totalTime: totalTime,
        tempos: [{ time: 0, qpm: 120 }]
      }
      
    }
    
    // シーケンスを量子化（Magentaの要件）
    try {
      let quantizedSequence = null
      
      // 方法1: this.quantizeFunctionを使用
      if (this.quantizeFunction) {
        try {
          quantizedSequence = this.quantizeFunction(magentaSequence, 4)
        } catch (qError) {
          // エラーは無視
        }
      }
      
      // 方法2: mm.quantizeNoteSequenceを使用
      if (!quantizedSequence && this.mm && this.mm.quantizeNoteSequence) {
        try {
          quantizedSequence = this.mm.quantizeNoteSequence(magentaSequence, 4)
        } catch (qError) {
          // エラーは無視
        }
      }
      
      // 方法3: 手動で量子化されたシーケンスを作成
      if (!quantizedSequence) {
        quantizedSequence = this.createQuantizedSequence(magentaSequence, 4)
      }
      
      if (quantizedSequence) {
        return quantizedSequence
      } else {
        return magentaSequence
      }
    } catch (quantizeError) {
      return magentaSequence
    }
  }

  // Magenta予測結果をMIDI形式に変換（休符対応版）
  convertFromMagentaPredictions(predictions, originalSequence) {
    if (!predictions) {
      return this.fallbackPrediction(originalSequence)
    }

    const lastNote = originalSequence[originalSequence.length - 1]
    const nextTime = lastNote.time + lastNote.duration
    
    // MusicRNNの場合は単一のシーケンスが返される
    if (this.modelType === 'musicRnn' || this.modelType === 'melodyRnn') {
      const predictedSequence = predictions
      const newNotes = predictedSequence.notes || []
      
      // 元のシーケンスの最後のノート以降の新しいノートを抽出
      const futureNotes = newNotes.filter(note => 
        note.startTime >= nextTime
      ).slice(0, this.predictionCount * 2) // より多くのノートを取得（休符検出のため）
      
      if (futureNotes.length === 0) {
        return this.fallbackPrediction(originalSequence)
      }
      
      // ノートと休符を組み合わせた予測を生成
      const predictions = []
      let currentTime = nextTime
      let noteIndex = 0
      
      for (let i = 0; i < this.predictionCount && noteIndex < futureNotes.length; i++) {
        const nextNote = futureNotes[noteIndex]
        
        // 現在時刻と次のノートの開始時刻の間にギャップがある場合、休符として扱う
        if (nextNote.startTime > currentTime + this.restDetectionThreshold) { // 設定された閾値以上のギャップを休符とする
          const restDuration = nextNote.startTime - currentTime
          predictions.push({
            pitch: null, // 休符はnull
            velocity: 0, // 休符はベロシティ0
            duration: restDuration,
            confidence: 0.8 - (i * 0.1),
            timing: currentTime - nextTime,
            source: 'magenta',
            sequenceIndex: i,
            isRest: true // 休符フラグ
          })
          currentTime = nextNote.startTime
        }
        
        // ノートを追加
        predictions.push({
          pitch: nextNote.pitch,
          velocity: (nextNote.velocity || 80) / 127,
          duration: Math.max(0.25, nextNote.endTime - nextNote.startTime),
          confidence: 0.9 - (i * 0.1),
          timing: nextNote.startTime - nextTime,
          source: 'magenta',
          sequenceIndex: i,
          isRest: false
        })
        
        currentTime = nextNote.endTime
        noteIndex++
      }
      
      // 予測個数に達していない場合、残りの時間を休符で埋める
      while (predictions.length < this.predictionCount) {
        const restDuration = 0.25 + Math.random() * 0.25 // 0.25-0.5秒の休符
        predictions.push({
          pitch: null,
          velocity: 0,
          duration: restDuration,
          confidence: 0.7 - (predictions.length * 0.1),
          timing: currentTime - nextTime,
          source: 'magenta',
          sequenceIndex: predictions.length,
          isRest: true
        })
        currentTime += restDuration
      }
      
      return predictions
        .slice(0, this.predictionCount) // 指定された個数に制限
        .filter(pred => !pred.isRest || pred.pitch === null) // 休符または有効なノートのみ
      
    } else if (this.modelType === 'musicVae') {
      // MusicVAEの場合は複数のシーケンスが返される
      const resultPredictions = []
      
      for (let i = 0; i < this.predictionCount; i++) {
        const prediction = predictions[i]
        const predictedNote = prediction?.notes && prediction.notes.length > 0 
          ? prediction.notes[0] 
          : null
        
        if (predictedNote) {
          resultPredictions.push({
            pitch: predictedNote.pitch,
            velocity: (predictedNote.velocity || 80) / 127,
            duration: Math.max(0.25, predictedNote.endTime - predictedNote.startTime),
            confidence: 0.9 - (i * 0.1),
            timing: i * 0.25,
            source: 'magenta',
            sequenceIndex: i,
            isRest: false
          })
        } else {
          // ノートがない場合は休符として扱う
          resultPredictions.push({
            pitch: null,
            velocity: 0,
            duration: 0.25 + Math.random() * 0.25,
            confidence: 0.7 - (i * 0.1),
            timing: i * 0.25,
            source: 'magenta',
            sequenceIndex: i,
            isRest: true
          })
        }
      }
      
      return resultPredictions.filter(pred => !pred.isRest || pred.pitch === null)
    }
    
    // フォールバック
    return this.fallbackPrediction(originalSequence)
  }

  // フォールバック予測（統計的）
  fallbackPrediction(sequence) {
    if (sequence.length === 0) {
      return []
    }

    const predictions = []
    let currentSequence = [...sequence]

    // 設定された個数分の予測を生成
    for (let i = 0; i < this.predictionCount; i++) {
      const lastNote = currentSequence[currentSequence.length - 1]
      
      // 休符の確率を計算（音楽的な自然さのため）
      const isRest = Math.random() < this.restProbability
      
      if (isRest) {
        // 休符の予測
        const prediction = {
          pitch: null, // 休符はnull
          velocity: 0, // 休符はベロシティ0
          duration: 0.25 + Math.random() * 0.5, // 0.25-0.75秒の休符
          confidence: 0.7 - (i * 0.1),
          timing: i * 0.25,
          source: 'fallback',
          sequenceIndex: i,
          isRest: true // 休符フラグ
        }
        
        predictions.push(prediction)
        
        // 連続予測が有効な場合、次の予測のためにシーケンスを更新
        if (this.generateSequentialPredictions && i < this.predictionCount - 1) {
          currentSequence.push({
            ...prediction,
            time: lastNote.time + lastNote.duration + prediction.timing
          })
        }
      } else {
        // ノートの予測
        let nextPitch = lastNote.pitch

        // 音程の傾向を分析（より保守的な変化）
        if (currentSequence.length > 1) {
          const pitchTrend = currentSequence[currentSequence.length - 1].pitch - currentSequence[currentSequence.length - 2].pitch
          
          // より小さな音程変化を優先
          if (pitchTrend > 0) {
            // 上昇傾向の場合、小さな上昇または維持
            nextPitch += Math.floor(Math.random() * 3) // 0-2半音上昇
          } else if (pitchTrend < 0) {
            // 下降傾向の場合、小さな下降または維持
            nextPitch -= Math.floor(Math.random() * 3) // 0-2半音下降
          } else {
            // 同じ音程の場合、小さな変化
            nextPitch += Math.floor(Math.random() * 5) - 2 // -2から+2半音
          }
        } else {
          // 最初のノートの場合、小さな変化
          nextPitch += Math.floor(Math.random() * 5) - 2 // -2から+2半音
        }

        // Magentaの有効範囲内に制限（C2-A5: 36-81）
        nextPitch = Math.max(36, Math.min(81, nextPitch))

        // ベロシティの変化も小さく
        const velocityChange = Math.floor(Math.random() * 11) - 5 // -5から+5
        const newVelocity = Math.max(0.3, Math.min(1.0, lastNote.velocity + velocityChange / 100))

        const prediction = {
          pitch: nextPitch,
          velocity: newVelocity,
          duration: 0.25 + Math.random() * 0.25, // 0.25-0.5秒のバリエーション
          confidence: 0.8 - (i * 0.1),
          timing: i * 0.25,
          source: 'fallback',
          sequenceIndex: i,
          isRest: false
        }

        predictions.push(prediction)

        // 連続予測が有効な場合、次の予測のためにシーケンスを更新
        if (this.generateSequentialPredictions && i < this.predictionCount - 1) {
          currentSequence.push({
            ...prediction,
            time: lastNote.time + lastNote.duration + prediction.timing
          })
        }
      }
    }

    // 信頼度でソート
    predictions.sort((a, b) => b.confidence - a.confidence)
    
    return predictions
  }

  // キャッシュキーの生成
  generateCacheKey(sequence) {
    return sequence.map(note => `${note.pitch}-${note.velocity}-${note.duration}`).join('|')
  }

  // 予測結果の処理
  handlePredictionResult(prediction, startTime, isCached) {
    const predictionTime = performance.now() - startTime
    
    // パフォーマンス指標を更新
    this.performanceMetrics.predictionTime.push(predictionTime)
    this.performanceMetrics.totalPredictions++
    
    if (isCached) {
      this.performanceMetrics.cacheHits++
    }
    
    // 平均予測時間を計算（最新10回分）
    if (this.performanceMetrics.predictionTime.length > 10) {
      this.performanceMetrics.predictionTime.shift()
    }
    
    const avgPredictionTime = this.performanceMetrics.predictionTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.predictionTime.length
    
    // キャッシュヒット率を計算
    this.performanceMetrics.cacheHitRate = this.performanceMetrics.cacheHits / this.performanceMetrics.totalPredictions
    
    // 表示用の予測をフィルタリング（最も確率が高いものから表示個数分）
    const displayPredictions = prediction
      .sort((a, b) => b.confidence - a.confidence) // 信頼度でソート
      .slice(0, this.displayCount) // 表示個数分のみ取得
    
    // リスナーに通知（全予測を返す）
    this.notifyListeners('prediction', { 
      predictions: prediction, // 全予測を返す
      displayPredictions: displayPredictions, // 表示用も含める
      predictionTime: predictionTime,
      isCached: isCached,
      displayCount: this.displayCount,
      totalCount: this.predictionCount
    })
    
    this.notifyListeners('metrics', {
      averagePredictionTime: avgPredictionTime,
      cacheHitRate: this.performanceMetrics.cacheHitRate,
      totalPredictions: this.performanceMetrics.totalPredictions,
      modelLoadTime: this.performanceMetrics.modelLoadTime,
      displayCount: this.displayCount,
      predictionCount: this.predictionCount
    })
    
    this.lastPrediction = displayPredictions
  }

  // 予測のクリア
  clearPrediction() {
    this.lastPrediction = null
    this.notifyListeners('prediction', { predictions: [] })
  }

  // アクティブ状態の設定
  setActive(active) {
    this.isActive = active
    this.notifyListeners('status', { 
      isInitialized: this.isInitialized,
      isActive: active,
      modelType: this.modelType,
      modelName: this.magentaConfig[this.modelType]?.name || 'Unknown'
    })
  }

  // 設定の更新
  updateSettings(settings) {
    if (settings.predictionThreshold !== undefined) {
      this.predictionThreshold = settings.predictionThreshold
    }
    if (settings.debounceDelay !== undefined) {
      this.debounceDelay = settings.debounceDelay
    }
    if (settings.contextWindow !== undefined) {
      this.contextWindow = settings.contextWindow
    }
    if (settings.predictionCount !== undefined) {
      this.predictionCount = Math.max(1, Math.min(10, settings.predictionCount)) // 1-10個の範囲
    }
    if (settings.displayCount !== undefined) {
      this.displayCount = Math.max(1, Math.min(this.predictionCount, settings.displayCount)) // 1-予測個数の範囲
    }
    if (settings.generateSequentialPredictions !== undefined) {
      this.generateSequentialPredictions = settings.generateSequentialPredictions
    }
    if (settings.restProbability !== undefined) {
      this.restProbability = Math.max(0, Math.min(0.5, settings.restProbability)) // 0-50%の範囲
    }
    if (settings.restDetectionThreshold !== undefined) {
      this.restDetectionThreshold = Math.max(0.05, Math.min(0.5, settings.restDetectionThreshold)) // 0.05-0.5秒の範囲
    }
    // モデルタイプの更新
    if (settings.currentModel !== undefined && settings.currentModel !== this.modelType) {
      console.log('🎵 GhostText: Updating model type from', this.modelType, 'to', settings.currentModel)
      this.modelType = settings.currentModel
    }
  }

  // リスナーの追加
  addListener(listener) {
    this.listeners.push(listener)
  }

  // リスナーの削除
  removeListener(listener) {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  // リスナーへの通知
  notifyListeners(eventType, data) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data)
      } catch (error) {
        console.error('Error in listener:', error)
      }
    })
  }

  // ステータスの取得
  getStatus() {
    const modelName = this.modelType === 'fallback' 
      ? 'Fallback Prediction' 
      : this.magentaConfig[this.modelType]?.name || 'Unknown'
    
    return {
      isInitialized: this.isInitialized,
      isActive: this.isActive,
      modelType: this.modelType,
      modelName: modelName,
      predictionSettings: {
        predictionCount: this.predictionCount,
        displayCount: this.displayCount,
        generateSequentialPredictions: this.generateSequentialPredictions,
        restProbability: this.restProbability,
        restDetectionThreshold: this.restDetectionThreshold
      }
    }
  }

  // テスト予測の生成
  generateTestPrediction() {
    const testSequence = [
      { pitch: 60, velocity: 0.8, duration: 0.25, time: 0 },
      { pitch: 62, velocity: 0.8, duration: 0.25, time: 0.25 },
      { pitch: 64, velocity: 0.8, duration: 0.25, time: 0.5 }
    ]
    
    this.currentSequence = testSequence
    this.generatePrediction()
  }

  // クリーンアップ
  cleanup() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }
    
    if (this.model) {
      this.model.dispose()
      this.model = null
    }
    
    this.predictionCache.clear()
    this.listeners = []
    this.currentSequence = []
  }
}

// クラスをexport
export default MagentaGhostTextEngine 