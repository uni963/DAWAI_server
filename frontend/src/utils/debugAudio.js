// 音声デバッグ機能
// ピアノとドラムの全音をテストし、問題のあるマッピングを特定

import { pianoKeyMapping } from './pianoTest.js';
import { drumMapping } from './drumTest.js';

// デバッグ結果を保存
let debugResults = {
  piano: {
    total: 0,
    success: 0,
    failed: 0,
    errors: []
  },
  drum: {
    total: 0,
    success: 0,
    failed: 0,
    errors: []
  }
};

// 音声コンテキスト
let audioContext = null;
let audioBuffers = {};

// 音声ファイルを読み込む
async function loadAudioFile(filename) {
  if (audioBuffers[filename]) {
    return audioBuffers[filename];
  }
  
  try {
    // ピアノ音ファイルは /piano/ フォルダにある
    const isPianoFile = filename.includes('Piano MF');
    const filePath = isPianoFile ? `/sounds/MuseScore_General/samples/piano/${filename}` : `/sounds/MuseScore_General/samples/${filename}`;
    
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBuffers[filename] = audioBuffer;
    return audioBuffer;
  } catch (error) {
    throw new Error(`音声ファイルの読み込みに失敗: ${filename} - ${error.message}`);
  }
}

// ピアノ音のデバッグテスト
async function testPianoKey(key, keyInfo) {
  debugResults.piano.total++;
  
  try {
    const audioBuffer = await loadAudioFile(keyInfo.sample);
    if (audioBuffer) {
      debugResults.piano.success++;
      console.log(`✅ ピアノ キー ${key} (${keyInfo.note}): ${keyInfo.sample} - 成功`);
    } else {
      throw new Error('音声バッファがnull');
    }
  } catch (error) {
    debugResults.piano.failed++;
    const errorInfo = {
      key: key,
      note: keyInfo.note,
      sample: keyInfo.sample,
      error: error.message
    };
    debugResults.piano.errors.push(errorInfo);
    console.log(`❌ ピアノ キー ${key} (${keyInfo.note}): ${keyInfo.sample} - 失敗: ${error.message}`);
  }
}

// ドラム音のデバッグテスト
async function testDrumKey(key, drumInfo) {
  debugResults.drum.total++;
  
  if (drumInfo.name === 'Random Drum') {
    debugResults.drum.success++;
    console.log(`✅ ドラム キー '${key}': ${drumInfo.name} - スキップ（ランダム）`);
    return;
  }
  
  const availableSamples = drumInfo.samples.filter(sample => sample && sample.length > 0);
  if (availableSamples.length === 0) {
    debugResults.drum.failed++;
    const errorInfo = {
      key: key,
      name: drumInfo.name,
      error: '利用可能なサンプルがありません'
    };
    debugResults.drum.errors.push(errorInfo);
    console.log(`❌ ドラム キー '${key}': ${drumInfo.name} - 失敗: 利用可能なサンプルがありません`);
    return;
  }
  
  let successCount = 0;
  let totalCount = availableSamples.length;
  
  for (const sample of availableSamples) {
    try {
      const audioBuffer = await loadAudioFile(sample);
      if (audioBuffer) {
        successCount++;
      } else {
        throw new Error('音声バッファがnull');
      }
    } catch (error) {
      const errorInfo = {
        key: key,
        name: drumInfo.name,
        sample: sample,
        error: error.message
      };
      debugResults.drum.errors.push(errorInfo);
      console.log(`❌ ドラム キー '${key}' (${drumInfo.name}): ${sample} - 失敗: ${error.message}`);
    }
  }
  
  if (successCount === totalCount) {
    debugResults.drum.success++;
    console.log(`✅ ドラム キー '${key}': ${drumInfo.name} - 全${totalCount}個成功`);
  } else {
    debugResults.drum.failed++;
    console.log(`⚠️ ドラム キー '${key}': ${drumInfo.name} - ${successCount}/${totalCount}個成功`);
  }
}

