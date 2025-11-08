/**
 * MusicTheorySystem - Ghost Text用音楽理論システム
 * tonal.js をベースとした包括的な音楽理論処理
 *
 * @author Claude Code
 * @date 2025-10-05
 * @version 1.0.0
 */

import { Scale, Note, Interval, Chord } from 'tonal';

/**
 * 音楽ジャンル定義
 * 各ジャンルに推奨スケールとリズム特性を定義
 */
export const MUSIC_GENRES = {
  POP: {
    name: "ポップミュージック調",
    id: "pop",
    description: "明るく親しみやすいポップスタイル",
    recommendedScales: ["major", "minor", "major pentatonic"],
    recommendedAI: {
      ghostText: 'magenta',
      chatAssistant: 'gemini',
      reason: 'ポップスには明るく親しみやすいメロディ生成に適したGeminiが最適'
    },
    rhythmCharacteristics: {
      straightFeel: true,
      syncopation: 0.3,
      noteValuePreference: ["quarter", "eighth"],
      restProbability: 0.15
    },
    rhythmDefinition: {
      time_signature: "4/4",
      strong_beats: [1, 3],
      weak_beats: [2, 4],
      off_beats_priority: [2, 4],
      swing_ratio: 0.0,
      drum_pattern_hint: "Kick on 1, Snare on 2 & 4"
    },
    harmonicTendencies: {
      prefersConsonance: true,
      allowedTensions: ["add9", "6"],
      avoidedIntervals: ["m2", "m9", "dim5"]
    }
  },
  JAZZ: {
    name: "ジャズ調",
    id: "jazz",
    description: "洗練されたジャズハーモニーとスウィング",
    recommendedScales: ["major", "dorian", "mixolydian", "blues", "bebop"],
    recommendedAI: {
      ghostText: 'magenta',
      chatAssistant: 'claude',
      reason: 'ジャズの複雑なハーモニーと理論にはClaudeの深い理解が有効'
    },
    rhythmCharacteristics: {
      straightFeel: false,
      swingRatio: 0.67,
      syncopation: 0.6,
      noteValuePreference: ["eighth", "triplet", "sixteenth"],
      restProbability: 0.25
    },
    rhythmDefinition: {
      time_signature: "4/4",
      strong_beats: [1, 3],
      weak_beats: [2, 4],
      off_beats_priority: [1, 2, 3, 4],
      swing_ratio: 0.67,
      drum_pattern_hint: "Swing feel, ride cymbal on swing 8ths"
    },
    harmonicTendencies: {
      prefersConsonance: false,
      allowedTensions: ["7", "9", "11", "13", "add9", "#11"],
      chromaticPassing: true,
      extendedChords: true
    }
  },
  RNB: {
    name: "R&B調",
    id: "rnb",
    description: "ソウルフルなR&Bグルーヴ",
    recommendedScales: ["minor", "minor pentatonic", "blues", "dorian"],
    recommendedAI: {
      ghostText: 'magenta',
      chatAssistant: 'openai',
      reason: 'R&Bのソウルフルな表現力とグルーヴにはOpenAIの創造性が適合'
    },
    rhythmCharacteristics: {
      straightFeel: true,
      syncopation: 0.5,
      noteValuePreference: ["sixteenth", "eighth"],
      restProbability: 0.2,
      ghostNotes: true
    },
    rhythmDefinition: {
      time_signature: "4/4",
      strong_beats: [1, 3],
      weak_beats: [2, 4],
      off_beats_priority: [2, 4],
      swing_ratio: 0.2,
      drum_pattern_hint: "Syncopated groove, ghost notes on snare"
    },
    harmonicTendencies: {
      prefersConsonance: false,
      allowedTensions: ["7", "9", "sus4", "add9"],
      blueNotes: true,
      soulfulBends: true
    }
  },
  ROCK: {
    name: "ロック調",
    id: "rock",
    description: "力強いロックサウンド",
    recommendedScales: ["minor", "minor pentatonic", "blues", "natural minor"],
    recommendedAI: {
      ghostText: 'magenta',
      chatAssistant: 'openai',
      reason: 'ロックの力強いサウンドとエネルギーにはOpenAIのバランス型が適合'
    },
    rhythmCharacteristics: {
      straightFeel: true,
      syncopation: 0.4,
      noteValuePreference: ["quarter", "eighth"],
      restProbability: 0.1,
      powerfulRhythm: true
    },
    rhythmDefinition: {
      time_signature: "4/4",
      strong_beats: [1, 3],
      weak_beats: [2, 4],
      off_beats_priority: [2, 4],
      swing_ratio: 0.0,
      drum_pattern_hint: "Powerful backbeat, heavy kick and snare"
    },
    harmonicTendencies: {
      prefersConsonance: true,
      allowedTensions: ["sus4", "add9"],
      powerChords: true,
      avoidedIntervals: ["m2", "M7"]
    }
  },
  BALLAD: {
    name: "バラード調",
    id: "ballad",
    description: "感動的なバラードスタイル",
    recommendedScales: ["major", "minor", "major pentatonic", "minor pentatonic"],
    recommendedAI: {
      ghostText: 'magenta',
      chatAssistant: 'claude',
      reason: 'バラードの感情的な表現と深いメロディにはClaudeの理解力が最適'
    },
    rhythmCharacteristics: {
      straightFeel: true,
      syncopation: 0.2,
      noteValuePreference: ["half", "quarter", "eighth"],
      restProbability: 0.3,
      legato: true
    },
    rhythmDefinition: {
      time_signature: "4/4",
      strong_beats: [1, 3],
      weak_beats: [2, 4],
      off_beats_priority: [2, 4],
      swing_ratio: 0.0,
      drum_pattern_hint: "Soft and emotional, light brush on snare"
    },
    harmonicTendencies: {
      prefersConsonance: true,
      allowedTensions: ["add9", "sus4", "6"],
      emotionalProgression: true,
      avoidedIntervals: ["dim5"]
    }
  },
  "LO-FI HIP HOP": {
    name: "Lo-Fi Hip Hop調",
    id: "lofi_hiphop",
    description: "リラックスしたLo-Fiビート",
    recommendedScales: ["minor", "minor pentatonic", "dorian"],
    recommendedAI: {
      ghostText: 'magenta',
      chatAssistant: 'gemini',
      reason: 'Lo-Fiのリラックスした雰囲気とアンビエント感にはGeminiが最適'
    },
    rhythmCharacteristics: {
      straightFeel: true,
      syncopation: 0.35,
      noteValuePreference: ["eighth", "sixteenth"],
      restProbability: 0.25,
      chillVibe: true
    },
    rhythmDefinition: {
      time_signature: "4/4",
      strong_beats: [1, 3],
      weak_beats: [2, 4],
      off_beats_priority: [2, 4],
      swing_ratio: 0.15,
      drum_pattern_hint: "Kick on 1 & 3. Snare on 2 & 4 (Backbeat)."
    },
    harmonicTendencies: {
      prefersConsonance: false,
      allowedTensions: ["7", "9", "add9"],
      jazzInfluence: true,
      mellowChords: true
    }
  }
};

