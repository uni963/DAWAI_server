/**
 * スケール定義・変換ユーティリティ
 * Tonal.jsを使用した音楽理論計算のヘルパー関数群
 *
 * @module ScaleUtils
 * @author Claude Code
 * @date 2025-10-05
 */

import { Scale, Note, Interval } from 'tonal'

/**
 * スケール定義マップ
 * 各スケールタイプとそのインターバル構造
 */
export const SCALE_DEFINITIONS = {
  major: {
    name: 'Major Scale',
    nameJp: 'メジャースケール',
    intervals: ['1P', '2M', '3M', '4P', '5P', '6M', '7M'],
    tonalName: 'major',
    description: '明るく開放的な響きの基本スケール',
    characteristics: ['bright', 'stable', 'consonant', 'traditional']
  },
  minor: {
    name: 'Natural Minor Scale',
    nameJp: 'ナチュラルマイナースケール',
    intervals: ['1P', '2M', '3m', '4P', '5P', '6m', '7m'],
    tonalName: 'natural minor',
    description: '哀愁的で感情的な響きのスケール',
    characteristics: ['dark', 'emotional', 'melancholic', 'expressive']
  },
  pentatonic: {
    name: 'Major Pentatonic Scale',
    nameJp: 'ペンタトニックスケール',
    intervals: ['1P', '2M', '3M', '5P', '6M'],
    tonalName: 'major pentatonic',
    description: 'シンプルで覚えやすい5音階',
    characteristics: ['simple', 'universal', 'folk', 'accessible']
  },
  blueNote: {
    name: 'Blues Scale',
    nameJp: 'ブルーノートスケール',
    intervals: ['1P', '3m', '4P', '5d', '5P', '7m'],
    tonalName: 'blues',
    description: 'ブルースとジャズで使われる表現豊かなスケール',
    characteristics: ['bluesy', 'expressive', 'jazzy', 'soulful']
  }
}

/**
 * MIDIノート番号から音名への変換
 * @param {number} midiNote - MIDIノート番号 (0-127)
 * @returns {string} 音名 (例: "C4", "A#3")
 */
export function midiToNoteName(midiNote) {
  try {
    return Note.fromMidi(midiNote)
  } catch (error) {
    console.warn('ScaleUtils: Invalid MIDI note:', midiNote)
    return 'C4' // フォールバック
  }
}

/**
 * 音名からMIDIノート番号への変換
 * @param {string} noteName - 音名 (例: "C4", "A#3")
 * @returns {number} MIDIノート番号
 */
export function noteNameToMidi(noteName) {
  try {
    const midi = Note.midi(noteName)
    return midi !== null ? midi : 60 // フォールバック (C4)
  } catch (error) {
    console.warn('ScaleUtils: Invalid note name:', noteName)
    return 60 // フォールバック (C4)
  }
}

/**
 * スケールノートを生成
 * @param {string} rootNote - ルート音 (例: "C", "D#")
 * @param {string} scaleType - スケールタイプ ("major", "minor", "pentatonic", "blueNote")
 * @param {number} octave - オクターブ (デフォルト: 4)
 * @returns {Array<Object>} スケールノート情報配列
 */
export function generateScaleNotes(rootNote, scaleType, octave = 4) {
  const scaleDefinition = SCALE_DEFINITIONS[scaleType]
  if (!scaleDefinition) {
    console.warn('ScaleUtils: Unknown scale type:', scaleType)
    return []
  }

  try {
    // Tonal.jsでスケールを生成
    const scaleNotes = Scale.get(`${rootNote} ${scaleDefinition.tonalName}`).notes

    // 複数オクターブにわたってノートを生成 (C2-C6の範囲)
    const result = []

    for (let oct = 2; oct <= 6; oct++) {
      scaleNotes.forEach((note, index) => {
        const noteWithOctave = `${note}${oct}`
        const midiNote = noteNameToMidi(noteWithOctave)

        // 有効なMIDI範囲内のみ
        if (midiNote >= 24 && midiNote <= 96) {
          result.push({
            note: note,
            noteWithOctave: noteWithOctave,
            midi: midiNote,
            octave: oct,
            scaleIndex: index,
            interval: scaleDefinition.intervals[index % scaleDefinition.intervals.length],
            frequency: midiToFrequency(midiNote)
          })
        }
      })
    }

    return result.sort((a, b) => a.midi - b.midi)

  } catch (error) {
    console.error('ScaleUtils: Error generating scale notes:', error)
    return []
  }
}