// 全ピアノ音をテスト
export async function debugAllPianoSounds() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  console.log('🎹 ピアノ音のデバッグテストを開始...');
  console.log('='.repeat(60));
  
  debugResults.piano = {
    total: 0,
    success: 0,
    failed: 0,
    errors: []
  };
  
  const keys = Object.keys(pianoKeyMapping).sort((a, b) => parseInt(a) - parseInt(b));
  
  for (const key of keys) {
    const keyInfo = pianoKeyMapping[key];
    await testPianoKey(key, keyInfo);
    // 少し待機してコンソールの出力を整理
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('='.repeat(60));
  console.log('🎹 ピアノ音のデバッグテスト完了');
  console.log(`総数: ${debugResults.piano.total}, 成功: ${debugResults.piano.success}, 失敗: ${debugResults.piano.failed}`);
  
  if (debugResults.piano.errors.length > 0) {
    console.log('\n❌ 失敗したピアノ音:');
    debugResults.piano.errors.forEach(error => {
      console.log(`  キー ${error.key} (${error.note}): ${error.sample} - ${error.error}`);
    });
  }
  
  return debugResults.piano;
}

// 全ドラム音をテスト
export async function debugAllDrumSounds() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  console.log('🥁 ドラム音のデバッグテストを開始...');
  console.log('='.repeat(60));
  
  debugResults.drum = {
    total: 0,
    success: 0,
    failed: 0,
    errors: []
  };
  
  const keys = Object.keys(drumMapping).sort();
  
  for (const key of keys) {
    const drumInfo = drumMapping[key];
    await testDrumKey(key, drumInfo);
    // 少し待機してコンソールの出力を整理
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('='.repeat(60));
  console.log('🥁 ドラム音のデバッグテスト完了');
  console.log(`総数: ${debugResults.drum.total}, 成功: ${debugResults.drum.success}, 失敗: ${debugResults.drum.failed}`);
  
  if (debugResults.drum.errors.length > 0) {
    console.log('\n❌ 失敗したドラム音:');
    debugResults.drum.errors.forEach(error => {
      if (error.sample) {
        console.log(`  キー '${error.key}' (${error.name}): ${error.sample} - ${error.error}`);
      } else {
        console.log(`  キー '${error.key}' (${error.name}): ${error.error}`);
      }
    });
  }
  
  return debugResults.drum;
}

// 全音をテスト
export async function debugAllSounds() {
  console.log('🎵 全音のデバッグテストを開始...');
  console.log('='.repeat(80));
  
  const pianoResult = await debugAllPianoSounds();
  console.log('\n');
  const drumResult = await debugAllDrumSounds();
  
  console.log('\n' + '='.repeat(80));
  console.log('🎵 全音のデバッグテスト完了');
  console.log(`ピアノ: ${pianoResult.success}/${pianoResult.total} 成功`);
  console.log(`ドラム: ${drumResult.success}/${drumResult.total} 成功`);
  console.log(`総合: ${pianoResult.success + drumResult.success}/${pianoResult.total + drumResult.total} 成功`);
  
  const totalErrors = pianoResult.errors.length + drumResult.errors.length;
  if (totalErrors > 0) {
    console.log(`\n⚠️ 合計 ${totalErrors} 個のエラーが見つかりました`);
    console.log('修正が必要なマッピングを確認してください');
  } else {
    console.log('\n🎉 すべての音が正常に動作しています！');
  }
  
  return {
    piano: pianoResult,
    drum: drumResult
  };
}

// 失敗した音のみを再テスト
export async function retestFailedSounds() {
  console.log('🔄 失敗した音の再テストを開始...');
  
  const failedPianoKeys = debugResults.piano.errors.map(error => error.key);
  const failedDrumKeys = [...new Set(debugResults.drum.errors.map(error => error.key))];
  
  if (failedPianoKeys.length > 0) {
    console.log(`\n🎹 失敗したピアノ音を再テスト: ${failedPianoKeys.length}個`);
    for (const key of failedPianoKeys) {
      const keyInfo = pianoKeyMapping[key];
      await testPianoKey(key, keyInfo);
    }
  }
  
  if (failedDrumKeys.length > 0) {
    console.log(`\n🥁 失敗したドラム音を再テスト: ${failedDrumKeys.length}個`);
    for (const key of failedDrumKeys) {
      const drumInfo = drumMapping[key];
      await testDrumKey(key, drumInfo);
    }
  }
  
  console.log('🔄 再テスト完了');
}

