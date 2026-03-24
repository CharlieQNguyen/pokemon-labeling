import { listPokemon, getAllTypes } from "@/lib/db";
import { PokemonCard } from "@/components/PokemonCard";
import { TypeFilter } from "@/components/TypeFilter";
import { Navbar } from "@/components/Navbar";

const PAGE_SIZE = 48;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; page?: string }>;
}) {
  const { search = "", type = "", page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page));

  const [{ pokemon, total }, allTypes] = await Promise.all([
    listPokemon({ search, type, page: currentPage, pageSize: PAGE_SIZE }),
    getAllTypes(),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(params: Record<string, string>) {
    const p = new URLSearchParams({ search, type, page: String(currentPage), ...params });
    if (!p.get("search")) p.delete("search");
    if (!p.get("type")) p.delete("type");
    if (p.get("page") === "1") p.delete("page");
    const q = p.toString();
    return q ? `/?${q}` : "/";
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar active="browse" />
      <div className="sticky top-[57px] z-10 border-b bg-background/95 backdrop-blur px-6 py-3">
        <div className="max-w-7xl mx-auto flex gap-2 items-center">
          <form method="get" className="flex gap-2 flex-1 sm:flex-none">
            {type && <input type="hidden" name="type" value={type} />}
            <input
              name="search"
              defaultValue={search}
              placeholder="Search name or #..."
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium"
            >
              Search
            </button>
          </form>
          <TypeFilter types={allTypes} current={type} search={search} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <p className="text-sm text-muted-foreground mb-4">
          {total} Pokemon{search || type ? " matching filters" : ""}
          {totalPages > 1 && ` — page ${currentPage} of ${totalPages}`}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {pokemon.map((p) => (
            <PokemonCard key={p.id} p={p} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {currentPage > 1 && (
              <a
                href={buildUrl({ page: String(currentPage - 1) })}
                className="px-4 py-2 rounded-md border text-sm hover:bg-muted"
              >
                ← Prev
              </a>
            )}
            <span className="px-4 py-2 text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages && (
              <a
                href={buildUrl({ page: String(currentPage + 1) })}
                className="px-4 py-2 rounded-md border text-sm hover:bg-muted"
              >
                Next →
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
