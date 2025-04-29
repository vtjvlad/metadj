const { execSync } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// Укажи путь к своему треку
const inputTrack = 'track.mp3'; // или .wav и т.п.

function getBPM(filePath) {
  try {
    const output = execSync(`aubio tempo "${filePath}"`).toString();
    const lines = output.trim().split('\n');
    if (lines.length >= 2) {
      const bpm = 60 / (parseFloat(lines[1]) - parseFloat(lines[0]));
      return Math.round(bpm);
    } else {
      console.warn('Не удалось определить BPM точно. Используется по умолчанию.');
      return 120;
    }
  } catch (e) {
    console.error('Ошибка определения BPM:', e.message);
    return 120; // fallback
  }
}

function addEffect(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters('aecho=0.8:0.88:60:0.4') // Пример простого эффекта
      .on('end', () => {
        console.log('Эффект применён.');
        resolve();
      })
      .on('error', (err) => {
        console.error('Ошибка ffmpeg:', err.message);
        reject(err);
      })
      .save(outputPath);
  });
}

(async () => {
  if (!fs.existsSync(inputTrack)) {
    console.error(`Файл "${inputTrack}" не найден.`);
    process.exit(1);
  }

  const bpm = getBPM(inputTrack);
  console.log(`Определённый BPM: ${bpm}`);

  const outputTrack = path.basename(inputTrack, path.extname(inputTrack)) + '_remix.mp3';
  await addEffect(inputTrack, outputTrack);

  console.log('Готово! Файл:', outputTrack);
})();
