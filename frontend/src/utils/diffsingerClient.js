const API_BASE_URL = '/ai/api/voice'; // DiffSingerサーバーのAPI

const diffsingerClient = {
  async synthesize(trackData) {
    const { midiData, voiceSynthData } = trackData;

    const requestBody = {
      notes: midiData.notes.map(note => ({
        pitch: note.pitch,
        start_time: note.time,
        end_time: note.time + note.duration,
        lyric: note.lyric || 'a', // Use 'a' as a placeholder for now
      })),
      model_id: voiceSynthData.modelId || 'lotte_v',
      language: voiceSynthData.language || 'japanese',
      params: voiceSynthData.params,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Synthesis request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('DiffSinger API error:', error);
      throw error;
    }
  },

  async getStatus(requestId) {
    try {
      const response = await fetch(`${API_BASE_URL}/status/${requestId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get synthesis status');
      }
      return await response.json();
    } catch (error) {
      console.error('DiffSinger API status error:', error);
      throw error;
    }
  },
};

export default diffsingerClient;
