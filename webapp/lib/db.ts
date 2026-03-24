import Database from "better-sqlite3";
import { createClient, type Client } from "@libsql/client";
import path from "path";

const IS_TURSO = !!process.env.TURSO_DATABASE_URL;
const LOCAL_DB_PATH = path.resolve(process.cwd(), "../data/pokemon.db");

// ── Connection ────────────────────────────────────────────────────────────────

let _sqlite: Database.Database | null = null;
let _turso: Client | null = null;

function getSqlite(readonly = true): Database.Database {
  if (!_sqlite) _sqlite = new Database(LOCAL_DB_PATH, { readonly });
  return _sqlite;
}

function getTurso(): Client {
  if (!_turso) {
    _turso = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _turso;
}

// Unified query helper
async function query<T>(sql: string, params: (string | number)[] = []): Promise<T[]> {
  if (IS_TURSO) {
    const result = await getTurso().execute({ sql, args: params });
    return result.rows as unknown as T[];
  }
  return getSqlite().prepare(sql).all(...params) as T[];
}

async function queryOne<T>(sql: string, params: (string | number)[] = []): Promise<T | undefined> {
  if (IS_TURSO) {
    const result = await getTurso().execute({ sql, args: params });
    return result.rows[0] as unknown as T | undefined;
  }
  return getSqlite().prepare(sql).get(...params) as T | undefined;
}

async function execute(sql: string, params: (string | number)[] = []): Promise<void> {
  if (IS_TURSO) {
    await getTurso().execute({ sql, args: params });
  } else {
    if (_sqlite?.readonly) _sqlite = null; // reopen as writable
    const db = new Database(LOCAL_DB_PATH);
    db.prepare(sql).run(...params);
    db.close();
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type Pokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  types: string[];
  abilities: { name: string; is_hidden: boolean }[];
  stat_hp: number;
  stat_attack: number;
  stat_defense: number;
  stat_sp_atk: number;
  stat_sp_def: number;
  stat_speed: number;
  sprite_official_artwork: string | null;
  sprite_default: string | null;
  genus: string | null;
  flavor_text: string | null;
  color: string | null;
  habitat: string | null;
  shape: string | null;
  base_happiness: number | null;
  capture_rate: number | null;
  is_legendary: number;
  is_mythical: number;
  is_baby: number;
};

type RawRow = Omit<Pokemon, "types" | "abilities"> & {
  types: string;
  abilities: string;
};

function parseRow(row: RawRow): Pokemon {
  return {
    ...row,
    types: JSON.parse(row.types ?? "[]"),
    abilities: JSON.parse(row.abilities ?? "[]"),
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listPokemon(opts: {
  search?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ pokemon: Pokemon[]; total: number }> {
  const { search = "", type = "", page = 1, pageSize = 48 } = opts;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search) {
    conditions.push("(p.name LIKE ? OR p.id = ?)");
    params.push(`%${search}%`, parseInt(search) || -1);
  }
  if (type) {
    conditions.push("p.types LIKE ?");
    params.push(`%"${type}"%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await queryOne<{ c: number }>(
    `SELECT COUNT(*) as c FROM pokemon p ${where}`,
    params
  );
  const total = countRow?.c ?? 0;

  const rows = await query<RawRow>(
    `SELECT p.*, s.genus, s.flavor_text, s.color, s.habitat, s.shape,
            s.base_happiness, s.capture_rate, s.is_legendary, s.is_mythical, s.is_baby
     FROM pokemon p
     LEFT JOIN pokemon_species s ON s.pokemon_id = p.id
     ${where}
     ORDER BY p.id
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return { pokemon: rows.map(parseRow), total };
}

export async function getPokemon(id: number): Promise<Pokemon | null> {
  const row = await queryOne<RawRow>(
    `SELECT p.*, s.genus, s.flavor_text, s.color, s.habitat, s.shape,
            s.base_happiness, s.capture_rate, s.is_legendary, s.is_mythical, s.is_baby
     FROM pokemon p
     LEFT JOIN pokemon_species s ON s.pokemon_id = p.id
     WHERE p.id = ?`,
    [id]
  );
  return row ? parseRow(row) : null;
}

export type Label = {
  label_key: string;
  value: string;
  source: "ai" | "rule" | "human";
  model: string | null;
};

export async function getLabels(pokemonId: number): Promise<Label[]> {
  const rows = await query<Label>(
    `SELECT label_key, value, source, model
     FROM labels
     WHERE pokemon_id = ?
     ORDER BY label_key,
       CASE source WHEN 'human' THEN 0 WHEN 'ai' THEN 1 ELSE 2 END`,
    [pokemonId]
  );

  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.label_key)) return false;
    seen.add(r.label_key);
    return true;
  });
}

export async function saveHumanLabel(
  pokemonId: number,
  labelKey: string,
  value: string
): Promise<void> {
  const now = new Date().toISOString();
  await execute(
    `INSERT INTO labels (pokemon_id, label_key, value, source, model, confidence, created_at, updated_at)
     VALUES (?, ?, ?, 'human', NULL, 1.0, ?, ?)
     ON CONFLICT(pokemon_id, label_key, source) DO UPDATE SET
       value = excluded.value, updated_at = excluded.updated_at`,
    [pokemonId, labelKey, value, now, now]
  );
}

export async function getAllLabelKeys(): Promise<string[]> {
  const rows = await query<{ label_key: string }>(
    "SELECT DISTINCT label_key FROM labels ORDER BY label_key"
  );
  return rows.map((r) => r.label_key);
}

export type LabeledPokemonEntry = {
  id: number;
  name: string;
  sprite_official_artwork: string | null;
  types: string[];
  label_value: string;
  source: string;
};

export async function getPokemonByLabel(
  labelKey: string
): Promise<Map<string, LabeledPokemonEntry[]>> {
  const rows = await query<{
    id: number;
    name: string;
    sprite_official_artwork: string | null;
    types: string;
    value: string;
    source: string;
  }>(
    `SELECT p.id, p.name, p.sprite_official_artwork, p.types, l.value, l.source
     FROM labels l
     JOIN pokemon p ON p.id = l.pokemon_id
     WHERE l.label_key = ?
     ORDER BY p.id,
       CASE l.source WHEN 'human' THEN 0 WHEN 'ai' THEN 1 ELSE 2 END`,
    [labelKey]
  );

  const seen = new Set<number>();
  const groups = new Map<string, LabeledPokemonEntry[]>();

  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);

    const entry: LabeledPokemonEntry = {
      id: row.id,
      name: row.name,
      sprite_official_artwork: row.sprite_official_artwork,
      types: JSON.parse(row.types ?? "[]"),
      label_value: row.value,
      source: row.source,
    };

    const key = row.value;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  return groups;
}

export async function getAllTypes(): Promise<string[]> {
  const rows = await query<{ types: string }>(
    "SELECT DISTINCT types FROM pokemon"
  );
  const typeSet = new Set<string>();
  for (const { types } of rows) {
    for (const t of JSON.parse(types ?? "[]")) typeSet.add(t);
  }
  return Array.from(typeSet).sort();
}
