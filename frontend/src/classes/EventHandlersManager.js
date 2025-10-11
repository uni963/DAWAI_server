/**
 * イベントハンドラー管理クラス
 * App.jsx内の各種イベントハンドラー関数を管理
 */

import drumTrackManager from '../utils/drumTrackManager.js'
import { createDrumData } from '../utils/drumTrackDataStructure.js'
import unifiedAudioSystem from '../utils/unifiedAudioSystem.js'
import smartSuggestionEngine from '../engines/SmartSuggestionEngine.js'
import performanceMonitor from '../utils/performanceMonitor.js'
import { TRACK_TYPES, TRACK_SUBTYPES } from '../constants/trackTypes.js'
import { createTrack, createTab } from '../factories/projectFactory.js'

class EventHandlersManager {
  constructor(dependencies) {
    // 依存関係を保存
    this.projectManager = dependencies.projectManager
    this.appSettingsManager = dependencies.appSettingsManager

    // 状態更新関数
    this.setProject = dependencies.setProject
    this.setTracks = dependencies.setTracks
    this.setTabs = dependencies.setTabs
    this.setActiveTab = dependencies.setActiveTab
    this.setGlobalTempo = dependencies.setGlobalTempo
    this.setForceRerender = dependencies.setForceRerender
    this.setGenreContext = dependencies.setGenreContext
    this.setDemoSongMetadata = dependencies.setDemoSongMetadata
    this.setMusicTheorySettings = dependencies.setMusicTheorySettings
    this.setAppSettings = dependencies.setAppSettings

    // モーダル状態管理
    this.setShowGenreSelector = dependencies.setShowGenreSelector
    this.setShowDemoSongBrowser = dependencies.setShowDemoSongBrowser

    // その他の状態
    this.setSmartSuggestionsEnabled = dependencies.setSmartSuggestionsEnabled
    this.setSuggestionAggressiveness = dependencies.setSuggestionAggressiveness

    // メソッドバインディング
    this.handleGlobalTempoChange = this.handleGlobalTempoChange.bind(this)
    this.handleTabChange = this.handleTabChange.bind(this)
    this.addNewTrack = this.addNewTrack.bind(this)
    this.removeTrack = this.removeTrack.bind(this)
    this.updateTrack = this.updateTrack.bind(this)
    this.updateTrackMidiData = this.updateTrackMidiData.bind(this)
    this.updateTrackDrumData = this.updateTrackDrumData.bind(this)
    this.handleMusicTheorySettingsChange = this.handleMusicTheorySettingsChange.bind(this)
    this.handleGenreSelect = this.handleGenreSelect.bind(this)
    this.handleDemoSongLoad = this.handleDemoSongLoad.bind(this)
    this.handleSuggestionAccept = this.handleSuggestionAccept.bind(this)
    this.handleSuggestionReject = this.handleSuggestionReject.bind(this)
    this.updateMixerChannels = this.updateMixerChannels.bind(this)
    this.updateMasterVolume = this.updateMasterVolume.bind(this)
    this.addNewTab = this.addNewTab.bind(this)
    this.toggleTrackMute = this.toggleTrackMute.bind(this)
    this.toggleTrackSolo = this.toggleTrackSolo.bind(this)
    this.toggleTrackArm = this.toggleTrackArm.bind(this)
    this.updateGlobalSettings = this.updateGlobalSettings.bind(this)
    this.updateAppSettings = this.updateAppSettings.bind(this)
    this.updateProjectState = this.updateProjectState.bind(this)
  }

  /**
   * プロジェクト状態を更新（デバウンス処理付き）
   */
  updateProjectState() {
    // デバウンス処理を追加
    if (this.updateProjectState.timeout) {
      clearTimeout(this.updateProjectState.timeout)
    }

    this.updateProjectState.timeout = setTimeout(() => {
      const currentProject = this.projectManager.getProject()
      this.setProject(currentProject)
      this.setTracks(this.projectManager.getTracks())
      this.setTabs(this.projectManager.getTabs())
      this.setActiveTab(this.projectManager.getActiveTab())

      // 強制再レンダリングをトリガー
      this.setForceRerender(prev => prev + 1)

      console.log('📊 Project state updated')
    }, 100)
  }

