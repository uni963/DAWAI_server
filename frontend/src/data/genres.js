/**
 * ジャンル定義データベース
 * 各ジャンルの音楽理論特性とメタデータを定義
 */

export const GENRES = [
  {
    id: 'pop',
    name: {
      ja: 'ポップス',
      en: 'Pop'
    },
    description: {
      ja: 'キャッチーで親しみやすいメロディが特徴。初心者にもわかりやすい構成で、誰でも楽しく作曲できます。',
      en: 'Catchy and accessible melodies. Easy structure for beginners to enjoy composition.'
    },

    // 音楽理論特性
    musicTheory: {
      // 優先スケール
      primaryScales: [
        {
          type: 'major',
          weight: 0.6,
          context: 'メインメロディ、明るい雰囲気'
        },
        {
          type: 'pentatonic_major',
          weight: 0.3,
          context: '覚えやすいフック、サビ部分'
        },
        {
          type: 'minor',
          weight: 0.1,
          context: 'エモーショナルな部分'
        }
      ],

      // 典型的キー
      typicalKeys: [
        { root: 'C', quality: 'major', weight: 0.3 },
        { root: 'G', quality: 'major', weight: 0.2 },
        { root: 'F', quality: 'major', weight: 0.2 },
        { root: 'A', quality: 'minor', weight: 0.15 },
        { root: 'D', quality: 'major', weight: 0.15 }
      ],

      // コード進行パターン
      chordProgressions: [
        {
          name: '王道進行',
          pattern: ['I', 'V', 'vi', 'IV'],
          weight: 0.4,
          description: '最も人気のあるポップス進行'
        },
        {
          name: 'カノン進行',
          pattern: ['vi', 'IV', 'I', 'V'],
          weight: 0.3,
          description: 'エモーショナルで美しい進行'
        },
        {
          name: '基本進行',
          pattern: ['I', 'IV', 'V', 'I'],
          weight: 0.3,
          description: 'シンプルで安定した進行'
        }
      ],

      // リズム特性
      rhythmCharacteristics: {
        swingFeel: 0.0,        // ストレート
        syncopation: 0.3,      // 軽いシンコペーション
        typicalPatterns: [
          {
            name: '8ビート',
            pattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
            applicableTo: ['drum', 'melody'],
            weight: 0.6
          },
          {
            name: '4つ打ち',
            pattern: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
            applicableTo: ['drum', 'bass'],
            weight: 0.4
          }
        ],
        accentBeats: [0, 2]
      }
    },

    // 楽器・音色特性
    instrumentation: {
      typical: [
        { role: 'melody', instruments: ['piano', 'guitar', 'vocals'], weight: 0.4 },
        { role: 'harmony', instruments: ['piano', 'guitar', 'strings'], weight: 0.3 },
        { role: 'bass', instruments: ['bass', 'synth_bass'], weight: 0.2 },
        { role: 'rhythm', instruments: ['drums', 'percussion'], weight: 0.1 }
      ],
      recommended: ['piano', 'acoustic_guitar', 'electric_guitar', 'bass', 'drums']
    },

    // テンポ・拍子特性
    tempoRange: {
      min: 80,
      max: 140,
      typical: 120
    },
    timeSignatures: ['4/4', '3/4'],

    // UI表示用
    color: '#FF6B9D',
    icon: '🎵',
    tags: ['キャッチー', '親しみやすい', '初心者向け', '王道']
  },

  {
    id: 'rock',
    name: {
      ja: 'ロック',
      en: 'Rock'
    },
    description: {
      ja: 'パワフルなギターリフとドライブ感が特徴。エネルギッシュで力強い音楽を作りたい人におすすめ。',
      en: 'Powerful guitar riffs and driving energy. Perfect for creating energetic and strong music.'
    },

    musicTheory: {
      primaryScales: [
        {
          type: 'pentatonic_minor',
          weight: 0.4,
          context: 'ギターソロ、パワフルなリフ'
        },
        {
          type: 'minor',
          weight: 0.3,
          context: 'ダークな雰囲気、ヘヴィな部分'
        },
        {
          type: 'blues',
          weight: 0.2,
          context: 'ブルージーなソロ、表現力豊か'
        },
        {
          type: 'mixolydian',
          weight: 0.1,
          context: 'ロック特有のドミナント感'
        }
      ],

      typicalKeys: [
        { root: 'E', quality: 'minor', weight: 0.25 },
        { root: 'A', quality: 'minor', weight: 0.2 },
        { root: 'D', quality: 'minor', weight: 0.15 },
        { root: 'G', quality: 'minor', weight: 0.15 },
        { root: 'C', quality: 'minor', weight: 0.15 },
        { root: 'B', quality: 'minor', weight: 0.1 }
      ],

      chordProgressions: [
        {
          name: 'パワーコード進行',
          pattern: ['i', 'bVII', 'IV', 'i'],
          weight: 0.4,
          description: 'ロック定番の力強い進行'
        },
        {
          name: 'ヘヴィロック',
          pattern: ['i', 'bVI', 'bVII', 'i'],
          weight: 0.3,
          description: 'メタル系で人気の進行'
        },
        {
          name: 'ブルース進行',
          pattern: ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'],
          weight: 0.3,
          description: '12小節ブルース進行'
        }
      ],

      rhythmCharacteristics: {
        swingFeel: 0.0,
        syncopation: 0.5,
        typicalPatterns: [
          {
            name: 'ロック基本',
            pattern: [1,0,0,0, 1,0,1,0, 1,0,0,0, 1,0,1,0],
            applicableTo: ['drum'],
            weight: 0.4
          },
          {
            name: 'パワーリフ',
            pattern: [1,0,1,1, 0,0,1,0, 1,0,1,1, 0,0,1,0],
            applicableTo: ['melody', 'bass'],
            weight: 0.4
          },
          {
            name: 'ヘヴィビート',
            pattern: [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0],
            applicableTo: ['drum'],
            weight: 0.2
          }
        ],
        accentBeats: [0, 2]
      }
    },

    instrumentation: {
      typical: [
        { role: 'melody', instruments: ['electric_guitar', 'vocals'], weight: 0.4 },
        { role: 'harmony', instruments: ['electric_guitar', 'power_chords'], weight: 0.3 },
        { role: 'bass', instruments: ['bass_guitar', 'synth_bass'], weight: 0.2 },
        { role: 'rhythm', instruments: ['drums', 'heavy_drums'], weight: 0.1 }
      ],
      recommended: ['electric_guitar', 'bass_guitar', 'drums', 'distortion', 'overdrive']
    },

    tempoRange: {
      min: 100,
      max: 180,
      typical: 140
    },
    timeSignatures: ['4/4'],

    color: '#E74C3C',
    icon: '🎸',
    tags: ['パワフル', 'エネルギッシュ', 'ギター', 'ドライブ感']
  },

  {
    id: 'jazz',
    name: {
      ja: 'ジャズ',
      en: 'Jazz'
    },
    description: {
      ja: '洗練されたハーモニーとスウィングフィールが特徴。大人っぽく上品な音楽表現を学べます。',
      en: 'Sophisticated harmony and swing feel. Learn elegant and mature musical expression.'
    },

    musicTheory: {
      primaryScales: [
        {
          type: 'major',
          weight: 0.3,
          context: 'メジャーキーのスタンダード'
        },
        {
          type: 'dorian',
          weight: 0.25,
          context: 'ii7コード上、モーダル'
        },
        {
          type: 'mixolydian',
          weight: 0.2,
          context: 'V7コード上、ドミナント'
        },
        {
          type: 'minor',
          weight: 0.15,
          context: 'マイナーキーのスタンダード'
        },
        {
          type: 'blues',
          weight: 0.1,
          context: 'ブルージーな表現'
        }
      ],

      typicalKeys: [
        { root: 'C', quality: 'major', weight: 0.2 },
        { root: 'F', quality: 'major', weight: 0.15 },
        { root: 'Bb', quality: 'major', weight: 0.15 },
        { root: 'G', quality: 'major', weight: 0.15 },
        { root: 'D', quality: 'minor', weight: 0.15 },
        { root: 'A', quality: 'minor', weight: 0.2 }
      ],

      chordProgressions: [
        {
          name: 'ii-V-I進行',
          pattern: ['ii7', 'V7', 'Imaj7'],
          weight: 0.5,
          description: 'ジャズの基本進行'
        },
        {
          name: 'サークル進行',
          pattern: ['Imaj7', 'vi7', 'ii7', 'V7'],
          weight: 0.3,
          description: '循環コード進行'
        },
        {
          name: 'マイナーii-V-i',
          pattern: ['ii7b5', 'V7', 'i7'],
          weight: 0.2,
          description: 'マイナーキーのii-V-i'
        }
      ],

      rhythmCharacteristics: {
        swingFeel: 0.7,
        syncopation: 0.8,
        typicalPatterns: [
          {
            name: 'スウィング',
            pattern: [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0],
            applicableTo: ['drum', 'melody'],
            weight: 0.5
          },
          {
            name: 'ウォーキングベース',
            pattern: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
            applicableTo: ['bass'],
            weight: 0.3
          },
          {
            name: 'ラテン',
            pattern: [1,0,1,0, 0,1,0,1, 1,0,1,0, 0,1,0,1],
            applicableTo: ['drum'],
            weight: 0.2
          }
        ],
        accentBeats: [0, 2]
      }
    },

    instrumentation: {
      typical: [
        { role: 'melody', instruments: ['piano', 'trumpet', 'saxophone', 'vocals'], weight: 0.4 },
        { role: 'harmony', instruments: ['piano', 'guitar', 'vibraphone'], weight: 0.3 },
        { role: 'bass', instruments: ['upright_bass', 'electric_bass'], weight: 0.2 },
        { role: 'rhythm', instruments: ['jazz_drums', 'percussion'], weight: 0.1 }
      ],
      recommended: ['piano', 'jazz_guitar', 'upright_bass', 'jazz_drums', 'saxophone']
    },

    tempoRange: {
      min: 60,
      max: 200,
      typical: 120
    },
    timeSignatures: ['4/4', '3/4', '5/4'],

    color: '#F39C12',
    icon: '🎺',
    tags: ['洗練', 'スウィング', 'ハーモニー', '大人っぽい']
  },

  {
    id: 'edm',
    name: {
      ja: 'EDM',
      en: 'EDM (Electronic Dance Music)'
    },
    description: {
      ja: 'エレクトロニックサウンドとダンサブルなビートが特徴。モダンでクールな音楽制作を体験できます。',
      en: 'Electronic sounds and danceable beats. Experience modern and cool music production.'
    },

    musicTheory: {
      primaryScales: [
        {
          type: 'minor',
          weight: 0.4,
          context: 'ダークで深みのあるメロディ'
        },
        {
          type: 'pentatonic_minor',
          weight: 0.3,
          context: 'シンプルで印象的なメロディ'
        },
        {
          type: 'major',
          weight: 0.2,
          context: 'アップリフティングな部分'
        },
        {
          type: 'dorian',
          weight: 0.1,
          context: 'モーダルでモダンな響き'
        }
      ],

      typicalKeys: [
        { root: 'A', quality: 'minor', weight: 0.2 },
        { root: 'E', quality: 'minor', weight: 0.15 },
        { root: 'D', quality: 'minor', weight: 0.15 },
        { root: 'F#', quality: 'minor', weight: 0.15 },
        { root: 'C', quality: 'major', weight: 0.15 },
        { root: 'G', quality: 'major', weight: 0.2 }
      ],

      chordProgressions: [
        {
          name: 'ビルドアップ進行',
          pattern: ['vi', 'IV', 'I', 'V'],
          weight: 0.4,
          description: 'EDMビルドアップ定番'
        },
        {
          name: 'ドロップ進行',
          pattern: ['I', 'V', 'vi', 'IV'],
          weight: 0.4,
          description: 'ドロップ部分の定番進行'
        },
        {
          name: 'マイナー系EDM',
          pattern: ['vi', 'IV', 'V', 'vi'],
          weight: 0.2,
          description: 'マイナーキーEDM進行'
        }
      ],

      rhythmCharacteristics: {
        swingFeel: 0.0,
        syncopation: 0.6,
        typicalPatterns: [
          {
            name: '4つ打ち',
            pattern: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
            applicableTo: ['drum'],
            weight: 0.4
          },
          {
            name: 'ハーフタイム',
            pattern: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
            applicableTo: ['drum'],
            weight: 0.3
          },
          {
            name: 'ダブステップ',
            pattern: [1,0,0,1, 0,1,0,0, 1,0,0,1, 0,1,0,0],
            applicableTo: ['drum', 'bass'],
            weight: 0.3
          }
        ],
        accentBeats: [0]
      }
    },

    instrumentation: {
      typical: [
        { role: 'melody', instruments: ['synth_lead', 'electric_piano', 'vocals'], weight: 0.4 },
        { role: 'harmony', instruments: ['synth_pad', 'electric_piano'], weight: 0.3 },
        { role: 'bass', instruments: ['synth_bass', '808_bass'], weight: 0.2 },
        { role: 'rhythm', instruments: ['electronic_drums', 'samples'], weight: 0.1 }
      ],
      recommended: ['synth_lead', 'synth_bass', 'electronic_drums', 'synth_pad', '808']
    },

    tempoRange: {
      min: 110,
      max: 150,
      typical: 128
    },
    timeSignatures: ['4/4'],

    color: '#9B59B6',
    icon: '🎛️',
    tags: ['エレクトロニック', 'ダンス', 'モダン', 'クール']
  },

  {
    id: 'classical',
    name: {
      ja: 'クラシック',
      en: 'Classical'
    },
    description: {
      ja: '伝統的な和声法と美しいメロディラインが特徴。音楽理論の基礎をしっかり学べます。',
      en: 'Traditional harmony and beautiful melodic lines. Learn the fundamentals of music theory.'
    },

    musicTheory: {
      primaryScales: [
        {
          type: 'major',
          weight: 0.5,
          context: '明るく安定したメロディ'
        },
        {
          type: 'minor',
          weight: 0.4,
          context: '深みのあるメロディ'
        },
        {
          type: 'dorian',
          weight: 0.05,
          context: '教会旋法'
        },
        {
          type: 'mixolydian',
          weight: 0.05,
          context: '教会旋法'
        }
      ],

      typicalKeys: [
        { root: 'C', quality: 'major', weight: 0.2 },
        { root: 'G', quality: 'major', weight: 0.15 },
        { root: 'F', quality: 'major', weight: 0.15 },
        { root: 'D', quality: 'major', weight: 0.1 },
        { root: 'A', quality: 'minor', weight: 0.15 },
        { root: 'E', quality: 'minor', weight: 0.1 },
        { root: 'B', quality: 'minor', weight: 0.15 }
      ],

      chordProgressions: [
        {
          name: '古典進行',
          pattern: ['I', 'vi', 'IV', 'V'],
          weight: 0.4,
          description: 'クラシック基本進行'
        },
        {
          name: 'ドミナント解決',
          pattern: ['I', 'IV', 'V', 'I'],
          weight: 0.3,
          description: 'トニック-サブドミナント-ドミナント-トニック'
        },
        {
          name: 'サブドミナント進行',
          pattern: ['I', 'ii', 'V', 'I'],
          weight: 0.3,
          description: 'ii度を経由した進行'
        }
      ],

      rhythmCharacteristics: {
        swingFeel: 0.0,
        syncopation: 0.2,
        typicalPatterns: [
          {
            name: '4分音符',
            pattern: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
            applicableTo: ['melody', 'harmony'],
            weight: 0.4
          },
          {
            name: '8分音符',
            pattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
            applicableTo: ['melody'],
            weight: 0.3
          },
          {
            name: 'ワルツ',
            pattern: [1,0,0, 1,0,0, 1,0,0, 1,0,0],
            applicableTo: ['harmony'],
            weight: 0.3
          }
        ],
        accentBeats: [0]
      }
    },

    instrumentation: {
      typical: [
        { role: 'melody', instruments: ['piano', 'violin', 'flute'], weight: 0.4 },
        { role: 'harmony', instruments: ['piano', 'strings', 'harp'], weight: 0.4 },
        { role: 'bass', instruments: ['cello', 'double_bass'], weight: 0.2 }
      ],
      recommended: ['piano', 'violin', 'cello', 'flute', 'harp']
    },

    tempoRange: {
      min: 60,
      max: 160,
      typical: 100
    },
    timeSignatures: ['4/4', '3/4', '2/4', '6/8'],

    color: '#34495E',
    icon: '🎼',
    tags: ['伝統的', '美しい', '理論的', '優雅']
  },

  {
    id: 'folk',
    name: {
      ja: 'フォーク',
      en: 'Folk'
    },
    description: {
      ja: 'アコースティックで温かみのある素朴な音楽。ストーリーテリングと心に響くメロディが特徴です。',
      en: 'Acoustic and warm, simple music. Features storytelling and heartfelt melodies.'
    },

    musicTheory: {
      primaryScales: [
        {
          type: 'major',
          weight: 0.5,
          context: '明るく親しみやすいメロディ'
        },
        {
          type: 'pentatonic_major',
          weight: 0.3,
          context: 'シンプルで覚えやすいフレーズ'
        },
        {
          type: 'minor',
          weight: 0.15,
          context: '感情的でメランコリック'
        },
        {
          type: 'dorian',
          weight: 0.05,
          context: 'ケルト的な響き'
        }
      ],

      typicalKeys: [
        { root: 'C', quality: 'major', weight: 0.25 },
        { root: 'G', quality: 'major', weight: 0.2 },
        { root: 'D', quality: 'major', weight: 0.2 },
        { root: 'A', quality: 'major', weight: 0.15 },
        { root: 'A', quality: 'minor', weight: 0.1 },
        { root: 'E', quality: 'minor', weight: 0.1 }
      ],

      chordProgressions: [
        {
          name: 'フォーク基本',
          pattern: ['I', 'V', 'vi', 'IV'],
          weight: 0.4,
          description: 'シンプルで親しみやすい進行'
        },
        {
          name: 'カントリー進行',
          pattern: ['I', 'IV', 'V', 'I'],
          weight: 0.3,
          description: '伝統的なカントリー進行'
        },
        {
          name: 'ケルト進行',
          pattern: ['vi', 'IV', 'I', 'V'],
          weight: 0.3,
          description: 'ケルト音楽風の美しい進行'
        }
      ],

      rhythmCharacteristics: {
        swingFeel: 0.1,
        syncopation: 0.2,
        typicalPatterns: [
          {
            name: 'フィンガーピッキング',
            pattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
            applicableTo: ['guitar'],
            weight: 0.4
          },
          {
            name: 'ストラミング',
            pattern: [1,0,0,1, 0,1,0,1, 1,0,0,1, 0,1,0,1],
            applicableTo: ['guitar'],
            weight: 0.3
          },
          {
            name: 'ワルツ',
            pattern: [1,0,0, 1,0,0, 1,0,0, 1,0,0],
            applicableTo: ['all'],
            weight: 0.3
          }
        ],
        accentBeats: [0]
      }
    },

    instrumentation: {
      typical: [
        { role: 'melody', instruments: ['acoustic_guitar', 'vocals', 'harmonica'], weight: 0.4 },
        { role: 'harmony', instruments: ['acoustic_guitar', 'piano', 'mandolin'], weight: 0.3 },
        { role: 'bass', instruments: ['upright_bass', 'acoustic_bass'], weight: 0.2 },
        { role: 'rhythm', instruments: ['acoustic_drums', 'cajón', 'shaker'], weight: 0.1 }
      ],
      recommended: ['acoustic_guitar', 'harmonica', 'upright_bass', 'mandolin', 'banjo']
    },

    tempoRange: {
      min: 60,
      max: 140,
      typical: 100
    },
    timeSignatures: ['4/4', '3/4', '6/8'],

    color: '#27AE60',
    icon: '🪕',
    tags: ['アコースティック', '素朴', 'ストーリー', '温かい']
  }
];

export default GENRES;