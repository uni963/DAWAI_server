// DAWAI サンプルデータ定義
// 新規ユーザー向けのデモプロジェクトデータ

// トラックタイプを直接定義（App.jsxと同じ値）
const TRACK_TYPES = {
  MIDI: 'midi',
  DRUMS: 'drums',
  DIFFSINGER: 'diffsinger'
}

const TRACK_SUBTYPES = {
  PIANO: 'piano',
  SYNTH: 'synth',
  BASS: 'bass',
  GUITAR: 'guitar',
  DRUMS: 'drums',
  DIFFSINGER: 'diffsinger'
}

// DrumTrack のBasic Rockパターンを直接定義
const PRESET_PATTERNS = {
  basic_rock: {
    grid: [
      // Kick (0)
      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      // Snare (1)
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      // Hi-Hat (2)
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
    ]
  }
}

/**
 * サンプルPiano Trackのノートデータ
 * シンプルなC Major スケールのメロディーパターン
 */
const samplePianoNotes = [
  // 第1小節: C-E-G-C (Cメジャーコード) - ビート単位で配置
  { id: 'note-1', pitch: 60, time: 0, duration: 0.5, velocity: 0.8 },    // C4
  { id: 'note-2', pitch: 64, time: 0.5, duration: 0.5, velocity: 0.8 },    // E4
  { id: 'note-3', pitch: 67, time: 1, duration: 0.5, velocity: 0.8 },    // G4
  { id: 'note-4', pitch: 72, time: 1.5, duration: 0.5, velocity: 0.9 },    // C5

  // 第2小節: G-F-E-D (下降メロディー)
  { id: 'note-5', pitch: 67, time: 2, duration: 0.5, velocity: 0.8 },    // G4
  { id: 'note-6', pitch: 65, time: 2.5, duration: 0.5, velocity: 0.8 },    // F4
  { id: 'note-7', pitch: 64, time: 3, duration: 0.5, velocity: 0.8 },    // E4
  { id: 'note-8', pitch: 62, time: 3.5, duration: 0.5, velocity: 0.8 },    // D4

  // 第3小節: C-D-E-F (上昇メロディー)
  { id: 'note-9', pitch: 60, time: 4, duration: 0.5, velocity: 0.8 },    // C4
  { id: 'note-10', pitch: 62, time: 4.5, duration: 0.5, velocity: 0.8 },   // D4
  { id: 'note-11', pitch: 64, time: 5, duration: 0.5, velocity: 0.8 },   // E4
  { id: 'note-12', pitch: 65, time: 5.5, duration: 0.5, velocity: 0.8 },   // F4

  // 第4小節: G-A-B-C (クライマックス)
  { id: 'note-13', pitch: 67, time: 6, duration: 0.5, velocity: 0.9 },   // G4
  { id: 'note-14', pitch: 69, time: 6.5, duration: 0.5, velocity: 0.9 },   // A4
  { id: 'note-15', pitch: 71, time: 7, duration: 0.5, velocity: 0.9 },   // B4
  { id: 'note-16', pitch: 72, time: 7.5, duration: 0.5, velocity: 1.0 },   // C5 (終止)
]

/**
 * サンプルBass Trackのノートデータ
 * Piano Trackとハーモニーを成すシンプルなベースライン
 * Bass音域（C1-C4, MIDI 24-60）を使用
 */
const sampleBassNotes = [
  // 第1小節: C-G ベースライン (Cメジャーコードの基音と5度)
  { id: 'bass-note-1', pitch: 36, time: 0, duration: 1.0, velocity: 0.9 },    // C2 (ルート音)
  { id: 'bass-note-2', pitch: 43, time: 1, duration: 1.0, velocity: 0.8 },    // G2 (5度)

  // 第2小節: F-G ベースライン (コード進行をサポート)
  { id: 'bass-note-3', pitch: 41, time: 2, duration: 1.0, velocity: 0.8 },    // F2
  { id: 'bass-note-4', pitch: 43, time: 3, duration: 1.0, velocity: 0.8 },    // G2

  // 第3小節: C-D ベースライン (上昇に合わせて)
  { id: 'bass-note-5', pitch: 36, time: 4, duration: 1.0, velocity: 0.8 },    // C2
  { id: 'bass-note-6', pitch: 38, time: 5, duration: 1.0, velocity: 0.8 },    // D2

  // 第4小節: G-C ベースライン (終止感のある進行)
  { id: 'bass-note-7', pitch: 43, time: 6, duration: 1.0, velocity: 0.9 },    // G2 (ドミナント)
  { id: 'bass-note-8', pitch: 48, time: 7, duration: 1.0, velocity: 1.0 },    // C3 (終止、オクターブ上)
]

