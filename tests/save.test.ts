// The profile's migrations (CLAUDE.md: versioned saves with ordered migrations).
import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, defaultProfile, migrate } from '../src/app/save';

describe('profile migrations', () => {
  it('a missing or broken profile becomes the defaults', () => {
    expect(migrate(null)).toEqual(defaultProfile());
    expect(migrate('nonsense').v).toBe(SAVE_VERSION);
  });

  it('a version-1 profile keeps its best as the station best and picks the station', () => {
    const v1 = { v: 1, tutorialDone: true, met: ['moth', 'shade'], best: { wave: 12, won: true, lights: 14, endless: 15 }, runs: 6, muted: true };
    const p = migrate(v1);
    expect(p.v).toBe(SAVE_VERSION);
    expect(p.tutorialDone).toBe(true);
    expect(p.met).toEqual(['moth', 'shade']);
    expect(p.best).toEqual(v1.best);
    expect(p.maps.station).toEqual(v1.best);
    expect(p.map).toBe('station');
    expect(p.runs).toBe(6);
    expect(p.muted).toBe(true);
  });

  it('a current profile passes through unchanged', () => {
    const p = { ...defaultProfile(), maps: { switchback: { wave: 7, won: false, lights: 0, endless: 0 } }, map: 'switchback' };
    expect(migrate(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});
