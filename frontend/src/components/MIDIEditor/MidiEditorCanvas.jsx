import { useRef, useEffect, useCallback, useState, memo } from 'react'
import { calculateVisibleShortcuts, calculateOptimalOctave, calculateOctaveAdjustmentDisplays } from '../../utils/keyboardShortcuts.js'

const MidiEditorCanvas = ({
  // キャンバス関連
  staticCanvasRef,
  dynamicCanvasRef,
  timelineCanvasRef,
  containerRef,
  
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
  
  // Ghost Text関連
  ghostPredictions = [],
  showGhostText = true,
  phrasePredictions = [], // 🎨 [Phase 3] フレーズ予測
  phraseBaseTime,         // 🔧 [FIX] 固定baseTime for position consistency
  nextGhostIndex = 0,     // 🔴 [NEW] Issue #146: Next ghost note to approve
  nextPhraseIndex = 0,    // 🔴 [NEW] Issue #146: Next phrase note to approve
  approvalHistory = [],   // 🔴 [NEW] Issue #146: Approval history

  // イベントハンドラー
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onContextMenu,
  onTimelineClick,
  onScrollbarMouseDown,
  onSmoothScroll, // 滑らかなスクロール関数を親に渡す
  onPianoRollClick, // ピアノロールクリック時の音再生
  
  // Ghost Text関連
  onAcceptPrediction,
  onAcceptAllPredictions,
  onAcceptNextPrediction, // 🔴 [NEW] Issue #146: 一音ずつ承認
  
  // ライブ録音関連
  liveRecordingNotes = new Map(),
  
  // オクターブ調整関連
  manualOctaveOffset = 0
}) => {
  // Ghost Text予測の前回状態を記録するRef
  const lastGhostPredictionsRef = useRef([])
  // アニメーションフレーム用のRef
  const animationFrameRef = useRef(null)
  // スクロールアニメーション用のRefs
  const scrollAnimationRef = useRef(null)
  const scrollStartTimeRef = useRef(0)
  const scrollStartXRef = useRef(0)
  const scrollStartYRef = useRef(0)
  const scrollTargetXRef = useRef(0)
  const scrollTargetYRef = useRef(0)
  const scrollDurationRef = useRef(300) // アニメーション時間（ミリ秒）

  // イージング関数（easeOutCubic）
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

  // 滑らかなスクロールアニメーション
  const smoothScrollTo = useCallback((targetX, targetY, duration = 300) => {
    // 既存のアニメーションを停止
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current)
    }

    const startX = state.scrollX
    const startY = state.scrollY
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
      const maxScrollX = coordinateTransforms.maxScrollX || 0
      const maxScrollY = coordinateTransforms.maxScrollY || 0
      const clampedX = Math.max(0, Math.min(maxScrollX, newX))
      const clampedY = Math.max(0, Math.min(maxScrollY, newY))

      state.setScrollX(clampedX)
      state.setScrollY(clampedY)
      state.setNeedsRedraw(true)

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

  // スクロール速度の調整（慣性スクロール）
  const scrollVelocityRef = useRef({ x: 0, y: 0 })
  const lastWheelTimeRef = useRef(0)
  const wheelDeltaRef = useRef({ x: 0, y: 0 })

  // 慣性スクロールの処理
  const handleInertialScroll = useCallback(() => {
    if (Math.abs(scrollVelocityRef.current.x) < 0.1 && Math.abs(scrollVelocityRef.current.y) < 0.1) {
      return
    }

    const currentX = state.scrollX + scrollVelocityRef.current.x
    const currentY = state.scrollY + scrollVelocityRef.current.y

    const maxScrollX = coordinateTransforms.maxScrollX || 0
    const maxScrollY = coordinateTransforms.maxScrollY || 0
    const clampedX = Math.max(0, Math.min(maxScrollX, currentX))
    const clampedY = Math.max(0, Math.min(maxScrollY, currentY))

    state.setScrollX(clampedX)
    state.setScrollY(clampedY)
    state.setNeedsRedraw(true)

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
  }, [state, coordinateTransforms.maxScrollX, coordinateTransforms.maxScrollY])

  // 静的要素描画関数（最適化版・スクロール対応）
  const drawStaticElements = useCallback(() => {
    const canvas = staticCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // 背景
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, 0, rect.width, rect.height)
    
    // タイムラインUIとの重なりを防ぐため、下部にマージンを追加
    const bottomMargin = 0
    const drawableHeight = rect.height - bottomMargin

        // ピアノロール描画（スクロール対応・シンプルなピアノキーボード）
    const startKey = Math.max(0, Math.floor(state.scrollY / GRID_HEIGHT))
    const endKey = Math.min(TOTAL_KEYS, startKey + Math.ceil(rect.height / GRID_HEIGHT) + 1)
    
    // デバッグ情報をコンソールに出力
    console.log('Piano Roll Debug:', {
      OCTAVE_RANGE,
      TOTAL_KEYS,
      startKey,
      endKey,
      scrollY: state.scrollY,
      rectHeight: rect.height,
      GRID_HEIGHT
    })
    
    for (let i = startKey; i < endKey; i++) {
      const y = HEADER_HEIGHT + i * GRID_HEIGHT - state.scrollY
      const pitch = (OCTAVE_RANGE[0] * 12) + (TOTAL_KEYS - 1 - i)
      
      // 最初と最後のピッチをログに出力
      if (i === startKey || i === endKey - 1) {
        console.log(`Key ${i}: pitch ${pitch} (C${Math.floor(pitch / 12)})`)
      }
      const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12)
      const isPressed = state.pressedKey === pitch || (Array.isArray(state.pressedKey) && state.pressedKey.includes(pitch))
      
      // 白鍵の背景（すべてのキーに共通）
      if (isPressed) {
        ctx.fillStyle = '#3b82f6' // 押された時の青色
      } else {
        ctx.fillStyle = '#f9fafb' // 明るい白
      }
      ctx.fillRect(0, y, PIANO_WIDTH, GRID_HEIGHT)
      
      // 白鍵の枠線
      if (isPressed) {
        ctx.strokeStyle = '#2563eb' // 押された時の青い枠線
      } else {
        ctx.strokeStyle = '#d1d5db'
      }
      ctx.lineWidth = 1
      ctx.strokeRect(0, y, PIANO_WIDTH, GRID_HEIGHT)
      
      // 黒鍵の場合は黒く塗る
      if (isBlackKey) {
        if (isPressed) {
          ctx.fillStyle = '#1e40af' // 押された時の濃い青色
        } else {
          ctx.fillStyle = '#1f2937' // 濃い黒
        }
        ctx.fillRect(0, y, PIANO_WIDTH, GRID_HEIGHT)
        
        // 黒鍵の枠線
        if (isPressed) {
          ctx.strokeStyle = '#1e3a8a' // 押された時の濃い青い枠線
        } else {
          ctx.strokeStyle = '#111827'
        }
        ctx.lineWidth = 1
        ctx.strokeRect(0, y, PIANO_WIDTH, GRID_HEIGHT)
      }

      // ノート名表示（スクロール対応・白鍵のみ）
      if (pitch % 12 === 0) {
        const octave = Math.floor(pitch / 12)
        ctx.fillStyle = '#374151' // 濃いグレーで見やすく
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`C${octave}`, 5, y + 12)
      }



      // キーボードショートカット表示（最適化版）
      const noteInOctave = pitch % 12
      const isWhiteKey = ![1, 3, 6, 8, 10].includes(noteInOctave)
      
      // 白鍵のみにキーボードショートカットを表示（見やすさのため）
      if (isWhiteKey) {
        const shortcuts = calculateVisibleShortcuts(startKey, endKey, state.currentTime, OCTAVE_RANGE, TOTAL_KEYS, state.scrollY, GRID_HEIGHT, manualOctaveOffset)
        const shortcut = shortcuts.find(s => s.keyIndex === i)
        
        if (shortcut) {
          // キーボードショートカットの背景
          const shortcutWidth = 18
          const shortcutHeight = 14
          const shortcutX = PIANO_WIDTH - shortcutWidth - 3
          const shortcutY = y + (GRID_HEIGHT - shortcutHeight) / 2
          
          // 押されているキーの場合は背景色を変更
          const isKeyPressed = state.pressedKey === pitch
          
          // 背景を描画
          ctx.fillStyle = isKeyPressed ? '#3b82f6' : '#f3f4f6'
          ctx.fillRect(shortcutX, shortcutY, shortcutWidth, shortcutHeight)
          
          // 枠線を描画
          ctx.strokeStyle = isKeyPressed ? '#2563eb' : '#d1d5db'
          ctx.lineWidth = 1
          ctx.strokeRect(shortcutX, shortcutY, shortcutWidth, shortcutHeight)
          
          // テキストを描画
          ctx.fillStyle = isKeyPressed ? '#ffffff' : '#374151'
          ctx.font = 'bold 8px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(shortcut.shortcut, shortcutX + shortcutWidth / 2, shortcutY + 10)
        }
      }
      
      // 黒鍵にもキーボードショートカットを表示（小さめ）
      if (!isWhiteKey) {
        const shortcuts = calculateVisibleShortcuts(startKey, endKey, state.currentTime, OCTAVE_RANGE, TOTAL_KEYS, state.scrollY, GRID_HEIGHT, manualOctaveOffset)
        const shortcut = shortcuts.find(s => s.keyIndex === i)
        
        if (shortcut) {
          // キーボードショートカットの背景（黒鍵用、小さめ）
          const shortcutWidth = 14
          const shortcutHeight = 10
          const shortcutX = PIANO_WIDTH - shortcutWidth - 2
          const shortcutY = y + (GRID_HEIGHT - shortcutHeight) / 2
          
          // 押されているキーの場合は背景色を変更
          const isKeyPressed = state.pressedKey === pitch
          
          // 背景を描画
          ctx.fillStyle = isKeyPressed ? '#1e40af' : '#374151'
          ctx.fillRect(shortcutX, shortcutY, shortcutWidth, shortcutHeight)
          
          // 枠線を描画
          ctx.strokeStyle = isKeyPressed ? '#1e3a8a' : '#1f2937'
          ctx.lineWidth = 1
          ctx.strokeRect(shortcutX, shortcutY, shortcutWidth, shortcutHeight)
          
          // テキストを描画
          ctx.fillStyle = isKeyPressed ? '#ffffff' : '#ffffff'
          ctx.font = 'bold 7px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(shortcut.shortcut, shortcutX + shortcutWidth / 2, shortcutY + 7)
        }
      }
    }
    
      // ライブ録音中のノートIDを取得
  const getLiveRecordingNoteIds = () => {
    return Array.from(liveRecordingNotes.values()).map(data => data.noteId)
  }
  
  // オクターブ調整表示（AとJキーの位置に表示）
  const octaveDisplays = calculateOctaveAdjustmentDisplays(startKey, endKey, state.currentTime, OCTAVE_RANGE, TOTAL_KEYS, state.scrollY, GRID_HEIGHT, manualOctaveOffset)
    
    octaveDisplays.forEach(display => {
      const y = HEADER_HEIGHT + display.keyIndex * GRID_HEIGHT - state.scrollY
      const currentOctave = calculateOptimalOctave(state.scrollY, state.currentTime, OCTAVE_RANGE, TOTAL_KEYS, GRID_HEIGHT, manualOctaveOffset)
      
      // オクターブ調整表示の背景
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)' // 半透明の青
      ctx.fillRect(PIANO_WIDTH - 55, y + 2, 50, 12)
      
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = 1
      ctx.strokeRect(PIANO_WIDTH - 55, y + 2, 50, 12)
      
      // テキストを描画
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 8px monospace'
      ctx.textAlign = 'center'
      
      if (display.type === 'up') {
        ctx.fillText(`↑[R] ${currentOctave}`, PIANO_WIDTH - 30, y + 10)
      } else if (display.type === 'down') {
        ctx.fillText(`↓[Q] ${currentOctave}`, PIANO_WIDTH - 30, y + 10)
      }
    })
    
    // ピアノロールの縦グリッド線（音階の区切り）
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    
    // オクターブごとの区切り線（太く）
    for (let i = startKey; i <= endKey; i++) {
      const pitch = (OCTAVE_RANGE[0] * 12) + (TOTAL_KEYS - 1 - i)
      if (pitch % 12 === 0) { // Cノートの位置
        const y = HEADER_HEIGHT + i * GRID_HEIGHT - state.scrollY
        ctx.strokeStyle = '#9ca3af' // 濃いグレー
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(PIANO_WIDTH, y)
        ctx.lineTo(rect.width, y)
        ctx.stroke()
      }
    }
    
    // 黒鍵の下のグリッド線（少し黒く）
    for (let i = startKey; i <= endKey; i++) {
      const pitch = (OCTAVE_RANGE[0] * 12) + (TOTAL_KEYS - 1 - i)
      const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12)
      
      if (isBlackKey) {
        const y = HEADER_HEIGHT + i * GRID_HEIGHT - state.scrollY
        ctx.strokeStyle = '#374151' // 少し黒いグレー
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(PIANO_WIDTH, y)
        ctx.lineTo(rect.width, y)
        ctx.stroke()
      }
    }

    // 時間軸グリッド（BPM対応・スクロール対応）
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 1
    
    // BPMに基づくグリッド計算
    const secondsPerBeat = 60 / state.tempo
    const beatsPerBar = 4 // 4/4拍子を仮定
    const secondsPerBar = secondsPerBeat * beatsPerBar
    
    // 曲の最大時間を計算（ArrangementViewの設定を優先）
    const calculateMaxTime = () => {
      // プロジェクトマネージャーからArrangementViewの曲の長さを取得
      if (window.projectManager?.getProject()?.settings?.duration) {
        const projectDuration = window.projectManager.getProject().settings.duration / 1000
        return Math.max(30, Math.min(600, projectDuration))
      }
      
      if (state.notes && state.notes.length > 0) {
        const maxNoteEnd = Math.max(...state.notes.map(note => (note.time || note.start || 0) + (note.duration || 1)))
        return Math.max(30, Math.min(600, maxNoteEnd + 10))
      }
      return 60
    }
    
    const maxTime = calculateMaxTime()
    
    // スクロール位置に基づいて表示範囲を計算（修正版）
    const startTime = Math.max(0, state.scrollX / (GRID_WIDTH * state.zoom))
    const visibleWidth = rect.width - PIANO_WIDTH
    const endTime = Math.min(maxTime, startTime + visibleWidth / (GRID_WIDTH * state.zoom))
    
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
        
        const x = coordinateTransforms.timeToX(gridTime)
        if (x < -50 || x > rect.width + 50) continue
        
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
    
    // 細かいグリッドを描画（タイムライン部分は除外）
    gridLines.forEach(line => {
      ctx.strokeStyle = '#374151'
      ctx.globalAlpha = line.opacity
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(line.x, HEADER_HEIGHT) // タイムライン部分を除外して開始
      ctx.lineTo(line.x, drawableHeight)
      ctx.stroke()
    })
    
    // 拍のグリッドを描画（タイムライン部分は除外）
    const startBeatIndex = Math.floor(startTime / secondsPerBeat)
    const endBeatIndex = Math.ceil(endTime / secondsPerBeat)
    for (let i = startBeatIndex; i <= endBeatIndex; i++) {
      const beatTime = i * secondsPerBeat
      if (beatTime < startTime || beatTime > endTime) continue
      
      const x = coordinateTransforms.timeToX(beatTime)
      if (x < -50 || x > rect.width + 50) continue
      
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#6b7280'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, HEADER_HEIGHT) // タイムライン部分を除外して開始
      ctx.lineTo(x, drawableHeight)
      ctx.stroke()

      // 小節線を太く
      if (i % beatsPerBar === 0) {
        ctx.strokeStyle = '#9ca3af'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, HEADER_HEIGHT) // タイムライン部分を除外して開始
        ctx.lineTo(x, drawableHeight)
        ctx.stroke()
        ctx.strokeStyle = '#6b7280'
        ctx.lineWidth = 1
      }
    }

    // ヘッダー（タイムライン部分）- 不透明にしてノートを隠す
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, rect.width, HEADER_HEIGHT)
    ctx.strokeStyle = '#6b7280'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, HEADER_HEIGHT)
    ctx.lineTo(rect.width, HEADER_HEIGHT)
    ctx.stroke()

    // 時間軸ラベル（秒数ベース・BPM対応・スクロール対応）
    ctx.fillStyle = '#e5e7eb'
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    
    // 小節番号を表示（BPM対応）
    const startBarIndex = Math.floor(startTime / secondsPerBar)
    const endBarIndex = Math.ceil(endTime / secondsPerBar)
    for (let i = startBarIndex; i <= endBarIndex; i++) {
      const barTime = i * secondsPerBar
      if (barTime < startTime || barTime > endTime) continue
      
      const x = coordinateTransforms.timeToX(barTime)
      if (x < -20 || x > rect.width + 20) continue
      ctx.fillText(i.toString(), x, 25)
    }
    
    // 拍番号を表示（BPM対応）
    ctx.font = '10px monospace'
    const startBeatLabelIndex = Math.floor(startTime / secondsPerBeat)
    const endBeatLabelIndex = Math.ceil(endTime / secondsPerBeat)
    for (let i = startBeatLabelIndex; i <= endBeatLabelIndex; i++) {
      const beatTime = i * secondsPerBeat
      if (beatTime < startTime || beatTime > endTime) continue
      
      const x = coordinateTransforms.timeToX(beatTime)
      if (x < -10 || x > rect.width + 10) continue
      const beatInBar = (i % beatsPerBar) + 1
      ctx.fillText(beatInBar.toString(), x, 15)
    }

    // 秒数表示を追加（タイムライン上部）
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    const timeInterval = Math.max(1, Math.floor((endTime - startTime) / 10)) // 適切な間隔で秒数表示
    for (let time = Math.ceil(startTime / timeInterval) * timeInterval; time <= endTime; time += timeInterval) {
      const x = coordinateTransforms.timeToX(time)
      if (x < -30 || x > rect.width + 30) continue
      
      // 秒数を分:秒.ミリ秒形式で表示
      const mins = Math.floor(time / 60)
      const secs = Math.floor(time % 60)
      const ms = Math.floor((time % 1) * 100)
      const timeText = `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
      
      ctx.fillStyle = '#9ca3af'
      ctx.fillText(timeText, x + 5, 10)
    }
  }, [coordinateTransforms, state.scrollX, state.scrollY, state.zoom, staticCanvasRef, GRID_HEIGHT, GRID_WIDTH, PIANO_WIDTH, HEADER_HEIGHT, OCTAVE_RANGE, TOTAL_KEYS, state.tempo, liveRecordingNotes, manualOctaveOffset])

  // 動的要素描画関数（最適化版・ドラッグ中ノート表示追加）
  const drawDynamicElements = useCallback(() => {
    const canvas = dynamicCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    ctx.clearRect(0, 0, rect.width, rect.height)

    // 再生ヘッド描画（改善版）
    const currentTime = state.currentTime || 0
    const playbackX = coordinateTransforms.timeToX(currentTime)

    // 🎨 [Bass Track Debug] playhead描画ログ
    console.log('🎨 [Bass Track Debug] playhead drawing:', {
      currentTime: currentTime,
      playbackX: playbackX,
      isPlaying: state.isPlaying,
      canvasWidth: rect.width,
      coordinateTransformsExists: !!coordinateTransforms?.timeToX,
      withinDrawRange: playbackX >= -50 && playbackX <= rect.width + 50,
      timestamp: Date.now()
    });

    // 再生ヘッドは常に表示（再生中または停止時でも）
    // 描画範囲を広げて、より確実に表示
    if (playbackX >= -50 && playbackX <= rect.width + 50) {
      const bottomMargin = 0
      const drawableHeight = rect.height - bottomMargin
      
      // 再生ヘッドの線を描画（より目立つように）
      ctx.strokeStyle = state.isPlaying ? '#ef4444' : '#6b7280' // 再生中は赤、停止時はグレー
      ctx.lineWidth = state.isPlaying ? 3 : 2
      ctx.setLineDash(state.isPlaying ? [8, 4] : [5, 5])
      ctx.beginPath()
      ctx.moveTo(playbackX, 0)
      ctx.lineTo(playbackX, drawableHeight)
      ctx.stroke()
      ctx.setLineDash([])
      
      // 再生ヘッドの先端に小さな円を描画
      ctx.fillStyle = state.isPlaying ? '#ef4444' : '#6b7280'
      ctx.beginPath()
      ctx.arc(playbackX, HEADER_HEIGHT + 10, state.isPlaying ? 5 : 4, 0, 2 * Math.PI)
      ctx.fill()
      
      // 再生中の場合は追加のエフェクト
      if (state.isPlaying) {
        // 再生ヘッドの周りに光る効果
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(playbackX, HEADER_HEIGHT + 10, 8, 0, 2 * Math.PI)
        ctx.fill()
        ctx.shadowBlur = 0
      }
      

    }

    // ノート描画（バッチ処理で最適化・ドラッグ中ノート除外）
    const notesByColor = new Map()
    
    // 承認待ちノートを優先的に処理
    const pendingNotes = []
    const regularNotes = []
    
    // グローバルな承認セッション状態をチェック
    const hasActiveApprovalSession = window.aiAgentEngine && 
      window.aiAgentEngine.pendingChanges && 
      (window.aiAgentEngine.pendingChanges.sessionId || window.aiAgentEngine.pendingChanges.notes.size > 0)
    
    // 拒否処理中かどうかをチェック
    const isRejectingChanges = window.aiAgentEngine && window.aiAgentEngine.isRejectingChanges
    
    // 承認待ちノートのIDを取得（拒否処理中は取得しない）
    const pendingNoteIds = new Set()
    if (!isRejectingChanges && window.aiAgentEngine && window.aiAgentEngine.getPendingChanges) {
      try {
        const pendingChanges = window.aiAgentEngine.getPendingChanges()
        if (pendingChanges && pendingChanges.notes) {
          pendingChanges.notes.forEach(([noteId, change]) => {
            if (change.type === 'add' && change.newNote) {
              pendingNoteIds.add(change.newNote.id)
            }
          })
        }
      } catch (error) {
        console.warn('Error getting pending changes:', error)
      }
    }
    
    state.notes.forEach(note => {
      // ドラッグ中のノートは除外（後で別途描画）
      if (state.isDraggingNote && state.draggedNote && !state.draggedNote.isBaseNote && note.id === state.draggedNote.id) return
      if (state.isDraggingMultipleNotes && state.draggedNotes.some(draggedNote => draggedNote.id === note.id)) return
      
      // 承認待ちノートの判定を改善（isPendingフラグとpendingNoteIdsの両方をチェック）
      const isPendingNote = !isRejectingChanges && (note.isPending || pendingNoteIds.has(note.id))
      
      if (isPendingNote) {
        pendingNotes.push(note)
      } else {
        regularNotes.push(note)
      }
    })
    
    // 通常のノートを色別に分類
    regularNotes.forEach(note => {
      let color = '#10b981' // デフォルト色
      
      // ライブ録音中のノートは特別な色で表示
      const isLiveRecordingNote = Array.from(liveRecordingNotes.values()).some(recording => recording.noteId === note.id)
      if (isLiveRecordingNote) {
        color = '#f59e0b' // オレンジ色でライブ録音中のノートを表示
      }
      // 選択されたノートは特別な色で表示
      else if (state.selectedNotes.has(note.id)) {
        color = '#3b82f6' // 青色
      }
      // 再生中のノートは特別な色で表示
      else if (state.playbackNotes.has(note.id)) {
        color = '#fbbf24' // 黄色
      }
      
      if (!notesByColor.has(color)) {
        notesByColor.set(color, [])
      }
      notesByColor.get(color).push(note)
    })

    // 承認待ちノートを最初に描画（最前面に表示）
    pendingNotes.forEach(note => {
      const x = coordinateTransforms.timeToX(note.time)
      const y = coordinateTransforms.pitchToY(note.pitch)
      const width = note.duration * GRID_WIDTH * state.zoom
      const height = NOTE_HEIGHT
      
      // 承認待ちのノートの特別な描画（より目立つ表現）
      ctx.fillStyle = '#f97316' // オレンジ色
      ctx.globalAlpha = 0.9 // より濃く
      ctx.fillRect(x, y, width, height)
      ctx.globalAlpha = 1
      
      ctx.strokeStyle = '#ea580c' // 濃いオレンジ色の枠線
      ctx.lineWidth = 3 // より太い枠線
      ctx.strokeRect(x, y, width, height)
      
      // 承認待ちのノートに半透明の白いオーバーレイを追加
      ctx.globalAlpha = 0.5 // 静的な半透明表示
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x + 3, y + 3, width - 6, height - 6)
      ctx.globalAlpha = 1
      
      // 承認待ちインジケーター（目立つオレンジの点）
      ctx.fillStyle = '#f97316'
      ctx.fillRect(x + width - 10, y + 2, 8, 8)
      
      // 承認待ちインジケーターの枠線
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(x + width - 10, y + 2, 8, 8)
      
      // 承認待ちラベルを表示（より目立つ）
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      ctx.globalAlpha = 1
      ctx.fillText('承認待ち', x + width/2, y + height/2 + 3)
      ctx.globalAlpha = 1
      
      // ベロシティ表示
      ctx.globalAlpha = note.velocity
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x, y, width, height)
      ctx.globalAlpha = 1
    })

    // 通常のノートを描画
    notesByColor.forEach((notesGroup, color) => {
      ctx.fillStyle = color
      ctx.strokeStyle = color === '#3b82f6' ? '#1d4ed8' : '#059669' // 選択されたノートは濃い青色の枠線
      ctx.lineWidth = color === '#3b82f6' ? 3 : 1 // 選択されたノートは太い枠線

      notesGroup.forEach(note => {
        const x = coordinateTransforms.timeToX(note.time)
        const y = coordinateTransforms.pitchToY(note.pitch)
        const width = note.duration * GRID_WIDTH * state.zoom
        const height = NOTE_HEIGHT
        
        // 選択されたノートは特別な描画
        if (state.selectedNotes.has(note.id)) {
          // 選択されたノートの背景を明るく
          ctx.fillStyle = '#60a5fa' // 明るい青色
          ctx.fillRect(x, y, width, height)
          
          // 選択されたノートの枠線を太く
          ctx.strokeStyle = '#1d4ed8'
          ctx.lineWidth = 3
          ctx.strokeRect(x, y, width, height)
          
          // 選択インジケーター（四角形）
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(x + 2, y + 2, 6, 6)
          ctx.strokeStyle = '#1d4ed8'
          ctx.lineWidth = 1
          ctx.strokeRect(x + 2, y + 2, 6, 6)
        } else if (state.playbackNotes.has(note.id)) {
          // 再生中のノートの特別な描画
          ctx.fillStyle = '#fbbf24' // 黄色
          ctx.fillRect(x, y, width, height)
          ctx.strokeStyle = '#f59e0b' // 濃い黄色の枠線
          ctx.lineWidth = 2
          ctx.strokeRect(x, y, width, height)
          
          // 再生中のノートにアニメーション効果を追加
          ctx.globalAlpha = 0.8
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(x + 2, y + 2, width - 4, height - 4)
          ctx.globalAlpha = 1
        } else if (Array.from(liveRecordingNotes.values()).some(recording => recording.noteId === note.id)) {
          // ライブ録音中のノートの特別な描画
          ctx.fillStyle = '#f59e0b' // オレンジ色
          ctx.fillRect(x, y, width, height)
          ctx.strokeStyle = '#d97706' // 濃いオレンジ色の枠線
          ctx.lineWidth = 3
          ctx.strokeRect(x, y, width, height)
          
          // ライブ録音中のノートにリアルタイムアニメーション効果を追加
          const time = Date.now() / 1000
          const alpha = 0.6 + 0.4 * Math.sin(time * 4) // 点滅効果
          ctx.globalAlpha = alpha
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(x + 3, y + 3, width - 6, height - 6)
          ctx.globalAlpha = 1
          
          // ライブ録音インジケーター（右端に赤い点）
          ctx.fillStyle = '#ef4444'
          ctx.fillRect(x + width - 8, y + 2, 6, 6)
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1
          ctx.strokeRect(x + width - 8, y + 2, 6, 6)
          
          // ライブ録音ラベル（削除）
          // ctx.fillStyle = '#ffffff'
          // ctx.font = 'bold 8px monospace'
          // ctx.textAlign = 'center'
          // ctx.fillText('LIVE', x + width/2, y + height/2 + 2)
        } else {
          // 通常のノート描画
          ctx.fillRect(x, y, width, height)
          ctx.strokeRect(x, y, width, height)
        }
        
        // ベロシティ表示
        ctx.globalAlpha = note.velocity
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x, y, width, height)
        ctx.globalAlpha = 1
        

      })
    })

    // 複数ノートドラッグ中のノートを特別に描画
    if (state.isDraggingMultipleNotes && state.draggedNotes.length > 0) {
      state.draggedNotes.forEach(note => {
        const x = coordinateTransforms.timeToX(note.time)
        const y = coordinateTransforms.pitchToY(note.pitch)
        const width = note.duration * GRID_WIDTH * state.zoom
        const height = NOTE_HEIGHT
        
        // ドラッグ中ノートを半透明で描画
        ctx.fillStyle = '#3b82f6'
        ctx.globalAlpha = 0.7
        ctx.fillRect(x, y, width, height)
        ctx.globalAlpha = 1
        
        ctx.strokeStyle = '#1d4ed8'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(x, y, width, height)
        ctx.setLineDash([])
        
        // ベロシティ表示
        ctx.globalAlpha = note.velocity
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x, y, width, height)
        ctx.globalAlpha = 1
      })
    }

    // リサイズ中のノートを特別に描画
    if (state.isResizingNote && state.resizingNote) {
      const x = coordinateTransforms.timeToX(state.resizingNote.time)
      const y = coordinateTransforms.pitchToY(state.resizingNote.pitch)
      const width = state.resizingNote.duration * GRID_WIDTH * state.zoom
      const height = NOTE_HEIGHT
      
      // リサイズ中ノートを特別な色で描画
      ctx.fillStyle = '#f59e0b' // オレンジ色
      ctx.globalAlpha = 0.8
      ctx.fillRect(x, y, width, height)
      ctx.globalAlpha = 1
      
      ctx.strokeStyle = '#d97706' // 濃いオレンジ色の枠線
      ctx.lineWidth = 3
      ctx.setLineDash([8, 4])
      ctx.strokeRect(x, y, width, height)
      ctx.setLineDash([])
      
      // リサイズハンドルを強調表示
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x + width - 8, y, 8, height)
      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 2
      ctx.strokeRect(x + width - 8, y, 8, height)
    }

    // 単一ノートドラッグ中のノートを特別に描画
    if (state.isDraggingNote && state.draggedNote) {
      const x = coordinateTransforms.timeToX(state.draggedNote.time)
      const y = coordinateTransforms.pitchToY(state.draggedNote.pitch)
      const width = state.draggedNote.duration * GRID_WIDTH * state.zoom
      const height = NOTE_HEIGHT
      
      // ドラッグ中ノートを半透明で描画
      ctx.fillStyle = '#3b82f6'
      ctx.globalAlpha = 0.7
      ctx.fillRect(x, y, width, height)
      ctx.globalAlpha = 1
      
      ctx.strokeStyle = '#1d4ed8'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(x, y, width, height)
      ctx.setLineDash([])
    }

    // 現在作成中のノート描画
    if (state.currentlyCreatingNote) {
      const x = coordinateTransforms.timeToX(state.currentlyCreatingNote.time)
      const y = coordinateTransforms.pitchToY(state.currentlyCreatingNote.pitch)
      const width = state.currentlyCreatingNote.duration * GRID_WIDTH * state.zoom
      const height = NOTE_HEIGHT
      
      // 作成中ノートを描画（タイムライン部分も含む）
      ctx.fillStyle = '#fbbf24'
      ctx.globalAlpha = 0.7
      ctx.fillRect(x, y, width, height)
      ctx.globalAlpha = 1
      
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(x, y, width, height)
      ctx.setLineDash([])
    }

    // 🔧 修正: フレーズ予測の存在チェック（通常予測との重複を防ぐ）
    const hasPhrasePredictions = Array.isArray(phrasePredictions) && phrasePredictions.length > 0

    // Ghost Text予測描画 (Issue #146: 次に承認するノートをハイライト)
    // 🔧 修正2: フレーズ予測が存在する場合は通常のGhost Text予測を描画しない
    if (showGhostText && Array.isArray(ghostPredictions) && ghostPredictions.length > 0 && !hasPhrasePredictions) {
      ghostPredictions.forEach((prediction, index) => {
        // 予測の時間位置を計算（最後のノートの後ろに配置）
        const lastNoteTime = state.notes.length > 0
          ? Math.max(...state.notes.map(n => n.time + n.duration))
          : 0
        const predictionTime = lastNoteTime + (prediction.timing || 0)

        const x = coordinateTransforms.timeToX(predictionTime)
        const y = coordinateTransforms.pitchToY(prediction.pitch)
        const width = (prediction.duration || 0.25) * GRID_WIDTH * state.zoom
        const height = NOTE_HEIGHT

        // 🔴 [NEW] Check if this is the next note to be approved
        const isNextNote = index === nextGhostIndex

        if (isNextNote) {
          // Next note: higher opacity, bright pink, glowing effect
          ctx.save()
          ctx.globalAlpha = 0.7
          ctx.fillStyle = '#a78bfa' // Bright purple for next note
          ctx.fillRect(x, y, width, height)

          // Glowing border for next note
          ctx.strokeStyle = '#c4b5fd'
          ctx.lineWidth = 3
          ctx.shadowColor = '#a78bfa'
          ctx.shadowBlur = 8
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
          ctx.strokeRect(x, y, width, height)
          ctx.shadowColor = 'transparent'

          // Label for next note
          ctx.globalAlpha = 1
          ctx.fillStyle = '#fbbf24' // Yellow label
          ctx.font = 'bold 11px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('⏎Tab', x + width/2, y + 10)

          // Prediction number (bold)
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 12px monospace'
          ctx.fillText((index + 1).toString(), x + width/2, y + height - 5)
          ctx.restore()
        } else {
          // Other notes: lower opacity, purple color
          ctx.globalAlpha = 0.25
          ctx.fillStyle = '#8b5cf6'
          ctx.fillRect(x, y, width, height)

          // 予測番号を表示（1-indexed）
          ctx.globalAlpha = 0.6
          ctx.fillStyle = '#ffffff'
          ctx.font = '10px monospace'
          ctx.textAlign = 'center'
          ctx.fillText((index + 1).toString(), x + width/2, y + height/2 + 3)

          // 信頼度を表示
          if (prediction.confidence) {
            ctx.globalAlpha = 0.5
            ctx.fillStyle = '#fbbf24'
            ctx.font = '8px monospace'
            ctx.fillText(`${Math.round(prediction.confidence * 100)}%`, x + width/2, y + height - 2)
          }
        }
      })

      ctx.globalAlpha = 1
    }

    // 🎨 [Phase 3] フレーズ予測描画 (Issue #146: 次に承認するノートをハイライト)
    if (showGhostText && hasPhrasePredictions) {
      console.log('🎨 [Phase 3] Drawing phrase predictions:', phrasePredictions.length)

      // 🔴 NEW: フレーズ背景の描画（フレーズ全体の範囲を視覚化）
      if (phrasePredictions.length > 0) {
        // 🔧 [FIX] 固定baseTimeを使用してフレーズ位置ずれを防止
        const useFixedBaseTime = phraseBaseTime !== undefined
        const baseTime = useFixedBaseTime
          ? phraseBaseTime
          : (state.notes.length > 0 ? Math.max(...state.notes.map(n => n.time + n.duration)) : 0)

        // 🚨🚨🚨 [UI_TIMING_DEBUG] フレーズ描画位置計算
        console.log(`🚨🚨🚨 [UI_TIMING_DEBUG] Canvas描画時の計算:`)
        console.log(`🚨🚨🚨 [UI_TIMING_DEBUG]    固定baseTime使用: ${useFixedBaseTime}`)
        console.log(`🚨🚨🚨 [UI_TIMING_DEBUG]    baseTime: ${baseTime}`)
        console.log(`🚨🚨🚨 [UI_TIMING_DEBUG]    phrasePredictions[0].timing: ${phrasePredictions[0]?.timing || 0}`)

        // フレーズの開始時間と終了時間を計算
        const phraseStartTime = baseTime + (phrasePredictions[0]?.timing || 0)

        console.log(`🚨🚨🚨 [UI_TIMING_DEBUG]    計算式: phraseStartTime = baseTime + prediction.timing`)
        console.log(`🚨🚨🚨 [UI_TIMING_DEBUG]    計算式: phraseStartTime = ${baseTime} + ${phrasePredictions[0]?.timing || 0} = ${phraseStartTime}`)
        console.log(`🚨🚨🚨 [UI_TIMING_DEBUG]    🎨 UI描画フレーズ開始位置: ${phraseStartTime}`)
        const phraseEndTime = baseTime + Math.max(
          ...phrasePredictions.map(p => (p.timing || 0) + (p.duration || 0.25))
        )

        const phraseStartX = coordinateTransforms.timeToX(phraseStartTime)
        const phraseEndX = coordinateTransforms.timeToX(phraseEndTime)
        const phraseWidth = phraseEndX - phraseStartX

        // フレーズ背景の描画（キャンバス全体の高さ）
        ctx.save()
        ctx.globalAlpha = 0.08
        ctx.fillStyle = '#10b981' // フレーズカラー（薄い緑）
        ctx.fillRect(phraseStartX, 0, phraseWidth, staticCanvasRef.current.height)

        // フレーズ境界線の描画
        ctx.globalAlpha = 0.2
        ctx.strokeStyle = '#10b981'
        ctx.lineWidth = 2
        ctx.setLineDash([8, 4])
        ctx.beginPath()
        ctx.moveTo(phraseStartX, 0)
        ctx.lineTo(phraseStartX, staticCanvasRef.current.height)
        ctx.stroke()
        ctx.setLineDash([])

        // フレーズラベルの描画
        ctx.globalAlpha = 0.7
        ctx.fillStyle = '#065f46' // 濃い緑
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'left'
        const labelY = HEADER_HEIGHT - 5
        ctx.fillText(`🎵 Phrase (${nextPhraseIndex + 1}/${phrasePredictions.length})`,
                    phraseStartX + 8, labelY)
        ctx.restore()
      }

      phrasePredictions.forEach((prediction, index) => {
        // 🔧 [FIX] 固定baseTimeを使用してフレーズ位置ずれを防止
        const useFixedBaseTime = phraseBaseTime !== undefined
        const baseTime = useFixedBaseTime
          ? phraseBaseTime
          : (state.notes.length > 0 ? Math.max(...state.notes.map(n => n.time + n.duration)) : 0)

        // 相対タイミングを固定baseTimeから加算
        const predictionTime = baseTime + (prediction.timing || 0)

        const x = coordinateTransforms.timeToX(predictionTime)
        const y = coordinateTransforms.pitchToY(prediction.pitch)
        const width = (prediction.duration || 0.25) * GRID_WIDTH * state.zoom
        const height = NOTE_HEIGHT

        const isStrongBeat = prediction.isStrongBeat || false

        // 🔴 [NEW] Check if this is the next phrase note to be approved
        const isNextNote = index === nextPhraseIndex

        // フレーズノートの描画（緑色）
        ctx.save()

        if (isNextNote) {
          // Next phrase note: brighter green with glow
          ctx.globalAlpha = 0.8
          ctx.strokeStyle = '#10b981' // Brighter green
          ctx.fillStyle = '#10b981'
          ctx.lineWidth = 4

          // Glowing effect
          ctx.shadowColor = '#10b981'
          ctx.shadowBlur = 12
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
          ctx.strokeRect(x, y, width, height)
          ctx.shadowColor = 'transparent'

          ctx.globalAlpha = 0.5
          ctx.fillRect(x, y, width, height)

          // Label for next phrase note
          ctx.globalAlpha = 1
          ctx.fillStyle = '#fbbf24' // Yellow label
          ctx.font = 'bold 11px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('⏎Tab', x + width/2, y + 10)
        } else {
          // Other phrase notes: original styling
          ctx.globalAlpha = 0.5
          ctx.strokeStyle = '#4CAF50'
          ctx.fillStyle = '#4CAF50'
          ctx.lineWidth = isStrongBeat ? 3 : 2
          ctx.strokeRect(x, y, width, height)

          ctx.globalAlpha = 0.3
          ctx.fillRect(x, y, width, height)

          // インジケーター
          ctx.globalAlpha = 0.5
          if (isStrongBeat) {
            // 強拍: 金色のインジケーター
            ctx.fillStyle = '#FFD700'
            ctx.font = 'bold 14px Arial'
            ctx.fillText('●', x + 5, y + height - 5)
          } else {
            // 弱拍: 音符アイコン
            ctx.fillStyle = '#FFFFFF'
            ctx.font = '12px Arial'
            ctx.fillText('♪', x + 5, y + height - 5)
          }
        }

        ctx.restore()
      })

      console.log('🎨 [Phase 3] Phrase predictions drawn')
    }


    // 選択範囲の描画
    if (state.selectionBox) {
      const startX = coordinateTransforms.timeToX(state.selectionBox.startTime)
      const endX = coordinateTransforms.timeToX(state.selectionBox.endTime)
      const startY = coordinateTransforms.pitchToY(state.selectionBox.startPitch)
      const endY = coordinateTransforms.pitchToY(state.selectionBox.endPitch)
      
      const selectionWidth = endX - startX
      const selectionHeight = endY - startY
      
      // 選択範囲を半透明の青色で描画
      ctx.fillStyle = '#3b82f6'
      ctx.globalAlpha = 0.2
      ctx.fillRect(startX, startY, selectionWidth, selectionHeight)
      ctx.globalAlpha = 1
      
      // 選択範囲の枠線を描画
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(startX, startY, selectionWidth, selectionHeight)
      ctx.setLineDash([])
    }
  }, [state.notes, state.currentlyCreatingNote, ghostPredictions, showGhostText, state.isPlaying, state.currentTime, state.zoom, state.selectedNotes, state.playbackNotes, coordinateTransforms, state.isDraggingNote, state.draggedNote, state.isDraggingMultipleNotes, state.draggedNotes, state.selectionBox, dynamicCanvasRef, GRID_WIDTH, NOTE_HEIGHT, liveRecordingNotes])

  // タイムライン（ヘッダー）部分だけを描画する関数
  const drawTimelineElements = useCallback(() => {
    const canvas = timelineCanvasRef?.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = HEADER_HEIGHT * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // タイムライン背景
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, rect.width, HEADER_HEIGHT);
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_HEIGHT);
    ctx.lineTo(rect.width, HEADER_HEIGHT);
    ctx.stroke();

    // ループ区間の視覚化
    if (state.loopEnabled) {
      const loopStartX = coordinateTransforms.timeToX(state.loopStart);
      const loopEndX = coordinateTransforms.timeToX(state.loopEnd);

      // ループ区間をハイライト表示
      ctx.fillStyle = 'rgba(34, 197, 94, 0.15)'; // 緑色半透明
      ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, HEADER_HEIGHT);

      // ループ開始マーカー
      ctx.strokeStyle = '#22c55e'; // 緑色
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(loopStartX, 0);
      ctx.lineTo(loopStartX, HEADER_HEIGHT);
      ctx.stroke();

      // ループ開始ラベル
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('L', loopStartX + 3, 12);

      // ループ終了マーカー
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(loopEndX, 0);
      ctx.lineTo(loopEndX, HEADER_HEIGHT);
      ctx.stroke();

      // ループ終了ラベル
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('R', loopEndX - 3, 12);
    }

    // 時間軸グリッド（BPM対応・タイムライン専用）
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    
    // BPMに基づくグリッド計算
    const secondsPerBeat = 60 / state.tempo;
    const beatsPerBar = 4; // 4/4拍子を仮定
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    
    // 曲の最大時間を計算（ArrangementViewの設定を優先）
    const calculateMaxTime = () => {
      // プロジェクトマネージャーからArrangementViewの曲の長さを取得
      if (window.projectManager?.getProject()?.settings?.duration) {
        const projectDuration = window.projectManager.getProject().settings.duration / 1000;
        return Math.max(30, Math.min(600, projectDuration));
      }
      
      if (state.notes && state.notes.length > 0) {
        const maxNoteEnd = Math.max(...state.notes.map(note => (note.time || note.start || 0) + (note.duration || 1)));
        return Math.max(30, Math.min(600, maxNoteEnd + 10));
      }
      return 60;
    };
    
    const maxTime = calculateMaxTime();
    const startTime = Math.max(0, state.scrollX / (GRID_WIDTH * state.zoom));
    const visibleWidth = rect.width - PIANO_WIDTH;
    const endTime = Math.min(maxTime, startTime + visibleWidth / (GRID_WIDTH * state.zoom));
    
    // 細かいグリッド（16分音符、8分音符など）- タイムライン専用
    const gridDivisions = [4, 8, 16]; // 4分音符、8分音符、16分音符
    const gridLines = [];
    
    gridDivisions.forEach(division => {
      const gridInterval = secondsPerBeat / division;
      const startGridIndex = Math.floor(startTime / gridInterval);
      const endGridIndex = Math.ceil(endTime / gridInterval);
      
      for (let i = startGridIndex; i <= endGridIndex; i++) {
        const gridTime = i * gridInterval;
        if (gridTime < startTime || gridTime > endTime) continue;
        
        const x = coordinateTransforms.timeToX(gridTime);
        if (x < -50 || x > rect.width + 50) continue;
        
        // 拍の倍数でない場合のみ表示（重複を避ける）
        if (Math.abs(gridTime % secondsPerBeat) > 0.001) {
          gridLines.push({
            x,
            division,
            opacity: division === 4 ? 0.3 : division === 8 ? 0.2 : 0.1
          });
        }
      }
    });
    
    // 細かいグリッドを描画（タイムライン専用）
    gridLines.forEach(line => {
      ctx.strokeStyle = '#374151';
      ctx.globalAlpha = line.opacity;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(line.x, 0);
      ctx.lineTo(line.x, HEADER_HEIGHT);
      ctx.stroke();
    });
    
    // 拍のグリッドを描画（タイムライン専用）
    const startBeatIndex = Math.floor(startTime / secondsPerBeat);
    const endBeatIndex = Math.ceil(endTime / secondsPerBeat);
    for (let i = startBeatIndex; i <= endBeatIndex; i++) {
      const beatTime = i * secondsPerBeat;
      if (beatTime < startTime || beatTime > endTime) continue;
      
      const x = coordinateTransforms.timeToX(beatTime);
      if (x < -50 || x > rect.width + 50) continue;
      
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEADER_HEIGHT);
      ctx.stroke();

      // 小節線を太く
      if (i % beatsPerBar === 0) {
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEADER_HEIGHT);
        ctx.stroke();
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1;
      }
    }

    // 時間軸ラベル（秒数ベース・BPM対応・タイムライン専用）
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    
    // 小節番号を表示（BPM対応）
    const startBarIndex = Math.floor(startTime / secondsPerBar);
    const endBarIndex = Math.ceil(endTime / secondsPerBar);
    for (let i = startBarIndex; i <= endBarIndex; i++) {
      const barTime = i * secondsPerBar;
      if (barTime < startTime || barTime > endTime) continue;
      
      const x = coordinateTransforms.timeToX(barTime);
      if (x < -20 || x > rect.width + 20) continue;
      ctx.fillText(i.toString(), x, 25);
    }
    
    // 拍番号を表示（BPM対応）
    ctx.font = '10px monospace';
    const startBeatLabelIndex = Math.floor(startTime / secondsPerBeat);
    const endBeatLabelIndex = Math.ceil(endTime / secondsPerBeat);
    for (let i = startBeatLabelIndex; i <= endBeatLabelIndex; i++) {
      const beatTime = i * secondsPerBeat;
      if (beatTime < startTime || beatTime > endTime) continue;
      
      const x = coordinateTransforms.timeToX(beatTime);
      if (x < -10 || x > rect.width + 10) continue;
      const beatInBar = (i % beatsPerBar) + 1;
      ctx.fillText(beatInBar.toString(), x, 15);
    }

    // 秒数表示を追加（タイムライン上部）
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    const timeInterval = Math.max(1, Math.floor((endTime - startTime) / 10)); // 適切な間隔で秒数表示
    for (let time = Math.ceil(startTime / timeInterval) * timeInterval; time <= endTime; time += timeInterval) {
      const x = coordinateTransforms.timeToX(time);
      if (x < -30 || x > rect.width + 30) continue;
      
      // 秒数を分:秒.ミリ秒形式で表示
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      const ms = Math.floor((time % 1) * 100);
      const timeText = `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
      
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(timeText, x + 5, 10);
    }
  }, [coordinateTransforms, state.scrollX, state.zoom, state.notes, state.tempo, state.loopEnabled, state.loopStart, state.loopEnd, timelineCanvasRef, HEADER_HEIGHT, GRID_WIDTH, PIANO_WIDTH]);

  // 静的要素の再描画
  useEffect(() => {
    drawStaticElements()
  }, [drawStaticElements, state.scrollX, state.scrollY, state.zoom])

  // タイムライン要素の再描画
  useEffect(() => {
    drawTimelineElements();
  }, [drawTimelineElements, state.scrollX, state.zoom, state.tempo, state.loopEnabled, state.loopStart, state.loopEnd]);

  // コンテナの幅を動的に調整（安定化版）
  useEffect(() => {
    if (containerRef.current) {
      const totalWidth = Math.max(800, coordinateTransforms.maxTime * GRID_WIDTH * state.zoom)
      containerRef.current.style.width = `${totalWidth}px`
      containerRef.current.style.minWidth = `${totalWidth}px`
    }
  }, [coordinateTransforms.maxTime, GRID_WIDTH, state.zoom])

  // 動的要素の再描画（最適化版）
  useEffect(() => {
    const notesChanged = true // 常に再描画
    const ghostChanged = JSON.stringify(ghostPredictions) !== JSON.stringify(lastGhostPredictionsRef.current)
    
    // メニュー表示中は再描画をスキップ
    const menuExists = document.querySelector('.midi-context-menu')
    
    // 必要な場合のみ再描画（タイムラインクリック後の即座更新を確実にする）
    if (notesChanged || ghostChanged || state.needsRedraw || state.isPlaying || state.currentTime !== undefined || state.pressedKey !== null) {
      drawDynamicElements()
      state.setNeedsRedraw(false)
      lastGhostPredictionsRef.current = [...ghostPredictions]
    }
  }, [state.notes, ghostPredictions, drawDynamicElements, state.needsRedraw, state.isPlaying, state.currentTime, state.pressedKey])

  // 再生ヘッドのアニメーション（改善版）
  useEffect(() => {
    if (!state.isPlaying) return
    
    const FRAME_TIME = 1000 / 60 // 60fps
    let lastDrawTime = 0
    
    const animate = (timestamp) => {
      if (timestamp - lastDrawTime >= FRAME_TIME) {
        drawDynamicElements()
        lastDrawTime = timestamp
      }
      
      if (state.isPlaying) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [state.isPlaying, drawDynamicElements, state.currentTime])

  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current)
        scrollAnimationRef.current = null
      }
    }
  }, [])

    // スクロールイベントの滑らかな処理
  // カスタムホイール処理（useEffect）をコメントアウトまたは削除

  // キーボードイベントハンドラー
  const handleKeyDown = useCallback((e) => {
    // 🟠 Problem 2修正: TABキーでフレーズ予測と通常予測の両方をチェック
    const hasGhostPredictions = ghostPredictions.length > 0
    const hasPhrasePredictions = Array.isArray(phrasePredictions) && phrasePredictions.length > 0

    console.log('🎹 handleKeyDown: TAB check', {
      key: e.key,
      hasGhostPredictions,
      hasPhrasePredictions,
      ghostPredictionsCount: ghostPredictions.length,
      phrasePredictionsCount: phrasePredictions?.length || 0
    })

    // Tabキーで予測を受け入れる（フレーズ予測または通常予測）
    if (e.key === 'Tab' && (hasGhostPredictions || hasPhrasePredictions)) {
      try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }

      if (e.shiftKey) {
        // Shift+Tab: 前の予測を選択（通常予測のみ対応）
        if (hasGhostPredictions) {
          const newIndex = (state.selectedPredictionIndex - 1 + ghostPredictions.length) % ghostPredictions.length
          state.setSelectedPredictionIndex(newIndex)
          console.log('🎹 Shift+Tab: 前の予測選択', newIndex)
        }
      } else {
        // 🔴 REMOVED: TAB処理を EnhancedMidiEditor.jsx に統一
        // MidiEditorCanvas での TAB 処理を無効化し、重複を排除
        console.log('🎹 Tab: Processing delegated to EnhancedMidiEditor (avoiding duplication)')

        // TAB キーイベントを上位コンポーネントに委譲
        // EnhancedMidiEditor.jsx が適切に処理します
        return
      }
    }
  }, [onAcceptNextPrediction, onAcceptPrediction, ghostPredictions, phrasePredictions, state.selectedPredictionIndex, state.setSelectedPredictionIndex])

  return (
    <div
      className="flex-1 relative midi-editor-container"
      ref={containerRef}
      tabIndex={0}
      onFocus={() => console.log('MIDI Editor focused')}
      onBlur={() => {}} // ←ここを空に
      onKeyDown={handleKeyDown}
      onClick={() => {
        // MIDIエディター内をクリックした時、コンテナにフォーカスを設定
        // これによりTabキーイベントが確実にキャプチャされる
        if (containerRef.current) {
          containerRef.current.focus()
        }
      }}
      onWheel={e => {
        if (e.shiftKey) {
          try { e.preventDefault(); } catch (error) { console.warn('preventDefault failed:', error); }
          // 無制限に横スクロール
          state.setScrollX(state.scrollX - e.deltaY);
          state.setNeedsRedraw(true);
        } else {
          // 縦スクロール
          try { e.preventDefault(); } catch (error) { console.warn('preventDefault failed:', error); }
          const newScrollY = Math.max(0, Math.min(coordinateTransforms.maxScrollY, state.scrollY + e.deltaY));
          state.setScrollY(newScrollY);
          state.setNeedsRedraw(true);
        }
      }}
      style={{ 
        minHeight: '400px',
        maxHeight: 'calc(100vh - 100px)', // 下まで届くように調整
        overflowX: 'hidden',
        overflowY: 'hidden', // 縦スクロールも隠す
      }}
    >
      <canvas
        ref={staticCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 2 }}
      />
      <canvas
        ref={dynamicCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 3 }}
        onMouseDown={(e) => {
          // 右クリックの場合は処理しない（右クリック専用ハンドラーで処理）
          if (e.button === 2) {
            return
          }
          
          const rect = dynamicCanvasRef.current.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          
          // ピアノロール部分のクリック（音を鳴らす）
          if (x < PIANO_WIDTH && y >= HEADER_HEIGHT) {
            const pitch = coordinateTransforms.yToPitch(y)
            if (pitch >= OCTAVE_RANGE[0] * 12 && pitch <= OCTAVE_RANGE[1] * 12 + 11) {
              // ピアノロールクリック時の音再生
              if (onPianoRollClick) {
                onPianoRollClick(pitch)
              }
              
              // 視覚的な押下感を追加（複数キー対応）
              state.setPressedKey(prev => {
                if (prev === null) return pitch
                if (Array.isArray(prev)) {
                  return [...prev, pitch]
                }
                return [prev, pitch]
              })
              state.setNeedsRedraw(true) // 即座に再描画
              setTimeout(() => {
                state.setPressedKey(prev => {
                  if (prev === null) return null
                  if (Array.isArray(prev)) {
                    const newPressedKeys = prev.filter(key => key !== pitch)
                    return newPressedKeys.length > 0 ? newPressedKeys : null
                  }
                  return prev === pitch ? null : prev
                })
                state.setNeedsRedraw(true) // 元に戻す時も再描画
              }, 150)
              
              // キャンバスの押下感
              const canvas = dynamicCanvasRef.current
              if (canvas) {
                canvas.style.transform = 'scale(0.98)'
                canvas.style.transition = 'transform 0.1s ease-out'
                setTimeout(() => {
                  canvas.style.transform = 'scale(1)'
                }, 100)
              }
            }
            return
          }
          
          // タイムライン部分のクリックは別処理（再生中でも中断して移動）
          if (y < HEADER_HEIGHT && x >= PIANO_WIDTH) {
            console.log('Canvas timeline click detected:', { x, y, HEADER_HEIGHT, PIANO_WIDTH })
            onTimelineClick(e)
            return // タイムラインクリックの場合は他の処理をスキップ
          } else {
            onMouseDown(e)
          }
        }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={(e) => {
          // マウスがキャンバスから離れた時にカーソルをリセット
          if (dynamicCanvasRef.current) {
            dynamicCanvasRef.current.style.cursor = 'default'
          }
          onMouseUp(e)
        }}
        onContextMenu={onContextMenu}
        onWheel={() => {}} // ReactのonWheelは使用しない
      />
      
      {/* 横スクロールバー */}
      {coordinateTransforms.maxScrollX > 0 && (
        <div
          className="absolute left-0 right-0 bottom-0 h-6 bg-gray-800/80 border-t border-gray-600"
          style={{ zIndex: 20 }}
        >
          {/* デバッグ情報 */}
          <div className="absolute top-0 left-0 text-xs text-white bg-black/50 px-1">
            maxScrollX: {coordinateTransforms.maxScrollX.toFixed(0)}
          </div>
          
          {/* スクロールバーのトラック */}
          <div
            className="relative w-full h-full flex items-center px-1"
            onMouseDown={(e) => {
              try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
              e.stopPropagation()
              
              const rect = e.currentTarget.getBoundingClientRect()
              const clickX = e.clientX - rect.left - 4 // パディングを考慮
              const scrollBarWidth = rect.width - 8 // パディングを引く
              
              // スクロールバーの可視部分の幅を計算
              const visibleWidth = containerRef.current?.clientWidth || 800
              const totalWidth = coordinateTransforms.maxTime * GRID_WIDTH * state.zoom
              const scrollBarThumbWidth = Math.max(20, (visibleWidth / totalWidth) * scrollBarWidth)
              
              // スクロールバーの可動範囲を計算
              const scrollBarTrackWidth = scrollBarWidth - scrollBarThumbWidth
              
              // クリック位置からスクロール位置を計算
              const scrollRatio = Math.max(0, Math.min(1, clickX / scrollBarTrackWidth))
              const maxScrollX = coordinateTransforms.maxScrollX || 0
              const newScrollX = scrollRatio * maxScrollX
              
              // 滑らかなスクロールで移動
              smoothScrollTo(newScrollX, state.scrollY, 150)
            }}
          >
            {/* スクロールバーのつまみ */}
            <div
              className="h-4 bg-blue-500 hover:bg-blue-400 rounded cursor-pointer transition-colors shadow-sm"
              style={{
                width: `${Math.max(20, Math.min(100, (containerRef.current?.clientWidth || 800) / (coordinateTransforms.maxTime * GRID_WIDTH * state.zoom) * 100))}%`,
                transform: `translateX(${Math.min(100, Math.max(0, (state.scrollX / (coordinateTransforms.maxScrollX || 1)) * 100))}%)`,
                minWidth: '20px',
              }}
              onMouseDown={(e) => {
                try { e.preventDefault() } catch (error) { console.warn('preventDefault failed:', error); }
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
                  
                  const maxScrollX = coordinateTransforms.maxScrollX || 0
                  const newScrollX = scrollRatio * maxScrollX
                  
                  state.setScrollX(newScrollX)
                  state.setNeedsRedraw(true)
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

      {/* staticCanvas, dynamicCanvasの上にtimelineCanvasを重ねる */}
      {timelineCanvasRef && (
        <canvas
          ref={timelineCanvasRef}
          className="absolute left-0 top-0 w-full"
          style={{ height: HEADER_HEIGHT, zIndex: 9, pointerEvents: 'none' }}
        />
      )}
    </div>
  )
}

export default memo(MidiEditorCanvas) 