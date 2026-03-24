// ── Group A: Visual labels ────────────────────────────────────────────────────

function LabelVisuals(pokemon: PokemonContext, image: image) -> VisualLabels {
  client GeminiFlash

  prompt #"
    You are building a Pokemon dataset. Evaluate this Pokemon's **visual design**.
    Base your ratings primarily on what you see in the image.

    Pokemon: {{ pokemon.name }}
    Type(s): {{ pokemon.types | join(", ") }}
    Genus: {{ pokemon.genus }}
    Pokédex: {{ pokemon.flavor_text }}

    {{ image }}

    Rate each dimension carefully. Use the full 1–10 range.
    {{ ctx.output_format }}
  "#
}

// ── Group B: Personality labels ───────────────────────────────────────────────

function LabelPersonality(pokemon: PokemonContext, image: image) -> PersonalityLabels {
  client GeminiFlash

  prompt #"
    You are building a Pokemon dataset. Evaluate this Pokemon's **personality and temperament**
    as expressed through its visual design, type, and Pokédex description.

    Pokemon: {{ pokemon.name }}
    Type(s): {{ pokemon.types | join(", ") }}
    Genus: {{ pokemon.genus }}
    Pokédex: {{ pokemon.flavor_text }}

    {{ image }}

    Imagine encountering this Pokemon in the wild. Rate each personality dimension.
    {{ ctx.output_format }}
  "#
}

// ── Group C: Adoptability labels ──────────────────────────────────────────────

function LabelAdoptability(pokemon: PokemonContext, image: image) -> AdoptabilityLabels {
  client GeminiFlash

  prompt #"
    You are building a Pokemon dataset. Evaluate how suitable this Pokemon would be
    as a **companion or pet**, considering its size, temperament, and nature.

    Pokemon: {{ pokemon.name }}
    Type(s): {{ pokemon.types | join(", ") }}
    Genus: {{ pokemon.genus }}
    Pokédex: {{ pokemon.flavor_text }}

    {{ image }}

    Be realistic — a legendary dragon probably isn't apartment-friendly.
    {{ ctx.output_format }}
  "#
}

// ── Group D: Creative labels ──────────────────────────────────────────────────

function LabelCreative(pokemon: PokemonContext, image: image) -> CreativeLabels {
  client GeminiFlash

  prompt #"
    You are building a fun Pokemon dataset. Answer these creative questions about this Pokemon.

    Pokemon: {{ pokemon.name }}
    Type(s): {{ pokemon.types | join(", ") }}
    Genus: {{ pokemon.genus }}
    Pokédex: {{ pokemon.flavor_text }}

    {{ image }}

    Be creative and specific — avoid generic answers like "fighter" or "athlete".
    For most_likely_job: think about personality, not type (e.g. a ghost-type could be a therapist).
    {{ ctx.output_format }}
  "#
}
