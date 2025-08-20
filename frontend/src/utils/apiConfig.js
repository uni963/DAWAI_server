// DAWAI API設定
const API_CONFIG = {
  // 開発環境
  development: {
    baseURL: 'http://localhost:8001',
    ghostTextURL: 'http://localhost:8002',
    timeout: 30000,
    retries: 3
  },
  
  // 本番環境
  production: {
    baseURL: 'https://api.dawai.jp',
    ghostTextURL: 'https://api.dawai.jp/ghost-text',
    timeout: 60000,
    retries: 5
  }
}

// 現在の環境を判定
const isProduction = import.meta.env.PROD || window.location.hostname === 'dawai.jp'
const isSubDirectory = window.location.pathname.startsWith('/application')

// 使用する設定を取得
export const config = API_CONFIG[isProduction ? 'production' : 'development']

// APIエンドポイント
export const API_ENDPOINTS = {
  // チャット関連
  chat: `${config.baseURL}/api/chat`,
  streamChat: `${config.baseURL}/api/stream/chat`,
  
  // エージェント関連
  agent: `${config.baseURL}/api/agent`,
  streamAgent: `${config.baseURL}/api/stream/agent`,
  
  // 音楽生成
  generate: `${config.baseURL}/api/generate`,
  
  // ヘルスチェック
  health: `${config.baseURL}/api/health`,
  
  // Ghost Text
  ghostText: config.ghostTextURL
}

// リクエスト設定
export const requestConfig = {
  timeout: config.timeout,
  retries: config.retries,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

// エラーハンドリング
export const handleApiError = (error, context = '') => {
  console.error(`API Error [${context}]:`, error)
  
  if (error.response) {
    // サーバーからのエラーレスポンス
    const { status, data } = error.response
    switch (status) {
      case 401:
        return '認証エラー: APIキーを確認してください'
      case 403:
        return 'アクセス拒否: 権限を確認してください'
      case 404:
        return 'APIエンドポイントが見つかりません'
      case 429:
        return 'レート制限: しばらく待ってから再試行してください'
      case 500:
        return 'サーバーエラー: しばらく待ってから再試行してください'
      default:
        return `APIエラー (${status}): ${data?.message || error.message}`
    }
  } else if (error.request) {
    // ネットワークエラー
    return 'ネットワークエラー: サーバーに接続できません'
  } else {
    // その他のエラー
    return `エラー: ${error.message}`
  }
}

// リトライ機能付きAPI呼び出し
export const apiCall = async (endpoint, options = {}, retryCount = 0) => {
  try {
    const response = await fetch(endpoint, {
      ...requestConfig,
      ...options
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    if (retryCount < config.retries) {
      console.warn(`API call failed, retrying... (${retryCount + 1}/${config.retries})`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
      return apiCall(endpoint, options, retryCount + 1)
    }
    
    throw error
  }
}

// ストリーミングAPI呼び出し
export const streamApiCall = async (endpoint, options = {}, onChunk) => {
  try {
    const response = await fetch(endpoint, {
      ...requestConfig,
      ...options,
      headers: {
        ...requestConfig.headers,
        'Accept': 'text/event-stream'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data)
              onChunk(parsed)
            } catch (e) {
              console.warn('Failed to parse streaming data:', data)
            }
          }
        }
      }
    }
  } catch (error) {
    throw error
  }
}

export default {
  config,
  API_ENDPOINTS,
  requestConfig,
  handleApiError,
  apiCall,
  streamApiCall
} 