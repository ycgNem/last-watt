"""Last Watt UI icons: 16x16, 15 frames x 1 row, fps 0 (see pixel-art/README.md).

14x14 content inside a 1 px margin, 1 px #10141f outline (added outside the fill, so every
fill stays inside x/y 2..13). Light from the upper left. Building icons echo their building
sprites: iron bodies, amber glass, brass trim, reddish plinths; the Lab is the one cool-blue
building; the Beacon is the one red light.
Run: python3 build.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

HERE = Path(__file__).resolve().parent
NAMES = ["lamp", "floodlight", "beacon", "node", "extractor", "burner", "jar", "lab", "kw",
         "money", "light", "rock", "research", "overcharge", "shed"]

C = {
    "o": OUTLINE,
    "1": "#202e37", "2": "#394a50", "3": "#577277", "4": "#819796", "5": "#a8b5b2",
    "B": "#602c2c", "b": "#884b2b", "r": "#be772b", "R": "#de9e41", "Y": "#e8c170",
    "W": "#ebede9",
    "e": "#752438", "E": "#a53030", "f": "#cf573c", "g": "#da863e",
    "c": "#253a5e", "C": "#3c5e8b", "n": "#4f8fba", "N": "#73bed3", "M": "#a4dddb",
    "k": "#241527", "K": "#341c27", "s": "#4d2b32", "S": "#7a4841",
}

s = Sprite(16, 16, palette=PAL)


def grid(rows):
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), [len(r) for r in rows]
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                s.px(x, y, C[ch])


ICONS = {}

ICONS["lamp"] = [  # hooded lantern on a post, brass finial, reddish plinth
    "................",
    "................",
    ".......RR.......",
    "......3321......",
    ".....333221.....",
    "....33322221....",
    ".....2YWYR1.....",
    ".....2YYRr1.....",
    ".....2RRrr1.....",
    ".....232221.....",
    ".......32.......",
    ".......32.......",
    "......3221......",
    "....SSSSSSss....",
    "................",
    "................",
]
ICONS["floodlight"] = [  # wide boxy head, a grid of six amber cells, on a stand
    "................",
    "................",
    "................",
    "..344444444442..",
    "..21WY1WY1WY12..",
    "..21YR1YR1YR12..",
    "..211111111112..",
    "..21WY1WY1WY12..",
    "..21YR1YR1YR12..",
    "..222222222221..",
    ".......32.......",
    ".......32.......",
    ".....233221.....",
    "....SSSSSSss....",
    "................",
    "................",
]
ICONS["beacon"] = [  # tapered lattice mast with a red warning light on top
    "................",
    "................",
    "......EffE......",
    ".....EfgWfE.....",
    ".....eEffEe.....",
    "......2332......",
    ".......32.......",
    ".......32.......",
    "......3432......",
    "......3..2......",
    "......3442......",
    ".....3....2.....",
    ".....344442.....",
    "....SS....Ss....",
    "................",
    "................",
]
ICONS["node"] = [  # a post with a small amber bulb and a crossarm
    "................",
    "................",
    ".......YY.......",
    "......YWYR......",
    "......RYRr......",
    ".......22.......",
    "....34433221....",
    ".......Sb.......",
    ".......Sb.......",
    ".......Sb.......",
    ".......Sb.......",
    ".......Sb.......",
    "......3221......",
    ".....233221.....",
    "................",
    "................",
]
ICONS["burner"] = [  # iron furnace with a glowing fire mouth and a chimney
    "................",
    "................",
    "..........34....",
    "..........32....",
    "..........32....",
    "...3444444443...",
    "...3222222221...",
    "...3211111121...",
    "...321fggf121...",
    "...321gWYg121...",
    "...321EffE121...",
    "...3211111121...",
    "...3222222221...",
    "..SSSSSSSSSSss..",
    "................",
    "................",
]
ICONS["jar"] = [  # glass battery with a brass cap, charged amber inside
    "................",
    "................",
    ".......32.......",
    ".....RYRrrB.....",
    ".....bbbbbB.....",
    ".....411112.....",
    ".....451112.....",
    ".....4YWYR2.....",
    ".....4YYRr2.....",
    ".....4RYRr2.....",
    ".....4RRrr2.....",
    ".....4rrrB2.....",
    ".....bbbbbB.....",
    "....rbbbbbbB....",
    "................",
    "................",
]
ICONS["lab"] = [  # workshop with a cool-blue glass dome and lit windows
    "................",
    "................",
    ".......32.......",
    "......MNnC......",
    ".....MNNnnC.....",
    "....NMNnnnCc....",
    "...nNNnnnnCCc...",
    "...nnnnnCCCcc...",
    "..344444444442..",
    "..322222222221..",
    "..32MN2222MN21..",
    "..32Nn2222Nn21..",
    "..322222222221..",
    "..SSSSSSSSSSss..",
    "................",
    "................",
]
ICONS["kw"] = [  # a lightning bolt, white core, amber edges
    "................",
    "................",
    "........YYYY....",
    ".......YWWY.....",
    "......YWWY......",
    ".....YWWY.......",
    "....YWWWWWWY....",
    "....RRRRWWR.....",
    ".......YWR......",
    "......YWR.......",
    ".....YWR........",
    ".....WR.........",
    "....YR..........",
    "....R...........",
    "................",
    "................",
]
ICONS["light"] = [  # a warm flame: the station's lights (lives)
    "................",
    "................",
    "........f.......",
    ".......fg.......",
    ".......gRf......",
    "......fRYgf.....",
    "......gYWRg.....",
    ".....fRYWYRf....",
    ".....gYWWWRg....",
    "....fRYWWWYRf...",
    "....gRYWWWYRg...",
    "....fRYYWYYRf...",
    ".....fRYYYRf....",
    "......fgggf.....",
    "................",
    "................",
]
ICONS["research"] = [  # round flask of cool-blue glowing liquid
    "................",
    "................",
    ".....443332.....",
    "......4112......",
    "......4512......",
    "......4112......",
    ".....411112.....",
    "....45111112....",
    "...4NMNNnnnC2...",
    "...4NNnMnnCC2...",
    "...4nnnnCCCc2...",
    "...4nnCCCCcc2...",
    "....2CCcccc1....",
    ".....222221.....",
    "................",
    "................",
]


def draw_extractor():
    """A-frame derrick: hammer on a rod, poised just over a glowing emberrock chunk."""
    s.polygon([(4, 11), (6, 10), (10, 10), (12, 12), (11, 13), (4, 13)], C["K"])
    s.line(5, 11, 9, 11, C["B"])
    s.px(4, 12, C["B"])
    s.line(6, 13, 8, 12, C["f"])
    s.line(8, 12, 10, 13, C["f"])
    s.px(8, 12, C["Y"])
    s.line(7, 3, 3, 13, C["3"])                 # legs
    s.line(8, 3, 12, 13, C["2"])
    s.rect(6, 2, 9, 2, C["4"])                  # crown block
    s.line(7, 3, 8, 3, C["2"])
    s.line(7, 4, 7, 6, C["4"])                  # rod
    s.line(8, 4, 8, 6, C["1"])
    s.rect(6, 7, 9, 8, C["3"])                  # the hammer
    s.line(6, 7, 8, 7, C["5"])
    s.line(9, 7, 9, 8, C["1"])


def draw_money():
    """A stamped brass token: rim, face, stamped ring, square hole."""
    rows = [(6, 9), (4, 11), (3, 12), (3, 12), (2, 13), (2, 13), (2, 13), (2, 13),
            (3, 12), (3, 12), (4, 11), (6, 9)]
    m = {(x, 2 + i) for i, (a, b) in enumerate(rows) for x in range(a, b + 1)}
    for x, y in m:
        edge = any((x + dx, y + dy) not in m for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        d = math.hypot(x - 7.5, y - 7.5)
        if edge:
            c = C["r"] if (x + y) < 15 else C["b"]
        elif abs(d - 3.6) < 0.55:
            c = C["r"]                           # stamped ring
        elif (x + y) <= 11 and d > 3.6:
            c = C["Y"]
        else:
            c = C["R"]
        s.px(x, y, c)
    s.rect(7, 7, 8, 8, C["o"])                   # square hole
    s.px(9, 7, C["b"])
    s.px(7, 9, C["b"])
    s.px(8, 9, C["b"])
    s.px(9, 8, C["b"])


def draw_rock():
    """An emberrock chunk with glowing cracks."""
    s.polygon([(3, 7), (5, 4), (9, 3), (12, 5), (13, 9), (11, 12), (6, 13), (3, 11)], C["K"])
    s.polygon([(3, 7), (5, 4), (9, 3), (10, 5), (7, 7), (4, 8)], C["B"], only="opaque")
    s.line(5, 4, 8, 3, C["S"], only="opaque")
    for x, y in [(12, 9), (12, 10), (11, 11), (10, 12), (9, 12), (8, 12), (7, 12)]:
        s.px(x, y, C["k"], only="opaque")
    s.line(5, 9, 8, 8, C["f"], only="opaque")
    s.line(8, 8, 11, 8, C["f"], only="opaque")
    s.line(8, 8, 7, 11, C["f"], only="opaque")
    s.line(9, 5, 8, 7, C["f"], only="opaque")
    s.px(8, 8, C["Y"])
    s.px(9, 8, C["g"])
    s.px(8, 9, C["g"])


def draw_overcharge():
    """A white-hot starburst."""
    cx = cy = 7.5
    for y in range(2, 14):
        for x in range(2, 14):
            dx, dy = x - cx, y - cy
            d = math.hypot(dx, dy)
            card = (abs(dx) < 1 and d <= 6.5) or (abs(dy) < 1 and d <= 6.5)
            diag = abs(abs(dx) - abs(dy)) < 0.6 and d <= 5.0
            if d <= 2.2:
                c = C["W"]
            elif d <= 3.3:
                c = C["Y"] if not (card or diag) else C["W"]
            elif card:
                c = C["Y"] if d <= 5 else C["R"]
            elif diag:
                c = C["Y"] if d <= 4 else C["R"]
            else:
                continue
            s.px(x, y, c)


def draw_shed():
    """An open knife breaker: base plate, empty clip, hinge, blade thrown up, red handle."""
    s.rect(2, 11, 13, 13, C["2"])               # base plate
    s.line(2, 11, 13, 11, C["3"])
    s.line(2, 13, 13, 13, C["1"])
    for x in (4, 6):                            # the empty clip it should sit in
        s.line(x, 9, x, 10, C["4"])
    s.px(5, 10, C["3"])
    s.rect(10, 8, 12, 10, C["3"])               # hinge post
    s.px(12, 9, C["1"])
    s.px(12, 10, C["1"])
    s.px(10, 8, C["4"])
    s.line(10, 8, 6, 4, C["5"])                 # the blade, thrown open
    s.line(11, 8, 7, 4, C["3"])
    s.rect(3, 2, 5, 4, C["E"])                  # insulated red handle
    s.px(3, 2, C["f"])
    s.px(4, 2, C["f"])
    s.px(5, 4, C["e"])
    s.px(5, 3, C["e"])


DRAW = {"extractor": draw_extractor, "money": draw_money, "rock": draw_rock,
        "overcharge": draw_overcharge, "shed": draw_shed}

for i, name in enumerate(NAMES):
    if i:
        s.add_frame(copy=False)
    if name in ICONS:
        grid(ICONS[name])
    else:
        DRAW[name]()
    s.outline(OUTLINE, where="outside")

export(s, "icons", fps=0, rows=1, names=NAMES)

# preview: all icons at 1x, 2x and 4x over the HUD-ish dark panel, labelled at 4x
bg = (21, 29, 40)
out = Image.new("RGB", (15 * 18 * 4 + 8, 18 + 34 + 16 * 4 + 8), bg)
for i in range(15):
    im = s.composite(i + 1)
    out.paste(im, (4 + i * 18, 2), im)
    im2 = im.resize((32, 32), Image.NEAREST)
    out.paste(im2, (4 + i * 34, 20), im2)
    im4 = im.resize((64, 64), Image.NEAREST)
    out.paste(im4, (4 + i * 72, 56), im4)
out.save(HERE / "preview_ui.png")
print("preview ->", HERE / "preview_ui.png")
s.stats()
