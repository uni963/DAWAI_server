import { useCallback, useRef } from 'react'

/**
 * MIDI Note Operations Management Hook
 * CRUD操作、ドラッグ&ドロップ機能を管理
 */
const useMidiNoteOperations = (notes, setNotes, trackId, isInitialized, persistence, currentTime = 0, selectedNotes, setSelectedNotes) => {
  // ドラッグ関連の状態
  const isDraggingNoteRef = useRef(false)
  const draggedNoteRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  
  // 複数ノートドラッグ用の状態
  const isDraggingMultipleNotesRef = useRef(false)
  const draggedNotesRef = useRef([])
  const dragStartPositionRef = useRef({ x: 0, y: 0 })
  const dragStartNotesRef = useRef([])
  
  // 選択関連の状態（useMidiEditorStateから受け取る）
  const selectionBoxRef = useRef(null)
  
  // ノート作成関連
  const currentlyCreatingNoteRef = useRef(null)
  const mouseDownTimeRef = useRef(0)
  const mouseDownPositionRef = useRef(null)
  
  /**
   * 新しいノートを作成
   */
  const createNote = useCallback((time, pitch, duration = 1, velocity = 0.7) => {
    if (!isInitialized) return null
    
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      time: time,
      pitch: pitch,
      duration: duration,
      velocity: velocity,
      trackId: trackId
    }
    
    console.log('useMidiNoteOperations: Creating new note', {
      trackId,
      note: newNote
    })
    
    return newNote
  }, [trackId, isInitialized])
  
  /**
   * ノートを追加
   */
  const addNote = useCallback((note) => {
    if (!isInitialized || !note) return
    
    setNotes(prev => {
      const updatedNotes = [...prev, note]
      console.log('useMidiNoteOperations: Note added', {
        trackId,
        noteId: note.id,
        totalNotes: updatedNotes.length
      })
      return updatedNotes
    })
    
    // 履歴に保存
    persistence.addToHistory([...notes, note], `Add note ${note.id}`)
  }, [notes, setNotes, trackId, isInitialized, persistence])
  
  /**
   * ノートを更新
   */
  const updateNote = useCallback((noteId, updates) => {
    if (!isInitialized) return
    
    setNotes(prev => {
      const updatedNotes = prev.map(note => 
        note.id === noteId ? { ...note, ...updates } : note
      )
      
      console.log('useMidiNoteOperations: Note updated', {
        trackId,
        noteId,
        updates,
        totalNotes: updatedNotes.length
      })
      
      return updatedNotes
    })
    
    // 履歴に保存
    const updatedNotes = notes.map(note => 
      note.id === noteId ? { ...note, ...updates } : note
    )
    persistence.addToHistory(updatedNotes, `Update note ${noteId}`)
  }, [notes, setNotes, trackId, isInitialized, persistence])
  
  /**
   * ノートを削除
   */
  const deleteNote = useCallback((noteId) => {
    if (!isInitialized) return
    
    setNotes(prev => {
      const updatedNotes = prev.filter(note => note.id !== noteId)
      
      console.log('useMidiNoteOperations: Note deleted', {
        trackId,
        noteId,
        totalNotes: updatedNotes.length
      })
      
      return updatedNotes
    })
    
    // 履歴に保存
    const updatedNotes = notes.filter(note => note.id !== noteId)
    persistence.addToHistory(updatedNotes, `Delete note ${noteId}`)
  }, [notes, setNotes, trackId, isInitialized, persistence])
  
  /**
   * 複数ノートを削除
   */
  const deleteMultipleNotes = useCallback((noteIds) => {
    if (!isInitialized || !noteIds.length) return
    
    setNotes(prev => {
      const updatedNotes = prev.filter(note => !noteIds.includes(note.id))
      
      console.log('useMidiNoteOperations: Multiple notes deleted', {
        trackId,
        noteIds,
        deletedCount: noteIds.length,
        totalNotes: updatedNotes.length
      })
      
      return updatedNotes
    })
    
    // 履歴に保存
    const updatedNotes = notes.filter(note => !noteIds.includes(note.id))
    persistence.addToHistory(updatedNotes, `Delete ${noteIds.length} notes`)
  }, [notes, setNotes, trackId, isInitialized, persistence])
  
  /**
   * ノートを選択
   */
  const selectNote = useCallback((noteId, addToSelection = false) => {
    if (!addToSelection) {
      setSelectedNotes(new Set([noteId]))
    } else {
      setSelectedNotes(prev => {
        const newSet = new Set(prev)
        newSet.add(noteId)
        return newSet
      })
    }
    
    console.log('useMidiNoteOperations: Note selected', {
      trackId,
      noteId,
      addToSelection,
      selectedCount: addToSelection ? selectedNotes.size + 1 : 1
    })
  }, [trackId, selectedNotes, setSelectedNotes])
  
  /**
   * 複数ノートを選択
   */
  const selectMultipleNotes = useCallback((noteIds, addToSelection = false) => {
    if (!addToSelection) {
      setSelectedNotes(new Set(noteIds))
    } else {
      setSelectedNotes(prev => {
        const newSet = new Set(prev)
        noteIds.forEach(id => newSet.add(id))
        return newSet
      })
    }
    
    console.log('useMidiNoteOperations: Multiple notes selected', {
      trackId,
      noteIds,
      addToSelection,
      selectedCount: noteIds.length
    })
  }, [trackId, setSelectedNotes])
  
  /**
   * 選択をクリア
   */
  const clearSelection = useCallback(() => {
    setSelectedNotes(new Set())
    selectionBoxRef.current = null
    
    console.log('useMidiNoteOperations: Selection cleared', { trackId })
  }, [trackId, setSelectedNotes])
  
  /**
   * 選択されたノートを取得
   */
  const getSelectedNotes = useCallback(() => {
    return Array.from(selectedNotes)
  }, [selectedNotes])
  
  /**
   * 選択されたノートのデータを取得
   */
  const getSelectedNotesData = useCallback(() => {
    return notes.filter(note => selectedNotes.has(note.id))
  }, [notes, selectedNotes])
  
  /**
   * ノートのドラッグ開始
   */
  const startNoteDrag = useCallback((noteId, mouseX, mouseY, noteX, noteY) => {
    if (!isInitialized) return
    
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    
    isDraggingNoteRef.current = true
    draggedNoteRef.current = note
    dragOffsetRef.current = {
      x: mouseX - noteX,
      y: mouseY - noteY
    }
    
    console.log('useMidiNoteOperations: Note drag started', {
      trackId,
      noteId,
      mouseX,
      mouseY,
      noteX,
      noteY
    })
  }, [notes, trackId, isInitialized])
  
  /**
   * 複数ノートのドラッグ開始
   */
  const startMultipleNotesDrag = useCallback((noteIds, mouseX, mouseY) => {
    if (!isInitialized) return
    
    const selectedNotes = notes.filter(note => noteIds.includes(note.id))
    if (!selectedNotes.length) return
    
    isDraggingMultipleNotesRef.current = true
    draggedNotesRef.current = selectedNotes
    dragStartPositionRef.current = { x: mouseX, y: mouseY }
    dragStartNotesRef.current = selectedNotes.map(note => ({ ...note }))
    
    console.log('useMidiNoteOperations: Multiple notes drag started', {
      trackId,
      noteIds,
      mouseX,
      mouseY,
      noteCount: selectedNotes.length
    })
  }, [notes, trackId, isInitialized])
  
  /**
   * ノートのドラッグ更新
   */
  const updateNoteDrag = useCallback((mouseX, mouseY, timeScale, pitchScale) => {
    if (!isDraggingNoteRef.current || !draggedNoteRef.current) return
    
    const note = draggedNoteRef.current
    const offset = dragOffsetRef.current
    
    const newTime = (mouseX - offset.x) * timeScale
    const newPitch = (mouseY - offset.y) * pitchScale
    
    // ノートを更新
    updateNote(note.id, {
      time: Math.max(0, newTime),
      pitch: Math.max(0, Math.min(127, newPitch))
    })
    
    console.log('useMidiNoteOperations: Note drag updated', {
      trackId,
      noteId: note.id,
      newTime,
      newPitch
    })
  }, [updateNote, trackId])
  
  /**
   * 複数ノートのドラッグ更新
   */
  const updateMultipleNotesDrag = useCallback((mouseX, mouseY, timeScale, pitchScale) => {
    if (!isDraggingMultipleNotesRef.current || !draggedNotesRef.current.length) return
    
    const startPos = dragStartPositionRef.current
    const startNotes = dragStartNotesRef.current
    
    const deltaX = mouseX - startPos.x
    const deltaY = mouseY - startPos.y
    
    const timeDelta = deltaX * timeScale
    const pitchDelta = deltaY * pitchScale
    
    // 全ノートを更新
    const updatedNotes = notes.map(note => {
      const startNote = startNotes.find(n => n.id === note.id)
      if (!startNote) return note
      
      return {
        ...note,
        time: Math.max(0, startNote.time + timeDelta),
        pitch: Math.max(0, Math.min(127, startNote.pitch + pitchDelta))
      }
    })
    
    setNotes(updatedNotes)
    
    console.log('useMidiNoteOperations: Multiple notes drag updated', {
      trackId,
      timeDelta,
      pitchDelta,
      noteCount: draggedNotesRef.current.length
    })
  }, [notes, setNotes, trackId])
  
  /**
   * ドラッグ終了
   */
  const endNoteDrag = useCallback(() => {
    if (isDraggingNoteRef.current) {
      console.log('useMidiNoteOperations: Note drag ended', {
        trackId,
        noteId: draggedNoteRef.current?.id
      })
      
      isDraggingNoteRef.current = false
      draggedNoteRef.current = null
      dragOffsetRef.current = { x: 0, y: 0 }
    }
    
    if (isDraggingMultipleNotesRef.current) {
      console.log('useMidiNoteOperations: Multiple notes drag ended', {
        trackId,
        noteCount: draggedNotesRef.current.length
      })
      
      // 履歴に保存
      persistence.addToHistory(notes, `Drag ${draggedNotesRef.current.length} notes`)
      
      isDraggingMultipleNotesRef.current = false
      draggedNotesRef.current = []
      dragStartPositionRef.current = { x: 0, y: 0 }
      dragStartNotesRef.current = []
    }
  }, [notes, trackId, persistence])
  
  /**
   * ノート作成開始
   */
  const startNoteCreation = useCallback((time, pitch) => {
    if (!isInitialized) return
    
    mouseDownTimeRef.current = time
    mouseDownPositionRef.current = { x: time, y: pitch }
    currentlyCreatingNoteRef.current = { time, pitch }
    
    console.log('useMidiNoteOperations: Note creation started', {
      trackId,
      time,
      pitch
    })
  }, [trackId, isInitialized])
  
  /**
   * ノート作成更新
   */
  const updateNoteCreation = useCallback((time, pitch) => {
    if (!currentlyCreatingNoteRef.current) return
    
    currentlyCreatingNoteRef.current = {
      time: Math.min(mouseDownTimeRef.current, time),
      pitch: pitch,
      duration: Math.abs(time - mouseDownTimeRef.current)
    }
    
    console.log('useMidiNoteOperations: Note creation updated', {
      trackId,
      currentNote: currentlyCreatingNoteRef.current
    })
  }, [trackId])
  
  /**
   * ノート作成完了
   */
  const finishNoteCreation = useCallback(() => {
    if (!currentlyCreatingNoteRef.current) return
    
    const note = createNote(
      currentlyCreatingNoteRef.current.time,
      currentlyCreatingNoteRef.current.pitch,
      Math.max(0.1, currentlyCreatingNoteRef.current.duration),
      0.7
    )
    
    if (note) {
      addNote(note)
    }
    
    currentlyCreatingNoteRef.current = null
    mouseDownTimeRef.current = 0
    mouseDownPositionRef.current = null
    
    console.log('useMidiNoteOperations: Note creation finished', {
      trackId,
      noteId: note?.id
    })
  }, [createNote, addNote, trackId])
  
  /**
   * ノート作成キャンセル
   */
  const cancelNoteCreation = useCallback(() => {
    currentlyCreatingNoteRef.current = null
    mouseDownTimeRef.current = 0
    mouseDownPositionRef.current = null
    
    console.log('useMidiNoteOperations: Note creation cancelled', { trackId })
  }, [trackId])
  
  /**
   * 選択範囲の設定
   */
  const setSelectionBox = useCallback((box) => {
    selectionBoxRef.current = box
  }, [])
  
  /**
   * 選択範囲内のノートを取得
   */
  const getNotesInSelectionBox = useCallback((box) => {
    if (!box) return []
    
    return notes.filter(note => {
      const noteStart = note.time
      const noteEnd = note.time + note.duration
      const notePitch = note.pitch
      
      return (
        noteStart < box.endTime &&
        noteEnd > box.startTime &&
        notePitch >= box.startPitch &&
        notePitch <= box.endPitch
      )
    })
  }, [notes])
  
  /**
   * ノートの複製
   */
  const duplicateNote = useCallback((noteId, timeOffset = 1) => {
    if (!isInitialized) return
    
    const originalNote = notes.find(note => note.id === noteId)
    if (!originalNote) return
    
    const newNote = createNote(
      originalNote.time + timeOffset,
      originalNote.pitch,
      originalNote.duration,
      originalNote.velocity
    )
    
    if (newNote) {
      addNote(newNote)
    }
    
    console.log('useMidiNoteOperations: Note duplicated', {
      trackId,
      originalId: noteId,
      newId: newNote?.id,
      timeOffset
    })
  }, [notes, createNote, addNote, trackId, isInitialized])
  
  /**
   * 複数ノートの複製
   */
  const duplicateMultipleNotes = useCallback((noteIds, timeOffset = 1) => {
    if (!isInitialized || !noteIds.length) return
    
    const originalNotes = notes.filter(note => noteIds.includes(note.id))
    const newNotes = originalNotes.map(note => 
      createNote(
        note.time + timeOffset,
        note.pitch,
        note.duration,
        note.velocity
      )
    ).filter(Boolean)
    
    newNotes.forEach(note => addNote(note))
    
    console.log('useMidiNoteOperations: Multiple notes duplicated', {
      trackId,
      originalIds: noteIds,
      newIds: newNotes.map(n => n.id),
      timeOffset
    })
  }, [notes, createNote, addNote, trackId, isInitialized])

  /**
   * 選択されたノートをコピー
   */
  const copySelectedNotes = useCallback((selectedNoteIds = null) => {
    const effectiveSelectedNotes = selectedNoteIds || getSelectedNotes()
    if (effectiveSelectedNotes.length === 0) return
    
    const selectedNotesData = notes.filter(note => effectiveSelectedNotes.includes(note.id))
    const copyData = {
      notes: selectedNotesData,
      timestamp: Date.now()
    }
    
    // クリップボードにコピー（簡易実装）
    navigator.clipboard.writeText(JSON.stringify(copyData)).then(() => {
      console.log('useMidiNoteOperations: Notes copied to clipboard', { count: selectedNotesData.length })
      // グローバルにコピーデータを保存（Paste用）
      window.midiClipboardData = copyData
    }).catch(err => {
      console.error('Failed to copy notes:', err)
    })
  }, [notes, getSelectedNotes])

  /**
   * 選択されたノートを削除
   */
  const deleteSelectedNotes = useCallback((selectedNoteIds = null) => {
    const effectiveSelectedNotes = selectedNoteIds || getSelectedNotes()
    if (effectiveSelectedNotes.length === 0 || !isInitialized) return
    
    console.log('useMidiNoteOperations: Deleting selected notes', { 
      count: effectiveSelectedNotes.length,
      isInitialized 
    })
    
    deleteMultipleNotes(effectiveSelectedNotes)
    clearSelection()
  }, [getSelectedNotes, deleteMultipleNotes, clearSelection, isInitialized])

  /**
   * 選択されたノートをカット
   */
  const cutSelectedNotes = useCallback((selectedNoteIds = null) => {
    const effectiveSelectedNotes = selectedNoteIds || getSelectedNotes()
    if (effectiveSelectedNotes.length === 0) return
    
    // まずコピー
    copySelectedNotes(effectiveSelectedNotes)
    
    // 次に削除
    deleteSelectedNotes(effectiveSelectedNotes)
  }, [getSelectedNotes, copySelectedNotes, deleteSelectedNotes])

  /**
   * クリップボードからノートを貼り付け
   */
  const pasteNotes = useCallback((pasteTime = null, pastePitch = null) => {
    if (!window.midiClipboardData || !window.midiClipboardData.notes || !isInitialized) {
      console.log('useMidiNoteOperations: No clipboard data to paste or not initialized')
      return
    }
    
    const clipboardNotes = window.midiClipboardData.notes
    console.log('useMidiNoteOperations: Pasting notes', { 
      count: clipboardNotes.length,
      isInitialized 
    })
    
    // 貼り付け位置を決定
    let baseTime = pasteTime
    let basePitch = pastePitch
    
    if (baseTime === null) {
      // 貼り付け位置が指定されていない場合は、現在の再生位置または最後のノートの後
      baseTime = currentTime
      if (notes.length > 0) {
        const lastNoteEnd = Math.max(...notes.map(n => n.time + n.duration))
        baseTime = Math.max(baseTime, lastNoteEnd)
      }
    }
    
    if (basePitch === null) {
      // 貼り付け音程が指定されていない場合は、元のノートの最低音程を基準にする
      const minPitch = Math.min(...clipboardNotes.map(n => n.pitch))
      basePitch = minPitch
    }
    
    // 元のノートの最低音程との差分を計算
    const pitchOffset = basePitch - Math.min(...clipboardNotes.map(n => n.pitch))
    
    // 新しいノートを作成
    const newNotes = clipboardNotes.map(note => 
      createNote(
        note.time + (baseTime - Math.min(...clipboardNotes.map(n => n.time))),
        note.pitch + pitchOffset,
        note.duration,
        note.velocity
      )
    ).filter(Boolean)
    
    console.log('useMidiNoteOperations: Created new notes for paste', { 
      count: newNotes.length, 
      baseTime, 
      basePitch,
      pitchOffset 
    })
    
    // ノートを追加
    newNotes.forEach(note => addNote(note))
    
    // 貼り付けたノートを選択
    selectMultipleNotes(newNotes.map(note => note.id))
    
    console.log('useMidiNoteOperations: Notes pasted successfully')
  }, [notes, createNote, addNote, selectMultipleNotes, isInitialized, currentTime])

  /**
   * トラックの再読み込み
   */
  const reloadTrack = useCallback(() => {
    if (!isInitialized) return
    
    console.log('useMidiNoteOperations: Reloading track', { trackId, isInitialized })
    
    // 履歴をクリア
    persistence.clearHistory()
    
    // 選択をクリア
    clearSelection()
    
    console.log('useMidiNoteOperations: Track reloaded', { trackId })
  }, [trackId, isInitialized, persistence, clearSelection])
  
  return {
    // 基本CRUD操作
    createNote,
    addNote,
    updateNote,
    deleteNote,
    deleteMultipleNotes,
    
    // 選択操作
    selectNote,
    selectMultipleNotes,
    clearSelection,
    getSelectedNotes,
    getSelectedNotesData,
    
    // ドラッグ操作
    startNoteDrag,
    startMultipleNotesDrag,
    updateNoteDrag,
    updateMultipleNotesDrag,
    endNoteDrag,
    
    // ノート作成
    startNoteCreation,
    updateNoteCreation,
    finishNoteCreation,
    cancelNoteCreation,
    
    // 選択範囲
    setSelectionBox,
    getNotesInSelectionBox,
    
    // 複製操作
    duplicateNote,
    duplicateMultipleNotes,
    
    // クリップボード操作
    copySelectedNotes,
    cutSelectedNotes,
    deleteSelectedNotes,
    pasteNotes,
    
    // トラック操作
    reloadTrack,
    
    // 状態取得
    isDraggingNote: () => isDraggingNoteRef.current,
    isDraggingMultipleNotes: () => isDraggingMultipleNotesRef.current,
    getDraggedNote: () => draggedNoteRef.current,
    getDraggedNotes: () => draggedNotesRef.current,
    getCurrentlyCreatingNote: () => currentlyCreatingNoteRef.current,
    getSelectionBox: () => selectionBoxRef.current
  }
}

export default useMidiNoteOperations 