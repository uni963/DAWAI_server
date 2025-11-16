# Ghost Text v2.0.0 変更サマリー

**対象バージョン**: v2.0.0 (フレーズセット切り替え機能)
**作成日**: 2025-11-10
**ドキュメントタイプ**: 変更サマリー・開発者ガイド

## 📋 目次
1. [変更概要](#変更概要)
2. [更新された仕様書](#更新された仕様書)
3. [新規作成された仕様書](#新規作成された仕様書)
4. [主要な変更点](#主要な変更点)
5. [実装チェックリスト](#実装チェックリスト)
6. [テスト仕様](#テスト仕様)
7. [リスク評価](#リスク評価)

---

## 変更概要

### 機能変更の目的
**現在（v1.0.0）**: 1フレーズ内の5個ノート間で↑/↓キー切り替え
**新仕様（v2.0.0）**: 3つのフレーズセット候補間で↑/↓キー切り替え、選択後Tabで1音ずつ承認

### ユーザー価値
- **多様な選択肢**: 3つの異なるフレーズセットから選択可能
- **効率的な作曲**: セット単位で比較検討→段階的承認
- **音楽的な表現力**: 起承転結のあるフレーズセットで自然なメロディ構築

### 技術的メリット
- **多様性確保**: 温度パラメータによる生成多様性
- **音楽理論統合**: スケール制約・調和度スコアリング
- **後方互換性**: v1.0.0データの自動マイグレーション

---

## 更新された仕様書

### 1. L3_ghost_text_candidate_selection.md
**パス**: `DAWAI_server/specs/requirements/functional/L2_ai_integration/L3_ghost_text_candidate_selection.md`

**バージョン**: 1.0.0 → 2.0.0

**主要変更点**:

#### セクション: 機能概要
**変更前**:
```markdown
1つの予測位置に対して複数の候補を生成し、ユーザーが↑/↓キーで切り替えて選択できる機能
```

**変更後**:
```markdown
複数のフレーズセット候補（各セット5音構成）を生成し、ユーザーが↑/↓キーでセット間を切り替え、
Tabキーで1音ずつ承認できる機能
```

**影響**: ユーザーインターフェース動作の根本的変更

---

#### セクション: FR-GT-CS-001 候補生成システム
**変更前**:
```javascript
this.predictionCount = 3  // 予測候補数
this.displayCount = 1     // 表示候補数
```

**変更後**:
```javascript
this.phraseSetCount = 3   // フレーズセット数
this.phraseLength = 5     // 各フレーズのノート数
this.displaySetCount = 1  // 表示セット数
```

**影響**: データ構造の変更、生成パラメータの再定義

---

#### セクション: データ構造
**変更前**:
```javascript
const [nextGhostIndex, setNextGhostIndex] = useState(0)
const [nextPhraseIndex, setNextPhraseIndex] = useState(0)
```

**変更後**:
```javascript
const [phraseSets, setPhraseSets] = useState([])               // 2次元配列
const [selectedPhraseSetIndex, setSelectedPhraseSetIndex] = useState(0)
const [currentNoteIndex, setCurrentNoteIndex] = useState(0)
```

**影響**: 状態管理の完全な再設計、マイグレーション必須

---

#### セクション: FR-GT-CS-002 候補切り替え機能
**変更前**:
```javascript
ghostText.selectPrevPhraseCandidate()  // フレーズ内ノート切り替え
ghostText.selectNextPhraseCandidate()  // フレーズ内ノート切り替え
```

**変更後**:
```javascript
ghostText.selectPrevPhraseSet()  // セット間切り替え
ghostText.selectNextPhraseSet()  // セット間切り替え
```

**影響**: キーボードハンドラーの動作変更、関数名変更

---

#### セクション: FR-GT-CS-003 UI表示システム
**変更前**:
```javascript
フレーズ候補: {nextPhraseIndex + 1}/{totalPhraseCandidates}
```

**変更後**:
```javascript
フレーズセット: {selectedPhraseSetIndex + 1}/{phraseSets.length}
(承認: {currentNoteIndex}/5)
```

**影響**: ステータスバーUI表示の変更、情報量増加

---

#### セクション: 実装ファイル一覧
**追加ファイル**:
- `frontend/src/utils/projectManager.js` - データマイグレーション関数
- Phase 1-4の優先度付けと影響範囲明示

**影響**: 開発チームのタスク理解向上、実装順序明確化

---

#### 新規セクション: v2.0.0 段階的実装計画
**内容**:
- Phase 1: 基盤整備（週1）
- Phase 2: コア機能実装（週2）
- Phase 3: UI統合（週3）
- Phase 4: 最適化・ドキュメント（週4）

**目的**: 実装の段階的アプローチ、リスク管理

**影響**: プロジェクト管理、スケジュール策定

---

#### 新規セクション: 今後の拡張可能性（v3.0.0以降）
**内容**:
- フレーズセットプレビュー機能
- セットリストUI
- 数字キー直接選択
- AI学習フィードバック

**目的**: 将来の機能拡張方向性の明示

---

### 更新サマリーテーブル

| セクション | 変更タイプ | 影響度 | 開発工数 |
|-----------|----------|--------|----------|
| 機能概要 | 完全書き換え | 🔴 High | 0.5h (ドキュメント) |
| データ構造 | 完全再設計 | 🔴 High | 8h (実装) |
| 候補切り替え | 関数名・動作変更 | 🔴 High | 6h (実装) |
| UI表示 | 表示項目追加 | 🟡 Medium | 2h (実装) |
| 実装ファイル一覧 | 項目追加 | 🟢 Low | 0.5h (ドキュメント) |
| 実装計画 | 新規セクション | 🟡 Medium | 1h (ドキュメント) |
| 拡張可能性 | 新規セクション | 🟢 Low | 0.5h (ドキュメント) |

**合計開発工数**: 約18.5時間（ドキュメント2.5h + 実装16h）

---

## 新規作成された仕様書

### 1. L3_ghost_text_phrase_sets.md
**パス**: `DAWAI_server/specs/requirements/functional/L2_ai_integration/L3_ghost_text_phrase_sets.md`

**目的**: 複数フレーズセット生成機能の詳細仕様

**主要セクション**:

#### 1.1 FR-GT-PS-001: 複数フレーズセット生成システム
**内容**:
- 生成パラメータ（3セット × 5ノート）
- 多様性確保メカニズム（温度パラメータ0.8-1.2）
- 音楽理論制約（スケール・コード進行）

**技術仕様**:
```javascript
async generatePhraseSets(currentNotes, phraseSetCount = 3, notesPerPhrase = 5) {
  // 温度パラメータによる多様性確保
  // スケール制約適用
  // パフォーマンス監視（600ms以下）
}
```

**実装工数**: 12時間

---

#### 1.2 FR-GT-PS-002: データマイグレーション
**内容**:
- v1.0.0 → v2.0.0 自動変換
- 後方互換性確保（`_legacy_*` フィールド保持）
- ロールバック機能（緊急時用）

**技術仕様**:
```javascript
migrateV1toV2(projectData) {
  // phraseNotes → phraseSets[0] 変換
  // 旧データ保持
  // バージョン更新
}
```

**実装工数**: 6時間

---

#### 1.3 FR-GT-PS-003: パフォーマンス要件
**内容**:
- 生成時間制約（600ms以下 → 250ms以下 → 100ms以下）
- メモリ使用量（1KB/トラック以下）
- パフォーマンスモニタリング・アラート

**段階的最適化**:
| Phase | 方式 | 目標時間 |
|-------|------|---------|
| Phase 1 | 順次生成 | 600ms |
| Phase 2 | 並列生成 | 250ms |
| Phase 4 | キャッシュ活用 | 100ms |

**実装工数**: 8時間（並列化4h + キャッシュ4h）

---

### 2. IMPLEMENTATION_CHECKLIST_GhostText_v2.md
**パス**: `DAWAI_server/specs/requirements/functional/L2_ai_integration/IMPLEMENTATION_CHECKLIST_GhostText_v2.md`

**目的**: 開発者向け実装チェックリスト

**構成**:
- Phase 1: 基盤整備（週1） - 18タスク
- Phase 2: コア機能実装（週2） - 15タスク
- Phase 3: UI統合（週3） - 10タスク
- Phase 4: 最適化・ドキュメント（週4） - 5タスク

**合計**: 48タスク、4週間計画

**特徴**:
- チェックボックス形式（進捗管理容易）
- 成果物明示
- 完了基準明確化
- リリース判定基準

---

### 3. CHANGES_SUMMARY_GhostText_v2.md（本ファイル）
**パス**: `DAWAI_server/specs/requirements/functional/L2_ai_integration/CHANGES_SUMMARY_GhostText_v2.md`

**目的**: 変更点の総合的サマリー

**対象読者**:
- 開発チーム（実装担当）
- プロジェクトマネージャー（進捗管理）
- レビュアー（品質確認）

---

## 主要な変更点

### 1. データ構造の変更

#### v1.0.0 データ構造
```javascript
{
  phraseNotes: [
    { pitch: 60, duration: 0.5, velocity: 80 },
    { pitch: 64, duration: 0.5, velocity: 80 },
    { pitch: 67, duration: 0.5, velocity: 80 },
    { pitch: 65, duration: 0.5, velocity: 80 },
    { pitch: 62, duration: 0.5, velocity: 80 }
  ],
  nextPhraseIndex: 0  // 現在のノート位置
}
```

#### v2.0.0 データ構造
```javascript
{
  phraseSets: [
    [  // セット0（保守的、温度0.8）
      { pitch: 60, duration: 0.5, velocity: 80 },
      { pitch: 64, duration: 0.5, velocity: 80 },
      { pitch: 67, duration: 0.5, velocity: 80 },
      { pitch: 65, duration: 0.5, velocity: 80 },
      { pitch: 62, duration: 0.5, velocity: 80 }
    ],
    [  // セット1（バランス、温度1.0）
      { pitch: 62, duration: 0.5, velocity: 80 },
      { pitch: 65, duration: 0.5, velocity: 80 },
      { pitch: 69, duration: 0.5, velocity: 80 },
      { pitch: 67, duration: 0.5, velocity: 80 },
      { pitch: 64, duration: 0.5, velocity: 80 }
    ],
    [  // セット2（創造的、温度1.2）
      { pitch: 64, duration: 0.5, velocity: 80 },
      { pitch: 67, duration: 0.5, velocity: 80 },
      { pitch: 71, duration: 0.5, velocity: 80 },
      { pitch: 69, duration: 0.5, velocity: 80 },
      { pitch: 65, duration: 0.5, velocity: 80 }
    ]
  ],
  selectedPhraseSetIndex: 0,  // 選択中のセット（0-2）
  currentNoteIndex: 0,        // セット内の承認済みノート数（0-5）

  // 後方互換性のための旧データ保持
  _legacy_phraseNotes: [...],
  _legacy_nextPhraseIndex: 0
}
```

**差分分析**:
| 項目 | v1.0.0 | v2.0.0 | 影響 |
|------|--------|--------|------|
| データ次元 | 1次元配列 | 2次元配列 | マイグレーション必須 |
| セット数 | 1個 | 3個 | メモリ3倍（480bytes） |
| インデックス管理 | 1個（nextPhraseIndex） | 2個（セット+ノート） | 状態管理複雑化 |
| 後方互換性 | N/A | `_legacy_*`フィールド | データ損失リスク軽減 |

---

### 2. キーボード操作の変更

#### v1.0.0 操作
```
↑/↓キー: フレーズ内の5個ノート間を切り替え
  - ノート1 ← → ノート2 ← → ノート3 ← → ノート4 ← → ノート5

Tab: 現在選択中のノートを承認
```

#### v2.0.0 操作
```
↑/↓キー: 3つのフレーズセット間を切り替え
  - セット0 ← → セット1 ← → セット2 (循環)
  - 切り替え時にcurrentNoteIndex=0にリセット

Tab: 選択中セットの次のノートを承認
  - セット内で1音ずつ承認（0→1→2→3→4）
  - 5音承認後にセット完了
```

**ユーザー体験の変化**:
| 操作 | v1.0.0 | v2.0.0 | 利点 |
|------|--------|--------|------|
| 探索 | 5つのノート探索 | 15ノート（3セット×5）探索 | 選択肢3倍 |
| 承認 | 単発承認 | セット単位承認 | 一貫性向上 |
| 切り替え | ノート単位 | セット単位 | 音楽的まとまり |

---

### 3. UI表示の変更

#### v1.0.0 ステータスバー
```
[Ghost候補: 1/3]  [フレーズ候補: 2/5]
```

#### v2.0.0 ステータスバー
```
[Ghost候補: 1/3]  [フレーズセット: 2/3 (承認: 3/5)]
```

**表示情報の増加**:
- セット番号（2/3）
- 承認進捗（3/5）
- 合計情報量: 2項目 → 3項目

**レスポンシブ対応**:
- デスクトップ: 全項目表示
- タブレット: 省略表示「セット: 2/3 (3/5)」
- スマホ: アイコン表示「🎵 2/3」

---

### 4. 生成ロジックの変更

#### v1.0.0 生成
```javascript
// 単一フレーズ生成（200ms）
async predictNextPhrase(currentNotes, numNotes = 5) {
  return await this.musicRnn.continueSequence(
    currentNotes, numNotes, temperature: 1.0
  )
}
```

#### v2.0.0 生成（Phase 1: 順次）
```javascript
// 3フレーズセット生成（600ms = 200ms×3）
async generatePhraseSets(currentNotes) {
  const phraseSets = []
  for (let i = 0; i < 3; i++) {
    const temp = 0.8 + (i * 0.2)  // 0.8, 1.0, 1.2
    const phrase = await this.musicRnn.continueSequence(
      currentNotes, 5, temperature: temp
    )
    phraseSets.push(phrase)
  }
  return phraseSets
}
```

#### v2.0.0 生成（Phase 2: 並列）
```javascript
// 並列生成（250ms）
async generatePhraseSetsParallel(currentNotes) {
  const promises = [0, 1, 2].map(i => {
    const temp = 0.8 + (i * 0.2)
    return this.musicRnn.continueSequence(
      currentNotes, 5, temperature: temp
    )
  })
  return await Promise.all(promises)
}
```

**パフォーマンス比較**:
| 実装 | 生成時間 | 手法 | 達成Phase |
|------|---------|------|-----------|
| v1.0.0 | 200ms | 単一生成 | N/A |
| v2.0.0 Phase 1 | 600ms | 順次生成 | Phase 1 |
| v2.0.0 Phase 2 | 250ms | 並列生成 | Phase 2 |
| v2.0.0 Phase 4 | 100ms | キャッシュ活用 | Phase 4 |

---

## 実装チェックリスト

詳細は `IMPLEMENTATION_CHECKLIST_GhostText_v2.md` を参照してください。

### Phase 1: 基盤整備（週1）
- [ ] データマイグレーション実装
- [ ] 新データ構造導入
- [ ] Getterメソッド実装
- [ ] 単体テスト10件作成

### Phase 2: コア機能実装（週2）
- [ ] フレーズセット生成ロジック
- [ ] セット切り替え関数
- [ ] 音楽理論制約
- [ ] 統合テスト15件作成

### Phase 3: UI統合（週3）
- [ ] キーボードハンドラー更新
- [ ] ステータスバー表示更新
- [ ] Canvas描画更新（オプション）
- [ ] E2Eテスト5件作成

### Phase 4: 最適化・ドキュメント（週4）
- [ ] 並列生成実装
- [ ] キャッシュ機能
- [ ] ユーザーガイド作成
- [ ] 最終品質確認

**合計**: 48タスク、4週間計画

---

## テスト仕様

### 単体テスト（10件）
**ファイル**: `ghostText/migration.test.js`

1. v1.0.0 → v2.0.0 データマイグレーションテスト
2. 空データのマイグレーションテスト
3. 複数トラックのマイグレーションテスト
4. バージョン検出テスト
5. `getCurrentPhraseSet()` 正常系テスト
6. `getCurrentNote()` 境界値テスト
7. `getNextNote()` null処理テスト
8. v2.0.0 → v1.0.0 ロールバックテスト
9. データ損失なしテスト
10. LocalStorage互換性テスト

### 統合テスト（15件）
**ファイル**: `ghostText/phraseSetGeneration.test.js`

1. 3フレーズセット生成テスト
2. 各セット5ノートテスト
3. 多様性確保テスト（セット間で音程が異なる）
4. 生成時間600ms以下テスト
5. 次セット切り替えテスト（0→1→2→0）
6. 前セット切り替えテスト（0→2→1→0）
7. currentNoteIndexリセットテスト
8. スケール制約適用テスト
9. 調和度スコア計算テスト
10. 多様性スコア計算テスト
11. 生成→切り替え→承認フローテスト
12. エラーハンドリングテスト
13. 境界値テスト
14. 温度パラメータ計算テスト
15. 音楽理論スコアリングテスト

### E2Eテスト（5件）
**ファイル**: `.playwright-mcp/tests/ghostText-phraseSets.spec.js`

1. Ghost Text有効化 → フレーズセット生成テスト
2. セット切り替えテスト（↑/↓キー操作）
3. ノート承認テスト（Tab 5回承認フロー）
4. ステータスバー表示確認テスト
5. エラーケーステスト（未生成時の↑/↓キー）

**E2E証拠**:
- スクリーンショット5枚以上
- 各テストケースの動作確認画像

---

## リスク評価

### 🔴 クリティカルリスク（発生時にリリース延期）

#### R1: データ損失リスク
**内容**: v1.0.0プロジェクトのマイグレーション失敗によるデータ損失

**対策**:
- `_legacy_*` フィールドでの旧データ保持
- ロールバック機能実装
- マイグレーション前の自動バックアップ

**検証方法**:
- 単体テスト: データ損失なしテスト
- E2Eテスト: v1.0.0プロジェクト読み込みテスト
- 手動確認: 実プロジェクトでのマイグレーションテスト

**リスク低減度**: 🟢 High（対策により十分軽減）

---

#### R2: パフォーマンス劣化リスク
**内容**: 600ms目標未達によるユーザー体験悪化

**対策**:
- Phase 1: 順次生成（600ms目標）
- Phase 2: 並列生成（250ms目標）
- Phase 4: キャッシュ活用（100ms目標）
- パフォーマンスモニタリング・アラート

**検証方法**:
- 統合テスト: 生成時間測定テスト
- E2Eテスト: 実機でのパフォーマンス測定

**リスク低減度**: 🟡 Medium（並列化で大幅改善見込み）

---

### 🟡 重要リスク（監視必要）

#### R3: UI/UX混乱リスク
**内容**: ↑/↓キー動作変更によるユーザー混乱

**対策**:
- ステータスバーでの明確な情報表示
- ユーザーガイド作成（図解・動画）
- オンボーディングツールチップ（オプション）

**検証方法**:
- E2Eテスト: ユーザーフロー確認
- ユーザビリティテスト（推奨）

**リスク低減度**: 🟡 Medium（ガイド充実で軽減）

---

#### R4: 後方互換性問題リスク
**内容**: v1.0.0ユーザーの移行トラブル

**対策**:
- 自動マイグレーション実装
- ロールバック機能
- v1.0.0との共存期間（1-2バージョン）

**検証方法**:
- 単体テスト: マイグレーションテスト
- E2Eテスト: v1.0.0 → v2.0.0 移行テスト

**リスク低減度**: 🟢 High（マイグレーション機能で十分対応）

---

### 🟢 軽微リスク（低影響）

#### R5: メモリ使用量増加リスク
**内容**: 3セット保持による メモリ3倍増加

**影響分析**:
- v1.0.0: 160 bytes/トラック
- v2.0.0: 480 bytes/トラック
- 100トラックで48KB（許容範囲内）

**対策**:
- メモリ使用量監視
- 不要セットの自動破棄
- LRUキャッシュ（最大10エントリ）

**リスク低減度**: 🟢 High（メモリ影響は微小）

---

## 📝 開発者向けクイックスタート

### 1. 仕様書読み込み順序
```
1. CHANGES_SUMMARY_GhostText_v2.md（本ファイル） - 全体像把握
2. L3_ghost_text_candidate_selection.md - UI・操作仕様
3. L3_ghost_text_phrase_sets.md - 生成ロジック詳細
4. IMPLEMENTATION_CHECKLIST_GhostText_v2.md - 実装タスク
```

### 2. 最初に実装すべき機能（Phase 1）
```
1. projectManager.js: migrateGhostTextData()
2. useGhostText.js: 新データ構造導入
3. 単体テスト: マイグレーションテスト
```

### 3. デバッグログキーワード
```
[GHOST_TEXT_MIGRATION] - データマイグレーション
[PHRASE_SET_GEN_START] - フレーズセット生成開始
[PHRASE_SET_TEMP] - 温度パラメータ計算
[PHRASE_SET_NEXT] - セット切り替え（次）
[PHRASE_SET_PREV] - セット切り替え（前）
[PERF_WARNING] - パフォーマンス警告
[PERF_CRITICAL] - パフォーマンス重大警告
```

### 4. テスト実行コマンド
```bash
# 単体テスト
npm run test -- ghostText/migration.test.js

# 統合テスト
npm run test -- ghostText/phraseSetGeneration.test.js

# E2Eテスト
npx playwright test ghostText-phraseSets.spec.js
```

---

## 🎯 リリース判定チェックリスト

### 必須項目（すべて✅必須）
- [ ] Phase 1-4のすべてのタスク完了
- [ ] 単体テスト10件 + 統合テスト15件 + E2Eテスト5件すべてパス
- [ ] パフォーマンス目標達成（Phase 1: 600ms、Phase 2: 250ms）
- [ ] v1.0.0プロジェクトの正常マイグレーション確認
- [ ] データ損失リスク評価「低」
- [ ] コードレビュー承認
- [ ] ユーザーガイド完成

### 推奨項目（可能な限り達成）
- [ ] TypeScript型定義導入
- [ ] Canvas描画更新（セットハイライト）
- [ ] Web Worker並列生成
- [ ] 動画チュートリアル作成

### リリースブロッカー（1つでも該当→延期）
- [ ] E2Eテストでクリティカルバグ検出
- [ ] パフォーマンス600ms超過（Phase 1基準）
- [ ] v1.0.0データのマイグレーション失敗
- [ ] データ損失リスク検出

---

**変更サマリー作成日**: 2025-11-10
**想定リリース日**: 2025-12-08（4週間後）
**ドキュメントバージョン**: 1.0.0

このサマリーを参照して、Ghost Text v2.0.0の変更内容を正確に理解し、段階的に実装を進めてください。
