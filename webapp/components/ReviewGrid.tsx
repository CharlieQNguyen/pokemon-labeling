"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { rawLabelValue } from "@/lib/label-config";

type Entry = {
  id: number;
  name: string;
  sprite_official_artwork: string | null;
  types: string[];
  label_value: string;
  source: string;
};

type Group = {
  value: string;
  entries: Entry[];
};

function MiniCard({
  entry,
  onClick,
}: {
  entry: Entry;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className="relative flex flex-col items-center p-2 rounded-lg border cursor-pointer transition-all border-border hover:border-primary/50"
    >
      {entry.source === "human" && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" title="Human reviewed" />
      )}
      <div className="relative w-14 h-14">
        {entry.sprite_official_artwork ? (
          <Image
            src={entry.sprite_official_artwork}
            alt={entry.name}
            fill
            className="object-contain"
            sizes="56px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-muted rounded" />
        )}
      </div>
      <span className="text-[10px] capitalize truncate w-full text-center mt-1">{entry.name}</span>
    </div>
  );
}

function QuickReassignPopup({
  entry,
  allValues,
  position,
  onReassign,
  onClose,
}: {
  entry: Entry;
  allValues: string[];
  position: { x: number; y: number };
  onReassign: (id: number, newValue: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Position popup so it stays on screen
  const popupHeight = Math.min(allValues.length * 32 + 50, 320);
  const adjustedY = Math.min(position.y, window.innerHeight - popupHeight - 8);
  const adjustedX = Math.min(position.x, window.innerWidth - 180);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-background border rounded-lg shadow-lg p-2 min-w-[140px] max-h-[320px] flex flex-col"
      style={{ left: adjustedX, top: Math.max(8, adjustedY) }}
    >
      <div className="flex items-center gap-2 px-2 py-1 border-b mb-1 flex-shrink-0">
        <div className="relative w-8 h-8 flex-shrink-0">
          {entry.sprite_official_artwork && (
            <Image src={entry.sprite_official_artwork} alt={entry.name} fill className="object-contain" sizes="32px" unoptimized />
          )}
        </div>
        <span className="text-xs font-medium capitalize truncate">{entry.name}</span>
      </div>
      <div className="overflow-y-auto flex-1">
        {allValues.map((v) => (
          <button
            key={v}
            onClick={() => {
              onReassign(entry.id, v);
              onClose();
            }}
            className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors ${
              v === entry.label_value ? "font-bold text-primary" : ""
            }`}
          >
            {v === entry.label_value ? `${v} (current)` : v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewGrid({
  labelKey,
  groups: initialGroups,
}: {
  labelKey: string;
  groups: Group[];
}) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState<{ entry: Entry; position: { x: number; y: number } } | null>(null);

  const allValues = groups.map((g) => g.value);

  async function reassignOne(id: number, targetDisplayValue: string) {
    setSaving(true);
    const storageValue = rawLabelValue(labelKey, targetDisplayValue);
    await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pokemon_id: id, label_key: labelKey, value: storageValue }),
    });

    setGroups((prev) => {
      let movedEntry: Entry | null = null;
      const updated = prev.map((g) => ({
        ...g,
        entries: g.entries.filter((e) => {
          if (e.id === id) {
            movedEntry = { ...e, label_value: targetDisplayValue, source: "human" };
            return false;
          }
          return true;
        }),
      }));

      if (movedEntry) {
        const targetGroup = updated.find((g) => g.value === targetDisplayValue);
        if (targetGroup) {
          targetGroup.entries.push(movedEntry);
        } else {
          updated.push({ value: targetDisplayValue, entries: [movedEntry] });
        }
      }

      return updated.filter((g) => g.entries.length > 0);
    });

    setSaving(false);
  }

  function handleCardClick(entry: Entry, e: React.MouseEvent) {
    setPopup({
      entry,
      position: { x: e.clientX, y: e.clientY },
    });
  }

  return (
    <div className={saving ? "opacity-50 pointer-events-none" : ""}>
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.value}>
            <div className="sticky top-[125px] z-[5] bg-background border-b py-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold">{group.value}</h3>
              <span className="text-xs text-muted-foreground">({group.entries.length})</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-14 xl:grid-cols-16 gap-2">
              {group.entries.map((entry) => (
                <MiniCard
                  key={entry.id}
                  entry={entry}
                  onClick={(e) => handleCardClick(entry, e)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {popup && (
        <QuickReassignPopup
          entry={popup.entry}
          allValues={allValues}
          position={popup.position}
          onReassign={(id, newValue) => reassignOne(id, newValue)}
          onClose={() => setPopup(null)}
        />
      )}

      <p className="text-xs text-muted-foreground mt-6">
        Click a Pokemon to reassign its label. Green dot = human reviewed.
      </p>
    </div>
  );
}
