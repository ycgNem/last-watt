// The research queue (Milestone 5): the Labs move on by themselves to the next queued project.
import { describe, expect, it } from 'vitest';
import { Game, factory, put, settle } from './helpers';
import { run } from '../src/sim/commands';
import { replay } from '../src/sim/commands';

describe('research queue (§7, Milestone 5)', () => {
  it('a queued project starts by itself when the one ahead is done', () => {
    const g = new Game();
    factory(g);
    put(g, 'lab', 19, 18);
    g.research.progress.brazier = g.researchCost('brazier') - 1;
    expect(run(g, { k: 'research', id: 'brazier' })).toBeNull();
    expect(run(g, { k: 'queue', id: 'starshell' })).toBeNull();
    expect(g.research.queue).toEqual(['starshell']);
    settle(g, 1);
    expect(g.research.done.has('brazier')).toBe(true);
    expect(g.research.active).toBe('starshell');
    expect(g.research.queue).toEqual([]);
  });

  it('a project can queue behind the one it needs, and taking that out takes it too', () => {
    const g = new Game();
    expect(run(g, { k: 'queue', id: 'lamp3' })).toMatch(/Needs/);
    run(g, { k: 'research', id: 'lamp2' });
    expect(run(g, { k: 'queue', id: 'lamp3' })).toBeNull();
    expect(run(g, { k: 'queue', id: 'brazier' })).toBeNull();
    expect(g.research.queue).toEqual(['lamp3', 'brazier']);
    // starting a queued project by hand takes it out of the queue
    run(g, { k: 'research', id: 'brazier' });
    expect(g.research.queue).toEqual(['lamp3']);
    run(g, { k: 'queue', id: 'lamp3' });
    expect(g.research.queue).toEqual([]);
  });

  it('with nothing running, queueing starts it', () => {
    const g = new Game();
    run(g, { k: 'queue', id: 'vane' });
    expect(g.research.active).toBe('vane');
  });

  it('a run with a queue replays the same', () => {
    const g = new Game();
    run(g, { k: 'place', id: 'extractor', x: 16, y: 19 });
    run(g, { k: 'place', id: 'burner', x: 16, y: 20 });
    run(g, { k: 'place', id: 'lab', x: 19, y: 18 });
    run(g, { k: 'research', id: 'brazier' });
    run(g, { k: 'queue', id: 'starshell' });
    settle(g, 60);
    const h = new Game();
    expect(replay(h, g.log, g.tick)).toBeNull();
    expect([h.research.active, [...h.research.done]]).toEqual([g.research.active, [...g.research.done]]);
  });
});
