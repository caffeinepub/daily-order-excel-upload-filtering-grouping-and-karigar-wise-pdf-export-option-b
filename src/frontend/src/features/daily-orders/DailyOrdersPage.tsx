import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Upload, AlertCircle, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useGetDailyOrders, useStoreDailyOrders } from '@/hooks/useQueries';
import { useActorWithStatus } from '@/hooks/useActorWithStatus';
import { parseDailyOrders, type ParsedOrder, type ParseResult } from './excel/parseDailyOrders';
import { getUserFacingError } from '@/utils/userFacingError';
import { exportDailyOrdersToExcel } from './export/exportDailyOrdersFile';
import type { DailyOrder } from '@/backend';

export default function DailyOrdersPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [uploadedOrders, setUploadedOrders] = useState<ParsedOrder[]>([]);
  const [parseWarnings, setParseWarnings] = useState<ParseResult['warnings']>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [sortColumn, setSortColumn] = useState<'orderNo' | 'design' | null>(null);

  const { isReady } = useActorWithStatus();
  const { data: savedOrders = [], isLoading: loadingOrders } = useGetDailyOrders(selectedDate);
  const storeDailyOrders = useStoreDailyOrders();

  // Persist selected date to session storage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('lastUploadDate', selectedDate);
  }, [selectedDate]);

  // Use uploaded orders if available, otherwise use saved orders
  const currentOrders = useMemo(() => {
    if (uploadedOrders.length > 0) return uploadedOrders;
    // Convert backend DailyOrder to ParsedOrder format
    return savedOrders.map((o) => ({
      orderNo: o.orderNo,
      design: o.design,
      weight: o.weight || '',
      size: o.size || '',
      quantity: o.quantity || '',
      remarks: o.remarks || '',
    }));
  }, [uploadedOrders, savedOrders]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let filtered = currentOrders;

    // Search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNo.toLowerCase().includes(search) ||
          order.design.toLowerCase().includes(search) ||
          order.weight.toLowerCase().includes(search) ||
          order.size.toLowerCase().includes(search) ||
          order.quantity.toLowerCase().includes(search) ||
          order.remarks.toLowerCase().includes(search)
      );
    }

    // Sort
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn].toLowerCase();
        const bVal = b[sortColumn].toLowerCase();
        return aVal.localeCompare(bVal);
      });
    }

    return filtered;
  }, [currentOrders, searchText, sortColumn]);

  const handleOrderListUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isReady) {
      setParseError('Backend not ready. Please wait a moment and try again.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setParseError(null);
    setSaveError(null);
    setParseWarnings([]);

    try {
      const result = await parseDailyOrders(file);
      setUploadedOrders(result.orders);
      setParseWarnings(result.warnings);

      // Try to save to backend
      try {
        // Convert ParsedOrder to DailyOrder with all fields
        const backendOrders: DailyOrder[] = result.orders.map((o) => ({
          orderNo: o.orderNo,
          design: o.design,
          weight: o.weight || '',
          size: o.size || '',
          quantity: o.quantity || '',
          remarks: o.remarks || '',
        }));
        await storeDailyOrders.mutateAsync({ date: selectedDate, orders: backendOrders });
      } catch (saveErr: any) {
        // Keep parsed orders visible even if save fails
        setSaveError(getUserFacingError(saveErr));
      }
    } catch (parseErr: any) {
      setParseError(getUserFacingError(parseErr));
      setUploadedOrders([]);
      setParseWarnings([]);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setUploadedOrders([]);
    setParseError(null);
    setSaveError(null);
    setParseWarnings([]);
    setSelectedOrderIds(new Set());
    setSearchText('');
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
    const currentOrderIds = filteredOrders.map((o) => o.orderNo);
    if (currentOrderIds.every((id) => selectedOrderIds.has(id))) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(currentOrderIds));
    }
  };

  const handleExportAll = () => {
    exportDailyOrdersToExcel(filteredOrders, `daily-orders-${selectedDate}.xlsx`);
  };

  const handleExportSelected = () => {
    const selectedOrders = filteredOrders.filter((o) => selectedOrderIds.has(o.orderNo));
    exportDailyOrdersToExcel(selectedOrders, `daily-orders-selected-${selectedDate}.xlsx`);
  };

  const allSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrderIds.has(o.orderNo));

  return (
    <div className="space-y-6">
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Daily Order Upload</h2>
        <p className="text-muted-foreground">
          Upload daily orders and view extracted data
        </p>
      </div>

      {/* Actor loading state */}
      {!isReady && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Connecting to backend...</AlertDescription>
        </Alert>
      )}

      {/* Parse warnings */}
      {parseWarnings.length > 0 && (
        <div className="space-y-2">
          {parseWarnings.map((warning, idx) => (
            <Alert key={idx} variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-900 dark:text-amber-100">
                {warning.type === 'missing-columns' ? 'Optional Columns Missing' : 'Non-Standard Header Location'}
              </AlertTitle>
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {warning.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Parsing Error</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{parseError}</AlertDescription>
        </Alert>
      )}

      {/* Save error (separate from parse error) */}
      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Saving Failed</AlertTitle>
          <AlertDescription>
            {saveError} The parsed data is still visible below, but was not saved to the backend.
          </AlertDescription>
        </Alert>
      )}

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
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isUploading ? 'Processing...' : 'Click to upload'}
                    </p>
                  </div>
                </div>
              </Label>
              <Input
                id="orderlist-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleOrderListUpload}
                disabled={isUploading || !isReady}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Export Options */}
          {currentOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Download className="h-4 w-4" />
                  Export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAll}
                  className="w-full"
                  disabled={filteredOrders.length === 0}
                >
                  Export All ({filteredOrders.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelected}
                  className="w-full"
                  disabled={selectedOrderIds.size === 0}
                >
                  Export Selected ({selectedOrderIds.size})
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Search and Sort */}
          {currentOrders.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    placeholder="Search orders..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="max-w-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant={sortColumn === 'orderNo' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortColumn(sortColumn === 'orderNo' ? null : 'orderNo')}
                    >
                      Sort by Order No
                    </Button>
                    <Button
                      variant={sortColumn === 'design' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortColumn(sortColumn === 'design' ? null : 'design')}
                    >
                      Sort by Design
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orders Table */}
          {loadingOrders ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading orders...
              </CardContent>
            </Card>
          ) : currentOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No orders for {format(new Date(selectedDate), 'MMM dd, yyyy')}. Upload a file to get started.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Orders ({filteredOrders.length})
                  </CardTitle>
                  {filteredOrders.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={selectAllOrders}
                        id="select-all"
                      />
                      <Label htmlFor="select-all" className="cursor-pointer text-sm font-normal">
                        Select All
                      </Label>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-2 py-2 text-left font-medium">Select</th>
                        <th className="px-2 py-2 text-left font-medium">Order No</th>
                        <th className="px-2 py-2 text-left font-medium">Design</th>
                        <th className="px-2 py-2 text-left font-medium">Weight</th>
                        <th className="px-2 py-2 text-left font-medium">Size</th>
                        <th className="px-2 py-2 text-left font-medium">Quantity</th>
                        <th className="px-2 py-2 text-left font-medium">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="px-2 py-2">
                            <Checkbox
                              checked={selectedOrderIds.has(order.orderNo)}
                              onCheckedChange={() => toggleOrderSelection(order.orderNo)}
                            />
                          </td>
                          <td className="px-2 py-2">{order.orderNo}</td>
                          <td className="px-2 py-2">{order.design}</td>
                          <td className="px-2 py-2">{order.weight || '-'}</td>
                          <td className="px-2 py-2">{order.size || '-'}</td>
                          <td className="px-2 py-2">{order.quantity || '-'}</td>
                          <td className="px-2 py-2">{order.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
