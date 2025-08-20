// エフェクトエンジンクラス
class EffectsEngine {
  constructor(audioContext) {
    this.audioContext = audioContext
    this.effectPresets = this.initializePresets()
  }

  // エフェクトプリセットの初期化
  initializePresets() {
    return {
      reverb: {
        'Hall': { roomSize: 3, wetLevel: 40, dampening: 0.5 },
        'Room': { roomSize: 1.5, wetLevel: 25, dampening: 0.3 },
        'Plate': { roomSize: 2, wetLevel: 35, dampening: 0.7 },
        'Spring': { roomSize: 0.8, wetLevel: 20, dampening: 0.2 }
      },
      delay: {
        'Eighth Note': { delayTime: 0.25, feedback: 0.3, wetLevel: 25 },
        'Quarter Note': { delayTime: 0.5, feedback: 0.4, wetLevel: 30 },
        'Dotted Eighth': { delayTime: 0.375, feedback: 0.35, wetLevel: 28 },
        'Slapback': { delayTime: 0.1, feedback: 0.2, wetLevel: 15 }
      },
      filter: {
        'Low Pass': { type: 'lowpass', frequency: 1000, resonance: 1 },
        'High Pass': { type: 'highpass', frequency: 200, resonance: 1 },
        'Band Pass': { type: 'bandpass', frequency: 500, resonance: 5 },
        'Notch': { type: 'notch', frequency: 1000, resonance: 10 }
      },
      compressor: {
        'Vocal': { threshold: -18, knee: 2, ratio: 4, attack: 0.003, release: 0.1 },
        'Drum': { threshold: -12, knee: 6, ratio: 8, attack: 0.001, release: 0.05 },
        'Bass': { threshold: -15, knee: 4, ratio: 6, attack: 0.01, release: 0.2 },
        'Master': { threshold: -6, knee: 2, ratio: 2, attack: 0.005, release: 0.3 }
      },
      distortion: {
        'Soft': { amount: 20, tone: 0.5, level: 0.8 },
        'Hard': { amount: 60, tone: 0.7, level: 0.6 },
        'Fuzz': { amount: 80, tone: 0.3, level: 0.5 },
        'Overdrive': { amount: 35, tone: 0.6, level: 0.7 }
      },
      chorus: {
        'Subtle': { rate: 0.5, depth: 0.3, wetLevel: 20 },
        'Classic': { rate: 1.2, depth: 0.5, wetLevel: 35 },
        'Wide': { rate: 0.8, depth: 0.7, wetLevel: 40 },
        'Fast': { rate: 2.5, depth: 0.4, wetLevel: 30 }
      }
    }
  }

