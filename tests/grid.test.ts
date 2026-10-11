// The grid arithmetic of DESIGN.md §2 and the unit numbers of §3, §4, §6, §8.
import { describe, expect, it } from 'vitest';
import { Game, park, put, factory, settle } from './helpers';
import { overcharge, pulse, pulseProblem, toggleOff, setTier, toggleTier, upgrade } from '../src/sim/actions';
import { startNextWave, wavePay } from '../src/sim/systems/waves';
import { ENEMIES } from '../src/data/enemies';

const BEND_B_DIST = 35; // (26.5, 14): 1.5 tiles from the bend-B Lamp's centre
const BEND_A_DIST = 28.5; // (26.5, 7.5): 1.5 tiles from the bend-A Lamp's centre

describe('grid (§2)', () => {
  it('wave 1 layout A: 28 kW supply, 26 kW asked, satisfaction 1, 2 kW wasted (§6)', () => {
    const g = new Game();
    factory(g);
    put(g, 'node', 23, 10);
    put(g, 'lamp', 24, 7);
    put(g, 'lamp', 24, 13);
    park(g, 'moth', BEND_A_DIST);
    park(g, 'moth', BEND_B_DIST);
    settle(g, 0.2);
    expect(g.grid.gen).toBe(28);
    expect(g.grid.demand).toBe(26);
    expect(g.grid.tiers[1].sat).toBe(1);
    expect(g.grid.wasted).toBeCloseTo(2);
  });

  it('the tempting mistake: 4 Lamps on the Hearth alone get 8/48 = 0.17 (§6)', () => {
    const g = new Game();
    put(g, 'node', 23, 10);
    const lamps = [put(g, 'lamp', 24, 7), put(g, 'lamp', 24, 13), put(g, 'lamp', 22, 7), put(g, 'lamp', 22, 16)];
    park(g, 'moth', BEND_A_DIST);
    park(g, 'moth', BEND_B_DIST);
    park(g, 'moth', 22); // leg 1 at x = 21: in range of the (22, 7) Lamp
    park(g, 'moth', 40); // leg 3 at x = 23: in range of the (22, 16) Lamp
    settle(g, 0.2);
    for (const l of lamps) expect(l.target).toBeGreaterThan(0);
    expect(g.grid.demand).toBe(48);
    expect(g.grid.wall.sat).toBeCloseTo(8 / 48);
    for (const l of lamps) expect(l.dps).toBeCloseTo(12 * 0.5 * (8 / 48));
  });

  it('tiers: tier 1 (Works) is served fully before tier 2 (Wall) sees anything', () => {
    const g = new Game();
    const lamp = put(g, 'lamp', 24, 13);
    const ex = put(g, 'extractor', 16, 19);
    park(g, 'moth', BEND_B_DIST);
    settle(g, 0.1);
    // 8 kW: the Extractor (tier 1, 2 kW) is fed first; the firing Lamp (tier 2, 12 kW) gets 6
    expect(ex.sat).toBe(1);
    expect(lamp.sat).toBeCloseTo(6 / 12);
    // move the Lamp up to tier 1: both share 8 / 14
    setTier(g, lamp, 1);
    settle(g, 0.1);
    expect(ex.sat).toBeCloseTo(8 / 14);
    expect(lamp.sat).toBeCloseTo(8 / 14);
    // shed the Extractor: the Lamp gets everything there is
    toggleOff(g, ex);
    settle(g, 0.1);
    expect(lamp.sat).toBeCloseTo(8 / 12);
    expect(ex.sat).toBe(0);
    // shedding a whole tier from the HUD
    toggleTier(g, 1);
    settle(g, 0.1);
    expect(lamp.sat).toBe(0);
  });

  it('Jar: charges at most 15 kW from surplus, fills 600 kJ in 40 s (§3, §6)', () => {
    const g = new Game();
    factory(g);
    const jar = put(g, 'jar', 22, 18);
    settle(g, 1);
    expect(jar.flow).toBeCloseTo(15);
    settle(g, 39.5);
    expect(jar.charge).toBeGreaterThan(590);
    settle(g, 1);
    expect(jar.charge).toBeCloseTo(600);
  });

  it('Jar: discharges on a deficit, at most 30 kW (§2.1)', () => {
    const g = new Game();
    const jar = put(g, 'jar', 22, 18);
    jar.charge = 600;
    put(g, 'node', 23, 10);
    const lamps = [put(g, 'lamp', 24, 7), put(g, 'lamp', 24, 13), put(g, 'lamp', 22, 7), put(g, 'lamp', 22, 16)];
    park(g, 'moth', BEND_A_DIST);
    park(g, 'moth', BEND_B_DIST);
    park(g, 'moth', 22);
    park(g, 'moth', 40);
    settle(g, 0.5);
    expect(jar.flow).toBeCloseTo(-30);
    expect(lamps[0].sat).toBeCloseTo(38 / 48);
  });

  it('a knocked-out Node splits the network: everything past it goes dark (§2.5)', () => {
    const g = new Game();
    const node = put(g, 'node', 23, 10);
    const lamp = put(g, 'lamp', 24, 7);
    settle(g, 0.1);
    expect(lamp.net).toBeGreaterThanOrEqual(0);
    node.offline = 10;
    g.netDirty = true;
    settle(g, 0.1);
    expect(lamp.net).toBe(-1);
    expect(lamp.sat).toBe(0);
    settle(g, 10);
    expect(lamp.net).toBeGreaterThanOrEqual(0);
  });

  it('a Shade cuts a Node within 2.5 tiles of the path, not one further back (§5)', () => {
    const g = new Game();
    const beside = put(g, 'node', 10, 9); // row 9: 2.5 tiles from the path's centreline
    const off = put(g, 'node', 14, 10); // row 10: 3.5 tiles
    g.enemies.push({ id: g.nextId++, def: ENEMIES.shade, hp: 1e9, dist: 5, x: 4, y: 6.5, slow: 0, face: 1, hit: 0, wave: 0, seen: false, route: 0 });
    settle(g, 12);
    expect(g.stats.knocks).toBe(1);
    expect(beside.offline).toBeGreaterThan(0);
    expect(off.offline).toBe(0);
  });
});

