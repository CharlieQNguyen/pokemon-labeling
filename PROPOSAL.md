# Pokemon Labeling Project — Proposal

## Core Thesis

Humans are uniquely good at visual, aesthetic, and emotional judgment. The PokeAPI provides high-quality official artwork for every Pokemon. The pipeline should treat **vision as the primary signal**: an image + minimal context → structured labels. AI pre-labels at scale cheaply; humans correct and calibrate via a Next.js webapp.

---

## What the PokeAPI Actually Provides

### Images (the primary input for vision labeling)

| Source | Format | Resolution | URL pattern |
|---|---|---|---|
| **Official Artwork** | PNG | 475×475 | `sprites.other.official-artwork.front_default` |
| **Home** | PNG | 512×512 | `sprites.other.home.front_default` |
| **Dream World** | SVG | Vector | `sprites.other.dream_world.front_default` |
| **Showdown** | GIF (animated) | ~96×96 | `sprites.other.showdown.front_default` |
| **Game sprites** | PNG | ~96×96 | Per-generation, front/back/shiny variants |

→ **Use official artwork for AI labeling and human review** — highest quality, consistent style across all Pokemon.

### Text fields available for prompt context

From `/pokemon/{id}`:
- `name`, `types[]`, `abilities[]`, `height`, `weight`, `base_experience`
- `stats{}` — HP, Attack, Defense, Sp. Atk, Sp. Def, Speed

From `/pokemon-species/{id}`:
- `flavor_text_entries[]` — Pokedex descriptions (multiple games/languages)
- `genera[]` — e.g. "Seed Pokémon"
- `color`, `shape`, `habitat`
- `base_happiness`, `capture_rate`, `growth_rate`
- `egg_groups[]`
- `is_legendary`, `is_mythical`, `is_baby`
- `gender_rate`

From `/evolution-chain/{id}`:
- Full evolutionary family structure

→ **For vision prompts, pass:** official artwork URL + name + types + genus + one flavor text entry. This gives the model enough context without over-constraining its visual judgment.

---

## Label Taxonomy

Labels are grouped by what kind of judgment they require. This maps directly to BAML function decomposition.

### Group A: Visual / Aesthetic (vision model excels)
| Label | Scale | Notes |
|---|---|---|
| `cuteness` | 1–10 | Core subjective visual label |
| `creepiness` | 1–10 | Horror/unsettling visual quality |
| `elegance` | 1–10 | Graceful, refined design |
| `vibe` | enum | `cozy \| edgy \| mysterious \| wholesome \| chaotic \| regal` |
| `color_mood` | enum | `warm \| cool \| neutral \| dark \| bright` |
| `design_complexity` | enum | `simple \| moderate \| intricate` |
| `plushie_desirability` | 1–10 | Would it sell as a stuffed animal? |

### Group B: Personality / Behavioral (vision + text)
| Label | Scale | Notes |
|---|---|---|
| `friendliness` | 1–10 | Approachable vs. threatening |
| `aggressiveness` | 1–10 | Fight-or-flight vibes |
| `loyalty` | 1–10 | Would it stick by you? |
| `aloofness` | 1–10 | Cat-like detachment vs. eager |

### Group C: Lifestyle / Adoptability (text-heavy, vision confirms)
| Label | Scale | Notes |
|---|---|---|
| `adoptability` | 1–10 | Overall pet desirability |
| `apartment_friendly` | bool | Size/energy appropriate for small spaces |
| `kid_safe` | bool | Safe around children |
| `low_maintenance` | 1–5 | Care difficulty |

### Group D: Hypothetical / Creative (most fun for humans)
| Label | Scale | Notes |
|---|---|---|
| `most_likely_job` | free text | "librarian", "bouncer", "CEO" |
| `real_world_survivability` | 1–10 | Would it thrive if real? |
| `meme_potential` | 1–10 | Internet virality potential |
| `overrated_underrated` | enum | `overrated \| underrated \| fairly_rated` |
| `starter_worthy` | bool | Should it have been a starter? |

---

## AI Pre-labeling with BAML

### Why BAML

