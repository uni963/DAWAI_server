class SFZParser {
  constructor() {
    this.instruments = {};
    this.samples = {};
  }

  async loadSFZFile(url) {
    console.log('🎵 Loading SFZ file:', url);
    
    try {
      const response = await fetch(url);
      const sfzContent = await response.text();
      
      console.log('🎵 SFZ file loaded, parsing...');
      return this.parseSFZ(sfzContent, url);
    } catch (error) {
      console.error('🎵 Error loading SFZ file:', error);
      throw error;
    }
  }

  parseSFZ(content, baseUrl) {
    console.log('🎵 Parsing SFZ content...');
    
    const lines = content.split('\n');
    const instrument = {
      name: this.extractInstrumentName(baseUrl),
      regions: [],
      groups: []
    };

    let currentGroup = {};
    let currentRegion = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // コメントをスキップ
      if (line.startsWith('//') || line === '') {
        continue;
      }

      // グループ開始
      if (line === '<group>') {
        if (Object.keys(currentRegion).length > 0) {
          instrument.regions.push({ ...currentGroup, ...currentRegion });
          currentRegion = {};
        }
        currentGroup = {};
        continue;
      }

      // リージョン開始
      if (line === '<region>') {
        if (Object.keys(currentRegion).length > 0) {
          instrument.regions.push({ ...currentGroup, ...currentRegion });
        }
        currentRegion = {};
        continue;
      }

      // パラメータを解析
      const [key, value] = line.split('=');
      if (key && value) {
        const paramKey = key.trim();
        const paramValue = value.trim();

        if (paramKey === 'sample') {
          currentRegion.sample = paramValue;
          console.log(`🎵 Found sample in region: ${paramValue}`);
        } else if (paramKey === 'key') {
          currentRegion.key = parseInt(paramValue);
        } else if (paramKey === 'lokey') {
          currentRegion.lokey = parseInt(paramValue);
        } else if (paramKey === 'hikey') {
          currentRegion.hikey = parseInt(paramValue);
        } else if (paramKey === 'pitch_keycenter') {
          currentRegion.pitch_keycenter = parseInt(paramValue);
        } else if (paramKey === 'volume') {
          currentRegion.volume = parseFloat(paramValue);
        } else if (paramKey === 'pan') {
          currentRegion.pan = parseFloat(paramValue);
        } else if (paramKey === 'loop_start') {
          currentRegion.loop_start = parseInt(paramValue);
        } else if (paramKey === 'loop_end') {
          currentRegion.loop_end = parseInt(paramValue);
        } else if (paramKey === 'ampeg_attack') {
          currentRegion.ampeg_attack = parseFloat(paramValue);
        } else if (paramKey === 'ampeg_decay') {
          currentRegion.ampeg_decay = parseFloat(paramValue);
        } else if (paramKey === 'ampeg_sustain') {
          currentRegion.ampeg_sustain = parseFloat(paramValue);
        } else if (paramKey === 'ampeg_release') {
          currentRegion.ampeg_release = parseFloat(paramValue);
        } else {
          // その他のパラメータをグループに保存
          currentGroup[paramKey] = paramValue;
        }
      }
    }

    // 最後のリージョンを追加
    if (Object.keys(currentRegion).length > 0) {
      instrument.regions.push({ ...currentGroup, ...currentRegion });
    }

    console.log(`🎵 Parsed ${instrument.regions.length} regions for ${instrument.name}`);
    return instrument;
  }

  extractInstrumentName(url) {
    // URLからファイル名を抽出
    const fileName = url.split('/').pop().replace('.sfz', '');
    // 番号とアンダースコアを除去して楽器名を取得
    return fileName.replace(/^\d+_/, '');
  }

  async loadSamples(instrument, baseUrl) {
    console.log('🎵 Loading samples for instrument:', instrument.name);
    
    const samples = {};
    const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/'));

    console.log('🎵 Base path for samples:', basePath);
    console.log('🎵 Total regions to process:', instrument.regions.length);

    for (const region of instrument.regions) {
      if (region.sample) {
        const sampleUrl = `${basePath}/${region.sample}`;
        console.log(`🎵 Attempting to load sample: ${sampleUrl}`);
        
        try {
          const audioBuffer = await this.loadAudioSample(sampleUrl);
          
          // 音階範囲を決定
          const key = region.key || region.pitch_keycenter;
          const lokey = region.lokey || key;
          const hikey = region.hikey || key;
          
          console.log(`🎵 Sample loaded successfully: ${region.sample}`);
          console.log(`🎵 Key range: ${lokey}-${hikey} (pitch_keycenter: ${region.pitch_keycenter})`);
          
          // 各音階にサンプルを割り当て
          for (let note = lokey; note <= hikey; note++) {
            samples[note] = {
              buffer: audioBuffer,
              volume: region.volume || 0,
              pan: region.pan || 0,
              loop_start: region.loop_start,
              loop_end: region.loop_end,
              pitch_keycenter: region.pitch_keycenter || key
            };
          }
          
          console.log(`🎵 Loaded sample: ${region.sample} for keys ${lokey}-${hikey}`);
        } catch (error) {
          console.error(`🎵 Error loading sample ${region.sample}:`, error);
          console.error(`🎵 Sample URL: ${sampleUrl}`);
        }
      } else {
        console.log('🎵 Region has no sample:', region);
      }
    }

    console.log(`🎵 Loaded ${Object.keys(samples).length} sample mappings`);
    console.log('🎵 Available sample keys:', Object.keys(samples));
    return samples;
  }

  async loadAudioSample(url) {
    console.log(`🎵 Fetching audio sample from: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`🎵 Audio sample response status: ${response.status}`);
    console.log(`🎵 Audio sample content type: ${response.headers.get('content-type')}`);
    console.log(`🎵 Audio sample size: ${response.headers.get('content-length')} bytes`);
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`🎵 Audio sample array buffer size: ${arrayBuffer.byteLength} bytes`);
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log(`🎵 Audio sample decoded successfully: ${audioBuffer.duration}s, ${audioBuffer.numberOfChannels} channels, ${audioBuffer.sampleRate}Hz`);
    
    return audioBuffer;
  }

  // ピアノサンプルを抽出
  async loadPianoSamples() {
    const pianoUrl = '/sounds/MuseScore_General/000_Grand Piano.sfz';
    const instrument = await this.loadSFZFile(pianoUrl);
    return await this.loadSamples(instrument, pianoUrl);
  }

  // ドラムサンプルを抽出
  async loadDrumSamples() {
    const drumUrl = '/sounds/MuseScore_General/000_Standard.sfz';
    const instrument = await this.loadSFZFile(drumUrl);
    return await this.loadSamples(instrument, drumUrl);
  }
}

export default SFZParser; 