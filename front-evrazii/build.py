#!/usr/bin/env python3
"""Сборка: python3 build.py  ->  index.html (один файл, всё внутри)."""
import os
here = os.path.dirname(os.path.abspath(__file__))
r = lambda n: open(os.path.join(here, 'src', n), encoding='utf8').read()
JS = ['g_names.js', 'g_data.js', 'g_data2.js', 'g_world.js', 'g_sim.js', 'g_render.js', 'lib_sfx.js', 'g_ui.js']
css, topo, cities = r('g_style.css'), r('world.json'), r('cities.json')
for blob in (topo, cities): assert '</script' not in blob.lower()
js = '\n'.join(r(n) for n in JS)
body = ('<div id="app"><div id="stage"><canvas id="map"></canvas></div><div id="topstack"><div id="hud" class="pxbox"></div>'
        '<div id="modebar" class="pxbox" hidden></div><div id="toasts"></div></div><aside id="panel" class="pxbox" hidden></aside><div id="modal" hidden></div></div>')
fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap">'
head = f'<title>Фронт Евразии</title>\n{fonts}\n<style>\n{css}\n</style>\n'
rest = (f'{body}\n<script type="application/json" id="topo">{topo}</script>\n<script type="application/json" id="citydata">{cities}</script>\n'
        f'<script>{r("d3.min.js")}</script>\n<script>{r("topojson-client.min.js")}</script>\n<script>\n{js}\n</script>\n')
page = ('<!doctype html>\n<html lang="ru"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n'
        + head + '</head><body>\n' + rest + '</body></html>\n')
open(os.path.join(here, 'index.html'), 'w', encoding='utf8').write(page)
print(len(page) // 1024, 'KB -> index.html')
