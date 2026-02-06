import { normalizeCellValue, normalizeHeader, matchesHeaderAlias } from '@/utils/textNormalize';

export interface ParsedOrder {
  orderNo: string;
  design: string;
  weight: string;
  size: string;
  quantity: string;
  remarks: string;
}

export interface ParseWarning {
  type: 'missing-columns' | 'non-first-header';
  missingColumns?: string[];
  detectedHeaders?: string[];
  headerRowIndex?: number;
  message: string;
}

export interface ParseResult {
  orders: ParsedOrder[];
  warnings: ParseWarning[];
}

// Column name variants/aliases for robust matching
const COLUMN_ALIASES = {
  orderNo: ['order no', 'order no.', 'orderno', 'order number', 'order #', 'order', 'sr no', 'sr no.', 'serial no'],
  design: ['design', 'design code', 'designcode', 'design no', 'design no.', 'item', 'item code'],
  weight: ['weight', 'wt', 'wt.', 'net wt', 'net wt.', 'net weight', 'gross wt', 'gross weight', 'netwt'],
  size: ['size', 'sz', 'sz.', 'dimension', 'dimensions', 'dim'],
  quantity: ['quantity', 'qty', 'qty.', 'quan', 'quan.', 'count', 'pieces', 'pcs', 'nos'],
  remarks: ['remarks', 'remark', "remark's", 'note', 'notes', 'comment', 'comments', 'description', 'desc', 'rmks'],
};

// Score a row to determine if it's likely a header row
function scoreHeaderRow(row: any[]): number {
  let score = 0;
  const nonEmpty = row.filter(cell => cell != null && String(cell).trim()).length;
  
  // Must have at least 3 non-empty cells
  if (nonEmpty < 3) return 0;
  
  // Check how many required columns we can find
  const foundColumns = {
    orderNo: row.some(h => matchesHeaderAlias(String(h || ''), COLUMN_ALIASES.orderNo)),
    design: row.some(h => matchesHeaderAlias(String(h || ''), COLUMN_ALIASES.design)),
    weight: row.some(h => matchesHeaderAlias(String(h || ''), COLUMN_ALIASES.weight)),
    size: row.some(h => matchesHeaderAlias(String(h || ''), COLUMN_ALIASES.size)),
    quantity: row.some(h => matchesHeaderAlias(String(h || ''), COLUMN_ALIASES.quantity)),
    remarks: row.some(h => matchesHeaderAlias(String(h || ''), COLUMN_ALIASES.remarks)),
  };
  
  // Score based on how many required columns found
  score += Object.values(foundColumns).filter(Boolean).length * 10;
  
  // Bonus for having Order No and Design (most critical)
  if (foundColumns.orderNo) score += 20;
  if (foundColumns.design) score += 20;
  
  return score;
}

// Find the best header row within the first N rows
function detectHeaderRow(rows: any[][], maxRowsToScan = 20): number {
  let bestScore = 0;
  let bestRowIndex = 0;
  
  const rowsToCheck = Math.min(rows.length, maxRowsToScan);
  
  for (let i = 0; i < rowsToCheck; i++) {
    const score = scoreHeaderRow(rows[i]);
    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = i;
    }
  }
  
  // If we found a row with at least 2 required columns, use it
  if (bestScore >= 20) {
    return bestRowIndex;
  }
  
  // Otherwise default to first row
  return 0;
}

// Find column index by matching against aliases
function findColumnIndex(headers: any[], aliases: string[]): number {
  return headers.findIndex(h => matchesHeaderAlias(String(h || ''), aliases));
}

// Extract and clean string value from cell
function extractCellValue(cell: any): string {
  if (cell == null || cell === undefined) return '';
  
  // Convert to string and normalize
  const strValue = String(cell);
  return normalizeCellValue(strValue);
}

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
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): any[][] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => parseCSVLine(line));
}

