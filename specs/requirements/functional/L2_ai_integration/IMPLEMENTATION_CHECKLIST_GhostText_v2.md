# Ghost Text v2.0.0 実装チェックリスト

**対象バージョン**: v2.0.0 (フレーズセット切り替え機能)
**実装期間**: 4週間（Phase 1-4）
**最終更新**: 2025-11-10

## 📊 全体進捗

| Phase | 内容 | 期間 | 状態 |
|-------|------|------|------|
| Phase 1 | 基盤整備 | 週1 | ⬜ 未着手 |
| Phase 2 | コア機能実装 | 週2 | ⬜ 未着手 |
| Phase 3 | UI統合 | 週3 | ⬜ 未着手 |
| Phase 4 | 最適化・ドキュメント | 週4 | ⬜ 未着手 |

**全体進捗**: 0% (0/48タスク完了)

---

## Phase 1: 基盤整備（週1）

**目標**: データ構造変更・後方互換性確保

### 1.1 データ構造設計
- [ ] 新データ構造定義書作成
  - `phraseSets: Array<Array<Note>>`
  - `selectedPhraseSetIndex: number`
  - `currentNoteIndex: number`
- [ ] 旧データ構造との対応表作成
  - `phraseNotes` → `phraseSets[0]`
  - `nextPhraseIndex` → `currentNoteIndex`
- [ ] TypeScript型定義追加（推奨）

**成果物**: データ構造定義書、型定義ファイル

### 1.2 データマイグレーション実装
**ファイル**: `DAWAI_server/frontend/src/utils/projectManager.js`

- [ ] `migrateGhostTextData(projectData)` 関数実装
  - [ ] バージョン検出ロジック (`ghostTextVersion` フィールド)
  - [ ] v1.0.0 → v2.0.0 変換ロジック
  - [ ] 旧データ保持（`_legacy_*` フィールド）
  - [ ] ログ出力（`[GHOST_TEXT_MIGRATION]`）

- [ ] `migrateV1toV2(projectData)` 関数実装
  - [ ] `phraseNotes` → `phraseSets[0]` 変換
  - [ ] `nextPhraseIndex` → `currentNoteIndex` 変換
  - [ ] 空セット初期化（`phraseSets[1]`, `phraseSets[2]`）
  - [ ] バージョン更新（`ghostTextVersion: '2.0.0'`）

- [ ] `rollbackV2toV1(projectData)` 関数実装（緊急時用）
  - [ ] `_legacy_*` フィールドからの復元
  - [ ] v2.0.0フィールド削除
  - [ ] バージョンダウングレード

**成果物**: マイグレーション関数群、ロールバック機能

### 1.3 useGhostText.js データ構造更新
**ファイル**: `DAWAI_server/frontend/src/hooks/useGhostText.js`

- [ ] 新ステート追加
  ```javascript
  const [phraseSets, setPhraseSets] = useState([])
  const [selectedPhraseSetIndex, setSelectedPhraseSetIndex] = useState(0)
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0)
  ```

- [ ] Getterメソッド実装
  - [ ] `getCurrentPhraseSet()` - 選択中のセットを取得
  - [ ] `getCurrentNote()` - 選択中セット内の現在ノートを取得
  - [ ] `getNextNote()` - 次に承認するノートを取得

- [ ] 旧ステート保持（後方互換性）
  - [ ] `phraseNotes` - 非推奨マーク付与
  - [ ] `nextPhraseIndex` - 非推奨マーク付与

**成果物**: 更新されたuseGhostText.js、Getterメソッド群

### 1.4 単体テスト作成
**ファイル**: `DAWAI_server/frontend/src/__tests__/ghostText/migration.test.js`

- [ ] データマイグレーションテスト
  - [ ] v1.0.0 → v2.0.0 変換テスト
  - [ ] 空データのマイグレーションテスト
  - [ ] 複数トラックのマイグレーションテスト
  - [ ] バージョン検出テスト

- [ ] Getterメソッドテスト
  - [ ] `getCurrentPhraseSet()` 正常系テスト
  - [ ] `getCurrentNote()` 境界値テスト
  - [ ] `getNextNote()` null処理テスト

- [ ] ロールバックテスト
  - [ ] v2.0.0 → v1.0.0 変換テスト
  - [ ] データ損失なしテスト

**成果物**: Jest単体テスト10件

**Phase 1完了基準**:
- [x] すべてのチェックボックスが完了
- [x] 単体テスト10件すべてがパス
- [x] コードレビュー承認
- [x] ドキュメント更新完了

