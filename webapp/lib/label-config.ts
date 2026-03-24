const BOOL_LABELS = new Set(["apartment_friendly", "kid_safe"]);
const FREEFORM_LABELS = new Set(["most_likely_job"]);

export function isBoolLabel(key: string): boolean {
  return BOOL_LABELS.has(key);
}

export function formatLabelValue(key: string, raw: string): string {
  if (isBoolLabel(key)) {
    return raw === "1" || raw === "true" ? "Yes" : "No";
  }
  return raw;
}

export function isFreeformLabel(key: string): boolean {
  return FREEFORM_LABELS.has(key);
}

// Inverse: convert display value back to storage value
export function rawLabelValue(key: string, display: string): string {
  if (isBoolLabel(key)) {
    return display === "Yes" ? "1" : "0";
  }
  return display;
}
