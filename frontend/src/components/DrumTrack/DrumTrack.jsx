import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Drum, Play, Pause, Square, RotateCcw, Settings, Volume2, VolumeX, Trash2, Download } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import DrumTrackGrid from './DrumTrackGrid.jsx';
import DrumTrackTimeline from './DrumTrackTimeline.jsx';
import DrumTrackStatusBar from './DrumTrackStatusBar.jsx';
import useDrumTrackState from './hooks/useDrumTrackState.js';
import useDrumTrackAudio from './hooks/useDrumTrackAudio.js';
import useDrumTrackPlayback from './hooks/useDrumTrackPlayback.js';
import useDrumTrackPersistence from './hooks/useDrumTrackPersistence.js';
import drumTrackManager from '../../utils/drumTrackManager.js';
import unifiedAudioSystem from '../../utils/unifiedAudioSystem.js';
import * as Tone from 'tone';
import { 
  createDrumData, 
  updateDrumData, 
  generateMidiNotesFromGrid,
  createDrumDataFromPreset,
  PRESET_PATTERNS,
  DRUM_INSTRUMENTS,
  SYNC_GROUP_SETTINGS
} from '../../utils/drumTrackDataStructure.js';

const DrumTrack = ({ 
  trackId, 
  trackName = 'Drum Track',
  trackColor = '#3B82F6',
  drumData,
  onDrumDataUpdate,
  isActive = true,
  onOpenSettings,
  appSettings,
  globalTempo = 120,
  onGlobalTempoChange,
  projectManager,
  trackVolume = 75,
  trackMuted = false
}) => {
  // 状態管理フックの使用
  const state = useDrumTrackState();
  
  // グローバルBPMを状態に反映
  useEffect(() => {
    if (globalTempo !== state.tempo) {
      state.setTempo(globalTempo);
    }
  }, [globalTempo, state]);
  
  // 永続化フックの使用
  const persistence = useDrumTrackPersistence();
  
  // オーディオフックの使用
  const audio = useDrumTrackAudio();
  
  // SF2ファイルの読み込み状態
  const [sf2Loaded, setSf2Loaded] = useState(false);
  
  // SF2ファイルの読み込み状態を監視
  useEffect(() => {
    const checkSF2Status = () => {
      // audioオブジェクトの内部状態を確認
      if (audio && audio.isInitialized) {
        // WebAudioFontPlayerの状態を確認
        const player = audio.playerRef?.current;
        if (player && player.sf2Loaded) {
          setSf2Loaded(true);
        } else {
          setSf2Loaded(false);
        }
      } else {
        setSf2Loaded(false);
      }
    };
    
    // 初期チェック
    checkSF2Status();
    
    // 定期的にチェック
    const interval = setInterval(checkSF2Status, 1000);
    
    return () => clearInterval(interval);
  }, [audio]);
  
  // 再生フックの使用
  const playback = useDrumTrackPlayback({
    state,
    audio,
    trackId,
    onDrumDataUpdate
  });
  
  // 元のドラムデータを保持
  const [originalDrumData, setOriginalDrumData] = useState(null);
  
  // 再生状態の管理用Ref
  const isPlayingRef = useRef(false);
  
  // 再生状態をRefと同期
  useEffect(() => {
    isPlayingRef.current = state.isPlaying;
  }, [state.isPlaying]);

  // ドラム音のテスト関数
  const testDrumSound = useCallback(async (instrument) => {
    console.log('🥁 Testing drum sound:', instrument);
    
    try {
      // トラック指定ありでドラム音を再生
      await unifiedAudioSystem.playDrumSoundWithTrackSettings(instrument.pitch.toString(), instrument.velocity, trackId);
      
      console.log('✅ Drum sound played successfully');
    } catch (error) {
      console.error('❌ Drum sound test failed:', error);
    }
  }, [trackId]);

  // デバッグ用にグローバル関数として公開
  useEffect(() => {
    window.testDrumSound = testDrumSound;
    
    // デバッグ情報表示関数
    window.checkDrumState = () => {
      console.log('🥁 Drum Track Debug Info:', {
        trackId,
        isInitialized: state.isInitialized,
        audioEnabled: state.audioEnabled,
        isPlaying: state.isPlaying,
        hasInstruments: !!state.instruments,
        instrumentsCount: state.instruments?.length || 0,
        hasGrid: !!state.grid,
        gridSize: state.grid ? `${state.grid.length}x${state.grid[0]?.length}` : 'none',
        unifiedAudioSystemInit: unifiedAudioSystem.isInitialized,
        hasAudioContext: !!Tone,
        audioContextState: Tone?.context?.state || 'unknown'
      });
      
      // UnifiedAudioSystemの詳細状態
      console.log('🥁 UnifiedAudioSystem Details:', {
        initialized: unifiedAudioSystem.isInitialized,
        tracksCount: unifiedAudioSystem.tracks?.size || 0,
        hasDrumTrack: unifiedAudioSystem.tracks?.has('drum-track') || false,
        drumKitAvailable: !!unifiedAudioSystem.drumKit,
        drumKitKeys: unifiedAudioSystem.drumKit ? Object.keys(unifiedAudioSystem.drumKit) : []
      });
      
      if (state.instruments) {
        console.log('🥁 Available instruments:', state.instruments.map((inst, i) => ({
          index: i,
          name: inst.name,
          pitch: inst.pitch
        })));
      }
    };
    
    // UnifiedAudioSystemテスト関数
    window.testUnifiedAudioSystem = async () => {
      console.log('🥁 Testing UnifiedAudioSystem...');
      try {
        // エラーを無視して初期化確認
        console.log('🥁 Current UnifiedAudioSystem state:', {
          isInitialized: unifiedAudioSystem.isInitialized,
          hasAudioContext: !!Tone,
          audioContextState: Tone?.context?.state
        });
        
        // AudioContextを直接開始
        if (Tone && Tone.context.state !== 'running') {
          console.log('🥁 Starting AudioContext...');
          try {
            await Tone.start();
            console.log('✅ AudioContext started:', Tone.context.state);
          } catch (error) {
            console.error('❌ Failed to start AudioContext:', error);
            console.log('💡 Try clicking anywhere on the page first to enable audio');
            return;
          }
        }
        
        // 簡単なテスト音を直接作成（音量を上げて）
        console.log('🥁 Creating simple test drum...');
        const testDrum = new Tone.MembraneSynth({
          volume: 0 // 0dBで大きな音で
        }).toDestination();
        testDrum.triggerAttackRelease('C2', '8n');
        console.log('✅ Simple test drum played');
        
        // 少し待ってからクリーンアップ
        // さらに大音量のメタル音をテスト
        setTimeout(() => {
          console.log('🥁 Testing loud MetalSynth...');
          const loudMetal = new Tone.MetalSynth({
            volume: 5 // +5dBで非常に大きな音
          }).toDestination();
          loudMetal.triggerAttackRelease('8n');
          console.log('✅ Loud MetalSynth played');
          
          setTimeout(() => {
            testDrum.dispose();
            loudMetal.dispose();
            console.log('✅ All test drums cleaned up');
          }, 500);
        }, 500);
        
      } catch (error) {
        console.error('❌ UnifiedAudioSystem test failed:', error);
      }
    };

    // グローバルテスト関数を定義
    window.testDirectSound = async () => {
      console.log('🔊 Testing direct sound with maximum volume...');
      try {
        await Tone.start();
        console.log('AudioContext state:', Tone.context.state);
        
        // 最大音量でテスト
        const loudSynth = new Tone.Oscillator(440, 'sine').toDestination();
        loudSynth.volume.value = 10; // +10dB 非常に大きな音
        loudSynth.start();
        
        setTimeout(() => {
          loudSynth.stop();
          loudSynth.dispose();
          console.log('✅ Direct sound test completed');
        }, 500);
        
      } catch (error) {
        console.error('❌ Direct sound test failed:', error);
      }
    };

    window.testSystemVolume = async () => {
      console.log('🔊 Testing system volume with Web Audio API...');
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext state:', audioCtx.state);
        
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = 440;
        gainNode.gain.value = 1.0; // 最大音量
        
        oscillator.start();
        
        setTimeout(() => {
          oscillator.stop();
          console.log('✅ System volume test completed');
        }, 500);
        
      } catch (error) {
        console.error('❌ System volume test failed:', error);
      }
    };

    window.testDrumSynthDirect = async () => {
      console.log('🔊 Testing drum synth directly...');
      try {
        await Tone.start();
        console.log('AudioContext state:', Tone.context.state);
        
        // 同じ設定でMetalSynthを作成
        const testMetalSynth = new Tone.MetalSynth({
          volume: 5, // +5dB
          envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
          harmonicity: 5.1,
          modulationIndex: 32,
          resonance: 4000,
          octaves: 1.5
        }).toDestination();
        
        console.log('Created test MetalSynth:', {
          volume: testMetalSynth.volume.value,
          disposed: testMetalSynth.disposed
        });
        
        testMetalSynth.triggerAttackRelease('8n');
        console.log('✅ Direct MetalSynth triggered');
        
        setTimeout(() => {
          testMetalSynth.dispose();
          console.log('✅ Test MetalSynth cleaned up');
        }, 1000);
        
      } catch (error) {
        console.error('❌ Direct drum synth test failed:', error);
      }
    };
    
    return () => {
      delete window.testDirectSound;
      delete window.testSystemVolume;
      delete window.testDrumSynthDirect;
      delete window.checkDrumState;
      delete window.testUnifiedAudioSystem;
    };
  }, [testDrumSound, trackId, state]);
  
  // Refs
  const containerRef = useRef(null);
  const gridRef = useRef(null);
  
  // トラック音量・ミュート設定の適用
  useEffect(() => {
    if (trackId && window.unifiedAudioSystem) {
      // トラックが存在しない場合は追加
      if (!window.unifiedAudioSystem.tracks.has(trackId)) {
        window.unifiedAudioSystem.addTrack(trackId, trackName, 'drums', trackColor, null);
      }
      
      // 音量とミュート設定を適用
      const normalizedVolume = trackVolume / 100;
      window.unifiedAudioSystem.setTrackVolume(trackId, normalizedVolume);
      window.unifiedAudioSystem.setTrackMuted(trackId, trackMuted);
      
      console.log('🥁 DrumTrack: Applied track settings:', {
        trackId,
        volume: normalizedVolume,
        muted: trackMuted
      });
    }
  }, [trackId, trackName, trackColor, trackVolume, trackMuted]);

  // 初期化処理
  useEffect(() => {
    if (trackId && isActive) {
      // ドラムトラックマネージャーからデータを取得または作成
      let trackData = drumTrackManager.getDrumTrack(trackId);
      
      if (!trackData) {
        // 新しいドラムトラックを作成
        trackData = drumTrackManager.createDrumTrack(trackId);
        if (!trackData) {
          console.error('❌ Failed to create drum track:', trackId);
          return;
        }
      }
      
      // 既存のdrumDataがある場合は統合
      if (drumData) {
        trackData = updateDrumData(trackData, {
          grid: drumData.grid || trackData.grid,
          instruments: drumData.instruments || trackData.instruments,
          tempo: drumData.tempo || trackData.tempo,
          timeSignature: drumData.timeSignature || trackData.timeSignature
        });
        
        // 更新されたデータを保存
        drumTrackManager.updateDrumTrack(trackId, trackData);
      }
      
      // 状態の初期化（必ず有効なデータを設定）
      if (!state.isInitialized) {
        // 全体のデータを組み合わせて生成
        const playbackData = drumTrackManager.getPlaybackData(trackId, 32);
        
        if (playbackData) {
          // グリッドデータの検証と設定
          const grid = playbackData.grid && Array.isArray(playbackData.grid) && playbackData.grid.length > 0 
            ? playbackData.grid 
            : Array(8).fill().map(() => Array(32 * 16).fill(false)); // 32小節分
          
          // 楽器データの検証と設定
          const instruments = playbackData.instruments && Array.isArray(playbackData.instruments) && playbackData.instruments.length > 0
            ? playbackData.instruments
            : DRUM_INSTRUMENTS;
          
          // テンポと拍子記号の設定
          const tempo = playbackData.tempo || 120;
          const timeSignature = playbackData.timeSignature || '4/4';
          

          
          state.setGrid(grid);
          state.setInstruments(instruments);
          state.setTempo(tempo);
          state.setTimeSignature(timeSignature);
          state.setIsInitialized(true);
          setOriginalDrumData(trackData);
          

        } else {
          console.error('❌ Failed to get playback data for initialization');
        }
      }
    }
  }, [trackId, isActive, drumData, state, globalTempo]);
  
  // データ同期処理（親からの更新のみを反映）
  useEffect(() => {
    if (trackId && isActive && state.isInitialized && drumData) {
      // 親からのdrumDataプロパティが変更された場合のみ同期
      const trackData = drumTrackManager.getDrumTrack(trackId);
      if (trackData) {
        let hasChanges = false;
        
        // 楽器データの変更をチェック（グリッドは除外）
        if (drumData.instruments && JSON.stringify(drumData.instruments) !== JSON.stringify(state.instruments)) {
          state.setInstruments(drumData.instruments);
          hasChanges = true;
        }
        
        // テンポの変更をチェック
        if (drumData.tempo && drumData.tempo !== state.tempo) {
          state.setTempo(drumData.tempo);
          hasChanges = true;
        }
        
        // 拍子記号の変更をチェック
        if (drumData.timeSignature && drumData.timeSignature !== state.timeSignature) {
          state.setTimeSignature(drumData.timeSignature);
          hasChanges = true;
        }
        
        // グリッドデータは親からの強制更新の場合のみ反映
        if (drumData.forceGridUpdate && drumData.grid && JSON.stringify(drumData.grid) !== JSON.stringify(state.grid)) {
          state.setGrid(drumData.grid);
          hasChanges = true;
        }
        
        if (hasChanges) {
          console.log('🥁 DrumTrack: Synced changes from parent');
        }
      }
    }
  }, [trackId, isActive, state.isInitialized, drumData]); // 状態値を依存配列から除外して無限ループを防ぐ
  
  // コンポーネントのクリーンアップ処理（依存配列を修正して無限ループを防ぐ）
  useEffect(() => {
    return () => {
      // コンポーネントのアンマウント時にクリーンアップ
      console.log('🥁 DrumTrack: Cleaning up component');
      
      // 再生を停止
      if (playback && playback.stopPlayback) {
        playback.stopPlayback();
      }
      
      // オーディオリソースをクリーンアップ
      if (audio && audio.stopAudio) {
        audio.stopAudio();
      }
      
      // 状態をリセット
      if (state && state.setIsPlaying) {
        state.setIsPlaying(false);
      }
      
      // ドラムトラックマネージャーからトラックを削除（必要に応じて）
      if (trackId && drumTrackManager) {
        // 注意: データは保持するが、再生状態はクリア
        console.log('🥁 DrumTrack: Component cleanup completed');
      }
    };
  }, [trackId]); // 依存配列を最小限に制限
  
  // スペースキーでの再生/停止制御（タイムラインクリック位置対応）
  useEffect(() => {
    const handleSpaceKey = async (e) => {
      // スペースキーが押された場合のみ処理
      if (e.code === 'Space') {
        // 入力フィールドにフォーカスがある場合は無視
        const activeElement = document.activeElement;
        if (activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.contentEditable === 'true'
        )) {
          return;
        }
        
        e.preventDefault();
        
        try {
          if (isPlayingRef.current) {
            // 再生中の場合は停止
            console.log('🥁 Space key: Stopping playback');
            playback.stopPlayback();
          } else {
            // 停止中の場合は再生開始（lastClickPositionがある場合はそこから）
            console.log('🥁 Space key: Starting playback from last position');
            await playback.startPlayback();
          }
        } catch (error) {
          console.error('❌ Space key playback error:', error);
        }
      }
    };

    // イベントリスナーを追加
    document.addEventListener('keydown', handleSpaceKey);
    
    // クリーンアップ
    return () => {
      document.removeEventListener('keydown', handleSpaceKey);
    };
  }, [playback]); // playbackが変更されたときのみ再設定

  // グリッドセルのトグル処理（同期グループ対応）
  const handleCellToggle = useCallback((rowIndex, stepIndex) => {
    if (!trackId || !state.isInitialized) return;
    
    // 現在の小節の同期グループを取得
    const currentBarIndex = Math.floor(stepIndex / 16);
    const currentSyncGroup = drumTrackManager.getBarSyncGroup(trackId, currentBarIndex);
    
    // 同期グループのグリッドデータを取得
    let syncGroupGrid = drumTrackManager.getSyncGroupGrid(trackId, currentSyncGroup);
    if (!syncGroupGrid) {
      // 同期グループのグリッドが存在しない場合は作成
      syncGroupGrid = Array(8).fill().map(() => Array(16).fill(false));
    }
    
    // グリッド内の位置を計算（16ステップベース）
    const gridCol = stepIndex % 16;
    
    // セルのトグル
    const newSyncGroupGrid = syncGroupGrid.map((row, i) => {
      if (i === rowIndex) {
        return row.map((cell, j) => j === gridCol ? !cell : cell);
      }
      return row;
    });
    
    // 同期グループのグリッドを更新
    drumTrackManager.updateSyncGroupGrid(trackId, currentSyncGroup, newSyncGroupGrid);
    
    // 全体データを自動更新（各同期グループのデータを組み合わせ）
    drumTrackManager.updateCombinedData(trackId, 32);
    
    // 更新された全体データを取得
    const playbackData = drumTrackManager.getPlaybackData(trackId, 32);
    
    if (playbackData) {
      // 現在表示中のグリッドを更新（即座に反映）
      state.setGrid(playbackData.grid);
      
      // 履歴に保存
      persistence.addToHistory({
        grid: playbackData.grid,
        instruments: playbackData.instruments,
        tempo: playbackData.tempo,
        timeSignature: playbackData.timeSignature,
        syncGroup: currentSyncGroup,
        syncGroups: state.syncGroups
      }, `Toggle cell at row ${rowIndex}, step ${stepIndex} in group ${currentSyncGroup}`);
      
      // 親コンポーネントに更新を通知
      setTimeout(() => {
        if (onDrumDataUpdate) {
          const trackData = drumTrackManager.getDrumTrack(trackId);
          if (trackData) {
            onDrumDataUpdate({
              ...trackData,
              grid: playbackData.grid,
              instruments: playbackData.instruments,
              tempo: playbackData.tempo,
              timeSignature: playbackData.timeSignature,
              totalBars: playbackData.totalBars,
              totalDuration: playbackData.totalDuration,
              forceGridUpdate: false
            });
          }
        }
      }, 0);
      
      // 即座に再描画を要求
      state.setNeedsRedraw(true);
      
      console.log('🥁 Cell toggled and combined data updated:', {
        rowIndex,
        stepIndex,
        currentSyncGroup,
        totalBars: playbackData.totalBars,
        totalDuration: playbackData.totalDuration
      });
    }
  }, [trackId, state.isInitialized, state.syncGroups, persistence, onDrumDataUpdate]);
  
  // 楽器の変更処理
  const handleInstrumentChange = useCallback((rowIndex, newInstrument) => {
    if (!trackId || !state.isInitialized) return;
    
    const newInstruments = [...state.instruments];
    newInstruments[rowIndex] = newInstrument;
    
    state.setInstruments(newInstruments);
    
    // 履歴に保存
    persistence.addToHistory({
      grid: state.grid,
      instruments: newInstruments,
      tempo: state.tempo,
      timeSignature: state.timeSignature
    }, `Change instrument ${rowIndex} to ${newInstrument.name}`);
    
    // ドラムトラックマネージャーを更新
    const updatedData = updateDrumData(
      drumTrackManager.getDrumTrack(trackId) || createDrumData(trackId),
      {
        grid: state.grid,
        instruments: newInstruments,
        tempo: state.tempo,
        timeSignature: state.timeSignature
      }
    );
    
    drumTrackManager.updateDrumTrack(trackId, updatedData);
    
    // 親コンポーネントに更新を通知
    setTimeout(() => {
      if (onDrumDataUpdate) {
        onDrumDataUpdate({
          ...updatedData,
          forceGridUpdate: false // 楽器変更ではグリッドは更新しない
        });
      }
    }, 0);
  }, [trackId, state.isInitialized, persistence, onDrumDataUpdate]); // 状態値を依存配列から除外して無限ループを防ぐ
  
  // 同期グループ変更ハンドラー（改善版）
  const handleSyncGroupChange = useCallback((newSyncGroup, barIndex) => {
    if (!trackId || !state.isInitialized) return;
    
    console.log('🥁 Changing sync group for bar', barIndex, 'to', newSyncGroup);
    
    // ドラムトラックマネージャーで小節の同期グループを設定
    const success = drumTrackManager.setBarSyncGroup(trackId, barIndex, newSyncGroup);
    
    if (success) {
      // 特定の小節の同期グループを更新
      const updatedSyncGroups = new Map(state.syncGroups);
      updatedSyncGroups.set(barIndex, newSyncGroup);
      state.setSyncGroups(updatedSyncGroups);
      
      // 現在選択されている同期グループも更新
      state.setSyncGroup(newSyncGroup);
      
      // --- 追加: 同期グループに属する全小節のノート（グリッド）も即時更新 ---
      // 1. そのグループに属する全小節を列挙
      const drumData = drumTrackManager.getDrumTrack(trackId);
      if (drumData) {
        const maxBars = 32;
        for (let i = 0; i < maxBars; i++) {
          const group = drumTrackManager.getBarSyncGroup(trackId, i);
          if (group === newSyncGroup) {
            // 2. その小節のグリッドを新しいグループのグリッドで上書き
            const groupGrid = drumTrackManager.getSyncGroupGrid(trackId, newSyncGroup);
            if (groupGrid) {
              drumTrackManager.updateSyncGroupGrid(trackId, newSyncGroup, groupGrid);
            }
          }
        }
        // 3. 全体データを再構成
        drumTrackManager.updateCombinedData(trackId, maxBars);
        // 4. UIに即時反映
        const playbackData = drumTrackManager.getPlaybackData(trackId, maxBars);
        if (playbackData) {
          state.setGrid(playbackData.grid);
        }
      }
      // --- ここまで追加 ---
      
      // 履歴に保存
      persistence.addToHistory({
        grid: state.grid,
        instruments: state.instruments,
        tempo: state.tempo,
        timeSignature: state.timeSignature,
        syncGroup: newSyncGroup,
        syncGroups: updatedSyncGroups
      }, `Change sync group for bar ${barIndex} to ${newSyncGroup}`);
      
      // 親コンポーネントに更新を通知
      setTimeout(() => {
        if (onDrumDataUpdate) {
          const trackData = drumTrackManager.getDrumTrack(trackId);
          if (trackData) {
            onDrumDataUpdate({
              ...trackData,
              syncGroup: newSyncGroup,
              syncGroups: updatedSyncGroups,
              trackId: trackId
            });
          }
        }
      }, 0);
      
      // 即座に再描画を要求
      state.setNeedsRedraw(true);
      
      console.log('🥁 Sync group changed successfully');
    } else {
      console.error('❌ Failed to change sync group');
    }
  }, [trackId, state.isInitialized, persistence, onDrumDataUpdate]);
  
  // グリッドのクリア処理
  const handleClearGrid = useCallback(() => {
    if (!trackId || !state.isInitialized) return;
    
    const newGrid = Array(state.grid.length).fill().map(() => 
      Array(state.grid[0].length).fill(false)
    );
    
    state.setGrid(newGrid);
    
    // 履歴に保存
    persistence.addToHistory({
      grid: newGrid,
      instruments: state.instruments,
      tempo: state.tempo,
      timeSignature: state.timeSignature
    }, 'Clear grid');
    
    // ドラムトラックマネージャーを更新
    const updatedData = updateDrumData(
      drumTrackManager.getDrumTrack(trackId) || createDrumData(trackId),
      {
        grid: newGrid,
        instruments: state.instruments,
        tempo: state.tempo,
        timeSignature: state.timeSignature
      }
    );
    
    drumTrackManager.updateDrumTrack(trackId, updatedData);
    
    // 親コンポーネントに更新を通知
    setTimeout(() => {
      if (onDrumDataUpdate) {
        onDrumDataUpdate({
          ...updatedData,
          forceGridUpdate: true // グリッドクリアでは強制更新
        });
      }
    }, 0);
  }, [trackId, state.isInitialized, persistence, onDrumDataUpdate]); // 状態値を依存配列から除外して無限ループを防ぐ
  
  // 巻き戻し機能
  const handleUndo = useCallback(() => {
    if (!trackId || !state.isInitialized) return;
    
    const previousState = persistence.restoreFromHistory('undo');
    
    if (previousState) {
      state.setGrid(previousState.grid);
      state.setInstruments(previousState.instruments);
      state.setTempo(previousState.tempo);
      state.setTimeSignature(previousState.timeSignature);
      
      // 親コンポーネントに更新を通知
      setTimeout(() => {
        if (onDrumDataUpdate) {
          const updateData = {
            grid: previousState.grid,
            instruments: previousState.instruments,
            tempo: previousState.tempo,
            timeSignature: previousState.timeSignature,
            trackId: trackId,
            lastModified: new Date().toISOString(),
            metadata: {
              modified: new Date().toISOString(),
              cellCount: previousState.grid.flat().filter(cell => cell).length
            }
          };
          onDrumDataUpdate(updateData);
        }
      }, 0);
    }
  }, [trackId, state.isInitialized, persistence, onDrumDataUpdate]);
  
  // テンポ変更処理
  const handleTempoChange = useCallback((newTempo) => {
    state.setTempo(newTempo);
    
    if (onGlobalTempoChange) {
      onGlobalTempoChange(newTempo);
    }
    
    // 親コンポーネントに更新を通知
    setTimeout(() => {
      if (onDrumDataUpdate) {
        const updateData = {
          grid: state.grid,
          instruments: state.instruments,
          tempo: newTempo,
          timeSignature: state.timeSignature,
          trackId: trackId,
          lastModified: new Date().toISOString(),
          metadata: {
            modified: new Date().toISOString(),
            cellCount: state.grid.flat().filter(cell => cell).length
          }
        };
        onDrumDataUpdate(updateData);
      }
    }, 0);
  }, [onGlobalTempoChange, onDrumDataUpdate, trackId]); // 状態値を依存配列から除外して無限ループを防ぐ
  
  // アクティブセルの数を計算
  const activeCellCount = useMemo(() => {
    return state.grid ? state.grid.flat().filter(cell => cell).length : 0;
  }, [state.grid]);
  
  // 総再生時間を計算（拡張版）
  const totalDuration = useMemo(() => {
    if (!state.grid || !state.grid[0]) return 0;
    
    // 全体の統計情報を取得
    const combinedStats = drumTrackManager.getCombinedStats(trackId, 32);
    if (combinedStats) {
      return combinedStats.totalDuration; // 秒単位
    }
    
    // フォールバック計算
    const gridColumns = state.grid[0].length;
    const stepDuration = 60 / state.tempo / 4; // 16分音符の長さ
    return stepDuration * gridColumns;
  }, [state.grid, state.tempo, trackId]);
  
  // 総小節数を計算
  const totalBars = useMemo(() => {
    if (!state.grid || !state.grid[0]) return 0;
    return Math.ceil(state.grid[0].length / 16); // 16ステップ = 1小節
  }, [state.grid]);

  // プリセットパターンの読み込み
  const loadPresetPattern = useCallback((patternName) => {
    if (!trackId || !state.isInitialized) return;
    
    const preset = PRESET_PATTERNS[patternName];
    if (!preset) {
      console.warn('Preset pattern not found:', patternName);
      return;
    }
    
    // プリセットデータを作成
    const presetData = createDrumDataFromPreset(trackId, patternName);
    
    // 状態を更新
    state.setGrid(presetData.grid);
    state.setInstruments(presetData.instruments);
    state.setTempo(presetData.tempo);
    state.setTimeSignature(presetData.timeSignature);
    
    // 履歴に保存
    persistence.addToHistory({
      grid: presetData.grid,
      instruments: presetData.instruments,
      tempo: presetData.tempo,
      timeSignature: presetData.timeSignature
    }, `Load preset: ${preset.name}`);
    
    // ドラムトラックマネージャーを更新
    drumTrackManager.updateDrumTrack(trackId, presetData);
    
    // 親コンポーネントに更新を通知
    setTimeout(() => {
      if (onDrumDataUpdate) {
        onDrumDataUpdate(presetData);
      }
    }, 0);
    
    console.log('🥁 Loaded preset pattern:', patternName, presetData);
  }, [trackId, state.isInitialized, persistence, onDrumDataUpdate]);

  // 同期グループ管理のテスト機能
  const testSyncGroupManagement = useCallback(() => {
    if (!trackId || !state.isInitialized) return;
    
    console.log('🥁 Testing sync group management...');
    
    // 各小節に異なる同期グループを設定
    for (let i = 0; i < 8; i++) {
      const groupId = SYNC_GROUP_SETTINGS.availableGroups[i % SYNC_GROUP_SETTINGS.availableGroups.length];
      drumTrackManager.setBarSyncGroup(trackId, i, groupId);
    }
    
    // 同期グループAにテストデータを設定
    const testGridA = Array(8).fill().map(() => Array(16).fill(false));
    testGridA[0][0] = true; // キックドラム
    testGridA[1][4] = true; // スネアドラム
    testGridA[2][0] = true; // ハイハット
    testGridA[2][4] = true; // ハイハット
    testGridA[2][8] = true; // ハイハット
    testGridA[2][12] = true; // ハイハット
    
    drumTrackManager.updateSyncGroupGrid(trackId, 'A', testGridA);
    
    // 同期グループBに異なるテストデータを設定
    const testGridB = Array(8).fill().map(() => Array(16).fill(false));
    testGridB[0][0] = true; // キックドラム
    testGridB[0][8] = true; // キックドラム
    testGridB[1][4] = true; // スネアドラム
    testGridB[1][12] = true; // スネアドラム
    testGridB[3][0] = true; // クラッシュ
    testGridB[3][8] = true; // クラッシュ
    
    drumTrackManager.updateSyncGroupGrid(trackId, 'B', testGridB);
    
    // 同期グループCに別のパターンを設定
    const testGridC = Array(8).fill().map(() => Array(16).fill(false));
    testGridC[0][0] = true; // キックドラム
    testGridC[0][6] = true; // キックドラム
    testGridC[0][12] = true; // キックドラム
    testGridC[1][4] = true; // スネアドラム
    testGridC[1][12] = true; // スネアドラム
    testGridC[2][2] = true; // ハイハット
    testGridC[2][6] = true; // ハイハット
    testGridC[2][10] = true; // ハイハット
    testGridC[2][14] = true; // ハイハット
    
    drumTrackManager.updateSyncGroupGrid(trackId, 'C', testGridC);
    
    // 全体データを自動更新
    drumTrackManager.updateCombinedData(trackId, 32);
    
    // 更新された全体データを取得して状態を更新
    const playbackData = drumTrackManager.getPlaybackData(trackId, 32);
    if (playbackData) {
      state.setGrid(playbackData.grid);
      state.setInstruments(playbackData.instruments);
      state.setTempo(playbackData.tempo);
      state.setTimeSignature(playbackData.timeSignature);
    }
    
    // 状態を更新
    state.setNeedsRedraw(true);
    
    console.log('🥁 Sync group management test completed with combined data');
  }, [trackId, state.isInitialized, state]);

  // 同期グループの統計情報を表示
  const showSyncGroupStats = useCallback(() => {
    if (!trackId) return;
    
    const stats = drumTrackManager.getSyncGroupStats(trackId);
    console.log('🥁 Sync Group Stats:', stats);
    
    const mapping = drumTrackManager.getBarSyncGroupsMapping(trackId);
    console.log('🥁 Bar Sync Groups Mapping:', Array.from(mapping.entries()));
    
    const combinedStats = drumTrackManager.getCombinedStats(trackId, 32);
    console.log('🥁 Combined Stats:', combinedStats);
    
    const playbackData = drumTrackManager.getPlaybackData(trackId, 32);
    console.log('🥁 Playback Data:', {
      totalBars: playbackData?.totalBars,
      totalSteps: playbackData?.totalSteps,
      totalDuration: playbackData?.totalDuration,
      cellCount: playbackData?.grid?.flat().filter(cell => cell).length
    });
  }, [trackId]);
  
  // キーボードイベントハンドラー
  const handleKeyDown = useCallback((e) => {
    if (!isActive) return;
    
    switch (e.key) {
      case 'Escape':
        try { e.preventDefault(); } catch (error) { console.warn('preventDefault failed:', error); }
        // 選択状態をクリア（必要に応じて実装）
        break;
      case ' ':
        try { e.preventDefault(); } catch (error) { console.warn('preventDefault failed:', error); }
        // 再生/一時停止
        if (isPlayingRef.current) {
          playback.pausePlayback();
        } else {
          playback.startPlayback();
        }
        break;
      case 'Home':
        try { e.preventDefault(); } catch (error) { console.warn('preventDefault failed:', error); }
        // 最初に移動
        state.setCurrentTime(0);
        state.setNeedsRedraw(true);
        break;
      case 'End':
        try { e.preventDefault(); } catch (error) { console.warn('preventDefault failed:', error); }
        // 最後に移動
        const maxTime = totalDuration;
        state.setCurrentTime(maxTime);
        state.setNeedsRedraw(true);
        break;
      case 'ArrowLeft':
        try { e.preventDefault(); } catch (error) { console.warn('preventDefault failed:', error); }
        // 左にスクロール（グリッドに通知）
        if (gridRef.current && gridRef.current.smoothScrollTo) {
          gridRef.current.smoothScrollTo(Math.max(0, (gridRef.current.scrollX || 0) - 100), gridRef.current.scrollY || 0, 200);
        }
        break;
      case 'ArrowRight':
        try { e.preventDefault(); } catch (error) { console.warn('preventDefault failed:', error); }
        // 右にスクロール（グリッドに通知）
        if (gridRef.current && gridRef.current.smoothScrollTo) {
          gridRef.current.smoothScrollTo((gridRef.current.scrollX || 0) + 100, gridRef.current.scrollY || 0, 200);
        }
        break;
      case 'ArrowUp':
        try { e.preventDefault(); } catch (error) { console.warn('preventDefault failed:', error); }
        // 上にスクロール（グリッドに通知）
        if (gridRef.current && gridRef.current.smoothScrollTo) {
          gridRef.current.smoothScrollTo(gridRef.current.scrollX || 0, Math.max(0, (gridRef.current.scrollY || 0) - 50), 200);
        }
        break;
      case 'ArrowDown':
        try { e.preventDefault(); } catch (error) { console.warn('preventDefault failed:', error); }
        // 下にスクロール（グリッドに通知）
        if (gridRef.current && gridRef.current.smoothScrollTo) {
          const maxScrollY = Math.max(0, (state.grid?.length || 8) * 50 - 400);
          gridRef.current.smoothScrollTo(gridRef.current.scrollX || 0, Math.min(maxScrollY, (gridRef.current.scrollY || 0) + 50), 200);
        }
        break;
      default:
        return;
    }
  }, [isActive, isPlayingRef, playback, state, totalDuration]);
  
  // キーボードイベントリスナーの設定
  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isActive, handleKeyDown]);
  
  return (
    <div 
      className="flex flex-col bg-gray-900 text-white drum-track-container h-full max-h-screen"
      style={{ 
        overscrollBehavior: 'none',
        overflowX: 'hidden',
        overflowY: 'hidden',
      }}
    >
      {/* 操作ツールバー */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-800 border-b border-gray-600">
        {/* 左側：操作ボタン */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={!state.isInitialized || !persistence.getHistoryInfo().canUndo}
            className="h-6 px-2 text-xs"
            title="元に戻す"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            元に戻す
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearGrid}
            className="h-6 px-2 text-xs"
            title="グリッドをクリア"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            クリア
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadPresetPattern('basic_rock')}
            className="h-6 px-2 text-xs"
            title="プリセット読み込み (Basic Rock)"
          >
            <Download className="h-3 w-3 mr-1" />
            ロック
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadPresetPattern('funk')}
            className="h-6 px-2 text-xs"
            title="プリセット読み込み (Funk)"
          >
            <Download className="h-3 w-3 mr-1" />
            ファンク
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadPresetPattern('jazz')}
            className="h-6 px-2 text-xs"
            title="プリセット読み込み (Jazz)"
          >
            <Download className="h-3 w-3 mr-1" />
            ジャズ
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadPresetPattern('latin')}
            className="h-6 px-2 text-xs"
            title="プリセット読み込み (Latin)"
          >
            <Download className="h-3 w-3 mr-1" />
            ラテン
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadPresetPattern('electronic')}
            className="h-6 px-2 text-xs"
            title="プリセット読み込み (Electronic)"
          >
            <Download className="h-3 w-3 mr-1" />
            エレクトロ
          </Button>
          
          {/* 楽器テストボタン */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => testDrumSound(state.instruments[0])}
            className="h-6 px-2 text-xs"
            title="楽器テスト"
          >
            🥁 テスト
          </Button>
        </div>
        
        {/* 右側：テンポ調整 */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-300">テンポ:</span>
          <input
            type="number"
            value={globalTempo}
            onChange={(e) => handleTempoChange(parseInt(e.target.value) || 120)}
            className="w-16 h-6 text-xs bg-gray-700 border border-gray-600 rounded px-2 text-white"
            min="60"
            max="200"
          />
        </div>
      </div>

      {/* 開発者モードの追加コントロール */}
      {appSettings?.drumTrack?.developerMode && (
        <div className="flex items-center gap-2 px-4 py-1 bg-gray-700 border-b border-gray-600">
          <span className="text-xs text-gray-300 font-medium">開発者モード:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={testSyncGroupManagement}
            className="text-xs h-6 px-2"
          >
            同期グループテスト
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={showSyncGroupStats}
            className="text-xs h-6 px-2"
          >
            統計表示
          </Button>
        </div>
      )}

      {/* ステータスバー */}
      {appSettings?.drumTrack?.developerMode && (
        <DrumTrackStatusBar
          // トラック情報
          trackName={trackName}
          trackColor={trackColor}
          
          // グリッド情報
          gridSize={`${state.grid?.length || 0}x${state.grid?.[0]?.length || 0}`}
          activeCellCount={activeCellCount}
          
          // 全体統計情報
          totalBars={totalBars}
          totalDuration={totalDuration}
          
          // オーディオ・再生状態
          audioEnabled={state.audioEnabled}
          isPlaying={state.isPlaying}
          tempo={globalTempo}
          loopEnabled={state.loopEnabled}
          metronomeEnabled={state.metronomeEnabled}
          
          // SF2状態
          sf2Loaded={sf2Loaded}
          
          // 時間情報
          currentTime={state.currentTime}
          playbackDuration={state.playbackDuration}
        />
      )}

      {/* ドラムトラックグリッド */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <DrumTrackGrid
          ref={gridRef}
          containerRef={containerRef}
          
          // 状態管理
          state={state}
          
          // イベントハンドラー
          onCellToggle={handleCellToggle}
          onInstrumentChange={handleInstrumentChange}
          onSyncGroupChange={handleSyncGroupChange}
          
          // 再生関連
          isPlaying={state.isPlaying}
          currentTime={state.currentTime}
          tempo={state.tempo}
          timeSignature={state.timeSignature}
          
          // オーディオ関連
          audioEnabled={state.audioEnabled}
          audio={audio}
          
          // トラックID
          trackId={trackId}
          
          // タイムライン関連のprops
          onPlayPause={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
              if (isPlayingRef.current) {
                playback.pausePlayback();
              } else {
                await playback.startPlayback();
              }
            } catch (error) {
              console.error('❌ Playback error:', error);
            }
          }}
          onStop={() => {
            playback.stopPlayback();
          }}
          onRewind={() => {
            // 巻き戻し機能（1小節分）
            const stepDuration = 60 / state.tempo / 4;
            const stepsPerBar = 16; // 4/4拍子の場合
            const barDuration = stepDuration * stepsPerBar;
            const newTime = Math.max(0, state.currentTime - barDuration);
            state.setCurrentTime(newTime);
          }}
          onForward={() => {
            // 早送り機能（1小節分）
            const stepDuration = 60 / state.tempo / 4;
            const stepsPerBar = 16; // 4/4拍子の場合
            const barDuration = stepDuration * stepsPerBar;
            const newTime = Math.min(totalDuration, state.currentTime + barDuration);
            state.setCurrentTime(newTime);
          }}
          onToggleLoop={() => {
            state.setLoopEnabled(!state.loopEnabled);
          }}
          onToggleMetronome={() => {
            state.setMetronomeEnabled(!state.metronomeEnabled);
          }}
          onToggleAudio={() => {
            state.setAudioEnabled(!state.audioEnabled);
          }}
          loopEnabled={state.loopEnabled}
          metronomeEnabled={state.metronomeEnabled}
          totalDuration={totalDuration}
          activeCellCount={activeCellCount}
          onTimelineClick={(newTime) => {
            // 再生中の場合は一時停止
            if (state.isPlaying) {
              playback.pausePlayback();
            }
            
            // 最後のクリック位置として記録（これがスペースキーで使われる）
            playback.setLastClickPosition(newTime);
            console.log('🥁 Timeline clicked: Set lastClickPosition to', newTime);
            
            // タイムラインクリック位置を設定（一時的な使用）
            playback.setTimelineClickPosition(newTime);
            
            // 再生位置を更新
            playback.setCurrentTime(newTime);
          }}
          onPlaybackHeadDrag={(newTime) => {
            // 再生位置を更新
            playback.setCurrentTime(newTime);
          }}
        />
      </div>
    </div>
  );
};

export default DrumTrack; 