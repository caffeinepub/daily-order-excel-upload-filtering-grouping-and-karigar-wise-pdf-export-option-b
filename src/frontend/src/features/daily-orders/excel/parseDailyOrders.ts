export interface ParsedOrder {
  orderNo: string;
  design: string;
  weight: string;
  size: string;
  quantity: string;
  remarks: string;
}

const REQUIRED_COLUMNS = ['Order No', 'Design', 'Weight', 'Size', 'Quantity', 'Remarks'];

// Simple CSV parser for CSV files
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

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => parseCSVLine(line));
}

function parseExcel(buffer: ArrayBuffer): string[][] {
  if (!window.XLSX) {
    throw new Error('XLSX library not loaded');
  }
  
  const workbook = window.XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to array of arrays
  const data = window.XLSX.utils.sheet_to_json<any[]>(worksheet, { 
    header: 1, 
    raw: false, 
    defval: '' 
  });
  return data as string[][];
}

// Detect file type with case-insensitive extension check and MIME type fallback
function detectFileType(file: File): 'csv' | 'xlsx' | 'xls' | 'unsupported' {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  // Check extension first (case-insensitive)
  if (fileName.endsWith('.csv')) {
    return 'csv';
  }
  if (fileName.endsWith('.xlsx')) {
    return 'xlsx';
  }
  if (fileName.endsWith('.xls')) {
    return 'xls';
  }
  
  // Fallback to MIME type
  if (mimeType === 'text/csv' || mimeType === 'application/csv') {
    return 'csv';
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return 'xlsx';
  }
  if (mimeType === 'application/vnd.ms-excel') {
    return 'xls';
  }
  
  return 'unsupported';
}

export async function parseDailyOrders(file: File): Promise<ParsedOrder[]> {
  return new Promise((resolve, reject) => {
    const fileType = detectFileType(file);
    
    if (fileType === 'unsupported') {
      reject(new Error('Unsupported file format. Please upload .csv, .xlsx, or .xls files.'));
      return;
    }

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
        if (fileType === 'csv') {
          // Parse CSV
          const text = data as string;
          rows = parseCSV(text);
        } else {
          // Parse Excel (xlsx or xls)
          const buffer = data as ArrayBuffer;
          rows = parseExcel(buffer);
        }

        if (rows.length === 0) {
          reject(new Error('File is empty'));
          return;
        }

        // First row is headers
        const headers = rows[0].map(h => String(h || '').trim());
        
        // Validate required columns (case-insensitive, flexible matching)
        const findColumnIndex = (columnName: string): number => {
          const searchTerms = columnName.toLowerCase().split(' ');
          return headers.findIndex(h => {
            const headerLower = h.toLowerCase();
            return searchTerms.every(term => headerLower.includes(term));
          });
        };

        const columnIndices = {
          orderNo: findColumnIndex('Order No'),
          design: findColumnIndex('Design'),
          weight: findColumnIndex('Weight'),
          size: findColumnIndex('Size'),
          quantity: findColumnIndex('Quantity'),
          remarks: findColumnIndex('Remarks'),
        };

        const missingColumns: string[] = [];
        if (columnIndices.orderNo === -1) missingColumns.push('Order No');
        if (columnIndices.design === -1) missingColumns.push('Design');
        if (columnIndices.weight === -1) missingColumns.push('Weight');
        if (columnIndices.size === -1) missingColumns.push('Size');
        if (columnIndices.quantity === -1) missingColumns.push('Quantity');
        if (columnIndices.remarks === -1) missingColumns.push('Remarks');

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
          orderNo: String(row[columnIndices.orderNo] || '').trim(),
          design: String(row[columnIndices.design] || '').trim(),
          weight: String(row[columnIndices.weight] || '').trim(),
          size: String(row[columnIndices.size] || '').trim(),
          quantity: String(row[columnIndices.quantity] || '').trim(),
          remarks: String(row[columnIndices.remarks] || '').trim(),
        }));

        // Filter out completely empty rows
        const validOrders = orders.filter((order) => order.orderNo || order.design);

        if (validOrders.length === 0) {
          reject(new Error('No valid orders found in the file'));
          return;
        }

        resolve(validOrders);
      } catch (error: any) {
        reject(new Error(`Failed to parse file: ${error.message || 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    // Read based on file type
    if (fileType === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}
