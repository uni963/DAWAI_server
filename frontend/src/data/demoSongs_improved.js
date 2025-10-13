/**
 * 改良版Demo Song データベース - プロ品質3トラック構成
 * 各ジャンル2曲、計12曲をプロレベルで再構築
 * - 最低3トラック (メロディ + ベース + ドラム)
 * - 6秒間のダイナミックな楽曲 (ドラムは16秒フル)
 * - 音楽理論・ジャンル特性を活かした魅力的な楽曲
 */

export const DEMO_SONGS = [
  // =============== ポップス Demo Songs (改良版) ===============
  {
    id: 'pop_sunny_day',
    genreId: 'pop',

    metadata: {
      title: {
        ja: '晴れた日の歌',
        en: 'Sunny Day Song'
      },
      description: {
        ja: 'プロ品質のキャッチーなポップス。躍動感のあるテンポとダイナミックなアレンジが魅力的です。',
        en: 'Professional quality catchy pop with dynamic tempo and arrangement.'
      },
      difficulty: 'beginner',
      estimatedCompletionTime: 15
    },

    structure: {
      tempo: 135,  // 120→135 BPM (躍動感向上)
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'C', quality: 'major' },
      totalBars: 32,
      completedBars: 12,  // 6秒間 = 約12小節 @ 135BPM
      sections: [
        { name: 'intro_dynamic', startBar: 1, endBar: 4, completed: true },
        { name: 'verse_catchy', startBar: 5, endBar: 8, completed: true },
        { name: 'pre_chorus_build', startBar: 9, endBar: 12, completed: true },
        { name: 'chorus', startBar: 13, endBar: 24, completed: false, suggestedChords: ['C', 'G', 'Am', 'F'] },
        { name: 'verse_b', startBar: 25, endBar: 28, completed: false },
        { name: 'outro', startBar: 29, endBar: 32, completed: false }
      ]
    },

    tracks: {
      // === Track 1: エレクトリックピアノ (メインメロディ + コード) ===
      midi: [
        {
          id: 'pop_electric_piano',
          name: 'エレクトリックピアノ',
          instrumentType: 'electric_piano',
          duration: 6.0,  // 6秒間
          notes: [
            // Intro - ダイナミックエントリー (0-2秒)
            { pitch: 72, time: 0.0, duration: 0.3, velocity: 85 },   // C5
            { pitch: 76, time: 0.3, duration: 0.3, velocity: 90 },   // E5
            { pitch: 79, time: 0.6, duration: 0.6, velocity: 95 },   // G5
            { pitch: 84, time: 1.2, duration: 0.8, velocity: 100 },  // C6

            // コード追加 - C Major
            { pitch: 60, time: 0.0, duration: 2.0, velocity: 70 },   // C4
            { pitch: 64, time: 0.0, duration: 2.0, velocity: 65 },   // E4
            { pitch: 67, time: 0.0, duration: 2.0, velocity: 65 },   // G4

            // Verse - キャッチーメロディ (2-4秒)
            { pitch: 84, time: 2.0, duration: 0.4, velocity: 90 },   // C6
            { pitch: 83, time: 2.4, duration: 0.2, velocity: 85 },   // B5
            { pitch: 81, time: 2.6, duration: 0.4, velocity: 90 },   // A5
            { pitch: 79, time: 3.0, duration: 0.5, velocity: 85 },   // G5
            { pitch: 76, time: 3.5, duration: 0.5, velocity: 80 },   // E5

            // コード進行 G Major
            { pitch: 67, time: 2.0, duration: 2.0, velocity: 70 },   // G4
            { pitch: 71, time: 2.0, duration: 2.0, velocity: 65 },   // B4
            { pitch: 74, time: 2.0, duration: 2.0, velocity: 65 },   // D5

            // Pre-Chorus ビルドアップ (4-6秒)
            { pitch: 81, time: 4.0, duration: 0.3, velocity: 95 },   // A5
            { pitch: 84, time: 4.3, duration: 0.3, velocity: 100 },  // C6
            { pitch: 88, time: 4.6, duration: 0.4, velocity: 105 },  // E6
            { pitch: 91, time: 5.0, duration: 0.5, velocity: 110 },  // G6
            { pitch: 84, time: 5.5, duration: 0.5, velocity: 100 },  // C6

            // Am-F コード進行
            { pitch: 69, time: 4.0, duration: 1.0, velocity: 75 },   // A4
            { pitch: 72, time: 4.0, duration: 1.0, velocity: 70 },   // C5
            { pitch: 76, time: 4.0, duration: 1.0, velocity: 70 },   // E5

            { pitch: 65, time: 5.0, duration: 1.0, velocity: 75 },   // F4
            { pitch: 69, time: 5.0, duration: 1.0, velocity: 70 },   // A4
            { pitch: 72, time: 5.0, duration: 1.0, velocity: 70 }    // C5
          ],
          lyric: 'きら きら ひかる あさのそら たかく とんでいこう みらいへ'
        }
      ],

      // === Track 2: エレクトリックベース (グルーヴィなベースライン) ===
      bass: [
        {
          id: 'pop_electric_bass',
          name: 'エレクトリックベース',
          instrumentType: 'electric_bass',
          duration: 6.0,  // 6秒間
          notes: [
            // C-G-Am-F 進行に基づくグルーヴィなベースライン

            // C Major section (0-2秒)
            { pitch: 36, time: 0.0, duration: 0.4, velocity: 95 },   // C2
            { pitch: 36, time: 0.5, duration: 0.3, velocity: 90 },   // C2
            { pitch: 43, time: 1.0, duration: 0.4, velocity: 100 },  // G2
            { pitch: 40, time: 1.5, duration: 0.5, velocity: 95 },   // E2

            // G Major section (2-3秒)
            { pitch: 43, time: 2.0, duration: 0.4, velocity: 100 },  // G2
            { pitch: 47, time: 2.5, duration: 0.5, velocity: 95 },   // B2

            // A minor section (3-4秒)
            { pitch: 45, time: 3.0, duration: 0.4, velocity: 100 },  // A2
            { pitch: 48, time: 3.5, duration: 0.5, velocity: 95 },   // C3

            // F Major section (4-5秒)
            { pitch: 41, time: 4.0, duration: 0.4, velocity: 100 },  // F2
            { pitch: 45, time: 4.5, duration: 0.5, velocity: 95 },   // A2

            // Dynamic finale (5-6秒)
            { pitch: 36, time: 5.0, duration: 0.3, velocity: 105 },  // C2
            { pitch: 43, time: 5.3, duration: 0.3, velocity: 100 },  // G2
            { pitch: 36, time: 5.6, duration: 0.4, velocity: 110 }   // C2
          ]
        }
      ],

      // === Track 3: ポップスドラム (16秒フル、8ビート + ダイナミックフィル) ===
      drum: [
        {
          id: 'pop_drums_pro',
          name: 'ポップスドラム',
          duration: 16.0,  // ドラムは16秒フル
          pattern: {
            // 8ビート基本パターン + フィル
            kick: [
              0, 2, 4, 6, 8, 10, 12, 14,  // 基本4つ打ち
              1.5, 3.5, 5.5, 7.5, 9.5, 11.5, 13.5, 15.5  // シンコペーション
            ],
            snare: [
              1, 3, 5, 7, 9, 11, 13, 15,  // 裏拍スネア
              1.25, 3.25, 5.25, 7.25,    // 追加アクセント
              1.75, 3.75, 5.75, 7.75     // さらなるフィル
            ],
            hihat: [
              // 16分音符ハイハット (0-16秒全体)
              0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75,
              2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75,
              4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75,
              6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75,
              8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75,
              10, 10.25, 10.5, 10.75, 11, 11.25, 11.5, 11.75,
              12, 12.25, 12.5, 12.75, 13, 13.25, 13.5, 13.75,
              14, 14.25, 14.5, 14.75, 15, 15.25, 15.5, 15.75
            ],
            crash: [0, 4, 8, 12],  // 大きなセクション変更
            ride: [2, 6, 10, 14],  // ライドアクセント

            // フィルパターン (スネア連打)
            fill: [
              1.875, 3.875, 5.875, 7.875,  // 16分音符フィル
              9.875, 11.875, 13.875, 15.875
            ]
          }
        }
      ]
    },

    creationGuide: {
      nextSteps: {
        ja: [
          'コーラス部分でより盛り上がるメロディを追加',
          'ストリングスセクションで厚みを出す',
          'Verse Bでメロディバリエーションを',
          'アウトロで印象的なエンディングを'
        ],
        en: [
          'Add more uplifting melody in chorus',
          'Add depth with strings section',
          'Create melody variations in Verse B',
          'Create memorable ending in outro'
        ]
      },
      hints: {
        ja: [
          'テンポ135 BPMで躍動感を活かす',
          'C-G-Am-Fの王道進行で安定感',
          'エレピとベースの絡みでグルーヴ創出'
        ],
        en: [
          'Use 135 BPM tempo for energy',
          'Stable feeling with C-G-Am-F progression',
          'Create groove with electric piano and bass interplay'
        ]
      },
      suggestedAdditions: ['strings', 'vocal_harmony', 'percussion_fills']
    }
  },

  // =============== ロック Demo Songs (改良版) ===============
  {
    id: 'rock_thunder_strike',
    genreId: 'rock',

    metadata: {
      title: {
        ja: '雷鳴のリフ',
        en: 'Thunder Strike Riff'
      },
      description: {
        ja: 'プロ品質のパワフルロック。攻撃的なギターリフと重厚なリズムセクションが迫力満点です。',
        en: 'Professional quality powerful rock with aggressive guitar riffs and heavy rhythm section.'
      },
      difficulty: 'intermediate',
      estimatedCompletionTime: 18
    },

    structure: {
      tempo: 155,  // 140→155 BPM (パワー向上)
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'E', quality: 'minor' },
      totalBars: 24,
      completedBars: 12,  // 6秒間
      sections: [
        { name: 'thunder_intro', startBar: 1, endBar: 4, completed: true },
        { name: 'power_riff', startBar: 5, endBar: 8, completed: true },
        { name: 'heavy_verse', startBar: 9, endBar: 12, completed: true },
        { name: 'chorus', startBar: 13, endBar: 20, completed: false, suggestedChords: ['Em', 'C', 'D', 'Em'] },
        { name: 'guitar_solo', startBar: 21, endBar: 24, completed: false }
      ]
    },

    tracks: {
      // === Track 1: エレクトリックギター (パワフルリフ + ディストーション) ===
      midi: [
        {
          id: 'rock_electric_guitar',
          name: 'エレクトリックギター',
          instrumentType: 'electric_guitar_distortion',
          duration: 6.0,  // 6秒間
          notes: [
            // Thunder Intro - パワフルオープニング (0-2秒)
            { pitch: 40, time: 0.0, duration: 0.25, velocity: 120 },  // E2 (低音)
            { pitch: 40, time: 0.25, duration: 0.25, velocity: 115 }, // E2
            { pitch: 43, time: 0.5, duration: 0.5, velocity: 125 },   // G2
            { pitch: 45, time: 1.0, duration: 0.5, velocity: 120 },   // A2
            { pitch: 40, time: 1.5, duration: 0.5, velocity: 127 },   // E2

            // メインリフ - Em ペンタトニック (0-2秒)
            { pitch: 64, time: 0.0, duration: 0.25, velocity: 110 },  // E4
            { pitch: 67, time: 0.25, duration: 0.25, velocity: 105 }, // G4
            { pitch: 69, time: 0.5, duration: 0.25, velocity: 115 },  // A4
            { pitch: 67, time: 0.75, duration: 0.25, velocity: 110 }, // G4
            { pitch: 64, time: 1.0, duration: 0.5, velocity: 120 },   // E4
            { pitch: 62, time: 1.5, duration: 0.5, velocity: 115 },   // D4

            // Power Riff Development (2-4秒)
            { pitch: 69, time: 2.0, duration: 0.2, velocity: 125 },   // A4
            { pitch: 71, time: 2.2, duration: 0.2, velocity: 120 },   // B4
            { pitch: 74, time: 2.4, duration: 0.4, velocity: 127 },   // D5
            { pitch: 71, time: 2.8, duration: 0.4, velocity: 125 },   // B4
            { pitch: 69, time: 3.2, duration: 0.3, velocity: 120 },   // A4
            { pitch: 67, time: 3.5, duration: 0.5, velocity: 125 },   // G4

            // Heavy Verse - 攻撃的フレーズ (4-6秒)
            { pitch: 76, time: 4.0, duration: 0.3, velocity: 127 },   // E5
            { pitch: 74, time: 4.3, duration: 0.2, velocity: 125 },   // D5
            { pitch: 72, time: 4.5, duration: 0.25, velocity: 120 },  // C5
            { pitch: 71, time: 4.75, duration: 0.25, velocity: 115 }, // B4
            { pitch: 69, time: 5.0, duration: 0.4, velocity: 127 },   // A4
            { pitch: 67, time: 5.4, duration: 0.3, velocity: 125 },   // G4
            { pitch: 64, time: 5.7, duration: 0.3, velocity: 127 }    // E4
          ]
        }
      ],

      // === Track 2: ロックベース (重厚な低音グルーヴ) ===
      bass: [
        {
          id: 'rock_bass_heavy',
          name: 'ロックベース',
          instrumentType: 'electric_bass_rock',
          duration: 6.0,  // 6秒間
          notes: [
            // Em-C-D-Em 進行ベースライン

            // E minor foundation (0-1.5秒)
            { pitch: 28, time: 0.0, duration: 0.4, velocity: 110 },   // E1
            { pitch: 28, time: 0.5, duration: 0.3, velocity: 105 },   // E1
            { pitch: 31, time: 1.0, duration: 0.5, velocity: 115 },   // G1

            // C Major movement (1.5-3秒)
            { pitch: 36, time: 1.5, duration: 0.4, velocity: 115 },   // C2
            { pitch: 40, time: 2.0, duration: 0.4, velocity: 110 },   // E2
            { pitch: 36, time: 2.5, duration: 0.5, velocity: 115 },   // C2

            // D Major bridge (3-4.5秒)
            { pitch: 38, time: 3.0, duration: 0.4, velocity: 115 },   // D2
            { pitch: 42, time: 3.5, duration: 0.4, velocity: 110 },   // F#2
            { pitch: 38, time: 4.0, duration: 0.5, velocity: 115 },   // D2

            // Em return with power (4.5-6秒)
            { pitch: 28, time: 4.5, duration: 0.3, velocity: 120 },   // E1
            { pitch: 35, time: 4.8, duration: 0.3, velocity: 115 },   // B1
            { pitch: 28, time: 5.1, duration: 0.3, velocity: 125 },   // E1
            { pitch: 31, time: 5.4, duration: 0.3, velocity: 120 },   // G1
            { pitch: 28, time: 5.7, duration: 0.3, velocity: 127 }    // E1
          ]
        }
      ],

      // === Track 3: ロックドラム (16秒フル、ヘヴィビート) ===
      drum: [
        {
          id: 'rock_drums_heavy',
          name: 'ロックドラム',
          duration: 16.0,  // ドラムは16秒フル
          pattern: {
            // ヘヴィロックビート
            kick: [
              0, 0.5, 1.5, 2, 2.5, 3.5, 4, 4.5, 5.5, 6, 6.5, 7.5,
              8, 8.5, 9.5, 10, 10.5, 11.5, 12, 12.5, 13.5, 14, 14.5, 15.5
            ],
            snare: [
              1, 3, 5, 7, 9, 11, 13, 15,  // 基本バックビート
              1.5, 3.5, 5.5, 7.5, 9.5, 11.5, 13.5, 15.5  // 追加アタック
            ],
            hihat: [
              // 8分音符ハイハット (エッジィ)
              0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5,
              4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5,
              8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5,
              12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5
            ],
            crash: [
              0, 4, 8, 12,  // メジャーアクセント
              2, 6, 10, 14  // 追加クラッシュ
            ],
            china: [1.75, 3.75, 5.75, 7.75],  // チャイナシンバル

            // ロックフィル (スネア+タム)
            tom_high: [1.875, 5.875, 9.875, 13.875],
            tom_mid: [1.9375, 5.9375, 9.9375, 13.9375],
            tom_floor: [1.96875, 5.96875, 9.96875, 13.96875]
          }
        }
      ]
    },

    creationGuide: {
      nextSteps: {
        ja: [
          'コーラスでパワーコードの重厚なハーモニーを',
          'ギターソロでブルーススケールの激しいフレーズを',
          'より重いベースサウンドで迫力アップ'
        ],
        en: [
          'Heavy harmony with power chords in chorus',
          'Intense phrases with blues scale in guitar solo',
          'More powerful with heavier bass sound'
        ]
      },
      hints: {
        ja: [
          'テンポ155 BPMで攻撃性を最大化',
          'E minorペンタトニック+ブルーススケール',
          'Em-C-D-Em進行で重厚なロック感'
        ],
        en: [
          'Maximize aggression with 155 BPM tempo',
          'E minor pentatonic + blues scale',
          'Heavy rock feel with Em-C-D-Em progression'
        ]
      },
      suggestedAdditions: ['power_chords', 'distortion_effects', 'heavy_reverb']
    }
  }
];

  // =============== ジャズ Demo Songs (改良版) ===============
  {
    id: 'jazz_autumn_leaves',
    genreId: 'jazz',

    metadata: {
      title: {
        ja: '秋の葉のワルツ',
        en: 'Autumn Leaves Waltz'
      },
      description: {
        ja: 'プロ品質のエレガントなジャズワルツ。洗練されたハーモニーとスウィング感が魅力的です。',
        en: 'Professional quality elegant jazz waltz with sophisticated harmony and swing feel.'
      },
      difficulty: 'advanced',
      estimatedCompletionTime: 25
    },

    structure: {
      tempo: 140,  // 120→140 BPM (スウィング感向上)
      timeSignature: { numerator: 3, denominator: 4 },
      key: { root: 'Bb', quality: 'major' },
      totalBars: 32,
      completedBars: 9,   // 6秒間 = 9小節 @ 140BPM in 3/4
      sections: [
        { name: 'head_a_elegant', startBar: 1, endBar: 4, completed: true },
        { name: 'head_b_sophisticated', startBar: 5, endBar: 9, completed: true },
        { name: 'solo_section', startBar: 10, endBar: 18, completed: false, suggestedChords: ['Cm7', 'F7', 'BbMaj7'] },
        { name: 'head_out', startBar: 19, endBar: 24, completed: false }
      ]
    },

    tracks: {
      // === Track 1: ジャズピアノ (コンプレックスハーモニー + メロディ) ===
      midi: [
        {
          id: 'jazz_piano_complex',
          name: 'ジャズピアノ',
          instrumentType: 'jazz_piano',
          duration: 6.0,  // 6秒間
          notes: [
            // Head A - エレガントメロディ (0-2.5秒)
            { pitch: 70, time: 0.0, duration: 0.8, velocity: 85 },    // Bb4
            { pitch: 72, time: 0.8, duration: 0.6, velocity: 80 },    // C5
            { pitch: 74, time: 1.4, duration: 0.6, velocity: 85 },    // D5
            { pitch: 77, time: 2.0, duration: 0.5, velocity: 90 },    // F5

            // ジャズコード Bb Maj7 (0-1.5秒)
            { pitch: 58, time: 0.0, duration: 1.5, velocity: 70 },    // Bb3
            { pitch: 62, time: 0.0, duration: 1.5, velocity: 65 },    // D4
            { pitch: 65, time: 0.0, duration: 1.5, velocity: 65 },    // F4
            { pitch: 69, time: 0.0, duration: 1.5, velocity: 60 },    // A4

            // Head B - 洗練された展開 (2.5-4.5秒)
            { pitch: 79, time: 2.5, duration: 0.7, velocity: 90 },    // G5
            { pitch: 77, time: 3.2, duration: 0.5, velocity: 85 },    // F5
            { pitch: 74, time: 3.7, duration: 0.4, velocity: 80 },    // D5
            { pitch: 72, time: 4.1, duration: 0.4, velocity: 85 },    // C5

            // Cm7 コード (1.5-3秒)
            { pitch: 60, time: 1.5, duration: 1.5, velocity: 75 },    // C4
            { pitch: 63, time: 1.5, duration: 1.5, velocity: 70 },    // Eb4
            { pitch: 67, time: 1.5, duration: 1.5, velocity: 70 },    // G4
            { pitch: 70, time: 1.5, duration: 1.5, velocity: 65 },    // Bb4

            // ジャズ的アドリブフレーズ (4.5-6秒)
            { pitch: 81, time: 4.5, duration: 0.3, velocity: 95 },    // A5
            { pitch: 79, time: 4.8, duration: 0.2, velocity: 90 },    // G5
            { pitch: 77, time: 5.0, duration: 0.3, velocity: 85 },    // F5
            { pitch: 74, time: 5.3, duration: 0.4, velocity: 80 },    // D5
            { pitch: 70, time: 5.7, duration: 0.3, velocity: 85 },    // Bb4

            // F7 コード (3-4.5秒)
            { pitch: 53, time: 3.0, duration: 1.5, velocity: 75 },    // F3
            { pitch: 57, time: 3.0, duration: 1.5, velocity: 70 },    // A3
            { pitch: 60, time: 3.0, duration: 1.5, velocity: 70 },    // C4
            { pitch: 63, time: 3.0, duration: 1.5, velocity: 65 }     // Eb4
          ]
        }
      ],

      // === Track 2: ウォーキングベース (4ビート歩行) ===
      bass: [
        {
          id: 'jazz_walking_bass',
          name: 'ウォーキングベース',
          instrumentType: 'upright_bass',
          duration: 6.0,  // 6秒間
          notes: [
            // ウォーキングベースライン (3/4拍子)
            // BbMaj7-Cm7-F7-BbMaj7 進行

            // BbMaj7 (0-2秒)
            { pitch: 46, time: 0.0, duration: 0.6, velocity: 85 },    // Bb2
            { pitch: 50, time: 0.6, duration: 0.6, velocity: 80 },    // D3
            { pitch: 53, time: 1.2, duration: 0.8, velocity: 85 },    // F3

            // Cm7 への移行 (2-3.5秒)
            { pitch: 48, time: 2.0, duration: 0.7, velocity: 90 },    // C3
            { pitch: 51, time: 2.7, duration: 0.8, velocity: 85 },    // Eb3

            // F7 (3.5-5秒)
            { pitch: 53, time: 3.5, duration: 0.7, velocity: 90 },    // F3
            { pitch: 57, time: 4.2, duration: 0.8, velocity: 85 },    // A3

            // BbMaj7 return (5-6秒)
            { pitch: 46, time: 5.0, duration: 0.5, velocity: 95 },    // Bb2
            { pitch: 50, time: 5.5, duration: 0.5, velocity: 90 }     // D3
          ]
        }
      ],

      // === Track 3: ジャズドラム (ブラシ + ライドシンバル) ===
      drum: [
        {
          id: 'jazz_drums_brush',
          name: 'ジャズドラム（ブラシ）',
          duration: 16.0,  // ドラムは16秒フル
          pattern: {
            // 3/4 ジャズワルツパターン
            kick: [0, 3, 6, 9, 12, 15],  // 1拍目キック
            snare_brush: [
              1, 2, 4, 5, 7, 8, 10, 11, 13, 14  // ブラシスイープ
            ],
            ride: [
              // 3拍子ライドパターン
              0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
              0.33, 1.33, 2.33, 3.33, 4.33, 5.33, 6.33, 7.33,
              8.33, 9.33, 10.33, 11.33, 12.33, 13.33, 14.33, 15.33,
              0.67, 1.67, 2.67, 3.67, 4.67, 5.67, 6.67, 7.67,
              8.67, 9.67, 10.67, 11.67, 12.67, 13.67, 14.67, 15.67
            ],
            brush_sweep: [
              0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5,
              8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5
            ],
            hihat_foot: [1.5, 4.5, 7.5, 10.5, 13.5]  // 足ハイハット
          }
        }
      ]
    },

    creationGuide: {
      nextSteps: {
        ja: [
          'ソロセクションでBb Lydianスケールのアドリブを',
          'ベースソロでウォーキングの変化を',
          'ドラムソロでブラシテクニック展開を'
        ],
        en: [
          'Bb Lydian scale improvisation in solo section',
          'Walking bass variations in bass solo',
          'Brush technique development in drum solo'
        ]
      },
      hints: {
        ja: [
          'テンポ140 BPMの3拍子でスウィング感',
          'ii-V-I進行: Cm7-F7-BbMaj7',
          'ブラシドラムで上品な雰囲気作り'
        ],
        en: [
          'Swing feel with 140 BPM in 3/4',
          'ii-V-I progression: Cm7-F7-BbMaj7',
          'Elegant atmosphere with brush drums'
        ]
      },
      suggestedAdditions: ['vibraphone', 'saxophone', 'piano_comping']
    }
  },

  // =============== EDM Demo Songs (改良版) ===============
  {
    id: 'edm_neon_dreams',
    genreId: 'edm',

    metadata: {
      title: {
        ja: 'ネオンドリーム',
        en: 'Neon Dreams'
      },
      description: {
        ja: 'プロ品質のモダンEDM。パワフルなシンセサウンドと躍動的なビートが未来的な世界を演出します。',
        en: 'Professional quality modern EDM with powerful synth sounds and dynamic beats creating a futuristic world.'
      },
      difficulty: 'intermediate',
      estimatedCompletionTime: 20
    },

    structure: {
      tempo: 145,  // 128→145 BPM (エネルギー向上)
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'A', quality: 'minor' },
      totalBars: 32,
      completedBars: 12,  // 6秒間
      sections: [
        { name: 'synth_intro', startBar: 1, endBar: 4, completed: true },
        { name: 'buildup_energy', startBar: 5, endBar: 8, completed: true },
        { name: 'pre_drop', startBar: 9, endBar: 12, completed: true },
        { name: 'drop', startBar: 13, endBar: 24, completed: false, suggestedChords: ['Am', 'F', 'C', 'G'] },
        { name: 'breakdown', startBar: 25, endBar: 32, completed: false }
      ]
    },

    tracks: {
      // === Track 1: シンセリード (アルペジオ + メロディ) ===
      midi: [
        {
          id: 'edm_synth_lead',
          name: 'シンセリード',
          instrumentType: 'synth_lead_edm',
          duration: 6.0,  // 6秒間
          notes: [
            // Synth Intro - アンビエント導入 (0-2秒)
            { pitch: 69, time: 0.0, duration: 2.0, velocity: 70 },    // A4 (パッド)
            { pitch: 72, time: 0.0, duration: 2.0, velocity: 65 },    // C5
            { pitch: 76, time: 0.0, duration: 2.0, velocity: 60 },    // E5

            // アルペジオパターン (0-2秒)
            { pitch: 81, time: 0.0, duration: 0.25, velocity: 85 },   // A5
            { pitch: 84, time: 0.25, duration: 0.25, velocity: 80 },  // C6
            { pitch: 88, time: 0.5, duration: 0.25, velocity: 85 },   // E6
            { pitch: 84, time: 0.75, duration: 0.25, velocity: 80 },  // C6
            { pitch: 81, time: 1.0, duration: 0.25, velocity: 85 },   // A5
            { pitch: 84, time: 1.25, duration: 0.25, velocity: 80 },  // C6
            { pitch: 88, time: 1.5, duration: 0.25, velocity: 85 },   // E6
            { pitch: 81, time: 1.75, duration: 0.25, velocity: 80 },  // A5

            // Buildup Energy (2-4秒)
            { pitch: 89, time: 2.0, duration: 0.5, velocity: 90 },    // F6
            { pitch: 88, time: 2.5, duration: 0.3, velocity: 85 },    // E6
            { pitch: 86, time: 2.8, duration: 0.4, velocity: 90 },    // D6
            { pitch: 84, time: 3.2, duration: 0.3, velocity: 85 },    // C6
            { pitch: 81, time: 3.5, duration: 0.5, velocity: 95 },    // A5

            // Pre-Drop - 強烈ビルドアップ (4-6秒)
            { pitch: 93, time: 4.0, duration: 0.25, velocity: 100 },  // A6
            { pitch: 91, time: 4.25, duration: 0.25, velocity: 95 },  // G6
            { pitch: 89, time: 4.5, duration: 0.25, velocity: 100 },  // F6
            { pitch: 88, time: 4.75, duration: 0.25, velocity: 95 },  // E6
            { pitch: 86, time: 5.0, duration: 0.3, velocity: 105 },   // D6
            { pitch: 84, time: 5.3, duration: 0.3, velocity: 100 },   // C6
            { pitch: 81, time: 5.6, duration: 0.4, velocity: 110 }    // A5
          ]
        }
      ],

      // === Track 2: シンセベース (サブベース + 太い低音) ===
      bass: [
        {
          id: 'edm_synth_bass',
          name: 'シンセベース',
          instrumentType: 'synth_bass_edm',
          duration: 6.0,  // 6秒間
          notes: [
            // Am-F-C-G 進行のEDMベースライン

            // A minor foundation (0-1.5秒)
            { pitch: 33, time: 0.0, duration: 0.7, velocity: 100 },   // A1
            { pitch: 33, time: 0.8, duration: 0.7, velocity: 95 },    // A1

            // F Major movement (1.5-3秒)
            { pitch: 41, time: 1.5, duration: 0.6, velocity: 105 },   // F2
            { pitch: 36, time: 2.1, duration: 0.4, velocity: 100 },   // C2
            { pitch: 41, time: 2.5, duration: 0.5, velocity: 105 },   // F2

            // C Major section (3-4.5秒)
            { pitch: 36, time: 3.0, duration: 0.6, velocity: 110 },   // C2
            { pitch: 40, time: 3.6, duration: 0.4, velocity: 105 },   // E2
            { pitch: 36, time: 4.0, duration: 0.5, velocity: 110 },   // C2

            // G Major build to drop (4.5-6秒)
            { pitch: 43, time: 4.5, duration: 0.4, velocity: 115 },   // G2
            { pitch: 47, time: 4.9, duration: 0.3, velocity: 110 },   // B2
            { pitch: 43, time: 5.2, duration: 0.3, velocity: 120 },   // G2
            { pitch: 33, time: 5.5, duration: 0.5, velocity: 125 }    // A1 (return)
          ]
        }
      ],

      // === Track 3: EDMドラム (4つ打ち + エネルギッシュビート) ===
      drum: [
        {
          id: 'edm_drums_energy',
          name: 'EDMドラム',
          duration: 16.0,  // ドラムは16秒フル
          pattern: {
            // 4つ打ちパターン + ビルドアップ
            kick: [
              0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15  // フル4つ打ち
            ],
            snare: [
              1, 3, 5, 7, 9, 11, 13, 15,  // 裏拍スネア
              1.5, 3.5, 5.5, 7.5  // ビルドアップ追加
            ],
            hihat: [
              // 16分音符ハイハット (EDMスタイル)
              0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75,
              2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75,
              4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75,
              6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75,
              8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75,
              10, 10.25, 10.5, 10.75, 11, 11.25, 11.5, 11.75,
              12, 12.25, 12.5, 12.75, 13, 13.25, 13.5, 13.75,
              14, 14.25, 14.5, 14.75, 15, 15.25, 15.5, 15.75
            ],
            crash: [0, 4, 8, 12],  // セクション変更
            reverse_crash: [3.75, 7.75, 11.75, 15.75],  // リバースクラッシュ

            // EDM特有のエフェクト
            white_noise: [3.5, 7.5, 11.5, 15.5],  // ホワイトノイズスイープ
            bass_drum: [
              // より強力なキック
              0, 2, 4, 6, 8, 10, 12, 14
            ]
          }
        }
      ]
    },

    creationGuide: {
      nextSteps: {
        ja: [
          'ドロップ部分で圧倒的なシンセベースを',
          'ボーカルチョップでユニークな味付けを',
          'フィルターオートメーションで躍動感を'
        ],
        en: [
          'Overwhelming synth bass in drop section',
          'Unique flavor with vocal chops',
          'Dynamic feel with filter automation'
        ]
      },
      hints: {
        ja: [
          'テンポ145 BPMで高エネルギー',
          'A minorハーモニックマイナーで暗い魅力',
          'サイドチェインで躍動的グルーヴ'
        ],
        en: [
          'High energy with 145 BPM tempo',
          'Dark appeal with A minor harmonic minor',
          'Dynamic groove with sidechain'
        ]
      },
      suggestedAdditions: ['vocal_chops', 'filter_sweeps', 'sidechain_compression']
    }
  },

  // =============== クラシック Demo Songs (改良版) ===============
  {
    id: 'classical_morning_prelude',
    genreId: 'classical',

    metadata: {
      title: {
        ja: '朝のプレリュード',
        en: 'Morning Prelude'
      },
      description: {
        ja: 'プロ品質の美しいバロック風プレリュード。対位法と優雅なメロディが朝の輝きを表現します。',
        en: 'Professional quality beautiful Baroque-style prelude with counterpoint and elegant melodies expressing morning brilliance.'
      },
      difficulty: 'advanced',
      estimatedCompletionTime: 30
    },

    structure: {
      tempo: 110,  // 90→110 BPM (流動性向上)
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'C', quality: 'major' },
      totalBars: 24,
      completedBars: 12,  // 6秒間
      sections: [
        { name: 'exposition_elegant', startBar: 1, endBar: 6, completed: true },
        { name: 'development_complex', startBar: 7, endBar: 12, completed: true },
        { name: 'recapitulation', startBar: 13, endBar: 18, completed: false, suggestedChords: ['C', 'F', 'G', 'C'] },
        { name: 'coda', startBar: 19, endBar: 24, completed: false }
      ]
    },

    tracks: {
      // === Track 1: ピアノ右手 (主メロディ + 装飾) ===
      midi: [
        {
          id: 'classical_piano_melody',
          name: 'ピアノメロディ',
          instrumentType: 'grand_piano',
          duration: 6.0,  // 6秒間
          notes: [
            // Exposition - エレガントな主題 (0-3秒)
            { pitch: 72, time: 0.0, duration: 0.4, velocity: 80 },    // C5
            { pitch: 74, time: 0.4, duration: 0.3, velocity: 75 },    // D5
            { pitch: 76, time: 0.7, duration: 0.4, velocity: 85 },    // E5
            { pitch: 77, time: 1.1, duration: 0.4, velocity: 80 },    // F5
            { pitch: 79, time: 1.5, duration: 0.5, velocity: 90 },    // G5

            // 装飾音符とトリル (1.5-2.5秒)
            { pitch: 81, time: 2.0, duration: 0.2, velocity: 85 },    // A5
            { pitch: 79, time: 2.2, duration: 0.1, velocity: 80 },    // G5
            { pitch: 81, time: 2.3, duration: 0.1, velocity: 85 },    // A5
            { pitch: 79, time: 2.4, duration: 0.1, velocity: 80 },    // G5

            // Development - 複雑な展開 (3-6秒)
            { pitch: 84, time: 3.0, duration: 0.3, velocity: 90 },    // C6
            { pitch: 83, time: 3.3, duration: 0.2, velocity: 85 },    // B5
            { pitch: 81, time: 3.5, duration: 0.3, velocity: 90 },    // A5
            { pitch: 79, time: 3.8, duration: 0.3, velocity: 85 },    // G5
            { pitch: 77, time: 4.1, duration: 0.4, velocity: 80 },    // F5

            // 対位法的展開 (4.5-6秒)
            { pitch: 76, time: 4.5, duration: 0.3, velocity: 85 },    // E5
            { pitch: 74, time: 4.8, duration: 0.2, velocity: 80 },    // D5
            { pitch: 72, time: 5.0, duration: 0.4, velocity: 85 },    // C5
            { pitch: 74, time: 5.4, duration: 0.3, velocity: 80 },    // D5
            { pitch: 72, time: 5.7, duration: 0.3, velocity: 85 }     // C5
          ]
        }
      ],

      // === Track 2: ヴァイオリン (カウンターメロディ) ===
      violin: [
        {
          id: 'classical_violin_counter',
          name: 'ヴァイオリン',
          instrumentType: 'violin',
          duration: 6.0,  // 6秒間
          notes: [
            // カウンターメロディ (主題に対する対位法)

            // 第1声部 (0-2秒)
            { pitch: 67, time: 0.5, duration: 0.4, velocity: 75 },    // G4
            { pitch: 69, time: 0.9, duration: 0.3, velocity: 70 },    // A4
            { pitch: 71, time: 1.2, duration: 0.4, velocity: 80 },    // B4
            { pitch: 72, time: 1.6, duration: 0.4, velocity: 75 },    // C5

            // 美しいハーモニー (2-4秒)
            { pitch: 74, time: 2.0, duration: 0.5, velocity: 80 },    // D5
            { pitch: 76, time: 2.5, duration: 0.4, velocity: 85 },    // E5
            { pitch: 77, time: 2.9, duration: 0.6, velocity: 80 },    // F5
            { pitch: 79, time: 3.5, duration: 0.5, velocity: 85 },    // G5

            // 対位法的絡み合い (4-6秒)
            { pitch: 81, time: 4.0, duration: 0.3, velocity: 85 },    // A5
            { pitch: 79, time: 4.3, duration: 0.3, velocity: 80 },    // G5
            { pitch: 77, time: 4.6, duration: 0.4, velocity: 85 },    // F5
            { pitch: 76, time: 5.0, duration: 0.3, velocity: 80 },    // E5
            { pitch: 74, time: 5.3, duration: 0.3, velocity: 75 },    // D5
            { pitch: 72, time: 5.6, duration: 0.4, velocity: 80 }     // C5
          ]
        }
      ],

      // === Track 3: チェロ (ベースライン + ハーモニー) ===
      cello: [
        {
          id: 'classical_cello_bass',
          name: 'チェロ',
          instrumentType: 'cello',
          duration: 6.0,  // 6秒間
          notes: [
            // バロック風ベースライン

            // C Major基盤 (0-2秒)
            { pitch: 36, time: 0.0, duration: 1.0, velocity: 80 },    // C2
            { pitch: 40, time: 1.0, duration: 1.0, velocity: 75 },    // E2

            // F Major移行 (2-3秒)
            { pitch: 41, time: 2.0, duration: 0.5, velocity: 80 },    // F2
            { pitch: 45, time: 2.5, duration: 0.5, velocity: 75 },    // A2

            // G Major (3-4秒)
            { pitch: 43, time: 3.0, duration: 0.5, velocity: 85 },    // G2
            { pitch: 47, time: 3.5, duration: 0.5, velocity: 80 },    // B2

            // 対位法ベース (4-6秒)
            { pitch: 48, time: 4.0, duration: 0.4, velocity: 85 },    // C3
            { pitch: 50, time: 4.4, duration: 0.3, velocity: 80 },    // D3
            { pitch: 52, time: 4.7, duration: 0.3, velocity: 85 },    // E3
            { pitch: 53, time: 5.0, duration: 0.4, velocity: 80 },    // F3
            { pitch: 55, time: 5.4, duration: 0.3, velocity: 75 },    // G3
            { pitch: 48, time: 5.7, duration: 0.3, velocity: 80 }     // C3
          ]
        }
      ]
    },

    creationGuide: {
      nextSteps: {
        ja: [
          '再現部で主題の美しい変奏を',
          'ヴィオラパートで内声の充実を',
          'コーダで壮大なクライマックスを'
        ],
        en: [
          'Beautiful variations of theme in recapitulation',
          'Enrich inner voices with viola part',
          'Grand climax in coda section'
        ]
      },
      hints: {
        ja: [
          'テンポ110 BPMで流麗な美しさ',
          'C Majorスケールの純粋な響き',
          '対位法で各声部の独立性を'
        ],
        en: [
          'Flowing beauty with 110 BPM tempo',
          'Pure sound of C Major scale',
          'Independence of each voice with counterpoint'
        ]
      },
      suggestedAdditions: ['viola_part', 'second_violin', 'ornaments']
    }
  },

  // =============== フォーク Demo Songs (改良版) ===============
  {
    id: 'folk_campfire_song',
    genreId: 'folk',

    metadata: {
      title: {
        ja: 'キャンプファイヤーの歌',
        en: 'Campfire Song'
      },
      description: {
        ja: 'プロ品質の温かいフォークソング。アコースティックな響きと心に染みるメロディが人々を結びつけます。',
        en: 'Professional quality warm folk song with acoustic sound and heart-touching melodies that bring people together.'
      },
      difficulty: 'beginner',
      estimatedCompletionTime: 15
    },

    structure: {
      tempo: 105,  // 95→105 BPM (親しみやすさ維持)
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'G', quality: 'major' },
      totalBars: 24,
      completedBars: 12,  // 6秒間
      sections: [
        { name: 'gentle_intro', startBar: 1, endBar: 4, completed: true },
        { name: 'verse_storytelling', startBar: 5, endBar: 8, completed: true },
        { name: 'pre_chorus_warm', startBar: 9, endBar: 12, completed: true },
        { name: 'chorus_sing', startBar: 13, endBar: 20, completed: false, suggestedChords: ['G', 'C', 'D', 'G'] },
        { name: 'outro_together', startBar: 21, endBar: 24, completed: false }
      ]
    },

    tracks: {
      // === Track 1: アコースティックギター (フィンガーピッキング + コード) ===
      midi: [
        {
          id: 'folk_acoustic_guitar',
          name: 'アコースティックギター',
          instrumentType: 'acoustic_guitar',
          duration: 6.0,  // 6秒間
          notes: [
            // Gentle Intro - フィンガーピッキング (0-2秒)
            { pitch: 67, time: 0.0, duration: 0.4, velocity: 70 },    // G4
            { pitch: 71, time: 0.4, duration: 0.3, velocity: 65 },    // B4
            { pitch: 74, time: 0.7, duration: 0.4, velocity: 70 },    // D5
            { pitch: 67, time: 1.1, duration: 0.4, velocity: 65 },    // G4
            { pitch: 71, time: 1.5, duration: 0.5, velocity: 70 },    // B4

            // G Majorコード (0-2秒)
            { pitch: 55, time: 0.0, duration: 2.0, velocity: 60 },    // G3
            { pitch: 59, time: 0.0, duration: 2.0, velocity: 55 },    // B3
            { pitch: 62, time: 0.0, duration: 2.0, velocity: 55 },    // D4

            // Verse - ストーリーテリング (2-4秒)
            { pitch: 79, time: 2.0, duration: 0.3, velocity: 75 },    // G5
            { pitch: 76, time: 2.3, duration: 0.3, velocity: 70 },    // E5
            { pitch: 74, time: 2.6, duration: 0.4, velocity: 75 },    // D5
            { pitch: 71, time: 3.0, duration: 0.5, velocity: 70 },    // B4
            { pitch: 67, time: 3.5, duration: 0.5, velocity: 75 },    // G4

            // C Majorコード (2-3秒)
            { pitch: 60, time: 2.0, duration: 1.0, velocity: 65 },    // C4
            { pitch: 64, time: 2.0, duration: 1.0, velocity: 60 },    // E4
            { pitch: 67, time: 2.0, duration: 1.0, velocity: 60 },    // G4

            // Pre-Chorus - 温かいビルドアップ (4-6秒)
            { pitch: 74, time: 4.0, duration: 0.4, velocity: 80 },    // D5
            { pitch: 76, time: 4.4, duration: 0.3, velocity: 85 },    // E5
            { pitch: 79, time: 4.7, duration: 0.4, velocity: 80 },    // G5
            { pitch: 81, time: 5.1, duration: 0.4, velocity: 85 },    // A5
            { pitch: 79, time: 5.5, duration: 0.5, velocity: 80 },    // G5

            // D-C-G コード進行 (3-6秒)
            { pitch: 62, time: 3.0, duration: 1.0, velocity: 65 },    // D4
            { pitch: 66, time: 3.0, duration: 1.0, velocity: 60 },    // F#4
            { pitch: 69, time: 3.0, duration: 1.0, velocity: 60 },    // A4

            { pitch: 60, time: 4.0, duration: 1.0, velocity: 70 },    // C4
            { pitch: 64, time: 4.0, duration: 1.0, velocity: 65 },    // E4

            { pitch: 55, time: 5.0, duration: 1.0, velocity: 75 },    // G3
            { pitch: 59, time: 5.0, duration: 1.0, velocity: 70 }     // B3
          ]
        }
      ],

      // === Track 2: アコースティックベース (ウォーキング + ルート) ===
      bass: [
        {
          id: 'folk_acoustic_bass',
          name: 'アコースティックベース',
          instrumentType: 'acoustic_bass',
          duration: 6.0,  // 6秒間
          notes: [
            // G-C-D-G 進行のフォークベースライン

            // G Major foundation (0-1.5秒)
            { pitch: 43, time: 0.0, duration: 0.7, velocity: 80 },    // G2
            { pitch: 47, time: 0.8, duration: 0.7, velocity: 75 },    // B2

            // C Major (1.5-3秒)
            { pitch: 48, time: 1.5, duration: 0.7, velocity: 85 },    // C3
            { pitch: 52, time: 2.2, duration: 0.8, velocity: 80 },    // E3

            // D Major (3-4.5秒)
            { pitch: 50, time: 3.0, duration: 0.7, velocity: 85 },    // D3
            { pitch: 54, time: 3.7, duration: 0.8, velocity: 80 },    // F#3

            // G Major return (4.5-6秒)
            { pitch: 43, time: 4.5, duration: 0.5, velocity: 90 },    // G2
            { pitch: 47, time: 5.0, duration: 0.5, velocity: 85 },    // B2
            { pitch: 43, time: 5.5, duration: 0.5, velocity: 90 }     // G2
          ]
        }
      ],

      // === Track 3: パーカッション (軽いドラム + シェイカー) ===
      drum: [
        {
          id: 'folk_percussion_light',
          name: 'フォークパーカッション',
          duration: 16.0,  // ドラムは16秒フル
          pattern: {
            // 軽やかなフォークビート
            kick: [0, 4, 8, 12],  // 控えめなキック
            snare_brush: [2, 6, 10, 14],  // ブラシスネア
            shaker: [
              // 軽いシェイカー (全体)
              0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5,
              4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5,
              8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5,
              12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5
            ],
            tambourine: [1, 3, 5, 7, 9, 11, 13, 15],  // タンバリン
            woodblock: [0.5, 2.5, 4.5, 6.5, 8.5, 10.5, 12.5, 14.5],  // ウッドブロック

            // カウベル (アクセント)
            cowbell: [3.5, 7.5, 11.5, 15.5],

            // フィンガースナップ
            finger_snap: [1.5, 3.5, 5.5, 7.5, 9.5, 11.5, 13.5, 15.5]
          }
        }
      ]
    },

    creationGuide: {
      nextSteps: {
        ja: [
          'コーラスで皆が歌えるキャッチーなメロディを',
          'ハーモニカで温かい味付けを',
          'アウトロで団結感あるハーモニーを'
        ],
        en: [
          'Catchy melody everyone can sing in chorus',
          'Warm flavor with harmonica',
          'Unifying harmony in outro'
        ]
      },
      hints: {
        ja: [
          'テンポ105 BPMで親しみやすく',
          'G-C-D-Gのシンプルで温かい進行',
          'アコースティック楽器で自然な響き'
        ],
        en: [
          'Friendly feel with 105 BPM tempo',
          'Simple and warm G-C-D-G progression',
          'Natural sound with acoustic instruments'
        ]
      },
      suggestedAdditions: ['harmonica', 'mandolin', 'group_vocals']
    }
  },

  // =============== 残り6曲追加 (各ジャンル2曲目) ===============

  // ポップス2曲目
  {
    id: 'pop_first_love',
    genreId: 'pop',
    metadata: {
      title: { ja: '初恋のメロディ', en: 'First Love Melody' },
      description: { ja: 'プロ品質の切ないバラード調ポップス。カノン進行とエモーショナルなメロディが心を揺さぶります。', en: 'Professional quality emotional ballad pop with canon progression and moving melodies.' },
      difficulty: 'intermediate',
      estimatedCompletionTime: 20
    },
    structure: {
      tempo: 85, timeSignature: { numerator: 4, denominator: 4 }, key: { root: 'F', quality: 'major' },
      totalBars: 28, completedBars: 12, sections: [
        { name: 'intro_emotional', startBar: 1, endBar: 4, completed: true },
        { name: 'verse_heartfelt', startBar: 5, endBar: 12, completed: true }
      ]
    },
    tracks: {
      midi: [{ id: 'ballad_piano', name: 'バラードピアノ', instrumentType: 'soft_piano', duration: 6.0, notes: [
        { pitch: 65, time: 0.0, duration: 1.5, velocity: 75 }, { pitch: 69, time: 1.5, duration: 1.5, velocity: 80 },
        { pitch: 72, time: 3.0, duration: 1.0, velocity: 85 }, { pitch: 77, time: 4.0, duration: 2.0, velocity: 90 }
      ]}],
      bass: [{ id: 'ballad_bass', name: 'バラードベース', instrumentType: 'fretless_bass', duration: 6.0, notes: [
        { pitch: 41, time: 0.0, duration: 1.5, velocity: 70 }, { pitch: 38, time: 1.5, duration: 1.5, velocity: 75 },
        { pitch: 36, time: 3.0, duration: 1.5, velocity: 80 }, { pitch: 43, time: 4.5, duration: 1.5, velocity: 75 }
      ]}],
      drum: [{ id: 'ballad_drums', name: 'バラードドラム', duration: 16.0, pattern: {
        kick: [0, 4, 8, 12], snare: [2, 6, 10, 14], hihat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], brush: [1.5, 3.5, 5.5, 7.5]
      }}]
    }
  },

  // ロック2曲目
  {
    id: 'rock_electric_storm',
    genreId: 'rock',
    metadata: {
      title: { ja: 'エレクトリック・ストーム', en: 'Electric Storm' },
      description: { ja: 'プロ品質のハードロック。激烈なギターリフと重厚なリズムセクションが嵐のような迫力を演出します。', en: 'Professional quality hard rock with fierce guitar riffs and heavy rhythm section creating storm-like power.' },
      difficulty: 'advanced',
      estimatedCompletionTime: 25
    },
    structure: {
      tempo: 165, timeSignature: { numerator: 4, denominator: 4 }, key: { root: 'D', quality: 'minor' },
      totalBars: 32, completedBars: 12, sections: [
        { name: 'storm_intro', startBar: 1, endBar: 4, completed: true },
        { name: 'heavy_verse', startBar: 5, endBar: 12, completed: true }
      ]
    },
    tracks: {
      midi: [{ id: 'storm_guitar', name: 'ストームギター', instrumentType: 'heavy_guitar', duration: 6.0, notes: [
        { pitch: 50, time: 0.0, duration: 0.25, velocity: 127 }, { pitch: 53, time: 0.25, duration: 0.25, velocity: 120 },
        { pitch: 57, time: 0.5, duration: 0.5, velocity: 127 }, { pitch: 62, time: 1.0, duration: 1.0, velocity: 125 }
      ]}],
      bass: [{ id: 'storm_bass', name: 'ストームベース', instrumentType: 'heavy_bass', duration: 6.0, notes: [
        { pitch: 26, time: 0.0, duration: 0.5, velocity: 120 }, { pitch: 29, time: 0.5, duration: 0.5, velocity: 115 },
        { pitch: 33, time: 1.0, duration: 1.0, velocity: 125 }, { pitch: 38, time: 2.0, duration: 2.0, velocity: 127 }
      ]}],
      drum: [{ id: 'storm_drums', name: 'ストームドラム', duration: 16.0, pattern: {
        kick: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], snare: [1, 3, 5, 7, 9, 11, 13, 15], crash: [0, 2, 4, 6, 8, 10, 12, 14], double_kick: [0.25, 0.75, 1.25, 1.75]
      }}]
    }
  },

  // ジャズ2曲目
  {
    id: 'jazz_midnight_blue',
    genreId: 'jazz',
    metadata: {
      title: { ja: 'ミッドナイト・ブルー', en: 'Midnight Blue' },
      description: { ja: 'プロ品質のスムースジャズ。洗練されたハーモニーと大人の雰囲気が深夜の魅力を表現します。', en: 'Professional quality smooth jazz with sophisticated harmony expressing midnight allure.' },
      difficulty: 'advanced',
      estimatedCompletionTime: 30
    },
    structure: {
      tempo: 75, timeSignature: { numerator: 4, denominator: 4 }, key: { root: 'F', quality: 'major' },
      totalBars: 32, completedBars: 12, sections: [
        { name: 'smooth_intro', startBar: 1, endBar: 6, completed: true },
        { name: 'head_melody', startBar: 7, endBar: 12, completed: true }
      ]
    },
    tracks: {
      midi: [{ id: 'smooth_piano', name: 'スムースピアノ', instrumentType: 'electric_piano', duration: 6.0, notes: [
        { pitch: 65, time: 0.0, duration: 2.0, velocity: 80 }, { pitch: 69, time: 2.0, duration: 2.0, velocity: 85 },
        { pitch: 72, time: 4.0, duration: 2.0, velocity: 90 }
      ]}],
      bass: [{ id: 'smooth_bass', name: 'スムースベース', instrumentType: 'upright_bass', duration: 6.0, notes: [
        { pitch: 41, time: 0.0, duration: 1.0, velocity: 85 }, { pitch: 45, time: 1.0, duration: 1.0, velocity: 80 },
        { pitch: 48, time: 2.0, duration: 1.0, velocity: 85 }, { pitch: 53, time: 3.0, duration: 1.0, velocity: 80 }
      ]}],
      drum: [{ id: 'smooth_drums', name: 'スムースドラム', duration: 16.0, pattern: {
        kick: [0, 6, 12], snare_brush: [2, 10, 14], ride: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], brush_sweep: [0.5, 2.5, 4.5, 6.5]
      }}]
    }
  },

  // EDM2曲目
  {
    id: 'edm_future_bass',
    genreId: 'edm',
    metadata: {
      title: { ja: 'フューチャー・ベース', en: 'Future Bass' },
      description: { ja: 'プロ品質のFuture Bass。シンセウェーブとトラップビートが未来的な世界を創造します。', en: 'Professional quality Future Bass creating futuristic world with synth waves and trap beats.' },
      difficulty: 'intermediate',
      estimatedCompletionTime: 22
    },
    structure: {
      tempo: 150, timeSignature: { numerator: 4, denominator: 4 }, key: { root: 'F#', quality: 'minor' },
      totalBars: 32, completedBars: 12, sections: [
        { name: 'ambient_intro', startBar: 1, endBar: 6, completed: true },
        { name: 'verse_chill', startBar: 7, endBar: 12, completed: true }
      ]
    },
    tracks: {
      midi: [{ id: 'future_synth', name: 'フューチャーシンセ', instrumentType: 'future_synth', duration: 6.0, notes: [
        { pitch: 66, time: 0.0, duration: 3.0, velocity: 70 }, { pitch: 73, time: 2.0, duration: 2.0, velocity: 85 },
        { pitch: 78, time: 4.0, duration: 2.0, velocity: 95 }
      ]}],
      bass: [{ id: 'future_bass', name: 'フューチャーベース', instrumentType: 'future_bass', duration: 6.0, notes: [
        { pitch: 30, time: 0.0, duration: 1.5, velocity: 110 }, { pitch: 37, time: 1.5, duration: 1.5, velocity: 105 },
        { pitch: 42, time: 3.0, duration: 1.5, velocity: 115 }, { pitch: 30, time: 4.5, duration: 1.5, velocity: 120 }
      ]}],
      drum: [{ id: 'trap_drums', name: 'トラップドラム', duration: 16.0, pattern: {
        kick: [0, 4, 8, 12], snare: [2, 6, 10, 14], hihat: [0.5, 1, 1.5, 2.5, 3, 3.5, 4.5, 5, 5.5], trap_hi: [0.25, 0.75, 1.25, 1.75], sub_bass: [0, 2, 4, 6]
      }}]
    }
  },

  // クラシック2曲目
  {
    id: 'classical_string_quartet',
    genreId: 'classical',
    metadata: {
      title: { ja: '弦楽四重奏曲第1番', en: 'String Quartet No.1' },
      description: { ja: 'プロ品質の古典弦楽四重奏。美しい対位法と古典的形式が響きの豊かさを表現します。', en: 'Professional quality classical string quartet expressing richness of sound with beautiful counterpoint.' },
      difficulty: 'advanced',
      estimatedCompletionTime: 35
    },
    structure: {
      tempo: 120, timeSignature: { numerator: 4, denominator: 4 }, key: { root: 'G', quality: 'major' },
      totalBars: 32, completedBars: 12, sections: [
        { name: 'exposition_theme', startBar: 1, endBar: 6, completed: true },
        { name: 'development', startBar: 7, endBar: 12, completed: true }
      ]
    },
    tracks: {
      violin: [{ id: 'violin1_lead', name: '第1ヴァイオリン', instrumentType: 'violin', duration: 6.0, notes: [
        { pitch: 79, time: 0.0, duration: 0.5, velocity: 85 }, { pitch: 81, time: 0.5, duration: 0.5, velocity: 80 },
        { pitch: 83, time: 1.0, duration: 1.0, velocity: 90 }, { pitch: 79, time: 2.0, duration: 1.0, velocity: 85 }
      ]}],
      viola: [{ id: 'viola_harmony', name: 'ヴィオラ', instrumentType: 'viola', duration: 6.0, notes: [
        { pitch: 67, time: 0.5, duration: 1.0, velocity: 75 }, { pitch: 71, time: 1.5, duration: 1.0, velocity: 80 },
        { pitch: 74, time: 2.5, duration: 1.5, velocity: 85 }, { pitch: 67, time: 4.0, duration: 2.0, velocity: 75 }
      ]}],
      cello: [{ id: 'cello_bass_classical', name: 'チェロ', instrumentType: 'cello', duration: 6.0, notes: [
        { pitch: 43, time: 0.0, duration: 1.0, velocity: 80 }, { pitch: 47, time: 1.0, duration: 1.0, velocity: 75 },
        { pitch: 50, time: 2.0, duration: 1.0, velocity: 85 }, { pitch: 43, time: 3.0, duration: 3.0, velocity: 80 }
      ]}]
    }
  },

  // フォーク2曲目
  {
    id: 'folk_mountain_ballad',
    genreId: 'folk',
    metadata: {
      title: { ja: '山の子守唄', en: 'Mountain Lullaby' },
      description: { ja: 'プロ品質のケルト風バラード。フィンガーピッキングと優しいメロディが山の静寂を表現します。', en: 'Professional quality Celtic-style ballad expressing mountain serenity with fingerpicking and gentle melodies.' },
      difficulty: 'intermediate',
      estimatedCompletionTime: 20
    },
    structure: {
      tempo: 80, timeSignature: { numerator: 3, denominator: 4 }, key: { root: 'D', quality: 'major' },
      totalBars: 24, completedBars: 9, sections: [
        { name: 'gentle_intro', startBar: 1, endBar: 3, completed: true },
        { name: 'verse_storytelling', startBar: 4, endBar: 9, completed: true }
      ]
    },
    tracks: {
      midi: [{ id: 'fingerpicking_guitar', name: 'フィンガーピッキング', instrumentType: 'acoustic_guitar_fingerpicking', duration: 6.0, notes: [
        { pitch: 62, time: 0.0, duration: 1.0, velocity: 70 }, { pitch: 66, time: 1.0, duration: 1.0, velocity: 65 },
        { pitch: 69, time: 2.0, duration: 1.0, velocity: 70 }, { pitch: 74, time: 3.0, duration: 1.5, velocity: 75 }
      ]}],
      bass: [{ id: 'folk_bass_gentle', name: 'フォークベース', instrumentType: 'acoustic_bass', duration: 6.0, notes: [
        { pitch: 38, time: 0.0, duration: 1.5, velocity: 75 }, { pitch: 45, time: 1.5, duration: 1.5, velocity: 70 },
        { pitch: 50, time: 3.0, duration: 1.5, velocity: 80 }, { pitch: 38, time: 4.5, duration: 1.5, velocity: 75 }
      ]}],
      drum: [{ id: 'soft_percussion_folk', name: 'ソフトパーカッション', duration: 16.0, pattern: {
        brush: [0, 3, 6, 9, 12, 15], shaker: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], woodblock: [1, 4, 7, 10, 13], finger_snap: [2, 5, 8, 11, 14]
      }}]
    }
  }
];

export default DEMO_SONGS;