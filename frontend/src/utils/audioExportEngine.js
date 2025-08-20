// オーディオエクスポートエンジン
class AudioExportEngine {
  constructor() {
    this.audioContext = null
    this.isInitialized = false
    this.sampleRate = 44100
    this.bitDepth = 16
  }

  // 初期化
  async initialize() {
    if (this.isInitialized) return

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate
      })
      this.isInitialized = true
      console.log('AudioExportEngine initialized')
    } catch (error) {
      console.error('Failed to initialize AudioExportEngine:', error)
      throw error
    }
  }

  // MIDIノート番号を周波数に変換
  midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12)
  }

  // オシレータータイプの取得
  getOscillatorType(trackType) {
    switch (trackType) {
      case 'piano': return 'triangle'
      case 'bass': return 'sawtooth'
      case 'drum': return 'square'
      case 'synth': return 'sine'
      case 'strings': return 'sine'
      case 'brass': return 'sawtooth'
      default: return 'sine'
    }
  }

  // 単一ノートのオーディオデータを生成
  generateNoteAudio(note, trackType, volume = 0.5, sampleRate = 44100) {
    const frequency = this.midiToFrequency(note.pitch || note.note || 60)
    const duration = note.duration || 1.0
    const velocity = note.velocity || 0.8
    const startTime = note.time !== undefined ? note.time : (note.start / 1000)
    
    const samplesPerSecond = sampleRate
    const totalSamples = Math.floor(duration * samplesPerSecond)
    const startSample = Math.floor(startTime * samplesPerSecond)
    
    const audioData = new Float32Array(totalSamples)
    const oscillatorType = this.getOscillatorType(trackType)
    
    // エンベロープ設定
    const attackTime = 0.01
    const decayTime = 0.1
    const sustainLevel = 0.7
    const releaseTime = 0.1
    
    const attackSamples = Math.floor(attackTime * samplesPerSecond)
    const decaySamples = Math.floor(decayTime * samplesPerSecond)
    const releaseSamples = Math.floor(releaseTime * samplesPerSecond)
    const sustainSamples = totalSamples - attackSamples - decaySamples - releaseSamples
    
    for (let i = 0; i < totalSamples; i++) {
      // 波形生成
      let waveform = 0
      const phase = (2 * Math.PI * frequency * i) / samplesPerSecond
      
      switch (oscillatorType) {
        case 'sine':
          waveform = Math.sin(phase)
          break
        case 'square':
          waveform = Math.sin(phase) > 0 ? 1 : -1
          break
        case 'sawtooth':
          waveform = 2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + 0.5))
          break
        case 'triangle':
          waveform = 2 * Math.abs(2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + 0.5))) - 1
          break
        default:
          waveform = Math.sin(phase)
      }
      
      // エンベロープ適用
      let envelope = 0
      if (i < attackSamples) {
        // Attack
        envelope = (i / attackSamples)
      } else if (i < attackSamples + decaySamples) {
        // Decay
        const decayProgress = (i - attackSamples) / decaySamples
        envelope = 1 - (decayProgress * (1 - sustainLevel))
      } else if (i < attackSamples + decaySamples + sustainSamples) {
        // Sustain
        envelope = sustainLevel
      } else {
        // Release
        const releaseProgress = (i - (attackSamples + decaySamples + sustainSamples)) / releaseSamples
        envelope = sustainLevel * (1 - releaseProgress)
      }
      
      audioData[i] = waveform * envelope * volume * velocity
    }
    
    return {
      audioData,
      startSample,
      totalSamples
    }
  }

  // トラックのオーディオデータを生成
  generateTrackAudio(track, sampleRate = 44100) {
    if (!track.midiData || !track.midiData.notes || track.midiData.notes.length === 0) {
      return null
    }

    // トラックの総時間を計算
    let maxEndTime = 0
    track.midiData.notes.forEach(note => {
      const noteStart = note.time !== undefined ? note.time : (note.start / 1000)
      const noteEnd = noteStart + (note.duration || 1.0)
      maxEndTime = Math.max(maxEndTime, noteEnd)
    })

    // 最低30秒は確保
    maxEndTime = Math.max(maxEndTime, 30)
    
    const totalSamples = Math.floor(maxEndTime * sampleRate)
    const trackAudio = new Float32Array(totalSamples)
    
    console.log(`Generating track audio for "${track.name}":`, {
      notesCount: track.midiData.notes.length,
      maxEndTime,
      totalSamples
    })
    
    // 各ノートのオーディオデータを合成
    track.midiData.notes.forEach((note, noteIndex) => {
      if (noteIndex % 10 === 0) {
        console.log(`Processing note ${noteIndex + 1}/${track.midiData.notes.length}`)
      }
      
      const noteAudio = this.generateNoteAudio(note, track.type, track.volume / 100, sampleRate)
      
      // ノートのオーディオデータをトラックに追加
      const copyLength = Math.min(noteAudio.totalSamples, totalSamples - noteAudio.startSample)
      for (let i = 0; i < copyLength; i++) {
        const targetIndex = noteAudio.startSample + i
        if (targetIndex < totalSamples) {
          trackAudio[targetIndex] += noteAudio.audioData[i]
        }
      }
    })
    
    return trackAudio
  }

  // プロジェクト全体のオーディオデータを生成
  generateProjectAudio(tracks, sampleRate = 44100) {
    if (!tracks || tracks.length === 0) {
      return null
    }

    // プロジェクトの総時間を計算
    let maxEndTime = 0
    tracks.forEach(track => {
      if (track.midiData && track.midiData.notes) {
        track.midiData.notes.forEach(note => {
          const noteStart = note.time !== undefined ? note.time : (note.start / 1000)
          const noteEnd = noteStart + (note.duration || 1.0)
          maxEndTime = Math.max(maxEndTime, noteEnd)
        })
      }
    })

    // 最低30秒は確保
    maxEndTime = Math.max(maxEndTime, 30)
    
    const totalSamples = Math.floor(maxEndTime * sampleRate)
    console.log('Generating project audio:', { 
      maxEndTime, 
      totalSamples, 
      sampleRate, 
      tracksCount: tracks.length 
    })
    
    const projectAudio = new Float32Array(totalSamples)
    
    // 各トラックのオーディオデータを合成
    tracks.forEach((track, trackIndex) => {
      console.log(`Processing track ${trackIndex + 1}/${tracks.length}:`, track.name)
      const trackAudio = this.generateTrackAudio(track, sampleRate)
      if (trackAudio) {
        const copyLength = Math.min(trackAudio.length, totalSamples)
        for (let i = 0; i < copyLength; i++) {
          projectAudio[i] += trackAudio[i]
        }
      }
    })
    
    // マスタリング（クリッピング防止）
    let maxAmplitude = 0
    for (let i = 0; i < projectAudio.length; i++) {
      maxAmplitude = Math.max(maxAmplitude, Math.abs(projectAudio[i]))
    }
    
    if (maxAmplitude > 1.0) {
      const normalizationFactor = 0.95 / maxAmplitude
      for (let i = 0; i < projectAudio.length; i++) {
        projectAudio[i] *= normalizationFactor
      }
    }
    
    return projectAudio
  }

  // Float32ArrayをWAVファイルに変換
  float32ToWav(float32Array, sampleRate = 44100, bitDepth = 16) {
    const samples = float32Array
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)
    
    // WAVヘッダー
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, bitDepth, true)
    writeString(36, 'data')
    view.setUint32(40, samples.length * 2, true)
    
    // オーディオデータ
    let offset = 44
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(offset, sample * 0x7FFF, true)
      offset += 2
    }
    
    return new Blob([buffer], { type: 'audio/wav' })
  }

  // プロジェクトをWAVファイルとしてエクスポート
  async exportToWav(tracks, filename = 'melodia-export.wav') {
    try {
      await this.initialize()
      
      console.log('Exporting project to WAV:', { tracksCount: tracks.length })
      
      // プログレス表示
      const progressEvent = new CustomEvent('exportProgress', {
        detail: { message: 'オーディオデータを生成中...', progress: 0 }
      })
      window.dispatchEvent(progressEvent)
      
      // プロジェクトオーディオデータを生成
      const projectAudio = this.generateProjectAudio(tracks, this.sampleRate)
      
      if (!projectAudio) {
        throw new Error('No audio data to export')
      }
      
      // プログレス更新
      window.dispatchEvent(new CustomEvent('exportProgress', {
        detail: { message: 'WAVファイルに変換中...', progress: 50 }
      }))
      
      // WAVファイルに変換
      const wavBlob = this.float32ToWav(projectAudio, this.sampleRate, this.bitDepth)
      
      // プログレス更新
      window.dispatchEvent(new CustomEvent('exportProgress', {
        detail: { message: 'ファイルをダウンロード中...', progress: 90 }
      }))
      
      // ファイルダウンロード
      const url = URL.createObjectURL(wavBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // 完了通知
      window.dispatchEvent(new CustomEvent('exportProgress', {
        detail: { message: 'エクスポート完了！', progress: 100 }
      }))
      
      console.log('WAV export completed:', filename)
      return filename
    } catch (error) {
      console.error('Failed to export WAV:', error)
      throw error
    }
  }

  // プロジェクトをMIDIファイルとしてエクスポート
  exportToMidi(tracks, filename = 'melodia-export.mid') {
    try {
      console.log('Exporting project to MIDI:', { tracksCount: tracks.length })
      
      // MIDIファイルの構造
      const midiData = {
        format: 1,
        tracks: [],
        timeDivision: 480 // PPQ (Pulses Per Quarter Note)
      }
      
      // テンポトラックを追加
      const tempoTrack = {
        events: [
          { type: 'meta', subtype: 'setTempo', deltaTime: 0, tempo: 500000 } // 120 BPM
        ]
      }
      midiData.tracks.push(tempoTrack)
      
      // 各トラックをMIDIトラックに変換
      tracks.forEach(track => {
        if (!track.midiData || !track.midiData.notes || track.midiData.notes.length === 0) {
          return
        }
        
        const midiTrack = {
          events: []
        }
        
        track.midiData.notes.forEach(note => {
          const noteStart = note.time !== undefined ? note.time : (note.start / 1000)
          const noteDuration = note.duration || 1.0
          const notePitch = note.pitch || note.note || 60
          const noteVelocity = Math.round((note.velocity || 0.8) * 127)
          
          // ノートオン
          midiTrack.events.push({
            type: 'channel',
            subtype: 'noteOn',
            deltaTime: Math.round(noteStart * midiData.timeDivision * 2), // 2 = 120 BPM
            channel: 0,
            noteNumber: notePitch,
            velocity: noteVelocity
          })
          
          // ノートオフ
          midiTrack.events.push({
            type: 'channel',
            subtype: 'noteOff',
            deltaTime: Math.round(noteDuration * midiData.timeDivision * 2),
            channel: 0,
            noteNumber: notePitch,
            velocity: 0
          })
        })
        
        // トラック終了
        midiTrack.events.push({
          type: 'meta',
          subtype: 'endOfTrack',
          deltaTime: 0
        })
        
        midiData.tracks.push(midiTrack)
      })
      
      // MIDIファイルをバイナリに変換（簡易版）
      const midiBlob = this.midiToBlob(midiData)
      
      // ファイルダウンロード
      const url = URL.createObjectURL(midiBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log('MIDI export completed:', filename)
      return filename
    } catch (error) {
      console.error('Failed to export MIDI:', error)
      throw error
    }
  }

  // MIDIデータをBlobに変換（簡易版）
  midiToBlob(midiData) {
    // 簡易的なMIDIファイル生成
    const buffer = new ArrayBuffer(1024) // 固定サイズ（実際は動的）
    const view = new DataView(buffer)
    
    // MIDIヘッダー
    view.setUint32(0, 0x4D546864) // MThd
    view.setUint32(4, 6, false) // ヘッダー長
    view.setUint16(8, midiData.format, false) // フォーマット
    view.setUint16(10, midiData.tracks.length, false) // トラック数
    view.setUint16(12, midiData.timeDivision, false) // 時間分割
    
    // 簡易的なMIDIデータ（実際の実装ではより詳細なMIDIファイル構造が必要）
    const midiString = 'MThd\x00\x00\x00\x06\x00\x01\x00\x02\x01\xE0MTrk\x00\x00\x00\x08\x00\xFF\x2F\x00'
    const encoder = new TextEncoder()
    const midiBytes = encoder.encode(midiString)
    
    return new Blob([midiBytes], { type: 'audio/midi' })
  }

  // エンジンの破棄
  destroy() {
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.isInitialized = false
  }
}

// シングルトンインスタンス
const audioExportEngine = new AudioExportEngine()

export default audioExportEngine 