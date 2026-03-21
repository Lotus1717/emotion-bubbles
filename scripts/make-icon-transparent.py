#!/usr/bin/env python3
"""
将方形 Logo 外围浅色背景转为透明（边缘泛洪，不依赖整张图「去白」以免误伤图标内白色图形）。

用法:
  python3 scripts/make-icon-transparent.py nianqi-icon.png
  python3 scripts/make-icon-transparent.py nianqi-icon.png --output out.png
  python3 scripts/make-icon-transparent.py in.jpg --tol 45
"""
from __future__ import annotations

import argparse
from collections import deque

from PIL import Image


def remove_outer_light_background(
    src: Image.Image,
    tol: int = 38,
    min_sum_rgb: int = 680,
) -> Image.Image:
    img = src.convert("RGBA")
    w, h = img.size
    px = img.load()
    visited = [[False] * w for _ in range(h)]

    def flood_from(sx: int, sy: int) -> None:
        r0, g0, b0, a0 = px[sx, sy]
        if a0 < 30:
            visited[sy][sx] = True
            return
        if r0 + g0 + b0 < min_sum_rgb:
            return
        dq = deque([(sx, sy)])
        visited[sy][sx] = True
        while dq:
            x, y = dq.popleft()
            for nx, ny in (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1):
                if nx < 0 or ny < 0 or nx >= w or ny >= h:
                    continue
                if visited[ny][nx]:
                    continue
                r, g, b, a = px[nx, ny]
                if a < 30:
                    visited[ny][nx] = True
                    continue
                if (
                    abs(r - r0) <= tol
                    and abs(g - g0) <= tol
                    and abs(b - b0) <= tol
                ):
                    visited[ny][nx] = True
                    dq.append((nx, ny))

    for y in range(h):
        for x in (0, w - 1):
            if not visited[y][x]:
                flood_from(x, y)
    for x in range(w):
        for y in (0, h - 1):
            if not visited[y][x]:
                flood_from(x, y)

    out = img.copy()
    opx = out.load()
    for y in range(h):
        for x in range(w):
            if visited[y][x]:
                opx[x, y] = (0, 0, 0, 0)
    return out


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("input", help="输入 PNG/JPG 等")
    p.add_argument(
        "-o",
        "--output",
        help="输出路径（默认覆盖输入，仅当输入为 PNG 时建议）",
    )
    p.add_argument("--tol", type=int, default=38, help="与种子色的 RGB 容差")
    p.add_argument(
        "--min-rgb-sum",
        type=int,
        default=680,
        help="边缘种子点的最小 R+G+B（略低于纯白 765）",
    )
    args = p.parse_args()

    img = Image.open(args.input)
    out = remove_outer_light_background(img, tol=args.tol, min_sum_rgb=args.min_rgb_sum)
    outp = args.output or args.input
    if outp.lower().endswith(".jpg") or outp.lower().endswith(".jpeg"):
        outp = outp.rsplit(".", 1)[0] + ".png"
    out.save(outp, optimize=True)
    print("written:", outp)


if __name__ == "__main__":
    main()
