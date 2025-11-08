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
  const [phraseNotes, setPhraseNotes] = useState([]) // 🔧 Problem 3修正: フレーズ予測ストレージ
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
  // 🔧 Phase 2修正: 初期化フラグを追加して重複初期化を防止
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
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

  // 🔴 [NEW] One-by-one approval tracking (Issue #146)
  const [nextGhostIndex, setNextGhostIndex] = useState(0)  // Index of next ghost note to approve
  const [nextPhraseIndex, setNextPhraseIndex] = useState(0)  // Index of next phrase note to approve
  const [approvalHistory, setApprovalHistory] = useState([]) // Track approved notes (max 50)
  const [lastApprovalSource, setLastApprovalSource] = useState(null) // Track if from 'phrase' or 'ghost'

  // 🔴 NEW: フレーズロック状態管理
  const [phraseLocked, setPhraseLocked] = useState(false)
  const [phraseSessionId, setPhraseSessionId] = useState(null)

  // 🔧 Phase 2修正: エンジン初期化とイベントリスナーの設定（一度だけ実行）
  useEffect(() => {
    // 既に初期化済み、または初期化中の場合はスキップ
    if (isInitializing || isInitialized) {
      console.log('🎵 useGhostText: Initialization skipped (isInitializing:', isInitializing, 'isInitialized:', isInitialized, ')')
      return
    }

    console.log('⏱️ [PERF] Ghost Text Engine 初期化開始')
    const initStartTime = performance.now()
    setIsInitializing(true)

    if (!window.magentaGhostTextEngine) {
      window.magentaGhostTextEngine = new magentaGhostTextEngine()
    }

    const engine = window.magentaGhostTextEngine

    // モデルタイプを明示的に設定
    engine.modelType = currentModel
    console.log('🎵 useGhostText: Set engine.modelType to:', currentModel)

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
          // 🔴 [NEW] Reset index when new predictions are generated
          if (data.predictions.length > 0) {
            setNextGhostIndex(0)
            console.log('🎯 Ghost predictions reset: nextGhostIndex → 0, count:', data.predictions.length)
          } else {
            setNextGhostIndex(0)
          }
        } else {
          console.warn('Ghost Text: predictions is not an array:', data.predictions)
          setGhostPredictions([])
          setNextGhostIndex(0)
        }
      }
      // 🔧 Problem 3修正: フレーズ予測イベントリスナー
      if (eventType === 'phrasePrediction') {
        console.log('🎵 useGhostText: Received phrasePrediction event:', data.phraseNotes?.length || 0, 'locked:', data.locked, 'sessionId:', data.sessionId)
        if (Array.isArray(data.phraseNotes)) {
          setPhraseNotes(data.phraseNotes)
          // 🔴 [NEW] Reset phrase index when new phrase predictions are generated
          if (data.phraseNotes.length > 0) {
            setNextPhraseIndex(0)
            // 🔴 NEW: フレーズロック状態を設定
            setPhraseLocked(data.locked !== undefined ? data.locked : true)
            setPhraseSessionId(data.sessionId || `session-${Date.now()}`)
            console.log('🎯 Phrase predictions reset: nextPhraseIndex → 0, count:', data.phraseNotes.length, 'locked:', data.locked, 'sessionId:', data.sessionId)
          } else {
            setNextPhraseIndex(0)
            setPhraseLocked(false)
            setPhraseSessionId(null)
          }
        } else {
          console.warn('Ghost Text: phraseNotes is not an array:', data.phraseNotes)
          setPhraseNotes([])
          setNextPhraseIndex(0)
          setPhraseLocked(false)
          setPhraseSessionId(null)
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

    // 初期化
    engine.initialize().then((success) => {
      const initEndTime = performance.now()
      const initDuration = ((initEndTime - initStartTime) / 1000).toFixed(2)
      console.log(`⏱️ [PERF] Ghost Text Engine 初期化完了: ${initDuration}秒`)
      console.log('✅ 初期化結果:', { success, isInitialized: engine.isInitialized })

      setGhostTextStatus({
        isInitialized: true,
        isActive: engine.isActive,
        modelType: engine.modelType
      })
      setIsInitialized(true)
      setIsInitializing(false)

      // ghostTextEnabledの初期値を初期化完了後に確実に反映
      console.log('🎵 Ghost Text有効化チェック:', {
        ghostTextEnabledSetting: appSettings?.midiEditor?.ghostTextEnabled,
        engineIsActive: engine.isActive
      })

      if (appSettings?.midiEditor?.ghostTextEnabled !== undefined) {
        const shouldBeActive = appSettings.midiEditor.ghostTextEnabled
        console.log('🎵 Ghost Text設定値に基づいて状態を設定:', shouldBeActive)
        engine.setActive(shouldBeActive)

        // 状態を確実に同期
        const finalStatus = engine.getStatus()
        console.log('🎵 最終状態:', finalStatus)
        setGhostTextStatus(finalStatus)

        if (shouldBeActive) {
          console.log('🤖 Ghost Text機能を有効化完了')
        } else {
          console.log('🔒 Ghost Text機能を無効化状態で維持')
        }
      } else {
        console.log('⚠️ Ghost Text設定が未定義のため、デフォルト状態を維持')
      }
    }).catch(error => {
      console.error('❌ Ghost Text Engine 初期化エラー:', error)
      console.error('❌ Error stack:', error.stack)
      setIsInitializing(false)
    })

    // クリーンアップ
    return () => {
      engine.removeListener(handleStatusChange)
      engine.removeListener(handlePrediction)
      engine.removeListener(handlePerformanceUpdate)
    }
  }, []) // 🔧 Phase 2修正: 依存配列を空にして一度だけ実行

  // 🔧 Phase 2修正: 設定更新用の別useEffect（初期化なし）
  useEffect(() => {
    if (!isInitialized || !window.magentaGhostTextEngine) {
      return
    }

    const engine = window.magentaGhostTextEngine

    // 設定のみを更新（初期化は行わない）
    console.log('🎵 useGhostText: Updating engine settings (no initialization):', {
      currentModel,
      ghostTextSettings
    })
    engine.updateSettings({
      ...ghostTextSettings,
      currentModel: currentModel
    })
  }, [currentModel, ghostTextSettings, isInitialized])

  // ghostTextEnabledの変更を監視してアクティブ状態を更新
  useEffect(() => {
    if (ghostTextStatus.isInitialized && window.magentaGhostTextEngine) {
      window.magentaGhostTextEngine.setActive(ghostTextEnabled)
    }
  }, [ghostTextEnabled, ghostTextStatus.isInitialized])

  // 🔧 Phase 2修正: appSettingsの変更を監視して設定を更新（初期化なし）
  useEffect(() => {
    if (!isInitialized || !appSettings?.midiEditor) {
      return
    }

    console.log('🔍 [DEBUG useGhostText] useEffect実行 - appSettings.midiEditor:', appSettings?.midiEditor)

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

    // モデルの更新（初期化なし、モデル切り替えのみ）
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
  }, [appSettings?.midiEditor, currentModel, isInitialized]) // 🔧 Phase 2修正: isInitializedを追加

  // 🔧 修正: Ghost Text有効化/無効化の切り替え
  // 問題: 依存配列にghostTextEnabledが含まれていたため、古いクロージャー値を参照していた
  // 解決: 依存配列から削除し、setGhostTextEnabledの関数形式のみを使用
  const toggleGhostText = useCallback(() => {
    console.log('🎵 toggleGhostText: Function called')

    setGhostTextEnabled(prev => {
      const newValue = !prev
      console.log('🎵 toggleGhostText: State updating from', prev, 'to', newValue)

      // エンジンの状態を更新
      if (window.magentaGhostTextEngine) {
        console.log('🎵 toggleGhostText: Calling magentaGhostTextEngine.setActive with:', newValue)
        window.magentaGhostTextEngine.setActive(newValue)

        // 🔧 修正: 状態を即座に同期して確実に反映
        const currentStatus = window.magentaGhostTextEngine.getStatus()
        console.log('🎵 toggleGhostText: Engine status after setActive:', currentStatus)
        setGhostTextStatus(currentStatus)
      } else {
        console.warn('🎵 toggleGhostText: magentaGhostTextEngine is not available!')
      }

      return newValue
    })
  }, []) // 🔧 修正: 依存配列からghostTextEnabledとtrackIdを削除

  // Ghost Text表示の切り替え
  const toggleShowGhostText = useCallback(() => {
    console.log('👁️ toggleShowGhostText: Function called')
    console.log('👁️ toggleShowGhostText: Current showGhostText:', showGhostText)
    setShowGhostText(prev => {
      console.log('👁️ toggleShowGhostText: State updating from', prev, 'to', !prev)
      return !prev
    })
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

  // 🔴 Problem 1修正: フレーズ予測専用採用関数
  const acceptAllPhrasePredictions = useCallback((notes = [], onNoteAdd) => {
    console.log('🎵 acceptAllPhrasePredictions: 実行開始', {
      phraseNotesCount: phraseNotes.length,
      currentNotesCount: notes.length,
      onNoteAddExists: !!onNoteAdd
    })

    if (phraseNotes.length === 0) {
      console.warn('⚠️ acceptAllPhrasePredictions: フレーズ予測が存在しません')
      return
    }

    if (!onNoteAdd) {
      console.error('❌ acceptAllPhrasePredictions: onNoteAdd関数が提供されていません')
      return
    }

    // 基準時間（最後のノートの終了時刻）
    const baseTime = notes.length > 0
      ? Math.max(...notes.map(n => n.time + n.duration))
      : 0

    console.log('🎵 acceptAllPhrasePredictions: 基準時間=', baseTime)

    // 全フレーズ予測を適用
    let addedCount = 0
    phraseNotes.forEach((prediction, index) => {
      try {
        // 予測のtiming情報を使用して正確な時間を計算
        const noteTime = baseTime + (prediction.timing || 0)

        // 休符の場合はスキップ（音を出さない）
        if (prediction.isRest) {
          console.log(`🎵 acceptAllPhrasePredictions: [${index}] 休符のためスキップ`)
          return
        }

        // ノート追加
        onNoteAdd(
          prediction.pitch,
          noteTime,
          prediction.duration || 0.25,
          prediction.velocity || 0.8
        )

        addedCount++
        console.log(`✅ acceptAllPhrasePredictions: [${index}] ノート追加成功`, {
          pitch: prediction.pitch,
          time: noteTime,
          duration: prediction.duration,
          velocity: prediction.velocity
        })
      } catch (error) {
        console.error(`❌ acceptAllPhrasePredictions: [${index}] ノート追加エラー:`, error)
      }
    })

    console.log(`🎵 acceptAllPhrasePredictions: 完了 (${addedCount}/${phraseNotes.length}ノート追加)`)

    // フレーズ予測をクリア
    setPhraseNotes([])

    // エンジン側のフレーズ予測もクリア
    if (window.magentaGhostTextEngine) {
      window.magentaGhostTextEngine.clearPhrasePrediction()
    }

    console.log('🎵 acceptAllPhrasePredictions: フレーズ予測クリア完了')
  }, [phraseNotes])

  // 🔴 [NEW] Accept next single ghost note with one-by-one tracking (Issue #146)
  const acceptNextGhostNote = useCallback((notes = [], onNoteAdd) => {
    console.log('🎯 acceptNextGhostNote: Processing', {
      nextGhostIndex,
      ghostPredictionsCount: ghostPredictions.length,
      hasOnNoteAdd: !!onNoteAdd
    })

    // Check if there are predictions available
    if (ghostPredictions.length === 0 || nextGhostIndex >= ghostPredictions.length) {
      console.warn('⚠️ acceptNextGhostNote: No predictions available or index out of range')
      return { success: false, message: 'No predictions available' }
    }

    const prediction = ghostPredictions[nextGhostIndex]
    const baseTime = notes.length > 0
      ? Math.max(...notes.map(n => n.time + n.duration))
      : 0
    const noteTime = baseTime + (prediction.timing || 0)

    // Skip rests (no sound, but advance index)
    if (prediction.isRest) {
      console.log(`🎯 acceptNextGhostNote: [${nextGhostIndex}] Skipping rest`)
      setNextGhostIndex(prev => prev + 1)
      return { success: true, skipped: true, message: 'Rest skipped' }
    }

    // Add the note
    if (onNoteAdd) {
      onNoteAdd(
        prediction.pitch,
        noteTime,
        prediction.duration,
        prediction.velocity
      )
      console.log(`✅ acceptNextGhostNote: [${nextGhostIndex}] Note added`, {
        pitch: prediction.pitch,
        time: noteTime
      })
    }

    // Track in approval history (max 50)
    setApprovalHistory(prev => {
      const newHistory = [...prev, {
        index: nextGhostIndex,
        noteId: `ghost-${nextGhostIndex}-${Date.now()}`,
        pitch: prediction.pitch,
        time: noteTime,
        duration: prediction.duration,
        source: 'ghost'
      }]
      // Keep only last 50 items
      return newHistory.slice(-50)
    })

    setLastApprovalSource('ghost')

    // Advance to next index
    setNextGhostIndex(prev => {
      const newIndex = prev + 1
      console.log(`🎯 acceptNextGhostNote: nextGhostIndex advanced ${prev} → ${newIndex}`)
      return newIndex
    })

    return { success: true, message: 'Note approved' }
  }, [ghostPredictions, nextGhostIndex])

  // 🔴 [NEW] Accept next single phrase note with tracking (Issue #146)
  const acceptNextPhraseNote = useCallback((notes = [], onNoteAdd) => {
    console.log('🎯 acceptNextPhraseNote: Processing', {
      nextPhraseIndex,
      phraseNotesCount: phraseNotes.length,
      phraseLocked,
      phraseSessionId
    })

    // 🔴 NEW: フレーズロック中のみ承認を許可
    if (!phraseLocked || !phraseSessionId) {
      console.warn('⚠️ No locked phrase session available')
      return { success: false, message: 'No locked phrase session' }
    }

    // Check if there are predictions available
    if (phraseNotes.length === 0 || nextPhraseIndex >= phraseNotes.length) {
      console.warn('⚠️ acceptNextPhraseNote: All notes in phrase approved, unlock for new phrase')
      setPhraseLocked(false)
      setPhraseSessionId(null)
      return { success: false, message: 'Phrase completed' }
    }

    const prediction = phraseNotes[nextPhraseIndex]
    const baseTime = notes.length > 0
      ? Math.max(...notes.map(n => n.time + n.duration))
      : 0
    const noteTime = baseTime + (prediction.timing || 0)

    // Skip rests
    if (prediction.isRest) {
      console.log(`🎯 acceptNextPhraseNote: [${nextPhraseIndex}] Skipping rest`)
      setNextPhraseIndex(prev => prev + 1)
      return { success: true, skipped: true, message: 'Rest skipped' }
    }

    // Add the note (🔴 CRITICAL: skipPrediction=trueで予測生成をスキップ)
    if (onNoteAdd) {
      onNoteAdd(
        prediction.pitch,
        noteTime,
        prediction.duration || 0.25,
        prediction.velocity || 0.8,
        { skipPrediction: true } // 🔴 NEW: 予測スキップフラグ
      )
      console.log(`✅ acceptNextPhraseNote: [${nextPhraseIndex}] Note added with skipPrediction=true`, {
        pitch: prediction.pitch,
        time: noteTime
      })
    }

    // Track in approval history
    setApprovalHistory(prev => {
      const newHistory = [...prev, {
        index: nextPhraseIndex,
        sessionId: phraseSessionId,
        noteId: `phrase-${nextPhraseIndex}-${Date.now()}`,
        pitch: prediction.pitch,
        time: noteTime,
        duration: prediction.duration || 0.25,
        source: 'phrase'
      }]
      return newHistory.slice(-50)
    })

    setLastApprovalSource('phrase')

    // Advance to next index
    setNextPhraseIndex(prev => {
      const newIndex = prev + 1
      console.log(`🎯 acceptNextPhraseNote: nextPhraseIndex advanced ${prev} → ${newIndex}`)

      // 🔴 NEW: フレーズ完了チェック
      if (newIndex >= phraseNotes.length) {
        console.log('✅ Phrase completed, unlocking for next phrase')
        setPhraseLocked(false)
        setPhraseSessionId(null)

        // エンジンに通知して新しいフレーズ生成
        if (window.magentaGhostTextEngine) {
          window.magentaGhostTextEngine.unlockPhraseSession()
          setTimeout(() => {
            window.magentaGhostTextEngine.generateNextPhrase()
          }, 100) // 少し遅延させて状態の整合性を保つ
        }
      }

      return newIndex
    })

    return { success: true, message: 'Phrase note approved' }
  }, [phraseNotes, nextPhraseIndex, phraseLocked, phraseSessionId])

  // 🔴 [NEW] Undo last approval (Shift+Tab functionality) (Issue #146)
  const undoLastGhostApproval = useCallback((notes, onNoteRemove) => {
    console.log('↩️ undoLastGhostApproval: Processing', {
      historyLength: approvalHistory.length,
      lastSource: lastApprovalSource
    })

    if (approvalHistory.length === 0) {
      console.warn('⚠️ undoLastGhostApproval: No approval history')
      return { success: false, message: 'No approval history' }
    }

    const lastApproval = approvalHistory[approvalHistory.length - 1]
    console.log('↩️ undoLastGhostApproval: Undoing', lastApproval)

    // Call onNoteRemove to remove the last added note
    if (onNoteRemove) {
      // Find note by pitch and approximate time (since we don't store exact noteId)
      const noteToRemove = notes.find(note =>
        note.pitch === lastApproval.pitch &&
        Math.abs(note.time - lastApproval.time) < 0.01 // 10ms tolerance
      )

      if (noteToRemove) {
        onNoteRemove(noteToRemove.id)
        console.log(`✅ undoLastGhostApproval: Note removed`, noteToRemove.id)
      }
    }

    // Move index back
    if (lastApprovalSource === 'phrase') {
      setNextPhraseIndex(prev => Math.max(0, prev - 1))
      console.log('↩️ undoLastGhostApproval: nextPhraseIndex decremented')
    } else {
      setNextGhostIndex(prev => Math.max(0, prev - 1))
      console.log('↩️ undoLastGhostApproval: nextGhostIndex decremented')
    }

    // Remove from history
    setApprovalHistory(prev => prev.slice(0, -1))

    // Update last source
    if (approvalHistory.length > 1) {
      setLastApprovalSource(approvalHistory[approvalHistory.length - 2].source)
    } else {
      setLastApprovalSource(null)
    }

    return { success: true, message: 'Approval undone' }
  }, [approvalHistory, lastApprovalSource])

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
    phraseNotes, // 🔧 Problem 3修正: フレーズ予測をreturnに追加
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
    acceptAllPhrasePredictions, // 🔴 Problem 1修正: フレーズ予測専用関数を追加
    acceptNextGhostNote,        // 🔴 [NEW] Issue #146: One-by-one approval
    acceptNextPhraseNote,       // 🔴 [NEW] Issue #146: One-by-one approval for phrases
    undoLastGhostApproval,      // 🔴 [NEW] Issue #146: Undo last approval
    clearGhostPredictions,
    processMidiInput,
    generateTestPrediction,
    changeModel,

    // Tracking states (Issue #146)
    nextGhostIndex,             // 🔴 [NEW] Index of next ghost note to approve
    nextPhraseIndex,            // 🔴 [NEW] Index of next phrase note to approve
    approvalHistory,            // 🔴 [NEW] Approval history for undo
    lastApprovalSource,         // 🔴 [NEW] Track source of last approval

    // Phrase session states
    phraseLocked,               // 🔴 NEW: フレーズロック状態
    phraseSessionId             // 🔴 NEW: フレーズセッションID
  }
}

export default useGhostText 