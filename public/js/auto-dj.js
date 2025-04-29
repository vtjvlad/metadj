class AutoDJ {
    constructor() {
        console.log('AutoDJ: Инициализация приложения');
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AutoDJ: AudioContext создан');
        
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        console.log('AutoDJ: Анализатор настроен с FFT размером', this.analyser.fftSize);
        
        this.currentTrack = null;
        this.nextTrack = null;
        this.isPlaying = false;
        this.volume = 1;
        this.mixDuration = 10; // seconds
        this.audioElement = new Audio();
        this.audioElement.crossOrigin = "anonymous";
        
        // API URL - используем относительные пути
        this.apiBaseUrl = ''; // Пустая строка для относительных путей
        console.log('AutoDJ: Используем относительные пути для API');
        
        // Подключаем анализатор к аудио элементу
        this.source = this.audioContext.createMediaElementSource(this.audioElement);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        console.log('AutoDJ: Аудио цепочка настроена');
        
        this.initializeUI();
        this.initializeVisualizer();
        this.loadTracks();
    }

    initializeUI() {
        console.log('AutoDJ: Инициализация UI элементов');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.trackList = document.getElementById('trackList');
        this.waveform = document.getElementById('waveform');
        this.trackProgress = document.getElementById('trackProgress');
        this.currentTrackInfo = document.getElementById('currentTrackInfo');
        this.nextTrackInfo = document.getElementById('nextTrackInfo');
        this.energyMeter = document.getElementById('energyMeter');
        this.bpmDisplay = document.getElementById('bpmDisplay');
        this.keyDisplay = document.getElementById('keyDisplay');

        this.playPauseBtn.addEventListener('click', () => {
            console.log('AutoDJ: Кнопка Play/Pause нажата');
            this.togglePlayPause();
        });
        
        this.volumeSlider.addEventListener('input', (e) => {
            console.log('AutoDJ: Изменение громкости на', e.target.value);
            this.setVolume(e.target.value);
        });
    }

    async loadTracks() {
        console.log('AutoDJ: Загрузка треков с сервера');
        try {
            const response = await fetch('/api/tracks');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const tracks = await response.json();
            console.log('AutoDJ: Получен ответ от сервера:', tracks);
            
            if (!Array.isArray(tracks)) {
                throw new Error('Получены некорректные данные: ожидался массив треков');
            }
            console.log('AutoDJ: Получено треков:', tracks.length);
            
            if (tracks.length === 0) {
                this.trackList.innerHTML = '<div class="error-message">Нет доступных треков. Загрузите аудио файлы в папку public/audio/</div>';
                return;
            }
            
            this.displayTracks(tracks);
            
            if (tracks.length > 0) {
                this.currentTrack = tracks[0];
                console.log('AutoDJ: Установлен текущий трек:', this.currentTrack.metadata.title);
                this.updateTrackInfo();
                this.initializeVisualizer();
            }
        } catch (error) {
            console.error('AutoDJ: Ошибка при загрузке треков:', error);
            this.trackList.innerHTML = `<div class="error-message">Ошибка загрузки треков: ${error.message}</div>`;
        }
    }

    displayTracks(tracks) {
        console.log('AutoDJ: Отображение списка треков');
        this.trackList.innerHTML = '';
        tracks.forEach(track => {
            const trackElement = document.createElement('div');
            trackElement.className = 'track-item';
            trackElement.innerHTML = `
                <div class="track-info">
                    <h3>${track.metadata.title}</h3>
                    <p>${track.metadata.artist} - ${track.metadata.album}</p>
                    <div class="track-stats">
                        <span>BPM: ${Math.round(track.metadata.bpm)}</span>
                        <span>Key: ${track.metadata.key}</span>
                        <span>Energy: ${Math.round(track.metadata.energy * 100)}%</span>
                    </div>
                </div>
            `;
            trackElement.addEventListener('click', () => {
                console.log('AutoDJ: Выбран трек:', track.metadata.title);
                this.selectTrack(track);
            });
            this.trackList.appendChild(trackElement);
        });
    }

    async selectTrack(track) {
        console.log('AutoDJ: Переключение на трек:', track.metadata.title);
        this.currentTrack = track;
        this.updateTrackInfo();
        this.initializeVisualizer();
        if (this.isPlaying) {
            await this.playCurrentTrack();
        }
    }

    updateTrackInfo() {
        if (this.currentTrack) {
            console.log('AutoDJ: Обновление информации о треке:', this.currentTrack.metadata.title);
            this.currentTrackInfo.innerHTML = `
                <h2>${this.currentTrack.metadata.title}</h2>
                <p>${this.currentTrack.metadata.artist}</p>
                <p>BPM: ${Math.round(this.currentTrack.metadata.bpm)}</p>
                <p>Key: ${this.currentTrack.metadata.key}</p>
            `;
            this.energyMeter.style.width = `${this.currentTrack.metadata.energy * 100}%`;
            this.bpmDisplay.textContent = Math.round(this.currentTrack.metadata.bpm);
            this.keyDisplay.textContent = this.currentTrack.metadata.key;
        }
    }

    async togglePlayPause() {
        if (this.isPlaying) {
            console.log('AutoDJ: Пауза воспроизведения');
            await this.pause();
        } else {
            console.log('AutoDJ: Начало воспроизведения');
            await this.play();
        }
    }

    async play() {
        if (this.currentTrack) {
            try {
                console.log('AutoDJ: Воспроизведение трека:', this.currentTrack.metadata.title);
                console.log('AutoDJ: Путь к файлу:', this.currentTrack.path);

                // Проверяем состояние AudioContext
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }

                // Устанавливаем источник с относительным путем
                const audioPath = this.currentTrack.path.startsWith('/') ? 
                    this.currentTrack.path : 
                    '/' + this.currentTrack.path;
                    
                console.log('AutoDJ: Полный путь к файлу:', audioPath);
                this.audioElement.src = audioPath;
                
                // Устанавливаем громкость
                this.audioElement.volume = this.volume;

                // Начинаем воспроизведение
                try {
                    await this.audioElement.play();
                    console.log('AutoDJ: Воспроизведение началось');
                } catch (playError) {
                    console.error('AutoDJ: Ошибка воспроизведения:', playError);
                    throw playError;
                }

                this.isPlaying = true;
                document.getElementById('playPauseBtn').textContent = 'Pause';
                
                // Обновляем прогресс трека
                this.audioElement.addEventListener('timeupdate', () => {
                    const progress = (this.audioElement.currentTime / this.audioElement.duration) * 100;
                    document.getElementById('trackProgress').style.width = `${progress}%`;
                    
                    if (this.audioElement.duration - this.audioElement.currentTime <= this.mixDuration) {
                        console.log('AutoDJ: Начало подготовки к следующему треку');
                        this.prepareNextTrack();
                    }
                });
                
                // Когда трек закончился, воспроизводим следующий
                this.audioElement.addEventListener('ended', () => {
                    console.log('AutoDJ: Трек закончился, переход к следующему');
                    this.playNextTrack();
                });

                // Добавляем обработчик ошибок
                this.audioElement.addEventListener('error', (e) => {
                    console.error('AutoDJ: Ошибка аудио элемента:', e.target.error);
                });

            } catch (error) {
                console.error('AutoDJ: Ошибка при воспроизведении:', error);
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.textContent = `Ошибка воспроизведения: ${error.message}`;
                document.getElementById('currentTrackInfo').appendChild(errorMessage);
            }
        } else {
            console.warn('AutoDJ: Нет текущего трека для воспроизведения');
            // Показываем сообщение пользователю
            const message = document.createElement('div');
            message.className = 'info-message';
            message.textContent = 'Выберите трек для воспроизведения';
            document.getElementById('currentTrackInfo').appendChild(message);
        }
    }

    async pause() {
        console.log('AutoDJ: Приостановка воспроизведения');
        try {
            await this.audioElement.pause();
            if (this.audioContext.state === 'running') {
                await this.audioContext.suspend();
            }
            this.isPlaying = false;
            document.getElementById('playPauseBtn').textContent = 'Play';
        } catch (error) {
            console.error('AutoDJ: Ошибка при постановке на паузу:', error);
        }
    }

    setVolume(value) {
        console.log('AutoDJ: Установка громкости:', value);
        this.volume = value;
        if (this.audioElement) {
            this.audioElement.volume = value;
        }
    }

    initializeVisualizer() {
        console.log('AutoDJ: Инициализация визуализатора');
        const canvas = document.createElement('canvas');
        canvas.id = 'visualizer';
        canvas.width = 800;
        canvas.height = 200;
        document.getElementById('waveform').appendChild(canvas);
        
        const canvasCtx = canvas.getContext('2d');
        
        const draw = () => {
            requestAnimationFrame(draw);
            
            this.analyser.getByteFrequencyData(this.dataArray);
            
            canvasCtx.fillStyle = '#282828';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / this.bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for(let i = 0; i < this.bufferLength; i++) {
                barHeight = (this.dataArray[i] / 255) * canvas.height;
                
                canvasCtx.fillStyle = `rgb(${barHeight + 100}, 185, 84)`;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        };
        
        draw();
    }

    async playNextTrack() {
        console.log('AutoDJ: Поиск следующего трека');
        try {
            const response = await fetch('/api/tracks');
            const tracks = await response.json();
            
            if (tracks.length > 1) {
                const currentIndex = tracks.findIndex(t => t.path === this.currentTrack.path);
                const nextIndex = (currentIndex + 1) % tracks.length;
                this.currentTrack = tracks[nextIndex];
                console.log('AutoDJ: Следующий трек выбран:', this.currentTrack.metadata.title);
                this.updateTrackInfo();
                await this.play();
            }
        } catch (error) {
            console.error('AutoDJ: Ошибка при переходе к следующему треку:', error);
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('AutoDJ: Страница загружена, инициализация приложения');
    window.autoDJ = new AutoDJ();
}); 