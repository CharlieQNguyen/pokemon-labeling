// Shared input context passed to every label function.
class PokemonContext {
  name string
  types string[] @description("e.g. ['fire', 'flying']")
  genus string @description("e.g. 'Flame Pokémon'")
  flavor_text string @description("Pokédex entry")
}

// ── Group A: Visual / Aesthetic ───────────────────────────────────────────────

enum Vibe {
  Cozy        @description("warm, comforting, safe")
  Edgy        @description("sharp, dangerous, cool")
  Mysterious  @description("otherworldly, hard to read")
  Wholesome   @description("pure, cheerful, friendly")
  Chaotic     @description("wild, unpredictable, manic")
  Regal       @description("noble, majestic, dignified")
}

enum ColorMood {
  Warm    @description("reds, oranges, yellows dominate")
  Cool    @description("blues, greens, purples dominate")
  Dark    @description("blacks, greys, deep tones")
  Bright  @description("vivid, saturated, high contrast")
  Neutral @description("muted, earthy, balanced")
}

class VisualLabels {
  cuteness int              @description("1–10: how adorable is the design")
  creepiness int            @description("1–10: how unsettling or horror-adjacent")
  elegance int              @description("1–10: how graceful or refined")
  vibe Vibe
  color_mood ColorMood
  plushie_desirability int  @description("1–10: would you buy this as a stuffed animal")
}

// ── Group B: Personality / Behavioral ────────────────────────────────────────

class PersonalityLabels {
  friendliness int    @description("1–10: approachable vs. threatening")
  aggressiveness int  @description("1–10: fight-or-flight energy")
  loyalty int         @description("1–10: would it stick by your side")
  aloofness int       @description("1–10: cat-like detachment vs. eager-to-please")
}

// ── Group C: Adoptability / Lifestyle ────────────────────────────────────────

class AdoptabilityLabels {
  adoptability int        @description("1–10: overall pet desirability")
  apartment_friendly bool @description("suitable for small living spaces")
  kid_safe bool           @description("safe and gentle around children")
  low_maintenance int     @description("1–5: how easy to care for")
}

// ── Group D: Creative / Hypothetical ─────────────────────────────────────────

enum OverratedRating {
  Overrated     @description("gets more attention than it deserves")
  Underrated    @description("deserves more love than it gets")
  FairlyRated   @description("community attention matches its quality")
}

class CreativeLabels {
  most_likely_job string    @description("e.g. 'librarian', 'bouncer', 'CEO', 'therapist'")
  meme_potential int        @description("1–10: internet virality potential")
  overrated_underrated OverratedRating
  real_world_survivability int @description("1–10: would it thrive if real")
}
