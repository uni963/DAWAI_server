import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Music, Loader2, CheckCircle } from 'lucide-react';

/**
 * オーディオシステムの初期化進捗を表示するコンポーネント
 * Piano track view の初期化遅延問題を解決するためのユーザー通知システム
 */
export const AudioInitializationProgress = () => {
  const [initState, setInitState] = useState({
    isInitializing: false,
    isPreloading: false,
    progress: 0,
    totalSamples: 0,
    loadedSamples: 0,
    phase: 'idle', // idle, initializing, preloading, completed
    message: ''
  });

  useEffect(() => {
    const audioSystem = window.unifiedAudioSystem;
    if (!audioSystem) return;

    // 初期化状態監視
    const checkInitialization = () => {
      if (!audioSystem.isInitialized) {
        setInitState({
          isInitializing: true,
          isPreloading: false,
          progress: 0,
          totalSamples: 0,
          loadedSamples: 0,
          phase: 'initializing',
          message: 'オーディオシステムを初期化中...'
        });
        return;
      }

      // プリロード状態監視
      if (audioSystem.isPreloading) {
        const totalSamples = 37; // C3-C6 (MIDI 48-84)
        const loadedSamples = audioSystem.preloadedSamples?.size || 0;
        const progress = Math.round((loadedSamples / totalSamples) * 100);

        setInitState({
          isInitializing: false,
          isPreloading: true,
          progress,
          totalSamples,
          loadedSamples,
          phase: 'preloading',
          message: `ピアノサンプルを読み込み中... (${loadedSamples}/${totalSamples})`
        });
        return;
      }

      // 完了状態
      if (audioSystem.isInitialized && !audioSystem.isPreloading) {
        setInitState({
          isInitializing: false,
          isPreloading: false,
          progress: 100,
          totalSamples: 37,
          loadedSamples: 37,
          phase: 'completed',
          message: 'オーディオシステム準備完了！'
        });
      }
    };

    // 初期チェック
    checkInitialization();

    // 定期監視（プリロード中のみ）
    const interval = setInterval(checkInitialization, 500);

    // 完了後は監視停止
    setTimeout(() => {
      if (initState.phase === 'completed') {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // 完了後は表示しない
  if (initState.phase === 'completed') {
    return null;
  }

  // 初期化やプリロード中のみ表示
  if (!initState.isInitializing && !initState.isPreloading) {
    return null;
  }

  return (
    <Card className="fixed top-4 right-4 z-50 w-80 bg-white/95 backdrop-blur-sm border-l-4 border-l-blue-500 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {initState.phase === 'initializing' && (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          )}
          {initState.phase === 'preloading' && (
            <Music className="h-5 w-5 text-blue-500 animate-pulse" />
          )}
          {initState.phase === 'completed' && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}

          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              Piano Track 準備中
            </div>
            <div className="text-xs text-gray-600">
              {initState.message}
            </div>
          </div>
        </div>

        {initState.phase === 'preloading' && (
          <div className="space-y-2">
            <Progress
              value={initState.progress}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{initState.progress}% 完了</span>
              <span>
                あと{Math.max(0, initState.totalSamples - initState.loadedSamples)}サンプル
              </span>
            </div>
          </div>
        )}

        {initState.phase === 'initializing' && (
          <div className="space-y-2">
            <Progress value={20} className="h-2" />
            <div className="text-xs text-gray-500">
              AudioContextを準備中...
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default AudioInitializationProgress;