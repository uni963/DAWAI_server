// ========================================
// 🔴 Priority 1: unifiedAudioSystem.js 修正パッチ
// ========================================
//
// このファイルには、unifiedAudioSystem.jsに適用する2つの重要な修正が含まれています:
// 1. playPianoNoteSync の真の同期化（プリロード済みファイルは即座再生）
// 2. Promiseベース重複読み込み防止
//
// 適用方法:
// 1. constructor() に loadingPromises を追加
// 2. loadAudioFile() メソッドを置き換え
// 3. playPianoNoteSync() メソッドを置き換え

// ========================================
// 修正1: constructor() への追加
// ========================================
// 以下の行を constructor() 内の this.isPreloading = false; の直後に追加:

    // 🔴 Priority 1 修正: Promiseベース重複読み込み防止
    // 現在読み込み中のファイルのPromiseを管理（重複fetch防止）
    this.loadingPromises = new Map();


// ========================================
// 修正2: loadAudioFile() メソッドの完全置き換え
// ========================================
// 既存の loadAudioFile() メソッド（lines 238-351）を以下に置き換え:

  // 音声ファイルを読み込む（🔴 重複読み込み防止機能追加）
  async loadAudioFile(filename, isPiano = false) {
    // ✅ キャッシュチェック: 既にデコード済みの場合は即座に返す
    if (this.audioBuffers[filename]) {
      return this.audioBuffers[filename];
    }

    // 🔴 重複読み込み防止: 同じファイルの読み込み中Promiseを再利用
    if (this.loadingPromises.has(filename)) {
      console.log(`📦 [LOAD_OPTIMIZE] 既存の読み込みPromiseを再利用: ${filename}`);
      return this.loadingPromises.get(filename);
    }

    // 新規読み込みPromiseを作成
    const loadPromise = (async () => {
      try {
        let filePath;

        // DiffSinger音声: 完全URLはそのまま使用
        if (filename.startsWith('http://') || filename.startsWith('https://')) {
          filePath = filename;
          console.log(`🎤 [UnifiedAudio] DiffSinger音声読み込み: ${filePath}`);
        } else {
          // ピアノ/ドラム音: 特殊文字を適切にエンコードしてパス構築
          const encodedFilename = encodeURIComponent(filename);
          filePath = isPiano
            ? `/sounds/MuseScore_General/samples/piano/${encodedFilename}`
            : `/sounds/MuseScore_General/samples/${encodedFilename}`;
          console.log(`📁 [UnifiedAudio] 楽器サンプル読み込み: ${filePath} (${isPiano ? 'ピアノ' : 'ドラム'})`);

          console.log('🔍 [PATH_DEBUG] =================================');
          console.log('🔍 [PATH_DEBUG] ファイルパス詳細情報（URL修正版）');
          console.log('🔍 [PATH_DEBUG] =================================');
          console.log('🔍 [PATH_DEBUG] 元ファイル名:', filename);
          console.log('🔍 [PATH_DEBUG] エンコード後ファイル名:', encodedFilename);
          console.log('🔍 [PATH_DEBUG] isPiano:', isPiano);
          console.log('🔍 [PATH_DEBUG] 構築されたパス:', filePath);
          console.log('🔍 [PATH_DEBUG] 完全URL:', `${window.location.origin}${filePath}`);
          console.log('🔍 [PATH_DEBUG] =================================');
        }

        console.log('🔍 [FETCH_DEBUG] fetch開始:', filePath);
        const response = await fetch(filePath);
        console.log('🔍 [FETCH_DEBUG] fetch応答:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: response.url,
          headers: {
            'content-type': response.headers.get('content-type'),
            'content-length': response.headers.get('content-length')
          }
        });

        if (!response.ok) {
          console.error('🚨 [FETCH_DEBUG] fetch失敗詳細:', {
            requestedUrl: filePath,
            actualUrl: response.url,
            status: response.status,
            statusText: response.statusText
          });
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('🔍 [DECODE_DEBUG] arrayBuffer取得開始');

        // 🚨 [CRITICAL] 小さいファイルサイズ（＜10KB）の場合はテキストとして内容を確認
        const contentLength = response.headers.get('content-length');
        console.log('🔍 [DECODE_DEBUG] Content-Length:', contentLength);

        if (contentLength && parseInt(contentLength) < 10000) {
          console.warn('🚨 [DECODE_DEBUG] ファイルサイズが小さすぎます（10KB未満）- テキスト内容を確認');
          const textClone = response.clone();
          const textContent = await textClone.text();
          console.log('🚨 [DECODE_DEBUG] ===== レスポンス詳細情報 =====');
          console.log('🚨 [DECODE_DEBUG] レスポンス状態:', response.status, response.statusText);
          console.log('🚨 [DECODE_DEBUG] レスポンスURL:', response.url);
          console.log('🚨 [DECODE_DEBUG] Content-Type:', response.headers.get('content-type'));
          console.log('🚨 [DECODE_DEBUG] Content-Length:', response.headers.get('content-length'));
          console.log('🚨 [DECODE_DEBUG] テキスト長:', textContent.length);
          console.log('🚨 [DECODE_DEBUG] テキスト型:', typeof textContent);
          console.log('🚨 [DECODE_DEBUG] レスポンス内容（先頭500文字）:');
          if (textContent.length === 0) {
            console.log('🚨 [DECODE_DEBUG] *** レスポンス内容が完全に空です ***');
          } else {
            console.log(`"${textContent.substring(0, 500)}"`);
          }
          console.log('🚨 [DECODE_DEBUG] ===============================');
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log('🔍 [DECODE_DEBUG] arrayBuffer取得成功:', {
          byteLength: arrayBuffer.byteLength,
          type: arrayBuffer.constructor.name,
          hasData: arrayBuffer.byteLength > 0,
          isLikelyAudio: arrayBuffer.byteLength > 10000
        });

        console.log('🔍 [DECODE_DEBUG] decodeAudioData開始');
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        console.log('🔍 [DECODE_DEBUG] decodeAudioData成功:', {
          duration: audioBuffer.duration,
          numberOfChannels: audioBuffer.numberOfChannels,
          sampleRate: audioBuffer.sampleRate,
          length: audioBuffer.length
        });

        // ✅ キャッシュに保存
        this.audioBuffers[filename] = audioBuffer;

        console.log(`✅ 音声デコード成功: ${audioBuffer.duration}s, ${audioBuffer.numberOfChannels}ch, ${audioBuffer.sampleRate}Hz`);
        return audioBuffer;
      } catch (error) {
        console.error('🚨 [DECODE_DEBUG] =================================');
        console.error('🚨 [DECODE_DEBUG] 音声処理エラー詳細');
        console.error('🚨 [DECODE_DEBUG] =================================');
        console.error('🚨 [DECODE_DEBUG] ファイル名:', filename);
        console.error('🚨 [DECODE_DEBUG] エラー種別:', error.name);
        console.error('🚨 [DECODE_DEBUG] エラーメッセージ:', error.message);
        console.error('🚨 [DECODE_DEBUG] エラー詳細:', error);
        console.error('🚨 [DECODE_DEBUG] AudioContext状態:', this.audioContext.state);
        console.error('🚨 [DECODE_DEBUG] =================================');
        return null;
      } finally {
        // 🔴 読み込み完了後、Promiseマップから削除
        this.loadingPromises.delete(filename);
      }
    })();

    // 🔴 読み込み中Promiseを保存（重複fetch防止）
    this.loadingPromises.set(filename, loadPromise);
    return loadPromise;
  }


// ========================================
// 修正3: playPianoNoteSync() メソッドの完全置き換え
// ========================================
// 既存の playPianoNoteSync() メソッド（lines 1256-1295）を以下に置き換え:

  // 🔴 同期的なピアノ音再生（クリック・キーボード用）
  // Priority 1修正: プリロード済みファイルは即座再生（<10ms）
  playPianoNoteSync(pitch, velocity = 0.8) {
    if (!this.isInitialized) {
      console.warn('音声システムが初期化されていません');
      return null;
    }

    try {
      console.log(`🎹 同期的ピアノ音再生: ${pitch}, velocity: ${velocity}`);

      // ピアノキーマッピングから音ファイル情報を取得
      const keyInfo = pianoKeyMapping[pitch];
      if (!keyInfo) {
        console.warn(`ピッチ ${pitch} のキー情報が見つかりません`);
        return null;
      }

      // ✅ キャッシュチェック: プリロード済みの場合は即座再生（真の同期処理）
      const cachedBuffer = this.audioBuffers[keyInfo.sample];

      if (cachedBuffer) {
        // 🚀 プリロード済み: 即座に再生（<10ms）
        console.log(`🚀 [SYNC_PLAY] プリロード済みファイルを即座再生: ${keyInfo.sample}`);

        // playAudioBuffer は async だが、await せずに fire-and-forget で実行
        // （音声再生の開始自体は同期的に行われ、完了を待つ必要はない）
        this.playAudioBuffer(cachedBuffer, keyInfo, velocity, 'piano')
          .then(result => {
            if (result && result.soundId) {
              console.log(`🎹 即座再生完了: ${result.soundId}`);
            }
          })
          .catch(error => {
            console.error('🎹 即座再生エラー:', error);
          });

        return { pitch, velocity, type: 'piano', cached: true };

      } else {
        // ⏳ 未読み込み: バックグラウンドで読み込み + 次回から即座再生
        console.log(`⏳ [SYNC_PLAY] バックグラウンド読み込み開始: ${keyInfo.sample}`);

        // 非同期でロード + 再生（ユーザーには待たせない）
        this.loadAudioFile(keyInfo.sample, true).then(async audioBuffer => {
          if (audioBuffer) {
            try {
              const result = await this.playAudioBuffer(audioBuffer, keyInfo, velocity, 'piano');
              if (result && result.soundId) {
                console.log(`🎹 バックグラウンド再生完了: ${result.soundId}`);
              }
            } catch (audioError) {
              console.error('🎹 playAudioBuffer実行エラー:', audioError);
            }
          }
        }).catch(error => {
          console.error('同期的ピアノ音再生エラー:', error);
        });

        // バックグラウンド処理を開始したことを返す（次回はキャッシュから即座再生）
        return { pitch, velocity, type: 'piano', cached: false, loading: true };
      }
    } catch (error) {
      console.error('同期的ピアノ音再生エラー:', error);
      return null;
    }
  }


// ========================================
// 適用手順
// ========================================
//
// 1. バックアップ作成:
//    cp unifiedAudioSystem.js unifiedAudioSystem.js.backup
//
// 2. constructor() 修正:
//    - lines 36-39 の this.isPreloading = false; の直後に追加:
//      this.loadingPromises = new Map();
//
// 3. loadAudioFile() 置き換え:
//    - lines 238-351 を削除
//    - 上記の新しい loadAudioFile() メソッドで置き換え
//
// 4. playPianoNoteSync() 置き換え:
//    - lines 1256-1295 を削除
//    - 上記の新しい playPianoNoteSync() メソッドで置き換え
//
// 5. テスト:
//    - Piano track view で音声再生確認
//    - 遅延測定（ユーザー入力→音声再生）
//    - 既存プロジェクト読み込み・再生テスト
//
// ========================================
// 期待される改善
// ========================================
//
// ✅ プリロード済みファイル: <10ms で音声再生開始
// ✅ 未読み込みファイル: バックグラウンド読み込み、次回から<10ms
// ✅ 重複fetch完全防止: 同時呼び出しでも1回のみネットワークアクセス
// ✅ 既存機能完全維持: 音質、UI、インタラクション、データ形式
// ✅ 呼び出し元変更不要: 他のファイルからのAPI変更なし
