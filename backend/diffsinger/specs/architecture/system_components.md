# システムコンポーネント詳細

**最終更新**: 2025-10-05
**バージョン**: 1.0.0

---

## 📋 主要コンポーネント

### 1. Acoustic Model (GaussianDiffusion)

**役割**: 音素列 + MIDI → Mel-spectrogram生成

**実装場所**: `backend/diffsinger_engine/usr/diff/shallow_diffusion_tts.py`

**技術詳細**:
- **モデル**: Shallow Diffusion Mechanism
- **Timesteps**: 100 steps
- **K_step**: 100（diffusion depth）
- **Loss Type**: L1 loss
- **出力次元**: 80 mel bins

**主要パラメータ**:
```yaml
timesteps: 100
K_step: 100
diff_loss_type: "l1"
audio_num_mel_bins: 80
spec_min: [-6.0, ...]  # 80次元
spec_max: [-0.79453, ...]  # 80次元
```

---

### 2. Pitch Extractor

**役割**: Mel-spectrogramからF0（基本周波数）予測

**実装場所**: `backend/diffsinger_engine/modules/fastspeech/pe.py`

**有効化条件**:
```yaml
pe_enable: true
pe_ckpt: "checkpoints/pe"
```

---

### 3. HiFi-GAN Vocoder

**役割**: Mel-spectrogram → 音声波形変換

**実装場所**: `backend/diffsinger_engine/vocoders/hifigan.py`

**仕様**:
- **サンプルレート**: 24000 Hz
- **Hop Size**: 128
- **NSF**: Neural Source Filter対応

---

### 4. Text Processor

**中国語実装**: `backend/diffsinger_engine/data_gen/tts/txt_processors/zh_g2pM.py`

**依存ライブラリ**:
- g2pM: Grapheme-to-Phoneme変換
- jieba: 分かち書き
- pypinyin: 拼音変換

---

**作成者**: Claude Code