/**
 * MIDIノート番号を周波数に変換
 * @param {number} midiNote - MIDIノート番号
 * @returns {number} 周波数 (Hz)
 */
export function midiToFrequency(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12)
}

/**
 * 2つのノート間の音程を計算
 * @param {number} note1 - MIDIノート番号1
 * @param {number} note2 - MIDIノート番号2
 * @returns {Object} 音程情報
 */
export function calculateInterval(note1, note2) {
  try {
    const name1 = midiToNoteName(note1)
    const name2 = midiToNoteName(note2)
    const interval = Interval.distance(name1, name2)

    return {
      interval: interval,
      semitones: note2 - note1,
      direction: note2 > note1 ? 'ascending' : note2 < note1 ? 'descending' : 'unison'
    }
  } catch (error) {
    console.warn('ScaleUtils: Error calculating interval:', error)
    return {
      interval: '1P',
      semitones: 0,
      direction: 'unison'
    }
  }
}

/**
 * ノートがスケール内に含まれるかチェック
 * @param {number} midiNote - チェックするMIDIノート番号
 * @param {Array<Object>} scaleNotes - スケールノート配列
 * @returns {boolean} スケール内に含まれるかどうか
 */
export function isNoteInScale(midiNote, scaleNotes) {
  // 同じピッチクラス（オクターブ違い）を考慮
  const pitchClass = midiNote % 12
  return scaleNotes.some(scaleNote => (scaleNote.midi % 12) === pitchClass)
}

/**
 * 最も近いスケールノートを検索
 * @param {number} midiNote - 検索対象のMIDIノート番号
 * @param {Array<Object>} scaleNotes - スケールノート配列
 * @returns {Object|null} 最も近いスケールノート
 */
export function findClosestScaleNote(midiNote, scaleNotes) {
  if (scaleNotes.length === 0) return null

  let closestNote = scaleNotes[0]
  let minDistance = Math.abs(midiNote - closestNote.midi)

  for (const scaleNote of scaleNotes) {
    const distance = Math.abs(midiNote - scaleNote.midi)
    if (distance < minDistance) {
      minDistance = distance
      closestNote = scaleNote
    }
  }

  return {
    ...closestNote,
    distance: minDistance
  }
}

/**
 * スケール内のコード進行を生成
 * @param {string} rootNote - ルート音
 * @param {string} scaleType - スケールタイプ
 * @param {Array<number>} chordProgression - コード進行 (度数配列, 例: [1, 4, 5, 1])
 * @returns {Array<Object>} コード進行情報配列
 */
export function generateChordProgression(rootNote, scaleType, chordProgression = [1, 4, 5, 1]) {
  const scaleNotes = generateScaleNotes(rootNote, scaleType, 4)
  if (scaleNotes.length === 0) return []

  // 各オクターブの最初の音階のみを取得
  const scaleRoot = scaleNotes.filter(note => note.octave === 4)

  return chordProgression.map((degree, index) => {
    const chordRootIndex = (degree - 1) % scaleRoot.length
    const chordRoot = scaleRoot[chordRootIndex]

    if (!chordRoot) return null

    // 基本的な3和音を構築
    const third = scaleRoot[(chordRootIndex + 2) % scaleRoot.length]
    const fifth = scaleRoot[(chordRootIndex + 4) % scaleRoot.length]

    return {
      degree: degree,
      position: index,
      root: chordRoot,
      third: third,
      fifth: fifth,
      notes: [chordRoot, third, fifth].filter(Boolean),
      name: `${chordRoot.note} ${scaleType === 'major' ? 'maj' : 'min'}`
    }
  }).filter(Boolean)
}

/**
 * スケール特性スコアを計算
 * @param {number} midiNote - MIDIノート番号
 * @param {string} scaleType - スケールタイプ
 * @param {string} rootNote - ルート音
 * @returns {number} 特性スコア (0.0-1.0)
 */
