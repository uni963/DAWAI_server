// SF2 (SoundFont 2) File Parser for Web Audio API
// This module handles loading and parsing of SF2 files for use with Tone.js

class SF2Parser {
  constructor() {
    this.arrayBuffer = null;
    this.dataView = null;
    this.chunks = {};
    this.presets = [];
    this.instruments = [];
    this.samples = [];
    this.sampleData = {};
  }

  // Load SF2 file from URL
  async loadSF2File(url) {
    try {
      console.log('🎵 Loading SF2 file:', url);
      
      // ファイルサイズチェック
      const headResponse = await fetch(url, { method: 'HEAD' });
      if (!headResponse.ok) {
        throw new Error(`Failed to access SF2 file: ${headResponse.status} ${headResponse.statusText}`);
      }
      
      const contentLength = headResponse.headers.get('content-length');
      console.log('🎵 SF2 file size:', contentLength, 'bytes');
      
      // ファイルの読み込み
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch SF2 file: ${response.status} ${response.statusText}`);
      }
      
      this.arrayBuffer = await response.arrayBuffer();
      this.dataView = new DataView(this.arrayBuffer);
      
      console.log('🎵 SF2 file loaded, size:', this.arrayBuffer.byteLength, 'bytes');
      
      // Parse the SF2 file structure
      await this.parseSF2();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to load SF2 file:', error);
      throw error;
    }
  }

  // Parse SF2 file structure
  async parseSF2() {
    console.log('🎵 Parsing SF2 file structure...');
    
    // Check RIFF header
    const riffSignature = this.readString(0, 4);
    if (riffSignature !== 'RIFF') {
      throw new Error('Invalid SF2 file: Missing RIFF signature');
    }
    
    const fileSize = this.dataView.getUint32(4, true);
    const sfbkSignature = this.readString(8, 4);
    
    if (sfbkSignature !== 'sfbk') {
      throw new Error('Invalid SF2 file: Missing sfbk signature');
    }
    
    console.log('🎵 Valid SF2 file detected, size:', fileSize);
    
    // Parse chunks
    let offset = 12;
    while (offset < this.arrayBuffer.byteLength - 8) {
      const chunkId = this.readString(offset, 4);
      const chunkSize = this.dataView.getUint32(offset + 4, true);
      
      console.log(`🎵 Found chunk: ${chunkId}, size: ${chunkSize}`);
      
      // 同じIDのチャンクが複数ある場合は配列で管理
      if (this.chunks[chunkId]) {
        if (Array.isArray(this.chunks[chunkId])) {
          this.chunks[chunkId].push({
            offset: offset + 8,
            size: chunkSize
          });
        } else {
          this.chunks[chunkId] = [this.chunks[chunkId], {
            offset: offset + 8,
            size: chunkSize
          }];
        }
      } else {
        this.chunks[chunkId] = {
          offset: offset + 8,
          size: chunkSize
        };
      }
      
      offset += 8 + chunkSize;
      
      // Align to 2-byte boundary
      if (offset % 2 !== 0) {
        offset++;
      }
    }
    
    // Parse specific chunks we need
    if (this.chunks.LIST) {
      await this.parseListChunk();
    }
    
    // サンプルデータチャンクを解析
    if (this.chunks.sdta) {
      await this.parseSampleData();
    }
    
    // pdtaチャンク内のサブチャンクを解析
    // pdtaチャンクはLISTチャンク内にあるため、直接検索
    let pdtaFound = false;
    for (const [chunkId, chunkInfo] of Object.entries(this.chunks)) {
      if (chunkId === 'LIST') {
        const listChunks = Array.isArray(chunkInfo) ? chunkInfo : [chunkInfo];
        for (const listChunk of listChunks) {
          const listOffset = listChunk.offset;
          const listType = this.readString(listOffset, 4);
          if (listType === 'pdta') {
            console.log('🎵 Found pdta LIST chunk, parsing sub-chunks...');
            await this.parsePresetDataSubChunks(listChunk);
            pdtaFound = true;
            break;
          }
        }
        if (pdtaFound) break;
      }
    }
    
    if (!pdtaFound) {
      console.log('🎵 No pdta chunk found in LIST chunks');
    }
    
    console.log('🎵 SF2 parsing completed');
    console.log('🎵 Found presets:', this.presets.length);
    console.log('🎵 Found instruments:', this.instruments.length);
    console.log('🎵 Found samples:', this.samples.length);
    
    // デバッグ情報を詳細に出力
    if (this.presets.length > 0) {
      console.log('🎵 First 5 presets:', this.presets.slice(0, 5).map(p => `${p.name} (bank:${p.bank}, preset:${p.preset})`));
    }
    
    if (this.samples.length > 0) {
      console.log('🎵 First 5 samples:', this.samples.slice(0, 5).map(s => `${s.name} (start:${s.start}, end:${s.end}, pitch:${s.originalPitch})`));
    }
  }

  // Parse LIST chunk containing metadata
  async parseListChunk() {
    // 複数のLISTチャンクを処理
    for (const [chunkId, chunkInfo] of Object.entries(this.chunks)) {
      if (chunkId === 'LIST') {
        // 配列の場合は複数のLISTチャンク
        const listChunks = Array.isArray(chunkInfo) ? chunkInfo : [chunkInfo];
        
        for (const listChunk of listChunks) {
          const listOffset = listChunk.offset;
          const listType = this.readString(listOffset, 4);
          
          console.log('🎵 Parsing LIST chunk type:', listType);
          
          if (listType === 'INFO') {
            // Parse INFO chunk for metadata
            this.parseInfoChunk(listOffset + 4);
          } else if (listType === 'pdta') {
            // Parse preset data chunk
            await this.parsePresetData(listOffset + 4);
          }
        }
      }
    }
  }

  // プリセットヘッダーを解析
  async parsePresetHeaders() {
    console.log('🎵 Parsing preset headers...');
    
    const phdrOffset = this.chunks.phdr.offset;
    const phdrSize = this.chunks.phdr.size;
    const presetCount = (phdrSize - 38) / 38; // 38 bytes per preset header
    
    console.log(`🎵 Found ${presetCount} presets`);
    
    for (let i = 0; i < presetCount; i++) {
      const presetOffset = phdrOffset + (i * 38);
      const presetName = this.readString(presetOffset, 20);
      const preset = parseInt(this.dataView.getUint16(presetOffset + 20, true));
      const bank = parseInt(this.dataView.getUint16(presetOffset + 22, true));
      const presetBagIndex = parseInt(this.dataView.getUint16(presetOffset + 24, true));
      const library = parseInt(this.dataView.getUint32(presetOffset + 26, true));
      const genre = parseInt(this.dataView.getUint32(presetOffset + 30, true));
      const morphology = parseInt(this.dataView.getUint32(presetOffset + 34, true));
      
      if (presetName.trim()) {
        this.presets.push({
          name: presetName.trim(),
          preset,
          bank,
          presetBagIndex,
          library,
          genre,
          morphology
        });
      }
    }
  }

  // 楽器ヘッダーを解析
  async parseInstrumentHeaders() {
    console.log('🎵 Parsing instrument headers...');
    
    const instOffset = this.chunks.inst.offset;
    const instSize = this.chunks.inst.size;
    const instrumentCount = (instSize - 22) / 22; // 22 bytes per instrument header
    
    console.log(`🎵 Found ${instrumentCount} instruments`);
    
    for (let i = 0; i < instrumentCount; i++) {
      const instrumentOffset = instOffset + (i * 22);
      const instrumentName = this.readString(instrumentOffset, 20);
      const instrumentBagIndex = parseInt(this.dataView.getUint16(instrumentOffset + 20, true));
      
      if (instrumentName.trim()) {
        this.instruments.push({
          name: instrumentName.trim(),
          instrumentBagIndex
        });
      }
    }
  }

  // サンプルヘッダーを解析
  async parseSampleHeaders() {
    console.log('🎵 Parsing sample headers...');
    
    const shdrOffset = this.chunks.shdr.offset;
    const shdrSize = this.chunks.shdr.size;
    const sampleCount = (shdrSize - 46) / 46; // 46 bytes per sample header
    
    console.log(`🎵 Found ${sampleCount} samples`);
    
    this.samples = [];
    
    for (let i = 0; i < sampleCount; i++) {
      const sampleOffset = shdrOffset + (i * 46);
      const sampleName = this.readString(sampleOffset, 20);
      const start = this.dataView.getUint32(sampleOffset + 20, true);
      const end = this.dataView.getUint32(sampleOffset + 24, true);
      const startLoop = this.dataView.getUint32(sampleOffset + 28, true);
      const endLoop = this.dataView.getUint32(sampleOffset + 32, true);
      const sampleRate = this.dataView.getUint32(sampleOffset + 36, true);
      const originalPitch = this.dataView.getUint8(sampleOffset + 40);
      const pitchCorrection = this.dataView.getInt8(sampleOffset + 41);
      const sampleLink = this.dataView.getUint16(sampleOffset + 42, true);
      const sampleType = this.dataView.getUint16(sampleOffset + 44, true);
      
      if (sampleName.trim() && sampleName.trim() !== 'EOS') {
        this.samples.push({
          name: sampleName.trim(),
          start,
          end,
          startLoop,
          endLoop,
          sampleRate,
          originalPitch,
          pitchCorrection,
          sampleLink,
          sampleType
        });
      }
    }
    
    console.log(`🎵 Parsed ${this.samples.length} valid samples`);
  }

  // Parse preset data chunk
  async parsePresetData(offset) {
    console.log('🎵 Parsing preset data...');
    
    let currentOffset = offset;
    
    // LISTチャンク内のサブチャンクを解析
    const listSize = this.chunks.LIST[0].size; // 最初のLISTチャンクのサイズ
    let subOffset = offset;
    
    console.log(`🎵 Parsing sub-chunks from offset ${offset} to ${offset + listSize}`);
    
    while (subOffset < offset + listSize - 8) {
      const subChunkId = this.readString(subOffset, 4);
      const subChunkSize = this.dataView.getUint32(subOffset + 4, true);
      
      console.log(`🎵 Found sub-chunk: ${subChunkId}, size: ${subChunkSize}`);
      
      // サブチャンクを保存
      this.chunks[subChunkId] = {
        offset: subOffset + 8,
        size: subChunkSize
      };
      
      subOffset += 8 + subChunkSize;
      
      // Align to 2-byte boundary
      if (subOffset % 2 !== 0) {
        subOffset++;
      }
    }
    
    // Parse preset headers (phdr)
    if (this.chunks.phdr) {
      const phdrOffset = this.chunks.phdr.offset;
      const phdrSize = this.chunks.phdr.size;
      const presetCount = (phdrSize - 38) / 38; // 38 bytes per preset header
      
      console.log(`🎵 Found ${presetCount} presets`);
      
      for (let i = 0; i < presetCount; i++) {
        const presetOffset = phdrOffset + (i * 38);
        const presetName = this.readString(presetOffset, 20);
        const preset = parseInt(this.dataView.getUint16(presetOffset + 20, true));
        const bank = parseInt(this.dataView.getUint16(presetOffset + 22, true));
        const presetBagIndex = parseInt(this.dataView.getUint16(presetOffset + 24, true));
        const library = parseInt(this.dataView.getUint32(presetOffset + 26, true));
        const genre = parseInt(this.dataView.getUint32(presetOffset + 30, true));
        const morphology = parseInt(this.dataView.getUint32(presetOffset + 34, true));
        
        if (presetName.trim()) {
          this.presets.push({
            name: presetName.trim(),
            preset,
            bank,
            presetBagIndex,
            library,
            genre,
            morphology
          });
        }
      }
    }
    
    // Parse preset bags (pbag)
    if (this.chunks.pbag) {
      const pbagOffset = this.chunks.pbag.offset;
      const pbagSize = this.chunks.pbag.size;
      const bagCount = pbagSize / 4; // 4 bytes per bag
      
      console.log(`🎵 Found ${bagCount} preset bags`);
    }
    
    // Parse preset modulators (pmod)
    if (this.chunks.pmod) {
      const pmodOffset = this.chunks.pmod.offset;
      const pmodSize = this.chunks.pmod.size;
      const modCount = pmodSize / 10; // 10 bytes per modulator
      
      console.log(`🎵 Found ${modCount} preset modulators`);
    }
    
    // Parse preset generators (pgen)
    if (this.chunks.pgen) {
      const pgenOffset = this.chunks.pgen.offset;
      const pgenSize = this.chunks.pgen.size;
      const genCount = pgenSize / 4; // 4 bytes per generator
      
      console.log(`🎵 Found ${genCount} preset generators`);
    }
    
    // Parse instrument headers (inst)
    if (this.chunks.inst) {
      const instOffset = this.chunks.inst.offset;
      const instSize = this.chunks.inst.size;
      const instrumentCount = (instSize - 22) / 22; // 22 bytes per instrument header
      
      console.log(`🎵 Found ${instrumentCount} instruments`);
      
      for (let i = 0; i < instrumentCount; i++) {
        const instrumentOffset = instOffset + (i * 22);
        const instrumentName = this.readString(instrumentOffset, 20);
        const instrumentBagIndex = parseInt(this.dataView.getUint16(instrumentOffset + 20, true));
        
        if (instrumentName.trim()) {
          this.instruments.push({
            name: instrumentName.trim(),
            instrumentBagIndex
          });
        }
      }
    }
  }

  // Parse INFO chunk
  parseInfoChunk(offset) {
    console.log('🎵 Parsing INFO chunk...');
    
    // For now, we'll skip detailed INFO parsing
    // This would contain software version, bank name, etc.
  }

  // Parse sample data
  async parseSampleData() {
    console.log('🎵 Parsing sample data...');
    
    const sdtaOffset = this.chunks.sdta.offset;
    const sdtaSize = this.chunks.sdta.size;
    
    // サンプルデータチャンクの詳細解析
    let offset = sdtaOffset;
    
    // サンプルヘッダー（shdr）チャンクを探す
    if (this.chunks.shdr) {
      const shdrOffset = this.chunks.shdr.offset;
      const shdrSize = this.chunks.shdr.size;
      const sampleCount = (shdrSize - 46) / 46; // 46 bytes per sample header
      
      console.log(`🎵 Found ${sampleCount} sample headers`);
      
      this.samples = [];
      
      for (let i = 0; i < sampleCount; i++) {
        const sampleOffset = shdrOffset + (i * 46);
        const sampleName = this.readString(sampleOffset, 20);
        const start = this.dataView.getUint32(sampleOffset + 20, true);
        const end = this.dataView.getUint32(sampleOffset + 24, true);
        const startLoop = this.dataView.getUint32(sampleOffset + 28, true);
        const endLoop = this.dataView.getUint32(sampleOffset + 32, true);
        const sampleRate = this.dataView.getUint32(sampleOffset + 36, true);
        const originalPitch = this.dataView.getUint8(sampleOffset + 40);
        const pitchCorrection = this.dataView.getInt8(sampleOffset + 41);
        const sampleLink = this.dataView.getUint16(sampleOffset + 42, true);
        const sampleType = this.dataView.getUint16(sampleOffset + 44, true);
        
        if (sampleName.trim() && sampleName.trim() !== 'EOS') {
          this.samples.push({
            name: sampleName.trim(),
            start,
            end,
            startLoop,
            endLoop,
            sampleRate,
            originalPitch,
            pitchCorrection,
            sampleLink,
            sampleType
          });
        }
      }
      
      console.log(`🎵 Parsed ${this.samples.length} valid samples`);
    }
    
    // The actual sample data is in PCM format
    this.sampleData = {
      offset: sdtaOffset,
      size: sdtaSize,
      format: 'PCM16'
    };
    
    console.log('🎵 Sample data parsed, size:', sdtaSize);
  }

  // pdtaチャンク内のサブチャンクを解析
  async parsePresetDataSubChunks(pdtaChunk) {
    console.log('🎵 Parsing pdta sub-chunks...');
    
    if (!pdtaChunk) {
      console.log('🎵 No pdta chunk provided');
      return;
    }
    
    console.log(`🎵 Found pdta chunk at offset ${pdtaChunk.offset}, size ${pdtaChunk.size}`);
    
    // pdtaチャンク内のサブチャンクを解析
    let subOffset = pdtaChunk.offset + 4; // "pdta"の後にサブチャンクが続く
    const endOffset = pdtaChunk.offset + pdtaChunk.size;
    
    console.log(`🎵 Parsing sub-chunks from offset ${subOffset} to ${endOffset}`);
    
    while (subOffset < endOffset - 8) {
      const subChunkId = this.readString(subOffset, 4);
      const subChunkSize = this.dataView.getUint32(subOffset + 4, true);
      
      console.log(`🎵 Found pdta sub-chunk: ${subChunkId}, size: ${subChunkSize}`);
      
      // サブチャンクを保存
      this.chunks[subChunkId] = {
        offset: subOffset + 8,
        size: subChunkSize
      };
      
      subOffset += 8 + subChunkSize;
      
      // Align to 2-byte boundary
      if (subOffset % 2 !== 0) {
        subOffset++;
      }
    }
    
    // 各サブチャンクを解析
    if (this.chunks.phdr) {
      await this.parsePresetHeaders();
    }
    
    if (this.chunks.inst) {
      await this.parseInstrumentHeaders();
    }
    
    if (this.chunks.shdr) {
      await this.parseSampleHeaders();
    }
  }

  // Extract drum samples for General MIDI drum kit
  extractDrumSamples() {
    console.log('🎵 Extracting drum samples from SF2...');
    
    // Standard GM drum mapping
    const drumMapping = {
      36: 'Kick',
      38: 'Snare',
      41: 'Floor Tom',
      42: 'Hi-Hat Closed',
      45: 'Low Tom',
      46: 'Hi-Hat Open',
      47: 'Mid Tom',
      49: 'Crash',
      50: 'Ride Tom',
      51: 'Ride'
    };
    
    const drumSamples = {};
    
    // SF2ファイルから実際のドラムサンプルを抽出
    try {
      // CSVデータに基づいてドラムプリセットを探す
      const drumPreset = this.presets.find(preset => 
        preset.name === 'Standard' || // メインのドラムキット
        preset.name === 'Standard 1' ||
        preset.name === 'TR-808' ||
        preset.name === 'Jazz' ||
        preset.name === 'Orchestra Kit' ||
        (preset.bank === 128 && preset.preset === 0) // フォールバック: バンク128
      );
      
      if (drumPreset) {
        console.log(`🎵 Found drum preset: ${drumPreset.name}`);
        
        // 各ドラムノートのサンプルデータを抽出
        Object.entries(drumMapping).forEach(([midiNote, name]) => {
          const sampleData = this.extractSampleForNote(parseInt(midiNote), drumPreset);
          drumSamples[midiNote] = {
            name,
            data: sampleData,
            sampleRate: 44100,
            baseNote: parseInt(midiNote),
            loop: false
          };
        });
      } else {
        console.log('🎵 No drum preset found, using fallback samples');
        // フォールバック: 基本的なサンプルデータを作成
        Object.entries(drumMapping).forEach(([midiNote, name]) => {
          drumSamples[midiNote] = this.createFallbackDrumSample(parseInt(midiNote), name);
        });
      }
    } catch (error) {
      console.error('🎵 Error extracting drum samples:', error);
      // エラー時はフォールバックサンプルを使用
      Object.entries(drumMapping).forEach(([midiNote, name]) => {
        drumSamples[midiNote] = this.createFallbackDrumSample(parseInt(midiNote), name);
      });
    }
    
    console.log('🎵 Drum samples extracted:', Object.keys(drumSamples).length);
    return drumSamples;
  }

  // 特定のノートのサンプルデータを抽出
  extractSampleForNote(midiNote, preset) {
    try {
      // サンプルデータチャンクからPCMデータを抽出
      if (this.chunks.sdta && this.sampleData) {
        const sampleOffset = this.sampleData.offset;
        const sampleSize = Math.min(4096, this.sampleData.size); // 4KBのサンプル
        
        // PCM16データを読み込み
        const pcmData = new Int16Array(this.arrayBuffer, sampleOffset, sampleSize / 2);
        
        // Float32Arrayに変換
        const floatData = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          floatData[i] = pcmData[i] / 32768.0; // 16bit PCMを-1.0〜1.0に正規化
        }
        
        return floatData;
      }
    } catch (error) {
      console.error(`🎵 Error extracting sample for note ${midiNote}:`, error);
    }
    
    return null;
  }

  // フォールバックドラムサンプルの作成
  createFallbackDrumSample(midiNote, name) {
    console.log(`🎵 Creating fallback sample for ${name} (note ${midiNote})`);
    
    // 基本的なドラム音を生成
    const sampleRate = 44100;
    const duration = 0.3; // 300ms
    const sampleCount = Math.floor(sampleRate * duration);
    
    const sampleData = new Float32Array(sampleCount);
    
    // ノートに応じた周波数でドラム音を生成
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    const decay = 0.2;
    
    for (let i = 0; i < sampleCount; i++) {
      const time = i / sampleRate;
      const amplitude = Math.exp(-time / decay);
      
      if (midiNote === 36) { // Kick
        // 低周波のキック音
        sampleData[i] = amplitude * Math.sin(2 * Math.PI * 60 * time) * 0.8;
      } else if (midiNote === 38) { // Snare
        // ノイズベースのスネア音
        sampleData[i] = amplitude * (Math.random() * 2 - 1) * 0.6;
      } else if (midiNote === 42) { // Hi-Hat Closed
        // 高周波のハイハット音
        sampleData[i] = amplitude * Math.sin(2 * Math.PI * 8000 * time) * 0.4;
      } else if (midiNote === 46) { // Hi-Hat Open
        // より長いハイハット音
        sampleData[i] = amplitude * Math.sin(2 * Math.PI * 6000 * time) * 0.3;
      } else if (midiNote === 49) { // Crash
        // クラッシュシンバル
        sampleData[i] = amplitude * Math.sin(2 * Math.PI * 2000 * time) * 0.5;
      } else if (midiNote === 51) { // Ride
        // ライドシンバル
        sampleData[i] = amplitude * Math.sin(2 * Math.PI * 1500 * time) * 0.4;
      } else if (midiNote === 41 || midiNote === 45 || midiNote === 47 || midiNote === 50) { // Toms
        // トム音
        sampleData[i] = amplitude * Math.sin(2 * Math.PI * frequency * time) * 0.5;
      } else {
        // その他のドラム
        sampleData[i] = amplitude * Math.sin(2 * Math.PI * frequency * time) * 0.4;
      }
    }
    
    return {
      name,
      data: sampleData,
      sampleRate: 44100,
      baseNote: midiNote,
      loop: false
    };
  }

  // Extract piano samples
  extractPianoSamples() {
    console.log('🎵 Extracting piano samples from SF2...');
    
    const pianoSamples = {};
    
    // CSVデータに基づいてピアノプリセットを探す
    const pianoPreset = this.presets.find(preset => 
      preset.name === 'Grand Piano' || // メインのピアノ
      preset.name === 'Bright Grand Piano' ||
      preset.name === 'Electric Grand' ||
      preset.name === 'Honky-Tonk Piano' ||
      preset.name === 'Mellow Grand Piano' ||
      (preset.preset === 0 && preset.bank === 0) // フォールバック: プリセット0
    );
    
    if (pianoPreset) {
      console.log(`🎵 Found piano preset: ${pianoPreset.name}`);
      
      // ピアノの範囲（A0-C8）
      for (let note = 21; note <= 108; note++) {
        const noteName = this.midiToNoteName(note);
        const sampleData = this.extractPianoSampleFromSF2(note, pianoPreset);
        
        if (sampleData) {
          pianoSamples[note] = {
            name: `Piano ${noteName}`,
            data: sampleData,
            sampleRate: 44100,
            baseNote: note,
            loop: false
          };
        } else {
          // フォールバック: 生成されたピアノ音
          const fallbackData = this.createPianoSample(note, noteName);
          pianoSamples[note] = {
            name: `Piano ${noteName} (fallback)`,
            data: fallbackData,
            sampleRate: 44100,
            baseNote: note,
            loop: false
          };
        }
      }
    } else {
      console.log('🎵 No piano preset found. Available presets:');
      this.presets.slice(0, 20).forEach(preset => {
        console.log(`  - ${preset.name} (bank: ${preset.bank}, preset: ${preset.preset})`);
      });
      
      console.log('🎵 No piano preset found, using fallback samples');
      // フォールバック: 生成されたピアノ音
      for (let note = 21; note <= 108; note++) {
        const noteName = this.midiToNoteName(note);
        const sampleData = this.createPianoSample(note, noteName);
        pianoSamples[note] = {
          name: `Piano ${noteName} (fallback)`,
          data: sampleData,
          sampleRate: 44100,
          baseNote: note,
          loop: false
        };
      }
    }
    
    console.log('🎵 Piano samples extracted:', Object.keys(pianoSamples).length);
    return pianoSamples;
  }

  // SF2ファイルから実際のピアノサンプルを抽出
  extractPianoSampleFromSF2(midiNote, preset) {
    try {
      // デバッグ情報を出力
      console.log(`🎵 Extracting piano sample for note ${midiNote} (${this.midiToNoteName(midiNote)})`);
      console.log(`🎵 Available samples: ${this.samples.length}`);
      console.log(`🎵 Available chunks:`, Object.keys(this.chunks));
      
      if (this.samples.length === 0) {
        console.log('🎵 No samples found in SF2 file');
        return null;
      }
      
      // 最初の数個のサンプル名を表示
      console.log('🎵 First 5 samples:', this.samples.slice(0, 5).map(s => s.name));
      
      // ピアノ関連のサンプルを探す（実際のサンプル名で検索）
      const pianoSamples = this.samples.filter(sample => 
        sample.name.toLowerCase().includes('piano') ||
        sample.name.toLowerCase().includes('acoustic') ||
        sample.name.toLowerCase().includes('grand') ||
        sample.name.toLowerCase().includes('upright') ||
        sample.name.toLowerCase().includes('electric piano') ||
        sample.name.toLowerCase().includes('bright piano') ||
        sample.name.toLowerCase().includes('honky tonk')
      );
      
      if (pianoSamples.length > 0) {
        console.log('🎵 Piano-related samples found:', pianoSamples.slice(0, 10).map(s => s.name));
        console.log(`🎵 Total piano samples: ${pianoSamples.length}`);
      } else {
        console.log('🎵 No piano-related samples found');
      }
      
      // 音階サンプルを探す
      const noteSamples = this.samples.filter(sample => 
        /^[CDEFGAB]/.test(sample.name)
      );
      
      if (noteSamples.length > 0) {
        console.log('🎵 Note samples found:', noteSamples.slice(0, 10).map(s => s.name));
      } else {
        console.log('🎵 No note samples found');
      }
      
      // ノート名を取得
      const noteName = this.midiToNoteName(midiNote);
      
      // 利用可能なサンプルから該当するものを探す
      let matchingSample = this.samples.find(sample => 
        sample.name.toLowerCase().includes(noteName.toLowerCase()) ||
        sample.name.toLowerCase().includes('piano') ||
        sample.name.toLowerCase().includes('acoustic') ||
        sample.name.toLowerCase().includes('grand') ||
        sample.name.toLowerCase().includes('upright') ||
        sample.name.toLowerCase().includes('electric piano') ||
        sample.name.toLowerCase().includes('bright piano') ||
        sample.name.toLowerCase().includes('honky tonk') ||
        sample.originalPitch === midiNote
      );
      
      // ピアノサンプルが見つからない場合、より広範囲で検索
      if (!matchingSample) {
        // 音階のサンプルを探す（C、D、E、F、G、A、Bで始まるサンプル）
        const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const noteNameBase = noteName.replace(/[#0-9]/g, ''); // シャープと数字を除去
        
        if (noteNames.includes(noteNameBase)) {
          // ピアノ系のサンプルで音階が一致するものを探す
          matchingSample = this.samples.find(sample => 
            (sample.name.toLowerCase().includes('piano') ||
             sample.name.toLowerCase().includes('acoustic') ||
             sample.name.toLowerCase().includes('grand') ||
             sample.name.toLowerCase().includes('electric piano') ||
             sample.name.toLowerCase().includes('bright piano') ||
             sample.name.toLowerCase().includes('honky tonk')) &&
            (sample.name.toLowerCase().includes(noteNameBase.toLowerCase()) ||
             sample.name.toLowerCase().includes(noteName.toLowerCase()))
          );
          
          // まだ見つからない場合、音階のみで検索
          if (!matchingSample) {
            matchingSample = this.samples.find(sample => 
              sample.name.toLowerCase().startsWith(noteNameBase.toLowerCase()) ||
              sample.name.toLowerCase().includes(noteNameBase.toLowerCase())
            );
          }
        }
      }
      
      // まだ見つからない場合、楽器系のサンプルを探す
      if (!matchingSample) {
        matchingSample = this.samples.find(sample => 
          sample.name.toLowerCase().includes('string') ||
          sample.name.toLowerCase().includes('guitar') ||
          sample.name.toLowerCase().includes('bass') ||
          sample.name.toLowerCase().includes('violin') ||
          sample.name.toLowerCase().includes('cello') ||
          sample.name.toLowerCase().includes('flute') ||
          sample.name.toLowerCase().includes('clarinet') ||
          sample.name.toLowerCase().includes('trumpet') ||
          sample.name.toLowerCase().includes('saxophone')
        );
      }
      
      if (matchingSample && this.chunks.sdta) {
        console.log(`🎵 Found matching sample for note ${midiNote}: ${matchingSample.name}`);
        
        // サンプルデータの位置を計算
        const sampleDataOffset = this.chunks.sdta.offset + matchingSample.start;
        const sampleLength = matchingSample.end - matchingSample.start;
        
        console.log(`🎵 Sample data offset: ${sampleDataOffset}, length: ${sampleLength}`);
        
        // PCM16データを読み込み
        const pcmData = new Int16Array(this.arrayBuffer, sampleDataOffset, sampleLength / 2);
        
        // Float32Arrayに変換
        const floatData = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          floatData[i] = pcmData[i] / 32768.0; // 16bit PCMを-1.0〜1.0に正規化
        }
        
        console.log(`🎵 Extracted real piano sample for note ${midiNote}: ${floatData.length} samples`);
        return floatData;
      } else {
        console.log(`🎵 No matching sample found for note ${midiNote}, trying first sample`);
        // フォールバック: 最初のサンプルを使用
        if (this.samples.length > 0 && this.chunks.sdta) {
          const firstSample = this.samples[0];
          const sampleDataOffset = this.chunks.sdta.offset + firstSample.start;
          const sampleLength = Math.min(firstSample.end - firstSample.start, 8192); // 8KB制限
          
          console.log(`🎵 Using first sample: ${firstSample.name}, offset: ${sampleDataOffset}, length: ${sampleLength}`);
          
          const pcmData = new Int16Array(this.arrayBuffer, sampleDataOffset, sampleLength / 2);
          const floatData = new Float32Array(pcmData.length);
          for (let i = 0; i < pcmData.length; i++) {
            floatData[i] = pcmData[i] / 32768.0;
          }
          
          console.log(`🎵 Using fallback sample for note ${midiNote}: ${floatData.length} samples`);
          return floatData;
        }
      }
    } catch (error) {
      console.error(`🎵 Error extracting piano sample for note ${midiNote}:`, error);
    }
    
    console.log(`🎵 Failed to extract sample for note ${midiNote}, returning null`);
    return null;
  }

  // ピアノサンプルの作成
  createPianoSample(midiNote, noteName) {
    console.log(`🎵 Creating piano sample for ${noteName} (note ${midiNote})`);
    
    const sampleRate = 44100;
    const duration = 2.0; // 2秒
    const sampleCount = Math.floor(sampleRate * duration);
    
    const sampleData = new Float32Array(sampleCount);
    
    // ノートの周波数を計算
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    
    // ピアノのような減衰特性
    const attackTime = 0.01;
    const decayTime = 0.1;
    const sustainLevel = 0.7;
    const releaseTime = 1.0;
    
    for (let i = 0; i < sampleCount; i++) {
      const time = i / sampleRate;
      
      // ADSRエンベロープ
      let amplitude = 0;
      if (time < attackTime) {
        amplitude = time / attackTime;
      } else if (time < attackTime + decayTime) {
        amplitude = 1.0 - (1.0 - sustainLevel) * (time - attackTime) / decayTime;
      } else if (time < duration - releaseTime) {
        amplitude = sustainLevel;
      } else {
        amplitude = sustainLevel * (1.0 - (time - (duration - releaseTime)) / releaseTime);
      }
      
      // 基本周波数 + 倍音
      const fundamental = Math.sin(2 * Math.PI * frequency * time);
      const harmonic1 = Math.sin(2 * Math.PI * frequency * 2 * time) * 0.5;
      const harmonic2 = Math.sin(2 * Math.PI * frequency * 4 * time) * 0.25;
      
      sampleData[i] = amplitude * (fundamental + harmonic1 + harmonic2) * 0.3;
    }
    
    return sampleData;
  }

  // Convert samples to Web Audio API AudioBuffer format
  async createAudioBuffers(audioContext, samples) {
    console.log('🎵 Creating AudioBuffers from samples...');
    
    const audioBuffers = {};
    
    for (const [key, sample] of Object.entries(samples)) {
      try {
        if (sample.data && sample.data.length > 0) {
          // 実際のサンプルデータからAudioBufferを作成
          const buffer = audioContext.createBuffer(1, sample.data.length, sample.sampleRate);
          const channelData = buffer.getChannelData(0);
          
          // サンプルデータをコピー
          for (let i = 0; i < sample.data.length; i++) {
            channelData[i] = sample.data[i];
          }
          
          audioBuffers[key] = buffer;
          console.log(`🎵 Created AudioBuffer for ${sample.name}: ${sample.data.length} samples`);
        } else {
          // フォールバック: 短い無音バッファを作成
          const buffer = audioContext.createBuffer(1, 1024, 44100);
          audioBuffers[key] = buffer;
          console.log(`🎵 Created fallback AudioBuffer for ${sample.name}`);
        }
      } catch (error) {
        console.error(`🎵 Error creating AudioBuffer for ${sample.name}:`, error);
        // エラー時は無音バッファを作成
        const buffer = audioContext.createBuffer(1, 1024, 44100);
        audioBuffers[key] = buffer;
      }
    }
    
    console.log('🎵 AudioBuffers created:', Object.keys(audioBuffers).length);
    return audioBuffers;
  }

  // Helper methods
  readString(offset, length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      const charCode = this.dataView.getUint8(offset + i);
      if (charCode === 0) break; // Null terminator
      result += String.fromCharCode(charCode);
    }
    return result;
  }

  midiToNoteName(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
  }

  // Get available presets
  getPresets() {
    return this.presets;
  }

  // Get available instruments
  getInstruments() {
    return this.instruments;
  }

  // Get sample information
  getSamples() {
    return this.samples;
  }
}

export default SF2Parser;