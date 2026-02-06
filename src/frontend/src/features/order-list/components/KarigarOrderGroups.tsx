import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportDailyOrdersToExcel } from '../../daily-orders/export/exportDailyOrdersFile';
import { getUserFacingError } from '@/utils/userFacingError';
import { toast } from 'sonner';

interface EnrichedOrder {
  orderNo: string;
  design: string;
  weight: string;
  size: string;
  quantity: string;
  remarks: string;
  karigar?: string;
  genericName?: string;
}

interface KarigarOrderGroupsProps {
  orders: EnrichedOrder[];
  ordersByKarigar: Map<string, EnrichedOrder[]>;
  selectedKarigar: string;
  selectedOrderIds: Set<string>;
  onToggleSelection: (orderId: string) => void;
  selectedDate: string;
}

export default function KarigarOrderGroups({
  orders,
  ordersByKarigar,
  selectedKarigar,
  selectedOrderIds,
  onToggleSelection,
  selectedDate,
}: KarigarOrderGroupsProps) {
  const handleExportKarigar = (karigar: string) => {
    try {
      const karigarOrders = ordersByKarigar.get(karigar) || [];
      if (karigarOrders.length === 0) {
        toast.error('No orders to export');
        return;
      }
      exportDailyOrdersToExcel(karigarOrders, `orders-${karigar}-${selectedDate}.xlsx`);
    } catch (error: any) {
      const errorMessage = getUserFacingError(error);
      toast.error(`Export failed: ${errorMessage}`);
    }
  };

  // If a specific karigar is selected, show only that group
  if (selectedKarigar !== 'all') {
    const karigarOrders = ordersByKarigar.get(selectedKarigar) || [];
    
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{selectedKarigar}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleExportKarigar(selectedKarigar)}>
              <Download className="mr-2 h-4 w-4" />
              Export {selectedKarigar}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 w-12"></th>
                  <th className="text-left p-2">Order No</th>
                  <th className="text-left p-2">Design Code</th>
                  <th className="text-left p-2">Generic Name</th>
                  <th className="text-left p-2">Karigar Name</th>
                  <th className="text-left p-2">Weight</th>
                  <th className="text-left p-2">Size</th>
                  <th className="text-left p-2">Quantity</th>
                  <th className="text-left p-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {karigarOrders.map((order) => (
                  <tr key={order.orderNo} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Checkbox
                        checked={selectedOrderIds.has(order.orderNo)}
                        onCheckedChange={() => onToggleSelection(order.orderNo)}
                      />
                    </td>
                    <td className="p-2 font-medium">{order.orderNo}</td>
                    <td className="p-2">{order.design}</td>
                    <td className="p-2 text-muted-foreground">{order.genericName || '-'}</td>
                    <td className="p-2">{order.karigar || 'Unmapped'}</td>
                    <td className="p-2">{order.weight || '-'}</td>
                    <td className="p-2">{order.size || '-'}</td>
                    <td className="p-2">{order.quantity || '-'}</td>
                    <td className="p-2">{order.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show all groups
  const sortedKarigars = Array.from(ordersByKarigar.keys()).sort((a, b) => {
    if (a === 'Unmapped') return 1;
    if (b === 'Unmapped') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {sortedKarigars.map((karigar) => {
        const karigarOrders = ordersByKarigar.get(karigar) || [];
        
        return (
          <Card key={karigar}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {karigar} <span className="text-sm font-normal text-muted-foreground">({karigarOrders.length} orders)</span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExportKarigar(karigar)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 w-12"></th>
                      <th className="text-left p-2">Order No</th>
                      <th className="text-left p-2">Design Code</th>
                      <th className="text-left p-2">Generic Name</th>
                      <th className="text-left p-2">Karigar Name</th>
                      <th className="text-left p-2">Weight</th>
                      <th className="text-left p-2">Size</th>
                      <th className="text-left p-2">Quantity</th>
                      <th className="text-left p-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {karigarOrders.map((order) => (
                      <tr key={order.orderNo} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <Checkbox
                            checked={selectedOrderIds.has(order.orderNo)}
                            onCheckedChange={() => onToggleSelection(order.orderNo)}
                          />
                        </td>
                        <td className="p-2 font-medium">{order.orderNo}</td>
                        <td className="p-2">{order.design}</td>
                        <td className="p-2 text-muted-foreground">{order.genericName || '-'}</td>
                        <td className="p-2">{order.karigar || 'Unmapped'}</td>
                        <td className="p-2">{order.weight || '-'}</td>
                        <td className="p-2">{order.size || '-'}</td>
                        <td className="p-2">{order.quantity || '-'}</td>
                        <td className="p-2">{order.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
