"""Last Watt enemy: Shade. 20x20, 4 frames x 2 rows, fps 6 (see pixel-art/README.md).

A drifting hooded smoke-wraith that sneaks along the grid and snuffs power poles: a hunched
hood leaning forward (facing right; the game flips it), a dark hood opening with two narrow
cold eyes, one hooked smoke-claw reaching ahead, and a ragged tail of smoke trailing behind.
No horns, no mask, no wavy sheet hem: it is a lean, a reach and a trail.
Motion: 4-frame drift: the hood bobs 1 px, the claw and tail follow one frame late, the
tail waves side to side.
Row 0 = lit (Dim purples + a sparse warm rim on the upper-left of the hood).
Row 1 = silhouette (near-black body, #1e1d39 inner edge, only the eyes glow).
Run: python3 build.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

HERE = Path(__file__).resolve().parent
W = H = 20
EYE = "#a4dddb"
LIGHT, MID, DARK, VOID = "#7a367b", "#402751", "#1e1d39", "#090a14"

BOB = [0, -1, -1, 0]          # hood
LAG = [0, 0, -1, -1]          # claw + tail upper (follows one frame late)
WAVE = [0, 1, 0, -1]          # tail side-to-side phase


def disc(m, cx, cy, r, ch="b"):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.3:
                m[(x, y)] = ch


def ell(m, x0, y0, x1, y1, ch="b"):
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = (x1 - x0) / 2 + 0.4, (y1 - y0) / 2 + 0.4
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                m[(x, y)] = ch


def strand(m, x0, y0, length, drift, phase, f, width=2):
    """A smoke strand hanging from the hem: drifts sideways, waves with the frame."""
    for k in range(length):
        t = k / max(1, length - 1)
        x = x0 + drift * t + round(math.sin(2 * math.pi * (f / 4 + phase)) * t * 1.4)
        y = y0 + k
        m[(round(x), y)] = "t"
        if width > 1 and t < 0.55:
            m[(round(x) + 1, y)] = "t"


def shape(f):
    """Pixel map {(x, y): part} for frame f. parts: h hood, b body, t tail, c claw,
    v hood opening, e eye."""
    hb, lg = BOB[f], LAG[f]
    m = {}
    # ragged tail: three strands of different length, each waving on its own phase
    strand(m, 5, 13 + lg, 6, -3, 0.00, f)
    strand(m, 8, 14 + lg, 5, -1, 0.30, f)
    strand(m, 11, 14 + lg, 3, 0, 0.60, f, width=1)
    # body / cloak under the hood
    ell(m, 5, 9 + hb, 13, 14 + lg, "b")
    # hood: a dome leaning forward (right), its cowl streaming back to a point up-left
    ell(m, 4, 3 + hb, 14, 11 + hb, "h")
    for x, y in [(2, 2), (3, 2), (3, 3), (4, 3), (5, 3), (4, 4), (3, 4), (5, 4), (6, 3)]:
        m[(x, y + hb)] = "h"
    # claw: a hooked wisp reaching ahead from under the hood (two fingers)
    for x, y in [(14, 11), (15, 11), (16, 10), (17, 10), (18, 11), (18, 12), (16, 12), (17, 13)]:
        m[(x, y + lg)] = "c"
    # hood opening (front-right) and the eyes, narrowed
    ell(m, 9, 6 + hb, 14, 10 + hb, "v")
    for x, y in [(10, 8), (11, 8), (13, 8)]:
        m[(x, y + hb)] = "e"
    return m


def ray(m, x, y, dx, dy):
    n = 0
    while (x + dx * (n + 1), y + dy * (n + 1)) in m:
        n += 1
    return n


def lit_color(m, x, y):
    part = m[(x, y)]
    if part == "e":
        return EYE
    if part == "v":
        return VOID
    ul, dr = ray(m, x, y, -1, -1), ray(m, x, y, 1, 1)
    up = (x, y - 1) not in m
    if part == "t":
        return DARK
    if part == "c":
        return MID if (up or (x - 1, y) not in m) else DARK
    if (ul == 0 or up) and part == "h":
        return LIGHT
    if ul <= 1 and part == "h" and y < 6:
        return LIGHT
    if dr <= 1:
        return DARK
    return MID


s = Sprite(W, H, palette=PAL)
first = True
for row in ("lit", "dark"):
    for f in range(4):
        if not first:
            s.add_frame(copy=False)
        first = False
        m = shape(f)
        edge = {p for p in m if any((p[0] + dx, p[1] + dy) not in m
                                     for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
        for (x, y), part in m.items():
            if row == "lit":
                c = lit_color(m, x, y)
            else:
                c = EYE if part == "e" else (VOID if part == "v" else "#151d28")
                if (x, y) in edge and part not in "ev":
                    c = DARK
            s.px(x, y, c)
        s.outline(OUTLINE, where="outside")
        if row == "lit":
            hb = BOB[f]
            s.px(6, 3 + hb, "#e8c170")
            for x, y in [(7, 2), (5, 4), (4, 5)]:
                s.px(x, y + hb, "#de9e41")
s.set_duration(167, frames="all")

export(s, "shade", fps=6, rows=2)


def dark_preview(sprite, path, cols, bg="#151d28", scale=8):
    """Both rows over the darkness colour at 8x, plus 1x/2x/3x strips (how the game sees it)."""
    n = sprite.n_frames
    rows = n // cols
    w, h = sprite.w, sprite.h
    big = Image.new("RGBA", (cols * w * scale + (cols + 1) * 4, rows * h * scale + (rows + 1) * 4),
                    hex2rgba(bg))
    for i in range(n):
        r, c = divmod(i, cols)
        im = sprite.composite(i + 1).resize((w * scale, h * scale), Image.NEAREST)
        big.alpha_composite(im, (4 + c * (w * scale + 4), 4 + r * (h * scale + 4)))
    small = Image.new("RGBA", (n * w * 6 + 8 * 3, h * 3 + 4), hex2rgba(bg))
    x = 2
    for sc in (1, 2, 3):
        for i in range(n):
            im = sprite.composite(i + 1).resize((w * sc, h * sc), Image.NEAREST)
            small.alpha_composite(im, (x, 2))
            x += w * sc + 2
        x += 6
    out = Image.new("RGB", (max(big.width, small.width), big.height + small.height), hex2rgba(bg)[:3])
    out.paste(big.convert("RGB"), (0, 0))
    out.paste(small.convert("RGB"), (0, big.height))
    out.save(path)
    print("preview ->", path)


dark_preview(s, HERE / "preview_dark.png", cols=4)
s.stats()
