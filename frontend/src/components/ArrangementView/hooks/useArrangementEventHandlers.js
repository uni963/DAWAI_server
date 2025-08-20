import React, { useCallback, useRef, useEffect } from 'react'
import drumTrackManager from '../../../utils/drumTrackManager.js'

export const useArrangementEventHandlers = ({
  tracks,
  arrangementState,
  playbackState,
  audioState,
  projectManager,
  addNewTrack,
  forceRerenderApp,
  onTabChange
}) => {
  const {
    selectedTracks,
    lastSelectedTrack,
    clipboard,
    isSelecting,
    selectionStart,
    isDraggingTrack,
    draggingTrackId,
    isResizing,
    resizingTrackId,
    horizontalScrollPosition,
    trackHeights,
    setSelectedTracks,
    setLastSelectedTrack,
    setClipboard,
    setIsSelecting,
    setSelectionStart,
    setIsDraggingTrack,
    setDraggingTrackId,
    setIsResizing,
    setResizingTrackId,
    setTrackScrollPositions,
    setTrackHeights,
    setHorizontalScrollPosition
  } = arrangementState

  const {
    isPlaying,
    currentTime,
    pixelsPerSecond,
    setCurrentTime
  } = playbackState

  const isPlayingRef = useRef(false)

  // isPlayingRefをisPlayingと同期
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  // トラック選択開始
  const handleTrackSelectStart = useCallback((trackId, event) => {
    event.preventDefault()
    event.stopPropagation()

    const isShiftKey = event.shiftKey
    const isCtrlKey = event.ctrlKey || event.metaKey

    if (isShiftKey && lastSelectedTrack) {
      // 範囲選択
      const lastIndex = tracks.findIndex(t => t.id === lastSelectedTrack)
      const currentIndex = tracks.findIndex(t => t.id === trackId)
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(lastIndex, currentIndex)
        const endIndex = Math.max(lastIndex, currentIndex)
        const rangeTracks = tracks.slice(startIndex, endIndex + 1)
        
        const newSelection = new Set(rangeTracks.map(t => t.id))
        setSelectedTracks(newSelection)
        setLastSelectedTrack(trackId)
      }
    } else if (isCtrlKey) {
      // 個別選択/解除
      const newSelection = new Set(selectedTracks || [])
      if (newSelection.has(trackId)) {
        newSelection.delete(trackId)
      } else {
        newSelection.add(trackId)
      }
      setSelectedTracks(newSelection)
      setLastSelectedTrack(trackId)
    } else {
      // 単一選択
      if (!selectedTracks?.has(trackId)) {
        setSelectedTracks(new Set([trackId]))
        setLastSelectedTrack(trackId)
      }
    }

    setIsSelecting(true)
    setSelectionStart({ x: event.clientX, y: event.clientY })
  }, [tracks, selectedTracks, lastSelectedTrack, setSelectedTracks, setLastSelectedTrack, setIsSelecting, setSelectionStart])

  // トラック選択終了
  const handleTrackSelectEnd = useCallback(() => {
    setIsSelecting(false)
    setSelectionStart(null)
  }, [setIsSelecting, setSelectionStart])

  // 全選択
  const handleSelectAll = useCallback(() => {
    const allTrackIds = tracks.map(track => track.id)
    setSelectedTracks(new Set(allTrackIds))
    setLastSelectedTrack(allTrackIds[allTrackIds.length - 1])
  }, [tracks, setSelectedTracks, setLastSelectedTrack])

  // 選択解除
  const handleDeselectAll = useCallback(() => {
    setSelectedTracks(new Set())
    setLastSelectedTrack(null)
  }, [setSelectedTracks, setLastSelectedTrack])

  // 選択反転
  const handleInvertSelection = useCallback(() => {
    const allTrackIds = tracks.map(track => track.id)
    const newSelection = new Set()
    
    allTrackIds.forEach(id => {
      if (!selectedTracks?.has(id)) {
        newSelection.add(id)
      }
    })
    
    setSelectedTracks(newSelection)
    setLastSelectedTrack(newSelection.size > 0 ? Array.from(newSelection)[newSelection.size - 1] : null)
  }, [tracks, selectedTracks, setSelectedTracks, setLastSelectedTrack])

  // トラックコピー
  const handleCopyTracks = useCallback(() => {
    if (!selectedTracks || selectedTracks.size === 0) return

    const selectedTrackData = tracks.filter(track => selectedTracks.has(track.id))
    
    // ドラムトラックの場合は、drumTrackManagerからデータを取得
    const enhancedTrackData = selectedTrackData.map(track => {
      if (track.subtype === 'drums' && drumTrackManager.hasDrumTrack(track.id)) {
        const drumData = drumTrackManager.getDrumTrack(track.id)
        return {
          ...track,
          drumData: drumData // ドラムデータを含める
        }
      }
      return track
    })
    
    setClipboard({
      type: 'tracks',
      data: enhancedTrackData
    })

    console.log('📋 Copied tracks:', enhancedTrackData.length, 'including drum tracks')
  }, [tracks, selectedTracks, setClipboard])

  // トラック貼り付け
  const handlePasteTracks = useCallback(() => {
    if (!clipboard || clipboard.type !== 'tracks') return

    const pastedTracks = clipboard.data.map(track => {
      const newId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // ドラムトラックの場合は、drumTrackManagerに新しいデータを作成
      if (track.subtype === 'drums' && track.drumData) {
        console.log('🥁 Pasting drum track with data:', newId)
        
        // 新しいドラムトラックを作成
        const newDrumData = drumTrackManager.createDrumTrack(newId)
        if (newDrumData) {
          // 元のドラムデータを新しいトラックにコピー
          drumTrackManager.updateDrumTrack(newId, track.drumData)
          console.log('🥁 Drum track data copied to new track:', newId)
        }
        
        return {
          ...track,
          id: newId,
          name: `${track.name} (コピー)`,
          drumTrackId: newId,
          hasDrumData: true
        }
      }
      
      return {
        ...track,
        id: newId,
        name: `${track.name} (コピー)`
      }
    })

    pastedTracks.forEach(track => {
      addNewTrack(track.type, track.name, track.midiData)
    })

    // 貼り付けたトラックを選択
    const newTrackIds = pastedTracks.map(t => t.id)
    setSelectedTracks(new Set(newTrackIds))
    setLastSelectedTrack(newTrackIds[newTrackIds.length - 1])

    console.log('📋 Pasted tracks:', pastedTracks.length, 'including drum tracks')
  }, [clipboard, addNewTrack, setSelectedTracks, setLastSelectedTrack])

  // トラック削除
  const handleDeleteTracks = useCallback(() => {
    if (!selectedTracks || selectedTracks.size === 0) return

    const selectedTrackData = tracks.filter(track => selectedTracks.has(track.id))
    
    // プロジェクトマネージャーから削除
    selectedTrackData.forEach(track => {
      // ドラムトラックの場合は、drumTrackManagerからも削除
      if (track.subtype === 'drums') {
        console.log('🥁 Deleting drum track from drumTrackManager:', track.id)
        // ドラムトラックが存在する場合のみ削除
        if (drumTrackManager.hasDrumTrack(track.id)) {
          drumTrackManager.deleteDrumTrack(track.id)
        } else {
          console.log('🥁 Drum track not found in manager, skipping deletion:', track.id)
        }
      }
      
      projectManager?.removeTrack(track.id)
    })

    // 選択をクリア
    setSelectedTracks(new Set())
    setLastSelectedTrack(null)

    // アプリ全体を再レンダリング（必要な場合のみ）
    // if (forceRerenderApp) {
    //   forceRerenderApp()
    // }

    // console.log('🗑️ Deleted tracks:', selectedTrackData.length)
  }, [tracks, selectedTracks, projectManager, setSelectedTracks, setLastSelectedTrack])

  // トラックダブルクリック
  const handleTrackDoubleClick = useCallback((trackId, event) => {
    event.preventDefault()
    event.stopPropagation()

    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    // トラックを選択
    setSelectedTracks(new Set([trackId]))
    setLastSelectedTrack(trackId)

    // トラックの詳細を開く（将来的な機能）
    console.log('🔍 Opening track details:', track.name)
  }, [tracks, setSelectedTracks, setLastSelectedTrack])

  // 選択されたトラックを開く
  const handleOpenSelectedTracks = useCallback(() => {
    if (!selectedTracks || selectedTracks.size === 0) return

    const selectedTrackData = tracks.filter(track => selectedTracks.has(track.id))
    
    // 最初の選択されたトラックを開く
    if (selectedTrackData.length > 0) {
      const track = selectedTrackData[0]
      console.log('🔍 Opening selected tracks:', selectedTrackData.length, 'track type:', track.subtype)
      
      // タブを開く処理
      if (onTabChange) {
        // ドラムトラックの場合は専用のタブを開く
        if (track.subtype === 'drums') {
          onTabChange(`drum-${track.id}`)
        } else {
          onTabChange(`midi-${track.id}`)
        }
      }
    }
  }, [tracks, selectedTracks, onTabChange])

  // トラックスクロール
  const handleTrackScroll = useCallback((trackId, event) => {
    const scrollLeft = event.target.scrollLeft
    
    setTrackScrollPositions(prev => {
      const newPositions = new Map(prev || [])
      newPositions.set(trackId, scrollLeft)
      return newPositions
    })
  }, [setTrackScrollPositions])

  // トラックドラッグ開始
  const handleTrackDragStart = useCallback((trackId, event) => {
    event.preventDefault()
    event.stopPropagation()

    if (isPlayingRef.current) return

    setIsDraggingTrack(true)
    setDraggingTrackId(trackId)

    const handleMouseMove = (moveEvent) => {
      // ドラッグ処理（将来的な実装）
    }

    const handleMouseUp = (upEvent) => {
      setIsDraggingTrack(false)
      setDraggingTrackId(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [setIsDraggingTrack, setDraggingTrackId])

  // リサイズ開始
  const handleResizeStart = useCallback((trackId, event) => {
    event.preventDefault()
    event.stopPropagation()

    setIsResizing(true)
    setResizingTrackId(trackId)

    const startY = event.clientY
    const startHeight = trackHeights?.get(trackId) || 60

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY
      const newHeight = Math.max(40, Math.min(200, startHeight + deltaY))

      setTrackHeights(prev => {
        const newHeights = new Map(prev || [])
        newHeights.set(trackId, newHeight)
        return newHeights
      })

      // 強制再レンダリング（必要な場合のみ）
      // if (forceRerenderApp) {
      //   forceRerenderApp()
      // }
    }

    const handleMouseUp = (upEvent) => {
      setIsResizing(false)
      setResizingTrackId(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [trackHeights, setIsResizing, setResizingTrackId, setTrackHeights])

  // キーボードイベント
  const handleKeyPress = useCallback((event) => {
    const isCtrlKey = event.ctrlKey || event.metaKey

    if (isCtrlKey) {
      switch (event.key.toLowerCase()) {
        case 'a':
          event.preventDefault()
          handleSelectAll()
          break
        case 'c':
          event.preventDefault()
          handleCopyTracks()
          break
        case 'v':
          event.preventDefault()
          handlePasteTracks()
          break
        case 'd':
          event.preventDefault()
          handleDeselectAll()
          break
        case 'i':
          event.preventDefault()
          handleInvertSelection()
          break
      }
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      handleDeleteTracks()
    }
  }, [handleSelectAll, handleCopyTracks, handlePasteTracks, handleDeselectAll, handleInvertSelection, handleDeleteTracks])

  // トラック追加
  const handleAddTrack = useCallback((trackType) => {
    console.log('ArrangementView: Adding track with type:', trackType)
    
    // トラックタイプのマッピング
    const trackTypeMap = {
      'piano': { type: 'instrument', subtype: 'piano' },
      'bass': { type: 'instrument', subtype: 'bass' },
      'drums': { type: 'instrument', subtype: 'drums' },
      'lead': { type: 'instrument', subtype: 'synth' },
      'pad': { type: 'instrument', subtype: 'strings' },
      'voiceSynth': { type: 'voiceSynth', subtype: 'diffsinger' }
    }
    
    const mappedType = trackTypeMap[trackType] || { type: 'instrument', subtype: 'piano' }
    
    // ArrangementViewに留まるようにkeepInArrangement=trueを渡す
    const newTrack = addNewTrack(mappedType.type, mappedType.subtype, true)
    
    // ドラムトラックが作成された場合は、drumTrackManagerにデータを登録
    if (mappedType.subtype === 'drums' && newTrack) {
      console.log('🥁 Creating drum track in drumTrackManager:', newTrack.id)
      
      // drumTrackManagerにドラムトラックを作成
      const drumData = drumTrackManager.createDrumTrack(newTrack.id)
      if (drumData) {
        console.log('🥁 Drum track created successfully:', newTrack.id)
        
        // プロジェクトマネージャーにドラムトラックの情報を保存
        if (projectManager) {
          const project = projectManager.getProject()
          if (project) {
            // トラックにドラムトラックの情報を追加
            const updatedTrack = {
              ...newTrack,
              drumTrackId: newTrack.id, // ドラムトラックIDを保存
              hasDrumData: true
            }
            
            // プロジェクトマネージャーでトラックを更新
            projectManager.updateTrack(updatedTrack.id, updatedTrack)
          }
        }
      } else {
        console.error('❌ Failed to create drum track in drumTrackManager:', newTrack.id)
      }
    }
  }, [addNewTrack, projectManager])

  return {
    handleTrackSelectStart,
    handleTrackSelectEnd,
    handleSelectAll,
    handleDeselectAll,
    handleInvertSelection,
    handleCopyTracks,
    handlePasteTracks,
    handleDeleteTracks,
    handleTrackDoubleClick,
    handleOpenSelectedTracks,
    handleTrackScroll,
    handleTrackDragStart,
    handleResizeStart,
    handleKeyPress,
    handleAddTrack
  }
} 