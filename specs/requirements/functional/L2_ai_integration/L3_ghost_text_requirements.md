# Ghost Text機能強化要件仕様書 (L3)

**Document ID**: FR-L3-GT-REQ-001
**Version**: 2.1.0
**Last Updated**: 2025-11-03
**Parent**: [L2: AI統合機能要件](./index.md)
**Implementation Status**: 🚧 In Development

## 📋 変更履歴

| バージョン | 日付 | 変更内容 |
|------------|------|----------|
| 2.1.0 | 2025-11-03 | 複数案生成、単一表示、↑↓キーによる候補切り替え機能を追加 |
| 2.0.0 | 2025-11-03 | Phi-2開発中止、Magenta集中開発への方針転換を反映 |
| 1.0.0 | 2025-10-05 | 初版作成 |

## 🎯 概要

Ghost Text補完機能を強化し、音楽的に自然で使いやすい補完システムを実現します。従来の「5音の単純な連続羅列」問題を解決し、**複数の補完候補を生成**し、**一度に1つの候補のみを表示**し、**↑↓キーで候補を切り替える**ことができる新しいUI/UXを提供します。

### 核心的な改善点

1. **複数案生成**: システムは3-5個の異なる補完候補を生成
2. **単一表示**: ユーザーには一度に1つの候補のみを表示
3. **候補切り替え**: ↑↓キーで表示する候補を切り替え可能
4. **1音ずつ承認**: Spaceキーで次のノートを1つずつ承認
5. **取り消し対応**: Backspaceで承認を1つずつ取り消し
6. **フレーズ構造**: 起承転結のある音楽的なフレーズを生成

### 開発方針（2025-11-03更新）

**Phi-2開発の中止**:
- Phi-2バックエンドは現在稼働しておらず、開発を中止
- リソースをMagenta集中開発に集中

**Magenta集中開発**:
- Google Magentaを主要な予測エンジンとして強化
- ルールベースのサジェスチョンアルゴリズムをMagentaに適用
- 音楽理論統合を強化（スケール、コード進行、拍位置）

## 🔍 現状分析

### 現在の補完機能の構成

```
Ghost Text予測システム
├── Magentaエンジン（機械学習ベース）
│   └── magentaGhostTextEngine.js
├── Fallback予測（統計ベース）
│   └── fallback_predictions.js
└── バックエンドAPI（ルールベース）
    └── backend/ai_agent/main.py - /ai/predict
```

### 現在の問題点

#### 問題1: 5音が単純な連続羅列
**真の問題**:
- ❌ 「5音しか出ない」ことが問題ではない
- ✅ **「5音が単純な連続羅列で音楽的に単調」** が問題

**原因**:
1. **フレーズ構造の欠如**: 1音ずつの予測では起承転結が表現できない
2. **コンテキストの不足**: 直前の数音のみで判断、全体の流れを考慮しない
3. **単一候補のみ**: ユーザーに選択肢がない

#### 問題2: Magentaの音楽理論未統合
**問題**:
- Magenta予測はスケール情報を参照しない → スケール外の音が提案される
- コード進行を考慮しない → 不協和音が発生
- プロジェクトの音楽設定が反映されない

#### 問題3: 候補選択UIの欠如
**問題**:
- 提案された1つの候補を受け入れるか拒否するかのみ
- 複数の候補から選びたくても選べない
- 候補を比較する手段がない

## 📐 機能要件

### FR-GT-001: Magentaへのサジェスチョンアルゴリズム適用

**優先度**: 🔴 Critical
**実装期限**: 2025-11-10
**依存関係**: なし

#### 概要
Magenta予測エンジンに、ルールベースのサジェスチョンアルゴリズムを統合し、音楽理論に基づいた予測を実現します。

#### 詳細要件

##### A. スケールフィルター実装
**実装場所**: `frontend/src/utils/magentaGhostTextEngine.js`

```javascript
/**
 * Magenta予測結果をスケール音のみにフィルタリング
 */
class MagentaScaleFilter {
  filterByScale(predictions, scaleNotes) {
    return predictions.filter(prediction => {
      const midiNote = prediction.pitch || prediction.note;
      // スケール音のみを許可
      return scaleNotes.includes(midiNote % 12);
    });
  }
}
```

**技術仕様**:
- **入力**: Magentaの生予測結果（5-10個）
- **処理**: プロジェクトのスケール設定（C major, G minor等）を取得し、スケール外の音を除外
- **出力**: スケール音のみの予測結果

##### B. コード進行重み付け実装
**実装場所**: `frontend/src/utils/magentaGhostTextEngine.js`

```javascript
/**
 * コード進行に基づいて予測に重み付け
 */
class ChordProgressionWeighting {
  applyChordWeighting(predictions, currentChord, beatPosition) {
    return predictions.map(prediction => {
      const midiNote = prediction.pitch || prediction.note;
      let weight = prediction.confidence || 0.5;

      // ルート音を高く評価（×1.5）
      if (this.isRootNote(midiNote, currentChord)) {
        weight *= 1.5;
      }
      // コード構成音を評価（×1.3）
      else if (this.isChordTone(midiNote, currentChord)) {
        weight *= 1.3;
      }

      return { ...prediction, confidence: weight };
    });
  }
}
```

