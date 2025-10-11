/**
 * ジャンル特性データベース
 * 各ジャンルの音楽的特徴と推奨スケールを定義
 *
 * @module GenreDatabase
 * @author Claude Code
 * @date 2025-10-05
 */

/**
 * ジャンル定義データベース
 * 各ジャンルの音楽的特徴、推奨スケール、特性スコアを定義
 */
export const GENRE_DATABASE = {
  POP: {
    id: 'POP',
    name: 'Pop Music',
    nameJp: 'ポップミュージック',
    description: 'キャッチーで親しみやすいメロディが特徴的な現代ポピュラー音楽',
    characteristics: {
      // 音楽的特性
      harmony: {
        complexity: 0.6, // ハーモニーの複雑さ (0.0-1.0)
        chromaticism: 0.4, // 半音階的要素 (0.0-1.0)
        dissonance: 0.2 // 不協和音の使用度 (0.0-1.0)
      },
      rhythm: {
        complexity: 0.5, // リズムの複雑さ
        syncopation: 0.6, // シンコペーションの使用度
        swing: 0.2 // スウィング感
      },
      melody: {
        stepwise: 0.7, // 段階的進行の傾向
        leaps: 0.4, // 跳躍進行の使用度
        repetition: 0.8, // 反復の使用度
        range: 0.6 // 音域の広さ
      },
      structure: {
        formality: 0.8, // 形式の定型性
        symmetry: 0.9, // 対称性
        predictability: 0.8 // 予測可能性
      }
    },
    // 推奨スケール（優先順位順）
    recommendedScales: ['major', 'minor', 'pentatonic', 'blueNote'],
    scaleWeights: {
      major: 1.0, // 最も重要
      minor: 0.8,
      pentatonic: 0.7,
      blueNote: 0.3
    },
    // 頻繁に使用される音程
    preferredIntervals: {
      'unison': 1.0,
      'major2nd': 0.8,
      'major3rd': 0.9,
      'perfect4th': 0.7,
      'perfect5th': 0.9,
      'major6th': 0.8,
      'major7th': 0.5,
      'octave': 1.0
    },
    // ジャンル固有の音楽的要素
    musicalElements: {
      hooks: 0.9, // フック（キャッチーなフレーズ）の重要度
      bridges: 0.7, // ブリッジ部分の使用度
      modulation: 0.4, // 転調の使用度
      sequence: 0.8, // 反復進行の使用度
      contrasts: 0.6 // 対比の使用度
    }
  },

  JAZZ: {
    id: 'JAZZ',
    name: 'Jazz Music',
    nameJp: 'ジャズ',
    description: '即興演奏と複雑なハーモニーが特徴的なアメリカ発祥の音楽',
    characteristics: {
      harmony: {
        complexity: 0.9,
        chromaticism: 0.8,
        dissonance: 0.7
      },
      rhythm: {
        complexity: 0.8,
        syncopation: 0.9,
        swing: 0.9
      },
      melody: {
        stepwise: 0.5,
        leaps: 0.8,
        repetition: 0.4,
        range: 0.8
      },
      structure: {
        formality: 0.6,
        symmetry: 0.5,
        predictability: 0.3
      }
    },
    recommendedScales: ['blueNote', 'minor', 'major', 'pentatonic'],
    scaleWeights: {
      blueNote: 1.0,
      minor: 0.9,
      major: 0.7,
      pentatonic: 0.6
    },
    preferredIntervals: {
      'unison': 1.0,
      'minor2nd': 0.7,
      'major2nd': 0.8,
      'minor3rd': 0.9,
      'major3rd': 0.8,
      'tritone': 0.8, // ジャズ特有
      'perfect5th': 0.8,
      'minor7th': 0.9,
      'major7th': 0.8
    },
    musicalElements: {
      improvisation: 0.9,
      blueNotes: 0.9,
      chromaticApproach: 0.8,
      substitution: 0.8,
      extensions: 0.9 // 9th, 11th, 13thなど
    }
  },

  RNB: {
    id: 'RNB',
    name: 'R&B / Soul Music',
    nameJp: 'R&B / ソウル',
    description: 'グルーヴとメロディックな歌唱が特徴的なリズム&ブルース',
    characteristics: {
      harmony: {
        complexity: 0.7,
        chromaticism: 0.6,
        dissonance: 0.4
      },
      rhythm: {
        complexity: 0.7,
        syncopation: 0.8,
        swing: 0.6
      },
      melody: {
        stepwise: 0.6,
        leaps: 0.6,
        repetition: 0.7,
        range: 0.7
      },
      structure: {
        formality: 0.7,
        symmetry: 0.7,
        predictability: 0.6
      }
    },
    recommendedScales: ['minor', 'blueNote', 'pentatonic', 'major'],
    scaleWeights: {
      minor: 1.0,
      blueNote: 0.9,
      pentatonic: 0.8,
      major: 0.6
    },
    preferredIntervals: {
      'unison': 1.0,
      'major2nd': 0.8,
      'minor3rd': 0.9,
      'major3rd': 0.8,
      'perfect4th': 0.7,
      'perfect5th': 0.9,
      'minor6th': 0.8,
      'minor7th': 0.9
    },
    musicalElements: {
      melisma: 0.9, // メリスマ（装飾的な歌唱）
      groove: 0.9,
      blueNotes: 0.8,
      callAndResponse: 0.7,
      gospel: 0.6
    }
  },

  ROCK: {
    id: 'ROCK',
    name: 'Rock Music',
    nameJp: 'ロック',
    description: '強いビートとエネルギッシュなサウンドが特徴的な音楽',
    characteristics: {
      harmony: {
        complexity: 0.5,
        chromaticism: 0.4,
        dissonance: 0.6
      },
      rhythm: {
        complexity: 0.6,
        syncopation: 0.5,
        swing: 0.2
      },
      melody: {
        stepwise: 0.6,
        leaps: 0.6,
        repetition: 0.8,
        range: 0.7
      },
      structure: {
        formality: 0.8,
        symmetry: 0.8,
        predictability: 0.7
      }
    },
    recommendedScales: ['pentatonic', 'minor', 'blueNote', 'major'],
    scaleWeights: {
      pentatonic: 1.0,
      minor: 0.9,
      blueNote: 0.7,
      major: 0.6
    },
    preferredIntervals: {
      'unison': 1.0,
      'major2nd': 0.7,
      'minor3rd': 0.8,
      'major3rd': 0.8,
      'perfect4th': 0.9,
      'perfect5th': 1.0, // パワーコード
      'minor7th': 0.8,
      'octave': 1.0
    },
    musicalElements: {
      powerChords: 0.9,
      riffs: 0.9,
      distortion: 0.8,
      driving: 0.9, // ドライビングなリズム
      energy: 0.9
    }
  },

  BALLAD: {
    id: 'BALLAD',
    name: 'Ballad',
    nameJp: 'バラード',
    description: '感情的で叙情的なゆったりとしたテンポの楽曲',
    characteristics: {
      harmony: {
        complexity: 0.7,
        chromaticism: 0.5,
        dissonance: 0.3
      },
      rhythm: {
        complexity: 0.3,
        syncopation: 0.3,
        swing: 0.2
      },
      melody: {
        stepwise: 0.8,
        leaps: 0.5,
        repetition: 0.6,
        range: 0.8
      },
      structure: {
        formality: 0.9,
        symmetry: 0.9,
        predictability: 0.8
      }
    },
    recommendedScales: ['major', 'minor', 'pentatonic', 'blueNote'],
    scaleWeights: {
      major: 0.9,
      minor: 1.0, // 感情的な表現
      pentatonic: 0.6,
      blueNote: 0.4
    },
    preferredIntervals: {
      'unison': 1.0,
      'major2nd': 0.9,
      'major3rd': 0.9,
      'perfect4th': 0.8,
      'perfect5th': 0.9,
      'major6th': 0.9,
      'major7th': 0.7,
      'octave': 1.0
    },
    musicalElements: {
      legato: 0.9, // なめらかな演奏
      sustain: 0.9, // 音の持続
      dynamics: 0.8, // 強弱の変化
      expression: 0.9, // 表現力
      rubato: 0.7 // テンポの揺らぎ
    }
  }
}

/**
 * ジャンルIDから詳細情報を取得
 * @param {string} genreId - ジャンルID
 * @returns {Object|null} ジャンル詳細情報
 */
export function getGenreInfo(genreId) {
  return GENRE_DATABASE[genreId] || null
}

/**
 * すべてのジャンルIDリストを取得
 * @returns {Array<string>} ジャンルID配列
 */
export function getAllGenreIds() {
  return Object.keys(GENRE_DATABASE)
}

/**
 * ジャンル名から詳細情報を検索
 * @param {string} genreName - ジャンル名（英語または日本語）
 * @returns {Object|null} ジャンル詳細情報
 */
export function findGenreByName(genreName) {
  const searchName = genreName.toLowerCase()

  for (const [id, genre] of Object.entries(GENRE_DATABASE)) {
    if (genre.name.toLowerCase() === searchName ||
        genre.nameJp === genreName ||
        genre.id.toLowerCase() === searchName) {
      return genre
    }
  }

  return null
}

/**
 * ジャンル間の類似度を計算
 * @param {string} genre1Id - ジャンル1のID
 * @param {string} genre2Id - ジャンル2のID
 * @returns {number} 類似度スコア (0.0-1.0)
 */
export function calculateGenreSimilarity(genre1Id, genre2Id) {
  const genre1 = getGenreInfo(genre1Id)
  const genre2 = getGenreInfo(genre2Id)

  if (!genre1 || !genre2) return 0.0
  if (genre1Id === genre2Id) return 1.0

  let totalSimilarity = 0
  let categoryCount = 0

  // 各特性カテゴリーでの類似度を計算
  for (const category of ['harmony', 'rhythm', 'melody', 'structure']) {
    const cat1 = genre1.characteristics[category]
    const cat2 = genre2.characteristics[category]

    let categorySimilarity = 0
    let attributeCount = 0

    for (const attribute in cat1) {
      if (cat2[attribute] !== undefined) {
        const diff = Math.abs(cat1[attribute] - cat2[attribute])
        categorySimilarity += (1.0 - diff)
        attributeCount++
      }
    }

    if (attributeCount > 0) {
      totalSimilarity += categorySimilarity / attributeCount
      categoryCount++
    }
  }

  return categoryCount > 0 ? totalSimilarity / categoryCount : 0.0
}

