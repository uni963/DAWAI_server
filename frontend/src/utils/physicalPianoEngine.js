// 物理モデリングベースピアノエンジン
class PhysicalPianoEngine {
  constructor() {
    this.audioContext = null
    this.wasmModule = null
    this.isInitialized = false
    this.stringModels = new Map() // 弦の物理モデル
    this.hammerModels = new Map() // ハンマーの物理モデル
  }

  // WebAssemblyモジュールの初期化
  async initialize(audioContext) {
    this.audioContext = audioContext
    
    try {
      // WebAssemblyモジュールを読み込み
      const response = await fetch('/wasm/piano-physics.wasm')
      const wasmBuffer = await response.arrayBuffer()
      const wasmModule = await WebAssembly.instantiate(wasmBuffer, {
        env: {
          memory: new WebAssembly.Memory({ initial: 256 }),
          // その他の必要な関数
        }
      })
      
      this.wasmModule = wasmModule.instance
      this.isInitialized = true
      console.log('Physical piano engine initialized')
    } catch (error) {
      console.warn('Failed to load WASM module, falling back to JS implementation:', error)
      this.initializeJSFallback()
    }
  }

  // JavaScriptフォールバック実装
  initializeJSFallback() {
    this.isInitialized = true
    console.log('Using JS fallback for physical piano engine')
  }

  // 弦の物理モデル作成
  createStringModel(frequency, tension = 1.0, damping = 0.01) {
    const sampleRate = this.audioContext.sampleRate
    const stringLength = 1000 // 弦の離散化ポイント数
    const waveSpeed = frequency * 2 * stringLength / sampleRate
    
    return {
      frequency,
      tension,
      damping,
      stringLength,
      waveSpeed,
      displacement: new Float32Array(stringLength).fill(0),
      velocity: new Float32Array(stringLength).fill(0),
      sampleRate
    }
  }

  // ハンマーの物理モデル作成
  createHammerModel(mass = 1.0, stiffness = 1000, damping = 0.1) {
    return {
      mass,
      stiffness,
      damping,
      position: 0,
      velocity: 0,
      isStriking: false
    }
  }

  // 弦の物理シミュレーション
  simulateString(stringModel, hammerModel, timeStep) {
    const { displacement, velocity, waveSpeed, damping, stringLength } = stringModel
    
    // 波動方程式の数値解法（有限差分法）
    const newDisplacement = new Float32Array(stringLength)
    const newVelocity = new Float32Array(stringLength)
    
    for (let i = 1; i < stringLength - 1; i++) {
      // 波動方程式: ∂²u/∂t² = c²∂²u/∂x² - γ∂u/∂t
      const laplacian = displacement[i+1] - 2 * displacement[i] + displacement[i-1]
      const acceleration = waveSpeed * waveSpeed * laplacian - damping * velocity[i]
      
      newVelocity[i] = velocity[i] + acceleration * timeStep
      newDisplacement[i] = displacement[i] + newVelocity[i] * timeStep
    }
    
    // 境界条件（固定端）
    newDisplacement[0] = 0
    newDisplacement[stringLength - 1] = 0
    
    // ハンマーとの相互作用
    if (hammerModel.isStriking) {
      const strikePosition = Math.floor(stringLength * 0.1) // 弦の10%の位置
      const force = hammerModel.stiffness * hammerModel.position + 
                   hammerModel.damping * hammerModel.velocity
      
      newDisplacement[strikePosition] += force * timeStep * timeStep
    }
    
    stringModel.displacement = newDisplacement
    stringModel.velocity = newVelocity
  }

  // ハンマーの物理シミュレーション
  simulateHammer(hammerModel, stringModel, timeStep) {
    if (!hammerModel.isStriking) return
    
    // ハンマーの運動方程式
    const stringDisplacement = stringModel.displacement[Math.floor(stringModel.stringLength * 0.1)]
    const relativePosition = hammerModel.position - stringDisplacement
    
    if (relativePosition > 0) {
      // ハンマーが弦に接触している
      const force = hammerModel.stiffness * relativePosition + 
                   hammerModel.damping * hammerModel.velocity
      const acceleration = -force / hammerModel.mass
      
      hammerModel.velocity += acceleration * timeStep
      hammerModel.position += hammerModel.velocity * timeStep
    } else {
      // ハンマーが弦から離れている
      hammerModel.velocity *= 0.95 // 空気抵抗
      hammerModel.position += hammerModel.velocity * timeStep
      
      if (hammerModel.position < 0) {
        hammerModel.isStriking = false
        hammerModel.position = 0
        hammerModel.velocity = 0
      }
    }
  }

  // 音声出力の生成
  generateAudioOutput(stringModel, timeStep) {
    const output = new Float32Array(Math.floor(timeStep * stringModel.sampleRate))
    
    for (let i = 0; i < output.length; i++) {
      // 弦の中央付近から音を拾う
      const pickupPosition = Math.floor(stringModel.stringLength * 0.5)
      output[i] = stringModel.displacement[pickupPosition] * 0.1 // ゲイン調整
    }
    
    return output
  }

  // ノート再生
  noteOn(midiNote, velocity = 100, duration = null) {
    if (!this.isInitialized) {
      console.warn('Physical piano engine not initialized')
      return null
    }

    const frequency = this.midiToFrequency(midiNote)
    const timeStep = 1.0 / this.audioContext.sampleRate
    
    // 弦モデルとハンマーモデルを作成
    const stringModel = this.createStringModel(frequency)
    const hammerModel = this.createHammerModel()
    
    // ハンマーを弦に打撃
    hammerModel.isStriking = true
    hammerModel.position = 0.1 // 初期位置
    hammerModel.velocity = -(velocity <= 1 ? velocity : velocity / 100) * 10 // 打撃速度
    
    // 音声バッファを作成
    const bufferSize = Math.floor(duration * this.audioContext.sampleRate)
    const audioBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const channelData = audioBuffer.getChannelData(0)
    
    // 物理シミュレーション実行
    for (let i = 0; i < bufferSize; i++) {
      this.simulateString(stringModel, hammerModel, timeStep)
      this.simulateHammer(hammerModel, stringModel, timeStep)
      
      const pickupPosition = Math.floor(stringModel.stringLength * 0.5)
      channelData[i] = stringModel.displacement[pickupPosition] * 0.1
    }
    
    // 音源を作成
    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    
    // ゲインノードを作成
    const gainNode = this.audioContext.createGain()
    const gain = (velocity <= 1 ? velocity : velocity / 100) * 0.8
    gainNode.gain.setValueAtTime(gain, this.audioContext.currentTime)
    
    // 接続
    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    // 再生開始
    source.start()
    
    return { source, gainNode }
  }

  // MIDIノート番号を周波数に変換
  midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12)
  }

  // すべてのノートを停止
  stopAllNotes() {
    // 実装は必要に応じて追加
  }
}

export { PhysicalPianoEngine } 