/**
 * サンプル歌声合成トラックのノートデータ
 * オリジナル歌詞「ありがとう、こころから」
 * シンプルで美しい心からの感謝の歌 - 完全オリジナル作詞
 * 歌唱音域（C3-F4, MIDI 48-65）を使用
 */
const sampleVoiceNotes = [
  // 「ありがとう」(第1フレーズ) - 上昇メロディー
  { id: 'voice-note-1', pitch: 60, time: 0, duration: 0.8, velocity: 0.8, lyric: 'あ' },     // C4 - あ
  { id: 'voice-note-2', pitch: 62, time: 0.8, duration: 0.8, velocity: 0.8, lyric: 'り' },   // D4 - り
  { id: 'voice-note-3', pitch: 64, time: 1.6, duration: 0.8, velocity: 0.85, lyric: 'が' },  // E4 - が
  { id: 'voice-note-4', pitch: 65, time: 2.4, duration: 0.8, velocity: 0.9, lyric: 'と' },   // F4 - と
  { id: 'voice-note-5', pitch: 64, time: 3.2, duration: 1.6, velocity: 0.9, lyric: 'う' },   // E4 - う (長く、感謝を込めて)

  // 間奏 (一息)

  // 「こころから」(第2フレーズ) - 下降メロディー
  { id: 'voice-note-6', pitch: 62, time: 5.6, duration: 0.8, velocity: 0.8, lyric: 'こ' },   // D4 - こ
  { id: 'voice-note-7', pitch: 60, time: 6.4, duration: 0.8, velocity: 0.8, lyric: 'こ' },   // C4 - こ
  { id: 'voice-note-8', pitch: 57, time: 7.2, duration: 0.8, velocity: 0.75, lyric: 'ろ' },  // A3 - ろ
  { id: 'voice-note-9', pitch: 55, time: 8.0, duration: 0.8, velocity: 0.75, lyric: 'か' },  // G3 - か
  { id: 'voice-note-10', pitch: 48, time: 8.8, duration: 2.4, velocity: 0.8, lyric: 'ら' },  // C3 - ら (長く、心からの思いを込めて)

  // 「ありがとう」(リピート・より感情的に)
  { id: 'voice-note-11', pitch: 60, time: 12.0, duration: 0.6, velocity: 0.85, lyric: 'あ' }, // C4 - あ
  { id: 'voice-note-12', pitch: 62, time: 12.6, duration: 0.6, velocity: 0.85, lyric: 'り' }, // D4 - り
  { id: 'voice-note-13', pitch: 64, time: 13.2, duration: 0.6, velocity: 0.9, lyric: 'が' },  // E4 - が
  { id: 'voice-note-14', pitch: 65, time: 13.8, duration: 0.6, velocity: 0.95, lyric: 'と' }, // F4 - と
  { id: 'voice-note-15', pitch: 67, time: 14.4, duration: 1.2, velocity: 1.0, lyric: 'う' },  // G4 - う (クライマックス)

  // 「こころから」(最終・静かに)
  { id: 'voice-note-16', pitch: 64, time: 16.0, duration: 0.8, velocity: 0.7, lyric: 'こ' },  // E4 - こ
  { id: 'voice-note-17', pitch: 62, time: 16.8, duration: 0.8, velocity: 0.65, lyric: 'こ' }, // D4 - こ
  { id: 'voice-note-18', pitch: 60, time: 17.6, duration: 0.8, velocity: 0.6, lyric: 'ろ' },  // C4 - ろ
  { id: 'voice-note-19', pitch: 57, time: 18.4, duration: 0.8, velocity: 0.55, lyric: 'か' }, // A3 - か
  { id: 'voice-note-20', pitch: 48, time: 19.2, duration: 2.8, velocity: 0.5, lyric: 'ら' }   // C3 - ら (最終・心からの感謝で静かに終わる)
]

/**
 * サンプルDrum Trackのグリッドデータ (Basic Rock パターン)
 * 8楽器 × 16ステップのグリッド形式
 */
const createSampleDrumGrid = () => {
  // 8x16のグリッドを初期化（8楽器、16ステップ）
  const grid = Array(8).fill().map(() => Array(16).fill(false))

  // Basic Rockパターンを定義
  // Row 0: Kick (36) - 1拍目と3拍目
  grid[0][0] = true;  // 1拍目
  grid[0][8] = true;  // 3拍目

  // Row 1: Snare (38) - 2拍目と4拍目
  grid[1][4] = true;  // 2拍目
  grid[1][12] = true; // 4拍目

  // Row 2: Hi-Hat (42) - 全ての8分音符
  grid[2][0] = true;  grid[2][2] = true;  grid[2][4] = true;  grid[2][6] = true;
  grid[2][8] = true;  grid[2][10] = true; grid[2][12] = true; grid[2][14] = true;

  return grid
}

