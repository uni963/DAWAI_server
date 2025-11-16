# フレーズ多様性デバッグガイド

## 📋 概要

Issue #153で実装されたフレーズ予測多様性機能のデバッグ方法を説明します。

## 🔍 実装内容

### 1. デバッグログの追加

`EnhancedMidiEditor.jsx` に詳細なデバッグログを追加しました。

#### ログの種類

| ログプレフィックス | 説明 |
|------------------|------|
| `[DIVERSITY_DEBUG]` | 多様性機能の実行フロー |
| `[WEIGHTED_RANDOM]` | 確率的選択のプロセス |
| `[DIVERSITY_STATS]` | 10回ごとの統計レポート |
| `[DIVERSITY_WARNING]` | 高い繰り返し率の警告 |

### 2. ログの読み方

#### A. 関数呼び出しログ

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎲 [DIVERSITY_DEBUG] acceptNextGhostNote called
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**意味**: Tab キーが押されて、多様性機能が起動しました。

#### B. 利用可能性チェック

```
🔍 [DIVERSITY_DEBUG] Availability check: {
  hasPhraseNotes: true,
  hasGhostPredictions: true,
  phraseNotesLength: 8,
  nextPhraseIndex: 2,
  ghostPredictionsLength: 5,
  nextGhostIndex: 1
}
```

**確認ポイント**:
- `hasPhraseNotes`: フレーズ予測が利用可能か
- `hasGhostPredictions`: Ghost予測が利用可能か
- **両方がfalseの場合**: 予測が生成されていない → 予測エンジンの問題
- **片方のみtrueの場合**: 確率的選択はスキップされる

#### C. 現在のメトリクス

```
📊 [DIVERSITY_DEBUG] Current metrics: {
  phraseCount: 5,
  ghostCount: 3,
  consecutivePhraseCount: 2,
  consecutiveGhostCount: 0,
  lastSource: 'phrase'
}
```

**確認ポイント**:
- `phraseCount` / `ghostCount`: 累積使用回数
- `consecutivePhraseCount`: フレーズ連続使用回数（3以上で確率調整）
- `consecutiveGhostCount`: Ghost連続使用回数（3以上で確率調整）

#### D. 確率的選択プロセス

```
🎲 [WEIGHTED_RANDOM] Selection process: {
  totalWeight: 1,
  randomValue: 0.4523,
  randomWeighted: 0.4523,
  items: [ { type: 'phrase', weight: 0.6 }, { type: 'ghost', weight: 0.4 } ]
}
🎲 [WEIGHTED_RANDOM] Checking phrase: random=-0.1477 (✅ SELECTED)
🎲 [WEIGHTED_RANDOM] Final selection: phrase
```

**確認ポイント**:
- `randomValue`: 生成された乱数（0.0～1.0）
- `totalWeight`: 総重量（通常1.0）
- **選択プロセス**: 各アイテムのチェック結果
- **✅ SELECTED**: 選択されたアイテム

#### E. 選択結果

```
🎲 [DIVERSITY_DEBUG] Probabilistic selection result:
   Selected: phrase
   Weights: phrase=0.6, ghost=0.4
```

**確認ポイント**:
- `Selected`: 最終的に選択されたタイプ
- `Weights`: 使用された確率（基本: 60%/40%、動的調整: 30%/70% or 70%/30%）

#### F. 実行結果

```
🎯 [DIVERSITY_DEBUG] Accepting next phrase note
📋 [DIVERSITY_DEBUG] acceptNextPhraseNote result: {
  success: true,
  message: 'Phrase note approved',
  metrics: { ... }
}
✅ [DIVERSITY_DEBUG] Phrase note accepted successfully
```

**確認ポイント**:
- `success: true`: 承認成功
- `success: false`: 承認失敗 → `message` で理由を確認

#### G. メトリクス更新

