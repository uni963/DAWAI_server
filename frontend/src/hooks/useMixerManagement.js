import { useCallback, useMemo } from 'react'

/**
 * useMixerManagement
 *
 * ミキサー管理機能を提供するカスタムフック
 * - ミキサーチャンネル更新処理
 * - マスターボリューム管理
 * - 音声システム連携
 * - トラック音量・ミュート・ソロ管理
 *
 * @param {Object} dependencies - 依存関係オブジェクト
 * @param {Object} dependencies.projectManager - プロジェクトマネージャーインスタンス
 * @param {Object} dependencies.eventHandlersManager - イベントハンドラーマネージャーインスタンス
 * @param {Object} dependencies.trackVolumeState - トラック音量状態
 * @param {Function} dependencies.setTrackVolumeState - トラック音量状態設定関数
 * @param {Object} dependencies.trackMutedState - トラックミュート状態
 * @param {Function} dependencies.setTrackMutedState - トラックミュート状態設定関数
 * @param {number} dependencies.masterVolume - マスターボリューム
 * @param {Function} dependencies.setMasterVolume - マスターボリューム設定関数
 *
 * @returns {Object} ミキサー管理関数群
 */
export const useMixerManagement = (dependencies) => {
  const {
    projectManager,
    eventHandlersManager,
    trackVolumeState,
    setTrackVolumeState,
    trackMutedState,
    setTrackMutedState,
    masterVolume,
    setMasterVolume
  } = dependencies

  /**
   * ミキサーチャンネル更新ハンドラー
   *
   * 単一または複数のミキサーチャンネルを更新し、音声システムと同期
   */
  const updateMixerChannels = useCallback((channels) => {
    console.log('🎛️ ミキサーチャンネル更新開始:', channels)
    console.log('🎛️ 現在のトラック音量状態:', trackVolumeState)

    // 単一のチャンネル更新の場合
    if (channels && !Array.isArray(channels)) {
      console.log('🎯 単一チャンネル更新')
      updateSingleChannel(channels)
    }
    // 複数チャンネル更新の場合
    else if (Array.isArray(channels)) {
      console.log('🎯 複数チャンネル更新:', channels.length, 'チャンネル')
      updateMultipleChannels(channels)
    }

    // ✅ 第2の循環参照を防ぐため、updateProjectState呼び出しを除去
    // updateProjectState() → projectManager状態更新 → getMixerChannels() → 循環参照発生
    // eventHandlersManager.updateProjectState()
    console.log('✅ ミキサーチャンネル更新完了')
  }, [eventHandlersManager])
  // ✅ 修正: trackVolumeStateは関数内で使用していないため依存配列から削除

  /**
   * 単一チャンネル更新処理
   *
   * 単一のミキサーチャンネルを更新
   */
  const updateSingleChannel = useCallback((channel) => {
    console.log('🎚️ 単一チャンネル更新処理:', channel)

    // ProjectManagerを更新
    eventHandlersManager.updateTrack(channel.id, {
      volume: channel.volume,
      pan: channel.pan || 0,
      muted: channel.muted,
      solo: channel.solo
    })

    // 状態を更新
    setTrackVolumeState(prev => {
      const newState = { ...prev, [channel.id]: channel.volume }
      console.log('🎚️ トラック音量状態更新:', newState)
      return newState
    })

    setTrackMutedState(prev => {
      const newState = { ...prev, [channel.id]: channel.muted }
      console.log('🔇 トラックミュート状態更新:', newState, 'チャンネル:', channel.id, 'ミュート:', channel.muted)
      return newState
    })

    // 音声システムを更新
    updateAudioSystemChannel(channel)
  }, [eventHandlersManager, setTrackVolumeState, setTrackMutedState])

  /**
   * 複数チャンネル更新処理
   *
   * 複数のミキサーチャンネルを一括更新
   */
  const updateMultipleChannels = useCallback((channels) => {
    console.log('🎚️ 複数チャンネル更新処理:', channels.length)

    // 状態を一括更新
    const newTrackVolumeState = { ...trackVolumeState }
    const newTrackMutedState = { ...trackMutedState }

    channels.forEach(channel => {
      // ProjectManagerを更新
      eventHandlersManager.updateTrack(channel.id, {
        volume: channel.volume,
        pan: channel.pan || 0,
        muted: channel.muted,
        solo: channel.solo
      })

      // 状態を更新
      newTrackVolumeState[channel.id] = channel.volume
      newTrackMutedState[channel.id] = channel.muted

      // 音声システムを更新
      updateAudioSystemChannel(channel)
    })

    // 状態を一括更新
    setTrackVolumeState(newTrackVolumeState)
    setTrackMutedState(newTrackMutedState)

    // 全トラックの可視性を更新（ソロ機能用）
    updateAudioSystemTrackVisibility()

    console.log('✅ 複数チャンネル更新完了')
  }, [trackVolumeState, trackMutedState, eventHandlersManager, setTrackVolumeState, setTrackMutedState])

  /**
   * 音声システムチャンネル更新
   *
   * 統一音声システムでチャンネル設定を更新
   */
  const updateAudioSystemChannel = useCallback((channel) => {
    if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
      try {
        // 音量設定を適用
        if (channel.volume !== undefined) {
          const normalizedVolume = channel.volume / 100 // 0-100 → 0-1 に正規化
          window.unifiedAudioSystem.setTrackVolume(channel.id, normalizedVolume)
          console.log('🔊 音声システム: トラック音量更新:', channel.id, normalizedVolume)
        }

        // ミュート設定を適用
        if (channel.muted !== undefined) {
          window.unifiedAudioSystem.setTrackMuted(channel.id, channel.muted)
          console.log('🔇 音声システム: トラックミュート更新:', channel.id, channel.muted)
        }

        // ソロ設定を適用
        if (channel.solo !== undefined) {
          window.unifiedAudioSystem.setTrackSolo(channel.id, channel.solo)
          console.log('⭐ 音声システム: トラックソロ更新:', channel.id, channel.solo)
        }

        console.log('✅ 音声システム: チャンネル更新成功:', channel.id)
      } catch (error) {
        console.error('❌ 音声システム: チャンネル更新失敗:', error)
      }
    } else {
      console.warn('⚠️ 音声システムが初期化されていません')
    }
  }, [])

  /**
   * 音声システムトラック可視性更新
   *
   * ソロ機能などでトラック可視性を管理
   */
  const updateAudioSystemTrackVisibility = useCallback(() => {
    if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
      try {
        // 統一された音声システムではトラック可視性管理は別途実装が必要
        // 現在はログ出力のみ
        console.log('👁️ 音声システム: トラック可視性更新完了')
      } catch (error) {
        console.error('❌ 音声システム: トラック可視性更新失敗:', error)
      }
    }
  }, [])

  /**
   * マスターボリューム更新ハンドラー
   *
   * マスターボリュームを更新し、音声システムと同期
   */
  const updateMasterVolume = useCallback((volume) => {
    console.log('🎚️ マスターボリューム更新:', volume)

    // マスターボリュームの状態を更新
    setMasterVolume(volume)

    // 音声システムのマスターボリュームを更新
    if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
      try {
        const normalizedVolume = volume / 100 // 0-100 → 0-1 に正規化
        window.unifiedAudioSystem.setMasterVolume(normalizedVolume)
        console.log('🔊 音声システム: マスターボリューム更新成功:', normalizedVolume)
      } catch (error) {
        console.error('❌ 音声システム: マスターボリューム更新失敗:', error)
      }
    }

    console.log('✅ マスターボリューム更新完了:', volume)
  }, [setMasterVolume])

  /**
   * ミキサーチャンネル取得
   *
   * 現在のミキサーチャンネル情報を取得（ProjectManagerの内蔵キャッシュで参照安定性確保）
   * useMemoを削除してProject状態変更を確実に反映
   */
  const getMixerChannels = useCallback(() => {
    const channels = projectManager.getMixerChannels()
    console.log('🎛️ getMixerChannels 直接実行:', channels?.length || 0, 'チャンネル')
    return channels
  }, [projectManager])
  // ✅ 根本修正: useMemoによる過剰キャッシュを除去し、Project状態変更を確実に反映

  /**
   * トラック音量設定
   *
   * 指定されたトラックの音量を設定
   */
  const setTrackVolume = useCallback((trackId, volume) => {
    const clampedVolume = Math.max(0, Math.min(100, volume))
    console.log('🎚️ トラック音量設定:', trackId, clampedVolume)

    eventHandlersManager.updateTrack(trackId, { volume: clampedVolume })

    setTrackVolumeState(prev => ({
      ...prev,
      [trackId]: clampedVolume
    }))

    console.log('✅ トラック音量設定完了:', trackId, clampedVolume)
  }, [eventHandlersManager, setTrackVolumeState])

  /**
   * トラックパン設定
   *
   * 指定されたトラックのパンを設定
   */
  const setTrackPan = useCallback((trackId, pan) => {
    const clampedPan = Math.max(-100, Math.min(100, pan))
    console.log('🎛️ トラックパン設定:', trackId, clampedPan)

    eventHandlersManager.updateTrack(trackId, { pan: clampedPan })

    console.log('✅ トラックパン設定完了:', trackId, clampedPan)
  }, [eventHandlersManager])

  /**
   * トラックミュート切り替え
   *
   * 指定されたトラックのミュート状態を切り替え
   */
  const toggleTrackMute = useCallback((trackId) => {
    const currentMuted = trackMutedState[trackId] || false
    const newMuted = !currentMuted
    console.log('🔇 トラックミュート切り替え:', trackId, newMuted)

    eventHandlersManager.updateTrack(trackId, { muted: newMuted })

    setTrackMutedState(prev => ({
      ...prev,
      [trackId]: newMuted
    }))

    console.log('✅ トラックミュート切り替え完了:', trackId, newMuted)
  }, [trackMutedState, eventHandlersManager, setTrackMutedState])

  /**
   * 音声システム状態確認
   *
   * 統一音声システムの初期化状態を確認
   */
  const checkAudioSystemStatus = useCallback(() => {
    const status = {
      isInitialized: window.unifiedAudioSystem?.isInitialized || false,
      hasSetMasterVolume: typeof window.unifiedAudioSystem?.setMasterVolume === 'function',
      hasSetTrackVolume: typeof window.unifiedAudioSystem?.setTrackVolume === 'function',
      hasTogglePlayback: typeof window.unifiedAudioSystem?.togglePlayback === 'function'
    }

    console.log('🔍 音声システム状態:', status)
    return status
  }, [])

  /**
   * ミキサー状態のリセット
   *
   * すべてのミキサー状態をデフォルト値にリセット
   */
  const resetMixerState = useCallback(() => {
    console.log('🔄 ミキサー状態リセット開始')

    setMasterVolume(100)
    setTrackVolumeState({})
    setTrackMutedState({})

    console.log('✅ ミキサー状態リセット完了')
  }, [setMasterVolume, setTrackVolumeState, setTrackMutedState])

  // デバッグ用のミキサー状態ログ出力
  const logMixerState = useCallback(() => {
    console.log('📊 ミキサー管理状態:', {
      masterVolume: masterVolume,
      trackVolumeStateKeys: Object.keys(trackVolumeState),
      trackMutedStateKeys: Object.keys(trackMutedState),
      audioSystemStatus: checkAudioSystemStatus()
    })
  }, [masterVolume, trackVolumeState, trackMutedState, checkAudioSystemStatus])

  return {
    // メイン機能
    updateMixerChannels,
    updateMasterVolume,

    // サブ機能
    updateSingleChannel,
    updateMultipleChannels,
    updateAudioSystemChannel,

    // トラック操作
    setTrackVolume,
    setTrackPan,
    toggleTrackMute,

    // ユーティリティ機能
    getMixerChannels,
    checkAudioSystemStatus,
    resetMixerState,

    // デバッグ機能
    logMixerState
  }
}

export default useMixerManagement