/**
 * 完全なサンプルプロジェクトデータ
 */
export const SAMPLE_PROJECT_DATA = {
  // プロジェクト基本情報
  id: 'sample-demo-project',
  name: 'Demo Song - はじめての楽曲',

  // メタデータ
  metadata: {
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    version: '1.0.0',
    creator: 'DAWAI Demo',
    description: 'DAWAIの機能を体験できるサンプル楽曲です。Piano Track、Bass Track、Drum Track、Voice Trackの基本的な使い方を学べます。',
    tags: ['demo', 'sample', 'tutorial', 'beginner', 'voice', 'diffsinger'],
    tempo: 120,
    timeSignature: '4/4',
    key: 'C',
    duration: 8.0, // 8秒 (4小節)
    trackCount: 4,
    autoSaveEnabled: true,
    autoSaveInterval: 30000
  },

  // トラックデータ
  tracks: [
    // Piano Track
    {
      id: 'sample-piano-track',
      name: '🎹 Piano - メロディー',
      type: TRACK_TYPES.MIDI,
      subtype: TRACK_SUBTYPES.PIANO,
      color: '#3B82F6', // ブルー
      volume: 75,
      pan: 0,
      muted: false,
      solo: false,
      midiData: {
        notes: samplePianoNotes,
        tempo: 120,
        timeSignature: '4/4',
        trackId: 'sample-piano-track',
        lastModified: new Date().toISOString()
      }
    },

    // Bass Track
    {
      id: 'sample-bass-track',
      name: '🎸 Bass - ベースライン',
      type: TRACK_TYPES.MIDI,
      subtype: TRACK_SUBTYPES.BASS,
      color: '#8B5CF6', // パープル
      volume: 80,
      pan: 0,
      muted: false,
      solo: false,
      midiData: {
        notes: sampleBassNotes,
        tempo: 120,
        timeSignature: '4/4',
        trackId: 'sample-bass-track',
        lastModified: new Date().toISOString()
      }
    },

    // Drum Track
    {
      id: 'sample-drum-track',
      name: '🥁 Drums - リズム',
      type: TRACK_TYPES.DRUMS,
      subtype: TRACK_SUBTYPES.DRUMS,
      color: '#EF4444', // レッド
      volume: 70,
      pan: 0,
      muted: false,
      solo: false,
      drumData: {
        grid: createSampleDrumGrid(),
        instruments: [
          { id: 'kick', name: 'Kick', icon: '🥁', color: '#EF4444', pitch: 36, velocity: 0.8 },
          { id: 'snare', name: 'Snare', icon: '🥁', color: '#F59E0B', pitch: 38, velocity: 0.7 },
          { id: 'hihat', name: 'Hi-Hat', icon: '🥁', color: '#10B981', pitch: 42, velocity: 0.6 },
          { id: 'crash', name: 'Crash', icon: '🥁', color: '#8B5CF6', pitch: 49, velocity: 0.8 },
          { id: 'tom1', name: 'Tom 1', icon: '🥁', color: '#F97316', pitch: 45, velocity: 0.7 },
          { id: 'tom2', name: 'Tom 2', icon: '🥁', color: '#EC4899', pitch: 47, velocity: 0.7 },
          { id: 'ride', name: 'Ride', icon: '🥁', color: '#06B6D4', pitch: 51, velocity: 0.6 },
          { id: 'floor_tom', name: 'Floor Tom', icon: '🥁', color: '#84CC16', pitch: 41, velocity: 0.7 }
        ],
        tempo: 120,
        timeSignature: '4/4',
        trackId: 'sample-drum-track',
        lastModified: new Date().toISOString(),
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          version: '1.0.0'
        }
      }
    },

    // Voice Track - DiffSinger AI音声合成
    {
      id: 'sample-voice-track',
      name: '🎤 Voice - ハミング',
      type: TRACK_TYPES.DIFFSINGER,
      subtype: TRACK_SUBTYPES.DIFFSINGER,
      color: '#10B981', // グリーン（DiffSinger動作中を示すため）
      volume: 80,
      pan: 0,
      muted: false,
      solo: false,
      midiData: {
        notes: sampleVoiceNotes,
        tempo: 120,
        timeSignature: '4/4',
        trackId: 'sample-voice-track',
        lastModified: new Date().toISOString()
      },
      diffsingerSettings: {
        language: 'ja_JP',
        modelId: 'japanese_v1',
        outputPath: 'outputs/synthesis.wav',
        lyrics: 'あ り が と う こ こ ろ か ら あ り が と う こ こ ろ か ら' // 「ありがとう、こころから」オリジナル歌詞
      }
    }
  ],

  // プロジェクト設定
  settings: {
    tempo: 120,
    zoom: 1,
    instrument: 'piano',
    volume: 0.7,
    metronomeVolume: 0.3,
    autoSave: true,
    ghostTextEnabled: false,
    playbackMode: 'loop',
    quantization: '16th'
  },

  // AI関連データ（将来の機能用）
  aiData: {
    suggestions: [],
    history: [],
    preferences: {
      style: 'classical',
      complexity: 'beginner',
      instruments: ['piano', 'drums']
    }
  }
}

/**
 * サンプルプロジェクトのクイック説明
 */
export const SAMPLE_PROJECT_GUIDE = {
  title: 'サンプルプロジェクトの使い方',
  description: 'このサンプルプロジェクトでDAWAIの基本機能を体験しましょう！',

  features: [
    {
      name: 'Piano Track',
      description: '🎹 C Major スケールのシンプルなメロディーが入っています',
      tips: [
        '再生ボタン▶️でメロディーを聴いてみましょう',
        'ピアノロールをクリックして新しいノートを追加できます',
        'ノートをドラッグして音程や長さを変更できます'
      ]
    },
    {
      name: 'Bass Track',
      description: '🎸 Piano Trackとハーモニーを成すベースラインが入っています',
      tips: [
        'ベース音域（低音域）でのノート編集を体験できます',
        'Piano Trackと組み合わせてハーモニーを楽しめます',
        'ベース専用サンプル音源が使用されています'
      ]
    },
    {
      name: 'Drums Track',
      description: '🥁 Basic Rockパターンが4小節入っています',
      tips: [
        'ドラムグリッドでリズムパターンを確認できます',
        'セルをクリックしてビートを追加・削除できます',
        '様々な楽器（Kick、Snare、Hi-Hat等）を組み合わせられます'
      ]
    },
    {
      name: 'Voice Track',
      description: '🎤 Piano Trackと同じメロディーの自然なハミング（ん、む、ら、あ、ふ）が入っています',
      tips: [
        'DiffSinger AI音声合成技術を体験できます',
        '自然なハミング音で機械的でない温かい音声を楽しめます',
        '歌詞編集ボタンで歌詞を変更・編集できます',
        'Piano Trackと同じメロディーで歌声のハーモニーを楽しめます',
        '音声生成ボタンでAI歌声を生成できます'
      ]
    }
  ],

  nextSteps: [
    '再生してサンプル楽曲を聴く',
    'Piano Trackでノートを編集してみる',
    'Bass Trackでベースラインを変更してみる',
    'Drum Trackでリズムパターンを変更してみる',
    'Voice Trackで歌詞を編集してAI歌声を生成してみる',
    'テンポや音量を調整してみる',
    'AI機能で楽曲を発展させる',
    '完成したら保存やエクスポートする'
  ]
}

/**
 * ユーザー向けサンプルプロジェクト説明
 */
export const SAMPLE_PROJECT_WELCOME_MESSAGE = `
🎵 DAWAIへようこそ！

このサンプルプロジェクトは、DAWAIの基本機能を体験できるように設計されています：

✨ 含まれている内容：
• 🎹 Piano Track - C Major スケールのメロディー
• 🎸 Bass Track - ハーモニーを支えるベースライン
• 🥁 Drum Track - Basic Rockリズムパターン
• 🎤 Voice Track - AI音声合成によるハミング
• ⚙️ 最適化された設定（120 BPM、4/4拍子）

🚀 始め方：
1. ▶️ 再生ボタンでサンプル楽曲を聴いてみましょう
2. トラックをクリックして編集画面を開きましょう
3. ノートやドラムパターンを自由に編集してみましょう

💡 ヒント：
• Piano Trackではピアノロールでノートを編集できます
• Bass Trackではベース音域での低音編集を体験できます
• Drum Trackではグリッドでリズムパターンを作成できます
• Voice TrackでDiffSinger AI音声合成技術を体験できます
• AI機能を使って楽曲をさらに発展させることもできます

楽しい音楽制作をお楽しみください！
`

export default SAMPLE_PROJECT_DATA