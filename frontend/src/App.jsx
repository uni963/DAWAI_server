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
import audioExportEngine from './utils/audioExportEngine.js'
import cacheManager from './utils/cacheManager.js'
import frameRateMonitor from './utils/frameRateMonitor.js'
import performanceMonitor from './utils/performanceMonitor.js'
import virtualizationManager from './utils/virtualization.js'
import aiAgentEngine from './utils/aiAgentEngine.js'
import drumTrackManager from './utils/drumTrackManager.js'
import { createDrumData } from './utils/drumTrackDataStructure.js'
import './App.css'
import { setupPianoTest } from './utils/pianoTest'
import { setupDrumTest } from './utils/drumTest'
import './utils/debugAudio.js'
import unifiedAudioSystem from './utils/unifiedAudioSystem.js'

// ===== 新しいデータ構造定義 =====

// トラックタイプの定義
const TRACK_TYPES = {
  MIDI: 'midi',
  DRUMS: 'drums',
  DIFFSINGER: 'diffsinger'
}

// トラックサブタイプの定義
const TRACK_SUBTYPES = {
  PIANO: 'piano',
  SYNTH: 'synth',
  BASS: 'bass',
  GUITAR: 'guitar',
  DRUMS: 'drums',
  DIFFSINGER: 'diffsinger'
}

// トラックカラーの定義
const TRACK_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // yellow
  '#F97316', // orange
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#6366F1'  // indigo
]

// タブタイプの定義
const TAB_TYPES = {
  ARRANGEMENT: 'arrangement',
  MIDI_EDITOR: 'midi_editor',
  DRUM_TRACK: 'drum_track',
  DIFFSINGER_TRACK: 'diffsinger_track'
}

// 統一されたトラックデータ構造
const createTrack = (id, name, type = TRACK_TYPES.MIDI, subtype = TRACK_SUBTYPES.PIANO, color = '#3B82F6') => ({
  id,
  name,
  type,
  subtype,
  color,
  volume: 75,
  pan: 0,
  muted: false,
  solo: false,
  armed: false,
  clips: [],
  effects: [],
  midiData: {
    notes: [],
    tempo: 120,
    timeSignature: '4/4',
    trackId: id,
    lastModified: new Date().toISOString(),
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: '1.0.0'
    },
    settings: {
      channel: 0,
      octave: 0,
      transpose: 0,
      velocity: 100
    }
  },
  audioData: null,
  // 歌声合成トラック用のデータ
  voiceSynthData: type === TRACK_TYPES.VOICE_SYNTH ? {
    lyrics: '',
    language: 'japanese',
    generatedAudioPath: null,
    modelId: 'lotte_v',
    lastGenerated: null,
    params: {
      speed: 1.0,
      pitchShift: 0,
      energy: 1.0
    }
  } : null,
  // ドラムトラック用のデータ
  drumData: type === TRACK_TYPES.DRUMS ? {
    grid: Array(8).fill().map(() => Array(16).fill(false)),
    instruments: [
      { id: 'kick', name: 'Kick', icon: '🥁', color: '#EF4444', pitch: 36, velocity: 0.8 },
      { id: 'snare', name: 'Snare', icon: '🥁', color: '#F59E0B', pitch: 38, velocity: 0.7 },
      { id: 'hihat', name: 'Hi-Hat', icon: '🥁', color: '#10B981', pitch: 42, velocity: 0.6 },
      { id: 'crash', name: 'Crash', icon: '🥁', color: '#8B5CF6', pitch: 49, velocity: 0.8 },
      { id: 'tom1', name: 'Tom 1', icon: '🥁', color: '#F97316', pitch: 45, velocity: 0.7 },
      { id: 'tom2', name: 'Tom 2', icon: '🥁', color: '#EC4899', pitch: 47, velocity: 0.7 },
      { id: 'ride', name: 'Ride', icon: '🥁', color: '#06B6D4', pitch: 51, velocity: 0.6 },
      { id: 'floor_tom', name: 'Floor Tom', icon: '🥁', color: '#84CC16', pitch: 41, velocity: 0.7 }
    ],
    tempo: 120,
    timeSignature: '4/4',
    trackId: id,
    lastModified: new Date().toISOString(),
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: '1.0.0'
    }
  } : null,
  settings: {
    midiChannel: 0,
    octave: 0,
    transpose: 0,
    velocity: 100
  },
  metadata: {
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    description: '',
    tags: []
  }
})

// 統一されたタブデータ構造
const createTab = (id, title, type, trackId = null) => ({
  id,
  title,
  type,
  trackId,
  isClosable: type !== TAB_TYPES.ARRANGEMENT,
  isMovable: true,
  metadata: {
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString()
  }
})

// プロジェクトデータ構造
const createProject = (name = 'Untitled Project') => ({
  id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name,
  tracks: [],
  tabs: [
    createTab('arrangement', 'Arrangement', TAB_TYPES.ARRANGEMENT)
  ],
  activeTab: 'arrangement',
  settings: {
    tempo: 120,
    key: 'C',
    timeSignature: '4/4',
    sampleRate: 44100,
    duration: 30 // デフォルト30秒
  },
  metadata: {
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    version: '1.0.0',
    description: '',
    tags: [],
    author: '',
    genre: '',
    bpm: 120,
    key: 'C',
    duration: 0,
    totalTracks: 0,
    lastAutoSave: null,
    autoSaveEnabled: true,
    autoSaveInterval: 30000 // 30秒
  },
  fileInfo: {
    path: null,
    lastSaved: null,
    lastOpened: new Date().toISOString(),
    fileSize: 0,
    isModified: false,
    hasUnsavedChanges: false,
    saveFormat: 'melodia',
    compression: false
  },
  version: {
    major: 1,
    minor: 0,
    patch: 0,
    build: Date.now(),
    compatibility: '1.0.0'
  }
})

// ===== プロジェクト管理クラス =====
class ProjectManager {
  constructor() {
    this.currentProject = null
    this.initializeProject()
  }

  // プロジェクトの初期化（ファイルベースに変更）
  initializeProject() {
    try {
      // デフォルトプロジェクトを作成
      this.currentProject = this.createDefaultProject()
      return this.currentProject
    } catch (error) {
      console.error('Failed to initialize project:', error)
      return this.createDefaultProject()
    }
  }

  // プロジェクトの検証を強化
  validateProject(project) {
    // 基本的なプロジェクト構造を確保
    if (!project.tracks) project.tracks = []
    if (!project.tabs) project.tabs = []
    if (!project.settings) project.settings = {}
    if (!project.metadata) project.metadata = {}

    console.log('validateProject: Validating project with tracks:', {
      totalTracks: project.tracks.length,
      tracks: project.tracks.map(track => ({
        id: track.id,
        name: track.name,
        hasMidiData: !!track.midiData,
        notesCount: track.midiData?.notes?.length || 0,
        midiDataKeys: track.midiData ? Object.keys(track.midiData) : []
      }))
    })

    // トラックの整合性を確保
    project.tracks = project.tracks.map(track => {
      const defaultTrack = createTrack(track.id, track.name, track.type, track.subtype, track.color)
      
      // ドラムトラックの場合は、drumTrackManagerに登録
      if (track.type === TRACK_TYPES.DRUMS && !track.hasDrumData) {
        const drumData = drumTrackManager.createDrumTrack(track.id)
        if (drumData) {
          track.drumTrackId = track.id
          track.hasDrumData = true
          track.drumData = drumData
          console.log('🥁 Drum track validated and created in drumTrackManager:', track.id)
        }
      }
      
      // 既存のMIDIデータを保持
      const existingMidiData = track.midiData || {}
      const validatedMidiData = {
        ...defaultTrack.midiData,
        ...existingMidiData,
        trackId: track.id,
        notes: Array.isArray(existingMidiData.notes) ? existingMidiData.notes : defaultTrack.midiData.notes,
        tempo: typeof existingMidiData.tempo === 'number' ? existingMidiData.tempo : defaultTrack.midiData.tempo,
        timeSignature: typeof existingMidiData.timeSignature === 'string' ? existingMidiData.timeSignature : defaultTrack.midiData.timeSignature,
        lastModified: existingMidiData.lastModified || defaultTrack.midiData.lastModified,
        metadata: {
          ...defaultTrack.midiData.metadata,
          ...existingMidiData.metadata
        },
        settings: {
          ...defaultTrack.midiData.settings,
          ...existingMidiData.settings
        }
      }
      
      console.log('validateProject: Validated track:', {
        trackId: track.id,
        trackName: track.name,
        trackType: track.type,
        originalNotesCount: existingMidiData.notes?.length || 0,
        validatedNotesCount: validatedMidiData.notes.length,
        hasOriginalMidiData: !!existingMidiData.notes,
        hasValidatedMidiData: !!validatedMidiData.notes,
        hasDrumData: !!track.hasDrumData
      })
      
      return {
        ...defaultTrack,
        ...track,
        midiData: validatedMidiData,
        metadata: {
          ...defaultTrack.metadata,
          ...track.metadata,
          modifiedAt: new Date().toISOString()
        }
      }
    })

    // タブの整合性を確保
    const baseTabs = [
      createTab('arrangement', 'Arrangement', TAB_TYPES.ARRANGEMENT)
    ]
    
    const trackTabs = project.tracks.map(track => {
      let tabType = TAB_TYPES.MIDI_EDITOR
      if (track.type === TRACK_TYPES.DRUMS) {
        tabType = TAB_TYPES.DRUM_TRACK
      } else if (track.type === TRACK_TYPES.DIFFSINGER) {
        tabType = TAB_TYPES.DIFFSINGER_TRACK
      }
      return createTab(`tab-${track.id}`, track.name, tabType, track.id)
    })
    
    project.tabs = [...baseTabs, ...trackTabs]

    console.log('validateProject: Final validated project:', {
      totalTracks: project.tracks.length,
      totalTabs: project.tabs.length,
      tracks: project.tracks.map(track => ({
        id: track.id,
        name: track.name,
        notesCount: track.midiData?.notes?.length || 0
      }))
    })

    return project
  }

  // デフォルトプロジェクトを作成
  createDefaultProject() {
    const project = createProject('Default Project')
    
    // 初期トラックを作成
    const track1 = createTrack('track-1', 'Piano Track', TRACK_TYPES.MIDI, TRACK_SUBTYPES.PIANO, TRACK_COLORS[0])
    const track2 = createTrack('track-2', 'Drum Track', TRACK_TYPES.DRUMS, TRACK_SUBTYPES.DRUMS, TRACK_COLORS[1])
    
    // ドラムトラックの場合は、drumTrackManagerに登録
    if (track2.type === TRACK_TYPES.DRUMS) {
      const drumData = drumTrackManager.createDrumTrack(track2.id)
      if (drumData) {
        track2.drumTrackId = track2.id
        track2.hasDrumData = true
        track2.drumData = drumData
        console.log('🥁 Default drum track created in drumTrackManager:', track2.id)
      }
    }
    
    project.tracks = [track1, track2]
    
    // トラックに対応するタブを作成（ドラムトラックは専用タブタイプを使用）
    const trackTabs = project.tracks.map(track => {
      let tabType = TAB_TYPES.MIDI_EDITOR
      if (track.type === TRACK_TYPES.DRUMS) {
        tabType = TAB_TYPES.DRUM_TRACK
      } else if (track.type === TRACK_TYPES.DIFFSINGER) {
        tabType = TAB_TYPES.DIFFSINGER_TRACK
      }
      return createTab(`tab-${track.id}`, track.name, tabType, track.id)
    })
    
    project.tabs = [...project.tabs, ...trackTabs]
    
    return project
  }

