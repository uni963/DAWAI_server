/**
 * 音楽理論エンジン
 * スケール計算、コード理論、リズム理論の実装
 */

import MUSIC_THEORY_DATA from '../data/musicTheory.js';

class MusicTheoryEngine {
  constructor() {
    this.scaleDatabase = MUSIC_THEORY_DATA.scales;
    this.chordDatabase = MUSIC_THEORY_DATA.chords;
    this.chordProgressions = MUSIC_THEORY_DATA.chordProgressions;
    this.rhythmPatterns = MUSIC_THEORY_DATA.rhythmPatterns;
    this.noteNames = MUSIC_THEORY_DATA.noteNames;
    this.romanNumerals = MUSIC_THEORY_DATA.romanNumerals;
  }

  // ========== スケール計算 ==========

  /**
   * スケール計算
   * @param {string} root - ルート音名 "C", "D", etc.
   * @param {string} scaleType - "major", "minor", "pentatonic", etc.
   * @returns {Object} スケールオブジェクト
   */
  calculateScale(root, scaleType) {
    const rootPitch = this.noteNameToMidi(root, 4);  // 中央C = 60
    const scaleData = this.scaleDatabase[scaleType];

    if (!scaleData) {
      throw new Error(`Unknown scale type: ${scaleType}`);
    }

    const intervals = scaleData.intervals;
    const pitches = intervals.map(interval => rootPitch + interval);
    const notes = pitches.map(pitch => this.midiToNoteName(pitch));

    return {
      root,
      type: scaleType,
      intervals,
      pitches: this._expandToFullRange(pitches),  // 全音域に拡張
      notes,
      degrees: scaleData.degrees,
      characteristics: scaleData.jaCharacteristics || scaleData.characteristics
    };
  }

  /**
   * スケール度数から音を取得
   * @param {Object} scale - スケールオブジェクト
   * @param {number} degree - 度数 (1-7)
   * @returns {number} MIDI番号
   */
  getScaleDegree(scale, degree) {
    const index = (degree - 1) % scale.intervals.length;
    const octaveOffset = Math.floor((degree - 1) / scale.intervals.length) * 12;
    return scale.pitches[0] + scale.intervals[index] + octaveOffset;
  }

  /**
   * ピッチがスケール内かチェック
   * @param {number} pitch - MIDI番号
   * @param {Object} scale - スケールオブジェクト
   * @returns {boolean}
   */
  isPitchInScale(pitch, scale) {
    const pitchClass = pitch % 12;
    const scalePitchClasses = scale.intervals.map(interval =>
      (scale.pitches[0] + interval) % 12
    );
    return scalePitchClasses.includes(pitchClass);
  }

  // ========== コード理論 ==========

  /**
   * ダイアトニックコード生成
   * @param {Object} scale - スケールオブジェクト
   * @returns {Array} コード配列
   */
  generateDiatonicChords(scale) {
    const chords = [];
    const scaleIntervals = scale.intervals;
    const rootPitch = scale.pitches[0];

    for (let i = 0; i < scaleIntervals.length; i++) {
      const root = rootPitch + scaleIntervals[i];
      const thirdIndex = (i + 2) % scaleIntervals.length;
      const fifthIndex = (i + 4) % scaleIntervals.length;

      const third = rootPitch + scaleIntervals[thirdIndex];
      const fifth = rootPitch + scaleIntervals[fifthIndex];

      // 3度と5度の音程からコード種類を判定
      const thirdInterval = (third - root) % 12;
      const fifthInterval = (fifth - root) % 12;

      let chordType = 'major';
      if (thirdInterval === 3 && fifthInterval === 7) {
        chordType = 'minor';
      } else if (thirdInterval === 3 && fifthInterval === 6) {
        chordType = 'diminished';
      }

      chords.push({
        root,
        pitches: [root, third, fifth],
        type: chordType,
        symbol: this._generateChordSymbol(root, chordType),
        degree: i + 1,
        romanNumeral: this._getDegreeRomanNumeral(i + 1, chordType)
      });
    }

    return chords;
  }

  /**
   * コード進行生成
   * @param {Object} key - キー情報 {root, quality}
   * @param {Object} genre - ジャンル情報
   * @returns {Array} コード進行
   */
  generateChordProgression(key, genre) {
    const scale = this.calculateScale(key.root, key.quality);
    const diatonicChords = this.generateDiatonicChords(scale);

    // ジャンル特有パターン使用
    const genreProgressions = genre.musicTheory.chordProgressions;
    if (!genreProgressions || genreProgressions.length === 0) {
      // デフォルト進行
      return [diatonicChords[0], diatonicChords[3], diatonicChords[4], diatonicChords[0]]; // I-IV-V-I
    }

    const pattern = genreProgressions[0].pattern;  // 最も一般的なもの

    return pattern.map(degreeSymbol => {
      const degree = this._parseRomanNumeral(degreeSymbol);
      return diatonicChords[degree - 1] || diatonicChords[0];
    });
  }

