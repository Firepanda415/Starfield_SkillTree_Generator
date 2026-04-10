from __future__ import annotations

import datetime as dt
import html
import json
import re
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
JSON_PATH = DATA_DIR / "data.json"
JS_PATH = DATA_DIR / "data.js"
ZH_TRANSLATIONS_PATH = DATA_DIR / "translations_zh.json"

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

NUKES_SKILLS_URL = "https://nukesdragons.com/starfield/db/skills"
NUKES_BACKGROUNDS_URL = "https://nukesdragons.com/starfield/db/backgrounds"
GAME8_PERKS_URL = "https://game8.co/games/Starfield/archives/423662"

CATEGORY_ORDER = ["Physical", "Social", "Combat", "Science", "Tech"]
TIER_NAME_TO_NUMBER = {"Novice": 1, "Advanced": 2, "Expert": 3, "Master": 4}
DEFAULT_CATEGORY_COLORS = {
    "Physical": "#8bd3ff",
    "Social": "#f7ae65",
    "Combat": "#ff7a70",
    "Science": "#a4ff8f",
    "Tech": "#e2cbff",
}


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "ignore")


def clean_text(value: str) -> str:
    value = html.unescape(value)
    value = value.replace("\xa0", " ")
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def slugify(value: str) -> str:
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def parse_game8_skills(html_text: str) -> list[dict[str, object]]:
    pattern = re.compile(
        r"<a class='a-link' href=(?P<detail_url>https://game8\.co/games/Starfield/archives/\d+)>"
        r"<img[^>]+alt='Starfield (?P<name>[^']+) ID'.*?<br>\((?P<tier_name>[^)]+)\)</td>\s*"
        r"<td class=\"center\"><a class='a-link' href=[^>]+>(?P<category>[^<]+)</a></td>\s*"
        r"<td class=\"center\">(?P<perk_id>[0-9A-F]+)</td>",
        re.S,
    )

    seen: set[str] = set()
    skills: list[dict[str, object]] = []

    for match in pattern.finditer(html_text):
        name = clean_text(match.group("name"))
        skill_id = slugify(name)
        if skill_id in seen:
            continue
        seen.add(skill_id)
        tier_name = clean_text(match.group("tier_name"))
        category = clean_text(match.group("category"))
        skills.append(
            {
                "id": skill_id,
                "name_en": name,
                "name_zh": "",
                "category": category,
                "category_color": DEFAULT_CATEGORY_COLORS[category],
                "tier": TIER_NAME_TO_NUMBER[tier_name],
                "tier_name_en": tier_name,
                "summary_en": "",
                "summary_zh": "",
                "rank_effects_en": [],
                "rank_effects_zh": [],
                "perk_id": match.group("perk_id"),
                "detail_url": match.group("detail_url"),
            }
        )

    return skills


def extract_skill_summary(skills_html: str, name: str, tier: int) -> str:
    marker = f"<!--[-->{name} (Tier {tier})<!--]-->"
    marker_index = skills_html.find(marker)
    if marker_index == -1:
        raise ValueError(f"Could not find summary marker for skill: {name}")

    snippet = skills_html[marker_index : marker_index + 3000]
    match = re.search(
        r'class="leading-tight p-2 text-center"><!--\[-->(.*?)<!--\]-->',
        snippet,
        re.S,
    )
    if not match:
        raise ValueError(f"Could not parse summary for skill: {name}")
    return clean_text(match.group(1))


def parse_background_cards(backgrounds_html: str) -> list[dict[str, object]]:
    pattern = re.compile(
        r'<a href="/starfield/db/backgrounds/(?P<slug>[^"]+)"[^>]*>.*?'
        r'<div style="font-size:\d+px;"><!--\[-->(?P<name>.*?)<!--\]--></div>.*?'
        r'<div style="font-size:\d+px;"><!--\[-->(?P<summary>.*?)<!--\]--></div>',
        re.S,
    )

    backgrounds: list[dict[str, object]] = []
    seen: set[str] = set()
    for match in pattern.finditer(backgrounds_html):
        slug = match.group("slug")
        if slug in seen:
            continue
        seen.add(slug)
        backgrounds.append(
            {
                "id": slug,
                "slug": slug,
                "name_en": clean_text(match.group("name")),
                "name_zh": "",
                "summary_en": clean_text(match.group("summary")),
                "summary_zh": "",
                "starter_skill_ids": [],
            }
        )
    return backgrounds


def parse_background_starters(background_html: str) -> list[str]:
    if "Starting skills" not in background_html:
        raise ValueError("Missing starting skills section.")

    section = background_html.split("Starting skills", 1)[1]
    skill_slugs = re.findall(r'href="/starfield/db/skills/([^"]+)"', section)

    ordered_unique: list[str] = []
    for skill_slug in skill_slugs:
        if skill_slug not in ordered_unique:
            ordered_unique.append(skill_slug)
        if len(ordered_unique) == 3:
            break
    return ordered_unique


