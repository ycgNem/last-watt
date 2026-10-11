"""Last Watt ground tiles: 16x16, 10 frames x 1 row (see pixel-art/README.md).

ground0-3  dark olive/slate soil, low contrast, 4 subtle variants
path0-1    packed ash, clearly lighter than ground (the enemy route reads through darkness)
ember0-1   emberrock: dark boulders with glowing veins in dark gravel (a resource)
decor0-1   transparent: a small rock cluster, a scorched stump

Seamless rules: every opaque tile is drawn with wrap-around (x % 16, y % 16). Ground and path
texture is small low-contrast blobs, so a blob cut at a tile edge never reads as a seam.
Emberrock boulders stay inside x/y 1..14, so every emberrock tile has a gravel edge band and
the variants tile with themselves and each other. Run: python3 build.py
"""
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

HERE = Path(__file__).resolve().parent
T = 16
NAMES = ["ground0", "ground1", "ground2", "ground3", "path0", "path1",
         "ember0", "ember1", "decor0", "decor1"]

# --- colours (all Apollo) ---------------------------------------------------------------
G_BASE, G_SLATE, G_DEEP, G_TUFT, G_PEB = "#19332d", "#202e37", "#151d28", "#25562e", "#394a50"
P_BASE, P_ASH, P_DIRT, P_RUST, P_DARK = "#394a50", "#577277", "#4d2b32", "#7a4841", "#202e37"
R_DARK, R_BASE, R_LIT, R_GLOW, R_HOT = "#241527", "#341c27", "#602c2c", "#cf573c", "#da863e"

s = Sprite(T, T, palette=PAL)

# small blob stamps (never single px, never long lines)
BLOBS = [
    [(0, 0), (1, 0), (0, 1)],
    [(0, 0), (1, 0), (1, 1), (2, 1)],
    [(0, 0), (1, 0), (2, 0), (1, 1)],
    [(0, 0), (0, 1), (1, 1)],
    [(0, 0), (1, 0), (0, 1), (1, 1)],
    [(1, 0), (0, 1), (1, 1), (2, 1)],
    [(0, 0), (1, 0)],
]


def wpx(x, y, c):
    s.px(x % T, y % T, c)


def blobs(seed, n, color, shapes=BLOBS):
    rng = random.Random(seed)
    for _ in range(n):
        x, y = rng.randrange(T), rng.randrange(T)
        for dx, dy in rng.choice(shapes):
            wpx(x + dx, y + dy, color)


def new_tile(first=False):
    if not first:
        s.add_frame(copy=False)


def grid(rows, cmap, ox, oy):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch in cmap:
                s.px(ox + i, oy + j, cmap[ch])


# --- ground -------------------------------------------------------------------------------
def pebble(x, y, big=False):
    wpx(x, y, G_PEB)
    wpx(x + 1, y, G_PEB)
    wpx(x, y + 1, G_SLATE)
    wpx(x + 1, y + 1, G_DEEP)
    if big:
        wpx(x + 2, y, G_SLATE)
        wpx(x + 2, y + 1, G_DEEP)


def tuft(x, y):
    """Dead tuft: a few bent blades over a dark root shadow."""
    for dx in (-1, 0, 1):
        wpx(x + dx, y + 1, G_DEEP)
    wpx(x - 1, y, G_TUFT)
    wpx(x, y, G_TUFT)
    wpx(x, y - 1, G_TUFT)
    wpx(x + 1, y, G_TUFT)


def ground(seed):
    s.clear(G_BASE)
    blobs(seed, 9, G_SLATE)
    blobs(seed + 100, 2, G_DEEP, [BLOBS[6]])      # a couple of 2 px dark pits


new_tile(first=True)            # ground0: plain soil
ground(11)

new_tile()                      # ground1: soil + two pebbles
ground(23)
pebble(4, 9)
pebble(11, 4, big=True)

new_tile()                      # ground2: soil + a dead tuft + pebble
ground(37)
tuft(9, 9)
pebble(3, 3)

new_tile()                      # ground3: soil + a shallow hollow
ground(53)
grid([
    ".ss...",
    "ssss..",
    ".sssss",
    "..ss..",
], {"s": G_SLATE}, 5, 6)
pebble(12, 12)
pebble(3, 12)


# --- path ---------------------------------------------------------------------------------
def path(seed):
    s.clear(P_BASE)
    blobs(seed, 3, P_ASH, [BLOBS[0], BLOBS[3], BLOBS[4]])
    blobs(seed + 7, 3, P_DARK, [BLOBS[0], BLOBS[3], BLOBS[6]])
    blobs(seed + 13, 1, P_DIRT, BLOBS[:4])
    rng = random.Random(seed + 29)
    for _ in range(2):                       # grit: lone rust specks
        wpx(rng.randrange(T), rng.randrange(T), P_RUST)


new_tile()                      # path0
path(71)

new_tile()                      # path1: + a pressed stone
path(97)
grid([
    ".hAA.",
    "AAAAA",
    "dddd.",
], {"h": "#819796", "A": P_ASH, "d": P_DARK}, 8, 6)


# --- emberrock ----------------------------------------------------------------------------
def blob_mask(parts):
    """Union of ellipses (x0, y0, x1, y1) as a pixel set."""
    m = set()
    for x0, y0, x1, y1 in parts:
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        rx, ry = (x1 - x0) / 2 + 0.35, (y1 - y0) / 2 + 0.35
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                    m.add((x, y))
    return m


