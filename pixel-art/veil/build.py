"""Last Watt enemy: Veil. 20x24, 4 frames x 2 rows, fps 4 (see pixel-art/README.md).

A tall hanging curtain of dark cloth drifting along the path (facing right; the game flips it):
a gathered top with three small scallops where it bunches (like cloth hung from rings that
aren't there), a shadowed fold-under band with two pale pinprick eyes high up, then straight
pleats falling to a frayed hem with a few loose threads. No head, no arms, no round sheet-ghost
dome: it is a curtain, read by its pleats.
Motion: 4-frame ripple at 4 fps: a sideways wave travels down the cloth (the top barely moves,
the hem swings most), the hem trails 1 px behind the drift, the loose threads swing late.
The game also draws it semi-transparent when no tower can see it, so the pleats are high
contrast (ridge vs trough) and the outline is unbroken: the shape holds at 50% alpha.
Row 0 = lit (slate cloth, plum-black troughs, warm rim on the upper-left of the gather).
Row 1 = silhouette (near-black cloth, #1e1d39 inner edge, pleats as dark lines, pale eyes).
Run: python3 build.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

HERE = Path(__file__).resolve().parent
W, H = 20, 24
EYE = "#c7cfcc"
# cloth ramp, light -> dark
HI, RIDGE, BASE, SHADOW, DEEP, VOID = "#819796", "#577277", "#394a50", "#202e37", "#1e1d39", "#090a14"
STRIPE = [RIDGE, BASE, SHADOW, DEEP]          # one pleat, left (lit) to right (in shadow)
LIGHTER = {DEEP: SHADOW, SHADOW: BASE, BASE: RIDGE, RIDGE: HI, HI: HI}
DARKER = {HI: RIDGE, RIDGE: BASE, BASE: SHADOW, SHADOW: DEEP, DEEP: DEEP}

TOP, HEM = 3, 19              # cloth rows (the scallops sit on TOP - 1)
FOLDS = 3


def shift(y, f):
    """Sideways offset of row y in frame f: a wave travelling down, growing toward the hem,
    plus a small trailing lean (the hem lags the drift)."""
    t = max(0.0, (y - TOP) / (HEM - TOP))
    wave = 1.35 * t * math.sin(2 * math.pi * f / 4 - (y - TOP) * 0.42)
    return wave - 0.8 * t


def edges(y, f):
    base_l = 6 - (y - TOP) * 0.18
    base_r = 13 + (y - TOP) * 0.18
    d = shift(y, f)
    return round(base_l + d), round(base_r + d)


def shape(f):
    """{(x, y): colour key} for the lit row; also returns eye pixels."""
    m = {}
    # scallops: the cloth bunched where it hangs
    for x in (7, 9, 10, 12):
        m[(x, TOP - 1)] = "hi"
    for y in range(TOP, HEM + 1):
        xl, xr = edges(y, f)
        for x in range(xl, xr + 1):
            u = (x - xl + 0.5) / (xr - xl + 1)
            m[(x, y)] = ("cloth", int(u * FOLDS * 4) % 4, u)
    # ragged hem edge: short teeth hanging off the last row
    xl, xr = edges(HEM, f)
    for x in range(xl, xr + 1):
        depth = (1, 0, 0, 1, 0, 1, 0, 0)[(x - xl + 2 * f) % 8]
        for k in range(1, depth + 1):
            m[(x, HEM + k)] = ("tooth", k)
    xl, xr = edges(6, f)
    eyes = [(xl + 4, 6), (xl + 7, 6)]          # peering out between two pleats
    return m, eyes


def lit_color(key, x, y):
    if key == "hi":
        return HI
    if key[0] == "tooth":
        return SHADOW if key[1] == 1 else DEEP
    _, band, u = key
    c = STRIPE[band]
    if y <= TOP + 1:
        c = LIGHTER[LIGHTER[c]] if band < 2 else LIGHTER[c]   # the gather catches the light
    elif u < 0.3 and y < 12:
        c = LIGHTER[c]
    elif u > 0.75 or y > HEM - 3:
        c = DARKER[c]
    return c


def threads(f):
    """Loose threads hanging through the hem outline: lists of pixels, swinging one frame
    behind the hem (the tip sways 1 px)."""
    lag = (f - 1) % 4
    sway = (0, 1, 0, -1)[lag]
    m = shape(f)[0]
    xl, _ = edges(HEM, f)
    out = []
    for off, ln in ((1, 3), (4, 2), (6, 4), (9, 3), (12, 2)):
        x0 = xl + off
        y0 = max(y for (x, y) in m if x == x0) + 1 if any(x == x0 for (x, _) in m) else HEM + 1
        out.append([(x0 + (sway if k >= ln - 1 and k > 0 else 0), y0 + k) for k in range(ln)])
    return out


s = Sprite(W, H, palette=PAL)
first = True
for row in ("lit", "dark"):
    for f in range(4):
        if not first:
            s.add_frame(copy=False)
        first = False
        m, eyes = shape(f)
        edge = {p for p in m if any((p[0] + dx, p[1] + dy) not in m
                                     for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
        for (x, y), key in m.items():
            if row == "lit":
                c = lit_color(key, x, y)
            else:
                band = key[1] if isinstance(key, tuple) and key[0] == "cloth" else 1
                c = "#10141f" if band == 3 else "#151d28"
                if (x, y) in edge:
                    c = DEEP
            s.px(x, y, c)
        # the eyes: pinpricks in the gaps between pleats, a fold-shadow above and below each
        for ex, ey in eyes:
            s.px(ex, ey - 1, VOID)
            s.px(ex, ey + 1, DEEP if row == "lit" else VOID)
            if row == "lit":                      # the gap between the pleats, in shadow
                s.px(ex - 1, ey, DEEP)
                s.px(ex + 1, ey, SHADOW)
            s.px(ex, ey, EYE)
        s.outline(OUTLINE, where="outside")
        for th in threads(f):
            for k, p in enumerate(th):
                s.px(*p, (BASE if k < len(th) - 1 else SHADOW) if row == "lit" else DEEP)
        if row == "lit":
            s.px(7, TOP - 1, "#e8c170")
            for p in [(edges(TOP, f)[0], TOP), (edges(TOP + 1, f)[0], TOP + 1),
                      (edges(TOP + 2, f)[0], TOP + 2)]:
                s.px(*p, "#de9e41")
s.set_duration(250, frames="all")

export(s, "veil", fps=4, rows=2)


def dark_preview(sprite, path, cols, bg="#151d28", lit_bg="#394a50", scale=8):
    """Both rows over the darkness colour, 1x/2x/3x strips, and the lit row at 50% alpha over
    dark ground and lit ground (how the game draws it when no tower can see it)."""
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
    half = Image.new("RGBA", (2 * cols * (w * 3 + 4) + 8, h * 3 + 8), hex2rgba(bg))
    half.paste(Image.new("RGBA", (cols * (w * 3 + 4) + 4, h * 3 + 8), hex2rgba(lit_bg)),
               (cols * (w * 3 + 4) + 4, 0))
    for side in (0, 1):
        for i in range(cols):
            im = sprite.composite(i + 1).resize((w * 3, h * 3), Image.NEAREST)
            a = im.getchannel("A").point(lambda v: v // 2)
            im.putalpha(a)
            half.alpha_composite(im, (4 + side * (cols * (w * 3 + 4) + 4) + i * (w * 3 + 4), 4))
    out = Image.new("RGB", (max(big.width, small.width, half.width),
                            big.height + small.height + half.height), hex2rgba(bg)[:3])
    out.paste(big.convert("RGB"), (0, 0))
    out.paste(small.convert("RGB"), (0, big.height))
    out.paste(half.convert("RGB"), (0, big.height + small.height))
    out.save(path)
    print("preview ->", path)


dark_preview(s, HERE / "preview_dark.png", cols=4)
s.stats()
