# Last Watt — Style decisions

The `art-director` agent owns this file and expands it (PixelLab settings per asset type,
animation frame counts, material ramps) in Milestone 0. These are the owner's decisions it
builds on. Change them on purpose, with a note here, never by drift.

## The look in one paragraph

A dark world and warm light. Deep cool darkness (blue-plum, never pure black) with every lit
thing throwing warm amber light that falls off visibly. Chunky silhouettes, dark outline, color
and brightness doing the talking. Towers are lights and works: glass, brass, iron, soot, ember.
Enemies are things of the Dim: desaturated, soft-edged, read by silhouette and by how they
catch light. Not clockwork-cozy (that is Sprocket & Sprout); this is quieter, moodier and
sharper. **The screen is the power meter.**

## Grid and sizes (decided)

| Thing | Size (px) | Notes |
|---|---|---|
| Tile | 16 × 16 | Camera at integer zoom, 3× default. Same pipeline as S&S. |
| Tower footprint | 2 × 2 tiles (32 × 32 art, height free up to 48) | Big enough for tiers to read as different silhouettes, not just recolors. |
| Node, extractor, jar | 1 × 1 or 1 × 2 | Nodes must read at a glance: a post with a light on top. |
| Hearth | 4 × 4 | The brightest thing on the map, always. |
| Enemy | 12–16 px (Moth), 16–20 (Shade), 24–32 (Pall) | Silhouette first; each class a distinct shape *and* a distinct motion. |
| Item icon | 16 × 16 | Same rules as before: 14 × 14 inside with 1 px margin. |
| Light radius | drawn in the darkness buffer | Not a sprite. Radius and warmth scale with satisfaction. |

Integer pixel grid, whole-factor scaling only, no rotation of pixel art.

## Palette (decide in Milestone 0 with a 6-sprite test)

**2026-10-11: Apollo, the owner's pick.** Chosen provisionally so art could start, then
confirmed by the owner after playing the slice the same day (`DECISIONS.md`). It is a named
palette in pixel-art-studio and `PAL` in `pixel-art/common.py`, so code-drawn sprites are
palette-locked from the first pixel. Material ramps are in `pixel-art/README.md` (the art
contract). Endesga 64 stays in `references/palettes/` but is no longer a candidate.

Not Resurrect 64, so the two games don't read as one. Candidates, each tested with a Lamp, an
Floodlight, a Moth, a Shade, a Hearth and a ground tile under the darkness buffer:

- **Apollo** (AdamCYounis, 46): deep, slightly desaturated darks and a good warm ramp. Lean.
- **Endesga 64**: broad range, strong blues and ambers, room for status tints.

Pick the one where a starved tower and a powered tower are distinguishable at 1× in a thumbnail.
Write the index table here, then material ramps: glass (warm highlights), brass, iron, soot,
ember, the Dim (cool desaturated purples), ground (dark olive and slate, warmed near light).

## Readability rules (these are gameplay, not decoration)

As built in the slice (`src/render/renderer.ts`): towers' light radius = range × satisfaction
with stepped bands, so the light's edge is the range at full power; starved buildings also
*stutter* between the starved and dark tints (on for about 0.25 + 0.7 × satisfaction of the
time), because the tint alone washed out inside the Hearth's light; starved beams turn purple
and broken.

1. **Powered** = sprite at full brightness + light hole in the darkness buffer + a 2-frame
   glow flicker. **Starved** (satisfaction < 0.6) = sprite tinted toward the Dim, light radius
   shrunk proportionally, flicker slows. **Dark** (off network or shed) = no light hole, sprite
   nearly ground-dark with one cold pixel so it can still be found.
2. A **cut line** goes dark along its whole length within one frame. No fade — the player must
   see the exact extent of the outage.
3. **Jar charge** is visible on the sprite in 4 steps (dark → ember → amber → white-hot).
4. **Overcharge** is unmistakable: the tower's light hole blows out to white for the duration.
5. Enemies **catch light**: in a light radius they get a rim highlight; outside it they are
   silhouettes. This is how the player sees range without range circles.
6. The HUD shows supply / demand / wasted in kW and a satisfaction bar per tier, always visible,
   bitmap font, top edge. Nothing else is permanent chrome.

## Art sources (decided 2026-10-11)

| Source | Used for | Costs |
|---|---|---|
| **pixel-art-studio** (project skill: Claude draws every pixel in a Python build script) | Placeholders, the slice's first art, UI bits, quick variants, and any time we're saving budget | no PixelLab generations; context for each preview pass |
| **PixelLab** | Final art: anything we're locking in, including the palette test (the palette is a final-look call) and the slice's placeholder-to-real pass | generations (resets on the 9th) |

A code-drawn sprite is replaced by PixelLab art when its design is settled, not before: no
PixelLab art for a building whose numbers or role are still moving. Both sources get the same
treatment: snapped to the palette, put through the powered / starved / dark contact sheet, and
imported through the same pipeline. Code-drawn art keeps its `build.py` beside its outputs in
`pixel-art/<slug>/` so it can be redrawn when the palette or the readability rules change.

## PixelLab notes for the art director

Generate at 32 for towers and 16 for props and icons; characters-style generation for enemies
with 4 directions where motion needs it (Moth: 2-frame flutter; Shade: 4-frame drift; Pall: 4-frame
walk). Snap to the chosen palette with `reduce_colors`, then check every sprite against rule 1
by rendering it three times (powered / starved / dark) in a contact sheet before importing.
Never copy a reference sprite; references are for mood, not for shapes.
