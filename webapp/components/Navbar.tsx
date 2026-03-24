import Link from "next/link";

export function Navbar({ active }: { active: "browse" | "review" }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-primary">
          Pokemon Labeling
        </Link>
        <nav className="flex gap-1 text-sm font-medium">
          <Link
            href="/"
            className={`px-3.5 py-1.5 rounded-lg ${
              active === "browse"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Browse
          </Link>
          <Link
            href="/review"
            className={`px-3.5 py-1.5 rounded-lg ${
              active === "review"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Review Labels
          </Link>
        </nav>
      </div>
    </header>
  );
}
