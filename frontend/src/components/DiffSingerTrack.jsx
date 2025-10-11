/*
 * DiffSingerTrack - Vocaloid-style track editor with lyric input and vocal parameters
 *
 * Features:
 * - Piano roll MIDI editor (similar to MidiEditor)
 * - Lyric input system with phoneme processing
 * - Vocal parameter controls (pitch, tension, vibrato, etc.)
 * - Split panel layout: note editor (top) + settings (bottom)
 * - Settings panel split: note properties (left) + lyrics (right)
 * - DiffSinger API integration for voice synthesis
 * - Playback with generated audio
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { Badge } from './ui/badge.jsx'
import { Slider } from './ui/slider.jsx'
import { Button } from './ui/button.jsx'
import { Textarea } from './ui/textarea.jsx'
import { Label } from './ui/label.jsx'
import { Input } from './ui/input.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.jsx'
import { Separator } from './ui/separator.jsx'
import {
  Play,
  Pause,
  Square,
  Mic,
  Volume2,
  Settings,
  Music,
  Type,
  AudioWaveform,
  Lightbulb,
  AlertTriangle
} from 'lucide-react'
import DiffSingerCanvas from './DiffSinger/DiffSingerCanvas.jsx'
import MidiEditorToolbar from './MIDIEditor/MidiEditorToolbar.jsx'
import MidiEditorStatusBar from './MIDIEditor/MidiEditorStatusBar.jsx'
import AudioQualityPanel from './DiffSinger/AudioQualityPanel.jsx'
import GenerationProgress from './DiffSinger/GenerationProgress.jsx'
import useMidiAudio from '../hooks/useMidiAudio.js'
import useMidiNoteOperations from '../hooks/useMidiNoteOperations.js'
import useMidiEditorState from '../hooks/useMidiEditorState.js'
import useMidiPersistence from '../hooks/useMidiPersistence.js'
import { diffSingerApiClient } from '../utils/diffSingerApiClient.js'
import { textToPhonemes } from '../utils/phonemeConverter.js'

// DiffSinger vocal parameters (最高品質対応)
const VOCAL_PARAMS = {
  // 基本パラメータ
  speed: { min: 0.1, max: 3.0, default: 1.0, step: 0.1 },
  pitch_shift: { min: -24, max: 24, default: 0, step: 1 },

  // OpenUtau準拠パラメータ
  energy: { min: -100.0, max: 100.0, default: 0.0, step: 1.0 },
  breathiness: { min: -100.0, max: 100.0, default: 0.0, step: 1.0 },
  voicing: { min: 0.0, max: 200.0, default: 100.0, step: 1.0 },
  tension: { min: -10.0, max: 10.0, default: 0.5, step: 0.1 },

  // 追加パラメータ
  vibrato_depth: { min: 0.0, max: 1.0, default: 0.0, step: 0.1 },
  vibrato_rate: { min: 0.0, max: 10.0, default: 0.0, step: 0.1 },
  formant_shift: { min: -12, max: 12, default: 0, step: 1 },

  // 音質設定
  enable_enhancement: { type: 'boolean', default: true },
  normalization_enabled: { type: 'boolean', default: true },
  noise_reduction_enabled: { type: 'boolean', default: true },
  compression_enabled: { type: 'boolean', default: true },
  eq_enabled: { type: 'boolean', default: true },
  steps: { min: 1, max: 100, default: 50, step: 1 },
  depth: { min: 0.1, max: 2.0, default: 1.0, step: 0.1 }
}

// DiffSinger用定数
const DIFFSINGER_CONSTANTS = {
  GRID_HEIGHT: 20,
  GRID_WIDTH: 40,
  PIANO_WIDTH: 80,
  HEADER_HEIGHT: 40,
  NOTE_HEIGHT: 18,
  OCTAVE_RANGE: [1, 7], // C1 to C7
  TOTAL_KEYS: (7 - 1 + 1) * 12,
  FPS_LIMIT: 60,
  FRAME_TIME: 1000 / 60,
  LONG_PRESS_THRESHOLD: 200,
  PLAYBACK_UPDATE_INTERVAL: 16
}

const DiffSingerTrack = ({
  trackId,
  trackName = 'ボーカルトラック',
  trackColor = 'purple',
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
  projectManager
}) => {
  // 基本的な状態管理
  const state = useMidiEditorState(trackId)
  const persistence = useMidiPersistence()
  const audio = useMidiAudio()
  const noteOperations = useMidiNoteOperations(
    state.notes,
    state.setNotes,
    trackId,
    state.isInitialized,
    persistence,
    state.currentTime,
    state.selectedNotes,
    state.setSelectedNotes
  )

  // DiffSinger specific state
  const [lyrics, setLyrics] = useState('')
  const [selectedNoteId, setSelectedNoteId] = useState(null)

  // 複数選択機能の状態
  const [selectedNoteIds, setSelectedNoteIds] = useState([])
  const [selectionBox, setSelectionBox] = useState(null)
  const [isDraggingSelection, setIsDraggingSelection] = useState(false)
  const [vocalParams, setVocalParams] = useState(() => {
    const params = {}
    Object.entries(VOCAL_PARAMS).forEach(([key, config]) => {
      if (config.type === 'boolean') {
        params[key] = config.default
      } else {
        params[key] = config.default
      }
    })
    return params
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState(null)
  const [notePhonemes, setNotePhonemes] = useState({}) // noteId -> phoneme mapping
  const [lyricsHistory, setLyricsHistory] = useState([])
  const [autoApplyLyrics, setAutoApplyLyrics] = useState(true)

  // 最高品質設定の状態
  const [audioQuality, setAudioQuality] = useState({
    enable_enhancement: true,
    normalization: { enabled: true, target_rms: 0.08, max_gain: 1.5 },
    noise_reduction: { enabled: true, high_freq_cutoff: 6000 },
    compression: { enabled: true, threshold: 0.25, ratio: 3.0 },
    eq: { enabled: true, clarity_boost: 1.15 }
  })

  // キャッシュ設定
  const [cacheSettings, setCacheSettings] = useState({
    enabled: true,
    max_size_mb: 2048
  })

  // 生成進捗
  const [generationProgress, setGenerationProgress] = useState({
    status: 'idle',
    progress: 0,
    message: ''
  })

  // Layout state - 解決策1: 初期高さを40%に変更（歌詞エリアに60%を確保）
  const [editorHeight, setEditorHeight] = useState(40) // Percentage of total height
  const [settingsWidth, setSettingsWidth] = useState(50) // Percentage of settings panel width

  // コンテナ参照
  const containerRef = useRef(null)

  // 解決策3用: 歌詞エリアへの参照
  const lyricsAreaRef = useRef(null)

  // トラック別データの永続化用Ref（Enhanced MIDI Editorと同様）
  const trackDataRef = useRef({})
  const lastSavedRef = useRef({})
  const lastParentUpdateRef = useRef({}) // 親コンポーネントへの最後の更新時刻を記録

  // 解決策3: 初回マウント時に歌詞エリアへ自動スクロール
  useEffect(() => {
    if (lyricsAreaRef.current && isActive) {
      // 500msディレイ後にスクロール（レンダリング完了を待つ）
      const scrollTimer = setTimeout(() => {
        lyricsAreaRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
        console.log('DiffSingerTrack: 歌詞エリアへ自動スクロール完了')
      }, 500)

      return () => clearTimeout(scrollTimer)
    }
  }, [isActive, trackId])

  // グローバルBPMを状態に反映
  useEffect(() => {
    if (globalTempo !== state.tempo) {
      state.setTempo(globalTempo)
    }
  }, [globalTempo, state])

  // 現在のトラックのデータを保存
  const saveCurrentTrackData = useCallback(() => {
    if (!trackId || !initializationRef.current[trackId]) return

    // 現在のノートを取得（state.notesを直接参照）
    const currentNotes = state.notes

    // Refに保存
    trackDataRef.current[trackId] = [...currentNotes]
    lastSavedRef.current[trackId] = Date.now()

    // 永続化フックを使用して保存
    persistence.saveNotes(currentNotes, trackId)

    // 音素データも保存
    const saveResult = persistence.savePhonemes(notePhonemes, trackId)

    console.log('DiffSingerTrack: トラックデータを保存しました', trackId, 'ノート数:', currentNotes.length, '音素数:', Object.keys(notePhonemes).length)
    console.log('DiffSingerTrack: 保存する音素データ:', notePhonemes)
    console.log('DiffSingerTrack: 音素データ保存結果:', saveResult)
  }, [trackId, persistence, state.notes, notePhonemes])

  // 初期化処理
  useEffect(() => {
    console.log('DiffSingerTrack: 初期化useEffect実行', {
      trackId,
      isInitialized: state.isInitialized,
      isActive,
      midiDataNotesLength: midiData?.notes?.length,
      trackDataExists: trackDataRef.current[trackId] !== undefined
    })

    // 初期化済みの場合はスキップ
    if (initializationRef.current[trackId] || !trackId || !isActive) {
      console.log('DiffSingerTrack: 初期化スキップ', { reason: initializationRef.current[trackId] ? 'already initialized' : !trackId ? 'no trackId' : 'not active' })
      return
    }

    // 既に初期化済みのトラックの場合でも、midiDataが更新された場合は再初期化
    if (trackDataRef.current[trackId] !== undefined) {
      // midiDataが更新された場合は再初期化
      if (midiData?.notes && JSON.stringify(midiData.notes) !== JSON.stringify(trackDataRef.current[trackId])) {
        // 初期化フラグをリセットして再初期化を許可
        console.log('DiffSingerTrack: midiData変更により再初期化フラグリセット')
        initializationRef.current[trackId] = false
        return
      } else {
        console.log('DiffSingerTrack: 既存データで初期化完了')
        initializationRef.current[trackId] = true
        return
      }
    }

    // 初期化フラグを設定して他のuseEffectの実行を防ぐ
    initializationRef.current[trackId] = true

    let initialNotes = []

    // 1. まずMIDIデータから初期化（親コンポーネントの状態を優先）
    if (midiData?.notes) {
      // MIDIデータが存在する場合は、空の配列でも使用（全削除後の状態を保持）
      initialNotes = [...midiData.notes]
      console.log('DiffSingerTrack: MIDIデータから初期化', initialNotes.length, '個のノート')
    }
    // 2. MIDIデータがない場合は永続化フックから読み込み
    else {
      const savedNotes = persistence.loadNotes(trackId)
      if (savedNotes.length > 0) {
        initialNotes = savedNotes
        console.log('DiffSingerTrack: 永続化データから初期化', initialNotes.length, '個のノート')
      } else {
        console.log('DiffSingerTrack: 新規初期化（空のノート）')
      }
    }

    // 状態を設定
    state.setNotes(initialNotes)

    // Refに保存
    trackDataRef.current[trackId] = [...initialNotes]
    lastSavedRef.current[trackId] = Date.now()

    // 音素データを読み込み
    const savedPhonemes = persistence.loadPhonemes(trackId)
    if (Object.keys(savedPhonemes).length > 0) {
      setNotePhonemes(savedPhonemes)
      console.log('DiffSingerTrack: 音素データを読み込みました', Object.keys(savedPhonemes).length, '個の音素')
      console.log('DiffSingerTrack: 読み込んだ音素データ:', savedPhonemes)
    } else {
      console.log('DiffSingerTrack: 保存された音素データがありません')

      // 音素データが存在しない場合、ノートの lyric プロパティから音素マッピングを作成
      if (initialNotes && initialNotes.length > 0) {
        const noteLyricsPhonemes = {}
        let hasLyrics = false

        initialNotes.forEach(note => {
          if (note.lyric && note.lyric.trim()) {
            noteLyricsPhonemes[note.id] = note.lyric.trim()
            hasLyrics = true
          }
        })

        if (hasLyrics) {
          setNotePhonemes(noteLyricsPhonemes)
          // 生成した音素データを永続化
          persistence.savePhonemes(noteLyricsPhonemes, trackId)
          console.log('DiffSingerTrack: ノートの lyric プロパティから音素データを生成しました', Object.keys(noteLyricsPhonemes).length, '個')
          console.log('DiffSingerTrack: 生成された音素データ:', noteLyricsPhonemes)
        }
      }
    }

    // 履歴を初期化
    persistence.initializeHistory()

    console.log('DiffSingerTrack: 初期化完了', trackId, initialNotes.length, '個のノート')
  }, [trackId, midiData?.notes, isActive, persistence]) // state.isInitializedを依存関係から削除

  // コンポーネントのクリーンアップ処理
  useEffect(() => {
    return () => {
      // コンポーネントがアンマウントされた時に初期化状態をリセット
      if (trackId) {
        // trackDataRefからは削除しない（他のタブで使用される可能性があるため）
        // 初期化状態のみリセット
        state.setIsInitialized(false)
      }
    }
  }, [trackId, state])

  // 前回のトラックIDを記録するRef
  const previousTrackIdRef = useRef(null)

  // 初期化状態を管理するRef（useEffectの依存関係を避けるため）
  const initializationRef = useRef({})

  // トラック変更時の処理
  useEffect(() => {
    console.log('DiffSingerTrack: トラック変更useEffect実行', {
      trackId,
      isActive,
      isInitialized: initializationRef.current[trackId],
      previousTrackId: previousTrackIdRef.current
    })

    if (!initializationRef.current[trackId] || !trackId || !isActive) {
      console.log('DiffSingerTrack: トラック変更処理スキップ', { reason: !initializationRef.current[trackId] ? 'not initialized' : !trackId ? 'no trackId' : 'not active' })
      return
    }

    // 前回のトラックIDと比較して、実際にトラックが変更された場合のみ処理
    const previousTrackId = previousTrackIdRef.current
    if (previousTrackId === trackId) {
      console.log('DiffSingerTrack: 同じトラックのため処理スキップ')
      return // 同じトラックの場合は何もしない
    }

    // 前回のトラックのデータを保存（存在する場合）
    if (previousTrackId) {
      console.log('DiffSingerTrack: 前回のトラックデータを保存', previousTrackId)
      saveCurrentTrackData()
    }

    // 現在のトラックIDを記録
    previousTrackIdRef.current = trackId
    console.log('DiffSingerTrack: トラックID更新', trackId)
  }, [trackId, isActive])

  // ノート変更時の自動保存
  useEffect(() => {
    console.log('DiffSingerTrack: 自動保存useEffect実行', {
      trackId,
      isInitialized: initializationRef.current[trackId],
      notesLength: state.notes.length,
      lastSaved: lastSavedRef.current[trackId] || 0,
      now: Date.now()
    })

    if (!initializationRef.current[trackId] || !trackId) {
      console.log('DiffSingerTrack: 自動保存スキップ', { reason: !initializationRef.current[trackId] ? 'not initialized' : 'no trackId' })
      return
    }

    // 前回の保存から一定時間経過している場合のみ保存
    const lastSaved = lastSavedRef.current[trackId] || 0
    const now = Date.now()
    if (now - lastSaved > 1000) { // 1秒以上経過している場合
      console.log('DiffSingerTrack: 自動保存実行')
      saveCurrentTrackData()
    } else {
      console.log('DiffSingerTrack: 自動保存スキップ（時間間隔が短い）', { timeSinceLastSave: now - lastSaved })
    }
  }, [trackId, state.notes.length, saveCurrentTrackData])

  // midiDataの変更を監視して状態を更新（親コンポーネントからの強制更新のみ）
  useEffect(() => {
    console.log('DiffSingerTrack: midiData同期useEffect実行', {
      trackId,
      isActive,
      isInitialized: initializationRef.current[trackId],
      midiDataNotesLength: midiData?.notes?.length,
      currentNotesLength: state.notes.length
    })

    if (!trackId || !isActive || !initializationRef.current[trackId]) {
      console.log('DiffSingerTrack: midiData同期スキップ', { reason: !trackId ? 'no trackId' : !isActive ? 'not active' : 'not initialized' })
      return
    }

    // midiDataが更新された場合、状態を同期
    // ただし、ローカルの更新と区別するため、より厳密な条件でチェック
    const currentNotes = state.notes
    if (midiData?.notes && midiData.notes.length !== currentNotes.length) {
      // 最後の更新時刻をチェックして、直近の更新によるものかどうかを判定
      const now = Date.now()
      const lastUpdateTime = lastParentUpdateRef.current[trackId] || 0

      // 100ms以内の更新の場合は、ローカルの更新によるものとして無視
      if (now - lastUpdateTime < 100) {
        console.log('DiffSingerTrack: ローカル更新によるmidiData変更を無視', midiData.notes.length, '個のノート')
        return
      }

      // ローカルにノートがあるのにmidiDataが空の場合は、ローカルの状態を優先
      if (currentNotes.length > 0 && midiData.notes.length === 0) {
        console.log('DiffSingerTrack: ローカルノートを優先（midiDataが空）', currentNotes.length, '個のノート')
        return
      }

      const newNotes = [...midiData.notes]
      state.setNotes(newNotes)
      trackDataRef.current[trackId] = newNotes
      console.log('DiffSingerTrack: midiDataから状態を同期', newNotes.length, '個のノート')
    } else {
      console.log('DiffSingerTrack: midiData同期不要', { reason: !midiData?.notes ? 'no midiData' : 'same length' })
    }
  }, [midiData?.notes?.length, trackId, isActive, state.notes.length, state.setNotes])

  // 親コンポーネントへの通知関数
  const notifyParentUpdate = useCallback((notes) => {
    console.log('DiffSingerTrack: notifyParentUpdate呼び出し', {
      trackId,
      notesLength: notes.length,
      hasOnMidiDataUpdate: !!onMidiDataUpdate
    })

    if (!onMidiDataUpdate || !trackId) {
      console.log('DiffSingerTrack: notifyParentUpdateスキップ', { reason: !onMidiDataUpdate ? 'no onMidiDataUpdate' : 'no trackId' })
      return
    }

    // 最後の更新時刻をチェックして重複を防ぐ
    const now = Date.now()
    const lastUpdateTime = lastParentUpdateRef.current[trackId] || 0
    if (now - lastUpdateTime < 50) { // 50ms以内の重複更新を防ぐ
      console.log('DiffSingerTrack: notifyParentUpdateスキップ（重複更新）', { timeSinceLastUpdate: now - lastUpdateTime })
      return
    }

    // 更新時刻を記録
    lastParentUpdateRef.current[trackId] = now

    const updateData = {
      notes: Array.isArray(notes) ? notes : [],
      trackId: trackId,
      lastModified: new Date().toISOString(),
      metadata: {
        modified: new Date().toISOString(),
        noteCount: notes.length
      },
      settings: {
        channel: 0,
        octave: 0,
        transpose: 0,
        velocity: 100
      },
      // DiffSinger固有データ
      diffSingerData: {
        lyrics: lyrics,
        notePhonemes: notePhonemes,
        lyricsHistory: lyricsHistory,
        autoApplyLyrics: autoApplyLyrics,
        vocalParams: vocalParams,
        audioQuality: audioQuality,
        cacheSettings: cacheSettings
      }
    }

    console.log('DiffSingerTrack: 親コンポーネントに通知', updateData.notes.length, '個のノート')
    onMidiDataUpdate(updateData)
  }, [onMidiDataUpdate, trackId, lyrics, notePhonemes, lyricsHistory, autoApplyLyrics, vocalParams, audioQuality, cacheSettings])

  // ノート操作関数
  const addNote = useCallback((pitchOrNote, time, duration = 0.25, velocity = 0.8) => {
    let newNote

    // ノートオブジェクトが渡された場合
    if (typeof pitchOrNote === 'object' && pitchOrNote.id) {
      newNote = pitchOrNote
    } else {
      // 個別パラメータが渡された場合
      newNote = {
        id: 'note-' + Date.now(),
        pitch: Math.round(pitchOrNote),
        time: Math.round(time * 4) / 4,
        start: Math.round(time * 4) / 4,
        duration: Math.round(duration * 4) / 4,
        velocity: velocity,
        // 歌詞対応のための追加フィールド
        lyric: '', // 一音一文字の歌詞
        phoneme: 'a', // デフォルト音素を「a」に設定
        vocalParams: { ...vocalParams } // ボーカルパラメータのスナップショット
      }
    }

    // ローカルのstate.notesを更新
    state.setNotes(prev => {
      const updatedNotes = [...prev, newNote]
      return updatedNotes
    })

    // 親コンポーネントに通知（同期的に実行）
    notifyParentUpdate([...state.notes, newNote])

    // 音素マッピングも自動的に更新
    setNotePhonemes(prev => {
      const newPhonemes = {
        ...prev,
        [newNote.id]: newNote.phoneme || 'a'
      }

      // 音素データを即座に保存
      if (trackId && initializationRef.current[trackId]) {
        persistence.savePhonemes(newPhonemes, trackId)
        console.log('DiffSingerTrack: ノート追加で音素データを保存しました', Object.keys(newPhonemes).length, '個の音素')
      }

      return newPhonemes
    })

    // 親コンポーネントへの通知はnotifyParentUpdateで行うため、ここでは不要
  }, [onNoteAdd, vocalParams, state.setNotes, notifyParentUpdate])

  const removeNote = useCallback((noteId) => {
    // ローカルのstate.notesを更新
    state.setNotes(prev => {
      const updatedNotes = prev.filter(note => note.id !== noteId)
      return updatedNotes
    })

    // 親コンポーネントに通知（同期的に実行）
    notifyParentUpdate(state.notes.filter(note => note.id !== noteId))

    // 音素データからも削除
    setNotePhonemes(prev => {
      const newPhonemes = { ...prev }
      delete newPhonemes[noteId]

      // 音素データを即座に保存
      if (trackId && initializationRef.current[trackId]) {
        persistence.savePhonemes(newPhonemes, trackId)
        console.log('DiffSingerTrack: ノート削除で音素データを保存しました', Object.keys(newPhonemes).length, '個の音素')
      }

      return newPhonemes
    })

    // 親コンポーネントへの通知はnotifyParentUpdateで行うため、ここでは不要
  }, [onNoteRemove, state.setNotes, notifyParentUpdate])

  const editNote = useCallback((noteId, updates) => {
    // 削除フラグが設定されている場合は削除処理
    if (updates._delete) {
      console.log('DiffSingerTrack: ノート削除処理', noteId)
      removeNote(noteId)
      return
    }

    // ローカルのstate.notesを更新
    state.setNotes(prev => {
      const updatedNotes = prev.map(note =>
        note.id === noteId ? { ...note, ...updates } : note
      )
      return updatedNotes
    })

    // 親コンポーネントに通知（同期的に実行）
    notifyParentUpdate(state.notes.map(note =>
      note.id === noteId ? { ...note, ...updates } : note
    ))

    // 音素データも更新（phonemeフィールドがある場合）
    if (updates.phoneme !== undefined) {
      setNotePhonemes(prev => {
        const newPhonemes = {
          ...prev,
          [noteId]: updates.phoneme
        }

        // 音素データを即座に保存
        if (trackId && initializationRef.current[trackId]) {
          persistence.savePhonemes(newPhonemes, trackId)
          console.log('DiffSingerTrack: ノート編集で音素データを保存しました', Object.keys(newPhonemes).length, '個の音素')
        }

        return newPhonemes
      })
    }

    // 親コンポーネントへの通知はnotifyParentUpdateで行うため、ここでは不要
  }, [onNoteEdit, state.setNotes, removeNote, notifyParentUpdate])

  // 選択されたノートの情報を取得
  const selectedNote = useMemo(() => {
    if (!selectedNoteId) return null
    return state.notes.find(note => note.id === selectedNoteId)
  }, [selectedNoteId, state.notes])

  // 選択されたノートの情報を取得（複数選択対応）
  const selectedNotes = useMemo(() => {
    return state.notes.filter(note => selectedNoteIds.includes(note.id))
  }, [selectedNoteIds, state.notes])

  // ノートが選択範囲内にあるかチェック
  const isNoteInSelectionBox = useCallback((note, box) => {
    if (!box) return false

    const noteStart = note.start
    const noteEnd = note.start + note.duration
    const notePitch = note.pitch

    // 時間軸での重複チェック
    const timeOverlap = noteStart < box.endTime && noteEnd > box.startTime

    // ピッチ軸での重複チェック
    const pitchOverlap = notePitch >= box.startPitch && notePitch <= box.endPitch

    return timeOverlap && pitchOverlap
  }, [])

  // 選択範囲をクリア
  const clearSelection = useCallback(() => {
    setSelectedNoteId(null)
    setSelectedNoteIds([])
    setSelectionBox(null)
  }, [])

  // ノートを選択
  const selectNote = useCallback((noteId, addToSelection = false) => {
    if (addToSelection) {
      setSelectedNoteIds(prev => {
        if (prev.includes(noteId)) {
          return prev.filter(id => id !== noteId)
        } else {
          return [...prev, noteId]
        }
      })
      setSelectedNoteId(noteId)
    } else {
      setSelectedNoteIds([noteId])
      setSelectedNoteId(noteId)
    }
  }, [])

  // 歌詞を音素に変換してノートに割り当て
  const applyLyricsToNotes = useCallback(() => {
    if (!lyrics.trim()) return

    const phonemes = textToPhonemes(lyrics)
    const notes = [...state.notes].sort((a, b) => a.start - b.start)

    const newNotePhonemes = {}
    phonemes.forEach((phoneme, index) => {
      if (notes[index]) {
        newNotePhonemes[notes[index].id] = phoneme
      }
    })

    setNotePhonemes(newNotePhonemes)

    // 音素データを即座に保存
    if (trackId && initializationRef.current[trackId]) {
      persistence.savePhonemes(newNotePhonemes, trackId)
      console.log('DiffSingerTrack: 歌詞適用で音素データを保存しました', Object.keys(newNotePhonemes).length, '個の音素')
    }

    // 歌詞履歴に追加
    setLyricsHistory(prev => {
      const newHistory = [lyrics, ...prev.filter(l => l !== lyrics)]
      return newHistory.slice(0, 10) // 最新10個まで保持
    })
  }, [lyrics, state.notes, trackId, persistence])

  // 自動適用が有効な場合、歌詞変更時に自動でノートに適用
  useEffect(() => {
    if (autoApplyLyrics && lyrics.trim()) {
      applyLyricsToNotes()
    }
  }, [lyrics, autoApplyLyrics, applyLyricsToNotes])

  // 最高品質音声生成関数
  const generateVoice = useCallback(async () => {
    if (!state.notes.length || !Object.keys(notePhonemes).length) {
      alert('ノートと歌詞を入力してください')
      return
    }

    setIsGenerating(true)
    setGenerationProgress({ status: 'starting', progress: 0, message: '音声生成を開始...' })

    try {
      // test_diffsinger.pyと同じ形式でMIDIデータを準備
      const midiNotes = state.notes.map(note => ({
        pitch: note.pitch,
        start_time: note.start,
        end_time: note.start + note.duration,
        lyric: notePhonemes[note.id] || 'a'
      }))

      console.log('DiffSingerTrack: 音声生成開始', {
        notes: midiNotes,
        vocalParams,
        audioQuality
      })

      // test_diffsinger.pyと同じパラメータ形式を準備
      const synthesisParams = {
        speed: vocalParams.speed || 1.0,
        pitch_shift: vocalParams.pitch_shift || 0,
        energy: vocalParams.energy || 1.0,
        tension: vocalParams.tension || 0.5,
        breathiness: vocalParams.breathiness || 0.1,
        steps: vocalParams.steps || 50,  // サンプリングステップ数（音質に重要）
        depth: vocalParams.depth || 1.0  // サンプリング深度（音質に重要）
      }

      // 進捗コールバック
      const onProgress = (progressData) => {
        console.log('DiffSingerTrack: 進捗更新', progressData)
        setGenerationProgress({
          status: progressData.status,
          progress: progressData.progress,
          message: progressData.message || `進捗: ${progressData.progress}%`,
          timeElapsed: progressData.timeElapsed,
          queueTime: progressData.queueTime
        })
      }

      // DiffSinger APIを呼び出し（test_diffsinger.pyと同じ形式）
      const response = await diffSingerApiClient.synthesizeVoice({
        notes: midiNotes,
        model_id: 'koshirazu_v1.0',
        language: 'japanese',
        params: synthesisParams
      }, onProgress)

      console.log('DiffSingerTrack: 音声生成完了', response)

      // Mock DiffSingerサーバーのレスポンス形式に合わせて処理
      if (response.audio_path) {
        // 音声ファイルのパスからファイル名を抽出
        const filename = response.audio_path.split(/[/\\]/).pop();

        // DiffSingerApiClientを使って適切なURLを構築
        const audioUrl = diffSingerApiClient.getAudioFileUrl(filename);

        console.log('DiffSingerTrack: 音声ファイルURL', audioUrl)

        setGeneratedAudioUrl(audioUrl)
        setGenerationProgress({
          status: 'completed',
          progress: 100,
          message: '音声生成完了！',
          timeElapsed: response.synthesis_time
        })

        // 生成された音声をオーディオエンジンに登録
        if (audio.loadAudioBuffer) {
          try {
            await audio.loadAudioBuffer(audioUrl)
            console.log('DiffSingerTrack: オーディオバッファ読み込み完了')
          } catch (audioError) {
            console.warn('DiffSingerTrack: オーディオバッファ読み込み失敗', audioError)
          }
        }
      } else {
        throw new Error('音声ファイルのURLが取得できませんでした')
      }

    } catch (error) {
      console.error('DiffSingerTrack: 音声生成エラー', error)
      setGenerationProgress({
        status: 'error',
        progress: 0,
        message: `エラー: ${error.message}`
      })
      alert('音声生成に失敗しました: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }, [state.notes, notePhonemes, vocalParams, audioQuality, cacheSettings, audio])

  // パラメータ変更ハンドラ（最高品質対応）
  const handleParamChange = useCallback((paramName, value) => {
    setVocalParams(prev => ({
      ...prev,
      [paramName]: value
    }))
  }, [])

  // 音質設定変更ハンドラ
  const handleAudioQualityChange = useCallback((setting, value) => {
    setAudioQuality(prev => ({
      ...prev,
      [setting]: value
    }))
  }, [])

  // キャッシュ設定変更ハンドラ
  const handleCacheSettingChange = useCallback((setting, value) => {
    setCacheSettings(prev => ({
      ...prev,
      [setting]: value
    }))
  }, [])

  // ノート選択ハンドラ
  const handleNoteSelect = useCallback((noteId) => {
    setSelectedNoteId(noteId)
    state.setSelectedNotes(new Set([noteId]))
  }, [state])

  // 選択されたノートの音素変更
  const handleNotePhonemeChange = useCallback((phoneme, specificNoteId = null) => {
    const targetNoteId = specificNoteId || selectedNoteId

    if (targetNoteId) {
      setNotePhonemes(prev => {
        const newPhonemes = {
          ...prev,
          [targetNoteId]: phoneme
        }

        // 音素データを即座に保存
        if (trackId && initializationRef.current[trackId]) {
          persistence.savePhonemes(newPhonemes, trackId)
        }

        return newPhonemes
      })
    }
  }, [selectedNoteId, trackId, persistence])

  // レイアウト調整ハンドラ
  const handleEditorResize = useCallback((e) => {
    const container = e.target.closest('.diffsinger-track-container')
    if (!container) return

    const containerHeight = container.offsetHeight
    const mouseY = e.clientY - container.getBoundingClientRect().top
    const newHeight = Math.max(30, Math.min(80, (mouseY / containerHeight) * 100))
    setEditorHeight(newHeight)
  }, [])

  const handleSettingsResize = useCallback((e) => {
    const settingsPanel = e.target.closest('.settings-panel')
    if (!settingsPanel) return

    const panelWidth = settingsPanel.offsetWidth
    const mouseX = e.clientX - settingsPanel.getBoundingClientRect().left
    const newWidth = Math.max(30, Math.min(70, (mouseX / panelWidth) * 100))
    setSettingsWidth(newWidth)
  }, [])

  // 座標変換の計算
  const coordinateTransforms = useMemo(() => {
    const getAvailableWidth = () => {
      // 実際のコンテナ幅を取得（より正確）
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        if (containerWidth > 0) {
          return containerWidth
        }
      }

      // フォールバック: ウィンドウ幅から推定
      const windowWidth = window.innerWidth
      // より保守的な推定値
      const estimatedPanelsWidth = 400 // ミキサー + AI Assistant の推定幅
      const availableWidth = windowWidth - estimatedPanelsWidth

      // 最小幅を確保
      return Math.max(600, availableWidth)
    }

    const availableWidth = getAvailableWidth()

    // スクロール下限の計算（C1-C7の範囲に制限、キーボードの下側に余裕を持たせる）
    const maxScrollY = Math.max(0, (DIFFSINGER_CONSTANTS.TOTAL_KEYS * DIFFSINGER_CONSTANTS.GRID_HEIGHT) - 400) // 400pxの表示領域を確保

    // 曲の最大時間を計算（ArrangementViewの設定を優先）
    let maxTime = 60 // デフォルト60秒

    // プロジェクトマネージャーからArrangementViewの曲の長さを取得
    if (projectManager?.getProject()?.settings?.duration) {
      // ミリ秒から秒に変換
      const projectDuration = projectManager.getProject().settings.duration / 1000
      maxTime = Math.max(30, Math.min(600, projectDuration))
    } else if (state.notes && state.notes.length > 0) {
      // プロジェクト設定がない場合は、ノートの最大時間を計算
      const maxNoteEnd = Math.max(...state.notes.map(note => (note.time || note.start || 0) + (note.duration || 1)))
      maxTime = Math.max(30, Math.min(600, maxNoteEnd + 10))
    }

    // BPMから拍数を計算
    const tempo = state.tempo || 120
    const secondsPerBeat = 60 / tempo
    const maxBeats = Math.ceil(maxTime / secondsPerBeat)

    const totalContentWidth = maxTime * DIFFSINGER_CONSTANTS.GRID_WIDTH * (state.zoom || 1)
    const maxScrollX = Math.max(0, totalContentWidth - (availableWidth - DIFFSINGER_CONSTANTS.PIANO_WIDTH))

    return {
      pitchToY: (pitch) => {
        const keyIndex = DIFFSINGER_CONSTANTS.TOTAL_KEYS - 1 - (pitch - (DIFFSINGER_CONSTANTS.OCTAVE_RANGE[0] * 12))
        const y = DIFFSINGER_CONSTANTS.HEADER_HEIGHT + keyIndex * DIFFSINGER_CONSTANTS.GRID_HEIGHT - (state.scrollY || 0)
        return y
      },
      yToPitch: (y) => {
        const keyIndex = Math.floor((y - DIFFSINGER_CONSTANTS.HEADER_HEIGHT + (state.scrollY || 0)) / DIFFSINGER_CONSTANTS.GRID_HEIGHT)
        return (DIFFSINGER_CONSTANTS.OCTAVE_RANGE[0] * 12) + (DIFFSINGER_CONSTANTS.TOTAL_KEYS - 1 - keyIndex)
      },
      timeToX: (time) => {
        const x = DIFFSINGER_CONSTANTS.PIANO_WIDTH + (time * DIFFSINGER_CONSTANTS.GRID_WIDTH * (state.zoom || 1)) - (state.scrollX || 0)
        return x
      },
      xToTime: (x) => {
        return (x - DIFFSINGER_CONSTANTS.PIANO_WIDTH + (state.scrollX || 0)) / (DIFFSINGER_CONSTANTS.GRID_WIDTH * (state.zoom || 1))
      },
      durationToWidth: (duration) => duration * DIFFSINGER_CONSTANTS.GRID_WIDTH * (state.zoom || 1),
      widthToDuration: (width) => Math.max(0.1, width / (DIFFSINGER_CONSTANTS.GRID_WIDTH * (state.zoom || 1))),
      maxScrollY: maxScrollY,
      maxScrollX: maxScrollX,
      maxTime: maxTime,
      maxBeats: maxBeats,
      tempo: tempo,
      secondsPerBeat: secondsPerBeat
    }
  }, [state.notes, state.zoom, state.scrollX, state.scrollY, state.tempo, projectManager])

  // イベントハンドラー
  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (x < DIFFSINGER_CONSTANTS.PIANO_WIDTH) {
      // ピアノロール部分のクリック
      const pitch = coordinateTransforms.yToPitch(y)
      if (pitch >= DIFFSINGER_CONSTANTS.OCTAVE_RANGE[0] * 12 && pitch <= DIFFSINGER_CONSTANTS.OCTAVE_RANGE[1] * 12 + 11) {
        // 音を鳴らす
        if (state.audioEnabled) {
          audio.playNote(pitch, 0.1, 0.5)
        }
      }
      return
    }

    const pitch = coordinateTransforms.yToPitch(y)
    const time = coordinateTransforms.xToTime(x)

    if (pitch < DIFFSINGER_CONSTANTS.OCTAVE_RANGE[0] * 12 || pitch > DIFFSINGER_CONSTANTS.OCTAVE_RANGE[1] * 12 + 11) return
    if (time < 0 || time > coordinateTransforms.maxTime) return

    const snappedTime = Math.round(time * 4) / 4
    const snappedPitch = Math.round(pitch)

    const clickedNote = state.notes?.find(note => {
      const noteX = coordinateTransforms.timeToX(note.time || note.start)
      const noteY = coordinateTransforms.pitchToY(note.pitch)
      const noteWidth = coordinateTransforms.durationToWidth(note.duration)
      const noteHeight = DIFFSINGER_CONSTANTS.NOTE_HEIGHT

      return x >= noteX && x <= noteX + noteWidth && y >= noteY && y <= noteY + noteHeight
    })

    // リサイズエリアの判定（ノートの左右端8px）
    const isRightResizeArea = clickedNote && (() => {
      const noteX = coordinateTransforms.timeToX(clickedNote.time || clickedNote.start)
      const noteWidth = coordinateTransforms.durationToWidth(clickedNote.duration)
      const rightResizeAreaStart = noteX + noteWidth - 8
      return x >= rightResizeAreaStart && x <= noteX + noteWidth
    })()

    const isLeftResizeArea = clickedNote && (() => {
      const noteX = coordinateTransforms.timeToX(clickedNote.time || clickedNote.start)
      return x >= noteX && x <= noteX + 8
    })()

    const isResizeArea = isRightResizeArea || isLeftResizeArea

    if (clickedNote) {
      // リサイズモードの処理
      if (isResizeArea) {
        setSelectedNoteId(clickedNote.id)
        // リサイズ状態を設定（必要に応じて実装）
        return
      }

      if (e.shiftKey) {
        // Shift+クリックで複数選択
        setSelectedNoteId(clickedNote.id)
        return
      } else {
        setSelectedNoteId(clickedNote.id)
        // ドラッグ状態を設定（必要に応じて実装）
        return
      }
    }

    if (!e.shiftKey) {
      setSelectedNoteId(null)
    }

    // 新しいノートの作成（既存のノートがない場所でのみ）
    if (e.shiftKey) return

    // 空の領域でのみ長押しでノート作成
    if (!clickedNote) {
      const longPressTimer = setTimeout(() => {
        addNote(snappedPitch, snappedTime, 0.25, 0.8)

        if (state.audioEnabled) {
          audio.playNote(snappedPitch, 0.1, 0.5)
        }
      }, 200) // 200msの長押し

      // マウスアップ時にタイマーをクリア
      const handleMouseUp = () => {
        clearTimeout(longPressTimer)
        document.removeEventListener('mouseup', handleMouseUp)
      }
      document.addEventListener('mouseup', handleMouseUp)
    }
  }, [coordinateTransforms, state.notes, state.audioEnabled, audio, addNote])

  const handleMouseMove = useCallback((e) => {
    if (e.buttons === 4) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // カーソル変更処理
    if (x >= DIFFSINGER_CONSTANTS.PIANO_WIDTH) {
      const pitch = coordinateTransforms.yToPitch(y)
      const time = coordinateTransforms.xToTime(x)

      if (pitch >= DIFFSINGER_CONSTANTS.OCTAVE_RANGE[0] * 12 && pitch <= DIFFSINGER_CONSTANTS.OCTAVE_RANGE[1] * 12 + 11 &&
          time >= 0 && time <= coordinateTransforms.maxTime) {

        const hoveredNote = state.notes?.find(note => {
          const noteX = coordinateTransforms.timeToX(note.time || note.start)
          const noteY = coordinateTransforms.pitchToY(note.pitch)
          const noteWidth = coordinateTransforms.durationToWidth(note.duration)
          const noteHeight = DIFFSINGER_CONSTANTS.NOTE_HEIGHT

          return x >= noteX && x <= noteX + noteWidth && y >= noteY && y <= noteY + noteHeight
        })

        if (hoveredNote) {
          const noteX = coordinateTransforms.timeToX(hoveredNote.time || hoveredNote.start)
          const noteWidth = coordinateTransforms.durationToWidth(hoveredNote.duration)
          const rightResizeAreaStart = noteX + noteWidth - 8
          const leftResizeAreaEnd = noteX + 8

          if ((x >= rightResizeAreaStart && x <= noteX + noteWidth) ||
              (x >= noteX && x <= leftResizeAreaEnd)) {
            // リサイズエリアにカーソルがある場合
            e.currentTarget.style.cursor = 'ew-resize'
          } else {
            // ノートの中央部分にカーソルがある場合
            e.currentTarget.style.cursor = 'pointer'
          }
        } else {
          // ノートがない場所
          e.currentTarget.style.cursor = 'default'
        }
      } else {
        e.currentTarget.style.cursor = 'default'
      }
    }

    // ノート作成中のドラッグ処理（必要に応じて実装）
  }, [coordinateTransforms, state.notes])

  const handleMouseUp = useCallback((e) => {
    if (e.button === 2) return

    // カーソルをリセット
    if (e.currentTarget) {
      e.currentTarget.style.cursor = 'default'
    }
  }, [])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()

    // コンテキストメニューの処理
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (x >= DIFFSINGER_CONSTANTS.PIANO_WIDTH) {
      const pitch = coordinateTransforms.yToPitch(y)
      const time = coordinateTransforms.xToTime(x)

      const clickedNote = state.notes?.find(note => {
        const noteX = coordinateTransforms.timeToX(note.time || note.start)
        const noteY = coordinateTransforms.pitchToY(note.pitch)
        const noteWidth = coordinateTransforms.durationToWidth(note.duration)
        const noteHeight = DIFFSINGER_CONSTANTS.NOTE_HEIGHT

        return x >= noteX && x <= noteX + noteWidth && y >= noteY && y <= noteY + noteHeight
      })

      if (clickedNote) {
        // ノートのコンテキストメニュー
        showNoteContextMenu(e, clickedNote)
      } else {
        // 空の領域のコンテキストメニュー
        showEmptyAreaContextMenu(e, time, pitch)
      }
    }
  }, [coordinateTransforms, state.notes])

  // ノートのコンテキストメニュー
  const showNoteContextMenu = useCallback((e, note) => {
    const menu = document.createElement('div')
    menu.className = 'diffsinger-context-menu'
    menu.style.cssText = `
      position: fixed;
      top: ${e.clientY}px;
      left: ${e.clientX}px;
      background: #1f2937;
      border: 1px solid #4b5563;
      border-radius: 8px;
      padding: 6px 0;
      z-index: 9999;
      font-size: 13px;
      color: #f9fafb;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      min-width: 160px;
    `

    const menuItems = [
      { text: '歌詞を設定', action: () => setSelectedNoteId(note.id) },
      { text: 'ノートを削除', action: () => removeNote(note.id), destructive: true },
      { text: 'コピー', action: () => {/* コピー処理 */} },
      { text: 'カット', action: () => {/* カット処理 */} }
    ]

    menuItems.forEach(item => {
      const menuItem = document.createElement('div')
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        transition: background-color 0.15s ease;
        ${item.destructive ? 'color: #ef4444;' : ''}
      `
      menuItem.textContent = item.text
      menuItem.onclick = () => {
        item.action()
        document.body.removeChild(menu)
      }
      menuItem.onmouseenter = () => {
        menuItem.style.backgroundColor = '#374151'
      }
      menuItem.onmouseleave = () => {
        menuItem.style.backgroundColor = 'transparent'
      }
      menu.appendChild(menuItem)
    })

    document.body.appendChild(menu)

    // メニュー外クリックで閉じる
    const closeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu)
      }
      document.removeEventListener('click', closeMenu)
    }
    document.addEventListener('click', closeMenu)
  }, [removeNote])

  // 空の領域のコンテキストメニュー
  const showEmptyAreaContextMenu = useCallback((e, time, pitch) => {
    const menu = document.createElement('div')
    menu.className = 'diffsinger-context-menu'
    menu.style.cssText = `
      position: fixed;
      top: ${e.clientY}px;
      left: ${e.clientX}px;
      background: #1f2937;
      border: 1px solid #4b5563;
      border-radius: 8px;
      padding: 6px 0;
      z-index: 9999;
      font-size: 13px;
      color: #f9fafb;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      min-width: 160px;
    `

    const menuItems = [
      { text: 'ノートを追加', action: () => {
        const newNote = {
          id: 'note-' + Date.now(),
          pitch: Math.round(pitch),
          time: Math.round(time * 4) / 4,
          start: Math.round(time * 4) / 4,
          duration: 0.25,
          velocity: 0.8,
          lyric: '',
          phoneme: '',
          vocalParams: { ...vocalParams }
        }
        addNote(newNote.pitch, newNote.time, newNote.duration, newNote.velocity)
      }},
      { text: 'ペースト', action: () => {/* ペースト処理 */} }
    ]

    menuItems.forEach(item => {
      const menuItem = document.createElement('div')
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        transition: background-color 0.15s ease;
      `
      menuItem.textContent = item.text
      menuItem.onclick = () => {
        item.action()
        document.body.removeChild(menu)
      }
      menuItem.onmouseenter = () => {
        menuItem.style.backgroundColor = '#374151'
      }
      menuItem.onmouseleave = () => {
        menuItem.style.backgroundColor = 'transparent'
      }
      menu.appendChild(menuItem)
    })

    document.body.appendChild(menu)

    // メニュー外クリックで閉じる
    const closeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu)
      }
      document.removeEventListener('click', closeMenu)
    }
    document.addEventListener('click', closeMenu)
  }, [addNote, vocalParams])

  const handleTimelineClick = useCallback((e) => {
    // タイムラインクリック時の処理
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = coordinateTransforms.xToTime(x)

    if (state.setCurrentTime) {
      state.setCurrentTime(time)
    }
  }, [coordinateTransforms, state])

  const handleSmoothScroll = useCallback((smoothScrollFn) => {
    // 滑らかなスクロール関数を保存
  }, [])

  const handlePianoRollClick = useCallback((pitch) => {
    // ピアノロールクリック時の音再生
    if (state.audioEnabled) {
      audio.playNote(pitch, 0.1, 0.5)
    }
  }, [state.audioEnabled, audio])

  // 初期化が完了していない場合は初期化を促す
  useEffect(() => {
    if (!state.isInitialized) {
      console.log('DiffSingerTrack: 初期化を開始')
      state.setIsInitialized(true)
    }
  }, []) // 空の依存関係配列で一度だけ実行

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e) => {
      // DeleteキーまたはBackspaceキーで選択されたノートを削除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNoteIds.length > 0) {
          e.preventDefault()
          console.log('DiffSingerTrack: キーボードで複数ノート削除', selectedNoteIds)
          selectedNoteIds.forEach(noteId => removeNote(noteId))
          clearSelection()
        } else if (selectedNoteId) {
          e.preventDefault()
          console.log('DiffSingerTrack: キーボードでノート削除', selectedNoteId)
          removeNote(selectedNoteId)
          setSelectedNoteId(null)
        }
      }

      // Escapeキーで選択をクリア
      if (e.key === 'Escape') {
        clearSelection()
      }

      // Ctrl+Aで全選択
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault()
        const allNoteIds = state.notes.map(note => note.id)
        setSelectedNoteIds(allNoteIds)
        if (allNoteIds.length > 0) {
          setSelectedNoteId(allNoteIds[0])
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedNoteId, selectedNoteIds, removeNote, clearSelection, state.notes])

  // 設定クリア機能
  const clearSettings = useCallback(() => {
    try {
      console.log('DiffSingerTrack: 設定クリア開始', trackId)

      // ボーカルパラメータをデフォルトにリセット
      const defaultParams = {}
      Object.entries(VOCAL_PARAMS).forEach(([key, config]) => {
        if (config.type === 'boolean') {
          defaultParams[key] = config.default
        } else {
          defaultParams[key] = config.default
        }
      })
      setVocalParams(defaultParams)

      // 音質設定をデフォルトにリセット
      setAudioQuality({
        enable_enhancement: true,
        normalization: { enabled: true, target_rms: 0.08, max_gain: 1.5 },
        noise_reduction: { enabled: true, high_freq_cutoff: 6000 },
        compression: { enabled: true, threshold: 0.25, ratio: 3.0 },
        eq: { enabled: true, clarity_boost: 1.15 }
      })

      // キャッシュ設定をデフォルトにリセット
      setCacheSettings({
        enabled: true,
        max_size_mb: 2048
      })

      console.log('DiffSingerTrack: 設定をクリアしました', trackId)
    } catch (error) {
      console.error('DiffSingerTrack: 設定クリアエラー', error)
    }
  }, [trackId])

  // プロジェクトデータのエクスポート
  const exportProjectData = useCallback(() => {
    const projectData = {
      version: '1.0',
      trackId: trackId,
      trackName: trackName,
      notes: state.notes || [],
      notePhonemes: notePhonemes || {},
      lyrics: lyrics,
      lyricsHistory: lyricsHistory || [],
      autoApplyLyrics: autoApplyLyrics,
      vocalParams: vocalParams,
      audioQuality: audioQuality,
      cacheSettings: cacheSettings,
      exportDate: new Date().toISOString()
    }

    const dataStr = JSON.stringify(projectData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement('a')
    link.href = url
    link.download = `diffsinger_project_${trackId}_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    console.log('DiffSingerTrack: プロジェクトデータをエクスポートしました', trackId)
  }, [trackId, trackName, state.notes, notePhonemes, lyrics, lyricsHistory, autoApplyLyrics, vocalParams, audioQuality, cacheSettings])

  // プロジェクトデータのインポート
  const importProjectData = useCallback((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const projectData = JSON.parse(e.target.result)

        // バージョンチェック
        if (!projectData.version) {
          throw new Error('無効なプロジェクトファイルです')
        }

        // データの復元
        if (projectData.notes) {
          state.setNotes(projectData.notes)
          console.log('DiffSingerTrack: ノートデータをインポートしました', projectData.notes.length, '個')
        }

        if (projectData.notePhonemes) {
          setNotePhonemes(projectData.notePhonemes)
          // インポートした音素データを永続化
          if (trackId && initializationRef.current[trackId]) {
            persistence.savePhonemes(projectData.notePhonemes, trackId)
          }
          console.log('DiffSingerTrack: 音素データをインポートしました', Object.keys(projectData.notePhonemes).length, '個')
        } else if (projectData.notes) {
          // notePhonemes が存在しない場合、ノートの lyric プロパティから音素マッピングを作成
          const noteLyricsPhonemes = {}
          let hasLyrics = false

          projectData.notes.forEach(note => {
            if (note.lyric && note.lyric.trim()) {
              noteLyricsPhonemes[note.id] = note.lyric.trim()
              hasLyrics = true
            }
          })

          if (hasLyrics) {
            setNotePhonemes(noteLyricsPhonemes)
            // 生成した音素データを永続化
            if (trackId && initializationRef.current[trackId]) {
              persistence.savePhonemes(noteLyricsPhonemes, trackId)
            }
            console.log('DiffSingerTrack: ノートの lyric プロパティから音素データを生成しました', Object.keys(noteLyricsPhonemes).length, '個')
            console.log('DiffSingerTrack: 生成された音素データ:', noteLyricsPhonemes)
          }
        }

        if (projectData.lyrics !== undefined) {
          setLyrics(projectData.lyrics)
          console.log('DiffSingerTrack: 歌詞をインポートしました')
        }

        if (projectData.lyricsHistory) {
          setLyricsHistory(projectData.lyricsHistory)
          console.log('DiffSingerTrack: 歌詞履歴をインポートしました', projectData.lyricsHistory.length, '個')
        }

        if (projectData.autoApplyLyrics !== undefined) {
          setAutoApplyLyrics(projectData.autoApplyLyrics)
          console.log('DiffSingerTrack: 自動適用設定をインポートしました')
        }

        if (projectData.vocalParams) {
          setVocalParams(projectData.vocalParams)
          console.log('DiffSingerTrack: ボーカルパラメータをインポートしました')
        }

        if (projectData.audioQuality) {
          setAudioQuality(projectData.audioQuality)
          console.log('DiffSingerTrack: 音質設定をインポートしました')
        }

        if (projectData.cacheSettings) {
          setCacheSettings(projectData.cacheSettings)
          console.log('DiffSingerTrack: キャッシュ設定をインポートしました')
        }

        console.log('DiffSingerTrack: プロジェクトデータをインポートしました', trackId)
      } catch (error) {
        console.error('DiffSingerTrack: プロジェクトデータインポートエラー', error)
        alert('プロジェクトファイルの読み込みに失敗しました: ' + error.message)
      }
    }
    reader.readAsText(file)
  }, [trackId, state])

  return (
    <div className="diffsinger-track-container flex flex-col h-full bg-gray-900 dark:bg-gray-900 relative">

      {/* ツールバー */}
      <div className="flex items-center justify-between p-2 bg-gray-800 dark:bg-gray-800 border-b border-gray-700 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Mic className="w-3 h-3 mr-1" />
            {trackName}
          </Badge>
          <Button
            onClick={generateVoice}
            disabled={false}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ opacity: 1, pointerEvents: 'auto' }}
            title="DiffSinger音声合成を実行します"
          >
            <Mic className="w-4 h-4 mr-1" />
            音声生成
          </Button>
          <Button
            onClick={exportProjectData}
            size="sm"
            variant="outline"
            className="border-green-600 text-green-300 hover:bg-green-600 hover:text-white"
            title="プロジェクトをエクスポート"
          >
            <Music className="w-4 h-4 mr-1" />
            エクスポート
          </Button>
          <Button
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.json'
              input.onchange = (e) => {
                if (e.target.files[0]) {
                  importProjectData(e.target.files[0])
                }
              }
              input.click()
            }}
            size="sm"
            variant="outline"
            className="border-blue-600 text-blue-300 hover:bg-blue-600 hover:text-white"
            title="プロジェクトをインポート"
          >
            <Type className="w-4 h-4 mr-1" />
            インポート
          </Button>
          <Button
            onClick={clearSettings}
            size="sm"
            variant="outline"
            className="border-red-600 text-red-300 hover:bg-red-600 hover:text-white"
            title="設定をクリア"
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            設定クリア
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={state.playPause} className="border-gray-600 text-gray-300 hover:bg-gray-700">
            {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={state.stop} className="border-gray-600 text-gray-300 hover:bg-gray-700">
            <Square className="w-4 h-4" />
          </Button>
          {generatedAudioUrl && (
            <div className="flex items-center space-x-2">
              <audio
                controls
                className="h-8"
                src={generatedAudioUrl}
                onError={(e) => console.error('音声ファイル再生エラー:', e)}
              >
                お使いのブラウザは音声再生をサポートしていません。
              </audio>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const audioElement = document.querySelector('audio[src="' + generatedAudioUrl + '"]')
                  if (audioElement) {
                    audioElement.play()
                  }
                }}
                className="border-green-600 text-green-300 hover:bg-green-600 hover:text-white"
                title="生成された音声を再生"
              >
                <Play className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col min-h-0" ref={containerRef}>
        {/* ピアノロールエディター */}
        <div
          className="bg-gray-800 dark:bg-gray-800 border-b border-gray-700 dark:border-gray-700 relative"
          style={{ height: `${editorHeight}%` }}
        >
          <DiffSingerCanvas
            state={state}
            coordinateTransforms={coordinateTransforms}
            trackId={trackId}
            trackColor={trackColor}
            onNoteSelect={setSelectedNoteId}
            onSelectionChange={setSelectedNoteIds}
            notePhonemes={notePhonemes}
            showPhonemes={true}
            selectedNoteId={selectedNoteId}
            selectedNoteIds={selectedNoteIds}
            vocalParams={vocalParams}
            isGenerating={isGenerating}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            onTimelineClick={handleTimelineClick}
            onSmoothScroll={handleSmoothScroll}
            onPianoRollClick={handlePianoRollClick}
            onNoteAdd={addNote}
            onNoteEdit={editNote}
            projectManager={projectManager}
            // 定数
            GRID_HEIGHT={DIFFSINGER_CONSTANTS.GRID_HEIGHT}
            GRID_WIDTH={DIFFSINGER_CONSTANTS.GRID_WIDTH}
            PIANO_WIDTH={DIFFSINGER_CONSTANTS.PIANO_WIDTH}
            HEADER_HEIGHT={DIFFSINGER_CONSTANTS.HEADER_HEIGHT}
            NOTE_HEIGHT={DIFFSINGER_CONSTANTS.NOTE_HEIGHT}
            OCTAVE_RANGE={DIFFSINGER_CONSTANTS.OCTAVE_RANGE}
            TOTAL_KEYS={DIFFSINGER_CONSTANTS.TOTAL_KEYS}
          />

          {/* リサイズハンドル */}
          <div
            className="absolute bottom-0 left-0 right-0 h-2 bg-gray-700 dark:bg-gray-700 cursor-ns-resize hover:bg-gray-600 dark:hover:bg-gray-600"
            onMouseDown={(e) => {
              e.preventDefault()
              const startY = e.clientY
              const startHeight = editorHeight

              const handleMouseMove = (e) => {
                const deltaY = e.clientY - startY
                const containerHeight = e.currentTarget.parentElement.parentElement.clientHeight
                const newHeight = Math.max(20, Math.min(80, startHeight + (deltaY / containerHeight) * 100))
                setEditorHeight(newHeight)
              }

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
              }

              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}
          />
        </div>

        {/* 設定パネル - 解決策2: 明示的な最小高さとスクロール可視性向上 */}
        <div
          className="bg-gray-800 dark:bg-gray-800 border-t border-gray-700 dark:border-gray-700 relative overflow-hidden"
          style={{ height: `${100 - editorHeight}%`, minHeight: '300px' }}
        >
          <div className="flex h-full">
            {/* ノートプロパティ */}
            <div
              className="bg-gray-800 dark:bg-gray-800 border-r border-gray-700 dark:border-gray-700 overflow-y-auto"
              style={{ width: `${settingsWidth}%` }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    ノート設定
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedNote ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-600 dark:text-gray-400">
                          選択ノート: {selectedNote.pitch} ({selectedNote.start.toFixed(2)}s)
                          {selectedNoteIds.length > 1 && (
                            <span className="ml-2 text-purple-400">
                              +{selectedNoteIds.length - 1}個選択中
                            </span>
                          )}
                        </Label>
                        <div className="flex space-x-2">
                          <Input
                            value={notePhonemes[selectedNote.id] || ''}
                            onChange={(e) => handleNotePhonemeChange(e.target.value)}
                            placeholder={selectedNoteIds.length > 1 ? "複数選択中 - 個別編集" : "音素 (例: ko, shi, ra)"}
                            className="flex-1"
                            disabled={selectedNoteIds.length > 1}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleNotePhonemeChange('a')}
                            disabled={selectedNoteIds.length > 1}
                          >
                            a
                          </Button>
                          {selectedNoteIds.length > 1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // 選択されたすべてのノートに同じ音素を適用
                                selectedNoteIds.forEach(noteId => {
                                  handleNotePhonemeChange('a', noteId)
                                })
                              }}
                              className="border-purple-600 text-purple-300 hover:bg-purple-600 hover:text-white"
                            >
                              全選択に適用
                            </Button>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <Label className="text-sm font-medium">ボーカルパラメータ</Label>
                        {Object.entries(VOCAL_PARAMS).map(([key, config]) => (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <Label className="text-xs text-gray-600 dark:text-gray-400">
                                {key.replace('_', ' ')}
                              </Label>
                              <span className="text-xs text-gray-500">
                                {vocalParams[key]}
                              </span>
                            </div>
                            <Slider
                              value={[vocalParams[key]]}
                              onValueChange={(value) => handleParamChange(key, value[0])}
                              min={config.min}
                              max={config.max}
                              step={config.step}
                              className="w-full"
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">ノートを選択してください</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 歌詞入力エリア - 解決策2: スクロール可視性向上 + 解決策3: ref追加 */}
            <div
              ref={lyricsAreaRef}
              className="bg-gray-800 dark:bg-gray-800 p-4 overflow-y-auto"
              style={{
                width: `${100 - settingsWidth}%`,
                maxHeight: '100%',
                scrollBehavior: 'smooth'
              }}
            >
              {/* 解決策2: スクロールインジケーター */}
              <div className="sticky top-0 z-10 bg-gradient-to-b from-purple-600/20 to-transparent h-1 mb-2 rounded-full"></div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="lyrics" className="text-gray-300 font-semibold text-base">歌詞入力</Label>
                  <Textarea
                    id="lyrics"
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="歌詞を入力してください..."
                    className="mt-2 bg-gray-700 border-gray-600 text-gray-300 placeholder-gray-400"
                    rows={4}
                  />
                  <div className="flex items-center space-x-2 mt-2">
                    <Button
                      onClick={applyLyricsToNotes}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Type className="w-4 h-4 mr-1" />
                      歌詞を適用
                    </Button>
                    <Button
                      onClick={() => setLyrics('')}
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      クリア
                    </Button>
                  </div>
                </div>

                {/* 歌詞履歴 */}
                {lyricsHistory.length > 0 && (
                  <div>
                    <Label className="text-gray-300">歌詞履歴</Label>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {lyricsHistory.map((lyric, index) => (
                        <div
                          key={index}
                          className="p-2 bg-gray-700 rounded text-sm text-gray-300 cursor-pointer hover:bg-gray-600"
                          onClick={() => setLyrics(lyric)}
                        >
                          {lyric}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 音素表示 */}
                {Object.keys(notePhonemes).length > 0 && (
                  <div>
                    <Label className="text-gray-300">音素マッピング</Label>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {Object.entries(notePhonemes).map(([noteId, phoneme]) => {
                        const note = state.notes?.find(n => n.id === noteId)
                        return (
                          <div key={noteId} className="p-2 bg-gray-700 rounded text-sm text-gray-300">
                            <span className="font-mono">{note?.pitch || '?'}</span>
                            <span className="mx-2">→</span>
                            <span className="font-mono text-purple-300">{phoneme}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 進捗表示 */}
                <GenerationProgress
                  progress={generationProgress}
                  onCancel={() => {
                    // キャンセル処理
                    setGenerationProgress({ status: 'idle', progress: 0, message: '' })
                  }}
                  onRetry={generateVoice}
                />

                {/* 音質設定パネル */}
                <AudioQualityPanel
                  audioQuality={audioQuality}
                  onAudioQualityChange={handleAudioQualityChange}
                  cacheSettings={cacheSettings}
                  onCacheSettingChange={handleCacheSettingChange}
                />
              </div>
            </div>
          </div>

          {/* 設定パネルリサイズハンドル */}
          <div
            className="absolute top-0 bottom-0 w-2 bg-gray-700 dark:bg-gray-700 cursor-ew-resize hover:bg-gray-600 dark:hover:bg-gray-600"
            style={{ left: `${settingsWidth}%` }}
            onMouseDown={(e) => {
              e.preventDefault()
              const startX = e.clientX
              const startWidth = settingsWidth

              const handleMouseMove = (e) => {
                const deltaX = e.clientX - startX
                const containerWidth = e.currentTarget.parentElement.clientWidth
                const newWidth = Math.max(20, Math.min(80, startWidth + (deltaX / containerWidth) * 100))
                setSettingsWidth(newWidth)
              }

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
              }

              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}
          />
        </div>
      </div>

      {/* ステータスバー */}
      <MidiEditorStatusBar
        tempo={state.tempo}
        onTempoChange={onGlobalTempoChange}
        isPlaying={state.isPlaying}
        currentTime={state.currentTime}
        totalNotes={state.notes.length}
        selectedNotes={state.selectedNotes.size}
        trackName={trackName}
        isGenerating={isGenerating}
      />
    </div>
  )
}

export default memo(DiffSingerTrack)
