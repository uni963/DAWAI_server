// 楽器エンジンクラス
import { SampledPianoEngine } from './sampledPianoEngine.js'

class InstrumentEngine {
  constructor() {
    this.audioContext = null
    this.instruments = new Map()
    this.currentInstrument = 'piano'
    this.sampledPianoEngine = null
    this.muted = false // ミュート状態
  }

  // AudioContextを設定して初期化
  async initialize(audioContext) {
    this.audioContext = audioContext
    
    // サンプルベースピアノエンジンを初期化
    this.sampledPianoEngine = new SampledPianoEngine()
    await this.sampledPianoEngine.initialize(audioContext)
    
    this.initializeInstruments()
  }

  // マスターゲインを設定
  setMasterGain(masterGain) {
    this.masterGain = masterGain
    // 各楽器のマスターゲインを更新
    this.instruments.forEach(instrument => {
      if (instrument.masterGain) {
        instrument.masterGain.disconnect()
        instrument.masterGain.connect(this.masterGain)
      }
    })
  }

  // 現在の楽器を設定
  setCurrentInstrument(instrumentType) {
    this.currentInstrument = instrumentType
  }



  // 楽器の初期化
  initializeInstruments() {
    this.instruments.set('piano', new PianoInstrument(this.audioContext, this.sampledPianoEngine))
    this.instruments.set('drums', new DrumInstrument(this.audioContext))
    this.instruments.set('bass', new BassInstrument(this.audioContext))
    this.instruments.set('lead', new LeadInstrument(this.audioContext))
    this.instruments.set('pad', new PadInstrument(this.audioContext))
    this.instruments.set('fx', new FXInstrument(this.audioContext))
    
    // マスターゲインが設定されている場合は接続
    if (this.masterGain) {
      this.instruments.forEach(instrument => {
        if (instrument.masterGain) {
          instrument.masterGain.connect(this.masterGain)
        }
      })
    }
  }

  // 楽器を取得
  getInstrument(type) {
    return this.instruments.get(type)
  }

  // 利用可能な楽器タイプを取得
  getAvailableInstruments() {
    return Array.from(this.instruments.keys())
  }

  // ミュート状態の設定
  setMuted(muted) {
    this.muted = muted
    console.log('InstrumentEngine: Mute state set to:', muted)
  }

  // ミュート状態の取得
  isMuted() {
    return this.muted
  }

  // ノートオン
  noteOn(instrumentType, midiNote, velocity = 100, duration = null) {
    // ミュート状態の場合は音を鳴らさない
    if (this.muted) {
      console.log('InstrumentEngine: Track is muted, skipping note:', midiNote)
      return null
    }
    
    const instrument = this.instruments.get(instrumentType)
    if (instrument) {
      return instrument.noteOn(midiNote, velocity, duration)
    }
  }

  // ノートオフ
  noteOff(instrumentType, midiNote) {
    const instrument = this.instruments.get(instrumentType)
    if (instrument) {
      instrument.noteOff(midiNote)
    }
  }

  // すべてのノートを停止
  stopAllNotes(instrumentType = null) {
    if (instrumentType) {
      const instrument = this.instruments.get(instrumentType)
      if (instrument) {
        instrument.stopAllNotes()
      }
    } else {
      this.instruments.forEach(instrument => instrument.stopAllNotes())
    }
  }

  // ノートをスケジュール（Web Audio APIのスケジューリングを使用）
  scheduleNote(instrumentType, midiNote, velocity, startTime, endTime) {
    // ミュート状態の場合は音を鳴らさない
    if (this.muted) {
      console.log('InstrumentEngine: Track is muted, skipping scheduled note:', midiNote)
      return null
    }
    
    const instrument = this.instruments.get(instrumentType)
    if (instrument && instrument.scheduleNote) {
      return instrument.scheduleNote(midiNote, velocity, startTime, endTime)
    } else {
      // フォールバック: 即座にノートを再生
      const duration = endTime - startTime
      return this.noteOn(instrumentType, midiNote, velocity, duration)
    }
  }
}

