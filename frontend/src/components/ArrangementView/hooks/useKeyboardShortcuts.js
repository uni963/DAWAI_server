import { useEffect } from 'react'

const useKeyboardShortcuts = ({
  isPlaying,
  selectedTracks,
  clipboard,
  projectManager,
  onCopyTracks,
  onPasteTracks,
  onSelectAll,
  onInvertSelection,
  onDeselectAll,
  onDeleteTracks,
  onUndo,
  onRedo
}) => {
  useEffect(() => {
    const handleKeyPress = (event) => {
      // フォーム要素内（input, textarea, contenteditable）では、グローバルショートカットを無効化
      const target = event.target
      const isFormElement = target.matches('input, textarea, [contenteditable], select')

      if (isFormElement) {
        // フォーム要素内では通常の動作を許可
        return
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault()
            if (onUndo) {
              onUndo()
            }
            break
          case 'y':
            event.preventDefault()
            if (onRedo) {
              onRedo()
            }
            break
          case 'c':
            event.preventDefault()
            onCopyTracks()
            break
          case 'v':
            event.preventDefault()
            onPasteTracks()
            break
          case 'a':
            event.preventDefault()
            onSelectAll()
            break
          case 'i':
            event.preventDefault()
            onInvertSelection()
            break
        }
      } else {
        switch (event.key) {
          case 'Escape':
            onDeselectAll()
            break
          case 'Delete':
          case 'Backspace':
            event.preventDefault()
            onDeleteTracks()
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, selectedTracks, clipboard, projectManager, onCopyTracks, onPasteTracks, onSelectAll, onInvertSelection, onDeselectAll, onDeleteTracks, onUndo, onRedo])
}

export default useKeyboardShortcuts 