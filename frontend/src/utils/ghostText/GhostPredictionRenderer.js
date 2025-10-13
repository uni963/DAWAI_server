// GhostPredictionRenderer: ゴーストノート描画
export default class GhostPredictionRenderer {
  constructor(midiEditor) {
    this.midiEditor = midiEditor;
    this.ghostNotes = [];
    this.isVisible = true;
    this.opacity = 0.5;
    this.ghostColor = '#8A2BE2';
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
} 