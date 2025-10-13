/*
 * phonemeConverter.js - Japanese text to phoneme conversion utility
 * 
 * Converts Japanese hiragana/katakana text to phonemes for DiffSinger
 * Based on the integration requirements from Koshirazu documentation
 */

// Basic hiragana to phoneme mapping
const KANA_TO_PHONEME = {
  // Vowels
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
  
  // K sounds
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
  
  // S sounds
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
  
  // T sounds
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
  
  // N sounds
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
  
  // H sounds
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
  
  // M sounds
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
  
  // Y sounds
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
  
  // R sounds
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
  
  // W sounds
  'わ': 'wa', 'ゐ': 'wi', 'ゑ': 'we', 'を': 'wo',
  'ワ': 'wa', 'ヰ': 'wi', 'ヱ': 'we', 'ヲ': 'wo',
  
  // N
  'ん': 'n', 'ン': 'n',
  
  // Combined sounds (ya, yu, yo combinations)
  'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
  'キャ': 'kya', 'キュ': 'kyu', 'キョ': 'kyo',
  'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
  'シャ': 'sha', 'シュ': 'shu', 'ショ': 'sho',
  'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
  'チャ': 'cha', 'チュ': 'chu', 'チョ': 'cho',
  'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
  'ニャ': 'nya', 'ニュ': 'nyu', 'ニョ': 'nyo',
  'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
  'ヒャ': 'hya', 'ヒュ': 'hyu', 'ヒョ': 'hyo',
  'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
  'ミャ': 'mya', 'ミュ': 'myu', 'ミョ': 'myo',
  'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
  'リャ': 'rya', 'リュ': 'ryu', 'リョ': 'ryo',
  'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
  'ギャ': 'gya', 'ギュ': 'gyu', 'ギョ': 'gyo',
  'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
  'ジャ': 'ja', 'ジュ': 'ju', 'ジョ': 'jo',
  'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
  'ビャ': 'bya', 'ビュ': 'byu', 'ビョ': 'byo',
  'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
  'ピャ': 'pya', 'ピュ': 'pyu', 'ピョ': 'pyo',
  
  // Special characters
  'ー': 'ー', // Long vowel marker (handled specially)
  'っ': 'q', // Small tsu (geminate)
  'ッ': 'q',
  ' ': ' ', // Space
  '　': ' ', // Full-width space
}

// Extract vowel from phoneme for long vowel processing
const extractVowel = (phoneme) => {
  if (!phoneme) return null
  
  // Single vowels
  if (['a', 'i', 'u', 'e', 'o'].includes(phoneme)) {
    return phoneme
  }
  
  // Extract last vowel from compound phonemes
  const vowelMatch = phoneme.match(/[aiueo]$/i)
  return vowelMatch ? vowelMatch[0] : null
}

// Process long vowel marker
const processLongVowel = (phonemes, index) => {
  if (index === 0) return 'a' // Default if at start
  
  const previousPhoneme = phonemes[index - 1]
  const vowel = extractVowel(previousPhoneme)
  return vowel || 'a'
}

// Convert text to phonemes
export const textToPhonemes = (text) => {
  if (!text || typeof text !== 'string') return []
  
  const phonemes = []
  const chars = Array.from(text) // Handle multi-byte characters correctly
  
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    
    // Handle long vowel marker
    if (char === 'ー') {
      const vowel = processLongVowel(phonemes, phonemes.length)
      phonemes.push(vowel)
      continue
    }
    
    // Skip whitespace and punctuation
    if (/[\s.,!?。、！？]/.test(char)) {
      continue
    }
    
    // Check for combined characters (ya, yu, yo combinations)
    if (i < chars.length - 1) {
      const combined = char + chars[i + 1]
      if (KANA_TO_PHONEME[combined]) {
        phonemes.push(KANA_TO_PHONEME[combined])
        i++ // Skip next character
        continue
      }
    }
    
    // Single character conversion
    const phoneme = KANA_TO_PHONEME[char]
    if (phoneme) {
      phonemes.push(phoneme)
    } else {
      // Unknown character, use 'a' as fallback
      console.warn(`Unknown character: ${char}, using 'a' as fallback`)
      phonemes.push('a')
    }
  }
  
  return phonemes
}

