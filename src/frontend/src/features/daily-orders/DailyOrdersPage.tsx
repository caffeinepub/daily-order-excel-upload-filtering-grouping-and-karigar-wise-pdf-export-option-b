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

  // Calculate diagnostics for parsed data
  const diagnostics = useMemo(() => {
    if (currentOrders.length === 0) return null;

    const totalRows = currentOrders.length;
    const rowsWithWeight = currentOrders.filter((o) => o.weight && o.weight.trim()).length;
    const rowsWithSize = currentOrders.filter((o) => o.size && o.size.trim()).length;
    const rowsWithQuantity = currentOrders.filter((o) => o.quantity && o.quantity.trim()).length;

    return {
      totalRows,
      rowsWithWeight,
      rowsWithSize,
      rowsWithQuantity,
    };
  }, [currentOrders]);

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
        <p className="text-muted-foreground">Upload daily orders and view extracted data</p>
      </div>

      {/* Actor loading state */}
      {!isReady && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Backend Initializing</AlertTitle>
          <AlertDescription>Please wait while the backend is getting ready...</AlertDescription>
        </Alert>
      )}

      {/* Parse error */}
      {parseError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Parsing Error</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{parseError}</AlertDescription>
        </Alert>
      )}

      {/* Save error */}
      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Save Error</AlertTitle>
          <AlertDescription>
            Orders were parsed successfully but could not be saved: {saveError}
          </AlertDescription>
        </Alert>
      )}

      {/* Parse warnings */}
      {parseWarnings.length > 0 && (
        <div className="space-y-2">
          {parseWarnings.map((warning, idx) => (
            <Alert key={idx} className="border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100">
              <Info className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertTitle>Parsing Warning</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">{warning.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Diagnostics card */}
      {diagnostics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extraction Summary</CardTitle>
            <CardDescription>Column extraction results from uploaded file</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Rows:</span>
                <span className="ml-2 font-medium">{diagnostics.totalRows}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rows with Weight:</span>
                <span className="ml-2 font-medium">{diagnostics.rowsWithWeight}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rows with Size:</span>
                <span className="ml-2 font-medium">{diagnostics.rowsWithSize}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rows with Quantity:</span>
                <span className="ml-2 font-medium">{diagnostics.rowsWithQuantity}</span>
              </div>
            </div>
            {(diagnostics.rowsWithWeight === 0 || diagnostics.rowsWithSize === 0 || diagnostics.rowsWithQuantity === 0) && (
              <Alert className="mt-4 border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100">
                <Info className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription>
                  Some optional columns appear to be empty. If your file contains Weight, Size, or Quantity data, please
                  check that the column headers match expected formats (e.g., "Weight", "Wt", "Size", "Qty", "Quantity").
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Order List</CardTitle>
          <CardDescription>Select a date and upload an Excel or CSV file containing daily orders</CardDescription>
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
                  onChange={handleDateChange}
                  disabled={isUploading || !isReady}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="order-file">Order List File</Label>
              <div className="flex gap-2">
                <Input
                  id="order-file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleOrderListUpload}
                  disabled={isUploading || !isReady}
                  className="flex-1"
                />
                <Button disabled={isUploading || !isReady} variant="outline" size="icon" asChild>
                  <label htmlFor="order-file" className="cursor-pointer">
                    <Upload className="h-4 w-4" />
                  </label>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders table */}
      {loadingOrders ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading orders...</p>
          </CardContent>
        </Card>
      ) : currentOrders.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No orders uploaded for {selectedDate}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Orders for {selectedDate}</CardTitle>
                <CardDescription>
                  {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
                  {searchText && ` (filtered from ${currentOrders.length})`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportAll} disabled={filteredOrders.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export All
                </Button>
                {selectedOrderIds.size > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExportSelected}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Selected ({selectedOrderIds.size})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and sort controls */}
            <div className="flex gap-4">
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

            {/* Orders table */}
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-2 text-left">
                        <Checkbox checked={allSelected} onCheckedChange={selectAllOrders} />
                      </th>
                      <th className="p-2 text-left font-medium">Order No</th>
                      <th className="p-2 text-left font-medium">Design</th>
                      <th className="p-2 text-left font-medium">Weight</th>
                      <th className="p-2 text-left font-medium">Size</th>
                      <th className="p-2 text-left font-medium">Quantity</th>
                      <th className="p-2 text-left font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.orderNo} className="border-b hover:bg-muted/30">
                        <td className="p-2">
                          <Checkbox
                            checked={selectedOrderIds.has(order.orderNo)}
                            onCheckedChange={() => toggleOrderSelection(order.orderNo)}
                          />
                        </td>
                        <td className="p-2">{order.orderNo}</td>
                        <td className="p-2">{order.design}</td>
                        <td className="p-2">{order.weight || '-'}</td>
                        <td className="p-2">{order.size || '-'}</td>
                        <td className="p-2">{order.quantity || '-'}</td>
                        <td className="p-2">{order.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