/**
 * スケール定義
 * tonal.js準拠のスケール名とMIDI音程配列の対応
 */
export const SCALE_DEFINITIONS = {
  major: {
    name: "メジャースケール",
    id: "major",
    tonalName: "major",
    intervals: ["1P", "2M", "3M", "4P", "5P", "6M", "7M"],
    semitones: [0, 2, 4, 5, 7, 9, 11],
    mood: "bright",
    description: "明るく安定したクラシックなスケール"
  },
  minor: {
    name: "マイナースケール",
    id: "minor",
    tonalName: "natural minor",
    intervals: ["1P", "2M", "3m", "4P", "5P", "6m", "7m"],
    semitones: [0, 2, 3, 5, 7, 8, 10],
    mood: "dark",
    description: "物悲しく感情的なスケール"
  },
  pentatonic: {
    name: "ペンタトニックスケール",
    id: "pentatonic",
    tonalName: "major pentatonic",
    intervals: ["1P", "2M", "3M", "5P", "6M"],
    semitones: [0, 2, 4, 7, 9],
    mood: "universal",
    description: "世界中で愛される5音スケール"
  },
  "minor pentatonic": {
    name: "マイナーペンタトニックスケール",
    id: "minor_pentatonic",
    tonalName: "minor pentatonic",
    intervals: ["1P", "3m", "4P", "5P", "7m"],
    semitones: [0, 3, 5, 7, 10],
    mood: "bluesy",
    description: "ブルースやロックの基本スケール"
  },
  blues: {
    name: "ブルーノートスケール",
    id: "blues",
    tonalName: "blues",
    intervals: ["1P", "3m", "4P", "5d", "5P", "7m"],
    semitones: [0, 3, 5, 6, 7, 10],
    mood: "bluesy",
    description: "ブルースフィーリング満載のスケール"
  }
};

/**
 * MusicTheorySystem - 音楽理論処理の中核クラス
 */
