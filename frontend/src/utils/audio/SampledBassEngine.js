/**
 * SampledBassEngine - Bass Track専用音源エンジン
 * Piano Engine実装パターンを継承・Bass音域特化
 *
 * @class SampledBassEngine
 * @author Claude Code
 * @date 2025-10-05
 */

export class SampledBassEngine {
  constructor() {
    // 基本プロパティ
    this.audioContext = null;
    this.samples = new Map();           // MIDI Note → AudioBuffer
    this.activeNotes = new Map();       // 再生中ノート管理
    this.loaded = false;                // 初期化状態
    this.masterGain = null;             // マスター音量制御

    // Bass固有設定
    this.bassRange = { min: 24, max: 60 };      // C1-C4
    this.samplePath = '/sounds/MuseScore_General/samples/bass/';
    this.defaultVolume = 0.8;                   // Bass推奨音量
    this.polyphonyLimit = 16;                   // 同時発音数制限

    // パフォーマンス設定
    this.compressionThreshold = -24;            // コンプレッサー設定
    this.eqSettings = {                         // Bass専用EQ
      lowGain: 3,                              // 60-250Hz +3dB
      midGain: 0,                              // 250Hz-2kHz
      highGain: -2                             // 2kHz+ -2dB
    };

    // 初期化
    this.initializeAudioContext();
  }

