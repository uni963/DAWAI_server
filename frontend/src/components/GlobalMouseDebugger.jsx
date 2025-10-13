import { useEffect } from 'react'

const GlobalMouseDebugger = () => {
  useEffect(() => {
    let clickCount = 0

    const globalMouseHandler = (e) => {
      clickCount++
      console.log(`🌐🌐🌐 GLOBAL MOUSE ${clickCount}: ${e.type.toUpperCase()} on ${e.target.tagName}.${e.target.className}`)
      console.log(`🌐🌐🌐 GLOBAL MOUSE: Target:`, e.target)
      console.log(`🌐🌐🌐 GLOBAL MOUSE: Button:`, e.button, 'Buttons:', e.buttons)
      console.log(`🌐🌐🌐 GLOBAL MOUSE: Position:`, e.clientX, e.clientY)

      // TabBar関連要素のクリックを特別にログ
      const isTabBarRelated = e.target.closest('.tab-scroll-container') ||
                             e.target.closest('[data-tab-id]') ||
                             e.target.closest('[data-track-menu-trigger]') ||
                             e.target.hasAttribute('data-tab-id')

      if (isTabBarRelated) {
        console.log(`🎯🎯🎯 GLOBAL MOUSE: TABBAR ${e.type.toUpperCase()} DETECTED!!! Target:`, e.target.tagName, e.target.className)
        const tabId = e.target.getAttribute('data-tab-id') || e.target.closest('[data-tab-id]')?.getAttribute('data-tab-id')
        if (tabId) {
          console.log(`🎯🎯🎯 GLOBAL MOUSE: TAB ID:`, tabId)
        }

        // CLICKイベントの場合、より詳細な情報をログ
        if (e.type === 'click') {
          console.log(`🎯🔥🔥 GLOBAL MOUSE: CLICK EVENT FIRED!!! This should trigger TabBar onClick`)
          console.log(`🎯🔥🔥 GLOBAL MOUSE: Event detail:`, {
            type: e.type,
            target: e.target,
            currentTarget: e.currentTarget,
            bubbles: e.bubbles,
            cancelable: e.cancelable,
            defaultPrevented: e.defaultPrevented,
            isTrusted: e.isTrusted
          })
        }
      }

      // MIDIエディタ関連要素のクリックをログ
      const isMidiEditorRelated = e.target.closest('.midi-editor-container') ||
                                 e.target.closest('[data-component="midi-editor"]')

      if (isMidiEditorRelated) {
        console.log(`🎹🎹🎹 GLOBAL MOUSE: MIDI EDITOR CLICK DETECTED!!! Target:`, e.target.tagName, e.target.className)
      }

      // preventDefault/stopPropagationが呼ばれているかチェック
      const originalPreventDefault = e.preventDefault
      const originalStopPropagation = e.stopPropagation

      e.preventDefault = function() {
        console.log(`🛑🛑🛑 GLOBAL MOUSE: preventDefault() called on ${e.target.tagName}.${e.target.className}`)
        return originalPreventDefault.call(this)
      }

      e.stopPropagation = function() {
        console.log(`🛑🛑🛑 GLOBAL MOUSE: stopPropagation() called on ${e.target.tagName}.${e.target.className}`)
        return originalStopPropagation.call(this)
      }
    }

    // すべてのマウスイベントをキャプチャ（キャプチャフェーズ）
    document.addEventListener('mousedown', globalMouseHandler, true)
    document.addEventListener('mouseup', globalMouseHandler, true)
    document.addEventListener('click', globalMouseHandler, true)

    // バブリングフェーズもキャプチャ
    document.addEventListener('mousedown', globalMouseHandler, false)
    document.addEventListener('mouseup', globalMouseHandler, false)
    document.addEventListener('click', globalMouseHandler, false)

    console.log('🌐🌐🌐 GLOBAL MOUSE DEBUGGER: Installed global mouse event listeners')

    return () => {
      document.removeEventListener('mousedown', globalMouseHandler, true)
      document.removeEventListener('mouseup', globalMouseHandler, true)
      document.removeEventListener('click', globalMouseHandler, true)
      document.removeEventListener('mousedown', globalMouseHandler, false)
      document.removeEventListener('mouseup', globalMouseHandler, false)
      document.removeEventListener('click', globalMouseHandler, false)
      console.log('🌐🌐🌐 GLOBAL MOUSE DEBUGGER: Removed global mouse event listeners')
    }
  }, [])

  return null // このコンポーネントは何もレンダリングしない
}

export default GlobalMouseDebugger