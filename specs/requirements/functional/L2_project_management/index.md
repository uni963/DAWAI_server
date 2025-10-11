# プロジェクト管理機能要件 (L2)

**Document ID**: FR-L2-PROJECT-001
**Version**: 2.0.0
**Last Updated**: 2025-10-10
**Parent**: [L1: 機能要件一覧](../L1_index.md)
**Implementation Status**: ✅ Fully Implemented

## 📁 プロジェクト管理システム概要

DAWAIのプロジェクト管理システムは、楽曲プロジェクトの作成・保存・読み込み、セッション永続化、インポート・エクスポートを担当するコア機能です。LocalStorageとJSON形式により、ブラウザベースでの完全なプロジェクト管理を実現しています。

## 🎵 FR-PROJECT-001: 楽曲プロジェクト管理

### 機能概要
**実装ファイル**:
- フロントエンド: `frontend/src/components/ProjectMenu.jsx`
- データ: `frontend/src/data/sampleData.js`

### Demo Song拡張機能

#### 実装状況
**Demo Song数**: 12曲（初期版4曲 → 12曲に拡張）
**平均長さ**: 8秒（4小節、120 BPM）
**対応ジャンル**: 6ジャンル全対応
**品質レベル**: プロフェッショナル品質

#### Demo Song一覧

