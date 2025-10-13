/**
 * アプリケーション設定管理クラス
 * アプリケーション全体の設定の管理、保存、復元を担当
 */

class AppSettingsManager {
  constructor() {
    this.storageKey = 'dawai_app_settings'
    this.defaultSettings = this.getDefaultSettings()
    this.currentSettings = this.loadSettings()
  }

  /**
   * デフォルト設定を取得
   * @returns {Object} デフォルト設定オブジェクト
   */
  getDefaultSettings() {
    return {
      general: {
        language: '日本語',
        autoSaveInterval: 300000, // 5分
        showStartupTips: true,
        theme: 'dark'
      },
      audio: {
        device: 'Default Audio Device',
        sampleRate: 44100,
        bufferSize: 512
      },
      midi: {
        inputDevice: 'No MIDI Input',
        outputDevice: 'Built-in Synthesizer'
      },
      ui: {
        showMinimap: true,
        showToolbar: true,
        compactMode: false
      },
      midiEditor: {
        ghostTextEnabled: true,
        currentModel: 'musicRnn',
        predictionThreshold: 0.7,
        debounceDelay: 200,
        predictionCount: 5,
        displayCount: 1,
        contextWindow: 16,
        generateSequentialPredictions: true,
        restProbability: 0.15,
        restDetectionThreshold: 0.1,
        developerMode: false
      },
      drumTrack: {
        developerMode: false,
        defaultGridSize: { rows: 8, columns: 16 },
        defaultTempo: 120,
        enableMetronome: true,
        enableLoop: false,
        audioEnabled: true
      }
    }
  }

  /**
   * 現在の設定を取得
   * @returns {Object} 現在の設定オブジェクト
   */
  getSettings() {
    return this.currentSettings
  }

  /**
   * localStorageから設定を読み込み
   * @returns {Object} 読み込まれた設定、またはデフォルト設定
   */
  loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const parsedSettings = JSON.parse(stored)
        // デフォルト設定とマージして、新しい設定項目があっても対応
        return this.mergeSettings(this.defaultSettings, parsedSettings)
      }
    } catch (error) {
      console.warn('設定の読み込みに失敗しました:', error)
    }
    return { ...this.defaultSettings }
  }

  /**
   * 設定をlocalStorageに保存
   * @param {Object} settings - 保存する設定オブジェクト
   */
  saveSettings(settings = this.currentSettings) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(settings))
      console.log('📝 設定が保存されました')
    } catch (error) {
      console.error('設定の保存に失敗しました:', error)
    }
  }

  /**
   * 設定を更新
   * @param {string} category - 設定カテゴリ (general, audio, midi, ui, midiEditor, drumTrack)
   * @param {string} key - 設定項目のキー
   * @param {any} value - 新しい値
   */
  updateSetting(category, key, value) {
    if (!this.currentSettings[category]) {
      console.warn(`設定カテゴリ '${category}' が存在しません`)
      return false
    }

    if (this.validateSettingValue(category, key, value)) {
      this.currentSettings[category][key] = value
      this.saveSettings()
      console.log(`⚙️ 設定更新: ${category}.${key} = ${value}`)
      return true
    }
    return false
  }

  /**
   * 設定オブジェクト全体を更新
   * @param {Object} newSettings - 新しい設定オブジェクト
   */
  updateSettings(newSettings) {
    if (this.validateSettings(newSettings)) {
      this.currentSettings = this.mergeSettings(this.currentSettings, newSettings)
      this.saveSettings()
      console.log('⚙️ 設定が一括更新されました')
      return true
    }
    return false
  }

  /**
   * 特定カテゴリの設定を取得
   * @param {string} category - 設定カテゴリ
   * @returns {Object} カテゴリの設定オブジェクト
   */
  getCategorySettings(category) {
    return this.currentSettings[category] || {}
  }

  /**
   * 特定の設定値を取得
   * @param {string} category - 設定カテゴリ
   * @param {string} key - 設定項目のキー
   * @returns {any} 設定値
   */
  getSetting(category, key) {
    return this.currentSettings[category]?.[key]
  }

  /**
   * 設定をデフォルトにリセット
   * @param {string} category - リセットするカテゴリ（省略時は全体）
   */
  resetSettings(category = null) {
    if (category) {
      if (this.defaultSettings[category]) {
        this.currentSettings[category] = { ...this.defaultSettings[category] }
        console.log(`🔄 ${category}設定をリセットしました`)
      }
    } else {
      this.currentSettings = { ...this.defaultSettings }
      console.log('🔄 全設定をリセットしました')
    }
    this.saveSettings()
  }

  /**
   * 設定の妥当性を検証
   * @param {Object} settings - 検証する設定オブジェクト
   * @returns {boolean} 妥当性
   */
  validateSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      return false
    }

    // 基本的な構造チェック
    const requiredCategories = ['general', 'audio', 'midi', 'ui', 'midiEditor', 'drumTrack']
    for (const category of requiredCategories) {
      if (!settings[category] || typeof settings[category] !== 'object') {
        console.warn(`設定カテゴリ '${category}' が不正です`)
        return false
      }
    }

    return true
  }

  /**
   * 個別設定値の妥当性を検証
   * @param {string} category - 設定カテゴリ
   * @param {string} key - 設定項目のキー
   * @param {any} value - 検証する値
   * @returns {boolean} 妥当性
   */
  validateSettingValue(category, key, value) {
    // カテゴリ別の基本的な型チェック
    const validationRules = {
      general: {
        language: (v) => typeof v === 'string',
        autoSaveInterval: (v) => typeof v === 'number' && v >= 30000,
        showStartupTips: (v) => typeof v === 'boolean',
        theme: (v) => ['dark', 'light'].includes(v)
      },
      audio: {
        device: (v) => typeof v === 'string',
        sampleRate: (v) => [22050, 44100, 48000, 96000].includes(v),
        bufferSize: (v) => [128, 256, 512, 1024, 2048].includes(v)
      },
      midi: {
        inputDevice: (v) => typeof v === 'string',
        outputDevice: (v) => typeof v === 'string'
      },
      ui: {
        showMinimap: (v) => typeof v === 'boolean',
        showToolbar: (v) => typeof v === 'boolean',
        compactMode: (v) => typeof v === 'boolean'
      },
      midiEditor: {
        ghostTextEnabled: (v) => typeof v === 'boolean',
        currentModel: (v) => ['musicRnn', 'musicVae'].includes(v),
        predictionThreshold: (v) => typeof v === 'number' && v >= 0 && v <= 1,
        debounceDelay: (v) => typeof v === 'number' && v >= 100,
        predictionCount: (v) => typeof v === 'number' && v >= 1,
        displayCount: (v) => typeof v === 'number' && v >= 1,
        contextWindow: (v) => typeof v === 'number' && v >= 8,
        generateSequentialPredictions: (v) => typeof v === 'boolean',
        restProbability: (v) => typeof v === 'number' && v >= 0 && v <= 1,
        restDetectionThreshold: (v) => typeof v === 'number' && v >= 0 && v <= 1,
        developerMode: (v) => typeof v === 'boolean'
      },
      drumTrack: {
        developerMode: (v) => typeof v === 'boolean',
        defaultGridSize: (v) => v && typeof v.rows === 'number' && typeof v.columns === 'number',
        defaultTempo: (v) => typeof v === 'number' && v >= 60 && v <= 200,
        enableMetronome: (v) => typeof v === 'boolean',
        enableLoop: (v) => typeof v === 'boolean',
        audioEnabled: (v) => typeof v === 'boolean'
      }
    }

    const categoryRules = validationRules[category]
    if (!categoryRules || !categoryRules[key]) {
      console.warn(`設定項目 '${category}.${key}' の検証ルールが見つかりません`)
      return true // 未知の設定は許可
    }

    const isValid = categoryRules[key](value)
    if (!isValid) {
      console.warn(`設定値が不正です: ${category}.${key} = ${value}`)
    }
    return isValid
  }

  /**
   * 二つの設定オブジェクトを深くマージ
   * @param {Object} target - ベースとなる設定オブジェクト
   * @param {Object} source - マージする設定オブジェクト
   * @returns {Object} マージされた設定オブジェクト
   */
  mergeSettings(target, source) {
    const result = { ...target }

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.mergeSettings(target[key] || {}, source[key])
        } else {
          result[key] = source[key]
        }
      }
    }

    return result
  }

  /**
   * 設定の変更を監視するためのコールバックを登録
   * @param {string} category - 監視するカテゴリ
   * @param {Function} callback - 変更時に実行されるコールバック
   */
  watchCategory(category, callback) {
    // 簡単な実装: 必要に応じてより高度な変更検知を実装
    const originalUpdate = this.updateSetting.bind(this)
    this.updateSetting = (cat, key, value) => {
      const result = originalUpdate(cat, key, value)
      if (result && cat === category) {
        callback(this.getCategorySettings(category))
      }
      return result
    }
  }

  /**
   * 設定の統計情報を取得
   * @returns {Object} 設定統計
   */
  getSettingsStats() {
    return {
      totalCategories: Object.keys(this.currentSettings).length,
      totalSettings: Object.values(this.currentSettings).reduce((total, category) => total + Object.keys(category).length, 0),
      isDefault: JSON.stringify(this.currentSettings) === JSON.stringify(this.defaultSettings),
      lastSaved: localStorage.getItem(this.storageKey + '_lastSaved') || 'Unknown'
    }
  }
}

export default AppSettingsManager