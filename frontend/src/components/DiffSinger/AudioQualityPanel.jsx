import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.jsx'
import { Slider } from '../ui/slider.jsx'
import { Switch } from '../ui/switch.jsx'
import { Label } from '../ui/label.jsx'
import { Badge } from '../ui/badge.jsx'
import { Separator } from '../ui/separator.jsx'
import { 
  Settings, 
  Volume2, 
  Waves, 
  Zap, 
  Music,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

const AudioQualityPanel = ({ 
  audioQuality, 
  onAudioQualityChange, 
  cacheSettings, 
  onCacheSettingChange 
}) => {
  const [activeTab, setActiveTab] = useState('enhancement')

  const handleNormalizationChange = (setting, value) => {
    onAudioQualityChange('normalization', {
      ...audioQuality.normalization,
      [setting]: value
    })
  }

  const handleNoiseReductionChange = (setting, value) => {
    onAudioQualityChange('noise_reduction', {
      ...audioQuality.noise_reduction,
      [setting]: value
    })
  }

  const handleCompressionChange = (setting, value) => {
    onAudioQualityChange('compression', {
      ...audioQuality.compression,
      [setting]: value
    })
  }

  const handleEqChange = (setting, value) => {
    onAudioQualityChange('eq', {
      ...audioQuality.eq,
      [setting]: value
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          音質設定
          <Badge variant="secondary" className="ml-auto">
            最高品質
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* タブ切り替え */}
        <div className="flex space-x-2 border-b">
          <button
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'enhancement' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
            onClick={() => setActiveTab('enhancement')}
          >
            <Zap className="h-4 w-4 inline mr-1" />
            エンハンスメント
          </button>
          <button
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'cache' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
            onClick={() => setActiveTab('cache')}
          >
            <Music className="h-4 w-4 inline mr-1" />
            キャッシュ
          </button>
        </div>

        {/* エンハンスメント設定 */}
        {activeTab === 'enhancement' && (
          <div className="space-y-4">
            {/* 全体設定 */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                音声エンハンスメント
              </Label>
              <Switch
                checked={audioQuality.enable_enhancement}
                onCheckedChange={(checked) => onAudioQualityChange('enable_enhancement', checked)}
              />
            </div>

            {audioQuality.enable_enhancement && (
              <>
                <Separator />
                
                {/* 正規化設定 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Waves className="h-4 w-4" />
                      正規化
                    </Label>
                    <Switch
                      checked={audioQuality.normalization.enabled}
                      onCheckedChange={(checked) => handleNormalizationChange('enabled', checked)}
                    />
                  </div>
                  
                  {audioQuality.normalization.enabled && (
                    <div className="space-y-3 pl-4">
                      <div>
                        <Label className="text-sm">目標RMS (-22dB)</Label>
                        <Slider
                          value={[audioQuality.normalization.target_rms * 100]}
                          onValueChange={([value]) => handleNormalizationChange('target_rms', value / 100)}
                          max={20}
                          min={1}
                          step={1}
                          className="mt-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {audioQuality.normalization.target_rms.toFixed(2)}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm">最大ゲイン</Label>
                        <Slider
                          value={[audioQuality.normalization.max_gain]}
                          onValueChange={([value]) => handleNormalizationChange('max_gain', value)}
                          max={3}
                          min={1}
                          step={0.1}
                          className="mt-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {audioQuality.normalization.max_gain.toFixed(1)}x
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* ノイズ除去設定 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      ノイズ除去
                    </Label>
                    <Switch
                      checked={audioQuality.noise_reduction.enabled}
                      onCheckedChange={(checked) => handleNoiseReductionChange('enabled', checked)}
                    />
                  </div>
                  
                  {audioQuality.noise_reduction.enabled && (
                    <div className="space-y-3 pl-4">
                      <div>
                        <Label className="text-sm">高周波カットオフ</Label>
                        <Slider
                          value={[audioQuality.noise_reduction.high_freq_cutoff / 1000]}
                          onValueChange={([value]) => handleNoiseReductionChange('high_freq_cutoff', value * 1000)}
                          max={12}
                          min={4}
                          step={0.5}
                          className="mt-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {audioQuality.noise_reduction.high_freq_cutoff}Hz
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* コンプレッション設定 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      コンプレッション
                    </Label>
                    <Switch
                      checked={audioQuality.compression.enabled}
                      onCheckedChange={(checked) => handleCompressionChange('enabled', checked)}
                    />
                  </div>
                  
                  {audioQuality.compression.enabled && (
                    <div className="space-y-3 pl-4">
                      <div>
                        <Label className="text-sm">しきい値</Label>
                        <Slider
                          value={[audioQuality.compression.threshold * 100]}
                          onValueChange={([value]) => handleCompressionChange('threshold', value / 100)}
                          max={50}
                          min={10}
                          step={1}
                          className="mt-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {audioQuality.compression.threshold.toFixed(2)}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm">比率</Label>
                        <Slider
                          value={[audioQuality.compression.ratio]}
                          onValueChange={([value]) => handleCompressionChange('ratio', value)}
                          max={10}
                          min={1}
                          step={0.5}
                          className="mt-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {audioQuality.compression.ratio.toFixed(1)}:1
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* イコライザー設定 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      イコライザー
                    </Label>
                    <Switch
                      checked={audioQuality.eq.enabled}
                      onCheckedChange={(checked) => handleEqChange('enabled', checked)}
                    />
                  </div>
                  
                  {audioQuality.eq.enabled && (
                    <div className="space-y-3 pl-4">
                      <div>
                        <Label className="text-sm">明瞭度ブースト</Label>
                        <Slider
                          value={[audioQuality.eq.clarity_boost * 100]}
                          onValueChange={([value]) => handleEqChange('clarity_boost', value / 100)}
                          max={150}
                          min={100}
                          step={5}
                          className="mt-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {(audioQuality.eq.clarity_boost * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* キャッシュ設定 */}
        {activeTab === 'cache' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                キャッシュ有効
              </Label>
              <Switch
                checked={cacheSettings.enabled}
                onCheckedChange={(checked) => onCacheSettingChange('enabled', checked)}
              />
            </div>

            {cacheSettings.enabled && (
              <>
                <Separator />
                
                <div>
                  <Label className="text-sm">最大キャッシュサイズ</Label>
                  <Slider
                    value={[cacheSettings.max_size_mb]}
                    onValueChange={([value]) => onCacheSettingChange('max_size_mb', value)}
                    max={4096}
                    min={512}
                    step={256}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {cacheSettings.max_size_mb}MB
                  </div>
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <div className="text-sm font-medium mb-2">キャッシュの利点</div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• 同じ設定での合成を高速化</li>
                    <li>• サーバー負荷の軽減</li>
                    <li>• リアルタイムプレビュー対応</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AudioQualityPanel 