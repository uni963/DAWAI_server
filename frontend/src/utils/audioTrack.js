// オーディオトラック管理クラス
class AudioTrack {
  constructor(id, name, type = 'audio', color = 'blue') {
    this.id = id
    this.name = name
    this.type = type // 'audio', 'midi', 'instrument'
    this.color = color
    this.volume = 75
    this.pan = 0
    this.muted = false
    this.solo = false
    this.armed = false // 録音待機状態
    this.clips = [] // オーディオクリップ
    this.effects = [] // エフェクトチェーン
    this.gainNode = null
    this.panNode = null
    this.effectNodes = []
    this.audioContext = null
  }

  // AudioContextを設定
  setAudioContext(audioContext) {
    this.audioContext = audioContext
    this.setupAudioNodes()
  }

  // オーディオノードの初期化
  setupAudioNodes() {
    if (!this.audioContext) return

    // ゲインノード（音量制御）
    this.gainNode = this.audioContext.createGain()
    this.gainNode.gain.setValueAtTime(this.volume / 100, this.audioContext.currentTime)

    // パンナーノード（左右バランス制御）
    this.panNode = this.audioContext.createStereoPanner()
    this.panNode.pan.setValueAtTime(this.pan / 100, this.audioContext.currentTime)

    // ノードを接続
    this.gainNode.connect(this.panNode)
  }

