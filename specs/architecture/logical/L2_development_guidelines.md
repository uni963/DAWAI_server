# 開発ガイドライン (L2)

**Document ID**: LA-L2-DEVGUIDE-001
**Version**: 1.0.0
**Last Updated**: 2025-10-13
**Parent**: [L1: システムアーキテクチャ](./L1_system.md)
**Implementation Status**: ✅ Active Guidelines

## 📋 概要

DAWAIプロジェクトの開発における品質保証、コーディング規約、デバッグ手法のガイドラインです。

## 🔊 console.logクリーンアップ戦略

### 現状分析

**検出状況** (2025-10-13時点):
- **総console文数**: 3,086件
- **影響ファイル数**: 104ファイル
- **主な分布**:
  - `aiAgentEngine.js`: ~220件
  - `unifiedAudioSystem.js`: ~245件
  - `EnhancedMidiEditor.jsx`: ~140件
  - `ProjectManager.js`: ~81件
  - その他100ファイル: ~2,400件

### リリース直前の対応方針 ✅

**実施する対策**:

#### 1. 本番ビルド時の自動除去

**Vite設定** (`vite.config.js`):
```javascript
export default defineConfig({
  // ... 既存設定 ...

  build: {
    // 本番ビルド時のプラグイン
    rollupOptions: {
      plugins: [
        // console.* を自動除去
        {
          name: 'remove-console',
          transform(code, id) {
            if (id.includes('node_modules')) return null;

            // console.log/info/debug を除去（warn/errorは保持）
            return code.replace(
              /console\.(log|info|debug)\([^)]*\);?/g,
              '/* removed */'
            );
          }
        }
      ]
    },

    // 圧縮設定
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // すべてのconsoleを除去
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    }
  }
});
```

**利点**:
- ✅ **既存コード変更不要** - 開発中のデバッグ機能を保持
- ✅ **本番環境最適化** - ビルド時に自動的にconsole文を除去
- ✅ **機能破壊リスクゼロ** - コード変更なしで実現
- ✅ **パフォーマンス向上** - 本番環境で3,000+ の不要な関数呼び出しを削減

#### 2. 既存loggerユーティリティの活用

**実装済み**: `frontend/src/utils/logger.js` (182行)

**使用方法**:
```javascript
import logger from './utils/logger';

// 🟢 推奨: loggerを使用
logger.debug('デバッグ情報');     // 開発環境のみ
logger.info('情報ログ');         // 開発環境のみ
logger.warn('警告');             // 常に出力
logger.error('エラー');          // 常に出力

// 🎵 ドメイン別ログ
logger.audio('音声処理開始');
logger.midi('MIDI読み込み');
logger.ai('AI応答受信');
logger.project('プロジェクト保存');

// ⚡ パフォーマンス計測
const start = logger.performance('重い処理');
// ... 処理 ...
logger.performance('重い処理', start);

// 🔴 非推奨: 直接のconsole.log
console.log('デバッグ');  // ビルド時に自動除去される
```

**環境別動作**:
```javascript
// 開発環境 (npm run dev)
logger.debug('表示される');
logger.info('表示される');
logger.warn('表示される');
logger.error('表示される');

// 本番環境 (npm run build)
logger.debug('出力されない');
logger.info('出力されない');
logger.warn('表示される');  // ✅ 警告は保持
logger.error('表示される'); // ✅ エラーは保持
```

### 段階的移行ガイドライン

**次回リリース（v3.1.0）以降の計画**:

#### Phase 1: 高優先度ファイル（20ファイル）
**対象**: 2,000行超の大規模ファイル

1. `aiAgentEngine.js` (2,998行, ~220 console文)
2. `EnhancedMidiEditor.jsx` (2,630行, ~140 console文)
3. `DiffSingerTrack.jsx` (1,913行)
4. `ProjectManager.js` (1,697行, ~81 console文)
5. `unifiedAudioSystem.js` (1,669行, ~245 console文)

**変更例**:
```javascript
// Before
console.log('AI応答:', response);

// After
logger.ai('AI応答:', response);
```

#### Phase 2: 中優先度ファイル（30ファイル）
**対象**: 500-2,000行のファイル

- コンポーネントファイル (20ファイル)
- ユーティリティファイル (10ファイル)

#### Phase 3: 低優先度ファイル（54ファイル）
**対象**: 500行未満のファイル

### ベストプラクティス

#### ✅ DO: 推奨事項

1. **新規コードはloggerを使用**
   ```javascript
   import logger from './utils/logger';
   logger.debug('新機能開発中');
   ```

2. **ドメイン別ログ関数を活用**
   ```javascript
   logger.audio('サンプルロード完了');
   logger.midi('ノート追加');
   logger.ai('プロンプト送信');
   ```

