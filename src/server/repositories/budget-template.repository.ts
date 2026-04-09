import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';
import type { CategoryBudgetEntry } from '@/lib/api/contracts';

interface TemplateRow {
  id: string;
  name: string;
  category_budgets: string;
  created_at: string;
}

export interface TemplateSummary {
  id: string;
  name: string;
  categoryCount: number;
  createdAt: string;
  preview: string[];
}

interface SuggestionRow {
  category_id: string;
  category_name: string;
  color: string;
  suggested_budget: number;
  based_on_months: number;
}

function parseEntries(raw: string): CategoryBudgetEntry[] {
  try {
    return JSON.parse(raw) as CategoryBudgetEntry[];
  } catch {
    return [];
  }
}

function rowToSummary(row: TemplateRow): TemplateSummary {
  const entries = parseEntries(row.category_budgets);
  return {
    id: row.id,
    name: row.name,
    categoryCount: entries.length,
    createdAt: row.created_at,
    preview: entries.slice(0, 3).map((e) => e.categoryName),
  };
}

export function createBudgetTemplateRepository() {
  return {
    async findAll(): Promise<TemplateSummary[]> {
      const db = await getDb();
      const result = await db.query<TemplateRow>(
        'SELECT id, name, category_budgets, created_at FROM budget_templates ORDER BY created_at DESC, rowid DESC'
      );
      return result.rows.map(rowToSummary);
    },

    async findById(
      id: string
    ): Promise<
      { id: string; name: string; entries: CategoryBudgetEntry[]; createdAt: string } | undefined
    > {
      const db = await getDb();
      const result = await db.query<TemplateRow>(
        'SELECT id, name, category_budgets, created_at FROM budget_templates WHERE id = ?',
        [id]
      );
      if (!result.rows[0]) return undefined;
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        entries: parseEntries(row.category_budgets),
        createdAt: row.created_at,
      };
    },

    async create(name: string, entries: CategoryBudgetEntry[]): Promise<TemplateSummary> {
      const id = nanoid();
      const db = await getDb();
      await db.query('INSERT INTO budget_templates (id, name, category_budgets) VALUES (?, ?, ?)', [
        id,
        name,
        JSON.stringify(entries),
      ]);
      return {
        id,
        name,
        categoryCount: entries.length,
        createdAt: new Date().toISOString(),
        preview: entries.slice(0, 3).map((e) => e.categoryName),
      };
    },

    async delete(id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM budget_templates WHERE id = ?', [id]);
      return result.rowCount > 0;
    },

    async getBudgetSuggestions(months: number): Promise<
      {
        categoryId: string;
        categoryName: string;
        color: string;
        suggestedBudget: number;
        basedOnMonths: number;
      }[]
    > {
      const db = await getDb();
      const now = new Date();
      const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
      const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = endDate.toISOString().slice(0, 10);

      const result = await db.query<SuggestionRow>(
        `SELECT
           c.id AS category_id,
           c.name AS category_name,
           c.color,
           COALESCE(AVG(monthly.total), 0) AS suggested_budget,
           COALESCE(COUNT(monthly.month_key), 0) AS based_on_months
         FROM categories c
         LEFT JOIN (
           SELECT
             category_id,
             SUBSTR(date, 1, 7) AS month_key,
             SUM(amount) AS total
           FROM transactions
           WHERE type = 'expense'
             AND date >= ?
             AND date < ?
           GROUP BY category_id, SUBSTR(date, 1, 7)
         ) monthly ON monthly.category_id = c.id
         WHERE c.type = 'expense'
         GROUP BY c.id, c.name, c.color
         ORDER BY suggested_budget DESC`,
        [startStr, endStr]
      );

      return result.rows.map((row) => ({
        categoryId: row.category_id,
        categoryName: row.category_name,
        color: row.color,
        suggestedBudget: Math.round(Number(row.suggested_budget)),
        basedOnMonths: Number(row.based_on_months),
      }));
    },
  };
}
