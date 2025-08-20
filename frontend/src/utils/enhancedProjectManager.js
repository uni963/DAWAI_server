// 拡張プロジェクトマネージャー - 詳細なデータ構造とAIチャット履歴対応
class EnhancedProjectManager {
  constructor() {
    this.currentProject = null
    this.projectHistory = []
    this.autoSaveInterval = null
    this.autoSaveEnabled = true
    this.autoSaveIntervalMs = 30000 // 30秒
    this.version = '1.0.0'
  }

  // 新しいプロジェクトを作成（拡張版）
  createNewProject(name = 'Untitled Project') {
    const project = {
      // プロジェクト基本情報
      id: this.generateId(),
      name: name,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      version: this.version,
      
      // 音楽設定
      tempo: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      key: 'C',
      scale: 'major',
      swing: 0,
      
      // トラックデータ（拡張版）
      tracks: [
        {
          id: 'track-1',
          name: 'Piano Track',
          type: 'instrument', // audio, midi, instrument, bus
          color: '#3B82F6',
          volume: 75,
          pan: 0,
          muted: false,
          solo: false,
          armed: false, // 録音準備状態
          channel: 0,
          
          // エフェクトチェーン
          effects: [],
          
          // クリップ/リージョンデータ
          clips: [],
          
          // オートメーション
          automation: {
            volume: [],
            pan: [],
            effects: {}
          },
          
          // トラック設定
          settings: {
            inputDevice: null,
            outputDevice: null,
            recordFormat: 'wav',
            recordQuality: '24bit',
            latency: 0
          }
        }
      ],
      
      // ミキサーデータ（拡張版）
      mixerChannels: [
        {
          id: 'track-1',
          name: 'Piano',
          type: 'instrument',
          volume: 75,
          pan: 0,
          muted: false,
          solo: false,
          color: '#3B82F6',
          
          // エフェクトスロット
          effectSlots: [
            { id: 'slot-1', effect: null, enabled: false, parameters: {} },
            { id: 'slot-2', effect: null, enabled: false, parameters: {} },
            { id: 'slot-3', effect: null, enabled: false, parameters: {} },
            { id: 'slot-4', effect: null, enabled: false, parameters: {} }
          ],
          
          // センド/リターン
          sends: [],
          
          // バス設定
          bus: null
        }
      ],
      
      // バス設定
      buses: [
        {
          id: 'master-bus',
          name: 'Master',
          type: 'master',
          volume: 75,
          effects: [],
          color: '#10B981'
        }
      ],
      
      // マスター設定
      masterSettings: {
        volume: 75,
        effects: [],
        limiter: {
          enabled: false,
          threshold: -1,
          ratio: 10,
          attack: 0.001,
          release: 0.1
        }
      },
      
      // タイムライン設定
      timeline: {
        startTime: 0,
        endTime: 300, // 5分
        gridSize: 16, // 16分音符
        snapToGrid: true,
        markers: [],
        regions: []
      },
      
      // AIチャット履歴
      aiChatHistory: [
        {
          id: 'session-1',
          name: '現在のセッション',
          createdAt: new Date().toISOString(),
          messages: [
            {
              id: 1,
              sender: 'assistant',
              text: 'こんにちは！音楽制作のお手伝いをします。何か作りたい曲のイメージはありますか？',
              timestamp: new Date().toISOString(),
              type: 'text',
              metadata: {
                model: 'gpt-4',
                tokens: 45
              }
            }
          ],
          generatedMusic: [] // 生成された音楽データへの参照
        }
      ],
      
      // メタデータ
      metadata: {
        artist: '',
        genre: '',
        description: '',
        tags: [],
        bpm: 120,
        key: 'C',
        mood: '',
        instruments: [],
        duration: 0
      },
      
      // プロジェクト履歴（Undo/Redo用）
      history: [],
      historyIndex: -1,
      maxHistorySize: 50
    }

    this.currentProject = project
    this.startAutoSave()
    return project
  }

  // クリップを作成
  createClip(trackId, clipData) {
    if (!this.currentProject) return null

    const track = this.currentProject.tracks.find(t => t.id === trackId)
    if (!track) return null

    const clip = {
      id: this.generateClipId(),
      name: clipData.name || 'Untitled Clip',
      type: clipData.type || 'audio', // audio, midi, region
      startTime: clipData.startTime || 0,
      duration: clipData.duration || 4, // 4小節
      endTime: (clipData.startTime || 0) + (clipData.duration || 4),
      
      // クリップ設定
      loop: {
        enabled: false,
        count: 1,
        crossfade: 0
      },
      
      // フェード設定
      fade: {
        in: { enabled: false, duration: 0 },
        out: { enabled: false, duration: 0 }
      },
      
      // オートメーション
      automation: {
        volume: [],
        pan: [],
        effects: {}
      },
      
      // クリップ固有データ
      data: clipData.data || {},
      
      // MIDIデータ（MIDIクリップの場合）
      midiData: clipData.type === 'midi' ? {
        notes: [],
        controller: [],
        tempo: [],
        timeSignature: []
      } : null,
      
      // オーディオデータ（オーディオクリップの場合）
      audioData: clipData.type === 'audio' ? {
        buffer: null,
        sampleRate: 44100,
        channels: 2,
        duration: clipData.duration || 4
      } : null,
      
      // メタデータ
      metadata: {
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        source: clipData.source || 'manual',
        tags: clipData.tags || []
      }
    }

    if (!track.clips) track.clips = []
    track.clips.push(clip)
    
    this.recordChange(`Created clip: ${clip.name}`)
    return clip
  }

