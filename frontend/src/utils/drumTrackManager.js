// ドラムトラック管理クラス
// 新しいデータ構造を使用してドラムトラックを管理し、ProjectManagerと連携

import {
  createDrumData,
  updateDrumData,
  validateDrumData,
  generateMidiNotesFromGrid,
  generateGridFromMidiNotes,
  createDrumDataFromPreset,
  PRESET_PATTERNS,
  DRUM_INSTRUMENTS,
  DEFAULT_DRUM_SETTINGS,
  // 新しい同期グループ管理関数をインポート
  getSyncGroupData,
  updateSyncGroupData,
  setBarSyncGroup,
  getBarSyncGroup,
  getSyncGroupGrid,
  updateSyncGroupGrid,
  getSyncGroupInstruments,
  updateSyncGroupInstruments,
  getSyncGroupTempo,
  updateSyncGroupTempo,
  getSyncGroupTimeSignature,
  updateSyncGroupTimeSignature,
  resetSyncGroupData,
  copySyncGroupData,
  SYNC_GROUP_SETTINGS,
  // 全体データ管理機能をインポート
  generateCombinedGrid,
  generateCombinedInstruments,
  generateCombinedTempo,
  generateCombinedTimeSignature,
  updateCombinedData,
  getGridForBarRange
} from './drumTrackDataStructure.js';

class DrumTrackManager {
  constructor() {
    this.drumTracks = new Map(); // trackId -> drumData
    this.patterns = new Map(); // patternId -> pattern
    this.activeTracks = new Set(); // アクティブなトラックID
    this.eventListeners = new Map(); // イベントリスナー
    this.playbackDataCache = new Map(); // 再生データのキャッシュ
  }

  // ドラムトラックの作成
  createDrumTrack(trackId, presetName = null) {
    // 開発環境でのみログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log(`🥁 Creating drum track: ${trackId}`);
    }
    
    let drumData;
    if (presetName) {
      drumData = createDrumDataFromPreset(trackId, presetName);
    } else {
      drumData = createDrumData(trackId);
    }
    
    // 検証
    const validation = validateDrumData(drumData);
    if (!validation.isValid) {
      console.error('❌ Invalid drum data:', validation.errors);
      return null;
    }
    
    // 保存
    this.drumTracks.set(trackId, drumData);
    this.activeTracks.add(trackId);
    
    // パターンを保存
    drumData.patterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
    
    // イベント発火
    this.emit('trackCreated', { trackId, drumData });
    
    // 開発環境でのみログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log(`🥁 Drum track created: ${trackId}`, drumData);
    }
    return drumData;
  }

  // ドラムトラックの取得
  getDrumTrack(trackId) {
    return this.drumTracks.get(trackId) || null;
  }

  // ドラムトラックの更新
  updateDrumTrack(trackId, updates) {
    const currentData = this.drumTracks.get(trackId);
    if (!currentData) {
      console.error(`❌ Drum track not found: ${trackId}`);
      return false;
    }
    
    // 更新
    const updatedData = updateDrumData(currentData, updates);
    
    // 検証
    const validation = validateDrumData(updatedData);
    if (!validation.isValid) {
      console.error('❌ Invalid drum data after update:', validation.errors);
      return false;
    }
    
    // 保存
    this.drumTracks.set(trackId, updatedData);
    
    // パターンを更新
    updatedData.patterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
    
    // キャッシュをクリア
    this.clearPlaybackDataCache(trackId);
    
    // イベント発火
    this.emit('trackUpdated', { trackId, drumData: updatedData, updates });
   
    return true;
  }

  // ドラムトラックの削除
  deleteDrumTrack(trackId) {
    // 開発環境でのみログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log(`🥁 Deleting drum track: ${trackId}`);
    }
    
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      console.error(`❌ Drum track not found: ${trackId}`);
      return false;
    }
    
    // 削除
    this.drumTracks.delete(trackId);
    this.activeTracks.delete(trackId);
    
    // 関連するパターンも削除
    drumData.patterns.forEach(pattern => {
      this.patterns.delete(pattern.id);
    });
   
    // イベント発火
    this.emit('trackDeleted', { trackId, drumData });
    
    // 開発環境でのみログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log(`🥁 Drum track deleted: ${trackId}`);
    }
    return true;
  }

  // グリッドの更新
  updateGrid(trackId, grid) {
    return this.updateDrumTrack(trackId, { grid });
  }

  // 楽器の更新
  updateInstruments(trackId, instruments) {
    return this.updateDrumTrack(trackId, { instruments });
  }

  // テンポの更新
  updateTempo(trackId, tempo) {
    return this.updateDrumTrack(trackId, { tempo });
  }

  // 拍子記号の更新
  updateTimeSignature(trackId, timeSignature) {
    return this.updateDrumTrack(trackId, { timeSignature });
  }

  // パターンの追加
  addPattern(trackId, pattern) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      console.error(`❌ Drum track not found: ${trackId}`);
      return false;
    }
    
    const updatedPatterns = [...drumData.patterns, pattern];
    const updates = {
      patterns: updatedPatterns,
      activePatternId: pattern.id
    };
    
    return this.updateDrumTrack(trackId, updates);
  }

  // アクティブパターンの変更
  setActivePattern(trackId, patternId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      console.error(`❌ Drum track not found: ${trackId}`);
      return false;
    }
    
    const pattern = drumData.patterns.find(p => p.id === patternId);
    if (!pattern) {
      console.error(`❌ Pattern not found: ${patternId}`);
      return false;
    }
    
    const updates = {
      activePatternId: patternId,
      grid: pattern.grid,
      instruments: pattern.instruments,
      tempo: pattern.tempo,
      timeSignature: pattern.timeSignature
    };
    
    return this.updateDrumTrack(trackId, updates);
  }

  // 同期グループ管理機能

  // 同期グループデータの取得
  getSyncGroupData(trackId, groupId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      console.error(`❌ Drum track not found: ${trackId}`);
      return null;
    }
    return getSyncGroupData(drumData, groupId);
  }

  // 同期グループデータの更新
  updateSyncGroupData(trackId, groupId, updates) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      console.error(`❌ Drum track not found: ${trackId}`);
      return false;
    }
    
    const updatedData = updateSyncGroupData(drumData, groupId, updates);
    this.drumTracks.set(trackId, updatedData);
    
    // イベント発火
    this.emit('syncGroupUpdated', { trackId, groupId, updates });
    
    return true;
  }

  // 小節の同期グループを設定
  setBarSyncGroup(trackId, barIndex, groupId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      console.error(`❌ Drum track not found: ${trackId}`);
      return false;
    }
    
    const updatedData = setBarSyncGroup(drumData, barIndex, groupId);
    this.drumTracks.set(trackId, updatedData);
    
    // イベント発火
    this.emit('barSyncGroupChanged', { trackId, barIndex, groupId });
    
    return true;
  }

  // 小節の同期グループを取得
  getBarSyncGroup(trackId, barIndex) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return SYNC_GROUP_SETTINGS.defaultGroup;
    }
    return getBarSyncGroup(drumData, barIndex);
  }

  // 同期グループのグリッドデータを取得
  getSyncGroupGrid(trackId, groupId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return null;
    }
    return getSyncGroupGrid(drumData, groupId);
  }

  // 同期グループのグリッドデータを更新
  updateSyncGroupGrid(trackId, groupId, grid) {
    return this.updateSyncGroupData(trackId, groupId, { grid });
  }

  // 同期グループの楽器データを取得
  getSyncGroupInstruments(trackId, groupId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return null;
    }
    return getSyncGroupInstruments(drumData, groupId);
  }

  // 同期グループの楽器データを更新
  updateSyncGroupInstruments(trackId, groupId, instruments) {
    return this.updateSyncGroupData(trackId, groupId, { instruments });
  }

  // 同期グループのテンポを取得
  getSyncGroupTempo(trackId, groupId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return DEFAULT_DRUM_SETTINGS.tempo;
    }
    return getSyncGroupTempo(drumData, groupId);
  }

  // 同期グループのテンポを更新
  updateSyncGroupTempo(trackId, groupId, tempo) {
    return this.updateSyncGroupData(trackId, groupId, { tempo });
  }

  // 同期グループの拍子記号を取得
  getSyncGroupTimeSignature(trackId, groupId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return DEFAULT_DRUM_SETTINGS.timeSignature;
    }
    return getSyncGroupTimeSignature(drumData, groupId);
  }

  // 同期グループの拍子記号を更新
  updateSyncGroupTimeSignature(trackId, groupId, timeSignature) {
    return this.updateSyncGroupData(trackId, groupId, { timeSignature });
  }

  // 同期グループの全データをリセット
  resetSyncGroupData(trackId, groupId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      console.error(`❌ Drum track not found: ${trackId}`);
      return false;
    }
    
    const updatedData = resetSyncGroupData(drumData, groupId);
    this.drumTracks.set(trackId, updatedData);
    
    // イベント発火
    this.emit('syncGroupReset', { trackId, groupId });
    
    return true;
  }

  // 同期グループの全データをコピー
  copySyncGroupData(trackId, fromGroupId, toGroupId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      console.error(`❌ Drum track not found: ${trackId}`);
      return false;
    }
    
    const updatedData = copySyncGroupData(drumData, fromGroupId, toGroupId);
    this.drumTracks.set(trackId, updatedData);
    
    // イベント発火
    this.emit('syncGroupCopied', { trackId, fromGroupId, toGroupId });
    
    return true;
  }

  // 同期グループの統計情報を取得
  getSyncGroupStats(trackId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData || !drumData.syncGroupsData) {
      return null;
    }
    
    const stats = {};
    SYNC_GROUP_SETTINGS.availableGroups.forEach(groupId => {
      const groupData = drumData.syncGroupsData[groupId];
      if (groupData) {
        stats[groupId] = {
          cellCount: groupData.metadata.cellCount,
          lastModified: groupData.lastModified,
          name: groupData.name
        };
      }
    });
    
    return stats;
  }

  // 同期グループの全データを取得
  getAllSyncGroupsData(trackId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData || !drumData.syncGroupsData) {
      return null;
    }
    return drumData.syncGroupsData;
  }

  // 小節ごとの同期グループマッピングを取得
  getBarSyncGroupsMapping(trackId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData || !drumData.barSyncGroups) {
      return new Map();
    }
    return new Map(drumData.barSyncGroups);
  }

  // 全体データ管理機能

  // 全体のグリッドデータを生成
  generateCombinedGrid(trackId, maxBars = 32) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return null;
    }
    return generateCombinedGrid(drumData, maxBars);
  }

  // 全体の楽器データを生成
  generateCombinedInstruments(trackId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return DRUM_INSTRUMENTS;
    }
    return generateCombinedInstruments(drumData);
  }

  // 全体のテンポを生成
  generateCombinedTempo(trackId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return DEFAULT_DRUM_SETTINGS.tempo;
    }
    return generateCombinedTempo(drumData);
  }

  // 全体の拍子記号を生成
  generateCombinedTimeSignature(trackId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return DEFAULT_DRUM_SETTINGS.timeSignature;
    }
    return generateCombinedTimeSignature(drumData);
  }

  // 全体のデータ構造を更新
  updateCombinedData(trackId, maxBars = 32) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      console.error(`❌ Drum track not found: ${trackId}`);
      return false;
    }
    
    const updatedData = updateCombinedData(drumData, maxBars);
    this.drumTracks.set(trackId, updatedData);
    
    // イベント発火
    this.emit('combinedDataUpdated', { trackId, maxBars, updatedData });
    
    return true;
  }

  // 特定の小節範囲のグリッドデータを取得
  getGridForBarRange(trackId, startBar, endBar) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return null;
    }
    return getGridForBarRange(drumData, startBar, endBar);
  }

  // 全体の統計情報を取得
  getCombinedStats(trackId, maxBars = 32) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return null;
    }
    
    const combinedGrid = generateCombinedGrid(drumData, maxBars);
    const combinedInstruments = generateCombinedInstruments(drumData);
    const combinedTempo = generateCombinedTempo(drumData);
    const combinedTimeSignature = generateCombinedTimeSignature(drumData);
    
    return {
      totalBars: maxBars,
      totalSteps: maxBars * 16,
      totalDuration: (maxBars * 4 * 60) / combinedTempo, // 秒単位
      cellCount: combinedGrid.flat().filter(cell => cell).length,
      tempo: combinedTempo,
      timeSignature: combinedTimeSignature,
      instrumentsCount: combinedInstruments.length,
      syncGroupsUsed: Array.from(new Set(Array.from(drumData.barSyncGroups?.values() || []))),
      lastModified: drumData.lastModified
    };
  }

  // 再生用の完全なデータを取得（最大時間まで）
  getPlaybackData(trackId, maxBars = 32) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return null;
    }
    
    // キャッシュキーを作成
    const cacheKey = `${trackId}-${maxBars}-${drumData.lastModified || 'unknown'}`;
    
    // キャッシュにデータがある場合はそれを返す
    if (this.playbackDataCache.has(cacheKey)) {
      return this.playbackDataCache.get(cacheKey);
    }
    
    // 全体のデータを組み合わせて生成
    const combinedGrid = generateCombinedGrid(drumData, maxBars);
    const combinedInstruments = generateCombinedInstruments(drumData);
    const combinedTempo = generateCombinedTempo(drumData);
    const combinedTimeSignature = generateCombinedTimeSignature(drumData);
    
    // MIDIノートを生成（最大時間まで）
    const notes = generateMidiNotesFromGrid(combinedGrid, combinedInstruments, combinedTempo, combinedTimeSignature);
    
    const playbackData = {
      grid: combinedGrid,
      instruments: combinedInstruments,
      tempo: combinedTempo,
      timeSignature: combinedTimeSignature,
      notes: notes,
      totalBars: maxBars,
      totalSteps: maxBars * 16,
      totalDuration: (maxBars * 4 * 60) / combinedTempo, // 秒単位
      syncGroupsData: drumData.syncGroupsData,
      barSyncGroups: drumData.barSyncGroups
    };
    
    // キャッシュに保存
    this.playbackDataCache.set(cacheKey, playbackData);
    
    return playbackData;
  }

  // 同期グループの変更時に全体データを自動更新
  updateSyncGroupData(trackId, groupId, updates) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      console.error(`❌ Drum track not found: ${trackId}`);
      return false;
    }
    
    const updatedData = updateSyncGroupData(drumData, groupId, updates);
    this.drumTracks.set(trackId, updatedData);
    
    // 全体データも自動更新
    this.updateCombinedData(trackId, 32);
    
    // イベント発火
    this.emit('syncGroupUpdated', { trackId, groupId, updates });
    
    return true;
  }

  // 小節の同期グループを設定（全体データも自動更新）
  setBarSyncGroup(trackId, barIndex, groupId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      console.error(`❌ Drum track not found: ${trackId}`);
      return false;
    }
    
    const updatedData = setBarSyncGroup(drumData, barIndex, groupId);
    this.drumTracks.set(trackId, updatedData);
    
    // 全体データも自動更新
    this.updateCombinedData(trackId, 32);
    
    // イベント発火
    this.emit('barSyncGroupChanged', { trackId, barIndex, groupId });
    
    return true;
  }

  // MIDIデータの取得（他のコンポーネントとの連携用）
  getMidiData(trackId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return null;
    }
    
    return drumData.midiData;
  }

  // グリッドからMIDIノートを生成
  generateMidiNotes(trackId) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return [];
    }
    
    const notes = generateMidiNotesFromGrid(
      drumData.grid,
      drumData.instruments,
      drumData.tempo,
      drumData.timeSignature
    );
    
    // MIDIデータを更新
    this.updateDrumTrack(trackId, {
      midiData: {
        notes,
        tempo: drumData.tempo,
        timeSignature: drumData.timeSignature
      }
    });
    
    return notes;
  }

  // MIDIノートからグリッドを生成
  generateGridFromMidi(trackId, notes) {
    const drumData = this.drumTracks.get(trackId);
    if (!drumData) {
      return null;
    }
    
    const grid = generateGridFromMidiNotes(
      notes,
      drumData.instruments,
      DEFAULT_DRUM_SETTINGS.gridSize
    );
    
    this.updateDrumTrack(trackId, { grid });
    return grid;
  }

  // プリセットパターンの適用
  applyPresetPattern(trackId, presetName) {
    const preset = PRESET_PATTERNS[presetName];
    if (!preset) {
      console.error(`❌ Preset pattern not found: ${presetName}`);
      return false;
    }
    
    const updates = {
      grid: preset.grid,
      patternName: preset.name
    };
    
    return this.updateDrumTrack(trackId, updates);
  }

  // 全ドラムトラックの取得
  getAllDrumTracks() {
    return Array.from(this.drumTracks.entries()).map(([trackId, drumData]) => ({
      trackId,
      drumData
    }));
  }

  // アクティブなドラムトラックの取得
  getActiveDrumTracks() {
    return Array.from(this.activeTracks).map(trackId => ({
      trackId,
      drumData: this.drumTracks.get(trackId)
    }));
  }

  // ドラムトラックの存在確認
  hasDrumTrack(trackId) {
    return this.drumTracks.has(trackId);
  }

  // ドラムトラックのアクティブ状態を設定
  setTrackActive(trackId, active) {
    if (active) {
      this.activeTracks.add(trackId);
    } else {
      this.activeTracks.delete(trackId);
    }
    
    this.emit('trackActiveChanged', { trackId, active });
  }

  // イベントリスナーの追加
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  // イベントリスナーの削除
  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // イベントの発火
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // データのエクスポート
  exportData() {
    const data = {
      drumTracks: Array.from(this.drumTracks.entries()),
      patterns: Array.from(this.patterns.entries()),
      activeTracks: Array.from(this.activeTracks),
      metadata: {
        version: '1.0.0',
        timestamp: Date.now()
      }
    };
    
    return data;
  }

  // データのインポート
  importData(data) {
    try {
      // 既存データをクリア
      this.drumTracks.clear();
      this.patterns.clear();
      this.activeTracks.clear();
      
      // パターンを復元
      data.patterns.forEach(([patternId, pattern]) => {
        this.patterns.set(patternId, pattern);
      });
      
      // ドラムトラックを復元
      data.drumTracks.forEach(([trackId, drumData]) => {
        this.drumTracks.set(trackId, drumData);
      });
      
      // アクティブトラックを復元
      data.activeTracks.forEach(trackId => {
        this.activeTracks.add(trackId);
      });
      
      // 開発環境でのみログを出力
      if (process.env.NODE_ENV === 'development') {
        console.log('🥁 Drum track data imported successfully');
      }
      this.emit('dataImported', { data });
      return true;
    } catch (error) {
      console.error('❌ Failed to import drum track data:', error);
      return false;
    }
  }

  // データのクリア
  clear() {
    this.drumTracks.clear();
    this.patterns.clear();
    this.activeTracks.clear();
    this.eventListeners.clear();
    this.playbackDataCache.clear();
    
    // 開発環境でのみログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log('🥁 Drum track manager cleared');
    }
  }

  // 特定のトラックの再生データキャッシュをクリア
  clearPlaybackDataCache(trackId) {
    const keysToDelete = [];
    for (const [key] of this.playbackDataCache) {
      if (key.startsWith(`${trackId}-`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.playbackDataCache.delete(key));
  }
  
  // 全再生データキャッシュをクリア
  clearAllPlaybackDataCache() {
    this.playbackDataCache.clear();
  }
  
  // 統計情報の取得
  getStats() {
    return {
      totalTracks: this.drumTracks.size,
      activeTracks: this.activeTracks.size,
      totalPatterns: this.patterns.size,
      totalEventListeners: Array.from(this.eventListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
      playbackDataCacheSize: this.playbackDataCache.size
    };
  }
}

// シングルトンインスタンス
const drumTrackManager = new DrumTrackManager();

export default drumTrackManager; 