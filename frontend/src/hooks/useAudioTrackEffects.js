/**
 * 音声・トラック関連のカスタムフック
 * マスターボリューム、トラックボリューム初期化、音声システム連携を管理
 */

import { useEffect, useState } from 'react'

/**
 * マスターボリューム初期化フック
 */
export const useMasterVolumeInitialization = (masterVolume) => {
  const [masterVolumeInitialized, setMasterVolumeInitialized] = useState(false)

  useEffect(() => {
    if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
      try {
        // 統一された音声システムでマスターボリュームを設定
        window.unifiedAudioSystem.setMasterVolume(masterVolume)
        console.log('🔊 Audio system: Initial master volume set:', masterVolume)
        setMasterVolumeInitialized(true)
      } catch (error) {
        console.warn('⚠️ Failed to set initial master volume:', error)
      }
    }
  }, [masterVolume])

  return { masterVolumeInitialized }
}

/**
 * トラックボリューム初期化フック
 */
export const useTrackVolumeInitialization = (tracks) => {
  const [trackVolumesInitialized, setTrackVolumesInitialized] = useState(false)

  useEffect(() => {
    console.log('App: Track volume initialization effect triggered:', {
      tracksLength: tracks.length,
      tracks: tracks.map(t => ({ id: t.id, volume: t.volume, muted: t.muted }))
    })

    // 各トラックのボリュームを音声システムに反映
    tracks.forEach(track => {
      if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
        try {
          // トラックごとのボリューム設定
          window.unifiedAudioSystem.setTrackVolume(track.id, track.volume || 1.0)

          // ミュート状態の設定
          if (track.muted) {
            window.unifiedAudioSystem.muteTrack(track.id)
          }

          console.log(`🎛️ Track ${track.id} volume initialized:`, {
            volume: track.volume,
            muted: track.muted
          })
        } catch (error) {
          console.warn(`⚠️ Failed to initialize volume for track ${track.id}:`, error)
        }
      }
    })

    setTrackVolumesInitialized(true)
  }, [tracks])

  return { trackVolumesInitialized }
}

/**
 * 音声システム状態監視フック
 */
export const useAudioSystemStatus = () => {
  const [audioSystemStatus, setAudioSystemStatus] = useState({
    isInitialized: false,
    isPlaying: false,
    currentTime: 0,
    masterVolume: 1.0
  })

  useEffect(() => {
    const updateAudioSystemStatus = () => {
      if (window.unifiedAudioSystem) {
        setAudioSystemStatus({
          isInitialized: window.unifiedAudioSystem.isInitialized || false,
          isPlaying: window.unifiedAudioSystem.isPlaying || false,
          currentTime: window.unifiedAudioSystem.getCurrentTime ?
                      window.unifiedAudioSystem.getCurrentTime() : 0,
          masterVolume: window.unifiedAudioSystem.getMasterVolume ?
                       window.unifiedAudioSystem.getMasterVolume() : 1.0
        })
      }
    }

    // 初回更新
    updateAudioSystemStatus()

    // 定期更新（再生中のみ）
    const statusInterval = setInterval(() => {
      if (window.unifiedAudioSystem?.isPlaying) {
        updateAudioSystemStatus()
      }
    }, 100) // 100msごとに更新

    // 音声システムのイベントリスナー
    const handlePlayStateChange = () => updateAudioSystemStatus()
    const handleVolumeChange = () => updateAudioSystemStatus()

    if (window.unifiedAudioSystem) {
      window.unifiedAudioSystem.addEventListener?.('playStateChange', handlePlayStateChange)
      window.unifiedAudioSystem.addEventListener?.('volumeChange', handleVolumeChange)
    }

    return () => {
      clearInterval(statusInterval)
      if (window.unifiedAudioSystem) {
        window.unifiedAudioSystem.removeEventListener?.('playStateChange', handlePlayStateChange)
        window.unifiedAudioSystem.removeEventListener?.('volumeChange', handleVolumeChange)
      }
    }
  }, [])

  return { audioSystemStatus }
}

/**
 * トラック音声設定同期フック
 */
