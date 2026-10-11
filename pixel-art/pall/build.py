"""Last Watt enemy: Pall. 32x32, 4 frames x 2 rows, fps 4 (see pixel-art/README.md).

The big slow one: a hunched, shaggy mass of soot-dark fur/cloak, heavy hump at the back,
head sunk low at the front (facing right; the game flips it) with two small dim eyes under a
heavy brow, a ragged hem with a faint lighter fringe, two stumpy feet. No mask, no face plate.
It drinks light: in the dark row its body is darker than the darkness (#090a14), a hole.
Motion: 4-frame lumbering walk: the mass sways 1 px side to side, bobs 1 px on the passing
frames, the hem teeth swing, the feet alternate under the hem.
Row 0 = lit (soot ramp, shaggy fur clumps catching light, sparse warm rim on the hump).
Row 1 = silhouette (void body, #1e1d39 inner edge, only the eyes glow).
Run: python3 build.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

HERE = Path(__file__).resolve().parent
W = H = 32
EYE = "#a4dddb"
FUR_LIT, FUR_MID, FUR_LOW, VOID = "#402751", "#1e1d39", "#172038", "#090a14"
FRINGE = "#577277"

SWAY = [-1, 0, 1, 0]          # upper body x shift (weight side to side)
BOB = [0, -1, 0, -1]          # whole body y (up on the passing frames)
FEET = [  # (back foot dx, dy, front foot dx, dy): contact / pass / contact / pass
    (-1, 0, 1, -1),
    (0, -1, 0, 0),
    (1, -1, -1, 0),
    (0, 0, 0, -1),
]


def ell(m, x0, y0, x1, y1, ch="b"):
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = (x1 - x0) / 2 + 0.4, (y1 - y0) / 2 + 0.4
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                m[(x, y)] = ch


def shape(f):
    """{(x, y): part}: b body fur, f foot, w brow shadow, e eye."""
    sw, bb = SWAY[f], BOB[f]
    m = {}
    # feet first (the hem covers their tops)
    bdx, bdy, fdx, fdy = FEET[f]
    for x0, dx, dy in ((7, bdx, bdy), (18, fdx, fdy)):
        for y in range(23, 30):
            for x in range(x0 + dx, x0 + dx + 5):
                if not (y == 29 and x in (x0 + dx, x0 + dx + 4)):
                    m[(x, y + dy)] = "f"
    # lower mass (sways less), hump (sways most), head low at the front-right
    ell(m, 3, 9 + bb, 27, 25 + bb)
    ell(m, 4 + sw, 2 + bb, 21 + sw, 19 + bb)            # the hump
    ell(m, 17 + sw, 11 + bb, 28 + sw, 23 + bb)          # the sunken head
    # ragged hem: pointed teeth hanging below the mass, swinging with the walk
    for x in range(3, 28):
        ys = [y for (xx, y), p in m.items() if xx == x and p == "b"]
        if not ys:
            continue
        base = max(ys)
        depth = (3, 2, 1, 0, 1)[(x + f) % 5]
        for d in range(1, depth + 1):
            m[(x, base + d)] = "b"
    # shaggy back: tufts sticking up along the top edge
    for x in range(6, 22, 3):
        ys = [y for (xx, y), p in m.items() if xx == x + sw]
        if ys:
            m[(x + sw, min(ys) - 1)] = "t"
    # brow shadow and the eyes, small
    for x in range(22, 29):
        for y in (15, 16):
            if (x + sw, y + bb) in m:
                m[(x + sw, y + bb)] = "w"
    m[(23 + sw, 16 + bb)] = "e"
    m[(27 + sw, 16 + bb)] = "e"
    return {(x, y + 1): p for (x, y), p in m.items()}   # 1 px headroom for the back tufts


def ray(m, x, y, dx, dy, cap=6):
    n = 0
    while n < cap and (x + dx * (n + 1), y + dy * (n + 1)) in m:
        n += 1
    return n


def _strands(seed=7, n=44):
    import random
    rng = random.Random(seed)
    out = []
    while len(out) < n:
        x, y = rng.randrange(4, 28), rng.randrange(4, 25)
        if all(abs(x - ox) + abs(y - oy) > 2 for ox, oy, _ in out):
            out.append((x, y, rng.choice((2, 2, 3, 3, 4))))
    return out


STRANDS = _strands()
STEP_UP = {VOID: FUR_LOW, FUR_LOW: FUR_MID, FUR_MID: FUR_LIT, FUR_LIT: FUR_LIT}
STRAND_UP = {VOID: FUR_MID, FUR_LOW: FUR_LIT, FUR_MID: FUR_LIT, FUR_LIT: FUR_LIT}
STEP_DN = {FUR_LIT: FUR_MID, FUR_MID: FUR_LOW, FUR_LOW: VOID, VOID: VOID}


def lit_frame(m, f):
    sw, bb = SWAY[f], BOB[f]
    col = {}
    for (x, y), part in m.items():
        if part == "e":
            col[(x, y)] = EYE
        elif part == "w":
            col[(x, y)] = VOID
        elif part == "f":
            col[(x, y)] = FUR_MID if (x - 1, y) not in m else (FUR_LOW if (x + 1, y) in m else VOID)
        elif part == "t":
            col[(x, y)] = FRINGE if x < 14 else FUR_LIT
        else:
            ul, dr = ray(m, x, y, -1, -1), ray(m, x, y, 1, 1)
            if ul <= 1:
                c = FUR_LIT
            elif ul <= 3:
                c = FUR_MID
            elif dr <= 2:
                c = VOID
            else:
                c = FUR_LOW
            col[(x, y)] = c
    # shag: hanging strands (lit stroke over a dark tip), fixed to the body so they move with it
    for sx, sy, ln in STRANDS:
        xs = sx + (sw if sy < 18 else 0)
        ys = sy + bb + 1
        cells = [(xs, ys + k) for k in range(ln + 1)]
        if all(m.get(c) == "b" for c in cells):
            for c in cells[:-1]:
                col[c] = STRAND_UP[col[c]]
            col[cells[-1]] = STEP_DN[col[cells[-1]]]
    # faint lighter fringe on the hem tips
    for (x, y), part in m.items():
        if part == "b" and (x, y + 1) not in m and (x - 1, y) not in m and (x + 1, y) not in m:
            col[(x, y)] = FUR_LIT
    return col


def dark_frame(m):
    col = {}
    edge = {p for p in m if any((p[0] + dx, p[1] + dy) not in m
                                 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
    for p, part in m.items():
        col[p] = EYE if part == "e" else (FUR_MID if p in edge else VOID)
    return col


s = Sprite(W, H, palette=PAL)
first = True
for row in ("lit", "dark"):
    for f in range(4):
        if not first:
            s.add_frame(copy=False)
        first = False
        m = shape(f)
        col = lit_frame(m, f) if row == "lit" else dark_frame(m)
        for (x, y), c in col.items():
            s.px(x, y, c)
        s.outline(OUTLINE, where="outside")
        if row == "lit":
            sw, bb = SWAY[f], BOB[f]
            top = sorted((p for p in m if m[p] in "bt"), key=lambda p: (p[0] + p[1]))
            hot, warm = top[:1], top[1:5]
            for p in warm:
                s.px(*p, "#de9e41")
            for p in hot:
                s.px(*p, "#e8c170")
s.set_duration(250, frames="all")

export(s, "pall", fps=4, rows=2)


def dark_preview(sprite, path, cols, bg="#151d28", scale=6):
    """Both rows over the darkness colour, plus 1x/2x/3x strips (how the game sees it)."""
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
