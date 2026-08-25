#!/usr/bin/env python3
"""Turn ImageGen's pale checkerboard into a real alpha channel.

The generated portraits deliberately use a bright, neutral background.  We only
remove neutral pixels connected to a canvas edge, so white details enclosed by
the character (eyes, teeth, shirt highlights) remain opaque.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, _ = pixel
    return min(red, green, blue) >= 174 and max(red, green, blue) - min(red, green, blue) <= 44


def key_background(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    seen = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        offset = y * width + x
        if not seen[offset] and is_background(pixels[x, y]):
            seen[offset] = 1
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    foreground = Image.new("L", image.size, 255)
    mask = foreground.load()
    for offset, background in enumerate(seen):
        if background:
            mask[offset % width, offset // width] = 0

    # A tiny feather keeps hair and painted outlines smooth against the stage.
    foreground = foreground.filter(ImageFilter.GaussianBlur(.65))
    original_alpha = image.getchannel("A")
    image.putalpha(ImageChops.darker(original_alpha, foreground))
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    key_background(args.source, args.destination)


if __name__ == "__main__":
    main()
