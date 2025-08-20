// ドラムトラック用の統合データ構造
// 既存のMIDIデータ構造と互換性を持ち、他のコンポーネントと連携

// ドラム楽器の定義（実際のドラムセット構成）
export const DRUM_INSTRUMENTS = [
  // キックドラム（バスドラム）
  { 
    id: 'kick', 
    name: 'Kick', 
    icon: '🥁', 
    color: '#EF4444', 
    pitch: 36, 
    velocity: 0.9, 
    channel: 9,
    description: 'バスドラム',
    category: 'kick'
  },
  
  // スネアドラム
  { 
    id: 'snare', 
    name: 'Snare', 
    icon: '🥁', 
    color: '#F59E0B', 
    pitch: 38, 
    velocity: 0.8, 
    channel: 9,
    description: 'スネアドラム',
    category: 'snare'
  },
  
  // クローズドハイハット
  { 
    id: 'hihat_closed', 
    name: 'Hi-Hat Closed', 
    icon: '🥁', 
    color: '#10B981', 
    pitch: 42, 
    velocity: 0.6, 
    channel: 9,
    description: 'クローズドハイハット',
    category: 'hihat'
  },
  
  // オープンハイハット
  { 
    id: 'hihat_open', 
    name: 'Hi-Hat Open', 
    icon: '🥁', 
    color: '#059669', 
    pitch: 46, 
    velocity: 0.7, 
    channel: 9,
    description: 'オープンハイハット',
    category: 'hihat'
  },
  
  // クラッシュシンバル
  { 
    id: 'crash', 
    name: 'Crash', 
    icon: '🥁', 
    color: '#8B5CF6', 
    pitch: 49, 
    velocity: 0.8, 
    channel: 9,
    description: 'クラッシュシンバル',
    category: 'cymbal'
  },
  
  // ベルタップ（元ライドシンバル）
  { 
    id: 'ride', 
    name: 'Bell Tap', 
    icon: '🔔', 
    color: '#06B6D4', 
    pitch: 51, 
    velocity: 0.7, 
    channel: 9,
    description: 'ベルタップ（短い金属音）',
    category: 'cymbal'
  },
  
  // スネアバックスティック（元ハイタム）
  { 
    id: 'tom_high', 
    name: 'Snare Backstick', 
    icon: '🥁', 
    color: '#F97316', 
    pitch: 50, 
    velocity: 0.7, 
    channel: 9,
    description: 'スネアバックスティック（短い打撃音）',
    category: 'snare'
  },
  
  // スネアリムショット（元ミドルタム）
  { 
    id: 'tom_mid', 
    name: 'Snare Rim Shot', 
    icon: '🥁', 
    color: '#EC4899', 
    pitch: 47, 
    velocity: 0.7, 
    channel: 9,
    description: 'スネアリムショット（短い打撃音）',
    category: 'snare'
  },
  
  // スネアスティック（元フロアタム）
  { 
    id: 'tom_floor', 
    name: 'Snare Stick', 
    icon: '🥁', 
    color: '#84CC16', 
    pitch: 41, 
    velocity: 0.7, 
    channel: 9,
    description: 'スネアスティック（短い打撃音）',
    category: 'snare'
  },
  
  // スネアリム（元Tom 1）
  { 
    id: 'tom1', 
    name: 'Snare Rim', 
    icon: '🥁', 
    color: '#FCD34D', 
    pitch: 45, 
    velocity: 0.6, 
    channel: 9,
    description: 'スネアリム（短い打撃音）',
    category: 'snare'
  },
  
  // スプラッシュシンバル
  { 
    id: 'splash', 
    name: 'Splash', 
    icon: '🥁', 
    color: '#A855F7', 
    pitch: 55, 
    velocity: 0.6, 
    channel: 9,
    description: 'スプラッシュシンバル',
    category: 'cymbal'
  },
  
  // チャイナシンバル
  { 
    id: 'china', 
    name: 'China', 
    icon: '🥁', 
    color: '#DC2626', 
    pitch: 52, 
    velocity: 0.8, 
    channel: 9,
    description: 'チャイナシンバル',
    category: 'cymbal'
  },
  
  // ライムスティック
  { 
    id: 'rimshot', 
    name: 'Rim Shot', 
    icon: '🥁', 
    color: '#FBBF24', 
    pitch: 37, 
    velocity: 0.6, 
    channel: 9,
    description: 'ライムショット',
    category: 'snare'
  }
];

