/**
 * 開発・デバッグツール関連のカスタムフック
 * 開発時のグローバルオブジェクト公開、フレームレート監視、パフォーマンス監視を管理
 */

import { useEffect } from 'react'
import frameRateMonitor from '../utils/frameRateMonitor.js'
import performanceMonitor from '../utils/performanceMonitor.js'
import virtualizationManager from '../utils/virtualization.js'

/**
 * 開発環境でのデバッグツールを初期化するフック
 * @param {Object} managers - 公開するマネージャーオブジェクト
 */
export const useDevTools = (managers = {}) => {
  const {
    appSettingsManager,
    eventHandlersManager,
    projectManager
  } = managers

  // 開発時のみグローバルに公開（E2Eテスト用）
  useEffect(() => {
    if (import.meta.env.DEV) {
      // マネージャーのグローバル公開
      if (appSettingsManager) {
        window.appSettingsManager = appSettingsManager
        console.log('🔧 AppSettingsManager グローバル公開 (開発モード)')
      }

      if (eventHandlersManager) {
        window.eventHandlersManager = eventHandlersManager
        console.log('🔧 EventHandlersManager グローバル公開 (開発モード)')
      }
    }

    return () => {
      if (import.meta.env.DEV) {
        delete window.appSettingsManager
        delete window.eventHandlersManager
      }
    }
  }, [appSettingsManager, eventHandlersManager])

  // システムコンポーネントのグローバル公開
  useEffect(() => {
    if (projectManager) {
      window.projectManager = projectManager
    }

    if (eventHandlersManager?.updateProjectState) {
      window.updateProjectState = eventHandlersManager.updateProjectState
    }

    window.frameRateMonitor = frameRateMonitor
    window.performanceMonitor = performanceMonitor
    window.virtualizationManager = virtualizationManager

    return () => {
      // クリーンアップ
      delete window.projectManager
      delete window.updateProjectState
      delete window.frameRateMonitor
      delete window.performanceMonitor
      delete window.virtualizationManager
    }
  }, [projectManager, eventHandlersManager])

  // フレームレート監視（開発環境のみ）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      frameRateMonitor.start()

      // 低FPS警告のハンドラー（閾値を下げる）
      const handleLowFPS = (fps) => {
        if (fps < 30) { // 閾値を30fpsに下げる
          console.warn(`⚠️ 低FPS検出: ${fps}fps`)
          performanceMonitor.logPerformanceIssue('low_fps', { fps, timestamp: Date.now() })
        }
      }

      frameRateMonitor.onLowFPS = handleLowFPS

      return () => {
        frameRateMonitor.stop()
        frameRateMonitor.onLowFPS = null
      }
    }
  }, [])

  return {
    frameRateMonitor,
    performanceMonitor,
    virtualizationManager
  }
}

/**
 * パフォーマンス監視専用フック
 */
export const usePerformanceMonitoring = () => {
  useEffect(() => {
    // パフォーマンス監視を開始
    performanceMonitor.start()

    // メモリ使用量の定期チェック
    const memoryCheckInterval = setInterval(() => {
      if (performance.memory) {
        const memoryInfo = {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        }

        // メモリ使用量が80%を超えた場合の警告
        if (memoryInfo.used / memoryInfo.limit > 0.8) {
          console.warn('⚠️ 高メモリ使用量検出:', memoryInfo)
          performanceMonitor.logPerformanceIssue('high_memory', memoryInfo)
        }
      }
    }, 30000) // 30秒ごとにチェック

    return () => {
      performanceMonitor.stop()
      clearInterval(memoryCheckInterval)
    }
  }, [])

  return { performanceMonitor }
}

/**
 * 開発時のコンソール出力管理フック
 */
export const useDevConsole = () => {
  useEffect(() => {
    if (import.meta.env.DEV) {
      // 開発モードの開始ログ
      console.log('🚀 DAWAI Development Mode Started')
      console.log('🔧 Developer Tools Available:')
      console.log('  - window.appSettingsManager')
      console.log('  - window.eventHandlersManager')
      console.log('  - window.projectManager')
      console.log('  - window.frameRateMonitor')
      console.log('  - window.performanceMonitor')
      console.log('  - window.virtualizationManager')
    }
  }, [])
}

export default useDevTools