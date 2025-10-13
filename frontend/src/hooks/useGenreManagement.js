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
 * @param {Function} dependencies.setShowDemoSongBrowser - Demo Songブラウザ表示制御関数
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
    setShowDemoSongBrowser,
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

      // アクティブタブをArrangementに戻す（updateProjectState前に設定）
      projectManager.setActiveTab('arrangement')
      console.log('🔧 アクティブタブをArrangementに設定')

      // プロジェクト状態を更新（アクティブタブ設定後）
      eventHandlersManager.updateProjectState()

      console.log('✅ Demo Song読み込み完了:', demoSong.metadata.title.ja)
    } catch (error) {
      console.error('❌ Demo Song読み込みエラー:', error)
      throw error
    } finally {
      // 成功・失敗に関わらず、必ずモーダルを閉じる
      setShowDemoSongBrowser(false)
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
    // Demo Songのジャンル情報を取得
    const demoSongGenreId = demoSong.genreId
    const demoSongRootNote = demoSong.structure?.key?.root || 'C'

    console.log('🎼 自動音楽理論設定開始:', {
      ジャンル: demoSongGenreId,
      ルートノート: demoSongRootNote
    })

    // スケール制約を自動でONにする
    setMusicTheorySettings(prev => {
      const newSettings = {
        ...prev,
        scaleConstraintEnabled: true,  // ⭐ スケール制約をON
        selectedGenre: demoSongGenreId,  // ⭐ ジャンルを自動選択
        rootNote: demoSongRootNote  // ⭐ ルートノートを自動設定
      }

      // Demo Songのスケール情報を自動設定
      const demoSongScale = demoSong.structure?.key?.scale || 'major'
      newSettings.selectedScale = demoSongScale

      // そのジャンルの推奨スケールを自動選択
      if (demoSongGenreId && MUSIC_GENRES[demoSongGenreId]) {
        const recommendedScales = MUSIC_GENRES[demoSongGenreId].recommendedScales.slice(0, 2)
        newSettings.selectedScales = recommendedScales
        console.log('🎵 推奨スケール自動選択:', recommendedScales)
      }

      console.log('✅ 音楽理論設定完了:', newSettings)
      return newSettings
    })

    console.log('🎼 スケール制約: ON, ジャンル:', demoSongGenreId)
  }, [setMusicTheorySettings])

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