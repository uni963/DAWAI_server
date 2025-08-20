// パフォーマンス監視ユーティリティ
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.isEnabled = process.env.NODE_ENV === 'development'
  }

  // 処理時間を計測
  measure(name, fn) {
    if (!this.isEnabled) {
      return fn()
    }

    const start = performance.now()
    const result = fn()
    const end = performance.now()
    const duration = end - start

    this.recordMetric(name, duration)
    return result
  }

  // 非同期処理の時間を計測
  async measureAsync(name, fn) {
    if (!this.isEnabled) {
      return await fn()
    }

    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    const duration = end - start

    this.recordMetric(name, duration)
    return result
  }

  // メトリクスを記録
  recordMetric(name, duration) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        averageTime: 0
      })
    }

    const metric = this.metrics.get(name)
    metric.count++
    metric.totalTime += duration
    metric.minTime = Math.min(metric.minTime, duration)
    metric.maxTime = Math.max(metric.maxTime, duration)
    metric.averageTime = metric.totalTime / metric.count

    // 100ms以上かかる処理は警告
    if (duration > 100) {
      console.warn(`⚠️ Slow operation detected: ${name} took ${duration.toFixed(2)}ms`)
    }
  }

  // メトリクスを取得
  getMetrics() {
    return Object.fromEntries(this.metrics)
  }

  // メトリクスをリセット
  reset() {
    this.metrics.clear()
  }

  // 重い処理のレポートを生成
  generateReport() {
    const metrics = this.getMetrics()
    const slowOperations = Object.entries(metrics)
      .filter(([_, metric]) => metric.averageTime > 50)
      .sort(([_, a], [__, b]) => b.averageTime - a.averageTime)

    if (slowOperations.length > 0) {
      console.group('🐌 Performance Report - Slow Operations')
      slowOperations.forEach(([name, metric]) => {
        console.log(`${name}: avg ${metric.averageTime.toFixed(2)}ms (${metric.count} calls)`)
      })
      console.groupEnd()
    }
  }
}

// シングルトンインスタンス
const performanceMonitor = new PerformanceMonitor()

// デコレータ関数
export const measure = (name) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = function (...args) {
      return performanceMonitor.measure(name, () => originalMethod.apply(this, args))
    }

    return descriptor
  }
}

// 非同期デコレータ関数
export const measureAsync = (name) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args) {
      return await performanceMonitor.measureAsync(name, () => originalMethod.apply(this, args))
    }

    return descriptor
  }
}

export default performanceMonitor 