**技術仕様**:
- **ルート音優遇**: コードのルート音を×1.5で重み付け
- **コード構成音優遇**: コードの3度、5度を×1.3で重み付け
- **テンション音**: 9th, 11th, 13thを×1.1で重み付け

##### C. 拍位置重み付け実装
**実装場所**: `frontend/src/utils/magentaGhostTextEngine.js`

```javascript
/**
 * 拍位置に基づいて予測に重み付け
 */
class BeatPositionWeighting {
  applyBeatWeighting(predictions, beatPosition) {
    const isStrongBeat = beatPosition % 1 === 0; // 1拍目、2拍目等

    return predictions.map(prediction => {
      let weight = prediction.confidence || 0.5;

      if (isStrongBeat) {
        // 強拍: 安定音（ルート、3度、5度）を優遇
        if (this.isStableTone(prediction.pitch)) {
          weight *= 1.2;
        }
      } else {
        // 弱拍: 経過音、アプローチ音も許容
        if (this.isPassingTone(prediction.pitch)) {
          weight *= 1.1;
        }
      }

      return { ...prediction, confidence: weight };
    });
  }
}
```

**技術仕様**:
- **強拍（1拍目、3拍目）**: コード構成音を+20%優遇
- **弱拍（2拍目、4拍目）**: 経過音も許容、+10%優遇

##### D. ステップワイズモーション優遇実装
**実装場所**: `frontend/src/utils/magentaGhostTextEngine.js`

```javascript
/**
 * ステップワイズモーション（音階的進行）を優遇
 */
class StepwiseMotionWeighting {
  applyStepwiseWeighting(predictions, previousNote) {
    return predictions.map(prediction => {
      const interval = Math.abs(prediction.pitch - previousNote);
      let weight = prediction.confidence || 0.5;

      // 半音・全音の動きを優遇（×1.15）
      if (interval === 1 || interval === 2) {
        weight *= 1.15;
      }
      // 大きな跳躍は抑制
      else if (interval > 7) {
        weight *= 0.8;
      }

      return { ...prediction, confidence: weight };
    });
  }
}
```

**技術仕様**:
- **半音・全音**: +15%優遇
- **短3度・長3度**: 変更なし
- **7半音以上の跳躍**: -20%減点

##### E. 統合予測パイプライン実装
**実装場所**: `frontend/src/utils/magentaGhostTextEngine.js`

```javascript
/**
 * すべてのフィルター・重み付けを統合したパイプライン
 */
class IntegratedPredictionPipeline {
  async generatePredictions(context) {
    // 1. Magentaで生予測生成（10個）
    let predictions = await this.magentaModel.predict(context);

    // 2. スケールフィルター適用
    predictions = this.scaleFilter.filterByScale(
      predictions,
      context.scaleNotes
    );

    // 3. コード進行重み付け
    predictions = this.chordWeighting.applyChordWeighting(
      predictions,
      context.currentChord,
      context.beatPosition
    );

    // 4. 拍位置重み付け
    predictions = this.beatWeighting.applyBeatWeighting(
      predictions,
      context.beatPosition
    );

    // 5. ステップワイズモーション優遇
    predictions = this.stepwiseWeighting.applyStepwiseWeighting(
      predictions,
      context.previousNote
    );

    // 6. 確信度でソート、上位5つ返却
    predictions.sort((a, b) => b.confidence - a.confidence);
    return predictions.slice(0, 5);
  }
}
```

**技術仕様**:
- **入力**: コンテキスト情報（スケール、コード、拍位置、直前のノート）
- **処理**: 5段階のフィルター・重み付けパイプライン
- **出力**: 確信度順にソートされた上位5つの予測

#### 成功基準
- [ ] スケール外の音が提案されない（100%フィルタリング）
- [ ] コード構成音が上位3位以内に入る（80%以上）
- [ ] 強拍でルート音が最上位になる（70%以上）
- [ ] ステップワイズモーションが優遇される（60%以上）

---

### FR-GT-002: 1小節分のフレーズ予測機能

**優先度**: 🔴 Critical
**実装期限**: 2025-11-15
**依存関係**: FR-GT-001

#### 概要
1音ずつの予測ではなく、1小節分（16ステップ）の起承転結のあるフレーズを生成します。

#### 詳細要件

##### A. フレーズ構造生成
**実装場所**: `frontend/src/utils/phraseGenerator.js`

```javascript
/**
 * 起承転結のあるフレーズ構造を生成
 */
class PhraseStructureGenerator {
  generatePhraseStructure(measures = 1, genre = 'pop') {
    const totalSteps = measures * 16; // 1小節 = 16ステップ（16分音符単位）

    // フレーズを4つのセクションに分割
    const structure = {
      intro: {
        steps: Math.floor(totalSteps * 0.25), // 25%
        direction: 'stable',  // 安定
        density: 'medium'     // 中密度
      },
      development: {
        steps: Math.floor(totalSteps * 0.25), // 25%
        direction: 'ascending', // 上昇
        density: 'high'        // 高密度
      },
      peak: {
        steps: Math.floor(totalSteps * 0.25), // 25%
        direction: 'peak',      // 頂点
        density: 'high'         // 高密度
      },
      resolution: {
        steps: totalSteps - Math.floor(totalSteps * 0.75), // 25%
        direction: 'descending', // 下降
        density: 'low'           // 低密度
      }
    };

    return structure;
  }
}
```

