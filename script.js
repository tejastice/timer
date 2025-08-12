// 共通: 時刻表示フォーマッタ
const fmt = {
  sw(ms) {
    const total = Math.max(0, Math.floor(ms));
    const m = Math.floor(total / 60000);
    const s = Math.floor((total % 60000) / 1000);
    const cs = Math.floor((total % 1000) / 10); // centiseconds
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  },
  cd(ms) {
    const total = Math.max(0, Math.ceil(ms));
    const m = Math.floor(total / 60000);
    const s = Math.floor((total % 60000) / 1000);
    const d = Math.floor((total % 1000) / 100); // tenths
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${d}`;
  }
};

// タブ切替
const tabs = document.querySelectorAll('.tab');
const panelSW = document.getElementById('panel-sw');
const panelCD = document.getElementById('panel-cd');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const which = tab.dataset.tab;
    panelSW.classList.toggle('hidden', which !== 'sw');
    panelCD.classList.toggle('hidden', which !== 'cd');
  });
});

// ストップウォッチ
const swTimeEl = document.getElementById('sw-time');
const swStart = document.getElementById('sw-start');
const swPause = document.getElementById('sw-pause');
const swReset = document.getElementById('sw-reset');
const swLap = document.getElementById('sw-lap');
const swLaps = document.getElementById('sw-laps');

let swRAF = null;
let swRunning = false;
let swStartAt = 0;
let swElapsed = 0;
let lastLapAt = 0;
let lapNo = 0;

function swUpdate() {
  const now = performance.now();
  const elapsedNow = now - swStartAt + swElapsed;
  swTimeEl.textContent = fmt.sw(elapsedNow);
  swRAF = requestAnimationFrame(swUpdate);
}
function swSetButtons(running, hasTime) {
  swStart.disabled = running;
  swPause.disabled = !running;
  swReset.disabled = !hasTime;
  swLap.disabled = !running;
}
function swStartFn() {
  if (swRunning) return;
  swRunning = true;
  swStartAt = performance.now();
  if (swElapsed === 0) lastLapAt = 0;
  swSetButtons(true, swElapsed > 0);
  swRAF = requestAnimationFrame(swUpdate);
}
function swPauseFn() {
  if (!swRunning) return;
  swRunning = false;
  cancelAnimationFrame(swRAF);
  swElapsed += performance.now() - swStartAt;
  swSetButtons(false, swElapsed > 0);
}
function swResetFn() {
  swRunning = false;
  cancelAnimationFrame(swRAF);
  swElapsed = 0;
  lastLapAt = 0;
  lapNo = 0;
  swTimeEl.textContent = fmt.sw(0);
  swLaps.innerHTML = '';
  swSetButtons(false, false);
}
function swLapFn() {
  const nowElapsed = swRunning ? (performance.now() - swStartAt + swElapsed) : swElapsed;
  const lapTime = nowElapsed - lastLapAt;
  lastLapAt = nowElapsed;
  lapNo += 1;
  const div = document.createElement('div');
  div.className = 'lap';
  div.innerHTML = `<small>Lap ${lapNo}</small><div>${fmt.sw(nowElapsed)} <small>(+${fmt.sw(lapTime)})</small></div>`;
  swLaps.prepend(div);
}
swStart.addEventListener('click', swStartFn);
swPause.addEventListener('click', swPauseFn);
swReset.addEventListener('click', swResetFn);
swLap.addEventListener('click', swLapFn);
swSetButtons(false, false);

// カウントダウン
const cdTimeEl = document.getElementById('cd-time');
const cdStart = document.getElementById('cd-start');
const cdPause = document.getElementById('cd-pause');
const cdReset = document.getElementById('cd-reset');
const cdMin = document.getElementById('cd-min');
const cdSec = document.getElementById('cd-sec');
const cdPreset5 = document.getElementById('cd-preset-5');

let cdRAF = null;
let cdRunning = false;
let cdEndAt = 0;
let cdRemain = 0;
let cdInitial = 30_000;

function cdDisplay(ms) {
  cdTimeEl.textContent = fmt.cd(ms);
  document.title = `${fmt.cd(ms)} - タイマー`;
}
function cdSetButtons(running, hasSet) {
  cdStart.disabled = running || !hasSet;
  cdPause.disabled = !running;
  cdReset.disabled = !hasSet;
  cdMin.disabled = running;
  cdSec.disabled = running;
}
function readCDInput() {
  const m = Math.max(0, Math.min(999, Number(cdMin.value) || 0));
  const s = Math.max(0, Math.min(59, Number(cdSec.value) || 0));
  return m * 60000 + s * 1000;
}
function cdUpdate() {
  const now = performance.now();
  const remain = Math.max(0, cdEndAt - now);
  cdDisplay(remain);
  if (remain <= 0) {
    cdFinish();
    return;
  }
  cdRAF = requestAnimationFrame(cdUpdate);
}
function cdStartFn() {
  if (cdRunning) return;
  if (cdRemain === 0) cdInitial = readCDInput();
  if (cdInitial <= 0) {
    cdDisplay(0);
    return;
  }
  cdRunning = true;
  const base = cdRemain > 0 ? cdRemain : cdInitial;
  cdEndAt = performance.now() + base;
  cdSetButtons(true, true);
  cdRAF = requestAnimationFrame(cdUpdate);
}
function cdPauseFn() {
  if (!cdRunning) return;
  cdRunning = false;
  cancelAnimationFrame(cdRAF);
  cdRemain = Math.max(0, cdEndAt - performance.now());
  cdSetButtons(false, (cdRemain > 0 || cdInitial > 0));
}
function cdResetFn() {
  cdRunning = false;
  cancelAnimationFrame(cdRAF);
  cdRemain = 0;
  cdInitial = readCDInput();
  cdDisplay(cdInitial);
  cdSetButtons(false, cdInitial > 0);
}
function cdFinish() {
  cdRunning = false;
  cancelAnimationFrame(cdRAF);
  cdRemain = 0;
  cdDisplay(0);
  cdSetButtons(false, true);
  beep();
  flashTitle();
}
cdMin.addEventListener('input', () => cdResetFn());
cdSec.addEventListener('input', () => cdResetFn());
cdPreset5.addEventListener('click', () => {
  cdMin.value = 5;
  cdSec.value = 0;
  cdResetFn();
});
cdStart.addEventListener('click', cdStartFn);
cdPause.addEventListener('click', cdPauseFn);
cdReset.addEventListener('click', cdResetFn);
// 初期表示
cdDisplay(cdInitial);
cdSetButtons(false, true);

// 簡易ビープ音
function beep() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, ac.currentTime);
    g.gain.setValueAtTime(0.001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.5, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.35);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.4);
  } catch {}
}
function flashTitle() {
  const orig = document.title;
  let n = 0;
  const id = setInterval(() => {
    document.title = (n % 2 === 0) ? '⏰ タイムアップ!' : orig;
    n++;
    if (n > 6) { clearInterval(id); document.title = orig; }
  }, 400);
}

// キーボード操作
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (!panelSW.classList.contains('hidden')) (swRunning ? swPauseFn : swStartFn)();
    else (cdRunning ? cdPauseFn : cdStartFn)();
  } else if (e.key.toLowerCase() === 'r') {
    if (!panelSW.classList.contains('hidden')) swResetFn();
    else cdResetFn();
  } else if (e.key.toLowerCase() === 'l' && !panelSW.classList.contains('hidden')) {
    if (swRunning) swLapFn();
  }
});
