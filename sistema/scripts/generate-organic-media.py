#!/usr/bin/env python3
"""Render original social cards offline. No external AI or paid API calls."""
from __future__ import annotations
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "conteudo-organico" / "calendario-2026-11.json"
OUTPUT = ROOT / "assets" / "conteudo-organico"
BRANCH = os.environ.get("GITHUB_REF_NAME", "feat-rotina-organica-gratis-2026-11-04")
REPO = os.environ.get("GITHUB_REPOSITORY", "clubedojoao18-a11y/Barbearia-do-Jo-o-")
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
W, H = 1080, 1350

def font(size: int, bold: bool = False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)

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
    bg = "#32261f" if eu else "#f4f1eb"
    ink = "#f7f4ee" if eu else "#32261f"
    accent = "#c4b7a7" if eu else "#93725b"
    neutral = "#a7abb0"
    im = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(im)
    # Distinct but consistent geometrical composition.
    d.rectangle((65, 65, W - 65, H - 65), outline=accent, width=2)
    d.line((110, 260, 330, 260), fill=neutral, width=8)
    d.ellipse((810, 87, 1000, 277), outline=accent, width=3)
    d.arc((820, 96, 990, 270), 40, 280, fill=neutral, width=6)
    d.text((110, 153), "EU SOU   /   IDENTIDADE & PROPÓSITO" if eu else "BARBEARIA DO JOÃO   /   CUIDADO E ROTINA", font=font(27, True), fill=ink)
    title = item["title"]
    title_size = 98
    while title_size >= 57:
        f = font(title_size, True)
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
        d.text((110, top + 95 + i * 70), line, font=smaller, fill=neutral if eu else accent)
    d.line((110, 1167, 970, 1167), fill=accent, width=2)
    d.text((110, 1200), "@_EUSOUCOMUNIDADE" if eu else "BARBEARIA DO JOÃO", font=font(31, True), fill=ink)
    d.text((W - 203, 1200), item["date"][8:10] + "/" + item["date"][5:7], font=font(31), fill=accent)
    im.save(file, "JPEG", quality=88, optimize=True, progressive=True)

def main() -> None:
    document = json.loads(INPUT.read_text(encoding="utf-8"))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    seen = set()
    enriched = []
    for post in document["items"]:
        ident = post["id"]
        if ident in seen or not ident.replace("-", "").isalnum() or len(ident) > 70:
            raise ValueError("Duplicate or unsafe post ID")
        if post["project"] not in {"barbearia", "eusou"}:
            raise ValueError("Unknown project")
        seen.add(ident)
        file = OUTPUT / (ident + ".jpg")
        render(post, file)
        enriched.append({**post, "mediaUrl": "https://raw.githubusercontent.com/" + REPO + "/" + BRANCH + "/sistema/assets/conteudo-organico/" + file.name})
    (OUTPUT / "manifest.json").write_text(json.dumps({"timezone": document["timezone"], "items": enriched}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Rendered", len(enriched), "original cards without API calls")

if __name__ == "__main__":
    main()