  /**
   * コードトーン取得
   * @param {Object} chord - コードオブジェクト
   * @returns {Array} ピッチクラス配列
   */
  getChordTones(chord) {
    return chord.pitches.map(p => p % 12);
  }

  /**
   * テンションノート取得
   * @param {Object} chord - コードオブジェクト
   * @returns {Array} テンションピッチクラス配列
   */
  getChordTensions(chord) {
    const root = chord.root % 12;
    return [
      (root + 2) % 12,   // 9th
      (root + 5) % 12,   // 11th
      (root + 9) % 12    // 13th
    ];
  }

  // ========== リズム理論 ==========

  /**
   * リズムパターン生成
   * @param {number} tempo - テンポ
   * @param {Object} genre - ジャンル情報
   * @returns {Object} リズムパターン
   */
  generateRhythmPattern(tempo, genre) {
    const characteristics = genre.musicTheory.rhythmCharacteristics;

    const timeSignature = genre.timeSignatures ? genre.timeSignatures[0] : '4/4';
    const [numerator, denominator] = timeSignature.split('/').map(Number);

    return {
      tempo,
      timeSignature: { numerator, denominator },
      pattern: this._createRhythmicGrid(characteristics, numerator),
      swing: characteristics.swingFeel,
      accents: characteristics.accentBeats,
      typicalPatterns: characteristics.typicalPatterns || []
    };
  }

  /**
   * ノートクオンタイズ
   * @param {Array} notes - ノート配列
   * @param {Object} grid - グリッド情報
   * @returns {Array} クオンタイズされたノート配列
   */
  quantizeNotes(notes, grid) {
    const subdivision = grid.subdivision || 16;
    return notes.map(note => ({
      ...note,
      time: this._snapToGrid(note.time, subdivision),
      duration: this._snapToGrid(note.duration, subdivision)
    }));
  }

  // ========== ピッチ制約 ==========

  /**
   * ピッチをスケールに制約
   * @param {number} pitch - MIDI番号
   * @param {Object} scale - スケールオブジェクト
   * @returns {number} 制約されたMIDI番号
   */
  constrainPitchToScale(pitch, scale) {
    const pitchClass = pitch % 12;
    const octave = Math.floor(pitch / 12);
    const rootPitchClass = scale.pitches[0] % 12;

    // スケール内のピッチクラスを計算
    const scalePitchClasses = scale.intervals.map(interval =>
      (rootPitchClass + interval) % 12
    );

    if (scalePitchClasses.includes(pitchClass)) {
      return pitch;  // すでにスケール内
    }

    // 最も近いスケール音を見つける
    const distances = scalePitchClasses.map(sp => {
      const dist = Math.min(
        Math.abs(pitchClass - sp),
        Math.abs(pitchClass - sp + 12),
        Math.abs(pitchClass - sp - 12)
      );
      return { pitchClass: sp, distance: dist };
    });

    distances.sort((a, b) => a.distance - b.distance);
    const closestPitchClass = distances[0].pitchClass;

    return octave * 12 + closestPitchClass;
  }

  /**
   * ダイアトニックピッチ提案
   * @param {number} currentPitch - 現在のピッチ
   * @param {string} direction - 'up' | 'down'
   * @param {Object} scale - スケールオブジェクト
   * @returns {number} 提案ピッチ
   */
  suggestDiatonicPitch(currentPitch, direction, scale) {
    const constrainedPitch = this.constrainPitchToScale(currentPitch, scale);
    const pitchClass = constrainedPitch % 12;
    const octave = Math.floor(constrainedPitch / 12);
    const rootPitchClass = scale.pitches[0] % 12;

    const scalePitchClasses = scale.intervals.map(interval =>
      (rootPitchClass + interval) % 12
    );

    const currentIndex = scalePitchClasses.indexOf(pitchClass);
    if (currentIndex === -1) {
      return constrainedPitch;
    }

    let nextIndex;
    if (direction === 'up') {
      nextIndex = (currentIndex + 1) % scalePitchClasses.length;
      const nextPitchClass = scalePitchClasses[nextIndex];

      // オクターブ調整
      if (nextPitchClass < pitchClass) {
        return (octave + 1) * 12 + nextPitchClass;
      } else {
        return octave * 12 + nextPitchClass;
      }
    } else {
      nextIndex = (currentIndex - 1 + scalePitchClasses.length) % scalePitchClasses.length;
      const nextPitchClass = scalePitchClasses[nextIndex];

      // オクターブ調整
      if (nextPitchClass > pitchClass) {
        return (octave - 1) * 12 + nextPitchClass;
      } else {
        return octave * 12 + nextPitchClass;
      }
    }
  }

