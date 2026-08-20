"""处理塔罗牌图片：裁顶部文字条 -> 512x512 -> webp q82。

用法：python process_tarot_imgs.py
"""
import os
from PIL import Image

SRC_DIR = "C:/Users/lenovo/tmp/tarot-gen"
PRIESTESS_SRC = "C:/Users/lenovo/AppData/Local/hermes/cache/images/img_5a81a6aaa1bb.jpg"
OUT_DIR = "D:/VibeCoding/sweetheart-diner/images/tarot"

PRIESTESS_SLUG = "02-high-priestess"

OTHER_SLUGS = [
    "00-fool",
    "01-magician",
    "03-empress",
    "04-emperor",
    "05-hierophant",
    "06-lovers",
    "07-chariot",
    "08-strength",
    "09-hermit",
    "10-wheel",
    "11-justice",
    "12-hanged-man",
    "13-death",
    "14-temperance",
    "15-devil",
    "16-tower",
    "17-star",
    "18-moon",
    "19-sun",
    "20-judgement",
    "21-world",
]

TOP_CROP_RATIO = 0.12
PRIESTESS_CROP_RATIO = 0.20
TARGET_SIZE = (512, 512)
WEBP_QUALITY = 82
WEBP_METHOD = 6


def process(src_path, dst_path, crop_ratio=TOP_CROP_RATIO):
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    top = int(h * crop_ratio)
    img = img.crop((0, top, w, h))
    img = img.resize(TARGET_SIZE, Image.LANCZOS)
    img.save(dst_path, "WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
    return os.path.getsize(dst_path) // 1024


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    count = 0

    dst = os.path.join(OUT_DIR, PRIESTESS_SLUG + ".webp")
    size_kb = process(PRIESTESS_SRC, dst, crop_ratio=PRIESTESS_CROP_RATIO)
    print("OK {} {}KB".format(PRIESTESS_SLUG, size_kb))
    count += 1

    for slug in OTHER_SLUGS:
        src = os.path.join(SRC_DIR, slug + ".png")
        dst = os.path.join(OUT_DIR, slug + ".webp")
        size_kb = process(src, dst)
        print("OK {} {}KB".format(slug, size_kb))
        count += 1

    print("ALL DONE {} images".format(count))


if __name__ == "__main__":
    main()
