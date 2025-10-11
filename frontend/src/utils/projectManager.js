// プロジェクト管理クラス
class ProjectManager {
  constructor() {
    this.currentProject = null
    this.projectHistory = []
    this.autoSaveInterval = null
    this.autoSaveEnabled = true
    this.autoSaveIntervalMs = 30000 // 30秒
    this.genreContext = null // ジャンルコンテキスト
    this.demoSongMetadata = null // Demo Songメタデータ
  }

  // 新しいプロジェクトを作成
  createNewProject(name = 'Untitled Project') {
    const project = {
      id: this.generateId(),
      name: name,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      version: '1.0.0',
      tempo: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      key: 'C',
      scale: 'major',
      tracks: [
        {
          id: 'track-1',
          name: 'Piano Track',
          type: 'instrument',
          subtype: 'piano',
          color: '#3B82F6',
          volume: 75,
          pan: 0,
          muted: false,
          solo: false,
          armed: false,
          clips: [],
          effects: [],
          midiData: null,
          audioData: null,
          settings: {
            midiChannel: 0,
            octave: 0,
            transpose: 0,
            velocity: 100
          },
          metadata: {
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            description: '',
            tags: []
          }
        }
      ],
      masterSettings: {
        volume: 75,
        effects: []
      },
      metadata: {
        artist: '',
        genre: '',
        description: '',
        tags: []
      },
      scaleConstraints: null, // スケール制約
      genreContext: null, // ジャンルコンテキスト
      demoSongMetadata: null // Demo Songメタデータ
    }

    this.currentProject = project
    this.genreContext = null
    this.demoSongMetadata = null
    this.startAutoSave()
    return project
  }

  // ===== Demo Song管理用メソッド =====

  /**
   * 新しいプロジェクトを作成（DemoSongManager用エイリアス）
   */
  newProject() {
    this.createNewProject('Untitled Project')
  }

  /**
   * プロジェクト名を設定
   * @param {string} name - プロジェクト名
   */
  setProjectName(name) {
    if (!this.currentProject) {
      throw new Error('No current project')
    }
    this.currentProject.name = name
    this.currentProject.modifiedAt = new Date().toISOString()
    console.log(`✅ プロジェクト名設定: ${name}`)
  }

  /**
   * テンポを設定
   * @param {number} tempo - BPM値
   */
  setTempo(tempo) {
    if (!this.currentProject) {
      throw new Error('No current project')
    }
    this.currentProject.tempo = tempo
    this.currentProject.modifiedAt = new Date().toISOString()
    console.log(`✅ テンポ設定: ${tempo} BPM`)
  }

  /**
   * 拍子を設定
   * @param {string} timeSignature - 拍子（例: "4/4"）
   */
  setTimeSignature(timeSignature) {
    if (!this.currentProject) {
      throw new Error('No current project')
    }
    const [numerator, denominator] = timeSignature.split('/').map(Number)
    this.currentProject.timeSignature = { numerator, denominator }
    this.currentProject.modifiedAt = new Date().toISOString()
    console.log(`✅ 拍子設定: ${timeSignature}`)
  }

  /**
   * スケール制約を設定
   * @param {Object} constraints - スケール制約オブジェクト
   */
  setScaleConstraints(constraints) {
    if (!this.currentProject) {
      console.warn('⚠️ No current project for scale constraints')
      return
    }
    this.currentProject.scaleConstraints = constraints
    this.currentProject.modifiedAt = new Date().toISOString()
    console.log('✅ スケール制約設定:', constraints)
  }

  /**
   * ジャンルコンテキストを設定
   * @param {Object} context - ジャンルコンテキストオブジェクト
   */
  setGenreContext(context) {
    this.genreContext = context
    if (this.currentProject) {
      this.currentProject.genreContext = context
      this.currentProject.modifiedAt = new Date().toISOString()
    }
    console.log('✅ ジャンルコンテキスト設定:', context?.genre?.name?.ja || context?.genre?.name)
  }

  /**
   * ジャンルコンテキストを取得
   * @returns {Object|null} ジャンルコンテキスト
   */
  getGenreContext() {
    return this.genreContext || this.currentProject?.genreContext || null
  }

  /**
   * Demo Songメタデータを設定
   * @param {Object} metadata - Demo Songメタデータ
   */
  setDemoSongMetadata(metadata) {
    this.demoSongMetadata = metadata
    if (this.currentProject) {
      this.currentProject.demoSongMetadata = metadata
      this.currentProject.modifiedAt = new Date().toISOString()
    }
    console.log('✅ Demo Songメタデータ設定:', metadata)
  }

  /**
   * Demo Songメタデータを取得
   * @returns {Object|null} Demo Songメタデータ
   */
  getDemoSongMetadata() {
    return this.demoSongMetadata || this.currentProject?.demoSongMetadata || null
  }

  // ===== 既存メソッド =====

  // プロジェクトを保存
  saveProject(project = null) {
    const projectToSave = project || this.currentProject
    if (!projectToSave) {
      throw new Error('No project to save')
    }

    // 保存時刻を更新
    projectToSave.modifiedAt = new Date().toISOString()

    // データを新しい形式に変換してから保存
    const migratedProject = this.migrateProjectData(projectToSave)

    try {
      // ローカルストレージに保存
      const projectData = JSON.stringify(migratedProject, null, 2)
      localStorage.setItem(`project_${migratedProject.id}`, projectData)

      // プロジェクト一覧を更新
      this.updateProjectList(migratedProject)

      console.log(`Project "${migratedProject.name}" saved successfully`)
      return true
    } catch (error) {
      console.error('Failed to save project:', error)
      throw error
    }
  }

  // プロジェクトを読み込み
  loadProject(projectId) {
    try {
      const projectData = localStorage.getItem(`project_${projectId}`)
      if (!projectData) {
        throw new Error(`Project with ID ${projectId} not found`)
      }

      const project = JSON.parse(projectData)

      // データを新しい形式に変換
      const migratedProject = this.migrateProjectData(project)

      this.currentProject = migratedProject
      this.genreContext = migratedProject.genreContext || null
      this.demoSongMetadata = migratedProject.demoSongMetadata || null
      this.startAutoSave()

      console.log(`Project "${migratedProject.name}" loaded successfully`)
      return migratedProject
    } catch (error) {
      console.error('Failed to load project:', error)
      throw error
    }
  }

  // プロジェクトをファイルとしてエクスポート
  exportProject(project = null) {
    const projectToExport = project || this.currentProject
    if (!projectToExport) {
      throw new Error('No project to export')
    }

    const projectData = JSON.stringify(projectToExport, null, 2)
    const blob = new Blob([projectData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    // ダウンロードリンクを作成
    const link = document.createElement('a')
    link.href = url
    link.download = `${projectToExport.name.replace(/[^a-z0-9]/gi, '_')}.melodia`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
    console.log(`Project "${projectToExport.name}" exported successfully`)
  }

  // プロジェクトファイルをインポート
  importProject(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        try {
          const projectData = JSON.parse(event.target.result)

          // プロジェクトデータの検証
          if (!this.validateProjectData(projectData)) {
            throw new Error('Invalid project file format')
          }

          // 新しいIDを生成（重複を避けるため）
          projectData.id = this.generateId()
          projectData.modifiedAt = new Date().toISOString()

          this.currentProject = projectData
          this.genreContext = projectData.genreContext || null
          this.demoSongMetadata = projectData.demoSongMetadata || null
          this.saveProject() // ローカルストレージにも保存
          this.startAutoSave()

          console.log(`Project "${projectData.name}" imported successfully`)
          resolve(projectData)
        } catch (error) {
          console.error('Failed to import project:', error)
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read project file'))
      }

      reader.readAsText(file)
    })
  }

  // プロジェクトデータの検証
  validateProjectData(data) {
    const requiredFields = ['name', 'tracks', 'tempo']
    return requiredFields.every(field => data.hasOwnProperty(field))
  }

