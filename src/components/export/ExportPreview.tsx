import { Transaction } from '@/lib/types';
import { formatCurrency, formatDateShort } from '@/lib/formatters';

interface ExportPreviewProps {
  transactions: Transaction[];
}

export function ExportPreview({ transactions }: ExportPreviewProps) {
  const preview = transactions.slice(0, 5);

  if (preview.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">No transactions to preview</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            <th className="pr-4 pb-2">Date</th>
            <th className="pr-4 pb-2">Description</th>
            <th className="pr-4 pb-2">Category</th>
            <th className="pb-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {preview.map((tx) => (
            <tr key={tx.id} className="border-border/50 border-b">
              <td className="text-muted-foreground py-2 pr-4">{formatDateShort(tx.date)}</td>
              <td className="py-2 pr-4">{tx.description}</td>
              <td className="text-muted-foreground py-2 pr-4">{tx.category}</td>
              <td
                className={`py-2 text-right font-mono ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {tx.type === 'expense' ? '-' : '+'}
                {formatCurrency(tx.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length > 5 && (
        <p className="text-muted-foreground mt-2 text-xs">
          ...and {transactions.length - 5} more rows
        </p>
      )}
    </div>
  );
}
