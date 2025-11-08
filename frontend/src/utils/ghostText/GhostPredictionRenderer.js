// GhostPredictionRenderer: ゴーストノート描画
export default class GhostPredictionRenderer {
  constructor(midiEditor) {
    this.midiEditor = midiEditor;
    this.ghostNotes = [];
    this.phraseNotes = []; // フレーズ予測ノート
    this.isVisible = true;
    this.opacity = 0.5;
    this.ghostColor = '#8A2BE2'; // 通常のゴーストノート（紫）
    this.phraseColor = '#4CAF50'; // フレーズノート（緑）
    this.strongBeatColor = '#FFD700'; // 強拍インジケーター（金）
    this.ghostElements = [];
    this.canvas = null;
    this.ctx = null;
  }

  initialize(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setupCanvas();
  }

  setupCanvas() {
    if (!this.canvas || !this.ctx) return;
    
    // キャンバスの設定
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = this.ghostColor;
    this.ctx.fillStyle = this.ghostColor;
  }

  updateGhostNotes(predictions) {
    this.ghostNotes = Array.isArray(predictions) ? predictions : [];
    this.render();
  }

  render() {
    if (!this.isVisible || !this.ctx || !this.midiEditor) return;
    
    this.clearGhostNotes();
    
    this.ghostNotes.forEach((note, index) => {
      this.renderGhostNote(note, index);
    });
  }

  renderGhostNote(note, index) {
    if (!this.ctx || !this.midiEditor) return;

    const { pitch, start, duration, velocity } = note;
    
    // MIDIエディタの座標系に変換
    const x = this.midiEditor.timeToX(start);
    const y = this.midiEditor.pitchToY(pitch);
    const width = this.midiEditor.timeToX(start + duration) - x;
    const height = this.midiEditor.noteHeight || 20;

    // ゴーストノートの描画
    this.ctx.save();
    this.ctx.globalAlpha = this.opacity;
    this.ctx.strokeStyle = this.ghostColor;
    this.ctx.fillStyle = this.ghostColor;
    
    // ノートの外枠
    this.ctx.strokeRect(x, y, width, height);
    
    // ノートの内部（半透明）
    this.ctx.globalAlpha = this.opacity * 0.3;
    this.ctx.fillRect(x, y, width, height);
    
    // ゴーストノートのインジケーター
    this.ctx.globalAlpha = this.opacity;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '12px Arial';
    this.ctx.fillText('👻', x + 5, y + height - 5);
    
    this.ctx.restore();
  }