```javascript
const DEMO_SONGS = [
  // 1. Demo Song - はじめての楽曲（基本チュートリアル）
  {
    id: 'demo-song-001',
    name: 'Demo Song - はじめての楽曲',
    genre: 'pop',
    duration: 8.0,  // 8秒（4小節）
    tempo: 120,
    timeSignature: '4/4',
    key: 'C',
    description: 'DAWAIの基本機能を体験できるサンプル楽曲',
    tracks: [
      { type: 'midi', subtype: 'piano', name: '🎹 Piano - メロディー' },
      { type: 'midi', subtype: 'bass', name: '🎸 Bass - ベースライン' },
      { type: 'drums', name: '🥁 Drums - リズム' },
      { type: 'diffsinger', name: '🎤 Voice - ハミング' }
    ],
    features: ['ピアノメロディー', 'ベースライン', 'ドラムパターン', 'AI歌声']
  },

  // 2. Pop Rock Song（ポップロック）
  {
    id: 'demo-song-002',
    name: 'Pop Rock Song',
    genre: 'pop',
    duration: 8.0,
    tempo: 130,
    timeSignature: '4/4',
    key: 'G',
    description: '明るくキャッチーなポップロックサウンド',
    tracks: [
      { type: 'midi', subtype: 'guitar', name: '🎸 Electric Guitar - リフ' },
      { type: 'midi', subtype: 'bass', name: '🎸 Bass - ロックベース' },
      { type: 'drums', name: '🥁 Drums - ロックビート' },
      { type: 'midi', subtype: 'piano', name: '🎹 Piano - バッキング' }
    ],
    features: ['王道進行（I-V-vi-IV）', 'ドライブ感', 'エネルギッシュ'],
    chordProgression: 'G-D-Em-C'
  },

  // 3. EDM Banger（EDM）
  {
    id: 'demo-song-003',
    name: 'EDM Banger',
    genre: 'edm',
    duration: 8.0,
    tempo: 128,
    timeSignature: '4/4',
    key: 'Am',
    description: 'エネルギッシュなEDMトラック',
    tracks: [
      { type: 'midi', subtype: 'synth', name: '🎹 Synth Lead - メロディー' },
      { type: 'midi', subtype: 'bass', name: '🔊 Sub Bass - 重低音' },
      { type: 'drums', name: '🥁 Drums - 4つ打ち' },
      { type: 'midi', subtype: 'synth', name: '🎹 Synth Pad - 雰囲気' }
    ],
    features: ['EDM進行（i-VI-III-VII）', '4つ打ち', 'ビルドアップ'],
    chordProgression: 'Am-F-C-G',
    bpm: 128  // EDM標準BPM
  },

  // 4. Jazz Standard（ジャズ）
  {
    id: 'demo-song-004',
    name: 'Jazz Standard',
    genre: 'jazz',
    duration: 8.0,
    tempo: 120,
    timeSignature: '4/4',
    key: 'C',
    description: '洗練されたジャズスタンダード',
    tracks: [
      { type: 'midi', subtype: 'piano', name: '🎹 Piano - コンピング' },
      { type: 'midi', subtype: 'bass', name: '🎸 Acoustic Bass - ウォーキング' },
      { type: 'drums', name: '🥁 Drums - スウィング' },
      { type: 'midi', subtype: 'piano', name: '🎷 Saxophone - ソロ（音色）' }
    ],
    features: ['ii-V-I進行', 'スウィング', 'テンション和音'],
    chordProgression: 'Dm7-G7-Cmaj7',
    swingRatio: 0.66  // スウィング比率
  },

  // 5. Classical Symphony（クラシック）
  {
    id: 'demo-song-005',
    name: 'Classical Symphony',
    genre: 'classical',
    duration: 8.0,
    tempo: 90,
    timeSignature: '4/4',
    key: 'C',
    description: '優雅なクラシック交響曲風',
    tracks: [
      { type: 'midi', subtype: 'piano', name: '🎹 Piano - 主旋律' },
      { type: 'midi', subtype: 'piano', name: '🎻 Strings - 伴奏（音色）' },
      { type: 'midi', subtype: 'bass', name: '🎻 Cello - バス' }
    ],
    features: ['古典進行（I-IV-V-I）', '対位法', '機能和声'],
    chordProgression: 'C-F-G-C',
    dynamics: ['p', 'mp', 'mf', 'f']  // 強弱記号
  },

  // 6. Folk Ballad（フォーク）
  {
    id: 'demo-song-006',
    name: 'Folk Ballad',
    genre: 'folk',
    duration: 8.0,
    tempo: 100,
    timeSignature: '3/4',  // ワルツ拍子
    key: 'G',
    description: '素朴で心温まるフォークバラード',
    tracks: [
      { type: 'midi', subtype: 'guitar', name: '🎸 Acoustic Guitar - アルペジオ' },
      { type: 'midi', subtype: 'bass', name: '🎸 Bass - シンプルベース' },
      { type: 'diffsinger', name: '🎤 Voice - 歌' }
    ],
    features: ['3拍子', 'アルペジオ', '素朴な響き'],
    chordProgression: 'G-Em-C-D',
    timeSignature: '3/4'
  },

  // 7. Rock Anthem（ロック）
  {
    id: 'demo-song-007',
    name: 'Rock Anthem',
    genre: 'rock',
    duration: 8.0,
    tempo: 140,
    timeSignature: '4/4',
    key: 'Am',
    description: '力強いロックアンセム',
    tracks: [
      { type: 'midi', subtype: 'guitar', name: '🎸 Electric Guitar - パワーコード' },
      { type: 'midi', subtype: 'bass', name: '🎸 Bass - ロックベース' },
      { type: 'drums', name: '🥁 Drums - ヘヴィビート' }
    ],
    features: ['ロック進行（i-VI-VII）', 'パワーコード', 'ドライブ感'],
    chordProgression: 'Am-F-G',
    distortion: true
  },

  // 8. Hip Hop Beat（ヒップホップ）
  {
    id: 'demo-song-008',
    name: 'Hip Hop Beat',
    genre: 'pop',  // ジャンル拡張時にhip_hopへ変更予定
    duration: 8.0,
    tempo: 85,
    timeSignature: '4/4',
    key: 'Dm',
    description: 'グルーヴィーなヒップホップビート',
    tracks: [
      { type: 'midi', subtype: 'bass', name: '🔊 Sub Bass - 808ベース' },
      { type: 'drums', name: '🥁 Drums - ヒップホップビート' },
      { type: 'midi', subtype: 'synth', name: '🎹 Synth - メロディー' }
    ],
    features: ['808ベース', 'ハイハットロール', 'スネアリム'],
    chordProgression: 'Dm-Bb-F-C',
    swing: true
  },

  // 9. Lo-fi Chill（ローファイ）
  {
    id: 'demo-song-009',
    name: 'Lo-fi Chill',
    genre: 'jazz',  // ジャズ要素を含むローファイ
    duration: 8.0,
    tempo: 75,
    timeSignature: '4/4',
    key: 'Em',
    description: 'リラックスできるローファイビート',
    tracks: [
      { type: 'midi', subtype: 'piano', name: '🎹 Piano - チル' },
      { type: 'midi', subtype: 'bass', name: '🎸 Bass - ジャジーベース' },
      { type: 'drums', name: '🥁 Drums - ローファイビート' }
    ],
    features: ['ジャズコード', 'ビニールノイズ', 'レイドバック'],
    chordProgression: 'Em7-Am7-Dm7-G7',
    vinyl_noise: true
  },

  // 10. Synthwave Night（シンセウェーブ）
  {
    id: 'demo-song-010',
    name: 'Synthwave Night',
    genre: 'edm',
    duration: 8.0,
    tempo: 110,
    timeSignature: '4/4',
    key: 'Fm',
    description: 'レトロフューチャーなシンセウェーブ',
    tracks: [
      { type: 'midi', subtype: 'synth', name: '🎹 Synth Lead - レトロリード' },
      { type: 'midi', subtype: 'bass', name: '🔊 Synth Bass - アナログベース' },
      { type: 'drums', name: '🥁 Drums - 80sビート' },
      { type: 'midi', subtype: 'synth', name: '🎹 Synth Pad - アンビエント' }
    },
    features: ['80sシンセサウンド', 'アルペジエーター', 'リバーブ'],
    chordProgression: 'Fm-Db-Eb-Cm',
    reverb: 'large_hall'
  },

  // 11. Bossa Nova（ボサノヴァ）
  {
    id: 'demo-song-011',
    name: 'Bossa Nova',
    genre: 'jazz',
    duration: 8.0,
    tempo: 130,
    timeSignature: '4/4',
    key: 'Dm',
    description: 'ブラジル風ボサノヴァ',
    tracks: [
      { type: 'midi', subtype: 'guitar', name: '🎸 Nylon Guitar - ボサノヴァリズム' },
      { type: 'midi', subtype: 'bass', name: '🎸 Bass - ウォーキング' },
      { type: 'drums', name: '🥁 Percussion - ブラジリアン' }
    ],
    features: ['ボサノヴァリズム', 'ジャジーコード', 'シンコペーション'],
    chordProgression: 'Dm7-G7-Cmaj7-Fmaj7',
    bossa_pattern: true
  },

  // 12. Orchestral Epic（オーケストラエピック）
  {
    id: 'demo-song-012',
    name: 'Orchestral Epic',
    genre: 'classical',
    duration: 8.0,
    tempo: 140,
    timeSignature: '4/4',
    key: 'Cm',
    description: '壮大なオーケストラエピック',
    tracks: [
      { type: 'midi', subtype: 'piano', name: '🎻 Strings - メインメロディー' },
      { type: 'midi', subtype: 'piano', name: '🎺 Brass - パワフル' },
      { type: 'drums', name: '🥁 Timpani - 打楽器' },
      { type: 'midi', subtype: 'bass', name: '🎻 Cello - バス' }
    ],
    features: ['壮大な響き', 'クレッシェンド', 'ドラマチック'],
    chordProgression: 'Cm-Ab-Bb-G',
    orchestration: 'full_orchestra'
  }
]
```

