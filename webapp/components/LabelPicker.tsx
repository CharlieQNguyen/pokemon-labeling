"use client";

import { useRouter } from "next/navigation";

const LABEL_GROUPS: { group: string; keys: string[] }[] = [
  {
    group: "Visual",
    keys: ["cuteness", "creepiness", "elegance", "plushie_desirability", "vibe", "color_mood"],
  },
  {
    group: "Personality",
    keys: ["friendliness", "aggressiveness", "loyalty", "aloofness"],
  },
  {
    group: "Adoptability",
    keys: ["adoptability", "apartment_friendly", "kid_safe", "low_maintenance"],
  },
  {
    group: "Creative",
    keys: ["most_likely_job", "meme_potential", "overrated_underrated", "real_world_survivability"],
  },
];

export function LabelPicker({
  allKeys,
  current,
}: {
  allKeys: string[];
  current: string;
}) {
  const router = useRouter();
  const allKeysSet = new Set(allKeys);

  // Collect any keys not in our predefined groups
  const groupedKeys = new Set(LABEL_GROUPS.flatMap((g) => g.keys));
  const ungrouped = allKeys.filter((k) => !groupedKeys.has(k));

  return (
    <div className="flex gap-2 items-center">
      <label className="text-sm text-muted-foreground">Label:</label>
      <select
        value={current}
        onChange={(e) => router.push(`/review?label=${e.target.value}`)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {LABEL_GROUPS.map((g) => {
          const available = g.keys.filter((k) => allKeysSet.has(k));
          if (available.length === 0) return null;
          return (
            <optgroup key={g.group} label={g.group}>
              {available.map((k) => (
                <option key={k} value={k}>
                  {k.replace(/_/g, " ")}
                </option>
              ))}
            </optgroup>
          );
        })}
        {ungrouped.length > 0 && (
          <optgroup label="Other">
            {ungrouped.map((k) => (
              <option key={k} value={k}>
                {k.replace(/_/g, " ")}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
