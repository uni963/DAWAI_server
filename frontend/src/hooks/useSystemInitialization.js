/**
 * システム初期化関連のカスタムフック
 * マネージャー初期化、エンジン初期化、音声システム初期化、テスト機能セットアップを管理
 */

import { useEffect, useState } from 'react'
import genreManager from '../managers/GenreManager.js'
import demoSongManager from '../managers/DemoSongManager.js'
import unifiedAudioSystem from '../utils/unifiedAudioSystem.js'
import { setupPianoTest } from '../utils/pianoTest.js'
import { setupDrumTest } from '../utils/drumTest.js'

/**
 * マネージャー初期化フック
 */
export const useManagerInitialization = () => {
  const [managersInitialized, setManagersInitialized] = useState(false)
  const [initializationError, setInitializationError] = useState(null)

  useEffect(() => {
    const initializeManagers = async () => {
      try {
        console.log('🎵 Initializing managers...')

        // GenreManager と DemoSongManager の初期化
        await genreManager.initialize()
        await demoSongManager.initialize()

        setManagersInitialized(true)
        console.log('✅ Managers initialized successfully')
      } catch (error) {
        console.error('❌ Manager initialization error:', error)
        setInitializationError(error)
      }
    }

    // Managers の初期化を実行
    initializeManagers()
  }, [])

  return {
    managersInitialized,
    initializationError
  }
}

/**
 * エンジン初期化フック
 */
export const useEngineInitialization = (projectManager) => {
  const [enginesInitialized, setEnginesInitialized] = useState(false)
  const [engineError, setEngineError] = useState(null)

  useEffect(() => {
    const initializeEngines = async () => {
      try {
        console.log('🚀 Initializing engines...')

        // 統一された音声システムの初期化
        if (window.unifiedAudioSystem) {
          await window.unifiedAudioSystem.initialize()
          console.log('✅ Unified audio system initialized')
        }

        // プロジェクトマネージャーが利用可能な場合、サンプルプロジェクトをチェック
        if (projectManager?.shouldLoadSampleProject()) {
          console.log('🎵 Loading sample project...')
          projectManager.loadSampleProject()
          console.log('✅ Sample project loaded')
        }

        // AI Agent Engineにプロジェクト操作コールバックを設定
        if (window.aiAgentEngine && projectManager) {
          console.log('🤖 Registering AI Agent Engine callbacks...')
          window.aiAgentEngine.setProjectCallbacks({
            // トラック操作
            addTrack: async (params) => {
              console.log('AI Agent Callback: addTrack', params)
              const newTrack = projectManager.addTrack(params)
              return newTrack
            },
            updateTrack: async ({ trackId, updates }) => {
              console.log('AI Agent Callback: updateTrack', { trackId, updates })
              projectManager.updateTrack(trackId, updates)
            },
            deleteTrack: async ({ trackId }) => {
              console.log('AI Agent Callback: deleteTrack', { trackId })
              projectManager.removeTrack(trackId)
            },

            // MIDIノート操作
            addMidiNotes: async (params) => {
              console.log('AI Agent Callback: addMidiNotes', params)

              // ノートを追加（isPendingフラグ付き）
              const notesWithPending = params.notes.map(note => ({
                ...note,
                isPending: true
              }))

              const result = projectManager.addMidiNotes({
                ...params,
                notes: notesWithPending
              })

              console.log('AI Agent: addMidiNotes result:', result)
              console.log('AI Agent: Track after adding notes:', projectManager.currentProject?.tracks.find(t => t.id === params.trackId)?.midiData?.notes?.length)

              // 各ノートを承認待ちリストに追加（重要: autoApproveが機能するために必須）
              if (result && window.aiAgentEngine && params.notes) {
                params.notes.forEach(note => {
                  const noteWithPending = { ...note, isPending: true }
                  window.aiAgentEngine.addPendingNoteChange(
                    note.id,
                    params.trackId,
                    null, // originalNote
                    noteWithPending, // newNote
                    'add' // type
                  )
                })
                console.log('✅ AI Agent: Added notes to pending changes list')
              }

              // UIの強制更新をトリガー
              if (result && window) {
                window.dispatchEvent(new CustomEvent('aiAgentMidiDataChanged', {
                  detail: { trackId: params.trackId, action: 'add', noteCount: params.notes?.length || 0 }
                }))
                console.log('✅ AI Agent: Dispatched aiAgentMidiDataChanged event for addMidiNotes')

                // 追加のイベント発火（MIDIエディタの再描画を確実にする）
                window.dispatchEvent(new CustomEvent('forceTrackUpdate', {
                  detail: { trackId: params.trackId }
                }))
              }

              return result
            },
            updateMidiNotes: async (params) => {
              console.log('AI Agent Callback: updateMidiNotes', params)
              const result = projectManager.updateMidiNotes(params)

              // UIの強制更新をトリガー
              if (result && window) {
                window.dispatchEvent(new CustomEvent('aiAgentMidiDataChanged', {
                  detail: { trackId: params.trackId, action: 'update', noteCount: params.notes?.length || 0 }
                }))
                console.log('✅ AI Agent: Dispatched aiAgentMidiDataChanged event for updateMidiNotes')
              }

              return result
            },
            deleteMidiNotes: async (params) => {
              console.log('AI Agent Callback: deleteMidiNotes', params)
              const result = projectManager.deleteMidiNotes(params)

              // UIの強制更新をトリガー
              if (result && window) {
                window.dispatchEvent(new CustomEvent('aiAgentMidiDataChanged', {
                  detail: { trackId: params.trackId, action: 'delete', noteCount: params.noteIds?.length || 0 }
                }))
                console.log('✅ AI Agent: Dispatched aiAgentMidiDataChanged event for deleteMidiNotes')
              }

              return result
            },
            approveMidiNotes: async (params) => {
              console.log('AI Agent Callback: approveMidiNotes', params)
              const result = projectManager.approveMidiNotes(params)

              // UIの強制更新をトリガー（approveMidiNotesは既にmidiDataApprovedイベントを発火）
              if (result && window) {
                window.dispatchEvent(new CustomEvent('aiAgentMidiDataChanged', {
                  detail: { trackId: params.trackId, action: 'approve', noteCount: params.notes?.length || 0 }
                }))
                console.log('✅ AI Agent: Dispatched aiAgentMidiDataChanged event for approveMidiNotes')
              }

              return result
            },
            rejectMidiNotes: async (params) => {
              console.log('AI Agent Callback: rejectMidiNotes', params)
              const result = projectManager.rejectMidiNotes(params)

              // UIの強制更新をトリガー
              if (result && window) {
                window.dispatchEvent(new CustomEvent('aiAgentMidiDataChanged', {
                  detail: { trackId: params.trackId, action: 'reject', noteCount: params.noteIds?.length || 0 }
                }))
                console.log('✅ AI Agent: Dispatched aiAgentMidiDataChanged event for rejectMidiNotes')
              }

              return result
            },

            // プロジェクト設定
            updateProjectSettings: async (params) => {
              console.log('AI Agent Callback: updateProjectSettings', params)
              Object.assign(projectManager.currentProject.settings, params)
            }
          })

          console.log('✅ AI Agent Engine callbacks registered successfully')
        } else {
          console.warn('⚠️ AI Agent Engine or ProjectManager not available for callback registration')
        }

        setEnginesInitialized(true)
        console.log('✅ All engines initialized successfully')
      } catch (error) {
        console.error('❌ Engine initialization error:', error)
        setEngineError(error)
      }
    }

    // エンジンの初期化を実行
    initializeEngines()
  }, [projectManager])

  return {
    enginesInitialized,
    engineError
  }
}