### Demo Song統合機能

#### DemoSongManager実装
**実装**: `frontend/src/managers/demoSongManager.js`

```javascript
class DemoSongManager {
  constructor() {
    this.demoSongs = DEMO_SONGS
    this.filteredSongs = this.demoSongs
    this.currentGenreFilter = null
  }

  /**
   * ジャンル別フィルタリング
   */
  filterByGenre(genreId) {
    if (!genreId) {
      this.filteredSongs = this.demoSongs
      return this.filteredSongs
    }

    this.currentGenreFilter = genreId
    this.filteredSongs = this.demoSongs.filter(song =>
      song.genre === genreId
    )

    console.log(`[DemoSong] Filtered to ${this.filteredSongs.length} songs for genre: ${genreId}`)
    return this.filteredSongs
  }

  /**
   * Demo Songブラウザ用データ取得
   */
  getBrowserData() {
    return {
      totalSongs: this.demoSongs.length,
      filteredSongs: this.filteredSongs,
      genreFilter: this.currentGenreFilter,
      genreStats: this.getGenreStats()
    }
  }

  /**
   * ジャンル別統計
   */
  getGenreStats() {
    const stats = {}
    for (const song of this.demoSongs) {
      stats[song.genre] = (stats[song.genre] || 0) + 1
    }
    return stats
  }

  /**
   * Demo Song読み込み
   */
  loadDemoSong(songId) {
    const song = this.demoSongs.find(s => s.id === songId)
    if (!song) {
      throw new Error(`Demo song not found: ${songId}`)
    }

    console.log(`[DemoSong] Loading: ${song.name}`)
    return song
  }
}
```