  clearGhostNotes() {
    if (!this.ctx || !this.canvas) return;
    
    // キャンバス全体をクリア（MIDIエディタの再描画が必要）
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  acceptGhostNote(index) {
    if (index >= 0 && index < this.ghostNotes.length) {
      const acceptedNote = this.ghostNotes[index];
      
      // MIDIエディタにノートを追加
      if (this.midiEditor && this.midiEditor.addNote) {
        this.midiEditor.addNote(acceptedNote);
      }
      
      // ゴーストノートを削除
      this.ghostNotes.splice(index, 1);
      this.render();
      
      return acceptedNote;
    }
    return null;
  }

  acceptAllGhostNotes() {
    const acceptedNotes = [...this.ghostNotes];
    
    acceptedNotes.forEach(note => {
      if (this.midiEditor && this.midiEditor.addNote) {
        this.midiEditor.addNote(note);
      }
    });
    
    this.ghostNotes = [];
    this.render();
    
    return acceptedNotes;
  }

  show() { 
    this.isVisible = true; 
    this.render(); 
  }
  
  hide() { 
    this.isVisible = false; 
    this.clearGhostNotes(); 
  }
  
  setOpacity(value) { 
    this.opacity = Math.max(0, Math.min(1, value)); 
    this.render(); 
  }

  setGhostColor(color) {
    this.ghostColor = color;
    this.render();
  }

  getGhostNotes() {
    return [...this.ghostNotes];
  }

  hasGhostNotes() {
    return this.ghostNotes.length > 0;
  }

  // 🎼 フレーズ予測専用メソッド

  /**
   * フレーズノートを更新・描画
   * @param {Array} phraseNotes - フレーズノートの配列
   */
  updatePhraseNotes(phraseNotes) {
    this.phraseNotes = Array.isArray(phraseNotes) ? phraseNotes : [];
    this.renderPhraseNotes();
  }

  /**
   * フレーズノート全体を描画
   */
  renderPhraseNotes() {
    if (!this.isVisible || !this.ctx || !this.midiEditor) return;

    this.clearGhostNotes();

    // フレーズノートを描画
    this.phraseNotes.forEach((note, index) => {
      this.renderPhraseNote(note, index);
    });

    // 通常のゴーストノートも描画
    this.ghostNotes.forEach((note, index) => {
      this.renderGhostNote(note, index);
    });
  }

  /**
   * 個別のフレーズノートを描画
   * @param {Object} note - フレーズノート
   * @param {number} index - インデックス
   */
  renderPhraseNote(note, index) {
    if (!this.ctx || !this.midiEditor) return;

    const { pitch, timing, duration, isStrongBeat } = note;

    // タイミングからスタート位置を計算（現在のカーソル位置からの相対位置）
    const cursorTime = this.midiEditor.currentTime || 0;
    const startTime = cursorTime + timing;

    // MIDIエディタの座標系に変換
    const x = this.midiEditor.timeToX ? this.midiEditor.timeToX(startTime) : startTime * 100;
    const y = this.midiEditor.pitchToY ? this.midiEditor.pitchToY(pitch) : (88 - pitch) * 10;
    const width = this.midiEditor.timeToX ?
      this.midiEditor.timeToX(startTime + duration) - x :
      duration * 100;
    const height = this.midiEditor.noteHeight || 20;

    // フレーズノートの描画（緑色）
    this.ctx.save();
    this.ctx.globalAlpha = this.opacity;
    this.ctx.strokeStyle = this.phraseColor;
    this.ctx.fillStyle = this.phraseColor;

    // ノートの外枠（緑）
    this.ctx.lineWidth = isStrongBeat ? 3 : 2; // 強拍は太い線
    this.ctx.strokeRect(x, y, width, height);

    // ノートの内部（半透明の緑）
    this.ctx.globalAlpha = this.opacity * 0.3;
    this.ctx.fillRect(x, y, width, height);

    // インジケーター
    this.ctx.globalAlpha = this.opacity;
    if (isStrongBeat) {
      // 強拍: 金色のインジケーター
      this.ctx.fillStyle = this.strongBeatColor;
      this.ctx.font = 'bold 14px Arial';
      this.ctx.fillText('●', x + 5, y + height - 5);
    } else {
      // 弱拍: 音符アイコン
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '12px Arial';
      this.ctx.fillText('♪', x + 5, y + height - 5);
    }

    this.ctx.restore();
  }

  /**
   * フレーズ全体の再生プレビュー
   * @param {Object} audioEngine - オーディオエンジン
   * @returns {Promise<void>}
   */
  async previewPhrase(audioEngine) {
    if (!audioEngine || this.phraseNotes.length === 0) {
      console.warn('No audio engine or phrase notes to preview');
      return;
    }

    console.log('🎵 Previewing phrase with', this.phraseNotes.length, 'notes');

    for (const note of this.phraseNotes) {
      if (audioEngine.playNote) {
        await audioEngine.playNote(note.pitch, note.duration, note.velocity);
        // 次のノートまで待つ
        await new Promise(resolve => setTimeout(resolve, note.duration * 1000));
      }
    }
  }

  /**
   * フレーズを一括で受け入れ
   * @returns {Array} 受け入れたノートの配列
   */
  acceptPhrase() {
    if (this.phraseNotes.length === 0) {
      console.warn('No phrase notes to accept');
      return [];
    }

    const acceptedNotes = [...this.phraseNotes];

    // MIDIエディタにノートを追加
    const cursorTime = this.midiEditor.currentTime || 0;
    acceptedNotes.forEach(note => {
      const actualNote = {
        pitch: note.pitch,
        start: cursorTime + note.timing,
        duration: note.duration,
        velocity: note.velocity || 0.8
      };

      if (this.midiEditor && this.midiEditor.addNote) {
        this.midiEditor.addNote(actualNote);
      }
    });

    // フレーズノートをクリア
    this.phraseNotes = [];
    this.renderPhraseNotes();

    console.log('🎵 Accepted', acceptedNotes.length, 'phrase notes');
    return acceptedNotes;
  }

  /**
   * フレーズノートをクリア
   */
  clearPhraseNotes() {
    this.phraseNotes = [];
    this.renderPhraseNotes();
  }

  /**
   * フレーズノートの存在確認
   * @returns {boolean}
   */
  hasPhraseNotes() {
    return this.phraseNotes.length > 0;
  }
} 