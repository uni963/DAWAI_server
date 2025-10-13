// ===== Project Factory Functions =====
// DAWAIアプリケーションで使用されるプロジェクト、トラック、タブの作成関数

import { TRACK_TYPES, TRACK_SUBTYPES, TAB_TYPES } from '../constants/trackTypes.js'

// 統一されたトラックデータ構造
export const createTrack = (id, name, type = TRACK_TYPES.MIDI, subtype = TRACK_SUBTYPES.PIANO, color = '#3B82F6') => ({
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
  voiceSynthData: type === TRACK_TYPES.DIFFSINGER ? {
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
export const createTab = (id, title, type, trackId = null) => ({
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
export const createProject = (name = 'Untitled Project') => ({
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