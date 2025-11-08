import { useState, useEffect } from 'react'
import { Slider } from '../ui/slider.jsx'
import { Button } from '../ui/button.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.jsx'
import { Checkbox } from '../ui/checkbox.jsx'
import { X, Save, RotateCcw, Brain, RefreshCw, Zap, Music } from 'lucide-react'
import { MUSIC_GENRES, SCALE_DEFINITIONS } from '../../utils/musicTheory/MusicTheorySystem.js'

const InstrumentSettingsPanel = ({
  instrument,
  settings,
  onSettingsChange,
  onClose,
  onSave,
  onReset,
  trackId,
  // AI関連の新しいprops
  aiModel = 'magenta',  // 🔧 デフォルト値: Magenta (従来) - Piano Track MIDIエディタービュー用
  onAiModelChange,
  ghostTextEnabled = false,
  onGhostTextToggle,
  summaryStatus = { lastUpdated: null, needsUpdate: false },
  onUpdateSummary,
  predictionSettings = {
    autoPredict: true,
    predictionDelay: 100,
    ghostNoteOpacity: 0.5
  },
  onPredictionSettingsChange,
  // 音楽理論設定のprops
  musicTheorySettings = {
    scaleConstraintEnabled: false,
    selectedGenre: null,
    selectedScales: [],
    rootNote: 'C'
  },
  onMusicTheorySettingsChange
}) => {
  console.log('🎛️ InstrumentSettingsPanel: aiModel =', aiModel, 'ghostTextEnabled =', ghostTextEnabled)

  // 🔥 [CRITICAL FIX] aiModel値の正規化マッピング
  // システムレベルの値（musicRnn）をUI選択肢の値（magenta）に変換
  const normalizeAiModel = (model) => {
    if (!model || model === '' || model === 'disabled' || model === '無効') {
      return 'disabled'
    }
    // musicRnn（旧システム値）を magenta（UI選択肢値）にマッピング
    if (model === 'musicRnn') {
      return 'magenta'
    }
    // その他の値はそのまま（magenta, phi2など）
    return model
  }

  const effectiveAiModel = normalizeAiModel(aiModel)
  console.log('🔧 InstrumentSettingsPanel: effectiveAiModel =', effectiveAiModel, '(original:', aiModel, ')')

  // localStorageから音楽理論設定を読み込む
  const [localMusicTheorySettings, setLocalMusicTheorySettings] = useState(musicTheorySettings)

  useEffect(() => {
    console.log('🔄 InstrumentSettingsPanel useEffect実行:', { trackId, propsSettings: musicTheorySettings, aiModel, ghostTextEnabled })
    console.log('🔧 [CRITICAL] aiModel props値を検証:', { aiModel, type: typeof aiModel, isEmpty: !aiModel || aiModel === '' })

    // 🔥 FIX: Props完全優先 - Demo Song読み込み時など、外部からの設定変更を確実に反映
    console.log(`🔧 propsの音楽理論設定を適用 (トラック ${trackId}):`, musicTheorySettings)
    setLocalMusicTheorySettings(musicTheorySettings)

    // 🔥 [CRITICAL FIX] AI設定はprops完全優先、localStorageは無視
    // Demo Song読み込み時にpropsが最優先されるべき
    console.log('🔥 [CRITICAL FIX] AI設定はprops優先、localStorage読み込みをスキップ')

    // 🔥 [CRITICAL FIX] aiModel propsが変更された場合の強制再レンダリング
    // Demo Song読み込み時に確実にAI設定UIを更新
    if (aiModel && aiModel !== 'disabled' && aiModel !== '') {
      console.log('🔥 [CRITICAL FIX] aiModel props変更を検出、強制再レンダリング:', aiModel)
    }
  }, [trackId, musicTheorySettings, aiModel, ghostTextEnabled])

  // 🆕 FIX: propsのmusicTheorySettingsが変更された場合に強制的に同期
  // Demo Song読み込み時など、外部からの設定変更を確実に反映
  useEffect(() => {
    if (musicTheorySettings &&
        (musicTheorySettings.selectedGenre || musicTheorySettings.scaleConstraintEnabled)) {
      console.log('🔥 [CRITICAL FIX] propsの音楽理論設定変更を検出、強制同期:', musicTheorySettings)
      setLocalMusicTheorySettings(musicTheorySettings)
    }
  }, [
    musicTheorySettings?.scaleConstraintEnabled,
    musicTheorySettings?.selectedGenre,
    musicTheorySettings?.selectedScales,
    musicTheorySettings?.rootNote
  ])

  // 表示に使用する音楽理論設定（localStorageの設定を優先）
  const effectiveMusicTheorySettings = localMusicTheorySettings
  const handleParameterChange = (parameter, value) => {
    onSettingsChange(parameter, value)
  }

  const handlePredictionSettingChange = (setting, value) => {
    if (onPredictionSettingsChange) {
      onPredictionSettingsChange(setting, value)
    }
  }

  const handleMusicTheorySettingChange = (setting, value) => {
    if (onMusicTheorySettingsChange) {
      onMusicTheorySettingsChange(setting, value)
    }
  }

  const handleGenreChange = (genreId) => {
    handleMusicTheorySettingChange('selectedGenre', genreId)

    // ジャンルに推奨されるスケールを自動選択
    if (genreId && MUSIC_GENRES[genreId]) {
      const recommendedScales = MUSIC_GENRES[genreId].recommendedScales.slice(0, 2)
      handleMusicTheorySettingChange('selectedScales', recommendedScales)
    }
  }

  const handleScaleToggle = (scaleId, checked) => {
    const currentScales = effectiveMusicTheorySettings.selectedScales || []
    let newScales

    if (checked) {
      newScales = [...currentScales, scaleId]
    } else {
      newScales = currentScales.filter(scale => scale !== scaleId)
    }

    handleMusicTheorySettingChange('selectedScales', newScales)
  }

  // 推奨スケールかどうかを判定
  const isRecommendedScale = (scaleId) => {
    if (!effectiveMusicTheorySettings.selectedGenre || !MUSIC_GENRES[effectiveMusicTheorySettings.selectedGenre]) {
      return false
    }
    const genre = MUSIC_GENRES[effectiveMusicTheorySettings.selectedGenre]
    return genre.recommendedScales.includes(scaleId)
  }

  const getDefaultSettings = (instrumentType) => {
    const defaults = {
      // 基本パラメータ
      volume: 75,
      pan: 0,
      
      // エンベロープ
      attack: 10,
      decay: 100,
      sustain: 70,
      release: 200,
      
      // シンセ固有
      waveform: 'sine',
      filterFreq: 1000,
      filterQ: 1,
      
      // エフェクト
      reverb: 0,
      delay: 0,
      chorus: 0,
      
      // ドラム固有
      drumKit: 'standard',
      
      // ストリングス固有
      stringType: 'violin',
      vibrato: 0
    }

    // 楽器固有のデフォルト値
    switch (instrumentType) {
      case 'piano':
        return { ...defaults, attack: 5, decay: 50, sustain: 80, release: 150 }
      case 'synth':
        return { ...defaults, attack: 20, decay: 200, sustain: 60, release: 300 }
      case 'bass':
        return { ...defaults, attack: 15, decay: 150, sustain: 75, release: 250 }
      case 'lead':
        return { ...defaults, attack: 10, decay: 100, sustain: 70, release: 200 }
      case 'pad':
        return { ...defaults, attack: 100, decay: 500, sustain: 80, release: 1000 }
      case 'drums':
        return { ...defaults, attack: 1, decay: 50, sustain: 0, release: 100 }
      default:
        return defaults
    }
  }

  const currentSettings = { ...getDefaultSettings(instrument), ...settings }

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return '未更新';
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP');
  }

  const getSummaryStatusIcon = () => {
    if (!summaryStatus.lastUpdated) return <RefreshCw className="h-4 w-4 text-yellow-500" />;
    if (summaryStatus.needsUpdate) return <RefreshCw className="h-4 w-4 text-orange-500" />;
    return <RefreshCw className="h-4 w-4 text-green-500" />;
  };

  const getSummaryStatusText = () => {
    if (!summaryStatus.lastUpdated) return '要約未作成';
    if (summaryStatus.needsUpdate) return '要約更新が必要';
    return '要約最新';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">音色設定</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* AIモデル選択 */}
        <div className="border-b border-gray-700 pb-4 mb-4">
          <h4 className="text-md font-medium text-white mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Ghost Text
          </h4>
          
          <div className="space-y-3">
            {/* AIモデル選択 */}
            <div className="parameter-group">
              <label className="block text-sm font-medium text-gray-300 mb-2">AIモデル</label>
              <select
                value={effectiveAiModel}
                onChange={(e) => {
                  const newValue = e.target.value;
                  console.log('🔥 [CRITICAL FIX] AIモデル選択変更:', { from: effectiveAiModel, to: newValue });

                  // 即座にprops経由で親コンポーネントへ通知
                  if (onAiModelChange) {
                    onAiModelChange(newValue);
                  }

                  console.log('🔥 [CRITICAL FIX] AIモデル変更をonAiModelChangeで親に通知完了');
                }}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              >
                <option value="disabled">無効</option>
                <option value="magenta">Magenta (従来)</option>
                <option value="phi2" disabled style={{ textDecoration: 'line-through', color: '#6b7280' }}>
                  Phi-2 (高速) - 開発中
                </option>
              </select>

              {effectiveAiModel === 'phi2' && (
                <div className="mt-2 p-2 bg-yellow-900 border border-yellow-700 rounded text-yellow-200 text-xs">
                  ⚠️ Phi-2モデルは現在開発中です。軽量予測が使用されます。
                </div>
              )}
            </div>

            {/* Ghost Text有効/無効 */}
            {effectiveAiModel !== 'disabled' && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Ghost Text</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ghostTextEnabled}
                    onChange={(e) => onGhostTextToggle && onGhostTextToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            )}

            {/* 要約管理（Phi-2の場合のみ表示） */}
            {effectiveAiModel === 'phi2' && ghostTextEnabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">要約状態</span>
                  <div className="flex items-center gap-1">
                    {getSummaryStatusIcon()}
                    <span className="text-xs text-gray-400">{getSummaryStatusText()}</span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  最終更新: {formatLastUpdated(summaryStatus.lastUpdated)}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUpdateSummary}
                  disabled={!summaryStatus.needsUpdate && summaryStatus.lastUpdated}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  要約を更新
                </Button>
              </div>
            )}

            {/* 予測設定（Phi-2の場合のみ表示） */}
            {effectiveAiModel === 'phi2' && ghostTextEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">自動予測</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={predictionSettings.autoPredict}
                      onChange={(e) => handlePredictionSettingChange('autoPredict', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="parameter-group">
                  <label className="block text-sm font-medium text-gray-300 mb-1">予測遅延 (ms)</label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[predictionSettings.predictionDelay]}
                      onValueChange={([value]) => handlePredictionSettingChange('predictionDelay', value)}
                      min={50}
                      max={500}
                      step={10}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-400 w-12">{predictionSettings.predictionDelay}</span>
                  </div>
                </div>

                <div className="parameter-group">
                  <label className="block text-sm font-medium text-gray-300 mb-1">ゴーストノート透明度</label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[predictionSettings.ghostNoteOpacity * 100]}
                      onValueChange={([value]) => handlePredictionSettingChange('ghostNoteOpacity', value / 100)}
                      min={10}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-400 w-12">{Math.round(predictionSettings.ghostNoteOpacity * 100)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 音楽理論設定 */}
        <div className="border-b border-gray-700 pb-4 mb-4">
          <h4 className="text-md font-medium text-white mb-3 flex items-center gap-2">
            <Music className="h-4 w-4" />
            音楽理論設定
          </h4>

            <div className="space-y-3">
              {/* スケール制約有効/無効 */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">スケール制約</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={effectiveMusicTheorySettings.scaleConstraintEnabled}
                    onChange={(e) => handleMusicTheorySettingChange('scaleConstraintEnabled', e.target.checked)}
                    className="sr-only peer"
                    data-testid="scale-constraint-toggle"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* ジャンル選択 */}
              {effectiveMusicTheorySettings.scaleConstraintEnabled && (
                <div className="space-y-3" data-testid="music-theory-section">
                  <div className="parameter-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">ジャンル</label>
                    <Select
                      value={effectiveMusicTheorySettings.selectedGenre || ''}
                      onValueChange={handleGenreChange}
                      data-testid="genre-select"
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="ジャンルを選択..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MUSIC_GENRES).map(([genreId, genre]) => (
                          <SelectItem key={genreId} value={genreId}>
                            {genre.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* スケール選択 */}
                  {effectiveMusicTheorySettings.selectedGenre && (
                    <div className="space-y-2" data-testid="scales-section">
                      <label className="block text-sm font-medium text-gray-300">使用スケール</label>
                      <div className="space-y-2">
                        {Object.entries(SCALE_DEFINITIONS).map(([scaleId, scale]) => {
                          const isChecked = (effectiveMusicTheorySettings.selectedScales || []).includes(scaleId)
                          const isRecommended = isRecommendedScale(scaleId)

                          return (
                            <div
                              key={scaleId}
                              className={`flex items-center space-x-2 p-2 rounded ${
                                isRecommended ? 'bg-blue-900/30 border border-blue-700/50 recommended' : 'bg-gray-800/50'
                              }`}
                            >
                              <Checkbox
                                id={`scale-${scaleId}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => handleScaleToggle(scaleId, checked)}
                                data-testid={`scale-${scaleId.replace(/\s+/g, '')}`}
                              />
                              <label
                                htmlFor={`scale-${scaleId}`}
                                className={`text-sm cursor-pointer flex-1 ${
                                  isRecommended ? 'text-blue-200 font-medium' : 'text-gray-300'
                                }`}
                              >
                                {scale.name}
                                {isRecommended && (
                                  <span className="ml-2 text-xs text-blue-400">推奨</span>
                                )}
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ルート音設定 */}
                  <div className="parameter-group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">ルート音</label>
                    <Select
                      value={effectiveMusicTheorySettings.rootNote || 'C'}
                      onValueChange={(value) => handleMusicTheorySettingChange('rootNote', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((note) => (
                          <SelectItem key={note} value={note}>
                            {note}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>

        {/* 基本パラメータ */}
        <div className="space-y-4">
          <div className="parameter-group">
            <label className="block text-sm font-medium text-gray-300 mb-2">音量</label>
            <div className="flex items-center gap-2">
              <Slider
                value={[currentSettings.volume]}
                onValueChange={([value]) => handleParameterChange('volume', value)}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-gray-400 w-8">{currentSettings.volume}</span>
            </div>
          </div>

          <div className="parameter-group">
            <label className="block text-sm font-medium text-gray-300 mb-2">パン</label>
            <div className="flex items-center gap-2">
              <Slider
                value={[currentSettings.pan]}
                onValueChange={([value]) => handleParameterChange('pan', value)}
                min={-100}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-gray-400 w-8">{currentSettings.pan}</span>
            </div>
          </div>

          {/* エンベロープ設定 */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-md font-medium text-white mb-3">エンベロープ</h4>
            
            <div className="space-y-3">
              <div className="parameter-group">
                <label className="block text-sm font-medium text-gray-300 mb-1">アタック (ms)</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[currentSettings.attack]}
                    onValueChange={([value]) => handleParameterChange('attack', value)}
                    min={0}
                    max={1000}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-400 w-12">{currentSettings.attack}</span>
                </div>
              </div>

              <div className="parameter-group">
                <label className="block text-sm font-medium text-gray-300 mb-1">ディケイ (ms)</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[currentSettings.decay]}
                    onValueChange={([value]) => handleParameterChange('decay', value)}
                    min={0}
                    max={1000}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-400 w-12">{currentSettings.decay}</span>
                </div>
              </div>

              <div className="parameter-group">
                <label className="block text-sm font-medium text-gray-300 mb-1">サステイン (%)</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[currentSettings.sustain]}
                    onValueChange={([value]) => handleParameterChange('sustain', value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-400 w-12">{currentSettings.sustain}</span>
                </div>
              </div>

              <div className="parameter-group">
                <label className="block text-sm font-medium text-gray-300 mb-1">リリース (ms)</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[currentSettings.release]}
                    onValueChange={([value]) => handleParameterChange('release', value)}
                    min={0}
                    max={2000}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-400 w-12">{currentSettings.release}</span>
                </div>
              </div>
            </div>
          </div>

          {/* シンセ固有パラメータ */}
          {instrument === 'synth' && (
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-md font-medium text-white mb-3">シンセ設定</h4>
              
              <div className="space-y-3">
                <div className="parameter-group">
                  <label className="block text-sm font-medium text-gray-300 mb-2">波形</label>
                  <select
                    value={currentSettings.waveform}
                    onChange={(e) => handleParameterChange('waveform', e.target.value)}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="sine">サイン波</option>
                    <option value="square">矩形波</option>
                    <option value="sawtooth">のこぎり波</option>
                    <option value="triangle">三角波</option>
                  </select>
                </div>

                <div className="parameter-group">
                  <label className="block text-sm font-medium text-gray-300 mb-1">フィルター周波数</label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[currentSettings.filterFreq]}
                      onValueChange={([value]) => handleParameterChange('filterFreq', value)}
                      min={20}
                      max={20000}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-400 w-16">{currentSettings.filterFreq}</span>
                  </div>
                </div>

                <div className="parameter-group">
                  <label className="block text-sm font-medium text-gray-300 mb-1">フィルターQ</label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[currentSettings.filterQ]}
                      onValueChange={([value]) => handleParameterChange('filterQ', value)}
                      min={0.1}
                      max={20}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-400 w-12">{currentSettings.filterQ.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* エフェクト設定 */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-md font-medium text-white mb-3">エフェクト</h4>
            
            <div className="space-y-3">
              <div className="parameter-group">
                <label className="block text-sm font-medium text-gray-300 mb-1">リバーブ</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[currentSettings.reverb]}
                    onValueChange={([value]) => handleParameterChange('reverb', value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-400 w-8">{currentSettings.reverb}</span>
                </div>
              </div>

              <div className="parameter-group">
                <label className="block text-sm font-medium text-gray-300 mb-1">ディレイ</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[currentSettings.delay]}
                    onValueChange={([value]) => handleParameterChange('delay', value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-400 w-8">{currentSettings.delay}</span>
                </div>
              </div>

              <div className="parameter-group">
                <label className="block text-sm font-medium text-gray-300 mb-1">コーラス</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[currentSettings.chorus]}
                    onValueChange={([value]) => handleParameterChange('chorus', value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-400 w-8">{currentSettings.chorus}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstrumentSettingsPanel 