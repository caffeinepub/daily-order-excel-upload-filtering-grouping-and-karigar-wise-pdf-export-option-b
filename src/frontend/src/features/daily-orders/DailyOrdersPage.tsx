import { useState, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Upload, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGetDailyOrders, useStoreDailyOrders, useGetKarigarAssignments, useAssignKarigar, useGetKarigarMappingWorkbook } from '@/hooks/useQueries';
import { parseDailyOrders, type ParsedOrder } from './excel/parseDailyOrders';
import OrdersToolbar from './components/OrdersToolbar';
import AssignmentPanel from './components/AssignmentPanel';
import GroupsSidebar from './components/GroupsSidebar';
import ExportPanel from './components/ExportPanel';
import FactoryKarigarGroups from './components/FactoryKarigarGroups';
import { useOrderFilters } from './hooks/useOrderFilters';

export default function DailyOrdersPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [uploadedOrders, setUploadedOrders] = useState<ParsedOrder[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null);
  const [selectedKarigar, setSelectedKarigar] = useState<string | null>(null);
  
  // Mapping state
  const [isApplyingMapping, setIsApplyingMapping] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [showMappingPanel, setShowMappingPanel] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  // Swipe state
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const { data: savedOrders = [], isLoading: loadingOrders } = useGetDailyOrders(selectedDate);
  const { data: assignments = [] } = useGetKarigarAssignments(selectedDate);
  const { data: mappingWorkbook = [] } = useGetKarigarMappingWorkbook();
  const storeDailyOrders = useStoreDailyOrders();
  const assignKarigar = useAssignKarigar();

  // Build mapping lookup from workbook (sheets 1 & 3 priority)
  const mappingLookup = useMemo(() => {
    const lookup = new Map<string, { karigar: string; genericName?: string }>();
    
    // Process sheets in priority order: 1, 3, then 2
    const sheetPriority = ['1', '3', '2'];
    
    for (const sheetName of sheetPriority) {
      const sheet = mappingWorkbook.find(([name]) => name === sheetName);
      if (sheet) {
        const [, entries] = sheet;
        entries.forEach(([design, data]) => {
          if (!lookup.has(design)) {
            // Parse data: "karigar|genericName" or just "karigar"
            const parts = data.split('|');
            lookup.set(design, { 
              karigar: parts[0],
              genericName: parts[1] || undefined
            });
          }
        });
      }
    }
    
    return lookup;
  }, [mappingWorkbook]);

  // Use uploaded orders if available, otherwise use saved orders
  const currentOrders = useMemo(() => {
    if (uploadedOrders.length > 0) return uploadedOrders;
    return savedOrders.map((o) => ({
      orderNo: o.orderId,
      design: o.design || o.product,
      weight: '',
      size: '',
      quantity: '',
      remarks: '',
    }));
  }, [uploadedOrders, savedOrders]);

  const { filteredOrders, searchText, setSearchText, sortOrder, setSortOrder } = useOrderFilters(currentOrders);

  // Group orders by factory
  const ordersByFactory = useMemo(() => {
    const groups = new Map<string, ParsedOrder[]>();
    const assignmentMap = new Map(assignments.map((a) => [a.orderId, a]));

    filteredOrders.forEach((order) => {
      const assignment = assignmentMap.get(order.orderNo);
      const factory = assignment?.factory || 'No Factory';
      if (!groups.has(factory)) {
        groups.set(factory, []);
      }
      groups.get(factory)!.push(order);
    });

    return groups;
  }, [filteredOrders, assignments]);

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

  // Compute mapping summary
  const mappingSummary = useMemo(() => {
    if (mappingLookup.size === 0 || currentOrders.length === 0) return null;

    const assignmentMap = new Map(assignments.map((a) => [a.orderId, a]));
    const matchedByKarigar = new Map<string, number>();
    const unmatchedDesigns = new Set<string>();
    let matchedCount = 0;

    currentOrders.forEach((order) => {
      const mapping = mappingLookup.get(order.design);
      if (mapping) {
        matchedCount++;
        matchedByKarigar.set(mapping.karigar, (matchedByKarigar.get(mapping.karigar) || 0) + 1);
      } else {
        if (order.design) {
          unmatchedDesigns.add(order.design);
        }
      }
    });

    return {
      totalOrders: currentOrders.length,
      matchedOrders: matchedCount,
      unmatchedOrders: currentOrders.length - matchedCount,
      matchedByKarigar,
      unmatchedDesigns: Array.from(unmatchedDesigns).sort(),
    };
  }, [mappingLookup, currentOrders, assignments]);

  const handleOrderListUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setParseError(null);
    setSaveError(null);

    try {
      const orders = await parseDailyOrders(file);
      setUploadedOrders(orders);

      try {
        const backendOrders = orders.map((o) => ({
          orderId: o.orderNo,
          design: o.design,
          product: o.design,
        }));
        await storeDailyOrders.mutateAsync({ date: selectedDate, orders: backendOrders });
      } catch (saveErr: any) {
        setSaveError(saveErr.message || 'Failed to save orders to backend. Please try uploading again.');
      }
    } catch (parseErr: any) {
      setParseError(parseErr.message || 'Failed to parse file');
      setUploadedOrders([]);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleApplyMapping = async () => {
    if (mappingLookup.size === 0 || !mappingSummary) return;

    setIsApplyingMapping(true);
    setMappingError(null);
    try {
      const assignmentMap = new Map(assignments.map((a) => [a.orderId, a]));
      
      const ordersByKarigarToAssign = new Map<string, string[]>();
      
      currentOrders.forEach((order) => {
        const mapping = mappingLookup.get(order.design);
        if (!mapping) return;

        const existingAssignment = assignmentMap.get(order.orderNo);
        if (existingAssignment && !overwriteExisting) {
          return;
        }

        if (!ordersByKarigarToAssign.has(mapping.karigar)) {
          ordersByKarigarToAssign.set(mapping.karigar, []);
        }
        ordersByKarigarToAssign.get(mapping.karigar)!.push(order.orderNo);
      });

      const assignmentPromises = Array.from(ordersByKarigarToAssign.entries()).map(
        ([karigar, orderIds]) =>
          assignKarigar.mutateAsync({
            date: selectedDate,
            orderIds,
            karigar,
            factory: null,
          })
      );

      await Promise.all(assignmentPromises);
      setShowMappingPanel(false);
    } catch (error: any) {
      setMappingError(error.message || 'Failed to apply mapping');
    } finally {
      setIsApplyingMapping(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setUploadedOrders([]);
    setParseError(null);
    setSaveError(null);
    setMappingError(null);
    setSelectedOrderIds(new Set());
    setSelectedFactory(null);
    setSelectedKarigar(null);
    setShowMappingPanel(false);
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrderIds);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrderIds(newSelection);
  };

  const selectAllOrders = () => {
    const currentFactoryOrders = selectedFactory ? ordersByFactory.get(selectedFactory) || [] : [];
    const currentOrderIds = currentFactoryOrders.map(o => o.orderNo);
    
    if (currentOrderIds.every(id => selectedOrderIds.has(id))) {
      const newSelection = new Set(selectedOrderIds);
      currentOrderIds.forEach(id => newSelection.delete(id));
      setSelectedOrderIds(newSelection);
    } else {
      const newSelection = new Set(selectedOrderIds);
      currentOrderIds.forEach(id => newSelection.add(id));
      setSelectedOrderIds(newSelection);
    }
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
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Daily Order Upload</h2>
        <p className="text-muted-foreground">
          Upload daily orders, assign to karigars, and manage assignments
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </CardContent>
          </Card>

          {/* Upload OrderList */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-4 w-4" />
                Upload OrderList
              </CardTitle>
              <CardDescription>Upload order file (.csv, .xlsx, .xls)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="orderlist-upload" className="cursor-pointer">
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50">
                  <div className="text-center">
                    <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isUploading ? 'Uploading...' : 'Click to upload'}
                    </p>
                  </div>
                </div>
                <Input
                  id="orderlist-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleOrderListUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </Label>
            </CardContent>
          </Card>

          {/* Apply Mapping Button */}
          {mappingSummary && !showMappingPanel && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Apply Karigar Mapping</CardTitle>
                <CardDescription>
                  {mappingSummary.matchedOrders} of {mappingSummary.totalOrders} orders can be auto-assigned
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowMappingPanel(true)}
                  className="w-full"
                  variant="default"
                >
                  Review & Apply Mapping
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Mapping Apply Panel */}
          {mappingSummary && showMappingPanel && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Apply Karigar Mapping</CardTitle>
                <CardDescription>Review and apply automatic assignments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Orders:</span>
                    <span className="font-medium">{mappingSummary.totalOrders}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Matched:</span>
                    <span className="font-medium">{mappingSummary.matchedOrders}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>Unmatched:</span>
                    <span className="font-medium">{mappingSummary.unmatchedOrders}</span>
                  </div>
                </div>

                {mappingSummary.matchedByKarigar.size > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Orders by Karigar:</p>
                    <div className="space-y-1">
                      {Array.from(mappingSummary.matchedByKarigar.entries()).map(([karigar, count]) => (
                        <div key={karigar} className="flex justify-between text-xs">
                          <span>{karigar}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mappingSummary.unmatchedDesigns.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Unmatched Designs:</p>
                    <div className="max-h-32 overflow-y-auto rounded border bg-muted/50 p-2">
                      <div className="space-y-1">
                        {mappingSummary.unmatchedDesigns.map((design) => (
                          <div key={design} className="text-xs">{design}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="overwrite"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="overwrite" className="text-xs">
                    Overwrite existing assignments
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowMappingPanel(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={isApplyingMapping}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApplyMapping}
                    disabled={isApplyingMapping || mappingSummary.matchedOrders === 0}
                    className="flex-1"
                  >
                    {isApplyingMapping ? 'Applying...' : 'Apply'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Factory Groups */}
          {currentOrders.length > 0 && (
            <GroupsSidebar
              ordersByFactory={ordersByFactory}
              selectedFactory={selectedFactory}
              onSelectFactory={setSelectedFactory}
            />
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {saveError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}

          {mappingError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{mappingError}</AlertDescription>
            </Alert>
          )}

          {loadingOrders ? (
            <Card>
              <CardContent className="flex h-64 items-center justify-center">
                <p className="text-muted-foreground">Loading orders...</p>
              </CardContent>
            </Card>
          ) : currentOrders.length === 0 ? (
            <Card>
              <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">No orders for {format(new Date(selectedDate), 'MMM dd, yyyy')}</p>
                  <p className="text-sm text-muted-foreground">Upload an OrderList file to get started</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-4">
                <OrdersToolbar
                  searchText={searchText}
                  onSearchChange={setSearchText}
                  sortOrder={sortOrder}
                  onSortChange={setSortOrder}
                />
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllOrders}
                  >
                    Select All
                  </Button>
                  <AssignmentPanel
                    selectedDate={selectedDate}
                    selectedOrderIds={Array.from(selectedOrderIds)}
                    onAssignmentComplete={() => setSelectedOrderIds(new Set())}
                  />
                  <ExportPanel
                    selectedDate={selectedDate}
                    selectedFactory={selectedFactory}
                    ordersByFactory={ordersByFactory}
                    assignments={assignments}
                    mappingLookup={mappingLookup}
                  />
                </div>
              </div>

              {/* Factory Navigation and Content */}
              {selectedFactory && (
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
                      selectedOrderIds={selectedOrderIds}
                      onToggleSelection={toggleOrderSelection}
                      selectedDate={selectedDate}
                      mappingLookup={mappingLookup}
                      showDownloadButtons={false}
                      selectedKarigar={selectedKarigar}
                      onSelectKarigar={setSelectedKarigar}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
