import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Switch } from './ui/switch'
import { 
  Save, 
  FolderOpen, 
  FileText, 
  Download, 
  Upload, 
  Trash2, 
  Copy,
  Music,
  Clock,
  Calendar,
  File,
  FilePlus,
  FileDown,
  FileUp,
  FileMusic,
  FileAudio,
  Settings,
  HardDrive,
  Cloud,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  Zap,
  Star,
  Heart
} from 'lucide-react'
import audioExportEngine from '../utils/audioExportEngine.js'

function ProjectMenu({ 
  showProjectMenu, 
  setShowProjectMenu, 
  tracks = [], 
  projectManager,
  onExportMelodia,
  onImportMelodia
}) {

  
  // デフォルト値を安全に設定
  const [projects, setProjects] = useState([])
  const [currentProject, setCurrentProject] = useState(null)
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showFileSaveDialog, setShowFileSaveDialog] = useState(false)
  const [showFileLoadDialog, setShowFileLoadDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [renameProjectName, setRenameProjectName] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [importStatus, setImportStatus] = useState('')
  const [projectInfo, setProjectInfo] = useState(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [autoSaveInterval, setAutoSaveInterval] = useState(30000)
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // プロジェクト一覧を読み込み
  useEffect(() => {
    if (showProjectMenu) {
      loadProjectList()
      // projectManagerのみを使用
      const current = projectManager?.getProject()
      setCurrentProject(current)
      
      // プロジェクト情報を取得
      if (projectManager) {
        const info = projectManager.getProjectInfo()
        setProjectInfo(info)
        setAutoSaveEnabled(info?.metadata?.autoSaveEnabled ?? true)
        setAutoSaveInterval(info?.metadata?.autoSaveInterval ?? 30000)
      }
    } else {
      // メニューが閉じられた時にDialogも閉じる
      setShowNewProjectDialog(false)
      setShowLoadDialog(false)
      setShowImportDialog(false)
      setShowRenameDialog(false)
      setShowFileSaveDialog(false)
      setShowFileLoadDialog(false)
      setSelectedFile(null)
      setImportStatus('')
      setIsLoading(false)
      setStatusMessage('')
    }
  }, [showProjectMenu, projectManager])

  const loadProjectList = () => {
    try {
      // projectManagerのみを使用
      const projectList = projectManager?.getProjectList() || []
      setProjects(projectList)
    } catch (error) {
      console.error('Failed to load project list:', error)
      setProjects([])
    }
  }

  const showStatus = (message, type = 'info') => {
    setStatusMessage(message)
    setTimeout(() => setStatusMessage(''), 3000)
  }

  const handleNewProject = async () => {
    if (!newProjectName.trim()) return

    setIsLoading(true)
    try {
      if (!projectManager) {
        throw new Error('プロジェクトマネージャーが利用できません')
      }
      
      const project = projectManager.createNewProject(newProjectName)
      setCurrentProject(project)
      setNewProjectName('')
      setShowNewProjectDialog(false)
      loadProjectList()
      
      // プロジェクト作成完了を通知
      window.dispatchEvent(new CustomEvent('projectLoaded', { 
        detail: { project } 
      }))
      
      showStatus('プロジェクトを作成しました！', 'success')
    } catch (error) {
      console.error('Failed to create new project:', error)
      showStatus('プロジェクトの作成に失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProject = async () => {
    if (!projectManager) {
      showStatus('プロジェクトマネージャーが利用できません', 'error')
      return
    }

    setIsLoading(true)
    try {
      // projectManagerのみを使用
      console.log('Using projectManager.saveToStorage() (file-based system)')
      projectManager.saveToStorage()
      const currentProject = projectManager.getProject()
      console.log('Current project after save:', currentProject)
      setCurrentProject(currentProject)
      loadProjectList()
      showStatus('プロジェクトの変更を記録しました！', 'success')
      console.log('Project changes marked as unsaved (file-based system)')
    } catch (error) {
      console.error('Failed to save project:', error)
      showStatus('プロジェクトの保存に失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadProject = async (projectId) => {
    setIsLoading(true)
    try {
      if (!projectManager) {
        throw new Error('プロジェクトマネージャーが利用できません')
      }
      
      const project = projectManager.loadProject(projectId)
      if (!project) {
        throw new Error('プロジェクトの読み込みに失敗しました')
      }
      
      setCurrentProject(project)
      setShowLoadDialog(false)
      
      // プロジェクト情報を更新
      const info = projectManager.getProjectInfo()
      setProjectInfo(info)
      
      // プロジェクト読み込み完了を通知
      window.dispatchEvent(new CustomEvent('projectLoaded', { 
        detail: { project } 
      }))
      
      showStatus('プロジェクトを読み込みました！', 'success')
      console.log(`Project "${project.name}" loaded`)
    } catch (error) {
      console.error('Failed to load project:', error)
      showStatus('プロジェクトの読み込みに失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // melodiaファイルとしてエクスポート
  const handleExportMelodia = () => {
    try {
      // App.jsxから渡された関数を使用
      if (onExportMelodia) {
        onExportMelodia()
        showStatus('プロジェクトをエクスポートしました！', 'success')
        return
      }

      // フォールバック: projectManagerを使用
      if (!projectManager) {
        showStatus('プロジェクトマネージャーが利用できません', 'error')
        return
      }

      const currentProject = projectManager.getProject()
      if (!currentProject) {
        showStatus('保存するプロジェクトがありません', 'error')
        return
      }

      // プロジェクトデータを準備
      const projectData = {
        ...currentProject,
        metadata: {
          ...currentProject.metadata,
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          format: 'melodia',
          exportedBy: 'Melodia Composer Copilot'
        }
      }

      // JSONをBlobに変換
      const jsonString = JSON.stringify(projectData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      
      // ファイル名を生成
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const fileName = `${currentProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.melodia`
      
      // ダウンロードリンクを作成
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      showStatus('プロジェクトをエクスポートしました！', 'success')
      console.log('Project exported as melodia file:', fileName)
    } catch (error) {
      console.error('Failed to export project:', error)
      showStatus('プロジェクトのエクスポートに失敗しました', 'error')
    }
  }

  const handleImportMelodia = async () => {
    if (!selectedFile) return

    setIsLoading(true)
    try {
      const fileContent = await selectedFile.text()
      const projectData = JSON.parse(fileContent)
      
      // ファイル形式の検証
      if (projectData.metadata?.format !== 'melodia') {
        throw new Error('無効なMelodiaファイル形式です')
      }

      let importedProject
      
      // projectManagerのみを使用
      if (projectManager) {
        importedProject = projectManager.importFromMelodiaFile(projectData)
      } else {
        // フォールバック: enhancedAudioEngineを使用
        importedProject = enhancedAudioEngine.importProject(projectData)
      }
      
      setCurrentProject(importedProject)
      setSelectedFile(null)
      setShowImportDialog(false)
      loadProjectList()
      
      // プロジェクト読み込み完了を通知
      window.dispatchEvent(new CustomEvent('projectLoaded', { 
        detail: { project: importedProject } 
      }))
      
      showStatus('プロジェクトをインポートしました！', 'success')
      console.log('Project imported successfully:', importedProject.name)
    } catch (error) {
      console.error('Failed to import project:', error)
      showStatus('プロジェクトのインポートに失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      setImportStatus(`選択されたファイル: ${file.name}`)
    }
  }

  const handleDeleteProject = async (projectId) => {
    if (!confirm('このプロジェクトを削除しますか？この操作は元に戻せません。')) {
      return
    }

    setIsLoading(true)
    try {
      // projectManagerのみを使用
      if (projectManager) {
        projectManager.deleteProject(projectId)
      } else {
        // フォールバック: enhancedAudioEngineを使用
        enhancedAudioEngine.deleteProject(projectId)
      }
      
      loadProjectList()
      showStatus('プロジェクトを削除しました', 'success')
      console.log('Project deleted:', projectId)
    } catch (error) {
      console.error('Failed to delete project:', error)
      showStatus('プロジェクトの削除に失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDuplicateProject = async (projectId) => {
    setIsLoading(true)
    try {
      let duplicatedProject
      
      // projectManagerのみを使用
      if (projectManager) {
        duplicatedProject = projectManager.duplicateProject(projectId)
      } else {
        // フォールバック: enhancedAudioEngineを使用
        duplicatedProject = enhancedAudioEngine.duplicateProject(projectId)
      }
      
      loadProjectList()
      showStatus('プロジェクトを複製しました！', 'success')
      console.log('Project duplicated:', duplicatedProject.name)
    } catch (error) {
      console.error('Failed to duplicate project:', error)
      showStatus('プロジェクトの複製に失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }



  const handleExportAudio = async () => {
    try {
      setIsLoading(true)
      const filename = `melodia-${Date.now()}.wav`
      await audioExportEngine.exportToWav(tracks, filename)
      showStatus(`オーディオファイルをエクスポートしました: ${filename}`, 'success')
    } catch (error) {
      console.error('Audio export failed:', error)
      showStatus('オーディオエクスポートに失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportMidi = async () => {
    try {
      setIsLoading(true)
      const filename = `melodia-${Date.now()}.mid`
      audioExportEngine.exportToMidi(tracks, filename)
      showStatus(`MIDIファイルをエクスポートしました: ${filename}`, 'success')
    } catch (error) {
      console.error('MIDI export failed:', error)
      showStatus('MIDIエクスポートに失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportProject = () => {
    showStatus('プロジェクトエクスポート機能は準備中です', 'info')
  }

  const formatDate = (dateString) => {
    if (!dateString) return '不明'
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Dialogが閉じられた時の処理
  const handleNewProjectDialogChange = (open) => {
    setShowNewProjectDialog(open)
    if (!open) {
      setNewProjectName('')
    }
  }

  const handleLoadDialogChange = (open) => {
    setShowLoadDialog(open)
  }

  const handleImportDialogChange = (open) => {
    setShowImportDialog(open)
    if (!open) {
      setSelectedFile(null)
      setImportStatus('')
    }
  }

  // プロジェクト名変更
  const handleRenameProject = async () => {
    console.log('handleRenameProject called:', { 
      renameProjectName, 
      projectManager: !!projectManager,
      projectManagerType: projectManager ? typeof projectManager : 'undefined',
      projectManagerMethods: projectManager ? Object.getOwnPropertyNames(Object.getPrototypeOf(projectManager)) : []
    })
    
    if (!renameProjectName.trim()) {
      console.log('Early return: renameProjectName is empty')
      return
    }
    
    if (!projectManager) {
      console.log('Early return: projectManager is not available')
      showStatus('プロジェクトマネージャーが利用できません', 'error')
      return
    }

    if (typeof projectManager.renameProject !== 'function') {
      console.log('Early return: renameProject method is not available')
      showStatus('名前変更機能が利用できません', 'error')
      return
    }

    setIsLoading(true)
    try {
      console.log('Calling projectManager.renameProject with:', renameProjectName)
      const updatedProject = projectManager.renameProject(renameProjectName)
      console.log('Rename result:', updatedProject)
      setCurrentProject(updatedProject)
      setRenameProjectName('')
      setShowRenameDialog(false)
      loadProjectList()
      
      showStatus('プロジェクト名を変更しました！', 'success')
      console.log('Project renamed successfully')
    } catch (error) {
      console.error('Failed to rename project:', error)
      showStatus('プロジェクト名の変更に失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // ファイル保存
  const handleSaveToFile = async () => {
    if (!projectManager) return

    setIsLoading(true)
    try {
      const fileName = await projectManager.saveProjectToFile()
      showStatus(`プロジェクトをファイルに保存しました: ${fileName}`, 'success')
      setShowFileSaveDialog(false)
    } catch (error) {
      console.error('Failed to save to file:', error)
      showStatus('ファイル保存に失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // ファイル読み込み
  const handleLoadFromFile = async () => {
    if (!selectedFile || !projectManager) return

    setIsLoading(true)
    try {
      const project = await projectManager.loadProjectFromFile(selectedFile)
      setCurrentProject(project)
      setSelectedFile(null)
      setShowFileLoadDialog(false)
      loadProjectList()
      
      // プロジェクト読み込み完了を通知
      window.dispatchEvent(new CustomEvent('projectLoaded', { 
        detail: { project } 
      }))
      
      showStatus('ファイルからプロジェクトを読み込みました！', 'success')
      console.log('Project loaded from file successfully')
    } catch (error) {
      console.error('Failed to load from file:', error)
      showStatus('ファイル読み込みに失敗しました', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // 自動保存設定の変更
  const handleAutoSaveChange = (enabled) => {
    if (!projectManager) return
    
    setAutoSaveEnabled(enabled)
    projectManager.setAutoSaveEnabled(enabled)
    showStatus(`自動保存を${enabled ? '有効' : '無効'}にしました`, 'success')
  }

  // 自動保存間隔の変更
  const handleAutoSaveIntervalChange = (interval) => {
    if (!projectManager) return
    
    setAutoSaveInterval(interval)
    projectManager.setAutoSaveInterval(interval)
    showStatus('自動保存間隔を更新しました', 'success')
  }

  // 早期リターンを削除し、条件付きレンダリングを使用
  try {
    return showProjectMenu ? (
    <div className="project-menu-container absolute top-14 left-4 z-50" onClick={(e) => e.stopPropagation()}>
      <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-72 max-h-[60vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="p-2 border-b border-gray-600/30 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <File className="w-4 h-4 text-white" />
              </div>
              プロジェクト管理
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-400">オンライン</span>
            </div>
          </div>
          
          {/* 現在のプロジェクト - コンパクト版 */}
          {currentProject && (
            <div className="p-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md">
                    <Music className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-blue-300">現在のプロジェクト</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-md"
                  onClick={() => {
                    console.log('Rename button clicked for project:', currentProject.name)
                    setRenameProjectName(currentProject.name)
                    setShowRenameDialog(true)
                  }}
                >
                  <FileText className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-white font-bold text-sm mb-1">{currentProject.name}</div>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(currentProject.metadata?.modifiedAt || currentProject.modifiedAt)}
              </div>
            </div>
          )}
        </div>

        {/* メインコンテンツ */}
        <ScrollArea className="h-[calc(60vh-100px)]">
          <div className="p-2 space-y-2">
            {/* クイックアクション */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                クイックアクション
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <Dialog open={showNewProjectDialog} onOpenChange={handleNewProjectDialogChange}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 hover:from-green-500/20 hover:to-emerald-500/20 text-green-400 hover:text-green-300"
                      disabled={isLoading}
                    >
                      <FilePlus className="w-4 h-4 mr-2" />
                      新規作成
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900/95 border-gray-600 backdrop-blur-xl">
                    <DialogHeader>
                      <DialogTitle className="text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-400" />
                        新しいプロジェクト
                      </DialogTitle>
                      <DialogDescription className="text-gray-400">
                        新しいプロジェクトを作成して音楽制作を始めましょう
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="projectName" className="text-gray-300">プロジェクト名</Label>
                        <Input
                          id="projectName"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="素晴らしい曲の名前を入力..."
                          className="bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                          onKeyPress={(e) => e.key === 'Enter' && handleNewProject()}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleNewProject} 
                          disabled={!newProjectName.trim() || isLoading}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                          作成
                        </Button>
                        <Button variant="outline" onClick={() => handleNewProjectDialogChange(false)}>
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30 hover:from-blue-500/20 hover:to-indigo-500/20 text-blue-400 hover:text-blue-300"
                  onClick={() => {
                    console.log('Save button clicked')
                    handleSaveProject()
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  保存
                </Button>

                <Dialog open={showFileSaveDialog} onOpenChange={setShowFileSaveDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:from-purple-500/20 hover:to-pink-500/20 text-purple-400 hover:text-purple-300"
                      disabled={isLoading}
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      ファイル保存
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900/95 border-gray-600 backdrop-blur-xl">
                    <DialogHeader>
                      <DialogTitle className="text-white flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-purple-400" />
                        プロジェクトをファイルに保存
                      </DialogTitle>
                      <DialogDescription className="text-gray-400">
                        現在のプロジェクトを.melodiaファイルとして保存します
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-gray-300 text-sm">
                        現在のプロジェクトを.melodiaファイルとして保存します。
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveToFile}
                          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                          保存
                        </Button>
                        <Button variant="outline" onClick={() => setShowFileSaveDialog(false)}>
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showFileLoadDialog} onOpenChange={setShowFileLoadDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30 hover:from-orange-500/20 hover:to-red-500/20 text-orange-400 hover:text-orange-300"
                      disabled={isLoading}
                    >
                      <FileUp className="w-4 h-4 mr-2" />
                      ファイル読み込み
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900/95 border-gray-600 backdrop-blur-xl">
                    <DialogHeader>
                      <DialogTitle className="text-white flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-orange-400" />
                        ファイルからプロジェクトを読み込み
                      </DialogTitle>
                      <DialogDescription className="text-gray-400">
                        .melodiaファイルからプロジェクトを読み込みます
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="fileInput" className="text-gray-300">.melodiaファイルを選択</Label>
                        <Input
                          id="fileInput"
                          type="file"
                          accept=".melodia,.json"
                          onChange={handleFileSelect}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      {selectedFile && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">選択されたファイル: {selectedFile.name}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleLoadFromFile} 
                          disabled={!selectedFile || isLoading}
                          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileUp className="w-4 h-4 mr-2" />}
                          読み込み
                        </Button>
                        <Button variant="outline" onClick={() => setShowFileLoadDialog(false)}>
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Separator className="bg-gray-600/30" />

            {/* エクスポート機能 */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Download className="w-4 h-4 text-yellow-400" />
                エクスポート
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 hover:from-green-500/20 hover:to-emerald-500/20 text-green-400 hover:text-green-300"
                  onClick={handleExportAudio}
                  disabled={isLoading}
                >
                  <FileAudio className="w-4 h-4 mr-2" />
                  オーディオ (WAV)
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30 hover:from-blue-500/20 hover:to-indigo-500/20 text-blue-400 hover:text-blue-300"
                  onClick={handleExportMidi}
                  disabled={isLoading}
                >
                  <FileMusic className="w-4 h-4 mr-2" />
                  MIDI
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:from-purple-500/20 hover:to-pink-500/20 text-purple-400 hover:text-purple-300"
                  onClick={handleExportProject}
                  disabled={isLoading}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  プロジェクト共有
                </Button>
              </div>
            </div>

            <Separator className="bg-gray-600/30" />

            {/* プロジェクト一覧 */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-400" />
                保存されたプロジェクト
              </h4>
              
              <Dialog open={showLoadDialog} onOpenChange={handleLoadDialogChange}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30 hover:from-blue-500/20 hover:to-indigo-500/20 text-blue-400 hover:text-blue-300"
                    disabled={isLoading}
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    プロジェクト一覧を表示
                  </Button>
                </DialogTrigger>
                                  <DialogContent className="bg-gray-900/95 border-gray-600 backdrop-blur-xl max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-white flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400" />
                        プロジェクトを読み込み
                      </DialogTitle>
                      <DialogDescription className="text-gray-400">
                        保存されたプロジェクトから選択して読み込みます
                      </DialogDescription>
                    </DialogHeader>
                  <ScrollArea className="h-80">
                    <div className="space-y-3">
                      {projects.map((project) => (
                        <div
                          key={project.id}
                          className="p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-600/30 hover:border-blue-500/50 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
                          onClick={() => handleLoadProject(project.id)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                                <Music className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="font-semibold text-white text-lg">{project.name}</div>
                                <div className="text-xs text-gray-400">{project.trackCount || 0} トラック</div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-blue-500/20"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDuplicateProject(project.id)
                                }}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteProject(project.id)
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(project.modifiedAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {project.tempo || 120} BPM
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                              {project.tempo || 120} BPM
                            </Badge>
                            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                              {project.key || 'C'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {projects.length === 0 && (
                        <div className="text-center py-12">
                          <div className="p-4 bg-gray-800/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <File className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-400 mb-2">保存されたプロジェクトがありません</p>
                          <p className="text-xs text-gray-500">新しいプロジェクトを作成して始めましょう</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>

            <Separator className="bg-gray-600/30" />

            {/* 自動保存設定 */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Settings className="w-4 h-4 text-green-400" />
                自動保存設定
              </h4>
              
              <div className="space-y-4 p-4 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-xl border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-gray-300">自動保存</span>
                  </div>
                  <Switch
                    checked={autoSaveEnabled || false}
                    onCheckedChange={handleAutoSaveChange}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
                
                {autoSaveEnabled && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">保存間隔</label>
                    <select
                      value={autoSaveInterval}
                      onChange={(e) => handleAutoSaveIntervalChange(Number(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    >
                      <option value={15000}>15秒</option>
                      <option value={30000}>30秒</option>
                      <option value={60000}>1分</option>
                      <option value={300000}>5分</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-gray-600/30" />

            {/* その他のエクスポート */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <FileMusic className="w-4 h-4 text-pink-400" />
                その他のエクスポート
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-pink-500/30 hover:from-pink-500/20 hover:to-rose-500/20 text-pink-400 hover:text-pink-300"
                  onClick={handleExportMelodia}
                  disabled={!currentProject || isLoading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Melodia
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 hover:from-yellow-500/20 hover:to-orange-500/20 text-yellow-400 hover:text-yellow-300"
                  onClick={handleExportMidi}
                  disabled={!currentProject || isLoading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  MIDI
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* プロジェクト名変更ダイアログ */}
        <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
          <DialogContent className="bg-gray-900/95 border-gray-600 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                プロジェクト名を変更
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                現在のプロジェクトの名前を変更します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="renameProjectName" className="text-gray-300">新しいプロジェクト名</Label>
                <Input
                  id="renameProjectName"
                  value={renameProjectName}
                  onChange={(e) => setRenameProjectName(e.target.value)}
                  placeholder="新しい名前を入力..."
                  className="bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleRenameProject()}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleRenameProject} 
                  disabled={!renameProjectName.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  変更
                </Button>
                <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                  キャンセル
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ステータスメッセージ */}
        {statusMessage && (
          <div className="fixed bottom-4 left-4 right-4 z-[9999] p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 text-blue-300">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">{statusMessage}</span>
            </div>
          </div>
        )}

        {/* ローディングオーバーレイ */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="p-6 bg-gray-900/95 rounded-xl border border-gray-600/30">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                <span className="text-white">処理中...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null
  } catch (error) {
    console.error('ProjectMenu render error:', error)
    return null
  }
}

export default ProjectMenu

