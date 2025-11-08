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

    // Bass固有設定（音域調整 - 低すぎる問題を解決）
    this.bassRange = { min: 28, max: 64 };      // E1-E4 (4半音上げて適切な音域に)
    this.samplePath = '/sounds/MuseScore_General/samples/bass/';
    this.defaultVolume = 0.7;                   // Bass推奨音量（少し下げる）
    this.polyphonyLimit = 16;                   // 同時発音数制限

    // リアルベースギター音響特性（ピッキングリズム特化）
    this.noteDuration = 0.45;                   // 音の最大持続時間（秒）- さらに短縮でピッキング感強化
    this.envelope = {                           // ADSR エンベロープ（リズムギター特化）
      attack: 0.001,                           // アタック: 1ms (超高速、ピック感重視)
      decay: 0.05,                             // ディケイ: 50ms (速い減衰)
      sustain: 0.3,                            // サステイン: 30% (さらに低く、明確な分離)
      release: 0.1                             // リリース: 100ms (より短く、スタッカート感)
    };

    // パフォーマンス設定
    this.compressionThreshold = -24;            // コンプレッサー設定
    this.eqSettings = {                         // ベースギター特化EQ（弦楽器音質）
      lowGain: 2.5,                            // 60-250Hz +2.5dB (ベース基音強調)
      midGain: 1.8,                            // 250Hz-2kHz +1.8dB (ピック音・弦質感強調)
      highGain: 0.5                            // 2kHz+ +0.5dB (アタック感・明瞭度向上)
    };

    // ベースギター特化バリエーション設定（ピッキングリズム強化）
    this.naturalVariation = {
      enabled: true,
      pitchVariation: 0.01,                    // ±1.0セント（より安定したピッチ）
      volumeVariation: 0.15,                   // ±15%音量変動（ピッキング強弱をより強調）
      timingVariation: 0.005                   // ±5ms タイミング変動（タイトなリズム感）
    };

    // ベースギター特有の音響エフェクト設定
    this.bassCharacteristics = {
      stringResonance: {
        enabled: true,
        frequency: 100,                        // 弦共鳴周波数
        resonance: 1.2                         // 共鳴強度
      },
      pickAttack: {
        enabled: true,
        boost: 2.0,                           // ピック音強調（2倍）
        frequency: 2500                        // ピック音周波数
      },
      fretNoise: {
        enabled: true,
        level: 0.03,                          // フレットノイズレベル（3%）
        randomness: 0.5                        // ランダム性
      }
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
   * 最適サンプル選択（ピッチシフト品質重視）
   * @param {number} targetMidiNote - 対象MIDIノート
   * @returns {Object} サンプル情報
   */
  findClosestSample(targetMidiNote) {
    if (this.samples.size === 0) {
      throw new Error('No samples loaded');
    }

    const sampleNotes = Array.from(this.samples.keys());
    const maxPitchShift = 6; // 最大ピッチシフト範囲（半音）

    // 品質を重視したサンプル選択
    let bestSample = null;
    let bestScore = Infinity;

    for (const sampleNote of sampleNotes) {
      const distance = Math.abs(targetMidiNote - sampleNote);

      // ピッチシフト範囲制限
      if (distance > maxPitchShift) {
        continue;
      }

      // 品質スコア計算（距離が近いほど良い）
      const qualityScore = distance + (distance > 3 ? distance * 0.5 : 0);

      if (qualityScore < bestScore) {
        bestScore = qualityScore;
        bestSample = sampleNote;
      }
    }

    // 制限内にサンプルがない場合は最も近いものを使用
    if (bestSample === null) {
      let closestNote = sampleNotes[0];
      let minDistance = Math.abs(targetMidiNote - closestNote);

      for (const sampleNote of sampleNotes) {
        const distance = Math.abs(targetMidiNote - sampleNote);
        if (distance < minDistance) {
          minDistance = distance;
          closestNote = sampleNote;
        }
      }
      bestSample = closestNote;
    }

    return {
      midiNote: bestSample,
      buffer: this.samples.get(bestSample),
      pitchShift: this.calculatePitchShift(targetMidiNote, bestSample)
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
   * ベースギター特化EQ適用（弦楽器音響特性込み）
   * @param {AudioNode} audioNode - 対象オーディオノード
   * @returns {AudioNode} EQ適用済みノード
   */
  applyBassEQ(audioNode) {
    // Low frequency boost (60-250Hz) - ベース基音強調
    const lowFilter = this.audioContext.createBiquadFilter();
    lowFilter.type = 'peaking';
    lowFilter.frequency.value = 120;
    lowFilter.Q.value = 0.7;
    lowFilter.gain.value = this.eqSettings.lowGain;

    // Mid frequency boost (250Hz-2kHz) - ピック音・弦質感強調
    const midFilter = this.audioContext.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.value = 800;
    midFilter.Q.value = 1.0;
    midFilter.gain.value = this.eqSettings.midGain;

    // High frequency boost (2kHz+) - アタック感・明瞭度向上
    const highFilter = this.audioContext.createBiquadFilter();
    highFilter.type = 'peaking';
    highFilter.frequency.value = 4000;
    highFilter.Q.value = 0.7;
    highFilter.gain.value = this.eqSettings.highGain;

    // ピック音強調フィルター（ベースギター特有）
    const pickFilter = this.audioContext.createBiquadFilter();
    if (this.bassCharacteristics.pickAttack.enabled) {
      pickFilter.type = 'peaking';
      pickFilter.frequency.value = this.bassCharacteristics.pickAttack.frequency;
      pickFilter.Q.value = 2.0;
      pickFilter.gain.value = this.bassCharacteristics.pickAttack.boost;
    }

    // 弦共鳴フィルター（ベースギター特有）
    const resonanceFilter = this.audioContext.createBiquadFilter();
    if (this.bassCharacteristics.stringResonance.enabled) {
      resonanceFilter.type = 'peaking';
      resonanceFilter.frequency.value = this.bassCharacteristics.stringResonance.frequency;
      resonanceFilter.Q.value = this.bassCharacteristics.stringResonance.resonance;
      resonanceFilter.gain.value = 1.0;
    }

    // フィルターチェーン構築（ベースギター特化）
    audioNode.connect(lowFilter);
    lowFilter.connect(midFilter);
    midFilter.connect(highFilter);
    highFilter.connect(pickFilter);
    pickFilter.connect(resonanceFilter);

    return resonanceFilter;
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

      // 自然なバリエーション適用
      let finalPlaybackRate = sample.pitchShift.playbackRate;
      let finalVolume = (velocity / 127) * this.defaultVolume;
      let timingOffset = 0;

      if (this.naturalVariation.enabled) {
        // 弦楽器特有のピッチ変動（±1.5セント）
        const pitchVariation = (Math.random() - 0.5) * this.naturalVariation.pitchVariation;
        finalPlaybackRate *= Math.pow(2, pitchVariation / 12);

        // ピッキング強弱による音量変動（±12%）
        const volumeVariation = 1 + (Math.random() - 0.5) * this.naturalVariation.volumeVariation;
        finalVolume *= volumeVariation;

        // グルーヴ感重視のタイミング変動（±8ms）
        timingOffset = (Math.random() - 0.5) * this.naturalVariation.timingVariation;
      }

      // フレットノイズ生成（ベースギター特有のリアリティ）
      let fretNoiseGain = null;
      if (this.bassCharacteristics.fretNoise.enabled && Math.random() < this.bassCharacteristics.fretNoise.randomness) {
        fretNoiseGain = this.audioContext.createGain();
        fretNoiseGain.gain.value = this.bassCharacteristics.fretNoise.level * finalVolume;

        // 高周波ノイズ（フレット音再現）
        const noiseBuffer = this.audioContext.createBuffer(1, 1024, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < 1024; i++) {
          noiseData[i] = (Math.random() - 0.5) * 0.1;
        }

        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(fretNoiseGain);
        fretNoiseGain.connect(this.masterGain);

        // フレットノイズは短時間のみ
        const noiseStartTime = this.audioContext.currentTime + Math.max(0, timingOffset) - 0.005;
        noiseSource.start(noiseStartTime);
        noiseSource.stop(noiseStartTime + 0.01);
      }

      // ピッチシフト適用（自然なバリエーション込み）
      // 再生速度も考慮する場合は外部から適用可能にするため、ここでは音程調整のみ
      sourceNode.playbackRate.value = finalPlaybackRate;

      // 外部システム（UnifiedAudioSystem）から再生速度を適用できるよう、
      // sourceNodeを返す前にプロパティとして保存
      sourceNode._basePitchRate = finalPlaybackRate;

      // ベロシティ対応ゲイン（ADSR エンベロープ付き）
      const velocityGain = this.audioContext.createGain();
      const baseVolume = finalVolume;

      // ADSR エンベロープ適用（自然なタイミングバリエーション込み）
      const startTime = this.audioContext.currentTime + Math.max(0, timingOffset);
      const attackEnd = startTime + this.envelope.attack;
      const decayEnd = attackEnd + this.envelope.decay;
      const sustainLevel = baseVolume * this.envelope.sustain;
      const noteEnd = startTime + this.noteDuration;
      const releaseEnd = noteEnd + this.envelope.release;

      // エンベロープカーブ設定
      velocityGain.gain.setValueAtTime(0, startTime);                    // 開始は無音
      velocityGain.gain.linearRampToValueAtTime(baseVolume, attackEnd);  // アタック
      velocityGain.gain.linearRampToValueAtTime(sustainLevel, decayEnd); // ディケイ
      velocityGain.gain.setValueAtTime(sustainLevel, noteEnd);           // サステイン
      velocityGain.gain.linearRampToValueAtTime(0, releaseEnd);          // リリース

      // Bass EQ適用
      const eqOutput = this.applyBassEQ(sourceNode);

      // オーディオグラフ構築
      eqOutput.connect(velocityGain);
      velocityGain.connect(this.masterGain);

      // 再生開始とスケジューリング
      sourceNode.start(startTime);

      // 自動停止をスケジューリング（エンベロープ完了後）
      sourceNode.stop(releaseEnd);

      // アクティブノート管理（追加情報付き）
      const noteInfo = {
        sourceNode,
        velocityGain,
        startTime,
        releaseEnd,
        midiNote,
        velocity,
        isScheduledToStop: true
      };

      this.activeNotes.set(midiNote, noteInfo);

      // 自動クリーンアップ（音源終了時 + タイマーによる安全な削除）
      sourceNode.addEventListener('ended', () => {
        if (this.activeNotes.has(midiNote)) {
          this.activeNotes.delete(midiNote);
        }
      });

      // 安全な自動削除タイマー（エンベロープ完了の少し後）
      setTimeout(() => {
        if (this.activeNotes.has(midiNote)) {
          this.activeNotes.delete(midiNote);
        }
      }, (releaseEnd - startTime + 0.1) * 1000);

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