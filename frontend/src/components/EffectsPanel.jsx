import { useState, useEffect, useMemo } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Slider } from './ui/slider'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { 
  Plus, 
  Trash2, 
  Settings, 
  Volume2, 
  Zap,
  Waves,
  Filter,
  Disc,
  Music
} from 'lucide-react'
import enhancedAudioEngine from '../utils/enhancedAudioEngine.js'

function EffectsPanel({ trackId, track }) {
  const [effects, setEffects] = useState([])
  const [showAddEffectDialog, setShowAddEffectDialog] = useState(false)
  const [selectedEffectType, setSelectedEffectType] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')
  const [availableEffects, setAvailableEffects] = useState([])
  const [effectPresets, setEffectPresets] = useState({})
  const [editingEffect, setEditingEffect] = useState(null)

  useEffect(() => {
    // 利用可能なエフェクトタイプを取得
    const effectTypes = enhancedAudioEngine.getAvailableEffects()
    setAvailableEffects(effectTypes)

    // トラックのエフェクトを読み込み
    if (track && track.effects) {
      setEffects(track.effects)
    }
  }, [track])

  useEffect(() => {
    // 選択されたエフェクトタイプのプリセットを取得
    if (selectedEffectType) {
      const presets = enhancedAudioEngine.getEffectPresets(selectedEffectType)
      setEffectPresets({ [selectedEffectType]: presets })
    }
  }, [selectedEffectType])

  const getEffectIcon = (effectType) => {
    switch (effectType) {
      case 'reverb':
        return <Waves className="w-4 h-4" />
      case 'delay':
        return <Disc className="w-4 h-4" />
      case 'filter':
        return <Filter className="w-4 h-4" />
      case 'compressor':
        return <Volume2 className="w-4 h-4" />
      case 'distortion':
        return <Zap className="w-4 h-4" />
      case 'chorus':
        return <Music className="w-4 h-4" />
      default:
        return <Settings className="w-4 h-4" />
    }
  }

  const getEffectDisplayName = (effectType) => {
    const names = {
      reverb: 'リバーブ',
      delay: 'ディレイ',
      filter: 'フィルター',
      compressor: 'コンプレッサー',
      distortion: 'ディストーション',
      chorus: 'コーラス'
    }
    return names[effectType] || effectType
  }

  const handleAddEffect = () => {
    if (!selectedEffectType) return

    try {
      // プリセットパラメータを取得
      let params = {}
      if (selectedPreset && effectPresets[selectedEffectType]) {
        const presetData = enhancedAudioEngine.effectsEngine.getPreset(selectedEffectType, selectedPreset)
        params = { ...presetData }
      }

      // エフェクトを追加
      const effect = enhancedAudioEngine.addEffectToTrack(trackId, selectedEffectType, params)
      
      if (effect) {
        const newEffect = {
          id: `effect_${Date.now()}`,
          type: selectedEffectType,
          preset: selectedPreset || 'Custom',
          params: params,
          enabled: true,
          effect: effect
        }

        setEffects(prev => [...prev, newEffect])
        setShowAddEffectDialog(false)
        setSelectedEffectType('')
        setSelectedPreset('')
        
        console.log(`Added ${selectedEffectType} effect to track ${trackId}`)
      }
    } catch (error) {
      console.error('Failed to add effect:', error)
      alert('エフェクトの追加に失敗しました')
    }
  }

  const handleRemoveEffect = (effectId) => {
    try {
      enhancedAudioEngine.removeEffectFromTrack(trackId, effectId)
      setEffects(prev => prev.filter(effect => effect.id !== effectId))
      console.log(`Removed effect ${effectId} from track ${trackId}`)
    } catch (error) {
      console.error('Failed to remove effect:', error)
    }
  }

  const handleToggleEffect = (effectId) => {
    setEffects(prev => prev.map(effect => {
      if (effect.id === effectId) {
        const newEnabled = !effect.enabled
        // TODO: エフェクトのバイパス機能を実装
        return { ...effect, enabled: newEnabled }
      }
      return effect
    }))
  }

  const handleUpdateEffectParam = (effectId, paramName, value) => {
    setEffects(prev => prev.map(effect => {
      if (effect.id === effectId) {
        const newParams = { ...effect.params, [paramName]: value }
        
        // エフェクトのパラメータを更新
        if (effect.effect && effect.effect.updateParams) {
          effect.effect.updateParams({ [paramName]: value })
        }
        
        return { ...effect, params: newParams }
      }
      return effect
    }))
  }

  const renderEffectControls = (effect) => {
    const { type, params } = effect

    // パラメータ値をメモ化（無限ループ防止）
    const roomSizeValue = useMemo(() => [params.roomSize || 2], [params.roomSize])
    const wetLevelValue = useMemo(() => [params.wetLevel || 30], [params.wetLevel])
    const dampeningValue = useMemo(() => [params.dampening || 0.5], [params.dampening])
    const delayTimeValue = useMemo(() => [params.delayTime || 0.3], [params.delayTime])
    const feedbackValue = useMemo(() => [params.feedback || 0.3], [params.feedback])
    const frequencyValue = useMemo(() => [params.frequency || 1000], [params.frequency])
    const resonanceValue = useMemo(() => [params.resonance || 1], [params.resonance])
    const thresholdValue = useMemo(() => [params.threshold || -24], [params.threshold])
    const ratioValue = useMemo(() => [params.ratio || 12], [params.ratio])
    const attackValue = useMemo(() => [params.attack || 0.003], [params.attack])
    const releaseValue = useMemo(() => [params.release || 0.25], [params.release])

    switch (type) {
      case 'reverb':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-300">Room Size</Label>
              <Slider
                defaultValue={roomSizeValue}
                onValueChange={([value]) => handleUpdateEffectParam(effect.id, 'roomSize', value)}
                min={0.5}
                max={5}
                step={0.1}
                className="mt-1"
              />
              <div className="text-xs text-gray-400 mt-1">{(params.roomSize || 2).toFixed(1)}</div>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Wet Level (%)</Label>
              <Slider
                defaultValue={wetLevelValue}
                onValueChange={([value]) => handleUpdateEffectParam(effect.id, 'wetLevel', value)}
                min={0}
                max={100}
                step={1}
                className="mt-1"
              />
              <div className="text-xs text-gray-400 mt-1">{params.wetLevel || 30}%</div>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Dampening</Label>
              <Slider
                defaultValue={dampeningValue}
                onValueChange={([value]) => handleUpdateEffectParam(effect.id, 'dampening', value)}
                min={0}
                max={1}
                step={0.01}
                className="mt-1"
              />
              <div className="text-xs text-gray-400 mt-1">{(params.dampening || 0.5).toFixed(2)}</div>
            </div>
          </div>
        )

      case 'delay':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-300">Delay Time (s)</Label>
              <Slider
                defaultValue={delayTimeValue}
                onValueChange={([value]) => handleUpdateEffectParam(effect.id, 'delayTime', value)}
                min={0.01}
                max={2}
                step={0.01}
                className="mt-1"
              />
              <div className="text-xs text-gray-400 mt-1">{(params.delayTime || 0.3).toFixed(2)}s</div>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Feedback</Label>
              <Slider
                defaultValue={feedbackValue}
                onValueChange={([value]) => handleUpdateEffectParam(effect.id, 'feedback', value)}
                min={0}
                max={0.9}
                step={0.01}
                className="mt-1"
              />
              <div className="text-xs text-gray-400 mt-1">{(params.feedback || 0.3).toFixed(2)}</div>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Wet Level (%)</Label>
              <Slider
                defaultValue={wetLevelValue}
                onValueChange={([value]) => handleUpdateEffectParam(effect.id, 'wetLevel', value)}
                min={0}
                max={100}
                step={1}
                className="mt-1"
              />
              <div className="text-xs text-gray-400 mt-1">{params.wetLevel || 30}%</div>
            </div>
          </div>
        )

      case 'filter':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-300">Type</Label>
              <Select
                value={params.type || 'lowpass'}
                onValueChange={(value) => handleUpdateEffectParam(effect.id, 'type', value)}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="lowpass">Low Pass</SelectItem>
                  <SelectItem value="highpass">High Pass</SelectItem>
                  <SelectItem value="bandpass">Band Pass</SelectItem>
                  <SelectItem value="notch">Notch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Frequency (Hz)</Label>
              <Slider
                defaultValue={frequencyValue}
                onValueChange={([value]) => handleUpdateEffectParam(effect.id, 'frequency', value)}
                min={20}
                max={20000}
                step={10}
                className="mt-1"
              />
              <div className="text-xs text-gray-400 mt-1">{params.frequency || 1000} Hz</div>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Resonance</Label>
              <Slider
                defaultValue={resonanceValue}
                onValueChange={([value]) => handleUpdateEffectParam(effect.id, 'resonance', value)}
                min={0.1}
                max={30}
                step={0.1}
                className="mt-1"
              />
              <div className="text-xs text-gray-400 mt-1">{(params.resonance || 1).toFixed(1)}</div>
            </div>
          </div>
        )

      case 'compressor':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-300">Threshold (dB)</Label>
              <Slider
                defaultValue={thresholdValue}
                onValueChange={([value]) => handleUpdateEffectParam(effect.id, 'threshold', value)}
                min={-60}
                max={0}
                step={1}
                className="mt-1"
              />
              <div className="text-xs text-gray-400 mt-1">{params.threshold || -24} dB</div>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Ratio</Label>
              <Slider
                defaultValue={ratioValue}
                onValueChange={([value]) => handleUpdateEffectParam(effect.id, 'ratio', value)}
                min={1}
                max={20}
                step={0.1}
                className="mt-1"
              />
              <div className="text-xs text-gray-400 mt-1">{(params.ratio || 12).toFixed(1)}:1</div>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Attack (s)</Label>
              <Slider
                defaultValue={attackValue}
                onValueChange={([value]) => handleUpdateEffectParam(effect.id, 'attack', value)}
                min={0.001}
                max={0.1}
                step={0.001}
                className="mt-1"
              />
              <div className="text-xs text-gray-400 mt-1">{(params.attack || 0.003).toFixed(3)}s</div>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Release (s)</Label>
              <Slider
                defaultValue={releaseValue}
                onValueChange={([value]) => handleUpdateEffectParam(effect.id, 'release', value)}
                min={0.01}
                max={1}
                step={0.01}
                className="mt-1"
              />
              <div className="text-xs text-gray-400 mt-1">{(params.release || 0.25).toFixed(2)}s</div>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-xs text-gray-400">
            このエフェクトのコントロールは実装中です
          </div>
        )
    }
  }

  return (
    <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">エフェクト</h3>
        <Dialog open={showAddEffectDialog} onOpenChange={setShowAddEffectDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <Plus className="w-3 h-3 mr-1" />
              追加
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">エフェクトを追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">エフェクトタイプ</Label>
                <Select value={selectedEffectType} onValueChange={setSelectedEffectType}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="エフェクトを選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {availableEffects.map((effectType) => (
                      <SelectItem key={effectType} value={effectType}>
                        <div className="flex items-center gap-2">
                          {getEffectIcon(effectType)}
                          {getEffectDisplayName(effectType)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEffectType && effectPresets[selectedEffectType] && (
                <div>
                  <Label className="text-gray-300">プリセット</Label>
                  <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="プリセットを選択（オプション）" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {effectPresets[selectedEffectType].map((preset) => (
                        <SelectItem key={preset} value={preset}>
                          {preset}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleAddEffect} disabled={!selectedEffectType}>
                  追加
                </Button>
                <Button variant="outline" onClick={() => setShowAddEffectDialog(false)}>
                  キャンセル
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-3">
          {effects.map((effect, index) => (
            <div
              key={effect.id}
              className={`p-3 rounded-lg border transition-colors ${
                effect.enabled 
                  ? 'bg-gray-800 border-gray-600' 
                  : 'bg-gray-800/50 border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getEffectIcon(effect.type)}
                  <span className="text-sm font-medium text-white">
                    {getEffectDisplayName(effect.type)}
                  </span>
                  {effect.preset && effect.preset !== 'Custom' && (
                    <Badge variant="secondary" className="text-xs">
                      {effect.preset}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 w-6 p-0 ${
                      effect.enabled ? 'text-green-400' : 'text-gray-500'
                    }`}
                    onClick={() => handleToggleEffect(effect.id)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                    onClick={() => handleRemoveEffect(effect.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {effect.enabled && (
                <>
                  <Separator className="my-2 bg-gray-700" />
                  {renderEffectControls(effect)}
                </>
              )}
            </div>
          ))}

          {effects.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">
              エフェクトが追加されていません
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default EffectsPanel

