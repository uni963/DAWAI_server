// GhostTextEngineClient: バックエンドAPI通信クライアント
export default class GhostTextEngineClient {
  constructor(apiEndpoint) {
    this.apiEndpoint = apiEndpoint;
    this.isActive = false;
    this.listeners = [];
    this.predictionCache = new Map();
    this.debounceTimeout = null;
    this.debounceDelay = 100;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.requestTimeout = 5000;
    this.performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastResponseTime: 0
    };
  }

  async getPredictions(contextData) {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;
    
    try {
      const response = await this.makeRequest(contextData);
      
      const responseTime = Date.now() - startTime;
      this.updatePerformanceMetrics(responseTime, true);
      
      if (response && response.predictions) {
        this.notifyListeners('prediction', response);
        return response;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updatePerformanceMetrics(responseTime, false);
      
      console.error('Prediction request failed:', error);
      this.notifyListeners('error', { error: error.message });
      return null;
    }
  }

  async makeRequest(contextData, retryCount = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
    
    try {
      const response = await fetch(`${this.apiEndpoint}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          track_summary: contextData.trackSummary || '',
          current_notes: contextData.currentNotes.map(note => ({
            pitch: note.pitch,
            start: note.time || note.start || 0,
            duration: note.duration || 0.5,
            velocity: note.velocity || 0.8
          })),
          cursor_position: contextData.cursorPosition || 0,
          track_type: contextData.trackType || 'melody',
          key_signature: contextData.keySignature || 'C',
          time_signature: contextData.timeSignature || '4/4',
          tempo: contextData.tempo || 120
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.makeRequest(contextData, retryCount + 1);
      }
      
      throw error;
    }
  }

  shouldRetry(error) {
    // ネットワークエラーや5xxエラーの場合はリトライ
    return error.message.includes('timeout') || 
           error.message.includes('network') ||
           error.message.includes('500') ||
           error.message.includes('502') ||
           error.message.includes('503') ||
           error.message.includes('504');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updatePerformanceMetrics(responseTime, success) {
    this.performanceMetrics.lastResponseTime = responseTime;
    
    if (success) {
      this.performanceMetrics.successfulRequests++;
    } else {
      this.performanceMetrics.failedRequests++;
    }
    
    // 平均応答時間を更新
    const totalSuccessful = this.performanceMetrics.successfulRequests;
    if (totalSuccessful > 0) {
      const currentAvg = this.performanceMetrics.averageResponseTime;
      this.performanceMetrics.averageResponseTime = 
        (currentAvg * (totalSuccessful - 1) + responseTime) / totalSuccessful;
    }
  }

  debouncedPredict(contextData) {
    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      this.getPredictions(contextData);
    }, this.debounceDelay);
  }

  generateCacheKey(contextData) {
    return JSON.stringify({
      notes: contextData.currentNotes,
      cursor: contextData.cursorPosition,
      trackType: contextData.trackType,
      key: contextData.keySignature,
      time: contextData.timeSignature,
      tempo: contextData.tempo
    });
  }

  getCachedPrediction(contextData) {
    const key = this.generateCacheKey(contextData);
    return this.predictionCache.get(key);
  }

  cachePrediction(contextData, prediction) {
    const key = this.generateCacheKey(contextData);
    this.predictionCache.set(key, {
      prediction,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.predictionCache.clear();
  }

  clearExpiredCache(maxAge = 300000) { // 5分
    const now = Date.now();
    for (const [key, value] of this.predictionCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.predictionCache.delete(key);
      }
    }
  }

  setDebounceDelay(delay) {
    this.debounceDelay = Math.max(0, delay);
  }

  setRequestTimeout(timeout) {
    this.requestTimeout = Math.max(1000, timeout);
  }

  setMaxRetries(retries) {
    this.maxRetries = Math.max(0, retries);
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  resetPerformanceMetrics() {
    this.performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastResponseTime: 0
    };
  }

  isHealthy() {
    const metrics = this.performanceMetrics;
    if (metrics.totalRequests === 0) return true;
    
    const successRate = metrics.successfulRequests / metrics.totalRequests;
    return successRate > 0.8 && metrics.averageResponseTime < 3000;
  }

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
        console.error('Error in listener:', e);
      }
    });
  }
} 