  // リバーブエフェクトを作成
  createReverb(params = {}) {
    const convolver = this.audioContext.createConvolver()
    const wetGain = this.audioContext.createGain()
    const dryGain = this.audioContext.createGain()
    const outputGain = this.audioContext.createGain()

    // インパルスレスポンスを生成
    const roomSize = params.roomSize || 2
    const dampening = params.dampening || 0.5
    const impulseLength = this.audioContext.sampleRate * roomSize
    const impulse = this.audioContext.createBuffer(2, impulseLength, this.audioContext.sampleRate)
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < impulseLength; i++) {
        const decay = Math.pow(1 - i / impulseLength, dampening)
        channelData[i] = (Math.random() * 2 - 1) * decay
      }
    }
    
    convolver.buffer = impulse

    // ウェット/ドライミックス
    const wetLevel = (params.wetLevel || 30) / 100
    const dryLevel = 1 - wetLevel
    
    wetGain.gain.setValueAtTime(wetLevel, this.audioContext.currentTime)
    dryGain.gain.setValueAtTime(dryLevel, this.audioContext.currentTime)

    return {
      type: 'reverb',
      params: params,
      nodes: { convolver, wetGain, dryGain, outputGain },
      connect: (source, destination) => {
        source.connect(dryGain)
        source.connect(convolver)
        convolver.connect(wetGain)
        dryGain.connect(outputGain)
        wetGain.connect(outputGain)
        outputGain.connect(destination)
      },
      disconnect: () => {
        dryGain.disconnect()
        wetGain.disconnect()
        convolver.disconnect()
        outputGain.disconnect()
      },
      updateParams: (newParams) => {
        Object.assign(params, newParams)
        if (newParams.wetLevel !== undefined) {
          const newWetLevel = newParams.wetLevel / 100
          const newDryLevel = 1 - newWetLevel
          wetGain.gain.setValueAtTime(newWetLevel, this.audioContext.currentTime)
          dryGain.gain.setValueAtTime(newDryLevel, this.audioContext.currentTime)
        }
      }
    }
  }

  // ディレイエフェクトを作成
  createDelay(params = {}) {
    const delay = this.audioContext.createDelay(2.0)
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

    // フィードバックループ
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(wetGain)

    return {
      type: 'delay',
      params: params,
      nodes: { delay, feedback, wetGain, dryGain, outputGain },
      connect: (source, destination) => {
        source.connect(dryGain)
        source.connect(delay)
        dryGain.connect(outputGain)
        wetGain.connect(outputGain)
        outputGain.connect(destination)
      },
      disconnect: () => {
        delay.disconnect()
        feedback.disconnect()
        wetGain.disconnect()
        dryGain.disconnect()
        outputGain.disconnect()
      },
      updateParams: (newParams) => {
        Object.assign(params, newParams)
        if (newParams.delayTime !== undefined) {
          delay.delayTime.setValueAtTime(newParams.delayTime, this.audioContext.currentTime)
        }
        if (newParams.feedback !== undefined) {
          feedback.gain.setValueAtTime(newParams.feedback, this.audioContext.currentTime)
        }
        if (newParams.wetLevel !== undefined) {
          const newWetLevel = newParams.wetLevel / 100
          const newDryLevel = 1 - newWetLevel
          wetGain.gain.setValueAtTime(newWetLevel, this.audioContext.currentTime)
          dryGain.gain.setValueAtTime(newDryLevel, this.audioContext.currentTime)
        }
      }
    }
  }

  // フィルターエフェクトを作成
  createFilter(params = {}) {
    const filter = this.audioContext.createBiquadFilter()
    
    filter.type = params.type || 'lowpass'
    filter.frequency.setValueAtTime(params.frequency || 1000, this.audioContext.currentTime)
    filter.Q.setValueAtTime(params.resonance || 1, this.audioContext.currentTime)
    
    return {
      type: 'filter',
      params: params,
      nodes: { filter },
      connect: (source, destination) => {
        source.connect(filter)
        filter.connect(destination)
      },
      disconnect: () => {
        filter.disconnect()
      },
      updateParams: (newParams) => {
        Object.assign(params, newParams)
        if (newParams.frequency !== undefined) {
          filter.frequency.setValueAtTime(newParams.frequency, this.audioContext.currentTime)
        }
        if (newParams.resonance !== undefined) {
          filter.Q.setValueAtTime(newParams.resonance, this.audioContext.currentTime)
        }
        if (newParams.type !== undefined) {
          filter.type = newParams.type
        }
      }
    }
  }

  // コンプレッサーエフェクトを作成
  createCompressor(params = {}) {
    const compressor = this.audioContext.createDynamicsCompressor()
    
    compressor.threshold.setValueAtTime(params.threshold || -24, this.audioContext.currentTime)
    compressor.knee.setValueAtTime(params.knee || 30, this.audioContext.currentTime)
    compressor.ratio.setValueAtTime(params.ratio || 12, this.audioContext.currentTime)
    compressor.attack.setValueAtTime(params.attack || 0.003, this.audioContext.currentTime)
    compressor.release.setValueAtTime(params.release || 0.25, this.audioContext.currentTime)
    
    return {
      type: 'compressor',
      params: params,
      nodes: { compressor },
      connect: (source, destination) => {
        source.connect(compressor)
        compressor.connect(destination)
      },
      disconnect: () => {
        compressor.disconnect()
      },
      updateParams: (newParams) => {
        Object.assign(params, newParams)
        if (newParams.threshold !== undefined) {
          compressor.threshold.setValueAtTime(newParams.threshold, this.audioContext.currentTime)
        }
        if (newParams.knee !== undefined) {
          compressor.knee.setValueAtTime(newParams.knee, this.audioContext.currentTime)
        }
        if (newParams.ratio !== undefined) {
          compressor.ratio.setValueAtTime(newParams.ratio, this.audioContext.currentTime)
        }
        if (newParams.attack !== undefined) {
          compressor.attack.setValueAtTime(newParams.attack, this.audioContext.currentTime)
        }
        if (newParams.release !== undefined) {
          compressor.release.setValueAtTime(newParams.release, this.audioContext.currentTime)
        }
      }
    }
  }

  // ディストーションエフェクトを作成
  createDistortion(params = {}) {
    const waveshaper = this.audioContext.createWaveShaper()
    const inputGain = this.audioContext.createGain()
    const outputGain = this.audioContext.createGain()
    const toneFilter = this.audioContext.createBiquadFilter()

    // ディストーションカーブを生成
    const amount = params.amount || 50
    const samples = 44100
    const curve = new Float32Array(samples)
    const deg = Math.PI / 180
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
    }
    
    waveshaper.curve = curve
    waveshaper.oversample = '4x'

    // トーンコントロール
    toneFilter.type = 'lowpass'
    toneFilter.frequency.setValueAtTime(
      1000 + (params.tone || 0.5) * 4000, 
      this.audioContext.currentTime
    )

    // レベル調整
    outputGain.gain.setValueAtTime(params.level || 0.7, this.audioContext.currentTime)

    return {
      type: 'distortion',
      params: params,
      nodes: { waveshaper, inputGain, outputGain, toneFilter },
      connect: (source, destination) => {
        source.connect(inputGain)
        inputGain.connect(waveshaper)
        waveshaper.connect(toneFilter)
        toneFilter.connect(outputGain)
        outputGain.connect(destination)
      },
      disconnect: () => {
        inputGain.disconnect()
        waveshaper.disconnect()
        toneFilter.disconnect()
        outputGain.disconnect()
      },
      updateParams: (newParams) => {
        Object.assign(params, newParams)
        if (newParams.tone !== undefined) {
          toneFilter.frequency.setValueAtTime(
            1000 + newParams.tone * 4000, 
            this.audioContext.currentTime
          )
        }
        if (newParams.level !== undefined) {
          outputGain.gain.setValueAtTime(newParams.level, this.audioContext.currentTime)
        }
        if (newParams.amount !== undefined) {
          // カーブを再生成
          const samples = 44100
          const curve = new Float32Array(samples)
          const deg = Math.PI / 180
          
          for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1
            curve[i] = ((3 + newParams.amount) * x * 20 * deg) / (Math.PI + newParams.amount * Math.abs(x))
          }
          
          waveshaper.curve = curve
        }
      }
    }
  }

  // コーラスエフェクトを作成
  createChorus(params = {}) {
    const delay = this.audioContext.createDelay(0.1)
    const lfo = this.audioContext.createOscillator()
    const lfoGain = this.audioContext.createGain()
    const wetGain = this.audioContext.createGain()
    const dryGain = this.audioContext.createGain()
    const outputGain = this.audioContext.createGain()

    // LFO設定
    lfo.type = 'sine'
    lfo.frequency.setValueAtTime(params.rate || 1, this.audioContext.currentTime)
    
    // LFOの深度設定
    const depth = (params.depth || 0.5) * 0.01
    lfoGain.gain.setValueAtTime(depth, this.audioContext.currentTime)
    
    // ベースディレイタイム
    const baseDelay = 0.02
    delay.delayTime.setValueAtTime(baseDelay, this.audioContext.currentTime)

    // ウェット/ドライミックス
    const wetLevel = (params.wetLevel || 30) / 100
    const dryLevel = 1 - wetLevel
    
    wetGain.gain.setValueAtTime(wetLevel, this.audioContext.currentTime)
    dryGain.gain.setValueAtTime(dryLevel, this.audioContext.currentTime)

    // LFOをディレイタイムに接続
    lfo.connect(lfoGain)
    lfoGain.connect(delay.delayTime)
    lfo.start()

    return {
      type: 'chorus',
      params: params,
      nodes: { delay, lfo, lfoGain, wetGain, dryGain, outputGain },
      connect: (source, destination) => {
        source.connect(dryGain)
        source.connect(delay)
        delay.connect(wetGain)
        dryGain.connect(outputGain)
        wetGain.connect(outputGain)
        outputGain.connect(destination)
      },
      disconnect: () => {
        lfo.stop()
        delay.disconnect()
        lfoGain.disconnect()
        wetGain.disconnect()
        dryGain.disconnect()
        outputGain.disconnect()
      },
      updateParams: (newParams) => {
        Object.assign(params, newParams)
        if (newParams.rate !== undefined) {
          lfo.frequency.setValueAtTime(newParams.rate, this.audioContext.currentTime)
        }
        if (newParams.depth !== undefined) {
          lfoGain.gain.setValueAtTime(newParams.depth * 0.01, this.audioContext.currentTime)
        }
        if (newParams.wetLevel !== undefined) {
          const newWetLevel = newParams.wetLevel / 100
          const newDryLevel = 1 - newWetLevel
          wetGain.gain.setValueAtTime(newWetLevel, this.audioContext.currentTime)
          dryGain.gain.setValueAtTime(newDryLevel, this.audioContext.currentTime)
        }
      }
    }
  }

  // エフェクトを作成（ファクトリーメソッド）
  createEffect(type, params = {}) {
    switch (type) {
      case 'reverb':
        return this.createReverb(params)
      case 'delay':
        return this.createDelay(params)
      case 'filter':
        return this.createFilter(params)
      case 'compressor':
        return this.createCompressor(params)
      case 'distortion':
        return this.createDistortion(params)
      case 'chorus':
        return this.createChorus(params)
      default:
        throw new Error(`Unknown effect type: ${type}`)
    }
  }

  // プリセットを取得
  getPreset(effectType, presetName) {
    return this.effectPresets[effectType]?.[presetName] || {}
  }

  // 利用可能なエフェクトタイプを取得
  getAvailableEffectTypes() {
    return Object.keys(this.effectPresets)
  }

  // 指定されたエフェクトタイプのプリセット名を取得
  getPresetNames(effectType) {
    return Object.keys(this.effectPresets[effectType] || {})
  }
}

export default EffectsEngine

