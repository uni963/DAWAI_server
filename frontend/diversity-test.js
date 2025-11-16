// Dry Run Test - Diversity Logic Verification

// Diversity metrics
const diversityMetrics = {
  phraseCount: 0,
  ghostCount: 0,
  consecutivePhraseCount: 0,
  consecutiveGhostCount: 0,
  lastSource: null
};

// Weighted random selection
function weightedRandomSelect(items) {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  const randomValue = Math.random();
  let random = randomValue * totalWeight;

  for (const item of items) {
    random -= (item.weight || 1);
    if (random <= 0) return item;
  }

  return items[0];
}

// Simulation
function simulateAcceptNextGhostNote() {
  const hasPhraseNotes = true;
  const hasGhostPredictions = true;

  let selectedType = null;

  if (hasPhraseNotes && hasGhostPredictions) {
    let phraseWeight = 0.6;
    let ghostWeight = 0.4;

    if (diversityMetrics.consecutivePhraseCount >= 3) {
      phraseWeight = 0.3;
      ghostWeight = 0.7;
    } else if (diversityMetrics.consecutiveGhostCount >= 3) {
      phraseWeight = 0.7;
      ghostWeight = 0.3;
    }

    const predictionTypes = [
      { type: 'phrase', weight: phraseWeight },
      { type: 'ghost', weight: ghostWeight }
    ];

    selectedType = weightedRandomSelect(predictionTypes).type;
  }

  // Update metrics
  if (selectedType === 'phrase') {
    diversityMetrics.phraseCount++;
    diversityMetrics.consecutivePhraseCount++;
    diversityMetrics.consecutiveGhostCount = 0;
    diversityMetrics.lastSource = 'phrase';
  } else {
    diversityMetrics.ghostCount++;
    diversityMetrics.consecutiveGhostCount++;
    diversityMetrics.consecutivePhraseCount = 0;
    diversityMetrics.lastSource = 'ghost';
  }

  return selectedType;
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎲 多様性機能 Dry Run テスト開始');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Run 100 simulations
const results = [];
for (let i = 0; i < 100; i++) {
  const result = simulateAcceptNextGhostNote();
  results.push(result);

  // Log every 10 iterations
  if ((i + 1) % 10 === 0) {
    const totalCount = diversityMetrics.phraseCount + diversityMetrics.ghostCount;
    const phrasePercentage = ((diversityMetrics.phraseCount / totalCount) * 100).toFixed(1);
    const ghostPercentage = ((diversityMetrics.ghostCount / totalCount) * 100).toFixed(1);

    console.log(`${i + 1}回目: Phrase ${phrasePercentage}% (${diversityMetrics.phraseCount}), Ghost ${ghostPercentage}% (${diversityMetrics.ghostCount})`);
    console.log(`  連続: Phrase=${diversityMetrics.consecutivePhraseCount}, Ghost=${diversityMetrics.consecutiveGhostCount}`);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 最終統計レポート');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const totalCount = diversityMetrics.phraseCount + diversityMetrics.ghostCount;
const phrasePercentage = ((diversityMetrics.phraseCount / totalCount) * 100).toFixed(1);
const ghostPercentage = ((diversityMetrics.ghostCount / totalCount) * 100).toFixed(1);

console.log(`総実行回数: ${totalCount}回`);
console.log(`Phrase選択: ${diversityMetrics.phraseCount}回 (${phrasePercentage}%)`);
console.log(`Ghost選択: ${diversityMetrics.ghostCount}回 (${ghostPercentage}%)`);
console.log(`\n期待値: Phrase 60% / Ghost 40% (動的調整あり)`);

// Verify diversity
const diversityScore = Math.min(
  diversityMetrics.phraseCount / totalCount,
  diversityMetrics.ghostCount / totalCount
) * 100;

console.log(`\n多様性スコア: ${diversityScore.toFixed(1)}% (高いほど良い、最大50%)`);

if (diversityScore > 35) {
  console.log('✅ 多様性テスト PASS: 十分な多様性が確保されています');
} else if (diversityScore > 25) {
  console.log('⚠️ 多様性テスト WARNING: 多様性が低い可能性があります');
} else {
  console.log('❌ 多様性テスト FAIL: 多様性が不足しています');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
