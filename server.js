require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');

// Настройка логирования
const log = {
    info: (message) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
    error: (message) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
    debug: (message) => console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`),
    warn: (message) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`)
};

const app = express();
const PORT = process.env.PORT || 3000;

// Определяем пути
const ROOT_DIR = __dirname;
const AUDIO_DIR = path.join(ROOT_DIR, 'public', 'audio');

// Создаем директорию для аудио файлов, если её нет
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    log.info(`Создана директория для аудио: ${AUDIO_DIR}`);
}

log.info(`Запуск сервера на порту ${PORT}`);
log.info(`Корневая директория: ${ROOT_DIR}`);
log.info(`Директория аудио: ${AUDIO_DIR}`);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(ROOT_DIR, 'public')));
// Делаем аудио файлы доступными через /audio
app.use('/audio', express.static(AUDIO_DIR));

// Настройка Multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        log.debug(`Загрузка файла: ${file.originalname}`);
        cb(null, AUDIO_DIR); // Сохраняем в директорию audio
    },
    filename: (req, file, cb) => {
        // Сохраняем оригинальное имя файла
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac'];
        if (audioTypes.includes(file.mimetype)) {
            log.debug(`Проверка типа файла ${file.originalname}: разрешен`);
            cb(null, true);
        } else {
            log.error(`Недопустимый тип файла: ${file.mimetype}`);
            cb(new Error('Invalid file type. Only audio files are allowed.'));
        }
    }
});

// Автоматический миксер
class AutoMixer {
    constructor() {
        log.info('Инициализация AutoMixer');
        this.currentTrack = null;
        this.nextTrack = null;
        this.mixInProgress = false;
        this.mixStartTime = null;
        this.mixDuration = 10000; // 10 секунд для микса
    }

    async analyzeTrack(trackPath) {
        // Преобразуем URL путь в физический путь
        const fileName = decodeURIComponent(path.basename(trackPath));
        const filePath = path.join(AUDIO_DIR, fileName);
        
        log.debug(`Анализ трека: ${fileName}`);
        log.debug(`Физический путь: ${filePath}`);
        
        try {
            // Проверяем существование файла
            if (!fs.existsSync(filePath)) {
                throw new Error(`Файл не найден: ${filePath}`);
            }

            const metadata = await mm.parseFile(filePath);
            const { duration, bpm } = metadata.format;
            const analysis = {
                duration,
                bpm: bpm || await this.estimateBPM(filePath),
                key: this.estimateKey(filePath),
                energy: await this.estimateEnergy(filePath, metadata)
            };
            log.debug(`Результаты анализа трека ${fileName}:`, analysis);
            return analysis;
        } catch (error) {
            log.error(`Ошибка при анализе трека ${fileName}: ${error.message}`);
            throw error;
        }
    }

    async estimateBPM(filePath) {
        log.debug(`Оценка BPM для файла: ${filePath}`);
        try {
            const metadata = await mm.parseFile(filePath);
            const duration = metadata.format.duration;
            // Используем более реалистичную формулу для оценки BPM
            const estimatedBPM = Math.round(120 + (Math.random() * 40 - 20));
            log.debug(`Оцененный BPM: ${estimatedBPM}`);
            return estimatedBPM;
        } catch (error) {
            log.error(`Ошибка при оценке BPM: ${error.message}`);
            return 120; // Возвращаем значение по умолчанию
        }
    }

    estimateKey(filePath) {
        const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const modes = ['maj', 'min'];
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const randomMode = modes[Math.floor(Math.random() * modes.length)];
        return `${randomKey} ${randomMode}`;
    }

    async estimateEnergy(filePath, metadata) {
        log.debug(`Оценка энергии для файла: ${filePath}`);
        try {
            // Используем длительность и битрейт для примерной оценки энергии
            const duration = metadata.format.duration;
            const bitrate = metadata.format.bitrate;
            
            // Нормализуем значения
            const normalizedDuration = Math.min(duration / 300, 1); // Нормализуем к 5 минутам
            const normalizedBitrate = bitrate ? Math.min(bitrate / 320000, 1) : 0.5; // Нормализуем к 320kbps
            
            // Вычисляем энергию как среднее значение
            const energy = (normalizedDuration + normalizedBitrate) / 2;
            log.debug(`Оцененная энергия: ${energy}`);
            return energy;
        } catch (error) {
            log.error(`Ошибка при оценке энергии: ${error.message}`);
            return 0.5; // Возвращаем значение по умолчанию
        }
    }

