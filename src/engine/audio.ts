// Procedural Web Audio: a grid hum whose pitch tracks the wall's satisfaction (ROADMAP M9 in
// miniature: the brownout is audible) and a handful of synthesized one-shots. Unlocked by the
// first click; silent until then.

type Wave = OscillatorType;

export class Audio {
  ctx: AudioContext | null = null;
  master!: GainNode;
  private hum: { o: OscillatorNode; o2: OscillatorNode; g: GainNode; f: BiquadFilterNode } | null = null;
  private noise!: AudioBuffer;
  private last = new Map<string, number>();
  muted = false;
  volume = 0.5;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx: AudioContext = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(ctx.destination);
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth';
      o2.type = 'sine';
      o.frequency.value = 50;
      o2.frequency.value = 100;
      f.type = 'lowpass';
      f.frequency.value = 220;
      g.gain.value = 0;
      o.connect(f);
      o2.connect(f);
      f.connect(g);
      g.connect(this.master);
      o.start();
      o2.start();
      this.hum = { o, o2, g, f };
    } catch {
      this.ctx = null;
    }
  }

  /** a hidden tab: the sim stops, so the hum stops with it */
  setHidden(hidden: boolean) {
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && !this.muted) this.master.gain.value = v;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }

  /** the grid hum: louder with load, lower and rougher as the wall starves */
  setHum(load: number, sat: number) {
    if (!this.ctx || !this.hum) return;
    const t = this.ctx.currentTime;
    const base = 38 + 22 * Math.min(1, sat);
    this.hum.o.frequency.setTargetAtTime(base, t, 0.15);
    this.hum.o2.frequency.setTargetAtTime(base * 2.01, t, 0.15);
    this.hum.f.frequency.setTargetAtTime(140 + 260 * Math.min(1, sat), t, 0.2);
    this.hum.g.gain.setTargetAtTime(0.012 + 0.05 * Math.min(1, load), t, 0.3);
  }

  private tone(freq: number, dur: number, type: Wave, vol: number, slide = 0, delay = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private hiss(dur: number, vol: number, freq: number, q = 1, delay = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noise;
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  sfx(id: string) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const gap = id === 'kill' ? 0.04 : 0.06;
    if ((this.last.get(id) ?? -1) > now - gap) return;
    this.last.set(id, now);
    switch (id) {
      case 'click': this.tone(880, 0.04, 'square', 0.04); break;
      case 'place': this.tone(220, 0.08, 'square', 0.07, 0.5); this.hiss(0.05, 0.05, 2000); break;
      case 'sell': this.tone(440, 0.1, 'triangle', 0.06, 0.5); break;
      case 'error': this.tone(120, 0.12, 'square', 0.06); break;
      case 'kill': this.tone(660 + Math.random() * 120, 0.07, 'triangle', 0.05, 1.6); break;
      case 'leak': this.tone(90, 0.35, 'sawtooth', 0.12, 0.5); this.hiss(0.3, 0.08, 300); break;
      case 'wave': this.tone(110, 0.6, 'sawtooth', 0.06, 1.0); this.tone(165, 0.6, 'sawtooth', 0.04, 1.0, 0.1); break;
      case 'brownout': this.tone(300, 0.7, 'sawtooth', 0.07, 0.25); break;
      case 'recovered': this.tone(200, 0.3, 'triangle', 0.05, 2); break;
      case 'knock': this.hiss(0.25, 0.12, 3000, 3); this.tone(1400, 0.05, 'square', 0.04, 0.3); break;
      case 'overcharge': this.tone(180, 0.5, 'sawtooth', 0.1, 6); this.hiss(0.5, 0.08, 5000, 2); break;
      case 'research': [523, 659, 784].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.05, 1, i * 0.09)); break;
      case 'dry': this.tone(140, 0.4, 'triangle', 0.06, 0.6); break;
      case 'upgrade': [330, 440, 660].forEach((f, i) => this.tone(f, 0.12, 'square', 0.05, 1.2, i * 0.05)); break;
      case 'wavepay': [523, 784].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, 1, i * 0.08)); this.hiss(0.08, 0.04, 6000, 2, 0.1); break;
      case 'newenemy': this.tone(98, 0.5, 'sawtooth', 0.06, 0.8); this.tone(147, 0.5, 'sawtooth', 0.04, 0.8, 0.12); break;
      case 'snuff': this.hiss(0.5, 0.1, 500, 1); this.tone(180, 0.4, 'triangle', 0.05, 0.4); break;
      case 'shoot': this.tone(90, 0.15, 'square', 0.07, 0.6); this.hiss(0.12, 0.06, 1200, 1); break;
      case 'burst': this.hiss(0.35, 0.12, 2400, 0.8); this.tone(600, 0.2, 'triangle', 0.05, 2); break;
      case 'pulse': this.tone(90, 0.9, 'sawtooth', 0.12, 8); this.hiss(0.8, 0.14, 3200, 0.5); this.tone(880, 0.5, 'triangle', 0.06, 0.5, 0.05); break;
      case 'win': [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.07, 1, i * 0.15)); break;
      case 'lose': [220, 185, 147, 110].forEach((f, i) => this.tone(f, 0.6, 'sawtooth', 0.06, 1, i * 0.2)); break;
    }
  }
}
