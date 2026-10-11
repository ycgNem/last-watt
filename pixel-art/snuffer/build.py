"""Last Watt enemy: Snuffer. 24x24, 4 frames x 2 rows, fps 5 (see pixel-art/README.md).

The furnace-killer: a hunched, heavy walker whose head is one big cupped bell, like the cap of
a candle snuffer, worn low and forward (facing right; the game flips it). Two pale eyes look
out from the dark under the bell's flared lip. A soot-brown hump behind, short stumpy legs, and
long arms that hang to the ground (it knuckle-walks on them), a small knob on the bell's crown.
No helmet visor, no weapon, no mask.
Motion: 4-frame plod at 5 fps: contact / pass / contact / pass; the body bobs 1 px on the
passing frames, the bell follows one frame late (a heavy nod), the arms swing against the legs.
Row 0 = lit (dark iron bell with one hard highlight streak, soot-brown body, warm rim on the
upper-left of the bell and the hump).
Row 1 = silhouette (near-black, #1e1d39 inner edge and bell rim line, only the eyes glow).
Run: python3 build.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

HERE = Path(__file__).resolve().parent
W = H = 24
EYE = "#a4dddb"
# bell (dark iron), body (soot-brown)
B_HI, B_LIT, B_MID, B_LOW = "#819796", "#577277", "#394a50", "#202e37"
F_LIT, F_MID, F_LOW = "#4d2b32", "#341c27", "#241527"
VOID = "#090a14"

BOB = [0, -1, 0, -1]                 # body (up on the passing frames)
NOD = [-1, 0, -1, 0]                 # bell: the body's bob one frame late
# (back leg dx, dy, front leg dx, dy): contact / pass / contact / pass
LEGS = [(-1, 0, 1, 0), (0, 0, 0, -1), (1, 0, -1, 0), (0, -1, 0, 0)]
ARM = [-1, 0, 1, 0]                  # near hand x swing (against the front leg)
BELL_CX = 14.5
BELL_ROWS = {  # dy from the bell top: half width (a dome, near-straight sides, a flared lip)
    0: 2.5, 1: 3.5, 2: 4.0, 3: 4.0, 4: 4.0, 5: 4.0, 6: 4.5, 7: 5.0, 8: 6.0, 9: 6.5}
LEAN = 0.17                           # the lip sits forward of the dome: the opening looks ahead
BELL_TOP = 3
LIP = 8                               # rows 8, 9 are the flared lip


def bell_span(dy):
    hw = BELL_ROWS[dy]
    cx = BELL_CX + LEAN * dy
    return round(cx - hw), round(cx + hw) - 1, cx, hw


def ell(m, x0, y0, x1, y1, ch):
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = (x1 - x0) / 2 + 0.4, (y1 - y0) / 2 + 0.4
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                m[(x, y)] = ch


def limb(m, pts, ch, widths):
    """A stroke through pts; widths[i] = thickness (px, growing right) of segment i."""
    for i, ((x0, y0), (x1, y1)) in enumerate(zip(pts, pts[1:])):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            x = round(x0 + (x1 - x0) * k / n)
            y = round(y0 + (y1 - y0) * k / n)
            for d in range(widths[i]):
                m[(x + d, y)] = ch


def shape(f):
    """{(x, y): part}: a far arm, l legs, b body, r near arm, h hand, k bell, p lip,
    u under-lip shadow, e eye, n knob."""
    bb, nod = BOB[f], NOD[f]
    bdx, bdy, fdx, fdy = LEGS[f]
    sw = ARM[f]
    m = {}
    # far arm (behind everything), swinging opposite the near one, knuckles down
    limb(m, [(10, 11 + bb), (11 - sw, 16 + bb), (12 - sw, 20)], "a", (3, 2))
    for x in range(11 - sw, 14 - sw):
        m[(x, 21)] = "a"
    # hind legs: short and stumpy, a toe forward
    for x0, dx, dy in ((3, bdx, bdy), (7, fdx, fdy)):
        for y in range(16, 22):
            for x in range(x0 + dx, x0 + dx + 3):
                m[(x, y + dy)] = "l"
        m[(x0 + dx + 3, 21 + dy)] = "l"
    # the hunched back: rises from the haunches up behind the bell
    ell(m, 2, 7 + bb, 13, 18 + bb, "b")
    ell(m, 5, 4 + bb, 12, 12 + bb, "b")
    # near arm: long, from the shoulder under the bell to a heavy hand on the ground
    limb(m, [(9, 11 + bb), (11 + sw, 15 + bb), (13 + sw, 19)], "r", (3, 3))
    for x, y in [(12, 20), (13, 20), (14, 20), (15, 20), (12, 21), (13, 21), (14, 21), (15, 21),
                 (16, 21)]:
        m[(x + sw, y)] = "h"
    # the bell: worn low and forward over the shoulders, the dome tipped back
    top = BELL_TOP + bb + nod
    for dy in BELL_ROWS:
        x0, x1, _, _ = bell_span(dy)
        for x in range(x0, x1 + 1):
            m[(x, top + dy)] = "p" if dy >= LIP else "k"
    m[(14, top - 1)] = "n"
    m[(15, top - 1)] = "n"
    # dark under the lip, and the eyes in it
    ly = top + LIP + 2
    x0, x1, _, _ = bell_span(LIP + 1)
    for x in range(x0 + 4, x1):
        m[(x, ly)] = "u"
    m[(x1 - 4, ly)] = "e"
    m[(x1 - 1, ly)] = "e"
    return m, top


def ray(m, x, y, dx, dy, cap=6):
    n = 0
    while n < cap and (x + dx * (n + 1), y + dy * (n + 1)) in m:
        n += 1
    return n


def lit_color(m, x, y, top):
    part = m[(x, y)]
    if part == "e":
        return EYE
    if part == "u":
        return VOID
    if part == "n":
        return B_LIT
    if part in "kp":
        _, _, cx, hw = bell_span(y - top)
        u = (x + 0.5 - (cx - hw)) / (2 * hw)          # 0 = left edge, 1 = right edge
        if part == "p":
            if y - top == LIP + 1:
                return B_LOW if u > 0.3 else B_MID     # lip underside
            return B_HI if u < 0.25 else (B_LIT if u < 0.6 else B_MID)
        if 0.22 <= u < 0.36 and y - top >= 1:
            return B_HI                                # the hard highlight streak
        if u < 0.22:
            return B_LIT
        if u > 0.72:
            return B_LOW
        return B_MID
    if part == "a":
        return F_LOW if (x - 1, y) in m and m[(x - 1, y)] == "a" else F_MID
    ul, dr = ray(m, x, y, -1, -1), ray(m, x, y, 1, 1)
    if part in "rh":
        left = m.get((x - 1, y))
        right = m.get((x + 1, y))
        if left not in ("r", "h") or (part == "h" and (x, y - 1) not in m):
            return F_LIT
        if right not in ("r", "h"):
            return F_LOW
        return F_MID
    if m.get((x + 1, y)) in ("r", "h") and part in "bla":
        return VOID                                    # the gap behind the near arm
    if part == "l":
        return F_MID if (x - 1, y) not in m else F_LOW
    # body
    if ul == 0 and ((x - 1, y) not in m or (x, y - 1) not in m):
        return F_LIT
    if dr <= 1 or y > 14:
        return F_LOW
    return F_MID


s = Sprite(W, H, palette=PAL)
first = True
for row in ("lit", "dark"):
    for f in range(4):
        if not first:
            s.add_frame(copy=False)
        first = False
        m, top = shape(f)
        edge = {p for p in m if any((p[0] + dx, p[1] + dy) not in m
                                     for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
        for (x, y), part in m.items():
            if row == "lit":
                c = lit_color(m, x, y, top)
            else:
                c = EYE if part == "e" else (VOID if part == "u" else "#151d28")
                if ((x, y) in edge and part not in "eu") or (part == "p" and y - top == LIP + 1):
                    c = "#1e1d39"                      # inner edge, and the bell's rim line
            s.px(x, y, c)
        s.outline(OUTLINE, where="outside")
        if row == "lit":
            s.px(bell_span(1)[0], top + 1, "#e8c170")
            s.px(bell_span(0)[0], top, "#de9e41")
            s.px(bell_span(0)[0] + 1, top, "#de9e41")
            s.px(bell_span(2)[0], top + 2, "#de9e41")
            hump = sorted((p for p in m if m[p] == "b"), key=lambda p: (p[0] + p[1], p[1]))
            for p in hump[:2]:
                s.px(*p, "#de9e41")
s.set_duration(200, frames="all")

export(s, "snuffer", fps=5, rows=2)


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
