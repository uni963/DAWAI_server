// Memory Manager - 階層的メモリ管理システム
class MemoryManager {
  constructor() {
    // メモリ階層
    this.shortTermMemory = [] // 短期メモリ（生データ）
    this.longTermMemory = [] // 長期メモリ（要約データ）
    this.vectorMemory = new Map() // ベクトル化メモリ（検索用）
    
    // 設定
    this.maxShortTermItems = 50 // 短期メモリの最大アイテム数
    this.maxLongTermItems = 100 // 長期メモリの最大アイテム数
    this.summarizationThreshold = 10 // 要約の閾値（アイテム数）
    this.maxTokensPerMemory = 500 // メモリアイテムあたりの最大トークン数
    
    // セッション管理
    this.currentSessionId = null
    this.sessionStartTime = null
    
    // 要約キャッシュ
    this.summaryCache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5分
    
    // リスナー
    this.listeners = []
  }

  // セッション開始
  startSession(sessionId = null) {
    this.currentSessionId = sessionId || `session_${Date.now()}`
    this.sessionStartTime = Date.now()
    this.shortTermMemory = []
    console.log(`MemoryManager: Session started: ${this.currentSessionId}`)
  }

  // セッション終了時の要約処理
  async endSession() {
    if (this.shortTermMemory.length > 0) {
      console.log(`MemoryManager: Summarizing session with ${this.shortTermMemory.length} items`)
      await this.summarizeSession()
    }
    
    this.currentSessionId = null
    this.sessionStartTime = null
    console.log('MemoryManager: Session ended and summarized')
  }

