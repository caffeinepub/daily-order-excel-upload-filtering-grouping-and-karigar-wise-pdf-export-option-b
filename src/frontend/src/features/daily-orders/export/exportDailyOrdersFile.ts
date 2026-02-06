import type { ParsedOrder } from '../excel/parseDailyOrders';

interface ExportableOrder extends ParsedOrder {
  karigar?: string;
  genericName?: string;
}

/**
 * Export daily orders to Excel file using XLSX library
 * Supports enriched orders with karigar and generic name columns
 */
export function exportDailyOrdersToExcel(orders: ExportableOrder[], filename: string) {
  if (!window.XLSX) {
    throw new Error('Excel export library not loaded. Please refresh the page and try again.');
  }

  if (!orders || orders.length === 0) {
    throw new Error('No orders to export');
  }

  try {
    // Prepare data for export with all available columns
    const data = orders.map((order) => {
      const row: Record<string, string> = {
        'Order No': order.orderNo || '',
        'Design': order.design || '',
      };

      // Add Generic Name if available
      if ('genericName' in order) {
        row['Generic Name'] = order.genericName || '-';
      }

      // Add Karigar if available
      if ('karigar' in order) {
        row['Karigar'] = order.karigar || 'Unmapped';
      }

      // Add base order fields
      row['Weight'] = order.weight || '-';
      row['Size'] = order.size || '-';
      row['Quantity'] = order.quantity || '-';
      row['Remarks'] = order.remarks || '-';

      return row;
    });

    // Create worksheet
    const worksheet = window.XLSX.utils.json_to_sheet(data);

    // Create workbook
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    // Export file
    window.XLSX.writeFile(workbook, filename);
  } catch (error: any) {
    throw new Error(`Failed to export orders: ${error.message || 'Unknown error'}`);
  }
}