  // リージョンを作成
  createRegion(regionData) {
    if (!this.currentProject) return null

    const region = {
      id: this.generateRegionId(),
      name: regionData.name || 'Untitled Region',
      startTime: regionData.startTime || 0,
      endTime: regionData.endTime || 4,
      duration: (regionData.endTime || 4) - (regionData.startTime || 0),
      
      // リージョン設定
      color: regionData.color || '#EF4444',
      locked: false,
      muted: false,
      
      // リージョン内のクリップ参照
      clipRefs: regionData.clipRefs || [],
      
      // メタデータ
      metadata: {
        createdAt: new Date().toISOString(),
        description: regionData.description || '',
        tags: regionData.tags || []
      }
    }

    if (!this.currentProject.timeline.regions) {
      this.currentProject.timeline.regions = []
    }
    this.currentProject.timeline.regions.push(region)
    
    this.recordChange(`Created region: ${region.name}`)
    return region
  }

  // AIチャットメッセージを追加
  addChatMessage(sessionId, message) {
    if (!this.currentProject) return null

    const session = this.currentProject.aiChatHistory.find(s => s.id === sessionId)
    if (!session) return null

    const chatMessage = {
      id: this.generateMessageId(),
      sender: message.sender, // 'user' or 'assistant'
      text: message.text,
      timestamp: new Date().toISOString(),
      type: message.type || 'text', // text, music, command
      
      // メッセージ固有データ
      data: message.data || {},
      
      // メタデータ
      metadata: {
        model: message.metadata?.model || 'gpt-4',
        tokens: message.metadata?.tokens || 0,
        processingTime: message.metadata?.processingTime || 0
      }
    }

    session.messages.push(chatMessage)
    
    // 生成された音楽データへの参照を追加
    if (message.generatedMusic) {
      if (!session.generatedMusic) session.generatedMusic = []
      session.generatedMusic.push({
        messageId: chatMessage.id,
        musicData: message.generatedMusic
      })
    }
    
    this.recordChange(`Added chat message: ${message.sender}`)
    return chatMessage
  }

  // 新しいチャットセッションを作成
  createChatSession(name = null) {
    if (!this.currentProject) return null

    const session = {
      id: this.generateSessionId(),
      name: name || `Session ${this.currentProject.aiChatHistory.length + 1}`,
      createdAt: new Date().toISOString(),
      messages: [],
      generatedMusic: []
    }

    this.currentProject.aiChatHistory.push(session)
    this.recordChange(`Created chat session: ${session.name}`)
    return session
  }

  // プロジェクトを保存（拡張版）
  saveProject(project = null) {
    const projectToSave = project || this.currentProject
    if (!projectToSave) {
      throw new Error('No project to save')
    }

    // 保存時刻を更新
    projectToSave.modifiedAt = new Date().toISOString()

    try {
      // プロジェクトデータを最適化
      const optimizedProject = this.optimizeProjectData(projectToSave)
      
      // ローカルストレージに保存
      const projectData = JSON.stringify(optimizedProject, null, 2)
      localStorage.setItem(`project_${projectToSave.id}`, projectData)

      // プロジェクト一覧を更新
      this.updateProjectList(projectToSave)

      console.log(`Project "${projectToSave.name}" saved successfully`)
      return true
    } catch (error) {
      console.error('Failed to save project:', error)
      throw error
    }
  }

  // プロジェクトデータを最適化
  optimizeProjectData(project) {
    const optimized = { ...project }
    
    // 大きなオーディオバッファは除外
    optimized.tracks = optimized.tracks.map(track => ({
      ...track,
      clips: track.clips?.map(clip => ({
        ...clip,
        audioData: clip.audioData ? {
          ...clip.audioData,
          buffer: null // オーディオバッファは除外
        } : null
      })) || []
    }))
    
    return optimized
  }

