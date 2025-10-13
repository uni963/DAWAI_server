/**
 * 重低音強化版Demo Song データベース - 8秒拡張 + 重厚ベース
 * 各ジャンル2曲、計12曲を重低音・長尺で再構築
 * - 3+トラック構成（重厚ベース + パワフルメロディ + 強力ドラム）
 * - 8秒間の重厚ダイナミック楽曲（ドラムは16秒フル）
 * - 重低音ベース強化・音楽理論・ジャンル特性を活かした重厚楽曲
 * - スケール制約・ジャンル自動設定対応
 */

export const DEMO_SONGS = [
  // =============== ポップス Demo Songs (重低音強化版) ===============
  {
    id: 'pop_sunny_day',
    genreId: 'pop',

    // ★ スケール制約自動設定
    scaleConstraints: {
      enabled: true,
      genre: 'pop',
      rootNote: 'C',
      scaleType: 'major',
      allowedNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      autoSetOnLoad: true
    },

    metadata: {
      title: {
        ja: '晴れた日の歌',
        en: 'Sunny Day Song'
      },
      description: {
        ja: '重低音強化されたキャッチーなポップス。8秒のダイナミックアレンジと重厚ベースが魅力的です。',
        en: 'Heavy bass enhanced catchy pop with 8-second dynamic arrangement and powerful bass.'
      },
      difficulty: 'beginner',
      estimatedCompletionTime: 15
    },

    structure: {
      tempo: 135,  // 躍動感のある135 BPM
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'C', quality: 'major' },
      totalBars: 32,
      completedBars: 16,  // 8秒間 = 約16小節 @ 135BPM
      sections: [
        { name: 'intro_dynamic', startBar: 1, endBar: 4, completed: true },
        { name: 'verse_catchy', startBar: 5, endBar: 8, completed: true },
        { name: 'pre_chorus_build', startBar: 9, endBar: 12, completed: true },
        { name: 'chorus_powerful', startBar: 13, endBar: 16, completed: true },
        { name: 'verse_b', startBar: 17, endBar: 24, completed: false },
        { name: 'outro', startBar: 25, endBar: 32, completed: false }
      ]
    },

    tracks: {
      // === Track 1: エレクトリックピアノ (8秒拡張メロディ) ===
      midi: [
        {
          id: 'pop_electric_piano_heavy',
          name: 'エレクトリックピアノ',
          instrumentType: 'electric_piano',
          duration: 8.0,  // ★ 8秒に拡張
          notes: [
            // Intro - ダイナミックエントリー (0-2秒)
            { pitch: 72, time: 0.0, duration: 0.3, velocity: 90 },   // C5
            { pitch: 76, time: 0.3, duration: 0.3, velocity: 95 },   // E5
            { pitch: 79, time: 0.6, duration: 0.6, velocity: 100 },  // G5
            { pitch: 84, time: 1.2, duration: 0.8, velocity: 105 },  // C6

            // コード追加 - C Major
            { pitch: 60, time: 0.0, duration: 2.0, velocity: 75 },   // C4
            { pitch: 64, time: 0.0, duration: 2.0, velocity: 70 },   // E4
            { pitch: 67, time: 0.0, duration: 2.0, velocity: 70 },   // G4

            // Verse - キャッチーメロディ (2-4秒)
            { pitch: 84, time: 2.0, duration: 0.4, velocity: 95 },   // C6
            { pitch: 83, time: 2.4, duration: 0.2, velocity: 90 },   // B5
            { pitch: 81, time: 2.6, duration: 0.4, velocity: 95 },   // A5
            { pitch: 79, time: 3.0, duration: 0.5, velocity: 90 },   // G5
            { pitch: 76, time: 3.5, duration: 0.5, velocity: 85 },   // E5

            // G Major コード
            { pitch: 67, time: 2.0, duration: 2.0, velocity: 75 },   // G4
            { pitch: 71, time: 2.0, duration: 2.0, velocity: 70 },   // B4
            { pitch: 74, time: 2.0, duration: 2.0, velocity: 70 },   // D5

            // Pre-Chorus ビルドアップ (4-6秒)
            { pitch: 81, time: 4.0, duration: 0.3, velocity: 100 },  // A5
            { pitch: 84, time: 4.3, duration: 0.3, velocity: 105 },  // C6
            { pitch: 88, time: 4.6, duration: 0.4, velocity: 110 },  // E6
            { pitch: 91, time: 5.0, duration: 0.5, velocity: 115 },  // G6
            { pitch: 84, time: 5.5, duration: 0.5, velocity: 105 },  // C6

            // Am-F コード進行
            { pitch: 69, time: 4.0, duration: 2.0, velocity: 80 },   // A4
            { pitch: 72, time: 4.0, duration: 2.0, velocity: 75 },   // C5
            { pitch: 76, time: 4.0, duration: 2.0, velocity: 75 },   // E5

            // ★ 新規追加: Chorus パワフル展開 (6-8秒)
            { pitch: 96, time: 6.0, duration: 0.4, velocity: 120 },  // C7
            { pitch: 93, time: 6.4, duration: 0.3, velocity: 115 },  // A6
            { pitch: 91, time: 6.7, duration: 0.4, velocity: 110 },  // G6
            { pitch: 88, time: 7.1, duration: 0.4, velocity: 105 },  // E6
            { pitch: 84, time: 7.5, duration: 0.5, velocity: 120 },  // C6

            // F-G コード (6-8秒)
            { pitch: 65, time: 6.0, duration: 1.0, velocity: 85 },   // F4
            { pitch: 69, time: 6.0, duration: 1.0, velocity: 80 },   // A4
            { pitch: 72, time: 6.0, duration: 1.0, velocity: 80 },   // C5
            { pitch: 67, time: 7.0, duration: 1.0, velocity: 90 },   // G4
            { pitch: 71, time: 7.0, duration: 1.0, velocity: 85 },   // B4
            { pitch: 74, time: 7.0, duration: 1.0, velocity: 85 }    // D5
          ]
        }
      ],

      // === Track 2: 重低音エレクトリックベース (8秒拡張 + 重厚化) ===
      bass: [
        {
          id: 'pop_heavy_bass',
          name: '重低音ベース',
          instrumentType: 'electric_bass_heavy',  // ★ 重厚楽器
          duration: 8.0,  // ★ 8秒に拡張
          notes: [
            // ★ 重低音化: C2→C1, より低いピッチで重厚感アップ

            // C Major section - 重低音 (0-2秒)
            { pitch: 24, time: 0.0, duration: 0.4, velocity: 110 },  // C1 (重低音)
            { pitch: 24, time: 0.5, duration: 0.3, velocity: 105 },  // C1
            { pitch: 31, time: 1.0, duration: 0.4, velocity: 115 },  // G1 (重低音)
            { pitch: 28, time: 1.5, duration: 0.5, velocity: 110 },  // E1

            // G Major section - 重低音 (2-3秒)
            { pitch: 31, time: 2.0, duration: 0.4, velocity: 115 },  // G1
            { pitch: 35, time: 2.5, duration: 0.5, velocity: 110 },  // B1

            // A minor section - 重低音 (3-4秒)
            { pitch: 33, time: 3.0, duration: 0.4, velocity: 115 },  // A1
            { pitch: 36, time: 3.5, duration: 0.5, velocity: 110 },  // C2

            // F Major section - 重低音 (4-5秒)
            { pitch: 29, time: 4.0, duration: 0.4, velocity: 115 },  // F1
            { pitch: 33, time: 4.5, duration: 0.5, velocity: 110 },  // A1

            // ★ 新規追加: 重低音パワーセクション (5-8秒)
            // Dynamic buildup (5-6秒)
            { pitch: 24, time: 5.0, duration: 0.3, velocity: 120 },  // C1
            { pitch: 31, time: 5.3, duration: 0.3, velocity: 115 },  // G1
            { pitch: 24, time: 5.6, duration: 0.4, velocity: 125 },  // C1

            // Powerful chorus bass (6-8秒)
            { pitch: 29, time: 6.0, duration: 0.5, velocity: 125 },  // F1
            { pitch: 33, time: 6.5, duration: 0.5, velocity: 120 },  // A1
            { pitch: 31, time: 7.0, duration: 0.5, velocity: 125 },  // G1
            { pitch: 24, time: 7.5, duration: 0.5, velocity: 127 }   // C1 (最大音量)
          ]
        }
      ],

      // === Track 3: ポップスドラム (16秒フル、強化ビート) ===
      drum: [
        {
          id: 'pop_drums_heavy',
          name: 'ポップスドラム',
          duration: 16.0,  // ドラムは16秒フル維持
          pattern: {
            // 強化された8ビート + パワフルフィル
            kick: [
              0, 2, 4, 6, 8, 10, 12, 14,  // 基本4つ打ち
              1.5, 3.5, 5.5, 7.5, 9.5, 11.5, 13.5, 15.5  // シンコペーション強化
            ],
            snare: [
              1, 3, 5, 7, 9, 11, 13, 15,  // 裏拍スネア
              1.25, 3.25, 5.25, 7.25,    // 追加アクセント
              1.75, 3.75, 5.75, 7.75     // パワーフィル
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

            // 強化フィルパターン
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
          '8秒拡張コーラス部分でさらに盛り上がるメロディを',
          '重低音ベースでしっかりとした土台を作る',
          'ストリングスセクションで厚みを出す'
        ],
        en: [
          'More uplifting 8-second extended chorus melody',
          'Solid foundation with heavy bass',
          'Add depth with strings section'
        ]
      }
    }
  },

  {
    id: 'pop_first_love',
    genreId: 'pop',
    scaleConstraints: {
      enabled: true,
      genre: 'pop',
      rootNote: 'F',
      scaleType: 'major',
      allowedNotes: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
      autoSetOnLoad: true
    },
    metadata: {
      title: { ja: '初恋のメロディ', en: 'First Love Melody' },
      description: { ja: '重低音強化された切ないバラード調ポップス。8秒のエモーショナルなメロディが心を揺さぶります。', en: 'Heavy bass enhanced emotional ballad pop with 8-second moving melodies.' },
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
      midi: [{ id: 'ballad_piano_extended', name: 'バラードピアノ', instrumentType: 'soft_piano', duration: 8.0, notes: [
        { pitch: 65, time: 0.0, duration: 1.5, velocity: 75 }, { pitch: 69, time: 1.5, duration: 1.5, velocity: 80 },
        { pitch: 72, time: 3.0, duration: 1.0, velocity: 85 }, { pitch: 77, time: 4.0, duration: 2.0, velocity: 90 },
        { pitch: 81, time: 6.0, duration: 1.0, velocity: 95 }, { pitch: 77, time: 7.0, duration: 1.0, velocity: 85 }
      ]}],
      bass: [{ id: 'ballad_heavy_bass', name: '重低音バラードベース', instrumentType: 'electric_bass_heavy', duration: 8.0, notes: [
        { pitch: 29, time: 0.0, duration: 1.5, velocity: 90 }, { pitch: 26, time: 1.5, duration: 1.5, velocity: 95 },
        { pitch: 24, time: 3.0, duration: 1.5, velocity: 100 }, { pitch: 31, time: 4.5, duration: 1.5, velocity: 95 },
        { pitch: 29, time: 6.0, duration: 1.0, velocity: 105 }, { pitch: 24, time: 7.0, duration: 1.0, velocity: 110 }
      ]}],
      drum: [{ id: 'ballad_drums_heavy', name: 'バラードドラム', duration: 16.0, pattern: {
        kick: [0, 4, 8, 12], snare: [2, 6, 10, 14], hihat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], brush: [1.5, 3.5, 5.5, 7.5]
      }}]
    }
  },

  // =============== ロック Demo Songs (重低音強化版) ===============
  {
    id: 'rock_thunder_strike',
    genreId: 'rock',
    scaleConstraints: {
      enabled: true,
      genre: 'rock',
      rootNote: 'E',
      scaleType: 'minor',
      allowedNotes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
      autoSetOnLoad: true
    },
    metadata: {
      title: {
        ja: '雷鳴のリフ',
        en: 'Thunder Strike Riff'
      },
      description: {
        ja: '重低音強化されたパワフルロック。8秒の攻撃的ギターリフと重厚リズムセクションが迫力満点です。',
        en: 'Heavy bass enhanced powerful rock with 8-second aggressive guitar riffs and heavy rhythm section.'
      },
      difficulty: 'intermediate',
      estimatedCompletionTime: 18
    },
    structure: {
      tempo: 155,  // パワー向上
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'E', quality: 'minor' },
      totalBars: 32,
      completedBars: 16,  // 8秒間
      sections: [
        { name: 'thunder_intro', startBar: 1, endBar: 4, completed: true },
        { name: 'power_riff', startBar: 5, endBar: 8, completed: true },
        { name: 'heavy_verse', startBar: 9, endBar: 12, completed: true },
        { name: 'intense_bridge', startBar: 13, endBar: 16, completed: true }
      ]
    },
    tracks: {
      midi: [{ id: 'rock_heavy_guitar', name: 'ヘヴィギター', instrumentType: 'electric_guitar_distortion', duration: 8.0, notes: [
        // Thunder Intro - パワフルオープニング (0-2秒)
        { pitch: 40, time: 0.0, duration: 0.25, velocity: 127 },  // E2 (低音)
        { pitch: 40, time: 0.25, duration: 0.25, velocity: 120 }, // E2
        { pitch: 43, time: 0.5, duration: 0.5, velocity: 127 },   // G2
        { pitch: 45, time: 1.0, duration: 0.5, velocity: 125 },   // A2
        { pitch: 40, time: 1.5, duration: 0.5, velocity: 127 },   // E2

        // ★ 8秒拡張: さらなる重厚リフ (6-8秒)
        { pitch: 76, time: 6.0, duration: 0.3, velocity: 127 },   // E5
        { pitch: 74, time: 6.3, duration: 0.2, velocity: 125 },   // D5
        { pitch: 72, time: 6.5, duration: 0.25, velocity: 120 },  // C5
        { pitch: 71, time: 6.75, duration: 0.25, velocity: 115 }, // B4
        { pitch: 69, time: 7.0, duration: 0.4, velocity: 127 },   // A4
        { pitch: 67, time: 7.4, duration: 0.3, velocity: 125 },   // G4
        { pitch: 64, time: 7.7, duration: 0.3, velocity: 127 }    // E4
      ]}],
      bass: [{ id: 'rock_ultra_heavy_bass', name: '超重低音ロックベース', instrumentType: 'electric_bass_rock_heavy', duration: 8.0, notes: [
        // ★ 超重低音化: E2→E1, より低いピッチ使用
        { pitch: 16, time: 0.0, duration: 0.4, velocity: 125 },   // E0 (超重低音)
        { pitch: 16, time: 0.5, duration: 0.3, velocity: 120 },   // E0
        { pitch: 19, time: 1.0, duration: 0.5, velocity: 127 },   // G0
        { pitch: 24, time: 2.0, duration: 0.4, velocity: 125 },   // C1
        { pitch: 28, time: 3.0, duration: 0.4, velocity: 127 },   // E1
        { pitch: 26, time: 4.0, duration: 0.5, velocity: 125 },   // D1
        // 8秒拡張
        { pitch: 16, time: 6.0, duration: 0.5, velocity: 127 },   // E0
        { pitch: 19, time: 7.0, duration: 0.5, velocity: 125 },   // G0
        { pitch: 16, time: 7.5, duration: 0.5, velocity: 127 }    // E0
      ]}],
      drum: [{ id: 'rock_monster_drums', name: 'モンスタードラム', duration: 16.0, pattern: {
        kick: [0, 0.5, 1.5, 2, 2.5, 3.5, 4, 4.5, 5.5, 6, 6.5, 7.5], snare: [1, 3, 5, 7, 9, 11, 13, 15],
        crash: [0, 4, 8, 12], china: [1.75, 3.75, 5.75, 7.75]
      }}]
    }
  },

  {
    id: 'rock_electric_storm',
    genreId: 'rock',
    scaleConstraints: {
      enabled: true,
      genre: 'rock',
      rootNote: 'D',
      scaleType: 'minor',
      allowedNotes: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
      autoSetOnLoad: true
    },
    metadata: {
      title: { ja: 'エレクトリック・ストーム', en: 'Electric Storm' },
      description: { ja: '重低音強化されたハードロック。8秒の激烈ギターリフと重厚リズムセクションが嵐の迫力を演出します。', en: 'Heavy bass enhanced hard rock with 8-second fierce guitar riffs creating storm-like power.' },
      difficulty: 'advanced',
      estimatedCompletionTime: 25
    },
    structure: {
      tempo: 165, timeSignature: { numerator: 4, denominator: 4 }, key: { root: 'D', quality: 'minor' },
      totalBars: 32, completedBars: 16
    },
    tracks: {
      midi: [{ id: 'storm_guitar_extended', name: 'ストームギター', instrumentType: 'heavy_guitar', duration: 8.0, notes: [
        { pitch: 38, time: 0.0, duration: 0.25, velocity: 127 }, { pitch: 41, time: 0.25, duration: 0.25, velocity: 120 },
        { pitch: 45, time: 0.5, duration: 0.5, velocity: 127 }, { pitch: 50, time: 1.0, duration: 1.0, velocity: 125 },
        { pitch: 62, time: 6.0, duration: 1.0, velocity: 127 }, { pitch: 57, time: 7.0, duration: 1.0, velocity: 125 }
      ]}],
      bass: [{ id: 'storm_ultra_bass', name: 'ストーム超重低音ベース', instrumentType: 'heavy_bass', duration: 8.0, notes: [
        { pitch: 14, time: 0.0, duration: 0.5, velocity: 127 }, { pitch: 17, time: 0.5, duration: 0.5, velocity: 122 },
        { pitch: 21, time: 1.0, duration: 1.0, velocity: 127 }, { pitch: 26, time: 2.0, duration: 2.0, velocity: 125 },
        { pitch: 14, time: 6.0, duration: 1.0, velocity: 127 }, { pitch: 21, time: 7.0, duration: 1.0, velocity: 125 }
      ]}],
      drum: [{ id: 'storm_thunder_drums', name: 'サンダードラム', duration: 16.0, pattern: {
        kick: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], snare: [1, 3, 5, 7, 9, 11, 13, 15], crash: [0, 2, 4, 6, 8, 10, 12, 14], double_kick: [0.25, 0.75, 1.25, 1.75]
      }}]
    }
  },

  // =============== ジャズ Demo Songs (重低音強化版) ===============
  {
    id: 'jazz_autumn_leaves',
    genreId: 'jazz',
    scaleConstraints: {
      enabled: true,
      genre: 'jazz',
      rootNote: 'Bb',
      scaleType: 'major',
      allowedNotes: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
      autoSetOnLoad: true
    },
    metadata: {
      title: {
        ja: '秋の葉のワルツ',
        en: 'Autumn Leaves Waltz'
      },
      description: {
        ja: '重低音強化されたエレガントなジャズワルツ。8秒の洗練ハーモニーとスウィング感が魅力的です。',
        en: 'Heavy bass enhanced elegant jazz waltz with 8-second sophisticated harmony and swing feel.'
      },
      difficulty: 'advanced',
      estimatedCompletionTime: 25
    },
    structure: {
      tempo: 140,  // スウィング感向上
      timeSignature: { numerator: 3, denominator: 4 },
      key: { root: 'Bb', quality: 'major' },
      totalBars: 32,
      completedBars: 12,   // 8秒間 = 12小節 @ 140BPM in 3/4
      sections: [
        { name: 'head_a_elegant', startBar: 1, endBar: 4, completed: true },
        { name: 'head_b_sophisticated', startBar: 5, endBar: 9, completed: true },
        { name: 'extended_improv', startBar: 10, endBar: 12, completed: true }
      ]
    },
    tracks: {
      midi: [{ id: 'jazz_piano_extended', name: 'ジャズピアノ', instrumentType: 'jazz_piano', duration: 8.0, notes: [
        { pitch: 70, time: 0.0, duration: 0.8, velocity: 85 },    // Bb4
        { pitch: 72, time: 0.8, duration: 0.6, velocity: 80 },    // C5
        { pitch: 74, time: 1.4, duration: 0.6, velocity: 85 },    // D5
        { pitch: 77, time: 2.0, duration: 0.5, velocity: 90 },    // F5
        // 8秒拡張
        { pitch: 81, time: 6.0, duration: 1.0, velocity: 95 },    // A5
        { pitch: 77, time: 7.0, duration: 1.0, velocity: 90 }     // F5
      ]}],
      bass: [{ id: 'jazz_heavy_walking_bass', name: '重低音ウォーキングベース', instrumentType: 'upright_bass_heavy', duration: 8.0, notes: [
        { pitch: 34, time: 0.0, duration: 0.6, velocity: 100 },    // Bb1 (重低音)
        { pitch: 38, time: 0.6, duration: 0.6, velocity: 95 },     // D2
        { pitch: 41, time: 1.2, duration: 0.8, velocity: 100 },    // F2
        { pitch: 36, time: 2.0, duration: 0.7, velocity: 105 },    // C2
        { pitch: 39, time: 2.7, duration: 0.8, velocity: 100 },    // Eb2
        { pitch: 41, time: 3.5, duration: 0.7, velocity: 105 },    // F2
        { pitch: 45, time: 4.2, duration: 0.8, velocity: 100 },    // A2
        // 8秒拡張
        { pitch: 34, time: 6.0, duration: 1.0, velocity: 110 },    // Bb1
        { pitch: 38, time: 7.0, duration: 1.0, velocity: 105 }     // D2
      ]}],
      drum: [{ id: 'jazz_brush_extended', name: 'ジャズブラシ', duration: 16.0, pattern: {
        kick: [0, 3, 6, 9, 12, 15], snare_brush: [1, 2, 4, 5, 7, 8, 10, 11, 13, 14],
        ride: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], brush_sweep: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]
      }}]
    }
  },

  {
    id: 'jazz_midnight_blue',
    genreId: 'jazz',
    scaleConstraints: {
      enabled: true,
      genre: 'jazz',
      rootNote: 'F',
      scaleType: 'major',
      allowedNotes: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
      autoSetOnLoad: true
    },
    metadata: {
      title: { ja: 'ミッドナイト・ブルー', en: 'Midnight Blue' },
      description: { ja: '重低音強化されたスムースジャズ。8秒の洗練ハーモニーが深夜の魅力を表現します。', en: 'Heavy bass enhanced smooth jazz with 8-second sophisticated harmony expressing midnight allure.' },
      difficulty: 'advanced',
      estimatedCompletionTime: 30
    },
    structure: {
      tempo: 75, timeSignature: { numerator: 4, denominator: 4 }, key: { root: 'F', quality: 'major' },
      totalBars: 32, completedBars: 12
    },
    tracks: {
      midi: [{ id: 'smooth_piano_extended', name: 'スムースピアノ', instrumentType: 'electric_piano', duration: 8.0, notes: [
        { pitch: 65, time: 0.0, duration: 2.0, velocity: 80 }, { pitch: 69, time: 2.0, duration: 2.0, velocity: 85 },
        { pitch: 72, time: 4.0, duration: 2.0, velocity: 90 }, { pitch: 77, time: 6.0, duration: 2.0, velocity: 95 }
      ]}],
      bass: [{ id: 'smooth_heavy_bass', name: 'スムース重低音ベース', instrumentType: 'upright_bass_heavy', duration: 8.0, notes: [
        { pitch: 29, time: 0.0, duration: 1.0, velocity: 100 }, { pitch: 33, time: 1.0, duration: 1.0, velocity: 95 },
        { pitch: 36, time: 2.0, duration: 1.0, velocity: 100 }, { pitch: 41, time: 3.0, duration: 1.0, velocity: 95 },
        { pitch: 29, time: 6.0, duration: 1.0, velocity: 105 }, { pitch: 36, time: 7.0, duration: 1.0, velocity: 100 }
      ]}],
      drum: [{ id: 'smooth_drums_extended', name: 'スムースドラム', duration: 16.0, pattern: {
        kick: [0, 6, 12], snare_brush: [2, 10, 14], ride: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], brush_sweep: [0.5, 2.5, 4.5, 6.5]
      }}]
    }
  },

  // =============== EDM Demo Songs (重低音強化版) ===============
  {
    id: 'edm_neon_dreams',
    genreId: 'edm',
    scaleConstraints: {
      enabled: true,
      genre: 'edm',
      rootNote: 'A',
      scaleType: 'minor',
      allowedNotes: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'],
      autoSetOnLoad: true
    },
    metadata: {
      title: {
        ja: 'ネオンドリーム',
        en: 'Neon Dreams'
      },
      description: {
        ja: '重低音強化されたモダンEDM。8秒のパワフルシンセサウンドと躍動ビートが未来的世界を演出します。',
        en: 'Heavy bass enhanced modern EDM with 8-second powerful synth sounds and dynamic beats creating futuristic world.'
      },
      difficulty: 'intermediate',
      estimatedCompletionTime: 20
    },
    structure: {
      tempo: 145,  // エネルギー向上
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'A', quality: 'minor' },
      totalBars: 32,
      completedBars: 16,  // 8秒間
      sections: [
        { name: 'synth_intro', startBar: 1, endBar: 4, completed: true },
        { name: 'buildup_energy', startBar: 5, endBar: 8, completed: true },
        { name: 'pre_drop', startBar: 9, endBar: 12, completed: true },
        { name: 'drop_power', startBar: 13, endBar: 16, completed: true }
      ]
    },
    tracks: {
      midi: [{ id: 'edm_synth_extended', name: 'EDMシンセリード', instrumentType: 'synth_lead_edm', duration: 8.0, notes: [
        { pitch: 69, time: 0.0, duration: 2.0, velocity: 70 },    // A4 (パッド)
        { pitch: 72, time: 0.0, duration: 2.0, velocity: 65 },    // C5
        { pitch: 76, time: 0.0, duration: 2.0, velocity: 60 },    // E5
        // 8秒拡張
        { pitch: 93, time: 6.0, duration: 1.0, velocity: 120 },   // A6
        { pitch: 88, time: 7.0, duration: 1.0, velocity: 115 }    // E6
      ]}],
      bass: [{ id: 'edm_monster_bass', name: 'EDMモンスターベース', instrumentType: 'synth_bass_edm_heavy', duration: 8.0, notes: [
        { pitch: 21, time: 0.0, duration: 0.7, velocity: 125 },   // A0 (超重低音)
        { pitch: 21, time: 0.8, duration: 0.7, velocity: 120 },   // A0
        { pitch: 29, time: 1.5, duration: 0.6, velocity: 127 },   // F1
        { pitch: 24, time: 2.1, duration: 0.4, velocity: 125 },   // C1
        { pitch: 29, time: 2.5, duration: 0.5, velocity: 127 },   // F1
        { pitch: 24, time: 3.0, duration: 0.6, velocity: 127 },   // C1
        { pitch: 28, time: 3.6, duration: 0.4, velocity: 125 },   // E1
        { pitch: 24, time: 4.0, duration: 0.5, velocity: 127 },   // C1
        { pitch: 31, time: 4.5, duration: 0.4, velocity: 127 },   // G1
        { pitch: 26, time: 4.9, duration: 0.3, velocity: 125 },   // D1
        { pitch: 31, time: 5.2, duration: 0.3, velocity: 127 },   // G1
        { pitch: 21, time: 5.5, duration: 0.5, velocity: 127 },   // A0 (return)
        // 8秒拡張
        { pitch: 21, time: 6.0, duration: 1.0, velocity: 127 },   // A0
        { pitch: 24, time: 7.0, duration: 1.0, velocity: 125 }    // C1
      ]}],
      drum: [{ id: 'edm_thunder_drums', name: 'EDMサンダードラム', duration: 16.0, pattern: {
        kick: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], snare: [1, 3, 5, 7, 9, 11, 13, 15],
        crash: [0, 4, 8, 12], white_noise: [3.5, 7.5, 11.5, 15.5], bass_drum: [0, 2, 4, 6, 8, 10, 12, 14]
      }}]
    }
  },

  {
    id: 'edm_future_bass',
    genreId: 'edm',
    scaleConstraints: {
      enabled: true,
      genre: 'edm',
      rootNote: 'F#',
      scaleType: 'minor',
      allowedNotes: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
      autoSetOnLoad: true
    },
    metadata: {
      title: { ja: 'フューチャー・ベース', en: 'Future Bass' },
      description: { ja: '重低音強化されたFuture Bass。8秒のシンセウェーブとトラップビートが未来的世界を創造します。', en: 'Heavy bass enhanced Future Bass creating futuristic world with 8-second synth waves and trap beats.' },
      difficulty: 'intermediate',
      estimatedCompletionTime: 22
    },
    structure: {
      tempo: 150, timeSignature: { numerator: 4, denominator: 4 }, key: { root: 'F#', quality: 'minor' },
      totalBars: 32, completedBars: 16
    },
    tracks: {
      midi: [{ id: 'future_synth_extended', name: 'フューチャーシンセ', instrumentType: 'future_synth', duration: 8.0, notes: [
        { pitch: 66, time: 0.0, duration: 3.0, velocity: 70 }, { pitch: 73, time: 2.0, duration: 2.0, velocity: 85 },
        { pitch: 78, time: 4.0, duration: 2.0, velocity: 95 }, { pitch: 85, time: 6.0, duration: 2.0, velocity: 100 }
      ]}],
      bass: [{ id: 'future_monster_bass', name: 'フューチャーモンスターベース', instrumentType: 'future_bass_heavy', duration: 8.0, notes: [
        { pitch: 18, time: 0.0, duration: 1.5, velocity: 127 }, { pitch: 25, time: 1.5, duration: 1.5, velocity: 122 },
        { pitch: 30, time: 3.0, duration: 1.5, velocity: 127 }, { pitch: 18, time: 4.5, duration: 1.5, velocity: 125 },
        { pitch: 25, time: 6.0, duration: 1.0, velocity: 127 }, { pitch: 18, time: 7.0, duration: 1.0, velocity: 127 }
      ]}],
      drum: [{ id: 'trap_monster_drums', name: 'トラップモンスタードラム', duration: 16.0, pattern: {
        kick: [0, 4, 8, 12], snare: [2, 6, 10, 14], hihat: [0.5, 1, 1.5, 2.5, 3, 3.5, 4.5, 5, 5.5], trap_hi: [0.25, 0.75, 1.25, 1.75], sub_bass: [0, 2, 4, 6]
      }}]
    }
  },

  // =============== クラシック Demo Songs (重低音強化版) ===============
  {
    id: 'classical_morning_prelude',
    genreId: 'classical',
    scaleConstraints: {
      enabled: true,
      genre: 'classical',
      rootNote: 'C',
      scaleType: 'major',
      allowedNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      autoSetOnLoad: true
    },
    metadata: {
      title: {
        ja: '朝のプレリュード',
        en: 'Morning Prelude'
      },
      description: {
        ja: '重低音強化された美しいバロック風プレリュード。8秒の対位法と優雅なメロディが朝の輝きを表現します。',
        en: 'Heavy bass enhanced beautiful Baroque-style prelude with 8-second counterpoint and elegant melodies expressing morning brilliance.'
      },
      difficulty: 'advanced',
      estimatedCompletionTime: 30
    },
    structure: {
      tempo: 110,  // 流動性向上
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'C', quality: 'major' },
      totalBars: 32,
      completedBars: 16,  // 8秒間
      sections: [
        { name: 'exposition_elegant', startBar: 1, endBar: 6, completed: true },
        { name: 'development_complex', startBar: 7, endBar: 12, completed: true },
        { name: 'extension_rich', startBar: 13, endBar: 16, completed: true }
      ]
    },
    tracks: {
      midi: [{ id: 'classical_piano_extended', name: 'クラシカルピアノ', instrumentType: 'grand_piano', duration: 8.0, notes: [
        { pitch: 72, time: 0.0, duration: 0.4, velocity: 80 },    // C5
        { pitch: 74, time: 0.4, duration: 0.3, velocity: 75 },    // D5
        { pitch: 76, time: 0.7, duration: 0.4, velocity: 85 },    // E5
        { pitch: 77, time: 1.1, duration: 0.4, velocity: 80 },    // F5
        { pitch: 79, time: 1.5, duration: 0.5, velocity: 90 },    // G5
        // 8秒拡張
        { pitch: 84, time: 6.0, duration: 1.0, velocity: 95 },    // C6
        { pitch: 79, time: 7.0, duration: 1.0, velocity: 90 }     // G5
      ]}],
      violin: [{ id: 'classical_violin_extended', name: 'ヴァイオリン', instrumentType: 'violin', duration: 8.0, notes: [
        { pitch: 67, time: 0.5, duration: 0.4, velocity: 75 },    // G4
        { pitch: 69, time: 0.9, duration: 0.3, velocity: 70 },    // A4
        { pitch: 71, time: 1.2, duration: 0.4, velocity: 80 },    // B4
        { pitch: 72, time: 1.6, duration: 0.4, velocity: 75 },    // C5
        // 8秒拡張
        { pitch: 81, time: 6.0, duration: 1.0, velocity: 85 },    // A5
        { pitch: 79, time: 7.0, duration: 1.0, velocity: 80 }     // G5
      ]}],
      cello: [{ id: 'classical_heavy_cello', name: '重低音チェロ', instrumentType: 'cello_heavy', duration: 8.0, notes: [
        { pitch: 24, time: 0.0, duration: 1.0, velocity: 100 },   // C1 (重低音)
        { pitch: 28, time: 1.0, duration: 1.0, velocity: 95 },    // E1
        { pitch: 29, time: 2.0, duration: 0.5, velocity: 100 },   // F1
        { pitch: 33, time: 2.5, duration: 0.5, velocity: 95 },    // A1
        { pitch: 31, time: 3.0, duration: 0.5, velocity: 105 },   // G1
        { pitch: 35, time: 3.5, duration: 0.5, velocity: 100 },   // B1
        { pitch: 36, time: 4.0, duration: 0.4, velocity: 105 },   // C2
        { pitch: 38, time: 4.4, duration: 0.3, velocity: 100 },   // D2
        { pitch: 40, time: 4.7, duration: 0.3, velocity: 105 },   // E2
        { pitch: 41, time: 5.0, duration: 0.4, velocity: 100 },   // F2
        { pitch: 43, time: 5.4, duration: 0.3, velocity: 95 },    // G2
        { pitch: 36, time: 5.7, duration: 0.3, velocity: 105 },   // C2
        // 8秒拡張
        { pitch: 24, time: 6.0, duration: 1.0, velocity: 110 },   // C1
        { pitch: 31, time: 7.0, duration: 1.0, velocity: 105 }    // G1
      ]}]
    }
  },

  {
    id: 'classical_string_quartet',
    genreId: 'classical',
    scaleConstraints: {
      enabled: true,
      genre: 'classical',
      rootNote: 'G',
      scaleType: 'major',
      allowedNotes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
      autoSetOnLoad: true
    },
    metadata: {
      title: { ja: '弦楽四重奏曲第1番', en: 'String Quartet No.1' },
      description: { ja: '重低音強化された古典弦楽四重奏。8秒の美しい対位法と古典的形式が響きの豊かさを表現します。', en: 'Heavy bass enhanced classical string quartet expressing richness of sound with 8-second beautiful counterpoint.' },
      difficulty: 'advanced',
      estimatedCompletionTime: 35
    },
    structure: {
      tempo: 120, timeSignature: { numerator: 4, denominator: 4 }, key: { root: 'G', quality: 'major' },
      totalBars: 32, completedBars: 16
    },
    tracks: {
      violin: [{ id: 'violin1_lead_extended', name: '第1ヴァイオリン', instrumentType: 'violin', duration: 8.0, notes: [
        { pitch: 79, time: 0.0, duration: 0.5, velocity: 85 }, { pitch: 81, time: 0.5, duration: 0.5, velocity: 80 },
        { pitch: 83, time: 1.0, duration: 1.0, velocity: 90 }, { pitch: 79, time: 2.0, duration: 1.0, velocity: 85 },
        { pitch: 91, time: 6.0, duration: 1.0, velocity: 95 }, { pitch: 86, time: 7.0, duration: 1.0, velocity: 90 }
      ]}],
      viola: [{ id: 'viola_harmony_extended', name: 'ヴィオラ', instrumentType: 'viola', duration: 8.0, notes: [
        { pitch: 67, time: 0.5, duration: 1.0, velocity: 75 }, { pitch: 71, time: 1.5, duration: 1.0, velocity: 80 },
        { pitch: 74, time: 2.5, duration: 1.5, velocity: 85 }, { pitch: 67, time: 4.0, duration: 2.0, velocity: 75 },
        { pitch: 74, time: 6.0, duration: 1.0, velocity: 85 }, { pitch: 71, time: 7.0, duration: 1.0, velocity: 80 }
      ]}],
      cello: [{ id: 'cello_bass_heavy', name: '重低音チェロ', instrumentType: 'cello_heavy', duration: 8.0, notes: [
        { pitch: 31, time: 0.0, duration: 1.0, velocity: 100 }, { pitch: 35, time: 1.0, duration: 1.0, velocity: 95 },
        { pitch: 38, time: 2.0, duration: 1.0, velocity: 105 }, { pitch: 31, time: 3.0, duration: 3.0, velocity: 100 },
        { pitch: 43, time: 6.0, duration: 1.0, velocity: 105 }, { pitch: 38, time: 7.0, duration: 1.0, velocity: 100 }
      ]}]
    }
  },

  // =============== フォーク Demo Songs (重低音強化版) ===============
  {
    id: 'folk_campfire_song',
    genreId: 'folk',
    scaleConstraints: {
      enabled: true,
      genre: 'folk',
      rootNote: 'G',
      scaleType: 'major',
      allowedNotes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
      autoSetOnLoad: true
    },
    metadata: {
      title: {
        ja: 'キャンプファイヤーの歌',
        en: 'Campfire Song'
      },
      description: {
        ja: '重低音強化された温かいフォークソング。8秒のアコースティック響きと心に染みるメロディが人々を結びつけます。',
        en: 'Heavy bass enhanced warm folk song with 8-second acoustic sound and heart-touching melodies that bring people together.'
      },
      difficulty: 'beginner',
      estimatedCompletionTime: 15
    },
    structure: {
      tempo: 105,  // 親しみやすさ維持
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'G', quality: 'major' },
      totalBars: 32,
      completedBars: 16,  // 8秒間
      sections: [
        { name: 'gentle_intro', startBar: 1, endBar: 4, completed: true },
        { name: 'verse_storytelling', startBar: 5, endBar: 8, completed: true },
        { name: 'pre_chorus_warm', startBar: 9, endBar: 12, completed: true },
        { name: 'chorus_together', startBar: 13, endBar: 16, completed: true }
      ]
    },
    tracks: {
      midi: [{ id: 'folk_guitar_extended', name: 'フォークギター', instrumentType: 'acoustic_guitar', duration: 8.0, notes: [
        { pitch: 67, time: 0.0, duration: 0.4, velocity: 70 },    // G4
        { pitch: 71, time: 0.4, duration: 0.3, velocity: 65 },    // B4
        { pitch: 74, time: 0.7, duration: 0.4, velocity: 70 },    // D5
        { pitch: 67, time: 1.1, duration: 0.4, velocity: 65 },    // G4
        { pitch: 71, time: 1.5, duration: 0.5, velocity: 70 },    // B4
        // 8秒拡張
        { pitch: 79, time: 6.0, duration: 1.0, velocity: 80 },    // G5
        { pitch: 74, time: 7.0, duration: 1.0, velocity: 75 }     // D5
      ]}],
      bass: [{ id: 'folk_heavy_bass', name: 'フォーク重低音ベース', instrumentType: 'acoustic_bass_heavy', duration: 8.0, notes: [
        { pitch: 31, time: 0.0, duration: 0.7, velocity: 100 },   // G1 (重低音)
        { pitch: 35, time: 0.8, duration: 0.7, velocity: 95 },    // B1
        { pitch: 36, time: 1.5, duration: 0.7, velocity: 105 },   // C2
        { pitch: 40, time: 2.2, duration: 0.8, velocity: 100 },   // E2
        { pitch: 38, time: 3.0, duration: 0.7, velocity: 105 },   // D2
        { pitch: 42, time: 3.7, duration: 0.8, velocity: 100 },   // F#2
        { pitch: 31, time: 4.5, duration: 0.5, velocity: 110 },   // G1
        { pitch: 35, time: 5.0, duration: 0.5, velocity: 105 },   // B1
        { pitch: 31, time: 5.5, duration: 0.5, velocity: 110 },   // G1
        // 8秒拡張
        { pitch: 36, time: 6.0, duration: 1.0, velocity: 110 },   // C2
        { pitch: 31, time: 7.0, duration: 1.0, velocity: 115 }    // G1
      ]}],
      drum: [{ id: 'folk_percussion_extended', name: 'フォークパーカッション', duration: 16.0, pattern: {
        kick: [0, 4, 8, 12], snare_brush: [2, 6, 10, 14],
        shaker: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5],
        tambourine: [1, 3, 5, 7, 9, 11, 13, 15], woodblock: [0.5, 2.5, 4.5, 6.5, 8.5, 10.5, 12.5, 14.5],
        cowbell: [3.5, 7.5, 11.5, 15.5], finger_snap: [1.5, 3.5, 5.5, 7.5, 9.5, 11.5, 13.5, 15.5]
      }}]
    }
  },

  {
    id: 'folk_mountain_ballad',
    genreId: 'folk',
    scaleConstraints: {
      enabled: true,
      genre: 'folk',
      rootNote: 'D',
      scaleType: 'major',
      allowedNotes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
      autoSetOnLoad: true
    },
    metadata: {
      title: { ja: '山の子守唄', en: 'Mountain Lullaby' },
      description: { ja: '重低音強化されたケルト風バラード。8秒のフィンガーピッキングと優しいメロディが山の静寂を表現します。', en: 'Heavy bass enhanced Celtic-style ballad expressing mountain serenity with 8-second fingerpicking and gentle melodies.' },
      difficulty: 'intermediate',
      estimatedCompletionTime: 20
    },
    structure: {
      tempo: 80, timeSignature: { numerator: 3, denominator: 4 }, key: { root: 'D', quality: 'major' },
      totalBars: 32, completedBars: 12
    },
    tracks: {
      midi: [{ id: 'fingerpicking_guitar_extended', name: 'フィンガーピッキング', instrumentType: 'acoustic_guitar_fingerpicking', duration: 8.0, notes: [
        { pitch: 62, time: 0.0, duration: 1.0, velocity: 70 }, { pitch: 66, time: 1.0, duration: 1.0, velocity: 65 },
        { pitch: 69, time: 2.0, duration: 1.0, velocity: 70 }, { pitch: 74, time: 3.0, duration: 1.5, velocity: 75 },
        { pitch: 78, time: 6.0, duration: 1.0, velocity: 80 }, { pitch: 74, time: 7.0, duration: 1.0, velocity: 75 }
      ]}],
      bass: [{ id: 'folk_gentle_heavy_bass', name: 'フォーク重低音ベース', instrumentType: 'acoustic_bass_heavy', duration: 8.0, notes: [
        { pitch: 26, time: 0.0, duration: 1.5, velocity: 95 }, { pitch: 33, time: 1.5, duration: 1.5, velocity: 90 },
        { pitch: 38, time: 3.0, duration: 1.5, velocity: 100 }, { pitch: 26, time: 4.5, duration: 1.5, velocity: 95 },
        { pitch: 33, time: 6.0, duration: 1.0, velocity: 100 }, { pitch: 26, time: 7.0, duration: 1.0, velocity: 105 }
      ]}],
      drum: [{ id: 'soft_percussion_folk_extended', name: 'ソフトパーカッション', duration: 16.0, pattern: {
        brush: [0, 3, 6, 9, 12, 15], shaker: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        woodblock: [1, 4, 7, 10, 13], finger_snap: [2, 5, 8, 11, 14]
      }}]
    }
  }
];

export default DEMO_SONGS;