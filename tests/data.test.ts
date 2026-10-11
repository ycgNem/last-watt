// Data validation (CLAUDE.md): every numeric stat carries a derivation naming a DESIGN.md
// section, every upgrade node has a wattage column, and every cross-reference resolves.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BUILDINGS, BUILD_ORDER, SELL_REFUND } from '../src/data/buildings';
import { ENEMIES, ENEMY_BY_CODE } from '../src/data/enemies';
import { WAVES } from '../src/data/waves';
import { RESEARCH, RESEARCH_ORDER } from '../src/data/research';
import { RULES } from '../src/data/rules';
import { SLICE_MAP } from '../src/data/map';

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
      for (const [i, u] of (b.upgrades ?? []).entries()) checkEntry(`${b.id}.upgrades[${i}]`, u as unknown as Record<string, unknown>, u.why);
    }
    checkWhy('SELL_REFUND', SELL_REFUND.why);
  });

  it('every upgrade node has a wattage column (an energy-side effect)', () => {
    for (const b of Object.values(BUILDINGS))
      for (const u of b.upgrades ?? []) {
        const base = b.firingDraw ?? b.constantDraw ?? 0;
        expect(u.firingDraw !== base || u.efficiency !== b.efficiency, `${b.id} upgrade changes nothing on the energy side`).toBe(true);
      }
  });

  it('every enemy stat has a derivation and bounty = round(health × 0.15) (§1, §6 economy)', () => {
    for (const e of Object.values(ENEMIES)) {
      checkEntry(e.id, e as unknown as Record<string, unknown>, e.why);
      expect(e.bounty).toBe(Math.round(e.health * 0.15));
    }
  });

  it('waves match the composition in §5 and have derived spacing', () => {
    expect(WAVES.length).toBe(8);
    for (const w of WAVES) {
      checkEntry(`wave ${w.n}`, w as unknown as Record<string, unknown>, w.why);
      const counts: Record<string, number> = {};
      for (const c of w.seq) {
        expect(ENEMY_BY_CODE[c], `wave ${w.n}: unknown enemy code ${c}`).toBeTruthy();
        counts[c] = (counts[c] ?? 0) + 1;
      }
      expect(counts).toEqual(w.composition);
    }
    // §5 totals: health and bounty per wave
    const health = [240, 360, 480, 810, 700, 960, 2150, 2910];
    WAVES.forEach((w, i) => {
      const h = [...w.seq].reduce((a, c) => a + ENEMY_BY_CODE[c].health, 0);
      expect(h, `wave ${w.n} total health`).toBe(health[i]);
    });
  });

  it('research, rules and the map have derivations; cross-references resolve', () => {
    for (const r of Object.values(RESEARCH)) checkEntry(r.id, r as unknown as Record<string, unknown>, r.why);
    for (const [k, r] of Object.entries(RULES)) checkWhy(`RULES.${k}`, r.why);
    for (const k of ['w', 'h', 'hearth', 'path', 'deposits']) checkWhy(`map.${k}`, SLICE_MAP.why[k]);
    for (const id of RESEARCH_ORDER) expect(RESEARCH[id]).toBeTruthy();
    for (const b of Object.values(BUILDINGS)) {
      if (b.research) expect(RESEARCH[b.research], `${b.id} needs unknown research ${b.research}`).toBeTruthy();
      for (const u of b.upgrades ?? []) expect(RESEARCH[u.research]).toBeTruthy();
    }
    for (const id of BUILD_ORDER) expect(BUILDINGS[id]).toBeTruthy();
    for (const tiles of SLICE_MAP.deposits)
      for (const [x, y] of tiles) expect(x >= 0 && y >= 0 && x < SLICE_MAP.w && y < SLICE_MAP.h).toBe(true);
  });
});
