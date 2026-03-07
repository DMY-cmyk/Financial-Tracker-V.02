import { Transaction } from '@/lib/types';
import { formatCurrency, formatDateShort } from '@/lib/formatters';

interface ExportPreviewProps {
  transactions: Transaction[];
}

export function ExportPreview({ transactions }: ExportPreviewProps) {
  const preview = transactions.slice(0, 5);

  if (preview.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No transactions to preview
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 pr-4">Description</th>
            <th className="pb-2 pr-4">Category</th>
            <th className="pb-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {preview.map((tx) => (
            <tr key={tx.id} className="border-b border-border/50">
              <td className="py-2 pr-4 text-muted-foreground">{formatDateShort(tx.date)}</td>
              <td className="py-2 pr-4">{tx.description}</td>
              <td className="py-2 pr-4 text-muted-foreground">{tx.category}</td>
              <td className={`py-2 text-right font-mono ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length > 5 && (
        <p className="mt-2 text-xs text-muted-foreground">
          ...and {transactions.length - 5} more rows
        </p>
      )}
    </div>
  );
}