**技術仕様**:

| セクション | ステップ数 | 方向性 | 密度 | 音楽的役割 |
|------------|------------|--------|------|------------|
| 起（導入） | 4 | stable | medium | フレーズの出発点、安定感 |
| 承（展開） | 4 | ascending | high | エネルギー上昇、期待感 |
| 転（頂点） | 4 | peak | high | クライマックス、最高音 |
| 結（終止） | 4 | descending | low | 落ち着き、終止感 |

##### B. ジャンル別フレーズパターン
**実装場所**: `frontend/src/utils/phraseGenerator.js`

```javascript
/**
 * ジャンル別のフレーズパターン定義
 */
const GENRE_PHRASE_PATTERNS = {
  pop: {
    intro: { noteRange: [0, 4], rhythm: [1, 1, 0.5, 0.5] },
    development: { noteRange: [0, 7], rhythm: [0.5, 0.5, 0.5, 0.5] },
    peak: { noteRange: [5, 12], rhythm: [1, 0.5, 0.5, 1] },
    resolution: { noteRange: [0, 5], rhythm: [1, 1, 2] }
  },
  jazz: {
    intro: { noteRange: [0, 5], rhythm: [1, 0.5, 0.5, 1] },
    development: { noteRange: [0, 12], rhythm: [0.5, 0.25, 0.25, 0.5] },
    peak: { noteRange: [7, 19], rhythm: [0.25, 0.25, 0.5, 1] },
    resolution: { noteRange: [0, 7], rhythm: [1, 0.5, 1.5] }
  },
  'lo-fi-hip-hop': {
    intro: { noteRange: [0, 3], rhythm: [2, 1, 1] },
    development: { noteRange: [0, 7], rhythm: [1, 1, 1, 1] },
    peak: { noteRange: [3, 10], rhythm: [0.5, 0.5, 1, 2] },
    resolution: { noteRange: [0, 5], rhythm: [2, 2] }
  }
};
```

##### C. 方向性に基づく音選択
**実装場所**: `frontend/src/utils/phraseGenerator.js`

```javascript
/**
 * 方向性に基づいて次の音を選択
 */
class DirectionalNoteSelection {
  selectNoteByDirection(direction, currentNote, scaleNotes, chordNotes) {
    let candidates = [];

    switch (direction) {
      case 'ascending':
        // 上昇: 現在の音より高い音を選択
        candidates = scaleNotes.filter(note => note > currentNote);
        break;

      case 'descending':
        // 下降: 現在の音より低い音を選択
        candidates = scaleNotes.filter(note => note < currentNote);
        break;

      case 'stable':
        // 安定: コード構成音を優先、±2半音以内
        candidates = chordNotes.filter(note =>
          Math.abs(note - currentNote) <= 2
        );
        break;

      case 'peak':
        // 頂点: スケール内の最高音域を選択
        candidates = scaleNotes.filter(note =>
          note >= Math.max(...scaleNotes) - 5
        );
        break;
    }

    // ランダム選択（重み付き）
    return this.weightedRandomSelect(candidates);
  }
}
```

##### D. 1小節予測メイン関数
**実装場所**: `frontend/src/utils/phraseGenerator.js`

```javascript
/**
 * 1小節分のフレーズ予測メイン関数
 */
class PhrasePredictor {
  async predictPhrase(context, numCandidates = 3) {
    const structure = this.structureGenerator.generatePhraseStructure(
      1,
      context.genre
    );

    const candidates = [];

    // 複数候補を生成
    for (let i = 0; i < numCandidates; i++) {
      const phrase = {
        notes: [],
        durations: [],
        velocities: [],
        metadata: {
          genre: context.genre,
          structure: structure,
          quality_score: 0
        }
      };

      let currentNote = context.previousNote || context.scaleNotes[0];

      // 各セクションごとに音を生成
      for (const [sectionName, section] of Object.entries(structure)) {
        for (let step = 0; step < section.steps; step++) {
          const note = this.noteSelection.selectNoteByDirection(
            section.direction,
            currentNote,
            context.scaleNotes,
            context.chordNotes
          );

          phrase.notes.push(note);
          phrase.durations.push(this.selectDuration(section.density));
          phrase.velocities.push(this.selectVelocity(section.direction));

          currentNote = note;
        }
      }

      // 品質評価
      phrase.metadata.quality_score = this.evaluatePhrase(phrase, context);

      candidates.push(phrase);
    }

    // 品質スコアでソート
    candidates.sort((a, b) =>
      b.metadata.quality_score - a.metadata.quality_score
    );

    return candidates;
  }
}
```

**技術仕様**:
- **入力**: コンテキスト（スケール、コード、ジャンル、直前のノート）
- **候補数**: 3-5個の異なるフレーズ候補を生成
- **出力**: 品質スコア順にソートされたフレーズ候補リスト

