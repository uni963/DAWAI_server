import { Slider } from '../ui/slider.jsx'
import { Button } from '../ui/button.jsx'
import { X, Save, RotateCcw, Brain, RefreshCw, Zap } from 'lucide-react'

const InstrumentSettingsPanel = ({ 
  instrument, 
  settings, 
  onSettingsChange,
  onClose,
  onSave,
  onReset,
  // AI関連の新しいprops
  aiModel = 'magenta',
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
  onPredictionSettingsChange
}) => {
  console.log('🎛️ InstrumentSettingsPanel: aiModel =', aiModel, 'ghostTextEnabled =', ghostTextEnabled)
  const handleParameterChange = (parameter, value) => {
    onSettingsChange(parameter, value)
  }

  const handlePredictionSettingChange = (setting, value) => {
    if (onPredictionSettingsChange) {
      onPredictionSettingsChange(setting, value)
    }
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
                value={aiModel}
                onChange={(e) => onAiModelChange && onAiModelChange(e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              >
                <option value="disabled">無効</option>
                <option value="magenta">Magenta (従来)</option>
                <option value="phi2" disabled style={{ textDecoration: 'line-through', color: '#6b7280' }}>
                  Phi-2 (高速) - 開発中
                </option>
              </select>
              
              {aiModel === 'phi2' && (
                <div className="mt-2 p-2 bg-yellow-900 border border-yellow-700 rounded text-yellow-200 text-xs">
                  ⚠️ Phi-2モデルは現在開発中です。軽量予測が使用されます。
                </div>
              )}
            </div>

            {/* Ghost Text有効/無効 */}
            {aiModel !== 'disabled' && (
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
            {aiModel === 'phi2' && ghostTextEnabled && (
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
            {aiModel === 'phi2' && ghostTextEnabled && (
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