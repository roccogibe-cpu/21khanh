const introVoice = document.querySelector('#introVoice');
const musicTrack = document.querySelector('#musicTrack');
const enterGate = document.querySelector('#enterGate');
const musicDock = document.querySelector('#musicDock');
const musicToggle = document.querySelector('#musicToggle');
const soundButton = document.querySelector('#soundButton');
const audioStatus = document.querySelector('#audioStatus');
const currentTimeLabel = document.querySelector('#currentTime');
const trackDurationLabel = document.querySelector('#trackDuration');
const trackProgress = document.querySelector('#trackProgress');
const toast = document.querySelector('#toast');
const glass = document.querySelector('#profileGlass');
let musicStarted = false;
let soundStarted = false;
let introFinished = false;
let muted = false;
let fadeStarted = false;
let fadeFrame = 0;

function formatTime(value) {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function fadeMusicIn() {
  if (fadeStarted || muted) return;
  fadeStarted = true;
  const targetVolume = .30;
  const startedAt = performance.now();
  const startVolume = musicTrack.volume;
  const duration = 4600;
  function step(now) {
    if (muted || musicTrack.paused) {
      fadeStarted = false;
      return;
    }
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    musicTrack.volume = startVolume + (targetVolume - startVolume) * eased;
    if (progress < 1) fadeFrame = requestAnimationFrame(step);
  }
  fadeFrame = requestAnimationFrame(step);
}

function revealMusic() {
  musicDock.classList.add('visible');
  audioStatus.textContent = 'NOW PLAYING';
  fadeMusicIn();
}

function beginSound() {
  if (soundStarted) return true;
  soundStarted = true;
  musicStarted = true;
  musicDock.classList.add('visible');
  audioStatus.textContent = 'INTRO VOICE';
  introVoice.currentTime = 0;
  introVoice.volume = 1;
  introVoice.muted = false;
  musicTrack.currentTime = 0;
  musicTrack.volume = .001;
  musicTrack.muted = false;

  // Both play calls happen inside the same entry tap, so the browser unlocks
  // the intro and the looping music on the very first visit.
  const voicePlayback = introVoice.play();
  const musicPlayback = musicTrack.play();

  voicePlayback.catch(() => {
    soundStarted = false;
    audioStatus.textContent = 'TAP FOR SOUND';
    musicToggle.classList.add('paused');
  });
  musicPlayback.catch(() => {
    musicStarted = false;
    audioStatus.textContent = 'TAP FOR SOUND';
    musicToggle.classList.add('paused');
  });
  return true;
}

introVoice.addEventListener('timeupdate', () => {
  if (!Number.isFinite(introVoice.duration)) return;
  const remaining = introVoice.duration - introVoice.currentTime;
  if (remaining <= .9) revealMusic();
});

introVoice.addEventListener('ended', () => {
  introFinished = true;
  revealMusic();
});

musicTrack.addEventListener('loadedmetadata', () => {
  trackDurationLabel.textContent = formatTime(musicTrack.duration);
});
musicTrack.addEventListener('timeupdate', () => {
  if (!musicStarted) return;
  currentTimeLabel.textContent = formatTime(musicTrack.currentTime);
  const progress = musicTrack.duration ? musicTrack.currentTime / musicTrack.duration : 0;
  trackProgress.style.transform = `scaleX(${progress})`;
});

function enterSite() {
  if (enterGate.classList.contains('leaving')) return;
  beginSound();
  enterGate.classList.add('leaving');
  document.body.classList.remove('entry-locked');
  window.setTimeout(() => enterGate.remove(), 1200);
}
enterGate.addEventListener('click', enterSite);

function unlockSound(event) {
  if (document.body.classList.contains('entry-locked')) return;
  if (event.target.closest?.('#soundButton, #musicToggle')) return;
  if (!soundStarted) beginSound();
}
window.addEventListener('pointerdown', unlockSound, { passive: true });
window.addEventListener('keydown', unlockSound);

function toggleSound() {
  if (!soundStarted) {
    beginSound();
    return;
  }
  muted = !muted;
  soundButton.classList.toggle('muted', muted);
  musicToggle.classList.toggle('paused', muted);
  musicDock.classList.toggle('paused', muted);
  introVoice.muted = muted;
  musicTrack.muted = muted;
  if (muted) {
    introVoice.pause();
    musicTrack.pause();
  } else {
    if (!introFinished) introVoice.play();
    musicTrack.play();
    if (introFinished) {
      musicTrack.volume = .30;
      audioStatus.textContent = 'NOW PLAYING';
    } else if (!fadeStarted) {
      audioStatus.textContent = 'INTRO VOICE';
    }
  }
}
soundButton.addEventListener('click', toggleSound);
musicToggle.addEventListener('click', toggleSound);

async function copyDiscord() {
  try {
    await navigator.clipboard.writeText('kkhanhsky');
  } catch {
    const field = document.createElement('textarea');
    field.value = 'kkhanhsky';
    document.body.appendChild(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2200);
}
document.querySelector('#copyDiscord').addEventListener('click', copyDiscord);
document.querySelector('#copyTop').addEventListener('click', copyDiscord);

glass.addEventListener('pointermove', (event) => {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const rect = glass.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - .5;
  const y = (event.clientY - rect.top) / rect.height - .5;
  glass.style.transform = `perspective(1200px) rotateX(${-y * 4}deg) rotateY(${x * 5}deg)`;
});
glass.addEventListener('pointerleave', () => { glass.style.transform = ''; });

const canvas = document.querySelector('#waterCanvas');
const ctx = canvas.getContext('2d');
let width = 0;
let height = 0;
let bubbles = [];
let ripples = [];

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  bubbles = Array.from({ length: Math.min(55, Math.round(width / 24)) }, makeBubble);
}

function makeBubble() {
  const r = 2 + Math.random() * 10;
  return { x: Math.random() * width, y: Math.random() * height, r, speed: .15 + Math.random() * .55, sway: Math.random() * 6.28 };
}

function animateWater(time) {
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#eaffff');
  gradient.addColorStop(.48, '#9ce9fb');
  gradient.addColorStop(1, '#26aed4');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1;
  for (let y = 20; y < height; y += 48) {
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 18) {
      const wave = Math.sin(x * .018 + time * .00035 + y * .01) * 5;
      if (x === -20) ctx.moveTo(x, y + wave); else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  bubbles.forEach((bubble) => {
    bubble.y -= bubble.speed;
    bubble.x += Math.sin(time * .001 + bubble.sway) * .12;
    if (bubble.y < -bubble.r * 2) Object.assign(bubble, makeBubble(), { y: height + bubble.r });
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.42)';
    ctx.stroke();
  });

  ripples = ripples.filter((ripple) => ripple.alpha > .01);
  ripples.forEach((ripple) => {
    ripple.radius += 1.25;
    ripple.alpha *= .975;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${ripple.alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  requestAnimationFrame(animateWater);
}

window.addEventListener('pointermove', (event) => {
  if (Math.random() > .72) ripples.push({ x: event.clientX, y: event.clientY, radius: 4, alpha: .22 });
});
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
requestAnimationFrame(animateWater);
