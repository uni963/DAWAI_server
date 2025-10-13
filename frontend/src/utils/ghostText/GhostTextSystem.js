// GhostTextSystem: Phi-2ベースのGhost Textシステム統合クラス
import GhostTextInputContext from './GhostTextInputContext.js';
import GhostTextEngineClient from './GhostTextEngineClient.js';
import GhostPredictionRenderer from './GhostPredictionRenderer.js';

export default class GhostTextSystem {
  constructor(options = {}) {
    this.options = {
      apiEndpoint: options.apiEndpoint || '/ai',
      debounceDelay: options.debounceDelay || 100,
      requestTimeout: options.requestTimeout || 5000,
      maxRetries: options.maxRetries || 3,
      enabled: options.enabled !== false,
      ...options
    };

    // コンポーネントの初期化
    this.inputContext = new GhostTextInputContext();
    this.engineClient = new GhostTextEngineClient(this.options.apiEndpoint);
    this.predictionRenderer = null;
    
    // システム状態
    this.isActive = false;
    this.isConnected = false;
    this.lastPrediction = null;
    this.listeners = [];
    
    // パフォーマンス監視
    this.performanceMonitor = {
      predictionsGenerated: 0,
      predictionsAccepted: 0,
      averagePredictionTime: 0,
      lastPredictionTime: 0
    };

    this.setupEventHandlers();
    this.setupPerformanceMonitoring();
  }

  setupEventHandlers() {
    // 入力コンテキストの変更を監視
    this.inputContext.addListener((event, data) => {
      if (event === 'contextUpdate' && this.isActive) {
        this.handleContextUpdate(data);
      }
    });

    // エンジンクライアントの応答を監視
    this.engineClient.addListener((event, data) => {
      if (event === 'prediction') {
        this.handlePrediction(data);
      } else if (event === 'error') {
        this.handleError(data);
      }
    });
  }

  setupPerformanceMonitoring() {
    // 定期的にパフォーマンスメトリクスをクリア
    setInterval(() => {
      this.engineClient.clearExpiredCache();
    }, 300000); // 5分ごと
  }

