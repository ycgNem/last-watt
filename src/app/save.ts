// The player's profile in localStorage: tutorial done, best results, mute. Versioned with ordered
// migrations (CLAUDE.md: saves from the first milestone). Runs themselves are not saved yet; a
// run is about 15 minutes. Every read and write survives a blocked or missing localStorage.

export const SAVE_VERSION = 4;
const KEY = 'lastwatt.profile';

export interface Profile {
  v: number;
  tutorialDone: boolean;
  /** enemy kinds the player has met (their intel card shows the first time in any run) */
  met: string[];
  /** the best run on any map (maps unlock on its wave) */
  best: Best;
  /** the best run on each map, by map id */
  maps: Record<string, Best>;
  /** the map picked last on the title screen */
  map: string;
  /** embers not yet spent, and the skills learned with them (§9) */
  embers: number;
  skills: string[];
  settings: Settings;
  runs: number;
  muted: boolean;
}

export interface Best { wave: number; won: boolean; lights: number; endless: number }

/** volume 0..1; UI scale 0 = fit the window, else that many screen pixels a UI pixel; flashes on/off */
export interface Settings { volume: number; uiScale: number; flashes: boolean }

export function defaultSettings(): Settings {
  return { volume: 0.5, uiScale: 0, flashes: true };
}

export function noBest(): Best {
  return { wave: 0, won: false, lights: 0, endless: 0 };
}

export function defaultProfile(): Profile {
  return { v: SAVE_VERSION, tutorialDone: false, met: [], best: noBest(), maps: {}, map: 'station', embers: 0, skills: [], settings: defaultSettings(), runs: 0, muted: false };
}

/** migrations[i] turns a version-i profile into version i + 1 */
const MIGRATIONS: ((d: any) => any)[] = [
  // 0 → 1: the first versioned profile; anything older is dropped onto the defaults
  (d) => ({ ...defaultProfile(), ...(typeof d === 'object' && d ? d : {}), v: 1 }),
  // 1 → 2: maps (Milestone 7); every run so far was on the station
  (d) => ({ ...d, v: 2, maps: d.best?.wave > 0 ? { station: { ...noBest(), ...d.best } } : {}, map: 'station' }),
  // 2 → 3: embers and the skill tree (Milestone 8); nothing earned before it
  (d) => ({ ...d, v: 3, embers: 0, skills: [] }),
  // 3 → 4: settings (Milestone 10)
  (d) => ({ ...d, v: 4, settings: defaultSettings() }),
];

export function migrate(d: any): Profile {
  let v = typeof d?.v === 'number' ? d.v : 0;
  let out = d;
  while (v < SAVE_VERSION) {
    out = MIGRATIONS[v](out);
    v++;
  }
  return { ...defaultProfile(), ...out, best: { ...noBest(), ...(out?.best ?? {}) }, maps: { ...(out?.maps ?? {}) }, skills: [...(out?.skills ?? [])], settings: { ...defaultSettings(), ...(out?.settings ?? {}) } };
}

export function loadProfile(): Profile {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : defaultProfile();
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p: Profile) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // private window or blocked storage: the game still plays
  }
}
