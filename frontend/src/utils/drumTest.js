// ドラムテスト機能
// 現在利用可能なドラム音ファイルを使用

// ドラム音の分類と対応
export const drumMapping = {
  // タム（MTnr = Tom）
  '1': { name: 'Tom 1', samples: ['MTnr-1 hit 4.wav', 'MTnr-1 hit 4.wav', 'MTnr-1 roll F.wav', 'MTnr-1 roll P.wav', 'MTnr-1 rim 2.wav', 'MTnr-1 mute 3.wav'] },
  '2': { name: 'Tom 2', samples: ['MTnr-2 hit 1.wav', 'MTnr-2 hit 1.wav', 'MTnr-2 roll F.wav', 'MTnr-2 roll P.wav', 'MTnr-2 rim 3.wav', 'MTnr-2 mute 3.wav'] },
  '3': { name: 'Tom 3', samples: ['MTnr-3 hit 4.wav', 'MTnr-3 roll F.wav', 'MTnr-3 roll P.wav', 'MTnr-3 rim 4.wav', 'MTnr-3 mute 1.wav'] },
  '4': { name: 'Tom 4', samples: ['MTnr-4 hit 3.wav', 'MTnr-4 roll F.wav', 'MTnr-4 roll P.wav', 'MTnr-4 rim 3.wav', 'MTnr-4 mute 1.wav'] },
  
  // スネアドラム（MSnr = Snare）
  'q': { name: 'Snare Hit', samples: ['MSnr-hit 4.wav'] },
  'w': { name: 'Snare Rim', samples: ['MSnr-rim 3.wav'] },
  'e': { name: 'Snare Rim Shot', samples: ['MSnr-rim shot 4.wav'] },
  'r': { name: 'Snare Shell', samples: ['MSnr-shell 1.wav', 'MSnr-shell 2.wav', 'MSnr-shell 3.wav'] },
  't': { name: 'Snare Stick', samples: ['MSnr-stick click 4.wav'] },
  'y': { name: 'Snare Stick Shot', samples: ['MSnr-stick shot 2.wav'] },
  'u': { name: 'Snare Backstick', samples: ['MSnr-backstick 3.wav'] },
  'i': { name: 'Snare Crush', samples: ['MSnr-crush long 1.wav', 'MSnr-crush long 3.wav'] },
  
  // バスドラム（MBass = Bass）
  'a': { name: 'Bass 2', samples: ['MBass-2 hit 3.wav'] },
  's': { name: 'Bass 3', samples: ['MBass-3 hit 1.wav', 'MBass-3 hit 4.wav', 'MBass-3 rim 2.wav', 'MBass-3 rim 4.wav'] },
  'd': { name: 'Bass 4', samples: ['MBass-4 hit 1.wav', 'MBass-4 hit 3.wav', 'MBass-4 rim 2.wav', 'MBass-4 rim 3.wav'] },
  'f': { name: 'Bass 5', samples: ['MBass-5 hit 1.wav', 'MBass-5 hit 4.wav', 'MBass-5 rim 1.wav', 'MBass-5 rim 2.wav', 'MBass-5 rim 3.wav', 'MBass-5 rim 4.wav'] },
  'g': { name: 'Bass 6', samples: ['MBass-6 hit 1.wav', 'MBass-6 hit 2.wav', 'MBass-6 hit 4.wav'] },
  
  // シンバル（MCym = Cymbal）
  'z': { name: 'Crash FF', samples: ['MCym1 crash ff3.wav'] },
  'x': { name: 'Crash MF', samples: ['MCym1 crash mf2.wav'] },
  'c': { name: 'Crash MP', samples: ['MCym1 crash mp1.wav'] },
  'v': { name: 'Crash PP', samples: ['MCym1 crash pp2.wav'] },
  'b': { name: 'Half Crash', samples: ['58_74_HALFCRASH1.wav'] },
  'n': { name: 'Orch Crash', samples: ['Orchcrash.wav'] },
  
  // ハイハット
  'h': { name: 'Hi-Hat', samples: ['58_76_HIHAT1.wav'] },
  'j': { name: 'Hi-Hat Sizzle', samples: ['58_77_SIZZLE1.wav'] },
  
  // その他のシンバル
  'k': { name: 'Crash Choke', samples: ['58_79_CRASHCHOKE1.wav'] },
  'l': { name: 'Bell Tap', samples: ['58_84_BELLTAP1.wav'] },
  ';': { name: 'Bell Choke', samples: ['58_86_BELLCHOKE1.wav'] },
  "'": { name: 'Tap', samples: ['58_81_TAP1.wav'] },
  '\\': { name: 'Tap Choke', samples: ['58_83_TAPCHOKE1.wav'] },
  ']': { name: 'Muted Tap', samples: ['58_88_MUTEDTAP1.wav'] },
  '[': { name: 'Smash', samples: ['58_89_SMASH1.wav'] },
  'p': { name: 'Zing', samples: ['58_91_ZING1.wav'] },
  'o': { name: 'Roll', samples: ['58_93_ROLL1.wav'] },
  
  // スネアドラム（その他）
  'm': { name: 'Orch Snare', samples: ['Orch Snare.wav'] },
  ',': { name: 'Brush Snare 1', samples: ['Brush Snr 1.wav'] },
  '.': { name: 'Brush Snare 2', samples: ['Brush Snr 2.wav'] },
  '/': { name: 'Brush Swirl', samples: ['Brush Swirl.wav'] },
  
  // 808ドラムマシン
  '0': { name: '808 Clave', samples: ['808 Clave.wav'] },
  '9': { name: '808 Cowbell', samples: ['808 Cowbell.wav'] },
  '8': { name: '808 Ride', samples: ['808 Ride.wav'] },
  '7': { name: '808 Tom 4', samples: ['808 Tom 4.wav'] },
  '6': { name: '808 Tom 5', samples: ['808 Tom 5.wav'] },
  '5': { name: '808 High Conga', samples: ['808 High Conga.wav'] },
  '4': { name: '808 Mid Conga', samples: ['808 Mid Conga.wav'] },
  '3': { name: '808 Low Conga', samples: ['808 Low Conga.wav'] },
  
  // スペシャル
  ' ': { name: 'Random Drum', samples: [] } // ランダム再生用
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
    const response = await fetch(`/sounds/MuseScore_General/samples/${filename}`);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBuffers[filename] = audioBuffer;
    return audioBuffer;
  } catch (error) {
    console.warn(`音声ファイルの読み込みに失敗: ${filename}`, error);
    return null;
  }
}