#### 成功基準
- [ ] 1小節分（16ステップ）のフレーズが生成される
- [ ] 起承転結の構造が明確に表現されている
- [ ] 複数候補（3-5個）が生成される
- [ ] 品質スコアが正しく計算される

---

### FR-GT-003: 1音ずつ承認・取り消しUI

**優先度**: 🟡 High
**実装期限**: 2025-11-20
**依存関係**: FR-GT-002

#### 概要
生成された1小節分のフレーズを、ユーザーが1音ずつ承認・取り消しできるUIを実装します。また、複数の候補から選択できる機能を追加します。

#### 詳細要件

##### A. ゴーストノート状態管理
**実装場所**: `frontend/src/hooks/useGhostNoteState.js`

```javascript
/**
 * ゴーストノート状態管理フック
 */
const useGhostNoteState = () => {
  const [ghostNotes, setGhostNotes] = useState([]);
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);
  const [allCandidates, setAllCandidates] = useState([]);
  const [acceptedIndex, setAcceptedIndex] = useState(0);

  // 候補を初期化
  const initializeCandidates = (candidates) => {
    setAllCandidates(candidates);
    setCurrentCandidateIndex(0);
    setAcceptedIndex(0);
    setGhostNotes(candidates[0].notes.map((note, index) => ({
      note,
      duration: candidates[0].durations[index],
      velocity: candidates[0].velocities[index],
      status: 'pending', // pending, accepted, rejected
      index
    })));
  };

  // 候補を切り替え（↑↓キー）
  const switchCandidate = (direction) => {
    const newIndex = direction === 'up'
      ? Math.max(0, currentCandidateIndex - 1)
      : Math.min(allCandidates.length - 1, currentCandidateIndex + 1);

    if (newIndex !== currentCandidateIndex) {
      setCurrentCandidateIndex(newIndex);
      // 承認済みのノートを保持しつつ、未承認部分を新候補で置き換え
      const newCandidate = allCandidates[newIndex];
      setGhostNotes(prev => prev.map((ghostNote, index) => {
        if (index < acceptedIndex) {
          return ghostNote; // 承認済みは保持
        }
        return {
          note: newCandidate.notes[index],
          duration: newCandidate.durations[index],
          velocity: newCandidate.velocities[index],
          status: 'pending',
          index
        };
      }));
    }
  };

  return {
    ghostNotes,
    currentCandidateIndex,
    allCandidates,
    acceptedIndex,
    initializeCandidates,
    switchCandidate
  };
};
```

**技術仕様**:
- **状態種類**: pending（承認待ち）、accepted（承認済み）、rejected（却下済み）
- **候補管理**: 複数候補（3-5個）を配列で管理
- **現在候補**: currentCandidateIndexで現在表示中の候補を追跡
- **承認進行**: acceptedIndexで何音目まで承認したかを追跡

##### B. 承認操作API
**実装場所**: `frontend/src/hooks/useGhostNoteState.js`

```javascript
/**
 * ゴーストノート承認操作
 */
const useGhostNoteOperations = (ghostNoteState) => {
  const {
    ghostNotes,
    setGhostNotes,
    acceptedIndex,
    setAcceptedIndex,
    currentCandidateIndex,
    allCandidates
  } = ghostNoteState;

  // 次のノートを承認（Spaceキー）
  const acceptNextNote = () => {
    if (acceptedIndex >= ghostNotes.length) return;

    const nextNote = ghostNotes[acceptedIndex];
    setGhostNotes(prev => prev.map((note, index) =>
      index === acceptedIndex
        ? { ...note, status: 'accepted' }
        : note
    ));

    // MIDIトラックに追加
    addNoteToMidiTrack(nextNote);

    setAcceptedIndex(prev => prev + 1);

    // すべて承認したら次のフレーズを生成
    if (acceptedIndex + 1 >= ghostNotes.length) {
      generateNextPhrase();
    }
  };

  // 直前の承認を取り消し（Backspaceキー）
  const undoLastAcceptance = () => {
    if (acceptedIndex === 0) return;

    const lastAcceptedNote = ghostNotes[acceptedIndex - 1];

    // MIDIトラックから削除
    removeNoteFromMidiTrack(lastAcceptedNote);

    setGhostNotes(prev => prev.map((note, index) =>
      index === acceptedIndex - 1
        ? { ...note, status: 'pending' }
        : note
    ));

    setAcceptedIndex(prev => prev - 1);
  };

  // すべて承認（Tabキー）
  const acceptAllNotes = () => {
    ghostNotes.forEach((note, index) => {
      if (index >= acceptedIndex) {
        addNoteToMidiTrack(note);
      }
    });

    setGhostNotes(prev => prev.map(note => ({ ...note, status: 'accepted' })));
    setAcceptedIndex(ghostNotes.length);

    // 次のフレーズを生成
    generateNextPhrase();
  };

  // すべてキャンセル（Escキー）
  const cancelAllNotes = () => {
    // 未承認のノートをすべて削除
    setGhostNotes([]);
    setAcceptedIndex(0);
  };

  // 前の候補に切り替え（↑キー）
  const switchToPreviousCandidate = () => {
    switchCandidate('up');
  };

  // 次の候補に切り替え（↓キー）
  const switchToNextCandidate = () => {
    switchCandidate('down');
  };

  return {
    acceptNextNote,
    undoLastAcceptance,
    acceptAllNotes,
    cancelAllNotes,
    switchToPreviousCandidate,
    switchToNextCandidate
  };
};
```

