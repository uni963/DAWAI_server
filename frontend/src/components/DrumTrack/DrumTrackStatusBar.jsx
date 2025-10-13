import React from 'react';
import { Clock, Music, Volume2, VolumeX, Repeat, Square } from 'lucide-react';

const DrumTrackStatusBar = ({
  // トラック情報
  trackName,
  trackColor,
  
  // グリッド情報
  gridSize,
  activeCellCount,
  
  // 全体統計情報
  totalBars,
  totalDuration,
  
  // オーディオ・再生状態
  audioEnabled,
  isPlaying,
  tempo,
  loopEnabled,
  metronomeEnabled,
  
  // SF2状態
  sf2Loaded,
  
  // 時間情報
  currentTime,
  playbackDuration
}) => {
  // 時間のフォーマット
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="flex items-center justify-between px-2 py-0.5 bg-gray-800 border-b border-gray-700 text-xs text-gray-300">
      {/* 左側：トラック情報 */}
      <div className="flex items-center space-x-4">
        {/* トラック名 */}
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: trackColor }}
          />
          <span className="font-medium">{trackName}</span>
        </div>
        
        {/* グリッドサイズ */}
        <div className="flex items-center space-x-1">
          <span>グリッド:</span>
          <span className="font-mono">{gridSize}</span>
        </div>
        
        {/* アクティブセル数 */}
        <div className="flex items-center space-x-1">
          <span>アクティブ:</span>
          <span className="font-mono">{activeCellCount}</span>
        </div>
        
        {/* 総小節数 */}
        {totalBars > 0 && (
          <div className="flex items-center space-x-1">
            <span>小節:</span>
            <span className="font-mono">{totalBars}</span>
          </div>
        )}
      </div>
      
      {/* 中央：再生状態 */}
      <div className="flex items-center space-x-4">
        {/* 再生状態 */}
        <div className="flex items-center space-x-1">
          {isPlaying ? (
            <>
              <Square className="w-3 h-3 text-green-400" />
              <span className="text-green-400">再生中</span>
            </>
          ) : (
            <>
              <Square className="w-3 h-3 text-gray-500" />
              <span className="text-gray-500">停止中</span>
            </>
          )}
        </div>
        
        {/* テンポ */}
        <div className="flex items-center space-x-1">
          <Music className="w-3 h-3" />
          <span>{tempo} BPM</span>
        </div>
        
        {/* オーディオ状態 */}
        <div className="flex items-center space-x-1">
          {audioEnabled ? (
            <>
              <Volume2 className="w-3 h-3 text-green-400" />
              <span className="text-green-400">オーディオ有効</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3 h-3 text-red-400" />
              <span className="text-red-400">オーディオ無効</span>
            </>
          )}
        </div>
        
        {/* ループ状態 */}
        {loopEnabled && (
          <div className="flex items-center space-x-1">
            <Repeat className="w-3 h-3 text-blue-400" />
            <span className="text-blue-400">ループ</span>
          </div>
        )}
        
        {/* メトロノーム状態 */}
        {metronomeEnabled && (
          <div className="flex items-center space-x-1">
            <Music className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-400">メトロノーム</span>
          </div>
        )}
        
        {/* SF2状態 */}
        <div className="flex items-center space-x-1">
          {sf2Loaded ? (
            <>
              <span className="w-3 h-3 text-green-400">🎵</span>
              <span className="text-green-400">SF2有効</span>
            </>
          ) : (
            <>
              <span className="w-3 h-3 text-orange-400">🎵</span>
              <span className="text-orange-400">シンセ音色</span>
            </>
          )}
        </div>
      </div>
      
      {/* 右側：時間情報 */}
      <div className="flex items-center space-x-4">
        {/* 現在時間 */}
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span className="font-mono">{formatTime(currentTime)}</span>
        </div>
        
        {/* 再生時間 */}
        {playbackDuration > 0 && (
          <div className="flex items-center space-x-1">
            <span>/</span>
            <span className="font-mono">{formatTime(playbackDuration)}</span>
          </div>
        )}
        
        {/* 総再生時間 */}
        {totalDuration > 0 && (
          <div className="flex items-center space-x-1">
            <span>総時間:</span>
            <span className="font-mono">{formatTime(totalDuration)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrumTrackStatusBar; 