function parseExcel(buffer: ArrayBuffer): any[][] {
  if (!window.XLSX) {
    throw new Error('XLSX library not loaded');
  }
  
  const workbook = window.XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to array of arrays with raw: false to get formatted strings
  // but use defval: null to distinguish empty cells
  const data = window.XLSX.utils.sheet_to_json<any[]>(worksheet, { 
    header: 1, 
    raw: false,
    defval: null,
    blankrows: false
  });
  
  return data as any[][];
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

export async function parseDailyOrders(file: File): Promise<ParseResult> {
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

        let rows: any[][] = [];

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

        // Detect the header row
        const headerRowIndex = detectHeaderRow(rows);
        const headers = rows[headerRowIndex];
        
        // Find column indices using aliases
        const columnIndices = {
          orderNo: findColumnIndex(headers, COLUMN_ALIASES.orderNo),
          design: findColumnIndex(headers, COLUMN_ALIASES.design),
          weight: findColumnIndex(headers, COLUMN_ALIASES.weight),
          size: findColumnIndex(headers, COLUMN_ALIASES.size),
          quantity: findColumnIndex(headers, COLUMN_ALIASES.quantity),
          remarks: findColumnIndex(headers, COLUMN_ALIASES.remarks),
        };

        // Check for missing critical columns (Order No and Design are required)
        if (columnIndices.orderNo === -1 || columnIndices.design === -1) {
          const detectedHeaders = headers
            .filter((h: any) => h != null && String(h).trim())
            .map((h: any) => String(h).trim())
            .join(', ') || '(none)';
          const missingCritical: string[] = [];
          if (columnIndices.orderNo === -1) missingCritical.push('Order No');
          if (columnIndices.design === -1) missingCritical.push('Design');
          
          const errorMessage = [
            `Cannot parse file: Missing critical columns: ${missingCritical.join(', ')}.`,
            `\nDetected headers in row ${headerRowIndex + 1}: ${detectedHeaders}`,
            `\nPlease ensure your file contains at minimum "Order No" and "Design" columns.`,
          ].join('');
          
          reject(new Error(errorMessage));
          return;
        }

        // Build warnings
        const warnings: ParseWarning[] = [];
        
        // Warning for non-first header row
        if (headerRowIndex > 0) {
          warnings.push({
            type: 'non-first-header',
            headerRowIndex: headerRowIndex + 1,
            message: `Headers detected on row ${headerRowIndex + 1} (not the first row). Rows 1-${headerRowIndex} were skipped.`,
          });
        }
        
        // Warning for missing optional columns
        const missingOptional: string[] = [];
        if (columnIndices.weight === -1) missingOptional.push('Weight');
        if (columnIndices.size === -1) missingOptional.push('Size');
        if (columnIndices.quantity === -1) missingOptional.push('Quantity');
        if (columnIndices.remarks === -1) missingOptional.push('Remarks');

        if (missingOptional.length > 0) {
          const detectedHeadersList = headers
            .filter((h: any) => h != null && String(h).trim())
            .map((h: any) => String(h).trim())
            .join(', ');
          
          warnings.push({
            type: 'missing-columns',
            missingColumns: missingOptional,
            detectedHeaders: headers
              .filter((h: any) => h != null && String(h).trim())
              .map((h: any) => String(h).trim()),
            headerRowIndex: headerRowIndex + 1,
            message: `Optional columns not found: ${missingOptional.join(', ')}. These fields will be empty. Detected headers: ${detectedHeadersList}`,
          });
        }

        // Parse data rows (skip rows up to and including header)
        const dataRows = rows.slice(headerRowIndex + 1);
        const orders: ParsedOrder[] = dataRows.map((row: any[]) => {
          // Extract and normalize all cell values
          const orderNo: string = extractCellValue(row[columnIndices.orderNo]);
          const design: string = extractCellValue(row[columnIndices.design]);
          const weight: string = columnIndices.weight !== -1 ? extractCellValue(row[columnIndices.weight]) : '';
          const size: string = columnIndices.size !== -1 ? extractCellValue(row[columnIndices.size]) : '';
          const quantity: string = columnIndices.quantity !== -1 ? extractCellValue(row[columnIndices.quantity]) : '';
          const remarks: string = columnIndices.remarks !== -1 ? extractCellValue(row[columnIndices.remarks]) : '';

          return {
            orderNo,
            design,
            weight,
            size,
            quantity,
            remarks,
          };
        });

        // Filter out completely empty rows
        const validOrders = orders.filter((order) => order.orderNo || order.design);

        if (validOrders.length === 0) {
          reject(new Error('No valid orders found in the file'));
          return;
        }

        resolve({
          orders: validOrders,
          warnings,
        });
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
