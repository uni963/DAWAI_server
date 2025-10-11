import { useState, useEffect } from 'react';
import { Button } from '../../ui/button.jsx';
import { Textarea } from '../../ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs.jsx';
import { FileText, Music, Languages, RefreshCw, Check } from 'lucide-react';

/**
 * 歌詞入力パネルコンポーネント
 * 
 * @param {Object} props
 * @param {Object} props.track - トラック情報
 * @param {Function} props.onUpdateLyrics - 歌詞更新関数
 * @param {Function} props.onClose - パネルを閉じる関数
 * @param {boolean} props.isOpen - パネルの表示状態
 */
const LyricsPanel = ({
  track,
  onUpdateLyrics,
  onClose,
  isOpen = false
}) => {
  const [lyrics, setLyrics] = useState('');
  const [language, setLanguage] = useState('japanese');
  const [autoSplit, setAutoSplit] = useState(true);
  const [phonemes, setPhonemes] = useState([]);
  const [activeTab, setActiveTab] = useState('lyrics');
  
  // トラックから歌詞データを読み込む
  useEffect(() => {
    if (track && track.voiceSynthData) {
      setLyrics(track.voiceSynthData.lyrics || '');
      setLanguage(track.voiceSynthData.language || 'japanese');
    }
  }, [track]);
  
  // 歌詞変更ハンドラ
  const handleLyricsChange = (e) => {
    setLyrics(e.target.value);
    
    // 自動分割が有効な場合は音素分割をプレビュー
    if (autoSplit) {
      previewPhonemes(e.target.value, language);
    }
  };
  
  // 言語変更ハンドラ
  const handleLanguageChange = (value) => {
    setLanguage(value);
    
    // 言語が変更されたら音素分割を更新
    if (autoSplit) {
      previewPhonemes(lyrics, value);
    }
  };
  
  // 音素分割プレビュー
  const previewPhonemes = (text, lang) => {
    // 実際の実装では、APIリクエストを送信して音素分割を取得する
    // ここでは簡易的な実装
    const mockPhonemes = [];
    
    if (lang === 'japanese') {
      // 日本語の場合は文字単位で分割
      for (let i = 0; i < text.length; i++) {
        if (text[i].trim() !== '') {
          mockPhonemes.push({
            text: text[i],
            phoneme: text[i]
          });
        }
      }
    } else {
      // 英語の場合は単語単位で分割
      const words = text.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        if (words[i].trim() !== '') {
          mockPhonemes.push({
            text: words[i],
            phoneme: words[i].split('').join('-')
          });
        }
      }
    }
    
    setPhonemes(mockPhonemes);
  };
  
  // 歌詞を保存
  const handleSaveLyrics = () => {
    if (onUpdateLyrics) {
      onUpdateLyrics({
        lyrics,
        language,
        phonemes
      });
    }
  };
  
  // 歌詞をMIDIノートに自動分配
  const handleAutoAssignLyrics = () => {
    if (!track || !track.midiData || !track.midiData.notes || track.midiData.notes.length === 0) {
      return;
    }
    
    // 実際の実装では、歌詞をMIDIノートに分配するロジックを実装する
    console.log('歌詞を自動分配:', lyrics);
    
    // 簡易的な実装: 歌詞を文字単位で分割し、各ノートに割り当てる
    const chars = lyrics.replace(/\s+/g, '').split('');
    const notes = [...track.midiData.notes];
    
    // ノートの数だけ歌詞を割り当てる
    for (let i = 0; i < Math.min(notes.length, chars.length); i++) {
      notes[i] = {
        ...notes[i],
        lyric: chars[i]
      };
    }
    
    // 更新されたノートデータを保存
    if (onUpdateLyrics) {
      onUpdateLyrics({
        lyrics,
        language,
        phonemes,
        notes
      });
    }
  };
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-700 p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-pink-400" />
            <h2 className="text-lg font-medium text-white">歌詞編集</h2>
            <span className="text-sm text-gray-400">- {track?.name || 'トラック'}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-700">
              <TabsList className="bg-transparent border-b border-gray-700">
                <TabsTrigger value="lyrics" className="data-[state=active]:border-pink-500">
                  <FileText className="h-4 w-4 mr-2" />
                  歌詞入力
                </TabsTrigger>
                <TabsTrigger value="phonemes" className="data-[state=active]:border-blue-500">
                  <Music className="h-4 w-4 mr-2" />
                  音素分割
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="lyrics" className="p-4 overflow-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Languages className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">言語:</span>
                  </div>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="言語を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="japanese">日本語</SelectItem>
                      <SelectItem value="english">英語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Textarea
                    placeholder="歌詞を入力してください..."
                    value={lyrics}
                    onChange={handleLyricsChange}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="min-h-[200px] bg-gray-800 border-gray-700"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoSplit"
                    checked={autoSplit}
                    onChange={(e) => setAutoSplit(e.target.checked)}
                    className="rounded border-gray-700 bg-gray-800"
                  />
                  <label htmlFor="autoSplit" className="text-sm text-gray-400">
                    自動音素分割プレビュー
                  </label>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="phonemes" className="p-4 overflow-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">音素分割プレビュー</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => previewPhonemes(lyrics, language)}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    更新
                  </Button>
                </div>
                
                <div className="bg-gray-800 border border-gray-700 rounded-md p-4">
                  {phonemes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {phonemes.map((item, index) => (
                        <div
                          key={index}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          title={item.phoneme}
                        >
                          {item.text}
                          <span className="text-xs text-gray-400 block">
                            {item.phoneme}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      歌詞を入力すると音素分割プレビューが表示されます
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="border-t border-gray-700 p-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleAutoAssignLyrics}
            disabled={!lyrics || !track?.midiData?.notes?.length}
          >
            <Music className="h-4 w-4 mr-2" />
            MIDIノートに自動割り当て
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSaveLyrics} disabled={!lyrics}>
              <Check className="h-4 w-4 mr-2" />
              保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LyricsPanel;