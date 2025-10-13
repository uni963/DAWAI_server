// RAG System - Retrieval-Augmented Generation System
class RAGSystem {
  constructor() {
    // 知識ベース
    this.musicKnowledgeBase = new Map()
    this.trackVectorStore = new Map()
    this.chordProgressionLibrary = new Map()
    
    // ベクトル化設定
    this.vectorDimensions = 384 // 簡易ベクトル次元数
    this.similarityThreshold = 0.7
    
    // キャッシュ
    this.searchCache = new Map()
    this.cacheTimeout = 10 * 60 * 1000 // 10分
    
    // 音楽知識の初期化
    this.initializeMusicKnowledge()
    this.initializeChordProgressions()
  }

  // 音楽知識ベースの初期化
  initializeMusicKnowledge() {
    const knowledgeItems = [
      {
        id: 'music_theory_basics',
        title: '音楽理論の基礎',
        content: `
音楽理論の基本概念：
- 音程：半音、全音、オクターブ
- スケール：メジャー、マイナー、ペンタトニック
- コード：三和音、四和音、テンション
- 調性：長調、短調、転調
- リズム：拍子、テンポ、グルーヴ
        `,
        tags: ['音楽理論', '基礎', 'スケール', 'コード'],
        category: 'theory'
      },
      {
        id: 'daw_operations',
        title: 'DAW操作ガイド',
        content: `
DAWの基本操作：
- トラック作成：オーディオ、MIDI、インストゥルメント
- 録音：リアルタイム録音、MIDI録音
- 編集：カット、コピー、ペースト、タイムストレッチ
- ミキシング：音量、パン、エフェクト
- マスタリング：最終調整、エクスポート
        `,
        tags: ['DAW', '操作', '録音', '編集', 'ミキシング'],
        category: 'operation'
      },
      {
        id: 'composition_techniques',
        title: '作曲テクニック',
        content: `
作曲の基本テクニック：
- メロディライン：音程進行、リズムパターン
- ハーモニー：コード進行、ボイシング
- リズム：ドラムパターン、ベースライン
- アレンジ：楽器編成、パート分け
- 構成：イントロ、Aメロ、Bメロ、サビ、アウトロ
        `,
        tags: ['作曲', 'メロディ', 'ハーモニー', 'リズム', 'アレンジ'],
        category: 'composition'
      },
      {
        id: 'genre_characteristics',
        title: 'ジャンル別特徴',
        content: `
主要ジャンルの特徴：
- ロック：パワーコード、ドラムビート、エレキギター
- ジャズ：複雑なコード進行、スイング、インプロビゼーション
- ポップス：キャッチーなメロディ、シンプルなコード進行
- クラシック：複雑な和声、オーケストラ編成
- エレクトロニカ：シンセサイザー、ビート、サンプリング
        `,
        tags: ['ジャンル', 'ロック', 'ジャズ', 'ポップス', 'クラシック', 'エレクトロニカ'],
        category: 'genre'
      },
      {
        id: 'mixing_techniques',
        title: 'ミキシング技術',
        content: `
ミキシングの基本技術：
- レベル調整：各トラックの音量バランス
- パンニング：ステレオイメージの調整
- イコライザー：周波数特性の調整
- コンプレッサー：ダイナミックレンジの制御
- リバーブ・ディレイ：空間感の演出
        `,
        tags: ['ミキシング', 'レベル', 'パン', 'イコライザー', 'コンプレッサー'],
        category: 'mixing'
      }
    ]

    knowledgeItems.forEach(item => {
      this.musicKnowledgeBase.set(item.id, {
        ...item,
        vector: this.generateSimpleVector(item.content + ' ' + item.tags.join(' '))
      })
    })

    console.log(`RAGSystem: Initialized ${knowledgeItems.length} music knowledge items`)
  }

