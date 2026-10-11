// The settings panel (ROADMAP Milestone 10), shared by the title and the game: volume, UI scale,
// screen flashes (off for anyone they bother), mute. Changes apply at once and are saved with the
// profile.
import { C } from '../data/palette';
import type { UI } from '../ui/ui';
import type { Profile, Settings } from './save';

/** draws the panel; returns false once it is closed */
export function drawSettings(ui: UI, p: Profile, muted: boolean, changed: (s: Settings, mute?: boolean) => void): boolean {
  const s = p.settings;
  const w = 220, h = 98;
  const x = Math.round(ui.w / 2 - w / 2), y = Math.round(ui.h / 2 - h / 2);
  ui.layer = 7;
  ui.panel(x, y, w, h, { border: C.gold, alpha: 0.97 });
  ui.text('SETTINGS', x + 6, y + 5, C.gold);
  let open = true;
  if (ui.button('x', x + w - 13, y + 3, 10, 10)) open = false;
  let ry = y + 22;
  // volume, in tenths
  ui.text('Volume', x + 8, ry + 3, C.mist);
  if (ui.button('-', x + 100, ry, 16, 13, { disabled: s.volume <= 0 })) changed({ ...s, volume: Math.max(0, Math.round((s.volume - 0.1) * 10) / 10) });
  ui.textC(`${Math.round(s.volume * 100)}%`, x + 140, ry + 3, C.gold);
  if (ui.button('+', x + 164, ry, 16, 13, { disabled: s.volume >= 1 })) changed({ ...s, volume: Math.min(1, Math.round((s.volume + 0.1) * 10) / 10) });
  if (ui.button(muted ? 'MUTED' : 'MUTE', x + 184, ry, 30, 13, { active: muted, tip: ['Mute (M)'] })) changed(s, !muted);
  ry += 20;
  // UI scale
  ui.text('UI scale', x + 8, ry + 3, C.mist);
  (['AUTO', '1', '2', '3'] as const).forEach((label, i) => {
    if (ui.button(label, x + 100 + i * 29, ry, i === 0 ? 30 : 25, 13, { active: s.uiScale === i, tip: ['UI scale', i === 0 ? 'Fit the window (the default).' : `Every UI pixel is ${i} screen pixels (capped to what fits the window).`] }))
      changed({ ...s, uiScale: i });
  });
  ry += 20;
  // screen flashes
  ui.text('Screen flashes', x + 8, ry + 3, C.mist);
  if (ui.button(s.flashes ? 'ON' : 'OFF', x + 100, ry, 40, 13, { active: s.flashes, tip: ['Screen flashes', 'The white flash of an Overcharge or a Pulse and the red edge when lights are lost. Turn them off if they bother you; nothing else changes.'] }))
    changed({ ...s, flashes: !s.flashes });
  if (ui.button('DONE (O)', x + w - 76, y + h - 18, 70, 13, { color: C.gold })) open = false;
  return open;
}
