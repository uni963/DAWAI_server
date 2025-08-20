// ドラム楽器の定義
export const DRUM_INSTRUMENTS = [
  {
    id: 'kick',
    name: 'Kick',
    icon: '🥁',
    color: '#EF4444',
    pitch: 36, // C1
    velocity: 0.8,
    description: 'バスドラム'
  },
  {
    id: 'snare',
    name: 'Snare',
    icon: '🥁',
    color: '#F59E0B',
    pitch: 38, // D1
    velocity: 0.7,
    description: 'スネアドラム'
  },
  {
    id: 'hihat',
    name: 'Hi-Hat',
    icon: '🥁',
    color: '#10B981',
    pitch: 42, // F#1
    velocity: 0.6,
    description: 'ハイハット'
  },
  {
    id: 'open_hihat',
    name: 'Open Hi-Hat',
    icon: '🥁',
    color: '#059669',
    pitch: 46, // A#1
    velocity: 0.6,
    description: 'オープンハイハット'
  },
  {
    id: 'crash',
    name: 'Crash',
    icon: '🥁',
    color: '#8B5CF6',
    pitch: 49, // C#2
    velocity: 0.8,
    description: 'クラッシュシンバル'
  },
  {
    id: 'ride_tom',
    name: 'Ride Tom',
    icon: '🥁',
    color: '#DC2626',
    pitch: 50, // D2
    velocity: 0.7,
    description: 'ライドタム'
  },
  {
    id: 'ride',
    name: 'Ride',
    icon: '🥁',
    color: '#06B6D4',
    pitch: 51, // D#2
    velocity: 0.6,
    description: 'ライドシンバル'
  },
  {
    id: 'tom1',
    name: 'Tom 1',
    icon: '🥁',
    color: '#F97316',
    pitch: 45, // A1
    velocity: 0.7,
    description: 'タム1'
  },
  {
    id: 'tom2',
    name: 'Tom 2',
    icon: '🥁',
    color: '#EC4899',
    pitch: 47, // B1
    velocity: 0.7,
    description: 'タム2'
  },
  {
    id: 'floor_tom',
    name: 'Floor Tom',
    icon: '🥁',
    color: '#84CC16',
    pitch: 41, // F1
    velocity: 0.7,
    description: 'フロアタム'
  }
];

// デフォルト設定
export const DEFAULT_GRID_SIZE = {
  rows: 8,
  columns: 16
};

export const DEFAULT_BPM = 120;

// 再生設定
export const PLAYBACK_INTERVAL = 50; // 50ミリ秒間隔（より適切な再生間隔）

// ドラム同期設定（更新版）
export const SYNC_GROUP_SETTINGS = {
  availableGroups: ['A', 'B', 'C', 'D', 'E', 'F'], // 利用可能な同期グループ
  defaultGroup: 'A', // デフォルトの同期グループ
  groupColors: {
    'A': '#EF4444', // 赤
    'B': '#3B82F6', // 青
    'C': '#10B981', // 緑
    'D': '#F59E0B', // オレンジ
    'E': '#8B5CF6', // 紫
    'F': '#EC4899'  // ピンク
  },
  groupNames: {
    'A': 'Group A',
    'B': 'Group B',
    'C': 'Group C',
    'D': 'Group D',
    'E': 'Group E',
    'F': 'Group F'
  }
};

// 時間軸表示の設定
export const TIME_AXIS_SETTINGS = {
  pixelsPerSecond: 50, // 1秒あたりのピクセル数
  minDuration: 30,     // 最小表示時間（秒）
  maxDuration: 300,    // 最大表示時間（秒）
  defaultDuration: 60  // デフォルト表示時間（秒）
};

// グリッドセルのサイズ
export const CELL_SIZE = {
  width: 28,
  height: 28
};

// 楽器ラベルの幅
export const INSTRUMENT_LABEL_WIDTH = 120;

// タイムラインの高さ（MIDI Editor風に調整）
export const TIMELINE_HEIGHT = 40;

// 再生ヘッドの色
export const PLAYBACK_HEAD_COLOR = '#3B82F6';

// アクティブセルの色
export const ACTIVE_CELL_COLOR = '#10B981';

// ホバー時の色
export const HOVER_CELL_COLOR = '#374151';

// グリッド線の色
export const GRID_LINE_COLOR = '#4B5563';

// 背景色
export const BACKGROUND_COLOR = '#111827';

// テキスト色
export const TEXT_COLOR = '#F9FAFB';

// メトロノームの音色
export const METRONOME_SOUNDS = {
  click: {
    pitch: 60, // C4
    duration: 0.1,
    velocity: 0.5
  },
  accent: {
    pitch: 72, // C5
    duration: 0.1,
    velocity: 0.7
  }
};

// 時間署名の定義
export const TIME_SIGNATURES = [
  { value: '2/4', label: '2/4', beatsPerBar: 2, beatUnit: 4 },
  { value: '3/4', label: '3/4', beatsPerBar: 3, beatUnit: 4 },
  { value: '4/4', label: '4/4', beatsPerBar: 4, beatUnit: 4 },
  { value: '6/8', label: '6/8', beatsPerBar: 6, beatUnit: 8 },
  { value: '8/8', label: '8/8', beatsPerBar: 8, beatUnit: 8 }
];

// プリセットパターン
export const PRESET_PATTERNS = {
  basic_rock: {
    name: 'Basic Rock',
    description: '基本的なロックビート',
    grid: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Snare
      [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true], // Hi-Hat
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Open Hi-Hat
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Crash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Ride Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Ride
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Tom 1
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Tom 2
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]  // Floor Tom
    ]
  },
  funk: {
    name: 'Funk',
    description: 'ファンクビート',
    grid: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Snare
      [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], // Hi-Hat
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Open Hi-Hat
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Crash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Ride Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Ride
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Tom 1
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Tom 2
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]  // Floor Tom
    ]
  },
  jazz: {
    name: 'Jazz',
    description: 'ジャズビート',
    grid: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Snare
      [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], // Hi-Hat
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Open Hi-Hat
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Crash
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Ride Tom
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Ride
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Tom 1
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Tom 2
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]  // Floor Tom
    ]
  }
}; 