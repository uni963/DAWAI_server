import { useCallback } from 'react';

export function useMidiNoteEdit({
  state,
  persistence,
  ghostText,
  onNoteAdd,
  onNoteRemove,
  onNoteEdit,
  onMidiDataUpdate,
  trackId,
  scheduledNotesRef,
  activeAudioNodesRef,
  audio,
  isPlayingRef,
  playbackStartTimeRef,
}) {
  // ノート追加関数
  const addNote = useCallback(async (pitch, time, duration = 0.25, velocity = 0.8, options = {}) => {
    if (!trackId || !state.isInitialized) return;

    // 🔴 NEW: skipPredictionオプションの取得
    const { skipPrediction = false } = options;

    const newNote = {
      id: Date.now() + Math.random(),
      pitch,
      time,
      duration,
      velocity,
      trackId
    };

    console.log('🎵 useMidiNoteEdit: Adding note', {
      pitch,
      time,
      skipPrediction,
      noteId: newNote.id
    });

    state.setNotes(prev => {
      const updatedNotes = [...prev, newNote];

      // 履歴に保存（同期的に実行）
      persistence.addToHistory(updatedNotes, `Add note ${newNote.id}`);

      return updatedNotes;
    });

    // 音声再生（即座に再生）
    if (state.audioEnabled && audio) {
      const result = await audio.playNote(pitch, Math.min(duration, 2), velocity);
    }

    // 再生中の場合、リアルタイムでスケジュール
    if (state.isPlaying && isPlayingRef.current) {
      const currentTime = state.currentTime;
      const noteStartTime = newNote.time;

      // ノートが現在の再生位置より後にある場合、スケジュール
      if (noteStartTime > currentTime) {
        const playbackStartTime = playbackStartTimeRef.current;
        const scheduledNoteStartTime = playbackStartTime + noteStartTime;
        const scheduledNoteEndTime = scheduledNoteStartTime + newNote.duration;

        // ノート開始をスケジュール
        const startDelay = Math.max(0, (scheduledNoteStartTime - (audio ? audio.getCurrentTime() : 0)) * 1000);
        const startTimeout = setTimeout(async () => {
          if (!isPlayingRef.current) return;

          const result = audio ? await audio.playScheduledNote(newNote.pitch, scheduledNoteStartTime, newNote.duration, newNote.velocity) : null;
          if (result) {
            state.setPlaybackNotes(prev => new Set([...prev, newNote.id]));
            activeAudioNodesRef.current.set(newNote.id, {
              oscillator: result.oscillator,
              gainNode: result.gainNode,
              filter: result.filter,
              endTime: result.endTime
            });
          }
        }, startDelay);

        // ノート終了をスケジュール
        const endDelay = Math.max(0, (scheduledNoteEndTime - (audio ? audio.getCurrentTime() : 0)) * 1000);
        const endTimeout = setTimeout(() => {
          if (!isPlayingRef.current) return;

          state.setPlaybackNotes(prev => {
            const newSet = new Set(prev);
            newSet.delete(newNote.id);
            return newSet;
          });
          activeAudioNodesRef.current.delete(newNote.id);
        }, endDelay);

        // スケジュール情報を保存
        scheduledNotesRef.current.set(newNote.id, { startTimeout, endTimeout });
      }
    }

    state.setLastInputTime(Date.now());

    // 🔴 NEW: skipPrediction=trueの場合は予測生成をスキップ
    if (!skipPrediction && ghostText && ghostText.processMidiInput) {
      ghostText.processMidiInput(newNote);
      console.log('🎵 useMidiNoteEdit: Ghost Text prediction triggered');
    } else if (skipPrediction) {
      console.log('🎵 useMidiNoteEdit: Ghost Text prediction skipped (skipPrediction=true)');
    }
    
    // 親コンポーネントに即座に通知
    if (onNoteAdd) onNoteAdd(newNote);
    
    // 親コンポーネントにMIDIデータ更新を通知
    setTimeout(() => {
      if (onMidiDataUpdate) {
        const currentNotes = state.notes;
        const updateData = {
          notes: [...currentNotes, newNote],
          trackId: trackId,
          lastModified: new Date().toISOString(),
          metadata: {
            modified: new Date().toISOString(),
            noteCount: currentNotes.length + 1
          },
          settings: {
            channel: 0,
            octave: 0,
            transpose: 0,
            velocity: 100
          }
        };
        onMidiDataUpdate(updateData);
      }
    }, 0);
  }, [trackId, state.audioEnabled, onNoteAdd, state.notes, persistence, state.isInitialized, ghostText, state.isPlaying, audio, isPlayingRef, playbackStartTimeRef, scheduledNotesRef, activeAudioNodesRef, state.setNotes, state.setLastInputTime, state.setPlaybackNotes]);

  // ノート削除関数
  const removeNote = useCallback((noteId) => {
    if (!trackId || !state.isInitialized) return;
    
    state.setNotes(prev => {
      const updatedNotes = prev.filter(note => note.id !== noteId);
      
      // 履歴に保存（同期的に実行）
      persistence.addToHistory(updatedNotes, `Remove note ${noteId}`);
      
      return updatedNotes;
    });
    
    // 再生中のスケジュールをクリア
    if (scheduledNotesRef.current.has(noteId)) {
      const { startTimeout, endTimeout } = scheduledNotesRef.current.get(noteId);
      if (startTimeout) clearTimeout(startTimeout);
      if (endTimeout) clearTimeout(endTimeout);
      scheduledNotesRef.current.delete(noteId);
      
      console.log('🎵 Cleared scheduled note:', noteId);
    }
    
    // 再生中のオーディオノードを停止
    if (activeAudioNodesRef.current.has(noteId)) {
      const audioNodes = activeAudioNodesRef.current.get(noteId);
      if (audioNodes.oscillator) {
        audioNodes.oscillator.stop();
      }
      if (audioNodes.gainNode) {
        audioNodes.gainNode.gain.cancelScheduledValues(0);
        audioNodes.gainNode.gain.setValueAtTime(audioNodes.gainNode.gain.value, 0);
        audioNodes.gainNode.gain.linearRampToValueAtTime(0, 0.1);
      }
      activeAudioNodesRef.current.delete(noteId);
      
      console.log('🎵 Stopped playing note:', noteId);
    }
    
    // 選択状態からも削除
    state.setSelectedNotes(prev => {
      const newSet = new Set(prev);
      newSet.delete(noteId);
      return newSet;
    });
    state.setNeedsRedraw(true);
    
    // 親コンポーネントに即座に通知
    if (onNoteRemove) onNoteRemove(noteId);
    
    // 親コンポーネントにMIDIデータ更新を通知
    setTimeout(() => {
      if (onMidiDataUpdate) {
        const currentNotes = state.notes.filter(note => note.id !== noteId);
        const updateData = {
          notes: currentNotes,
          trackId: trackId,
          lastModified: new Date().toISOString(),
          metadata: {
            modified: new Date().toISOString(),
            noteCount: currentNotes.length
          },
          settings: {
            channel: 0,
            octave: 0,
            transpose: 0,
            velocity: 100
          }
        };
        onMidiDataUpdate(updateData);
      }
    }, 0);
  }, [trackId, onNoteRemove, persistence, state.isInitialized, scheduledNotesRef, activeAudioNodesRef, state.setNotes, state.setSelectedNotes, state.setNeedsRedraw, onMidiDataUpdate, state.notes]);

  // ノート編集関数
  const editNote = useCallback((noteId, changes) => {
    if (!trackId || !state.isInitialized) return;
    
    state.setNotes(prev => {
      const updatedNotes = prev.map(note => 
        note.id === noteId ? { ...note, ...changes } : note
      );
      
      // 履歴に保存（同期的に実行）
      persistence.addToHistory(updatedNotes, `Edit note ${noteId}`);
      
      return updatedNotes;
    });
    
    // 編集後のノートをMagentaに送信
    const editedNote = state.notes.find(note => note.id === noteId);
    if (editedNote && ghostText && ghostText.processMidiInput) {
      ghostText.processMidiInput({ ...editedNote, ...changes });
    }
    
    // 親コンポーネントに即座に通知
    if (onNoteEdit) onNoteEdit(noteId, changes);
    
    // 親コンポーネントにMIDIデータ更新を通知
    setTimeout(() => {
      if (onMidiDataUpdate) {
        const currentNotes = state.notes.map(note => 
          note.id === noteId ? { ...note, ...changes } : note
        );
        const updateData = {
          notes: currentNotes,
          trackId: trackId,
          lastModified: new Date().toISOString(),
          metadata: {
            modified: new Date().toISOString(),
            noteCount: currentNotes.length
          },
          settings: {
            channel: 0,
            octave: 0,
            transpose: 0,
            velocity: 100
          }
        };
        onMidiDataUpdate(updateData);
      }
    }, 0);
  }, [trackId, onNoteEdit, persistence, state.isInitialized, ghostText, state.notes, state.setNotes, onMidiDataUpdate]);

  // ノートドラッグ終了処理
  const finalizeNoteDrag = useCallback((noteId, changes) => {
    if (!trackId || !state.isInitialized) return;
    
    state.setNotes(prev => {
      const updatedNotes = prev.map(note => 
        note.id === noteId ? { ...note, ...changes } : note
      );
      
      // 履歴に保存（同期的に実行）
      persistence.addToHistory(updatedNotes, `Drag note ${noteId}`);
      
      return updatedNotes;
    });
    
    // ドラッグ後のノートをMagentaに送信
    const draggedNote = state.notes.find(note => note.id === noteId);
    if (draggedNote && ghostText && ghostText.processMidiInput) {
      ghostText.processMidiInput({ ...draggedNote, ...changes });
    }
    
    if (onNoteEdit) onNoteEdit(noteId, changes);
  }, [trackId, onNoteEdit, persistence, state.isInitialized, ghostText, state.notes, state.setNotes]);

  // 複数ノートドラッグ終了処理
  const finalizeMultiNoteDrag = useCallback((updatedNotes) => {
    if (!trackId || !state.isInitialized) return;
    
    // Magentaに全ノートの最新状態を送信（代表的なノートを使う）
    if (updatedNotes.length > 0 && ghostText && ghostText.processMidiInput) {
      ghostText.processMidiInput(updatedNotes[updatedNotes.length - 1]);
    }
    
    // 同期的にノート状態を更新（重複チェック付き）
    state.setNotes(prev => {
      // 既に同じ状態の場合は更新をスキップ
      const updatedNotesMap = new Map(updatedNotes.map(note => [note.id, note]));
      const newNotes = prev.map(note => 
        updatedNotesMap.has(note.id) ? updatedNotesMap.get(note.id) : note
      );
      
      // 状態が実際に変更されたかチェック（より厳密な比較）
      const hasChanges = updatedNotes.some(updatedNote => {
        const prevNote = prev.find(note => note.id === updatedNote.id);
        if (!prevNote) return true; // 新しいノート
        return prevNote.time !== updatedNote.time || 
               prevNote.pitch !== updatedNote.pitch ||
               prevNote.duration !== updatedNote.duration ||
               prevNote.velocity !== updatedNote.velocity;
      });
      
      if (!hasChanges) {
        return prev;
      }
      
      // 状態更新後に親コンポーネントに通知
      setTimeout(() => {
        if (onMidiDataUpdate) {
          onMidiDataUpdate({
            notes: newNotes,
            trackId: trackId,
            lastModified: new Date().toISOString(),
            metadata: {
              modified: new Date().toISOString(),
              noteCount: newNotes.length,
              type: 'multi-note-drag'
            },
            settings: {
              channel: 0,
              octave: 0,
              transpose: 0,
              velocity: 100
            }
          });
        } else {
          // フォールバック: 個別のonNoteEditを呼び出す（従来の動作）
          updatedNotes.forEach(note => {
            if (onNoteEdit) onNoteEdit(note.id, { time: note.time, pitch: note.pitch });
          });
        }
      }, 50); // 状態更新の完了を待つ時間を増加
      
      return newNotes;
    });
    
    // 履歴に保存（状態更新後に実行）
    setTimeout(() => {
      // 複数ノートドラッグ中は履歴保存をスキップ（finalizeMultiNoteDragで処理済み）
      if (!state.isDraggingMultipleNotes) {
        persistence.addToHistory(updatedNotes, `Multi-drag ${updatedNotes.length} notes`);
      }
    }, 10);
  }, [trackId, onMidiDataUpdate, onNoteEdit, persistence, state.isInitialized, ghostText, state.setNotes, state.isDraggingMultipleNotes]);

  return { addNote, removeNote, editNote, finalizeNoteDrag, finalizeMultiNoteDrag };
} 