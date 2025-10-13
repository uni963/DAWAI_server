/**
 * 音楽理論完全対応版Demo Song データベース - 初心者向け創作支援
 * 各ジャンル2曲、計12曲を音楽理論に基づいて完全再構築
 *
 * 【強化ポイント】
 * - ジャンル別の典型的なコード進行を完全実装
 * - 拍子感（強拍・弱拍）を明確に表現したリズムパターン
 * - コード内の音で構成された自然なメロディライン
 * - 前半8秒完全実装、後半8秒はユーザー創作領域
 * - 最低3トラック構成（ピアノ/シンセ、ベース、ドラム）
 * - 実在の名曲を参考にした実践的な楽曲構造
 * - スケール制約・ジャンル自動設定対応
 *
 * 【音楽理論設計】
 * - ポップス: I-V-vi-IV進行（カノン進行）- 参考: Let It Be
 * - ロック: i-VI-III-VII進行 - 参考: Nothing Else Matters
 * - ジャズ: ii-V-I進行（標準ジャズ進行）- 参考: Autumn Leaves
 * - EDM: i-VI-III-VII進行 + シンコペーション - 参考: Animals
 * - クラシック: I-IV-V-I進行（古典和声）- 参考: バッハ プレリュード
 * - フォーク: I-IV-I-V進行（シンプル進行）- 参考: Take Me Home, Country Roads
 */

