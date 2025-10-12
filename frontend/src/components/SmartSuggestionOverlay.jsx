/**
 * スマートサジェスチョンオーバーレイコンポーネント
 * リアルタイム音楽補完提案表示、ゴーストノート、コード進行支援
 */

import React, { useState, useEffect, useRef } from 'react';
import smartSuggestionEngine from '../engines/SmartSuggestionEngine.js';

const SmartSuggestionOverlay = ({
  genreContext,
  currentNotes = [],
  currentPosition = 0,
  currentTrackType = 'midi', // 'midi' | 'drum' | 'diffsinger'
  isEnabled = true,
  aggressiveness = 0.5,
  showGhostNotes = true,
  onSuggestionAccept,
  onSuggestionReject,
  className = ""
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [chordSuggestions, setChordSuggestions] = useState([]);
  const [rhythmSuggestions, setRhythmSuggestions] = useState([]);
  const [ghostNotes, setGhostNotes] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const suggestionTimeoutRef = useRef(null);

  // SmartSuggestionEngine初期化
  useEffect(() => {
    const initializeEngine = async () => {
      try {
        await smartSuggestionEngine.initialize();
        console.log('✅ SmartSuggestionOverlay: エンジン初期化完了');
      } catch (err) {
        console.error('❌ SmartSuggestionEngine初期化エラー:', err);
      }
    };

    initializeEngine();
  }, []);

  // サジェスチョン生成（デバウンス処理）
  useEffect(() => {
    if (!isEnabled || !genreContext || !smartSuggestionEngine.initialized) {
      setSuggestions([]);
      setIsVisible(false);
      return;
    }

    // 前のタイムアウトをクリア
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    // デバウンス: 300ms後にサジェスチョン生成
    suggestionTimeoutRef.current = setTimeout(async () => {
      await generateSuggestions();
    }, 300);

    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [currentNotes, currentPosition, genreContext, isEnabled, aggressiveness, currentTrackType]);

  // サジェスチョン生成処理
  const generateSuggestions = async () => {
    try {
      setIsLoading(true);

      const context = {
        currentNotes,
        lastNote: currentNotes[currentNotes.length - 1],
        genreContext,
        position: currentPosition,
        trackType: currentTrackType,
        aggressiveness
      };

      switch (currentTrackType) {
        case 'midi':
          const noteSuggestions = await smartSuggestionEngine.suggestNextNotes(context);
          setSuggestions(noteSuggestions);

          // 修正: 正しい引数形式でコード進行提案を呼び出し
          const chordSuggestions = await smartSuggestionEngine.suggestChordProgression(
            context.genreContext,
            currentNotes,
            context.position
          );
          setChordSuggestions(chordSuggestions);

          // ゴーストノート生成
          if (showGhostNotes) {
            const ghostNotes = await smartSuggestionEngine.generateGhostNotes(context);
            setGhostNotes(ghostNotes);
          }
          break;

        case 'drum':
          // 修正: 正しい引数形式でリズムパターン提案を呼び出し
          const rhythmSuggestions = await smartSuggestionEngine.suggestRhythmPattern(
            context.genreContext,
            'drum',
            null
          );
          setRhythmSuggestions(rhythmSuggestions);
          break;

        case 'diffsinger':
          const melodySuggestions = await smartSuggestionEngine.suggestMelodyLine(context);
          setSuggestions(melodySuggestions);
          break;
      }

      // 信頼度計算
      const avgConfidence = suggestions.length > 0
        ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
        : 0;
      setConfidence(avgConfidence);

      // サジェスチョンがある場合は表示
      setIsVisible(suggestions.length > 0 || chordSuggestions.length > 0 || rhythmSuggestions.length > 0);

      console.log(`💡 サジェスチョン生成完了: ${suggestions.length}候補, 信頼度: ${(avgConfidence * 100).toFixed(1)}%`);
    } catch (err) {
      console.error('❌ サジェスチョン生成エラー:', err);
      setSuggestions([]);
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  // サジェスチョン採用処理
  const handleAcceptSuggestion = (suggestion) => {
    setSelectedSuggestion(suggestion);

    if (onSuggestionAccept) {
      onSuggestionAccept(suggestion);
    }

    // 採用後、サジェスチョンをクリア
    setTimeout(() => {
      setSuggestions([]);
      setIsVisible(false);
      setSelectedSuggestion(null);
    }, 500);

    console.log('✅ サジェスチョン採用:', suggestion);
  };

  // サジェスチョン却下処理
  const handleRejectSuggestion = (suggestion) => {
    if (onSuggestionReject) {
      onSuggestionReject(suggestion);
    }

    // 該当サジェスチョンを除去
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    setChordSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

    console.log('❌ サジェスチョン却下:', suggestion);
  };

  // 信頼度カラー取得
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100 border-green-200';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-100 border-blue-200';
    if (confidence >= 0.4) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-gray-600 bg-gray-100 border-gray-200';
  };

  // 音名表示
  const formatNoteName = (pitch) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(pitch / 12) - 1;
    const note = noteNames[pitch % 12];
    return `${note}${octave}`;
  };

  // レンダリング条件
  if (!isEnabled || !isVisible || (!suggestions.length && !chordSuggestions.length && !rhythmSuggestions.length)) {
    return null;
  }

  return (
    <div className={`smart-suggestion-overlay ${className}`}>
      {/* メインオーバーレイ */}
      <div className="fixed top-20 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-w-sm">
        {/* ヘッダー */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              💡 スマートサジェスチョン
            </h3>
            <div className="flex items-center space-x-2">
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
              <span className={`text-xs px-2 py-1 rounded border ${getConfidenceColor(confidence)}`}>
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {genreContext && (
            <p className="text-xs text-gray-600 mt-1">
              🎵 {genreContext.genre.name.ja} | {genreContext.activeKey.root} {genreContext.activeKey.quality}
            </p>
          )}
        </div>

        {/* サジェスチョンリスト */}
        <div className="max-h-96 overflow-y-auto">
          {/* MIDI ノートサジェスチョン */}
          {currentTrackType === 'midi' && suggestions.length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <h4 className="text-xs font-medium text-gray-700 mb-2">🎹 次のノート</h4>
              <div className="space-y-2">
                {suggestions.slice(0, 3).map((suggestion, idx) => (
                  <div
                    key={suggestion.id || idx}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {formatNoteName(suggestion.pitch)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {typeof suggestion.reasoning === 'string' ? suggestion.reasoning : '音楽理論に基づく提案'}
                      </div>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={() => handleAcceptSuggestion(suggestion)}
                        className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleRejectSuggestion(suggestion)}
                        className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* コード進行サジェスチョン */}
          {chordSuggestions.length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <h4 className="text-xs font-medium text-gray-700 mb-2">🎼 コード進行</h4>
              <div className="space-y-2">
                {chordSuggestions.slice(0, 2).map((suggestion, idx) => (
                  <div
                    key={suggestion.id || idx}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {suggestion.chordSymbol}
                      </div>
                      <div className="text-xs text-gray-600">
                        {suggestion.functionAnalysis || 'ハーモニー提案'}
                      </div>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={() => handleAcceptSuggestion(suggestion)}
                        className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleRejectSuggestion(suggestion)}
                        className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* リズムパターンサジェスチョン */}
          {currentTrackType === 'drum' && rhythmSuggestions.length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <h4 className="text-xs font-medium text-gray-700 mb-2">🥁 リズムパターン</h4>
              <div className="space-y-2">
                {rhythmSuggestions.slice(0, 2).map((suggestion, idx) => (
                  <div
                    key={suggestion.id || idx}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {suggestion.patternName || `パターン ${idx + 1}`}
                      </div>
                      <div className="text-xs text-gray-600">
                        {suggestion.description || 'ジャンル特性に基づく提案'}
                      </div>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={() => handleAcceptSuggestion(suggestion)}
                        className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleRejectSuggestion(suggestion)}
                        className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>💭 AI音楽理論支援</span>
            <div className="flex items-center space-x-2">
              <span>積極度:</span>
              <div className="w-16 bg-gray-200 rounded-full h-1">
                <div
                  className="bg-blue-600 h-1 rounded-full"
                  style={{ width: `${aggressiveness * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ゴーストノート表示 (ピアノロール上に重なって表示される想定) */}
      {showGhostNotes && ghostNotes.length > 0 && (
        <div className="ghost-notes-container">
          {ghostNotes.map((ghostNote, idx) => (
            <div
              key={idx}
              className="ghost-note"
              style={{
                position: 'absolute',
                left: `${ghostNote.time * 100}px`, // 時間位置
                top: `${(127 - ghostNote.pitch) * 2}px`, // ピッチ位置
                width: `${ghostNote.duration * 100}px`, // 長さ
                height: '14px',
                backgroundColor: 'rgba(59, 130, 246, 0.3)',
                border: '1px dashed #3b82f6',
                borderRadius: '2px',
                pointerEvents: 'none',
                zIndex: 10
              }}
              title={`提案: ${formatNoteName(ghostNote.pitch)} (信頼度: ${(ghostNote.confidence * 100).toFixed(0)}%)`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartSuggestionOverlay;