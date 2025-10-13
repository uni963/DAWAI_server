/**
 * イベントハンドラー関連のカスタムフック
 * グローバルイベント、キーボードイベント、ページ離脱、外クリック処理などを管理
 */

import { useEffect, useCallback } from 'react'
import performanceMonitor from '../utils/performanceMonitor.js'

/**
 * グローバルエラーハンドリングフック
 */
export const useGlobalErrorHandler = () => {
  useEffect(() => {
    const handleGlobalError = (event) => {
      console.error('Global error caught:', event.error)

      // SelectItemの空文字列エラーは無視（UIの問題）
      if (event.error && event.error.message &&
          event.error.message.includes('SelectItem')) {
        return
      }

      // パフォーマンス監視にエラーを記録
      performanceMonitor.logError('global_error', event.error)

      // エラー詳細をコンソールに出力
      if (event.error && event.error.stack) {
        console.error('Stack trace:', event.error.stack)
      }
    }

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason)

      // パフォーマンス監視にエラーを記録
      performanceMonitor.logError('unhandled_rejection', event.reason)

      // デフォルトの動作を防ぐ
      event.preventDefault()
    }

    // グローバルエラーイベントリスナーを追加
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
}

/**
 * キーボードイベントハンドリングフック
 */
export const useKeyboardHandler = () => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Tab キー処理: Ghost Text補完機能
      if (event.key === 'Tab') {
        console.log('⌨️ Tab key pressed globally')

        // フォーム要素内では通常のTab動作を許可
        const target = event.target
        const isFormElement = target.matches('input, textarea, [contenteditable], select')

        if (!isFormElement) {
          // Ghost Text予測がある場合は補完を適用
          if (window.magentaGhostTextEngine &&
              window.magentaGhostTextEngine.isActive &&
              window.magentaGhostTextEngine.lastPredictions &&
              window.magentaGhostTextEngine.lastPredictions.length > 0) {

            event.preventDefault()
            event.stopPropagation()

            // カスタムイベントを発行してMIDIエディタに通知
            const acceptGhostTextEvent = new CustomEvent('accept-ghost-text-global', {
              detail: { shiftKey: event.shiftKey }
            })
            window.dispatchEvent(acceptGhostTextEvent)
            console.log('✅ Tab: Ghost Text補完イベント発行')
            return
          }
        }
      }

      // スペースキーが押された場合
      if (event.code === 'Space') {
        // フォーム要素やエディタ内でない場合のみ処理
        const target = event.target
        const isFormElement = target.matches('input, textarea, [contenteditable], select')

        if (!isFormElement) {
          event.preventDefault()

          // 統一された音声システムで再生/停止を切り替え
          if (window.unifiedAudioSystem && window.unifiedAudioSystem.isInitialized) {
            try {
              window.unifiedAudioSystem.togglePlayback()
              console.log('🎵 Space key: Toggle playback')
            } catch (error) {
              console.warn('⚠️ Failed to toggle playback:', error)
            }
          }
        }
      }

      // ESCキーでモーダルを閉じる
      if (event.code === 'Escape') {
        // カスタムイベントを発行してモーダルに通知
        const escapeEvent = new CustomEvent('escape-key-pressed')
        window.dispatchEvent(escapeEvent)
      }

      // Ctrl+S で保存
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault()

        // プロジェクト保存のカスタムイベントを発行
        const saveEvent = new CustomEvent('save-project')
        window.dispatchEvent(saveEvent)
        console.log('💾 Ctrl+S: Save project triggered')
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}

/**
 * ページ離脱前処理フック
 */
export const useBeforeUnloadHandler = (projectManager) => {
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (projectManager && projectManager.getProject()) {
        try {
          projectManager.saveToStorage()
          console.log('💾 Project data saved on page unload')
        } catch (error) {
          console.error('❌ Failed to save project data on unload:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [projectManager])
}

/**
 * 外クリック処理フック
 */
export const useOutsideClickHandler = (menuStates) => {
  const {
    showProjectMenu,
    setShowProjectMenu,
    showTrackMenu,
    setShowTrackMenu
  } = menuStates

  useEffect(() => {
    const handleClickOutside = (event) => {
      // プロジェクトメニューの外クリック
      if (showProjectMenu && !event.target.closest('.project-menu-container')) {
        setShowProjectMenu(false)
      }

      // トラックメニューの外クリック
      if (showTrackMenu &&
          !event.target.closest('.track-menu-container') &&
          !event.target.closest('[data-track-menu-trigger]')) {
        setShowTrackMenu(false)
      }

      // その他のモーダルやドロップダウンの外クリック処理
      const modalElements = document.querySelectorAll('.modal, .dropdown, .popover')
      modalElements.forEach(modal => {
        if (!modal.contains(event.target) && modal.classList.contains('open')) {
          modal.classList.remove('open')
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProjectMenu, setShowProjectMenu, showTrackMenu, setShowTrackMenu])
}

/**
 * プロジェクト読み込みイベントハンドリングフック
 */
export const useProjectLoadHandler = (projectManager, eventHandlersManager) => {
  useEffect(() => {
    const handleProjectLoaded = (event) => {
      const { project } = event.detail

      // プロジェクトマネージャーに新しいプロジェクトを設定
      if (project && projectManager) {
        try {
          projectManager.setProject(project)

          // 状態を更新
          if (eventHandlersManager?.updateProjectState) {
            eventHandlersManager.updateProjectState()
          }

          console.log('📁 Project loaded from event:', project.name || 'Untitled')
        } catch (error) {
          console.error('❌ Failed to load project from event:', error)
        }
      }
    }

    // カスタムプロジェクト読み込みイベントリスナー
    document.addEventListener('projectLoaded', handleProjectLoaded)

    return () => {
      document.removeEventListener('projectLoaded', handleProjectLoaded)
    }
  }, [projectManager, eventHandlersManager])
}

/**
 * 自動保存機能フック
 */
export const useAutoSave = (appSettings, projectManager) => {
  useEffect(() => {
    if (!appSettings || !projectManager) return

    const autoSaveInterval = appSettings.general?.autoSaveInterval
    const autoSaveEnabled = autoSaveInterval > 0

    if (!autoSaveEnabled) return

    console.log(`💾 自動保存機能有効: ${autoSaveInterval}ms間隔`)

    const intervalId = setInterval(() => {
      try {
        projectManager.saveToStorage()
        console.log('💾 自動保存実行')
      } catch (error) {
        console.error('❌ 自動保存エラー:', error)
      }
    }, autoSaveInterval)

    return () => {
      clearInterval(intervalId)
      console.log('💾 自動保存機能停止')
    }
  }, [appSettings, projectManager])
}

/**
 * 包括的イベントハンドラーフック
 * 全てのイベントハンドラーを統合管理
 */
export const useEventHandlers = (dependencies) => {
  const {
    projectManager,
    eventHandlersManager,
    appSettings,
    menuStates
  } = dependencies

  // 各種イベントハンドラーを初期化
  useGlobalErrorHandler()
  useKeyboardHandler()
  useBeforeUnloadHandler(projectManager)
  useOutsideClickHandler(menuStates)
  useProjectLoadHandler(projectManager, eventHandlersManager)
  useAutoSave(appSettings, projectManager)

  return {
    // 必要に応じてイベントハンドラーの状態や制御関数を返す
    handlersInitialized: true
  }
}

export default useEventHandlers