// ランダムなドラム音を選択
function getRandomDrumSample() {
  const allSamples = [
    'MTnr-1 hit 1.wav', 'MTnr-1 hit 4.wav', 'MTnr-2 hit 1.wav', 'MTnr-2 hit 3.wav',
    'MTnr-3 hit 4.wav', 'MTnr-4 hit 3.wav', 'MSnr-hit 3.wav', 'MSnr-hit 4.wav',
    'MBass-2 hit 2.wav', 'MBass-2 hit 3.wav', 'MBass-3 hit 1.wav', 'MBass-3 hit 4.wav',
    'MBass-4 hit 1.wav', 'MBass-4 hit 3.wav', 'MBass-5 hit 1.wav', 'MBass-5 hit 4.wav',
    'MBass-6 hit 1.wav', 'MBass-6 hit 2.wav', 'MBass-6 hit 4.wav',
    'MCym1 crash ff3.wav', 'MCym1 crash mf2.wav', 'MCym1 crash mp1.wav', 'MCym1 crash pp2.wav',
    '58_76_HIHAT1.wav', '58_77_SIZZLE1.wav', '58_81_TAP1.wav', '58_84_BELLTAP1.wav',
    '808 Clave.wav', '808 Cowbell.wav', '808 Ride.wav', '808 Tom 4.wav', '808 Tom 5.wav'
  ];
  return allSamples[Math.floor(Math.random() * allSamples.length)];
}

// ドラムテスト機能
export function drumtest(key) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  const drumInfo = drumMapping[key];
  if (!drumInfo) {
    console.warn(`キー '${key}' に対応するドラムが見つかりません`);
    return;
  }
  
  let sampleFile;
  if (drumInfo.name === 'Random Drum') {
    sampleFile = getRandomDrumSample();
  } else {
    // 利用可能なサンプルからランダムに選択
    const availableSamples = drumInfo.samples.filter(sample => 
      sample && sample.length > 0
    );
    if (availableSamples.length === 0) {
      console.warn(`ドラム '${drumInfo.name}' に利用可能なサンプルがありません`);
      return;
    }
    sampleFile = availableSamples[Math.floor(Math.random() * availableSamples.length)];
  }
  
  console.log(`ドラム '${drumInfo.name}' を再生: ${sampleFile}`);
  
  loadAudioFile(sampleFile).then(audioBuffer => {
    if (audioBuffer) {
      playDrumSound(audioBuffer, drumInfo.name);
    } else {
      console.warn(`音声ファイルの読み込みに失敗: ${sampleFile}`);
    }
  });
}

