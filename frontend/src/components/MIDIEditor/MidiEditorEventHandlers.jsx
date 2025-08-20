import { useCallback, useEffect } from 'react'

const MidiEditorEventHandlers = ({
  // 状態管理
  state,
  
  // 座標変換
  coordinateTransforms,
  
  // 定数
  GRID_HEIGHT,
  GRID_WIDTH,
  PIANO_WIDTH,
  HEADER_HEIGHT,
  NOTE_HEIGHT,
  OCTAVE_RANGE,
  LONG_PRESS_THRESHOLD,
  
  // Refs
  dynamicCanvasRef,
  containerRef,
  longPressTimerRef,
  
  // オーディオ
  audio,
  
  // 操作関数
  addNote,
  finalizeNoteDrag,
  finalizeMultiNoteDrag,
  noteOperations,
  
  // 再生制御
  startPlayback,
  pausePlayback,
  
  // その他
  isActive,
  trackId,
  smoothScrollRef
}) => {
  
  // マウスダウンハンドラー
  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) return
    
    const rect = dynamicCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (x < PIANO_WIDTH) return

    const pitch = coordinateTransforms.yToPitch(y)
    const time = coordinateTransforms.xToTime(x)
    
    if (pitch < OCTAVE_RANGE[0] * 12 || pitch > OCTAVE_RANGE[1] * 12 + 11) return
    if (time < 0 || time > (coordinateTransforms.maxTime || 64)) return
    
    const snappedTime = Math.round(time * 4) / 4
    const snappedPitch = Math.round(pitch)

    const clickedNote = state.notes.find(note => {
      const noteX = coordinateTransforms.timeToX(note.time)
      const noteY = coordinateTransforms.pitchToY(note.pitch)
      const noteWidth = note.duration * GRID_WIDTH * state.zoom
      const noteHeight = NOTE_HEIGHT
      
      return x >= noteX && x <= noteX + noteWidth &&
             y >= noteY && y <= noteY + noteHeight
    })

    // リサイズエリアの判定（ノートの左右端8px）
    const isRightResizeArea = clickedNote && (() => {
      const noteX = coordinateTransforms.timeToX(clickedNote.time)
      const noteWidth = clickedNote.duration * GRID_WIDTH * state.zoom
      const rightResizeAreaStart = noteX + noteWidth - 8
      return x >= rightResizeAreaStart && x <= noteX + noteWidth
    })()
    
    const isLeftResizeArea = clickedNote && (() => {
      const noteX = coordinateTransforms.timeToX(clickedNote.time)
      return x >= noteX && x <= noteX + 8
    })()
    
    const isResizeArea = isRightResizeArea || isLeftResizeArea

    if (clickedNote) {
      // リサイズモードの処理
      if (isResizeArea) {
        state.setSelectedNotes(new Set([clickedNote.id]))
        state.setIsResizingNote(true)
        state.setResizingNote(clickedNote)
        state.setResizeStartX(x)
        state.setResizeStartDuration(clickedNote.duration)
        state.setResizeStartTime(clickedNote.time)
        state.setResizeDirection(isRightResizeArea ? 'right' : 'left')
        state.setNeedsRedraw(true)
        return
      }

      if (e.shiftKey) {
        state.setSelectedNotes(prev => {
          const newSet = new Set(prev)
          if (newSet.has(clickedNote.id)) {
            newSet.delete(clickedNote.id)
          } else {
            newSet.add(clickedNote.id)
          }
          return newSet
        })
        state.setNeedsRedraw(true)
        return
      } else {
        const isAlreadySelected = state.selectedNotes.has(clickedNote.id)
        const hasMultipleSelection = state.selectedNotes.size > 1
        
        if (isAlreadySelected && hasMultipleSelection) {
          const selectedNotesData = state.notes.filter(note => state.selectedNotes.has(note.id))
          state.setDraggedNotes(selectedNotesData.map(note => ({ ...note })))
          state.setDragStartPosition({ x, y })
          state.setDragStartNotes(selectedNotesData.map(note => ({ ...note })))
          state.setIsDraggingMultipleNotes(true)
          state.setDragOffset({ 
            x: x - coordinateTransforms.timeToX(clickedNote.time),
            y: y - coordinateTransforms.pitchToY(clickedNote.pitch)
          })
          state.setDraggedNote({ ...clickedNote, isBaseNote: true })
          
          if (state.audioEnabled) {
            audio.playNote(clickedNote.pitch, 0.1, clickedNote.velocity)
          }
          return
        } else {
          state.setSelectedNotes(new Set([clickedNote.id]))
          state.setNeedsRedraw(true)
          
          state.setDraggedNote(clickedNote)
          state.setDragOffset({ 
            x: x - coordinateTransforms.timeToX(clickedNote.time),
            y: y - coordinateTransforms.pitchToY(clickedNote.pitch)
          })
          state.setIsDraggingNote(true)
          return
        }
      }
    }

    if (!e.shiftKey) {
      state.setSelectedNotes(new Set())
      state.setNeedsRedraw(true)
    } else {
      state.setIsMouseDown(true)
      state.setMouseDownTime(Date.now())
      state.setMouseDownPosition({ 
        x, y, pitch: snappedPitch, time: snappedTime, shiftKey: e.shiftKey 
      })
      return
    }

    if (e.shiftKey) return

    state.setIsMouseDown(true)
    state.setMouseDownTime(Date.now())
    state.setMouseDownPosition({ 
      x, y, pitch: snappedPitch, time: snappedTime, shiftKey: e.shiftKey 
    })

    longPressTimerRef.current = setTimeout(async () => {
      const newNote = {
        id: 'creating-' + Date.now(),
        pitch: snappedPitch,
        time: snappedTime,
        duration: 0.25,
        velocity: 0.8
      }
      state.setCurrentlyCreatingNote(newNote)
      
      if (state.audioEnabled) {
        const result = await audio.playNote(snappedPitch, 0.1, 0.5)
        if (!result) {
          console.error('Failed to play note on long press:', snappedPitch)
        }
      }
    }, LONG_PRESS_THRESHOLD)
  }, [coordinateTransforms, state, audio, noteOperations, GRID_WIDTH, NOTE_HEIGHT, LONG_PRESS_THRESHOLD])

  // マウスムーブハンドラー
  const handleMouseMove = useCallback((e) => {
    if (e.buttons === 4) return
    
    const rect = dynamicCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // カーソル変更処理
    if (!state.isDraggingNote && !state.isResizingNote && !state.isDraggingMultipleNotes) {
      const pitch = coordinateTransforms.yToPitch(y)
      const time = coordinateTransforms.xToTime(x)
      
      if (pitch >= OCTAVE_RANGE[0] * 12 && pitch <= OCTAVE_RANGE[1] * 12 + 11 && 
          time >= 0 && time <= (coordinateTransforms.maxTime || 64)) {
        
        const hoveredNote = state.notes.find(note => {
          const noteX = coordinateTransforms.timeToX(note.time)
          const noteY = coordinateTransforms.pitchToY(note.pitch)
          const noteWidth = note.duration * GRID_WIDTH * state.zoom
          const noteHeight = NOTE_HEIGHT
          
          return x >= noteX && x <= noteX + noteWidth &&
                 y >= noteY && y <= noteY + noteHeight
        })

        if (hoveredNote) {
          const noteX = coordinateTransforms.timeToX(hoveredNote.time)
          const noteWidth = hoveredNote.duration * GRID_WIDTH * state.zoom
          const rightResizeAreaStart = noteX + noteWidth - 8
          const leftResizeAreaEnd = noteX + 8
          
          if ((x >= rightResizeAreaStart && x <= noteX + noteWidth) || 
              (x >= noteX && x <= leftResizeAreaEnd)) {
            // リサイズエリアにカーソルがある場合
            dynamicCanvasRef.current.style.cursor = 'ew-resize'
          } else {
            // ノートの中央部分にカーソルがある場合
            dynamicCanvasRef.current.style.cursor = 'pointer'
          }
        } else {
          // ノートがない場所
          dynamicCanvasRef.current.style.cursor = 'default'
        }
      } else {
        dynamicCanvasRef.current.style.cursor = 'default'
      }
    }

    // リサイズ処理
    if (state.isResizingNote && state.resizingNote) {
      const deltaX = x - state.resizeStartX
      const deltaTime = deltaX / (GRID_WIDTH * state.zoom)
      
      if (state.resizeDirection === 'right') {
        // 右端リサイズ（duration変更）
        const newDuration = Math.max(0.25, state.resizeStartDuration + deltaTime)
        const snappedDuration = Math.round(newDuration * 4) / 4
        
        state.setResizingNote(prev => ({
          ...prev,
          duration: snappedDuration
        }))
      } else {
        // 左端リサイズ（time変更）
        const newTime = Math.max(0, state.resizeStartTime + deltaTime)
        const snappedTime = Math.round(newTime * 4) / 4
        const newDuration = Math.max(0.25, state.resizeStartDuration - deltaTime)
        const snappedDuration = Math.round(newDuration * 4) / 4
        
        state.setResizingNote(prev => ({
          ...prev,
          time: snappedTime,
          duration: snappedDuration
        }))
      }
      
      state.setNeedsRedraw(true)
      return
    }

    if (state.isDraggingNote && state.draggedNote) {
      const newTime = coordinateTransforms.xToTime(x - state.dragOffset.x)
      const newPitch = coordinateTransforms.yToPitch(y - state.dragOffset.y)
      
      const clampedTime = Math.max(0, Math.min((coordinateTransforms.maxTime || 64) - state.draggedNote.duration, newTime))
      const clampedPitch = Math.max(OCTAVE_RANGE[0] * 12, Math.min(OCTAVE_RANGE[1] * 12 + 11, newPitch))
      
      const snappedTime = Math.round(clampedTime * 4) / 4
      const snappedPitch = Math.round(clampedPitch)
      
      state.setDraggedNote(prev => ({
        ...prev,
        time: snappedTime,
        pitch: snappedPitch
      }))
      
      state.setNeedsRedraw(true)
      return
    }

    if (state.isDraggingMultipleNotes && state.draggedNotes.length > 0 && state.dragStartNotes.length > 0 && state.draggedNote && state.draggedNote.isBaseNote) {
      const newTime = coordinateTransforms.xToTime(x - state.dragOffset.x)
      const newPitch = coordinateTransforms.yToPitch(y - state.dragOffset.y)
      
      const baseNoteOriginal = state.dragStartNotes.find(note => note.id === state.draggedNote.id)
      if (!baseNoteOriginal) return
      
      const timeOffset = newTime - baseNoteOriginal.time
      const pitchOffset = newPitch - baseNoteOriginal.pitch
      
      const updatedNotes = state.dragStartNotes.map(note => {
        const newNoteTime = note.time + timeOffset
        const newNotePitch = note.pitch + pitchOffset
        
        const clampedTime = Math.max(0, Math.min((coordinateTransforms.maxTime || 64) - note.duration, newNoteTime))
        const clampedPitch = Math.max(OCTAVE_RANGE[0] * 12, Math.min(OCTAVE_RANGE[1] * 12 + 11, newNotePitch))
        
        const snappedTime = Math.round(clampedTime * 4) / 4
        const snappedPitch = Math.round(clampedPitch)
        
        return {
          ...note,
          time: snappedTime,
          pitch: snappedPitch
        }
      })
      
      state.setDraggedNotes(updatedNotes)
      state.setNeedsRedraw(true)
      return
    }

    if (state.isMouseDown && state.mouseDownPosition && state.mouseDownPosition.shiftKey) {
      const currentTime = coordinateTransforms.xToTime(x)
      const currentPitch = coordinateTransforms.yToPitch(y)
      
      const startTime = Math.min(state.mouseDownPosition.time, currentTime)
      const endTime = Math.max(state.mouseDownPosition.time, currentTime)
      const startPitch = Math.min(state.mouseDownPosition.pitch, currentPitch)
      const endPitch = Math.max(state.mouseDownPosition.pitch, currentPitch)
      
      state.setSelectionBox({
        startTime, endTime, startPitch, endPitch
      })
      
      const notesInRange = state.notes.filter(note => {
        const noteEndTime = note.time + note.duration
        return note.time <= endTime && noteEndTime >= startTime &&
               note.pitch >= startPitch && note.pitch <= endPitch
      })
      
      const noteIdsInRange = notesInRange.map(note => note.id)
      state.setSelectedNotes(new Set(noteIdsInRange))
      state.setNeedsRedraw(true)
      return
    }

    if (!state.isMouseDown || !state.currentlyCreatingNote) return

    const mouseTime = coordinateTransforms.xToTime(x)
    const duration = Math.max(0.25, mouseTime - state.currentlyCreatingNote.time)
    state.setCurrentlyCreatingNote(prev => ({
      ...prev,
      duration: Math.round(duration * 4) / 4
    }))
    
    state.setNeedsRedraw(true)
  }, [state, coordinateTransforms, OCTAVE_RANGE])

  // マウスアップハンドラー
  const handleMouseUp = useCallback((e) => {
    if (e.button === 2) return
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // カーソルをリセット
    if (dynamicCanvasRef.current) {
      dynamicCanvasRef.current.style.cursor = 'default'
    }

    if (state.isDraggingMultipleNotes && state.draggedNotes.length > 0) {
      finalizeMultiNoteDrag(state.draggedNotes)
      
      state.setDraggedNotes([])
      state.setDragStartNotes([])
      state.setDraggedNote(null)
      state.setIsDraggingMultipleNotes(false)
      state.setDragOffset({ x: 0, y: 0 })
      state.setNeedsRedraw(true)
      return
    }

    // リサイズ終了処理
    if (state.isResizingNote && state.resizingNote) {
      if (state.resizeDirection === 'right') {
        finalizeNoteDrag(state.resizingNote.id, {
          duration: state.resizingNote.duration
        })
      } else {
        finalizeNoteDrag(state.resizingNote.id, {
          time: state.resizingNote.time,
          duration: state.resizingNote.duration
        })
      }
      
      state.setResizingNote(null)
      state.setIsResizingNote(false)
      state.setResizeStartX(0)
      state.setResizeStartDuration(0)
      state.setResizeStartTime(0)
      state.setResizeDirection(null)
      state.setNeedsRedraw(true)
      return
    }

    if (state.isDraggingNote && state.draggedNote) {
      finalizeNoteDrag(state.draggedNote.id, {
        time: state.draggedNote.time,
        pitch: state.draggedNote.pitch
      })
      
      state.setDraggedNote(null)
      state.setIsDraggingNote(false)
      state.setDragOffset({ x: 0, y: 0 })
      state.setNeedsRedraw(true)
      return
    }

    if (state.currentlyCreatingNote) {
      addNote(
        state.currentlyCreatingNote.pitch,
        state.currentlyCreatingNote.time,
        state.currentlyCreatingNote.duration,
        state.currentlyCreatingNote.velocity
      )
      state.setCurrentlyCreatingNote(null)
    } else if (state.isMouseDown && state.mouseDownPosition) {
      const clickDuration = Date.now() - state.mouseDownTime
      if (clickDuration < LONG_PRESS_THRESHOLD) {
        addNote(state.mouseDownPosition.pitch, state.mouseDownPosition.time)
      }
    }

    state.setIsMouseDown(false)
    state.setMouseDownTime(0)
    state.setMouseDownPosition(null)
    state.setSelectionBox(null)
    state.setNeedsRedraw(true)
  }, [state, finalizeNoteDrag, finalizeMultiNoteDrag, addNote, LONG_PRESS_THRESHOLD])

  // タイムラインクリックハンドラー
  const handleTimelineClick = useCallback((e) => {
    if (e.button === 2) return
    
    const rect = dynamicCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // タイムライン領域のクリックを確実に検出
    if (y < HEADER_HEIGHT && x >= PIANO_WIDTH) {
      const time = coordinateTransforms.xToTime(x)
      const clampedTime = Math.max(0, Math.min(coordinateTransforms.maxTime || 64, time))
      
      // タイムラインクリック位置を設定
      state.setTimelineClickPosition(clampedTime)
      
      // 現在の再生位置を即座に更新
      state.setCurrentTime(clampedTime)
      
      // 状態更新を確実にするため、少し遅延して再度設定
      setTimeout(() => {
        state.setCurrentTime(clampedTime)
        state.setNeedsRedraw(true)
      }, 10)
      
      // 再生中の場合は一時停止
      if (state.isPlaying) {
        pausePlayback()
      }
      
      // 再生ヘッドを即座に表示するため、強制的に再描画
      state.setNeedsRedraw(true)
      
      // 即座に再描画を強制実行
      requestAnimationFrame(() => {
        state.setNeedsRedraw(true)
        
        // さらに次のフレームでも再描画を確実にする
        requestAnimationFrame(() => {
          state.setNeedsRedraw(true)
        })
      })
      
      // オーディオエンジンの再生位置も更新
      if (audio && audio.getCurrentTime) {
        try {
          // オーディオエンジンが利用可能な場合のみ更新
          const audioTime = audio.getCurrentTime()
          if (typeof audioTime === 'number' && isFinite(audioTime)) {
            // オーディオエンジンの再生位置を更新（必要に応じて）
            console.log('Audio time updated to:', clampedTime)
          }
        } catch (error) {
          console.warn('Failed to update audio time:', error)
        }
      }
    }
  }, [coordinateTransforms, state, pausePlayback, HEADER_HEIGHT, PIANO_WIDTH, audio])

  // コンテキストメニュー表示
  const showContextMenu = useCallback((e, note, selectedNoteIds = null) => {
    const existingMenu = document.querySelector('.midi-context-menu')
    if (existingMenu) {
      document.body.removeChild(existingMenu)
    }
    
    const effectiveSelectedNotes = selectedNoteIds || Array.from(state.selectedNotes)
    const currentSelectionCount = effectiveSelectedNotes.length
    
    // メニューの位置を調整（画面の端で切れないように）
    const menuWidth = 160
    const menuHeight = 120 // 概算
    const padding = 10
    
    let left = e.clientX
    let top = e.clientY
    
    // 右端で切れる場合
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding
    }
    
    // 下端で切れる場合
    if (top + menuHeight > window.innerHeight - padding) {
      top = window.innerHeight - menuHeight - padding
    }
    
    // 左端で切れる場合
    if (left < padding) {
      left = padding
    }
    
    // 上端で切れる場合
    if (top < padding) {
      top = padding
    }
    
    const menu = document.createElement('div')
    menu.className = 'midi-context-menu'
    menu.tabIndex = -1
    
    menu.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      background: #1f2937;
      border: 1px solid #4b5563;
      border-radius: 8px;
      padding: 6px 0;
      z-index: 9999;
      font-size: 13px;
      color: #f9fafb;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
      min-width: 160px;
      display: block;
      visibility: visible;
      opacity: 0;
      pointer-events: auto;
      backdrop-filter: blur(8px);
      transform: scale(0.95);
      transition: opacity 0.15s ease, transform 0.15s ease;
    `
    
    menu.addEventListener('mousedown', e => e.preventDefault())
    menu.addEventListener('mouseup', e => e.preventDefault())
    menu.addEventListener('contextmenu', e => e.preventDefault())
    
    // アニメーション効果を適用
    requestAnimationFrame(() => {
      menu.style.opacity = '1'
      menu.style.transform = 'scale(1)'
    })
    
    // アイコン用のSVG
    const createIcon = (svgPath) => {
      const icon = document.createElement('span')
      icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>`
      icon.style.cssText = 'margin-right: 8px; opacity: 0.8;'
      return icon
    }
    
    const createMenuItem = (text, iconSvg, onClick, isDestructive = false, shortcut = null) => {
      const item = document.createElement('div')
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 500;
        ${isDestructive ? 'color: #ef4444;' : ''}
      `
      
      const leftContent = document.createElement('div')
      leftContent.style.cssText = 'display: flex; align-items: center;'
      
      const icon = createIcon(iconSvg)
      leftContent.appendChild(icon)
      
      const textSpan = document.createElement('span')
      textSpan.textContent = text
      leftContent.appendChild(textSpan)
      
      item.appendChild(leftContent)
      
      if (shortcut) {
        const shortcutSpan = document.createElement('span')
        shortcutSpan.textContent = shortcut
        shortcutSpan.style.cssText = `
          font-size: 11px;
          color: #9ca3af;
          font-weight: 400;
          margin-left: 12px;
        `
        item.appendChild(shortcutSpan)
      }
      
      item.onmouseenter = () => {
        item.style.background = isDestructive ? '#dc2626' : '#374151'
        item.style.color = isDestructive ? '#ffffff' : '#f9fafb'
      }
      item.onmouseleave = () => {
        item.style.background = 'transparent'
        item.style.color = isDestructive ? '#ef4444' : '#f9fafb'
      }
      item.onclick = onClick
      
      return item
    }
    
    const copyBtn = createMenuItem(
      currentSelectionCount > 1 ? `コピー (${currentSelectionCount}個)` : 'コピー',
      '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
      () => {
        if (effectiveSelectedNotes.length > 0) {
          noteOperations.copySelectedNotes(effectiveSelectedNotes)
        }
        // アニメーション効果を適用してから削除
        menu.style.opacity = '0'
        menu.style.transform = 'scale(0.95)'
        setTimeout(() => {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu)
          }
        }, 150)
        document.removeEventListener('click', closeMenu)
        document.removeEventListener('contextmenu', closeMenu)
        document.removeEventListener('keydown', handleEsc)
      },
      false,
      'Ctrl+C'
    )
    
    const cutBtn = createMenuItem(
      currentSelectionCount > 1 ? `カット (${currentSelectionCount}個)` : 'カット',
      '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10h-6l-2 8h10l-2-8z"/>',
      () => {
        if (effectiveSelectedNotes.length > 0) {
          noteOperations.cutSelectedNotes(effectiveSelectedNotes)
        }
        // アニメーション効果を適用してから削除
        menu.style.opacity = '0'
        menu.style.transform = 'scale(0.95)'
        setTimeout(() => {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu)
          }
        }, 150)
        document.removeEventListener('click', closeMenu)
        document.removeEventListener('contextmenu', closeMenu)
        document.removeEventListener('keydown', handleEsc)
      },
      false,
      'Ctrl+X'
    )
    
    const deleteBtn = createMenuItem(
      currentSelectionCount > 1 ? `削除 (${currentSelectionCount}個)` : '削除',
      '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
      () => {
        if (effectiveSelectedNotes.length > 0) {
          noteOperations.deleteSelectedNotes(effectiveSelectedNotes)
        }
        // アニメーション効果を適用してから削除
        menu.style.opacity = '0'
        menu.style.transform = 'scale(0.95)'
        setTimeout(() => {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu)
          }
        }, 150)
        document.removeEventListener('click', closeMenu)
        document.removeEventListener('contextmenu', closeMenu)
        document.removeEventListener('keydown', handleEsc)
      },
      true, // destructive
      'Delete'
    )
    
    const closeMenu = (event) => {
      if (!menu.contains(event.target)) {
        const menuElement = document.querySelector('.midi-context-menu')
        if (menuElement && document.body.contains(menuElement)) {
          // アニメーション効果を適用してから削除
          menuElement.style.opacity = '0'
          menuElement.style.transform = 'scale(0.95)'
          setTimeout(() => {
            if (document.body.contains(menuElement)) {
              document.body.removeChild(menuElement)
            }
          }, 150)
        }
        document.removeEventListener('click', closeMenu)
        document.removeEventListener('contextmenu', closeMenu)
        document.removeEventListener('keydown', handleEsc)
        if (containerRef.current) {
          containerRef.current.focus()
        }
      }
    }
    
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        const menuElement = document.querySelector('.midi-context-menu')
        if (menuElement && document.body.contains(menuElement)) {
          // アニメーション効果を適用してから削除
          menuElement.style.opacity = '0'
          menuElement.style.transform = 'scale(0.95)'
          setTimeout(() => {
            if (document.body.contains(menuElement)) {
              document.body.removeChild(menuElement)
            }
          }, 150)
        }
        document.removeEventListener('click', closeMenu)
        document.removeEventListener('contextmenu', closeMenu)
        document.removeEventListener('keydown', handleEsc)
        if (containerRef.current) {
          containerRef.current.focus()
        }
      }
    }

    menu.appendChild(copyBtn)
    menu.appendChild(cutBtn)
    menu.appendChild(deleteBtn)
    document.body.appendChild(menu)
    menu.focus()
    
    document.addEventListener('click', closeMenu)
    document.addEventListener('contextmenu', closeMenu)
    document.addEventListener('keydown', handleEsc)
  }, [noteOperations, state.selectedNotes, containerRef])

  // Pasteメニュー表示
  const showPasteMenu = useCallback((e, pasteTime, pastePitch) => {
    const existingMenu = document.querySelector('.midi-context-menu')
    if (existingMenu) {
      document.body.removeChild(existingMenu)
    }
    
    // メニューの位置を調整（画面の端で切れないように）
    const menuWidth = 160
    const menuHeight = 140 // 概算
    const padding = 10
    
    let left = e.clientX
    let top = e.clientY
    
    // 右端で切れる場合
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding
    }
    
    // 下端で切れる場合
    if (top + menuHeight > window.innerHeight - padding) {
      top = window.innerHeight - menuHeight - padding
    }
    
    // 左端で切れる場合
    if (left < padding) {
      left = padding
    }
    
    // 上端で切れる場合
    if (top < padding) {
      top = padding
    }
    
    const menu = document.createElement('div')
    menu.className = 'midi-context-menu'
    menu.tabIndex = -1
    
    menu.addEventListener('mousedown', e => e.preventDefault())
    menu.addEventListener('mouseup', e => e.preventDefault())
    menu.addEventListener('contextmenu', e => e.preventDefault())
    
    menu.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      background: #1f2937;
      border: 1px solid #4b5563;
      border-radius: 8px;
      padding: 6px 0;
      z-index: 9999;
      font-size: 13px;
      color: #f9fafb;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
      min-width: 160px;
      display: block;
      visibility: visible;
      opacity: 0;
      pointer-events: auto;
      backdrop-filter: blur(8px);
      transform: scale(0.95);
      transition: opacity 0.15s ease, transform 0.15s ease;
    `
    
    // アニメーション効果を適用
    requestAnimationFrame(() => {
      menu.style.opacity = '1'
      menu.style.transform = 'scale(1)'
    })
    
    // アイコン用のSVG
    const createIcon = (svgPath) => {
      const icon = document.createElement('span')
      icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>`
      icon.style.cssText = 'margin-right: 8px; opacity: 0.8;'
      return icon
    }
    
    const createMenuItem = (text, iconSvg, onClick, shortcut = null) => {
      const item = document.createElement('div')
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 500;
      `
      
      const leftContent = document.createElement('div')
      leftContent.style.cssText = 'display: flex; align-items: center;'
      
      const icon = createIcon(iconSvg)
      leftContent.appendChild(icon)
      
      const textSpan = document.createElement('span')
      textSpan.textContent = text
      leftContent.appendChild(textSpan)
      
      item.appendChild(leftContent)
      
      if (shortcut) {
        const shortcutSpan = document.createElement('span')
        shortcutSpan.textContent = shortcut
        shortcutSpan.style.cssText = `
          font-size: 11px;
          color: #9ca3af;
          font-weight: 400;
          margin-left: 12px;
        `
        item.appendChild(shortcutSpan)
      }
      
      item.onmouseenter = () => {
        item.style.background = '#374151'
        item.style.color = '#f9fafb'
      }
      item.onmouseleave = () => {
        item.style.background = 'transparent'
        item.style.color = '#f9fafb'
      }
      item.onclick = onClick
      
      return item
    }
    
    const pasteBtn = createMenuItem(
      `貼り付け (${window.midiClipboardData.notes.length}個のノート)`,
      '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
      () => {
        noteOperations.pasteNotes(pasteTime, pastePitch)
        // アニメーション効果を適用してから削除
        menu.style.opacity = '0'
        menu.style.transform = 'scale(0.95)'
        setTimeout(() => {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu)
          }
        }, 150)
        document.removeEventListener('click', closePasteMenu)
        document.removeEventListener('contextmenu', closePasteMenu)
        document.removeEventListener('keydown', handlePasteEsc)
      },
      'Ctrl+V'
    )
    
    const pasteHereBtn = createMenuItem(
      'ここに貼り付け',
      '<path d="M9 12l2 2 4-4"/><path d="M21 12c-1 0-2-1-2-2V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v5c0 1-1 2-2 2"/>',
      () => {
        noteOperations.pasteNotes(pasteTime, pastePitch)
        // アニメーション効果を適用してから削除
        menu.style.opacity = '0'
        menu.style.transform = 'scale(0.95)'
        setTimeout(() => {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu)
          }
        }, 150)
        document.removeEventListener('click', closePasteMenu)
        document.removeEventListener('contextmenu', closePasteMenu)
        document.removeEventListener('keydown', handlePasteEsc)
      }
    )
    
    const pasteEndBtn = createMenuItem(
      '最後に貼り付け',
      '<path d="M9 12l2 2 4-4"/><path d="M21 12c-1 0-2-1-2-2V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v5c0 1-1 2-2 2"/>',
      () => {
        noteOperations.pasteNotes(null, null)
        // アニメーション効果を適用してから削除
        menu.style.opacity = '0'
        menu.style.transform = 'scale(0.95)'
        setTimeout(() => {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu)
          }
        }, 150)
        document.removeEventListener('click', closePasteMenu)
        document.removeEventListener('contextmenu', closePasteMenu)
        document.removeEventListener('keydown', handlePasteEsc)
      }
    )
    
    menu.appendChild(pasteBtn)
    menu.appendChild(pasteHereBtn)
    menu.appendChild(pasteEndBtn)
    document.body.appendChild(menu)
    menu.focus()
    
    const closePasteMenu = (event) => {
      if (!menu.contains(event.target)) {
        if (document.body.contains(menu)) {
          // アニメーション効果を適用してから削除
          menu.style.opacity = '0'
          menu.style.transform = 'scale(0.95)'
          setTimeout(() => {
            if (document.body.contains(menu)) {
              document.body.removeChild(menu)
            }
          }, 150)
        }
        document.removeEventListener('click', closePasteMenu)
        document.removeEventListener('contextmenu', closePasteMenu)
        document.removeEventListener('keydown', handlePasteEsc)
      }
    }
    const handlePasteEsc = (event) => {
      if (event.key === 'Escape') {
        if (document.body.contains(menu)) {
          // アニメーション効果を適用してから削除
          menu.style.opacity = '0'
          menu.style.transform = 'scale(0.95)'
          setTimeout(() => {
            if (document.body.contains(menu)) {
              document.body.removeChild(menu)
            }
          }, 150)
        }
        document.removeEventListener('click', closePasteMenu)
        document.removeEventListener('contextmenu', closePasteMenu)
        document.removeEventListener('keydown', handlePasteEsc)
      }
    }
    document.addEventListener('click', closePasteMenu)
    document.addEventListener('contextmenu', closePasteMenu)
    document.addEventListener('keydown', handlePasteEsc)
  }, [noteOperations])

  // キャンバス右クリックハンドラー
  const handleCanvasRightClick = useCallback((e) => {
    try {
      e.preventDefault()
    } catch (error) {
      console.warn('preventDefault failed in passive event listener:', error);
    }
    const rect = dynamicCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (x < PIANO_WIDTH) return

    const clickedNote = state.notes.find(note => {
      const noteX = coordinateTransforms.timeToX(note.time)
      const noteY = coordinateTransforms.pitchToY(note.pitch)
      const noteWidth = note.duration * GRID_WIDTH * state.zoom
      const noteHeight = NOTE_HEIGHT
      
      return x >= noteX && x <= noteX + noteWidth &&
             y >= noteY && y <= noteY + noteHeight
    })

    if (clickedNote) {
      const isAlreadySelected = state.selectedNotes.has(clickedNote.id)
      const hasMultipleSelection = state.selectedNotes.size > 1
      
      if (!isAlreadySelected) {
        const newSelection = new Set([clickedNote.id])
        state.setSelectedNotes(newSelection)
        state.setNeedsRedraw(true)
        setTimeout(() => {
          showContextMenu(e, clickedNote, Array.from(state.selectedNotes))
        }, 10)
      } else {
        setTimeout(() => {
          showContextMenu(e, clickedNote, Array.from(state.selectedNotes))
        }, 10)
      }
    } else {
      state.setSelectedNotes(new Set())
      state.setNeedsRedraw(true)
      
      if (window.midiClipboardData && window.midiClipboardData.notes && window.midiClipboardData.notes.length > 0) {
        const pasteTime = coordinateTransforms.xToTime(x)
        const pastePitch = coordinateTransforms.yToPitch(y)
        setTimeout(() => {
          showPasteMenu(e, pasteTime, pastePitch)
        }, 10)
      }
    }
  }, [state, coordinateTransforms, showContextMenu, showPasteMenu, GRID_WIDTH, NOTE_HEIGHT, PIANO_WIDTH])

  // キーボードイベントハンドラー
  useEffect(() => {
    const handleKeyDown = async (e) => {
      const isInMidiEditor = containerRef.current?.contains(e.target) || 
                           e.target.closest('.midi-editor-container')
      
      const isInAIAssistant = e.target.closest('.ai-assistant-container') ||
                             e.target.closest('.ai-chat-box') ||
                             e.target.closest('.ai-input-area') ||
                             e.target.closest('.ai-message-input') ||
                             e.target.closest('.ai-settings-panel')
      
      if (!isInMidiEditor || 
          e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' || 
          e.target.tagName === 'BUTTON' ||
          isInAIAssistant ||
          !isActive) {
        return
      }
      
      switch (e.key) {
        case 'Tab':
          try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
          // acceptGhostPrediction(0) - これは親コンポーネントで処理
          break
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
            // undoLastAction() - これは親コンポーネントで処理
          }
          break
        case 'c':
          if (e.ctrlKey || e.metaKey) {
            try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
            noteOperations.copySelectedNotes()
          }
          break
        case 'x':
          if (e.ctrlKey || e.metaKey) {
            try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
            noteOperations.cutSelectedNotes()
          }
          break
        case 'v':
          if (e.ctrlKey || e.metaKey) {
            try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
            noteOperations.pasteNotes()
          }
          break
        case 'Delete':
        case 'Backspace':
          try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
          noteOperations.deleteSelectedNotes()
          break
        case '1':
        case '2':
        case '3':
          try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
          // acceptGhostPrediction(index) - これは親コンポーネントで処理
          break
        case 'g':
          try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
          // toggleGhostText() - これは親コンポーネントで処理
          break
        case 'Escape':
          try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
          state.setSelectedNotes(new Set())
          // ghostTextEngine.clearPrediction() - これは親コンポーネントで処理
          break
        case ' ':
          try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
          if (state.isPlaying) {
            pausePlayback()
          } else {
            if (state.timelineClickPosition !== null) {
              state.setCurrentTime(state.timelineClickPosition)
              state.setNeedsRedraw(true)
            }
            await startPlayback()
          }
          break
        case 'Home':
          try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
          state.setCurrentTime(0)
          state.setNeedsRedraw(true)
          break
        case 'End':
          try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
          const maxTime = state.notes.length > 0 ? Math.max(...state.notes.map(n => n.time + n.duration)) : 64
          state.setCurrentTime(maxTime)
          state.setNeedsRedraw(true)
          break
        case 'ArrowLeft':
          try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
          if (smoothScrollRef.current) {
            smoothScrollRef.current(Math.max(0, state.scrollX - 100), state.scrollY, 200)
          } else {
            state.setScrollX(prev => Math.max(0, prev - 100))
            state.setNeedsRedraw(true)
          }
          break
        case 'ArrowRight':
          try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
          if (smoothScrollRef.current) {
            smoothScrollRef.current(state.scrollX + 100, state.scrollY, 200)
          } else {
            state.setScrollX(prev => prev + 100)
            state.setNeedsRedraw(true)
          }
          break
        case 'ArrowUp':
          try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
          if (smoothScrollRef.current) {
            smoothScrollRef.current(state.scrollX, Math.max(0, state.scrollY - 50), 200)
          } else {
            state.setScrollY(prev => Math.max(0, prev - 50))
            state.setNeedsRedraw(true)
          }
          break
        case 'ArrowDown':
          try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
          if (smoothScrollRef.current) {
            smoothScrollRef.current(state.scrollX, Math.min(coordinateTransforms.maxScrollY, state.scrollY + 50), 200)
          } else {
            state.setScrollY(prev => Math.min(coordinateTransforms.maxScrollY, prev + 50))
            state.setNeedsRedraw(true)
          }
          break
        default:
          return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state, noteOperations, startPlayback, pausePlayback, isActive, coordinateTransforms.maxScrollY])

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTimelineClick,
    handleCanvasRightClick
  }
}

export default MidiEditorEventHandlers 