  // ========== ユーティリティ ==========

  /**
   * 音名からMIDI番号に変換
   * @param {string} noteName - 音名 "C", "C#", "Db", etc.
   * @param {number} octave - オクターブ番号
   * @returns {number} MIDI番号
   */
  noteNameToMidi(noteName, octave = 4) {
    const noteMap = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    if (!(noteName in noteMap)) {
      throw new Error(`Invalid note name: ${noteName}`);
    }

    return noteMap[noteName] + (octave + 1) * 12;
  }

  /**
   * MIDI番号から音名に変換
   * @param {number} midiNumber - MIDI番号
   * @returns {string} 音名+オクターブ
   */
  midiToNoteName(midiNumber) {
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteName = this.noteNames[midiNumber % 12];
    return `${noteName}${octave}`;
  }

  /**
   * ピッチから音名のみ取得
   * @param {number} pitch - MIDI番号
   * @returns {string} 音名のみ
   */
  pitchToNoteName(pitch) {
    return this.noteNames[pitch % 12];
  }

  /**
   * 音程関係を分析
   * @param {number} pitch1 - 第1音
   * @param {number} pitch2 - 第2音
   * @returns {Object} 音程情報
   */
  analyzeInterval(pitch1, pitch2) {
    const semitones = Math.abs(pitch2 - pitch1) % 12;
    const intervalNames = [
      'unison', 'minor2nd', 'major2nd', 'minor3rd', 'major3rd',
      'perfect4th', 'tritone', 'perfect5th', 'minor6th', 'major6th',
      'minor7th', 'major7th'
    ];

    return {
      semitones,
      name: intervalNames[semitones],
      direction: pitch2 > pitch1 ? 'ascending' : pitch2 < pitch1 ? 'descending' : 'unison'
    };
  }

  // ========== プライベートメソッド ==========

  /**
   * 全音域にスケール音を拡張
   * @param {Array} pitches - 基本ピッチ配列
   * @returns {Array} 拡張されたピッチ配列
   */
  _expandToFullRange(pitches) {
    const expanded = [];

    for (let octave = 0; octave < 11; octave++) {
      pitches.forEach(pitch => {
        const basePitch = pitch % 12;  // ピッチクラスに変換
        const fullPitch = basePitch + (octave * 12);
        if (fullPitch >= 0 && fullPitch <= 127) {
          expanded.push(fullPitch);
        }
      });
    }

    return expanded.sort((a, b) => a - b);
  }

  /**
   * コードシンボル生成
   * @param {number} root - ルート音
   * @param {string} chordType - コードタイプ
   * @returns {string} コードシンボル
   */
  _generateChordSymbol(root, chordType) {
    const rootName = this.pitchToNoteName(root);
    const chordData = this.chordDatabase[chordType];

    if (chordData && chordData.symbol) {
      return rootName + chordData.symbol;
    }

    return rootName; // デフォルト（メジャー）
  }

  /**
   * 度数からローマ数字を取得
   * @param {number} degree - 度数
   * @param {string} chordType - コードタイプ
   * @returns {string} ローマ数字
   */
  _getDegreeRomanNumeral(degree, chordType) {
    const romanMap = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    const roman = romanMap[degree - 1];

    if (chordType === 'minor' || chordType === 'diminished') {
      return roman.toLowerCase();
    }
    return roman;
  }

  /**
   * ローマ数字をパース
   * @param {string} symbol - ローマ数字シンボル
   * @returns {number} 度数
   */
  _parseRomanNumeral(symbol) {
    // 装飾記号を除去してコアローマ数字を取得
    const coreSymbol = symbol.replace(/maj7|7|b5|#5|sus4|sus2|add9/g, '');

    if (this.romanNumerals[coreSymbol]) {
      return this.romanNumerals[coreSymbol];
    }

    // フォールバック
    return 1;
  }

  /**
   * リズムグリッド作成
   * @param {Object} characteristics - リズム特性
   * @param {number} beatsPerBar - 小節内拍数
   * @returns {Array} リズムパターン
   */
  _createRhythmicGrid(characteristics, beatsPerBar = 4) {
    const pattern = [];
    const accentBeats = characteristics.accentBeats || [0];

    for (let beat = 0; beat < beatsPerBar; beat++) {
      const isAccent = accentBeats.includes(beat);
      pattern.push({
        time: beat,
        velocity: isAccent ? 100 : 80,
        accent: isAccent
      });
    }

    return pattern;
  }

  /**
   * グリッドにスナップ
   * @param {number} time - 時間
   * @param {number} subdivision - 分割数
   * @returns {number} スナップされた時間
   */
  _snapToGrid(time, subdivision) {
    const gridUnit = 1 / subdivision;
    return Math.round(time / gridUnit) * gridUnit;
  }
}

export default MusicTheoryEngine;