import React from 'react'
import { Card, CardContent } from '../ui/card.jsx'
import { Progress } from '../ui/progress.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Clock,
  Zap
} from 'lucide-react'

const GenerationProgress = ({ 
  progress, 
  onCancel, 
  onRetry 
}) => {
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'starting':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'starting':
      case 'processing':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (progress.status) {
      case 'starting':
        return '開始中...'
      case 'processing':
        return '処理中...'
      case 'completed':
        return '完了'
      case 'error':
        return 'エラー'
      default:
        return '待機中'
    }
  }

  const getProgressText = () => {
    if (progress.status === 'completed') {
      return '音声生成が完了しました！'
    }
    if (progress.status === 'error') {
      return progress.message || '音声生成に失敗しました'
    }
    return progress.message || `進捗: ${progress.progress}%`
  }

  if (progress.status === 'idle') {
    return null
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">音声生成</span>
            <Badge 
              variant="secondary" 
              className={`${getStatusColor()} text-white`}
            >
              {getStatusText()}
            </Badge>
          </div>
          
          {progress.status === 'processing' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-8"
            >
              <Square className="h-3 w-3 mr-1" />
              キャンセル
            </Button>
          )}
          
          {progress.status === 'error' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8"
            >
              <Zap className="h-3 w-3 mr-1" />
              再試行
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Progress 
            value={progress.progress} 
            className="h-2"
          />
          <div className="text-sm text-muted-foreground">
            {getProgressText()}
          </div>
        </div>

        {/* 詳細情報 */}
        {progress.status === 'processing' && (
          <div className="mt-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">処理時間:</span>
                <span className="ml-1">
                  {progress.timeElapsed ? `${progress.timeElapsed.toFixed(1)}秒` : '計算中...'}
                </span>
              </div>
              <div>
                <span className="font-medium">待機時間:</span>
                <span className="ml-1">
                  {progress.queueTime ? `${progress.queueTime.toFixed(1)}秒` : '0秒'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 完了時の情報 */}
        {progress.status === 'completed' && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>最高品質の音声が生成されました</span>
            </div>
          </div>
        )}

        {/* エラー時の情報 */}
        {progress.status === 'error' && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>エラーが発生しました。再試行してください。</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default GenerationProgress 