export function calculateScaleCharacteristicScore(midiNote, scaleType, rootNote) {
  const scaleNotes = generateScaleNotes(rootNote, scaleType, 4)

  if (!isNoteInScale(midiNote, scaleNotes)) {
    return 0.0 // スケール外は0点
  }

  const pitchClass = midiNote % 12
  const rootPitchClass = noteNameToMidi(`${rootNote}4`) % 12
  const intervalFromRoot = (pitchClass - rootPitchClass + 12) % 12

  // スケールタイプ別の重要度スコア
  const scaleWeights = {
    major: {
      0: 1.0,  // Root
      2: 0.8,  // 2nd
      4: 0.9,  // 3rd
      5: 0.7,  // 4th
      7: 0.9,  // 5th
      9: 0.8,  // 6th
      11: 0.6  // 7th
    },
    minor: {
      0: 1.0,  // Root
      2: 0.8,  // 2nd
      3: 0.9,  // 3rd (minor)
      5: 0.7,  // 4th
      7: 0.9,  // 5th
      8: 0.8,  // 6th (minor)
      10: 0.8  // 7th (minor)
    },
    pentatonic: {
      0: 1.0,  // Root
      2: 0.9,  // 2nd
      4: 0.9,  // 3rd
      7: 0.9,  // 5th
      9: 0.8   // 6th
    },
    blueNote: {
      0: 1.0,  // Root
      3: 0.9,  // 3rd (minor)
      5: 0.7,  // 4th
      6: 0.8,  // Tritone (blue note)
      7: 0.9,  // 5th
      10: 0.8  // 7th (minor)
    }
  }

  const weights = scaleWeights[scaleType] || scaleWeights.major
  return weights[intervalFromRoot] || 0.5
}

/**
 * 複数スケールの統合スコアを計算
 * @param {number} midiNote - MIDIノート番号
 * @param {Array<string>} scaleTypes - スケールタイプ配列
 * @param {string} rootNote - ルート音
 * @returns {number} 統合スコア (0.0-1.0)
 */
export function calculateCombinedScaleScore(midiNote, scaleTypes, rootNote) {
  if (scaleTypes.length === 0) return 0.0

  const scores = scaleTypes.map(scaleType =>
    calculateScaleCharacteristicScore(midiNote, scaleType, rootNote)
  )

  // 最高スコアを採用（OR演算的な組み合わせ）
  return Math.max(...scores)
}

/**
 * スケール情報をエクスポート用フォーマットに変換
 * @param {string} rootNote - ルート音
 * @param {Array<string>} scaleTypes - スケールタイプ配列
 * @returns {Object} エクスポート用スケール情報
 */
export function exportScaleInfo(rootNote, scaleTypes) {
  const result = {
    rootNote: rootNote,
    scaleTypes: scaleTypes,
    scales: {},
    combinedNotes: [],
    metadata: {
      generatedAt: new Date().toISOString(),
      totalNotes: 0,
      noteRange: { min: 127, max: 0 }
    }
  }

  // 各スケールの詳細情報を生成
  scaleTypes.forEach(scaleType => {
    const scaleNotes = generateScaleNotes(rootNote, scaleType, 4)
    const definition = SCALE_DEFINITIONS[scaleType]

    result.scales[scaleType] = {
      definition: definition,
      notes: scaleNotes,
      noteCount: scaleNotes.length
    }
  })

  // 統合ノートリストを生成
  const allNotes = new Map()

  scaleTypes.forEach(scaleType => {
    const scaleNotes = result.scales[scaleType].notes
    scaleNotes.forEach(note => {
      const key = note.midi
      if (!allNotes.has(key)) {
        allNotes.set(key, {
          ...note,
          scales: [scaleType],
          combinedScore: calculateScaleCharacteristicScore(note.midi, scaleType, rootNote)
        })
      } else {
        const existingNote = allNotes.get(key)
        existingNote.scales.push(scaleType)
        existingNote.combinedScore = Math.max(
          existingNote.combinedScore,
          calculateScaleCharacteristicScore(note.midi, scaleType, rootNote)
        )
      }
    })
  })

  result.combinedNotes = Array.from(allNotes.values()).sort((a, b) => a.midi - b.midi)

  // メタデータを更新
  result.metadata.totalNotes = result.combinedNotes.length
  if (result.combinedNotes.length > 0) {
    result.metadata.noteRange.min = result.combinedNotes[0].midi
    result.metadata.noteRange.max = result.combinedNotes[result.combinedNotes.length - 1].midi
  }

  return result
}

export default {
  SCALE_DEFINITIONS,
  midiToNoteName,
  noteNameToMidi,
  generateScaleNotes,
  midiToFrequency,
  calculateInterval,
  isNoteInScale,
  findClosestScaleNote,
  generateChordProgression,
  calculateScaleCharacteristicScore,
  calculateCombinedScaleScore,
  exportScaleInfo
}