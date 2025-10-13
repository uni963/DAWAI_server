// キーボードショートカット計算ユーティリティ

// キーマッピング（白鍵）
const WHITE_KEY_MAPPING = {
  0: 'A',  // C
  2: 'S',  // D
  4: 'D',  // E
  5: 'F',  // F
  7: 'G',  // G
  9: 'H',  // A
  11: 'J', // B
}

// キーマッピング（黒鍵）
const BLACK_KEY_MAPPING = {
  1: 'W',  // C#
  3: 'E',  // D#
  6: 'T',  // F#
  8: 'Y',  // G#
  10: 'U', // A#
}

/**
 * スクロール位置に基づいて最適なオクターブを計算
 * @param {number} scrollY - 垂直スクロール位置
 * @param {number} currentTime - 現在の時間位置
 * @param {Array} OCTAVE_RANGE - オクターブ範囲
 * @param {number} TOTAL_KEYS - 総キー数
 * @param {number} GRID_HEIGHT - グリッドの高さ
 * @param {number} manualOctaveOffset - 手動オクターブ調整値
 * @returns {number} オクターブ番号
 */
export const calculateOptimalOctave = (scrollY, currentTime, OCTAVE_RANGE, TOTAL_KEYS, GRID_HEIGHT, manualOctaveOffset = 0) => {
  // 基準オクターブ（4）から手動調整値分だけオフセット
  const baseOctave = 4
  const finalOctave = baseOctave + manualOctaveOffset
  
  // オクターブ範囲を制限（1-8）
  const limitedOctave = Math.max(1, Math.min(8, finalOctave))
  
  return limitedOctave
}

/**
 * スクロール位置に基づいてオクターブを計算（従来の方法、後方互換性のため）
 * @param {number} currentTime - 現在の時間位置
 * @returns {number} オクターブ番号
 */
export const calculateOctave = (currentTime) => {
  if (!currentTime) return 4
  
  const baseOctave = 4 // 基準オクターブ
  const beatsPerOctave = 32 // 8小節で1オクターブ
  const octaveOffset = Math.floor(currentTime / beatsPerOctave)
  
  return Math.max(2, Math.min(6, baseOctave + octaveOffset))
}

/**
 * MIDIノート番号からキーボードショートカットを取得
 * @param {number} midiNote - MIDIノート番号
 * @param {number} octave - オクターブ番号
 * @returns {string|null} キーボードショートカット（存在しない場合はnull）
 */
export const getKeyboardShortcut = (midiNote, octave) => {
  const noteInOctave = midiNote % 12
  const isBlackKey = [1, 3, 6, 8, 10].includes(noteInOctave)
  
  if (isBlackKey) {
    return BLACK_KEY_MAPPING[noteInOctave] || null
  } else {
    return WHITE_KEY_MAPPING[noteInOctave] || null
  }
}

/**
 * 表示範囲内のキーボードショートカットを計算
 * @param {number} startKey - 開始キー番号
 * @param {number} endKey - 終了キー番号
 * @param {number} currentTime - 現在の時間位置
 * @param {Array} OCTAVE_RANGE - オクターブ範囲
 * @param {number} TOTAL_KEYS - 総キー数
 * @param {number} scrollY - 垂直スクロール位置
 * @param {number} GRID_HEIGHT - グリッドの高さ
 * @param {number} manualOctaveOffset - 手動オクターブ調整値
 * @returns {Array} キーボードショートカットの配列
 */
export const calculateVisibleShortcuts = (startKey, endKey, currentTime, OCTAVE_RANGE, TOTAL_KEYS, scrollY, GRID_HEIGHT, manualOctaveOffset = 0) => {
  const octave = calculateOptimalOctave(scrollY, currentTime, OCTAVE_RANGE, TOTAL_KEYS, GRID_HEIGHT, manualOctaveOffset)
  const shortcuts = []
  
  for (let i = startKey; i < endKey; i++) {
    // ピアノロールのキーインデックスからMIDIノート番号を正しく計算
    const pitch = (OCTAVE_RANGE[0] * 12) + (TOTAL_KEYS - 1 - i)
    const noteInOctave = pitch % 12
    
    // 現在のオクターブのキーのみにショートカットを表示
    const keyOctave = Math.floor(pitch / 12)
    if (keyOctave === octave) {
      const shortcut = getKeyboardShortcut(pitch, octave)
      
      if (shortcut) {
        shortcuts.push({
          keyIndex: i,
          midiNote: pitch,
          shortcut: shortcut,
          isBlackKey: [1, 3, 6, 8, 10].includes(noteInOctave)
        })
      }
    }
  }
  
  return shortcuts
}

/**
 * オクターブ調整表示用のキー位置を計算
 * @param {number} startKey - 開始キー番号
 * @param {number} endKey - 終了キー番号
 * @param {number} currentTime - 現在の時間位置
 * @param {Array} OCTAVE_RANGE - オクターブ範囲
 * @param {number} TOTAL_KEYS - 総キー数
 * @param {number} scrollY - 垂直スクロール位置
 * @param {number} GRID_HEIGHT - グリッドの高さ
 * @param {number} manualOctaveOffset - 手動オクターブ調整値
 * @returns {Array} オクターブ調整表示の配列
 */
export const calculateOctaveAdjustmentDisplays = (startKey, endKey, currentTime, OCTAVE_RANGE, TOTAL_KEYS, scrollY, GRID_HEIGHT, manualOctaveOffset = 0) => {
  const octave = calculateOptimalOctave(scrollY, currentTime, OCTAVE_RANGE, TOTAL_KEYS, GRID_HEIGHT, manualOctaveOffset)
  const displays = []
  
  for (let i = startKey; i < endKey; i++) {
    // ピアノロールのキーインデックスからMIDIノート番号を正しく計算
    const pitch = (OCTAVE_RANGE[0] * 12) + (TOTAL_KEYS - 1 - i)
    const noteInOctave = pitch % 12
    
    // 現在のオクターブのキーのみに表示
    const keyOctave = Math.floor(pitch / 12)
    
    // 隣のオクターブのキーにも表示（Jキーの一つ下とAキーの一つ上）
    if (keyOctave === octave + 1) {
      // 一つ下のオクターブのC（noteInOctave=0）にJキーの一つ下を表示
      if (noteInOctave === 0) {
        displays.push({
          keyIndex: i,
          midiNote: pitch,
          type: 'up', // ↑[R]
          isBlackKey: false
        })
      }
    }
    
    if (keyOctave === octave - 1) {
      // 一つ上のオクターブのG#（noteInOctave=8）にAキーの一つ上を表示
      if (noteInOctave === 11) {
        displays.push({
          keyIndex: i,
          midiNote: pitch,
          type: 'down', // ↓[Q]
          isBlackKey: true
        })
      }
    }
  }
  
  return displays
}

/**
 * キーボードショートカットからMIDIノート番号を計算
 * @param {string} keyCode - キーコード（例: 'KeyA'）
 * @param {number} octave - オクターブ番号
 * @returns {number|null} MIDIノート番号（存在しない場合はnull）
 */
export const getMidiNoteFromKeyCode = (keyCode, octave) => {
  // 白鍵の処理
  for (const [noteInOctave, key] of Object.entries(WHITE_KEY_MAPPING)) {
    if (keyCode === `Key${key}`) {
      return parseInt(noteInOctave) + (octave * 12)
    }
  }
  
  // 黒鍵の処理
  for (const [noteInOctave, key] of Object.entries(BLACK_KEY_MAPPING)) {
    if (keyCode === `Key${key}`) {
      return parseInt(noteInOctave) + (octave * 12)
    }
  }
  
  return null
} 