describe('fuel (§3)', () => {
  it('an Extractor digs one rock per 8 s at full power; a Burner burns one per 10 s', () => {
    const g = new Game();
    const ex = put(g, 'extractor', 16, 19);
    settle(g, 8.05);
    expect(ex.stock).toBe(1);
    const g2 = new Game();
    const { burner, extractor } = factory(g2);
    burner.fuel = 1;
    extractor.off = true;
    settle(g2, 9.5);
    expect(burner.output).toBe(20);
    settle(g2, 1);
    expect(burner.output).toBe(0);
  });

  it('power costs 3.2 money per kW: Burner 40 + 0.8 Extractor per 20 kW (§3)', () => {
    expect((40 + 0.8 * 30) / 20).toBeCloseTo(3.2);
  });
});

describe('towers (§4, §8)', () => {
  it('a powered Lamp delivers 6 kJ/s; tier 2 delivers 10.8 kJ/s', () => {
    const g = new Game();
    factory(g);
    const lamp = put(g, 'lamp', 24, 13);
    const m = park(g, 'moth', BEND_B_DIST, 1000);
    settle(g, 1);
    expect(lamp.dps).toBeCloseTo(6);
    expect(1000 - m.hp).toBeCloseTo(6, 0);
    lamp.level = 2;
    settle(g, 0.1);
    expect(lamp.dps).toBeCloseTo(10.8);
  });

  it('Overcharge: the Lamp asks 36 kW ahead of every tier; the Jar pays what the Hearth cannot, and it lands 72 kJ in 4 s (§8)', () => {
    const g = new Game();
    const jar = put(g, 'jar', 22, 18);
    jar.charge = 600;
    const lamp = put(g, 'lamp', 24, 13);
    const m = park(g, 'moth', BEND_B_DIST, 1000);
    settle(g, 0.05);
    const hp0 = m.hp, kj0 = jar.charge;
    expect(overcharge(g, lamp)).toBeNull();
    settle(g, 0.05);
    expect(lamp.demand).toBeCloseTo(36);
    expect(lamp.sat).toBeCloseTo(1);
    settle(g, 3.95);
    expect(hp0 - m.hp).toBeCloseTo(72, 0);
    // 36 kW for 4 s, 8 of it from the Hearth: the Jar paid about 28 × 4 = 112 kJ
    expect(kj0 - jar.charge).toBeGreaterThan(100);
    expect(kj0 - jar.charge).toBeLessThan(120);
  });

  it('Floodlight cone: each enemy catches 0.4 of 14.4 kJ/s, three or more share all of it; a Pall shadows those behind (§4)', () => {
    const setup = () => {
      const g = new Game();
      factory(g);
      factory(g, 1);
      const fl = put(g, 'floodlight', 24, 13);
      return { g, fl };
    };
    // three Moths on the bend-B leg, all inside the 30° cone
    const { g, fl } = setup();
    const a = park(g, 'moth', 35.0, 1000);
    const b = park(g, 'moth', 34.7, 1000);
    const c = park(g, 'moth', 34.4, 1000);
    settle(g, 1);
    expect(fl.dps).toBeCloseTo(14.4);
    for (const e of [a, b, c]) expect(e.hit).toBeCloseTo(14.4 / 3);
    // two Moths: 40% each, the last 20% falls on empty ground
    const s1 = setup();
    const p1 = park(s1.g, 'moth', 35.0, 1000);
    const p2 = park(s1.g, 'moth', 34.7, 1000);
    settle(s1.g, 1);
    expect(p1.hit).toBeCloseTo(14.4 * 0.4);
    expect(p2.hit).toBeCloseTo(14.4 * 0.4);
    // a lone Moth catches only 40%
    const s2 = setup();
    const lone = park(s2.g, 'moth', 35.0, 1000);
    settle(s2.g, 1);
    expect(lone.hit).toBeCloseTo(14.4 * 0.4);
    // a lone Pall drinks the whole beam (§5): this is what lets a Floodlight answer it
    const s4 = setup();
    const solo = park(s4.g, 'pall', 35.0, 1000);
    settle(s4.g, 1);
    expect(solo.hit).toBeCloseTo(14.4);
    // a Pall in second place takes its share and the one behind it; the Moth behind gets nothing
    const s3 = setup();
    const lead = park(s3.g, 'moth', 35.0, 1000);
    const pall = park(s3.g, 'pall', 34.7, 1000);
    const back = park(s3.g, 'moth', 34.4, 1000);
    settle(s3.g, 1);
    expect(lead.hit).toBeCloseTo(14.4 / 3);
    expect(pall.hit).toBeCloseTo((14.4 * 2) / 3);
    expect(back.hit).toBe(0);
  });

  it('a Pall drinks 3/4 of a Lamp\'s narrow beam, none of a Floodlight\'s (§5)', () => {
    const g = new Game();
    factory(g);
    factory(g, 1);
    put(g, 'lamp', 24, 13);
    const p = park(g, 'pall', BEND_B_DIST, 10000);
    settle(g, 1);
    expect(p.hit).toBeCloseTo(6 * 0.25);
  });

  it('Beacon slows 40% × satisfaction (§4)', () => {
    const g = new Game();
    put(g, 'beacon', 24, 13);
    const m = park(g, 'moth', BEND_B_DIST);
    settle(g, 0.1);
    expect(m.slow).toBeCloseTo(0.4);
  });
});

