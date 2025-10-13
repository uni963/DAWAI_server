import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button.jsx'
import { Input } from './ui/input.jsx'
import cacheManager from '../utils/cacheManager.js'
import {
  X,
  Settings,
  Volume2,
  Key,
  Brain,
  Palette,
  Smartphone,
  BookOpen,
  Music,
  Users,
  Eye,
  EyeOff,
  Check,
  Wifi,
  Trash2,
  RefreshCw
} from 'lucide-react'

const SettingsModal = ({ 
  showSettings, 
  setShowSettings, 
  activeSettingsSection, 
  setActiveSettingsSection,
  globalSettings,
  updateGlobalSettings,
  appSettings,
  updateAppSettings
}) => {
  // 包括的な設定状態
  const [allSettings, setAllSettings] = useState(() => {
    // appSettingsから初期値を取得
    const initialSettings = {
      // AI Assistant設定
      aiAssistant: {
        availableModels: {
          'claude-3-opus': false,
          'claude-3-sonnet': false,
          'gpt-4': false,
          'gpt-3.5-turbo': false,
          'gemini-pro': false,
          'gemini-1.5-pro': false
        },
        apiKeys: {
          anthropic: '',
          openai: '',
          google: ''
        },
        showApiKeys: {
          anthropic: false,
          openai: false,
          google: false
        }
      },
      // 一般設定
      general: {
        language: '日本語',
        autoSaveInterval: 300000, // 5分
        showStartupTips: true,
        theme: 'dark'
      },
      // オーディオ設定
      audio: {
        device: 'Default Audio Device',
        sampleRate: 44100,
        bufferSize: 512
      },
      // MIDI設定
      midi: {
        inputDevice: 'No MIDI Input',
        outputDevice: 'Built-in Synthesizer'
      },
      // MIDIエディタ設定
      midiEditor: {
        ghostTextEnabled: true,
        currentModel: 'musicRnn',
        predictionThreshold: 0.7,
        debounceDelay: 200,
        contextWindow: 16,
        predictionCount: 5,
        displayCount: 1,
        generateSequentialPredictions: true,
        restProbability: 0.15,
        restDetectionThreshold: 0.1,
        developerMode: false
      },
      // UI設定
      ui: {
        showMinimap: true,
        showToolbar: true,
        compactMode: false
      },
      // 初期化フラグ
      initialized: false
    }

    // appSettingsが利用可能な場合は、それを使用して初期化
    if (appSettings) {
      return {
        ...initialSettings,
        general: { ...initialSettings.general, ...appSettings.general },
        audio: { ...initialSettings.audio, ...appSettings.audio },
        midi: { ...initialSettings.midi, ...appSettings.midi },
        midiEditor: { ...initialSettings.midiEditor, ...appSettings.midiEditor },
        ui: { ...initialSettings.ui, ...appSettings.ui },
        initialized: true
      }
    }

    return initialSettings
  })

  // Connectivity status state for API connection checking
  const [connectivityStatus, setConnectivityStatus] = useState({})

  // appSettingsとglobalSettingsから設定を読み込み
  useEffect(() => {
    if (appSettings) {
      console.log('SettingsModal: Loading settings from appSettings:', appSettings)
      setAllSettings(prev => ({
        ...prev,
        general: { ...prev.general, ...appSettings.general },
        audio: { ...prev.audio, ...appSettings.audio },
        midi: { ...prev.midi, ...appSettings.midi },
        midiEditor: { ...prev.midiEditor, ...appSettings.midiEditor },
        ui: { ...prev.ui, ...appSettings.ui },
        initialized: true
      }))
    }
  }, [appSettings])

  // globalSettingsからAI設定を読み込み
  useEffect(() => {
    if (globalSettings && globalSettings.aiAssistant) {
      console.log('SettingsModal: Loading AI settings from globalSettings:', globalSettings.aiAssistant)
      setAllSettings(prev => ({
        ...prev,
        aiAssistant: {
          ...prev.aiAssistant,
          availableModels: { ...prev.aiAssistant.availableModels, ...globalSettings.aiAssistant.models },
          apiKeys: { ...prev.aiAssistant.apiKeys, ...globalSettings.aiAssistant.apiKeys }
        }
      }))
    }
  }, [globalSettings])

  // 設定変更時にAppに通知（手動変更時のみ）
  const notifyAppSettings = useCallback((newSettings) => {
    if (updateAppSettings) {
      const settingsToUpdate = {
        general: newSettings.general,
        audio: newSettings.audio,
        midi: newSettings.midi,
        midiEditor: newSettings.midiEditor,
        ui: newSettings.ui
      }
      updateAppSettings(settingsToUpdate)
    }
  }, [updateAppSettings])

  // 設定変更ハンドラー
  const updateSetting = (category, key, value) => {
    console.log('SettingsModal: updateSetting called:', { category, key, value })
    setAllSettings(prev => {
      const newSettings = {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value
        }
      }
      
      console.log('SettingsModal: New settings:', newSettings)
      
      // 手動変更時のみAppに通知
      if (category !== 'aiAssistant') {
        console.log('SettingsModal: Notifying app settings for category:', category)
        notifyAppSettings(newSettings)
      } else {
        // AI設定の場合はglobalSettingsを更新
        if (updateGlobalSettings) {
          const aiSettingsToUpdate = {
            aiAssistant: {
              models: newSettings.aiAssistant.availableModels,
              apiKeys: newSettings.aiAssistant.apiKeys
            }
          }
          updateGlobalSettings(aiSettingsToUpdate)
        }
      }
      
      return newSettings
    })
  }

  // AI Assistant設定の更新
  const handleModelToggle = (modelId) => {
    const newAvailableModels = {
      ...allSettings.aiAssistant.availableModels,
      [modelId]: !allSettings.aiAssistant.availableModels[modelId]
    }
    
    setAllSettings(prev => ({
      ...prev,
      aiAssistant: {
        ...prev.aiAssistant,
        availableModels: newAvailableModels
      }
    }))
    
    // globalSettingsを更新
    if (updateGlobalSettings) {
      const aiSettingsToUpdate = {
        aiAssistant: {
          models: newAvailableModels,
          apiKeys: allSettings.aiAssistant.apiKeys
        }
      }
      updateGlobalSettings(aiSettingsToUpdate)
    }
  }

  const handleApiKeyChange = (provider, value) => {
    const newApiKeys = {
      ...allSettings.aiAssistant.apiKeys,
      [provider]: value
    }
    
    setAllSettings(prev => ({
      ...prev,
      aiAssistant: {
        ...prev.aiAssistant,
        apiKeys: newApiKeys
      }
    }))
    
    // globalSettingsを更新
    if (updateGlobalSettings) {
      const aiSettingsToUpdate = {
        aiAssistant: {
          models: allSettings.aiAssistant.availableModels,
          apiKeys: newApiKeys
        }
      }
      updateGlobalSettings(aiSettingsToUpdate)
    }
  }

  const toggleApiKeyVisibility = (provider) => {
    updateSetting('aiAssistant', 'showApiKeys', {
      ...allSettings.aiAssistant.showApiKeys,
      [provider]: !allSettings.aiAssistant.showApiKeys[provider]
    })
  }

  const handleApiKeyPaste = (provider, e) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    handleApiKeyChange(provider, pastedText)
  }

  // Handle API connectivity check
  const handleCheckConnectivity = async (provider) => {
    const apiKey = allSettings.aiAssistant.apiKeys[provider]
    if (!apiKey) return

    // Set checking status
    setConnectivityStatus(prev => ({
      ...prev,
      [provider]: { checking: true, result: null }
    }))

    try {
      let testResult = { success: false, error: 'Unknown error' }
      
      // Test different APIs based on provider
      if (provider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Test connection' }]
          })
        })
        
        if (response.ok || response.status === 400) {
          // 400 is expected for minimal test request, but means API key is valid
          testResult = { success: true }
        } else if (response.status === 401) {
          testResult = { success: false, error: 'Invalid API key' }
        } else {
          testResult = { success: false, error: `HTTP ${response.status}` }
        }
      } else if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        })
        
        if (response.ok) {
          testResult = { success: true }
        } else if (response.status === 401) {
          testResult = { success: false, error: 'Invalid API key' }
        } else {
          testResult = { success: false, error: `HTTP ${response.status}` }
        }
      } else if (provider === 'google') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`, {
          method: 'GET'
        })
        
        if (response.ok) {
          testResult = { success: true }
        } else if (response.status === 400 || response.status === 403) {
          testResult = { success: false, error: 'Invalid API key' }
        } else {
          testResult = { success: false, error: `HTTP ${response.status}` }
        }
      }

      // Update status with result
      setConnectivityStatus(prev => ({
        ...prev,
        [provider]: { checking: false, result: testResult }
      }))

    } catch (error) {
      console.error(`Connectivity check failed for ${provider}:`, error)
      setConnectivityStatus(prev => ({
        ...prev,
        [provider]: { 
          checking: false, 
          result: { success: false, error: error.message || 'Network error' }
        }
      }))
    }
  }

  // Model definitions
  const modelDefinitions = {
    'claude-3-opus': { name: 'Claude 3 Opus', provider: 'anthropic', description: '最高品質・創造性重視' },
    'claude-3-sonnet': { name: 'Claude 3 Sonnet', provider: 'anthropic', description: 'バランス型・高速' },
    'gpt-4': { name: 'GPT-4', provider: 'openai', description: '高品質・汎用性' },
    'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', provider: 'openai', description: '高速・軽量' },
    'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', provider: 'google', description: '最新・最高性能のGeminiモデル' },
    'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', provider: 'google', description: '超高速・軽量な最新Geminiモデル' },
    'gemini-1.5-pro': { name: 'Gemini 1.5 Pro', provider: 'google', description: '長文対応・高性能' },
    'gemini-1.5-flash': { name: 'Gemini 1.5 Flash', provider: 'google', description: '高速・軽量な1.5世代Gemini' },
    'gemini-pro': { name: 'Gemini Pro', provider: 'google', description: '従来のGemini Pro' }
  }

  // Provider definitions
  const providerDefinitions = {
    anthropic: { name: 'Anthropic', keyLabel: 'Anthropic API Key' },
    openai: { name: 'OpenAI', keyLabel: 'OpenAI API Key' },
    google: { name: 'Google', keyLabel: 'Google API Key' }
  }
  if (!showSettings) return null

  const settingsSections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'midi', label: 'MIDI', icon: Key },
    { id: 'midiEditor', label: 'MIDI Editor', icon: Music },
    { id: 'ui', label: 'UI', icon: Palette },
    { id: 'ai', label: 'AI Assistant', icon: Brain },
    { id: 'shortcuts', label: 'Shortcuts', icon: Smartphone },
    { id: 'about', label: 'About', icon: BookOpen }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40000 flex items-center justify-center p-4">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
        {/* サイドバー */}
        <div className="w-64 bg-gray-50/80 dark:bg-gray-800/80 border-r border-gray-200/50 dark:border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(false)}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <nav className="space-y-2">
            {settingsSections.map((section) => {
              const IconComponent = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSettingsSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                    activeSettingsSection === section.id
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="text-sm font-medium">{section.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-8">
            {activeSettingsSection === 'general' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">General Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</label>
                    <select 
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      value={allSettings.general.language}
                      onChange={(e) => updateSetting('general', 'language', e.target.value)}
                    >
                      <option>日本語</option>
                      <option>English</option>
                      <option>中文</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Auto-save interval</label>
                    <select 
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      value={allSettings.general.autoSaveInterval}
                      onChange={(e) => updateSetting('general', 'autoSaveInterval', parseInt(e.target.value))}
                    >
                      <option value={300000}>Every 5 minutes</option>
                      <option value={600000}>Every 10 minutes</option>
                      <option value={1800000}>Every 30 minutes</option>
                      <option value={0}>Disabled</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="startup-tips" 
                      className="rounded" 
                      checked={allSettings.general.showStartupTips}
                      onChange={(e) => updateSetting('general', 'showStartupTips', e.target.checked)}
                    />
                    <label htmlFor="startup-tips" className="text-sm text-gray-700 dark:text-gray-300">Show tips on startup</label>
                  </div>
                  
                  {/* キャッシュ管理セクション */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Cache Management</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Cache Status</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Size: {cacheManager.formatBytes(cacheManager.getCacheSize())}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const stats = cacheManager.getCacheStats()
                            console.log('Cache stats:', stats)
                            alert(`Cache Statistics:\nTotal Size: ${cacheManager.formatBytes(stats.totalSize)}\nItems: ${stats.itemCount}`)
                          }}
                          className="text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Stats
                        </Button>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Clear all caches? This will remove temporary data but keep your projects and settings.')) {
                              cacheManager.clearAllCaches()
                              alert('All caches cleared successfully!')
                            }
                          }}
                          className="text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear All Caches
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            cacheManager.cleanupOldCache()
                            alert('Old cache cleanup completed!')
                          }}
                          className="text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Cleanup Old Cache
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeSettingsSection === 'audio' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Audio Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Audio Device</label>
                    <select 
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      value={allSettings.audio.device}
                      onChange={(e) => updateSetting('audio', 'device', e.target.value)}
                    >
                      <option>Default Audio Device</option>
                      <option>Built-in Output</option>
                      <option>External Audio Interface</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sample Rate</label>
                    <select 
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      value={allSettings.audio.sampleRate}
                      onChange={(e) => updateSetting('audio', 'sampleRate', parseInt(e.target.value))}
                    >
                      <option value={44100}>44.1 kHz</option>
                      <option value={48000}>48 kHz</option>
                      <option value={96000}>96 kHz</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Buffer Size</label>
                    <select 
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      value={allSettings.audio.bufferSize}
                      onChange={(e) => updateSetting('audio', 'bufferSize', parseInt(e.target.value))}
                    >
                      <option value={128}>128 samples</option>
                      <option value={256}>256 samples</option>
                      <option value={512}>512 samples</option>
                      <option value={1024}>1024 samples</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {activeSettingsSection === 'midi' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">MIDI Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">MIDI Input Device</label>
                    <select 
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      value={allSettings.midi.inputDevice}
                      onChange={(e) => updateSetting('midi', 'inputDevice', e.target.value)}
                    >
                      <option>No MIDI Input</option>
                      <option>Virtual MIDI Keyboard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">MIDI Output Device</label>
                    <select 
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      value={allSettings.midi.outputDevice}
                      onChange={(e) => updateSetting('midi', 'outputDevice', e.target.value)}
                    >
                      <option>Built-in Synthesizer</option>
                      <option>External MIDI Device</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {activeSettingsSection === 'midiEditor' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">MIDI Editor Settings</h3>
                
                {/* Ghost Text Settings */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Ghost Text Settings</h4>
                    
                    {/* Ghost Text Enable/Disable */}
                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Ghost Text Function</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Enable AI-powered music prediction</div>
                      </div>
                      <div 
                        className={`w-12 h-6 rounded-full cursor-pointer transition-colors ${
                          allSettings.midiEditor?.ghostTextEnabled 
                            ? 'bg-blue-500' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        onClick={() => updateSetting('midiEditor', 'ghostTextEnabled', !allSettings.midiEditor?.ghostTextEnabled)}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          allSettings.midiEditor?.ghostTextEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                    </div>

                    {/* AI Model Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Model</label>
                      <select 
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        value={allSettings.midiEditor?.currentModel || 'musicRnn'}
                        onChange={(e) => updateSetting('midiEditor', 'currentModel', e.target.value)}
                      >
                        <option value="musicRnn">Music RNN</option>
                        <option value="musicVae">Music VAE</option>
                        <option value="melodyRnn">Melody RNN</option>
                        <option value="phi2" disabled style={{ textDecoration: 'line-through', color: '#6b7280' }}>
                          Phi-2 (高速) - 開発中
                        </option>
                        <option value="fallback">Fallback Prediction</option>
                      </select>
                      {allSettings.midiEditor?.currentModel === 'phi2' && (
                        <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded text-yellow-800 dark:text-yellow-200 text-sm">
                          ⚠️ Phi-2モデルは現在開発中です。軽量予測が使用されます。
                          <br />
                          <span className="text-xs opacity-75">
                            実際の動作: ルールベースの軽量予測エンジンが動作します。
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Prediction Settings */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Prediction Threshold: {allSettings.midiEditor?.predictionThreshold || 0.7}
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={allSettings.midiEditor?.predictionThreshold || 0.7}
                          onChange={(e) => updateSetting('midiEditor', 'predictionThreshold', parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Debounce Delay: {allSettings.midiEditor?.debounceDelay || 200}ms
                        </label>
                        <input
                          type="range"
                          min="50"
                          max="500"
                          step="50"
                          value={allSettings.midiEditor?.debounceDelay || 200}
                          onChange={(e) => updateSetting('midiEditor', 'debounceDelay', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Prediction Count Settings */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Prediction Count: {allSettings.midiEditor?.predictionCount || 5}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={allSettings.midiEditor?.predictionCount || 5}
                          onChange={(e) => updateSetting('midiEditor', 'predictionCount', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Display Count: {allSettings.midiEditor?.displayCount || 1}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max={Math.min(allSettings.midiEditor?.predictionCount || 5, 5)}
                          step="1"
                          value={allSettings.midiEditor?.displayCount || 1}
                          onChange={(e) => updateSetting('midiEditor', 'displayCount', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Context Window: {allSettings.midiEditor?.contextWindow || 16}
                        </label>
                        <input
                          type="range"
                          min="4"
                          max="32"
                          step="4"
                          value={allSettings.midiEditor?.contextWindow || 16}
                          onChange={(e) => updateSetting('midiEditor', 'contextWindow', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Sequential Predictions */}
                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Sequential Predictions</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Generate next predictions based on previous ones</div>
                      </div>
                      <div 
                        className={`w-12 h-6 rounded-full cursor-pointer transition-colors ${
                          allSettings.midiEditor?.generateSequentialPredictions !== false
                            ? 'bg-blue-500' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        onClick={() => updateSetting('midiEditor', 'generateSequentialPredictions', !(allSettings.midiEditor?.generateSequentialPredictions !== false))}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          allSettings.midiEditor?.generateSequentialPredictions !== false ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                    </div>

                    {/* Rest Settings */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Rest Probability: {(allSettings.midiEditor?.restProbability || 0.15) * 100}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="0.5"
                          step="0.05"
                          value={allSettings.midiEditor?.restProbability || 0.15}
                          onChange={(e) => updateSetting('midiEditor', 'restProbability', parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Rest Detection Threshold: {(allSettings.midiEditor?.restDetectionThreshold || 0.1).toFixed(2)}s
                        </label>
                        <input
                          type="range"
                          min="0.05"
                          max="0.5"
                          step="0.05"
                          value={allSettings.midiEditor?.restDetectionThreshold || 0.1}
                          onChange={(e) => updateSetting('midiEditor', 'restDetectionThreshold', parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Developer Mode */}
                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Developer Mode</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Show status bar and debug information</div>
                      </div>
                      <div 
                        className={`w-12 h-6 rounded-full cursor-pointer transition-colors ${
                          allSettings.midiEditor?.developerMode 
                            ? 'bg-orange-500' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        onClick={() => updateSetting('midiEditor', 'developerMode', !allSettings.midiEditor?.developerMode)}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          allSettings.midiEditor?.developerMode ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeSettingsSection === 'ui' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">UI Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                    <select 
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      value={allSettings.general.theme}
                      onChange={(e) => updateSetting('general', 'theme', e.target.value)}
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="show-minimap" 
                      className="rounded" 
                      checked={allSettings.ui.showMinimap}
                      onChange={(e) => updateSetting('ui', 'showMinimap', e.target.checked)}
                    />
                    <label htmlFor="show-minimap" className="text-sm text-gray-700 dark:text-gray-300">Show minimap</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="show-toolbar" 
                      className="rounded" 
                      checked={allSettings.ui.showToolbar}
                      onChange={(e) => updateSetting('ui', 'showToolbar', e.target.checked)}
                    />
                    <label htmlFor="show-toolbar" className="text-sm text-gray-700 dark:text-gray-300">Show toolbar</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="compact-mode" 
                      className="rounded" 
                      checked={allSettings.ui.compactMode}
                      onChange={(e) => updateSetting('ui', 'compactMode', e.target.checked)}
                    />
                    <label htmlFor="compact-mode" className="text-sm text-gray-700 dark:text-gray-300">Compact mode</label>
                  </div>
                </div>
              </div>
            )}
            
            {activeSettingsSection === 'ai' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">AI Assistant Settings</h3>
                
                {/* Available Models Section */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Available Models</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Select which AI models you want to use. Only selected models will be available in the AI Assistant chat box.
                    </p>
                    
                    <div className="space-y-3">
                      {Object.entries(modelDefinitions).map(([modelId, model]) => (
                        <div key={modelId} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div 
                              className={`w-5 h-5 border-2 rounded cursor-pointer flex items-center justify-center transition-colors ${
                                allSettings.aiAssistant.availableModels[modelId] 
                                  ? 'bg-blue-500 border-blue-500' 
                                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                              }`}
                              onClick={() => handleModelToggle(modelId)}
                            >
                              {allSettings.aiAssistant.availableModels[modelId] && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{model.name}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{model.description}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {providerDefinitions[model.provider].name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* API Keys Section */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">API Keys</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Enter your API keys for each provider. Keys are stored securely in your browser.
                    </p>
                    
                    <div className="space-y-4">
                      {Object.entries(providerDefinitions).map(([provider, providerInfo]) => {
                        // Check if any models from this provider are selected
                        const hasSelectedModels = Object.entries(modelDefinitions).some(
                          ([modelId, model]) => model.provider === provider && allSettings.aiAssistant.availableModels[modelId]
                        )
                        
                        return (
                          <div key={provider} className={`p-4 border rounded-lg transition-opacity ${
                            hasSelectedModels 
                              ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20' 
                              : 'border-gray-200 dark:border-gray-700 opacity-50'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {providerInfo.keyLabel}
                              </label>
                              {hasSelectedModels && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
                                  Required
                                </div>
                              )}
                            </div>
                            <div className="relative">
                              <Input
                                type={allSettings.aiAssistant.showApiKeys[provider] ? 'text' : 'password'}
                                placeholder={`Enter your ${providerInfo.name} API key`}
                                value={allSettings.aiAssistant.apiKeys[provider]}
                                onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                                onPaste={(e) => handleApiKeyPaste(provider, e)}
                                onKeyDown={(e) => {
                                  // Ctrl+V の処理を明示的に許可
                                  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                                    e.stopPropagation();
                                  }
                                }}
                                onContextMenu={(e) => {
                                  // 右クリックメニューを許可
                                  e.stopPropagation();
                                }}
                                disabled={!hasSelectedModels}
                                className="pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                              />
                              <button
                                type="button"
                                onClick={() => toggleApiKeyVisibility(provider)}
                                disabled={!hasSelectedModels}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                              >
                                {allSettings.aiAssistant.showApiKeys[provider] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            {hasSelectedModels && !allSettings.aiAssistant.apiKeys[provider] && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                API key required for selected {providerInfo.name} models
                              </p>
                            )}
                            {hasSelectedModels && allSettings.aiAssistant.apiKeys[provider] && (
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCheckConnectivity(provider)}
                                  disabled={connectivityStatus[provider]?.checking}
                                  className="text-xs bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                                >
                                  {connectivityStatus[provider]?.checking ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                                      Checking...
                                    </>
                                  ) : (
                                    <>
                                      <Wifi className="h-3 w-3 mr-1" />
                                      Check Connectivity
                                    </>
                                  )}
                                </Button>
                                {connectivityStatus[provider]?.result && (
                                  <div className={`mt-1 text-xs ${
                                    connectivityStatus[provider].result.success 
                                      ? 'text-green-600 dark:text-green-400' 
                                      : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {connectivityStatus[provider].result.success 
                                      ? '✓ Connection successful' 
                                      : `✗ Connection failed: ${connectivityStatus[provider].result.error}`
                                    }
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Configuration Summary</h5>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>
                        Selected Models: {Object.values(allSettings.aiAssistant.availableModels).filter(Boolean).length} / {Object.keys(modelDefinitions).length}
                      </div>
                      <div>
                        Configured API Keys: {Object.values(allSettings.aiAssistant.apiKeys).filter(key => key.trim() !== '').length} / {Object.keys(providerDefinitions).length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeSettingsSection === 'appearance' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Appearance Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                    <select 
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      value={allSettings.general.theme}
                      onChange={(e) => updateSetting('general', 'theme', e.target.value)}
                    >
                      <option>Dark</option>
                      <option>Light</option>
                      <option>Auto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Accent Color</label>
                    <div className="flex space-x-2">
                      {['blue', 'green', 'purple', 'red', 'orange'].map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full bg-${color}-500 border-2 border-gray-300 dark:border-gray-600`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeSettingsSection === 'shortcuts' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Keyboard Shortcuts</h3>
                <div className="space-y-3">
                  {[
                    { action: 'Play/Pause', shortcut: 'Space' },
                    { action: 'Stop', shortcut: 'Ctrl + .' },
                    { action: 'New Project', shortcut: 'Ctrl + N' },
                    { action: 'Save Project', shortcut: 'Ctrl + S' },
                    { action: 'Undo', shortcut: 'Ctrl + Z' },
                    { action: 'Redo', shortcut: 'Ctrl + Y' }
                  ].map((item) => (
                    <div key={item.action} className="flex justify-between items-center py-2 border-b border-gray-200/50 dark:border-gray-700/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.action}</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                        {item.shortcut}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeSettingsSection === 'about' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">About Melodia</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <Music className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Melodia Composer Copilot</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Version 1.0.0</p>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    <p>AI統合DAW - 音楽制作の民主化を目指すプロジェクト</p>
                    <p>© 2024 Melodia Team. All rights reserved.</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Documentation
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <Users className="h-4 w-4 mr-2" />
                      Community
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Settings Footer */}
          <div className="flex justify-end space-x-2 p-8 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <Button variant="outline" onClick={() => setShowSettings(false)} className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
              console.log("Settings saved successfully");
              setShowSettings(false);
            }}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal

