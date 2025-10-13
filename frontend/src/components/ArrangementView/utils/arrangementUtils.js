// 定数
export const DEFAULT_TRACK_HEIGHT = 80
export const MIN_TRACK_HEIGHT = 60
export const MAX_TRACK_HEIGHT = 400 // C0-C10の範囲に対応する高さ
export const HEADER_HEIGHT = 120
export const NOTE_MIN_HEIGHT = 2
export const NOTE_MAX_HEIGHT = 60

// C1-C7の範囲の定数
export const NOTE_MIN = 12   // C1
export const NOTE_MAX = 96   // C7
export const NOTE_RANGE = NOTE_MAX - NOTE_MIN + 1

// レイアウト関連の定数
export const TRACK_INFO_PANEL_WIDTH = 192
export const MIN_TRACK_AREA_WIDTH = 800
export const CONTENT_PADDING = 32
export const SCROLL_THROTTLE_DELAY = 16

// プリロード関連の定数
export const PRELOAD_WAIT_TIME = 500
export const CACHE_CLEANUP_INTERVAL = 2 * 60 * 1000 // 2分
export const CACHE_MAX_AGE = 5 * 60 * 1000 // 5分

// 再生関連の定数
export const PLAYBACK_UPDATE_INTERVAL = 16 // ms (60fps)
export const SHORT_NOTE_DURATION = 0.3
export const DEFAULT_VELOCITY = 0.8

// 時間表示の間隔設定
export const TIME_MARKER_INTERVALS = {
  LONG: 20,    // 120秒以上
  MEDIUM: 10,  // 60-120秒
  SHORT: 5,    // 30-60秒
  VERY_SHORT: 2 // 30秒以下
}

// ノート名を取得する関数
export const getNoteName = (noteNumber) => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(noteNumber / 12) - 1
  const noteName = noteNames[noteNumber % 12]
  return `${noteName}${octave}`
}

// 時間表示のフォーマット
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

// 時間マーカーの間隔を計算する関数
export const calculateTimeMarkerInterval = (totalSeconds) => {
  if (totalSeconds > 120) return TIME_MARKER_INTERVALS.LONG
  if (totalSeconds > 60) return TIME_MARKER_INTERVALS.MEDIUM
  if (totalSeconds > 30) return TIME_MARKER_INTERVALS.SHORT
  return TIME_MARKER_INTERVALS.VERY_SHORT
}

// グリッド間隔を計算する関数
export const calculateGridInterval = (pixelsPerSecond, bpm, timeSignature) => {
  const secondsPerBeat = 60 / bpm
  const [beatsPerBar] = timeSignature.split('/').map(Number)
  const secondsPerBar = secondsPerBeat * beatsPerBar
  
  let gridInterval
  if (pixelsPerSecond >= 800) gridInterval = secondsPerBeat / 16  // 64分音符
  else if (pixelsPerSecond >= 400) gridInterval = secondsPerBeat / 8  // 32分音符
  else if (pixelsPerSecond >= 200) gridInterval = secondsPerBeat / 4  // 16分音符
  else if (pixelsPerSecond >= 100) gridInterval = secondsPerBeat / 2  // 8分音符
  else if (pixelsPerSecond >= 50) gridInterval = secondsPerBeat  // 4分音符
  else if (pixelsPerSecond >= 25) gridInterval = secondsPerBar  // 1小節
  else gridInterval = secondsPerBar * 2  // 2小節
  
  // 最小間隔を0.025秒に制限（より細かい操作を可能にする）
  return Math.max(gridInterval, 0.025)
}

// タイムライン目盛りの生成
export const generateTimeMarkers = (totalDuration, pixelsPerSecond, bpm, timeSignature) => {
  const secondsPerBeat = 60 / bpm
  const [beatsPerBar] = timeSignature.split('/').map(Number)
  const secondsPerBar = secondsPerBeat * beatsPerBar
  
  const getMarkerInterval = () => {
    // BPMに応じて適応的にマーカー間隔を調整
    if (pixelsPerSecond >= 400) return secondsPerBeat / 4 // 16分音符
    if (pixelsPerSecond >= 200) return secondsPerBeat / 2 // 8分音符
    if (pixelsPerSecond >= 100) return secondsPerBeat     // 4分音符
    if (pixelsPerSecond >= 50) return secondsPerBar       // 1小節
    if (pixelsPerSecond >= 25) return secondsPerBar * 2   // 2小節
    return secondsPerBar * 4                              // 4小節
  }
  
  const interval = getMarkerInterval()
  const totalSeconds = totalDuration / 1000
  const markerCount = Math.ceil(totalSeconds / interval)
  
  return Array.from({ length: markerCount + 1 }, (_, i) => {
    const time = i * interval
    const left = time * pixelsPerSecond
    const isMainMarker = time % secondsPerBar === 0 // 小節の開始は太く
    const isBeatMarker = time % secondsPerBeat === 0 // 拍の開始は中程度
    
    return {
      time,
      left,
      isMainMarker,
      isBeatMarker
    }
  })
}

// 拍グリッドラインの生成
export const generateBeatGridLines = (totalDuration, pixelsPerSecond, bpm) => {
  const secondsPerBeat = 60 / bpm
  const totalBeats = Math.ceil((totalDuration / 1000) / secondsPerBeat)
  
  return Array.from({ length: totalBeats + 1 }, (_, i) => {
    const beatTime = i * secondsPerBeat
    const left = beatTime * pixelsPerSecond
    
    return {
      beatTime,
      left
    }
  })
}

// 細かいグリッドの生成
export const generateFineGridLines = (totalDuration, pixelsPerSecond, bpm) => {
  const secondsPerBeat = 60 / bpm
  const gridDivisions = [4, 8, 16] // 4分音符、8分音符、16分音符
  const gridLines = []
  
  gridDivisions.forEach(division => {
    const gridInterval = secondsPerBeat / division
    const totalGridLines = Math.ceil((totalDuration / 1000) / gridInterval)
    
    for (let i = 0; i <= totalGridLines; i++) {
      const gridTime = i * gridInterval
      const left = gridTime * pixelsPerSecond
      
      // 拍の倍数でない場合のみ表示（重複を避ける）
      if (Math.abs(gridTime % secondsPerBeat) > 0.001) {
        gridLines.push({
          left,
          division,
          opacity: division === 4 ? 0.2 : division === 8 ? 0.15 : 0.1
        })
      }
    }
  })
  
  return gridLines
}

// 小節マーカーの生成
export const generateBarMarkers = (totalDuration, pixelsPerSecond, bpm, timeSignature) => {
  const [beatsPerBar] = timeSignature.split('/').map(Number)
  const secondsPerBeat = 60 / bpm
  const secondsPerBar = secondsPerBeat * beatsPerBar
  const totalBars = Math.ceil((totalDuration / 1000) / secondsPerBar)
  
  return Array.from({ length: totalBars + 1 }, (_, i) => {
    const barStartTime = i * secondsPerBar
    const left = barStartTime * pixelsPerSecond
    
    return {
      barNumber: i + 1,
      barStartTime,
      left
    }
  })
} 