// ドラム音を再生
function playDrumSound(audioBuffer, drumName) {
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  
  // 音量調整（ドラムの種類によって調整）
  const gainNode = audioContext.createGain();
  let volume = 0.7;
  
  // ドラムの種類に応じて音量を調整
  if (drumName.includes('Bass')) {
    volume = 0.8; // バスドラムは少し大きく
  } else if (drumName.includes('Crash') || drumName.includes('Cymbal')) {
    volume = 0.6; // シンバルは少し小さく
  } else if (drumName.includes('Hi-Hat')) {
    volume = 0.5; // ハイハットは小さく
  }
  
  gainNode.gain.value = volume;
  
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  source.start();
  
  console.log(`再生完了: ${drumName} (音量: ${volume})`);
}

// キーボードイベントでドラムテスト（キーボードイベントリスナーは削除）
export function setupDrumTest() {
  // キーボードイベントリスナーを削除（MIDIエディタとの競合を防ぐ）
  // document.addEventListener('keydown', (event) => {
  //   const key = event.key.toLowerCase();
  //   
  //   // ドラムマッピングに含まれるキーの場合
  //   if (drumMapping[key] || drumMapping[event.key]) {
  //     event.preventDefault(); // デフォルトの動作を防ぐ
  //     drumtest(key);
  //   }
  // });
  
  console.log('ドラムテスト機能が利用可能になりました:');
  console.log('- drumtest(key): 指定したキーのドラムを再生');
  console.log('- showDrumMapping(): ドラムマッピングを表示');
  console.log('- showDrumDetails(key): 特定のドラムの詳細を表示');
  console.log('- playDrumPattern(pattern, tempo): ドラムパターンを再生');
  console.log('注意: キーボードイベントは削除されました（MIDIエディタとの競合を防ぐため）');
}

// ドラムマッピングを表示
export function showDrumMapping() {
  console.log('ドラムマッピング:');
  Object.keys(drumMapping).forEach(key => {
    const info = drumMapping[key];
    console.log(`'${key}': ${info.name} (${info.samples.length} samples)`);
  });
}

// 特定のドラムの詳細を表示
export function showDrumDetails(key) {
  const drumInfo = drumMapping[key];
  if (drumInfo) {
    console.log(`ドラム '${key}': ${drumInfo.name}`);
    console.log('利用可能なサンプル:');
    drumInfo.samples.forEach((sample, index) => {
      console.log(`  ${index + 1}: ${sample}`);
    });
  } else {
    console.warn(`キー '${key}' に対応するドラムが見つかりません`);
  }
}

// ドラムパターンを再生
export function playDrumPattern(pattern, tempo = 120) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  const beatDuration = 60 / tempo; // 1拍の秒数
  const patternArray = pattern.split(' ');
  
  patternArray.forEach((beat, index) => {
    if (beat !== '-') {
      setTimeout(() => {
        drumtest(beat);
      }, index * beatDuration * 1000);
    }
  });
  
  console.log(`ドラムパターンを再生: ${pattern} (テンポ: ${tempo} BPM)`);
}

// デフォルトでセットアップ（開発環境でのみ自動実行）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 自動実行を完全に停止（キーボードイベントの重複を防ぐ）
  // setupDrumTest();
  
  // グローバル関数として公開（手動テスト用）
  window.drumtest = drumtest;
  window.setupDrumTest = setupDrumTest;
  window.showDrumMapping = showDrumMapping;
  window.showDrumDetails = showDrumDetails;
  window.playDrumPattern = playDrumPattern;
  
  console.log('ドラムテスト機能が利用可能になりました（手動で有効化してください）:');
  console.log('- setupDrumTest() でテスト機能を有効化（キーボードイベントなし）');
  console.log('- drumtest(key) で指定したキーのドラムを再生');
  console.log('- 注意: キーボードイベントは削除されました（MIDIエディタとの競合を防ぐため）');
} 