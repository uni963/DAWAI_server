import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.jsx'
import { Button } from './ui/button.jsx'

import { 
  DEFAULT_TRACK_HEIGHT,
  MIN_TRACK_HEIGHT,
  MAX_TRACK_HEIGHT,
  HEADER_HEIGHT,
  NOTE_MIN_HEIGHT,
  NOTE_MAX_HEIGHT,
  NOTE_MIN,
  NOTE_MAX,
  NOTE_RANGE,
  TRACK_INFO_PANEL_WIDTH,
  MIN_TRACK_AREA_WIDTH,
  CONTENT_PADDING,
  SCROLL_THROTTLE_DELAY,
  PRELOAD_WAIT_TIME,
  CACHE_CLEANUP_INTERVAL,
  CACHE_MAX_AGE,
  PLAYBACK_UPDATE_INTERVAL,
  SHORT_NOTE_DURATION,
  DEFAULT_VELOCITY,
  TIME_MARKER_INTERVALS,
  getNoteName,
  formatTime,
  calculateGridInterval,
  calculateTimeMarkerInterval,
  generateTimeMarkers,
  generateBeatGridLines,
  generateFineGridLines,
  generateBarMarkers
} from './ArrangementView/utils/arrangementUtils.js'
import { useArrangementAudio } from './ArrangementView/hooks/useArrangementAudio.js'
import { useArrangementState } from './ArrangementView/hooks/useArrangementState.js'
import { usePlaybackState } from './ArrangementView/hooks/usePlaybackState.js'
import { useArrangementEventHandlers } from './ArrangementView/hooks/useArrangementEventHandlers.js'
import { useTimelineEventHandlers } from './ArrangementView/hooks/useTimelineEventHandlers.js'
import { useMenuEventHandlers } from './ArrangementView/hooks/useMenuEventHandlers.js'
import PlaybackControls from './ArrangementView/components/PlaybackControls.jsx'
import TimelineHeader from './ArrangementView/components/TimelineHeader.jsx'
import TrackList from './ArrangementView/components/TrackList.jsx'
import DurationModal from './ArrangementView/components/DurationModal.jsx'
import EditControls from './ArrangementView/components/EditControls.jsx'
import useKeyboardShortcuts from './ArrangementView/hooks/useKeyboardShortcuts.js'
import useTrackContextMenu from './ArrangementView/hooks/useTrackContextMenu.js'
import drumTrackManager from '../utils/drumTrackManager.js'

