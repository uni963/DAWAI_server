import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

const LyricsPanel = ({ activeTrack, onLyricsChange, onGenerateVoice }) => {
  const [lyrics, setLyrics] = useState(activeTrack?.voiceSynthData?.lyrics || '');

  const handleLyricsChange = (e) => {
    setLyrics(e.target.value);
  };

  const handleBlur = () => {
    if (onLyricsChange) {
      onLyricsChange(activeTrack.id, lyrics);
    }
  };

  const handleGenerateClick = () => {
    if (onGenerateVoice) {
      onGenerateVoice(activeTrack.id);
    }
  };

  if (!activeTrack || activeTrack.type !== 'voiceSynth') {
    return (
      <div className="lyrics-panel-placeholder">
        <p>Select a Voice Synth track to edit lyrics.</p>
      </div>
    );
  }

  return (
    <div className="lyrics-panel">
      <h3>Lyrics Editor</h3>
      <textarea
        value={lyrics}
        onChange={handleLyricsChange}
        onBlur={handleBlur}
        placeholder="Enter lyrics here..."
        rows="10"
        className="lyrics-textarea"
      />
      <button onClick={handleGenerateClick} className="generate-button">
        Generate Voice
      </button>
    </div>
  );
};

LyricsPanel.propTypes = {
  activeTrack: PropTypes.object,
  onLyricsChange: PropTypes.func.isRequired,
  onGenerateVoice: PropTypes.func.isRequired,
};

export default LyricsPanel;