  // 古い形式のプロジェクトデータを新しい形式に変換
  migrateProjectData(data) {
    if (!data.tracks || !Array.isArray(data.tracks)) {
      return data
    }

    const migratedTracks = data.tracks.map(track => {
      // 既に新しい形式の場合はそのまま返す
      if (track.subtype && track.settings) {
        return track
      }

      // 古い形式から新しい形式に変換
      const newTrack = {
        id: track.id,
        name: track.name,
        type: this.mapOldTypeToNew(track.type),
        subtype: this.mapOldTypeToSubtype(track.type),
        color: this.mapOldColorToNew(track.color),
        volume: track.volume || 75,
        pan: track.pan || 0,
        muted: track.muted || false,
        solo: track.solo || false,
        armed: track.armed || false,
        clips: track.clips || [],
        effects: track.effects || [],
        midiData: track.midiData || null,
        audioData: track.audioData || null,
        settings: {
          midiChannel: 0,
          octave: 0,
          transpose: 0,
          velocity: 100
        },
        metadata: {
          createdAt: track.metadata?.createdAt || new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          description: track.metadata?.description || '',
          tags: track.metadata?.tags || []
        }
      }

      return newTrack
    })

    return {
      ...data,
      tracks: migratedTracks,
      // mixerChannelsは削除（トラックから動的に生成）
      mixerChannels: undefined
    }
  }

  // 古いトラックタイプを新しいタイプにマッピング
  mapOldTypeToNew(oldType) {
    const typeMap = {
      'piano': 'instrument',
      'drums': 'drums',
      'bass': 'bass',
      'lead': 'lead',
      'pad': 'pad',
      'fx': 'fx',
      'audio': 'audio',
      'midi': 'midi',
      'voiceSynth': 'voiceSynth'
    }
    return typeMap[oldType] || 'instrument'
  }

  // 古いトラックタイプをサブタイプにマッピング
  mapOldTypeToSubtype(oldType) {
    const subtypeMap = {
      'piano': 'piano',
      'drums': 'drums',
      'bass': 'bass',
      'lead': 'synth',
      'pad': 'strings',
      'fx': 'fx',
      'audio': 'vocal',
      'midi': 'piano',
      'voiceSynth': 'diffsinger'
    }
    return subtypeMap[oldType] || 'piano'
  }

  // 古い色を新しい色にマッピング
  mapOldColorToNew(oldColor) {
    const colorMap = {
      'blue': '#3B82F6',
      'red': '#EF4444',
      'green': '#10B981',
      'purple': '#8B5CF6',
      'yellow': '#F59E0B',
      'orange': '#F97316'
    }
    return colorMap[oldColor] || '#3B82F6'
  }

  // プロジェクト一覧を取得
  getProjectList() {
    try {
      const projectListData = localStorage.getItem('project_list')
      return projectListData ? JSON.parse(projectListData) : []
    } catch (error) {
      console.error('Failed to get project list:', error)
      return []
    }
  }

  // プロジェクト一覧を更新
  updateProjectList(project) {
    try {
      let projectList = this.getProjectList()

      // 既存のプロジェクトを更新または新規追加
      const existingIndex = projectList.findIndex(p => p.id === project.id)
      const projectSummary = {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        modifiedAt: project.modifiedAt,
        trackCount: project.tracks.length,
        tempo: project.tempo,
        key: project.key
      }

      if (existingIndex >= 0) {
        projectList[existingIndex] = projectSummary
      } else {
        projectList.push(projectSummary)
      }

      // 更新日時でソート
      projectList.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))

