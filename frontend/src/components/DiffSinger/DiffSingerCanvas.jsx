/*
 * DiffSingerCanvas - Extended MIDI canvas for DiffSinger tracks
 * 
 * Features:
 * - All standard MIDI editor functionality
 * - Phoneme display on notes
 * - Vocal parameter visualization
 * - Lyric assignment indicators
 * - Voice synthesis preview
 * - Enhanced scrolling and note editing (based on EnhancedMidiEditor)
 */

import { useRef, useEffect, useCallback, useState, memo, useMemo } from 'react'
import { calculateVisibleShortcuts, calculateOptimalOctave, calculateOctaveAdjustmentDisplays } from '../../utils/keyboardShortcuts.js'

// DiffSinger用定数
const DIFFSINGER_CONSTANTS = {
  GRID_HEIGHT: 20,
  GRID_WIDTH: 40,
  PIANO_WIDTH: 80,
  HEADER_HEIGHT: 40,
  NOTE_HEIGHT: 18,
  OCTAVE_RANGE: [1, 7], // C1 to C7
  TOTAL_KEYS: (7 - 1 + 1) * 12,
  FPS_LIMIT: 60,
  FRAME_TIME: 1000 / 60,
  LONG_PRESS_THRESHOLD: 200,
  PLAYBACK_UPDATE_INTERVAL: 16
}

