const trackListEl = document.getElementById('trackList');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let tracks = [];
let currentSources = [];

async function fetchTracks() {
  const res = await fetch('/tracks');
  const files = await res.json();
  files.forEach(file => addTrack(file));
}

function addTrack(filename) {
  const li = document.createElement('li');
  li.textContent = filename;
  li.addEventListener('click', () => playTrack(filename));
  trackListEl.appendChild(li);
}

function stopAllTracks() {
  currentSources.forEach(source => source.stop());
  currentSources = [];
}

async function playTrack(filename) {
  stopAllTracks();
  const response = await fetch(filename);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 1;

  source.connect(gainNode).connect(audioCtx.destination);
  source.start();
  currentSources.push(source);
  visualize(gainNode);
}

function visualize(sourceNode) {
  const analyser = audioCtx.createAnalyser();
  sourceNode.connect(analyser);
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i];
      ctx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
      ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
      x += barWidth + 1;
    }
  }

  draw();
}

fetchTracks();
