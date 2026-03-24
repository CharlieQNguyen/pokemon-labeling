"use client";

import { useState } from "react";
import Image from "next/image";

type Entry = {
  id: number;
  name: string;
  sprite_official_artwork: string | null;
  types: string[];
  label_value: string;
  source: string;
};

function FreeformRow({
  entry,
  labelKey,
  onSaved,
}: {
  entry: Entry;
  labelKey: string;
  onSaved: (id: number, newValue: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function save(newValue: string) {
    if (newValue === entry.label_value) return;
    setSaving(true);
    await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pokemon_id: entry.id, label_key: labelKey, value: newValue }),
    });
    onSaved(entry.id, newValue);
    setSaving(false);
  }

  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors ${
        saving ? "opacity-50" : ""
      }`}
    >
      <span className="text-xs font-mono text-muted-foreground/70 w-10 text-right">
        #{entry.id}
      </span>
      <div className="relative w-10 h-10 flex-shrink-0">
        {entry.sprite_official_artwork ? (
          <Image
            src={entry.sprite_official_artwork}
            alt={entry.name}
            fill
            className="object-contain"
            sizes="40px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-muted rounded" />
        )}
      </div>
      <span className="text-sm font-medium capitalize w-28 truncate">{entry.name}</span>
      <input
        type="text"
        defaultValue={entry.label_value}
        onBlur={(e) => save(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="flex-1 text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {entry.source === "human" && (
        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Human reviewed" />
      )}
    </div>
  );
}

export function FreeformReviewList({
  labelKey,
  entries: initialEntries,
}: {
  labelKey: string;
  entries: Entry[];
}) {
  const [entries, setEntries] = useState<Entry[]>(
    [...initialEntries].sort((a, b) => a.id - b.id)
  );
  const [search, setSearch] = useState("");

  function handleSaved(id: number, newValue: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, label_value: newValue, source: "human" } : e))
    );
  }

  const filtered = search
    ? entries.filter(
        (e) =>
          e.name.includes(search.toLowerCase()) ||
          e.label_value.toLowerCase().includes(search.toLowerCase()) ||
          String(e.id) === search
      )
    : entries;

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name or value..."
          className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="space-y-0.5">
        {filtered.map((entry) => (
          <FreeformRow
            key={entry.id}
            entry={entry}
            labelKey={labelKey}
            onSaved={handleSaved}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        {filtered.length} of {entries.length} Pokemon shown. Edit inline and press Enter or click away to save.
        Green dot = human reviewed.
      </p>
    </div>
  );
}
