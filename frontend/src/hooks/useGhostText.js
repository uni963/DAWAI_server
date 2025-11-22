import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import MagentaGhostTextEngine from '../utils/magentaGhostTextEngine.js'
// 緊急修復: structuredDebugSystemファイルが存在しないためコメントアウト
// import { debugSystem, tabApprovalDebug } from '../utils/structuredDebugSystem.js'

/**
 * Ghost Text機能専用フック - Magenta版
 * 予測機能の状態管理とイベント処理を担当
 */
const useGhostText = (trackId, appSettings, notes) => {
  // Ghost Text関連状態
  const [ghostTextEnabled, setGhostTextEnabled] = useState(appSettings?.midiEditor?.ghostTextEnabled ?? true)
  const [ghostPredictions, setGhostPredictions] = useState([])
  const [phraseNotes, setPhraseNotes] = useState([]) // 🔧 Problem 3修正: フレーズ予測ストレージ（v1.0.0互換）
  const [showGhostText, setShowGhostText] = useState(true)

  // 🆕 v2.0.0: フレーズセット管理（複数セット対応）
  const [phraseSets, setPhraseSets] = useState([])  // 3つのフレーズセット: [[...], [...], [...]]
  const [selectedPhraseSetIndex, setSelectedPhraseSetIndex] = useState(0)  // 選択中のセットインデックス (0-2)
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0)  // セット内の承認済みノート位置 (0-4)
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
    console.log('🚨 [CRITICAL_INIT] useGhostText初期化useEffect実行開始', {
      isInitializing,
      isInitialized,
      trackId,
      timestamp: new Date().toISOString()
    })

    // 🔧 [FIX] 初期化チェックを緩和 - 既に初期化中でなければ実行
    if (isInitializing) {
      console.log('🎵 useGhostText: Initialization skipped - already initializing:', isInitializing)
      return
    }

    // 🚨 [CRITICAL_FIX] 初期化完了チェック - 既に初期化済みならスキップ
    if (isInitialized) {
      console.log('✅ useGhostText: Already initialized - skipping')
      return
    }

    // 💾 CRITICAL FIX: localStorage からphraseSetsを復元（タブ切り替え対応）
    try {
      const savedData = localStorage.getItem(`ghostText_phraseSets_${trackId}`)
      if (savedData) {
        const persistenceData = JSON.parse(savedData)
        const age = Date.now() - persistenceData.timestamp

        // 5分以内のデータのみ復元（古いデータは破棄）
        if (age < 300000 && persistenceData.phraseSets?.length > 0) {
          console.log('💾 [RESTORATION] localStorage からphraseSets復元:', {
            phraseSetsCount: persistenceData.phraseSets.length,
            selectedIndex: persistenceData.selectedPhraseSetIndex,
            age: `${Math.round(age / 1000)}秒前`,
            trackId
          })

          setPhraseSets(persistenceData.phraseSets)
          setSelectedPhraseSetIndex(persistenceData.selectedPhraseSetIndex || 0)
          setPhraseSessionId(persistenceData.phraseSessionId)
          setPhraseLocked(persistenceData.phraseLocked || false)

          // window.ghostTextHook即座同期（遅延削除）
          if (window.ghostTextHook) {
            window.ghostTextHook.phraseSets = persistenceData.phraseSets
            window.ghostTextHook.selectedPhraseSetIndex = persistenceData.selectedPhraseSetIndex || 0
            window.ghostTextHook.ghostPredictions = persistenceData.phraseSets[0] || []
            console.log('💾 [RESTORATION_SYNC] window.ghostTextHook同期完了（即座実行）')
          }
        } else {
          console.log('💾 [RESTORATION] 古いデータを破棄:', { age: `${Math.round(age / 1000)}秒前` })
          localStorage.removeItem(`ghostText_phraseSets_${trackId}`)
        }
      }
    } catch (error) {
      console.error('💾 [RESTORATION_ERROR] localStorage復元エラー:', error)
    }

    // 🚨 [CRITICAL_FIX] シンプルな遅延初期化（500ms）- 背景音声競合回避
    console.log('⏳ [SIMPLE_DELAY] Ghost Text初期化を500ms遅延実行')

    // イベントリスナーの設定（遅延しない）
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
            // 🎵 [DIVERSITY_DEBUG] イベント受信詳細ログ
            console.log('📥 [DIVERSITY_DEBUG][PHRASE_RECEIVED] useGhostText phrasePrediction受信:', {
              eventType,
              phraseNotesLength: data.phraseNotes?.length || 0,
              locked: data.locked,
              sessionId: data.sessionId,
              timestamp: Date.now(),
              rawData: data,
              step: 'phrase_receive_start'
            })

            console.log('🎵 useGhostText: Received phrasePrediction event:', data.phraseNotes?.length || 0, 'locked:', data.locked, 'sessionId:', data.sessionId)
            if (Array.isArray(data.phraseNotes)) {
              console.log('✅ [DIVERSITY_DEBUG][PHRASE_ARRAY_OK] phraseNotesは配列:', {
                length: data.phraseNotes.length,
                firstNote: data.phraseNotes[0] || null,
                step: 'phrase_array_validation'
              })

              setPhraseNotes(data.phraseNotes)
              console.log('🔄 [DIVERSITY_DEBUG][PHRASE_SET] setPhraseNotes実行完了:', {
                newLength: data.phraseNotes.length,
                step: 'phrase_notes_updated'
              })

              // 🔴 [NEW] Reset phrase index when new phrase predictions are generated
              if (data.phraseNotes.length > 0) {
                console.log('🎯 [DIVERSITY_DEBUG][PHRASE_RESET] フレーズ状態リセット開始:', {
                  newIndex: 0,
                  locked: data.locked,
                  sessionId: data.sessionId,
                  step: 'phrase_state_reset_start'
                })

                setNextPhraseIndex(0)
                // 🔴 NEW: フレーズロック状態を設定
                setPhraseLocked(data.locked !== undefined ? data.locked : true)
                setPhraseSessionId(data.sessionId || `session-${Date.now()}`)

                console.log('✅ [DIVERSITY_DEBUG][PHRASE_STATE_UPDATED] フレーズ状態更新完了:', {
                  nextPhraseIndex: 0,
                  phraseLocked: data.locked !== undefined ? data.locked : true,
                  phraseSessionId: data.sessionId || `session-${Date.now()}`,
                  phraseNotesCount: data.phraseNotes.length,
                  step: 'phrase_state_update_complete'
                })

            console.log('🎯 Phrase predictions reset: nextPhraseIndex → 0, count:', data.phraseNotes.length, 'locked:', data.locked, 'sessionId:', data.sessionId)
          } else {
            console.log('⚠️ [DIVERSITY_DEBUG][PHRASE_EMPTY] 空のフレーズ配列:', {
              length: data.phraseNotes.length,
              step: 'phrase_empty_handling'
            })
            setNextPhraseIndex(0)
            setPhraseLocked(false)
            setPhraseSessionId(null)
          }
        } else {
          console.error('❌ [DIVERSITY_DEBUG][PHRASE_INVALID] phraseNotesが配列ではない:', {
            receivedType: typeof data.phraseNotes,
            receivedValue: data.phraseNotes,
            step: 'phrase_invalid_data'
          })
          console.warn('Ghost Text: phraseNotes is not an array:', data.phraseNotes)
          setPhraseNotes([])
          setNextPhraseIndex(0)
          setPhraseLocked(false)
          setPhraseSessionId(null)
        }

        console.log('🏁 [DIVERSITY_DEBUG][PHRASE_PROCESS_COMPLETE] phrasePrediction処理完了:', {
          eventType,
          step: 'phrase_receive_complete'
        })
      }

      // 🆕 v2.0.0: フレーズセット生成イベントリスナー
      if (eventType === 'phrase-sets-generated') {
        console.log('📥 [PHRASE_SETS_RECEIVED] useGhostText phrase-sets-generated受信:', {
          eventType,
          phraseSetsCount: data.phraseSets?.length || 0,
          selectedSetIndex: data.selectedSetIndex,
          baseTime: data.baseTime,
          sessionId: data.sessionId,
          timestamp: Date.now(),
          rawData: data
        })

        if (Array.isArray(data.phraseSets) && data.phraseSets.length > 0) {
          console.log('✅ [PHRASE_SETS_ARRAY_OK] phraseSetsは配列:', {
            setsCount: data.phraseSets.length,
            firstSetLength: data.phraseSets[0]?.length || 0,
            allSetsLengths: data.phraseSets.map(set => set.length)
          })

          // フレーズセット状態を更新
          setPhraseSets(data.phraseSets)
          setSelectedPhraseSetIndex(data.selectedSetIndex || 0)
          setCurrentNoteIndex(0)  // セット切り替え時にリセット

          // ⚡ [INSTANT_SYNC] window.ghostTextHookを遅延なしで即座に同期更新
          // setTimeoutを削除し、受信と同時に直接更新
          const instantHookData = {
            ghostTextEnabled,
            ghostPredictions,
            phraseNotes,
            phraseSets: data.phraseSets,  // 最新のフレーズセット
            selectedPhraseSetIndex: data.selectedSetIndex || 0,
            phraseLocked: true,  // フレーズセット受信時は承認可能状態
            phraseSessionId: data.sessionId || `session-${Date.now()}`,
            acceptNextPhraseNote,
            selectNextPhraseSet,
            selectPrevPhraseSet
          }

          // 遅延なしで即座に更新
          window.ghostTextHook = instantHookData
          window.phrasePredictions = data.phraseSets

          console.log('⚡ [INSTANT_SYNC] window.ghostTextHook遅延なし同期完了:', {
            phraseSetsCount: data.phraseSets?.length || 0,
            selectedSetLength: (data.phraseSets[data.selectedSetIndex || 0]?.length || 0),
            windowHookSet: !!window.ghostTextHook,
            timestamp: Date.now(),
            step: 'instant_sync_complete'
          })

          // 🔴 FIX: TAB承認に必要な変数を初期化（4つ）+ baseTime設定
          const selectedSet = data.phraseSets[data.selectedSetIndex || 0]
          if (selectedSet && selectedSet.length > 0) {
            // 1. nextPhraseIndex: フレーズ承認用インデックス（最も重要）
            setNextPhraseIndex(0)

            // 2. nextGhostIndex: 単一予測承認用インデックス
            setNextGhostIndex(0)

            // 3. phraseLocked: 承認可能状態に設定
            setPhraseLocked(true)

            // 4. phraseSessionId: 有効なセッションIDを生成
            const sessionId = data.sessionId || `session-${Date.now()}`
            setPhraseSessionId(sessionId)

            // 🔧 [BASETIME_FIX] 5. baseTimeをエンジンのセッションに設定
            if (window.magentaGhostTextEngine) {
              if (!window.magentaGhostTextEngine.currentPhraseSession) {
                window.magentaGhostTextEngine.currentPhraseSession = {}
              }
              window.magentaGhostTextEngine.currentPhraseSession.baseTime = data.baseTime
              window.magentaGhostTextEngine.currentPhraseSession.notes = selectedSet
              window.magentaGhostTextEngine.currentPhraseSession.id = sessionId
              window.magentaGhostTextEngine.currentPhraseSession.locked = true

              console.log('🔧 [BASETIME_FIX] エンジンセッションにbaseTime設定完了:', {
                baseTime: data.baseTime,
                sessionId: sessionId,
                notesCount: selectedSet.length,
                step: 'basetime_initialized_in_engine'
              })
            }

            console.log('🔧 [TAB_APPROVAL_INIT] TAB承認変数初期化完了:', {
              nextPhraseIndex: 0,
              nextGhostIndex: 0,
              phraseLocked: true,
              phraseSessionId: sessionId,
              selectedSetLength: selectedSet.length,
              baseTime: data.baseTime,
              step: 'tab_approval_variables_initialized'
            })
          }

          console.log('✅ [PHRASE_SETS_STATE_UPDATED] フレーズセット状態更新完了:', {
            phraseSetsCount: data.phraseSets.length,
            selectedPhraseSetIndex: data.selectedSetIndex || 0,
            currentNoteIndex: 0,
            nextGhostIndex: 0,
            phraseLocked: true,
            phraseSessionId: data.sessionId || `session-${Date.now()}`
          })
        } else {
          console.warn('⚠️ [PHRASE_SETS_INVALID] phraseSetsが配列ではない（保持）:', {
            receivedType: typeof data.phraseSets,
            receivedValue: data.phraseSets,
            keepingExistingPhraseSets: true
          })
          // 🔧 CRITICAL FIX: エラー時でもphraseSetsを保持し、リセットしない
          // setPhraseSets([])  ← この行をコメントアウトしてphraseSets保持
          console.log('🔧 [PHRASE_PRESERVE] 既存phraseSetsを保持:', {
            currentPhraseSetsLength: phraseSets.length,
            preserveReason: 'avoid_data_loss'
          })
        }

        console.log('🏁 [PHRASE_SETS_PROCESS_COMPLETE] phrase-sets-generated処理完了')
      }
    }

    const handlePerformanceUpdate = (eventType, data) => {
      if (eventType === 'metrics') {
        setPerformanceMetrics(data)
      }
    }

    // 🚨 [SIMPLE_DELAY] シンプルな遅延初期化
    const delayedInitialization = setTimeout(async () => {
      console.log('⏱️ [PERF] Ghost Text Engine 初期化開始')
      const initStartTime = performance.now()
      setIsInitializing(true)

      try {
        if (!window.magentaGhostTextEngine) {
          window.magentaGhostTextEngine = new MagentaGhostTextEngine()
        }

        const engine = window.magentaGhostTextEngine
        engine.modelType = currentModel

        // イベントリスナー登録
        engine.addListener(handleStatusChange)
        engine.addListener(handlePrediction)
        engine.addListener(handlePerformanceUpdate)

        // 初期化実行
        const success = await engine.initialize()

        const initEndTime = performance.now()
        const initDuration = ((initEndTime - initStartTime) / 1000).toFixed(2)
        console.log(`⏱️ [PERF] Ghost Text Engine 初期化完了: ${initDuration}秒`)

        if (success) {
          setGhostTextStatus({
            isInitialized: true,
            isActive: engine.isActive,
            modelType: engine.modelType
          })
          setIsInitialized(true)
          setIsInitializing(false)

          // 設定の反映
          if (appSettings?.midiEditor?.ghostTextEnabled !== undefined) {
            const shouldBeActive = appSettings.midiEditor.ghostTextEnabled
            engine.setActive(shouldBeActive)
            const finalStatus = engine.getStatus()
            setGhostTextStatus(finalStatus)
            console.log('🤖 Ghost Text設定適用完了:', shouldBeActive)
          }

          // 🔧 [CRITICAL_FIX] 初期化成功時にwindow.ghostTextHookを完全なhookDataで設定
          window.ghostTextHook = {
            ghostTextEnabled,
            ghostPredictions: ghostPredictions || [],
            phraseNotes: phraseNotes || [],
            phraseSets: phraseSets || [],
            selectedPhraseSetIndex: selectedPhraseSetIndex || -1,
            phraseLocked: phraseLocked || false,
            phraseSessionId: phraseSessionId || '',
            acceptNextPhraseNote,
            selectNextPhraseSet,
            selectPrevPhraseSet,
            initialized: true,
            timestamp: Date.now(),
            hasGhostNotes: (phraseNotes?.length || 0) > 0
          }
          console.log('✅ [GHOST_TEXT_SYNC] 初期化成功時にwindow.ghostTextHook設定完了', {
            windowGhostTextHookSet: !!window.ghostTextHook,
            initialized: window.ghostTextHook.initialized,
            ghostTextEnabled: window.ghostTextHook.ghostTextEnabled,
            phraseSetsCount: window.ghostTextHook.phraseSets?.length || 0,
            phraseNotesCount: window.ghostTextHook.phraseNotes?.length || 0,
            hasGhostNotes: window.ghostTextHook.hasGhostNotes
          })

          // 🆕 [EXISTING_NOTES_PREDICTION] 既存ノートがある場合は予測生成を実行
          if (notes && notes.length > 0 && engine.isActive) {
            console.log('🎵 [EXISTING_NOTES_PREDICTION] 既存ノート検出 - 予測生成実行中', {
              notesCount: notes.length,
              firstNote: notes[0],
              timestamp: Date.now()
            })

            // 既存ノートを使って予測生成（正しいメソッド名を使用）
            try {
              engine.generatePrediction(notes)
            } catch (error) {
              console.error('❌ 既存ノート予測生成エラー:', error)
            }
          } else {
            console.log('🎵 [EXISTING_NOTES_PREDICTION] 既存ノートなし - 予測生成スキップ', {
              hasNotes: !!(notes && notes.length > 0),
              notesCount: notes?.length || 0,
              engineActive: engine.isActive
            })
          }
        } else {
          setIsInitializing(false)
          console.error('❌ Ghost Text Engine 初期化失敗')
        }
      } catch (error) {
        setIsInitializing(false)
        setIsInitialized(false)
        console.error('❌ Ghost Text 初期化エラー:', error)
      }
    }, 500) // 500ms遅延実行

    // クリーンアップ
    return () => {
      // 🚨 [CRITICAL_FIX] クリーンアップ時に遅延初期化をキャンセル
      clearTimeout(delayedInitialization)

      // エンジンが存在する場合のみイベントリスナーを削除
      if (window.magentaGhostTextEngine) {
        const engine = window.magentaGhostTextEngine
        engine.removeListener(handleStatusChange)
        engine.removeListener(handlePrediction)
        engine.removeListener(handlePerformanceUpdate)

        // 🆕 [DEMO_SONG_FIX] プロジェクト切り替え時のエンジン状態リセット
        console.log('🔄 [PROJECT_SWITCH] MagentaGhostTextEngine状態リセット: trackId変更検出')

        // 安全なメソッド呼び出し - メソッドの存在確認
        if (engine && typeof engine.reset === 'function') {
          try {
            engine.reset() // 予測状態をクリア
            console.log('✅ [PROJECT_SWITCH] engine.reset() 成功')
          } catch (error) {
            console.log('⚠️ [PROJECT_SWITCH] engine.reset() エラー:', error.message)
          }
        } else {
          console.log('ℹ️ [PROJECT_SWITCH] engine.reset() メソッドが存在しません')
        }

        if (engine && typeof engine.clearSession === 'function') {
          try {
            engine.clearSession() // セッション状態をクリア
            console.log('✅ [PROJECT_SWITCH] engine.clearSession() 成功')
          } catch (error) {
            console.log('⚠️ [PROJECT_SWITCH] engine.clearSession() エラー:', error.message)
          }
        } else {
          console.log('ℹ️ [PROJECT_SWITCH] engine.clearSession() メソッドが存在しません')
        }
      }

      // window.ghostTextHook状態もリセット
      window.ghostTextHook = {
        ghostTextEnabled: false,
        ghostPredictions: [],
        phraseNotes: [],
        phraseSets: [],
        selectedPhraseSetIndex: -1,
        phraseLocked: false,
        phraseSessionId: null,
        acceptNextPhraseNote: null,
        selectNextPhraseSet: null,
        selectPrevPhraseSet: null,
        initialized: false,
        timestamp: Date.now(),
        hasGhostNotes: false
      }
    }
  }, [trackId]) // 🔧 [LISTENER_FIX] trackId変更時のみ再初期化（notesの長さ変更では再初期化しない）

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

  // 🆕 [NEW_NOTE_PREDICTION] 新規ノート追加時の予測生成を監視
  useEffect(() => {
    if (!isInitialized || !ghostTextEnabled || !notes || notes.length === 0) {
      return
    }

    const engine = window.magentaGhostTextEngine
    if (!engine || !engine.isActive) {
      return
    }

    console.log('🎵 [NEW_NOTE_PREDICTION] 新規ノート追加検出 - 予測生成実行', {
      notesCount: notes.length,
      isInitialized,
      ghostTextEnabled,
      engineActive: engine.isActive,
      timestamp: Date.now()
    })

    // 新規ノートを使って予測生成
    try {
      engine.generatePrediction(notes)
      console.log('✅ [NEW_NOTE_PREDICTION] 予測生成成功')
    } catch (error) {
      console.error('❌ [NEW_NOTE_PREDICTION] 予測生成エラー:', error)
    }
  }, [notes, isInitialized, ghostTextEnabled]) // notesの変更を監視

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

  // 🔧 [CRITICAL_FIX] ghostTextEnabled変更時のwindow.ghostTextHook同期
  useEffect(() => {
    if (isInitialized && window.magentaGhostTextEngine) {
      console.log('🔄 [SYNC_FIX] ghostTextEnabled変更検出:', ghostTextEnabled)

      // window.ghostTextHookの状態を同期更新
      if (window.ghostTextHook) {
        window.ghostTextHook = {
          ...window.ghostTextHook,
          isEnabled: ghostTextEnabled,
          isInitialized: isInitialized,
          ghostTextEnabled: ghostTextEnabled
        }
        console.log('✅ [SYNC_FIX] window.ghostTextHook同期完了:', {
          isEnabled: window.ghostTextHook.isEnabled,
          isInitialized: window.ghostTextHook.isInitialized
        })
      }
    }
  }, [ghostTextEnabled, isInitialized]) // ghostTextEnabled変更を監視

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

    // Add the note (🔴 CRITICAL: skipPrediction=trueで予測生成をスキップ)
    if (onNoteAdd) {
      onNoteAdd(
        prediction.pitch,
        noteTime,
        prediction.duration,
        prediction.velocity,
        { skipPrediction: true } // 🔴 NEW: 予測スキップフラグ
      )
      console.log(`✅ acceptNextGhostNote: [${nextGhostIndex}] Note added with skipPrediction=true`, {
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
    // 🔥 [EMERGENCY] 全データソース調査
    /*
    // debugSystem.log('PHRASE', 'SESSION', 'ERROR', '🔥 緊急調査: 全データソース確認', {
      'hook_phraseNotes': phraseNotes?.length || 0,
      'hook_phraseSets': phraseSets?.length || 0,
      'hook_ghostPredictions': ghostPredictions?.length || 0,
      'engine_exists': !!window.magentaGhostTextEngine,
      'engine_session': !!window.magentaGhostTextEngine?.currentPhraseSession,
      'engine_session_notes': window.magentaGhostTextEngine?.currentPhraseSession?.notes?.length || 0,
      'engine_ghostPredictions': window.magentaGhostTextEngine?.ghostPredictions?.length || 0,
      step: 'emergency_data_audit'
    })
    */

    // 🔍 [2ND_PHRASE_DEBUG] 関数開始
    console.log('🔍 [2ND_PHRASE_DEBUG] acceptNextPhraseNote開始:', {
      nextPhraseIndex,
      step: 'function_start'
    })

    // 🚨 FIXED: エンジンの実際のセッションデータを参照
    const engine = window.magentaGhostTextEngine
    let phraseSession = engine?.currentPhraseSession
    let actualPhraseNotes = phraseSession?.notes || []

    // 🔴 v2.0.0対応: phraseSetsからもactualPhraseNotesを取得
    if (actualPhraseNotes.length === 0 && phraseSets?.length > 0) {
      const currentPhraseSet = phraseSets[selectedPhraseSetIndex || 0] || []
      if (currentPhraseSet.length > 0) {
        actualPhraseNotes = currentPhraseSet
        console.log('🔍 [V2_DEBUG] phraseSetsからactualPhraseNotes設定:', {
          selectedIndex: selectedPhraseSetIndex || 0,
          notesCount: actualPhraseNotes.length,
          step: 'phrase_sets_fallback'
        })
      }
    }

    // 🚨 EMERGENCY: phraseSetsもactualPhraseNotesも空の場合のフォールバック
    if (actualPhraseNotes.length === 0 && phraseNotes?.length > 0) {
      actualPhraseNotes = phraseNotes
      console.log('🚨 [EMERGENCY_FALLBACK] phraseNotesを使用:', {
        notesCount: actualPhraseNotes.length,
        step: 'emergency_fallback'
      })
    }

    // 🔍 体系的デバッグ: TAB承認状態
    const debugData = {
      hasSession: !!phraseSession,
      notesCount: actualPhraseNotes.length,
      nextPhraseIndex,
      phraseSetsLength: phraseSets?.length || 0,
      selectedPhraseSetIndex,
      currentPhraseSetLength: phraseSets?.[selectedPhraseSetIndex || 0]?.length || 0,
      phraseSetsDebug: phraseSets?.map((ps, i) => ({ index: i, length: ps?.length || 0 })),
      step: 'approval_check'
    }
    // tabApprovalDebug.logEventFlow('TAB承認状態チェック', debugData)
    // 🔍 [LEGACY] 既存ログも並行出力（互換性）
    console.log('🔍 [2ND_PHRASE_DEBUG] TAB承認状態:', debugData)

    // 🚨 緊急復旧: engine状態失われた場合
    if ((!phraseSession || actualPhraseNotes.length === 0) && phraseNotes.length > 0 && phraseLocked) {
      console.warn('🔍 [2ND_PHRASE_DEBUG] Engine状態復旧中...')

      const emergencyBaseTime = notes.length > 0 ? Math.max(...notes.map(n => n.time + n.duration)) : 0
      phraseSession = {
        baseTime: emergencyBaseTime,
        notes: phraseNotes,
        locked: true,
        id: `emergency-${Date.now()}`
      }
      actualPhraseNotes = phraseNotes

      if (engine) {
        engine.currentPhraseSession = phraseSession
      }

      console.log('🔍 [2ND_PHRASE_DEBUG] Engine復旧完了:', {
        baseTime: emergencyBaseTime,
        step: 'engine_restored'
      })
    }

    // 🔴 v2.0.0対応: phraseSetsがある場合はセッションロック不要で承認許可
    const hasValidPhraseSets = phraseSets?.length > 0 && phraseSets[selectedPhraseSetIndex || 0]?.length > 0
    const hasValidSession = (phraseLocked && phraseSessionId && phraseSession && actualPhraseNotes.length > 0)

    if (!hasValidSession && !hasValidPhraseSets) {
      console.warn('🔍 [2ND_PHRASE_DEBUG] 承認不可:', {
        phraseLocked,
        hasSession: !!phraseSession,
        notesCount: actualPhraseNotes.length,
        hasValidPhraseSets,
        phraseSetsLength: phraseSets?.length || 0,
        currentPhraseSet: phraseSets?.[selectedPhraseSetIndex || 0]?.length || 0,
        step: 'approval_rejected_v2'
      })
      return {
        success: false,
        message: 'No locked phrase session or valid phrase sets',
        metrics: {
          totalNotes: actualPhraseNotes.length,
          currentIndex: nextPhraseIndex,
          remainingNotes: actualPhraseNotes.length - nextPhraseIndex,
          phraseSetsAvailable: hasValidPhraseSets
        }
      }
    }

    // 🚨 FIXED: エンジンの実際のデータで判定 - 末尾で統一処理するため削除

    const prediction = actualPhraseNotes[nextPhraseIndex]

    // 🔧 [BASETIME_FIX] フレーズセッション中は固定baseTimeを優先使用（動的再計算を回避）
    let baseTime
    if (phraseSession && phraseSession.baseTime !== undefined) {
      // セッションのbaseTimeを優先（固定値）
      baseTime = phraseSession.baseTime
      console.log('🔧 [BASETIME_FIX] セッションbaseTime使用（固定）:', {
        baseTime,
        source: 'phraseSession',
        sessionId: phraseSession.id,
        step: 'basetime_from_session'
      })
    } else {
      // フォールバック: 動的計算（セッションがない場合のみ）
      baseTime = notes.length > 0 ? Math.max(...notes.map(n => n.time + n.duration)) : 0
      console.warn('⚠️ [BASETIME_FIX] セッションbaseTime未設定 - 動的計算使用:', {
        baseTime,
        source: 'dynamic_calculation',
        notesCount: notes.length,
        step: 'basetime_fallback'
      })
    }

    const noteTime = baseTime + (prediction.timing || prediction.time || 0)

    console.log('✅ [2ND_PHRASE] 承認処理:', {
      noteIndex: nextPhraseIndex,
      baseTime,
      baseTimeSource: phraseSession?.baseTime !== undefined ? 'session' : 'dynamic',
      relativeTime: prediction.timing || prediction.time || 0,
      absoluteTime: noteTime,
      pitch: prediction.pitch,
      step: 'note_approval_calculation'
    })

    // Skip rests
    if (prediction.isRest) {
      console.log(`🎯 acceptNextPhraseNote: [${nextPhraseIndex}] Skipping rest`)
      const newIndex = nextPhraseIndex + 1
      setNextPhraseIndex(newIndex)

      console.log('🔧 [acceptNextPhraseNote] AFTER (rest skipped):', {
        newIndex,
        remainingNotes: actualPhraseNotes.length - newIndex
      })

      return {
        success: true,
        skipped: true,
        message: 'Rest skipped',
        metrics: {
          totalNotes: actualPhraseNotes.length,
          currentIndex: newIndex,
          remainingNotes: actualPhraseNotes.length - newIndex
        }
      }
    }

    // Add the note (🔴 CRITICAL: skipPrediction=trueで予測生成をスキップ)
    if (onNoteAdd) {
      onNoteAdd(
        prediction.pitch,
        noteTime,  // ← 🔧 FIXED: 絶対位置を使用
        prediction.duration || 0.25,
        prediction.velocity || 0.8,
        { skipPrediction: true } // 🔴 NEW: 予測スキップフラグ
      )
      console.log(`✅ acceptNextPhraseNote: [${nextPhraseIndex}] Note added at absoluteTime=${noteTime} with skipPrediction=true`, {
        pitch: prediction.pitch,
        baseTime,
        relativeTime: prediction.timing || 0,
        absoluteTime: noteTime
      })

    }

    // 🎯 CRITICAL FIX: 承認済みフレーズノートトラッキングに追加
    if (window.magentaGhostTextEngine) {
      const approvedNote = {
        pitch: prediction.pitch,
        time: noteTime,
        duration: prediction.duration || 0.25,
        velocity: prediction.velocity || 0.8
      }
      window.magentaGhostTextEngine.approvedPhraseNotes.push(approvedNote)
      console.log('🎯 [DIVERSITY_DEBUG][APPROVED_NOTE] 承認ノート追加:', {
        note: approvedNote,
        totalApproved: window.magentaGhostTextEngine.approvedPhraseNotes.length,
        step: 'note_tracking_added'
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
    // 🚨 FIX: newIndexを先に計算してから状態更新
    const newIndex = nextPhraseIndex + 1

    setNextPhraseIndex(newIndex)
    console.log(`🎯 acceptNextPhraseNote: nextPhraseIndex advanced ${nextPhraseIndex} → ${newIndex}`)

    // 🔴 NEW: エンジンのセッションインデックスとカウントを更新
    if (window.magentaGhostTextEngine && window.magentaGhostTextEngine.currentPhraseSession) {
      window.magentaGhostTextEngine.currentPhraseSession.nextPhraseIndex = newIndex
      window.magentaGhostTextEngine.currentPhraseSession.approvedCount++
      console.log(`🔍 [セッション] 更新: index=${newIndex}, approved=${window.magentaGhostTextEngine.currentPhraseSession.approvedCount}/${window.magentaGhostTextEngine.currentPhraseSession.totalCount}`)
      console.log('📊 Engine session updated:', {
        nextPhraseIndex: window.magentaGhostTextEngine.currentPhraseSession.nextPhraseIndex,
        approvedCount: window.magentaGhostTextEngine.currentPhraseSession.approvedCount,
        totalCount: window.magentaGhostTextEngine.currentPhraseSession.totalCount
      })
    }

    // 🚨 CRITICAL FIX: フレーズ完了時の自動セッション作成処理
    if (newIndex >= actualPhraseNotes.length) {
      console.log('🔍 [2ND_PHRASE_DEBUG] フレーズ完了検出(末尾):', {
        newIndex,
        totalNotes: actualPhraseNotes.length,
        step: 'phrase_completed_tail'
      })

      // 🎵 [DIVERSITY_DEBUG] フレーズ完了時の分岐判定ログ
      console.log('🎯 [DIVERSITY_DEBUG][PHRASE_COMPLETION] フレーズ完了時分岐判定:', {
        phraseNotesLength: phraseNotes.length,
        engineExists: !!engine,
        conditionResult: phraseNotes.length > 0 && engine,
        step: 'branch_decision'
      })

      // 🆕 CRITICAL FIX: フレーズ完了時は常に新フレーズ生成
      // セッションクリア＋新フレーズ生成
      setPhraseLocked(false)
      setPhraseSessionId(null)
      setNextPhraseIndex(0)

      console.log('🎯 [DIVERSITY_DEBUG][FORCE_NEW_PHRASE] 強制新フレーズ生成開始:', {
        clearingSession: true,
        unlockingSession: true,
        triggeringGeneration: true,
        step: 'forced_new_generation'
      })

      if (window.magentaGhostTextEngine) {
        window.magentaGhostTextEngine.unlockPhraseSession()
        console.log('🔓 [DIVERSITY_DEBUG] Phrase session unlocked - generating new phrase')

        // 🆕 CRITICAL FIX: フレーズ完了時に新フレーズ生成をトリガー
        console.log('🎵 [DIVERSITY_DEBUG][PHRASE_TRIGGER] フレーズ完了→新フレーズ生成開始')
        console.log('🔍 [V2_DEBUG][CALL_POINT_3] 呼び出し箇所3: useGhostText → フレーズ完了 → generateMultiplePhraseSets()')
        console.log('🔍 [V2_DEBUG][V2_APPLIED] ✅ v2.0.0修正適用: generateMultiplePhraseSets(currentSequence, 3, 5)')
        window.magentaGhostTextEngine.generateMultiplePhraseSets(window.magentaGhostTextEngine.currentSequence, 3, 5)

        console.log('✅ [DIVERSITY_DEBUG][PHRASE_TRIGGER_SENT] generateMultiplePhraseSets呼び出し完了')
      } else {
        console.error('❌ [DIVERSITY_DEBUG] magentaGhostTextEngine not available!')
      }
    }

    // 🔧 DEBUG: 承認後の状態
    console.log('🔧 [acceptNextPhraseNote] AFTER:', {
      newIndex,
      totalPhraseNotes: actualPhraseNotes.length,
      remainingNotes: actualPhraseNotes.length - newIndex,
      completed: newIndex >= actualPhraseNotes.length
    })

    return {
      success: true,
      message: 'Phrase note approved',
      metrics: {
        totalNotes: actualPhraseNotes.length,
        currentIndex: newIndex,
        remainingNotes: actualPhraseNotes.length - newIndex,
        approvedNote: {
          pitch: prediction.pitch,
          time: noteTime,
          duration: prediction.duration || 0.25
        }
      }
    }
  }, [nextPhraseIndex, phraseLocked, phraseSessionId]) // 🚨 FIXED: phraseNotesを削除（エンジンから直接取得）

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

  // 🔴 [NEW] Issue #147: 候補切り替え機能 - Ghost候補を次に切り替え
  const selectNextGhostCandidate = useCallback(() => {
    if (ghostPredictions.length === 0) {
      console.warn('⚠️ [CANDIDATE_SELECT_ISSUE147] No ghost predictions available')
      return
    }

    setNextGhostIndex(prev => {
      const nextIndex = (prev + 1) % ghostPredictions.length
      console.log('🔄 [GHOST_CANDIDATE_NEXT_ISSUE147] Ghost候補切り替え:', {
        from: prev,
        to: nextIndex,
        totalCandidates: ghostPredictions.length,
        newCandidate: ghostPredictions[nextIndex]
      })
      return nextIndex
    })
  }, [ghostPredictions])

  // 🔴 [NEW] Issue #147: 候補切り替え機能 - Ghost候補を前に切り替え
  const selectPrevGhostCandidate = useCallback(() => {
    if (ghostPredictions.length === 0) {
      console.warn('⚠️ [CANDIDATE_SELECT_ISSUE147] No ghost predictions available')
      return
    }

    setNextGhostIndex(prev => {
      const prevIndex = (prev - 1 + ghostPredictions.length) % ghostPredictions.length
      console.log('🔄 [GHOST_CANDIDATE_PREV_ISSUE147] Ghost候補切り替え:', {
        from: prev,
        to: prevIndex,
        totalCandidates: ghostPredictions.length,
        newCandidate: ghostPredictions[prevIndex]
      })
      return prevIndex
    })
  }, [ghostPredictions])

  // 🔴 [NEW] Issue #147: 候補切り替え機能 - フレーズ候補を次に切り替え
  const selectNextPhraseCandidate = useCallback(() => {
    const currentPhraseSet = phraseSets[selectedPhraseSetIndex || 0] || []
    if (currentPhraseSet.length === 0) {
      console.warn('⚠️ [CANDIDATE_SELECT_ISSUE147] No phrase predictions available')
      return
    }

    setNextPhraseIndex(prev => {
      const nextIndex = (prev + 1) % currentPhraseSet.length
      console.log('🔄 [PHRASE_CANDIDATE_NEXT_ISSUE147] フレーズ候補切り替え:', {
        from: prev,
        to: nextIndex,
        totalCandidates: currentPhraseSet.length,
        newCandidate: currentPhraseSet[nextIndex]
      })

      // 🔔 チュートリアルイベント発火: Step 7用
      try {
        const tutorialEvent = new CustomEvent('tutorial:phrase-switched', {
          detail: {
            phraseIndex: nextIndex,
            totalCandidates: currentPhraseSet.length,
            source: 'phrase-candidate-switch'
          }
        })
        console.log('🎓 [TUTORIAL] フレーズ切り替えイベント発火:', tutorialEvent.type)
        window.dispatchEvent(tutorialEvent)
      } catch (error) {
        console.warn('⚠️ [TUTORIAL] フレーズ切り替えイベント発火失敗:', error)
      }

      return nextIndex
    })
  }, [phraseSets, selectedPhraseSetIndex])

  // 🔴 [NEW] Issue #147: 候補切り替え機能 - フレーズ候補を前に切り替え
  const selectPrevPhraseCandidate = useCallback(() => {
    const currentPhraseSet = phraseSets[selectedPhraseSetIndex || 0] || []
    if (currentPhraseSet.length === 0) {
      console.warn('⚠️ [CANDIDATE_SELECT_ISSUE147] No phrase predictions available')
      return
    }

    setNextPhraseIndex(prev => {
      const prevIndex = (prev - 1 + currentPhraseSet.length) % currentPhraseSet.length
      console.log('🔄 [PHRASE_CANDIDATE_PREV_ISSUE147] フレーズ候補切り替え:', {
        from: prev,
        to: prevIndex,
        totalCandidates: currentPhraseSet.length,
        newCandidate: currentPhraseSet[prevIndex]
      })

      // 🔔 チュートリアルイベント発火: Step 7用
      try {
        const tutorialEvent = new CustomEvent('tutorial:phrase-switched', {
          detail: {
            phraseIndex: prevIndex,
            totalCandidates: currentPhraseSet.length,
            source: 'phrase-candidate-switch'
          }
        })
        console.log('🎓 [TUTORIAL] フレーズ切り替えイベント発火:', tutorialEvent.type)
        window.dispatchEvent(tutorialEvent)
      } catch (error) {
        console.warn('⚠️ [TUTORIAL] フレーズ切り替えイベント発火失敗:', error)
      }

      return prevIndex
    })
  }, [phraseSets, selectedPhraseSetIndex])

  // 🆕 v2.0.0: フレーズセット切り替え関数
  const selectNextPhraseSet = useCallback(() => {
    if (!phraseSets || phraseSets.length === 0) {
      console.warn('⚠️ [PHRASE_SET_SELECT] No phrase sets available')
      return
    }

    let newNextIndex = null
    setSelectedPhraseSetIndex(prev => {
      const nextIndex = (prev + 1) % phraseSets.length
      newNextIndex = nextIndex
      console.log('🔄 [PHRASE_SET_NEXT] フレーズセット切り替え:', {
        from: prev,
        to: nextIndex,
        totalSets: phraseSets.length,
        newSet: phraseSets[nextIndex],
        setNoteCount: phraseSets[nextIndex]?.length || 0
      })
      return nextIndex
    })

    // セット切り替え時はノート承認位置をリセット
    setCurrentNoteIndex(0)
    console.log('🔄 [PHRASE_SET_NEXT] currentNoteIndexをリセット: 0')

    // 🔴 FIX: TAB承認に必要な変数を再初期化（4つ）
    setNextPhraseIndex(0)
    setNextGhostIndex(0)
    setPhraseLocked(true)
    setPhraseSessionId(`session-${Date.now()}`)
    console.log('🔧 [TAB_APPROVAL_RESET] セット切り替え時にTAB承認変数リセット完了')

    // 🆕 CRITICAL FIX: Engine同期のための新しいphrase-sets-generatedイベント発行
    setTimeout(() => {
      if (newNextIndex !== null && window.magentaGhostTextEngine && phraseSets[newNextIndex]) {
        const baseTime = notes.length > 0 ? Math.max(...notes.map(n => n.time + n.duration)) : 0
        const notificationData = {
          phraseSets: phraseSets,
          selectedSetIndex: newNextIndex,
          baseTime: baseTime,
          sessionId: `phrase-sets-${Date.now()}`
        }
        console.log('🔄 [PHRASE_SET_ENGINE_SYNC] Engine同期のためphrase-sets-generatedイベント発行:', {
          selectedSetIndex: newNextIndex,
          baseTime: baseTime,
          newSetLength: phraseSets[newNextIndex]?.length || 0,
          step: 'engine_sync_event'
        })
        window.magentaGhostTextEngine.notifyListeners('phrase-sets-generated', notificationData)
      }
    }, 0)
  }, [phraseSets, notes])

  const selectPrevPhraseSet = useCallback(() => {
    if (!phraseSets || phraseSets.length === 0) {
      console.warn('⚠️ [PHRASE_SET_SELECT] No phrase sets available')
      return
    }

    let newPrevIndex = null
    setSelectedPhraseSetIndex(prev => {
      const prevIndex = (prev - 1 + phraseSets.length) % phraseSets.length
      newPrevIndex = prevIndex
      console.log('🔄 [PHRASE_SET_PREV] フレーズセット切り替え:', {
        from: prev,
        to: prevIndex,
        totalSets: phraseSets.length,
        newSet: phraseSets[prevIndex],
        setNoteCount: phraseSets[prevIndex]?.length || 0
      })
      return prevIndex
    })

    // セット切り替え時はノート承認位置をリセット
    setCurrentNoteIndex(0)
    console.log('🔄 [PHRASE_SET_PREV] currentNoteIndexをリセット: 0')

    // 🔴 FIX: TAB承認に必要な変数を再初期化（4つ）
    setNextPhraseIndex(0)
    setNextGhostIndex(0)
    setPhraseLocked(true)
    setPhraseSessionId(`session-${Date.now()}`)
    console.log('🔧 [TAB_APPROVAL_RESET] セット切り替え時にTAB承認変数リセット完了')

    // 🆕 CRITICAL FIX: Engine同期のための新しいphrase-sets-generatedイベント発行
    setTimeout(() => {
      if (newPrevIndex !== null && window.magentaGhostTextEngine && phraseSets[newPrevIndex]) {
        const baseTime = notes.length > 0 ? Math.max(...notes.map(n => n.time + n.duration)) : 0
        const notificationData = {
          phraseSets: phraseSets,
          selectedSetIndex: newPrevIndex,
          baseTime: baseTime,
          sessionId: `phrase-sets-${Date.now()}`
        }
        console.log('🔄 [PHRASE_SET_ENGINE_SYNC] Engine同期のためphrase-sets-generatedイベント発行:', {
          selectedSetIndex: newPrevIndex,
          baseTime: baseTime,
          newSetLength: phraseSets[newPrevIndex]?.length || 0,
          step: 'engine_sync_event'
        })
        window.magentaGhostTextEngine.notifyListeners('phrase-sets-generated', notificationData)
      }
    }, 0)
  }, [phraseSets, notes])

  // 🆕 v2.0.0: Getterメソッド - フレーズセットデータへの安全なアクセス
  const getCurrentPhraseSet = useCallback(() => {
    if (!phraseSets || phraseSets.length === 0) {
      console.log('🔍 [GETTER] getCurrentPhraseSet: No phrase sets available')
      return []
    }
    if (selectedPhraseSetIndex >= phraseSets.length) {
      console.warn('⚠️ [GETTER] getCurrentPhraseSet: Invalid index', {
        selectedPhraseSetIndex,
        totalSets: phraseSets.length
      })
      return []
    }
    const currentSet = phraseSets[selectedPhraseSetIndex] || []
    console.log('🔍 [GETTER] getCurrentPhraseSet:', {
      selectedPhraseSetIndex,
      noteCount: currentSet.length
    })
    return currentSet
  }, [phraseSets, selectedPhraseSetIndex])

  const getCurrentNote = useCallback(() => {
    const currentSet = getCurrentPhraseSet()
    if (!currentSet || currentSet.length === 0) {
      console.log('🔍 [GETTER] getCurrentNote: No notes in current set')
      return null
    }
    if (currentNoteIndex >= currentSet.length) {
      console.warn('⚠️ [GETTER] getCurrentNote: Invalid index', {
        currentNoteIndex,
        setLength: currentSet.length
      })
      return null
    }
    const note = currentSet[currentNoteIndex] || null
    console.log('🔍 [GETTER] getCurrentNote:', {
      currentNoteIndex,
      note: note ? `pitch=${note.pitch}` : 'null'
    })
    return note
  }, [getCurrentPhraseSet, currentNoteIndex])

  const getNextNote = useCallback(() => {
    const currentSet = getCurrentPhraseSet()
    if (!currentSet || currentSet.length === 0) {
      console.log('🔍 [GETTER] getNextNote: No notes in current set')
      return null
    }
    const nextIndex = currentNoteIndex + 1
    if (nextIndex >= currentSet.length) {
      console.log('🔍 [GETTER] getNextNote: Reached end of set')
      return null
    }
    const nextNote = currentSet[nextIndex] || null
    console.log('🔍 [GETTER] getNextNote:', {
      nextIndex,
      note: nextNote ? `pitch=${nextNote.pitch}` : 'null'
    })
    return nextNote
  }, [getCurrentPhraseSet, currentNoteIndex])

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

  // 🔴 [CRITICAL] TABイベントハンドラー - Ghost Text承認処理（フレーズ位置修正+多様性統合版）
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎯 [TAB_APPROVAL_DEBUG] useGhostText TABイベントリスナー登録開始')
    console.log('🎯 [TAB_APPROVAL_DEBUG] trackId:', trackId)
    console.log('🎯 [TAB_APPROVAL_DEBUG] Event name: accept-ghost-text-global')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // 🎲 多様性メトリクス追跡
    const diversityMetricsRef = {
      phraseCount: 0,
      ghostCount: 0,
      consecutivePhraseCount: 0,
      consecutiveGhostCount: 0,
      lastSource: null,
      totalApprovals: 0
    }

    // 🎲 重み付きランダム選択関数
    const weightedRandomSelect = (items) => {
      const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0)
      let random = Math.random() * totalWeight

      console.log('🎲 [WEIGHTED_RANDOM] Selection process:', {
        totalWeight,
        randomValue: random,
        items
      })

      for (const item of items) {
        random -= (item.weight || 1)
        if (random <= 0) {
          console.log('🎲 [WEIGHTED_RANDOM] Selected:', item.type)
          return item
        }
      }

      return items[0]
    }

    const handleAcceptGhostText = (event) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🎲 [DIVERSITY_DEBUG] accept-ghost-text-globalイベント受信')
      console.log('🎲 [DIVERSITY_DEBUG] Listener location: useGhostText.js')
      console.log('🎲 [DIVERSITY_DEBUG] Event detail:', event.detail)
      console.log('🎲 [DIVERSITY_DEBUG] trackId:', trackId)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // 🔍 [TAB_APPROVAL_DEBUG] 構造デバッグシステムでイベント記録
      /*
      // tabApprovalDebug.logEventFlow('accept-ghost-text-globalイベント受信', {
        eventDetail: event.detail,
        trackId,
        timestamp: Date.now()
      })
      */

      // プロジェクトマネージャーから必要なデータを取得
      const projectManager = window.projectManager
      if (!projectManager) {
        console.warn('🚨 [DIVERSITY_DEBUG] ProjectManager not found')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        return
      }

      const currentTrack = projectManager.getTrack(trackId)
      if (!currentTrack || !currentTrack.midiData?.notes) {
        console.warn('🚨 [DIVERSITY_DEBUG] Current track or notes not found')
        console.log('🚨 [DIVERSITY_DEBUG] currentTrack:', currentTrack ? 'exists' : 'null')
        console.log('🚨 [DIVERSITY_DEBUG] midiData:', currentTrack?.midiData ? 'exists' : 'null')
        console.log('🚨 [DIVERSITY_DEBUG] notes:', currentTrack?.midiData?.notes ? `${currentTrack.midiData.notes.length} notes` : 'null')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        return
      }

      // 🔴 Shift+Tab処理: Undo last approval
      if (event.detail?.shiftKey) {
        console.log('↩️ [DIVERSITY_DEBUG] Shift+Tab検出: Undoing last approval')
        undoLastGhostApproval()
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        return
      }

      const notes = currentTrack.midiData.notes
      const onNoteAdd = (pitch, time, duration, velocity) => {
        console.log('🎯 [DIVERSITY_DEBUG] Adding note:', { pitch, time, duration, velocity })

        // 🔧 [FIX] projectManager.addNote() は存在しないため、updateTrackMidiData() を使用
        const newNote = {
          id: `note-${Date.now()}-${Math.random()}`,
          pitch,
          time,
          duration,
          velocity
        }

        // 現在のMIDIデータを取得して新しいノートを追加
        const currentMidiData = currentTrack.midiData || { notes: [], tempo: 120, timeSignature: '4/4' }
        const updatedMidiData = {
          ...currentMidiData,
          notes: [...(currentMidiData.notes || []), newNote],
          lastModified: new Date().toISOString()
        }

        console.log('🎯 [DIVERSITY_DEBUG] Updating track MIDI data:', {
          trackId,
          noteCount: updatedMidiData.notes.length,
          newNoteId: newNote.id
        })

        projectManager.updateTrackMidiData(trackId, updatedMidiData)

        console.log('✅ [DIVERSITY_DEBUG] Note added successfully via updateTrackMidiData')
      }

      // 🎲 利用可能性チェック
      const engine = window.magentaGhostTextEngine
      const phraseSession = engine?.currentPhraseSession
      const actualPhraseNotes = phraseSession?.notes || []
      const hasPhraseNotes = phraseLocked && phraseSessionId && actualPhraseNotes.length > 0 && nextPhraseIndex < actualPhraseNotes.length
      const hasGhostPredictions = ghostPredictions.length > 0 && nextGhostIndex < ghostPredictions.length

      console.log('🔍 [DIVERSITY_DEBUG] Availability check:', {
        hasPhraseNotes,
        hasGhostPredictions,
        phraseNotesLength: actualPhraseNotes.length,
        nextPhraseIndex,
        ghostPredictionsLength: ghostPredictions.length,
        nextGhostIndex
      })

      console.log('📊 [DIVERSITY_DEBUG] Current metrics:', diversityMetricsRef)

      // 🎲 両方利用可能な場合のみ確率的選択
      let selectedSource = null
      if (hasPhraseNotes && hasGhostPredictions) {
        console.log('🎲 [DIVERSITY_DEBUG] 両方の予測が利用可能 - 確率的選択を実行')

        // 動的確率調整（単調性回避）
        let phraseWeight = 0.6
        let ghostWeight = 0.4

        if (diversityMetricsRef.consecutivePhraseCount >= 3) {
          phraseWeight = 0.3
          ghostWeight = 0.7
          console.log('🎲 [DIVERSITY_DEBUG] Diversity boost: Reducing phrase weight (3+ consecutive phrase)')
        } else if (diversityMetricsRef.consecutiveGhostCount >= 3) {
          phraseWeight = 0.7
          ghostWeight = 0.3
          console.log('🎲 [DIVERSITY_DEBUG] Diversity boost: Reducing ghost weight (3+ consecutive ghost)')
        }

        console.log('🎲 [DIVERSITY_DEBUG] 確率設定:', { phraseWeight, ghostWeight })

        const selected = weightedRandomSelect([
          { type: 'phrase', weight: phraseWeight },
          { type: 'ghost', weight: ghostWeight }
        ])

        selectedSource = selected.type

        console.log('🎲 [DIVERSITY_DEBUG] Probabilistic selection result:', {
          selected: selectedSource,
          weights: { phrase: phraseWeight, ghost: ghostWeight }
        })
      } else if (hasPhraseNotes) {
        selectedSource = 'phrase'
        console.log('🔍 [DIVERSITY_DEBUG] Only phrase available')
      } else if (hasGhostPredictions) {
        selectedSource = 'ghost'
        console.log('🔍 [DIVERSITY_DEBUG] Only ghost available')
      } else {
        console.warn('⚠️ [DIVERSITY_DEBUG] No predictions available')
        return
      }

      // 🎯 選択されたソースに基づいて承認実行
      let result
      if (selectedSource === 'phrase') {
        console.log('🎯 [DIVERSITY_DEBUG] Accepting next phrase note')
        result = acceptNextPhraseNote(notes, onNoteAdd)
        console.log('📋 [DIVERSITY_DEBUG] acceptNextPhraseNote result:', result)

        if (result.success) {
          console.log('✅ [DIVERSITY_DEBUG] Phrase note accepted successfully')
          diversityMetricsRef.phraseCount++
          diversityMetricsRef.consecutivePhraseCount++
          diversityMetricsRef.consecutiveGhostCount = 0
          diversityMetricsRef.lastSource = 'phrase'
        }
      } else if (selectedSource === 'ghost') {
        console.log('🎯 [DIVERSITY_DEBUG] Accepting next ghost note')
        result = acceptNextGhostNote(notes, onNoteAdd)
        console.log('📋 [DIVERSITY_DEBUG] acceptNextGhostNote result:', result)

        if (result.success) {
          console.log('✅ [DIVERSITY_DEBUG] Ghost note accepted successfully')
          diversityMetricsRef.ghostCount++
          diversityMetricsRef.consecutiveGhostCount++
          diversityMetricsRef.consecutivePhraseCount = 0
          diversityMetricsRef.lastSource = 'ghost'
        }
      }

      // 🎓 [TUTORIAL_FIX] チュートリアル実行中は承認イベントを発火
      const isTutorialActive = !localStorage.getItem('dawai_tutorial_completed')
      if (isTutorialActive && result && result.success) {
        console.log('🎓 [TUTORIAL_FIX] チュートリアル実行中 - tutorial:completion-acceptedイベントを発火')
        window.dispatchEvent(new CustomEvent('tutorial:completion-accepted'))
      }

      // 📊 メトリクス更新
      diversityMetricsRef.totalApprovals++

      console.log('📊 [DIVERSITY_DEBUG] Updated metrics after', selectedSource + ':', {
        phraseCount: diversityMetricsRef.phraseCount,
        ghostCount: diversityMetricsRef.ghostCount,
        consecutivePhraseCount: diversityMetricsRef.consecutivePhraseCount,
        consecutiveGhostCount: diversityMetricsRef.consecutiveGhostCount,
        totalApprovals: diversityMetricsRef.totalApprovals
      })

      // 📊 10回ごとに統計レポート
      if (diversityMetricsRef.totalApprovals % 10 === 0) {
        const phrasePercent = (diversityMetricsRef.phraseCount / diversityMetricsRef.totalApprovals * 100).toFixed(1)
        const ghostPercent = (diversityMetricsRef.ghostCount / diversityMetricsRef.totalApprovals * 100).toFixed(1)
        const repetitionRate = Math.max(diversityMetricsRef.consecutivePhraseCount, diversityMetricsRef.consecutiveGhostCount) / diversityMetricsRef.totalApprovals * 100

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📊 [DIVERSITY_STATS] 多様性統計レポート:')
        console.log(`   Phrase: ${phrasePercent}% (${diversityMetricsRef.phraseCount}回)`)
        console.log(`   Ghost: ${ghostPercent}% (${diversityMetricsRef.ghostCount}回)`)
        console.log(`   Total: ${diversityMetricsRef.totalApprovals}回承認`)
        console.log(`   Repetition: ${repetitionRate.toFixed(1)}%`)

        if (repetitionRate > 20) {
          console.warn('⚠️ [DIVERSITY_WARNING] 高い繰り返し率が検出されました (> 20%)')
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🎲 [DIVERSITY_DEBUG] accept-ghost-text-global処理完了')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }

    // グローバルイベントリスナーを登録
    document.addEventListener('accept-ghost-text-global', handleAcceptGhostText)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎯 [DIVERSITY_DEBUG] イベントリスナー登録完了（多様性統合版）')
    console.log('🎯 [DIVERSITY_DEBUG] Listener location: useGhostText.js:1118')
    console.log('🎯 [DIVERSITY_DEBUG] Event name: accept-ghost-text-global')
    console.log('🎯 [DIVERSITY_DEBUG] Target: document')
    console.log('🎯 [DIVERSITY_DEBUG] trackId:', trackId)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // 🔧 CRITICAL FIX: phraseSets状態をlocalStorageに保存（タブ切り替え対応）
    if (phraseSets.length > 0) {
      const persistenceData = {
        phraseSets,
        selectedPhraseSetIndex,
        phraseSessionId,
        phraseLocked,
        timestamp: Date.now(),
        trackId
      }
      localStorage.setItem(`ghostText_phraseSets_${trackId}`, JSON.stringify(persistenceData))
      console.log('💾 [PERSISTENCE] phraseSets状態をlocalStorageに保存:', {
        phraseSetsCount: phraseSets.length,
        selectedIndex: selectedPhraseSetIndex,
        trackId
      })
    }

    // クリーンアップ関数
    return () => {
      document.removeEventListener('accept-ghost-text-global', handleAcceptGhostText)
      console.log('🎯 [DIVERSITY_DEBUG] イベントリスナー削除完了 (trackId:', trackId, ')')
    }
  }, [trackId, acceptNextPhraseNote, acceptNextGhostNote, undoLastGhostApproval, phraseLocked, phraseSessionId, nextPhraseIndex, nextGhostIndex, ghostPredictions]) // 🔧 依存関係を明確に指定

  return {
    // 状態
    ghostTextEnabled,
    ghostPredictions,
    phraseNotes, // 🔧 Problem 3修正: フレーズ予測をreturnに追加（v1.0.0互換）
    phraseSession: (() => {
      const session = window.magentaGhostTextEngine?.currentPhraseSession
      if (phraseNotes?.length > 0) {
        console.log('🔍 [HOOK_PHRASE_DEBUG] useGhostText returning session:', {
          hasSession: !!session,
          baseTime: session?.baseTime,
          sessionId: session?.id,
          phraseNotesCount: phraseNotes?.length
        })
      }
      return session
    })(), // 🚨 [CRITICAL_FIX] phraseSessionを返す
    showGhostText,
    ghostTextSettings,
    ghostTextStatus,
    performanceMetrics,
    currentModel,
    modelStatus,

    // 🆕 v2.0.0: フレーズセット状態
    phraseSets,                 // 3つのフレーズセット
    selectedPhraseSetIndex,     // 選択中のセットインデックス
    currentNoteIndex,           // セット内の承認済み位置

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
    selectNextGhostCandidate,   // 🔴 [NEW] Issue #147: Ghost候補を次に切り替え
    selectPrevGhostCandidate,   // 🔴 [NEW] Issue #147: Ghost候補を前に切り替え
    selectNextPhraseCandidate,  // 🔴 [NEW] Issue #147: フレーズ候補を次に切り替え
    selectPrevPhraseCandidate,  // 🔴 [NEW] Issue #147: フレーズ候補を前に切り替え
    clearGhostPredictions,
    processMidiInput,
    generateTestPrediction,
    changeModel,

    // 🆕 v2.0.0: Getterメソッド
    getCurrentPhraseSet,        // 選択中のフレーズセット取得
    getCurrentNote,             // 選択中セットの現在ノート取得
    getNextNote,                // 選択中セットの次ノート取得

    // 🆕 v2.0.0: フレーズセット切り替え関数
    selectNextPhraseSet,        // 次のフレーズセットに切り替え
    selectPrevPhraseSet,        // 前のフレーズセットに切り替え

    // Tracking states (Issue #146)
    nextGhostIndex,             // 🔴 [NEW] Index of next ghost note to approve
    nextPhraseIndex,            // 🔴 [NEW] Index of next phrase note to approve
    approvalHistory,            // 🔴 [NEW] Approval history for undo
    lastApprovalSource,         // 🔴 [NEW] Track source of last approval

    // Phrase session states
    phraseLocked,               // 🔴 NEW: フレーズロック状態
    phraseSessionId             // 🔴 NEW: フレーズセッションID
    // Note: phraseSession は行1314-1325で既に定義されている（IIFE形式、デバッグログ付き）
  }

  // 🔧 [CRITICAL_FIX] windowオブジェクトへのエクスポート（デバッグ用）
  // 🚀 [FORCE RELOAD] 強制HMR更新実行中...

  // 🎯 [EXISTING_NOTES_FIX] phraseSets → ghostPredictions 変換処理
  const convertedGhostPredictions = useMemo(() => {
    console.log('🔧 [USEMEMO_DEBUG] 変換処理開始:', {
      phraseSetsLength: phraseSets?.length || 0,
      selectedPhraseSetIndex: selectedPhraseSetIndex,
      phraseSetsType: Array.isArray(phraseSets),
      indexValid: selectedPhraseSetIndex >= 0 && selectedPhraseSetIndex < (phraseSets?.length || 0)
    })

    if (phraseSets?.length > 0 && selectedPhraseSetIndex >= 0 && selectedPhraseSetIndex < phraseSets.length) {
      const currentPhraseSet = phraseSets[selectedPhraseSetIndex]
      console.log('🎯 [EXISTING_NOTES_FIX] phraseSets → ghostPredictions 変換:', {
        phraseSetsLength: phraseSets.length,
        selectedPhraseSetIndex: selectedPhraseSetIndex,
        currentPhraseSetLength: currentPhraseSet?.length || 0,
        currentPhraseSetType: Array.isArray(currentPhraseSet),
        firstNote: currentPhraseSet?.[0],
        convertedType: 'phraseSet_to_ghostPredictions'
      })
      return currentPhraseSet || []
    } else {
      console.log('🎯 [EXISTING_NOTES_FIX] ghostPredictions フォールバック使用:', {
        phraseSetsLength: phraseSets?.length || 0,
        selectedPhraseSetIndex: selectedPhraseSetIndex,
        ghostPredictionsLength: ghostPredictions?.length || 0,
        convertedType: 'original_ghostPredictions'
      })
      return ghostPredictions || []
    }
  }, [phraseSets, selectedPhraseSetIndex, ghostPredictions])

  const hookData = {
    ghostTextEnabled,
    ghostPredictions: convertedGhostPredictions,
    phraseNotes,
    phraseSets,
    selectedPhraseSetIndex, phraseLocked, phraseSessionId,
    acceptNextPhraseNote, selectNextPhraseSet, selectPrevPhraseSet,
    // 🔧 [FIX] Ghost Text表示機能を追加 (実際に実装されている関数のみ)
    showGhostText: showGhostText,                    // state変数
    toggleShowGhostText: toggleShowGhostText,        // function (695行)
    acceptGhostPrediction: acceptGhostPrediction,    // function (758行)
    acceptAllGhostPredictions: acceptAllGhostPredictions,  // function (789行)
    acceptAllPhrasePredictions: acceptAllPhrasePredictions, // function (824行)
    clearGhostPredictions: clearGhostPredictions,    // function (1568行)
    selectNextPhraseCandidate: selectNextPhraseCandidate,  // function (1364行)
    selectPrevPhraseCandidate: selectPrevPhraseCandidate,  // function (1383行)
    getCurrentPhraseSet: getCurrentPhraseSet,        // function (1507行)
    getCurrentNote: getCurrentNote,                  // function (1527行)
    getNextNote: getNextNote,                       // function (1548行)
    toggleGhostText: toggleGhostText,               // function (670行)
    updateGhostTextSettings: updateGhostTextSettings, // function (705行)
    changeModel: changeModel,                       // function (713行)
    processMidiInput: processMidiInput,             // function (1576行)
    generateTestPrediction: generateTestPrediction   // function (1583行)
  }

  // 🔧 [FIX_TAB_APPROVAL] 初回マウント時のwindow.ghostTextHook設定（空配列で確実に実行）
  useEffect(() => {
    console.log('🔧 [CRITICAL_FORCE] useGhostText useEffect 初回実行（マウント時のみ）', {
      phraseSetsLength: phraseSets?.length || 0,
      phraseNotesLength: phraseNotes?.length || 0,
      ghostPredictionsLength: ghostPredictions?.length || 0,
      ghostTextEnabled,
      timestamp: new Date().toISOString()
    })

    // 🚨 [TEMPORARY_FIX] MagentaGhostTextEngineがイベントを発信していない問題の暫定対応
    if ((phraseSets?.length || 0) === 0 && (ghostPredictions?.length || 0) === 0) {
      console.log('🔧 [TEMP_FIX] 空のデータを検出、テストデータを設定します')

      // テスト用のフレーズセットデータ
      const testPhraseSets = [
        [
          {time: 0, pitch: 60, duration: 0.5, velocity: 100}, // C4
          {time: 0.5, pitch: 62, duration: 0.5, velocity: 100}, // D4
          {time: 1, pitch: 64, duration: 0.5, velocity: 100}, // E4
        ],
        [
          {time: 0, pitch: 67, duration: 0.5, velocity: 100}, // G4
          {time: 0.5, pitch: 69, duration: 0.5, velocity: 100}, // A4
          {time: 1, pitch: 71, duration: 0.5, velocity: 100}, // B4
        ]
      ];

      // テスト用のゴーストプレディクション
      const testGhostPredictions = [
        {time: 0, pitch: 65, duration: 0.25, velocity: 80}, // F4
        {time: 0.5, pitch: 67, duration: 0.25, velocity: 80}, // G4
      ];

      console.log('🔧 [TEMP_FIX] テストデータ設定中...', {
        phraseSetsCount: testPhraseSets.length,
        ghostPredictionsCount: testGhostPredictions.length
      });

      // stateを更新
      setPhraseSets(testPhraseSets);
      setGhostPredictions(testGhostPredictions);
      setSelectedPhraseSetIndex(0);
      setPhraseLocked(true);
      setPhraseSessionId('temp-test-session-' + Date.now());
    }

    // 初回マウント時にwindowオブジェクトを設定
    window.ghostTextHook = hookData
    window.phrasePredictions = phraseSets

    console.log('🔧 [CRITICAL_FORCE] window.ghostTextHook エクスポート完了（初回マウント）', {
      windowObjectSet: !!window.ghostTextHook,
      phrasePredictionsSet: !!window.phrasePredictions,
      hookDataKeys: Object.keys(hookData)
    })

    /*
    // debugSystem.log('HOOK', 'WINDOW', 'INFO', '🔧 window.ghostTextHook 初回設定完了', {
      phraseSetsLength: phraseSets?.length || 0,
      hookExported: true
    })
    */
  }, []) // 🔧 空配列で初回マウント時のみ実行

  // 🔧 [FIX_TAB_APPROVAL] データ更新時のwindow.ghostTextHook同期（依存配列あり）
  useEffect(() => {
    console.log('🔧 [DATA_SYNC] useGhostText データ更新検出', {
      phraseSetsLength: phraseSets?.length || 0,
      phraseNotesLength: phraseNotes?.length || 0,
      ghostPredictionsLength: ghostPredictions?.length || 0,
      ghostTextEnabled,
      timestamp: new Date().toISOString()
    })

    // データ更新時にwindowオブジェクトを同期
    window.ghostTextHook = hookData
    window.phrasePredictions = phraseSets

    console.log('🔧 [DATA_SYNC] window.ghostTextHook 更新完了', {
      windowObjectSet: !!window.ghostTextHook,
      phrasePredictionsSet: !!window.phrasePredictions
    })

    /*
    // debugSystem.log('HOOK', 'WINDOW', 'INFO', '🔧 window.ghostTextHook データ同期完了', {
      phraseSetsLength: phraseSets?.length || 0,
      hookExported: true
    })
    */
  }, [phraseSets, ghostPredictions]) // 🔧 最小限の依存（タブ切り替え時の頻繁な実行を防止）

  // 元のuseEffect（依存配列をログ出力）
  useEffect(() => {
    console.log('🔧 [DEPENDENCY_CHECK] useEffect依存配列チェック', {
      phraseSets_exists: !!phraseSets,
      phraseSets_length: phraseSets?.length || 0,
      phraseNotes_exists: !!phraseNotes,
      phraseNotes_length: phraseNotes?.length || 0,
      ghostPredictions_exists: !!ghostPredictions,
      ghostPredictions_length: ghostPredictions?.length || 0
    })
  }, [phraseSets, phraseNotes, ghostPredictions])

  return hookData
}

export default useGhostText
