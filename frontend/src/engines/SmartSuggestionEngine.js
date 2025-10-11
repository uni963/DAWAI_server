/**
 * スマート音楽提案エンジン
 * ジャンル適応型インテリジェント音楽提案システム
 */

import MusicTheoryEngine from './MusicTheoryEngine.js';

class SmartSuggestionEngine {
  constructor() {
    this.musicTheoryEngine = new MusicTheoryEngine();
    this.evaluator = new MusicalQualityEvaluator();
    this.cache = new Map();
    this.suggestionHistory = [];
  }

  /**
   * 次のノート提案
   * @param {Object} context - 提案コンテキスト
   * @param {Array} context.currentNotes - 既存ノート列
   * @param {Object} context.lastNote - 直前のノート
   * @param {Object} context.genreContext - ジャンルコンテキスト
   * @param {number} context.position - 現在の時間位置
   * @param {Object} context.musicalContext - 音楽的コンテキスト
   * @returns {Array} 提案ノート配列（信頼度順）
   */
  suggestNextNotes(context) {
    const { currentNotes, lastNote, genreContext, position, musicalContext } = context;

    if (!genreContext || !genreContext.suggestionSettings.enabled) {
      return [];
    }

    try {
      // キャッシュキーを生成
      const cacheKey = this._generateCacheKey(context);
      if (this.cache.has(cacheKey)) {
        console.log('🔄 Suggestion cache hit');
        return this.cache.get(cacheKey);
      }

      console.log('🎵 Generating note suggestions...');

      // ステップ1: スケール制約適用
      const scaleConstrainedPitches = genreContext.constraints.allowedPitches;

      // ステップ2: メロディックコンテキスト分析
      const melodicContext = this._analyzeMelodicContext(currentNotes, lastNote);

      // ステップ3: ハーモニックコンテキスト分析
      const harmonicContext = this._analyzeHarmonicContext(position, genreContext, musicalContext);

      // ステップ4: リズミックコンテキスト分析
      const rhythmicContext = this._analyzeRhythmicContext(position, genreContext);

      // ステップ5: 候補生成
      const candidates = this._generateNoteCandidates(
        scaleConstrainedPitches,
        melodicContext,
        harmonicContext,
        rhythmicContext,
        genreContext
      );

      // ステップ6: スコアリングと評価
      const scoredCandidates = this._scoreNoteCandidates(
        candidates,
        melodicContext,
        harmonicContext,
        genreContext
      );

      // ステップ7: フィルタリングと最終選択
      const suggestions = this._selectBestSuggestions(
        scoredCandidates,
        genreContext.suggestionSettings.aggressiveness
      );

      // キャッシュに保存
      this.cache.set(cacheKey, suggestions);

      // 履歴に追加
      this.suggestionHistory.push({
        timestamp: Date.now(),
        context: this._summarizeContext(context),
        suggestions: suggestions.length,
        accepted: false // 後で更新される
      });

      console.log(`✨ Generated ${suggestions.length} note suggestions`);
      return suggestions;

    } catch (error) {
      console.error('❌ Note suggestion error:', error);
      return [];
    }
  }

  /**
   * コード進行提案
   * @param {Object} genreContext - ジャンルコンテキスト
   * @param {Array} currentChords - 現在のコード列
   * @param {number} position - 現在の位置
   * @returns {Array} コード提案配列
   */
  suggestChordProgression(genreContext, currentChords = [], position = 0) {
    if (!genreContext) {
      return [];
    }

    try {
      const genre = genreContext.genre;
      const key = genreContext.activeKey;

      console.log('🎼 Generating chord progression suggestions...');

      if (currentChords.length === 0) {
        // 初回: ジャンル特有のパターンから選択
        return this._suggestInitialChords(genre, key);
      }

      // 既存コードに続く適切な進行を提案
      const lastChord = currentChords[currentChords.length - 1];
      return this._suggestNextChord(lastChord, key, genre, position);

    } catch (error) {
      console.error('❌ Chord progression suggestion error:', error);
      return [];
    }
  }