export const DEMO_SONGS = [
  // =============== ポップス Demo Songs (音楽理論完全対応版) ===============
  {
    id: 'pop_sunny_day',
    genreId: 'pop',
    scaleConstraints: {
      enabled: true,
      genre: 'pop',
      rootNote: 'C',
      scaleType: 'major',
      allowedNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      autoSetOnLoad: true
    },
    metadata: {
      title: { ja: '晴れた日の歌', en: 'Sunny Day Song' },
      description: {
        ja: '【音楽理論完全対応】カノン進行(I-V-vi-IV)を使った王道ポップス。Let It Beスタイルの心に響くメロディと明確な拍子感。前半完全実装、後半はあなたの創作スペース！',
        en: 'Music theory enhanced pop with Canon progression (I-V-vi-IV). Let It Be style with clear beat emphasis. First half complete, second half for your creativity!'
      },
      difficulty: 'beginner',
      estimatedCompletionTime: 15,
      musicTheory: {
        chordProgression: 'I-V-vi-IV (カノン進行)',
        referenceTrack: 'Let It Be - The Beatles',
        beatsEmphasis: '強拍: 1拍目, 3拍目 / 弱拍: 2拍目, 4拍目'
      }
    },
    structure: {
      tempo: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'C', quality: 'major' },
      totalBars: 32,
      completedBars: 16,
      sections: [
        { name: 'intro_C', startBar: 1, endBar: 4, chords: ['C'], completed: true },
        { name: 'verse_G', startBar: 5, endBar: 8, chords: ['G'], completed: true },
        { name: 'chorus_Am', startBar: 9, endBar: 12, chords: ['Am'], completed: true },
        { name: 'bridge_F', startBar: 13, endBar: 16, chords: ['F'], completed: true },
        { name: 'verse_b', startBar: 17, endBar: 24, completed: false },
        { name: 'outro', startBar: 25, endBar: 32, completed: false }
      ]
    },
    tracks: {
      midi: [{
        id: 'pop_canon_piano',
        name: 'ポップスピアノ',
        instrumentType: 'electric_piano',
        duration: 8.0,
        notes: [
          // I (C major) 0-2秒
          { pitch: 60, time: 0.0, duration: 0.4, velocity: 100 }, { pitch: 64, time: 0.0, duration: 0.4, velocity: 85 },
          { pitch: 67, time: 0.0, duration: 0.4, velocity: 85 }, { pitch: 72, time: 0.0, duration: 0.4, velocity: 95 },
          { pitch: 76, time: 0.5, duration: 0.4, velocity: 90 }, { pitch: 79, time: 1.0, duration: 0.4, velocity: 100 },
          { pitch: 76, time: 1.5, duration: 0.4, velocity: 85 },
          // V (G major) 2-4秒
          { pitch: 55, time: 2.0, duration: 0.4, velocity: 100 }, { pitch: 59, time: 2.0, duration: 0.4, velocity: 85 },
          { pitch: 62, time: 2.0, duration: 0.4, velocity: 85 }, { pitch: 79, time: 2.0, duration: 0.4, velocity: 95 },
          { pitch: 83, time: 2.5, duration: 0.4, velocity: 90 }, { pitch: 79, time: 3.0, duration: 0.4, velocity: 100 },
          { pitch: 74, time: 3.5, duration: 0.4, velocity: 85 },
          // vi (A minor) 4-6秒
          { pitch: 57, time: 4.0, duration: 0.4, velocity: 100 }, { pitch: 60, time: 4.0, duration: 0.4, velocity: 85 },
          { pitch: 64, time: 4.0, duration: 0.4, velocity: 85 }, { pitch: 81, time: 4.0, duration: 0.4, velocity: 95 },
          { pitch: 84, time: 4.5, duration: 0.4, velocity: 90 }, { pitch: 88, time: 5.0, duration: 0.4, velocity: 100 },
          { pitch: 84, time: 5.5, duration: 0.4, velocity: 85 },
          // IV (F major) 6-8秒
          { pitch: 53, time: 6.0, duration: 0.4, velocity: 100 }, { pitch: 57, time: 6.0, duration: 0.4, velocity: 85 },
          { pitch: 60, time: 6.0, duration: 0.4, velocity: 85 }, { pitch: 77, time: 6.0, duration: 0.4, velocity: 95 },
          { pitch: 81, time: 6.5, duration: 0.4, velocity: 90 }, { pitch: 84, time: 7.0, duration: 0.4, velocity: 100 },
          { pitch: 81, time: 7.5, duration: 0.5, velocity: 85 }
        ]
      }],
      bass: [{
        id: 'pop_canon_bass',
        name: 'ポップスベース',
        instrumentType: 'electric_bass',
        duration: 8.0,
        notes: [
          { pitch: 36, time: 0.0, duration: 0.4, velocity: 110 }, { pitch: 36, time: 0.5, duration: 0.3, velocity: 90 },
          { pitch: 36, time: 1.0, duration: 0.4, velocity: 110 }, { pitch: 36, time: 1.5, duration: 0.3, velocity: 90 },
          { pitch: 43, time: 2.0, duration: 0.4, velocity: 110 }, { pitch: 43, time: 2.5, duration: 0.3, velocity: 90 },
          { pitch: 43, time: 3.0, duration: 0.4, velocity: 110 }, { pitch: 43, time: 3.5, duration: 0.3, velocity: 90 },
          { pitch: 45, time: 4.0, duration: 0.4, velocity: 110 }, { pitch: 45, time: 4.5, duration: 0.3, velocity: 90 },
          { pitch: 45, time: 5.0, duration: 0.4, velocity: 110 }, { pitch: 45, time: 5.5, duration: 0.3, velocity: 90 },
          { pitch: 41, time: 6.0, duration: 0.4, velocity: 110 }, { pitch: 41, time: 6.5, duration: 0.3, velocity: 90 },
          { pitch: 41, time: 7.0, duration: 0.4, velocity: 110 }, { pitch: 41, time: 7.5, duration: 0.5, velocity: 90 }
        ]
      }],
      drum: [{
        id: 'pop_8beat_drums',
        name: 'ポップスドラム',
        duration: 16.0,
        pattern: {
          kick: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          snare: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5],
          hihat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5],
          crash: [0, 2, 4, 6, 8, 10, 12, 14]
        }
      }]
    },
    creationGuide: {
      nextSteps: {
        ja: ['後半も同じコード進行(C-G-Am-F)を繰り返してみよう', 'メロディはコード内の音(C/E/G, G/B/D, A/C/E, F/A/C)を使おう', '強拍(1・3拍目)を意識してリズムを作ろう'],
        en: ['Continue with the same chord progression (C-G-Am-F)', 'Use notes from each chord', 'Emphasize strong beats']
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
      description: {
        ja: '【音楽理論完全対応】I-vi-IV-V進行の切ないバラード。Fメジャーの温かみのあるハーモニーで、感情を込めて歌い上げる王道バラード！',
        en: 'Music theory enhanced ballad with I-vi-IV-V progression in F major. Warm harmonies with emotional melodies!'
      },
      difficulty: 'beginner',
      estimatedCompletionTime: 18,
      musicTheory: {
        chordProgression: 'I-vi-IV-V (王道バラード進行)',
        referenceTrack: 'First Love - 宇多田ヒカル',
        beatsEmphasis: '強拍: 1拍目 / 弱拍: 2,3,4拍目 (バラード感)'
      }
    },
    structure: {
      tempo: 75,
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'F', quality: 'major' },
      totalBars: 24,
      completedBars: 12
    },
    tracks: {
      midi: [{
        id: 'ballad_piano',
        name: 'バラードピアノ',
        instrumentType: 'soft_piano',
        duration: 8.0,
        notes: [
          // I (F) 0-2秒
          { pitch: 53, time: 0.0, duration: 1.0, velocity: 80 }, { pitch: 57, time: 0.0, duration: 1.0, velocity: 70 },
          { pitch: 60, time: 0.0, duration: 1.0, velocity: 70 }, { pitch: 77, time: 0.0, duration: 1.0, velocity: 85 },
          { pitch: 81, time: 1.0, duration: 1.0, velocity: 80 },
          // vi (Dm) 2-4秒
          { pitch: 50, time: 2.0, duration: 1.0, velocity: 80 }, { pitch: 53, time: 2.0, duration: 1.0, velocity: 70 },
          { pitch: 57, time: 2.0, duration: 1.0, velocity: 70 }, { pitch: 74, time: 2.0, duration: 1.0, velocity: 85 },
          { pitch: 77, time: 3.0, duration: 1.0, velocity: 80 },
          // IV (Bb) 4-6秒
          { pitch: 46, time: 4.0, duration: 1.0, velocity: 85 }, { pitch: 50, time: 4.0, duration: 1.0, velocity: 75 },
          { pitch: 53, time: 4.0, duration: 1.0, velocity: 75 }, { pitch: 70, time: 4.0, duration: 1.0, velocity: 90 },
          { pitch: 74, time: 5.0, duration: 1.0, velocity: 85 },
          // V (C) 6-8秒
          { pitch: 48, time: 6.0, duration: 1.0, velocity: 85 }, { pitch: 52, time: 6.0, duration: 1.0, velocity: 75 },
          { pitch: 55, time: 6.0, duration: 1.0, velocity: 75 }, { pitch: 72, time: 6.0, duration: 1.0, velocity: 90 },
          { pitch: 76, time: 7.0, duration: 1.0, velocity: 85 }
        ]
      }],
      bass: [{
        id: 'ballad_bass',
        name: 'バラードベース',
        instrumentType: 'electric_bass',
        duration: 8.0,
        notes: [
          { pitch: 41, time: 0.0, duration: 2.0, velocity: 95 },
          { pitch: 38, time: 2.0, duration: 2.0, velocity: 95 },
          { pitch: 34, time: 4.0, duration: 2.0, velocity: 100 },
          { pitch: 36, time: 6.0, duration: 2.0, velocity: 100 }
        ]
      }],
      drum: [{
        id: 'ballad_drums',
        name: 'バラードドラム',
        duration: 16.0,
        pattern: {
          kick: [0, 4, 8, 12],
          snare: [2, 6, 10, 14],
          hihat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          brush: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]
        }
      }]
    },
    creationGuide: {
      nextSteps: {
        ja: ['同じF-Dm-Bb-C進行で続けよう', 'ゆっくりとしたテンポで感情を込めて', 'コード内音(F/A/C, D/F/A, Bb/D/F, C/E/G)で自然なメロディを'],
        en: ['Continue with F-Dm-Bb-C progression', 'Keep the slow emotional tempo', 'Use chord tones for natural melodies']
      }
    }
  },

  // =============== ロック Demo Songs ===============
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
      title: { ja: '雷鳴のリフ', en: 'Thunder Strike Riff' },
      description: {
        ja: '【音楽理論完全対応】i-VI-III-VII進行のパワフルロック。Nothing Else Mattersスタイルの重厚リフと激しいビート！',
        en: 'Power rock with i-VI-III-VII progression. Nothing Else Matters style with heavy riffs!'
      },
      difficulty: 'intermediate',
      estimatedCompletionTime: 20,
      musicTheory: {
        chordProgression: 'i-VI-III-VII (Em-C-G-D)',
        referenceTrack: 'Nothing Else Matters - Metallica',
        beatsEmphasis: '強拍: 全拍強調 / ダウンビート重視'
      }
    },
    structure: {
      tempo: 140,
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'E', quality: 'minor' },
      totalBars: 32,
      completedBars: 16
    },
    tracks: {
      midi: [{
        id: 'rock_guitar',
        name: 'ロックギター',
        instrumentType: 'electric_guitar_distortion',
        duration: 8.0,
        notes: [
          // i (Em) 0-2秒 - パワーコード
          { pitch: 40, time: 0.0, duration: 0.3, velocity: 120 }, { pitch: 47, time: 0.0, duration: 0.3, velocity: 115 },
          { pitch: 40, time: 0.5, duration: 0.3, velocity: 115 }, { pitch: 47, time: 0.5, duration: 0.3, velocity: 110 },
          { pitch: 40, time: 1.0, duration: 0.3, velocity: 120 }, { pitch: 47, time: 1.0, duration: 0.3, velocity: 115 },
          { pitch: 40, time: 1.5, duration: 0.3, velocity: 115 }, { pitch: 47, time: 1.5, duration: 0.3, velocity: 110 },
          // VI (C) 2-4秒
          { pitch: 36, time: 2.0, duration: 0.3, velocity: 120 }, { pitch: 43, time: 2.0, duration: 0.3, velocity: 115 },
          { pitch: 36, time: 2.5, duration: 0.3, velocity: 115 }, { pitch: 43, time: 2.5, duration: 0.3, velocity: 110 },
          { pitch: 36, time: 3.0, duration: 0.3, velocity: 120 }, { pitch: 43, time: 3.0, duration: 0.3, velocity: 115 },
          { pitch: 36, time: 3.5, duration: 0.3, velocity: 115 }, { pitch: 43, time: 3.5, duration: 0.3, velocity: 110 },
          // III (G) 4-6秒
          { pitch: 43, time: 4.0, duration: 0.3, velocity: 120 }, { pitch: 50, time: 4.0, duration: 0.3, velocity: 115 },
          { pitch: 43, time: 4.5, duration: 0.3, velocity: 115 }, { pitch: 50, time: 4.5, duration: 0.3, velocity: 110 },
          { pitch: 43, time: 5.0, duration: 0.3, velocity: 120 }, { pitch: 50, time: 5.0, duration: 0.3, velocity: 115 },
          { pitch: 43, time: 5.5, duration: 0.3, velocity: 115 }, { pitch: 50, time: 5.5, duration: 0.3, velocity: 110 },
          // VII (D) 6-8秒
          { pitch: 38, time: 6.0, duration: 0.3, velocity: 120 }, { pitch: 45, time: 6.0, duration: 0.3, velocity: 115 },
          { pitch: 38, time: 6.5, duration: 0.3, velocity: 115 }, { pitch: 45, time: 6.5, duration: 0.3, velocity: 110 },
          { pitch: 38, time: 7.0, duration: 0.3, velocity: 120 }, { pitch: 45, time: 7.0, duration: 0.3, velocity: 115 },
          { pitch: 38, time: 7.5, duration: 0.5, velocity: 115 }, { pitch: 45, time: 7.5, duration: 0.5, velocity: 110 }
        ]
      }],
      bass: [{
        id: 'rock_bass',
        name: 'ロックベース',
        instrumentType: 'electric_bass_rock',
        duration: 8.0,
        notes: [
          { pitch: 28, time: 0.0, duration: 0.4, velocity: 120 }, { pitch: 28, time: 0.5, duration: 0.4, velocity: 110 },
          { pitch: 28, time: 1.0, duration: 0.4, velocity: 120 }, { pitch: 28, time: 1.5, duration: 0.4, velocity: 110 },
          { pitch: 24, time: 2.0, duration: 0.4, velocity: 120 }, { pitch: 24, time: 2.5, duration: 0.4, velocity: 110 },
          { pitch: 24, time: 3.0, duration: 0.4, velocity: 120 }, { pitch: 24, time: 3.5, duration: 0.4, velocity: 110 },
          { pitch: 31, time: 4.0, duration: 0.4, velocity: 120 }, { pitch: 31, time: 4.5, duration: 0.4, velocity: 110 },
          { pitch: 31, time: 5.0, duration: 0.4, velocity: 120 }, { pitch: 31, time: 5.5, duration: 0.4, velocity: 110 },
          { pitch: 26, time: 6.0, duration: 0.4, velocity: 120 }, { pitch: 26, time: 6.5, duration: 0.4, velocity: 110 },
          { pitch: 26, time: 7.0, duration: 0.4, velocity: 120 }, { pitch: 26, time: 7.5, duration: 0.5, velocity: 110 }
        ]
      }],
      drum: [{
        id: 'rock_drums',
        name: 'ロックドラム',
        duration: 16.0,
        pattern: {
          kick: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5],
          snare: [1, 3, 5, 7, 9, 11, 13, 15],
          crash: [0, 2, 4, 6, 8, 10, 12, 14],
          hihat: [0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75, 4.25, 4.75, 5.25, 5.75, 6.25, 6.75, 7.25, 7.75]
        }
      }]
    },
    creationGuide: {
      nextSteps: {
        ja: ['Em-C-G-D進行を繰り返そう', 'パワーコード(ルート+5度)で厚みを', '8分音符の刻みでリズム感を出そう'],
        en: ['Repeat Em-C-G-D progression', 'Use power chords for thickness', 'Eighth notes for rhythm']
      }
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
      description: {
        ja: '【音楽理論完全対応】i-iv-VII-III進行のハードロック。激しいディストーションギターと強烈なビート！',
        en: 'Hard rock with i-iv-VII-III progression. Fierce distortion and powerful beats!'
      },
      difficulty: 'advanced',
      estimatedCompletionTime: 25,
      musicTheory: {
        chordProgression: 'i-iv-VII-III (Dm-Gm-C-F)',
        referenceTrack: 'Enter Sandman - Metallica',
        beatsEmphasis: '全拍強調 / ダブルキック'
      }
    },
    structure: {
      tempo: 150,
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'D', quality: 'minor' },
      totalBars: 32,
      completedBars: 16
    },
    tracks: {
      midi: [{
        id: 'storm_guitar',
        name: 'ストームギター',
        instrumentType: 'heavy_guitar',
        duration: 8.0,
        notes: [
          { pitch: 38, time: 0.0, duration: 0.25, velocity: 127 }, { pitch: 45, time: 0.0, duration: 0.25, velocity: 120 },
          { pitch: 38, time: 0.5, duration: 0.25, velocity: 125 }, { pitch: 45, time: 0.5, duration: 0.25, velocity: 118 },
          { pitch: 38, time: 1.0, duration: 0.5, velocity: 127 }, { pitch: 45, time: 1.0, duration: 0.5, velocity: 120 },
          { pitch: 43, time: 2.0, duration: 0.25, velocity: 127 }, { pitch: 50, time: 2.0, duration: 0.25, velocity: 120 },
          { pitch: 43, time: 2.5, duration: 0.25, velocity: 125 }, { pitch: 50, time: 2.5, duration: 0.25, velocity: 118 },
          { pitch: 43, time: 3.0, duration: 0.5, velocity: 127 }, { pitch: 50, time: 3.0, duration: 0.5, velocity: 120 },
          { pitch: 36, time: 4.0, duration: 0.5, velocity: 127 }, { pitch: 43, time: 4.0, duration: 0.5, velocity: 120 },
          { pitch: 36, time: 5.0, duration: 0.5, velocity: 125 }, { pitch: 43, time: 5.0, duration: 0.5, velocity: 118 },
          { pitch: 41, time: 6.0, duration: 0.5, velocity: 127 }, { pitch: 48, time: 6.0, duration: 0.5, velocity: 120 },
          { pitch: 41, time: 7.0, duration: 1.0, velocity: 127 }, { pitch: 48, time: 7.0, duration: 1.0, velocity: 120 }
        ]
      }],
      bass: [{
        id: 'storm_bass',
        name: 'ストームベース',
        instrumentType: 'heavy_bass',
        duration: 8.0,
        notes: [
          { pitch: 26, time: 0.0, duration: 0.5, velocity: 125 }, { pitch: 26, time: 0.5, duration: 0.5, velocity: 120 },
          { pitch: 26, time: 1.0, duration: 1.0, velocity: 127 },
          { pitch: 31, time: 2.0, duration: 0.5, velocity: 125 }, { pitch: 31, time: 2.5, duration: 0.5, velocity: 120 },
          { pitch: 31, time: 3.0, duration: 1.0, velocity: 127 },
          { pitch: 24, time: 4.0, duration: 2.0, velocity: 127 },
          { pitch: 29, time: 6.0, duration: 2.0, velocity: 127 }
        ]
      }],
      drum: [{
        id: 'storm_drums',
        name: 'ストームドラム',
        duration: 16.0,
        pattern: {
          kick: [0, 0.25, 0.5, 1, 1.25, 1.5, 2, 2.25, 2.5, 3, 3.25, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5],
          snare: [1, 3, 5, 7, 9, 11, 13, 15],
          crash: [0, 2, 4, 6, 8, 10, 12, 14],
          ride: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]
        }
      }]
    },
    creationGuide: {
      nextSteps: {
        ja: ['Dm-Gm-C-F進行を継続', '激しいパワーコードリフを', 'ダブルキックで迫力を増そう'],
        en: ['Continue Dm-Gm-C-F progression', 'Fierce power chord riffs', 'Double kick for intensity']
      }
    }
  },

  // =============== ジャズ Demo Songs ===============
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
      title: { ja: '秋の葉のワルツ', en: 'Autumn Leaves Waltz' },
      description: {
        ja: '【音楽理論完全対応】ii-V-I進行の本格ジャズワルツ。Autumn Leavesスタイルのスウィング感とウォーキングベース！',
        en: 'Authentic jazz waltz with ii-V-I progression. Autumn Leaves style with swing feel and walking bass!'
      },
      difficulty: 'advanced',
      estimatedCompletionTime: 25,
      musicTheory: {
        chordProgression: 'ii-V-I (Cm7-F7-BbMaj7)',
        referenceTrack: 'Autumn Leaves - Bill Evans',
        beatsEmphasis: '3/4拍子 / 1拍目強拍 / スウィング感'
      }
    },
    structure: {
      tempo: 160,
      timeSignature: { numerator: 3, denominator: 4 },
      key: { root: 'Bb', quality: 'major' },
      totalBars: 32,
      completedBars: 16
    },
    tracks: {
      midi: [{
        id: 'jazz_piano',
        name: 'ジャズピアノ',
        instrumentType: 'jazz_piano',
        duration: 8.0,
        notes: [
          // ii (Cm7) 0-2秒
          { pitch: 48, time: 0.0, duration: 0.6, velocity: 85 }, { pitch: 51, time: 0.0, duration: 0.6, velocity: 75 },
          { pitch: 55, time: 0.0, duration: 0.6, velocity: 75 }, { pitch: 58, time: 0.0, duration: 0.6, velocity: 70 },
          { pitch: 72, time: 0.0, duration: 0.6, velocity: 90 }, { pitch: 75, time: 0.7, duration: 0.6, velocity: 85 },
          { pitch: 72, time: 1.4, duration: 0.6, velocity: 80 },
          // V (F7) 2-4秒
          { pitch: 53, time: 2.0, duration: 0.6, velocity: 85 }, { pitch: 57, time: 2.0, duration: 0.6, velocity: 75 },
          { pitch: 60, time: 2.0, duration: 0.6, velocity: 75 }, { pitch: 63, time: 2.0, duration: 0.6, velocity: 70 },
          { pitch: 77, time: 2.0, duration: 0.6, velocity: 90 }, { pitch: 81, time: 2.7, duration: 0.6, velocity: 85 },
          { pitch: 77, time: 3.4, duration: 0.6, velocity: 80 },
          // I (BbMaj7) 4-6秒
          { pitch: 46, time: 4.0, duration: 0.6, velocity: 90 }, { pitch: 50, time: 4.0, duration: 0.6, velocity: 80 },
          { pitch: 53, time: 4.0, duration: 0.6, velocity: 80 }, { pitch: 57, time: 4.0, duration: 0.6, velocity: 75 },
          { pitch: 70, time: 4.0, duration: 0.6, velocity: 95 }, { pitch: 74, time: 4.7, duration: 0.6, velocity: 90 },
          { pitch: 77, time: 5.4, duration: 0.6, velocity: 85 },
          // ii-V turnaround 6-8秒
          { pitch: 48, time: 6.0, duration: 0.5, velocity: 85 }, { pitch: 53, time: 6.5, duration: 0.5, velocity: 85 },
          { pitch: 46, time: 7.0, duration: 1.0, velocity: 90 }
        ]
      }],
      bass: [{
        id: 'jazz_walking_bass',
        name: 'ウォーキングベース',
        instrumentType: 'upright_bass',
        duration: 8.0,
        notes: [
          // ウォーキングベースパターン
          { pitch: 36, time: 0.0, duration: 0.6, velocity: 100 }, { pitch: 39, time: 0.6, duration: 0.6, velocity: 95 },
          { pitch: 43, time: 1.2, duration: 0.8, velocity: 100 },
          { pitch: 41, time: 2.0, duration: 0.6, velocity: 100 }, { pitch: 45, time: 2.6, duration: 0.6, velocity: 95 },
          { pitch: 48, time: 3.2, duration: 0.8, velocity: 100 },
          { pitch: 34, time: 4.0, duration: 0.6, velocity: 105 }, { pitch: 38, time: 4.6, duration: 0.6, velocity: 100 },
          { pitch: 41, time: 5.2, duration: 0.8, velocity: 105 },
          { pitch: 36, time: 6.0, duration: 0.6, velocity: 100 }, { pitch: 41, time: 6.6, duration: 0.6, velocity: 95 },
          { pitch: 34, time: 7.2, duration: 0.8, velocity: 105 }
        ]
      }],
      drum: [{
        id: 'jazz_drums',
        name: 'ジャズドラム',
        duration: 16.0,
        pattern: {
          kick: [0, 3, 6, 9, 12, 15],
          snare_brush: [1, 2, 4, 5, 7, 8, 10, 11, 13, 14],
          ride: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          brush_sweep: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]
        }
      }]
    },
    creationGuide: {
      nextSteps: {
        ja: ['ii-V-I進行を繰り返そう', '3拍子の1拍目を強調', 'ウォーキングベースで流れを作ろう'],
        en: ['Repeat ii-V-I progression', 'Emphasize 1st beat in 3/4', 'Create flow with walking bass']
      }
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
      description: {
        ja: '【音楽理論完全対応】I-vi-ii-V進行のスムースジャズ。深夜の雰囲気を醸し出す大人のジャズサウンド！',
        en: 'Smooth jazz with I-vi-ii-V progression. Sophisticated midnight jazz atmosphere!'
      },
      difficulty: 'advanced',
      estimatedCompletionTime: 30,
      musicTheory: {
        chordProgression: 'I-vi-ii-V (FMaj7-Dm7-Gm7-C7)',
        referenceTrack: 'Blue in Green - Miles Davis',
        beatsEmphasis: '4/4 スムースジャズ / レイドバック'
      }
    },
    structure: {
      tempo: 90,
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'F', quality: 'major' },
      totalBars: 32,
      completedBars: 16
    },
    tracks: {
      midi: [{
        id: 'smooth_piano',
        name: 'スムースピアノ',
        instrumentType: 'electric_piano',
        duration: 8.0,
        notes: [
          { pitch: 53, time: 0.0, duration: 1.5, velocity: 80 }, { pitch: 57, time: 0.0, duration: 1.5, velocity: 70 },
          { pitch: 60, time: 0.0, duration: 1.5, velocity: 70 }, { pitch: 64, time: 0.0, duration: 1.5, velocity: 65 },
          { pitch: 77, time: 0.0, duration: 1.5, velocity: 85 },
          { pitch: 50, time: 2.0, duration: 1.5, velocity: 80 }, { pitch: 53, time: 2.0, duration: 1.5, velocity: 70 },
          { pitch: 57, time: 2.0, duration: 1.5, velocity: 70 }, { pitch: 60, time: 2.0, duration: 1.5, velocity: 65 },
          { pitch: 74, time: 2.0, duration: 1.5, velocity: 85 },
          { pitch: 55, time: 4.0, duration: 1.5, velocity: 85 }, { pitch: 58, time: 4.0, duration: 1.5, velocity: 75 },
          { pitch: 62, time: 4.0, duration: 1.5, velocity: 75 }, { pitch: 65, time: 4.0, duration: 1.5, velocity: 70 },
          { pitch: 79, time: 4.0, duration: 1.5, velocity: 90 },
          { pitch: 48, time: 6.0, duration: 1.5, velocity: 85 }, { pitch: 52, time: 6.0, duration: 1.5, velocity: 75 },
          { pitch: 55, time: 6.0, duration: 1.5, velocity: 75 }, { pitch: 58, time: 6.0, duration: 1.5, velocity: 70 },
          { pitch: 72, time: 6.0, duration: 2.0, velocity: 90 }
        ]
      }],
      bass: [{
        id: 'smooth_bass',
        name: 'スムースベース',
        instrumentType: 'upright_bass',
        duration: 8.0,
        notes: [
          { pitch: 41, time: 0.0, duration: 1.8, velocity: 95 }, { pitch: 38, time: 2.0, duration: 1.8, velocity: 95 },
          { pitch: 43, time: 4.0, duration: 1.8, velocity: 100 }, { pitch: 36, time: 6.0, duration: 2.0, velocity: 100 }
        ]
      }],
      drum: [{
        id: 'smooth_drums',
        name: 'スムースドラム',
        duration: 16.0,
        pattern: {
          kick: [0, 4, 8, 12],
          snare_brush: [2, 6, 10, 14],
          ride: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          brush_sweep: [0.5, 2.5, 4.5, 6.5, 8.5, 10.5, 12.5, 14.5]
        }
      }]
    },
    creationGuide: {
      nextSteps: {
        ja: ['F-Dm-Gm-C進行を続けよう', 'ゆったりとしたテンポで', '7thコードで洗練された響きを'],
        en: ['Continue F-Dm-Gm-C progression', 'Keep the relaxed tempo', 'Use 7th chords for sophistication']
      }
    }
  },

  // =============== EDM Demo Songs ===============
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
      title: { ja: 'ネオンドリーム', en: 'Neon Dreams' },
      description: {
        ja: '【音楽理論完全対応】i-VI-III-VII進行のモダンEDM。Animalsスタイルの4つ打ちとシンコペーション！',
        en: 'Modern EDM with i-VI-III-VII progression. Animals style with four-on-the-floor and syncopation!'
      },
      difficulty: 'intermediate',
      estimatedCompletionTime: 20,
      musicTheory: {
        chordProgression: 'i-VI-III-VII (Am-F-C-G)',
        referenceTrack: 'Animals - Martin Garrix',
        beatsEmphasis: '4つ打ち / シンコペーション / ビルドアップ'
      }
    },
    structure: {
      tempo: 128,
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'A', quality: 'minor' },
      totalBars: 32,
      completedBars: 16
    },
    tracks: {
      midi: [{
        id: 'edm_synth',
        name: 'EDMシンセ',
        instrumentType: 'synth_lead_edm',
        duration: 8.0,
        notes: [
          // i (Am) パッド 0-2秒
          { pitch: 69, time: 0.0, duration: 2.0, velocity: 70 }, { pitch: 72, time: 0.0, duration: 2.0, velocity: 65 },
          { pitch: 76, time: 0.0, duration: 2.0, velocity: 60 },
          // VI (F) パッド 2-4秒
          { pitch: 65, time: 2.0, duration: 2.0, velocity: 70 }, { pitch: 69, time: 2.0, duration: 2.0, velocity: 65 },
          { pitch: 72, time: 2.0, duration: 2.0, velocity: 60 },
          // III (C) パッド 4-6秒
          { pitch: 60, time: 4.0, duration: 2.0, velocity: 75 }, { pitch: 64, time: 4.0, duration: 2.0, velocity: 70 },
          { pitch: 67, time: 4.0, duration: 2.0, velocity: 65 },
          // VII (G) + リード 6-8秒
          { pitch: 55, time: 6.0, duration: 2.0, velocity: 75 }, { pitch: 59, time: 6.0, duration: 2.0, velocity: 70 },
          { pitch: 62, time: 6.0, duration: 2.0, velocity: 65 },
          { pitch: 93, time: 6.0, duration: 0.5, velocity: 110 }, { pitch: 91, time: 6.5, duration: 0.5, velocity: 105 },
          { pitch: 88, time: 7.0, duration: 0.5, velocity: 115 }, { pitch: 86, time: 7.5, duration: 0.5, velocity: 110 }
        ]
      }],
      bass: [{
        id: 'edm_bass',
        name: 'EDMベース',
        instrumentType: 'synth_bass_edm',
        duration: 8.0,
        notes: [
          // 4つ打ちベースパターン
          { pitch: 33, time: 0.0, duration: 0.4, velocity: 120 }, { pitch: 33, time: 0.5, duration: 0.3, velocity: 110 },
          { pitch: 33, time: 1.0, duration: 0.4, velocity: 120 }, { pitch: 33, time: 1.5, duration: 0.3, velocity: 110 },
          { pitch: 29, time: 2.0, duration: 0.4, velocity: 120 }, { pitch: 29, time: 2.5, duration: 0.3, velocity: 110 },
          { pitch: 29, time: 3.0, duration: 0.4, velocity: 120 }, { pitch: 29, time: 3.5, duration: 0.3, velocity: 110 },
          { pitch: 24, time: 4.0, duration: 0.4, velocity: 125 }, { pitch: 24, time: 4.5, duration: 0.3, velocity: 115 },
          { pitch: 24, time: 5.0, duration: 0.4, velocity: 125 }, { pitch: 24, time: 5.5, duration: 0.3, velocity: 115 },
          { pitch: 31, time: 6.0, duration: 0.4, velocity: 125 }, { pitch: 31, time: 6.5, duration: 0.3, velocity: 115 },
          { pitch: 31, time: 7.0, duration: 0.4, velocity: 127 }, { pitch: 31, time: 7.5, duration: 0.5, velocity: 120 }
        ]
      }],
      drum: [{
        id: 'edm_drums',
        name: 'EDMドラム',
        duration: 16.0,
        pattern: {
          kick: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5],
          snare: [1, 3, 5, 7, 9, 11, 13, 15],
          hihat: [0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75, 4.25, 4.75, 5.25, 5.75, 6.25, 6.75, 7.25, 7.75],
          crash: [0, 2, 4, 6, 8, 10, 12, 14],
          clap: [1, 3, 5, 7, 9, 11, 13, 15]
        }
      }]
    },
    creationGuide: {
      nextSteps: {
        ja: ['Am-F-C-G進行を繰り返そう', '4つ打ちキックで躍動感を', 'シンセリードで盛り上げよう'],
        en: ['Repeat Am-F-C-G progression', 'Four-on-the-floor kick for energy', 'Build up with synth leads']
      }
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
      description: {
        ja: '【音楽理論完全対応】i-III-VI-IV進行のFuture Bass。シンセチョップとトラップビートの融合！',
        en: 'Future Bass with i-III-VI-IV progression. Synth chops meets trap beats!'
      },
      difficulty: 'intermediate',
      estimatedCompletionTime: 22,
      musicTheory: {
        chordProgression: 'i-III-VI-IV (F#m-A-D-B)',
        referenceTrack: 'Alone - Marshmello',
        beatsEmphasis: 'トラップビート / ハーフタイム'
      }
    },
    structure: {
      tempo: 150,
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'F#', quality: 'minor' },
      totalBars: 32,
      completedBars: 16
    },
    tracks: {
      midi: [{
        id: 'future_synth',
        name: 'フューチャーシンセ',
        instrumentType: 'future_synth',
        duration: 8.0,
        notes: [
          { pitch: 66, time: 0.0, duration: 1.8, velocity: 75 }, { pitch: 69, time: 0.0, duration: 1.8, velocity: 70 },
          { pitch: 73, time: 0.0, duration: 1.8, velocity: 65 },
          { pitch: 69, time: 2.0, duration: 1.8, velocity: 80 }, { pitch: 73, time: 2.0, duration: 1.8, velocity: 75 },
          { pitch: 76, time: 2.0, duration: 1.8, velocity: 70 },
          { pitch: 62, time: 4.0, duration: 1.8, velocity: 85 }, { pitch: 66, time: 4.0, duration: 1.8, velocity: 80 },
          { pitch: 69, time: 4.0, duration: 1.8, velocity: 75 },
          { pitch: 59, time: 6.0, duration: 2.0, velocity: 90 }, { pitch: 63, time: 6.0, duration: 2.0, velocity: 85 },
          { pitch: 66, time: 6.0, duration: 2.0, velocity: 80 }
        ]
      }],
      bass: [{
        id: 'future_bass',
        name: 'フューチャーベース',
        instrumentType: 'future_bass',
        duration: 8.0,
        notes: [
          { pitch: 30, time: 0.0, duration: 1.8, velocity: 120 }, { pitch: 33, time: 2.0, duration: 1.8, velocity: 120 },
          { pitch: 26, time: 4.0, duration: 1.8, velocity: 125 }, { pitch: 35, time: 6.0, duration: 2.0, velocity: 125 }
        ]
      }],
      drum: [{
        id: 'trap_drums',
        name: 'トラップドラム',
        duration: 16.0,
        pattern: {
          kick: [0, 2, 4, 6, 8, 10, 12, 14],
          snare: [1, 3, 5, 7, 9, 11, 13, 15],
          hihat: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75],
          trap_hi: [0.125, 0.375, 0.625, 0.875, 1.125, 1.375, 1.625, 1.875]
        }
      }]
    },
    creationGuide: {
      nextSteps: {
        ja: ['F#m-A-D-B進行を続けよう', 'トラップビートでリズム感を', 'シンセチョップで未来感を'],
        en: ['Continue F#m-A-D-B progression', 'Trap beats for rhythm', 'Synth chops for futuristic feel']
      }
    }
  },

  // =============== クラシック Demo Songs ===============
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
      title: { ja: '朝のプレリュード', en: 'Morning Prelude' },
      description: {
        ja: '【音楽理論完全対応】I-IV-V-I進行の古典プレリュード。バッハスタイルの対位法と優雅なアルペジオ！',
        en: 'Classical prelude with I-IV-V-I progression. Bach style counterpoint and elegant arpeggios!'
      },
      difficulty: 'advanced',
      estimatedCompletionTime: 30,
      musicTheory: {
        chordProgression: 'I-IV-V-I (C-F-G-C)',
        referenceTrack: 'Prelude in C - J.S. Bach',
        beatsEmphasis: '4/4 / アルペジオパターン / 対位法'
      }
    },
    structure: {
      tempo: 80,
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'C', quality: 'major' },
      totalBars: 32,
      completedBars: 16
    },
    tracks: {
      midi: [{
        id: 'classical_piano',
        name: 'クラシカルピアノ',
        instrumentType: 'grand_piano',
        duration: 8.0,
        notes: [
          // I (C) アルペジオ 0-2秒
          { pitch: 48, time: 0.0, duration: 0.3, velocity: 75 }, { pitch: 60, time: 0.3, duration: 0.3, velocity: 80 },
          { pitch: 64, time: 0.6, duration: 0.3, velocity: 75 }, { pitch: 67, time: 0.9, duration: 0.3, velocity: 80 },
          { pitch: 72, time: 1.2, duration: 0.3, velocity: 85 }, { pitch: 67, time: 1.5, duration: 0.3, velocity: 75 },
          { pitch: 64, time: 1.8, duration: 0.2, velocity: 70 },
          // IV (F) アルペジオ 2-4秒
          { pitch: 53, time: 2.0, duration: 0.3, velocity: 75 }, { pitch: 65, time: 2.3, duration: 0.3, velocity: 80 },
          { pitch: 69, time: 2.6, duration: 0.3, velocity: 75 }, { pitch: 72, time: 2.9, duration: 0.3, velocity: 80 },
          { pitch: 77, time: 3.2, duration: 0.3, velocity: 85 }, { pitch: 72, time: 3.5, duration: 0.3, velocity: 75 },
          { pitch: 69, time: 3.8, duration: 0.2, velocity: 70 },
          // V (G) アルペジオ 4-6秒
          { pitch: 55, time: 4.0, duration: 0.3, velocity: 80 }, { pitch: 67, time: 4.3, duration: 0.3, velocity: 85 },
          { pitch: 71, time: 4.6, duration: 0.3, velocity: 80 }, { pitch: 74, time: 4.9, duration: 0.3, velocity: 85 },
          { pitch: 79, time: 5.2, duration: 0.3, velocity: 90 }, { pitch: 74, time: 5.5, duration: 0.3, velocity: 80 },
          { pitch: 71, time: 5.8, duration: 0.2, velocity: 75 },
          // I (C) 解決 6-8秒
          { pitch: 48, time: 6.0, duration: 0.3, velocity: 85 }, { pitch: 60, time: 6.3, duration: 0.3, velocity: 90 },
          { pitch: 64, time: 6.6, duration: 0.3, velocity: 85 }, { pitch: 67, time: 6.9, duration: 0.3, velocity: 90 },
          { pitch: 72, time: 7.2, duration: 0.8, velocity: 95 }
        ]
      }],
      cello: [{
        id: 'classical_cello',
        name: 'チェロ',
        instrumentType: 'cello',
        duration: 8.0,
        notes: [
          { pitch: 36, time: 0.0, duration: 1.8, velocity: 90 }, { pitch: 41, time: 2.0, duration: 1.8, velocity: 90 },
          { pitch: 43, time: 4.0, duration: 1.8, velocity: 95 }, { pitch: 36, time: 6.0, duration: 2.0, velocity: 95 }
        ]
      }],
      drum: [{
        id: 'classical_percussion',
        name: 'クラシカルパーカッション',
        duration: 16.0,
        pattern: {
          timpani: [0, 2, 4, 6, 8, 10, 12, 14],
          triangle: [1, 3, 5, 7, 9, 11, 13, 15]
        }
      }]
    },
    creationGuide: {
      nextSteps: {
        ja: ['C-F-G-C進行を続けよう', 'アルペジオパターンで優雅さを', '対位法で複数の声部を重ねよう'],
        en: ['Continue C-F-G-C progression', 'Arpeggios for elegance', 'Counterpoint for multiple voices']
      }
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
      description: {
        ja: '【音楽理論完全対応】I-V-vi-IV進行の弦楽四重奏。古典派スタイルの優雅な対位法と和声！',
        en: 'String quartet with I-V-vi-IV progression. Classical period style with elegant counterpoint!'
      },
      difficulty: 'advanced',
      estimatedCompletionTime: 35,
      musicTheory: {
        chordProgression: 'I-V-vi-IV (G-D-Em-C)',
        referenceTrack: 'String Quartet - Mozart',
        beatsEmphasis: '4/4 / 古典和声 / 対位法'
      }
    },
    structure: {
      tempo: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'G', quality: 'major' },
      totalBars: 32,
      completedBars: 16
    },
    tracks: {
      violin: [{
        id: 'violin_lead',
        name: 'ヴァイオリン',
        instrumentType: 'violin',
        duration: 8.0,
        notes: [
          { pitch: 79, time: 0.0, duration: 0.8, velocity: 85 }, { pitch: 83, time: 0.8, duration: 0.8, velocity: 80 },
          { pitch: 86, time: 1.6, duration: 0.4, velocity: 85 },
          { pitch: 86, time: 2.0, duration: 0.8, velocity: 85 }, { pitch: 90, time: 2.8, duration: 0.8, velocity: 80 },
          { pitch: 93, time: 3.6, duration: 0.4, velocity: 85 },
          { pitch: 88, time: 4.0, duration: 0.8, velocity: 90 }, { pitch: 84, time: 4.8, duration: 0.8, velocity: 85 },
          { pitch: 79, time: 5.6, duration: 0.4, velocity: 80 },
          { pitch: 84, time: 6.0, duration: 0.8, velocity: 90 }, { pitch: 79, time: 6.8, duration: 1.2, velocity: 85 }
        ]
      }],
      viola: [{
        id: 'viola',
        name: 'ヴィオラ',
        instrumentType: 'viola',
        duration: 8.0,
        notes: [
          { pitch: 67, time: 0.0, duration: 1.8, velocity: 75 }, { pitch: 74, time: 2.0, duration: 1.8, velocity: 75 },
          { pitch: 76, time: 4.0, duration: 1.8, velocity: 80 }, { pitch: 72, time: 6.0, duration: 2.0, velocity: 80 }
        ]
      }],
      cello: [{
        id: 'cello_bass',
        name: 'チェロ',
        instrumentType: 'cello',
        duration: 8.0,
        notes: [
          { pitch: 43, time: 0.0, duration: 1.8, velocity: 90 }, { pitch: 50, time: 2.0, duration: 1.8, velocity: 90 },
          { pitch: 52, time: 4.0, duration: 1.8, velocity: 95 }, { pitch: 48, time: 6.0, duration: 2.0, velocity: 95 }
        ]
      }]
    },
    creationGuide: {
      nextSteps: {
        ja: ['G-D-Em-C進行を続けよう', '各弦楽器で独立した旋律を', '和声と対位法のバランスを'],
        en: ['Continue G-D-Em-C progression', 'Independent melodies for each string', 'Balance harmony and counterpoint']
      }
    }
  },

  // =============== フォーク Demo Songs ===============
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
      title: { ja: 'キャンプファイヤーの歌', en: 'Campfire Song' },
      description: {
        ja: '【音楽理論完全対応】I-IV-I-V進行のシンプルフォーク。Take Me Homeスタイルの温かいアコースティックサウンド！',
        en: 'Simple folk with I-IV-I-V progression. Take Me Home style with warm acoustic sound!'
      },
      difficulty: 'beginner',
      estimatedCompletionTime: 15,
      musicTheory: {
        chordProgression: 'I-IV-I-V (G-C-G-D)',
        referenceTrack: 'Take Me Home, Country Roads',
        beatsEmphasis: '4/4 / 1拍目強拍 / シンプルストローク'
      }
    },
    structure: {
      tempo: 100,
      timeSignature: { numerator: 4, denominator: 4 },
      key: { root: 'G', quality: 'major' },
      totalBars: 32,
      completedBars: 16
    },
    tracks: {
      midi: [{
        id: 'folk_guitar',
        name: 'フォークギター',
        instrumentType: 'acoustic_guitar',
        duration: 8.0,
        notes: [
          // I (G) ストローク 0-2秒
          { pitch: 55, time: 0.0, duration: 0.4, velocity: 75 }, { pitch: 59, time: 0.0, duration: 0.4, velocity: 70 },
          { pitch: 62, time: 0.0, duration: 0.4, velocity: 70 }, { pitch: 79, time: 0.0, duration: 0.8, velocity: 80 },
          { pitch: 83, time: 1.0, duration: 0.8, velocity: 75 },
          // IV (C) ストローク 2-4秒
          { pitch: 48, time: 2.0, duration: 0.4, velocity: 75 }, { pitch: 52, time: 2.0, duration: 0.4, velocity: 70 },
          { pitch: 55, time: 2.0, duration: 0.4, velocity: 70 }, { pitch: 72, time: 2.0, duration: 0.8, velocity: 80 },
          { pitch: 76, time: 3.0, duration: 0.8, velocity: 75 },
          // I (G) ストローク 4-6秒
          { pitch: 55, time: 4.0, duration: 0.4, velocity: 75 }, { pitch: 59, time: 4.0, duration: 0.4, velocity: 70 },
          { pitch: 62, time: 4.0, duration: 0.4, velocity: 70 }, { pitch: 79, time: 4.0, duration: 0.8, velocity: 80 },
          { pitch: 74, time: 5.0, duration: 0.8, velocity: 75 },
          // V (D) ストローク 6-8秒
          { pitch: 50, time: 6.0, duration: 0.4, velocity: 75 }, { pitch: 54, time: 6.0, duration: 0.4, velocity: 70 },
          { pitch: 57, time: 6.0, duration: 0.4, velocity: 70 }, { pitch: 74, time: 6.0, duration: 0.8, velocity: 80 },
          { pitch: 78, time: 7.0, duration: 1.0, velocity: 75 }
        ]
      }],
      bass: [{
        id: 'folk_bass',
        name: 'フォークベース',
        instrumentType: 'acoustic_bass',
        duration: 8.0,
        notes: [
          { pitch: 43, time: 0.0, duration: 0.9, velocity: 95 }, { pitch: 43, time: 1.0, duration: 0.9, velocity: 90 },
          { pitch: 36, time: 2.0, duration: 0.9, velocity: 95 }, { pitch: 36, time: 3.0, duration: 0.9, velocity: 90 },
          { pitch: 43, time: 4.0, duration: 0.9, velocity: 95 }, { pitch: 43, time: 5.0, duration: 0.9, velocity: 90 },
          { pitch: 38, time: 6.0, duration: 0.9, velocity: 95 }, { pitch: 38, time: 7.0, duration: 1.0, velocity: 90 }
        ]
      }],
      drum: [{
        id: 'folk_percussion',
        name: 'フォークパーカッション',
        duration: 16.0,
        pattern: {
          kick: [0, 2, 4, 6, 8, 10, 12, 14],
          snare_brush: [1, 3, 5, 7, 9, 11, 13, 15],
          shaker: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5],
          tambourine: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]
        }
      }]
    },
    creationGuide: {
      nextSteps: {
        ja: ['G-C-G-D進行を繰り返そう', 'シンプルなストロークで', 'みんなで歌えるメロディを'],
        en: ['Repeat G-C-G-D progression', 'Simple strumming pattern', 'Singable melodies for everyone']
      }
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
      description: {
        ja: '【音楽理論完全対応】I-IV-V-I進行の3拍子フォークバラード。優しいフィンガーピッキングと穏やかな旋律！',
        en: 'Folk ballad in 3/4 with I-IV-V-I progression. Gentle fingerpicking and peaceful melodies!'
      },
      difficulty: 'intermediate',
      estimatedCompletionTime: 20,
      musicTheory: {
        chordProgression: 'I-IV-V-I (D-G-A-D)',
        referenceTrack: 'Scarborough Fair',
        beatsEmphasis: '3/4 / 1拍目強拍 / フィンガーピッキング'
      }
    },
    structure: {
      tempo: 90,
      timeSignature: { numerator: 3, denominator: 4 },
      key: { root: 'D', quality: 'major' },
      totalBars: 32,
      completedBars: 16
    },
    tracks: {
      midi: [{
        id: 'fingerpicking_guitar',
        name: 'フィンガーピッキング',
        instrumentType: 'acoustic_guitar_fingerpicking',
        duration: 8.0,
        notes: [
          // I (D) 0-2秒
          { pitch: 50, time: 0.0, duration: 0.6, velocity: 70 }, { pitch: 62, time: 0.6, duration: 0.5, velocity: 75 },
          { pitch: 66, time: 1.2, duration: 0.4, velocity: 70 }, { pitch: 69, time: 1.6, duration: 0.4, velocity: 75 },
          // IV (G) 2-4秒
          { pitch: 55, time: 2.0, duration: 0.6, velocity: 70 }, { pitch: 67, time: 2.6, duration: 0.5, velocity: 75 },
          { pitch: 71, time: 3.2, duration: 0.4, velocity: 70 }, { pitch: 74, time: 3.6, duration: 0.4, velocity: 75 },
          // V (A) 4-6秒
          { pitch: 57, time: 4.0, duration: 0.6, velocity: 75 }, { pitch: 69, time: 4.6, duration: 0.5, velocity: 80 },
          { pitch: 73, time: 5.2, duration: 0.4, velocity: 75 }, { pitch: 76, time: 5.6, duration: 0.4, velocity: 80 },
          // I (D) 6-8秒
          { pitch: 50, time: 6.0, duration: 0.6, velocity: 75 }, { pitch: 62, time: 6.6, duration: 0.5, velocity: 80 },
          { pitch: 66, time: 7.2, duration: 0.8, velocity: 75 }
        ]
      }],
      bass: [{
        id: 'folk_gentle_bass',
        name: 'フォークベース',
        instrumentType: 'acoustic_bass',
        duration: 8.0,
        notes: [
          { pitch: 38, time: 0.0, duration: 1.9, velocity: 90 },
          { pitch: 43, time: 2.0, duration: 1.9, velocity: 90 },
          { pitch: 45, time: 4.0, duration: 1.9, velocity: 95 },
          { pitch: 38, time: 6.0, duration: 2.0, velocity: 95 }
        ]
      }],
      drum: [{
        id: 'soft_percussion',
        name: 'ソフトパーカッション',
        duration: 16.0,
        pattern: {
          brush: [0, 3, 6, 9, 12, 15],
          shaker: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          woodblock: [1, 4, 7, 10, 13]
        }
      }]
    },
    creationGuide: {
      nextSteps: {
        ja: ['D-G-A-D進行を続けよう', '3拍子の優雅な流れを保って', 'フィンガーピッキングパターンを確立しよう'],
        en: ['Continue D-G-A-D progression', 'Keep the elegant 3/4 flow', 'Establish fingerpicking pattern']
      }
    }
  }
];

export default DEMO_SONGS;
