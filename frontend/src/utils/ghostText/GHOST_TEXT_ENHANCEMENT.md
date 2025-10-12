# Ghost Text補完機能の強化 - 実装ドキュメント

## 📋 概要

このドキュメントは、Issue #31で実装された**Ghost Text補完機能の強化**の詳細な実装内容を記録しています。

**実装日**: 2025-10-11
**担当**: Claude Code
**関連Issue**: #31

## 🎯 実装目標

初心者向けに音楽制作の喜びを感じてもらうため、以下の機能を実装：

1. **トラックタイプ別の補完**: メロディトラック vs リズムトラック
2. **ジャンル固有の音楽理論**: 拍子感、スイング、シンコペーション
3. **和声的整合性**: コード進行とスケール制約の統合
4. **リズムパターン提案**: ドラムトラック専用の提案ロジック

## 🏗️ アーキテクチャ

### システム構成

```
Frontend                          Backend
┌─────────────────────────┐      ┌──────────────────────────┐
│ GhostTextInputContext   │      │ FastAPI                  │
│ - ジャンル設定          │      │ /ai/predict endpoint     │
│ - スケール情報          │      │                          │
│ - コード情報            │      │ - トラックタイプ判定     │
└──────────┬──────────────┘      │ - リズム定義管理         │
           │                      │ - 提案生成ロジック       │
           v                      └──────────┬───────────────┘
┌─────────────────────────┐                 │
│ GhostTextEngineClient   │◄────────────────┘
│ - API通信               │      JSON Response:
│ - キャッシュ管理        │      {
└──────────┬──────────────┘        "suggestions": [
           │                          {"midi_note": 60,
           v                           "confidence": 0.95,
┌─────────────────────────┐            "reasoning_tag": "..."}
│ GhostTextSystem         │          ]
│ - 統合管理              │        }
└─────────────────────────┘
```

## 📦 実装ファイル

### 1. バックエンド

#### `/ai/predict` エンドポイント
**ファイル**: `DAWAI_server/backend/ai_agent/main.py:1220-1389`

```python
@app.post("/ai/predict")
async def ghost_text_predict(request: GhostTextPredictRequest):
    """
    Ghost Text補完機能：トラックタイプ別の音符提案
    ジャンル固有の音楽理論とリズム定義に基づいた補完を提供
    """
```

**主な機能**:
- リズム定義の管理（ジャンル別）
- 現在の拍位置の計算
- トラックタイプ別の提案生成
- 確信度スコアリング

**リクエストモデル**:
```python
class GhostTextPredictRequest(BaseModel):
    track_summary: Optional[str] = ""
    current_notes: List[Dict[str, Any]]
    cursor_position: float
    track_type: str = "melody"
    key_signature: str = "C"
    time_signature: str = "4/4"
    tempo: int = 120
    genre: Optional[str] = "Lo-Fi Hip Hop"
    scale_notes_midi: Optional[List[int]] = None
    current_chord: Optional[Dict[str, Any]] = None
```

### 2. フロントエンド

#### MusicTheorySystem.js
**ファイル**: `DAWAI_server/frontend/src/utils/musicTheory/MusicTheorySystem.js`

**変更内容**:
- 全ジャンルに`rhythmDefinition`を追加
- 新ジャンル「Lo-Fi Hip Hop」を追加

```javascript
rhythmDefinition: {
  time_signature: "4/4",
  strong_beats: [1, 3],      // 強拍
  weak_beats: [2, 4],        // 弱拍
  off_beats_priority: [2, 4], // 裏拍優先度
  swing_ratio: 0.15,         // スイング比率
  drum_pattern_hint: "Kick on 1 & 3. Snare on 2 & 4 (Backbeat)."
}
```

#### GhostTextEngineClient.js
**ファイル**: `DAWAI_server/frontend/src/utils/ghostText/GhostTextEngineClient.js`

**変更内容**:
- リクエストボディに追加フィールド:
  - `genre`: ジャンル情報
  - `scale_notes_midi`: スケール音程配列
  - `current_chord`: 現在のコード情報

#### GhostTextInputContext.js
**ファイル**: `DAWAI_server/frontend/src/utils/ghostText/GhostTextInputContext.js`

**変更内容**:
- 新規プロパティ追加:
  - `genre`: ジャンル（デフォルト: "Lo-Fi Hip Hop"）
  - `scaleNotesMidi`: スケール音程配列
  - `currentChord`: 現在のコード情報
- 新規メソッド:
  - `setGenre(genre)`
  - `setScaleNotesMidi(scaleNotes)`
  - `setCurrentChord(chord)`

## 🎼 提案ロジック詳細

### メロディトラック提案

#### 1. 強拍（1拍目、3拍目）
- **コード構成音**: 確信度 **0.95**
  ```
  reasoning_tag: "Current_Chord_Root_Strong_Beat"
  ```
- **スケール内音**: 確信度 **0.65-0.90**
  ```
  reasoning_tag: "Chord_Tone_Strong_Beat" / "Scale_Tone_Strong_Beat"
  ```

#### 2. 弱拍（2拍目、4拍目）
- **テンション/パッシングトーン**: 確信度 **0.70**
  ```
  reasoning_tag: "Tension_Note_Weak_Beat" / "Scale_Tone_Weak_Beat"
  ```

#### 3. メロディの流れ考慮
- **半音/全音の動き**: 確信度 **+0.1**
  ```
  reasoning_tag: "..._Stepwise_Motion"
  ```
- **オクターブジャンプ**: 確信度 **+0.05**
  ```
  reasoning_tag: "..._Octave_Jump"
  ```

### リズムトラック提案

#### ドラムMIDIマッピング（General MIDI準拠）
```javascript
KICK = 36         // バスドラム
SNARE = 38        // スネアドラム
CLOSED_HAT = 42   // クローズドハイハット
OPEN_HAT = 46     // オープンハイハット
```

#### 1. Kick（キック）
- **強拍**: 確信度 **0.98**
  ```
  reasoning_tag: "Rhythm_Kick_on_Strong_Beat"
  ```

#### 2. Snare（スネア）
- **弱拍（バックビート）**: 確信度 **0.95**
  ```
  reasoning_tag: "Backbeat_Snare"
  ```

#### 3. Hi-Hat（ハイハット）
- **常時**: 確信度 **0.85**
  ```
  reasoning_tag: "Hi_Hat_8th_Note"
  ```

#### 4. スイング対応
- **スイング比率 > 0.3の場合**:
  - **オープンハット**: 確信度 **0.75**
    ```
    reasoning_tag: "Swing_Open_Hat_Off_Beat"
    ```

## 🎭 ジャンル別設定

### 実装済みジャンル

| ジャンル | スイング比率 | 強拍 | 弱拍 | ドラムパターン |
|---------|------------|------|------|--------------|
| **Lo-Fi Hip Hop** | 0.15 | 1, 3 | 2, 4 | Kick on 1 & 3, Snare on 2 & 4 |
| **Jazz** | 0.67 | 1, 3 | 2, 4 | Swing feel, ride cymbal on swing 8ths |
| **Pop** | 0.0 | 1, 3 | 2, 4 | Kick on 1, Snare on 2 & 4 |
| **R&B** | 0.2 | 1, 3 | 2, 4 | Syncopated groove, ghost notes on snare |
| **Rock** | 0.0 | 1, 3 | 2, 4 | Powerful backbeat, heavy kick and snare |
| **Ballad** | 0.0 | 1, 3 | 2, 4 | Soft and emotional, light brush on snare |

## 📊 レスポンス形式

### 成功レスポンス
```json
{
  "suggestions": [
    {
      "midi_note": 60,
      "confidence": 0.95,
      "reasoning_tag": "Current_Chord_Root_Strong_Beat"
    },
    {
      "midi_note": 64,
      "confidence": 0.90,
      "reasoning_tag": "Chord_Tone_Strong_Beat"
    }
  ],
  "track_type": "melody",
  "current_beat": 1.5,
  "is_strong_beat": true,
  "genre": "Lo-Fi Hip Hop",
  "rhythm_definition": {
    "time_signature": "4/4",
    "strong_beats": [1, 3],
    "weak_beats": [2, 4],
    "off_beats_priority": [2, 4],
    "swing_ratio": 0.15,
    "drum_pattern_hint": "Kick on 1 & 3. Snare on 2 & 4 (Backbeat)."
  }
}
```

## 🧪 テスト方法

### 1. バックエンドテスト

