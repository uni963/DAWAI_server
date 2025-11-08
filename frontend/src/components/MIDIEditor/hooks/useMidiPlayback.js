import { useCallback, useEffect, useRef } from 'react';

export function useMidiPlayback({
  state,
  audio,
  isPlayingRef,
  scheduledNotesRef,
  playbackStartTimeRef,
  activeAudioNodesRef,
  playbackRef,
  metronomeRef,
  onMidiDataUpdate,
  trackId,
}) {
  // ループ再生用のタイマーRef
  const playbackTimerRef = useRef(null);

  // 再生タイマーの停止
  const stopPlaybackTimer = useCallback(() => {
    if (playbackTimerRef.current) {
      cancelAnimationFrame(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, []);

  // 指定時刻からノートをスケジュール
  const scheduleNotesFromTime = useCallback((startTime) => {
    console.log('🎵 [MidiPlayback] Scheduling notes from time:', startTime);
    console.log('🎵 [DEBUG] Total notes to schedule:', state.notes.length);

    // 既存のスケジュールをクリア
    scheduledNotesRef.current.forEach(({ startTimeout, endTimeout }) => {
      if (startTimeout) clearTimeout(startTimeout);
      if (endTimeout) clearTimeout(endTimeout);
    });
    scheduledNotesRef.current.clear();

    // アクティブなノードを停止
    activeAudioNodesRef.current.forEach((audioNode) => {
      if (audioNode && typeof audioNode.stop === 'function') {
        audioNode.stop();
      }
    });
    activeAudioNodesRef.current.clear();
    state.setPlaybackNotes(new Set());

    // 指定時刻以降のノートをスケジュール
    const currentAudioTime = audio.getCurrentTime();
    state.notes.forEach((note) => {
      if (note.time >= startTime) {
        const noteStartTime = (note.time - startTime) * 1000; // ms
        const noteEndTime = noteStartTime + (note.duration * 1000);
        const noteId = `${trackId}-${note.pitch}-${note.time}`;

        // 最初にタイムアウト参照用のエントリを作成（audioNode: null）
        const scheduleEntry = {
          note,
          audioNode: null,
          startTimeout: null,
          endTimeout: null
        };
        scheduledNotesRef.current.set(noteId, scheduleEntry);

        const startTimeout = setTimeout(() => {
          if (isPlayingRef.current) {
            const audioNode = audio.playScheduledNote(
              note.pitch,
              note.time,
              note.duration,
              note.velocity
            );

            if (audioNode) {
              // audioNodeを既存のエントリに追加
              const entry = scheduledNotesRef.current.get(noteId);
              if (entry) {
                entry.audioNode = audioNode;
              }
              activeAudioNodesRef.current.set(noteId, audioNode);

              const currentNotes = new Set(state.playbackNotes);
              currentNotes.add(noteId);
              state.setPlaybackNotes(currentNotes);
            }
          }
        }, noteStartTime);

        const endTimeout = setTimeout(() => {
          const scheduledNote = scheduledNotesRef.current.get(noteId);

          if (scheduledNote && scheduledNote.audioNode) {
            scheduledNote.audioNode.stop();
            activeAudioNodesRef.current.delete(noteId);
            scheduledNotesRef.current.delete(noteId);

            const currentNotes = new Set(state.playbackNotes);
            currentNotes.delete(noteId);
            state.setPlaybackNotes(currentNotes);
          }
        }, noteEndTime);

        // タイムアウト参照を既存のエントリに追加
        scheduleEntry.startTimeout = startTimeout;
        scheduleEntry.endTimeout = endTimeout;
      }
    });
  }, [state, audio, trackId, isPlayingRef, scheduledNotesRef, activeAudioNodesRef]);

  // ループ対応の再生タイマー開始
  const startPlaybackTimer = useCallback((startTime) => {
    stopPlaybackTimer();

    let initialTime = startTime;
    let timerStartTime = performance.now();
    let lastFrameTime = timerStartTime;

    const updateTimer = (currentFrameTime) => {
      if (!isPlayingRef.current) {
        return;
      }

      // フレーム間隔チェック（最低8ms間隔）
      const deltaTime = currentFrameTime - lastFrameTime;
      if (deltaTime < 8) {
        playbackTimerRef.current = requestAnimationFrame(updateTimer);
        return;
      }
      lastFrameTime = currentFrameTime;

      // 経過時間計算
      const elapsed = (currentFrameTime - timerStartTime) / 1000;
      const newTime = initialTime + elapsed;

      // ループ機能のチェック
      if (state.loopEnabled) {
        // ループ終了点到達時の処理
        if (newTime >= state.loopEnd) {
          console.log('🔄 [MidiPlayback] Loop end reached, resetting to start:', state.loopStart);
          console.log('🔄 [DEBUG] Current notes count:', state.notes.length);
          console.log('🔄 [DEBUG] Current scheduled notes:', scheduledNotesRef.current.size);

          // currentTimeをループ開始位置にリセット
          state.setCurrentTime(state.loopStart);

          // タイマーをリセット
          initialTime = state.loopStart;
          timerStartTime = performance.now();
          lastFrameTime = timerStartTime;

          // 次のループのノートを即座に再スケジュール
          console.log('🔄 [MidiPlayback] Re-scheduling notes for next loop iteration');
          console.log('🔄 [DEBUG] BEFORE re-schedule - scheduled notes:', scheduledNotesRef.current.size);
          scheduleNotesFromTime(state.loopStart);
          console.log('🔄 [DEBUG] AFTER re-schedule - scheduled notes:', scheduledNotesRef.current.size);
        } else {
          state.setCurrentTime(newTime);
        }
      } else {
        // ノートの最大時間を計算
        const maxNoteTime = state.notes.length > 0
          ? Math.max(...state.notes.map(note => (note.time || 0) + (note.duration || 1)))
          : 0;

        // 最大時間 + 余裕（5秒）を超えたら停止
        const effectiveEndTime = maxNoteTime + 5;

        if (newTime >= effectiveEndTime) {
          // 再生終了
          stopPlayback();
          return;
        } else {
          state.setCurrentTime(newTime);
        }
      }

      // 再描画フラグを設定
      state.setNeedsRedraw(true);

      // 次のフレーム
      playbackTimerRef.current = requestAnimationFrame(updateTimer);
    };

    playbackTimerRef.current = requestAnimationFrame(updateTimer);
  }, [state, isPlayingRef, stopPlaybackTimer, scheduleNotesFromTime, stopPlayback]);

  // 再生機能の実装
  const startPlayback = useCallback(async () => {
    console.log('🎵 [MidiPlayback] startPlayback called');
    console.log('🎵 [MidiPlayback] Current state:', {
      isPlaying: isPlayingRef.current,
      notesCount: state.notes.length,
      currentTime: state.currentTime,
      trackId
    });
    
    // 既に再生中の場合は何もしない（Refで状態を直接確認）
    if (isPlayingRef.current) {
      console.log('🎵 [MidiPlayback] Already playing, skipping');
      return;
    }
    
    console.log('🎵 [MidiPlayback] Initializing audio context...');
    // AudioContextの初期化を確実に行う
    const audioInitialized = await audio.initializeAudio();
    if (!audioInitialized) {
      console.error('🎵 [MidiPlayback] Failed to initialize audio context');
      return;
    }
    console.log('🎵 [MidiPlayback] Audio context initialized successfully');
    
    if (state.notes.length === 0) {
      console.log('🎵 [MidiPlayback] No notes to play');
      return;
    }
    
    // 再生状態を先に設定（Refとstateの両方を更新）
    console.log('🎵 [MidiPlayback] Setting playback state...');
    isPlayingRef.current = true;
    state.setIsPlaying(true);
    
    // タイムラインクリック位置がある場合はそこから再生、なければ現在位置から再生
    const startTime = state.timelineClickPosition !== null ? state.timelineClickPosition : state.currentTime;
    console.log('🎵 [MidiPlayback] Setting start time:', {
      startTime,
      timelineClickPosition: state.timelineClickPosition,
      currentTime: state.currentTime
    });
    state.setCurrentTime(startTime);
    
    // 再生開始時刻を計算（指定位置から再生するため、開始時刻を過去に設定）
    const playbackStartTime = audio.getCurrentTime() - startTime;
    console.log('🎵 [MidiPlayback] Calculated playback start time:', {
      playbackStartTime,
      audioCurrentTime: audio.getCurrentTime(),
      startTime
    });
    
    state.setPlaybackStartTime(playbackStartTime);
    playbackStartTimeRef.current = playbackStartTime;
    
    // 再生ヘッドを即座に表示するため、強制的に再描画
    state.setNeedsRedraw(true);
    
    // スケジュールされたノートをクリア
    scheduledNotesRef.current.clear();
    state.setPlaybackNotes(new Set());
    
    console.log('🎵 [MidiPlayback] Playback started successfully');
    console.log('🎵 [MidiPlayback] Notes to schedule:', state.notes.length);

    // ノートをスケジュール
    scheduleNotesFromTime(startTime);

    // ループ対応のタイマーを開始
    startPlaybackTimer(startTime);

    console.log('🎵 [MidiPlayback] All notes scheduled');
  }, [state, audio, isPlayingRef, scheduledNotesRef, playbackStartTimeRef, activeAudioNodesRef, trackId, scheduleNotesFromTime, startPlaybackTimer]);

  // 共通のクリーンアップ処理
  const cleanupPlayback = useCallback(() => {
    // 再生タイマーを停止
    stopPlaybackTimer();

    // 再生状態を停止
    isPlayingRef.current = false;
    state.setIsPlaying(false);

    // スケジュールされたタイマーをクリア
    scheduledNotesRef.current.forEach(({ startTimeout, endTimeout }) => {
      if (startTimeout) clearTimeout(startTimeout);
      if (endTimeout) clearTimeout(endTimeout);
    });
    scheduledNotesRef.current.clear();

    // アクティブなオーディオノードを停止
    activeAudioNodesRef.current.forEach((audioNode) => {
      if (audioNode && typeof audioNode.stop === 'function') {
        audioNode.stop();
      }
    });
    activeAudioNodesRef.current.clear();

    // 再生中のノートをクリア
    state.setPlaybackNotes(new Set());

    // 強制的に再描画
    state.setNeedsRedraw(true);
  }, [state, isPlayingRef, scheduledNotesRef, activeAudioNodesRef, stopPlaybackTimer]);

  // 再生停止
  const stopPlayback = useCallback(() => {
    console.log('🎵 [MidiPlayback] stopPlayback called');
    cleanupPlayback();
    console.log('🎵 [MidiPlayback] Playback stopped successfully');
  }, [cleanupPlayback]);

  // 再生一時停止
  const pausePlayback = useCallback(() => {
    console.log('🎵 [MidiPlayback] pausePlayback called');
    cleanupPlayback();
    console.log('🎵 [MidiPlayback] Playback paused successfully');
  }, [cleanupPlayback]);

  // クリーンアップ: コンポーネントアンマウント時にタイマーを停止
  useEffect(() => {
    return () => {
      stopPlaybackTimer();
    };
  }, [stopPlaybackTimer]);

  return {
    startPlayback,
    stopPlayback,
    pausePlayback
  };
} 