// ベース楽器クラス
class BaseInstrument {
  constructor(audioContext) {
    this.audioContext = audioContext
    this.activeNotes = new Map()
    this.masterGain = audioContext.createGain()
    this.masterGain.gain.setValueAtTime(0.7, audioContext.currentTime)
    this.muted = false // ミュート状態
  }

  // ミュート状態の設定
  setMuted(muted) {
    this.muted = muted
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.audioContext.currentTime)
    }
    console.log('BaseInstrument: Mute state set to:', muted)
  }

  // ミュート状態の取得
  isMuted() {
    return this.muted
  }

  // MIDIノート番号を周波数に変換
  midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12)
  }

  // 基本的なノートオフ実装
  noteOff(midiNote) {
    console.log(`🎹 BaseInstrument noteOff called for MIDI note ${midiNote}`)
    if (!this.activeNotes.has(midiNote)) {
      console.log(`🎹 Note ${midiNote} not found in activeNotes`)
      return
    }

    const noteData = this.activeNotes.get(midiNote)
    
    // 即座に音を停止
    const now = this.audioContext.currentTime
    
    if (noteData.gainNode) {
      noteData.gainNode.gain.cancelScheduledValues(now)
      noteData.gainNode.gain.setValueAtTime(noteData.gainNode.gain.value, now)
      noteData.gainNode.gain.linearRampToValueAtTime(0, now + 0.05) // より短いリリース
    }
    
    // オシレーターを即座に停止
    if (noteData.oscillator) {
      try {
        noteData.oscillator.stop(now + 0.05)
      } catch (error) {
        console.log(`🎹 Oscillator already stopped for note ${midiNote}`)
      }
    }
    
    // 複数のオシレーターの場合
    if (noteData.oscillators) {
      noteData.oscillators.forEach(osc => {
        try {
          osc.stop(now + 0.05)
        } catch (error) {
          console.log(`🎹 Oscillator in array already stopped for note ${midiNote}`)
        }
      })
    }
    
    this.activeNotes.delete(midiNote)
    console.log(`🎹 Note ${midiNote} immediately stopped and removed from activeNotes`)
  }

  // すべてのノートを停止
  stopAllNotes() {
    for (const midiNote of this.activeNotes.keys()) {
      this.noteOff(midiNote)
    }
  }

  // ノートのリリース処理
  releaseNote(noteData) {
    const { gainNode } = noteData
    const now = this.audioContext.currentTime
    
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(gainNode.gain.value, now)
    gainNode.gain.linearRampToValueAtTime(0, now + 0.1)

    setTimeout(() => {
      try {
        if (noteData.oscillator) noteData.oscillator.stop()
        if (noteData.source) noteData.source.stop()
      } catch (error) {
        // 既に停止している場合のエラーを無視
      }
    }, 100)
  }

  // 出力ノードを取得
  getOutputNode() {
    return this.masterGain
  }
}

// ピアノ楽器（サンプルベース音源対応）
class PianoInstrument extends BaseInstrument {
  constructor(audioContext, sampledPianoEngine = null) {
    super(audioContext)
    this.sampledPianoEngine = sampledPianoEngine
  }

  noteOn(midiNote, velocity = 100, duration = null) {
    // ミュート状態の場合は音を鳴らさない
    if (this.muted) {
      console.log('PianoInstrument: Track is muted, skipping note:', midiNote)
      return null
    }
    
    console.log(`🎹 PianoInstrument noteOn called for MIDI note ${midiNote} with velocity ${velocity}, duration ${duration}`)
    // サンプルベース音源が利用可能な場合は優先使用
    if (this.sampledPianoEngine && this.sampledPianoEngine.isLoaded) {
      console.log(`🎹 Using sampled piano engine for note ${midiNote}`)
      return this.sampledPianoEngine.noteOn(midiNote, velocity, duration)
    }
    // フォールバック: シンセティック音源
    console.log(`🎹 Using synthetic piano for note ${midiNote}`)
    return this.playSyntheticNote(midiNote, velocity, duration)
  }

