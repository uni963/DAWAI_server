// MIDI出力エンジンクラス
class MidiEngine {
  constructor() {
    this.midiAccess = null
    this.outputDevices = new Map()
    this.inputDevices = new Map()
    this.isInitialized = false
    this.listeners = new Set()
    
    // MIDI録音機能
    this.isRecording = false
    this.recordingStartTime = 0
    this.recordedEvents = []
    this.recordingTracks = new Map() // トラックごとの録音データ
  }

  // MIDI APIの初期化
  async initialize() {
    if (this.isInitialized) return true

    try {
      if (!navigator.requestMIDIAccess) {
        throw new Error('Web MIDI API is not supported in this browser')
      }

      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false })
      this.setupDevices()
      this.setupEventListeners()
      this.isInitialized = true
      
      console.log('MIDI Engine initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize MIDI Engine:', error)
      throw error
    }
  }

  // MIDIデバイスのセットアップ
  setupDevices() {
    // 出力デバイス
    for (const output of this.midiAccess.outputs.values()) {
      this.outputDevices.set(output.id, {
        id: output.id,
        name: output.name,
        manufacturer: output.manufacturer,
        state: output.state,
        connection: output.connection,
        device: output
      })
    }

    // 入力デバイス
    for (const input of this.midiAccess.inputs.values()) {
      this.inputDevices.set(input.id, {
        id: input.id,
        name: input.name,
        manufacturer: input.manufacturer,
        state: input.state,
        connection: input.connection,
        device: input
      })
      
      // 入力デバイスからのメッセージを監視
      input.onmidimessage = (event) => {
        this.handleMidiMessage(event)
      }
    }

    console.log(`Found ${this.outputDevices.size} MIDI output devices`)
    console.log(`Found ${this.inputDevices.size} MIDI input devices`)
  }

  // イベントリスナーのセットアップ
  setupEventListeners() {
    this.midiAccess.onstatechange = (event) => {
      console.log('MIDI device state changed:', event.port.name, event.port.state)
      this.setupDevices() // デバイスリストを更新
      this.notifyListeners('deviceStateChanged', {
        device: event.port,
        state: event.port.state
      })
    }
  }

  // MIDIメッセージの処理
  handleMidiMessage(event) {
    const [status, data1, data2] = event.data
    const messageType = status & 0xF0
    const channel = status & 0x0F

    let message = {
      timestamp: event.timeStamp,
      channel: channel,
      rawData: Array.from(event.data)
    }

    switch (messageType) {
      case 0x80: // Note Off
        message.type = 'noteOff'
        message.note = data1
        message.velocity = data2
        break
      case 0x90: // Note On
        message.type = data2 > 0 ? 'noteOn' : 'noteOff'
        message.note = data1
        message.velocity = data2
        break
      case 0xA0: // Polyphonic Key Pressure
        message.type = 'polyPressure'
        message.note = data1
        message.pressure = data2
        break
      case 0xB0: // Control Change
        message.type = 'controlChange'
        message.controller = data1
        message.value = data2
        break
      case 0xC0: // Program Change
        message.type = 'programChange'
        message.program = data1
        break
      case 0xD0: // Channel Pressure
        message.type = 'channelPressure'
        message.pressure = data1
        break
      case 0xE0: // Pitch Bend
        message.type = 'pitchBend'
        message.value = (data2 << 7) | data1
        break
      default:
        message.type = 'unknown'
        break
    }

    // 録音中の場合はイベントを記録
    if (this.isRecording) {
      this.recordMidiEvent(message)
    }

    this.notifyListeners('midiMessage', message)
  }

  // ノートオンメッセージを送信
  sendNoteOn(deviceId, channel, note, velocity) {
    const device = this.outputDevices.get(deviceId)
    if (!device || device.state !== 'connected') {
      console.warn(`MIDI device ${deviceId} not available`)
      return false
    }

    const message = [0x90 | (channel & 0x0F), note & 0x7F, velocity & 0x7F]
    device.device.send(message)
    return true
  }

  // ノートオフメッセージを送信
  sendNoteOff(deviceId, channel, note, velocity = 64) {
    const device = this.outputDevices.get(deviceId)
    if (!device || device.state !== 'connected') {
      console.warn(`MIDI device ${deviceId} not available`)
      return false
    }

    const message = [0x80 | (channel & 0x0F), note & 0x7F, velocity & 0x7F]
    device.device.send(message)
    return true
  }

  // コントロールチェンジメッセージを送信
  sendControlChange(deviceId, channel, controller, value) {
    const device = this.outputDevices.get(deviceId)
    if (!device || device.state !== 'connected') {
      console.warn(`MIDI device ${deviceId} not available`)
      return false
    }

    const message = [0xB0 | (channel & 0x0F), controller & 0x7F, value & 0x7F]
    device.device.send(message)
    return true
  }

  // プログラムチェンジメッセージを送信
  sendProgramChange(deviceId, channel, program) {
    const device = this.outputDevices.get(deviceId)
    if (!device || device.state !== 'connected') {
      console.warn(`MIDI device ${deviceId} not available`)
      return false
    }

    const message = [0xC0 | (channel & 0x0F), program & 0x7F]
    device.device.send(message)
    return true
  }

  // ピッチベンドメッセージを送信
  sendPitchBend(deviceId, channel, value) {
    const device = this.outputDevices.get(deviceId)
    if (!device || device.state !== 'connected') {
      console.warn(`MIDI device ${deviceId} not available`)
      return false
    }

    const lsb = value & 0x7F
    const msb = (value >> 7) & 0x7F
    const message = [0xE0 | (channel & 0x0F), lsb, msb]
    device.device.send(message)
    return true
  }

  // オールノートオフメッセージを送信
  sendAllNotesOff(deviceId, channel) {
    return this.sendControlChange(deviceId, channel, 123, 0)
  }

  // MIDI録音を開始
  startRecording(trackId = 'default') {
    if (this.isRecording) {
      console.warn('MIDI recording is already in progress')
      return false
    }

    this.isRecording = true
    this.recordingStartTime = performance.now()
    this.recordedEvents = []
    
    if (!this.recordingTracks.has(trackId)) {
      this.recordingTracks.set(trackId, [])
    }

    console.log(`MIDI recording started for track: ${trackId}`)
    this.notifyListeners('midiRecordingStarted', { trackId, startTime: this.recordingStartTime })
    return true
  }

  // MIDI録音を停止
  stopRecording(trackId = 'default') {
    if (!this.isRecording) {
      console.warn('No MIDI recording in progress')
      return null
    }

    this.isRecording = false
    const recordingDuration = performance.now() - this.recordingStartTime

    const recordedData = {
      trackId: trackId,
      events: this.recordedEvents,
      duration: recordingDuration,
      startTime: this.recordingStartTime,
      timestamp: new Date().toISOString()
    }

    // 録音データをトラックに保存
    if (this.recordingTracks.has(trackId)) {
      this.recordingTracks.get(trackId).push(recordedData)
    }

    console.log(`MIDI recording stopped for track: ${trackId}`, recordedData)
    this.notifyListeners('midiRecordingStopped', recordedData)

    // 録音データをクリア
    this.recordedEvents = []
    this.recordingStartTime = 0

    return recordedData
  }

  // MIDIイベントを記録
  recordMidiEvent(message) {
    const event = {
      ...message,
      relativeTime: performance.now() - this.recordingStartTime
    }
    this.recordedEvents.push(event)
  }

  // 録音されたMIDIデータを取得
  getRecordedData(trackId = 'default') {
    return this.recordingTracks.get(trackId) || []
  }

  // 録音されたMIDIデータをクリア
  clearRecordedData(trackId = 'default') {
    if (trackId) {
      this.recordingTracks.delete(trackId)
    } else {
      this.recordingTracks.clear()
    }
  }

  // 録音状態を取得
  getRecordingState() {
    return {
      isRecording: this.isRecording,
      startTime: this.recordingStartTime,
      duration: this.isRecording ? performance.now() - this.recordingStartTime : 0,
      eventCount: this.recordedEvents.length
    }
  }

  // オールサウンドオフメッセージを送信
  sendAllSoundOff(deviceId, channel) {
    return this.sendControlChange(deviceId, channel, 120, 0)
  }

  // MIDIクロックを送信
  sendClock(deviceId) {
    const device = this.outputDevices.get(deviceId)
    if (!device || device.state !== 'connected') {
      return false
    }

    const message = [0xF8] // MIDI Clock
    device.device.send(message)
    return true
  }

  // MIDIスタートメッセージを送信
  sendStart(deviceId) {
    const device = this.outputDevices.get(deviceId)
    if (!device || device.state !== 'connected') {
      return false
    }

    const message = [0xFA] // MIDI Start
    device.device.send(message)
    return true
  }

  // MIDIストップメッセージを送信
  sendStop(deviceId) {
    const device = this.outputDevices.get(deviceId)
    if (!device || device.state !== 'connected') {
      return false
    }

    const message = [0xFC] // MIDI Stop
    device.device.send(message)
    return true
  }

  // MIDIコンティニューメッセージを送信
  sendContinue(deviceId) {
    const device = this.outputDevices.get(deviceId)
    if (!device || device.state !== 'connected') {
      return false
    }

    const message = [0xFB] // MIDI Continue
    device.device.send(message)
    return true
  }

  // MIDIファイルをエクスポート
  exportMidiFile(tracks, tempo = 120, timeSignature = [4, 4]) {
    const midiData = this.createMidiFile(tracks, tempo, timeSignature)
    const blob = new Blob([midiData], { type: 'audio/midi' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'exported_song.mid'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
    console.log('MIDI file exported successfully')
  }

  // MIDIファイルデータを作成
  createMidiFile(tracks, tempo, timeSignature) {
    // 簡易MIDI形式（Type 1）
    const header = this.createMidiHeader(tracks.length, 480) // 480 ticks per quarter note
    const tempoTrack = this.createTempoTrack(tempo, timeSignature)
    const trackData = tracks.map(track => this.createMidiTrack(track))

    // すべてのデータを結合
    const allData = [header, tempoTrack, ...trackData]
    const totalLength = allData.reduce((sum, data) => sum + data.length, 0)
    
    const result = new Uint8Array(totalLength)
    let offset = 0
    
    for (const data of allData) {
      result.set(data, offset)
      offset += data.length
    }

    return result
  }

  // MIDIヘッダーを作成
  createMidiHeader(trackCount, division) {
    const header = new Uint8Array(14)
    const view = new DataView(header.buffer)

    // "MThd"
    header[0] = 0x4D
    header[1] = 0x54
    header[2] = 0x68
    header[3] = 0x64

    view.setUint32(4, 6) // ヘッダー長
    view.setUint16(8, 1) // フォーマット（Type 1）
    view.setUint16(10, trackCount + 1) // トラック数（テンポトラック含む）
    view.setUint16(12, division) // 分解能

    return header
  }

  // テンポトラックを作成
  createTempoTrack(tempo, timeSignature) {
    const events = []

    // タイムシグネチャー
    events.push({
      deltaTime: 0,
      type: 'meta',
      metaType: 0x58,
      data: new Uint8Array([timeSignature[0], Math.log2(timeSignature[1]), 24, 8])
    })

    // テンポ
    const microsecondsPerQuarter = Math.round(60000000 / tempo)
    const tempoData = new Uint8Array(3)
    tempoData[0] = (microsecondsPerQuarter >> 16) & 0xFF
    tempoData[1] = (microsecondsPerQuarter >> 8) & 0xFF
    tempoData[2] = microsecondsPerQuarter & 0xFF

    events.push({
      deltaTime: 0,
      type: 'meta',
      metaType: 0x51,
      data: tempoData
    })

    // エンドオブトラック
    events.push({
      deltaTime: 0,
      type: 'meta',
      metaType: 0x2F,
      data: new Uint8Array(0)
    })

    return this.encodeTrack(events)
  }

  // MIDIトラックを作成
  createMidiTrack(track) {
    const events = []
    let currentTime = 0

    // トラック名
    if (track.name) {
      const nameData = new TextEncoder().encode(track.name)
      events.push({
        deltaTime: 0,
        type: 'meta',
        metaType: 0x03,
        data: nameData
      })
    }

    // MIDIイベント
    if (track.clips) {
      track.clips.forEach(clip => {
        if (clip.notes) {
          clip.notes.forEach(note => {
            const startTime = Math.round((clip.startTime + note.start) * 480)
            const endTime = Math.round((clip.startTime + note.start + note.duration) * 480)

            // ノートオン
            events.push({
              deltaTime: startTime - currentTime,
              type: 'noteOn',
              channel: track.channel || 0,
              note: note.pitch,
              velocity: note.velocity || 100
            })
            currentTime = startTime

            // ノートオフ
            events.push({
              deltaTime: endTime - currentTime,
              type: 'noteOff',
              channel: track.channel || 0,
              note: note.pitch,
              velocity: 0
            })
            currentTime = endTime
          })
        }
      })
    }

    // イベントを時間順にソート
    events.sort((a, b) => a.deltaTime - b.deltaTime)

    // デルタタイムを再計算
    let lastTime = 0
    events.forEach(event => {
      const absoluteTime = event.deltaTime
      event.deltaTime = absoluteTime - lastTime
      lastTime = absoluteTime
    })

    // エンドオブトラック
    events.push({
      deltaTime: 0,
      type: 'meta',
      metaType: 0x2F,
      data: new Uint8Array(0)
    })

    return this.encodeTrack(events)
  }

  // トラックデータをエンコード
  encodeTrack(events) {
    const eventData = []

    events.forEach(event => {
      // デルタタイム
      eventData.push(...this.encodeVariableLength(event.deltaTime))

      if (event.type === 'noteOn') {
        eventData.push(0x90 | event.channel, event.note, event.velocity)
      } else if (event.type === 'noteOff') {
        eventData.push(0x80 | event.channel, event.note, event.velocity)
      } else if (event.type === 'meta') {
        eventData.push(0xFF, event.metaType)
        eventData.push(...this.encodeVariableLength(event.data.length))
        eventData.push(...event.data)
      }
    })

    // トラックヘッダー
    const header = new Uint8Array(8)
    const view = new DataView(header.buffer)

    // "MTrk"
    header[0] = 0x4D
    header[1] = 0x54
    header[2] = 0x72
    header[3] = 0x6B

    view.setUint32(4, eventData.length) // トラック長

    const result = new Uint8Array(header.length + eventData.length)
    result.set(header, 0)
    result.set(eventData, header.length)

    return result
  }

  // 可変長数値をエンコード
  encodeVariableLength(value) {
    const result = []
    
    if (value === 0) {
      return [0]
    }

    while (value > 0) {
      result.unshift(value & 0x7F)
      value >>= 7
    }

    // 最後以外のバイトに継続ビットを設定
    for (let i = 0; i < result.length - 1; i++) {
      result[i] |= 0x80
    }

    return result
  }

  // 利用可能な出力デバイスを取得
  getOutputDevices() {
    return Array.from(this.outputDevices.values())
  }

  // 利用可能な入力デバイスを取得
  getInputDevices() {
    return Array.from(this.inputDevices.values())
  }

  // イベントリスナーを追加
  addListener(listener) {
    this.listeners.add(listener)
  }

  // イベントリスナーを削除
  removeListener(listener) {
    this.listeners.delete(listener)
  }

  // リスナーに通知
  notifyListeners(eventType, data) {
    this.listeners.forEach(listener => {
      if (typeof listener[eventType] === 'function') {
        listener[eventType](data)
      }
    })
  }

  // 初期化状態を確認
  isReady() {
    return this.isInitialized
  }

  // MIDIエンジンを破棄
  destroy() {
    if (this.midiAccess) {
      // 入力デバイスのイベントリスナーを削除
      for (const input of this.midiAccess.inputs.values()) {
        input.onmidimessage = null
      }
      this.midiAccess.onstatechange = null
    }

    this.outputDevices.clear()
    this.inputDevices.clear()
    this.listeners.clear()
    this.isInitialized = false
  }
}

/**
 * スクロール位置の永続化機能
 */
export const scrollPositionManager = {
  // スクロール位置を保存
  saveScrollPosition: (trackId, scrollX, scrollY) => {
    try {
      const key = `midi_scroll_${trackId}`
      const scrollData = { scrollX, scrollY, timestamp: Date.now() }
      localStorage.setItem(key, JSON.stringify(scrollData))
    } catch (error) {
      console.warn('Failed to save scroll position:', error)
    }
  },

  // スクロール位置を復元
  loadScrollPosition: (trackId) => {
    try {
      const key = `midi_scroll_${trackId}`
      const saved = localStorage.getItem(key)
      if (saved) {
        const scrollData = JSON.parse(saved)
        // 24時間以内のデータのみ有効とする
        const isRecent = Date.now() - scrollData.timestamp < 24 * 60 * 60 * 1000
        if (isRecent) {
          return { scrollX: scrollData.scrollX, scrollY: scrollData.scrollY }
        }
      }
    } catch (error) {
      console.warn('Failed to load scroll position:', error)
    }
    return { scrollX: 0, scrollY: 0 }
  },

  // スクロール位置をクリア
  clearScrollPosition: (trackId) => {
    try {
      const key = `midi_scroll_${trackId}`
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to clear scroll position:', error)
    }
  }
}

// シングルトンインスタンス
const midiEngine = new MidiEngine()

export default midiEngine

