// フレームレート監視システム
class FrameRateMonitor {
  constructor() {
    this.frameCount = 0
    this.lastTime = performance.now()
    this.fps = 60
    this.isMonitoring = false
    this.frameTimeHistory = []
    this.maxHistorySize = 60 // 1秒分の履歴
    this.lowFpsThreshold = 55 // 55fps以下を警告
    this.callbacks = new Set()
  }

  start() {
    if (this.isMonitoring) return
    this.isMonitoring = true
    this.frameCount = 0
    this.lastTime = performance.now()
    this.frameTimeHistory = []
    this.monitorFrame()
  }

  stop() {
    this.isMonitoring = false
  }

  monitorFrame() {
    if (!this.isMonitoring) return

    const currentTime = performance.now()
    const frameTime = currentTime - this.lastTime
    const currentFps = 1000 / frameTime

    // フレーム時間を記録
    this.frameTimeHistory.push(frameTime)
    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift()
    }

    // 平均FPSを計算
    const avgFrameTime = this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length
    this.fps = 1000 / avgFrameTime

    // 低FPS警告
    if (this.fps < this.lowFpsThreshold) {
      console.warn(`⚠️ Low FPS detected: ${this.fps.toFixed(1)}fps (target: 60fps)`)
      this.notifyCallbacks('low-fps', { fps: this.fps, frameTime })
    }

    this.frameCount++
    this.lastTime = currentTime

    // 次のフレームを監視
    requestAnimationFrame(() => this.monitorFrame())
  }

  getFPS() {
    return this.fps
  }

  getFrameTime() {
    return this.frameTimeHistory.length > 0 
      ? this.frameTimeHistory[this.frameTimeHistory.length - 1] 
      : 0
  }

  getAverageFrameTime() {
    return this.frameTimeHistory.length > 0 
      ? this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length 
      : 0
  }

  onLowFPS(callback) {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  notifyCallbacks(event, data) {
    this.callbacks.forEach(callback => {
      try {
        callback(event, data)
      } catch (error) {
        console.error('Frame rate monitor callback error:', error)
      }
    })
  }

  // パフォーマンス統計を取得
  getStats() {
    return {
      fps: this.fps,
      frameTime: this.getFrameTime(),
      averageFrameTime: this.getAverageFrameTime(),
      frameCount: this.frameCount,
      isStable: this.fps >= this.lowFpsThreshold
    }
  }
}

// シングルトンインスタンス
const frameRateMonitor = new FrameRateMonitor()

export default frameRateMonitor 