  noteOff(midiNote) {
    console.log(`🎹 PianoInstrument noteOff called for MIDI note ${midiNote}`)
    
    // サンプルベース音源が利用可能な場合は優先使用
    if (this.sampledPianoEngine && this.sampledPianoEngine.isLoaded) {
      console.log(`🎹 Using sampled piano engine noteOff for note ${midiNote}`)
      this.sampledPianoEngine.noteOff(midiNote)
      return
    }
    
    // フォールバック: シンセティック音源
    super.noteOff(midiNote)
  }

  // シンセティックノート再生（既存の改良版）
  playSyntheticNote(midiNote, velocity = 100, duration = null) {
    if (this.activeNotes.has(midiNote)) {
      this.noteOff(midiNote)
    }

    const frequency = this.midiToFrequency(midiNote)
    const gain = (velocity <= 1 ? velocity : velocity / 100) * 0.6

    // より豊かな音色を作成
    const oscillators = []
    const gainNode = this.audioContext.createGain()
    
    // フィルターを追加（ピアノの音色特性を模倣）
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(frequency * 8, this.audioContext.currentTime)
    filter.Q.setValueAtTime(1, this.audioContext.currentTime)

    // 基音（より豊かな波形）
    const osc1 = this.audioContext.createOscillator()
    osc1.type = 'triangle' // より豊かな倍音を持つ波形
    osc1.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
    
    // 2倍音（少しデチューンして自然さを演出）
    const osc2 = this.audioContext.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(frequency * 2.001, this.audioContext.currentTime) // わずかにデチューン
    
    // 3倍音
    const osc3 = this.audioContext.createOscillator()
    osc3.type = 'sine'
    osc3.frequency.setValueAtTime(frequency * 3.002, this.audioContext.currentTime) // わずかにデチューン
    
    // 4倍音（高音域の輝き）
    const osc4 = this.audioContext.createOscillator()
    osc4.type = 'sine'
    osc4.frequency.setValueAtTime(frequency * 4, this.audioContext.currentTime)
    
    // 5倍音（さらに豊かな音色）
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
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.005) // より速いアタック
    gainNode.gain.linearRampToValueAtTime(gain * 0.8, now + 0.08) // より自然なディケイ
    gainNode.gain.setValueAtTime(gain * 0.8, now + 0.08) // サステイン

    // フィルターエンベロープ（ピアノの音色変化を模倣）
    filter.frequency.setValueAtTime(frequency * 12, now)
    filter.frequency.linearRampToValueAtTime(frequency * 6, now + 0.1)
    filter.frequency.setValueAtTime(frequency * 6, now + 0.1)

    gainNode.connect(filter)
    filter.connect(this.masterGain)

    oscillators.forEach(osc => osc.start(now))

    this.activeNotes.set(midiNote, {
      oscillators,
      gainNode,
      filter,
      startTime: now
    })

    // 長いノートの場合は自動停止しない（手動でnoteOffを呼ぶまで継続）
    // 短いノート（0.5秒以下）の場合のみ自動停止
    if (duration && duration <= 0.5) {
      setTimeout(() => this.noteOff(midiNote), duration * 1000)
    }

