#!/usr/bin/env python3
"""Генератор пиксельных стикеров с Clawd (маскот Claude Code).

Каждый стикер рисуется на пиксельной сетке, затем соседние пиксели одного
цвета склеиваются в прямоугольники и сохраняются в SVG с crispEdges.
Без обводки и без фона — только плоские пиксели.

Запуск:  python3 generate.py            -> пересобирает все *.svg рядом
"""
from html import escape
from pathlib import Path

PX = 16  # размер одного «пикселя» в итоговом SVG (width/height)

# Палитра
ORANGE = "#D97757"   # тело Clawd
INK = "#1F1E1D"      # глаза, контуры предметов
WHITE = "#FFFFFF"
CREAM = "#F0EEE6"
GRAY = "#B0AEA5"
DGRAY = "#5E5D59"
STEEL = "#3D3D3A"
NAVY = "#2B4C7E"
BLUE = "#6A9BCC"
SKY = "#A7C7E7"
RED = "#D94B4B"
PINK = "#E88BA4"
YELLOW = "#F2C14E"
GOLD = "#E3A33B"
GREEN = "#6BAA5A"
LIME = "#9CCB6B"
PURPLE = "#7E6BC4"
MAROON = "#6B2737"
BROWN = "#8A5A3B"


class Canvas:
    def __init__(self):
        self.px = {}

    def set(self, x, y, c):
        if c is None:
            self.px.pop((x, y), None)
        else:
            self.px[(x, y)] = c

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, c)

    def stamp(self, x, y, rows, pal):
        """ASCII-спрайт: символ из pal -> цвет, '.' -> пропуск, ' ' -> стереть."""
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                if ch == ".":
                    continue
                self.set(x + dx, y + dy, None if ch == " " else pal[ch])

    def to_svg(self, title):
        xs = [p[0] for p in self.px]
        ys = [p[1] for p in self.px]
        x0, y0 = min(xs), min(ys)
        w, h = max(xs) - x0 + 1, max(ys) - y0 + 1
        # склеиваем горизонтальные отрезки, затем одинаковые отрезки по вертикали
        runs = {}
        for y in range(y0, y0 + h):
            x = x0
            while x < x0 + w:
                c = self.px.get((x, y))
                if c is None:
                    x += 1
                    continue
                s = x
                while self.px.get((x, y)) == c:
                    x += 1
                runs[(s, y)] = (x - s, c)
        rects = []
        used = set()
        for (s, y), (rw, c) in sorted(runs.items(), key=lambda k: (k[0][1], k[0][0])):
            if (s, y) in used:
                continue
            rh = 1
            while runs.get((s, y + rh)) == (rw, c):
                used.add((s, y + rh))
                rh += 1
            rects.append((s - x0, y - y0, rw, rh, c))
        by_color = {}
        for r in rects:
            by_color.setdefault(r[4], []).append(r)
        out = [
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w * PX}" height="{h * PX}" shape-rendering="crispEdges">',
            f"<title>{escape(title)}</title>",
        ]
        for c, rs in by_color.items():
            d = "".join(f"M{x} {y}h{rw}v{rh}h-{rw}z" for x, y, rw, rh, _ in rs)
            out.append(f'<path fill="{c}" d="{d}"/>')
        out.append("</svg>")
        return "\n".join(out) + "\n"


# ---------------------------------------------------------------- Clawd ----
# Тело 16x12, ручки по 3 пикселя по бокам, 4 ножки 2x4.
# (ox, oy) — левый верхний угол тела.
BW, BH = 16, 12
EYE_L, EYE_R = 3, 11  # x левого края каждого глаза (глаз 2 пикселя)
EYE_Y = 3

EYES = {
    "open": ["##", "##", "##"],
    "closed": ["####"],
    "happy": ["#..#", ".##."],          # спокойные дуги ‿
    "smile": [".##.", "#..#"],          # ^ ^
    "spiral": ["#####", "....#", ".##.#", ".#..#", ".####"],
    "dot": ["##", "##"],
}


def clawd(cv, ox, oy, eyes="open", look=0, arm_l="side", arm_r="side",
          legs=True, body=ORANGE):
    cv.rect(ox, oy, BW, BH, body)
    for side, arm in (("l", arm_l), ("r", arm_r)):
        ax = ox - 3 if side == "l" else ox + BW
        if arm == "side":
            cv.rect(ax, oy + 5, 3, 3, body)
        elif arm == "up":  # Г-образная поднятая ручка
            cv.rect(ax, oy + 5, 3, 3, body)
            cv.rect(ax if side == "l" else ax + 1, oy + 1, 2, 4, body)
        elif arm == "down":
            cv.rect(ax, oy + 7, 3, 3, body)
        elif arm == "long":  # вытянута вперёд/в сторону
            x = ax if side == "r" else ax - 3
            cv.rect(x, oy + 6, 6, 3, body)
    if legs:
        for lx in (1, 4, 10, 13):
            cv.rect(ox + lx, oy + BH, 2, 4, body)
    pat = EYES.get(eyes)
    if pat is None:
        return
    pw = len(pat[0])
    ey = oy + EYE_Y + (0 if len(pat) > 2 else 1)
    if eyes == "spiral":
        ey = oy + 2
    for ex in (EYE_L, EYE_R):
        x = ox + ex + 1 - pw // 2 + look
        rows = pat
        if eyes == "spiral" and ex == EYE_R:
            rows = [r[::-1] for r in pat]
        cv.stamp(x, ey, rows, {"#": INK})


