#!/usr/bin/env python3
"""Erzeugt die PWA-Icons (Kleiderbügel) als PNG ohne externe Libraries."""
import struct, zlib


def write_png(path, w, h, rows):
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    raw = b''.join(b'\x00' + bytes(v for px in row for v in px) for row in rows)
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)


def near_seg(px, py, ax, ay, bx, by, w):
    """True, wenn (px,py) höchstens w/2 von der Strecke a–b entfernt liegt."""
    dx, dy = bx - ax, by - ay
    ll = dx * dx + dy * dy
    t = 0.0 if ll == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / ll))
    qx, qy = ax + t * dx, ay + t * dy
    return (px - qx) ** 2 + (py - qy) ** 2 <= (w / 2) ** 2


def draw(size):
    bg_top, bg_bot = (145, 96, 72), (110, 68, 49)
    white = (255, 255, 255)
    stroke = 0.030
    hook_cx, hook_cy, hook_r = 0.50, 0.215, 0.058
    apex_x, apex_y = 0.50, 0.335
    bar_y, bar_l, bar_r = 0.49, 0.215, 0.785
    rows = []
    for y in range(size):
        fy = y / size
        base = tuple(round(bg_top[i] + (bg_bot[i] - bg_top[i]) * fy) for i in range(3))
        row = []
        for x in range(size):
            fx = x / size
            px = base
            # Haken: oberer Halbkreis
            d = ((fx - hook_cx) ** 2 + (fy - hook_cy) ** 2) ** 0.5
            if abs(d - hook_r) <= stroke / 2 and fy <= hook_cy + 0.01:
                px = white
            # Hals zwischen Haken und Spitze
            if near_seg(fx, fy, hook_cx, hook_cy + hook_r - 0.005, apex_x, apex_y, stroke):
                px = white
            # Schultern
            if near_seg(fx, fy, apex_x, apex_y, bar_l, bar_y, stroke):
                px = white
            if near_seg(fx, fy, apex_x, apex_y, bar_r, bar_y, stroke):
                px = white
            # Querstange
            if near_seg(fx, fy, bar_l, bar_y, bar_r, bar_y, stroke):
                px = white
            row.append(px)
        rows.append(row)
    return rows


for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png'), (180, 'apple-touch-icon.png')]:
    write_png(name, size, size, draw(size))
    print('geschrieben:', name)
