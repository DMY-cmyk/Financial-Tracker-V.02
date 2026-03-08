import { type Category } from './types';

// Keyword -> category name mapping for common Indonesian & English receipt terms
const KEYWORD_MAP: Record<string, string[]> = {
  Food: [
    'makan',
    'food',
    'resto',
    'restaurant',
    'cafe',
    'coffee',
    'kopi',
    'warung',
    'bakso',
    'nasi',
    'mie',
    'ayam',
    'sate',
    'pizza',
    'burger',
    'starbucks',
    'mcd',
    'kfc',
    'grabfood',
    'gofood',
    'shopee food',
  ],
  Transport: [
    'transport',
    'grab',
    'gojek',
    'uber',
    'taxi',
    'taksi',
    'bensin',
    'fuel',
    'gas',
    'parkir',
    'parking',
    'tol',
    'toll',
    'kereta',
    'train',
    'bus',
    'ojek',
    'pertamina',
    'shell',
  ],
  Utilities: [
    'listrik',
    'electric',
    'pln',
    'air',
    'water',
    'pdam',
    'internet',
    'wifi',
    'telkom',
    'indihome',
    'pulsa',
    'token',
    'gas',
    'pgn',
  ],
  Entertainment: [
    'entertainment',
    'hiburan',
    'movie',
    'film',
    'bioskop',
    'cinema',
    'netflix',
    'spotify',
    'game',
    'music',
    'musik',
    'youtube',
  ],
  Salary: ['salary', 'gaji', 'payroll'],
  Freelance: ['freelance', 'project', 'proyek', 'invoice', 'payment'],
};

/**
 * Suggest a category based on OCR-extracted text by matching keywords
 * against existing categories in the store.
 */
export function suggestCategory(
  text: string,
  categories: Category[]
): { name: string; confidence: number } | null {
  if (!text || categories.length === 0) return null;

  const lower = text.toLowerCase();
  const categoryNames = categories.map((c) => c.name);

  // Direct category name match
  for (const cat of categoryNames) {
    if (lower.includes(cat.toLowerCase())) {
      return { name: cat, confidence: 90 };
    }
  }

  // Keyword-based match
  let bestMatch: { name: string; score: number } | null = null;

  for (const [categoryKey, keywords] of Object.entries(KEYWORD_MAP)) {
    const matchingCategory = categoryNames.find(
      (name) => name.toLowerCase() === categoryKey.toLowerCase()
    );
    if (!matchingCategory) continue;

    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += kw.length; // longer matches = higher confidence
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { name: matchingCategory, score };
    }
  }

  if (bestMatch) {
    const confidence = Math.min(85, 50 + bestMatch.score * 3);
    return { name: bestMatch.name, confidence };
  }

  return null;
}
