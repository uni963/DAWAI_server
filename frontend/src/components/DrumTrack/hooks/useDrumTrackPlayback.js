import { useCallback, useRef, useEffect } from 'react';
import { PLAYBACK_INTERVAL } from '../constants.js';
import * as Tone from 'tone';

const useDrumTrackPlayback = ({ state, audio, trackId, onDrumDataUpdate }) => {
  // 再生関連のRefs
  const isPlayingRef = useRef(false);
  const playbackTimerRef = useRef(null);
  const metronomeTimerRef = useRef(null);
  const scheduledNotesRef = useRef(new Map());
  const activeAudioNodesRef = useRef(new Map());
  const playbackStartTimeRef = useRef(0);
  const lastStepRef = useRef(-1);
  const timelineClickPositionRef = useRef(null);
  const lastClickPositionRef = useRef(null); // 最後のクリック位置を追加
  const isInitializingRef = useRef(false); // 初期化中フラグを追加
  const synthPoolRef = useRef(new Map()); // シンセサイザープール
  
  // MIDIノート番号を周波数に変換する関数
  const midiToFrequency = useCallback((midiNote) => {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }, []);

  // シンセサイザーを取得またはキャッシュから再利用
  const getSynth = useCallback((instrumentType, frequency) => {
    const key = `${instrumentType}`;
    
    if (!synthPoolRef.current.has(key)) {
      let synth;
      switch (instrumentType) {
        case 'kick':
          synth = new Tone.MembraneSynth({
            volume: -12,
            pitchDecay: 0.05,
            octaves: 10
          }).toDestination();
          break;
        case 'snare':
          synth = new Tone.NoiseSynth({
            volume: -15,
            noise: { type: 'white' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
          }).toDestination();
          break;
        case 'metal':
          synth = new Tone.MetalSynth({
            volume: -18,
            envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5
          }).toDestination();
          break;
        default:
          synth = new Tone.MembraneSynth({
            volume: -12,
            pitchDecay: 0.05,
            octaves: 10
          }).toDestination();
      }
      synthPoolRef.current.set(key, synth);
    }
    
    return synthPoolRef.current.get(key);
  }, []);

  // AudioContextを確実に開始する関数
  const ensureAudioContextRunning = useCallback(async () => {
    if (!Tone) {
      console.error('🥁 Tone.js not available');
      return false;
    }
    
    if (Tone.context.state !== 'running') {
      console.log('🥁 AudioContext not running, attempting to start...');
      try {
        await Tone.start();
        console.log('✅ AudioContext started successfully:', Tone.context.state);
        return true;
      } catch (err) {
        console.error('❌ Failed to start AudioContext:', err);
        return false;
      }
    }
    
    return true;
  }, []);

  // フォールバック用のドラム音再生関数（改良版）
  const playDirectToneJs = useCallback(async (instrument, velocity) => {
    try {
      // AudioContextを確実に開始
      const audioReady = await ensureAudioContextRunning();
      if (!audioReady) {
        console.warn('🥁 AudioContext not available, skipping playback');
        return;
      }

      console.log('🥁 [DrumTrackPlayback] Playing direct Tone.js drum:', {
        name: instrument.name,
        pitch: instrument.pitch,
        velocity: velocity,
        audioContextState: Tone.context.state
      });
      
      // MIDIピッチを周波数に変換
      const frequency = midiToFrequency(instrument.pitch);
      const noteVelocity = Math.max(0.1, Math.min(1.0, velocity)); // 0.1-1.0の範囲
      
      // 楽器タイプを決定
      let instrumentType;
      if (instrument.name.toLowerCase().includes('kick') || instrument.name.toLowerCase().includes('bass')) {
        instrumentType = 'kick';
      } else if (instrument.name.toLowerCase().includes('snare')) {
        instrumentType = 'snare';
      } else if (instrument.name.toLowerCase().includes('hat') || instrument.name.toLowerCase().includes('cymbal')) {
        instrumentType = 'metal';
      } else {
        instrumentType = 'default';
      }
      
      // キャッシュされたシンセサイザーを取得
      const synth = getSynth(instrumentType, frequency);
      
      // シンセサイザーの状態チェック
      if (!synth || synth.disposed) {
        console.warn('🥁 Synth is disposed, creating new one...');
        // プールから削除して新しいシンセサイザーを作成
        synthPoolRef.current.delete(instrumentType);
        const newSynth = getSynth(instrumentType, frequency);
        if (!newSynth) {
          console.error('🥁 Failed to create new synth');
          return;
        }
      }
      
      // 楽器タイプに応じて再生
      if (instrumentType === 'snare') {
        synth.triggerAttackRelease('8n', Tone.now(), noteVelocity);
      } else if (instrumentType === 'metal') {
        synth.triggerAttackRelease('8n', Tone.now(), noteVelocity);
      } else {
        // kick, default
        synth.triggerAttackRelease(frequency, '8n', Tone.now(), noteVelocity);
      }
      
      console.log('✅ Direct Tone.js drum played with frequency:', frequency, 'Hz, type:', instrumentType);
    } catch (error) {
      console.error('❌ Direct Tone.js playback failed:', error);
      // エラー時はプールをクリアして再作成可能にする
      synthPoolRef.current.clear();
    }
  }, [midiToFrequency, getSynth, ensureAudioContextRunning]);
  
  // リアルタイム更新用のRefs
  const lastGridRef = useRef(null);
  const lastInstrumentsRef = useRef(null);
  const lastTempoRef = useRef(null);
  const lastSyncGroupRef = useRef(null);
  const gridChangeDetectedRef = useRef(false);
  const isFirstInitializationRef = useRef(true); // 初回初期化フラグ
  const initializationCompletedRef = useRef(false); // 初期化完了フラグ（永続的）
  
  // メトロノームの停止
  const stopMetronome = useCallback(() => {
    if (metronomeTimerRef.current) {
      clearInterval(metronomeTimerRef.current);
      metronomeTimerRef.current = null;
    }
  }, []);
  
  // メトロノームの開始（修正版：メモリリークを防ぐ）
  const startMetronome = useCallback(() => {
    // 既存のタイマーをクリア
    if (metronomeTimerRef.current) {
      clearInterval(metronomeTimerRef.current);
      metronomeTimerRef.current = null;
    }
    
    const beatDuration = 60 / state.tempo; // 1拍の長さ
    
    metronomeTimerRef.current = setInterval(() => {
      if (!isPlayingRef.current || !state.metronomeEnabled) {
        // 再生が停止された場合やメトロノームが無効の場合はタイマーをクリア
        if (metronomeTimerRef.current) {
          clearInterval(metronomeTimerRef.current);
          metronomeTimerRef.current = null;
        }
        return;
      }
      
      const currentTime = audio.getCurrentTime();
      const elapsedTime = currentTime - playbackStartTimeRef.current;
      const currentBeat = Math.floor(elapsedTime / beatDuration);
      
      // 小節の最初の拍はアクセント
      const isAccent = currentBeat % 4 === 0;
      
      if (state.audioEnabled) {
        // メトロノーム音を再生
        if (state.metronomeEnabled) {
          const frequency = isAccent ? 800 : 600;
          const basePitch = 60 + (isAccent ? 12 : 0); // アクセントの場合は1オクターブ上
          
          // 統一された音声システムでメトロノーム音を再生
          if (window.unifiedAudioSystem) {
            window.unifiedAudioSystem.playPianoNote(basePitch, 0.3);
          }
        }
      }
    }, beatDuration * 1000);
  }, [audio, state.audioEnabled, state.tempo, state.metronomeEnabled]);
  
  // ノート変更の即座反映（重複再生を防ぐ）
  const handleNoteChange = useCallback((rowIndex, stepIndex, isActive) => {
    // 再生中の場合は即座に反映
    if (isPlayingRef.current) {
      // 現在のステップが変更されたステップの場合、即座に音を再生/停止
      const currentTime = audio.getCurrentTime();
      const elapsedTime = currentTime - playbackStartTimeRef.current;
      const stepDuration = 60 / state.tempo / 4;
      const currentStep = Math.floor(elapsedTime / stepDuration) % (state.grid[0]?.length || 16);
      
      if (currentStep === stepIndex) {
        if (isActive) {
          // ノートが追加された場合、即座に音を再生
          const instrument = state.instruments[rowIndex];
          if (instrument && state.audioEnabled) {
            // 統一された音声システムでドラム音を再生（トラック指定）
            if (window.unifiedAudioSystem) {
              window.unifiedAudioSystem.playDrumSoundWithTrackSettings(instrument.pitch.toString(), instrument.velocity, trackId);
            }
            
            // 再生中のノートとして記録
            const currentPlaybackNotes = new Set(state.playbackNotes || []);
            currentPlaybackNotes.add(`${rowIndex}-${stepIndex}`);
            state.setPlaybackNotes(currentPlaybackNotes);
          }
        } else {
          // ノートが削除された場合、再生中のノートから削除
          const currentPlaybackNotes = new Set(state.playbackNotes || []);
          currentPlaybackNotes.delete(`${rowIndex}-${stepIndex}`);
          state.setPlaybackNotes(currentPlaybackNotes);
        }
      }
      
      // 即座に再描画
      state.setNeedsRedraw(true);
    }
    
    // 同期グループの他のトラックに通知
    if (onDrumDataUpdate) {
      onDrumDataUpdate({
        type: 'noteChange',
        trackId,
        rowIndex,
        stepIndex,
        isActive,
        syncGroup: state.syncGroup
      });
    }
  }, [audio, state.tempo, state.grid, state.instruments, state.audioEnabled, state.playbackNotes, state.setPlaybackNotes, state.setNeedsRedraw, onDrumDataUpdate, trackId, state.syncGroup]);
  
  // グリッド変更の検出（改善版：ノート変更の詳細検出）
  const detectGridChanges = useCallback(() => {
    const currentGrid = JSON.stringify(state.grid);
    const currentInstruments = JSON.stringify(state.instruments);
    const currentTempo = state.tempo;
    const currentSyncGroup = state.syncGroup;
    
    const hasGridChanged = lastGridRef.current !== currentGrid;
    const hasInstrumentsChanged = lastInstrumentsRef.current !== currentInstruments;
    const hasTempoChanged = lastTempoRef.current !== currentTempo;
    const hasSyncGroupChanged = lastSyncGroupRef.current !== currentSyncGroup;
    

    
    // 初回初期化時またはlastGridRefがnullの場合は変更検出をスキップ
    if (lastGridRef.current === null) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🥁 First initialization, skipping change detection');
      }
      
      // 初回の値を記録
      lastGridRef.current = currentGrid;
      lastInstrumentsRef.current = currentInstruments;
      lastTempoRef.current = currentTempo;
      lastSyncGroupRef.current = currentSyncGroup;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🥁 First initialization completed, enabling change detection');
      }
      
      return false;
    }
    
          if (hasGridChanged || hasInstrumentsChanged || hasTempoChanged || hasSyncGroupChanged) {
        // エラー時のみログを出力
      
      // グリッド変更の詳細を検出（ノートの追加・削除）
      if (hasGridChanged && lastGridRef.current && !isFirstInitializationRef.current) {
        try {
          const previousGrid = JSON.parse(lastGridRef.current);
          const currentGridData = state.grid;
          
          // 変更されたノートを特定（初期化時の大量ログを防ぐ）
          let changeCount = 0;
          const maxChangesToLog = 10; // 最大10件までログ出力
          
          currentGridData.forEach((row, rowIndex) => {
            if (previousGrid[rowIndex]) {
              row.forEach((isActive, stepIndex) => {
                const wasActive = previousGrid[rowIndex][stepIndex];
                if (isActive !== wasActive) {
                  changeCount++;
                  
                  // 変更数が少ない場合のみ詳細ログを出力
                  if (changeCount <= maxChangesToLog) {
                    handleNoteChange(rowIndex, stepIndex, isActive);
                  }
                }
              });
            }
          });
          
          // 大量の変更があった場合はサマリーログを出力（エラー時のみ）
        } catch (error) {
          console.warn('🥁 Error parsing previous grid:', error);
        }
      }
      
      // 変更を記録
      lastGridRef.current = currentGrid;
      lastInstrumentsRef.current = currentInstruments;
      lastTempoRef.current = currentTempo;
      lastSyncGroupRef.current = currentSyncGroup;
      
      gridChangeDetectedRef.current = true;
      
      // 再生中の場合、メトロノームを再起動（テンポ変更時）
      if (isPlayingRef.current && hasTempoChanged) {
        if (state.metronomeEnabled) {
          // 直接メトロノームを再起動
          if (metronomeTimerRef.current) {
            clearInterval(metronomeTimerRef.current);
            metronomeTimerRef.current = null;
          }
          
          const beatDuration = 60 / state.tempo;
          metronomeTimerRef.current = setInterval(() => {
            if (!isPlayingRef.current || !state.metronomeEnabled) {
              if (metronomeTimerRef.current) {
                clearInterval(metronomeTimerRef.current);
                metronomeTimerRef.current = null;
              }
              return;
            }
            
            const currentTime = audio.getCurrentTime();
            const elapsedTime = currentTime - playbackStartTimeRef.current;
            const currentBeat = Math.floor(elapsedTime / beatDuration);
            const isAccent = currentBeat % 4 === 0;
            
            if (state.audioEnabled) {
              // 統一された音声システムでメトロノーム音を再生
              const frequency = isAccent ? 800 : 600;
              const basePitch = 60 + (isAccent ? 12 : 0);
              if (window.unifiedAudioSystem) {
                window.unifiedAudioSystem.playPianoNote(basePitch, 0.3);
              }
            }
          }, beatDuration * 1000);
        }
      }
      
      // 再生中のノートをクリア（楽器変更時のみ）
      if (isPlayingRef.current && hasInstrumentsChanged) {
        state.setPlaybackNotes(new Set());
      }
      
      return true;
    }
    
    return false;
  }, [state.grid, state.instruments, state.tempo, state.syncGroup, state.metronomeEnabled, state.setPlaybackNotes, handleNoteChange, audio, state.audioEnabled]);
  
  // ドラム同期の処理
  const handleSyncGroupChange = useCallback((newSyncGroup) => {
    // 同期グループの変更を通知
    if (onDrumDataUpdate) {
      onDrumDataUpdate({
        type: 'syncGroupChange',
        trackId,
        syncGroup: newSyncGroup,
        grid: state.grid,
        instruments: state.instruments,
        tempo: state.tempo
      });
    }
    
    // 再生中の場合は即座に反映
    if (isPlayingRef.current) {
      state.setNeedsRedraw(true);
    }
  }, [onDrumDataUpdate, trackId, state.grid, state.instruments, state.tempo, state.setNeedsRedraw]);
  
  // リアルタイム更新の監視
  useEffect(() => {
    const hasChanges = detectGridChanges();
    
    // 同期グループの変更を特別に処理
    if (hasChanges && state.syncGroup !== lastSyncGroupRef.current) {
      handleSyncGroupChange(state.syncGroup);
    }
  }, [state.grid, state.instruments, state.tempo, state.syncGroup, detectGridChanges, handleSyncGroupChange]);
  
  // 再生ループ（改善版：リアルタイム更新対応）
  const startPlaybackLoop = useCallback(() => {
    console.log('🥁 [DrumTrackPlayback] startPlaybackLoop called');
    console.log('🥁 [DrumTrackPlayback] isPlayingRef.current:', isPlayingRef.current);
    
    // 既存のタイマーをクリア
    if (playbackTimerRef.current) {
      console.log('🥁 [DrumTrackPlayback] Clearing existing timer');
      clearInterval(playbackTimerRef.current);
    }
    
    // 再生ループを開始（間隔を短縮してより正確なタイミングに）
    console.log('🥁 [DrumTrackPlayback] Starting setInterval timer');
    playbackTimerRef.current = setInterval(async () => {
      // ループ開始の確認（最初の数回のみログ出力）
      if (Date.now() % 1000 < 50) { // 約1秒に1回ログ出力
        console.log('🥁 [DrumTrackPlayback] Playback loop running, isPlaying:', isPlayingRef.current);
      }
      
      if (!isPlayingRef.current) {
        console.log('🥁 [DrumTrackPlayback] Playback stopped, clearing timer');
        clearInterval(playbackTimerRef.current);
        return;
      }
      
      try {
        // シンプルな時間管理（現在時刻ベース）
        const now = Date.now();
        if (!playbackStartTimeRef.current) {
          playbackStartTimeRef.current = now;
        }
        
        const elapsedMs = now - playbackStartTimeRef.current;
        const elapsedSeconds = elapsedMs / 1000;
        const newTime = elapsedSeconds;
        
        console.log('🥁 [DrumTrackPlayback] Simple time calculation:', {
          now,
          startTime: playbackStartTimeRef.current,
          elapsedMs,
          elapsedSeconds,
          newTime
        });
        
        // 再生位置を更新
        if (Date.now() % 500 < 50) { // 約0.5秒に1回ログ出力
          console.log('🥁 [DrumTrackPlayback] Updating currentTime:', newTime);
        }
        state.setCurrentTime(newTime);
        
        // グリッドの列数を取得
        const gridColumns = state.grid[0]?.length || 16;
        const stepDuration = 60 / state.tempo / 4; // 16分音符の長さ
        const patternDuration = stepDuration * gridColumns;
        
        // ループ処理
        if (newTime >= patternDuration) {
          console.log('🥁 [DrumTrackPlayback] Pattern completed, looping');
          // ループの場合は最初から再生
          playbackStartTimeRef.current = now;
          lastStepRef.current = -1;
          state.setCurrentTime(0);
        }
        
        // 現在のステップを計算
        const currentStep = Math.floor(newTime / stepDuration) % gridColumns;
        
        // 新しいステップに到達した場合のみ音を再生
        if (currentStep !== lastStepRef.current) {
          lastStepRef.current = currentStep;
          
          console.log('🥁 [DrumTrackPlayback] Playing step:', {
            step: currentStep,
            time: newTime,
            elapsedSeconds: elapsedSeconds
          });
          
          // 各楽器の音を再生
          if (state.grid && state.instruments) {
            for (let rowIndex = 0; rowIndex < state.grid.length; rowIndex++) {
              const row = state.grid[rowIndex];
              if (Array.isArray(row)) {
                const cell = row[currentStep];
                const isActive = typeof cell === 'boolean' ? cell : (cell && cell.active);
                
                if (isActive && state.audioEnabled) {
                  const instrument = state.instruments[rowIndex];
                  if (instrument) {
                    try {
                      const velocity = (typeof cell === 'object' && cell.velocity) || instrument.velocity || 0.8;
                      
                      console.log('🥁 [DrumTrackPlayback] Playing drum note:', {
                        pitch: instrument.pitch,
                        step: currentStep,
                        rowIndex: rowIndex,
                        instrumentName: instrument.name,
                        velocity: velocity,
                        audioEnabled: state.audioEnabled
                      });
                      
                      // 統一音声システムを使用（クリック時と同じロジック）
                      console.log('🥁 [DrumTrackPlayback] Using unified audio system for consistent playback');
                      if (window.unifiedAudioSystem) {
                        await window.unifiedAudioSystem.playDrumSoundWithTrackSettings(instrument.pitch.toString(), velocity, trackId);
                      } else {
                        // フォールバック: 直接Tone.jsを使用
                        await playDirectToneJs(instrument, velocity);
                      }
                    } catch (error) {
                      console.error('🥁 [DrumTrackPlayback] Error playing drum note:', error);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('🥁 [DrumTrackPlayback] Error in playback loop:', error);
      }
    }, 8); // 8ms間隔（約120fps）に短縮してより正確なタイミングに
  }, [audio, state.setCurrentTime, state.grid, state.tempo, state.instruments, isPlayingRef, playbackStartTimeRef, lastStepRef]);
  
  // 再生開始（改善版：状態リセット付き）
  const startPlayback = useCallback(async () => {
    console.log('🥁 [DrumTrackPlayback] startPlayback called');
    console.log('🥁 [DrumTrackPlayback] Current state:', {
      isPlaying: isPlayingRef.current,
      isInitializing: isInitializingRef.current,
      hasGrid: !!state.grid,
      gridLength: state.grid?.length,
      hasInstruments: !!state.instruments,
      instrumentsLength: state.instruments?.length,
      metronomeEnabled: state.metronomeEnabled
    });
    
    // 既に再生中の場合は一度停止してから再開
    if (isPlayingRef.current) {
      console.log('🥁 [DrumTrackPlayback] Already playing, stopping first...');
      
      // インライン停止処理（循環参照を避けるため）
      isPlayingRef.current = false;
      state.setIsPlaying(false);
      
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      
      if (metronomeTimerRef.current) {
        clearInterval(metronomeTimerRef.current);
        metronomeTimerRef.current = null;
      }
      
      activeAudioNodesRef.current.clear();
      scheduledNotesRef.current.clear();
      lastStepRef.current = -1;
      timelineClickPositionRef.current = null;
      isInitializingRef.current = false;
      
      // 少し待ってから再開
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 初期化中の場合はスキップ（タイムアウト付き）
    if (isInitializingRef.current) {
      console.log('🥁 [DrumTrackPlayback] Initialization in progress, waiting...');
      // 最大5秒待機
      let waitCount = 0;
      while (isInitializingRef.current && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      
      if (isInitializingRef.current) {
        console.warn('🥁 [DrumTrackPlayback] Initialization timeout, forcing reset');
        isInitializingRef.current = false;
      }
    }
    
    // 初期化フラグを設定
    console.log('🥁 [DrumTrackPlayback] Setting initialization flag');
    isInitializingRef.current = true;
    
    // 既存のすべてのタイマーとリソースをクリア
    console.log('🥁 [DrumTrackPlayback] Clearing existing timers and resources');
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (metronomeTimerRef.current) {
      clearInterval(metronomeTimerRef.current);
      metronomeTimerRef.current = null;
    }
    activeAudioNodesRef.current.clear();
    scheduledNotesRef.current.clear();
    
    try {
      console.log('🥁 [DrumTrackPlayback] Skipping modernAudioEngine initialization - using direct Tone.js');
      // ModernAudioEngineは使用せず、直接Tone.jsで安定した音再生を行う
      
      // AudioContextを確実に開始
      console.log('🥁 [DrumTrackPlayback] Ensuring AudioContext is running...');
      const audioReady = await ensureAudioContextRunning();
      if (!audioReady) {
        console.error('🥁 [DrumTrackPlayback] Failed to start AudioContext');
        // ユーザーに通知
        alert('音声を再生するには、ページをクリックしてください。ブラウザの自動再生ポリシーにより、ユーザーの操作が必要です。');
        return;
      }
      
      // グリッドデータの検証
      console.log('🥁 [DrumTrackPlayback] Validating grid data...');
      if (!state.grid || !Array.isArray(state.grid) || state.grid.length === 0) {
        console.warn('🥁 [DrumTrackPlayback] No valid grid to play:', state.grid);
        return;
      }
      console.log('🥁 [DrumTrackPlayback] Grid data validated:', {
        gridLength: state.grid.length,
        gridWidth: state.grid[0]?.length
      });
      
      // 楽器データの検証
      console.log('🥁 [DrumTrackPlayback] Validating instrument data...');
      if (!state.instruments || !Array.isArray(state.instruments) || state.instruments.length === 0) {
        console.warn('🥁 [DrumTrackPlayback] No valid instruments to play:', state.instruments);
        return;
      }
      console.log('🥁 [DrumTrackPlayback] Instrument data validated:', {
        instrumentsCount: state.instruments.length,
        instruments: state.instruments.map(i => ({ name: i.name, pitch: i.pitch }))
      });
      
      // 再生状態を先に設定
      console.log('🥁 [DrumTrackPlayback] Setting playback state...');
      isPlayingRef.current = true;
      state.setIsPlaying(true);
      
      // lastClickPositionを最優先、次にタイムラインクリック、最後に現在位置
      const startTime = lastClickPositionRef.current !== null 
        ? lastClickPositionRef.current 
        : (timelineClickPositionRef.current !== null ? timelineClickPositionRef.current : state.currentTime);
      console.log('🥁 [DrumTrackPlayback] Setting start time:', {
        startTime,
        timelineClickPosition: timelineClickPositionRef.current,
        lastClickPosition: lastClickPositionRef.current,
        currentTime: state.currentTime
      });
      state.setCurrentTime(startTime);
      
      // 開始時刻を調整して設定（startTimeを考慮）
      const now = Date.now();
      const playbackStartTime = now - (startTime * 1000); // startTimeを引いて調整
      console.log('🥁 [DrumTrackPlayback] Setting adjusted playback start time:', {
        now,
        startTime,
        playbackStartTime,
        adjustedBy: startTime * 1000
      });
      
      state.setPlaybackStartTime(playbackStartTime);
      playbackStartTimeRef.current = playbackStartTime;
      
      // 再生ヘッドを即座に表示するため、強制的に再描画
      state.setNeedsRedraw(true);
      
      // スケジュールされたノートをクリア
      scheduledNotesRef.current.clear();
      state.setPlaybackNotes(new Set());
      
      // ステップカウンターをリセット
      lastStepRef.current = -1;
      
      // タイムラインクリック位置をクリア（一時的なクリックは消費）
      // lastClickPositionは保持して次回のスペースキーで使用
      timelineClickPositionRef.current = null;
      
      // メトロノームの開始
      if (state.metronomeEnabled) {
        console.log('🥁 [DrumTrackPlayback] Starting metronome...');
        startMetronome();
      } else {
        console.log('🥁 [DrumTrackPlayback] Metronome disabled, skipping');
      }
      
      // 再生ループの開始
      console.log('🥁 [DrumTrackPlayback] About to call startPlaybackLoop...');
      console.log('🥁 [DrumTrackPlayback] Current state before startPlaybackLoop:', {
        isPlaying: isPlayingRef.current,
        hasTimer: !!playbackTimerRef.current,
        gridLength: state.grid?.length || 0,
        instrumentsLength: state.instruments?.length || 0
      });
      
      startPlaybackLoop();
      
      console.log('🥁 [DrumTrackPlayback] startPlaybackLoop completed');
      console.log('🥁 [DrumTrackPlayback] Timer created:', !!playbackTimerRef.current);
      console.log('🥁 [DrumTrackPlayback] Playback started successfully');
      
    } catch (error) {
      console.error('🥁 [DrumTrackPlayback] Error during playback start:', error);
      console.log('🥁 [DrumTrackPlayback] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } finally {
      // 初期化フラグをクリア
      console.log('🥁 [DrumTrackPlayback] Clearing initialization flag');
      isInitializingRef.current = false;
    }
  }, [audio, state.setIsPlaying, state.setCurrentTime, state.setPlaybackStartTime, state.setNeedsRedraw, state.setPlaybackNotes, startMetronome, startPlaybackLoop]);
  
  // 再生停止
  const stopPlayback = useCallback(() => {
    console.log('🥁 [DrumTrackPlayback] stopPlayback called');
    
    // 再生状態を停止（位置は保存しない - lastClickPositionは維持）
    isPlayingRef.current = false;
    state.setIsPlaying(false);
    
    // タイマーを確実にクリア
    console.log('🥁 [DrumTrackPlayback] Clearing timers...');
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    
    if (metronomeTimerRef.current) {
      clearInterval(metronomeTimerRef.current);
      metronomeTimerRef.current = null;
    }
    
    // アクティブなオーディオノードをクリーンアップ（簡素化）
    console.log('🥁 [DrumTrackPlayback] Clearing audio nodes...');
    activeAudioNodesRef.current.clear();
    
    // スケジュールされたノートをクリア
    scheduledNotesRef.current.clear();
    state.setPlaybackNotes(new Set());
    
    // ステップカウンターをリセット
    lastStepRef.current = -1;
    
    // タイムラインクリック位置をクリア（lastClickPositionは保持）
    timelineClickPositionRef.current = null;
    
    // 初期化フラグもリセット
    isInitializingRef.current = false;
    
    // 強制的に再描画
    state.setNeedsRedraw(true);
    
    console.log('🥁 [DrumTrackPlayback] Playback stopped successfully');
  }, [state.setIsPlaying, state.setPlaybackNotes, state.setNeedsRedraw]);
  
  // 再生一時停止
  const pausePlayback = useCallback(() => {
    console.log('🥁 [DrumTrackPlayback] pausePlayback called');
    
    // 再生状態を一時停止（位置は保存しない - lastClickPositionは維持）
    isPlayingRef.current = false;
    state.setIsPlaying(false);
    
    // タイマーを確実にクリア
    console.log('🥁 [DrumTrackPlayback] Clearing timers for pause...');
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    
    if (metronomeTimerRef.current) {
      clearInterval(metronomeTimerRef.current);
      metronomeTimerRef.current = null;
    }
    
    // アクティブなオーディオノードをクリーンアップ（簡素化）
    activeAudioNodesRef.current.clear();
    
    // スケジュールされたノートをクリア
    scheduledNotesRef.current.clear();
    state.setPlaybackNotes(new Set());
    
    // 強制的に再描画
    state.setNeedsRedraw(true);
    
    console.log('🥁 [DrumTrackPlayback] Playback paused successfully');
  }, [state.setIsPlaying, state.setPlaybackNotes, state.setNeedsRedraw]);

  // タイムラインクリック位置を設定
  const setTimelineClickPosition = useCallback((position) => {
    timelineClickPositionRef.current = position;
  }, []);

  // 最後のクリック位置を設定
  const setLastClickPosition = useCallback((position) => {
    lastClickPositionRef.current = position;
    console.log('🥁 [DrumTrackPlayback] Set last click position to:', position);
  }, []);

  // 再生位置を設定
  const setCurrentTime = useCallback((newTime) => {
    state.setCurrentTime(newTime);
    
    // オーディオエンジンの再生位置も更新
    if (audio && audio.setCurrentTime) {
      audio.setCurrentTime(newTime);
    }
    
    // 強制的に再描画
    state.setNeedsRedraw(true);
  }, [state.setCurrentTime, state.setNeedsRedraw, audio]);
  
  // メトロノーム状態の変更を監視（依存配列を修正して無限ループを防ぐ）
  useEffect(() => {
    if (state.metronomeEnabled && isPlayingRef.current) {
      startMetronome();
    } else {
      stopMetronome();
    }
  }, [state.metronomeEnabled, isPlayingRef.current, startMetronome, stopMetronome]);
  
  // クリーンアップ（修正版：より確実なクリーンアップ）
  useEffect(() => {
    return () => {
      // コンポーネントのアンマウント時にすべてのタイマーをクリア
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      if (metronomeTimerRef.current) {
        clearInterval(metronomeTimerRef.current);
        metronomeTimerRef.current = null;
      }
      
      // アクティブなオーディオノードもクリーンアップ
      activeAudioNodesRef.current.clear();
      
      // シンセサイザープールもクリーンアップ
      if (synthPoolRef.current) {
        synthPoolRef.current.forEach(synth => {
          try {
            synth.dispose();
          } catch (error) {
            console.warn('Error disposing synth:', error);
          }
        });
        synthPoolRef.current.clear();
      }
      
      // 初期化フラグをリセット（次のマウント時に再初期化を許可）
      isFirstInitializationRef.current = true;
      initializationCompletedRef.current = false;
      lastGridRef.current = null;
      lastInstrumentsRef.current = null;
      lastTempoRef.current = null;
      lastSyncGroupRef.current = null;
    };
  }, []);
  
  return {
    startPlayback,
    stopPlayback,
    pausePlayback,
    setTimelineClickPosition,
    setLastClickPosition,
    setCurrentTime,
    handleNoteChange,
    handleSyncGroupChange,
    detectGridChanges,
    isPlaying: isPlayingRef.current,
    lastClickPosition: lastClickPositionRef.current
  };
};

export default useDrumTrackPlayback; 