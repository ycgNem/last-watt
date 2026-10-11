// The run's twelve waves (DESIGN.md §5, spacing derived and bot-tuned in §6), then endless waves
// made from the kJ curve (§5.3). A sequence is one letter per spawn (ENEMY_BY_CODE); spawns are
// `spacing` s apart, except a Flit followed by a Flit (its clump gap). tests/data.test.ts checks
// each sequence against the composition §5 promises.
import { ENEMY_BY_CODE } from './enemies';
import { RULES } from './rules';
import type { MapDef } from './map';

export interface WaveDef {
  n: number;
  seq: string;
  spacing: number;
  /** the composition §5 promises, checked against seq */
  composition: Record<string, number>;
  /** a one-line warning shown when the wave starts */
  note?: string;
  why: Record<string, string>;
}

const F8 = 'FFFFFFFF';

export const WAVES: WaveDef[] = [
  { n: 1, seq: 'MMMMMMMM', spacing: 2.25, composition: { M: 8 }, note: 'Moths. They walk toward the light.',
    why: { n: '§5 wave table', spacing: '§6 wave 1: 2.25 s (sim; placement lesson holds 2.0–2.4 s)' } },
  { n: 2, seq: 'MMMMMMMMMMMM', spacing: 1.9, composition: { M: 12 },
    why: { n: '§5 wave table', spacing: '§6 bot-tuned: 1.9 s (the reference sim gave 1.75)' } },
  { n: 3, seq: 'MMMSMMFFFFMMSMMM', spacing: 2.4, composition: { M: 10, S: 2, F: 4 }, note: 'Shades cut Nodes near the path; Flits come fast, in a clump.',
    why: { n: '§5 wave table', spacing: '§6: 2.4 s, 16.7 kJ/s = 1.2× one Burner wall (the second review: at 3.0 the money split only bit at wave 4)' } },
  { n: 4, seq: 'MMMSMMMS' + 'FFFF' + 'M' + 'FFFF' + 'MMSMMM', spacing: 2.2, composition: { M: 12, S: 3, F: 8 }, note: 'Flits in two clumps of four. Later waves bring eight at once.',
    why: { n: '§5 wave table (the fourth review: one clump of eight was 53 kJ/s for 2.1 s against an 18-24 kJ/s wall, pure throughput; two of four, 4.4 s apart)', spacing: '§6 bot-tuned' } },
  { n: 5, seq: 'MMMMMPMMMMM' + F8, spacing: 1.6, composition: { M: 10, P: 1, F: 8 }, note: 'A Pall: 400 kJ of dark. Floodlights and Overcharge.',
    why: { n: '§5 wave table', spacing: '§6 bot-tuned' } },
  { n: 6, seq: 'MMDMSMM' + F8 + 'SMMDMSMMS' + F8, spacing: 1.2, composition: { M: 10, S: 4, F: 16, D: 2 }, note: 'Siphons: they drink 12 kW from any line they pass.',
    why: { n: '§5 wave table (Siphons from wave 6: two in place of six Moths)', spacing: '§6 bot-tuned' } },
  { n: 7, seq: 'MMVMMVMMSMMVMMVSMMVMMV', spacing: 1.4, composition: { M: 14, V: 6, S: 2 }, note: 'Veils: only towers above 60% power can see them.',
    why: { n: '§5 wave table', spacing: '§6 bot-tuned' } },
  { n: 8, seq: 'MMSMMSMMP' + 'MMSMMSMMS' + 'P', spacing: 0.8, composition: { M: 12, S: 5, P: 2 }, note: 'Two Palls.',
    why: { n: '§5 wave table (the fourth review: 1,610 kJ, ×1.58 on wave 7 like the late steps; it was 2,600, ×2.55, and lost at full power)', spacing: '§6: 0.8 s' } },
  { n: 9, seq: 'MMNMMVMD' + F8 + 'MMVMMNMMVMM' + F8 + 'MDVMMN' + F8 + 'MMN', spacing: 0.85, composition: { M: 18, N: 4, V: 4, F: 24, D: 2 }, note: 'Snuffers: they put out Burners near the path.',
    why: { n: '§5 wave table', spacing: '§6 bot-tuned' } },
  { n: 10, seq: 'MMSMMVMMSMMVMMN' + F8 + 'MMSDVMMSDVMMN' + 'P' + F8 + 'MMSMMSMMS', spacing: 0.65, composition: { M: 22, S: 7, V: 4, N: 2, P: 1, F: 16, D: 2 },
    why: { n: '§5 wave table', spacing: '§6 bot-tuned' } },
  { n: 11, seq: 'MMMSMMMSMMMSP' + F8 + 'DMMSVMMMSVMMMSP' + F8 + 'MMMSVMMMSVMMMSPMDM' + 'MMSMMSMMSMMS', spacing: 0.42, composition: { M: 36, S: 13, V: 4, P: 3, F: 16, D: 2 },
    why: { n: '§5 wave table (the slice\'s wave 8 with Veils and Flits)', spacing: '§6 bot-tuned' } },
  { n: 12, seq: 'PMMSMMVMMSMMVMMN' + F8 + 'PMMSMMVMMSMMVMMN' + F8 + 'PMMSMMVMMSMMVMMN' + F8 + 'PMMSDVMMSDVMMNP' + F8 + 'MMSMMSMMS', spacing: 0.38,
    composition: { M: 42, S: 11, V: 8, N: 4, P: 5, F: 32, D: 2 }, note: 'The last wave. Five Palls.',
    why: { n: '§5 wave table', spacing: '§6 bot-tuned' } },
];

export const LAST_WAVE = WAVES.length;

/** total kJ a sequence brings */
export function seqHealth(seq: string): number {
  let sum = 0;
  for (const c of seq) sum += ENEMY_BY_CODE[c].health;
  return sum;
}

const ENDLESS_BLOCK = 'PMMSDVMMSMMVMMN' + F8;

/** endless wave n (> LAST_WAVE): the last wave's kJ × growth^(n − last), §5.3 */
export function endlessWave(n: number): WaveDef {
  const last = WAVES[WAVES.length - 1];
  const target = seqHealth(last.seq) * Math.pow(RULES.endlessGrowth.v, n - LAST_WAVE);
  const blocks = Math.max(4, Math.round(target / seqHealth(ENDLESS_BLOCK)));
  const seq = ENDLESS_BLOCK.repeat(blocks) + 'P';
  const composition: Record<string, number> = {};
  for (const c of seq) composition[c] = (composition[c] ?? 0) + 1;
  const spacing = Math.max(0.25, last.spacing * Math.pow(0.97, n - LAST_WAVE));
  return { n, seq, spacing, composition, note: `Endless: wave ${n}.`, why: { n: '§5.3 endless', spacing: '§5.3 endless: 3% tighter a wave, never under 0.25 s' } };
}

/** wave n, with the map's own sequence for it where it has one (§11) */
export function waveDef(n: number, map?: MapDef): WaveDef | undefined {
  if (n < 1) return undefined;
  const base = n <= LAST_WAVE ? WAVES[n - 1] : endlessWave(n);
  const seq = map?.waves?.[n];
  if (!seq) return base;
  const composition: Record<string, number> = {};
  for (const c of seq) composition[c] = (composition[c] ?? 0) + 1;
  return { ...base, seq, composition };
}
