// ===== Track Types and Constants =====
// DAWAIアプリケーションで使用されるトラックタイプ、カラー、タブタイプの定義

// トラックタイプの定義
export const TRACK_TYPES = {
  MIDI: 'midi',
  DRUMS: 'drums',
  DIFFSINGER: 'diffsinger'
}

// トラックサブタイプの定義
export const TRACK_SUBTYPES = {
  PIANO: 'piano',
  SYNTH: 'synth',
  BASS: 'bass',
  GUITAR: 'guitar',
  DRUMS: 'drums',
  DIFFSINGER: 'diffsinger'
}

// トラックカラーの定義
export const TRACK_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // yellow
  '#F97316', // orange
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#6366F1'  // indigo
]

// タブタイプの定義
export const TAB_TYPES = {
  ARRANGEMENT: 'arrangement',
  MIDI_EDITOR: 'midi_editor',
  DRUM_TRACK: 'drum_track',
  DIFFSINGER_TRACK: 'diffsinger_track'
}