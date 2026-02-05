import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGetDailyOrders, useStoreDailyOrders, useGetKarigarAssignments } from '@/hooks/useQueries';
import { parseDailyOrders, type ParsedOrder } from './excel/parseDailyOrders';
import OrdersTable from './components/OrdersTable';
import OrdersToolbar from './components/OrdersToolbar';
import AssignmentPanel from './components/AssignmentPanel';
import GroupsSidebar from './components/GroupsSidebar';
import ExportPanel from './components/ExportPanel';
import { useOrderFilters } from './hooks/useOrderFilters';

export default function DailyOrdersPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [uploadedOrders, setUploadedOrders] = useState<ParsedOrder[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectedKarigar, setSelectedKarigar] = useState<string | null>(null);

  const { data: savedOrders = [], isLoading: loadingOrders } = useGetDailyOrders(selectedDate);
  const { data: assignments = [] } = useGetKarigarAssignments(selectedDate);
  const storeDailyOrders = useStoreDailyOrders();

  // Use uploaded orders if available, otherwise use saved orders
  const currentOrders = useMemo(() => {
    if (uploadedOrders.length > 0) return uploadedOrders;
    return savedOrders.map((o) => ({
      orderNo: o.orderId,
      design: o.product,
      weight: '',
      size: '',
      quantity: '',
      remarks: '',
    }));
  }, [uploadedOrders, savedOrders]);

  const { filteredOrders, searchText, setSearchText, sortOrder, setSortOrder } = useOrderFilters(currentOrders);

  // Group orders by karigar
  const ordersByKarigar = useMemo(() => {
    const groups = new Map<string, ParsedOrder[]>();
    const assignmentMap = new Map(assignments.map((a) => [a.orderId, a]));

    filteredOrders.forEach((order) => {
      const assignment = assignmentMap.get(order.orderNo);
      if (assignment) {
        const key = assignment.karigar;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(order);
      }
    });

    return groups;
  }, [filteredOrders, assignments]);

  const displayedOrders = useMemo(() => {
    if (selectedKarigar) {
      return ordersByKarigar.get(selectedKarigar) || [];
    }
    return filteredOrders;
  }, [selectedKarigar, ordersByKarigar, filteredOrders]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setParseError(null);

    try {
      const orders = await parseDailyOrders(file);
      setUploadedOrders(orders);

      // Store in backend
      const backendOrders = orders.map((o) => ({
        orderId: o.orderNo,
        product: o.design,
      }));
      await storeDailyOrders.mutateAsync({ date: selectedDate, orders: backendOrders });
    } catch (error: any) {
      setParseError(error.message || 'Failed to parse file');
      setUploadedOrders([]);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setUploadedOrders([]);
    setParseError(null);
    setSelectedOrderIds(new Set());
    setSelectedKarigar(null);
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
    if (selectedOrderIds.size === displayedOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(displayedOrders.map((o) => o.orderNo)));
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Daily Orders Management</h1>
        <p className="text-muted-foreground">
          Upload daily orders, assign to karigars, and export reports
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

          {/* Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-4 w-4" />
                Upload File
              </CardTitle>
              <CardDescription>Upload CSV file with daily orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50">
                  <div className="text-center">
                    <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isUploading ? 'Uploading...' : 'Click to upload'}
                    </p>
                  </div>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </Label>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Export your Excel file as CSV format before uploading
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Groups */}
          {currentOrders.length > 0 && (
            <GroupsSidebar
              ordersByKarigar={ordersByKarigar}
              selectedKarigar={selectedKarigar}
              onSelectKarigar={setSelectedKarigar}
            />
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {parseError && (
            <Alert variant="destructive">
              <AlertDescription>{parseError}</AlertDescription>
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
                  <p className="text-sm text-muted-foreground">Upload a CSV file to get started</p>
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
                    {selectedOrderIds.size === displayedOrders.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <AssignmentPanel
                    selectedDate={selectedDate}
                    selectedOrderIds={Array.from(selectedOrderIds)}
                    onAssignmentComplete={() => setSelectedOrderIds(new Set())}
                  />
                  <ExportPanel
                    selectedDate={selectedDate}
                    selectedKarigar={selectedKarigar}
                    ordersByKarigar={ordersByKarigar}
                  />
                </div>
              </div>

              {/* Orders Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {selectedKarigar ? `Orders for ${selectedKarigar}` : 'All Orders'}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {displayedOrders.length} order{displayedOrders.length !== 1 ? 's' : ''}
                      {selectedOrderIds.size > 0 && ` (${selectedOrderIds.size} selected)`}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrdersTable
                    orders={displayedOrders}
                    assignments={assignments}
                    selectedOrderIds={selectedOrderIds}
                    onToggleSelection={toggleOrderSelection}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
