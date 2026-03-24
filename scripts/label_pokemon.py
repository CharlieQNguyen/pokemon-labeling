"""
Stage 2: Label Pokemon using a vision model via BAML.

Usage:
    # Test on first 5 Pokemon
    python label_pokemon.py --limit 5

    # Full run
    python label_pokemon.py

    # Resume (skip already-labeled)
    python label_pokemon.py --resume

    # Only run specific label groups
    python label_pokemon.py --groups visual personality

Requires one of these env vars (in .env or shell):
    GEMINI_API_KEY      — Gemini 2.0 Flash (cheapest, default)
    ANTHROPIC_API_KEY   — Claude 3.5 Haiku
    OPENROUTER_API_KEY  — Qwen2.5-VL 32B
"""

import argparse
import asyncio
import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from tqdm.asyncio import tqdm

# Load .env from project root
load_dotenv(Path(__file__).parent.parent / ".env")

# Add baml_client to path
sys.path.insert(0, str(Path(__file__).parent))

from baml_client.baml_client import b
from baml_client.baml_client.types import PokemonContext
import baml_py

DB_PATH = Path(__file__).parent.parent / "data" / "pokemon.db"
CONCURRENCY = 100  # paid tier allows 2000 RPM
MODEL = "GeminiFlash"  # matches client name in clients.baml



# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_pokemon(conn: sqlite3.Connection, limit: int | None) -> list[dict]:
    query = """
        SELECT p.id, p.name, p.types, p.sprite_official_artwork,
               s.genus, s.flavor_text
        FROM pokemon p
        LEFT JOIN pokemon_species s ON s.pokemon_id = p.id
        WHERE p.sprite_official_artwork IS NOT NULL
        ORDER BY p.id
    """
    if limit:
        query += f" LIMIT {limit}"
    rows = conn.execute(query).fetchall()
    return [
        {
            "id": row[0],
            "name": row[1],
            "types": json.loads(row[2] or "[]"),
            "sprite_url": row[3],
            "genus": row[4] or "",
            "flavor_text": row[5] or "",
        }
        for row in rows
    ]


def already_labeled(conn: sqlite3.Connection, pokemon_id: int, group: str) -> bool:
    """Check if a sentinel label for this group already exists."""
    sentinel = f"{group}:cuteness" if group == "visual" else \
               f"{group}:friendliness" if group == "personality" else \
               f"{group}:adoptability" if group == "adoptability" else \
               f"{group}:most_likely_job"
    row = conn.execute(
        "SELECT 1 FROM labels WHERE pokemon_id=? AND label_key=? AND source='ai'",
        (pokemon_id, sentinel.split(":", 1)[1])
    ).fetchone()
    return row is not None


def save_labels(
    conn: sqlite3.Connection,
    pokemon_id: int,
    labels: dict,
    model: str,
) -> None:
    now = datetime.utcnow().isoformat()
    for key, value in labels.items():
        conn.execute("""
            INSERT INTO labels (pokemon_id, label_key, value, source, model, confidence, created_at, updated_at)
            VALUES (?, ?, ?, 'ai', ?, 1.0, ?, ?)
            ON CONFLICT(pokemon_id, label_key, source) DO UPDATE SET
                value=excluded.value, model=excluded.model,
                updated_at=excluded.updated_at
        """, (pokemon_id, key, str(value), model, now, now))
    conn.commit()


# ---------------------------------------------------------------------------
# BAML calls
# ---------------------------------------------------------------------------

def make_context(p: dict) -> PokemonContext:
    return PokemonContext(
        name=p["name"],
        types=p["types"],
        genus=p["genus"],
        flavor_text=p["flavor_text"],
    )


async def label_visual(p: dict) -> dict:
    ctx = make_context(p)
    image = baml_py.Image.from_url(p["sprite_url"])
    result = await b.LabelVisuals(pokemon=ctx, image=image)
    return {
        "cuteness": result.cuteness,
        "creepiness": result.creepiness,
        "elegance": result.elegance,
        "vibe": result.vibe.value,
        "color_mood": result.color_mood.value,
        "plushie_desirability": result.plushie_desirability,
    }


async def label_personality(p: dict) -> dict:
    ctx = make_context(p)
    image = baml_py.Image.from_url(p["sprite_url"])
    result = await b.LabelPersonality(pokemon=ctx, image=image)
    return {
        "friendliness": result.friendliness,
        "aggressiveness": result.aggressiveness,
        "loyalty": result.loyalty,
        "aloofness": result.aloofness,
    }


async def label_adoptability(p: dict) -> dict:
    ctx = make_context(p)
    image = baml_py.Image.from_url(p["sprite_url"])
    result = await b.LabelAdoptability(pokemon=ctx, image=image)
    return {
        "adoptability": result.adoptability,
        "apartment_friendly": int(result.apartment_friendly),
        "kid_safe": int(result.kid_safe),
        "low_maintenance": result.low_maintenance,
    }


async def label_creative(p: dict) -> dict:
    ctx = make_context(p)
    image = baml_py.Image.from_url(p["sprite_url"])
    result = await b.LabelCreative(pokemon=ctx, image=image)
    return {
        "most_likely_job": result.most_likely_job,
        "meme_potential": result.meme_potential,
        "overrated_underrated": result.overrated_underrated.value,
        "real_world_survivability": result.real_world_survivability,
    }


GROUP_FNS = {
    "visual": label_visual,
    "personality": label_personality,
    "adoptability": label_adoptability,
    "creative": label_creative,
}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def process_one(
    sem: asyncio.Semaphore,
    p: dict,
    conn: sqlite3.Connection,
    groups: list[str],
    resume: bool,
) -> None:
    async with sem:
        all_labels: dict = {}
        for group in groups:
            if resume and already_labeled(conn, p["id"], group):
                continue
            try:
                labels = await GROUP_FNS[group](p)
                all_labels.update(labels)
            except Exception as e:
                print(f"\n  ✗ #{p['id']} {p['name']} [{group}]: {e}")

        if all_labels:
            save_labels(conn, p["id"], all_labels, MODEL)


async def run(limit: int | None, groups: list[str], resume: bool) -> None:
    conn = sqlite3.connect(DB_PATH)
    pokemon = get_pokemon(conn, limit)
    print(f"Labeling {len(pokemon)} Pokemon across groups: {', '.join(groups)}")
    print(f"Model: {MODEL}  |  Concurrency: {CONCURRENCY}\n")

    sem = asyncio.Semaphore(CONCURRENCY)
    tasks = [
        process_one(sem, p, conn, groups, resume)
        for p in pokemon
    ]
    await tqdm.gather(*tasks, desc="Labeling", unit="pokemon")

    total = conn.execute("SELECT COUNT(*) FROM labels").fetchone()[0]
    print(f"\nDone. {total} label rows in database.")
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Label Pokemon via VLM.")
    parser.add_argument("--limit", type=int, default=None,
                        help="Only label the first N Pokemon")
    parser.add_argument("--groups", nargs="+",
                        choices=list(GROUP_FNS.keys()),
                        default=list(GROUP_FNS.keys()),
                        help="Which label groups to run")
    parser.add_argument("--resume", action="store_true",
                        help="Skip Pokemon already labeled for each group")
    args = parser.parse_args()
    asyncio.run(run(args.limit, args.groups, args.resume))
