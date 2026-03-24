# Pokemon Labeling

A human-in-the-loop data labeling pipeline for Pokemon. AI generates subjective labels (cuteness, vibe, adoptability, etc.) using vision models; humans review and refine via a Next.js webapp.

**Live demo:** [pokemon-labeling.vercel.app](https://pokemon-labeling.vercel.app)

## How it works

1. **Fetch** — Pull all 1,025 Pokemon from [PokeAPI](https://pokeapi.co/) into SQLite (types, stats, species data, official artwork URLs)
2. **Label** — Vision model (Gemini 2.5 Flash) evaluates each Pokemon's artwork and generates 18 structured labels via [BAML](https://docs.boundaryml.com) prompts
3. **Refine** — Next.js webapp lets humans review, correct, and override AI labels
4. **Deploy** — Infrastructure managed with Terraform (Vercel + Turso), CI/CD via GitHub Actions

Total AI labeling cost: **~$0.71** for all 1,025 Pokemon across 18 labels.

## Labels

| Group | Labels | Type |
|---|---|---|
| **Visual** | cuteness, creepiness, elegance, plushie desirability | 1–10 scale |
| **Visual** | vibe (cozy/edgy/mysterious/wholesome/chaotic/regal), color mood | enum |
| **Personality** | friendliness, aggressiveness, loyalty, aloofness | 1–10 scale |
| **Adoptability** | adoptability, low maintenance | 1–10 / 1–5 scale |
| **Adoptability** | apartment friendly, kid safe | yes/no |
| **Creative** | most likely job | free text |
| **Creative** | meme potential, real world survivability | 1–10 scale |
| **Creative** | overrated/underrated | enum |

## Architecture

```
pokemon-labeling/
├── scripts/               # Python data pipeline
│   ├── fetch_pokemon.py   # Stage 1: PokeAPI → SQLite
│   ├── label_pokemon.py   # Stage 2: BAML + VLM → labels
│   ├── baml_src/          # Composable prompt definitions
│   │   ├── clients.baml   # Model configs (Gemini, Claude, Qwen)
│   │   ├── types.baml     # Shared schemas + enums
│   │   └── labels.baml    # 4 label functions (visual, personality, adoptability, creative)
│   └── seed_turso.sh      # Push local data to Turso
├── webapp/                # Next.js 15 App Router
│   ├── app/
│   │   ├── page.tsx       # Browse grid (search, filter by type, paginated)
│   │   ├── pokemon/[id]/  # Detail page with label editor
│   │   ├── review/        # Review Labels view (grouped by category)
│   │   └── api/labels/    # POST endpoint for saving human overrides
│   ├── components/
│   │   ├── LabelEditor    # Sliders, toggles, dropdowns, text inputs
│   │   ├── ReviewGrid     # Click-to-reassign category review
│   │   └── FreeformReviewList  # Inline editing for text labels
│   └── lib/
│       └── db.ts          # Dual-mode: better-sqlite3 (local) / @libsql/client (Turso)
├── infra/                 # Terraform IaC
│   └── main.tf            # Vercel project + Turso DB + env vars
└── .github/workflows/
    └── deploy.yml         # CI/CD: build → terraform → deploy
```

## Tech Stack

| Layer | Technology |
|---|---|
| Data pipeline | Python, asyncio, httpx |
| AI prompts | [BAML](https://docs.boundaryml.com) (composable, type-safe, multi-provider) |
| Vision model | Gemini 2.5 Flash via Google AI |
| Frontend | Next.js 15, Tailwind CSS, shadcn/ui |
| Database | SQLite (local dev) / [Turso](https://turso.tech) (production) |
| Infrastructure | Terraform (Vercel + Turso providers) |
| CI/CD | GitHub Actions |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- A Gemini API key ([aistudio.google.com](https://aistudio.google.com/apikey))

### Local Development

```bash
# Clone
git clone https://github.com/CharlieQNguyen/pokemon-labeling.git
cd pokemon-labeling

# Python setup
python -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt

# Stage 1: Fetch Pokemon data
python scripts/fetch_pokemon.py

# Stage 2: Generate AI labels (requires GEMINI_API_KEY in .env)
echo "GEMINI_API_KEY=your-key" > .env
cd scripts && baml-cli generate && cd ..
python scripts/label_pokemon.py --limit 10  # test batch
python scripts/label_pokemon.py --resume    # full run

# Stage 3: Run the webapp
cd webapp
npm install
npm run dev
# Open http://localhost:3000
```

### Deploy to Production

```bash
# Install Terraform and Turso CLI
brew install terraform
curl -sSfL https://get.tur.so/install.sh | bash

# Set env vars (see .env.example)
# Then:
cd infra
terraform init
terraform apply

# Seed Turso with local data
cd scripts && bash seed_turso.sh
```

## Webapp Features

- **Browse** — Paginated grid of all 1,025 Pokemon with search and type filtering
- **Detail view** — Artwork, stats, abilities, Pokedex entry, and all 18 labels with inline editing
- **Review Labels** — View all Pokemon grouped by a label's value; click to reassign categories instantly
- **Dual editing modes** — Grouped view for categorical/numeric labels, inline list for free-text labels
- **Source tracking** — Every label shows whether it came from AI or human review
