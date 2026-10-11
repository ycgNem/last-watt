// The grid arithmetic of DESIGN.md §2 and the unit numbers of §3, §4, §6, §8.
import { describe, expect, it } from 'vitest';
import { Game, park, put, factory, settle } from './helpers';
import { overcharge, toggleOff, setTier, toggleTier } from '../src/sim/actions';
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
    expect(g.grid.tiers[1].sat).toBeCloseTo(8 / 48);
    for (const l of lamps) expect(l.dps).toBeCloseTo(12 * 0.5 * (8 / 48));
  });

  it('tiers: tier 1 is served fully before tier 2 sees anything', () => {
    const g = new Game();
    const lamp = put(g, 'lamp', 24, 13);
    const ex = put(g, 'extractor', 16, 19);
    park(g, 'moth', BEND_B_DIST);
    settle(g, 0.1);
    // 8 kW: the firing Lamp (12 kW) takes it all; the Extractor (tier 2) gets nothing
    expect(lamp.sat).toBeCloseTo(8 / 12);
    expect(ex.sat).toBe(0);
    // move the Extractor up to tier 1: both share 8 / 14
    setTier(g, ex, 1);
    settle(g, 0.1);
    expect(ex.sat).toBeCloseTo(8 / 14);
    // shed the Lamp: the Extractor gets everything
    toggleOff(g, lamp);
    settle(g, 0.1);
    expect(ex.sat).toBe(1);
    expect(lamp.sat).toBe(0);
    // shedding a whole tier from the HUD
    toggleTier(g, 1);
    settle(g, 0.1);
    expect(ex.sat).toBe(0);
  });

  it('Jar: charges at most 15 kW from surplus, fills 600 kJ in 40 s (§3, §6)', () => {
    const g = new Game();
    factory(g);
    g.research.done.add('jar');
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
    g.research.done.add('jar');
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

  it('a Shade knocks out a Node right beside the path, not one with a tile of ground between (§5)', () => {
    const g = new Game();
    const beside = put(g, 'node', 10, 7); // row 7: touching the path (row 6)
    const off = put(g, 'node', 14, 8); // row 8: a tile of ground between it and the path
    g.enemies.push({ id: g.nextId++, def: ENEMIES.shade, hp: 1e9, dist: 5, x: 4, y: 6.5, slow: 0, face: 1, hit: 0, wave: 0 });
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

  it('Overcharge: 120 kJ from the Jar, a Lamp delivers 72 kJ in 4 s (§8)', () => {
    const g = new Game();
    g.research.done.add('jar');
    const jar = put(g, 'jar', 22, 18);
    jar.charge = 600;
    const lamp = put(g, 'lamp', 24, 13);
    const m = park(g, 'moth', BEND_B_DIST, 1000);
    settle(g, 0.05);
    const hp0 = m.hp, kj0 = jar.charge;
    expect(overcharge(g, lamp)).toBeNull();
    expect(kj0 - jar.charge).toBeCloseTo(120);
    settle(g, 4);
    expect(hp0 - m.hp).toBeCloseTo(72, 0);
  });

  it('Floodlight splits 14.4 kJ/s 4 : 2 : 1 across a crowd; a Pall drinks every later share (§4)', () => {
    const setup = () => {
      const g = new Game();
      factory(g);
      factory(g, 1);
      const fl = put(g, 'floodlight', 24, 13);
      return { g, fl };
    };
    const { g, fl } = setup();
    const a = park(g, 'moth', 35.0, 1000);
    const b = park(g, 'moth', 34.4, 1000);
    const c = park(g, 'moth', 33.8, 1000);
    settle(g, 1);
    expect(fl.dps).toBeCloseTo(14.4);
    expect(a.hit).toBeCloseTo((14.4 * 4) / 7);
    expect(b.hit).toBeCloseTo((14.4 * 2) / 7);
    expect(c.hit).toBeCloseTo((14.4 * 1) / 7);
    // a lone Moth gets only its share; the rest is lost
    const s2 = setup();
    const lone = park(s2.g, 'moth', 35.0, 1000);
    settle(s2.g, 1);
    expect(lone.hit).toBeCloseTo((14.4 * 4) / 7);
    // a Pall in second place takes 2 + 1; the Moth behind it gets nothing
    const s3 = setup();
    const lead = park(s3.g, 'moth', 35.0, 1000);
    const pall = park(s3.g, 'pall', 34.4, 1000);
    const back = park(s3.g, 'moth', 33.8, 1000);
    settle(s3.g, 1);
    expect(lead.hit).toBeCloseTo((14.4 * 4) / 7);
    expect(pall.hit).toBeCloseTo((14.4 * 3) / 7);
    expect(back.hit).toBe(0);
  });

  it('Beacon slows 40% × satisfaction (§4)', () => {
    const g = new Game();
    put(g, 'beacon', 24, 13);
    const m = park(g, 'moth', BEND_B_DIST);
    settle(g, 0.1);
    expect(m.slow).toBeCloseTo(0.4);
  });
});
