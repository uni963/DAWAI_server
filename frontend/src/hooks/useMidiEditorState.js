import { useState, useRef, useEffect } from 'react'
import { scrollPositionManager } from '../utils/midiEngine.js'

/**
 * MIDI Editor State Management Hook
 * 基本状態、選択状態、UI状態を管理
 */
const useMidiEditorState = (trackId = null) => {
  // 確実なデータ保持システム
  const [notes, setNotes] = useState([])
  const [isInitialized, setIsInitialized] = useState(false)
  
  // トラック別データの永続化用Ref
  const trackDataRef = useRef({})
  const lastSavedRef = useRef({})
  const lastParentUpdateRef = useRef({}) // 親コンポーネントへの最後の更新時刻を記録
  
  // 基本状態
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [selectedNotes, setSelectedNotes] = useState(new Set())
  
  // 選択状態の同期的な管理用Ref
  const selectedNotesRef = useRef(new Set())
  
  // ハイライト状態（AIエージェントによる追加ノートなど）
  const [highlightedNotes, setHighlightedNotes] = useState(new Set())
  
  // 再生関連の状態
  const [tempo, setTempo] = useState(120) // BPM
  const [playbackStartTime, setPlaybackStartTime] = useState(0)
  const [playbackDuration, setPlaybackDuration] = useState(64) // 秒（TOTAL_DURATIONの代わりに直接指定）
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [loopStart, setLoopStart] = useState(0) // ループ開始位置（秒）
  const [loopEnd, setLoopEnd] = useState(4) // ループ終了位置（秒）
  const [metronomeEnabled, setMetronomeEnabled] = useState(false)
  const [playbackNotes, setPlaybackNotes] = useState(new Set()) // 再生中のノート
  
  // スクロール位置の永続化
  const [scrollX, setScrollX] = useState(0) // 水平スクロール
  const [scrollY, setScrollY] = useState(0) // 垂直スクロール
  
  // スクロール位置の初期化（永続化データから復元）
  useEffect(() => {
    if (trackId) {
      const savedPosition = scrollPositionManager.loadScrollPosition(trackId)
      setScrollX(savedPosition.scrollX)
      setScrollY(savedPosition.scrollY)
    }
  }, [trackId])
  
  // スクロール位置の自動保存
  const setScrollXWithSave = (newScrollX) => {
    setScrollX(newScrollX)
    if (trackId) {
      scrollPositionManager.saveScrollPosition(trackId, newScrollX, scrollY)
    }
  }
  
  const setScrollYWithSave = (newScrollY) => {
    setScrollY(newScrollY)
    if (trackId) {
      scrollPositionManager.saveScrollPosition(trackId, scrollX, newScrollY)
    }
  }
  
  // Ghost Text関連状態は専用フックに移動
  
  // 履歴管理（トラック別）
  const [noteHistory, setNoteHistory] = useState({})
  const [historyIndex, setHistoryIndex] = useState({})
  
  // 元のMIDIデータを保持
  const [originalMidiData, setOriginalMidiData] = useState(null)
  
  // UI状態
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [lastInputTime, setLastInputTime] = useState(0)
  
  // マウス関連状態
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [mouseDownTime, setMouseDownTime] = useState(0)
  const [mouseDownPosition, setMouseDownPosition] = useState(null)
  const [currentlyCreatingNote, setCurrentlyCreatingNote] = useState(null)
  
  // ノートドラッグ関連状態
  const [isDraggingNote, setIsDraggingNote] = useState(false)
  const [draggedNote, setDraggedNote] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // 複数ノートドラッグ用の状態
  const [isDraggingMultipleNotes, setIsDraggingMultipleNotes] = useState(false)
  const [draggedNotes, setDraggedNotes] = useState([])
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 })
  const [dragStartNotes, setDragStartNotes] = useState([])
  
  // ノートリサイズ用の状態
  const [isResizingNote, setIsResizingNote] = useState(false)
  const [resizingNote, setResizingNote] = useState(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartDuration, setResizeStartDuration] = useState(0)
  const [resizeStartTime, setResizeStartTime] = useState(0)
  const [resizeDirection, setResizeDirection] = useState(null) // 'left' or 'right'
  
  // 選択範囲関連状態
  const [selectionBox, setSelectionBox] = useState(null)
  
  // ピアノロールクリック時の視覚的フィードバック
  const [pressedKey, setPressedKey] = useState(null)
  
  // 現在選択されている予測のインデックス
  const [selectedPredictionIndex, setSelectedPredictionIndex] = useState(0)

  // 再描画フラグ
  const [needsRedraw, setNeedsRedraw] = useState(true)
  
  // タイムラインクリック位置
  const [timelineClickPosition, setTimelineClickPosition] = useState(null)
  
  // 描画関連
  const [lastDrawTime, setLastDrawTime] = useState(0)
  
  // 削除処理の重複実行を防ぐためのフラグ
  const isDeletingRef = useRef(false)
  
  // 再生状態の管理用Ref（状態の不整合を防ぐため）
  const isPlayingRef = useRef(false)
  
  // スクロールバー関連状態
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false)
  const [scrollbarStartX, setScrollbarStartX] = useState(0)
  const [scrollbarInitialScrollX, setScrollbarInitialScrollX] = useState(0)

  return {
    // 基本状態
    notes,
    setNotes,
    isInitialized,
    setIsInitialized,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    zoom,
    setZoom,
    selectedNotes,
    setSelectedNotes,
    selectedNotesRef,
    
    // 再生関連状態
    tempo,
    setTempo,
    playbackStartTime,
    setPlaybackStartTime,
    playbackDuration,
    setPlaybackDuration,
    loopEnabled,
    setLoopEnabled,
    loopStart,
    setLoopStart,
    loopEnd,
    setLoopEnd,
    metronomeEnabled,
    setMetronomeEnabled,
    playbackNotes,
    setPlaybackNotes,
    scrollX,
    setScrollX: setScrollXWithSave, // 永続化機能付きのsetter
    scrollY,
    setScrollY: setScrollYWithSave, // 永続化機能付きのsetter
    
    // Ghost Text関連状態は専用フックに移動
    
    // 履歴管理状態
    noteHistory,
    setNoteHistory,
    historyIndex,
    setHistoryIndex,
    originalMidiData,
    setOriginalMidiData,
    
    // UI状態
    showDeleteConfirm,
    setShowDeleteConfirm,
    audioEnabled,
    setAudioEnabled,
    lastInputTime,
    setLastInputTime,
    
    // マウス関連状態
    isMouseDown,
    setIsMouseDown,
    mouseDownTime,
    setMouseDownTime,
    mouseDownPosition,
    setMouseDownPosition,
    currentlyCreatingNote,
    setCurrentlyCreatingNote,
    
    // ドラッグ関連状態
    isDraggingNote,
    setIsDraggingNote,
    draggedNote,
    setDraggedNote,
    dragOffset,
    setDragOffset,
    isDraggingMultipleNotes,
    setIsDraggingMultipleNotes,
    draggedNotes,
    setDraggedNotes,
    dragStartPosition,
    setDragStartPosition,
    dragStartNotes,
    setDragStartNotes,
    
    // リサイズ関連状態
    isResizingNote,
    setIsResizingNote,
    resizingNote,
    setResizingNote,
    resizeStartX,
    setResizeStartX,
    resizeStartDuration,
    setResizeStartDuration,
    resizeStartTime,
    setResizeStartTime,
    resizeDirection,
    setResizeDirection,
    
    // 選択範囲関連状態
    selectionBox,
    setSelectionBox,
    
    // ピアノロールクリック時の視覚的フィードバック
    pressedKey,
    setPressedKey,
    
    // 現在選択されている予測のインデックス
    selectedPredictionIndex,
    setSelectedPredictionIndex,
    
    // 再描画フラグ
    needsRedraw,
    setNeedsRedraw,
    
    // タイムラインクリック位置
    timelineClickPosition,
    setTimelineClickPosition,
    
    // 描画関連状態
    lastDrawTime,
    setLastDrawTime,
    
    // スクロールバー関連状態
    isDraggingScrollbar,
    setIsDraggingScrollbar,
    scrollbarStartX,
    setScrollbarStartX,
    scrollbarInitialScrollX,
    setScrollbarInitialScrollX,
    
    // Refs
    trackDataRef,
    lastSavedRef,
    lastParentUpdateRef,
    isDeletingRef,
    isPlayingRef
  }
}

export default useMidiEditorState 