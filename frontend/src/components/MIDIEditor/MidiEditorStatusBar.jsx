import { Badge } from '../ui/badge.jsx'

const MidiEditorStatusBar = ({
  // トラック情報
  trackName,
  trackType,
  trackColor,
  
  // Ghost Text関連
  ghostTextStatus = { isActive: false },
  currentModel,

  // 🔴 [NEW] Issue #147: 候補情報
  nextGhostIndex = 0,
  totalGhostCandidates = 0,
  nextPhraseIndex = 0,
  totalPhraseCandidates = 0,

  // 🆕 v2.0.0: フレーズセット情報
  phraseSets = [],
  selectedPhraseSetIndex = 0,
  currentNoteIndex = 0,

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
        {/* 🔴 [NEW] Issue #147: Ghost候補インジケーター */}
        {totalGhostCandidates > 0 && (
          <Badge variant="secondary" className="text-xs bg-purple-800 border-purple-400">
            Ghost候補: {nextGhostIndex + 1}/{totalGhostCandidates}
          </Badge>
        )}
        {/* 🔴 [NEW] Issue #147: フレーズ候補インジケーター（v1.0.0互換） */}
        {totalPhraseCandidates > 0 && phraseSets.length === 0 && (
          <Badge variant="secondary" className="text-xs bg-green-800 border-green-400">
            フレーズ候補: {nextPhraseIndex + 1}/{totalPhraseCandidates}
          </Badge>
        )}
        {/* 🆕 v2.0.0: フレーズセットインジケーター */}
        {phraseSets.length > 0 && (
          <Badge variant="secondary" className="text-xs bg-green-800 border-green-400">
            フレーズセット: {selectedPhraseSetIndex + 1}/{phraseSets.length} (承認: {currentNoteIndex}/{phraseSets[selectedPhraseSetIndex]?.length || 0})
          </Badge>
        )}
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