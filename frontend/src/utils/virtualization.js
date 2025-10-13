// 仮想化ユーティリティ
class VirtualizationManager {
  constructor() {
    this.visibleRange = { start: 0, end: 0 }
    this.itemHeight = 0
    this.containerHeight = 0
    this.totalItems = 0
    this.overscan = 5 // 画面外のアイテム数
  }

  // 可視範囲を計算
  calculateVisibleRange(scrollTop, containerHeight, itemHeight, totalItems) {
    this.containerHeight = containerHeight
    this.itemHeight = itemHeight
    this.totalItems = totalItems

    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(
      totalItems - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + this.overscan
    )

    this.visibleRange = {
      start: Math.max(0, start - this.overscan),
      end: end
    }

    return this.visibleRange
  }

  // 仮想化されたアイテムリストを生成
  getVirtualizedItems(items, scrollTop, containerHeight, itemHeight) {
    const range = this.calculateVisibleRange(scrollTop, containerHeight, itemHeight, items.length)
    
    const visibleItems = items.slice(range.start, range.end + 1)
    const offsetY = range.start * itemHeight

    return {
      items: visibleItems,
      offsetY,
      range,
      totalHeight: items.length * itemHeight
    }
  }

  // ノートの仮想化（MIDIエディタ用）
  getVirtualizedNotes(notes, scrollY, containerHeight, noteHeight, timeRange) {
    const startTime = Math.max(0, scrollY / 100) // 仮の時間変換
    const endTime = startTime + (containerHeight / 100)
    
    const visibleNotes = notes.filter(note => 
      note.time >= startTime - 1 && note.time <= endTime + 1
    )

    return {
      notes: visibleNotes,
      timeRange: { start: startTime, end: endTime }
    }
  }

  // トラックの仮想化（ArrangementView用）
  getVirtualizedTracks(tracks, scrollY, containerHeight, trackHeight) {
    const range = this.calculateVisibleRange(scrollY, containerHeight, trackHeight, tracks.length)
    
    const visibleTracks = tracks.slice(range.start, range.end + 1)
    const offsetY = range.start * trackHeight

    return {
      tracks: visibleTracks,
      offsetY,
      range,
      totalHeight: tracks.length * trackHeight
    }
  }
}

// シングルトンインスタンス
const virtualizationManager = new VirtualizationManager()

export default virtualizationManager 