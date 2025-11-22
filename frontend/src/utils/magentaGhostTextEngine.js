// Magenta Ghost Text Engine - Google Magenta統合版
import * as tf from '@tensorflow/tfjs'
import { musicTheorySystem } from './musicTheory/MusicTheorySystem.js'

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

    // フレーズ予測設定（デフォルトで有効）
    this.phrasePredictionEnabled = true // フレーズ予測モードをデフォルトで有効化
    this.timeSignature = { numerator: 4, denominator: 4 } // 拍子（デフォルト4/4）
    this.tempo = 120 // テンポ（BPM）

    // 🔧 Problem 2修正: フレーズ予測ストレージ
    this.phraseNotes = [] // フレーズ予測ノートを格納する配列

    // 🎯 [Phase 1] 予測モード設定
    this.predictionMode = 'phrase-only' // 'phrase-only' | 'mixed' | 'bar-based'
    this.mixedModeRatio = 0.5 // 混合モードでのフレーズ予測の比率（0.0-1.0）
    this.barBasedSwitchThreshold = 2 // 小節に応じて自動切り替えする閾値

    // 🔴 NEW: フレーズセッション管理
    this.currentPhraseSession = null // { id, notes, startTime, locked, approvedCount, nextPhraseIndex, totalCount }
    this.phraseSessionHistory = []   // 完了したセッションの履歴（最大50件）

    // Magentaモデル設定（動的に設定）
    this.magentaConfig = {}
    this.mm = null // Magentaライブラリの参照
    this.quantizeFunction = null // 量子化関数の参照

    // 音楽理論統合
    this.musicTheory = musicTheorySystem
    this.enableMusicTheoryFiltering = true // 音楽理論フィルタリングを有効化
    this.enableGenreWeighting = true // ジャンル重み付けを有効化
    this.enableScaleConstraints = true // スケール制約を有効化

    // 🎯 CRITICAL FIX: 承認済みフレーズノートトラッキングシステム
    this.approvedPhraseNotes = [] // 承認されたフレーズノートの独立追跡

    // 音楽コンテキスト（プロジェクトから取得）
    this.musicContext = {
      genre: null,
      scales: [],
      rootNote: 'C',
      octave: 4,
      currentChord: null,
      beatPosition: 0,
      tempo: 120
    }

    // パフォーマンス監視
    this.performanceMetrics = {
      predictionTime: [],
      cacheHitRate: 0,
      totalPredictions: 0,
      cacheHits: 0,
      modelLoadTime: 0,
      musicTheoryFilteredCount: 0,
      scaleFilteredCount: 0
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
            url: '/ai/predict',
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
          url: '/ai/predict',
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
    console.log('🎯 Ghost Text Engine 初期化開始')
    console.log('🎵 GhostText: Initializing with modelType =', this.modelType)

    try {
      // TensorFlow.jsの初期化
      try {
        console.log('🎯 TensorFlow.js初期化開始...')
        await tf.ready()
        console.log('✅ TensorFlow.js初期化完了')
      } catch (tfError) {
        console.error('❌ TensorFlow.js初期化失敗:', tfError)
        // TensorFlow.jsの初期化に失敗しても、フォールバック予測は動作する
        this.isInitialized = true
        this.notifyListeners('initialized', {
          success: true,
          modelType: 'fallback',
          loadTime: 0,
          warning: 'Using fallback prediction mode due to TensorFlow.js initialization failure'
        })
        console.log('✅ Ghost Text Engine 初期化完了 (フォールバックモード)')
        return true
      }

      // Phi-2モデルの場合はバックエンドの可用性をチェック
      if (this.modelType === 'phi2') {
        console.log('🎯 Phi-2モデル: バックエンド可用性チェック開始...')
        try {
          const response = await fetch('/ai/health', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          })

          if (response.ok) {
            console.log('✅ Phi-2バックエンドが利用可能')

            // Magentaモデル設定の初期化（Phi-2の設定を含む）
            console.log('🎯 Magenta設定初期化開始...')
            const magentaConfigSuccess = this.initializeMagentaConfig()
            if (!magentaConfigSuccess) {
              throw new Error('Failed to initialize Magenta configuration')
            }
            console.log('✅ Magenta設定初期化完了')

            // Phi-2モデルの場合は、loadMagentaModelを呼び出してから初期化を完了
            console.log('🎯 loadMagentaModel()の呼び出し開始...')
            const success = await this.loadMagentaModel('phi2')
            if (success) {
              console.log('✅ Model loaded successfully')
              this.isInitialized = true
              this.notifyListeners('initialized', {
                success: true,
                modelType: 'phi2',
                loadTime: this.performanceMetrics.modelLoadTime
              })
              console.log('✅ Ghost Text Engine 初期化完了')
              return true
            } else {
              throw new Error('Failed to load Phi-2 model')
            }
          } else {
            throw new Error(`Backend health check failed: ${response.status}`)
          }
        } catch (error) {
          console.error('❌ Phi-2バックエンド利用不可:', error.message)
          console.warn('⚠️ フォールバックモードに切り替え')
          this.modelType = 'fallback'
          this.isInitialized = true
          this.notifyListeners('initialized', {
            success: true,
            modelType: 'fallback',
            loadTime: 0,
            warning: 'Phi-2 backend unavailable, using fallback prediction mode'
          })
          console.log('✅ Ghost Text Engine 初期化完了 (フォールバックモード)')
          return true
        }
      }

      // Magentaライブラリのインポート
      console.log('🎯 Magentaライブラリインポート開始...')
      const magentaImportSuccess = await this.importMagenta()
      if (!magentaImportSuccess) {
        console.error('❌ Magentaライブラリインポート失敗')
        console.warn('⚠️ フォールバックモードに切り替え')
        this.isInitialized = true
        this.modelType = 'fallback'
        this.notifyListeners('initialized', {
          success: true,
          modelType: 'fallback',
          loadTime: 0,
          warning: 'Using fallback prediction mode due to Magenta library import failure'
        })
        console.log('✅ Ghost Text Engine 初期化完了 (フォールバックモード)')
        return true
      }
      console.log('✅ Magentaライブラリインポート完了')

      // Magentaモデル設定の初期化
      console.log('🎯 Magenta設定初期化開始...')
      const magentaConfigSuccess = this.initializeMagentaConfig()
      if (!magentaConfigSuccess) {
        console.error('❌ Magenta設定初期化失敗')
        console.warn('⚠️ フォールバックモードに切り替え')
        this.isInitialized = true
        this.modelType = 'fallback'
        this.notifyListeners('initialized', {
          success: true,
          modelType: 'fallback',
          loadTime: 0,
          warning: 'Using fallback prediction mode due to model configuration failure'
        })
        console.log('✅ Ghost Text Engine 初期化完了 (フォールバックモード)')
        return true
      }
      console.log('✅ Magenta設定初期化完了')

      // モデルタイプに応じてモデルをロード
      const modelToLoad = this.modelType === 'phi2' ? 'phi2' : 'musicRnn'
      console.log('🎯 loadMagentaModel()の呼び出し開始...', '対象モデル:', modelToLoad)
      const success = await this.loadMagentaModel(modelToLoad)

      if (success) {
        console.log('✅ Model loaded successfully')
        this.isInitialized = true
        this.notifyListeners('initialized', {
          success: true,
          modelType: this.modelType,
          loadTime: this.performanceMetrics.modelLoadTime
        })
        console.log('✅ Ghost Text Engine 初期化完了')
        return true
      } else {
        // モデルロードに失敗した場合、フォールバックモードで初期化
        console.error('❌ Model loading failed')
        console.warn('⚠️ フォールバックモードに切り替え')
        this.isInitialized = true
        this.modelType = 'fallback'
        this.notifyListeners('initialized', {
          success: true,
          modelType: 'fallback',
          loadTime: 0,
          warning: 'Using fallback prediction mode due to model loading failure'
        })
        console.log('✅ Ghost Text Engine 初期化完了 (フォールバックモード)')
        return true
      }
    } catch (error) {
      // エラーが発生しても、フォールバックモードで初期化
      console.error('❌ Ghost Text Engine 初期化エラー:', error)
      console.error('❌ Error stack:', error.stack)
      console.warn('⚠️ フォールバックモードに切り替え')
      this.isInitialized = true
      this.modelType = 'fallback'
      this.notifyListeners('initialized', {
        success: true,
        modelType: 'fallback',
        loadTime: 0,
        warning: 'Using fallback prediction mode due to initialization error'
      })
      console.log('✅ Ghost Text Engine 初期化完了 (フォールバックモード)')
      return true
    }
  }

  // Magentaモデルのロード
  async loadMagentaModel(modelKey = 'musicRnn') {
    console.log('🎵 GhostText: Loading model:', modelKey, 'current modelType:', this.modelType)

    try {
      // 🔧 FIX: 'magenta' を 'musicRnn' にマッピング
      // UI や Demo Song では 'magenta' という汎用名が使われるが、
      // 内部では具体的な Magenta モデル (musicRnn) を使用する
      if (modelKey === 'magenta') {
        console.log('🎵 GhostText: Mapping "magenta" to "musicRnn"')
        modelKey = 'musicRnn'
      }

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

  // 🎯 NEW: プロジェクトリセット時の承認ノート配列クリア
  clearApprovedPhraseNotes(reason = 'manual') {
    const previousCount = this.approvedPhraseNotes.length
    this.approvedPhraseNotes = []
    console.log('🗑️ [DIVERSITY_DEBUG][APPROVED_CLEAR] 承認ノート配列クリア:', {
      previousCount,
      reason,
      newCount: this.approvedPhraseNotes.length,
      step: 'approved_notes_cleared'
    })
  }

  // 🔴 NEW: フレーズセッション管理メソッド
  unlockPhraseSession() {
    if (this.currentPhraseSession) {
      console.log(`🔍 [セッション] 削除: id=${this.currentPhraseSession.id}, approved=${this.currentPhraseSession.approvedCount}/${this.currentPhraseSession.totalCount}`)
      console.log('🔓 Unlocking phrase session:', {
        id: this.currentPhraseSession.id,
        approvedCount: this.currentPhraseSession.approvedCount,
        totalCount: this.currentPhraseSession.totalCount
      })

      this.phraseSessionHistory.push({
        ...this.currentPhraseSession,
        completedAt: Date.now()
      })

      // 履歴は最大50件まで
      if (this.phraseSessionHistory.length > 50) {
        this.phraseSessionHistory = this.phraseSessionHistory.slice(-50)
      }

      this.currentPhraseSession = null
      console.log('🔓 Phrase session unlocked - ready for new phrase on next user input')
    } else {
      console.log('⚠️ unlockPhraseSession called but no active session')
    }
  }

  generateNextPhrase(originalSequence = this.currentSequence) {
    // 🎯 CRITICAL FIX: 承認ノート累積追跡（リセットしない）
    const currentApprovedCount = this.approvedPhraseNotes.length
    console.log('📈 [DIVERSITY_DEBUG][PHRASE_ACCUMULATE] 承認ノート累積追跡:', {
      currentApprovedCount,
      action: 'accumulate_not_reset',
      step: 'approved_notes_accumulate'
    })

    console.log('🎵 [DIVERSITY_DEBUG][PHRASE_GENERATION] generateNextPhrase開始:', {
      existingSessionId: this.currentPhraseSession?.id,
      sequenceLength: originalSequence.length,
      phrasePredictionEnabled: this.phrasePredictionEnabled,
      predictionCount: this.predictionCount,
      timestamp: Date.now(),
      step: 'generation_start'
    })

    const barDuration = this.calculateBarDuration()
    const phraseNotes = this.generateRuleBasedPhrase(barDuration)

    // 🎯 CRITICAL FIX: 承認済みフレーズノートトラッキングシステム
    console.log('🔍 [DIVERSITY_DEBUG][BASETIME_CALC] baseTime計算開始:', {
      originalSequenceLength: originalSequence.length,
      approvedPhraseNotesCount: this.approvedPhraseNotes?.length || 0,
      step: 'basetime_calculation_start'
    })

    // 承認済みフレーズノートから最後の位置を計算
    let calculatedBaseTime = 0

    if (this.approvedPhraseNotes && this.approvedPhraseNotes.length > 0) {
      // 承認済みフレーズノートの詳細ログ
      const endTimes = this.approvedPhraseNotes.map(note => {
        const endTime = (note.time || 0) + (note.duration || 0.25)
        return { note: note, endTime: endTime }
      })

      // 承認済みフレーズノートの終了時間の最大値を取得
      calculatedBaseTime = Math.max(...this.approvedPhraseNotes.map(note => (note.time || 0) + (note.duration || 0.25)))
      console.log('✅ [DIVERSITY_DEBUG][BASETIME_CALC] 承認ノートベース計算:', {
        approvedNotesCount: this.approvedPhraseNotes.length,
        calculatedBaseTime,
        method: 'approved_phrase_notes',
        lastNote: this.approvedPhraseNotes[this.approvedPhraseNotes.length - 1],
        allEndTimes: endTimes,
        maxEndTime: Math.max(...endTimes.map(item => item.endTime)),
        step: 'basetime_from_approved_notes'
      })
    } else {
      // フォールバック：originalSequenceから計算
      const lastNote = originalSequence[originalSequence.length - 1]
      calculatedBaseTime = lastNote ? lastNote.time + lastNote.duration : 0
      console.log('🔄 [DIVERSITY_DEBUG][BASETIME_CALC] フォールバック計算:', {
        originalSequenceLength: originalSequence.length,
        calculatedBaseTime,
        method: 'fallback_original_sequence',
        step: 'basetime_fallback'
      })
    }

    const baseTime = calculatedBaseTime

    console.log('🎯 [DIVERSITY_DEBUG][BASETIME_FINAL] 最終baseTime決定:', {
      finalBaseTime: baseTime,
      approvedNotesCount: this.approvedPhraseNotes?.length || 0,
      originalSequenceLength: originalSequence.length,
      calculationMethod: this.approvedPhraseNotes?.length > 0 ? 'approved_notes' : 'fallback',
      step: 'basetime_final'
    })

    // 🔍 [2ND_PHRASE_DEBUG] 新フレーズセッション作成
    console.log('🔍 [2ND_PHRASE_DEBUG] フレーズセッション作成:', {
      sessionId: `phrase-session-${Date.now()}`,
      baseTime,
      phraseNotesCount: phraseNotes.length,
      approvedPhraseNotesCount: this.approvedPhraseNotes.length,
      calculationMethod: this.approvedPhraseNotes.length > 0 ? 'approved_phrase_notes' : 'fallback',
      step: 'session_creation'
    })

    this.currentPhraseSession = {
      id: `phrase-session-${Date.now()}`,
      notes: phraseNotes,
      startTime: Date.now(),
      baseTime: baseTime,  // 🔒 フレーズ全体の基準時刻を固定
      locked: true,
      approvedCount: 0,
      nextPhraseIndex: 0,  // 🚨 FIX: 次に承認するノートのインデックスを追加
      totalCount: phraseNotes.length,
      barDuration: barDuration,
      createdAt: Date.now()
    }

    // 🎵 [DIVERSITY_DEBUG] フレーズ通知前の詳細ログ
    const notificationData = {
      phraseNotes: this.currentPhraseSession.notes,
      sessionId: this.currentPhraseSession.id,
      locked: true
    }
    console.log('🔍 [PHRASE_FLOW] Phase 1.2: generateNextPhrase()完了 - 単一フレーズ生成')
    console.log('🔍 [PHRASE_FLOW] Phase 1.3: phrasePredictionイベント送信準備')
    console.log('📤 [DIVERSITY_DEBUG][PHRASE_SEND] generateNextPhrase→phrasePrediction送信:', {
      sessionId: this.currentPhraseSession.id,
      phraseNotesCount: this.currentPhraseSession.notes.length,
      baseTime: this.currentPhraseSession.baseTime,
      locked: true,
      timestamp: Date.now(),
      notificationData: notificationData,
      step: 'phrase_send_preparation'
    })

    this.notifyListeners('phrasePrediction', notificationData)

    console.log('🔍 [PHRASE_FLOW] Phase 1.4: phrasePredictionイベント送信完了 (v1.0.0互換)')
    console.log('✅ [DIVERSITY_DEBUG][PHRASE_SENT] phrasePrediction送信完了:', {
      sessionId: this.currentPhraseSession.id,
      step: 'phrase_send_complete'
    })

    console.log(`🔍 [セッション] 作成: id=${this.currentPhraseSession.id}, baseTime=${baseTime}, noteCount=${phraseNotes.length}`)
    console.log('🎵 New phrase session created:', this.currentPhraseSession.id)
  }

  // 🆕 v2.0.0: 複数フレーズセット生成機能
  /**
   * 温度パラメータ計算 - セットインデックスに基づく多様性確保
   * @param {number} setIndex - セットインデックス (0-2)
   * @returns {number} temperature - 温度パラメータ (0.8-1.2)
   */
  calculateTemperature(setIndex) {
    const temperatureRange = { min: 0.8, max: 1.2 }
    const phraseSetCount = 3
    const step = (temperatureRange.max - temperatureRange.min) / (phraseSetCount - 1)
    const temperature = temperatureRange.min + (step * setIndex)

    console.log(`🌡️ [PHRASE_SET_TEMP] セット${setIndex}の温度: ${temperature.toFixed(2)}`)
    return temperature
  }

  /**
   * 単一フレーズセット生成（内部メソッド）
   * @private
   * @param {number} barDuration - 小節の長さ
   * @param {number} notesPerPhrase - フレーズあたりのノート数
   * @param {number} temperature - 温度パラメータ
   * @param {number} setIndex - セットインデックス
   * @returns {Array} phraseNotes - 生成されたフレーズノート配列
   */
  generateSinglePhraseSet(barDuration, notesPerPhrase, temperature, setIndex) {
    console.log(`🎵 [PHRASE_GEN_SET${setIndex}] 生成開始:`, {
      temperature,
      notesPerPhrase,
      barDuration
    })

    // 既存のgenerateRuleBasedPhraseメソッドを使用（温度パラメータ付き）
    const phraseNotes = this.generateRuleBasedPhrase(barDuration, { temperature, seed: Date.now() + setIndex })

    console.log(`✅ [PHRASE_GEN_SET${setIndex}] 生成完了:`, {
      notesCount: phraseNotes.length,
      pitches: phraseNotes.map(n => n.pitch)
    })

    return phraseNotes
  }

  /**
   * 複数フレーズセット生成 - 3つの多様なフレーズセットを生成
   * @param {Array} originalSequence - 現在のMIDIシーケンス
   * @param {number} phraseSetCount - 生成するセット数（デフォルト3）
   * @param {number} notesPerPhrase - 各フレーズのノート数（デフォルト5）
   * @returns {Array<Array>} phraseSets - 生成されたフレーズセット配列
   */
  generateMultiplePhraseSets(originalSequence = this.currentSequence, phraseSetCount = 3, notesPerPhrase = 5) {
    console.log('🎼 [PHRASE_SET_GEN_START] 複数フレーズセット生成開始:', {
      inputNotes: originalSequence.length,
      phraseSetCount,
      notesPerPhrase,
      parallelGeneration: false  // Phase 1では順次生成
    })

    const phraseSets = []
    const startTime = performance.now()
    const barDuration = this.calculateBarDuration()

    // Phase 1: 順次生成（実装簡易化）
    for (let i = 0; i < phraseSetCount; i++) {
      const temperature = this.calculateTemperature(i)
      const phraseNotes = this.generateSinglePhraseSet(barDuration, notesPerPhrase, temperature, i)
      phraseSets.push(phraseNotes)
    }

    const endTime = performance.now()
    const generationTime = endTime - startTime

    console.log('✅ [PHRASE_SET_GEN_COMPLETE] 複数フレーズセット生成完了:', {
      generatedSets: phraseSets.length,
      generationTime: `${generationTime.toFixed(2)}ms`,
      avgTimePerSet: `${(generationTime / phraseSetCount).toFixed(2)}ms`,
      phraseSets: phraseSets.map((set, idx) => ({
        setIndex: idx,
        noteCount: set.length,
        pitches: set.map(n => n.pitch)
      }))
    })

    // パフォーマンス警告
    if (generationTime > 600) {
      console.warn('⚠️ [PHRASE_SET_PERF] 生成時間が目標値(600ms)を超過:', {
        actual: `${generationTime.toFixed(2)}ms`,
        target: '600ms',
        suggestion: 'parallelGeneration有効化を検討'
      })
    }

    // 🚨 baseTime計算（承認済みフレーズノートベース）
    let baseTime = 0
    if (this.approvedPhraseNotes && this.approvedPhraseNotes.length > 0) {
      baseTime = Math.max(...this.approvedPhraseNotes.map(note => (note.time || 0) + (note.duration || 0.25)))
      console.log('✅ [PHRASE_SET_BASETIME] 承認ノートベース:', {
        approvedNotesCount: this.approvedPhraseNotes.length,
        baseTime
      })
    } else {
      const lastNote = originalSequence[originalSequence.length - 1]
      baseTime = lastNote ? lastNote.time + lastNote.duration : 0
      console.log('🔄 [PHRASE_SET_BASETIME] フォールバック:', {
        originalSequenceLength: originalSequence.length,
        baseTime
      })
    }

    // 🔧 CRITICAL FIX: フレーズセット生成後にセッション作成（アンロック状態）
    this.currentPhraseSession = {
      id: `phrase-sets-${Date.now()}`,
      notes: phraseSets[0] || [],  // 最初のセットをデフォルトに設定
      startTime: Date.now(),
      baseTime: baseTime,
      locked: false,  // 🔓 v2.0.0では即座にアンロック状態で作成
      approvedCount: 0,
      nextPhraseIndex: 0,
      totalCount: (phraseSets[0] || []).length,
      phraseSets: phraseSets,  // 🆕 v2.0.0: 全フレーズセットを保持
      selectedSetIndex: 0,
      createdAt: Date.now()
    }

    console.log('✅ [PHRASE_SESSION_UNLOCKED] v2.0.0セッション作成（アンロック）:', {
      sessionId: this.currentPhraseSession.id,
      locked: this.currentPhraseSession.locked,
      phraseSetsCount: phraseSets.length,
      defaultSetLength: this.currentPhraseSession.notes.length
    })

    // イベント送信: 'phrase-sets-generated'
    const notificationData = {
      phraseSets: phraseSets,
      selectedSetIndex: 0,  // デフォルトで最初のセットを選択
      baseTime: baseTime,
      sessionId: this.currentPhraseSession.id
    }

    console.log('📤 [PHRASE_SETS_SEND] phrase-sets-generatedイベント送信:', notificationData)
    this.notifyListeners('phrase-sets-generated', notificationData)

    return phraseSets
  }

  // MIDI入力の処理
  processMidiInput(note) {
    console.log('🎵 processMidiInput called:', {
      isInitialized: this.isInitialized,
      isActive: this.isActive,
      phraseLocked: this.currentPhraseSession?.locked || false,
      noteData: note
    })

    // 🔴 CRITICAL FIX: フレーズロック中は全ての予測生成を完全停止
    if (this.currentPhraseSession && this.currentPhraseSession.locked) {
      console.log('🔒 Phrase session LOCKED - ALL predictions blocked')
      console.log('🔒 Current session:', {
        id: this.currentPhraseSession.id,
        approvedCount: this.currentPhraseSession.approvedCount,
        totalCount: this.currentPhraseSession.totalCount,
        locked: this.currentPhraseSession.locked
      })
      // 🚨 追加の安全策: デバウンスタイマーもクリア
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout)
        this.debounceTimeout = null
        console.log('🔒 Debounce timer cleared (phrase locked)')
      }
      return // 🚨 完全にブロック - 新規予測生成なし
    }

    if (!this.isInitialized) {
      console.warn('⚠️ Ghost Text機能が非初期化:', { isInitialized: this.isInitialized })
      return
    }

    if (!this.isActive) {
      console.warn('⚠️ Ghost Text機能が非アクティブ:', { isActive: this.isActive })
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

    console.log('🎵 シーケンスに追加:', {
      sequenceLength: this.currentSequence.length,
      maxLength: this.maxSequenceLength
    })

    // シーケンス長の制限
    if (this.currentSequence.length > this.maxSequenceLength) {
      this.currentSequence.shift()
    }

    // デバウンス処理で予測を実行（フレーズロック中は既にブロック済み）
    console.log('🎯 デバウンス処理で予測実行開始...')
    this.debouncedPredict()

    // 🔧 Phase 2修正: 予測モードに応じた統合予測
    // 🚨 CRITICAL FIX: ロック中はこのブロックに到達しない（上でreturn済み）
    if (this.phrasePredictionEnabled) {
      if (!this.currentPhraseSession) {
        // 🔴 初回フレーズセッション生成
        console.log('🔍 [PHRASE_FLOW] Phase 1 START: 初回フレーズセッション生成開始')
        console.log('🔍 [PHRASE_FLOW] Phase 1.1: generateMultiplePhraseSets()呼び出し (v2.0.0機能)')
        this.generateMultiplePhraseSets(this.currentSequence, 3, 5)
      } else if (!this.currentPhraseSession.locked) {
        // 🆕 セッション完了後の再生成を許可
        console.log('🔍 [PHRASE_FLOW] Phase 1 RESTART: フレーズセッション再生成開始')
        console.log('🔍 [PHRASE_FLOW] Phase 1.1: generateMultiplePhraseSets()呼び出し (v2.0.0機能)')
        this.generateMultiplePhraseSets(this.currentSequence, 3, 5)
      } else {
        console.log('🔍 [PHRASE_FLOW] Phase 1 SKIP: セッションロック中のため予測スキップ')
        console.log('🎵 [Phase 2] 予測スキップ (セッションロック中):', {
          sessionId: this.currentPhraseSession.id,
          locked: this.currentPhraseSession.locked
        })
      }
    } else {
      console.log('🔍 [PHRASE_FLOW] Phase 1 DISABLED: フレーズ予測機能無効')
      console.log('🎵 [Phase 2] 予測スキップ (フレーズ予測無効):', {
        phrasePredictionEnabled: this.phrasePredictionEnabled
      })
    }
  }

  // デバウンス処理
  debouncedPredict() {
    // 🔴 CRITICAL FIX: フレーズロック中はデバウンス処理もスキップ
    if (this.currentPhraseSession && this.currentPhraseSession.locked) {
      console.log('🔒 debouncedPredict: Phrase session locked, debounce skipped')
      // タイマーをクリア
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout)
        this.debounceTimeout = null
      }
      return
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    // 重い処理を非同期で実行し、setTimeout違反を回避
    this.debounceTimeout = setTimeout(() => {
      // 🔴 CRITICAL FIX: 実行時にも再度ロック状態をチェック
      if (this.currentPhraseSession && this.currentPhraseSession.locked) {
        console.log('🔒 debouncedPredict timeout: Phrase session locked, prediction cancelled')
        return
      }

      // requestIdleCallbackを使用してブラウザのアイドル時間に実行
      if (window.requestIdleCallback) {
        requestIdleCallback(() => {
          // 🔴 CRITICAL FIX: requestIdleCallback内でも再度ロック状態をチェック
          if (this.currentPhraseSession && this.currentPhraseSession.locked) {
            console.log('🔒 requestIdleCallback: Phrase session locked, prediction cancelled')
            return
          }
          this.generatePrediction()
        }, { timeout: 100 })
      } else {
        // フォールバック: より短いタイムアウトで実行
        setTimeout(() => {
          // 🔴 CRITICAL FIX: フォールバックでも再度ロック状態をチェック
          if (this.currentPhraseSession && this.currentPhraseSession.locked) {
            console.log('🔒 setTimeout fallback: Phrase session locked, prediction cancelled')
            return
          }
          this.generatePrediction()
        }, 0)
      }
    }, this.debounceDelay)
  }

  // 🎵 音楽コンテキストの更新
  updateMusicContext(context = {}) {
    const {
      genre,
      scales,
      rootNote,
      octave,
      currentChord,
      beatPosition,
      tempo
    } = context

    // 更新があった項目のみ反映
    if (genre !== undefined) {
      this.musicContext.genre = genre
      // MusicTheorySystemにも反映
      if (genre && this.musicTheory) {
        try {
          this.musicTheory.setGenre(genre)
          console.log(`🎵 GhostText: Genre set to ${genre}`)
        } catch (error) {
          console.warn(`🎵 GhostText: Failed to set genre ${genre}:`, error)
        }
      }
    }

    if (scales !== undefined && Array.isArray(scales) && scales.length > 0) {
      this.musicContext.scales = scales
      // MusicTheorySystemにも反映
      if (this.musicTheory) {
        try {
          this.musicTheory.setScales(scales)
          console.log(`🎵 GhostText: Scales set to ${scales.join(', ')}`)
        } catch (error) {
          console.warn(`🎵 GhostText: Failed to set scales ${scales.join(', ')}:`, error)
        }
      }
    }

    if (rootNote !== undefined || octave !== undefined) {
      this.musicContext.rootNote = rootNote || this.musicContext.rootNote
      this.musicContext.octave = octave !== undefined ? octave : this.musicContext.octave
      // MusicTheorySystemにも反映
      if (this.musicTheory) {
        try {
          this.musicTheory.setRootNote(this.musicContext.rootNote, this.musicContext.octave)
          console.log(`🎵 GhostText: Root note set to ${this.musicContext.rootNote}${this.musicContext.octave}`)
        } catch (error) {
          console.warn(`🎵 GhostText: Failed to set root note:`, error)
        }
      }
    }

    if (currentChord !== undefined) {
      this.musicContext.currentChord = currentChord
    }

    if (beatPosition !== undefined) {
      this.musicContext.beatPosition = beatPosition
    }

    if (tempo !== undefined) {
      this.musicContext.tempo = tempo
    }

    console.log('🎵 GhostText: Music context updated:', this.musicContext)
  }

  // 🎼 音楽理論フィルタリングの適用
  applyMusicTheoryFiltering(predictions) {
    if (!this.enableMusicTheoryFiltering || !this.musicTheory) {
      return predictions
    }

    const startTime = performance.now()

    try {
      // スケール制約フィルタリング
      let filteredPredictions = predictions

      // 🚨 一時的にスケール制約フィルタリングを無効化
      if (false && this.enableScaleConstraints) {
        const initialCount = filteredPredictions.length

        try {
          // 🎼 緩い音楽理論フィルタリング: 経過音・装飾音を許可
          const filtered = this.musicTheory.filterByScale(filteredPredictions, {
            allowPassingTones: true,      // 隣接スケール音程を許可（経過音）
            preferConsonance: false,      // 不協和音も許可（テンション・装飾音）
            maxDistance: 12               // 1オクターブ範囲内許可
          })

          const filteredCount = initialCount - filtered.length
          this.performanceMetrics.scaleFilteredCount += filteredCount

          // フィルタリング結果が0件の場合は元の予測を保持
          if (filtered.length === 0) {
            console.warn(`⚠️ GhostText: All predictions filtered out, keeping original ${initialCount} predictions`)
            console.log(`🎵 GhostText: Proceeding with unfiltered predictions to ensure user experience`)
            // Keep original predictions if all are filtered out
          } else {
            filteredPredictions = filtered
            console.log(`🎵 GhostText: Relaxed scale filtering removed ${filteredCount} predictions (allowing passing tones)`)
          }
        } catch (error) {
          console.warn(`⚠️ GhostText: Music theory filtering failed, skipping: ${error.message}`)
          console.log(`🎵 GhostText: Proceeding with all ${initialCount} predictions (no filtering applied)`)
          // Keep original predictions if filtering fails
        }
      }

      // 一時的なデバッグメッセージ
      console.log(`🎵 GhostText: Scale filtering DISABLED - keeping all ${filteredPredictions.length} predictions`)

      // ジャンル重み付け適用
      if (this.enableGenreWeighting && filteredPredictions.length > 0) {
        filteredPredictions = filteredPredictions.map(prediction => {
          const genreScore = prediction.genreScore || 0.5
          const originalConfidence = prediction.confidence || 0.5

          // ジャンルスコアと元の信頼度を組み合わせて最終スコアを計算
          const combinedScore = (originalConfidence * 0.6) + (genreScore * 0.4)

          return {
            ...prediction,
            confidence: combinedScore,
            originalConfidence: originalConfidence,
            genreScore: genreScore
          }
        })

        // 信頼度でソート
        filteredPredictions.sort((a, b) => b.confidence - a.confidence)

        console.log(`🎵 GhostText: Genre weighting applied to ${filteredPredictions.length} predictions`)
      }

      const filterTime = performance.now() - startTime
      console.log(`🎵 GhostText: Music theory filtering completed in ${filterTime.toFixed(2)}ms`)

      this.performanceMetrics.musicTheoryFilteredCount++

      return filteredPredictions

    } catch (error) {
      console.error('🎵 GhostText: Error in music theory filtering:', error)
      // エラー時は元の予測をそのまま返す
      return predictions
    }
  }

  // 予測生成
  async generatePrediction() {
    // 🔴 CRITICAL FIX: フレーズロック中は予測生成をブロック
    if (this.currentPhraseSession && this.currentPhraseSession.locked) {
      console.log('🔒 generatePrediction: Phrase session locked, prediction blocked')
      return
    }

    if (this.currentSequence.length === 0) {
      console.log('🎵 generatePrediction: シーケンスが空のためスキップ')
      return
    }

    console.log('🎯 音楽提案生成開始...')
    console.log('🎵 GhostText: Generating prediction with modelType =', this.modelType)
    console.log('🎵 GhostText: this.model =', this.model)
    console.log('🎵 GhostText: this.modelType =', this.modelType)
    console.log('🎵 GhostText: currentSequence length =', this.currentSequence.length)

    const startTime = performance.now()

    try {
      // キャッシュチェック（デバッグ中は無効化）
      const cacheKey = this.generateCacheKey(this.currentSequence)

      // デバッグ中はキャッシュを無効化
      const useCache = false // デバッグ中はfalseに設定

      if (useCache && this.predictionCache.has(cacheKey)) {
        console.log('🎵 キャッシュヒット: 予測を再利用')
        const cachedPrediction = this.predictionCache.get(cacheKey)
        this.handlePredictionResult(cachedPrediction, startTime, true)
        return
      }

      // コンテキストウィンドウの適用
      const contextSequence = this.currentSequence.slice(-this.contextWindow)
      console.log('🎵 コンテキストウィンドウ適用:', {
        contextWindow: this.contextWindow,
        contextSequenceLength: contextSequence.length
      })

      let prediction = []

      // モデルタイプに応じて予測を実行
      if (this.model && this.modelType !== 'fallback') {
        console.log('🎵 GhostText: Using model prediction, calling predictWithMagenta')
        console.log('🎵 GhostText: modelType =', this.modelType, 'model exists =', !!this.model)
        // Magentaモデルで予測（非同期で実行）
        prediction = await this.predictWithMagenta(contextSequence)
        console.log('🎵 GhostText: predictWithMagenta completed, predictions =', prediction?.length || 0)
      } else {
        console.log('🎵 GhostText: Using fallback prediction')
        // フォールバック予測
        prediction = this.fallbackPrediction(contextSequence)
        console.log('🎵 GhostText: fallbackPrediction completed, predictions =', prediction?.length || 0)
      }

      // キャッシュに保存
      this.predictionCache.set(cacheKey, prediction)

      // キャッシュサイズの制限
      if (this.predictionCache.size > 1000) {
        const firstKey = this.predictionCache.keys().next().value
        this.predictionCache.delete(firstKey)
      }

      console.log('✅ 音楽提案生成完了:', {
        predictionsCount: prediction?.length || 0,
        elapsedTime: `${(performance.now() - startTime).toFixed(2)}ms`
      })
      this.handlePredictionResult(prediction, startTime, false)

    } catch (error) {
      console.error('❌ 音楽提案生成エラー:', error)
      console.error('❌ Error stack:', error.stack)
      console.warn('⚠️ フォールバック予測を使用')
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

      const response = await fetch('/ai/predict', {
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

    // 🎯 フレーズセッション中は固定baseTimeを使用（位置ずれ防止）
    let nextTime

    // 📊 nextTime計算式詳細デバッグ
    console.log(`🚨🚨🚨 [TIMING_DEBUG] nextTime決定プロセス:`)
    console.log(`🚨🚨🚨 [TIMING_DEBUG]    フレーズセッション状態: ${this.currentPhraseSession ? 'あり' : 'なし'}`)

    if (this.currentPhraseSession && this.currentPhraseSession.baseTime !== undefined) {
      nextTime = this.currentPhraseSession.baseTime
      console.log(`🚨🚨🚨 [TIMING_DEBUG]    ✅ パターン: フレーズセッション中 → 固定baseTime使用`)
      console.log(`🚨🚨🚨 [TIMING_DEBUG]    計算式: nextTime = currentPhraseSession.baseTime`)
      console.log(`🚨🚨🚨 [TIMING_DEBUG]    計算式: nextTime = ${this.currentPhraseSession.baseTime}`)
      console.log(`🚨🚨🚨 [TIMING_DEBUG]    🎯 フレーズ開始位置: ${nextTime} (固定値)`)
      console.log(`🔍 [BaseTime] 固定使用: baseTime=${this.currentPhraseSession.baseTime} (セッション中)`)
      console.log('🔒 Using fixed baseTime from phrase session:', nextTime)
    } else {
      const lastNote = originalSequence[originalSequence.length - 1]
      nextTime = lastNote.time + lastNote.duration
      console.log(`🚨🚨🚨 [TIMING_DEBUG]    ✅ パターン: 通常時 → 動的計算`)
      console.log(`🚨🚨🚨 [TIMING_DEBUG]    lastNote: ${lastNote ? JSON.stringify({time: lastNote.time, duration: lastNote.duration}) : 'null'}`)
      console.log(`🚨🚨🚨 [TIMING_DEBUG]    計算式: nextTime = lastNote.time + lastNote.duration`)
      console.log(`🚨🚨🚨 [TIMING_DEBUG]    計算式: nextTime = ${lastNote.time} + ${lastNote.duration} = ${nextTime}`)
      console.log(`🚨🚨🚨 [TIMING_DEBUG]    🎯 フレーズ開始位置: ${nextTime} (動的計算)`)
      console.log(`🔍 [BaseTime] 動的計算: nextTime=${nextTime} (通常時)`)
      console.log('📍 Calculating nextTime from last note:', nextTime)
    }

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
        const relativeTiming = nextNote.startTime - nextTime;

        // 📊 各予測ノート位置計算デバッグ
        console.log(`🚨🚨🚨 [TIMING_DEBUG] 予測ノート${i + 1}の位置計算:`)
        console.log(`🚨🚨🚨 [TIMING_DEBUG]    nextNote.startTime: ${nextNote.startTime} (Magentaからの絶対時刻)`)
        console.log(`🚨🚨🚨 [TIMING_DEBUG]    nextTime: ${nextTime} (フレーズ開始基準位置)`)
        console.log(`🚨🚨🚨 [TIMING_DEBUG]    計算式: timing = nextNote.startTime - nextTime`)
        console.log(`🚨🚨🚨 [TIMING_DEBUG]    計算式: timing = ${nextNote.startTime} - ${nextTime} = ${relativeTiming}`)
        console.log(`🚨🚨🚨 [TIMING_DEBUG]    🎯 予測ノート相対位置: ${relativeTiming}`)
        console.log(`🚨🚨🚨 [TIMING_DEBUG]    最終絶対位置: ${nextTime} + ${relativeTiming} = ${nextTime + relativeTiming}`)

        predictions.push({
          pitch: nextNote.pitch,
          velocity: (nextNote.velocity || 80) / 127,
          duration: Math.max(0.25, nextNote.endTime - nextNote.startTime),
          confidence: 0.9 - (i * 0.1),
          timing: relativeTiming,
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

    // 🚨 2重フィルタリング問題回避: 音楽理論フィルタリングを一時的に無効化
    // const filteredPredictions = this.applyMusicTheoryFiltering(prediction)
    const filteredPredictions = prediction // 元の予測を直接使用

    // 表示用の予測をフィルタリング（最も確率が高いものから表示個数分）
    const displayPredictions = filteredPredictions
      .sort((a, b) => b.confidence - a.confidence) // 信頼度でソート
      .slice(0, this.displayCount) // 表示個数分のみ取得

    console.log(`🎵 GhostText: Sending ${filteredPredictions.length} predictions to UI (2重フィルタリング回避版)`)

    // リスナーに通知（全予測を返す）
    this.notifyListeners('prediction', {
      predictions: filteredPredictions, // 全予測を返す（フィルタリング無効化）
      displayPredictions: displayPredictions, // 表示用も含める
      predictionTime: predictionTime,
      isCached: isCached,
      displayCount: this.displayCount,
      totalCount: filteredPredictions.length,
      musicTheoryApplied: this.enableMusicTheoryFiltering
    })

    this.notifyListeners('metrics', {
      averagePredictionTime: avgPredictionTime,
      cacheHitRate: this.performanceMetrics.cacheHitRate,
      totalPredictions: this.performanceMetrics.totalPredictions,
      modelLoadTime: this.performanceMetrics.modelLoadTime,
      displayCount: this.displayCount,
      predictionCount: this.predictionCount,
      musicTheoryFilteredCount: this.performanceMetrics.musicTheoryFilteredCount,
      scaleFilteredCount: this.performanceMetrics.scaleFilteredCount
    })

    this.lastPrediction = displayPredictions
  }

  // 予測のクリア
  clearPrediction() {
    this.lastPrediction = null
    this.notifyListeners('prediction', { predictions: [] })
  }

  // フレーズ予測のクリア
  clearPhrasePrediction() {
    console.log('🎵 clearPhrasePrediction: フレーズ予測をクリア')
    this.notifyListeners('phrasePrediction', { phraseNotes: [] })
  }

  // アクティブ状態の設定
  setActive(active) {
    console.log('🎵 setActive called:', {
      before: this.isActive,
      after: active,
      isInitialized: this.isInitialized
    })

    this.isActive = active

    const status = {
      isInitialized: this.isInitialized,
      isActive: active,
      modelType: this.modelType,
      modelName: this.magentaConfig[this.modelType]?.name || 'Unknown'
    }

    console.log('🎵 setActive完了 - 新しい状態:', status)
    this.notifyListeners('status', status)

    if (active) {
      console.log('✅ Ghost Text機能が有効化されました')
    } else {
      console.log('🔒 Ghost Text機能が無効化されました')
    }
  }

  // 設定の更新
  updateSettings(settings) {
    console.log('🎵 [DIVERSITY_DEBUG][SETTINGS_UPDATE] updateSettings呼び出し:', {
      before: {
        predictionCount: this.predictionCount,
        displayCount: this.displayCount,
        predictionThreshold: this.predictionThreshold,
        phrasePredictionEnabled: this.phrasePredictionEnabled
      },
      newSettings: settings
    })

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
      const oldPredictionCount = this.predictionCount
      this.predictionCount = Math.max(1, Math.min(10, settings.predictionCount)) // 1-10個の範囲
      console.log('🎵 [DIVERSITY_DEBUG][SETTINGS_UPDATE] predictionCount更新:', {
        requested: settings.predictionCount,
        old: oldPredictionCount,
        new: this.predictionCount,
        clamped: settings.predictionCount !== this.predictionCount
      })
    }
    if (settings.displayCount !== undefined) {
      const oldDisplayCount = this.displayCount
      this.displayCount = Math.max(1, Math.min(this.predictionCount, settings.displayCount)) // 1-予測個数の範囲
      console.log('🎵 [DIVERSITY_DEBUG][SETTINGS_UPDATE] displayCount更新:', {
        requested: settings.displayCount,
        old: oldDisplayCount,
        new: this.displayCount,
        clamped: settings.displayCount !== this.displayCount,
        maxAllowed: this.predictionCount
      })
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
    if (settings.currentModel !== undefined) {
      // 🔧 FIX: 'magenta' を 'musicRnn' にマッピング
      let targetModel = settings.currentModel
      if (targetModel === 'magenta') {
        console.log('🎵 GhostText: Mapping "magenta" to "musicRnn" in updateSettings')
        targetModel = 'musicRnn'
      }

      if (targetModel !== this.modelType) {
        console.log('🎵 GhostText: Updating model type from', this.modelType, 'to', targetModel)
        this.modelType = targetModel
      }
    }

    // 🎵 音楽理論設定の更新
    if (settings.enableMusicTheoryFiltering !== undefined) {
      this.enableMusicTheoryFiltering = settings.enableMusicTheoryFiltering
      console.log('🎵 GhostText: Music theory filtering', this.enableMusicTheoryFiltering ? 'enabled' : 'disabled')
    }

    if (settings.enableGenreWeighting !== undefined) {
      this.enableGenreWeighting = settings.enableGenreWeighting
      console.log('🎵 GhostText: Genre weighting', this.enableGenreWeighting ? 'enabled' : 'disabled')
    }

    if (settings.enableScaleConstraints !== undefined) {
      this.enableScaleConstraints = settings.enableScaleConstraints
      console.log('🎵 GhostText: Scale constraints', this.enableScaleConstraints ? 'enabled' : 'disabled')
    }

    // 音楽コンテキストの更新（musicTheorySettingsから）
    if (settings.musicTheorySettings) {
      const musicSettings = settings.musicTheorySettings
      this.updateMusicContext({
        genre: musicSettings.selectedGenre,
        scales: musicSettings.selectedScales,
        rootNote: musicSettings.rootNote
      })
    }

    // 個別の音楽設定更新
    if (settings.genre !== undefined) {
      this.updateMusicContext({ genre: settings.genre })
    }
    if (settings.scales !== undefined) {
      this.updateMusicContext({ scales: settings.scales })
    }
    if (settings.rootNote !== undefined) {
      this.updateMusicContext({ rootNote: settings.rootNote })
    }
    if (settings.currentChord !== undefined) {
      this.updateMusicContext({ currentChord: settings.currentChord })
    }
    if (settings.beatPosition !== undefined) {
      this.updateMusicContext({ beatPosition: settings.beatPosition })
    }
    if (settings.tempo !== undefined) {
      this.updateMusicContext({ tempo: settings.tempo })
    }
    if (settings.phrasePredictionEnabled !== undefined) {
      this.phrasePredictionEnabled = settings.phrasePredictionEnabled
      console.log('🎵 GhostText: Phrase prediction mode', this.phrasePredictionEnabled ? 'enabled' : 'disabled')
    }
    if (settings.timeSignature !== undefined) {
      this.timeSignature = settings.timeSignature
      console.log('🎵 GhostText: Time signature set to', `${this.timeSignature.numerator}/${this.timeSignature.denominator}`)
    }

    // 🎯 [Phase 1] 予測モード設定の更新
    if (settings.predictionMode !== undefined) {
      this.predictionMode = settings.predictionMode
      console.log('🎵 GhostText: Prediction mode set to', this.predictionMode)
    }
    if (settings.mixedModeRatio !== undefined) {
      this.mixedModeRatio = Math.max(0, Math.min(1, settings.mixedModeRatio))
      console.log('🎵 GhostText: Mixed mode ratio set to', this.mixedModeRatio)
    }
    if (settings.barBasedSwitchThreshold !== undefined) {
      this.barBasedSwitchThreshold = Math.max(1, Math.min(8, settings.barBasedSwitchThreshold))
      console.log('🎵 GhostText: Bar-based switch threshold set to', this.barBasedSwitchThreshold)
    }
  }

  // 🎼 1小節分のフレーズ予測機能

  /**
   * 拍子とテンポから1小節の長さを計算（秒単位）
   * @returns {number} 1小節の長さ（秒）
   */
  calculateBarDuration() {
    const beatsPerBar = this.timeSignature.numerator
    const beatValue = this.timeSignature.denominator
    const secondsPerBeat = 60 / this.tempo
    const secondsPerBar = (beatsPerBar * 4) / beatValue * secondsPerBeat
    return secondsPerBar
  }

  /**
   * 🎯 [Phase 1] 予測モードに応じた統合予測
   * @returns {Promise<Array>} 予測ノートの配列
   */
  async predictWithMode() {
    const mode = this.predictionMode

    console.log('🎵 [Phase 1] predictWithMode:', mode)

    switch (mode) {
      case 'phrase-only':
        // フレーズ予測のみ
        return await this.predictPhrase()

      case 'mixed':
        // フレーズ予測とGhost Textの混合
        return await this.predictMixed()

      case 'bar-based':
        // 小節に応じて自動切り替え
        return await this.predictBarBased()

      default:
        console.warn('🎵 Unknown prediction mode:', mode, 'falling back to phrase-only')
        return await this.predictPhrase()
    }
  }

  /**
   * 🎯 [Phase 1] 混合モード予測
   * フレーズ予測とGhost Textの音を混合
   * @returns {Promise<Array>} 混合予測ノートの配列
   */
  async predictMixed() {
    console.log('🎵 [Phase 1] Starting mixed prediction...')

    // フレーズ予測を取得
    const phraseNotes = await this.generateRuleBasedPhrase(this.calculateBarDuration())

    // Ghost Text予測を取得
    const ghostNotes = this.fallbackPrediction(this.currentSequence.slice(-this.contextWindow))

    // 混合比率に応じて組み合わせ
    const mixedNotes = []
    const totalCount = Math.max(phraseNotes.length, ghostNotes.length)

    for (let i = 0; i < totalCount; i++) {
      // ランダムにフレーズ予測またはGhost Textを選択
      const usePhrase = Math.random() < this.mixedModeRatio

      if (usePhrase && i < phraseNotes.length) {
        mixedNotes.push({
          ...phraseNotes[i],
          source: 'mixed-phrase'
        })
      } else if (i < ghostNotes.length) {
        mixedNotes.push({
          ...ghostNotes[i],
          source: 'mixed-ghost'
        })
      }
    }

    console.log('🎵 [Phase 1] Mixed prediction complete:', mixedNotes.length, 'notes')
    return mixedNotes
  }

  /**
   * 🎯 [Phase 1] 小節ベース予測
   * 小節数に応じてフレーズ予測とGhost Textを自動切り替え
   * @returns {Promise<Array>} 予測ノートの配列
   */
  async predictBarBased() {
    console.log('🎵 [Phase 1] Starting bar-based prediction...')

    // 現在の小節位置を計算
    const barDuration = this.calculateBarDuration()
    const currentTime = this.currentSequence.length > 0
      ? this.currentSequence[this.currentSequence.length - 1].time
      : 0
    const currentBar = Math.floor(currentTime / barDuration)

    console.log('🎵 [Phase 1] Current bar:', currentBar, 'threshold:', this.barBasedSwitchThreshold)

    // 閾値に応じて切り替え
    if (currentBar < this.barBasedSwitchThreshold) {
      // 最初の数小節はフレーズ予測
      console.log('🎵 [Phase 1] Using phrase prediction (early bars)')
      return await this.predictPhrase()
    } else {
      // それ以降はGhost Text
      console.log('🎵 [Phase 1] Using Ghost Text prediction (later bars)')
      return this.fallbackPrediction(this.currentSequence.slice(-this.contextWindow))
    }
  }

  /**
   * 1小節分のフレーズを予測
   * @returns {Promise<Array>} フレーズノートの配列
   */
  async predictPhrase() {
    if (!this.phrasePredictionEnabled) {
      console.log('🎵 Phrase prediction is disabled')
      return []
    }

    console.log('🎵 GhostText: Starting phrase prediction...')
    const barDuration = this.calculateBarDuration()
    console.log('🎵 Bar duration:', barDuration, 'seconds')

    try {
      // Magentaモデルが利用可能な場合はAI生成
      if (this.model && this.modelType !== 'fallback') {
        return await this.generateMagentaPhrase(barDuration)
      } else {
        // フォールバック: ルールベースフレーズ生成
        return this.generateRuleBasedPhrase(barDuration)
      }
    } catch (error) {
      console.error('🎵 Error in phrase prediction:', error)
      return this.generateRuleBasedPhrase(barDuration)
    }
  }

  /**
   * Magentaモデルを使用したフレーズ生成
   * @param {number} barDuration - 1小節の長さ（秒）
   * @returns {Promise<Array>} フレーズノートの配列
   */
  async generateMagentaPhrase(barDuration) {
    console.log('🎵 [DIVERSITY_DEBUG][PHRASE_ENGINE] フレーズ予測開始:', {
      barDuration,
      predictionCount: this.predictionCount,
      displayCount: this.displayCount,
      phrasePredictionEnabled: this.phrasePredictionEnabled,
      modelType: this.modelType,
      step: 'generation_start'
    })

    try {
      // シードシーケンスを作成
      const seedSequence = this.createSeedSequence()

      // MusicVAEを使用してフレーズを生成
      if (this.modelType === 'musicVae' && this.model.sample) {
        // フレーズ予測モードの場合は predictionCount を使用
        const sampleCount = this.phrasePredictionEnabled
          ? Math.max(1, this.predictionCount || 5)  // デフォルト5、最小1
          : 1  // 通常モードは1つのみ

        console.log('🎵 [DIVERSITY_DEBUG][PHRASE_ENGINE] sample()呼び出し直前:', {
          originalSampleCount: 1,  // 🔴 修正前の固定値
          newSampleCount: sampleCount,  // ✅ 修正後の動的値
          phrasePredictionEnabled: this.phrasePredictionEnabled,
          predictionCount: this.predictionCount,
          step: 'before_sample'
        })

        const samples = await this.model.sample(sampleCount)  // ✅ 修正済み

        console.log('🎵 [PHRASE_DIVERSITY] sample()呼び出し結果:', {
          samplesCount: samples?.length || 0,
          samplesType: Array.isArray(samples) ? 'array' : typeof samples,
          step: 'after_sample'
        })

        if (samples && samples.length > 0) {
          const phraseNotes = this.convertPhraseToNotes(samples[0], barDuration)

          console.log('🎵 [PHRASE_DIVERSITY] フレーズ予測完了:', {
            generatedNotesCount: phraseNotes.length,
            diversityApplied: phraseNotes.length > 1,
            step: 'generation_complete'
          })

          return phraseNotes
        }
      }

      // フォールバックにルールベース生成
      return this.generateRuleBasedPhrase(barDuration)
    } catch (error) {
      console.error('🎵 Error in Magenta phrase generation:', error)
      return this.generateRuleBasedPhrase(barDuration)
    }
  }

  /**
   * 🎯 [Phase 1] 音楽的多様性を向上させたルールベースフレーズ生成
   * @param {number} barDuration - 1小節の長さ（秒）
   * @returns {Array} フレーズノートの配列
   */
  generateRuleBasedPhrase(barDuration) {
    const beatsPerBar = this.timeSignature.numerator
    const beatDuration = barDuration / beatsPerBar
    const phraseNotes = []

    // 現在のスケールを取得
    const scale = this.musicContext.scales.length > 0
      ? this.getScaleNotes(this.musicContext.scales[0])
      : [60, 62, 64, 65, 67, 69, 71] // デフォルトでCメジャー

    // コード進行を取得
    const chordNotes = this.musicContext.currentChord?.midi_notes || [60, 64, 67]

    // 🎯 [Phase 1] 音楽的多様性の向上
    // 1. リズムパターンのバリエーション
    const rhythmPatterns = [
      [1.0, 1.0, 1.0, 1.0],           // 4分音符x4
      [0.5, 0.5, 1.0, 1.0, 1.0],      // 8分音符x2 + 4分音符x3
      [1.0, 0.5, 0.5, 1.0, 1.0],      // 4分音符 + 8分音符x2 + 4分音符x2
      [0.5, 0.5, 0.5, 0.5, 1.0, 1.0], // 8分音符x4 + 4分音符x2
      [1.0, 1.0, 0.5, 0.5, 1.0]       // 4分音符x2 + 8分音符x2 + 4分音符
    ]
    const selectedRhythm = rhythmPatterns[Math.floor(Math.random() * rhythmPatterns.length)]

    // 2. メロディの動きパターン
    const melodicMotions = ['ascending', 'descending', 'arpeggiated', 'stepwise']
    const selectedMotion = melodicMotions[Math.floor(Math.random() * melodicMotions.length)]

    let currentTime = 0
    let currentPitchIndex = Math.floor(scale.length / 2) // スケールの中央から開始

    for (let i = 0; i < selectedRhythm.length; i++) {
      const duration = selectedRhythm[i] * beatDuration

      // メロディの動きに応じてピッチを選択
      let pitch
      switch (selectedMotion) {
        case 'ascending':
          // 上昇メロディ
          currentPitchIndex = Math.min(currentPitchIndex + 1, scale.length - 1)
          pitch = scale[currentPitchIndex]
          break

        case 'descending':
          // 下降メロディ
          currentPitchIndex = Math.max(currentPitchIndex - 1, 0)
          pitch = scale[currentPitchIndex]
          break

        case 'arpeggiated':
          // アルペジオ（コード構成音）
          pitch = chordNotes[i % chordNotes.length]
          break

        case 'stepwise':
        default:
          // 順次進行（隣接する音への移動）
          const stepDirection = Math.random() > 0.5 ? 1 : -1
          currentPitchIndex = Math.max(0, Math.min(scale.length - 1, currentPitchIndex + stepDirection))
          pitch = scale[currentPitchIndex]
          break
      }

      // 強拍の判定
      const isStrongBeat = i === 0 || (i % 2 === 0 && beatsPerBar === 4)

      phraseNotes.push({
        pitch: pitch,
        velocity: 0.7 + Math.random() * 0.2, // ベロシティにバリエーション (0.7-0.9)
        duration: duration * 0.9,
        confidence: 0.85 - (i * 0.05),
        timing: currentTime,
        source: 'phrase-enhanced',
        isStrongBeat: isStrongBeat
      })

      currentTime += duration
    }

    console.log('🎵 [Phase 1] Generated enhanced rule-based phrase:', phraseNotes.length, 'notes, motion:', selectedMotion)
    return phraseNotes
  }

  /**
   * ピッチを最も近いスケール内のノートに調整
   * @param {number} pitch - MIDI ピッチ
   * @param {Array} scale - スケールノートの配列
   * @returns {number} 調整後のピッチ
   */
  adjustToScale(pitch, scale) {
    if (!scale || scale.length === 0) {
      return pitch
    }

    // 全オクターブのスケールノートを生成
    const allScaleNotes = []
    for (let octave = 0; octave < 11; octave++) {
      for (const note of scale) {
        const pitchClass = note % 12
        allScaleNotes.push(pitchClass + (octave * 12))
      }
    }

    // 最も近いスケールノートを見つける
    return this.findClosestScaleNote(pitch, allScaleNotes)
  }

  /**
   * 最も近いスケールノートを見つける
   * @param {number} pitch - MIDI ピッチ
   * @param {Array} scaleNotes - スケールノートの配列
   * @returns {number} 最も近いスケールノート
   */
  findClosestScaleNote(pitch, scaleNotes) {
    let closestNote = scaleNotes[0]
    let minDistance = Math.abs(pitch - closestNote)

    for (const note of scaleNotes) {
      const distance = Math.abs(pitch - note)
      if (distance < minDistance) {
        minDistance = distance
        closestNote = note
      }
    }

    return closestNote
  }

  /**
   * スケール名からMIDIノートの配列を取得
   * @param {string} scaleName - スケール名（例: "C Major"）
   * @returns {Array} MIDIノートの配列
   */
  getScaleNotes(scaleName) {
    // 簡易実装: メジャースケールのみサポート
    const scaleIntervals = [0, 2, 4, 5, 7, 9, 11] // メジャースケール
    const rootNote = 60 // C4
    return scaleIntervals.map(interval => rootNote + interval)
  }

  /**
   * MagentaシーケンスをフレーズノートのMIDI形式に変換
   * @param {Object} sequence - Magentaシーケンス
   * @param {number} barDuration - 1小節の長さ（秒）
   * @returns {Array} フレーズノートの配列
   */
  convertPhraseToNotes(sequence, barDuration) {
    if (!sequence || !sequence.notes || sequence.notes.length === 0) {
      return this.generateRuleBasedPhrase(barDuration)
    }

    return sequence.notes.slice(0, this.timeSignature.numerator).map((note, index) => ({
      pitch: note.pitch,
      velocity: (note.velocity || 80) / 127,
      duration: barDuration / this.timeSignature.numerator * 0.9,
      confidence: 0.85 - (index * 0.05),
      timing: (barDuration / this.timeSignature.numerator) * index,
      source: 'magenta-phrase',
      isStrongBeat: index === 0 || index === 2
    }))
  }

  /**
   * MusicVAE用のシードシーケンスを作成
   * @returns {Object} シードシーケンス
   */
  createSeedSequence() {
    const lastNotes = this.currentSequence.slice(-4)
    if (lastNotes.length === 0) {
      // デフォルトシーケンス
      return {
        notes: [
          { pitch: 60, velocity: 80, startTime: 0, endTime: 0.5 }
        ],
        totalTime: 0.5,
        tempos: [{ time: 0, qpm: this.tempo }]
      }
    }

    return this.convertToMagentaSequence(lastNotes)
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
    // 🎵 [DIVERSITY_DEBUG] 通知送信ログ
    console.log('🔔 [DIVERSITY_DEBUG][NOTIFY_SEND] notifyListeners呼び出し:', {
      eventType,
      dataKeys: Object.keys(data || {}),
      listenerCount: this.listeners.length,
      timestamp: Date.now(),
      step: 'notify_start'
    })

    // phrasePredictionイベントの詳細ログ
    if (eventType === 'phrasePrediction') {
      console.log('🎵 [DIVERSITY_DEBUG][PHRASE_NOTIFY] フレーズ通知データ:', {
        sessionId: data?.sessionId,
        phraseNotesLength: data?.phraseNotes?.length,
        locked: data?.locked,
        dataStructure: data,
        step: 'phrase_notification_data'
      })
    }

    this.listeners.forEach((listener, index) => {
      try {
        console.log(`🔔 [DIVERSITY_DEBUG][LISTENER_${index}] リスナー実行:`, {
          eventType,
          listenerIndex: index,
          step: 'listener_execution'
        })
        listener(eventType, data)
        console.log(`✅ [DIVERSITY_DEBUG][LISTENER_${index}] リスナー完了:`, {
          eventType,
          listenerIndex: index,
          step: 'listener_success'
        })
      } catch (error) {
        console.error('❌ [DIVERSITY_DEBUG][LISTENER_ERROR] リスナーエラー:', {
          eventType,
          listenerIndex: index,
          error: error.message,
          step: 'listener_error'
        })
        console.error('Error in listener:', error)
      }
    })

    console.log('🏁 [DIVERSITY_DEBUG][NOTIFY_COMPLETE] 全リスナー処理完了:', {
      eventType,
      processedCount: this.listeners.length,
      step: 'notify_complete'
    })
  }

  // ステータスの取得
  getStatus() {
    const modelName = this.modelType === 'fallback'
      ? 'Fallback Prediction'
      : this.magentaConfig[this.modelType]?.name || 'Unknown'

    // 🔧 FIX: UI表示用に musicRnn を 'magenta' にマッピング
    // 内部では musicRnn として処理されるが、UI では 'magenta' として表示
    const displayModelType = this.modelType === 'musicRnn' ? 'magenta' : this.modelType

    return {
      isInitialized: this.isInitialized,
      isActive: this.isActive,
      modelType: displayModelType,
      modelName: modelName,
      predictionSettings: {
        predictionCount: this.predictionCount,
        displayCount: this.displayCount,
        generateSequentialPredictions: this.generateSequentialPredictions,
        restProbability: this.restProbability,
        restDetectionThreshold: this.restDetectionThreshold,
        predictionMode: this.predictionMode, // 🎯 [Phase 1] 追加
        mixedModeRatio: this.mixedModeRatio,
        barBasedSwitchThreshold: this.barBasedSwitchThreshold
      },
      musicTheorySettings: {
        enabled: this.enableMusicTheoryFiltering,
        scaleConstraints: this.enableScaleConstraints,
        genreWeighting: this.enableGenreWeighting,
        currentContext: { ...this.musicContext }
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
