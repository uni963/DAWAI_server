import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Play, 
  Pause, 
  Eye, 
  EyeOff, 
  Settings, 
  Activity, 
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

export default function GhostTextPanel({ 
  ghostTextIntegration,
  className = ""
}) {
  const {
    isInitialized,
    isEnabled,
    status,
    performanceMetrics,
    error,
    toggleGhostText,
    showGhostNotes,
    hideGhostNotes,
    acceptAllGhostNotes,
    setGhostNoteOpacity,
    setGhostNoteColor,
    resetMetrics
  } = ghostTextIntegration;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [opacity, setOpacity] = useState(0.5);
  const [ghostColor, setGhostColor] = useState('#8A2BE2');

  const handleOpacityChange = (value) => {
    const newOpacity = value[0] / 100;
    setOpacity(newOpacity);
    setGhostNoteOpacity(newOpacity);
  };

  const handleColorChange = (color) => {
    setGhostColor(color);
    setGhostNoteColor(color);
  };

  const getStatusIcon = () => {
    if (!isInitialized) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    if (error) return <XCircle className="h-4 w-4 text-red-500" />;
    if (status.isConnected) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (!isInitialized) return '初期化中...';
    if (error) return 'エラー';
    if (status.isConnected) return '接続済み';
    return '未接続';
  };

  const getStatusColor = () => {
    if (!isInitialized) return 'bg-yellow-100 text-yellow-800';
    if (error) return 'bg-red-100 text-red-800';
    if (status.isConnected) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5" />
          Ghost Text System
          <Badge variant={isEnabled ? "default" : "secondary"}>
            {isEnabled ? "有効" : "無効"}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* ステータス表示 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">ステータス</span>
          </div>
          <Badge className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Separator />

        {/* メインコントロール */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Ghost Text</span>
            <Switch
              checked={isEnabled}
              onCheckedChange={toggleGhostText}
              disabled={!isInitialized}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={showGhostNotes}
              disabled={!isEnabled}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              表示
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={hideGhostNotes}
              disabled={!isEnabled}
              className="flex-1"
            >
              <EyeOff className="h-4 w-4 mr-1" />
              非表示
            </Button>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={acceptAllGhostNotes}
            disabled={!isEnabled || !status.hasGhostNotes}
            className="w-full"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            すべてのゴーストノートを確定
          </Button>
        </div>

        <Separator />

        {/* パフォーマンスメトリクス */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">パフォーマンス</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">予測生成</div>
              <div className="font-medium">
                {performanceMetrics.system?.predictionsGenerated || 0}
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">確定済み</div>
              <div className="font-medium">
                {performanceMetrics.system?.predictionsAccepted || 0}
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">平均応答時間</div>
              <div className="font-medium">
                {Math.round(performanceMetrics.engine?.averageResponseTime || 0)}ms
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">成功率</div>
              <div className="font-medium">
                {performanceMetrics.engine?.totalRequests > 0 
                  ? Math.round((performanceMetrics.engine.successfulRequests / performanceMetrics.engine.totalRequests) * 100)
                  : 0}%
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={resetMetrics}
            className="w-full"
          >
            メトリクスリセット
          </Button>
        </div>

        <Separator />

        {/* 詳細設定 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">詳細設定</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {showAdvanced && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
              {/* 透明度設定 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">透明度</span>
                  <span className="text-sm text-gray-500">{Math.round(opacity * 100)}%</span>
                </div>
                <Slider
                  value={[opacity * 100]}
                  onValueChange={handleOpacityChange}
                  max={100}
                  min={10}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* 色設定 */}
              <div className="space-y-2">
                <span className="text-sm">ゴーストノート色</span>
                <div className="flex gap-2">
                  {['#8A2BE2', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'].map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        ghostColor === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorChange(color)}
                    />
                  ))}
                </div>
              </div>

              {/* 接続情報 */}
              <div className="space-y-2">
                <span className="text-sm font-medium">接続情報</span>
                <div className="text-xs space-y-1 text-gray-600">
                  <div>API: {ghostTextIntegration.ghostTextSystem?.options.apiEndpoint}</div>
                  <div>デバウンス: {ghostTextIntegration.ghostTextSystem?.options.debounceDelay}ms</div>
                  <div>タイムアウト: {ghostTextIntegration.ghostTextSystem?.options.requestTimeout}ms</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 