    return { oscillators, gainNode, filter }
  }

  releaseNote(noteData) {
    const { gainNode, oscillators, filter } = noteData
    const now = this.audioContext.currentTime
    
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(gainNode.gain.value, now)
    gainNode.gain.linearRampToValueAtTime(0, now + 0.4) // より長いリリース

    // フィルターもリリース時に変化
    if (filter) {
      filter.frequency.cancelScheduledValues(now)
      filter.frequency.setValueAtTime(filter.frequency.value, now)
      filter.frequency.linearRampToValueAtTime(filter.frequency.value * 0.5, now + 0.4)
    }

    setTimeout(() => {
      try {
        oscillators.forEach(osc => osc.stop())
      } catch (error) {
        // 既に停止している場合のエラーを無視
      }
    }, 400)
  }

  // スケジュールされたノート再生
  scheduleNote(midiNote, velocity, startTime, endTime) {
    // サンプルベース音源が利用可能な場合は優先使用
    if (this.sampledPianoEngine && this.sampledPianoEngine.isLoaded) {
      const duration = endTime - startTime
      return this.sampledPianoEngine.noteOn(midiNote, velocity, duration)
    }
    
    // フォールバック: シンセティック音源
    const frequency = this.midiToFrequency(midiNote)
    const gain = (velocity <= 1 ? velocity : velocity / 100) * 0.6

    // より豊かな音色を作成
    const oscillators = []
    const gainNode = this.audioContext.createGain()
    
    // フィルターを追加
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(frequency * 8, startTime)
    filter.Q.setValueAtTime(1, startTime)

    // 基音（より豊かな波形）
    const osc1 = this.audioContext.createOscillator()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(frequency, startTime)
    
    // 2倍音（少しデチューン）
    const osc2 = this.audioContext.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(frequency * 2.001, startTime)
    
    // 3倍音
    const osc3 = this.audioContext.createOscillator()
    osc3.type = 'sine'
    osc3.frequency.setValueAtTime(frequency * 3.002, startTime)
    
    // 4倍音
    const osc4 = this.audioContext.createOscillator()
    osc4.type = 'sine'
    osc4.frequency.setValueAtTime(frequency * 4, startTime)
    
    // 5倍音
    const osc5 = this.audioContext.createOscillator()
    osc5.type = 'sine'
    osc5.frequency.setValueAtTime(frequency * 5.001, startTime)

    const osc1Gain = this.audioContext.createGain()
    const osc2Gain = this.audioContext.createGain()
    const osc3Gain = this.audioContext.createGain()
    const osc4Gain = this.audioContext.createGain()
    const osc5Gain = this.audioContext.createGain()

    // より自然な倍音バランス
    osc1Gain.gain.setValueAtTime(1.0, startTime)
    osc2Gain.gain.setValueAtTime(0.4, startTime)
    osc3Gain.gain.setValueAtTime(0.15, startTime)
    osc4Gain.gain.setValueAtTime(0.08, startTime)
    osc5Gain.gain.setValueAtTime(0.04, startTime)

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
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.005)
    gainNode.gain.linearRampToValueAtTime(gain * 0.8, startTime + 0.08)
    gainNode.gain.setValueAtTime(gain * 0.8, startTime + 0.08)
    gainNode.gain.linearRampToValueAtTime(0, endTime)

    // フィルターエンベロープ
    filter.frequency.setValueAtTime(frequency * 12, startTime)
    filter.frequency.linearRampToValueAtTime(frequency * 6, startTime + 0.1)
    filter.frequency.setValueAtTime(frequency * 6, startTime + 0.1)
    filter.frequency.linearRampToValueAtTime(frequency * 3, endTime)

    gainNode.connect(filter)
    filter.connect(this.masterGain)

    oscillators.forEach(osc => {
      osc.start(startTime)
      osc.stop(endTime)
    })

    this.activeNotes.set(midiNote, {
      oscillators,
      gainNode,
      filter,
      startTime: startTime
    })

    return { oscillators, gainNode, filter }
  }
}

// ドラム楽器
class DrumInstrument extends BaseInstrument {
  constructor(audioContext) {
    super(audioContext)
    this.drumSamples = this.createDrumSamples()
  }

  // ドラムサンプルを作成（シンセティック）
  createDrumSamples() {
    return {
      36: this.createKickSample(),     // Kick
      38: this.createSnareSample(),    // Snare
      42: this.createHiHatSample(),    // Hi-hat closed
      46: this.createHiHatSample(true), // Hi-hat open
      49: this.createCymbalSample(),   // Crash
      51: this.createCymbalSample(true) // Ride
    }
  }

