import Link from "next/link";
import Image from "next/image";
import { typeColor } from "@/lib/type-colors";
import type { Pokemon } from "@/lib/db";

export function PokemonCard({ p }: { p: Pokemon }) {
  return (
    <Link
      href={`/pokemon/${p.id}`}
      className="group flex flex-col items-center rounded-xl border border-border bg-card p-4 gap-2 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 ease-out"
    >
      <span className="text-[10px] font-mono text-muted-foreground/70 self-start">
        #{String(p.id).padStart(4, "0")}
      </span>
      <div className="relative w-24 h-24">
        {p.sprite_official_artwork ? (
          <Image
            src={p.sprite_official_artwork}
            alt={p.name}
            fill
            className="object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-200 ease-out"
            sizes="96px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-muted rounded-lg" />
        )}
      </div>
      <span className="font-semibold capitalize text-sm tracking-tight">{p.name}</span>
      <div className="flex gap-1 flex-wrap justify-center">
        {p.types.map((t) => (
          <span
            key={t}
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize shadow-sm ${typeColor(t)}`}
          >
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}
