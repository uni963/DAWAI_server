import { useCallback } from 'react'

/**
 * useTabManagement
 *
 * タブ管理機能を提供するカスタムフック
 * - タブ切り替え処理
 * - MIDIデータ検証と即座更新
 * - タブクローズ処理
 *
 * @param {Object} dependencies - 依存関係オブジェクト
 * @param {Object} dependencies.projectManager - プロジェクトマネージャーインスタンス
 * @param {Object} dependencies.eventHandlersManager - イベントハンドラーマネージャーインスタンス
 * @param {Array} dependencies.tabs - タブ配列
 * @param {Array} dependencies.tracks - トラック配列
 * @param {string} dependencies.activeTab - アクティブタブID
 * @param {Function} dependencies.setActiveTab - アクティブタブ設定関数
 * @param {number} dependencies.globalTempo - グローバルテンポ
 *
 * @returns {Object} タブ管理関数群
 */
export const useTabManagement = (dependencies) => {
  const {
    projectManager,
    eventHandlersManager,
    tabs,
    tracks,
    activeTab,
    setActiveTab,
    globalTempo
  } = dependencies

  /**
   * MIDIデータ検証と準備処理
   *
   * タブ切り替え後のMIDIデータ整合性を確保
   * 🔧 Fix #1: 条件付き実行 - 既に有効なMIDIデータがある場合はスキップ
   */
  const processMidiDataValidation = useCallback((tabId) => {
    if (tabId.startsWith('tab-')) {
      const currentTab = tabs.find(tab => tab.id === tabId)
      const currentTrack = tracks.find(track => track.id === currentTab?.trackId)

      if (currentTrack) {
        // ✅ MIDIデータが既に有効かチェック
        const needsValidation =
          !currentTrack.midiData ||
          !Array.isArray(currentTrack.midiData.notes) ||
          typeof currentTrack.midiData.tempo !== 'number'

        if (!needsValidation) {
          console.log('✅ MIDIデータ検証不要（既に有効）:', currentTrack.name)
          return // 早期リターン - 状態更新をスキップ
        }

        console.log('🎼 MIDIデータ検証開始:', currentTrack.name)

        // MIDIデータの即座検証と準備（ノート入力時と同じ処理）
        const validatedMidiData = {
          notes: Array.isArray(currentTrack.midiData?.notes) ? currentTrack.midiData.notes : [],
          tempo: typeof currentTrack.midiData?.tempo === 'number' ? currentTrack.midiData.tempo : globalTempo,
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
        eventHandlersManager.updateTrackMidiData(currentTrack.id, validatedMidiData)
        console.log('✅ MIDIデータ検証完了:', currentTrack.name)
      }
    }
  }, [tabs, tracks, globalTempo, eventHandlersManager])

  /**
   * タブ切り替えハンドラー
   *
   * 🔧 修正5: タブ切り替えの即座実行を復元
   * - MIDIデータ検証を同期実行（条件付き）
   * - setActiveTabを即座に実行してUI応答性を確保
   * - updateProjectStateで他の状態も同期（デバウンス適用）
   */
  const handleTabChange = useCallback((tabId) => {
    console.log('🔄 タブ切り替え開始:', tabId)

    // 1. MIDIデータ検証（条件付き - 修正1適用後）
    processMidiDataValidation(tabId)

    // 2. タブ切り替えと状態更新
    if (projectManager.setActiveTab(tabId)) {
      // ✅ 即座にタブ切り替えを反映（UI応答性確保）
      setActiveTab(tabId)
      // ✅ 他の状態もupdateProjectStateで同期（デバウンス適用）
      eventHandlersManager.updateProjectState()
      console.log('✅ タブ切り替え完了:', tabId)
    }
  }, [projectManager, eventHandlersManager, setActiveTab, processMidiDataValidation])
  // ✅ 修正: tabs, tracks, globalTempoは不要な依存関係のため削除
  // ✅ 修正: processMidiDataValidationを依存配列に追加（TDZ回避のため関数定義を先に移動）

  /**
   * タブクローズハンドラー
   *
   * タブを安全にクローズし、プロジェクト状態を更新
   */
  const closeTab = useCallback((tabId) => {
    console.log('❌ タブクローズ開始:', tabId)

    if (projectManager.closeTab(tabId)) {
      eventHandlersManager.updateProjectState()
      console.log('✅ タブクローズ完了:', tabId)
    }
  }, [projectManager, eventHandlersManager])

  /**
   * タブ存在確認
   *
   * 指定されたタブIDのタブが存在するかチェック
   */
  const tabExists = useCallback((tabId) => {
    return tabs.some(tab => tab.id === tabId)
  }, [tabs])

  /**
   * アクティブタブの詳細情報取得
   *
   * 現在アクティブなタブの詳細情報を取得
   */
  const getActiveTabDetails = useCallback(() => {
    const currentTab = tabs.find(tab => tab.id === activeTab)
    const currentTrack = tracks.find(track => track.id === currentTab?.trackId)

    return {
      tab: currentTab,
      track: currentTrack,
      isValid: !!(currentTab && currentTrack)
    }
  }, [tabs, tracks, activeTab])

  // デバッグ用のタブ状態ログ出力
  const logTabState = useCallback(() => {
    console.log('📊 タブ管理状態:', {
      totalTabs: tabs.length,
      activeTab: activeTab,
      tabIds: tabs.map(t => t.id),
      trackIds: tracks.map(t => t.id)
    })
  }, [tabs, tracks, activeTab])

  return {
    // メイン機能
    handleTabChange,
    closeTab,

    // ユーティリティ機能
    tabExists,
    getActiveTabDetails,
    processMidiDataValidation,

    // デバッグ機能
    logTabState
  }
}

export default useTabManagement