import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button.jsx';

const DrumTrackTimeline = ({
  // 再生状態
  isPlaying,
  onPlayPause,
  onStop,
  onRewind,
  onForward,
  
  // 時間情報
  currentTime,
  totalDuration,
  tempo,
  timeSignature,
  
  // ループ・メトロノーム
  loopEnabled,
  onToggleLoop,
  metronomeEnabled,
  onToggleMetronome,
  
  // オーディオ
  audioEnabled,
  onToggleAudio,
  
  // アクティブセル数
  activeCellCount,
  
  // 新しいプロパティ
  onTimelineClick,
  onPlaybackHeadDrag,
  pixelsPerSecond = 100,
  snapToGrid = true
}) => {
  const timelineRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartTimeRef = useRef(0);

  // 時間のフォーマット（より詳細）
  const formatTime = useCallback((time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }, []);
  
  // 再生位置のパーセンテージ
  const playbackProgress = useMemo(() => {
    if (totalDuration <= 0) return 0;
    return Math.min((currentTime / totalDuration) * 100, 100);
  }, [currentTime, totalDuration]);

  // グリッドマーカーの計算
  const gridMarkers = useMemo(() => {
    const markers = [];
    const secondsPerBeat = 60 / tempo;
    const [beatsPerBar] = timeSignature.split('/').map(Number);
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    
    // 表示範囲内のマーカーを生成
    const visibleDuration = totalDuration;
    const barCount = Math.ceil(visibleDuration / secondsPerBar);
    
    for (let i = 0; i <= barCount; i++) {
      const time = i * secondsPerBar;
      const left = (time / totalDuration) * 100;
      
      markers.push({
        time,
        left,
        isBar: true,
        label: `${i + 1}`
      });
      
      // 拍のマーカーも追加（小節内の拍）
      for (let beat = 1; beat < beatsPerBar; beat++) {
        const beatTime = time + (beat * secondsPerBeat);
        const beatLeft = (beatTime / totalDuration) * 100;
        
        if (beatTime < visibleDuration) {
          markers.push({
            time: beatTime,
            left: beatLeft,
            isBar: false,
            label: `${beat + 1}`
          });
        }
      }
    }
    
    return markers;
  }, [tempo, timeSignature, totalDuration]);

  // タイムラインのクリック処理（改善版）
  const handleTimelineClick = useCallback((e) => {
    if (isDraggingRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * totalDuration;
    
    // グリッドスナップ機能
    let finalTime = newTime;
    if (snapToGrid) {
      const secondsPerBeat = 60 / tempo;
      const [beatsPerBar] = timeSignature.split('/').map(Number);
      const secondsPerBar = secondsPerBeat * beatsPerBar;
      
      // ズームレベルに応じてグリッド間隔を調整
      let gridInterval;
      if (pixelsPerSecond >= 800) gridInterval = secondsPerBeat / 16;  // 64分音符
      else if (pixelsPerSecond >= 400) gridInterval = secondsPerBeat / 8;  // 32分音符
      else if (pixelsPerSecond >= 200) gridInterval = secondsPerBeat / 4;  // 16分音符
      else if (pixelsPerSecond >= 100) gridInterval = secondsPerBeat / 2;  // 8分音符
      else if (pixelsPerSecond >= 50) gridInterval = secondsPerBeat;  // 4分音符
      else if (pixelsPerSecond >= 25) gridInterval = secondsPerBar;  // 1小節
      else gridInterval = secondsPerBar * 2;  // 2小節
      
      // 最小間隔を0.025秒に制限
      gridInterval = Math.max(gridInterval, 0.025);
      
      // 最も近いグリッド位置にスナップ
      finalTime = Math.round(newTime / gridInterval) * gridInterval;
    }
    
    finalTime = Math.max(0, Math.min(totalDuration, finalTime));
    
    if (onTimelineClick) {
      onTimelineClick(finalTime);
    }
    
    console.log('Timeline clicked:', { 
      originalTime: newTime, 
      snappedTime: finalTime, 
      percentage: (finalTime / totalDuration) * 100 
    });
  }, [totalDuration, snapToGrid, tempo, timeSignature, pixelsPerSecond, onTimelineClick]);

  // 再生ヘッドのドラッグ開始
  const handlePlaybackHeadDragStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartTimeRef.current = currentTime;
    
    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      
      const deltaX = moveEvent.clientX - dragStartXRef.current;
      const deltaTime = deltaX / pixelsPerSecond;
      let newTime = dragStartTimeRef.current + deltaTime;
      
      // グリッドスナップ機能
      if (snapToGrid) {
        const secondsPerBeat = 60 / tempo;
        const [beatsPerBar] = timeSignature.split('/').map(Number);
        const secondsPerBar = secondsPerBeat * beatsPerBar;
        
        let gridInterval;
        if (pixelsPerSecond >= 800) gridInterval = secondsPerBeat / 16;
        else if (pixelsPerSecond >= 400) gridInterval = secondsPerBeat / 8;
        else if (pixelsPerSecond >= 200) gridInterval = secondsPerBeat / 4;
        else if (pixelsPerSecond >= 100) gridInterval = secondsPerBeat / 2;
        else if (pixelsPerSecond >= 50) gridInterval = secondsPerBeat;
        else if (pixelsPerSecond >= 25) gridInterval = secondsPerBar;
        else gridInterval = secondsPerBar * 2;
        
        gridInterval = Math.max(gridInterval, 0.025);
        newTime = Math.round(newTime / gridInterval) * gridInterval;
      }
      
      newTime = Math.max(0, Math.min(totalDuration, newTime));
      
      if (onPlaybackHeadDrag) {
        onPlaybackHeadDrag(newTime);
      }
    };
    
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [currentTime, pixelsPerSecond, snapToGrid, tempo, timeSignature, totalDuration, onPlaybackHeadDrag]);

  // マウスリーブ時のドラッグ停止
  useEffect(() => {
    const handleMouseLeave = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
      }
    };
    
    if (timelineRef.current) {
      timelineRef.current.addEventListener('mouseleave', handleMouseLeave);
    }
    
    return () => {
      if (timelineRef.current) {
        timelineRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <div className="flex flex-col bg-gray-900 border-b border-gray-700 shadow-lg">
      {/* メインタイムライン */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* 左側：再生コントロール */}
        <div className="flex items-center space-x-2">
          {/* 巻き戻し */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRewind}
            className="h-9 w-9 p-0 hover:bg-gray-700 transition-colors"
            title="巻き戻し (1小節)"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          {/* 再生/一時停止 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onPlayPause}
            className="h-9 w-9 p-0 hover:bg-gray-700 transition-colors"
            title={isPlaying ? "一時停止" : "再生"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          {/* 停止 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onStop}
            className="h-9 w-9 p-0 hover:bg-gray-700 transition-colors"
            title="停止"
          >
            <Square className="h-4 w-4" />
          </Button>
          
          {/* 早送り */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onForward}
            className="h-9 w-9 p-0 hover:bg-gray-700 transition-colors"
            title="早送り (1小節)"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        
        {/* 中央：タイムライン */}
        <div className="flex-1 mx-6">
          <div className="relative">
            {/* タイムライン背景 */}
            <div 
              ref={timelineRef}
              className="w-full h-12 bg-gray-800 rounded-lg cursor-pointer relative border border-gray-600 hover:border-gray-500 transition-colors"
              onClick={handleTimelineClick}
            >
              {/* グリッドマーカー */}
              {gridMarkers.map((marker, index) => (
                <div
                  key={`${marker.time}-${index}`}
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: `${marker.left}%` }}
                >
                  <div 
                    className={`w-px h-full ${marker.isBar ? 'bg-blue-400' : 'bg-gray-600'}`}
                  />
                  {marker.isBar && (
                    <div className="absolute top-1 -translate-x-1/2 text-xs text-blue-300 font-medium whitespace-nowrap">
                      {marker.label}
                    </div>
                  )}
                </div>
              ))}
              
              {/* 再生位置インジケーター */}
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-l-lg transition-all duration-100"
                style={{ width: `${playbackProgress}%` }}
              />
              
              {/* 再生ヘッド */}
              <div 
                className="absolute top-0 w-1 h-full bg-red-500 transition-all duration-100 cursor-ew-resize shadow-lg hover:shadow-xl hover:w-1.5"
                style={{ 
                  left: `${playbackProgress}%`,
                  transform: 'translateX(-50%)',
                  boxShadow: isPlaying ? '0 0 8px rgba(239, 68, 68, 0.8)' : '0 0 4px rgba(239, 68, 68, 0.6)'
                }}
                onMouseDown={handlePlaybackHeadDragStart}
                title={`再生位置: ${formatTime(currentTime)} / ${formatTime(totalDuration)}`}
              />
              
              {/* 時間マーカー（改善版） */}
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-200 pointer-events-none font-mono">
                <div className="bg-gray-900 bg-opacity-80 px-2 py-1 rounded">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 右側：情報表示 */}
        <div className="flex items-center space-x-4 text-sm text-gray-300">
          {/* テンポ */}
          <div className="flex items-center space-x-1 bg-gray-800 px-2 py-1 rounded">
            <span className="text-blue-400">BPM:</span>
            <span className="font-mono font-bold">{tempo}</span>
          </div>
          
          {/* 拍子記号 */}
          <div className="flex items-center space-x-1 bg-gray-800 px-2 py-1 rounded">
            <span className="text-green-400">拍子:</span>
            <span className="font-mono font-bold">{timeSignature}</span>
          </div>
          
          {/* アクティブセル数 */}
          <div className="flex items-center space-x-1 bg-gray-800 px-2 py-1 rounded">
            <span className="text-yellow-400">アクティブ:</span>
            <span className="font-mono font-bold">{activeCellCount}</span>
          </div>
        </div>
      </div>
      
      {/* 下部：追加コントロール */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-600">
        {/* 左側：ループ・メトロノーム */}
        <div className="flex items-center space-x-2">
          <Button
            variant={loopEnabled ? "default" : "ghost"}
            size="sm"
            onClick={onToggleLoop}
            className="h-7 px-3 text-xs transition-colors"
            title={loopEnabled ? "ループ無効" : "ループ有効"}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            ループ
          </Button>
          
          <Button
            variant={metronomeEnabled ? "default" : "ghost"}
            size="sm"
            onClick={onToggleMetronome}
            className="h-7 px-3 text-xs transition-colors"
            title={metronomeEnabled ? "メトロノーム無効" : "メトロノーム有効"}
          >
            <span className="mr-1">♪</span>
            メトロノーム
          </Button>
        </div>
        
        {/* 右側：オーディオ状態 */}
        <div className="flex items-center space-x-2">
          <Button
            variant={audioEnabled ? "default" : "ghost"}
            size="sm"
            onClick={onToggleAudio}
            className="h-7 px-3 text-xs transition-colors"
            title={audioEnabled ? "オーディオ無効" : "オーディオ有効"}
          >
            {audioEnabled ? (
              <Volume2 className="h-3 w-3 mr-1" />
            ) : (
              <VolumeX className="h-3 w-3 mr-1" />
            )}
            オーディオ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DrumTrackTimeline; 