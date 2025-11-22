// ピアノテスト機能
// SFZファイルから解析したキーと音の対応関係

// キーと音の対応関係（SFZファイルから抽出）
export const pianoKeyMapping = {
  // 低音域 - より近い音を使用
  12: { note: 'C0', sample: 'Piano MF C2(R).wav', pitch: -24 }, // C2を2オクターブ下げる
  13: { note: 'C#0', sample: 'Piano MF C2(R).wav', pitch: -23 },
  14: { note: 'D0', sample: 'Piano MF D2(R).wav', pitch: -24 },
  15: { note: 'D#0', sample: 'Piano MF D#0(R).wav', pitch: 0 }, // 実際のD#0ファイルを使用
  16: { note: 'E0', sample: 'Piano MF E2(R).wav', pitch: -24 },
  17: { note: 'F0', sample: 'Piano MF F0(R).wav', pitch: 0 },
  18: { note: 'F#0', sample: 'Piano MF F0(R).wav', pitch: 1 },
  19: { note: 'G0', sample: 'Piano MF G0(R).wav', pitch: 0 },
  20: { note: 'G#0', sample: 'Piano MF G0(R).wav', pitch: 1 },
  21: { note: 'A0', sample: 'Piano MF A0(R).wav', pitch: 0 },
  22: { note: 'A#0', sample: 'Piano MF A0(R).wav', pitch: 1 },
  23: { note: 'B0', sample: 'Piano MF B0(R).wav', pitch: 0 },
  
  // 中低音域
  24: { note: 'C1', sample: 'Piano MF C2(R).wav', pitch: -12 },
  25: { note: 'C#1', sample: 'Piano MF C2(R).wav', pitch: -11 },
  26: { note: 'D1', sample: 'Piano MF D1(R).wav', pitch: 0 }, // 実際のD1ファイルを使用
  27: { note: 'D#1', sample: 'Piano MF D1(R).wav', pitch: 1 },
  28: { note: 'E1', sample: 'Piano MF E1(R).wav', pitch: 0 }, // 実際のE1ファイルを使用
  29: { note: 'F1', sample: 'Piano MF F0(R).wav', pitch: 12 },
  30: { note: 'F#1', sample: 'Piano MF F0(R).wav', pitch: 13 },
  31: { note: 'G1', sample: 'Piano MF G1(R).wav', pitch: 0 },
  32: { note: 'G#1', sample: 'Piano MF G1(R).wav', pitch: 1 },
  33: { note: 'A1', sample: 'Piano MF A1(R).wav', pitch: 0 },
  34: { note: 'A#1', sample: 'Piano MF A1(R).wav', pitch: 1 },
  35: { note: 'B1', sample: 'Piano MF B1(R).wav', pitch: 0 },
  
  // 中音域
  36: { note: 'C2', sample: 'Piano MF C2(R).wav', pitch: 0 },
  37: { note: 'C#2', sample: 'Piano MF C2(R).wav', pitch: 1 },
  38: { note: 'D2', sample: 'Piano MF D2(R).wav', pitch: 0 },
  39: { note: 'D#2', sample: 'Piano MF D2(R).wav', pitch: 1 },
  40: { note: 'E2', sample: 'Piano MF E2(R).wav', pitch: 0 },
  41: { note: 'F2', sample: 'Piano MF F5(R).wav', pitch: -36 }, // F5を3オクターブ下げる（F0より近い）
  42: { note: 'F#2', sample: 'Piano MF F5(R).wav', pitch: -35 },
  43: { note: 'G2', sample: 'Piano MF G2(R).wav', pitch: 0 },
  44: { note: 'G#2', sample: 'Piano MF G2(R).wav', pitch: 1 },
  45: { note: 'A2', sample: 'Piano MF A2(R).wav', pitch: 0 },
  46: { note: 'A#2', sample: 'Piano MF A2(R).wav', pitch: 1 },
  47: { note: 'B2', sample: 'Piano MF B2(R).wav', pitch: 0 },
  
  // 中高音域
  48: { note: 'C3', sample: 'Piano MF C3(R).wav', pitch: 0 },
  49: { note: 'C#3', sample: 'Piano MF C3(R).wav', pitch: 1 },
  50: { note: 'D3', sample: 'Piano MF D3(R).wav', pitch: 0 },
  51: { note: 'D#3', sample: 'Piano MF D3(R).wav', pitch: 1 },
  52: { note: 'E3', sample: 'Piano MF E3(R).wav', pitch: 0 },
  53: { note: 'F3', sample: 'Piano MF F5(R).wav', pitch: -24 }, // F5を2オクターブ下げる
  54: { note: 'F#3', sample: 'Piano MF F5(R).wav', pitch: -23 },
  55: { note: 'G3', sample: 'Piano MF G3(R).wav', pitch: 0 },
  56: { note: 'G#3', sample: 'Piano MF G3(R).wav', pitch: 1 },
  57: { note: 'A3', sample: 'Piano MF A3(R).wav', pitch: 0 },
  58: { note: 'A#3', sample: 'Piano MF A3(R).wav', pitch: 1 },
  59: { note: 'B3', sample: 'Piano MF B3(R).wav', pitch: 0 },
  
  // 高音域
  60: { note: 'C4', sample: 'Piano MF C4(R).wav', pitch: 0 },
  61: { note: 'C#4', sample: 'Piano MF C4(R).wav', pitch: 1 },
  62: { note: 'D4', sample: 'Piano MF C4(R).wav', pitch: 2 },
  63: { note: 'D#4', sample: 'Piano MF C4(R).wav', pitch: 3 },
  64: { note: 'E4', sample: 'Piano MF E4(R).wav', pitch: 0 },
  65: { note: 'F4', sample: 'Piano MF F5(R).wav', pitch: -12 }, // F5を1オクターブ下げる
  66: { note: 'F#4', sample: 'Piano MF F5(R).wav', pitch: -11 },
  67: { note: 'G4', sample: 'Piano MF G4(R).wav', pitch: 0 },
  68: { note: 'G#4', sample: 'Piano MF G4(R).wav', pitch: 1 }, // 特殊文字問題回避: G4+1半音
  69: { note: 'A4', sample: 'Piano MF G4(R).wav', pitch: 2 },
  70: { note: 'A#4', sample: 'Piano MF G4(R).wav', pitch: 3 },
  71: { note: 'B4', sample: 'Piano MF B4(R).wav', pitch: 0 },
  
  // 超高音域
  72: { note: 'C5', sample: 'Piano MF C4(R).wav', pitch: 12 },
  73: { note: 'C#5', sample: 'Piano MF C4(R).wav', pitch: 13 }, // 特殊文字問題回避: C4+13半音
  74: { note: 'D5', sample: 'Piano MF C4(R).wav', pitch: 14 },
  75: { note: 'D#5', sample: 'Piano MF E4(R).wav', pitch: 11 }, // 特殊文字問題回避: E4+11半音
  76: { note: 'E5', sample: 'Piano MF C4(R).wav', pitch: 16 },
  77: { note: 'F5', sample: 'Piano MF F5(R).wav', pitch: 0 },
  78: { note: 'F#5', sample: 'Piano MF F5(R).wav', pitch: 1 },
  79: { note: 'G5', sample: 'Piano MF G5(R).wav', pitch: 0 },
  80: { note: 'G#5', sample: 'Piano MF G5(R).wav', pitch: 1 },
  81: { note: 'A5', sample: 'Piano MF A5(R).wav', pitch: 0 },
  82: { note: 'A#5', sample: 'Piano MF A5(R).wav', pitch: 1 },
  83: { note: 'B5', sample: 'Piano MF B5(R).wav', pitch: 0 },
  
  // 最高音域
  84: { note: 'C6', sample: 'Piano MF C#6(R).wav', pitch: -1 }, // C#6を半音下げる（C4より近い）
  85: { note: 'C#6', sample: 'Piano MF C#6(R).wav', pitch: 0 },
  86: { note: 'D6', sample: 'Piano MF C#6(R).wav', pitch: 1 }, // C#6を半音上げる
  87: { note: 'D#6', sample: 'Piano MF D#6(R).wav', pitch: 0 },
  88: { note: 'E6', sample: 'Piano MF C#6(R).wav', pitch: 3 }, // C#6を3半音上げる
  89: { note: 'F6', sample: 'Piano MF F6(R).wav', pitch: 0 },
  90: { note: 'F#6', sample: 'Piano MF F6(R).wav', pitch: 1 },
  91: { note: 'G6', sample: 'Piano MF G6(R).wav', pitch: 0 },
  92: { note: 'G#6', sample: 'Piano MF G6(R).wav', pitch: 1 },
  93: { note: 'A6', sample: 'Piano MF A6(R).wav', pitch: 0 },
  94: { note: 'A#6', sample: 'Piano MF A6(R).wav', pitch: 1 },
  95: { note: 'B6', sample: 'Piano MF B6(R).wav', pitch: 0 },
  
  // 最高音域（存在する音から生成）
  96: { note: 'C7', sample: 'Piano MF C#6(R).wav', pitch: 11 }, // C#6を11半音上げる（C4より近い）
  97: { note: 'C#7', sample: 'Piano MF C#6(R).wav', pitch: 12 }, // C#6を1オクターブ上げる
  98: { note: 'D7', sample: 'Piano MF C#6(R).wav', pitch: 13 },
  99: { note: 'D#7', sample: 'Piano MF C#6(R).wav', pitch: 14 },
  100: { note: 'E7', sample: 'Piano MF C#6(R).wav', pitch: 15 },
  101: { note: 'F7', sample: 'Piano MF F6(R).wav', pitch: 12 },
  102: { note: 'F#7', sample: 'Piano MF F6(R).wav', pitch: 13 },
  103: { note: 'G7', sample: 'Piano MF G6(R).wav', pitch: 12 },
  104: { note: 'G#7', sample: 'Piano MF G6(R).wav', pitch: 13 },
  105: { note: 'A7', sample: 'Piano MF A6(R).wav', pitch: 12 },
  106: { note: 'A#7', sample: 'Piano MF A6(R).wav', pitch: 13 },
  107: { note: 'B7', sample: 'Piano MF B6(R).wav', pitch: 12 },

  // オクターブ8（最高音域）- オクターブ6ファイルからピッチシフト
  108: { note: 'C8', sample: 'Piano MF C#6(R).wav', pitch: 23 }, // C#6を23半音上げる
  109: { note: 'C#8', sample: 'Piano MF C#6(R).wav', pitch: 24 }, // C#6を2オクターブ上げる
  110: { note: 'D8', sample: 'Piano MF D#6(R).wav', pitch: 22 },
  111: { note: 'D#8', sample: 'Piano MF D#6(R).wav', pitch: 24 }, // D#6を2オクターブ上げる
  112: { note: 'E8', sample: 'Piano MF F6(R).wav', pitch: 22 },
  113: { note: 'F8', sample: 'Piano MF F6(R).wav', pitch: 24 }, // F6を2オクターブ上げる
  114: { note: 'F#8', sample: 'Piano MF F6(R).wav', pitch: 25 },
  115: { note: 'G8', sample: 'Piano MF G6(R).wav', pitch: 24 }, // G6を2オクターブ上げる
  116: { note: 'G#8', sample: 'Piano MF G6(R).wav', pitch: 25 },
  117: { note: 'A8', sample: 'Piano MF A6(R).wav', pitch: 24 }, // A6を2オクターブ上げる
  118: { note: 'A#8', sample: 'Piano MF A6(R).wav', pitch: 25 },
  119: { note: 'B8', sample: 'Piano MF B6(R).wav', pitch: 24 }  // B6を2オクターブ上げる
};

