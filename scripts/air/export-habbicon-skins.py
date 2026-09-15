"""Pack AIR's nine named atlas entities; preserve alpha and multiply RGB.

Usage: python3 scripts/air/export-habbicon-skins.py /path/to/qualified/air/bundle
Requires Pillow. Source bundle is intentionally not distributed.
"""
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image

bundle = Path(sys.argv[1])
repo = Path(__file__).resolve().parents[2]
out = repo / 'src/assets/images/habbo-skin/slices'
blue = bundle / 'decompiled/images/2378_class_840.png'
ubuntu = next((bundle / 'decompiled/images').glob('*_habbo_skin_ubuntu_png*'))
# Widget style, XML symbol, atlas, RGB multipliers used by the collection.
styles = [
    (2, '2939_class_848.bin', blue, ['c8be8d', '99c176', 'bcd99f', 'd3e9bd', 'd4c2ad', 'e6ddc8', 'eaddcd']),
    (3, '2856_habbo_skin_border_slot_xml*.bin', blue, ['d7d1be', '1f5d78', 'f6ebd7', 'e7d5b2', 'f8ebd6']),
    (4, '2024_habbo_skin_border_4_xml*.bin', blue, ['efefef']),
    (6, '2727_habbo_skin_border_6_xml*.bin', ubuntu, ['ffffff']),
    (7, '2956_habbo_skin_border_7_xml*.bin', ubuntu, ['41aad3']),
    (10, '2250_class_847.bin', blue, ['f8ebd6', 'fff2c6', 'f0cf86', 'e0cba6', 'f6ebd7', 'efe1c4']),
]
for style, pattern, atlas_path, colors in styles:
    xml = next((bundle / 'decompiled/binaryData').glob(pattern))
    root = ET.parse(xml).getroot()
    entities = root.find('./templates/template/entities')
    rects = {e.get('name'): {k: int(v) for k, v in e.find('./region/Rectangle').attrib.items()} for e in entities}
    widths = [rects['top_' + col]['width'] for col in ['left', 'center', 'right']]
    heights = [rects[row + '_left']['height'] for row in ['top', 'mid', 'btm']]
    packed = Image.new('RGBA', (sum(widths), sum(heights)))
    atlas = Image.open(atlas_path).convert('RGBA')
    for y, row in enumerate(['top', 'mid', 'btm']):
        for x, col in enumerate(['left', 'center', 'right']):
            r = rects[row + '_' + col]
            crop = atlas.crop((r['x'], r['y'], r['x'] + r['width'], r['y'] + r['height']))
            packed.paste(crop, (sum(widths[:x]), sum(heights[:y])))
    for color in colors:
        rgb = [int(color[i:i + 2], 16) for i in [0, 2, 4]]
        tinted = packed.copy()
        tinted.putdata([(*(v * m // 255 for v, m in zip(p[:3], rgb)), p[3]) for p in packed.getdata()])
        name = f'border-{style}-{color}.png'
        tinted.save(out / name)
