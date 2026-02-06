import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetDailyOrders, useGetKarigarMappingWorkbook, useRemoveOrders } from '@/hooks/useQueries';
import { useActorWithStatus } from '@/hooks/useActorWithStatus';
import { decodeBlobToMapping } from '../karigar-mapping/karigarMappingBlobCodec';
import KarigarOrderGroups from './components/KarigarOrderGroups';
import { getUserFacingError } from '@/utils/userFacingError';
import { normalizeDesignCode } from '@/utils/textNormalize';

export default function OrderListTab() {
  // Initialize date from session storage (synced with Daily Orders upload) or default to today
  const [selectedDate, setSelectedDate] = useState(() => {
    const lastUploadDate = sessionStorage.getItem('lastUploadDate');
    return lastUploadDate || format(new Date(), 'yyyy-MM-dd');
  });
  const [selectedKarigar, setSelectedKarigar] = useState<string>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [mappingData, setMappingData] = useState<any>(null);

  const { isReady } = useActorWithStatus();
  const { 
    data: savedOrders = [], 
    isLoading: loadingOrders, 
    error: ordersError,
    isFetched: ordersFetched 
  } = useGetDailyOrders(selectedDate);
  const { 
    data: mappingBlob, 
    error: mappingError,
    isFetched: mappingFetched 
  } = useGetKarigarMappingWorkbook();
  const removeOrders = useRemoveOrders();

  // Persist selected date to session storage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('lastUploadDate', selectedDate);
  }, [selectedDate]);

  // Load mapping data from blob
  useEffect(() => {
    if (mappingBlob) {
      decodeBlobToMapping(mappingBlob)
        .then(setMappingData)
        .catch((err) => {
          console.error('Failed to decode mapping:', err);
          setMappingData(null);
        });
    } else {
      setMappingData(null);
    }
  }, [mappingBlob]);

  // Build normalized mapping lookup from decoded data
  const mappingLookup = useMemo(() => {
    const lookup = new Map<string, { karigar: string; genericName?: string }>();
    
    if (!mappingData) return lookup;

    // Process sheets in priority order: 1, 3, then 2
    const sheetPriority = ['1', '3', '2'];
    
    for (const sheetName of sheetPriority) {
      const sheet = mappingData[sheetName];
      if (sheet && sheet.entries) {
        sheet.entries.forEach((entry: any) => {
          // Use the normalized design code from the mapping entry
          const normalizedDesign = entry.designNormalized || normalizeDesignCode(entry.design);
          if (!lookup.has(normalizedDesign)) {
            lookup.set(normalizedDesign, {
              karigar: entry.karigar,
              genericName: entry.genericName,
            });
          }
        });
      }
    }
    
    return lookup;
  }, [mappingData]);

  // Convert saved orders to enriched format with mapping data
  const enrichedOrders = useMemo(() => {
    return savedOrders.map((o) => {
      // Normalize the order's design code for lookup
      const normalizedDesign = normalizeDesignCode(o.design);
      const mapping = mappingLookup.get(normalizedDesign);
      
      return {
        orderNo: o.orderNo,
        design: o.design, // Keep original for display
        weight: o.weight || '',
        size: o.size || '',
        quantity: o.quantity || '',
        remarks: o.remarks || '',
        karigar: mapping?.karigar,
        genericName: mapping?.genericName,
      };
    });
  }, [savedOrders, mappingLookup]);

  // Group orders by karigar (from mapping)
  const ordersByKarigar = useMemo(() => {
    const groups = new Map<string, typeof enrichedOrders>();
    
    enrichedOrders.forEach((order) => {
      const karigar = order.karigar || 'Unmapped';
      if (!groups.has(karigar)) {
        groups.set(karigar, []);
      }
      groups.get(karigar)!.push(order);
    });

    return groups;
  }, [enrichedOrders]);

  // Get sorted karigar list
  const karigars = useMemo(() => {
    const karigarList = Array.from(ordersByKarigar.keys()).sort((a, b) => {
      if (a === 'Unmapped') return 1;
      if (b === 'Unmapped') return -1;
      return a.localeCompare(b);
    });
    return karigarList;
  }, [ordersByKarigar]);

  // Filter orders by selected karigar
  const filteredOrders = useMemo(() => {
    if (selectedKarigar === 'all') return enrichedOrders;
    return enrichedOrders.filter((o) => (o.karigar || 'Unmapped') === selectedKarigar);
  }, [enrichedOrders, selectedKarigar]);

  // Clear selections when date or karigar changes
  useEffect(() => {
    setSelectedOrderIds(new Set());
  }, [selectedDate, selectedKarigar]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedKarigar('all');
    setSelectedOrderIds(new Set());
  };

  const handleToggleSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allOrderIds = filteredOrders.map((o) => o.orderNo);
    const allSelected = allOrderIds.every((id) => selectedOrderIds.has(id));
    
    if (allSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(allOrderIds));
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedOrderIds.size === 0) return;
    
    try {
      await removeOrders.mutateAsync({
        date: selectedDate,
        orderIds: Array.from(selectedOrderIds),
      });
      setSelectedOrderIds(new Set());
    } catch (error) {
      console.error('Failed to remove orders:', error);
    }
  };

  const allSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrderIds.has(o.orderNo));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Order List</h2>
          <p className="text-muted-foreground">View orders grouped by karigar from mapping</p>
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
        </div>
      </div>

      {/* Actor loading state */}
      {!isReady && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Connecting to backend...</AlertDescription>
        </Alert>
      )}

      {/* Daily Orders fetch error */}
      {ordersError && ordersFetched && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p className="font-medium">Failed to load daily orders</p>
              <p className="text-sm">{getUserFacingError(ordersError)}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Karigar Mapping fetch error */}
      {mappingError && mappingFetched && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p className="font-medium">Failed to load karigar mapping</p>
              <p className="text-sm">{getUserFacingError(mappingError)}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {loadingOrders ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Loading orders...</p>
          </CardContent>
        </Card>
      ) : ordersError ? (
        // Don't show "No orders" when there's an error
        null
      ) : enrichedOrders.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No orders for {format(new Date(selectedDate), 'MMM dd, yyyy')}</p>
              <p className="text-sm text-muted-foreground">Upload orders in the Daily Order Upload tab</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Karigar Filter */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Filter by Karigar:</label>
                <Select value={selectedKarigar} onValueChange={setSelectedKarigar}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Karigars ({enrichedOrders.length} orders)</SelectItem>
                    {karigars.map((karigar) => (
                      <SelectItem key={karigar} value={karigar}>
                        {karigar} ({ordersByKarigar.get(karigar)?.length || 0} orders)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Selection Actions Bar */}
          {filteredOrders.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                    {selectedOrderIds.size > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedOrderIds.size} order{selectedOrderIds.size !== 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>
                  {selectedOrderIds.size > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={removeOrders.isPending}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Selected
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Orders</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {selectedOrderIds.size} order{selectedOrderIds.size !== 1 ? 's' : ''}? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRemoveSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orders grouped by Karigar */}
          <KarigarOrderGroups
            orders={filteredOrders}
            ordersByKarigar={ordersByKarigar}
            selectedKarigar={selectedKarigar}
            selectedOrderIds={selectedOrderIds}
            onToggleSelection={handleToggleSelection}
            selectedDate={selectedDate}
          />
        </>
      )}
    </div>
  );
}
