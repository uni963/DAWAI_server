/**
 * ジャンル選択コンポーネント
 * ジャンル一覧表示、詳細情報、Demo Song統合
 */

import React, { useState, useEffect } from 'react';
import genreManager from '../managers/GenreManager.js';
import demoSongManager from '../managers/DemoSongManager.js';

const GenreSelector = ({
  onGenreSelect,
  onDemoSongLoad,
  onClose,
  currentGenreId = null,
  className = ""
}) => {
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [demoSongs, setDemoSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGenre, setExpandedGenre] = useState(currentGenreId);

  // 初期化
  useEffect(() => {
    const initializeManager = async () => {
      try {
        setIsLoading(true);

        // GenreManagerとDemoSongManagerの初期化
        await genreManager.initialize();
        await demoSongManager.initialize();

        // ジャンル一覧を取得
        const allGenres = genreManager.getAllGenres();
        setGenres(allGenres);

        // 現在のジャンルが指定されている場合
        if (currentGenreId) {
          const currentGenre = genreManager.getGenre(currentGenreId);
          setSelectedGenre(currentGenre);
          setExpandedGenre(currentGenreId);

          // 該当ジャンルのDemo Song一覧を取得
          const genreDemoSongs = demoSongManager.getDemoSongsByGenre(currentGenreId);
          setDemoSongs(genreDemoSongs);
        }

        console.log('✅ GenreSelector: 初期化完了');
      } catch (err) {
        console.error('❌ GenreSelector初期化エラー:', err);
        setError('ジャンル情報の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    initializeManager();
  }, [currentGenreId]);

  // ジャンル選択処理
  const handleGenreSelect = async (genre) => {
    try {
      setSelectedGenre(genre);
      setExpandedGenre(genre.id);

      // ジャンルコンテキストを生成
      const genreContext = genreManager.createGenreContext(
        genre.id,
        'C', // デフォルトキー
        genre.musicTheory.primaryScales[0]?.type || 'major'
      );

      // 該当ジャンルのDemo Song一覧を取得
      const genreDemoSongs = demoSongManager.getDemoSongsByGenre(genre.id);
      setDemoSongs(genreDemoSongs);

      // 親コンポーネントに通知
      if (onGenreSelect) {
        onGenreSelect(genre, genreContext);
      }

      console.log(`🎵 ジャンル選択: ${genre.name.ja}`);
    } catch (err) {
      console.error('❌ ジャンル選択エラー:', err);
      setError('ジャンル選択に失敗しました');
    }
  };

  // Demo Song読み込み処理
  const handleDemoSongLoad = async (demoSong) => {
    try {
      console.log(`🎼 Demo Song読み込み開始: ${demoSong.metadata.title.ja}`);

      // 親コンポーネントに通知（ProjectManagerでの読み込み処理）
      if (onDemoSongLoad) {
        await onDemoSongLoad(demoSong);
      }

      console.log(`✅ Demo Song読み込み完了: ${demoSong.metadata.title.ja}`);
    } catch (err) {
      console.error('❌ Demo Song読み込みエラー:', err);
      setError('Demo Songの読み込みに失敗しました');
    }
  };

  // 難易度カラー取得
  const getDifficultyColor = (difficulty) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  };

  // 難易度テキスト取得（多言語対応）
  const getDifficultyText = (difficulty) => {
    const texts = {
      beginner: '初心者',
      intermediate: '中級者',
      advanced: '上級者'
    };
    return texts[difficulty] || difficulty;
  };

  // ジャンルカード詳細の展開/折りたたみ
  const toggleGenreExpanded = (genreId) => {
    setExpandedGenre(expandedGenre === genreId ? null : genreId);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">ジャンル情報を読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-md ${className}`}>
        <div className="flex items-center">
          <div className="text-red-400">⚠️</div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">エラー</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`genre-selector ${className}`}>
      {/* ヘッダー */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          🎵 ジャンル選択
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          音楽ジャンルを選択して、Demo Songを読み込むか新規作成を開始
        </p>
      </div>

      {/* ジャンル一覧 */}
      <div className="space-y-3">
        {genres.map((genre) => (
          <div
            key={genre.id}
            className={`
              border rounded-lg overflow-hidden transition-all duration-200
              ${selectedGenre?.id === genre.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            {/* ジャンルカードヘッダー */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => handleGenreSelect(genre)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{genre.icon || '🎵'}</div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {genre.name?.ja || genre.name || 'Unknown Genre'}
                      <span className="text-sm text-gray-500 ml-2">
                        ({genre.name?.en || ''})
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600">
                      {genre.description?.ja || genre.description || 'ジャンルの説明'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* テンポ範囲 */}
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {genre.tempoRange?.min || 60}-{genre.tempoRange?.max || 180} BPM
                  </span>

                  {/* 展開ボタン */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGenreExpanded(genre.id);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {expandedGenre === genre.id ? '▼' : '▶'}
                  </button>
                </div>
              </div>
            </div>

            {/* ジャンル詳細（展開時） */}
            {expandedGenre === genre.id && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="mt-3 space-y-3">
                  {/* 音楽理論情報 */}
                  <div className="text-sm">
                    <h4 className="font-medium text-gray-700 mb-2">音楽理論特性</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-600">主要スケール:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {genre.musicTheory?.primaryScales?.map((scale, idx) => (
                            <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {scale.type}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">推奨楽器:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {genre.instrumentation?.recommended?.slice(0, 3).map((inst, idx) => (
                            <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {inst}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Demo Song一覧 */}
                  {selectedGenre?.id === genre.id && demoSongs.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        📼 Demo Songs ({demoSongs.length}曲)
                      </h4>
                      <div className="space-y-2">
                        {demoSongs.map((song) => (
                          <div
                            key={song.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded border hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="text-lg">🎼</div>
                              <div>
                                <h5 className="font-medium text-gray-900 text-sm">
                                  {song.metadata?.title?.ja || song.metadata?.title || 'Untitled'}
                                </h5>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(song.metadata?.difficulty)}`}>
                                    {getDifficultyText(song.metadata?.difficulty)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {song.structure?.tempo || 120} BPM
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {song.structure?.completedBars || 0}/{song.structure?.totalBars || 0} 小節
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDemoSongLoad(song)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                              読み込み
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 新規作成ボタン */}
                  <div className="pt-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        handleGenreSelect(genre);
                        if (onClose) onClose();
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      🎵 このジャンルで新規作成
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* フッター情報 */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
        💡 ヒント: ジャンルを選択すると、そのジャンルに適した音楽理論制約とスマート補完機能が自動設定されます
      </div>
    </div>
  );
};

export default GenreSelector;