3. **パフォーマンス計測にはlogger.performance**
   ```javascript
   const start = logger.performance('音声処理');
   await processAudio();
   logger.performance('音声処理', start);
   ```

4. **エラーは必ずlogger.error**
   ```javascript
   try {
     // 処理
   } catch (error) {
     logger.error('処理失敗:', error);
   }
   ```

#### ❌ DON'T: 避けるべき事項

1. **本番環境で大量のログ出力**
   ```javascript
   // ❌ 避ける
   notes.forEach(note => console.log(note));

   // ✅ 推奨
   logger.debug('ノート数:', notes.length);
   logger.table(notes); // 開発環境のみテーブル表示
   ```

2. **機密情報のログ出力**
   ```javascript
   // ❌ 危険
   console.log('APIキー:', apiKey);

   // ✅ 安全
   logger.debug('APIキー設定済み:', !!apiKey);
   ```

3. **ループ内での無条件ログ**
   ```javascript
   // ❌ パフォーマンス悪化
   for (let i = 0; i < 10000; i++) {
     console.log('処理中:', i);
   }

   // ✅ 条件付きログ
   for (let i = 0; i < 10000; i++) {
     if (i % 1000 === 0) logger.debug('進捗:', i);
   }
   ```

## 🎯 コード品質基準

### ファイルサイズガイドライン

| カテゴリ | 行数 | 状態 | 推奨アクション |
|---------|------|------|--------------|
| **小規模** | < 500行 | ✅ 良好 | 現状維持 |
| **中規模** | 500-1,500行 | 🟡 注意 | レビュー推奨 |
| **大規模** | 1,500-2,500行 | 🟠 要改善 | リファクタリング検討 |
| **超大規模** | > 2,500行 | 🔴 緊急 | 分割必須 |

### 現在の大規模ファイル（リファクタリング候補）

1. **aiAgentEngine.js** (2,998行)
   - 推奨: AI機能別にモジュール分割
   - 分割案: `streamingManager.js`, `memoryManager.js`, `ragSystem.js`

2. **EnhancedMidiEditor.jsx** (2,630行)
   - 推奨: UI/ロジック/描画で分割
   - 分割案: `MidiEditorUI.jsx`, `MidiEditorLogic.js`, `MidiCanvas.jsx`

3. **DiffSingerTrack.jsx** (1,913行)
   - 推奨: コンポーネント分割
   - 分割案: `DiffSingerUI.jsx`, `DiffSingerLogic.js`, `DiffSingerCanvas.jsx`

## 🔧 開発ツール設定

### ESLint設定（推奨）

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // console.* の警告
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error']  // warn/errorは許可
      }
    ],

    // ファイルサイズ制限
    'max-lines': ['warn', {
      max: 1500,
      skipBlankLines: true,
      skipComments: true
    }],

    // 関数の複雑度制限
    'complexity': ['warn', 20],

    // 関数サイズ制限
    'max-lines-per-function': ['warn', {
      max: 200,
      skipBlankLines: true,
      skipComments: true
    }]
  }
};
```

### Prettier設定

```javascript
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

## 📊 品質メトリクス

### 目標指標

| 指標 | 現状 | 目標 | 期限 |
|------|------|------|------|
| **console.log件数** | 3,086件 | < 100件 | v3.2.0 (2025-11) |
| **2,500行超ファイル** | 2件 | 0件 | v3.1.0 (2025-10) |
| **ESLint警告** | 未測定 | < 50件 | v3.1.0 (2025-10) |
| **TypeScript化率** | 0% | 30% | v4.0.0 (2026-Q1) |

### 測定コマンド

```bash
# console.log件数カウント
grep -r "console\.\(log\|info\|debug\)" src/ --include="*.js" --include="*.jsx" | wc -l

# ファイルサイズ分析
find src/ -name "*.jsx" -o -name "*.js" | xargs wc -l | sort -nr | head -20

# ESLint実行
npm run lint

# ビルドサイズ確認
npm run build
du -sh dist/
```

## 🔗 関連ドキュメント

- **[L1: システムアーキテクチャ](./L1_system.md)** - 全体構成
- **[L2: フロントエンド詳細](./L2_frontend/index.md)** - React実装詳細
- **[L2: バックエンド詳細](./L2_backend/index.md)** - FastAPI実装詳細

---

**実装ファイル参照**:
- **Logger**: `frontend/src/utils/logger.js` (182行)
- **Vite設定**: `frontend/vite.config.js`
- **ESLint設定**: `frontend/.eslintrc.js` (作成推奨)
- **Prettier設定**: `frontend/.prettierrc` (作成推奨)
