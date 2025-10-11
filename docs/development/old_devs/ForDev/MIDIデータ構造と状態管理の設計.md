# MIDIデータ構造と状態管理の設計

## 概要

Melodia Composer Copilotの開発を通じて、MIDIデータの効率的な管理と即座のUI更新を実現するためのデータ構造と状態管理の設計についてまとめます。

## 1. プロジェクト構造

### 1.1 プロジェクトの基本構造

```javascript
const createProject = (name = 'Untitled Project') => ({
  id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name,
  tracks: [],
  tabs: [],
  activeTab: 'arrangement',
  settings: {
    tempo: 120,
    timeSignature: '4/4',
    key: 'C Major'
  },
  metadata: {
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    version: '1.0.0'
  }
})
```

### 1.2 トラック構造

```javascript
const createTrack = (id, name, type = TRACK_TYPES.INSTRUMENT, subtype = TRACK_SUBTYPES.PIANO, color = '#3B82F6') => ({
  id,
  name,
  type,
  subtype,
  color,
  volume: 100,
  pan: 0,
  muted: false,
  solo: false,
  armed: false,
  midiData: {
    notes: [],
    tempo: 120,
    timeSignature: '4/4',
    trackId: id,
    lastModified: new Date().toISOString(),
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    },
    settings: {
      channel: 0,
      octave: 0,
      transpose: 0,
      velocity: 100
    }
  },
  metadata: {
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  }
})
```

### 1.3 タブ構造

```javascript
const createTab = (id, title, type, trackId = null) => ({
  id,
  title,
  type,
  trackId,
  isClosable: true,
  isActive: false
})
```

## 2. MIDIデータの詳細構造

### 2.1 ノートオブジェクト

```javascript
const note = {
  id: Date.now() + Math.random(), // ユニークID
  pitch: 60, // MIDIノート番号（C4 = 60）
  time: 0.0, // 開始時間（拍単位）
  duration: 0.25, // 持続時間（拍単位）
  velocity: 0.8, // ベロシティ（0.0-1.0）
  trackId: 'track-1' // 所属トラックID
}
```

### 2.2 MIDIデータの完全構造

```javascript
const midiData = {
  // 基本データ
  notes: [], // ノート配列
  tempo: 120, // BPM
  timeSignature: '4/4', // 拍子記号
  trackId: 'track-1', // トラックID
  
  // タイムスタンプ
  lastModified: new Date().toISOString(),
  
  // メタデータ
  metadata: {
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    version: '1.0.0'
  },
  
  // 設定
  settings: {
    channel: 0, // MIDIチャンネル
    octave: 0, // オクターブ調整
    transpose: 0, // 移調
    velocity: 100 // デフォルトベロシティ
  }
}
```

## 3. 状態管理の設計

### 3.1 グローバル状態（ProjectManager）

```javascript
class ProjectManager {
  constructor() {
    this.currentProject = null
  }
  
  // プロジェクトの永続化
  saveToStorage() {
    if (this.currentProject) {
      const projectJson = JSON.stringify(this.currentProject)
      localStorage.setItem('melodia_project', projectJson)
    }
  }
  
  // プロジェクトの復元
  loadFromStorage() {
    const savedProject = localStorage.getItem('melodia_project')
    if (savedProject) {
      this.currentProject = JSON.parse(savedProject)
      return this.validateProject(this.currentProject)
    }
    return this.createDefaultProject()
  }
  
  // MIDIデータの更新
  updateTrackMidiData(trackId, midiData) {
    if (!this.currentProject) return false
    
    const track = this.currentProject.tracks.find(t => t.id === trackId)
    if (track) {
      track.midiData = {
        ...track.midiData,
        ...midiData,
        lastModified: new Date().toISOString()
      }
      this.saveToStorage()
      return true
    }
    return false
  }
}
```

### 3.2 コンポーネント状態（EnhancedMidiEditor）

```javascript
const EnhancedMidiEditor = ({ trackId, midiData, onMidiDataUpdate, isActive }) => {
  // 永続化されたノート状態
  const allTrackNotesRef = useRef({})
  const [allTrackNotes, setAllTrackNotes] = useState({})
  
  // 即座アクセス用のノート取得
  const notes = useMemo(() => {
    const currentNotes = allTrackNotes[trackId] || []
    const midiDataNotes = midiData?.notes || []
    
    // 即座にノートを初期化
    if (trackId && isActive) {
      if (midiDataNotes.length > 0 && currentNotes.length === 0) {
        allTrackNotesRef.current[trackId] = [...midiDataNotes]
        return midiDataNotes
      }
    }
    return currentNotes
  }, [allTrackNotes, trackId, midiData?.notes, isActive])
}
```

## 4. 即座性を実現する設計パターン

### 4.1 二重状態管理

```javascript
// 1. ローカル状態（即座のUI更新）
const [allTrackNotes, setAllTrackNotes] = useState({})

// 2. 永続化状態（データの保存）
const allTrackNotesRef = useRef({})

// 3. 即座アクセス（useMemo）
const notes = useMemo(() => {
  // 即座に初期化処理
}, [dependencies])
```

### 4.2 コールバック連鎖

```javascript
// ノート追加時の処理フロー
const addNote = useCallback((pitch, time, duration, velocity) => {
  // 1. ローカル状態を即座に更新
  setAllTrackNotes(prev => ({
    ...prev,
    [trackId]: [...(prev[trackId] || []), newNote]
  }))
  
  // 2. コールバックで親に通知
  if (onNoteAdd) onNoteAdd(newNote)
}, [trackId, onNoteAdd])

// App.jsxでの処理
onNoteAdd={(note) => {
  // 3. MIDIデータを即座に保存
  const updatedMidiData = {
    ...currentMidiData,
    notes: [...currentMidiData.notes, note],
    lastModified: new Date().toISOString()
  }
  updateTrackMidiData(currentTrack.id, updatedMidiData)
}}
```

