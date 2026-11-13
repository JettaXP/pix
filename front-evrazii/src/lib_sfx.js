const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const SFX = {
  ctx: null, master: null, noiseBuf: null, last: {}, timer: null, step: 0, nextT: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return; this.ctx = new A();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
      const n = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, n, n); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      if (SETTINGS.music) this.music(true);
    } catch (e) { this.ctx = null; }
  },
  osc(type, f0, f1, dur, vol, delay) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + (delay || 0); o.type = type;
    o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.03);
  },
  noise(dur, vol, f0, f1, delay) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), t0 = c.currentTime + (delay || 0); s.buffer = this.noiseBuf; fl.type = 'lowpass';
    fl.frequency.setValueAtTime(f0, t0); fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t0); s.stop(t0 + dur + 0.03);
  },
  play(n) {
    if (!SETTINGS.sound) return; this.init(); if (!this.ctx) return;
    const now = performance.now(); if (now - (this.last[n] || 0) < (n === 'boom' ? 90 : 60)) return; this.last[n] = now;
    const d = this.defs[n]; if (d) d.call(this);
  },
  music(on) {
    SETTINGS.music = !!on; saveSettings(); clearInterval(this.timer); this.timer = null; if (!on) return;
    this.init(); if (!this.ctx) return; this.nextT = this.ctx.currentTime + 0.15; this.step = 0; this.timer = setInterval(() => this.sched(), 90);
  },
  sched() {
    const c = this.ctx; if (!c || !SETTINGS.sound) { this.nextT = c ? c.currentTime + 0.1 : 0; return; }
    const roots = [57, 53, 48, 55], third = [3, 4, 4, 4];
    while (this.nextT < c.currentTime + 0.35) {
      const st = this.step, bar = Math.floor(st / 8) % 4, r = roots[bar], dl = this.nextT - c.currentTime;
      if (st % 2 === 0) this.osc('triangle', mtof(r - 12), 0, 0.3, 0.07, dl);
      const arp = [0, third[bar], 7, 12, 7, third[bar], 12, 7][st % 8]; this.osc('square', mtof(r + 12 + arp), 0, 0.17, 0.022, dl);
      if (st % 4 === 2) this.noise(0.09, 0.05, 7000, 900, dl);
      this.nextT += 0.19; this.step++;
    }
  },
  defs: {
    click() { this.osc('square', 880, 520, 0.06, 0.07); },
    ping() { this.osc('square', 660, 0, 0.08, 0.06); this.osc('square', 990, 0, 0.12, 0.06, 0.08); },
    alert() { for (let i = 0; i < 3; i++) { this.osc('square', 520, 0, 0.09, 0.09, i * 0.16); this.osc('square', 390, 0, 0.09, 0.09, i * 0.16 + 0.08); } },
    war() { for (let i = 0; i < 4; i++) { this.osc('sawtooth', 300, 520, 0.22, 0.1, i * 0.24); } this.noise(0.5, 0.08, 1500, 200); },
    done() { [523, 659, 784].forEach((f, i) => this.osc('square', f, 0, 0.1, 0.07, i * 0.07)); },
    capture() { [392, 523, 659, 784, 1046].forEach((f, i) => this.osc('square', f, 0, 0.16, 0.08, i * 0.09)); this.noise(0.25, 0.05, 3000, 300); },
    lost() { [392, 330, 262, 196].forEach((f, i) => this.osc('sawtooth', f, 0, 0.2, 0.08, i * 0.12)); },
    drone() { this.osc('sawtooth', 220, 760, 0.7, 0.07); this.osc('square', 440, 1500, 0.7, 0.025); },
    missile() { this.noise(0.9, 0.16, 2600, 160); this.osc('sawtooth', 120, 520, 0.9, 0.06); },
    nukeLaunch() { this.noise(2.2, 0.2, 2200, 80); this.osc('sawtooth', 80, 360, 2.2, 0.08); },
    boom() { this.noise(0.5, 0.26, 2800, 120); this.osc('sine', 150, 38, 0.4, 0.28); },
    bigboom() { this.noise(0.95, 0.32, 3200, 90); this.osc('sine', 120, 30, 0.8, 0.34); },
    nuke() { this.noise(3.2, 0.42, 3500, 50); this.osc('sine', 90, 24, 2.6, 0.5); this.osc('sawtooth', 60, 30, 3, 0.1); },
    siren() { for (let i = 0; i < 6; i++) this.osc('sawtooth', i % 2 ? 380 : 620, 0, 0.45, 0.09, i * 0.45); },
    win() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.osc('square', f, 0, 0.2, 0.09, i * 0.14)); },
    lose() { [392, 349, 311, 262, 196].forEach((f, i) => this.osc('sawtooth', f, 0, 0.35, 0.09, i * 0.25)); }
  }
};