// 利用可能な音ファイルの一覧を取得
export async function getAvailableSamples() {
  const availableSamples = [];
  const testSamples = [
    // ピアノ音（SFZファイルから抽出）
    'Piano MF Bv1(R).wav', 'Piano MF D#0(R).wav', 'Piano MF F0(R).wav',
    'Piano MF G0(R).wav', 'Piano MF A0(R).wav', 'Piano MF B0(R).wav',
    'Piano MF D1(R).wav', 'Piano MF E1(R).wav', 'Piano MF G1(R).wav',
    'Piano MF A1(R).wav', 'Piano MF B1(R).wav', 'Piano MF C2(R).wav',
    'Piano MF D2(R).wav', 'Piano MF E2(R).wav', 'Piano MF G2(R).wav',
    'Piano MF A2(R).wav', 'Piano MF B2(R).wav', 'Piano MF C3(R).wav',
    'Piano MF D3(R).wav', 'Piano MF E3(R).wav', 'Piano MF G3(R).wav',
    'Piano MF A3(R).wav', 'Piano MF B3(R).wav', 'Piano MF C4(R).wav',
    'Piano MF E4(R).wav', 'Piano MF G4(R).wav', 'Piano MF G#4(R).wav',
    'Piano MF B4(R).wav', 'Piano MF C#5(R).wav', 'Piano MF D#5(R).wav',
    'Piano MF F5(R).wav', 'Piano MF G5(R).wav', 'Piano MF A5(R).wav',
    'Piano MF B5(R).wav', 'Piano MF C#6(R).wav', 'Piano MF D#6(R).wav',
    'Piano MF F6(R).wav', 'Piano MF G6(R).wav', 'Piano MF A6(R).wav',
    'Piano MF B6(R).wav'
  ];
  
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  console.log('🔍 利用可能な音ファイルを確認中...');
  
  for (const sample of testSamples) {
    try {
      // ピアノ音ファイルは /piano/ フォルダにある
      const isPianoFile = sample.includes('Piano MF');
      const filePath = isPianoFile ? `/sounds/MuseScore_General/samples/piano/${sample}` : `/sounds/MuseScore_General/samples/${sample}`;
      
      const response = await fetch(filePath);
      if (response.ok) {
        availableSamples.push(sample);
        console.log(`✅ ${sample}`);
      } else {
        console.log(`❌ ${sample} (HTTP ${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${sample} (${error.message})`);
    }
  }
  
  console.log(`\n📊 結果: ${availableSamples.length}/${testSamples.length} 個の音ファイルが利用可能`);
  return availableSamples;
}

// デバッグ結果をクリア
export function clearDebugResults() {
  debugResults = {
    piano: { total: 0, success: 0, failed: 0, errors: [] },
    drum: { total: 0, success: 0, failed: 0, errors: [] }
  };
  console.log('🧹 デバッグ結果をクリアしました');
}

// デバッグ結果を表示
export function showDebugResults() {
  console.log('📊 デバッグ結果:');
  console.log('🎹 ピアノ:', debugResults.piano);
  console.log('🥁 ドラム:', debugResults.drum);
}

// デフォルトでセットアップ
if (typeof window !== 'undefined') {
  window.debugAllPianoSounds = debugAllPianoSounds;
  window.debugAllDrumSounds = debugAllDrumSounds;
  window.debugAllSounds = debugAllSounds;
  window.retestFailedSounds = retestFailedSounds;
  window.getAvailableSamples = getAvailableSamples;
  window.clearDebugResults = clearDebugResults;
  window.showDebugResults = showDebugResults;
} 