// 統合ピアノエンジン
import { SampledPianoEngine } from './sampledPianoEngine.js'
import { PhysicalPianoEngine } from './physicalPianoEngine.js'
import { ExternalPianoEngine } from './externalPianoEngine.js'

class EnhancedPianoEngine {
  constructor() {
    this.audioContext = null
    this.currentEngine = null
    this.engineType = 'synthetic' // デフォルト
    this.engines = new Map()
    this.isInitialized = false
    this.muted = false // ミュート状態
    this.masterGain = null // マスターゲインノード
  }

  // 利用可能なエンジンタイプ
  static getAvailableEngines() {
    return [
      { id: 'synthetic', name: 'シンセティック（改良版）', description: '改良されたWeb Audio APIベース' },
      { id: 'sampled', name: 'サンプルベース', description: '実際のピアノ音をサンプリング' },
      { id: 'physical', name: '物理モデリング', description: '弦とハンマーの物理シミュレーション' },
      { id: 'external', name: '外部音源', description: 'SoundFont2/MP3ベースの高品質音源' }
    ]
  }

  // 初期化
  async initialize(audioContext, engineType = 'synthetic') {
    this.audioContext = audioContext
    this.engineType = engineType
    
    // マスターゲインノードを作成
    this.masterGain = this.audioContext.createGain()
    this.masterGain.connect(this.audioContext.destination)
    
    try {
      await this.initializeEngine(engineType)
      this.isInitialized = true
      console.log(`Enhanced piano engine initialized with ${engineType} engine`)
    } catch (error) {
      console.error('Failed to initialize enhanced piano engine:', error)
      // フォールバック: シンセティックエンジンを使用
      await this.initializeEngine('synthetic')
      this.isInitialized = true
    }
  }

  // エンジンの初期化
  async initializeEngine(engineType) {
    switch (engineType) {
      case 'sampled':
        this.currentEngine = new SampledPianoEngine()
        await this.currentEngine.initialize(this.audioContext)
        break
        
      case 'physical':
        this.currentEngine = new PhysicalPianoEngine()
        await this.currentEngine.initialize(this.audioContext)
        break
        
      case 'external':
        this.currentEngine = new ExternalPianoEngine()
        await this.currentEngine.initialize(this.audioContext)
        break
        
      case 'synthetic':
      default:
        // 既存の改良版シンセティックエンジンを使用
        this.currentEngine = this.createSyntheticEngine()
        break
    }
    
    this.engines.set(engineType, this.currentEngine)
  }

  // シンセティックエンジンの作成（既存の改良版）
  createSyntheticEngine() {
    return {
      noteOn: (midiNote, velocity = 100, duration = null) => {
        // 既存の改良版PianoInstrumentのロジックを使用
        return this.playSyntheticNote(midiNote, velocity, duration)
      },
      noteOff: (midiNote) => {
        // ノート停止処理
      },
      stopAllNotes: () => {
        // 全ノート停止処理
      }
    }
  }