**技術仕様**:
- **acceptNextNote**: 次のノートを承認し、MIDIトラックに追加
- **undoLastAcceptance**: 直前の承認を取り消し、MIDIトラックから削除
- **acceptAllNotes**: すべてのノートを一括承認
- **cancelAllNotes**: すべてのノートをキャンセル
- **switchToPreviousCandidate**: 前の候補に切り替え（↑キー）
- **switchToNextCandidate**: 次の候補に切り替え（↓キー）

##### C. キーボードショートカット統合
**実装場所**: `frontend/src/components/EnhancedMidiEditor.jsx`

```javascript
/**
 * Ghost Textキーボードショートカット
 */
const useGhostTextKeyboardShortcuts = (operations) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ghost Textが有効な場合のみ
      if (!ghostTextEnabled) return;

      switch (event.key) {
        case ' ': // Space
          event.preventDefault();
          operations.acceptNextNote();
          break;

        case 'Backspace':
          event.preventDefault();
          operations.undoLastAcceptance();
          break;

        case 'Tab':
          event.preventDefault();
          operations.acceptAllNotes();
          break;

        case 'Escape':
          event.preventDefault();
          operations.cancelAllNotes();
          break;

        case 'ArrowUp':
          event.preventDefault();
          operations.switchToPreviousCandidate();
          break;

        case 'ArrowDown':
          event.preventDefault();
          operations.switchToNextCandidate();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [operations, ghostTextEnabled]);
};
```

**キーボードショートカット一覧**:

| キー | 機能 | 説明 |
|------|------|------|
| **Space** | 次のノートを承認 | 承認待ちの最初のノートをMIDIトラックに追加し、次のノートにフォーカス |
| **Backspace** | 取り消し | 直前に承認したノートを取り消し、承認待ちに戻す |
| **Tab** | 全承認 | すべての承認待ちノートを一括承認し、次のフレーズ予測を開始 |
| **Esc** | キャンセル | すべての承認待ちノートをクリアし、Ghost Text表示を終了 |
| **↑** | 前の候補 | 表示する候補を前のものに切り替え（承認済みノートは保持） |
| **↓** | 次の候補 | 表示する候補を次のものに切り替え（承認済みノートは保持） |

**重要な仕様**:
- **候補切り替え時の動作**:
  - 承認済みのノートはそのまま保持
  - 未承認部分のみが新しい候補に置き換わる
  - これにより、「前半は気に入ったが後半を変えたい」というニーズに対応

##### D. UIコンポーネント
**実装場所**: `frontend/src/components/GhostNoteDisplay.jsx`

```javascript
/**
 * Ghost Note表示コンポーネント
 */
const GhostNoteDisplay = ({ ghostNotes, currentCandidateIndex, totalCandidates }) => {
  return (
    <div className="ghost-note-container">
      {/* 候補インジケーター */}
      <div className="candidate-indicator">
        候補 {currentCandidateIndex + 1} / {totalCandidates}
        <div className="candidate-dots">
          {Array.from({ length: totalCandidates }).map((_, index) => (
            <div
              key={index}
              className={`dot ${index === currentCandidateIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Ghost Noteノート表示 */}
      <div className="ghost-notes">
        {ghostNotes.map((ghostNote, index) => (
          <div
            key={index}
            className={`ghost-note ${ghostNote.status}`}
            style={{
              left: `${ghostNote.time * 100}px`,
              top: `${(127 - ghostNote.note) * 10}px`,
              width: `${ghostNote.duration * 100}px`,
              height: '10px'
            }}
          >
            {/* ノート番号表示（承認進行を視覚化） */}
            {ghostNote.status === 'pending' && (
              <span className="note-number">{index + 1}</span>
            )}
          </div>
        ))}
      </div>

      {/* ヘルプテキスト */}
      <div className="help-text">
        <kbd>Space</kbd> 承認 |
        <kbd>Backspace</kbd> 取消 |
        <kbd>↑↓</kbd> 候補切替 |
        <kbd>Tab</kbd> 全承認 |
        <kbd>Esc</kbd> キャンセル
      </div>
    </div>
  );
};
```

**視覚的フィードバック**:

| 状態 | 色 | 透明度 | 枠線 | 備考 |
|------|-----|--------|------|------|
| pending | 水色 | 50% | 点線 | 承認待ち、ノート番号表示 |
| accepted | 緑 | 80% | 実線（太線） | 承認済み、通常ノートに近い表示 |
| rejected | 赤 | 30% | 点線（細線） | 却下済み（現在の仕様では使用しない） |

**インタラクション**:
- **マウスホバー**: ホバーしたノートを拡大表示、音程・デュレーション情報をツールチップ表示
- **マウスクリック**: クリックで個別に承認（Spaceキーと同じ効果）
- **ドラッグ**: ドラッグで範囲選択し、複数ノートを一括承認（将来実装）

#### 成功基準
- [ ] Spaceキーで次のノートを1つずつ承認できる
- [ ] Backspaceキーで直前の承認を取り消せる
- [ ] ↑↓キーで候補を切り替えられる
- [ ] 候補切り替え時に承認済みノートが保持される
- [ ] Tabキーですべてのノートを一括承認できる
- [ ] Escキーですべてのノートをキャンセルできる
- [ ] 視覚的フィードバックが明確である

---

## 📊 品質評価システム

### 品質評価アルゴリズム

```javascript
/**
 * フレーズ品質評価
 */
