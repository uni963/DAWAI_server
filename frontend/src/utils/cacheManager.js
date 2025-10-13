// キャッシュ管理ユーティリティ
class CacheManager {
  constructor() {
    this.version = '1.0.0'
    this.cachePrefix = 'dawai_cache_'
    this.maxCacheSize = 10 * 1024 * 1024 // 10MB（設定のみなので小さく）
    this.cleanupInterval = 24 * 60 * 60 * 1000 // 24時間
  }

  // キャッシュをクリア
  clearAllCaches() {
    try {
      // localStorageのクリア（設定のみ保持）
      const keysToKeep = [
        'dawai_ai_settings',
        'dawai_general_settings',
        'dawai_ui_settings',
        'dawai_audio_settings',
        'dawai_midi_settings'
      ]
      
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && !keysToKeep.includes(key)) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })

      // sessionStorageのクリア
      sessionStorage.clear()

      // IndexedDBのクリア（もし使用している場合）
      this.clearIndexedDB()

      console.log('✅ All caches cleared successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to clear caches:', error)
      return false
    }
  }

  // IndexedDBのクリア
  async clearIndexedDB() {
    try {
      const databases = await window.indexedDB.databases()
      databases.forEach(db => {
        if (db.name && db.name.includes('dawai')) {
          window.indexedDB.deleteDatabase(db.name)
        }
      })
    } catch (error) {
      console.warn('IndexedDB clear failed:', error)
    }
  }

  // キャッシュサイズの監視
  getCacheSize() {
    let totalSize = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        totalSize += new Blob([key, value]).size
      }
    }
    return totalSize
  }

  // キャッシュサイズの制限チェック
  checkCacheSize() {
    const currentSize = this.getCacheSize()
    if (currentSize > this.maxCacheSize) {
      console.warn(`⚠️ Cache size (${this.formatBytes(currentSize)}) exceeds limit (${this.formatBytes(this.maxCacheSize)})`)
      this.cleanupOldCache()
    }
  }

  // 古いキャッシュのクリーンアップ
  cleanupOldCache() {
    try {
      const now = Date.now()
      const keysToRemove = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.cachePrefix)) {
          try {
            const value = JSON.parse(localStorage.getItem(key))
            if (value.timestamp && (now - value.timestamp) > this.cleanupInterval) {
              keysToRemove.push(key)
            }
          } catch (error) {
            // 無効なJSONの場合は削除
            keysToRemove.push(key)
          }
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        console.log(`🗑️ Removed old cache: ${key}`)
      })
      
      console.log(`✅ Cleaned up ${keysToRemove.length} old cache entries`)
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error)
    }
  }

  // キャッシュされたデータの保存
  setCachedData(key, data, ttl = 3600000) { // デフォルト1時間
    try {
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        ttl: ttl,
        version: this.version
      }
      
      localStorage.setItem(`${this.cachePrefix}${key}`, JSON.stringify(cacheData))
      this.checkCacheSize()
      return true
    } catch (error) {
      console.error('❌ Failed to set cached data:', error)
      return false
    }
  }

  // キャッシュされたデータの取得
  getCachedData(key) {
    try {
      const cached = localStorage.getItem(`${this.cachePrefix}${key}`)
      if (!cached) return null
      
      const cacheData = JSON.parse(cached)
      const now = Date.now()
      
      // TTLチェック
      if (cacheData.timestamp && (now - cacheData.timestamp) > cacheData.ttl) {
        localStorage.removeItem(`${this.cachePrefix}${key}`)
        return null
      }
      
      // バージョンチェック
      if (cacheData.version !== this.version) {
        localStorage.removeItem(`${this.cachePrefix}${key}`)
        return null
      }
      
      return cacheData.data
    } catch (error) {
      console.error('❌ Failed to get cached data:', error)
      return null
    }
  }

  // キャッシュの無効化
  invalidateCache(key) {
    try {
      localStorage.removeItem(`${this.cachePrefix}${key}`)
      return true
    } catch (error) {
      console.error('❌ Failed to invalidate cache:', error)
      return false
    }
  }

  // キャッシュ統計の取得
  getCacheStats() {
    const stats = {
      totalSize: this.getCacheSize(),
      itemCount: 0,
      cacheItems: []
    }
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.cachePrefix)) {
        stats.itemCount++
        const value = localStorage.getItem(key)
        const size = new Blob([key, value]).size
        stats.cacheItems.push({
          key: key.replace(this.cachePrefix, ''),
          size: size,
          age: Date.now() - JSON.parse(value).timestamp
        })
      }
    }
    
    return stats
  }

  // バイト数のフォーマット
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 開発モードでのキャッシュ無効化
  disableCacheForDevelopment() {
    if (import.meta.env.DEV) {
      // 開発時はキャッシュを無効化
      this.clearAllCaches()
      console.log('🔧 Development mode: Cache disabled')
    }
  }

  // ブラウザキャッシュのクリア
  clearBrowserCache() {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('dawai') || name.includes('vite')) {
            caches.delete(name)
            console.log(`🗑️ Cleared browser cache: ${name}`)
          }
        })
      })
    }
  }
}

// シングルトンインスタンス
const cacheManager = new CacheManager()

// 開発時の自動キャッシュ無効化
if (import.meta.env.DEV) {
  cacheManager.disableCacheForDevelopment()
}

export default cacheManager 