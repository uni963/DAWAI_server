import { useState, useEffect, useCallback } from 'react'

const useInstrumentSettings = (trackId) => {
  const [instrument, setInstrument] = useState('piano')
  const [settings, setSettings] = useState(() => {
    // 初期状態でもデフォルト設定を設定
    const defaults = {
      volume: 75,
      pan: 0,
      attack: 10,
      decay: 100,
      sustain: 70,
      release: 200,
      waveform: 'sine',
      filterFreq: 1000,
      filterQ: 1,
      reverb: 0,
      delay: 0,
      chorus: 0,
      drumKit: 'standard',
      stringType: 'violin',
      vibrato: 0
    }
    return defaults
  })
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)

  // デフォルト設定を取得
  const getDefaultSettings = useCallback((instrumentType) => {
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
  }, [])

  // 設定を保存
  const saveSettings = useCallback((trackId, instrumentType, instrumentSettings) => {
    const key = `instrument-settings-${trackId}`
    const data = {
      instrument: instrumentType,
      settings: instrumentSettings,
      timestamp: Date.now()
    }
    localStorage.setItem(key, JSON.stringify(data))
  }, [])

  // 設定を読み込み
  const loadSettings = useCallback((trackId) => {
    const key = `instrument-settings-${trackId}`
    const saved = localStorage.getItem(key)
    
    if (saved) {
      try {
        const data = JSON.parse(saved)
        return {
          instrument: data.instrument || 'piano',
          settings: data.settings || {}
        }
      } catch (error) {
        console.error('Failed to parse instrument settings:', error)
      }
    }
    
    // デフォルト設定を返す
    return {
      instrument: 'piano',
      settings: getDefaultSettings('piano')
    }
  }, [getDefaultSettings])

  // 初期化
  useEffect(() => {
    if (trackId) {
      const loaded = loadSettings(trackId)
      setInstrument(loaded.instrument)
      
      // 設定値を安全に検証
      const safeSettings = {}
      const defaults = getDefaultSettings(loaded.instrument)
      
      // デフォルト設定のすべてのキーを確実に設定
      Object.entries(defaults).forEach(([key, defaultValue]) => {
        const loadedValue = loaded.settings[key]
        if (typeof loadedValue === 'number' && isFinite(loadedValue)) {
          safeSettings[key] = loadedValue
        } else {
          safeSettings[key] = defaultValue
        }
      })
      
      setSettings(safeSettings)
    }
  }, [trackId, loadSettings, getDefaultSettings])

  // 楽器変更時の処理
  const handleInstrumentChange = useCallback((newInstrument) => {
    setInstrument(newInstrument)
    
    // 新しい楽器のデフォルト設定を適用
    const defaultSettings = getDefaultSettings(newInstrument)
    setSettings(defaultSettings)
    
    // 保存
    if (trackId) {
      saveSettings(trackId, newInstrument, defaultSettings)
    }
  }, [trackId, getDefaultSettings, saveSettings])

  // 設定変更時の処理
  const handleSettingsChange = useCallback((parameter, value) => {
    // 値を安全に検証
    let safeValue = value
    if (typeof value !== 'number' || !isFinite(value)) {
      safeValue = 0
    }
    
    setSettings(prev => ({
      ...prev,
      [parameter]: safeValue
    }))
  }, [])

  // 設定保存
  const handleSaveSettings = useCallback(() => {
    if (trackId) {
      saveSettings(trackId, instrument, settings)
    }
    setShowSettingsPanel(false)
  }, [trackId, instrument, settings, saveSettings])

  // 設定リセット
  const handleResetSettings = useCallback(() => {
    const defaultSettings = getDefaultSettings(instrument)
    setSettings(defaultSettings)
  }, [instrument, getDefaultSettings])

  // 設定パネルを開く
  const openSettingsPanel = useCallback(() => {
    setShowSettingsPanel(true)
  }, [])

  // 設定パネルを閉じる
  const closeSettingsPanel = useCallback(() => {
    setShowSettingsPanel(false)
  }, [])

  return {
    instrument,
    settings,
    showSettingsPanel,
    handleInstrumentChange,
    handleSettingsChange,
    handleSaveSettings,
    handleResetSettings,
    openSettingsPanel,
    closeSettingsPanel,
    getDefaultSettings
  }
}

export default useInstrumentSettings 