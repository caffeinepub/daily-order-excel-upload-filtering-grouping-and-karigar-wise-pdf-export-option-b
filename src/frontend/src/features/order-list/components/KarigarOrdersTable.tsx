import { Checkbox } from '@/components/ui/checkbox';

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

interface KarigarOrdersTableProps {
  orders: EnrichedOrder[];
  selectedOrderIds: Set<string>;
  onToggleSelection: (orderId: string) => void;
}

export default function KarigarOrdersTable({
  orders,
  selectedOrderIds,
  onToggleSelection,
}: KarigarOrdersTableProps) {
  return (
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
          {orders.map((order) => (
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
              <td className="p-2">{order.weight}</td>
              <td className="p-2">{order.size}</td>
              <td className="p-2">{order.quantity}</td>
              <td className="p-2">{order.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
