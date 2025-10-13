// Tone.js初期化マネージャー
class ToneJSManager {
  constructor() {
    this.isLoaded = false
    this.isInitialized = false
    this.loadingPromise = null
    this.initializationPromise = null
    this.listeners = new Set()
    // @magenta/musicが使用するTone.jsのバージョンに合わせる
    this.version = '14.9.17'
    this.cdnUrl = `https://cdn.jsdelivr.net/npm/tone@${this.version}/build/Tone.js`
    
    // デバッグ用のログレベル
    this.debugLevel = 'basic' // 'none', 'basic', 'verbose'
  }

  // デバッグログ出力
  debugLog(level, message, data = null) {
    if (this.debugLevel === 'none') return
    if (this.debugLevel === 'basic' && level === 'verbose') return
    
    const timestamp = new Date().toISOString()
    const prefix = `[ToneJSManager:${timestamp}]`
    
    if (data) {
      console.log(`${prefix} ${message}`, data)
    } else {
      console.log(`${prefix} ${message}`)
    }
  }

  // イベントリスナーの管理
  addListener(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  notifyListeners(event, data) {
    this.debugLog('basic', `Notifying listeners: ${event}`, data)
    this.listeners.forEach(callback => {
      try {
        callback(event, data)
      } catch (error) {
        console.error('ToneJSManager listener error:', error)
      }
    })
  }

  // Tone.jsライブラリの動的読み込み
  async loadLibrary() {
    this.debugLog('basic', 'Starting Tone.js library loading process')
    
    // 既にTone.jsが読み込まれている場合はそれを使用
    if (window.Tone) {
      this.debugLog('basic', `Tone.js already loaded, version: ${window.Tone.version}`)
      this.isLoaded = true
      return true
    }

    if (this.loadingPromise) {
      this.debugLog('basic', 'Loading already in progress, waiting for existing promise')
      return this.loadingPromise
    }

    this.loadingPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        this.debugLog('basic', 'Window object not available')
        reject(new Error('Window object not available'))
        return
      }

      // 既にTone.jsが読み込まれている場合はそれを使用
      if (window.Tone) {
        this.debugLog('basic', `Tone.js already available, version: ${window.Tone.version}`)
        this.isLoaded = true
        resolve(true)
        return
      }

      this.debugLog('basic', 'Waiting for @magenta/music to load Tone.js...')
      
      // @magenta/musicがTone.jsを読み込む可能性があるため、より長く待機
      setTimeout(() => {
        if (window.Tone) {
          this.debugLog('basic', `Tone.js detected after 200ms delay, version: ${window.Tone.version}`)
          this.isLoaded = true
          resolve(true)
          return
        }

        this.debugLog('basic', 'Still waiting for Tone.js after 200ms...')
        
        // さらに待機して@magenta/musicの読み込みを確実に待つ
        setTimeout(() => {
          if (window.Tone) {
            this.debugLog('basic', `Tone.js detected after 700ms delay, version: ${window.Tone.version}`)
            this.isLoaded = true
            resolve(true)
            return
          }

          // 最後の手段としてCDNから読み込み
          this.debugLog('basic', 'No existing Tone.js found, loading from CDN...')
          
          const script = document.createElement('script')
          script.src = this.cdnUrl
          script.type = 'text/javascript'
          
          script.onload = () => {
            this.debugLog('basic', `Tone.js loaded from CDN as fallback, version: ${window.Tone.version}`)
            this.isLoaded = true
            this.notifyListeners('loaded', { success: true })
            resolve(true)
          }
          
          script.onerror = (error) => {
            this.debugLog('basic', 'Failed to load Tone.js from CDN', error)
            console.error('❌ Failed to load Tone.js from CDN')
            this.notifyListeners('error', { error: 'Failed to load Tone.js' })
            reject(new Error('Failed to load Tone.js'))
          }
          
          document.head.appendChild(script)
        }, 500) // さらに500ms待機
      }, 200) // 200ms待機して@magenta/musicの読み込みを待つ
    })

    try {
      await this.loadingPromise
      this.debugLog('basic', 'Tone.js library loading completed successfully')
      return true
    } catch (error) {
      this.debugLog('basic', 'Tone.js library loading failed', error)
      this.loadingPromise = null
      throw error
    }
  }

  // Tone.jsの初期化（AudioContext開始）
  async initialize() {
    this.debugLog('basic', 'Starting Tone.js initialization')
    this.debugLog('verbose', 'Current state', {
      isInitialized: this.isInitialized,
      isLoaded: this.isLoaded,
      hasTone: !!window.Tone,
      toneContextState: window.Tone?.context?.state
    })
    
    if (this.isInitialized && window.Tone && window.Tone.context.state === 'running') {
      this.debugLog('basic', 'Tone.js already initialized and running')
      return true
    }

    if (this.initializationPromise) {
      this.debugLog('basic', 'Initialization already in progress, waiting for existing promise')
      return this.initializationPromise
    }

    this.initializationPromise = (async () => {
      try {
        this.debugLog('basic', 'Loading Tone.js library...')
        // ライブラリの読み込み
        await this.loadLibrary()

        if (!window.Tone) {
          this.debugLog('basic', 'Tone.js not available after loading')
          throw new Error('Tone.js not available after loading')
        }

        this.debugLog('basic', `Using Tone.js version: ${window.Tone.version}`)

        // AudioContextの開始（ユーザーインタラクション対応）
        if (window.Tone.context.state !== 'running') {
          this.debugLog('basic', `Starting Tone.js context, current state: ${window.Tone.context.state}`)
          
          // ユーザーインタラクションが必要な場合の処理
          if (window.Tone.context.state === 'suspended') {
            this.debugLog('basic', 'AudioContext suspended, waiting for user interaction...')
            
            // ユーザーインタラクションを待つ
            await this.waitForUserInteraction()
            
            try {
              this.debugLog('basic', 'Attempting to start AudioContext...')
              await window.Tone.start()
              this.debugLog('basic', 'AudioContext started successfully after user interaction')
            } catch (e) {
              this.debugLog('basic', 'Failed to start AudioContext, trying resume...', e)
              console.warn('🎵 Failed to start AudioContext:', e)
              // 代替手段としてresumeを試行
              try {
                await window.Tone.context.resume()
                this.debugLog('basic', 'AudioContext resumed successfully')
              } catch (resumeError) {
                this.debugLog('basic', 'Failed to resume AudioContext', resumeError)
                console.warn('🎵 Failed to resume AudioContext:', resumeError)
                throw new Error('Unable to start AudioContext')
              }
            }
          }
          
          // 状態を再確認
          if (window.Tone.context.state !== 'running') {
            this.debugLog('basic', `AudioContext still not running, state: ${window.Tone.context.state}`)
            console.warn('🎵 AudioContext still not running, state:', window.Tone.context.state)
            throw new Error('AudioContext failed to start')
          }
          
          this.debugLog('basic', `Tone.js context state: ${window.Tone.context.state}`)
        } else {
          this.debugLog('basic', 'AudioContext already running')
        }

        this.isInitialized = true
        this.debugLog('basic', 'Tone.js initialization completed successfully')
        this.notifyListeners('initialized', { 
          success: true, 
          version: window.Tone.version,
          contextState: window.Tone.context.state
        })

        console.log('🎵 Tone.js ready for use')
        return true
      } catch (error) {
        this.debugLog('basic', 'Failed to initialize Tone.js', error)
        console.error('❌ Failed to initialize Tone.js:', error)
        this.notifyListeners('error', { error: error.message })
        throw error
      } finally {
        this.initializationPromise = null
      }
    })()

    return this.initializationPromise
  }

  // ユーザーインタラクションを待つ
  async waitForUserInteraction() {
    this.debugLog('basic', 'Waiting for user interaction...')
    
    return new Promise((resolve) => {
      // 既にユーザーインタラクションが発生している場合
      if (document.readyState === 'complete' && this.hasUserInteracted()) {
        this.debugLog('basic', 'User already interacted, proceeding immediately')
        resolve()
        return
      }

      // ユーザーインタラクションを監視
      const handleInteraction = () => {
        this.debugLog('basic', 'User interaction detected')
        document.removeEventListener('click', handleInteraction)
        document.removeEventListener('keydown', handleInteraction)
        document.removeEventListener('touchstart', handleInteraction)
        resolve()
      }

      document.addEventListener('click', handleInteraction)
      document.addEventListener('keydown', handleInteraction)
      document.addEventListener('touchstart', handleInteraction)
    })
  }

  // ユーザーインタラクションの確認
  hasUserInteracted() {
    // 簡単な確認方法（より詳細な実装が必要な場合は改善）
    return document.readyState === 'complete'
  }

  // 初期化状態の確認
  isReady() {
    const ready = this.isInitialized && window.Tone && window.Tone.context.state === 'running'
    // 頻繁なチェックを避けるため、verboseレベルのみでログ出力
    if (this.debugLevel === 'verbose') {
      this.debugLog('verbose', 'isReady check', {
        isInitialized: this.isInitialized,
        hasTone: !!window.Tone,
        contextState: window.Tone?.context?.state,
        ready,
        currentTime: window.Tone?.now() || 0,
        sampleRate: window.Tone?.context?.sampleRate || 0
      })
    }
    return ready
  }

  // ドラムシンセサイザーの作成
  createDrumSynth(pitch) {
    if (!this.isReady()) {
      throw new Error('Tone.js not ready')
    }

    const { Tone } = window
    
    // ドラム音色に応じた設定
    let frequency = 440 * Math.pow(2, (pitch - 69) / 12)
    let duration = 0.3

    switch (pitch) {
      case 36: // キックドラム
        frequency = 60
        duration = 0.3
        break
      case 38: // スネアドラム
        frequency = 200
        duration = 0.25
        break
      case 42: // ハイハット
        frequency = 800
        duration = 0.15
        break
      case 46: // オープンハイハット
        frequency = 300
        duration = 0.5
        break
      case 49: // クラッシュシンバル
        frequency = 800
        duration = 0.8
        break
      case 51: // ライドシンバル
        frequency = 600
        duration = 1.2
        break
    }

    const synth = new Tone.MonoSynth({
      oscillator: { type: 'square' },
      envelope: { 
        attack: 0.001, 
        decay: 0.1, 
        sustain: 0.1, 
        release: 0.3 
      }
    }).toDestination()

    return { synth, frequency, duration }
  }

  // メトロノームシンセサイザーの作成
  createMetronomeSynth() {
    if (!this.isReady()) {
      throw new Error('Tone.js not ready')
    }

    const { Tone } = window
    
    return new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0.1,
        release: 0.1
      }
    }).toDestination()
  }

  // クリーンアップ
  destroy() {
    if (window.Tone && window.Tone.context && window.Tone.context.state !== 'closed') {
      try {
        window.Tone.context.close()
      } catch (error) {
        console.warn('ToneJSManager: Error closing context:', error)
      }
    }
    this.isLoaded = false
    this.isInitialized = false
    this.loadingPromise = null
    this.initializationPromise = null
    this.listeners.clear()
  }
}

// シングルトンインスタンス
const toneJSManager = new ToneJSManager()

export default toneJSManager 