### 4.3 プリロード処理

```javascript
// タブ切り替え時の即座ロード
const handleTabChange = useCallback((tabId) => {
  if (tabId.startsWith('tab-')) {
    const currentTrack = tracks.find(track => track.id === currentTab?.trackId)
    
    if (currentTrack) {
      // MIDIデータの即座検証と準備
      const validatedMidiData = {
        notes: Array.isArray(currentTrack.midiData?.notes) ? currentTrack.midiData.notes : [],
        tempo: currentTrack.midiData?.tempo || 120,
        timeSignature: currentTrack.midiData?.timeSignature || '4/4',
        trackId: currentTrack.id,
        lastModified: new Date().toISOString()
      }
      
      // 即座にトラックのMIDIデータを更新
      projectManager.updateTrackMidiData(currentTrack.id, validatedMidiData)
    }
  }
}, [projectManager, tabs, tracks])
```

## 5. データ整合性の確保

### 5.1 プロジェクト検証

```javascript
validateProject(project) {
  // 基本的なプロジェクト構造を確保
  if (!project.tracks) project.tracks = []
  if (!project.tabs) project.tabs = []
  if (!project.settings) project.settings = {}
  if (!project.metadata) project.metadata = {}

  // トラックの整合性を確保
  project.tracks = project.tracks.map(track => {
    const defaultTrack = createTrack(track.id, track.name, track.type, track.subtype, track.color)
    
    // 既存のMIDIデータを保持し、不足している部分のみデフォルト値で補完
    const existingMidiData = track.midiData || {}
    const validatedMidiData = {
      ...defaultTrack.midiData,
      ...existingMidiData,
      trackId: track.id,
      notes: Array.isArray(existingMidiData.notes) ? existingMidiData.notes : defaultTrack.midiData.notes,
      tempo: typeof existingMidiData.tempo === 'number' ? existingMidiData.tempo : defaultTrack.midiData.tempo,
      timeSignature: typeof existingMidiData.timeSignature === 'string' ? existingMidiData.timeSignature : defaultTrack.midiData.timeSignature
    }
    
    return {
      ...defaultTrack,
      ...track,
      midiData: validatedMidiData
    }
  })

  return project
}
```

### 5.2 状態の同期

```javascript
// 状態とrefの同期
useEffect(() => {
  allTrackNotesRef.current = allTrackNotes
}, [allTrackNotes])

// アンマウント時の状態保存
useEffect(() => {
  return () => {
    if (trackId && allTrackNotes[trackId]) {
      allTrackNotesRef.current[trackId] = [...allTrackNotes[trackId]]
    }
  }
}, [trackId, allTrackNotes[trackId]])
```

## 6. パフォーマンス最適化

### 6.1 不要な再レンダリングの防止

```javascript
// useCallbackで関数をメモ化
const addNote = useCallback((pitch, time, duration, velocity) => {
  // ノート追加処理
}, [trackId, onNoteAdd])

// useMemoで計算結果をメモ化
const notes = useMemo(() => {
  // ノートの初期化処理
}, [allTrackNotes, trackId, midiData?.notes, isActive])
```

### 6.2 即座保存の最適化

```javascript
// デバウンスなしの即座保存
useEffect(() => {
  if (onMidiDataUpdate && trackId) {
    const currentNotes = allTrackNotes[trackId] || []
    const notesChanged = JSON.stringify(currentNotes) !== JSON.stringify(lastNotesRef.current)
    
    if (notesChanged) {
      // 即座に更新データを送信
      onMidiDataUpdate(updateData)
      lastNotesRef.current = [...currentNotes]
    }
  }
}, [allTrackNotes[trackId], trackId, onMidiDataUpdate])
```

## 7. 学んだ重要なポイント

### 7.1 即座性の実現
- **ローカル状態の即座更新**: UIの即座性を確保
- **永続化の即座実行**: データの確実な保存
- **プリロード処理**: タブ切り替え時の遅延を解消

### 7.2 データ構造の設計
- **完全な構造の確保**: 不足する部分をデフォルト値で補完
- **型安全性**: 配列やオブジェクトの型チェック
- **メタデータの管理**: 作成日時、更新日時などの追跡

### 7.3 状態管理の最適化
- **二重状態管理**: ローカル状態と永続化状態の分離
- **refによる参照保持**: コンポーネント間での状態共有
- **コールバック連鎖**: 親子コンポーネント間の効率的な通信

### 7.4 エラーハンドリング
- **グレースフルなフォールバック**: データが存在しない場合の適切な処理
- **検証処理**: データ構造の整合性確保
- **ログ出力**: デバッグ時の詳細な情報提供

## 8. 今後の改善点

### 8.1 パフォーマンス
- 大量のノートがある場合の描画最適化
- 仮想化によるメモリ使用量の削減
- Web Workers による重い処理の分離

### 8.2 機能拡張
- アンドゥ/リドゥ機能の実装
- 複数トラックの同時編集
- リアルタイムコラボレーション

### 8.3 データ管理
- IndexedDB による大容量データの管理
- クラウド同期機能
- バージョン管理システム

---

このドキュメントは、Melodia Composer Copilotの開発を通じて学んだMIDIデータ構造と状態管理の設計についてまとめたものです。即座性とデータ整合性を両立させるための様々なテクニックとパターンが含まれています。 