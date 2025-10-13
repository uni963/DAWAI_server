import { useCallback, useEffect } from 'react';

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
    state.notes.forEach((note, index) => {
      const noteStartTime = note.time - startTime;
      const noteEndTime = noteStartTime + note.duration;
      
      // 現在時刻より後のノートのみスケジュール
      if (noteStartTime >= 0) {
        console.log('🎵 [MidiPlayback] Scheduling note:', {
          index,
          pitch: note.pitch,
          startTime: noteStartTime,
          duration: note.duration,
          velocity: note.velocity
        });
        
        const startTimeout = setTimeout(() => {
          if (isPlayingRef.current) {
            console.log('🎵 [MidiPlayback] Playing note:', {
              pitch: note.pitch,
              velocity: note.velocity,
              duration: note.duration
            });
            
            const audioNode = audio.playScheduledNote(
              note.pitch,
              note.time,
              note.duration,
              note.velocity
            );
            
            if (audioNode) {
              const noteId = `${trackId}-${note.pitch}-${note.time}`;
              activeAudioNodesRef.current.set(noteId, audioNode);
              scheduledNotesRef.current.set(noteId, { note, audioNode });
              
              // 再生中のノートとして記録
              const currentNotes = new Set(state.playbackNotes);
              currentNotes.add(noteId);
              state.setPlaybackNotes(currentNotes);
            }
          }
        }, noteStartTime * 1000);
        
        const endTimeout = setTimeout(() => {
          const noteId = `${trackId}-${note.pitch}-${note.time}`;
          const scheduledNote = scheduledNotesRef.current.get(noteId);
          
          if (scheduledNote && scheduledNote.audioNode) {
            console.log('🎵 [MidiPlayback] Stopping note:', {
              pitch: note.pitch,
              noteId
            });
            
            scheduledNote.audioNode.stop();
            activeAudioNodesRef.current.delete(noteId);
            scheduledNotesRef.current.delete(noteId);
            
            // 再生中のノートから削除
            const currentNotes = new Set(state.playbackNotes);
            currentNotes.delete(noteId);
            state.setPlaybackNotes(currentNotes);
          }
        }, noteEndTime * 1000);
        
        scheduledNotesRef.current.set(`${trackId}-${note.pitch}-${note.time}`, {
          note,
          startTimeout,
          endTimeout
        });
      } else {
        console.log('🎵 [MidiPlayback] Skipping past note:', {
          index,
          pitch: note.pitch,
          startTime: noteStartTime
        });
      }
    });
    
    console.log('🎵 [MidiPlayback] All notes scheduled');
  }, [state, audio, isPlayingRef, scheduledNotesRef, playbackStartTimeRef, activeAudioNodesRef, trackId]);

  // 再生停止
  const stopPlayback = useCallback(() => {
    console.log('🎵 [MidiPlayback] stopPlayback called');
    
    // 再生状態を停止
    isPlayingRef.current = false;
    state.setIsPlaying(false);
    
    // スケジュールされたタイマーをクリア
    console.log('🎵 [MidiPlayback] Clearing scheduled timers...');
    scheduledNotesRef.current.forEach(({ startTimeout, endTimeout }) => {
      if (startTimeout) clearTimeout(startTimeout);
      if (endTimeout) clearTimeout(endTimeout);
    });
    scheduledNotesRef.current.clear();
    
    // アクティブなオーディオノードを停止
    console.log('🎵 [MidiPlayback] Stopping active audio nodes...');
    activeAudioNodesRef.current.forEach((audioNode, noteId) => {
      console.log('🎵 [MidiPlayback] Stopping audio node:', noteId);
      if (audioNode && typeof audioNode.stop === 'function') {
        audioNode.stop();
      }
    });
    activeAudioNodesRef.current.clear();
    
    // 再生中のノートをクリア
    state.setPlaybackNotes(new Set());
    
    // 強制的に再描画
    state.setNeedsRedraw(true);
    
    console.log('🎵 [MidiPlayback] Playback stopped successfully');
  }, [state, isPlayingRef, scheduledNotesRef, activeAudioNodesRef]);

  // 再生一時停止
  const pausePlayback = useCallback(() => {
    console.log('🎵 [MidiPlayback] pausePlayback called');
    
    // 再生状態を一時停止
    isPlayingRef.current = false;
    state.setIsPlaying(false);
    
    // スケジュールされたタイマーをクリア
    scheduledNotesRef.current.forEach(({ startTimeout, endTimeout }) => {
      if (startTimeout) clearTimeout(startTimeout);
      if (endTimeout) clearTimeout(endTimeout);
    });
    scheduledNotesRef.current.clear();
    
    // アクティブなオーディオノードを停止
    activeAudioNodesRef.current.forEach((audioNode, noteId) => {
      if (audioNode && typeof audioNode.stop === 'function') {
        audioNode.stop();
      }
    });
    activeAudioNodesRef.current.clear();
    
    // 再生中のノートをクリア
    state.setPlaybackNotes(new Set());
    
    // 強制的に再描画
    state.setNeedsRedraw(true);
    
    console.log('🎵 [MidiPlayback] Playback paused successfully');
  }, [state, isPlayingRef, scheduledNotesRef, activeAudioNodesRef]);

  return {
    startPlayback,
    stopPlayback,
    pausePlayback
  };
} 