// デフォルト設定
export const DEFAULT_DRUM_SETTINGS = {
  gridSize: { rows: 8, columns: 16 },
  tempo: 120,
  timeSignature: '4/4',
  swing: 0,
  quantization: 16, // 16分音符
  loopLength: 4, // 4小節
  metronomeEnabled: false,
  loopEnabled: false
};

// 同期グループ設定
export const SYNC_GROUP_SETTINGS = {
  availableGroups: ['A', 'B', 'C', 'D', 'E', 'F'],
  defaultGroup: 'A',
  groupColors: {
    'A': '#EF4444', // 赤
    'B': '#3B82F6', // 青
    'C': '#10B981', // 緑
    'D': '#F59E0B', // オレンジ
    'E': '#8B5CF6', // 紫
    'F': '#EC4899'  // ピンク
  }
};

// デフォルトグリッドの作成（基本的なロックビートパターンを含む）
export const createDefaultGrid = (rows = 8, columns = 64) => {
  const grid = Array(rows).fill().map(() => Array(columns).fill(false));
  
  // 基本的なロックビートパターンを4小節分繰り返し
  if (rows >= 8 && columns >= 64) {
    // 4小節分のパターンを繰り返し
    for (let bar = 0; bar < 4; bar++) {
      const barStart = bar * 16; // 1小節 = 16列
      
      // キックドラム（1拍目と3拍目）
      grid[0][barStart + 0] = true;  // 1拍目
      grid[0][barStart + 8] = true;  // 3拍目
      
      // スネアドラム（2拍目と4拍目）
      grid[1][barStart + 4] = true;  // 2拍目
      grid[1][barStart + 12] = true; // 4拍目
      
      // ハイハット（8分音符）
      for (let i = 0; i < 16; i += 2) {
        grid[2][barStart + i] = true;
      }
    }
  }
  
  // デバッグログを追加
  const activeCells = grid.flat().filter(cell => cell).length;
  console.log('🥁 Default grid created:', {
    rows,
    columns,
    activeCells,
    bars: Math.ceil(columns / 16), // 小節数
    grid: grid.map((row, i) => ({
      row: i,
      activePositions: row.map((cell, j) => cell ? j : null).filter(pos => pos !== null)
    }))
  });
  
  return grid;
};

// 同期グループ別のデータ構造を作成
export const createSyncGroupData = (groupId, instruments = DRUM_INSTRUMENTS) => ({
  id: groupId,
  name: `Group ${groupId}`,
  grid: createDefaultGrid(8, 64), // 4小節分のグリッドを作成
  instruments: [...instruments], // 楽器のコピーを作成
  tempo: DEFAULT_DRUM_SETTINGS.tempo,
  timeSignature: DEFAULT_DRUM_SETTINGS.timeSignature,
  swing: DEFAULT_DRUM_SETTINGS.swing,
  quantization: DEFAULT_DRUM_SETTINGS.quantization,
  loopLength: DEFAULT_DRUM_SETTINGS.loopLength,
  metronomeEnabled: DEFAULT_DRUM_SETTINGS.metronomeEnabled,
  loopEnabled: DEFAULT_DRUM_SETTINGS.loopEnabled,
  lastModified: new Date().toISOString(),
  metadata: {
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    version: '1.0.0',
    type: 'syncGroup',
    cellCount: 0
  }
});