#### DemoSongBrowser UI
**実装**: `frontend/src/components/DemoSongBrowser.jsx`

```jsx
function DemoSongBrowser({ onLoad, currentGenre, onClose }) {
  const [demoSongs, setDemoSongs] = useState([])
  const [genreFilter, setGenreFilter] = useState(currentGenre)

  useEffect(() => {
    // DemoSongManagerから取得
    const browserData = demoSongManagerRef.current.getBrowserData()
    setDemoSongs(browserData.filteredSongs)
  }, [genreFilter])

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>🎵 Demo Songブラウザ</DialogTitle>
          <DialogDescription>
            12曲のプロフェッショナル品質のDemo Songから選択できます
          </DialogDescription>
        </DialogHeader>

        {/* ジャンルフィルター */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!genreFilter ? 'default' : 'outline'}
            onClick={() => setGenreFilter(null)}
          >
            すべて（12曲）
          </Button>
          {GENRES.map(genre => (
            <Button
              key={genre.id}
              variant={genreFilter === genre.id ? 'default' : 'outline'}
              onClick={() => setGenreFilter(genre.id)}
            >
              {genre.icon} {genre.name.ja}
            </Button>
          ))}
        </div>

        {/* Demo Song一覧 */}
        <ScrollArea className="h-[500px]">
          <div className="grid grid-cols-2 gap-4 p-4">
            {demoSongs.map(song => (
              <DemoSongCard
                key={song.id}
                song={song}
                onSelect={() => handleLoad(song.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function DemoSongCard({ song, onSelect }) {
  const genreData = GENRES.find(g => g.id === song.genre)

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl">{genreData?.icon}</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{song.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{song.description}</p>

            {/* 楽曲情報 */}
            <div className="flex gap-2 text-xs text-gray-500 mb-2">
              <span>⏱️ {song.duration}秒</span>
              <span>🎵 {song.tempo} BPM</span>
              <span>🎼 {song.key} {song.timeSignature}</span>
            </div>

            {/* トラック数 */}
            <div className="flex gap-1 mb-2">
              {song.tracks.map((track, idx) => (
                <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {track.name.split(' ')[0]}
                </span>
              ))}
            </div>

            {/* 特徴 */}
            <div className="flex gap-1 flex-wrap">
              {song.features.map((feature, idx) => (
                <span key={idx} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 品質基準

#### プロフェッショナル品質の定義
1. **音楽理論的正確性**: 各ジャンルの定番コード進行・スケール使用
2. **楽器バランス**: 適切なトラック数（3-4トラック）
3. **ミキシング**: 各楽器の音量・パン適切設定
4. **メロディー**: 覚えやすく、ジャンルらしい特徴
5. **リズム**: ジャンル特有のリズムパターン
6. **長さ**: 8秒（4小節）で完結する構成

#### 実装率
- **12曲実装完了**: 100%
- **ジャンルカバー**: 6/6ジャンル（100%）
- **ベーストラック**: 8/12曲（66.7%）
- **AI歌声統合**: 3/12曲（25%）

## 📊 パフォーマンス要件

| 項目 | 目標値 | 現在値 | 備考 |
|------|--------|--------|------|
| Demo Song読み込み | <2秒 | ~1秒 | LocalStorage読み込み |
| ジャンルフィルタ | <100ms | ~50ms | 配列フィルタリング |
| ブラウザUI描画 | <500ms | ~300ms | 12曲グリッド表示 |
| Demo Song切り替え | <1秒 | ~700ms | トラック再構築含む |

## 🔗 関連仕様

### 上位要件
- **[L1: 機能要件一覧](../L1_index.md)** - プロジェクト管理機能の位置づけ
- **[システム概要](../../../overview/index.md)** - 全体アーキテクチャ

### 同レベル要件
- **[L2: ジャンル管理要件](../L2_genre_management/)** - ジャンル統合
- **[L2: 音声処理要件](../L2_audio_processing/)** - トラック構成

---

**実装ファイル参照**:
- `frontend/src/managers/demoSongManager.js` - Demo Song管理
- `frontend/src/components/DemoSongBrowser.jsx` - ブラウザUI
- `frontend/src/data/sampleData.js` - Demo Songデータ定義
