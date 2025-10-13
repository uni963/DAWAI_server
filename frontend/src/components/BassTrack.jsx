/**
 * BassTrack - Bass Track専用Reactコンポーネント
 * Piano Track UIパターンを継承・Bass音域特化
 *
 * @component BassTrack
 * @author Claude Code
 * @date 2025-10-05
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useBassAudio } from '../hooks/useBassAudio.js';
import { EnhancedMidiEditor } from './EnhancedMidiEditor.jsx';
import { log } from '../utils/logger.js';

/**
 * Bass Track メインコンポーネント
 */
const BassTrack = ({
  trackData = { notes: [], name: 'Bass Track' },
  onTrackUpdate = () => {},
  isPlaying = false,
  currentTime = 0,
  projectManager = null,
  trackId = null,
  className = ''
}) => {
  // Bass Audio Hook
  const {
    playBassNote,
    stopBassNote,
    stopAllBassNotes,
    setBassVolume,
    setBassEQ,
    isLoaded,
    loadingProgress,
    error,
    getBassRange,
    getSampleInfo,
    getDebugInfo,
    retryInitialization
  } = useBassAudio();

  // トラック設定状態
  const [trackSettings, setTrackSettings] = useState({
    volume: 80,
    muted: false,
    solo: false,
    pan: 0,
    eqEnabled: false
  });

  // UI状態
  const [showSettings, setShowSettings] = useState(false);
  const [lastPlayedNote, setLastPlayedNote] = useState(null);

  // Bass専用設定
  const bassConfig = useMemo(() => ({
    midiRange: getBassRange(),
    displayRange: { min: 28, max: 55 },     // E1-G3 表示範囲
    defaultOctave: 2,                       // Bass標準オクターブ
    keySignature: 'C',
    quantization: 16,                       // 16分音符単位
    showBassClef: true,                     // ヘ音記号表示
    bassHighlight: true,                    // Bass音域ハイライト
    trackType: 'bass',
    theme: 'bass'                           // Bass専用テーマ
  }), [getBassRange]);

  // 音量変更時の処理
  useEffect(() => {
    if (isLoaded && !trackSettings.muted) {
      setBassVolume(trackSettings.volume / 100);
    }
  }, [trackSettings.volume, trackSettings.muted, isLoaded, setBassVolume]);

  // ミュート処理
  useEffect(() => {
    if (isLoaded) {
      if (trackSettings.muted) {
        setBassVolume(0);
        stopAllBassNotes();
      } else {
        setBassVolume(trackSettings.volume / 100);
      }
    }
  }, [trackSettings.muted, trackSettings.volume, isLoaded, setBassVolume, stopAllBassNotes]);

  // ノート操作ハンドラー
  const handleNoteAdd = useCallback((note) => {
    try {
      const newNote = {
        id: `bass-note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...note,
        trackType: 'bass',
        trackId: trackId
      };

      const updatedNotes = [...trackData.notes, newNote];
      onTrackUpdate({
        ...trackData,
        notes: updatedNotes,
        lastModified: new Date().toISOString()
      });

      // リアルタイム再生（再生中でない場合）
      if (!isPlaying && isLoaded && !trackSettings.muted) {
        playBassNote(note.midiNote, note.velocity || 100);
        setLastPlayedNote(note.midiNote);
      }

      log.audio(`🎸 Bass note added: ${note.midiNote}`, newNote);

    } catch (err) {
      log.error('Failed to add bass note:', err);
    }
  }, [trackData, onTrackUpdate, trackId, isPlaying, isLoaded, trackSettings.muted, playBassNote]);

  const handleNoteEdit = useCallback((noteId, changes) => {
    try {
      const updatedNotes = trackData.notes.map(note =>
        note.id === noteId ? { ...note, ...changes } : note
      );

      onTrackUpdate({
        ...trackData,
        notes: updatedNotes,
        lastModified: new Date().toISOString()
      });

      log.audio(`🎸 Bass note edited: ${noteId}`, changes);

    } catch (err) {
      log.error('Failed to edit bass note:', err);
    }
  }, [trackData, onTrackUpdate]);

  const handleNoteDelete = useCallback((noteId) => {
    try {
      const updatedNotes = trackData.notes.filter(note => note.id !== noteId);

      onTrackUpdate({
        ...trackData,
        notes: updatedNotes,
        lastModified: new Date().toISOString()
      });

      log.audio(`🎸 Bass note deleted: ${noteId}`);

    } catch (err) {
      log.error('Failed to delete bass note:', err);
    }
  }, [trackData, onTrackUpdate]);

  // 音量変更ハンドラー
  const handleVolumeChange = useCallback((volume) => {
    setTrackSettings(prev => ({ ...prev, volume }));

    // ProjectManager更新
    if (projectManager && trackId) {
      projectManager.updateTrack(trackId, { volume });
    }

    log.audio(`🎸 Bass volume changed: ${volume}%`);
  }, [projectManager, trackId]);

  // ミュート切り替え
  const handleMuteToggle = useCallback(() => {
    setTrackSettings(prev => {
      const newMuted = !prev.muted;

      // ProjectManager更新
      if (projectManager && trackId) {
        projectManager.updateTrack(trackId, { muted: newMuted });
      }

      log.audio(`🎸 Bass ${newMuted ? 'muted' : 'unmuted'}`);

      return { ...prev, muted: newMuted };
    });
  }, [projectManager, trackId]);

  // ソロ切り替え
  const handleSoloToggle = useCallback(() => {
    setTrackSettings(prev => {
      const newSolo = !prev.solo;

      // ProjectManager更新
      if (projectManager && trackId) {
        projectManager.updateTrack(trackId, { solo: newSolo });
      }

      log.audio(`🎸 Bass solo ${newSolo ? 'enabled' : 'disabled'}`);

      return { ...prev, solo: newSolo };
    });
  }, [projectManager, trackId]);

  // EQ設定変更
  const handleEQChange = useCallback((eqSettings) => {
    if (isLoaded) {
      setBassEQ(eqSettings);
      log.audio('🎸 Bass EQ updated:', eqSettings);
    }
  }, [isLoaded, setBassEQ]);

  // ローディング状態
  if (!isLoaded && loadingProgress < 100) {
    return (
      <div className={`bass-track loading ${className}`} data-testid="bass-track-loading">
        <div className="loading-header">
          <div className="title-section">
            <h3 className="track-title">🎸 Bass Track</h3>
            <span className="loading-status">Loading bass samples...</span>
          </div>
        </div>

        <div className="loading-progress">
          <div className="progress-container">
            <div
              className="progress-bar bass-progress"
              style={{ width: `${loadingProgress}%` }}
            />
            <span className="progress-text">{loadingProgress}%</span>
          </div>

          <div className="loading-details">
            <span>Loading {getSampleInfo().length} bass samples</span>
          </div>
        </div>

        <style jsx>{`
          .bass-track.loading {
            padding: 16px;
            border: 2px solid #f59e0b;
            border-radius: 8px;
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          }

          .loading-header {
            margin-bottom: 16px;
          }

          .track-title {
            font-size: 18px;
            font-weight: 600;
            color: #92400e;
            margin: 0 0 4px 0;
          }

          .loading-status {
            color: #d97706;
            font-size: 14px;
          }

          .progress-container {
            position: relative;
            width: 100%;
            height: 8px;
            background-color: #fed7aa;
            border-radius: 4px;
            overflow: hidden;
          }

          .progress-bar.bass-progress {
            height: 100%;
            background: linear-gradient(90deg, #ea580c 0%, #dc2626 100%);
            border-radius: 4px;
            transition: width 0.3s ease;
          }

          .progress-text {
            position: absolute;
            right: 0;
            top: 12px;
            font-size: 12px;
            color: #92400e;
            font-weight: 500;
          }

          .loading-details {
            margin-top: 8px;
            font-size: 12px;
            color: #a16207;
          }
        `}</style>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className={`bass-track error ${className}`} data-testid="bass-track-error">
        <div className="error-header">
          <h3 className="track-title">🎸 Bass Track</h3>
          <div className="error-status">❌ {error}</div>
        </div>

        <div className="error-actions">
          <button
            onClick={retryInitialization}
            className="retry-button"
          >
            🔄 Retry Loading
          </button>
        </div>

        <style jsx>{`
          .bass-track.error {
            padding: 16px;
            border: 2px solid #dc2626;
            border-radius: 8px;
            background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
          }

          .error-header {
            margin-bottom: 16px;
          }

          .track-title {
            font-size: 18px;
            font-weight: 600;
            color: #991b1b;
            margin: 0 0 4px 0;
          }

          .error-status {
            color: #dc2626;
            font-size: 14px;
          }

          .retry-button {
            padding: 8px 16px;
            background-color: #dc2626;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
          }

          .retry-button:hover {
            background-color: #b91c1c;
          }
        `}</style>
      </div>
    );
  }

  // メインUI
  return (
    <div className={`bass-track ${className}`} data-testid="bass-track-loaded">
      {/* ヘッダー */}
      <div className="bass-track-header">
        <div className="track-title-section">
          <h3 className="track-title">🎸 Bass Track</h3>
          <span className="track-info">
            {trackData.notes?.length || 0} notes • {bassConfig.midiRange.min}-{bassConfig.midiRange.max}
          </span>
          {lastPlayedNote && (
            <span className="last-played">
              Last: MIDI {lastPlayedNote}
            </span>
          )}
        </div>

        <div className="bass-controls">
          {/* 音量スライダー */}
          <div className="volume-control">
            <label className="control-label">Volume</label>
            <input
              type="range"
              min="0"
              max="200"
              value={trackSettings.volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="volume-slider bass-slider"
              data-testid="bass-volume-slider"
            />
            <span className="volume-value">{trackSettings.volume}%</span>
          </div>

          {/* ミュート・ソロボタン */}
          <button
            className={`control-btn mute-btn ${trackSettings.muted ? 'active' : ''}`}
            onClick={handleMuteToggle}
            data-testid="bass-mute-button"
            title="Mute Bass Track"
          >
            {trackSettings.muted ? '🔇' : '🔊'}
          </button>

          <button
            className={`control-btn solo-btn ${trackSettings.solo ? 'active' : ''}`}
            onClick={handleSoloToggle}
            data-testid="bass-solo-button"
            title="Solo Bass Track"
          >
            S
          </button>

          {/* 設定ボタン */}
          <button
            className={`control-btn settings-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            data-testid="bass-settings-button"
            title="Bass Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* 設定パネル */}
      {showSettings && (
        <div className="bass-settings-panel" data-testid="bass-settings-panel">
          <div className="eq-section">
            <h4>Bass EQ</h4>
            <div className="eq-controls">
              <div className="eq-band">
                <label>Low (60-250Hz)</label>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  defaultValue="3"
                  onChange={(e) => handleEQChange({ lowGain: Number(e.target.value) })}
                  data-testid="bass-eq-low"
                />
              </div>
              <div className="eq-band">
                <label>Mid (250Hz-2kHz)</label>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  defaultValue="0"
                  onChange={(e) => handleEQChange({ midGain: Number(e.target.value) })}
                  data-testid="bass-eq-mid"
                />
              </div>
              <div className="eq-band">
                <label>High (2kHz+)</label>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  defaultValue="-2"
                  onChange={(e) => handleEQChange({ highGain: Number(e.target.value) })}
                  data-testid="bass-eq-high"
                />
              </div>
            </div>
          </div>

          {/* デバッグ情報 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="debug-section">
              <h4>Debug Info</h4>
              <pre>{JSON.stringify(getDebugInfo(), null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* MIDI エディタ */}
      <div className="bass-track-editor">
        <EnhancedMidiEditor
          {...bassConfig}
          notes={trackData.notes || []}
          onNoteAdd={handleNoteAdd}
          onNoteEdit={handleNoteEdit}
          onNoteDelete={handleNoteDelete}
          onNotePlay={playBassNote}
          onNoteStop={stopBassNote}
          isPlaying={isPlaying}
          currentTime={currentTime}
          className="bass-midi-editor"
          data-testid="bass-midi-editor"
        />
      </div>

      {/* Bass Track専用スタイル */}
      <style jsx>{`
        .bass-track {
          border: 2px solid #d97706;
          border-radius: 12px;
          background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
          overflow: hidden;
          margin-bottom: 16px;
        }

        .bass-track-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .track-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 4px 0;
        }

        .track-info {
          font-size: 12px;
          opacity: 0.9;
          margin-right: 8px;
        }

        .last-played {
          font-size: 11px;
          opacity: 0.8;
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 6px;
          border-radius: 10px;
        }

        .bass-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .control-label {
          font-size: 12px;
          font-weight: 500;
        }

        .volume-slider.bass-slider {
          width: 80px;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }

        .volume-value {
          font-size: 11px;
          font-weight: 500;
          min-width: 30px;
        }

        .control-btn {
          padding: 6px 8px;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .control-btn.active {
          background: rgba(255, 255, 255, 0.9);
          color: #d97706;
        }

        .bass-settings-panel {
          padding: 16px;
          background: #fef3c7;
          border-top: 1px solid #f59e0b;
        }

        .eq-section h4 {
          margin: 0 0 12px 0;
          color: #92400e;
          font-size: 14px;
          font-weight: 600;
        }

        .eq-controls {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .eq-band {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .eq-band label {
          font-size: 11px;
          color: #a16207;
          font-weight: 500;
        }

        .eq-band input[type="range"] {
          width: 100%;
          height: 4px;
          background: #fed7aa;
          border-radius: 2px;
          outline: none;
        }

        .bass-track-editor {
          padding: 16px;
          min-height: 300px;
        }

        .debug-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f59e0b;
        }

        .debug-section h4 {
          margin: 0 0 8px 0;
          color: #92400e;
          font-size: 12px;
        }

        .debug-section pre {
          font-size: 10px;
          color: #a16207;
          background: rgba(255, 255, 255, 0.5);
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
          max-height: 200px;
        }
      `}</style>
    </div>
  );
};

export default BassTrack;