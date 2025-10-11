/**
 * ジャンル管理マネージャー
 * ジャンル取得、コンテキスト生成、推薦機能を提供
 */

import GENRES from '../data/genres.js';
import MusicTheoryEngine from '../engines/MusicTheoryEngine.js';

class GenreManager {
  constructor() {
    this.genres = new Map();
    this.musicTheoryEngine = new MusicTheoryEngine();
    this.initialized = false;
    this.cache = new Map(); // パフォーマンス向上のためのキャッシュ
  }

  /**
   * 初期化: ジャンルデータベース読み込み
   * @returns {Promise<boolean>} 初期化成功フラグ
   */
  async initialize() {
    try {
      console.log('📚 GenreManager: 初期化開始...');

      // ジャンルデータを Map に変換して保存
      GENRES.forEach(genre => {
        // バリデーション
        if (!this._validateGenreData(genre)) {
          console.warn(`⚠️ Invalid genre data: ${genre.id}`);
          return;
        }

        this.genres.set(genre.id, genre);
      });

      this.initialized = true;
      console.log(`✅ GenreManager: ${this.genres.size}件のジャンルを読み込み完了`);

      // デバッグ情報
      console.log('利用可能ジャンル:', Array.from(this.genres.keys()));

      return true;
    } catch (error) {
      console.error('❌ GenreManager初期化エラー:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * ジャンル取得
   * @param {string} genreId - ジャンルID
   * @returns {Object|null} ジャンルオブジェクト
   */
  getGenre(genreId) {
    if (!this.initialized) {
      throw new Error('GenreManager is not initialized. Call initialize() first.');
    }

    if (!this.genres.has(genreId)) {
      console.warn(`⚠️ Genre not found: ${genreId}`);
      return null;
    }

    return this.genres.get(genreId);
  }

  /**
   * 全ジャンル取得
   * @returns {Array} ジャンル配列
   */
  getAllGenres() {
    if (!this.initialized) {
      throw new Error('GenreManager is not initialized. Call initialize() first.');
    }

    return Array.from(this.genres.values()).sort((a, b) => {
      // 初心者向けを優先してソート
      const difficultyOrder = { 'beginner': 0, 'intermediate': 1, 'advanced': 2 };
      return (difficultyOrder[a.difficulty] || 1) - (difficultyOrder[b.difficulty] || 1);
    });
  }

  /**
   * ジャンルコンテキスト生成
   * @param {string} genreId - ジャンルID
   * @param {string} key - キー (デフォルト: C)
   * @param {string} scaleType - スケールタイプ (デフォルト: major)
   * @returns {Object} ジャンルコンテキスト
   */
  createGenreContext(genreId, key = 'C', scaleType = null) {
    const genre = this.getGenre(genreId);
    if (!genre) {
      throw new Error(`Cannot create context for unknown genre: ${genreId}`);
    }

    // ジャンルの主要スケールを使用（指定がない場合）
    if (!scaleType && genre.musicTheory.primaryScales.length > 0) {
      scaleType = genre.musicTheory.primaryScales[0].type;
    }
    scaleType = scaleType || 'major';

    // キャッシュキーを生成
    const cacheKey = `${genreId}-${key}-${scaleType}`;
    if (this.cache.has(cacheKey)) {
      console.log(`🔄 Cache hit for genre context: ${cacheKey}`);
      return this.cache.get(cacheKey);
    }

    try {
      // スケール計算
      const scale = this.musicTheoryEngine.calculateScale(key, scaleType);

      // ジャンルコンテキストを構築
      const context = {
        genre,
        activeScale: scale,
        activeKey: { root: key, quality: scaleType },

        // リアルタイム制約
        constraints: {
          allowedPitches: scale.pitches,
          allowedChords: this.musicTheoryEngine.generateDiatonicChords(scale),
          rhythmGrid: this._createRhythmGrid(genre)
        },

        // 補完設定
        suggestionSettings: {
          enabled: true,
          aggressiveness: 0.5, // 0-1: 控えめ〜積極的
          showGhostNotes: true,
          autoQuantize: false,
          genreWeighting: 0.7  // ジャンル特性の重み
        },

        // 音楽理論キャッシュ
        theoryCache: {
          scaleNotes: scale.notes,
          chordProgressions: genre.musicTheory.chordProgressions,
          rhythmPatterns: genre.musicTheory.rhythmCharacteristics.typicalPatterns,
          diatonicChords: this.musicTheoryEngine.generateDiatonicChords(scale)
        },

        // メタデータ
        metadata: {
          createdAt: new Date().toISOString(),
          genreId,
          key,
          scaleType,
          version: '1.0.0'
        }
      };

      // キャッシュに保存
      this.cache.set(cacheKey, context);
      console.log(`✨ Genre context created: ${genre.name.ja} (${key} ${scaleType})`);

      return context;
    } catch (error) {
      console.error('❌ Genre context creation error:', error);
      throw new Error(`Failed to create genre context: ${error.message}`);
    }
  }

  /**
   * ジャンル推薦
   * @param {Object} userPreferences - ユーザー設定
   * @param {Array} userPreferences.favoriteGenres - お気に入りジャンル
   * @param {string} userPreferences.difficulty - 難易度設定
   * @param {Array} userPreferences.instruments - 好きな楽器
   * @returns {Array} 推薦ジャンル配列
   */
  recommendGenres(userPreferences = {}) {
    if (!this.initialized) {
      return this.getAllGenres().slice(0, 3); // フォールバック
    }

    const {
      favoriteGenres = [],
      difficulty = 'beginner',
      instruments = [],
      mood = null
    } = userPreferences;

    let genres = this.getAllGenres();
    const scored = [];

    genres.forEach(genre => {
      let score = 0;

      // 難易度マッチング
      const difficultyWeight = {
        'beginner': { 'beginner': 3, 'intermediate': 1, 'advanced': 0 },
        'intermediate': { 'beginner': 2, 'intermediate': 3, 'advanced': 1 },
        'advanced': { 'beginner': 1, 'intermediate': 2, 'advanced': 3 }
      };

      const genreDifficulty = this._estimateGenreDifficulty(genre);
      score += difficultyWeight[difficulty]?.[genreDifficulty] || 1;

      // お気に入りジャンルとの類似性
      if (favoriteGenres.length > 0) {
        const similarity = this._calculateGenreSimilarity(genre, favoriteGenres);
        score += similarity * 2;
      }

      // 楽器マッチング
      if (instruments.length > 0) {
        const instrumentMatch = this._calculateInstrumentMatch(genre, instruments);
        score += instrumentMatch * 1.5;
      }

      // タグマッチング（ムード）
      if (mood && genre.tags.includes(mood)) {
        score += 2;
      }

      scored.push({ genre, score });
    });

    // スコア順でソート
    scored.sort((a, b) => b.score - a.score);

    console.log('🎯 Genre recommendations generated:', scored.slice(0, 5).map(s => ({
      genre: s.genre.name.ja,
      score: s.score.toFixed(1)
    })));

    return scored.slice(0, 5).map(s => s.genre);
  }

  /**
   * ジャンル間の類似性計算
   * @param {Object} genre1 - ジャンル1
   * @param {Object} genre2 - ジャンル2
   * @returns {number} 類似度 (0-1)
   */
  calculateGenreSimilarity(genre1, genre2) {
    if (!genre1 || !genre2) return 0;

    let similarity = 0;
    let factors = 0;

    // テンポ範囲の重複
    const tempo1 = genre1.tempoRange;
    const tempo2 = genre2.tempoRange;
    const tempoOverlap = Math.max(0, Math.min(tempo1.max, tempo2.max) - Math.max(tempo1.min, tempo2.min));
    const tempoTotal = Math.max(tempo1.max, tempo2.max) - Math.min(tempo1.min, tempo2.min);
    similarity += (tempoOverlap / tempoTotal) * 0.3;
    factors += 0.3;

    // 楽器構成の類似性
    const instruments1 = new Set(genre1.instrumentation.recommended);
    const instruments2 = new Set(genre2.instrumentation.recommended);
    const commonInstruments = new Set([...instruments1].filter(x => instruments2.has(x)));
    const totalInstruments = new Set([...instruments1, ...instruments2]);
    similarity += (commonInstruments.size / totalInstruments.size) * 0.4;
    factors += 0.4;

    // タグの類似性
    const tags1 = new Set(genre1.tags);
    const tags2 = new Set(genre2.tags);
    const commonTags = new Set([...tags1].filter(x => tags2.has(x)));
    const totalTags = new Set([...tags1, ...tags2]);
    if (totalTags.size > 0) {
      similarity += (commonTags.size / totalTags.size) * 0.3;
      factors += 0.3;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * 音楽理論エンジン取得
   * @returns {MusicTheoryEngine}
   */
  getMusicTheoryEngine() {
    return this.musicTheoryEngine;
  }

  /**
   * キャッシュクリア
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 GenreManager cache cleared');
  }

  /**
   * 統計情報取得
   * @returns {Object} 統計情報
   */
  getStatistics() {
    if (!this.initialized) {
      return null;
    }

    const genres = this.getAllGenres();
    const difficulties = {};
    const instruments = new Set();
    const tags = new Set();

    genres.forEach(genre => {
      // 難易度統計
      const difficulty = this._estimateGenreDifficulty(genre);
      difficulties[difficulty] = (difficulties[difficulty] || 0) + 1;

      // 楽器統計
      genre.instrumentation.recommended.forEach(inst => instruments.add(inst));

      // タグ統計
      genre.tags.forEach(tag => tags.add(tag));
    });

    return {
      totalGenres: genres.length,
      difficulties,
      totalInstruments: instruments.size,
      totalTags: tags.size,
      cacheSize: this.cache.size,
      initialized: this.initialized
    };
  }

  // ========== プライベートメソッド ==========

  /**
   * ジャンルデータバリデーション
   * @param {Object} genre - ジャンルオブジェクト
   * @returns {boolean} バリデーション結果
   */
  _validateGenreData(genre) {
    const requiredFields = ['id', 'name', 'musicTheory', 'tempoRange'];

    for (const field of requiredFields) {
      if (!(field in genre)) {
        console.error(`Missing required field: ${field} in genre ${genre.id || 'unknown'}`);
        return false;
      }
    }

    // musicTheory構造チェック
    if (!Array.isArray(genre.musicTheory.primaryScales)) {
      console.error('primaryScales must be an array');
      return false;
    }

    // テンポ範囲チェック
    if (genre.tempoRange.min >= genre.tempoRange.max) {
      console.error('Invalid tempo range');
      return false;
    }

    return true;
  }

  /**
   * リズムグリッド作成
   * @param {Object} genre - ジャンル情報
   * @returns {Object} リズムグリッド
   */
  _createRhythmGrid(genre) {
    const characteristics = genre.musicTheory.rhythmCharacteristics;

    return {
      subdivision: 16,  // 16分音符グリッド
      snapEnabled: true,
      swingAmount: characteristics.swingFeel || 0,
      accentBeats: characteristics.accentBeats || [0],
      timeSignature: genre.timeSignatures?.[0] || '4/4'
    };
  }

  /**
   * ジャンル難易度推定
   * @param {Object} genre - ジャンルオブジェクト
   * @returns {string} 難易度
   */
  _estimateGenreDifficulty(genre) {
    // 複雑性指標から難易度を推定
    let complexity = 0;

    // スケールの複雑さ
    const scaleTypes = genre.musicTheory.primaryScales.map(s => s.type);
    if (scaleTypes.includes('major') || scaleTypes.includes('pentatonic_major')) {
      complexity += 1;
    }
    if (scaleTypes.includes('jazz') || scaleTypes.includes('dorian')) {
      complexity += 3;
    }

    // リズムの複雑さ
    const swing = genre.musicTheory.rhythmCharacteristics.swingFeel || 0;
    const syncopation = genre.musicTheory.rhythmCharacteristics.syncopation || 0;
    complexity += swing * 2 + syncopation;

    // コード進行の複雑さ
    const hasComplexChords = genre.musicTheory.chordProgressions.some(prog =>
      prog.pattern.some(chord => chord.includes('7') || chord.includes('maj7'))
    );
    if (hasComplexChords) complexity += 2;

    if (complexity <= 2) return 'beginner';
    if (complexity <= 4) return 'intermediate';
    return 'advanced';
  }

  /**
   * ジャンル類似性計算 (配列版)
   * @param {Object} genre - 対象ジャンル
   * @param {Array} favoriteGenres - お気に入りジャンルID配列
   * @returns {number} 類似度 (0-1)
   */
  _calculateGenreSimilarity(genre, favoriteGenres) {
    let maxSimilarity = 0;

    favoriteGenres.forEach(favId => {
      const favGenre = this.getGenre(favId);
      if (favGenre) {
        const similarity = this.calculateGenreSimilarity(genre, favGenre);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    });

    return maxSimilarity;
  }

  /**
   * 楽器マッチング計算
   * @param {Object} genre - ジャンル
   * @param {Array} instruments - 楽器配列
   * @returns {number} マッチ度 (0-1)
   */
  _calculateInstrumentMatch(genre, instruments) {
    const genreInstruments = new Set(genre.instrumentation.recommended);
    const userInstruments = new Set(instruments);
    const common = new Set([...genreInstruments].filter(x => userInstruments.has(x)));

    return common.size / Math.max(genreInstruments.size, userInstruments.size);
  }
}

// シングルトンインスタンスを作成・エクスポート
const genreManager = new GenreManager();
export default genreManager;