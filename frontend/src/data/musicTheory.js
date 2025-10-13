/**
 * 音楽理論データベース
 * ジャンル別の音楽理論特性を定義
 */

export const MUSIC_THEORY_DATA = {
  // スケールデータベース
  scales: {
    major: {
      intervals: [0, 2, 4, 5, 7, 9, 11],
      degrees: ['1', '2', '3', '4', '5', '6', '7'],
      characteristics: 'Bright, happy, stable',
      jaCharacteristics: '明るい、安定した、ハッピー'
    },
    minor: {
      intervals: [0, 2, 3, 5, 7, 8, 10],
      degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
      characteristics: 'Dark, melancholic, emotional',
      jaCharacteristics: '暗い、メランコリック、感情的'
    },
    pentatonic_major: {
      intervals: [0, 2, 4, 7, 9],
      degrees: ['1', '2', '3', '5', '6'],
      characteristics: 'Simple, folk-like, safe for improvisation',
      jaCharacteristics: 'シンプル、民族的、即興に適している'
    },
    pentatonic_minor: {
      intervals: [0, 3, 5, 7, 10],
      degrees: ['1', 'b3', '4', '5', 'b7'],
      characteristics: 'Bluesy, emotional, expressive',
      jaCharacteristics: 'ブルージー、感情的、表現力豊か'
    },
    blues: {
      intervals: [0, 3, 5, 6, 7, 10],
      degrees: ['1', 'b3', '4', 'b5', '5', 'b7'],
      characteristics: 'Bluesy, expressive, tension-resolution',
      jaCharacteristics: 'ブルージー、表現力豊か、緊張と解決'
    },
    dorian: {
      intervals: [0, 2, 3, 5, 7, 9, 10],
      degrees: ['1', '2', 'b3', '4', '5', '6', 'b7'],
      characteristics: 'Modal, jazzy, sophisticated',
      jaCharacteristics: 'モーダル、ジャジー、洗練された'
    },
    mixolydian: {
      intervals: [0, 2, 4, 5, 7, 9, 10],
      degrees: ['1', '2', '3', '4', '5', '6', 'b7'],
      characteristics: 'Dominant, rock-like, bluesy',
      jaCharacteristics: 'ドミナント、ロック的、ブルージー'
    }
  },

  // コード進行パターン
  chordProgressions: {
    pop: {
      common: [
        {
          name: '王道進行',
          pattern: ['I', 'V', 'vi', 'IV'],
          description: '最も人気のあるポップス進行',
          weight: 0.4
        },
        {
          name: '基本進行',
          pattern: ['I', 'IV', 'V', 'I'],
          description: 'クラシカルな基本進行',
          weight: 0.3
        },
        {
          name: 'カノン進行',
          pattern: ['vi', 'IV', 'I', 'V'],
          description: 'パッヘルベルのカノン進行',
          weight: 0.3
        }
      ],
      resolutions: {
        'I': ['IV', 'V', 'vi', 'ii'],
        'IV': ['I', 'V', 'ii', 'vi'],
        'V': ['I', 'vi'],
        'vi': ['IV', 'V', 'ii'],
        'ii': ['V', 'I']
      },
      avoidances: [
        ['V', 'IV'],  // 強進行の逆行は避ける
        ['I', 'ii']   // 直接的な進行は避ける
      ]
    },

    rock: {
      common: [
        {
          name: 'パワーコード進行',
          pattern: ['I', 'bVII', 'IV', 'I'],
          description: 'ロック定番の力強い進行',
          weight: 0.4
        },
        {
          name: 'ブルース進行',
          pattern: ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'],
          description: '12小節ブルース進行',
          weight: 0.3
        },
        {
          name: 'ヘヴィロック',
          pattern: ['i', 'bVI', 'bVII', 'i'],
          description: 'メタル系で人気の進行',
          weight: 0.3
        }
      ],
      resolutions: {
        'I': ['bVII', 'IV', 'V'],
        'IV': ['I', 'V', 'bVII'],
        'V': ['I', 'IV'],
        'bVII': ['I', 'IV'],
        'i': ['bVI', 'bVII', 'iv'],
        'bVI': ['bVII', 'i'],
        'iv': ['V', 'i']
      }
    },

    jazz: {
      common: [
        {
          name: 'ii-V-I進行',
          pattern: ['ii7', 'V7', 'Imaj7'],
          description: 'ジャズの基本進行',
          weight: 0.5
        },
        {
          name: 'サークル進行',
          pattern: ['Imaj7', 'vi7', 'ii7', 'V7'],
          description: '循環コード進行',
          weight: 0.3
        },
        {
          name: 'マイナーii-V-i',
          pattern: ['ii7b5', 'V7', 'i7'],
          description: 'マイナーキーのii-V-i',
          weight: 0.2
        }
      ],
      resolutions: {
        'Imaj7': ['vi7', 'ii7', 'IVmaj7'],
        'ii7': ['V7', 'Imaj7'],
        'V7': ['Imaj7', 'vi7'],
        'vi7': ['ii7', 'V7'],
        'IVmaj7': ['iii7', 'vi7']
      }
    },

    edm: {
      common: [
        {
          name: 'ビルドアップ進行',
          pattern: ['vi', 'IV', 'I', 'V'],
          description: 'EDMビルドアップ定番',
          weight: 0.4
        },
        {
          name: 'ドロップ進行',
          pattern: ['I', 'V', 'vi', 'IV'],
          description: 'ドロップ部分の定番進行',
          weight: 0.4
        },
        {
          name: 'マイナー系EDM',
          pattern: ['vi', 'IV', 'V', 'vi'],
          description: 'マイナーキーEDM進行',
          weight: 0.2
        }
      ],
      resolutions: {
        'I': ['V', 'vi', 'IV'],
        'IV': ['I', 'V', 'vi'],
        'V': ['I', 'vi'],
        'vi': ['IV', 'V', 'I']
      }
    }
  },

  // リズムパターン
  rhythmPatterns: {
    pop: {
      typical: [
        {
          name: '4つ打ち',
          pattern: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
          description: 'ベーシック4つ打ち',
          applicableTo: ['drum', 'bass'],
          weight: 0.3
        },
        {
          name: '8ビート',
          pattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
          description: 'ポップス定番8ビート',
          applicableTo: ['drum', 'melody'],
          weight: 0.4
        },
        {
          name: '16ビート',
          pattern: [1,0,0,1, 0,1,0,1, 1,0,0,1, 0,1,0,1],
          description: 'ファンク系16ビート',
          applicableTo: ['drum'],
          weight: 0.3
        }
      ],
      subdivisions: [4, 8, 16],
      accentBeats: [0, 2]  // 1拍目と3拍目にアクセント
    },

    rock: {
      typical: [
        {
          name: 'ロック基本',
          pattern: [1,0,0,0, 1,0,1,0, 1,0,0,0, 1,0,1,0],
          description: 'ロック基本パターン',
          applicableTo: ['drum'],
          weight: 0.4
        },
        {
          name: 'パワーリフ',
          pattern: [1,0,1,1, 0,0,1,0, 1,0,1,1, 0,0,1,0],
          description: 'パワフルなリフパターン',
          applicableTo: ['melody', 'bass'],
          weight: 0.3
        },
        {
          name: 'ヘヴィビート',
          pattern: [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0],
          description: 'ヘヴィロックビート',
          applicableTo: ['drum'],
          weight: 0.3
        }
      ],
      subdivisions: [4, 8, 16],
      accentBeats: [0, 2, 3]
    },

    jazz: {
      typical: [
        {
          name: 'スウィング',
          pattern: [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0],
          description: 'ジャズスウィングパターン',
          applicableTo: ['drum', 'melody'],
          weight: 0.5
        },
        {
          name: 'ラテン',
          pattern: [1,0,1,0, 0,1,0,1, 1,0,1,0, 0,1,0,1],
          description: 'ラテンジャズリズム',
          applicableTo: ['drum'],
          weight: 0.3
        },
        {
          name: 'ウォーキングベース',
          pattern: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
          description: 'ウォーキングベースライン',
          applicableTo: ['bass'],
          weight: 0.2
        }
      ],
      subdivisions: [3, 6, 12],  // 3連符ベース
      accentBeats: [0, 2]
    },

    edm: {
      typical: [
        {
          name: '4つ打ち',
          pattern: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
          description: 'EDM基本4つ打ち',
          applicableTo: ['drum'],
          weight: 0.4
        },
        {
          name: 'ハーフタイム',
          pattern: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
          description: 'ハーフタイムフィール',
          applicableTo: ['drum'],
          weight: 0.3
        },
        {
          name: 'ダブステップ',
          pattern: [1,0,0,1, 0,1,0,0, 1,0,0,1, 0,1,0,0],
          description: 'ダブステップリズム',
          applicableTo: ['drum', 'bass'],
          weight: 0.3
        }
      ],
      subdivisions: [16, 32],
      accentBeats: [0]  // 1拍目強調
    }
  },

  // コードデータベース
  chords: {
    'major': {
      intervals: [0, 4, 7],
      function: 'tonic',
      symbol: '',
      tensions: [9, 11, 13]
    },
    'minor': {
      intervals: [0, 3, 7],
      function: 'tonic',
      symbol: 'm',
      tensions: [9, 11, 13]
    },
    'dominant7': {
      intervals: [0, 4, 7, 10],
      function: 'dominant',
      symbol: '7',
      tensions: [9, 11, 13]
    },
    'major7': {
      intervals: [0, 4, 7, 11],
      function: 'tonic',
      symbol: 'maj7',
      tensions: [9, 11, 13]
    },
    'minor7': {
      intervals: [0, 3, 7, 10],
      function: 'subdominant',
      symbol: 'm7',
      tensions: [9, 11, 13]
    },
    'diminished': {
      intervals: [0, 3, 6],
      function: 'leading',
      symbol: 'dim',
      tensions: [9, 11]
    },
    'half_diminished': {
      intervals: [0, 3, 6, 10],
      function: 'subdominant',
      symbol: 'm7b5',
      tensions: [9, 11]
    },
    'augmented': {
      intervals: [0, 4, 8],
      function: 'other',
      symbol: 'aug',
      tensions: [9, 11]
    }
  },

  // 音名マッピング
  noteNames: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],

  // ローマ数字マッピング
  romanNumerals: {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7,
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7,
    'bII': 2, 'bIII': 3, 'bVI': 6, 'bVII': 7
  }
};

export default MUSIC_THEORY_DATA;