  // コード進行ライブラリの初期化
  initializeChordProgressions() {
    const progressions = [
      {
        id: 'pop_1',
        name: '王道進行',
        chords: ['C', 'Am', 'F', 'G'],
        description: 'ポップスで最も一般的なコード進行',
        genre: 'pop',
        difficulty: 'easy'
      },
      {
        id: 'jazz_2_5_1',
        name: 'II-V-I進行',
        chords: ['Dm7', 'G7', 'Cmaj7'],
        description: 'ジャズの基本進行',
        genre: 'jazz',
        difficulty: 'medium'
      },
      {
        id: 'rock_power',
        name: 'パワーコード進行',
        chords: ['C5', 'F5', 'G5'],
        description: 'ロックで使用されるパワーコード進行',
        genre: 'rock',
        difficulty: 'easy'
      },
      {
        id: 'blues_12',
        name: '12小節ブルース',
        chords: ['C7', 'F7', 'G7'],
        description: 'ブルースの基本進行',
        genre: 'blues',
        difficulty: 'medium'
      },
      {
        id: 'classical_cadence',
        name: 'カデンツ',
        chords: ['C', 'F', 'G', 'C'],
        description: 'クラシック音楽の終止進行',
        genre: 'classical',
        difficulty: 'easy'
      }
    ]

    progressions.forEach(prog => {
      this.chordProgressionLibrary.set(prog.id, {
        ...prog,
        vector: this.generateSimpleVector(prog.name + ' ' + prog.chords.join(' ') + ' ' + prog.description)
      })
    })

    console.log(`RAGSystem: Initialized ${progressions.length} chord progressions`)
  }

