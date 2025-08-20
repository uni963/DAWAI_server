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
  onDeleteTracks
}) => {
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
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
  }, [isPlaying, selectedTracks, clipboard, projectManager, onCopyTracks, onPasteTracks, onSelectAll, onInvertSelection, onDeselectAll, onDeleteTracks])
}

export default useKeyboardShortcuts 