  /**
   * AudioContext初期化
   * @private
   */
  initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      throw new Error('Web Audio API not supported');
    }
  }

  /**
   * Bass音源サンプル構成取得
   * @returns {Array} サンプル構成配列
   */
  getSampleConfigs() {
    return [
      // オクターブ2 (低音域) - G#2を一時的に除外
      {
        midiNote: 41,
        note: 'F2',
        file: 'Bass F2.wav',
        frequency: 87.31,
        octave: 2,
        semitone: 5
      },
      // {
      //   midiNote: 44,
      //   note: 'G#2',
      //   file: 'Bass G#2.wav',
      //   frequency: 103.83,
      //   octave: 2,
      //   semitone: 8
      // },
      {
        midiNote: 47,
        note: 'B2',
        file: 'Bass B2.wav',
        frequency: 123.47,
        octave: 2,
        semitone: 11
      },
      {
        midiNote: 50,
        note: 'D3',
        file: 'Bass D3.wav',
        frequency: 146.83,
        octave: 3,
        semitone: 2
      },

      // オクターブ3 (中音域) - G#3を一時的に除外
      {
        midiNote: 53,
        note: 'F3',
        file: 'Bass F3.wav',
        frequency: 174.61,
        octave: 3,
        semitone: 5
      },
      // {
      //   midiNote: 56,
      //   note: 'G#3',
      //   file: 'Bass G#3.wav',
      //   frequency: 207.65,
      //   octave: 3,
      //   semitone: 8
      // },
      {
        midiNote: 59,
        note: 'B3',
        file: 'Bass B3.wav',
        frequency: 246.94,
        octave: 3,
        semitone: 11
      },
      {
        midiNote: 62,
        note: 'D4',
        file: 'Bass D4.wav',
        frequency: 293.66,
        octave: 4,
        semitone: 2
      }
    ];
  }

  /**
   * Bass音源サンプル非同期ロード
   * @param {Function} progressCallback - プログレスコールバック
   * @returns {Promise<void>}
   */
  async loadSamples(progressCallback = null) {
    if (this.loaded) {
      console.warn('Bass samples already loaded');
      return;
    }

    try {
      const configs = this.getSampleConfigs();
      let loadedCount = 0;

      console.log('🎸 Loading Bass samples...');

      // 並列ロードでパフォーマンス向上
      const loadPromises = configs.map(async (config) => {
        try {
          const response = await fetch(`${this.samplePath}${config.file}`);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

          this.samples.set(config.midiNote, audioBuffer);

          loadedCount++;
          if (progressCallback) {
            const progress = Math.round((loadedCount / configs.length) * 100);
            progressCallback(progress);
          }

          console.log(`✅ Loaded: ${config.file} (${config.note})`);

        } catch (error) {
          console.error(`❌ Failed to load ${config.file}:`, error);
          throw new Error(`Failed to load ${config.file}: ${error.message}`);
        }
      });

      // 全サンプルのロード完了を待機
      await Promise.all(loadPromises);

      // マスターゲイン初期化
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.defaultVolume;
      this.masterGain.connect(this.audioContext.destination);

      this.loaded = true;

      console.log(`🎸 Bass Engine loaded successfully: ${this.samples.size} samples`);

      if (progressCallback) {
        progressCallback(100);
      }

    } catch (error) {
      console.error('❌ Bass samples loading failed:', error);
      throw error;
    }
  }

  /**
   * 最近接サンプル選択
   * @param {number} targetMidiNote - 対象MIDIノート
   * @returns {Object} サンプル情報
   */
  findClosestSample(targetMidiNote) {
    if (this.samples.size === 0) {
      throw new Error('No samples loaded');
    }

    const sampleNotes = Array.from(this.samples.keys());

    // 最小距離のサンプルを選択
    let closestNote = sampleNotes[0];
    let minDistance = Math.abs(targetMidiNote - closestNote);

    for (const sampleNote of sampleNotes) {
      const distance = Math.abs(targetMidiNote - sampleNote);
      if (distance < minDistance) {
        minDistance = distance;
        closestNote = sampleNote;
      }
    }

    return {
      midiNote: closestNote,
      buffer: this.samples.get(closestNote),
      pitchShift: this.calculatePitchShift(targetMidiNote, closestNote)
    };
  }

  /**
   * ピッチシフト計算
   * @param {number} targetNote - 対象音程
   * @param {number} sampleNote - サンプル音程
   * @returns {Object} ピッチシフト情報
   */
  calculatePitchShift(targetNote, sampleNote) {
    const semitoneDistance = targetNote - sampleNote;
    const pitchRatio = Math.pow(2, semitoneDistance / 12);

    // Bass音域での品質保持チェック
    if (Math.abs(semitoneDistance) > 12) {
      console.warn(`Large pitch shift detected: ${semitoneDistance} semitones (${targetNote} → ${sampleNote})`);
    }

    return {
      detune: semitoneDistance * 100,  // cents
      playbackRate: pitchRatio,
      semitones: semitoneDistance
    };
  }

  /**
   * Bass音域検証
   * @param {number} midiNote - MIDIノート
   * @returns {boolean} 範囲内かどうか
   */
  validateBassRange(midiNote) {
    return midiNote >= this.bassRange.min && midiNote <= this.bassRange.max;
  }

  /**
   * Bass EQ適用
   * @param {AudioNode} audioNode - 対象オーディオノード
   * @returns {AudioNode} EQ適用済みノード
   */
  applyBassEQ(audioNode) {
    // Low frequency boost (60-250Hz)
    const lowFilter = this.audioContext.createBiquadFilter();
    lowFilter.type = 'peaking';
    lowFilter.frequency.value = 120;
    lowFilter.Q.value = 0.7;
    lowFilter.gain.value = this.eqSettings.lowGain;

    // Mid frequency control (250Hz-2kHz)
    const midFilter = this.audioContext.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.value = 800;
    midFilter.Q.value = 1.0;
    midFilter.gain.value = this.eqSettings.midGain;

    // High frequency cut (2kHz+)
    const highFilter = this.audioContext.createBiquadFilter();
    highFilter.type = 'peaking';
    highFilter.frequency.value = 4000;
    highFilter.Q.value = 0.7;
    highFilter.gain.value = this.eqSettings.highGain;

    // フィルターチェーン構築
    audioNode.connect(lowFilter);
    lowFilter.connect(midFilter);
    midFilter.connect(highFilter);

    return highFilter;
  }

  /**
   * Bassノート再生
   * @param {number} midiNote - MIDIノート (24-60)
   * @param {number} velocity - ベロシティ (1-127)
   * @returns {AudioBufferSourceNode} 作成されたソースノード
   */
  playNote(midiNote, velocity = 127) {
    if (!this.loaded) {
      throw new Error('Bass engine not loaded');
    }

    // 範囲外警告
    if (!this.validateBassRange(midiNote)) {
      console.warn(`Note ${midiNote} outside bass range ${this.bassRange.min}-${this.bassRange.max}`);
    }

    try {
      // 既存ノート停止（単音楽器の場合）
      if (this.activeNotes.has(midiNote)) {
        this.stopNote(midiNote);
      }

      // 最適サンプル選択
      const sample = this.findClosestSample(midiNote);

      // ソースノード作成
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = sample.buffer;

      // ピッチシフト適用
      sourceNode.detune.value = sample.pitchShift.detune;
      sourceNode.playbackRate.value = sample.pitchShift.playbackRate;

      // ベロシティ対応ゲイン
      const velocityGain = this.audioContext.createGain();
      velocityGain.gain.value = (velocity / 127) * this.defaultVolume;

      // Bass EQ適用
      const eqOutput = this.applyBassEQ(sourceNode);

      // オーディオグラフ構築
      eqOutput.connect(velocityGain);
      velocityGain.connect(this.masterGain);

      // 再生開始
      const startTime = this.audioContext.currentTime;
      sourceNode.start(startTime);

      // アクティブノート管理
      const noteInfo = {
        sourceNode,
        velocityGain,
        startTime,
        midiNote,
        velocity
      };

      this.activeNotes.set(midiNote, noteInfo);

      // 自動クリーンアップ（音源終了時）
      sourceNode.addEventListener('ended', () => {
        if (this.activeNotes.has(midiNote)) {
          this.activeNotes.delete(midiNote);
        }
      });

      return sourceNode;

    } catch (error) {
      console.error(`Failed to play bass note ${midiNote}:`, error);
      throw error;
    }
  }

  /**
   * Bassノート停止
   * @param {number} midiNote - 停止するMIDIノート
   */
  stopNote(midiNote) {
    const noteInfo = this.activeNotes.get(midiNote);

    if (noteInfo) {
      try {
        // フェードアウト適用
        const fadeTime = 0.05; // 50ms fade out
        const currentTime = this.audioContext.currentTime;

        noteInfo.velocityGain.gain.setValueAtTime(
          noteInfo.velocityGain.gain.value,
          currentTime
        );
        noteInfo.velocityGain.gain.linearRampToValueAtTime(0, currentTime + fadeTime);

        // ノード停止
        noteInfo.sourceNode.stop(currentTime + fadeTime);

        // アクティブリストから削除
        this.activeNotes.delete(midiNote);

      } catch (error) {
        console.error(`Failed to stop bass note ${midiNote}:`, error);
        // エラーでも削除は実行
        this.activeNotes.delete(midiNote);
      }
    }
  }

  /**
   * 全ノート停止
   */
  stopAllNotes() {
    const activeNotes = Array.from(this.activeNotes.keys());
    activeNotes.forEach(midiNote => this.stopNote(midiNote));
  }

  /**
   * マスター音量設定
   * @param {number} volume - 音量 (0.0-1.0)
   */
  setVolume(volume) {
    if (this.masterGain) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      this.masterGain.gain.value = clampedVolume;
    }
  }

  /**
   * Bass音域設定
   * @param {Object} range - 音域設定 {min, max}
   */
  setBassRange(range) {
    this.bassRange = { ...range };
  }

  /**
   * EQ設定更新
   * @param {Object} eqSettings - EQ設定
   */
  setBassEQ(eqSettings) {
    this.eqSettings = { ...this.eqSettings, ...eqSettings };
  }

  /**
   * エンジン情報取得
   * @returns {Object} エンジン情報
   */
  getInfo() {
    return {
      type: 'bass',
      sampleCount: this.samples.size,
      range: this.bassRange,
      loaded: this.loaded,
      activeNotes: this.activeNotes.size,
      polyphonyLimit: this.polyphonyLimit,
      defaultVolume: this.defaultVolume
    };
  }

  /**
   * エンジン破棄・リソース解放
   */
  dispose() {
    console.log('🎸 Disposing Bass Engine...');

    try {
      // 全ノート停止
      this.stopAllNotes();

      // リソースクリア
      this.activeNotes.clear();
      this.samples.clear();

      // フラグリセット
      this.loaded = false;

      // AudioContext切断
      if (this.masterGain) {
        this.masterGain.disconnect();
        this.masterGain = null;
      }

      console.log('✅ Bass Engine disposed successfully');

    } catch (error) {
      console.error('❌ Error during Bass Engine disposal:', error);
    }
  }
}

export default SampledBassEngine;