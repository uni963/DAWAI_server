import { useRef, useCallback, useState } from 'react';

const useDrumTrackPersistence = () => {
  // 履歴管理
  const historyRef = useRef([]);
  const currentIndexRef = useRef(-1);
  const maxHistorySize = 50; // 最大履歴数
  
  // 状態
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Undo/Redo状態の更新
  const updateUndoRedoState = useCallback(() => {
    setCanUndo(currentIndexRef.current > 0);
    setCanRedo(currentIndexRef.current < historyRef.current.length - 1);
  }, []);
  
  // 履歴に追加
  const addToHistory = useCallback((data, description = '') => {
    const historyItem = {
      data: JSON.parse(JSON.stringify(data)), // ディープコピー
      description,
      timestamp: Date.now()
    };
    
    // 現在位置より後の履歴を削除（新しい操作が行われた場合）
    if (currentIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, currentIndexRef.current + 1);
    }
    
    // 履歴に追加
    historyRef.current.push(historyItem);
    currentIndexRef.current = historyRef.current.length - 1;
    
    // 最大履歴数を超えた場合、古い履歴を削除
    if (historyRef.current.length > maxHistorySize) {
      historyRef.current.shift();
      currentIndexRef.current--;
    }
    
    // Undo/Redo状態を更新
    updateUndoRedoState();
    
    // 開発環境でのみログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log('🥁 Added to history:', description, historyRef.current.length);
    }
  }, [updateUndoRedoState]);
  
  // Undo実行
  const undo = useCallback(() => {
    if (currentIndexRef.current > 0) {
      currentIndexRef.current--;
      updateUndoRedoState();
      
      const historyItem = historyRef.current[currentIndexRef.current];
      
      // 開発環境でのみログを出力
      if (process.env.NODE_ENV === 'development') {
        console.log('🥁 Undo:', historyItem.description);
      }
      
      return historyItem.data;
    }
    return null;
  }, [updateUndoRedoState]);
  
  // Redo実行
  const redo = useCallback(() => {
    if (currentIndexRef.current < historyRef.current.length - 1) {
      currentIndexRef.current++;
      updateUndoRedoState();
      
      const historyItem = historyRef.current[currentIndexRef.current];
      
      // 開発環境でのみログを出力
      if (process.env.NODE_ENV === 'development') {
        console.log('🥁 Redo:', historyItem.description);
      }
      
      return historyItem.data;
    }
    return null;
  }, [updateUndoRedoState]);
  
  // 履歴情報の取得
  const getHistoryInfo = useCallback(() => ({
    canUndo: currentIndexRef.current > 0,
    canRedo: currentIndexRef.current < historyRef.current.length - 1,
    historyLength: historyRef.current.length,
    currentIndex: currentIndexRef.current,
    maxHistorySize
  }), []);
  
  // 履歴のクリア
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    currentIndexRef.current = -1;
    setCanUndo(false);
    setCanRedo(false);
    
    // 開発環境でのみログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log('🥁 History cleared');
    }
  }, []);
  
  // 現在の履歴アイテムを取得
  const getCurrentHistoryItem = useCallback(() => {
    if (currentIndexRef.current >= 0 && currentIndexRef.current < historyRef.current.length) {
      return historyRef.current[currentIndexRef.current];
    }
    return null;
  }, []);
  
  // 履歴の詳細を取得
  const getHistoryDetails = useCallback(() => {
    return historyRef.current.map((item, index) => ({
      index,
      description: item.description,
      timestamp: item.timestamp,
      isCurrent: index === currentIndexRef.current
    }));
  }, []);
  
  // 特定の履歴アイテムに移動
  const goToHistoryItem = useCallback((index) => {
    if (index >= 0 && index < historyRef.current.length) {
      currentIndexRef.current = index;
      updateUndoRedoState();
      
      const historyItem = historyRef.current[index];
      
      // 開発環境でのみログを出力
      if (process.env.NODE_ENV === 'development') {
        console.log('🥁 Go to history item:', index, historyItem.description);
      }
      
      return historyItem.data;
    }
    return null;
  }, [updateUndoRedoState]);
  
  // 履歴の検索
  const searchHistory = useCallback((query) => {
    return historyRef.current
      .map((item, index) => ({ ...item, index }))
      .filter(item => 
        item.description.toLowerCase().includes(query.toLowerCase())
      );
  }, []);
  
  // 履歴のエクスポート
  const exportHistory = useCallback(() => {
    return {
      history: historyRef.current,
      currentIndex: currentIndexRef.current,
      maxHistorySize,
      exportedAt: Date.now()
    };
  }, []);
  
  // 履歴のインポート
  const importHistory = useCallback((data) => {
    try {
      if (data.history && Array.isArray(data.history)) {
        historyRef.current = data.history;
        currentIndexRef.current = data.currentIndex || -1;
        updateUndoRedoState();
        
        // 開発環境でのみログを出力
        if (process.env.NODE_ENV === 'development') {
          console.log('🥁 History imported:', data.history.length, 'items');
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to import history:', error);
      return false;
    }
  }, [updateUndoRedoState]);
  
  // 履歴の統計情報
  const getHistoryStats = useCallback(() => {
    const totalItems = historyRef.current.length;
    const undoCount = currentIndexRef.current;
    const redoCount = totalItems - currentIndexRef.current - 1;
    
    return {
      totalItems,
      undoCount,
      redoCount,
      memoryUsage: JSON.stringify(historyRef.current).length,
      oldestItem: totalItems > 0 ? historyRef.current[0].timestamp : null,
      newestItem: totalItems > 0 ? historyRef.current[totalItems - 1].timestamp : null
    };
  }, []);
  
  // 履歴の最適化（古いアイテムを削除）
  const optimizeHistory = useCallback((targetSize = maxHistorySize) => {
    if (historyRef.current.length > targetSize) {
      const itemsToRemove = historyRef.current.length - targetSize;
      historyRef.current = historyRef.current.slice(itemsToRemove);
      currentIndexRef.current = Math.max(0, currentIndexRef.current - itemsToRemove);
      updateUndoRedoState();
      
      // 開発環境でのみログを出力
      if (process.env.NODE_ENV === 'development') {
        console.log('🥁 History optimized:', itemsToRemove, 'items removed');
      }
    }
  }, [maxHistorySize, updateUndoRedoState]);
  
  return {
    // 基本操作
    addToHistory,
    undo,
    redo,
    clearHistory,
    
    // 情報取得
    getHistoryInfo,
    getCurrentHistoryItem,
    getHistoryDetails,
    getHistoryStats,
    
    // 高度な操作
    goToHistoryItem,
    searchHistory,
    exportHistory,
    importHistory,
    optimizeHistory,
    
    // 状態
    canUndo,
    canRedo
  };
};

export default useDrumTrackPersistence; 