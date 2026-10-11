"""Lab: 32x48, 2 frames (indicator blink), footprint 2x2.

A small brick-and-iron workshop: brick front with two cool-lit windows and an iron door,
iron cornice and roof plate; on the roof a glass dome glowing COOL (iron ribs, a pale core) and
a coil antenna with brass rings whose tip blinks. Cool glass is the Lab's alone, so labs never
read as weapons. Light from the upper left, 1 px #10141f outline. 12 colours.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE,
    "s": "#4d2b32", "S": "#7a4841", "T": "#ad7757",                 # brick
    "1": "#394a50", "2": "#577277", "3": "#819796",                 # iron
    "d": "#3c5e8b", "c": "#4f8fba", "C": "#73bed3", "W": "#a4dddb",  # cool glass
    "B": "#be772b",                                                 # brass
}


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


def walls():
    x0, x1 = 3, 28
    for y in range(30, 47):
        v = y - 30
        course, r = divmod(v, 3)
        for x in range(x0, x1 + 1):
            if x == x0:
                c = "T"
            elif x == x1:
                c = "s"
            elif r == 2:
                c = "s"
            elif (x + (2 if course % 2 else 0)) % 5 == 0:
                c = "s"
            else:
                c = "T" if (r == 0 and x < 14) else "S"
            seg(y, x, c)
    seg(46, x0, "s" * 26)
    # cornice: iron band under the roof lip
    seg(28, 3, "2" * 18 + "1" * 8)
    seg(29, 3, "1" * 24 + "oo")
    # windows: iron frame, cool glass brightest at the lit corner, iron sill
    for wx in (6, 21):
        seg(32, wx, "11111")
        for y in range(33, 38):
            seg(y, wx, "1...1")
        seg(38, wx, "11111")
        glass = ["WWC", "WCC", "CCc", "Ccc", "ccd"]
        for i, g in enumerate(glass):
            seg(33 + i, wx + 1, g)
        seg(39, wx - 1, "2222221"[:7])
    # door with a cool slit window and a brass handle
    for y in range(35, 47):
        seg(y, 13, "121111")
    seg(34, 13, "oooooo")
    seg(37, 15, "WC")
    seg(38, 15, "Cc")
    seg(41, 17, "B")


def roof():
    seg(19, 4, "2" * 24)
    for y in range(20, 27):
        seg(y, 3, "2" * 25 + "1")
    seg(27, 3, "3" * 17 + "2" * 8 + "1")     # lit front lip of the roof plate


def dome(f):
    cx, cy, r = 12.5, 16.5, 6.6
    for y in range(9, 24):
        for x in range(5, 21):
            dx, dy = x - cx, y - cy
            if y <= 21 and dx * dx + dy * dy <= r * r or (y > 21 and abs(dx) <= 6 and
                                                           (dx / 6.5) ** 2 + ((y - 21) / 2.2) ** 2 <= 1):
                # shade from a light at the upper left, pale core in the middle
                d = math.hypot(x - (cx - 2), y - (cy - 3))
                k = "W" if d < 2.2 else "C" if d < 4.6 else "c" if d < 7.0 else "d"
                seg(y, x, k)
    # iron ribs and base ring
    for y in range(11, 23):
        seg(y, 12, "1")
    seg(22, 6, "2222222111111")
    seg(23, 7, "111111111oo")
    if f == 0:
        seg(15, 10, "W")   # core sparkle


def antenna(f):
    for y in range(4, 22):
        seg(y, 23, "21")
    for y in (8, 11, 14):
        seg(y, 22, "BBBB")
    seg(20, 21, "222111")
    seg(21, 21, "11111o")
    tip = "W" if f == 0 else "d"
    seg(2, 23, tip + tip)
    seg(3, 23, tip + ("C" if f == 0 else "d"))


s = Sprite(32, 48, palette=PAL)
for f in (0, 1):
    if f:
        s.add_frame(copy=False)
    walls()
    roof()
    dome(f)
    antenna(f)
    s.outline(OUTLINE, where="outside")
s.set_duration(500)
s.frame(1)
export(s, "lab", light=(13, 16), fps=2)
s.stats()
