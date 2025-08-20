import React, { forwardRef, useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { CELL_SIZE, INSTRUMENT_LABEL_WIDTH, TIMELINE_HEIGHT, PLAYBACK_HEAD_COLOR, ACTIVE_CELL_COLOR, HOVER_CELL_COLOR, GRID_LINE_COLOR, BACKGROUND_COLOR, TEXT_COLOR, SYNC_GROUP_SETTINGS } from './constants.js';
import drumTrackManager from '../../utils/drumTrackManager.js';

const DrumTrackGrid = forwardRef(({
  containerRef,
  state,
  onCellToggle,
  onInstrumentChange,
  onSyncGroupChange,
  isPlaying,
  currentTime,
  tempo,
  timeSignature,
  audioEnabled,
  audio,
  trackId,
  // 新しいタイムライン関連のprops
  onPlayPause,
  onStop,
  onRewind,
  onForward,
  onToggleLoop,
  onToggleMetronome,
  onToggleAudio,
  loopEnabled,
  metronomeEnabled,
  totalDuration,
  activeCellCount,
  onTimelineClick,
  onPlaybackHeadDrag
}, ref) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // ホバー状態
  const [hoveredCell, setHoveredCell] = useState(null);
  
  // スクロール状態
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  
  // スクロールアニメーション用のRefs
  const scrollAnimationRef = useRef(null);
  const scrollStartTimeRef = useRef(0);
  const scrollStartXRef = useRef(0);
  const scrollStartYRef = useRef(0);
  const scrollTargetXRef = useRef(0);
  const scrollTargetYRef = useRef(0);
  const scrollDurationRef = useRef(300);
  
  // イージング関数（easeOutCubic）
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  
  // 時間軸の計算（BPMベース）
  const timeAxis = useMemo(() => {
    const secondsPerBeat = 60 / tempo;
    const [beatsPerBar] = timeSignature.split('/').map(Number);
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    
    // 曲の最大時間を計算（32小節分に拡張）
    const maxBars = 32;
    const maxTime = secondsPerBar * maxBars;
    
    // セル幅を時間ベースで計算（1秒 = 50ピクセル）
    const pixelsPerSecond = 50;
    const cellWidth = pixelsPerSecond * secondsPerBeat / 4; // 16分音符ベース
    
    return {
      secondsPerBeat,
      secondsPerBar,
      maxTime,
      maxBars,
      pixelsPerSecond,
      cellWidth,
      cellHeight: 25, // 固定のセル高さ
      totalWidth: maxTime * pixelsPerSecond
    };
  }, [tempo, timeSignature]);
  
  // 座標変換関数
  const coordinateTransforms = useMemo(() => ({
    timeToX: (time) => INSTRUMENT_LABEL_WIDTH + (time * timeAxis.pixelsPerSecond) - scrollX,
    xToTime: (x) => (x - INSTRUMENT_LABEL_WIDTH + scrollX) / timeAxis.pixelsPerSecond,
    maxScrollX: Math.max(0, timeAxis.totalWidth - (containerRef.current?.clientWidth || 800))
  }), [timeAxis, scrollX, containerRef]);
  
  // 滑らかなスクロールアニメーション（横スクロールのみ）
  const smoothScrollTo = useCallback((targetX, targetY, duration = 300) => {
    // 既存のアニメーションを停止
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }

    const startX = scrollX;
    const startTime = performance.now();

    scrollStartTimeRef.current = startTime;
    scrollStartXRef.current = startX;
    scrollTargetXRef.current = targetX;
    scrollDurationRef.current = duration;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const newX = startX + (targetX - startX) * easedProgress;

      // 横スクロール制限のみ適用
      const maxScrollX = coordinateTransforms.maxScrollX;
      const clampedX = Math.max(0, Math.min(maxScrollX, newX));

      setScrollX(clampedX);
      // 縦スクロールは常に0に固定
      setScrollY(0);
      state.setNeedsRedraw(true);

      if (progress < 1) {
        scrollAnimationRef.current = requestAnimationFrame(animate);
      } else {
        scrollAnimationRef.current = null;
      }
    };

    scrollAnimationRef.current = requestAnimationFrame(animate);
  }, [scrollX, coordinateTransforms.maxScrollX, state.setNeedsRedraw]);
  
  // キャンバスの初期化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    contextRef.current = context;
    
    // キャンバスのサイズ設定
    const resizeCanvas = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      // 楽器の数に応じて高さを計算（同期グループ選択UIを含む）
      const gridRows = state.grid?.length || 8;
      const syncSelectorHeight = 30; // 同期グループ選択UIの高さ
      const calculatedHeight = TIMELINE_HEIGHT + (gridRows * timeAxis.cellHeight) + syncSelectorHeight;
      
      // 実際の表示サイズを設定
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${calculatedHeight}px`;
      
      // キャンバスの内部サイズも同じに設定
      canvas.width = rect.width;
      canvas.height = calculatedHeight;
      
      // スケールをリセット
      context.setTransform(1, 0, 0, 1, 0, 0);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [containerRef, state.grid, timeAxis.cellHeight]);
  
  // 描画関数
  const drawGrid = useCallback(() => {
    if (!contextRef.current || !state.grid) return;
    
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    
    // キャンバスをクリア
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const gridRows = state.grid.length;
    
    // グリッドの実際のサイズを計算
    const gridWidth = timeAxis.totalWidth;
    const gridHeight = timeAxis.cellHeight * gridRows;
    
    // スクロール位置を考慮した描画オフセット
    const offsetX = scrollX;
    const offsetY = 0; // 縦スクロールを無効化
    
    // タイムラインの描画
    drawTimeline(ctx, gridWidth, offsetX);
    
    // 楽器ラベルの描画
    drawInstrumentLabels(ctx, gridHeight, gridRows, timeAxis.cellHeight, offsetY);
    
    // グリッド線の描画
    drawGridLines(ctx, gridWidth, gridHeight, offsetX, offsetY);
    
    // セルの描画
    drawCells(ctx, gridWidth, gridHeight, gridRows, offsetX, offsetY);
    
    // 再生ヘッドの描画（停止時も表示）
    drawPlaybackHead(ctx, gridWidth, offsetX);
    
    // 同期グループ選択UIの描画（グリッドの一番下に移動）
    drawSyncGroupSelector(ctx, gridHeight, gridRows, timeAxis.cellHeight, offsetY);
  }, [state.grid, state.instruments, isPlaying, currentTime, timeAxis, scrollX]);
  
  // タイムラインの描画（シンプルで見やすいデザイン）
  const drawTimeline = useCallback((ctx, gridWidth, offsetX) => {
    // タイムラインの背景
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, ctx.canvas.width, TIMELINE_HEIGHT);
    
    // 境界線
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, TIMELINE_HEIGHT);
    ctx.lineTo(ctx.canvas.width, TIMELINE_HEIGHT);
    ctx.stroke();
    
    // 表示範囲を計算
    const startTime = Math.max(0, offsetX / timeAxis.pixelsPerSecond);
    const visibleWidth = ctx.canvas.width - INSTRUMENT_LABEL_WIDTH;
    const endTime = Math.min(timeAxis.maxTime, startTime + visibleWidth / timeAxis.pixelsPerSecond);
    
    // 小節番号の範囲を計算
    const startBarIndex = Math.floor(startTime / timeAxis.secondsPerBar);
    const endBarIndex = Math.ceil(endTime / timeAxis.secondsPerBar);
    
    // 小節マーカーの描画
    for (let barIndex = startBarIndex; barIndex < endBarIndex; barIndex++) {
      const barTime = barIndex * timeAxis.secondsPerBar;
      const x = coordinateTransforms.timeToX(barTime);
      
      // 画面外のマーカーは描画しない
      if (x + timeAxis.secondsPerBar * timeAxis.pixelsPerSecond < -50 || x > ctx.canvas.width + 50) continue;
      
      // 小節の境界線
      ctx.strokeStyle = '#4B5563';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, TIMELINE_HEIGHT);
      ctx.stroke();
      
      // 小節番号（中央上部）
      ctx.fillStyle = '#E5E7EB';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      const barCenterX = x + (timeAxis.secondsPerBar * timeAxis.pixelsPerSecond) / 2;
      ctx.fillText(barIndex.toString(), barCenterX, 16);
      
      // 拍のマーカー（小節内）
      const [beatsPerBar] = timeSignature.split('/').map(Number);
      for (let beat = 1; beat < beatsPerBar; beat++) {
        const beatTime = barTime + (beat * timeAxis.secondsPerBeat);
        const beatX = coordinateTransforms.timeToX(beatTime);
        
        if (beatX >= 0 && beatX <= ctx.canvas.width) {
          ctx.strokeStyle = '#6B7280';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(beatX, 0);
          ctx.lineTo(beatX, TIMELINE_HEIGHT);
          ctx.stroke();
        }
      }
    }
    

    
    // 時間表示（左下）
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    const timeText = `${currentTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s`;
    ctx.fillText(timeText, 8, TIMELINE_HEIGHT - 6);
    
    // テンポ表示（右下）
    ctx.fillStyle = '#10B981';
    ctx.fillText(`${tempo} BPM`, ctx.canvas.width - 60, TIMELINE_HEIGHT - 6);
  }, [timeAxis, coordinateTransforms, scrollX, currentTime, totalDuration, isPlaying, tempo, timeSignature]);
  
  // 楽器ラベルの描画（シンプルで見やすいデザイン）
  const drawInstrumentLabels = useCallback((ctx, gridHeight, gridRows, cellHeight, offsetY) => {
    // 楽器ラベルエリア全体の背景
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, TIMELINE_HEIGHT, INSTRUMENT_LABEL_WIDTH, ctx.canvas.height - TIMELINE_HEIGHT);
    
    for (let i = 0; i < gridRows; i++) {
      const y = TIMELINE_HEIGHT + i * timeAxis.cellHeight - offsetY;
      const instrument = state.instruments?.[i];
      
      if (instrument) {
        // 行の背景（交互に色を変える）
        ctx.fillStyle = i % 2 === 0 ? '#4B5563' : '#374151';
        ctx.fillRect(0, y, INSTRUMENT_LABEL_WIDTH, timeAxis.cellHeight);
        
        // 楽器アイコン
        ctx.fillStyle = instrument.color;
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(instrument.icon, 15, y + timeAxis.cellHeight / 2 + 3);
        
        // 楽器名
        ctx.fillStyle = '#E5E7EB';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(instrument.name, 25, y + timeAxis.cellHeight / 2 + 2);
      }
    }
    
    // 楽器ラベルエリアの境界線
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(INSTRUMENT_LABEL_WIDTH, TIMELINE_HEIGHT);
    ctx.lineTo(INSTRUMENT_LABEL_WIDTH, ctx.canvas.height);
    ctx.stroke();
  }, [state.instruments, timeAxis.cellHeight]);
  
  // 同期グループ選択UIの描画
  const drawSyncGroupSelector = useCallback((ctx, gridHeight, gridRows, cellHeight, offsetY) => {
    // Y座標計算をグリッドの下に明示
    const syncSelectorY = TIMELINE_HEIGHT + gridRows * cellHeight;
    const syncSelectorHeight = 35; // 高さを調整
    
    // 同期グループ選択エリアの背景
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, syncSelectorY, ctx.canvas.width, syncSelectorHeight);
    
    // 境界線
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, syncSelectorY);
    ctx.lineTo(ctx.canvas.width, syncSelectorY);
    ctx.stroke();
    
    // タイトル
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ドラム同期:', 10, syncSelectorY + 25);
    
    // 小節ごとの枠とアルファベット表示
    const barWidth = timeAxis.secondsPerBar * timeAxis.pixelsPerSecond;
    const boxHeight = 25;
    const boxY = syncSelectorY + 5;
    
    // 表示範囲を計算
    const startTime = Math.max(0, scrollX / timeAxis.pixelsPerSecond);
    const visibleWidth = ctx.canvas.width - INSTRUMENT_LABEL_WIDTH;
    const endTime = Math.min(timeAxis.maxTime, startTime + visibleWidth / timeAxis.pixelsPerSecond);
    
    // 小節番号の範囲を計算
    const startBarIndex = Math.floor(startTime / timeAxis.secondsPerBar);
    const endBarIndex = Math.ceil(endTime / timeAxis.secondsPerBar);
    
    for (let barIndex = startBarIndex; barIndex < endBarIndex; barIndex++) {
      const barTime = barIndex * timeAxis.secondsPerBar;
      const x = coordinateTransforms.timeToX(barTime);
      
      // 画面外の枠は描画しない
      if (x + barWidth < -50 || x > ctx.canvas.width + 50) continue;
      
      // ドラムトラックマネージャーから同期グループを取得
      const actualGroup = drumTrackManager.getBarSyncGroup(trackId, barIndex) || 'A';
      const isSelected = state.syncGroup === actualGroup;
      const groupLetter = actualGroup;
      
      // 枠の背景
      if (isSelected) {
        ctx.fillStyle = SYNC_GROUP_SETTINGS.groupColors[groupLetter] + '30'; // 透明度30%
      } else {
        ctx.fillStyle = '#374151';
      }
      ctx.fillRect(x, boxY, barWidth, boxHeight);
      
      // 枠の境界線（ぴったりくっつけるため、右端の境界線は次の枠の左端と重複）
      ctx.strokeStyle = isSelected ? SYNC_GROUP_SETTINGS.groupColors[groupLetter] : '#6b7280';
      ctx.lineWidth = isSelected ? 2 : 1;
      
      // 左端と上端の境界線のみ描画（右端は次の枠の左端と重複）
      ctx.beginPath();
      ctx.moveTo(x, boxY);
      ctx.lineTo(x, boxY + boxHeight);
      ctx.moveTo(x, boxY);
      ctx.lineTo(x + barWidth, boxY);
      ctx.lineTo(x + barWidth, boxY + boxHeight);
      ctx.stroke();
      
      // 中央にアルファベットを表示
      ctx.fillStyle = isSelected ? SYNC_GROUP_SETTINGS.groupColors[groupLetter] : TEXT_COLOR;
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(groupLetter, x + barWidth / 2, boxY + boxHeight / 2 + 6);
      
      // 小節番号を小さく表示
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillText(barIndex.toString(), x + 5, boxY + 15);
    }
    
    // 説明テキスト
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    const explanationX = Math.max(10, coordinateTransforms.timeToX(endTime) + 20);
    ctx.fillText('同じアルファベット同士が同期されます', explanationX, syncSelectorY + 25);
    
    // 総小節数と使用中の同期グループを表示
    const totalBars = Math.ceil(timeAxis.maxTime / timeAxis.secondsPerBar);
    ctx.fillText(`総小節数: ${totalBars}`, explanationX, syncSelectorY + 40);
  }, [state.syncGroup, timeAxis, coordinateTransforms, scrollX, trackId]);
  
  // グリッド線の描画（シンプルで見やすいデザイン）
  const drawGridLines = useCallback((ctx, gridWidth, gridHeight, offsetX, offsetY) => {
    // 表示範囲を計算
    const startTime = Math.max(0, offsetX / timeAxis.pixelsPerSecond);
    const visibleWidth = ctx.canvas.width - INSTRUMENT_LABEL_WIDTH;
    const endTime = Math.min(timeAxis.maxTime, startTime + visibleWidth / timeAxis.pixelsPerSecond);
    
    // 同期グループ選択UIの位置を計算
    const gridRows = state.grid?.length || 8;
    const syncSelectorY = TIMELINE_HEIGHT + gridRows * timeAxis.cellHeight;
    
    // 16分音符の間隔で縦線を描画
    const sixteenthNoteDuration = timeAxis.secondsPerBeat / 4;
    const startStep = Math.floor(startTime / sixteenthNoteDuration);
    const endStep = Math.ceil(endTime / sixteenthNoteDuration);
    
    for (let step = startStep; step <= endStep; step++) {
      const time = step * sixteenthNoteDuration;
      const x = coordinateTransforms.timeToX(time);
      
      // 画面外の線は描画しない
      if (x < -1 || x > ctx.canvas.width + 1) continue;
      
      // 小節の境界線を太く
      const isBarBoundary = step % 16 === 0;
      if (isBarBoundary) {
        ctx.strokeStyle = '#6B7280';
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = '#4B5563';
        ctx.lineWidth = 0.5;
      }
      
      ctx.beginPath();
      ctx.moveTo(x, TIMELINE_HEIGHT);
      ctx.lineTo(x, syncSelectorY);
      ctx.stroke();
    }
    
    // 横線（楽器軸）
    for (let i = 0; i <= gridHeight; i++) {
      const y = TIMELINE_HEIGHT + i * timeAxis.cellHeight - offsetY;
      
      // 画面外の線は描画しない
      if (y < -1 || y > ctx.canvas.height + 1) continue;
      
      ctx.strokeStyle = '#4B5563';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(INSTRUMENT_LABEL_WIDTH, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.stroke();
    }
  }, [timeAxis, coordinateTransforms, state.grid]);
  
  // セルの描画（シンプルで見やすいデザイン）
  const drawCells = useCallback((ctx, gridWidth, gridHeight, gridRows, offsetX, offsetY) => {
    // 表示範囲を計算
    const startTime = Math.max(0, offsetX / timeAxis.pixelsPerSecond);
    const visibleWidth = ctx.canvas.width - INSTRUMENT_LABEL_WIDTH;
    const endTime = Math.min(timeAxis.maxTime, startTime + visibleWidth / timeAxis.pixelsPerSecond);
    
    // 16分音符の間隔でセルを描画
    const sixteenthNoteDuration = timeAxis.secondsPerBeat / 4;
    const startStep = Math.floor(startTime / sixteenthNoteDuration);
    const endStep = Math.ceil(endTime / sixteenthNoteDuration);
    
    for (let row = 0; row < gridRows; row++) {
      for (let step = startStep; step <= endStep; step++) {
        const time = step * sixteenthNoteDuration;
        const x = coordinateTransforms.timeToX(time);
        const y = TIMELINE_HEIGHT + row * timeAxis.cellHeight - offsetY;
        
        // 画面外のセルは描画しない
        if (x + timeAxis.cellWidth < 0 || x > ctx.canvas.width || y + timeAxis.cellHeight < 0 || y > ctx.canvas.height) continue;
        
        const isActive = state.grid?.[row]?.[step] || false;
        const isHovered = hoveredCell && hoveredCell.row === row && hoveredCell.step === step;
        const isPlaybackNote = state.playbackNotes?.has(`${row}-${step}`) || false;
        
        if (isActive) {
          // アクティブセル
          const instrument = state.instruments?.[row];
          let cellColor = instrument?.color || '#3B82F6';
          
          if (isPlaybackNote && state.isPlaying) {
            // 再生中のノート
            ctx.fillStyle = '#EF4444';
            ctx.fillRect(x + 1, y + 1, timeAxis.cellWidth - 2, timeAxis.cellHeight - 2);
          } else {
            // 通常のアクティブセル
            ctx.fillStyle = cellColor;
            ctx.fillRect(x + 1, y + 1, timeAxis.cellWidth - 2, timeAxis.cellHeight - 2);
          }
        } else if (isHovered) {
          // ホバーセル
          ctx.fillStyle = '#6B7280';
          ctx.fillRect(x + 1, y + 1, timeAxis.cellWidth - 2, timeAxis.cellHeight - 2);
        }
      }
    }
  }, [state.grid, state.instruments, state.playbackNotes, state.isPlaying, hoveredCell, timeAxis, coordinateTransforms]);
  
    // 再生ヘッドの描画（シンプルで見やすいデザイン）
  const drawPlaybackHead = useCallback((ctx, gridWidth, offsetX) => {
    const x = coordinateTransforms.timeToX(currentTime);
    
    // 同期グループ選択UIの位置を計算
    const gridRows = state.grid?.length || 8;
    const syncSelectorY = TIMELINE_HEIGHT + gridRows * timeAxis.cellHeight;
    
    // 再生ヘッドの描画範囲を広げて確実に表示
    if (x >= -50 && x <= gridWidth + 50) {
      const drawableHeight = syncSelectorY;
      
      // 再生ヘッドの線（停止時は上端から、再生中はタイムラインから）
      ctx.strokeStyle = state.isPlaying ? '#EF4444' : '#9CA3AF';
      ctx.lineWidth = 2;
      ctx.setLineDash(state.isPlaying ? [6, 3] : [4, 4]);
      ctx.beginPath();
      if (state.isPlaying) {
        // 再生中はタイムラインから
        ctx.moveTo(x, TIMELINE_HEIGHT);
        ctx.lineTo(x, drawableHeight);
      } else {
        // 停止時は上端（0）から
        ctx.moveTo(x, 0);
        ctx.lineTo(x, drawableHeight);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      
      // 再生ヘッドの円（停止時はタイムライン上部に、再生中はタイムライン下部に）
      ctx.fillStyle = state.isPlaying ? '#EF4444' : '#9CA3AF';
      ctx.beginPath();
      if (state.isPlaying) {
        ctx.arc(x, TIMELINE_HEIGHT + 6, 4, 0, 2 * Math.PI);
      } else {
        ctx.arc(x, TIMELINE_HEIGHT - 6, 4, 0, 2 * Math.PI);
      }
      ctx.fill();
    }
  }, [coordinateTransforms, currentTime, state.isPlaying, timeAxis, state.grid]);
  
  // マウスイベントハンドラー（時間軸ベース）
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // グリッド領域内かチェック
    if (x < INSTRUMENT_LABEL_WIDTH || y < TIMELINE_HEIGHT) {
      setHoveredCell(null);
      return;
    }
    
    const gridRows = state.grid?.length || 8;
    
    // 時間軸ベースの座標計算（32小節分まで拡張）
    const time = coordinateTransforms.xToTime(x);
    const sixteenthNoteDuration = timeAxis.secondsPerBeat / 4;
    const step = Math.floor(time / sixteenthNoteDuration);
    const row = Math.floor((y - TIMELINE_HEIGHT) / timeAxis.cellHeight);
    
    if (step >= 0 && time >= 0 && time <= timeAxis.maxTime && row >= 0 && row < gridRows) {
      setHoveredCell({ row, step, time });
    } else {
      setHoveredCell(null);
    }
  }, [state.grid, coordinateTransforms, timeAxis]);
  
  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // タイムライン領域のクリック処理（MIDI Editor風）
    if (y < TIMELINE_HEIGHT && x >= INSTRUMENT_LABEL_WIDTH) {
      const clickTime = coordinateTransforms.xToTime(x);
      const clampedTime = Math.max(0, Math.min(totalDuration, clickTime));
      
      if (onTimelineClick) {
        onTimelineClick(clampedTime);
      }
      return;
    }
    
    // 再生ヘッドのドラッグ処理
    const playbackX = coordinateTransforms.timeToX(currentTime);
    const dragThreshold = 10; // ドラッグ判定の閾値
    
    if (y < TIMELINE_HEIGHT && Math.abs(x - playbackX) <= dragThreshold) {
      // 再生ヘッドのドラッグ開始
      const handleMouseMove = (moveEvent) => {
        const moveX = moveEvent.clientX - rect.left;
        const newTime = coordinateTransforms.xToTime(moveX);
        const clampedTime = Math.max(0, Math.min(totalDuration, newTime));
        
        if (onPlaybackHeadDrag) {
          onPlaybackHeadDrag(clampedTime);
        }
      };
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return;
    }
    
    // 同期グループ選択UIのクリック処理
    const gridRows = state.grid?.length || 8;
    const syncSelectorY = TIMELINE_HEIGHT + gridRows * timeAxis.cellHeight;
    const syncSelectorHeight = 40;
    
    if (y >= syncSelectorY && y <= syncSelectorY + syncSelectorHeight) {
      // 同期グループ選択エリア内のクリック
      const barWidth = timeAxis.secondsPerBar * timeAxis.pixelsPerSecond;
      const boxHeight = 25;
      const boxY = syncSelectorY + 5;
      
      // クリックされた位置の時間を計算
      const clickTime = coordinateTransforms.xToTime(x);
      const barIndex = Math.floor(clickTime / timeAxis.secondsPerBar);
      const barTime = barIndex * timeAxis.secondsPerBar;
      const barX = coordinateTransforms.timeToX(barTime);
      
      // クリックされた枠内かチェック
      if (x >= barX && x <= barX + barWidth && y >= boxY && y <= boxY + boxHeight) {
        // 同期グループボタンがクリックされた
        const currentGroup = drumTrackManager.getBarSyncGroup(trackId, barIndex) || 'A';
        const nextGroupIndex = (SYNC_GROUP_SETTINGS.availableGroups.indexOf(currentGroup) + 1) % SYNC_GROUP_SETTINGS.availableGroups.length;
        const newGroup = SYNC_GROUP_SETTINGS.availableGroups[nextGroupIndex];
        
        if (onSyncGroupChange) {
          onSyncGroupChange(newGroup, barIndex);
          
          // 同期グループ変更時にノートも更新
          // 同じ同期グループの他の小節も同時に更新
          const allBars = Math.ceil(timeAxis.maxTime / timeAxis.secondsPerBar);
          for (let i = 0; i < allBars; i++) {
            const barGroup = drumTrackManager.getBarSyncGroup(trackId, i);
            if (barGroup === newGroup && i !== barIndex) {
              // 同じ同期グループの他の小節も更新
              onSyncGroupChange(newGroup, i);
            }
          }
          
          // 即座に再描画を要求
          state.setNeedsRedraw(true);
        }
        return;
      }
      return;
    }
    
    // 通常のセルクリック処理
    if (!hoveredCell) return;
    
    const { row, step } = hoveredCell;
    
    // セルのトグル（32小節分のデータに対応）
    if (onCellToggle) {
      onCellToggle(row, step);
    }
    
    // 音声再生（重複再生を防ぐ）
    if (audioEnabled && audio) {
      const instrument = state.instruments?.[row];
      if (instrument) {
        // 重複再生を防ぐため、少し遅延して再生
        setTimeout(() => {
          audio.playDrumSound(instrument.pitch, 0.3, instrument.velocity);
        }, 10);
      }
    }
  }, [hoveredCell, onCellToggle, onSyncGroupChange, audioEnabled, audio, state.instruments, state.grid, timeAxis, coordinateTransforms, trackId, currentTime, totalDuration, onTimelineClick, onPlaybackHeadDrag]);
  
  // スクロール速度の調整（慣性スクロール）
  const scrollVelocityRef = useRef({ x: 0, y: 0 });
  const lastWheelTimeRef = useRef(0);
  const wheelDeltaRef = useRef({ x: 0, y: 0 });

  // 慣性スクロールの処理
  const handleInertialScroll = useCallback(() => {
    if (Math.abs(scrollVelocityRef.current.x) < 0.1 && Math.abs(scrollVelocityRef.current.y) < 0.1) {
      return;
    }

    const currentX = scrollX + scrollVelocityRef.current.x;
    const currentY = scrollY + scrollVelocityRef.current.y;

    const maxScrollX = coordinateTransforms.maxScrollX || 0;
    const maxScrollY = 0; // 縦スクロールは常に0
    let clampedX = Math.max(0, Math.min(maxScrollX, currentX));
    const clampedY = 0; // 縦スクロールは常に0

    // 境界でのバウンス効果
    if (currentX < 0) {
      clampedX = 0;
      scrollVelocityRef.current.x *= -0.3; // バウンス
    } else if (currentX > maxScrollX) {
      clampedX = maxScrollX;
      scrollVelocityRef.current.x *= -0.3; // バウンス
    }

    setScrollX(clampedX);
    setScrollY(clampedY);
    state.setNeedsRedraw(true);

    // 減衰
    scrollVelocityRef.current.x *= 0.95;
    scrollVelocityRef.current.y *= 0.95;

    // 境界に到達したら停止（バウンス効果がない場合）
    if (clampedX === 0 && scrollVelocityRef.current.x <= 0) {
      scrollVelocityRef.current.x = 0;
    }
    if (clampedX === maxScrollX && scrollVelocityRef.current.x >= 0) {
      scrollVelocityRef.current.x = 0;
    }
    if (clampedY === 0 || clampedY === maxScrollY || clampedY === currentY) {
      scrollVelocityRef.current.y = 0;
    }

    if (Math.abs(scrollVelocityRef.current.x) > 0.1 || Math.abs(scrollVelocityRef.current.y) > 0.1) {
      requestAnimationFrame(handleInertialScroll);
    }
  }, [scrollX, scrollY, coordinateTransforms.maxScrollX, state.setNeedsRedraw]);

  // ホイールイベントハンドラー（MIDI Editor風の滑らかなスクロール）
  const handleWheel = useCallback((e) => {
    const now = Date.now();
    const deltaTime = now - lastWheelTimeRef.current;
    lastWheelTimeRef.current = now;

    // Shiftキーが押されている場合は横スクロール
    if (e.shiftKey) {
      try { e.preventDefault(); } catch (error) { console.warn('preventDefault failed:', error); }
      
      // スクロール速度を計算
      const scrollSpeed = Math.min(Math.abs(e.deltaY) / Math.max(deltaTime, 1), 2.0);
      const scrollDirection = e.deltaY > 0 ? 1 : -1;
      
      // 慣性スクロールの速度を更新
      scrollVelocityRef.current.x += scrollDirection * scrollSpeed * 50;
      
      // 即座にスクロール位置を更新
      const newScrollX = Math.max(0, Math.min(coordinateTransforms.maxScrollX || 0, scrollX - e.deltaY));
      setScrollX(newScrollX);
      state.setNeedsRedraw(true);
      
      // 慣性スクロールを開始
      if (!scrollAnimationRef.current) {
        scrollAnimationRef.current = requestAnimationFrame(handleInertialScroll);
      }
      
      // スクロール中のカーソルスタイルを変更
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = 'grab';
        // 少し遅延してカーソルを元に戻す
        setTimeout(() => {
          if (canvas) {
            canvas.style.cursor = 'pointer';
          }
        }, 150);
      }
    } else {
      // Shiftキーが押されていない場合は縦スクロールを無効化
      try { e.preventDefault(); } catch (error) { console.warn('preventDefault failed:', error); }
    }
  }, [scrollX, coordinateTransforms.maxScrollX, state.setNeedsRedraw, handleInertialScroll]);
  
  // アニメーションループ（依存配列を修正して無限ループを防ぐ）
  useEffect(() => {
    const animate = () => {
      if (state.needsRedraw) {
        drawGrid();
        state.setNeedsRedraw(false);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.needsRedraw]); // drawGridを依存配列から除外
  
  // 初期描画
  useEffect(() => {
    drawGrid();
  }, [drawGrid]);
  
  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
      // 慣性スクロールの速度をリセット
      scrollVelocityRef.current = { x: 0, y: 0 };
    };
  }, []);
  
  // 親コンポーネントから呼び出せるように関数を公開
  React.useImperativeHandle(ref, () => ({
    smoothScrollTo,
    scrollX,
    scrollY
  }), [smoothScrollTo, scrollX, scrollY]);
  
  return (
    <div 
      className="flex-1 relative overflow-hidden" 
      style={{ 
        maxHeight: 'calc(100vh - 120px)',
        height: 'auto' // 高さを自動調整
      }}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className="w-full cursor-pointer"
        style={{ 
          maxWidth: '100%',
          height: 'auto' // 高さを自動調整
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseLeave={() => setHoveredCell(null)}
      />
    </div>
  );
});

DrumTrackGrid.displayName = 'DrumTrackGrid';

export default DrumTrackGrid; 