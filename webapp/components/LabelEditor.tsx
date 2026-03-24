"use client";

import { useState } from "react";

type Label = {
  label_key: string;
  value: string;
  source: "ai" | "rule" | "human";
  model: string | null;
};

// Label metadata for rendering the right input type
const LABEL_CONFIG: Record<
  string,
  { group: string; type: "slider" | "bool" | "enum" | "text"; options?: string[]; max?: number }
> = {
  cuteness:               { group: "Visual", type: "slider" },
  creepiness:             { group: "Visual", type: "slider" },
  elegance:               { group: "Visual", type: "slider" },
  plushie_desirability:   { group: "Visual", type: "slider" },
  vibe:                   { group: "Visual", type: "enum", options: ["Cozy", "Edgy", "Mysterious", "Wholesome", "Chaotic", "Regal"] },
  color_mood:             { group: "Visual", type: "enum", options: ["Warm", "Cool", "Dark", "Bright", "Neutral"] },
  friendliness:           { group: "Personality", type: "slider" },
  aggressiveness:         { group: "Personality", type: "slider" },
  loyalty:                { group: "Personality", type: "slider" },
  aloofness:              { group: "Personality", type: "slider" },
  adoptability:           { group: "Adoptability", type: "slider" },
  low_maintenance:        { group: "Adoptability", type: "slider", max: 5 },
  apartment_friendly:     { group: "Adoptability", type: "bool" },
  kid_safe:               { group: "Adoptability", type: "bool" },
  most_likely_job:        { group: "Creative", type: "text" },
  meme_potential:         { group: "Creative", type: "slider" },
  real_world_survivability: { group: "Creative", type: "slider" },
  overrated_underrated:   { group: "Creative", type: "enum", options: ["Overrated", "Underrated", "FairlyRated"] },
};

function SourceBadge({ source }: { source: string }) {
  const colors =
    source === "human"
      ? "bg-green-100 text-green-700"
      : source === "ai"
        ? "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-gray-600";
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium uppercase ${colors}`}>
      {source}
    </span>
  );
}

function LabelRow({
  label,
  pokemonId,
  onUpdated,
}: {
  label: Label;
  pokemonId: number;
  onUpdated: (key: string, value: string, source: string) => void;
}) {
  const config = LABEL_CONFIG[label.label_key] ?? { group: "Other", type: "text" };
  const [saving, setSaving] = useState(false);

  async function save(newValue: string) {
    setSaving(true);
    await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pokemon_id: pokemonId, label_key: label.label_key, value: newValue }),
    });
    onUpdated(label.label_key, newValue, "human");
    setSaving(false);
  }

  const displayName = label.label_key.replace(/_/g, " ");

  return (
    <div className={`flex items-center gap-3 py-1.5 ${saving ? "opacity-50" : ""}`}>
      <span className="w-40 text-sm text-muted-foreground capitalize truncate" title={displayName}>
        {displayName}
      </span>

      {config.type === "slider" && (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="range"
            min={1}
            max={config.max ?? 10}
            value={parseInt(label.value) || 1}
            onChange={(e) => save(e.target.value)}
            className="flex-1 h-2 accent-primary cursor-pointer"
          />
          <span className="w-6 text-sm font-mono font-medium text-right">{label.value}</span>
        </div>
      )}

      {config.type === "bool" && (
        <div className="flex gap-2">
          {["Yes", "No"].map((opt) => {
            const isActive =
              (opt === "Yes" && (label.value === "1" || label.value === "true")) ||
              (opt === "No" && (label.value === "0" || label.value === "false"));
            return (
              <button
                key={opt}
                onClick={() => save(opt === "Yes" ? "1" : "0")}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {config.type === "enum" && (
        <select
          value={label.value}
          onChange={(e) => save(e.target.value)}
          className="text-sm border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {config.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {config.type === "text" && (
        <input
          type="text"
          defaultValue={label.value}
          onBlur={(e) => {
            if (e.target.value !== label.value) save(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="flex-1 text-sm border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}

      <SourceBadge source={label.source} />
    </div>
  );
}

export function LabelEditor({
  pokemonId,
  initialLabels,
}: {
  pokemonId: number;
  initialLabels: Label[];
}) {
  const [labels, setLabels] = useState<Label[]>(initialLabels);

  function handleUpdated(key: string, value: string, source: string) {
    setLabels((prev) =>
      prev.map((l) => (l.label_key === key ? { ...l, value, source: source as Label["source"] } : l))
    );
  }

  if (labels.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
        No labels yet. Run the labeling script to generate AI labels.
      </div>
    );
  }

  // Group labels
  const groups: Record<string, Label[]> = {};
  for (const l of labels) {
    const g = LABEL_CONFIG[l.label_key]?.group ?? "Other";
    (groups[g] ??= []).push(l);
  }

  return (
    <div className="mt-8 space-y-6">
      {Object.entries(groups).map(([group, groupLabels]) => (
        <div key={group}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {group} Labels
          </h2>
          <div className="rounded-xl border p-4 space-y-1">
            {groupLabels.map((l) => (
              <LabelRow
                key={l.label_key}
                label={l}
                pokemonId={pokemonId}
                onUpdated={handleUpdated}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