def eyes_custom(cv, ox, oy, left, right, y=EYE_Y, pal=None):
    pal = pal or {"#": INK}
    cv.stamp(ox + EYE_L - (len(left[0]) - 2) // 2, oy + y, left, pal)
    cv.stamp(ox + EYE_R - (len(right[0]) - 2) // 2, oy + y, right, pal)


# ------------------------------------------------------------- stickers ----
STICKERS = {}


def sticker(name, title):
    def deco(fn):
        STICKERS[name] = (title, fn)
        return fn
    return deco


@sticker("01-default", "Clawd")
def s_default(cv):
    clawd(cv, 3, 0)


@sticker("02-headphones", "Clawd в наушниках")
def s_headphones(cv):
    clawd(cv, 3, 4, eyes="happy")
    # дуга наушников
    cv.rect(5, 0, 12, 1, NAVY)
    cv.rect(3, 1, 2, 1, NAVY)
    cv.rect(17, 1, 2, 1, NAVY)
    cv.rect(2, 2, 1, 3, NAVY)
    cv.rect(19, 2, 1, 3, NAVY)
    # чашки
    cv.rect(1, 5, 3, 5, NAVY)
    cv.rect(18, 5, 3, 5, NAVY)
    cv.rect(2, 6, 1, 3, BLUE)
    cv.rect(19, 6, 1, 3, BLUE)
    # ноты
    note = ["..##", ".#.#", ".#..", "##..", "##.."]
    cv.stamp(23, 0, note, {"#": INK})


@sticker("03-laptop", "Clawd пишет код")
def s_laptop(cv):
    clawd(cv, 3, 4, look=1, arm_r=None)
    # ноутбук: экран к зрителю, Clawd печатает сбоку
    sx, sy = 24, 0
    cv.rect(sx, sy, 15, 12, STEEL)                # рамка
    cv.rect(sx + 1, sy + 1, 13, 10, "#262624")    # экран
    code = [
        (2, 2, 3, PURPLE), (6, 2, 5, BLUE),
        (3, 4, 4, ORANGE), (8, 4, 3, LIME),
        (3, 6, 2, BLUE), (6, 6, 5, CREAM),
        (2, 8, 2, PURPLE),
    ]
    for x, y, w, c in code:
        cv.rect(sx + x, sy + y, w, 1, c)
    cv.rect(sx + 5, sy + 8, 1, 2, WHITE)          # курсор
    cv.rect(sx - 4, sy + 12, 21, 2, GRAY)         # клавиатура
    cv.rect(sx - 4, sy + 14, 21, 1, DGRAY)
    for kx in range(sx - 2, sx + 15, 2):
        cv.set(kx, sy + 12, DGRAY)
    # рука на клавиатуре
    cv.rect(19, 9, 3, 3, ORANGE)
    cv.rect(21, 11, 3, 2, ORANGE)
    # «искры» набора
    cv.set(22, 8, YELLOW)
    cv.set(21, 6, YELLOW)


@sticker("04-skateboard", "Clawd на скейте")
def s_skate(cv):
    clawd(cv, 4, 0, look=1, arm_l="up", arm_r="side", legs=False)
    for lx in (1, 4, 10, 13):
        cv.rect(4 + lx, 12, 2, 2, ORANGE)
    # доска
    cv.rect(2, 14, 1, 1, MAROON)
    cv.rect(3, 15, 18, 1, MAROON)
    cv.rect(21, 14, 1, 1, MAROON)
    # колёса
    wheel = [".##.", "#oo#", "#oo#", ".##."]
    cv.stamp(5, 16, wheel, {"#": GOLD, "o": YELLOW})
    cv.stamp(15, 16, wheel, {"#": GOLD, "o": YELLOW})
    # линии скорости
    for y, w in ((3, 3), (6, 2), (9, 3)):
        cv.rect(-1 - w, y, w, 1, GRAY)


@sticker("05-kite", "Clawd с воздушным змеем")
def s_kite(cv):
    clawd(cv, 3, 12, eyes="closed", look=1, arm_r="up")
    kite = [
        "....#....",
        "...#y#...",
        "..#yxy#..",
        ".#yyxyy#.",
        "#xxxxxxx#",
        ".#yyxyy#.",
        "..#yxy#..",
        "...#y#...",
        "....#....",
    ]
    cv.stamp(20, 0, kite, {"#": GOLD, "y": YELLOW, "x": BROWN})
    for x, y in ((24, 9), (23, 10), (22, 11), (21, 12)):  # нитка
        cv.set(x, y, GRAY)
    for x, y, c in ((29, 5, GRAY), (30, 6, PINK), (30, 7, GRAY),
                    (31, 8, PINK), (31, 9, GRAY), (32, 10, PINK)):  # хвост
        cv.set(x, y, c)

@sticker("06-bubble", "Clawd надувает пузырь")
def s_bubble(cv):
    clawd(cv, 3, 6, look=1)
    bubble = [
        "..####..",
        ".#....#.",
        "#...ww.#",
        "#....w.#",
        "#......#",
        "#......#",
        ".#....#.",
        "..####..",
    ]
    cv.stamp(22, 0, bubble, {"#": SKY, "w": WHITE})
    cv.stamp(20, 9, [".#.", "#.#", ".#."], {"#": SKY})


@sticker("07-reading", "Clawd читает")
def s_reading(cv):
    clawd(cv, 3, 2, eyes=None, arm_r="long")
    # очки, взгляд вниз в книгу
    frame = ["######", "#....#", "#....#", "#....#", "######"]
    cv.stamp(4, 4, frame, {"#": MAROON})
    cv.stamp(12, 4, frame, {"#": MAROON})
    cv.rect(10, 5, 2, 1, MAROON)
    cv.rect(7, 7, 2, 2, INK)
    cv.rect(15, 7, 2, 2, INK)
    book = [
        "ccccc.ccccc",
        "cgggcccgggc",
        "ccccccccccc",
        "cggcccccggc",
        "ccccccccccc",
        "ppppppppppp",
    ]
    cv.stamp(23, 6, book, {"c": CREAM, "g": GRAY, "p": PURPLE})

@sticker("08-dizzy", "Clawd в шоке")
def s_dizzy(cv):
    clawd(cv, 3, 3, eyes="spiral")
    for x, y in ((1, 0), (11, 0), (20, 1)):
        cv.stamp(x, y, [".#.", "###", ".#."], {"#": YELLOW})


@sticker("09-excited", "Clawd > <")
def s_excited(cv):
    clawd(cv, 3, 0, eyes=None)
    eyes_custom(cv, 3, 0,
                ["#..", ".#.", "..#", ".#.", "#.."],
                ["..#", ".#.", "#..", ".#.", "..#"], y=2)


@sticker("10-love", "Clawd с сердечком")
def s_love(cv):
    clawd(cv, 6, 5, look=-1, arm_l="up")
    heart = [
        ".##.##.",
        "#######",
        "#######",
        ".#####.",
        "..###..",
        "...#...",
    ]
    cv.stamp(0, 0, heart, {"#": RED})
    cv.set(1, 1, PINK)


@sticker("11-coffee", "Clawd с кофе")
def s_coffee(cv):
    clawd(cv, 3, 6, eyes="happy", arm_r="long")
    mug = [
        "bbbbbb..",
        "cccccc##",
        "oooooo.#",
        "cccccc.#",
        "cccccc##",
        "cccccc..",
        ".cccc...",
    ]
    cv.stamp(25, 9, mug, {"b": BROWN, "c": CREAM, "o": ORANGE, "#": CREAM})
    for x, y in ((26, 6), (27, 5), (26, 4), (29, 7), (30, 6), (29, 5)):  # пар
        cv.set(x, y, GRAY)

@sticker("12-sleep", "Clawd спит")
def s_sleep(cv):
    clawd(cv, 1, 8, eyes="closed")
    z_big = ["#####", "...#.", "..#..", ".#...", "#####"]
    z_small = ["####", "..#.", ".#..", "####"]
    cv.stamp(18, 3, z_big, {"#": BLUE})
    cv.stamp(24, 0, z_small, {"#": SKY})

@sticker("13-thinking", "Clawd думает")
def s_think(cv):
    clawd(cv, 1, 9, look=1)
    cloud = [
        "..#######..",
        ".#wwwwwww#.",
        "#wwwwwwwww#",
        "#wwowowoww#",
        "#wwwwwwwww#",
        ".#wwwwwww#.",
        "..#######..",
    ]
    cv.stamp(16, 0, cloud, {"#": GRAY, "w": WHITE, "o": INK})
    cv.set(18, 7, GRAY)
    cv.set(17, 8, GRAY)

@sticker("14-party", "Clawd празднует")
def s_party(cv):
    clawd(cv, 4, 8, eyes="smile", arm_l="up", arm_r="up")
    hat = [
        "...y...",
        "...#...",
        "..#p#..",
        "..###..",
        ".#p#p#.",
        "#######",
    ]
    cv.stamp(8, 2, hat, {"#": PURPLE, "p": YELLOW, "y": YELLOW})
    confetti = [(0, 2, RED), (2, 5, BLUE), (19, 1, GREEN), (23, 4, RED),
                (25, 1, YELLOW), (1, 0, YELLOW), (21, 6, PINK), (16, 0, BLUE)]
    for x, y, c in confetti:
        cv.rect(x, y, 1, 2, c)


@sticker("15-rocket", "Clawd: ship it!")
def s_rocket(cv):
    clawd(cv, 6, 0, eyes="smile", look=-1, arm_l="up", arm_r="up")
    rocket = [
        "...........##......",
        ".........######....",
        "......##wwwwwwww#..",
        "...#wwwwwwbbwwwwwcc",
        ".#wwwwwwwwbbwwwwwcc",
        "..#wwwwwwwwwwwwwwcc",
        "......##wwwwwwww#..",
        ".........######....",
        "...........##......",
    ]
    cv.stamp(4, 12, rocket, {"#": RED, "w": CREAM, "b": BLUE, "c": STEEL})
    flame = ["oy..", "ooyy", "ooyy", "oy.."]
    cv.stamp(23, 14, flame, {"y": YELLOW, "o": GOLD})
    for y, w in ((15, 3), (17, 2)):  # след
        cv.rect(28, y, w, 1, GRAY)

@sticker("16-bug", "Clawd нашёл баг")
def s_bug(cv):
    clawd(cv, 3, 4, look=1, arm_r="long")
    # лупа
    glass = [
        ".####.",
        "#ssss#",
        "#sssw#",
        "#ssss#",
        ".####.",
    ]
    cv.stamp(25, 5, glass, {"#": STEEL, "s": SKY, "w": WHITE})
    cv.rect(24, 10, 2, 1, BROWN)
    cv.rect(23, 11, 1, 1, BROWN)
    # жучок
    bug = [
        "#...#",
        ".#.#.",
        "#ggg#",
        ".gkg.",
        "#ggg#",
    ]
    cv.stamp(26, 14, bug, {"#": INK, "g": GREEN, "k": INK})
    cv.stamp(22, 0, ["#", "#", ".", "#"], {"#": RED})


@sticker("17-wave", "Clawd машет")
def s_wave(cv):
    clawd(cv, 3, 3, eyes="smile", arm_r="up")
    for x, y in ((23, 3), (24, 4), (24, 5), (23, 6),
                 (25, 1), (26, 2), (26, 3), (26, 4), (26, 5), (25, 6)):
        cv.set(x, y, GRAY)

@sticker("18-cool", "Clawd в очках")
def s_cool(cv):
    clawd(cv, 3, 0, eyes=None)
    cv.rect(3 + 1, 3, 14, 1, INK)
    cv.rect(3 + 1, 4, 6, 3, INK)
    cv.rect(3 + 9, 4, 6, 3, INK)
    cv.rect(3 + 2, 6, 4, 1, INK)
    cv.set(3 + 2, 4, WHITE)
    cv.set(3 + 10, 4, WHITE)
    cv.rect(3 + 0, 3, 1, 1, INK)
    cv.rect(3 + 15, 3, 1, 1, INK)


@sticker("19-error", "Clawd: что-то пошло не так")
def s_error(cv):
    clawd(cv, 3, 6, eyes="dot", arm_l="up", arm_r="up")
    cv.stamp(10, 0, ["##", "##", "##", "..", "##"], {"#": RED})
    cv.stamp(16, 1, [".#.", ".#.", "###", "w##", "###"], {"#": SKY, "w": WHITE})

@sticker("20-terminal", "Clawd в терминале")
def s_terminal(cv):
    tw, th = 30, 27
    cv.rect(0, 0, tw, th, "#262624")
    cv.rect(0, 0, tw, 3, STEEL)
    for i, c in enumerate((RED, YELLOW, GREEN)):
        cv.set(2 + i * 2, 1, c)
    clawd(cv, 7, 5)
    cv.stamp(2, 22, ["#..", ".#.", "#.."], {"#": ORANGE})  # >_
    cv.rect(5, 24, 3, 1, CREAM)

def main():
    out = Path(__file__).resolve().parent
    for name, (title, fn) in STICKERS.items():
        cv = Canvas()
        fn(cv)
        (out / f"{name}.svg").write_text(cv.to_svg(title), encoding="utf-8")
    print(f"{len(STICKERS)} stickers -> {out}")


if __name__ == "__main__":
    main()
