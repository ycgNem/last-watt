"""Last Watt enemy: Moth. 16x16, 2 frames x 2 rows, fps 8 (see pixel-art/README.md).

A small dusty Dim creature seen from above: fat furry body, big soft wings, feathery
antennae, two pale eyes. Motion: a fast 2-frame flutter, wings spread flat / wings raised
(foreshortened and lifted toward the camera in the 3/4 view).
Row 0 = lit (DIM ramp + a sparse warm rim on the upper-left where the light catches it).
Row 1 = silhouette (near-black body, #1e1d39 inner edge, only the eyes glow).
Run: python3 build.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

HERE = Path(__file__).resolve().parent
W = H = 16
EYE = "#c7cfcc"

# fill grids (no outline; the outline is added outside). One char per pixel.
#  L pale  m mid  d dim  s shadow  F fur-light  f fur  h head  e eye
CMAP = {"L": "#c7cfcc", "m": "#819796", "d": "#577277", "s": "#402751",
        "F": "#c7cfcc", "f": "#819796", "h": "#402751", "e": EYE,
        "A": "#819796", "a": "#577277"}
SHADOWY = set("sh")          # chars that stay darkest in the silhouette

# left halves (x 0..7); the right half is mirrored and dimmed one step (light from upper left)
SPREAD_L = [  # wings down / spread flat: broad forewing, notch, fan hindwing
    "........",
    "........",
    ".L....hh",
    ".LLL..eh",
    ".LmmL.FF",
    ".mdsmLFF",
    "..mmdmFF",
    "...ddsAa",
    "..mmdsAa",
    ".mmddsAa",
    ".mdds.Aa",
    "..dd..sa",
    ".......a",
    "........",
    "........",
    "........",
]
RAISED_L = [  # wings up: narrower, tips lifted toward the camera
    "........",
    "...LL...",
    "...LL.hh",
    "...mL.eh",
    "...msLFF",
    "...ddmFF",
    "....dmFF",
    ".....sAa",
    "....mdAa",
    "...mddAa",
    "....dsAa",
    "......sa",
    ".......a",
    "........",
    "........",
    "........",
]
DIM_RIGHT = str.maketrans({"L": "m", "F": "f", "A": "a"})


def mirrored(half):
    return [r + r[::-1].translate(DIM_RIGHT) for r in half]


SPREAD, RAISED = mirrored(SPREAD_L), mirrored(RAISED_L)
ANTENNAE = {  # drawn after the outline, 1 px feathery stalks
    0: [(5, 1), (4, 0), (10, 1), (11, 0)],
    1: [(6, 1), (5, 0), (9, 1), (10, 0)],
}
RIM = {  # (hot, warm) pixels where the light catches the upper-left edge
    0: ([(1, 2)], [(1, 3), (2, 3), (1, 4), (6, 2)]),
    1: ([(3, 1)], [(4, 1), (3, 2), (6, 2)]),
}


def mask(rows):
    return {(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch != "."}


def edge_px(m):
    return {(x, y) for x, y in m
            if any((x + dx, y + dy) not in m for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}


def rim_px(m, n_hot, n_warm):
    """Upper-left-facing edge pixels, nearest the light first."""
    up_left = [(x, y) for x, y in m if (x - 1, y) not in m or (x, y - 1) not in m]
    up_left.sort(key=lambda p: (p[0] + p[1], p[1]))
    return up_left[:n_hot], up_left[n_hot:n_hot + n_warm]


def draw_lit(rows, key):
    m = mask(rows)
    for (x, y) in m:
        s.px(x, y, CMAP[rows[y][x]])
    s.outline(OUTLINE, where="outside")
    hot, warm = RIM[key]
    for p in warm:
        s.px(*p, "#de9e41")
    for p in hot:
        s.px(*p, "#e8c170")
    for p in ANTENNAE[key]:
        s.px(*p, "#577277")


def draw_dark(rows, key):
    m = mask(rows)
    e = edge_px(m)
    for (x, y) in m:
        ch = rows[y][x]
        c = "#10141f" if ch in SHADOWY else "#151d28"
        if (x, y) in e:
            c = "#1e1d39"
        if ch == "e":
            c = EYE
        s.px(x, y, c)
    s.outline(OUTLINE, where="outside")
    for p in ANTENNAE[key]:
        s.px(*p, "#1e1d39")


FRAMES = [(SPREAD, 0), (RAISED, 1)]
s = Sprite(W, H, palette=PAL)
first = True
for drawer in (draw_lit, draw_dark):
    for rows, key in FRAMES:
        if not first:
            s.add_frame(copy=False)
        first = False
        drawer(rows, key)
s.set_duration(125, frames="all")

export(s, "moth", fps=8, rows=2)


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
    small = Image.new("RGBA", (n * w * 6 + 8, h * 6 + 4), hex2rgba(bg))
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


dark_preview(s, HERE / "preview_dark.png", cols=len(FRAMES))
s.stats()
