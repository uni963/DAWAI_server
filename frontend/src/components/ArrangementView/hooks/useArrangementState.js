import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_TRACK_HEIGHT } from '../utils/arrangementUtils.js'

export const useArrangementState = (tracks, projectManager) => {
  // 基本状態
  const [trackStates, setTrackStates] = useState(new Map())
  const [selectedTracks, setSelectedTracks] = useState(new Set())
  const [lastSelectedTrack, setLastSelectedTrack] = useState(null) // 最後に選択されたトラック
  const [selectionStart, setSelectionStart] = useState(null) // 範囲選択の開始位置
  const [isSelecting, setIsSelecting] = useState(false) // 範囲選択中かどうか
  const [clipboard, setClipboard] = useState(null)
  
  // スクロール・サイズ関連
  const [trackScrollPositions, setTrackScrollPositions] = useState(new Map()) // トラックのスクロール位置を管理
  const [trackHeights, setTrackHeights] = useState(new Map()) // トラックの高さを管理
  const [horizontalScrollPosition, setHorizontalScrollPosition] = useState(0) // 水平スクロール位置を管理
  
  // ドラッグ・リサイズ関連
  const [isDraggingTrack, setIsDraggingTrack] = useState(false)
  const [draggingTrackId, setDraggingTrackId] = useState(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizingTrackId, setResizingTrackId] = useState(null)
  
  // トラック状態の初期化
  useEffect(() => {
    const newTrackStates = new Map()
    const newTrackScrollPositions = new Map()
    const newTrackHeights = new Map()
    tracks.forEach(track => {
      const trackState = {
        muted: track.muted || false,
        solo: track.solo || false,
        visible: true,
        volume: track.volume || 75,
        pan: track.pan || 0
      }
      newTrackStates.set(track.id, trackState)
      
      // トラックのスクロール位置を初期化
      if (!trackScrollPositions.has(track.id)) {
        newTrackScrollPositions.set(track.id, 0)
      } else {
        newTrackScrollPositions.set(track.id, trackScrollPositions.get(track.id))
      }
      
      // トラックの高さを初期化
      if (!trackHeights.has(track.id)) {
        newTrackHeights.set(track.id, DEFAULT_TRACK_HEIGHT)
      } else {
        newTrackHeights.set(track.id, trackHeights.get(track.id))
      }
    })
    setTrackStates(newTrackStates)
    setTrackScrollPositions(newTrackScrollPositions)
    setTrackHeights(newTrackHeights)
  }, [tracks])

  // トラック状態の更新
  const updateTrackState = useCallback((trackId, updates) => {
    setTrackStates(prev => {
      const newStates = new Map(prev)
      const currentState = newStates.get(trackId) || {}
      newStates.set(trackId, { ...currentState, ...updates })
      return newStates
    })
  }, [])

  // トラック選択処理
  const handleTrackSelection = useCallback((trackId, event) => {
    const newSet = new Set(selectedTracks)
    
    if (event.shiftKey && lastSelectedTrack) {
      // 範囲選択
      const trackIds = tracks.map(t => t.id)
      const lastIndex = trackIds.indexOf(lastSelectedTrack)
      const currentIndex = trackIds.indexOf(trackId)
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)
        
        for (let i = start; i <= end; i++) {
          newSet.add(trackIds[i])
        }
        
        const rangeTracks = trackIds.slice(start, end + 1)
        // console.log('🎵 Range selection:', rangeTracks)
      }
    } else if (event.ctrlKey || event.metaKey) {
      // 複数選択
      if (newSet.has(trackId)) {
        newSet.delete(trackId)
      } else {
        newSet.add(trackId)
      }
      // console.log('🎵 Multi selection:', Array.from(newSet))
    } else {
      // 単一選択
      newSet.clear()
      newSet.add(trackId)
      // console.log('🎵 Single selection:', trackId)
    }
    
    setSelectedTracks(newSet)
    setLastSelectedTrack(trackId)
  }, [tracks, selectedTracks, lastSelectedTrack, setSelectedTracks, setLastSelectedTrack])

  // トラック選択の終了（マウスアップ）
  const handleTrackSelectEnd = useCallback(() => {
    setIsSelecting(false)
    setSelectionStart(null)
  }, [])

  // 全選択
  const handleSelectAll = useCallback(() => {
    const allTrackIds = tracks.map(track => track.id)
    setSelectedTracks(new Set(allTrackIds))
    setLastSelectedTrack(allTrackIds[allTrackIds.length - 1])
  }, [tracks])

  // 選択解除
  const handleDeselectAll = useCallback(() => {
    setSelectedTracks(new Set())
    setLastSelectedTrack(null)
  }, [])

  // 選択の反転
  const handleInvertSelection = useCallback(() => {
    const allTrackIds = tracks.map(track => track.id)
    const newSelection = allTrackIds.filter(id => !selectedTracks.has(id))
    setSelectedTracks(new Set(newSelection))
    setLastSelectedTrack(newSelection[newSelection.length - 1] || null)
  }, [tracks, selectedTracks])

  // トラックスクロール機能
  const handleTrackScroll = useCallback((trackId, event) => {
    const scrollTop = event.target.scrollTop
    setTrackScrollPositions(prev => {
      const newPositions = new Map(prev)
      newPositions.set(trackId, scrollTop)
      return newPositions
    })
  }, [])

  // 水平スクロール同期機能
  const handleHorizontalScroll = useCallback((event) => {
    const scrollLeft = event.target.scrollLeft
    setHorizontalScrollPosition(scrollLeft)
  }, [])

  // トラックドラッグ機能（スクロール用）
  const handleTrackDragStart = useCallback((trackId, event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingTrack(true)
    setDraggingTrackId(trackId)
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    
    // 初期位置を保存
    const startY = event.clientY
    const startScrollTop = trackScrollPositions.get(trackId) || 0
    
    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault()
      moveEvent.stopPropagation()
      
      const deltaY = moveEvent.clientY - startY
      const newScrollTop = Math.max(0, startScrollTop - deltaY)
      
      setTrackScrollPositions(prev => {
        const newPositions = new Map(prev)
        newPositions.set(trackId, newScrollTop)
        return newPositions
      })
    }
    
    const handleMouseUp = (upEvent) => {
      upEvent.preventDefault()
      upEvent.stopPropagation()
      
      setIsDraggingTrack(false)
      setDraggingTrackId(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      document.removeEventListener('mousemove', handleMouseMove, { capture: true })
      document.removeEventListener('mouseup', handleMouseUp, { capture: true })
    }
    
    document.addEventListener('mousemove', handleMouseMove, { passive: false, capture: true })
    document.addEventListener('mouseup', handleMouseUp, { passive: false, capture: true })
  }, [trackScrollPositions])

  // トラックリサイズ機能
  const handleResizeStart = useCallback((trackId, event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsResizing(true)
    setResizingTrackId(trackId)
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    
    // 初期位置を保存
    const startY = event.clientY
    const startHeight = trackHeights.get(trackId) || DEFAULT_TRACK_HEIGHT
    
    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault()
      moveEvent.stopPropagation()
      
      const deltaY = moveEvent.clientY - startY
      const newHeight = Math.max(60, Math.min(400, startHeight + deltaY))
      
      setTrackHeights(prev => {
        const newHeights = new Map(prev)
        newHeights.set(trackId, newHeight)
        return newHeights
      })
    }
    
    const handleMouseUp = (upEvent) => {
      upEvent.preventDefault()
      upEvent.stopPropagation()
      
      setIsResizing(false)
      setResizingTrackId(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      document.removeEventListener('mousemove', handleMouseMove, { capture: true })
      document.removeEventListener('mouseup', handleMouseUp, { capture: true })
    }
    
    document.addEventListener('mousemove', handleMouseMove, { passive: false, capture: true })
    document.addEventListener('mouseup', handleMouseUp, { passive: false, capture: true })
  }, [trackHeights])

  return {
    // 状態
    trackStates,
    selectedTracks,
    lastSelectedTrack,
    selectionStart,
    isSelecting,
    clipboard,
    trackScrollPositions,
    trackHeights,
    horizontalScrollPosition,
    isDraggingTrack,
    draggingTrackId,
    isResizing,
    resizingTrackId,
    
    // 状態更新関数
    setSelectedTracks,
    setLastSelectedTrack,
    setClipboard,
    setIsSelecting,
    setSelectionStart,
    setIsDraggingTrack,
    setDraggingTrackId,
    setIsResizing,
    setResizingTrackId,
    setHorizontalScrollPosition,
    setTrackScrollPositions,
    setTrackHeights,
    
    // トラック状態管理
    updateTrackState,
    
    // 選択管理
    handleTrackSelectStart: handleTrackSelection, // この関数を呼び出す側を変更
    handleTrackSelectEnd,
    handleSelectAll,
    handleDeselectAll,
    handleInvertSelection,
    
    // スクロール管理
    handleTrackScroll,
    handleHorizontalScroll,
    handleTrackDragStart,
    handleResizeStart
  }
} 