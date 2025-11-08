// ===== Project Manager Class =====
// DAWAIアプリケーションのプロジェクト管理を担当するクラス

import drumTrackManager from '../utils/drumTrackManager.js'
import genreManager from '../managers/GenreManager.js'
import demoSongManager from '../managers/DemoSongManager.js'
import aiAgentEngine from '../utils/aiAgentEngine.js'
import { MUSIC_GENRES, SCALE_DEFINITIONS } from '../utils/musicTheory/MusicTheorySystem.js'
import { TRACK_TYPES, TRACK_SUBTYPES, TRACK_COLORS, TAB_TYPES } from '../constants/trackTypes.js'
import { createTrack, createTab, createProject } from '../factories/projectFactory.js'
import { SAMPLE_PROJECT_DATA, SAMPLE_PROJECT_WELCOME_MESSAGE } from '../data/sampleData.js'

// ===== プロジェクト管理クラス =====
class ProjectManager {
  constructor() {
    this.currentProject = null
    this.genreContext = null
    this.demoSongMetadata = null
    // ミキサーチャンネルのキャッシュ（ちらつき問題対策）
    this._mixerChannelsCache = null
    this._mixerChannelsCacheKey = null
    // アンドゥ・リドゥ用履歴スタック
    this._undoStack = []
    this._redoStack = []
    this._maxHistorySize = 50 // 履歴の最大保持数
    this.initializeProject()
  }

  // ミキサーキャッシュを無効化するヘルパーメソッド
  _invalidateMixerCache() {
    this._mixerChannelsCacheKey = null
    this._mixerChannelsCache = null
  }

  // ===== アンドゥ・リドゥ機能 =====

  /**
   * 現在の状態を履歴に保存
   * @param {string} actionType - 操作の種類 (例: "addTrack", "deleteTrack", "updateTrack")
   */
  _saveToHistory(actionType) {
    if (!this.currentProject) return

    // プロジェクトの深いコピーを作成
    const snapshot = {
      actionType,
      timestamp: Date.now(),
      project: JSON.parse(JSON.stringify(this.currentProject))
    }

    // アンドゥスタックに追加
    this._undoStack.push(snapshot)

    // 最大サイズを超えた場合、古い履歴を削除
    if (this._undoStack.length > this._maxHistorySize) {
      this._undoStack.shift()
    }

    // 新しい操作が行われたらリドゥスタックをクリア
    this._redoStack = []

    console.log('📝 History saved:', actionType, 'Stack size:', this._undoStack.length)
  }

  /**
   * アンドゥ操作
   * @returns {boolean} 成功/失敗
   */
  undo() {
    if (this._undoStack.length === 0) {
      console.log('⚠️ No actions to undo')
      return false
    }

    // 現在の状態をリドゥスタックに保存
    const currentSnapshot = {
      actionType: 'current',
      timestamp: Date.now(),
      project: JSON.parse(JSON.stringify(this.currentProject))
    }
    this._redoStack.push(currentSnapshot)

    // アンドゥスタックから復元
    const snapshot = this._undoStack.pop()
    this.currentProject = JSON.parse(JSON.stringify(snapshot.project))

    // キャッシュを無効化
    this._invalidateMixerCache()

    console.log('↶ Undo:', snapshot.actionType, 'Remaining:', this._undoStack.length)
    return true
  }

  /**
   * リドゥ操作
   * @returns {boolean} 成功/失敗
   */
  redo() {
    if (this._redoStack.length === 0) {
      console.log('⚠️ No actions to redo')
      return false
    }

    // 現在の状態をアンドゥスタックに保存
    const currentSnapshot = {
      actionType: 'current',
      timestamp: Date.now(),
      project: JSON.parse(JSON.stringify(this.currentProject))
    }
    this._undoStack.push(currentSnapshot)

    // リドゥスタックから復元
    const snapshot = this._redoStack.pop()
    this.currentProject = JSON.parse(JSON.stringify(snapshot.project))

    // キャッシュを無効化
    this._invalidateMixerCache()

    console.log('↷ Redo:', snapshot.actionType, 'Remaining:', this._redoStack.length)
    return true
  }