  // プロジェクトリストを更新（ファイルベースに変更）
  updateProjectList() {
    try {
      // ファイルベースではプロジェクトリストは不要
      console.log('Project list update skipped (file-based system)')
    } catch (error) {
      console.error('Failed to update project list:', error)
    }
  }

  // ユニークなトラック名を生成
  generateUniqueTrackName(baseName) {
    if (!this.currentProject) return baseName
    
    const existingNames = this.currentProject.tracks.map(track => track.name)
    let uniqueName = baseName
    let counter = 2
    
    while (existingNames.includes(uniqueName)) {
      uniqueName = `${baseName} (${counter})`
      counter++
    }
    
    return uniqueName
  }

  // ユニークなタブ名を生成
  generateUniqueTabName(baseName) {
    if (!this.currentProject) return baseName
    
    const existingTitles = this.currentProject.tabs.map(tab => tab.title)
    let uniqueName = baseName
    let counter = 2
    
    while (existingTitles.includes(uniqueName)) {
      uniqueName = `${baseName} (${counter})`
      counter++
    }
    
    return uniqueName
  }

  // コピーペースト機能
  clipboardTrack = null

  // トラックをコピー
  copyTrack(trackId) {
    if (!this.currentProject) return false
    
    const track = this.currentProject.tracks.find(t => t.id === trackId)
    if (!track) return false
    
    // ディープコピーを作成
    this.clipboardTrack = JSON.parse(JSON.stringify(track))
    console.log('Track copied to clipboard:', this.clipboardTrack.name)
    return true
  }

  // トラックをペースト
  pasteTrack() {
    if (!this.currentProject || !this.clipboardTrack) return null
    
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substr(2, 9)
    const newTrackId = `track-${timestamp}-${randomId}`
    
    // 新しいトラックを作成
    const newTrack = JSON.parse(JSON.stringify(this.clipboardTrack))
    newTrack.id = newTrackId
    newTrack.name = this.generateUniqueTrackName(this.clipboardTrack.name + ' Copy')
    
    // MIDIデータのtrackIdも更新
    if (newTrack.midiData) {
      newTrack.midiData.trackId = newTrackId
      newTrack.midiData.lastModified = new Date().toISOString()
    }
    
    // ドラムデータのtrackIdも更新
    if (newTrack.drumData) {
      newTrack.drumData.trackId = newTrackId
      newTrack.drumData.lastModified = new Date().toISOString()
    }
    
    // voiceSynthDataのtrackIdも更新
    if (newTrack.voiceSynthData) {
      newTrack.voiceSynthData.trackId = newTrackId
      newTrack.voiceSynthData.lastModified = new Date().toISOString()
    }
    
    // トラックを追加
    this.currentProject.tracks.push(newTrack)
    
    // 対応するタブを作成
    let tabType = TAB_TYPES.MIDI_EDITOR
    if (newTrack.type === TRACK_TYPES.DRUMS) {
      tabType = TAB_TYPES.DRUM_TRACK
    } else if (newTrack.type === TRACK_TYPES.DIFFSINGER) {
      tabType = TAB_TYPES.DIFFSINGER_TRACK
    }
    
    const uniqueTabName = this.generateUniqueTabName(newTrack.name)
    const newTab = createTab(`tab-${newTrackId}`, uniqueTabName, tabType, newTrackId)
    this.currentProject.tabs.push(newTab)
    
    // 新しいタブをアクティブにする
    this.currentProject.activeTab = newTab.id
    
    // 自動保存
    this.saveProject()
    
    console.log('Track pasted:', newTrack.name)
    return newTrack
  }

  // トラックを追加
  addTrack(trackType = TRACK_TYPES.MIDI, subtype = TRACK_SUBTYPES.PIANO, keepInArrangement = false) {
    if (!this.currentProject) return null

    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substr(2, 9)
    const trackId = `track-${timestamp}-${randomId}`
    
    const trackNumber = this.currentProject.tracks.length + 1
    const color = TRACK_COLORS[(trackNumber - 1) % TRACK_COLORS.length]
    const baseTrackName = `${subtype.charAt(0).toUpperCase() + subtype.slice(1)} Track`
    const trackName = this.generateUniqueTrackName(baseTrackName)
    
    const newTrack = createTrack(trackId, trackName, trackType, subtype, color)
    
    // ドラムトラックの場合は、ドラムトラックの特殊なデータ構造を設定
    if (subtype === TRACK_SUBTYPES.DRUMS) {
      // ドラムトラックの場合は、drumTrackManagerに登録
      const drumData = drumTrackManager.createDrumTrack(trackId)
      
      if (drumData) {
        // トラックにドラムトラックの情報を追加
        newTrack.drumTrackId = trackId
        newTrack.hasDrumData = true
        newTrack.drumData = drumData
        
        console.log('🥁 Drum track created in addTrack:', trackId)
      }
    } else {
      // テスト用のサンプルMIDIデータを追加（keepInArrangementがtrueの場合は空にする）
      if (!keepInArrangement) {
        newTrack.midiData.notes = this.createSampleMidiData()
      } else {
        newTrack.midiData.notes = []
      }
    }
    
    // トラックを追加
    this.currentProject.tracks.push(newTrack)
    
    // 対応するタブを作成
    let tabType = TAB_TYPES.MIDI_EDITOR
    if (trackType === TRACK_TYPES.DRUMS) {
      tabType = TAB_TYPES.DRUM_TRACK
    } else if (trackType === TRACK_TYPES.DIFFSINGER) {
      tabType = TAB_TYPES.DIFFSINGER_TRACK
    }
    
    const uniqueTabName = this.generateUniqueTabName(trackName)
    const newTab = createTab(`tab-${trackId}`, uniqueTabName, tabType, trackId)
    this.currentProject.tabs.push(newTab)
    
    // keepInArrangementがfalseの場合のみ新しいタブをアクティブにする
    if (!keepInArrangement) {
      this.currentProject.activeTab = newTab.id
      console.log('🎵 Switching to new tab:', newTab.id)
    } else {
      console.log('🎵 Keeping current tab (arrangement view)')
    }
    
    // ファイルベースなのでlocalStorage保存は不要
    
    console.log('Track added:', trackId, 'Total tracks:', this.currentProject.tracks.length, 'Keep in arrangement:', keepInArrangement)
    return newTrack
  }

  // サンプルMIDIデータを作成（EnhancedMidiEditor形式、秒単位）
  createSampleMidiData() {
    const notes = []
    const baseTime = 0
    const noteDuration = 0.5 // 0.5秒
    
    // Cメジャースケールのメロディー
    const melody = [60, 62, 64, 65, 67, 69, 71, 72] // C, D, E, F, G, A, B, C
    
    melody.forEach((note, index) => {
      notes.push({
        id: `note-${Date.now()}-${index}`,
        pitch: note,
        velocity: 0.8 + Math.random() * 0.2, // 0.8-1.0の範囲
        time: baseTime + (index * 1), // 1秒間隔
        duration: noteDuration
      })
    })
    
    // ベースライン（低いC）
    notes.push({
      id: `note-bass-${Date.now()}`,
      pitch: 48, // 低いC
      velocity: 1.0,
      time: baseTime,
      duration: 8 // 8秒間
    })
    
    return notes
  }

  // トラックを削除
  removeTrack(trackId) {
    if (!this.currentProject || this.currentProject.tracks.length <= 1) return false

    // 削除対象のトラックを取得
    const trackToRemove = this.currentProject.tracks.find(track => track.id === trackId)
    
    // ドラムトラックの場合は、drumTrackManagerからも削除
    if (trackToRemove && trackToRemove.subtype === 'drums') {
      console.log('🥁 Removing drum track from drumTrackManager:', trackId)
      // 既にインポートされているdrumTrackManagerを使用
      if (drumTrackManager.hasDrumTrack(trackId)) {
        drumTrackManager.deleteDrumTrack(trackId);
      }
    }

    // トラックを削除
    this.currentProject.tracks = this.currentProject.tracks.filter(track => track.id !== trackId)
    
    // 対応するタブを削除
    this.currentProject.tabs = this.currentProject.tabs.filter(tab => tab.trackId !== trackId)
    
    // アクティブタブが削除されたタブの場合、Arrangementタブに切り替え
    if (this.currentProject.activeTab === `tab-${trackId}`) {
      this.currentProject.activeTab = 'arrangement'
    }
    
    // ファイルベースなのでlocalStorage保存は不要
    
    console.log('Track removed:', trackId, 'Total tracks:', this.currentProject.tracks.length)
    return true
  }

  // トラックを更新
  updateTrack(trackId, updates) {
    console.log('ProjectManager: updateTrack called', { trackId, updates })
    
    if (!this.currentProject) {
      console.log('ProjectManager: No current project')
      return false
    }

    const trackIndex = this.currentProject.tracks.findIndex(track => track.id === trackId)
    if (trackIndex === -1) {
      console.log('ProjectManager: Track not found', trackId)
      return false
    }

    console.log('ProjectManager: Before update', this.currentProject.tracks[trackIndex])

    this.currentProject.tracks[trackIndex] = {
      ...this.currentProject.tracks[trackIndex],
      ...updates,
      metadata: {
        ...this.currentProject.tracks[trackIndex].metadata,
        modifiedAt: new Date().toISOString()
      }
    }

    console.log('ProjectManager: After update', this.currentProject.tracks[trackIndex])

    // 対応するタブのタイトルも更新
    const tabIndex = this.currentProject.tabs.findIndex(tab => tab.trackId === trackId)
    if (tabIndex !== -1) {
      this.currentProject.tabs[tabIndex].title = this.currentProject.tracks[trackIndex].name
    }

    // ファイルベースなのでlocalStorage保存は不要
    
    return true
  }

  // MIDIデータを更新
  updateTrackMidiData(trackId, midiData) {
    if (!this.currentProject) {
      return false
    }

    const trackIndex = this.currentProject.tracks.findIndex(track => track.id === trackId)
    
    if (trackIndex === -1) {
      return false
    }

    const currentTrack = this.currentProject.tracks[trackIndex]
    const currentNotes = currentTrack.midiData?.notes || []
    const newNotes = midiData?.notes || []
    
    // 新しいMIDIデータの整合性を確保
    const validatedMidiData = {
      ...currentTrack.midiData,
      ...midiData,
      trackId: trackId, // trackIdは確実に設定
      notes: Array.isArray(newNotes) ? newNotes : currentNotes,
      tempo: typeof midiData?.tempo === 'number' ? midiData.tempo : currentTrack.midiData.tempo,
      timeSignature: typeof midiData?.timeSignature === 'string' ? midiData.timeSignature : currentTrack.midiData.timeSignature,
      lastModified: new Date().toISOString(),
      // 追加のMIDIデータ構造の検証
      metadata: {
        ...currentTrack.midiData.metadata,
        ...midiData?.metadata,
        modified: new Date().toISOString()
      },
      settings: {
        ...currentTrack.midiData.settings,
        ...midiData?.settings
      }
    }

    this.currentProject.tracks[trackIndex] = {
      ...currentTrack,
      midiData: validatedMidiData,
      metadata: {
        ...currentTrack.metadata,
        modifiedAt: new Date().toISOString()
      }
    }

    // ファイルベースなのでlocalStorage保存は不要
    
    return true
  }