/**
 * ジャンル特性に基づいてMIDIノートのスコアを計算
 * @param {number} midiNote - MIDIノート番号
 * @param {string} genreId - ジャンルID
 * @param {number} previousNote - 前のMIDIノート番号（オプション）
 * @returns {number} ジャンル適合スコア (0.0-1.0)
 */
export function calculateGenreSpecificScore(midiNote, genreId, previousNote = null) {
  const genre = getGenreInfo(genreId)
  if (!genre) return 0.5 // デフォルトスコア

  let score = 0.5 // ベーススコア

  // 前のノートとの音程関係を評価
  if (previousNote !== null) {
    const interval = Math.abs(midiNote - previousNote)
    const intervalName = getIntervalName(interval)

    if (genre.preferredIntervals[intervalName]) {
      score *= genre.preferredIntervals[intervalName]
    }
  }

  // ジャンル特性に基づく調整
  const characteristics = genre.characteristics

  // メロディの特性に基づく調整
  if (previousNote !== null) {
    const stepSize = Math.abs(midiNote - previousNote)

    if (stepSize <= 2) {
      // 段階進行
      score *= (0.5 + 0.5 * characteristics.melody.stepwise)
    } else if (stepSize >= 5) {
      // 跳躍進行
      score *= (0.5 + 0.5 * characteristics.melody.leaps)
    }
  }

  return Math.max(0.0, Math.min(1.0, score))
}

/**
 * 音程数から音程名を取得
 * @param {number} semitones - 半音数
 * @returns {string} 音程名
 */
function getIntervalName(semitones) {
  const intervalMap = {
    0: 'unison',
    1: 'minor2nd',
    2: 'major2nd',
    3: 'minor3rd',
    4: 'major3rd',
    5: 'perfect4th',
    6: 'tritone',
    7: 'perfect5th',
    8: 'minor6th',
    9: 'major6th',
    10: 'minor7th',
    11: 'major7th',
    12: 'octave'
  }

  return intervalMap[semitones % 12] || 'unknown'
}