  // 音量設定
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(100, volume))
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.volume / 100, this.audioContext.currentTime)
    }
  }

  // パン設定
  setPan(pan) {
    this.pan = Math.max(-100, Math.min(100, pan))
    if (this.panNode) {
      this.panNode.pan.setValueAtTime(this.pan / 100, this.audioContext.currentTime)
    }
  }

  // ミュート切り替え
  toggleMute() {
    this.muted = !this.muted
    if (this.gainNode) {
      const targetVolume = this.muted ? 0 : this.volume / 100
      this.gainNode.gain.setValueAtTime(targetVolume, this.audioContext.currentTime)
    }
  }

  // ソロ切り替え
  toggleSolo() {
    this.solo = !this.solo
  }

  // 録音待機切り替え
  toggleArm() {
    this.armed = !this.armed
  }

  // オーディオクリップを追加
  addClip(clip) {
    this.clips.push(clip)
  }

  // オーディオクリップを削除
  removeClip(clipId) {
    this.clips = this.clips.filter(clip => clip.id !== clipId)
  }

  // エフェクトを追加
  addEffect(effect) {
    this.effects.push(effect)
    this.rebuildEffectChain()
  }

  // エフェクトを削除
  removeEffect(effectId) {
    this.effects = this.effects.filter(effect => effect.id !== effectId)
    this.rebuildEffectChain()
  }

  // エフェクトチェーンを再構築
  rebuildEffectChain() {
    if (!this.audioContext) return

    // 既存のエフェクトノードを切断
    this.effectNodes.forEach(node => {
      if (node.disconnect) node.disconnect()
    })
    this.effectNodes = []

    // エフェクトノードを作成・接続
    let previousNode = this.gainNode
    
    this.effects.forEach(effect => {
      const effectNode = this.createEffectNode(effect)
      if (effectNode) {
        previousNode.connect(effectNode)
        this.effectNodes.push(effectNode)
        previousNode = effectNode
      }
    })

    // 最後のノードをパンナーに接続
    previousNode.connect(this.panNode)
  }

  // エフェクトノードを作成
  createEffectNode(effect) {
    if (!this.audioContext) return null

    switch (effect.type) {
      case 'reverb':
        return this.createReverbNode(effect.params)
      case 'delay':
        return this.createDelayNode(effect.params)
      case 'filter':
        return this.createFilterNode(effect.params)
      case 'compressor':
        return this.createCompressorNode(effect.params)
      default:
        return null
    }
  }

  // リバーブノードを作成
  createReverbNode(params = {}) {
    const convolver = this.audioContext.createConvolver()
    const wetGain = this.audioContext.createGain()
    const dryGain = this.audioContext.createGain()
    const outputGain = this.audioContext.createGain()

    // インパルスレスポンスを生成（簡易リバーブ）
    const impulseLength = this.audioContext.sampleRate * (params.roomSize || 2)
    const impulse = this.audioContext.createBuffer(2, impulseLength, this.audioContext.sampleRate)
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < impulseLength; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2)
      }
    }
    
    convolver.buffer = impulse

    // ウェット/ドライミックス
    const wetLevel = (params.wetLevel || 30) / 100
    const dryLevel = 1 - wetLevel
    
    wetGain.gain.setValueAtTime(wetLevel, this.audioContext.currentTime)
    dryGain.gain.setValueAtTime(dryLevel, this.audioContext.currentTime)

    // 接続
    // 入力 -> ドライゲイン -> 出力
    // 入力 -> コンボルバー -> ウェットゲイン -> 出力
    return {
      input: (source) => {
        source.connect(dryGain)
        source.connect(convolver)
        convolver.connect(wetGain)
        dryGain.connect(outputGain)
        wetGain.connect(outputGain)
      },
      connect: (destination) => outputGain.connect(destination),
      disconnect: () => {
        dryGain.disconnect()
        wetGain.disconnect()
        convolver.disconnect()
        outputGain.disconnect()
      }
    }
  }

  // ディレイノードを作成
  createDelayNode(params = {}) {
    const delay = this.audioContext.createDelay(1.0)
    const feedback = this.audioContext.createGain()
    const wetGain = this.audioContext.createGain()
    const dryGain = this.audioContext.createGain()
    const outputGain = this.audioContext.createGain()

    // パラメータ設定
    delay.delayTime.setValueAtTime(params.delayTime || 0.3, this.audioContext.currentTime)
    feedback.gain.setValueAtTime(params.feedback || 0.3, this.audioContext.currentTime)
    
    const wetLevel = (params.wetLevel || 30) / 100
    const dryLevel = 1 - wetLevel
    
    wetGain.gain.setValueAtTime(wetLevel, this.audioContext.currentTime)
    dryGain.gain.setValueAtTime(dryLevel, this.audioContext.currentTime)

    // 接続
    // 入力 -> ディレイ -> フィードバック -> ディレイ（フィードバックループ）
    // 入力 -> ドライゲイン -> 出力
    // ディレイ -> ウェットゲイン -> 出力
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(wetGain)

    return {
      input: (source) => {
        source.connect(dryGain)
        source.connect(delay)
        dryGain.connect(outputGain)
        wetGain.connect(outputGain)
      },
      connect: (destination) => outputGain.connect(destination),
      disconnect: () => {
        delay.disconnect()
        feedback.disconnect()
        wetGain.disconnect()
        dryGain.disconnect()
        outputGain.disconnect()
      }
    }
  }

  // フィルターノードを作成
  createFilterNode(params = {}) {
    const filter = this.audioContext.createBiquadFilter()
    
    filter.type = params.type || 'lowpass'
    filter.frequency.setValueAtTime(params.frequency || 1000, this.audioContext.currentTime)
    filter.Q.setValueAtTime(params.resonance || 1, this.audioContext.currentTime)
    
    return filter
  }

  // コンプレッサーノードを作成
  createCompressorNode(params = {}) {
    const compressor = this.audioContext.createDynamicsCompressor()
    
    compressor.threshold.setValueAtTime(params.threshold || -24, this.audioContext.currentTime)
    compressor.knee.setValueAtTime(params.knee || 30, this.audioContext.currentTime)
    compressor.ratio.setValueAtTime(params.ratio || 12, this.audioContext.currentTime)
    compressor.attack.setValueAtTime(params.attack || 0.003, this.audioContext.currentTime)
    compressor.release.setValueAtTime(params.release || 0.25, this.audioContext.currentTime)
    
    return compressor
  }

  // 出力ノードを取得
  getOutputNode() {
    return this.panNode || this.gainNode
  }

  // トラックの状態をシリアライズ
  serialize() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      color: this.color,
      volume: this.volume,
      pan: this.pan,
      muted: this.muted,
      solo: this.solo,
      armed: this.armed,
      clips: this.clips.map(clip => clip.serialize ? clip.serialize() : clip),
      effects: this.effects
    }
  }

  // シリアライズされたデータからトラックを復元
  static deserialize(data, audioContext) {
    const track = new AudioTrack(data.id, data.name, data.type, data.color)
    track.volume = data.volume || 75
    track.pan = data.pan || 0
    track.muted = data.muted || false
    track.solo = data.solo || false
    track.armed = data.armed || false
    track.clips = data.clips || []
    track.effects = data.effects || []
    
    if (audioContext) {
      track.setAudioContext(audioContext)
    }
    
    return track
  }
}

export default AudioTrack