---

## Phase 2: コア機能実装（週2）

**目標**: フレーズセット生成・切り替えロジック

### 2.1 フレーズセット生成ロジック実装
**ファイル**: `DAWAI_server/frontend/src/utils/magentaGhostTextEngine.js`

- [ ] `generatePhraseSets()` メソッド実装
  - [ ] パラメータ設定（`phraseSetCount=3`, `notesPerPhrase=5`）
  - [ ] 順次生成ロジック（Phase 1実装）
  - [ ] 温度パラメータ計算 (`calculateTemperature()`)
  - [ ] パフォーマンスログ（生成時間測定）

- [ ] `calculateTemperature(setIndex)` メソッド実装
  - [ ] 温度範囲設定（0.8-1.2）
  - [ ] インデックスベース温度計算
  - [ ] ログ出力（`[PHRASE_SET_TEMP]`）

- [ ] `generateSinglePhrase()` メソッド実装
  - [ ] MusicRNN呼び出し
  - [ ] スケール制約適用
  - [ ] 非和声音フィルタリング
  - [ ] ログ出力（`[PHRASE_GEN_SET0-2]`）

- [ ] パフォーマンス監視
  - [ ] 600ms超過時の警告ログ
  - [ ] 生成時間統計出力
  - [ ] 並列生成推奨フラグ

**成果物**: フレーズセット生成機能、パフォーマンス監視

### 2.2 音楽理論制約実装
**ファイル**: `DAWAI_server/frontend/src/utils/magentaGhostTextEngine.js`

- [ ] `applyScaleConstraint()` メソッド実装
  - [ ] スケール内音程判定
  - [ ] 最近隣スケール音への調整
  - [ ] ログ出力（`[SCALE_ADJUST]`）

- [ ] `calculateMusicTheoryScore()` メソッド実装
  - [ ] 調和度スコア計算 (`calculateHarmonyScore()`)
  - [ ] 多様性スコア計算 (`calculateDiversityScore()`)
  - [ ] リズムスコア計算 (`calculateRhythmScore()`)
  - [ ] 総合スコア算出（重み付け平均）

- [ ] スコア閾値設定
  - [ ] 最小調和度スコア（0.6以上）
  - [ ] 最小多様性スコア（0.4以上）
  - [ ] 低スコアセットの再生成ロジック

**成果物**: 音楽理論制約機能、スコアリングシステム

### 2.3 セット切り替え関数実装
**ファイル**: `DAWAI_server/frontend/src/hooks/useGhostText.js`

- [ ] `selectNextPhraseSet()` 関数実装
  - [ ] インデックス境界チェック
  - [ ] 循環ナビゲーション（2→0）
  - [ ] `currentNoteIndex` リセット
  - [ ] ログ出力（`[PHRASE_SET_NEXT]`）

- [ ] `selectPrevPhraseSet()` 関数実装
  - [ ] インデックス境界チェック
  - [ ] 逆方向循環ナビゲーション（0→2）
  - [ ] `currentNoteIndex` リセット
  - [ ] ログ出力（`[PHRASE_SET_PREV]`）

- [ ] イベント定義
  - [ ] `phrase-sets-generated` イベント発行
  - [ ] `phrase-set-changed` イベント発行
  - [ ] イベントペイロード設計

**成果物**: セット切り替え関数群、カスタムイベント

### 2.4 統合テスト作成
**ファイル**: `DAWAI_server/frontend/src/__tests__/ghostText/phraseSetGeneration.test.js`

- [ ] フレーズセット生成テスト
  - [ ] 3セット生成テスト
  - [ ] 各セット5ノートテスト
  - [ ] 多様性確保テスト（セット間で音程が異なる）
  - [ ] 生成時間600ms以下テスト

- [ ] セット切り替えテスト
  - [ ] 次セット切り替えテスト（0→1→2→0）
  - [ ] 前セット切り替えテスト（0→2→1→0）
  - [ ] currentNoteIndexリセットテスト

- [ ] 音楽理論制約テスト
  - [ ] スケール制約適用テスト
  - [ ] 調和度スコア計算テスト
  - [ ] 多様性スコア計算テスト

- [ ] 統合フローテスト
  - [ ] 生成→切り替え→承認フロー
  - [ ] エラーハンドリングテスト
  - [ ] 境界値テスト

**成果物**: Jest統合テスト15件

**Phase 2完了基準**:
- [x] すべてのチェックボックスが完了
- [x] 統合テスト15件すべてがパス
- [x] フレーズセット生成が600ms以下
- [x] コードレビュー承認

