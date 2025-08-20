/**
 * DiffSinger API Client Service
 * 
 * This service handles communication with the DiffSinger backend API,
 * including error handling, retry logic, and progress tracking.
 */

// Default API configuration
const DEFAULT_CONFIG = {
  baseUrl: '/ai/api/voice',
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
};

/**
 * DiffSinger API Client class
 */
class DiffSingerApiClient {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.activeRequests = new Map();
    this.progressListeners = new Map();
  }

  /**
   * Get available voice models
   * @returns {Promise<Object>} Available models and current model
   */
  async getAvailableModels() {
    return this.sendRequest('GET', '/models');
  }

  /**
   * Load a specific voice model
   * @param {string} modelId - ID of the model to load
   * @returns {Promise<Object>} Result of the load operation
   */
  async loadModel(modelId) {
    return this.sendRequest('POST', `/models/${modelId}/load`);
  }

  /**
   * Get detailed information about a specific model
   * @param {string} modelId - ID of the model
   * @returns {Promise<Object>} Model details
   */
  async getModelDetails(modelId) {
    return this.sendRequest('GET', `/models/${modelId}`);
  }

  /**
   * Synthesize voice from notes and lyrics (最高品質対応)
   * @param {Object} synthesisData - Data for voice synthesis
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Object>} Result of the synthesis operation
   */
  async synthesizeVoice(synthesisData, onProgress = null) {
    const requestId = `synth_${Date.now()}`;
    
    // Register progress listener if provided
    if (onProgress) {
      this.progressListeners.set(requestId, onProgress);
    }
    
    try {
      // test_diffsinger.pyに合わせたリクエストデータを準備
      const requestData = {
        notes: synthesisData.notes,
        model_id: synthesisData.model_id || 'koshirazu_v1.0',
        language: synthesisData.language || 'japanese',
        params: synthesisData.params || {
          speed: 1.0,
          pitch_shift: 0,
          energy: 1.0,
          tension: 0.5,
          breathiness: 0.1,
          steps: 50,  // サンプリングステップ数（音質に重要）
          depth: 1.0  // サンプリング深度（音質に重要）
        }
      };

      console.log('DiffSinger API: 音声合成リクエスト送信', requestData);

      // Send the synthesis request
      const response = await this.sendRequest('POST', '/synthesize', requestData);
      
      console.log('DiffSinger API: レスポンス受信', response);
      
      // test_diffsinger.pyのレスポンス形式に合わせて処理
      if (response.status === 'success') {
        if (onProgress) {
          onProgress({ status: 'completed', progress: 100, message: '音声合成完了' });
        }
        return response;
      }
      
      // If the synthesis is queued, start polling for status
      if (response.status === 'queued' && response.request_id) {
        return this.pollSynthesisStatus(response.request_id, requestId);
      }
      
      // Handle error case
      if (response.status === 'error' || response.error_message) {
        throw new Error(response.error_message || 'Unknown synthesis error');
      }
      
      return response;
    } catch (error) {
      // Clean up progress listener on error
      this.progressListeners.delete(requestId);
      throw error;
    }
  }

  /**
   * Poll for synthesis status until completion or error
   * @param {string} apiRequestId - API request ID from the server
   * @param {string} clientRequestId - Client-side request ID for tracking
   * @returns {Promise<Object>} Final synthesis result
   */
  async pollSynthesisStatus(apiRequestId, clientRequestId) {
    let attempts = 0;
    const maxAttempts = 300; // Limit polling to prevent infinite loops
    const pollInterval = 1000; // Poll every 1 second (test_diffsinger.pyと同じ)
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          if (attempts >= maxAttempts) {
            this.progressListeners.delete(clientRequestId);
            reject(new Error('Synthesis timed out after maximum polling attempts'));
            return;
          }
          
          attempts++;
          
          // Get current status (test_diffsinger.pyと同じエンドポイント)
          const statusResponse = await this.sendRequest('GET', `/status/${apiRequestId}`);
          
          console.log('DiffSinger API: ステータス確認', statusResponse);
          
          // Update progress if listener exists
          const progressListener = this.progressListeners.get(clientRequestId);
          if (progressListener) {
            let progressPercent = 0;
            
            // Calculate progress based on status (test_diffsinger.pyと同じ)
            if (statusResponse.status === 'queued') {
              progressPercent = 5;
            } else if (statusResponse.status === 'processing') {
              progressPercent = statusResponse.progress || 50;
            } else if (statusResponse.status === 'completed') {
              progressPercent = 100;
            }
            
            progressListener({
              status: statusResponse.status,
              progress: progressPercent,
              message: statusResponse.message || `Status: ${statusResponse.status}`,
              timeElapsed: statusResponse.processing_time,
              queueTime: statusResponse.queue_time
            });
          }
          
          // Check if synthesis is complete (test_diffsinger.pyと同じ)
          if (statusResponse.status === 'completed' && statusResponse.result) {
            this.progressListeners.delete(clientRequestId);
            resolve(statusResponse.result);
            return;
          }
          
          // Check if synthesis failed (test_diffsinger.pyと同じ)
          if (statusResponse.status === 'failed') {
            this.progressListeners.delete(clientRequestId);
            reject(new Error(statusResponse.error_message || 'Synthesis failed'));
            return;
          }
          
          // Continue polling
          setTimeout(poll, pollInterval);
        } catch (error) {
          this.progressListeners.delete(clientRequestId);
          reject(error);
        }
      };
      
      // Start polling
      poll();
    });
  }

  /**
   * Cancel a synthesis request
   * @param {string} requestId - ID of the request to cancel
   * @returns {Promise<Object>} Result of the cancel operation
   */
  async cancelSynthesis(requestId) {
    return this.sendRequest('DELETE', `/status/${requestId}`);
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStats() {
    return this.sendRequest('GET', '/queue/stats');
  }

  /**
   * Send a request to the API with retry logic
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Promise<Object>} API response
   */
  async sendRequest(method, endpoint, data = null) {
    let retries = 0;
    
    while (true) {
      try {
        const url = `${this.config.baseUrl}${endpoint}`;
        const options = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: this.config.timeout,
        };
        
        if (data) {
          options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        // Handle non-2xx responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        retries++;
        
        // If we've reached max retries, throw the error
        if (retries >= this.config.maxRetries) {
          throw new Error(`Request failed after ${retries} attempts: ${error.message}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * retries));
      }
    }
  }

  /**
   * Get the full URL for a generated audio file
   * @param {string} filename - Filename from the API response
   * @returns {string} Full URL to the audio file
   */
  getAudioFileUrl(filename) {
    return `${this.config.baseUrl}/generated/${filename}`;
  }

  /**
   * Create a new instance with custom configuration
   * @param {Object} config - Custom configuration
   * @returns {DiffSingerApiClient} New client instance
   */
  withConfig(config) {
    return new DiffSingerApiClient({ ...this.config, ...config });
  }
}

// Create and export a singleton instance
const diffSingerApiClient = new DiffSingerApiClient();
export default diffSingerApiClient;

// Also export the class for custom instantiation
export { DiffSingerApiClient, diffSingerApiClient };