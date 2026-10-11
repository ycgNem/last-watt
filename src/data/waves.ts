// The slice's eight waves (DESIGN.md §5, spacing derived in §6). A sequence is one letter per
// spawn (ENEMY_BY_CODE); tests/data.test.ts checks each against the composition in §5.

export interface WaveDef {
  n: number;
  seq: string;
  spacing: number;
  /** the composition §5 promises, checked against seq */
  composition: Record<string, number>;
  /** a one-line warning shown when the wave starts, if it brings something new */
  note?: string;
  why: Record<string, string>;
}

export const WAVES: WaveDef[] = [
  { n: 1, seq: 'MMMMMMMM', spacing: 2.25, composition: { M: 8 }, note: 'Moths. They walk toward the light.',
    why: { n: '§5 wave table', spacing: '§6 wave 1: 2.25 s (sim; placement lesson holds 2.0–2.4 s)' } },
  { n: 2, seq: 'MMMMMMMMMMMM', spacing: 1.9, composition: { M: 12 },
    why: { n: '§5 wave table', spacing: '§6 bot-tuned: 1.9 s (the reference sim gave 1.75)' } },
  { n: 3, seq: 'MMMSMMMMSMMM', spacing: 3.0, composition: { M: 10, S: 2 }, note: 'Shades: they knock out Nodes right beside the path.',
    why: { n: '§5 wave table', spacing: '§6 bot-tuned: 3.0 s, the first Shades (the rule gave 1.75)' } },
  { n: 4, seq: 'MMMSMMMSMMMSMMMSMMM', spacing: 2.3, composition: { M: 15, S: 4 },
    why: { n: '§5 wave table', spacing: '§6 bot-tuned: 2.3 s (the rule gave 1.5)' } },
  { n: 5, seq: 'MMMMMPMMMMM', spacing: 1.5, composition: { M: 10, P: 1 }, note: 'A Pall: 400 kJ of dark. Floodlights and Overcharge.',
    why: { n: '§5 wave table', spacing: '§6 bot-tuned: 1.5 s (the rule gave 1.75)' } },
  { n: 6, seq: 'MMMMSMMMMSMMMMSMMMMSMMMM', spacing: 1.0, composition: { M: 20, S: 4 },
    why: { n: '§5 wave table', spacing: '§6 bot-tuned after the first review: 1.0 s (the rule gave 1.0)' } },
  { n: 7, seq: 'MMSMMSMMSPMMSMMSMMSPMMSMMSMMS', spacing: 0.5, composition: { M: 18, S: 9, P: 2 },
    why: { n: '§5 wave table (×1.65 kJ after the first review, §6)', spacing: '§6 bot-tuned after the first review: 0.5 s; at 0.35 s a Pall gets through' } },
  { n: 8, seq: 'MMMSMMMSMMMSPMMMSMMMSMMMSPMMMSMMMSMMMSPMMM', spacing: 0.4, composition: { M: 30, S: 9, P: 3 }, note: 'The last wave. Three Palls.',
    why: { n: '§5 wave table (×1.5 kJ after the first review, §6)', spacing: '§6 bot-tuned after the first review: 0.4 s; at 0.3 s the bot loses' } },
];
