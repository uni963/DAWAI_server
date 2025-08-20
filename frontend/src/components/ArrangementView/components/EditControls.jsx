import { Button } from '../../ui/button.jsx'
import { 
  Eye,
  Copy,
  Clipboard
} from 'lucide-react'

const EditControls = ({
  tracks,
  selectedTracks,
  clipboard,
  onSelectAll,
  onDeselectAll,
  onInvertSelection,
  onCopyTracks,
  onPasteTracks,
  onOpenSelectedTracks
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
      <div className="flex items-center space-x-2">
        <Button
          onClick={onSelectAll}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          title="全選択 (Ctrl+A)"
        >
          All
        </Button>
        <Button
          onClick={onDeselectAll}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          title="選択解除 (Esc)"
        >
          None
        </Button>
        <Button
          onClick={onInvertSelection}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          title="選択反転 (Ctrl+I)"
        >
          Invert
        </Button>
        <div className="w-px h-6 bg-gray-600 mx-2" />
        <Button
          onClick={onCopyTracks}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          disabled={(selectedTracks?.size ?? 0) === 0}
          title="コピー (Ctrl+C)"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          onClick={onPasteTracks}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          disabled={!clipboard}
          title="貼り付け (Ctrl+V)"
        >
          <Clipboard className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-600 mx-2" />
        <Button
          onClick={onOpenSelectedTracks}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          disabled={(selectedTracks?.size ?? 0) === 0}
          title="選択トラックのタブを開く"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <div className="text-sm text-gray-400">
          {tracks.length} Tracks | {(selectedTracks?.size ?? 0)} Selected
        </div>
      </div>
    </div>
  )
}

export default EditControls 