// ドラムノートの定義
export const createDrumNote = (instrumentId, time, duration = 0.25, velocity = 0.8, tempo = 120) => {
  const pitch = DRUM_INSTRUMENTS.find(inst => inst.id === instrumentId)?.pitch || 36;
  const timeInSeconds = (time * 60) / tempo; // 拍単位から秒単位に変換
  const durationInSeconds = (duration * 60) / tempo; // 拍単位から秒単位に変換
  
  return {
    id: `drum-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    instrumentId,
    time: timeInSeconds, // 開始時間（秒単位）
    start: timeInSeconds * 1000, // 開始時間（ミリ秒単位）
    duration: durationInSeconds, // 持続時間（秒単位）
    velocity, // ベロシティ（0.0-1.0）
    pitch: pitch, // MIDIノート番号
    note: pitch, // ArrangementViewとの互換性のため
    channel: 9, // ドラムチャンネル
    type: 'drum'
  };
};

// ドラムパターンの定義
export const createDrumPattern = (id, name, grid, instruments, tempo = 120, timeSignature = '4/4', syncGroup = 'A') => ({
  id,
  name,
  grid: grid || createDefaultGrid(),
  instruments: instruments || DRUM_INSTRUMENTS,
  tempo,
  timeSignature,
  syncGroup, // 同期グループ（A, B, C, ...）
  notes: [], // グリッドから生成されるノート配列
  metadata: {
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    version: '1.0.0'
  }
});

// 統合ドラムデータ構造（MIDIデータ構造と互換）
export const createDrumData = (trackId, pattern = null) => {
  console.log('🥁 Creating drum data for track:', trackId);
  
  // デフォルトグリッドを作成（必ず有効なグリッドを生成）
  const defaultGrid = createDefaultGrid();
  
  const defaultPattern = createDrumPattern(
    `pattern-${Date.now()}`,
    'Default Pattern',
    defaultGrid, // 明示的にデフォルトグリッドを渡す
    DRUM_INSTRUMENTS,
    DEFAULT_DRUM_SETTINGS.tempo,
    DEFAULT_DRUM_SETTINGS.timeSignature
  );

  const drumPattern = pattern || defaultPattern;

  // グリッドが存在しない場合は作成
  const grid = drumPattern.grid || createDefaultGrid();
  
  // 楽器が存在しない場合はデフォルトを使用
  const instruments = drumPattern.instruments || DRUM_INSTRUMENTS;

  // 同期グループ別のデータを作成
  const syncGroupsData = {};
  SYNC_GROUP_SETTINGS.availableGroups.forEach(groupId => {
    syncGroupsData[groupId] = createSyncGroupData(groupId, instruments);
  });

  // MIDIノートを生成
  const midiNotes = generateMidiNotesFromGrid(grid, instruments, drumPattern.tempo || DEFAULT_DRUM_SETTINGS.tempo, drumPattern.timeSignature || DEFAULT_DRUM_SETTINGS.timeSignature);
  
  const drumData = {
    // 基本情報
    trackId,
    patternId: drumPattern.id,
    patternName: drumPattern.name,
    
    // グリッドデータ（必ず有効な配列を保証）
    grid: grid,
    instruments: instruments,
    
    // タイミング設定
    tempo: drumPattern.tempo || DEFAULT_DRUM_SETTINGS.tempo,
    timeSignature: drumPattern.timeSignature || DEFAULT_DRUM_SETTINGS.timeSignature,
    syncGroup: drumPattern.syncGroup || 'A',
    swing: DEFAULT_DRUM_SETTINGS.swing,
    quantization: DEFAULT_DRUM_SETTINGS.quantization,
    loopLength: DEFAULT_DRUM_SETTINGS.loopLength,
    
    // 再生設定
    metronomeEnabled: DEFAULT_DRUM_SETTINGS.metronomeEnabled,
    loopEnabled: DEFAULT_DRUM_SETTINGS.loopEnabled,
    
    // 同期グループ別データ（新機能）
    syncGroupsData: syncGroupsData,
    
    // 小節ごとの同期グループマッピング
    barSyncGroups: new Map(), // barIndex -> syncGroupId
    
    // MIDI互換データ（他のコンポーネントとの連携用）
    midiData: {
      notes: midiNotes,
      tempo: drumPattern.tempo || DEFAULT_DRUM_SETTINGS.tempo,
      timeSignature: drumPattern.timeSignature || DEFAULT_DRUM_SETTINGS.timeSignature,
      trackId: trackId,
      lastModified: new Date().toISOString(),
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        version: '1.0.0'
      },
      settings: {
        channel: 9, // ドラムチャンネル
        octave: 0,
        transpose: 0,
        velocity: 100
      }
    },
    
    // パターン管理
    patterns: [drumPattern],
    activePatternId: drumPattern.id,
    
    // メタデータ
    lastModified: new Date().toISOString(),
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: '1.0.0',
      type: 'drum',
      cellCount: grid.flat().filter(cell => cell).length
    }
  };
  
  console.log('🥁 Drum data created successfully:', {
    trackId: drumData.trackId,
    gridActiveCells: drumData.metadata.cellCount,
    midiNotesCount: drumData.midiData.notes.length,
    tempo: drumData.tempo,
    timeSignature: drumData.timeSignature
  });
  
  return drumData;
};

// グリッドからMIDIノートを生成
export const generateMidiNotesFromGrid = (grid, instruments, tempo, timeSignature) => {
  if (!grid || !Array.isArray(grid) || grid.length === 0) {
    console.warn('Invalid grid for MIDI note generation:', grid);
    return [];
  }
  
  const notes = [];
  const [beats, beatType] = timeSignature.split('/').map(Number);
  const beatDuration = 4 / beatType; // 1拍の長さ（拍単位）
  
  // 4/4拍子の場合、1小節 = 4拍 = 16列
  // 1列 = 1/16拍 = 0.25拍
  const gridDuration = 0.25; // 1グリッドセルの長さ（拍単位）
  
  // デバッグ用ログ（開発時のみ有効）
  if (process.env.NODE_ENV === 'development') {
    console.log('🥁 Generating MIDI notes from grid:', {
      gridRows: grid.length,
      gridCols: grid[0]?.length || 0,
      instrumentsCount: instruments.length,
      tempo,
      timeSignature,
      beatDuration,
      gridDuration,
      totalBars: Math.ceil((grid[0]?.length || 0) / 16)
    });
  }
  
  grid.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      console.warn('Invalid row in grid:', row);
      return;
    }
    
    const instrument = instruments[rowIndex];
    if (!instrument) {
      console.warn('No instrument found for row:', rowIndex);
      return;
    }
    
    row.forEach((isActive, colIndex) => {
      if (isActive) {
        const time = colIndex * gridDuration; // 拍単位の時間
        const note = createDrumNote(
          instrument.id,
          time,
          gridDuration,
          instrument.velocity,
          tempo
        );
        notes.push(note);
        // 個別ノートのログは削除（トラック作成時のみ最終的なサマリーログを出力）
      }
    });
  });
  
  // デバッグ用ログ（開発時のみ有効）
  if (process.env.NODE_ENV === 'development') {
    console.log('🥁 Generated MIDI notes:', {
      totalNotes: notes.length,
      totalBars: Math.ceil((grid[0]?.length || 0) / 16),
      notes: notes.map(note => ({
        instrumentId: note.instrumentId,
        pitch: note.pitch,
        time: note.time,
        duration: note.duration
      }))
    });
  }
  
  return notes;
};

// MIDIノートからグリッドを生成
export const generateGridFromMidiNotes = (notes, instruments, gridSize) => {
  const grid = createDefaultGrid(gridSize.rows, gridSize.columns);
  
  notes.forEach(note => {
    const instrumentIndex = instruments.findIndex(inst => inst.pitch === note.pitch);
    if (instrumentIndex >= 0 && instrumentIndex < gridSize.rows) {
      const timeIndex = Math.floor(note.time / (4 / gridSize.columns));
      if (timeIndex >= 0 && timeIndex < gridSize.columns) {
        grid[instrumentIndex][timeIndex] = true;
      }
    }
  });
  
  return grid;
};

// ドラムデータの更新
export const updateDrumData = (drumData, updates) => {
  // 既存のデータがない場合は新規作成
  if (!drumData) {
    console.warn('No drum data provided for update, creating new data');
    return createDrumData(updates.trackId || `track-${Date.now()}`);
  }
  
  const updatedData = { ...drumData, ...updates };
  
  // グリッドが更新された場合、MIDIノートを再生成（必要な場合のみ）
  if (updates.grid && updates.instruments && updates.forceMidiRegeneration) {
    updatedData.midiData = {
      ...updatedData.midiData,
      notes: generateMidiNotesFromGrid(
        updates.grid,
        updates.instruments,
        updatedData.tempo,
        updatedData.timeSignature
      ),
      lastModified: new Date().toISOString()
    };
  }
  
  // テンポや拍子記号が更新された場合
  if (updates.tempo || updates.timeSignature) {
    updatedData.midiData = {
      ...updatedData.midiData,
      tempo: updatedData.tempo,
      timeSignature: updatedData.timeSignature,
      lastModified: new Date().toISOString()
    };
  }
  
  updatedData.lastModified = new Date().toISOString();
  updatedData.metadata.modified = new Date().toISOString();
  updatedData.metadata.cellCount = updatedData.grid ? updatedData.grid.flat().filter(cell => cell).length : 0;
  
  return updatedData;
};

// 同期グループ別データの取得
export const getSyncGroupData = (drumData, groupId) => {
  if (!drumData || !drumData.syncGroupsData) {
    return null;
  }
  return drumData.syncGroupsData[groupId] || null;
};

// 同期グループ別データの更新
export const updateSyncGroupData = (drumData, groupId, updates) => {
  if (!drumData || !drumData.syncGroupsData) {
    console.warn('No sync groups data available');
    return drumData;
  }
  
  const currentGroupData = drumData.syncGroupsData[groupId];
  if (!currentGroupData) {
    console.warn(`Sync group ${groupId} not found`);
    return drumData;
  }
  
  const updatedGroupData = {
    ...currentGroupData,
    ...updates,
    lastModified: new Date().toISOString(),
    metadata: {
      ...currentGroupData.metadata,
      modified: new Date().toISOString(),
      cellCount: updates.grid ? updates.grid.flat().filter(cell => cell).length : currentGroupData.metadata.cellCount
    }
  };
  
  const updatedData = {
    ...drumData,
    syncGroupsData: {
      ...drumData.syncGroupsData,
      [groupId]: updatedGroupData
    },
    lastModified: new Date().toISOString(),
    metadata: {
      ...drumData.metadata,
      modified: new Date().toISOString()
    }
  };
  
  return updatedData;
};

// 小節の同期グループを設定
export const setBarSyncGroup = (drumData, barIndex, groupId) => {
  if (!drumData) {
    console.warn('No drum data provided');
    return drumData;
  }
  
  if (!SYNC_GROUP_SETTINGS.availableGroups.includes(groupId)) {
    console.warn(`Invalid sync group: ${groupId}`);
    return drumData;
  }
  
  const updatedBarSyncGroups = new Map(drumData.barSyncGroups || new Map());
  updatedBarSyncGroups.set(barIndex, groupId);
  
  return {
    ...drumData,
    barSyncGroups: updatedBarSyncGroups,
    lastModified: new Date().toISOString(),
    metadata: {
      ...drumData.metadata,
      modified: new Date().toISOString()
    }
  };
};

// 小節の同期グループを取得
export const getBarSyncGroup = (drumData, barIndex) => {
  if (!drumData || !drumData.barSyncGroups) {
    return SYNC_GROUP_SETTINGS.defaultGroup;
  }
  return drumData.barSyncGroups.get(barIndex) || SYNC_GROUP_SETTINGS.defaultGroup;
};

// 同期グループのグリッドデータを取得
export const getSyncGroupGrid = (drumData, groupId) => {
  const groupData = getSyncGroupData(drumData, groupId);
  return groupData ? groupData.grid : createDefaultGrid();
};

// 同期グループのグリッドデータを更新
export const updateSyncGroupGrid = (drumData, groupId, grid) => {
  return updateSyncGroupData(drumData, groupId, { grid });
};

// 同期グループの楽器データを取得
export const getSyncGroupInstruments = (drumData, groupId) => {
  const groupData = getSyncGroupData(drumData, groupId);
  return groupData ? groupData.instruments : DRUM_INSTRUMENTS;
};

// 同期グループの楽器データを更新
export const updateSyncGroupInstruments = (drumData, groupId, instruments) => {
  return updateSyncGroupData(drumData, groupId, { instruments });
};

// 同期グループのテンポを取得
export const getSyncGroupTempo = (drumData, groupId) => {
  const groupData = getSyncGroupData(drumData, groupId);
  return groupData ? groupData.tempo : DEFAULT_DRUM_SETTINGS.tempo;
};

// 同期グループのテンポを更新
export const updateSyncGroupTempo = (drumData, groupId, tempo) => {
  return updateSyncGroupData(drumData, groupId, { tempo });
};

// 同期グループの拍子記号を取得
export const getSyncGroupTimeSignature = (drumData, groupId) => {
  const groupData = getSyncGroupData(drumData, groupId);
  return groupData ? groupData.timeSignature : DEFAULT_DRUM_SETTINGS.timeSignature;
};

// 同期グループの拍子記号を更新
export const updateSyncGroupTimeSignature = (drumData, groupId, timeSignature) => {
  return updateSyncGroupData(drumData, groupId, { timeSignature });
};

// 同期グループの全データをリセット
export const resetSyncGroupData = (drumData, groupId) => {
  if (!drumData || !drumData.syncGroupsData) {
    return drumData;
  }
  
  const resetGroupData = createSyncGroupData(groupId, drumData.instruments);
  
  return {
    ...drumData,
    syncGroupsData: {
      ...drumData.syncGroupsData,
      [groupId]: resetGroupData
    },
    lastModified: new Date().toISOString(),
    metadata: {
      ...drumData.metadata,
      modified: new Date().toISOString()
    }
  };
};

// 同期グループの全データをコピー
export const copySyncGroupData = (drumData, fromGroupId, toGroupId) => {
  if (!drumData || !drumData.syncGroupsData) {
    return drumData;
  }
  
  const sourceGroupData = getSyncGroupData(drumData, fromGroupId);
  if (!sourceGroupData) {
    console.warn(`Source sync group ${fromGroupId} not found`);
    return drumData;
  }
  
  const copiedGroupData = {
    ...sourceGroupData,
    id: toGroupId,
    name: `Group ${toGroupId}`,
    lastModified: new Date().toISOString(),
    metadata: {
      ...sourceGroupData.metadata,
      modified: new Date().toISOString()
    }
  };
  
  return {
    ...drumData,
    syncGroupsData: {
      ...drumData.syncGroupsData,
      [toGroupId]: copiedGroupData
    },
    lastModified: new Date().toISOString(),
    metadata: {
      ...drumData.metadata,
      modified: new Date().toISOString()
    }
  };
};

// 全体のグリッドデータを生成（各同期グループのデータを組み合わせ）
export const generateCombinedGrid = (drumData, maxBars = 32) => {
  if (!drumData || !drumData.syncGroupsData || !drumData.barSyncGroups) {
    return createDefaultGrid();
  }
  
  // 最大小節数分のグリッドを作成
  const totalSteps = maxBars * 16; // 1小節 = 16ステップ
  const combinedGrid = Array(8).fill().map(() => Array(totalSteps).fill(false));
  
  // 各小節の同期グループデータを組み合わせ
  for (let barIndex = 0; barIndex < maxBars; barIndex++) {
    const syncGroupId = getBarSyncGroup(drumData, barIndex);
    const syncGroupData = getSyncGroupData(drumData, syncGroupId);
    
    if (syncGroupData && syncGroupData.grid) {
      // この小節の開始位置を計算
      const startStep = barIndex * 16;
      
      // 同期グループのグリッドデータを全体のグリッドにコピー
      syncGroupData.grid.forEach((row, rowIndex) => {
        if (rowIndex < combinedGrid.length) {
          row.forEach((cell, colIndex) => {
            if (colIndex < 16) { // 1小節分のみ
              combinedGrid[rowIndex][startStep + colIndex] = cell;
            }
          });
        }
      });
    }
  }
  
  return combinedGrid;
};

// 全体の楽器データを生成（各同期グループの楽器設定を統合）
export const generateCombinedInstruments = (drumData) => {
  if (!drumData || !drumData.syncGroupsData) {
    return DRUM_INSTRUMENTS;
  }
  
  // デフォルトの楽器設定を使用
  let combinedInstruments = [...DRUM_INSTRUMENTS];
  
  // 各同期グループの楽器設定を確認し、必要に応じて統合
  SYNC_GROUP_SETTINGS.availableGroups.forEach(groupId => {
    const groupData = getSyncGroupData(drumData, groupId);
    if (groupData && groupData.instruments) {
      // 楽器設定の変更があれば統合（簡易版：最初に見つかった設定を使用）
      if (JSON.stringify(groupData.instruments) !== JSON.stringify(DRUM_INSTRUMENTS)) {
        combinedInstruments = [...groupData.instruments];
      }
    }
  });
  
  return combinedInstruments;
};

// 全体のテンポ設定を生成（各同期グループのテンポを統合）
export const generateCombinedTempo = (drumData) => {
  if (!drumData || !drumData.syncGroupsData) {
    return DEFAULT_DRUM_SETTINGS.tempo;
  }
  
  // デフォルトのテンポを使用
  let combinedTempo = DEFAULT_DRUM_SETTINGS.tempo;
  
  // 各同期グループのテンポ設定を確認
  SYNC_GROUP_SETTINGS.availableGroups.forEach(groupId => {
    const groupData = getSyncGroupData(drumData, groupId);
    if (groupData && groupData.tempo && groupData.tempo !== DEFAULT_DRUM_SETTINGS.tempo) {
      // テンポの変更があれば統合（簡易版：最初に見つかった設定を使用）
      combinedTempo = groupData.tempo;
    }
  });
  
  return combinedTempo;
};

// 全体の拍子記号を生成（各同期グループの拍子記号を統合）
export const generateCombinedTimeSignature = (drumData) => {
  if (!drumData || !drumData.syncGroupsData) {
    return DEFAULT_DRUM_SETTINGS.timeSignature;
  }
  
  // デフォルトの拍子記号を使用
  let combinedTimeSignature = DEFAULT_DRUM_SETTINGS.timeSignature;
  
  // 各同期グループの拍子記号設定を確認
  SYNC_GROUP_SETTINGS.availableGroups.forEach(groupId => {
    const groupData = getSyncGroupData(drumData, groupId);
    if (groupData && groupData.timeSignature && groupData.timeSignature !== DEFAULT_DRUM_SETTINGS.timeSignature) {
      // 拍子記号の変更があれば統合（簡易版：最初に見つかった設定を使用）
      combinedTimeSignature = groupData.timeSignature;
    }
  });
  
  return combinedTimeSignature;
};

// 全体のデータ構造を更新（各同期グループのデータを組み合わせて）
export const updateCombinedData = (drumData, maxBars = 32) => {
  if (!drumData) {
    return createDrumData(`track-${Date.now()}`);
  }
  
  // 各同期グループのデータを組み合わせて全体のデータを生成
  const combinedGrid = generateCombinedGrid(drumData, maxBars);
  const combinedInstruments = generateCombinedInstruments(drumData);
  const combinedTempo = generateCombinedTempo(drumData);
  const combinedTimeSignature = generateCombinedTimeSignature(drumData);
  
  // 更新されたデータ構造
  const updatedData = {
    ...drumData,
    // 全体のグリッドデータ（組み合わせ済み）
    grid: combinedGrid,
    instruments: combinedInstruments,
    tempo: combinedTempo,
    timeSignature: combinedTimeSignature,
    
    // 全体の統計情報
    totalBars: maxBars,
    totalSteps: maxBars * 16,
    totalDuration: (maxBars * 4 * 60) / combinedTempo, // 秒単位
    
    // MIDIデータを再生成
    midiData: {
      ...drumData.midiData,
      notes: generateMidiNotesFromGrid(combinedGrid, combinedInstruments, combinedTempo, combinedTimeSignature),
      tempo: combinedTempo,
      timeSignature: combinedTimeSignature,
      lastModified: new Date().toISOString()
    },
    
    lastModified: new Date().toISOString(),
    metadata: {
      ...drumData.metadata,
      modified: new Date().toISOString(),
      cellCount: combinedGrid.flat().filter(cell => cell).length,
      totalBars: maxBars,
      totalSteps: maxBars * 16
    }
  };
  
  return updatedData;
};

// 特定の小節範囲のグリッドデータを取得
export const getGridForBarRange = (drumData, startBar, endBar) => {
  if (!drumData || !drumData.syncGroupsData || !drumData.barSyncGroups) {
    return createDefaultGrid();
  }
  
  const barCount = endBar - startBar + 1;
  const totalSteps = barCount * 16;
  const rangeGrid = Array(8).fill().map(() => Array(totalSteps).fill(false));
  
  for (let barIndex = startBar; barIndex <= endBar; barIndex++) {
    const syncGroupId = getBarSyncGroup(drumData, barIndex);
    const syncGroupData = getSyncGroupData(drumData, syncGroupId);
    
    if (syncGroupData && syncGroupData.grid) {
      const startStep = (barIndex - startBar) * 16;
      
      syncGroupData.grid.forEach((row, rowIndex) => {
        if (rowIndex < rangeGrid.length) {
          row.forEach((cell, colIndex) => {
            if (colIndex < 16) {
              rangeGrid[rowIndex][startStep + colIndex] = cell;
            }
          });
        }
      });
    }
  }
  
  return rangeGrid;
};

// ドラムデータの検証
export const validateDrumData = (drumData) => {
  const errors = [];
  
  if (!drumData.trackId) {
    errors.push('trackId is required');
  }
  
  if (!Array.isArray(drumData.grid)) {
    errors.push('grid must be an array');
  } else if (drumData.grid.length === 0) {
    errors.push('grid cannot be empty');
  } else {
    // グリッドの各行を検証
    drumData.grid.forEach((row, index) => {
      if (!Array.isArray(row)) {
        errors.push(`grid row ${index} must be an array`);
      }
    });
  }
  
  if (!Array.isArray(drumData.instruments)) {
    errors.push('instruments must be an array');
  }
  
  if (typeof drumData.tempo !== 'number' || drumData.tempo <= 0) {
    errors.push('tempo must be a positive number');
  }
  
  if (!drumData.timeSignature || !/^\d+\/\d+$/.test(drumData.timeSignature)) {
    errors.push('timeSignature must be in format "beats/beatType"');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ドラムデータのシリアライズ
export const serializeDrumData = (drumData) => {
  return JSON.stringify(drumData);
};

// ドラムデータのデシリアライズ
export const deserializeDrumData = (serializedData) => {
  try {
    const drumData = JSON.parse(serializedData);
    const validation = validateDrumData(drumData);
    
    if (!validation.isValid) {
      console.error('Invalid drum data:', validation.errors);
      return null;
    }
    
    return drumData;
  } catch (error) {
    console.error('Failed to deserialize drum data:', error);
    return null;
  }
};

// プリセットパターンからドラムデータを作成
export const createDrumDataFromPreset = (trackId, presetName) => {
  const preset = PRESET_PATTERNS[presetName];
  if (!preset) {
    console.warn('Preset pattern not found:', presetName);
    return createDrumData(trackId);
  }
  
  return createDrumData(trackId, {
    id: `preset-${presetName}-${Date.now()}`,
    name: preset.name,
    grid: preset.grid,
    instruments: DRUM_INSTRUMENTS,
    tempo: DEFAULT_DRUM_SETTINGS.tempo,
    timeSignature: DEFAULT_DRUM_SETTINGS.timeSignature
  });
};

// プリセットパターン
export const PRESET_PATTERNS = {
  basic_rock: {
    name: 'Basic Rock',
    description: '基本的なロックビート',
    grid: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Snare
      [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true], // Hi-Hat Closed
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Hi-Hat Open
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Crash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Ride
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // High Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Mid Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Floor Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Splash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // China
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]  // Rim Shot
    ]
  },
  funk: {
    name: 'Funk',
    description: 'ファンクビート',
    grid: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Snare
      [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], // Hi-Hat Closed
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Hi-Hat Open
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Crash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Ride
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // High Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Mid Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Floor Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Splash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // China
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]  // Rim Shot
    ]
  },
  jazz: {
    name: 'Jazz',
    description: 'ジャズビート',
    grid: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Snare
      [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], // Hi-Hat Closed
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Hi-Hat Open
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Crash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Ride
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // High Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Mid Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Floor Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Splash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // China
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]  // Rim Shot
    ]
  },
  latin: {
    name: 'Latin',
    description: 'ラテンビート',
    grid: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Snare
      [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true], // Hi-Hat Closed
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Hi-Hat Open
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Crash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Ride
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // High Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Mid Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Floor Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Splash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // China
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]  // Rim Shot
    ]
  },
  electronic: {
    name: 'Electronic',
    description: 'エレクトロニックビート',
    grid: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Snare
      [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true], // Hi-Hat Closed
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Hi-Hat Open
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Crash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Ride
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // High Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Mid Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Floor Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Splash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // China
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]  // Rim Shot
    ]
  }
}; 