export class MusicTheorySystem {
  constructor() {
    this.currentGenre = null;
    this.currentScales = [];
    this.rootNote = "C";
    this.octave = 4;

    // キャッシュ機能
    this.scaleCache = new Map();
    this.noteCache = new Map();

    // 初期化
    this.initialize();
  }

  /**
   * システム初期化
   */
  initialize() {
    try {
      // デフォルト設定
      this.setGenre('POP');
      this.setScales(['major']);
      this.setRootNote('C', 4);

      console.log('🎵 Music Theory System initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Music Theory System:', error);
      return false;
    }
  }

  /**
   * ジャンル設定
   * @param {string} genreId - ジャンルID
   */
  setGenre(genreId) {
    if (!MUSIC_GENRES[genreId]) {
      throw new Error(`Unknown genre: ${genreId}`);
    }

    this.currentGenre = MUSIC_GENRES[genreId];

    // ジャンルに推奨されるスケールを自動設定
    this.setScales(this.currentGenre.recommendedScales.slice(0, 2));

    console.log(`🎭 Genre set to: ${this.currentGenre.name}`);
  }

  /**
   * スケール設定
   * @param {string[]} scaleIds - スケールID配列
   */
  setScales(scaleIds) {
    const validScales = scaleIds.filter(scaleId => {
      const scaleName = this.getScaleName(scaleId);
      return SCALE_DEFINITIONS[scaleName] || Scale.get(scaleName).empty === false;
    });

    if (validScales.length === 0) {
      throw new Error('No valid scales provided');
    }

    this.currentScales = validScales;
    this.clearCache();

    console.log(`🎼 Scales set to: ${validScales.join(', ')}`);
  }

  /**
   * ルート音設定
   * @param {string} note - ノート名 (C, D, E等)
   * @param {number} octave - オクターブ番号
   */
  setRootNote(note, octave = 4) {
    if (!Note.get(note + octave).empty) {
      this.rootNote = note;
      this.octave = octave;
      this.clearCache();

      console.log(`🎯 Root note set to: ${note}${octave}`);
    } else {
      throw new Error(`Invalid note: ${note}${octave}`);
    }
  }

  /**
   * スケール名の正規化
   * @param {string} scaleId - スケールID
   * @returns {string} 正規化されたスケール名
   */
  getScaleName(scaleId) {
    const scaleDefinition = SCALE_DEFINITIONS[scaleId];
    return scaleDefinition ? scaleDefinition.tonalName : scaleId;
  }

