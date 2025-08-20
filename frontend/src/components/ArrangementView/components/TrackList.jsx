import { Button } from '../../ui/button.jsx'
import { 
  Plus, 
  Piano, 
  AudioWaveform, 
  Drum, 
  Mic,
  RefreshCw,
  Volume2,
  VolumeX,
  Music
} from 'lucide-react'
import VoiceSynthTrack from './VoiceSynthTrack.jsx'
import { 
  DEFAULT_TRACK_HEIGHT,
  NOTE_MIN,
  NOTE_RANGE,
  TRACK_INFO_PANEL_WIDTH,
  getNoteName
} from '../utils/arrangementUtils.js'
import virtualizationManager from '../../../utils/virtualization.js'
import { useMemo, useCallback, useRef, useEffect } from 'react'
import drumTrackManager from '../../../utils/drumTrackManager.js'

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
  showTrackMenu,
  menuPosition,
  menuRef,
  onAddTrack,
  forceRerenderApp,
  onUpdateTrackState,
  onHorizontalScroll,
  onEmptyAreaContextMenu
}) => {
  // MIDIデータのキャッシュ
  const midiDataCache = useRef(new Map())
  
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
      {/* 複数選択ヘルプ */}
      <div className="bg-gray-800/50 border-b border-gray-700 px-4 py-2 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>💡 複数選択: <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">Shift</kbd> + クリックで範囲選択、<kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">Ctrl</kbd> + クリックで個別選択</span>
            <span>⌨️ ショートカット: <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">Ctrl+A</kbd> 全選択、<kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">Ctrl+C</kbd> コピー、<kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">Ctrl+V</kbd> 貼り付け、<kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">Delete</kbd> 削除</span>
            { (selectedTracks?.size ?? 0) > 0 && (
              <span className="text-blue-400 font-medium">
                {selectedTracks?.size ?? 0}個のトラックが選択中
              </span>
            )}
          </div>
        </div>
      </div>
      
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
              className={`relative flex border-b border-gray-700 hover:bg-gray-800/30 transition-all duration-200 cursor-pointer ${
                isSelected ? 'bg-blue-500/10 border-blue-500 shadow-lg ring-2 ring-blue-500/50' : ''
              } ${isCurrentlyResizing ? 'pointer-events-none' : ''}`}
              style={{ 
                height: `${trackHeight}px`,
                willChange: isCurrentlyResizing ? 'height' : 'auto',
                borderLeft: isSelected ? '4px solid #3B82F6' : '4px solid transparent',
                borderRight: isSelected ? '4px solid #3B82F6' : '4px solid transparent',
                // 複数選択時の視覚的フィードバック
                backgroundColor: isSelected ? 
                  (selectedTracks.size > 1 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)') : 
                  undefined
              }}
              title={`Track: ${track.name}, Height: ${trackHeight}px, Resizing: ${isCurrentlyResizing}`}
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
                   <div className="flex items-center justify-between mb-2">
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
                   </div>
                   
                   {/* コントロールボタン（高さが足りない場合は隠れる） */}
                   {trackHeight >= 60 && (
                     <div className="flex items-center justify-between mb-1">
                       <div className="flex items-center space-x-1">
                         <Button
                           variant="ghost"
                           size="sm"
                           className={`${trackState.muted ? 'text-red-400' : 'text-gray-400'} hover:text-white`}
                           onClick={(e) => {
                             e.preventDefault()
                             e.stopPropagation()
                             onUpdateTrackState(track.id, { muted: !trackState.muted })
                           }}
                         >
                           {trackState.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                         </Button>
                         
                         <Button
                           variant="ghost"
                           size="sm"
                           className={`${trackState.solo ? 'text-yellow-400' : 'text-gray-400'} hover:text-white`}
                           onClick={(e) => {
                             e.preventDefault()
                             e.stopPropagation()
                             onUpdateTrackState(track.id, { solo: !trackState.solo })
                           }}
                         >
                           S
                         </Button>
                       </div>
                     </div>
                   )}
                   
                   {/* ノート情報（高さが足りない場合は隠れる） */}
                   {(hasMidiData || track.subtype === 'drums') && trackHeight >= 80 && (
                     <div className="text-xs text-gray-400">
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
                         
                         // 通常のMIDIトラック
                         const midiData = getDrumTrackMidiData(track)
                         const noteCount = midiData?.notes?.length || 0
                         let maxEndTime = 0
                         
                         if (midiData?.notes) {
                           for (const note of midiData.notes) {
                             const noteStart = note.time !== undefined ? note.time : (note.start / 1000)
                             const noteDuration = note.duration || 0.5
                             maxEndTime = Math.max(maxEndTime, noteStart + noteDuration)
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
                     ) : hasMidiData ? (
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
                <button 
                  className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 flex items-center group"
                  onClick={() => onAddTrack('piano')}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center mr-3 group-hover:bg-blue-500/20 dark:group-hover:bg-blue-400/20 transition-colors">
                    <Piano className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium">楽器トラック</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">MIDI楽器やシンセサイザー</div>
                  </div>
                </button>
                <button 
                  className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 flex items-center group"
                  onClick={() => onAddTrack('bass')}
                >
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 dark:bg-green-400/10 flex items-center justify-center mr-3 group-hover:bg-green-500/20 dark:group-hover:bg-green-400/20 transition-colors">
                    <AudioWaveform className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">ベーストラック</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">ベースライン楽器</div>
                  </div>
                </button>
                <button 
                  className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 flex items-center group"
                  onClick={() => onAddTrack('drums')}
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 dark:bg-purple-400/10 flex items-center justify-center mr-3 group-hover:bg-purple-500/20 dark:group-hover:bg-purple-400/20 transition-colors">
                    <Drum className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium">ドラムトラック</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">ドラムキットやパーカッション</div>
                  </div>
                </button>
                <button 
                  className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 flex items-center group"
                  onClick={() => onAddTrack('lead')}
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 dark:bg-orange-400/10 flex items-center justify-center mr-3 group-hover:bg-orange-500/20 dark:group-hover:bg-orange-400/20 transition-colors">
                    <Mic className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="font-medium">リードトラック</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">メロディーライン楽器</div>
                  </div>
                </button>
                <button 
                  className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 flex items-center group"
                  onClick={() => onAddTrack('pad')}
                >
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 dark:bg-yellow-400/10 flex items-center justify-center mr-3 group-hover:bg-yellow-500/20 dark:group-hover:bg-yellow-400/20 transition-colors">
                    <AudioWaveform className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <div className="font-medium">パッドトラック</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">アンビエント・パッド音</div>
                  </div>
                </button>
                <button 
                  className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 flex items-center group"
                  onClick={() => onAddTrack('voiceSynth')}
                >
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 dark:bg-pink-400/10 flex items-center justify-center mr-3 group-hover:bg-pink-500/20 dark:group-hover:bg-pink-400/20 transition-colors">
                    <Music className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <div className="font-medium">歌声合成トラック</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">DiffSinger歌声合成</div>
                  </div>
                </button>
                {forceRerenderApp && (
                  <button 
                    className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 flex items-center group border-t border-gray-200/50 dark:border-gray-700/50"
                    onClick={() => {
                      forceRerenderApp()
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 dark:bg-red-400/10 flex items-center justify-center mr-3 group-hover:bg-red-500/20 dark:group-hover:bg-red-400/20 transition-colors">
                      <RefreshCw className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <div className="font-medium">強制再読み込み</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">タブとコンポーネントを再ロード</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

export default TrackList 