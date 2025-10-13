// サンプルベースピアノエンジン
class SampledPianoEngine {
  constructor() {
    this.audioContext = null;
    this.samples = new Map();
    this.isInitialized = false;
    this.sampleRate = 48000;
    this.attackTime = 0.1;
    this.decayTime = 0.1;
    this.sustainLevel = 0.7;
    this.releaseTime = 0.3;
    
    // 高品質な合成サンプルを使用
    this.useEnhancedSynthesis = true;
  }

  async initialize(audioContext) {
    this.audioContext = audioContext;
    
    if (this.useEnhancedSynthesis) {
      // 外部サンプルファイルが不要な高品質合成エンジンを使用
      this.generateEnhancedSamples();
    } else {
      // 従来のサンプルロード処理
      await this.loadSamples();
    }
    
    this.isInitialized = true;
  }

  generateEnhancedSamples() {
    // 高品質な合成サンプルを生成
    const baseFrequencies = {
      'C4': 261.63,
      'C5': 523.25,
      'C6': 1046.50
    };
    
    Object.entries(baseFrequencies).forEach(([note, frequency]) => {
      const sample = this.createEnhancedSample(frequency);
      this.samples.set(note, sample);
    });
  }

  createEnhancedSample(baseFrequency) {
    const duration = 2.0; // 2秒のサンプル
    const sampleCount = Math.floor(duration * this.sampleRate);
    const sample = new Float32Array(sampleCount);
    
    // 高品質な合成波形を生成
    for (let i = 0; i < sampleCount; i++) {
      const time = i / this.sampleRate;
      const envelope = this.calculateEnvelope(time, duration);
      
      // 基本波 + 倍音で豊かな音色を作成
      let wave = 0;
      wave += 0.6 * Math.sin(2 * Math.PI * baseFrequency * time); // 基本波
      wave += 0.3 * Math.sin(2 * Math.PI * baseFrequency * 2 * time); // 2倍音
      wave += 0.1 * Math.sin(2 * Math.PI * baseFrequency * 3 * time); // 3倍音
      
      sample[i] = wave * envelope;
    }
    
    return sample;
  }

  calculateEnvelope(time, duration) {
    const attackEnd = this.attackTime;
    const decayEnd = attackEnd + this.decayTime;
    const releaseStart = duration - this.releaseTime;
    
    if (time < attackEnd) {
      // アタック
      return time / attackEnd;
    } else if (time < decayEnd) {
      // ディケイ
      const decayProgress = (time - attackEnd) / this.decayTime;
      return 1.0 - (1.0 - this.sustainLevel) * decayProgress;
    } else if (time < releaseStart) {
      // サステイン
      return this.sustainLevel;
    } else {
      // リリース
      const releaseProgress = (time - releaseStart) / this.releaseTime;
      return this.sustainLevel * (1.0 - releaseProgress);
    }
  }

  // ノート名を周波数に変換
  noteToFrequency(note) {
    const noteMap = {
      'C4': 261.63, 'C5': 523.25, 'C6': 1046.50
    }
    return noteMap[note] || 261.63
  }

  // MIDIノート番号を周波数に変換
  midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12)
  }

  // 最も近いサンプルノートを見つける
  findNearestSample(midiNote) {
    const frequency = this.midiToFrequency(midiNote)
    const noteNames = ['C4', 'C5', 'C6']
    
    let nearestNote = 'C4'
    let minDifference = Infinity
    
    for (const noteName of noteNames) {
      const sampleFreq = this.noteToFrequency(noteName)
      const difference = Math.abs(frequency - sampleFreq)
      if (difference < minDifference) {
        minDifference = difference
        nearestNote = noteName
      }
    }
    
    return nearestNote
  }

  // ノート再生
  noteOn(midiNote, velocity = 100, duration = null) {
    if (!this.isInitialized) {
      console.warn('Samples not loaded yet')
      return null
    }

    const nearestSample = this.findNearestSample(midiNote)
    const sampleBuffer = this.samples.get(nearestSample)
    
    if (!sampleBuffer) {
      console.warn(`Sample not found for ${nearestSample}`)
      return null
    }

    // 音源を作成
    const source = this.audioContext.createBufferSource()
    source.buffer = sampleBuffer
    
    // ゲインノードを作成
    const gainNode = this.audioContext.createGain()
    const gain = (velocity <= 1 ? velocity : velocity / 100) * 0.8
    gainNode.gain.setValueAtTime(gain, this.audioContext.currentTime)
    
    // ピッチシフト（元のサンプルと異なる音程の場合）
    const targetFreq = this.midiToFrequency(midiNote)
    const sampleFreq = this.noteToFrequency(nearestSample)
    const pitchRatio = targetFreq / sampleFreq
    
    if (Math.abs(pitchRatio - 1) > 0.01) {
      source.playbackRate.setValueAtTime(pitchRatio, this.audioContext.currentTime)
    }
    
    // 接続
    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    // 再生開始
    source.start()
    
    // キーボード入力用の短い音（durationがnullの場合）は自動停止
    if (!duration) {
      const shortDuration = 0.3
      const stopTime = Math.min(shortDuration, sampleBuffer.duration / pitchRatio)
      source.stop(this.audioContext.currentTime + stopTime)
      
      // 短い音はactiveNotesに記録しない（自動停止するため）
      return { source, gainNode }
    }
    
    // 再生用の音（durationが指定されている場合）は手動停止
    const stopTime = Math.min(duration, sampleBuffer.duration / pitchRatio)
    source.stop(this.audioContext.currentTime + stopTime)
    
    // アクティブノートとして記録（noteOffで停止するため）
    const noteKey = `sampled-${midiNote}`
    if (!this.activeNotes) this.activeNotes = new Map()
    this.activeNotes.set(noteKey, { source, gainNode, midiNote })
    
    return { source, gainNode }
  }

  // ノートオフ
  noteOff(midiNote) {
    console.log(`🎹 SampledPianoEngine noteOff called for note ${midiNote}`)
    
    if (!this.activeNotes) return
    
    const noteKey = `sampled-${midiNote}`
    const noteData = this.activeNotes.get(noteKey)
    
    if (noteData) {
      const { source, gainNode } = noteData
      
      // 即座に音を停止
      const now = this.audioContext.currentTime
      gainNode.gain.cancelScheduledValues(now)
      gainNode.gain.setValueAtTime(gainNode.gain.value, now)
      gainNode.gain.linearRampToValueAtTime(0, now + 0.02) // より短いリリース（20s）
      
      // ソースを停止
      try {
        source.stop(now + 0.02)
      } catch (error) {
        console.log(`🎹 SampledPianoEngine source already stopped for note ${midiNote}`)
      }
      
      this.activeNotes.delete(noteKey)
      console.log(`🎹 SampledPianoEngine note ${midiNote} stopped and removed from activeNotes`)
    } else {
      console.log(`🎹 SampledPianoEngine note ${midiNote} not found in activeNotes`)
    }
  }

  // すべてのノートを停止
  stopAllNotes() {
    console.log(`🎹 SampledPianoEngine stopAllNotes called`)
    
    if (!this.activeNotes) return
    
    for (const [noteKey, noteData] of this.activeNotes.entries()) {
      const { source, gainNode, midiNote } = noteData
      
      // 即座に音を停止
      const now = this.audioContext.currentTime
      gainNode.gain.cancelScheduledValues(now)
      gainNode.gain.setValueAtTime(gainNode.gain.value, now)
      gainNode.gain.linearRampToValueAtTime(0, now + 0.05)
      
      // ソースを停止
      try {
        source.stop(now + 0.05)
      } catch (error) {
        console.log(`🎹 SampledPianoEngine source already stopped for note ${midiNote}`)
      }
    }
    
    this.activeNotes.clear()
    console.log(`🎹 SampledPianoEngine all notes stopped`)
  }
}

export { SampledPianoEngine } 