def boulder(parts, veins=(), pocket=None):
    m = blob_mask(parts)
    ys = [y for _, y in m]
    cy = (min(ys) + max(ys)) / 2
    for x, y in m:                                   # contact shadow below/right
        for dx, dy in ((1, 0), (0, 1), (1, 1)):
            q = (x + dx, y + dy)
            if q not in m:
                s.px(q[0], q[1], OUTLINE)
    for x, y in m:
        c = R_BASE
        if (x + 1, y) not in m or (x, y + 1) not in m:
            c = R_DARK                               # shadow rim, bottom-right
        if (x, y - 1) not in m or ((x - 1, y) not in m and y <= cy):
            c = R_LIT                                # lit crescent, top-left
        s.px(x, y, c)
    for v in veins:                                  # glowing cracks, hot in the middle
        pts = []
        for (x0, y0), (x1, y1) in zip(v, v[1:]):
            n = max(abs(x1 - x0), abs(y1 - y0))
            for k in range(n + (1 if (x1, y1) == v[-1] else 0)):
                pts.append((round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n)))
        pts = [p for p in pts if p in m]
        for x, y in pts:
            if (x, y - 1) in m and (x, y - 1) not in pts:
                s.px(x, y - 1, R_LIT)                # the vein lights the rock above it
        for x, y in pts:
            s.px(x, y, R_GLOW)
        for x, y in pts[len(pts) // 2 - 1: len(pts) // 2 + 1]:
            s.px(x, y, R_HOT)
    if pocket:
        x, y = pocket
        s.rect(x, y, x + 1, y + 1, R_GLOW)
        s.px(x, y, R_HOT)
        s.px(x, y - 1, R_LIT)
        s.px(x + 1, y - 1, R_LIT)


def gravel(seed):
    s.clear(R_DARK)
    blobs(seed, 6, R_BASE, BLOBS[:4])


new_tile()                      # ember0: one big veined boulder, two small ones
gravel(5)
boulder([(10, 9, 14, 13)])
boulder([(2, 11, 6, 14)])
boulder([(1, 1, 11, 9), (5, 4, 11, 11)],
        veins=[[(3, 3), (5, 5), (6, 5), (8, 8), (8, 10)], [(6, 5), (9, 3)]])

new_tile()                      # ember1: two boulders, crack across the front one
gravel(9)
boulder([(1, 1, 8, 8)], pocket=(4, 4))
boulder([(10, 1, 14, 5)])
boulder([(5, 6, 14, 14), (3, 9, 9, 14)],
        veins=[[(5, 12), (7, 10), (9, 10), (11, 8)], [(9, 10), (10, 13)]])


# --- decor (transparent) ------------------------------------------------------------------
new_tile()                      # decor0: rock cluster, 9x7
grid([
    "..oooo...",
    ".oLLmmo..",
    ".oLmmdo..",
    "ooomddoooo",
    "oLmoddoLmo",
    "oLmmdooddo",
    ".oddddooo.",
    "..ooooo...",
], {"o": OUTLINE, "L": "#577277", "m": "#394a50", "d": "#202e37"}, 3, 5)

new_tile()                      # decor1: splintered, scorched stump with root flare, 9x9
grid([
    "...o.....",
    "..oRo.o..",
    ".oRroorO.",
    ".oRrbbbo.",
    ".oRrbcbo.",
    ".oRbcbbo.",
    "ooRrbbcoo",
    "oRrbbobbo",
    ".ooo.ooo.",
], {"o": OUTLINE, "O": "#341c27", "R": "#7a4841", "r": "#4d2b32", "b": "#341c27", "c": "#241527"},
    3, 4)

export(s, "tiles", fps=0, rows=1, names=NAMES)


# --- previews: 6x6 tiling block + 3x3 self-tiling per tile -------------------------------
def tile_img(i):
    return s.composite(i + 1)


LAYOUT = [  # indices into NAMES
    [0, 2, 1, 0, 3, 0],
    [4, 5, 4, 4, 5, 4],
    [1, 0, 3, 2, 4, 1],
    [6, 7, 0, 1, 5, 0],
    [7, 6, 2, 0, 4, 3],
    [0, 3, 1, 2, 5, 2],
]
DECOR = {(0, 0): 8, (5, 2): 9, (3, 5): 8, (2, 4): 9}

block = Image.new("RGBA", (6 * T, 6 * T))
for r, row in enumerate(LAYOUT):
    for c, i in enumerate(row):
        block.alpha_composite(tile_img(i), (c * T, r * T))
for (c, r), i in DECOR.items():
    block.alpha_composite(tile_img(i), (c * T, r * T))

selfs = Image.new("RGBA", (8 * (3 * T + 4), 3 * T), (90, 90, 90, 255))
for i in range(8):
    for r in range(3):
        for c in range(3):
            selfs.alpha_composite(tile_img(i), (i * (3 * T + 4) + c * T, r * T))

sc = 4
out = Image.new("RGB", (max(block.width * sc, selfs.width * 2) + 8, block.height * sc + selfs.height * 2 + 12),
                (90, 90, 90))
out.paste(block.resize((block.width * sc, block.height * sc), Image.NEAREST), (4, 4))
out.paste(selfs.resize((selfs.width * 2, selfs.height * 2), Image.NEAREST).convert("RGB"),
          (4, block.height * sc + 8))
out.save(HERE / "tiling.png")
print("preview ->", HERE / "tiling.png")
s.stats()
