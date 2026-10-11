// Apollo (AdamCYounis, 46 colours): the provisional palette (DECISIONS.md 2026-10-11).
// Named entries are the ones code uses; the art itself is snapped to the full list.

export const C = {
  ink: '#090a14', soot: '#10141f', night: '#151d28', slate: '#202e37', iron: '#394a50', steel: '#577277',
  ash: '#819796', fog: '#a8b5b2', mist: '#c7cfcc', bone: '#ebede9',
  dim: '#1e1d39', plum: '#402751', violet: '#7a367b',
  deep: '#172038', navy: '#253a5e', blue: '#3c5e8b', sky: '#4f8fba', cyan: '#73bed3', ice: '#a4dddb',
  rust: '#602c2c', copper: '#884b2b', brass: '#be772b', amber: '#de9e41', gold: '#e8c170',
  wine: '#752438', red: '#a53030', ember: '#cf573c', orange: '#da863e',
  moss: '#19332d', leaf: '#25562e', green: '#468232', lime: '#75a743',
  brick: '#4d2b32', clay: '#7a4841', tan: '#ad7757',
} as const;

export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
