/**
 * Demo Song管理マネージャー
 * 半完成曲の管理、読み込み、ProjectManager統合を提供
 */

import DEMO_SONGS from '../data/demoSongs.js';
import genreManager from './GenreManager.js';
import { mapInstrumentTypeToTrackType } from '../data/trackTypes.js';
import drumTrackManager from '../utils/drumTrackManager.js';

class DemoSongManager {
  constructor() {
    this.demoSongs = new Map();
    this.initialized = false;
    this.loadedProjects = new Map(); // プロジェクト変換キャッシュ
  }

  /**
   * 初期化: Demo Songデータベース読み込み
   * @returns {Promise<boolean>} 初期化成功フラグ
   */
  async initialize() {
    try {
      console.log('🎵 DemoSongManager: 初期化開始...');

      // Demo Songデータを Map に変換して保存
      DEMO_SONGS.forEach(song => {
        // バリデーション
        if (!this._validateDemoSongData(song)) {
          console.warn(`⚠️ Invalid demo song data: ${song.id}`);
          return;
        }

        this.demoSongs.set(song.id, song);
      });

      this.initialized = true;
      console.log(`✅ DemoSongManager: ${this.demoSongs.size}件のDemo Songを読み込み完了`);

      // ジャンル別統計
      const genreStats = this._getGenreStatistics();
      console.log('📊 ジャンル別Demo Song数:', genreStats);

      return true;
    } catch (error) {
      console.error('❌ DemoSongManager初期化エラー:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Demo Song取得
   * @param {string} songId - Demo Song ID
   * @returns {Object|null} Demo Songオブジェクト
   */
  getDemoSong(songId) {
    if (!this.initialized) {
      throw new Error('DemoSongManager is not initialized. Call initialize() first.');
    }

    if (!this.demoSongs.has(songId)) {
      console.warn(`⚠️ Demo song not found: ${songId}`);
      return null;
    }

    return this.demoSongs.get(songId);
  }

  /**
   * ジャンル別Demo Song取得
   * @param {string} genreId - ジャンルID
   * @returns {Array} Demo Song配列
   */
  getDemoSongsByGenre(genreId) {
    if (!this.initialized) {
      throw new Error('DemoSongManager is not initialized. Call initialize() first.');
    }

    const songs = Array.from(this.demoSongs.values())
      .filter(song => song.genreId === genreId)
      .sort((a, b) => {
        // 難易度順でソート
        const difficultyOrder = { 'beginner': 0, 'intermediate': 1, 'advanced': 2 };
        return (difficultyOrder[a.metadata.difficulty] || 1) - (difficultyOrder[b.metadata.difficulty] || 1);
      });

    console.log(`🎼 Found ${songs.length} demo songs for genre: ${genreId}`);
    return songs;
  }

  /**
   * 全Demo Song取得
   * @returns {Array} Demo Song配列
   */
  getAllDemoSongs() {
    if (!this.initialized) {
      throw new Error('DemoSongManager is not initialized. Call initialize() first.');
    }

    return Array.from(this.demoSongs.values()).sort((a, b) => {
      // ジャンル、次に難易度でソート
      if (a.genreId !== b.genreId) {
        return a.genreId.localeCompare(b.genreId);
      }
      const difficultyOrder = { 'beginner': 0, 'intermediate': 1, 'advanced': 2 };
      return (difficultyOrder[a.metadata.difficulty] || 1) - (difficultyOrder[b.metadata.difficulty] || 1);
    });
  }

  /**
   * 半完成曲生成: 指定された割合までのデータのみ返却
   * @param {Object} demoSong - Demo Songオブジェクト
   * @returns {Object} 半完成プロジェクトデータ
   */
  generateHalfCompleteSong(demoSong) {
    if (!demoSong) {
      throw new Error('Demo song is required');
    }

    const completionRatio = demoSong.structure.completedBars / demoSong.structure.totalBars;

    // ★ 修正: 正しい時間計算式
    // 1小節の時間 = (60 / tempo) * beatsPerBar
    // 完成小節数の時間 = barDuration * completedBars
    const timeSignature = demoSong.structure.timeSignature || { numerator: 4, denominator: 4 };
    const beatsPerBar = timeSignature.numerator; // 拍子記号の分子
    const barDuration = (60 / demoSong.structure.tempo) * beatsPerBar; // 1小節の秒数
    const timeLimit = barDuration * demoSong.structure.completedBars; // 完成小節数分の時間

    console.log(`🎵 Generating half-complete song: ${demoSong.metadata.title.ja}`);
    console.log(`   完成率: ${Math.round(completionRatio * 100)}% (${demoSong.structure.completedBars}/${demoSong.structure.totalBars} bars)`);
    console.log(`   🔧 時間計算: ${beatsPerBar}拍子, ${demoSong.structure.tempo} BPM → 1小節=${barDuration.toFixed(2)}秒 × ${demoSong.structure.completedBars}小節 = ${timeLimit.toFixed(2)}秒`);

    return {
      ...demoSong.tracks,
      midi: this._truncateTracks(demoSong.tracks.midi || [], timeLimit),
      bass: this._truncateTracks(demoSong.tracks.bass || [], timeLimit),
      drum: this._truncateTracks(demoSong.tracks.drum || [], timeLimit),
      violin: this._truncateTracks(demoSong.tracks.violin || [], timeLimit),
      cello: this._truncateTracks(demoSong.tracks.cello || [], timeLimit),
      viola: this._truncateTracks(demoSong.tracks.viola || [], timeLimit),
      diffsinger: this._truncateTracks(demoSong.tracks.diffsinger || [], timeLimit),
      metadata: {
        originalSong: demoSong,
        completionRatio,
        timeLimit,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * ProjectManagerへの統合
   * @param {string} songId - Demo Song ID
   * @param {Object} projectManager - ProjectManagerインスタンス
   * @returns {Object|null} 読み込まれたプロジェクト
   */
  loadDemoSongToProject(songId, projectManager) {
    if (!projectManager) {
      throw new Error('ProjectManager instance is required');
    }

    const demoSong = this.getDemoSong(songId);
    if (!demoSong) {
      throw new Error(`Demo song not found: ${songId}`);
    }

    try {
      console.log(`🚀 Loading demo song to project: ${demoSong.metadata.title.ja}`);

      // 既存プロジェクトクリア
      projectManager.newProject();

      // デフォルトトラックをクリア（Demo Song専用トラックのみ読み込むため）
      if (projectManager.currentProject && projectManager.currentProject.tracks) {
        projectManager.currentProject.tracks = [];
        projectManager.currentProject.tabs = projectManager.currentProject.tabs.filter(tab => tab.id === 'arrangement');
        console.log('🧹 Default tracks cleared for Demo Song loading');
      }

      // プロジェクトメタデータ設定
      projectManager.setProjectName(demoSong.metadata.title.ja);
      projectManager.setTempo(demoSong.structure.tempo);

      // 拍子設定
      const timeSignature = demoSong.structure.timeSignature;
      if (timeSignature) {
        projectManager.setTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
      }

      // ★ 8秒以降編集機能有効化: プロジェクト時間を30秒に拡張
      // 初心者が楽しく創作を続けられるよう、8秒のDemo Song後に編集領域を提供
      const extendedDuration = 30.0; // 30秒まで編集可能
      const demoSongEndTime = 8.0; // Demo Songは8秒で終了

      // プロジェクト設定に編集領域情報を追加
      if (projectManager.currentProject) {
        projectManager.currentProject.settings = {
          ...projectManager.currentProject.settings,
          totalDuration: extendedDuration,
          demoSongEndTime: demoSongEndTime,
          userEditingEnabled: true, // 8秒以降のユーザー編集を有効化
          continuationMode: true, // 継続編集モード
          creativeAssistance: {
            enabled: true,
            suggestNextChords: true,
            suggestMelodyExtension: true,
            description: '8秒以降も創作を楽しめます！新しいメロディや楽器を追加してみましょう。'
          }
        };
      }

      // ジャンルコンテキスト設定
      const genreContext = genreManager.createGenreContext(
        demoSong.genreId,
        demoSong.structure.key.root,
        demoSong.structure.key.quality
      );
      projectManager.setGenreContext(genreContext);

      // スケール制約自動設定 (autoSetOnLoad: true)
      if (demoSong.scaleConstraints && demoSong.scaleConstraints.autoSetOnLoad) {
        projectManager.setScaleConstraints(demoSong.scaleConstraints);
        console.log('   ✅ スケール制約自動設定:', demoSong.scaleConstraints);
      }

      // ★ Magenta AI設定の自動適用
      // Demo Song読み込み時にMagenta AIを自動で有効化し、音楽制作を支援
      const magentaAISettings = {
        enabled: true,
        autoCompletion: true,
        melodyGeneration: true,
        harmonicSuggestions: true,
        rhythmPatterns: true,
        genre: demoSong.genreId,
        scale: demoSong.scaleConstraints?.scaleType || 'major',
        rootNote: demoSong.scaleConstraints?.rootNote || 'C',
        creativity: 0.7, // 適度な創造性レベル
        assistanceLevel: 'intermediate', // 初心者向けアシスタンス
        description: `${demoSong.genreId}ジャンルに最適化されたMagenta AI設定`
      };

      if (projectManager.currentProject) {
        projectManager.currentProject.aiSettings = {
          ...projectManager.currentProject.aiSettings,
          magenta: magentaAISettings,
          autoEnabled: true, // AI機能自動有効化
          contextAware: true // コンテキスト対応AI
        };
        console.log('   🤖 Magenta AI自動設定:', magentaAISettings);
      }

      // 半完成曲データ生成
      const halfCompleteData = this.generateHalfCompleteSong(demoSong);

      // ★ 統一トラックシステム対応: 全トラックタイプを統一メソッドで読み込み
      this._loadAllTracksUnified(halfCompleteData, projectManager);

      // ★ ジャンルとスケールの強化自動設定
      // UIでジャンル選択と推奨スケールが自動表示されるよう詳細設定
      const enhancedGenreScaleSettings = {
        // ジャンル自動設定
        selectedGenre: {
          id: demoSong.genreId,
          name: genreContext.genre.name,
          autoSelected: true,
          reason: `Demo Song「${demoSong.metadata.title.ja}」からの自動設定`
        },

        // スケール制約強化設定
        scaleConstraints: {
          ...demoSong.scaleConstraints,
          autoApplied: true,
          uiVisible: true, // UIでスケール制約を表示
          recommendedScales: this._getRecommendedScales(demoSong.genreId, demoSong.scaleConstraints.rootNote),
          description: `${demoSong.scaleConstraints.rootNote} ${demoSong.scaleConstraints.scaleType}スケール（${demoSong.genreId}ジャンル最適化）`
        },

        // UI表示情報
        uiDisplayInfo: {
          showGenreSelector: true,
          showScaleConstraints: true,
          showRecommendedScales: true,
          autoHighlight: true,
          userGuidance: {
            genre: `ジャンル「${genreContext.genre.name.ja}」が自動選択されました`,
            scale: `${demoSong.scaleConstraints.rootNote}${demoSong.scaleConstraints.scaleType}スケールが適用されました`,
            continuation: '8秒以降も同じスケールで創作を続けられます！'
          }
        }
      };

      if (projectManager.currentProject) {
        projectManager.currentProject.genreScaleSettings = enhancedGenreScaleSettings;
        console.log('   🎼 ジャンル・スケール自動設定:', enhancedGenreScaleSettings);
      }

      // Demo Songメタデータ保存
      const demoSongMetadata = {
        isDemoSong: true,
        originalSongId: songId,
        genreId: demoSong.genreId,
        completionStatus: {
          completed: demoSong.structure.completedBars,
          total: demoSong.structure.totalBars,
          percentage: Math.round((demoSong.structure.completedBars / demoSong.structure.totalBars) * 100)
        },
        creationGuide: demoSong.creationGuide,
        structure: demoSong.structure,
        genreScaleSettings: enhancedGenreScaleSettings,
        loadedAt: new Date().toISOString()
      };
      projectManager.setDemoSongMetadata(demoSongMetadata);

      console.log(`✅ Demo song loaded successfully: ${demoSong.metadata.title.ja}`);
      console.log(`   ジャンル: ${genreContext.genre.name.ja}`);
      console.log(`   キー: ${demoSong.structure.key.root} ${demoSong.structure.key.quality}`);
      console.log(`   テンポ: ${demoSong.structure.tempo} BPM`);

      return projectManager.getCurrentProject();
    } catch (error) {
      console.error('❌ Demo song loading error:', error);
      throw new Error(`Failed to load demo song: ${error.message}`);
    }
  }

  /**
   * Demo Song推薦
   * @param {Object} criteria - 推薦基準
   * @param {string} criteria.difficulty - 難易度
   * @param {string} criteria.genreId - ジャンルID
   * @param {number} criteria.maxDuration - 最大時間（分）
   * @returns {Array} 推薦Demo Song配列
   */
  recommendDemoSongs(criteria = {}) {
    const { difficulty, genreId, maxDuration } = criteria;
    let songs = this.getAllDemoSongs();

    // フィルタリング
    if (difficulty) {
      songs = songs.filter(song => song.metadata.difficulty === difficulty);
    }

    if (genreId) {
      songs = songs.filter(song => song.genreId === genreId);
    }

    if (maxDuration) {
      songs = songs.filter(song => song.metadata.estimatedCompletionTime <= maxDuration);
    }

    // スコアリング
    const scored = songs.map(song => {
      let score = 0;

      // 初心者向けを優先
      if (song.metadata.difficulty === 'beginner') score += 3;
      else if (song.metadata.difficulty === 'intermediate') score += 2;
      else score += 1;

      // 短時間完成を優先
      if (song.metadata.estimatedCompletionTime <= 15) score += 2;
      else if (song.metadata.estimatedCompletionTime <= 25) score += 1;

      // 完成度が適切か（半分程度が理想）
      const completionRatio = song.structure.completedBars / song.structure.totalBars;
      if (completionRatio >= 0.4 && completionRatio <= 0.6) score += 2;
      else if (completionRatio >= 0.3 && completionRatio <= 0.7) score += 1;

      return { song, score };
    });

    // スコア順でソート
    scored.sort((a, b) => b.score - a.score);

    console.log('🎯 Demo song recommendations:', scored.slice(0, 3).map(s => ({
      title: s.song.metadata.title.ja,
      score: s.score
    })));

    return scored.slice(0, 5).map(s => s.song);
  }

  /**
   * 統計情報取得
   * @returns {Object} 統計情報
   */
  getStatistics() {
    if (!this.initialized) {
      return null;
    }

    const songs = this.getAllDemoSongs();
    const stats = {
      totalSongs: songs.length,
      byGenre: {},
      byDifficulty: {},
      averageCompletionTime: 0,
      averageCompletionRatio: 0
    };

    let totalTime = 0;
    let totalRatio = 0;

    songs.forEach(song => {
      // ジャンル別
      stats.byGenre[song.genreId] = (stats.byGenre[song.genreId] || 0) + 1;

      // 難易度別
      const difficulty = song.metadata.difficulty;
      stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1;

      // 平均値計算
      totalTime += song.metadata.estimatedCompletionTime;
      totalRatio += (song.structure.completedBars / song.structure.totalBars);
    });

    stats.averageCompletionTime = Math.round(totalTime / songs.length);
    stats.averageCompletionRatio = Math.round((totalRatio / songs.length) * 100);

    return stats;
  }

  /**
   * 統一トラック読み込みメソッド: 全トラックタイプを統一システムで処理
   * @param {Object} trackData - Demo Songトラックデータ
   * @param {Object} projectManager - ProjectManagerインスタンス
   */
  _loadAllTracksUnified(trackData, projectManager) {
    console.log('🎯 統一トラックシステム: Demo Song読み込み開始');

    // 各トラックタイプを順番に処理（統一トラックタイプ対応）
    const trackTypes = [
      { key: 'midi', name: 'MIDI楽器' },
      { key: 'bass', name: 'ベース' },
      { key: 'violin', name: 'ヴァイオリン' },
      { key: 'cello', name: 'チェロ' },
      { key: 'viola', name: 'ヴィオラ' },
      { key: 'drum', name: 'ドラム', isDrum: true },
      { key: 'diffsinger', name: '歌声合成', isDiffSinger: true }
    ];

    trackTypes.forEach(({ key, name, isDrum, isDiffSinger }) => {
      const tracks = trackData[key];
      if (!tracks || tracks.length === 0) {
        console.log(`⚪ ${name}トラック: データなし - スキップ`);
        return;
      }

      console.log(`🎵 ${name}トラック読み込み開始: ${tracks.length}トラック`);

      try {
        if (isDrum) {
          // ドラムトラック専用処理
          this._loadDrumTracks(tracks, projectManager);
        } else if (isDiffSinger) {
          // 歌声合成トラック専用処理
          this._loadDiffsingerTracks(tracks, projectManager);
        } else {
          // MIDI楽器トラック（統一トラックタイプ対応）
          this._loadMidiTracks(tracks, projectManager);
        }
        console.log(`✅ ${name}トラック読み込み完了`);
      } catch (error) {
        console.error(`❌ ${name}トラック読み込みエラー:`, error);
      }
    });

    console.log('🎯 統一トラックシステム: Demo Song読み込み完了');
  }

  // ========== プライベートメソッド ==========

  /**
   * Demo Songデータバリデーション
   * @param {Object} song - Demo Songオブジェクト
   * @returns {boolean} バリデーション結果
   */
  _validateDemoSongData(song) {
    const requiredFields = ['id', 'genreId', 'metadata', 'structure', 'tracks'];

    for (const field of requiredFields) {
      if (!(field in song)) {
        console.error(`Missing required field: ${field} in demo song ${song.id || 'unknown'}`);
        return false;
      }
    }

    // 構造チェック
    if (!song.metadata.title || !song.metadata.title.ja) {
      console.error('Demo song must have Japanese title');
      return false;
    }

    if (song.structure.completedBars > song.structure.totalBars) {
      console.error('Completed bars cannot exceed total bars');
      return false;
    }

    if (!song.tracks || Object.keys(song.tracks).length === 0) {
      console.error('Demo song must have at least one track');
      return false;
    }

    return true;
  }

  /**
   * ジャンル別統計取得
   * @returns {Object} ジャンル別統計
   */
  _getGenreStatistics() {
    const stats = {};
    this.demoSongs.forEach(song => {
      stats[song.genreId] = (stats[song.genreId] || 0) + 1;
    });
    return stats;
  }

  /**
   * ジャンル・ルートノートに基づく推奨スケール取得
   * @param {string} genreId - ジャンルID
   * @param {string} rootNote - ルートノート
   * @returns {Array} 推奨スケール配列
   */
  _getRecommendedScales(genreId, rootNote) {
    const genreScaleMap = {
      pop: ['major', 'dorian', 'mixolydian'],
      rock: ['minor', 'dorian', 'mixolydian', 'pentatonic_minor'],
      jazz: ['major', 'dorian', 'mixolydian', 'lydian', 'altered'],
      edm: ['minor', 'harmonic_minor', 'phrygian', 'dorian'],
      classical: ['major', 'minor', 'dorian', 'lydian'],
      folk: ['major', 'minor', 'dorian', 'mixolydian']
    };

    const scales = genreScaleMap[genreId] || ['major', 'minor'];

    return scales.map(scaleType => ({
      rootNote,
      scaleType,
      name: `${rootNote} ${scaleType}`,
      description: `${genreId}ジャンルに適したスケール`,
      recommended: true
    }));
  }

  /**
   * トラックデータを時間で切り詰め
   * @param {Array} tracks - トラック配列
   * @param {number} timeLimit - 時間制限
   * @returns {Array} 切り詰められたトラック配列
   */
  _truncateTracks(tracks, timeLimit) {
    return tracks.map(track => ({
      ...track,
      notes: track.notes ? track.notes.filter(note => {
        return note.time < timeLimit;
      }) : [],
      duration: Math.min(track.duration || timeLimit, timeLimit)
    }));
  }

  /**
   * MIDIトラックをProjectManagerに読み込み
   * @param {Array|Object} midiTracks - MIDIトラック配列または単一オブジェクト
   * @param {Object} projectManager - ProjectManagerインスタンス
   */
  _loadMidiTracks(midiTracks, projectManager) {
    // 配列チェック: undefined、null、空配列はスキップ
    if (!midiTracks) {
      return;
    }

    // 単一オブジェクトの場合は配列に変換
    const tracksArray = Array.isArray(midiTracks) ? midiTracks : [midiTracks];

    // 空配列チェック
    if (tracksArray.length === 0) {
      return;
    }

    tracksArray.forEach((track, index) => {
      try {
        // ★ 統一トラックタイプシステム対応: 楽器タイプから統一トラックタイプに変換
        const instrumentType = track.instrumentType || 'piano';
        const unifiedTrackType = mapInstrumentTypeToTrackType(instrumentType);
        // ★ 統一メニュー名を強制使用: 統一性を確保するため、unifiedTrackType.nameを優先
        const trackDisplayName = unifiedTrackType.name || track.name || `MIDI Track ${index + 1}`;
        const uniqueTrackId = track.id || `demo_midi_${Date.now()}_${index}`;

        const trackData = {
          id: uniqueTrackId,
          name: trackDisplayName,
          displayName: trackDisplayName, // タブ表示用の明示的な名前
          type: unifiedTrackType.type,
          subtype: unifiedTrackType.subtype,
          instrumentType: unifiedTrackType.instrumentType,
          color: '#3B82F6',
          volume: 75,
          pan: 0,
          muted: false,
          solo: false,
          armed: false,
          visible: true, // タブ表示を明示的に有効化
          tabVisible: true, // UI タブ表示フラグ
          clips: [],
          effects: [],
          midiData: {
            notes: track.notes || [],
            tempo: projectManager.currentProject?.tempo || 120,
            timeSignature: '4/4',
            trackId: track.id || `demo_midi_${index}`,
            lastModified: new Date().toISOString(),
            metadata: {
              created: new Date().toISOString(),
              modified: new Date().toISOString(),
              version: '1.0.0'
            },
            settings: {
              channel: 0,
              volume: 100,
              velocity: 100
            }
          },
          audioData: null,
          settings: {
            midiChannel: 0,
            octave: 0,
            transpose: 0,
            velocity: 100
          },
          metadata: {
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            description: track.description || '',
            tags: []
          }
        };

        // ProjectManager の tracks 配列に直接追加
        if (projectManager.currentProject && projectManager.currentProject.tracks) {
          projectManager.currentProject.tracks.push(trackData);
        } else {
          console.warn('ProjectManager.currentProject.tracks not found');
        }

        console.log(`✅ MIDI track loaded: ${trackData.name}`);
      } catch (error) {
        console.error(`❌ Failed to load MIDI track ${index}:`, error);
      }
    });
  }

  /**
   * ドラムトラックをProjectManagerに読み込み
   * @param {Array|Object} drumTracks - ドラムトラック配列または単一オブジェクト
   * @param {Object} projectManager - ProjectManagerインスタンス
   */
  _loadDrumTracks(drumTracks, projectManager) {
    // 配列チェック: undefined、null、空配列はスキップ
    if (!drumTracks) {
      return;
    }

    // 単一オブジェクトの場合は配列に変換
    const tracksArray = Array.isArray(drumTracks) ? drumTracks : [drumTracks];

    // 空配列チェック
    if (tracksArray.length === 0) {
      return;
    }

    tracksArray.forEach((track, index) => {
      try {
        // ★ 統一トラックタイプシステム対応: ドラムトラック用の統一タイプを使用
        const unifiedTrackType = mapInstrumentTypeToTrackType('drums');
        // ★ 統一メニュー名を強制使用: ドラムトラックの統一性を確保
        const trackDisplayName = unifiedTrackType.name || track.name || `Drums Track ${index + 1}`;
        const uniqueTrackId = track.id || `demo_drum_${Date.now()}_${index}`;

        const trackData = {
          id: uniqueTrackId,
          name: trackDisplayName,
          displayName: trackDisplayName, // タブ表示用の明示的な名前
          type: unifiedTrackType.type,
          subtype: unifiedTrackType.subtype,
          instrumentType: unifiedTrackType.instrumentType,
          color: '#EF4444',
          volume: 75,
          pan: 0,
          muted: false,
          solo: false,
          armed: false,
          visible: true, // タブ表示を明示的に有効化
          tabVisible: true, // UI タブ表示フラグ
          clips: [],
          effects: [],
          midiData: {
            notes: [],
            tempo: projectManager.currentProject?.tempo || 120,
            timeSignature: '4/4',
            trackId: track.id || `demo_drum_${index}`,
            lastModified: new Date().toISOString(),
            metadata: {
              created: new Date().toISOString(),
              modified: new Date().toISOString(),
              version: '1.0.0'
            },
            settings: {
              channel: 9, // ドラムチャンネル
              volume: 100,
              velocity: 100
            }
          },
          audioData: null,
          drumData: track.pattern || {},
          settings: {
            midiChannel: 9,
            octave: 0,
            transpose: 0,
            velocity: 100
          },
          metadata: {
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            description: track.description || '',
            tags: []
          }
        };

        // ProjectManager の tracks 配列に直接追加
        if (projectManager.currentProject && projectManager.currentProject.tracks) {
          projectManager.currentProject.tracks.push(trackData);
        } else {
          console.warn('ProjectManager.currentProject.tracks not found');
        }

        // drumTrackManager にドラムトラックを登録
        // これにより、ドラムトラックのパターンデータが drumTrackManager で管理されるようになる
        try {
          if (track.pattern) {
            // パターンデータがある場合は、drumTrackManager に登録
            drumTrackManager.createDrumTrack(uniqueTrackId, track.pattern);
            console.log(`✅ Drum track registered with drumTrackManager: ${uniqueTrackId}`);
          }
        } catch (error) {
          console.error(`⚠️ Failed to register drum track with drumTrackManager: ${uniqueTrackId}`, error);
        }

        console.log(`✅ Drum track loaded: ${trackData.name}`);
      } catch (error) {
        console.error(`❌ Failed to load drum track ${index}:`, error);
      }
    });
  }

  /**
   * DiffSingerトラックをProjectManagerに読み込み
   * @param {Array|Object} diffsingerTracks - DiffSingerトラック配列または単一オブジェクト
   * @param {Object} projectManager - ProjectManagerインスタンス
   */
  _loadDiffsingerTracks(diffsingerTracks, projectManager) {
    // 配列チェック: undefined、null、空配列はスキップ
    if (!diffsingerTracks) {
      return;
    }

    // 単一オブジェクトの場合は配列に変換
    const tracksArray = Array.isArray(diffsingerTracks) ? diffsingerTracks : [diffsingerTracks];

    // 空配列チェック
    if (tracksArray.length === 0) {
      return;
    }

    tracksArray.forEach((track, index) => {
      try {
        // ★ 統一トラックタイプシステム対応: 歌声合成トラック用の統一タイプを使用
        const unifiedTrackType = mapInstrumentTypeToTrackType('vocals');
        // ★ 統一メニュー名を強制使用: 歌声合成トラックの統一性を確保
        const trackDisplayName = unifiedTrackType.name || track.name || `DiffSinger Track ${index + 1}`;
        const uniqueTrackId = track.id || `demo_diffsinger_${Date.now()}_${index}`;

        const trackData = {
          id: uniqueTrackId,
          name: trackDisplayName,
          displayName: trackDisplayName, // タブ表示用の明示的な名前
          type: unifiedTrackType.type,
          subtype: unifiedTrackType.subtype,
          instrumentType: unifiedTrackType.instrumentType,
          color: '#10B981',
          volume: 75,
          pan: 0,
          muted: false,
          solo: false,
          armed: false,
          visible: true, // タブ表示を明示的に有効化
          tabVisible: true, // UI タブ表示フラグ
          clips: [],
          effects: [],
          midiData: {
            notes: track.notes || [],
            tempo: projectManager.currentProject?.tempo || 120,
            timeSignature: '4/4',
            trackId: track.id || `demo_diffsinger_${index}`,
            lastModified: new Date().toISOString(),
            metadata: {
              created: new Date().toISOString(),
              modified: new Date().toISOString(),
              version: '1.0.0'
            },
            settings: {
              channel: 0,
              volume: 100,
              velocity: 100
            }
          },
          audioData: null,
          diffsingerData: {
            lyrics: track.lyrics || '',
            voiceModel: track.voiceModel || 'default',
            synthesis: track.synthesis || {}
          },
          settings: {
            midiChannel: 0,
            octave: 0,
            transpose: 0,
            velocity: 100
          },
          metadata: {
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            description: track.description || '',
            tags: []
          }
        };

        // ProjectManager の tracks 配列に直接追加
        if (projectManager.currentProject && projectManager.currentProject.tracks) {
          projectManager.currentProject.tracks.push(trackData);
        } else {
          console.warn('ProjectManager.currentProject.tracks not found');
        }

        console.log(`✅ DiffSinger track loaded: ${trackData.name}`);
      } catch (error) {
        console.error(`❌ Failed to load DiffSinger track ${index}:`, error);
      }
    });
  }
}

// シングルトンインスタンスを作成・エクスポート
const demoSongManager = new DemoSongManager();
export default demoSongManager;
