#!/usr/bin/env python3
"""Generate local bitmap samples for browser tests; outputs are gitignored."""
from pathlib import Path
import shutil
import subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests/fixtures'
OUT.mkdir(parents=True, exist_ok=True)
EXPECTED = ['photo.jpg', 'photo-48mp.jpg', 'photo-108mp.jpg', 'static.webp', 'transparent.png', 'animated.png', 'animated.webp', 'photo.jxl', 'animated.jxl'] + [f'exif-{i}.jpg' for i in range(1, 9)]
if all((OUT / name).exists() for name in EXPECTED):
    raise SystemExit(0)

photo = Image.new('RGB', (1920, 1090), (0, 0, 0))
draw = ImageDraw.Draw(photo)
for x in range(photo.width):
    draw.line((x, 0, x, photo.height), fill=(round(x / 1919 * 240), round(x / 1919 * 150), 118))
photo.save(OUT / 'photo.jpg', quality=88)
photo.save(OUT / 'static.webp', quality=88)
for width, height in [(8000, 6000), (12000, 9000)]:
    with Image.new('RGB', (width, height), (64, 128, 192)) as large:
        large.save(OUT / f'photo-{width * height // 1_000_000}mp.jpg', quality=85)
Image.new('RGBA', (1480, 1050), (0, 0, 0, 0)).save(OUT / 'transparent.png')
first = photo.resize((320, 200))
second = first.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
first.save(OUT / 'animated.png', save_all=True, append_images=[second], duration=100, loop=0)
first.save(OUT / 'animated.webp', save_all=True, append_images=[second], duration=100, loop=0)
for orientation in range(1, 9):
    exif = Image.Exif()
    exif[274] = orientation
    photo.resize((400, 200)).save(OUT / f'exif-{orientation}.jpg', exif=exif)
if shutil.which('ffmpeg'):
    subprocess.run(['ffmpeg', '-y', '-i', str(OUT / 'photo.jpg'), str(OUT / 'photo.jxl')], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
elif shutil.which('magick'):
    subprocess.run(['magick', str(OUT / 'photo.jpg'), str(OUT / 'photo.jxl')], check=True)
(OUT / 'animated.jxl').write_bytes(bytes([0xff, 0x0a, 0x43, 0x04, 0x01]))
print(f'Generated {len(EXPECTED)} test images in {OUT}')