/**
 * ジャンルの推奨スケールを取得
 * @param {string} genreId - ジャンルID
 * @returns {Array<string>} 推奨スケール配列（優先順位順）
 */
export function getRecommendedScales(genreId) {
  const genre = getGenreInfo(genreId)
  return genre ? genre.recommendedScales : []
}

/**
 * ジャンルのスケール重みを取得
 * @param {string} genreId - ジャンルID
 * @returns {Object} スケール重みオブジェクト
 */
export function getScaleWeights(genreId) {
  const genre = getGenreInfo(genreId)
  return genre ? genre.scaleWeights : {}
}

/**
 * 複数ジャンルの組み合わせ特性を計算
 * @param {Array<string>} genreIds - ジャンルID配列
 * @returns {Object} 組み合わせ特性オブジェクト
 */
export function calculateCombinedGenreCharacteristics(genreIds) {
  if (genreIds.length === 0) return null
  if (genreIds.length === 1) return getGenreInfo(genreIds[0])

  const genres = genreIds.map(id => getGenreInfo(id)).filter(Boolean)
  if (genres.length === 0) return null

  // 特性の平均を計算
  const combined = {
    id: genreIds.join('+'),
    name: genres.map(g => g.name).join(' + '),
    nameJp: genres.map(g => g.nameJp).join(' + '),
    description: `${genres.map(g => g.nameJp).join('と')}の融合スタイル`,
    characteristics: {},
    recommendedScales: [],
    scaleWeights: {}
  }

  // 各特性カテゴリーの平均を計算
  for (const category of ['harmony', 'rhythm', 'melody', 'structure']) {
    combined.characteristics[category] = {}

    const firstGenre = genres[0].characteristics[category]
    for (const attribute in firstGenre) {
      const values = genres.map(g => g.characteristics[category][attribute]).filter(v => v !== undefined)
      combined.characteristics[category][attribute] = values.reduce((sum, val) => sum + val, 0) / values.length
    }
  }

  // 推奨スケールを統合（重複除去）
  const scaleSet = new Set()
  const weightSum = {}

  genres.forEach(genre => {
    genre.recommendedScales.forEach(scale => {
      scaleSet.add(scale)
      weightSum[scale] = (weightSum[scale] || 0) + (genre.scaleWeights[scale] || 0)
    })
  })

  combined.recommendedScales = Array.from(scaleSet)

  // スケール重みの平均を計算
  for (const scale of combined.recommendedScales) {
    combined.scaleWeights[scale] = weightSum[scale] / genres.length
  }

  // 重みでソート
  combined.recommendedScales.sort((a, b) => combined.scaleWeights[b] - combined.scaleWeights[a])

  return combined
}

/**
 * ジャンルデータベースの統計情報を取得
 * @returns {Object} 統計情報オブジェクト
 */
export function getDatabaseStats() {
  const genreIds = getAllGenreIds()
  const stats = {
    totalGenres: genreIds.length,
    scaleUsage: {},
    characteristicRanges: {
      harmony: { min: 1, max: 0 },
      rhythm: { min: 1, max: 0 },
      melody: { min: 1, max: 0 },
      structure: { min: 1, max: 0 }
    }
  }

  // スケール使用頻度を計算
  genreIds.forEach(genreId => {
    const genre = getGenreInfo(genreId)
    genre.recommendedScales.forEach(scale => {
      stats.scaleUsage[scale] = (stats.scaleUsage[scale] || 0) + 1
    })

    // 特性値の範囲を計算
    for (const category of ['harmony', 'rhythm', 'melody', 'structure']) {
      const characteristics = genre.characteristics[category]
      for (const attribute in characteristics) {
        const value = characteristics[attribute]
        stats.characteristicRanges[category].min = Math.min(stats.characteristicRanges[category].min, value)
        stats.characteristicRanges[category].max = Math.max(stats.characteristicRanges[category].max, value)
      }
    }
  })

  return stats
}

export default {
  GENRE_DATABASE,
  getGenreInfo,
  getAllGenreIds,
  findGenreByName,
  calculateGenreSimilarity,
  calculateGenreSpecificScore,
  getRecommendedScales,
  getScaleWeights,
  calculateCombinedGenreCharacteristics,
  getDatabaseStats
}