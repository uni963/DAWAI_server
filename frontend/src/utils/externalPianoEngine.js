// 外部音源API統合エンジン
class ExternalPianoEngine {
  constructor() {
    this.audioContext = null
    this.isInitialized = false
    this.soundFont = null
    this.activeNotes = new Map()
  }

  // 初期化
  async initialize(audioContext) {
    this.audioContext = audioContext
    
    try {
      // SoundFont2ファイルの読み込み
      await this.loadSoundFont()
      this.isInitialized = true
      console.log('External piano engine initialized')
    } catch (error) {
      console.warn('Failed to load external sound source:', error)
      // フォールバック: 内蔵音源を使用
      this.initializeFallback()
    }
  }

  // SoundFont2ファイルの読み込み
  async loadSoundFont() {
    // 複数のSoundFontオプション
    const soundFontUrls = [
      '/soundfonts/Steinway_Grand.sf2',
      '/soundfonts/Yamaha_C7.sf2',
      '/soundfonts/Bosendorfer_290.sf2',
      'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/Steinway_Grand_Piano-mp3/'
    ]

    for (const url of soundFontUrls) {
      try {
        if (url.endsWith('.sf2')) {
          await this.loadSF2File(url)
          break
        } else {
          await this.loadMP3SoundFont(url)
          break
        }
      } catch (error) {
        console.warn(`Failed to load soundfont from ${url}:`, error)
        continue
      }
    }
  }

  // SF2ファイルの読み込み
  async loadSF2File(url) {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    
    // SF2パーサーを使用（実装が必要）
    this.soundFont = await this.parseSF2File(arrayBuffer)
  }

  // MP3ベースSoundFontの読み込み
  async loadMP3SoundFont(baseUrl) {
    this.soundFont = {
      type: 'mp3',
      baseUrl,
      samples: new Map()
    }
    
    // 主要なノートのサンプルを事前読み込み
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octaves = [2, 3, 4, 5, 6, 7]
    
    for (const octave of octaves) {
      for (const note of notes) {
        const noteName = `${note}${octave}`
        const sampleUrl = `${baseUrl}${noteName}.mp3`
        
        try {
          const audioBuffer = await this.loadAudioSample(sampleUrl)
          this.soundFont.samples.set(noteName, audioBuffer)
        } catch (error) {
          console.warn(`Failed to load sample ${noteName}:`, error)
        }
      }
    }
  }

  // 音声サンプルの読み込み
  async loadAudioSample(url) {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return await this.audioContext.decodeAudioData(arrayBuffer)
  }

  // SF2ファイルのパース（簡易実装）
  async parseSF2File(arrayBuffer) {
    // 実際のSF2パーサー実装が必要
    // ここでは簡易的な実装
    return {
      type: 'sf2',
      data: arrayBuffer,
      // SF2の構造を解析してサンプルデータを抽出
    }
  }

  // フォールバック初期化
  initializeFallback() {
    this.isInitialized = true
    console.log('Using fallback piano engine')
  }

  // MIDIノート番号をノート名に変換
  midiToNoteName(midiNote) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octave = Math.floor(midiNote / 12) - 1
    const noteIndex = midiNote % 12
    return `${notes[noteIndex]}${octave}`
  }

  // 最も近いサンプルを見つける
  findNearestSample(midiNote) {
    const noteName = this.midiToNoteName(midiNote)
    
    if (this.soundFont?.samples?.has(noteName)) {
      return this.soundFont.samples.get(noteName)
    }
    
    // 最も近いノートを探す
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octaves = [2, 3, 4, 5, 6, 7]
    
    for (const octave of octaves) {
      for (const note of notes) {
        const testNoteName = `${note}${octave}`
        if (this.soundFont?.samples?.has(testNoteName)) {
          return this.soundFont.samples.get(testNoteName)
        }
      }
    }
    
    return null
  }

  // ノート再生
  noteOn(midiNote, velocity = 100, duration = null) {
    if (!this.isInitialized) {
      console.warn('External piano engine not initialized')
      return null
    }

    const sampleBuffer = this.findNearestSample(midiNote)
    
    if (!sampleBuffer) {
      console.warn(`No sample found for MIDI note ${midiNote}`)
      return null
    }

    // 音源を作成
    const source = this.audioContext.createBufferSource()
    source.buffer = sampleBuffer
    
    // ゲインノードを作成
    const gainNode = this.audioContext.createGain()
    const gain = (velocity <= 1 ? velocity : velocity / 100) * 0.8
    gainNode.gain.setValueAtTime(gain, this.audioContext.currentTime)
    
    // ピッチシフト（必要に応じて）
    const targetFreq = this.midiToFrequency(midiNote)
    const sampleFreq = this.midiToFrequency(this.noteNameToMidi(this.midiToNoteName(midiNote)))
    const pitchRatio = targetFreq / sampleFreq
    
    if (Math.abs(pitchRatio - 1) > 0.01) {
      source.playbackRate.setValueAtTime(pitchRatio, this.audioContext.currentTime)
    }
    
    // 接続
    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    // 再生開始
    source.start()
    
    // 自動停止
    if (duration) {
      const stopTime = Math.min(duration, sampleBuffer.duration / pitchRatio)
      source.stop(this.audioContext.currentTime + stopTime)
    }
    
    // アクティブノートとして記録
    this.activeNotes.set(midiNote, { source, gainNode })
    
    return { source, gainNode }
  }

  // ノート停止
  noteOff(midiNote) {
    const noteData = this.activeNotes.get(midiNote)
    if (noteData) {
      const { gainNode } = noteData
      
      // リリースエンベロープ
      const now = this.audioContext.currentTime
      gainNode.gain.cancelScheduledValues(now)
      gainNode.gain.setValueAtTime(gainNode.gain.value, now)
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3)
      
      this.activeNotes.delete(midiNote)
    }
  }

  // MIDIノート番号を周波数に変換
  midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12)
  }

  // ノート名をMIDIノート番号に変換
  noteNameToMidi(noteName) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const note = noteName.slice(0, -1)
    const octave = parseInt(noteName.slice(-1))
    const noteIndex = notes.indexOf(note)
    return (octave + 1) * 12 + noteIndex
  }

  // すべてのノートを停止
  stopAllNotes() {
    for (const [midiNote, noteData] of this.activeNotes) {
      this.noteOff(midiNote)
    }
  }
}

export { ExternalPianoEngine } 