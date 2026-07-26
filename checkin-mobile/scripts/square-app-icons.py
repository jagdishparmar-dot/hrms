"""Pad non-square Expo icon assets to square canvases (in place)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "assets" / "images"
FILES = [
    "icon.png",
    "android-icon-foreground.png",
    "android-icon-background.png",
    "android-icon-monochrome.png",
]
BACKGROUND = (0x31, 0x2E, 0x81, 0xFF)


def square_image(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    if width == height:
        print(f"OK  {path.name} ({width}x{height})")
        return

    size = max(width, height)
    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    canvas.paste(image, ((size - width) // 2, (size - height) // 2), image)
    canvas.save(path)
    print(f"FIX {path.name} ({width}x{height} -> {size}x{size})")


def main() -> None:
    for name in FILES:
        square_image(ROOT / name)


if __name__ == "__main__":
    main()
