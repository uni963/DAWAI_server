import { Button } from '../ui/button.jsx'
import { Slider } from '../ui/slider.jsx'
import { Badge } from '../ui/badge.jsx'
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
  Repeat,
  Volume2,
  VolumeX,
  Undo2,
  Redo2,
  Trash2,
  Sliders,
  ThumbsUp,
  RotateCcw,
  RefreshCw
} from 'lucide-react'

const MidiEditorToolbar = ({
  // 再生関連
  isPlaying,
  onPlayPause,
  onStop,
  notesLength,

  // 操作関連
  onUndo,
  canUndo,
  onRedo,
  canRedo,
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

  // 承認待ちノート数
  pendingNotesCount = 0,

  // 設定関連
  showSettings,
  onToggleSettings,

  // 音色設定関連
  onOpenSoundSettings,

  // 🆕 補完機能関連（オプショナル）
  onAcceptPrediction,
  onUndoApproval,
  onCyclePhraseSet,
  hasPredictions = false
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
          onClick={(e) => {
            // 🎸 [Bass Track Debug] MIDIエディタ再生ボタン押下ログ
            console.log('🎸 [Bass Track Debug] ==================== MIDI EDITOR PLAY BUTTON PRESSED ====================')
            console.log('🎸 [Bass Track Debug] MidiEditorToolbar play button pressed at:', new Date().toISOString())
            console.log('🎸 [Bass Track Debug] Current isPlaying state:', isPlaying)
            console.log('🎸 [Bass Track Debug] Will trigger:', isPlaying ? 'PAUSE' : 'PLAY')
            console.log('🎸 [Bass Track Debug] Notes length:', notesLength)
            console.log('🎸 [Bass Track Debug] Current tempo:', tempo)
            console.log('🎸 [Bass Track Debug] Audio enabled:', audioEnabled)
            console.log('🔧 [Event Debug] Event object received:', e ? 'YES' : 'NO')
            console.log('🔧 [Event Debug] Event type:', e?.type || 'undefined')
            console.log('🔧 [Event Debug] Event target:', e?.target?.tagName || 'undefined')
            console.log('🎸 [Bass Track Debug] Calling onPlayPause with event...')
            console.log('🎸 [Bass Track Debug] ========================================================================')

            onPlayPause(e)
          }}
          disabled={false}
          title={notesLength === 0 ? "空トラックでリアルタイム録音" : "再生"}
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
          title="元に戻す (Ctrl+Z)"
          className="h-10 w-10 p-0"
        >
          <Undo2 className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="やり直す (Ctrl+Y)"
          className="h-10 w-10 p-0"
        >
          <Redo2 className="h-5 w-5" />
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

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            console.log('🔧 Debug MidiEditorToolbar: Sound settings button clicked')
            console.log('🔧 Debug MidiEditorToolbar: onOpenSoundSettings type:', typeof onOpenSoundSettings)
            console.log('🔧 Debug MidiEditorToolbar: onOpenSoundSettings:', onOpenSoundSettings)
            if (onOpenSoundSettings) {
              console.log('🔧 Debug MidiEditorToolbar: Calling onOpenSoundSettings...')
              onOpenSoundSettings()
              console.log('🔧 Debug MidiEditorToolbar: onOpenSoundSettings called successfully')
            } else {
              console.error('🔧 Debug MidiEditorToolbar: onOpenSoundSettings is not available!')
            }
          }}
          title="音色設定"
          className="text-blue-400 hover:text-blue-300 h-10 w-10 p-0"
        >
          <Sliders className="h-5 w-5" />
        </Button>

        {/* 🆕 補完機能ボタン（Ghost Text有効時のみ表示） */}
        {ghostTextEnabled && hasPredictions && (
          <>
            {/* 承認ボタン（TABキーの代替） */}
            {onAcceptPrediction && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  console.log('✅ [TOOLBAR] 補完承認ボタンクリック')
                  onAcceptPrediction()
                }}
                title="補完を承認 (TABキー)"
                className="text-green-400 hover:text-green-300 hover:bg-green-900/30 h-10 w-10 p-0"
              >
                <ThumbsUp className="h-5 w-5" />
              </Button>
            )}

            {/* 承認取り消しボタン（Shift+TABの代替） */}
            {onUndoApproval && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  console.log('↩️ [TOOLBAR] 承認取り消しボタンクリック')
                  onUndoApproval()
                }}
                title="承認を取り消し (Shift+TAB)"
                className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30 h-10 w-10 p-0"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            )}

            {/* フレーズ切り替えボタン（↑キーの代替） */}
            {onCyclePhraseSet && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  console.log('🔄 [TOOLBAR] フレーズ切り替えボタンクリック')
                  onCyclePhraseSet()
                }}
                title="フレーズ候補を切り替え (↑キー)"
                className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 h-10 w-10 p-0"
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            )}
          </>
        )}
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
            className={`${loopEnabled ? 'text-blue-400 bg-blue-900/30' : 'text-white hover:bg-gray-700'} h-10 w-10 p-0`}
            title="ループ"
          >
            <Repeat className="h-5 w-5" />
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
            min={0.2}
            max={3}
            step={0.1}
            className="w-16"
          />
          <span className="text-xs text-gray-400 w-6">{zoom.toFixed(1)}x</span>
        </div>

        {/* AI Pending Indicator */}
        <div className="flex items-center space-x-1" style={{ display: 'none' }}>
          <span className="text-xs text-gray-400">AI Pending:</span>
          <div className={`
            px-2 py-1 text-sm rounded text-center font-mono min-w-[2.5rem]
            ${pendingNotesCount > 0
              ? 'bg-orange-900/40 border border-orange-500/50 text-orange-300 animate-pulse'
              : 'bg-gray-800 border border-gray-600 text-gray-500'
            }
          `}>
            {pendingNotesCount}
          </div>
        </div>

        {/* Ghost Text コントロール */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('⚡ Ghost Text: Toggle button clicked')
              console.log('⚡ Ghost Text: Current enabled state:', ghostTextEnabled)
              console.log('⚡ Ghost Text: onToggleGhostText type:', typeof onToggleGhostText)
              if (onToggleGhostText) {
                console.log('⚡ Ghost Text: Calling onToggleGhostText...')
                onToggleGhostText()
                console.log('⚡ Ghost Text: New enabled state will be:', !ghostTextEnabled)
              } else {
                console.warn('⚡ Ghost Text: onToggleGhostText is not defined!')
              }
            }}
            title={`Ghost Text AI予測: ${ghostTextEnabled ? 'ON' : 'OFF'} (クリックで切り替え)`}
            className={`${ghostTextEnabled ? 'text-purple-400' : 'text-gray-400'} h-10 w-10 p-0`}
          >
            {ghostTextEnabled ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('👁️ Ghost Text: Show toggle button clicked')
              console.log('👁️ Ghost Text: Current show state:', showGhostText)
              console.log('👁️ Ghost Text: onToggleShowGhostText type:', typeof onToggleShowGhostText)
              if (onToggleShowGhostText) {
                console.log('👁️ Ghost Text: Calling onToggleShowGhostText...')
                onToggleShowGhostText()
                console.log('👁️ Ghost Text: New show state will be:', !showGhostText)
              } else {
                console.warn('👁️ Ghost Text: onToggleShowGhostText is not defined!')
              }
            }}
            title={`Ghost Text表示: ${showGhostText ? 'ON' : 'OFF'} (クリックで切り替え)`}
            className={`${showGhostText ? 'text-purple-400' : 'text-gray-400'} h-10 w-10 p-0`}
            style={{ display: 'none' }}
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