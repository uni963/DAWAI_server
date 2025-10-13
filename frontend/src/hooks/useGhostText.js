import { useState, useEffect, useCallback, useRef } from 'react'
import magentaGhostTextEngine from '../utils/magentaGhostTextEngine.js'

/**
 * Ghost Text機能専用フック - Magenta版
 * 予測機能の状態管理とイベント処理を担当
 */
const useGhostText = (trackId, appSettings) => {
  // Ghost Text関連状態
  const [ghostTextEnabled, setGhostTextEnabled] = useState(appSettings?.midiEditor?.ghostTextEnabled ?? true)
  const [ghostPredictions, setGhostPredictions] = useState([])
  const [showGhostText, setShowGhostText] = useState(true)
  const [ghostTextSettings, setGhostTextSettings] = useState({
    predictionThreshold: appSettings?.midiEditor?.predictionThreshold ?? 0.7,
    debounceDelay: appSettings?.midiEditor?.debounceDelay ?? 200,
    contextWindow: appSettings?.midiEditor?.contextWindow ?? 16,
    predictionCount: appSettings?.midiEditor?.predictionCount ?? 5,
    displayCount: appSettings?.midiEditor?.displayCount ?? 1,
    generateSequentialPredictions: appSettings?.midiEditor?.generateSequentialPredictions ?? true,
    restProbability: appSettings?.midiEditor?.restProbability ?? 0.15,
    restDetectionThreshold: appSettings?.midiEditor?.restDetectionThreshold ?? 0.1
  })
  const [ghostTextStatus, setGhostTextStatus] = useState({
    isInitialized: false,
    isActive: false,
    modelType: 'none'
  })
  const [performanceMetrics, setPerformanceMetrics] = useState({
    averagePredictionTime: 0,
    cacheHitRate: 0,
    totalPredictions: 0,
    modelLoadTime: 0
  })
  
  // モデル関連状態
  const [currentModel, setCurrentModel] = useState(appSettings?.midiEditor?.currentModel ?? 'musicRnn')
  // 重複ログを防ぐため、初期化時のみログ出力
  const isInitializedRef = useRef(false)
  if (!isInitializedRef.current) {
    console.log('🎵 useGhostText: Initial currentModel from appSettings:', appSettings?.midiEditor?.currentModel, 'defaulting to:', currentModel)
    isInitializedRef.current = true
  }
  const [modelStatus, setModelStatus] = useState({
    musicRnn: 'ready',
    musicVae: 'ready',
    melodyRnn: 'ready',
    fallback: 'ready'
  })
  
  // Ghost Text Engineの初期化（重複初期化を防ぐ）
  useEffect(() => {
    if (!window.magentaGhostTextEngine) {
      window.magentaGhostTextEngine = new magentaGhostTextEngine()
    }
    
    const engine = window.magentaGhostTextEngine
    
    // 設定を更新
    console.log('🎵 useGhostText: Updating engine settings with currentModel:', currentModel)
    engine.updateSettings({
      ...ghostTextSettings,
      currentModel: currentModel
    })
    
    // モデルタイプを明示的に設定
    engine.modelType = currentModel
    console.log('🎵 useGhostText: Set engine.modelType to:', currentModel)
    
    // 初期化
    engine.initialize().then(() => {
      setGhostTextStatus({
        isInitialized: true,
        isActive: engine.isActive,
        modelType: engine.modelType
      })
    })
    
    // イベントリスナーの設定
    const handleStatusChange = (eventType, data) => {
      if (eventType === 'status') {
        setGhostTextStatus(data)
      }
    }
    
    const handlePrediction = (eventType, data) => {
      if (eventType === 'prediction') {
        // data.predictionsが配列であることを確認
        if (Array.isArray(data.predictions)) {
          setGhostPredictions(data.predictions)
        } else {
          console.warn('Ghost Text: predictions is not an array:', data.predictions)
          setGhostPredictions([])
        }
      }
    }
    
    const handlePerformanceUpdate = (eventType, data) => {
      if (eventType === 'metrics') {
        setPerformanceMetrics(data)
      }
    }
    
    engine.addListener(handleStatusChange)
    engine.addListener(handlePrediction)
    engine.addListener(handlePerformanceUpdate)
    
    // クリーンアップ
    return () => {
      engine.removeListener(handleStatusChange)
      engine.removeListener(handlePrediction)
      engine.removeListener(handlePerformanceUpdate)
    }
  }, [currentModel, ghostTextSettings])

  // ghostTextEnabledの変更を監視してアクティブ状態を更新
  useEffect(() => {
    if (ghostTextStatus.isInitialized && window.magentaGhostTextEngine) {
      window.magentaGhostTextEngine.setActive(ghostTextEnabled)
    }
  }, [ghostTextEnabled, ghostTextStatus.isInitialized])

  // appSettingsの変更を監視して設定を更新
  useEffect(() => {
    console.log('🔍 [DEBUG useGhostText] useEffect実行 - appSettings.midiEditor:', appSettings?.midiEditor)
    if (!appSettings?.midiEditor) {
      console.log('🔍 [DEBUG useGhostText] appSettings.midiEditorがないためreturn')
      return
    }

    const midiEditorSettings = appSettings.midiEditor
    console.log('🔍 [DEBUG useGhostText] midiEditorSettings:', midiEditorSettings)
    console.log('🔍 [DEBUG useGhostText] current ghostTextEnabled:', ghostTextEnabled, 'current currentModel:', currentModel)

    // Ghost Text有効/無効の更新
    if (midiEditorSettings.ghostTextEnabled !== undefined &&
        midiEditorSettings.ghostTextEnabled !== ghostTextEnabled) {
      console.log('🔍 [DEBUG useGhostText] ghostTextEnabled更新:', midiEditorSettings.ghostTextEnabled)
      setGhostTextEnabled(midiEditorSettings.ghostTextEnabled)
      if (window.magentaGhostTextEngine) {
        window.magentaGhostTextEngine.setActive(midiEditorSettings.ghostTextEnabled)
      }
    }

    // 設定の更新
    const newSettings = {
      predictionThreshold: midiEditorSettings.predictionThreshold,
      debounceDelay: midiEditorSettings.debounceDelay,
      contextWindow: midiEditorSettings.contextWindow,
      predictionCount: midiEditorSettings.predictionCount,
      displayCount: midiEditorSettings.displayCount,
      generateSequentialPredictions: midiEditorSettings.generateSequentialPredictions,
      restProbability: midiEditorSettings.restProbability,
      restDetectionThreshold: midiEditorSettings.restDetectionThreshold
    }

    // undefinedでない値のみを更新
    const validSettings = Object.fromEntries(
      Object.entries(newSettings).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(validSettings).length > 0) {
      setGhostTextSettings(prev => ({ ...prev, ...validSettings }))
      if (window.magentaGhostTextEngine) {
        window.magentaGhostTextEngine.updateSettings(validSettings)
      }
    }

    // モデルの更新（changeModelが定義された後に実行）
    if (midiEditorSettings.currentModel &&
        midiEditorSettings.currentModel !== currentModel) {
      console.log('🔍 [DEBUG useGhostText] currentModel更新開始:', midiEditorSettings.currentModel, '現在:', currentModel)
      // changeModelが利用可能になるまで待機
      const updateModel = async () => {
        try {
          console.log('🔍 [DEBUG useGhostText] updateModel実行開始:', midiEditorSettings.currentModel)
          // モデル状態をローディングに設定
          setModelStatus(prev => ({
            ...prev,
            [midiEditorSettings.currentModel]: 'loading'
          }))

          // リスナーに通知
          if (window.magentaGhostTextEngine) {
            window.magentaGhostTextEngine.notifyListeners('modelLoading', { modelKey: midiEditorSettings.currentModel })

            const success = await window.magentaGhostTextEngine.loadMagentaModel(midiEditorSettings.currentModel)

            if (success) {
              console.log('🔍 [DEBUG useGhostText] setCurrentModel実行:', midiEditorSettings.currentModel)
              setCurrentModel(midiEditorSettings.currentModel)
              setGhostTextStatus(window.magentaGhostTextEngine.getStatus())

              // モデル状態を成功に設定
              setModelStatus(prev => ({
                ...prev,
                [midiEditorSettings.currentModel]: 'ready'
              }))

              // リスナーに通知
              window.magentaGhostTextEngine.notifyListeners('modelLoaded', { modelKey: midiEditorSettings.currentModel })
              console.log('🔍 [DEBUG useGhostText] currentModel更新完了:', midiEditorSettings.currentModel)
            } else {
              throw new Error(`Failed to load model: ${midiEditorSettings.currentModel}`)
            }
          }
        } catch (error) {
          console.log('🔍 [DEBUG useGhostText] currentModel更新エラー:', error.message)
          // モデル状態をエラーに設定
          setModelStatus(prev => ({
            ...prev,
            [midiEditorSettings.currentModel]: 'error'
          }))

          // リスナーに通知
          if (window.magentaGhostTextEngine) {
            window.magentaGhostTextEngine.notifyListeners('modelError', {
              modelKey: midiEditorSettings.currentModel,
              error: error.message
            })
          }
        }
      }

      updateModel()
    }
  }, [appSettings?.midiEditor, ghostTextEnabled, currentModel])

  // Ghost Text有効化/無効化の切り替え
  const toggleGhostText = useCallback(() => {
    if (window.magentaGhostTextEngine) {
      window.magentaGhostTextEngine.setActive(!ghostTextEnabled)
    }
    setGhostTextEnabled(prev => !prev)
  }, [ghostTextEnabled, trackId])

  // Ghost Text表示の切り替え
  const toggleShowGhostText = useCallback(() => {
    setShowGhostText(prev => !prev)
  }, [])

  // Ghost Text設定の更新
  const updateGhostTextSettings = useCallback((newSettings) => {
    setGhostTextSettings(prev => ({ ...prev, ...newSettings }))
    if (window.magentaGhostTextEngine) {
      window.magentaGhostTextEngine.updateSettings(newSettings)
    }
  }, [])

  // モデル変更
  const changeModel = useCallback(async (modelKey) => {
    try {
      // モデル状態をローディングに設定
      setModelStatus(prev => ({
        ...prev,
        [modelKey]: 'loading'
      }))
      
      // リスナーに通知
      if (window.magentaGhostTextEngine) {
        window.magentaGhostTextEngine.notifyListeners('modelLoading', { modelKey })
        
        const success = await window.magentaGhostTextEngine.loadMagentaModel(modelKey)
        
        if (success) {
          setCurrentModel(modelKey)
          setGhostTextStatus(window.magentaGhostTextEngine.getStatus())
          
          // モデル状態を成功に設定
          setModelStatus(prev => ({
            ...prev,
            [modelKey]: 'ready'
          }))
          
          // リスナーに通知
          window.magentaGhostTextEngine.notifyListeners('modelLoaded', { modelKey })
        } else {
          throw new Error(`Failed to load model: ${modelKey}`)
        }
      }
    } catch (error) {
      // モデル状態をエラーに設定
      setModelStatus(prev => ({
        ...prev,
        [modelKey]: 'error'
      }))
      
      // リスナーに通知
      if (window.magentaGhostTextEngine) {
        window.magentaGhostTextEngine.notifyListeners('modelError', { modelKey, error: error.message })
      }
    }
  }, [])

  // Ghost Text予測の受け入れ（単一予測）
  const acceptGhostPrediction = useCallback((predictionIndex = 0, notes = [], onNoteAdd) => {
    if (ghostPredictions.length > predictionIndex) {
      const prediction = ghostPredictions[predictionIndex]
      const nextTime = notes.length > 0 
        ? Math.max(...notes.map(n => n.time + n.duration))
        : 0

      // 休符の場合はスキップ（音を出さない）
      if (prediction.isRest) {
        if (window.magentaGhostTextEngine) {
          window.magentaGhostTextEngine.clearPrediction()
        }
        return
      }

      if (onNoteAdd) {
        onNoteAdd(
          prediction.pitch,
          nextTime + (prediction.timing || 0),
          prediction.duration,
          prediction.velocity
        )
      }

      if (window.magentaGhostTextEngine) {
        window.magentaGhostTextEngine.clearPrediction()
      }
    }
  }, [ghostPredictions, trackId])

  // Ghost Text予測の全適用（Tabキー用）
  const acceptAllGhostPredictions = useCallback((notes = [], onNoteAdd) => {
    if (ghostPredictions.length === 0) return

    // 基準時間（最後のノートの終了時刻）
    const baseTime = notes.length > 0 
      ? Math.max(...notes.map(n => n.time + n.duration))
      : 0

    // 全予測を適用（各予測のtiming情報を使用）
    ghostPredictions.forEach((prediction, index) => {
      if (onNoteAdd) {
        // 予測のtiming情報を使用して正確な時間を計算
        const noteTime = baseTime + (prediction.timing || 0)
        
        // 休符の場合はスキップ（音を出さない）
        if (prediction.isRest) {
          return
        }
        
        onNoteAdd(
          prediction.pitch,
          noteTime,
          prediction.duration,
          prediction.velocity
        )
      }
    })

    // 予測をクリア
    if (window.magentaGhostTextEngine) {
      window.magentaGhostTextEngine.clearPrediction()
    }
  }, [ghostPredictions, trackId])

  // Ghost Text予測のクリア
  const clearGhostPredictions = useCallback(() => {
    setGhostPredictions([])
    if (window.magentaGhostTextEngine) {
      window.magentaGhostTextEngine.clearPrediction()
    }
  }, [])

  // MIDI入力の処理
  const processMidiInput = useCallback((note) => {
    if (window.magentaGhostTextEngine) {
      window.magentaGhostTextEngine.processMidiInput(note)
    }
  }, [])

  // テスト予測の生成
  const generateTestPrediction = useCallback(() => {
    if (window.magentaGhostTextEngine) {
      window.magentaGhostTextEngine.generateTestPrediction()
    }
  }, [])

  return {
    // 状態
    ghostTextEnabled,
    ghostPredictions,
    showGhostText,
    ghostTextSettings,
    ghostTextStatus,
    performanceMetrics,
    currentModel,
    modelStatus,
    
    // アクション
    toggleGhostText,
    toggleShowGhostText,
    updateGhostTextSettings,
    acceptGhostPrediction,
    acceptAllGhostPredictions,
    clearGhostPredictions,
    processMidiInput,
    generateTestPrediction,
    changeModel
  }
}

export default useGhostText 