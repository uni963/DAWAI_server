/**
 * useBassAudio - Bass Track専用オーディオフック
 * Piano Audio Hookパターンを継承・Bass音域最適化
 *
 * @hook useBassAudio
 * @author Claude Code
 * @date 2025-10-05
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SampledBassEngine } from '../utils/audio/SampledBassEngine.js';
import { log } from '../utils/logger.js';

/**
 * Bass Track専用オーディオ管理フック
 * @returns {Object} Bass audio interface
 */
export const useBassAudio = () => {
  // 状態管理
  const [bassEngine, setBassEngine] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Bass固有状態
  const [bassSettings, setBassSettings] = useState({
    volume: 0.8,
    range: { min: 24, max: 60 },
    eqSettings: {
      lowGain: 3,
      midGain: 0,
      highGain: -2
    }
  });

  // パフォーマンス最適化用
  const engineRef = useRef(null);
  const isUnmountedRef = useRef(false);

  // エンジン初期化
  useEffect(() => {
    let isMounted = true;
    isUnmountedRef.current = false;

    const initializeBass = async () => {
      if (isInitializing) return;

      try {
        setIsInitializing(true);
        setError(null);

        log.audio('🎸 Initializing Bass Audio Engine...');

        // SampledBassEngine作成
        const engine = new SampledBassEngine();
        engineRef.current = engine;

        // プログレス付きサンプルロード
        await engine.loadSamples((progress) => {
          if (isMounted && !isUnmountedRef.current) {
            setLoadingProgress(progress);
            log.audio(`Bass samples loading: ${progress}%`);
          }
        });

        if (isMounted && !isUnmountedRef.current) {
          setBassEngine(engine);
          setIsLoaded(true);
          setLoadingProgress(100);

          log.audio('✅ Bass Audio Engine initialized successfully', {
            sampleCount: engine.samples.size,
            range: engine.bassRange
          });
        }

      } catch (err) {
        if (isMounted && !isUnmountedRef.current) {
          const errorMessage = `Bass engine initialization failed: ${err.message}`;
          setError(errorMessage);
          log.error('❌ Bass Audio Engine initialization failed:', err);
        }
      } finally {
        if (isMounted && !isUnmountedRef.current) {
          setIsInitializing(false);
        }
      }
    };

    initializeBass();

    // クリーンアップ
    return () => {
      isMounted = false;
      isUnmountedRef.current = true;

      if (engineRef.current) {
        log.audio('🧹 Cleaning up Bass Audio Engine...');
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []); // 依存配列空 - マウント時のみ実行

  // Bass再生インターフェース
  const playBassNote = useCallback((midiNote, velocity = 127) => {
    if (!bassEngine || !isLoaded) {
      log.warn('Bass engine not ready for playback');
      return null;
    }

    try {
      const sourceNode = bassEngine.playNote(midiNote, velocity);

      log.audio(`🎸 Bass note played: MIDI ${midiNote}, velocity ${velocity}`);

      return sourceNode;

    } catch (err) {
      log.error(`Failed to play bass note ${midiNote}:`, err);
      return null;
    }
  }, [bassEngine, isLoaded]);

  const stopBassNote = useCallback((midiNote) => {
    if (!bassEngine || !isLoaded) {
      log.warn('Bass engine not ready for note stopping');
      return;
    }

    try {
      bassEngine.stopNote(midiNote);
      log.audio(`🎸 Bass note stopped: MIDI ${midiNote}`);

    } catch (err) {
      log.error(`Failed to stop bass note ${midiNote}:`, err);
    }
  }, [bassEngine, isLoaded]);

  const stopAllBassNotes = useCallback(() => {
    if (!bassEngine || !isLoaded) {
      log.warn('Bass engine not ready for stopping all notes');
      return;
    }

    try {
      bassEngine.stopAllNotes();
      log.audio('🎸 All bass notes stopped');

    } catch (err) {
      log.error('Failed to stop all bass notes:', err);
    }
  }, [bassEngine, isLoaded]);

  // 音量制御
  const setBassVolume = useCallback((volume) => {
    if (!bassEngine || !isLoaded) {
      log.warn('Bass engine not ready for volume change');
      return;
    }

    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      bassEngine.setVolume(clampedVolume);

      setBassSettings(prev => ({
        ...prev,
        volume: clampedVolume
      }));

      log.audio(`🎸 Bass volume set: ${Math.round(clampedVolume * 100)}%`);

    } catch (err) {
      log.error('Failed to set bass volume:', err);
    }
  }, [bassEngine, isLoaded]);

  // EQ制御
  const setBassEQ = useCallback((eqSettings) => {
    if (!bassEngine || !isLoaded) {
      log.warn('Bass engine not ready for EQ change');
      return;
    }

    try {
      bassEngine.setBassEQ(eqSettings);

      setBassSettings(prev => ({
        ...prev,
        eqSettings: { ...prev.eqSettings, ...eqSettings }
      }));

      log.audio('🎸 Bass EQ updated:', eqSettings);

    } catch (err) {
      log.error('Failed to set bass EQ:', err);
    }
  }, [bassEngine, isLoaded]);

  // 音域制御
  const setBassRange = useCallback((range) => {
    if (!bassEngine || !isLoaded) {
      log.warn('Bass engine not ready for range change');
      return;
    }

    try {
      bassEngine.setBassRange(range);

      setBassSettings(prev => ({
        ...prev,
        range: { ...prev.range, ...range }
      }));

      log.audio('🎸 Bass range updated:', range);

    } catch (err) {
      log.error('Failed to set bass range:', err);
    }
  }, [bassEngine, isLoaded]);

  // 情報取得
  const getSampleInfo = useCallback(() => {
    if (!bassEngine) return [];
    return bassEngine.getSampleConfigs();
  }, [bassEngine]);

  const getBassRange = useCallback(() => {
    if (!bassEngine) return { min: 24, max: 60 };
    return bassEngine.bassRange;
  }, [bassEngine]);

  const getEngineInfo = useCallback(() => {
    if (!bassEngine) return null;
    return bassEngine.getInfo();
  }, [bassEngine]);

  // エラー回復
  const retryInitialization = useCallback(async () => {
    if (isInitializing) return;

    log.audio('🔄 Retrying Bass Audio Engine initialization...');

    setError(null);
    setIsLoaded(false);
    setLoadingProgress(0);

    // 既存エンジン破棄
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }

    // 再初期化はuseEffectで自動実行される
    setBassEngine(null);
  }, [isInitializing]);

  // デバッグ情報
  const getDebugInfo = useCallback(() => {
    return {
      isLoaded,
      loadingProgress,
      error,
      isInitializing,
      engineInfo: getEngineInfo(),
      sampleCount: bassEngine?.samples?.size || 0,
      activeNotes: bassEngine?.activeNotes?.size || 0,
      settings: bassSettings
    };
  }, [isLoaded, loadingProgress, error, isInitializing, getEngineInfo, bassEngine, bassSettings]);

  // Bass専用ユーティリティ
  const isValidBassNote = useCallback((midiNote) => {
    const range = getBassRange();
    return midiNote >= range.min && midiNote <= range.max;
  }, [getBassRange]);

  const getBassNoteName = useCallback((midiNote) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const note = noteNames[midiNote % 12];
    return `${note}${octave}`;
  }, []);

  // レスポンス性能最適化
  const playBassChord = useCallback((midiNotes, velocity = 127) => {
    if (!Array.isArray(midiNotes)) {
      log.warn('playBassChord requires array of MIDI notes');
      return [];
    }

    const sourceNodes = [];

    try {
      midiNotes.forEach(midiNote => {
        const sourceNode = playBassNote(midiNote, velocity);
        if (sourceNode) {
          sourceNodes.push(sourceNode);
        }
      });

      log.audio(`🎸 Bass chord played: ${midiNotes.length} notes`);

    } catch (err) {
      log.error('Failed to play bass chord:', err);
    }

    return sourceNodes;
  }, [playBassNote]);

  return {
    // 状態
    isLoaded,
    loadingProgress,
    error,
    isInitializing,
    bassEngine,
    bassSettings,

    // 再生制御
    playBassNote,
    stopBassNote,
    stopAllBassNotes,
    playBassChord,

    // 設定制御
    setBassVolume,
    setBassEQ,
    setBassRange,

    // 情報取得
    getSampleInfo,
    getBassRange,
    getEngineInfo,
    getDebugInfo,

    // ユーティリティ
    isValidBassNote,
    getBassNoteName,

    // エラー回復
    retryInitialization
  };
};

export default useBassAudio;