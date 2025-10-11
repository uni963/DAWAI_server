import { useCallback } from 'react'
import { TRACK_TYPES } from '../constants/trackTypes.js'

/**
 * useSuggestionManagement
 *
 * スマートサジェスチョン管理機能を提供するカスタムフック
 * - サジェスチョン採用処理
 * - サジェスチョン却下処理
 * - 学習機能サポート
 * - 複数サジェスチョンタイプ対応（note, chord, rhythm）
 *
 * @param {Object} dependencies - 依存関係オブジェクト
 * @param {Object} dependencies.eventHandlersManager - イベントハンドラーマネージャーインスタンス
 * @param {Array} dependencies.tabs - タブ配列
 * @param {Array} dependencies.tracks - トラック配列
 * @param {string} dependencies.activeTab - アクティブタブID
 *
 * @returns {Object} サジェスチョン管理関数群
 */
export const useSuggestionManagement = (dependencies) => {
  const {
    eventHandlersManager,
    tabs,
    tracks,
    activeTab
  } = dependencies

  /**
   * サジェスチョン採用ハンドラー
   *
   * スマートサジェスチョンを現在のトラックに適用
   * ノート、コード、リズムサジェスチョンに対応
   */
  const handleSuggestionAccept = useCallback(async (suggestion) => {
    try {
      console.log('💡 サジェスチョン採用開始:', suggestion)

      const currentTab = tabs.find(tab => tab.id === activeTab)
      const currentTrack = tracks.find(track => track.id === currentTab?.trackId)

      if (!currentTrack || !suggestion) {
        console.warn('⚠️ 現在のトラックまたはサジェスチョンが見つかりません')
        return
      }

      switch (suggestion.type) {
        case 'note':
          await applyNoteSuggestion(currentTrack, suggestion)
          break

        case 'chord':
          await applyChordSuggestion(currentTrack, suggestion)
          break

        case 'rhythm':
          await applyRhythmSuggestion(currentTrack, suggestion)
          break

        default:
          console.warn('⚠️ 未知のサジェスチョンタイプ:', suggestion.type)
      }

      console.log('✅ サジェスチョン適用完了:', suggestion.type)
    } catch (error) {
      console.error('❌ サジェスチョン適用エラー:', error)
      throw error
    }
  }, [activeTab, tabs, tracks, eventHandlersManager])

  /**
   * ノートサジェスチョンの適用
   *
   * MIDIノートサジェスチョンを現在のトラックに追加
   */
  const applyNoteSuggestion = useCallback(async (currentTrack, suggestion) => {
    console.log('🎵 ノートサジェスチョン適用:', suggestion)

    const newNote = {
      pitch: suggestion.pitch,
      time: suggestion.time || 0,
      duration: suggestion.duration || 0.5,
      velocity: suggestion.velocity || 80,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // ユニークID生成
    }

    const updatedNotes = [...(currentTrack.midiData?.notes || []), newNote]
    await eventHandlersManager.updateTrackMidiData(currentTrack.id, {
      ...currentTrack.midiData,
      notes: updatedNotes,
      lastModified: new Date().toISOString()
    })

    console.log('✅ ノート追加完了:', newNote)
  }, [eventHandlersManager])

  /**
   * コードサジェスチョンの適用
   *
   * コード進行サジェスチョンを現在のトラックに追加
   */
  const applyChordSuggestion = useCallback(async (currentTrack, suggestion) => {
    console.log('🎶 コードサジェスチョン適用:', suggestion)

    if (suggestion.notes && Array.isArray(suggestion.notes)) {
      const chordNotes = suggestion.notes.map((note, index) => ({
        ...note,
        time: suggestion.time || 0,
        velocity: suggestion.velocity || 80,
        id: `chord-note-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
      }))

      const updatedNotes = [...(currentTrack.midiData?.notes || []), ...chordNotes]
      await eventHandlersManager.updateTrackMidiData(currentTrack.id, {
        ...currentTrack.midiData,
        notes: updatedNotes,
        lastModified: new Date().toISOString()
      })

      console.log('✅ コード追加完了:', chordNotes.length, 'ノート')
    } else {
      console.warn('⚠️ 無効なコードサジェスチョン形式')
    }
  }, [eventHandlersManager])

  /**
   * リズムサジェスチョンの適用
   *
   * リズムパターンサジェスチョンをドラムトラックに適用
   */
  const applyRhythmSuggestion = useCallback(async (currentTrack, suggestion) => {
    console.log('🥁 リズムサジェスチョン適用:', suggestion)

    if (currentTrack.type === TRACK_TYPES.DRUMS && suggestion.pattern) {
      await eventHandlersManager.updateTrackDrumData(currentTrack.id, {
        ...currentTrack.drumData,
        pattern: suggestion.pattern,
        lastModified: new Date().toISOString()
      })

      console.log('✅ リズムパターン適用完了')
    } else {
      console.warn('⚠️ ドラムトラックではないか、無効なリズムパターン')
    }
  }, [eventHandlersManager])

  /**
   * サジェスチョン却下ハンドラー
   *
   * サジェスチョンを却下し、将来の学習機能のためにログを残す
   */
  const handleSuggestionReject = useCallback((suggestion) => {
    console.log('❌ サジェスチョン却下:', suggestion)

    // 将来の学習機能のためのデータ収集
    const rejectionData = {
      suggestion: suggestion,
      rejectedAt: new Date().toISOString(),
      activeTab: activeTab,
      contextInfo: {
        currentTrackType: (() => {
          const currentTab = tabs.find(tab => tab.id === activeTab)
          const currentTrack = tracks.find(track => track.id === currentTab?.trackId)
          return currentTrack?.type || 'unknown'
        })(),
        currentNoteCount: (() => {
          const currentTab = tabs.find(tab => tab.id === activeTab)
          const currentTrack = tracks.find(track => track.id === currentTab?.trackId)
          return currentTrack?.midiData?.notes?.length || 0
        })()
      }
    }

    // ローカルストレージに却下データを保存（学習機能用）
    try {
      const existingRejections = JSON.parse(localStorage.getItem('dawai_suggestion_rejections') || '[]')
      existingRejections.push(rejectionData)

      // 最大1000件まで保持
      if (existingRejections.length > 1000) {
        existingRejections.splice(0, existingRejections.length - 1000)
      }

      localStorage.setItem('dawai_suggestion_rejections', JSON.stringify(existingRejections))
      console.log('📊 却下データ保存完了（学習用）')
    } catch (error) {
      console.error('❌ 却下データ保存エラー:', error)
    }
  }, [activeTab, tabs, tracks])

  /**
   * サジェスチョンタイプの検証
   *
   * サジェスチョンが有効な形式かチェック
   */
  const validateSuggestion = useCallback((suggestion) => {
    if (!suggestion || typeof suggestion !== 'object') {
      return { valid: false, reason: 'サジェスチョンが無効です' }
    }

    if (!suggestion.type || !['note', 'chord', 'rhythm'].includes(suggestion.type)) {
      return { valid: false, reason: '未対応のサジェスチョンタイプです' }
    }

    switch (suggestion.type) {
      case 'note':
        if (typeof suggestion.pitch !== 'number') {
          return { valid: false, reason: 'ノートのピッチが無効です' }
        }
        break

      case 'chord':
        if (!Array.isArray(suggestion.notes) || suggestion.notes.length === 0) {
          return { valid: false, reason: 'コードのノート配列が無効です' }
        }
        break

      case 'rhythm':
        if (!suggestion.pattern) {
          return { valid: false, reason: 'リズムパターンが無効です' }
        }
        break
    }

    return { valid: true }
  }, [])

  /**
   * 現在のトラックコンテキスト取得
   *
   * サジェスチョン処理に必要な現在のトラック情報を取得
   */
  const getCurrentTrackContext = useCallback(() => {
    const currentTab = tabs.find(tab => tab.id === activeTab)
    const currentTrack = tracks.find(track => track.id === currentTab?.trackId)

    return {
      tab: currentTab,
      track: currentTrack,
      hasValidTrack: !!(currentTab && currentTrack),
      trackType: currentTrack?.type || null,
      noteCount: currentTrack?.midiData?.notes?.length || 0,
      lastModified: currentTrack?.midiData?.lastModified || null
    }
  }, [tabs, tracks, activeTab])

  /**
   * 却下データの統計取得
   *
   * 学習機能のための却下データ統計を取得
   */
  const getRejectionStats = useCallback(() => {
    try {
      const rejections = JSON.parse(localStorage.getItem('dawai_suggestion_rejections') || '[]')

      const stats = {
        totalRejections: rejections.length,
        byType: {
          note: rejections.filter(r => r.suggestion.type === 'note').length,
          chord: rejections.filter(r => r.suggestion.type === 'chord').length,
          rhythm: rejections.filter(r => r.suggestion.type === 'rhythm').length
        },
        recentRejections: rejections.slice(-10) // 最新10件
      }

      return stats
    } catch (error) {
      console.error('❌ 却下統計取得エラー:', error)
      return null
    }
  }, [])

  // デバッグ用のサジェスチョン状態ログ出力
  const logSuggestionState = useCallback(() => {
    const context = getCurrentTrackContext()
    const stats = getRejectionStats()

    console.log('📊 サジェスチョン管理状態:', {
      context: context,
      rejectionStats: stats
    })
  }, [getCurrentTrackContext, getRejectionStats])

  return {
    // メイン機能
    handleSuggestionAccept,
    handleSuggestionReject,

    // サブ機能
    applyNoteSuggestion,
    applyChordSuggestion,
    applyRhythmSuggestion,

    // ユーティリティ機能
    validateSuggestion,
    getCurrentTrackContext,
    getRejectionStats,

    // デバッグ機能
    logSuggestionState
  }
}

export default useSuggestionManagement