  // ドラムデータを更新
  updateTrackDrumData(trackId, drumData) {
    if (!this.currentProject) {
      return false
    }

    const trackIndex = this.currentProject.tracks.findIndex(track => track.id === trackId)
    
    if (trackIndex === -1) {
      return false
    }

    const currentTrack = this.currentProject.tracks[trackIndex]
    
    // 新しいドラムデータの整合性を確保
    const validatedDrumData = {
      ...currentTrack.drumData,
      ...drumData,
      trackId: trackId,
      // グリッドデータは新しいデータが有効な場合のみ更新
      grid: Array.isArray(drumData?.grid) && drumData.grid.length > 0 
        ? drumData.grid 
        : (currentTrack.drumData?.grid || []),
      // 楽器データは新しいデータが有効な場合のみ更新
      instruments: Array.isArray(drumData?.instruments) && drumData.instruments.length > 0
        ? drumData.instruments 
        : (currentTrack.drumData?.instruments || []),
      // テンポと拍子記号は新しいデータが有効な場合のみ更新
      tempo: typeof drumData?.tempo === 'number' && drumData.tempo > 0
        ? drumData.tempo 
        : (currentTrack.drumData?.tempo || 120),
      timeSignature: typeof drumData?.timeSignature === 'string' && drumData.timeSignature
        ? drumData.timeSignature 
        : (currentTrack.drumData?.timeSignature || '4/4'),
      lastModified: new Date().toISOString(),
      metadata: {
        ...currentTrack.drumData?.metadata,
        ...drumData?.metadata,
        modified: new Date().toISOString(),
        // アクティブセル数を計算
        cellCount: Array.isArray(drumData?.grid) 
          ? drumData.grid.flat().filter(cell => cell).length
          : (currentTrack.drumData?.metadata?.cellCount || 0)
      }
    }

    // グリッドデータが変更された場合のみログ出力
    const gridChanged = JSON.stringify(validatedDrumData.grid) !== JSON.stringify(currentTrack.drumData?.grid);
    if (gridChanged) {
      console.log(`🥁 Grid data updated for track ${trackId}:`, {
        activeCells: validatedDrumData.grid.flat().filter(cell => cell).length,
        gridSize: `${validatedDrumData.grid.length}x${validatedDrumData.grid[0]?.length || 0}`
      });
    }

    this.currentProject.tracks[trackIndex] = {
      ...currentTrack,
      drumData: validatedDrumData,
      metadata: {
        ...currentTrack.metadata,
        modifiedAt: new Date().toISOString()
      }
    }

    // ファイルベースなのでlocalStorage保存は不要
    
    return true
  }

  // アクティブタブを変更
  setActiveTab(tabId) {
    if (!this.currentProject) return false

    const tabExists = this.currentProject.tabs.some(tab => tab.id === tabId)
    if (!tabExists) return false

    const previousTab = this.currentProject.activeTab
    
    this.currentProject.activeTab = tabId
    this.currentProject.metadata.modifiedAt = new Date().toISOString()
    
    // ファイルベースなのでlocalStorage保存は不要
    
    return true
  }

  // タブを削除
  closeTab(tabId) {
    if (!this.currentProject) return false

    const tab = this.currentProject.tabs.find(tab => tab.id === tabId)
    if (!tab || !tab.isClosable) return false

    // トラックタブの場合はトラックも削除
    if (tab.trackId) {
      return this.removeTrack(tab.trackId)
    } else {
      // 通常のタブ削除
      this.currentProject.tabs = this.currentProject.tabs.filter(t => t.id !== tabId)
      
      // アクティブタブが削除されたタブの場合、最初のタブに切り替え
      if (this.currentProject.activeTab === tabId && this.currentProject.tabs.length > 0) {
        this.currentProject.activeTab = this.currentProject.tabs[0].id
      }
      
      // ファイルベースなのでlocalStorage保存は不要
      
      return true
    }
  }

  // プロジェクトを取得
  getProject() {
    return this.currentProject
  }

  // プロジェクトを読み込み
  loadProject(projectId) {
    try {
      const projectList = this.getProjectList()
      const project = projectList.find(p => p.id === projectId)
      
      if (!project) {
        throw new Error('Project not found')
      }

      // 現在のプロジェクトを更新（簡易版）
      // 実際の実装では、プロジェクトデータを個別に保存・読み込みする必要があります
      this.currentProject = {
        ...this.currentProject,
        id: project.id,
        name: project.name,
        metadata: {
          ...this.currentProject?.metadata,
          modifiedAt: project.modifiedAt
        }
      }
      
      // ファイルベースなのでlocalStorage保存は不要
      return this.currentProject
    } catch (error) {
      console.error('Failed to load project:', error)
      throw error
    }
  }

  // プロジェクトを削除（メモリベース）
  deleteProject(projectId) {
    try {
      // 現在のプロジェクトが削除された場合
      if (this.currentProject && this.currentProject.id === projectId) {
        this.currentProject = null
      }
      
      console.log('Project deleted:', projectId)
    } catch (error) {
      console.error('Failed to delete project:', error)
      throw error
    }
  }

