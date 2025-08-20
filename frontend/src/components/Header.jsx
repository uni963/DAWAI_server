import { Button } from './ui/button.jsx'
import {
  Music,
  FolderOpen,
  Save,
  Settings,
  File,
  ChevronDown,
  Download,
  FileAudio,
  FileMusic,
  Share2,
  Plus
} from 'lucide-react'
import { useState, useRef, memo } from 'react'

const Header = ({ 
  showSettings, 
  setShowSettings,
  onExportAudio,
  onExportMidi
}) => {
  const [showFileMenu, setShowFileMenu] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [currentFileName, setCurrentFileName] = useState('Untitled Project')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const fileInputRef = useRef(null)

  // 新規プロジェクト作成
  const handleNewProject = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('未保存の変更があります。新規プロジェクトを作成しますか？')
      if (!confirmed) return
    }
    
    // プロジェクトデータをリセット
    if (window.projectManager) {
      window.projectManager.resetProject()
    }
    
    setCurrentFileName('Untitled Project')
    setHasUnsavedChanges(false)
    setShowFileMenu(false)
  }

  // ファイルを開く
  const handleOpenFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // ファイル選択時の処理（チャット履歴含む）
  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.dawai')) {
      alert('DAWAIファイル（.dawai）を選択してください。')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const projectData = JSON.parse(e.target.result)
        
        // チャット履歴を抽出
        const chatHistory = projectData.chatHistory || null
        
        if (window.projectManager) {
          // チャット履歴を除いたプロジェクトデータを読み込み
          const { chatHistory: _, ...projectDataWithoutChat } = projectData
          const loadedProject = window.projectManager.loadProjectFromData(projectDataWithoutChat)
          
          // チャット履歴を復元（AIAssistantChatBoxに）
          if (chatHistory && window.aiAssistantChatBox && window.aiAssistantChatBox.importChatHistory) {
            window.aiAssistantChatBox.importChatHistory(chatHistory)
          }
          
          // App.jsxの状態を更新するためのイベントを発火
          window.dispatchEvent(new CustomEvent('projectLoaded', { 
            detail: { project: loadedProject } 
          }))
          
          // 強制的にApp.jsxの状態を更新
          setTimeout(() => {
            if (window.updateProjectState) {
              window.updateProjectState()
            }
          }, 100)
        }
        
        setCurrentFileName(file.name.replace('.dawai', ''))
        setHasUnsavedChanges(false)
        
        console.log('Project loaded with chat history:', !!chatHistory)
      } catch (error) {
        console.error('Failed to load project:', error)
        alert('プロジェクトファイルの読み込みに失敗しました。')
      }
    }
    reader.readAsText(file)
    
    setShowFileMenu(false)
  }

  // 保存
  const handleSave = () => {
    if (currentFileName === 'Untitled Project') {
      handleSaveAs()
      return
    }
    
    saveProjectAsFile(currentFileName + '.dawai')
    setHasUnsavedChanges(false)
    setShowFileMenu(false)
  }

  // 名前を付けて保存
  const handleSaveAs = () => {
    const fileName = prompt('ファイル名を入力してください:', currentFileName)
    if (fileName) {
      saveProjectAsFile(fileName + '.dawai')
      setCurrentFileName(fileName)
      setHasUnsavedChanges(false)
      setShowFileMenu(false)
    }
  }

  // プロジェクトをファイルとして保存（チャット履歴含む）
  const saveProjectAsFile = (fileName) => {
    if (!window.projectManager) {
      console.error('Project manager not available')
      return
    }

    try {
      // プロジェクトデータを取得
      const projectData = window.projectManager.getProjectData()
      
      // チャット履歴を取得（AIAssistantChatBoxから）
      let chatHistory = null
      if (window.aiAssistantChatBox && window.aiAssistantChatBox.exportChatHistory) {
        chatHistory = window.aiAssistantChatBox.exportChatHistory()
      }
      
      // プロジェクトデータにチャット履歴を追加
      const completeProjectData = {
        ...projectData,
        chatHistory: chatHistory,
        metadata: {
          ...projectData.metadata,
          savedAt: new Date().toISOString(),
          includesChatHistory: !!chatHistory
        }
      }
      
      const blob = new Blob([JSON.stringify(completeProjectData, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log('Project saved with chat history:', !!chatHistory)
    } catch (error) {
      console.error('Failed to save project:', error)
      alert('プロジェクトの保存に失敗しました。')
    }
  }

  return (
    <header className="bg-gray-900/95 backdrop-blur-md border-b border-gray-700/50 px-4 py-3 flex items-center justify-between h-14 z-[9999999]">
      {/* 左側: ロゴとファイルメニュー */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <img 
            src="/dawai-logo.png" 
            alt="DAWAI Logo" 
            className="h-8 w-8 object-contain"
          />
          <span className="text-xl font-bold text-white">DAWAI</span>
          {hasUnsavedChanges && (
            <span className="text-xs text-yellow-400 ml-2">*</span>
          )}
        </div>
        
        <nav className="flex items-center space-x-2">
          {/* ファイルメニュー */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-gray-700 flex items-center gap-2 h-9 px-3 font-medium"
              onClick={() => setShowFileMenu(!showFileMenu)}
            >
              <File className="h-4 w-4" />
              File
              <ChevronDown className="h-4 w-4" />
            </Button>
            
            {showFileMenu && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                    onClick={handleNewProject}
                  >
                    <Plus className="h-4 w-4 text-green-400" />
                    New Project
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                    onClick={handleOpenFile}
                  >
                    <FolderOpen className="h-4 w-4 text-blue-400" />
                    Open...
                  </button>
                  <div className="border-t border-gray-600 my-1"></div>
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                    onClick={handleSave}
                  >
                    <Save className="h-4 w-4 text-green-400" />
                    Save
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                    onClick={handleSaveAs}
                  >
                    <Save className="h-4 w-4 text-blue-400" />
                    Save As...
                  </button>
                </div>
              </div>
            )}
            
            {/* 隠しファイル入力 */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".dawai"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
          
          {/* エクスポートメニュー */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-gray-700 flex items-center gap-2 h-9 px-3 font-medium"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4" />
            </Button>
            
            {showExportMenu && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                    onClick={onExportAudio}
                  >
                    <FileAudio className="h-4 w-4 text-green-400" />
                    Export as Audio (WAV)
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                    onClick={onExportMidi}
                  >
                    <FileMusic className="h-4 w-4 text-blue-400" />
                    Export as MIDI
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Share2 className="h-4 w-4 text-purple-400" />
                    Share Project
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* 中央: 現在のファイル名 */}
      <div className="flex-1 text-center">
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-300 font-medium">
            {currentFileName}
          </span>
          <span className="text-xs text-red-400 font-medium mt-1">
            ⚠️ 開発版 - バグが含まれる可能性があります
          </span>
        </div>
      </div>

      {/* 右側: ツールと設定 */}
      <div className="flex items-center space-x-2">
        {/* 設定 */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white hover:bg-gray-700 h-9 px-3 font-medium"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* メニュー外クリックで閉じる */}
      {(showFileMenu || showExportMenu) && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowFileMenu(false)
            setShowExportMenu(false)
          }}
        />
      )}
    </header>
  )
}

export default memo(Header)

