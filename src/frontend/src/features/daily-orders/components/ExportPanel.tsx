import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportFactoryHtml } from '../pdf/exportFactoryHtml';
import type { ParsedOrder } from '../excel/parseDailyOrders';
import type { KarigarAssignment } from '@/backend';
import { useState } from 'react';

interface ExportPanelProps {
  selectedDate: string;
  selectedFactory: string | null;
  ordersByFactory: Map<string, ParsedOrder[]>;
  assignments: KarigarAssignment[];
}

export default function ExportPanel({ selectedDate, selectedFactory, ordersByFactory, assignments }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!selectedFactory) return;

    const orders = ordersByFactory.get(selectedFactory) || [];
    if (orders.length === 0) return;

    setIsExporting(true);
    try {
      await exportFactoryHtml(selectedDate, selectedFactory, orders, assignments);
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = selectedFactory && (ordersByFactory.get(selectedFactory)?.length || 0) > 0;

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleExport}
      disabled={!canExport || isExporting}
      title={!selectedFactory ? 'Select a factory to export' : ''}
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