  // 簡易ベクトル生成（実際の実装では適切なエンベディングモデルを使用）
  generateSimpleVector(text) {
    const words = text.toLowerCase().split(/\s+/)
    const vector = new Array(this.vectorDimensions).fill(0)
    
    words.forEach((word, index) => {
      const hash = this.simpleHash(word)
      const position = hash % this.vectorDimensions
      vector[position] += 1
    })
    
    // 正規化
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude
      }
    }
    
    return vector
  }

  // 簡易ハッシュ関数
  simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32bit整数に変換
    }
    return Math.abs(hash)
  }

  // コサイン類似度計算
  calculateCosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) return 0
    
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      norm1 += vec1[i] * vec1[i]
      norm2 += vec2[i] * vec2[i]
    }
    
    if (norm1 === 0 || norm2 === 0) return 0
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  // トラック情報のベクトル化と保存
  vectorizeTrackInfo(trackInfo) {
    const trackData = {
      id: trackInfo.id,
      name: trackInfo.name,
      type: trackInfo.type,
      notes: trackInfo.midiData?.notes || [],
      volume: trackInfo.volume,
      pan: trackInfo.pan,
      timestamp: Date.now()
    }

    // トラック情報をテキスト化
    const trackText = `${trackData.name} ${trackData.type} ${trackData.notes.length} notes volume ${trackData.volume} pan ${trackData.pan}`
    
    // ベクトル化
    const vector = this.generateSimpleVector(trackText)
    
    // 保存
    this.trackVectorStore.set(trackData.id, {
      ...trackData,
      vector: vector
    })

    console.log(`RAGSystem: Vectorized track: ${trackData.name}`)
    return vector
  }

  // 音楽知識の検索
  searchMusicKnowledge(query, limit = 3) {
    const queryVector = this.generateSimpleVector(query)
    const results = []

    for (const [id, item] of this.musicKnowledgeBase) {
      const similarity = this.calculateCosineSimilarity(queryVector, item.vector)
      
      if (similarity > this.similarityThreshold) {
        results.push({
          id: item.id,
          title: item.title,
          content: item.content,
          category: item.category,
          tags: item.tags,
          similarity: similarity
        })
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  }

  // コード進行の検索
  searchChordProgressions(query, limit = 3) {
    const queryVector = this.generateSimpleVector(query)
    const results = []

    for (const [id, prog] of this.chordProgressionLibrary) {
      const similarity = this.calculateCosineSimilarity(queryVector, prog.vector)
      
      if (similarity > this.similarityThreshold) {
        results.push({
          id: prog.id,
          name: prog.name,
          chords: prog.chords,
          description: prog.description,
          genre: prog.genre,
          difficulty: prog.difficulty,
          similarity: similarity
        })
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  }

  // トラック情報の検索
  searchTrackInfo(query, limit = 5) {
    const queryVector = this.generateSimpleVector(query)
    const results = []

    for (const [id, track] of this.trackVectorStore) {
      const similarity = this.calculateCosineSimilarity(queryVector, track.vector)
      
      if (similarity > this.similarityThreshold) {
        results.push({
          id: track.id,
          name: track.name,
          type: track.type,
          notes: track.notes,
          volume: track.volume,
          pan: track.pan,
          similarity: similarity
        })
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  }

  // 統合検索（音楽知識 + コード進行 + トラック情報）
  searchAll(query, options = {}) {
    const {
      musicKnowledgeLimit = 2,
      chordProgressionLimit = 2,
      trackInfoLimit = 3,
      maxTotalTokens = 1500
    } = options

    const results = {
      musicKnowledge: this.searchMusicKnowledge(query, musicKnowledgeLimit),
      chordProgressions: this.searchChordProgressions(query, chordProgressionLimit),
      trackInfo: this.searchTrackInfo(query, trackInfoLimit),
      totalTokens: 0
    }

    // トークン数計算
    let totalTokens = 0
    results.musicKnowledge.forEach(item => {
      totalTokens += this.estimateTokenCount(item.content)
    })
    results.chordProgressions.forEach(item => {
      totalTokens += this.estimateTokenCount(item.description)
    })
    results.trackInfo.forEach(item => {
      totalTokens += this.estimateTokenCount(JSON.stringify(item))
    })

    results.totalTokens = totalTokens

    // トークン制限を超える場合は優先度の低いものを削除
    if (totalTokens > maxTotalTokens) {
      this.trimResultsToTokenLimit(results, maxTotalTokens)
    }

    return results
  }

  // トークン制限に合わせて結果を調整
  trimResultsToTokenLimit(results, maxTokens) {
    let currentTokens = 0
    const priorityOrder = [
      { key: 'musicKnowledge', weight: 1.0 },
      { key: 'chordProgressions', weight: 0.8 },
      { key: 'trackInfo', weight: 0.6 }
    ]

    // 優先度順にトークン数を計算
    for (const { key, weight } of priorityOrder) {
      const items = results[key]
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const itemTokens = key === 'musicKnowledge' ? 
          this.estimateTokenCount(item.content) :
          key === 'chordProgressions' ?
          this.estimateTokenCount(item.description) :
          this.estimateTokenCount(JSON.stringify(item))

        if (currentTokens + itemTokens <= maxTokens) {
          currentTokens += itemTokens
        } else {
          // 制限を超える場合は残りのアイテムを削除
          results[key] = items.slice(0, i)
          break
        }
      }
    }

    results.totalTokens = currentTokens
  }

  // トークン数推定
  estimateTokenCount(text) {
    const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    const otherChars = text.length - japaneseChars - englishWords
    
    return japaneseChars + (englishWords * 1.3) + (otherChars / 4)
  }

  // RAGプロンプトの構築
  buildRAGPrompt(query, searchResults) {
    let prompt = `以下の関連情報を参考に、ユーザーの質問に回答してください。\n\n`

    // 音楽知識
    if (searchResults.musicKnowledge.length > 0) {
      prompt += `【音楽知識】\n`
      searchResults.musicKnowledge.forEach(item => {
        prompt += `${item.title}:\n${item.content}\n\n`
      })
    }

    // コード進行
    if (searchResults.chordProgressions.length > 0) {
      prompt += `【コード進行ライブラリ】\n`
      searchResults.chordProgressions.forEach(item => {
        prompt += `${item.name}: ${item.chords.join(' - ')} (${item.description})\n`
      })
      prompt += `\n`
    }

    // トラック情報
    if (searchResults.trackInfo.length > 0) {
      prompt += `【現在のトラック情報】\n`
      searchResults.trackInfo.forEach(item => {
        prompt += `- ${item.name} (${item.type}): ${item.notes.length} notes, 音量 ${item.volume}%, パン ${item.pan}%\n`
      })
      prompt += `\n`
    }

    prompt += `【ユーザーの質問】\n${query}\n\n上記の情報を参考に、具体的で実用的な回答を提供してください。`

    return prompt
  }

  // キャッシュのクリーンアップ
  cleanup() {
    const now = Date.now()
    
    for (const [key, value] of this.searchCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.searchCache.delete(key)
      }
    }

    // 古いトラック情報を削除（1時間以上前）
    const oneHourAgo = now - (60 * 60 * 1000)
    for (const [id, track] of this.trackVectorStore.entries()) {
      if (track.timestamp < oneHourAgo) {
        this.trackVectorStore.delete(id)
      }
    }

    console.log('RAGSystem: Cleanup completed')
  }

  // 統計情報の取得
  getStats() {
    return {
      musicKnowledgeCount: this.musicKnowledgeBase.size,
      chordProgressionCount: this.chordProgressionLibrary.size,
      trackVectorCount: this.trackVectorStore.size,
      searchCacheCount: this.searchCache.size
    }
  }
}

export default RAGSystem 