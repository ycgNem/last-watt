"""Last Watt enemy: Flit. 12x12, 2 frames x 2 rows, fps 12 (see pixel-art/README.md).

A tiny cold dart of the Dim that comes in clumps of 6-10: a round blunt head (facing right;
the game flips it) tapering back to a point, one pale eye at the front, and a streaming tail
of three thin wisps that reads as speed. Dusk-blue, so a clump reads apart from the grey
Moth, the purple Shade and the near-black Pall. No wings, no legs, no mask.
Motion: a fast 2-frame whip at 12 fps: the body stretches (long point, wisps fanned) then
snaps short (head nudged forward, wisps crossed over), so it shivers forward like a thrown dart.
Row 0 = lit (dusk-blue ramp + a sparse warm rim on the upper-left of the head).
Row 1 = silhouette (near-black body, #1e1d39 inner edge and wisps, only the eye glows).
Run: python3 build.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

HERE = Path(__file__).resolve().parent
W = H = 12
EYE = "#a4dddb"
LIT, MID, LOW = "#3c5e8b", "#253a5e", "#172038"
WISP_NEAR, WISP_FAR = "#3c5e8b", "#1e1d39"

# body per frame (char grids, x 0..11): L lit, M mid, D low, e eye. Frame 0 stretched (head
# back, long point), frame 1 snapped (head 1 px forward, point pulled in).
BODY = [
    ["............",
     "............",
     "............",
     "......LLM...",
     "....MLLLMM..",
     "...DMLLMeM..",
     "....DMMMMD..",
     "......DDD...",
     "............",
     "............",
     "............",
     "............"],
    ["............",
     "............",
     "............",
     ".......LLM..",
     ".....MLLLMM.",
     ".....MLLMeM.",
     ".....DMMMMD.",
     ".......DDD..",
     "............",
     "............",
     "............",
     "............"],
]
COL = {"L": LIT, "M": MID, "D": LOW, "e": EYE}
# wisps: thin 1 px streaks drawn over the outline (not outlined), near pixel first.
# Frame 0 fanned short, frame 1 whipped long and crossed.
WISPS = [
    [[(3, 4), (2, 3), (1, 3)],
     [(2, 5), (1, 5), (0, 6)],
     [(3, 6), (2, 7), (1, 7), (0, 8)]],
    [[(4, 4), (3, 4), (2, 3), (1, 3), (0, 2)],
     [(4, 5), (3, 5), (2, 6), (1, 6)],
     [(4, 6), (3, 7), (2, 7), (1, 8)]],
]
RIM = [  # (hot, warm) on the upper-left of the head
    ([(6, 3)], [(5, 4)]),
    ([(7, 3)], [(6, 4)]),
]


def draw(f, row):
    rows = BODY[f]
    m = {(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch != "."}
    edge = {p for p in m if any((p[0] + dx, p[1] + dy) not in m
                                 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
    for (x, y) in m:
        ch = rows[y][x]
        if row == "lit":
            c = COL[ch]
        else:
            c = EYE if ch == "e" else ("#1e1d39" if (x, y) in edge else "#151d28")
        s.px(x, y, c)
    s.outline(OUTLINE, where="outside")
    for w in WISPS[f]:
        n = len(w)
        for k, (x, y) in enumerate(w):
            if row == "lit":
                c = WISP_NEAR if k == 0 else (MID if k < n - 1 else WISP_FAR)
            else:
                c = "#1e1d39" if k < n - 1 else "#172038"
            s.px(x, y, c)
    if row == "lit":
        hot, warm = RIM[f]
        for p in warm:
            s.px(*p, "#de9e41")
        for p in hot:
            s.px(*p, "#e8c170")


s = Sprite(W, H, palette=PAL)
first = True
for row in ("lit", "dark"):
    for f in range(2):
        if not first:
            s.add_frame(copy=False)
        first = False
        draw(f, row)
s.set_duration(83, frames="all")

export(s, "flit", fps=12, rows=2)


def dark_preview(sprite, path, cols, bg="#151d28", scale=10):
    """Both rows over the darkness colour, plus 1x/2x/3x strips and a clump of 8 at 3x."""
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
    # a clump at gameplay zoom (3x): lit on the left half, silhouettes on the right
    clump = Image.new("RGBA", (w * 3 * 9, h * 3 * 3), hex2rgba(bg))
    spots = [(0, 4), (8, 0), (13, 9), (3, 15), (20, 3), (22, 14), (30, 8), (11, 19)]
    for half in (0, 1):
        for k, (sx, sy) in enumerate(spots):
            fr = half * cols + (k % cols)
            im = sprite.composite(fr + 1).resize((w * 3, h * 3), Image.NEAREST)
            clump.alpha_composite(im, (half * w * 3 * 4 + sx * 3, sy * 3))
    out = Image.new("RGB", (max(big.width, small.width, clump.width),
                            big.height + small.height + clump.height), hex2rgba(bg)[:3])
    out.paste(big.convert("RGB"), (0, 0))
    out.paste(small.convert("RGB"), (0, big.height))
    out.paste(clump.convert("RGB"), (0, big.height + small.height))
    out.save(path)
    print("preview ->", path)


dark_preview(s, HERE / "preview_dark.png", cols=2)
s.stats()
