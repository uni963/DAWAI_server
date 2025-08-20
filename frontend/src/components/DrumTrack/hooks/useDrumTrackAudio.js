import { useRef, useCallback, useEffect, useState } from 'react';
import { METRONOME_SOUNDS } from '../constants.js';

const useDrumTrackAudio = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializingRef = useRef(false);
  
  // 重複再生防止
  const lastPlaybackTimeRef = useRef(0);
  const playbackCooldownRef = useRef(50); // 50msのクールダウン

  // 統一音声システムの初期化
  const initializeAudio = useCallback(async () => {
    if (isInitializingRef.current || isInitialized) return true;
    
    isInitializingRef.current = true;
    console.log('🥁 [DrumTrackAudio] 統一音声システムを初期化中...');

    try {
      if (!window.unifiedAudioSystem) {
        console.error('🥁 [DrumTrackAudio] 統一音声システムが見つかりません');
        return false;
      }

      const success = await window.unifiedAudioSystem.initialize();
      if (success) {
        setIsInitialized(true);
        console.log('🥁 [DrumTrackAudio] 統一音声システム初期化完了');
        
        // ドラムトラック追加
        window.unifiedAudioSystem.addTrack('drum-track', 'Drum Track', 'drums', '#ff6b6b', null);
        console.log('🥁 [DrumTrackAudio] ドラムトラック追加完了');
        
        return true;
      } else {
        console.error('🥁 [DrumTrackAudio] 統一音声システムの初期化に失敗');
        return false;
      }
    } catch (error) {
      console.error('🥁 [DrumTrackAudio] 初期化エラー:', error);
      return false;
    } finally {
      isInitializingRef.current = false;
    }
  }, [isInitialized]);

  // ドラム音再生（統一システム使用）
  const playDrumSound = useCallback(async (pitch, velocity = 0.8) => {
    console.log('🥁 [DrumTrackAudio] ドラム音再生要求:', { pitch, velocity });

    // クールダウンチェック
    const now = Date.now();
    if (now - lastPlaybackTimeRef.current < playbackCooldownRef.current) {
      console.log('🥁 [DrumTrackAudio] クールダウン中のため再生をスキップ');
      return null;
    }
    lastPlaybackTimeRef.current = now;

    try {
      // 初期化確認
      if (!isInitialized) {
        console.log('🥁 [DrumTrackAudio] 初期化が必要、実行中...');
        const success = await initializeAudio();
        if (!success) {
          console.error('🥁 [DrumTrackAudio] 初期化に失敗');
          return null;
        }
      }

      if (!window.unifiedAudioSystem) {
        console.error('🥁 [DrumTrackAudio] 統一音声システムが利用できません');
        return null;
      }

      console.log('🥁 [DrumTrackAudio] 統一音声システムでドラム音を再生:', { pitch, velocity });
      
      // 統一音声システムでドラム音を再生（トラック指定）
      const result = await window.unifiedAudioSystem.playDrumSoundWithTrackSettings(pitch.toString(), velocity, 'drum-track');
      
      if (result) {
        console.log('🥁 [DrumTrackAudio] ドラム音再生成功:', pitch);
        return {
          pitch,
          velocity,
          duration: 0.3,
          engine: 'unified'
        };
      } else {
        console.warn('🥁 [DrumTrackAudio] ドラム音再生に失敗:', pitch);
        return null;
      }
    } catch (error) {
      console.error('🥁 [DrumTrackAudio] ドラム音再生エラー:', error);
      return null;
    }
  }, [isInitialized, initializeAudio]);

  // メトロノーム音再生（統一システム使用）
  const playMetronomeSound = useCallback(async (isAccent = false) => {
    try {
      if (!isInitialized) {
        await initializeAudio();
      }

      if (!window.unifiedAudioSystem) {
        console.warn('🥁 [DrumTrackAudio] メトロノーム: 統一音声システムが利用できません');
        return;
      }

      // メトロノーム音をピアノ音として再生
      const pitch = isAccent ? METRONOME_SOUNDS.accent.pitch : METRONOME_SOUNDS.click.pitch;
      const velocity = isAccent ? METRONOME_SOUNDS.accent.velocity : METRONOME_SOUNDS.click.velocity;
      
      await window.unifiedAudioSystem.playPianoNote(pitch, velocity);
      console.log('🥁 [DrumTrackAudio] メトロノーム音再生:', { pitch, velocity, isAccent });
    } catch (error) {
      console.error('🥁 [DrumTrackAudio] メトロノーム音再生エラー:', error);
    }
  }, [isInitialized, initializeAudio]);

  // 音量設定
  const setVolume = useCallback((volume) => {
    if (window.unifiedAudioSystem) {
      window.unifiedAudioSystem.setMasterVolume(volume / 100);
      console.log('🥁 [DrumTrackAudio] 音量設定:', volume);
    }
  }, []);

  // 全音停止
  const stopAllSounds = useCallback(() => {
    if (window.unifiedAudioSystem) {
      window.unifiedAudioSystem.stopAllSounds();
      console.log('🥁 [DrumTrackAudio] 全音停止');
    }
  }, []);

  // 初期化効果
  useEffect(() => {
    initializeAudio();
    
    // グローバルテスト関数を公開
    window.drumTrackPlayDrumSound = playDrumSound;
    
    return () => {
      // クリーンアップ
      delete window.drumTrackPlayDrumSound;
      stopAllSounds();
    };
  }, [initializeAudio, playDrumSound, stopAllSounds]);

  return {
    playDrumSound,
    playMetronomeSound,
    setVolume,
    stopAllSounds,
    isInitialized
  };
};

export default useDrumTrackAudio;