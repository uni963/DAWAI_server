// useGhostTextIntegration: EnhancedMidiEditorとGhost Textシステムの統合フック
import { useState, useEffect, useRef, useCallback } from 'react';
import GhostTextSystem from './GhostTextSystem.js';

export default function useGhostTextIntegration(midiEditor, options = {}) {
  const [ghostTextSystem, setGhostTextSystem] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [status, setStatus] = useState({
    isActive: false,
    isConnected: false,
    hasGhostNotes: false
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [error, setError] = useState(null);

  const systemRef = useRef(null);
  const midiEditorRef = useRef(midiEditor);

  // MIDIエディタの更新を監視
  useEffect(() => {
    midiEditorRef.current = midiEditor;
  }, [midiEditor]);

  // Ghost Textシステムの初期化
  useEffect(() => {
    if (!midiEditorRef.current) return;

    const initializeSystem = async () => {
      try {
        const system = new GhostTextSystem({
          apiEndpoint: options.apiEndpoint || '/ai',
          debounceDelay: options.debounceDelay || 100,
          requestTimeout: options.requestTimeout || 5000,
          maxRetries: options.maxRetries || 3,
          enabled: options.enabled !== false,
          ...options
        });

        // イベントリスナーの設定
        system.addListener((event, data) => {
          switch (event) {
            case 'initialized':
              setIsInitialized(data.success);
              if (!data.success) {
                setError(data.error);
              }
              break;
            case 'enabled':
              console.log('🔧 Ghost Text: GhostTextSystem enabled event received', data);
              setIsEnabled(data.enabled);
              break;
            case 'prediction':
              setError(null);
              break;
            case 'error':
              setError(data.error);
              break;
            case 'noteAccepted':
            case 'notesAccepted':
              // MIDIエディタの更新をトリガー
              if (midiEditorRef.current && midiEditorRef.current.refresh) {
                midiEditorRef.current.refresh();
              }
              break;
          }
        });

        // システムの初期化
        const success = await system.initialize(midiEditorRef.current);
        if (success) {
          systemRef.current = system;
          setGhostTextSystem(system);
          setIsInitialized(true);
          const currentEnabled = system.isEnabled();
          console.log('🔧 Ghost Text: System initialized, enabled:', currentEnabled);
          setIsEnabled(currentEnabled);

          // 初期設定
          if (options.autoEnable !== false) {
            system.enable();
            setIsEnabled(true);
          }
        }
      } catch (err) {
        console.error('Failed to initialize Ghost Text System:', err);
        setError(err.message);
        setIsInitialized(false);
      }
    };

    initializeSystem();

    // クリーンアップ
    return () => {
      if (systemRef.current) {
        systemRef.current.destroy();
        systemRef.current = null;
      }
      setGhostTextSystem(null);
      setIsInitialized(false);
      setIsEnabled(false);
      setError(null);
    };
  }, [midiEditor, options.apiEndpoint]);

  // ステータスとメトリクスの定期更新
  useEffect(() => {
    if (!ghostTextSystem) return;

    const updateStatus = () => {
      setStatus(ghostTextSystem.getStatus());
      setPerformanceMetrics(ghostTextSystem.getPerformanceMetrics());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, [ghostTextSystem]);

  // MIDIデータの更新ハンドラー
  const handleMidiDataUpdate = useCallback((notes, cursorPosition, trackType, additionalData) => {
    if (ghostTextSystem && isEnabled) {
      ghostTextSystem.updateContext(notes, cursorPosition, trackType, additionalData);
    }
  }, [ghostTextSystem, isEnabled]);

  // ゴーストノートの操作
  const acceptGhostNote = useCallback((index) => {
    if (ghostTextSystem) {
      return ghostTextSystem.acceptGhostNote(index);
    }
    return null;
  }, [ghostTextSystem]);

  const acceptAllGhostNotes = useCallback(() => {
    if (ghostTextSystem) {
      return ghostTextSystem.acceptAllGhostNotes();
    }
    return [];
  }, [ghostTextSystem]);

  const showGhostNotes = useCallback(() => {
    if (ghostTextSystem) {
      ghostTextSystem.showGhostNotes();
    }
  }, [ghostTextSystem]);

  const hideGhostNotes = useCallback(() => {
    if (ghostTextSystem) {
      ghostTextSystem.hideGhostNotes();
    }
  }, [ghostTextSystem]);

  // システム制御
  const enableGhostText = useCallback(() => {
    console.log('🔧 Ghost Text: enableGhostText called');
    if (ghostTextSystem) {
      // 🔧 修正: イベントリスナー経由でのみstate更新（二重更新を防止）
      ghostTextSystem.enable(); // → イベント 'enabled' { enabled: true } → setIsEnabled(true)

      // 🔧 修正: 状態を即座に同期して確実に反映
      const newState = ghostTextSystem.isEnabled();
      console.log('🔧 Ghost Text: After enable, new state:', newState);
      setIsEnabled(newState);
    }
  }, [ghostTextSystem]);

  const disableGhostText = useCallback(() => {
    console.log('🔧 Ghost Text: disableGhostText called');
    if (ghostTextSystem) {
      // 🔧 修正: イベントリスナー経由でのみstate更新（二重更新を防止）
      ghostTextSystem.disable(); // → イベント 'enabled' { enabled: false } → setIsEnabled(false)

      // 🔧 修正: 状態を即座に同期して確実に反映
      const newState = ghostTextSystem.isEnabled();
      console.log('🔧 Ghost Text: After disable, new state:', newState);
      setIsEnabled(newState);
    }
  }, [ghostTextSystem]);

  const toggleGhostText = useCallback(() => {
    console.log('🔧 Ghost Text: toggleGhostText called');
    if (ghostTextSystem) {
      // 🔧 修正完了: GhostTextSystemに委譲し、イベントリスナー経由でのみstate更新
      const currentState = ghostTextSystem.isEnabled();
      console.log('🔧 Ghost Text: Current state:', currentState);

      if (currentState) {
        console.log('🔧 Ghost Text: Disabling...');
        ghostTextSystem.disable(); // → イベント 'enabled' { enabled: false } → setIsEnabled(false)
      } else {
        console.log('🔧 Ghost Text: Enabling...');
        ghostTextSystem.enable(); // → イベント 'enabled' { enabled: true } → setIsEnabled(true)
      }

      // 🔧 修正: 状態を即座に同期して確実に反映（イベントリスナーが遅延する場合の対策）
      const newState = ghostTextSystem.isEnabled();
      console.log('🔧 Ghost Text: After toggle, new state:', newState);
      setIsEnabled(newState);
    }
  }, [ghostTextSystem]);

  // 設定の更新
  const updateSettings = useCallback((newSettings) => {
    if (ghostTextSystem) {
      ghostTextSystem.updateSettings(newSettings);
    }
  }, [ghostTextSystem]);

  // メトリクスのリセット
  const resetMetrics = useCallback(() => {
    if (ghostTextSystem) {
      ghostTextSystem.resetMetrics();
    }
  }, [ghostTextSystem]);

  // ゴーストノートの表示設定
  const setGhostNoteOpacity = useCallback((opacity) => {
    if (ghostTextSystem) {
      ghostTextSystem.setGhostNoteOpacity(opacity);
    }
  }, [ghostTextSystem]);

  const setGhostNoteColor = useCallback((color) => {
    if (ghostTextSystem) {
      ghostTextSystem.setGhostNoteColor(color);
    }
  }, [ghostTextSystem]);

  return {
    // 状態
    isInitialized,
    isEnabled,
    status,
    performanceMetrics,
    error,

    // MIDIデータ更新
    handleMidiDataUpdate,

    // ゴーストノート操作
    acceptGhostNote,
    acceptAllGhostNotes,
    showGhostNotes,
    hideGhostNotes,

    // システム制御
    enableGhostText,
    disableGhostText,
    toggleGhostText,

    // 設定とメトリクス
    updateSettings,
    resetMetrics,
    setGhostNoteOpacity,
    setGhostNoteColor,

    // システムインスタンス（高度な操作用）
    ghostTextSystem
  };
}