  /**
   * リズムパターン提案
   * @param {Object} genreContext - ジャンルコンテキスト
   * @param {string} trackType - トラックタイプ ('drum', 'melody', 'bass')
   * @param {Object} currentPattern - 現在のパターン
   * @returns {Array} リズムパターン提案配列
   */
  suggestRhythmPattern(genreContext, trackType = 'drum', currentPattern = null) {
    if (!genreContext) {
      return [];
    }

    try {
      const genre = genreContext.genre;
      const typicalPatterns = genre.musicTheory.rhythmCharacteristics.typicalPatterns;

      console.log(`🥁 Generating rhythm pattern suggestions for ${trackType}...`);

      // トラックタイプに応じたパターンフィルタリング
      const relevantPatterns = typicalPatterns.filter(p =>
        p.applicableTo.includes(trackType)
      );

      if (relevantPatterns.length === 0) {
        // デフォルトパターン生成
        return [this.musicTheoryEngine.generateRhythmPattern(
          genreContext.genre.tempoRange.typical,
          genre
        )];
      }

      // 重み付きランダム選択で複数パターン提案
      const suggestions = [];
      const maxSuggestions = Math.min(3, relevantPatterns.length);

      for (let i = 0; i < maxSuggestions; i++) {
        const pattern = this._weightedRandomSelect(relevantPatterns);
        if (pattern && !suggestions.find(s => s.name === pattern.name)) {
          suggestions.push({
            ...pattern,
            confidence: this._calculateRhythmConfidence(pattern, genre, trackType),
            variations: this._generateRhythmVariations(pattern)
          });
        }
      }

      return suggestions.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('❌ Rhythm pattern suggestion error:', error);
      return [];
    }
  }

  /**
   * メロディ品質評価
   * @param {Array} melody - メロディノート配列
   * @param {Object} genreContext - ジャンルコンテキスト
   * @returns {Object} 品質スコア
   */
  evaluateMelody(melody, genreContext) {
    return this.evaluator.evaluateMelody(melody, genreContext);
  }

  /**
   * ハーモニー品質評価
   * @param {Array} chords - コード配列
   * @param {Object} genreContext - ジャンルコンテキスト
   * @returns {Object} 品質スコア
   */
  evaluateHarmony(chords, genreContext) {
    return this.evaluator.evaluateHarmony(chords, genreContext);
  }

  /**
   * 提案採用フィードバック
   * @param {Object} suggestion - 採用された提案
   * @param {boolean} accepted - 採用されたかどうか
   */
  recordFeedback(suggestion, accepted) {
    // 履歴更新
    const recentSuggestion = this.suggestionHistory[this.suggestionHistory.length - 1];
    if (recentSuggestion) {
      recentSuggestion.accepted = accepted;
    }

    // 学習データとして保存（将来拡張用）
    console.log(`📊 Suggestion feedback: ${accepted ? 'accepted' : 'rejected'}`);
  }

  /**
   * キャッシュクリア
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 SmartSuggestionEngine cache cleared');
  }

  /**
   * 統計情報取得
   * @returns {Object} 統計情報
   */
  getStatistics() {
    const totalSuggestions = this.suggestionHistory.length;
    const acceptedSuggestions = this.suggestionHistory.filter(s => s.accepted).length;
    const acceptanceRate = totalSuggestions > 0 ? (acceptedSuggestions / totalSuggestions) : 0;

    return {
      totalSuggestions,
      acceptedSuggestions,
      acceptanceRate: Math.round(acceptanceRate * 100),
      cacheSize: this.cache.size,
      historySize: this.suggestionHistory.length
    };
  }

  // ========== プライベートメソッド ==========

  /**
   * ノート候補生成
   * @param {Array} allowedPitches - 許可されたピッチ
   * @param {Object} melodicContext - メロディックコンテキスト
   * @param {Object} harmonicContext - ハーモニックコンテキスト
   * @param {Object} rhythmicContext - リズミックコンテキスト
   * @param {Object} genreContext - ジャンルコンテキスト
   * @returns {Array} ノート候補配列
   */
  _generateNoteCandidates(allowedPitches, melodicContext, harmonicContext, rhythmicContext, genreContext) {
    const candidates = [];

    allowedPitches.forEach(pitch => {
      // オクターブ範囲制限 (C3-C6)
      if (pitch < 48 || pitch > 84) return;

      const candidate = {
        pitch,
        confidence: 0,
        reasoning: {
          scaleMatch: true,  // すでにスケール制約済み
          harmonicMatch: false,
          melodicFlow: 0,
          genreTypicality: 0,
          rhythmicFit: 0
        },
        alternatives: [],
        visualHint: {
          ghostNote: true,
          color: '',
          label: this.musicTheoryEngine.pitchToNoteName(pitch)
        }
      };

      candidates.push(candidate);
    });

    return candidates;
  }

