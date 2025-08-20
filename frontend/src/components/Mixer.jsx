import { useState, useEffect, memo, useCallback } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

const Mixer = ({ 
  mixerChannels, 
  setMixerChannels,
  mixerWidth,
  setMixerWidth,
  isMixerResizing,
  setIsMixerResizing,
  updateMasterVolume
}) => {
  // チャンネルデータを状態として管理
  const [channels, setChannels] = useState([])
  // マスターボリュームの状態
  const [masterVolume, setMasterVolume] = useState(85)

  // mixerChannelsからチャンネルデータを取得して状態を更新
  useEffect(() => {
    const currentChannels = typeof mixerChannels === 'function' ? mixerChannels() : mixerChannels
    if (currentChannels && Array.isArray(currentChannels)) {
      console.log('Mixer: Updating channels:', currentChannels.length, 'tracks')
      setChannels(currentChannels)
    }
  }, [mixerChannels])

  // リサイズ機能のイベントハンドラー - useCallbackで最適化
  const handleMouseDown = useCallback((e) => {
    setIsMixerResizing(true)
    e.preventDefault()
  }, [setIsMixerResizing])

  const handleMouseMove = useCallback((e) => {
    if (!isMixerResizing) return
    const newWidth = e.clientX
    if (newWidth >= 150 && newWidth <= 400) {
      setMixerWidth(newWidth)
    }
  }, [isMixerResizing, setMixerWidth])

  const handleMouseUp = useCallback(() => {
    setIsMixerResizing(false)
  }, [setIsMixerResizing])

  // マウスイベントリスナーの設定
  useEffect(() => {
    if (isMixerResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isMixerResizing, handleMouseMove, handleMouseUp])

  const updateChannelVolume = useCallback((channelId, volume) => {
    console.log('Mixer: updateChannelVolume called:', channelId, volume)
    
    // ローカル状態を即座に更新
    setChannels(prevChannels => {
      const updatedChannels = prevChannels.map(channel => 
        channel.id === channelId 
          ? { ...channel, volume } 
          : channel
      )
      
      // 更新されたチャンネルをApp.jsxに通知（単一オブジェクトとして渡す）
      const updatedChannel = updatedChannels.find(channel => channel.id === channelId)
      if (updatedChannel) {
        // setTimeoutでレンダリング後に実行
        setTimeout(() => {
          setMixerChannels({ ...updatedChannel, volume })
        }, 0)
      }
      
      return updatedChannels
    })
  }, [setMixerChannels])

  const toggleMute = useCallback((channelId) => {
    console.log('Mixer: toggleMute called:', channelId)
    
    setChannels(prevChannels => {
      const currentChannel = prevChannels.find(channel => channel.id === channelId)
      if (!currentChannel) return prevChannels
      
      const newMutedState = !currentChannel.muted
      console.log('Mixer: Toggling mute for channel:', channelId, 'from', currentChannel.muted, 'to', newMutedState)
      
      const updatedChannels = prevChannels.map(channel => 
        channel.id === channelId 
          ? { ...channel, muted: newMutedState } 
          : channel
      )
      
      // 更新されたチャンネルをApp.jsxに通知（正しいミュート状態を渡す）
      const updatedChannel = updatedChannels.find(channel => channel.id === channelId)
      if (updatedChannel) {
        // setTimeoutでレンダリング後に実行
        setTimeout(() => {
          setMixerChannels({ ...updatedChannel, muted: newMutedState })
        }, 0)
      }
      
      return updatedChannels
    })
  }, [setMixerChannels])

  const handleMasterVolumeChange = useCallback((volume) => {
    setMasterVolume(volume)
    // App.jsxにマスターボリューム更新を通知
    if (updateMasterVolume) {
      // setTimeoutでレンダリング後に実行
      setTimeout(() => {
        updateMasterVolume(volume)
      }, 0)
    }
  }, [updateMasterVolume])

  return (
    <div className="h-full flex flex-col relative">
      {/* リサイズハンドル */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/50 z-20"
        onMouseDown={handleMouseDown}
      />
      
      {/* ミキサーヘッダー */}
      <div className="p-3 border-b border-gray-700/50">
        <h2 className="text-sm font-semibold text-gray-300">Mixer</h2>
      </div>

      {/* チャンネルリスト */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {channels && channels.length > 0 ? (
          channels.map((channel) => (
            <div key={channel.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
              {/* チャンネル名とミュートボタン */}
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-medium text-gray-300 truncate flex-1">
                  {channel.name}
                </div>
                <button
                  onClick={() => toggleMute(channel.id)}
                  className={`w-6 h-6 rounded flex items-center justify-center ml-2 ${
                    channel.muted 
                      ? 'bg-red-500 text-white shadow-md' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                  title={channel.muted ? "Unmute" : "Mute"}
                >
                  {channel.muted ? (
                    <VolumeX className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                </button>
              </div>
              
              {/* ボリュームフェーダー */}
              <div className="mb-3">
                <div className="relative h-24 mx-auto w-6">
                  <div className="absolute inset-0 bg-gray-700/50 rounded-full" />
                  <div 
                    className="absolute bottom-0 rounded-full w-full bg-gradient-to-t from-blue-500 to-blue-400"
                    style={{ height: `${channel.volume}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={channel.volume}
                    onChange={(e) => updateChannelVolume(channel.id, parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ 
                      writingMode: 'vertical-lr', 
                      direction: 'ltr',
                      transform: 'rotate(180deg)'
                    }}
                  />
                </div>
                <div className="text-xs text-center text-gray-400 mt-1">
                  {channel.volume}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No tracks available</p>
            <p className="text-xs">Add tracks to see them in the mixer</p>
          </div>
        )}
      </div>

      {/* マスターボリューム */}
      <div className="p-3 border-t border-gray-700/50">
        <div className="text-xs font-medium text-gray-300 mb-2">Master</div>
        <div className="relative h-20 mx-auto w-8">
          <div className="absolute inset-0 bg-gray-700/50 rounded-full" />
          <div 
            className="absolute bottom-0 rounded-full w-full bg-gradient-to-t from-blue-600 to-blue-500"
            style={{ height: `${masterVolume}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume}
            onChange={(e) => handleMasterVolumeChange(parseInt(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ 
              writingMode: 'vertical-lr', 
              direction: 'ltr',
              transform: 'rotate(180deg)'
            }}
          />
        </div>
        <div className="text-xs text-center text-gray-400 mt-1">{masterVolume}</div>
      </div>
    </div>
  )
}

export default memo(Mixer)