// 音声コンテキスト
let audioContext = null;
let audioBuffers = {};

// 利用可能な音ファイル（現在のsamplesフォルダにあるもの）
const availableSamples = [
  'MTnr-sp1 roll F.wav',
  'MTnr-sp1 roll P.wav',
  'MTnr-sp1 rim 2.wav',
  'MTnr-mallet click 4.wav',
  'MTnr-sp2 roll F.wav',
  'MTnr-sp2 roll P.wav',
  'MTnr-sp2 rim 3.wav',
  'MTnr-1 roll F.wav',
  'MTnr-1 roll P.wav',
  'MTnr-1 rim 2.wav',
  'MTnr-2 roll F.wav',
  'MTnr-2 roll P.wav',
  'MTnr-2 rim 3.wav',
  '55_52_TNR3_SHELL.wav',
  'MTnr-3 roll F.wav',
  'MTnr-3 roll P.wav',
  'MTnr-3 rim 4.wav',
  '55_28_TNR4_SHELL.wav',
  'MTnr-4 roll F.wav',
  'MTnr-4 roll P.wav',
  'MTnr-4 rim 3.wav',
  'MTnr-sp1 hit 1.wav',
  'MTnr-sp2 hit 3.wav',
  'MTnr-1 mute 3.wav',
  'MTnr-1 hit 4.wav',
  'MTnr-2 mute 3.wav',
  'MTnr-2 hit 1.wav',
  'MTnr-3 mute 1.wav',
  'MTnr-3 hit 4.wav',
  'MTnr-4 mute 1.wav',
  'MTnr-4 hit 3.wav',
  '58_93_ROLL1.wav',
  '58_91_ZING1.wav',
  '58_89_SMASH1.wav',
  '58_88_MUTEDTAP1.wav',
  '58_86_BELLCHOKE1.wav',
  '58_84_BELLTAP1.wav',
  '58_83_TAPCHOKE1.wav',
  '58_81_TAP1.wav',
  '58_79_CRASHCHOKE1.wav',
  '58_77_SIZZLE1.wav',
  '58_76_HIHAT1.wav',
  '58_74_HALFCRASH1.wav',
  'MCym1 crash ff3.wav',
  'MCym1 crash mf2.wav',
  'MCym1 crash mp1.wav',
  'MCym1 crash pp2.wav',
  'MBass-2 rim 1.wav',
  'MBass-2 rim 4.wav',
  'MBass-2 hit 2.wav',
  'MBass-2 hit 3.wav',
  'MBass-3 rim 2.wav',
  'MBass-3 rim 4.wav',
  'MBass-3 hit 1.wav',
  'MBass-3 hit 4.wav',
  'MBass-4 rim 2.wav',
  'MBass-4 rim 3.wav',
  'MBass-4 hit 1.wav',
  'MBass-4 hit 3.wav',
  'MBass-5 rim 2.wav',
  'MBass-5 rim 4.wav',
  'MBass-5 hit 1.wav',
  'MBass-5 hit 4.wav',
  'MBass-5 rim 1.wav',
  'MBass-5 rim 3.wav',
  'MBass-6 hit 1.wav',
  'MBass-6 hit 2.wav',
  'MBass-6 hit 4.wav',
  'MSnr-backstick 2.wav',
  'MSnr-backstick 3.wav',
  'MSnr-shell 1.wav',
  'MSnr-shell 2.wav',
  'MSnr-shell 3.wav',
  'MSnr-stick shot 1.wav',
  'MSnr-stick shot 2.wav',
  'MSnr-stick click 1.wav',
  'MSnr-stick click 2.wav',
  'MSnr-stick click 3.wav',
  'MSnr-stick click 4.wav',
  'MSnr-rim 1.wav',
  'MSnr-rim 3.wav',
  'MSnr-rim shot 3.wav',
  'MSnr-rim shot 4.wav',
  'MSnr-hit 3.wav',
  'MSnr-hit 4.wav',
  'MSnr-crush long 1.wav',
  'MSnr-crush long 3.wav',
  'Orchcrash.wav',
  'Orch Snare.wav',
  'Brush Swirl.wav',
  'Brush Snr 2.wav',
  'Brush Snr 1.wav',
  '808 Clave.wav',
  '808 Low Conga.wav',
  '808 Mid Conga.wav',
  '808 High Conga.wav',
  '808 Cowbell.wav',
  '808 Ride.wav',
  '808 Tom 5.wav',
  '808 Tom 4.wav'
];

