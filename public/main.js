const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let tracks = [];
let currentSources = [];
let currentGains = [];
let analyser;
let dataArray;
let bufferLength;
let currentTrackIndex = 0;
let isPlaying = false;

const fileInput = document.getElementById('fileInput');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const crossfader = document.getElementById('crossfader');
const trackList = document.getElementById('trackList');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

fileInput.addEventListener('change', handleFiles);
playBtn.addEventListener('click', startDJ);
stopBtn.addEventListener('click', stopDJ);
crossfader.addEventListener('input', updateCrossfade);

async function handleFiles() {
  const files = Array.from(fileInput.files);
  tracks = [];

  for (let file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const bpm = await detectBPM(audioBuffer);

    tracks.push({
      file,
      name: file.name,
      audioBuffer,
      bpm
    });
  }
  
  renderPlaylist();
}

function renderPlaylist() {
  trackList.innerHTML = '';
  tracks.forEach((track, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${track.name} (${track.bpm} BPM)`;
    trackList.appendChild(li);
  });
}

async function startDJ() {
  if (isPlaying) return;
  isPlaying = true;
  currentTrackIndex = 0;
  playNextTrack();
}

function stopDJ() {
  isPlaying = false;
  currentSources.forEach(source => {
    if (source) source.stop();
  });
  currentSources = [];
  currentGains = [];
}

function playNextTrack() {
  if (currentTrackIndex >= tracks.length) {
    stopDJ();
    return;
  }

  const track = tracks[currentTrackIndex];
  const source = audioContext.createBufferSource();
  source.buffer = track.audioBuffer;
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 1;

  source.connect(gainNode).connect(audioContext.destination);

  // Ставим слушатель на окончание трека
  source.onended = () => {
    currentTrackIndex++;
    if (isPlaying) {
      fadeToNextTrack();
    }
  };

  currentSources = [source];
  currentGains = [gainNode];

  source.start(0);

  setupVisualizer();
}

function fadeToNextTrack() {
  if (currentTrackIndex >= tracks.length) {
    stopDJ();
    return;
  }

  const oldGain = currentGains[0];
  const oldSource = currentSources[0];

  const nextTrack = tracks[currentTrackIndex];
  const nextSource = audioContext.createBufferSource();
  nextSource.buffer = nextTrack.audioBuffer;
  const nextGain = audioContext.createGain();
  nextGain.gain.value = 0;

  // Питч-синхронизация для BPM
  const oldBPM = tracks[currentTrackIndex - 1]?.bpm || nextTrack.bpm;
  const newBPM = nextTrack.bpm;
  const ratio = newBPM / oldBPM;
  nextSource.playbackRate.value = 1 / ratio; 

  nextSource.connect(nextGain).connect(audioContext.destination);
  nextSource.start(0);

  currentSources.push(nextSource);
  currentGains.push(nextGain);

  // Плавный кроссфейд за 5 секунд
  const duration = 5;
  const now = audioContext.currentTime;
  oldGain.gain.linearRampToValueAtTime(0, now + duration);
  nextGain.gain.linearRampToValueAtTime(1, now + duration);

  // Завершаем старый трек после кроссфейда
  setTimeout(() => {
    if (oldSource) oldSource.stop();
    currentSources.shift();
    currentGains.shift();
    setupVisualizer();
  }, duration * 1000);
}

// Кроссфейдер ручной (если хочешь вручную мешать)
function updateCrossfade() {
  const x = parseFloat(crossfader.value);
  const gain1 = Math.cos(x * 0.5 * Math.PI);
  const gain2 = Math.cos((1.0 - x) * 0.5 * Math.PI);
  
  if (currentGains[0]) currentGains[0].gain.value = gain1;
  if (currentGains[1]) currentGains[1].gain.value = gain2;
}

// BPM Detection (очень упрощённый через пики амплитуды)
async function detectBPM(audioBuffer) {
  const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  analyser.connect(offlineCtx.destination);
  source.start(0);
  await offlineCtx.startRendering();

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  let peaks = 0;
  for (let i = 1; i < dataArray.length - 1; i++) {
    if (dataArray[i] > 200 && dataArray[i] > dataArray[i - 1] && dataArray[i] > dataArray[i + 1]) {
      peaks++;
    }
  }

  let durationInSeconds = audioBuffer.duration;
  const approximateBPM = Math.round((peaks / durationInSeconds) * 60);
  return Math.max(60, Math.min(180, approximateBPM)); // Ограничение
}

// Визуализатор
function setupVisualizer() {
  if (!currentGains[0]) return;
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  currentGains[0].connect(analyser);

  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  draw();
}

function draw() {
  requestAnimationFrame(draw);

  if (!analyser) return;

  analyser.getByteTimeDomainData(dataArray);

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00ff99';
  ctx.beginPath();

  const sliceWidth = canvas.width * 1.0 / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = v * canvas.height / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
}
