#!/usr/bin/env python3
"""
将应用图标缩放到适合 Web / PWA 的尺寸并压缩 PNG（RGBA 保留透明）。

默认：最长边 512px，zlib 优化。源图建议为正方形 PNG。

用法:
  python3 scripts/optimize-icon.py
  python3 scripts/optimize-icon.py path/to/icon.png --size 512
  python3 scripts/optimize-icon.py in.png -o out.png --size 192
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "input",
        nargs="?",
        default=str(root / "nianqi-icon.png"),
        help="输入 PNG（默认项目根目录 nianqi-icon.png）",
    )
    p.add_argument("-o", "--output", help="输出路径（默认覆盖输入）")
    p.add_argument(
        "--size",
        type=int,
        default=512,
        help="输出正方形边长，默认 512（PWA 常用）",
    )
    args = p.parse_args()

    inp = Path(args.input)
    out = Path(args.output) if args.output else inp
    if not inp.is_file():
        raise SystemExit(f"找不到文件: {inp}")

    img = Image.open(inp).convert("RGBA")
    s = max(1, int(args.size))
    resized = img.resize((s, s), Image.Resampling.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    resized.save(out, format="PNG", optimize=True, compress_level=9)
    kb = out.stat().st_size // 1024
    print(f"written: {out}  ({s}×{s}, ~{kb} KB)")


if __name__ == "__main__":
    main()
