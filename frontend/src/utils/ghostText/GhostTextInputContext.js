// GhostTextInputContext: MIDI入力コンテキスト管理
export default class GhostTextInputContext {
  constructor() {
    this.currentNotes = [];
    this.cursorPosition = 0;
    this.trackType = 'melody'; // 'melody', 'rhythm', 'harmony', 'bass', 'percussion', 'Drum'
    this.listeners = [];
    this.trackSummary = '';
    this.keySignature = 'C';
    this.timeSignature = '4/4';
    this.tempo = 120;
    this.recentNotes = [];
    this.maxRecentNotes = 16;
    this.genre = 'Lo-Fi Hip Hop';
    this.scaleNotesMidi = null;
    this.currentChord = null;
  }

  updateContext(notes, cursorPosition, trackType, additionalData = {}) {
    this.currentNotes = notes || [];
    this.cursorPosition = cursorPosition || 0;
    this.trackType = trackType || 'melody';

    // 追加データの更新
    if (additionalData.keySignature) this.keySignature = additionalData.keySignature;
    if (additionalData.timeSignature) this.timeSignature = additionalData.timeSignature;
    if (additionalData.tempo) this.tempo = additionalData.tempo;
    if (additionalData.genre) this.genre = additionalData.genre;
    if (additionalData.scaleNotesMidi) this.scaleNotesMidi = additionalData.scaleNotesMidi;
    if (additionalData.currentChord) this.currentChord = additionalData.currentChord;

    // 最近のノートを更新
    this.updateRecentNotes();

    // トラックサマリーを生成
    this.generateTrackSummary();

    this.notifyListeners('contextUpdate', this.getContextData());
  }

  updateRecentNotes() {
    // 現在のノートを最近のノートリストに追加
    this.currentNotes.forEach(note => {
      this.recentNotes.push({
        pitch: note.pitch,
        start: note.time || note.start || 0,
        duration: note.duration || 0.5,
        velocity: note.velocity || 0.8,
        timestamp: Date.now()
      });
    });
    
    // 最大数を超えた古いノートを削除
    if (this.recentNotes.length > this.maxRecentNotes) {
      this.recentNotes = this.recentNotes.slice(-this.maxRecentNotes);
    }
  }

  generateTrackSummary() {
    if (this.recentNotes.length === 0) {
      this.trackSummary = `Empty ${this.trackType} track in ${this.keySignature} key, ${this.timeSignature} time signature at ${this.tempo} BPM`;
      return;
    }

    const noteCount = this.recentNotes.length;
    const pitchRange = this.getPitchRange();
    const commonPitches = this.getCommonPitches();
    const rhythmPattern = this.getRhythmPattern();
    
    this.trackSummary = `${this.trackType} track with ${noteCount} notes, ` +
      `pitch range: ${pitchRange.min}-${pitchRange.max}, ` +
      `common notes: ${commonPitches.join(', ')}, ` +
      `rhythm: ${rhythmPattern}, ` +
      `key: ${this.keySignature}, time: ${this.timeSignature}, tempo: ${this.tempo} BPM`;
  }

  getPitchRange() {
    if (this.recentNotes.length === 0) return { min: 0, max: 0 };
    
    const pitches = this.recentNotes.map(note => note.pitch);
    return {
      min: Math.min(...pitches),
      max: Math.max(...pitches)
    };
  }

  getCommonPitches() {
    if (this.recentNotes.length === 0) return [];
    
    const pitchCount = {};
    this.recentNotes.forEach(note => {
      pitchCount[note.pitch] = (pitchCount[note.pitch] || 0) + 1;
    });
    
    const sortedPitches = Object.entries(pitchCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([pitch]) => this.pitchToNoteName(parseInt(pitch)));
    
    return sortedPitches;
  }

  getRhythmPattern() {
    if (this.recentNotes.length < 2) return 'simple';
    
    const durations = this.recentNotes.map(note => note.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    if (avgDuration < 0.25) return 'fast';
    if (avgDuration < 0.5) return 'medium';
    return 'slow';
  }

  pitchToNoteName(pitch) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(pitch / 12) - 1;
    const noteName = noteNames[pitch % 12];
    return `${noteName}${octave}`;
  }

  getContextData() {
    return {
      currentNotes: this.currentNotes,
      cursorPosition: this.cursorPosition,
      trackType: this.trackType,
      trackSummary: this.trackSummary,
      keySignature: this.keySignature,
      timeSignature: this.timeSignature,
      tempo: this.tempo,
      recentNotes: this.recentNotes,
      genre: this.genre,
      scaleNotesMidi: this.scaleNotesMidi,
      currentChord: this.currentChord
    };
  }

  setTrackType(trackType) {
    this.trackType = trackType;
    this.generateTrackSummary();
    this.notifyListeners('contextUpdate', this.getContextData());
  }

  setKeySignature(keySignature) {
    this.keySignature = keySignature;
    this.generateTrackSummary();
    this.notifyListeners('contextUpdate', this.getContextData());
  }

  setTimeSignature(timeSignature) {
    this.timeSignature = timeSignature;
    this.generateTrackSummary();
    this.notifyListeners('contextUpdate', this.getContextData());
  }

  setTempo(tempo) {
    this.tempo = tempo;
    this.generateTrackSummary();
    this.notifyListeners('contextUpdate', this.getContextData());
  }

  setGenre(genre) {
    this.genre = genre;
    this.generateTrackSummary();
    this.notifyListeners('contextUpdate', this.getContextData());
  }

  setScaleNotesMidi(scaleNotes) {
    this.scaleNotesMidi = scaleNotes;
    this.notifyListeners('contextUpdate', this.getContextData());
  }

  setCurrentChord(chord) {
    this.currentChord = chord;
    this.notifyListeners('contextUpdate', this.getContextData());
  }

  clearContext() {
    this.currentNotes = [];
    this.cursorPosition = 0;
    this.recentNotes = [];
    this.trackSummary = '';
    this.notifyListeners('contextUpdate', this.getContextData());
  }

  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try { listener(event, data); } catch (e) {
        console.error('Error in listener:', e);
      }
    });
  }
} 