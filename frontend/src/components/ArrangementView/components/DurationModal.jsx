import { Button } from '../../ui/button.jsx'
import { Input } from '../../ui/input.jsx'
import { Label } from '../../ui/label.jsx'
import { Clock, X } from 'lucide-react'
import { formatTime } from '../utils/arrangementUtils.js'

const DurationModal = ({
  showDurationModal,
  onClose,
  onSetDuration,
  totalDuration
}) => {
  if (!showDurationModal) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999999]"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-96 max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-400" />
            曲の長さを設定
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="duration" className="text-sm text-gray-300">
              曲の長さ（秒）
            </Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                id="duration"
                type="number"
                min="1"
                max="3600"
                step="1"
                defaultValue={Math.round(totalDuration / 1000)}
                className="flex-1"
                placeholder="例: 180"
              />
              <span className="text-sm text-gray-400">秒</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              1秒〜3600秒（1時間）の間で設定してください
            </p>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-300">
            <span>現在の設定:</span>
            <span className="text-blue-400">{formatTime(totalDuration / 1000)}</span>
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button
              onClick={() => {
                const input = document.getElementById('duration')
                const value = parseInt(input.value) || 30
                onSetDuration(value)
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              設定
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              キャンセル
            </Button>
          </div>
          
          {/* プリセットボタン */}
          <div className="pt-2">
            <Label className="text-sm text-gray-300 mb-2 block">プリセット</Label>
            <div className="grid grid-cols-3 gap-2">
              {[30, 60, 120, 180, 300, 600].map((seconds) => (
                <Button
                  key={seconds}
                  variant="outline"
                  size="sm"
                  onClick={() => onSetDuration(seconds)}
                  className="text-xs"
                >
                  {formatTime(seconds)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DurationModal 