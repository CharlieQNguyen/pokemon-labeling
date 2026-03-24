"use client";

export function TypeFilter({
  types,
  current,
  search,
}: {
  types: string[];
  current: string;
  search: string;
}) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (e.target.value) params.set("type", e.target.value);
    const q = params.toString();
    window.location.href = q ? `/?${q}` : "/";
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <option value="">All types</option>
      {types.map((t) => (
        <option key={t} value={t} className="capitalize">
          {t}
        </option>
      ))}
    </select>
  );
}
