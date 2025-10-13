import { useCallback, useRef } from 'react'

/**
 * MIDI Persistence Management Hook
 * ローカルストレージ、履歴管理機能を管理
 */
const useMidiPersistence = () => {
  // 履歴管理
  const noteHistoryRef = useRef([])
  const historyIndexRef = useRef(-1)
  const maxHistorySizeRef = useRef(50)
  
  // 永続化設定
  const autoSaveEnabledRef = useRef(true)
  const autoSaveIntervalRef = useRef(30000) // 30秒
  const lastAutoSaveRef = useRef(0)
  
  // ストレージキー
  const STORAGE_KEYS = {
    NOTES: 'melodia_midi_notes',
    PHONEMES: 'melodia_midi_phonemes',
    SETTINGS: 'melodia_midi_settings',
    HISTORY: 'melodia_midi_history',
    PROJECTS: 'melodia_midi_projects'
  }
  
  /**
   * ローカルストレージからデータを読み込み
   */
  const loadFromStorage = useCallback((key, defaultValue = null) => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : defaultValue
    } catch (error) {
      console.error(`ストレージ読み込みエラー (${key}):`, error)
      return defaultValue
    }
  }, [])
  
  /**
   * ローカルストレージにデータを保存
   */
  const saveToStorage = useCallback((key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
      return true
    } catch (error) {
      console.error(`ストレージ保存エラー (${key}):`, error)
      return false
    }
  }, [])
  
  /**
   * ノートデータの保存
   */
  const saveNotes = useCallback((notes, projectId = 'default') => {
    const success = saveToStorage(`${STORAGE_KEYS.NOTES}_${projectId}`, notes)
    if (success) {
      lastAutoSaveRef.current = Date.now()
    }
    return success
  }, [saveToStorage])
  
  /**
   * ノートデータの読み込み
   */
  const loadNotes = useCallback((projectId = 'default') => {
    return loadFromStorage(`${STORAGE_KEYS.NOTES}_${projectId}`, [])
  }, [loadFromStorage])

  /**
   * 音素データの保存
   */
  const savePhonemes = useCallback((phonemes, projectId = 'default') => {
    console.log('useMidiPersistence: 音素データを保存中', { projectId, phonemesCount: Object.keys(phonemes).length, phonemes })
    const success = saveToStorage(`${STORAGE_KEYS.PHONEMES}_${projectId}`, phonemes)
    if (success) {
      lastAutoSaveRef.current = Date.now()
      console.log('useMidiPersistence: 音素データ保存成功', projectId)
    } else {
      console.error('useMidiPersistence: 音素データ保存失敗', projectId)
    }
    return success
  }, [saveToStorage])

  /**
   * 音素データの読み込み
   */
  const loadPhonemes = useCallback((projectId = 'default') => {
    const phonemes = loadFromStorage(`${STORAGE_KEYS.PHONEMES}_${projectId}`, {})
    console.log('useMidiPersistence: 音素データを読み込み中', { projectId, phonemesCount: Object.keys(phonemes).length, phonemes })
    return phonemes
  }, [loadFromStorage])
  
  /**
   * 設定の保存
   */
  const saveSettings = useCallback((settings) => {
    return saveToStorage(STORAGE_KEYS.SETTINGS, settings)
  }, [saveToStorage])
  
  /**
   * 設定の読み込み
   */
  const loadSettings = useCallback(() => {
    return loadFromStorage(STORAGE_KEYS.SETTINGS, {
      tempo: 120,
      zoom: 1,
      instrument: 'piano',
      volume: 0.7,
      metronomeVolume: 0.3,
      autoSave: true,
      ghostTextEnabled: false
    })
  }, [loadFromStorage])
  
  /**
   * プロジェクト一覧の保存
   */
  const saveProjectList = useCallback((projects) => {
    return saveToStorage(STORAGE_KEYS.PROJECTS, projects)
  }, [saveToStorage])
  
  /**
   * プロジェクト一覧の読み込み
   */
  const loadProjectList = useCallback(() => {
    return loadFromStorage(STORAGE_KEYS.PROJECTS, [])
  }, [loadFromStorage])
  
  /**
   * 履歴に状態を追加
   */
  const addToHistory = useCallback((notes, description = '') => {
    const historyEntry = {
      notes: JSON.parse(JSON.stringify(notes)), // ディープコピー
      timestamp: Date.now(),
      description
    }
    
    // 現在のインデックス以降の履歴を削除
    noteHistoryRef.current = noteHistoryRef.current.slice(0, historyIndexRef.current + 1)
    
    // 新しい履歴を追加
    noteHistoryRef.current.push(historyEntry)
    historyIndexRef.current++
    
    // 履歴サイズを制限
    if (noteHistoryRef.current.length > maxHistorySizeRef.current) {
      noteHistoryRef.current.shift()
      historyIndexRef.current--
    }
    
    // 履歴をストレージに保存
    saveToStorage(STORAGE_KEYS.HISTORY, {
      history: noteHistoryRef.current,
      index: historyIndexRef.current
    })
  }, [saveToStorage])
  
  /**
   * 履歴から状態を復元
   */
  const restoreFromHistory = useCallback((direction) => {
    if (direction === 'undo' && historyIndexRef.current > 0) {
      historyIndexRef.current--
    } else if (direction === 'redo' && historyIndexRef.current < noteHistoryRef.current.length - 1) {
      historyIndexRef.current++
    } else {
      return null
    }
    
    const entry = noteHistoryRef.current[historyIndexRef.current]
    return entry ? entry.notes : null
  }, [])
  
  /**
   * 履歴の初期化
   */
  const initializeHistory = useCallback(() => {
    const stored = loadFromStorage(STORAGE_KEYS.HISTORY, { history: [], index: -1 })
    noteHistoryRef.current = stored.history
    historyIndexRef.current = stored.index
  }, [loadFromStorage])
  
  /**
   * 履歴のクリア
   */
  const clearHistory = useCallback(() => {
    noteHistoryRef.current = []
    historyIndexRef.current = -1
    saveToStorage(STORAGE_KEYS.HISTORY, { history: [], index: -1 })
  }, [saveToStorage])
  
  /**
   * 履歴情報の取得
   */
  const getHistoryInfo = useCallback(() => ({
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < noteHistoryRef.current.length - 1,
    currentIndex: historyIndexRef.current,
    totalEntries: noteHistoryRef.current.length,
    lastEntry: noteHistoryRef.current[historyIndexRef.current] || null
  }), [])
  
  /**
   * 自動保存のチェック
   */
  const checkAutoSave = useCallback((notes, projectId = 'default') => {
    if (!autoSaveEnabledRef.current) return false
    
    const now = Date.now()
    if (now - lastAutoSaveRef.current >= autoSaveIntervalRef.current) {
      return saveNotes(notes, projectId)
    }
    return false
  }, [saveNotes])
  
  /**
   * 自動保存設定の更新
   */
  const updateAutoSaveSettings = useCallback((enabled, interval = 30000) => {
    autoSaveEnabledRef.current = enabled
    autoSaveIntervalRef.current = interval
  }, [])
  
  /**
   * プロジェクトのエクスポート
   */
  const exportProject = useCallback((projectId = 'default') => {
    try {
      const notes = loadNotes(projectId)
      const phonemes = loadPhonemes(projectId)
      const settings = loadSettings()
      const projectList = loadProjectList()
      const project = projectList.find(p => p.id === projectId)
      
      const exportData = {
        version: '1.0',
        timestamp: Date.now(),
        project: project || { id: projectId, name: 'Untitled' },
        notes,
        phonemes,
        settings
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project?.name || 'melodia-project'}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      return true
    } catch (error) {
      console.error('プロジェクトエクスポートエラー:', error)
      return false
    }
  }, [loadNotes, loadSettings, loadProjectList])
  
  /**
   * プロジェクトのインポート
   */
  const importProject = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          
          // バージョンチェック
          if (!data.version || !data.notes) {
            throw new Error('無効なプロジェクトファイルです')
          }
          
          // データを保存
          const projectId = data.project?.id || 'imported'
          saveNotes(data.notes, projectId)
          if (data.phonemes) {
            savePhonemes(data.phonemes, projectId)
          }
          if (data.settings) {
            saveSettings(data.settings)
          }
          
          resolve({
            projectId,
            project: data.project,
            notes: data.notes,
            phonemes: data.phonemes || {},
            settings: data.settings
          })
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('ファイル読み込みエラー'))
      reader.readAsText(file)
    })
  }, [saveNotes, saveSettings])
  
  /**
   * ストレージのクリア
   */
  const clearStorage = useCallback(() => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
      return true
    } catch (error) {
      console.error('ストレージクリアエラー:', error)
      return false
    }
  }, [])
  
  /**
   * ストレージ使用量の取得
   */
  const getStorageUsage = useCallback(() => {
    try {
      let totalSize = 0
      Object.values(STORAGE_KEYS).forEach(key => {
        const data = localStorage.getItem(key)
        if (data) {
          totalSize += new Blob([data]).size
        }
      })
      return totalSize
    } catch (error) {
      console.error('ストレージ使用量取得エラー:', error)
      return 0
    }
  }, [])
  
  return {
    // 基本ストレージ操作
    loadFromStorage,
    saveToStorage,
    
    // ノートデータ管理
    saveNotes,
    loadNotes,
    savePhonemes,
    loadPhonemes,
    
    // 設定管理
    saveSettings,
    loadSettings,
    
    // プロジェクト管理
    saveProjectList,
    loadProjectList,
    exportProject,
    importProject,
    
    // 履歴管理
    addToHistory,
    restoreFromHistory,
    initializeHistory,
    clearHistory,
    getHistoryInfo,
    
    // 自動保存
    checkAutoSave,
    updateAutoSaveSettings,
    
    // ストレージ管理
    clearStorage,
    getStorageUsage,
    
    // 定数
    STORAGE_KEYS
  }
}

export default useMidiPersistence 