---

## Phase 3: UI統合（週3）

**目標**: ユーザーインターフェース更新

### 3.1 キーボードハンドラー更新
**ファイル**: `DAWAI_server/frontend/src/components/EnhancedMidiEditor.jsx`

- [ ] ↑/↓キー処理修正
  - [ ] フレーズセット存在確認
  - [ ] `selectPrevPhraseSet()` / `selectNextPhraseSet()` 呼び出し
  - [ ] フォールバック処理（旧動作維持）
  - [ ] ログ出力（`[KEYBOARD_PHRASE_SET]`）

- [ ] 入力フィールドフォーカス時のスキップ
  - [ ] INPUT/TEXTAREA判定
  - [ ] イベント伝播停止

- [ ] イベントリスナー再設定
  - [ ] フレーズセット変更時のリスナー更新
  - [ ] メモリリーク防止

**成果物**: 更新されたキーボードハンドラー

### 3.2 ステータスバー表示更新
**ファイル**: `DAWAI_server/frontend/src/components/MIDIEditor/MidiEditorStatusBar.jsx`

- [ ] フレーズセットインジケーター実装
  - [ ] セット番号表示（`selectedPhraseSetIndex + 1`）
  - [ ] セット総数表示（`phraseSets.length`）
  - [ ] 承認進捗表示（`currentNoteIndex / 5`）
  - [ ] 条件付きレンダリング（`phraseSets.length > 0`）

- [ ] UI表示フォーマット
  ```javascript
  フレーズセット: {selectedPhraseSetIndex + 1}/{phraseSets.length}
  (承認: {currentNoteIndex}/5)
  ```

- [ ] バッジスタイル
  - [ ] 緑色バッジ（`bg-green-800`）
  - [ ] 小サイズテキスト（`text-xs`）
  - [ ] Tailwind CSSクラス適用

**成果物**: 更新されたステータスバー

### 3.3 Canvas描画更新（オプション）
**ファイル**: `DAWAI_server/frontend/src/components/MIDIEditor/MidiEditorCanvas.jsx`

- [ ] 選択中セットのハイライト表示
  - [ ] 選択中セットの色分け（緑系）
  - [ ] 未選択セットの薄表示（グレー系）
  - [ ] アニメーション効果（オプション）

- [ ] セット切り替え時のビジュアルフィードバック
  - [ ] フェードイン/アウト効果
  - [ ] スライドアニメーション

**成果物**: 更新されたCanvas描画（オプション実装）

### 3.4 E2Eテスト作成
**ファイル**: `DAWAI_server/.playwright-mcp/tests/ghostText-phraseSets.spec.js`

- [ ] 基本操作フローテスト
  - [ ] Ghost Text有効化
  - [ ] MIDIノート追加（フレーズセット生成トリガー）
  - [ ] ステータスバー表示確認（「フレーズセット: 1/3」）
  - [ ] スクリーンショット取得

- [ ] セット切り替えテスト
  - [ ] ↓キー押下 → セット2表示確認
  - [ ] ↓キー押下 → セット3表示確認
  - [ ] ↓キー押下 → セット1表示確認（循環）
  - [ ] スクリーンショット取得

- [ ] ノート承認テスト
  - [ ] Tabキー押下 → 承認進捗「1/5」確認
  - [ ] 5回Tabキー → セット完了確認
  - [ ] スクリーンショット取得

- [ ] エラーケーステスト
  - [ ] フレーズセット未生成時の↑/↓キー
  - [ ] コンソールエラー確認（なし）

**成果物**: Playwright E2Eテスト5件、スクリーンショット証拠

**Phase 3完了基準**:
- [x] すべてのチェックボックスが完了
- [x] E2Eテスト5件すべてがパス
- [x] スクリーンショット証拠取得完了
- [x] UIレビュー承認

---

## Phase 4: 最適化・ドキュメント（週4）

**目標**: パフォーマンス最適化・ユーザーガイド

### 4.1 並列生成実装（パフォーマンス最適化）
**ファイル**: `DAWAI_server/frontend/src/utils/magentaGhostTextEngine.js`

- [ ] `generatePhraseSetsParallel()` メソッド実装
  - [ ] Promise.all による並列生成
  - [ ] Web Worker活用（オプション）
  - [ ] エラーハンドリング（部分失敗対応）

- [ ] 並列生成フラグ追加
  ```javascript
  this.parallelGeneration = true  // Phase 4で有効化
  ```

