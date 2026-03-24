export const TYPE_COLORS: Record<string, string> = {
  normal:   "bg-stone-400 text-white",
  fire:     "bg-orange-500 text-white",
  water:    "bg-blue-500 text-white",
  electric: "bg-yellow-400 text-black",
  grass:    "bg-green-500 text-white",
  ice:      "bg-cyan-300 text-black",
  fighting: "bg-red-700 text-white",
  poison:   "bg-purple-500 text-white",
  ground:   "bg-yellow-600 text-white",
  flying:   "bg-indigo-400 text-white",
  psychic:  "bg-pink-500 text-white",
  bug:      "bg-lime-500 text-white",
  rock:     "bg-yellow-800 text-white",
  ghost:    "bg-purple-800 text-white",
  dragon:   "bg-indigo-700 text-white",
  dark:     "bg-stone-700 text-white",
  steel:    "bg-slate-400 text-white",
  fairy:    "bg-pink-300 text-black",
};

export function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? "bg-gray-400 text-white";
}
