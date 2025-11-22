/*
 * EnhancedMidiEditor - MIDI Editor Component
 * 
 * 重要: メニュー表示時の注意点
 * - コンテキストメニュー（コピー/カット/削除）とPasteメニューは必ずsetTimeoutで10ms遅延させて表示する
 * - 理由: setSelectedNotes()などの状態更新の直後にメニューを表示すると、再描画処理でメニューが隠される
 * - 例: setTimeout(() => { showContextMenu(e, note, ids) }, 10)
 * - 例: setTimeout(() => { showPasteMenu(e, time, pitch) }, 10)
 * 
 * メニュー作成時の必須設定:
 * - menu.tabIndex = -1
 * - menu.addEventListener('mousedown', e => e.preventDefault())
 * - menu.addEventListener('mouseup', e => e.preventDefault())
 * - menu.addEventListener('contextmenu', e => e.preventDefault())
 */


import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { Badge } from './ui/badge.jsx'
import { Slider } from './ui/slider.jsx'
import { Button } from './ui/button.jsx'
import {
  Lightbulb,
  AlertTriangle
} from 'lucide-react'
import MidiEditorToolbar from './MIDIEditor/MidiEditorToolbar.jsx'
import MidiEditorStatusBar from './MIDIEditor/MidiEditorStatusBar.jsx'
import MidiEditorCanvas from './MIDIEditor/MidiEditorCanvas.jsx'
import MidiEditorEventHandlers from './MIDIEditor/MidiEditorEventHandlers.jsx'
import useMidiPersistence from '../hooks/useMidiPersistence.js'
import useMidiAudio from '../hooks/useMidiAudio.js'
import { useBassAudio } from '../hooks/useBassAudio.js'
import useMidiNoteOperations from '../hooks/useMidiNoteOperations.js'
import useMidiEditorState from '../hooks/useMidiEditorState.js'
import useGhostText from '../hooks/useGhostText.js'
import useInstrumentSettings from '../hooks/useInstrumentSettings.js'
import InstrumentSettingsPanel from './MIDIEditor/InstrumentSettingsPanel.jsx'
import AudioInitializationProgress from './ui/AudioInitializationProgress.jsx'
import { getMidiNoteFromKeyCode, calculateOptimalOctave } from '../utils/keyboardShortcuts.js'


// メトロノーム定数
const METRONOME_FREQUENCY = 800 // Hz
const METRONOME_DURATION = 0.1 // 秒

