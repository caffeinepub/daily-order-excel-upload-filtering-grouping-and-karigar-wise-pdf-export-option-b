import { useState, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGetDailyOrders, useGetKarigarAssignments, useGetKarigarMappingWorkbook } from '@/hooks/useQueries';
import FactoryKarigarGroups from '../daily-orders/components/FactoryKarigarGroups';
import ExportPanel from '../daily-orders/components/ExportPanel';
import type { ParsedOrder } from '../daily-orders/excel/parseDailyOrders';

export default function OrderListTab() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null);

  // Swipe state
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const { data: savedOrders = [], isLoading: loadingOrders } = useGetDailyOrders(selectedDate);
  const { data: assignments = [] } = useGetKarigarAssignments(selectedDate);
  const { data: mappingWorkbook = [] } = useGetKarigarMappingWorkbook();

  // Build mapping lookup from workbook (sheets 1 & 3 priority)
  const mappingLookup = useMemo(() => {
    const lookup = new Map<string, { karigar: string; genericName?: string }>();
    
    // Process sheets in priority order: 1, 3, then 2
    const sheetPriority = ['1', '3', '2'];
    
    for (const sheetName of sheetPriority) {
      const sheet = mappingWorkbook.find(([name]) => name === sheetName);
      if (sheet) {
        const [, entries] = sheet;
        entries.forEach(([design, karigar]) => {
          if (!lookup.has(design)) {
            lookup.set(design, { karigar });
          }
        });
      }
    }
    
    return lookup;
  }, [mappingWorkbook]);

  // Convert saved orders to ParsedOrder format
  const currentOrders = useMemo(() => {
    return savedOrders.map((o) => ({
      orderNo: o.orderId,
      design: o.design || o.product,
      weight: '',
      size: '',
      quantity: '',
      remarks: '',
    }));
  }, [savedOrders]);

  // Group orders by factory
  const ordersByFactory = useMemo(() => {
    const groups = new Map<string, ParsedOrder[]>();
    const assignmentMap = new Map(assignments.map((a) => [a.orderId, a]));

    currentOrders.forEach((order) => {
      const assignment = assignmentMap.get(order.orderNo);
      const factory = assignment?.factory || 'No Factory';
      if (!groups.has(factory)) {
        groups.set(factory, []);
      }
      groups.get(factory)!.push(order);
    });

    return groups;
  }, [currentOrders, assignments]);

  // Get sorted factory list
  const factories = useMemo(() => {
    const factoryList = Array.from(ordersByFactory.keys()).sort((a, b) => {
      if (a === 'No Factory') return 1;
      if (b === 'No Factory') return -1;
      return a.localeCompare(b);
    });
    return factoryList;
  }, [ordersByFactory]);

  // Auto-select first factory when factories change
  useEffect(() => {
    if (factories.length > 0 && !selectedFactory) {
      setSelectedFactory(factories[0]);
    } else if (factories.length > 0 && selectedFactory && !factories.includes(selectedFactory)) {
      setSelectedFactory(factories[0]);
    } else if (factories.length === 0) {
      setSelectedFactory(null);
    }
  }, [factories, selectedFactory]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedFactory(null);
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!selectedFactory || factories.length <= 1) return;

    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      const currentIndex = factories.indexOf(selectedFactory);
      if (diff > 0 && currentIndex < factories.length - 1) {
        setSelectedFactory(factories[currentIndex + 1]);
      } else if (diff < 0 && currentIndex > 0) {
        setSelectedFactory(factories[currentIndex - 1]);
      }
    }
  };

  const navigateFactory = (direction: 'prev' | 'next') => {
    if (!selectedFactory || factories.length <= 1) return;
    const currentIndex = factories.indexOf(selectedFactory);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedFactory(factories[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < factories.length - 1) {
      setSelectedFactory(factories[currentIndex + 1]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Order List</h2>
          <p className="text-muted-foreground">View orders filtered by factory and karigar</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-40"
            />
          </div>
          {selectedFactory && (
            <ExportPanel
              selectedDate={selectedDate}
              selectedFactory={selectedFactory}
              ordersByFactory={ordersByFactory}
              assignments={assignments}
            />
          )}
        </div>
      </div>

      {loadingOrders ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Loading orders...</p>
          </CardContent>
        </Card>
      ) : currentOrders.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No orders for {format(new Date(selectedDate), 'MMM dd, yyyy')}</p>
              <p className="text-sm text-muted-foreground">Upload orders in the Daily Order Upload tab</p>
            </div>
          </CardContent>
        </Card>
      ) : selectedFactory ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateFactory('prev')}
                disabled={factories.indexOf(selectedFactory) === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 text-center">
                <CardTitle>{selectedFactory}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Factory {factories.indexOf(selectedFactory) + 1} of {factories.length}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateFactory('next')}
                disabled={factories.indexOf(selectedFactory) === factories.length - 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <FactoryKarigarGroups
              factory={selectedFactory}
              orders={ordersByFactory.get(selectedFactory) || []}
              assignments={assignments}
              selectedOrderIds={new Set()}
              onToggleSelection={() => {}}
              selectedDate={selectedDate}
              mappingLookup={mappingLookup}
              showDownloadButtons={true}
            />
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No factory selected</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
