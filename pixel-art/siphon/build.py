"""Last Watt enemy: Siphon. 24x24, 4 frames x 2 rows, fps 5 (see pixel-art/README.md).

The line-tapper: a lean, low-slung four-legged thing of the Dim on thin stilt legs (the hind
ones with a backward hock), a long neck carried forward and up to a small hanging head, and a
long thin drinking tube held forward and slightly down (facing right; the game flips it).
On its back sits one swollen round sac that glows faint violet: the stolen power.
It is the roster's only horizontal silhouette (Moth, Flit, Shade, Veil, Snuffer and Pall are all
upright blobs or drapes). No wings, no striped abdomen, no mosquito: four legs, a neck, a tube.
Motion: 4-frame skulk at 5 fps, diagonal leg pairs (near-front with far-hind): contact / pass /
contact / pass; the body bobs 1 px, the head and tube stay level (a stalker's steady head) so
the neck stretches, the sac jiggles one frame late, and in the lit row one violet pulse runs
up the tube and neck into the sac each cycle.
Row 0 = lit (dark slate body, warm rim on the upper-left edges, violet sac with a pale glint).
Row 1 = silhouette (near-black, #1e1d39 inner edge; only the eyes and a dim sac glow show).
Run: python3 build.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

HERE = Path(__file__).resolve().parent
W = H = 24
EYE = "#a4dddb"
# body (cool dark slate, the Dim's grey end)
S_HI, S_LIT, S_MID, S_LOW = "#577277", "#394a50", "#202e37", "#151d28"
VOID = "#090a14"
# the sac (stolen power): dark rim, glow, pale glint
SAC_LOW, SAC_MID, SAC_HI = "#402751", "#7a367b", "#c7cfcc"
TUBE = "#819796"
WARM, WARM_HI = "#de9e41", "#e8c170"

GROUND = 21                           # near feet on this row (the game puts it 3 px above the frame foot)
BOB = [0, -1, 0, -1]                  # body: up on the passing frames
JIG = [-1, 0, -1, 0]                  # sac: the body's bob one frame late
# diagonal pairs: near-hind with far-front (foot dx +STEP), near-front with far-hind (-STEP)
STEP = [1, 0, -1, 0]
# (la, lb) = lift of the NH/FF pair, lift of the NF/FH pair: the pair swinging forward is lifted
LIFT = [(0, 0), (0, -1), (0, 0), (-1, 0)]
HEAD = (13, 4)                        # skull top-left; the head and tube never bob
SKULL = [(1, 0), (2, 0), (3, 0),
         (0, 1), (1, 1), (2, 1), (3, 1), (4, 1),
         (1, 2), (2, 2), (3, 2), (4, 2), (5, 2),
         (2, 3), (3, 3), (4, 3)]
EYES = [(2, 1), (4, 1)]


def ell(m, x0, y0, x1, y1, ch):
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = (x1 - x0) / 2 + 0.4, (y1 - y0) / 2 + 0.4
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                m[(x, y)] = ch


def line(pts):
    """A Bresenham-style run of points through pts (no doubles)."""
    out = []
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            p = (round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n))
            if not out or out[-1] != p:
                out.append(p)
    return out


def leg(m, hip, knee, foot, ch, thigh=1, toe=False):
    for x, y in line([hip, knee, foot]):
        if (x, y) not in m or m[(x, y)] == "g" or ch == "l":
            m[(x, y)] = ch
        if thigh > 1 and y < knee[1]:
            m[(x + 1, y)] = ch
    if toe:
        m[(foot[0] + 1, foot[1])] = ch


def shape(f):
    """{(x, y): part}: g far legs, l near legs, b body, n neck, h head, t tube, s sac, e eye.
    Returns (map, tube points, neck points, the sac's top-left)."""
    bb, jg = BOB[f], JIG[f]
    st = STEP[f]
    la, lb = LIFT[f]
    m = {}
    # far legs (behind the body): 1 px, tucked just behind the near ones so each pair scissors
    # open on the contact frames; feet 1 px higher (further away)
    leg(m, (5, 14 + bb), (4, 17 + bb), (4 - st, GROUND - 1 + lb), "g")             # far hind
    leg(m, (12, 15 + bb), (12, 18 + bb), (12 + st, GROUND - 1 + la), "g")          # far front
    # body: a lean, arched barrel; haunch behind, a deeper chest in front, the belly tucked up
    ell(m, 2, 10 + bb, 7, 15 + bb, "b")
    ell(m, 7, 10 + bb, 13, 16 + bb, "b")
    for x in range(4, 11):
        for y in range(10 + bb, 14 + bb):
            m[(x, y)] = "b"
    # near legs: a 2 px thigh, a thin shin; the hind one with a backward hock
    leg(m, (3, 14 + bb), (2, 18 + bb), (3 + st, GROUND + la), "l", thigh=2, toe=True)      # near hind
    leg(m, (10, 15 + bb), (10, 18 + bb), (11 - st, GROUND + lb), "l", thigh=2, toe=True)     # near front
    # neck: thick at the shoulders, rising forward to the level head
    hx, hy = HEAD
    neck = line([(11, 11 + bb), (12, 9), (hx + 1, hy + 2)])
    for x, y in neck:
        m[(x, y)] = "n"
        m[(x, y + 1)] = "n"
        if y >= 9:
            m[(x - 1, y + 1)] = "n"
            m[(x - 1, y + 2)] = "n"            # thicker toward the shoulders
    # the skull, hanging forward
    for dx, dy in SKULL:
        m[(hx + dx, hy + dy)] = "h"
    # the drinking tube from under the chin, forward and slightly down
    tube = line([(hx + 5, hy + 3), (22, hy + 6)])
    for p in tube:
        m[p] = "t"
    # the sac: swollen and round on the mid-back
    sc = (4, 6 + bb + jg)                  # the sac's top-left
    ell(m, 4, 6 + bb + jg, 9, 11 + bb + jg, "s")
    for dx, dy in EYES:
        m[(hx + dx, hy + dy)] = "e"
    return m, tube, neck, sc


def ray(m, x, y, dx, dy, cap=6):
    n = 0
    while n < cap and (x + dx * (n + 1), y + dy * (n + 1)) in m:
        n += 1
    return n


def lit_color(m, x, y, sc):
    part = m[(x, y)]
    if part == "e":
        return EYE
    if part == "t":
        return TUBE
    if part == "g":
        return S_LOW
    if part == "s":
        dx, dy = x - sc[0], y - sc[1]
        if (dx, dy) == (2, 1):
            return SAC_HI
        if dx + dy >= 7 or dx == 5 or dy == 5:
            return SAC_LOW
        return SAC_MID
    up = (x, y - 1) not in m or m[(x, y - 1)] in "s"
    left = (x - 1, y) not in m
    if part == "l":
        return S_LIT if left else S_MID
    if part in "nh":
        if (x, y - 1) not in m:
            return S_HI
        if (x, y + 1) not in m:
            return S_LOW
        return S_LIT
    # body
    if up and m.get((x, y - 1)) != "s":
        return S_HI
    if (x, y + 1) not in m or ray(m, x, y, 0, 1) <= 0:
        return S_LOW
    if (x + 1, y) not in m and y > 11:
        return S_LOW
    return S_LIT if left or y <= 11 else S_MID


s = Sprite(W, H, palette=PAL)
first = True
for row in ("lit", "dark"):
    for f in range(4):
        if not first:
            s.add_frame(copy=False)
        first = False
        m, tube, neck, sc = shape(f)
        edge = {p for p in m if any((p[0] + dx, p[1] + dy) not in m
                                     for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
        for (x, y), part in m.items():
            if row == "lit":
                c = lit_color(m, x, y, sc)
            else:
                c = EYE if part == "e" else "#151d28"
                if part == "s":
                    dx, dy = x - sc[0], y - sc[1]
                    c = SAC_MID if (dx, dy) in ((2, 2), (3, 2), (2, 3)) else SAC_LOW
                    if (x, y) in edge or dx + dy >= 8:
                        c = "#1e1d39"
                elif (x, y) in edge and part != "e":
                    c = "#1e1d39"
            s.px(x, y, c)
        s.outline(OUTLINE, where="outside")
        if row == "lit":
            # the drink: one pulse per cycle, tube tip -> chin -> neck -> into the sac
            path = tube[::-1] + neck[::-1]
            k = (0, len(tube) - 1, len(tube) + len(neck) // 2, None)[f]
            if k is not None:
                s.px(*path[k], SAC_MID)
            else:
                s.px(sc[0] + 3, sc[1] + 2, SAC_HI)             # the gulp: the sac flares
            # warm rim on the upper-left of the haunch and the skull
            bb = BOB[f]
            for x, y, c in [(2, 12, WARM), (3, 11, WARM_HI), (2, 13, WARM)]:
                if m.get((x, y + bb)) == "b":
                    s.px(x, y + bb, c)
            s.px(HEAD[0] + 1, HEAD[1], WARM_HI)
            s.px(HEAD[0], HEAD[1] + 1, WARM)
s.set_duration(200, frames="all")

export(s, "siphon", fps=5, rows=2)


def dark_preview(sprite, path, cols, bg="#151d28", scale=8):
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
