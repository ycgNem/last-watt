# Last Watt art contract

Every sprite in the game is drawn in code with the `pixel-art-studio` skill
(`.claude/skills/pixel-art-studio/`). Each sprite has `pixel-art/<slug>/build.py` (the source of
truth; never hand-edit its PNGs). Running it writes:

- `src/assets/art/<slug>.png`: the 1× master, a strip of frames left to right (and rows top to
  bottom where noted), transparent background;
- `src/assets/art/<slug>.json`: the sidecar the game loads (format below);
- previews in `pixel-art/<slug>/` (zoomed, for looking at).

`python3 pixel-art/build_all.py` reruns every build script and then the contact sheet.

## Palette

**Apollo** (AdamCYounis, 46 colors), the owner's pick, confirmed 2026-10-11 (see `DECISIONS.md`).
`Sprite(..., palette="apollo")` snaps every color. Hex list: `references/palettes/apollo.hex`.

| Material | Ramp (dark → light) |
|---|---|
| Outline / soot | `#10141f` (outline), `#151d28`, `#202e37` |
| Iron | `#202e37` `#394a50` `#577277` `#819796` `#a8b5b2` |
| Brass | `#602c2c` `#884b2b` `#be772b` `#de9e41` `#e8c170` |
| Ember / warm glass | `#752438` `#a53030` `#cf573c` `#da863e` `#de9e41` `#e8c170` `#ebede9` (white-hot) |
| Brick / stone | `#341c27` `#4d2b32` `#7a4841` `#ad7757` |
| Cool glass (Lab only) | `#253a5e` `#3c5e8b` `#4f8fba` `#73bed3` `#a4dddb` |
| The Dim (enemies) | `#090a14` `#1e1d39` `#402751` `#7a367b` `#577277` `#819796` `#c7cfcc` (pale) |
| Ground | `#151d28` `#19332d` `#202e37` `#25562e` `#394a50` |
| Path (ash) | `#394a50` `#577277` `#4d2b32` `#7a4841` |
| Emberrock | `#241527` `#341c27` `#602c2c` + glints `#cf573c` `#da863e` |

Outline: 1 px `#10141f`, selective (lighter on the lit side is fine). Light from the upper
left. View: top-down 3/4 (see the top and the front face). Never pure black.

## Sidecar JSON

```json
{ "w": 32, "h": 48, "frames": 2, "rows": 1, "fps": 4,
  "light": [16, 9],
  "names": ["optional", "frame", "names"] }
```

`w`/`h` = one frame. `light` = the frame-space pixel at the centre of the glowing glass: beams
start there, the light hole is centred there, and a dark building shows one cold pixel there.

## Placement

A building's sprite bottom edge sits on its footprint's bottom edge, centred horizontally.
A 2×2 tower is 32 wide: its base fills the bottom 32×32 of the canvas, the top 16 px is height.

## The sprite list

| Slug | Frame | Frames × rows | Footprint | What it is |
|---|---|---|---|---|
| `hearth` | 64×80 | 2 × 1 | 4×4 | the station core |
| `lamp` | 32×48 | 2 × 1 | 2×2 | tier-1 Lamp |
| `lamp2` | 32×48 | 2 × 1 | 2×2 | tier-2 Lamp (new silhouette, not a recolor) |
| `floodlight` | 32×48 | 2 × 1 | 2×2 | wide floodlight |
| `beacon` | 32×48 | 2 × 1 | 2×2 | warning mast, slows |
| `node` | 16×32 | 2 × 1 | 1×1 | a post with a light on top |
| `extractor` | 16×24 | 2 × 1 | 1×1 | hammer rig on emberrock |
| `burner` | 32×40 | 2 × 1 | 2×2 | furnace with a glowing mouth |
| `jar` | 16×24 | 4 × 1 | 1×1 | battery; frames = charge: dark / ember / amber / white-hot |
| `lab` | 32×48 | 2 × 1 | 2×2 | research workshop, cool glass |
| `moth` | 16×16 | 2 × 2 | — | row 0 lit, row 1 silhouette (dark body, pale eyes) |
| `shade` | 20×20 | 4 × 2 | — | row 0 lit, row 1 silhouette |
| `pall` | 32×32 | 4 × 2 | — | row 0 lit, row 1 silhouette |
| `tiles` | 16×16 | 10 × 1 | — | ground ×4, path ×2, emberrock ×2, decor ×2 (decor transparent) |
| `icons` | 16×16 | 15 × 1 | — | lamp, floodlight, beacon, node, extractor, burner, jar, lab, kw, money, light, rock, research, overcharge, shed |

## Readability states (STYLE.md rule 1), as the game draws them

The game makes these from the 1× art at load time; the contact sheet (`pixel-art/contact/`)
previews them with the same maths:

- **powered**: the sprite as drawn.
- **starved**: every opaque pixel `mix(rgb, #402751, 0.45) × 0.8`.
- **dark**: every opaque pixel `mix(rgb, #151d28, 0.82)`, plus one `#73bed3` pixel at `light`.

A sprite passes when the three are tellable apart at 1× in a thumbnail.
