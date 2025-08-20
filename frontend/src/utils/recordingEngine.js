// 録音エンジン - オーディオ録音機能
class RecordingEngine {
  constructor() {
    this.audioContext = null
    this.mediaRecorder = null
    this.recordingStream = null
    this.isRecording = false
    this.recordingStartTime = 0
    this.recordingDuration = 0
    this.recordedChunks = []
    this.recordingTimer = null
    
    // 録音設定
    this.settings = {
      sampleRate: 44100,
      channels: 2,
      bitDepth: 24,
      format: 'wav',
      quality: 'high'
    }
    
    // 録音レベルメーター
    this.levelMeter = {
      left: 0,
      right: 0,
      peak: 0
    }
    
    // イベントリスナー
    this.listeners = new Set()
  }

  // 録音エンジンを初期化
  async initialize() {
    try {
      // AudioContextの初期化を遅延させる（ユーザーインタラクション後に実行）
      this.initialized = false
      console.log('Recording Engine initialization deferred until user interaction')
      this.notifyListeners('initializationDeferred', {})
      return true
    } catch (error) {
      console.error('Failed to initialize Recording Engine:', error)
      throw error
    }
  }

  // ユーザーインタラクション後にAudioContextを実際に初期化
  async initializeAudioContext() {
    if (this.initialized) return true
    
    try {
      // AudioContextを作成
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.settings.sampleRate,
        latencyHint: 'interactive'
      })