```bash
# サーバー起動
cd DAWAI_server/backend/ai_agent
python main.py

# エンドポイントテスト（curlまたはPostman）
curl -X POST http://localhost:8000/ai/predict \
  -H "Content-Type: application/json" \
  -d '{
    "track_summary": "Test melody track",
    "current_notes": [{"pitch": 60, "start": 0, "duration": 0.5, "velocity": 0.8}],
    "cursor_position": 1.0,
    "track_type": "melody",
    "genre": "Lo-Fi Hip Hop",
    "scale_notes_midi": [60, 62, 63, 65, 67, 69, 70]
  }'
```

### 2. フロントエンドテスト

```bash
# 開発サーバー起動
cd DAWAI_server/frontend
npm run dev

# ブラウザで http://localhost:5175 を開く
# MIDIエディタでノートを入力し、Ghost Text提案を確認
```

### 3. E2Eテスト（推奨）

```bash
# Playwright MCPを使用
cd DAWAI_server/frontend
npm run test:e2e
```

## 🎯 使用方法

### メロディトラックでの使用例

```javascript
// GhostTextSystemの初期化時
ghostTextSystem.inputContext.setGenre('Lo-Fi Hip Hop');
ghostTextSystem.inputContext.setScaleNotesMidi([60, 62, 63, 65, 67, 69, 70]);
ghostTextSystem.inputContext.setCurrentChord({
  name: 'Cm7',
  midi_notes: [60, 63, 67, 70]  // C, Eb, G, Bb
});

// コンテキスト更新
ghostTextSystem.updateContext(
  currentNotes,
  cursorPosition,
  'melody',
  {
    genre: 'Lo-Fi Hip Hop',
    scaleNotesMidi: [60, 62, 63, 65, 67, 69, 70],
    currentChord: { midi_notes: [60, 63, 67, 70] }
  }
);
```

### リズムトラックでの使用例

```javascript
// ドラムトラックの設定
ghostTextSystem.inputContext.setGenre('Lo-Fi Hip Hop');
ghostTextSystem.inputContext.setTrackType('rhythm');

// コンテキスト更新
ghostTextSystem.updateContext(
  currentNotes,
  cursorPosition,
  'rhythm',  // または 'Drum'
  {
    genre: 'Lo-Fi Hip Hop',
    tempo: 80
  }
);
```

## 🔧 今後の拡張可能性

### 1. AIモデル統合
現在のルールベースロジックに加えて、機械学習モデル（Magenta, Music Transformer等）を統合可能：

```python
# 将来的な拡張例
if use_ai_model:
    ai_predictions = await ai_model.predict(context)
    rule_based_predictions = generate_rule_based_predictions(context)
    # 両者をブレンド
    final_predictions = blend_predictions(ai_predictions, rule_based_predictions)
```

### 2. コード進行の自動検出
現在は手動でコード情報を渡す必要がありますが、自動検出も可能：

```javascript
// 自動コード検出機能
const detectedChord = chordDetector.detectFromNotes(currentNotes);
ghostTextSystem.inputContext.setCurrentChord(detectedChord);
```

### 3. ユーザー学習機能
ユーザーが採用した提案を学習し、パーソナライズされた提案を実現：

```javascript
// 採用された提案の記録
ghostTextSystem.on('noteAccepted', (acceptedSuggestion) => {
  learningSystem.recordAcceptance(acceptedSuggestion);
});
```

## 📚 参考資料

- **元のプロンプト**: Issue #31で提供されたGemini生成プロンプト
- **仕様書**: `DAWAI_server/specs/requirements/functional/L2_ai_integration/L3_ghost_text_enhancement.md`
- **tonal.js**: https://github.com/tonaljs/tonal
- **General MIDI仕様**: https://www.midi.org/specifications/midi1-specifications/general-midi-specifications

## ✅ 実装完了チェックリスト

- [x] バックエンド`/ai/predict`エンドポイント実装
- [x] リズム定義の追加（全ジャンル）
- [x] トラックタイプ別提案ロジック
- [x] メロディトラック補完（スケール+コード）
- [x] リズムトラック補完（ドラムパターン）
- [x] 強拍/弱拍の考慮
- [x] スイング対応
- [x] フロントエンド統合
- [ ] E2Eテスト実行
- [ ] ユーザードキュメント作成

---

**実装者**: Claude Code
**レビュー**: 要ユーザー確認
**最終更新**: 2025-10-11
