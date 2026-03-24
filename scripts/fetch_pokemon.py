"""
Stage 1: Fetch all Pokemon from PokeAPI and store in SQLite.

Usage:
    pip install -r requirements.txt
    python fetch_pokemon.py              # fetch all 1025
    python fetch_pokemon.py --limit 20   # fetch first 20 (for testing)
    python fetch_pokemon.py --resume     # skip already-fetched entries
"""

import argparse
import asyncio
import json
import logging
import sqlite3
from pathlib import Path

import httpx
from tqdm.asyncio import tqdm

POKEAPI = "https://pokeapi.co/api/v2"
DB_PATH = Path(__file__).parent.parent / "data" / "pokemon.db"
CONCURRENCY = 20  # simultaneous requests

logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS pokemon (
            id                      INTEGER PRIMARY KEY,
            name                    TEXT NOT NULL,
            height                  INTEGER,
            weight                  INTEGER,
            base_experience         INTEGER,
            types                   TEXT,   -- JSON array of type names
            abilities               TEXT,   -- JSON array of {name, is_hidden}
            stat_hp                 INTEGER,
            stat_attack             INTEGER,
            stat_defense            INTEGER,
            stat_sp_atk             INTEGER,
            stat_sp_def             INTEGER,
            stat_speed              INTEGER,
            sprite_official_artwork TEXT,
            sprite_home             TEXT,
            sprite_default          TEXT,
            cry_latest              TEXT
        );

        CREATE TABLE IF NOT EXISTS pokemon_species (
            pokemon_id      INTEGER PRIMARY KEY REFERENCES pokemon(id),
            genus           TEXT,
            flavor_text     TEXT,   -- best English entry
            color           TEXT,
            habitat         TEXT,
            shape           TEXT,
            base_happiness  INTEGER,
            capture_rate    INTEGER,
            growth_rate     TEXT,
            egg_groups      TEXT,   -- JSON array
            is_legendary    INTEGER,
            is_mythical     INTEGER,
            is_baby         INTEGER,
            gender_rate     INTEGER
        );

        CREATE TABLE IF NOT EXISTS labels (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            pokemon_id  INTEGER NOT NULL REFERENCES pokemon(id),
            label_key   TEXT NOT NULL,
            value       TEXT,           -- stored as text; cast on read
            source      TEXT NOT NULL,  -- 'rule' | 'ai' | 'human'
            model       TEXT,           -- model id if source='ai'
            confidence  REAL DEFAULT 1.0,
            created_at  TEXT DEFAULT (datetime('now')),
            updated_at  TEXT DEFAULT (datetime('now')),
            UNIQUE(pokemon_id, label_key, source)
        );

        CREATE INDEX IF NOT EXISTS idx_labels_pokemon ON labels(pokemon_id);
        CREATE INDEX IF NOT EXISTS idx_labels_key ON labels(label_key);
    """)
    conn.commit()


def upsert_pokemon(conn: sqlite3.Connection, row: dict) -> None:
    conn.execute("""
        INSERT INTO pokemon (
            id, name, height, weight, base_experience,
            types, abilities,
            stat_hp, stat_attack, stat_defense,
            stat_sp_atk, stat_sp_def, stat_speed,
            sprite_official_artwork, sprite_home, sprite_default,
            cry_latest
        ) VALUES (
            :id, :name, :height, :weight, :base_experience,
            :types, :abilities,
            :stat_hp, :stat_attack, :stat_defense,
            :stat_sp_atk, :stat_sp_def, :stat_speed,
            :sprite_official_artwork, :sprite_home, :sprite_default,
            :cry_latest
        )
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name, height=excluded.height,
            weight=excluded.weight, base_experience=excluded.base_experience,
            types=excluded.types, abilities=excluded.abilities,
            stat_hp=excluded.stat_hp, stat_attack=excluded.stat_attack,
            stat_defense=excluded.stat_defense, stat_sp_atk=excluded.stat_sp_atk,
            stat_sp_def=excluded.stat_sp_def, stat_speed=excluded.stat_speed,
            sprite_official_artwork=excluded.sprite_official_artwork,
            sprite_home=excluded.sprite_home, sprite_default=excluded.sprite_default,
            cry_latest=excluded.cry_latest
    """, row)


def upsert_species(conn: sqlite3.Connection, row: dict) -> None:
    conn.execute("""
        INSERT INTO pokemon_species (
            pokemon_id, genus, flavor_text, color, habitat, shape,
            base_happiness, capture_rate, growth_rate, egg_groups,
            is_legendary, is_mythical, is_baby, gender_rate
        ) VALUES (
            :pokemon_id, :genus, :flavor_text, :color, :habitat, :shape,
            :base_happiness, :capture_rate, :growth_rate, :egg_groups,
            :is_legendary, :is_mythical, :is_baby, :gender_rate
        )
        ON CONFLICT(pokemon_id) DO UPDATE SET
            genus=excluded.genus, flavor_text=excluded.flavor_text,
            color=excluded.color, habitat=excluded.habitat,
            shape=excluded.shape, base_happiness=excluded.base_happiness,
            capture_rate=excluded.capture_rate, growth_rate=excluded.growth_rate,
            egg_groups=excluded.egg_groups, is_legendary=excluded.is_legendary,
            is_mythical=excluded.is_mythical, is_baby=excluded.is_baby,
            gender_rate=excluded.gender_rate
    """, row)


def already_fetched(conn: sqlite3.Connection, pokemon_id: int) -> bool:
    row = conn.execute(
        "SELECT 1 FROM pokemon_species WHERE pokemon_id = ?", (pokemon_id,)
    ).fetchone()
    return row is not None


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def parse_pokemon(data: dict) -> dict:
    sprites = data.get("sprites", {})
    other = sprites.get("other", {})
    stats = {s["stat"]["name"]: s["base_stat"] for s in data.get("stats", [])}
    cries = data.get("cries", {})

    return {
        "id": data["id"],
        "name": data["name"],
        "height": data.get("height"),
        "weight": data.get("weight"),
        "base_experience": data.get("base_experience"),
        "types": json.dumps([t["type"]["name"] for t in data.get("types", [])]),
        "abilities": json.dumps([
            {"name": a["ability"]["name"], "is_hidden": a["is_hidden"]}
            for a in data.get("abilities", [])
        ]),
        "stat_hp": stats.get("hp"),
        "stat_attack": stats.get("attack"),
        "stat_defense": stats.get("defense"),
        "stat_sp_atk": stats.get("special-attack"),
        "stat_sp_def": stats.get("special-defense"),
        "stat_speed": stats.get("speed"),
        "sprite_official_artwork": (
            other.get("official-artwork", {}).get("front_default")
        ),
        "sprite_home": other.get("home", {}).get("front_default"),
        "sprite_default": sprites.get("front_default"),
        "cry_latest": cries.get("latest"),
    }


def best_flavor_text(entries: list[dict]) -> str:
    """Return the most recent English flavor text, with whitespace normalized."""
    english = [e for e in entries if e.get("language", {}).get("name") == "en"]
    if not english:
        return ""
    text = english[-1]["flavor_text"]
    return " ".join(text.split())  # collapse newlines / form feeds


def parse_species(pokemon_id: int, data: dict) -> dict:
    genera = [g["genus"] for g in data.get("genera", [])
              if g.get("language", {}).get("name") == "en"]

    return {
        "pokemon_id": pokemon_id,
        "genus": genera[0] if genera else None,
        "flavor_text": best_flavor_text(data.get("flavor_text_entries", [])),
        "color": data.get("color", {}).get("name"),
        "habitat": (data.get("habitat") or {}).get("name"),
        "shape": (data.get("shape") or {}).get("name"),
        "base_happiness": data.get("base_happiness"),
        "capture_rate": data.get("capture_rate"),
        "growth_rate": data.get("growth_rate", {}).get("name"),
        "egg_groups": json.dumps([
            eg["name"] for eg in data.get("egg_groups", [])
        ]),
        "is_legendary": int(data.get("is_legendary", False)),
        "is_mythical": int(data.get("is_mythical", False)),
        "is_baby": int(data.get("is_baby", False)),
        "gender_rate": data.get("gender_rate"),
    }


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------

async def fetch_json(client: httpx.AsyncClient, url: str) -> dict:
    for attempt in range(3):
        try:
            r = await client.get(url, timeout=30)
            r.raise_for_status()
            return r.json()
        except (httpx.HTTPError, httpx.TimeoutException) as e:
            if attempt == 2:
                raise
            await asyncio.sleep(2 ** attempt)


async def process_one(
    client: httpx.AsyncClient,
    sem: asyncio.Semaphore,
    entry: dict,
    conn: sqlite3.Connection,
    resume: bool,
) -> None:
    async with sem:
        url = entry["url"]
        pokemon_id = int(url.rstrip("/").split("/")[-1])

        if resume and already_fetched(conn, pokemon_id):
            return

        try:
            poke_data, species_url = await fetch_pokemon_and_species_url(client, url)
            species_data = await fetch_json(client, species_url)
        except Exception as e:
            log.warning(f"Failed #{pokemon_id} ({entry['name']}): {e}")
            return

        poke_row = parse_pokemon(poke_data)
        species_row = parse_species(poke_data["id"], species_data)

        upsert_pokemon(conn, poke_row)
        upsert_species(conn, species_row)
        conn.commit()


async def fetch_pokemon_and_species_url(
    client: httpx.AsyncClient, url: str
) -> tuple[dict, str]:
    data = await fetch_json(client, url)
    species_url = data["species"]["url"]
    return data, species_url


async def run(limit: int | None, resume: bool) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    async with httpx.AsyncClient(
        headers={"User-Agent": "pokemon-labeling-project/1.0"},
        follow_redirects=True,
    ) as client:
        list_url = f"{POKEAPI}/pokemon?limit={limit or 1025}&offset=0"
        print(f"Fetching Pokemon list from {list_url} ...")
        list_data = await fetch_json(client, list_url)
        entries = list_data["results"]
        print(f"  {len(entries)} Pokemon to process.")

        sem = asyncio.Semaphore(CONCURRENCY)
        tasks = [
            process_one(client, sem, entry, conn, resume)
            for entry in entries
        ]
        await tqdm.gather(*tasks, desc="Fetching", unit="pokemon")

    count = conn.execute("SELECT COUNT(*) FROM pokemon").fetchone()[0]
    print(f"\nDone. {count} Pokemon stored in {DB_PATH}")
    conn.close()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch Pokemon data into SQLite.")
    parser.add_argument("--limit", type=int, default=None,
                        help="Fetch only the first N Pokemon (default: all 1025)")
    parser.add_argument("--resume", action="store_true",
                        help="Skip Pokemon already present in the database")
    args = parser.parse_args()

    asyncio.run(run(args.limit, args.resume))
