import { useCallback, useRef } from 'react'

export const useTimelineEventHandlers = ({
  arrangementState,
  playbackState,
  audioState,
  timelineRef,
  trackAreaRef,
  scrollTimeoutRef
}) => {
  const {
    horizontalScrollPosition,
    setHorizontalScrollPosition
  } = arrangementState

  const {
    currentTime,
    pixelsPerSecond,
    setCurrentTime
  } = playbackState

  // タイムラインクリック
  const handleTimelineClick = useCallback((event) => {
    if (!timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const scrollLeft = timelineRef.current.scrollLeft
    const totalX = clickX + scrollLeft

    // クリック位置を時間に変換
    const newTime = totalX / pixelsPerSecond

    // 再生位置を更新
    setCurrentTime(Math.max(0, newTime))

    // オーディオエンジンの再生位置も更新
    if (audioState && audioState.setCurrentTime) {
      audioState.setCurrentTime(Math.max(0, newTime))
    }

  }, [timelineRef, pixelsPerSecond, setCurrentTime, audioState])

  // 再生バードラッグ開始
  const handlePlaybackHeadDragStart = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const startTime = currentTime

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaTime = deltaX / pixelsPerSecond
      const newTime = Math.max(0, startTime + deltaTime)

      setCurrentTime(newTime)

      // オーディオエンジンの再生位置も更新
      if (audioState && audioState.setCurrentTime) {
        audioState.setCurrentTime(newTime)
      }
    }

    const handleMouseUp = (upEvent) => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [currentTime, pixelsPerSecond, setCurrentTime, audioState])

  // 水平スクロール同期機能（スロットリング付き）
  const handleHorizontalScroll = useCallback((event) => {
    const scrollLeft = event.target.scrollLeft
    
    // スロットリング: 前回のタイムアウトをクリア
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // 状態更新を即座に行う（再生バーの位置計算のため）
    if (horizontalScrollPosition !== scrollLeft && typeof setHorizontalScrollPosition === 'function') {
      setHorizontalScrollPosition(scrollLeft)
    }
    
    // タイムライン同期は少し遅延させる（パフォーマンス向上）
    scrollTimeoutRef.current = setTimeout(() => {
      if (timelineRef.current && Math.abs(timelineRef.current.scrollLeft - scrollLeft) > 1) {
        timelineRef.current.scrollLeft = scrollLeft
      }
    }, 16) // 約60fps
  }, [horizontalScrollPosition, setHorizontalScrollPosition, timelineRef, scrollTimeoutRef])

  // タイムラインスクロール同期機能（スロットリング付き）
  const handleTimelineScroll = useCallback((event) => {
    const scrollLeft = event.target.scrollLeft
    
    // スロットリング: 前回のタイムアウトをクリア
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // 状態更新を即座に行う（再生バーの位置計算のため）
    if (horizontalScrollPosition !== scrollLeft && typeof setHorizontalScrollPosition === 'function') {
      setHorizontalScrollPosition(scrollLeft)
    }
    
    // トラックエリア同期は少し遅延させる（パフォーマンス向上）
    scrollTimeoutRef.current = setTimeout(() => {
      if (trackAreaRef.current && Math.abs(trackAreaRef.current.scrollLeft - scrollLeft) > 1) {
        trackAreaRef.current.scrollLeft = scrollLeft
      }
    }, 16) // 約60fps
  }, [horizontalScrollPosition, setHorizontalScrollPosition, trackAreaRef, scrollTimeoutRef])

  return {
    handleTimelineClick,
    handlePlaybackHeadDragStart,
    handleHorizontalScroll,
    handleTimelineScroll
  }
} 