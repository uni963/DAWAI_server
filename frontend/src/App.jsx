import { useState, useEffect, useCallback, useMemo } from 'react'
import Header from './components/Header.jsx'
import TabBar from './components/TabBar.jsx'
import ArrangementView from './components/ArrangementView.jsx'
import EnhancedMidiEditor from './components/EnhancedMidiEditor.jsx'
import DrumTrack from './components/DrumTrack/DrumTrack.jsx'
import DiffSingerTrack from './components/DiffSingerTrack.jsx'
import { AIAssistantChatBox } from './components/AIAssistantChatBox.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import Mixer from './components/Mixer.jsx'
import ProjectMenu from './components/ProjectMenu.jsx'
import GenreSelector from './components/GenreSelector.jsx'
import SmartSuggestionOverlay from './components/SmartSuggestionOverlay.jsx'
import SimpleTutorial from './components/UserGuide/SimpleTutorial.jsx'
import audioExportEngine from './utils/audioExportEngine.js'
import cacheManager from './utils/cacheManager.js'
import frameRateMonitor from './utils/frameRateMonitor.js'
import performanceMonitor from './utils/performanceMonitor.js'
import virtualizationManager from './utils/virtualization.js'
import aiAgentEngine from './utils/aiAgentEngine.js'
import drumTrackManager from './utils/drumTrackManager.js'
import { createDrumData } from './utils/drumTrackDataStructure.js'
import genreManager from './managers/GenreManager.js'
import demoSongManager from './managers/DemoSongManager.js'
import smartSuggestionEngine from './engines/SmartSuggestionEngine.js'
import { MUSIC_GENRES, SCALE_DEFINITIONS } from './utils/musicTheory/MusicTheorySystem.js'
import './App.css'
import { setupPianoTest } from './utils/pianoTest'
import { setupDrumTest } from './utils/drumTest'
import './utils/debugAudio.js'
import unifiedAudioSystem from './utils/unifiedAudioSystem.js'
import { SAMPLE_PROJECT_DATA, SAMPLE_PROJECT_WELCOME_MESSAGE } from './data/sampleData.js'
import { TRACK_TYPES, TRACK_SUBTYPES, TRACK_COLORS, TAB_TYPES } from './constants/trackTypes.js'
import { createTrack, createTab, createProject } from './factories/projectFactory.js'
import ProjectManager from './classes/ProjectManager.js'
import AppSettingsManager from './classes/AppSettingsManager.js'
import EventHandlersManager from './classes/EventHandlersManager.js'
// カスタムフックのインポート
import useDevTools from './hooks/useDevTools.js'
import useSystemInitialization from './hooks/useSystemInitialization.js'
import useBackgroundAudioPreload from './hooks/useBackgroundAudioPreload.js'
import useEventHandlers from './hooks/useEventHandlers.js'
import useAudioTrackEffects from './hooks/useAudioTrackEffects.js'
// Phase 1 - Step 2: 大型イベントハンドラーのカスタムフック
import useTabManagement from './hooks/useTabManagement.js'
import useGenreManagement from './hooks/useGenreManagement.js'
import useSuggestionManagement from './hooks/useSuggestionManagement.js'
import useMixerManagement from './hooks/useMixerManagement.js'
// import GlobalMouseDebugger from './components/GlobalMouseDebugger.jsx'  // デバッグ用 - 無限ループの原因のため無効化