describe('wave pay, lights and Overcharge (§3, §5.2, §8)', () => {
  it('a cleared wave pays 15 + 5 × n, leaks or not', () => {
    const g = new Game();
    const m0 = g.money;
    startNextWave(g);
    settle(g, 60); // wave 1 walks in unopposed and leaks
    expect(g.stats.leaks).toBe(8);
    expect(g.wavePaid.has(1)).toBe(true);
    expect(g.money - m0).toBe(wavePay(1));
    expect(wavePay(1)).toBe(20);
    expect(wavePay(12)).toBe(75);
  });

  it('the Hearth dims 0.4 kW for every light lost', () => {
    const g = new Game();
    settle(g, 0.1);
    expect(g.grid.gen).toBeCloseTo(8);
    g.lights = 15;
    settle(g, 0.1);
    expect(g.grid.gen).toBeCloseTo(6);
  });

  it('Overcharge with no Jar behind it starves the rest of the wall for its 4 s, then can go again', () => {
    // the Hearth and one Burner make 28 kW; two firing Lamps ask 24 and get all of it
    const g = new Game();
    factory(g);
    put(g, 'node', 21, 10);
    const a = put(g, 'lamp', 24, 13);
    const b = put(g, 'lamp', 24, 7);
    park(g, 'moth', BEND_B_DIST, 1e6);
    park(g, 'moth', BEND_A_DIST, 1e6);
    settle(g, 1);
    expect(a.sat).toBeCloseTo(1);
    expect(b.sat).toBeCloseTo(1);
    // Lamp A asks 36 kW ahead of everything: it takes all 28, the other Lamp goes dark
    expect(overcharge(g, a)).toBeNull();
    settle(g, 0.1);
    expect(a.sat).toBeLessThan(1);
    expect(b.sat).toBe(0);
    expect(g.grid.wall.sat).toBeLessThan(0.6);
    settle(g, 4);
    expect(b.sat).toBeGreaterThan(0.9);
    // no cooldown: the price was the starved wall
    expect(overcharge(g, a)).toBeNull();
  });
});

