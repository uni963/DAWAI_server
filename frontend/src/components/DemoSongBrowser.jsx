/**
 * Demo Song ブラウザコンポーネント
 * Demo Song一覧表示、フィルタリング、プレビュー、読み込み機能
 *
 * 修正: 多言語オブジェクト {ja, en} の直接レンダリング問題を解決
 */

import React, { useState, useEffect } from 'react';
import demoSongManager from '../managers/DemoSongManager.js';
import genreManager from '../managers/GenreManager.js';

const DemoSongBrowser = ({
  onDemoSongLoad,
  onDemoSongPreview,
  currentProjectGenre = null,
  className = ""
}) => {
  const [demoSongs, setDemoSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenreFilter, setSelectedGenreFilter] = useState('all');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewingSong, setPreviewingSong] = useState(null);

  // 初期化
  useEffect(() => {
    const initializeManagers = async () => {
      try {
        setIsLoading(true);

        // DemoSongManagerとGenreManagerの初期化
        await demoSongManager.initialize();
        await genreManager.initialize();

        // Demo Song一覧とジャンル一覧を取得
        const allDemoSongs = demoSongManager.getAllDemoSongs();
        const allGenres = genreManager.getAllGenres();

        setDemoSongs(allDemoSongs);
        setGenres(allGenres);
        setFilteredSongs(allDemoSongs);

        console.log('✅ DemoSongBrowser: 初期化完了');
        console.log(`📼 Demo Songs: ${allDemoSongs.length}曲`);
      } catch (err) {
        console.error('❌ DemoSongBrowser初期化エラー:', err);
        setError('Demo Song情報の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    initializeManagers();
  }, []);

  // フィルタリング・ソート処理
  useEffect(() => {
    let filtered = [...demoSongs];

    // ジャンルフィルタ
    if (selectedGenreFilter !== 'all') {
      filtered = filtered.filter(song => song.genreId === selectedGenreFilter);
    }

    // 難易度フィルタ
    if (selectedDifficultyFilter !== 'all') {
      filtered = filtered.filter(song => song.metadata.difficulty === selectedDifficultyFilter);
    }

    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(song =>
        song.metadata.title.ja.toLowerCase().includes(query) ||
        song.metadata.title.en?.toLowerCase().includes(query) ||
        (typeof song.metadata.description === 'object' && song.metadata.description.ja?.toLowerCase().includes(query)) ||
        (typeof song.metadata.description === 'string' && song.metadata.description.toLowerCase().includes(query)) ||
        song.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.metadata.title.ja.localeCompare(b.metadata.title.ja);
        case 'genre':
          return a.genreId.localeCompare(b.genreId);
        case 'difficulty':
          const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
          return difficultyOrder[a.metadata.difficulty] - difficultyOrder[b.metadata.difficulty];
        case 'tempo':
          return a.structure.tempo - b.structure.tempo;
        case 'completion':
          const aCompletion = a.structure.completedBars / a.structure.totalBars;
          const bCompletion = b.structure.completedBars / b.structure.totalBars;
          return bCompletion - aCompletion;
        default:
          return 0;
      }
    });

    setFilteredSongs(filtered);
  }, [demoSongs, selectedGenreFilter, selectedDifficultyFilter, searchQuery, sortBy]);

  // Demo Song読み込み処理
  const handleDemoSongLoad = async (demoSong) => {
    try {
      console.log(`🎼 Demo Song読み込み開始: ${demoSong.metadata.title.ja}`);

      if (onDemoSongLoad) {
        await onDemoSongLoad(demoSong);
      }

      console.log(`✅ Demo Song読み込み完了: ${demoSong.metadata.title.ja}`);
    } catch (err) {
      console.error('❌ Demo Song読み込みエラー:', err);
      setError('Demo Songの読み込みに失敗しました');
    }
  };

  // プレビュー処理
  const handlePreview = async (demoSong) => {
    try {
      setPreviewingSong(demoSong);

      if (onDemoSongPreview) {
        await onDemoSongPreview(demoSong);
      }
    } catch (err) {
      console.error('❌ Demo Songプレビューエラー:', err);
    }
  };

  // プレビュー停止
  const stopPreview = () => {
    setPreviewingSong(null);
    if (onDemoSongPreview) {
      onDemoSongPreview(null); // null でプレビュー停止
    }
  };

  // 難易度カラー取得
  const getDifficultyColor = (difficulty) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800 border-green-200',
      intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      advanced: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // ジャンル名取得（修正: 多言語オブジェクトを適切に処理）
  const getGenreName = (genreId) => {
    const genre = genres.find(g => g.id === genreId);
    if (!genre) return genreId;

    // 🔧 修正: 多言語オブジェクトの場合は .ja を使用
    if (typeof genre.name === 'object' && genre.name.ja) {
      return genre.name.ja;
    }
    return genre.name;
  };

  // 説明文取得（修正: 多言語オブジェクトを適切に処理）
  const getDescription = (description) => {
    if (!description) return '魅力的な楽曲です';

    // 🔧 修正: 多言語オブジェクトの場合は .ja を使用
    if (typeof description === 'object' && description.ja) {
      return description.ja;
    }
    return description;
  };

  // 完了度計算
  const getCompletionPercentage = (song) => {
    return Math.round((song.structure.completedBars / song.structure.totalBars) * 100);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Demo Song情報を読み込み中...</span>
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
    <div className={`demo-song-browser ${className}`}>
      {/* ヘッダー */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          📼 Demo Song ブラウザ
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {filteredSongs.length}曲のDemo Songから選択してプロジェクトに読み込み
        </p>
      </div>

      {/* フィルタ・検索バー */}
      <div className="mb-6 space-y-4">
        {/* 検索 */}
        <div>
          <input
            type="text"
            placeholder="曲名やタグで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* フィルタ・ソート */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* ジャンルフィルタ（修正: 多言語対応） */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">ジャンル:</label>
            <select
              value={selectedGenreFilter}
              onChange={(e) => setSelectedGenreFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="all">すべて</option>
              {genres.map(genre => (
                <option key={genre.id} value={genre.id}>
                  {typeof genre.name === 'object' && genre.name.ja ? genre.name.ja : genre.name}
                </option>
              ))}
            </select>
          </div>

          {/* 難易度フィルタ */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">難易度:</label>
            <select
              value={selectedDifficultyFilter}
              onChange={(e) => setSelectedDifficultyFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="all">すべて</option>
              <option value="beginner">初心者</option>
              <option value="intermediate">中級者</option>
              <option value="advanced">上級者</option>
            </select>
          </div>

          {/* ソート */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">ソート:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="title">曲名</option>
              <option value="genre">ジャンル</option>
              <option value="difficulty">難易度</option>
              <option value="tempo">テンポ</option>
              <option value="completion">完了度</option>
            </select>
          </div>

          {/* 表示モード */}
          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              ⊞
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Demo Song 一覧 */}
      {filteredSongs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🎵</div>
          <p>条件に一致するDemo Songが見つかりませんでした</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        }>
          {filteredSongs.map((song) => (
            <div
              key={song.id}
              data-song-id={song.id}
              className={`
                border rounded-lg overflow-hidden transition-all duration-200 bg-white hover:shadow-md
                ${previewingSong?.id === song.id ? 'ring-2 ring-blue-500' : 'border-gray-200'}
                ${currentProjectGenre === song.genreId ? 'bg-blue-50 border-blue-200' : ''}
              `}
            >
              {/* カードヘッダー */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {song.metadata.title.ja}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {getDescription(song.metadata.description)}
                    </p>
                  </div>
                  <div className="text-2xl ml-2">🎼</div>
                </div>

                {/* 楽曲情報 */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">ジャンル:</span>
                    <span className="font-medium text-gray-900">
                      {getGenreName(song.genreId)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">テンポ:</span>
                    <span className="font-medium text-gray-900">
                      {song.structure.tempo} BPM
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">難易度:</span>
                    <span className={`text-xs px-2 py-1 rounded border ${getDifficultyColor(song.metadata.difficulty)}`}>
                      {song.metadata.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">完了度:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getCompletionPercentage(song)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium">
                        {getCompletionPercentage(song)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 楽曲タグ */}
                {song.tags && song.tags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {song.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                      {song.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{song.tags.length - 3}...</span>
                      )}
                    </div>
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePreview(song)}
                    disabled={previewingSong?.id === song.id}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {previewingSong?.id === song.id ? '▶ プレビュー中' : '▶ プレビュー'}
                  </button>

                  <button
                    onClick={() => handleDemoSongLoad(song)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    📥 読み込み
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* プレビューコントロール */}
      {previewingSong && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 text-sm">
              プレビュー中: {previewingSong.metadata.title.ja}
            </h4>
            <button
              onClick={stopPreview}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={stopPreview}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
            >
              停止
            </button>
            <button
              onClick={() => handleDemoSongLoad(previewingSong)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              この楽曲を読み込み
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoSongBrowser;
