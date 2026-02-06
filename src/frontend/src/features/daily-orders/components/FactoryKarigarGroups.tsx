import { useMemo, useState } from 'react';
import { Download, Loader2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OrdersTable from './OrdersTable';
import { exportKarigarPdf } from '../pdf/exportKarigarPdf';
import type { ParsedOrder } from '../excel/parseDailyOrders';
import type { KarigarAssignment } from '@/backend';

interface FactoryKarigarGroupsProps {
  factory: string;
  orders: ParsedOrder[];
  assignments: KarigarAssignment[];
  selectedOrderIds: Set<string>;
  onToggleSelection: (orderId: string) => void;
  selectedDate: string;
  mappingLookup: Map<string, { karigar: string; genericName?: string }>;
  showDownloadButtons?: boolean;
  selectedKarigar?: string | null;
  onSelectKarigar?: (karigar: string | null) => void;
}

export default function FactoryKarigarGroups({
  factory,
  orders,
  assignments,
  selectedOrderIds,
  onToggleSelection,
  selectedDate,
  mappingLookup,
  showDownloadButtons = false,
  selectedKarigar = null,
  onSelectKarigar,
}: FactoryKarigarGroupsProps) {
  const [exportingKarigar, setExportingKarigar] = useState<string | null>(null);

  // Group orders by karigar within this factory
  const ordersByKarigar = useMemo(() => {
    const groups = new Map<string, ParsedOrder[]>();
    const assignmentMap = new Map(assignments.map((a) => [a.orderId, a]));

    orders.forEach((order) => {
      const assignment = assignmentMap.get(order.orderNo);
      if (assignment) {
        const karigar = assignment.karigar;
        if (!groups.has(karigar)) {
          groups.set(karigar, []);
        }
        groups.get(karigar)!.push(order);
      }
    });

    // Sort orders within each karigar group by design code
    groups.forEach((orders, karigar) => {
      orders.sort((a, b) => a.design.localeCompare(b.design));
    });

    return groups;
  }, [orders, assignments]);

  const karigars = Array.from(ordersByKarigar.keys()).sort();

  // Filter karigars based on selection
  const displayKarigars = selectedKarigar 
    ? karigars.filter(k => k === selectedKarigar)
    : karigars;

  const handleKarigarExport = async (karigar: string) => {
    const karigarOrders = ordersByKarigar.get(karigar) || [];
    if (karigarOrders.length === 0) return;

    setExportingKarigar(karigar);
    try {
      await exportKarigarPdf(selectedDate, karigar, karigarOrders, mappingLookup);
    } finally {
      setExportingKarigar(null);
    }
  };

  if (karigars.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No karigars assigned for this factory
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Karigar Filter */}
      {onSelectKarigar && karigars.length > 1 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedKarigar || 'all'}
            onValueChange={(value) => onSelectKarigar(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by karigar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Karigars ({karigars.length})</SelectItem>
              {karigars.map((karigar) => (
                <SelectItem key={karigar} value={karigar}>
                  {karigar} ({ordersByKarigar.get(karigar)?.length || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {displayKarigars.map((karigar) => {
        const karigarOrders = ordersByKarigar.get(karigar) || [];
        const isExporting = exportingKarigar === karigar;
        
        return (
          <Card key={karigar} className="border-2">
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <span>{karigar}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {karigarOrders.length} order{karigarOrders.length !== 1 ? 's' : ''}
                  </span>
                </CardTitle>
                {showDownloadButtons && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleKarigarExport(karigar)}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download Orders
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <OrdersTable
                orders={karigarOrders}
                assignments={assignments}
                selectedOrderIds={selectedOrderIds}
                onToggleSelection={onToggleSelection}
                mappingLookup={mappingLookup}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
