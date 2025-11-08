import { Badge } from '../ui/badge.jsx'

const MidiEditorStatusBar = ({
  // トラック情報
  trackName,
  trackType,
  trackColor,
  
  // Ghost Text関連
  ghostTextStatus = { isActive: false },
  currentModel,
  
  // ノート情報
  notesCount,

  // オーディオ・再生状態
  audioEnabled,
  isPlaying,
  tempo,
  loopEnabled,
  metronomeEnabled,
  
  // 時間情報
  currentTime,
  playbackDuration,
  
  // パフォーマンス指標
  performanceMetrics = { averagePredictionTime: 0, cacheHitRate: 0, totalPredictions: 0 }
}) => {
  // モデル名の取得（MagentaGhostTextEngineで実際に使用されているモデルに合わせて更新）
  const getModelDisplayName = (modelKey) => {
    const modelNames = {
      'musicRnn': 'Music RNN',
      'musicVae': 'Music VAE',
      'melodyRnn': 'Melody RNN',
      'fallback': 'フォールバック予測'
    }
    return modelNames[modelKey] || modelKey
  }

  // モデルステータスに基づくバッジの色を決定
  const getModelBadgeVariant = () => {
    if (!ghostTextStatus.isInitialized) {
      return 'secondary'
    }
    if (ghostTextStatus.modelType === 'fallback') {
      return 'outline'
    }
    return 'default'
  }

  return (
    <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center space-x-3">
        <Badge variant="outline" className={`bg-${trackColor}-900 border-${trackColor}-500 text-xs`}>
          Track: {trackName}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Type: {trackType}
        </Badge>
        <Badge variant={ghostTextStatus.isActive ? 'default' : 'secondary'} className="text-xs">
          Ghost Text: {ghostTextStatus.isActive ? 'Active' : 'Inactive'}
        </Badge>
        <Badge variant={getModelBadgeVariant()} className="bg-purple-900 border-purple-500 text-xs">
          AI: {getModelDisplayName(currentModel)}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Notes: {notesCount}
        </Badge>
        <Badge variant="outline" className={`text-xs ${audioEnabled ? 'bg-green-900' : 'bg-gray-700'}`}>
          Audio: {audioEnabled ? 'ON' : 'OFF'}
        </Badge>
        <Badge variant="outline" className={`text-xs ${isPlaying ? 'bg-blue-900' : 'bg-gray-700'}`}>
          {isPlaying ? 'Playing' : 'Stopped'}
        </Badge>
        <Badge variant="outline" className="text-xs">
          BPM: {tempo}
        </Badge>
        <Badge variant="outline" className={`text-xs ${loopEnabled ? 'bg-green-900' : 'bg-gray-700'}`}>
          Loop: {loopEnabled ? 'ON' : 'OFF'}
        </Badge>
        <Badge variant="outline" className={`text-xs ${metronomeEnabled ? 'bg-yellow-900' : 'bg-gray-700'}`}>
          Metronome: {metronomeEnabled ? 'ON' : 'OFF'}
        </Badge>
      </div>
      <div className="flex items-center space-x-3 text-xs text-gray-400">
        <span>Time: {currentTime.toFixed(2)}s</span>
        <span>Duration: {playbackDuration}s</span>
        <span>Avg Prediction: {performanceMetrics.averagePredictionTime.toFixed(1)}ms</span>
        <span>Cache Hit: {(performanceMetrics.cacheHitRate * 100).toFixed(1)}%</span>
        <span>Total: {performanceMetrics.totalPredictions}</span>
      </div>
    </div>
  )
}

export default MidiEditorStatusBar 