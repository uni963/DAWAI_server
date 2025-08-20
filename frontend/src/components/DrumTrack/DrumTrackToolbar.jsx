import React from 'react';
import { Play, Pause, Square, RotateCcw, Trash2, Volume2, VolumeX, Repeat, Music, Settings, Download } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Switch } from '../ui/switch.jsx';

const DrumTrackToolbar = ({
  // 再生関連
  isPlaying,
  onPlayPause,
  onStop,
  activeCellCount,
  
  // 操作関連
  onUndo,
  canUndo,
  onClearGrid,
  onLoadPreset,
  
  // オーディオ関連
  audioEnabled,
  onToggleAudio,
  
  // テンポ関連
  tempo,
  onTempoChange,
  
  // ループ・メトロノーム関連
  loopEnabled,
  onToggleLoop,
  metronomeEnabled,
  onToggleMetronome,
  
  // 設定関連
  showSettings,
  onToggleSettings
}) => {
  return (
    <div className="flex items-center justify-between p-1 bg-gray-800 border-b border-gray-700">
      {/* 左側：再生コントロール */}
      <div className="flex items-center space-x-2">
        {/* 再生/一時停止ボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlayPause}
          className="h-6 w-6 p-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        {/* 停止ボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onStop}
          className="h-6 w-6 p-0"
        >
          <Square className="h-4 w-4" />
        </Button>
        
        {/* セパレーター */}
        <div className="w-px h-5 bg-gray-600" />
        
        {/* 巻き戻しボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="h-6 w-6 p-0"
          title="元に戻す"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        {/* クリアボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearGrid}
          className="h-6 w-6 p-0"
          title="グリッドをクリア"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        
        {/* プリセット読み込みボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLoadPreset && onLoadPreset('basic_rock')}
          className="h-6 w-6 p-0"
          title="プリセット読み込み (Basic Rock)"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      {/* 中央：情報表示 */}
      <div className="flex items-center space-x-4">
        {/* アクティブセル数 */}
        <div className="text-sm text-gray-300">
          アクティブ: {activeCellCount}
        </div>
        
        {/* テンポ設定 */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">BPM:</span>
                  <Input
          type="number"
          value={tempo}
          onChange={(e) => onTempoChange(parseInt(e.target.value) || 120)}
          className="w-14 h-5 text-xs"
          min="60"
          max="200"
        />
        </div>
      </div>
      
      {/* 右側：設定コントロール */}
      <div className="flex items-center space-x-2">
        {/* オーディオトグル */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleAudio}
          className="h-6 w-6 p-0"
          title={audioEnabled ? "オーディオ無効" : "オーディオ有効"}
        >
          {audioEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>
        
        {/* ループトグル */}
        <Button
          variant={loopEnabled ? "default" : "ghost"}
          size="sm"
          onClick={onToggleLoop}
          className="h-6 w-6 p-0"
          title={loopEnabled ? "ループ無効" : "ループ有効"}
        >
          <Repeat className="h-4 w-4" />
        </Button>
        
        {/* メトロノームトグル */}
        <Button
          variant={metronomeEnabled ? "default" : "ghost"}
          size="sm"
          onClick={onToggleMetronome}
          className="h-6 w-6 p-0"
          title={metronomeEnabled ? "メトロノーム無効" : "メトロノーム有効"}
        >
          <Music className="h-4 w-4" />
        </Button>
        
        {/* セパレーター */}
        <div className="w-px h-5 bg-gray-600" />
        
        {/* 設定ボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSettings}
          className="h-6 w-6 p-0"
          title="設定"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DrumTrackToolbar; 