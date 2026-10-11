"""Last Watt UI icons: 16x16, 31 frames x 1 row, fps 0 (see pixel-art/README.md).

14x14 content inside a 1 px margin, 1 px #10141f outline (added outside the fill, so every
fill stays inside x/y 2..13). Light from the upper left. Building icons echo their building
sprites: iron bodies, amber glass, brass trim, reddish plinths; the Lab is the one cool-blue
building; the Beacon is the one red light. Enemy icons (moth .. pall) are each enemy's head or
whole silhouette in its own Dim colours with its pale eyes, for the counts in the next-wave
preview: each has a different shape and a different main colour so they part at 1x.
The order is the frame order the game indexes by name: append new icons, never reorder.
Run: python3 build.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F401,F403

HERE = Path(__file__).resolve().parent
NAMES = ["lamp", "floodlight", "beacon", "node", "extractor", "burner", "jar", "lab", "kw",
         "money", "light", "rock", "research", "overcharge", "shed",
         # appended 2026-10-11 (keep the order above untouched)
         "searchlight", "brazier", "starshell", "vane", "wind", "upgrade",
         "moth", "flit", "shade", "veil", "snuffer", "pall",
         "pause", "wave", "tutorial", "lock"]

C = {
    "o": OUTLINE,
    "1": "#202e37", "2": "#394a50", "3": "#577277", "4": "#819796", "5": "#a8b5b2",
    "B": "#602c2c", "b": "#884b2b", "r": "#be772b", "R": "#de9e41", "Y": "#e8c170",
    "W": "#ebede9",
    "e": "#752438", "E": "#a53030", "f": "#cf573c", "g": "#da863e",
    "c": "#253a5e", "C": "#3c5e8b", "n": "#4f8fba", "N": "#73bed3", "M": "#a4dddb",
    "k": "#241527", "K": "#341c27", "s": "#4d2b32", "S": "#7a4841",
    # the Dim (enemy icons)
    "v": "#090a14", "x": "#151d28", "z": "#172038", "d": "#1e1d39", "p": "#402751",
    "P": "#7a367b", "q": "#c7cfcc",
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


# ---- appended 2026-10-11 ---------------------------------------------------------------------

ICONS["searchlight"] = [  # a drum lamp, its big lens to the right, in a cradle on a tall mast
    "................",
    "................",
    "....44444YY.....",
    "...322222YWWY...",
    "...321111WWWY...",
    "...321111WWWR...",
    "...321111YWYR...",
    "...211111RYRR...",
    "......3442......",
    ".......32.......",
    ".......32.......",
    ".......32.......",
    "......3221......",
    "....SSSSSSss....",
    "................",
    "................",
]
ICONS["brazier"] = [  # an iron fire basket on three legs, flames standing up out of it
    "................",
    "................",
    ".......f....f...",
    "......fg...fg...",
    ".....fgRf.fRg...",
    ".....gRYgfgYRf..",
    "....fRYWYRYWRg..",
    "....gRYWWYWYRg..",
    "...34444444442..",
    "...3gfEgfEgfE1..",
    "....3EgfEgfE1...",
    ".....3222221....",
    ".....3..2..1....",
    "....3...2...1...",
    "................",
    "................",
]
def draw_starshell():
    """A fat, stubby brass mortar (an iron band, the shell glowing white-hot in its bore),
    cocked a little to the right on an iron bed, a spark and the shell's glow leaving it.
    Echoes the Starshell building: brass barrel, iron bed, reddish plinth."""
    rows = [  # (y, x0, colours left to right): the barrel leans right as it rises
        (4, 6, "YRRrb"),     # far rim
        (5, 6, "RWWYb"),     # the bore, the shell glowing in it
        (6, 5, "YRRRrb"),    # near rim
        (7, 5, "344321"),    # iron band
        (8, 4, "YRRrrb"),
        (9, 4, "RRrrbB"),
        (10, 4, "Rrrbb"),
    ]
    for y, x0, cs in rows:
        for k, c in enumerate(cs):
            s.px(x0 + k, y, C[c])
    s.rect(3, 11, 11, 11, C["2"])                # iron bed
    s.px(3, 11, C["3"])
    s.px(11, 11, C["1"])
    s.rect(2, 12, 12, 12, C["S"])                # plinth
    s.px(12, 12, C["s"])
    s.px(11, 12, C["s"])
    s.px(10, 3, C["g"])                          # sparks off the shell
    s.px(12, 2, C["Y"])
    s.px(11, 2, C["f"])
ICONS["upgrade"] = [  # a heavy brass up-arrow
    "................",
    "................",
    ".......YR.......",
    "......YYRr......",
    ".....YYRRrr.....",
    "....YYRRRrrb....",
    "...YYRRRRRrrb...",
    "..YRRRRRRRRrrb..",
    "..bbbbYRrrbbbB..",
    "......YRrb......",
    "......YRrb......",
    "......YRrb......",
    "......YRrb......",
    "......bbbB......",
    "................",
    "................",
]
ICONS["shade"] = [  # the hood: cowl point streaming back, dark opening, two cold eyes
    "................",
    "................",
    "..PP............",
    "..PPPP..........",
    "...PPPPPp.......",
    "...PPPPpppp.....",
    "...PPppvvvvp....",
    "...Pppvvvvvvp...",
    "...ppvMMvMvvp...",
    "...ppvvvvvvvp...",
    "...pppvvvvvp....",
    "...dpppppppd....",
    "....ddddddd.....",
    "................",
    "................",
    "................",
]
ICONS["snuffer"] = [  # the bell head, eyes under the lip, a soot-brown shoulder behind
    "................",
    "........44......",
    "......44333.....",
    ".....4433322....",
    ".....4533222....",
    ".....4533221....",
    ".....4533221....",
    "....445332221...",
    "...44443333222..",
    "...11222222111..",
    "..sKKvvvMvvMv...",
    "..sKKKKkkkkk....",
    "..KKKKKkkk......",
    "................",
    "................",
    "................",
]
ICONS["pall"] = [  # the shaggy mound: hump behind, head sunk low, a brow and two small eyes
    "................",
    "................",
    "....p.p.p.......",
    "...ppppppp......",
    "..pppdddpdd.....",
    "..ppddzdddzdd...",
    "..pddzddzdzddd..",
    "..pdddzdddvvvd..",
    "..ddzdddzdvMvM..",
    "..dzddzdddvvvd..",
    "..dzzdzzdzzzzd..",
    "..zdz.zdz.zdz...",
    "................",
    "................",
    "................",
    "................",
]
ICONS["pause"] = [  # two bars
    "................",
    "................",
    "................",
    "....544..544....",
    "....543..543....",
    "....443..443....",
    "....433..433....",
    "....433..433....",
    "....433..433....",
    "....433..433....",
    "....433..433....",
    "....332..332....",
    "................",
    "................",
    "................",
    "................",
]
ICONS["tutorial"] = [  # a brass question mark
    "................",
    "................",
    ".....YYYRr......",
    "....YRbbRRr.....",
    "....Rb...RR.....",
    "........RRb.....",
    ".......RRb......",
    "......YRb.......",
    "......Rb........",
    "......Rb........",
    "................",
    "......YR........",
    "......Rb........",
    "................",
    "................",
    "................",
]
ICONS["lock"] = [  # an iron shackle on a brass padlock body, keyhole
    "................",
    "................",
    "......5443......",
    ".....43..32.....",
    ".....4....2.....",
    ".....4....2.....",
    ".....3....1.....",
    "...YYYYYRRRr....",
    "...YRRRRRRrb....",
    "...YRRRoorrb....",
    "...RRRRoorrb....",
    "...RRrrrorrb....",
    "...Rrrrrrrbb....",
    "...bbbbbbbbB....",
    "................",
    "................",
]


def mirrored(half, dim):
    return [r + r[::-1].translate(str.maketrans(dim)) for r in half]


ICONS["moth"] = mirrored([  # wings spread, furry body, feathery antennae, pale eyes
    "........",
    "........",
    "....3...",
    "..q..3..",
    "..qq..pp",
    "..q44.qp",
    "..q443qq",
    "...4433q",
    "....33.4",
    "...4433p",
    "..44433p",
    "..433..p",
    "...3....",
    "........",
    "........",
    "........",
], {"q": "4", "4": "3", "3": "2"})
# both eyes pale (the mirror dimmed the right one)
ICONS["moth"][5] = ICONS["moth"][5][:9] + "q" + ICONS["moth"][5][10:]


def draw_flit():
    """A round dusk-blue head with one pale eye, tapering back into wisps (the wisps are drawn
    after the outline, in post_flit, so they stay thin)."""
    rows = {5: (9, 11), 6: (8, 12), 7: (6, 13), 8: (6, 13), 9: (8, 12), 10: (9, 11)}
    m = {(x, y) for y, (a, b) in rows.items() for x in range(a, b + 1)}
    m |= {(5, 7), (5, 8)}
    for x, y in m:
        if (x, y) == (11, 7):
            c = C["M"]
        elif x + y <= 15 or ((x - 1, y) not in m and y < 9) or ((x, y - 1) not in m and x < 12):
            c = C["C"]
        elif x + y >= 20 or y >= 10 or ((x + 1, y) not in m and y > 7):
            c = C["z"]
        else:
            c = C["c"]
        s.px(x, y, c)


def post_flit():
    for pts in ([(4, 6), (3, 5), (2, 5)], [(4, 8), (3, 8), (2, 9), (1, 9)],
                [(5, 10), (4, 11), (3, 11), (2, 12)]):
        for k, (x, y) in enumerate(pts):
            s.px(x, y, C["C"] if k == 0 else (C["c"] if k < len(pts) - 1 else C["d"]))
    s.px(9, 5, C["Y"])
    s.px(8, 6, C["R"])


def draw_veil():
    """A tall pleated drape: scalloped gather on top, two pinprick eyes between pleats,
    a ragged hem."""
    stripe = [C["3"], C["2"], C["1"], C["d"]]
    for x in (5, 7, 8, 10):
        s.px(x, 2, C["3"])
    for y in range(3, 13):
        xl, xr = 4 - (y - 3) // 4, 11 + (y - 3) // 4
        for x in range(xl, xr + 1):
            c = stripe[(x - xl) % 4]
            if y == 3:
                c = C["4"] if (x - xl) % 4 < 2 else C["3"]
            elif y >= 7 and c != C["d"]:
                c = {C["3"]: C["2"], C["2"]: C["1"], C["1"]: C["d"]}[c]
            s.px(x, y, c)
    for x in range(3, 13, 2):
        s.px(x, 13, C["1"] if x < 8 else C["d"])
    for ex in (7, 10):                           # pinprick eyes in the gaps between pleats
        s.px(ex, 4, C["v"])
        s.px(ex - 1, 5, C["v"])
        s.px(ex + 1, 5, C["d"])
        s.px(ex, 5, C["q"])
        s.px(ex, 6, C["v"])


def post_veil():
    s.px(5, 2, C["Y"])
    s.px(4, 3, C["R"])


def draw_vane():
    """A four-sail wind wheel (sails on the diagonals) with a brass hub, on a lattice mast."""
    s.line(7, 8, 7, 12, C["3"])                 # mast
    s.line(8, 8, 8, 12, C["2"])
    s.px(6, 12, C["3"])
    s.px(9, 12, C["1"])
    s.rect(4, 13, 11, 13, C["S"])               # plinth
    s.px(11, 13, C["s"])
    s.px(10, 13, C["s"])
    for (x0, y0), (x1, y1), lit in (((6, 4), (3, 2), "5"), ((9, 4), (12, 2), "4"),
                                    ((6, 7), (3, 10), "4"), ((9, 7), (12, 10), "3")):
        s.line(x0, y0, x1, y1, C[lit])
    for (x0, y0), (x1, y1) in (((6, 3), (5, 2)), ((10, 4), (12, 3)),
                               ((5, 7), (3, 9)), ((9, 8), (11, 10))):
        s.line(x0, y0, x1, y1, C["2"])
    s.rect(7, 5, 8, 6, C["R"])                  # hub
    s.px(7, 5, C["Y"])
    s.px(8, 6, C["r"])


def draw_wind():
    """Three gust lines, each ending in a curl."""
    for y, x0, x1, curl in ((4, 3, 9, [(10, 3), (10, 2)]),
                            (8, 2, 11, [(12, 7), (12, 6)]),
                            (12, 4, 8, [(9, 11), (9, 10)])):
        for x in range(x0, x1 + 1):
            s.px(x, y, C["5"] if x < (x0 + x1) // 2 else C["4"])
        for k, (x, yy) in enumerate(curl):
            s.px(x, yy, C["4"] if k < len(curl) - 1 else C["3"])


def draw_wave():
    """Two rolling crests of the Dim, pale foam on their tops."""
    for base, amp in ((5, 1.6), (10, 1.6)):
        for x in range(2, 14):
            ph = math.sin((x - 2) * 2 * math.pi / 6)
            yc = base + round(amp * ph)
            s.px(x, yc, C["q"] if ph < -0.3 else C["P"])
            s.px(x, yc + 1, C["p"])
            if yc + 2 <= 13:
                s.px(x, yc + 2, C["d"])


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
        "overcharge": draw_overcharge, "shed": draw_shed,
        "flit": draw_flit, "veil": draw_veil, "vane": draw_vane, "wind": draw_wind,
        "starshell": draw_starshell,
        "wave": draw_wave}
POST = {"flit": post_flit, "veil": post_veil}   # drawn after the outline (thin wisps, rims)

for i, name in enumerate(NAMES):
    if i:
        s.add_frame(copy=False)
    if name in ICONS:
        grid(ICONS[name])
    else:
        DRAW[name]()
    s.outline(OUTLINE, where="outside")
    if name in POST:
        POST[name]()

export(s, "icons", fps=0, rows=1, names=NAMES)

# preview: all icons at 1x (two rows of 16) and 4x (rows of 16) over the HUD-ish dark panel,
# then the enemy icons at 1x and 2x as the next-wave preview shows them
bg = (21, 29, 40)
n = len(NAMES)
PER = 16
rows4 = (n + PER - 1) // PER
top4 = 4 + rows4 * 18 + 4
low = top4 + rows4 * 72 + 4
out = Image.new("RGB", (PER * 72 + 8, low + 40), bg)
for i in range(n):
    im = s.composite(i + 1)
    r, c = divmod(i, PER)
    out.paste(im, (4 + c * 18, 4 + r * 18), im)
    im4 = im.resize((64, 64), Image.NEAREST)
    out.paste(im4, (4 + c * 72, top4 + r * 72), im4)
ex = 4
for name in ("moth", "flit", "shade", "veil", "snuffer", "pall"):
    im = s.composite(NAMES.index(name) + 1)
    out.paste(im, (ex, low + 8), im)
    im2 = im.resize((32, 32), Image.NEAREST)
    out.paste(im2, (ex + 20, low), im2)
    ex += 64
out.save(HERE / "preview_ui.png")
print("preview ->", HERE / "preview_ui.png")
s.stats()
