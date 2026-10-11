// Data validation (CLAUDE.md): every numeric stat carries a derivation naming a DESIGN.md
// section, every upgrade node has a wattage column, and every cross-reference resolves.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BUILDINGS, BUILD_ORDER, ENERGY_KEYS, SELL_REFUND } from '../src/data/buildings';
import { ENEMIES, ENEMY_BY_CODE } from '../src/data/enemies';
import { WAVES, endlessWave } from '../src/data/waves';
import { RESEARCH, RESEARCH_ORDER } from '../src/data/research';
import { RULES } from '../src/data/rules';
import { MAPS } from '../src/data/map';
import { Game } from '../src/sim/Game';
import { pointRectDist } from '../src/sim/geom';

const design = readFileSync(new URL('../DESIGN.md', import.meta.url), 'utf8');
const sections = new Set([...design.matchAll(/^## (\d+)\./gm)].map((m) => m[1]));

/** a derivation must name an existing DESIGN.md section, like "§4" or "§2.3" */
function checkWhy(label: string, why: string | undefined) {
  expect(why, `${label}: missing derivation`).toBeTruthy();
  const refs = [...(why ?? '').matchAll(/§(\d+)/g)].map((m) => m[1]);
  const style = /STYLE\.md/.test(why ?? '');
  expect(refs.length > 0 || style, `${label}: derivation "${why}" names no DESIGN.md section`).toBe(true);
  for (const r of refs) expect(sections.has(r), `${label}: §${r} is not a DESIGN.md section`).toBe(true);
}

/** every numeric (or numeric-array) field of an entry needs why[field] */
function checkEntry(label: string, entry: Record<string, unknown>, why: Record<string, string>, skip: string[] = []) {
  for (const [k, v] of Object.entries(entry)) {
    if (skip.includes(k)) continue;
    const numeric = typeof v === 'number' || (Array.isArray(v) && v.every((x) => typeof x === 'number'));
    if (numeric) checkWhy(`${label}.${k}`, why[k]);
  }
}

describe('data validation', () => {
  it('DESIGN.md has its numbered sections', () => {
    for (const s of ['1', '2', '3', '4', '5', '6', '7', '8']) expect(sections.has(s)).toBe(true);
  });

  it('every building stat has a derivation', () => {
    for (const b of Object.values(BUILDINGS)) {
      checkEntry(b.id, b as unknown as Record<string, unknown>, b.why);
      for (const [i, u] of (b.upgrades ?? []).entries()) checkEntry(`${b.id}.upgrades[${i}]`, { cost: u.cost, ...u.stats }, u.why);
    }
    checkWhy('SELL_REFUND', SELL_REFUND.why);
  });

  it('every upgrade node has a wattage column (an energy-side effect)', () => {
    for (const b of Object.values(BUILDINGS))
      for (const u of b.upgrades ?? []) {
        const energy = ENERGY_KEYS.filter((k) => u.stats[k] !== undefined && u.stats[k] !== (b as any)[k]);
        expect(energy.length, `${b.id} upgrade changes nothing on the energy side`).toBeGreaterThan(0);
      }
  });

  it('every enemy stat has a derivation and bounty = round(health × 0.15) (§1, §6 economy)', () => {
    for (const e of Object.values(ENEMIES)) {
      checkEntry(e.id, e as unknown as Record<string, unknown>, e.why);
      expect(e.bounty).toBe(Math.round(e.health * 0.15));
    }
  });

  it('waves match the composition in §5 and have derived spacing', () => {
    expect(WAVES.length).toBe(12);
    for (const w of WAVES) {
      checkEntry(`wave ${w.n}`, w as unknown as Record<string, unknown>, w.why);
      const counts: Record<string, number> = {};
      for (const c of w.seq) {
        expect(ENEMY_BY_CODE[c], `wave ${w.n}: unknown enemy code ${c}`).toBeTruthy();
        counts[c] = (counts[c] ?? 0) + 1;
      }
      expect(counts).toEqual(w.composition);
    }
    // §5 totals: health per wave
    const health = [240, 360, 480, 742, 812, 1064, 1020, 2150, 1524, 2184, 3414, 5456];
    WAVES.forEach((w, i) => {
      const h = [...w.seq].reduce((a, c) => a + ENEMY_BY_CODE[c].health, 0);
      expect(h, `wave ${w.n} total health`).toBe(health[i]);
    });
  });

  it('endless waves grow by the §5.3 curve', () => {
    const last = [...WAVES[11].seq].reduce((a, c) => a + ENEMY_BY_CODE[c].health, 0);
    const w20 = endlessWave(20);
    const h = [...w20.seq].reduce((a, c) => a + ENEMY_BY_CODE[c].health, 0);
    expect(h / last).toBeGreaterThan(Math.pow(RULES.endlessGrowth.v, 8) * 0.8);
    expect(h / last).toBeLessThan(Math.pow(RULES.endlessGrowth.v, 8) * 1.2);
    expect(w20.spacing).toBeGreaterThanOrEqual(0.25);
  });

  it('research, rules and the map have derivations; cross-references resolve', () => {
    for (const r of Object.values(RESEARCH)) checkEntry(r.id, r as unknown as Record<string, unknown>, r.why);
    for (const [k, r] of Object.entries(RULES)) checkWhy(`RULES.${k}`, r.why);
    for (const m of MAPS) for (const k of ['w', 'h', 'hearth', 'paths', 'deposits', 'windMean', 'pace', 'unlockWave']) checkWhy(`${m.id}.${k}`, m.why[k]);
    for (const id of RESEARCH_ORDER) expect(RESEARCH[id]).toBeTruthy();
    expect(new Set(RESEARCH_ORDER)).toEqual(new Set(Object.keys(RESEARCH)));
    for (const r of Object.values(RESEARCH)) if (r.requires) expect(RESEARCH[r.requires], `${r.id} requires unknown ${r.requires}`).toBeTruthy();
    for (const b of Object.values(BUILDINGS)) {
      if (b.research) expect(RESEARCH[b.research], `${b.id} needs unknown research ${b.research}`).toBeTruthy();
      for (const u of b.upgrades ?? []) expect(RESEARCH[u.research]).toBeTruthy();
    }
    for (const id of BUILD_ORDER) expect(BUILDINGS[id]).toBeTruthy();
    for (const m of MAPS) {
      const g = new Game({ map: m });
      for (const tiles of m.deposits)
        for (const [x, y] of tiles) {
          expect(x >= 0 && y >= 0 && x < m.w && y < m.h, `${m.id} deposit ${x},${y} off the map`).toBe(true);
          expect(g.isPath(x, y), `${m.id} deposit ${x},${y} on a road`).toBe(false);
        }
      // every road ends touching the Hearth and starts off the map edge
      for (const p of g.paths) {
        const end = p.pts[p.pts.length - 1], start = p.pts[0];
        expect(pointRectDist(end[0], end[1], { ...m.hearth, w: 4, h: 4 }), `${m.id} road ends away from the Hearth`).toBeLessThanOrEqual(0.15);
        expect(start[0] < 0 || start[1] < 0 || start[0] > m.w || start[1] > m.h, `${m.id} road starts on the map`).toBe(true);
      }
      for (let y = m.hearth.y; y < m.hearth.y + 4; y++) for (let x = m.hearth.x; x < m.hearth.x + 4; x++) expect(g.isPath(x, y), `${m.id} road over the Hearth`).toBe(false);
    }
  });
});
