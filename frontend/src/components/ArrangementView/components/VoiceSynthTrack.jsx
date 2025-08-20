import { useState, useEffect } from 'react';
import { Mic, Music, FileText, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../../ui/button.jsx';
import LyricsPanel from './LyricsPanel.jsx';

/**
 * 歌声合成トラックコンポーネント
 * 
 * @param {Object} props
 * @param {Object} props.track - トラック情報
 * @param {Object} props.trackState - トラックの状態
 * @param {number} props.trackHeight - トラックの高さ
 * @param {number} props.pixelsPerSecond - 1秒あたりのピクセル数
 * @param {boolean} props.isSelected - 選択状態
 * @param {Function} props.onUpdateTrackState - トラック状態更新関数
 */
const VoiceSynthTrack = ({
  track,
  trackState,
  trackHeight,
  pixelsPerSecond,
  isSelected,
  onUpdateTrackState
}) => {
  const [hasLyrics, setHasLyrics] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [showLyricsPanel, setShowLyricsPanel] = useState(false);
  
  // MIDIデータの有無を確認
  const hasMidiData = track.midiData && track.midiData.notes && track.midiData.notes.length > 0;
  
  // 歌詞データの有無を確認
  useEffect(() => {
    if (track.voiceSynthData && track.voiceSynthData.lyrics) {
      setHasLyrics(true);
    } else {
      setHasLyrics(false);
    }
  }, [track.voiceSynthData]);
  
  // 生成済み音声の有無を確認
  useEffect(() => {
    if (track.voiceSynthData && track.voiceSynthData.generatedAudioPath) {
      setGeneratedAudio(track.voiceSynthData.generatedAudioPath);
    } else {
      setGeneratedAudio(null);
    }
  }, [track.voiceSynthData]);

  // 歌声生成ボタンクリック時の処理
  const handleGenerateVoice = () => {
    // 実際の実装では、APIリクエストを送信して歌声を生成する
    console.log('歌声生成リクエスト:', track.id);
    // TODO: 歌声合成APIとの連携
  };

  // 歌詞編集ボタンクリック時の処理
  const handleEditLyrics = () => {
    setShowLyricsPanel(true);
  };
  
  // 歌詞更新時の処理
  const handleUpdateLyrics = (lyricsData) => {
    if (onUpdateTrackState) {
      // トラックの歌声合成データを更新
      const updatedVoiceSynthData = {
        ...track.voiceSynthData,
        lyrics: lyricsData.lyrics,
        language: lyricsData.language,
        phonemes: lyricsData.phonemes
      };
      
      // ノートに歌詞が割り当てられている場合は更新
      if (lyricsData.notes) {
        onUpdateTrackState(track.id, {
          voiceSynthData: updatedVoiceSynthData,
          midiData: {
            ...track.midiData,
            notes: lyricsData.notes
          }
        });
      } else {
        onUpdateTrackState(track.id, {
          voiceSynthData: updatedVoiceSynthData
        });
      }
      
      setHasLyrics(!!lyricsData.lyrics);
      setShowLyricsPanel(false);
    }
  };

  return (
    <div className="relative h-full">
      {/* トラックコンテンツ */}
      <div className="relative h-full flex flex-col">
        {/* トラック情報 */}
        <div className="absolute top-2 left-2 flex items-center space-x-2 z-10">
          <div className="flex items-center bg-gray-800/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs">
            <Mic className="h-3 w-3 mr-1 text-pink-400" />
            <span className="text-pink-400 font-medium">歌声合成</span>
          </div>
          
          {hasMidiData && (
            <div className="flex items-center bg-gray-800/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs">
              <Music className="h-3 w-3 mr-1 text-blue-400" />
              <span className="text-blue-400">{track.midiData.notes.length} ノート</span>
            </div>
          )}
          
          {hasLyrics && (
            <div className="flex items-center bg-gray-800/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs">
              <FileText className="h-3 w-3 mr-1 text-green-400" />
              <span className="text-green-400">歌詞あり</span>
            </div>
          )}
        </div>
        
        {/* MIDIノート表示 */}
        {hasMidiData && (
          <div className="relative h-full">
            {track.midiData.notes.map((note, index) => {
              const noteNumber = note.pitch || 60;
              const noteStart = note.time !== undefined ? note.time : (note.start / 1000);
              const noteDuration = note.duration || 0.5;
              
              const left = noteStart * pixelsPerSecond;
              const width = Math.max(2, noteDuration * pixelsPerSecond);
              
              // ノートの高さ位置を計算
              const noteRange = 127; // MIDI note range
              const normalizedPosition = (noteNumber - 0) / noteRange;
              const top = 10 + (1 - normalizedPosition) * (trackHeight - 20);
              
              // 歌詞があれば表示
              const lyric = note.lyric || '';
              
              return (
                <div
                  key={`${track.id}-note-${index}-${noteStart}`}
                  className="absolute rounded-sm cursor-pointer hover:scale-105 transition-all shadow-sm"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: '8px',
                    backgroundColor: lyric ? '#EC4899' : '#9333EA',
                    border: '1px solid rgba(255,255,255,0.2)',
                    zIndex: 10
                  }}
                  title={`Note: ${noteNumber}, Duration: ${noteDuration}s${lyric ? `, 歌詞: ${lyric}` : ''}`}
                >
                  {width > 20 && lyric && (
                    <div className="absolute -bottom-4 left-0 text-xs text-pink-300 whitespace-nowrap">
                      {lyric}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* 生成された音声波形表示 */}
        {generatedAudio && (
          <div 
            className="absolute bottom-0 left-0 right-0 h-1/3 bg-pink-900/20 border-t border-pink-500/30"
            style={{
              backgroundImage: 'linear-gradient(90deg, rgba(236,72,153,0.1) 1px, transparent 1px)',
              backgroundSize: `${pixelsPerSecond/4}px 100%`
            }}
          >
            {/* 波形表示（実際の実装ではWeb Audio APIで波形を描画） */}
            <div className="h-full w-full flex items-center justify-center text-xs text-pink-400">
              生成済み音声波形
            </div>
          </div>
        )}
        
        {/* MIDIデータがない場合のプレースホルダー */}
        {!hasMidiData && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            MIDIノートを追加してください
          </div>
        )}
        
        {/* 操作ボタン */}
        <div className="absolute bottom-2 right-2 flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-gray-800/80 border-gray-700 hover:bg-gray-700 text-xs"
            onClick={handleEditLyrics}
          >
            <FileText className="h-3 w-3 mr-1" />
            歌詞編集
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="bg-pink-900/80 border-pink-700 hover:bg-pink-800 text-pink-300 text-xs"
            onClick={handleGenerateVoice}
            disabled={!hasMidiData || !hasLyrics}
          >
            <Mic className="h-3 w-3 mr-1" />
            歌声生成
          </Button>
        </div>
      </div>
      
      {/* 歌詞編集パネル */}
      <LyricsPanel
        track={track}
        onUpdateLyrics={handleUpdateLyrics}
        onClose={() => setShowLyricsPanel(false)}
        isOpen={showLyricsPanel}
      />
    </div>
  );
};

export default VoiceSynthTrack;