class PhraseQualityEvaluator {
  evaluatePhrase(phrase, context) {
    const scores = {
      harmonicFit: this.evaluateHarmonicFit(phrase, context),      // ハーモニック整合性（30%）
      scaleCompliance: this.evaluateScaleCompliance(phrase, context), // スケール整合性（20%）
      melodicFlow: this.evaluateMelodicFlow(phrase),                // メロディックフロー（25%）
      rhythmicBalance: this.evaluateRhythmicBalance(phrase),        // リズミックバランス（15%）
      phraseStructure: this.evaluatePhraseStructure(phrase)         // フレーズ構造（10%）
    };

    // 重み付き合計
    const totalScore =
      scores.harmonicFit * 0.30 +
      scores.scaleCompliance * 0.20 +
      scores.melodicFlow * 0.25 +
      scores.rhythmicBalance * 0.15 +
      scores.phraseStructure * 0.10;

    return {
      total: totalScore,
      details: scores
    };
  }

  evaluateHarmonicFit(phrase, context) {
    // コード構成音が適切な位置（強拍）にあるかチェック
    let score = 0;
    phrase.notes.forEach((note, index) => {
      const beatPosition = index % 16;
      const isStrongBeat = beatPosition % 4 === 0;

      if (isStrongBeat && context.chordNotes.includes(note % 12)) {
        score += 1;
      }
    });

    return Math.min(score / 4, 1.0); // 最大4つの強拍
  }

  evaluateScaleCompliance(phrase, context) {
    // スケール音のみで構成されているかチェック
    const scaleNoteCount = phrase.notes.filter(note =>
      context.scaleNotes.includes(note % 12)
    ).length;

    return scaleNoteCount / phrase.notes.length;
  }

  evaluateMelodicFlow(phrase) {
    // ステップワイズモーションの割合をチェック
    let stepwiseCount = 0;

    for (let i = 1; i < phrase.notes.length; i++) {
      const interval = Math.abs(phrase.notes[i] - phrase.notes[i - 1]);
      if (interval <= 2) {
        stepwiseCount++;
      }
    }

    return stepwiseCount / (phrase.notes.length - 1);
  }

  evaluateRhythmicBalance(phrase) {
    // リズムの多様性をチェック（すべて同じデュレーションは低評価）
    const uniqueDurations = new Set(phrase.durations).size;
    return Math.min(uniqueDurations / 3, 1.0); // 最大3種類のデュレーション
  }

  evaluatePhraseStructure(phrase) {
    // 起承転結の構造が表現されているかチェック
    // 音高の変化パターンを分析
    const sections = [
      phrase.notes.slice(0, 4),
      phrase.notes.slice(4, 8),
      phrase.notes.slice(8, 12),
      phrase.notes.slice(12, 16)
    ];

    // 各セクションの平均音高を計算
    const avgPitches = sections.map(section =>
      section.reduce((sum, note) => sum + note, 0) / section.length
    );

    // 期待されるパターン: 起（中）→ 承（上昇）→ 転（最高）→ 結（下降）
    const expectedPattern = [0.5, 0.7, 0.9, 0.6]; // 正規化された期待値

    // 実際のパターンを正規化
    const minPitch = Math.min(...avgPitches);
    const maxPitch = Math.max(...avgPitches);
    const normalizedPitches = avgPitches.map(pitch =>
      (pitch - minPitch) / (maxPitch - minPitch || 1)
    );

    // パターン一致度を計算
    let patternScore = 0;
    for (let i = 0; i < 4; i++) {
      patternScore += 1 - Math.abs(normalizedPitches[i] - expectedPattern[i]);
    }

    return patternScore / 4;
  }
}
```

### 品質評価指標

| 指標 | 重み | 説明 | 評価方法 |
|------|------|------|----------|
| **ハーモニック整合性** | 30% | コード進行との調和 | 強拍でコード構成音が使われているか |
| **スケール整合性** | 20% | スケールへの適合度 | スケール外の音の割合 |
| **メロディックフロー** | 25% | メロディの滑らかさ | ステップワイズモーションの割合 |
| **リズミックバランス** | 15% | リズムの多様性 | デュレーションの種類数 |
| **フレーズ構造** | 10% | 起承転結の表現 | 音高変化パターンの一致度 |

---

## 🎨 UI/UXデザイン

### A. Ghost Note表示の改善

**Before（現在）**:
- 5つの予測がすべて同時表示
- どれが最も推奨されるかが不明確
- 選択肢が多すぎて混乱

**After（改善後）**:
- 1つの候補のみを表示（最も品質スコアが高いもの）
- ↑↓キーで他の候補に切り替え
- 候補インジケーターで現在の候補番号を表示（例: 「候補 2 / 5」）
- シンプルで直感的

### B. 承認フロー

```
1. フレーズ予測生成（3-5候補）
   ↓
