# Ghost Text 複数フレーズセット生成機能要件 (L3)

**Document ID**: FR-L3-GT-PS-001
**Version**: 1.0.0
**Last Updated**: 2025-11-10
**Parent**: [L2: AI統合機能要件](./index.md)
**Implementation Status**: 🚧 Planning
**Related Issue**: [#TBD - Phrase Sets Generation]
**Related Spec**: [L3: フレーズセット切り替え機能](./L3_ghost_text_candidate_selection.md)

## 🎯 機能概要

Ghost Text補完機能において、**3つの多様なフレーズセット候補（各5音構成）を同時生成**する機能を提供します。Magenta AIの音楽生成モデルを活用し、音楽理論に基づく調和度を確保しつつ、多様性を持たせたフレーズセット生成を実現します。

## 📊 技術背景

### 現在の実装（v1.0.0）
**単一フレーズ生成**: 1回の予測で1つのフレーズ（5ノート）を生成

```javascript
// 現在の実装（magentaGhostTextEngine.js）
async predictNextPhrase(currentNotes, numNotes = 5) {
  const phraseNotes = await this.musicRnn.continueSequence(
    currentNotes,
    numNotes,
    temperature: 1.0,
    stepsPerQuarter: 4
  )
  return phraseNotes  // 単一フレーズ
}
```

**課題**:
- 生成結果が1つのみ → ユーザーの選択肢が限定的
- 同じ入力で再生成すると似たフレーズになりがち
- 多様性確保のメカニズムがない

### 新仕様（v2.0.0）
**複数フレーズセット生成**: 1回の予測で3つの多様なフレーズセットを生成

```javascript
// 新実装（magentaGhostTextEngine.js v2.0.0）
async generatePhraseSets(currentNotes, phraseSetCount = 3, notesPerPhrase = 5) {
  const phraseSets = []

  for (let i = 0; i < phraseSetCount; i++) {
    const temperature = this.calculateTemperature(i)  // 多様性確保
    const phraseNotes = await this.musicRnn.continueSequence(
      currentNotes,
      notesPerPhrase,
      temperature: temperature,
      stepsPerQuarter: 4
    )
    phraseSets.push(phraseNotes)
  }

  return phraseSets  // 3つのフレーズセット [[...], [...], [...]]
}
```

**メリット**:
- ユーザーに3つの選択肢を提供
- 多様性確保メカニズム（温度パラメータ調整）
- 音楽理論に基づく調和度維持

## 📋 要件詳細

### FR-GT-PS-001: 複数フレーズセット生成システム

#### A. 生成パラメータ
**実装仕様**: 3つのフレーズセットを多様性確保で生成

```javascript
// magentaGhostTextEngine.js - フレーズセット生成設定
class MagentaGhostTextEngine {
  constructor() {
    // フレーズセット生成設定
    this.phraseSetCount = 3        // 生成するセット数
    this.notesPerPhrase = 5        // 各フレーズのノート数
    this.parallelGeneration = false // 並列生成（Phase 2で有効化）

    // 多様性確保パラメータ
    this.temperatureRange = {
      min: 0.8,   // 最も保守的（調和度重視）
      max: 1.2    // 最も創造的（多様性重視）
    }

    // 音楽理論制約
    this.scaleConstraint = true    // スケール制約適用
    this.harmonicFilter = true     // 非和声音フィルタリング
  }
}
```

**技術仕様**:
- **セット数**: 固定3個（ユーザー要求）
- **ノート数**: 各5個（起承転結のある音楽的フレーズ）
- **温度パラメータ**: 0.8→1.0→1.2（多様性段階的増加）
- **生成時間**: 600ms以下（現在200ms×3、並列化で250ms目標）

#### B. 多様性確保メカニズム
**実装仕様**: 温度パラメータとシード値による多様性確保

```javascript
// magentaGhostTextEngine.js - 多様性確保ロジック
class MagentaGhostTextEngine {
  /**
   * セットインデックスに基づく温度計算
   * @param {number} setIndex - セットインデックス（0-2）
   * @returns {number} temperature - 温度パラメータ（0.8-1.2）
   */
  calculateTemperature(setIndex) {
    const { min, max } = this.temperatureRange
    const step = (max - min) / (this.phraseSetCount - 1)
    const temperature = min + (step * setIndex)

    console.log(`🌡️ [PHRASE_SET_TEMP] セット${setIndex}の温度: ${temperature.toFixed(2)}`)
    return temperature
  }

  /**
   * 複数フレーズセット生成
   * @param {Array} currentNotes - 現在のMIDIノート配列
   * @param {number} phraseSetCount - 生成するセット数（デフォルト3）
   * @param {number} notesPerPhrase - 各フレーズのノート数（デフォルト5）
   * @returns {Promise<Array<Array>>} phraseSets - 生成されたフレーズセット
   */
  async generatePhraseSets(currentNotes, phraseSetCount = 3, notesPerPhrase = 5) {
    console.log('🎼 [PHRASE_SET_GEN_START]', {
      inputNotes: currentNotes.length,
      phraseSetCount,
      notesPerPhrase,
      parallelGeneration: this.parallelGeneration
    })

    const phraseSets = []
    const startTime = performance.now()

    if (this.parallelGeneration) {
      // Phase 2: 並列生成（パフォーマンス最適化）
      const generationPromises = []

      for (let i = 0; i < phraseSetCount; i++) {
        const temperature = this.calculateTemperature(i)
        const promise = this.generateSinglePhrase(currentNotes, notesPerPhrase, temperature, i)
        generationPromises.push(promise)
      }

      const results = await Promise.all(generationPromises)
      phraseSets.push(...results)

    } else {
      // Phase 1: 順次生成（実装簡易化）
      for (let i = 0; i < phraseSetCount; i++) {
        const temperature = this.calculateTemperature(i)
        const phraseNotes = await this.generateSinglePhrase(currentNotes, notesPerPhrase, temperature, i)
        phraseSets.push(phraseNotes)
      }
    }

    const endTime = performance.now()
    const generationTime = endTime - startTime

    console.log('✅ [PHRASE_SET_GEN_COMPLETE]', {
      generatedSets: phraseSets.length,
      generationTime: `${generationTime.toFixed(2)}ms`,
      avgTimePerSet: `${(generationTime / phraseSetCount).toFixed(2)}ms`,
      phraseSets: phraseSets.map(set => set.map(n => n.pitch))
    })

    // パフォーマンス警告
    if (generationTime > 600) {
      console.warn('⚠️ [PHRASE_SET_PERF] 生成時間が目標値(600ms)を超過:', {
        actual: `${generationTime.toFixed(2)}ms`,
        target: '600ms',
        suggestion: 'parallelGeneration有効化を検討'
      })
    }

    return phraseSets
  }

  /**
   * 単一フレーズ生成（内部メソッド）
   * @private
   */
  async generateSinglePhrase(currentNotes, notesPerPhrase, temperature, setIndex) {
    console.log(`🎵 [PHRASE_GEN_SET${setIndex}] 生成開始:`, {
      temperature,
      notesPerPhrase,
      scaleConstraint: this.scaleConstraint
    })

    // Magenta MusicRNNによる予測
    const phraseNotes = await this.musicRnn.continueSequence(
      currentNotes,
      notesPerPhrase,
      temperature: temperature,
      stepsPerQuarter: 4
    )

    // スケール制約適用
    if (this.scaleConstraint && this.currentScale) {
      const filteredNotes = this.applyScaleConstraint(phraseNotes, this.currentScale)
      console.log(`🎹 [PHRASE_SCALE_FILTER_SET${setIndex}]`, {
        original: phraseNotes.length,
        filtered: filteredNotes.length,
        scale: this.currentScale
      })
      return filteredNotes
    }

    return phraseNotes
  }

  /**
   * スケール制約適用
   * @private
   */
  applyScaleConstraint(notes, scale) {
    return notes.map(note => {
      const pitch = note.pitch
      const pitchClass = pitch % 12

      // スケール内の音程に最も近い音に調整
      if (!scale.includes(pitchClass)) {
        const nearestPitch = this.findNearestScalePitch(pitch, scale)
        console.log(`🔧 [SCALE_ADJUST] ${pitch} → ${nearestPitch}`)
        return { ...note, pitch: nearestPitch }
      }

      return note
    })
  }
}
```

**多様性メトリクス**:
- **音程の分散**: 各セット間で音程範囲の重複を最小化
- **リズムの多様性**: ノート長の組み合わせパターンを変化
- **温度パラメータ**: 0.8（保守的）→ 1.0（バランス）→ 1.2（創造的）

#### C. 音楽理論制約
**実装仕様**: スケール・コード進行制約

```javascript
// magentaGhostTextEngine.js - 音楽理論制約
class MagentaGhostTextEngine {
  /**
   * 音楽理論制約を適用してフレーズセット生成
   */
  async generateConstrainedPhraseSets(currentNotes, context) {
    // 現在のスケール・コード情報取得
    this.currentScale = context.scale || this.detectScale(currentNotes)
    this.currentChord = context.chord || null

    console.log('🎼 [MUSIC_THEORY_CONTEXT]', {
      scale: this.currentScale,
      chord: this.currentChord,
      key: context.key
    })

    // フレーズセット生成
    const phraseSets = await this.generatePhraseSets(currentNotes)

    // 各セットに音楽理論スコアを計算
    const scoredSets = phraseSets.map((phraseSet, index) => ({
      phraseSet,
      setIndex: index,
      score: this.calculateMusicTheoryScore(phraseSet, context)
    }))

    console.log('📊 [PHRASE_SET_SCORES]', scoredSets.map(s => ({
      setIndex: s.setIndex,
      harmonyScore: s.score.harmony,
      diversityScore: s.score.diversity,
      totalScore: s.score.total
    })))

    return scoredSets.map(s => s.phraseSet)
  }

  /**
   * 音楽理論スコア計算
   * @private
   */
  calculateMusicTheoryScore(phraseSet, context) {
    // 調和度スコア（スケール内の音の割合）
    const harmonyScore = this.calculateHarmonyScore(phraseSet, context.scale)

    // 多様性スコア（音程の分散）
    const diversityScore = this.calculateDiversityScore(phraseSet)

    // リズムスコア（音楽的なリズムパターン）
    const rhythmScore = this.calculateRhythmScore(phraseSet)

    const totalScore = (harmonyScore * 0.5) + (diversityScore * 0.3) + (rhythmScore * 0.2)

    return {
      harmony: harmonyScore,
      diversity: diversityScore,
      rhythm: rhythmScore,
      total: totalScore
    }
  }
}
```

**制約項目**:
- **スケール制約**: 選択中のスケール内の音程に制限
- **コード進行制約**: コードトーン・テンション考慮
- **非和声音フィルタリング**: 極端に不協和な音程を除外
- **リズム制約**: 音楽的に自然なリズムパターン

### FR-GT-PS-002: データマイグレーション

#### A. 後方互換性確保
**実装仕様**: v1.0.0データの自動マイグレーション

```javascript
// projectManager.js - データマイグレーション
class ProjectManager {
  /**
   * Ghost Textデータのバージョンマイグレーション
   * @param {Object} projectData - プロジェクトデータ
   * @returns {Object} migratedData - マイグレーション後のデータ
   */
  migrateGhostTextData(projectData) {
    const ghostTextVersion = projectData.ghostTextVersion || '1.0.0'

    console.log('🔄 [GHOST_TEXT_MIGRATION]', {
      currentVersion: ghostTextVersion,
      targetVersion: '2.0.0'
    })

    if (ghostTextVersion === '1.0.0') {
      // v1.0.0 → v2.0.0 マイグレーション
      return this.migrateV1toV2(projectData)
    }

    return projectData
  }

  /**
   * v1.0.0 → v2.0.0 マイグレーション
   * @private
   */
  migrateV1toV2(projectData) {
    const migratedData = { ...projectData }

    // 旧形式: phraseNotes = [note1, note2, note3, note4, note5]
    // 新形式: phraseSets = [[set0], [set1], [set2]]

    if (projectData.tracks) {
      migratedData.tracks = projectData.tracks.map(track => {
        if (track.ghostText && track.ghostText.phraseNotes) {
          const oldPhraseNotes = track.ghostText.phraseNotes

          return {
            ...track,
            ghostText: {
              ...track.ghostText,
              // 旧データを新形式に変換
              phraseSets: [oldPhraseNotes, [], []],  // セット0として配置
              selectedPhraseSetIndex: 0,
              currentNoteIndex: track.ghostText.nextPhraseIndex || 0,
              // 旧フィールドは保持（ロールバック用）
              _legacy_phraseNotes: oldPhraseNotes,
              _legacy_nextPhraseIndex: track.ghostText.nextPhraseIndex
            }
          }
        }

        return track
      })
    }

    migratedData.ghostTextVersion = '2.0.0'

    console.log('✅ [MIGRATION_COMPLETE]', {
      migratedTracks: migratedData.tracks?.length || 0,
      newVersion: '2.0.0'
    })

    return migratedData
  }

  /**
   * v2.0.0 → v1.0.0 ロールバック（緊急時用）
   * @private
   */
  rollbackV2toV1(projectData) {
    const rolledBackData = { ...projectData }

    if (projectData.tracks) {
      rolledBackData.tracks = projectData.tracks.map(track => {
        if (track.ghostText && track.ghostText._legacy_phraseNotes) {
          return {
            ...track,
            ghostText: {
              ...track.ghostText,
              phraseNotes: track.ghostText._legacy_phraseNotes,
              nextPhraseIndex: track.ghostText._legacy_nextPhraseIndex || 0,
              // v2.0.0フィールドは削除
              phraseSets: undefined,
              selectedPhraseSetIndex: undefined,
              currentNoteIndex: undefined
            }
          }
        }

        return track
      })
    }

    rolledBackData.ghostTextVersion = '1.0.0'

    console.log('⚠️ [ROLLBACK_COMPLETE]', {
      rolledBackTracks: rolledBackData.tracks?.length || 0,
      version: '1.0.0'
    })

    return rolledBackData
  }
}
```

**マイグレーション戦略**:
- **自動検出**: `ghostTextVersion` フィールドで判定
- **非破壊変換**: 旧データを `_legacy_*` フィールドに保持
- **ロールバック対応**: v2.0.0 → v1.0.0 変換機能
- **段階的移行**: v1.0.0との共存期間確保（1-2バージョン）

#### B. LocalStorage互換性
**実装仕様**: セッション間でのデータ永続化

```javascript
// useGhostText.js - LocalStorage保存・読み込み
const saveGhostTextState = useCallback(() => {
  const state = {
    version: '2.0.0',
    phraseSets: phraseSets,
    selectedPhraseSetIndex: selectedPhraseSetIndex,
    currentNoteIndex: currentNoteIndex,
    timestamp: Date.now()
  }

  localStorage.setItem('ghostText_state', JSON.stringify(state))
  console.log('💾 [GHOST_TEXT_SAVE]', state)
}, [phraseSets, selectedPhraseSetIndex, currentNoteIndex])

const loadGhostTextState = useCallback(() => {
  const savedState = localStorage.getItem('ghostText_state')

  if (!savedState) {
    console.log('ℹ️ [GHOST_TEXT_LOAD] No saved state found')
    return null
  }

  try {
    const state = JSON.parse(savedState)

    // バージョンチェック
    if (state.version === '1.0.0') {
      console.log('🔄 [GHOST_TEXT_LOAD] Migrating v1.0.0 data')
      return migrateV1toV2LocalStorage(state)
    }

    console.log('✅ [GHOST_TEXT_LOAD]', state)
    return state

  } catch (error) {
    console.error('❌ [GHOST_TEXT_LOAD_ERROR]', error)
    return null
  }
}, [])
```

### FR-GT-PS-003: パフォーマンス要件

#### A. 生成時間制約
**実装仕様**: 600ms以下での生成完了

| 実装段階 | 生成方式 | 目標時間 | 実測値（推定） |
|---------|---------|---------|--------------|
| Phase 1 | 順次生成（3回） | 600ms以下 | ~600ms（200ms×3） |
| Phase 2 | 並列生成（3並列） | 250ms以下 | ~250ms（並列化） |
| Phase 4 | キャッシュ活用 | 100ms以下 | ~100ms（最適化後） |

**最適化戦略**:
```javascript
// magentaGhostTextEngine.js - 並列生成最適化
class MagentaGhostTextEngine {
  async generatePhraseSetsParallel(currentNotes) {
    const startTime = performance.now()

    // Web Workerによる並列処理（Phase 2実装）
    const generationPromises = [0, 1, 2].map(setIndex => {
      return this.generateInWorker(currentNotes, setIndex)
    })

    const phraseSets = await Promise.all(generationPromises)

    const endTime = performance.now()
    console.log(`⚡ [PARALLEL_GEN_TIME] ${(endTime - startTime).toFixed(2)}ms`)

    return phraseSets
  }
}
```

#### B. メモリ使用量
**実装仕様**: 1トラックあたり1KB未満

```javascript
// メモリ使用量推定
const memoryUsage = {
  singlePhrase: {
    notes: 5,
    bytesPerNote: 32,  // {pitch, duration, velocity, timing}
    total: 160  // bytes
  },
  phraseSets: {
    sets: 3,
    notesPerSet: 5,
    bytesPerNote: 32,
    total: 480  // bytes (160 × 3)
  },
  metadata: {
    selectedPhraseSetIndex: 4,  // int32
    currentNoteIndex: 4,        // int32
    version: 32,                // string
    total: 40  // bytes
  },
  totalPerTrack: 520  // bytes < 1KB ✅
}
```

## 🧪 テストケース

### A. 単体テスト

```javascript
// magentaGhostTextEngine.test.js
describe('複数フレーズセット生成', () => {
  test('3つのフレーズセットを生成する', async () => {
    const engine = new MagentaGhostTextEngine()
    const currentNotes = [{ pitch: 60, duration: 0.5 }]

    const phraseSets = await engine.generatePhraseSets(currentNotes, 3, 5)

    expect(phraseSets).toHaveLength(3)
    expect(phraseSets[0]).toHaveLength(5)
    expect(phraseSets[1]).toHaveLength(5)
    expect(phraseSets[2]).toHaveLength(5)
  })

  test('各セットが異なる音程を持つ（多様性確保）', async () => {
    const engine = new MagentaGhostTextEngine()
    const currentNotes = [{ pitch: 60, duration: 0.5 }]

    const phraseSets = await engine.generatePhraseSets(currentNotes, 3, 5)

    const set0Pitches = phraseSets[0].map(n => n.pitch).join(',')
    const set1Pitches = phraseSets[1].map(n => n.pitch).join(',')
    const set2Pitches = phraseSets[2].map(n => n.pitch).join(',')

    // 3つのセットが完全に同一でないことを確認
    expect(set0Pitches === set1Pitches && set1Pitches === set2Pitches).toBe(false)
  })

  test('生成時間が600ms以下（Phase 1目標）', async () => {
    const engine = new MagentaGhostTextEngine()
    const currentNotes = [{ pitch: 60, duration: 0.5 }]

    const startTime = performance.now()
    await engine.generatePhraseSets(currentNotes, 3, 5)
    const endTime = performance.now()

    expect(endTime - startTime).toBeLessThan(600)
  })
})
```

### B. 統合テスト

```javascript
// useGhostText.integration.test.js
describe('フレーズセット生成統合テスト', () => {
  test('フレーズセット生成 → 切り替え → 承認のフロー', async () => {
    const { result } = renderHook(() => useGhostText())

    // 1. フレーズセット生成
    await act(async () => {
      await result.current.generatePhraseSets([{ pitch: 60 }])
    })

    expect(result.current.phraseSets).toHaveLength(3)
    expect(result.current.selectedPhraseSetIndex).toBe(0)

    // 2. セット切り替え
    act(() => {
      result.current.selectNextPhraseSet()
    })

    expect(result.current.selectedPhraseSetIndex).toBe(1)
    expect(result.current.currentNoteIndex).toBe(0)  // リセット確認

    // 3. ノート承認
    act(() => {
      result.current.acceptCurrentNote()
    })

    expect(result.current.currentNoteIndex).toBe(1)
  })
})
```

### C. E2Eテスト

```javascript
// playwright/ghost-text-phrase-sets.spec.js
test('フレーズセット切り替えE2Eテスト', async ({ page }) => {
  await page.goto('http://localhost:5173')

  // Ghost Text有効化
  await page.click('[data-testid="ghost-text-toggle"]')

  // MIDIエディタでノート追加（フレーズセット生成トリガー）
  await page.click('[data-testid="midi-editor-canvas"]', { position: { x: 100, y: 100 } })

  // ステータスバーでフレーズセット表示確認
  await expect(page.locator('text=/フレーズセット: 1\\/3/')).toBeVisible()

  // ↓キーでセット切り替え
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('text=/フレーズセット: 2\\/3/')).toBeVisible()

  // スクリーンショット証拠
  await page.screenshot({ path: 'playwright-output/phrase-set-switch.png' })
})
```

## 📊 パフォーマンスモニタリング

### A. メトリクス定義

```javascript
// performanceMonitor.js - フレーズセット生成メトリクス
const phraseSetMetrics = {
  generationTime: {
    target: 600,      // ms
    warning: 500,     // ms
    critical: 700     // ms
  },
  memoryUsage: {
    target: 1024,     // bytes/track
    warning: 900,     // bytes/track
    critical: 1100    // bytes/track
  },
  diversityScore: {
    target: 0.7,      // 0-1スケール
    warning: 0.5,
    critical: 0.3
  }
}
```

### B. アラート設定

```javascript
// magentaGhostTextEngine.js - パフォーマンスアラート
class MagentaGhostTextEngine {
  async generatePhraseSets(currentNotes) {
    const startTime = performance.now()
    const phraseSets = await this._generate(currentNotes)
    const endTime = performance.now()
    const generationTime = endTime - startTime

    // パフォーマンス評価
    if (generationTime > 700) {
      console.error('🚨 [PERF_CRITICAL] フレーズセット生成が非常に遅い:', {
        actual: `${generationTime.toFixed(2)}ms`,
        target: '600ms',
        action: '並列生成への移行を強く推奨'
      })
    } else if (generationTime > 500) {
      console.warn('⚠️ [PERF_WARNING] フレーズセット生成が目標に近い:', {
        actual: `${generationTime.toFixed(2)}ms`,
        target: '600ms',
        suggestion: 'キャッシュ活用または並列生成の検討'
      })
    } else {
      console.log('✅ [PERF_OK] フレーズセット生成が目標内:', {
        actual: `${generationTime.toFixed(2)}ms`,
        target: '600ms'
      })
    }

    return phraseSets
  }
}
```

## 🔗 関連仕様参照

### 関連L3仕様
- **[L3: フレーズセット切り替え機能](./L3_ghost_text_candidate_selection.md)** - UI・キーボード操作仕様
- **[L3: Ghost Text基本要件](./L3_ghost_text_requirements.md)** - 基本機能仕様
- **[L3: Ghost Text強化機能](./L3_ghost_text_enhancement.md)** - 音楽理論統合

### 上位要件
- **[L2: AI統合機能要件](./index.md)** - Ghost Text機能の位置づけ

### 関連Issue
- **[Issue #141](https://github.com/uni963/environment_with_yhdk_rhdk/issues/141)** - Ghost Text機能強化（親Issue）
- **[Issue #147](https://github.com/uni963/environment_with_yhdk_rhdk/issues/147)** - 複数候補提案・切り替え

---

**Document History**:
- 2025-11-10: 初版作成（v2.0.0計画策定時）
- 実装予定: Phase 1-4 段階的実装（4週間計画）
