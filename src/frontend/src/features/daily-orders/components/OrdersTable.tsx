import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ParsedOrder } from '../excel/parseDailyOrders';
import type { KarigarAssignment } from '@/backend';
import { normalizeDesignCode } from '@/utils/textNormalize';

interface OrdersTableProps {
  orders: ParsedOrder[];
  assignments: KarigarAssignment[];
  selectedOrderIds: Set<string>;
  onToggleSelection: (orderId: string) => void;
  mappingLookup: Map<string, { karigar: string; genericName?: string }>;
}

export default function OrdersTable({
  orders,
  assignments,
  selectedOrderIds,
  onToggleSelection,
  mappingLookup,
}: OrdersTableProps) {
  const assignmentMap = new Map(assignments.map((a) => [a.orderId, a]));

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Select</TableHead>
            <TableHead>Order No</TableHead>
            <TableHead>Design Code</TableHead>
            <TableHead>Generic Name</TableHead>
            <TableHead>Karigar</TableHead>
            <TableHead>Factory</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const assignment = assignmentMap.get(order.orderNo);
            // Normalize design code before lookup
            const normalizedDesign = normalizeDesignCode(order.design);
            const mapping = mappingLookup.get(normalizedDesign);
            const genericName = mapping?.genericName || '-';
            
            return (
              <TableRow key={order.orderNo}>
                <TableCell>
                  <Checkbox
                    checked={selectedOrderIds.has(order.orderNo)}
                    onCheckedChange={() => onToggleSelection(order.orderNo)}
                  />
                </TableCell>
                <TableCell className="font-medium">{order.orderNo}</TableCell>
                <TableCell>{order.design}</TableCell>
                <TableCell className="text-muted-foreground">{genericName}</TableCell>
                <TableCell>
                  {assignment ? (
                    <Badge variant="secondary">{assignment.karigar}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {assignment?.factory ? (
                    <Badge variant="outline">{assignment.factory}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
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