describe('the new wall (§4.1, §5.1)', () => {
  it('Brazier asks 8 kW for each body in its fire and burns each at 5.2 kJ/s; a Pall takes all of it', () => {
    const g = new Game();
    factory(g);
    factory(g, 1);
    g.research.done.add('brazier');
    const br = put(g, 'brazier', 24, 13);
    const a = park(g, 'moth', 35.0, 1000);
    const b = park(g, 'moth', 34.0, 1000);
    const p = park(g, 'pall', 36.0, 1000);
    settle(g, 1);
    expect(br.bodies).toBe(3);
    expect(br.demand).toBeCloseTo(1 + 3 * 8);
    for (const e of [a, b, p]) expect(e.hit).toBeCloseTo(8 * 0.65);
  });

  it('Searchlight locks onto the heaviest enemy in its 7 tiles and swings 0.5 s to a new one', () => {
    const g = new Game();
    factory(g);
    factory(g, 1);
    g.research.done.add('searchlight');
    const sl = put(g, 'searchlight', 24, 10);
    const moth = park(g, 'moth', 33, 30);
    const shade = park(g, 'shade', 30, 90);
    settle(g, 0.4);
    expect(sl.target).toBe(shade.id);
    expect(shade.hit).toBe(0); // still swinging
    settle(g, 0.3);
    expect(shade.hit).toBeCloseTo(18);
    expect(moth.hit).toBe(0);
  });

  it('Starshell charges a 70 kJ shell at 10 kW and bursts 56 kJ over a crowd, 0.3 to each', () => {
    const g = new Game();
    factory(g);
    factory(g, 1);
    g.research.done.add('starshell');
    const ss = put(g, 'starshell', 20, 9);
    settle(g, 5.5);
    expect(ss.shell).toBeGreaterThan(50);
    expect(ss.shell).toBeLessThan(60);
    const crowd = [park(g, 'moth', 22, 1000), park(g, 'moth', 22.5, 1000), park(g, 'moth', 23, 1000)];
    settle(g, 2.5);
    expect(g.shots.length).toBe(0);
    for (const e of crowd) expect(1000 - e.hp).toBeCloseTo(56 * 0.3);
  });

  it('Starshell holds three shells (210 kJ) and lobs them 0.6 s apart: each wave opens with three bursts', () => {
    const g = new Game();
    factory(g);
    factory(g, 1);
    g.research.done.add('starshell');
    const ss = put(g, 'starshell', 20, 9);
    settle(g, 25);
    expect(ss.shell).toBeCloseTo(210);
    expect(ss.demand).toBe(0);
    park(g, 'moth', 22, 1e6);
    settle(g, 0.1);
    expect(ss.shell).toBeLessThan(145); // one lobbed
    settle(g, 0.6);
    expect(ss.shell).toBeLessThan(80); // two (and 0.7 s of charging)
    settle(g, 0.6);
    expect(ss.shell).toBeLessThan(20); // three
  });

  it('a Veil is invisible to a starved tower and found by one above 60%', () => {
    const g = new Game();
    const lamp = put(g, 'lamp', 24, 13);
    const v = park(g, 'veil', BEND_B_DIST, 1000);
    // the Hearth alone: 8 kW for a 12 kW Lamp is 67%, above the line: it finds the Veil
    settle(g, 2);
    expect(lamp.target).toBe(v.id);
    // three more firing Lamps on the Hearth's 8 kW: below the line, the Veil walks unseen
    put(g, 'node', 23, 10);
    for (const [x, y] of [[24, 7], [22, 7], [22, 16]]) put(g, 'lamp', x, y);
    park(g, 'moth', 28.5);
    park(g, 'moth', 22);
    park(g, 'moth', 40);
    settle(g, 2);
    expect(lamp.satAvg).toBeLessThan(0.6);
    expect(lamp.target).not.toBe(v.id);
  });

  it('a Snuffer puts out a Burner within 3.5 tiles for 8 s and its burning rock is lost', () => {
    const g = new Game();
    const { burner } = factory(g, 2); // the north deposit, Burner at (17, 10)
    settle(g, 1);
    expect(burner.output).toBe(20);
    const s = park(g, 'snuffer', 18.5, 1e9); // on the first straight above it
    s.def = { ...s.def, snuffRadius: 3.5, snuffTime: 8 };
    settle(g, 0.1);
    expect(burner.output).toBe(0);
    expect(burner.snuffed).toBeGreaterThan(7);
    g.enemies = [];
    settle(g, 8.1);
    expect(burner.output).toBe(20);
  });
});

