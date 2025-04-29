class AudioEngine {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.tracks = new Map();
        this.activeSources = new Map();
        this.effects = new Map();
    }

    async loadTrack(file) {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.tracks.set(file.name, audioBuffer);
        return audioBuffer;
    }

    createSource(trackName, deckId) {
        if (!this.tracks.has(trackName)) return null;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const analyser = this.audioContext.createAnalyser();
        
        // Создаем эквалайзер
        const lowFilter = this.audioContext.createBiquadFilter();
        const midFilter = this.audioContext.createBiquadFilter();
        const highFilter = this.audioContext.createBiquadFilter();
        
        lowFilter.type = 'lowshelf';
        midFilter.type = 'peaking';
        highFilter.type = 'highshelf';
        
        // Подключаем цепочку эффектов
        source.buffer = this.tracks.get(trackName);
        source.connect(lowFilter);
        lowFilter.connect(midFilter);
        midFilter.connect(highFilter);
        highFilter.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(this.audioContext.destination);

        // Сохраняем узлы для управления
        this.effects.set(deckId, {
            source,
            gainNode,
            analyser,
            filters: {
                low: lowFilter,
                mid: midFilter,
                high: highFilter
            }
        });

        return {
            source,
            gainNode,
            analyser,
            filters: {
                low: lowFilter,
                mid: midFilter,
                high: highFilter
            }
        };
    }

    play(deckId) {
        const effects = this.effects.get(deckId);
        if (effects && !effects.source.started) {
            effects.source.start();
            effects.source.started = true;
        }
    }

    stop(deckId) {
        const effects = this.effects.get(deckId);
        if (effects) {
            effects.source.stop();
            this.effects.delete(deckId);
        }
    }

    setVolume(deckId, volume) {
        const effects = this.effects.get(deckId);
        if (effects) {
            effects.gainNode.gain.value = volume;
        }
    }

    setEQ(deckId, band, value) {
        const effects = this.effects.get(deckId);
        if (effects) {
            const filter = effects.filters[band];
            if (filter) {
                filter.gain.value = value;
            }
        }
    }

    setTempo(deckId, tempo) {
        const effects = this.effects.get(deckId);
        if (effects) {
            effects.source.playbackRate.value = tempo;
        }
    }

    getWaveformData(deckId) {
        const effects = this.effects.get(deckId);
        if (effects) {
            const analyser = effects.analyser;
            analyser.fftSize = 2048;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);
            return dataArray;
        }
        return null;
    }
}

// Экспортируем экземпляр AudioEngine
const audioEngine = new AudioEngine(); 