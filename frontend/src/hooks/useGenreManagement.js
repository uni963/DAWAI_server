import { useCallback } from 'react'
import { TAB_TYPES } from '../constants/trackTypes.js'
import { createTab } from '../factories/projectFactory.js'
import { MUSIC_GENRES } from '../utils/musicTheory/MusicTheorySystem.js'
import smartSuggestionEngine from '../engines/SmartSuggestionEngine.js'
import demoSongManager from '../managers/DemoSongManager.js'

/**
 * useGenreManagement
 *
 * ジャンル管理とDemo Song機能を提供するカスタムフック
 * - ジャンル選択処理
 * - Demo Song読み込み処理
 * - スケール制約・音楽理論設定自動化
 * - タブ自動作成機能
 *
 * @param {Object} dependencies - 依存関係オブジェクト
 * @param {Object} dependencies.projectManager - プロジェクトマネージャーインスタンス
 * @param {Object} dependencies.eventHandlersManager - イベントハンドラーマネージャーインスタンス
 * @param {Function} dependencies.setGenreContext - ジャンルコンテキスト設定関数
 * @param {Function} dependencies.setDemoSongMetadata - Demo Songメタデータ設定関数
 * @param {Function} dependencies.setMusicTheorySettings - 音楽理論設定関数
 * @param {Function} dependencies.setGlobalAISettings - グローバルAI設定関数
 * @param {Function} dependencies.setShowGenreSelector - ジャンル選択器表示制御関数
 *
 * @returns {Object} ジャンル管理関数群
 */
