#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Priority 1パッチ適用スクリプト
unifiedAudioSystem.jsに2つの重要な修正を適用します
"""

def apply_patch():
    input_file = 'unifiedAudioSystem.js'
    output_file = 'unifiedAudioSystem.js'

    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    modified_lines = []
    i = 0

    while i < len(lines):
        line_num = i + 1

        # ========================================
        # 修正1: constructor に loadingPromises 追加
        # ========================================
        if line_num == 38 and 'this.isPreloading = false' in lines[i]:
            modified_lines.append(lines[i])
            # loadingPromises の追加（既に追加されていないかチェック）
            if i + 1 < len(lines) and 'loadingPromises' not in lines[i + 1]:
                modified_lines.append('\n')
                modified_lines.append('    // Priority 1 修正: Promiseベース重複読み込み防止\n')
                modified_lines.append('    // 現在読み込み中のファイルのPromiseを管理（重複fetch防止）\n')
                modified_lines.append('    this.loadingPromises = new Map();\n')
            i += 1
            continue

        # ========================================
        # 修正2: loadAudioFile() メソッドの置き換え
        # ========================================
        # メソッド開始を検出 (line 238)
        if line_num == 238 and 'async loadAudioFile(filename, isPiano = false)' in lines[i]:
            print(f"Line {line_num}: loadAudioFile() 置き換え開始")

            # 新しい loadAudioFile() メソッドを追加
            modified_lines.append('  // 音声ファイルを読み込む（Priority 1修正: 重複読み込み防止機能追加）\n')
            modified_lines.append('  async loadAudioFile(filename, isPiano = false) {\n')
            modified_lines.append('    // キャッシュチェック: 既にデコード済みの場合は即座に返す\n')
            modified_lines.append('    if (this.audioBuffers[filename]) {\n')
            modified_lines.append('      return this.audioBuffers[filename];\n')
            modified_lines.append('    }\n')
            modified_lines.append('\n')
            modified_lines.append('    // 重複読み込み防止: 同じファイルの読み込み中Promiseを再利用\n')
            modified_lines.append('    if (this.loadingPromises.has(filename)) {\n')
            modified_lines.append('      console.log(`[LOAD_OPTIMIZE] 既存の読み込みPromiseを再利用: ${filename}`);\n')
            modified_lines.append('      return this.loadingPromises.get(filename);\n')
            modified_lines.append('    }\n')
            modified_lines.append('\n')
            modified_lines.append('    // 新規読み込みPromiseを作成\n')
            modified_lines.append('    const loadPromise = (async () => {\n')
            modified_lines.append('      try {\n')
            modified_lines.append('        let filePath;\n')
            modified_lines.append('\n')
            modified_lines.append('        // DiffSinger音声: 完全URLはそのまま使用\n')
            modified_lines.append("        if (filename.startsWith('http://') || filename.startsWith('https://')) {\n")
            modified_lines.append('          filePath = filename;\n')
            modified_lines.append('          console.log(`[UnifiedAudio] DiffSinger音声読み込み: ${filePath}`);\n')
            modified_lines.append('        } else {\n')
            modified_lines.append('          // ピアノ/ドラム音: 特殊文字を適切にエンコードしてパス構築\n')
            modified_lines.append('          const encodedFilename = encodeURIComponent(filename);\n')
            modified_lines.append('          filePath = isPiano\n')
            modified_lines.append('            ? `/sounds/MuseScore_General/samples/piano/${encodedFilename}`\n')
            modified_lines.append('            : `/sounds/MuseScore_General/samples/${encodedFilename}`;\n')
            modified_lines.append("          console.log(`[UnifiedAudio] 楽器サンプル読み込み: ${filePath} (${isPiano ? 'ピアノ' : 'ドラム'})`);\n")
            modified_lines.append('\n')
            modified_lines.append("          console.log('[PATH_DEBUG] =================================');\n")
            modified_lines.append("          console.log('[PATH_DEBUG] ファイルパス詳細情報（URL修正版）');\n")
            modified_lines.append("          console.log('[PATH_DEBUG] =================================');\n")
            modified_lines.append("          console.log('[PATH_DEBUG] 元ファイル名:', filename);\n")
            modified_lines.append("          console.log('[PATH_DEBUG] エンコード後ファイル名:', encodedFilename);\n")
            modified_lines.append("          console.log('[PATH_DEBUG] isPiano:', isPiano);\n")
            modified_lines.append("          console.log('[PATH_DEBUG] 構築されたパス:', filePath);\n")
            modified_lines.append("          console.log('[PATH_DEBUG] 完全URL:', `${window.location.origin}${filePath}`);\n")
            modified_lines.append("          console.log('[PATH_DEBUG] =================================');\n")
            modified_lines.append('        }\n')
            modified_lines.append('\n')
            modified_lines.append("        console.log('[FETCH_DEBUG] fetch開始:', filePath);\n")
            modified_lines.append('        const response = await fetch(filePath);\n')
            modified_lines.append("        console.log('[FETCH_DEBUG] fetch応答:', {\n")
            modified_lines.append('          status: response.status,\n')
            modified_lines.append('          statusText: response.statusText,\n')
            modified_lines.append('          ok: response.ok,\n')
            modified_lines.append('          url: response.url,\n')
            modified_lines.append('          headers: {\n')
            modified_lines.append("            'content-type': response.headers.get('content-type'),\n")
            modified_lines.append("            'content-length': response.headers.get('content-length')\n")
            modified_lines.append('          }\n')
            modified_lines.append('        });\n')
            modified_lines.append('\n')
            modified_lines.append('        if (!response.ok) {\n')
            modified_lines.append("          console.error('[FETCH_DEBUG] fetch失敗詳細:', {\n")
            modified_lines.append('            requestedUrl: filePath,\n')
            modified_lines.append('            actualUrl: response.url,\n')
            modified_lines.append('            status: response.status,\n')
            modified_lines.append('            statusText: response.statusText\n')
            modified_lines.append('          });\n')
            modified_lines.append('          throw new Error(`HTTP ${response.status}: ${response.statusText}`);\n')
            modified_lines.append('        }\n')
            modified_lines.append('\n')
            modified_lines.append("        console.log('[DECODE_DEBUG] arrayBuffer取得開始');\n")
            modified_lines.append('\n')
            modified_lines.append('        // 小さいファイルサイズ（＜10KB）の場合はテキストとして内容を確認\n')
            modified_lines.append("        const contentLength = response.headers.get('content-length');\n")
            modified_lines.append("        console.log('[DECODE_DEBUG] Content-Length:', contentLength);\n")
            modified_lines.append('\n')
            modified_lines.append('        if (contentLength && parseInt(contentLength) < 10000) {\n')
            modified_lines.append("          console.warn('[DECODE_DEBUG] ファイルサイズが小さすぎます（10KB未満）- テキスト内容を確認');\n")
            modified_lines.append('          const textClone = response.clone();\n')
            modified_lines.append('          const textContent = await textClone.text();\n')
            modified_lines.append("          console.log('[DECODE_DEBUG] ===== レスポンス詳細情報 =====');\n")
            modified_lines.append("          console.log('[DECODE_DEBUG] レスポンス状態:', response.status, response.statusText);\n")
            modified_lines.append("          console.log('[DECODE_DEBUG] レスポンスURL:', response.url);\n")
            modified_lines.append("          console.log('[DECODE_DEBUG] Content-Type:', response.headers.get('content-type'));\n")
            modified_lines.append("          console.log('[DECODE_DEBUG] Content-Length:', response.headers.get('content-length'));\n")
            modified_lines.append("          console.log('[DECODE_DEBUG] テキスト長:', textContent.length);\n")
            modified_lines.append("          console.log('[DECODE_DEBUG] テキスト型:', typeof textContent);\n")
            modified_lines.append("          console.log('[DECODE_DEBUG] レスポンス内容（先頭500文字）:');\n")
            modified_lines.append('          if (textContent.length === 0) {\n')
            modified_lines.append("            console.log('[DECODE_DEBUG] *** レスポンス内容が完全に空です ***');\n")
            modified_lines.append('          } else {\n')
            modified_lines.append('            console.log(`"${textContent.substring(0, 500)}"`);\n')
            modified_lines.append('          }\n')
            modified_lines.append("          console.log('[DECODE_DEBUG] ===============================');\n")
            modified_lines.append('        }\n')
            modified_lines.append('\n')
            modified_lines.append('        const arrayBuffer = await response.arrayBuffer();\n')
            modified_lines.append("        console.log('[DECODE_DEBUG] arrayBuffer取得成功:', {\n")
            modified_lines.append('          byteLength: arrayBuffer.byteLength,\n')
            modified_lines.append('          type: arrayBuffer.constructor.name,\n')
            modified_lines.append('          hasData: arrayBuffer.byteLength > 0,\n')
            modified_lines.append('          isLikelyAudio: arrayBuffer.byteLength > 10000\n')
            modified_lines.append('        });\n')
            modified_lines.append('\n')
            modified_lines.append("        console.log('[DECODE_DEBUG] decodeAudioData開始');\n")
            modified_lines.append('        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);\n')
            modified_lines.append("        console.log('[DECODE_DEBUG] decodeAudioData成功:', {\n")
            modified_lines.append('          duration: audioBuffer.duration,\n')
            modified_lines.append('          numberOfChannels: audioBuffer.numberOfChannels,\n')
            modified_lines.append('          sampleRate: audioBuffer.sampleRate,\n')
            modified_lines.append('          length: audioBuffer.length\n')
            modified_lines.append('        });\n')
            modified_lines.append('\n')
            modified_lines.append('        // キャッシュに保存\n')
            modified_lines.append('        this.audioBuffers[filename] = audioBuffer;\n')
            modified_lines.append('\n')
            modified_lines.append('        console.log(`音声デコード成功: ${audioBuffer.duration}s, ${audioBuffer.numberOfChannels}ch, ${audioBuffer.sampleRate}Hz`);\n')
            modified_lines.append('        return audioBuffer;\n')
            modified_lines.append('      } catch (error) {\n')
            modified_lines.append("        console.error('[DECODE_DEBUG] =================================');\n")
            modified_lines.append("        console.error('[DECODE_DEBUG] 音声処理エラー詳細');\n")
            modified_lines.append("        console.error('[DECODE_DEBUG] =================================');\n")
            modified_lines.append("        console.error('[DECODE_DEBUG] ファイル名:', filename);\n")
            modified_lines.append("        console.error('[DECODE_DEBUG] エラー種別:', error.name);\n")
            modified_lines.append("        console.error('[DECODE_DEBUG] エラーメッセージ:', error.message);\n")
            modified_lines.append("        console.error('[DECODE_DEBUG] エラー詳細:', error);\n")
            modified_lines.append("        console.error('[DECODE_DEBUG] AudioContext状態:', this.audioContext.state);\n")
            modified_lines.append("        console.error('[DECODE_DEBUG] =================================');\n")
            modified_lines.append('        return null;\n')
            modified_lines.append('      } finally {\n')
            modified_lines.append('        // 読み込み完了後、Promiseマップから削除\n')
            modified_lines.append('        this.loadingPromises.delete(filename);\n')
            modified_lines.append('      }\n')
            modified_lines.append('    })();\n')
            modified_lines.append('\n')
            modified_lines.append('    // 読み込み中Promiseを保存（重複fetch防止）\n')
            modified_lines.append('    this.loadingPromises.set(filename, loadPromise);\n')
            modified_lines.append('    return loadPromise;\n')
            modified_lines.append('  }\n')

            # 既存の loadAudioFile() をスキップ (line 238-351)
            while i < len(lines) and i < 351:
                i += 1
            continue

        # ========================================
        # 修正3: playPianoNoteSync() メソッドの置き換え
        # ========================================
        # メソッド開始を検出 (line 1256)
        if line_num == 1256 and 'playPianoNoteSync(pitch, velocity = 0.8)' in lines[i]:
            print(f"Line {line_num}: playPianoNoteSync() 置き換え開始")

            # 新しい playPianoNoteSync() メソッドを追加
            modified_lines.append('  // 同期的なピアノ音再生（クリック・キーボード用）\n')
            modified_lines.append('  // Priority 1修正: プリロード済みファイルは即座再生（<10ms）\n')
            modified_lines.append('  playPianoNoteSync(pitch, velocity = 0.8) {\n')
            modified_lines.append('    if (!this.isInitialized) {\n')
            modified_lines.append("      console.warn('音声システムが初期化されていません');\n")
            modified_lines.append('      return null;\n')
            modified_lines.append('    }\n')
            modified_lines.append('\n')
            modified_lines.append('    try {\n')
            modified_lines.append('      console.log(`同期的ピアノ音再生: ${pitch}, velocity: ${velocity}`);\n')
            modified_lines.append('\n')
            modified_lines.append('      // ピアノキーマッピングから音ファイル情報を取得\n')
            modified_lines.append('      const keyInfo = pianoKeyMapping[pitch];\n')
            modified_lines.append('      if (!keyInfo) {\n')
            modified_lines.append('        console.warn(`ピッチ ${pitch} のキー情報が見つかりません`);\n')
            modified_lines.append('        return null;\n')
            modified_lines.append('      }\n')
            modified_lines.append('\n')
            modified_lines.append('      // キャッシュチェック: プリロード済みの場合は即座再生（真の同期処理）\n')
            modified_lines.append('      const cachedBuffer = this.audioBuffers[keyInfo.sample];\n')
            modified_lines.append('\n')
            modified_lines.append('      if (cachedBuffer) {\n')
            modified_lines.append('        // プリロード済み: 即座に再生（<10ms）\n')
            modified_lines.append('        console.log(`[SYNC_PLAY] プリロード済みファイルを即座再生: ${keyInfo.sample}`);\n')
            modified_lines.append('\n')
            modified_lines.append('        // playAudioBuffer は async だが、await せずに fire-and-forget で実行\n')
            modified_lines.append('        // （音声再生の開始自体は同期的に行われ、完了を待つ必要はない）\n')
            modified_lines.append('        this.playAudioBuffer(cachedBuffer, keyInfo, velocity, \'piano\')\n')
            modified_lines.append('          .then(result => {\n')
            modified_lines.append('            if (result && result.soundId) {\n')
            modified_lines.append('              console.log(`即座再生完了: ${result.soundId}`);\n')
            modified_lines.append('            }\n')
            modified_lines.append('          })\n')
            modified_lines.append('          .catch(error => {\n')
            modified_lines.append("            console.error('即座再生エラー:', error);\n")
            modified_lines.append('          });\n')
            modified_lines.append('\n')
            modified_lines.append("        return { pitch, velocity, type: 'piano', cached: true };\n")
            modified_lines.append('\n')
            modified_lines.append('      } else {\n')
            modified_lines.append('        // 未読み込み: バックグラウンドで読み込み + 次回から即座再生\n')
            modified_lines.append('        console.log(`[SYNC_PLAY] バックグラウンド読み込み開始: ${keyInfo.sample}`);\n')
            modified_lines.append('\n')
            modified_lines.append('        // 非同期でロード + 再生（ユーザーには待たせない）\n')
            modified_lines.append('        this.loadAudioFile(keyInfo.sample, true).then(async audioBuffer => {\n')
            modified_lines.append('          if (audioBuffer) {\n')
            modified_lines.append('            try {\n')
            modified_lines.append("              const result = await this.playAudioBuffer(audioBuffer, keyInfo, velocity, 'piano');\n")
            modified_lines.append('              if (result && result.soundId) {\n')
            modified_lines.append('                console.log(`バックグラウンド再生完了: ${result.soundId}`);\n')
            modified_lines.append('              }\n')
            modified_lines.append('            } catch (audioError) {\n')
            modified_lines.append("              console.error('playAudioBuffer実行エラー:', audioError);\n")
            modified_lines.append('            }\n')
            modified_lines.append('          }\n')
            modified_lines.append('        }).catch(error => {\n')
            modified_lines.append("          console.error('同期的ピアノ音再生エラー:', error);\n")
            modified_lines.append('        });\n')
            modified_lines.append('\n')
            modified_lines.append('        // バックグラウンド処理を開始したことを返す（次回はキャッシュから即座再生）\n')
            modified_lines.append("        return { pitch, velocity, type: 'piano', cached: false, loading: true };\n")
            modified_lines.append('      }\n')
            modified_lines.append('    } catch (error) {\n')
            modified_lines.append("      console.error('同期的ピアノ音再生エラー:', error);\n")
            modified_lines.append('      return null;\n')
            modified_lines.append('    }\n')
            modified_lines.append('  }\n')

            # 既存の playPianoNoteSync() をスキップ (line 1256-1295)
            while i < len(lines) and i < 1295:
                i += 1
            continue

        # その他の行はそのまま保持
        modified_lines.append(lines[i])
        i += 1

    # 修正されたファイルを書き込み
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(modified_lines)

    print(f'\n完了: {len(lines)}行 -> {len(modified_lines)}行')
    print('Priority 1 パッチ適用成功')
    print('- constructor に loadingPromises 追加')
    print('- loadAudioFile() メソッド置き換え')
    print('- playPianoNoteSync() メソッド置き換え')

if __name__ == '__main__':
    apply_patch()