  noteOn(midiNote, velocity = 100, duration = null) {
    const sampleGenerator = this.drumSamples[midiNote]
    if (!sampleGenerator) {
      // 未定義のドラムサウンドの場合、デフォルトのクリック音
      return this.playClickSound(velocity)
    }

    const gain = (velocity / 127) * 0.8
    const { source, gainNode } = sampleGenerator(gain)
    
    gainNode.connect(this.masterGain)
    source.start()

    // ドラムは自動的に停止するので、activeNotesに追加しない
    return { source, gainNode }
  }

  // キックドラムサンプル生成
  createKickSample() {
    return (gain) => {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      const filter = this.audioContext.createBiquadFilter()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.1)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(100, this.audioContext.currentTime)

      const now = this.audioContext.currentTime
      gainNode.gain.setValueAtTime(gain, now)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

      oscillator.connect(filter)
      filter.connect(gainNode)

      oscillator.start(now)
      oscillator.stop(now + 0.3)

      return { source: oscillator, gainNode }
    }
  }

  // スネアドラムサンプル生成
  createSnareSample() {
    return (gain) => {
      const oscillator = this.audioContext.createOscillator()
      const noise = this.createNoiseSource()
      const gainNode = this.audioContext.createGain()
      const filter = this.audioContext.createBiquadFilter()

      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime)

      filter.type = 'highpass'
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime)

      const now = this.audioContext.currentTime
      gainNode.gain.setValueAtTime(gain, now)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

      oscillator.connect(gainNode)
      noise.connect(filter)
      filter.connect(gainNode)

      oscillator.start(now)
      noise.start(now)
      oscillator.stop(now + 0.2)
      noise.stop(now + 0.2)

      return { source: oscillator, gainNode }
    }
  }

  // ハイハットサンプル生成
  createHiHatSample(open = false) {
    return (gain) => {
      const noise = this.createNoiseSource()
      const gainNode = this.audioContext.createGain()
      const filter = this.audioContext.createBiquadFilter()

      filter.type = 'highpass'
      filter.frequency.setValueAtTime(8000, this.audioContext.currentTime)

      const duration = open ? 0.3 : 0.1
      const now = this.audioContext.currentTime
      gainNode.gain.setValueAtTime(gain * 0.5, now)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)

      noise.connect(filter)
      filter.connect(gainNode)

      noise.start(now)
      noise.stop(now + duration)

      return { source: noise, gainNode }
    }
  }

  // シンバルサンプル生成
  createCymbalSample(ride = false) {
    return (gain) => {
      const noise = this.createNoiseSource()
      const gainNode = this.audioContext.createGain()
      const filter = this.audioContext.createBiquadFilter()

      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(ride ? 3000 : 5000, this.audioContext.currentTime)
      filter.Q.setValueAtTime(0.5, this.audioContext.currentTime)

      const duration = ride ? 1.0 : 0.8
      const now = this.audioContext.currentTime
      gainNode.gain.setValueAtTime(gain * 0.6, now)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)

      noise.connect(filter)
      filter.connect(gainNode)

      noise.start(now)
      noise.stop(now + duration)

      return { source: noise, gainNode }
    }
  }

  // ノイズソースを作成
  createNoiseSource() {
    const bufferSize = this.audioContext.sampleRate * 0.1
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    return source
  }

  // クリック音を再生
  playClickSound(velocity) {
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime)

    const gain = (velocity / 127) * 0.3
    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(gain, now)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    oscillator.connect(gainNode)
    gainNode.connect(this.masterGain)

    oscillator.start(now)
    oscillator.stop(now + 0.05)

    return { source: oscillator, gainNode }
  }
}

