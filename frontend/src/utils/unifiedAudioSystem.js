// 統一された音声システム
// デバッグコンソールで成功した実装を基に構築

import { pianoKeyMapping } from './pianoTest.js';
import { drumMapping } from './drumTest.js';

class UnifiedAudioSystem {
  constructor() {
    this.audioContext = null;
    this.audioBuffers = {};
    this.isInitialized = false;
    this.masterVolume = 0.8; // マスターボリュームを少し上げる
    this.masterGain = null;
    
    // 現在再生中の音
    this.activeSounds = new Map();
    
    // トラック管理
    this.tracks = new Map();
    this.trackVolumes = new Map();
    this.trackMuted = new Map();
    this.trackSolo = new Map();
    
    // イベントリスナー
    this.listeners = new Set();
  }

  // 初期化
  async initialize() {
    // 既に初期化済みの場合
    if (this.isInitialized && this.audioContext && this.audioContext.state === 'running') {
      console.log('🎵 既に初期化済みです。');
      return true;
    }

    // 既に初期化処理中の場合は、その Promise を返す（排他制御）
    if (this._initPromise) {
      console.log('🎵 初期化処理中です。既存のPromiseを返します。');
      return this._initPromise;
    }

    console.log('🎵 統一音声システムを初期化中...');

    // 初期化 Promise を作成・保存（並行初期化を防止）
    this._initPromise = (async () => {
      try {
        // AudioContextの作成または再利用
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log('🎵 AudioContext作成完了:', this.audioContext.state);
        }

        // AudioContextの状態を確認し、必要に応じて開始
        if (this.audioContext.state === 'suspended') {
          console.log('🎵 AudioContextが停止状態です。開始中...');

          // タイムアウト付きでresume()を実行
          const resumePromise = this.audioContext.resume();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AudioContext resume timeout')), 3000)
          );

          try {
            await Promise.race([resumePromise, timeoutPromise]);
            console.log('🎵 AudioContext開始完了:', this.audioContext.state);
          } catch (error) {
            console.warn('⚠️ AudioContext resume failed or timed out:', error.message);
            console.log('🎵 ブラウザの自動再生ポリシーにより、ユーザージェスチャー後に再試行が必要です');
            // 失敗してもマスターゲインノードは作成しておく
          }
        }

        // マスターゲインノードの作成（存在しない場合のみ）
        if (!this.masterGain) {
          this.masterGain = this.audioContext.createGain();
          this.masterGain.gain.value = this.masterVolume;
          this.masterGain.connect(this.audioContext.destination);
        }

        // AudioContextが実際にrunning状態になっているかチェック
        if (this.audioContext.state === 'running') {
          this.isInitialized = true;
          console.log('✅ 統一音声システムの初期化完了 (AudioContext: running)');
          this.emit('initialized', { success: true });
          return true;
        } else {
          // suspended状態でも基本構造は作成できたとマークする
          // ユーザージェスチャー後に実際に開始される
          this.isInitialized = true;
          console.log('⚠️ 統一音声システムの基本初期化完了 (AudioContext: suspended - ユーザージェスチャー待ち)');
          this.emit('initialized', { success: true, suspended: true });
          return true;
        }
      } catch (error) {
        console.error('❌ 統一音声システムの初期化に失敗:', error);
        this.isInitialized = false;
        this.emit('error', { error: error.message });
        return false;
      } finally {
        this._initPromise = null;  // 完了後にクリア
      }
    })();

    return this._initPromise;
  }

  // 音声ファイルを読み込む（デバッグコンソールと同じ方法）
  async loadAudioFile(filename, isPiano = false) {
    if (this.audioBuffers[filename]) {
      return this.audioBuffers[filename];
    }

    try {
      let filePath;

      // DiffSinger音声: 完全URLはそのまま使用
      if (filename.startsWith('http://') || filename.startsWith('https://')) {
        filePath = filename;
        console.log(`🎤 [UnifiedAudio] DiffSinger音声読み込み: ${filePath}`);
      } else {
        // ピアノ/ドラム音: 既存のパス構築ロジック
        filePath = isPiano
          ? `/sounds/MuseScore_General/samples/piano/${filename}`
          : `/sounds/MuseScore_General/samples/${filename}`;
        console.log(`📁 [UnifiedAudio] 楽器サンプル読み込み: ${filePath} (${isPiano ? 'ピアノ' : 'ドラム'})`);
      }

      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioBuffers[filename] = audioBuffer;

      console.log(`✅ 音声デコード成功: ${audioBuffer.duration}s, ${audioBuffer.numberOfChannels}ch, ${audioBuffer.sampleRate}Hz`);
      return audioBuffer;
    } catch (error) {
      console.error(`❌ 音声ファイルの読み込みに失敗: ${filename}`, error);
      return null;
    }
  }

  // ピアノ音を再生（デバッグコンソールと同じ方法）
  async playPianoNote(key, velocity = 0.8) {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) return null;
    }

    const keyInfo = pianoKeyMapping[key];
    if (!keyInfo) {
      console.warn(`⚠️ ピアノキーが見つかりません: ${key}`);
      return null;
    }

    try {
      const audioBuffer = await this.loadAudioFile(keyInfo.sample, true);
      if (!audioBuffer) {
        console.warn(`⚠️ ピアノ音ファイルが見つかりません: ${keyInfo.sample}`);
        return null;
      }

      return this.playAudioBuffer(audioBuffer, keyInfo, velocity, 'piano');
    } catch (error) {
      console.error(`❌ ピアノ音の再生に失敗: ${error.message}`);
      return null;
    }
  }

  // MIDIピッチ番号をドラムキーにマッピング
  midiTodrummingKey(midiPitch) {
    const midiToDrumMap = {
      36: 'a',  // Kick Drum → Bass 2
      38: 'q',  // Snare Drum → Snare Hit  
      42: 'h',  // Hi-Hat Closed → Hi-Hat
      46: 'j',  // Hi-Hat Open → Hi-Hat Sizzle
      49: 'z',  // Crash Cymbal → Crash FF
      51: 'l',  // Ride Cymbal → Bell Tap
      45: 'w',  // Tom 1 → Snare Rim (短い打撃音)
      47: 'e',  // Tom 2 → Snare Rim Shot (短い打撃音)  
      41: 't',  // Floor Tom → Snare Stick (短い打撃音)
      50: 'u'   // High Tom → Snare Backstick (短い打撃音)
    };
    
    const key = midiToDrumMap[parseInt(midiPitch)];
    if (!key) {
      console.warn(`⚠️ MIDIピッチ ${midiPitch} に対応するドラムキーが見つかりません`);
      // フォールバック: 最初に利用可能なキーを使用
      const availableKeys = Object.keys(drumMapping);
      return availableKeys.length > 0 ? availableKeys[0] : null;
    }
    return key;
  }

  // DiffSinger音声を再生（生成された音声ファイル）
  async playDiffSingerAudio(audioUrl, startTime = 0, duration = null, velocity = 0.8) {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) return null;
    }

    try {
      console.log('🎤 [UnifiedAudio] DiffSinger音声再生:', {
        audioUrl,
        startTime,
        duration,
        velocity
      });

      // 音声ファイルを読み込み
      const audioBuffer = await this.loadAudioFile(audioUrl, false);
      if (!audioBuffer) {
        console.warn(`⚠️ DiffSinger音声ファイルが見つかりません: ${audioUrl}`);
        return null;
      }

      // 音声を再生
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = velocity * this.masterVolume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // 再生時間の制御
      const now = this.audioContext.currentTime;
      if (duration !== null) {
        source.start(now, startTime, duration);
      } else {
        source.start(now, startTime);
      }

      console.log('✅ [UnifiedAudio] DiffSinger音声再生開始');

      return {
        source,
        gainNode,
        startTime: now,
        duration: duration || (audioBuffer.duration - startTime),
        type: 'diffsinger'
      };

    } catch (error) {
      console.error(`❌ DiffSinger音声の再生に失敗: ${error.message}`);
      return null;
    }
  }

  // ドラム音を再生（デバッグコンソールと同じ方法）
  async playDrumSound(key, velocity = 0.8) {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) return null;
    }

    // MIDIピッチ番号の場合は文字列キーに変換
    let drumKey = key;
    if (typeof key === 'string' && !isNaN(parseInt(key))) {
      drumKey = this.midiTodrummingKey(parseInt(key));
      if (!drumKey) return null;
    } else if (typeof key === 'number') {
      drumKey = this.midiTodrummingKey(key);
      if (!drumKey) return null;
    }

    const drumInfo = drumMapping[drumKey];
    if (!drumInfo) {
      console.warn(`⚠️ ドラムキーが見つかりません: ${drumKey} (元: ${key})`);
      return null;
    }

    try {
      // 利用可能なサンプルからランダムに選択
      const availableSamples = drumInfo.samples.filter(sample => sample && sample.length > 0);
      if (availableSamples.length === 0) {
        console.warn(`⚠️ ドラムサンプルが見つかりません: ${drumInfo.name}`);
        return null;
      }

      const randomSample = availableSamples[Math.floor(Math.random() * availableSamples.length)];
      const audioBuffer = await this.loadAudioFile(randomSample, false);
      
      if (!audioBuffer) {
        console.warn(`⚠️ ドラム音ファイルが見つかりません: ${randomSample}`);
        return null;
      }

      return this.playAudioBuffer(audioBuffer, { name: drumInfo.name, volume: drumInfo.volume || 1.0, sample: randomSample }, velocity, 'drum');
    } catch (error) {
      console.error(`❌ ドラム音の再生に失敗: ${error.message}`);
      return null;
    }
  }

  // 音声バッファを再生（ミキサー音量を参照）
  playAudioBuffer(audioBuffer, soundInfo, velocity = 0.8, type = 'piano') {
    if (!audioBuffer) return null;

    // AudioContextの状態を確認し、必要に応じて開始
    if (this.audioContext.state === 'suspended') {
      console.log('🎵 音声再生時にAudioContextが停止状態です。開始中...');
      // 非同期でresume()を実行し、成功したら再生を試行
      this.audioContext.resume().then(() => {
        console.log('🎵 AudioContext開始完了:', this.audioContext.state);
        // 再帰的に再生を試行
        return this.playAudioBuffer(audioBuffer, soundInfo, velocity, type);
      }).catch(error => {
        console.error('❌ AudioContext開始に失敗:', error);
      });
      // 非同期処理中なので一旦nullを返す（再試行は上記のthenで行われる）
      console.log('🎵 AudioContext resume中のため、再生は保留されます');
      return null;
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = audioBuffer;
    
    // ピッチ変更を適用（ピアノの場合）
    let pitchInfo = '';
    if (type === 'piano' && soundInfo.pitch !== 0) {
      const pitchRatio = Math.pow(2, soundInfo.pitch / 12);
      source.playbackRate.value = pitchRatio;
      pitchInfo = ` (ピッチ変更: ${soundInfo.pitch > 0 ? '+' : ''}${soundInfo.pitch}半音, 比率: ${pitchRatio.toFixed(3)})`;
    }
    
    // 音量調整（ミキサー設定を参照）
    const baseVolume = type === 'piano' ? 0.4 : (soundInfo.volume || 0.8); // ベース音量を少し上げる
    
    // トラック音量を取得（デフォルトは1.0）
    let trackVolume = 1.0;
    let isMuted = false;
    
    // 利用可能なトラックから適切なものを選択
    if (type === 'piano') {
      // ピアノトラックを探す（midi-track、piano、またはpianoを含むトラック、またはtrack-1など）
      let foundTrack = false;
      for (const [trackId, track] of this.tracks) {
        if (track.type === 'piano' || track.type.includes('piano') || trackId.includes('midi') || trackId.includes('piano') || trackId === 'track-1') {
          // 現在設定されている音量を取得（デフォルトは0）
          trackVolume = this.trackVolumes.get(trackId) ?? 0;
          isMuted = this.trackMuted.get(trackId) ?? false;
          console.log(`🎵 ピアノトラック音量取得: ${trackId} = ${trackVolume}, ミュート: ${isMuted}`);
          foundTrack = true;
          break;
        }
      }
      if (!foundTrack) {
        console.warn(`⚠️ ピアノトラックが見つかりません。利用可能なトラック:`, Array.from(this.tracks.keys()));
        // トラックが見つからない場合は音量0を使用
        trackVolume = 0;
        isMuted = false;
      }
      
      // 現在の音量設定を詳細にログ出力
      console.log('🔊 ピアノ音再生時の音量設定詳細:');
      console.log(`  - マスターボリューム: ${this.masterVolume}`);
      console.log(`  - トラック音量: ${trackVolume}`);
      console.log(`  - ミュート状態: ${isMuted}`);
      console.log(`  - 利用可能なトラック音量設定:`);
      this.trackVolumes.forEach((vol, id) => {
        console.log(`    - ${id}: ${vol.toFixed(3)}`);
      });
    } else if (type === 'drum') {
      // ドラムトラックを探す（drum、drums、またはdrumを含むトラック）
      let foundTrack = false;
      for (const [trackId, track] of this.tracks) {
        if (track.type === 'drums' || track.type.includes('drum') || trackId.includes('drum')) {
          // 現在設定されている音量を取得（デフォルトは0）
          trackVolume = this.trackVolumes.get(trackId) ?? 0;
          isMuted = this.trackMuted.get(trackId) ?? false;
          console.log(`🥁 ドラムトラック音量取得: ${trackId} = ${trackVolume}, ミュート: ${isMuted}`);
          foundTrack = true;
          break;
        }
      }
      if (!foundTrack) {
        console.warn(`⚠️ ドラムトラックが見つかりません。利用可能なトラック:`, Array.from(this.tracks.keys()));
        // トラックが見つからない場合は音量0を使用
        trackVolume = 0;
        isMuted = false;
      }
    }
    
    // ミュート状態の場合は音量を0にする
    if (isMuted) {
      trackVolume = 0;
    }
    
    // 最終音量計算：ベース音量 × トラック音量 × マスターボリューム（velocityは除外）
    const finalVolume = baseVolume * trackVolume * this.masterVolume;
    gainNode.gain.value = finalVolume;
    
    // 接続（マスターボリュームを経由）
    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // 再生開始
    source.start();
    
    // アクティブサウンドとして記録
    const soundId = `${type}-${Date.now()}-${Math.random()}`;
    this.activeSounds.set(soundId, { 
      source, 
      gainNode, 
      startTime: this.audioContext.currentTime, 
      type,
      soundInfo: soundInfo, // 音の情報を保存
      pitch: soundInfo.pitch || soundInfo.note || null, // ピッチ情報を保存
      trackId: null, // 後で設定可能
      duration: null, // 後で設定可能
      velocity: velocity // ベロシティを保存
    });
    
    // 自動クリーンアップ
    source.onended = () => {
      console.log(`🎵 音の自動終了: ${soundId}`);
      this.activeSounds.delete(soundId);
    };
    
    // 詳細なログ出力
    const fileName = type === 'piano' ? soundInfo.sample : soundInfo.sample;
    const noteName = type === 'piano' ? soundInfo.note : soundInfo.name;
    const muteStatus = isMuted ? ' [ミュート]' : '';
    console.log(`🎵 ${type === 'piano' ? 'ピアノ' : 'ドラム'}音再生: ${noteName} | ファイル: ${fileName} | 音量: ${finalVolume.toFixed(3)} (ベース: ${baseVolume}, トラック: ${trackVolume}, マスター: ${this.masterVolume})${pitchInfo}${muteStatus}`);
    
    // 音量計算の詳細デバッグ
    if (finalVolume === 0) {
      console.warn(`⚠️ 音量が0のため音が聞こえません: ベース(${baseVolume}) × トラック(${trackVolume}) × マスター(${this.masterVolume}) = ${finalVolume}`);
    }
    
    return { source, gainNode, soundId };
  }

  // マスターボリュームを設定（重複実行を防ぐ）
  setMasterVolume(volume) {
    // 既存のマスターボリュームと同じ場合はスキップ
    if (this.masterVolume === volume) {
      return;
    }
    
    console.log(`🎵 setMasterVolume called: volume=${volume} (type: ${typeof volume})`);
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
    console.log(`🎵 マスターボリューム設定: ${this.masterVolume.toFixed(3)}`);
  }

  // 全音を停止
  stopAllSounds() {
    console.log(`🎵 全音停止開始: ${this.activeSounds.size}個の音を停止します`);
    
    this.activeSounds.forEach((sound, soundId) => {
      try {
        console.log(`🎵 音を停止中: ${soundId} (ピッチ: ${sound.pitch || '不明'}, トラック: ${sound.trackId || '不明'})`);
        
        // 音声ノードが存在する場合は停止
        if (sound.source && typeof sound.source.stop === 'function') {
          sound.source.stop();
        }
        if (sound.gainNode && typeof sound.gainNode.disconnect === 'function') {
          sound.gainNode.disconnect();
        }
        
        // オシレーターも停止
        if (sound.oscillator && typeof sound.oscillator.stop === 'function') {
          sound.oscillator.stop();
        }
        if (sound.filter && typeof sound.filter.disconnect === 'function') {
          sound.filter.disconnect();
        }
        
        console.log(`🎵 音の停止完了: ${soundId}`);
      } catch (error) {
        console.warn(`音の停止に失敗: ${soundId}`, error);
      }
    });
    
    this.activeSounds.clear();
    console.log('🎵 全音を停止しました');
  }

  // 特定の音を停止
  stopSound(soundId) {
    const sound = this.activeSounds.get(soundId);
    if (sound) {
      try {
        // 音の情報をログ出力
        const pitchInfo = sound.pitch !== undefined ? `ピッチ: ${sound.pitch}` : 'ピッチ: 不明';
        const trackInfo = sound.trackId || 'トラック: 不明';
        console.log(`🎵 音を停止中: ${soundId} (${pitchInfo}, ${trackInfo})`);
        
        // 音声ノードが存在する場合は停止
        if (sound.source && typeof sound.source.stop === 'function') {
          sound.source.stop();
        }
        if (sound.gainNode && typeof sound.gainNode.disconnect === 'function') {
          sound.gainNode.disconnect();
        }
        
        // アクティブサウンドから削除
        this.activeSounds.delete(soundId);
        console.log(`🎵 音の停止完了: ${soundId}`);
      } catch (error) {
        console.warn(`音の停止に失敗: ${soundId}`, error);
        // エラーが発生してもアクティブサウンドからは削除
        this.activeSounds.delete(soundId);
      }
    } else {
      console.log(`🎵 停止対象の音が見つかりません: ${soundId}`);
    }
  }

  // 現在の時間を取得
  getCurrentTime() {
    return this.audioContext ? this.audioContext.currentTime : 0;
  }

  // 総再生時間を取得（デフォルト値）
  getTotalDuration() {
    // 統一された音声システムでは、個別の音声ファイルの再生時間を管理
    // 現在はデフォルト値を返す（必要に応じて実装を拡張）
    return 300; // 5分（秒単位）
  }

  // 再生を停止
  stop() {
    this.stopAllSounds();
    console.log('🎵 統一音声システム: 全音停止');
  }

  // イベントリスナーの追加
  addListener(callback) {
    this.listeners.add(callback);
  }

  // イベントリスナーの削除
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // イベントの発行
  emit(eventType, data) {
    this.listeners.forEach(callback => {
      try {
        callback(eventType, data);
      } catch (error) {
        console.error('イベントリスナーの実行に失敗:', error);
      }
    });
  }

  // デバッグ情報を取得
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      audioContextState: this.audioContext ? this.audioContext.state : 'null',
      audioContextSampleRate: this.audioContext ? this.audioContext.sampleRate : 'null',
      masterVolume: this.masterVolume,
      activeSoundsCount: this.activeSounds.size,
      loadedBuffersCount: Object.keys(this.audioBuffers).length,
      tracksCount: this.tracks.size
    };
  }

  // トラックを追加
  addTrack(trackId, trackName, trackType = 'piano', trackColor = '#ffffff', trackData = {}) {
    this.tracks.set(trackId, {
      id: trackId,
      name: trackName,
      type: trackType,
      color: trackColor,
      data: trackData
    });
    this.trackVolumes.set(trackId, 1.0);
    this.trackMuted.set(trackId, false);
    this.trackSolo.set(trackId, false);
    console.log(`🎵 トラック追加: ${trackId} (${trackName})`);
  }

  // トラック音量を設定（重複実行を防ぐ）
  setTrackVolume(trackId, volume) {
    // 既存の音量と同じ場合はスキップ
    const currentVolume = this.trackVolumes.get(trackId);
    if (currentVolume === volume) {
      return;
    }
    
    console.log(`🎵 setTrackVolume called: trackId=${trackId}, volume=${volume} (type: ${typeof volume})`);
    this.trackVolumes.set(trackId, volume);
    console.log(`🎵 トラック音量設定: ${trackId} = ${volume.toFixed(3)}`);
    
    // デバッグ: 現在の全トラック音量を表示
    console.log('🔊 現在の全トラック音量:');
    this.trackVolumes.forEach((vol, id) => {
      console.log(`  - ${id}: ${vol.toFixed(3)}`);
    });
  }

  // トラックミュートを設定（重複実行を防ぐ）
  setTrackMuted(trackId, muted) {
    // 既存のミュート状態と同じ場合はスキップ
    const currentMuted = this.trackMuted.get(trackId);
    if (currentMuted === muted) {
      return;
    }
    
    console.log(`🎵 setTrackMuted called: trackId=${trackId}, muted=${muted} (type: ${typeof muted})`);
    this.trackMuted.set(trackId, muted);
    console.log(`🎵 トラックミュート設定: ${trackId} = ${muted}`);
  }

  // トラックソロを設定
  setTrackSolo(trackId, solo) {
    console.log(`🎵 setTrackSolo called: trackId=${trackId}, solo=${solo} (type: ${typeof solo})`);
    this.trackSolo.set(trackId, solo);
    console.log(`🎵 トラックソロ設定: ${trackId} = ${solo}`);
  }

  // ドラムトラック専用の再生機能
  playDrumTrackPattern(trackId, pattern, bpm = 120) {
    if (!this.isInitialized) {
      console.warn('🥁 音声システムが初期化されていません');
      return null;
    }

    const track = this.tracks.get(trackId);
    if (!track || track.type !== 'drums') {
      console.warn(`🥁 ドラムトラックが見つかりません: ${trackId}`);
      return null;
    }

    if (this.trackMuted.get(trackId)) {
      console.log(`🥁 ドラムトラックがミュートされています: ${trackId}`);
      return null;
    }

    console.log(`🥁 ドラムパターン再生開始: ${trackId}, BPM: ${bpm}`);
    
    // パターン再生のスケジューリング
    const stepDuration = 60 / bpm / 4; // 16分音符の長さ
    const patternId = `pattern-${trackId}-${Date.now()}`;
    
    // パターンの各ステップをスケジュール
    pattern.grid.forEach((row, instrumentIndex) => {
      const instrument = pattern.instruments[instrumentIndex];
      if (!instrument) return;
      
      row.forEach((cell, stepIndex) => {
        if (cell && (typeof cell === 'boolean' || cell.active)) {
          const velocity = (typeof cell === 'object' && cell.velocity) || instrument.velocity || 0.8;
          const delay = stepIndex * stepDuration * 1000; // ミリ秒に変換
          
          setTimeout(() => {
            // instrument.key または instrument.pitch を使用
            const drumKey = instrument.key || instrument.pitch;
            this.playDrumSound(drumKey, velocity);
          }, delay);
        }
      });
    });
    
    return patternId;
  }

  // 同期的なピアノ音再生（クリック・キーボード用）
  playPianoNoteSync(pitch, velocity = 0.8) {
    if (!this.isInitialized) {
      console.warn('音声システムが初期化されていません');
      return null;
    }

    try {
      console.log(`🎹 同期的ピアノ音再生: ${pitch}, velocity: ${velocity}`);
      
      // ピアノキーマッピングから音ファイル情報を取得
      const keyInfo = pianoKeyMapping[pitch];
      if (!keyInfo) {
        console.warn(`ピッチ ${pitch} のキー情報が見つかりません`);
        return null;
      }

      // 音ファイルを読み込んで再生（同期的に処理）
      this.loadAudioFile(keyInfo.sample, true).then(audioBuffer => {
        if (audioBuffer) {
          const result = this.playAudioBuffer(audioBuffer, keyInfo, velocity, 'piano');
          if (result && result.soundId) {
            console.log(`🎹 同期的ピアノ音再生完了: ${result.soundId}`);
          }
        }
      }).catch(error => {
        console.error('同期的ピアノ音再生エラー:', error);
      });

      return { pitch, velocity, type: 'piano' };
    } catch (error) {
      console.error('同期的ピアノ音再生エラー:', error);
      return null;
    }
  }

  // ドラム音の即座再生（クリック用）
  playDrumSoundImmediate(pitch, velocity = 0.8, targetTrackId = null) {
    console.log(`🥁 即座ドラム音再生: ${pitch}, velocity: ${velocity}, targetTrack: ${targetTrackId}`);
    
    if (targetTrackId) {
      // 特定のトラックIDが指定された場合、そのトラックの音量・ミュート設定を使用
      return this.playDrumSoundWithTrackSettings(pitch.toString(), velocity, targetTrackId);
    } else {
      // 従来の方法（最初に見つかったドラムトラックを使用）
      return this.playDrumSound(pitch.toString(), velocity);
    }
  }

  // 特定のトラック設定でドラム音を再生
  playDrumSoundWithTrackSettings(key, velocity = 0.8, trackId) {
    console.log(`🥁 特定トラック設定でドラム音再生: key=${key}, velocity=${velocity}, trackId=${trackId}`);
    
    if (!this.isInitialized) {
      console.warn('🥁 音声システムが初期化されていません');
      return null;
    }

    // MIDIピッチ番号の場合は文字列キーに変換
    let drumKey = key;
    if (typeof key === 'string' && !isNaN(parseInt(key))) {
      drumKey = this.midiTodrummingKey(parseInt(key));
      if (!drumKey) return null;
    } else if (typeof key === 'number') {
      drumKey = this.midiTodrummingKey(key);
      if (!drumKey) return null;
    }

    const drumInfo = drumMapping[drumKey];
    if (!drumInfo) {
      console.warn(`⚠️ ドラムキーが見つかりません: ${drumKey} (元: ${key})`);
      return null;
    }

    // 指定されたトラックの音量・ミュート設定を取得
    const trackVolume = this.trackVolumes.get(trackId) ?? 1.0;
    const isMuted = this.trackMuted.get(trackId) ?? false;
    
    console.log(`🥁 指定トラック設定: ${trackId} - 音量: ${trackVolume}, ミュート: ${isMuted}`);

    if (isMuted) {
      console.log(`🥁 トラックがミュートされています: ${trackId}`);
      return null;
    }

    try {
      // 利用可能なサンプルからランダムに選択
      const availableSamples = drumInfo.samples.filter(sample => sample && sample.length > 0);
      if (availableSamples.length === 0) {
        console.warn(`⚠️ ドラムサンプルが見つかりません: ${drumInfo.name}`);
        return null;
      }

      const randomSample = availableSamples[Math.floor(Math.random() * availableSamples.length)];
      
      return this.loadAudioFile(randomSample, false).then(audioBuffer => {
        if (!audioBuffer) {
          console.warn(`⚠️ ドラム音ファイルが見つかりません: ${randomSample}`);
          return null;
        }

        // 特定トラックの設定で音声バッファを再生
        return this.playAudioBufferWithTrackSettings(audioBuffer, { 
          name: drumInfo.name, 
          volume: drumInfo.volume || 1.0, 
          sample: randomSample 
        }, velocity, 'drum', trackVolume);
      });

    } catch (error) {
      console.error(`❌ ドラム音の再生に失敗: ${error.message}`);
      return null;
    }
  }

  // 特定のトラック音量設定で音声バッファを再生
  playAudioBufferWithTrackSettings(audioBuffer, soundInfo, velocity = 0.8, type = 'piano', trackVolume = 1.0) {
    if (!audioBuffer) return null;

    // AudioContextの状態を確認し、必要に応じて開始
    if (this.audioContext.state === 'suspended') {
      console.log('🎵 音声再生時にAudioContextが停止状態です。開始中...');
      // 非同期でresume()を実行し、成功したら再生を試行
      this.audioContext.resume().then(() => {
        console.log('🎵 AudioContext開始完了:', this.audioContext.state);
        // 再帰的に再生を試行
        return this.playAudioBufferWithTrackSettings(audioBuffer, soundInfo, velocity, type, trackVolume);
      }).catch(error => {
        console.error('❌ AudioContext開始に失敗:', error);
      });
      // 非同期処理中なので一旦nullを返す（再試行は上記のthenで行われる）
      console.log('🎵 AudioContext resume中のため、再生は保留されます');
      return null;
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = audioBuffer;
    
    // ピッチ変更を適用（ピアノの場合）
    let pitchInfo = '';
    if (type === 'piano' && soundInfo.pitch !== 0) {
      const pitchRatio = Math.pow(2, soundInfo.pitch / 12);
      source.playbackRate.value = pitchRatio;
      pitchInfo = ` (ピッチ変更: ${soundInfo.pitch > 0 ? '+' : ''}${soundInfo.pitch}半音, 比率: ${pitchRatio.toFixed(3)})`;
    }
    
    // 音量調整（指定されたトラック音量を使用）
    const baseVolume = type === 'piano' ? 0.4 : (soundInfo.volume || 0.8);
    
    // 最終音量計算：ベース音量 × 指定トラック音量 × マスターボリューム
    const finalVolume = baseVolume * trackVolume * this.masterVolume;
    gainNode.gain.value = finalVolume;
    
    // 接続（マスターボリュームを経由）
    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // 再生開始
    source.start();
    
    // アクティブサウンドとして記録
    const soundId = `${type}-${Date.now()}-${Math.random()}`;
    this.activeSounds.set(soundId, { source, gainNode, startTime: this.audioContext.currentTime, type });
    
    // 自動クリーンアップ
    source.onended = () => {
      this.activeSounds.delete(soundId);
    };
    
    // 詳細なログ出力
    const fileName = type === 'piano' ? soundInfo.sample : soundInfo.sample;
    const noteName = type === 'piano' ? soundInfo.note : soundInfo.name;
    console.log(`🎵 ${type === 'piano' ? 'ピアノ' : 'ドラム'}音再生(特定トラック): ${noteName} | ファイル: ${fileName} | 音量: ${finalVolume.toFixed(3)} (ベース: ${baseVolume}, トラック: ${trackVolume}, マスター: ${this.masterVolume})${pitchInfo}`);
    
    return { source, gainNode, soundId };
  }

  // ドラムトラックの停止
  stopDrumTrack(trackId) {
    // ドラムトラック関連の音をすべて停止
    this.activeSounds.forEach((sound, soundId) => {
      if (sound.type === 'drum') {
        try {
          sound.source.stop();
          sound.gainNode.disconnect();
          this.activeSounds.delete(soundId);
        } catch (error) {
          // 既に停止している場合は無視
        }
      }
    });
    console.log(`🥁 ドラムトラック停止: ${trackId}`);
  }

  // ノートをスケジュール（改善版）
  async scheduleNote(trackId, pitch, startTime, duration, velocity = 0.8) {
    if (!this.isInitialized) {
      console.warn('音声システムが初期化されていません');
      return null;
    }

    const track = this.tracks.get(trackId);
    if (!track) {
      console.warn(`トラックが見つかりません: ${trackId}`);
      return null;
    }

    if (this.trackMuted.get(trackId)) {
      console.log(`トラックがミュートされています: ${trackId}`);
      return null;
    }

    try {
      let soundResult = null;
      
      // 音を再生（非同期で待機）
      if (track.type === 'piano' || track.type.includes('piano')) {
        soundResult = await this.playPianoNote(pitch, velocity);
      } else if (track.type === 'drum' || track.type.includes('drum')) {
        soundResult = await this.playDrumSound(pitch.toString(), velocity);
      } else {
        // デフォルトはピアノ
        soundResult = await this.playPianoNote(pitch, velocity);
      }
      
      console.log('🎵 scheduleNote: 音再生結果:', soundResult);
      
      // 音の終了処理をスケジュール
      if (soundResult && duration > 0) {
        const soundId = soundResult.soundId || `scheduled-${trackId}-${pitch}-${Date.now()}`;
        
        // 音の終了をスケジュール
        setTimeout(() => {
          this.stopSound(soundId);
          console.log(`🎵 スケジュールされた音を終了: ${soundId} (ピッチ: ${pitch}, 長さ: ${duration}秒)`);
        }, duration * 1000);
        
        // 音の情報を保存（既存の情報がある場合は更新）
        if (soundResult.soundId) {
          // playPianoNoteから返された音IDを使用
          const existingSound = this.activeSounds.get(soundResult.soundId);
          if (existingSound) {
            existingSound.duration = duration;
            existingSound.trackId = trackId;
            console.log(`🎵 既存の音情報を更新: ${soundResult.soundId}`);
          }
        } else {
          // 新しい音情報を作成
          this.activeSounds.set(soundId, {
            type: track.type,
            pitch: pitch,
            startTime: this.audioContext.currentTime,
            duration: duration,
            velocity: velocity,
            trackId: trackId
          });
        }
        
        console.log(`🎵 音をスケジュール: ${soundId} (ピッチ: ${pitch}, 長さ: ${duration}秒, 終了予定: ${new Date(Date.now() + duration * 1000).toLocaleTimeString()})`);
        
        return {
          soundId: soundId,
          type: track.type,
          pitch: pitch,
          duration: duration,
          endTime: this.audioContext.currentTime + duration,
          ...soundResult // 元の結果も含める
        };
      }
      
      return soundResult;
    } catch (error) {
      console.error(`ノートのスケジュールに失敗: ${error.message}`);
      return null;
    }
  }

  // トラックの楽器を取得（デバッグコンソールと同じ方法）
  getInstrumentForTrack(instrumentType) {
    // シンプルな楽器マッピング
    const instrumentMap = {
      'piano': 'piano',
      'acoustic_grand_piano': 'piano',
      'bright_acoustic_piano': 'piano',
      'electric_grand_piano': 'piano',
      'honky_tonk_piano': 'piano',
      'electric_piano_1': 'piano',
      'electric_piano_2': 'piano',
      'harpsichord': 'piano',
      'clavi': 'piano',
      'drum': 'drum',
      'drums': 'drum',
      'percussion': 'drum'
    };

    const mappedType = instrumentMap[instrumentType] || 'piano';
    console.log(`🎵 楽器マッピング: ${instrumentType} -> ${mappedType}`);
    
    return {
      type: mappedType,
      name: instrumentType,
      playNote: (pitch, velocity) => {
        if (mappedType === 'piano') {
          return this.playPianoNote(pitch, velocity);
        } else if (mappedType === 'drum') {
          return this.playDrumSound(pitch.toString(), velocity);
        }
        return null;
      }
    };
  }

  // トラックの楽器を設定
  setTrackInstrument(trackId, instrumentType) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.type = instrumentType;
      track.instrument = this.getInstrumentForTrack(instrumentType);
      console.log(`🎵 トラック楽器設定: ${trackId} -> ${instrumentType}`);
    } else {
      console.warn(`トラックが見つかりません: ${trackId}`);
    }
  }
}

