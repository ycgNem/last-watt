// The gaffer's skill tree (DESIGN.md §9): every node's rule, the embers a run pays, and the data.
import { describe, expect, it } from 'vitest';
import { Game, park, put, factory, settle } from './helpers';
import { SKILLS, SKILL_ORDER, SKILL_RULES, embersFor, skillProblem } from '../src/data/skills';
import { MAPS } from '../src/data/map';
import { ENEMIES } from '../src/data/enemies';
import { overcharge, startResearch } from '../src/sim/actions';
import { migrate, SAVE_VERSION } from '../src/app/save';
import { readFileSync } from 'node:fs';

const design = readFileSync('DESIGN.md', 'utf8');

describe('skill data', () => {
  it('every node names its energy-side change and a §9 price; requirements sit above in the same column', () => {
    expect(SKILL_ORDER.sort()).toEqual(Object.keys(SKILLS).sort());
    for (const s of Object.values(SKILLS)) {
      expect(s.watt.length, `${s.id} has no watt line`).toBeGreaterThan(10);
      expect(s.why.cost, `${s.id} cost`).toMatch(/§9/);
      if (s.requires) {
        const r = SKILLS[s.requires];
        expect(r.column).toBe(s.column);
        expect(r.row).toBe(s.row - 1);
      } else expect(s.row).toBe(1);
    }
    for (const [k, r] of Object.entries(SKILL_RULES)) expect(r.why, k).toMatch(/§9/);
    expect(design).toMatch(/## 9\. The gaffer's skill tree/);
  });

  it('embers: one a wave cleared, half the lights left on a win; buying needs the node above and the embers', () => {
    expect(embersFor(4, false, 0)).toBe(4);
    expect(embersFor(12, true, 15)).toBe(20);
    expect(skillProblem('wideMouth', [], 50)).toMatch(/Spare Jar/);
    expect(skillProblem('spareJar', [], 3)).toMatch(/4 embers/);
    expect(skillProblem('spareJar', [], 4)).toBeNull();
  });

  it('a version-2 profile gains embers and skills at 0', () => {
    const p = migrate({ v: 2, tutorialDone: true, met: [], best: { wave: 5, won: false, lights: 0, endless: 0 }, maps: {}, map: 'station', runs: 2, muted: false });
    expect(p.v).toBe(SAVE_VERSION);
    expect(p.embers).toBe(0);
    expect(p.skills).toEqual([]);
  });
});

describe('skill rules (§9)', () => {
  it('Spare Jar: every map starts with a Jar on a network, off the road and the rock', () => {
    for (const map of MAPS) {
      const g = new Game({ map, skills: ['spareJar'] });
      settle(g, 0.1);
      const jars = [...g.buildings.values()].filter((b) => b.def.role === 'storage');
      expect(jars.length, map.id).toBe(1);
      expect(jars[0].net, map.id).toBeGreaterThanOrEqual(0);
      expect(g.isPath(jars[0].x, jars[0].y) || g.isDeposit(jars[0].x, jars[0].y), map.id).toBe(false);
    }
  });

  it('Hot Hearth: 10 kW at 20 lights', () => {
    const g = new Game({ skills: ['hotHearth'] });
    settle(g, 0.1);
    expect(g.grid.gen).toBeCloseTo(10);
  });

  it('Kindling: a new Burner holds three rocks; Banked Spark: the first Jar comes full, the second empty', () => {
    const g = new Game({ skills: ['kindling', 'bankedSpark'] });
    expect(put(g, 'burner', 13, 18).fuel).toBe(3);
    expect(put(g, 'jar', 22, 18).charge).toBe(600);
    expect(put(g, 'jar', 23, 18).charge).toBe(0);
  });

  it('Wide Mouth: a Jar takes 22.5 kW of spare power', () => {
    const g = new Game({ skills: ['wideMouth'] });
    factory(g);
    const jar = put(g, 'jar', 22, 18);
    settle(g, 2);
    expect(jar.flow).toBeCloseTo(22.5);
  });

  it('Head Start: the first project costs half, the next full', () => {
    const g = new Game({ skills: ['headStart'] });
    expect(g.researchCost('brazier')).toBe(350);
    g.research.done.add('vane');
    expect(g.researchCost('brazier')).toBe(700);
    expect(startResearch(g, 'brazier')).toBeNull();
  });

  it('Cool Glass: an Overcharged Lamp asks 30 kW and still fires 3×', () => {
    const g = new Game({ skills: ['coolGlass'] });
    factory(g);
    factory(g, 1);
    const lamp = put(g, 'lamp', 24, 13);
    const m = park(g, 'moth', 35, 1000);
    settle(g, 0.1);
    overcharge(g, lamp);
    settle(g, 0.1);
    expect(lamp.demand).toBeCloseTo(30);
    const hp = m.hp;
    settle(g, 1);
    expect(hp - m.hp).toBeCloseTo(18, 0);
  });

  // a Shade or Snuffer standing still at (4, 6.5) on the first straight, reach intact
  const stand = (g: Game, kind: 'shade' | 'snuffer') =>
    g.enemies.push({ id: g.nextId++, def: { ...ENEMIES[kind], speed: 0, health: 1e9 }, hp: 1e9, dist: 5, x: 4, y: 6.5, slow: 0, face: 1, hit: 0, wave: 0, seen: false, route: 0 });

  it('Slow Fuse: a Shade standing by a Node cuts it only after 1.5 s; without it, at once', () => {
    const plain = new Game();
    const n0 = put(plain, 'node', 4, 8);
    stand(plain, 'shade');
    settle(plain, 0.05);
    expect(n0.offline).toBeGreaterThan(0);
    const g = new Game({ skills: ['slowFuse'] });
    const node = put(g, 'node', 4, 8);
    stand(g, 'shade');
    settle(g, 1.4);
    expect(node.offline).toBe(0);
    settle(g, 0.2);
    expect(node.offline).toBeGreaterThan(0);
  });

  it('Quick Relight: a snuffed Burner is out 4 s, not 8', () => {
    for (const [skills, t] of [[[], 8], [['quickRelight'], 4]] as const) {
      const g = new Game({ skills: [...skills] });
      const b = put(g, 'burner', 3, 8);
      stand(g, 'snuffer');
      settle(g, 0.05);
      expect(b.snuffed).toBeCloseTo(t, 0);
    }
  });
});
