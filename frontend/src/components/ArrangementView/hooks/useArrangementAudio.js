import { useRef, useCallback, useEffect } from 'react'
import drumTrackManager from '../../../utils/drumTrackManager.js'

export const useArrangementAudio = (tracks, trackStates, currentTime, metronomeEnabled, bpm, totalDuration, lastClickPosition, pixelsPerSecond, trackVolume = {}, trackMuted = {}, masterVolume = 100) => {
  // 再生関連のRefs
  const isPlayingRef = useRef(false)
  const scheduledNotesRef = useRef(new Map())
  const playbackStartTimeRef = useRef(0)
  const playbackTimerRef = useRef(null)
  const isInitializedRef = useRef(false)
  
  // ドラムトラック専用の再生管理
  const drumTrackPlaybackRefs = useRef(new Map())
  
  // トラックプリロード状態管理
  const preloadedTracksRef = useRef(new Set())
  const isPreloadingRef = useRef(false)
  const preloadCacheRef = useRef(new Map())

  // ドラム音再生関数（統一された音声システム・トラック指定版を使用）
  const playDrumSound = useCallback(async (pitch, velocity = 0.8, trackId = 'drum-track') => {
    try {
      if (!window.unifiedAudioSystem) {
        console.warn('🥁 [ArrangementAudio] Unified Audio System not available');
        return null;
      }
      
      console.log('🥁 [ArrangementAudio] Playing drum sound via Unified Audio System:', {
        pitch,
        velocity,
        trackId
      });
      
      // 統一された音声システムでドラム音を再生（トラック指定版）
      await window.unifiedAudioSystem.playDrumSoundWithTrackSettings(pitch.toString(), velocity, trackId);
      
      return { 
        pitch,
        velocity,
        duration: 0.3,
        engine: 'unified'
      };
    } catch (e) {
      console.error('❌ [ArrangementAudio] Drum play error:', e);
      return null;
    }
  }, []);

  // トラックプリロード関数
  const preloadAllTracks = useCallback(async (trackList = []) => {
    if (isPreloadingRef.current) {
      console.log('🎵 [ArrangementAudio] Preloading already in progress, skipping');
      return;
    }
    
    isPreloadingRef.current = true;
    console.log('🎵 [ArrangementAudio] Starting track preload for', trackList.length, 'tracks');
    
    try {
      // 統一音声システムの初期化確認
      if (!window.unifiedAudioSystem || !isInitializedRef.current) {
        console.log('🎵 [ArrangementAudio] Waiting for unified audio system initialization...');
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!window.unifiedAudioSystem || !isInitializedRef.current) {
          console.warn('🎵 [ArrangementAudio] Unified audio system not ready for preload');
          return;
        }
      }

      for (const track of trackList) {
        if (preloadedTracksRef.current.has(track.id)) {
          console.log('🎵 [ArrangementAudio] Track already preloaded:', track.id);
          continue;
        }

        try {
          console.log('🎵 [ArrangementAudio] Preloading track:', track.id, track.name);

          // トラックを統一音声システムに追加
          if (!window.unifiedAudioSystem.tracks.has(track.id)) {
            window.unifiedAudioSystem.addTrack(
              track.id,
              track.name,
              track.type || (track.subtype === 'drums' ? 'drums' : 'piano'),
              track.color,
              track
            );
          }

          // ドラムトラックの場合は最新データを強制更新
          if (track.subtype === 'drums') {
            console.log('🥁 [ArrangementAudio] Preloading drum track data for:', track.id);
            drumTrackManager.updateCombinedData(track.id, 32);
            const playbackData = drumTrackManager.getPlaybackData(track.id, 32);
            
            if (playbackData) {
              console.log('🥁 [ArrangementAudio] Drum track preloaded:', {
                trackId: track.id,
                gridSize: `${playbackData.grid?.length || 0}x${playbackData.grid?.[0]?.length || 0}`,
                instrumentsCount: playbackData.instruments?.length || 0,
                cellCount: playbackData.grid?.flat().filter(cell => cell).length || 0
              });
            }
          }

          // トラック設定を適用
          const trackVolumeValue = trackVolume[track.id] || track.volume || 75;
          const normalizedVolume = trackVolumeValue / 100;
          window.unifiedAudioSystem.setTrackVolume(track.id, normalizedVolume);
          window.unifiedAudioSystem.setTrackMuted(track.id, trackMuted[track.id] || track.muted || false);
          window.unifiedAudioSystem.setTrackSolo(track.id, track.solo || false);

          preloadedTracksRef.current.add(track.id);
          console.log('✅ [ArrangementAudio] Track preloaded successfully:', track.id);

        } catch (error) {
          console.error('❌ [ArrangementAudio] Failed to preload track:', track.id, error);
        }
      }

      console.log('🎵 [ArrangementAudio] Track preload completed. Preloaded tracks:', preloadedTracksRef.current.size);
    } catch (error) {
      console.error('❌ [ArrangementAudio] Error during track preload:', error);
    } finally {
      isPreloadingRef.current = false;
    }
  }, [trackVolume, trackMuted]);
  
  // キャッシュ管理とクリーンアップ機能
  const clearPreloadCache = useCallback(() => {
    preloadCacheRef.current.clear();
    preloadedTracksRef.current.clear();
    console.log('🧹 [ArrangementAudio] Preload cache cleared');
  }, []);
  
  // 自動キャッシュクリーンアップ（古いエントリを削除）
  const cleanupOldCache = useCallback(() => {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5分
    
    for (const [key, entry] of preloadCacheRef.current.entries()) {
      if (now - entry.timestamp > maxAge) {
        preloadCacheRef.current.delete(key);
      }
    }
    
    console.log('🧹 [ArrangementAudio] Old cache entries cleaned, current size:', preloadCacheRef.current.size);
  }, []);
  
  // 定期的なキャッシュクリーンアップ
  useEffect(() => {
    const interval = setInterval(cleanupOldCache, 2 * 60 * 1000); // 2分ごと
    return () => clearInterval(interval);
  }, [cleanupOldCache]);

  // 高速SF2SoundFontEngine初期化
  useEffect(() => {
    const initAudioEngine = async () => {
      console.log('🎵 [ArrangementAudio] Starting SF2SoundFontEngine initialization');
      try {
        console.log('🎵 [ArrangementAudio] Initializing SF2SoundFontEngine...');
        const success = await window.unifiedAudioSystem.initialize();
        
        if (success) {
          isInitializedRef.current = true
          
          // ドラムトラック用のトラックを追加（ArrangementView用）
          try {
            window.unifiedAudioSystem.addTrack('drum-track', 'Drum Track', 'drums', '#ff6b6b', null);
            console.log('🎵 [ArrangementAudio] Drum track added to SF2SoundFontEngine');
          } catch (error) {
            console.error('🎵 [ArrangementAudio] Failed to add drum track:', error);
          }
          
          console.log('🎵 [ArrangementAudio] SF2SoundFontEngine initialized successfully');
        } else {
          console.error('🎵 [ArrangementAudio] SF2SoundFontEngine initialization failed');
        }
        
        console.log('🎵 [ArrangementAudio] Audio engine initialization completed');
      } catch (error) {
        console.error('🎵 [ArrangementAudio] Failed to initialize SF2SoundFontEngine:', error);
        console.log('🎵 [ArrangementAudio] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
    }
    
    initAudioEngine()
    
    return () => {
      console.log('🎵 [ArrangementAudio] Cleaning up audio engine...');
      // 再生を停止
      isPlayingRef.current = false
      
      // ドラムトラックの再生を停止（最適化版）
      console.log('🎵 [ArrangementAudio] Stopping drum track playback...');
      drumTrackPlaybackRefs.current.forEach((playbackRef, trackId) => {
        console.log('🎵 [ArrangementAudio] Stopping drum track:', trackId);
        if (playbackRef && playbackRef.stopPlayback) {
          playbackRef.stopPlayback()
        }
        // タイマーも明示的にクリア
        if (playbackRef && playbackRef.playbackTimer) {
          clearInterval(playbackRef.playbackTimer)
          playbackRef.playbackTimer = null
        }
      })
      drumTrackPlaybackRefs.current.clear()
      
      // スケジュールされたタイマーをクリア
      console.log('🎵 [ArrangementAudio] Clearing scheduled timers...');
      scheduledNotesRef.current.forEach(({ startTimeout, endTimeout }) => {
        if (startTimeout) clearTimeout(startTimeout)
        if (endTimeout) clearTimeout(endTimeout)
      })
      scheduledNotesRef.current.clear()
      
      // ModernAudioEngineが音声ノードを管理
      
      // 再生タイマーを停止
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current)
        playbackTimerRef.current = null
      }
      
      console.log('🎵 [ArrangementAudio] Audio engine cleanup completed');
    }
  }, [])

  // ModernAudioEngineの状態チェック
  const ensureAudioEngineReady = useCallback(async () => {
    if (!isInitializedRef.current) {
      console.log('🎵 [ArrangementAudio] EnhancedSoundFontEngine not ready, initializing...');
      const success = await window.unifiedAudioSystem.initialize();
      if (success) {
        isInitializedRef.current = true;
        return true;
      }
      return false;
    }
    return true;
  }, []);

  // DiffSingerトラック専用の再生開始関数
  const startDiffSingerTrackPlayback = useCallback(async (track, startTime) => {
    try {
      console.log('🎤 [ArrangementAudio] Starting DiffSinger track playback:', {
        trackId: track.id,
        trackName: track.name,
        startTime,
        hasMidiData: !!track.midiData,
        hasVoiceSynthData: !!track.voiceSynthData
      });

      // DiffSingerトラックの基本チェック
      if (!track.midiData || !track.midiData.notes || track.midiData.notes.length === 0) {
        console.warn('🎤 [ArrangementAudio] No MIDI notes found for DiffSinger track:', track.id);
        return false;
      }

      // 音声合成データの確認 (diffsingerSettingsをフォールバックとして使用)
      const voiceData = track.voiceSynthData || track.diffsingerSettings;
      if (!voiceData) {
        console.warn('🎤 [ArrangementAudio] No voice synthesis data or diffsingerSettings found for DiffSinger track:', track.id);
        return false;
      }

      // 統合音声システムの準備確認
      const engineReady = await ensureAudioEngineReady();
      if (!engineReady) {
        console.error('🎤 [ArrangementAudio] Failed to prepare unified audio system for DiffSinger track:', track.id);
        return false;
      }

      // 生成された音声ファイルのURLを確認
      let audioUrl = null;

      // DiffSingerTrackコンポーネントで既に生成された音声がある場合
      if (track.generatedAudioUrl) {
        audioUrl = track.generatedAudioUrl;
        console.log('🎤 [ArrangementAudio] Using existing generated audio URL:', audioUrl);
      } else {
        // DiffSingerサーバーから音声を生成
        console.log('🎤 [ArrangementAudio] Generating audio for DiffSinger track...');

        // MIDIノートから音名文字列とデュレーション文字列を作成
        const midiNotes = track.midiData.notes;
        const noteNames = midiNotes.map(note => {
          // MIDIピッチを音名に変換 (例: 60 -> C4)
          const noteNumber = note.pitch % 12;
          const octave = Math.floor(note.pitch / 12) - 1;
          const noteMap = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
          return `${noteMap[noteNumber]}${octave}`;
        });
        const durations = midiNotes.map(note => note.duration.toString());

        const requestData = {
          notes: noteNames.join(' | '),
          durations: durations.join(' | '),
          lyrics: voiceData.lyrics || 'あ',
          language: voiceData.language || 'japanese'
        };

        console.log('🎤 [DiffSinger] API Request data:', {
          endpoint: 'http://localhost:8001/api/synthesize',
          notesCount: requestData.notes ? requestData.notes.length : 0,
          lyrics: requestData.lyrics,
          language: requestData.language,
          phonemesCount: requestData.phonemes ? requestData.phonemes.length : 0,
          firstNote: requestData.notes?.[0],
          requestData
        });

        try {
          const response = await fetch('http://localhost:8001/api/synthesize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
          });

          console.log('🎤 [DiffSinger] API Response status:', response.status);

          if (!response.ok) {
            console.error('🎤 [DiffSinger] API error response:', {
              status: response.status,
              statusText: response.statusText
            });
            throw new Error(`DiffSinger API error: ${response.status}`);
          }

          const result = await response.json();
          console.log('🎤 [DiffSinger] API Response data:', result);

          audioUrl = result.audio_path;

          // 相対パスまたは絶対パスを完全なURLに変換
          if (audioUrl.startsWith('/')) {
            audioUrl = `http://localhost:8001${audioUrl}`;
          } else if (!audioUrl.startsWith('http')) {
            // 相対パス（outputs/synthesis.wavなど）の場合
            audioUrl = `http://localhost:8001/api/generated/${audioUrl.replace(/^outputs[\/\\]/, '')}`;
          }

          console.log('🎤 [DiffSinger] Final audio URL:', audioUrl);
        } catch (error) {
          console.error('🎤 [ArrangementAudio] Failed to generate DiffSinger audio:', error);
          return false;
        }
      }

      if (!audioUrl) {
        console.error('🎤 [ArrangementAudio] No audio URL available for DiffSinger track:', track.id);
        return false;
      }

      // 統合音声システムでDiffSinger音声を再生
      const trackVolumeValue = trackVolume[track.id] || track.volume || 75;
      const normalizedVolume = (trackVolumeValue / 100) * (masterVolume / 100);

      console.log('🎤 [ArrangementAudio] Playing DiffSinger audio with unified audio system:', {
        audioUrl,
        startTime,
        volume: normalizedVolume,
        trackMuted: trackMuted[track.id] || track.muted || false
      });

      // ミュートされていない場合のみ再生
      if (!trackMuted[track.id] && !track.muted) {
        const audioResult = await window.unifiedAudioSystem.playDiffSingerAudio(
          audioUrl,
          startTime,
          null, // duration (null = 全体を再生)
          normalizedVolume
        );

        if (audioResult) {
          console.log('✅ [ArrangementAudio] DiffSinger track playback started successfully:', track.id);
          return true;
        } else {
          console.error('❌ [ArrangementAudio] Failed to start DiffSinger track playback:', track.id);
          return false;
        }
      } else {
        console.log('🔇 [ArrangementAudio] DiffSinger track is muted, skipping playback:', track.id);
        return true; // ミュートは成功とみなす
      }

    } catch (error) {
      console.error('❌ [ArrangementAudio] Error in DiffSinger track playback:', error);
      return false;
    }
  }, [ensureAudioEngineReady, trackVolume, trackMuted, masterVolume]);

  // グローバルテスト関数として公開
  useEffect(() => {
    window.arrangementViewPlayDrumSound = playDrumSound;
    return () => {
      delete window.arrangementViewPlayDrumSound;
    };
  }, [playDrumSound])

  // ドラムトラック専用の再生開始関数（最適化版）
  const startDrumTrackPlayback = useCallback(async (track, startTime) => {
    
    
    try {
              // ドラムトラックマネージャーから最新データを強制取得
        // パフォーマンス最適化: デバッグログを減らす
        drumTrackManager.updateCombinedData(track.id, 32); // 強制更新
        const playbackData = drumTrackManager.getPlaybackData(track.id, 32)
        
        if (!playbackData) {
          console.warn('🥁 [ArrangementAudio] No playback data available for drum track:', track.id);
          return false;
        }
        
        // パフォーマンス最適化: 詳細ログを減らす
      
              // ModernAudioEngineの準備確認
        const engineReady = await ensureAudioEngineReady();
        if (!engineReady) {
          console.error('🥁 [ArrangementAudio] Failed to prepare ModernAudioEngine for drum track:', track.id);
          return false;
        }
        
        // ドラムトラックが統一音声システムに存在しない場合は追加
        if (!window.unifiedAudioSystem.tracks.has(track.id)) {
          console.log('🎵 [ArrangementAudio] Adding drum track to unified audio system:', track.id);
          try {
            window.unifiedAudioSystem.addTrack(
              track.id,
              track.name || 'Drum Track',
              'drums',
              track.color || '#ff6b6b',
              track
            );
            
            // ドラムトラックの音量・ミュート設定を適用
            const trackVolumeValue = trackVolume[track.id] || track.volume || 75;
            const normalizedVolume = trackVolumeValue / 100;
            window.unifiedAudioSystem.setTrackVolume(track.id, normalizedVolume);
            window.unifiedAudioSystem.setTrackMuted(track.id, trackMuted[track.id] || track.muted || false);
            window.unifiedAudioSystem.setTrackSolo(track.id, track.solo || false);
            
            console.log('🎵 [ArrangementAudio] Drum track volume settings:', {
              trackId: track.id,
              trackVolumeValue,
              normalizedVolume,
              isMuted: trackMuted[track.id] || track.muted || false
            });
          } catch (error) {
            console.error('🎵 [ArrangementAudio] Failed to add drum track:', track.id, error);
          }
        }
      
      // ドラムトラックの再生状態を管理（最適化版）
      const playbackRef = {
        isPlaying: true,
        startTime: startTime,
        notes: playbackData.notes || [],
        tempo: playbackData.tempo || bpm,
        grid: playbackData.grid || [],
        instruments: playbackData.instruments || [],
        lastStep: -1,
        playbackStartTime: Date.now() / 1000,  // 秒単位
        lastPlaybackTime: 0,
        lastPlaybackPitch: null,
        playbackTimer: null,
        stopPlayback: () => {
          // パフォーマンス最適化: ログを減らす
          playbackRef.isPlaying = false
          if (playbackRef.playbackTimer) {
            clearInterval(playbackRef.playbackTimer)
            playbackRef.playbackTimer = null
          }
        }
      }
      
              // ドラムトラック専用の再生ループを開始（高精度タイミング）
        const startDrumPlaybackLoop = () => {
          if (playbackRef.playbackTimer) {
            clearInterval(playbackRef.playbackTimer)
          }
          
          playbackRef.playbackTimer = setInterval(() => {
            if (!playbackRef.isPlaying || !isPlayingRef.current) {
              clearInterval(playbackRef.playbackTimer)
              return
            }
          
          try {
            const currentTime = Date.now() / 1000  // 秒単位
            const elapsedTime = currentTime - playbackRef.playbackStartTime
            const newTime = Math.max(0, elapsedTime)
            
            // グリッドの列数を取得
            const gridColumns = playbackRef.grid[0]?.length || 16
            const stepDuration = 60 / playbackRef.tempo / 4 // 16分音符の長さ
            const patternDuration = stepDuration * gridColumns
            
            // ループ処理
            if (newTime >= patternDuration) {
              playbackRef.playbackStartTime = Date.now() / 1000
              playbackRef.lastStep = -1
            }
            
            // 現在のステップを計算
            const currentStep = Math.floor(newTime / stepDuration) % gridColumns
            
            // 新しいステップに到達した場合のみ音を再生
            if (currentStep !== playbackRef.lastStep) {
              playbackRef.lastStep = currentStep
              

              
              // 各楽器の音を再生（同時再生を許可）
              if (playbackRef.grid && playbackRef.instruments) {
                for (let rowIndex = 0; rowIndex < playbackRef.grid.length; rowIndex++) {
                  const row = playbackRef.grid[rowIndex]
                  if (Array.isArray(row)) {
                    const cell = row[currentStep]
                    const isActive = typeof cell === 'boolean' ? cell : (cell && cell.active)
                    
                    if (isActive) {
                      const instrument = playbackRef.instruments[rowIndex]
                      if (instrument) {
                        try {
                          const velocity = (typeof cell === 'object' && cell.velocity) || instrument.velocity || 0.8
                          
                          // クールダウン戦略を適用（ピッチ別）
                          const currentTime = Date.now()
                          const timeSinceLastPlayback = currentTime - playbackRef.lastPlaybackTime
                          const cooldownTime = 5 // 5ms
                          const lastPitch = playbackRef.lastPlaybackPitch
                          const isSamePitch = lastPitch === instrument.pitch
                          
                          if (!(isSamePitch && timeSinceLastPlayback < cooldownTime)) {
                            // 同時再生を許可するため、非同期処理で実行（トラック指定）
                            window.unifiedAudioSystem.playDrumSoundWithTrackSettings(instrument.pitch, velocity, track.id).then(result => {
                              if (!result) {
                                console.warn('🥁 [ArrangementAudio] Failed to play drum note:', {
                                  trackId: track.id,
                                  pitch: instrument.pitch,
                                  step: currentStep,
                                  rowIndex: rowIndex
                                })
                              }
                            }).catch(error => {
                              console.error('🥁 [ArrangementAudio] Error playing drum note:', error)
                            })
                            
                            // クールダウン情報を更新
                            playbackRef.lastPlaybackTime = currentTime
                            playbackRef.lastPlaybackPitch = instrument.pitch
                          } else {

                          }
                        } catch (error) {
                          console.error('🥁 [ArrangementAudio] Error playing drum note:', error)
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('🥁 [ArrangementAudio] Error in drum playback loop:', error)
          }
        }, 8) // 8ms間隔（約120fps）で高精度タイミング
      }
      
      // 再生ループを開始
      startDrumPlaybackLoop()
      
      drumTrackPlaybackRefs.current.set(track.id, playbackRef)

      
      return true
    } catch (error) {
      console.error('🥁 [ArrangementAudio] Error starting drum track playback:', error)
      console.log('🥁 [ArrangementAudio] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      return false
    }
  }, [ensureAudioEngineReady, bpm])

  // 高FPS再生タイマー（requestAnimationFrame使用）
  const startPlaybackTimer = useCallback((startTimeOverride = null, setCurrentTime, setPlaybackPosition, loopEnabled, loopEnd, loopStart, handleStop) => {
    stopPlaybackTimer()
    let startTime = performance.now()
    let initialTime = startTimeOverride !== null ? startTimeOverride : currentTime
    let lastFrameTime = startTime
    let frameCount = 0
    let fpsCounter = 0
    
    const updateTimer = (currentFrameTime) => {
      if (!isPlayingRef.current) {
        return
      }
      
      // FPS カウンター（デバッグ用）
      frameCount++
      if (currentFrameTime - fpsCounter >= 1000) { // 1秒ごと
        console.log(`🚀 [ArrangementAudio] Timeline FPS: ${frameCount}`);
        frameCount = 0
        fpsCounter = currentFrameTime
      }
      
      // フレーム間隔チェック（フレームスキップ防止）
      const deltaTime = currentFrameTime - lastFrameTime
      if (deltaTime < 8) { // 最低8ms間隔を保証（120fps上限）
        playbackTimerRef.current = requestAnimationFrame(updateTimer)
        return
      }
      lastFrameTime = currentFrameTime
      
      const elapsed = (currentFrameTime - startTime) / 1000
      const newTime = initialTime + elapsed
      
      // ループ機能のチェック
      if (loopEnabled && newTime >= loopEnd) {
        setCurrentTime(loopStart)
        setPlaybackPosition(loopStart * pixelsPerSecond)
        startTime = performance.now()
        initialTime = loopStart
        lastFrameTime = startTime
      } else if (newTime >= totalDuration / 1000) {
        handleStop()
        return
      } else {
        // GPU加速対応の状態更新（will-change: transform使用）
        setCurrentTime(newTime)
        setPlaybackPosition(newTime * pixelsPerSecond)
      }
      
      // requestAnimationFrameで滑らかな60fps描画
      playbackTimerRef.current = requestAnimationFrame(updateTimer)
    }
    
    playbackTimerRef.current = requestAnimationFrame(updateTimer)
    console.log('🚀 [ArrangementAudio] High-FPS timeline started with requestAnimationFrame');
  }, [currentTime, pixelsPerSecond, totalDuration])

  // 再生タイマーの停止（requestAnimationFrame対応）
  const stopPlaybackTimer = useCallback(() => {
    console.log('🚀 [ArrangementAudio] stopPlaybackTimer called');
    if (playbackTimerRef.current) {
      cancelAnimationFrame(playbackTimerRef.current)
      playbackTimerRef.current = null
      console.log('🚀 [ArrangementAudio] High-FPS playback timer stopped');
    }
  }, [])

  // 再生コントロール
  const handlePlay = useCallback(async (setIsPlaying, setCurrentTime, setPlaybackPosition) => {
    console.log('🎵 [ArrangementAudio] handlePlay called');
    
    if (!isInitializedRef.current) {
      console.error('❌ [ArrangementAudio] ModernAudioEngine not available');
      return;
    }

    // 既に再生中の場合は何もしない
    if (isPlayingRef.current) {
      console.log('🎵 [ArrangementAudio] Already playing, skipping');
      return;
    }
    
    // 再生開始前に現在鳴っている音を一斉に停止
    if (window.unifiedAudioSystem) {
      console.log('🎵 [ArrangementAudio] 再生開始前に全音を停止します');
      window.unifiedAudioSystem.stopAllSounds();
    }
    
    // 再生開始位置を決定（最後にクリックした位置がある場合はそこから、なければ現在位置から）
    const startTime = lastClickPosition !== null ? lastClickPosition : currentTime;
    console.log('🎵 [ArrangementAudio] Setting start time:', {
      startTime,
      lastClickPosition,
      currentTime
    });
    
    // 再生可能なトラックをフィルタリング（最適化版）
    const tracksToPlay = tracks.filter(track => {
      const trackState = trackStates[track.id];
      const isMuted = trackState?.muted || false;
      const isAudioEnabled = trackState?.audioEnabled !== false; // デフォルトでtrue
      
      // トラック状態が存在しない場合は、デフォルトで再生可能とする
      if (!trackState) {
        return true;
      }
      
      return !isMuted && isAudioEnabled;
    });
    
    console.log('🎵 [ArrangementAudio] Tracks selected for playback:', tracksToPlay.length, tracksToPlay.map(t => ({ id: t.id, name: t.name, subtype: t.subtype })));
    
    if (tracksToPlay.length > 0) {
      // 再生状態を先に設定
      console.log('🎵 [ArrangementAudio] Setting playback state...');
      isPlayingRef.current = true
      setIsPlaying(true)
      
      // 再生位置を更新
      setCurrentTime(startTime)
      setPlaybackPosition(startTime * pixelsPerSecond)
      
      // 統一音声システムは個別の音再生で管理されるため、global playは不要
      console.log('🎵 [ArrangementAudio] Unified audio system ready for individual note playback');
      
      // 再生開始時刻を現在時刻に設定（統一音声システム用）
      const playbackStartTime = Date.now() / 1000 - startTime; // 秒単位
      playbackStartTimeRef.current = playbackStartTime
      console.log('🎵 [ArrangementAudio] Set playback start time:', {
        playbackStartTime,
        startTime,
        currentTime: Date.now() / 1000
      });
       
      // スケジュールされたノートをクリア
      scheduledNotesRef.current.clear()
      
      // ドラムトラックの再生を先に開始
      console.log('🎵 [ArrangementAudio] Starting drum tracks...');
      const drumTracks = tracksToPlay.filter(track => track.subtype === 'drums')
      for (const drumTrack of drumTracks) {
        console.log('🎵 [ArrangementAudio] Starting drum track:', drumTrack.id);
        await startDrumTrackPlayback(drumTrack, startTime)
      }

      // DiffSingerトラックの再生を開始
      console.log('🎵 [ArrangementAudio] Starting DiffSinger tracks...');
      const diffsingerTracks = tracksToPlay.filter(track =>
        track.subtype === 'diffsinger' || track.type === 'diffsinger'
      )
      for (const diffsingerTrack of diffsingerTracks) {
        console.log('🎵 [ArrangementAudio] Starting DiffSinger track:', diffsingerTrack.id);
        await startDiffSingerTrackPlayback(diffsingerTrack, startTime)
      }
      
      // MIDIトラックの再生を開始
      console.log('🎵 [ArrangementAudio] Starting MIDI tracks...');
      const midiTracks = tracksToPlay.filter(track =>
        track.subtype !== 'drums' &&
        track.subtype !== 'diffsinger' &&
        track.type !== 'diffsinger'
      )
      
      // EnhancedSoundFontEngineの状態を確認
      if (!isInitializedRef.current) {
        console.error('🎵 [ArrangementAudio] EnhancedSoundFontEngine not available for MIDI tracks');
        return;
      }
      
      console.log('🎵 [ArrangementAudio] EnhancedSoundFontEngine state:', {
        isInitialized: isInitializedRef.current,
        hasScheduleNote: typeof window.unifiedAudioSystem.scheduleNote === 'function',
        tracksCount: window.unifiedAudioSystem.tracks.size,
        trackIds: Array.from(window.unifiedAudioSystem.tracks.keys())
      });
      
      for (const midiTrack of midiTracks) {
        console.log('🎵 [ArrangementAudio] Processing MIDI track:', midiTrack.id);
        
        // トラックがEnhancedSoundFontEngineに存在しない場合は追加
        if (!window.unifiedAudioSystem.tracks.has(midiTrack.id)) {
          console.log('🎵 [ArrangementAudio] Track not found in EnhancedSoundFontEngine, adding:', midiTrack.id);
          try {
            window.unifiedAudioSystem.addTrack(
              midiTrack.id,
              midiTrack.name,
              midiTrack.type || 'piano',
              midiTrack.color,
              midiTrack
            );
            
            // トラックの設定を音声システムに適用
            const trackVolumeValue = trackVolume[midiTrack.id] || midiTrack.volume || 75;
            const normalizedVolume = trackVolumeValue / 100;
            window.unifiedAudioSystem.setTrackVolume(midiTrack.id, normalizedVolume);
            window.unifiedAudioSystem.setTrackMuted(midiTrack.id, trackMuted[midiTrack.id] || midiTrack.muted || false);
            window.unifiedAudioSystem.setTrackSolo(midiTrack.id, midiTrack.solo || false);
            
            console.log('🎵 [ArrangementAudio] Track volume settings:', {
              trackId: midiTrack.id,
              trackVolumeValue,
              normalizedVolume,
              isMuted: trackMuted[midiTrack.id] || midiTrack.muted || false
            });
            
            console.log('🎵 [ArrangementAudio] Track added to EnhancedSoundFontEngine successfully:', midiTrack.id);
          } catch (error) {
            console.error('🎵 [ArrangementAudio] Failed to add track to EnhancedSoundFontEngine:', midiTrack.id, error);
            continue; // このトラックをスキップ
          }
        }
        
        // MIDIノートデータをトラックから取得
        const midiNotes = midiTrack.midiData?.notes || [];
        console.log('🎵 [ArrangementAudio] MIDI notes found:', {
          trackId: midiTrack.id,
          notesCount: midiNotes.length,
          notes: midiNotes.slice(0, 3) // 最初の3つのノートを表示
        });
        
        if (midiNotes.length > 0) {
          console.log('🎵 [ArrangementAudio] Scheduling notes for MIDI track:', {
            trackId: midiTrack.id,
            notesCount: midiNotes.length
          });
          
          // ノートをスケジュール
          midiNotes.forEach((note, index) => {
            const noteStartTime = note.time - startTime;
            const noteEndTime = noteStartTime + note.duration;
            
            if (noteStartTime >= 0) {
              console.log('🎵 [ArrangementAudio] Scheduling MIDI note:', {
                trackId: midiTrack.id,
                index,
                pitch: note.pitch,
                startTime: noteStartTime,
                duration: note.duration
              });
              
              const startTimeout = setTimeout(() => {
                if (isPlayingRef.current) {
                  try {
                    console.log('🎵 [ArrangementAudio] Playing MIDI note:', {
                      trackId: midiTrack.id,
                      pitch: note.pitch,
                      velocity: note.velocity,
                      startTime: noteStartTime,
                      duration: note.duration
                    });
                    
                    window.unifiedAudioSystem.scheduleNote(
                      midiTrack.id,
                      note.pitch,
                      0, // 即座に再生（setTimeoutでタイミング制御済み）
                      note.duration,
                      note.velocity
                    );
                    
                    const noteId = `${midiTrack.id}-${note.pitch}-${note.time}`;
                    scheduledNotesRef.current.set(noteId, { note });
                    console.log('🎵 [ArrangementAudio] MIDI note scheduled successfully:', noteId);
                  } catch (error) {
                    console.error('🎵 [ArrangementAudio] Error playing MIDI note:', error);
                  }
                }
              }, noteStartTime * 1000);
              
              scheduledNotesRef.current.set(`${midiTrack.id}-${note.pitch}-${note.time}`, {
                note,
                startTimeout
              });
            } else {
              console.log('🎵 [ArrangementAudio] Skipping past MIDI note:', {
                trackId: midiTrack.id,
                index,
                pitch: note.pitch,
                startTime: noteStartTime
              });
            }
          });
        } else {
          console.log('🎵 [ArrangementAudio] No notes to play for MIDI track:', {
            trackId: midiTrack.id,
            trackName: midiTrack.name,
            hasMidiData: !!midiTrack.midiData,
            midiDataKeys: midiTrack.midiData ? Object.keys(midiTrack.midiData) : [],
            notesCount: midiNotes.length
          });
        }
      }
      
      console.log('🎵 [ArrangementAudio] All tracks started successfully');
      
    } else {
      console.log('🎵 [ArrangementAudio] No tracks to play');
    }
  }, [tracks, trackStates, currentTime, lastClickPosition, pixelsPerSecond, startDrumTrackPlayback, isPlayingRef, scheduledNotesRef, playbackStartTimeRef]);

  const handlePause = useCallback((setIsPlaying) => {
    isPlayingRef.current = false
    setIsPlaying(false)
    
    // ドラムトラックの再生を停止（最適化版）
    console.log('🎵 [ArrangementAudio] Stopping drum tracks on pause...');
    drumTrackPlaybackRefs.current.forEach((playbackRef, trackId) => {
      console.log('🎵 [ArrangementAudio] Stopping drum track on pause:', trackId);
      if (playbackRef && playbackRef.stopPlayback) {
        playbackRef.stopPlayback()
      }
      // タイマーも明示的にクリア
      if (playbackRef && playbackRef.playbackTimer) {
        clearInterval(playbackRef.playbackTimer)
        playbackRef.playbackTimer = null
      }
    })
    
    // スケジュールされたタイマーをクリア
    scheduledNotesRef.current.forEach(({ startTimeout }) => {
      clearTimeout(startTimeout)
    })
    scheduledNotesRef.current.clear()
    
    // ModernAudioEngineが音声ノードを管理
    
    stopPlaybackTimer()
  }, [stopPlaybackTimer])

  const handleStop = useCallback((setIsPlaying, setCurrentTime, setPlaybackPosition) => {
    isPlayingRef.current = false
    setIsPlaying(false)
    setCurrentTime(0)
    setPlaybackPosition(0)
    
    // ドラムトラックの再生を停止（最適化版）
    console.log('🎵 [ArrangementAudio] Stopping drum tracks on stop...');
    drumTrackPlaybackRefs.current.forEach((playbackRef, trackId) => {
      console.log('🎵 [ArrangementAudio] Stopping drum track on stop:', trackId);
      if (playbackRef && playbackRef.stopPlayback) {
        playbackRef.stopPlayback()
      }
      // タイマーも明示的にクリア
      if (playbackRef && playbackRef.playbackTimer) {
        clearInterval(playbackRef.playbackTimer)
        playbackRef.playbackTimer = null
      }
    })
    drumTrackPlaybackRefs.current.clear()
    
    // スケジュールされたタイマーをクリア
    scheduledNotesRef.current.forEach(({ startTimeout }) => {
      clearTimeout(startTimeout)
    })
    scheduledNotesRef.current.clear()
    
    // ModernAudioEngineが音声ノードを管理
    
    stopPlaybackTimer()
  }, [stopPlaybackTimer])

  // オーディオエンジンの状態を監視
  useEffect(() => {
    // クリーンアップ
    return () => {
      stopPlaybackTimer()
    }
  }, [stopPlaybackTimer])

  return {
    isPlayingRef,
    unifiedAudioSystem: window.unifiedAudioSystem,
    handlePlay,
    handlePause,
    handleStop,
    startPlaybackTimer,
    stopPlaybackTimer,
    playDrumSound,
    preloadAllTracks,
    clearPreloadCache,
    cleanupOldCache,
    getCacheStats: () => ({
      cacheSize: preloadCacheRef.current.size,
      preloadedTracks: preloadedTracksRef.current.size,
      isPreloading: isPreloadingRef.current
    })
  }
} 