  /**
   * アンドゥ可能かチェック
   * @returns {boolean}
   */
  canUndo() {
    return this._undoStack.length > 0
  }

  /**
   * リドゥ可能かチェック
   * @returns {boolean}
   */
  canRedo() {
    return this._redoStack.length > 0
  }

  /**
   * 履歴をクリア
   */
  clearHistory() {
    this._undoStack = []
    this._redoStack = []
    console.log('🗑️ History cleared')
  }

  // プロジェクトの初期化（ファイルベースに変更）
  initializeProject() {
    try {
      // デフォルトプロジェクトを作成
      this.currentProject = this.createDefaultProject()
      this._invalidateMixerCache()
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
      if (track.subtype === TRACK_SUBTYPES.DRUMS && !track.hasDrumData) {
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
        trackSubtype: track.subtype,
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
      // subtypeベースでタブタイプを判定（CRITICAL FIX）
      let tabType = TAB_TYPES.MIDI_EDITOR
      if (track.subtype === TRACK_SUBTYPES.DRUMS) {
        tabType = TAB_TYPES.DRUM_TRACK
      } else if (track.subtype === TRACK_SUBTYPES.DIFFSINGER) {
        tabType = TAB_TYPES.DIFFSINGER_TRACK
      }

      console.log('🔧 Creating tab for track:', {
        trackId: track.id,
        trackName: track.name,
        trackType: track.type,
        trackSubtype: track.subtype,
        tabType: tabType,
        tabId: `tab-${track.id}`
      })

      return createTab(`tab-${track.id}`, track.name, tabType, track.id)
    })

    project.tabs = [...baseTabs, ...trackTabs]

    console.log('validateProject: Final validated project:', {
      totalTracks: project.tracks.length,
      totalTabs: project.tabs.length,
      tabs: project.tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        type: tab.type,
        trackId: tab.trackId
      })),
      tracks: project.tracks.map(track => ({
        id: track.id,
        name: track.name,
        type: track.type,
        subtype: track.subtype,
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
    const track2 = createTrack('track-2', 'Drums Track', TRACK_TYPES.DRUMS, TRACK_SUBTYPES.DRUMS, TRACK_COLORS[1])

    // ドラムトラックの場合は、drumTrackManagerに登録
    if (track2.subtype === TRACK_SUBTYPES.DRUMS) {
      const drumData = drumTrackManager.createDrumTrack(track2.id)
      if (drumData) {
        track2.drumTrackId = track2.id
        track2.hasDrumData = true
        track2.drumData = drumData
        console.log('🥁 Default drum track created in drumTrackManager:', track2.id)
      }
    }

    project.tracks = [track1, track2]

    // トラックに対応するタブを作成（subtypeベースで判定 - CRITICAL FIX）
    const trackTabs = project.tracks.map(track => {
      let tabType = TAB_TYPES.MIDI_EDITOR
      if (track.subtype === TRACK_SUBTYPES.DRUMS) {
        tabType = TAB_TYPES.DRUM_TRACK
      } else if (track.subtype === TRACK_SUBTYPES.DIFFSINGER) {
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

    // 操作前の状態を保存
    this._saveToHistory('pasteTrack')

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

    // 対応するタブを作成（subtypeベースで判定 - CRITICAL FIX）
    let tabType = TAB_TYPES.MIDI_EDITOR
    if (newTrack.subtype === TRACK_SUBTYPES.DRUMS) {
      tabType = TAB_TYPES.DRUM_TRACK
    } else if (newTrack.subtype === TRACK_SUBTYPES.DIFFSINGER) {
      tabType = TAB_TYPES.DIFFSINGER_TRACK
    }

    const uniqueTabName = this.generateUniqueTabName(newTrack.name)
    const newTab = createTab(`tab-${newTrackId}`, uniqueTabName, tabType, newTrackId)
    this.currentProject.tabs.push(newTab)

    // 新しいタブをアクティブにする
    this.currentProject.activeTab = newTab.id

    // トラックペースト時はミキサーキャッシュを無効化
    this._invalidateMixerCache()
    console.log('🔄 Mixer cache invalidated due to track paste')

    // 自動保存
    this.saveProject()

    console.log('Track pasted:', newTrack.name)
    return newTrack
  }

  // トラックを追加
  addTrack(trackType = TRACK_TYPES.MIDI, subtype = TRACK_SUBTYPES.PIANO, keepInArrangement = false) {
    if (!this.currentProject) return null

    // 操作前の状態を保存
    this._saveToHistory('addTrack')

    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substr(2, 9)
    const trackId = `track-${timestamp}-${randomId}`

    const trackNumber = this.currentProject.tracks.length + 1
    const color = TRACK_COLORS[(trackNumber - 1) % TRACK_COLORS.length]
    const baseTrackName = subtype === TRACK_SUBTYPES.DIFFSINGER
      ? '歌声合成トラック'
      : `${subtype.charAt(0).toUpperCase() + subtype.slice(1)} Track`
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

    // 対応するタブを作成（subtypeベースで判定 - CRITICAL FIX）
    let tabType = TAB_TYPES.MIDI_EDITOR
    if (subtype === TRACK_SUBTYPES.DRUMS) {
      tabType = TAB_TYPES.DRUM_TRACK
    } else if (subtype === TRACK_SUBTYPES.DIFFSINGER) {
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

    // トラック追加時はミキサーキャッシュを無効化
    this._invalidateMixerCache()
    console.log('🔄 Mixer cache invalidated due to track addition')

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

    // 操作前の状態を保存
    this._saveToHistory('removeTrack')

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

    // トラック削除時はミキサーキャッシュを無効化
    this._invalidateMixerCache()
    console.log('🔄 Mixer cache invalidated due to track removal')

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

    // 操作前の状態を保存
    this._saveToHistory('updateTrack')

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

    // ミキサー関連プロパティが変更された場合のみキャッシュ無効化
    const mixerRelatedProps = ['name', 'volume', 'pan', 'muted', 'solo', 'color', 'subtype']
    const hasMixerChanges = Object.keys(updates).some(key => mixerRelatedProps.includes(key))

    if (hasMixerChanges) {
      this._invalidateMixerCache()
      console.log('🔄 Mixer cache invalidated due to track update')
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
        ...midiData?.metadata
      },
      settings: {
        ...currentTrack.midiData.settings,
        ...midiData?.settings
      }
    }

    // トラックのMIDIデータを更新
    this.currentProject.tracks[trackIndex].midiData = validatedMidiData

    // メタデータの更新
    this.currentProject.tracks[trackIndex].metadata = {
      ...this.currentProject.tracks[trackIndex].metadata,
      modifiedAt: new Date().toISOString()
    }

    // ファイルベースなのでlocalStorage保存は不要

    console.log('Track MIDI data updated:', trackId, 'Notes:', validatedMidiData.notes.length)
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

    // トラックのドラムデータを更新
    this.currentProject.tracks[trackIndex].drumData = {
      ...drumData,
      lastModified: new Date().toISOString()
    }

    // メタデータの更新
    this.currentProject.tracks[trackIndex].metadata = {
      ...this.currentProject.tracks[trackIndex].metadata,
      modifiedAt: new Date().toISOString()
    }

    // ファイルベースなのでlocalStorage保存は不要

    console.log('Track drum data updated:', trackId)
    return true
  }

  // 音声合成データを更新
  updateTrackVoiceSynthData(trackId, voiceSynthData) {
    if (!this.currentProject) {
      return false
    }

    const trackIndex = this.currentProject.tracks.findIndex(track => track.id === trackId)

    if (trackIndex === -1) {
      return false
    }

    // トラックの音声合成データを更新
    this.currentProject.tracks[trackIndex].voiceSynthData = {
      ...voiceSynthData,
      lastModified: new Date().toISOString()
    }

    // メタデータの更新
    this.currentProject.tracks[trackIndex].metadata = {
      ...this.currentProject.tracks[trackIndex].metadata,
      modifiedAt: new Date().toISOString()
    }

    // ファイルベースなのでlocalStorage保存は不要

    console.log('Track voice synth data updated:', trackId)
    return true
  }

  // タブを追加
  addTab(tabId, title, type, trackId = null) {
    if (!this.currentProject) return false

    const newTab = createTab(tabId, title, type, trackId)
    this.currentProject.tabs.push(newTab)

    console.log('Tab added:', tabId)
    return true
  }

  // タブを削除
  removeTab(tabId) {
    if (!this.currentProject) return false

    this.currentProject.tabs = this.currentProject.tabs.filter(tab => tab.id !== tabId)

    console.log('Tab removed:', tabId)
    return true
  }

  // アクティブタブを変更
  setActiveTab(tabId) {
    if (!this.currentProject) return false

    this.currentProject.activeTab = tabId
    console.log('Active tab set:', tabId)
    return true
  }

  // タブを取得
  getTab(tabId) {
    if (!this.currentProject) return null

    return this.currentProject.tabs.find(tab => tab.id === tabId)
  }

  // すべてのタブを取得
  getAllTabs() {
    if (!this.currentProject) return []

    return this.currentProject.tabs
  }

  // アクティブタブを取得
  getActiveTab() {
    if (!this.currentProject) return null

    return this.currentProject.activeTab
  }

  // トラックを取得
  getTrack(trackId) {
    if (!this.currentProject) return null

    return this.currentProject.tracks.find(track => track.id === trackId)
  }

  // すべてのトラックを取得
  getAllTracks() {
    if (!this.currentProject) return []

    return this.currentProject.tracks
  }

  // トラックを取得（エイリアス）
  getTracks() {
    return this.getAllTracks()
  }

  // タブを取得（エイリアス）
  getTabs() {
    return this.getAllTabs()
  }

  // プロジェクトを取得
  getProject() {
    return this.currentProject
  }

  // プロジェクト名を更新
  updateProjectName(name) {
    if (!this.currentProject) return false

    this.currentProject.metadata.name = name
    this.currentProject.metadata.modifiedAt = new Date().toISOString()

    return true
  }

  // プロジェクト一覧を取得
  getProjectList() {
    // 現在のプロジェクトのみを返す
    if (this.currentProject) {
      return [{
        id: this.currentProject.id,
        name: this.currentProject.metadata.name,
        createdAt: this.currentProject.metadata.createdAt,
        modifiedAt: this.currentProject.metadata.modifiedAt,
        trackCount: this.currentProject.tracks.length,
        tempo: this.currentProject.settings.tempo,
        key: this.currentProject.settings.key
      }]
    }
    return []
  }

  // サンプルプロジェクトを読み込むべきか判定
  shouldLoadSampleProject() {
    try {
      // 既存のプロジェクトリストを確認
      const projectList = this.getProjectList()

      // プロジェクトが1つもない場合はサンプルを読み込む
      if (!projectList || projectList.length === 0) {
        console.log('No existing projects found, will load sample project')
        return true
      }

      // プロジェクトが存在する場合はサンプルを読み込まない
      console.log('Existing projects found, skipping sample project:', projectList.length)
      return false
    } catch (error) {
      console.error('Error checking for existing projects:', error)
      // エラーの場合はサンプルを読み込む（安全側に倒す）
      return true
    }
  }

  // プロジェクト設定を更新
  updateProjectSettings(settings) {
    if (!this.currentProject) return false

    this.currentProject.settings = {
      ...this.currentProject.settings,
      ...settings
    }

    this.currentProject.metadata.modifiedAt = new Date().toISOString()

    // プロジェクト名が設定に含まれる場合、メタデータも更新
    if (settings.name) {
      this.currentProject.metadata.name = settings.name
    }

    console.log('Project settings updated:', settings)
    return true
  }

  // プロジェクトを保存（ファイルベースに変更）
  saveProject() {
    if (!this.currentProject) return false

    try {
      // ファイルベースシステムでは自動保存されるため、ここでは何もしない
      console.log('Project autosaved (file-based system)')
      return true
    } catch (error) {
      console.error('Failed to save project:', error)
      return false
    }
  }

  // プロジェクトを読み込み（外部データから）
  loadProjectFromData(projectData) {
    try {
      // プロジェクトデータを検証
      const validatedProject = this.validateProject(projectData)

      // 現在のプロジェクトを置き換え
      this.currentProject = validatedProject

      // ミキサーキャッシュを無効化
      this._invalidateMixerCache()

      // ジャンルコンテキストとDemo Songメタデータもクリア
      this.genreContext = null
      this.demoSongMetadata = null

      console.log('Project loaded from data:', validatedProject.metadata.name)
      return validatedProject
    } catch (error) {
      console.error('Failed to load project from data:', error)
      return null
    }
  }

  // プロジェクトをエクスポート
  exportProject() {
    if (!this.currentProject) return null

    return JSON.parse(JSON.stringify(this.currentProject))
  }

  // ミキサーチャンネルを取得（キャッシュ付き）
  getMixerChannels() {
    if (!this.currentProject) return []

    // キャッシュキーを生成（トラック数とトラックIDの組み合わせ）
    const cacheKey = this.currentProject.tracks.length + ':' +
      this.currentProject.tracks.map(t => t.id).join(',')

    // キャッシュが有効な場合は返す
    if (this._mixerChannelsCacheKey === cacheKey && this._mixerChannelsCache) {
      return this._mixerChannelsCache
    }

    // キャッシュが無効な場合は再計算
    const channels = this.currentProject.tracks.map(track => ({
      id: track.id,
      name: track.name,
      color: track.color,
      volume: track.volume || 75,
      pan: track.pan || 0,
      muted: track.muted || false,
      solo: track.solo || false,
      type: track.type,
      subtype: track.subtype
    }))

    // キャッシュを更新
    this._mixerChannelsCacheKey = cacheKey
    this._mixerChannelsCache = channels

    return channels
  }

  // Demo Song読み込み
  async loadDemoSong(demoSongId) {
    try {
      console.log('🎵 Loading Demo Song:', demoSongId)

      // Demo Songマネージャーを使用
      const result = await demoSongManager.loadDemoSong(demoSongId, this)

      if (result.success) {
        // ジャンルコンテキストとDemo Songメタデータを保存
        this.genreContext = result.genreContext
        this.demoSongMetadata = result.metadata

        // ミキサーキャッシュを無効化
        this._invalidateMixerCache()

        console.log('🎵 Demo Song loaded successfully:', result.metadata.title)
        console.log('🎵 Genre context:', result.genreContext)
        console.log('🎵 Metadata:', result.metadata)

        return {
          success: true,
          project: this.currentProject,
          genreContext: result.genreContext,
          metadata: result.metadata
        }
      } else {
        console.error('Failed to load Demo Song:', result.error)
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      console.error('Failed to load Demo Song:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // ジャンルコンテキストを取得
  getGenreContext() {
    return this.genreContext
  }

  // Demo Songメタデータを取得
  getDemoSongMetadata() {
    return this.demoSongMetadata
  }

  // ジャンルを変更
  async changeGenre(genreId) {
    try {
      console.log('🎵 Changing genre to:', genreId)

      // ジャンルマネージャーを使用
      const result = await genreManager.changeGenre(genreId, this)

      if (result.success) {
        // ジャンルコンテキストを更新
        this.genreContext = result.genreContext

        console.log('🎵 Genre changed successfully:', result.genreContext)
        return {
          success: true,
          genreContext: result.genreContext
        }
      } else {
        console.error('Failed to change genre:', result.error)
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      console.error('Failed to change genre:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // AIエージェントにプロジェクトコンテキストを送信
  async sendProjectContextToAI() {
    if (!this.currentProject) return

    try {
      // プロジェクトコンテキストを構築
      const projectContext = {
        projectName: this.currentProject.metadata.name,
        trackCount: this.currentProject.tracks.length,
        tracks: this.currentProject.tracks.map(track => ({
          id: track.id,
          name: track.name,
          type: track.type,
          subtype: track.subtype,
          notesCount: track.midiData?.notes?.length || 0
        })),
        genreContext: this.genreContext,
        demoSongMetadata: this.demoSongMetadata,
        tempo: this.currentProject.settings.tempo || 120,
        timeSignature: this.currentProject.settings.timeSignature || '4/4'
      }

      // AIエージェントにコンテキストを送信
      await aiAgentEngine.updateProjectContext(projectContext)

      console.log('🤖 Project context sent to AI agent')
    } catch (error) {
      console.error('Failed to send project context to AI:', error)
    }
  }
}

export default ProjectManager
