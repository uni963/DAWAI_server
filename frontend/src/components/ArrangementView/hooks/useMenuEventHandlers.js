import { useCallback, useState, useRef, useEffect } from 'react'
import drumTrackManager from '../../../utils/drumTrackManager.js'
import { getTrackTypeById } from '../../../data/trackTypes.js'

export const useMenuEventHandlers = ({
  tracks,
  arrangementState,
  playbackState,
  projectManager,
  addNewTrack,
  forceRerenderApp,
  onTabChange,
  drumTrackManager
}) => {
  const {
    selectedTracks,
    setSelectedTracks,
    setLastSelectedTrack,
    clipboard,
    setClipboard
  } = arrangementState

  const {
    isPlaying
  } = playbackState

  const [showTrackMenu, setShowTrackMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef(null)

  // 空のエリアのコンテキストメニュー
  const showEmptyAreaContextMenu = useCallback((event) => {
    event.preventDefault()

    setMenuPosition({
      top: event.clientY,
      left: event.clientX
    })
    setShowTrackMenu(true)
  }, [])

  // トラックメニューの表示
  const handleTrackMenuToggle = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()

    const rect = event.currentTarget.getBoundingClientRect()
    setMenuPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    })
    setShowTrackMenu(true)
  }, [])

  // メニューを閉じる
  // 🚀 FIX: イベント引数なしで即座に閉じる機能を追加
  const closeMenu = useCallback((event) => {
    // イベントなしで呼ばれた場合は即座に閉じる
    if (!event) {
      console.log('🔧 [closeMenu] Force closing menu immediately')
      setShowTrackMenu(false)
      return
    }

    // イベントありの場合は従来の挙動（メニュー外側クリック判定）
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      console.log('🔧 [closeMenu] Closing menu (outside click)')
      setShowTrackMenu(false)
    }
  }, [])

  // ESCキーでメニューを閉じる
  const handleEsc = useCallback((event) => {
    if (event.key === 'Escape') {
      setShowTrackMenu(false)
    }
  }, [])

  // トラック追加
  const handleAddTrack = useCallback((trackTypeId) => {
    console.log('Menu: Adding track with type:', trackTypeId)

    // 統一トラックタイプから情報を取得
    const trackTypeInfo = getTrackTypeById(trackTypeId)
    if (!trackTypeInfo) {
      console.error('Unknown track type:', trackTypeId)
      return
    }

    console.log('Menu: Using unified track type:', trackTypeInfo.name)

    // ArrangementViewに留まるようにkeepInArrangement=trueを渡す
    addNewTrack(trackTypeInfo.type, trackTypeInfo.subtype, true)

    // メニューを閉じる
    setShowTrackMenu(false)
  }, [addNewTrack, setShowTrackMenu])

  // 選択されたトラックを開く
  const handleOpenSelectedTracks = useCallback(() => {
    if (!selectedTracks || selectedTracks.size === 0) return

    const selectedTrackData = tracks.filter(track => selectedTracks.has(track.id))

    // 最初の選択されたトラックを開く
    if (selectedTrackData.length > 0) {
      const track = selectedTrackData[0]
      console.log('🔍 Opening selected tracks:', selectedTrackData.length, 'track type:', track.subtype)

      // タブを開く処理
      if (onTabChange) {
        // ドラムトラックの場合は専用のタブを開く
        if (track.subtype === 'drums') {
          onTabChange(`drum-${track.id}`)
        } else {
          onTabChange(`tab-${track.id}`)
        }
      }
    }
  }, [tracks, selectedTracks, onTabChange])

  // トラック削除
  const handleDeleteTracks = useCallback(() => {
    if (!selectedTracks || selectedTracks.size === 0) return

    const selectedTrackData = tracks.filter(track => selectedTracks.has(track.id))

    // プロジェクトマネージャーから削除
    selectedTrackData.forEach(track => {
      // ドラムトラックの場合は、drumTrackManagerからも削除
      if (track.subtype === 'drums') {
        console.log('🥁 Deleting drum track from drumTrackManager:', track.id)
        // ドラムトラックが存在する場合のみ削除
        if (drumTrackManager.hasDrumTrack(track.id)) {
          drumTrackManager.deleteDrumTrack(track.id)
        } else {
          console.log('🥁 Drum track not found in manager, skipping deletion:', track.id)
        }
      }

      projectManager?.removeTrack(track.id)
    })

    // 選択をクリア
    setSelectedTracks(new Set())
    setLastSelectedTrack(null)

    // アプリ全体を再レンダリング（必要な場合のみ）
    // if (forceRerenderApp) {
    //   forceRerenderApp()
    // }

    console.log('🗑️ Deleted tracks:', selectedTrackData.length, 'including drum tracks')
  }, [tracks, selectedTracks, projectManager, setSelectedTracks, setLastSelectedTrack, drumTrackManager])

  // トラックコピー
  const handleCopyTracks = useCallback(() => {
    if (!selectedTracks || selectedTracks.size === 0) return

    const selectedTrackData = tracks.filter(track => selectedTracks.has(track.id))

    // ドラムトラックの場合は、drumTrackManagerからデータを取得
    const enhancedTrackData = selectedTrackData.map(track => {
      if (track.subtype === 'drums' && drumTrackManager.hasDrumTrack(track.id)) {
        const drumData = drumTrackManager.getDrumTrack(track.id)
        return {
          ...track,
          drumData: drumData // ドラムデータを含める
        }
      }
      return track
    })

    setClipboard({
      type: 'tracks',
      data: enhancedTrackData
    })

    console.log('📋 Copied tracks:', enhancedTrackData.length, 'including drum tracks')
  }, [tracks, selectedTracks, setClipboard, drumTrackManager])

  // トラック貼り付け
  const handlePasteTracks = useCallback(() => {
    if (!clipboard || clipboard.type !== 'tracks') return

    const pastedTracks = clipboard.data.map(track => {
      const newId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // ドラムトラックの場合は、drumTrackManagerに新しいデータを作成
      if (track.subtype === 'drums' && track.drumData) {
        console.log('🥁 Pasting drum track with data:', newId)

        // 新しいドラムトラックを作成
        const newDrumData = drumTrackManager.createDrumTrack(newId)
        if (newDrumData) {
          // 元のドラムデータを新しいトラックにコピー
          drumTrackManager.updateDrumTrack(newId, track.drumData)
          console.log('🥁 Drum track data copied to new track:', newId)
        }

        return {
          ...track,
          id: newId,
          name: `${track.name} (コピー)`,
          drumTrackId: newId,
          hasDrumData: true
        }
      }

      return {
        ...track,
        id: newId,
        name: `${track.name} (コピー)`
      }
    })

    pastedTracks.forEach(track => {
      addNewTrack(track.type, track.name, track.midiData)
    })

    // 貼り付けたトラックを選択
    const newTrackIds = pastedTracks.map(t => t.id)
    setSelectedTracks(new Set(newTrackIds))
    setLastSelectedTrack(newTrackIds[newTrackIds.length - 1])

    console.log('📋 Pasted tracks:', pastedTracks.length, 'including drum tracks')
  }, [clipboard, addNewTrack, setSelectedTracks, setLastSelectedTrack, drumTrackManager])

  // 全選択
  const handleSelectAll = useCallback(() => {
    const allTrackIds = tracks.map(track => track.id)
    setSelectedTracks(new Set(allTrackIds))
    setLastSelectedTrack(allTrackIds[allTrackIds.length - 1])
    setShowTrackMenu(false)
  }, [tracks, setSelectedTracks, setLastSelectedTrack])

  // 選択解除
  const handleDeselectAll = useCallback(() => {
    setSelectedTracks(new Set())
    setLastSelectedTrack(null)
    setShowTrackMenu(false)
  }, [setSelectedTracks, setLastSelectedTrack])

  // 選択反転
  const handleInvertSelection = useCallback(() => {
    const allTrackIds = tracks.map(track => track.id)
    const newSelection = new Set()

    allTrackIds.forEach(id => {
      if (!selectedTracks?.has(id)) {
        newSelection.add(id)
      }
    })

    setSelectedTracks(newSelection)
    setLastSelectedTrack(newSelection.size > 0 ? Array.from(newSelection)[newSelection.size - 1] : null)
    setShowTrackMenu(false)
  }, [tracks, selectedTracks, setSelectedTracks, setLastSelectedTrack])

  // メニュー外側クリックとESCキーでメニューを閉じるイベントリスナーを追加
  useEffect(() => {
    if (!showTrackMenu) return

    // 外側クリックでメニューを閉じる
    const handleClickOutside = (event) => {
      // メニュートリガーボタンのクリックは無視（トグル動作のため）
      if (event.target.closest('[data-track-menu-trigger]')) {
        return
      }

      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowTrackMenu(false)
      }
    }

    // ESCキーでメニューを閉じる
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowTrackMenu(false)
      }
    }

    // イベントリスナーを登録
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    // クリーンアップ
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showTrackMenu])

  return {
    showTrackMenu,
    menuPosition,
    menuRef,
    showEmptyAreaContextMenu,
    handleTrackMenuToggle,
    closeMenu,
    handleEsc,
    handleAddTrack,
    handleOpenSelectedTracks,
    handleDeleteTracks,
    handleCopyTracks,
    handlePasteTracks,
    handleSelectAll,
    handleDeselectAll,
    handleInvertSelection
  }
}
