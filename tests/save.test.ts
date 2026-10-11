// The profile's migrations (CLAUDE.md: versioned saves with ordered migrations).
import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, defaultProfile, defaultSettings, migrate } from '../src/app/save';

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
    expect(p.settings).toEqual(defaultSettings());
  });

  it('a version-3 profile keeps its embers and skills and gains the default settings', () => {
    const v3 = { v: 3, tutorialDone: true, met: [], best: { wave: 3, won: false, lights: 0, endless: 0 }, maps: {}, map: 'station', embers: 7, skills: ['spareJar'], runs: 2, muted: false };
    const p = migrate(v3);
    expect(p.v).toBe(SAVE_VERSION);
    expect(p.embers).toBe(7);
    expect(p.skills).toEqual(['spareJar']);
    expect(p.settings).toEqual(defaultSettings());
  });

  it('chosen settings survive a round trip', () => {
    const p = { ...defaultProfile(), settings: { volume: 0.2, uiScale: 3, flashes: false } };
    expect(migrate(JSON.parse(JSON.stringify(p))).settings).toEqual({ volume: 0.2, uiScale: 3, flashes: false });
  });

  it('a current profile passes through unchanged', () => {
    const p = { ...defaultProfile(), maps: { switchback: { wave: 7, won: false, lights: 0, endless: 0 } }, map: 'switchback' };
    expect(migrate(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});
