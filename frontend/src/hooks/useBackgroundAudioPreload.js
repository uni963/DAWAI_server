/**
 * バックグラウンド音声プリロードフック
 * ユーザーインタラクション後に自動的にピアノサンプルのプリロードを開始
 * ブラウザの自動再生ポリシーに対応
 */

import { useEffect, useRef, useCallback } from 'react'

export const useBackgroundAudioPreload = () => {
  const preloadInitiated = useRef(false)
  const userInteractionDetected = useRef(false)

  // ユーザーインタラクション検出
  const detectUserInteraction = useCallback(() => {
    if (userInteractionDetected.current || preloadInitiated.current) {
      return // 既に検出済みまたは開始済み
    }

    userInteractionDetected.current = true
    console.log('🎵 [BACKGROUND_PRELOAD] ユーザーインタラクション検出 - 音声システム初期化開始')

    // 短時間遅延後にプリロード開始（UIの応答性を保つため）
    setTimeout(async () => {
      await initiateBackgroundPreload()
    }, 100)
  }, [])

  // バックグラウンドプリロード開始
  const initiateBackgroundPreload = async () => {
    if (preloadInitiated.current) {
      console.log('🎵 [BACKGROUND_PRELOAD] 既にプリロード開始済み - スキップ')
      return
    }

    try {
      preloadInitiated.current = true
      console.log('🎵 [BACKGROUND_PRELOAD] バックグラウンドプリロード開始...')

      // 統一音声システムの初期化
      if (window.unifiedAudioSystem) {
        if (!window.unifiedAudioSystem.isInitialized) {
          console.log('🎵 [BACKGROUND_PRELOAD] unifiedAudioSystem初期化中...')

          const success = await window.unifiedAudioSystem.initialize()

          if (success) {
            console.log('✅ [BACKGROUND_PRELOAD] バックグラウンド音声システム初期化完了')

            // 初期化成功通知イベント発火
            window.dispatchEvent(new CustomEvent('backgroundAudioPreloadCompleted', {
              detail: {
                success: true,
                timestamp: Date.now(),
                preloadedSamples: window.unifiedAudioSystem.preloadedSamples?.size || 0
              }
            }))
          } else {
            console.warn('⚠️ [BACKGROUND_PRELOAD] 音声システム初期化に失敗')
          }
        } else {
          console.log('✅ [BACKGROUND_PRELOAD] 音声システムは既に初期化済み')
        }
      } else {
        console.warn('⚠️ [BACKGROUND_PRELOAD] unifiedAudioSystemが見つかりません')
      }
    } catch (error) {
      console.error('❌ [BACKGROUND_PRELOAD] プリロードエラー:', error)
    }
  }

  // ユーザーインタラクション監視設定
  useEffect(() => {
    if (preloadInitiated.current) {
      return // 既に開始済み
    }

    // 各種ユーザーインタラクションイベントを監視
    const interactionEvents = [
      'click',
      'keydown',
      'touchstart',
      'mousedown'
    ]

    // イベントリスナーを追加
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, detectUserInteraction, {
        once: true,  // 一回だけ実行
        passive: true
      })
    })

    console.log('🎵 [BACKGROUND_PRELOAD] ユーザーインタラクション監視開始')

    // クリーンアップ
    return () => {
      interactionEvents.forEach(eventType => {
        document.removeEventListener(eventType, detectUserInteraction)
      })
    }
  }, [detectUserInteraction])

  // 手動プリロード関数を提供（必要に応じて）
  const manualPreload = useCallback(async () => {
    if (!preloadInitiated.current) {
      userInteractionDetected.current = true
      await initiateBackgroundPreload()
    }
  }, [])

  return {
    preloadInitiated: preloadInitiated.current,
    userInteractionDetected: userInteractionDetected.current,
    manualPreload
  }
}

export default useBackgroundAudioPreload