  /**
   * ノート候補スコアリング
   * @param {Array} candidates - ノート候補配列
   * @param {Object} melodicContext - メロディックコンテキスト
   * @param {Object} harmonicContext - ハーモニックコンテキスト
   * @param {Object} genreContext - ジャンルコンテキスト
   * @returns {Array} スコア付きノート候補配列
   */
  _scoreNoteCandidates(candidates, melodicContext, harmonicContext, genreContext) {
    return candidates.map(candidate => {
      // メロディック評価
      candidate.reasoning.melodicFlow = this._evaluateMelodicFlow(
        melodicContext.lastPitch,
        candidate.pitch,
        melodicContext
      );

      // ハーモニック評価
      candidate.reasoning.harmonicMatch = this._evaluateHarmonicMatch(
        candidate.pitch,
        harmonicContext
      );

      // ジャンル典型性評価
      candidate.reasoning.genreTypicality = this._evaluateGenreTypicality(
        candidate.pitch,
        melodicContext,
        genreContext.genre
      );

      // 総合信頼度計算
      candidate.confidence = this._calculateConfidence(candidate.reasoning);

      // 視覚ヒント設定
      candidate.visualHint.color = this._getConfidenceColor(candidate.confidence);

      return candidate;
    });
  }

  /**
   * 最適提案選択
   * @param {Array} scoredCandidates - スコア付き候補
   * @param {number} aggressiveness - 積極性 (0-1)
   * @returns {Array} 選択された提案
   */
  _selectBestSuggestions(scoredCandidates, aggressiveness) {
    // 信頼度順ソート
    scoredCandidates.sort((a, b) => b.confidence - a.confidence);

    // 積極性に応じて提案数を調整
    const maxSuggestions = Math.ceil(aggressiveness * 5) + 1; // 1-6件
    const minConfidence = 0.3 - (aggressiveness * 0.2); // 0.1-0.3

    return scoredCandidates
      .filter(candidate => candidate.confidence >= minConfidence)
      .slice(0, maxSuggestions);
  }

  /**
   * メロディックコンテキスト分析
   * @param {Array} notes - ノート配列
   * @param {Object} lastNote - 直前のノート
   * @returns {Object} メロディックコンテキスト
   */
  _analyzeMelodicContext(notes, lastNote) {
    if (!notes || notes.length < 2) {
      return {
        direction: 'neutral',
        interval: 0,
        contour: 'static',
        lastPitch: lastNote?.pitch || 60,
        recentPitches: [],
        phrases: []
      };
    }

    // 直近の音程変化分析
    const recentNotes = notes.slice(-4);
    const intervals = [];
    for (let i = 1; i < recentNotes.length; i++) {
      intervals.push(recentNotes[i].pitch - recentNotes[i-1].pitch);
    }

    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

    return {
      direction: avgInterval > 0 ? 'ascending' : avgInterval < 0 ? 'descending' : 'neutral',
      interval: Math.abs(avgInterval),
      contour: this._determineContour(intervals),
      lastPitch: notes[notes.length - 1]?.pitch || 60,
      recentPitches: recentNotes.map(n => n.pitch),
      phrases: this._identifyPhrases(notes)
    };
  }

  /**
   * ハーモニックコンテキスト分析
   * @param {number} position - 現在位置
   * @param {Object} genreContext - ジャンルコンテキスト
   * @param {Object} musicalContext - 音楽的コンテキスト
   * @returns {Object} ハーモニックコンテキスト
   */
  _analyzeHarmonicContext(position, genreContext, musicalContext) {
    // 現在位置のコード推定
    const currentChord = this._estimateCurrentChord(position, genreContext, musicalContext);

    return {
      currentChord,
      chordTones: currentChord ? this.musicTheoryEngine.getChordTones(currentChord) : [],
      tensions: currentChord ? this.musicTheoryEngine.getChordTensions(currentChord) : [],
      chordFunction: currentChord?.function || 'unknown',
      keyCenter: genreContext.activeKey
    };
  }

  /**
   * リズミックコンテキスト分析
   * @param {number} position - 現在位置
   * @param {Object} genreContext - ジャンルコンテキスト
   * @returns {Object} リズミックコンテキスト
   */
  _analyzeRhythmicContext(position, genreContext) {
    const beatPosition = position % 1; // 拍内位置
    const barPosition = position % 4;  // 小節内位置

    return {
      beatPosition,
      barPosition,
      isStrongBeat: genreContext.genre.musicTheory.rhythmCharacteristics.accentBeats.includes(Math.floor(barPosition)),
      swingFeel: genreContext.genre.musicTheory.rhythmCharacteristics.swingFeel || 0,
      subdivision: genreContext.constraints.rhythmGrid.subdivision
    };
  }

