#!/usr/bin/env python3
"""App-Icons: Kleiderbügel, cremefarben auf warmem Tiefschwarz.
Vierfaches Supersampling für saubere Kanten – ohne das wirkt es gebastelt."""
import struct, zlib

BG = (26, 21, 18)
FG = (235, 223, 211)
SS = 4  # Supersampling-Faktor


def write_png(path, w, h, rows):
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    raw = b''.join(b'\x00' + bytes(v for px in row for v in px) for row in rows)
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    open(path, 'wb').write(png)


def near_seg(px, py, ax, ay, bx, by, w):
    dx, dy = bx - ax, by - ay
    ll = dx * dx + dy * dy
    t = 0.0 if ll == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / ll))
    qx, qy = ax + t * dx, ay + t * dy
    return (px - qx) ** 2 + (py - qy) ** 2 <= (w / 2) ** 2


def is_fg(fx, fy):
    """Kleiderbügel in normierten Koordinaten."""
    stroke = 0.052
    hook_cx, hook_cy, hook_r = 0.50, 0.268, 0.068
    apex_x, apex_y = 0.50, 0.415
    bar_y, bar_l, bar_r = 0.600, 0.205, 0.795
    # Geschlossener Ring als Haken – ein offener Bogen wirkt vom Hals abgetrennt
    d = ((fx - hook_cx) ** 2 + (fy - hook_cy) ** 2) ** 0.5
    if abs(d - hook_r) <= stroke / 2:
        return True
    if near_seg(fx, fy, hook_cx, hook_cy + hook_r, apex_x, apex_y, stroke):
        return True
    if near_seg(fx, fy, apex_x, apex_y, bar_l, bar_y, stroke):
        return True
    if near_seg(fx, fy, apex_x, apex_y, bar_r, bar_y, stroke):
        return True
    if near_seg(fx, fy, bar_l, bar_y, bar_r, bar_y, stroke):
        return True
    return False


def draw(size):
    rows = []
    for y in range(size):
        row = []
        for x in range(size):
            hits = 0
            for sy in range(SS):
                for sx in range(SS):
                    fx = (x + (sx + 0.5) / SS) / size
                    fy = (y + (sy + 0.5) / SS) / size
                    if is_fg(fx, fy):
                        hits += 1
            a = hits / (SS * SS)
            row.append(tuple(round(BG[i] + (FG[i] - BG[i]) * a) for i in range(3)))
        rows.append(row)
    return rows


for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png'),
                   (180, 'apple-touch-icon.png'), (1024, 'icon-1024.png')]:
    write_png(name, size, size, draw(size))
    print('geschrieben:', name)
