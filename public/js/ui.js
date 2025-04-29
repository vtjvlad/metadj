class UI {
    constructor() {
        this.decks = {
            deck1: {
                playBtn: document.getElementById('deck1-play'),
                cueBtn: document.getElementById('deck1-cue'),
                tempoSlider: document.getElementById('deck1-tempo'),
                bpmDisplay: document.getElementById('deck1-bpm'),
                trackDisplay: document.getElementById('deck1-track'),
                waveform: document.getElementById('deck1-waveform')
            },
            deck2: {
                playBtn: document.getElementById('deck2-play'),
                cueBtn: document.getElementById('deck2-cue'),
                tempoSlider: document.getElementById('deck2-tempo'),
                bpmDisplay: document.getElementById('deck2-bpm'),
                trackDisplay: document.getElementById('deck2-track'),
                waveform: document.getElementById('deck2-waveform')
            }
        };

        this.mixer = {
            crossfader: document.getElementById('crossfader'),
            lowEQ: document.getElementById('low-eq'),
            midEQ: document.getElementById('mid-eq'),
            highEQ: document.getElementById('high-eq')
        };

        this.trackList = document.getElementById('track-list');
        this.fileUpload = document.getElementById('file-upload');
        this.uploadBtn = document.getElementById('upload-btn');

        this.initEventListeners();
        this.initWaveformCanvas();
    }

    initEventListeners() {
        // Deck 1 controls
        this.decks.deck1.playBtn.addEventListener('click', () => this.handlePlayPause('deck1'));
        this.decks.deck1.cueBtn.addEventListener('click', () => this.handleCue('deck1'));
        this.decks.deck1.tempoSlider.addEventListener('input', (e) => this.handleTempoChange('deck1', e.target.value));

        // Deck 2 controls
        this.decks.deck2.playBtn.addEventListener('click', () => this.handlePlayPause('deck2'));
        this.decks.deck2.cueBtn.addEventListener('click', () => this.handleCue('deck2'));
        this.decks.deck2.tempoSlider.addEventListener('input', (e) => this.handleTempoChange('deck2', e.target.value));

        // Mixer controls
        this.mixer.crossfader.addEventListener('input', (e) => this.handleCrossfaderChange(e.target.value));
        this.mixer.lowEQ.addEventListener('input', (e) => this.handleEQChange('low', e.target.value));
        this.mixer.midEQ.addEventListener('input', (e) => this.handleEQChange('mid', e.target.value));
        this.mixer.highEQ.addEventListener('input', (e) => this.handleEQChange('high', e.target.value));

        // File upload
        this.uploadBtn.addEventListener('click', () => this.fileUpload.click());
        this.fileUpload.addEventListener('change', (e) => this.handleFileUpload(e.target.files));
    }

    initWaveformCanvas() {
        Object.keys(this.decks).forEach(deckId => {
            const canvas = document.createElement('canvas');
            canvas.width = this.decks[deckId].waveform.offsetWidth;
            canvas.height = this.decks[deckId].waveform.offsetHeight;
            this.decks[deckId].waveform.appendChild(canvas);
            this.decks[deckId].canvas = canvas;
            this.decks[deckId].ctx = canvas.getContext('2d');
        });
    }

    handlePlayPause(deckId) {
        const deck = this.decks[deckId];
        if (deck.isPlaying) {
            audioEngine.stop(deckId);
            deck.playBtn.textContent = 'Play';
        } else {
            audioEngine.play(deckId);
            deck.playBtn.textContent = 'Pause';
        }
        deck.isPlaying = !deck.isPlaying;
    }

    handleCue(deckId) {
        // Реализация функции cue point
        console.log(`Cue point set for ${deckId}`);
    }

    handleTempoChange(deckId, tempo) {
        audioEngine.setTempo(deckId, parseFloat(tempo));
        this.decks[deckId].bpmDisplay.textContent = Math.round(parseFloat(tempo) * 128); // Примерное значение BPM
    }

    handleCrossfaderChange(value) {
        const position = value / 100;
        audioEngine.setVolume('deck1', 1 - position);
        audioEngine.setVolume('deck2', position);
    }

    handleEQChange(band, value) {
        audioEngine.setEQ('deck1', band, parseFloat(value));
        audioEngine.setEQ('deck2', band, parseFloat(value));
    }

    async handleFileUpload(files) {
        for (const file of files) {
            await audioEngine.loadTrack(file);
            this.addTrackToLibrary(file.name);
        }
    }

    addTrackToLibrary(trackName) {
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';
        trackItem.textContent = trackName;
        trackItem.addEventListener('click', () => this.loadTrackToDeck(trackName));
        this.trackList.appendChild(trackItem);
    }

    loadTrackToDeck(trackName) {
        // Здесь будет логика загрузки трека в выбранную деку
        console.log(`Loading ${trackName} to deck`);
    }

    updateWaveform(deckId) {
        const deck = this.decks[deckId];
        const data = audioEngine.getWaveformData(deckId);
        if (!data) return;

        const ctx = deck.ctx;
        const width = deck.canvas.width;
        const height = deck.canvas.height;

        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(0, 0, width, height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();

        const sliceWidth = width / data.length;
        let x = 0;

        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            const y = v * height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
    }

    animate() {
        Object.keys(this.decks).forEach(deckId => {
            this.updateWaveform(deckId);
        });
        requestAnimationFrame(() => this.animate());
    }
}

// Создаем и экспортируем экземпляр UI
const ui = new UI();
ui.animate(); 