// Convert phonemes back to readable text (for display)
export const phonemesToText = (phonemes) => {
  if (!Array.isArray(phonemes)) return ''
  
  return phonemes.map(phoneme => {
    // Find the first kana that maps to this phoneme
    const kanaEntry = Object.entries(KANA_TO_PHONEME).find(([, p]) => p === phoneme)
    return kanaEntry ? kanaEntry[0] : phoneme
  }).join('')
}

// Validate phoneme sequence
export const validatePhonemes = (phonemes) => {
  if (!Array.isArray(phonemes)) return false
  
  const validPhonemes = new Set(Object.values(KANA_TO_PHONEME))
  validPhonemes.add('q') // Add small tsu
  
  return phonemes.every(phoneme => validPhonemes.has(phoneme))
}

// Get phoneme statistics
export const getPhonemeStats = (phonemes) => {
  if (!Array.isArray(phonemes)) return {}
  
  const stats = {}
  phonemes.forEach(phoneme => {
    stats[phoneme] = (stats[phoneme] || 0) + 1
  })
  
  return stats
}

// Auto-assign phonemes to MIDI notes
export const assignPhonemesToNotes = (lyrics, notes) => {
  if (!lyrics || !notes || !Array.isArray(notes)) return {}
  
  const phonemes = textToPhonemes(lyrics)
  const sortedNotes = [...notes].sort((a, b) => a.start - b.start)
  
  const assignments = {}
  
  // Assign phonemes to notes in order
  phonemes.forEach((phoneme, index) => {
    if (index < sortedNotes.length) {
      assignments[sortedNotes[index].id] = phoneme
    }
  })
  
  // If there are more notes than phonemes, assign 'a' to remaining notes
  if (sortedNotes.length > phonemes.length) {
    for (let i = phonemes.length; i < sortedNotes.length; i++) {
      assignments[sortedNotes[i].id] = 'a'
    }
  }
  
  return assignments
}

// Romanization utility (for debugging/display)
export const romanizePhonemes = (phonemes) => {
  if (!Array.isArray(phonemes)) return ''
  
  return phonemes.map(phoneme => {
    // Convert phoneme to romanized form
    switch (phoneme) {
      case 'shi': return 'shi'
      case 'chi': return 'chi'
      case 'tsu': return 'tsu'
      case 'fu': return 'fu'
      case 'ja': return 'ja'
      case 'ju': return 'ju'
      case 'jo': return 'jo'
      case 'sha': return 'sha'
      case 'shu': return 'shu'
      case 'sho': return 'sho'
      case 'cha': return 'cha'
      case 'chu': return 'chu'
      case 'cho': return 'cho'
      case 'n': return 'n'
      case 'q': return 'q'
      default: return phoneme
    }
  }).join('-')
}

// Helper function to get all available phonemes
export const getAllPhonemes = () => {
  return Array.from(new Set(Object.values(KANA_TO_PHONEME))).sort()
}

// Test function for development
export const testPhonemeConversion = () => {
  const testCases = [
    'こしらず',
    'こしらずー',
    'あいうえお',
    'かきくけこ',
    'しゃしゅしょ',
    'ちょっと',
    'がんばって',
    'ありがとう'
  ]
  
  console.log('Phoneme conversion test results:')
  testCases.forEach(text => {
    const phonemes = textToPhonemes(text)
    console.log(`${text} -> [${phonemes.join(', ')}] -> ${romanizePhonemes(phonemes)}`)
  })
}

export default {
  textToPhonemes,
  phonemesToText,
  validatePhonemes,
  getPhonemeStats,
  assignPhonemesToNotes,
  romanizePhonemes,
  getAllPhonemes,
  testPhonemeConversion
}