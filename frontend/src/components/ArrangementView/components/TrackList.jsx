import { Button } from '../../ui/button.jsx'
import { UNIFIED_TRACK_TYPES } from '../../../data/trackTypes.js'
import {
  Plus,
  Piano,
  AudioWaveform,
  Drum,
  Mic,
  Music,
  Headphones,
  Zap,
  Sliders,
  X
} from 'lucide-react'
import VoiceSynthTrack from './VoiceSynthTrack.jsx'
import BassTrack from '../../BassTrack.jsx'
import {
  DEFAULT_TRACK_HEIGHT,
  NOTE_MIN,
  NOTE_RANGE,
  TRACK_INFO_PANEL_WIDTH,
  getNoteName
} from '../utils/arrangementUtils.js'
import virtualizationManager from '../../../utils/virtualization.js'
import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import drumTrackManager from '../../../utils/drumTrackManager.js'
import useInstrumentSettings from '../../../hooks/useInstrumentSettings.js'
import InstrumentSettingsPanel from '../../MIDIEditor/InstrumentSettingsPanel.jsx'

const TrackList = ({
  tracks,
  trackAreaRef,
  safeTrackAreaWidth,
  windowWidth,
  currentTime,
  pixelsPerSecond,
  horizontalScrollPosition,
  selectedTracks,
  trackHeights,
  isResizing,
  resizingTrackId,
  arrangementState,
  onTrackSelectStart,
  onTrackSelectEnd,
  onTrackDoubleClick,
  onShowTrackContextMenu,
  onResizeStart,
  onTrackMenuToggle,
  onCloseMenu,
  showTrackMenu,
  menuPosition,
  menuRef,
  onAddTrack,
  forceRerenderApp,
  onUpdateTrackState,
  onHorizontalScroll,
  onEmptyAreaContextMenu,
  audioEngine,
  musicTheorySettings = {
    scaleConstraintEnabled: false,
    selectedGenre: null,
    selectedScales: [],
    rootNote: 'C'
  },
  onMusicTheorySettingsChange,
  globalAISettings = {
    aiModel: 'magenta',
    ghostTextEnabled: false,
    summaryStatus: null,
    predictionSettings: { scale: null, rootNote: null }
  },
  onAISettingsChange
}) => {
  // AI関連propsのデバッグログ
  useEffect(() => {
    console.log('🎹 [TrackList] AI Settings Props Received:', {
      globalAISettings,
      onAISettingsChange: typeof onAISettingsChange
    })
  }, [globalAISettings, onAISettingsChange])

  // MIDIデータのキャッシュ
  const midiDataCache = useRef(new Map())

  // 音色設定パネルの状態管理
  const [selectedTrackForSettings, setSelectedTrackForSettings] = useState(null)
  const instrumentSettings = useInstrumentSettings(selectedTrackForSettings)

  // 仮想化されたトラックの計算をメモ化
  const virtualizedTracks = useMemo(() => {
    const containerHeight = trackAreaRef.current?.clientHeight || 600
    const trackHeight = DEFAULT_TRACK_HEIGHT
    return virtualizationManager.getVirtualizedTracks(
      tracks,
      0, // スクロール位置は別途管理
      containerHeight,
      trackHeight
    )
  }, [tracks, trackAreaRef])

  // ドラムトラックのMIDIデータを取得する関数（キャッシュ付き）
  const getDrumTrackMidiData = useCallback((track) => {
    // キャッシュキーを作成
    const cacheKey = `${track.id}-${track.subtype}`
    
    // キャッシュにデータがある場合はそれを返す
    if (midiDataCache.current.has(cacheKey)) {
      return midiDataCache.current.get(cacheKey)
    }
    
    if (track.subtype === 'drums') {
      console.log('🥁 Getting drum track MIDI data for:', track.id)
      
      // ドラムトラックマネージャーからデータを取得
      const drumData = drumTrackManager.getDrumTrack(track.id)
      if (drumData && drumData.midiData) {
        console.log('🥁 Found drum MIDI data:', {
          trackId: track.id,
          notesCount: drumData.midiData.notes?.length || 0,
          tempo: drumData.midiData.tempo,
          timeSignature: drumData.midiData.timeSignature
        })
        
        // キャッシュに保存
        midiDataCache.current.set(cacheKey, drumData.midiData)
        return drumData.midiData
      }
      
      console.log('🥁 No drum data found for track:', track.id)
      // 空のデータもキャッシュに保存
      midiDataCache.current.set(cacheKey, null)
      return null
    }
    
    // 通常のMIDIトラックの場合
    const result = track.midiData
    midiDataCache.current.set(cacheKey, result)
    return result
  }, [])
  
  // キャッシュをクリアする関数
  const clearMidiDataCache = useCallback(() => {
    midiDataCache.current.clear()
    console.log('🥁 MIDI data cache cleared')
  }, [])
  
  // 特定のトラックのキャッシュをクリアする関数
  const clearTrackCache = useCallback((trackId) => {
    const keysToDelete = []
    for (const [key] of midiDataCache.current) {
      if (key.startsWith(`${trackId}-`)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => midiDataCache.current.delete(key))
    console.log('🥁 Cache cleared for track:', trackId)
  }, [])

  // ドラムトラックのデータ更新を監視
  useEffect(() => {
    const handleDrumTrackUpdate = (data) => {
      console.log('🥁 [TrackList] Drum track updated:', data.trackId);
      // キャッシュをクリアして再レンダリングを促す
      clearTrackCache(data.trackId);
      if (forceRerenderApp) {
        forceRerenderApp();
      }
    };

    const handleDrumTrackCreated = (data) => {
      console.log('🥁 [TrackList] Drum track created:', data.trackId);
      if (forceRerenderApp) {
        forceRerenderApp();
      }
    };

    const handleDrumTrackDeleted = (data) => {
      console.log('🥁 [TrackList] Drum track deleted:', data.trackId);
      clearTrackCache(data.trackId);
      if (forceRerenderApp) {
        forceRerenderApp();
      }
    };

    // イベントリスナーを登録
    drumTrackManager.on('trackUpdated', handleDrumTrackUpdate);
    drumTrackManager.on('trackCreated', handleDrumTrackCreated);
    drumTrackManager.on('trackDeleted', handleDrumTrackDeleted);

    // クリーンアップ
    return () => {
      drumTrackManager.off('trackUpdated', handleDrumTrackUpdate);
      drumTrackManager.off('trackCreated', handleDrumTrackCreated);
      drumTrackManager.off('trackDeleted', handleDrumTrackDeleted);
    };
  }, [clearTrackCache, forceRerenderApp]);

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <div 
        ref={trackAreaRef}
        className="relative h-full overflow-x-auto overflow-y-auto main-scrollbar" 
        style={{ width: '100%' }}
        onScroll={onHorizontalScroll}
        onContextMenu={onEmptyAreaContextMenu}
      >
        {/* 全体のコンテンツコンテナ */}
        <div style={{ 
          width: `${safeTrackAreaWidth + TRACK_INFO_PANEL_WIDTH}px`, // トラック情報パネル + トラックエリア
          minHeight: '100%',
          paddingBottom: '20px', // 下部に余白を追加
          minWidth: `${windowWidth - 32}px` // 画面幅に合わせて最小幅を設定
        }}>
        {/* 仮想化されたトラック本体 */}
        {virtualizedTracks.tracks.map((track, index) => {
           const trackState = arrangementState.trackStates.get(track.id) || {}
           // トラックタイプに応じてMIDIデータの有無を判定（統一された参照方法）
           const hasMidiData = (() => {
             const midiData = getDrumTrackMidiData(track)
             return midiData && midiData.notes && midiData.notes.length > 0
           })()
           const isSelected = selectedTracks?.has(track.id) ?? false
           const trackHeight = trackHeights?.get(track.id) || DEFAULT_TRACK_HEIGHT
      
          // リサイズ中のトラックかどうかをチェック
          const isCurrentlyResizing = isResizing && resizingTrackId === track.id
          
          return (
            <div
              key={track.id}
              className={`relative flex border-b border-gray-700 transition-all duration-200 cursor-pointer ${
                track.type === 'voiceSynth' ? 'hover:bg-red-900/20' : 'hover:bg-gray-800/30'
              } ${
                isSelected ? 'bg-blue-500/10 border-blue-500 shadow-lg ring-2 ring-blue-500/50' : ''
              } ${isCurrentlyResizing ? 'pointer-events-none' : ''} ${
                track.type === 'voiceSynth' ? 'border-red-500/30' : ''
              }`}
              style={{ 
                height: `${trackHeight}px`,
                willChange: isCurrentlyResizing ? 'height' : 'auto',
                borderLeft: isSelected ? '4px solid #3B82F6' : track.type === 'voiceSynth' ? '4px solid #EF4444' : '4px solid transparent',
                borderRight: isSelected ? '4px solid #3B82F6' : track.type === 'voiceSynth' ? '4px solid #EF4444' : '4px solid transparent',
                // 複数選択時の視覚的フィードバック
                backgroundColor: isSelected ? 
                  (selectedTracks.size > 1 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)') : 
                  track.type === 'voiceSynth' ? 'rgba(239, 68, 68, 0.05)' : undefined
              }}
              title={track.type === 'voiceSynth' ?
                `歌声合成トラック: ${track.name} - DiffSinger音声合成機能搭載` :
                `Track: ${track.name}, Height: ${trackHeight}px, Resizing: ${isCurrentlyResizing}`
              }
              onMouseDown={(e) => !isCurrentlyResizing && onTrackSelectStart(track.id, e)}
              onMouseUp={!isCurrentlyResizing ? onTrackSelectEnd : undefined}
              onDoubleClick={(e) => !isCurrentlyResizing && onTrackDoubleClick(track.id, e)}
              onContextMenu={(e) => onShowTrackContextMenu(e, track.id)}
            >
                               {/* トラック情報パネル */}
               <div 
                 className={`flex-shrink-0 w-48 border-r border-gray-700 overflow-hidden transition-colors ${
                   isSelected ? 'bg-blue-900/30 border-blue-500/50' : 'bg-gray-800'
                 }`}
                 onMouseDown={(e) => {
                   e.stopPropagation()
                   onTrackSelectStart(track.id, e)
                 }}
               >
                 <div className="p-3 min-h-0" style={{ height: `${trackHeight}px` }}>
                   {/* タイトルと音色設定ボタンを横並びに配置 */}
                   <div className="flex items-center justify-between mb-1">
                     <div className="flex items-center space-x-2 min-w-0 flex-1">
                       <div
                         className="w-3 h-3 rounded-full flex-shrink-0"
                         style={{ backgroundColor: track.color }}
                       />
                       <span className={`font-medium text-white truncate ${
                         trackHeight >= 60 ? 'text-sm' : 'text-xs'
                       }`}>
                         {track.name}
                       </span>
                     </div>

                     {/* Piano, Bass track用: 音色設定ボタン（タイトルの右側に配置） */}
                     {(track.subtype === 'piano' || track.subtype === 'bass' ||
                       track.name.toLowerCase().includes('piano') || track.name.toLowerCase().includes('bass')) && (
                       <Button
                         variant="ghost"
                         size="sm"
                         className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 flex-shrink-0 p-1.5"
                         onClick={(e) => {
                           e.preventDefault()
                           e.stopPropagation()
                           console.log(`🎹 [TrackList] Opening tone settings for track: ${track.name} (${track.id})`)
                           setSelectedTrackForSettings(track.id)
                           instrumentSettings.openSettingsPanel()
                         }}
                         title="音色設定"
                         data-testid={`tone-settings-button-${track.id}`}
                       >
                         <Sliders className="h-3.5 w-3.5" />
                       </Button>
                     )}
                   </div>
                   
                   {/* ノート情報（高さが足りない場合は隠れる） */}
                   {(hasMidiData || track.subtype === 'drums') && trackHeight >= 60 && (
                     <div className="text-xs text-gray-400 mt-0.5">
                       {(() => {
                         // ドラムトラックの場合は実際のグリッドデータを表示
                         if (track.subtype === 'drums') {
                           const drumData = drumTrackManager.getDrumTrack(track.id);
                           if (!drumData || !drumData.grid) {
                             return '🥁 No data';
                           }
                           
                           let activeCells = 0;
                           let maxSteps = 0;
                           
                           for (const row of drumData.grid) {
                             if (Array.isArray(row)) {
                               maxSteps = Math.max(maxSteps, row.length);
                               for (const cell of row) {
                                 const isActive = typeof cell === 'boolean' ? cell : (cell && cell.active);
                                 if (isActive) activeCells++;
                               }
                             }
                           }
                           
                           const tempo = drumData.tempo || 120;
                           const stepDuration = 60 / tempo / 4; // 16分音符の長さ
                           const totalDuration = maxSteps * stepDuration;
                           
                           return `🥁 ${activeCells} hits | ${totalDuration.toFixed(1)}s | ${tempo}BPM`;
                         }
                         
                         // 通常のMIDIトラック（Piano Trackなど）
                         const midiData = getDrumTrackMidiData(track)
                         const notes = midiData?.notes || []
                         const noteCount = notes.length
                         let maxEndTime = 0

                         // 音階分析
                         const noteRange = { min: 127, max: 0 }

                         if (notes.length > 0) {
                           for (const note of notes) {
                             // 問題2の修正: startフィールドは既に秒単位なので1000で割らない
                             const noteStart = note.time !== undefined ? note.time : note.start
                             const noteDuration = note.duration || 0.5
                             const pitch = note.pitch || 60

                             maxEndTime = Math.max(maxEndTime, noteStart + noteDuration)
                             noteRange.min = Math.min(noteRange.min, pitch)
                             noteRange.max = Math.max(noteRange.max, pitch)
                           }

                           const minNoteName = getNoteName(noteRange.min)
                           const maxNoteName = getNoteName(noteRange.max)

                           // Piano Trackの場合は音階範囲を表示
                           if (track.subtype === 'piano' || track.name.toLowerCase().includes('piano')) {
                             return `🎹 ${noteCount} notes | ${minNoteName}-${maxNoteName} | ${maxEndTime.toFixed(1)}s`
                           } else {
                             return `🎵 ${noteCount} notes | ${minNoteName}-${maxNoteName} | ${maxEndTime.toFixed(1)}s`
                           }
                         }

                         return `${noteCount} notes | ${maxEndTime.toFixed(1)}s`
                       })()}
                     </div>
                   )}
                 </div>
               </div>

                               {/* トラックコンテンツエリア */}
               <div 
                 className="flex-1 relative min-w-0 overflow-visible"
                 onMouseDown={(e) => {
                   e.stopPropagation()
                   onTrackSelectStart(track.id, e)
                 }}
               >
                 <div 
                   className="relative" 
                   style={{ 
                     width: `${safeTrackAreaWidth}px`, 
                     height: `${trackHeight}px`,
                     maxWidth: `${safeTrackAreaWidth}px`,
                     overflow: 'visible'
                   }}
                 >
                   {/* ノート表示エリア（高さを拡張） */}
                   <div className="relative" style={{ 
                     width: `${safeTrackAreaWidth}px`, 
                     height: `${trackHeight}px`,
                     minHeight: `${trackHeight}px`,
                     overflow: 'visible'
                   }}>
                     {/* トラックタイプに応じたコンテンツを表示 */}
                     {track.type === 'voiceSynth' ? (
                       <div className="relative w-full h-full">
                         <VoiceSynthTrack
                           track={track}
                           trackState={trackState}
                           trackHeight={trackHeight}
                           pixelsPerSecond={pixelsPerSecond}
                           isSelected={isSelected}
                           onUpdateTrackState={onUpdateTrackState}
                           onOpenLyricsPanel={() => {
                             // 歌詞パネルを開く処理（後で実装）
                             console.log('Open lyrics panel for track:', track.id);
                           }}
                         />
                       </div>
                     ) : track.subtype === 'drums' ? (
                       <>
                                                    {(() => {
                             // ドラムトラックの場合は実際のグリッドデータを表示
                             const drumData = drumTrackManager.getDrumTrack(track.id);
                             
                             if (!drumData || !drumData.grid || !drumData.instruments) {
                               return null;
                             }
                             
                             const { grid, instruments, tempo = 120 } = drumData;
                             const stepDuration = 60 / tempo / 4; // 16分音符の長さ
                             const cellWidth = stepDuration * pixelsPerSecond;
                           
                           const drumNotes = [];
                           
                           // グリッドからドラムノートを生成
                           for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
                             const row = grid[rowIndex];
                             const instrument = instruments[rowIndex];
                             
                             if (!Array.isArray(row) || !instrument) continue;
                             
                             for (let stepIndex = 0; stepIndex < row.length; stepIndex++) {
                               const cell = row[stepIndex];
                               const isActive = typeof cell === 'boolean' ? cell : (cell && cell.active);
                               
                               if (isActive) {
                                 const noteStart = stepIndex * stepDuration;
                                 const noteDuration = stepDuration * 0.8; // 少し短くして見やすく
                                 const left = noteStart * pixelsPerSecond;
                                 const width = Math.max(2, noteDuration * pixelsPerSecond);
                                 
                                 // 楽器ごとに異なる高さ位置に表示
                                 const drumNoteHeight = 6;
                                 const drumNoteTop = 10 + rowIndex * 12;
                                 
                                 drumNotes.push(
                                   <div
                                     key={`${track.id}-drum-${rowIndex}-${stepIndex}`}
                                     className="absolute rounded-sm cursor-pointer hover:scale-105 transition-all shadow-sm"
                                     style={{
                                       left: `${left}px`,
                                       top: `${drumNoteTop}px`,
                                       width: `${width}px`,
                                       height: `${drumNoteHeight}px`,
                                       backgroundColor: instrument.color || '#8B5CF6',
                                       border: `1px solid ${instrument.color || '#7C3AED'}`,
                                       zIndex: 10
                                     }}
                                     title={`${instrument.name || 'Drum'}: ${instrument.pitch} (${getNoteName(instrument.pitch)}), Step: ${stepIndex}, Row: ${rowIndex}`}
                                   />
                                 );
                               }
                             }
                           }
                           
                           return drumNotes;
                         })()}
                         <div className="absolute top-0 right-0 text-xs text-gray-400 bg-gray-800 px-1">
                           {(() => {
                             const drumData = drumTrackManager.getDrumTrack(track.id);
                             if (!drumData || !drumData.grid) return 0;
                             
                             let activeCells = 0;
                             for (const row of drumData.grid) {
                               if (Array.isArray(row)) {
                                 for (const cell of row) {
                                   const isActive = typeof cell === 'boolean' ? cell : (cell && cell.active);
                                   if (isActive) activeCells++;
                                 }
                               }
                             }
                             return `${activeCells} hits`;
                           })()}
                         </div>
                       </>
                     ) : (hasMidiData && track.subtype !== 'drums') ? (
                       <>
                         {(() => {
                           // 通常のMIDIトラックの場合はMIDIデータを表示
                           const midiData = getDrumTrackMidiData(track)
                           const notes = midiData?.notes || []
                           
                           return notes.map((note, index) => {
                             const noteNumber = note.pitch || 60
                             const noteStart = note.time !== undefined ? note.time : (note.start / 1000)
                             const noteDuration = note.duration || 0.5
                             const noteVelocity = note.velocity || 0.8
                             
                             const left = noteStart * pixelsPerSecond
                             const width = Math.max(2, noteDuration * pixelsPerSecond)
                             
                             // 通常のMIDIノート表示
                             const normalizedPosition = (noteNumber - NOTE_MIN) / NOTE_RANGE
                             const top = 10 + (1 - normalizedPosition) * (trackHeight - 20) // トラック高さ - 20px余白
                             const height = 6
                             
                             return (
                               <div
                                 key={`${track.id}-note-${index}-${noteStart}`}
                                 className="absolute rounded-sm cursor-pointer hover:scale-105 transition-all shadow-sm"
                                 style={{
                                   left: `${left}px`,
                                   top: `${top}px`,
                                   width: `${width}px`,
                                   height: `${height}px`,
                                   backgroundColor: '#6B7280',
                                   border: '1px solid #6B7280',
                                   zIndex: 10
                                 }}
                                 title={`Note: ${noteNumber} (${getNoteName(noteNumber)}), Velocity: ${Math.round(noteVelocity * 100)}%, Duration: ${noteDuration}s`}
                               />
                             )
                           })
                         })()}
                         <div className="absolute top-0 right-0 text-xs text-gray-400 bg-gray-800 px-1">
                           {(() => {
                             // 既に取得したMIDIデータを再利用
                             const midiData = getDrumTrackMidiData(track)
                             return midiData?.notes?.length || 0
                           })()} notes
                         </div>
                       </>
                     ) : (
                       <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                         
                       </div>
                     )}
                     {/* 再生位置バー（トラック用） */}
                   <div
                     className="absolute top-0 w-1 h-full bg-red-500/80 z-10 shadow-lg cursor-ew-resize"
                     style={{ 
                       left: `${currentTime * pixelsPerSecond}px`,
                       transform: 'translateZ(0)',
                       willChange: 'left',
                       transition: 'none',
                       boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)'
                     }}
                     title={`再生位置: ${currentTime.toFixed(2)}s, 計算位置: ${(currentTime * pixelsPerSecond).toFixed(1)}px, スクロール: ${horizontalScrollPosition || 0}px`}
                   />
                 </div>
               </div>
                                </div>
               
               {/* リサイズハンドル */}
               <div
                 className="absolute bottom-0 left-0 right-0 h-3 bg-gray-600 cursor-ns-resize hover:bg-gray-500 active:bg-gray-400 transition-colors z-50 flex items-center justify-center"
                 onMouseDown={(e) => {
                   e.preventDefault()
                   e.stopPropagation()
                   onResizeStart(track.id, e)
                 }}
                 title="ドラッグしてトラックの高さを変更"
                 style={{ touchAction: 'none' }}
               >
                 <div className="w-8 h-1 bg-gray-400 rounded-full"></div>
               </div>
              </div>
            )
          })}
        
        {/* トラック追加ボタン */}
        <div className="relative h-16 border-b border-gray-700">
          <Button 
            onClick={onTrackMenuToggle}
            variant="outline" 
            className="m-4 border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
            data-track-menu-trigger
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Track
          </Button>
          
          {/* トラック選択メニュー */}
          {showTrackMenu && (
            <div 
              ref={menuRef}
              className="track-menu-container fixed w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-2xl z-[9999999] overflow-hidden"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`
              }}
            >
              <div className="py-2">
                {UNIFIED_TRACK_TYPES.map((trackType) => {
                  const IconComponent = trackType.icon
                  return (
                    <button
                      key={trackType.id}
                      className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 flex items-center group"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('🔧 [TrackList] Button clicked:', trackType.id, 'onAddTrack:', typeof onAddTrack);

                        // 🚀 FIX: メニューを即座に閉じる（トラック追加の前に実行）
                        // 引数なしで呼び出すことで即座にクローズ
                        console.log('🔧 [TrackList] Closing track menu IMMEDIATELY before track creation');
                        if (onCloseMenu) {
                          onCloseMenu(); // 引数なし = 即座クローズ
                        }

                        // メニューが確実に閉じるようにsetTimeoutを使用
                        setTimeout(() => {
                          if (onAddTrack) {
                            console.log('🔧 [TrackList] Executing onAddTrack for:', trackType.id);
                            onAddTrack(trackType.id);
                          } else {
                            console.error('🚨 [TrackList] onAddTrack is not defined!');
                          }
                        }, 10); // 10msの遅延でメニューのクローズを確実にする
                      }}
                    >
                      <div className={`w-10 h-10 rounded-lg ${trackType.color} flex items-center justify-center mr-3 group-hover:opacity-80 transition-colors`}>
                        <IconComponent className={`h-5 w-5 ${trackType.iconColor}`} />
                      </div>
                      <div>
                        <div className="font-medium">{trackType.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{trackType.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* 音色設定パネル */}
      {instrumentSettings.showSettingsPanel && selectedTrackForSettings && (
        <InstrumentSettingsPanel
          trackId={selectedTrackForSettings}
          instrument={instrumentSettings.instrument}
          settings={instrumentSettings.settings}
          onSettingsChange={instrumentSettings.handleSettingsChange}
          onClose={instrumentSettings.closeSettingsPanel}
          onSave={instrumentSettings.handleSaveSettings}
          onReset={instrumentSettings.handleResetSettings}
          musicTheorySettings={musicTheorySettings}
          onMusicTheorySettingsChange={onMusicTheorySettingsChange}
          aiModel={globalAISettings.aiModel}
          onAiModelChange={(model) => {
            console.log('🎹 [TrackList] AI Model Changed:', model)
            onAISettingsChange('aiModel', model)
          }}
          ghostTextEnabled={globalAISettings.ghostTextEnabled}
          onGhostTextToggle={(enabled) => {
            console.log('🎹 [TrackList] Ghost Text Toggled:', enabled)
            onAISettingsChange('ghostTextEnabled', enabled)
          }}
          summaryStatus={globalAISettings.summaryStatus}
          onUpdateSummary={(status) => onAISettingsChange('summaryStatus', status)}
          predictionSettings={globalAISettings.predictionSettings}
          onPredictionSettingsChange={(settings) => onAISettingsChange('predictionSettings', settings)}
        />
      )}
    </div>
  )
}

export default TrackList 