```
📊 [DIVERSITY_DEBUG] Updated metrics after phrase: {
  phraseCount: 6,
  consecutivePhraseCount: 3,
  consecutiveGhostCount: 0
}
```

**確認ポイント**:
- カウントが正しく増加しているか
- 連続カウントが正しくリセットされているか

#### H. 統計レポート（10回ごと）

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 [DIVERSITY_STATS] 10回ごとの統計レポート:
   Phrase: 60.0% (6回)
   Ghost: 40.0% (4回)
   Total: 10回
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**確認ポイント**:
- 期待値: Phrase 60% / Ghost 40% に近いか
- 動的調整により、実際の比率は変動します

#### I. 多様性警告

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ [DIVERSITY_WARNING] 高い繰り返し率を検出:
   繰り返し率: 25.0%
   連続Phrase: 5回
   連続Ghost: 0回
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**確認ポイント**:
- 繰り返し率が20%を超えると警告
- この場合、次回から確率が動的調整されます

## 🧪 Dry Runテスト

### 方法1: HTMLファイル

```bash
# ブラウザで直接開く
cd DAWAI_server/frontend
open diversity-test-dry-run.html  # macOS
```

**操作**:
1. ブラウザでHTMLファイルを開く
2. テストボタン（10回/50回/100回）をクリック
3. リアルタイム統計とログを確認

### 方法2: Node.jsスクリプト

```bash
cd DAWAI_server/frontend
node diversity-test.js
```

**期待される出力**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎲 多様性機能 Dry Run テスト開始
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10回目: Phrase 60.0% (6), Ghost 40.0% (4)
  連続: Phrase=1, Ghost=0
20回目: Phrase 55.0% (11), Ghost 45.0% (9)
  連続: Phrase=0, Ghost=1
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 最終統計レポート
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
総実行回数: 100回
Phrase選択: 58回 (58.0%)
Ghost選択: 42回 (42.0%)

期待値: Phrase 60% / Ghost 40% (動的調整あり)

多様性スコア: 42.0% (高いほど良い、最大50%)
✅ 多様性テスト PASS: 十分な多様性が確保されています
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🔍 問題のデバッグ

### 症状1: 多様性機能が動作していない

**確認手順**:
1. コンソールで `[DIVERSITY_DEBUG]` ログが出力されているか確認
2. 出力されていない場合:
   - Tab キーイベントが正しく処理されているか
   - `acceptNextGhostNote` 関数が呼び出されているか

### 症状2: 常に同じタイプが選択される

**確認手順**:
1. `Availability check` ログを確認
   - 両方が `true` になっているか？
   - 片方のみ `true` の場合、確率的選択はスキップされます
2. `Current metrics` を確認
   - 連続カウントが正しく更新されているか

### 症状3: 確率が期待値と大きく異なる

**確認手順**:
1. サンプル数を増やす（100回以上）
2. 動的調整が頻繁に発動していないか確認
3. `[WEIGHTED_RANDOM]` ログで乱数生成を確認

## 📊 成功基準

| 指標 | 目標 | 確認方法 |
|------|------|---------|
| 多様性スコア | > 35% | 10回ごとの統計レポート |
| 繰り返し率 | < 20% | 警告ログの有無 |
| Phrase比率 | 55-65% | 最終統計レポート |
| Ghost比率 | 35-45% | 最終統計レポート |

## 🚀 次のステップ

1. **ローカルE2Eテスト**: 実際のアプリケーションでTab連打テスト
2. **コンソールログ確認**: 上記のログパターンが正しく出力されるか確認
3. **統計レポート収集**: 100回承認での多様性メトリクスを記録
4. **問題報告**: 期待値と異なる場合、ログをコピーして報告

## 📝 追加情報

- **ログの保存**: ブラウザコンソールの「Save as...」機能でログをファイルに保存
- **フィルタリング**: コンソールで `DIVERSITY` で検索すると関連ログのみ表示
- **パフォーマンス**: ログ出力は開発モードのみ。本番では削除推奨
