# Tiles screenshots into one contact sheet (each tile labelled with its file name) so a whole batch of cues can be
# reviewed in one image.
# usage: python contact_sheet.py <out.png> <img1> <img2> ... [--cols 2] [--size 640x360] [--crop x0,y0,x1,y1]
#   default: 2 columns of 640x360 tiles (6 screenshots of 1280x720 -> one 1280x1080 sheet)
#   --crop   cut each screenshot first, e.g. --crop 320,0,960,560 for a pose close-up
import argparse, os, sys
from PIL import Image, ImageDraw
sys.stdout.reconfigure(encoding='utf-8', errors='replace'); sys.stderr.reconfigure(encoding='utf-8', errors='replace')

ap = argparse.ArgumentParser()
ap.add_argument('out'); ap.add_argument('images', nargs='+')
ap.add_argument('--cols', type=int, default=2); ap.add_argument('--size', default='640x360'); ap.add_argument('--crop', default='')
a = ap.parse_args()
tw, th = (int(v) for v in a.size.lower().split('x'))
crop = tuple(int(v) for v in a.crop.split(',')) if a.crop else None
rows = (len(a.images) + a.cols - 1) // a.cols
sheet = Image.new('RGB', (tw * a.cols, th * rows), (0, 0, 0))
draw = ImageDraw.Draw(sheet)
for i, f in enumerate(a.images):
    im = Image.open(f).convert('RGB')
    if crop:
        im = im.crop(crop)
    x, y = (i % a.cols) * tw, (i // a.cols) * th
    sheet.paste(im.resize((tw, th)), (x, y))
    label = os.path.splitext(os.path.basename(f))[0]
    draw.rectangle([x, y, x + 8 + 7 * len(label), y + 16], fill=(0, 0, 0))
    draw.text((x + 4, y + 2), label, fill=(255, 220, 120))
sheet.save(a.out)
print('%s: %d tiles, %dx%d' % (a.out, len(a.images), sheet.width, sheet.height))