[BAML](https://docs.boundaryml.com) is a DSL that compiles to type-safe TypeScript/Python clients. Key benefits for this project:
- **Composable functions** — one `.baml` file per label group, shared type schemas
- **Typed outputs** — structured JSON enforced via schema-aligned parsing (works even without native tool-calling)
- **Multi-provider** — swap Gemini/Claude/GPT-4o-mini per function with one line
- **First-class image support** — pass image URLs directly as `image` type inputs
- **Test blocks** — validate prompts against fixtures before running at scale

### Recommended Vision Model: Gemini 1.5 Flash

| Model | Vision cost | Quality | BAML support |
|---|---|---|---|
| **Gemini 1.5 Flash** | ~$0.07 per 1MP image | Excellent for description | ✓ |
| Claude 3 Haiku | ~$0.25/M tokens + image | Good | ✓ |
| GPT-4o-mini | ~$0.15/M tokens (but image floor = expensive) | Good | ✓ |

→ **All 1025 Pokemon official artworks through Gemini 1.5 Flash ≈ $1–3 total.**

### BAML File Structure

```
baml_src/
  clients.baml          # LLM client configs (Gemini Flash, Haiku fallback)
  types.baml            # Shared label schemas (PokemonContext, enums)
  visual_labels.baml    # Group A: cuteness, vibe, color, etc.
  personality.baml      # Group B: friendliness, loyalty, etc.
  adoptability.baml     # Group C: pet/lifestyle labels
  creative.baml         # Group D: job, meme potential, etc.
  __tests__/
    bulbasaur.baml      # Fixture-based tests for each function
```

### Example BAML sketch

```baml
// types.baml
class PokemonContext {
  name string
  types string[]
  genus string
  flavor_text string
  sprite_url string @description("official artwork PNG URL")
}

enum Vibe {
  Cozy
  Edgy
  Mysterious
  Wholesome
  Chaotic
  Regal
}

class VisualLabels {
  cuteness int @description("1-10, how adorable is the design")
  creepiness int @description("1-10, how unsettling or horror-adjacent")
  elegance int @description("1-10, how graceful or refined")
  vibe Vibe
  plushie_desirability int @description("1-10, would you buy this as a stuffed animal")
}

// visual_labels.baml
function LabelVisuals(pokemon: PokemonContext) -> VisualLabels {
  client "google-ai/gemini-1.5-flash"

  prompt #"
    You are labeling Pokemon designs for a dataset.
    Evaluate the Pokemon based primarily on its visual appearance.

    Pokemon: {{ pokemon.name }}
    Type(s): {{ pokemon.types | join(", ") }}
    Genus: {{ pokemon.genus }}
    Pokedex entry: {{ pokemon.flavor_text }}

    {{ _.image(pokemon.sprite_url) }}

    {{ ctx.output_format }}
  "#
}

test LabelBulbasaur {
  functions [LabelVisuals]
  args {
    pokemon {
      name "bulbasaur"
      types ["grass", "poison"]
      genus "Seed Pokémon"
      flavor_text "A strange seed was planted on its back at birth."
      sprite_url "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png"
    }
  }
}
```

---

## Next.js Webapp

### Role in the pipeline

The webapp is a **label correction interface**, not a blank-slate labeling tool. AI pre-labels are shown by default; humans accept, adjust, or override. Every change is recorded with `source: "human"`.

### Recommended MVP: Vision-First Card Review

```
┌─────────────────────────────────────────────────────┐
│  [← prev]   Bulbasaur  #001   [next →]    [j/k]    │
├─────────────┬───────────────────────────────────────┤
│             │  Cuteness      ████████░░  8  [AI]    │
│  [sprite]   │  Creepiness    ██░░░░░░░░  2  [AI]    │
│  475×475    │  Elegance      █████░░░░░  5  [AI]    │
│             │  Vibe          [Wholesome ▼]  [AI]    │
│             │  Plushie       ████████░░  8  [AI]    │
├─────────────┴───────────────────────────────────────┤
│  Most likely job:  [gardener_____________] [AI]     │
│  Adoptability:     ████████░░  8          [AI]      │
└─────────────────────────────────────────────────────┘
[AI] badge turns [✓ human] when reviewer touches a field
```

**Keyboard shortcuts:** `j/k` navigate, `1–9` set numeric labels, `Enter` confirm and advance.

### Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 App Router | SSR for fast image loads |
| UI | shadcn/ui + Tailwind | Rapid labeling UI components |
| DB | SQLite via Prisma | Local-first, zero infra |
| State | Zustand | Label diff tracking client-side |
| Export | CSV + JSON via API route | Easy downstream use |

### Future options (after MVP)

- **Pairwise comparison mode** — "which is cuter?" → Bradley-Terry ranking for better calibration on subjective scales
- **Multi-reviewer mode** — Supabase auth + inter-rater reliability (Krippendorff's alpha)
- **Disagreement queue** — Flag labels where AI and human diverge significantly for prioritized review

---

## Build Order

1. **Data fetch script** — Pull all 1025 Pokemon from PokeAPI, store name + types + genus + flavor text + artwork URL as JSON
2. **BAML setup** — `npx @boundaryml/baml init`, write `types.baml` + `visual_labels.baml`, test on 5 Pokemon
3. **Pre-label script** — Run all Pokemon through Gemini 1.5 Flash via BAML functions, write results to SQLite
4. **Next.js app** — Card review interface showing official artwork + pre-labels, human corrections saved to DB
5. **Gen 1 pass** — Manually review all 151 Gen 1 Pokemon to calibrate label definitions
6. **Export** — CSV/JSON download of final labeled dataset

---

## Open Questions

- Should we version label schemas so we can re-run AI labeling if definitions change?
- Do we want audio cries as an additional input signal for any labels?
- Should the webapp support the animated Showdown sprites for "energy" labels?
- Public leaderboard / shareable dataset, or private for now?
