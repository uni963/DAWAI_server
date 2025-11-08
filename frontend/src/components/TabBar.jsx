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
  Headphones
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

  // デバッグ: TabBarの再レンダリングとactiveTab状態を監視
  console.log('🎨🎨🎨 TABBAR RENDER: activeTab =', activeTab, 'tabs =', tabs.map(t => t.id))
  console.log('🎨🎨🎨 TABBAR RENDER: tabs count =', tabs.length, 'tabs array =', tabs)
  console.log('🎨🎨🎨 TABBAR RENDER: timestamp =', new Date().toISOString())


  // タブタイトルに番号を付ける関数
  const getDisplayTitle = (tab, index) => {
    const sameTitleTabs = tabs.filter(t => t.title === tab.title)

    if (sameTitleTabs.length > 1) {
      const sameTypeIndex = sameTitleTabs.findIndex(t => t.id === tab.id) + 1

      // 楽器タイプ別の短縮記号
      const shortNames = {
        'Piano Track': 'P',
        'Drums Track': 'D',
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

  // アクティブタブにフォーカスを設定 - コメントアウト
  // tabIndex={-1}に変更したため、自動フォーカスは不要
  // useEffect(() => {
  //   if (tabBarRef.current && activeTab) {
  //     const activeTabElement = tabBarRef.current.querySelector(`[data-tab-id="${activeTab}"]`)
  //     if (activeTabElement && document.activeElement !== activeTabElement) {
  //       // 他の要素にフォーカスが当たっていない場合のみ設定
  //       if (document.activeElement === document.body ||
  //           !document.activeElement ||
  //           !document.activeElement.closest('.tab-scroll-container')) {
  //         activeTabElement.focus()
  //       }
  //     }
  //   }
  // }, [activeTab])

  // グローバルマウスイベントリスナーを追加
  useEffect(() => {
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
      // 矢印キーの強制処理（最優先）
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        console.log('🔄 強制矢印キー処理:', e.key)
        e.preventDefault()
        e.stopPropagation() // 他のイベントリスナーをブロック

        const focusedElement = document.activeElement
        const isTabButtonFocused = focusedElement && focusedElement.hasAttribute('data-tab-id')

        if (isTabButtonFocused || tabs.length > 1) {
          // タブ移動を実行
          const currentIndex = tabs.findIndex(t => t.id === activeTab)
          let nextIndex

          if (e.key === 'ArrowLeft') {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
          } else {
            nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
          }

          const nextTab = tabs[nextIndex]
          if (nextTab) {
            console.log('🔄 タブ切り替え:', activeTab, '→', nextTab.id)
            setActiveTab(nextTab.id)

            // フォーカスを強制的に新しいタブに移動
            setTimeout(() => {
              const nextTabButton = tabBarRef.current?.querySelector(`[data-tab-id="${nextTab.id}"]`)
              if (nextTabButton) {
                nextTabButton.focus()
                console.log('🔄 新しいタブにフォーカス設定:', nextTab.id)
              }
            }, 10)
          }
        } else if (tabBarRef.current) {
          // タブが1つの場合はスクロール
          if (e.key === 'ArrowLeft') {
            tabBarRef.current.scrollLeft -= 100
          } else {
            tabBarRef.current.scrollLeft += 100
          }
        }

        return // 他の処理をスキップ
      }
    }

    if (isScrolling) {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false })
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    // キーボードショートカットを追加
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
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
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        console.log(`🎨 TABBAR TAB RENDER: ${tab.id} isActive=${isActive} (activeTab=${activeTab})`)

        return (
        <div key={tab.id} className="flex items-center flex-shrink-0">
                      <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={`text-sm whitespace-nowrap max-w-32 truncate h-8 px-3 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
              data-tab-id={tab.id}
              onClick={(e) => {
                console.log('🚀🚀🚀 TABBAR ONCLICK HANDLER CALLED!!! Tab:', tab.id, 'current active:', activeTab)
                console.log('🔧 TAB CLICK: ', tab.id, 'current active:', activeTab)

                // MIDIエディターのフォーカスを強制的に解除
                const midiEditor = document.querySelector('.midi-editor-container') ||
                                  document.querySelector('[data-component="midi-editor"]')
                if (midiEditor && midiEditor.contains(document.activeElement)) {
                  document.activeElement.blur()
                  console.log('🔧 MIDIエディターフォーカスを解除')
                }

                console.log('🔥🔥🔥 TABBAR: About to call setActiveTab with:', tab.id)
                console.log('🔥🔥🔥 TABBAR: Current activeTab before setActiveTab:', activeTab)

                setActiveTab(tab.id)

                // クリック後、ボタンに確実にフォーカスを設定（複数回試行）
                if (e.currentTarget) {
                  e.currentTarget.focus()
                }
                setTimeout(() => {
                  if (e.currentTarget) {
                    e.currentTarget.focus()
                    console.log('🔧 タブボタンフォーカス強制設定:', tab.id)
                  }
                }, 10)

                console.log('🔧 TAB CLICK END: ', tab.id)
              }}
              title={tab.title}
              tabIndex={0}
            >
              {tab.type === 'midi_editor' && (
                <Piano
                  className="h-4 w-4 mr-2 flex-shrink-0"
                  onClick={(e) => {
                    console.log('🎹 PIANO ICON CLICK: イベントをButtonに伝播')
                    // e.stopPropagation() を削除してイベント伝播を許可
                  }}
                />
              )}
              {tab.type === 'drum_track' && (
                <Drum
                  className="h-4 w-4 mr-2 flex-shrink-0"
                  onClick={(e) => {
                    console.log('🥁 DRUM ICON CLICK: イベントをButtonに伝播')
                    // e.stopPropagation() を削除してイベント伝播を許可
                  }}
                />
              )}
              {tab.type === 'diffsinger_track' && (
                <Mic
                  className="h-4 w-4 mr-2 flex-shrink-0"
                  onClick={(e) => {
                    console.log('🎤 MIC ICON CLICK: イベントをButtonに伝播')
                    // e.stopPropagation() を削除してイベント伝播を許可
                  }}
                />
              )}
              {tab.type === 'arrangement' && (
                <Music
                  className="h-4 w-4 mr-2 flex-shrink-0"
                  onClick={(e) => {
                    console.log('🎵 MUSIC ICON CLICK: イベントをButtonに伝播')
                    // e.stopPropagation() を削除してイベント伝播を許可
                  }}
                />
              )}
              <span
                className="truncate"
                onClick={(e) => {
                  // SPANクリック時も親ボタンのonClickに伝播させる
                  // e.stopPropagation() を削除してイベント伝播を許可
                  console.log('🎯 SPAN CLICK: イベントをButtonに伝播')
                  // setActiveTab(tab.id) は親ButtonのonClickで処理される
                }}
              >
                {getDisplayTitle(tab, tabs.indexOf(tab))}
              </span>
            </Button>
            {tabs.length > 1 && tab.isClosable && (
              <button
                className="ml-1 p-1 h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center rounded transition-colors flex-shrink-0"
                onClick={() => closeTab(tab.id)}
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            )}
        </div>
        )
      })}
      
      <div className="relative flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-gray-700 ml-1 h-8 w-8 p-0"
          data-track-menu-trigger
          onClick={handleTrackMenuToggle}
          tabIndex={-1}
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