/**
 * 音声システム初期化フック
 */
export const useAudioSystemInitialization = () => {
  const [audioSystemInitialized, setAudioSystemInitialized] = useState(false)
  const [audioSystemError, setAudioSystemError] = useState(null)

  useEffect(() => {
    const initializeAudioSystems = async () => {
      try {
        console.log('🎵 音声システムを初期化中...')

        // 統一された音声システムを初期化
        if (window.unifiedAudioSystem) {
          if (!window.unifiedAudioSystem.isInitialized) {
            await window.unifiedAudioSystem.initialize()
            console.log('✅ 統一音声システム初期化完了')
          }
        } else {
          console.warn('⚠️ 統一音声システムが見つかりません')
        }

        setAudioSystemInitialized(true)
        console.log('✅ 音声システム初期化完了')
      } catch (error) {
        console.error('❌ 音声システム初期化エラー:', error)
        setAudioSystemError(error)
      }
    }

    initializeAudioSystems()
  }, [])

  return {
    audioSystemInitialized,
    audioSystemError
  }
}

/**
 * テスト機能セットアップフック
 */
export const useTestSetup = () => {
  const [testSetupComplete, setTestSetupComplete] = useState(false)

  useEffect(() => {
    try {
      // ピアノテスト機能をセットアップ
      setupPianoTest()
      console.log('✅ Piano test setup completed')

      // ドラムテスト機能をセットアップ
      setupDrumTest()
      console.log('✅ Drum test setup completed')

      setTestSetupComplete(true)
      console.log('✅ All test setups completed')
    } catch (error) {
      console.error('❌ Test setup error:', error)
    }
  }, [])

  return { testSetupComplete }
}

/**
 * 包括的システム初期化フック
 * すべての初期化プロセスを統合管理
 */
export const useSystemInitialization = (projectManager) => {
  const { managersInitialized, initializationError } = useManagerInitialization()
  const { enginesInitialized, engineError } = useEngineInitialization(projectManager)
  const { audioSystemInitialized, audioSystemError } = useAudioSystemInitialization()
  const { testSetupComplete } = useTestSetup()

  // 全体の初期化状態
  const isFullyInitialized = managersInitialized &&
                            enginesInitialized &&
                            audioSystemInitialized &&
                            testSetupComplete

  // エラーの統合
  const initializationErrors = [
    initializationError,
    engineError,
    audioSystemError
  ].filter(Boolean)

  useEffect(() => {
    if (isFullyInitialized) {
      console.log('🎉 システム全体の初期化が完了しました')
    }
  }, [isFullyInitialized])

  useEffect(() => {
    if (initializationErrors.length > 0) {
      console.error('❌ 初期化中にエラーが発生しました:', initializationErrors)
    }
  }, [initializationErrors])

  return {
    isFullyInitialized,
    managersInitialized,
    enginesInitialized,
    audioSystemInitialized,
    testSetupComplete,
    initializationErrors,
    hasErrors: initializationErrors.length > 0
  }
}

/**
 * 設定読み込みフック
 */
export const useSettingsLoader = () => {
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    const loadAllSettings = () => {
      try {
        // AI Assistant設定の読み込み
        const savedAiSettings = localStorage.getItem('dawai_ai_settings')

        if (savedAiSettings) {
          const aiSettings = JSON.parse(savedAiSettings)
          console.log('📝 AI設定を読み込みました:', aiSettings)
        }

        // その他の設定読み込み処理
        console.log('📝 設定読み込み処理完了')
        setSettingsLoaded(true)
      } catch (error) {
        console.error('❌ 設定読み込みエラー:', error)
      }
    }

    loadAllSettings()
  }, [])

  return { settingsLoaded }
}

export default useSystemInitialization