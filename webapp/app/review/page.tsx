import { getAllLabelKeys, getPokemonByLabel, type LabeledPokemonEntry } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { ReviewGrid } from "@/components/ReviewGrid";
import { LabelPicker } from "@/components/LabelPicker";
import { formatLabelValue, isFreeformLabel } from "@/lib/label-config";
import { FreeformReviewList } from "@/components/FreeformReviewList";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ label?: string }>;
}) {
  const { label = "" } = await searchParams;
  const allKeys = await getAllLabelKeys();
  const selectedLabel = label || allKeys[0] || "";
  const groups = selectedLabel ? await getPokemonByLabel(selectedLabel) : new Map();

  // Map raw values to display values and re-group
  const displayGroups = new Map<string, LabeledPokemonEntry[]>();
  for (const [rawValue, entries] of groups.entries()) {
    const display = formatLabelValue(selectedLabel, rawValue);
    const existing = displayGroups.get(display) ?? [];
    existing.push(...entries);
    displayGroups.set(display, existing);
  }

  // Sort groups: for numeric values sort numerically, else alphabetically
  const sortedEntries = Array.from(displayGroups.entries()).sort(([a], [b]) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numB - numA; // high to low
    return a.localeCompare(b);
  });

  const totalLabeled = sortedEntries.reduce((s, [, v]) => s + v.length, 0);

  return (
    <main className="min-h-screen bg-background">
      <Navbar active="review" />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="sticky top-[57px] z-10 bg-background/95 backdrop-blur border-b py-4 -mx-6 px-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Review Labels</h2>
            <p className="text-sm text-muted-foreground">
              {totalLabeled} Pokemon labeled for &ldquo;{selectedLabel.replace(/_/g, " ")}&rdquo;
            </p>
          </div>
          <LabelPicker allKeys={allKeys} current={selectedLabel} />
        </div>

        {isFreeformLabel(selectedLabel) ? (
          <FreeformReviewList
            key={selectedLabel}
            labelKey={selectedLabel}
            entries={Array.from(groups.values()).flat()}
          />
        ) : (
          <ReviewGrid
            key={selectedLabel}
            labelKey={selectedLabel}
            groups={sortedEntries.map(([value, entries]) => ({
              value,
              entries: entries.map((e: LabeledPokemonEntry) => ({
                ...e,
              })),
            }))}
          />
        )}
      </div>
    </main>
  );
}
