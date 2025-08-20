import { Button } from '../../ui/button.jsx'
import { 
  Play,
  Pause,
  StopCircle,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Drum
} from 'lucide-react'

const PlaybackControls = ({
  isPlaying,
  onPlay,
  onPause,
  onStop,
  onSkipBack,
  onSkipForward,
  loopEnabled,
  onLoopToggle,
  metronomeEnabled,
  onMetronomeToggle,
  playbackRate,
  onPlaybackRateChange,
  currentTime,
  totalDuration,
  onDurationClick,
  pixelsPerSecond,
  onZoomIn,
  onZoomOut,
  snapToGrid,
  onSnapToggle,
  bpm,
  formatTime
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800" style={{height: '60px'}}>
      {/* 再生コントロール */}
      <div className="flex items-center space-x-2">
        <Button
          onClick={onSkipBack}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          title="5秒戻る"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => {
            console.log('🎵 PlaybackControls: Play/Pause button clicked, isPlaying:', isPlaying)
            if (isPlaying) {
              onPause()
            } else {
              onPlay()
            }
          }}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          title={isPlaying ? "一時停止" : "再生"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          onClick={onStop}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          title="停止"
        >
          <StopCircle className="h-4 w-4" />
        </Button>
        <Button
          onClick={onSkipForward}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          title="5秒進む"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
        
        {/* ループ機能 */}
        <div className="w-px h-6 bg-gray-600 mx-2" />
        <Button
          onClick={onLoopToggle}
          variant="ghost"
          size="sm"
          className={`${loopEnabled ? 'text-blue-400 bg-blue-900/30' : 'text-white hover:bg-gray-700'}`}
          title="ループ"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        {/* メトロノーム機能 */}
        <Button
          onClick={onMetronomeToggle}
          variant="ghost"
          size="sm"
          className={`${metronomeEnabled ? 'text-yellow-400 bg-yellow-900/30' : 'text-white hover:bg-gray-700'}`}
          title="メトロノーム"
        >
          <Drum className="h-4 w-4" />
        </Button>
        
        {/* 再生速度 */}
        <div className="w-px h-6 bg-gray-600 mx-2" />
        <div className="flex items-center space-x-1">
          <Button
            onClick={() => onPlaybackRateChange(Math.max(0.25, playbackRate - 0.25))}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-700 px-2 py-1 text-xs"
            title="再生速度を下げる"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <span className="text-xs text-gray-300 min-w-[3rem] text-center">
            {playbackRate}x
          </span>
          <Button
            onClick={() => onPlaybackRateChange(Math.min(4.0, playbackRate + 0.25))}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-700 px-2 py-1 text-xs"
            title="再生速度を上げる"
          >
            <RotateCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* 時間表示とズームコントロール */}
      <div className="flex items-center space-x-4 text-sm text-gray-300">
        <span>{formatTime(currentTime)}</span>
        <span>/</span>
        <button
          onClick={onDurationClick}
          className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
          title="曲の長さを設定"
        >
          {formatTime(totalDuration / 1000)}
        </button>
        <div className="flex items-center space-x-2 ml-4">
          <span className="text-xs">ズーム:</span>
          <Button
            onClick={onZoomOut}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-700 px-2 py-1 text-xs"
          >
            -
          </Button>
          <span className="text-xs w-12 text-center">{Math.round(pixelsPerSecond)}px</span>
          <Button
            onClick={onZoomIn}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-700 px-2 py-1 text-xs"
          >
            +
          </Button>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <Button
            onClick={onSnapToggle}
            variant="ghost"
            size="sm"
            className={`px-2 py-1 text-xs ${snapToGrid ? 'text-blue-400 bg-blue-900/30' : 'text-white hover:bg-gray-700'}`}
            title={`グリッドスナップ ${snapToGrid ? 'ON' : 'OFF'} (最小間隔: ${snapToGrid ? Math.max(60 / bpm / 8, 0.1).toFixed(2) : '自由'}秒)`}
          >
            Grid
          </Button>
          <span className="text-xs text-gray-400">{bpm}BPM</span>
        </div>
      </div>
    </div>
  )
}

export default PlaybackControls 