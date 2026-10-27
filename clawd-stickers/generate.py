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
# Классический Clawd 8x8: тело 8x6, ручки 2x2, ножки 1x2, глаза 1x1.
# Здесь он нарисован в масштабе x2, чтобы предметы и эмоции были детальнее:
# тело 16x12, ручки 4x4, ножки 2x4, глаза 2x2.
# (ox, oy) — левый верхний угол тела.
BW, BH = 16, 12
EYE_L = 2  # x левого глаза; правый — зеркально
EYE_Y = 2

EYES = {
    "open": ["##", "##"],
    "closed": ["####"],
    "happy": ["#..#", ".##."],          # спокойные дуги ‿
    "smile": [".##.", "#..#"],          # ^ ^
    "spiral": ["#####", "....#", ".##.#", ".#..#", ".####"],
}


def clawd(cv, ox, oy, eyes="open", look=0, arm_l="side", arm_r="side",
          legs=True, body=ORANGE):
    cv.rect(ox, oy, BW, BH, body)
    for side, arm in (("l", arm_l), ("r", arm_r)):
        ax = ox - 4 if side == "l" else ox + BW
        if arm == "side":
            cv.rect(ax, oy + 4, 4, 4, body)
        elif arm == "up":  # Г-образная поднятая ручка
            cv.rect(ax, oy + 4, 4, 4, body)
            cv.rect(ax if side == "l" else ax + 2, oy, 2, 4, body)
        elif arm == "long":  # вытянута в сторону, чтобы что-то держать
            cv.rect(ax - 2 if side == "l" else ax, oy + 4, 6, 4, body)
    if legs:
        for lx in (0, 4, 10, 14):
            cv.rect(ox + lx, oy + BH, 2, 4, body)
    pat = EYES.get(eyes)
    if pat is None:
        return
    pw, ph = len(pat[0]), len(pat)
    ey = oy + (EYE_Y + 1 if ph == 1 else EYE_Y - (ph - 2) // 2)
    xl = ox + EYE_L + 1 - pw // 2
    xr = ox + BW - 1 - (xl - ox) - (pw - 1)  # зеркально левому
    cv.stamp(xl + look, ey, pat, {"#": INK})
    cv.stamp(xr + look, ey, [r[::-1] for r in pat], {"#": INK})


# ------------------------------------------------------------- stickers ----
STICKERS = {}


def sticker(name, title):
    def deco(fn):
        STICKERS[name] = (title, fn)
        return fn
    return deco


@sticker("01-default", "Clawd")
def s_default(cv):
    clawd(cv, 4, 0)


@sticker("02-headphones", "Clawd в наушниках")
def s_headphones(cv):
    clawd(cv, 4, 4, eyes="happy")
    # дуга наушников
    cv.rect(6, 0, 12, 1, NAVY)
    cv.rect(4, 1, 2, 1, NAVY)
    cv.rect(18, 1, 2, 1, NAVY)
    cv.rect(3, 2, 1, 2, NAVY)
    cv.rect(20, 2, 1, 2, NAVY)
    # чашки
    cv.rect(2, 4, 3, 4, NAVY)
    cv.rect(19, 4, 3, 4, NAVY)
    cv.rect(3, 5, 1, 2, BLUE)
    cv.rect(20, 5, 1, 2, BLUE)
    note = ["..##", ".#.#", ".#..", "##..", "##.."]
    cv.stamp(25, 0, note, {"#": INK})


@sticker("03-laptop", "Clawd пишет код")
def s_laptop(cv):
    clawd(cv, 4, 4, look=1, arm_r=None)
    # ноутбук: экран к зрителю, Clawd печатает сбоку
    sx, sy = 27, 0
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
    cv.rect(sx - 5, sy + 12, 22, 2, GRAY)         # клавиатура
    cv.rect(sx - 5, sy + 14, 22, 1, DGRAY)
    for kx in range(sx - 3, sx + 15, 2):
        cv.set(kx, sy + 12, DGRAY)
    # рука тянется к клавиатуре
    cv.rect(20, 8, 4, 4, ORANGE)
    cv.rect(24, 10, 2, 3, ORANGE)
    cv.set(25, 7, YELLOW)                         # «искры» набора
    cv.set(24, 5, YELLOW)


@sticker("04-skateboard", "Clawd на скейте")
def s_skate(cv):
    clawd(cv, 5, 0, look=1, arm_l="up", legs=False)
    for lx in (0, 4, 10, 14):
        cv.rect(5 + lx, 12, 2, 2, ORANGE)
    # доска
    cv.rect(2, 14, 1, 1, MAROON)
    cv.rect(3, 15, 20, 1, MAROON)
    cv.rect(23, 14, 1, 1, MAROON)
    wheel = [".##.", "#oo#", "#oo#", ".##."]
    cv.stamp(5, 16, wheel, {"#": GOLD, "o": YELLOW})
    cv.stamp(17, 16, wheel, {"#": GOLD, "o": YELLOW})
    for y, w in ((3, 3), (6, 2), (9, 3)):         # линии скорости
        cv.rect(-1 - w, y, w, 1, GRAY)


@sticker("05-kite", "Clawd с воздушным змеем")
def s_kite(cv):
    clawd(cv, 4, 12, eyes="closed", look=1, arm_r="up")
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
    cv.stamp(24, 0, kite, {"#": GOLD, "y": YELLOW, "x": BROWN})
    for x, y in ((28, 9), (27, 10), (26, 11), (25, 11)):  # нитка
        cv.set(x, y, GRAY)
    for x, y, c in ((33, 5, GRAY), (34, 6, PINK), (34, 7, GRAY),
                    (35, 8, PINK), (35, 9, GRAY), (36, 10, PINK)):  # хвост
        cv.set(x, y, c)


@sticker("06-bubble", "Clawd надувает пузырь")
def s_bubble(cv):
    clawd(cv, 4, 6, look=1)
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
    cv.stamp(25, 0, bubble, {"#": SKY, "w": WHITE})
    cv.stamp(22, 6, [".#.", "#.#", ".#."], {"#": SKY})


@sticker("07-reading", "Clawd читает")
def s_reading(cv):
    clawd(cv, 4, 2, eyes=None, arm_r="long")
    # очки на всё лицо, взгляд вниз в книгу
    frame = ["######", "#....#", "#....#", "#....#", "######"]
    cv.stamp(4, 3, frame, {"#": MAROON})
    cv.stamp(14, 3, frame, {"#": MAROON})
    cv.rect(10, 4, 4, 1, MAROON)
    cv.rect(6, 5, 2, 2, INK)
    cv.rect(16, 5, 2, 2, INK)
    book = [
        "ccccc.ccccc",
        "cgggcccgggc",
        "ccccccccccc",
        "cggcccccggc",
        "ccccccccccc",
        "ppppppppppp",
    ]
    cv.stamp(26, 4, book, {"c": CREAM, "g": GRAY, "p": PURPLE})


@sticker("08-dizzy", "Clawd в шоке")
def s_dizzy(cv):
    clawd(cv, 4, 4, eyes="spiral")
    for x, y in ((1, 0), (11, 0), (22, 1)):
        cv.stamp(x, y, [".#.", "###", ".#."], {"#": YELLOW})


@sticker("09-excited", "Clawd > <")
def s_excited(cv):
    clawd(cv, 4, 0, eyes=None)
    cv.stamp(4 + 1, 1, ["#..", ".#.", "..#", ".#.", "#.."], {"#": INK})
    cv.stamp(4 + 12, 1, ["..#", ".#.", "#..", ".#.", "..#"], {"#": INK})


@sticker("10-love", "Clawd с сердечком")
def s_love(cv):
    clawd(cv, 7, 6, look=-1, arm_l="up")
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
    clawd(cv, 4, 6, eyes="happy", arm_r="long")
    mug = [
        "bbbbbb..",
        "cccccc##",
        "oooooo.#",
        "cccccc.#",
        "cccccc##",
        "cccccc..",
        ".cccc...",
    ]
    cv.stamp(26, 8, mug, {"b": BROWN, "c": CREAM, "o": ORANGE, "#": CREAM})
    for x, y in ((27, 5), (28, 4), (27, 3), (30, 6), (31, 5), (30, 4)):  # пар
        cv.set(x, y, GRAY)


@sticker("12-sleep", "Clawd спит")
def s_sleep(cv):
    clawd(cv, 4, 8, eyes="closed")
    z_big = ["#####", "...#.", "..#..", ".#...", "#####"]
    z_small = ["####", "..#.", ".#..", "####"]
    cv.stamp(22, 3, z_big, {"#": BLUE})
    cv.stamp(28, 0, z_small, {"#": SKY})


@sticker("13-thinking", "Clawd думает")
def s_think(cv):
    clawd(cv, 4, 10, look=1)
    cloud = [
        "..#######..",
        ".#wwwwwww#.",
        "#wwwwwwwww#",
        "#wwowowoww#",
        "#wwwwwwwww#",
        ".#wwwwwww#.",
        "..#######..",
    ]
    cv.stamp(19, 0, cloud, {"#": GRAY, "w": WHITE, "o": INK})
    cv.set(20, 7, GRAY)
    cv.set(19, 8, GRAY)


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
    cv.stamp(9, 2, hat, {"#": PURPLE, "p": YELLOW, "y": YELLOW})
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
    cv.stamp(4, 13, rocket, {"#": RED, "w": CREAM, "b": BLUE, "c": STEEL})
    flame = ["oy..", "ooyy", "ooyy", "oy.."]
    cv.stamp(23, 15, flame, {"y": YELLOW, "o": GOLD})
    for y, w in ((16, 3), (18, 2)):               # след
        cv.rect(28, y, w, 1, GRAY)


@sticker("16-bug", "Clawd нашёл баг")
def s_bug(cv):
    clawd(cv, 4, 4, look=1, arm_r="long")
    glass = [
        ".####.",
        "#ssss#",
        "#sssw#",
        "#ssss#",
        ".####.",
    ]
    cv.stamp(27, 3, glass, {"#": STEEL, "s": SKY, "w": WHITE})
    cv.set(26, 8, BROWN)                          # ручка лупы
    cv.set(27, 7, BROWN)
    bug = [
        "#...#",
        ".#.#.",
        "#ggg#",
        ".gkg.",
        "#ggg#",
    ]
    cv.stamp(27, 14, bug, {"#": INK, "g": GREEN, "k": INK})
    cv.stamp(23, 0, ["#", "#", ".", "#"], {"#": RED})


@sticker("17-wave", "Clawd машет")
def s_wave(cv):
    clawd(cv, 4, 3, eyes="smile", arm_r="up")
    for x, y in ((25, 2), (26, 3), (26, 4), (25, 5),
                 (27, 0), (28, 1), (28, 2), (28, 3), (28, 4), (27, 5)):
        cv.set(x, y, GRAY)


@sticker("18-cool", "Clawd в очках")
def s_cool(cv):
    ox = 4
    clawd(cv, ox, 0, eyes=None)
    cv.rect(ox, 2, 16, 1, INK)                    # дужка
    cv.rect(ox, 3, 6, 2, INK)                     # линзы
    cv.rect(ox + 10, 3, 6, 2, INK)
    cv.rect(ox + 1, 5, 4, 1, INK)
    cv.rect(ox + 11, 5, 4, 1, INK)
    cv.set(ox + 1, 3, WHITE)
    cv.set(ox + 11, 3, WHITE)


@sticker("19-error", "Clawd: что-то пошло не так")
def s_error(cv):
    clawd(cv, 4, 6, arm_l="up", arm_r="up")
    cv.stamp(11, 0, ["##", "##", "##", "..", "##"], {"#": RED})
    cv.stamp(17, 1, [".#.", ".#.", "###", "w##", "###"], {"#": SKY, "w": WHITE})


@sticker("20-terminal", "Clawd в терминале")
def s_terminal(cv):
    tw, th = 32, 27
    cv.rect(0, 0, tw, th, "#262624")
    cv.rect(0, 0, tw, 3, STEEL)
    for i, c in enumerate((RED, YELLOW, GREEN)):
        cv.set(2 + i * 2, 1, c)
    clawd(cv, 8, 5)
    cv.stamp(2, 22, ["#..", ".#.", "#.."], {"#": ORANGE})  # >_
    cv.rect(5, 24, 3, 1, CREAM)


@sticker("21-pixel7a", "Clawd фоткает на Pixel 7a")
def s_pixel7a(cv):
    # Clawd здесь крупнее: классические 8x8 в масштабе x3
    tx, ty, k = 0, 3, 3
    clawd8 = [
        "..########..",
        "..########..",
        "############",
        "############",
        "..########..",
        "..########..",
        "..#.#..#.#..",
        "..#.#..#.#..",
    ]
    for r, row in enumerate(clawd8):
        for c, ch in enumerate(row):
            if ch == "#":
                cv.rect(tx + c * k, ty + r * k, k, k, ORANGE)
    ox, oy = tx + 2 * k, ty                       # левый верхний угол тела
    cv.rect(ox + 3, oy + 4, 3, 1, INK)            # левый глаз прищурен
    cv.rect(ox + 18, oy + 2, 3, 3, INK)           # правый целится

    # Pixel 7a (Sea) горизонтально, задней крышкой к зрителю. Повёрнут так,
    # что визор — вертикальная полоса справа, камеры одна над другой,
    # вспышка под ними.
    F, B = "#8FB0CB", "#D3E5F1"
    V, S = "#B9CFE0", "#9EB7CC"
    pw, ph = 28, 14
    px, py = ox - 2, oy + 6
    under = {c: cv.px.get(c) for c in ((px, py), (px + pw - 1, py),
             (px, py + ph - 1), (px + pw - 1, py + ph - 1))}
    cv.rect(px, py, pw, ph, F)
    cv.rect(px + 1, py + 1, pw - 2, ph - 2, B)
    cv.rect(px + 16, py, 10, ph, V)               # визор
    cv.rect(px + 16, py, 1, ph, S)
    cv.rect(px + 25, py, 1, ph, S)
    cv.rect(px + 18, py + 1, 6, 10, INK)          # «таблетка»
    for x, y in ((18, 1), (23, 1), (18, 10), (23, 10)):
        cv.set(px + x, py + y, V)
    lens = [".oo.", "ocwo", "occo", ".oo."]
    for y in (2, 6):
        cv.stamp(px + 19, py + y, lens,
                 {"o": "#4A5D70", "c": "#16202A", "w": "#9FC3E0"})
    cv.rect(px + 20, py + 11, 2, 2, "#F7F5EC")    # вспышка
    for xy, c in under.items():                   # скруглённые углы
        cv.set(*xy, c)

    # блик вспышки
    cv.stamp(ox + 25, 0, ["...#...", "...#...", "..#w#..", "##www##",
                          "..#w#..", "...#...", "...#..."],
             {"#": YELLOW, "w": WHITE})
    for x, y in ((ox + 24, 8), (ox + 23, 9), (ox + 33, 1), (ox + 34, 0)):
        cv.set(x, y, YELLOW)


def main():
    out = Path(__file__).resolve().parent
    for name, (title, fn) in STICKERS.items():
        cv = Canvas()
        fn(cv)
        (out / f"{name}.svg").write_text(cv.to_svg(title), encoding="utf-8")
    print(f"{len(STICKERS)} stickers -> {out}")


if __name__ == "__main__":
    main()