describe('the factory half (§3.2)', () => {
  it('a Vane makes 15 kW × the wind, which averages about 0.55', () => {
    const g = new Game();
    g.research.done.add('vane');
    const v = put(g, 'vane', 20, 18);
    let sum = 0;
    const n = 600;
    for (let i = 0; i < n; i++) {
      settle(g, 1);
      sum += v.output;
      expect(v.output).toBeGreaterThanOrEqual(1.5 - 1e-9);
      expect(v.output).toBeLessThanOrEqual(15 + 1e-9);
    }
    expect(sum / n / 15).toBeGreaterThan(0.48);
    expect(sum / n / 15).toBeLessThan(0.62);
  });

  it('Bellows: a tier-2 Burner makes 30 kW and a rock lasts 8 s', () => {
    const g = new Game();
    const { burner, extractor } = factory(g);
    g.research.done.add('bellows');
    g.money = 1000;
    expect(upgrade(g, burner)).toBeNull();
    burner.fuel = 1;
    burner.burnLeft = 0;
    extractor.off = true;
    settle(g, 7.9);
    expect(burner.output).toBe(30);
    settle(g, 0.3);
    expect(burner.output).toBe(0);
  });

  it('a Long line Node reaches 6 tiles and loses 1 kW', () => {
    const g = new Game();
    const node = put(g, 'node', 23, 10);
    const lamp = put(g, 'lamp', 29, 10); // 5 tiles past the Node: off the grid at reach 4
    settle(g, 0.1);
    expect(lamp.net).toBe(-1);
    g.research.done.add('longline');
    g.money = 100;
    expect(upgrade(g, node)).toBeNull();
    settle(g, 0.1);
    expect(lamp.net).toBeGreaterThanOrEqual(0);
    expect(g.grid.gen).toBeCloseTo(7);
  });
});

describe('Pulse (§8)', () => {
  // two Lamps lit by the Hearth, a full Jar: 600 kJ × 0.6 = 360 kJ split across what is in reach
  const setup = () => {
    const g = new Game();
    g.research.done.add('pulse');
    const jar = put(g, 'jar', 22, 18);
    jar.charge = 600;
    const near = put(g, 'lamp', 24, 13);
    const far = put(g, 'lamp', 22, 16);
    return { g, jar, near, far };
  };

  it('a lone enemy within 3 tiles of a lit tower takes all 360 kJ; the Jar is emptied', () => {
    const { g, jar } = setup();
    const m = park(g, 'moth', BEND_B_DIST, 1000);
    const away = park(g, 'moth', 5, 1000); // far up the road: out of reach, untouched
    settle(g, 0.05);
    const hp0 = m.hp;
    expect(pulse(g)).toBeNull();
    expect(jar.charge).toBe(0);
    expect(hp0 - m.hp).toBeCloseTo(360, 0);
    expect(away.hp).toBe(1000);
    expect(g.stats.pulses).toBe(1);
  });

  it('four in reach split it, 90 kJ each; a Pall takes its share (no shadow)', () => {
    const { g } = setup();
    const ms = [0, 0.3, 0.6, 0.9].map((d) => park(g, 'moth', BEND_B_DIST + d, 1000));
    settle(g, 0.05);
    const before = ms.map((m) => m.hp);
    pulse(g);
    for (let i = 0; i < 4; i++) expect(before[i] - ms[i].hp).toBeCloseTo(90, 0);
    const h = setup();
    const p = park(h.g, 'pall', BEND_B_DIST, 1000);
    park(h.g, 'moth', BEND_B_DIST + 0.5, 1000);
    settle(h.g, 0.05);
    const p0 = p.hp;
    pulse(h.g);
    expect(p0 - p.hp).toBeCloseTo(180, 0);
  });

  it('needs research, 300 kJ where a tower is lit, and something in reach; otherwise the Jar keeps its charge', () => {
    const { g, jar, near, far } = setup();
    settle(g, 0.05);
    g.research.done.delete('pulse');
    expect(pulseProblem(g)).toMatch(/Research/);
    g.research.done.add('pulse');
    expect(pulse(g)).toMatch(/Nothing/);
    park(g, 'moth', BEND_B_DIST, 1000);
    jar.charge = 250;
    expect(pulseProblem(g)).toMatch(/300 kJ/);
    jar.charge = 600;
    toggleOff(g, near);
    toggleOff(g, far);
    settle(g, 0.05);
    expect(pulse(g)).toMatch(/300 kJ/);
    expect(jar.charge).toBeGreaterThan(590);
  });
});
