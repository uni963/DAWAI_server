import { useCallback } from 'react'

const useTrackContextMenu = ({
  selectedTracks,
  setSelectedTracks,
  setLastSelectedTrack,
  handleCopyTracks,
  handleDeleteTracks,
  projectManager,
  forceRerenderApp,
  onTabChange
}) => {
  const showTrackContextMenu = useCallback((e, trackId) => {
    e.preventDefault()
    e.stopPropagation()
    
    const existingMenu = document.querySelector('.track-context-menu')
    if (existingMenu) {
      document.body.removeChild(existingMenu)
    }
    
    // クリックされたトラックが選択されていない場合は選択
    let currentSelectedTracks = selectedTracks || new Set()
    if (!(selectedTracks?.has(trackId) ?? false)) {
      currentSelectedTracks = new Set([trackId])
      if (typeof setSelectedTracks === 'function') {
        setSelectedTracks(currentSelectedTracks)
      }
      if (typeof setLastSelectedTrack === 'function') {
        setLastSelectedTrack(trackId)
      }
    }
    
    const currentSelectionCount = currentSelectedTracks.size
    
    // メニューの位置を調整（画面の端で切れないように）
    const menuWidth = 180
    const menuHeight = 160 // 概算
    const padding = 10
    
    let left = e.clientX
    let top = e.clientY
    
    // 右端で切れる場合
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding
    }
    
    // 下端で切れる場合
    if (top + menuHeight > window.innerHeight - padding) {
      top = window.innerHeight - menuHeight - padding
    }
    
    // 左端で切れる場合
    if (left < padding) {
      left = padding
    }
    
    // 上端で切れる場合
    if (top < padding) {
      top = padding
    }
    
    const menu = document.createElement('div')
    menu.className = 'track-context-menu'
    menu.tabIndex = -1
    
    menu.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      background: #1f2937;
      border: 1px solid #4b5563;
      border-radius: 8px;
      padding: 6px 0;
      z-index: 9999;
      font-size: 13px;
      color: #f9fafb;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
      min-width: 180px;
      display: block;
      visibility: visible;
      opacity: 0;
      pointer-events: auto;
      backdrop-filter: blur(8px);
      transform: scale(0.95);
      transition: opacity 0.15s ease, transform 0.15s ease;
    `
    
    menu.addEventListener('mousedown', e => e.preventDefault())
    menu.addEventListener('mouseup', e => e.preventDefault())
    menu.addEventListener('contextmenu', e => e.preventDefault())
    
    // アニメーション効果を適用
    requestAnimationFrame(() => {
      menu.style.opacity = '1'
      menu.style.transform = 'scale(1)'
    })
    
    // アイコン用のSVG
    const createIcon = (svgPath) => {
      const icon = document.createElement('span')
      icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>`
      icon.style.cssText = 'margin-right: 8px; opacity: 0.8;'
      return icon
    }
    
    const createMenuItem = (text, iconSvg, onClick, isDestructive = false, shortcut = null) => {
      const item = document.createElement('div')
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 500;
        ${isDestructive ? 'color: #ef4444;' : ''}
      `
      
      const leftContent = document.createElement('div')
      leftContent.style.cssText = 'display: flex; align-items: center;'
      
      const icon = createIcon(iconSvg)
      leftContent.appendChild(icon)
      
      const textSpan = document.createElement('span')
      textSpan.textContent = text
      leftContent.appendChild(textSpan)
      
      item.appendChild(leftContent)
      
      if (shortcut) {
        const shortcutSpan = document.createElement('span')
        shortcutSpan.textContent = shortcut
        shortcutSpan.style.cssText = `
          font-size: 11px;
          color: #9ca3af;
          font-weight: 400;
          margin-left: 12px;
        `
        item.appendChild(shortcutSpan)
      }
      
      item.onmouseenter = () => {
        item.style.background = isDestructive ? '#dc2626' : '#374151'
        item.style.color = isDestructive ? '#ffffff' : '#f9fafb'
      }
      item.onmouseleave = () => {
        item.style.background = 'transparent'
        item.style.color = isDestructive ? '#ef4444' : '#f9fafb'
      }
      item.onclick = onClick
      
      return item
    }
    
    const copyBtn = createMenuItem(
      currentSelectionCount > 1 ? `コピー (${currentSelectionCount}個)` : 'コピー',
      '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
      () => {
        handleCopyTracks()
        closeMenu()
      },
      false,
      'Ctrl+C'
    )
    
    const cutBtn = createMenuItem(
      currentSelectionCount > 1 ? `カット (${currentSelectionCount}個)` : 'カット',
      '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10h-6l-2 8h10l-2-8z"/>',
      () => {
        handleCopyTracks()
        handleDeleteTracks()
        closeMenu()
      },
      false,
      'Ctrl+X'
    )
    
    const deleteBtn = createMenuItem(
      currentSelectionCount > 1 ? `削除 (${currentSelectionCount}個)` : '削除',
      '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
      () => {
        handleDeleteTracks()
        closeMenu()
      },
      true, // destructive
      'Delete'
    )
    
    const openTabBtn = createMenuItem(
      currentSelectionCount > 1 ? `タブを開く (${currentSelectionCount}個)` : 'タブを開く',
      '<path d="M9 12l2 2 4-4"/><path d="M21 12c-1 0-2-1-2-2V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v5c0 1-1 2-2 2"/>',
      () => {
        // 現在の選択状態を使用してタブを開く
        if (currentSelectedTracks.size > 0) {
          // 最後に選択されたトラックのタブを開く（複数選択の場合は最後のトラック）
          const lastSelectedTrackId = Array.from(currentSelectedTracks).pop()
          
          if (projectManager) {
            const tabId = `tab-${lastSelectedTrackId}`
            
            // プロジェクトマネージャーの現在の状態を確認
            const currentProject = projectManager.getProject()
            
            // App.jsxのhandleTabChange関数を使用してタブを開く
            if (onTabChange) {
              onTabChange(tabId)
            } else {
              // フォールバック: 直接projectManagerを使用
              const success = projectManager.setActiveTab(tabId)
              
              // タブ切り替えが成功した場合、App.jsxの状態も更新
              if (success && forceRerenderApp) {
                forceRerenderApp()
              }
            }
          }
        }
        
        closeMenu()
      }
    )
    
    const closeMenu = (event) => {
      // eventがundefinedの場合や、event.targetが存在しない場合は安全に処理
      if (!event || !event.target || !menu.contains(event.target)) {
        const menuElement = document.querySelector('.track-context-menu')
        if (menuElement && document.body.contains(menuElement)) {
          // アニメーション効果を適用してから削除
          menuElement.style.opacity = '0'
          menuElement.style.transform = 'scale(0.95)'
          setTimeout(() => {
            if (document.body.contains(menuElement)) {
              document.body.removeChild(menuElement)
            }
          }, 150)
        }
        document.removeEventListener('click', closeMenu)
        document.removeEventListener('contextmenu', closeMenu)
        document.removeEventListener('keydown', handleEsc)
      }
    }
    
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        const menuElement = document.querySelector('.track-context-menu')
        if (menuElement && document.body.contains(menuElement)) {
          // アニメーション効果を適用してから削除
          menuElement.style.opacity = '0'
          menuElement.style.transform = 'scale(0.95)'
          setTimeout(() => {
            if (document.body.contains(menuElement)) {
              document.body.removeChild(menuElement)
            }
          }, 150)
        }
        document.removeEventListener('click', closeMenu)
        document.removeEventListener('contextmenu', closeMenu)
        document.removeEventListener('keydown', handleEsc)
      }
    }

    menu.appendChild(copyBtn)
    menu.appendChild(cutBtn)
    menu.appendChild(deleteBtn)
    menu.appendChild(openTabBtn)
    document.body.appendChild(menu)
    menu.focus()
    
    document.addEventListener('click', closeMenu)
    document.addEventListener('contextmenu', closeMenu)
    document.addEventListener('keydown', handleEsc)
  }, [selectedTracks, handleCopyTracks, handleDeleteTracks, projectManager, forceRerenderApp, onTabChange, setSelectedTracks, setLastSelectedTrack])

  return { showTrackContextMenu }
}

export default useTrackContextMenu 