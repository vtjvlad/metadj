const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.static(PUBLIC_DIR));

// Поддерживаемые аудиоформаты
const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.aiff', '.alac'];

// Эндпоинт для получения списка аудиофайлов
app.get('/tracks', (req, res) => {
  fs.readdir(PUBLIC_DIR, (err, files) => {
    if (err) return res.status(500).send('Ошибка чтения директории');
    const audioFiles = files.filter(file =>
      audioExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );
    res.json(audioFiles);
  });
});

app.listen(PORT, () => {
  console.log(`DJ App доступен по адресу: http://localhost:${PORT}`);
});