// ベース楽器
class BassInstrument extends BaseInstrument {
  noteOn(midiNote, velocity = 100, duration = null) {
    if (this.activeNotes.has(midiNote)) {
      this.noteOff(midiNote)
    }

    const frequency = this.midiToFrequency(midiNote)
    const gain = (velocity / 127) * 0.8

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    // サブベースのための低音強調
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(frequency * 4, this.audioContext.currentTime)
    filter.Q.setValueAtTime(2, this.audioContext.currentTime)

    // パンチのあるエンベロープ
    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.005) // 速いアタック
    gainNode.gain.linearRampToValueAtTime(gain * 0.8, now + 0.05) // 短いディケイ
    gainNode.gain.setValueAtTime(gain * 0.8, now + 0.05) // サステイン

    oscillator.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.masterGain)

    oscillator.start(now)

    this.activeNotes.set(midiNote, {
      oscillator,
      gainNode,
      startTime: now
    })

    // 長いノートの場合は自動停止しない（手動でnoteOffを呼ぶまで継続）
    // 短いノート（0.5秒以下）の場合のみ自動停止
    if (duration && duration <= 0.5) {
      setTimeout(() => this.noteOff(midiNote), duration * 1000)
    }

    return { oscillator, gainNode }
  }

  releaseNote(noteData) {
    const { gainNode, oscillator } = noteData
    const now = this.audioContext.currentTime
    
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(gainNode.gain.value, now)
    gainNode.gain.linearRampToValueAtTime(0, now + 0.1) // 短いリリース

    setTimeout(() => {
      try {
        oscillator.stop()
      } catch (error) {
        // 既に停止している場合のエラーを無視
      }
    }, 100)
  }
}

// リード楽器
class LeadInstrument extends BaseInstrument {
  noteOn(midiNote, velocity = 100, duration = null) {
    if (this.activeNotes.has(midiNote)) {
      this.noteOff(midiNote)
    }

    const frequency = this.midiToFrequency(midiNote)
    const gain = (velocity / 127) * 0.5

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()
    const lfo = this.audioContext.createOscillator()
    const lfoGain = this.audioContext.createGain()

    // メインオシレーター
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)

    // フィルター（明るい音色）
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(frequency * 8, this.audioContext.currentTime)
    filter.Q.setValueAtTime(5, this.audioContext.currentTime)

    // LFO（ビブラート）
    lfo.type = 'sine'
    lfo.frequency.setValueAtTime(5, this.audioContext.currentTime)
    lfoGain.gain.setValueAtTime(frequency * 0.02, this.audioContext.currentTime)

    // エンベロープ
    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.02) // アタック
    gainNode.gain.linearRampToValueAtTime(gain * 0.9, now + 0.1) // ディケイ
    gainNode.gain.setValueAtTime(gain * 0.9, now + 0.1) // サステイン

    // 接続
    lfo.connect(lfoGain)
    lfoGain.connect(oscillator.frequency)
    oscillator.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.masterGain)

    oscillator.start(now)
    lfo.start(now)

    this.activeNotes.set(midiNote, {
      oscillator,
      lfo,
      gainNode,
      startTime: now
    })

    // 長いノートの場合は自動停止しない（手動でnoteOffを呼ぶまで継続）
    // 短いノート（0.5秒以下）の場合のみ自動停止
    if (duration && duration <= 0.5) {
      setTimeout(() => this.noteOff(midiNote), duration * 1000)
    }

    return { oscillator, gainNode }
  }

  releaseNote(noteData) {
    const { gainNode, oscillator, lfo } = noteData
    const now = this.audioContext.currentTime
    
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(gainNode.gain.value, now)
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2) // リリース

    setTimeout(() => {
      try {
        oscillator.stop()
        lfo.stop()
      } catch (error) {
        // 既に停止している場合のエラーを無視
      }
    }, 200)
  }
}

