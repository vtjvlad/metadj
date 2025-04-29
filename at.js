const mm = require('music-metadata');
const fs = require('fs');
const path = require('path');

const AUDIO_DIR = path.join(__dirname, 'public');

async function analyzeTrack(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    const { duration, title, artist, album, bpm, key } = metadata.common;
    const format = metadata.format;

    return {
      file: path.basename(filePath),
      title: title || path.basename(filePath),
      artist: artist || 'Unknown Artist',
      album: album || 'Unknown Album',
      duration: format.duration,
      sampleRate: format.sampleRate,
      bitrate: format.bitrate,
      bpm: bpm || null,
      key: key || null
    };
  } catch (err) {
    console.error(`Ошибка при анализе ${filePath}:`, err.message);
    return null;
  }
}

async function analyzeAllTracks() {
  const files = fs.readdirSync(AUDIO_DIR);
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.aiff', '.alac'];
  const audioFiles = files.filter(file =>
    audioExtensions.some(ext => file.toLowerCase().endsWith(ext))
  );

  const analyses = [];
  for (const file of audioFiles) {
    const result = await analyzeTrack(path.join(AUDIO_DIR, file));
    if (result) analyses.push(result);
  }

  fs.writeFileSync('track-analysis.json', JSON.stringify(analyses, null, 2));
  console.log('Готово! Результат записан в track-analysis.json');
}

analyzeAllTracks();
