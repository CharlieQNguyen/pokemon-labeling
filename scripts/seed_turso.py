"""
Seed Turso database from local SQLite.

Usage:
    # Uses TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from .env
    python seed_turso.py
"""

import asyncio
import os
import sqlite3
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

import libsql_client

LOCAL_DB = Path(__file__).parent.parent / "data" / "pokemon.db"
TURSO_URL = os.environ.get("TURSO_DATABASE_URL", "")
TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN", "")


async def main():
    if not TURSO_URL or not TURSO_TOKEN:
        print("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env")
        sys.exit(1)

    print(f"Source: {LOCAL_DB}")
    print(f"Target: {TURSO_URL}")

    local = sqlite3.connect(LOCAL_DB)

    async with libsql_client.create_client(
        url=TURSO_URL, auth_token=TURSO_TOKEN
    ) as client:
        # Create tables
        print("Creating tables...")
        schema = local.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).fetchall()
        for (sql,) in schema:
            if sql:
                await client.execute(
                    sql.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS")
                )

        # Create indexes
        indexes = local.execute(
            "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL"
        ).fetchall()
        for (sql,) in indexes:
            await client.execute(
                sql.replace("CREATE INDEX", "CREATE INDEX IF NOT EXISTS")
            )

        # Seed each table
        for table in ["pokemon", "pokemon_species", "labels"]:
            rows = local.execute(f"SELECT * FROM {table}").fetchall()
            cols = [d[0] for d in local.execute(f"SELECT * FROM {table} LIMIT 1").description]
            placeholders = ",".join(["?"] * len(cols))
            col_names = ",".join(cols)
            print(f"Seeding {len(rows)} {table}...")

            batch_size = 50
            for i in range(0, len(rows), batch_size):
                batch = rows[i : i + batch_size]
                stmts = [
                    libsql_client.Statement(
                        f"INSERT OR REPLACE INTO {table} ({col_names}) VALUES ({placeholders})",
                        list(row),
                    )
                    for row in batch
                ]
                await client.batch(stmts)
                print(f"  {min(i + batch_size, len(rows))} / {len(rows)}")

        print("Done!")
    local.close()


if __name__ == "__main__":
    asyncio.run(main())