  /**
   * メロディックフロー評価
   * @param {number} lastPitch - 前のピッチ
   * @param {number} candidatePitch - 候補ピッチ
   * @param {Object} melodicContext - メロディックコンテキスト
   * @returns {number} フロースコア (0-1)
   */
  _evaluateMelodicFlow(lastPitch, candidatePitch, melodicContext) {
    if (!lastPitch) return 0.5;

    const interval = Math.abs(candidatePitch - lastPitch);
    let score = 1.0;

    // 音程距離ペナルティ（大きな跳躍は減点）
    if (interval > 7) {  // 完全5度以上
      score -= (interval - 7) * 0.05;
    }

    // 輪郭の自然さ（同じ方向への連続は減点）
    if (melodicContext.direction === 'ascending' && candidatePitch > lastPitch) {
      score -= 0.1;
    } else if (melodicContext.direction === 'descending' && candidatePitch < lastPitch) {
      score -= 0.1;
    }

    // 反復回避（同じ音の連続は減点）
    if (melodicContext.recentPitches.includes(candidatePitch)) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * ハーモニック適合性評価
   * @param {number} pitch - ピッチ
   * @param {Object} harmonicContext - ハーモニックコンテキスト
   * @returns {boolean} 適合性
   */
  _evaluateHarmonicMatch(pitch, harmonicContext) {
    if (!harmonicContext.currentChord) return true; // コード情報がない場合は許可

    const pitchClass = pitch % 12;

    // コードトーンに含まれるか
    if (harmonicContext.chordTones.includes(pitchClass)) {
      return true;
    }

    // テンションに含まれるか
    if (harmonicContext.tensions.includes(pitchClass)) {
      return true;
    }

    // スケール内だが非和声音
    return false;
  }

  /**
   * ジャンル典型性評価
   * @param {number} pitch - ピッチ
   * @param {Object} melodicContext - メロディックコンテキスト
   * @param {Object} genre - ジャンル情報
   * @returns {number} 典型性スコア (0-1)
   */
  _evaluateGenreTypicality(pitch, melodicContext, genre) {
    let score = 0.5; // デフォルトスコア

    // ジャンル別ルール
    if (genre.id === 'blues' && this._isBlueNote(pitch)) {
      score += 0.3;
    }

    if (genre.id === 'jazz' && melodicContext.interval > 5) {
      score += 0.2;  // ジャズは大きな跳躍も許容
    }

    if (genre.id === 'pop' && melodicContext.interval <= 3) {
      score += 0.2;  // ポップスは小さな音程変化を好む
    }

    return Math.min(1, score);
  }

  /**
   * 信頼度計算
   * @param {Object} reasoning - 推論結果
   * @returns {number} 信頼度 (0-1)
   */
  _calculateConfidence(reasoning) {
    const weights = {
      scaleMatch: 0.3,
      harmonicMatch: 0.3,
      melodicFlow: 0.25,
      genreTypicality: 0.15
    };

    return (
      (reasoning.scaleMatch ? 1 : 0) * weights.scaleMatch +
      (reasoning.harmonicMatch ? 1 : 0) * weights.harmonicMatch +
      reasoning.melodicFlow * weights.melodicFlow +
      reasoning.genreTypicality * weights.genreTypicality
    );
  }

  /**
   * 信頼度に応じた色取得
   * @param {number} confidence - 信頼度
   * @returns {string} カラーコード
   */
  _getConfidenceColor(confidence) {
    if (confidence > 0.8) return '#00ff00';      // 高信頼: 緑
    if (confidence > 0.6) return '#ffff00';      // 中信頼: 黄
    if (confidence > 0.4) return '#ff9900';      // 低信頼: オレンジ
    return '#ff0000';                             // 極低: 赤
  }

  /**
   * その他のユーティリティメソッド
   */
  _generateCacheKey(context) {
    const { genreContext, position, currentNotes } = context;
    const genreId = genreContext?.genre?.id || 'unknown';
    const notesHash = this._hashNotes(currentNotes);
    return `${genreId}-${Math.floor(position)}-${notesHash}`;
  }

  _hashNotes(notes) {
    if (!notes || notes.length === 0) return '0';
    return notes.slice(-3).map(n => n.pitch).join('-');
  }

  _summarizeContext(context) {
    return {
      genre: context.genreContext?.genre?.id,
      position: context.position,
      noteCount: context.currentNotes?.length || 0
    };
  }

  _determineContour(intervals) {
    const ascending = intervals.filter(i => i > 0).length;
    const descending = intervals.filter(i => i < 0).length;

    if (ascending > descending * 1.5) return 'ascending';
    if (descending > ascending * 1.5) return 'descending';
    return 'wave';
  }

  _identifyPhrases(notes) {
    // 簡易フレーズ検出（将来拡張用）
    return [];
  }

  _estimateCurrentChord(position, genreContext, musicalContext) {
    // 簡易実装: 将来はProjectManagerから取得
    return null;
  }

  _suggestInitialChords(genre, key) {
    // ジャンル特有の初期コード提案
    const progressions = genre.musicTheory.chordProgressions;
    if (progressions.length > 0) {
      const mostCommon = progressions.reduce((prev, current) =>
        current.weight > prev.weight ? current : prev
      );
      return [{ chordProgression: mostCommon, confidence: 0.9 }];
    }
    return [];
  }

  _suggestNextChord(lastChord, key, genre, position) {
    // 次のコード提案（簡易実装）
    return [];
  }

  _calculateRhythmConfidence(pattern, genre, trackType) {
    // リズムパターンの信頼度計算
    return pattern.weight || 0.5;
  }

  _generateRhythmVariations(pattern) {
    // リズムパターンのバリエーション生成
    return [];
  }

  _weightedRandomSelect(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
      random -= (item.weight || 1);
      if (random <= 0) return item;
    }

    return items[0];
  }

