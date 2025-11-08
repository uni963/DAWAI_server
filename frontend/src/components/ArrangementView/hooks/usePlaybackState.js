import { useState, useEffect, useCallback } from 'react'

export const usePlaybackState = (projectManager, tracks) => {
  // 再生状態
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(30000) // 初期値を30秒に設定
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const [lastClickPosition, setLastClickPosition] = useState(null) // 最後にクリックした位置
  
  // 表示・ズーム関連
  const [pixelsPerSecond, setPixelsPerSecond] = useState(100)
  const [snapToGrid, setSnapToGrid] = useState(true) // グリッドスナップ機能
  
  // ループ・メトロノーム関連
  const [metronomeEnabled, setMetronomeEnabled] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [loopStart, setLoopStart] = useState(0)
  const [loopEnd, setLoopEnd] = useState(30)
  
  // 画面サイズ関連
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  
  // 総再生時間の計算（プロジェクトマネージャーから取得）
  useEffect(() => {
    if (projectManager?.getProject()?.settings?.duration) {
      const projectDuration = projectManager.getProject().settings.duration * 1000 // 秒からミリ秒に変換
      setTotalDuration(projectDuration)
    } else {
      // プロジェクトに設定がない場合は、トラックの最大長を計算
      let maxDuration = 0
      tracks.forEach(track => {
        if (track.midiData && track.midiData.notes && track.midiData.notes.length > 0) {
          const trackDuration = Math.max(...track.midiData.notes.map(note => note.start + note.duration))
          maxDuration = Math.max(maxDuration, trackDuration)
        }
      })
      // 最低30秒は表示（タイムラインが見やすくなるように）
      setTotalDuration(Math.max(maxDuration, 30000))
    }
  }, [tracks, projectManager])

  // 画面サイズの監視
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // playbackPositionは必要に応じて手動で更新（UIでは直接currentTime * pixelsPerSecondを使用）

  // 曲の長さを設定する関数
  const handleSetDuration = useCallback((newDurationSeconds) => {
    const newDurationMs = newDurationSeconds * 1000
    setTotalDuration(newDurationMs)
    
    // プロジェクトマネージャーに保存
    if (projectManager) {
      projectManager.updateProjectSettings({
        duration: newDurationSeconds
      })
    }
  }, [projectManager])

  // スキップ機能
  const handleSkipBack = useCallback((audioState) => {
    const newTime = Math.max(0, currentTime - 5)
    setCurrentTime(newTime)
    setPlaybackPosition(newTime * pixelsPerSecond)
    setLastClickPosition(newTime) // 最後にクリックした位置も更新
    
    // オーディオエンジンの再生位置を更新
    if (audioState.audioEngineRef.current) {
      audioState.audioEngineRef.current.setCurrentTime(newTime)
    }
    
    // 再生中の場合は再生タイマーを新しい位置から再開
    if (audioState.isPlayingRef.current) {
      audioState.startPlaybackTimer(newTime, setCurrentTime, setPlaybackPosition, loopEnabled, loopEnd, loopStart, () => audioState.handleStop(setIsPlaying, setCurrentTime, setPlaybackPosition))
    }
  }, [currentTime, pixelsPerSecond, loopEnabled, loopEnd, loopStart, setIsPlaying, setCurrentTime, setPlaybackPosition])

  const handleSkipForward = useCallback((audioState) => {
    const newTime = Math.min(totalDuration / 1000, currentTime + 5)
    setCurrentTime(newTime)
    setPlaybackPosition(newTime * pixelsPerSecond)
    setLastClickPosition(newTime) // 最後にクリックした位置も更新
    
    // オーディオエンジンの再生位置を更新
    if (audioState.audioEngineRef.current) {
      audioState.audioEngineRef.current.setCurrentTime(newTime)
    }
    
    // 再生中の場合は再生タイマーを新しい位置から再開
    if (audioState.isPlayingRef.current) {
      audioState.startPlaybackTimer(newTime, setCurrentTime, setPlaybackPosition, loopEnabled, loopEnd, loopStart, () => audioState.handleStop(setIsPlaying, setCurrentTime, setPlaybackPosition))
    }
  }, [currentTime, totalDuration, pixelsPerSecond, loopEnabled, loopEnd, loopStart, setIsPlaying, setCurrentTime, setPlaybackPosition])

  // ループ機能
  const handleLoopToggle = useCallback(() => {
    setLoopEnabled(!loopEnabled)
  }, [loopEnabled])

  // メトロノーム機能
  const handleMetronomeToggle = useCallback((audioState) => {
    setMetronomeEnabled(!metronomeEnabled)
    if (audioState.audioEngineRef.current) {
      audioState.audioEngineRef.current.setMetronomeEnabled(!metronomeEnabled)
    }
  }, [metronomeEnabled])

  // 再生速度変更
  const handlePlaybackRateChange = useCallback((rate, audioState) => {
    setPlaybackRate(rate)
    if (audioState.unifiedAudioSystem && audioState.unifiedAudioSystem.setPlaybackRate) {
      console.log('🎵 [PlaybackState] Setting playback rate:', rate)
      audioState.unifiedAudioSystem.setPlaybackRate(rate)
    } else {
      console.warn('⚠️ [PlaybackState] Unified Audio System not available for playback rate change')
    }
  }, [])

  // タイムライン上でのクリック
  const handleTimelineClick = useCallback((event, timelineRef, bpm, timeSignature, audioState) => {
    if (!timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    // 水平スクロール位置を考慮したクリック位置の計算
    const clickX = event.clientX - rect.left + window.horizontalScrollPosition || 0
    const newTime = clickX / pixelsPerSecond

    // 再生中の場合は一旦停止
    const wasPlaying = audioState.isPlayingRef.current
    if (wasPlaying) {
      audioState.handlePause(setIsPlaying)
    }

    // グリッドスナップ機能
    if (snapToGrid) {
      const secondsPerBeat = 60 / bpm
      const [beatsPerBar] = timeSignature.split('/').map(Number)
      const secondsPerBar = secondsPerBeat * beatsPerBar
      
      // グリッド間隔を決定（ズームレベルに応じて、より細かい間隔を提供）
      let gridInterval
      if (pixelsPerSecond >= 800) gridInterval = secondsPerBeat / 16  // 64分音符
      else if (pixelsPerSecond >= 400) gridInterval = secondsPerBeat / 8  // 32分音符
      else if (pixelsPerSecond >= 200) gridInterval = secondsPerBeat / 4  // 16分音符
      else if (pixelsPerSecond >= 100) gridInterval = secondsPerBeat / 2  // 8分音符
      else if (pixelsPerSecond >= 50) gridInterval = secondsPerBeat  // 4分音符
      else if (pixelsPerSecond >= 25) gridInterval = secondsPerBar  // 1小節
      else gridInterval = secondsPerBar * 2  // 2小節
      
      // 最小間隔を0.025秒に制限（より細かい操作を可能にする）
      gridInterval = Math.max(gridInterval, 0.025)
      
      // 最も近いグリッド位置にスナップ
      const snappedTime = Math.round(newTime / gridInterval) * gridInterval
      const finalTime = Math.max(0, snappedTime)
      setCurrentTime(finalTime)
      setPlaybackPosition(finalTime * pixelsPerSecond)
      setLastClickPosition(finalTime)
      
      // オーディオエンジンの再生位置も更新
      if (audioState.audioEngineRef.current) {
        audioState.audioEngineRef.current.setCurrentTime(finalTime)
      }
    } else {
      const finalTime = Math.max(0, newTime)
      setCurrentTime(finalTime)
      setPlaybackPosition(finalTime * pixelsPerSecond)
      setLastClickPosition(finalTime)
      
      // オーディオエンジンの再生位置も更新
      if (audioState.audioEngineRef.current) {
        audioState.audioEngineRef.current.setCurrentTime(finalTime)
      }
    }

  }, [pixelsPerSecond, snapToGrid, setIsPlaying, setCurrentTime, setPlaybackPosition, setLastClickPosition])

  // 再生バーのドラッグ開始
  const handlePlaybackHeadDragStart = useCallback((event, timelineRef, bpm, timeSignature, audioState) => {
    event.preventDefault()
    event.stopPropagation()
    
    // 再生中の場合、一時停止
    if (audioState.isPlayingRef.current) {
      audioState.handlePause(setIsPlaying)
    }
    
    const handleMouseMove = (moveEvent) => {
      const rect = timelineRef.current?.getBoundingClientRect()
      if (!rect) return
      
      // 水平スクロール位置を考慮したマウス位置の計算
      const mouseX = moveEvent.clientX - rect.left + (window.horizontalScrollPosition || 0)
      const newTime = Math.max(0, mouseX / pixelsPerSecond)
      
      // グリッドスナップ機能
      if (snapToGrid) {
        const secondsPerBeat = 60 / bpm
        const [beatsPerBar] = timeSignature.split('/').map(Number)
        const secondsPerBar = secondsPerBeat * beatsPerBar
        
        let gridInterval
        if (pixelsPerSecond >= 800) gridInterval = secondsPerBeat / 16  // 64分音符
        else if (pixelsPerSecond >= 400) gridInterval = secondsPerBeat / 8  // 32分音符
        else if (pixelsPerSecond >= 200) gridInterval = secondsPerBeat / 4  // 16分音符
        else if (pixelsPerSecond >= 100) gridInterval = secondsPerBeat / 2  // 8分音符
        else if (pixelsPerSecond >= 50) gridInterval = secondsPerBeat  // 4分音符
        else if (pixelsPerSecond >= 25) gridInterval = secondsPerBar  // 1小節
        else gridInterval = secondsPerBar * 2  // 2小節
        
        // 最小間隔を0.025秒に制限（より細かい操作を可能にする）
        gridInterval = Math.max(gridInterval, 0.025)
        
        const snappedTime = Math.round(newTime / gridInterval) * gridInterval
        setCurrentTime(snappedTime)
        setPlaybackPosition(snappedTime * pixelsPerSecond)
      } else {
        setCurrentTime(newTime)
        setPlaybackPosition(newTime * pixelsPerSecond)
      }
    }
    
    const handleMouseUp = (upEvent) => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      
      // オーディオエンジンの再生位置を更新
      if (audioState.audioEngineRef.current) {
        audioState.audioEngineRef.current.setCurrentTime(currentTime)
      }
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [pixelsPerSecond, snapToGrid, currentTime, setIsPlaying, setCurrentTime, setPlaybackPosition])

  // 画面サイズに応じたトラックエリア幅の計算
  const availableWidth = windowWidth - 192 - 32 // 192px（トラック情報パネル）+ 32px（余白）
  const minTrackAreaWidth = Math.max(800, availableWidth) // 最小800px
  const contentBasedWidth = (totalDuration / 1000) * pixelsPerSecond
  
  // 画面サイズとコンテンツの両方を考慮した幅
  const safeTrackAreaWidth = Math.max(minTrackAreaWidth, contentBasedWidth)
  
  // NaNチェックとフォールバック
  const safeTotalDuration = isNaN(totalDuration) ? 30000 : totalDuration

  return {
    // 状態
    isPlaying,
    currentTime,
    totalDuration: safeTotalDuration,
    playbackPosition,
    lastClickPosition,
    pixelsPerSecond,
    snapToGrid,
    metronomeEnabled,
    playbackRate,
    loopEnabled,
    loopStart,
    loopEnd,
    windowWidth,
    safeTrackAreaWidth,
    
    // 状態更新関数
    setIsPlaying,
    setCurrentTime,
    setPlaybackPosition,
    setLastClickPosition,
    setPixelsPerSecond,
    setSnapToGrid,
    setMetronomeEnabled,
    setPlaybackRate,
    setLoopEnabled,
    setLoopStart,
    setLoopEnd,
    
    // 機能関数
    handleSetDuration,
    handleSkipBack,
    handleSkipForward,
    handleLoopToggle,
    handleMetronomeToggle,
    handlePlaybackRateChange,
    handleTimelineClick,
    handlePlaybackHeadDragStart
  }
} 