  // シンセティックノート再生（既存の改良版ロジック）
  playSyntheticNote(midiNote, velocity = 100, duration = null) {
    const frequency = this.midiToFrequency(midiNote)
    const gain = (velocity <= 1 ? velocity : velocity / 100) * 0.6

    // より豊かな音色を作成
    const oscillators = []
    const gainNode = this.audioContext.createGain()
    
    // フィルターを追加
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(frequency * 8, this.audioContext.currentTime)
    filter.Q.setValueAtTime(1, this.audioContext.currentTime)

    // 基音（より豊かな波形）
    const osc1 = this.audioContext.createOscillator()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
    
    // 2倍音（少しデチューン）
    const osc2 = this.audioContext.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(frequency * 2.001, this.audioContext.currentTime)
    
    // 3倍音
    const osc3 = this.audioContext.createOscillator()
    osc3.type = 'sine'
    osc3.frequency.setValueAtTime(frequency * 3.002, this.audioContext.currentTime)
    
    // 4倍音
    const osc4 = this.audioContext.createOscillator()
    osc4.type = 'sine'
    osc4.frequency.setValueAtTime(frequency * 4, this.audioContext.currentTime)
    
    // 5倍音
    const osc5 = this.audioContext.createOscillator()
    osc5.type = 'sine'
    osc5.frequency.setValueAtTime(frequency * 5.001, this.audioContext.currentTime)

    const osc1Gain = this.audioContext.createGain()
    const osc2Gain = this.audioContext.createGain()
    const osc3Gain = this.audioContext.createGain()
    const osc4Gain = this.audioContext.createGain()
    const osc5Gain = this.audioContext.createGain()

    // より自然な倍音バランス
    osc1Gain.gain.setValueAtTime(1.0, this.audioContext.currentTime)
    osc2Gain.gain.setValueAtTime(0.4, this.audioContext.currentTime)
    osc3Gain.gain.setValueAtTime(0.15, this.audioContext.currentTime)
    osc4Gain.gain.setValueAtTime(0.08, this.audioContext.currentTime)
    osc5Gain.gain.setValueAtTime(0.04, this.audioContext.currentTime)

    // 接続
    osc1.connect(osc1Gain)
    osc2.connect(osc2Gain)
    osc3.connect(osc3Gain)
    osc4.connect(osc4Gain)
    osc5.connect(osc5Gain)

    osc1Gain.connect(gainNode)
    osc2Gain.connect(gainNode)
    osc3Gain.connect(gainNode)
    osc4Gain.connect(gainNode)
    osc5Gain.connect(gainNode)

    oscillators.push(osc1, osc2, osc3, osc4, osc5)

    // より自然なADSR エンベロープ
    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.005)
    gainNode.gain.linearRampToValueAtTime(gain * 0.8, now + 0.08)
    gainNode.gain.setValueAtTime(gain * 0.8, now + 0.08)

    // フィルターエンベロープ
    filter.frequency.setValueAtTime(frequency * 12, now)
    filter.frequency.linearRampToValueAtTime(frequency * 6, now + 0.1)
    filter.frequency.setValueAtTime(frequency * 6, now + 0.1)

    gainNode.connect(filter)
    filter.connect(this.masterGain)

    oscillators.forEach(osc => osc.start(now))

    // 短いノート（0.5秒以下）の場合のみ自動停止
    if (duration && duration <= 0.5) {
      setTimeout(() => {
        try {
          oscillators.forEach(osc => osc.stop())
        } catch (error) {
          // 既に停止している場合のエラーを無視
        }
      }, duration * 1000)
    }

    return { oscillators, gainNode, filter }
  }

  // エンジンタイプの変更
  async switchEngine(engineType) {
    if (this.engineType === engineType) return
    
    try {
      await this.initializeEngine(engineType)
      this.engineType = engineType
      console.log(`Switched to ${engineType} engine`)
    } catch (error) {
      console.error(`Failed to switch to ${engineType} engine:`, error)
      // 現在のエンジンを維持
    }
  }

  // ミュート状態の設定
  setMuted(muted) {
    this.muted = muted
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 1, this.audioContext.currentTime)
    }
    console.log('EnhancedPianoEngine: Mute state set to:', muted)
  }

  // ミュート状態の取得
  isMuted() {
    return this.muted
  }

  // ノート再生
  noteOn(midiNote, velocity = 100, duration = null) {
    // ミュート状態の場合は音を鳴らさない
    if (this.muted) {
      console.log('EnhancedPianoEngine: Track is muted, skipping note:', midiNote)
      return null
    }
    if (!this.isInitialized || !this.currentEngine) {
      console.warn('Enhanced piano engine not initialized')
      return null
    }

    return this.currentEngine.noteOn(midiNote, velocity, duration)
  }

  // ノート停止
  noteOff(midiNote) {
    if (this.currentEngine && this.currentEngine.noteOff) {
      this.currentEngine.noteOff(midiNote)
    }
  }

  // すべてのノートを停止
  stopAllNotes() {
    if (this.currentEngine && this.currentEngine.stopAllNotes) {
      this.currentEngine.stopAllNotes()
    }
  }

  // MIDIノート番号を周波数に変換
  midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12)
  }

  // 現在のエンジンタイプを取得
  getCurrentEngineType() {
    return this.engineType
  }

  // エンジンの状態を取得
  getEngineStatus() {
    return {
      type: this.engineType,
      isInitialized: this.isInitialized,
      availableEngines: EnhancedPianoEngine.getAvailableEngines()
    }
  }
}

export { EnhancedPianoEngine } 