/**
 * Derives 1–3 character initials from a payment method name.
 *
 * Rule 1 (multi-word): take the first letter of each space-separated word, max 3.
 * Rule 2 (single word): take the first 3 characters.
 * Rule 3 (empty/whitespace): return "?".
 */
export function computeInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';

  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    return words
      .map((word) => word[0]?.toUpperCase() ?? '')
      .filter(Boolean)
      .slice(0, 3)
      .join('');
  }

  return trimmed.slice(0, 3).toUpperCase();
}
