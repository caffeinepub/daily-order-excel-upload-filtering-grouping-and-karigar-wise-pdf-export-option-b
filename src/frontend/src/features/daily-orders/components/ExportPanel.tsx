import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportKarigarPdf } from '../pdf/exportKarigarPdf';
import type { ParsedOrder } from '../excel/parseDailyOrders';
import { useState } from 'react';

interface ExportPanelProps {
  selectedDate: string;
  selectedKarigar: string | null;
  ordersByKarigar: Map<string, ParsedOrder[]>;
}

export default function ExportPanel({ selectedDate, selectedKarigar, ordersByKarigar }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!selectedKarigar) return;

    const orders = ordersByKarigar.get(selectedKarigar) || [];
    if (orders.length === 0) return;

    setIsExporting(true);
    try {
      await exportKarigarPdf(selectedDate, selectedKarigar, orders);
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = selectedKarigar && (ordersByKarigar.get(selectedKarigar)?.length || 0) > 0;

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleExport}
      disabled={!canExport || isExporting}
      title={!selectedKarigar ? 'Select a karigar to export' : ''}
    >
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Export HTML
        </>
      )}
    </Button>
  );
}