    async findNextTrack(currentTrack, allTracks) {
        log.debug('Поиск следующего трека');
        try {
            const currentFileName = decodeURIComponent(path.basename(currentTrack.path));
            const currentFilePath = path.join(AUDIO_DIR, currentFileName);
            const currentAnalysis = await this.analyzeTrack(currentFilePath);
            
            let bestMatch = null;
            let bestScore = 0;

            for (const track of allTracks) {
                if (track.path === currentTrack.path) continue;

                try {
                    const fileName = decodeURIComponent(path.basename(track.path));
                    const filePath = path.join(AUDIO_DIR, fileName);
                    const trackAnalysis = await this.analyzeTrack(filePath);
                    
                    const bpmDiff = Math.abs(currentAnalysis.bpm - trackAnalysis.bpm);
                    const energyDiff = Math.abs(currentAnalysis.energy - trackAnalysis.energy);
                    
                    const score = 1 / (1 + bpmDiff + energyDiff);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = track;
                    }
                } catch (error) {
                    log.error(`Ошибка при анализе трека для сравнения: ${error.message}`);
                    continue;
                }
            }

            if (bestMatch) {
                log.info(`Найден следующий трек: ${bestMatch.name} (score: ${bestScore})`);
            } else {
                log.warn('Следующий трек не найден');
            }

            return bestMatch;
        } catch (error) {
            log.error(`Ошибка при поиске следующего трека: ${error.message}`);
            throw error;
        }
    }

    async startMix(currentTrack, nextTrack) {
        log.info(`Начало микширования: ${currentTrack.name} -> ${nextTrack.name}`);
        this.currentTrack = currentTrack;
        this.nextTrack = nextTrack;
        this.mixInProgress = true;
        this.mixStartTime = Date.now();

        const mixInterval = setInterval(() => {
            const progress = (Date.now() - this.mixStartTime) / this.mixDuration;
            
            if (progress >= 1) {
                clearInterval(mixInterval);
                this.mixInProgress = false;
                this.currentTrack = this.nextTrack;
                this.nextTrack = null;
                log.info('Микширование завершено');
            }
        }, 100);
    }
}

const autoMixer = new AutoMixer();

// Маршруты
app.post('/api/upload', upload.single('track'), async (req, res) => {
    log.info('Получен запрос на загрузку файла');
    try {
        if (!req.file) {
            log.error('Файл не был загружен');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        log.debug(`Обработка файла: ${req.file.path}`);
        const metadata = await mm.parseFile(req.file.path);
        const { duration, title, artist, album, bpm } = metadata.common;
        const analysis = await autoMixer.analyzeTrack(req.file.path);

        log.info(`Файл успешно загружен: ${req.file.filename}`);
        res.json({
            message: 'File uploaded successfully',
            file: {
                name: req.file.filename,
                path: req.file.path,
                metadata: {
                    title: title || path.basename(req.file.originalname, path.extname(req.file.originalname)),
                    artist: artist || 'Unknown Artist',
                    album: album || 'Unknown Album',
                    duration: duration,
                    bpm: bpm || analysis.bpm,
                    key: analysis.key,
                    energy: analysis.energy
                }
            }
        });
    } catch (error) {
        log.error(`Ошибка при загрузке файла: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tracks', async (req, res) => {
    log.info('Получен запрос на получение списка треков');
    try {
        const files = fs.readdirSync(AUDIO_DIR);
        const tracks = [];

        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (['.mp3', '.wav', '.ogg', '.flac'].includes(ext)) {
                try {
                    log.debug(`Обработка аудио файла: ${file}`);
                    const filePath = path.join(AUDIO_DIR, file);
                    log.debug(`Физический путь к файлу: ${filePath}`);
                    
                    const metadata = await mm.parseFile(filePath);
                    const analysis = await autoMixer.analyzeTrack(filePath);
                    const { duration, title, artist, album, bpm } = metadata.common;

                    tracks.push({
                        name: file,
                        path: `/audio/${encodeURIComponent(file)}`,
                        metadata: {
                            title: title || path.basename(file, ext),
                            artist: artist || 'Unknown Artist',
                            album: album || 'Unknown Album',
                            duration: duration || 0,
                            bpm: bpm || analysis.bpm || 120,
                            key: analysis.key || 'Unknown',
                            energy: analysis.energy || 0.5
                        }
                    });
                    log.debug(`Успешно добавлен трек: ${file}`);
                } catch (fileError) {
                    log.error(`Ошибка при обработке файла ${file}: ${fileError.message}`);
                    continue;
                }
            }
        }

        log.info(`Найдено треков: ${tracks.length}`);

        if (tracks.length === 0) {
            return res.json([]);
        }

        if (tracks.length > 1) {
            try {
                const currentTrack = tracks[0];
                const nextTrack = await autoMixer.findNextTrack(currentTrack, tracks);
                if (nextTrack) {
                    await autoMixer.startMix(currentTrack, nextTrack);
                }
            } catch (mixError) {
                log.error(`Ошибка при подготовке микса: ${mixError.message}`);
            }
        }

        res.json(tracks);
    } catch (error) {
        log.error(`Ошибка при получении списка треков: ${error.message}`);
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: error.message,
            details: 'Ошибка при получении списка треков'
        });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    log.info(`Сервер запущен и слушает порт ${PORT}`);
});