const DiffSingerCanvas = ({
  // キャンバス関連
  activeStaticCanvasRef,
  activeDynamicCanvasRef,
  activeTimelineCanvasRef,
  activeContainerRef,
  
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
  TOTAL_KEYS,
  
  // ノート関連
  onNoteSelect,
  notePhonemes = {},
  showPhonemes = true,
  selectedNoteId,
  selectedNoteIds = [],
  onSelectionChange,
  vocalParams = {},
  isGenerating = false,
  
  // イベントハンドラー
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onContextMenu,
  onTimelineClick,
  onSmoothScroll,
  onPianoRollClick,
  onNoteAdd,
  onNoteEdit,
  
  // オクターブ調整関連
  manualOctaveOffset = 0,
  projectManager
}) => {
  // Refs
  const animationFrameRef = useRef(null)
  const lastDrawTimeRef = useRef(0)
  const resizeObserverRef = useRef(null)
  const defaultContainerRef = useRef(null)
  const defaultStaticCanvasRef = useRef(null)
  const defaultDynamicCanvasRef = useRef(null)
  const defaultTimelineCanvasRef = useRef(null)
  
  // スクロールアニメーション用のRefs
  const scrollAnimationRef = useRef(null)
  const scrollStartTimeRef = useRef(0)
  const scrollStartXRef = useRef(0)
  const scrollStartYRef = useRef(0)
  const scrollTargetXRef = useRef(0)
  const scrollTargetYRef = useRef(0)
  const scrollDurationRef = useRef(300)
  
  // スクロール速度の調整（慣性スクロール）
  const scrollVelocityRef = useRef({ x: 0, y: 0 })
  const lastWheelTimeRef = useRef(0)
  const wheelDeltaRef = useRef({ x: 0, y: 0 })
  
  // Use provided refs or defaults
  const containerRef = activeContainerRef || defaultContainerRef
  const staticCanvasRef = activeStaticCanvasRef || defaultStaticCanvasRef
  const dynamicCanvasRef = activeDynamicCanvasRef || defaultDynamicCanvasRef
  const timelineCanvasRef = activeTimelineCanvasRef || defaultTimelineCanvasRef
  
  // State
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [showPhonemeTooltip, setShowPhonemeTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [tooltipContent, setTooltipContent] = useState('')

  // ノート操作の状態管理
  const [noteOperationState, setNoteOperationState] = useState({
    isDragging: false,
    isResizing: false,
    dragStartPos: { x: 0, y: 0 },
    dragStartNote: null,
    resizeDirection: null, // 'left' or 'right'
    selectedNotes: new Set(),
    dragOffset: { x: 0, y: 0 },
    // リサイズ開始時の元のノート状態を保存
    originalNoteStates: {}
  })

  // 複数選択の状態管理
  const [selectionState, setSelectionState] = useState({
    isSelecting: false,
    selectionStart: { x: 0, y: 0 },
    selectionEnd: { x: 0, y: 0 },
    selectionBox: null
  })

  // 座標変換の計算
  const defaultCoordinateTransforms = useMemo(() => {
    // 曲の最大時間を計算（ArrangementViewの設定を優先）
    let maxTime = 60 // デフォルト60秒
    
    // プロジェクトマネージャーからArrangementViewの曲の長さを取得
    if (projectManager?.getProject()?.settings?.duration) {
      // ミリ秒から秒に変換
      const projectDuration = projectManager.getProject().settings.duration / 1000
      maxTime = Math.max(30, Math.min(600, projectDuration))
    } else if (state.notes && state.notes.length > 0) {
      // プロジェクト設定がない場合は、ノートの最大時間を計算
      const maxNoteEnd = Math.max(...state.notes.map(note => (note.time || note.start || 0) + (note.duration || 1)))
      maxTime = Math.max(30, Math.min(600, maxNoteEnd + 10))
    }
    
    // BPMから拍数を計算
    const tempo = state.tempo || 120
    const secondsPerBeat = 60 / tempo
    const maxBeats = Math.ceil(maxTime / secondsPerBeat)
    
    const totalContentWidth = maxTime * GRID_WIDTH * (state.zoom || 1)
    
    return {
      pitchToY: (pitch) => {
        const keyIndex = TOTAL_KEYS - 1 - (pitch - (OCTAVE_RANGE[0] * 12))
        const y = HEADER_HEIGHT + keyIndex * GRID_HEIGHT - (state.scrollY || 0)
        return y
      },
      yToPitch: (y) => {
        const keyIndex = Math.floor((y - HEADER_HEIGHT + (state.scrollY || 0)) / GRID_HEIGHT)
        return (OCTAVE_RANGE[0] * 12) + (TOTAL_KEYS - 1 - keyIndex)
      },
      timeToX: (time) => {
        const x = PIANO_WIDTH + (time * GRID_WIDTH * (state.zoom || 1)) - (state.scrollX || 0)
        return x
      },
      xToTime: (x) => {
        return (x - PIANO_WIDTH + (state.scrollX || 0)) / (GRID_WIDTH * (state.zoom || 1))
      },
      durationToWidth: (duration) => duration * GRID_WIDTH * (state.zoom || 1),
      widthToDuration: (width) => Math.max(0.1, width / (GRID_WIDTH * (state.zoom || 1))),
      maxTime: maxTime,
      maxBeats: maxBeats,
      tempo: tempo,
      secondsPerBeat: secondsPerBeat
    }
  }, [state.notes, state.zoom, state.scrollX, state.scrollY, state.tempo, projectManager, GRID_WIDTH, GRID_HEIGHT, PIANO_WIDTH, HEADER_HEIGHT, OCTAVE_RANGE, TOTAL_KEYS])

  // 使用する座標変換を決定
  const transforms = coordinateTransforms || defaultCoordinateTransforms

  // ノート操作のヘルパー関数
  const getNoteAtPosition = useCallback((x, y) => {
    if (!state.notes) return null
    
    // 逆順で検索して、上に重なっているノートを優先的に選択
    for (let i = state.notes.length - 1; i >= 0; i--) {
      const note = state.notes[i]
      const noteX = transforms.timeToX(note.time || note.start)
      const noteY = transforms.pitchToY(note.pitch)
      const noteWidth = transforms.durationToWidth(note.duration)
      const noteHeight = NOTE_HEIGHT
      
      // より厳密な境界チェック（少し余裕を持たせる）
      const tolerance = 2
      if (x >= noteX - tolerance && 
          x <= noteX + noteWidth + tolerance && 
          y >= noteY - tolerance && 
          y <= noteY + noteHeight + tolerance) {
        return note
      }
    }
    
    return null
  }, [state.notes, transforms, NOTE_HEIGHT])

  // 選択範囲内のノートを取得
  const getNotesInSelectionBox = useCallback((startX, startY, endX, endY) => {
    if (!state.notes) return []
    
    const startTime = transforms.xToTime(Math.min(startX, endX))
    const endTime = transforms.xToTime(Math.max(startX, endX))
    const startPitch = transforms.yToPitch(Math.max(startY, endY))
    const endPitch = transforms.yToPitch(Math.min(startY, endY))
    
    return state.notes.filter(note => {
      const noteStart = note.time || note.start
      const noteEnd = noteStart + note.duration
      const notePitch = note.pitch
      
      // 時間軸での重複チェック
      const timeOverlap = noteStart < endTime && noteEnd > startTime
      
      // ピッチ軸での重複チェック
      const pitchOverlap = notePitch >= startPitch && notePitch <= endPitch
      
      return timeOverlap && pitchOverlap
    })
  }, [state.notes, transforms])

  const getResizeArea = useCallback((note, x) => {
    const noteX = transforms.timeToX(note.time || note.start)
    const noteWidth = transforms.durationToWidth(note.duration)
    const resizeAreaWidth = 8
    
    if (x >= noteX && x <= noteX + resizeAreaWidth) {
      return 'left'
    } else if (x >= noteX + noteWidth - resizeAreaWidth && x <= noteX + noteWidth) {
      return 'right'
    }
    return null
  }, [transforms])

  const snapToGrid = useCallback((time, pitch) => {
    const snappedTime = Math.round(time * 4) / 4
    const snappedPitch = Math.round(pitch)
    return { time: snappedTime, pitch: snappedPitch }
  }, [])

  // イージング関数（easeOutCubic）
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

  // 滑らかなスクロールアニメーション
  const smoothScrollTo = useCallback((targetX, targetY, duration = 300) => {
    // 既存のアニメーションを停止
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current)
    }

    const startX = state.scrollX || 0
    const startY = state.scrollY || 0
    const startTime = performance.now()

    scrollStartTimeRef.current = startTime
    scrollStartXRef.current = startX
    scrollStartYRef.current = startY
    scrollTargetXRef.current = targetX
    scrollTargetYRef.current = targetY
    scrollDurationRef.current = duration

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)

      const newX = startX + (targetX - startX) * easedProgress
      const newY = startY + (targetY - startY) * easedProgress

      // スクロール制限を適用
      const maxScrollX = coordinateTransforms?.maxScrollX || 0
      const maxScrollY = coordinateTransforms?.maxScrollY || 0
      const clampedX = Math.max(0, Math.min(maxScrollX, newX))
      const clampedY = Math.max(0, Math.min(maxScrollY, newY))

      if (state.setScrollX) state.setScrollX(clampedX)
      if (state.setScrollY) state.setScrollY(clampedY)
      if (state.setNeedsRedraw) state.setNeedsRedraw(true)

      if (progress < 1) {
        scrollAnimationRef.current = requestAnimationFrame(animate)
      } else {
        scrollAnimationRef.current = null
      }
    }

    scrollAnimationRef.current = requestAnimationFrame(animate)
  }, [state])

  // 親コンポーネントに滑らかなスクロール関数を渡す
  useEffect(() => {
    if (onSmoothScroll) {
      onSmoothScroll(smoothScrollTo)
    }
  }, [onSmoothScroll, smoothScrollTo])

  // 慣性スクロールの処理
  const handleInertialScroll = useCallback(() => {
    if (Math.abs(scrollVelocityRef.current.x) < 0.1 && Math.abs(scrollVelocityRef.current.y) < 0.1) {
      return
    }

    const currentX = (state.scrollX || 0) + scrollVelocityRef.current.x
    const currentY = (state.scrollY || 0) + scrollVelocityRef.current.y

    const maxScrollX = coordinateTransforms?.maxScrollX || 0
    const maxScrollY = coordinateTransforms?.maxScrollY || 0
    const clampedX = Math.max(0, Math.min(maxScrollX, currentX))
    const clampedY = Math.max(0, Math.min(maxScrollY, currentY))

    if (state.setScrollX) state.setScrollX(clampedX)
    if (state.setScrollY) state.setScrollY(clampedY)
    if (state.setNeedsRedraw) state.setNeedsRedraw(true)

    // 減衰
    scrollVelocityRef.current.x *= 0.95
    scrollVelocityRef.current.y *= 0.95

    // 境界に到達したら停止
    if (clampedX === 0 || clampedX === maxScrollX || clampedX === currentX) {
      scrollVelocityRef.current.x = 0
    }
    if (clampedY === 0 || clampedY === maxScrollY || clampedY === currentY) {
      scrollVelocityRef.current.y = 0
    }

    if (Math.abs(scrollVelocityRef.current.x) > 0.1 || Math.abs(scrollVelocityRef.current.y) > 0.1) {
      requestAnimationFrame(handleInertialScroll)
    }
  }, [state, coordinateTransforms])

  // キャンバスサイズ調整
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    const width = container.offsetWidth
    const height = container.offsetHeight
    
    if (width !== canvasSize.width || height !== canvasSize.height) {
      setCanvasSize({ width, height })
      
      // 各キャンバスのサイズを更新
      const canvases = [staticCanvasRef, dynamicCanvasRef, timelineCanvasRef]
      canvases.forEach(canvasRef => {
        if (canvasRef.current) {
          canvasRef.current.width = width
          canvasRef.current.height = height
        }
      })
    }
  }, [canvasSize, containerRef, staticCanvasRef, dynamicCanvasRef, timelineCanvasRef])

  // リサイズ監視
  useEffect(() => {
    if (!containerRef.current) return
    
    resizeObserverRef.current = new ResizeObserver(updateCanvasSize)
    resizeObserverRef.current.observe(containerRef.current)
    
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
    }
  }, [updateCanvasSize, containerRef])

  // 音素テキストの描画
  const drawPhonemeText = useCallback((ctx, note, x, y, width, height) => {
    if (!showPhonemes || !notePhonemes[note.id]) return
    
    const phoneme = notePhonemes[note.id]
    const isSelected = selectedNoteIds.includes(note.id)
    
    ctx.save()
    ctx.font = 'bold 11px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // テキスト（背景なし、選択状態に応じて色を変更）
    ctx.fillStyle = isSelected ? '#ffffff' : '#000000'
    ctx.fillText(phoneme, x + width / 2, y + height / 2)
    
    ctx.restore()
  }, [showPhonemes, notePhonemes, selectedNoteIds])

  // ノートの描画（音素付き）
  const drawNoteWithPhoneme = useCallback((ctx, note, x, y, width, height) => {
    const isSelected = selectedNoteIds.includes(note.id)
    const hasPhoneme = notePhonemes[note.id]
    
    // ベースノートの描画
    ctx.save()
    
    // ノートの色（選択状態をより明確に）
    if (isSelected) {
      // 選択されたノート：明るい紫色で目立つ
      ctx.fillStyle = '#a855f7'
    } else if (hasPhoneme) {
      // 音素があるノート：通常の紫色
      ctx.fillStyle = '#8b5cf6'
    } else {
      // 音素がないノート：グレー
      ctx.fillStyle = '#9ca3af'
    }
    
    // ノートの描画
    ctx.fillRect(x, y, width, height)
    
    // ボーダー（選択状態をより明確に）
    if (isSelected) {
      // 選択されたノート：太い白い枠線
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, width, height)
      
      // 内側に黒い枠線を追加してコントラストを向上
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)
    } else {
      // 非選択ノート：通常の枠線
      ctx.strokeStyle = hasPhoneme ? '#6d28d9' : '#6b7280'
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, width, height)
    }
    
    // 選択されたノートの追加視覚的フィードバック
    if (isSelected) {
      const resizeAreaWidth = 8
      
      // 選択ハイライト（明るいオーバーレイ）
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.fillRect(x, y, width, height)
      
      // 左側のリサイズエリア（より目立つ）
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x, y, resizeAreaWidth, height)
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, resizeAreaWidth, height)
      
      // 右側のリサイズエリア（より目立つ）
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x + width - resizeAreaWidth, y, resizeAreaWidth, height)
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.strokeRect(x + width - resizeAreaWidth, y, resizeAreaWidth, height)
      
      // 選択インジケーター（角の大きな四角、より目立つ）
      const indicatorSize = 6
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x + width - indicatorSize, y, indicatorSize, indicatorSize)
      ctx.fillRect(x, y + height - indicatorSize, indicatorSize, indicatorSize)
      
      // インジケーターに黒い枠線を追加
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.strokeRect(x + width - indicatorSize, y, indicatorSize, indicatorSize)
      ctx.strokeRect(x, y + height - indicatorSize, indicatorSize, indicatorSize)
    }
    
    ctx.restore()
    
    // 音素テキストの描画
    if (hasPhoneme) {
      drawPhonemeText(ctx, note, x, y, width, height)
    }
  }, [selectedNoteIds, notePhonemes, drawPhonemeText])

  // 静的要素の描画（スクロール対応）
  const drawStatic = useCallback(() => {
    if (!staticCanvasRef.current) return
    
    const ctx = staticCanvasRef.current.getContext('2d')
    const { width, height } = canvasSize
    
    // キャンバスクリア
    ctx.clearRect(0, 0, width, height)
    
    // 背景
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, 0, width, height)
    
    // ピアノロール描画（スクロール対応）
    const startKey = Math.max(0, Math.floor((state.scrollY || 0) / GRID_HEIGHT))
    const endKey = Math.min(TOTAL_KEYS, startKey + Math.ceil(height / GRID_HEIGHT) + 1)
    
    // デバッグ情報をコンソールに出力
    console.log('DiffSinger Piano Roll Debug:', {
      OCTAVE_RANGE,
      TOTAL_KEYS,
      startKey,
      endKey,
      scrollY: state.scrollY || 0,
      height,
      GRID_HEIGHT
    })
    
    for (let i = startKey; i < endKey; i++) {
      const y = HEADER_HEIGHT + i * GRID_HEIGHT - (state.scrollY || 0)
      const pitch = (OCTAVE_RANGE[0] * 12) + (TOTAL_KEYS - 1 - i)
      
      // 最初と最後のピッチをログに出力
      if (i === startKey || i === endKey - 1) {
        console.log(`DiffSinger Key ${i}: pitch ${pitch} (C${Math.floor(pitch / 12)})`)
      }
      const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12)
      
      // 白鍵の背景（すべてのキーに共通）
      ctx.fillStyle = '#f9fafb'
      ctx.fillRect(0, y, PIANO_WIDTH, GRID_HEIGHT)
      
      // 白鍵の枠線
      ctx.strokeStyle = '#d1d5db'
      ctx.lineWidth = 1
      ctx.strokeRect(0, y, PIANO_WIDTH, GRID_HEIGHT)
      
      // 黒鍵の描画
      if (isBlackKey) {
        ctx.fillStyle = '#374151'
        ctx.fillRect(0, y, PIANO_WIDTH, GRID_HEIGHT)
        ctx.strokeStyle = '#1f2937'
        ctx.strokeRect(0, y, PIANO_WIDTH, GRID_HEIGHT)
      }
      
      // キー名の表示（C0, C1, etc.）
      if (pitch % 12 === 0) {
        const octave = Math.floor(pitch / 12)
        ctx.fillStyle = '#6b7280'
        ctx.font = '10px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`C${octave}`, PIANO_WIDTH / 2, y + GRID_HEIGHT / 2)
      }
    }
    
    // グリッド線の描画（スクロール対応）
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 1
    
    // 縦線（時間軸）
    const startTime = Math.floor((state.scrollX || 0) / (GRID_WIDTH * (state.zoom || 1)))
    const endTime = startTime + Math.ceil(width / (GRID_WIDTH * (state.zoom || 1))) + 1
    
    for (let time = startTime; time <= endTime; time++) {
      const x = transforms.timeToX(time)
      if (x >= 0 && x <= width) {
        ctx.beginPath()
        ctx.moveTo(x, HEADER_HEIGHT)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
    }
    
    // 横線（音階）
    for (let i = startKey; i <= endKey; i++) {
      const y = HEADER_HEIGHT + i * GRID_HEIGHT - (state.scrollY || 0)
      if (y >= HEADER_HEIGHT && y <= height) {
        ctx.beginPath()
        ctx.moveTo(PIANO_WIDTH, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }
    
  }, [staticCanvasRef, canvasSize, state, GRID_HEIGHT, GRID_WIDTH, PIANO_WIDTH, HEADER_HEIGHT, OCTAVE_RANGE, TOTAL_KEYS, transforms])

  // 動的要素の描画（スクロール対応）
  const drawDynamic = useCallback(() => {
    if (!dynamicCanvasRef.current) return
    
    const ctx = dynamicCanvasRef.current.getContext('2d')
    const { width, height } = canvasSize
    
    // キャンバスクリア
    ctx.clearRect(0, 0, width, height)
    
    // ノートの描画（スクロール対応）
    if (state.notes) {
      state.notes.forEach(note => {
        const x = transforms.timeToX(note.time || note.start)
        const y = transforms.pitchToY(note.pitch)
        const noteWidth = transforms.durationToWidth(note.duration)
        const noteHeight = NOTE_HEIGHT
        
        // 画面内のノートのみ描画
        if (x + noteWidth > 0 && x < width && y + noteHeight > HEADER_HEIGHT && y < height) {
          drawNoteWithPhoneme(ctx, note, x, y, noteWidth, noteHeight)
        }
      })
    }
    
    // 再生ヘッドの描画
    if (state.isPlaying && state.currentTime >= 0) {
      const x = transforms.timeToX(state.currentTime)
      
      if (x >= 0 && x <= width) {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, HEADER_HEIGHT)
        ctx.lineTo(x, height)
        ctx.stroke()
        
        // 再生ヘッドの三角形
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.moveTo(x - 8, HEADER_HEIGHT)
        ctx.lineTo(x + 8, HEADER_HEIGHT)
        ctx.lineTo(x, HEADER_HEIGHT + 12)
        ctx.closePath()
        ctx.fill()
      }
    }
    
    // 選択範囲の描画
    if (selectionState.isSelecting && selectionState.selectionStart && selectionState.selectionEnd) {
      const startX = selectionState.selectionStart.x
      const startY = selectionState.selectionStart.y
      const endX = selectionState.selectionEnd.x
      const endY = selectionState.selectionEnd.y
      
      const rectX = Math.min(startX, endX)
      const rectY = Math.min(startY, endY)
      const rectWidth = Math.abs(endX - startX)
      const rectHeight = Math.abs(endY - startY)
      
      // 選択範囲の背景（より目立つ）
      ctx.fillStyle = 'rgba(139, 92, 246, 0.3)'
      ctx.fillRect(rectX, rectY, rectWidth, rectHeight)
      
      // 選択範囲の枠線（より目立つ）
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.setLineDash([8, 4])
      ctx.strokeRect(rectX, rectY, rectWidth, rectHeight)
      
      // 内側に黒い枠線を追加
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.setLineDash([])
      ctx.strokeRect(rectX + 1, rectY + 1, rectWidth - 2, rectHeight - 2)
    }
    
    // 生成中インジケーター
    if (isGenerating) {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.8)'
      ctx.fillRect(0, 0, width, height)
      
      ctx.fillStyle = '#ffffff'
      ctx.font = '24px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('音声生成中...', width / 2, height / 2)
    }
    
  }, [dynamicCanvasRef, canvasSize, state, transforms, NOTE_HEIGHT, drawNoteWithPhoneme, isGenerating, HEADER_HEIGHT, selectionState])

  // タイムラインの描画（スクロール対応・詳細拍数表示付き）
  const drawTimeline = useCallback(() => {
    if (!timelineCanvasRef.current) return
    
    const ctx = timelineCanvasRef.current.getContext('2d')
    const { width } = canvasSize
    
    // キャンバスクリア
    ctx.clearRect(0, 0, width, HEADER_HEIGHT)
    
    // 背景
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, width, HEADER_HEIGHT)
    
    // タイムラインの境界線
    ctx.strokeStyle = '#6b7280'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, HEADER_HEIGHT)
    ctx.lineTo(width, HEADER_HEIGHT)
    ctx.stroke()
    
    const startTime = Math.floor((state.scrollX || 0) / (GRID_WIDTH * (state.zoom || 1)))
    const endTime = startTime + Math.ceil(width / (GRID_WIDTH * (state.zoom || 1))) + 1
    
    // BPMから拍数を計算
    const tempo = state.tempo || 120
    const secondsPerBeat = 60 / tempo
    const beatsPerBar = 4 // 4/4拍子を想定
    const secondsPerBar = secondsPerBeat * beatsPerBar
    
    // 細かいグリッド（16分音符、8分音符など）
    const gridDivisions = [4, 8, 16] // 4分音符、8分音符、16分音符
    const gridLines = []
    
    gridDivisions.forEach(division => {
      const gridInterval = secondsPerBeat / division
      const startGridIndex = Math.floor(startTime / gridInterval)
      const endGridIndex = Math.ceil(endTime / gridInterval)
      
      for (let i = startGridIndex; i <= endGridIndex; i++) {
        const gridTime = i * gridInterval
        if (gridTime < startTime || gridTime > endTime) continue
        
        const x = transforms.timeToX(gridTime)
        if (x < -50 || x > width + 50) continue
        
        // 拍の倍数でない場合のみ表示（重複を避ける）
        if (Math.abs(gridTime % secondsPerBeat) > 0.001) {
          gridLines.push({
            x,
            division,
            opacity: division === 4 ? 0.3 : division === 8 ? 0.2 : 0.1
          })
        }
      }
    })
    
    // 細かいグリッドを描画
    gridLines.forEach(line => {
      ctx.strokeStyle = '#374151'
      ctx.globalAlpha = line.opacity
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(line.x, HEADER_HEIGHT)
      ctx.lineTo(line.x, HEADER_HEIGHT + 10)
      ctx.stroke()
    })
    
    // 拍のグリッドを描画
    const startBeatIndex = Math.floor(startTime / secondsPerBeat)
    const endBeatIndex = Math.ceil(endTime / secondsPerBeat)
    for (let i = startBeatIndex; i <= endBeatIndex; i++) {
      const beatTime = i * secondsPerBeat
      if (beatTime < startTime || beatTime > endTime) continue
      
      const x = transforms.timeToX(beatTime)
      if (x < -50 || x > width + 50) continue
      
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#6b7280'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, HEADER_HEIGHT)
      ctx.lineTo(x, HEADER_HEIGHT + 15)
      ctx.stroke()

      // 小節線を太く
      if (i % beatsPerBar === 0) {
        ctx.strokeStyle = '#9ca3af'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, HEADER_HEIGHT)
        ctx.lineTo(x, HEADER_HEIGHT + 20)
        ctx.stroke()
        ctx.strokeStyle = '#6b7280'
        ctx.lineWidth = 1
      }
    }
    
    // 小節番号を表示（BPM対応）
    ctx.fillStyle = '#e5e7eb'
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    
    const startBarIndex = Math.floor(startTime / secondsPerBar)
    const endBarIndex = Math.ceil(endTime / secondsPerBar)
    for (let i = startBarIndex; i <= endBarIndex; i++) {
      const barTime = i * secondsPerBar
      if (barTime < startTime || barTime > endTime) continue
      
      const x = transforms.timeToX(barTime)
      if (x < -20 || x > width + 20) continue
      ctx.fillText(i.toString(), x, 25)
    }
    
    // 拍番号を表示（BPM対応）- 1,2,3,4 の形式
    ctx.font = '10px monospace'
    const startBeatLabelIndex = Math.floor(startTime / secondsPerBeat)
    const endBeatLabelIndex = Math.ceil(endTime / secondsPerBeat)
    for (let i = startBeatLabelIndex; i <= endBeatLabelIndex; i++) {
      const beatTime = i * secondsPerBeat
      if (beatTime < startTime || beatTime > endTime) continue
      
      const x = transforms.timeToX(beatTime)
      if (x < -10 || x > width + 10) continue
      const beatInBar = (i % beatsPerBar) + 1
      ctx.fillText(beatInBar.toString(), x, 15)
    }

    // 秒数表示を追加（タイムライン上部）
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    const timeInterval = Math.max(1, Math.floor((endTime - startTime) / 10)) // 適切な間隔で秒数表示
    for (let time = Math.ceil(startTime / timeInterval) * timeInterval; time <= endTime; time += timeInterval) {
      const x = transforms.timeToX(time)
      if (x < -30 || x > width + 30) continue
      
      // 秒数を分:秒.ミリ秒形式で表示
      const mins = Math.floor(time / 60)
      const secs = Math.floor(time % 60)
      const ms = Math.floor((time % 1) * 100)
      const timeText = `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
      
      ctx.fillStyle = '#9ca3af'
      ctx.fillText(timeText, x + 5, 10)
    }
    
  }, [timelineCanvasRef, canvasSize, state, transforms, GRID_WIDTH, HEADER_HEIGHT])

  // 描画の実行
  const draw = useCallback(() => {
    drawStatic()
    drawDynamic()
    drawTimeline()
  }, [drawStatic, drawDynamic, drawTimeline])

  // 初期描画とリサイズ時の再描画
  useEffect(() => {
    updateCanvasSize()
    draw()
  }, [updateCanvasSize, draw])

  // 状態変更時の再描画
  useEffect(() => {
    draw()
  }, [state.notes, state.isPlaying, state.currentTime, state.selectedNotes, notePhonemes, isGenerating, draw])

  // マウスイベントハンドラー
  const handleMouseDown = useCallback((e) => {
    console.log('DiffSingerCanvas: handleMouseDown called', e.button, e.clientX, e.clientY)
    
    if (e.button === 2) return
    
    const rect = dynamicCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    console.log('DiffSingerCanvas: coordinates', x, y, 'PIANO_WIDTH:', PIANO_WIDTH)
    
    if (x < PIANO_WIDTH) {
      // ピアノロール部分のクリック
      const pitch = transforms.yToPitch(y)
      console.log('DiffSingerCanvas: piano roll click, pitch:', pitch)
      if (pitch >= OCTAVE_RANGE[0] * 12 && pitch <= OCTAVE_RANGE[1] * 12 + 11) {
        // 音を鳴らす（コンソールと同じ方法）
        if (state.audioEnabled && window.unifiedAudioSystem) {
          console.log(`🎹 DiffSinger ピアノロールクリック: キー ${pitch} を再生`);
          window.unifiedAudioSystem.playPianoNote(pitch, 0.24); // コンソールと同じ音量0.24
        }
      }
      return
    }

    const pitch = transforms.yToPitch(y)
    const time = transforms.xToTime(x)
    
    console.log('DiffSingerCanvas: note area click', pitch, time)
    
    if (pitch < OCTAVE_RANGE[0] * 12 || pitch > OCTAVE_RANGE[1] * 12 + 11) return
    if (time < 0 || time > transforms.maxTime) return
    
    const snappedTime = Math.round(time * 4) / 4
    const snappedPitch = Math.round(pitch)
    
    console.log('DiffSingerCanvas: snapped values', snappedPitch, snappedTime)

    // クリックされたノートを取得
    const clickedNote = getNoteAtPosition(x, y)
    
    if (clickedNote) {
      console.log('DiffSingerCanvas: clicked existing note', clickedNote.id)
      
      // リサイズエリアの判定
      const resizeDirection = getResizeArea(clickedNote, x)
      
      if (resizeDirection) {
        // リサイズモード開始
        setNoteOperationState(prev => ({
          ...prev,
          isResizing: true,
          resizeDirection,
          dragStartPos: { x, y },
          dragStartNote: clickedNote,
          selectedNotes: new Set([clickedNote.id]),
          // リサイズ開始時の元のノート状態を保存
          originalNoteStates: {
            [clickedNote.id]: {
              time: clickedNote.time,
              start: clickedNote.start,
              duration: clickedNote.duration,
              pitch: clickedNote.pitch
            }
          }
        }))
        onNoteSelect?.(clickedNote.id)
        onSelectionChange?.([clickedNote.id])
        return
      }

      // ドラッグモード開始
      const isSelected = selectedNoteIds.includes(clickedNote.id)
      
      if (e.shiftKey) {
        // Shift+クリックで複数選択
        let newSelectedIds
        if (isSelected) {
          newSelectedIds = selectedNoteIds.filter(id => id !== clickedNote.id)
        } else {
          newSelectedIds = [...selectedNoteIds, clickedNote.id]
        }
        
        onSelectionChange?.(newSelectedIds)
        onNoteSelect?.(clickedNote.id)
      } else {
        // 通常の選択とドラッグ開始
        if (!isSelected) {
          // 選択されていないノートをクリックした場合は、そのノートのみを選択
          onSelectionChange?.([clickedNote.id])
          onNoteSelect?.(clickedNote.id)
        }
        
        // 選択されたすべてのノートの元の状態を保存
        const selectedNotes = isSelected ? selectedNoteIds : [clickedNote.id]
        
        const originalNoteStates = {}
        selectedNotes.forEach(noteId => {
          const note = state.notes.find(n => n.id === noteId)
          if (note) {
            originalNoteStates[noteId] = {
              time: note.time,
              start: note.start,
              duration: note.duration,
              pitch: note.pitch
            }
          }
        })
        
        setNoteOperationState(prev => ({
          ...prev,
          isDragging: true,
          dragStartPos: { x, y },
          dragStartNote: clickedNote,
          dragOffset: { x: 0, y: 0 },
          originalNoteStates: originalNoteStates
        }))
      }
      return
    }

    // ノートがクリックされていない場合
    if (e.shiftKey) {
      // Shift+ドラッグで選択範囲を作成
      setSelectionState({
        isSelecting: true,
        selectionStart: { x, y },
        selectionEnd: { x, y },
        selectionBox: null
      })
      return
    }

    // 選択をクリア（空の領域をクリックした場合）
    onSelectionChange?.([])
    onNoteSelect?.(null)

    // 新しいノートの作成（Shiftキーが押されていない場合のみ）
    console.log('DiffSingerCanvas: creating new note', snappedPitch, snappedTime)
    if (onNoteAdd) {
      const newNote = {
        id: 'note-' + Date.now(),
        pitch: snappedPitch,
        time: snappedTime,
        start: snappedTime,
        duration: 0.25,
        velocity: 0.8,
        lyric: '',
        phoneme: 'a',
        vocalParams: { ...vocalParams }
      }
      console.log('DiffSingerCanvas: calling onNoteAdd with', newNote)
      onNoteAdd(newNote)
    } else {
      console.log('DiffSingerCanvas: onNoteAdd is not available')
    }
  }, [transforms, state.notes, state.audioEnabled, vocalParams, onNoteSelect, onNoteAdd, onSelectionChange, selectedNoteIds, PIANO_WIDTH, OCTAVE_RANGE, NOTE_HEIGHT, getNoteAtPosition, getResizeArea])

  const handleMouseMove = useCallback((e) => {
    const rect = dynamicCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 選択範囲のドラッグ処理
    if (selectionState.isSelecting) {
      setSelectionState(prev => ({
        ...prev,
        selectionEnd: { x, y }
      }))
      
      // 選択範囲内のノートを取得
      const selectedNotes = getNotesInSelectionBox(
        selectionState.selectionStart.x,
        selectionState.selectionStart.y,
        x,
        y
      )
      
      const selectedIds = selectedNotes.map(note => note.id)
      onSelectionChange?.(selectedIds)
      return
    }

    // カーソルスタイルの更新
    const container = containerRef.current
    if (container) {
      // ノート上にホバーしているかチェック
      const hoveredNote = getNoteAtPosition(x, y)
      if (hoveredNote) {
        const isSelected = selectedNoteIds.includes(hoveredNote.id)
        if (isSelected) {
          // 選択されたノートのリサイズエリアをチェック
          const resizeDirection = getResizeArea(hoveredNote, x)
          if (resizeDirection === 'left' || resizeDirection === 'right') {
            container.style.cursor = 'ew-resize'
          } else {
            container.style.cursor = 'move'
          }
        } else {
          container.style.cursor = 'pointer'
        }
      } else {
        container.style.cursor = 'default'
      }
    }

    // ドラッグ処理
    if (noteOperationState.isDragging && noteOperationState.dragStartNote) {
      const deltaX = x - noteOperationState.dragStartPos.x
      const deltaY = y - noteOperationState.dragStartPos.y
      
      // 座標変換を直接計算（累積誤差を防ぐ）
      const deltaTime = deltaX / (GRID_WIDTH * (state.zoom || 1))
      const deltaPitch = -deltaY / GRID_HEIGHT // 上下移動の方向を修正
      
      console.log('DiffSingerCanvas: dragging', { deltaX, deltaY, deltaTime, deltaPitch })
      
      // 選択されたノートを移動
      selectedNoteIds.forEach(noteId => {
        const originalState = noteOperationState.originalNoteStates[noteId]
        if (originalState) {
          const newTime = originalState.time + deltaTime
          const newPitch = originalState.pitch + deltaPitch
          const snapped = snapToGrid(newTime, newPitch)
          
          console.log('DiffSingerCanvas: moving note', noteId, { 
            original: originalState, 
            new: { time: snapped.time, pitch: snapped.pitch } 
          })
          
          // ノート編集を呼び出し
          if (onNoteEdit) {
            onNoteEdit(noteId, {
              time: snapped.time,
              start: snapped.time,
              pitch: snapped.pitch
            })
          }
        }
      })
    }

    // リサイズ処理
    if (noteOperationState.isResizing && noteOperationState.dragStartNote) {
      const deltaX = x - noteOperationState.dragStartPos.x
      const deltaTime = deltaX / (GRID_WIDTH * (state.zoom || 1))
      
      console.log('DiffSingerCanvas: resizing', { 
        deltaX, 
        deltaTime, 
        direction: noteOperationState.resizeDirection 
      })
      
      selectedNoteIds.forEach(noteId => {
        const originalState = noteOperationState.originalNoteStates[noteId]
        if (originalState) {
          let newStart = originalState.start
          let newDuration = originalState.duration
          
          if (noteOperationState.resizeDirection === 'left') {
            newStart = originalState.start + deltaTime
            newDuration = originalState.duration - deltaTime
          } else if (noteOperationState.resizeDirection === 'right') {
            newDuration = originalState.duration + deltaTime
          }
          
          // 最小値を確保
          newDuration = Math.max(0.1, newDuration)
          newStart = Math.max(0, newStart)
          
          const snappedStart = snapToGrid(newStart, originalState.pitch).time
          const snappedDuration = Math.round(newDuration * 4) / 4
          
          console.log('DiffSingerCanvas: resizing note', noteId, { 
            original: originalState, 
            new: { start: snappedStart, duration: snappedDuration } 
          })
          
          // ノート編集を呼び出し
          if (onNoteEdit) {
            onNoteEdit(noteId, {
              start: snappedStart,
              time: snappedStart,
              duration: snappedDuration
            })
          }
        }
      })
    }

    // ツールチップ表示
    if (!noteOperationState.isDragging && !noteOperationState.isResizing && !selectionState.isSelecting) {
      const note = getNoteAtPosition(x, y)
      if (note && notePhonemes[note.id]) {
        setShowPhonemeTooltip(true)
        setTooltipPosition({ x: e.clientX, y: e.clientY })
        setTooltipContent(`${note.pitch}: ${notePhonemes[note.id]}`)
      } else {
        setShowPhonemeTooltip(false)
      }
      
      // カーソル変更処理
      if (x >= PIANO_WIDTH) {
        const pitch = transforms.yToPitch(y)
        const time = transforms.xToTime(x)
        
        if (pitch >= OCTAVE_RANGE[0] * 12 && pitch <= OCTAVE_RANGE[1] * 12 + 11 && 
            time >= 0 && time <= transforms.maxTime) {
          
          if (note) {
            const resizeDirection = getResizeArea(note, x)
            if (resizeDirection) {
              // リサイズエリアにカーソルがある場合
              e.currentTarget.style.cursor = 'ew-resize'
            } else {
              // ノートの中央部分にカーソルがある場合
              e.currentTarget.style.cursor = 'pointer'
            }
          } else {
            // ノートがない場所
            e.currentTarget.style.cursor = 'default'
          }
        } else {
          e.currentTarget.style.cursor = 'default'
        }
      }
    }
  }, [noteOperationState, selectionState, transforms, state.notes, onNoteEdit, onSelectionChange, snapToGrid, getNoteAtPosition, getNotesInSelectionBox, selectedNoteIds, notePhonemes, PIANO_WIDTH, OCTAVE_RANGE, getResizeArea])

  const handleMouseUp = useCallback((e) => {
    // 選択範囲のドラッグ終了
    if (selectionState.isSelecting) {
      setSelectionState(prev => ({
        ...prev,
        isSelecting: false,
        selectionBox: null
      }))
    }
    
    // ドラッグまたはリサイズの終了
    if (noteOperationState.isDragging || noteOperationState.isResizing) {
      setNoteOperationState(prev => ({
        ...prev,
        isDragging: false,
        isResizing: false,
        dragStartNote: null,
        resizeDirection: null,
        originalNoteStates: {} // 元の状態をクリア
      }))
      
      // カーソルをリセット
      const container = containerRef.current
      if (container) {
        container.style.cursor = 'default'
      }
    }
  }, [noteOperationState.isDragging, noteOperationState.isResizing, selectionState.isSelecting])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    
    // コンテキストメニューの処理
    const rect = dynamicCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (x >= PIANO_WIDTH) {
      const pitch = transforms.yToPitch(y)
      const time = transforms.xToTime(x)
      
      const clickedNote = state.notes?.find(note => {
        const noteX = transforms.timeToX(note.time || note.start)
        const noteY = transforms.pitchToY(note.pitch)
        const noteWidth = transforms.durationToWidth(note.duration)
        const noteHeight = NOTE_HEIGHT
        
        return x >= noteX && x <= noteX + noteWidth && y >= noteY && y <= noteY + noteHeight
      })

      if (clickedNote) {
        // ノートのコンテキストメニュー
        showNoteContextMenu(e, clickedNote)
      } else {
        // 空の領域のコンテキストメニュー
        showEmptyAreaContextMenu(e, time, pitch)
      }
    }
  }, [transforms, state.notes, PIANO_WIDTH, NOTE_HEIGHT])

  // ノートのコンテキストメニュー
  const showNoteContextMenu = useCallback((e, note) => {
    const menu = document.createElement('div')
    menu.className = 'diffsinger-context-menu'
    menu.style.cssText = `
      position: fixed;
      top: ${e.clientY}px;
      left: ${e.clientX}px;
      background: #1f2937;
      border: 1px solid #4b5563;
      border-radius: 8px;
      padding: 6px 0;
      z-index: 9999;
      font-size: 13px;
      color: #f9fafb;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      min-width: 160px;
    `
    
    const menuItems = [
      { text: '歌詞を設定', action: () => onNoteSelect?.(note.id) },
      { text: 'ノートを削除', action: () => {
        console.log('DiffSingerCanvas: ノート削除', note.id)
        if (onNoteEdit) {
          // ノート削除のための特別な処理
          onNoteEdit(note.id, { _delete: true })
        }
      }, destructive: true },
      { text: 'コピー', action: () => {/* コピー処理 */} },
      { text: 'カット', action: () => {/* カット処理 */} }
    ]
    
    menuItems.forEach(item => {
      const menuItem = document.createElement('div')
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        transition: background-color 0.15s ease;
        ${item.destructive ? 'color: #ef4444;' : ''}
      `
      menuItem.textContent = item.text
      menuItem.onclick = () => {
        item.action()
        document.body.removeChild(menu)
      }
      menuItem.onmouseenter = () => {
        menuItem.style.backgroundColor = '#374151'
      }
      menuItem.onmouseleave = () => {
        menuItem.style.backgroundColor = 'transparent'
      }
      menu.appendChild(menuItem)
    })
    
    document.body.appendChild(menu)
    
    // メニュー外クリックで閉じる
    const closeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu)
      }
      document.removeEventListener('click', closeMenu)
    }
    document.addEventListener('click', closeMenu)
  }, [onNoteSelect])

  // 空の領域のコンテキストメニュー
  const showEmptyAreaContextMenu = useCallback((e, time, pitch) => {
    const menu = document.createElement('div')
    menu.className = 'diffsinger-context-menu'
    menu.style.cssText = `
      position: fixed;
      top: ${e.clientY}px;
      left: ${e.clientX}px;
      background: #1f2937;
      border: 1px solid #4b5563;
      border-radius: 8px;
      padding: 6px 0;
      z-index: 9999;
      font-size: 13px;
      color: #f9fafb;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      min-width: 160px;
    `
    
    const menuItems = [
      { text: 'ノートを追加', action: () => {
        const newNote = {
          id: 'note-' + Date.now(),
          pitch: Math.round(pitch),
          time: Math.round(time * 4) / 4,
          start: Math.round(time * 4) / 4,
          duration: 0.25,
          velocity: 0.8,
          lyric: '',
          phoneme: '',
          vocalParams: { ...vocalParams }
        }
        // ノート追加処理（必要に応じて実装）
      }},
      { text: 'ペースト', action: () => {/* ペースト処理 */} }
    ]
    
    menuItems.forEach(item => {
      const menuItem = document.createElement('div')
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        transition: background-color 0.15s ease;
      `
      menuItem.textContent = item.text
      menuItem.onclick = () => {
        item.action()
        document.body.removeChild(menu)
      }
      menuItem.onmouseenter = () => {
        menuItem.style.backgroundColor = '#374151'
      }
      menuItem.onmouseleave = () => {
        menuItem.style.backgroundColor = 'transparent'
      }
      menu.appendChild(menuItem)
    })
    
    document.body.appendChild(menu)
    
    // メニュー外クリックで閉じる
    const closeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu)
      }
      document.removeEventListener('click', closeMenu)
    }
    document.addEventListener('click', closeMenu)
  }, [vocalParams])

  // ホイールイベントハンドラー（スクロール機能）
  const handleWheel = useCallback((e) => {
    // スクロール速度の調整
    const scrollSpeed = 1.0
    const deltaX = e.deltaX * scrollSpeed
    const deltaY = e.deltaY * scrollSpeed
    
    if (e.shiftKey) {
      // Shiftキーが押されている場合は横スクロール
      const newScrollX = Math.max(0, Math.min(transforms.maxScrollX, (state.scrollX || 0) - deltaY));
      if (state.setScrollX) state.setScrollX(newScrollX);
      if (state.setNeedsRedraw) state.setNeedsRedraw(true);
    } else {
      // 通常の縦スクロール
      const newScrollY = Math.max(0, Math.min(transforms.maxScrollY, (state.scrollY || 0) + deltaY));
      if (state.setScrollY) state.setScrollY(newScrollY);
      if (state.setNeedsRedraw) state.setNeedsRedraw(true);
    }
  }, [state, transforms])

  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current)
        scrollAnimationRef.current = null
      }
    }
  }, [])

  return (
    <div className="diffsinger-canvas-container relative w-full h-full">
      {/* 音素ツールチップ */}
      {showPhonemeTooltip && (
        <div 
          className="fixed z-50 bg-purple-600 text-white px-2 py-1 rounded text-xs pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 30
          }}
        >
          {tooltipContent}
        </div>
      )}
      
      {/* キャンバス要素 */}
      <div 
        ref={containerRef}
        className="absolute inset-0 overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        style={{ 
          minHeight: '400px',
          maxHeight: 'calc(100vh - 100px)',
          overflowX: 'hidden',
          overflowY: 'hidden',
          cursor: 'default'
        }}
      >
        <canvas
          ref={staticCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 1 }}
        />
        <canvas
          ref={dynamicCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 2 }}
        />
        <canvas
          ref={timelineCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 3 }}
        />
      </div>
      
      {/* 横スクロールバー */}
      {transforms.maxScrollX > 0 && (
        <div
          className="absolute left-0 right-0 bottom-0 h-6 bg-gray-800/80 border-t border-gray-600"
          style={{ zIndex: 20 }}
        >
          {/* スクロールバーのトラック */}
          <div
            className="relative w-full h-full flex items-center px-1"
            onMouseDown={(e) => {
              e.stopPropagation()
              
              const rect = e.currentTarget.getBoundingClientRect()
              const clickX = e.clientX - rect.left - 4
              const scrollBarWidth = rect.width - 8
              
              const visibleWidth = containerRef.current?.clientWidth || 800
              const totalWidth = transforms.maxTime * GRID_WIDTH * (state.zoom || 1)
              const scrollBarThumbWidth = Math.max(20, (visibleWidth / totalWidth) * scrollBarWidth)
              const scrollBarTrackWidth = scrollBarWidth - scrollBarThumbWidth
              
              const scrollRatio = Math.max(0, Math.min(1, clickX / scrollBarTrackWidth))
              const maxScrollX = transforms.maxScrollX || 0
              const newScrollX = scrollRatio * maxScrollX
              
              smoothScrollTo(newScrollX, state.scrollY || 0, 150)
            }}
          >
            {/* スクロールバーのつまみ */}
            <div
              className="h-4 bg-purple-500 hover:bg-purple-400 rounded cursor-pointer transition-colors shadow-sm"
              style={{
                width: `${Math.max(20, Math.min(100, (containerRef.current?.clientWidth || 800) / (transforms.maxTime * GRID_WIDTH * (state.zoom || 1)) * 100))}%`,
                transform: `translateX(${Math.min(100, Math.max(0, ((state.scrollX || 0) / (transforms.maxScrollX || 1)) * 100))}%)`,
                minWidth: '20px',
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                
                const thumb = e.currentTarget
                const track = thumb.parentElement
                const trackRect = track.getBoundingClientRect()
                const thumbRect = thumb.getBoundingClientRect()
                
                const startX = e.clientX
                const startLeft = thumbRect.left - trackRect.left
                const maxLeft = trackRect.width - thumbRect.width
                
                const handleMouseMove = (e) => {
                  const deltaX = e.clientX - startX
                  const newLeft = Math.max(0, Math.min(maxLeft, startLeft + deltaX))
                  const scrollRatio = newLeft / maxLeft
                  
                  const maxScrollX = transforms.maxScrollX || 0
                  const newScrollX = scrollRatio * maxScrollX
                  
                  if (state.setScrollX) state.setScrollX(newScrollX)
                  if (state.setNeedsRedraw) state.setNeedsRedraw(true)
                }
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove)
                  document.removeEventListener('mouseup', handleMouseUp)
                }
                
                document.addEventListener('mousemove', handleMouseMove)
                document.addEventListener('mouseup', handleMouseUp)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(DiffSingerCanvas)