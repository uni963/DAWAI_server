// プロダクション対応ロガーシステム
// console.log の代替として使用

class Logger {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development'
    this.isDevelopment = this.environment === 'development'
    this.isProduction = this.environment === 'production'

    // ログレベル定義
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    }

    // 現在のログレベル（環境に応じて設定）
    this.currentLevel = this.isProduction ? this.levels.WARN : this.levels.DEBUG
  }

  // エラーログ（常に出力）
  error(message, ...args) {
    if (this.currentLevel >= this.levels.ERROR) {
      const timestamp = new Date().toISOString()
      const prefix = `[${timestamp}] [ERROR]`

      if (this.isProduction) {
        // 本番環境では構造化ログ
        console.error(JSON.stringify({
          level: 'ERROR',
          timestamp,
          message,
          args: args.length > 0 ? args : undefined
        }))
      } else {
        // 開発環境では読みやすい形式
        console.error(prefix, message, ...args)
      }
    }
  }

  // 警告ログ
  warn(message, ...args) {
    if (this.currentLevel >= this.levels.WARN) {
      const timestamp = new Date().toISOString()
      const prefix = `[${timestamp}] [WARN]`

      if (this.isProduction) {
        console.warn(JSON.stringify({
          level: 'WARN',
          timestamp,
          message,
          args: args.length > 0 ? args : undefined
        }))
      } else {
        console.warn(prefix, message, ...args)
      }
    }
  }

  // 情報ログ
  info(message, ...args) {
    if (this.currentLevel >= this.levels.INFO) {
      const timestamp = new Date().toISOString()
      const prefix = `[${timestamp}] [INFO]`

      if (this.isProduction) {
        // 本番環境では INFO ログは出力しない
        return
      } else {
        console.info(prefix, message, ...args)
      }
    }
  }

  // デバッグログ（開発環境のみ）
  debug(message, ...args) {
    if (this.currentLevel >= this.levels.DEBUG && this.isDevelopment) {
      const timestamp = new Date().toISOString()
      const prefix = `[${timestamp}] [DEBUG]`
      console.log(prefix, message, ...args)
    }
  }

  // 音声関連の専用ログ
  audio(message, ...args) {
    if (this.isDevelopment) {
      const timestamp = new Date().toISOString()
      const prefix = `[${timestamp}] [AUDIO]`
      console.log(`🎵 ${prefix}`, message, ...args)
    }
  }

  // AI関連の専用ログ
  ai(message, ...args) {
    if (this.isDevelopment) {
      const timestamp = new Date().toISOString()
      const prefix = `[${timestamp}] [AI]`
      console.log(`🤖 ${prefix}`, message, ...args)
    }
  }

  // MIDI関連の専用ログ
  midi(message, ...args) {
    if (this.isDevelopment) {
      const timestamp = new Date().toISOString()
      const prefix = `[${timestamp}] [MIDI]`
      console.log(`🎹 ${prefix}`, message, ...args)
    }
  }

  // プロジェクト管理関連の専用ログ
  project(message, ...args) {
    if (this.isDevelopment) {
      const timestamp = new Date().toISOString()
      const prefix = `[${timestamp}] [PROJECT]`
      console.log(`📁 ${prefix}`, message, ...args)
    }
  }

  // パフォーマンス測定用ログ
  performance(label, startTime = null) {
    if (this.isDevelopment) {
      const timestamp = new Date().toISOString()
      if (startTime) {
        const duration = performance.now() - startTime
        console.log(`⚡ [${timestamp}] [PERF] ${label}: ${duration.toFixed(2)}ms`)
        return duration
      } else {
        console.log(`⚡ [${timestamp}] [PERF] ${label}: start`)
        return performance.now()
      }
    }
    return startTime || performance.now()
  }

  // グループ化ログ（開発環境のみ）
  group(label, callback) {
    if (this.isDevelopment && typeof callback === 'function') {
      console.group(label)
      try {
        callback()
      } finally {
        console.groupEnd()
      }
    } else if (typeof callback === 'function') {
      callback()
    }
  }

  // テーブル形式ログ（開発環境のみ）
  table(data, columns = null) {
    if (this.isDevelopment && data) {
      if (columns) {
        console.table(data, columns)
      } else {
        console.table(data)
      }
    }
  }
}

// シングルトンインスタンス
const logger = new Logger()

// ヘルパー関数エクスポート
export const log = {
  error: (...args) => logger.error(...args),
  warn: (...args) => logger.warn(...args),
  info: (...args) => logger.info(...args),
  debug: (...args) => logger.debug(...args),
  audio: (...args) => logger.audio(...args),
  ai: (...args) => logger.ai(...args),
  midi: (...args) => logger.midi(...args),
  project: (...args) => logger.project(...args),
  performance: (...args) => logger.performance(...args),
  group: (...args) => logger.group(...args),
  table: (...args) => logger.table(...args)
}

export default logger