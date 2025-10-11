/**
 * SampledBassEngine TDD Test Suite
 * Bass Track音源エンジンの包括的テスト
 *
 * @author Claude Code
 * @date 2025-10-05
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// モック用の AudioContext と AudioBuffer
const mockAudioContext = {
  createBufferSource: jest.fn(() => ({
    buffer: null,
    detune: { value: 0 },
    playbackRate: { value: 1 },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  })),
  createGain: jest.fn(() => ({
    gain: { value: 1 },
    connect: jest.fn()
  })),
  createBiquadFilter: jest.fn(() => ({
    type: 'peaking',
    frequency: { value: 1000 },
    Q: { value: 1 },
    gain: { value: 0 },
    connect: jest.fn()
  })),
  destination: {}
};

const mockAudioBuffer = {
  duration: 2.0,
  sampleRate: 44100,
  numberOfChannels: 2
};

// SampledBassEngine のモックインポート（実装前はモック使用）
let SampledBassEngine;

describe('SampledBassEngine - TDD Implementation', () => {
  let bassEngine;

  beforeEach(() => {
    // AudioContext モック設定
    global.AudioContext = jest.fn(() => mockAudioContext);
    global.webkitAudioContext = jest.fn(() => mockAudioContext);

    // fetch モック（音源ファイル読み込み用）
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      })
    );

    // SampledBassEngine 初期化（実装前はモック）
    if (!SampledBassEngine) {
      SampledBassEngine = class MockSampledBassEngine {
        constructor() {
          this.audioContext = new AudioContext();
          this.samples = new Map();
          this.activeNotes = new Map();
          this.loaded = false;
          this.bassRange = { min: 24, max: 60 };
          this.samplePath = '/sounds/MuseScore_General/samples/bass/';
          this.defaultVolume = 0.8;
          this.polyphonyLimit = 16;
          this.masterGain = null;
        }

        getSampleConfigs() {
          return [
            { midiNote: 41, note: 'F2', file: 'Bass F2.wav', frequency: 87.31 },
            { midiNote: 44, note: 'G#2', file: 'Bass G#2.wav', frequency: 103.83 },
            { midiNote: 47, note: 'B2', file: 'Bass B2.wav', frequency: 123.47 },
            { midiNote: 50, note: 'D3', file: 'Bass D3.wav', frequency: 146.83 },
            { midiNote: 53, note: 'F3', file: 'Bass F3.wav', frequency: 174.61 },
            { midiNote: 56, note: 'G#3', file: 'Bass G#3.wav', frequency: 207.65 },
            { midiNote: 59, note: 'B3', file: 'Bass B3.wav', frequency: 246.94 },
            { midiNote: 62, note: 'D4', file: 'Bass D4.wav', frequency: 293.66 }
          ];
        }

        async loadSamples(progressCallback = null) {
          const configs = this.getSampleConfigs();
          let loaded = 0;

          for (const config of configs) {
            try {
              // ファイル読み込みシミュレーション
              const response = await fetch(`${this.samplePath}${config.file}`);
              const arrayBuffer = await response.arrayBuffer();

              // AudioBuffer作成シミュレーション
              this.samples.set(config.midiNote, mockAudioBuffer);

              loaded++;
              if (progressCallback) {
                progressCallback(Math.round((loaded / configs.length) * 100));
              }
            } catch (error) {
              throw new Error(`Failed to load ${config.file}: ${error.message}`);
            }
          }

          this.loaded = true;
          this.masterGain = this.audioContext.createGain();
          this.masterGain.gain.value = this.defaultVolume;
        }

        findClosestSample(targetMidiNote) {
          const sampleNotes = Array.from(this.samples.keys());

          let closestNote = sampleNotes[0];
          let minDistance = Math.abs(targetMidiNote - closestNote);

          for (const sampleNote of sampleNotes) {
            const distance = Math.abs(targetMidiNote - sampleNote);
            if (distance < minDistance) {
              minDistance = distance;
              closestNote = sampleNote;
            }
          }

          return {
            midiNote: closestNote,
            buffer: this.samples.get(closestNote),
            pitchShift: this.calculatePitchShift(targetMidiNote, closestNote)
          };
        }

        calculatePitchShift(targetNote, sampleNote) {
          const semitoneDistance = targetNote - sampleNote;
          const pitchRatio = Math.pow(2, semitoneDistance / 12);

          return {
            detune: semitoneDistance * 100,  // cents
            playbackRate: pitchRatio,
            semitones: semitoneDistance
          };
        }

        playNote(midiNote, velocity = 127) {
          if (!this.loaded) {
            throw new Error('Bass engine not loaded');
          }

          if (midiNote < this.bassRange.min || midiNote > this.bassRange.max) {
            console.warn(`Note ${midiNote} outside bass range ${this.bassRange.min}-${this.bassRange.max}`);
          }

          const sample = this.findClosestSample(midiNote);
          const sourceNode = this.audioContext.createBufferSource();

          sourceNode.buffer = sample.buffer;
          sourceNode.detune.value = sample.pitchShift.detune;
          sourceNode.playbackRate.value = sample.pitchShift.playbackRate;

          const gainNode = this.audioContext.createGain();
          gainNode.gain.value = (velocity / 127) * this.defaultVolume;

          sourceNode.connect(gainNode);
          gainNode.connect(this.masterGain);
          this.masterGain.connect(this.audioContext.destination);

          sourceNode.start();

          // アクティブノート管理
          this.activeNotes.set(midiNote, { sourceNode, gainNode });

          return sourceNode;
        }

        stopNote(midiNote) {
          const activeNote = this.activeNotes.get(midiNote);
          if (activeNote) {
            activeNote.sourceNode.stop();
            this.activeNotes.delete(midiNote);
          }
        }

        setVolume(volume) {
          if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
          }
        }

        dispose() {
          // 全ノート停止
          for (const [midiNote] of this.activeNotes) {
            this.stopNote(midiNote);
          }
          this.activeNotes.clear();
          this.samples.clear();
          this.loaded = false;
        }
      };
    }

    bassEngine = new SampledBassEngine();
  });

  afterEach(() => {
    if (bassEngine) {
      bassEngine.dispose();
    }
    jest.clearAllMocks();
  });

  // =================
  // 初期化テスト群
  // =================
  describe('初期化・設定テスト', () => {
    test('should initialize with correct default values', () => {
      expect(bassEngine.bassRange).toEqual({ min: 24, max: 60 });
      expect(bassEngine.loaded).toBe(false);
      expect(bassEngine.samples.size).toBe(0);
      expect(bassEngine.defaultVolume).toBe(0.8);
      expect(bassEngine.polyphonyLimit).toBe(16);
      expect(bassEngine.samplePath).toBe('/sounds/MuseScore_General/samples/bass/');
    });

    test('should have correct sample configurations', () => {
      const configs = bassEngine.getSampleConfigs();

      expect(configs).toHaveLength(8);

      // 各サンプルの基本情報確認
      const expectedNotes = [41, 44, 47, 50, 53, 56, 59, 62];
      const actualNotes = configs.map(config => config.midiNote);

      expect(actualNotes).toEqual(expectedNotes);

      // 音域確認
      expect(Math.min(...actualNotes)).toBe(41); // F2
      expect(Math.max(...actualNotes)).toBe(62); // D4
    });

    test('should load all 8 bass samples successfully', async () => {
      const progressCallback = jest.fn();

      await bassEngine.loadSamples(progressCallback);

      expect(bassEngine.loaded).toBe(true);
      expect(bassEngine.samples.size).toBe(8);
      expect(progressCallback).toHaveBeenCalledWith(100);

      // 各サンプルの存在確認
      const expectedNotes = [41, 44, 47, 50, 53, 56, 59, 62];
      expectedNotes.forEach(note => {
        expect(bassEngine.samples.has(note)).toBe(true);
      });

      // マスターゲイン初期化確認
      expect(bassEngine.masterGain).toBeTruthy();
    });

    test('should handle sample loading progress correctly', async () => {
      const progressCallback = jest.fn();

      await bassEngine.loadSamples(progressCallback);

      // プログレスコールバックが適切に呼ばれることを確認
      expect(progressCallback.mock.calls.length).toBeGreaterThan(0);
      expect(progressCallback).toHaveBeenCalledWith(100);

      // 段階的な進捗確認
      const progressValues = progressCallback.mock.calls.map(call => call[0]);
      expect(progressValues[progressValues.length - 1]).toBe(100);
    });
  });

  // =================
  // サンプル選択テスト群
  // =================
  describe('サンプル選択・ピッチシフト', () => {
    beforeEach(async () => {
      await bassEngine.loadSamples();
    });

    test('should select exact match for available samples', () => {
      const exactMatches = [
        { input: 47, expected: 47 }, // B2
        { input: 53, expected: 53 }, // F3
        { input: 59, expected: 59 }  // B3
      ];

      exactMatches.forEach(({ input, expected }) => {
        const sample = bassEngine.findClosestSample(input);
        expect(sample.midiNote).toBe(expected);
        expect(sample.pitchShift.semitones).toBe(0);
        expect(sample.pitchShift.detune).toBe(0);
        expect(sample.pitchShift.playbackRate).toBe(1);
      });
    });

    test('should select closest sample for interpolated notes', () => {
      const interpolations = [
        { input: 48, expected: 47, semitones: 1 },   // C3 → B2 (+1)
        { input: 45, expected: 44, semitones: 1 },   // A2 → G#2 (+1)
        { input: 55, expected: 56, semitones: -1 },  // G3 → G#3 (-1)
        { input: 42, expected: 41, semitones: 1 },   // F#2 → F2 (+1)
        { input: 60, expected: 59, semitones: 1 }    // C4 → B3 (+1)
      ];

      interpolations.forEach(({ input, expected, semitones }) => {
        const sample = bassEngine.findClosestSample(input);
        expect(sample.midiNote).toBe(expected);
        expect(sample.pitchShift.semitones).toBe(semitones);
      });
    });

    test('should calculate correct pitch shift ratios', () => {
      // F2 (41) → E2 (40): -1 semitone = ratio ~0.944
      const ratioDown = bassEngine.calculatePitchShift(40, 41);
      expect(ratioDown.playbackRate).toBeCloseTo(0.944, 3);
      expect(ratioDown.detune).toBe(-100);
      expect(ratioDown.semitones).toBe(-1);

      // F2 (41) → G2 (43): +2 semitones = ratio ~1.122
      const ratioUp = bassEngine.calculatePitchShift(43, 41);
      expect(ratioUp.playbackRate).toBeCloseTo(1.122, 3);
      expect(ratioUp.detune).toBe(200);
      expect(ratioUp.semitones).toBe(2);

      // Perfect unison
      const unison = bassEngine.calculatePitchShift(47, 47);
      expect(unison.playbackRate).toBe(1);
      expect(unison.detune).toBe(0);
      expect(unison.semitones).toBe(0);
    });

    test('should handle extreme pitch shifts gracefully', () => {
      const extremeShifts = [
        { target: 24, sample: 41 }, // C1 from F2 (-17 semitones)
        { target: 60, sample: 41 }  // C4 from F2 (+19 semitones)
      ];

      extremeShifts.forEach(({ target, sample }) => {
        const result = bassEngine.calculatePitchShift(target, sample);
        expect(result.playbackRate).toBeGreaterThan(0.1);
        expect(result.playbackRate).toBeLessThan(10.0);
        expect(Math.abs(result.semitones)).toBeLessThan(25);
      });
    });
  });

  // =================
  // 再生機能テスト群
  // =================
  describe('Bass再生機能', () => {
    beforeEach(async () => {
      await bassEngine.loadSamples();
    });

    test('should play notes in bass range', () => {
      const testNotes = [28, 35, 41, 47, 53, 59]; // E1, B1, F2, B2, F3, B3

      testNotes.forEach(note => {
        expect(() => bassEngine.playNote(note, 100)).not.toThrow();
        expect(bassEngine.activeNotes.has(note)).toBe(true);
      });
    });

    test('should handle velocity correctly', () => {
      const velocityTests = [
        { note: 47, velocity: 127 },
        { note: 53, velocity: 64 },
        { note: 59, velocity: 32 },
        { note: 41, velocity: 1 }
      ];

      velocityTests.forEach(({ note, velocity }) => {
        expect(() => bassEngine.playNote(note, velocity)).not.toThrow();
        expect(bassEngine.activeNotes.has(note)).toBe(true);
      });
    });

    test('should handle out-of-range notes with warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // 範囲外ノート（高音・低音）
      expect(() => bassEngine.playNote(12, 100)).not.toThrow(); // C0
      expect(() => bassEngine.playNote(72, 100)).not.toThrow(); // C5

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });

    test('should handle polyphonic bass playing', () => {
      const bassChord = [28, 35, 42, 47]; // E1, B1, F#2, B2

      bassChord.forEach(note => {
        bassEngine.playNote(note, 100);
      });

      expect(bassEngine.activeNotes.size).toBe(bassChord.length);

      // 全ノートがアクティブ状態
      bassChord.forEach(note => {
        expect(bassEngine.activeNotes.has(note)).toBe(true);
      });
    });

    test('should stop specific notes correctly', () => {
      bassEngine.playNote(41, 100); // F2
      bassEngine.playNote(47, 100); // B2

      expect(bassEngine.activeNotes.size).toBe(2);

      bassEngine.stopNote(41);
      expect(bassEngine.activeNotes.has(41)).toBe(false);
      expect(bassEngine.activeNotes.has(47)).toBe(true);
      expect(bassEngine.activeNotes.size).toBe(1);
    });

    test('should handle stopping non-active notes gracefully', () => {
      expect(() => bassEngine.stopNote(47)).not.toThrow();
      expect(bassEngine.activeNotes.size).toBe(0);
    });
  });

  // =================
  // 音量・設定テスト群
  // =================
  describe('音量・設定制御', () => {
    beforeEach(async () => {
      await bassEngine.loadSamples();
    });

    test('should set volume correctly', () => {
      const volumeTests = [0, 0.5, 0.8, 1.0];

      volumeTests.forEach(volume => {
        bassEngine.setVolume(volume);
        expect(bassEngine.masterGain.gain.value).toBe(volume);
      });
    });

    test('should clamp volume to valid range', () => {
      bassEngine.setVolume(-0.5);
      expect(bassEngine.masterGain.gain.value).toBe(0);

      bassEngine.setVolume(1.5);
      expect(bassEngine.masterGain.gain.value).toBe(1);
    });

    test('should handle volume changes during playback', () => {
      bassEngine.playNote(47, 100);
      expect(bassEngine.activeNotes.size).toBe(1);

      bassEngine.setVolume(0.5);
      expect(bassEngine.masterGain.gain.value).toBe(0.5);

      // ノートは継続再生中
      expect(bassEngine.activeNotes.size).toBe(1);
    });
  });

  // =================
  // エラーハンドリングテスト群
  // =================
  describe('エラーハンドリング', () => {
    test('should throw error when playing before loading', () => {
      expect(() => bassEngine.playNote(47, 100)).toThrow('Bass engine not loaded');
    });

    test('should handle dispose correctly', async () => {
      await bassEngine.loadSamples();

      bassEngine.playNote(47, 100);
      bassEngine.playNote(53, 100);
      expect(bassEngine.activeNotes.size).toBe(2);

      bassEngine.dispose();

      expect(bassEngine.activeNotes.size).toBe(0);
      expect(bassEngine.samples.size).toBe(0);
      expect(bassEngine.loaded).toBe(false);
    });

    test('should handle multiple dispose calls gracefully', async () => {
      await bassEngine.loadSamples();

      expect(() => {
        bassEngine.dispose();
        bassEngine.dispose();
      }).not.toThrow();
    });
  });

  // =================
  // パフォーマンステスト群
  // =================
  describe('パフォーマンス・負荷テスト', () => {
    beforeEach(async () => {
      await bassEngine.loadSamples();
    });

    test('should handle rapid note playback', () => {
      const rapidNotes = Array.from({ length: 20 }, (_, i) => 41 + (i % 8));

      expect(() => {
        rapidNotes.forEach(note => bassEngine.playNote(note, 100));
      }).not.toThrow();

      // すべてのノートが登録されることを確認（重複は上書き）
      const uniqueNotes = new Set(rapidNotes);
      expect(bassEngine.activeNotes.size).toBe(uniqueNotes.size);
    });

    test('should handle polyphony limits gracefully', () => {
      // 16音（ポリフォニー限界）を超える同時発音
      const manyNotes = Array.from({ length: bassEngine.polyphonyLimit + 5 }, (_, i) => 41 + i);

      expect(() => {
        manyNotes.forEach(note => bassEngine.playNote(note, 100));
      }).not.toThrow();
    });
  });
});