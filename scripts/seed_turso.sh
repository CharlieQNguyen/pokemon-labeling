#!/bin/bash
# Seed Turso database from local SQLite using turso CLI
# Usage: ./seed_turso.sh

set -e

DB_NAME="pokemon-labeling"
LOCAL_DB="../data/pokemon.db"

echo "Dumping local SQLite to SQL..."
sqlite3 "$LOCAL_DB" .dump > /tmp/pokemon_dump.sql

echo "Seeding Turso database: $DB_NAME"
# Filter out transaction commands and sqlite_sequence, pipe to turso
grep -v "^BEGIN\|^COMMIT\|^ROLLBACK\|sqlite_sequence" /tmp/pokemon_dump.sql | \
  turso db shell "$DB_NAME"

echo "Done! Verifying..."
turso db shell "$DB_NAME" "SELECT COUNT(*) as pokemon FROM pokemon; SELECT COUNT(*) as labels FROM labels;"
