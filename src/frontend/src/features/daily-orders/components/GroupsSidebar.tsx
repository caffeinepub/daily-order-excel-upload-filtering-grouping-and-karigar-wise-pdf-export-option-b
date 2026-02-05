import { Factory } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ParsedOrder } from '../excel/parseDailyOrders';

interface GroupsSidebarProps {
  ordersByFactory: Map<string, ParsedOrder[]>;
  selectedFactory: string | null;
  onSelectFactory: (factory: string | null) => void;
}

export default function GroupsSidebar({ ordersByFactory, selectedFactory, onSelectFactory }: GroupsSidebarProps) {
  const factories = Array.from(ordersByFactory.keys()).sort((a, b) => {
    // "No Factory" always last
    if (a === 'No Factory') return 1;
    if (b === 'No Factory') return -1;
    return a.localeCompare(b);
  });

  if (factories.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Factory className="h-4 w-4" />
          Factories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {factories.map((factory) => (
          <Button
            key={factory}
            variant={selectedFactory === factory ? 'default' : 'ghost'}
            className="w-full justify-between"
            onClick={() => onSelectFactory(factory)}
          >
            <span className="truncate">{factory}</span>
            <Badge variant="secondary">{ordersByFactory.get(factory)?.length || 0}</Badge>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