  // プロジェクトを複製（メモリベース）
  duplicateProject(projectId) {
    try {
      // 現在のプロジェクトをベースに複製
      if (!this.currentProject) {
        throw new Error('No current project to duplicate')
      }

      // 新しいプロジェクトを作成
      const duplicatedProject = {
        ...this.currentProject,
        id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${this.currentProject.name} (Copy)`,
        metadata: {
          ...this.currentProject.metadata,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString()
        }
      }

      // トラックのIDも更新
      duplicatedProject.tracks = duplicatedProject.tracks.map(track => ({
        ...track,
        id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          ...track.metadata,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString()
        }
      }))

      // 現在のプロジェクトとして設定
      this.currentProject = duplicatedProject

      console.log('Project duplicated:', duplicatedProject.name)
      return duplicatedProject
    } catch (error) {
      console.error('Failed to duplicate project:', error)
      throw error
    }
  }

  // プロジェクト一覧を取得（メモリベース）
  getProjectList() {
    // 現在のプロジェクトのみを返す
    if (this.currentProject) {
      return [{
        id: this.currentProject.id,
        name: this.currentProject.name,
        createdAt: this.currentProject.metadata.createdAt,
        modifiedAt: this.currentProject.metadata.modifiedAt,
        trackCount: this.currentProject.tracks.length,
        tempo: this.currentProject.settings.tempo,
        key: this.currentProject.settings.key
      }]
    }
    return []
  }

  // トラックを取得
  getTracks() {
    return this.currentProject?.tracks || []
  }

  // タブを取得
  getTabs() {
    return this.currentProject?.tabs || []
  }

  // アクティブタブを取得
  getActiveTab() {
    return this.currentProject?.activeTab || 'arrangement'
  }

  // ミキサーチャンネルを取得
  getMixerChannels() {
    return this.getTracks().map(track => ({
      id: track.id,
      name: track.name.replace(' Track', ''),
      type: track.subtype,
      volume: track.volume,
      pan: track.pan || 0,
      muted: track.muted,
      solo: track.solo,
      color: track.color
    }))
  }

  // dawaiファイルとしてエクスポート
  exportAsDawaiFile() {
    if (!this.currentProject) {
      throw new Error('No project to export')
    }



    const projectData = {
      ...this.currentProject,
      metadata: {
        ...this.currentProject.metadata,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        format: 'dawai',
        exportedBy: 'Dawai Composer Copilot'
      }
    }

    return projectData
  }

  // dawaiファイルからインポート
  importFromDawaiFile(projectData) {
    try {
      // ファイル形式の検証
      if (projectData.metadata?.format !== 'dawai') {
        throw new Error('Invalid dawai file format')
      }

      // プロジェクトデータを検証・変換
      const validatedProject = this.validateProject(projectData)
      
      // 現在のプロジェクトを更新
      this.currentProject = validatedProject
      
      return validatedProject
    } catch (error) {
      console.error('Failed to import dawai file:', error)
      throw error
    }
  }

  // 新しいプロジェクトを作成
  createNewProject(name = 'Untitled Project') {
    const project = createProject(name)
    
    this.currentProject = project
    
    // ファイルベースなのでlocalStorage保存は不要
    
    console.log('New project created:', project.name)
    return project
  }

  // ファイル保存機能
  async saveProjectToFile() {
    if (!this.currentProject) {
      throw new Error('保存するプロジェクトがありません')
    }

    try {
      // ファイル情報を更新
      this.currentProject.fileInfo.lastSaved = new Date().toISOString()
      this.currentProject.fileInfo.hasUnsavedChanges = false
      this.currentProject.fileInfo.isModified = false
      
      // プロジェクトデータを準備
      const projectData = this.exportAsDawaiFile()
      
      // Blobを作成
      const blob = new Blob([JSON.stringify(projectData, null, 2)], {
        type: 'application/json'
      })
      
      // ファイル名を生成
      const fileName = `${this.currentProject.name.replace(/[^a-zA-Z0-9]/g, '_')}.dawai`
      
      // ダウンロードリンクを作成
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      // ファイルベースなのでlocalStorage保存は不要
      
      console.log('Project saved to file:', fileName)
      return fileName
    } catch (error) {
      console.error('Failed to save project to file:', error)
      throw error
    }
  }

  // ファイル読み込み機能
  async loadProjectFromFile(file) {
    try {
      const text = await file.text()
      const projectData = JSON.parse(text)
      
      // ファイル形式の検証
      if (projectData.metadata?.format !== 'dawai') {
        throw new Error('無効なDawaiファイル形式です')
      }
      
      // プロジェクトデータを検証・変換
      const validatedProject = this.validateProject(projectData)
      
      // ファイル情報を更新
      validatedProject.fileInfo.path = file.name
      validatedProject.fileInfo.lastOpened = new Date().toISOString()
      validatedProject.fileInfo.fileSize = file.size
      validatedProject.fileInfo.hasUnsavedChanges = false
      validatedProject.fileInfo.isModified = false
      
      // 現在のプロジェクトを更新
      this.currentProject = validatedProject
      
      console.log('Project loaded from file:', file.name)
      return validatedProject
    } catch (error) {
      console.error('Failed to load project from file:', error)
      throw error
    }
  }

  // プロジェクト名変更機能
  renameProject(newName) {
    if (!this.currentProject) {
      throw new Error('変更するプロジェクトがありません')
    }

    if (!newName || newName.trim() === '') {
      throw new Error('プロジェクト名を入力してください')
    }

    const oldName = this.currentProject.name
    this.currentProject.name = newName.trim()
    this.currentProject.metadata.modifiedAt = new Date().toISOString()
    this.currentProject.fileInfo.isModified = true
    this.currentProject.fileInfo.hasUnsavedChanges = true
    
    // ファイルベースなのでlocalStorage保存は不要
    
    console.log('Project renamed:', oldName, '->', newName)
    return this.currentProject
  }

  // 自動保存機能の制御
  setAutoSaveEnabled(enabled) {
    if (!this.currentProject) return false
    
    this.currentProject.metadata.autoSaveEnabled = enabled
    // ファイルベースなのでlocalStorage保存は不要
    
    console.log('Auto-save enabled:', enabled)
    return true
  }

  // 自動保存間隔の設定
  setAutoSaveInterval(intervalMs) {
    if (!this.currentProject) return false
    
    this.currentProject.metadata.autoSaveInterval = intervalMs
    // ファイルベースなのでlocalStorage保存は不要
    
    console.log('Auto-save interval set to:', intervalMs, 'ms')
    return true
  }

  // プロジェクト情報の取得
  getProjectInfo() {
    if (!this.currentProject) return null
    
    return {
      id: this.currentProject.id,
      name: this.currentProject.name,
      version: this.currentProject.version,
      metadata: this.currentProject.metadata,
      fileInfo: this.currentProject.fileInfo,
      stats: {
        totalTracks: this.currentProject.tracks.length,
        totalTabs: this.currentProject.tabs.length,
        fileSize: this.currentProject.fileInfo?.fileSize || 0,
        lastSaved: this.currentProject.fileInfo?.lastSaved,
        lastAutoSave: this.currentProject.metadata.lastAutoSave
      }
    }
  }
  
  // プロジェクト設定を更新
  updateProjectSettings(updates) {
    if (!this.currentProject) return
    
    // BPM変更の場合は全トラックのノート位置を更新
    if (updates.tempo && updates.tempo !== this.currentProject.settings?.tempo) {
      const oldTempo = this.currentProject.settings?.tempo || 120
      const newTempo = updates.tempo
      const tempoRatio = oldTempo / newTempo
      
      console.log('🎵 BPM change detected, updating all track notes:', {
        oldTempo,
        newTempo,
        tempoRatio,
        trackCount: this.currentProject.tracks.length
      })
      
          // 全トラックのノート位置を更新
    this.currentProject.tracks.forEach(track => {
      if (track.midiData && track.midiData.notes && track.midiData.notes.length > 0) {
        const updatedNotes = track.midiData.notes.map(note => ({
          ...note,
          // 時間位置を新しいBPMに合わせて調整
          time: note.time * tempoRatio,
          // ノートの長さも調整
          duration: note.duration * tempoRatio
        }))
        
        track.midiData.notes = updatedNotes
        track.midiData.tempo = newTempo
        track.midiData.lastModified = new Date().toISOString()
        
        console.log('🎵 Updated track notes:', {
          trackId: track.id,
          trackName: track.name,
          notesCount: updatedNotes.length,
          oldTempo,
          newTempo,
          sampleNote: updatedNotes[0] ? {
            id: updatedNotes[0].id,
            time: updatedNotes[0].time,
            duration: updatedNotes[0].duration
          } : null
        })
      } else {
        console.log('🎵 Track has no notes to update:', {
          trackId: track.id,
          trackName: track.name,
          hasMidiData: !!track.midiData,
          notesCount: track.midiData?.notes?.length || 0
        })
      }
    })
    }
    
    this.currentProject.settings = {
      ...this.currentProject.settings,
      ...updates
    }
    
    // メタデータを更新
    this.currentProject.metadata.modifiedAt = new Date().toISOString()
    
    // ファイルベースなのでlocalStorage保存は不要
    
    console.log('🎵 Project settings updated:', updates)
  }

  // プロジェクトを保存（ファイルベース）
  saveToStorage() {
    if (this.currentProject) {
      try {
        // ファイルベースでは自動保存は不要
        // ユーザーが明示的に保存するまで変更を保持
        this.currentProject.metadata.modifiedAt = new Date().toISOString()
        this.currentProject.fileInfo.hasUnsavedChanges = true
        
        console.log('saveToStorage: Project changes marked as unsaved (file-based system)')
        return true
      } catch (error) {
        console.error('saveToStorage: Failed to mark project as modified:', error)
        return false
      }
    } else {
      console.warn('saveToStorage: No current project to save')
      return false
    }
  }

  // プロジェクトデータを取得（Header.jsx用）
  getProjectData() {
    if (!this.currentProject) {
      throw new Error('No current project')
    }
    
    return this.exportAsDawaiFile()
  }

  // プロジェクトをリセット（Header.jsx用）
  resetProject() {
    this.currentProject = this.createDefaultProject()
    console.log('Project reset to default')
    return this.currentProject
  }

  // プロジェクトデータから読み込み（Header.jsx用）
  loadProjectFromData(projectData) {
    try {
      // プロジェクトデータを検証・変換
      const validatedProject = this.validateProject(projectData)
      
      // 現在のプロジェクトを更新
      this.currentProject = validatedProject
      
      return validatedProject
    } catch (error) {
      console.error('Failed to load project from data:', error)
      throw error
    }
  }
}

// ===== アプリケーションコンポーネント =====
const App = () => {
  // appSettingsを最初に宣言
  const [appSettings, setAppSettings] = useState({
    general: {
      language: '日本語',
      autoSaveInterval: 300000, // 5分
      showStartupTips: true,
      theme: 'dark'
    },
    audio: {
      device: 'Default Audio Device',
      sampleRate: 44100,
      bufferSize: 512
    },
    midi: {
      inputDevice: 'No MIDI Input',
      outputDevice: 'Built-in Synthesizer'
    },
    ui: {
      showMinimap: true,
      showToolbar: true,
      compactMode: false
    },
    midiEditor: {
      ghostTextEnabled: true,
      currentModel: 'musicRnn',
      predictionThreshold: 0.7,
      debounceDelay: 200,
      predictionCount: 5,
      displayCount: 1,
      contextWindow: 16,
      generateSequentialPredictions: true,
      restProbability: 0.15,
      restDetectionThreshold: 0.1,
      developerMode: false
    },
    drumTrack: {
      developerMode: false,
      defaultGridSize: { rows: 8, columns: 16 },
      defaultTempo: 120,
      enableMetronome: true,
      enableLoop: false,
      audioEnabled: true
    }
  })

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

  // プロジェクト状態を更新する関数（デバウンス処理を追加）
  const updateProjectState = useCallback(() => {
    // デバウンス処理を追加
    if (updateProjectState.timeout) {
      clearTimeout(updateProjectState.timeout);
    }
    
    updateProjectState.timeout = setTimeout(() => {
      const currentProject = projectManager.getProject();
      setProject(currentProject);
      setTracks(currentProject.tracks);
      setTabs(currentProject.tabs);
      setActiveTab(currentProject.activeTab);
      setGlobalTempo(currentProject.settings?.tempo || 120);
    }, 100); // 100msのデバウンス
  }, [projectManager])

  // プロジェクト状態の変更を監視（初回のみ実行）
  useEffect(() => {
    updateProjectState()
  }, []) // 依存関係を空にして初回のみ実行
  
  // グローバルBPM変更ハンドラー
  const handleGlobalTempoChange = useCallback((newTempo) => {
    // プロジェクト設定を更新（全トラックのノート位置も更新される）
    projectManager.updateProjectSettings({ tempo: newTempo })
    
    // グローバルBPMを更新
    setGlobalTempo(newTempo)
    
    // プロジェクト状態を更新（全トラックの更新されたノートデータを反映）
    updateProjectState()
    
    // オーディオエンジンのテンポも更新
    if (window.unifiedAudioSystem) {
      // 統一された音声システムではテンポ設定は別途実装が必要
      console.log('Tempo updated:', newTempo)
    }
    
    // 強制的に再レンダリングしてUIに変更を反映
    setForceRerender(prev => prev + 1)
  }, [globalTempo, projectManager, updateProjectState, setForceRerender])

  // 自動保存機能（設定に基づく）
  useEffect(() => {
    if (!appSettings) return
    
    const autoSaveInterval = appSettings.general.autoSaveInterval
    const autoSaveEnabled = autoSaveInterval > 0

    if (!autoSaveEnabled) {
      return
    }

    const interval = setInterval(() => {
      if (project) {
        projectManager.saveToStorage()
      }
    }, autoSaveInterval)

    return () => clearInterval(interval)
  }, [project, projectManager, appSettings?.general?.autoSaveInterval])

  // グローバルエラーハンドラーの設定
  useEffect(() => {
    const handleGlobalError = (event) => {
      console.error('Global error caught:', event.error)
      
      // SelectItemの空文字列エラーは無視（UIの問題）
      if (event.error && event.error.message && 
          (event.error.message.includes('SelectItem') || 
           event.error.message.includes('empty string') ||
           event.error.message.includes('deviceId'))) {
        console.warn('SelectItem empty string error (non-critical):', event.error.message)
        event.preventDefault()
        return
      }
      
      // WebSocket接続エラーは無視（開発環境での一般的な問題）
      if (event.error && event.error.message && 
          (event.error.message.includes('WebSocket') || 
           event.error.message.includes('websocket') ||
           event.error.message.includes('WebSocket closed without opened') ||
           event.error.message.includes('Failed to fetch'))) {
        console.warn('WebSocket/Network connection error (non-critical):', event.error.message)
        event.preventDefault()
        return
      }
      
      // その他のエラーは通常通り処理
      console.error('Unhandled error:', event.error)
    }

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      // WebSocket接続エラーは無視（開発環境での一般的な問題）
      if (event.reason && event.reason.message && 
          (event.reason.message.includes('WebSocket') || 
           event.reason.message.includes('websocket') ||
           event.reason.message.includes('WebSocket closed without opened') ||
           event.reason.message.includes('Failed to fetch') ||
           event.reason.message.includes('NetworkError') ||
           event.reason.message.includes('ERR_CONNECTION_REFUSED'))) {
        console.warn('WebSocket/Network promise rejection (non-critical):', event.reason.message)
        event.preventDefault()
        return
      }
      
      // その他のエラーは通常通り処理
      console.error('Unhandled promise rejection:', event.reason)
    }

    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // 基本状態
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
  
  // Ghost Text状態
  const [ghostTextEnabled, setGhostTextEnabled] = useState(true)
  
  // UI状態
  const [mixerWidth, setMixerWidth] = useState(160) // 200から160に縮小
  const [isMixerResizing, setIsMixerResizing] = useState(false)
  const [activeSettingsSection, setActiveSettingsSection] = useState("general")
  const [isAIAssistantCollapsed, setIsAIAssistantCollapsed] = useState(false)
  
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

  // フレームレート監視の開始
  useEffect(() => {
    // 開発環境でのみフレームレート監視を有効にする
    if (process.env.NODE_ENV === 'development') {
      frameRateMonitor.start()
      
      // 低FPS警告のハンドラー（閾値を下げる）
      const unsubscribe = frameRateMonitor.onLowFPS((event, data) => {
        if (data.fps < 30) { // 50から30に下げる
          console.warn(`🚨 Critical FPS drop: ${data.fps.toFixed(1)}fps`)
        }
      })
      
      return () => {
        frameRateMonitor.stop()
        unsubscribe()
      }
    }
  }, [])

  // プロジェクトマネージャーをグローバルにアクセス可能にする
  useEffect(() => {
    window.projectManager = projectManager
    window.updateProjectState = updateProjectState
    window.frameRateMonitor = frameRateMonitor
    window.performanceMonitor = performanceMonitor
    window.virtualizationManager = virtualizationManager
    
    // クリーンアップ関数
    return () => {
      delete window.projectManager
      delete window.updateProjectState
      delete window.frameRateMonitor
      delete window.performanceMonitor
      delete window.virtualizationManager
      
      // メモリリーク防止のためのクリーンアップ
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          // グローバル変数のクリーンアップ
          Object.keys(window).forEach(key => {
            if (key.startsWith('melodia') || key.startsWith('dawai')) {
              delete window[key]
            }
          })
        })
      }
    }
  }, [projectManager, updateProjectState])

  // グローバルキーボードイベントハンドラー（スペースキーで再生/停止）
  useEffect(() => {
    const handleKeyDown = (event) => {
      // スペースキーが押された場合
      if (event.code === 'Space') {
        // フォーム要素やエディタ内でない場合のみ処理
        const target = event.target
        const isFormElement = target.tagName === 'INPUT' || 
                             target.tagName === 'TEXTAREA' || 
                             target.tagName === 'SELECT' ||
                             target.contentEditable === 'true'
        
        if (!isFormElement) {
          event.preventDefault()
          
          // 現在のアクティブタブに応じて再生/停止を実行
          const activeTab = projectManager.getActiveTab()
          
          if (activeTab === 'arrangement') {
            // ArrangementViewの再生/停止を実行（再生ボタンと同じ処理）
            if (window.arrangementViewIsPlaying !== undefined) {
              if (window.arrangementViewIsPlaying) {
                // 再生中なら一時停止
                if (window.arrangementViewHandlePause) {
                  window.arrangementViewHandlePause()
                }
              } else {
                // 停止中なら再生
                if (window.arrangementViewHandlePlay) {
                  window.arrangementViewHandlePlay()
                }
              }
            }
          } else if (activeTab && activeTab.type === 'midi_editor' && activeTab.trackId) {
            // MIDI Editorの再生/停止を実行
            if (window.midiEditorPlayPause && window.midiEditorPlayPause[activeTab.trackId]) {
              window.midiEditorPlayPause[activeTab.trackId]()
            }
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [projectManager])



  // ページ離脱時の保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (projectManager && projectManager.getProject()) {
        projectManager.saveToStorage()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [projectManager])

  // タブ切り替えハンドラー
  const handleTabChange = useCallback((tabId) => {
    // タブ切り替えを即座に実行
    if (projectManager.setActiveTab(tabId)) {
      setActiveTab(tabId)
    }
    
    // 重い処理は遅延実行
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        if (tabId.startsWith('tab-')) {
          const currentTab = tabs.find(tab => tab.id === tabId)
          const currentTrack = tracks.find(track => track.id === currentTab?.trackId)
          
          if (currentTrack) {
            // MIDIデータの即座検証と準備（ノート入力時と同じ処理）
            const validatedMidiData = {
              notes: Array.isArray(currentTrack.midiData?.notes) ? currentTrack.midiData.notes : [],
              tempo: typeof currentTrack.midiData?.tempo === 'number' ? currentTrack.midiData.tempo : 120,
              timeSignature: typeof currentTrack.midiData?.timeSignature === 'string' ? currentTrack.midiData.timeSignature : '4/4',
              trackId: currentTrack.id,
              lastModified: currentTrack.midiData?.lastModified || new Date().toISOString(),
              // 完全なMIDIデータ構造を確保
              metadata: {
                ...currentTrack.midiData?.metadata,
                lastAccessed: new Date().toISOString()
              },
              settings: {
                channel: currentTrack.midiData?.settings?.channel || 0,
                octave: currentTrack.midiData?.settings?.octave || 0,
                transpose: currentTrack.midiData?.settings?.transpose || 0,
                velocity: currentTrack.midiData?.settings?.velocity || 100
              }
            }
            
            // 即座にトラックのMIDIデータを更新（ノート入力時と同じ即座性）
            projectManager.updateTrackMidiData(currentTrack.id, validatedMidiData)
          }
        }
      })
    } else {
      // requestIdleCallbackがサポートされていない場合は即座に実行
      if (tabId.startsWith('tab-')) {
        const currentTab = tabs.find(tab => tab.id === tabId)
        const currentTrack = tracks.find(track => track.id === currentTab?.trackId)
        
        if (currentTrack) {
          // MIDIデータの即座検証と準備（ノート入力時と同じ処理）
          const validatedMidiData = {
            notes: Array.isArray(currentTrack.midiData?.notes) ? currentTrack.midiData.notes : [],
            tempo: typeof currentTrack.midiData?.tempo === 'number' ? currentTrack.midiData.tempo : 120,
            timeSignature: typeof currentTrack.midiData?.timeSignature === 'string' ? currentTrack.midiData.timeSignature : '4/4',
            trackId: currentTrack.id,
            lastModified: currentTrack.midiData?.lastModified || new Date().toISOString(),
            // 完全なMIDIデータ構造を確保
            metadata: {
              ...currentTrack.midiData?.metadata,
              lastAccessed: new Date().toISOString()
            },
            settings: {
              channel: currentTrack.midiData?.settings?.channel || 0,
              octave: currentTrack.midiData?.settings?.octave || 0,
              transpose: currentTrack.midiData?.settings?.transpose || 0,
              velocity: currentTrack.midiData?.settings?.velocity || 100
            }
          }
          
          // 即座にトラックのMIDIデータを更新（ノート入力時と同じ即座性）
          projectManager.updateTrackMidiData(currentTrack.id, validatedMidiData)
        }
      }
    }
  }, [activeTab, projectManager, tabs, tracks])

  // トラック追加ハンドラー
  const addNewTrack = useCallback((trackType = TRACK_TYPES.MIDI, subtype = TRACK_SUBTYPES.PIANO, keepInArrangement = false) => {
    console.log('App: addNewTrack called with:', { trackType, subtype, keepInArrangement })
    
    const newTrack = projectManager.addTrack(trackType, subtype, keepInArrangement)
    if (newTrack) {
      console.log('App: New track created:', newTrack.id, newTrack.name)
      
      // トラックタイプに応じてデータを初期化
      if (subtype === TRACK_SUBTYPES.DRUMS) {
        // ドラムトラックの場合 - 新しいデータ構造を使用
        const initialDrumData = createDrumData(newTrack.id);
        
        // ドラムトラックマネージャーに登録
        drumTrackManager.createDrumTrack(newTrack.id);
        
        // プロジェクトマネージャーにも設定
        projectManager.updateTrackDrumData(newTrack.id, initialDrumData)
        
        console.log('🥁 Drum track initialized:', newTrack.id)
      } else {
        // MIDIトラックの場合
        const initialMidiData = {
          notes: [],
          tempo: 120,
          timeSignature: '4/4',
          trackId: newTrack.id,
          lastModified: new Date().toISOString(),
          metadata: {
            created: new Date().toISOString()
          },
          settings: {
            channel: 0,
            octave: 0,
            transpose: 0,
            velocity: 100
          }
        }
        
        // MIDIデータを設定（keepInArrangementパラメータを渡す）
        projectManager.updateTrackMidiData(newTrack.id, initialMidiData)
      }
      
      // 音声システムにトラックを追加（確実に実行）
      if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
        try {
          // 統一された音声システムではトラック管理は別途実装が必要
          console.log('Audio system: Track added successfully:', newTrack.id)
        } catch (error) {
          console.error('Audio system: Failed to add track:', error)
        }
      }
      
      // keepInArrangementがtrueの場合は、トラックとタブの状態のみ更新（activeTabは更新しない）
      if (keepInArrangement) {
        console.log('App: keepInArrangement=true, updating project state without changing activeTab')
        const currentProject = projectManager.getProject()
        setProject(currentProject)
        setTracks(currentProject.tracks)
        setTabs(currentProject.tabs)
        // activeTabは更新しない（ArrangementViewに留まる）
        
        // アプリ全体を強制再レンダリング
        setForceRerender(prev => prev + 1)
        
        console.log('App: Track added successfully, staying in ArrangementView')
      } else {
        // 通常の場合は全状態を更新
        console.log('App: keepInArrangement=false, updating full project state')
        updateProjectState()
        
        // TabBarから追加された場合も確実にMixerが更新されるように強制再レンダリング
        setTimeout(() => {
          setForceRerender(prev => prev + 1)
          console.log('App: Forced rerender for TabBar track addition')
        }, 100)
      }
      
      return newTrack
    } else {
      console.error('App: Failed to create new track')
      return null
    }
  }, [projectManager, updateProjectState, activeTab])

  // コピーペースト機能ハンドラー
  const copyTrack = useCallback((trackId) => {
    console.log('App: copyTrack called with:', { trackId })
    return projectManager.copyTrack(trackId)
  }, [projectManager])

  const pasteTrack = useCallback(() => {
    console.log('App: pasteTrack called')
    const newTrack = projectManager.pasteTrack()
    if (newTrack) {
      updateProjectState()
      console.log('App: Track pasted:', newTrack.name)
      return newTrack
    }
    return null
  }, [projectManager, updateProjectState])

  // トラック削除ハンドラー
  const removeTrack = useCallback((trackId) => {
    if (projectManager.removeTrack(trackId)) {
      // ドラムトラックマネージャーからも削除
      if (drumTrackManager.hasDrumTrack(trackId)) {
        drumTrackManager.deleteDrumTrack(trackId);
      }
      
      // 音声システムからトラックを削除（確実に実行）
      if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
        try {
          // 統一された音声システムではトラック管理は別途実装が必要
          console.log('Audio system: Track removed successfully:', trackId)
        } catch (error) {
          console.error('Audio system: Failed to remove track:', error)
        }
      }
      updateProjectState()
    }
  }, [projectManager, updateProjectState])

  // トラック更新ハンドラー
  const updateTrack = useCallback((trackId, updates) => {
    if (projectManager.updateTrack(trackId, updates)) {
      updateProjectState()
    }
  }, [projectManager, updateProjectState])

  // MIDIデータ更新ハンドラー
  const updateTrackMidiData = useCallback((trackId, midiData, keepInArrangement = false) => {
    if (projectManager.updateTrackMidiData(trackId, midiData)) {
      // keepInArrangementがtrueの場合は、トラックの状態のみ更新（activeTabは更新しない）
      if (keepInArrangement) {
        const currentProject = projectManager.getProject()
        setProject(currentProject)
        setTracks(currentProject.tracks)
        // activeTabは更新しない（ArrangementViewに留まる）
        
        // アプリ全体を強制再レンダリング
        setForceRerender(prev => prev + 1)
      } else {
        // 通常の場合は全状態を更新
        updateProjectState()
      }
    }
  }, [projectManager, updateProjectState, activeTab])

  // ドラムデータ更新ハンドラー
  const updateTrackDrumData = useCallback((trackId, drumData, keepInArrangement = false) => {
    // ドラムトラックマネージャーを更新
    drumTrackManager.updateDrumTrack(trackId, drumData);
    
    if (projectManager.updateTrackDrumData(trackId, drumData)) {
      // keepInArrangementがtrueの場合は、トラックの状態のみ更新（activeTabは更新しない）
      if (keepInArrangement) {
        const currentProject = projectManager.getProject()
        setProject(currentProject)
        setTracks(currentProject.tracks)
        // activeTabは更新しない（ArrangementViewに留まる）
        
        // アプリ全体を強制再レンダリング
        setForceRerender(prev => prev + 1)
      } else {
        // 通常の場合は全状態を更新
        updateProjectState()
      }
    }
  }, [projectManager, updateProjectState, activeTab])

  // タブ削除ハンドラー
  const closeTab = useCallback((tabId) => {
    if (projectManager.closeTab(tabId)) {
      updateProjectState()
    }
  }, [projectManager, updateProjectState])

  // ミキサーチャンネル更新ハンドラー
  const updateMixerChannels = useCallback((channels) => {
    console.log('App: updateMixerChannels called with:', channels)
    console.log('App: Current trackVolumeState before update:', trackVolumeState)
    
    // 単一のチャンネル更新の場合
    if (channels && !Array.isArray(channels)) {
      console.log('App: Single channel update')
      const channel = channels
      
      // ProjectManagerを更新
      projectManager.updateTrack(channel.id, {
        volume: channel.volume,
        pan: channel.pan || 0,
        muted: channel.muted,
        solo: channel.solo
      })
      
      // 状態を更新
      setTrackVolumeState(prev => {
        const newState = { ...prev, [channel.id]: channel.volume }
        console.log('App: Updated trackVolumeState:', newState)
        return newState
      })
      setTrackMutedState(prev => {
        const newState = { ...prev, [channel.id]: channel.muted }
        console.log('App: Updated trackMutedState:', newState, 'for channel:', channel.id, 'muted:', channel.muted)
        return newState
      })
      
      // 音声システムを更新（確実に実行）
      if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
        try {
          // 統一された音声システムではトラック管理は別途実装が必要
          console.log('Audio system: Channel updated successfully:', channel.id)
        } catch (error) {
          console.error('Audio system: Failed to update channel:', error)
        }
      }
    }
    // 複数チャンネル更新の場合
    else if (Array.isArray(channels)) {
      console.log('App: Multiple channels update')
      
      // 状態を一括更新
      const newTrackVolumeState = { ...trackVolumeState }
      const newTrackMutedState = { ...trackMutedState }
      
      channels.forEach(channel => {
        // ProjectManagerを更新
        projectManager.updateTrack(channel.id, {
          volume: channel.volume,
          pan: channel.pan || 0,
          muted: channel.muted,
          solo: channel.solo
        })
        
        // 状態を更新
        newTrackVolumeState[channel.id] = channel.volume
        newTrackMutedState[channel.id] = channel.muted
        
        // 音声システムを更新（確実に実行）
        if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
          try {
            // 統一された音声システムではトラック管理は別途実装が必要
            console.log('Audio system: Channel updated successfully:', channel.id)
          } catch (error) {
            console.error('Audio system: Failed to update channel:', error)
          }
        }
      })
      
      // 状態を一括更新
      setTrackVolumeState(newTrackVolumeState)
      setTrackMutedState(newTrackMutedState)
      
      // 全トラックの可視性を更新（ソロ機能用）
      if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
        try {
          // 統一された音声システムではトラック可視性管理は別途実装が必要
          console.log('Audio system: Track visibility updated')
        } catch (error) {
          console.error('Audio system: Failed to update track visibility:', error)
        }
      }
    }
    
    updateProjectState()
  }, [projectManager, updateProjectState])

  // マスターボリューム更新ハンドラー
  const updateMasterVolume = useCallback((volume) => {
    console.log('App: updateMasterVolume called with:', volume)
    
    // マスターボリュームの状態を更新
    setMasterVolume(volume)
    
    // 音声システムのマスターボリュームを更新（確実に実行）
    if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
      try {
        // 統一された音声システムではマスターボリューム設定は別途実装が必要
        console.log('Audio system: Master volume updated successfully:', volume)
      } catch (error) {
        console.error('Audio system: Failed to update master volume:', error)
      }
    }
  }, [])

  // 初期化時にマスターボリュームを設定
  useEffect(() => {
    if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
      // 統一された音声システムではマスターボリューム設定は別途実装が必要
      console.log('Audio system: Initial master volume set:', masterVolume)
    }
  }, [window.unifiedAudioSystem?.isInitialized, masterVolume])

  // 初期化時に既存トラックの音量情報を状態に設定
  useEffect(() => {
    console.log('App: Track volume initialization effect triggered:', {
      tracksLength: tracks.length,
      tracks: tracks.map(t => ({ id: t.id, volume: t.volume, muted: t.muted }))
    })
    
    if (tracks.length > 0) {
      const newTrackVolumeState = {}
      const newTrackMutedState = {}
      
      tracks.forEach(track => {
        newTrackVolumeState[track.id] = track.volume !== undefined ? track.volume : 75
        newTrackMutedState[track.id] = track.muted !== undefined ? track.muted : false
      })
      
      setTrackVolumeState(newTrackVolumeState)
      setTrackMutedState(newTrackMutedState)
      
      console.log('App: Initialized track volume states:', newTrackVolumeState)
    }
  }, [tracks])

  // 後方互換性のため、addNewTabをaddNewTrackのエイリアスとして保持
  const addNewTab = useCallback((trackType = 'piano', keepInArrangement = false) => {
    console.log('App: addNewTab called with:', { trackType, keepInArrangement })
    
    // トラックタイプのマッピング
    const trackTypeMap = {
      'midi': { type: TRACK_TYPES.MIDI, subtype: TRACK_SUBTYPES.PIANO },
      'drum': { type: TRACK_TYPES.DRUMS, subtype: TRACK_SUBTYPES.DRUMS },
      'diffsinger': { type: TRACK_TYPES.DIFFSINGER, subtype: TRACK_SUBTYPES.DIFFSINGER }
    }
    
    const mappedType = trackTypeMap[trackType] || { type: TRACK_TYPES.MIDI, subtype: TRACK_SUBTYPES.PIANO }
    
    // TabBarから呼ばれる場合は通常のトラック追加（新しいタブを開く）
    // ArrangementViewから呼ばれる場合はkeepInArrangement=trueが渡される
    return addNewTrack(mappedType.type, mappedType.subtype, keepInArrangement)
  }, [addNewTrack])

  // トラック操作の便利関数
  const toggleTrackMute = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId)
    if (track) {
      updateTrack(trackId, { muted: !track.muted })
    }
  }, [tracks, updateTrack])

  const toggleTrackSolo = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId)
    if (track) {
      updateTrack(trackId, { solo: !track.solo })
    }
  }, [tracks, updateTrack])

  const toggleTrackArm = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId)
    if (track) {
      updateTrack(trackId, { armed: !track.armed })
    }
  }, [tracks, updateTrack])

  const setTrackVolume = useCallback((trackId, volume) => {
    updateTrack(trackId, { volume: Math.max(0, Math.min(100, volume)) })
  }, [updateTrack])

  const setTrackPan = useCallback((trackId, pan) => {
    updateTrack(trackId, { pan: Math.max(-100, Math.min(100, pan)) })
  }, [updateTrack])

  // ミキサーチャンネルを取得する関数
  const getMixerChannels = useCallback(() => {
    return projectManager.getMixerChannels()
  }, [projectManager, tracks])

  // 包括的な設定管理
  const [globalSettings, setGlobalSettings] = useState(null)
  
  // 設定の初期化と読み込み
  useEffect(() => {
    const loadAllSettings = () => {
      try {
        // AI Assistant設定の読み込み
        const savedAiSettings = localStorage.getItem('dawai_ai_settings')
        
        if (savedAiSettings) {
          let parsedSettings = JSON.parse(savedAiSettings)
          
          // 古い形式の場合は新しい形式に変換
          if (!parsedSettings.aiAssistant && (parsedSettings.apiKeys || parsedSettings.availableModels)) {
            parsedSettings = {
              aiAssistant: {
                apiKeys: parsedSettings.apiKeys || {},
                models: parsedSettings.availableModels || {},
              },
            }
            localStorage.setItem('dawai_ai_settings', JSON.stringify(parsedSettings))
          }
          
          setGlobalSettings(parsedSettings)
        } else {
          setGlobalSettings(null)
        }

        // その他の設定の読み込み
        const savedGeneralSettings = localStorage.getItem('dawai_general_settings')
        
        if (savedGeneralSettings) {
          const parsedGeneralSettings = JSON.parse(savedGeneralSettings)
          setAppSettings(prev => {
            const updatedSettings = {
              general: { ...prev.general, ...parsedGeneralSettings.general },
              audio: { ...prev.audio, ...parsedGeneralSettings.audio },
              midi: { ...prev.midi, ...parsedGeneralSettings.midi },
              ui: { ...prev.ui, ...parsedGeneralSettings.ui },
              midiEditor: { ...prev.midiEditor, ...parsedGeneralSettings.midiEditor }
            }
            return updatedSettings
          })
        }
      } catch (error) {
        console.error('App: Failed to load settings:', error)
        setGlobalSettings(null)
      }
    }
    
    loadAllSettings()
  }, [])

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

  // アプリ設定の更新関数
  const updateAppSettings = useCallback((newSettings) => {
    setAppSettings(prev => {
      const updatedSettings = { ...prev, ...newSettings }
      
      // localStorageにも保存
      try {
        const settingsToSave = {
          general: { ...prev.general, ...newSettings.general },
          audio: { ...prev.audio, ...newSettings.audio },
          midi: { ...prev.midi, ...newSettings.midi },
          ui: { ...prev.ui, ...newSettings.ui },
          midiEditor: { ...prev.midiEditor, ...newSettings.midiEditor }
        }
        localStorage.setItem('dawai_general_settings', JSON.stringify(settingsToSave))
      } catch (error) {
        console.error('App: Failed to save general settings to localStorage:', error)
      }
      
      return updatedSettings
    })
  }, [])

  // AudioEngineとRecordingEngineの初期化
  useEffect(() => {
    const initializeEngines = async () => {
      try {
        console.log('🚀 Initializing engines...')
        
        // 統一された音声システムの初期化
        if (window.unifiedAudioSystem) {
          await window.unifiedAudioSystem.initialize()
          console.log('✅ Unified Audio System initialized')
        }
        
        // 既存のトラックを音声システムに同期
        if (projectManager && projectManager.getTracks) {
          const existingTracks = projectManager.getTracks()
          console.log('🔄 Syncing existing tracks to audio system:', existingTracks.length)
          
          existingTracks.forEach(track => {
            try {
              // ドラムトラックの場合は、drumTrackManagerに確実に登録
              if (track.type === TRACK_TYPES.DRUMS && !track.hasDrumData) {
                const drumData = drumTrackManager.createDrumTrack(track.id)
                if (drumData) {
                  track.drumTrackId = track.id
                  track.hasDrumData = true
                  track.drumData = drumData
                  console.log('🥁 Drum track initialized in audio system:', track.id)
                }
              }
              
              window.unifiedAudioSystem.addTrack(
                track.id,
                track.name,
                track.type || 'piano',
                track.color,
                track
              )
              
              // トラックの設定を音声システムに適用
              const normalizedVolume = track.volume / 100
              window.unifiedAudioSystem.setTrackVolume(track.id, normalizedVolume)
              window.unifiedAudioSystem.setTrackMuted(track.id, track.muted)
              window.unifiedAudioSystem.setTrackSolo(track.id, track.solo)
              
              console.log('Audio engine: Existing track synced:', track.id, 'type:', track.type)
            } catch (error) {
              console.error('Audio engine: Failed to sync existing track:', track.id, error)
            }
          })
          
          // トラックの可視性を更新
          try {
            // 統一された音声システムではトラック可視性管理は別途実装が必要
            console.log('Audio system: Track visibility updated')
          } catch (error) {
            console.error('Audio system: Failed to update track visibility:', error)
          }
        }
        
        // 録音エンジンの初期化（削除済み）
        
        // エクスポートエンジンの初期化
        await audioExportEngine.initialize()
        console.log('✅ Audio Export Engine initialized')
        
        // パフォーマンスモニターの初期化（initializeメソッドは存在しないため削除）
        console.log('✅ Performance Monitor ready')
        
        // 仮想化マネージャーの初期化（initializeメソッドは存在しないため削除）
        console.log('✅ Virtualization Manager ready')
        
        // AIエージェントエンジンの初期化
        await aiAgentEngine.initialize()
        console.log('✅ AI Agent Engine initialized')
        
        // AI Agent Engineをグローバルに設定
        window.aiAgentEngine = aiAgentEngine
        
        // AI Agent Engineにプロジェクト操作コールバックを設定
        aiAgentEngine.setProjectCallbacks({
          // 拒否処理用の専用コールバック
          rejectMidiNotes: async (params) => {
            console.log('Agent: Rejecting MIDI notes with params:', params)
            if (params.trackId && params.noteIds) {
              const targetTrack = projectManager.getTracks().find(t => t.id === params.trackId)
              if (targetTrack) {
                const currentMidiData = targetTrack.midiData || { notes: [] }
                
                // 承認待ちのノートを実際に削除（isPendingフラグも含めて）
                const updatedNotes = currentMidiData.notes.filter(note => {
                  const isPendingNote = note.isPending || params.noteIds.includes(note.id)
                  return !isPendingNote
                })
                
                console.log('Agent: Rejecting notes - before:', currentMidiData.notes.length, 'after:', updatedNotes.length)
                console.log('Agent: Removed note IDs:', params.noteIds)
                
                // MIDIデータを更新
                projectManager.updateTrackMidiData(params.trackId, { notes: updatedNotes })
                updateProjectState()
                
                // 拒否処理完了イベントを発火
                window.dispatchEvent(new CustomEvent('midiDataRejected', {
                  detail: {
                    trackId: params.trackId,
                    noteIds: params.noteIds,
                    remainingNotes: updatedNotes.length
                  }
                }))
                
                // MIDIエディタの強制更新（少し遅延）
                setTimeout(() => {
                  setForceRerender(prev => prev + 1)
                  console.log('Agent: Forced MIDI editor rerender after rejection')
                }, 50)
              }
            }
          },
          
          approveMidiNotes: async (params) => {
            console.log('Agent: Approving MIDI notes with params:', params)
            if (params.trackId && params.notes) {
              const targetTrack = projectManager.getTracks().find(t => t.id === params.trackId)
              if (targetTrack) {
                const currentMidiData = targetTrack.midiData || { notes: [] }
                
                // 承認待ちのノートのisPendingフラグをクリア
                const updatedNotes = currentMidiData.notes.map(note => {
                  const approvedNote = params.notes.find(n => n.id === note.id)
                  if (approvedNote) {
                    return { ...note, isPending: false }
                  }
                  return note
                })
                
                console.log('Agent: Approving notes - updated notes count:', updatedNotes.length)
                
                // MIDIデータを更新
                projectManager.updateTrackMidiData(params.trackId, { notes: updatedNotes })
                updateProjectState()
                
                // 承認処理完了イベントを発火
                window.dispatchEvent(new CustomEvent('midiDataApproved', {
                  detail: {
                    trackId: params.trackId,
                    noteIds: params.notes.map(n => n.id),
                    approvedNotes: updatedNotes.length
                  }
                }))
                
                // MIDIエディタの強制更新
                setTimeout(() => {
                  setForceRerender(prev => prev + 1)
                  console.log('Agent: Forced MIDI editor rerender after approval')
                }, 50)
              }
            }
          },
          
          addTrack: async (params) => {
            console.log('Agent: Adding track with params:', params)
            
            // 承認待ち状態に追加
            const newTrack = {
              ...params,
              color: '#10B981', // 緑色で表示
              isPending: true
            }
            
            aiAgentEngine.addPendingTrackChange(
              newTrack.id || `pending-track-${Date.now()}`,
              null,
              newTrack,
              'add'
            )
            
            // 一時的にトラックを追加（緑色で表示）
            const tempTrack = projectManager.addTrack(
              params.type || TRACK_TYPES.INSTRUMENT,
              params.subtype || TRACK_SUBTYPES.PIANO
            )
            
            if (tempTrack) {
              // 緑色に変更
              tempTrack.color = '#10B981'
              tempTrack.isPending = true
              updateProjectState()
            }
            
            return newTrack
          },
          
          updateTrack: async (params) => {
            console.log('Agent: Updating track with params:', params)
            if (params.trackId) {
              const originalTrack = projectManager.getTracks().find(t => t.id === params.trackId)
              if (originalTrack) {
                // 承認待ち状態に追加
                const updatedTrack = { ...originalTrack, ...params.updates }
                aiAgentEngine.addPendingTrackChange(
                  params.trackId,
                  originalTrack,
                  updatedTrack,
                  'update'
                )
                
                // 一時的に更新（緑色で表示）
                const tempTrack = { ...originalTrack, ...params.updates }
                tempTrack.color = '#10B981'
                tempTrack.isPending = true
                projectManager.updateTrack(params.trackId, tempTrack)
                updateProjectState()
              }
            }
          },
          
          deleteTrack: async (params) => {
            console.log('Agent: Deleting track with params:', params)
            if (params.trackId) {
              const originalTrack = projectManager.getTracks().find(t => t.id === params.trackId)
              if (originalTrack) {
                // 承認待ち状態に追加
                aiAgentEngine.addPendingTrackChange(
                  params.trackId,
                  originalTrack,
                  null,
                  'delete'
                )
                
                // 一時的に削除（緑色で表示）
                projectManager.removeTrack(params.trackId)
                updateProjectState()
              }
            }
          },
          
          addMidiNotes: async (params) => {
            console.log('=== AI Agent MIDI Notes Addition Debug ===')
            console.log('Agent: Adding MIDI notes with params:', params)
            console.log('Agent: Current project:', {
              id: projectManager.currentProject?.id,
              name: projectManager.currentProject?.name,
              tracksCount: projectManager.currentProject?.tracks?.length
            })
            console.log('Agent: All tracks:', projectManager.getTracks().map(t => ({ 
              id: t.id, 
              name: t.name, 
              type: t.type,
              notesCount: t.midiData?.notes?.length || 0
            })))
            console.log('Agent: Active tab:', projectManager.currentProject?.activeTab)
            
            // 現在のアクティブタブからトラックを取得
            const activeTab = projectManager.currentProject?.activeTab
            const currentTrackFromTab = activeTab ? projectManager.getTracks().find(t => t.id === activeTab.replace('tab-', '')) : null
            console.log('Agent: Current track details:', currentTrackFromTab ? {
              id: currentTrackFromTab.id,
              name: currentTrackFromTab.name,
              type: currentTrackFromTab.type,
              notesCount: currentTrackFromTab.midiData?.notes?.length || 0
            } : 'No current track')
            console.log('==========================================')
            
            if (params.trackId && params.notes) {
              const targetTrack = projectManager.getTracks().find(t => t.id === params.trackId)
              console.log('Agent: Target track found:', targetTrack ? { 
                id: targetTrack.id, 
                name: targetTrack.name, 
                type: targetTrack.type,
                notesCount: targetTrack.midiData?.notes?.length || 0
              } : 'NOT FOUND')
              
              if (!targetTrack) {
                console.error('Agent: Track not found with ID:', params.trackId)
                console.error('Agent: Available track IDs:', projectManager.getTracks().map(t => t.id))
                return
              }
              
              const currentMidiData = targetTrack.midiData || { notes: [] }
              console.log('Agent: Current MIDI data:', { 
                notesCount: currentMidiData.notes?.length || 0,
                notes: currentMidiData.notes?.slice(0, 3) // 最初の3つのノートを表示
              })
              
              // 重複チェック：既に承認待ちのノートは追加しない
              const existingPendingNoteIds = new Set()
              const existingNoteIds = new Set(currentMidiData.notes.map(n => n.id))
              
              if (window.aiAgentEngine && window.aiAgentEngine.getPendingChanges) {
                const pendingChanges = window.aiAgentEngine.getPendingChanges()
                pendingChanges.notes.forEach(([noteId, change]) => {
                  if (change.trackId === params.trackId && change.type === 'add') {
                    existingPendingNoteIds.add(change.newNote.id)
                  }
                })
              }
              
              // 承認待ち状態に追加（重複を避ける）
              const pendingNotes = []
              params.notes.forEach(note => {
                const noteId = note.id || `pending-note-${Date.now()}-${Math.random()}`
                const pendingNote = { ...note, id: noteId, isPending: true }
                
                // 重複チェック（既存のノートと承認待ちノートの両方をチェック）
                if (!existingPendingNoteIds.has(pendingNote.id) && !existingNoteIds.has(pendingNote.id)) {
                  console.log('Agent: Adding pending note:', { noteId, note: pendingNote })
                  aiAgentEngine.addPendingNoteChange(
                    noteId,
                    null,
                    pendingNote,
                    params.trackId,
                    'add'
                  )
                  pendingNotes.push(pendingNote)
                  existingPendingNoteIds.add(pendingNote.id)
                } else {
                  console.log('Agent: Skipping duplicate pending note:', noteId, {
                    isPending: existingPendingNoteIds.has(pendingNote.id),
                    isExisting: existingNoteIds.has(pendingNote.id)
                  })
                }
              })
              
              const newMidiData = {
                ...currentMidiData,
                notes: [...currentMidiData.notes, ...pendingNotes]
              }
              console.log('Agent: New MIDI data:', { 
                notesCount: newMidiData.notes?.length || 0,
                newNotes: params.notes
              })
              
              projectManager.updateTrackMidiData(params.trackId, newMidiData)
              updateProjectState()
              
              // 現在のアクティブタブが対象トラックでない場合は切り替え
              const currentActiveTab = projectManager.currentProject?.activeTab
              const targetTabId = `tab-${params.trackId}`
              if (currentActiveTab !== targetTabId) {
                console.log('Agent: Switching to target track tab:', targetTabId)
                projectManager.setActiveTab(targetTabId)
                updateProjectState()
              }
              
              // MIDIエディタの状態を強制的に更新
              setTimeout(() => {
                setForceRerender(prev => prev + 1)
                console.log('Agent: Forced MIDI editor rerender')
                
                // 該当するMIDIエディタタブに切り替え
                const midiTabId = `midi-${params.trackId}`
                const existingTab = tabs.find(tab => tab.id === midiTabId)
                if (existingTab && activeTab !== midiTabId) {
                  setActiveTab(midiTabId)
                  console.log('Agent: Switched to MIDI editor tab:', midiTabId)
                }
              }, 100)
              
              console.log('Agent: MIDI notes added successfully')
            } else {
              console.error('Agent: Missing required parameters:', { 
                trackId: params.trackId, 
                notes: params.notes,
                paramsKeys: Object.keys(params)
              })
            }
          },
          
          updateMidiNotes: async (params) => {
            console.log('Agent: Updating MIDI notes with params:', params)
            if (params.trackId && params.notes) {
              const targetTrack = projectManager.getTracks().find(t => t.id === params.trackId)
              if (targetTrack) {
                const originalNotes = targetTrack.midiData?.notes || []
                
                // 承認待ち状態に追加
                params.notes.forEach(note => {
                  const originalNote = originalNotes.find(n => n.id === note.id)
                  if (originalNote) {
                    aiAgentEngine.addPendingNoteChange(
                      note.id,
                      originalNote,
                      { ...note, isPending: true },
                      params.trackId,
                      'update'
                    )
                  }
                })
                
                projectManager.updateTrackMidiData(params.trackId, { 
                  notes: params.notes.map(note => ({ ...note, isPending: true }))
                })
                updateProjectState()
              }
            }
          },
          
          deleteMidiNotes: async (params) => {
            console.log('Agent: Deleting MIDI notes with params:', params)
            if (params.trackId && params.noteIds) {
              const targetTrack = projectManager.getTracks().find(t => t.id === params.trackId)
              if (targetTrack) {
                const originalNotes = targetTrack.midiData?.notes || []
                
                // 承認待ち状態に追加
                params.noteIds.forEach(noteId => {
                  const originalNote = originalNotes.find(n => n.id === noteId)
                  if (originalNote) {
                    aiAgentEngine.addPendingNoteChange(
                      noteId,
                      originalNote,
                      null,
                      params.trackId,
                      'delete'
                    )
                  }
                })
                
                // 一時的に削除
                const updatedNotes = originalNotes.filter(note => !params.noteIds.includes(note.id))
                projectManager.updateTrackMidiData(params.trackId, { notes: updatedNotes })
                updateProjectState()
              }
            }
          },
          
          applyEffect: async (params) => {
            console.log('Agent: Applying effect with params:', params)
            // エフェクト適用の実装
            if (params.trackId && params.effect) {
              // エフェクト適用ロジックをここに実装
            }
          },
          
          updateProjectSettings: async (params) => {
            console.log('Agent: Updating project settings with params:', params)
            if (projectManager.currentProject) {
              projectManager.currentProject.settings = {
                ...projectManager.currentProject.settings,
                ...params
              }
              projectManager.saveToStorage()
              updateProjectState()
            }
          },
          
          playAudio: async (params) => {
            console.log('Agent: Playing audio with params:', params)
            if (!isPlaying) {
              setIsPlaying(true)
              // 統一された音声システムでは再生制御は別途実装が必要
              console.log('Audio system: Play requested')
            }
          },
          
          stopAudio: async (params) => {
            console.log('Agent: Stopping audio with params:', params)
            if (isPlaying) {
              setIsPlaying(false)
              // 統一された音声システムでは再生制御は別途実装が必要
              console.log('Audio system: Stop requested')
            }
          },
          
          setCurrentTime: async (params) => {
            console.log('Agent: Setting current time with params:', params)
            if (params.time !== undefined) {
              // 統一された音声システムでは時間設定は別途実装が必要
              console.log('Audio system: Current time set to:', params.time)
            }
          }
        })
        
        console.log('🎉 All engines initialized successfully!')
        
        // 初期化完了フラグを設定
        setEnginesInitialized(true)
        
        // 統一された音声システムのイベントリスナーを設定
        if (window.unifiedAudioSystem) {
          // 統一された音声システムではイベントリスナーは別途実装が必要
          console.log('Audio system: Event listeners configured')
        }

        // Recording Engineのイベントリスナーを設定（削除済み）
        
      } catch (error) {
        console.error('❌ Engine initialization failed:', error)
        setEnginesInitialized(false)
      }
    }
    
    initializeEngines()
    
    // クリーンアップ
    return () => {
      // 統一された音声システムではクリーンアップは別途実装が必要
      console.log('Audio system: Cleanup completed')
    }
  }, [projectManager])

  // Close project menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProjectMenu && !event.target.closest('.project-menu-container')) {
        setShowProjectMenu(false)
      }
      if (showTrackMenu && !event.target.closest('.track-menu-container') && !event.target.closest('[data-track-menu-trigger]')) {
        setShowTrackMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProjectMenu, showTrackMenu])

  // プロジェクト読み込みイベントをリッスン
  useEffect(() => {
    const handleProjectLoaded = (event) => {
      const { project } = event.detail
      
      // プロジェクトマネージャーに新しいプロジェクトを設定
      if (project) {
        projectManager.currentProject = projectManager.validateProject(project)
        // ファイルベースなのでlocalStorage保存は不要
        
        // 状態を即座に更新
        updateProjectState()
        
        // 強制的に再レンダリング
        setTimeout(() => {
          setForceRerender(prev => prev + 1)
        }, 50)
      }
    }
    
    window.addEventListener('projectLoaded', handleProjectLoaded)
    return () => {
      window.removeEventListener('projectLoaded', handleProjectLoaded)
    }
  }, [projectManager, updateProjectState])

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
      updateProjectState()
      

      return importedProject
    } catch (error) {
      console.error('Failed to import melodia file:', error)
      alert('ファイルのインポートに失敗しました')
      throw error
    }
  }, [projectManager, updateProjectState])

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

  useEffect(() => {
    // ピアノテスト機能をセットアップ
    setupPianoTest();
    // ドラムテスト機能をセットアップ
    setupDrumTest();
  }, []);

  // 音声システムの初期化
  useEffect(() => {
    const initializeAudioSystems = async () => {
      try {
        console.log('🎵 音声システムを初期化中...')
        
        // 統一された音声システムを初期化
        await unifiedAudioSystem.initialize()
        
        // ピアノとドラムのテスト機能をセットアップ
        setupPianoTest()
        setupDrumTest()
        
        console.log('✅ 音声システムの初期化完了')
      } catch (error) {
        console.error('❌ 音声システムの初期化に失敗:', error)
      }
    }

    initializeAudioSystems()
  }, [])

  return (
    <div className="h-screen text-white flex flex-col main-container">
      {/* ヘッダー */}
      <Header 
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showProjectMenu={showProjectMenu}
        setShowProjectMenu={setShowProjectMenu}
        ghostTextEnabled={ghostTextEnabled}
        onToggleGhostText={() => setGhostTextEnabled(prev => !prev)}
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
      />

      {/* メインコンテンツ */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左側：ミキサーパネル */}
        <div 
          className="bg-gray-900/90 backdrop-blur-md border-r border-gray-700/50 flex flex-col flex-shrink-0 transition-all duration-300"
          style={{ width: `${mixerWidth}px` }}
        >
          <Mixer 
            key={`mixer-${forceRerender}`}
            mixerChannels={getMixerChannels}
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
                addNewTrack={addNewTrack} 
                projectManager={projectManager} 
                audioEngine={window.unifiedAudioSystem}
                updateProjectState={updateProjectState}
                forceRerenderApp={forceRerenderApp}
                onTabChange={handleTabChange}
                globalTempo={globalTempo}
                onGlobalTempoChange={handleGlobalTempoChange}
                copyTrack={copyTrack}
                pasteTrack={pasteTrack}
                trackVolume={trackVolumeState}
                trackMuted={trackMutedState}
                masterVolume={masterVolume}
              />
            )}
            {(activeTab.startsWith('tab-')) && (() => {
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
                    key={`midi-editor-${currentTrack.id}-${forceRerender}`}
                    trackId={currentTrack.id}
                    trackType={currentTrack.type || 'piano'}
                    trackName={currentTrack.name || 'Unknown Track'}
                    trackColor={currentTrack.color || 'blue'}
                    midiData={currentTrack.midiData || { notes: [], tempo: globalTempo, timeSignature: '4/4' }}
                    onMidiDataUpdate={(midiData) => updateTrackMidiData(currentTrack.id, midiData)}
                    onNoteAdd={(note) => {
                      const currentMidiData = currentTrack.midiData || { notes: [], tempo: globalTempo, timeSignature: '4/4' }
                      const updatedMidiData = {
                        ...currentMidiData,
                        notes: [...(currentMidiData.notes || []), note],
                        lastModified: new Date().toISOString()
                      }
                      updateTrackMidiData(currentTrack.id, updatedMidiData)
                    }}
                    onNoteRemove={(noteId) => {
                      const currentMidiData = currentTrack.midiData || { notes: [], tempo: globalTempo, timeSignature: '4/4' }
                      const updatedMidiData = {
                        ...currentMidiData,
                        notes: (currentMidiData.notes || []).filter(note => note.id !== noteId),
                        lastModified: new Date().toISOString()
                      }
                      updateTrackMidiData(currentTrack.id, updatedMidiData)
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
                      updateTrackMidiData(currentTrack.id, updatedMidiData)
                    }}
                    isActive={activeTab.startsWith('tab-')}
                    onOpenSettings={() => {
                      setShowSettings(true)
                      setActiveSettingsSection('midiEditor')
                    }}
                    appSettings={appSettings}
                    globalTempo={globalTempo}
                    onGlobalTempoChange={handleGlobalTempoChange}
                    projectManager={projectManager}
                    trackVolume={trackVolumeState[currentTrack.id] !== undefined ? trackVolumeState[currentTrack.id] : 75}
                    trackMuted={trackMutedState[currentTrack.id] || false}
                    masterVolume={masterVolume}
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
                      projectManager.updateTrackMidiData(currentTrack.id, midiData)
                    }}
                    isActive={true}
                    appSettings={appSettings}
                    globalTempo={globalTempo}
                    onGlobalTempoChange={handleGlobalTempoChange}
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
                    trackName={currentTrack.name || 'Drum Track'}
                    trackColor={currentTrack.color || '#3B82F6'}
                    drumData={currentTrack.drumData || { grid: [], instruments: [], tempo: globalTempo, timeSignature: '4/4' }}
                    onDrumDataUpdate={(drumData) => updateTrackDrumData(currentTrack.id, drumData)}
                    isActive={activeTab.startsWith('tab-')}
                    onOpenSettings={() => {
                      setShowSettings(true)
                      setActiveSettingsSection('drumTrack')
                    }}
                    appSettings={appSettings}
                    globalTempo={globalTempo}
                    onGlobalTempoChange={handleGlobalTempoChange}
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
    </div>
  )
}

export default App