  // .melodiaファイルとしてエクスポート
  exportMelodiaFile(project = null) {
    const projectToExport = project || this.currentProject
    if (!projectToExport) {
      throw new Error('No project to export')
    }

    // エクスポート用データを準備
    const exportData = {
      ...projectToExport,
      exportInfo: {
        exportedAt: new Date().toISOString(),
        version: this.version,
        format: 'melodia'
      }
    }

    const projectData = JSON.stringify(exportData, null, 2)
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
    console.log(`Project "${projectToExport.name}" exported as .melodia file`)
  }

  // .melodiaファイルをインポート
  importMelodiaFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        try {
          const projectData = JSON.parse(event.target.result)
          
          // プロジェクトデータの検証
          if (!this.validateMelodiaFile(projectData)) {
            throw new Error('Invalid .melodia file format')
          }

          // 新しいIDを生成（重複を避けるため）
          projectData.id = this.generateId()
          projectData.modifiedAt = new Date().toISOString()

          this.currentProject = projectData
          this.saveProject() // ローカルストレージにも保存
          this.startAutoSave()

          console.log(`Project "${projectData.name}" imported successfully`)
          resolve(projectData)
        } catch (error) {
          console.error('Failed to import .melodia file:', error)
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read .melodia file'))
      }

      reader.readAsText(file)
    })
  }

  // .melodiaファイルの検証
  validateMelodiaFile(data) {
    const requiredFields = ['name', 'tracks', 'tempo', 'version']
    const hasRequiredFields = requiredFields.every(field => data.hasOwnProperty(field))
    
    // バージョン互換性チェック
    const isCompatibleVersion = this.checkVersionCompatibility(data.version)
    
    return hasRequiredFields && isCompatibleVersion
  }

  // バージョン互換性チェック
  checkVersionCompatibility(fileVersion) {
    // 簡易実装：メジャーバージョンが同じかチェック
    const currentMajor = this.version.split('.')[0]
    const fileMajor = fileVersion.split('.')[0]
    return currentMajor === fileMajor
  }

  // ユニークID生成
  generateId() {
    return 'proj_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  generateClipId() {
    return 'clip_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  generateRegionId() {
    return 'region_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  generateSessionId() {
    return 'session_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  generateMessageId() {
    return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  // 変更記録（Undo/Redo用）
  recordChange(changeDescription) {
    if (!this.currentProject) return

    if (!this.currentProject.history) {
      this.currentProject.history = []
      this.currentProject.historyIndex = -1
    }

    // 現在位置より後の履歴を削除
    this.currentProject.history = this.currentProject.history.slice(0, this.currentProject.historyIndex + 1)

    const snapshot = {
      timestamp: new Date().toISOString(),
      description: changeDescription,
      data: JSON.parse(JSON.stringify(this.currentProject))
    }

    this.currentProject.history.push(snapshot)
    this.currentProject.historyIndex++

    // 履歴の上限を設定
    if (this.currentProject.history.length > this.currentProject.maxHistorySize) {
      this.currentProject.history = this.currentProject.history.slice(-this.currentProject.maxHistorySize)
      this.currentProject.historyIndex = this.currentProject.history.length - 1
    }
  }

  // Undo機能
  undo() {
    if (!this.currentProject || !this.currentProject.history || this.currentProject.historyIndex <= 0) {
      return false
    }

    this.currentProject.historyIndex--
    const previousState = this.currentProject.history[this.currentProject.historyIndex]
    this.currentProject = JSON.parse(JSON.stringify(previousState.data))
    
    console.log(`Undo: ${previousState.description}`)
    return true
  }

  // Redo機能
  redo() {
    if (!this.currentProject || !this.currentProject.history || 
        this.currentProject.historyIndex >= this.currentProject.history.length - 1) {
      return false
    }

    this.currentProject.historyIndex++
    const nextState = this.currentProject.history[this.currentProject.historyIndex]
    this.currentProject = JSON.parse(JSON.stringify(nextState.data))
    
    console.log(`Redo: ${nextState.description}`)
    return true
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

  // プロジェクト一覧を更新
  updateProjectList(project) {
    try {
      let projectList = this.getProjectList()
      
      const projectSummary = {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        modifiedAt: project.modifiedAt,
        trackCount: project.tracks.length,
        tempo: project.tempo,
        key: project.key,
        duration: this.calculateProjectDuration(project)
      }

      const existingIndex = projectList.findIndex(p => p.id === project.id)
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

  // プロジェクトの長さを計算
  calculateProjectDuration(project) {
    let maxEndTime = 0
    
    project.tracks.forEach(track => {
      if (track.clips) {
        track.clips.forEach(clip => {
          const endTime = clip.startTime + clip.duration
          maxEndTime = Math.max(maxEndTime, endTime)
        })
      }
    })

    return maxEndTime
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

  // プロジェクトを破棄
  destroy() {
    this.stopAutoSave()
    this.currentProject = null
    this.projectHistory = []
  }
}

// シングルトンインスタンス
const enhancedProjectManager = new EnhancedProjectManager()

export default enhancedProjectManager 