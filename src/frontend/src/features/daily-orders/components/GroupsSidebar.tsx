import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ParsedOrder } from '../excel/parseDailyOrders';

interface GroupsSidebarProps {
  ordersByKarigar: Map<string, ParsedOrder[]>;
  selectedKarigar: string | null;
  onSelectKarigar: (karigar: string | null) => void;
}

export default function GroupsSidebar({ ordersByKarigar, selectedKarigar, onSelectKarigar }: GroupsSidebarProps) {
  const karigars = Array.from(ordersByKarigar.keys()).sort();

  if (karigars.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Karigars
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant={selectedKarigar === null ? 'default' : 'ghost'}
          className="w-full justify-between"
          onClick={() => onSelectKarigar(null)}
        >
          <span>All Orders</span>
          <Badge variant="secondary">
            {Array.from(ordersByKarigar.values()).reduce((sum, orders) => sum + orders.length, 0)}
          </Badge>
        </Button>
        {karigars.map((karigar) => (
          <Button
            key={karigar}
            variant={selectedKarigar === karigar ? 'default' : 'ghost'}
            className="w-full justify-between"
            onClick={() => onSelectKarigar(karigar)}
          >
            <span className="truncate">{karigar}</span>
            <Badge variant="secondary">{ordersByKarigar.get(karigar)?.length || 0}</Badge>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
