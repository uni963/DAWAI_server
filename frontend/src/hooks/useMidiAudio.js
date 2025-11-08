import { useRef, useCallback, useEffect } from 'react'

/**
 * MIDI Audio Management Hook
 * AudioContext、音声再生、メトロノーム機能を管理
 */
const useMidiAudio = () => {
  // 音色関連
  const instrumentRef = useRef('piano')
  const volumeRef = useRef(0.7)
  const masterVolumeRef = useRef(1.0)
  const metronomeVolumeRef = useRef(0.3)
  
  // 外部から渡される音量情報
  const trackVolumeRef = useRef(100) // トラック音量（0-100）
  const trackMutedRef = useRef(false) // トラックミュート状態
  const externalMasterVolumeRef = useRef(100) // 外部マスターボリューム（0-100）
  
  // 統一された音声システム関連
  const isInitializedRef = useRef(false)
  const trackIdRef = useRef('track-1') // midi-trackからtrack-1に変更
  const metronomeIntervalRef = useRef(null)
  
  /**
   * クリーンアップ処理
   */
  const cleanup = useCallback(() => {
    try {
      // メトロノーム停止
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current)
        metronomeIntervalRef.current = null
      }

      // 統一された音声システムの音を停止
      if (isInitializedRef.current && window.unifiedAudioSystem) {
        window.unifiedAudioSystem.stop()
      }

      isInitializedRef.current = false
      console.log('🎹 [useMidiAudio] Cleanup completed')
    } catch (error) {
      console.warn('Error cleaning up Unified Audio System:', error)
    }
  }, [])

  // 統一された音声システムの初期化
  const initializeAudio = useCallback(async () => {
    try {
      if (isInitializedRef.current) {
        return true
      }

      console.log('🎹 [useMidiAudio] Initializing Unified Audio System...')

      // 統一された音声システムが存在するかチェック
      if (!window.unifiedAudioSystem) {
        console.error('🎹 [useMidiAudio] Unified Audio System is not available')
        return false
      }

      // 統一された音声システムを初期化
      const success = await window.unifiedAudioSystem.initialize()

      if (!success) {
        console.error('🎹 [useMidiAudio] Unified Audio System initialization failed')
        return false
      }

      isInitializedRef.current = true
      console.log('🎹 [useMidiAudio] Unified Audio System initialized successfully')
      return true
    } catch (error) {
      console.error('❌ Unified Audio System初期化エラー:', error)
      return false
    }
  }, [])

  // 初期化を実行
  useEffect(() => {
    initializeAudio()

    // クリーンアップ関数：コンポーネントがアンマウントされる際に実行
    return () => {
      console.log('🎹 [useMidiAudio] Cleaning up on unmount')
      cleanup()
    }
  }, [initializeAudio, cleanup])
  
  /**
   * 音色の設定
   */
  const setInstrument = useCallback((instrument) => {
    instrumentRef.current = instrument
    
    // 統一された音声システムのトラック楽器を更新
    if (isInitializedRef.current) {
      // 既存のトラックがあるかチェックして、なければ新しく追加
      try {
        if (!window.unifiedAudioSystem || !window.unifiedAudioSystem.tracks || !window.unifiedAudioSystem.tracks.has(trackIdRef.current)) {
          window.unifiedAudioSystem.addTrack(trackIdRef.current, 'MIDIトラック', instrument, '#4f46e5')
        } else {
          // 既存のトラックの楽器タイプを更新（利用可能な場合）
          const track = window.unifiedAudioSystem.tracks.get(trackIdRef.current)
          if (track) {
            track.type = instrument
            // 楽器インスタンスも更新
            const newInstrument = window.unifiedAudioSystem.getInstrumentForTrack(instrument)
            if (newInstrument) {
              track.instrument = newInstrument
            }
          }
        }
        
        // 音量とミュート状態を再設定
        const finalVolume = trackMutedRef.current ? 0 : (trackVolumeRef.current / 100)
        window.unifiedAudioSystem.setTrackVolume(trackIdRef.current, finalVolume)
        window.unifiedAudioSystem.setTrackMuted(trackIdRef.current, trackMutedRef.current)
      } catch (error) {
        console.warn('🎹 [useMidiAudio] Failed to update instrument:', error)
      }
    }
  }, [])
  
  /**
   * 音量の設定（個別トラック用）
   */
  const setVolume = useCallback((volume) => {
    // 無効な値をチェックして修正
    let validVolume = volume
    if (typeof volume !== 'number' || !isFinite(volume)) {
      console.warn('Invalid volume value:', volume, 'using default value 0.7')
      validVolume = 0.7
    }
    
    volumeRef.current = Math.max(0, Math.min(1, validVolume))
    trackVolumeRef.current = validVolume * 100 // 0-100スケールに変換
    
    // 統一された音声システムのトラック音量を更新
    if (isInitializedRef.current) {
      const finalVolume = trackMutedRef.current ? 0 : volumeRef.current
      window.unifiedAudioSystem.setTrackVolume(trackIdRef.current, finalVolume)
    }
    
    // ログを削除して重複を防ぐ
  }, [])

  /**
   * マスターボリュームの設定
   */
  const setMasterVolume = useCallback((volume) => {
    // 無効な値をチェックして修正
    let validVolume = volume
    if (typeof volume !== 'number' || !isFinite(volume)) {
      console.warn('Invalid master volume value:', volume, 'using default value 1.0')
      validVolume = 1.0
    }
    
    masterVolumeRef.current = Math.max(0, Math.min(1, validVolume))
    
    // 統一された音声システムでマスターボリュームを設定
    if (isInitializedRef.current) {
      window.unifiedAudioSystem.setMasterVolume(masterVolumeRef.current)
      console.log('🎵 useMidiAudio: Master volume updated:', {
        trackVolume: trackVolumeRef.current,
        masterVolume: masterVolumeRef.current
      })
    }
  }, [])
  
  /**
   * メトロノーム音量の設定
   */
  const setMetronomeVolume = useCallback((volume) => {
    metronomeVolumeRef.current = Math.max(0, Math.min(1, volume))
    // 統一された音声システムがメトロノーム音量を管理
    console.log('🎵 useMidiAudio: Metronome volume set:', metronomeVolumeRef.current)
  }, [])

  /**
   * 外部音量情報の設定（重複実行を防ぐ）
   */
  const lastExternalVolumeInfoRef = useRef({ trackVolume: null, trackMuted: null, masterVolume: null })
  const setExternalVolumeInfo = useCallback((trackVolume, trackMuted, masterVolume) => {
    // 音量情報が実際に変更された場合のみ処理
    if (lastExternalVolumeInfoRef.current.trackVolume === trackVolume && 
        lastExternalVolumeInfoRef.current.trackMuted === trackMuted && 
        lastExternalVolumeInfoRef.current.masterVolume === masterVolume) {
      return
    }
    
    console.log('useMidiAudio: setExternalVolumeInfo called with:', {
      trackVolume,
      trackMuted,
      masterVolume,
      trackVolumeType: typeof trackVolume,
      masterVolumeType: typeof masterVolume
    });
    
    trackVolumeRef.current = trackVolume !== undefined ? trackVolume : 0 // デフォルトを0に変更
    trackMutedRef.current = trackMuted !== undefined ? trackMuted : false
    externalMasterVolumeRef.current = masterVolume !== undefined ? masterVolume : 0 // デフォルトを0に変更
    
    console.log('useMidiAudio: External volume info updated:', {
      trackVolume: trackVolumeRef.current,
      trackMuted: trackMutedRef.current,
      masterVolume: externalMasterVolumeRef.current
    })
    
    // 統一された音声システムに音量情報を設定
    if (isInitializedRef.current) {
      const normalizedTrackVolume = trackVolumeRef.current / 100
      const finalVolume = trackMutedRef.current ? 0 : normalizedTrackVolume
      const normalizedMasterVolume = externalMasterVolumeRef.current / 100
      
      console.log('useMidiAudio: Setting Unified Audio System volumes:', {
        trackId: trackIdRef.current,
        normalizedTrackVolume,
        finalVolume,
        normalizedMasterVolume,
        muted: trackMutedRef.current
      })
      
      window.unifiedAudioSystem.setTrackVolume(trackIdRef.current, finalVolume)
      window.unifiedAudioSystem.setTrackMuted(trackIdRef.current, trackMutedRef.current)
      window.unifiedAudioSystem.setMasterVolume(normalizedMasterVolume)
      
      console.log('useMidiAudio: Unified Audio System volume updated:', {
        trackVolume: trackVolumeRef.current,
        masterVolume: externalMasterVolumeRef.current,
        finalVolume,
        normalizedMasterVolume,
        muted: trackMutedRef.current
      })
      
      // 更新された音量情報を記録
      lastExternalVolumeInfoRef.current = { trackVolume, trackMuted, masterVolume }
    } else {
      console.warn('useMidiAudio: Unified Audio System not initialized, cannot set volume');
    }
  }, [])

  /**
   * すべてのノートを停止
   */
  const stopAllNotes = useCallback(() => {
    // 統一された音声システムのノートを停止
    if (isInitializedRef.current) {
      window.unifiedAudioSystem.stop()
    }
  }, [])
  
  /**
   * ノートオン（即座に再生）
   */
  const noteOn = useCallback((note, velocity = 0.7, duration = null) => {
    if (!isInitializedRef.current) {
      // 初期化が必要な場合は同期的に処理
      initializeAudio().then(initialized => {
        if (initialized) {
          noteOn(note, velocity, duration)
        }
      })
      return null
    }
    
    // ミュート状態の場合は音を鳴らさない
    if (trackMutedRef.current) {
      console.log('useMidiAudio: Track is muted, skipping note:', note)
      return null
    }
    
    try {
      console.log('🎹 [useMidiAudio] Playing note via Unified Audio System:', {
        note,
        velocity,
        duration,
        instrument: instrumentRef.current
      })
      
      // 楽器タイプに基づいて適切な音声メソッドを呼び出し
      const track = window.unifiedAudioSystem.tracks.get(trackIdRef.current)
      if (track && track.instrument && track.instrument.playNote) {
        // トラックの楽器オブジェクトを使用
        track.instrument.playNote(note, velocity)
      } else {
        // フォールバック: 楽器タイプに基づいて適切なメソッドを直接呼び出し
        const instrumentType = instrumentRef.current || 'piano'
        if (instrumentType === 'bass' || instrumentType === 'electric_bass' || instrumentType === 'acoustic_bass') {
          window.unifiedAudioSystem.playBassNote(note, velocity)
        } else if (instrumentType === 'drums' || instrumentType === 'drum') {
          window.unifiedAudioSystem.playDrumSound(note.toString(), velocity)
        } else {
          // デフォルトはピアノ
          window.unifiedAudioSystem.playPianoNoteSync(note, velocity)
        }
      }
      
      return { 
        note,
        velocity,
        duration: duration || 2.0,
        engine: 'unified'
      }
    } catch (error) {
      console.error('ノートオンエラー:', error)
      return null
    }
  }, [initializeAudio])
  
  /**
   * ノートオフ（即座に停止）
   */
  const noteOff = useCallback((note) => {
    console.log(`🎹 useMidiAudio noteOff called for note ${note}`)
    
    if (!isInitializedRef.current) {
      console.log(`🎹 Unified Audio System not ready for note ${note}`)
      return
    }
    
    try {
      // 統一された音声システムでは自動的にノートの終了を管理
      // 明示的なnoteOff操作は現在の実装では不要
      console.log(`🎹 Note ${note} stop handled by Unified Audio System`)
    } catch (error) {
      console.error('ノートオフエラー:', error)
    }
  }, [])
  
  /**
   * 単一ノートの再生（従来の方法、後方互換性のため）
   */
  const playNote = useCallback((note, velocity = 0.7, duration = 0.5) => {
    if (!isInitializedRef.current) {
      // 初期化が必要な場合は同期的に処理
      initializeAudio().then(initialized => {
        if (initialized) {
          playNote(note, velocity, duration)
        }
      })
      return null
    }
    
    // ミュート状態の場合は音を鳴らさない
    if (trackMutedRef.current) {
      console.log('useMidiAudio: Track is muted, skipping playNote:', note)
      return null
    }
    
    try {
      // 統一された音声システムを使用してノートを再生
      console.log('🎹 [useMidiAudio] Playing note via Unified Audio System:', {
        note,
        velocity,
        duration,
        instrument: instrumentRef.current
      })
      
      // 楽器タイプに基づいて適切な音声メソッドを呼び出し
      const track = window.unifiedAudioSystem.tracks.get(trackIdRef.current)
      if (track && track.instrument && track.instrument.playNote) {
        // トラックの楽器オブジェクトを使用
        track.instrument.playNote(note, velocity)
      } else {
        // フォールバック: 楽器タイプに基づいて適切なメソッドを直接呼び出し
        const instrumentType = instrumentRef.current || 'piano'
        if (instrumentType === 'bass' || instrumentType === 'electric_bass' || instrumentType === 'acoustic_bass') {
          window.unifiedAudioSystem.playBassNote(note, velocity)
        } else if (instrumentType === 'drums' || instrumentType === 'drum') {
          window.unifiedAudioSystem.playDrumSound(note.toString(), velocity)
        } else {
          // デフォルトはピアノ
          window.unifiedAudioSystem.playPianoNoteSync(note, velocity)
        }
      }
      
      return { 
        note,
        velocity,
        duration,
        engine: 'unified'
      }
    } catch (error) {
      console.error('ノート再生エラー:', error)
      return null
    }
  }, [initializeAudio])
  
  /**
   * スケジュールされたノートの再生
   */
  const playScheduledNote = useCallback(async (note, startTime, duration, velocity = 0.7) => {
    if (!isInitializedRef.current) return null
    
    // ミュート状態の場合は音を鳴らさない
    if (trackMutedRef.current) {
      console.log('useMidiAudio: Track is muted, skipping scheduled note:', note)
      return null
    }
    
    // 負の時間をチェック
    if (startTime < 0) {
      console.warn('playScheduledNote: startTime is negative, using 0 instead', { startTime })
      startTime = 0
    }
    
    try {
      console.log('🎹 [useMidiAudio] Scheduling note via Unified Audio System:', {
        note,
        startTime,
        duration,
        velocity,
        instrument: instrumentRef.current
      })
      
      // 統一された音声システムでノートをスケジュール（非同期で待機）
      const result = await window.unifiedAudioSystem.scheduleNote(
        trackIdRef.current,
        note,
        startTime,
        duration,
        velocity // 0-1スケールのまま渡す
      )
      
      console.log('🎹 [useMidiAudio] Schedule result:', result)
      
      return result || { 
        note,
        startTime,
        duration,
        velocity,
        engine: 'unified'
      }
    } catch (error) {
      console.error('スケジュールノート再生エラー:', error)
      return null
    }
  }, [])
  
  /**
   * メトロノーム音の再生
   */
  const playMetronomeClick = useCallback((isAccent = false, scheduledTime = null) => {
    if (!isInitializedRef.current) return
    
    try {
      // 統一された音声システムを使用してメトロノーム音を再生
      const frequency = isAccent ? 800 : 600
      const duration = 0.1
      const velocity = metronomeVolumeRef.current * 100
      
      console.log('🎵 useMidiAudio: Playing metronome click via Unified Audio System:', {
        isAccent,
        frequency,
        velocity
      })
      
      // 簡易的にピッチ60（C4）をベースにして周波数を調整
      const basePitch = 60 + (isAccent ? 12 : 0) // アクセントの場合は1オクターブ上
      
      window.unifiedAudioSystem.scheduleNote(
        trackIdRef.current,
        basePitch,
        scheduledTime || 0,
        duration,
        velocity
      )
    } catch (error) {
      console.error('メトロノーム再生エラー:', error)
    }
  }, [])
  
  /**
   * メトロノームの開始
   */
  const startMetronome = useCallback((tempo, startTime = 0) => {
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current)
    }
    
    const beatInterval = (60 / tempo) * 1000 // ミリ秒
    let beatCount = 0
    
    metronomeIntervalRef.current = setInterval(() => {
      const isAccent = beatCount % 4 === 0 // 4拍目でアクセント
      playMetronomeClick(isAccent)
      beatCount++
    }, beatInterval)
  }, [playMetronomeClick])
  
  /**
   * メトロノームの停止
   */
  const stopMetronome = useCallback(() => {
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current)
      metronomeIntervalRef.current = null
    }
  }, [])
  
  /**
   * 全音の停止
   */
  const stopAllSounds = useCallback(() => {
    // 統一された音声システムの音を停止
    if (isInitializedRef.current) {
      window.unifiedAudioSystem.stop()
    }
    
    // メトロノーム停止
    stopMetronome()
  }, [stopMetronome])
  
  /**
   * AudioContextの停止
   */
  const stopAudio = useCallback(() => {
    stopAllSounds()
    isInitializedRef.current = false
    console.log('🎵 useMidiAudio: Audio stopped')
  }, [stopAllSounds])
  
  /**
   * オーディオ状態の取得
   */
  const getAudioState = useCallback(() => {
    if (!isInitializedRef.current) {
      return 'not_initialized'
    }
    return 'running'
  }, [])

  /**
   * 現在のAudioContext時間を取得
   */
  const getCurrentTime = useCallback(() => {
    if (!isInitializedRef.current) {
      console.warn('Unified Audio System not initialized, returning 0')
      return 0
    }
    return window.unifiedAudioSystem.getCurrentTime()
  }, [])

  /**
   * AudioContextが利用可能かチェック
   */
  const isAudioContextAvailable = useCallback(() => {
    return isInitializedRef.current
  }, [])

  
  return {
    // 初期化・制御
    initializeAudio,
    stopAudio,
    stopAllSounds,
    cleanup,
    
    // 音色・音量設定
    setInstrument,
    setVolume,
    setMasterVolume,
    setMetronomeVolume,
    setExternalVolumeInfo,
    
    // 再生機能
    playNote,
    noteOn,
    noteOff,
    playScheduledNote,
    playMetronomeClick,
    startMetronome,
    stopMetronome,
    stopAllNotes,
    
    // 状態取得
    getAudioState,
    getCurrentTime,
    isAudioContextAvailable,
    
    // 内部参照（必要に応じて）
    isInitializedRef,
    trackIdRef
  }
}

export default useMidiAudio 