  /**
   * 現在の設定でスケール音程を取得
   * @returns {Array} 現在のスケールに含まれる全MIDI音程の配列
   */
  getCurrentScaleNotes() {
    const cacheKey = `${this.rootNote}${this.octave}-${this.currentScales.join(',')}`;

    if (this.scaleCache.has(cacheKey)) {
      return this.scaleCache.get(cacheKey);
    }

    const allNotes = new Set();

    for (const scaleId of this.currentScales) {
      const scaleName = this.getScaleName(scaleId);
      const fullScaleName = `${this.rootNote}${this.octave} ${scaleName}`;

      try {
        const scale = Scale.get(fullScaleName);

        if (!scale.empty && scale.notes) {
          // 複数オクターブにわたってノートを追加
          for (let octaveOffset = -1; octaveOffset <= 2; octaveOffset++) {
            scale.notes.forEach(noteName => {
              const note = Note.get(noteName);
              const midiNote = Note.midi(note.name + (this.octave + octaveOffset));
              if (midiNote !== null && midiNote >= 21 && midiNote <= 108) {
                allNotes.add(midiNote);
              }
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to process scale: ${fullScaleName}`, error);
      }
    }

    const result = Array.from(allNotes).sort((a, b) => a - b);
    this.scaleCache.set(cacheKey, result);

    return result;
  }

  /**
   * MIDI音程がスケール内かどうかを判定
   * @param {number} midiNote - MIDI音程 (0-127)
   * @returns {boolean} スケール内の場合true
   */
  isInScale(midiNote) {
    const scaleNotes = this.getCurrentScaleNotes();
    return scaleNotes.includes(midiNote);
  }

  /**
   * MIDI音程配列をスケール制約でフィルタリング
   * @param {number[]} midiNotes - MIDI音程配列
   * @param {Object} options - フィルタリングオプション
   * @returns {number[]} フィルタリング済み音程配列
   */
  filterByScale(midiNotes, options = {}) {
    const {
      allowPassingTones = false,
      preferConsonance = false,
      maxDistance = 12
    } = options;

    const scaleNotes = this.getCurrentScaleNotes();

    return midiNotes.filter(midiNote => {
      // スケール内音程は常に許可
      if (this.isInScale(midiNote)) {
        return true;
      }

      // 経過音の許可
      if (allowPassingTones) {
        // 隣接するスケール音程をチェック
        const hasAdjacentScaleNote = scaleNotes.some(scaleNote =>
          Math.abs(midiNote - scaleNote) === 1
        );
        if (hasAdjacentScaleNote) {
          return true;
        }
      }

      // 協和音程の優先
      if (preferConsonance) {
        const rootMidi = Note.midi(this.rootNote + this.octave);
        const interval = Math.abs(midiNote - rootMidi) % 12;
        const consonantIntervals = [0, 3, 4, 5, 7, 8, 9]; // P1, m3, M3, P4, P5, m6, M6
        if (consonantIntervals.includes(interval)) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * ジャンル特性に基づく音程の優先度スコア計算
   * @param {number} midiNote - MIDI音程
   * @param {Object} context - 楽曲コンテキスト
   * @returns {number} 優先度スコア (0-1)
   */
  calculateGenreScore(midiNote, context = {}) {
    if (!this.currentGenre || !this.isInScale(midiNote)) {
      return 0;
    }

    let score = 0.5; // ベーススコア

    const genre = this.currentGenre;
    const rootMidi = Note.midi(this.rootNote + this.octave);
    const interval = Math.abs(midiNote - rootMidi) % 12;

    // ジャンル別調整
    switch (genre.id) {
      case 'pop':
        // ポップス: 1, 3, 5度を重視
        if ([0, 4, 7].includes(interval)) score += 0.3;
        break;

      case 'jazz':
        // ジャズ: 拡張和音・テンション重視
        if ([2, 6, 9, 11].includes(interval)) score += 0.2;
        if ([4, 7, 10].includes(interval)) score += 0.1;
        break;

      case 'rnb':
        // R&B: ブルーノート重視
        if ([3, 6, 10].includes(interval)) score += 0.3;
        break;

      case 'rock':
        // ロック: パワーコード重視
        if ([0, 7].includes(interval)) score += 0.4;
        if ([5].includes(interval)) score += 0.2;
        break;

      case 'ballad':
        // バラード: 美しい協和音程重視
        if ([0, 4, 7, 9].includes(interval)) score += 0.3;
        break;
    }

    // 協和性ボーナス
    if (genre.harmonicTendencies.prefersConsonance) {
      const consonantIntervals = [0, 3, 4, 5, 7, 8, 9];
      if (consonantIntervals.includes(interval)) {
        score += 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Ghost Text予測のフィルタリングと優先度付け
   * @param {Array} predictions - AI予測結果配列
   * @returns {Array} フィルタリング・優先度付け済み予測
   */
  processPredictions(predictions) {
    if (!Array.isArray(predictions) || predictions.length === 0) {
      return [];
    }

    return predictions
      .map(prediction => {
        // MIDI音程の抽出
        const midiNote = prediction.pitch || prediction.note;
        if (typeof midiNote !== 'number') {
          return null;
        }

        // スケール制約チェック
        const isInCurrentScale = this.isInScale(midiNote);
        if (!isInCurrentScale) {
          return null; // スケール外は除外
        }

        // ジャンルスコア計算
        const genreScore = this.calculateGenreScore(midiNote);

        return {
          ...prediction,
          midiNote,
          genreScore,
          scaleCompliant: true
        };
      })
      .filter(prediction => prediction !== null)
      .sort((a, b) => b.genreScore - a.genreScore);
  }

  /**
   * 現在の設定情報を取得
   * @returns {Object} 設定情報オブジェクト
   */
  getCurrentSettings() {
    return {
      genre: this.currentGenre,
      scales: this.currentScales.map(scaleId => ({
        id: scaleId,
        name: SCALE_DEFINITIONS[scaleId]?.name || scaleId,
        definition: SCALE_DEFINITIONS[scaleId]
      })),
      rootNote: this.rootNote,
      octave: this.octave,
      scaleNotes: this.getCurrentScaleNotes()
    };
  }

  /**
   * キャッシュクリア
   */
  clearCache() {
    this.scaleCache.clear();
    this.noteCache.clear();
  }

  /**
   * システム情報取得
   * @returns {Object} システム情報
   */
  getSystemInfo() {
    return {
      initialized: true,
      availableGenres: Object.keys(MUSIC_GENRES),
      availableScales: Object.keys(SCALE_DEFINITIONS),
      cacheSize: this.scaleCache.size + this.noteCache.size,
      currentSettings: this.getCurrentSettings()
    };
  }
}

// デフォルトインスタンス
export const musicTheorySystem = new MusicTheorySystem();

export default MusicTheorySystem;