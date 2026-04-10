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

/**
 * Suggests an icon value based on the payment method name.
 * Pattern matching is case-insensitive.
 *
 * Priority order (highest first):
 *   1. Credit card keywords → lucide:credit-card
 *   2. Cash/tunai keywords → lucide:banknote
 *   3. E-wallet brand names → lucide:smartphone
 *   4. Bank brand names → lucide:landmark
 *   5. No match → 'initials'
 */
export function suggestIconFromName(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes('credit card') || lower.includes('kartu kredit')) {
    return 'lucide:credit-card';
  }
  if (lower.includes('cash') || lower.includes('tunai') || lower.includes('uang')) {
    return 'lucide:banknote';
  }
  if (
    lower.includes('gopay') ||
    lower.includes('ovo') ||
    lower.includes('dana') ||
    lower.includes('shopeepay') ||
    lower.includes('linkaja') ||
    lower.includes('sakuku') ||
    lower.includes('flazz')
  ) {
    return 'lucide:smartphone';
  }
  if (
    lower.includes('bank') ||
    lower.includes('bca') ||
    lower.includes('bri') ||
    lower.includes('bni') ||
    lower.includes('mandiri') ||
    lower.includes('cimb') ||
    lower.includes('danamon') ||
    lower.includes('permata') ||
    lower.includes('bsi') ||
    lower.includes('maybank')
  ) {
    return 'lucide:landmark';
  }

  return 'initials';
}
