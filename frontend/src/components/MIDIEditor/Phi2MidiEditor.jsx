/*
 * Phi2MidiEditor - MIDI Editor Component with Phi-2 Ghost Text Integration
 *
 * ⚠️ 注意: このファイルはPhi-2ベースのGhost Textシステム用です
 * 現在使用中のMagentaベースシステム: ../EnhancedMidiEditor.jsx
 *
 * 重要: メニュー表示時の注意点
 * - コンテキストメニュー（コピー/カット/削除）とPasteメニューは必ずsetTimeoutで10ms遅延させて表示する
 * - 理由: setSelectedNotes()などの状態更新の直後にメニューを表示すると、再描画処理でメニューが隠される
 * - 例: setTimeout(() => { showContextMenu(e, note, ids) }, 10)
 * - 例: setTimeout(() => { showPasteMenu(e, time, pitch) }, 10)
 *
 * メニュー作成時の必須設定:
 * - menu.tabIndex = -1
 * - menu.addEventListener('mousedown', e => e.preventDefault())
 * - menu.addEventListener('mouseup', e => e.preventDefault())
 * - menu.addEventListener('contextmenu', e => e.preventDefault())
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  PIANO_WIDTH,
  HEADER_HEIGHT,
  NOTE_HEIGHT,
  OCTAVE_RANGE,
  TOTAL_KEYS,
  FPS_LIMIT,
  FRAME_TIME,
  LONG_PRESS_THRESHOLD,
  PLAYBACK_UPDATE_INTERVAL
} from './constants';
import { useMidiPlayback } from './hooks/useMidiPlayback';
import { useMidiNoteEdit } from './hooks/useMidiNoteEdit';



import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import MidiEditorToolbar from './MidiEditorToolbar.jsx';
import MidiEditorStatusBar from './MidiEditorStatusBar.jsx';
import MidiEditorCanvas from './MidiEditorCanvas.jsx';
import MidiEditorEventHandlers from './MidiEditorEventHandlers.jsx';
import useMidiPersistence from '../../hooks/useMidiPersistence.js';
import useMidiAudio from '../../hooks/useMidiAudio.js';
import useMidiNoteOperations from '../../hooks/useMidiNoteOperations.js';
import useMidiEditorState from '../../hooks/useMidiEditorState.js';
import useGhostTextIntegration from '../../utils/ghostText/useGhostTextIntegration.js';
import useInstrumentSettings from '../../hooks/useInstrumentSettings.js';
import InstrumentSettingsPanel from './InstrumentSettingsPanel.jsx';
import GhostTextPanel from '../GhostTextPanel.jsx';

const EnhancedMidiEditor = ({
  trackId,
  trackType = 'piano',
  trackName = 'Unknown Track',
  trackColor = 'blue',
  midiData,
  onMidiDataUpdate,
  onNoteAdd,
  onNoteRemove,
  onNoteEdit,
  isActive = true,
  onOpenSettings,
  appSettings,
  globalTempo = 120,
  onGlobalTempoChange,
  projectManager,
  globalAISettings,
  onAISettingsChange
}) => {
  // 状態管理フックの使用
  const state = useMidiEditorState();

  // グローバルBPMを状態に反映
  useEffect(() => {
    if (globalTempo !== state.tempo) {
      state.setTempo(globalTempo);
    }
  }, [globalTempo, state.tempo]); // 🔧 修正: state全体ではなくstate.tempoのみ依存

  // 初期化時に再生ヘッドを表示するため、強制的に再描画
  useEffect(() => {
    state.setNeedsRedraw(true);
  }, []); // 🔧 修正: 依存関係から state を削除して初期化時のみ実行

  // 永続化フックの使用
  const persistence = useMidiPersistence();

  // オーディオフックの使用
  const audio = useMidiAudio();


  // ノート操作フックの使用
  const noteOperations = useMidiNoteOperations(
    state.notes,
    state.setNotes,
    trackId,
    state.isInitialized,
    persistence,
    state.currentTime,
    state.selectedNotes,
    state.setSelectedNotes
  );

  // グローバルAI設定から値を取得（デフォルト値を設定）
  // 🔥 [CRITICAL FIX] useMemoでメモ化し、globalAISettingsの変更を確実に追跡
  const aiModel = useMemo(() => {
    const model = globalAISettings?.aiModel || 'magenta';
    console.log('🔥 [CRITICAL] EnhancedMidiEditor: aiModel計算:', { model, source: globalAISettings?.aiModel });
    return model;
  }, [globalAISettings?.aiModel]);

  const summaryStatus = useMemo(() => {
    return globalAISettings?.summaryStatus || {
      lastUpdated: null,
      needsUpdate: false
    };
  }, [globalAISettings?.summaryStatus]);

  const predictionSettings = useMemo(() => {
    return globalAISettings?.predictionSettings || {
      autoPredict: true,
      predictionDelay: 100,
      ghostNoteOpacity: 0.5
    };
  }, [globalAISettings?.predictionSettings]);

  const ghostTextEnabled = useMemo(() => {
    return globalAISettings?.ghostTextEnabled || false;
  }, [globalAISettings?.ghostTextEnabled]);

  // デバッグログ: globalAISettingsの受け取り確認
  console.log('🎯 EnhancedMidiEditor: globalAISettings received:', {
    aiModel,
    ghostTextEnabled,
    summaryStatus,
    predictionSettings,
    fullSettings: globalAISettings
  });

  // 音色設定フックの使用
  const instrumentSettings = useInstrumentSettings(trackId);

  // Refs（Ghost Textシステム初期化前に定義が必要）
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  const timelineCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastGhostPredictionsRef = useRef([]);
  const longPressTimerRef = useRef(null);

  // Ghost Textシステムの統合（安全な初期化）
  const ghostTextIntegration = useGhostTextIntegration(
    {
      canvas: dynamicCanvasRef.current,
      notes: state.notes,
      cursorPosition: state.currentTime,
      trackType: trackType,
      keySignature: 'C',
      timeSignature: '4/4',
      tempo: state.tempo
    },
    {
      apiEndpoint: '/ai',
      debounceDelay: predictionSettings?.predictionDelay || 100,
      requestTimeout: 5000,
      maxRetries: 3,
      enabled: aiModel === 'phi2', // 🔧 修正: 独立したghostTextEnabled stateを削除し、aiModelのみで制御
      autoEnable: false // 手動で制御
    }
  ) || {
    // フォールバック: ghostTextIntegrationが失敗した場合のデフォルトオブジェクト
    isEnabled: false,
    status: { hasGhostNotes: false },
    performanceMetrics: {},
    toggleGhostText: () => {},
    showGhostNotes: () => {},
    hideGhostNotes: () => {},
    acceptGhostNote: () => {},
    acceptAllGhostNotes: () => {},
    processMidiInput: () => {}
  };

  // 🔧 修正: Ghost Text有効状態をglobalAISettingsから取得
  // ghostTextIntegration.isEnabledはローカルシステムの内部状態として使用
  const ghostTextEnabledInternal = ghostTextIntegration.isEnabled;

  console.log('🔧 EnhancedMidiEditor: ghostTextEnabled (global) =', ghostTextEnabled);
  console.log('🔧 EnhancedMidiEditor: ghostTextEnabled (internal) =', ghostTextEnabledInternal);

  // 要約更新機能
  const handleUpdateSummary = async () => {
    if (aiModel === 'phi2' && ghostTextIntegration) {
      try {
        // 現在のトラック情報を要約として送信
        const trackSummary = {
          notes: state.notes,
          trackType: trackType,
          keySignature: 'C',
          timeSignature: '4/4',
          tempo: state.tempo,
          timestamp: Date.now()
        };

        // バックエンドに要約を送信（実際のAPIエンドポイントに応じて調整）
        const response = await fetch('/ai/api/update-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(trackSummary)
        });

        if (response.ok) {
          // グローバル状態を更新
          if (onAISettingsChange) {
            onAISettingsChange('summaryStatus', {
              lastUpdated: Date.now(),
              needsUpdate: false
            });
          }
        }
      } catch (error) {
        console.error('Failed to update summary:', error);
      }
    }
  };

  // 予測設定の更新
  const handlePredictionSettingsChange = (setting, value) => {
    const newSettings = {
      ...predictionSettings,
      [setting]: value
    };

    // グローバル状態を更新
    if (onAISettingsChange) {
      onAISettingsChange('predictionSettings', newSettings);
    }

    // Ghost Textシステムの設定も更新
    if (ghostTextIntegration) {
      ghostTextIntegration.updateSettings({
        debounceDelay: setting === 'predictionDelay' ? value : predictionSettings.predictionDelay
      });

      if (setting === 'ghostNoteOpacity') {
        ghostTextIntegration.setGhostNoteOpacity(value);
      }
    }
  };

  // AIモデル変更時の処理
  const handleAiModelChange = useCallback((newModel) => {
    console.log('🔥 [CRITICAL FIX] EnhancedMidiEditor: AIモデル変更処理開始:', { from: aiModel, to: newModel });

    // グローバル状態を即座に更新（最優先）
    if (onAISettingsChange) {
      console.log('🔥 [CRITICAL FIX] onAISettingsChange呼び出し:', newModel);
      onAISettingsChange('aiModel', newModel);
    } else {
      console.error('❌ onAISettingsChange is not defined!');
    }

    if (newModel === 'disabled') {
      // 🔧 修正: disabledモデル時はGhost Textを無効化
      if (ghostTextIntegration?.disableGhostText) {
        ghostTextIntegration.disableGhostText();
      }
    } else if (newModel === 'phi2') {
      // Phi-2モデルに切り替え時は要約更新が必要
      if (onAISettingsChange) {
        onAISettingsChange('summaryStatus', {
          ...summaryStatus,
          needsUpdate: true
        });
      }
    }

    console.log('🔥 [CRITICAL FIX] EnhancedMidiEditor: AIモデル変更処理完了:', newModel);
  }, [aiModel, onAISettingsChange, ghostTextIntegration, summaryStatus]);

  // 元のMIDIデータを保持
  const [originalMidiData, setOriginalMidiData] = useState(null);

  // 削除処理の重複実行を防ぐためのフラグ
  const isDeletingRef = useRef(false);

  // 再生状態の管理用Ref（状態の不整合を防ぐため）
  const isPlayingRef = useRef(false);

  // 滑らかなスクロール関数のRef
  const smoothScrollRef = useRef(null);

  // 再生関連のRefs
  const playbackRef = useRef(null);
  const metronomeRef = useRef(null);
  const scheduledNotesRef = useRef(new Map());
  const playbackStartTimeRef = useRef(0);

  // 再生中のオーディオノードを管理するRef
  const activeAudioNodesRef = useRef(new Map()); // noteId -> { oscillator, gainNode, filter }

  // トラックデータ管理用のRefs（安全な初期化）
  const trackDataRef = useRef({});
  const lastSavedRef = useRef({});
  const lastParentUpdateRef = useRef({});

  // データの安全な初期化
  useEffect(() => {
    if (trackId && !trackDataRef.current[trackId]) {
      trackDataRef.current[trackId] = [];
      lastSavedRef.current[trackId] = Date.now();
      lastParentUpdateRef.current[trackId] = Date.now();
    }
  }, [trackId]);



  // Ghost TextシステムにMIDIデータの更新を通知
  useEffect(() => {
    if (ghostTextIntegration && ghostTextIntegration.isEnabled && predictionSettings.autoPredict) {
      ghostTextIntegration.handleMidiDataUpdate(
        state.notes,
        state.currentTime,
        trackType,
        {
          keySignature: 'C',
          timeSignature: '4/4',
          tempo: state.tempo
        }
      );
    }
  }, [state.notes, state.currentTime, state.tempo, trackType, ghostTextIntegration, predictionSettings.autoPredict]);

  // MIDIデータ変更時に要約更新が必要な状態にする
  useEffect(() => {
    if (aiModel === 'phi2' && ghostTextIntegration?.isEnabled && state.notes.length > 0) {
      // グローバル状態を更新
      if (onAISettingsChange) {
        onAISettingsChange('summaryStatus', {
          ...summaryStatus,
          needsUpdate: true
        });
      }
    }
  }, [state.notes, aiModel, ghostTextIntegration?.isEnabled]);

  // AI Agent承認/拒否イベントのリスナー（対策3: MIDIエディタ更新強化）
  useEffect(() => {
    const handleMidiDataApproved = (event) => {
      console.log('MIDI Editor: Data approved event received', event.detail)

      // trackIdが一致する場合のみ処理
      if (event.detail?.trackId === trackId) {
        console.log('MIDI Editor: Forcing redraw for approved changes')
        state.setNeedsRedraw(true)

        // midiDataプロップからノートデータを再読み込み
        if (midiData?.notes) {
          console.log('MIDI Editor: Reloading notes from midiData', {
            notesCount: midiData.notes.length,
            trackId
          })
          state.setNotes(midiData.notes)
        }
      }
    }

    const handleMidiDataRejected = (event) => {
      console.log('MIDI Editor: Data rejected event received', event.detail)

      // trackIdが一致する場合のみ処理
      if (event.detail?.trackId === trackId) {
        console.log('MIDI Editor: Forcing redraw for rejected changes')
        state.setNeedsRedraw(true)

        // midiDataプロップからノートデータを再読み込み
        if (midiData?.notes) {
          console.log('MIDI Editor: Reloading notes from midiData', {
            notesCount: midiData.notes.length,
            trackId
          })
          state.setNotes(midiData.notes)
        }
      }
    }

    window.addEventListener('midiDataApproved', handleMidiDataApproved)
    window.addEventListener('midiDataRejected', handleMidiDataRejected)

    return () => {
      window.removeEventListener('midiDataApproved', handleMidiDataApproved)
      window.removeEventListener('midiDataRejected', handleMidiDataRejected)
    }
  }, [midiData, trackId, state.setNeedsRedraw, state.setNotes]) // 🔧 修正: state全体ではなく使用する関数のみ

  // 曲の最大時間を計算（ArrangementViewの設定を優先）
  const maxTime = useMemo(() => {
    // プロジェクトマネージャーからArrangementViewの曲の長さを取得
    let projectDuration = null
    if (projectManager?.getProject()?.settings?.duration) {
      // ミリ秒から秒に変換
      projectDuration = projectManager.getProject().settings.duration / 1000
    }

    if (projectDuration) {
      // ArrangementViewで設定された曲の長さを使用
      return Math.max(30, Math.min(600, projectDuration))
    }

    // プロジェクト設定がない場合は、ノートの最大時間を計算
    if (state.notes && state.notes.length > 0) {
      const maxNoteEnd = Math.max(...state.notes.map(note => (note.time || note.start || 0) + (note.duration || 1)))
      // 最低30秒、最大10分（600秒）の範囲で設定
      return Math.max(30, Math.min(600, maxNoteEnd + 10))
    }
    // ノートがない場合はデフォルト60秒
    return 60
  }, [state.notes, projectManager])

  // BPMに基づく拍数計算
  const maxBeats = useMemo(() => {
    const secondsPerBeat = 60 / state.tempo
    return Math.ceil(maxTime / secondsPerBeat)
  }, [maxTime, state.tempo])

  // 座標変換
  const coordinateTransforms = useMemo(() => {
    // スクロール下限の計算（C1-C7の範囲に制限、キーボードの下側に余裕を持たせる）
    const maxScrollY = Math.max(0, (TOTAL_KEYS * GRID_HEIGHT) - 400) // 400pxの表示領域を確保

    // 利用可能な表示幅を計算（より正確に）
    const getAvailableWidth = () => {
      // 実際のコンテナ幅を取得（より正確）
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        if (containerWidth > 0) {
          return containerWidth
        }
      }

      // フォールバック: ウィンドウ幅から推定
      const windowWidth = window.innerWidth
      // より保守的な推定値
      const estimatedPanelsWidth = 400 // ミキサー + AI Assistant の推定幅
      const availableWidth = windowWidth - estimatedPanelsWidth

      // 最小幅を確保
      return Math.max(600, availableWidth)
    }

    const availableWidth = getAvailableWidth()

    // 横スクロールの最大値を計算（曲の最大時間に基づく）
    const totalContentWidth = maxTime * GRID_WIDTH * state.zoom
    const maxScrollX = Math.max(0, totalContentWidth - availableWidth)


    return {
      pitchToY: (pitch) => {
        // ピッチを正しいY座標に変換（簡略化版）
        const keyIndex = TOTAL_KEYS - 1 - (pitch - (OCTAVE_RANGE[0] * 12))
        const y = HEADER_HEIGHT + keyIndex * GRID_HEIGHT - state.scrollY
        return y
      },
      yToPitch: (y) => {
        // Y座標をピッチに変換
        const keyIndex = Math.floor((y - HEADER_HEIGHT + state.scrollY) / GRID_HEIGHT)
        return (OCTAVE_RANGE[0] * 12) + (TOTAL_KEYS - 1 - keyIndex)
      },
      timeToX: (time) => {
        // 時間を正しいX座標に変換（スクロールとズームを考慮）
        const x = PIANO_WIDTH + (time * GRID_WIDTH * state.zoom) - state.scrollX
        return x
      },
      xToTime: (x) => {
        // X座標を時間に変換（スクロールとズームを考慮）
        return (x - PIANO_WIDTH + state.scrollX) / (GRID_WIDTH * state.zoom)
      },
      maxScrollY: maxScrollY,
      maxScrollX: maxScrollX,
      maxTime: maxTime,
      maxBeats: maxBeats
    }
  }, [state.zoom, maxTime, maxBeats, TOTAL_KEYS, GRID_HEIGHT, GRID_WIDTH, PIANO_WIDTH, HEADER_HEIGHT, OCTAVE_RANGE])

  // 再生機能の実装（useMidiPlaybackフックから取得）
  const { startPlayback, stopPlayback, pausePlayback } = useMidiPlayback({
    state,
    audio,
    isPlayingRef,
    scheduledNotesRef,
    playbackStartTimeRef,
    activeAudioNodesRef,
    onMidiDataUpdate,
    trackId,
  });

  // ノート編集機能の実装（useMidiNoteEditフックから取得）
  const { addNote, removeNote, editNote, finalizeNoteDrag, finalizeMultiNoteDrag } = useMidiNoteEdit({
    state,
    persistence,
    ghostText: ghostTextIntegration,
    onNoteAdd,
    onNoteRemove,
    onNoteEdit,
    onMidiDataUpdate,
    trackId,
    scheduledNotesRef,
    activeAudioNodesRef,
    audio,
    isPlayingRef,
    playbackStartTimeRef,
  });

  // 選択されたノートをカット
  const cutSelectedNotes = useCallback((selectedNoteIds = null) => {
    const effectiveSelectedNotes = selectedNoteIds || Array.from(state.selectedNotes);
    if (effectiveSelectedNotes.length === 0) return;

    // まずコピー
    noteOperations.copySelectedNotes(effectiveSelectedNotes);

    // 次に削除
    noteOperations.deleteSelectedNotes(effectiveSelectedNotes);
  }, [state.selectedNotes, noteOperations]);

  // スペースキー用の再生/停止切り替え関数
  const handlePlayPause = useCallback(async () => {
    try {
      if (isPlayingRef.current) {
        pausePlayback();
      } else {
        await startPlayback();
      }
    } catch (error) {
      console.error('❌ Playback error:', error);
    }
  }, [startPlayback, pausePlayback, isPlayingRef]);

  // グローバル関数として公開（App.jsxから呼び出し可能）
  useEffect(() => {
    if (!window.midiEditorPlayPause) {
      window.midiEditorPlayPause = {};
    }
    window.midiEditorPlayPause[trackId] = handlePlayPause;
    return () => {
      if (window.midiEditorPlayPause && window.midiEditorPlayPause[trackId]) {
        delete window.midiEditorPlayPause[trackId];
      }
    };
  }, [handlePlayPause, trackId]);

  // BPM変更時のリアルタイム調整
  const handleTempoChange = useCallback((newTempo) => {
    // 再生中はBPM変更を無効にする
    if (state.isPlaying && isPlayingRef.current) {
      return;
    }

    // グローバルBPMを更新（プロジェクトマネージャーで全トラックのノート位置が更新される）
    if (onGlobalTempoChange) {
      onGlobalTempoChange(newTempo);
    }

    // ローカル状態も更新
    state.setTempo(newTempo);

    // 再生時間と再生位置を調整
    const oldTempo = globalTempo;
    const tempoRatio = oldTempo / newTempo;

    // 再生時間も調整
    const newPlaybackDuration = state.playbackDuration * tempoRatio;
    state.setPlaybackDuration(newPlaybackDuration);

    // 現在の再生位置も調整
    if (state.currentTime > 0) {
      const newCurrentTime = state.currentTime * tempoRatio;
      state.setCurrentTime(newCurrentTime);
    }

    // 強制的に再描画
    state.setNeedsRedraw(true);
  }, [state.isPlaying, globalTempo, state.playbackDuration, state.currentTime, onGlobalTempoChange]);

  // コンテナのリサイズ監視
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // リサイズ監視
    const resizeObserver = new ResizeObserver(() => {
      state.setNeedsRedraw(true);
    });

    // ページレベルの横スクロール防止（ブラウザの戻る/進むを防ぐ）
    const handlePageWheel = (e) => {
      // 横スクロール（ブラウザの戻る/進むを防ぐ）
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // passive: falseでイベントリスナーを追加
    window.addEventListener('wheel', handlePageWheel, { passive: false });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('wheel', handlePageWheel);
    };
  }, [state.setNeedsRedraw]); // 🔧 修正: state全体ではなくsetNeedsRedrawのみ依存

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      // スケジュールされたノートをクリア
      scheduledNotesRef.current.forEach(({ startTimeout, endTimeout }) => {
        if (startTimeout) clearTimeout(startTimeout);
        if (endTimeout) clearTimeout(endTimeout);
      });
      scheduledNotesRef.current.clear();

      // オーディオノードをクリーンアップ
      activeAudioNodesRef.current.forEach((audioNodes, noteId) => {
        if (audioNodes && audioNodes.oscillator) {
          audioNodes.oscillator.stop();
        }
        if (audioNodes && audioNodes.gainNode) {
          audioNodes.gainNode.gain.cancelScheduledValues(0);
          audioNodes.gainNode.gain.setValueAtTime(0, 0);
        }
      });
      activeAudioNodesRef.current.clear();

      // オーディオフックのクリーンアップ
      if (audio && audio.cleanup) {
        audio.cleanup();
      }
    };
  }, []);

  // Ghost Text予測の受け入れ
  const acceptGhostPrediction = useCallback((predictionIndex = 0) => {
    if (ghostTextIntegration && ghostTextIntegration.acceptGhostPrediction) {
      ghostTextIntegration.acceptGhostPrediction(predictionIndex, state.notes, addNote);
    }
  }, [ghostTextIntegration, state.notes, addNote]);

  // Ghost Text予測の全適用
  const acceptAllGhostPredictions = useCallback(() => {
    if (ghostTextIntegration && ghostTextIntegration.acceptAllGhostPredictions) {
      ghostTextIntegration.acceptAllGhostPredictions(state.notes, addNote);
    }
  }, [ghostTextIntegration, state.notes, addNote]);

  // Ghost Textのトグル
  const toggleGhostText = useCallback(() => {
    if (ghostTextIntegration && ghostTextIntegration.toggleGhostText) {
      console.log('🔧 Ghost Text: EnhancedMidiEditor toggleGhostText called');
      console.log('🔧 Ghost Text: Current isEnabled:', ghostTextIntegration.isEnabled);
      ghostTextIntegration.toggleGhostText();
      console.log('🔧 Ghost Text: After toggle, new isEnabled:', ghostTextIntegration.isEnabled);
    }
  }, [ghostTextIntegration]);

  // 巻き戻し機能（永続化フック使用）
  const undoLastAction = useCallback(() => {
    if (!trackId || !state.isInitialized) return;

    const previousState = persistence.restoreFromHistory('undo');

    if (previousState) {
      // ディープコピーで確実に分離
      const previousStateCopy = previousState.map(note => ({ ...note }));
      state.setNotes(previousStateCopy);

      // データを永続化
      trackDataRef.current[trackId] = [...previousStateCopy];
      lastSavedRef.current[trackId] = Date.now();
      persistence.saveNotes(previousStateCopy, trackId);

      state.setSelectedNotes(new Set());
      state.setNeedsRedraw(true);
    }
  }, [trackId, state.isInitialized, persistence, trackDataRef, lastSavedRef, state.setNotes, state.setSelectedNotes, state.setNeedsRedraw]);

  // イベントハンドラーの初期化
  const eventHandlers = MidiEditorEventHandlers({
    state,
    coordinateTransforms,
    GRID_HEIGHT,
    GRID_WIDTH,
    PIANO_WIDTH,
    HEADER_HEIGHT,
    NOTE_HEIGHT,
    OCTAVE_RANGE,
    LONG_PRESS_THRESHOLD,
    dynamicCanvasRef,
    containerRef,
    longPressTimerRef,
    audio,
    addNote,
    finalizeNoteDrag,
    finalizeMultiNoteDrag,
    noteOperations,
    startPlayback,
    pausePlayback,
    isActive,
    trackId,
    smoothScrollRef // 滑らかなスクロール関数を渡す
  });

  // 削除確認ダイアログのハンドラー
  const handleDeleteAll = useCallback(() => {
    if (trackId && state.isInitialized) {
      // メモリ上のノートをクリア
      state.setNotes([]);

      // Refデータを更新（クリアではなく更新）
      trackDataRef.current[trackId] = [];
      lastSavedRef.current[trackId] = Date.now();

      // 永続化データをクリア
      persistence.saveNotes([], trackId);

      // 履歴をクリア
      persistence.clearHistory();

      // 親コンポーネントに空の状態を通知
      if (onMidiDataUpdate) {
        const updateData = {
          notes: [],
          trackId: trackId,
          lastModified: new Date().toISOString(),
          metadata: {
            modified: new Date().toISOString(),
            noteCount: 0
          },
          settings: {
            channel: 0,
            octave: 0,
            transpose: 0,
            velocity: 100
          }
        };
        onMidiDataUpdate(updateData);
      }
    }
    state.setSelectedNotes(new Set());
    state.setShowDeleteConfirm(false);
  }, [trackId, state.isInitialized, persistence, onMidiDataUpdate, state.setNotes, state.setSelectedNotes, state.setShowDeleteConfirm, trackDataRef, lastSavedRef]);

  return (
    <div
      className="flex flex-col bg-gray-900 text-white midi-editor-container h-full"
      style={{
        overscrollBehavior: 'none',
        overflowX: 'hidden',
      }}
    >
      {/* ツールバー */}
      <MidiEditorToolbar
        // 再生関連
        isPlaying={state.isPlaying}
        onPlayPause={async (e) => {
          e.preventDefault();
          e.stopPropagation();

          try {
            if (isPlayingRef.current) {
              pausePlayback();
            } else {
              await startPlayback();
            }
          } catch (error) {
            console.error('❌ Playback error:', error);
          }
        }}
        onStop={() => {
          stopPlayback();
        }}
        notesLength={state.notes.length}

        // 操作関連
        onUndo={undoLastAction}
        canUndo={state.isInitialized && persistence.getHistoryInfo().canUndo}
        onShowDeleteConfirm={() => state.setShowDeleteConfirm(true)}

        // オーディオ関連
        audioEnabled={state.audioEnabled}
        onToggleAudio={() => {
          state.setAudioEnabled(!state.audioEnabled);
        }}

        // テンポ関連
        tempo={globalTempo}
        onTempoChange={handleTempoChange}

        // ループ・メトロノーム関連
        loopEnabled={state.loopEnabled}
        onToggleLoop={() => {
          state.setLoopEnabled(!state.loopEnabled);
        }}
        metronomeEnabled={state.metronomeEnabled}
        onToggleMetronome={() => {
          state.setMetronomeEnabled(!state.metronomeEnabled);
        }}

        // ズーム関連
        zoom={state.zoom}
        onZoomChange={(value) => state.setZoom(value)}

        // Ghost Text関連 🔧 修正: globalAISettingsから取得した値を使用
        ghostTextEnabled={ghostTextEnabled}
        onToggleGhostText={() => {
          // グローバル状態を更新
          if (onAISettingsChange) {
            onAISettingsChange('ghostTextEnabled', !ghostTextEnabled);
          }
          // ローカルシステムもトグル
          ghostTextIntegration.toggleGhostText();
        }}
        showGhostText={ghostTextIntegration.status.hasGhostNotes}
        onToggleShowGhostText={() => {
          if (ghostTextIntegration.status.hasGhostNotes) {
            ghostTextIntegration.hideGhostNotes();
          } else {
            ghostTextIntegration.showGhostNotes();
          }
        }}

        // 承認待ちノート数
        pendingNotesCount={ghostTextIntegration?.status?.pendingNotesCount || 0}

        // 設定関連
        showSettings={false}
        onToggleSettings={onOpenSettings}
        onOpenSoundSettings={instrumentSettings.openSettingsPanel}
      />

      {/* ステータスバー */}
      {appSettings?.midiEditor?.developerMode && (
        <MidiEditorStatusBar
          // トラック情報
          trackName={trackName}
          trackType={trackType}
          trackColor={trackColor}

          // Ghost Text関連
          ghostTextStatus={ghostTextIntegration.status}
          currentModel="Phi-2"

          // ノート情報
          notesCount={state.notes.length}

          // オーディオ・再生状態
          audioEnabled={state.audioEnabled}
          isPlaying={state.isPlaying}
          tempo={globalTempo}
          loopEnabled={state.loopEnabled}
          metronomeEnabled={state.metronomeEnabled}

          // 時間情報
          currentTime={state.currentTime}
          playbackDuration={state.playbackDuration}

          // パフォーマンス指標
          performanceMetrics={ghostTextIntegration.performanceMetrics}
        />
      )}

      {/* MIDIエディタキャンバス */}
      <MidiEditorCanvas
        // キャンバス関連
        staticCanvasRef={staticCanvasRef}
        dynamicCanvasRef={dynamicCanvasRef}
        timelineCanvasRef={timelineCanvasRef}
        containerRef={containerRef}

        // 状態管理
        state={state}

        // 座標変換
        coordinateTransforms={coordinateTransforms}

        // 定数
        GRID_HEIGHT={GRID_HEIGHT}
        GRID_WIDTH={GRID_WIDTH}
        PIANO_WIDTH={PIANO_WIDTH}
        HEADER_HEIGHT={HEADER_HEIGHT}
        NOTE_HEIGHT={NOTE_HEIGHT}
        OCTAVE_RANGE={OCTAVE_RANGE}
        TOTAL_KEYS={TOTAL_KEYS}

        // Ghost Text関連
        ghostPredictions={[]} // 新しいシステムではレンダラーが直接処理
        showGhostText={ghostTextIntegration.status.hasGhostNotes}
        onAcceptPrediction={(index) => ghostTextIntegration.acceptGhostNote(index)}
        onAcceptAllPredictions={ghostTextIntegration.acceptAllGhostNotes}

        // イベントハンドラー
        onMouseDown={eventHandlers.handleMouseDown}
        onMouseMove={eventHandlers.handleMouseMove}
        onMouseUp={eventHandlers.handleMouseUp}
        onContextMenu={eventHandlers.handleCanvasRightClick}
        onWheel={() => {}} // ReactのonWheelは使用しない
        onTimelineClick={eventHandlers.handleTimelineClick}
        onSmoothScroll={(smoothScrollFn) => {
          smoothScrollRef.current = smoothScrollFn;
        }}
      />

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        showDeleteConfirm={state.showDeleteConfirm}
        notesCount={state.notes.length}
        onCancel={() => state.setShowDeleteConfirm(false)}
        onReload={() => {
          noteOperations.reloadTrack();
          state.setShowDeleteConfirm(false);
        }}
        onDeleteAll={handleDeleteAll}
      />

      {/* 音色設定パネル */}
      {instrumentSettings.showSettingsPanel && (
        <InstrumentSettingsPanel
          key={`${trackId}-${aiModel}-${ghostTextEnabled}`} // 🔥 [CRITICAL FIX] AI設定変更時に強制再マウント
          instrument={instrumentSettings.instrument}
          settings={instrumentSettings.settings}
          onSettingsChange={instrumentSettings.handleSettingsChange}
          onClose={instrumentSettings.closeSettingsPanel}
          onSave={instrumentSettings.handleSaveSettings}
          onReset={instrumentSettings.handleResetSettings}
          // AI関連の新しいprops (globalAISettings基準)
          aiModel={aiModel}
          onAiModelChange={handleAiModelChange}
          ghostTextEnabled={ghostTextEnabled} // グローバル設定から取得
          onGhostTextToggle={() => {
            // グローバル状態を更新
            if (onAISettingsChange) {
              onAISettingsChange('ghostTextEnabled', !ghostTextEnabled);
            }
            // ローカルシステムもトグル
            ghostTextIntegration.toggleGhostText();
          }}
          summaryStatus={summaryStatus}
          onUpdateSummary={handleUpdateSummary}
          predictionSettings={predictionSettings}
          onPredictionSettingsChange={handlePredictionSettingsChange}
        />
      )}


    </div>
  );
};

  // AIエージェントの承認・拒否処理イベントを監視
  useEffect(() => {
    const handleAllChangesRejected = (event) => {
      // 拒否処理後にノートデータを再読み込み
      if (trackId && state.isInitialized) {

        // 永続化データから最新のノートデータを取得
        const savedNotes = persistence.getNotes(trackId);
        if (savedNotes) {
          state.setNotes([...savedNotes]);

          // Refデータも更新
          trackDataRef.current[trackId] = [...savedNotes];
          lastSavedRef.current[trackId] = Date.now();
        } else {
          state.setNotes([]);
          trackDataRef.current[trackId] = [];
          lastSavedRef.current[trackId] = Date.now();
        }

        // 選択状態をクリア
        state.setSelectedNotes(new Set());

        // 強制的に再描画
        state.setNeedsRedraw(true);

        // 親コンポーネントに更新を通知
        if (onMidiDataUpdate) {
          const updateData = {
            notes: state.notes,
            trackId: trackId,
            lastModified: new Date().toISOString(),
            metadata: {
              modified: new Date().toISOString(),
              noteCount: state.notes.length
            },
            settings: {
              channel: 0,
              octave: 0,
              transpose: 0,
              velocity: 100
            }
          };
          onMidiDataUpdate(updateData);
        }
      }
    };

    const handleAllChangesApproved = (event) => {
      // 承認処理後にノートデータを再読み込み
      if (trackId && state.isInitialized) {

        // 永続化データから最新のノートデータを取得
        const savedNotes = persistence.getNotes(trackId);
        if (savedNotes) {
          state.setNotes([...savedNotes]);

                  // Refデータも更新
        trackDataRef.current[trackId] = [...savedNotes];
        }

        // 選択状態をクリア
        state.setSelectedNotes(new Set());

        // 強制的に再描画
        state.setNeedsRedraw(true);

        // 親コンポーネントに更新を通知
        if (onMidiDataUpdate) {
          const updateData = {
            notes: state.notes,
            trackId: trackId,
            lastModified: new Date().toISOString(),
            metadata: {
              modified: new Date().toISOString(),
              noteCount: state.notes.length
            },
            settings: {
              channel: 0,
              octave: 0,
              transpose: 0,
              velocity: 100
            }
          };
          onMidiDataUpdate(updateData);
        }
      }
    };

    // AIエージェントエンジンからイベントを監視
    if (window.aiAgentEngine) {
      window.aiAgentEngine.addListener('allChangesRejected', handleAllChangesRejected);
      window.aiAgentEngine.addListener('allChangesApproved', handleAllChangesApproved);
    }

    return () => {
      if (window.aiAgentEngine) {
        window.aiAgentEngine.removeListener('allChangesRejected', handleAllChangesRejected);
        window.aiAgentEngine.removeListener('allChangesApproved', handleAllChangesApproved);
      }
    };
  }, [trackId, state.isInitialized, persistence, state.setNotes, state.setSelectedNotes, state.setNeedsRedraw, onMidiDataUpdate, trackDataRef, lastSavedRef]);

  // グローバルイベントの監視
  useEffect(() => {
    const handleMidiDataUpdated = (event) => {

      if (event.detail.type === 'rejection' && trackId && state.isInitialized) {

        // 永続化データから最新のノートデータを取得
        const savedNotes = persistence.getNotes(trackId);
        if (savedNotes) {
          state.setNotes([...savedNotes]);

          // Refデータも更新
          trackDataRef.current[trackId] = [...savedNotes];
          lastSavedRef.current[trackId] = Date.now();
        } else {
          state.setNotes([]);
          trackDataRef.current[trackId] = [];
          lastSavedRef.current[trackId] = Date.now();
        }

        // 選択状態をクリア
        state.setSelectedNotes(new Set());

        // 強制的に再描画
        state.setNeedsRedraw(true);

        // 親コンポーネントに更新を通知
        if (onMidiDataUpdate) {
          const updateData = {
            notes: state.notes,
            trackId: trackId,
            lastModified: new Date().toISOString(),
            metadata: {
              modified: new Date().toISOString(),
              noteCount: state.notes.length
            },
            settings: {
              channel: 0,
              octave: 0,
              transpose: 0,
              velocity: 100
            }
          };
          onMidiDataUpdate(updateData);
        }
      }
    };

    // グローバルイベントリスナーを追加
    window.addEventListener('midiDataUpdated', handleMidiDataUpdated);

    return () => {
      window.removeEventListener('midiDataUpdated', handleMidiDataUpdated);
    };
  }, [trackId, state.isInitialized, persistence, state.setNotes, state.setSelectedNotes, state.setNeedsRedraw, onMidiDataUpdate, trackDataRef, lastSavedRef]);

  // グローバルアクセス用の関数を設定
  useEffect(() => {
    // MIDIエディターの強制更新機能をグローバルに公開
    window.midiEditorForceUpdate = () => {
      state.setNeedsRedraw(true);
      // 少し遅延させてから再描画を実行
      setTimeout(() => {
        state.setNeedsRedraw(false);
        state.setNeedsRedraw(true);
      }, 100);
    };

    // projectManagerをグローバルに公開（MidiEditorCanvasからアクセス用）
    if (projectManager) {
      window.projectManager = projectManager;
    }

    return () => {
      delete window.midiEditorForceUpdate;
      delete window.projectManager;
    };
  }, [state.setNeedsRedraw, projectManager]); // 🔧 修正: state全体ではなくsetNeedsRedrawのみ依存

export default memo(EnhancedMidiEditor);