export const useGenreManagement = (dependencies) => {
  const {
    projectManager,
    eventHandlersManager,
    setGenreContext,
    setDemoSongMetadata,
    setMusicTheorySettings,
    setGlobalAISettings,
    setShowGenreSelector
  } = dependencies

  /**
   * ジャンル選択ハンドラー
   *
   * ジャンルコンテキストの設定とスマートサジェスチョンエンジンの更新
   */
  const handleGenreSelect = useCallback(async (genre, genreContext) => {
    try {
      console.log('🎵 ジャンル選択開始:', genre.name.ja)

      // ProjectManagerにジャンルコンテキストを設定
      projectManager.setGenreContext(genreContext)

      // スマートサジェスチョンエンジンにジャンルコンテキストを通知
      if (smartSuggestionEngine && typeof smartSuggestionEngine.updateGenreContext === 'function') {
        await smartSuggestionEngine.updateGenreContext(genreContext)
        console.log('✅ スマートサジェスチョンエンジン更新完了')
      }

      // 状態を更新
      setGenreContext(genreContext)
      eventHandlersManager.updateProjectState()

      console.log('✅ ジャンルコンテキスト設定完了:', genre.name.ja)
    } catch (error) {
      console.error('❌ ジャンル選択エラー:', error)
      throw error
    }
  }, [projectManager, eventHandlersManager, setGenreContext])

  /**
   * Demo Song読み込みハンドラー
   *
   * Demo Songのプロジェクトへの読み込みと関連設定の自動化
   */
  const handleDemoSongLoad = useCallback(async (demoSong) => {
    try {
      console.log('📼 Demo Song読み込み開始:', demoSong.metadata.title.ja)

      // DemoSongManagerを使ってプロジェクトに読み込み
      await demoSongManager.loadDemoSongToProject(demoSong.id, projectManager)

      // Demo Song読み込み後のタブ作成処理
      await createDemoSongTabs()

      // ジャンルコンテキストと Demo Song メタデータを更新
      setGenreContext(projectManager.getGenreContext())
      setDemoSongMetadata(projectManager.getDemoSongMetadata())

      // スケール制約とジャンル自動設定
      await applyMusicTheoryAutoSettings(demoSong)

      // AI設定自動適用
      await applyAIAutoSettings(demoSong)

      // アクティブタブをArrangementに戻す（updateProjectState前に設定）
      projectManager.setActiveTab('arrangement')
      console.log('🔧 アクティブタブをArrangementに設定')

      // 🔥 FIX: activeTabをReact状態に明示的に同期
      // updateProjectState()では無限ループ防止のためactiveTab同期がコメントアウトされているため、
      // Demo Song読み込み後は明示的にReact状態を同期する必要がある
      eventHandlersManager.setActiveTab('arrangement')
      console.log('🔄 React状態にactiveTab同期: arrangement')

      // プロジェクト状態を更新（アクティブタブ設定後）
      eventHandlersManager.updateProjectState()

      console.log('✅ Demo Song読み込み完了:', demoSong.metadata.title.ja)
    } catch (error) {
      console.error('❌ Demo Song読み込みエラー:', error)
      throw error
    } finally {
      // 成功・失敗に関わらず、必ずモーダルを閉じる
      setShowGenreSelector(false)
    }
  }, [projectManager, eventHandlersManager])
  // ✅ 修正: setState関数は安定した参照を持つため依存配列から削除

  /**
   * Demo Song読み込み後のタブ作成処理
   *
   * 読み込まれたトラックに対応するタブを自動作成
   */
  const createDemoSongTabs = useCallback(async () => {
    const currentProject = projectManager.getCurrentProject()
    if (currentProject && currentProject.tracks) {
      console.log('🎯 Demo Song読み込み後のタブ作成開始:', currentProject.tracks.length, 'トラック検出')

      // 読み込まれたトラックに対してタブを作成
      currentProject.tracks.forEach(track => {
        // すでにタブが存在するかチェック
        const tabExists = currentProject.tabs.some(tab => tab.trackId === track.id)
        if (!tabExists) {
          const { tabType, tabTitle } = determineTabType(track)

          // タブを作成して追加 - ProjectManagerの標準形式に合わせる
          const newTab = createTab(
            `tab-${track.id}`,
            tabTitle,
            tabType,
            track.id
          )

          currentProject.tabs.push(newTab)
          console.log(`✅ Demo Songトラック用タブ作成: ${tabTitle} (${track.type}/${track.subtype})`)
        }
      })

      // React状態にタブを手動更新
      eventHandlersManager.setTabs(currentProject.tabs)
      console.log('🎵 React状態にタブを手動更新:', currentProject.tabs.length, 'タブ')

      // タブ作成完了後、プロジェクトを保存
      projectManager.saveToLocalStorage()
      console.log('🎵 Demo Songタブ作成完了:', currentProject.tabs.length, 'タブ')
    }
  }, [projectManager, eventHandlersManager])

  /**
   * トラックタイプに応じたタブタイプの決定
   *
   * トラックの種類に基づいて適切なタブタイプとタイトルを決定
   */
  const determineTabType = useCallback((track) => {
    let tabType, tabTitle

    // トラックタイプに応じてタブタイプを決定（統一タイプ対応）
    if (track.type === 'voiceSynth' || track.subtype === 'diffsinger') {
      // 歌声合成トラック
      tabType = TAB_TYPES.DIFFSINGER_TRACK
      tabTitle = track.displayName || track.name || '歌声合成トラック'
    } else if (track.type === 'instrument' && track.subtype === 'drums') {
      // ドラムトラック（統一システムでは instrument/drums）
      tabType = TAB_TYPES.DRUM_TRACK
      tabTitle = track.displayName || track.name || 'Drums Track'
    } else if (track.type === 'instrument') {
      // その他の楽器トラック（Piano Track, Bass Track, Synth Track）
      tabType = TAB_TYPES.MIDI_EDITOR
      tabTitle = track.displayName || track.name || `${track.subtype} Track`
    } else {
      // デフォルトはMIDIエディタ
      tabType = TAB_TYPES.MIDI_EDITOR
      tabTitle = track.displayName || track.name || 'MIDI Track'
    }

    return { tabType, tabTitle }
  }, [])

  /**
   * 音楽理論設定の自動適用
   *
   * Demo Songの情報に基づいてスケール制約とジャンル設定を自動化
   */
  const applyMusicTheoryAutoSettings = useCallback(async (demoSong) => {
    console.log('🎼 ========================================')
    console.log('🎼 [START] applyMusicTheoryAutoSettings')
    console.log('🎼 ========================================')

    // Demo Songのジャンル情報を取得
    const demoSongGenreId = demoSong.genreId
    const demoSongRootNote = demoSong.structure?.key?.root || 'C'
    const demoSongScale = demoSong.structure?.key?.quality || 'major'

    console.log('🎼 Demo Song情報:', {
      タイトル: demoSong.metadata?.title?.ja,
      ジャンル: demoSongGenreId,
      ルートノート: demoSongRootNote,
      スケール: demoSongScale
    })

    // 🔥 FIX: ジャンルID正規化 - 大文字・小文字の不一致を解消
    // Demo Songでは小文字 ('rock'), MUSIC_GENRESでは大文字 ('ROCK') の可能性があるため、
    // 両方のパターンを試す
    let genreDefinition = MUSIC_GENRES[demoSongGenreId]
    let normalizedGenreId = demoSongGenreId

    if (!genreDefinition) {
      normalizedGenreId = demoSongGenreId.toUpperCase()
      genreDefinition = MUSIC_GENRES[normalizedGenreId]
      console.log('🔧 ジャンルID正規化:', demoSongGenreId, '→', normalizedGenreId)
    }

    if (!genreDefinition) {
      console.error('❌ ジャンル定義が見つかりません:', demoSongGenreId)
      console.error('利用可能なジャンル:', Object.keys(MUSIC_GENRES))
      return
    }

    console.log('🎵 ジャンル定義:', {
      名前: genreDefinition.name,
      推奨スケール: genreDefinition.recommendedScales
    })

    // スケール制約を自動でONにする
    setMusicTheorySettings(prev => {
      console.log('🔧 [BEFORE] 現在の音楽理論設定:', prev)

      const newSettings = {
        ...prev,
        scaleConstraintEnabled: true,  // ⭐ スケール制約をON
        selectedGenre: normalizedGenreId,  // ⭐ ジャンルを自動選択（正規化済み）
        rootNote: demoSongRootNote,  // ⭐ ルートノートを自動設定
        selectedScale: demoSongScale  // ⭐ スケールを自動設定
      }

      // ジャンルの推奨スケールを自動選択（優先適用）
      // 注意: Demo Song個別のスケール設定は行わず、ジャンル推奨スケールを優先する
      if (genreDefinition && genreDefinition.recommendedScales) {
        const recommendedScales = genreDefinition.recommendedScales.slice(0, 2)
        newSettings.selectedScales = recommendedScales
        console.log('🎵 推奨スケール自動選択:', recommendedScales)
      } else {
        console.warn('⚠️ 推奨スケールが定義されていません')
        newSettings.selectedScales = []
      }

      console.log('🔧 [AFTER] 新しい音楽理論設定:', newSettings)

      // 各トラックに音色設定を適用
      console.log('📝 トラックへの音色設定適用を開始...')

      // Demo Song用AI設定（Magentaを強制）
      const demoSongAISettings = {
        aiModel: 'magenta',
        ghostTextEnabled: false,
        predictionSettings: {
          autoPredict: true,
          predictionDelay: 100,
          ghostNoteOpacity: 0.5
        }
      }

      applyInstrumentSettingsToTracks(newSettings, demoSongAISettings)

      return newSettings
    })

    console.log('🎼 ========================================')
    console.log('🎼 [END] applyMusicTheoryAutoSettings')
    console.log('🎼 ========================================')
  }, [setMusicTheorySettings])

  /**
   * AI設定の自動適用
   *
   * Demo Songの情報に基づいてAIモデルとpredictionSettingsを自動化
   * ⭐ Piano Track MIDIエディタービュー用：デフォルトは必ずMagentaに設定
   */
  const applyAIAutoSettings = useCallback(async (demoSong) => {
    const genreId = demoSong.genreId
    const genre = MUSIC_GENRES[genreId]

    // 🔧 FIX: Demo Song読み込み時は必ずMagentaをデフォルトに設定
    const defaultAIModel = 'magenta'

    console.log('🤖 AI設定自動適用開始:', {
      ジャンル: genreId,
      デフォルトAIモデル: defaultAIModel,
      推奨GhostText: genre?.recommendedAI?.ghostText || 'N/A',
      推奨ChatAI: genre?.recommendedAI?.chatAssistant || 'N/A',
      理由: genre?.recommendedAI?.reason || 'Demo Song読み込み時のデフォルト設定'
    })

    // globalAISettingsを更新
    setGlobalAISettings(prev => {
      const newSettings = {
        ...prev,
        aiModel: defaultAIModel,  // 🔧 FIX: 必ずMagentaに設定
        ghostTextEnabled: false,  // Ghost Textはデフォルトで無効
        predictionSettings: {
          ...prev.predictionSettings,
          scale: demoSong.structure?.key?.scale || 'major',
          rootNote: demoSong.structure?.key?.root || 'C',
          genre: genreId
        }
      }

      console.log('✅ AI設定自動適用完了:', {
        AIモデル: newSettings.aiModel,
        GhostText有効: newSettings.ghostTextEnabled,
        predictionSettings: newSettings.predictionSettings
      })

      // 🔥 [CRITICAL FIX] MIDIエディタービュー向けに強制同期
      // Demo Song読み込み後、各トラックのlocalStorageにも即座に反映
      setTimeout(() => {
        console.log('🔥 [CRITICAL FIX] Demo Song AI設定をlocalStorageに即座反映')
        const currentProject = projectManager.getCurrentProject()
        if (currentProject && currentProject.tracks) {
          currentProject.tracks.forEach(track => {
            const key = `instrument-settings-${track.id}`
            const existingData = localStorage.getItem(key)
            if (existingData) {
              try {
                const parsed = JSON.parse(existingData)
                parsed.aiSettings = {
                  aiModel: newSettings.aiModel,
                  ghostTextEnabled: newSettings.ghostTextEnabled,
                  predictionSettings: newSettings.predictionSettings
                }
                localStorage.setItem(key, JSON.stringify(parsed))
                console.log(`✅ トラック ${track.id} のAI設定をlocalStorageに反映`)
              } catch (error) {
                console.error(`❌ トラック ${track.id} のlocalStorage更新エラー:`, error)
              }
            }
          })
        }
      }, 100) // 100ms遅延で確実に反映

      return newSettings
    })

    console.log('🤖 AI設定完了 - デフォルトAIモデル:', defaultAIModel)
  }, [setGlobalAISettings])

  /**
   * トラックへの音色設定適用
   *
   * Demo Song読み込み時に各トラックのlocalStorageに音楽理論設定とAI設定を保存
   */
  const applyInstrumentSettingsToTracks = useCallback((musicTheorySettings, aiSettings = null) => {
    console.log('🎨 ========================================')
    console.log('🎨 [START] applyInstrumentSettingsToTracks')
    console.log('🎨 適用する音楽理論設定:', musicTheorySettings)
    console.log('🎨 適用するAI設定:', aiSettings)

    const currentProject = projectManager.getCurrentProject()
    if (!currentProject || !currentProject.tracks) {
      console.warn('⚠️ プロジェクトまたはトラックが存在しません')
      return
    }

    console.log('🎨 対象トラック数:', currentProject.tracks.length)

    currentProject.tracks.forEach((track, index) => {
      const key = `instrument-settings-${track.id}`
      const existingData = localStorage.getItem(key)

      console.log(`📝 トラック${index + 1}/${currentProject.tracks.length}: ${track.displayName || track.name} (ID: ${track.id})`)

      let instrumentData = {
        instrument: track.subtype || 'piano',
        settings: {},
        musicTheorySettings: musicTheorySettings,
        aiSettings: aiSettings || {
          aiModel: 'magenta',
          ghostTextEnabled: false,
          predictionSettings: {
            autoPredict: true,
            predictionDelay: 100,
            ghostNoteOpacity: 0.5
          }
        },
        timestamp: Date.now()
      }

      // 既存データがあればマージ
      if (existingData) {
        try {
          const parsed = JSON.parse(existingData)
          console.log('  📂 既存データ検出、マージします:', {
            instrument: parsed.instrument,
            hasSettings: !!parsed.settings,
            hasMusicTheory: !!parsed.musicTheorySettings,
            hasAI: !!parsed.aiSettings
          })
          instrumentData = {
            ...parsed,
            musicTheorySettings: musicTheorySettings,
            aiSettings: aiSettings || parsed.aiSettings || instrumentData.aiSettings,
            timestamp: Date.now()
          }
        } catch (error) {
          console.error('  ❌ 既存設定のパースエラー:', error)
        }
      } else {
        console.log('  📄 既存データなし、新規作成')
      }

      // localStorage保存
      localStorage.setItem(key, JSON.stringify(instrumentData))
      console.log(`  ✅ localStorage保存完了: ${key}`)
      console.log('  📊 保存データ:', {
        instrument: instrumentData.instrument,
        musicTheorySettings: instrumentData.musicTheorySettings,
        aiSettings: instrumentData.aiSettings
      })
    })

    console.log('🎨 ========================================')
    console.log('🎨 [END] applyInstrumentSettingsToTracks')
    console.log('🎨 ========================================')
  }, [projectManager])

  /**
   * ジャンル情報の検証
   *
   * 指定されたジャンルIDが有効かチェック
   */
  const validateGenre = useCallback((genreId) => {
    return genreId && MUSIC_GENRES[genreId]
  }, [])

  /**
   * 現在のジャンルコンテキスト取得
   *
   * プロジェクトマネージャーから現在のジャンルコンテキストを取得
   */
  const getCurrentGenreContext = useCallback(() => {
    return projectManager.getGenreContext()
  }, [projectManager])

  /**
   * 現在のDemo Songメタデータ取得
   *
   * プロジェクトマネージャーから現在のDemo Songメタデータを取得
   */
  const getCurrentDemoSongMetadata = useCallback(() => {
    return projectManager.getDemoSongMetadata()
  }, [projectManager])

  // デバッグ用のジャンル状態ログ出力
  const logGenreState = useCallback(() => {
    const genreContext = projectManager.getGenreContext()
    const demoSongMetadata = projectManager.getDemoSongMetadata()

    console.log('📊 ジャンル管理状態:', {
      hasGenreContext: !!genreContext,
      currentGenre: genreContext?.genre?.name?.ja,
      hasDemoSong: !!demoSongMetadata,
      currentDemoSong: demoSongMetadata?.title?.ja
    })
  }, [projectManager])

  return {
    // メイン機能
    handleGenreSelect,
    handleDemoSongLoad,

    // サブ機能
    createDemoSongTabs,
    applyMusicTheoryAutoSettings,
    applyAIAutoSettings,
    applyInstrumentSettingsToTracks,
    determineTabType,

    // ユーティリティ機能
    validateGenre,
    getCurrentGenreContext,
    getCurrentDemoSongMetadata,

    // デバッグ機能
    logGenreState
  }
}

export default useGenreManagement