const EnhancedMidiEditor = ({
  trackId,
  trackType = 'piano',
  trackName = 'Unknown Track',
  trackColor = 'blue',
  midiData,
  onMidiDataUpdate,
  onNoteAdd,
  onNoteRemove,
  onNoteEdit,
  isActive = true,
  onOpenSettings,
  appSettings,
  globalTempo = 120,
  onGlobalTempoChange,
  trackVolume = 75,
  trackMuted = false,
  masterVolume = 100,
  musicTheorySettings = {
    scaleConstraintEnabled: false,
    selectedGenre: null,
    selectedScales: [],
    rootNote: 'C'
  },
  onMusicTheorySettingsChange,
  hideHeader = false,
  embedded = false,
  loopEnabled: externalLoopEnabled,
  onLoopChange: externalOnLoopChange
}) => {
  // 音量情報の受け取りをログ出力（重複を防ぐため条件付きで出力）
  const prevVolumeInfoRef = useRef({ trackVolume, trackMuted, masterVolume })
  if (prevVolumeInfoRef.current.trackVolume !== trackVolume ||
      prevVolumeInfoRef.current.trackMuted !== trackMuted ||
      prevVolumeInfoRef.current.masterVolume !== masterVolume) {
    console.log('🎵 Enhanced Midi Editor: Received volume props:', {
      trackId,
      trackVolume,
      trackMuted,
      masterVolume
    })
    prevVolumeInfoRef.current = { trackVolume, trackMuted, masterVolume }
  }
  // 🔧 [STABILITY_FIX] コンポーネントのマウント/アンマウント検出
  // 🆕 Phase 0: マウント確認用詳細ログ
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[MODULE:MidiEditor] [PHASE:Init] EnhancedMidiEditor マウント開始', {
      componentName: 'EnhancedMidiEditor',
      mounted: true,
      trackId: trackId,
      trackName: trackName,
      isActive: isActive,
      timestamp: Date.now()
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[MODULE:MidiEditor] [PHASE:Cleanup] EnhancedMidiEditor アンマウント', {
        componentName: 'EnhancedMidiEditor',
        unmounted: true,
        trackId: trackId,
        timestamp: Date.now()
      })
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }
  }, [trackId, trackName, isActive])


  // 状態管理フックの使用
  const state = useMidiEditorState(trackId)

  // 外部からのloopEnabled設定を内部stateに同期
  useEffect(() => {
    if (externalLoopEnabled !== undefined && externalLoopEnabled !== state.loopEnabled) {
      state.setLoopEnabled(externalLoopEnabled);
    }
  }, [externalLoopEnabled]);

  // グローバルBPMを状態に反映
  useEffect(() => {
    console.log('🎵 Global tempo useEffect triggered:', {
      globalTempo,
      stateTempo: state.tempo
    })
    if (globalTempo !== state.tempo) {
      console.log('🎵 Updating tempo from', state.tempo, 'to', globalTempo)
      state.setTempo(globalTempo)
    }
  }, [globalTempo, state.tempo]) // 🔧 修正: state全体ではなくstate.tempoのみ依存
  
  // トラック別データの永続化用Ref
  const trackDataRef = useRef({})
  const lastSavedRef = useRef({})
  const lastParentUpdateRef = useRef({}) // 親コンポーネントへの最後の更新時刻を記録
  
  // 初期化時に再生ヘッドを表示するため、強制的に再描画
  useEffect(() => {
    console.log('🎵 Redraw useEffect triggered')
    state.setNeedsRedraw(true)
  }, []) // 🔧 修正: 初期化時のみ実行、stateを依存関係から削除
  
  // 永続化フックの使用
  const persistence = useMidiPersistence()
  
  // オーディオフックの使用 - trackTypeに基づいて適切な音源を選択
  const pianoAudio = useMidiAudio()
  const bassAudioHook = useBassAudio()

  // trackTypeに基づいて音源を選択
  const audio = useMemo(() => {
    if (trackType === 'bass') {
      return {
        // 基本再生メソッド
        playNote: (midiNote, velocity = 0.8, duration = 0.25) => {
          return bassAudioHook.playBassNote(midiNote, Math.round(velocity * 127))
        },
        playScheduledNote: async (midiNote, startTime, duration, velocity = 100) => {
          // Bass音源は即座に再生（スケジューリング未対応）
          return bassAudioHook.playBassNote(midiNote, velocity)
        },
        noteOn: (midiNote, velocity = 0.8, duration = 2.0) => {
          return bassAudioHook.playBassNote(midiNote, Math.round(velocity * 127))
        },
        noteOff: (midiNote) => {
          bassAudioHook.stopBassNote(midiNote)
        },
        stopAllNotes: () => {
          bassAudioHook.stopAllBassNotes()
        },
        stopAllSounds: () => {
          bassAudioHook.stopAllBassNotes()
        },

        // 初期化・制御メソッド
        initializeAudio: async () => {
          // Bass音源は初期化不要（useBassAudioで自動初期化）
          return bassAudioHook.isLoaded
        },
        stopAudio: () => {
          bassAudioHook.stopAllBassNotes()
        },
        cleanup: () => {
          bassAudioHook.stopAllBassNotes()
        },

        // 音量・設定メソッド（ダミー実装）
        setInstrument: (instrument) => {
          // Bass音源では楽器変更は不要
        },
        setVolume: (volume) => {
          bassAudioHook.setBassVolume(volume)
        },
        setMasterVolume: (volume) => {
          // マスターボリュームは統一音声システムで管理
        },
        setMetronomeVolume: (volume) => {
          // Bass音源ではメトロノーム不要
        },
        setExternalVolumeInfo: (trackVolume, trackMuted, masterVolume) => {
          if (trackMuted) {
            bassAudioHook.setBassVolume(0)
          } else {
            bassAudioHook.setBassVolume(trackVolume / 100)
          }
        },

        // メトロノーム機能（ダミー実装）
        playMetronomeClick: () => {
          // Bass音源ではメトロノーム不要
        },
        startMetronome: (bpm) => {
          // Bass音源ではメトロノーム不要
        },
        stopMetronome: () => {
          // Bass音源ではメトロノーム不要
        },

        // 状態取得メソッド
        getAudioState: () => {
          return {
            initialized: bassAudioHook.isLoaded,
            playing: false,
            volume: bassAudioHook.bassSettings?.volume || 0.8
          }
        },
        getCurrentTime: () => {
          return bassAudioHook.getCurrentTime() // Bass音源の実際の現在時間を返す
        },
        isAudioContextAvailable: () => {
          return bassAudioHook.isLoaded
        },

        // 内部参照（互換性のため）
        isInitializedRef: { current: bassAudioHook.isLoaded },
        trackIdRef: { current: trackId }
      }
    } else {
      // デフォルトはピアノ音源
      return pianoAudio
    }
  }, [trackType, pianoAudio, bassAudioHook, trackId])
  
  // ノート操作フックの使用
  const noteOperations = useMidiNoteOperations(state.notes, state.setNotes, trackId, state.isInitialized, persistence, state.currentTime, state.selectedNotes, state.setSelectedNotes)
  
  // Ghost Textフックの使用
  console.log('🚨 [GHOST_TEXT_HOOK_CALL] useGhostText フック呼び出し開始', { trackId, appSettingsExists: !!appSettings })
  const ghostText = useGhostText(trackId, appSettings, state.notes)
  console.log('🚨 [GHOST_TEXT_HOOK_CALL] useGhostText フック呼び出し完了', {
    ghostTextReturned: !!ghostText,
    ghostTextEnabled: ghostText?.ghostTextEnabled,
    phraseSetsLength: ghostText?.phraseSets?.length || 0
  })

  // 🔧 [FIX] hasPredictionsの計算をuseMemoで安定化 - window.ghostTextHook変更対応
  const hasPredictions = useMemo(() => {
    // useGhostTextフックの同期問題を回避し、window.ghostTextHookを直接参照
    const windowHook = window.ghostTextHook;

    let hasGhost = false;
    let hasPhrase = false;

    if (windowHook) {
      // window.ghostTextHookのデータを使用
      hasGhost = (windowHook.ghostPredictions?.length || 0) > 0;
      hasPhrase = (windowHook.phraseSets?.length || 0) > 0 &&
                 (windowHook.phraseSets[windowHook.selectedPhraseSetIndex || 0]?.length || 0) > 0;
    } else {
      // フォールバック: ghostTextフックのデータを使用
      hasGhost = (ghostText.ghostPredictions?.length || 0) > 0;
      hasPhrase = (ghostText.phraseSets?.length || 0) > 0 &&
                 (ghostText.phraseSets[ghostText.selectedPhraseSetIndex || 0]?.length || 0) > 0;
    }

    const finalResult = hasGhost || hasPhrase;

    // デバッグログ
    console.log('🔍 [MEMO_FIXED] hasPredictions計算（フレーズ切り替え対応版）:', {
      'windowHook_exists': !!windowHook,
      'windowHook.ghostPredictions?.length': windowHook?.ghostPredictions?.length || 0,
      'windowHook.phraseSets?.length': windowHook?.phraseSets?.length || 0,
      'windowHook.selectedPhraseSetIndex': windowHook?.selectedPhraseSetIndex || 0,
      hasGhost,
      hasPhrase,
      'final_result': finalResult
    })

    return finalResult;
  }, [
    ghostText.ghostPredictions,
    ghostText.phraseSets,
    ghostText.selectedPhraseSetIndex,
    // 🔧 [CRITICAL_FIX] フレーズ切り替えボタンバグ修正
    // window.ghostTextHookの変更も検知するため、
    // ghostTextの更新をトリガーとして使用
    ghostText.phraseLocked,  // フレーズ切り替え時に変更される
    ghostText.phraseSessionId  // フレーズセッション変更時に変更される
  ])

  // 音色設定フックの使用
  const instrumentSettings = useInstrumentSettings(trackId)

  // デバッグ: trackIdとinstrumentSettingsの状態をログ出力
  console.log('🔧 Debug EnhancedMidiEditor:', {
    trackId,
    trackType,
    isActive,
    showSettingsPanel: instrumentSettings.showSettingsPanel,
    openSettingsPanelExists: !!instrumentSettings.openSettingsPanel
  })

  // 音楽理論設定変更ハンドラ（App.jsxから渡された関数を使用）
  const handleMusicTheorySettingsChange = useCallback((setting, value) => {
    console.log('🎼 Music Theory Setting Changed:', setting, value)
    if (onMusicTheorySettingsChange) {
      onMusicTheorySettingsChange(setting, value)
    }
  }, [onMusicTheorySettingsChange])

  // 音楽理論設定の同期確認
  useEffect(() => {
    console.log('🎼 EnhancedMidiEditor: Music Theory Settings Updated:', musicTheorySettings)
  }, [musicTheorySettings])

  // 🎨 Phase 3: GhostRenderer Canvas統合（修正版 - TDZエラー回避）
  // dynamicCanvasRefが利用可能になったらGhostRendererに設定
  useEffect(() => {
    // TDZ回避：refの存在チェックをeffect内で行い、依存配列には含めない
    const canvas = dynamicCanvasRef?.current
    const ghostRenderer = ghostText?.ghostRendererRef?.current

    if (ghostRenderer && canvas) {
      console.log('🎨 [Phase 3] Initializing GhostRenderer with dynamicCanvas')

      console.log('🎨 [Phase 3] Canvas found:', {
        width: canvas.width,
        height: canvas.height,
        hasContext: !!canvas.getContext('2d')
      })

      // GhostRendererにCanvasを設定
      ghostRenderer.initialize(canvas)

      // MIDIエディタの座標変換関数を設定
      ghostRenderer.midiEditor = {
        timeToX: (time) => {
          // coordinateTransforms.timeToXを使用
          const x = time * GRID_WIDTH * state.zoom + PIANO_WIDTH - state.scrollX
          return x
        },
        pitchToY: (pitch) => {
          // coordinateTransforms.pitchToYを使用
          const keyIndex = TOTAL_KEYS - 1 - (pitch - OCTAVE_RANGE[0] * 12)
          const y = HEADER_HEIGHT + keyIndex * GRID_HEIGHT - state.scrollY
          return y
        },
        currentTime: state.currentTime || 0,
        noteHeight: NOTE_HEIGHT
      }

      console.log('🎨 [Phase 3] GhostRenderer initialized with Canvas and coordinate transforms')
    }
  }, [state.zoom, state.scrollX, state.scrollY, state.currentTime, ghostText]) // TDZ回避：refを依存配列から除外

  // 元のMIDIデータを保持
  const [originalMidiData, setOriginalMidiData] = useState(null)
  
  // 削除処理の重複実行を防ぐためのフラグ
  const isDeletingRef = useRef(false)
  
  // 再生状態の管理用Ref（状態の不整合を防ぐため）
  const isPlayingRef = useRef(false)
  
  // キーボードピアノ機能用の状態
  const [activeKeys, setActiveKeys] = useState(new Set())
  const [manualOctaveOffset, setManualOctaveOffset] = useState(0) // 手動オクターブ調整値
  const [liveRecordingNotes, setLiveRecordingNotes] = useState(new Map()) // ライブ録音中のノート
  
  // 現在のノート状態を参照するためのRef
  const currentNotesRef = useRef([])

  // キーボード入力用の音の管理
  const keyboardAudioRef = useRef(new Map()) // keyCode -> { noteId, startTime }

  // コールバック関数の安定化用Ref（依存配列の変更を防ぐ）
  const onNoteAddRef = useRef(onNoteAdd)
  const onNoteEditRef = useRef(onNoteEdit)
  const audioRef = useRef(audio)
  const trackIdRef = useRef(trackId)

  // 🎯 FIX: 頻繁に変更される値のための安定したRef（キーボードイベントリスナーの再登録を防ぐ）
  const stateRef = useRef()
  const activeKeysRef = useRef()
  const liveRecordingNotesRef = useRef()

  // Refを最新の値で更新
  useEffect(() => {
    onNoteAddRef.current = onNoteAdd
    onNoteEditRef.current = onNoteEdit
    audioRef.current = audio
    trackIdRef.current = trackId
    stateRef.current = state
    activeKeysRef.current = activeKeys
    liveRecordingNotesRef.current = liveRecordingNotes
  }, [onNoteAdd, onNoteEdit, audio, trackId, state, activeKeys, liveRecordingNotes])

  // ライブ録音中のノートのリアルタイム更新
  useEffect(() => {
    if (!state.isPlaying || liveRecordingNotes.size === 0) return

    console.log(`🎹 Starting live recording update for ${liveRecordingNotes.size} notes`)

    const updateInterval = setInterval(() => {
      let hasUpdates = false

      // 🎯 修正: 実時間ベースで長さを計算（既存ノート再生と独立）
      const now = Date.now()

      // 現在のノート状態を取得
      const currentNotes = currentNotesRef.current

      // ライブ録音中のノートの長さをリアルタイムで更新
      const updatedNotes = currentNotes.map(note => {
        const recordingData = Array.from(liveRecordingNotes.values()).find(data => data.noteId === note.id)
        if (recordingData) {
          // 実時間経過から長さを計算（再生中のcurrentTimeとは独立）
          const elapsedMs = now - recordingData.startTimestamp
          const newDuration = Math.max(0.1, elapsedMs / 1000)
          if (newDuration > note.duration) {
            hasUpdates = true
            console.log(`🎹 Updating live note duration: ${note.id} (pitch: ${note.pitch}) -> ${newDuration.toFixed(2)}s`)
            return {
              ...note,
              duration: newDuration
            }
          }
        }
        return note
      })

      if (hasUpdates) {
        state.setNotes(updatedNotes)
        currentNotesRef.current = updatedNotes
        state.setNeedsRedraw(true) // 再描画を要求
      }
    }, 16) // 16ms間隔で更新（60fps）

    return () => {
      clearInterval(updateInterval)
      console.log('🎹 Stopped live recording update')
    }
  }, [state.isPlaying, liveRecordingNotes])

  // 巻き戻し機能（永続化フック使用）（refから取得）
  const undoLastAction = useCallback(() => {
    if (!trackId || !stateRef.current?.isInitialized) return

    const previousState = persistence.restoreFromHistory('undo')

    if (previousState) {
      // ディープコピーで確実に分離
      const previousStateCopy = previousState.map(note => ({ ...note }))
      stateRef.current.setNotes(previousStateCopy)

      // データを永続化
      trackDataRef.current[trackId] = [...previousStateCopy]
      lastSavedRef.current[trackId] = Date.now()
      persistence.saveNotes(previousStateCopy, trackId)

      stateRef.current.setSelectedNotes(new Set())
      stateRef.current.setNeedsRedraw(true)
    }
  }, [trackId, persistence])

  // やり直し機能（永続化フック使用）（refから取得）
  const redoLastAction = useCallback(() => {
    if (!trackId || !stateRef.current?.isInitialized) return

    const nextState = persistence.restoreFromHistory('redo')

    if (nextState) {
      // ディープコピーで確実に分離
      const nextStateCopy = nextState.map(note => ({ ...note }))
      stateRef.current.setNotes(nextStateCopy)

      // データを永続化
      trackDataRef.current[trackId] = [...nextStateCopy]
      lastSavedRef.current[trackId] = Date.now()
      persistence.saveNotes(nextStateCopy, trackId)

      stateRef.current.setSelectedNotes(new Set())
      stateRef.current.setNeedsRedraw(true)
    }
  }, [trackId, persistence])

  // 🔧 [STABILITY_FIX] キーボードイベント処理用のRefを作成（安定した参照を保持）
  const isActiveRef = useRef(isActive)
  useEffect(() => {
    isActiveRef.current = isActive
    console.log('🔍 [STABILITY_DEBUG] isActive updated in ref:', isActive)
  }, [isActive])

  // 🔧 [KEYBOARD_FIX] handleKeyDown/handleKeyUpのRef化（安定した参照を保証）
  const handleKeyDownRef = useRef(null)
  const handleKeyUpRef = useRef(null)

  // シンプルなキーボードイベント処理
  const handleKeyDown = useCallback((event) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`🎹 [KEYDOWN_DEBUG] KeyDown detected: ${event.code}`)
    console.log(`🎹 [KEYDOWN_DEBUG] isActiveRef.current: ${isActiveRef.current}`)
    console.log(`🎹 [KEYDOWN_DEBUG] Event target:`, event.target)
    console.log(`🎹 [KEYDOWN_DEBUG] audioRef.current exists:`, !!audioRef.current)
    console.log(`🎹 [KEYDOWN_DEBUG] stateRef.current.audioEnabled:`, stateRef.current?.audioEnabled)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // 🔴 TABキーは専用リスナー（L737-788）で処理するため除外

      // アンドゥ・リドゥのキーボードショートカット（最優先処理）
      if (event.ctrlKey && event.code === 'KeyZ' && !event.shiftKey) {
        event.preventDefault()
        event.stopPropagation()
        undoLastAction()
        console.log('🔄 Undo triggered by Ctrl+Z')
        return
      }

      if (event.ctrlKey && (event.code === 'KeyY' || (event.code === 'KeyZ' && event.shiftKey))) {
        event.preventDefault()
        event.stopPropagation()
        redoLastAction()
        console.log('🔄 Redo triggered by Ctrl+Y or Ctrl+Shift+Z')
        return
      }

      // 🔴 [NEW] Issue #147: ↑/↓キーによる候補切り替え処理
      // Ghost Text有効時は↑/↓キーを候補切り替えに使用
      // 🔍 [ARROW_KEY_DEBUG] Arrow key detection check
      if ((event.code === 'ArrowUp' || event.key === 'ArrowUp' ||
           event.code === 'ArrowDown' || event.key === 'ArrowDown')) {
        console.log('🔍 [ARROW_KEY_DEBUG] Arrow key detected:', {
          code: event.code,
          key: event.key,
          ghostTextEnabled: ghostText.ghostTextEnabled,
          conditionWillPass: ghostText.ghostTextEnabled === true
        })
      }

      if ((event.code === 'ArrowUp' || event.key === 'ArrowUp' ||
           event.code === 'ArrowDown' || event.key === 'ArrowDown') &&
          ghostText.ghostTextEnabled) {
        // 入力フィールドフォーカス時はスキップ
        const focusedElement = document.activeElement
        if (focusedElement && (
          focusedElement.tagName === 'INPUT' ||
          focusedElement.tagName === 'TEXTAREA' ||
          focusedElement.contentEditable === 'true'
        )) {
          console.log('🔄 [CANDIDATE_NAV_ISSUE147] 入力フィールドフォーカス中、候補切り替えをスキップ')
          return
        }

        event.preventDefault()

        // 🔍 [PHRASE_SET_DEBUG] デバッグ: phraseSetsの状態確認
        console.log('🔍 [PHRASE_SET_DEBUG] Arrow key pressed:', {
          key: event.code,
          phraseSetsExists: !!ghostText.phraseSets,
          phraseSetsLength: ghostText.phraseSets?.length || 0,
          selectedPhraseSetIndex: ghostText.selectedPhraseSetIndex,
          phraseLockedExists: !!ghostText.phraseLocked,
          phraseNotesLength: ghostText.phraseNotes?.length || 0,
          ghostPredictionsLength: ghostText.ghostPredictions?.length || 0,
          allGhostTextKeys: Object.keys(ghostText)
        })

        // 🆕 v2.0.0: フレーズセットが利用可能な場合は優先的にセット切り替え
        console.log('🔍 [PHRASE_FLOW] Phase 3 START: 上下キー処理開始', {
          phraseSetsLength: ghostText.phraseSets?.length || 0,
          phraseLocked: ghostText.phraseLocked,
          phraseNotesLength: ghostText.phraseNotes?.length || 0
        })
        if (ghostText.phraseSets && ghostText.phraseSets.length > 0) {
          console.log('🔍 [PHRASE_FLOW] Phase 3.1: v2.0.0モード - フレーズセット切り替え')
          if (event.code === 'ArrowUp' || event.key === 'ArrowUp') {
            console.log('⬆️ [KEYBOARD_PHRASE_SET] ArrowUp: フレーズセットを前に切り替え')
            ghostText.selectPrevPhraseSet()
          } else {
            console.log('⬇️ [KEYBOARD_PHRASE_SET] ArrowDown: フレーズセットを次に切り替え')
            ghostText.selectNextPhraseSet()
          }
          // チュートリアル用イベント発火: フレーズが切り替えられた
          window.dispatchEvent(new CustomEvent('tutorial:phrase-switched'))
        }
        // フォールバック: v1.0.0互換 - フレーズロック中はフレーズ候補を優先
        else if (ghostText.phraseLocked && ghostText.phraseNotes && ghostText.phraseNotes.length > 0) {
          console.log('🔍 [PHRASE_FLOW] Phase 3.2: v1.0.0互換モード - フレーズ内ノート切り替え')
          if (event.code === 'ArrowUp' || event.key === 'ArrowUp') {
            console.log('⬆️ [KEYBOARD_ISSUE147] ArrowUp: フレーズ候補を前に切り替え（v1.0.0互換）')
            ghostText.selectPrevPhraseCandidate()
          } else {
            console.log('⬇️ [KEYBOARD_ISSUE147] ArrowDown: フレーズ候補を次に切り替え（v1.0.0互換）')
            ghostText.selectNextPhraseCandidate()
          }
        } else if (ghostText.ghostPredictions && ghostText.ghostPredictions.length > 0) {
          if (event.code === 'ArrowUp' || event.key === 'ArrowUp') {
            console.log('⬆️ [KEYBOARD_ISSUE147] ArrowUp: Ghost候補を前に切り替え')
            ghostText.selectPrevGhostCandidate()
          } else {
            console.log('⬇️ [KEYBOARD_ISSUE147] ArrowDown: Ghost候補を次に切り替え')
            ghostText.selectNextGhostCandidate()
          }
        } else {
          console.log('🔄 [CANDIDATE_NAV_ISSUE147] 候補なし、切り替えスキップ')
        }
        return
      }

      // システムキーと矢印キーの明示的ガード（最優先で処理）
      // 🔴 TABキーはGhost Text承認処理（L2351-2378）で処理するため除外
      // 🔴 [NEW] Issue #147: ↑/↓キーはGhost Text候補切り替え処理で処理するため除外
      if (event.code === 'Escape' || event.key === 'Escape' ||
          event.code === 'F5' || event.key === 'F5' ||
          event.code === 'ArrowLeft' || event.key === 'ArrowLeft' ||
          event.code === 'ArrowRight' || event.key === 'ArrowRight' ||
          (event.ctrlKey && event.code === 'KeyR')) {
        console.log('🎹 システムキー/矢印キーを検出、MIDI処理をスキップ:', event.code)
        return; // 早期リターン、preventDefault/stopPropagationは絶対に実行しない
      }

      // MIDIエディタがアクティブでない場合は処理しない
      if (!isActiveRef.current) {
        console.log('🎹 [KEYDOWN_DEBUG] MIDIエディタが非アクティブのため、キーボード入力を無視');
        console.log('🎹 [KEYDOWN_DEBUG] isActiveRef.current:', isActiveRef.current);
        return;
      }

      // フォーカス状態チェック - MIDI Editor内にフォーカスがある場合のみ処理
      const midiEditorContainer = document.querySelector('.midi-editor-container') ||
                                  document.querySelector('[data-component="midi-editor"]')
      const focusedElement = document.activeElement
      const isFocusedInMidiEditor = midiEditorContainer &&
                                   (midiEditorContainer.contains(focusedElement) ||
                                    focusedElement === midiEditorContainer)

      // Piano Track viewがアクティブな時はフォーカスチェックを緩和
      if (!isFocusedInMidiEditor && !isActiveRef.current) {
        console.log('🎹 フォーカスがMIDIエディター外のため、キーボード入力を無視 (非アクティブタブ)')
        return;
      }

      // Piano Track viewがアクティブでフォーカスが外れている場合はログのみ（処理は続行）
      if (!isFocusedInMidiEditor && isActiveRef.current) {
        console.log('⚠️ 🎹 Piano Track view がアクティブですが、フォーカスは外れています - 処理は続行します')
      }
      
      // Q/Rキーでオクターブ調整
      if (event.code === 'KeyQ') {
        event.preventDefault(); // デフォルトの動作を防ぐ
        console.log('🔍 [DEBUG_SYSTEM] =================================');
        console.log('🔍 [DEBUG_SYSTEM] Qキー（オクターブ下げる）検出');
        console.log('🔍 [DEBUG_SYSTEM] 現在のmanualOctaveOffset:', manualOctaveOffset);
        console.log('🔍 [DEBUG_SYSTEM] =================================');
        setManualOctaveOffset(prev => {
          const newValue = Math.max(-3, prev - 1);
          console.log('🔍 [DEBUG_SYSTEM] オクターブ調整結果:', {
            old: prev,
            new: newValue,
            direction: 'down',
            limit: '[-3, +4]',
            resultingOctave: 4 + newValue
          });
          return newValue;
        }); // オクターブ1まで対応（-3拡張）
        return
      }
      if (event.code === 'KeyR') {
        event.preventDefault(); // デフォルトの動作を防ぐ
        console.log('🔍 [DEBUG_SYSTEM] =================================');
        console.log('🔍 [DEBUG_SYSTEM] Rキー（オクターブ上げる）検出');
        console.log('🔍 [DEBUG_SYSTEM] 現在のmanualOctaveOffset:', manualOctaveOffset);
        console.log('🔍 [DEBUG_SYSTEM] =================================');
        setManualOctaveOffset(prev => {
          const newValue = Math.min(4, prev + 1);
          console.log('🔍 [DEBUG_SYSTEM] オクターブ調整結果:', {
            old: prev,
            new: newValue,
            direction: 'up',
            limit: '[-3, +4]',
            resultingOctave: 4 + newValue
          });
          return newValue;
        }); // オクターブ8まで対応（+4拡張）
        return
      }
      
      // キーリピートは無視
      if (event.repeat) return

      // 既に押されているキーは無視（refから取得）
      if (activeKeysRef.current.has(event.code)) return

      // MIDIノートに対応するキーの場合のみ処理（refから取得）
      console.log('🔍 [DEBUG_SYSTEM] =================================');
      console.log('🔍 [DEBUG_SYSTEM] キーボード入力詳細デバッグ開始');
      console.log('🔍 [DEBUG_SYSTEM] =================================');
      console.log('🔍 [DEBUG_SYSTEM] 入力キー:', event.code);
      console.log('🔍 [DEBUG_SYSTEM] 現在のmanualOctaveOffset:', manualOctaveOffset);

      const octave = calculateOptimalOctave(
        stateRef.current.scrollY,
        stateRef.current.currentTime,
        [0, 9],
        120,
        20,
        manualOctaveOffset
      )

      console.log('🔍 [DEBUG_SYSTEM] calculateOptimalOctave結果:', octave);
      console.log('🔍 [DEBUG_SYSTEM] calculateOptimalOctave引数詳細:', {
        scrollY: stateRef.current.scrollY,
        currentTime: stateRef.current.currentTime,
        octaveRange: [0, 9],
        totalKeys: 120,
        gridHeight: 20,
        manualOctaveOffset: manualOctaveOffset
      });

      const midiNote = getMidiNoteFromKeyCode(event.code, octave)

      console.log('🔍 [DEBUG_SYSTEM] getMidiNoteFromKeyCode結果:', midiNote);
      console.log('🔍 [DEBUG_SYSTEM] getMidiNoteFromKeyCode引数:', {
        keyCode: event.code,
        octave: octave
      });

      if (midiNote === null) {
        console.log(`🎹 キー ${event.code} はMIDIノートに対応していません`);
        return;
      }

      // イベントの伝播を停止（他のイベントリスナーとの競合を防ぐ）
      event.preventDefault();
      event.stopPropagation();

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`🎹 [AUDIO_PLAYBACK_DEBUG] Playing note: ${midiNote}`)
      console.log(`🎹 [AUDIO_PLAYBACK_DEBUG] Event code: ${event.code}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // アクティブキーに追加
      setActiveKeys(prev => new Set([...prev, event.code]))

      // 🔍 [ENHANCED_DEBUG] 音声システム詳細チェック
      console.log('🔍 [ENHANCED_DEBUG] =================================');
      console.log('🔍 [ENHANCED_DEBUG] 音声システム状態詳細チェック');
      console.log('🔍 [ENHANCED_DEBUG] =================================');
      console.log('🔍 [ENHANCED_DEBUG] stateRef.current:', !!stateRef.current);
      console.log('🔍 [ENHANCED_DEBUG] stateRef.current.audioEnabled:', stateRef.current?.audioEnabled);
      console.log('🔍 [ENHANCED_DEBUG] audioRef.current:', !!audioRef.current);
      console.log('🔍 [ENHANCED_DEBUG] audioRef.current type:', typeof audioRef.current);
      console.log('🔍 [ENHANCED_DEBUG] audioRef.current.playNote:', !!(audioRef.current?.playNote));
      console.log('🔍 [ENHANCED_DEBUG] 条件チェック結果:', !!(stateRef.current?.audioEnabled && audioRef.current));

      // 音を再生（再生中でも常に音を鳴らす）（refから取得）
      if (stateRef.current.audioEnabled && audioRef.current) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`🎹 [AUDIO_PLAYBACK_DEBUG] Audio system check PASSED`)
        console.log(`🎹 [AUDIO_PLAYBACK_DEBUG] - audioEnabled: ${stateRef.current.audioEnabled}`)
        console.log(`🎹 [AUDIO_PLAYBACK_DEBUG] - audioRef exists: ${!!audioRef.current}`)
        console.log(`🎹 [AUDIO_PLAYBACK_DEBUG] - audioRef.playNote exists: ${!!(audioRef.current && audioRef.current.playNote)}`)
        console.log(`🎹 [AUDIO_PLAYBACK_DEBUG] Calling audioRef.current.playNote(${midiNote}, 0.8, 0.25)...`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        // キーボード入力の音を記録
        keyboardAudioRef.current.set(event.code, {
          noteId: midiNote,
          startTime: Date.now()
        })

        // 音を再生（useMidiAudioを使用）
        const result = audioRef.current.playNote(midiNote, 0.8, 0.25); // useMidiAudioを使用

        // チュートリアル用イベント発火: キーボードで音を鳴らした
        window.dispatchEvent(new CustomEvent('tutorial:keyboard-play'))

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`🎹 [AUDIO_PLAYBACK_DEBUG] playNote() returned:`, result)
        console.log(`🎹 [AUDIO_PLAYBACK_DEBUG] Result type:`, typeof result)
        console.log(`🎹 [AUDIO_PLAYBACK_DEBUG] Result is null:`, result === null)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        // キーボード入力の音を記録（noteOffで確実に停止するため）
        if (result) {
          keyboardAudioRef.current.set(event.code, {
            noteId: midiNote,
            startTime: Date.now(),
            audioResult: result,
            isKeyboardInput: true // キーボード入力であることをマーク
          })
        }
      } else {
        console.log('🚨 [ENHANCED_DEBUG] =================================');
        console.log('🚨 [ENHANCED_DEBUG] 音声再生処理がスキップされました');
        console.log('🚨 [ENHANCED_DEBUG] =================================');
        console.log(`🚨 [ENHANCED_DEBUG] audioEnabled: ${stateRef.current?.audioEnabled}`);
        console.log(`🚨 [ENHANCED_DEBUG] audioRef exists: ${!!audioRef.current}`);
        console.log(`🚨 [ENHANCED_DEBUG] stateRef exists: ${!!stateRef.current}`);
        console.log('🚨 [ENHANCED_DEBUG] 詳細理由:');
        if (!stateRef.current) {
          console.log('🚨 [ENHANCED_DEBUG] - stateRef.current が null/undefined');
        } else if (!stateRef.current.audioEnabled) {
          console.log('🚨 [ENHANCED_DEBUG] - audioEnabled が false');
        } else if (!audioRef.current) {
          console.log('🚨 [ENHANCED_DEBUG] - audioRef.current が null/undefined');
        }
        console.log('🚨 [ENHANCED_DEBUG] =================================');
      }

      // キーボード入力でのノート作成（再生中・停止中両方で動作）（refから取得）
      const currentTime = stateRef.current.isPlaying ? stateRef.current.currentTime : 0
      const noteId = `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // 新しいノートを作成（最初は最小長さ、keyupで確定）
      const newNote = {
        id: noteId,
        pitch: midiNote,
        time: currentTime,
        duration: 0.25, // 最小長さ（1/16音符相当）、keyupで更新
        velocity: 0.7
      }

      console.log(`🎹 Adding live note: ${noteId} at time ${currentTime} (isPlaying: ${stateRef.current.isPlaying})`)

      // ノートを追加（refから取得）
      stateRef.current.setNotes(prev => {
        const newNotes = [...prev, newNote]
        currentNotesRef.current = newNotes
        return newNotes
      })

      // キー押下開始時刻を記録（リアルタイムの時刻を使用）
      setLiveRecordingNotes(prev => new Map(prev).set(event.code, {
        noteId: noteId,
        startTime: currentTime,
        startTimestamp: Date.now(), // 実時間での開始時刻
        keyCode: event.code
      }))

      // 親コンポーネントに通知
      if (onNoteAddRef.current) {
        onNoteAddRef.current(newNote, trackIdRef.current)
      }

      // 視覚的フィードバック（複数キー対応）（refから取得）
      stateRef.current.setPressedKey(prev => {
        if (prev === null) return midiNote
        if (Array.isArray(prev)) {
          return [...prev, midiNote]
        }
        return [prev, midiNote]
      })
      stateRef.current.setNeedsRedraw(true)
  }, [
    // 🔧 [STABILITY_FIX] 依存関係を最小化してイベントリスナーの安定性を確保
    // isActive は isActiveRef.current 経由で参照
    undoLastAction,
    redoLastAction,
    setManualOctaveOffset,
    manualOctaveOffset,
    setActiveKeys,
    setLiveRecordingNotes
  ])

    const handleKeyUp = useCallback((event) => {
      console.log(`🎹 [KEYUP_DEBUG] KeyUp detected: ${event.code}`)

      // MIDIエディタがアクティブでない場合は処理しない
      if (!isActiveRef.current) {
        console.log('🎹 [KEYUP_DEBUG] MIDIエディタが非アクティブのため、キーボード入力を無視');
        console.log('🎹 [KEYUP_DEBUG] isActiveRef.current:', isActiveRef.current);
        return;
      }
      
      // アクティブキーから削除
      setActiveKeys(prev => {
        const newSet = new Set(prev)
        newSet.delete(event.code)
        return newSet
      })

      // MIDIノートに対応するキーの場合のみ処理（refから取得）
      const octave = calculateOptimalOctave(
        stateRef.current.scrollY,
        stateRef.current.currentTime,
        [0, 9],
        120,
        20,
        manualOctaveOffset
      )
      
      const midiNote = getMidiNoteFromKeyCode(event.code, octave)
      if (midiNote !== null) {
        // イベントの伝播を停止（他のイベントリスナーとの競合を防ぐ）
        event.preventDefault();
        event.stopPropagation();
        
        console.log(`🎹 Stopping note: ${midiNote}`)

        // 音を停止（統一された音声システムでは自動的に管理される）（refから取得）
        if (stateRef.current.audioEnabled && audioRef.current) {
          // useMidiAudioのnoteOffを使用
          audioRef.current.noteOff(midiNote);
          // キーボード入力の音を記録から削除
          keyboardAudioRef.current.delete(event.code)
        }

        // キーボード入力ノートの長さ確定処理（再生中・停止中両方で動作）（refから取得）
        const recordingData = liveRecordingNotesRef.current.get(event.code)
        if (recordingData) {
          // 🎯 修正: 停止中・再生中共に実時間をそのまま使用（BPM補正なし）
          const elapsedMs = Date.now() - recordingData.startTimestamp
          const duration = Math.max(0.25, elapsedMs / 1000)

          console.log(`🎹 Finalizing live note: ${recordingData.noteId} with duration ${duration}s (elapsed: ${elapsedMs}ms, isPlaying: ${stateRef.current.isPlaying})`)

          // ノートの長さを更新（refから取得）
          stateRef.current.setNotes(prev => {
            const updatedNotes = prev.map(note =>
              note.id === recordingData.noteId
                ? { ...note, duration: duration }
                : note
            )
            currentNotesRef.current = updatedNotes
            return updatedNotes
          })

          // ライブ録音中のノートから削除
          setLiveRecordingNotes(prev => {
            const newMap = new Map(prev)
            newMap.delete(event.code)
            return newMap
          })

          // 親コンポーネントに通知（refから取得）
          if (onNoteEditRef.current) {
            const updatedNote = stateRef.current.notes.find(note => note.id === recordingData.noteId)
            if (updatedNote) {
              onNoteEditRef.current(updatedNote, trackIdRef.current)
            }
          }
        }

        // 視覚的フィードバックをクリア（複数キー対応）（refから取得）
        stateRef.current.setPressedKey(prev => {
          if (prev === null) return null
          if (Array.isArray(prev)) {
            const newPressedKeys = prev.filter(key => key !== midiNote)
            return newPressedKeys.length > 0 ? newPressedKeys : null
          }
          return prev === midiNote ? null : prev
        })
        stateRef.current.setNeedsRedraw(true)
      }
  }, [
    // 🔧 [STABILITY_FIX] 依存関係を最小化してイベントリスナーの安定性を確保
    // isActive は isActiveRef.current 経由で参照
    setActiveKeys,
    manualOctaveOffset,
    setLiveRecordingNotes
  ])

  // 🆕 Phase 0: 基本機能確認用 - TABキー検出詳細デバッグ
  // 🚨 CRITICAL FIX: useEffect実行確認 + isActiveチェック削除 + 条件チェック簡素化
  // 🔧 [FIX_TAB_APPROVAL] 依存配列を空にして初回マウント時のみ実行（再登録問題を完全回避）
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[MODULE:MidiEditor] [PHASE:Setup] TABリスナー useEffect 実行開始', {
      useEffectExecuted: true,
      dependencies: 'empty_array',
      timestamp: Date.now()
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      const handleTabKey = (event) => {
        console.log('🎯 [MODULE:MidiEditor] [PHASE:Trigger] TABキー検出 - ハンドラ呼び出し', {
          eventCode: event.code,
          eventKey: event.key,
          eventType: event.type,
          handlerCalled: true,
          timestamp: Date.now()
        })

        if (event.code === 'Tab') {
          console.log('✅ [MODULE:MidiEditor] [PHASE:Validate] TABイベント詳細解析', {
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            target: event.target?.tagName || 'unknown',
            preventDefault: 'about_to_execute',
            timestamp: Date.now()
          })

          event.preventDefault()
          event.stopPropagation()

          console.log('🚀 [MODULE:MidiEditor] [PHASE:Dispatch] accept-ghost-text-global イベントディスパッチ準備', {
            eventDetail: { shiftKey: event.shiftKey },
            aboutToDispatch: true,
            timestamp: Date.now()
          })

          window.dispatchEvent(new CustomEvent('accept-ghost-text-global', {
            detail: {
              shiftKey: event.shiftKey,
              source: 'EnhancedMidiEditor_TAB_Handler',
              timestamp: Date.now()
            }
          }))

          console.log('✅ [MODULE:MidiEditor] [PHASE:Dispatch] accept-ghost-text-global イベントディスパッチ完了', {
            dispatched: true,
            eventType: 'accept-ghost-text-global',
            timestamp: Date.now()
          })
        } else {
          console.log('ℹ️ [MODULE:MidiEditor] [PHASE:Ignore] 非TABキー検出', {
            eventCode: event.code,
            ignored: true
          })
        }
      }

      console.log('📋 [MODULE:MidiEditor] [PHASE:Listen] TABイベントリスナー登録実行', {
        listenerRegistered: 'starting',
        eventType: 'keydown',
        capture: true,
        function: 'document.addEventListener',
        timestamp: Date.now()
      })

      document.addEventListener('keydown', handleTabKey, { capture: true })

      console.log('🎉 [MODULE:MidiEditor] [PHASE:Listen] TABリスナー登録完了', {
        status: 'ready',
        waitingForTab: true,
        listenerActive: true,
        timestamp: Date.now()
      })
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      return () => {
        console.log('🧹 [MODULE:MidiEditor] [PHASE:Cleanup] TABリスナー解除実行', {
          cleanupExecuted: true,
          timestamp: Date.now()
        })
        document.removeEventListener('keydown', handleTabKey, { capture: true })
      }
    } catch (error) {
      console.error('❌ [MODULE:MidiEditor] [PHASE:Error] TABリスナー設定エラー', {
        error: error.message,
        stack: error.stack,
        timestamp: Date.now()
      })
      throw error
    }
  }, []) // 🔧 空配列で無条件実行

  // 🔧 [FIX_TAB_APPROVAL] window.ghostTextHook同期確認用useEffect
  useEffect(() => {
    if (ghostText) {
      console.log('🔍 [GHOST_TEXT_SYNC] ghostText更新検出:', {
        phraseNotesLength: ghostText?.phraseNotes?.length || 0,
        phraseSetsLength: ghostText?.phraseSets?.length || 0,
        windowGhostTextHook: !!window.ghostTextHook,
        timestamp: Date.now()
      })

      // window.ghostTextHookの存在確認
      if (!window.ghostTextHook) {
        console.warn('⚠️ [GHOST_TEXT_SYNC] window.ghostTextHookが未設定です')
      } else {
        console.log('✅ [GHOST_TEXT_SYNC] window.ghostTextHook存在確認OK:', {
          hookDataKeys: Object.keys(window.ghostTextHook)
        })
      }
    }
  }, [ghostText]) // ghostText更新時に同期確認

  // 🔧 [KEYBOARD_FIX] handleKeyDown/handleKeyUpのRef更新（常に最新の関数を参照）
  useEffect(() => {
    handleKeyDownRef.current = handleKeyDown
    handleKeyUpRef.current = handleKeyUp
  }, [handleKeyDown, handleKeyUp])

  // 🔧 [KEYBOARD_FIX] キーボードリスナーをセットアップ（安定したラッパー関数を使用）
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎹 [LISTENER_SETUP_DEBUG] Setting up STABLE keyboard listeners')
    console.log('🎹 [LISTENER_SETUP_DEBUG] Component: EnhancedMidiEditor')
    console.log('🎹 [LISTENER_SETUP_DEBUG] trackId:', trackId)
    console.log('🎹 [LISTENER_SETUP_DEBUG] isActive (current):', isActive)
    console.log('🎹 [LISTENER_SETUP_DEBUG] isActiveRef.current:', isActiveRef.current)
    console.log('🎹 [LISTENER_SETUP_DEBUG] Using ref-based stable wrappers')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // 🔧 [KEYBOARD_FIX] 安定したラッパー関数（Refを経由して常に最新のハンドラーを呼び出す）
    const stableKeyDownWrapper = (event) => {
      console.log('🎹 [WRAPPER_DEBUG] stableKeyDownWrapper called for:', event.code)
      if (handleKeyDownRef.current) {
        handleKeyDownRef.current(event)
      } else {
        console.warn('⚠️ [WRAPPER_DEBUG] handleKeyDownRef.current is null!')
      }
    }

    const stableKeyUpWrapper = (event) => {
      console.log('🎹 [WRAPPER_DEBUG] stableKeyUpWrapper called for:', event.code)
      if (handleKeyUpRef.current) {
        handleKeyUpRef.current(event)
      } else {
        console.warn('⚠️ [WRAPPER_DEBUG] handleKeyUpRef.current is null!')
      }
    }

    document.addEventListener('keydown', stableKeyDownWrapper)
    document.addEventListener('keyup', stableKeyUpWrapper)

    console.log('✅ [LISTENER_SETUP_DEBUG] STABLE keyboard listeners registered successfully')

    return () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🎹 [LISTENER_CLEANUP_DEBUG] Keyboard useEffect cleanup triggered')
      console.log('🎹 [LISTENER_CLEANUP_DEBUG] trackId:', trackId)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      document.removeEventListener('keydown', stableKeyDownWrapper)
      document.removeEventListener('keyup', stableKeyUpWrapper)
      console.log('✅ [LISTENER_CLEANUP_DEBUG] STABLE keyboard listeners removed')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }
  }, [trackId]) // 🔧 [KEYBOARD_FIX] trackIdのみを依存配列に指定（handleKeyDown/handleKeyUpは除外）

  // オーディオ初期化
  useEffect(() => {
    console.log('🎵 Audio initialization useEffect triggered:', {
      stateAudioEnabled: state.audioEnabled,
      audio: !!audio
    })
    if (state.audioEnabled) {
      console.log('🎵 Initializing audio...')
      audio.initializeAudio().then(result => {
        console.log('🎵 Audio initialization result:', result)
      })
    }
  }, [state.audioEnabled, audio])

  // 音色変更時の処理（安定した関数を使用）
  const lastInstrumentChangeRef = useRef({ instrument: null, settings: null })
  const handleInstrumentChange = useCallback(() => {
    // 重複実行を防ぐ
    const currentInstrument = instrumentSettings.instrument
    const currentSettings = JSON.stringify(instrumentSettings.settings)
    
    if (lastInstrumentChangeRef.current.instrument === currentInstrument && 
        lastInstrumentChangeRef.current.settings === currentSettings) {
      console.log('🎵 Instrument change skipped - no changes detected')
      return
    }
    
    console.log('🎵 Instrument change handler triggered:', {
      stateAudioEnabled: state.audioEnabled,
      audio: !!audio,
      instrumentSettings: !!instrumentSettings.settings,
      settingsKeys: instrumentSettings.settings ? Object.keys(instrumentSettings.settings).length : 0,
      stateIsPlaying: state.isPlaying,
      notesLength: state.notes.length
    })
    
    // 変更を記録
    lastInstrumentChangeRef.current = {
      instrument: currentInstrument,
      settings: currentSettings
    }
    
    if (state.audioEnabled && audio.isAudioContextAvailable() && instrumentSettings.settings && Object.keys(instrumentSettings.settings).length > 0) {
      // オーディオエンジンに音色を設定
      audio.setInstrument(instrumentSettings.instrument)
      
      // 音量とパンを設定（安全な値変換）
      const volume = instrumentSettings.settings.volume
      if (typeof volume === 'number' && isFinite(volume)) {
        const normalizedVolume = Math.max(0, Math.min(1, volume / 100))
        audio.setVolume(normalizedVolume)
      } else {
        // デフォルト値を設定（警告は開発環境でのみ表示）
        if (process.env.NODE_ENV === 'development') {
          console.warn('Invalid volume setting:', volume, 'using default volume')
        }
        audio.setVolume(0.7)
      }
      
      // 現在再生中のノートを新しい音色で再生成（再生中の場合）
      if (state.isPlaying) {
        console.log('🎵 Stopping all notes due to instrument change')
        // 音色変更時のみ全音停止を実行（無限ループを防ぐため）
        const wasPlaying = state.isPlaying
        const currentPlaybackNotes = new Set(state.playbackNotes) // 現在の再生中ノートを保存
        
        audio.stopAllNotes()
        
        // 再生中の場合のみノートを再生成
        if (wasPlaying) {
          const currentNotes = currentNotesRef.current || state.notes
          currentNotes.forEach(note => {
            if (note.time <= state.currentTime && note.time + note.duration > state.currentTime) {
              // 音量はuseMidiAudioフック内で個別トラック音量 × マスターボリュームとして処理される
              audio.playScheduledNote(note.pitch, note.time, note.duration, note.velocity)
              
              // 再生中のノートとして再登録
              currentPlaybackNotes.add(note.id)
            }
          })
          
          // 再生中のノート状態を復元
          state.setPlaybackNotes(currentPlaybackNotes)
        }
      }
    }
  }, [state.audioEnabled, audio, instrumentSettings.instrument, instrumentSettings.settings, state.isPlaying, state.currentTime, state.notes])

  // 音色変更時の処理
  useEffect(() => {
    handleInstrumentChange()
  }, [handleInstrumentChange])

  // Mixerの音量情報を音声システムに反映（重複実行を防ぐ）
  const lastVolumeUpdateRef = useRef({ trackVolume, trackMuted, masterVolume })
  useEffect(() => {
    // 音量情報が実際に変更された場合のみ処理
    if (lastVolumeUpdateRef.current.trackVolume === trackVolume && 
        lastVolumeUpdateRef.current.trackMuted === trackMuted && 
        lastVolumeUpdateRef.current.masterVolume === masterVolume) {
      return
    }
    
    console.log('🎵 Enhanced Midi Editor: Volume effect triggered:', {
      stateAudioEnabled: state.audioEnabled,
      hasAudio: !!audio,
      hasSetExternalVolumeInfo: !!(audio && audio.setExternalVolumeInfo),
      trackVolume,
      trackMuted,
      masterVolume
    })
    
    if (state.audioEnabled && audio && audio.setExternalVolumeInfo) {
      // 外部音量情報を設定（個別トラック音量、ミュート状態、マスターボリューム）
      audio.setExternalVolumeInfo(trackVolume, trackMuted, masterVolume)
      
      console.log('🎵 Enhanced Midi Editor: External volume info set:', {
        trackVolume,
        trackMuted,
        masterVolume
      })
      
      // 更新された音量情報を記録
      lastVolumeUpdateRef.current = { trackVolume, trackMuted, masterVolume }
    } else {
      console.warn('🎵 Enhanced Midi Editor: Cannot update volume info:', {
        stateAudioEnabled: state.audioEnabled,
        hasAudio: !!audio,
        hasSetExternalVolumeInfo: !!(audio && audio.setExternalVolumeInfo)
      })
    }
  }, [trackVolume, trackMuted, masterVolume, state.audioEnabled, audio])

  // 現在のトラックのデータを保存
  const saveCurrentTrackData = useCallback(() => {
    if (!trackId) return
    
    // 現在のノートを取得
    const currentNotes = currentNotesRef.current || state.notes
    
    // Refに保存
    trackDataRef.current[trackId] = [...currentNotes]
    lastSavedRef.current[trackId] = Date.now()
    
    // 永続化フックを使用して保存
    persistence.saveNotes(currentNotes, trackId)
    

  }, [trackId, persistence])

  // 初期化処理
  useEffect(() => {
    console.log('🎵 Initialization useEffect triggered:', {
      stateIsInitialized: state.isInitialized,
      trackId,
      isActive,
      midiDataNotes: midiData?.notes?.length || 0
    })
    
    // 初期化済みの場合はスキップ
    if (state.isInitialized || !trackId || !isActive) {
      console.log('🎵 Skipping initialization - already initialized or not active')
      return
    }
    
    // 既に初期化済みのトラックの場合でも、midiDataが更新された場合は再初期化
    if (trackDataRef.current[trackId] !== undefined) {
      console.log('🎵 Track data already exists for trackId:', trackId)
      // midiDataが更新された場合は再初期化
      if (midiData?.notes && JSON.stringify(midiData.notes) !== JSON.stringify(trackDataRef.current[trackId])) {
        console.log('🎵 MIDI data changed, resetting initialization flag')
        // 初期化フラグをリセットして再初期化を許可
        state.setIsInitialized(false)
        return
      } else {
        console.log('🎵 MIDI data unchanged, setting initialized flag')
        state.setIsInitialized(true)
        return
      }
    }
    
    // 初期化フラグを設定して他のuseEffectの実行を防ぐ
    console.log('🎵 Setting initialization flag to true')
    state.setIsInitialized(true)
    

    
    let initialNotes = []
    
    // 1. まずMIDIデータから初期化（親コンポーネントの状態を優先）
    if (midiData?.notes) {
      // MIDIデータが存在する場合は、空の配列でも使用（全削除後の状態を保持）
      initialNotes = [...midiData.notes]

      setOriginalMidiData(midiData)
    }
    // 2. MIDIデータがない場合は永続化フックから読み込み
    else {
      const savedNotes = persistence.loadNotes(trackId)
      if (savedNotes.length > 0) {
        initialNotes = savedNotes

      }
      // 3. デバッグ用：サンプルノートを追加（開発時のみ、かつ初回初期化時のみ）
      else if (process.env.NODE_ENV === 'development' && !trackDataRef.current[trackId]) {
        // サンプルノートを追加して表示をテスト（開発環境でのみ、かつ初回のみ）
        initialNotes = [
          { id: 'sample-1', pitch: 60, time: 0, duration: 0.5, velocity: 0.8 }, // C4
          { id: 'sample-2', pitch: 62, time: 0.5, duration: 0.5, velocity: 0.8 }, // D4
          { id: 'sample-3', pitch: 64, time: 1, duration: 0.5, velocity: 0.8 }, // E4
          { id: 'sample-4', pitch: 65, time: 1.5, duration: 0.5, velocity: 0.8 }, // F4
          { id: 'sample-5', pitch: 67, time: 2, duration: 1, velocity: 0.8 }, // G4
          { id: 'sample-6', pitch: 69, time: 3, duration: 0.25, velocity: 0.8 }, // A4
          { id: 'sample-7', pitch: 71, time: 3.25, duration: 0.25, velocity: 0.8 }, // B4
          { id: 'sample-8', pitch: 72, time: 3.5, duration: 0.5, velocity: 0.8 }, // C5
        ]

      }
    }
    
    // 状態を設定
    console.log('🎵 Setting notes:', initialNotes.length)
    state.setNotes(initialNotes)
    currentNotesRef.current = initialNotes
    
    // Refに保存
    trackDataRef.current[trackId] = [...initialNotes]
    lastSavedRef.current[trackId] = Date.now()
    
    // 履歴を初期化
    persistence.initializeHistory()
    console.log('🎵 Initialization completed for trackId:', trackId)
    

  }, [trackId, midiData, isActive]) // state.isInitializedとpersistenceを依存配列から削除

  // コンポーネントのクリーンアップ処理
  useEffect(() => {
    console.log('🎵 Cleanup useEffect triggered for trackId:', trackId)

    // トラック切り替え時に再生状態をリセット
    console.log('🎵 Resetting playback state for track switch:', trackId)
    isPlayingRef.current = false
    state.setIsPlaying(false)

    return () => {
      console.log('🎵 Component cleanup - resetting initialization state')
      // コンポーネントがアンマウントされた時に初期化状態をリセット
      if (trackId) {
        // 再生状態を確実にリセット
        isPlayingRef.current = false
        state.setIsPlaying(false)

        // trackDataRefからは削除しない（他のタブで使用される可能性があるため）
        // 初期化状態のみリセット
        state.setIsInitialized(false)
      }
    }
  }, [trackId, state.setIsPlaying, state.setIsInitialized])

  // 前回のトラックIDを記録するRef
  const previousTrackIdRef = useRef(null)

  // トラック変更時の処理
  useEffect(() => {
    console.log('🎵 Track change useEffect triggered:', {
      stateIsInitialized: state.isInitialized,
      trackId,
      isActive,
      previousTrackId: previousTrackIdRef.current
    })
    
    if (!state.isInitialized || !trackId || !isActive) {
      console.log('🎵 Skipping track change - not initialized or not active')
      return
    }
    
    // 前回のトラックIDと比較して、実際にトラックが変更された場合のみ処理
    const previousTrackId = previousTrackIdRef.current
    if (previousTrackId === trackId) {
      console.log('🎵 Same track ID, skipping track change')
      return // 同じトラックの場合は何もしない
    }
    

    
    // 前回のトラックのデータを保存（存在する場合）
    if (previousTrackId) {
      console.log('🎵 Saving data for previous track:', previousTrackId)
      saveCurrentTrackData()
    }
    
    // 現在のトラックIDを記録
    previousTrackIdRef.current = trackId
    console.log('🎵 Track change completed, new trackId:', trackId)
  }, [trackId, isActive, saveCurrentTrackData]) // 🔧 修正: state.isInitializedを依存配列から削除

  // ノート変更時の自動保存
  useEffect(() => {
    console.log('🎵 Auto save useEffect triggered:', {
      stateIsInitialized: state.isInitialized,
      trackId,
      lastSaved: lastSavedRef.current[trackId] || 0
    })
    
    if (!state.isInitialized || !trackId) {
      console.log('🎵 Skipping auto save - not initialized or no trackId')
      return
    }
    
    // 前回の保存から一定時間経過している場合のみ保存
    const lastSaved = lastSavedRef.current[trackId] || 0
    const now = Date.now()
    if (now - lastSaved > 1000) { // 1秒以上経過している場合
      console.log('🎵 Auto saving track data')
      saveCurrentTrackData()
    } else {
      console.log('🎵 Auto save skipped - too soon since last save')
    }
  }, [trackId, saveCurrentTrackData]) // 🔧 修正: state.isInitializedとstate.notesを依存配列から削除

  // midiDataの変更を監視して状態を更新
  useEffect(() => {
    console.log('🎵 MIDI data sync useEffect triggered:', {
      trackId,
      isActive,
      stateIsInitialized: state.isInitialized,
      midiDataNotes: midiData?.notes?.length || 0,
      currentNotesLength: state.notes.length
    })
    
    if (!trackId || !isActive || !state.isInitialized) {
      console.log('🎵 Skipping MIDI data sync - not ready')
      return
    }
    
    // midiDataが更新された場合、状態を同期
    const currentNotes = currentNotesRef.current || state.notes
    if (midiData?.notes && JSON.stringify(midiData.notes) !== JSON.stringify(currentNotes)) {
      console.log('🎵 MIDI data changed, syncing notes')
      const newNotes = [...midiData.notes]
      state.setNotes(newNotes)
      currentNotesRef.current = newNotes
      trackDataRef.current[trackId] = newNotes
      setOriginalMidiData(midiData)
      
      // 強制的に再描画
      state.setNeedsRedraw(true)
    } else {
      console.log('🎵 MIDI data unchanged, no sync needed')
    }
  }, [midiData, trackId, isActive, trackName, state.setNotes, state.setNeedsRedraw]) // 🔧 修正: state.isInitializedを依存配列から削除

  // AIが追加したノートの更新を監視
  useEffect(() => {
    const handleMidiDataUpdated = (event) => {
      const { trackId: updatedTrackId, noteId, type } = event.detail
      
      // 現在のトラックの更新の場合のみ処理
      if (updatedTrackId === trackId && isActive && state.isInitialized) {
        console.log('EnhancedMidiEditor: MIDI data updated by AI:', { trackId, noteId, type })
        
        // 現在のMIDIデータを再取得して状態を更新
        const currentMidiData = midiData || { notes: [] }
        console.log('EnhancedMidiEditor: Current MIDI data:', currentMidiData)
        
        // AIエージェントの承認待ちノートも含めて表示
        let allNotes = [...currentMidiData.notes]
        
        // グローバルなAIエージェントエンジンから承認待ちノートを取得
        if (window.aiAgentEngine && window.aiAgentEngine.getPendingChanges) {
          const pendingChanges = window.aiAgentEngine.getPendingChanges()
          const pendingNotes = pendingChanges.notes
            .filter(([noteId, change]) => change.trackId === trackId && change.type === 'add')
            .map(([noteId, change]) => change.newNote)
          
          if (pendingNotes.length > 0) {
            console.log('EnhancedMidiEditor: Found pending notes:', pendingNotes.length)
            allNotes = [...allNotes, ...pendingNotes]
          }
        }
        
        state.setNotes(allNotes)
        currentNotesRef.current = allNotes
        trackDataRef.current[trackId] = allNotes
        
        // 強制的に再描画
        state.setNeedsRedraw(true)
        console.log('EnhancedMidiEditor: State updated with new notes:', allNotes.length)
        console.log('EnhancedMidiEditor: Notes details:', allNotes.slice(0, 3)) // 最初の3つのノートを表示
      }
    }

    const handleMidiDataRejected = (event) => {
      const { sessionId, trackCount, noteCount, trackId: rejectedTrackId, noteIds, remainingNotes } = event.detail
      
      // 現在のトラックの拒否の場合のみ処理
      if (isActive && state.isInitialized && rejectedTrackId === trackId) {
        console.log('EnhancedMidiEditor: MIDI data rejected by AI:', { trackId, sessionId, noteCount, noteIds })
        
        // 拒否処理中フラグを設定（無限ループを防ぐ）
        if (window.aiAgentEngine) {
          window.aiAgentEngine.isRejectingChanges = true
        }
        
        // 現在のMIDIデータを再取得して状態を更新
        const currentMidiData = midiData || { notes: [] }
        console.log('EnhancedMidiEditor: Current MIDI data after rejection:', currentMidiData)
        
        // 承認待ちノートを除外して表示（isPendingフラグも含めて）
        const filteredNotes = currentMidiData.notes.filter(note => {
          const isPendingNote = note.isPending || (noteIds && noteIds.includes(note.id))
          return !isPendingNote
        })
        
        console.log('EnhancedMidiEditor: Filtered out pending notes - before:', currentMidiData.notes.length, 'after:', filteredNotes.length)
        
        // 状態を更新
        state.setNotes(filteredNotes)
        currentNotesRef.current = filteredNotes
        trackDataRef.current[trackId] = filteredNotes
        
        // 強制的に再描画
        state.setNeedsRedraw(true)
        console.log('EnhancedMidiEditor: State updated after rejection with notes:', filteredNotes.length)
        
        // 拒否処理中フラグをクリア（少し遅延させて確実に処理を完了）
        setTimeout(() => {
          if (window.aiAgentEngine) {
            window.aiAgentEngine.isRejectingChanges = false
            console.log('EnhancedMidiEditor: Rejection processing flag cleared')
            
            // 追加の強制更新
            state.setNeedsRedraw(true)
            console.log('EnhancedMidiEditor: Additional redraw triggered')
          }
        }, 100)
      }
    }

    const handleMidiDataApproved = (event) => {
      const { trackId: approvedTrackId, noteIds, approvedNotes } = event.detail
      
      // 現在のトラックの承認の場合のみ処理
      if (isActive && state.isInitialized && approvedTrackId === trackId) {
        console.log('EnhancedMidiEditor: MIDI data approved by AI:', { trackId, noteIds, approvedNotes })
        
        // 現在のMIDIデータを再取得して状態を更新
        const currentMidiData = midiData || { notes: [] }
        console.log('EnhancedMidiEditor: Current MIDI data after approval:', currentMidiData)
        
        // 承認されたノートのisPendingフラグをクリア
        const updatedNotes = currentMidiData.notes.map(note => {
          if (noteIds && noteIds.includes(note.id)) {
            return { ...note, isPending: false }
          }
          return note
        })
        
        console.log('EnhancedMidiEditor: Updated notes after approval - before:', currentMidiData.notes.length, 'after:', updatedNotes.length)
        
        // 状態を更新
        state.setNotes(updatedNotes)
        currentNotesRef.current = updatedNotes
        trackDataRef.current[trackId] = updatedNotes
        
        // 強制的に再描画
        state.setNeedsRedraw(true)
        console.log('EnhancedMidiEditor: State updated after approval with notes:', updatedNotes.length)
      }
    }

    window.addEventListener('midiDataUpdated', handleMidiDataUpdated)
    window.addEventListener('midiDataRejected', handleMidiDataRejected)
    window.addEventListener('midiDataApproved', handleMidiDataApproved)
    
    return () => {
      window.removeEventListener('midiDataUpdated', handleMidiDataUpdated)
      window.removeEventListener('midiDataRejected', handleMidiDataRejected)
      window.removeEventListener('midiDataApproved', handleMidiDataApproved)
    }
  }, [trackId, isActive, midiData, state.setNotes, state.setNeedsRedraw]) // 🔧 修正: state.isInitializedを依存配列から削除

  // ノートデータの更新を親コンポーネントに通知
  useEffect(() => {
    if (!onMidiDataUpdate || !trackId || !state.isInitialized) return
    
    // 複数ノートドラッグ中は処理をスキップ（finalizeMultiNoteDragで処理済み）
    if (state.isDraggingMultipleNotes) {
      
      return
    }
    

    
    // 最後の更新時刻をチェックして重複を防ぐ
    const now = Date.now()
    const lastUpdateTime = lastParentUpdateRef.current[trackId] || 0
    if (now - lastUpdateTime < 50) { // 50ms以内の重複更新を防ぐ（短縮）
      
      return
    }
    

    
    // 更新時刻を記録
    lastParentUpdateRef.current[trackId] = now
    
    const updateData = {
      notes: Array.isArray(state.notes) ? state.notes : [],
      trackId: trackId,
      lastModified: new Date().toISOString(),
      metadata: {
        modified: new Date().toISOString(),
        noteCount: state.notes.length
      },
      settings: {
        channel: 0,
        octave: 0,
        transpose: 0,
        velocity: 100
      }
    }
    
    onMidiDataUpdate(updateData)
  }, [trackId, onMidiDataUpdate, state.isDraggingMultipleNotes]) // 🔧 修正: state.notesを依存配列から削除（無限ループ防止）



  // 選択されたノートをカット（deleteSelectedNotesの定義後に配置）
  const cutSelectedNotes = useCallback((selectedNoteIds = null) => {
    const effectiveSelectedNotes = selectedNoteIds || Array.from(state.selectedNotes)
    if (effectiveSelectedNotes.length === 0) return
    
    // まずコピー
    noteOperations.copySelectedNotes(effectiveSelectedNotes)
    
    // 次に削除
    noteOperations.deleteSelectedNotes(effectiveSelectedNotes)
  }, [state.selectedNotes, noteOperations])

  // Refs
  const staticCanvasRef = useRef(null)
  const dynamicCanvasRef = useRef(null)
  const timelineCanvasRef = useRef(null)
  const containerRef = useRef(null)
  const animationFrameRef = useRef(null)
  const lastGhostPredictionsRef = useRef([])
  const longPressTimerRef = useRef(null)

  // 🎯 [KEYBOARD_FIX] Piano Track viewがアクティブになった時にキャンバスにフォーカス移動
  useEffect(() => {
    if (isActive && dynamicCanvasRef?.current) {
      console.log('🎹 [FOCUS_FIX] Piano Track viewがアクティブ - キャンバスにフォーカスを移動します')

      // 短い遅延を入れてDOM更新完了を待つ
      setTimeout(() => {
        const canvas = dynamicCanvasRef.current
        if (canvas) {
          canvas.tabIndex = -1 // キャンバスをフォーカス可能にする
          canvas.focus()
          console.log('✅ [FOCUS_FIX] キャンバスフォーカス設定完了:', {
            canvasElement: canvas.tagName,
            focused: document.activeElement === canvas,
            timestamp: Date.now()
          })
        }
      }, 100)
    }
  }, [isActive, dynamicCanvasRef])

  // 再生関連のRefs
  const playbackRef = useRef(null)
  const metronomeRef = useRef(null)
  const scheduledNotesRef = useRef(new Map())
  const playbackStartTimeRef = useRef(0)
  
  // 再生中のオーディオノードを管理するRef
  const activeAudioNodesRef = useRef(new Map()) // noteId -> { oscillator, gainNode, filter }

  // 定数
  const GRID_HEIGHT = 20
  const GRID_WIDTH = 40
  const PIANO_WIDTH = 80
  const HEADER_HEIGHT = 40
  const NOTE_HEIGHT = 18
  const OCTAVE_RANGE = [1, 6] // C1 to C7
  const TOTAL_KEYS = (OCTAVE_RANGE[1] - OCTAVE_RANGE[0] + 1) * 12
  const FPS_LIMIT = 60
  const FRAME_TIME = 1000 / FPS_LIMIT
  const LONG_PRESS_THRESHOLD = 200
  
  // 再生関連の定数
  const PLAYBACK_UPDATE_INTERVAL = 16 // ms (60fps)
  
  // 音の長さ分類の定数
  const NOTE_DURATION_THRESHOLDS = {
    SHORT: 0.5,    // 0.5秒以下 = 短い音
    MEDIUM: 2.0,   // 0.5秒〜2秒 = 中程度の音
    LONG: 2.0      // 2秒以上 = 長い音
  }
  
  // 短い音の再生終了設定
  const SHORT_NOTE_AUTO_STOP = true // 短い音は自動的に終了するかどうか
  
  // 音の長さ分類の設定（ユーザーが調整可能）
  const [noteDurationSettings, setNoteDurationSettings] = useState({
    shortThreshold: NOTE_DURATION_THRESHOLDS.SHORT,
    mediumThreshold: NOTE_DURATION_THRESHOLDS.MEDIUM,
    autoStopShortNotes: SHORT_NOTE_AUTO_STOP
  })

  // 音の長さを分類する関数
  const classifyNoteDuration = useCallback((duration) => {
    if (duration <= noteDurationSettings.shortThreshold) {
      return 'SHORT'
    } else if (duration <= noteDurationSettings.mediumThreshold) {
      return 'MEDIUM'
    } else {
      return 'LONG'
    }
  }, [noteDurationSettings.shortThreshold, noteDurationSettings.mediumThreshold])
  
  // 短い音かどうかを判定する関数
  const isShortNote = useCallback((duration) => {
    return duration <= noteDurationSettings.shortThreshold
  }, [noteDurationSettings.shortThreshold])
  
  // 座標変換関数（メモ化・スクロール対応・下限設定）
  const coordinateTransforms = useMemo(() => {
    // スクロール下限の計算（キーボードの下側に余裕を持たせる）
    const maxScrollY = Math.max(0, (TOTAL_KEYS * GRID_HEIGHT) - 400) // 400pxの表示領域を確保
    
    return {
      pitchToY: (pitch) => {
        // ピッチを正しいY座標に変換（簡略化版）
        const keyIndex = TOTAL_KEYS - 1 - (pitch - (OCTAVE_RANGE[0] * 12))
        const y = HEADER_HEIGHT + keyIndex * GRID_HEIGHT - state.scrollY
        return y
      },
      yToPitch: (y) => {
        // Y座標をピッチに変換
        const keyIndex = Math.floor((y - HEADER_HEIGHT + state.scrollY) / GRID_HEIGHT)
        return (OCTAVE_RANGE[0] * 12) + (TOTAL_KEYS - 1 - keyIndex)
      },
      timeToX: (time) => {
        // 時間を正しいX座標に変換（簡略化版）
        const x = PIANO_WIDTH + (time * GRID_WIDTH * state.zoom) - state.scrollX
        return x
      },
      xToTime: (x) => {
        // X座標を時間に変換（スクロールとズームを考慮）
        return (x - PIANO_WIDTH + state.scrollX) / (GRID_WIDTH * state.zoom)
      },
      maxScrollY: maxScrollY
    }
  }, [state.zoom, state.scrollX, state.scrollY, TOTAL_KEYS, GRID_HEIGHT, GRID_WIDTH, PIANO_WIDTH, HEADER_HEIGHT, OCTAVE_RANGE])

  // Ghost Text Engineの初期化は専用フックで処理

  // 再生機能の実装
  const startPlayback = useCallback(async () => {
    console.log('🎵 EnhancedMidiEditor: Starting playback')
    console.log(`🎵 再生開始時の音量設定: trackVolume=${trackVolume}, trackMuted=${trackMuted}, masterVolume=${masterVolume}`);
    
    // 既に再生中の場合は何もしない（Refで状態を直接確認）
    if (isPlayingRef.current) {
      console.log('🎵 Already playing, skipping')
      return
    }
    
    // 再生開始前に現在鳴っている音を一斉に停止
    if (window.unifiedAudioSystem) {
      console.log('🎵 再生開始前に全音を停止します')
      window.unifiedAudioSystem.stopAllSounds()
    }
    
    // AudioContextの初期化を確実に行う
    const audioInitialized = await audio.initializeAudio()
    if (!audioInitialized) {
      console.error('Failed to initialize audio context')
      return
    }
    
    // 🎯 修正: 空トラックでも再生可能にする（リアルタイム録音のため）
    if (state.notes.length === 0) {
      console.log('🎵 Empty track - starting playback for live recording')
      // 空トラックでも再生状態に入り、キーボード入力を受け付ける
    }
    
    // 再生状態を先に設定（Refとstateの両方を更新）
    isPlayingRef.current = true
    state.setIsPlaying(true)
    
    // タイムラインクリック位置がある場合はそこから再生、なければ現在位置から再生
    const startTime = state.timelineClickPosition !== null ? state.timelineClickPosition : state.currentTime
    state.setCurrentTime(startTime)
    
    // 再生開始時刻を計算（指定位置から再生するため、開始時刻を過去に設定）
    const playbackStartTime = audio.getCurrentTime() - startTime
    
    state.setPlaybackStartTime(playbackStartTime)
    playbackStartTimeRef.current = playbackStartTime
    
    // 再生ヘッドを即座に表示するため、強制的に再描画
    state.setNeedsRedraw(true)
    
    // スケジュールされたノートをクリア
    scheduledNotesRef.current.clear()
    state.setPlaybackNotes(new Set())
    
    // 再生中のオーディオノードもクリア（重複防止のため）
    activeAudioNodesRef.current.clear()
    
    console.log('🎵 Playback started:', {
      startTime,
      playbackStartTime,
      notesCount: state.notes.length,
      currentTime: audio.getCurrentTime()
    })
    
    // ノートをスケジュール
    state.notes.forEach(note => {
      // ノートの時間は秒単位なので、そのまま使用
      // 開始時刻からの相対時間でスケジュール
      const noteStartTime = playbackStartTimeRef.current + note.time
      const noteEndTime = noteStartTime + note.duration
      const delay = Math.max(0, (noteStartTime - audio.getCurrentTime()) * 1000)
      

      
      // ノート開始をスケジュール
      const startTimeout = setTimeout(async () => {
        if (!isPlayingRef.current) return
        
        // 既に再生中のノートはスキップ（重複防止）
        if (activeAudioNodesRef.current.has(note.id)) {
          console.log(`🎵 ノート ${note.id} は既に再生中のためスキップ`);
          return;
        }
        
        // 音の長さを分類
        const noteDurationType = classifyNoteDuration(note.duration)
        const isShort = isShortNote(note.duration)
        
        console.log(`🎵 ノート分類: ${note.pitch} (${noteDurationType}) - 長さ: ${note.duration}秒, 短い音: ${isShort}`)
        
        // 音量はuseMidiAudioフック内で個別トラック音量 × マスターボリュームとして処理される
        console.log(`🎵 初期スケジュール再生中のノート: ${note.pitch} (音量設定反映) - trackVolume=${trackVolume}, trackMuted=${trackMuted}, masterVolume=${masterVolume}`);
        
        // 非同期で音を再生（デバッグで成功した方法を採用）
        try {
          const result = await audio.playScheduledNote(note.pitch, noteStartTime, note.duration, note.velocity)
          if (result) {
            // 再生中のノートとして記録（即座に反映）
            state.setPlaybackNotes(prev => {
              const newSet = new Set(prev)
              newSet.add(note.id)
              return newSet
            })
            
            // 統一音声システムから返される音の情報を保存
            const audioNodeInfo = {
              oscillator: result.oscillator || null,
              gainNode: result.gainNode || null,
              filter: result.filter || null,
              endTime: result.endTime || (noteStartTime + note.duration),
              isUnifiedSystem: true, // 統一音声システムで管理されていることをマーク
              durationType: noteDurationType, // 音の長さ分類を保存
              isShort: isShort, // 短い音かどうかを保存
              soundId: result.soundId || null, // 統一音声システムの音ID
              type: result.type || 'piano' // 音のタイプ
            }
            
            activeAudioNodesRef.current.set(note.id, audioNodeInfo)
            
            console.log(`🎵 ノート ${note.id} を再生中ノートとして登録しました (${noteDurationType}, 音ID: ${result.soundId || 'N/A'})`)
          }
        } catch (error) {
          console.error(`❌ ノート ${note.id} の再生に失敗:`, error)
        }
      }, delay)
      
      // ノート終了をスケジュール
      const endDelay = Math.max(0, (noteEndTime - audio.getCurrentTime()) * 1000)
      const endTimeout = setTimeout(() => {
        if (!isPlayingRef.current) return
        
        // 短い音の場合は特別な処理
        const audioNodeInfo = activeAudioNodesRef.current.get(note.id)
        if (audioNodeInfo && audioNodeInfo.isShort && noteDurationSettings.autoStopShortNotes) {
          console.log(`🎵 短い音 ${note.id} (${note.pitch}) の再生を自動終了します`)
          
          // 短い音の場合は即座に停止
          if (audioNodeInfo.isUnifiedSystem) {
            // 統一音声システムで管理されている場合は音IDを使用して停止
            if (audioNodeInfo.soundId && window.unifiedAudioSystem) {
              try {
                window.unifiedAudioSystem.stopSound(audioNodeInfo.soundId)
                console.log(`🎵 統一音声システムで管理されている短い音 ${note.id} (音ID: ${audioNodeInfo.soundId}) を停止しました`)
              } catch (error) {
                console.error(`❌ 短い音 ${note.id} の停止に失敗:`, error)
              }
            } else {
              console.log(`🎵 統一音声システムで管理されている短い音 ${note.id} は自動的に停止されます`)
            }
          } else {
            // 従来のオーディオノードの場合は手動で停止
            if (audioNodeInfo.oscillator) {
              audioNodeInfo.oscillator.stop()
            }
            if (audioNodeInfo.gainNode) {
              audioNodeInfo.gainNode.gain.cancelScheduledValues(0)
              audioNodeInfo.gainNode.gain.setValueAtTime(audioNodeInfo.gainNode.gain.value, 0)
              audioNodeInfo.gainNode.gain.linearRampToValueAtTime(0, 0.05) // 短い音は素早くフェードアウト
            }
          }
        }
        
        state.setPlaybackNotes(prev => {
          const newSet = new Set(prev)
          newSet.delete(note.id)
          return newSet
        })
        // オーディオノードをクリーンアップ
        activeAudioNodesRef.current.delete(note.id)
      }, endDelay)
      
      scheduledNotesRef.current.set(note.id, { startTimeout, endTimeout })
    })
    
    // メトロノームをスケジュール
    if (state.metronomeEnabled) {
      const beatsPerSecond = state.tempo / 60
      const secondsPerBeat = 1 / beatsPerSecond
      const totalBeats = Math.ceil(state.playbackDuration * beatsPerSecond)
      
      console.log('🎵 Scheduling metronome:', {
        beatsPerSecond,
        secondsPerBeat,
        totalBeats,
        playbackDuration: state.playbackDuration
      })
      
      for (let beat = 0; beat < totalBeats; beat++) {
        const metronomeTime = playbackStartTimeRef.current + (beat * secondsPerBeat)
        const metronomeDelay = Math.max(0, (metronomeTime - audio.getCurrentTime()) * 1000)
        setTimeout(async () => {
          if (isPlayingRef.current) {
            await audio.playMetronomeClick(false, metronomeTime)
          }
        }, metronomeDelay)
      }
    }
    
  }, [state.notes, state.tempo, state.metronomeEnabled, state.playbackDuration, state.audioEnabled, state.timelineClickPosition, state.currentTime, audio, trackVolume, trackMuted, masterVolume])

  const stopPlayback = useCallback(() => {
    console.log('🎵 EnhancedMidiEditor: Stopping playback')
    isPlayingRef.current = false
    state.setIsPlaying(false)
    state.setCurrentTime(0)
    
    // 再生中のノートをクリア（即座に反映）
    const currentPlaybackNotes = new Set()
    state.setPlaybackNotes(currentPlaybackNotes)
    console.log('🎵 再生中のノートをクリアしました')
    
    // ライブ録音中のノートをクリア
    setLiveRecordingNotes(new Map())
    
    // キーボード入力の音をクリア
    keyboardAudioRef.current.clear()
    
    // スケジュールされたタイマーをクリア
    scheduledNotesRef.current.forEach(({ startTimeout, endTimeout }) => {
      clearTimeout(startTimeout)
      clearTimeout(endTimeout)
    })
    scheduledNotesRef.current.clear()
    
    // 再生中のオーディオノードを停止
    activeAudioNodesRef.current.forEach((audioNodes, noteId) => {
      if (audioNodes.isUnifiedSystem) {
        // 統一音声システムで管理されているノードは音IDを使用して停止
        if (audioNodes.soundId && window.unifiedAudioSystem) {
          try {
            window.unifiedAudioSystem.stopSound(audioNodes.soundId)
            console.log(`🎵 統一音声システムで管理されているノート ${noteId} (音ID: ${audioNodes.soundId}) を停止しました`);
          } catch (error) {
            console.error(`❌ ノート ${noteId} の停止に失敗:`, error);
          }
        } else {
          console.log(`🎵 統一音声システムで管理されているノート ${noteId} は自動的に停止されます`);
        }
      } else {
        // 従来のオーディオノードの場合は手動で停止
        if (audioNodes.oscillator) {
          audioNodes.oscillator.stop()
        }
        if (audioNodes.gainNode) {
          audioNodes.gainNode.gain.cancelScheduledValues(0)
          audioNodes.gainNode.gain.setValueAtTime(audioNodes.gainNode.gain.value, 0)
          audioNodes.gainNode.gain.linearRampToValueAtTime(0, 0.1)
        }
      }
    })
    activeAudioNodesRef.current.clear()
    
    // 再生ヘッドを即座に表示するため、強制的に再描画
    state.setNeedsRedraw(true)
    
    console.log('🎵 EnhancedMidiEditor: Playback stopped successfully')
  }, [])

  const pausePlayback = useCallback(() => {
    console.log('⏸️ EnhancedMidiEditor: Pausing playback')
    isPlayingRef.current = false
    state.setIsPlaying(false)
    
    // 再生中のノートをクリア（一時停止時もクリア）
    const currentPlaybackNotes = new Set()
    state.setPlaybackNotes(currentPlaybackNotes)
    console.log('🎵 一時停止時に再生中のノートをクリアしました')
    
    // ライブ録音中のノートをクリア
    setLiveRecordingNotes(new Map())
    
    // キーボード入力の音をクリア
    keyboardAudioRef.current.clear()
    
    // スケジュールされたタイマーをクリア
    scheduledNotesRef.current.forEach(({ startTimeout, endTimeout }) => {
      clearTimeout(startTimeout)
      clearTimeout(endTimeout)
    })
    scheduledNotesRef.current.clear()
    
    // 再生中のオーディオノードを停止
    activeAudioNodesRef.current.forEach((audioNodes, noteId) => {
      if (audioNodes.isUnifiedSystem) {
        // 統一音声システムで管理されているノードは音IDを使用して停止
        if (audioNodes.soundId && window.unifiedAudioSystem) {
          try {
            window.unifiedAudioSystem.stopSound(audioNodes.soundId)
            console.log(`🎵 統一音声システムで管理されているノート ${noteId} (音ID: ${audioNodes.soundId}) を停止しました`);
          } catch (error) {
            console.error(`❌ ノート ${noteId} の停止に失敗:`, error);
          }
        } else {
          console.log(`🎵 統一音声システムで管理されているノート ${noteId} は自動的に停止されます`);
        }
      } else {
        // 従来のオーディオノードの場合は手動で停止
        if (audioNodes.oscillator) {
          audioNodes.oscillator.stop()
        }
        if (audioNodes.gainNode) {
          audioNodes.gainNode.gain.cancelScheduledValues(0)
          audioNodes.gainNode.gain.setValueAtTime(audioNodes.gainNode.gain.value, 0)
          audioNodes.gainNode.gain.linearRampToValueAtTime(0, 0.1)
        }
      }
    })
    activeAudioNodesRef.current.clear()
    
    // 再生ヘッドを即座に表示するため、強制的に再描画
    state.setNeedsRedraw(true)
    
    console.log('⏸️ EnhancedMidiEditor: Playback paused successfully')
  }, [])

  // スペースキー用の再生/停止切り替え関数
  const handlePlayPause = useCallback(() => {
    console.log('🎵 EnhancedMidiEditor handlePlayPause called:', {
      trackId,
      isPlayingRef: isPlayingRef.current,
      isPlaying: state.isPlaying,
      audioEnabled: state.audioEnabled
    })
    
    if (isPlayingRef.current) {
      console.log('⏸️ Space key pressed while playing, pausing')
      pausePlayback()
    } else {
      console.log('▶️ Space key pressed while paused, playing')
      startPlayback()
    }
  }, [startPlayback, pausePlayback, trackId, state.isPlaying, state.audioEnabled])

  // グローバル関数として公開（App.jsxから呼び出し可能）
  useEffect(() => {

    if (!window.midiEditorPlayPause) {
      window.midiEditorPlayPause = {}
    }
    window.midiEditorPlayPause[trackId] = handlePlayPause
    return () => {
  
      if (window.midiEditorPlayPause && window.midiEditorPlayPause[trackId]) {
        delete window.midiEditorPlayPause[trackId]
      }
    }
  }, [handlePlayPause, trackId])

  // 再生ヘッドの更新（改善版）
  useEffect(() => {
    if (!state.isPlaying) {
      // 再生停止時は再生中のノートをクリア
      state.setPlaybackNotes(new Set())
      // ライブ録音中のノートもクリア
      setLiveRecordingNotes(new Map())
      // キーボード入力の音もクリア
      keyboardAudioRef.current.clear()
      return
    }
    
    console.log('🎵 Starting playback head update')
    
    const updatePlaybackHead = async () => {
      if (!isPlayingRef.current) {
        return
      }
      
      try {
        const currentAudioTime = audio.getCurrentTime()
        const elapsedTime = currentAudioTime - playbackStartTimeRef.current
        
        // 再生バーは秒単位で動く（ノートの時間単位と合わせる）
        const newTime = Math.max(0, elapsedTime)
        

        
        state.setCurrentTime(newTime)

        // 🔍 [Bass Track Debug] playhead更新ログ
        console.log('🔍 [Bass Track Debug] playhead update:', {
          trackType: trackType,
          trackId: trackId,
          elapsedTime: elapsedTime,
          newTime: newTime,
          stateCurrentTime: state.currentTime,
          currentAudioTime: currentAudioTime,
          playbackStartTime: playbackStartTimeRef.current,
          isPlaying: state.isPlaying,
          timestamp: Date.now()
        });

        // 再生中のノートを更新
        const currentPlaybackNotes = new Set()
        
        // 既存のノートと新しく追加されたノートの両方をチェック
        const currentNotes = currentNotesRef.current || state.notes
        for (const note of currentNotes) {
          const noteStartTime = note.time
          const noteEndTime = note.time + note.duration
          
          // ノートが再生時間範囲内にあるかチェック
          if (newTime >= noteStartTime && newTime <= noteEndTime) {
            currentPlaybackNotes.add(note.id)
            
            // 新しく再生を開始するノートをチェック（再生開始の瞬間）
            if (newTime >= noteStartTime && newTime < noteStartTime + 0.016) { // 16ms以内
              // まだスケジュールされていないノートの場合、リアルタイムでスケジュール
              if (!scheduledNotesRef.current.has(note.id) && !activeAudioNodesRef.current.has(note.id)) {
                console.log('🎵 Real-time scheduling note:', note.id)
                
                const noteStartTime = playbackStartTimeRef.current + note.time
                const noteEndTime = noteStartTime + note.duration
                
                // ノート開始を即座に実行
                // 音の長さを分類
                const noteDurationType = classifyNoteDuration(note.duration)
                const isShort = isShortNote(note.duration)
                
                console.log(`🎵 リアルタイムノート分類: ${note.pitch} (${noteDurationType}) - 長さ: ${note.duration}秒, 短い音: ${isShort}`)
                
                // 音量はuseMidiAudioフック内で個別トラック音量 × マスターボリュームとして処理される
                console.log(`🎵 リアルタイム再生中のノート: ${note.pitch} (音量設定反映) - trackVolume=${trackVolume}, trackMuted=${trackMuted}, masterVolume=${masterVolume}`);
                
                // 非同期で音を再生（デバッグで成功した方法を採用）
                try {
                  const result = await audio.playScheduledNote(note.pitch, noteStartTime, note.duration, note.velocity)
                  if (result) {
                    // 統一音声システムから返される音の情報を保存
                    const audioNodeInfo = {
                      oscillator: result.oscillator || null,
                      gainNode: result.gainNode || null,
                      filter: result.filter || null,
                      endTime: result.endTime || (noteStartTime + note.duration),
                      isUnifiedSystem: true, // 統一音声システムで管理されていることをマーク
                      durationType: noteDurationType, // 音の長さ分類を保存
                      isShort: isShort, // 短い音かどうかを保存
                      soundId: result.soundId || null, // 統一音声システムの音ID
                      type: result.type || 'piano' // 音のタイプ
                    }
                    
                    activeAudioNodesRef.current.set(note.id, audioNodeInfo)
                    
                    // 再生中のノートとして即座に登録
                    currentPlaybackNotes.add(note.id)
                    console.log(`🎵 ノート ${note.id} をリアルタイム再生中ノートとして登録しました (${noteDurationType}, 音ID: ${result.soundId || 'N/A'})`)
                  }
                } catch (error) {
                  console.error(`❌ リアルタイムノート ${note.id} の再生に失敗:`, error)
                }
                
                // ノート終了をスケジュール（統一音声システムでは自動的に管理されるが、状態管理のため）
                const endDelay = Math.max(0, (noteEndTime - audio.getCurrentTime()) * 1000)
                const endTimeout = setTimeout(() => {
                  if (!isPlayingRef.current) return
                  
                  // 短い音の場合は特別な処理
                  const audioNodeInfo = activeAudioNodesRef.current.get(note.id)
                  if (audioNodeInfo && audioNodeInfo.isShort && noteDurationSettings.autoStopShortNotes) {
                    console.log(`🎵 リアルタイム短い音 ${note.id} (${note.pitch}) の再生を自動終了します`)
                    
                    // 短い音の場合は即座に停止
                    if (audioNodeInfo.isUnifiedSystem) {
                      // 統一音声システムで管理されている場合は音IDを使用して停止
                      if (audioNodeInfo.soundId && window.unifiedAudioSystem) {
                        try {
                          window.unifiedAudioSystem.stopSound(audioNodeInfo.soundId)
                          console.log(`🎵 統一音声システムで管理されているリアルタイム短い音 ${note.id} (音ID: ${audioNodeInfo.soundId}) を停止しました`)
                        } catch (error) {
                          console.error(`❌ リアルタイム短い音 ${note.id} の停止に失敗:`, error)
                        }
                      } else {
                        console.log(`🎵 統一音声システムで管理されているリアルタイム短い音 ${note.id} は自動的に停止されます`)
                      }
                    } else {
                      // 従来のオーディオノードの場合は手動で停止
                      if (audioNodeInfo.oscillator) {
                        audioNodeInfo.oscillator.stop()
                      }
                      if (audioNodeInfo.gainNode) {
                        audioNodeInfo.gainNode.gain.cancelScheduledValues(0)
                        audioNodeInfo.gainNode.gain.setValueAtTime(audioNodeInfo.gainNode.gain.value, 0)
                        audioNodeInfo.gainNode.gain.linearRampToValueAtTime(0, 0.05) // 短い音は素早くフェードアウト
                      }
                    }
                  }
                  
                  state.setPlaybackNotes(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(note.id)
                    return newSet
                  })
                  // オーディオノードをクリーンアップ（統一音声システムでは自動的に管理される）
                  activeAudioNodesRef.current.delete(note.id)
                }, endDelay)
                
                // スケジュール情報を保存（終了タイマーのみ）
                scheduledNotesRef.current.set(note.id, { startTimeout: null, endTimeout })
              }
            }
          }
        }
        
        // 再生中のノート状態を更新（変更があった場合のみ）
        const currentPlaybackNotesArray = Array.from(currentPlaybackNotes)
        const statePlaybackNotesArray = Array.from(state.playbackNotes)
        
        if (currentPlaybackNotesArray.length !== statePlaybackNotesArray.length ||
            !currentPlaybackNotesArray.every(id => statePlaybackNotesArray.includes(id))) {
          state.setPlaybackNotes(currentPlaybackNotes)
          console.log('🎵 再生中のノート状態を更新:', {
            current: currentPlaybackNotesArray,
            previous: statePlaybackNotesArray
          })
        }
        
        // ループ処理
        if (state.loopEnabled && newTime >= state.loopEnd) {
          console.log('🔄 [EnhancedMidiEditor] Loop end reached, resetting to start:', state.loopStart);
          state.setCurrentTime(state.loopStart)
          state.setPlaybackStartTime(currentAudioTime)
          playbackStartTimeRef.current = currentAudioTime
          
          // ループ時にスケジュールされたノートをクリア
          scheduledNotesRef.current.forEach(({ startTimeout, endTimeout }) => {
            if (startTimeout) clearTimeout(startTimeout)
            if (endTimeout) clearTimeout(endTimeout)
          })
          scheduledNotesRef.current.clear()
          activeAudioNodesRef.current.clear()

          // ループ開始位置からノートを再スケジュール
          console.log('🔄 [EnhancedMidiEditor] Re-scheduling notes for loop from:', state.loopStart);
          state.notes.forEach(note => {
            // ループ開始位置からの相対時間でスケジュール
            const noteStartTime = playbackStartTimeRef.current + note.time
            const noteEndTime = noteStartTime + note.duration
            const delay = Math.max(0, (noteStartTime - currentAudioTime) * 1000)

            // ノート開始をスケジュール
            const startTimeout = setTimeout(async () => {
              if (!isPlayingRef.current) return

              try {
                const result = await audio.playScheduledNote(note.pitch, noteStartTime, note.duration, note.velocity)
                if (result) {
                  state.setPlaybackNotes(prev => {
                    const newSet = new Set(prev)
                    newSet.add(note.id)
                    return newSet
                  })
                  activeAudioNodesRef.current.set(note.id, result)
                }
              } catch (error) {
                console.error('🎵 Error playing loop note:', error)
              }
            }, delay)

            // ノート終了をスケジュール
            const endTimeout = setTimeout(() => {
              if (activeAudioNodesRef.current.has(note.id)) {
                try {
                  const audioNode = activeAudioNodesRef.current.get(note.id)
                  if (audioNode && typeof audioNode.stop === 'function') {
                    audioNode.stop()
                  }
                } catch (error) {
                  console.error('🎵 Error stopping note:', error)
                }
                activeAudioNodesRef.current.delete(note.id)

                state.setPlaybackNotes(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(note.id)
                  return newSet
                })
              }
            }, delay + (note.duration * 1000))

            // スケジュール参照を保存
            scheduledNotesRef.current.set(note.id, {
              startTimeout,
              endTimeout
            })
          })
        }
        
        // ノートの最大時間を計算
        const maxNoteTime = state.notes.length > 0
          ? Math.max(...state.notes.map(note => (note.time || 0) + (note.duration || 1)))
          : 0;

        // 最大時間 + 余裕（5秒）を超えたら停止
        const effectiveEndTime = maxNoteTime + 5;

        // 再生終了処理
        if (!state.loopEnabled && newTime >= effectiveEndTime) {
          console.log('🎵 [EnhancedMidiEditor] Playback ended at:', newTime, 'effective end:', effectiveEndTime);
          stopPlayback()
          return
        }
        
        // 次の更新をスケジュール
        playbackRef.current = setTimeout(updatePlaybackHead, 16) // 60fps
        
      } catch (error) {
        console.error('🎵 Error in playback head update:', error)
        // エラーが発生した場合は再生を停止
        stopPlayback()
      }
    }
    
    // 初回更新を開始
    playbackRef.current = setTimeout(updatePlaybackHead, 16)
    
    return () => {
      if (playbackRef.current) {
        clearTimeout(playbackRef.current)
        playbackRef.current = null
      }
    }
  }, [state.isPlaying, state.tempo, state.loopEnabled, state.playbackDuration, stopPlayback])

  // BPM変更時のリアルタイム調整
  const handleTempoChange = useCallback((newTempo) => {
    // 再生中はBPM変更を無効にする
    if (state.isPlaying && isPlayingRef.current) {
      return
    }
    
    // グローバルBPMを更新（プロジェクトマネージャーで全トラックのノート位置が更新される）
    if (onGlobalTempoChange) {
      onGlobalTempoChange(newTempo)
    }
    
    // ローカル状態も更新
    state.setTempo(newTempo)
    
    // 再生時間と再生位置を調整
    const oldTempo = globalTempo
    const tempoRatio = oldTempo / newTempo
    
    // 再生時間も調整
    const newPlaybackDuration = state.playbackDuration * tempoRatio
    state.setPlaybackDuration(newPlaybackDuration)
    
    // 現在の再生位置も調整
    if (state.currentTime > 0) {
      const newCurrentTime = state.currentTime * tempoRatio
      state.setCurrentTime(newCurrentTime)
    }
    
    // 強制的に再描画
    state.setNeedsRedraw(true)
    

  }, [state.isPlaying, globalTempo, onGlobalTempoChange, state.setTempo, state.setPlaybackDuration, state.setCurrentTime, state.setNeedsRedraw]) // 🔧 修正: state.playbackDurationとstate.currentTimeを依存配列から削除（無限ループ防止）

  // コンテナのリサイズ監視
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // リサイズ監視
    const resizeObserver = new ResizeObserver(() => {
      state.setNeedsRedraw(true)
    })

    // ページレベルの横スクロール防止（ブラウザの戻る/進むを防ぐ）
    const handlePageWheel = (e) => {
      // 横スクロール（ブラウザの戻る/進むを防ぐ）
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch (error) {
          // passiveイベントリスナーの場合のエラーを無視
          console.warn('preventDefault failed in passive event listener:', error);
        }
        return false;
      }
    }

    // passive: falseでイベントリスナーを追加
    window.addEventListener('wheel', handlePageWheel, { passive: false })

    resizeObserver.observe(container)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('wheel', handlePageWheel)
    }
  }, [])

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (playbackRef.current) {
        clearTimeout(playbackRef.current)
      }
      if (metronomeRef.current) {
        clearTimeout(metronomeRef.current)
      }
      scheduledNotesRef.current.forEach(({ startTimeout, endTimeout }) => {
        clearTimeout(startTimeout)
        clearTimeout(endTimeout)
      })
      
      // オーディオノードをクリーンアップ
      activeAudioNodesRef.current.forEach((audioNodes, noteId) => {
          if (audioNodes.isUnifiedSystem) {
            // 統一音声システムで管理されているノードは自動的に停止される
            console.log(`🎵 統一音声システムで管理されているノート ${noteId} は自動的に停止されます`);
          } else {
            // 従来のオーディオノードの場合は手動で停止
            if (audioNodes.oscillator) {
              audioNodes.oscillator.stop()
            }
            if (audioNodes.gainNode) {
              audioNodes.gainNode.gain.cancelScheduledValues(0)
              audioNodes.gainNode.gain.setValueAtTime(audioNodes.gainNode.gain.value, 0)
              audioNodes.gainNode.gain.linearRampToValueAtTime(0, 0.1)
            }
          }
      })
      activeAudioNodesRef.current.clear()
      
      // オーディオフックのクリーンアップ
      audio.cleanup()
    }
  }, [])

  // ノート追加関数
  const addNote = useCallback(async (pitch, time, duration = 0.25, velocity = 0.8, options = {}) => {
    if (!trackId || !state.isInitialized) return
    
    const newNote = {
      id: Date.now() + Math.random(),
      pitch,
      time,
      duration,
      velocity,
      trackId
    }
    
    state.setNotes(prev => {
      const updatedNotes = [...prev, newNote]
      
      // 履歴に保存（同期的に実行）
      persistence.addToHistory(updatedNotes, `Add note ${newNote.id}`)
      
      return updatedNotes
    })
    
    // 音声再生（即座に再生）
    if (state.audioEnabled) {
      const result = await audio.playNote(pitch, velocity, Math.min(duration, 2))
    }
    
    // 再生中の場合、リアルタイムでスケジュール
    if (state.isPlaying && isPlayingRef.current) {
      const currentTime = state.currentTime
      const noteStartTime = newNote.time
      
      // ノートが現在の再生位置より後にある場合、スケジュール
      if (noteStartTime > currentTime) {
        const playbackStartTime = playbackStartTimeRef.current
        const scheduledNoteStartTime = playbackStartTime + noteStartTime
        const scheduledNoteEndTime = scheduledNoteStartTime + newNote.duration
        
        // ノート開始をスケジュール
        const startDelay = Math.max(0, (scheduledNoteStartTime - audio.getCurrentTime()) * 1000)
        const startTimeout = setTimeout(async () => {
          if (!isPlayingRef.current) return
          
          // 音量はuseMidiAudioフック内で個別トラック音量 × マスターボリュームとして処理される
          const result = await audio.playScheduledNote(newNote.pitch, scheduledNoteStartTime, newNote.duration, newNote.velocity)
          if (result) {
            state.setPlaybackNotes(prev => new Set([...prev, newNote.id]))
            activeAudioNodesRef.current.set(newNote.id, {
              oscillator: result.oscillator,
              gainNode: result.gainNode,
              filter: result.filter,
              endTime: result.endTime
            })
          }
        }, startDelay)
        
        // ノート終了をスケジュール
        const endDelay = Math.max(0, (scheduledNoteEndTime - audio.getCurrentTime()) * 1000)
        const endTimeout = setTimeout(() => {
          if (!isPlayingRef.current) return
          
          state.setPlaybackNotes(prev => {
            const newSet = new Set(prev)
            newSet.delete(newNote.id)
            return newSet
          })
          activeAudioNodesRef.current.delete(newNote.id)
        }, endDelay)
        
        // スケジュール情報を保存
        scheduledNotesRef.current.set(newNote.id, { startTimeout, endTimeout })
      }
    }
    
    state.setLastInputTime(Date.now())

    // 🔴 CRITICAL FIX: フレーズロック中は全ての予測生成をブロック
    const engine = window.magentaGhostTextEngine
    const phraseSession = engine?.currentPhraseSession
    const isPhraseLocked = phraseSession?.locked || false

    // Ghost Text予測の処理（skipPredictionフラグまたはフレーズロック中はスキップ）
    // 🚨 CRITICAL FIX: TAB承認時は予測生成をスキップ
    if (!options.skipPrediction && !isPhraseLocked) {
      ghostText.processMidiInput(newNote)
      console.log('🎵 processMidiInput called (skipPrediction=false, phrase unlocked)')
    } else {
      console.log('⏭️ processMidiInput skipped', {
        skipPrediction: options.skipPrediction || false,
        isPhraseLocked,
        reason: options.skipPrediction ? 'skipPrediction=true' : isPhraseLocked ? 'Phrase session locked' : 'unknown'
      })
    }
    
    // 親コンポーネントに即座に通知
    if (onNoteAdd) onNoteAdd(newNote)

    // チュートリアル用イベント発火: ノートが追加された
    window.dispatchEvent(new CustomEvent('tutorial:note-added'))

    // 親コンポーネントにMIDIデータ更新を通知
    setTimeout(() => {
      if (onMidiDataUpdate) {
        const currentNotes = state.notes
        const updateData = {
          notes: [...currentNotes, newNote],
          trackId: trackId,
          lastModified: new Date().toISOString(),
          metadata: {
            modified: new Date().toISOString(),
            noteCount: currentNotes.length + 1
          },
          settings: {
            channel: 0,
            octave: 0,
            transpose: 0,
            velocity: 100
          }
        }
        onMidiDataUpdate(updateData)
      }
    }, 0)
  }, [trackId, state.audioEnabled, onNoteAdd, persistence, ghostText, state.isPlaying, audio]) // 🔧 修正: state.notesを依存配列から削除（無限ループ防止）

  // 🎲 [NEW] Weighted random selection utility (Issue #153)
  const weightedRandomSelect = useCallback((items) => {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0)
    const randomValue = Math.random()
    let random = randomValue * totalWeight

    console.log('🎲 [WEIGHTED_RANDOM] Selection process:', {
      totalWeight,
      randomValue: randomValue.toFixed(4),
      randomWeighted: random.toFixed(4),
      items: items.map(i => ({ type: i.type, weight: i.weight }))
    })

    for (const item of items) {
      random -= (item.weight || 1)
      console.log(`🎲 [WEIGHTED_RANDOM] Checking ${item.type}: random=${random.toFixed(4)} (${random <= 0 ? '✅ SELECTED' : '❌ continue'})`)
      if (random <= 0) {
        console.log(`🎲 [WEIGHTED_RANDOM] Final selection: ${item.type}`)
        return item
      }
    }

    console.log('🎲 [WEIGHTED_RANDOM] Fallback to first item:', items[0].type)
    return items[0]
  }, [])

  // 📊 [NEW] Diversity metrics tracking (Issue #153)
  const diversityMetricsRef = useRef({
    phraseCount: 0,
    ghostCount: 0,
    consecutivePhraseCount: 0,
    consecutiveGhostCount: 0,
    lastSource: null
  })

  // 🔴 [ENHANCED] Wrapper function for acceptNextGhostNote with probabilistic selection (Issue #153)
  const acceptNextGhostNote = useCallback(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎲 [DIVERSITY_DEBUG] acceptNextGhostNote called')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Check availability of both prediction types
    const hasPhraseNotes = (ghostText.phraseNotes && ghostText.phraseNotes.length > 0 && ghostText.nextPhraseIndex < ghostText.phraseNotes.length) ||
                           (ghostText.phraseSets && ghostText.phraseSets.length > 0 &&
                            ghostText.phraseSets[ghostText.selectedPhraseSetIndex || 0] &&
                            ghostText.nextPhraseIndex < ghostText.phraseSets[ghostText.selectedPhraseSetIndex || 0].length)
    const hasGhostPredictions = ghostText.ghostPredictions && ghostText.ghostPredictions.length > 0 && ghostText.nextGhostIndex < ghostText.ghostPredictions.length

    console.log('🔍 [DIVERSITY_DEBUG] Availability check:', {
      hasPhraseNotes,
      hasGhostPredictions,
      phraseNotesLength: ghostText.phraseNotes?.length || 0,
      nextPhraseIndex: ghostText.nextPhraseIndex,
      ghostPredictionsLength: ghostText.ghostPredictions?.length || 0,
      nextGhostIndex: ghostText.nextGhostIndex
    })

    // If neither available, warn and exit
    if (!hasPhraseNotes && !hasGhostPredictions) {
      console.warn('⚠️ [DIVERSITY_DEBUG] No notes available to approve')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      return
    }

    let selectedType = null

    // 🎲 Probabilistic selection when both are available
    if (hasPhraseNotes && hasGhostPredictions) {
      const metrics = diversityMetricsRef.current

      console.log('📊 [DIVERSITY_DEBUG] Current metrics:', {
        phraseCount: metrics.phraseCount,
        ghostCount: metrics.ghostCount,
        consecutivePhraseCount: metrics.consecutivePhraseCount,
        consecutiveGhostCount: metrics.consecutiveGhostCount,
        lastSource: metrics.lastSource
      })

      // 🔧 Dynamic probability adjustment to avoid monotony
      let phraseWeight = 0.6
      let ghostWeight = 0.4

      // If same source used consecutively 3+ times, reduce its weight
      if (metrics.consecutivePhraseCount >= 3) {
        phraseWeight = 0.3
        ghostWeight = 0.7
        console.log('🎲 [DIVERSITY_DEBUG] Diversity boost: Reducing phrase weight due to consecutive use')
        console.log('   Consecutive phrase count:', metrics.consecutivePhraseCount)
      } else if (metrics.consecutiveGhostCount >= 3) {
        phraseWeight = 0.7
        ghostWeight = 0.3
        console.log('🎲 [DIVERSITY_DEBUG] Diversity boost: Reducing ghost weight due to consecutive use')
        console.log('   Consecutive ghost count:', metrics.consecutiveGhostCount)
      }

      const predictionTypes = [
        { type: 'phrase', weight: phraseWeight },
        { type: 'ghost', weight: ghostWeight }
      ]

      selectedType = weightedRandomSelect(predictionTypes).type
      console.log(`🎲 [DIVERSITY_DEBUG] Probabilistic selection result:`)
      console.log(`   Selected: ${selectedType}`)
      console.log(`   Weights: phrase=${phraseWeight}, ghost=${ghostWeight}`)
    } else if (hasPhraseNotes) {
      selectedType = 'phrase'
      console.log('🎯 [DIVERSITY_DEBUG] Only phrase predictions available')
    } else {
      selectedType = 'ghost'
      console.log('🎯 [DIVERSITY_DEBUG] Only ghost predictions available')
    }

    // Execute selected prediction type
    let result = null
    if (selectedType === 'phrase') {
      console.log('🎯 [DIVERSITY_DEBUG] Accepting next phrase note')
      result = ghostText.acceptNextPhraseNote(state.notes, addNote)
      console.log('📋 [DIVERSITY_DEBUG] acceptNextPhraseNote result:', result)

      if (result.success) {
        console.log('✅ [DIVERSITY_DEBUG] Phrase note accepted successfully')

        // Update diversity metrics
        diversityMetricsRef.current.phraseCount++
        diversityMetricsRef.current.consecutivePhraseCount++
        diversityMetricsRef.current.consecutiveGhostCount = 0
        diversityMetricsRef.current.lastSource = 'phrase'

        console.log('📊 [DIVERSITY_DEBUG] Updated metrics after phrase:', {
          phraseCount: diversityMetricsRef.current.phraseCount,
          consecutivePhraseCount: diversityMetricsRef.current.consecutivePhraseCount,
          consecutiveGhostCount: diversityMetricsRef.current.consecutiveGhostCount
        })
      } else {
        console.warn('⚠️ [DIVERSITY_DEBUG] Phrase note acceptance failed:', result.message)
      }
    } else {
      console.log('🎯 [DIVERSITY_DEBUG] Accepting next ghost note')
      result = ghostText.acceptNextGhostNote(state.notes, addNote)
      console.log('📋 [DIVERSITY_DEBUG] acceptNextGhostNote result:', result)

      if (result.success) {
        console.log('✅ [DIVERSITY_DEBUG] Ghost note accepted successfully')

        // Update diversity metrics
        diversityMetricsRef.current.ghostCount++
        diversityMetricsRef.current.consecutiveGhostCount++
        diversityMetricsRef.current.consecutivePhraseCount = 0
        diversityMetricsRef.current.lastSource = 'ghost'

        console.log('📊 [DIVERSITY_DEBUG] Updated metrics after ghost:', {
          ghostCount: diversityMetricsRef.current.ghostCount,
          consecutiveGhostCount: diversityMetricsRef.current.consecutiveGhostCount,
          consecutivePhraseCount: diversityMetricsRef.current.consecutivePhraseCount
        })
      } else {
        console.warn('⚠️ [DIVERSITY_DEBUG] Ghost note acceptance failed:', result.message)
      }
    }

    // Log diversity statistics periodically
    const metrics = diversityMetricsRef.current
    const totalCount = metrics.phraseCount + metrics.ghostCount

    console.log('📊 [DIVERSITY_DEBUG] Current total count:', totalCount)

    if (totalCount > 0 && totalCount % 10 === 0) {
      const phrasePercentage = ((metrics.phraseCount / totalCount) * 100).toFixed(1)
      const ghostPercentage = ((metrics.ghostCount / totalCount) * 100).toFixed(1)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`📊 [DIVERSITY_STATS] 10回ごとの統計レポート:`)
      console.log(`   Phrase: ${phrasePercentage}% (${metrics.phraseCount}回)`)
      console.log(`   Ghost: ${ghostPercentage}% (${metrics.ghostCount}回)`)
      console.log(`   Total: ${totalCount}回`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Check if same phrase pattern repeating too much
      const samePatternRate = Math.max(metrics.consecutivePhraseCount, metrics.consecutiveGhostCount) / totalCount
      if (samePatternRate > 0.2) {
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.warn(`⚠️ [DIVERSITY_WARNING] 高い繰り返し率を検出:`)
        console.warn(`   繰り返し率: ${(samePatternRate * 100).toFixed(1)}%`)
        console.warn(`   連続Phrase: ${metrics.consecutivePhraseCount}回`)
        console.warn(`   連続Ghost: ${metrics.consecutiveGhostCount}回`)
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎲 [DIVERSITY_DEBUG] acceptNextGhostNote completed')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // チュートリアル用イベント発火: Ghost Textが承認された
    if (result && result.success) {
      window.dispatchEvent(new CustomEvent('tutorial:completion-accepted'))
    }
  }, [ghostText, state.notes, addNote, weightedRandomSelect])

  // ノート削除関数
  const removeNote = useCallback((noteId) => {
    if (!trackId || !state.isInitialized) return

    state.setNotes(prev => {
      const updatedNotes = prev.filter(note => note.id !== noteId)

      // 履歴に保存（同期的に実行）
      persistence.addToHistory(updatedNotes, `Remove note ${noteId}`)

      return updatedNotes
    })

    // 再生中のスケジュールをクリア
    if (scheduledNotesRef.current.has(noteId)) {
      const { startTimeout, endTimeout } = scheduledNotesRef.current.get(noteId)
      if (startTimeout) clearTimeout(startTimeout)
      if (endTimeout) clearTimeout(endTimeout)
      scheduledNotesRef.current.delete(noteId)

      console.log('🎵 Cleared scheduled note:', noteId)
    }

    // 再生中のオーディオノードを停止
    if (activeAudioNodesRef.current.has(noteId)) {
      const audioNodes = activeAudioNodesRef.current.get(noteId)
      if (audioNodes.isUnifiedSystem) {
        // 統一音声システムで管理されているノードは自動的に停止される
        console.log(`🎵 統一音声システムで管理されているノート ${noteId} は自動的に停止されます`);
      } else {
        // 従来のオーディオノードの場合は手動で停止
        if (audioNodes.oscillator) {
          audioNodes.oscillator.stop()
        }
        if (audioNodes.gainNode) {
          audioNodes.gainNode.gain.cancelScheduledValues(0)
          audioNodes.gainNode.gain.setValueAtTime(audioNodes.gainNode.gain.value, 0)
          audioNodes.gainNode.gain.linearRampToValueAtTime(0, 0.1)
        }
      }
      activeAudioNodesRef.current.delete(noteId)

      console.log('🎵 Stopped playing note:', noteId)
    }

    // 選択状態からも削除
    state.setSelectedNotes(prev => {
      const newSet = new Set(prev)
      newSet.delete(noteId)
      return newSet
    })
    state.setNeedsRedraw(true)

    // 親コンポーネントに即座に通知
    if (onNoteRemove) onNoteRemove(noteId)

    // 親コンポーネントにMIDIデータ更新を通知
    setTimeout(() => {
      if (onMidiDataUpdate) {
        const currentNotes = state.notes.filter(note => note.id !== noteId)
        const updateData = {
          notes: currentNotes,
          trackId: trackId,
          lastModified: new Date().toISOString(),
          metadata: {
            modified: new Date().toISOString(),
            noteCount: currentNotes.length
          },
          settings: {
            channel: 0,
            octave: 0,
            transpose: 0,
            velocity: 100
          }
        }
        onMidiDataUpdate(updateData)
      }
    }, 0)
  }, [trackId, onNoteRemove, persistence]) // 🔧 修正: state.isInitializedを依存配列から削除

  // 🔴 [NEW] Wrapper function for undoLastGhostApproval (Issue #146)
  const undoLastGhostApproval = useCallback(() => {
    console.log('↩️ Undoing last approval')
    const result = ghostText.undoLastGhostApproval(state.notes, removeNote)
    if (result.success) {
      console.log('✅ Approval undone')
    } else {
      console.warn('⚠️ Nothing to undo')
    }
  }, [ghostText, state.notes, removeNote])

  // Keep acceptAllGhostPredictions for backward compatibility or fallback
  const acceptAllGhostPredictions = useCallback(() => {
    const hasPhrasePredictions = (ghostText.phraseNotes && ghostText.phraseNotes.length > 0) ||
                                 (ghostText.phraseSets && ghostText.phraseSets.length > 0)
    const hasGhostPredictions = ghostText.ghostPredictions && ghostText.ghostPredictions.length > 0

    console.log('🎹 acceptAllGhostPredictions (fallback): 実行開始', {
      hasPhrasePredictions,
      hasGhostPredictions,
      phraseNotesCount: ghostText.phraseNotes?.length || 0,
      ghostPredictionsCount: ghostText.ghostPredictions?.length || 0
    })

    // フレーズ予測を優先して採用
    if (hasPhrasePredictions) {
      console.log('🎵 フレーズ予測を採用')
      ghostText.acceptAllPhrasePredictions(state.notes, addNote)
    }
    // フレーズ予測がない場合は通常予測を採用
    else if (hasGhostPredictions) {
      console.log('👻 通常Ghost Text予測を採用')
      ghostText.acceptAllGhostPredictions(state.notes, addNote)
    } else {
      console.warn('⚠️ 採用可能な予測がありません')
    }
  }, [ghostText, state.notes, addNote])

  // グローバルGhost Text補完イベントのリスナー (Issue #146: 1音ずつ承認に変更)
  useEffect(() => {
    const handleGlobalAcceptGhostText = (event) => {
      console.log('🔍 [DEBUG] accept-ghost-text-global listener triggered', {
        isActive,
        shiftKey: event.detail.shiftKey
      })

      if (!isActive) {
        console.log('⚠️ Not active, ignoring event')
        return // アクティブなタブのみ処理
      }

      const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      console.log('🔍 [DIVERSITY_DEBUG][EVENT_LISTENER] EnhancedMidiEditor リスナー開始:', {
        executionId,
        eventDetail: event.detail,
        dispatchSource: event.detail?.dispatchSource,
        dispatchTime: event.detail?.dispatchTime,
        currentTime: Date.now(),
        delay: Date.now() - (event.detail?.dispatchTime || Date.now()),
        shiftKey: event.detail.shiftKey,
        hasPhrasePredictions: (ghostText.phraseNotes?.length > 0) || (ghostText.phraseSets?.length > 0),
        hasGhostPredictions: ghostText.ghostPredictions?.length > 0,
        nextPhraseIndex: ghostText.nextPhraseIndex,
        nextGhostIndex: ghostText.nextGhostIndex,
        step: 'listener_entry'
      })

      if (event.detail.shiftKey) {
        // 🔴 [CHANGED] Shift+Tab: Undo last approval
        console.log('↩️ Shift+Tab: Undoing last approval')
        undoLastGhostApproval()
      } else {
        // 🔴 [FIXED] Tab: Direct acceptance without wrapper function
        const hasPhrasePredictions = (ghostText.phraseNotes?.length > 0) || (ghostText.phraseSets?.length > 0)
        const hasGhostPredictions = ghostText.ghostPredictions?.length > 0

        if (hasPhrasePredictions) {
          console.log('🔍 [DIVERSITY_DEBUG][EVENT_LISTENER] フレーズ承認実行:', {
            executionId,
            phraseNotesCount: (ghostText.phraseNotes?.length || 0) + (ghostText.phraseSets?.[ghostText.selectedPhraseSetIndex || 0]?.length || 0),
            nextPhraseIndex: ghostText.nextPhraseIndex,
            step: 'phrase_approval'
          })

          // 🔍 DEEP DEBUG: ghostText構造全体の確認
          console.log('🔍 [DIVERSITY_DEBUG][DEEP_DEBUG] ghostText object keys:', Object.keys(ghostText))
          console.log('🔍 [DIVERSITY_DEBUG][DEEP_DEBUG] ghostText.engine exists:', !!ghostText.engine)
          console.log('🔍 [DIVERSITY_DEBUG][DEEP_DEBUG] ghostText.phraseNotes structure:', ghostText.phraseNotes?.map(note => ({
            time: note.time,
            pitch: note.pitch,
            hasTimeProperty: 'time' in note
          })))
          console.log('🔍 [DIVERSITY_DEBUG][DEEP_DEBUG] ghostText.phraseSets structure:', {
            phraseSetsLength: ghostText.phraseSets?.length,
            selectedIndex: ghostText.selectedPhraseSetIndex,
            currentSetLength: ghostText.phraseSets?.[ghostText.selectedPhraseSetIndex || 0]?.length,
            firstSetPreview: ghostText.phraseSets?.[0]?.slice(0, 3)
          })
          console.log('🔍 [DIVERSITY_DEBUG][DEEP_DEBUG] Current phrase session:', ghostText.engine?.currentPhraseSession)
          console.log('🔍 [DIVERSITY_DEBUG][DEEP_DEBUG] Phrase notes before approval:', ghostText.phraseNotes?.length)
          console.log('🔍 [DIVERSITY_DEBUG][DEEP_DEBUG] Phrase sets before approval:', ghostText.phraseSets?.length)

          // 🔍 DEEP DEBUG: acceptNextPhraseNote結果の詳細
          const result = ghostText.acceptNextPhraseNote(state.notes, addNote)
          console.log('🔍 [DIVERSITY_DEBUG][DEEP_DEBUG] acceptNextPhraseNote result:', result)
          console.log('🔍 [DIVERSITY_DEBUG][DEEP_DEBUG] acceptNextPhraseNote result type:', typeof result)
          console.log('🔍 [DIVERSITY_DEBUG][DEEP_DEBUG] Phrase notes after approval:', ghostText.phraseNotes?.length)
          console.log('🔍 [DIVERSITY_DEBUG][DEEP_DEBUG] New phrase session:', ghostText.engine?.currentPhraseSession?.id)

          if (result && result.success) {
            console.log('🎯 Phrase note approved successfully')

            // 🎓 [TUTORIAL_FIX] チュートリアル実行中は承認イベントを発火
            const isTutorialActive = !localStorage.getItem('dawai_tutorial_completed')
            if (isTutorialActive) {
              console.log('🎓 [TUTORIAL_FIX] チュートリアル実行中 - tutorial:completion-acceptedイベントを発火 (Phrase)')
              window.dispatchEvent(new CustomEvent('tutorial:completion-accepted'))
            }
          } else {
            console.log('⚠️ Failed to approve phrase note:', result)
          }
        } else if (hasGhostPredictions) {
          console.log('🔍 [LISTENER_2] Ghost承認実行:', {
            executionId,
            ghostPredictionsCount: ghostText.ghostPredictions.length,
            nextGhostIndex: ghostText.nextGhostIndex,
            step: 'ghost_approval'
          })
          const result = ghostText.acceptNextGhostNote(state.notes, addNote)
          if (result && result.success) {
            console.log('🎯 Ghost note approved successfully')

            // 🎓 [TUTORIAL_FIX] チュートリアル実行中は承認イベントを発火
            const isTutorialActive = !localStorage.getItem('dawai_tutorial_completed')
            if (isTutorialActive) {
              console.log('🎓 [TUTORIAL_FIX] チュートリアル実行中 - tutorial:completion-acceptedイベントを発火 (Ghost)')
              window.dispatchEvent(new CustomEvent('tutorial:completion-accepted'))
            }
          } else {
            console.log('⚠️ Failed to approve ghost note:', result)
          }
        } else {
          console.warn('🔍 [LISTENER_2] 承認可能な予測なし:', {
            executionId,
            step: 'no_predictions'
          })
        }

      console.log('🔍 [LISTENER_2] リスナー処理完了:', {
        executionId,
        timestamp: Date.now()
      })
      }
    }

    window.addEventListener('accept-ghost-text-global', handleGlobalAcceptGhostText)

    return () => {
      window.removeEventListener('accept-ghost-text-global', handleGlobalAcceptGhostText)
    }
  }, [isActive, ghostText, state.notes, addNote, undoLastGhostApproval])

  // ノート編集関数
  const editNote = useCallback((noteId, changes) => {
    if (!trackId || !state.isInitialized) return
    

    
    state.setNotes(prev => {
      const updatedNotes = prev.map(note => 
        note.id === noteId ? { ...note, ...changes } : note
      )
      
      // 履歴に保存（同期的に実行）
      persistence.addToHistory(updatedNotes, `Edit note ${noteId}`)
      
      return updatedNotes
    })
    
    // 編集後のノートをMagentaに送信
    const editedNote = state.notes.find(note => note.id === noteId)
    if (editedNote) {
      ghostText.processMidiInput({ ...editedNote, ...changes })
    }
    
    // 親コンポーネントに即座に通知
    if (onNoteEdit) onNoteEdit(noteId, changes)
    
    // 親コンポーネントにMIDIデータ更新を通知
    setTimeout(() => {
      if (onMidiDataUpdate) {
        const currentNotes = state.notes.map(note => 
          note.id === noteId ? { ...note, ...changes } : note
        )
        const updateData = {
          notes: currentNotes,
          trackId: trackId,
          lastModified: new Date().toISOString(),
          metadata: {
            modified: new Date().toISOString(),
            noteCount: currentNotes.length
          },
          settings: {
            channel: 0,
            octave: 0,
            transpose: 0,
            velocity: 100
          }
        }
        onMidiDataUpdate(updateData)
      }
    }, 0)
  }, [trackId, onNoteEdit, persistence, ghostText]) // 🔧 修正: state.notesを依存配列から削除（無限ループ防止）

  // ノートドラッグ終了処理
  const finalizeNoteDrag = useCallback((noteId, changes) => {
    if (!trackId || !state.isInitialized) return
    

    
    state.setNotes(prev => {
      const updatedNotes = prev.map(note => 
        note.id === noteId ? { ...note, ...changes } : note
      )
      
      // 履歴に保存（同期的に実行）
      persistence.addToHistory(updatedNotes, `Drag note ${noteId}`)
      
      return updatedNotes
    })
    
    // ドラッグ後のノートをMagentaに送信
    const draggedNote = state.notes.find(note => note.id === noteId)
    if (draggedNote) {
      ghostText.processMidiInput({ ...draggedNote, ...changes })
    }
    
    if (onNoteEdit) onNoteEdit(noteId, changes)
  }, [trackId, onNoteEdit, persistence, ghostText]) // 🔧 修正: state.notesを依存配列から削除（無限ループ防止）

  // 複数ノートドラッグ終了処理
  const finalizeMultiNoteDrag = useCallback((updatedNotes) => {
    if (!trackId || !state.isInitialized) return
    

    
    // Magentaに全ノートの最新状態を送信（代表的なノートを使う）
    if (updatedNotes.length > 0) {
      ghostText.processMidiInput(updatedNotes[updatedNotes.length - 1])
    }
    
    // 同期的にノート状態を更新（重複チェック付き）
    state.setNotes(prev => {
      // 既に同じ状態の場合は更新をスキップ
      const updatedNotesMap = new Map(updatedNotes.map(note => [note.id, note]))
      const newNotes = prev.map(note => 
        updatedNotesMap.has(note.id) ? updatedNotesMap.get(note.id) : note
      )
      
      // 状態が実際に変更されたかチェック（より厳密な比較）
      const hasChanges = updatedNotes.some(updatedNote => {
        const prevNote = prev.find(note => note.id === updatedNote.id)
        if (!prevNote) return true // 新しいノート
        return prevNote.time !== updatedNote.time || 
               prevNote.pitch !== updatedNote.pitch ||
               prevNote.duration !== updatedNote.duration ||
               prevNote.velocity !== updatedNote.velocity
      })
      
      if (!hasChanges) {

        return prev
      }
      

      
              // 状態更新後に親コンポーネントに通知
        setTimeout(() => {
          if (onMidiDataUpdate) {

              // 更新時刻を記録
              lastParentUpdateRef.current[trackId] = Date.now()
              
              onMidiDataUpdate({
                notes: newNotes,
                trackId: trackId,
                lastModified: new Date().toISOString(),
                metadata: {
                  modified: new Date().toISOString(),
                  noteCount: newNotes.length,
                  type: 'multi-note-drag'
                },
                settings: {
                  channel: 0,
                  octave: 0,
                  transpose: 0,
                  velocity: 100
                }
              })
          } else {
            // フォールバック: 個別のonNoteEditを呼び出す（従来の動作）
            updatedNotes.forEach(note => {
              if (onNoteEdit) onNoteEdit(note.id, { time: note.time, pitch: note.pitch })
            })
          }
          

          

        }, 50) // 状態更新の完了を待つ時間を増加
      
      return newNotes
    })
    
    // 履歴に保存（状態更新後に実行）
    setTimeout(() => {
      // 複数ノートドラッグ中は履歴保存をスキップ（finalizeMultiNoteDragで処理済み）
      if (!state.isDraggingMultipleNotes) {
        persistence.addToHistory(updatedNotes, `Multi-drag ${updatedNotes.length} notes`)
      }
    }, 10)
  }, [trackId, onMidiDataUpdate, onNoteEdit, persistence]) // 🔧 修正: state.isInitializedを依存配列から削除







  // イベントハンドラーの初期化
  const eventHandlers = MidiEditorEventHandlers({
    state,
    coordinateTransforms,
    GRID_HEIGHT,
    GRID_WIDTH,
    PIANO_WIDTH,
    HEADER_HEIGHT,
    NOTE_HEIGHT,
    OCTAVE_RANGE,
    LONG_PRESS_THRESHOLD,
    dynamicCanvasRef,
    containerRef,
    longPressTimerRef,
    audio,
    addNote,
    finalizeNoteDrag,
    finalizeMultiNoteDrag,
    noteOperations,
    startPlayback,
    pausePlayback,
    isActive,
    trackId
  })













  // Ghost Text予測の受け入れは専用フックで処理
  const acceptGhostPrediction = useCallback((predictionIndex = 0) => {
    ghostText.acceptGhostPrediction(predictionIndex, state.notes, addNote)
  }, [ghostText, state.notes, addNote])

  // Ghost Textのトグルは専用フックで処理
  const toggleGhostText = useCallback(() => {
    ghostText.toggleGhostText()
  }, [ghostText])
  






  
  // 選択されたノートをコピー

  return (
    <div
      className="flex flex-col bg-gray-900 text-white midi-editor-container h-full"
      data-tutorial="piano-roll"
      style={{
        overscrollBehavior: 'none'
      }}
    >
      {/* Piano track専用: 初期化進捗表示 */}
      {trackType === 'piano' && <AudioInitializationProgress />}

      {/* ツールバー */}
      {!hideHeader && (
        <MidiEditorToolbar
        // 再生関連
        isPlaying={state.isPlaying}
        onPlayPause={async (e) => {
          e.preventDefault()
          e.stopPropagation()
          
          console.log('🎵 Play/Pause button clicked:', {
            isPlaying: state.isPlaying,
            isPlayingRef: isPlayingRef.current,
            notesLength: state.notes.length,
            audioEnabled: state.audioEnabled
          })
          
          try {
            if (isPlayingRef.current) {
              console.log('🎵 Pausing playback...')
              pausePlayback()
            } else {
              console.log('🎵 Starting playback...')
              await startPlayback()
            }
          } catch (error) {
            console.error('❌ Playback error:', error)
          }
        }}
        onStop={() => {
          console.log('🎵 Stop button clicked')
          stopPlayback()
        }}
        notesLength={state.notes.length}
        
        // 操作関連
        onUndo={undoLastAction}
        canUndo={state.isInitialized && persistence.getHistoryInfo().canUndo}
        onRedo={redoLastAction}
        canRedo={state.isInitialized && persistence.getHistoryInfo().canRedo}
        onShowDeleteConfirm={() => state.setShowDeleteConfirm(true)}
        
        // オーディオ関連
        audioEnabled={state.audioEnabled}
        onToggleAudio={() => {
          console.log('🎵 Toggling audio:', !state.audioEnabled)
          state.setAudioEnabled(!state.audioEnabled)
        }}
        
        // テンポ関連
        tempo={globalTempo}
        onTempoChange={handleTempoChange}
        
        // ループ・メトロノーム関連
        loopEnabled={state.loopEnabled}
        onToggleLoop={() => {
          const newLoopEnabled = !state.loopEnabled;
          console.log('🎵 Toggling loop:', newLoopEnabled);

          // ループ有効化時にスマート区間設定
          if (newLoopEnabled && state.loopStart === 0 && state.loopEnd === 4) {
            // デフォルト値のままの場合のみ自動設定
            const secondsPerBeat = 60 / state.tempo;

            // プロジェクトマネージャーから拍子設定を取得（動的）
            let beatsPerBar = 4; // デフォルト4拍子
            try {
              const project = window.projectManager?.getProject();
              const currentTrack = project?.tracks?.find(t => t.id === trackId);
              if (currentTrack?.midiData?.timeSignature) {
                const [numerator] = currentTrack.midiData.timeSignature.split('/').map(Number);
                if (numerator && numerator > 0) {
                  beatsPerBar = numerator;
                  console.log('🎵 Using time signature from project:', currentTrack.midiData.timeSignature);
                }
              }
            } catch (error) {
              console.warn('🎵 Failed to get time signature, using default 4/4:', error);
            }

            const secondsPerBar = secondsPerBeat * beatsPerBar;

            if (state.notes.length > 0) {
              // 選択ノートまたは全ノートに基づいて設定
              const selectedNoteArray = Array.from(state.selectedNotes).map(id =>
                state.notes.find(n => `${n.pitch}-${n.time}` === id)
              ).filter(Boolean);

              const relevantNotes = selectedNoteArray.length > 0 ? selectedNoteArray : state.notes;

              const minTime = Math.min(...relevantNotes.map(n => n.time));
              const maxTime = Math.max(...relevantNotes.map(n => n.time + n.duration));

              // 小節単位に丸める
              let loopStart = Math.floor(minTime / secondsPerBar) * secondsPerBar;
              let loopEnd = Math.ceil(maxTime / secondsPerBar) * secondsPerBar;

              // ループ区間の検証: 最低1小節は確保
              if (loopEnd <= loopStart) {
                loopEnd = loopStart + secondsPerBar;
                console.warn('🎵 Loop end was <= loop start, adjusted to minimum 1 bar');
              }

              state.setLoopStart(loopStart);
              state.setLoopEnd(loopEnd);

              console.log('🎵 Smart loop region set:', { loopStart, loopEnd, secondsPerBar, beatsPerBar });
            } else {
              // ノートがない場合は4小節をデフォルトに
              state.setLoopStart(0);
              state.setLoopEnd(secondsPerBar * 4);
            }
          }

          state.setLoopEnabled(newLoopEnabled);
          // 外部コールバックがあれば呼び出し
          if (externalOnLoopChange) {
            externalOnLoopChange(newLoopEnabled);
          }
        }}
        metronomeEnabled={state.metronomeEnabled}
        onToggleMetronome={() => {
          console.log('🎵 Toggling metronome:', !state.metronomeEnabled)
          state.setMetronomeEnabled(!state.metronomeEnabled)
        }}
        
        // ズーム関連
        zoom={state.zoom}
        onZoomChange={(value) => state.setZoom(value)}
        
        // Ghost Text関連
        ghostTextEnabled={ghostText.ghostTextEnabled}
        onToggleGhostText={ghostText.toggleGhostText}
        showGhostText={ghostText.showGhostText}
        onToggleShowGhostText={ghostText.toggleShowGhostText}

        // 承認待ちノート数 (ghostPredictions + phraseNotesの合計)
        pendingNotesCount={(() => {
          const ghostCount = ghostText.ghostPredictions?.length || 0
          const phraseCount = ghostText.phraseSets?.length > 0
            ? (ghostText.phraseSets[ghostText.selectedPhraseSetIndex || 0]?.length || 0)
            : 0
          return ghostCount + phraseCount
        })()}

        // 設定関連
        showSettings={false}
        onToggleSettings={onOpenSettings}

        // 音色設定関連
        onOpenSoundSettings={instrumentSettings.openSettingsPanel}

        // 🆕 補完機能関連
        onAcceptPrediction={() => {
          console.log('✅ [TOOLBAR] 補完承認ボタン - TABキーエミュレーション実行')

          // 🚨 [TAB_EMULATION] TABキーイベントを作成・発火してTABキーと同じ動作を実現
          const tabEvent = new KeyboardEvent('keydown', {
            key: 'Tab',
            code: 'Tab',
            which: 9,
            keyCode: 9,
            bubbles: true,
            cancelable: true
          });

          console.log('🔧 [TAB_EMULATION] TABキーイベント発火中:', tabEvent)
          document.dispatchEvent(tabEvent);

          console.log('✅ [TAB_EMULATION] TABキーエミュレーション完了')
        }}
        onUndoApproval={() => {
          console.log('↩️ [TOOLBAR] 承認取り消しボタン - Shift+TABキーエミュレーション実行')

          // 🚨 [SHIFT_TAB_EMULATION] Shift+TABキーイベントを作成・発火してShift+TABキーと同じ動作を実現
          const shiftTabEvent = new KeyboardEvent('keydown', {
            key: 'Tab',
            code: 'Tab',
            which: 9,
            keyCode: 9,
            shiftKey: true,  // Shift修飾キーを追加
            bubbles: true,
            cancelable: true
          });

          console.log('🔧 [SHIFT_TAB_EMULATION] Shift+TABキーイベント発火中:', shiftTabEvent)
          document.dispatchEvent(shiftTabEvent);
          console.log('✅ [SHIFT_TAB_EMULATION] Shift+TABキーエミュレーション完了')
        }}
        onCyclePhraseSet={() => {
          console.log('🔄 [TOOLBAR] フレーズ切り替えボタン - フレーズセット切り替えをトリガー')
          // 上下キーと同じフレーズセット切り替えを実行
          if (ghostText.selectNextPhraseSet) {
            ghostText.selectNextPhraseSet()
          }
          // チュートリアルイベント発火
          window.dispatchEvent(new CustomEvent('tutorial:phrase-switched'))
        }}
        hasPredictions={hasPredictions}
      />
      )}

      {(!hideHeader && appSettings?.midiEditor?.developerMode) && (() => {
        // ノートの最大時間を計算
        const maxTime = state.notes.length > 0
          ? Math.max(...state.notes.map(note => (note.time || 0) + (note.duration || 1)))
          : 0;

        return (
        <MidiEditorStatusBar
          // トラック情報
          trackName={trackName}
          trackType={trackType}
          trackColor={trackColor}

          // Ghost Text関連
          ghostTextStatus={ghostText.ghostTextStatus}
          currentModel={ghostText.currentModel}

          // 🔴 [NEW] Issue #147: 候補情報
          nextGhostIndex={ghostText.nextGhostIndex || 0}
          totalGhostCandidates={ghostText.ghostPredictions?.length || 0}
          nextPhraseIndex={ghostText.nextPhraseIndex || 0}
          totalPhraseCandidates={(() => {
            if (ghostText.phraseSets?.length > 0) {
              return ghostText.phraseSets[ghostText.selectedPhraseSetIndex || 0]?.length || 0
            }
            return 0
          })()}

          // 🆕 v2.0.0: フレーズセット情報
          phraseSets={ghostText.phraseSets || []}
          selectedPhraseSetIndex={ghostText.selectedPhraseSetIndex || 0}
          currentNoteIndex={ghostText.currentNoteIndex || 0}

          // ノート情報
          notesCount={state.notes.length}

          // オーディオ・再生状態
          audioEnabled={state.audioEnabled}
          isPlaying={state.isPlaying}
          tempo={globalTempo}
          loopEnabled={state.loopEnabled}
          metronomeEnabled={state.metronomeEnabled}

          // 時間情報
          currentTime={state.currentTime}
          playbackDuration={maxTime}
          
          // パフォーマンス指標
          performanceMetrics={ghostText.performanceMetrics}

          // 音色設定関連
          onOpenSoundSettings={instrumentSettings.openSettingsPanel}
        />
        );
      })()}



      {/* MIDIエディタキャンバス */}
      <MidiEditorCanvas
        // キャンバス関連
        staticCanvasRef={staticCanvasRef}
        dynamicCanvasRef={dynamicCanvasRef}
        timelineCanvasRef={timelineCanvasRef}
        containerRef={containerRef}
        
        // 状態管理
        state={state}
        
        // 座標変換
        coordinateTransforms={coordinateTransforms}
        
        // 定数
        GRID_HEIGHT={GRID_HEIGHT}
        GRID_WIDTH={GRID_WIDTH}
        PIANO_WIDTH={PIANO_WIDTH}
        HEADER_HEIGHT={HEADER_HEIGHT}
        NOTE_HEIGHT={NOTE_HEIGHT}
        OCTAVE_RANGE={OCTAVE_RANGE}
        TOTAL_KEYS={TOTAL_KEYS}
        
        // Ghost Text関連
        ghostPredictions={ghostText.ghostPredictions}
        showGhostText={ghostText.showGhostText}
        phrasePredictions={(() => {
          if (ghostText.phraseSets?.length > 0) {
            const selectedSet = ghostText.phraseSets[ghostText.selectedPhraseSetIndex || 0]
            return selectedSet || []
          }
          return []
        })()} // 🎨 [Phase 3] フレーズ予測 (phraseSets対応)
        phraseBaseTime={(() => {
          const baseTime = ghostText.phraseSession?.baseTime
          if (ghostText.phraseSets?.length > 0 &&
              ghostText.phraseSets[ghostText.selectedPhraseSetIndex || 0]?.length > 0 &&
              !baseTime) {
            console.log('🔍 [2ND_PHRASE_DEBUG] phraseBaseTime未定義:', {
              hasSession: !!ghostText.phraseSession,
              step: 'basetime_missing'
            })
          }
          return baseTime
        })()} // 🔧 [FIX] 固定baseTime for position consistency
        nextGhostIndex={ghostText.nextGhostIndex}       // 🔴 [NEW] Issue #146: Next ghost note index
        nextPhraseIndex={ghostText.nextPhraseIndex}     // 🔴 [NEW] Issue #146: Next phrase note index
        approvalHistory={ghostText.approvalHistory}     // 🔴 [NEW] Issue #146: Approval history
        onAcceptPrediction={acceptGhostPrediction}
        onAcceptNextPrediction={acceptNextGhostNote}
        
        // ライブ録音関連
        liveRecordingNotes={liveRecordingNotes}
        
        // オクターブ調整関連
        manualOctaveOffset={manualOctaveOffset}
        
        // イベントハンドラー
        onMouseDown={eventHandlers.handleMouseDown}
        onMouseMove={eventHandlers.handleMouseMove}
        onMouseUp={eventHandlers.handleMouseUp}
        onContextMenu={eventHandlers.handleCanvasRightClick}
        onWheel={() => {}} // ReactのonWheelは使用しない
        onTimelineClick={eventHandlers.handleTimelineClick}
        onPianoRollClick={async (pitch) => {
          // ピアノロールクリック時の音再生（トラックタイプに応じた楽器音を再生）
          if (state.audioEnabled && window.unifiedAudioSystem) {
            console.log(`🎵 楽器マッピング: ${trackType} -> ${trackType}`);
            console.log(`🎹 ピアノロールクリック: キー ${pitch} を再生 (楽器: ${trackType})`);

            // トラックタイプに応じて適切な楽器音を再生
            if (trackType === 'bass') {
              console.log(`🎸 Bass音再生: ピッチ=${pitch}, ベロシティ=0.8`);
              await window.unifiedAudioSystem.playBassNote(pitch, 0.8);
              console.log(`✅ Bass音再生成功: bass-${pitch}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
            } else {
              // デフォルトはピアノ音
              await window.unifiedAudioSystem.playPianoNote(pitch, 0.24);
            }

            // チュートリアル用イベント発火: 鍵盤クリックで音を鳴らした
            console.log('🎹 [TUTORIAL] 鍵盤クリックによるtutorial:keyboard-playイベント発火');
            window.dispatchEvent(new CustomEvent('tutorial:keyboard-play'));
          }
        }}
      />

      {/* 削除確認ダイアログ */}
      {state.showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">全削除の確認</h3>
            </div>
            <p className="text-gray-300 mb-6">
                              このトラックのすべてのノート（{state.notes.length}個）を削除しますか？<br />
              この操作は元に戻せません。<br />
              「ロード」ボタンで元のデータを復元できます。
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => state.setShowDeleteConfirm(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                キャンセル
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  noteOperations.reloadTrack()
                  state.setShowDeleteConfirm(false)
                }}
                className="border-blue-600 text-blue-300 hover:bg-blue-700"
              >
                ロード
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (trackId && state.isInitialized) {
                    // メモリ上のノートをクリア
                    state.setNotes([])
                    
                    // Refデータを更新（クリアではなく更新）
                    trackDataRef.current[trackId] = []
                    lastSavedRef.current[trackId] = Date.now()
                    
                    // 永続化データをクリア
                    persistence.saveNotes([], trackId)
                    
                    // 履歴をクリア
                    persistence.clearHistory()
                    
                    // 親コンポーネントに空の状態を通知
                    if (onMidiDataUpdate) {
                      const updateData = {
                        notes: [],
                        trackId: trackId,
                        lastModified: new Date().toISOString(),
                        metadata: {
                          modified: new Date().toISOString(),
                          noteCount: 0
                        },
                        settings: {
                          channel: 0,
                          octave: 0,
                          transpose: 0,
                          velocity: 100
                        }
                      }
                      onMidiDataUpdate(updateData)
                    }
                    
  
                  }
                  state.setSelectedNotes(new Set())
                  state.setShowDeleteConfirm(false)
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                全削除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 音色設定パネル */}
      {instrumentSettings.showSettingsPanel && (
        <InstrumentSettingsPanel
          trackId={trackId}
          instrument={instrumentSettings.instrument}
          settings={instrumentSettings.settings}
          onSettingsChange={instrumentSettings.handleSettingsChange}
          onClose={instrumentSettings.closeSettingsPanel}
          onSave={instrumentSettings.handleSaveSettings}
          onReset={instrumentSettings.handleResetSettings}
          // Ghost Text関連プロパティ
          ghostTextEnabled={ghostText.ghostTextEnabled}
          aiModel={ghostText.currentModel}
          onAiModelChange={ghostText.changeModel}
          onGhostTextToggle={ghostText.toggleGhostText}
          // 音楽理論設定プロパティ
          musicTheorySettings={musicTheorySettings}
          onMusicTheorySettingsChange={handleMusicTheorySettingsChange}
        />
      )}



    </div>
  )
}

export default memo(EnhancedMidiEditor)