      // AudioContextを開始
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      this.initialized = true
      console.log('Recording Engine AudioContext initialized successfully')
      this.notifyListeners('initialized', { audioContext: this.audioContext })
      return true
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error)
      throw error
    }
  }

  // 録音デバイスを取得
  async getRecordingDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.filter(device => device.kind === 'audioinput')
    } catch (error) {
      console.error('Failed to get recording devices:', error)
      return []
    }
  }

  // 録音ストリームを開始
  async startRecordingStream(deviceId = null) {
    try {
      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          sampleRate: this.settings.sampleRate,
          channelCount: this.settings.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      }

      this.recordingStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // 録音レベルメーターを設定
      this.setupLevelMeter()
      
      console.log('Recording stream started')
      this.notifyListeners('streamStarted', { stream: this.recordingStream })
      return this.recordingStream
    } catch (error) {
      console.error('Failed to start recording stream:', error)
      throw error
    }
  }

  // 録音レベルメーターを設定
  setupLevelMeter() {
    if (!this.recordingStream || !this.audioContext) return

    const source = this.audioContext.createMediaStreamSource(this.recordingStream)
    const analyser = this.audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8

    source.connect(analyser)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const updateLevelMeter = () => {
      if (!this.isRecording) return

      analyser.getByteFrequencyData(dataArray)
      
      // 左右チャンネルのレベルを計算
      let leftSum = 0
      let rightSum = 0
      
      for (let i = 0; i < bufferLength; i++) {
        if (i < bufferLength / 2) {
          leftSum += dataArray[i]
        } else {
          rightSum += dataArray[i]
        }
      }

      this.levelMeter.left = leftSum / (bufferLength / 2) / 255
      this.levelMeter.right = rightSum / (bufferLength / 2) / 255
      this.levelMeter.peak = Math.max(this.levelMeter.left, this.levelMeter.right)

      this.notifyListeners('levelMeterUpdate', { levelMeter: this.levelMeter })
      requestAnimationFrame(updateLevelMeter)
    }

    updateLevelMeter()
  }

  // 録音を開始
  async startRecording(deviceId = null) {
    if (this.isRecording) {
      console.warn('Recording is already in progress')
      return false
    }

    try {
      // AudioContextが初期化されていない場合は初期化
      if (!this.initialized) {
        await this.initializeAudioContext()
      }

      // 録音ストリームを開始
      await this.startRecordingStream(deviceId)

      // MediaRecorderを設定
      const options = {
        mimeType: this.getMimeType(),
        audioBitsPerSecond: this.getBitRate()
      }

      this.mediaRecorder = new MediaRecorder(this.recordingStream, options)
      this.recordedChunks = []

      // MediaRecorderイベントリスナーを設定
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop()
      }

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error)
        this.notifyListeners('recordingError', { error: event.error })
      }

      // 録音を開始
      this.mediaRecorder.start(1000) // 1秒ごとにデータを取得
      this.isRecording = true
      this.recordingStartTime = Date.now()
      this.recordingDuration = 0

      // 録音タイマーを開始
      this.startRecordingTimer()

      console.log('Recording started')
      this.notifyListeners('recordingStarted', { startTime: this.recordingStartTime })
      return true
    } catch (error) {
      console.error('Failed to start recording:', error)
      this.notifyListeners('recordingError', { error })
      throw error
    }
  }

  // 録音を停止
  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      // 初期化時やクリーンアップ時は警告を出さない
      if (this.initialized) {
        console.warn('No recording in progress')
      }
      return null
    }

    try {
      this.mediaRecorder.stop()
      this.isRecording = false
      this.stopRecordingTimer()

      console.log('Recording stopped')
      this.notifyListeners('recordingStopped', { duration: this.recordingDuration })
      
      return this.recordedChunks
    } catch (error) {
      console.error('Failed to stop recording:', error)
      this.notifyListeners('recordingError', { error })
      throw error
    }
  }

  // 録音停止時の処理
  handleRecordingStop() {
    if (this.recordedChunks.length === 0) {
      console.warn('No recorded data available')
      return
    }

    // 録音データをBlobに変換
    const mimeType = this.getMimeType()
    const recordedBlob = new Blob(this.recordedChunks, { type: mimeType })

    // 録音ストリームを停止
    if (this.recordingStream) {
      this.recordingStream.getTracks().forEach(track => track.stop())
      this.recordingStream = null
    }

    // 録音データを処理
    this.processRecordingData(recordedBlob)
  }

  // 録音データを処理
  async processRecordingData(blob) {
    try {
      // オーディオバッファに変換
      const arrayBuffer = await blob.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)

      const recordingData = {
        blob: blob,
        audioBuffer: audioBuffer,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        timestamp: new Date().toISOString()
      }

      console.log('Recording data processed:', recordingData)
      this.notifyListeners('recordingDataReady', recordingData)
      
      return recordingData
    } catch (error) {
      console.error('Failed to process recording data:', error)
      this.notifyListeners('recordingError', { error })
      throw error
    }
  }

  // 録音タイマーを開始
  startRecordingTimer() {
    this.recordingTimer = setInterval(() => {
      this.recordingDuration = (Date.now() - this.recordingStartTime) / 1000
      this.notifyListeners('recordingTimeUpdate', { duration: this.recordingDuration })
    }, 100)
  }

  // 録音タイマーを停止
  stopRecordingTimer() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer)
      this.recordingTimer = null
    }
  }

  // MIMEタイプを取得
  getMimeType() {
    const mimeTypes = {
      'wav': 'audio/wav',
      'mp3': 'audio/mp3',
      'ogg': 'audio/ogg',
      'webm': 'audio/webm'
    }
    return mimeTypes[this.settings.format] || 'audio/wav'
  }

  // ビットレートを取得
  getBitRate() {
    const bitRates = {
      'low': 64000,
      'medium': 128000,
      'high': 320000
    }
    return bitRates[this.settings.quality] || 128000
  }

  // 録音設定を更新
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings }
    this.notifyListeners('settingsUpdated', { settings: this.settings })
  }

  // 録音状態を取得
  getRecordingState() {
    return {
      isRecording: this.isRecording,
      duration: this.recordingDuration,
      levelMeter: this.levelMeter,
      settings: this.settings
    }
  }

  // 録音レベルを取得
  getLevelMeter() {
    return this.levelMeter
  }

  // イベントリスナーを追加
  addListener(listener) {
    this.listeners.add(listener)
  }

  // イベントリスナーを削除
  removeListener(listener) {
    this.listeners.delete(listener)
  }

  // イベントリスナーに通知
  notifyListeners(eventType, data) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data)
      } catch (error) {
        console.error('Error in recording engine listener:', error)
      }
    })
  }

  // 録音エンジンを破棄
  destroy() {
    this.stopRecording()
    this.stopRecordingTimer()
    
    if (this.recordingStream) {
      this.recordingStream.getTracks().forEach(track => track.stop())
      this.recordingStream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.listeners.clear()
    console.log('Recording Engine destroyed')
  }
}

// シングルトンインスタンス
const recordingEngine = new RecordingEngine()

export default recordingEngine 