- [ ] パフォーマンス測定
  - [ ] 並列生成前後の時間比較
  - [ ] 目標250ms以下達成確認
  - [ ] ログ出力（`[PARALLEL_GEN_TIME]`）

**成果物**: 並列生成機能、パフォーマンス改善（600ms→250ms）

### 4.2 キャッシュ機能実装
**ファイル**: `DAWAI_server/frontend/src/utils/magentaGhostTextEngine.js`

- [ ] フレーズセットキャッシュ
  - [ ] 入力ノート配列をキーとしたキャッシュ
  - [ ] LRUキャッシュ実装（最大10エントリ）
  - [ ] キャッシュヒット時のログ出力

- [ ] キャッシュ無効化
  - [ ] スケール変更時のキャッシュクリア
  - [ ] ユーザー設定変更時のキャッシュクリア

**成果物**: キャッシュ機能、応答時間改善（250ms→100ms）

### 4.3 ユーザーガイド作成
**ファイル**: `DAWAI_server/docs/user_guide/ghost_text_phrase_sets.md`

- [ ] 機能概要説明
  - [ ] フレーズセット切り替え機能とは
  - [ ] 利用シーン・メリット
  - [ ] 図解・スクリーンショット

- [ ] 操作方法説明
  - [ ] キーボードショートカット一覧
  - [ ] ステップバイステップガイド
  - [ ] 動画チュートリアル（オプション）

- [ ] トラブルシューティング
  - [ ] よくある問題と解決方法
  - [ ] パフォーマンス問題の対処法

**成果物**: ユーザーガイド（図解・動画付き）

### 4.4 最終品質確認
**ファイル**: 全体

- [ ] コード品質チェック
  - [ ] ESLint警告0件
  - [ ] TypeScript型エラー0件（導入時）
  - [ ] コードレビュー承認

- [ ] テストカバレッジ確認
  - [ ] 単体テスト: 80%以上
  - [ ] 統合テスト: 70%以上
  - [ ] E2Eテスト: 主要フロー100%

- [ ] パフォーマンス確認
  - [ ] フレーズ生成時間: 250ms以下
  - [ ] メモリ使用量: 1KB/トラック以下
  - [ ] FPS影響: 5fps以下

- [ ] 後方互換性確認
  - [ ] v1.0.0プロジェクト読み込みテスト
  - [ ] マイグレーション正常動作確認
  - [ ] ロールバック動作確認

**成果物**: 最終品質レポート、リリースノート

**Phase 4完了基準**:
- [x] すべてのチェックボックスが完了
- [x] テストカバレッジ目標達成
- [x] パフォーマンス目標達成（250ms以下）
- [x] ユーザーガイド完成
- [x] リリース承認

---

## 🎯 リリース判定基準

### 必須項目（すべて達成必須）
- [ ] Phase 1-4すべてのタスク完了
- [ ] 単体テスト10件 + 統合テスト15件 + E2Eテスト5件すべてパス
- [ ] パフォーマンス目標達成（250ms以下）
- [ ] 後方互換性確認完了（v1.0.0データ読み込み可能）
- [ ] コードレビュー承認
- [ ] ユーザーガイド完成

### 推奨項目（可能な限り達成）
- [ ] TypeScript型定義導入
- [ ] Canvas描画更新（セットハイライト）
- [ ] Web Worker活用
- [ ] 動画チュートリアル作成

### リリースブロッカー（1つでも該当すると延期）
- [ ] E2Eテストでクリティカルバグ検出
- [ ] パフォーマンス600ms超過（Phase 1基準）
- [ ] データ損失リスクあり
- [ ] v1.0.0との互換性なし

---

## 📊 進捗レポートテンプレート

### 週次レポート
```markdown
## Ghost Text v2.0.0 週次進捗レポート

**週**: Phase X 週Y
**報告日**: YYYY-MM-DD

### 完了タスク
- [x] タスク1
- [x] タスク2

### 進行中タスク
- [ ] タスク3 (50%完了)

### ブロッカー・課題
- 課題1: 説明と対応方針

### 次週予定
- タスク4
- タスク5

### メトリクス
- テスト通過率: XX%
- コードカバレッジ: XX%
- パフォーマンス: XXXms
```

---

**チェックリスト作成日**: 2025-11-10
**想定完了日**: 2025-12-08（4週間後）
**担当**: 開発チーム

このチェックリストを使用して、段階的かつ確実にGhost Text v2.0.0を実装してください。
