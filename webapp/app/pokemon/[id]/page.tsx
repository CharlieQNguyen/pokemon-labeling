import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPokemon, getLabels } from "@/lib/db";
import { typeColor } from "@/lib/type-colors";
import { LabelEditor } from "@/components/LabelEditor";
import { Navbar } from "@/components/Navbar";

export default async function PokemonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPokemon(parseInt(id));
  if (!p) notFound();
  const labels = await getLabels(p.id);

  const stats = [
    { key: "HP",       val: p.stat_hp },
    { key: "Attack",   val: p.stat_attack },
    { key: "Defense",  val: p.stat_defense },
    { key: "Sp. Atk",  val: p.stat_sp_atk },
    { key: "Sp. Def",  val: p.stat_sp_def },
    { key: "Speed",    val: p.stat_speed },
  ];
  const totalStats = stats.reduce((s, x) => s + (x.val ?? 0), 0);

  return (
    <main className="min-h-screen bg-background">
      <Navbar active="browse" />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to browse
          </Link>
          <div className="flex gap-2">
            {p.id > 1 && (
              <Link href={`/pokemon/${p.id - 1}`} className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted font-medium">
                ← Prev
              </Link>
            )}
            {p.id < 1025 && (
              <Link href={`/pokemon/${p.id + 1}`} className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted font-medium">
                Next →
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-8 items-start">
          {/* Artwork */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="relative w-48 h-48 bg-muted/50 rounded-2xl border">
              {p.sprite_official_artwork && (
                <Image
                  src={p.sprite_official_artwork}
                  alt={p.name}
                  fill
                  className="object-contain p-3 drop-shadow-md"
                  sizes="192px"
                  unoptimized
                  priority
                />
              )}
            </div>
            <span className="text-xs font-mono text-muted-foreground/70">
              #{String(p.id).padStart(4, "0")}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-3xl font-bold capitalize tracking-tight">{p.name}</h1>
              {p.genus && (
                <span className="text-muted-foreground text-sm">{p.genus}</span>
              )}
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              {p.types.map((t) => (
                <span
                  key={t}
                  className={`text-xs px-3 py-1 rounded-full font-semibold capitalize shadow-sm ${typeColor(t)}`}
                >
                  {t}
                </span>
              ))}
              {!!p.is_legendary && (
                <span className="text-xs px-3 py-1 rounded-full bg-amber-400/90 text-amber-950 font-semibold shadow-sm">
                  Legendary
                </span>
              )}
              {!!p.is_mythical && (
                <span className="text-xs px-3 py-1 rounded-full bg-pink-400/90 text-white font-semibold shadow-sm">
                  Mythical
                </span>
              )}
              {!!p.is_baby && (
                <span className="text-xs px-3 py-1 rounded-full bg-sky-200 text-sky-800 font-semibold shadow-sm">
                  Baby
                </span>
              )}
            </div>

            {p.flavor_text && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed italic max-w-prose">
                &ldquo;{p.flavor_text}&rdquo;
              </p>
            )}

            {/* Quick facts */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {[
                ["Height", `${(p.height / 10).toFixed(1)} m`],
                ["Weight", `${(p.weight / 10).toFixed(1)} kg`],
                ["Color", p.color],
                ["Habitat", p.habitat ?? "unknown"],
                ["Shape", p.shape],
                ["Happiness", p.base_happiness],
                ["Capture rate", p.capture_rate],
              ].map(([label, val]) =>
                val != null ? (
                  <div key={String(label)} className="rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      {label}
                    </div>
                    <div className="font-semibold capitalize mt-0.5">{val}</div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>

        {/* Base stats */}
        <div className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Base Stats
          </h2>
          <div className="space-y-2.5">
            {stats.map(({ key, val }) => (
              <div key={key} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-muted-foreground text-right text-xs font-medium">{key}</span>
                <span className="w-8 font-mono font-semibold text-right">{val}</span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary/80 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, ((val ?? 0) / 255) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 text-sm border-t pt-3 mt-3">
              <span className="w-16 text-muted-foreground text-right text-xs font-medium">Total</span>
              <span className="w-8 font-mono font-bold text-right">{totalStats}</span>
            </div>
          </div>
        </div>

        {/* Abilities */}
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Abilities
          </h2>
          <div className="flex gap-2 flex-wrap">
            {p.abilities.map((a) => (
              <span
                key={a.name}
                className={`text-sm px-3 py-1.5 rounded-lg border capitalize font-medium ${
                  a.is_hidden ? "border-dashed text-muted-foreground bg-muted/30" : "bg-card"
                }`}
              >
                {a.name}
                {a.is_hidden && (
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">(hidden)</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Labels */}
        <LabelEditor pokemonId={p.id} initialLabels={labels} />
      </div>
    </main>
  );
}
