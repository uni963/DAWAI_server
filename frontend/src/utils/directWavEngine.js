// 直接WAVファイルを読み込むシンプルなエンジン
import * as Tone from 'tone';

class DirectWavEngine {
  constructor() {
    this.isInitialized = false;
    this.pianoSamples = {};
    this.drumSamples = {};
    this.audioContext = null;
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log('🎵 Initializing DirectWavEngine...');

      // Tone.jsの初期化
      if (Tone.context.state === 'suspended') {
        await Tone.start();
      }

      // ピアノサンプルの読み込み
      await this.loadPianoSamples();
      
      // ドラムサンプルの読み込み
      await this.loadDrumSamples();

      this.isInitialized = true;
      console.log('🎵 DirectWavEngine initialized successfully');
      
      // グローバルテスト関数を作成
      window.testDirectWavPiano = async (noteNumber = 60) => {
        console.log(`🎵 Testing direct WAV piano note: ${noteNumber}`);
        await this.playPianoNote(noteNumber);
      };

      window.testDirectWavDrums = async (noteNumber = 36) => {
        console.log(`🎵 Testing direct WAV drum note: ${noteNumber}`);
        await this.playDrumNote(noteNumber);
      };

      return true;
    } catch (error) {
      console.error('Failed to initialize DirectWavEngine:', error);
      throw error;
    }
  }

  async loadPianoSamples() {
    console.log('🎵 Loading piano samples directly from SFZ...');
    
    try {
      // SFZファイルを読み込み
      const response = await fetch('/sounds/MuseScore_General/000_Grand Piano.sfz');
      const sfzContent = await response.text();
      
      console.log('🎵 SFZ content preview:', sfzContent.substring(0, 500));
      
      // サンプル行を抽出
      const sampleLines = sfzContent.split('\n').filter(line => 
        line.includes('sample=samples\\') && line.includes('.wav')
      );
      
      console.log(`🎵 Found ${sampleLines.length} piano samples in SFZ`);
      console.log('🎵 Sample lines:', sampleLines.slice(0, 5));
      
      // 各サンプルを読み込み
      for (const line of sampleLines) {
        const match = line.match(/sample=samples\\([^)]+\.wav)/);
        if (match) {
          const wavFile = match[1];
          const wavPath = `/sounds/MuseScore_General/samples/${wavFile}`;
          
          try {
            console.log(`🎵 Loading piano sample: ${wavPath}`);
            const audioBuffer = await this.loadWavFile(wavPath);
            
            // 音階を推定（ファイル名から）
            const noteMatch = wavFile.match(/([A-G]#?\d+)/);
            if (noteMatch) {
              const noteName = noteMatch[1];
              const midiNote = this.noteNameToMidi(noteName);
              
              if (midiNote !== null) {
                this.pianoSamples[midiNote] = {
                  buffer: audioBuffer,
                  path: wavPath,
                  noteName: noteName
                };
                console.log(`🎵 Loaded piano sample for ${noteName} (MIDI: ${midiNote})`);
              }
            }
          } catch (error) {
            console.error(`🎵 Error loading piano sample ${wavPath}:`, error);
          }
        }
      }
      
      console.log(`🎵 Loaded ${Object.keys(this.pianoSamples).length} piano samples`);
      console.log('🎵 Available piano notes:', Object.keys(this.pianoSamples).map(n => this.midiToNoteName(n)));
      
    } catch (error) {
      console.error('🎵 Error loading piano samples:', error);
    }
  }

  async loadDrumSamples() {
    console.log('🎵 Loading drum samples directly from SFZ...');
    
    try {
      // SFZファイルを読み込み
      const response = await fetch('/sounds/MuseScore_General/000_Standard.sfz');
      const sfzContent = await response.text();
      
      // サンプル行を抽出
      const sampleLines = sfzContent.split('\n').filter(line => 
        line.includes('sample=samples\\') && line.includes('.wav')
      );
      
      console.log(`🎵 Found ${sampleLines.length} drum samples in SFZ`);
      
      // 各サンプルを読み込み
      for (const line of sampleLines) {
        const match = line.match(/sample=samples\\([^)]+\.wav)/);
        if (match) {
          const wavFile = match[1];
          const wavPath = `/sounds/MuseScore_General/samples/${wavFile}`;
          
          try {
            console.log(`🎵 Loading drum sample: ${wavPath}`);
            const audioBuffer = await this.loadWavFile(wavPath);
            
            // 音階を推定（ファイル名から）
            const noteMatch = wavFile.match(/([A-G]#?\d+)/);
            if (noteMatch) {
              const noteName = noteMatch[1];
              const midiNote = this.noteNameToMidi(noteName);
              
              if (midiNote !== null) {
                this.drumSamples[midiNote] = {
                  buffer: audioBuffer,
                  path: wavPath,
                  noteName: noteName
                };
                console.log(`🎵 Loaded drum sample for ${noteName} (MIDI: ${midiNote})`);
              }
            }
          } catch (error) {
            console.error(`🎵 Error loading drum sample ${wavPath}:`, error);
          }
        }
      }
      
      console.log(`🎵 Loaded ${Object.keys(this.drumSamples).length} drum samples`);
      
    } catch (error) {
      console.error('🎵 Error loading drum samples:', error);
    }
  }

  async loadWavFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return await audioContext.decodeAudioData(arrayBuffer);
  }

  async playPianoNote(midiNote) {
    const sample = this.pianoSamples[midiNote];
    if (sample) {
      const player = new Tone.Player(sample.buffer).toDestination();
      player.start();
      console.log(`🎵 Playing piano note ${midiNote} (${sample.noteName})`);
    } else {
      console.log(`🎵 Piano sample not found for note ${midiNote}`);
      console.log('🎵 Available piano notes:', Object.keys(this.pianoSamples));
    }
  }

  async playDrumNote(midiNote) {
    const sample = this.drumSamples[midiNote];
    if (sample) {
      const player = new Tone.Player(sample.buffer).toDestination();
      player.start();
      console.log(`🎵 Playing drum note ${midiNote} (${sample.noteName})`);
    } else {
      console.log(`🎵 Drum sample not found for note ${midiNote}`);
      console.log('🎵 Available drum notes:', Object.keys(this.drumSamples));
    }
  }

  // 音階名をMIDIノート番号に変換
  noteNameToMidi(noteName) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const match = noteName.match(/([A-G]#?)(\d+)/);
    
    if (match) {
      const note = match[1];
      const octave = parseInt(match[2]);
      const noteIndex = noteNames.indexOf(note);
      
      if (noteIndex !== -1) {
        return noteIndex + (octave + 1) * 12;
      }
    }
    
    return null;
  }

  // MIDIノート番号を音階名に変換
  midiToNoteName(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
  }
}

export default DirectWavEngine; 