def parse_game8_rank_effects(detail_html: str, skill_name: str) -> list[str]:
    match = re.search(
        r"All Rank Challenges and Effects</h3>\s*<table[^>]*>(?P<table>.*?)</table>",
        detail_html,
        re.S,
    )
    if not match:
        raise ValueError(f"Could not find rank effects table for skill: {skill_name}")

    rows = re.findall(r"<tr>(.*?)</tr>", match.group("table"), re.S)
    effects: list[str] = []

    for row in rows[1:]:
        columns = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        if len(columns) < 3:
            continue
        effects.append(clean_text(columns[2]))

    if len(effects) != 4:
        raise ValueError(
            f"Expected 4 rank effects for {skill_name}, found {len(effects)}"
        )
    return effects


def load_zh_translations() -> dict[str, dict[str, dict[str, object]]]:
    if not ZH_TRANSLATIONS_PATH.exists():
        return {"skills": {}, "backgrounds": {}}

    payload = json.loads(ZH_TRANSLATIONS_PATH.read_text(encoding="utf-8"))
    return {
        "skills": payload.get("skills", {}),
        "backgrounds": payload.get("backgrounds", {}),
    }


def apply_zh_translations(
    payload: dict[str, object],
    translations: dict[str, dict[str, dict[str, object]]],
) -> None:
    skill_translations = translations.get("skills", {})
    for skill in payload["skills"]:
        translated = skill_translations.get(skill["id"], {})
        skill["name_zh"] = str(translated.get("name_zh", skill.get("name_zh", "")))
        skill["summary_zh"] = str(translated.get("summary_zh", skill.get("summary_zh", "")))
        rank_effects_zh = translated.get("rank_effects_zh", skill.get("rank_effects_zh", []))
        skill["rank_effects_zh"] = list(rank_effects_zh) if isinstance(rank_effects_zh, list) else []

    background_translations = translations.get("backgrounds", {})
    for background in payload["backgrounds"]:
        translated = background_translations.get(background["id"], {})
        background["name_zh"] = str(translated.get("name_zh", background.get("name_zh", "")))
        background["summary_zh"] = str(
            translated.get("summary_zh", background.get("summary_zh", ""))
        )


def build_dataset() -> dict[str, object]:
    skills_html = fetch(NUKES_SKILLS_URL)
    backgrounds_html = fetch(NUKES_BACKGROUNDS_URL)
    perks_html = fetch(GAME8_PERKS_URL)

    skills = parse_game8_skills(perks_html)
    for skill in skills:
        skill["summary_en"] = extract_skill_summary(
            skills_html,
            str(skill["name_en"]),
            int(skill["tier"]),
        )
        detail_html = fetch(str(skill["detail_url"]))
        skill["rank_effects_en"] = parse_game8_rank_effects(detail_html, str(skill["name_en"]))
        skill.pop("detail_url", None)

    skill_ids = {skill["id"] for skill in skills}

    backgrounds = [
        {
            "id": "none",
            "name_en": "None",
            "name_zh": "",
            "summary_en": "No background bonuses applied.",
            "summary_zh": "",
            "starter_skill_ids": [],
        }
    ]

    for background in parse_background_cards(backgrounds_html):
        detail_html = fetch(f"{NUKES_BACKGROUNDS_URL}/{background['slug']}")
        background["starter_skill_ids"] = parse_background_starters(detail_html)
        for skill_id in background["starter_skill_ids"]:
            if skill_id not in skill_ids:
                raise ValueError(
                    f"Background {background['name_en']} references missing skill id: {skill_id}"
                )
        background.pop("slug", None)
        backgrounds.append(background)

    skills.sort(
        key=lambda item: (
            CATEGORY_ORDER.index(str(item["category"])),
            int(item["tier"]),
            str(item["name_en"]),
        )
    )

    payload = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sources": {
            "skills_summary": NUKES_SKILLS_URL,
            "backgrounds": NUKES_BACKGROUNDS_URL,
            "perk_ids": GAME8_PERKS_URL,
        },
        "skills": skills,
        "backgrounds": backgrounds,
    }
    apply_zh_translations(payload, load_zh_translations())
    return payload


def write_outputs(payload: dict[str, object]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    JSON_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    JS_PATH.write_text(
        "window.STARFIELD_DATA = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )


def main() -> None:
    payload = build_dataset()
    write_outputs(payload)
    print(
        f"Wrote {len(payload['skills'])} skills and "
        f"{len(payload['backgrounds']) - 1} backgrounds to {DATA_DIR}"
    )


if __name__ == "__main__":
    main()
