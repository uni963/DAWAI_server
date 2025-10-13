import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx'
import { Slider } from './ui/slider.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.jsx'
import { Badge } from './ui/badge.jsx'
import { Separator } from './ui/separator.jsx'
import recordingEngine from '../utils/recordingEngine.js'

function RecordingPanel() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [levelMeter, setLevelMeter] = useState({ left: 0, right: 0, peak: 0 })
  const [recordingDevices, setRecordingDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [recordingSettings, setRecordingSettings] = useState({
    format: 'wav',
    quality: 'high',
    sampleRate: 44100
  })

  // 録音エンジンのイベントリスナー
  useEffect(() => {
    const handleRecordingEvent = (eventType, data) => {
      switch (eventType) {
        case 'recordingStarted':
          setIsRecording(true)
          break
        case 'recordingStopped':
          setIsRecording(false)
          setRecordingDuration(0)
          break
        case 'recordingTimeUpdate':
          setRecordingDuration(data.duration)
          break
        case 'levelMeterUpdate':
          setLevelMeter(data.levelMeter)
          break
        case 'recordingDataReady':
          // ここで録音データをプロジェクトに追加する処理
          break
        case 'recordingError':
          console.error('Recording error:', data.error)
          setIsRecording(false)
          break
      }
    }

    recordingEngine.addListener(handleRecordingEvent)

    // 録音デバイスを取得
    loadRecordingDevices()

    return () => {
      recordingEngine.removeListener(handleRecordingEvent)
    }
  }, [])

  // 録音デバイスを読み込み
  const loadRecordingDevices = async () => {
    try {
      const devices = await recordingEngine.getRecordingDevices()
      setRecordingDevices(devices)
      if (devices.length > 0 && !selectedDevice) {
        setSelectedDevice(devices[0].deviceId)
      }
    } catch (error) {
      console.error('Failed to load recording devices:', error)
    }
  }

  // 録音開始
  const handleStartRecording = async () => {
    try {
      // ユーザーインタラクション後にAudioContextを初期化
      await recordingEngine.initializeAudioContext()
      await recordingEngine.startRecording(selectedDevice)
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  // 録音停止
  const handleStopRecording = () => {
    try {
      recordingEngine.stopRecording()
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }

  // 録音設定を更新
  const updateRecordingSettings = useCallback((newSettings) => {
    const updatedSettings = { ...recordingSettings, ...newSettings }
    setRecordingSettings(updatedSettings)
    recordingEngine.updateSettings(updatedSettings)
  }, [recordingSettings])

  // 時間をフォーマット
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // レベルメーターの色を取得
  const getLevelColor = (level) => {
    if (level > 0.8) return 'bg-red-500'
    if (level > 0.6) return 'bg-yellow-500'
    if (level > 0.3) return 'bg-green-500'
    return 'bg-gray-300'
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          録音パネル
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 録音状態表示 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={isRecording ? "destructive" : "secondary"}>
              {isRecording ? "録音中" : "待機中"}
            </Badge>
            {isRecording && (
              <span className="text-sm font-mono">
                {formatTime(recordingDuration)}
              </span>
            )}
          </div>
          <Button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            variant={isRecording ? "destructive" : "default"}
            size="sm"
            disabled={!selectedDevice}
          >
            {isRecording ? "停止" : "録音開始"}
          </Button>
        </div>

        <Separator />

        {/* 録音レベルメーター */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">録音レベル</h4>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="h-20 bg-gray-100 rounded relative overflow-hidden">
                <div
                  className={`absolute bottom-0 left-0 w-full transition-all duration-100 ${getLevelColor(levelMeter.left)}`}
                  style={{ height: `${levelMeter.left * 100}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600">
                  L
                </div>
              </div>
              <div className="text-xs text-center mt-1">
                {Math.round(levelMeter.left * 100)}%
              </div>
            </div>
            <div className="flex-1">
              <div className="h-20 bg-gray-100 rounded relative overflow-hidden">
                <div
                  className={`absolute bottom-0 left-0 w-full transition-all duration-100 ${getLevelColor(levelMeter.right)}`}
                  style={{ height: `${levelMeter.right * 100}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600">
                  R
                </div>
              </div>
              <div className="text-xs text-center mt-1">
                {Math.round(levelMeter.right * 100)}%
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* 録音デバイス選択 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">入力デバイス</h4>
          {recordingDevices.length > 0 ? (
            <Select value={selectedDevice || undefined} onValueChange={setSelectedDevice}>
              <SelectTrigger>
                <SelectValue placeholder="デバイスを選択" />
              </SelectTrigger>
              <SelectContent>
                {recordingDevices
                  .filter(device => {
                    // より厳密なデバイスIDの検証
                    return device && 
                           device.deviceId && 
                           typeof device.deviceId === 'string' && 
                           device.deviceId.trim() !== '' && 
                           device.deviceId !== 'default' &&
                           device.deviceId !== 'null' &&
                           device.deviceId !== 'undefined'
                  })
                  .map((device) => {
                    // デバイスIDの安全性を確保
                    const safeDeviceId = device.deviceId || `device-${Math.random().toString(36).substr(2, 9)}`
                    const deviceLabel = device.label || `デバイス ${safeDeviceId.slice(0, 8)}`
                    
                    return (
                      <SelectItem key={safeDeviceId} value={safeDeviceId}>
                        {deviceLabel}
                      </SelectItem>
                    )
                  })}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-gray-500 p-2 border rounded">
              録音デバイスが見つかりません。マイクの接続を確認してください。
            </div>
          )}
        </div>

        <Separator />

        {/* 録音設定 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">録音設定</h4>
          
          {/* フォーマット選択 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-600">フォーマット</label>
            <Select 
              value={recordingSettings.format} 
              onValueChange={(value) => updateRecordingSettings({ format: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wav">WAV</SelectItem>
                <SelectItem value="mp3">MP3</SelectItem>
                <SelectItem value="ogg">OGG</SelectItem>
                <SelectItem value="webm">WebM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 品質選択 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-600">品質</label>
            <Select 
              value={recordingSettings.quality} 
              onValueChange={(value) => updateRecordingSettings({ quality: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">低品質 (64kbps)</SelectItem>
                <SelectItem value="medium">中品質 (128kbps)</SelectItem>
                <SelectItem value="high">高品質 (320kbps)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* サンプリングレート */}
          <div className="space-y-2">
            <label className="text-xs text-gray-600">サンプリングレート</label>
            <Select 
              value={recordingSettings.sampleRate.toString()} 
              onValueChange={(value) => updateRecordingSettings({ sampleRate: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="22050">22.05 kHz</SelectItem>
                <SelectItem value="44100">44.1 kHz</SelectItem>
                <SelectItem value="48000">48 kHz</SelectItem>
                <SelectItem value="96000">96 kHz</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* 録音情報 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">録音情報</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>フォーマット: {recordingSettings.format.toUpperCase()}</div>
            <div>品質: {recordingSettings.quality}</div>
            <div>サンプリングレート: {recordingSettings.sampleRate} Hz</div>
            <div>チャンネル: ステレオ</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RecordingPanel 