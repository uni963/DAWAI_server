import { useRef, useMemo, useCallback, useEffect } from 'react'
import { formatTime } from '../utils/arrangementUtils.js'

const TimelineHeader = ({
  timelineRef,
  safeTrackAreaWidth,
  currentTime,
  pixelsPerSecond,
  horizontalScrollPosition,
  bpm,
  timeSignature,
  snapToGrid,
  safeTotalDuration,
  onTimelineClick,
  onTimelineScroll,
  onPlaybackHeadDragStart
}) => {
  // GPU加速用のplayback headリファレンス
  const playbackHeadRef = useRef(null)
  const lastUpdateTime = useRef(0)
  const animationFrameRef = useRef(null)
  const lastPosition = useRef(-1)

  // 高速タイムマーカー生成（メモ化、GPU加速対応）
  const timeMarkers = useMemo(() => {
    const secondsPerBeat = 60 / bpm;
    const [beatsPerBar] = timeSignature.split('/').map(Number);
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    
    const getMarkerInterval = () => {
      // BPMに応じて適応的にマーカー間隔を調整（パフォーマンス最適化）
      if (pixelsPerSecond >= 400) return secondsPerBeat / 4; // 16分音符
      if (pixelsPerSecond >= 200) return secondsPerBeat / 2; // 8分音符
      if (pixelsPerSecond >= 100) return secondsPerBeat;     // 4分音符
      if (pixelsPerSecond >= 50) return secondsPerBar;       // 1小節
      if (pixelsPerSecond >= 25) return secondsPerBar * 2;   // 2小節
      return secondsPerBar * 4;                              // 4小節
    };
    
    const interval = getMarkerInterval();
    const totalSeconds = safeTotalDuration / 1000;
    const markerCount = Math.ceil(totalSeconds / interval);
    
    // パフォーマンス最適化: マーカー数を制限
    const maxMarkers = 1000; // 最大1000個まで
    const actualMarkerCount = Math.min(markerCount, maxMarkers);
    
    return Array.from({ length: actualMarkerCount + 1 }, (_, i) => {
      const time = i * interval;
      const left = time * pixelsPerSecond;
      const isMainMarker = time % secondsPerBar === 0; // 小節の開始は太く
      const isBeatMarker = time % secondsPerBeat === 0; // 拍の開始は中程度
      
      return {
        key: `marker-${i}`,
        left,
        isMainMarker,
        isBeatMarker,
        time
      };
    });
  }, [bpm, timeSignature, pixelsPerSecond, safeTotalDuration]);
  
  // GPU加速対応のplayback head位置更新（requestAnimationFrame使用）
  const updatePlaybackHeadPosition = useCallback(() => {
    if (!playbackHeadRef.current) return;
    
    const now = performance.now();
    // 60fps で更新（約16.67ms間隔）
    if (now - lastUpdateTime.current < 16) {
      animationFrameRef.current = requestAnimationFrame(updatePlaybackHeadPosition);
      return;
    }
    lastUpdateTime.current = now;
    
    const playbackHeadPosition = currentTime * pixelsPerSecond;
    
    // 位置が変更された場合のみ更新（不要な再描画を防止）
    if (Math.abs(playbackHeadPosition - lastPosition.current) > 0.5) {
      lastPosition.current = playbackHeadPosition;
      
      // GPU加速対応: transform3d使用でhardware accelerationを有効化
      playbackHeadRef.current.style.transform = `translate3d(${playbackHeadPosition}px, 0, 0)`;
      playbackHeadRef.current.style.willChange = 'transform'; // GPUレイヤーで処理
    }
    
    animationFrameRef.current = requestAnimationFrame(updatePlaybackHeadPosition);
  }, [currentTime, pixelsPerSecond]);
  
  // playback headの高FPS更新を開始/停止
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(updatePlaybackHeadPosition);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updatePlaybackHeadPosition]);

  // 高速拍グリッドライン生成（パフォーマンス最適化）
  const beatGridLines = useMemo(() => {
    if (!snapToGrid) return [];
    
    const secondsPerBeat = 60 / bpm;
    const totalBeats = Math.ceil((safeTotalDuration / 1000) / secondsPerBeat);
    
    // パフォーマンス最適化: グリッド数を制限
    const maxGridLines = 2000;
    const actualBeats = Math.min(totalBeats, maxGridLines);
    
    return Array.from({ length: actualBeats + 1 }, (_, i) => {
      const beatTime = i * secondsPerBeat;
      const left = beatTime * pixelsPerSecond;
      
      return {
        key: `beat-${i}`,
        left
      };
    });
  }, [snapToGrid, bpm, pixelsPerSecond, safeTotalDuration]);

  // 高速細かいグリッド生成（パフォーマンス最適化）
  const fineGridLines = useMemo(() => {
    if (!snapToGrid) return [];
    
    const secondsPerBeat = 60 / bpm;
    // パフォーマンス最適化: ズームレベルに応じてグリッドを簡略化
    const gridDivisions = pixelsPerSecond >= 200 ? [4, 8, 16] : pixelsPerSecond >= 100 ? [4, 8] : [4];
    const gridLines = [];
    const maxGridLines = 1500; // 最大1500ラインまで
    
    gridDivisions.forEach(division => {
      const gridInterval = secondsPerBeat / division;
      const totalGridLines = Math.ceil((safeTotalDuration / 1000) / gridInterval);
      const actualGridLines = Math.min(totalGridLines, maxGridLines);
      
      for (let i = 0; i <= actualGridLines; i++) {
        const gridTime = i * gridInterval;
        const left = gridTime * pixelsPerSecond;
        
        // 拍の倍数でない場合のみ表示（重複を避ける）
        if (Math.abs(gridTime % secondsPerBeat) > 0.001) {
          gridLines.push({
            key: `grid-${division}-${i}`,
            left,
            division,
            opacity: division === 4 ? 0.2 : division === 8 ? 0.15 : 0.1
          });
        }
      }
    });

    return gridLines;
  }, [snapToGrid, bpm, pixelsPerSecond, safeTotalDuration]);
  
  // ビューポート内の要素のみ描画するための可視範囲計算
  const visibleRange = useMemo(() => {
    const viewportStart = horizontalScrollPosition || 0;
    const viewportEnd = viewportStart + safeTrackAreaWidth;
    const bufferZone = safeTrackAreaWidth * 0.1; // 10%のバッファー
    
    return {
      start: Math.max(0, viewportStart - bufferZone),
      end: viewportEnd + bufferZone
    };
  }, [horizontalScrollPosition, safeTrackAreaWidth]);
  
  // 可視範囲内のマーカーのみフィルタリング（パフォーマンス最適化）
  const visibleTimeMarkers = useMemo(() => {
    return timeMarkers.filter(marker => 
      marker.left >= visibleRange.start && marker.left <= visibleRange.end
    );
  }, [timeMarkers, visibleRange]);
  
  const visibleBeatGridLines = useMemo(() => {
    return beatGridLines.filter(line => 
      line.left >= visibleRange.start && line.left <= visibleRange.end
    );
  }, [beatGridLines, visibleRange]);
  
  const visibleFineGridLines = useMemo(() => {
    return fineGridLines.filter(line => 
      line.left >= visibleRange.start && line.left <= visibleRange.end
    );
  }, [fineGridLines, visibleRange]);

  // 小節マーカーの生成をメモ化
  const barMarkers = useMemo(() => {
    const [beatsPerBar] = timeSignature.split('/').map(Number);
    const secondsPerBeat = 60 / bpm;
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    const totalBars = Math.ceil((safeTotalDuration / 1000) / secondsPerBar);
    
    // パフォーマンス最適化: 小節数制限
    const maxBars = 500;
    const actualBars = Math.min(totalBars, maxBars);
    
    return Array.from({ length: actualBars + 1 }, (_, i) => {
      const barStartTime = i * secondsPerBar;
      const left = barStartTime * pixelsPerSecond;
      
      return {
        key: `bar-${i}`,
        left,
        barNumber: i + 1
      };
    });
  }, [timeSignature, bpm, pixelsPerSecond, safeTotalDuration]);

  // 可視範囲内の小節マーカー
  const visibleBarMarkers = useMemo(() => {
    return barMarkers.filter(marker => 
      marker.left >= visibleRange.start && marker.left <= visibleRange.end
    );
  }, [barMarkers, visibleRange]);

  return (
    <div className="flex border-b border-gray-700 flex-shrink-0">
      {/* タイムライン用の左側パディング（トラック情報パネルと同じ幅） */}
      <div className="flex-shrink-0 w-48 bg-gray-800 border-r border-gray-700 flex items-center justify-center">
        <span className="text-xs text-gray-400 font-medium">タイムライン</span>
      </div>
      
      {/* 高FPSタイムライン本体 */}
      <div
        ref={timelineRef}
        className="relative h-20 bg-gray-800 cursor-pointer flex-1 overflow-x-auto overflow-y-hidden"
        style={{
          willChange: 'scroll-position', // GPU加速有効化
          backfaceVisibility: 'hidden', // チラつき防止
        }}
        onClick={onTimelineClick}
        onScroll={onTimelineScroll}
      >
        <div 
          className="relative h-full" 
          style={{ 
            width: `${safeTrackAreaWidth}px`,
            minWidth: `${safeTrackAreaWidth}px`,
            willChange: 'transform', // GPU加速
            backfaceVisibility: 'hidden', // チラつき防止
            perspective: '1000px' // 3D加速有効化
          }}
        >
          
          {/* 高速細かいグリッド（可視範囲のみ） */}
          {visibleFineGridLines.map(line => (
            <div key={line.key} className="absolute" style={{ left: `${line.left}px` }}>
              <div 
                className="w-px h-8 bg-gray-500" 
                style={{ 
                  opacity: line.opacity,
                  willChange: 'transform',
                  transform: 'translate3d(0, 0, 0)'
                }}
              />
            </div>
          ))}
          
          {/* 高速拍グリッドライン（可視範囲のみ） */}
          {visibleBeatGridLines.map(line => (
            <div key={line.key} className="absolute" style={{ left: `${line.left}px` }}>
              <div 
                className="w-px h-12 bg-gray-600 opacity-30"
                style={{
                  willChange: 'transform',
                  transform: 'translate3d(0, 0, 0)'
                }}
              />
            </div>
          ))}
          
          {/* 高速適応的タイムマーカー（可視範囲のみ） */}
          {visibleTimeMarkers.map(marker => (
            <div key={marker.key} className="absolute" style={{ 
              left: `${marker.left}px`,
              willChange: 'transform',
              transform: 'translate3d(0, 0, 0)'
            }}>
              <div 
                className={`${
                  marker.isMainMarker ? 'w-0.5 h-8 bg-gray-300' : 
                  marker.isBeatMarker ? 'w-px h-6 bg-gray-400' : 
                  'w-px h-4 bg-gray-500'
                }`}
              />
              {marker.isMainMarker && (
                <span className="absolute top-9 -translate-x-1/2 text-xs text-gray-300 whitespace-nowrap">
                  {formatTime(marker.time)}
                </span>
              )}
            </div>
          ))}
          
          {/* 高速小節マーカー（可視範囲のみ） */}
          {visibleBarMarkers.map(marker => (
            <div key={marker.key} className="absolute" style={{ 
              left: `${marker.left}px`,
              willChange: 'transform',
              transform: 'translate3d(0, 0, 0)'
            }}>
              <div className="w-0.5 h-10 bg-blue-400" />
              <span className="absolute top-11 -translate-x-1/2 text-xs text-blue-300 font-medium whitespace-nowrap">
                {marker.barNumber}
              </span>
            </div>
          ))}
          
          {/* GPU加速対応高FPS再生位置バー */}
          <div
            ref={playbackHeadRef}
            className="absolute top-0 w-1 h-full bg-red-500 z-20 shadow-lg cursor-ew-resize"
            style={{ 
              willChange: 'transform', // GPU加速有効化
              backfaceVisibility: 'hidden', // チラつき防止
              transform: 'translate3d(0, 0, 0)', // 初期値
              transition: 'none',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)'
            }}
            onMouseDown={onPlaybackHeadDragStart}
            title={`🚀 高FPS再生位置: ${currentTime.toFixed(2)}s`}
          />
        </div>
      </div>
    </div>
  )
}

export default TimelineHeader