  // 短期メモリに追加
  addToShortTermMemory(item) {
    const memoryItem = {
      id: `stm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: item,
      timestamp: Date.now(),
      type: item.type || 'conversation',
      importance: item.importance || 0.5,
      sessionId: this.currentSessionId
    }

    this.shortTermMemory.push(memoryItem)
    
    // サイズ制限
    if (this.shortTermMemory.length > this.maxShortTermItems) {
      this.shortTermMemory.shift()
    }

    console.log(`MemoryManager: Added to short-term memory: ${memoryItem.id}`)
    this.notifyListeners('memoryAdded', { type: 'shortTerm', item: memoryItem })
  }

  // セッション要約の実行
  async summarizeSession() {
    if (this.shortTermMemory.length === 0) return

    try {
      // 重要度でソート
      const sortedItems = [...this.shortTermMemory].sort((a, b) => b.importance - a.importance)
      
      // 上位アイテムを選択（トークン制限を考慮）
      const selectedItems = this.selectItemsForSummary(sortedItems)
      
      // 要約プロンプトの生成
      const summaryPrompt = this.generateSummaryPrompt(selectedItems)
      
      // AIによる要約（実際のAPI呼び出しは外部で行う）
      const summary = await this.requestSummary(summaryPrompt)
      
      // 長期メモリに保存
      const longTermItem = {
        id: `ltm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: summary,
        timestamp: Date.now(),
        type: 'session_summary',
        importance: 0.8,
        sessionId: this.currentSessionId,
        originalItems: selectedItems.map(item => item.id),
        tokenCount: this.estimateTokenCount(summary)
      }

      this.longTermMemory.push(longTermItem)
      
      // サイズ制限
      if (this.longTermMemory.length > this.maxLongTermItems) {
        this.longTermMemory.shift()
      }

      // 短期メモリをクリア
      this.shortTermMemory = []
      
      console.log(`MemoryManager: Session summarized and stored in long-term memory: ${longTermItem.id}`)
      this.notifyListeners('sessionSummarized', { summary: longTermItem })
      
      return longTermItem

    } catch (error) {
      console.error('MemoryManager: Session summarization failed:', error)
      throw error
    }
  }

  // 要約用アイテム選択
  selectItemsForSummary(items) {
    let totalTokens = 0
    const selectedItems = []
    
    for (const item of items) {
      const itemTokens = this.estimateTokenCount(JSON.stringify(item.content))
      
      if (totalTokens + itemTokens <= this.maxTokensPerMemory * 3) { // 要約用に3倍の容量
        selectedItems.push(item)
        totalTokens += itemTokens
      } else {
        break
      }
    }
    
    return selectedItems
  }

  // 要約プロンプト生成
  generateSummaryPrompt(items) {
    const conversations = items
      .filter(item => item.type === 'conversation')
      .map(item => `- ${item.content.userMessage}: ${item.content.assistantResponse}`)
      .join('\n')

    const actions = items
      .filter(item => item.type === 'action')
      .map(item => `- ${item.content.action}: ${item.content.result}`)
      .join('\n')

    return `以下のセッション内容を要約してください。重要な情報のみを抽出し、ユーザーの質問や要求、実行された操作を中心にまとめてください。

【会話履歴】
${conversations}

【実行された操作】
${actions}

【要約のポイント】
1. ユーザーが何を求めていたか
2. どのような操作が実行されたか
3. 重要な発見や決定事項
4. 次回セッションで参考にすべき情報

簡潔で実用的な要約を作成してください。`
  }

  // 要約リクエスト（外部API呼び出し）
  async requestSummary(prompt) {
    try {
      // AIエンジンを使用して要約を実行
      const response = await fetch('/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: prompt,
          context: '',
          model: 'claude-3-sonnet', // 要約には軽量なモデルを使用
          apiKeys: {} // グローバル設定から取得
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.response || `セッション要約: ${prompt.substring(0, 200)}...`
      
    } catch (error) {
      console.error('MemoryManager: Summary request failed:', error)
      // フォールバック: 簡易的な要約
      return `セッション要約: ${prompt.substring(0, 200)}...`
    }
  }

  // 関連メモリの検索
  searchRelevantMemories(query, limit = 5) {
    const allMemories = [...this.shortTermMemory, ...this.longTermMemory]
    const relevantMemories = []

    // 簡易的なキーワードマッチング（実際はベクトル検索を使用）
    const queryLower = query.toLowerCase()
    
    for (const memory of allMemories) {
      const contentStr = JSON.stringify(memory.content).toLowerCase()
      const relevance = this.calculateRelevance(queryLower, contentStr)
      
      if (relevance > 0.3) { // 関連度閾値
        relevantMemories.push({
          ...memory,
          relevance
        })
      }
    }

    // 関連度でソートして上位を返す
    return relevantMemories
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
  }

  // 関連度計算（簡易版）
  calculateRelevance(query, content) {
    const queryWords = query.split(/\s+/)
    let matchCount = 0
    
    for (const word of queryWords) {
      if (word.length > 2 && content.includes(word)) {
        matchCount++
      }
    }
    
    return queryWords.length > 0 ? matchCount / queryWords.length : 0
  }

  // プロンプト用メモリの構築
  buildPromptMemory(query, maxTokens = 1000) {
    const relevantMemories = this.searchRelevantMemories(query)
    let totalTokens = 0
    const promptMemory = []

    for (const memory of relevantMemories) {
      const memoryStr = JSON.stringify(memory.content)
      const memoryTokens = this.estimateTokenCount(memoryStr)
      
      if (totalTokens + memoryTokens <= maxTokens) {
        promptMemory.push({
          content: memory.content,
          type: memory.type,
          relevance: memory.relevance,
          timestamp: memory.timestamp
        })
        totalTokens += memoryTokens
      } else {
        break
      }
    }

    return {
      memories: promptMemory,
      totalTokens,
      memoryCount: promptMemory.length
    }
  }

  // トークン数推定（簡易版）
  estimateTokenCount(text) {
    // 日本語と英語の混在を考慮した簡易推定
    const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    const otherChars = text.length - japaneseChars - englishWords
    
    // 日本語: 1文字 = 1トークン、英語: 1単語 = 1.3トークン、その他: 4文字 = 1トークン
    return japaneseChars + (englishWords * 1.3) + (otherChars / 4)
  }

  // メモリのクリーンアップ
  cleanup() {
    const now = Date.now()
    
    // 古いキャッシュを削除
    for (const [key, value] of this.summaryCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.summaryCache.delete(key)
      }
    }
    
    // 古いメモリを削除（30日以上前）
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
    this.longTermMemory = this.longTermMemory.filter(memory => 
      memory.timestamp > thirtyDaysAgo
    )
    
    console.log('MemoryManager: Cleanup completed')
  }

  // リスナー管理
  addListener(callback) {
    this.listeners.push(callback)
  }

  removeListener(callback) {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  notifyListeners(eventType, data) {
    this.listeners.forEach(callback => {
      try {
        callback(eventType, data)
      } catch (error) {
        console.error('MemoryManager: Listener error:', error)
      }
    })
  }

  // 統計情報の取得
  getStats() {
    return {
      shortTermCount: this.shortTermMemory.length,
      longTermCount: this.longTermMemory.length,
      vectorCount: this.vectorMemory.size,
      currentSessionId: this.currentSessionId,
      sessionDuration: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0
    }
  }

  // メモリのエクスポート/インポート
  exportMemory() {
    return {
      shortTermMemory: this.shortTermMemory,
      longTermMemory: this.longTermMemory,
      vectorMemory: Array.from(this.vectorMemory.entries()),
      timestamp: Date.now()
    }
  }

  importMemory(data) {
    if (data.shortTermMemory) {
      this.shortTermMemory = data.shortTermMemory
    }
    if (data.longTermMemory) {
      this.longTermMemory = data.longTermMemory
    }
    if (data.vectorMemory) {
      this.vectorMemory = new Map(data.vectorMemory)
    }
    
    console.log('MemoryManager: Memory imported successfully')
  }
}

export default MemoryManager 