// The Lines view (ROADMAP Milestone 3): each network named, with the one thing holding it back.
import { describe, expect, it } from 'vitest';
import { Game, park, put, factory, settle } from './helpers';
import { lineReports } from '../src/sim/lines';

describe('lines view', () => {
  it('names the Hearth line first and finds the tempting mistake: a starved wall', () => {
    const g = new Game();
    put(g, 'node', 23, 10);
    put(g, 'lamp', 24, 7); put(g, 'lamp', 24, 13); put(g, 'lamp', 22, 7); put(g, 'lamp', 22, 16);
    park(g, 'moth', 28.5); park(g, 'moth', 35); park(g, 'moth', 22); park(g, 'moth', 40);
    settle(g, 0.2);
    const [h] = lineReports(g);
    expect(h.name).toBe('Hearth line');
    expect(h.neck).toBe('short');
    expect(h.text).toContain('17%');
  });

  it('wave 1 layout A between waves: spare power at rest, but full fire wants more than it makes', () => {
    const g = new Game();
    factory(g);
    put(g, 'node', 23, 10);
    put(g, 'lamp', 24, 7); put(g, 'lamp', 24, 13);
    settle(g, 0.2);
    const [h] = lineReports(g);
    // 28 kW in, two Lamps at 12 kW firing plus the Extractor's draw
    expect(h.made).toBe(28);
    expect(h.peak).toBeGreaterThan(24);
    expect(['waste', 'ok']).toContain(h.neck);
  });

  it('full fire beyond supply is not called short while the wall held above 75% this wave (the fourth review)', () => {
    const g = new Game();
    factory(g);
    put(g, 'node', 23, 10);
    put(g, 'lamp', 24, 7); put(g, 'lamp', 24, 13); put(g, 'lamp', 22, 7);
    settle(g, 0.5);
    const [h] = lineReports(g);
    // 28 kW in; three Lamps at full fire would ask 36 + 2, but nothing has fired yet
    expect(h.peak).toBeGreaterThan(h.made);
    expect(['short', 'peak']).not.toContain(h.neck);
  });

  it('a Burner on its own line with no Extractor is a fuel problem, not a mystery', () => {
    const g = new Game();
    put(g, 'node', 6, 18);
    put(g, 'burner', 7, 20);
    put(g, 'lamp', 4, 15);
    settle(g, 0.2);
    const far = lineReports(g).find((l) => l.name === 'Line A');
    expect(far?.neck).toBe('fuel');
    expect(far?.text).toBe('1 Burner has no rock');
  });
});
