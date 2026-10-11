"""Burner (generator): 32x40, 2 frames (fire flicker), footprint 2x2.

A squat riveted iron furnace: lit top plate with a coal hatch, a grated firebox mouth glowing
ember-orange (brightest at the bed of coals), a ledge that catches the glow, squat feet, and a
short soot chimney with a warm throat. Light from the upper left, 1 px #10141f outline. 12 colours.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE, "k": "#151d28",
    "s": "#202e37", "1": "#394a50", "2": "#577277", "3": "#819796",   # iron / soot
    "r": "#a53030", "R": "#cf573c", "a": "#da863e", "A": "#de9e41", "Y": "#e8c170",  # fire
    "B": "#be772b",                                                   # brass
}


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


def body():
    # top plate (rounded back corners), lit front lip
    seg(13, 5, "2222222222222222222222")
    for y in range(14, 19):
        seg(y, 4, "3" + "2" * 22 + "1")
    seg(19, 4, "333333333333333332222211")
    # rivets round the top plate
    for x in range(6, 26, 3):
        seg(14, x, "3")
    for y in (16, 18):
        seg(y, 5, "3")
        seg(y, 26, "3")
    # front face
    for y in range(20, 36):
        seg(y, 4, "32" + "1" * 21 + "s")
    seg(36, 4, "1" + "s" * 22 + "k")
    # riveted band under the lip
    seg(21, 5, "s" * 22)
    for x in range(6, 26, 3):
        seg(22, x, "2")
    for y in (25, 28, 31, 34):
        seg(y, 5, "2")
        seg(y, 26, "2")
    # brass surround (lit top/left), then the arched mouth
    seg(23, 11, "AAAAAAABBB")
    seg(24, 9, "AA")
    seg(24, 21, "BB")
    for y in range(25, 34):
        seg(y, 8, "A")
        seg(y, 23, "B")
    seg(24, 11, "oooooooooo")
    seg(25, 9, "oo")
    seg(25, 21, "oo")
    for y in range(26, 33):
        seg(y, 9, "o")
        seg(y, 22, "o")
    seg(33, 9, "oooooooooooooo")
    # ledge under the mouth catches the glow
    seg(34, 8, "BAAAAAAAAAAAAAAB")
    seg(35, 8, "ssssssssssssssss")
    # feet
    for y in (37, 38):
        seg(y, 4, "21s")
        seg(y, 25, "1ss")


def chimney(f):
    for y in range(4, 16):
        seg(y, 19, "2211sk")
    seg(13, 19, "3211sk")
    seg(14, 18, "2" + "1" * 6 + "s")   # collar where it meets the plate
    seg(15, 18, "1sssssss")
    # rim and dark throat seen from above, a warm glow down inside
    seg(1, 19, "222ss1")
    seg(2, 18, "2kkkkkks")
    seg(3, 18, "23222ssk")
    if f == 0:
        seg(2, 20, "rRr")
    else:
        seg(2, 21, "rr")


FIRE = {
    0: ["rrRRrRRRrRRr",
        "rRRaRRRRaRRr",
        "RRaYaRRaYaRR",
        "RaAYAaaAYAaR",
        "aAYYYAAYYYAa",
        "AYYYYYYYYYYA",
        "YYYYYYYYYYYY",
        "AYAYYAYYAYAY"],
    1: ["rRRrRRRRrRRr",
        "rRRRRaaRRRRr",
        "RaRRaYYaRRaR",
        "aYaaAYYAaaYa",
        "AYAAYYYYAAYA",
        "YYYYYYYYYYYY",
        "YYYYYYYYYYYY",
        "YAYYAYAYYAYA"],
}


def fire(f):
    for i, row in enumerate(FIRE[f]):
        seg(25 + i, 10, row)
    seg(25, 10, "o")           # keep the arch corners
    seg(25, 21, "o")
    # low grate: four dark bars across the coal bed
    for y in range(29, 33):
        for x in (11, 14, 17, 20):
            seg(y, x, "s")


s = Sprite(32, 40, palette=PAL)
body()
chimney(0)
fire(0)
s.add_frame(copy=True)
chimney(1)
fire(1)
for i in (1, 2):
    s.frame(i)
    s.outline(OUTLINE, where="outside")
s.set_duration(220)
s.frame(1)
export(s, "burner", light=(16, 30), fps=5)
s.stats()