export const useTrackAudioSync = (tracks, masterVolume) => {
  useEffect(() => {
    if (!window.unifiedAudioSystem || !window.unifiedAudioSystem.isInitialized) {
      return
    }

    try {
      // マスターボリュームの同期
      window.unifiedAudioSystem.setMasterVolume(masterVolume)

      // 各トラックの設定を同期
      tracks.forEach(track => {
        // ボリューム同期
        window.unifiedAudioSystem.setTrackVolume(track.id, track.volume || 1.0)

        // ミュート同期
        if (track.muted) {
          window.unifiedAudioSystem.muteTrack(track.id)
        } else {
          window.unifiedAudioSystem.unmuteTrack(track.id)
        }

        // ソロ同期
        if (track.solo) {
          window.unifiedAudioSystem.soloTrack(track.id)
        }

        // パン設定同期
        if (track.pan !== undefined) {
          window.unifiedAudioSystem.setTrackPan?.(track.id, track.pan)
        }
      })

      console.log('🔄 Track audio settings synchronized')
    } catch (error) {
      console.warn('⚠️ Failed to sync track audio settings:', error)
    }
  }, [tracks, masterVolume])
}

/**
 * オーディオメーター（レベル表示）フック
 */
export const useAudioMeters = (tracks) => {
  const [audioLevels, setAudioLevels] = useState({})

  useEffect(() => {
    if (!window.unifiedAudioSystem || !window.unifiedAudioSystem.isInitialized) {
      return
    }

    const updateAudioLevels = () => {
      const newLevels = {}

      tracks.forEach(track => {
        try {
          // 各トラックの音声レベルを取得
          const level = window.unifiedAudioSystem.getTrackLevel?.(track.id) || 0
          newLevels[track.id] = level
        } catch (error) {
          // エラーは無視してデフォルト値を使用
          newLevels[track.id] = 0
        }
      })

      setAudioLevels(newLevels)
    }

    // 音声レベルの定期更新（再生中のみ）
    const metersInterval = setInterval(() => {
      if (window.unifiedAudioSystem?.isPlaying) {
        updateAudioLevels()
      }
    }, 50) // 50msごとに更新（滑らかなメーター表示）

    return () => {
      clearInterval(metersInterval)
    }
  }, [tracks])

  return { audioLevels }
}

/**
 * 包括的音声・トラック効果フック
 * 全ての音声・トラック関連の副作用を統合管理
 */
export const useAudioTrackEffects = (dependencies) => {
  const { tracks, masterVolume } = dependencies

  // 各種音声関連の副作用を初期化
  const { masterVolumeInitialized } = useMasterVolumeInitialization(masterVolume)
  const { trackVolumesInitialized } = useTrackVolumeInitialization(tracks)
  const { audioSystemStatus } = useAudioSystemStatus()
  const { audioLevels } = useAudioMeters(tracks)

  // トラック音声設定の同期
  useTrackAudioSync(tracks, masterVolume)

  return {
    masterVolumeInitialized,
    trackVolumesInitialized,
    audioSystemStatus,
    audioLevels,
    isAudioReady: masterVolumeInitialized && trackVolumesInitialized
  }
}

/**
 * 音声パフォーマンス監視フック
 */
export const useAudioPerformanceMonitoring = () => {
  const [audioPerformance, setAudioPerformance] = useState({
    latency: 0,
    bufferSize: 0,
    sampleRate: 0,
    cpuUsage: 0
  })

  useEffect(() => {
    const updateAudioPerformance = () => {
      if (window.unifiedAudioSystem && window.unifiedAudioSystem.getPerformanceInfo) {
        try {
          const perfInfo = window.unifiedAudioSystem.getPerformanceInfo()
          setAudioPerformance(perfInfo)
        } catch (error) {
          console.warn('⚠️ Failed to get audio performance info:', error)
        }
      }
    }

    // 定期的にパフォーマンス情報を更新
    const perfInterval = setInterval(updateAudioPerformance, 5000) // 5秒ごと

    return () => {
      clearInterval(perfInterval)
    }
  }, [])

  return { audioPerformance }
}

export default useAudioTrackEffects