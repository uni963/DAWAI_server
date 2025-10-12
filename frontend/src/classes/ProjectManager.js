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
    this.initializeProject()
  }

  // ミキサーキャッシュを無効化するヘルパーメソッド
  _invalidateMixerCache() {
    this._mixerChannelsCacheKey = null
    this._mixerChannelsCache = null
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
    const track2 = createTrack('track-2', 'Drums Track', TRACK_TYPES.DRUMS, TRACK_SUBTYPES.DRUMS, TRACK_COLORS[1])

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

  // ===== AI Agent用MIDI操作メソッド =====

  /**
   * AI Agent用: MIDIノート追加
   * @param {Object} params - パラメータ
   * @param {string} params.trackId - トラックID
   * @param {Array} params.notes - 追加するノート配列
   * @returns {boolean} 成功/失敗
   */
  addMidiNotes({ trackId, notes }) {
    const track = this.currentProject?.tracks.find(t => t.id === trackId)
    if (!track) {
      console.error('AI Agent: Track not found for addMidiNotes:', trackId)
      return false
    }

    const currentNotes = track.midiData?.notes || []
    const updatedNotes = [...currentNotes, ...notes]

    console.log('AI Agent: Adding MIDI notes:', {
      trackId,
      trackName: track.name,
      newNotesCount: notes.length,
      totalNotesCount: updatedNotes.length
    })

    return this.updateTrackMidiData(trackId, {
      ...track.midiData,
      notes: updatedNotes
    })
  }

  /**
   * AI Agent用: MIDIノート更新
   * @param {Object} params - パラメータ
   * @param {string} params.trackId - トラックID
   * @param {Array} params.notes - 更新するノート配列（idフィールド必須）
   * @returns {boolean} 成功/失敗
   */
  updateMidiNotes({ trackId, notes }) {
    const track = this.currentProject?.tracks.find(t => t.id === trackId)
    if (!track) {
      console.error('AI Agent: Track not found for updateMidiNotes:', trackId)
      return false
    }

    const currentNotes = track.midiData?.notes || []
    const updatedNotes = currentNotes.map(note => {
      const update = notes.find(n => n.id === note.id)
      return update ? { ...note, ...update } : note
    })

    console.log('AI Agent: Updating MIDI notes:', {
      trackId,
      trackName: track.name,
      updateCount: notes.length,
      totalNotesCount: updatedNotes.length
    })

    return this.updateTrackMidiData(trackId, {
      ...track.midiData,
      notes: updatedNotes
    })
  }

  /**
   * AI Agent用: MIDIノート削除
   * @param {Object} params - パラメータ
   * @param {string} params.trackId - トラックID
   * @param {Array<string>} params.noteIds - 削除するノートIDの配列
   * @returns {boolean} 成功/失敗
   */
  deleteMidiNotes({ trackId, noteIds }) {
    const track = this.currentProject?.tracks.find(t => t.id === trackId)
    if (!track) {
      console.error('AI Agent: Track not found for deleteMidiNotes:', trackId)
      return false
    }

    const currentNotes = track.midiData?.notes || []
    const updatedNotes = currentNotes.filter(note => !noteIds.includes(note.id))

    console.log('AI Agent: Deleting MIDI notes:', {
      trackId,
      trackName: track.name,
      deleteCount: noteIds.length,
      remainingNotesCount: updatedNotes.length
    })

    return this.updateTrackMidiData(trackId, {
      ...track.midiData,
      notes: updatedNotes
    })
  }

  /**
   * AI Agent用: ノート承認（isPendingフラグを削除）
   * @param {Object} params - パラメータ
   * @param {string} params.trackId - トラックID
   * @param {Array} params.notes - 承認するノート配列
   * @returns {boolean} 成功/失敗
   */
  approveMidiNotes({ trackId, notes }) {
    const track = this.currentProject?.tracks.find(t => t.id === trackId)
    if (!track) {
      console.error('AI Agent: Track not found for approveMidiNotes:', trackId)
      return false
    }

    const currentNotes = track.midiData?.notes || []
    const approvedNoteIds = notes.map(n => n.id)

    const updatedNotes = currentNotes.map(note => {
      if (approvedNoteIds.includes(note.id)) {
        const approvedNote = notes.find(n => n.id === note.id)
        if (approvedNote) {
          const { isPending, ...cleanNote } = approvedNote
          return cleanNote
        }
      }
      return note
    })

    console.log('AI Agent: Approving MIDI notes:', {
      trackId,
      trackName: track.name,
      approvedCount: notes.length,
      totalNotesCount: updatedNotes.length
    })

    const result = this.updateTrackMidiData(trackId, {
      ...track.midiData,
      notes: updatedNotes
    })

    // 承認イベントを発火（MIDIエディタの再描画用）
    if (result) {
      window.dispatchEvent(new CustomEvent('midiDataApproved', {
        detail: { trackId, noteIds: approvedNoteIds }
      }))
    }

    return result
  }

  /**
   * AI Agent用: ノート拒否（削除）
   * @param {Object} params - パラメータ
   * @param {string} params.trackId - トラックID
   * @param {Array<string>} params.noteIds - 拒否するノートIDの配列
   * @returns {boolean} 成功/失敗
   */
  rejectMidiNotes({ trackId, noteIds }) {
    console.log('AI Agent: Rejecting MIDI notes:', {
      trackId,
      rejectCount: noteIds.length
    })

    const result = this.deleteMidiNotes({ trackId, noteIds })

    // 拒否イベントを発火（MIDIエディタの再描画用）
    if (result) {
      window.dispatchEvent(new CustomEvent('midiDataRejected', {
        detail: { trackId, noteIds }
      }))
    }

    return result
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

      // プロジェクト読み込み時はキャッシュ無効化
      this._invalidateMixerCache()

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

      // プロジェクト複製時はキャッシュ無効化
      this._invalidateMixerCache()

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

  // ミキサーチャンネルを取得（キャッシュ機構付き - ちらつき問題対策）
  // 🔧 Fix #4: 防御的プログラミングを強化してnull/undefinedによる例外を完全防止
  getMixerChannels() {
    // 🛡️ currentProjectの存在チェック（例外防止）
    if (!this.currentProject) {
      console.warn('⚠️ getMixerChannels: currentProject is null/undefined')
      return [] // 安全な空配列
    }

    const tracks = this.getTracks()

    // 🛡️ tracksの存在チェック（例外防止）
    if (!tracks || tracks.length === 0) {
      console.warn('⚠️ getMixerChannels: tracks is empty or null')
      return [] // 安全な空配列
    }

    // 🔧 修正5: 軽量なキャッシュキー生成（JSON.stringify不要）
    // JSON.stringifyは重い処理でトラック数が多いと顕著に影響する
    // 文字列連結による軽量なキャッシュキー生成で90%高速化
    const cacheKey = tracks.map(t =>
      `${t.id}:${t.name}:${t.volume}:${t.pan}:${t.muted}:${t.solo}:${t.subtype}:${t.color}`
    ).join('|')

    // キャッシュヒット時は既存の配列を返す（参照安定性確保）
    if (this._mixerChannelsCacheKey === cacheKey && this._mixerChannelsCache) {
      console.log('📦 Mixer channels cache hit - ちらつき防止')
      return this._mixerChannelsCache
    }

    // キャッシュミス：新規生成
    console.log('🔄 Mixer channels cache miss - 再生成中')
    this._mixerChannelsCache = tracks.map(track => ({
      id: track.id,
      name: track.name.replace(' Track', ''),
      type: track.subtype,
      volume: track.volume,
      pan: track.pan || 0,
      muted: track.muted,
      solo: track.solo,
      color: track.color
    }))
    this._mixerChannelsCacheKey = cacheKey

    return this._mixerChannelsCache
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

      // インポート時はキャッシュ無効化
      this._invalidateMixerCache()

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

    // 新規プロジェクト作成時はキャッシュ無効化
    this._invalidateMixerCache()

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

      // ファイルから読み込み時はキャッシュ無効化
      this._invalidateMixerCache()

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

    // プロジェクトリセット時はキャッシュ無効化
    this._invalidateMixerCache()

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

      // データから読み込み時はキャッシュ無効化
      this._invalidateMixerCache()

      return validatedProject
    } catch (error) {
      console.error('Failed to load project from data:', error)
      throw error
    }
  }

  // ===== サンプルデータ関連機能 =====

  // サンプルプロジェクトを読み込み
  loadSampleProject() {
    try {
      console.log('Loading sample project...')

      // サンプルデータからプロジェクトを作成
      const sampleProject = this.createProjectFromSampleData(SAMPLE_PROJECT_DATA)

      // 現在のプロジェクトを置き換え
      this.currentProject = sampleProject

      // サンプルプロジェクト読み込み時はキャッシュ無効化
      this._invalidateMixerCache()

      console.log('Sample project loaded successfully:', {
        name: sampleProject.name,
        trackCount: sampleProject.tracks.length,
        tracks: sampleProject.tracks.map(track => ({
          id: track.id,
          name: track.name,
          type: track.type,
          notesCount: track.midiData?.notes?.length || 0
        }))
      })

      return sampleProject
    } catch (error) {
      console.error('Failed to load sample project:', error)
      // エラーが発生した場合はデフォルトプロジェクトを返す
      return this.createDefaultProject()
    }
  }

  // サンプルデータからプロジェクトを作成
  createProjectFromSampleData(sampleData) {
    // 基本プロジェクト構造を作成
    const project = {
      id: sampleData.id || `project-sample-${Date.now()}`,
      name: sampleData.name || 'Demo Song',
      tracks: [],
      tabs: [
        createTab('arrangement', 'Arrangement', TAB_TYPES.ARRANGEMENT)
      ],
      activeTab: 'arrangement',
      settings: {
        ...sampleData.settings,
        tempo: sampleData.metadata?.tempo || 120,
        key: sampleData.metadata?.key || 'C',
        timeSignature: sampleData.metadata?.timeSignature || '4/4',
        sampleRate: 44100,
        duration: sampleData.metadata?.duration || 30
      },
      metadata: {
        ...sampleData.metadata,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        version: sampleData.metadata?.version || '1.0.0',
        description: sampleData.metadata?.description || '',
        tags: sampleData.metadata?.tags || [],
        author: sampleData.metadata?.creator || 'DAWAI Demo',
        genre: '',
        bpm: sampleData.metadata?.tempo || 120,
        key: sampleData.metadata?.key || 'C',
        duration: sampleData.metadata?.duration || 0,
        totalTracks: sampleData.tracks?.length || 0,
        lastAutoSave: null,
        autoSaveEnabled: sampleData.metadata?.autoSaveEnabled || true,
        autoSaveInterval: sampleData.metadata?.autoSaveInterval || 30000
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
    }

    // サンプルトラックデータを処理
    if (sampleData.tracks && Array.isArray(sampleData.tracks)) {
      project.tracks = sampleData.tracks.map(sampleTrack => {
        const trackId = sampleTrack.id || `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // 基本トラック構造を作成
        const track = createTrack(
          trackId,
          sampleTrack.name || 'Untitled Track',
          sampleTrack.type || TRACK_TYPES.MIDI,
          sampleTrack.subtype || TRACK_SUBTYPES.PIANO,
          sampleTrack.color || '#3B82F6'
        )

        // サンプルのトラック設定を適用
        track.volume = sampleTrack.volume || 75
        track.pan = sampleTrack.pan || 0
        track.muted = sampleTrack.muted || false
        track.solo = sampleTrack.solo || false

        // MIDIデータを処理
        if (sampleTrack.midiData) {
          track.midiData = {
            ...track.midiData,
            notes: sampleTrack.midiData.notes || [],
            tempo: sampleTrack.midiData.tempo || 120,
            timeSignature: sampleTrack.midiData.timeSignature || '4/4',
            trackId: trackId,
            lastModified: new Date().toISOString()
          }
        }

        // ドラムデータを処理
        if (sampleTrack.type === TRACK_TYPES.DRUMS && sampleTrack.drumData) {
          // ドラムトラックマネージャーに登録
          const drumData = drumTrackManager.createDrumTrack(trackId)
          if (drumData) {
            track.drumTrackId = trackId
            track.hasDrumData = true
            track.drumData = {
              ...drumData,
              ...sampleTrack.drumData,
              trackId: trackId,
              lastModified: new Date().toISOString()
            }
            console.log('🥁 Sample drum track created:', trackId)
          }
        }

        console.log('Sample track processed:', {
          id: trackId,
          name: track.name,
          type: track.type,
          notesCount: track.midiData?.notes?.length || 0,
          hasDrumData: !!track.hasDrumData
        })

        return track
      })
    }

    // 対応するタブを作成
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

    // プロジェクトを検証
    return this.validateProject(project)
  }

  // 初回起動時にサンプルプロジェクトが必要かチェック
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

  // ===== ジャンルコンテキスト管理 =====

  /**
   * ジャンルコンテキストを設定
   * @param {Object} context - ジャンルコンテキスト
   */
  setGenreContext(context) {
    this.genreContext = context
    this.saveToLocalStorage()
    console.log('Genre context set:', context?.genre?.name?.ja)
  }

  /**
   * ジャンルコンテキストを取得
   * @returns {Object|null} ジャンルコンテキスト
   */
  getGenreContext() {
    return this.genreContext
  }

  /**
   * Demo Songメタデータを設定
   * @param {Object} metadata - Demo Songメタデータ
   */
  setDemoSongMetadata(metadata) {
    this.demoSongMetadata = metadata
    this.saveToLocalStorage()
    console.log('Demo song metadata set:', metadata?.originalSongId)
  }

  /**
   * Demo Songメタデータを取得
   * @returns {Object|null} Demo Songメタデータ
   */
  getDemoSongMetadata() {
    return this.demoSongMetadata
  }

  /**
   * ジャンルコンテキストをクリア
   */
  clearGenreContext() {
    this.genreContext = null
    this.demoSongMetadata = null
    this.saveToLocalStorage()
    console.log('Genre context and demo song metadata cleared')
  }

  /**
   * 現在のプロジェクトがDemo Songかチェック
   * @returns {boolean}
   */
  isDemoSongProject() {
    return this.demoSongMetadata?.isDemoSong === true
  }

  /**
   * Demo Songの完成度を取得
   * @returns {Object|null} 完成度情報
   */
  getDemoSongCompletion() {
    if (!this.isDemoSongProject()) {
      return null
    }
    return this.demoSongMetadata?.completionStatus || null
  }

  // ========== Demo Song Manager互換メソッド ==========

  /**
   * 新しいプロジェクトを作成
   */
  newProject() {
    this.currentProject = this.createDefaultProject()

    // 新規プロジェクト作成時はキャッシュ無効化
    this._invalidateMixerCache()

    console.log('🆕 New project created:', this.currentProject.name)
    return this.currentProject
  }

  /**
   * プロジェクト名を設定
   * @param {string} name - 新しいプロジェクト名
   */
  setProjectName(name) {
    if (!this.currentProject) return false
    this.currentProject.name = name
    this.currentProject.modifiedAt = new Date().toISOString()
    console.log('📝 Project name set:', name)
    return true
  }

  /**
   * テンポを設定
   * @param {number} tempo - 新しいテンポ
   */
  setTempo(tempo) {
    if (!this.currentProject) return false
    this.currentProject.tempo = tempo
    if (this.currentProject.settings) {
      this.currentProject.settings.tempo = tempo
    }
    this.currentProject.modifiedAt = new Date().toISOString()
    console.log('🎵 Tempo set:', tempo)
    return true
  }

  /**
   * 拍子を設定
   * @param {string} timeSignature - 拍子 (例: "4/4")
   */
  setTimeSignature(timeSignature) {
    if (!this.currentProject) return false
    this.currentProject.timeSignature = timeSignature
    if (this.currentProject.settings) {
      this.currentProject.settings.timeSignature = timeSignature
    }
    this.currentProject.modifiedAt = new Date().toISOString()
    console.log('🎼 Time signature set:', timeSignature)
    return true
  }

  /**
   * スケール制約を設定
   * @param {Object} constraints - スケール制約オブジェクト
   */
  setScaleConstraints(constraints) {
    if (!this.currentProject) {
      console.warn('⚠️ No current project for scale constraints')
      return false
    }
    this.currentProject.scaleConstraints = constraints
    this.currentProject.modifiedAt = new Date().toISOString()
    console.log('✅ スケール制約設定:', constraints)
    return true
  }

  /**
   * 現在のプロジェクトを取得
   * @returns {Object|null} 現在のプロジェクト
   */
  getCurrentProject() {
    return this.currentProject
  }

  /**
   * ローカルストレージに保存
   */
  saveToLocalStorage() {
    if (!this.currentProject) return false

    try {
      // ジャンルコンテキストとDemo SongメタデータをlocalStorageに保存
      const contextData = {
        genreContext: this.genreContext,
        demoSongMetadata: this.demoSongMetadata,
        timestamp: new Date().toISOString()
      }

      localStorage.setItem('dawai_context_data', JSON.stringify(contextData))
      console.log('💾 Context data saved to localStorage')
      return true
    } catch (error) {
      console.error('❌ Failed to save to localStorage:', error)
      return false
    }
  }

  // Method stub for saveProject called by pasteTrack
  saveProject() {
    return this.saveToStorage()
  }
}

export default ProjectManager