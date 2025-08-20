import { Button } from '../ui/button.jsx'
import { Slider } from '../ui/slider.jsx'
import { useState, useEffect } from 'react'
import {
  Play,
  Pause,
  StopCircle,
  Settings,
  Zap,
  ZapOff,
  Eye,
  EyeOff,
  Target,
  Volume2,
  VolumeX,
  Undo,
  Trash2,
  Sliders
} from 'lucide-react'
import InstrumentSelector from './InstrumentSelector.jsx'

const MidiEditorToolbar = ({
  // 再生関連
  isPlaying,
  onPlayPause,
  onStop,
  notesLength,
  
  // 操作関連
  onUndo,
  canUndo,
  onShowDeleteConfirm,
  
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
  
  // ズーム関連
  zoom,
  onZoomChange,
  
  // Ghost Text関連
  ghostTextEnabled,
  onToggleGhostText,
  showGhostText,
  onToggleShowGhostText,
  
  // 設定関連
  showSettings,
  onToggleSettings,
  
  // 音色関連
  currentInstrument,
  onInstrumentChange,
  onOpenInstrumentSettings
}) => {
  // BPM変更時のハイライト状態
  const [tempoHighlight, setTempoHighlight] = useState(false)
  const [lastTempo, setLastTempo] = useState(tempo)
  const [isEditingTempo, setIsEditingTempo] = useState(false)
  const [tempTempoValue, setTempTempoValue] = useState(tempo.toString())
  
  // BPM変更時のハイライト効果
  useEffect(() => {
    if (tempo !== lastTempo) {
      setTempoHighlight(true)
      setLastTempo(tempo)
      setTempTempoValue(tempo.toString())
      
      // 1秒後にハイライトを解除
      const timer = setTimeout(() => {
        setTempoHighlight(false)
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [tempo, lastTempo])
  
  // BPM変更ハンドラー
  const handleTempoChange = (newTempo) => {
    onTempoChange(newTempo)
  }
  
  // BPM入力確定処理
  const confirmTempoChange = () => {
    if (isPlaying) return
    
    const value = parseInt(tempTempoValue) || 120
    // 確定時のみ範囲チェック
    const clampedValue = Math.max(40, Math.min(300, value))
    handleTempoChange(clampedValue)
    setIsEditingTempo(false)
  }
  
  // BPM入力キャンセル処理
  const cancelTempoChange = () => {
    setTempTempoValue(tempo.toString())
    setIsEditingTempo(false)
  }
  return (
    <div className="flex items-center justify-between p-2 border-b border-gray-700">
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlayPause}
          disabled={notesLength === 0}
          className="hover:bg-gray-700 focus:bg-gray-700 h-10 w-10 p-0"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onStop}
          disabled={!isPlaying}
          className="h-10 w-10 p-0"
        >
          <StopCircle className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="巻き戻し (Ctrl+Z)"
          className="h-10 w-10 p-0"
        >
          <Undo className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowDeleteConfirm}
          disabled={notesLength === 0}
          title="全削除"
          className="text-red-400 hover:text-red-300 h-10 w-10 p-0"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleAudio}
          className={`${audioEnabled ? 'text-green-400' : 'text-gray-400'} h-10 w-10 p-0`}
        >
          {audioEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
        
        {/* 音色選択 */}
        <InstrumentSelector
          currentInstrument={currentInstrument}
          onInstrumentChange={onInstrumentChange}
        />
        
        {/* 音色設定ボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenInstrumentSettings}
          className="text-blue-400 hover:text-blue-300 h-10 w-10 p-0"
          title="音色設定"
        >
          <Sliders className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center space-x-3">
        {/* テンポコントロール */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-400">BPM:</span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTempoChange(Math.max(40, tempo - 1))}
              disabled={isPlaying}
              className={`h-6 w-6 p-0 text-xs ${isPlaying ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}`}
              title={isPlaying ? "再生中はBPM変更できません" : "BPMを1下げる"}
            >
              -
            </Button>
            <input
              type="number"
              value={isEditingTempo ? tempTempoValue : tempo}
              disabled={isPlaying}
              onChange={(e) => {
                if (isPlaying) return
                // 入力中は制限なしで自由に入力
                setTempTempoValue(e.target.value)
                setIsEditingTempo(true)
              }}
              onKeyDown={(e) => {
                if (isPlaying) return
                
                switch (e.key) {
                  case 'Enter':
                    e.preventDefault()
                    confirmTempoChange()
                    break
                  case 'Escape':
                    e.preventDefault()
                    cancelTempoChange()
                    break
                  case 'ArrowUp':
                    e.preventDefault()
                    if (!isEditingTempo) {
                      handleTempoChange(Math.min(300, tempo + 1))
                    } else {
                      // 編集中は制限なしで入力値を更新
                      const currentValue = parseInt(tempTempoValue) || tempo
                      setTempTempoValue((currentValue + 1).toString())
                    }
                    break
                  case 'ArrowDown':
                    e.preventDefault()
                    if (!isEditingTempo) {
                      handleTempoChange(Math.max(40, tempo - 1))
                    } else {
                      // 編集中は制限なしで入力値を更新
                      const currentValue = parseInt(tempTempoValue) || tempo
                      setTempTempoValue((currentValue - 1).toString())
                    }
                    break
                }
              }}
              onFocus={() => {
                if (!isPlaying) {
                  setIsEditingTempo(true)
                  setTempTempoValue(tempo.toString())
                }
              }}
              onBlur={() => {
                if (isEditingTempo) {
                  confirmTempoChange()
                }
              }}
              className={`w-16 px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white text-center focus:border-blue-500 focus:outline-none ${
                tempoHighlight ? 'border-yellow-500' : ''
              } ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''} ${
                isEditingTempo ? 'border-green-500' : ''
              }`}
              step="1"
              title={isPlaying ? "再生中はBPM変更できません" : "BPMを入力 (Enter: 確定, Escape: キャンセル, ↑↓: 微調整)"}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTempoChange(Math.min(300, tempo + 1))}
              disabled={isPlaying}
              className={`h-6 w-6 p-0 text-xs ${isPlaying ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}`}
              title={isPlaying ? "再生中はBPM変更できません" : "BPMを1上げる"}
            >
              +
            </Button>
          </div>
        </div>

        {/* ループコントロール */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleLoop}
            className={`${loopEnabled ? 'text-green-400' : 'text-gray-400'} h-10 w-10 p-0`}
          >
            <Target className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMetronome}
            className={`${metronomeEnabled ? 'text-yellow-400' : 'text-gray-400'} h-10 w-10 p-0`}
          >
            <Volume2 className="h-5 w-5" />
          </Button>
        </div>

        {/* ズームコントロール */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-400">Zoom:</span>
          <Slider
            value={[zoom]}
            onValueChange={([value]) => onZoomChange(value)}
            min={0.5}
            max={3}
            step={0.1}
            className="w-16"
          />
          <span className="text-xs text-gray-400 w-6">{zoom.toFixed(1)}x</span>
        </div>

        {/* Ghost Text コントロール */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleGhostText}
            className={`${ghostTextEnabled ? 'text-purple-400' : 'text-gray-400'} h-10 w-10 p-0`}
          >
            {ghostTextEnabled ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleShowGhostText}
            className={`${showGhostText ? 'text-purple-400' : 'text-gray-400'} h-10 w-10 p-0`}
          >
            {showGhostText ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSettings}
          className="h-10 w-10 p-0"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

export default MidiEditorToolbar 