      localStorage.setItem('project_list', JSON.stringify(projectList))
    } catch (error) {
      console.error('Failed to update project list:', error)
    }
  }

  // プロジェクトを削除
  deleteProject(projectId) {
    try {
      // ローカルストレージから削除
      localStorage.removeItem(`project_${projectId}`)

      // プロジェクト一覧から削除
      let projectList = this.getProjectList()
      projectList = projectList.filter(p => p.id !== projectId)
      localStorage.setItem('project_list', JSON.stringify(projectList))

      // 現在のプロジェクトが削除された場合
      if (this.currentProject && this.currentProject.id === projectId) {
        this.currentProject = null
        this.genreContext = null
        this.demoSongMetadata = null
        this.stopAutoSave()
      }

      console.log(`Project with ID ${projectId} deleted successfully`)
      return true
    } catch (error) {
      console.error('Failed to delete project:', error)
      throw error
    }
  }

  // プロジェクトを複製
  duplicateProject(projectId, newName = null) {
    try {
      const originalProject = this.loadProject(projectId)
      const duplicatedProject = JSON.parse(JSON.stringify(originalProject))

      duplicatedProject.id = this.generateId()
      duplicatedProject.name = newName || `${originalProject.name} (Copy)`
      duplicatedProject.createdAt = new Date().toISOString()
      duplicatedProject.modifiedAt = new Date().toISOString()

      this.currentProject = duplicatedProject
      this.genreContext = duplicatedProject.genreContext || null
      this.demoSongMetadata = duplicatedProject.demoSongMetadata || null
      this.saveProject()

      console.log(`Project duplicated: "${duplicatedProject.name}"`)
      return duplicatedProject
    } catch (error) {
      console.error('Failed to duplicate project:', error)
      throw error
    }
  }

  // 自動保存を開始
  startAutoSave() {
    if (!this.autoSaveEnabled) return

    this.stopAutoSave() // 既存のタイマーをクリア

    this.autoSaveInterval = setInterval(() => {
      if (this.currentProject) {
        try {
          this.saveProject()
          console.log('Auto-save completed')
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }
    }, this.autoSaveIntervalMs)
  }

  // 自動保存を停止
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
  }

  // 自動保存設定を変更
  setAutoSave(enabled, intervalMs = 30000) {
    this.autoSaveEnabled = enabled
    this.autoSaveIntervalMs = intervalMs

    if (enabled) {
      this.startAutoSave()
    } else {
      this.stopAutoSave()
    }
  }

  // プロジェクトの変更を記録（アンドゥ/リドゥ用）
  recordChange(changeDescription) {
    if (!this.currentProject) return

    if (!this.currentProject.history) {
      this.currentProject.history = []
    }

    const snapshot = {
      timestamp: new Date().toISOString(),
      description: changeDescription,
      data: JSON.parse(JSON.stringify(this.currentProject))
    }

    this.currentProject.history.push(snapshot)

    // 履歴の上限を設定（メモリ使用量を制限）
    const maxHistorySize = 50
    if (this.currentProject.history.length > maxHistorySize) {
      this.currentProject.history = this.currentProject.history.slice(-maxHistorySize)
    }
  }

  // プロジェクトの統計情報を取得
  getProjectStats(project = null) {
    const proj = project || this.currentProject
    if (!proj) return null

    return {
      trackCount: proj.tracks.length,
      totalClips: proj.tracks.reduce((sum, track) => sum + (track.clips?.length || 0), 0),
      totalEffects: proj.tracks.reduce((sum, track) => sum + (track.effects?.length || 0), 0),
      duration: this.calculateProjectDuration(proj),
      fileSize: new Blob([JSON.stringify(proj)]).size,
      lastModified: proj.modifiedAt
    }
  }

  // プロジェクトの長さを計算
  calculateProjectDuration(project) {
    // 簡易実装：すべてのクリップの最大終了時間を計算
    let maxEndTime = 0

    project.tracks.forEach(track => {
      if (track.clips) {
        track.clips.forEach(clip => {
          const endTime = (clip.startTime || 0) + (clip.duration || 0)
          maxEndTime = Math.max(maxEndTime, endTime)
        })
      }
    })

    return maxEndTime
  }

  // ユニークIDを生成
  generateId() {
    return 'proj_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  // 現在のプロジェクトを取得
  getCurrentProject() {
    return this.currentProject
  }

  // プロジェクトを更新
  updateCurrentProject(updates) {
    if (!this.currentProject) {
      throw new Error('No current project to update')
    }

    Object.assign(this.currentProject, updates)
    this.currentProject.modifiedAt = new Date().toISOString()
  }

  // ストレージ使用量を取得
  getStorageUsage() {
    let totalSize = 0
    const projectList = this.getProjectList()

    projectList.forEach(project => {
      const projectData = localStorage.getItem(`project_${project.id}`)
      if (projectData) {
        totalSize += new Blob([projectData]).size
      }
    })

    return {
      totalSize,
      projectCount: projectList.length,
      formattedSize: this.formatBytes(totalSize)
    }
  }

  // バイト数を読みやすい形式に変換
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// シングルトンインスタンス
const projectManager = new ProjectManager()

export default projectManager