2. 最も品質の高い候補を表示
   ↓
3. ユーザーが↑↓で候補を確認
   ↓
4. Spaceキーで次のノートを承認
   ↓
5. 承認済みノートは緑色に変化
   ↓
6. Backspaceで取り消し可能
   ↓
7. すべて承認 or Tabで一括承認
   ↓
8. 次のフレーズ予測を自動生成
```

### C. ヘルプ・チュートリアル

**初回使用時**:
- Ghost Text機能の簡単なチュートリアルを表示
- キーボードショートカットの説明
- 「スペースキーで次のノートを承認」等の具体的な操作ガイド

**常時表示**:
- エディタ下部にキーボードショートカットのクイックリファレンスを表示
- 候補切り替え時に現在の候補番号を表示

---

## 📈 パフォーマンス要件

### 応答性能目標

| 機能 | 目標値 | 許容値 | 測定方法 |
|------|--------|--------|----------|
| フレーズ予測生成 | <1秒 | <2秒 | 予測開始から結果表示まで |
| 候補切り替え | <100ms | <300ms | ↑↓キー押下から表示更新まで |
| ノート承認 | <50ms | <150ms | Spaceキー押下からMIDI追加まで |
| 品質評価計算 | <200ms | <500ms | 評価開始から完了まで |

### メモリ使用量

| コンポーネント | 目標値 | 許容値 | 備考 |
|----------------|--------|--------|------|
| フレーズ候補（5個） | <1MB | <5MB | 1小節×5候補 |
| 品質評価データ | <100KB | <500KB | 評価スコアとメタデータ |
| UI状態管理 | <500KB | <2MB | React状態とコールバック |

---

## 🧪 テストケース

### A. 単体テスト

```javascript
describe('PhrasePredictor', () => {
  test('1小節分（16ステップ）のフレーズが生成される', () => {
    const predictor = new PhrasePredictor();
    const context = {
      scaleNotes: [60, 62, 64, 65, 67, 69, 71],
      chordNotes: [60, 64, 67],
      genre: 'pop',
      previousNote: 60
    };

    const candidates = predictor.predictPhrase(context, 3);

    expect(candidates).toHaveLength(3);
    expect(candidates[0].notes).toHaveLength(16);
  });

  test('複数候補が異なる内容である', () => {
    const predictor = new PhrasePredictor();
    const context = {
      scaleNotes: [60, 62, 64, 65, 67, 69, 71],
      chordNotes: [60, 64, 67],
      genre: 'pop',
      previousNote: 60
    };

    const candidates = predictor.predictPhrase(context, 3);

    // 候補1と候補2が異なることを確認
    expect(candidates[0].notes).not.toEqual(candidates[1].notes);
    expect(candidates[1].notes).not.toEqual(candidates[2].notes);
  });

  test('品質スコアが正しく計算される', () => {
    const evaluator = new PhraseQualityEvaluator();
    const phrase = {
      notes: [60, 62, 64, 65, 67, 69, 71, 72, 74, 72, 71, 69, 67, 65, 64, 62],
      durations: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      velocities: [80, 80, 85, 85, 90, 90, 95, 100, 100, 95, 90, 85, 80, 75, 70, 65]
    };
    const context = {
      scaleNotes: [60, 62, 64, 65, 67, 69, 71],
      chordNotes: [60, 64, 67]
    };

    const score = evaluator.evaluatePhrase(phrase, context);

    expect(score.total).toBeGreaterThan(0.6); // 60%以上
    expect(score.details.scaleCompliance).toBe(1.0); // すべてスケール音
  });
});
```

### B. 統合テスト

```javascript
describe('Ghost Text承認フロー', () => {
  test('Spaceキーで次のノートを承認できる', () => {
    const { ghostNotes, operations } = renderGhostTextUI();

    // 初期状態: すべてpending
    expect(ghostNotes[0].status).toBe('pending');

    // Spaceキー押下
    operations.acceptNextNote();

    // 最初のノートがacceptedに変わる
    expect(ghostNotes[0].status).toBe('accepted');
    expect(ghostNotes[1].status).toBe('pending');
  });

  test('Backspaceキーで承認を取り消せる', () => {
    const { ghostNotes, operations } = renderGhostTextUI();

    // 1つ承認
    operations.acceptNextNote();
    expect(ghostNotes[0].status).toBe('accepted');

    // Backspaceキー押下
    operations.undoLastAcceptance();

    // pendingに戻る
    expect(ghostNotes[0].status).toBe('pending');
  });

  test('↑↓キーで候補を切り替えられる', () => {
    const { currentCandidateIndex, operations } = renderGhostTextUI();

    expect(currentCandidateIndex).toBe(0);

    // ↓キー押下
    operations.switchToNextCandidate();
    expect(currentCandidateIndex).toBe(1);

    // ↑キー押下
    operations.switchToPreviousCandidate();
    expect(currentCandidateIndex).toBe(0);
  });

  test('候補切り替え時に承認済みノートが保持される', () => {
    const { ghostNotes, operations } = renderGhostTextUI();

    // 最初の2音を承認
    operations.acceptNextNote();
    operations.acceptNextNote();

    const acceptedNotes = [ghostNotes[0], ghostNotes[1]];

    // 候補を切り替え
    operations.switchToNextCandidate();

    // 承認済みノートが変わっていないことを確認
    expect(ghostNotes[0]).toEqual(acceptedNotes[0]);
    expect(ghostNotes[1]).toEqual(acceptedNotes[1]);
    expect(ghostNotes[0].status).toBe('accepted');
    expect(ghostNotes[1].status).toBe('accepted');
    expect(ghostNotes[2].status).toBe('pending'); // 未承認部分は変わる
  });
});
```

### C. E2Eテスト

```javascript
// Playwright E2Eテスト
test('Ghost Text機能のフルフロー', async ({ page }) => {
  await page.goto('/');

  // MIDIトラックを開く
  await page.click('[data-testid="piano-track-button"]');

  // Ghost Textを有効化
  await page.click('[data-testid="ghost-text-toggle"]');

  // ノートを入力してGhost Text表示をトリガー
  await page.click('[data-testid="midi-editor-canvas"]', { position: { x: 100, y: 150 } });

  // Ghost Noteが表示されることを確認
  await expect(page.locator('[data-testid="ghost-note"]').first()).toBeVisible();

  // 候補インジケーターが表示される
  await expect(page.locator('[data-testid="candidate-indicator"]')).toContainText('候補 1 / 3');

  // ↓キーで候補切り替え
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-testid="candidate-indicator"]')).toContainText('候補 2 / 3');

  // Spaceキーで承認
  await page.keyboard.press('Space');

  // 最初のノートが緑色（accepted）になることを確認
  await expect(page.locator('[data-testid="ghost-note"]').first()).toHaveClass(/accepted/);

  // Backspaceキーで取り消し
  await page.keyboard.press('Backspace');

  // pendingに戻る
  await expect(page.locator('[data-testid="ghost-note"]').first()).toHaveClass(/pending/);

  // Tabキーで全承認
  await page.keyboard.press('Tab');

  // すべてのノートがMIDIトラックに追加される
  const midiNotes = await page.locator('[data-testid="midi-note"]').count();
  expect(midiNotes).toBeGreaterThan(0);

  // スクリーンショット取得
  await page.screenshot({ path: 'ghost-text-flow.png' });
});
```

---

## 📅 実装スケジュール

### Phase 1: Magentaサジェスチョンアルゴリズム（2週間）
**期限**: 2025-11-10

- [ ] FR-GT-001-A: スケールフィルター実装（3日）
- [ ] FR-GT-001-B: コード進行重み付け実装（3日）
- [ ] FR-GT-001-C: 拍位置重み付け実装（2日）
- [ ] FR-GT-001-D: ステップワイズ優遇実装（2日）
- [ ] FR-GT-001-E: 統合パイプライン実装（2日）
- [ ] 単体テスト作成・実行（2日）

### Phase 2: フレーズ予測機能（2週間）
**期限**: 2025-11-15

- [ ] FR-GT-002-A: フレーズ構造生成実装（5日）
- [ ] FR-GT-002-B: ジャンル別パターン定義（3日）
- [ ] FR-GT-002-C: 方向性に基づく音選択実装（3日）
- [ ] FR-GT-002-D: 1小節予測メイン関数実装（3日）
- [ ] 品質評価システム実装（3日）
- [ ] 統合テスト作成・実行（3日）

### Phase 3: 承認UI実装（1.5週間）
**期限**: 2025-11-20

- [ ] FR-GT-003-A: ゴーストノート状態管理実装（2日）
- [ ] FR-GT-003-B: 承認操作API実装（3日）
- [ ] FR-GT-003-C: キーボードショートカット統合（2日）
- [ ] FR-GT-003-D: UIコンポーネント実装（3日）
- [ ] 候補切り替え機能実装（2日）
- [ ] E2Eテスト作成・実行（2日）

---

## 🔗 関連仕様参照

### 上位要件
- **[L2: AI統合機能要件](./index.md)** - Ghost Text機能の位置づけ
- **[L1: 機能要件一覧](../L1_index.md)** - 全体機能要件との関係

### 関連仕様
- **[L3: Ghost Textジャンル・スケール対応機能要件](./L3_ghost_text_enhancement.md)** - 音楽理論統合の技術仕様
- **[L3: Ghost Text補完機能 - ユーザーガイド](./L3_ghost_text_user_guide.md)** - 初心者向けの使い方ガイド

### 実装仕様
- **[L2: システムフロー](../../../design/sequences/L2_component_flows.md)** - 処理フロー設計
- **[L3: コンポーネント設計](../../../architecture/logical/L3_components/)** - UI・システムコンポーネント

---

**実装ファイル参照**:
- `frontend/src/utils/magentaGhostTextEngine.js` - Magenta予測エンジン
- `frontend/src/utils/phraseGenerator.js` - フレーズ生成エンジン（新規）
- `frontend/src/hooks/useGhostNoteState.js` - ゴーストノート状態管理（新規）
- `frontend/src/components/GhostNoteDisplay.jsx` - Ghost Note表示UI（新規）
- `frontend/src/components/EnhancedMidiEditor.jsx` - MIDIエディタ統合
