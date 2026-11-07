#!/usr/bin/env python3
"""Render original social cards offline. No external AI or paid API calls."""
from __future__ import annotations
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = ROOT / "conteudo-organico"
OUTPUT = ROOT / "assets" / "conteudo-organico"
BRANCH = os.environ.get("GITHUB_REF_NAME", "main")
REPO = os.environ.get("GITHUB_REPOSITORY", "clubedojoao18-a11y/Barbearia-do-Jo-o-")
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
W, H = 1080, 1350

def font(size: int, bold: bool = False, serif: bool = False):
    face = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf" if serif else (FONT_BOLD if bold else FONT_REG)
    return ImageFont.truetype(face, size)

def wrap(text: str, draw: ImageDraw.ImageDraw, f, max_width: int) -> list[str]:
    lines, current = [], ""
    for word in text.split():
        trial = (current + " " + word).strip()
        if draw.textbbox((0, 0), trial, font=f)[2] > max_width and current:
            lines.append(current)
            current = word
        else:
            current = trial
    if current:
        lines.append(current)
    return lines

def render(item: dict, file: Path) -> None:
    eu = item["project"] == "eusou"
    bg = "#fff8ef" if eu else "#493326"
    ink = "#28344a" if eu else "#ffffff"
    accent = "#b54f38" if eu else "#b4babd"
    neutral = ink if eu else "#b4babd"
    im = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(im)
    variant = int(item["date"][8:10]) % 3
    if eu:
        d.line((78, 110, 78, 1110), fill=accent, width=3)
        d.text((110, 130), "EU SOU", font=font(42, serif=True), fill=ink)
        d.text((110, 199), "IDENTIDADE & PROPÓSITO", font=font(25), fill=accent)
        if variant == 0:
            d.arc((720, 70, 1000, 350), 205, 355, fill=accent, width=3)
        elif variant == 1:
            d.text((850, 130), "eu", font=font(70, serif=True), fill=accent)
        else:
            d.line((725, 170, 960, 170), fill=accent, width=2)
    else:
        d.rectangle((0, 0, W, 26), fill=accent)
        d.text((110, 153), "BARBEARIA DO JOÃO", font=font(31, True), fill=ink)
        d.text((110, 207), "CUIDADO COM IDENTIDADE", font=font(25), fill=accent)
        if variant == 0:
            d.line((110, 286, 370, 286), fill=accent, width=8)
        elif variant == 1:
            d.rectangle((110, 278, 180, 294), fill=accent)
        else:
            d.line((940, 110, 980, 110), fill=accent, width=3)
            d.line((980, 110, 980, 260), fill=accent, width=3)
    title = item["title"]
    title_size = 98
    while title_size >= 57:
        f = font(title_size, bold=not eu, serif=eu)
        lines = wrap(title, d, f, 840)
        if len(lines) <= 3:
            break
        title_size -= 5
    top = 420 if len(lines) <= 2 else 368
    for line in lines:
        d.text((110, top), line, font=f, fill=ink, stroke_width=0)
        top += title_size + 28
    d.line((110, top + 46, 178, top + 46), fill=accent, width=8)
    smaller = font(49)
    for i, line in enumerate(wrap(item["subtitle"], d, smaller, 800)):
        d.text((110, top + 95 + i * 70), line, font=smaller, fill=ink if eu else accent)
    d.line((110, 1167, 970, 1167), fill=accent, width=2)
    d.text((110, 1200), "@_EUSOUCOMUNIDADE" if eu else "BARBEARIA DO JOÃO", font=font(31, True), fill=ink)
    d.text((W - 203, 1200), item["date"][8:10] + "/" + item["date"][5:7], font=font(31), fill=accent)
    im.save(file, "JPEG", quality=88, optimize=True, progressive=True)

def main() -> None:
    sources = sorted(INPUT_DIR.glob("calendario-????-??.json"))[-3:]
    if not sources:
        raise ValueError("No editorial calendars found")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    seen = set()
    enriched = []
    for source in sources:
      document = json.loads(source.read_text(encoding="utf-8"))
      for post in document["items"]:
        ident = post["id"]
        if ident in seen or not ident.replace("-", "").isalnum() or len(ident) > 70:
            raise ValueError("Duplicate or unsafe post ID")
        if post["project"] not in {"barbearia", "eusou"}:
            raise ValueError("Unknown project")
        seen.add(ident)
        file = OUTPUT / (ident + ".jpg")
        # Preserve media already referenced by scheduled or published posts.
        if not file.exists():
            render(post, file)
        enriched.append({**post, "mediaUrl": "https://raw.githubusercontent.com/" + REPO + "/" + BRANCH + "/sistema/assets/conteudo-organico/" + file.name})
    (OUTPUT / "manifest.json").write_text(json.dumps({"timezone": "America/Sao_Paulo", "items": enriched}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Rendered", len(enriched), "original cards without API calls")

if __name__ == "__main__":
    main()
