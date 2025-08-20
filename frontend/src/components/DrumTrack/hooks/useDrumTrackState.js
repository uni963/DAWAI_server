import { useState, useRef, useCallback } from 'react';
import { DRUM_INSTRUMENTS, DEFAULT_GRID_SIZE, DEFAULT_BPM } from '../constants.js';

const useDrumTrackState = () => {
  // 基本状態
  const [isInitialized, setIsInitialized] = useState(false);
  const [grid, setGrid] = useState(Array(DEFAULT_GRID_SIZE.rows).fill().map(() => 
    Array(DEFAULT_GRID_SIZE.columns).fill(false)
  ));
  const [instruments, setInstruments] = useState(DRUM_INSTRUMENTS);
  const [tempo, setTempo] = useState(DEFAULT_BPM);
  const [timeSignature, setTimeSignature] = useState('4/4');
  
  // 再生状態
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackStartTime, setPlaybackStartTime] = useState(0);
  const [playbackNotes, setPlaybackNotes] = useState(new Set());
  
  // オーディオ状態
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // ループ・メトロノーム状態
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  
  // ドラム同期状態
  const [syncGroup, setSyncGroup] = useState('A'); // 同期グループ（A, B, C, ...）
  const [syncGroups, setSyncGroups] = useState(() => {
    // 初期状態ですべての小節をAグループに設定
    const initialSyncGroups = new Map();
    // 最初の8小節をAグループに設定
    for (let i = 0; i < 8; i++) {
      initialSyncGroups.set(i, 'A');
    }
    return initialSyncGroups;
  });
  
  // 表示状態
  const [needsRedraw, setNeedsRedraw] = useState(true);
  const [lastInputTime, setLastInputTime] = useState(0);
  
  // Refs
  const isPlayingRef = useRef(false);
  const playbackTimerRef = useRef(null);
  const metronomeTimerRef = useRef(null);
  
  // 再生状態のRef同期（依存配列を空にして無限ループを防ぐ）
  const updatePlayingRef = useCallback((playing) => {
    isPlayingRef.current = playing;
    setIsPlaying(playing);
  }, []); // 空の依存配列
  
  // グリッドの更新（バッチ処理対応）
  const updateGrid = useCallback((newGrid) => {
    setGrid(newGrid);
    setNeedsRedraw(true);
  }, []); // 空の依存配列
  
  // 楽器の更新
  const updateInstruments = useCallback((newInstruments) => {
    setInstruments(newInstruments);
    setNeedsRedraw(true);
  }, []); // 空の依存配列
  
  // テンポの更新
  const updateTempo = useCallback((newTempo) => {
    setTempo(newTempo);
    setNeedsRedraw(true);
  }, []); // 空の依存配列
  
  // 時間署名の更新
  const updateTimeSignature = useCallback((newTimeSignature) => {
    setTimeSignature(newTimeSignature);
    setNeedsRedraw(true);
  }, []); // 空の依存配列
  
  // 再生時間の更新
  const updateCurrentTime = useCallback((newTime) => {
    setCurrentTime(newTime);
    setNeedsRedraw(true);
  }, []); // 空の依存配列
  
  // 再生開始時間の更新
  const updatePlaybackStartTime = useCallback((newStartTime) => {
    setPlaybackStartTime(newStartTime);
  }, []); // 空の依存配列
  
  // 再生時間の更新
  const updatePlaybackDuration = useCallback((newDuration) => {
    setPlaybackDuration(newDuration);
  }, []); // 空の依存配列
  
  // 最後の入力時間の更新
  const updateLastInputTime = useCallback((newTime) => {
    setLastInputTime(newTime);
  }, []); // 空の依存配列
  
  // 再描画フラグの更新
  const updateNeedsRedraw = useCallback((needs) => {
    setNeedsRedraw(needs);
  }, []); // 空の依存配列
  
  // 状態のリセット
  const resetState = useCallback(() => {
    setIsInitialized(false);
    setGrid(Array(DEFAULT_GRID_SIZE.rows).fill().map(() => 
      Array(DEFAULT_GRID_SIZE.columns).fill(false)
    ));
    setInstruments(DRUM_INSTRUMENTS);
    setTempo(DEFAULT_BPM);
    setTimeSignature('4/4');
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackDuration(0);
    setPlaybackStartTime(0);
    setAudioEnabled(true);
    setLoopEnabled(false);
    setMetronomeEnabled(false);
    setSyncGroup('A');
    
    // 初期状態ですべての小節をAグループに設定
    const initialSyncGroups = new Map();
    for (let i = 0; i < 8; i++) {
      initialSyncGroups.set(i, 'A');
    }
    setSyncGroups(initialSyncGroups);
    
    setNeedsRedraw(true);
    setLastInputTime(0);
    
    // Refsのリセット
    isPlayingRef.current = false;
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (metronomeTimerRef.current) {
      clearInterval(metronomeTimerRef.current);
      metronomeTimerRef.current = null;
    }
  }, []);
  
  // 状態の取得（スナップショット）
  const getStateSnapshot = useCallback(() => ({
    grid: grid.map(row => [...row]),
    instruments: instruments.map(instrument => ({ ...instrument })),
    tempo,
    timeSignature,
    isPlaying: isPlayingRef.current,
    currentTime,
    playbackDuration,
    audioEnabled,
    loopEnabled,
    metronomeEnabled,
    syncGroup,
    syncGroups: new Map(syncGroups)
  }), [grid, instruments, tempo, timeSignature, currentTime, playbackDuration, audioEnabled, loopEnabled, metronomeEnabled, syncGroup, syncGroups]);
  
  // 状態の復元
  const restoreStateSnapshot = useCallback((snapshot) => {
    if (snapshot.grid) setGrid(snapshot.grid);
    if (snapshot.instruments) setInstruments(snapshot.instruments);
    if (snapshot.tempo) setTempo(snapshot.tempo);
    if (snapshot.timeSignature) setTimeSignature(snapshot.timeSignature);
    if (snapshot.currentTime !== undefined) setCurrentTime(snapshot.currentTime);
    if (snapshot.playbackDuration !== undefined) setPlaybackDuration(snapshot.playbackDuration);
    if (snapshot.audioEnabled !== undefined) setAudioEnabled(snapshot.audioEnabled);
    if (snapshot.loopEnabled !== undefined) setLoopEnabled(snapshot.loopEnabled);
    if (snapshot.metronomeEnabled !== undefined) setMetronomeEnabled(snapshot.metronomeEnabled);
    if (snapshot.syncGroup) setSyncGroup(snapshot.syncGroup);
    if (snapshot.syncGroups) setSyncGroups(new Map(snapshot.syncGroups));
    
    setNeedsRedraw(true);
  }, []);
  
  return {
    // 状態
    isInitialized,
    grid,
    instruments,
    tempo,
    timeSignature,
    isPlaying,
    currentTime,
    playbackDuration,
    playbackStartTime,
    playbackNotes,
    audioEnabled,
    loopEnabled,
    metronomeEnabled,
    syncGroup,
    syncGroups,
    needsRedraw,
    lastInputTime,
    
    // Refs
    isPlayingRef,
    playbackTimerRef,
    metronomeTimerRef,
    
    // 状態更新関数
    setIsInitialized,
    setGrid: updateGrid,
    setInstruments: updateInstruments,
    setTempo: updateTempo,
    setTimeSignature: updateTimeSignature,
    setIsPlaying: updatePlayingRef,
    setCurrentTime: updateCurrentTime,
    setPlaybackStartTime: updatePlaybackStartTime,
    setPlaybackDuration: updatePlaybackDuration,
    setPlaybackNotes,
    setAudioEnabled,
    setLoopEnabled,
    setMetronomeEnabled,
    setSyncGroup,
    setSyncGroups,
    setNeedsRedraw: updateNeedsRedraw,
    setLastInputTime: updateLastInputTime,
    
    // ユーティリティ関数
    resetState,
    getStateSnapshot,
    restoreStateSnapshot
  };
};

export default useDrumTrackState; 