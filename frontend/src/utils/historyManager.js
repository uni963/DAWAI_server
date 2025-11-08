/**
 * HistoryManager - アンドゥ・リドゥ履歴管理システム
 *
 * Piano Track、Bass Trackなど各エディタで独立した履歴管理を提供
 *
 * @class HistoryManager
 * @author Claude Code
 * @date 2025-11-01
 */

export class HistoryManager {
  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory
    this.history = []       // 履歴スタック
    this.currentIndex = -1  // 現在位置（-1は履歴なし状態）
  }

  /**
   * 新しい状態を履歴に追加
   * @param {Object} state - 保存する状態オブジェクト
   */
  push(state) {
    // 現在位置より後ろの履歴を削除（新しい分岐を作成）
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    // 新しい状態を追加
    this.history.push(this._deepClone(state))
    this.currentIndex++

    // 履歴上限チェック
    if (this.history.length > this.maxHistory) {
      this.history.shift()
      this.currentIndex--
    }
  }

  /**
   * アンドゥ（1つ前の状態に戻る）
   * @returns {Object|null} - 前の状態、または履歴がない場合null
   */
  undo() {
    if (!this.canUndo()) {
      return null
    }

    this.currentIndex--
    return this._deepClone(this.history[this.currentIndex])
  }

  /**
   * リドゥ（1つ後の状態に進む）
   * @returns {Object|null} - 次の状態、または履歴がない場合null
   */
  redo() {
    if (!this.canRedo()) {
      return null
    }

    this.currentIndex++
    return this._deepClone(this.history[this.currentIndex])
  }

  /**
   * アンドゥ可能かチェック
   * @returns {boolean}
   */
  canUndo() {
    return this.currentIndex > 0
  }

  /**
   * リドゥ可能かチェック
   * @returns {boolean}
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * 現在の状態を取得
   * @returns {Object|null}
   */
  getCurrentState() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this._deepClone(this.history[this.currentIndex])
    }
    return null
  }

  /**
   * 履歴をクリア
   */
  clear() {
    this.history = []
    this.currentIndex = -1
  }

  /**
   * 履歴情報を取得（デバッグ用）
   * @returns {Object}
   */
  getInfo() {
    return {
      historyLength: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    }
  }

  /**
   * ディープクローン（オブジェクトの完全コピー）
   * @private
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime())
    }

    if (obj instanceof Array) {
      return obj.map(item => this._deepClone(item))
    }

    if (obj instanceof Object) {
      const clonedObj = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this._deepClone(obj[key])
        }
      }
      return clonedObj
    }

    return obj
  }
}

export default HistoryManager
