import { Search, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface OrdersToolbarProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortChange: (order: 'asc' | 'desc') => void;
}

export default function OrdersToolbar({ searchText, onSearchChange, sortOrder, onSortChange }: OrdersToolbarProps) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search orders..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSortChange(sortOrder === 'asc' ? 'desc' : 'asc')}
      >
        <ArrowUpDown className="mr-2 h-4 w-4" />
        Sort by Design ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
      </Button>
    </div>
  );
}