  async initialize(midiEditor) {
    try {
      // レンダラーの初期化
      this.predictionRenderer = new GhostPredictionRenderer(midiEditor);
      
      // キャンバスの初期化（MIDIエディタから取得）
      if (midiEditor && midiEditor.canvas) {
        this.predictionRenderer.initialize(midiEditor.canvas);
      }

      // バックエンドとの接続テスト
      await this.testConnection();
      
      this.isActive = true;
      this.notifyListeners('initialized', { success: true });
      
      console.log('Ghost Text System initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Ghost Text System:', error);
      this.notifyListeners('initialized', { success: false, error: error.message });
      return false;
    }
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.options.apiEndpoint}/health`, {
        method: 'GET',
        timeout: 3000
      });
      
      if (response.ok) {
        this.isConnected = true;
        return true;
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      this.isConnected = false;
      console.warn('Backend connection test failed:', error.message);
      return false;
    }
  }

  handleContextUpdate(contextData) {
    if (!this.isActive || !this.isConnected) return;

    const startTime = Date.now();
    
    // キャッシュされた予測をチェック
    const cached = this.engineClient.getCachedPrediction(contextData);
    if (cached && Date.now() - cached.timestamp < 30000) { // 30秒以内のキャッシュ
      this.handlePrediction(cached.prediction);
      return;
    }

    // デバウンスされた予測リクエスト
    this.engineClient.debouncedPredict(contextData);
    
    this.performanceMonitor.lastPredictionTime = Date.now() - startTime;
  }

  handlePrediction(predictionData) {
    if (!this.isActive || !this.predictionRenderer) return;

    this.lastPrediction = predictionData;
    this.performanceMonitor.predictionsGenerated++;

    // 予測データをレンダラーに送信
    if (predictionData.predictions && Array.isArray(predictionData.predictions)) {
      this.predictionRenderer.updateGhostNotes(predictionData.predictions);
      
      // キャッシュに保存
      this.engineClient.cachePrediction(
        this.inputContext.getContextData(), 
        predictionData
      );
    }

    this.notifyListeners('prediction', predictionData);
  }

  handleError(errorData) {
    console.error('Ghost Text prediction error:', errorData);
    this.notifyListeners('error', errorData);
    
    // エラー時はゴーストノートを非表示
    if (this.predictionRenderer) {
      this.predictionRenderer.hide();
    }
  }

  // 公開API
  updateContext(notes, cursorPosition, trackType, additionalData) {
    this.inputContext.updateContext(notes, cursorPosition, trackType, additionalData);
  }

  acceptGhostNote(index) {
    if (!this.predictionRenderer) return null;
    
    const acceptedNote = this.predictionRenderer.acceptGhostNote(index);
    if (acceptedNote) {
      this.performanceMonitor.predictionsAccepted++;
      this.notifyListeners('noteAccepted', { note: acceptedNote, index });
    }
    return acceptedNote;
  }

  acceptAllGhostNotes() {
    if (!this.predictionRenderer) return [];
    
    const acceptedNotes = this.predictionRenderer.acceptAllGhostNotes();
    this.performanceMonitor.predictionsAccepted += acceptedNotes.length;
    this.notifyListeners('notesAccepted', { notes: acceptedNotes });
    return acceptedNotes;
  }

  showGhostNotes() {
    if (this.predictionRenderer) {
      this.predictionRenderer.show();
    }
  }

  hideGhostNotes() {
    if (this.predictionRenderer) {
      this.predictionRenderer.hide();
    }
  }

  setGhostNoteOpacity(opacity) {
    if (this.predictionRenderer) {
      this.predictionRenderer.setOpacity(opacity);
    }
  }

  setGhostNoteColor(color) {
    if (this.predictionRenderer) {
      this.predictionRenderer.setGhostColor(color);
    }
  }

  enable() {
    this.isActive = true;
    this.notifyListeners('enabled', { enabled: true });
  }

  disable() {
    this.isActive = false;
    if (this.predictionRenderer) {
      this.predictionRenderer.hide();
    }
    this.notifyListeners('enabled', { enabled: false });
  }

  isEnabled() {
    return this.isActive;
  }

  getStatus() {
    return {
      isActive: this.isActive,
      isConnected: this.isConnected,
      hasGhostNotes: this.predictionRenderer ? this.predictionRenderer.hasGhostNotes() : false,
      performanceMetrics: this.engineClient.getPerformanceMetrics(),
      systemMetrics: { ...this.performanceMonitor }
    };
  }

  getPerformanceMetrics() {
    return {
      engine: this.engineClient.getPerformanceMetrics(),
      system: { ...this.performanceMonitor }
    };
  }

  resetMetrics() {
    this.engineClient.resetPerformanceMetrics();
    this.performanceMonitor = {
      predictionsGenerated: 0,
      predictionsAccepted: 0,
      averagePredictionTime: 0,
      lastPredictionTime: 0
    };
  }

  // 設定の更新
  updateSettings(newSettings) {
    this.options = { ...this.options, ...newSettings };
    
    if (newSettings.debounceDelay !== undefined) {
      this.engineClient.setDebounceDelay(newSettings.debounceDelay);
    }
    
    if (newSettings.requestTimeout !== undefined) {
      this.engineClient.setRequestTimeout(newSettings.requestTimeout);
    }
    
    if (newSettings.maxRetries !== undefined) {
      this.engineClient.setMaxRetries(newSettings.maxRetries);
    }
    
    this.notifyListeners('settingsUpdated', { settings: this.options });
  }

  // イベントリスナー管理
  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Error in Ghost Text System listener:', e);
      }
    });
  }

  // クリーンアップ
  destroy() {
    this.disable();
    this.engineClient.clearCache();
    
    if (this.predictionRenderer) {
      this.predictionRenderer.hide();
      this.predictionRenderer = null;
    }
    
    this.listeners = [];
    this.inputContext = null;
    this.engineClient = null;
  }
} 