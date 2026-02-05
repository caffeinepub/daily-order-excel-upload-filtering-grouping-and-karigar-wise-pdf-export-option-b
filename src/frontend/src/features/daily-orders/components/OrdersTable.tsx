import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { ParsedOrder } from '../excel/parseDailyOrders';
import type { KarigarAssignment } from '@/backend';

interface OrdersTableProps {
  orders: ParsedOrder[];
  assignments: KarigarAssignment[];
  selectedOrderIds: Set<string>;
  onToggleSelection: (orderId: string) => void;
  mappingLookup?: Map<string, { karigar: string; genericName?: string }>;
}

export default function OrdersTable({ 
  orders, 
  assignments, 
  selectedOrderIds, 
  onToggleSelection,
  mappingLookup 
}: OrdersTableProps) {
  const assignmentMap = new Map(assignments.map((a) => [a.orderId, a]));

  if (orders.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No orders to display
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Order No</TableHead>
            <TableHead>Design / Product</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead>Karigar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const assignment = assignmentMap.get(order.orderNo);
            const mapping = mappingLookup?.get(order.design);
            const displayDesign = mapping?.genericName 
              ? `${order.design} — ${mapping.genericName}`
              : order.design;
            
            return (
              <TableRow key={order.orderNo}>
                <TableCell>
                  <Checkbox
                    checked={selectedOrderIds.has(order.orderNo)}
                    onCheckedChange={() => onToggleSelection(order.orderNo)}
                  />
                </TableCell>
                <TableCell className="font-medium">{order.orderNo}</TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate" title={displayDesign}>
                    {displayDesign}
                  </div>
                </TableCell>
                <TableCell>{order.weight}</TableCell>
                <TableCell>{order.size}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell className="max-w-xs truncate">{order.remarks}</TableCell>
                <TableCell>
                  {assignment ? (
                    <Badge variant="secondary">{assignment.karigar}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
