export interface ParsedOrder {
  orderNo: string;
  design: string;
  weight: string;
  size: string;
  quantity: string;
  remarks: string;
}

const REQUIRED_COLUMNS = ['Order No', 'Design', 'Weight', 'Size', 'Quantity', 'Remarks'];

// Simple CSV parser for Excel files
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function parseDailyOrders(file: File): Promise<ParsedOrder[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        let rows: string[][] = [];

        // Handle different file types
        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const text = data as string;
          const lines = text.split(/\r?\n/).filter(line => line.trim());
          rows = lines.map(line => parseCSVLine(line));
        } else {
          // For .xlsx/.xls files, we need to convert to text first
          // Since we can't use xlsx library, we'll ask user to export as CSV
          reject(new Error('Please export your Excel file as CSV format (.csv) and upload it. Excel binary formats (.xlsx, .xls) require additional libraries.'));
          return;
        }

        if (rows.length === 0) {
          reject(new Error('File is empty'));
          return;
        }

        // First row is headers
        const headers = rows[0].map(h => h.trim());
        
        // Validate required columns (case-insensitive)
        const findColumnIndex = (columnName: string): number => {
          return headers.findIndex(h => h.toLowerCase().includes(columnName.toLowerCase()));
        };

        const columnIndices = {
          orderNo: findColumnIndex('Order No'),
          design: findColumnIndex('Design'),
          weight: findColumnIndex('Weight'),
          size: findColumnIndex('Size'),
          quantity: findColumnIndex('Quantity'),
          remarks: findColumnIndex('Remarks'),
        };

        const missingColumns = REQUIRED_COLUMNS.filter((col) => {
          const key = col.toLowerCase().replace(/\s+/g, '');
          return !Object.entries(columnIndices).some(([k, idx]) => 
            k.toLowerCase().includes(key.split(' ')[0].toLowerCase()) && idx !== -1
          );
        });

        if (missingColumns.length > 0) {
          reject(
            new Error(
              `Missing required columns: ${missingColumns.join(', ')}. Please ensure your file contains all required columns.`
            )
          );
          return;
        }

        // Parse data rows
        const orders: ParsedOrder[] = rows.slice(1).map((row) => ({
          orderNo: (columnIndices.orderNo !== -1 ? row[columnIndices.orderNo] : '') || '',
          design: (columnIndices.design !== -1 ? row[columnIndices.design] : '') || '',
          weight: (columnIndices.weight !== -1 ? row[columnIndices.weight] : '') || '',
          size: (columnIndices.size !== -1 ? row[columnIndices.size] : '') || '',
          quantity: (columnIndices.quantity !== -1 ? row[columnIndices.quantity] : '') || '',
          remarks: (columnIndices.remarks !== -1 ? row[columnIndices.remarks] : '') || '',
        }));

        // Filter out completely empty rows
        const validOrders = orders.filter((order) => order.orderNo || order.design);

        if (validOrders.length === 0) {
          reject(new Error('No valid orders found in the file'));
          return;
        }

        resolve(validOrders);
      } catch (error: any) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    // Read as text for CSV
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }
  });
}
