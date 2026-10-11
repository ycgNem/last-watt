"""Hearth: the station core. 64x80, 2 frames (core + firebox flicker), footprint 4x4.

A squat brick-and-iron lighthouse-stove: iron skirt plinth, brick body with brass bands and a
glowing firebox door, a riveted brass gallery, a big glass lantern with a white-hot core behind
iron mullions, and a soot-iron dome cap with a stubby stove chimney. Light from the upper left,
top-down 3/4 view, 1 px #10141f outline. 16 colours.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

W, H = 64, 80
K = 0.32  # ellipse squash for the 3/4 view (ry = K * rx), shared by every ring

# palette (16)
O = OUTLINE
S1, S2 = "#151d28", "#202e37"                       # soot
I1, I2 = "#394a50", "#577277"                       # iron
B0, B1, B2, B3 = "#341c27", "#4d2b32", "#7a4841", "#ad7757"   # brick
R1, R2, R3 = "#884b2b", "#be772b", "#de9e41"        # brass (R3 shared with glass)
G1, G2, G3, G4, G5 = "#cf573c", "#da863e", "#de9e41", "#e8c170", "#ebede9"  # glass / ember

IRON4 = [S1, S2, I1, I2]
BRICK4 = [B0, B1, B2, B3]
BRASS4 = [B1, R1, R2, R3]


def band(r4, t):
    """Cylinder side light band, light from the left. r4 = [deep, shadow, mid, light]."""
    if t < 0.07:
        return r4[2]
    if t < 0.31:
        return r4[3]
    if t < 0.60:
        return r4[2]
    if t < 0.84:
        return r4[1]
    return r4[0]


def ring(x0, x1):
    c = (x0 + x1) / 2
    h = (x1 - x0 + 1) / 2
    return c, h


def e_off(x, x0, x1, k=K):
    c, h = ring(x0, x1)
    u = (x - c) / h
    return k * h * math.sqrt(max(0.0, 1 - u * u))


def cyl_side(x0, x1, ytop, ybot, colfn):
    """Front face of a cylinder: per column from the top-rim front arc to the bottom arc."""
    for x in range(x0, x1 + 1):
        e = e_off(x, x0, x1)
        for y in range(round(ytop + e), round(ybot + e) + 1):
            s.px(x, y, colfn(x, y, e))


def cyl_top(x0, x1, yc, colfn):
    for x in range(x0, x1 + 1):
        e = e_off(x, x0, x1)
        for y in range(round(yc - e), round(yc + e) + 1):
            s.px(x, y, colfn(x, y, e))


def front_arc(x0, x1, yc, color, dy=0, xa=None, xb=None):
    for x in range(xa if xa is not None else x0, (xb if xb is not None else x1) + 1):
        s.px(x, round(yc + e_off(x, x0, x1)) + dy, color)


# ---------------------------------------------------------------- geometry (y = rim centres)
PL = (3, 60)     # plinth x range
PL_T, PL_B = 62, 69
BO = (10, 53)    # brick body
BO_T, BO_B = 38, 62
GA = (11, 52)    # gallery deck
GA_T, GA_B = 34, 38
GL = (18, 45)    # glass lantern
GL_T, GL_B = 15, 34
CA = (15, 48)    # cap
CA_R, CA_DOME = 15, 9
GLOW_C = (31.5, 28.5)


def t_of(x, x0, x1):
    return (x - x0) / (x1 - x0)


def draw_plinth():
    x0, x1 = PL
    side4 = [S1, S2, S2, I1]

    def side(x, y, e):
        return band(side4, t_of(x, x0, x1))

    cyl_side(x0, x1, PL_T, PL_B, side)

    def top(x, y, e):
        t = t_of(x, x0, x1)
        if y == round(PL_T + e):  # the front lip of the deck catches the light
            return I2 if t < 0.7 else I1
        return I1 if t < 0.66 else S2

    cyl_top(x0, x1, PL_T, top)
    # rivets along the skirt, every 5 px of arc
    c, h = ring(x0, x1)
    last = None
    for x in range(x0 + 2, x1 - 1):
        a = math.asin(max(-1, min(1, (x - c) / h))) * h
        k = math.floor(a / 5)
        if k != last:
            last = k
            col = band(side4, t_of(x, x0, x1))
            if col != S1:
                s.px(x, round(PL_T + e_off(x, x0, x1)) + 4, I2 if col == I1 else I1)


def draw_body(f):
    x0, x1 = BO
    c, h = ring(x0, x1)
    bands = {5, 6, 21, 22}  # brass band rows (offset below the top rim)

    def side(x, y, e):
        t = t_of(x, x0, x1)
        base = band(BRICK4, t)
        v = y - round(e) - BO_T
        if v in bands:
            col = band(BRASS4, t)
            if v in (5, 21) and col == R2:
                col = R3 if t < 0.5 else col
            return col
        # brick courses: 3 brick rows + 1 mortar row, staggered joints every 6 px of arc
        course, r = divmod(v, 4)
        mortar = {B3: B2, B2: B1, B1: B0, B0: B0}[base]
        if r == 3:
            return mortar
        a = math.asin(max(-1, min(1, (x - c) / h))) * h + (3 if course % 2 else 0)
        a0 = math.asin(max(-1, min(1, (x - 1 - c) / h))) * h + (3 if course % 2 else 0)
        if math.floor(a / 6) != math.floor(a0 / 6) and x > x0 + 1:
            return mortar
        return base

    cyl_side(x0, x1, BO_T, BO_B, side)
    # contact shadow where the body stands on the plinth
    front_arc(x0, x1, BO_B, S2, dy=1, xa=x0 + 1, xb=x1 - 1)

    # rivets on the brass bands
    last = None
    for x in range(x0 + 2, x1 - 1):
        a = math.floor(math.asin(max(-1, min(1, (x - c) / h))) * h / 4)
        if a != last:
            last = a
            col = band(BRASS4, t_of(x, x0, x1))
            if col in (R2, R3):
                for v in (5, 21):
                    s.px(x, round(BO_T + e_off(x, x0, x1)) + v, G4 if col == R3 else R3)

    # firebox mouth: arched iron frame, open fire, a log grate across the bottom
    fx0, fx1, fy0, fy1 = 24, 39, 55, 67
    arch = {0: 4, 1: 2, 2: 1}
    for y in range(fy0, fy1 + 1):
        inset = arch.get(y - fy0, 0)
        for x in range(fx0 + inset, fx1 - inset + 1):
            outer = x in (fx0 + inset, fx1 - inset) or y in (fy0, fy1) or (
                y - fy0 in arch and x < fx0 + arch.get(y - fy0 - 1, inset))
            s.px(x, y, O if outer else (I2 if (x < 30 and y < fy0 + 3) or x == fx0 + inset + 1 else I1))
    # keystone
    s.px(31, fy0, R3)
    s.px(32, fy0, R2)
    # fire, brightest at the bed of coals
    fire = [G1, G1, G2, G3, G4, G5, G5] if f == 0 else [G1, G2, G2, G3, G4, G4, G5]
    my0, my1 = fy0 + 2, fy1 - 1
    for y in range(my0, my1 + 1):
        inset = {0: 3, 1: 1}.get(y - my0, 0)
        for x in range(fx0 + 2 + inset, fx1 - 2 - inset + 1):
            k = min(len(fire) - 1, (y - my0) * len(fire) // (my1 - my0 + 1))
            s.px(x, y, fire[k])
    # flame tongues rising out of the coals (they swap places on frame 2)
    tongues = [(28, 3), (33, 4), (36, 2)] if f == 0 else [(30, 4), (35, 3), (27, 2)]
    for (x, ht) in tongues:
        for d in range(ht):
            s.px(x, my1 - 3 - d, G4 if d < ht - 1 else G3)
    # log grate: two dark bars over the coals
    for x in range(fx0 + 2, fx1 - 1):
        s.px(x, my1 - 1, S2 if (x - fx0) % 4 else I1)
        s.px(x, my1, S1 if x % 2 else S2)
    # warm spill on the plinth deck in front of the mouth
    for x in range(fx0 + 2, fx1 - 1):
        s.px(x, fy1 + 2, R1 if x in (fx0 + 2, fx1 - 2) else R2)


def draw_gallery():
    x0, x1 = GA

    def side(x, y, e):
        t = t_of(x, x0, x1)
        v = y - round(e) - GA_T
        if v == 0:
            return band([R1, R2, R3, G4], t)
        return band(BRASS4, t)

    cyl_side(x0, x1, GA_T, GA_B, side)
    cyl_top(x0, x1, GA_T, lambda x, y, e: I2 if t_of(x, x0, x1) < 0.6 else I1)
    # under-deck shadow on the brick
    front_arc(x0, x1, GA_B, S1, dy=1, xa=BO[0] + 1, xb=BO[1] - 1)
    # rivets on the gallery band
    c, h = ring(x0, x1)
    last = None
    for x in range(x0 + 2, x1 - 1):
        a = math.floor(math.asin(max(-1, min(1, (x - c) / h))) * h / 4)
        if a != last:
            last = a
            col = band(BRASS4, t_of(x, x0, x1))
            if col in (R2, R3):
                s.px(x, round(GA_T + e_off(x, x0, x1)) + 3, G4 if col == R3 else R3)


def draw_railing():
    """Lighthouse rail along the front of the gallery deck: dark posts against the glass."""
    x0, x1 = GA
    c, h = ring(x0, x1)
    last = None
    for x in range(x0 + 1, x1):
        e = e_off(x, x0, x1)
        yd = round(GA_T + e)            # deck front lip
        t = t_of(x, x0, x1)
        s.px(x, yd - 3, R3 if t < 0.4 else R2 if t < 0.78 else R1)   # brass top rail
        a = math.floor(math.asin(max(-1, min(1, (x - c) / h))) * h / 4.5)
        if a != last and x0 + 2 < x < x1 - 2:
            last = a
            s.px(x, yd - 2, S2)
            s.px(x, yd - 1, S2)


def draw_glass(f):
    x0, x1 = GL
    cx, cy = GLOW_C
    grow = 0.0 if f == 0 else 0.07
    lift = 0 if f == 0 else -1
    mull = {20: "thin", 25: "a", 26: "b", 37: "a", 38: "b", 43: "thin"}

    def side(x, y, e):
        if x in mull:
            # backlit iron mullions: dark, lit edge toward the light
            return I1 if mull[x] == "a" or (mull[x] == "thin" and x < 32) else S2
        dx = (x - cx) / 13.0
        dy = (y - (cy + lift)) / 10.5
        d = math.sqrt(dx * dx + dy * dy) - grow
        if x > cx:  # the far-right glass sits in the lantern's own shadow
            d += 0.08
        if d < 0.30:
            return G5
        if d < 0.50:
            return G4
        if d < 0.72:
            return G3
        if d < 0.93:
            return G2
        return G1

    cyl_side(x0, x1, GL_T, GL_B, side)
    # brass foot ring where the glass meets the deck
    front_arc(x0, x1, GL_B, R2, dy=0, xa=x0, xb=x1)
    front_arc(x0, x1, GL_B, I1, dy=1, xa=x0 + 1, xb=x1 - 1)
    for x in range(x0, x1 + 1):
        if t_of(x, x0, x1) < 0.35:
            s.px(x, round(GL_B + e_off(x, x0, x1)), R3)
    # glass glint on the lit panel
    for y in (22, 23, 24):
        s.px(22, y, G5)
    s.px(22, 26, G4)


def draw_cap():
    x0, x1 = CA
    c, h = ring(x0, x1)
    s.layer("cap")
    pts = []
    for x in range(x0, x1 + 1):
        u = (x - c) / h
        q = math.sqrt(max(0.0, 1 - u * u))
        top = round(CA_R - CA_DOME * q)
        bot = round(CA_R + K * h * q)
        for y in range(top, bot + 1):
            s.px(x, y, S1)
            pts.append((x, y))
    # shifted-shape shading toward the upper left
    for (x, y) in pts:
        u = (x - (c - 3)) / (h - 2)
        q = math.sqrt(max(0.0, 1 - u * u)) if abs(u) < 1 else 0
        if q and y >= CA_R - (CA_DOME - 1) * q and y <= CA_R + 1:
            s.px(x, y, S2)
    for (x, y) in pts:
        u = (x - (c - 5)) / (h - 5)
        q = math.sqrt(max(0.0, 1 - u * u)) if abs(u) < 1 else 0
        if q and CA_R - (CA_DOME - 1.5) * q <= y <= CA_R - 3 + 3 * q:
            s.px(x, y, I1)
    for (x, y) in pts:
        u = (x - (c - 8)) / 5.5
        q = math.sqrt(max(0.0, 1 - u * u)) if abs(u) < 1 else 0
        if q and CA_R - 7.5 * q <= y <= CA_R - 5 + 2 * q:
            s.px(x, y, I2)
    # brass rim band (two rows at the front of the rim)
    for x in range(x0, x1 + 1):
        e = e_off(x, x0, x1)
        t = t_of(x, x0, x1)
        s.px(x, round(CA_R + e) - 1, band([R1, R2, R3, G4], t))
        s.px(x, round(CA_R + e), band(BRASS4, t))
    # chimney: a stubby soot stove pipe with a lip
    for y in range(3, 9):
        for x in range(29, 35):
            s.px(x, y, {29: I1, 30: I2, 31: I1, 32: S2, 33: S2, 34: S1}[x])
    for x in range(28, 36):
        s.px(x, 2, {28: I1, 29: I2, 30: I2, 31: I1, 32: I1, 33: S2, 34: S2, 35: S1}[x])
        s.px(x, 1, S2 if x > 28 else I1)
    for x in range(29, 35):
        s.px(x, 1, S1 if x > 30 else S2)
    s.px(31, 1, O)
    s.px(32, 1, O)
    s.layer("main")


def draw(f):
    draw_plinth()
    draw_body(f)
    draw_gallery()
    draw_glass(f)
    draw_railing()
    draw_cap()


s = Sprite(W, H, palette=PAL)
draw(0)
s.add_frame(copy=False)
draw(1)
s.flatten()
for i in (1, 2):
    s.frame(i)
    s.outline(O, where="outside")
s.set_duration(260)
s.frame(1)
export(s, "hearth", light=(32, 28), fps=4, preview_scale=6)
s.stats()
