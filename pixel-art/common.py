"""Shared helpers for Last Watt build scripts (see pixel-art/README.md, the art contract).

    import sys; from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from common import *          # Sprite, ramp, mix, palette names, export()
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".claude/skills/pixel-art-studio/scripts"))
from pixelstudio import Sprite, PALETTES, ramp, mix, hex2rgba  # noqa: E402,F401
from PIL import Image  # noqa: E402

ART_OUT = ROOT / "src/assets/art"
PAL = "apollo"

# material ramps (dark -> light), all inside Apollo
OUTLINE = "#10141f"
SOOT = ["#10141f", "#151d28", "#202e37"]
IRON = ["#202e37", "#394a50", "#577277", "#819796", "#a8b5b2"]
BRASS = ["#602c2c", "#884b2b", "#be772b", "#de9e41", "#e8c170"]
EMBER = ["#752438", "#a53030", "#cf573c", "#da863e", "#de9e41", "#e8c170", "#ebede9"]
STONE = ["#341c27", "#4d2b32", "#7a4841", "#ad7757"]
COOL = ["#253a5e", "#3c5e8b", "#4f8fba", "#73bed3", "#a4dddb"]
DIM = ["#090a14", "#1e1d39", "#402751", "#7a367b", "#577277", "#819796", "#c7cfcc"]
GROUND = ["#151d28", "#19332d", "#202e37", "#25562e", "#394a50"]
ASH = ["#394a50", "#577277", "#4d2b32", "#7a4841"]
ROCK = ["#241527", "#341c27", "#602c2c", "#cf573c", "#da863e"]
WHITE_HOT = "#ebede9"


def export(sprite, slug, light=None, fps=4, rows=1, names=None, preview_scale=8, extra=None):
    """Write src/assets/art/<slug>.png (frames left to right; with rows>1 the frames are split
    evenly into that many rows, row-major) + <slug>.json, and a zoomed preview in
    pixel-art/<slug>/preview.png. Returns the sheet path."""
    n = sprite.n_frames
    assert n % rows == 0, "frames must divide evenly into rows"
    cols = n // rows
    sheet = Image.new("RGBA", (cols * sprite.w, rows * sprite.h), (0, 0, 0, 0))
    for i in range(n):
        r, c = divmod(i, cols)
        sheet.alpha_composite(sprite.composite(i + 1), (c * sprite.w, r * sprite.h))
    ART_OUT.mkdir(parents=True, exist_ok=True)
    png = ART_OUT / f"{slug}.png"
    sheet.save(png)
    meta = {"w": sprite.w, "h": sprite.h, "frames": cols, "rows": rows, "fps": fps}
    if light is not None:
        meta["light"] = list(light)
    if names:
        meta["names"] = list(names)
    if extra:
        meta.update(extra)
    (ART_OUT / f"{slug}.json").write_text(json.dumps(meta, indent=1))
    here = ROOT / "pixel-art" / slug
    here.mkdir(parents=True, exist_ok=True)
    sprite.preview(str(here / "preview.png"), scale=preview_scale, cols=cols)
    print(f"export -> {png} {meta}")
    return png


def tint_states(im, light=None):
    """powered / starved / dark versions of an RGBA image, with the maths in README.md."""
    def remap(fn):
        out = im.copy()
        px = out.load()
        for y in range(out.height):
            for x in range(out.width):
                r, g, b, a = px[x, y]
                if a:
                    px[x, y] = fn(r, g, b) + (a,)
        return out

    def starved(r, g, b):
        tr, tg, tb = 0x40, 0x27, 0x51
        return tuple(round((c + (t - c) * 0.45) * 0.8) for c, t in ((r, tr), (g, tg), (b, tb)))

    def dark(r, g, b):
        tr, tg, tb = 0x15, 0x1D, 0x28
        return tuple(round(c + (t - c) * 0.82) for c, t in ((r, tr), (g, tg), (b, tb)))

    d = remap(dark)
    if light is not None:
        d.putpixel((int(light[0]), int(light[1])), (0x73, 0xBE, 0xD3, 255))
    return im, remap(starved), d
