import { useState } from 'react'
import { Button } from '../../ui/button.jsx'
import {
  Copy,
  Clipboard,
  Undo2,
  Redo2,
  ListChecks,
  Square,
  HelpCircle,
  Trash2
} from 'lucide-react'

const EditControls = ({
  tracks,
  selectedTracks,
  clipboard,
  onSelectAll,
  onDeselectAll,
  onCopyTracks,
  onPasteTracks,
  onDeleteTracks,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  const [showHintPopup, setShowHintPopup] = useState(false)
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
      <div className="flex items-center space-x-2">
        {/* アンドゥ・リドゥ */}
        <Button
          onClick={onUndo}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          disabled={!canUndo}
          title="元に戻す (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          onClick={onRedo}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          disabled={!canRedo}
          title="やり直す (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-600 mx-2" />
        <Button
          onClick={onSelectAll}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          title="全選択 (Ctrl+A)"
        >
          <ListChecks className="h-4 w-4" />
        </Button>
        <Button
          onClick={onDeselectAll}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
          title="選択解除 (Esc)"
        >
          <Square className="h-4 w-4" />
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
        <Button
          onClick={onDeleteTracks}
          variant="ghost"
          size="sm"
          className="text-white hover:text-red-400 hover:bg-gray-700"
          disabled={(selectedTracks?.size ?? 0) === 0}
          title="削除 (Delete)"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* ヒントポップアップ */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-gray-700"
            aria-label="ヒントを表示"
            onClick={() => setShowHintPopup(!showHintPopup)}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* カスタムポップアップ */}
          {showHintPopup && (
            <>
              {/* 背景オーバーレイ */}
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setShowHintPopup(false)}
              />

              {/* ポップアップコンテンツ */}
              <div className="absolute top-full left-0 mt-2 w-96 bg-gray-900/95 backdrop-blur-xl border border-gray-700 text-gray-200 shadow-2xl rounded-md p-4 z-[9999]">
                <div className="space-y-3">
                  {/* ヘッダー */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-700">
                    <h3 className="font-semibold text-white flex items-center">
                      <HelpCircle className="h-4 w-4 mr-2 text-blue-400" />
                      トラック操作ガイド
                    </h3>
                  </div>

                  {/* 複数選択セクション */}
                  <div>
                    <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center">
                      📌 複数選択
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start">
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs mr-2 flex-shrink-0">Shift</kbd>
                        <span className="text-gray-300">+ クリックで範囲選択</span>
                      </div>
                      <div className="flex items-start">
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs mr-2 flex-shrink-0">Ctrl</kbd>
                        <span className="text-gray-300">+ クリックで個別選択</span>
                      </div>
                    </div>
                  </div>

                  {/* ショートカットセクション */}
                  <div>
                    <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center">
                      ⌨️ ショートカット
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start">
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs mr-2 flex-shrink-0">Ctrl+A</kbd>
                        <span className="text-gray-300">全選択</span>
                      </div>
                      <div className="flex items-start">
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs mr-2 flex-shrink-0">Ctrl+C</kbd>
                        <span className="text-gray-300">コピー</span>
                      </div>
                      <div className="flex items-start">
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs mr-2 flex-shrink-0">Ctrl+V</kbd>
                        <span className="text-gray-300">貼り付け</span>
                      </div>
                      <div className="flex items-start">
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs mr-2 flex-shrink-0">Delete</kbd>
                        <span className="text-gray-300">削除</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="text-sm text-gray-400 ml-2">
          {tracks.length} Tracks | {(selectedTracks?.size ?? 0)} Selected
        </div>
      </div>
    </div>
  )
}

export default EditControls 