  _isBlueNote(pitch) {
    const pitchClass = pitch % 12;
    const blueNotes = [3, 6, 10];  // b3, b5, b7
    return blueNotes.includes(pitchClass);
  }
}

/**
 * 音楽品質評価器
 */
class MusicalQualityEvaluator {
  evaluateMelody(melody, genreContext) {
    if (!melody || melody.length === 0) {
      return { score: 0, details: 'Empty melody' };
    }

    let score = 0;
    const factors = [];

    // 音程の自然さ
    const intervalScore = this._evaluateIntervals(melody);
    score += intervalScore * 0.4;
    factors.push({ name: 'intervals', score: intervalScore });

    // スケール適合性
    const scaleScore = this._evaluateScaleConformity(melody, genreContext);
    score += scaleScore * 0.3;
    factors.push({ name: 'scale_conformity', score: scaleScore });

    // リズムの安定性
    const rhythmScore = this._evaluateRhythm(melody);
    score += rhythmScore * 0.3;
    factors.push({ name: 'rhythm', score: rhythmScore });

    return {
      score: Math.round(score * 100),
      details: factors,
      suggestions: this._generateMelodyImprovements(melody, factors)
    };
  }

  evaluateHarmony(chords, genreContext) {
    if (!chords || chords.length === 0) {
      return { score: 0, details: 'No chords' };
    }

    let score = 0;
    const factors = [];

    // 進行の論理性
    const progressionScore = this._evaluateProgression(chords, genreContext);
    score += progressionScore * 0.5;
    factors.push({ name: 'progression', score: progressionScore });

    // ジャンル適合性
    const genreScore = this._evaluateGenreConformity(chords, genreContext);
    score += genreScore * 0.3;
    factors.push({ name: 'genre_conformity', score: genreScore });

    // 声部進行
    const voiceLeadingScore = this._evaluateVoiceLeading(chords);
    score += voiceLeadingScore * 0.2;
    factors.push({ name: 'voice_leading', score: voiceLeadingScore });

    return {
      score: Math.round(score * 100),
      details: factors,
      suggestions: this._generateHarmonyImprovements(chords, factors)
    };
  }

  // 評価メソッドの実装（簡易版）
  _evaluateIntervals(melody) {
    // 音程の自然さを評価
    return 0.7; // 仮実装
  }

  _evaluateScaleConformity(melody, genreContext) {
    // スケール適合性を評価
    return 0.8; // 仮実装
  }

  _evaluateRhythm(melody) {
    // リズムの安定性を評価
    return 0.6; // 仮実装
  }

  _evaluateProgression(chords, genreContext) {
    // コード進行の論理性を評価
    return 0.7; // 仮実装
  }

  _evaluateGenreConformity(chords, genreContext) {
    // ジャンル適合性を評価
    return 0.8; // 仮実装
  }

  _evaluateVoiceLeading(chords) {
    // 声部進行を評価
    return 0.6; // 仮実装
  }

  _generateMelodyImprovements(melody, factors) {
    return ['Consider smoother intervals', 'Add rhythmic variation'];
  }

  _generateHarmonyImprovements(chords, factors) {
    return ['Try ii-V-I progression', 'Add seventh chords'];
  }
}

// シングルトンインスタンスを作成・エクスポート
const smartSuggestionEngine = new SmartSuggestionEngine();
export default smartSuggestionEngine;