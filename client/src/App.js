import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [tracks, setTracks] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState({
    deck1: null,
    deck2: null
  });
  const [audioContext, setAudioContext] = useState(null);
  const [isPlaying, setIsPlaying] = useState({
    deck1: false,
    deck2: false
  });

  useEffect(() => {
    // Инициализация Web Audio API
    const context = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(context);

    // Загрузка списка треков
    fetch('/api/tracks')
      .then(response => response.json())
      .then(data => setTracks(data))
      .catch(error => console.error('Error loading tracks:', error));

    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  const handleTrackSelect = (track, deck) => {
    setSelectedTracks(prev => ({
      ...prev,
      [deck]: track
    }));
  };

  const handlePlayPause = (deck) => {
    setIsPlaying(prev => ({
      ...prev,
      [deck]: !prev[deck]
    }));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>MetaDJ</h1>
      </header>
      
      <main className="dj-interface">
        <div className="decks-container">
          {/* Deck 1 */}
          <div className="deck">
            <h2>Deck 1</h2>
            <div className="track-info">
              {selectedTracks.deck1 && <p>{selectedTracks.deck1}</p>}
            </div>
            <div className="controls">
              <button onClick={() => handlePlayPause('deck1')}>
                {isPlaying.deck1 ? 'Pause' : 'Play'}
              </button>
            </div>
          </div>

          {/* Mixer */}
          <div className="mixer">
            <input type="range" min="0" max="100" defaultValue="50" className="crossfader" />
          </div>

          {/* Deck 2 */}
          <div className="deck">
            <h2>Deck 2</h2>
            <div className="track-info">
              {selectedTracks.deck2 && <p>{selectedTracks.deck2}</p>}
            </div>
            <div className="controls">
              <button onClick={() => handlePlayPause('deck2')}>
                {isPlaying.deck2 ? 'Pause' : 'Play'}
              </button>
            </div>
          </div>
        </div>

        {/* Track Library */}
        <div className="track-library">
          <h2>Track Library</h2>
          <div className="track-list">
            {tracks.map((track, index) => (
              <div key={index} className="track-item">
                <p>{track}</p>
                <div className="track-actions">
                  <button onClick={() => handleTrackSelect(track, 'deck1')}>Load to Deck 1</button>
                  <button onClick={() => handleTrackSelect(track, 'deck2')}>Load to Deck 2</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App; 