// パッド楽器
class PadInstrument extends BaseInstrument {
  noteOn(midiNote, velocity = 100, duration = null) {
    if (this.activeNotes.has(midiNote)) {
      this.noteOff(midiNote)
    }

    const frequency = this.midiToFrequency(midiNote)
    const gain = (velocity / 127) * 0.3

    // 複数のオシレーターでリッチなパッド音色
    const oscillators = []
    const gainNode = this.audioContext.createGain()

    for (let i = 0; i < 3; i++) {
      const osc = this.audioContext.createOscillator()
      const oscGain = this.audioContext.createGain()
      
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(frequency * (1 + i * 0.01), this.audioContext.currentTime) // わずかにデチューン
      
      oscGain.gain.setValueAtTime(1 / 3, this.audioContext.currentTime)
      
      osc.connect(oscGain)
      oscGain.connect(gainNode)
      oscillators.push(osc)
    }

    // ゆっくりとしたエンベロープ
    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.5) // 長いアタック

    gainNode.connect(this.masterGain)

    oscillators.forEach(osc => osc.start(now))

    this.activeNotes.set(midiNote, {
      oscillators,
      gainNode,
      startTime: now
    })

    // 長いノートの場合は自動停止しない（手動でnoteOffを呼ぶまで継続）
    // 短いノート（0.5秒以下）の場合のみ自動停止
    if (duration && duration <= 0.5) {
      setTimeout(() => this.noteOff(midiNote), duration * 1000)
    }

    return { oscillators, gainNode }
  }

  releaseNote(noteData) {
    const { gainNode, oscillators } = noteData
    const now = this.audioContext.currentTime
    
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(gainNode.gain.value, now)
    gainNode.gain.linearRampToValueAtTime(0, now + 1.0) // 長いリリース

    setTimeout(() => {
      try {
        oscillators.forEach(osc => osc.stop())
      } catch (error) {
        // 既に停止している場合のエラーを無視
      }
    }, 1000)
  }
}

// FX楽器（効果音用）
class FXInstrument extends BaseInstrument {
  noteOn(midiNote, velocity = 100, duration = null) {
    const gain = (velocity / 127) * 0.4
    
    // MIDIノートに応じて異なる効果音を生成
    switch (midiNote % 12) {
      case 0: return this.playRiser(gain)
      case 1: return this.playImpact(gain)
      case 2: return this.playReverse(gain)
      case 3: return this.playGlitch(gain)
      case 4: return this.playWhoosh(gain)
      default: return this.playNoise(gain)
    }
  }

  playRiser(gain) {
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 2)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(500, this.audioContext.currentTime)
    filter.frequency.exponentialRampToValueAtTime(5000, this.audioContext.currentTime + 2)

    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(gain, now + 2)

    oscillator.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.masterGain)

    oscillator.start(now)
    oscillator.stop(now + 2)

    return { source: oscillator, gainNode }
  }

  playImpact(gain) {
    const noise = this.createNoiseSource()
    const gainNode = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(200, this.audioContext.currentTime)

    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(gain, now)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    noise.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.masterGain)

    noise.start(now)
    noise.stop(now + 0.5)

    return { source: noise, gainNode }
  }

  playWhoosh(gain) {
    const noise = this.createNoiseSource()
    const gainNode = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(2000, this.audioContext.currentTime)
    filter.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + 1)

    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.1)
    gainNode.gain.linearRampToValueAtTime(0, now + 1)

    noise.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.masterGain)

    noise.start(now)
    noise.stop(now + 1)

    return { source: noise, gainNode }
  }

  playNoise(gain) {
    const noise = this.createNoiseSource()
    const gainNode = this.audioContext.createGain()

    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(gain * 0.3, now)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

    noise.connect(gainNode)
    gainNode.connect(this.masterGain)

    noise.start(now)
    noise.stop(now + 0.2)

    return { source: noise, gainNode }
  }

  createNoiseSource() {
    const bufferSize = this.audioContext.sampleRate * 0.1
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    return source
  }
}

export { InstrumentEngine }

