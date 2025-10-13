// MIDIエディタ用定数
export const METRONOME_FREQUENCY = 800; // Hz
export const METRONOME_DURATION = 0.1; // 秒

export const GRID_HEIGHT = 20;
export const GRID_WIDTH = 40;
export const PIANO_WIDTH = 80;
export const HEADER_HEIGHT = 40;
export const NOTE_HEIGHT = 18;
export const OCTAVE_RANGE = [1, 7]; // C1 to C7
export const TOTAL_KEYS = (OCTAVE_RANGE[1] - OCTAVE_RANGE[0] + 1) * 12;
export const FPS_LIMIT = 60;
export const FRAME_TIME = 1000 / FPS_LIMIT;
export const LONG_PRESS_THRESHOLD = 200;
export const PLAYBACK_UPDATE_INTERVAL = 16; // ms (60fps) 