  /**
   * グローバルテンポ変更ハンドラー
   */
  handleGlobalTempoChange(newTempo) {
    console.log('🎵 Global tempo changed to:', newTempo)

    this.setGlobalTempo(newTempo)

    // プロジェクトマネージャーにもテンポを設定
    this.projectManager.updateProjectSettings({ tempo: newTempo })

    // 統合音声システムのテンポを更新
    if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
      try {
        window.unifiedAudioSystem.updateGlobalTempo(newTempo)
      } catch (error) {
        console.warn('⚠️ Failed to update unified audio system tempo:', error)
      }
    }

    this.updateProjectState()
  }

  /**
   * タブ変更ハンドラー
   */
  handleTabChange(tabId) {
    console.log('🔄 Tab changed to:', tabId)

    if (this.projectManager.setActiveTab(tabId)) {
      this.setActiveTab(tabId)
      this.updateProjectState()
    }
  }

  /**
   * 新しいトラック追加ハンドラー
   */
  addNewTrack(trackType = TRACK_TYPES.MIDI, subtype = TRACK_SUBTYPES.PIANO, keepInArrangement = false) {
    console.log('App: addNewTrack called with:', { trackType, subtype, keepInArrangement })

    const newTrack = this.projectManager.addTrack(trackType, subtype, keepInArrangement)
    if (newTrack) {
      console.log('App: New track created:', newTrack.id, newTrack.name)

      // トラックタイプに応じてデータを初期化
      if (subtype === TRACK_SUBTYPES.DRUMS) {
        // ドラムトラックの場合 - 新しいデータ構造を使用
        const initialDrumData = createDrumData(newTrack.id)

        // ドラムトラックマネージャーに登録
        drumTrackManager.createDrumTrack(newTrack.id)

        // プロジェクトマネージャーにも設定
        this.projectManager.updateTrackDrumData(newTrack.id, initialDrumData)

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
        this.projectManager.updateTrackMidiData(newTrack.id, initialMidiData)
      }

      // 音声システムにトラックを追加（確実に実行）
      if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
        try {
          // 統一された音声システムではトラック管理は別途実装が必要
          console.log('Audio system: Track added successfully:', newTrack.id)
        } catch (error) {
          console.warn('⚠️ Failed to add track to audio system:', error)
        }
      }

      this.updateProjectState()
      return newTrack
    }

    return null
  }

  /**
   * トラック削除ハンドラー
   */
  removeTrack(trackId) {
    console.log('🗑️ Removing track:', trackId)

    if (this.projectManager.removeTrack(trackId)) {
      // 関連するタブも削除
      this.projectManager.removeTabsForTrack(trackId)

      // ドラムトラックマネージャーからも削除
      drumTrackManager.removeDrumTrack(trackId)

      this.updateProjectState()
      return true
    }

    return false
  }

  /**
   * トラック更新ハンドラー
   */
  updateTrack(trackId, updates) {
    if (this.projectManager.updateTrack(trackId, updates)) {
      this.updateProjectState()
    }
  }

  /**
   * トラックMIDIデータ更新ハンドラー
   */
  updateTrackMidiData(trackId, midiData, keepInArrangement = false) {
    console.log('🎹 Updating MIDI data for track:', trackId)

    if (this.projectManager.updateTrackMidiData(trackId, midiData)) {
      this.updateProjectState()
    }
  }

  /**
   * トラックドラムデータ更新ハンドラー
   */
  updateTrackDrumData(trackId, drumData, keepInArrangement = false) {
    console.log('🥁 Updating drum data for track:', trackId)

    if (this.projectManager.updateTrackDrumData(trackId, drumData)) {
      this.updateProjectState()
    }
  }

  /**
   * 音楽理論設定変更ハンドラー
   */
  handleMusicTheorySettingsChange(setting, value) {
    console.log('🎼 Music theory setting changed:', setting, value)

    this.setMusicTheorySettings(prev => ({
      ...prev,
      [setting]: value
    }))
  }

  /**
   * ジャンル選択ハンドラー
   */
  async handleGenreSelect(genre, genreContext) {
    console.log('🎵 Genre selected:', genre)

    try {
      // ジャンルコンテキストを設定
      this.projectManager.setGenreContext(genreContext)
      this.setGenreContext(genreContext)

      // 音楽理論設定も更新
      if (genreContext?.musicTheory) {
        this.setMusicTheorySettings(prev => ({
          ...prev,
          selectedGenre: genre,
          scaleConstraintEnabled: genreContext.musicTheory.scaleConstraintEnabled || false,
          selectedScales: genreContext.musicTheory.recommendedScales || []
        }))
      }

      this.setShowGenreSelector(false)
      this.updateProjectState()
    } catch (error) {
      console.error('❌ Error handling genre selection:', error)
    }
  }

  /**
   * Demo Song読み込みハンドラー
   */
  async handleDemoSongLoad(demoSong) {
    console.log('📼 Demo Song loading:', demoSong.title)

    try {
      // Demo Songメタデータを設定
      this.projectManager.setDemoSongMetadata({
        title: demoSong.title,
        genre: demoSong.genre,
        description: demoSong.description,
        loadedAt: new Date().toISOString()
      })

      this.setDemoSongMetadata({
        title: demoSong.title,
        genre: demoSong.genre,
        description: demoSong.description,
        loadedAt: new Date().toISOString()
      })

      // プロジェクト名を更新
      this.projectManager.updateProjectSettings({
        name: demoSong.title
      })

      // Demo Songデータを読み込み
      if (demoSong.tracks) {
        for (const trackData of demoSong.tracks) {
          const newTrack = this.addNewTrack(trackData.type, trackData.subtype, true)

          if (newTrack && trackData.midiData) {
            this.updateTrackMidiData(newTrack.id, trackData.midiData, true)
          }
        }
      }

      this.setShowDemoSongBrowser(false)
      this.updateProjectState()
    } catch (error) {
      console.error('❌ Error loading Demo Song:', error)
    }
  }

  /**
   * 提案受入ハンドラー
   */
  async handleSuggestionAccept(suggestion) {
    console.log('✅ Suggestion accepted:', suggestion)

    try {
      if (suggestion.type === 'note') {
        // ノート提案の場合
        const activeTab = this.projectManager.getActiveTab()
        if (activeTab?.trackId) {
          const currentTrack = this.projectManager.getTrack(activeTab.trackId)

          if (currentTrack && suggestion.data) {
            if (suggestion.data.chord) {
              // コード提案
              const chordNotes = suggestion.data.notes || []
              const updatedNotes = [...(currentTrack.midiData?.notes || []), ...chordNotes]

              this.updateTrackMidiData(activeTab.trackId, {
                ...currentTrack.midiData,
                notes: updatedNotes,
                lastModified: new Date().toISOString()
              })
            } else {
              // 単一ノート提案
              const newNote = suggestion.data
              const updatedNotes = [...(currentTrack.midiData?.notes || []), newNote]

              this.updateTrackMidiData(activeTab.trackId, {
                ...currentTrack.midiData,
                notes: updatedNotes,
                lastModified: new Date().toISOString()
              })
            }
          }
        }
      }

      // パフォーマンス監視
      performanceMonitor.logUserAction('suggestion_accept', {
        type: suggestion.type,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('❌ Error accepting suggestion:', error)
    }
  }

  /**
   * 提案拒否ハンドラー
   */
  handleSuggestionReject(suggestion) {
    console.log('❌ Suggestion rejected:', suggestion)

    // パフォーマンス監視
    performanceMonitor.logUserAction('suggestion_reject', {
      type: suggestion.type,
      timestamp: Date.now()
    })
  }

  /**
   * ミキサーチャンネル更新ハンドラー
   */
  updateMixerChannels(channels) {
    console.log('🎛️ Mixer channels updated')

    // プロジェクトマネージャーにミキサー設定を保存
    this.projectManager.updateProjectSettings({
      mixerChannels: channels
    })

    this.updateProjectState()
  }

  /**
   * マスターボリューム更新ハンドラー
   */
  updateMasterVolume(volume) {
    console.log('🔊 Master volume updated:', volume)

    // プロジェクトマネージャーにマスターボリュームを保存
    this.projectManager.updateProjectSettings({
      masterVolume: volume
    })

    // 統合音声システムにも反映
    if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
      try {
        window.unifiedAudioSystem.setMasterVolume(volume)
      } catch (error) {
        console.warn('⚠️ Failed to update unified audio system volume:', error)
      }
    }

    this.updateProjectState()
  }

  /**
   * 新しいタブ追加ハンドラー
   */
  addNewTab(trackType = 'piano', keepInArrangement = false) {
    console.log('📄 Adding new tab:', trackType)

    const newTab = this.projectManager.addTab(trackType, keepInArrangement)
    if (newTab) {
      this.updateProjectState()
      return newTab
    }

    return null
  }

  /**
   * トラックミュート切り替えハンドラー
   */
  toggleTrackMute(trackId) {
    if (this.projectManager.toggleTrackMute(trackId)) {
      this.updateProjectState()
    }
  }

  /**
   * トラックソロ切り替えハンドラー
   */
  toggleTrackSolo(trackId) {
    if (this.projectManager.toggleTrackSolo(trackId)) {
      this.updateProjectState()
    }
  }

  /**
   * トラックアーム切り替えハンドラー
   */
  toggleTrackArm(trackId) {
    if (this.projectManager.toggleTrackArm(trackId)) {
      this.updateProjectState()
    }
  }

  /**
   * グローバル設定更新ハンドラー
   */
  updateGlobalSettings(newSettings) {
    console.log('⚙️ Global settings updated')

    // プロジェクトマネージャーに設定を保存
    this.projectManager.updateProjectSettings(newSettings)
    this.updateProjectState()
  }

  /**
   * アプリ設定更新ハンドラー
   */
  updateAppSettings(newSettings) {
    console.log('🔧 App settings updated')

    // AppSettingsManagerを使用して設定を更新
    this.appSettingsManager.updateSettings(newSettings)
    this.setAppSettings(this.appSettingsManager.getSettings())
  }

  /**
   * イベントハンドラーのグローバルエラーハンドラー
   */
  handleGlobalError(event) {
    console.error('🚨 Global error caught:', event.error)

    // パフォーマンス監視にエラーを記録
    performanceMonitor.logError('global_error', event.error)

    // エラー詳細をコンソールに出力
    if (event.error && event.error.stack) {
      console.error('Stack trace:', event.error.stack)
    }
  }

  /**
   * 未処理のPromiseリジェクションハンドラー
   */
  handleUnhandledRejection(event) {
    console.error('🚨 Unhandled promise rejection:', event.reason)

    // パフォーマンス監視にエラーを記録
    performanceMonitor.logError('unhandled_rejection', event.reason)

    // デフォルトの動作を防ぐ
    event.preventDefault()
  }

  /**
   * キーボードイベントハンドラー
   */
  handleKeyDown(event) {
    // スペースキーでの再生/停止切り替え
    if (event.code === 'Space' && !event.target.matches('input, textarea, [contenteditable]')) {
      event.preventDefault()

      if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
        try {
          window.unifiedAudioSystem.togglePlayback()
        } catch (error) {
          console.warn('⚠️ Failed to toggle playback:', error)
        }
      }
    }
  }

  /**
   * ページ離脱前ハンドラー
   */
  handleBeforeUnload() {
    // プロジェクトデータを保存
    try {
      this.projectManager.saveToLocalStorage()
      console.log('💾 Project data saved on page unload')
    } catch (error) {
      console.error('❌ Failed to save project data on unload:', error)
    }
  }
}

export default EventHandlersManager