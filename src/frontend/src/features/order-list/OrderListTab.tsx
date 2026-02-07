import { useState, useMemo } from 'react';
import { Calendar, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetDailyOrders, useGetKarigarMappingWorkbook } from '@/hooks/useQueries';
import { useActorWithStatus } from '@/hooks/useActorWithStatus';
import { normalizeDesignCode } from '@/utils/textNormalize';
import { useKarigarMappingLookup } from './useKarigarMappingLookup';
import KarigarOrderGroups from './components/KarigarOrderGroups';

export interface EnrichedOrder {
  orderNo: string;
  design: string;
  weight: string;
  size: string;
  quantity: string;
  remarks: string;
  genericName?: string;
  karigar?: string;
}

export default function OrderListTab() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedKarigar, setSelectedKarigar] = useState<string>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  const { isReady, isError, error } = useActorWithStatus();
  const { data: orders = [], isLoading: ordersLoading } = useGetDailyOrders(selectedDate);
  const { data: mappingBlob, isLoading: mappingLoading } = useGetKarigarMappingWorkbook();

  // Decode and build lookup map from persisted mapping using the new hook
  const { mappingLookup, mappingEntryCount, decodeError, isDecoding } = useKarigarMappingLookup(mappingBlob || null);

  // Enrich orders with mapping data using canonical normalization
  const enrichedOrders = useMemo<EnrichedOrder[]>(() => {
    return orders.map((order) => {
      // Normalize the order design code for lookup
      const normalizedDesign = normalizeDesignCode(order.design);
      const mapping = mappingLookup.get(normalizedDesign);

      return {
        ...order,
        genericName: mapping?.genericName,
        karigar: mapping?.karigar,
      };
    });
  }, [orders, mappingLookup]);

  // Group orders by karigar
  const ordersByKarigar = useMemo(() => {
    const groups = new Map<string, EnrichedOrder[]>();

    enrichedOrders.forEach((order) => {
      const karigar = order.karigar || 'Unmapped';
      if (!groups.has(karigar)) {
        groups.set(karigar, []);
      }
      groups.get(karigar)!.push(order);
    });

    return groups;
  }, [enrichedOrders]);

  // Get list of available karigars for filter
  const availableKarigars = useMemo(() => {
    const karigars = Array.from(ordersByKarigar.keys()).sort((a, b) => {
      if (a === 'Unmapped') return 1;
      if (b === 'Unmapped') return -1;
      return a.localeCompare(b);
    });
    return karigars;
  }, [ordersByKarigar]);

  // Calculate diagnostics with enhanced debug information
  const diagnostics = useMemo(() => {
    const totalOrders = enrichedOrders.length;
    const matchedOrders = enrichedOrders.filter((o) => o.karigar).length;
    const unmappedOrders = totalOrders - matchedOrders;

    // Collect distinct normalized design codes from orders
    const orderDesignKeys = new Set<string>();
    enrichedOrders.forEach((order) => {
      const normalized = normalizeDesignCode(order.design);
      if (normalized) orderDesignKeys.add(normalized);
    });

    // Collect sample of normalized keys from mapping
    const mappingKeys = Array.from(mappingLookup.keys());
    const mappingSample = mappingKeys.slice(0, 5);

    // Collect sample of normalized keys from orders
    const orderKeysSample = Array.from(orderDesignKeys).slice(0, 5);

    return {
      totalOrders,
      mappingEntries: mappingEntryCount,
      matchedOrders,
      unmappedOrders,
      hasMappingButNoMatches: mappingEntryCount > 0 && matchedOrders === 0 && totalOrders > 0,
      distinctOrderDesigns: orderDesignKeys.size,
      orderKeysSample,
      mappingSample,
    };
  }, [enrichedOrders, mappingEntryCount, mappingLookup]);

  const handleToggleSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const isLoading = ordersLoading || mappingLoading || isDecoding;

  return (
    <div className="space-y-6">
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Order List</h2>
        <p className="text-muted-foreground">
          View all orders for a selected date with enriched karigar and generic name information
        </p>
      </div>

      {/* Actor error state */}
      {isError && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Mapping decode error */}
      {decodeError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load karigar mapping: {decodeError}. Please try re-uploading the mapping file.
          </AlertDescription>
        </Alert>
      )}

      {/* Date and Karigar selector */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Orders</CardTitle>
          <CardDescription>Choose a date and optionally filter by karigar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="order-date">Date</Label>
              <div className="relative">
                <Input
                  id="order-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={!isReady}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            
            {availableKarigars.length > 0 && (
              <div className="flex-1 space-y-2">
                <Label htmlFor="karigar-filter">Karigar</Label>
                <Select value={selectedKarigar} onValueChange={setSelectedKarigar}>
                  <SelectTrigger id="karigar-filter">
                    <SelectValue placeholder="Select karigar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Karigars</SelectItem>
                    {availableKarigars.map((karigar) => (
                      <SelectItem key={karigar} value={karigar}>
                        {karigar} ({ordersByKarigar.get(karigar)?.length || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diagnostics section */}
      {!isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mapping Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Mapping Loaded:</span>
                <span className="ml-2 font-medium">
                  {diagnostics.mappingEntries > 0 ? `Yes (${diagnostics.mappingEntries} entries)` : 'No'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Orders:</span>
                <span className="ml-2 font-medium">{diagnostics.totalOrders}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Matched Orders:</span>
                <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                  {diagnostics.matchedOrders}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Unmapped Orders:</span>
                <span className="ml-2 font-medium text-orange-600 dark:text-orange-400">
                  {diagnostics.unmappedOrders}
                </span>
              </div>
            </div>

            {/* Warning when mapping loaded but nothing matches */}
            {diagnostics.hasMappingButNoMatches && (
              <Alert className="border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100">
                <Info className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">A mapping is loaded but no orders match. This may indicate:</p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      <li>Design codes in orders don't match those in the mapping file</li>
                      <li>Different formatting (spaces, dashes, case) between files</li>
                      <li>The mapping file may need to be re-uploaded with correct design codes</li>
                    </ul>
                    
                    {/* Enhanced diagnostics */}
                    <div className="mt-3 space-y-2 border-t border-orange-200 pt-3 dark:border-orange-800">
                      <p className="text-xs font-semibold">Debug Information:</p>
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="font-medium">Distinct order designs:</span> {diagnostics.distinctOrderDesigns}
                        </div>
                        {diagnostics.orderKeysSample.length > 0 && (
                          <div>
                            <span className="font-medium">Sample normalized order keys:</span>
                            <div className="ml-2 font-mono text-[10px]">
                              {diagnostics.orderKeysSample.join(', ')}
                            </div>
                          </div>
                        )}
                        {diagnostics.mappingSample.length > 0 && (
                          <div>
                            <span className="font-medium">Sample normalized mapping keys:</span>
                            <div className="ml-2 font-mono text-[10px]">
                              {diagnostics.mappingSample.join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders display */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading orders...</p>
          </CardContent>
        </Card>
      ) : enrichedOrders.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No orders found for {selectedDate}</p>
          </CardContent>
        </Card>
      ) : (
        <KarigarOrderGroups
          orders={enrichedOrders}
          ordersByKarigar={ordersByKarigar}
          selectedKarigar={selectedKarigar}
          selectedOrderIds={selectedOrderIds}
          onToggleSelection={handleToggleSelection}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}
