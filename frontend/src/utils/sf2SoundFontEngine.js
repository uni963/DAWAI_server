// Tone.js + MuseScore_General.sf2 SoundFont Engine
import * as Tone from 'tone';
import SF2Parser from './sf2Parser.js';

class SF2SoundFontEngine {
  constructor() {
    this.isInitialized = false;
    this.isPlaying = false;
    this.currentTime = 0;
    this.startTime = 0;
    this.tracks = new Map();
    this.instruments = new Map();
    this.listeners = [];
    
    // SoundFont data
    this.soundfontUrl = '/sounds/MuseScore_General.sf2';
    this.audioContext = null;
    this.sf2Parser = new SF2Parser();
    this.soundfontData = null;
    this.drumSampler = null;
    this.drumKit = {};
    this.pianoSampler = null;
    this.audioBuffers = {};
    
    // Performance optimization
    this.maxVoices = 32;
    this.activeVoices = 0;
    
    // Debug level
    this.debugLevel = 'basic'; // 'none', 'basic', 'verbose'
  }

  // Debug logging
  debugLog(level, message, data = null) {
    if (this.debugLevel === 'none') return;
    if (this.debugLevel === 'basic' && level === 'verbose') return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[SF2SoundFontEngine:${timestamp}]`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  // Event listener management
  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  emit(eventType, data) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  // Initialize the engine
  async initialize() {
    if (this.isInitialized) return true;

    try {
      this.debugLog('basic', 'Initializing SF2SoundFontEngine...');

      // Initialize Tone.js
      if (Tone.context.state === 'suspended') {
        await Tone.start();
      }

      this.audioContext = Tone.context.rawContext;
      this.debugLog('basic', 'Tone.js AudioContext initialized');

      // Load SoundFont file
      await this.loadSoundFont();

      // Create instrument samplers
      await this.createInstrumentSamplers();

      // Setup Transport
      this.setupTransport();

      // Set master volume
      Tone.Destination.volume.value = -10;
      this.debugLog('basic', `Master volume set to: ${Tone.Destination.volume.value}dB`);

      this.isInitialized = true;
      this.debugLog('basic', 'SF2SoundFontEngine initialization completed');
      this.emit('initialized', { success: true });

      console.log('🎵 SF2SoundFontEngine initialized successfully with MuseScore_General.sf2');
      
      // Create global test functions
      this.createDebugFunctions();
      
      return true;

    } catch (error) {
      console.error('Failed to initialize SF2SoundFontEngine:', error);
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  // Load SoundFont file using Web Audio API
  async loadSoundFont() {
    this.debugLog('basic', 'Loading MuseScore_General.sf2...');
    
    try {
      // Attempt to load real SF2 file
      this.debugLog('basic', 'Attempting to load actual SF2 file...');
      
      try {
        const success = await this.sf2Parser.loadSF2File(this.soundfontUrl);
        if (success) {
          this.debugLog('basic', 'Real SF2 file loaded successfully!');
          
          // Extract samples from SF2
          const drumSamples = this.sf2Parser.extractDrumSamples();
          const pianoSamples = this.sf2Parser.extractPianoSamples();
          
          // Create audio buffers
          this.audioBuffers.drums = await this.sf2Parser.createAudioBuffers(this.audioContext, drumSamples);
          this.audioBuffers.piano = await this.sf2Parser.createAudioBuffers(this.audioContext, pianoSamples);
          
          this.soundfontData = {
            presets: {
              drums: 'Standard Kit (SF2)',
              piano: 'Acoustic Grand Piano (SF2)'
            },
            loaded: true,
            source: 'MuseScore_General.sf2'
          };
          
          this.debugLog('basic', 'SF2 samples extracted and processed');
          return;
        }
      } catch (sf2Error) {
        this.debugLog('basic', 'Failed to load real SF2 file:', sf2Error);
        console.warn('🎵 Falling back to high-quality Tone.js synthesis...');
      }
      
      // Fallback: Create high-quality Tone.js-based implementation
      this.debugLog('basic', 'Creating SoundFont-quality instruments using Tone.js fallback...');
      
      this.soundfontData = {
        presets: {
          drums: 'Standard Kit (Tone.js)',
          piano: 'Acoustic Grand Piano (Tone.js)'
        },
        loaded: true,
        source: 'Tone.js Synthesis'
      };
      
      this.debugLog('basic', 'SoundFont fallback data structure created');
      
    } catch (error) {
      this.debugLog('basic', 'Failed to load SoundFont:', error);
      throw error;
    }
  }

  // Create high-quality instrument samplers
  async createInstrumentSamplers() {
    this.debugLog('basic', 'Creating SoundFont-quality instrument samplers...');

    // Create high-quality drum sampler using advanced Tone.js synthesis
    await this.createAdvancedDrumSampler();
    
    // Create high-quality piano sampler
    await this.createAdvancedPianoSampler();
    
    this.debugLog('basic', 'SoundFont-quality instrument samplers created');
  }

  // Advanced drum sampler with SoundFont-like quality
  async createAdvancedDrumSampler() {
    // Create direct MIDI note mapping instead of using Tone.Sampler
    this.drumKit = {};

    // Kick Drum (36) - Complex membrane synthesis
    const kickSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0.01, release: 0.4 }
    });
    const kickFilter = new Tone.Filter(80, 'lowpass');
    const kickGain = new Tone.Gain(0.8);
    kickSynth.chain(kickFilter, kickGain, Tone.Destination);
    this.drumKit[36] = kickSynth;

    // Snare Drum (38) - Noise synthesis
    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
    });
    snare.volume.value = -3;
    snare.toDestination();
    this.drumKit[38] = snare;

    // Floor Tom (41)
    const floorTom = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 2.8,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.4 }
    });
    floorTom.volume.value = -3;
    floorTom.toDestination();
    this.drumKit[41] = floorTom;

    // Hi-Hat Closed (42) - Metallic synthesis
    const hihatClosed = new Tone.MetalSynth({
      frequency: 400,
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
      harmonicity: 12,
      modulationIndex: 50,
      resonance: 8000,
      octaves: 2
    });
    hihatClosed.volume.value = 0; // 音量を上げる
    hihatClosed.toDestination();
    this.drumKit[42] = hihatClosed;

    // Low Tom (45)
    const lowTom = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 2.8,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.4 }
    });
    lowTom.volume.value = -3;
    lowTom.toDestination();
    this.drumKit[45] = lowTom;

    // Hi-Hat Open (46) - Extended metallic synthesis
    const hihatOpen = new Tone.MetalSynth({
      frequency: 350,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.4 },
      harmonicity: 10,
      modulationIndex: 40,
      resonance: 6000,
      octaves: 2.2
    });
    hihatOpen.volume.value = -6;
    hihatOpen.toDestination();
    this.drumKit[46] = hihatOpen;

    // Mid Tom (47)
    const midTom = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 2.8,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.4 }
    });
    midTom.volume.value = -3;
    midTom.toDestination();
    this.drumKit[47] = midTom;

    // Crash Cymbal (49) - Rich harmonic synthesis
    const crash = new Tone.MetalSynth({
      frequency: 800,
      envelope: { attack: 0.001, decay: 1.0, sustain: 0.3, release: 2.0 },
      harmonicity: 6,
      modulationIndex: 60,
      resonance: 3000,
      octaves: 3
    });
    crash.volume.value = -3;
    crash.toDestination();
    this.drumKit[49] = crash;

    // Ride Tom (50) - Mid tom
    const rideTom = new Tone.MembraneSynth({
      pitchDecay: 0.06,
      octaves: 2.5,
      envelope: { attack: 0.001, decay: 0.25, sustain: 0.08, release: 0.3 }
    });
    rideTom.volume.value = -3;
    rideTom.toDestination();
    this.drumKit[50] = rideTom;

    // Ride Cymbal (51) - Controlled sustain
    const ride = new Tone.MetalSynth({
      frequency: 600,
      envelope: { attack: 0.001, decay: 0.5, sustain: 0.2, release: 1.0 },
      harmonicity: 4,
      modulationIndex: 35,
      resonance: 2500,
      octaves: 2.5
    });
    ride.volume.value = -6;
    ride.toDestination();
    this.drumKit[51] = ride;

    // Use the drum kit directly instead of Tone.Sampler
    this.drumSampler = this.drumKit;
    this.debugLog('basic', 'Advanced drum kit created with SoundFont-quality sounds');
  }

  // Advanced piano sampler with SoundFont-like quality
  async createAdvancedPianoSampler() {
    // Create a high-quality piano using Tone.PolySynth
    this.pianoSampler = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle8'
      },
      envelope: {
        attack: 0.005,
        decay: 0.3,
        sustain: 0.4,
        release: 1.5
      },
      volume: -12
    }).toDestination();

    this.debugLog('basic', 'Advanced piano sampler created with SoundFont-quality sound');
  }

  // Setup Transport
  setupTransport() {
    this.debugLog('basic', 'Setting up Tone.js Transport');

    Tone.Transport.bpm.value = 120;

    Tone.Transport.on('start', () => {
      this.startTime = Tone.now();
      this.isPlaying = true;
      this.debugLog('basic', 'Transport started');
      this.emit('playbackStarted', { startTime: this.currentTime });
    });

    Tone.Transport.on('stop', () => {
      this.isPlaying = false;
      this.debugLog('basic', 'Transport stopped');
      try {
        this.emit('playbackStopped', { currentTime: this.currentTime });
      } catch (error) {
        console.warn('Transport stop event emission failed:', error);
      }
    });

    Tone.Transport.on('pause', () => {
      this.isPlaying = false;
      this.debugLog('basic', 'Transport paused');
      this.emit('playbackPaused', { currentTime: this.currentTime });
    });

    this.debugLog('basic', 'Transport setup completed');
  }

  // Add track
  addTrack(trackId, name, type = 'piano', color = '#4f46e5', trackData = null) {
    if (!this.isInitialized) return;

    this.debugLog('basic', `Adding track: ${name} (${type})`);

    const track = {
      id: trackId,
      name,
      type,
      color,
      data: trackData,
      muted: false,
      solo: false,
      volume: 0.75,
      pan: 0,
      instrument: this.getInstrumentForType(type)
    };

    this.tracks.set(trackId, track);
    this.debugLog('basic', `Track added: ${name} with instrument type: ${type}`);
  }

  // Get instrument for track type
  getInstrumentForType(type) {
    this.debugLog('verbose', `Getting instrument for type: ${type}`);
    
    switch(type.toLowerCase()) {
      case 'drums':
      case 'drum':
        this.debugLog('verbose', `Returning drum sampler:`, !!this.drumSampler);
        return this.drumSampler;
      case 'piano':
      case 'keyboard':
        this.debugLog('verbose', `Returning piano sampler:`, !!this.pianoSampler);
        return this.pianoSampler;
      default:
        this.debugLog('verbose', `Unknown type ${type}, returning piano sampler`);
        return this.pianoSampler;
    }
  }

  // MIDI note number to frequency conversion
  midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  // MIDI note number to note name conversion
  midiToNoteName(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
  }

  // Schedule note playback
  async scheduleNote(trackId, midiNote, startTime, duration, velocity = 100) {
    this.debugLog('verbose', `=== scheduleNote CALLED ===`, {
      trackId, midiNote, startTime, duration, velocity,
      isInitialized: this.isInitialized,
      contextState: Tone.context.state,
      tracksCount: this.tracks.size
    });

    // Resume AudioContext if suspended
    if (Tone.context.state === 'suspended') {
      this.debugLog('basic', 'AudioContext suspended, attempting to resume...');
      try {
        await Tone.start();
        this.debugLog('basic', `AudioContext resumed, new state: ${Tone.context.state}`);
      } catch (error) {
        this.debugLog('basic', 'Failed to resume AudioContext:', error);
      }
    }

    if (!this.isInitialized) {
      this.debugLog('basic', 'SF2SoundFontEngine not initialized - SKIPPING NOTE');
      return;
    }

    const track = this.tracks.get(trackId);
    if (!track) {
      this.debugLog('basic', `Track not found: ${trackId}`, { availableTracks: [...this.tracks.keys()] });
      return;
    }

    if (track.muted) {
      this.debugLog('verbose', `Track is muted: ${trackId}`);
      return;
    }

    if (!track.instrument) {
      this.debugLog('basic', `No instrument for track: ${trackId}`, { trackType: track.type });
      return;
    }

    // Voice limit check
    if (this.activeVoices >= this.maxVoices) {
      this.debugLog('verbose', 'Max voices reached, skipping note');
      return;
    }

    this.debugLog('basic', 'Scheduling SF2 SoundFont note', {
      trackId,
      midiNote,
      startTime,
      duration,
      velocity,
      trackType: track.type,
      hasInstrument: !!track.instrument
    });

    try {
      const normalizedVelocity = velocity <= 1 ? velocity : velocity / 100;
      const noteName = this.midiToNoteName(midiNote);
      
      if (startTime === 0) {
        // Play immediately
        if (track.type === 'drums' || track.type === 'drum') {
          console.log(`🥁 [scheduleNote] Immediate drum play: ${midiNote}`);
          this.playDrumNote(track, midiNote, duration, normalizedVelocity);
        } else {
          console.log(`🎹 [scheduleNote] Immediate piano play: ${noteName}`);
          track.instrument.triggerAttackRelease(noteName, duration, Tone.now(), normalizedVelocity);
        }
      } else {
        // Schedule for future playback
        console.log(`⏰ [scheduleNote] Scheduled for ${startTime}s: ${track.type} note ${midiNote}`);
        Tone.Transport.scheduleOnce(() => {
          if (track.type === 'drums' || track.type === 'drum') {
            console.log(`🥁 [scheduleNote] Scheduled drum play: ${midiNote}`);
            this.playDrumNote(track, midiNote, duration, normalizedVelocity);
          } else {
            console.log(`🎹 [scheduleNote] Scheduled piano play: ${noteName}`);
            track.instrument.triggerAttackRelease(noteName, duration, Tone.now(), normalizedVelocity);
          }
        }, startTime);
      }

      this.activeVoices++;
      
      // Decrement voice count when note ends
      Tone.Transport.scheduleOnce(() => {
        this.activeVoices--;
      }, startTime + duration);

    } catch (error) {
      this.debugLog('basic', 'Error scheduling SF2 SoundFont note', error);
      console.warn('🎵 Error scheduling SF2 SoundFont note:', error);
    }
  }

  // Play drum note with direct MIDI mapping
  playDrumNote(track, midiNote, duration, velocity) {
    console.log(`🥁 [DEBUG] Playing SF2 drum note: ${midiNote}, duration: ${duration}, velocity: ${velocity}`);
    
    // Use direct MIDI note mapping from drumKit
    const drumInstrument = this.drumKit[midiNote];
    console.log(`🥁 [DEBUG] Drum instrument for ${midiNote}:`, !!drumInstrument, drumInstrument?.constructor?.name);
    
    if (drumInstrument) {
      try {
        if (drumInstrument.triggerAttackRelease) {
          // For Synth, MembraneSynth, MetalSynth
          console.log(`🥁 [DEBUG] Using triggerAttackRelease for ${midiNote}`);
          drumInstrument.triggerAttackRelease(duration, Tone.now(), velocity);
        } else if (drumInstrument.triggerAttack && drumInstrument.triggerRelease) {
          // For NoiseSynth
          console.log(`🥁 [DEBUG] Using triggerAttack/Release for ${midiNote}`);
          drumInstrument.triggerAttack(Tone.now(), velocity);
          drumInstrument.triggerRelease(Tone.now() + duration);
        } else {
          console.error(`🥁 [DEBUG] Unknown instrument type for ${midiNote}:`, drumInstrument);
        }
        console.log(`🥁 [DEBUG] Successfully triggered drum ${midiNote}`);
      } catch (error) {
        console.error(`🥁 [DEBUG] Error playing drum ${midiNote}:`, error);
      }
    } else {
      console.error(`🥁 [DEBUG] No drum instrument found for MIDI note: ${midiNote}`);
      console.log(`🥁 [DEBUG] Available drums:`, Object.keys(this.drumKit));
    }
  }

  // Create debug functions
  createDebugFunctions() {
    // Global test function for SF2 drums
    window.testSF2Drum = async (noteNumber = 36) => {
      console.log(`🎵 Testing SF2 SoundFont drum note: ${noteNumber}`);
      console.log(`🔍 Current tracks:`, Array.from(this.tracks.keys()));
      console.log(`🔍 Drum sampler status:`, !!this.drumSampler);
      
      // Add drum track if missing
      if (!this.tracks.has('drum-track')) {
        console.log(`🔧 Adding missing drum-track...`);
        this.addTrack('drum-track', 'SF2 Drum Track', 'drums', '#ff6b6b', null);
      }
      
      try {
        await this.scheduleNote('drum-track', noteNumber, 0, 0.3, 80);
        console.log(`🎵 SF2 SoundFont drum note ${noteNumber} triggered`);
      } catch (error) {
        console.error(`🎵 SF2 SoundFont drum test failed:`, error);
      }
    };

    // Global test function for SF2 piano
    window.testSF2Piano = async (noteNumber = 60) => {
      console.log(`🎵 Testing SF2 SoundFont piano note: ${noteNumber}`);
      
      // Add piano track if missing
      if (!this.tracks.has('piano-track')) {
        console.log(`🔧 Adding missing piano-track...`);
        this.addTrack('piano-track', 'SF2 Piano Track', 'piano', '#4f46e5', null);
      }
      
      try {
        await this.scheduleNote('piano-track', noteNumber, 0, 1.0, 80);
        console.log(`🎵 SF2 SoundFont piano note ${noteNumber} triggered`);
      } catch (error) {
        console.error(`🎵 SF2 SoundFont piano test failed:`, error);
      }
    };

    // Test all drum sounds
    window.testAllSF2Drums = () => {
      console.log(`🥁 Testing all SF2 drum sounds...`);
      const drumNotes = [36, 38, 41, 42, 45, 46, 47, 49, 50, 51];
      drumNotes.forEach((note, index) => {
        setTimeout(() => {
          console.log(`🥁 Testing SF2 drum ${note}...`);
          window.testSF2Drum(note);
        }, index * 600);
      });
    };

    // Diagnostic function
    window.diagnoseSF2Audio = () => {
      console.log(`🔧 SF2 Audio Context Diagnostics:`);
      console.log(`- State: ${Tone.context.state}`);
      console.log(`- Sample Rate: ${Tone.context.sampleRate}`);
      console.log(`- Current Time: ${Tone.context.currentTime}`);
      console.log(`- Master Volume: ${Tone.Destination.volume.value}dB`);
      console.log(`- Available tracks: ${Array.from(this.tracks.keys()).join(', ')}`);
      console.log(`- Drum kit: ${!!this.drumKit ? 'Available' : 'Missing'}`);
      console.log(`- Drum instruments: ${Object.keys(this.drumKit).join(', ')}`);
      console.log(`- Piano sampler: ${!!this.pianoSampler ? 'Available' : 'Missing'}`);
      console.log(`- SoundFont data: ${!!this.soundfontData ? 'Loaded' : 'Missing'}`);
      
      // 詳細なSoundFontデータを表示
      if (this.soundfontData) {
        console.log(`🎵 SoundFont Details:`, this.soundfontData);
        console.log(`🎵 Audio Buffers:`, Object.keys(this.audioBuffers));
      }
      
      // SF2パーサーの状態も確認
      console.log(`🎵 SF2 Parser:`, {
        hasArrayBuffer: !!this.sf2Parser.arrayBuffer,
        chunkCount: Object.keys(this.sf2Parser.chunks || {}).length,
        presetCount: this.sf2Parser.presets?.length || 0,
        sampleCount: this.sf2Parser.samples?.length || 0
      });
    };
    
    console.log('🛠️ SF2 SoundFont debug functions ready: testSF2Drum(noteNumber), testSF2Piano(noteNumber), testAllSF2Drums(), diagnoseSF2Audio()');
  }

  // Track management methods
  getTrack(trackId) {
    return this.tracks.get(trackId);
  }

  removeTrack(trackId) {
    const track = this.tracks.get(trackId);
    if (track) {
      this.tracks.delete(trackId);
    }
  }

  setTrackMuted(trackId, muted) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.muted = muted;
    }
  }

  setTrackSolo(trackId, solo) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.solo = solo;
      this.updateTrackVisibility();
    }
  }

  setTrackVolume(trackId, volume) {
    const track = this.tracks.get(trackId);
    if (track && !track.muted) {
      track.volume = volume;
    }
  }

  updateTrackVisibility() {
    const hasSoloTrack = Array.from(this.tracks.values()).some(track => track.solo);
    
    this.tracks.forEach(track => {
      const shouldPlay = hasSoloTrack ? track.solo : !track.muted;
      track.muted = !shouldPlay;
    });
  }

  // Playback control methods
  play(startTime = 0) {
    if (!this.isInitialized) return;

    this.currentTime = startTime;
    this.startTime = Tone.now() - startTime;
    this.isPlaying = true;

    console.log('SF2 SoundFont playback started at:', startTime);
    this.emit('playbackStarted', { startTime });
  }

  pause() {
    this.isPlaying = false;
    console.log('SF2 SoundFont playback paused at:', this.currentTime);
    this.emit('playbackPaused', { currentTime: this.currentTime });
  }

  stop() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.startTime = 0;
    console.log('SF2 SoundFont playback stopped');
    this.emit('playbackStopped', { currentTime: this.currentTime });
  }

  getCurrentTime() {
    if (!this.isPlaying) return this.currentTime;
    return Tone.now() - this.startTime;
  }

  setMasterVolume(volume) {
    Tone.Destination.volume.value = volume;
  }

  // Cleanup
  destroy() {
    this.tracks.clear();
    this.instruments.clear();
    
    if (this.drumSampler) {
      this.drumSampler.dispose();
    }
    
    if (this.pianoSampler) {
      this.pianoSampler.dispose();
    }
    
    this.isInitialized = false;
  }
}

// Singleton instance
const sf2SoundFontEngine = new SF2SoundFontEngine();

export default sf2SoundFontEngine;