// シングルトンインスタンスを作成
const unifiedAudioSystem = new UnifiedAudioSystem();

// グローバルに利用可能にする
if (typeof window !== 'undefined') {
  window.unifiedAudioSystem = unifiedAudioSystem;
  
  // デバッグコンソールと同じテスト関数
  window.testUnifiedAudio = async (type = 'piano', key = '60') => {
    console.log(`🎵 統一音声システムテスト: ${type} - キー ${key}`);
    try {
      if (type === 'piano') {
        await unifiedAudioSystem.playPianoNote(parseInt(key));
      } else {
        await unifiedAudioSystem.playDrumSound(key);
      }
    } catch (error) {
      console.error('テストに失敗:', error);
    }
  };
  
  // デバッグ情報を表示
  window.showUnifiedAudioDebug = () => {
    const debugInfo = unifiedAudioSystem.getDebugInfo();
    console.log('🎵 統一音声システム デバッグ情報:', debugInfo);
    
    // 読み込まれた音声ファイルの一覧
    console.log('📁 読み込まれた音声ファイル:');
    Object.keys(unifiedAudioSystem.audioBuffers).forEach(filename => {
      console.log(`  - ${filename}`);
    });
    
    // 現在再生中の音
    console.log('🔊 現在再生中の音:');
    unifiedAudioSystem.activeSounds.forEach((sound, soundId) => {
      console.log(`  - ${soundId}: ${sound.type} (開始時刻: ${sound.startTime.toFixed(2)}s)`);
    });
    
    // トラック情報
    console.log('🎛️ トラック情報:');
    unifiedAudioSystem.tracks.forEach((track, trackId) => {
      const volume = unifiedAudioSystem.trackVolumes.get(trackId) || 1.0;
      const muted = unifiedAudioSystem.trackMuted.get(trackId) || false;
      console.log(`  - ${trackId}: ${track.name} (音量: ${volume.toFixed(3)}, ミュート: ${muted})`);
    });
    
    // 音量設定の詳細
    console.log('🔊 音量設定詳細:');
    console.log(`  - マスターボリューム: ${unifiedAudioSystem.masterVolume.toFixed(3)}`);
    console.log(`  - 利用可能なトラック数: ${unifiedAudioSystem.tracks.size}`);
    console.log(`  - ピアノトラック: ${Array.from(unifiedAudioSystem.tracks.keys()).filter(id => id.includes('midi') || id.includes('piano') || id === 'track-1').join(', ') || 'なし'}`);
    console.log(`  - ドラムトラック: ${Array.from(unifiedAudioSystem.tracks.keys()).filter(id => id.includes('drum')).join(', ') || 'なし'}`);
    console.log('🔊 トラック音量詳細:');
    unifiedAudioSystem.tracks.forEach((track, trackId) => {
      const volume = unifiedAudioSystem.trackVolumes.get(trackId) || 1.0;
      const muted = unifiedAudioSystem.trackMuted.get(trackId) || false;
      console.log(`    - ${trackId}: ${volume.toFixed(3)} (ミュート: ${muted})`);
    });
  };

  // デバッグコンソールと同じピアノテスト関数
  window.pianotest = (key = 60) => {
    unifiedAudioSystem.playPianoNote(key);
  };

  // デバッグコンソールと同じドラムテスト関数
  window.drumtest = (key) => {
    unifiedAudioSystem.playDrumSound(key);
  };

  // 音の停止デバッグ関数
  window.debugstopnote = (soundId = null) => {
    console.log('🎵 音の停止デバッグ開始');
    
    // 現在のアクティブサウンドの状態を表示
    console.log('🔊 現在のアクティブサウンド:');
    if (unifiedAudioSystem.activeSounds.size === 0) {
      console.log('  - アクティブな音はありません');
    } else {
      unifiedAudioSystem.activeSounds.forEach((sound, id) => {
        console.log(`  - ${id}:`, {
          type: sound.type,
          pitch: sound.pitch,
          startTime: sound.startTime,
          duration: sound.duration,
          velocity: sound.velocity,
          trackId: sound.trackId,
          hasSource: !!sound.source,
          hasGainNode: !!sound.gainNode,
          sourceState: sound.source ? 'exists' : 'null',
          gainNodeState: sound.gainNode ? 'exists' : 'null'
        });
      });
    }
    
    // 特定の音IDが指定された場合はその音を停止
    if (soundId) {
      console.log(`🎵 指定された音IDを停止: ${soundId}`);
      unifiedAudioSystem.stopSound(soundId);
    } else {
      // 音IDが指定されていない場合は最初の音を停止
      const firstSoundId = Array.from(unifiedAudioSystem.activeSounds.keys())[0];
      if (firstSoundId) {
        console.log(`🎵 最初の音を停止: ${firstSoundId}`);
        unifiedAudioSystem.stopSound(firstSoundId);
      } else {
        console.log('🎵 停止可能な音がありません');
      }
    }
    
    // 停止後の状態を確認
    setTimeout(() => {
      console.log('🔊 停止後のアクティブサウンド:');
      if (unifiedAudioSystem.activeSounds.size === 0) {
        console.log('  - アクティブな音はありません');
      } else {
        unifiedAudioSystem.activeSounds.forEach((sound, id) => {
          console.log(`  - ${id}: ${sound.type} (ピッチ: ${sound.pitch})`);
        });
      }
    }, 100);
  };

  // 音の再生デバッグ関数
  window.debugplaynote = async (pitch = 60, duration = 1.0) => {
    console.log(`🎵 音の再生デバッグ開始: ピッチ=${pitch}, 長さ=${duration}秒`);
    
    try {
      // ピアノ音を再生（非同期で待機）
      const result = await unifiedAudioSystem.playPianoNote(pitch, 0.8);
      console.log('🎵 再生結果:', result);
      
      // playPianoNoteが既に音を登録しているので、その音IDを使用
      let soundId = null;
      if (result && result.soundId) {
        soundId = result.soundId;
        console.log(`🎵 既存の音IDを使用: ${soundId}`);
        
        // 音の情報を更新（durationを追加）
        const existingSound = unifiedAudioSystem.activeSounds.get(soundId);
        if (existingSound) {
          existingSound.duration = duration;
          existingSound.pitch = pitch;
          existingSound.velocity = 0.8;
          existingSound.trackId = 'debug-track';
          console.log(`🎵 既存の音情報を更新: ${soundId}`);
        }
      } else {
        console.log(`❌ 音の再生に失敗しました`);
        return null;
      }
      
      // 指定された時間後に自動停止
      setTimeout(() => {
        console.log(`🎵 デバッグ音の自動停止: ${soundId}`);
        unifiedAudioSystem.stopSound(soundId);
      }, duration * 1000);
      
      return soundId;
    } catch (error) {
      console.error(`❌ 音の再生デバッグ中にエラー:`, error);
      return null;
    }
  };

  // 音の状態確認関数
  window.debugsoundstatus = () => {
    console.log('🎵 音声システム状態確認');
    console.log('📊 基本情報:', {
      isInitialized: unifiedAudioSystem.isInitialized,
      audioContextState: unifiedAudioSystem.audioContext ? unifiedAudioSystem.audioContext.state : 'null',
      masterVolume: unifiedAudioSystem.masterVolume,
      activeSoundsCount: unifiedAudioSystem.activeSounds.size
    });
    
    console.log('🔊 アクティブサウンド詳細:');
    unifiedAudioSystem.activeSounds.forEach((sound, id) => {
      console.log(`  - ${id}:`, {
        type: sound.type,
        pitch: sound.pitch,
        startTime: sound.startTime,
        duration: sound.duration,
        velocity: sound.velocity,
        trackId: sound.trackId,
        hasSource: !!sound.source,
        hasGainNode: !!sound.gainNode,
        sourceState: sound.source ? 'exists' : 'null',
        gainNodeState: sound.gainNode ? 'exists' : 'null'
      });
    });
    
    console.log('🎛️ トラック情報:');
    unifiedAudioSystem.tracks.forEach((track, id) => {
      const volume = unifiedAudioSystem.trackVolumes.get(id) || 1.0;
      const muted = unifiedAudioSystem.trackMuted.get(id) || false;
      console.log(`  - ${id}: ${track.name} (音量: ${volume.toFixed(3)}, ミュート: ${muted})`);
    });
  };

  // スケジュールされた音の停止テスト関数
  window.debugschedulestop = (pitch = 60, duration = 1.5) => {
    console.log(`🎵 スケジュール停止テスト開始: ピッチ=${pitch}, 長さ=${duration}秒`);
    
    // テスト用トラックを追加（存在しない場合）
    if (!unifiedAudioSystem.tracks.has('test-track')) {
      unifiedAudioSystem.addTrack('test-track', 'Test Track', 'piano', '#ffffff');
      console.log('🎵 テスト用トラックを追加しました');
    }
    
    // スケジュールされた音を再生
    const result = unifiedAudioSystem.scheduleNote('test-track', pitch, 0, duration, 0.8);
    console.log('🎵 スケジュール結果:', result);
    
    if (result && result.soundId) {
      console.log(`🎵 スケジュールされた音ID: ${result.soundId}`);
      
      // 0.5秒後に手動で停止（音が途切れる前に停止）
      setTimeout(() => {
        console.log(`🎵 手動停止実行: ${result.soundId}`);
        unifiedAudioSystem.stopSound(result.soundId);
        
        // 停止後の状態を確認
        setTimeout(() => {
          console.log('🔊 手動停止後のアクティブサウンド:');
          if (unifiedAudioSystem.activeSounds.size === 0) {
            console.log('  - アクティブな音はありません');
          } else {
            unifiedAudioSystem.activeSounds.forEach((sound, id) => {
              console.log(`  - ${id}: ${sound.type} (ピッチ: ${sound.pitch})`);
            });
          }
        }, 100);
      }, 500);
      
      return result.soundId;
    } else {
      console.log('🎵 スケジュールに失敗しました');
      return null;
    }
  };

  // 全音停止テスト関数
  window.debugstopall = () => {
    console.log('🎵 全音停止テスト開始');
    console.log(`🎵 停止前のアクティブサウンド数: ${unifiedAudioSystem.activeSounds.size}`);
    
    // 全音を停止
    unifiedAudioSystem.stopAllSounds();
    
    // 停止後の状態を確認
    setTimeout(() => {
      console.log(`🎵 停止後のアクティブサウンド数: ${unifiedAudioSystem.activeSounds.size}`);
      if (unifiedAudioSystem.activeSounds.size === 0) {
        console.log('✅ 全音停止成功');
      } else {
        console.log('❌ 全音停止失敗 - 残っている音:');
        unifiedAudioSystem.activeSounds.forEach((sound, id) => {
          console.log(`  - ${id}: ${sound.type} (ピッチ: ${sound.pitch})`);
        });
      }
    }, 100);
  };

  // 音ファイルの長さを確認する関数
  window.debugaudiolength = (pitch = 60) => {
    console.log(`🎵 音ファイルの長さ確認: ピッチ=${pitch}`);
    
    const keyInfo = pianoKeyMapping[pitch];
    if (!keyInfo) {
      console.log(`❌ ピッチ ${pitch} のキー情報が見つかりません`);
      return;
    }
    
    console.log(`📁 音ファイル: ${keyInfo.sample}`);
    
    // 音ファイルを読み込んで長さを確認
    unifiedAudioSystem.loadAudioFile(keyInfo.sample, true).then(audioBuffer => {
      if (audioBuffer) {
        const duration = audioBuffer.duration;
        console.log(`⏱️ 音ファイルの実際の長さ: ${duration.toFixed(3)}秒`);
        console.log(`📊 音ファイル情報:`, {
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
          length: audioBuffer.length,
          duration: duration
        });
        
        // 適切なテスト用の長さを提案
        const testDuration = Math.min(duration * 0.8, 1.0); // 音ファイルの80%または最大1秒
        console.log(`💡 推奨テスト用長さ: ${testDuration.toFixed(3)}秒`);
        
        return { duration, testDuration };
      } else {
        console.log(`❌ 音ファイルの読み込みに失敗: ${keyInfo.sample}`);
      }
    }).catch(error => {
      console.error(`❌ 音ファイルの確認中にエラー:`, error);
    });
  };

  // 短い音の停止テスト関数
  window.debugshortstop = (pitch = 60) => {
    console.log(`🎵 短い音の停止テスト開始: ピッチ=${pitch}`);
    
    // 音ファイルの長さを確認
    debugaudiolength(pitch).then(({ duration, testDuration }) => {
      if (duration) {
        // 短い音として再生（0.3秒）
        const shortDuration = 0.3;
        console.log(`🎵 短い音を再生: ${shortDuration}秒`);
        
        const result = unifiedAudioSystem.playPianoNote(pitch, 0.8);
        if (result) {
          const soundId = `short-${pitch}-${Date.now()}`;
          unifiedAudioSystem.activeSounds.set(soundId, {
            type: 'piano',
            pitch: pitch,
            startTime: unifiedAudioSystem.audioContext.currentTime,
            duration: shortDuration,
            velocity: 0.8,
            trackId: 'debug-track',
            source: result.source,
            gainNode: result.gainNode
          });
          
          console.log(`🎵 短い音を登録: ${soundId}`);
          
          // 0.1秒後に停止（音が途切れる前に停止）
          setTimeout(() => {
            console.log(`🎵 短い音を手動停止: ${soundId}`);
            unifiedAudioSystem.stopSound(soundId);
            
            setTimeout(() => {
              console.log('🔊 短い音停止後のアクティブサウンド:');
              if (unifiedAudioSystem.activeSounds.size === 0) {
                console.log('  - アクティブな音はありません');
              } else {
                unifiedAudioSystem.activeSounds.forEach((sound, id) => {
                  console.log(`  - ${id}: ${sound.type} (ピッチ: ${sound.pitch})`);
                });
              }
            }, 100);
          }, 100);
          
          return soundId;
        }
      }
    });
  };

  // 同期的な音の再生デバッグ関数（簡易版）
  window.debugplaynotesync = (pitch = 60, duration = 1.0) => {
    console.log(`🎵 同期的音の再生デバッグ開始: ピッチ=${pitch}, 長さ=${duration}秒`);
    
    // 直接playAudioBufferを使用して同期的に再生
    const keyInfo = pianoKeyMapping[pitch];
    if (!keyInfo) {
      console.log(`❌ ピッチ ${pitch} のキー情報が見つかりません`);
      return null;
    }
    
    // 音ファイルを読み込んで再生
    unifiedAudioSystem.loadAudioFile(keyInfo.sample, true).then(audioBuffer => {
      if (audioBuffer) {
        const result = unifiedAudioSystem.playAudioBuffer(audioBuffer, keyInfo, 0.8, 'piano');
        if (result && result.soundId) {
          const soundId = result.soundId;
          console.log(`🎵 同期的に音を再生: ${soundId}`);
          
          // 音の情報を更新
          const existingSound = unifiedAudioSystem.activeSounds.get(soundId);
          if (existingSound) {
            existingSound.duration = duration;
            existingSound.pitch = pitch;
            existingSound.velocity = 0.8;
            existingSound.trackId = 'debug-track';
            console.log(`🎵 音情報を更新: ${soundId}`);
          }
          
          // 指定された時間後に自動停止
          setTimeout(() => {
            console.log(`🎵 同期的音の自動停止: ${soundId}`);
            unifiedAudioSystem.stopSound(soundId);
          }, duration * 1000);
          
          return soundId;
        }
      }
    });
  };

  // ドラムトラック専用テスト関数（基本ドラムテストと同じ方法）
  window.testDrumTrack = () => {
    console.log('🥁 ドラムトラック機能テスト開始');
    
    // ドラムトラックを追加
    if (!unifiedAudioSystem.tracks.has('test-drum-track')) {
      unifiedAudioSystem.addTrack('test-drum-track', 'Test Drum Track', 'drums', '#ff6b6b');
      console.log('🥁 テスト用ドラムトラックを追加しました');
    }
    
    // 基本的なドラムパターンをテスト（デバッグコンソールと同じドラムキーを使用）
    const testPattern = {
      grid: [
        [true, false, false, false, true, false, false, false], // Kick → 'a'
        [false, false, true, false, false, false, true, false], // Snare → 'q'
        [true, true, true, true, true, true, true, true], // Hi-Hat → 'h'
      ],
      instruments: [
        { key: 'a', velocity: 0.8, name: 'Kick' },      // Bass 2
        { key: 'q', velocity: 0.7, name: 'Snare' },     // Snare Hit
        { key: 'h', velocity: 0.6, name: 'Hi-Hat' }     // Hi-Hat
      ]
    };
    
    console.log('🥁 テストパターンを再生します...');
    unifiedAudioSystem.playDrumTrackPattern('test-drum-track', testPattern, 120);
  };

  // ドラムキット全体のテスト（基本ドラムテストと同じ方法）
  window.testDrumKit = () => {
    console.log('🥁 ドラムキット全体テスト開始');
    const drumKeys = ['a', 'q', 'h', 'j', 'z', 'o', '1', '2', '3']; // 基本的なドラム音
    
    drumKeys.forEach((key, index) => {
      setTimeout(() => {
        const drumInfo = drumMapping[key];
        const drumName = drumInfo ? drumInfo.name : 'Unknown';
        console.log(`🥁 ドラム音テスト: キー '${key}' (${drumName})`);
        unifiedAudioSystem.playDrumSoundImmediate(key, 0.8);
      }, index * 300); // 300msずつずらして再生
    });
  };

  // ドラムトラックの音量テスト（詳細デバッグ付き）
  window.testDrumVolume = () => {
    console.log('🥁 ドラム音量レベルテスト開始');
    
    // ドラムトラックを追加
    if (!unifiedAudioSystem.tracks.has('volume-test-drum')) {
      unifiedAudioSystem.addTrack('volume-test-drum', 'Volume Test Drum', 'drums', '#ff6b6b');
      console.log('🥁 音量テスト用ドラムトラック追加完了');
    }
    
    // 現在の設定を確認
    console.log('🔊 テスト前の設定確認:');
    console.log(`  - マスターボリューム: ${unifiedAudioSystem.masterVolume}`);
    console.log(`  - 利用可能なトラック: ${Array.from(unifiedAudioSystem.tracks.keys()).join(', ')}`);
    
    const volumes = [0.1, 0.3, 0.5, 0.7, 1.0]; // より明確な音量差にする
    console.log(`🔊 テストする音量レベル: ${volumes.join(', ')}`);
    
    volumes.forEach((volume, index) => {
      setTimeout(() => {
        console.log(`\n=== 音量テスト ${index + 1}/5: ${volume} ===`);
        
        // 音量設定前の状態
        const beforeVolume = unifiedAudioSystem.trackVolumes.get('volume-test-drum') || 'undefined';
        console.log(`🔊 設定前のトラック音量: ${beforeVolume}`);
        
        // 音量を設定
        unifiedAudioSystem.setTrackVolume('volume-test-drum', volume);
        
        // 音量設定後の状態確認
        const afterVolume = unifiedAudioSystem.trackVolumes.get('volume-test-drum');
        console.log(`🔊 設定後のトラック音量: ${afterVolume}`);
        console.log(`🔊 マスターボリューム: ${unifiedAudioSystem.masterVolume}`);
        
        // 予想される最終音量を計算
        const baseVolume = 0.8; // ドラムのベース音量
        const expectedFinalVolume = baseVolume * volume * unifiedAudioSystem.masterVolume;
        console.log(`🔊 予想最終音量: ${expectedFinalVolume.toFixed(3)} (ベース: ${baseVolume} × トラック: ${volume} × マスター: ${unifiedAudioSystem.masterVolume})`);
        
        // 音を再生（特定のトラックIDを指定）
        console.log(`🥁 キック音再生開始 (トラック音量: ${volume})`);
        unifiedAudioSystem.playDrumSoundImmediate('a', 0.8, 'volume-test-drum');
        
      }, index * 2000); // 2秒ずつずらして違いを明確にする
    });
    
    // テスト完了後の状態確認
    setTimeout(() => {
      console.log('\n🔊 音量テスト完了後の状態:');
      unifiedAudioSystem.tracks.forEach((track, trackId) => {
        const volume = unifiedAudioSystem.trackVolumes.get(trackId) || 1.0;
        const muted = unifiedAudioSystem.trackMuted.get(trackId) || false;
        console.log(`  - ${trackId}: 音量=${volume.toFixed(3)}, ミュート=${muted}`);
      });
    }, volumes.length * 2000 + 1000);
  };

  // ドラムトラックのミュートテスト（詳細デバッグ付き）
  window.testDrumMute = () => {
    console.log('🥁 ドラムミュート機能テスト開始');
    
    if (!unifiedAudioSystem.tracks.has('mute-test-drum')) {
      unifiedAudioSystem.addTrack('mute-test-drum', 'Mute Test Drum', 'drums', '#ff6b6b');
      console.log('🥁 ミュートテスト用ドラムトラック追加完了');
    }
    
    // 現在の設定を確認
    console.log('🔇 テスト前の設定確認:');
    const initialMuted = unifiedAudioSystem.trackMuted.get('mute-test-drum') || false;
    const initialVolume = unifiedAudioSystem.trackVolumes.get('mute-test-drum') || 1.0;
    console.log(`  - 初期ミュート状態: ${initialMuted}`);
    console.log(`  - 初期トラック音量: ${initialVolume}`);
    console.log(`  - マスターボリューム: ${unifiedAudioSystem.masterVolume}`);
    
    // 1. 通常再生
    console.log('\n=== ステップ 1: 通常音量で再生 ===');
    console.log('🥁 通常音量で再生中...');
    unifiedAudioSystem.playDrumSoundImmediate('a', 0.8, 'mute-test-drum');
    
    setTimeout(() => {
      // 2. ミュート状態で再生
      console.log('\n=== ステップ 2: ミュート状態で再生 ===');
      console.log('🔇 トラックをミュートに設定...');
      unifiedAudioSystem.setTrackMuted('mute-test-drum', true);
      
      // ミュート状態確認
      const muteStatus = unifiedAudioSystem.trackMuted.get('mute-test-drum');
      console.log(`🔇 ミュート設定後の状態: ${muteStatus}`);
      console.log('🥁 ミュート状態で再生中（聞こえないはず）...');
      unifiedAudioSystem.playDrumSoundImmediate('a', 0.8, 'mute-test-drum');
      
      setTimeout(() => {
        // 3. ミュート解除
        console.log('\n=== ステップ 3: ミュート解除後に再生 ===');
        console.log('🔊 トラックのミュートを解除...');
        unifiedAudioSystem.setTrackMuted('mute-test-drum', false);
        
        // ミュート解除状態確認
        const unmuteStatus = unifiedAudioSystem.trackMuted.get('mute-test-drum');
        console.log(`🔊 ミュート解除後の状態: ${unmuteStatus}`);
        console.log('🥁 ミュート解除後に再生中...');
        unifiedAudioSystem.playDrumSoundImmediate('a', 0.8, 'mute-test-drum');
        
        // 最終状態確認
        setTimeout(() => {
          console.log('\n🔇 ミュートテスト完了後の状態:');
          unifiedAudioSystem.tracks.forEach((track, trackId) => {
            const volume = unifiedAudioSystem.trackVolumes.get(trackId) || 1.0;
            const muted = unifiedAudioSystem.trackMuted.get(trackId) || false;
            console.log(`  - ${trackId}: 音量=${volume.toFixed(3)}, ミュート=${muted}`);
          });
        }, 1000);
        
      }, 2000); // ミュート状態を2秒間保持
    }, 2000); // 通常再生から2秒後にミュート
  };

  // 音量問題の詳細診断
  window.diagnoseVolumeIssue = () => {
    console.log('🔧 音量問題の詳細診断開始');
    
    // テスト用トラックを作成
    const testTrackId = 'volume-diagnosis-track';
    if (!unifiedAudioSystem.tracks.has(testTrackId)) {
      unifiedAudioSystem.addTrack(testTrackId, 'Volume Diagnosis Track', 'drums', '#ff6b6b');
    }
    
    console.log('\n🔍 現在の音量設定詳細:');
    console.log(`  - マスターボリューム: ${unifiedAudioSystem.masterVolume}`);
    console.log(`  - マスターゲイン存在: ${!!unifiedAudioSystem.masterGain}`);
    if (unifiedAudioSystem.masterGain) {
      console.log(`  - マスターゲイン値: ${unifiedAudioSystem.masterGain.gain.value}`);
    }
    
    // 異なる音量でテスト
    const testVolumes = [0.1, 0.5, 1.0];
    console.log(`\n🔊 音量テスト: ${testVolumes.join(', ')}`);
    
    testVolumes.forEach((volume, index) => {
      setTimeout(() => {
        console.log(`\n--- 音量 ${volume} テスト ---`);
        
        // トラック音量を設定
        unifiedAudioSystem.setTrackVolume(testTrackId, volume);
        
        // 設定値を確認
        const actualVolume = unifiedAudioSystem.trackVolumes.get(testTrackId);
        console.log(`設定したトラック音量: ${volume} → 実際の値: ${actualVolume}`);
        
        // 音を再生して実際の音量計算をトレース
        console.log('音再生開始 - 音量計算をトレース:');
        unifiedAudioSystem.playDrumSoundImmediate('a', 0.8, testTrackId);
        
      }, index * 3000);
    });
    
    // 音量設定がWebAudio APIに正しく反映されているかチェック
    setTimeout(() => {
      console.log('\n🔧 WebAudio API 音量反映確認:');
      console.log('現在再生中の音声ノード:');
      unifiedAudioSystem.activeSounds.forEach((sound, soundId) => {
        console.log(`  - ${soundId}: ゲイン値 = ${sound.gainNode.gain.value}`);
      });
    }, testVolumes.length * 3000 + 1000);
  };

  // キーボードイベントでテスト（デバッグコンソールと同じ）
  window.setupUnifiedAudioTest = () => {
    document.addEventListener('keydown', (event) => {
      // 数字キーでピアノテスト
      if (event.key >= '0' && event.key <= '9') {
        const key = 60 + parseInt(event.key); // C4 (60) から開始
        console.log(`🎹 テスト: ピアノキー ${key} (${pianoKeyMapping[key]?.note || 'unknown'}) を再生`);
        unifiedAudioSystem.playPianoNote(key, 0.8); // velocityを0.8に変更
      }
      
      // スペースキーでC4を再生
      if (event.key === ' ') {
        console.log(`🎹 テスト: ピアノキー 60 (C4) を再生`);
        unifiedAudioSystem.playPianoNote(60, 0.8); // velocityを0.8に変更
      }
      
      // アルファベットキーでドラムテスト
      if (event.key >= 'a' && event.key <= 'z') {
        const drumInfo = drumMapping[event.key];
        const drumName = drumInfo ? drumInfo.name : 'unknown';
        console.log(`🥁 テスト: ドラムキー '${event.key}' (${drumName}) を再生`);
        unifiedAudioSystem.playDrumSound(event.key, 0.8); // velocityを0.8に変更
      }
    });
    
    console.log('🎵 統一音声システムテスト機能が有効になりました:');
    console.log('- 数字キー (0-9): C4-C5 のピアノ音を再生');
    console.log('- アルファベットキー (a-z): ドラム音を再生');
    console.log('- スペースキー: C4 を再生');
    console.log('');
    console.log('🥁 ドラムトラック専用テスト関数:');
    console.log('- testDrumTrack(): ドラムパターン再生テスト');
    console.log('- testDrumKit(): 全ドラム音テスト');
    console.log('- testDrumVolume(): 音量レベルテスト（詳細デバッグ付き）');
    console.log('- testDrumMute(): ミュート機能テスト（詳細デバッグ付き）');
    console.log('- diagnoseVolumeIssue(): 音量問題の詳細診断');
    console.log('');
    console.log('🎹 基本テスト関数:');
    console.log('- pianotest(key): 指定したキーのピアノ音を再生');
    console.log('- drumtest(key): 指定したキーのドラム音を再生');
    console.log('- showUnifiedAudioDebug(): デバッグ情報を表示');
  };
}

export default unifiedAudioSystem; 