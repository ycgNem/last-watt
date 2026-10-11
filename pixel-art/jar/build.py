"""Jar (battery): 16x24, 4 frames = charge level, fps 0, footprint 1x1.

A big glass battery jar: brass lid with two terminal posts and nuts, iron-grey glass walls
with a cool glint on the lit side, an iron foot ring. The interior is the charge read:
frame 1 dark (empty), 2 ember, 3 amber, 4 white-hot, each a base colour with a brighter core.
1 px #10141f outline. 8-9 colours per frame.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

C = {
    "o": OUTLINE,
    "1": "#394a50", "2": "#577277", "g": "#a8b5b2",       # glass walls, glint
    "b": "#884b2b", "B": "#be772b", "y": "#de9e41",       # brass
}
CHARGE = [("#202e37", "#394a50"),   # dark: empty glass
          ("#a53030", "#cf573c"),   # ember
          ("#de9e41", "#e8c170"),   # amber
          ("#e8c170", "#ebede9")]   # white-hot
NAMES = ["empty", "ember", "amber", "full"]


def seg(y, x0, chars):
    for i, ch in enumerate(chars):
        if ch != ".":
            s.px(x0 + i, y, C[ch])


def jar(level):
    base, core = CHARGE[level]
    # glass body with a rounded glowing core
    for y in range(9, 21):
        s.px(3, y, C["2"])
        s.px(12, y, C["1"])
        for x in range(4, 12):
            inside = 5 <= x <= 10 and 11 <= y <= 18
            corner = (x in (5, 10)) and (y in (11, 18))
            s.px(x, y, core if inside and not corner else base)
    # rounded glass bottom and the iron foot ring
    seg(21, 3, "2" + "1" * 8 + "o")
    seg(22, 4, "11111111")
    # glint on the lit side of the glass
    for y in (10, 11, 12):
        seg(y, 4, "g")
    seg(14, 4, "g")
    # brass lid: top face, front band, shadowed underside
    seg(5, 5, "yyyBBB")
    seg(6, 3, "yyyyyBBBBb")
    seg(7, 3, "BBBBBBBbbb")
    seg(8, 3, "bbbbbbbbbb")
    # stubby terminal nuts on the lid
    for x in (4, 10):
        seg(3, x, "yB")
        seg(4, x, "Bb")


s = Sprite(16, 24, palette=PAL)
for lv in range(4):
    if lv:
        s.add_frame(copy=False)
    jar(lv)
    s.outline(OUTLINE, where="outside")
s.frame(1)
export(s, "jar", light=(8, 15), fps=0, names=NAMES, preview_scale=10)
s.stats()