const ArrangementView = ({
  tracks = [],
  addNewTrack,
  projectManager,
  audioEngine,
  forceRerenderApp,
  onTabChange,
  globalTempo = 120,
  onGlobalTempoChange,
  trackVolume = {},
  trackMuted = {},
  masterVolume = 100,
  musicTheorySettings = {
    scaleConstraintEnabled: false,
    selectedGenre: null,
    selectedScales: [],
    rootNote: 'C'
  },
  onMusicTheorySettingsChange,
  globalAISettings = {
    aiModel: 'magenta',
    ghostTextEnabled: false,
    summaryStatus: null,
    predictionSettings: { scale: null, rootNote: null }
  },
  onAISettingsChange
}) => {
  // グローバルBPMを使用
  const bpm = globalTempo
  const timeSignature = projectManager?.getProject()?.settings?.timeSignature || '4/4'
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollStartY, setScrollStartY] = useState(0)
  const [scrollStartScrollTop, setScrollStartScrollTop] = useState(0)
  const [showDurationModal, setShowDurationModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const arrangementRef = useRef(null)
  const trackAreaRef = useRef(null) // トラックエリアの参照を追加
  const timelineRef = useRef(null) // タイムラインの参照を追加
  const isPlayingRef = useRef(false) // 再生状態の参照を追加
  const scrollTimeoutRef = useRef(null) // スクロールスロットリング用

  // 状態管理フックの使用
  const arrangementState = useArrangementState(tracks, projectManager)
  const playbackState = usePlaybackState(projectManager, tracks)
  
  // playbackStateから必要な値を分割代入
  const {
    isPlaying,
    currentTime,
    playbackPosition,
    totalDuration,
    pixelsPerSecond,
    snapToGrid,
    loopEnabled,
    loopStart,
    loopEnd,
    metronomeEnabled,
    playbackRate,
    lastClickPosition,
    trackScrollPositions,
    setIsPlaying,
    setCurrentTime,
    setPlaybackPosition,
    setSnapToGrid,
    setPixelsPerSecond,
    setLastClickPosition
  } = playbackState

  // arrangementStateから選択関連の状態を取得
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
  
  // オーディオ関連フックの使用
  const audioState = useArrangementAudio(
    tracks, 
    arrangementState.trackStates, 
    playbackState.currentTime, 
    playbackState.metronomeEnabled, 
    bpm, 
    playbackState.totalDuration, 
    playbackState.lastClickPosition, 
    playbackState.pixelsPerSecond,
    trackVolume,
    trackMuted,
    masterVolume
  )
  
  // トラックプリロード用状態
  const [hasPreloadedInitialTracks, setHasPreloadedInitialTracks] = useState(false)
  const hasTriggeredInitialPreload = useRef(false)

  // イベントハンドラーフックの使用
  const arrangementEventHandlers = useArrangementEventHandlers({
    tracks,
    arrangementState,
    playbackState,
    audioState,
    projectManager,
    addNewTrack,
    forceRerenderApp,
    onTabChange
  })

  const timelineEventHandlers = useTimelineEventHandlers({
    arrangementState,
    playbackState,
    audioState,
    timelineRef,
    trackAreaRef,
    scrollTimeoutRef
  })

  const menuEventHandlers = useMenuEventHandlers({
    tracks,
    arrangementState,
    playbackState,
    projectManager,
    addNewTrack,
    forceRerenderApp,
    onTabChange,
    drumTrackManager
  })

  // アンドゥ・リドゥ状態
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // アンドゥ・リドゥハンドラー
  const handleUndo = useCallback(() => {
    if (projectManager && projectManager.undo()) {
      forceRerenderApp()
      setCanUndo(projectManager.canUndo())
      setCanRedo(projectManager.canRedo())
    }
  }, [projectManager, forceRerenderApp])

  const handleRedo = useCallback(() => {
    if (projectManager && projectManager.redo()) {
      forceRerenderApp()
      setCanUndo(projectManager.canUndo())
      setCanRedo(projectManager.canRedo())
    }
  }, [projectManager, forceRerenderApp])

  // 削除確認ダイアログを表示
  const handleDeleteTracksWithConfirm = useCallback(() => {
    if (selectedTracks && selectedTracks.size > 0) {
      setShowDeleteConfirm(true)
    }
  }, [selectedTracks])

  // 削除を実行
  const confirmDeleteTracks = useCallback(() => {
    arrangementEventHandlers.handleDeleteTracks()
    setShowDeleteConfirm(false)
    // アンドゥ・リドゥ状態を更新
    if (projectManager) {
      setCanUndo(projectManager.canUndo())
      setCanRedo(projectManager.canRedo())
    }
  }, [arrangementEventHandlers, projectManager])

  // アンドゥ・リドゥ状態を更新
  useEffect(() => {
    if (projectManager) {
      setCanUndo(projectManager.canUndo())
      setCanRedo(projectManager.canRedo())
    }
  }, [projectManager, tracks])

  // キーボードショートカットフックの使用
  useKeyboardShortcuts({
    isPlaying,
    selectedTracks,
    clipboard,
    projectManager,
    onCopyTracks: arrangementEventHandlers.handleCopyTracks,
    onPasteTracks: arrangementEventHandlers.handlePasteTracks,
    onSelectAll: arrangementEventHandlers.handleSelectAll,
    onInvertSelection: arrangementEventHandlers.handleInvertSelection,
    onDeselectAll: arrangementEventHandlers.handleDeselectAll,
    onDeleteTracks: arrangementEventHandlers.handleDeleteTracks,
    onUndo: handleUndo,
    onRedo: handleRedo
  })

  // トラックコンテキストメニューフックの使用
  const { showTrackContextMenu } = useTrackContextMenu({
    selectedTracks,
    setSelectedTracks,
    setLastSelectedTrack,
    handleCopyTracks: arrangementEventHandlers.handleCopyTracks,
    handlePasteTracks: arrangementEventHandlers.handlePasteTracks,
    handleDeleteTracks: arrangementEventHandlers.handleDeleteTracks,
    clipboard,
    projectManager,
    forceRerenderApp,
    onTabChange
  })





  // 再生コントロール
  const handlePlay = useCallback(async () => {
    await audioState.handlePlay(playbackState.setIsPlaying, playbackState.setCurrentTime, playbackState.setPlaybackPosition)

    // ループ再開時のコールバック（MIDI/Bassトラックの再スケジュール用）
    const onLoopRestart = async (loopStartTime) => {
      console.log('🔄 [ArrangementView] Loop restart callback triggered, rescheduling tracks from:', loopStartTime);

      // ドラムトラック以外のトラック（MIDI、Bass、DiffSinger）を再スケジュール
      if (audioState.currentPlayingTracksRef && audioState.currentPlayingTracksRef.current) {
        const tracksToReschedule = audioState.currentPlayingTracksRef.current.filter(
          track => track.subtype !== 'drums'
        );

        if (tracksToReschedule.length > 0) {
          await audioState.scheduleTracksFromTime(loopStartTime, tracksToReschedule);
        }
      }
    };

    // 再生開始後、タイマーを開始
    audioState.startPlaybackTimer(
      null, // startTimeは内部で管理
      playbackState.setCurrentTime,
      playbackState.setPlaybackPosition,
      playbackState.loopEnabled,
      playbackState.loopEnd,
      playbackState.loopStart,
      () => audioState.handleStop(playbackState.setIsPlaying, playbackState.setCurrentTime, playbackState.setPlaybackPosition),
      onLoopRestart // ループ再開コールバックを追加
    )
  }, [audioState, playbackState])

  const handlePause = useCallback(() => {
    audioState.handlePause(playbackState.setIsPlaying)
  }, [audioState, playbackState.setIsPlaying])

  const handleStop = useCallback(() => {
    audioState.handleStop(playbackState.setIsPlaying, playbackState.setCurrentTime, playbackState.setPlaybackPosition)
  }, [audioState, playbackState])

  // 曲の長さ設定
  const handleSetDuration = useCallback((seconds) => {
    if (projectManager) {
      const project = projectManager.getProject()
      if (project) {
        project.settings = {
          ...project.settings,
          duration: seconds * 1000 // ミリ秒に変換
        }
        projectManager.updateProject(project)
        console.log('🎵 Duration set to:', seconds, 'seconds')
      }
    }
    setShowDurationModal(false)
  }, [projectManager])

  // トラック状態の更新
  const updateTrackState = useCallback((trackId, updates) => {
    if (arrangementState.trackStates && arrangementState.setTrackStates) {
      arrangementState.setTrackStates(prev => ({
        ...prev,
        [trackId]: {
          ...prev[trackId],
          ...updates
        }
      }))
    }
  }, [arrangementState.trackStates, arrangementState.setTrackStates])

  // isPlayingRefをisPlayingと同期
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])
  
  // 高速アプリ起動時プリロード
  useEffect(() => {
    if (!hasTriggeredInitialPreload.current && tracks.length > 0 && audioState.preloadAllTracks) {
      hasTriggeredInitialPreload.current = true
      const startTime = performance.now();
      
      // 再生中でない場合のみプリロードを実行
      if (!isPlaying) {
        audioState.preloadAllTracks(tracks).then(() => {
          const totalTime = performance.now() - startTime;
          setHasPreloadedInitialTracks(true)
        }).catch((error) => {
          console.error('❌ [ArrangementView] Fast initial preload failed:', error);
        })
      }
    }
  }, [tracks, audioState.preloadAllTracks, isPlaying])
  
  // 高速ArrangementView移動時プリロード
  useEffect(() => {
    // 既に初回プリロードが完了している場合でも、新しいトラックが追加されている可能性があるため再実行
    if (tracks.length > 0 && audioState.preloadAllTracks && hasPreloadedInitialTracks) {
      const startTime = performance.now();
      
      // 再生中でない場合のみプリロードを実行
      if (!isPlaying) {
        audioState.preloadAllTracks(tracks).then(() => {
          const totalTime = performance.now() - startTime;
        }).catch((error) => {
          console.error('❌ [ArrangementView] Fast navigation preload failed:', error);
        })
      }
    }
  }, [tracks.length, audioState.preloadAllTracks, hasPreloadedInitialTracks, isPlaying])

  // スペースキーでの再生/停止制御
  useEffect(() => {
    const handleSpaceKey = async (e) => {
      if (e.code === 'Space') {
        // 入力フィールドにフォーカスがある場合は無視
        const activeElement = document.activeElement;
        if (activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.contentEditable === 'true'
        )) {
          return;
        }
        
        e.preventDefault();
        
        try {
          if (isPlayingRef.current) {
            // 再生中の場合は一時停止
            handlePause();
          } else {
            // 停止中の場合は再生開始（lastClickPositionから）
            
            // lastClickPositionがある場合はそこから再生
            if (lastClickPosition !== null) {
              setCurrentTime(lastClickPosition);
              setPlaybackPosition(lastClickPosition * pixelsPerSecond);
            }
            
            await handlePlay();
          }
        } catch (error) {
          console.error('❌ ArrangementView Space key playback error:', error);
        }
      }
    };

    document.addEventListener('keydown', handleSpaceKey);
    return () => document.removeEventListener('keydown', handleSpaceKey);
  }, [isPlayingRef, handlePlay, handlePause, lastClickPosition, pixelsPerSecond, setCurrentTime, setPlaybackPosition]);

  // スクロール位置の同期（無限ループを防ぐため、手動同期のみ）
  // useEffectでの自動同期は削除し、スクロールイベントハンドラーでのみ同期を行う

  // グローバル関数として公開（App.jsxから呼び出し可能）
  useEffect(() => {
    window.arrangementViewIsPlaying = playbackState.isPlaying
    window.arrangementViewHandlePlay = handlePlay
    window.arrangementViewHandlePause = handlePause
    window.arrangementViewPreloadTracks = (trackList) => {
      if (!isPlaying && audioState.preloadAllTracks) {
        const startTime = performance.now();
        return audioState.preloadAllTracks(trackList || tracks).then(() => {
          const totalTime = performance.now() - startTime;
          return { success: true, time: totalTime };
        });
      } else {
        return Promise.resolve({ success: false, reason: 'playback_in_progress' });
      }
    }
    
    // キャッシュ管理関数をグローバルに公開
    window.arrangementViewClearCache = audioState.clearPreloadCache;
    window.arrangementViewGetCacheStats = audioState.getCacheStats;
    return () => {
      delete window.arrangementViewIsPlaying
      delete window.arrangementViewHandlePlay
      delete window.arrangementViewHandlePause
      delete window.arrangementViewPreloadTracks
      delete window.arrangementViewClearCache
      delete window.arrangementViewGetCacheStats
    }
  }, [playbackState.isPlaying, handlePlay, handlePause, isPlaying, audioState.preloadAllTracks, tracks])

  // クリーンアップ: スクロールタイムアウトをクリア
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // 音量情報を音声システムに反映
  useEffect(() => {
    if (audioEngine && audioEngine.isInitialized) {
      try {
        // マスターボリュームを設定
        const normalizedMasterVolume = masterVolume / 100
        audioEngine.setMasterVolume(normalizedMasterVolume)
        
        // 各トラックの音量とミュート状態を設定
        tracks.forEach(track => {
          const trackVol = trackVolume[track.id] !== undefined ? trackVolume[track.id] : 75
          const trackMute = trackMuted[track.id] || false
          
          const normalizedVolume = trackVol / 100
          audioEngine.setTrackVolume(track.id, normalizedVolume)
          audioEngine.setTrackMuted(track.id, trackMute)
        })
      } catch (error) {
        console.error('ArrangementView: Failed to update audio system:', error)
      }
    }
  }, [audioEngine, masterVolume, trackVolume, trackMuted, tracks])

  // ドラムトラックのデータ更新を監視
  useEffect(() => {
    const handleDrumTrackUpdate = (data) => {
      // ドラムトラックが更新された場合は、強制再レンダリング
      if (forceRerenderApp) {
        forceRerenderApp()
      }
    }

    const handleDrumTrackCreated = (data) => {
      // ドラムトラックが作成された場合は、強制再レンダリング
      if (forceRerenderApp) {
        forceRerenderApp()
      }
    }

    const handleDrumTrackDeleted = (data) => {
      // ドラムトラックが削除された場合は、強制再レンダリング
      if (forceRerenderApp) {
        forceRerenderApp()
      }
    }

    // イベントリスナーを登録
    drumTrackManager.on('trackUpdated', handleDrumTrackUpdate)
    drumTrackManager.on('trackCreated', handleDrumTrackCreated)
    drumTrackManager.on('trackDeleted', handleDrumTrackDeleted)

    // クリーンアップ
    return () => {
      drumTrackManager.off('trackUpdated', handleDrumTrackUpdate)
      drumTrackManager.off('trackCreated', handleDrumTrackCreated)
      drumTrackManager.off('trackDeleted', handleDrumTrackDeleted)
    }
  }, [forceRerenderApp])









  // イベントハンドラーはフックから取得
  const {
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
  } = arrangementEventHandlers

  const {
    handleTimelineClick,
    handlePlaybackHeadDragStart,
    handleHorizontalScroll,
    handleTimelineScroll
  } = timelineEventHandlers

  const {
    showEmptyAreaContextMenu,
    handleTrackMenuToggle,
    closeMenu,
    handleEsc,
    handleAddTrack: handleAddTrackFromMenu,
    handleOpenSelectedTracks: handleOpenSelectedTracksFromMenu,
    handleDeleteTracks: handleDeleteTracksFromMenu,
    handleCopyTracks: handleCopyTracksFromMenu,
    handlePasteTracks: handlePasteTracksFromMenu,
    handleSelectAll: handleSelectAllFromMenu,
    handleDeselectAll: handleDeselectAllFromMenu,
    handleInvertSelection: handleInvertSelectionFromMenu,
    showTrackMenu,
    menuPosition,
    menuRef
  } = menuEventHandlers










  // タイムライン目盛りの生成（メモ化で最適化）
  const generateTimeMarkers = useMemo(() => {
    const markers = []
    const totalSeconds = playbackState.totalDuration / 1000
    const interval = calculateTimeMarkerInterval(totalSeconds)

    for (let i = 0; i <= totalSeconds; i += interval) {
      const left = i * pixelsPerSecond
      markers.push(
        <div
          key={i}
          className="absolute flex flex-col items-center text-xs text-gray-400"
          style={{ left: `${left}px` }}
        >
          <div className="w-px h-6 bg-gray-600"></div>
          <span className="mt-1">{formatTime(i)}</span>
        </div>
      )
    }
    
    return markers
  }, [playbackState.totalDuration, pixelsPerSecond])















  // NaNチェックとフォールバック
  const safeTotalDuration = isNaN(playbackState.totalDuration) ? 30000 : playbackState.totalDuration
  
  // 画面サイズに応じたトラックエリア幅の計算
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // トラック情報パネルの幅を除いた利用可能幅を計算
  const availableWidth = windowWidth - TRACK_INFO_PANEL_WIDTH - CONTENT_PADDING
  const minTrackAreaWidth = Math.max(MIN_TRACK_AREA_WIDTH, availableWidth)
  const contentBasedWidth = (safeTotalDuration / 1000) * pixelsPerSecond
  
  // 画面サイズとコンテンツの両方を考慮した幅
  const safeTrackAreaWidth = Math.max(minTrackAreaWidth, contentBasedWidth)
  


  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* 再生コントロール */}
      <PlaybackControls
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSkipBack={() => playbackState.handleSkipBack(audioState)}
        onSkipForward={() => playbackState.handleSkipForward(audioState)}
        loopEnabled={loopEnabled}
        onLoopToggle={playbackState.handleLoopToggle}
        playbackRate={playbackRate}
        onPlaybackRateChange={(rate) => playbackState.handlePlaybackRateChange(rate, audioState)}
        currentTime={currentTime}
        totalDuration={playbackState.totalDuration}
        onDurationClick={() => setShowDurationModal(true)}
        pixelsPerSecond={pixelsPerSecond}
        onZoomIn={() => setPixelsPerSecond(prev => Math.min(800, prev * 2))}
        onZoomOut={() => setPixelsPerSecond(prev => Math.max(25, prev / 2))}
        snapToGrid={snapToGrid}
        onSnapToggle={() => setSnapToGrid(prev => !prev)}
        bpm={bpm}
        formatTime={formatTime}
      />
      
      {/* 編集コントロール */}
      <EditControls
        tracks={tracks}
        selectedTracks={selectedTracks}
        clipboard={clipboard}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onInvertSelection={handleInvertSelection}
        onCopyTracks={handleCopyTracks}
        onPasteTracks={handlePasteTracks}
        onDeleteTracks={handleDeleteTracksWithConfirm}
        onOpenSelectedTracks={handleOpenSelectedTracks}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* タイムライン */}
      <TimelineHeader
        timelineRef={timelineRef}
        safeTrackAreaWidth={safeTrackAreaWidth}
        currentTime={currentTime}
        pixelsPerSecond={pixelsPerSecond}
        horizontalScrollPosition={horizontalScrollPosition}
        bpm={bpm}
        timeSignature={timeSignature}
        snapToGrid={snapToGrid}
        safeTotalDuration={safeTotalDuration}
        onTimelineClick={handleTimelineClick}
        onTimelineScroll={handleTimelineScroll}
        onPlaybackHeadDragStart={handlePlaybackHeadDragStart}
      />

      {/* トラックエリア */}
      <TrackList
        tracks={tracks}
        trackAreaRef={trackAreaRef}
        safeTrackAreaWidth={safeTrackAreaWidth}
        windowWidth={windowWidth}
        currentTime={currentTime}
        pixelsPerSecond={pixelsPerSecond}
        horizontalScrollPosition={horizontalScrollPosition}
        selectedTracks={selectedTracks}
        trackHeights={trackHeights}
        isResizing={isResizing}
        resizingTrackId={resizingTrackId}
        arrangementState={arrangementState}
        onTrackSelectStart={handleTrackSelectStart}
        onTrackSelectEnd={handleTrackSelectEnd}
        onTrackDoubleClick={handleTrackDoubleClick}
        onShowTrackContextMenu={showTrackContextMenu}
        onResizeStart={handleResizeStart}
        onTrackMenuToggle={handleTrackMenuToggle}
        onCloseMenu={closeMenu}
        showTrackMenu={showTrackMenu}
        menuPosition={menuPosition}
        menuRef={menuRef}
        onAddTrack={handleAddTrack}
        forceRerenderApp={forceRerenderApp}
        onUpdateTrackState={updateTrackState}
        onHorizontalScroll={handleHorizontalScroll}
        onEmptyAreaContextMenu={showEmptyAreaContextMenu}
        audioEngine={audioEngine}
        musicTheorySettings={musicTheorySettings}
        onMusicTheorySettingsChange={onMusicTheorySettingsChange}
        globalAISettings={globalAISettings}
        onAISettingsChange={onAISettingsChange}
      />

      {/* 曲の長さ設定モーダル */}
      <DurationModal
        showDurationModal={showDurationModal}
        onClose={() => setShowDurationModal(false)}
        onSetDuration={handleSetDuration}
        totalDuration={playbackState.totalDuration}
      />

      {/* 削除確認ダイアログ */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>トラックの削除</DialogTitle>
            <DialogDescription className="text-gray-300">
              選択した{selectedTracks?.size ?? 0}トラックを削除しますか？
              <br />
              <span className="text-sm text-gray-400">
                この操作は元に戻すことができます（Ctrl+Z）
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-gray-600 text-white hover:bg-gray-700"
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTracks}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default memo(ArrangementView)

