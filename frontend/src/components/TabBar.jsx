import { useState, useRef, useEffect, memo } from 'react'
import { Button } from './ui/button.jsx'
import { UNIFIED_TRACK_TYPES } from '../data/trackTypes.js'
import {
  Plus,
  X,
  Piano,
  Music,
  Drum,
  Mic,
  Headphones,
  Zap
} from 'lucide-react'

const TabBar = ({
  tabs,
  activeTab,
  setActiveTab,
  closeTab,
  showTrackMenu,
  setShowTrackMenu,
  addNewTab
}) => {

  // タブタイトルに番号を付ける関数
  const getDisplayTitle = (tab, index) => {
    const sameTitleTabs = tabs.filter(t => t.title === tab.title)

    if (sameTitleTabs.length > 1) {
      const sameTypeIndex = sameTitleTabs.findIndex(t => t.id === tab.id) + 1

      // 楽器タイプ別の短縮記号
      const shortNames = {
        'Piano Track': 'P',
        'Drum Track': 'D',
        'Drums Track': 'Dr',
        'Bass Track': 'B',
        'Arrangement': 'Arr'
      }

      const shortName = shortNames[tab.title] || tab.title.charAt(0)
      return `${tab.title} ${shortName}${sameTypeIndex}`
    }

    return tab.title
  }
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollStartX, setScrollStartX] = useState(0)
  const [scrollStartScrollLeft, setScrollStartScrollLeft] = useState(0)
  const tabBarRef = useRef(null)

  const handleTrackMenuToggle = (event) => {
    if (!showTrackMenu) {
      // ボタンの位置を取得
      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      const menuWidth = 256 // w-64 = 16rem = 256px
      
      // メニューが画面右端を超える場合は左に調整
      let left = rect.left
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 16 // 16pxの余白
      }
      
      setMenuPosition({
        top: rect.bottom + 8, // ボタンの下に8pxの余白
        left: Math.max(16, left) // 最低16pxの余白を確保
      })
    }
    setShowTrackMenu(!showTrackMenu)
  }

  // マウスホイールでのスクロール
  const handleWheel = (e) => {
    if (tabBarRef.current) {
      try {
        e.preventDefault()
        e.stopPropagation()
        tabBarRef.current.scrollLeft += e.deltaY
      } catch (error) {
        // preventDefaultエラーを無視
      }
    }
  }

  // マウスダウン（ドラッグ開始）
  const handleMouseDown = (e) => {
    if (e.button === 1) { // ミドルクリック
      e.preventDefault()
      e.stopPropagation()
      setIsScrolling(true)
      setScrollStartX(e.clientX)
      setScrollStartScrollLeft(tabBarRef.current?.scrollLeft || 0)
    }
  }

  // マウス移動（ドラッグ中）
  const handleMouseMove = (e) => {
    if (isScrolling && tabBarRef.current) {
      e.preventDefault()
      e.stopPropagation()
      const deltaX = e.clientX - scrollStartX
      tabBarRef.current.scrollLeft = scrollStartScrollLeft - deltaX
    }
  }

  // マウスアップ（ドラッグ終了）
  const handleMouseUp = () => {
    setIsScrolling(false)
  }

  // アクティブタブを表示範囲内にスクロール
  useEffect(() => {
    if (tabBarRef.current && activeTab) {
      const activeTabElement = tabBarRef.current.querySelector(`[data-tab-id="${activeTab}"]`)
      if (activeTabElement) {
        const tabRect = activeTabElement.getBoundingClientRect()
        const containerRect = tabBarRef.current.getBoundingClientRect()

        if (tabRect.left < containerRect.left) {
          // 左側にはみ出している場合
          tabBarRef.current.scrollLeft -= (containerRect.left - tabRect.left) + 20
        } else if (tabRect.right > containerRect.right) {
          // 右側にはみ出している場合
          tabBarRef.current.scrollLeft += (tabRect.right - containerRect.right) + 20
        }
      }
    }
  }, [activeTab])

  // アクティブタブにフォーカスを設定
  useEffect(() => {
    if (tabBarRef.current && activeTab) {
      const activeTabElement = tabBarRef.current.querySelector(`[data-tab-id="${activeTab}"]`)
      if (activeTabElement && document.activeElement !== activeTabElement) {
        // 他の要素にフォーカスが当たっていない場合のみ設定
        if (document.activeElement === document.body ||
            !document.activeElement ||
            !document.activeElement.closest('.tab-scroll-container')) {
          activeTabElement.focus()
          console.error('❗❗❗ AUTO FOCUS DEBUG: Focused on active tab:', activeTab, '❗❗❗')
        }
      }
    }
  }, [activeTab])

  // グローバルマウスイベントリスナーを追加
  useEffect(() => {
    // Piano trackクリック問題診断用のグローバルクリックリスナー
    const handleGlobalClick = (e) => {
      const isTabBarElement = e.target.closest('.tab-scroll-container') ||
                             e.target.closest('[data-tab-id]') ||
                             e.target.closest('[data-track-menu-trigger]')

      if (isTabBarElement) {
        console.error('🌍🌍🌍 GLOBAL CLICK DEBUG: TabBar element clicked, target:', e.target.tagName, 'class:', e.target.className, '🌍🌍🌍')
        console.error('🌍🌍🌍 GLOBAL CLICK DEBUG: Event details - currentTarget:', e.currentTarget.tagName, 'bubbles:', e.bubbles, 'cancelable:', e.cancelable, '🌍🌍🌍')
        console.error('🌍🌍🌍 GLOBAL CLICK DEBUG: Event path length:', e.composedPath ? e.composedPath().length : 'N/A', '🌍🌍🌍')

        // イベントが適切に伝播しているかチェック
        if (e.target.hasAttribute('data-tab-id')) {
          const tabId = e.target.getAttribute('data-tab-id')
          console.error('🌍🌍🌍 GLOBAL CLICK DEBUG: Direct tab button clicked, ID:', tabId, '🌍🌍🌍')

          // タブボタンの詳細状態チェック
          const computedStyle = window.getComputedStyle(e.target)
          console.error('🌍🌍🌍 GLOBAL CLICK DEBUG: Tab button CSS - pointerEvents:', computedStyle.pointerEvents, 'display:', computedStyle.display, 'visibility:', computedStyle.visibility, '🌍🌍🌍')
          console.error('🌍🌍🌍 GLOBAL CLICK DEBUG: Tab button disabled:', e.target.disabled, 'hidden:', e.target.hidden, '🌍🌍🌍')
        } else if (e.target.closest('[data-tab-id]')) {
          const parentTab = e.target.closest('[data-tab-id]')
          const tabId = parentTab.getAttribute('data-tab-id')
          console.error('🌍🌍🌍 GLOBAL CLICK DEBUG: Child element clicked, parent tab ID:', tabId, '🌍🌍🌍')
          console.error('🌍🌍🌍 GLOBAL CLICK DEBUG: Clicked element:', e.target.tagName, 'class:', e.target.className, '🌍🌍🌍')
        }
      }
    }

    const handleGlobalMouseMove = (e) => {
      if (isScrolling && tabBarRef.current) {
        e.preventDefault()
        const deltaX = e.clientX - scrollStartX
        tabBarRef.current.scrollLeft = scrollStartScrollLeft - deltaX
      }
    }

    const handleGlobalMouseUp = () => {
      setIsScrolling(false)
    }

    const handleKeyDown = (e) => {
      // 新しいボタンベースのイベントハンドラーを使用するため、
      // Tab キーの処理はコメントアウト
      // （個別のボタンのonKeyDownで処理される）

      if (tabBarRef.current) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          tabBarRef.current.scrollLeft -= 100
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          tabBarRef.current.scrollLeft += 100
        }
      }
    }

    if (isScrolling) {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false })
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    // キーボードショートカットを追加
    document.addEventListener('keydown', handleKeyDown)

    // グローバルクリック診断リスナーを追加
    document.addEventListener('click', handleGlobalClick, true) // capture=true で早期キャプチャ

    // 最も低レベルのマウスイベント診断
    const handleMouseDown = (e) => {
      const isTabBarElement = e.target.closest('.tab-scroll-container') ||
                             e.target.closest('[data-tab-id]') ||
                             e.target.closest('[data-track-menu-trigger]')
      if (isTabBarElement) {
        console.error('⚡⚡⚡ RAW MOUSEDOWN: TabBar mousedown detected, target:', e.target.tagName, '⚡⚡⚡')
      }
    }

    const handleMouseUp = (e) => {
      const isTabBarElement = e.target.closest('.tab-scroll-container') ||
                             e.target.closest('[data-tab-id]') ||
                             e.target.closest('[data-track-menu-trigger]')
      if (isTabBarElement) {
        console.error('⚡⚡⚡ RAW MOUSEUP: TabBar mouseup detected, target:', e.target.tagName, '⚡⚡⚡')
      }
    }

    document.addEventListener('mousedown', handleMouseDown, true)
    document.addEventListener('mouseup', handleMouseUp, true)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', handleGlobalClick, true)
      document.removeEventListener('mousedown', handleMouseDown, true)
      document.removeEventListener('mouseup', handleMouseUp, true)
    }
  }, [isScrolling, scrollStartX, scrollStartScrollLeft, tabs, activeTab, setActiveTab])
  return (
    <div 
      ref={tabBarRef}
      className="bg-gray-800/50 border-b border-gray-700/50 px-3 py-1 flex items-center space-x-1 overflow-x-auto scrollbar-hide tab-scroll-container relative"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseEnter={(e) => e.stopPropagation()}
      style={{ 
        cursor: isScrolling ? 'grabbing' : 'default',
        userSelect: isScrolling ? 'none' : 'auto',
        maxHeight: '40px', // 60pxから40pxに削減
        width: '100%',
        minWidth: '0'
      }}
    >
      {tabs.map((tab) => (
        <div key={tab.id} className="flex items-center flex-shrink-0">
                      <Button
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              className={`text-sm whitespace-nowrap max-w-32 truncate h-8 px-3 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
              data-tab-id={tab.id}
              onClick={(e) => {
                const displayTitle = getDisplayTitle(tab, tabs.indexOf(tab))
                console.error('🚨🚨🚨 TAB CLICK DEBUG: Clicked tab:', displayTitle, 'ID:', tab.id, '🚨🚨🚨')
                console.error('🚨🚨🚨 TAB CLICK DEBUG: Current activeTab:', activeTab, '🚨🚨🚨')
                console.error('🚨🚨🚨 TAB CLICK DEBUG: Event target:', e.target.tagName, '🚨🚨🚨')
                console.error('🚨🚨🚨 TAB CLICK DEBUG: Event currentTarget:', e.currentTarget.tagName, '🚨🚨🚨')
                console.error('🚨🚨🚨 TAB CLICK DEBUG: Event timestamp:', Date.now(), '🚨🚨🚨')
                console.error('🚨🚨🚨 TAB CLICK DEBUG: All tabs:')
                tabs.forEach((t, i) => {
                  const tDisplayTitle = getDisplayTitle(t, i)
                  console.error(`  [${i}]: ${tDisplayTitle} (ID: ${t.id}) ${t.id === activeTab ? '← ACTIVE' : ''}`)
                })

                console.error('🚨🚨🚨 TAB CLICK DEBUG: Before setActiveTab, activeTab was:', activeTab, '🚨🚨🚨')
                setActiveTab(tab.id)
                console.error('🚨🚨🚨 TAB CLICK DEBUG: After setActiveTab called with:', tab.id, '🚨🚨🚨')

                // クリック後、ボタンに確実にフォーカスを設定
                e.currentTarget.focus()
                console.error('🚨🚨🚨 TAB CLICK DEBUG: Focused on tab:', displayTitle, '🚨🚨🚨')

                // setActiveTabが実際に変更されたかを確認
                setTimeout(() => {
                  console.error('🚨🚨🚨 TAB CLICK DEBUG: After timeout, activeTab is now:', activeTab, '🚨🚨🚨')
                }, 100)
              }}
              title={tab.title}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault()
                  const displayTitle = getDisplayTitle(tab, tabs.indexOf(tab))
                  console.error('❗❗❗ BUTTON TABBAR DEBUG: Tab key pressed on button:', displayTitle, 'ID:', tab.id, '❗❗❗')
                  console.error('❗❗❗ BUTTON TABBAR DEBUG: Current activeTab:', activeTab, '❗❗❗')
                  console.error('❗❗❗ BUTTON TABBAR DEBUG: All tabs:')
                  tabs.forEach((t, i) => {
                    const tDisplayTitle = getDisplayTitle(t, i)
                    console.error(`  [${i}]: ${tDisplayTitle} (ID: ${t.id}) ${t.id === activeTab ? '← ACTIVE' : ''}`)
                  })

                  const currentIndex = tabs.findIndex(t => t.id === activeTab)
                  console.error('❗❗❗ BUTTON TABBAR DEBUG: Current index:', currentIndex, '❗❗❗')

                  let nextIndex
                  if (e.shiftKey) {
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
                  } else {
                    nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
                  }

                  console.error('❗❗❗ BUTTON TABBAR DEBUG: Next index:', nextIndex, '❗❗❗')

                  const nextTab = tabs[nextIndex]
                  if (nextTab) {
                    const nextDisplayTitle = getDisplayTitle(nextTab, nextIndex)
                    console.error('❗❗❗ BUTTON TABBAR DEBUG: Switching to tab:', nextDisplayTitle, 'ID:', nextTab.id, '❗❗❗')
                    setActiveTab(nextTab.id)

                    setTimeout(() => {
                      const nextTabButton = tabBarRef.current?.querySelector(`[data-tab-id="${nextTab.id}"]`)
                      if (nextTabButton) {
                        nextTabButton.focus()
                      }
                    }, 10)
                  } else {
                    console.error('❗❗❗ BUTTON TABBAR DEBUG: ERROR - nextTab is null! ❗❗❗')
                  }
                }
              }}
            >
              {tab.type === 'midi_editor' && <Piano className="h-4 w-4 mr-2 flex-shrink-0" />}
              {tab.type === 'drum_track' && <Drum className="h-4 w-4 mr-2 flex-shrink-0" />}
              {tab.type === 'diffsinger_track' && <Mic className="h-4 w-4 mr-2 flex-shrink-0" />}
              {tab.type === 'arrangement' && <Music className="h-4 w-4 mr-2 flex-shrink-0" />}
              <span className="truncate">{getDisplayTitle(tab, tabs.indexOf(tab))}</span>
            </Button>
            {tabs.length > 1 && tab.isClosable && (
              <button
                className="ml-1 p-1 h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center rounded transition-colors flex-shrink-0"
                onClick={() => closeTab(tab.id)}
              >
                <X className="h-4 w-4" />
              </button>
            )}
        </div>
      ))}
      
      <div className="relative flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-gray-700 ml-1 h-8 w-8 p-0"
          data-track-menu-trigger
          onClick={handleTrackMenuToggle}
        >
          <Plus className="h-4 w-4" />
        </Button>
        
        {showTrackMenu && (
          <div
            className="track-menu-container fixed w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-2xl z-20 overflow-hidden"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`
            }}
          >
            <div className="py-2">
              {UNIFIED_TRACK_TYPES.map((trackType) => {
                const IconComponent = trackType.icon
                return (
                  <button
                    key={trackType.id}
                    className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 flex items-center group"
                    onClick={() => {
                      // 統一トラックタイプのIDを使用してタブを追加
                      addNewTab(trackType.tabType, trackType.id)
                      setShowTrackMenu(false)
                    }}
                  >
                    <div className={`w-10 h-10 rounded-lg ${trackType.color} flex items-center justify-center mr-3 group-hover:opacity-80 transition-colors`}>
                      <IconComponent className={`h-5 w-5 ${trackType.iconColor}`} />
                    </div>
                    <div>
                      <div className="font-medium">{trackType.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{trackType.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(TabBar)

