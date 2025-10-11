/**
 * 統一トラックタイプ定義
 * ArrangementViewのAdd New Trackメニューとタブの+メニューで共通使用
 */
import { Piano, Headphones, Drum, Zap, Mic } from 'lucide-react'

export const UNIFIED_TRACK_TYPES = [
  {
    id: 'piano',
    name: 'Piano Track',
    description: 'ピアノやキーボード楽器',
    icon: Piano,
    color: 'bg-blue-500/10 hover:bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    type: 'instrument',
    subtype: 'piano',
    tabType: 'midi_editor',
    instrumentType: 'piano'
  },
  {
    id: 'bass',
    name: 'Bass Track',
    description: 'ベースライン・低音楽器',
    icon: Headphones,
    color: 'bg-green-500/10 hover:bg-green-500/20',
    iconColor: 'text-green-600 dark:text-green-400',
    type: 'instrument',
    subtype: 'bass',
    tabType: 'midi_editor',
    instrumentType: 'bass'
  },
  {
    id: 'drums',
    name: 'Drums Track',
    description: 'ドラムキットやパーカッション',
    icon: Drum,
    color: 'bg-purple-500/10 hover:bg-purple-500/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    type: 'instrument',
    subtype: 'drums',
    tabType: 'drum_track',
    instrumentType: 'drums'
  },
  {
    id: 'synth',
    name: 'Synth Track',
    description: 'シンセサイザー・リード音色',
    icon: Zap,
    color: 'bg-orange-500/10 hover:bg-orange-500/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    type: 'instrument',
    subtype: 'synth',
    tabType: 'midi_editor',
    instrumentType: 'synth_lead'
  },
  {
    id: 'voice_synth',
    name: '歌声合成トラック',
    description: 'DiffSinger歌声合成',
    icon: Mic,
    color: 'bg-pink-500/10 hover:bg-pink-500/20',
    iconColor: 'text-pink-600 dark:text-pink-400',
    type: 'voiceSynth',
    subtype: 'diffsinger',
    tabType: 'diffsinger_track',
    instrumentType: 'vocals'
  }
]

/**
 * トラックタイプIDからトラック定義を取得
 */
export const getTrackTypeById = (id) => {
  return UNIFIED_TRACK_TYPES.find(type => type.id === id)
}

/**
 * レガシーキーからトラックタイプを取得（互換性のため）
 */
export const getLegacyTrackType = (legacyKey) => {
  const legacyMap = {
    'piano': 'piano',
    'bass': 'bass',
    'drums': 'drums',
    'lead': 'synth',
    'pad': 'synth',
    'voiceSynth': 'voice_synth',
    'midi': 'piano',  // TabBarのlegacy
    'drum': 'drums',  // TabBarのlegacy
    'diffsinger': 'voice_synth'  // TabBarのlegacy
  }

  const mappedId = legacyMap[legacyKey]
  return mappedId ? getTrackTypeById(mappedId) : getTrackTypeById('piano')
}

/**
 * Demo Song用の楽器タイプマッピング
 */
export const mapInstrumentTypeToTrackType = (instrumentType) => {
  const instrumentMap = {
    // Piano Track - ピアノ系楽器
    'piano': 'piano',
    'acoustic_grand_piano': 'piano',
    'electric_piano': 'piano',
    'electric_piano_1': 'piano',
    'electric_piano_2': 'piano',
    'soft_piano': 'piano',
    'jazz_piano': 'piano',
    'grand_piano': 'piano',

    // Piano Track - ギター系楽器（メロディックな楽器として）
    'acoustic_guitar': 'piano',
    'electric_guitar_distortion': 'piano',
    'heavy_guitar': 'piano',
    'acoustic_guitar_fingerpicking': 'piano',

    // Bass Track - ベース系楽器
    'electric_bass': 'bass',
    'electric_bass_heavy': 'bass',
    'electric_bass_rock_heavy': 'bass',
    'upright_bass_heavy': 'bass',
    'acoustic_bass_heavy': 'bass',
    'synth_bass_edm_heavy': 'bass',
    'future_bass_heavy': 'bass',
    'heavy_bass': 'bass',
    'bass': 'bass',
    'synth_bass': 'bass',

    // Drums Track - ドラム・パーカッション系
    'drums': 'drums',
    'percussion': 'drums',

    // Synth Track - シンセサイザー・ストリングス系
    'synth_lead': 'synth',
    'synth_pad': 'synth',
    'synth_lead_edm': 'synth',
    'future_synth': 'synth',

    // Synth Track - ストリングス楽器（シンセパッドとして扱う）
    'violin': 'synth',
    'viola': 'synth',
    'cello_heavy': 'synth',
    'cello': 'synth',

    // 歌声合成トラック - ボーカル系
    'vocals': 'voice_synth',
    'diffsinger': 'voice_synth'
  }

  const mappedId = instrumentMap[instrumentType] || 'piano'
  return getTrackTypeById(mappedId)
}

export default UNIFIED_TRACK_TYPES