// ===== アプリケーションコンポーネント =====
const App = () => {
  // AppSettingsManager インスタンス
  const [appSettingsManager] = useState(() => new AppSettingsManager())
  const [appSettings, setAppSettings] = useState(appSettingsManager.getSettings())

  // プロジェクトマネージャーのインスタンス
  const [projectManager] = useState(() => new ProjectManager())

  // プロジェクト状態
  const [project, setProject] = useState(projectManager.getProject())
  const [tracks, setTracks] = useState(projectManager.getTracks())
  const [tabs, setTabs] = useState(projectManager.getTabs())
  const [activeTab, setActiveTab] = useState(projectManager.getActiveTab())

  // グローバルBPM管理
  const [globalTempo, setGlobalTempo] = useState(projectManager.getProject()?.settings?.tempo || 120)

  // 強制再レンダリング用の状態
  const [forceRerender, setForceRerender] = useState(0)

  // AIアシスタント折りたたみ状態（早期初期化）
  const [isAIAssistantCollapsed, setIsAIAssistantCollapsed] = useState(() => {
    // localStorageから折りたたみ状態を復元、デフォルトはtrue（折りたたみ状態）
    const saved = localStorage.getItem('dawai_ai_assistant_collapsed')
    return saved !== null ? JSON.parse(saved) : true
  })

  // ジャンル・Demo Song機能の状態
  const [genreContext, setGenreContext] = useState(projectManager.getGenreContext())
  const [demoSongMetadata, setDemoSongMetadata] = useState(projectManager.getDemoSongMetadata())
  const [showGenreSelector, setShowGenreSelector] = useState(false)
  const [smartSuggestionsEnabled, setSmartSuggestionsEnabled] = useState(true)
  const [suggestionAggressiveness, setSuggestionAggressiveness] = useState(0.5)

  // 音楽理論設定の状態管理
  const [musicTheorySettings, setMusicTheorySettings] = useState({
    scaleConstraintEnabled: false,
    selectedGenre: null,
    selectedScales: [],
    selectedScale: 'major',
    rootNote: 'C'
  })

  // グローバルAI設定の状態管理
  const [globalAISettings, setGlobalAISettings] = useState(() => {
    // localStorageから設定を復元
    try {
      const saved = localStorage.getItem('dawai_global_ai_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        console.log('🔥 [CRITICAL FIX] App.jsx: localStorageからAI設定を復元:', parsed)
        return parsed
      }
    } catch (error) {
      console.error('❌ Failed to load AI settings from localStorage:', error)
    }

    // デフォルト値
    return {
      aiModel: 'magenta',  // Default
      // 🔧 Phase 2修正: ghostTextEnabledを削除（appSettings.midiEditor.ghostTextEnabledに統一）
      summaryStatus: { lastUpdated: null, needsUpdate: false },
      predictionSettings: {
        autoPredict: true,
        predictionDelay: 100,
        ghostNoteOpacity: 0.5
      }
    }
  })

  // 🔧 アプリ設定の更新関数 (AppSettingsManager使用) - 初期化順序問題修正
  const updateAppSettings = useCallback((newSettings, isPartialUpdate = false) => {
    if (appSettingsManager.updateSettings(newSettings, isPartialUpdate)) {
      // AppSettingsManagerで更新成功後、ローカル状態も更新
      setAppSettings(appSettingsManager.getSettings())
    }
  }, [appSettingsManager])

  // デバッグ: tabs stateの変更を監視
  useEffect(() => {
    console.log('🔧 APP TABS STATE CHANGED:', tabs.length, 'tabs:', tabs.map(t => `${t.id}(${t.title})`))
    console.log('🔧 APP TABS STATE: full array:', tabs)
  }, [tabs])

  // デバッグ: globalAISettings stateの変更を監視
  useEffect(() => {
    console.log('🤖 APP GLOBAL AI SETTINGS STATE CHANGED:', globalAISettings)
    console.log('🤖 AI Model:', globalAISettings.aiModel)
    // 🔧 Phase 2修正: ghostTextEnabledはappSettings.midiEditor.ghostTextEnabledから取得
    console.log('🤖 Ghost Text Enabled:', appSettings?.midiEditor?.ghostTextEnabled)
    console.log('🤖 Summary Status:', globalAISettings.summaryStatus)
    console.log('🤖 Prediction Settings:', globalAISettings.predictionSettings)
  }, [globalAISettings, appSettings?.midiEditor?.ghostTextEnabled])

  // 🔥 FIX: globalAISettings.aiModelの変更をappSettings.midiEditor.currentModelに同期
  useEffect(() => {
    if (globalAISettings.aiModel &&
        appSettings?.midiEditor?.currentModel !== globalAISettings.aiModel &&
        typeof updateAppSettings === 'function') {
      console.log('🔄 [AI SYNC] Synchronizing globalAISettings.aiModel to appSettings:', {
        from: appSettings?.midiEditor?.currentModel,
        to: globalAISettings.aiModel
      })

      updateAppSettings({
        midiEditor: {
          ...appSettings.midiEditor,
          currentModel: globalAISettings.aiModel
          // 🔧 Phase 2修正: ghostTextEnabledの同期を削除（appSettings.midiEditorが唯一の真実の源）
        }
      }, true) // 🔧 部分更新フラグを追加

      console.log('✅ [AI SYNC] AI model synchronization completed')
    }
  }, [globalAISettings.aiModel, appSettings?.midiEditor?.currentModel])

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        if (showGenreSelector) {
          setShowGenreSelector(false)
        }
      }
    }

    // モーダルが開いている場合のみイベントリスナーを追加
    if (showGenreSelector) {
      window.addEventListener('keydown', handleEscKey)
      return () => {
        window.removeEventListener('keydown', handleEscKey)
      }
    }
  }, [showGenreSelector])

  // AIアシスタント折りたたみ状態をlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('dawai_ai_assistant_collapsed', JSON.stringify(isAIAssistantCollapsed))
  }, [isAIAssistantCollapsed])

  // setTabsのラッパー関数 - EventHandlersManager用の詳細監視
  // 🔧 FIX: クロージャー問題を修正 - 依存配列から`tabs`を削除し、関数型更新を使用
  // 🚀 IMMEDIATE UPDATE FIX: 即座に状態を反映させるため、flushSyncを使用
  const setTabsWithDebug = useCallback((newTabs) => {
    console.log('🚀 setTabsWithDebug CALLED! newTabs:', newTabs?.length, 'tabs')
    console.log('🚀 setTabsWithDebug: Tab IDs:', newTabs?.map(t => `${t.id}(${t.title})`))
    console.log('🚀 setTabsWithDebug: Stack trace:', new Error().stack?.split('\n').slice(1, 4).join('\n'))

    // 🚀 FIX: 即座に状態を更新してレンダリングを強制実行
    // React 18のバッチング機能を無効化し、即座に状態を反映
    setTabs(newTabs)

    // デバッグログで状態の即座更新を確認
    console.log('🚀 setTabsWithDebug: Tabs updated IMMEDIATELY to:', newTabs.length, 'tabs')
    console.log('🚀 setTabsWithDebug: Expected render with new tabs')

    // 非同期で結果を確認
    setTimeout(() => {
      console.log('🚀 setTabsWithDebug: State verification after 10ms')
    }, 10)
  }, [])  // 🔧 FIX: 依存配列を空にして、setTabsWithDebugが再作成されないようにする

  // EventHandlersManager インスタンス（依存関係を注入）
  const [eventHandlersManager] = useState(() => new EventHandlersManager({
    projectManager,
    appSettingsManager,
    setProject,
    setTracks,
    setTabs: setTabsWithDebug,
    setActiveTab,
    setGlobalTempo,
    setForceRerender,
    setGenreContext,
    setDemoSongMetadata,
    setMusicTheorySettings,
    setAppSettings,
    setShowGenreSelector,
    setSmartSuggestionsEnabled,
    setSuggestionAggressiveness
  }))

  // 基本状態定義（カスタムフック呼び出し前に配置）
  const [isPlaying, setIsPlaying] = useState(false)
  const [messages, setMessages] = useState([
    { id: 1, sender: 'assistant', text: 'こんにちは！音楽制作のお手伝いをします。何か作りたい曲のイメージはありますか？', timestamp: new Date().toISOString() },
    { id: 2, sender: 'user', text: '悲しいピアノのメロディを作ってください', timestamp: new Date().toISOString() },
    { id: 3, sender: 'assistant', text: 'わかりました。Cマイナーキーで、ゆっくりとしたテンポの悲しいピアノメロディを生成しますね。', timestamp: new Date().toISOString() }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      name: '現在のセッション',
      date: new Date().toISOString(),
      messages: []
    }
  ])
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // 🔧 Phase 2修正: 重複ghostTextEnabled状態を削除（appSettings.midiEditor.ghostTextEnabledに統一）

  // UI状態
  const [mixerWidth, setMixerWidth] = useState(160) // 200から160に縮小
  const [isMixerResizing, setIsMixerResizing] = useState(false)
  const [activeSettingsSection, setActiveSettingsSection] = useState("general")
  // isAIAssistantCollapsedは上部で早期初期化済み

  // マスターボリューム状態
  const [masterVolume, setMasterVolume] = useState(100)

  // トラック音量とミュート状態（オブジェクト形式で各トラックIDをキーとする）
  const [trackVolumeState, setTrackVolumeState] = useState({})
  const [trackMutedState, setTrackMutedState] = useState({})

  const [showTrackMenu, setShowTrackMenu] = useState(false)
  const [aiPanelWidth, setAiPanelWidth] = useState(320) // 450から320に縮小
  const [isResizing, setIsResizing] = useState(false)
  const [chatMode, setChatMode] = useState("agent")
  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const [isMixerCollapsed, setIsMixerCollapsed] = useState(false)

  // チュートリアル状態管理
  const [showTutorial, setShowTutorial] = useState(() => {
    // 初回起動時のみチュートリアルを表示
    const completed = localStorage.getItem('dawai_tutorial_completed')
    return !completed
  })

  // === カスタムフック呼び出し ===
  // 開発・デバッグツール管理
  useDevTools({
    appSettingsManager,
    eventHandlersManager,
    projectManager
  })

  // システム初期化管理
  const {
    isFullyInitialized,
    hasErrors,
    initializationErrors
  } = useSystemInitialization(projectManager)

  // バックグラウンド音声プリロード管理（ユーザーインタラクション後）
  const { preloadInitiated, userInteractionDetected } = useBackgroundAudioPreload()

  // イベントハンドラー管理
  useEventHandlers({
    projectManager,
    eventHandlersManager,
    appSettings,
    menuStates: {
      showProjectMenu,
      setShowProjectMenu,
      showTrackMenu,
      setShowTrackMenu
    }
  })

  // オーディオ・トラック効果管理
  const {
    isAudioReady,
    audioSystemStatus,
    audioLevels
  } = useAudioTrackEffects({
    tracks,
    masterVolume
  })

  // === Phase 1 - Step 2: 大型イベントハンドラーのカスタムフック ===

  // タブ管理
  const {
    handleTabChange,
    closeTab
  } = useTabManagement({
    projectManager,
    eventHandlersManager,
    tabs,
    tracks,
    activeTab,
    setActiveTab,
    globalTempo
  })

  // ジャンル・Demo Song管理
  const {
    handleGenreSelect,
    handleDemoSongLoad
  } = useGenreManagement({
    projectManager,
    eventHandlersManager,
    setGenreContext,
    setDemoSongMetadata,
    setMusicTheorySettings,
    setGlobalAISettings,
    setShowGenreSelector
  })

  // スマートサジェスチョン管理
  const {
    handleSuggestionAccept,
    handleSuggestionReject
  } = useSuggestionManagement({
    eventHandlersManager,
    tabs,
    tracks,
    activeTab
  })

  // ミキサー管理
  const {
    updateMixerChannels,
    updateMasterVolume,
    getMixerChannels
  } = useMixerManagement({
    projectManager,
    eventHandlersManager,
    trackVolumeState,
    setTrackVolumeState,
    trackMutedState,
    setTrackMutedState,
    masterVolume,
    setMasterVolume
  })

  // 🔧 修正3: useMemoを削除し、ProjectManagerのキャッシュ機構に任せる
  // ProjectManager.getMixerChannels()内部で既にキャッシュ管理が実装されているため、
  // useMemoの二重キャッシュは不安定性を生む原因となる
  // getMixerChannels()を直接呼び出すことで、より正確なキャッシュ制御を実現

  // 開発時のみグローバルに公開（E2Eテスト用） - useDevToolsで管理

  // eventHandlersManager.updateProjectStateはEventHandlersManagerで管理

  // プロジェクト状態の変更を監視（初回のみ実行） - useSystemInitializationで管理

  // グローバルBPM変更ハンドラー
  // eventHandlersManager.handleGlobalTempoChangeはEventHandlersManagerで管理

  // 自動保存機能（設定に基づく） - useEventHandlersで管理

  // グローバルエラーハンドラーの設定 - useEventHandlersで管理


  // フレームレート監視の開始 - useDevToolsで管理

  // プロジェクトマネージャーをグローバルにアクセス可能にする - useDevToolsで管理

  // グローバルキーボードイベントハンドラー（スペースキーで再生/停止） - useEventHandlersで管理



  // ページ離脱時の保存 - useEventHandlersで管理

  // タブ切り替えハンドラー - useTabManagement.jsで管理

  // トラック追加ハンドラー
  // eventHandlersManager.addNewTrackはEventHandlersManagerで管理

  // コピーペースト機能ハンドラー
  const copyTrack = useCallback((trackId) => {
    console.log('App: copyTrack called with:', { trackId })
    return projectManager.copyTrack(trackId)
  }, [projectManager])

  const pasteTrack = useCallback(() => {
    console.log('App: pasteTrack called')
    const newTrack = projectManager.pasteTrack()
    if (newTrack) {
      eventHandlersManager.updateProjectState()
      console.log('App: Track pasted:', newTrack.name)
      return newTrack
    }
    return null
  }, [projectManager, eventHandlersManager.updateProjectState])

  // トラック削除ハンドラー（EventHandlersManagerで管理）
  // eventHandlersManager.removeTrackを直接使用

  // トラック更新ハンドラー（EventHandlersManagerで管理）
  // eventHandlersManager.updateTrackを直接使用

  // MIDIデータ更新ハンドラー（EventHandlersManagerで管理）
  // eventHandlersManager.updateTrackMidiDataを直接使用

  // ドラムデータ更新ハンドラー（EventHandlersManagerで管理）
  // eventHandlersManager.updateTrackDrumDataを直接使用

  // タブ削除ハンドラー - useTabManagement.jsで管理

  // ===== 音楽理論設定のイベントハンドラー =====

  // 音楽理論設定変更ハンドラー
  const handleMusicTheorySettingsChange = useCallback((setting, value) => {
    console.log('🎼 音楽理論設定変更:', setting, value)
    setMusicTheorySettings(prev => ({
      ...prev,
      [setting]: value
    }))
  }, [])

  // AI設定変更ハンドラー
  const handleAISettingsChange = useCallback((setting, value) => {
    console.log('🔥 [CRITICAL FIX] App.jsx: AI設定変更:', { setting, value })

    // 🔧 Phase 2修正: ghostTextEnabledの場合はappSettings.midiEditorに保存
    if (setting === 'ghostTextEnabled') {
      console.log('🔧 [Phase 2] ghostTextEnabledをappSettings.midiEditorに保存:', value)
      updateAppSettings({
        midiEditor: {
          ...appSettings.midiEditor,
          ghostTextEnabled: value
        }
      }, true)
      return
    }

    setGlobalAISettings(prev => {
      console.log('🔥 [CRITICAL FIX] App.jsx: 変更前の状態:', prev)
      const newSettings = {
        ...prev,
        [setting]: value
      }
      console.log('🔥 [CRITICAL FIX] App.jsx: 変更後の状態:', newSettings)

      // localStorageにも保存して永続化
      try {
        localStorage.setItem('dawai_global_ai_settings', JSON.stringify(newSettings))
        console.log('🔥 [CRITICAL FIX] App.jsx: AI設定をlocalStorageに保存完了')
      } catch (error) {
        console.error('❌ Failed to save AI settings to localStorage:', error)
      }

      return newSettings
    })

    console.log('🔥 [CRITICAL FIX] App.jsx: AI設定変更処理完了')
  }, [appSettings, updateAppSettings])

  // ===== ジャンル・Demo Song機能のイベントハンドラー =====

  // ジャンル選択ハンドラー - useGenreManagement.jsで管理

  // Demo Song読み込みハンドラー - useGenreManagement.jsで管理

  // スマートサジェスチョン採用ハンドラー - useSuggestionManagement.jsで管理

  // サジェスチョン却下ハンドラー - useSuggestionManagement.jsで管理

  // ミキサーチャンネル更新ハンドラー - useMixerManagement.jsで管理

  // マスターボリューム更新ハンドラー - useMixerManagement.jsで管理

  // 初期化時にマスターボリュームを設定 - useAudioTrackEffectsで管理

  // 初期化時に既存トラックの音量情報を状態に設定 - useAudioTrackEffectsで管理

  // 後方互換性のため、addNewTabをeventHandlersManager.addNewTrackのエイリアスとして保持
  const addNewTab = useCallback((trackType = 'piano', keepInArrangement = false) => {
    console.log('App: addNewTab called with:', { trackType, keepInArrangement })

    // トラックタイプのマッピング
    const trackTypeMap = {
      'midi': { type: TRACK_TYPES.MIDI, subtype: TRACK_SUBTYPES.PIANO },
      'piano': { type: TRACK_TYPES.MIDI, subtype: TRACK_SUBTYPES.PIANO },     // 追加：明示的なpianoマッピング
      'bass': { type: TRACK_TYPES.MIDI, subtype: TRACK_SUBTYPES.BASS },       // 🔧 FIX: Bassトラック追加バグ修正
      'drum': { type: TRACK_TYPES.DRUMS, subtype: TRACK_SUBTYPES.DRUMS },
      'drums': { type: TRACK_TYPES.DRUMS, subtype: TRACK_SUBTYPES.DRUMS },    // 追加：統一性のため
      'diffsinger': { type: TRACK_TYPES.DIFFSINGER, subtype: TRACK_SUBTYPES.DIFFSINGER }
    }

    const mappedType = trackTypeMap[trackType] || { type: TRACK_TYPES.MIDI, subtype: TRACK_SUBTYPES.PIANO }

    // TabBarから呼ばれる場合は通常のトラック追加（新しいタブを開く）
    // ArrangementViewから呼ばれる場合はkeepInArrangement=trueが渡される
    return eventHandlersManager.addNewTrack(mappedType.type, mappedType.subtype, keepInArrangement)
  }, [eventHandlersManager.addNewTrack])

  // トラック操作の便利関数
  const toggleTrackMute = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId)
    if (track) {
      eventHandlersManager.updateTrack(trackId, { muted: !track.muted })
    }
  }, [tracks, eventHandlersManager.updateTrack])

  const toggleTrackSolo = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId)
    if (track) {
      eventHandlersManager.updateTrack(trackId, { solo: !track.solo })
    }
  }, [tracks, eventHandlersManager.updateTrack])

  const toggleTrackArm = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId)
    if (track) {
      eventHandlersManager.updateTrack(trackId, { armed: !track.armed })
    }
  }, [tracks, eventHandlersManager.updateTrack])

  const setTrackVolume = useCallback((trackId, volume) => {
    eventHandlersManager.updateTrack(trackId, { volume: Math.max(0, Math.min(100, volume)) })
  }, [eventHandlersManager.updateTrack])

  const setTrackPan = useCallback((trackId, pan) => {
    eventHandlersManager.updateTrack(trackId, { pan: Math.max(-100, Math.min(100, pan)) })
  }, [eventHandlersManager.updateTrack])

  // ミキサーチャンネルを取得する関数 - useMixerManagement.jsで管理

  // 包括的な設定管理
  const [globalSettings, setGlobalSettings] = useState(null)

  // 設定の初期化と読み込み - useSystemInitializationで管理

  // グローバル設定の更新関数
  const updateGlobalSettings = useCallback((newSettings) => {
    setGlobalSettings(newSettings)

    // localStorageにも保存
    try {
      localStorage.setItem('dawai_ai_settings', JSON.stringify(newSettings))
    } catch (error) {
      console.error('App: Failed to save AI settings to localStorage:', error)
    }
  }, [])

  // アプリ設定の更新関数 (AppSettingsManager使用) - 関数定義順序問題修正済み

  // AudioEngineとRecordingEngineの初期化 - useSystemInitializationで管理

  // Close project menu when clicking outside - useEventHandlersで管理

  // プロジェクト読み込みイベントをリッスン - useEventHandlersで管理

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        sender: 'user',
        text: newMessage,
        timestamp: new Date().toISOString()
      }
      setMessages([...messages, message])
      const currentMessage = newMessage
      setNewMessage('')

      try {
        // FastAPI バックエンドにリクエストを送信
        const response = await fetch('/ai/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentMessage,
            context: messages.slice(-5).map(m => `${m.sender}: ${m.text}`).join('\n')
          })
        })

        const data = await response.json()

        const aiResponse = {
          id: messages.length + 2,
          sender: 'assistant',
          text: data.success ? data.response : 'エラーが発生しました。しばらく時間をおいて再度お試しください。',
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, aiResponse])

      } catch (error) {
        console.error('API Error:', error)
        const errorResponse = {
          id: messages.length + 2,
          sender: 'assistant',
          text: 'ネットワークエラーが発生しました。接続を確認してください。',
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, errorResponse])
      }
    }
  }

  // melodiaファイルのエクスポート
  const exportMelodiaFile = useCallback(() => {
    try {
      const projectData = projectManager.exportAsMelodiaFile()

      // JSONをBlobに変換
      const jsonString = JSON.stringify(projectData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })

      // ファイル名を生成
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const fileName = `${projectData.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.melodia`

      // ダウンロード
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)


    } catch (error) {
      console.error('Failed to export melodia file:', error)
      alert('ファイルのエクスポートに失敗しました')
    }
  }, [projectManager])

  // melodiaファイルのインポート
  const importMelodiaFile = useCallback(async (file) => {
    try {
      const fileContent = await file.text()
      const projectData = JSON.parse(fileContent)

      const importedProject = projectManager.importFromMelodiaFile(projectData)
      eventHandlersManager.updateProjectState()


      return importedProject
    } catch (error) {
      console.error('Failed to import melodia file:', error)
      alert('ファイルのインポートに失敗しました')
      throw error
    }
  }, [projectManager, eventHandlersManager.updateProjectState])

  // 強制再レンダリング関数
  const forceRerenderApp = useCallback(() => {
    setForceRerender(prev => prev + 1)

    // プロジェクト状態も強制的に再読み込み
    // requestIdleCallbackは削除 - React Hooksのルール違反を回避
    if (projectManager) {
      const currentProject = projectManager.getProject()
      setProject(currentProject)
      setTracks(currentProject.tracks)
      setTabs(currentProject.tabs)
    }
  }, [projectManager])

  // チュートリアルハンドラー
  const handleStartTutorial = useCallback(() => {
    setShowTutorial(true)
  }, [])

  const handleCompleteTutorial = useCallback(() => {
    setShowTutorial(false)
    console.log('✅ チュートリアル完了')
  }, [])

  const handleSkipTutorial = useCallback(() => {
    setShowTutorial(false)
    console.log('⏭️ チュートリアルスキップ')
  }, [])

  // プロジェクト情報をメモ化
  const projectInfo = useMemo(() => ({
    name: projectManager?.getProject()?.name || 'Current Project',
    tempo: globalTempo,
    key: projectManager?.getProject()?.settings?.key || 'C',
    timeSignature: projectManager?.getProject()?.settings?.timeSignature || '4/4',
    currentTime: window.unifiedAudioSystem?.getCurrentTime() || 0,
    totalDuration: window.unifiedAudioSystem?.getTotalDuration() || 0,
    isPlaying: isPlaying,
    tracksCount: tracks.length,
    activeTab: activeTab
  }), [projectManager, globalTempo, isPlaying, tracks.length, activeTab])

  // 既存トラック情報をメモ化
  const existingTracks = useMemo(() => tracks.map(track => ({
    id: track.id,
    name: track.name,
    type: track.type,
    color: track.color,
    volume: track.volume,
    pan: track.pan,
    muted: track.muted,
    solo: track.solo,
    midiData: track.midiData,
    metadata: track.metadata
  })), [tracks])

  // ... 既存の状態定義の直後に追加 ...
  const [enginesInitialized, setEnginesInitialized] = useState(false)
  // ... 既存のコード ...

  // ピアノテスト機能とドラムテスト機能のセットアップ - useSystemInitializationで管理

  // 音声システムの初期化 - useSystemInitializationで管理

  // AI Agent からの MIDI データ変更イベントをリッスン
  useEffect(() => {
    const handleAiAgentMidiDataChanged = (event) => {
      console.log('🎵 App: AI Agent MIDI data changed event received:', event.detail)

      // ProjectManager から最新のトラックデータを取得
      const updatedTracks = projectManager.getTracks()

      // React の状態を更新して UI を再描画
      setTracks([...updatedTracks])

      // 強制再レンダリングをトリガー
      setForceRerender(prev => prev + 1)

      console.log('✅ App: Tracks state updated, UI should re-render')
    }

    window.addEventListener('aiAgentMidiDataChanged', handleAiAgentMidiDataChanged)

    return () => {
      window.removeEventListener('aiAgentMidiDataChanged', handleAiAgentMidiDataChanged)
    }
  }, [projectManager, setTracks, setForceRerender])

  // App.jsxの強制再レンダリングイベントリスナー（2回目以降のノート配置の修正）
  useEffect(() => {
    const handleForceRerender = (event) => {
      console.log('🔄 App: Force rerender requested:', event.detail)

      // ProjectManagerから最新のプロジェクト状態を取得
      setProject(projectManager.getProject())
      setTracks(projectManager.getTracks())
      setForceRerender(prev => prev + 1)

      console.log('✅ App: Force rerender completed, React state updated')
    }

    window.addEventListener('forceAppRerender', handleForceRerender)
    return () => window.removeEventListener('forceAppRerender', handleForceRerender)
  }, [projectManager])

  return (
    <div className="h-screen text-white flex flex-col main-container">
      {/* グローバルマウスデバッガー（開発用） - 無限ループの原因のため無効化 */}
      {/* <GlobalMouseDebugger /> */}

      {/* ヘッダー */}
      <Header
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showProjectMenu={showProjectMenu}
        setShowProjectMenu={setShowProjectMenu}
        ghostTextEnabled={appSettings?.midiEditor?.ghostTextEnabled ?? true}
        onToggleGhostText={() => {
          const currentValue = appSettings?.midiEditor?.ghostTextEnabled ?? true
          const newValue = !currentValue
          console.log('🔧 [Phase 2] Header onToggleGhostText:', currentValue, '→', newValue)
          handleAISettingsChange('ghostTextEnabled', newValue)
        }}
        onExportAudio={async () => {
          try {
            const filename = `melodia-${Date.now()}.wav`
            await audioExportEngine.exportToWav(tracks, filename)
          } catch (error) {
            console.error('Audio export failed:', error)
            alert('オーディオエクスポートに失敗しました')
          }
        }}
        onExportMidi={async () => {
          try {
            const filename = `melodia-${Date.now()}.mid`
            audioExportEngine.exportToMidi(tracks, filename)
          } catch (error) {
            console.error('MIDI export failed:', error)
            alert('MIDIエクスポートに失敗しました')
          }
        }}
        currentTime={window.unifiedAudioSystem?.getCurrentTime() || 0}
        totalDuration={window.unifiedAudioSystem?.getTotalDuration() || 0}
        formatTime={(time) => `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`}
        onOpenGenreSelector={() => setShowGenreSelector(true)}
        genreContext={genreContext}
        demoSongMetadata={demoSongMetadata}
        smartSuggestionsEnabled={smartSuggestionsEnabled}
        onToggleSmartSuggestions={(enabled) => setSmartSuggestionsEnabled(enabled)}
        suggestionAggressiveness={suggestionAggressiveness}
        onSuggestionAggressivenessChange={(value) => setSuggestionAggressiveness(value)}
        onStartTutorial={handleStartTutorial}
      />

      {/* メインコンテンツ */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左側：ミキサーパネル */}
        <div
          className="bg-gray-900/90 backdrop-blur-md border-r border-gray-700/50 flex flex-col flex-shrink-0 transition-all duration-300"
          style={{ width: `${mixerWidth}px` }}
        >
          <Mixer
            mixerChannels={getMixerChannels()}
            setMixerChannels={updateMixerChannels}
            mixerWidth={mixerWidth}
            setMixerWidth={setMixerWidth}
            isMixerResizing={isMixerResizing}
            setIsMixerResizing={setIsMixerResizing}
            updateMasterVolume={updateMasterVolume}
          />
        </div>

        {/* 中央：メインDAWエリア */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* タブバー */}
          <div className="w-full overflow-hidden flex-shrink-0">
                      <TabBar
            key={`tabbar-${forceRerender}`}
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            closeTab={closeTab}
            showTrackMenu={showTrackMenu}
            setShowTrackMenu={setShowTrackMenu}
            addNewTab={addNewTab}
          />
          </div>

          {/* タブコンテンツ */}
          <div className="flex-1 overflow-hidden min-h-0">

            {activeTab === 'arrangement' && (
              <ArrangementView
                key={`arrangement-${forceRerender}`}
                tracks={tracks}
                addNewTrack={eventHandlersManager.addNewTrack}
                projectManager={projectManager}
                audioEngine={window.unifiedAudioSystem}
                updateProjectState={eventHandlersManager.updateProjectState}
                forceRerenderApp={forceRerenderApp}
                onTabChange={handleTabChange}
                globalTempo={globalTempo}
                onGlobalTempoChange={eventHandlersManager.handleGlobalTempoChange}
                copyTrack={copyTrack}
                pasteTrack={pasteTrack}
                trackVolume={trackVolumeState}
                trackMuted={trackMutedState}
                masterVolume={masterVolume}
                musicTheorySettings={musicTheorySettings}
                onMusicTheorySettingsChange={handleMusicTheorySettingsChange}
                globalAISettings={{
                  ...globalAISettings,
                  ghostTextEnabled: appSettings?.midiEditor?.ghostTextEnabled ?? true
                }}
                onAISettingsChange={handleAISettingsChange}
              />
            )}
            {(activeTab.startsWith('tab-') || activeTab.startsWith('instrument-') || activeTab.startsWith('voiceSynth-') || activeTab.startsWith('diffsinger-')) && (() => {
              const currentTab = tabs.find(tab => tab.id === activeTab)
              const currentTrack = tracks.find(track => track.id === currentTab?.trackId)

              if (currentTab?.type === TAB_TYPES.MIDI_EDITOR && currentTrack) {
                // デバッグ用：音量情報をログ出力
                console.log('App: Passing volume info to Enhanced Midi Editor:', {
                  trackId: currentTrack.id,
                  trackVolumeState: trackVolumeState,
                  trackMutedState: trackMutedState,
                  trackVolume: trackVolumeState[currentTrack.id] !== undefined ? trackVolumeState[currentTrack.id] : 75,
                  trackMuted: trackMutedState[currentTrack.id] || false,
                  masterVolume: masterVolume
                })

                return (
                  <EnhancedMidiEditor
                    key={`midi-editor-${currentTrack.subtype || 'piano'}`}
                    trackId={currentTrack.id}
                    trackType={currentTrack.subtype || 'piano'}
                    trackName={currentTrack.name || 'Unknown Track'}
                    trackColor={currentTrack.color || 'blue'}
                    midiData={currentTrack.midiData || { notes: [], tempo: globalTempo, timeSignature: '4/4' }}
                    onMidiDataUpdate={(midiData) => eventHandlersManager.updateTrackMidiData(currentTrack.id, midiData)}
                    onNoteAdd={(note) => {
                      const currentMidiData = currentTrack.midiData || { notes: [], tempo: globalTempo, timeSignature: '4/4' }
                      const updatedMidiData = {
                        ...currentMidiData,
                        notes: [...(currentMidiData.notes || []), note],
                        lastModified: new Date().toISOString()
                      }
                      eventHandlersManager.updateTrackMidiData(currentTrack.id, updatedMidiData)
                    }}
                    onNoteRemove={(noteId) => {
                      const currentMidiData = currentTrack.midiData || { notes: [], tempo: globalTempo, timeSignature: '4/4' }
                      const updatedMidiData = {
                        ...currentMidiData,
                        notes: (currentMidiData.notes || []).filter(note => note.id !== noteId),
                        lastModified: new Date().toISOString()
                      }
                      eventHandlersManager.updateTrackMidiData(currentTrack.id, updatedMidiData)
                    }}
                    onNoteEdit={(noteId, changes) => {
                      const currentMidiData = currentTrack.midiData || { notes: [], tempo: globalTempo, timeSignature: '4/4' }
                      const updatedMidiData = {
                        ...currentMidiData,
                        notes: (currentMidiData.notes || []).map(note =>
                          note.id === noteId ? { ...note, ...changes } : note
                        ),
                        lastModified: new Date().toISOString()
                      }
                      eventHandlersManager.updateTrackMidiData(currentTrack.id, updatedMidiData)
                    }}
                    isActive={(currentTrack.subtype || 'piano') === 'piano' ? true : (activeTab.startsWith('tab-') || activeTab.startsWith('instrument-') || activeTab.startsWith('voiceSynth-') || activeTab.startsWith('diffsinger-'))}
                    onOpenSettings={() => {
                      setShowSettings(true)
                      setActiveSettingsSection('midiEditor')
                    }}
                    appSettings={appSettings}
                    globalTempo={globalTempo}
                    onGlobalTempoChange={eventHandlersManager.handleGlobalTempoChange}
                    projectManager={projectManager}
                    trackVolume={trackVolumeState[currentTrack.id] !== undefined ? trackVolumeState[currentTrack.id] : 75}
                    trackMuted={trackMutedState[currentTrack.id] || false}
                    masterVolume={masterVolume}
                    musicTheorySettings={musicTheorySettings}
                    onMusicTheorySettingsChange={handleMusicTheorySettingsChange}
                    globalAISettings={{
                      ...globalAISettings,
                      ghostTextEnabled: appSettings?.midiEditor?.ghostTextEnabled ?? true
                    }}
                    onAISettingsChange={handleAISettingsChange}
                  />
                )
              }

              // Diffsingerトラックの処理
              if (currentTab?.type === TAB_TYPES.DIFFSINGER_TRACK && currentTrack) {
                return (
                  <DiffSingerTrack
                    key={`diffsinger-track-${currentTrack.id}`}
                    trackId={currentTrack.id}
                    trackName={currentTrack.name}
                    trackColor={currentTrack.color}
                    midiData={currentTrack.midiData}
                    onMidiDataUpdate={(midiData) => {
                      eventHandlersManager.updateTrackMidiData(currentTrack.id, midiData)
                    }}
                    isActive={true}
                    appSettings={appSettings}
                    globalTempo={globalTempo}
                    onGlobalTempoChange={eventHandlersManager.handleGlobalTempoChange}
                    trackVolume={trackVolumeState[currentTrack.id] !== undefined ? trackVolumeState[currentTrack.id] : 75}
                    trackMuted={trackMutedState[currentTrack.id] || false}
                    masterVolume={masterVolume}
                    projectManager={projectManager}
                  />
                )
              }

              // ドラムトラックの処理（重複レンダリングを防ぐ）
              if (currentTab?.type === TAB_TYPES.DRUM_TRACK && currentTrack) {
                return (
                  <DrumTrack
                    key={`drum-track-${currentTrack.id}`}
                    trackId={currentTrack.id}
                    trackName={currentTrack.name || 'Drums Track'}
                    trackColor={currentTrack.color || '#3B82F6'}
                    drumData={currentTrack.drumData || { grid: [], instruments: [], tempo: globalTempo, timeSignature: '4/4' }}
                    onDrumDataUpdate={(drumData) => eventHandlersManager.updateTrackDrumData(currentTrack.id, drumData)}
                    isActive={activeTab.startsWith('tab-') || activeTab.startsWith('instrument-') || activeTab.startsWith('voiceSynth-') || activeTab.startsWith('diffsinger-')}
                    onOpenSettings={() => {
                      setShowSettings(true)
                      setActiveSettingsSection('drumTrack')
                    }}
                    appSettings={appSettings}
                    globalTempo={globalTempo}
                    onGlobalTempoChange={eventHandlersManager.handleGlobalTempoChange}
                    projectManager={projectManager}
                  />
                )
              }

              return (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No track found for this tab</p>
                </div>
              )
            })()}
          </div>
        </div>

        {/* 右側：AIチャット/エージェントパネル */}
        <div
          className="flex-shrink-0 transition-all duration-300"
          style={{ width: isAIAssistantCollapsed ? '48px' : `${aiPanelWidth}px` }}
        >
          <AIAssistantChatBox
            isAIAssistantCollapsed={isAIAssistantCollapsed}
            setIsAIAssistantCollapsed={setIsAIAssistantCollapsed}
            aiPanelWidth={aiPanelWidth}
            setAiPanelWidth={setAiPanelWidth}
            isResizing={isResizing}
            setIsResizing={setIsResizing}
            currentTrack={tracks.find(track => track.id === activeTab?.replace('midi-', ''))}
            globalSettings={globalSettings}
            updateGlobalSettings={updateGlobalSettings}
            projectInfo={projectInfo}
            existingTracks={existingTracks}
            chatMode={chatMode}
            setChatMode={setChatMode}
            messages={messages}
            setMessages={setMessages}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            chatHistory={chatHistory}
            showChatHistory={showChatHistory}
            setShowChatHistory={setShowChatHistory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onApplyGeneration={(result) => {
              // Handle the generation result here
            }}
          />
        </div>
      </div>

      {/* ジャンル選択UI */}
      {showGenreSelector && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[99999999] flex items-center justify-center"
          onClick={() => setShowGenreSelector(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl max-h-screen overflow-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">🎵 ジャンル選択</h2>
              <button
                onClick={() => setShowGenreSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <GenreSelector
                onGenreSelect={handleGenreSelect}
                onDemoSongLoad={handleDemoSongLoad}
                onClose={() => setShowGenreSelector(false)}
                currentGenreId={genreContext?.genre?.id}
              />
            </div>
          </div>
        </div>
      )}

      {/* スマートサジェスチョンオーバーレイ */}
      {/* 🎹 Piano track編集中のみ表示（DEMO SONG読み込み時は非表示） */}
      {smartSuggestionsEnabled && genreContext && (() => {
        const currentTab = tabs.find(tab => tab.id === activeTab)
        // Piano track (MIDIエディタ) 編集中のみサジェスチョンを表示
        return currentTab && currentTab.type === TAB_TYPES.MIDI_EDITOR
      })() && (
        <SmartSuggestionOverlay
          genreContext={genreContext}
          currentNotes={(() => {
            const currentTab = tabs.find(tab => tab.id === activeTab)
            const currentTrack = tracks.find(track => track.id === currentTab?.trackId)
            return currentTrack?.midiData?.notes || []
          })()}
          currentPosition={0} // 簡略化：実際の再生位置を取得する実装が必要
          currentTrackType={(() => {
            const currentTab = tabs.find(tab => tab.id === activeTab)
            const currentTrack = tracks.find(track => track.id === currentTab?.trackId)
            return currentTrack?.type || 'midi'
          })()}
          isEnabled={smartSuggestionsEnabled}
          aggressiveness={suggestionAggressiveness}
          showGhostNotes={false}
          onSuggestionAccept={handleSuggestionAccept}
          onSuggestionReject={handleSuggestionReject}
        />
      )}

      {/* プロジェクトメニュー */}
      <ProjectMenu
        showProjectMenu={showProjectMenu}
        setShowProjectMenu={setShowProjectMenu}
        tracks={tracks}
        projectManager={projectManager}
        onExportMelodia={exportMelodiaFile}
        onImportMelodia={importMelodiaFile}
      />

      {/* 設定画面 */}
      <SettingsModal
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        activeSettingsSection={activeSettingsSection}
        setActiveSettingsSection={setActiveSettingsSection}
        globalSettings={globalSettings}
        updateGlobalSettings={updateGlobalSettings}
        appSettings={appSettings}
        updateAppSettings={updateAppSettings}
      />

      {/* チュートリアル */}
      {showTutorial && (
        <SimpleTutorial
          onComplete={handleCompleteTutorial}
          onSkip={handleSkipTutorial}
        />
      )}
    </div>
  )
}

export default App