// 音声ファイルを読み込む
async function loadAudioFile(filename) {
  if (audioBuffers[filename]) {
    return audioBuffers[filename];
  }
  
  try {
    // ピアノ音ファイルは /piano/ フォルダにある
    const response = await fetch(`/sounds/MuseScore_General/samples/piano/${filename}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBuffers[filename] = audioBuffer;
    return audioBuffer;
  } catch (error) {
    console.warn(`ピアノ音ファイルの読み込みに失敗: ${filename} - ${error.message}`);
    return null;
  }
}

// テスト用の音を生成（実際の音ファイルがない場合）
function generateTestTone(frequency, duration = 1.0) {
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < channelData.length; i++) {
    const t = i / sampleRate;
    // サイン波 + 減衰
    const envelope = Math.exp(-t * 2);
    channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
  }
  
  return buffer;
}

// ピアノテスト機能
export function pianotest(key = 60) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  const keyInfo = pianoKeyMapping[key];
  if (!keyInfo) {
    console.warn(`キー ${key} に対応する音が見つかりません`);
    return;
  }
  
  console.log(`キー ${key} (${keyInfo.note}) を再生: ${keyInfo.sample}`);
  
  // まず実際の音ファイルを試す
  loadAudioFile(keyInfo.sample).then(audioBuffer => {
    if (audioBuffer) {
      playAudioBuffer(audioBuffer, key, keyInfo);
    } else {
      // 実際の音ファイルがない場合は、利用可能な音ファイルから選択
      const fallbackSample = availableSamples[key % availableSamples.length];
      console.log(`フォールバック音ファイルを使用: ${fallbackSample}`);
      
      loadAudioFile(fallbackSample).then(fallbackBuffer => {
        if (fallbackBuffer) {
          playAudioBuffer(fallbackBuffer, key, keyInfo);
        } else {
          // それでも失敗した場合はテストトーンを生成
          console.log('テストトーンを生成します');
          const frequency = 440 * Math.pow(2, (key - 69) / 12); // A4 (69) を基準
          const testTone = generateTestTone(frequency);
          playAudioBuffer(testTone, key, keyInfo);
        }
      });
    }
  });
}

// 音声を再生する
function playAudioBuffer(audioBuffer, key, keyInfo) {
  if (!audioBuffer) {
    console.warn(`音声バッファがありません: キー ${key}`);
    return;
  }

  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  
  source.buffer = audioBuffer;
  
  // ピッチ変更を適用
  if (keyInfo.pitch !== 0) {
    const pitchRatio = Math.pow(2, keyInfo.pitch / 12);
    source.playbackRate.value = pitchRatio;
  }
  
  // 音量調整
  gainNode.gain.value = 0.3;
  
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  source.start();
  
  console.log(`🎹 ピアノ音再生: キー ${key} (${keyInfo.note}) - ${keyInfo.sample}${keyInfo.pitch !== 0 ? ` (ピッチ: ${keyInfo.pitch > 0 ? '+' : ''}${keyInfo.pitch})` : ''}`);
}

// キーボードイベントでピアノテスト（キーボードイベントリスナーは削除）
export function setupPianoTest() {
  // キーボードイベントリスナーを削除（MIDIエディタとの競合を防ぐ）
  // document.addEventListener('keydown', (event) => {
  //   // 数字キーでテスト
  //   if (event.key >= '0' && event.key <= '9') {
  //     const key = 60 + parseInt(event.key); // C4 (60) から開始
  //     pianotest(key);
  //   }
  //   
  //   // スペースキーでC4を再生
  //   if (event.key === ' ') {
  //     pianotest(60);
  //   }
  //   
  //   // アルファベットキーでテスト（A-Z: 60-85）
  //   if (event.key >= 'a' && event.key <= 'z') {
  //     const key = 60 + (event.key.charCodeAt(0) - 'a'.charCodeAt(0));
  //     pianotest(key);
  //   }
  // });
  
  console.log('ピアノテスト機能が利用可能になりました:');
  console.log('- pianotest(key): 指定したキーを再生');
  console.log('- showAvailableKeys(): 利用可能なキーを表示');
  console.log('- showAvailableSamples(): 利用可能なサンプルを表示');
  console.log('注意: キーボードイベントは削除されました（MIDIエディタとの競合を防ぐため）');
}

// 利用可能なキーの一覧を表示
export function showAvailableKeys() {
  console.log('利用可能なキー:');
  Object.keys(pianoKeyMapping).forEach(key => {
    const info = pianoKeyMapping[key];
    console.log(`キー ${key}: ${info.note} (${info.sample})`);
  });
}

// 利用可能な音ファイルの一覧を表示
export function showAvailableSamples() {
  console.log('利用可能な音ファイル:');
  availableSamples.forEach((sample, index) => {
    console.log(`${index}: ${sample}`);
  });
}

// デフォルトでセットアップ（開発環境でのみ自動実行）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 自動実行を完全に停止（キーボードイベントの重複を防ぐ）
  // setupPianoTest();
  
  // グローバル関数として公開（手動テスト用）
  window.pianotest = pianotest;
  window.setupPianoTest = setupPianoTest;
  window.showAvailableKeys = showAvailableKeys;
  window.showAvailableSamples = showAvailableSamples;
  
  console.log('ピアノテスト機能が利用可能になりました（手動で有効化してください）:');
  console.log('- setupPianoTest() でテスト機能を有効化（キーボードイベントなし）');
  console.log('- pianotest(key) で指定したキーを再生');
  console.log('- 注意: キーボードイベントは削除されました（MIDIエディタとの競合を防ぐため）');
} 