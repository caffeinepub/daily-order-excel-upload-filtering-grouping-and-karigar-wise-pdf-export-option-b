import { normalizeCellValue, normalizeHeader, matchesHeaderAlias, normalizeDesignCode } from '@/utils/textNormalize';

// Extend Window interface for PDF.js
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export interface KarigarMappingEntry {
  design: string;
  designNormalized: string; // Normalized for lookup
  karigar: string;
  genericName: string; // Now required
}

export interface KarigarMappingSheet {
  entries: Map<string, KarigarMappingEntry>;
}

export interface ParsedKarigarMapping {
  [sheetName: string]: KarigarMappingSheet;
}

/**
 * Parse karigar mapping workbook (Master Design File) with all three required columns:
 * - Design Code
 * - Generic Name
 * - Karigar Name
 * Supports PDF extraction
 */
export async function parseKarigarMapping(file: File): Promise<ParsedKarigarMapping> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Check if it's a PDF file
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return parsePdfMapping(file);
  }
  
  // Otherwise parse as Excel
  return parseExcelMapping(file);
}

/**
 * Check if a value looks like a numeric ratio (e.g., "3+1", "2:1", "5/2")
 * These should not be treated as generic names
 */
function looksLikeNumericRatio(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  // Match patterns like: "3+1", "2:1", "5/2", "10-5", or just numbers
  return /^[\d\s+\-:\/]+$/.test(trimmed);
}

interface SheetParseResult {
  sheetName: string;
  entries: Map<string, KarigarMappingEntry>;
  error?: string;
}

/**
 * Try to parse a single sheet for design-karigar mappings
 * Returns entries map if successful, or error message if failed
 */
function tryParseSheet(
  sheetName: string,
  worksheet: any,
  XLSX: any
): SheetParseResult {
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  }) as any[];

  if (rows.length === 0) {
    return {
      sheetName,
      entries: new Map(),
      error: `Sheet "${sheetName}" is empty`,
    };
  }

  // Find header row and column indices
  let headerRowIndex = -1;
  let designColIndex = -1;
  let karigarColIndex = -1;
  let nameColIndex = -1;

  // Expanded aliases for better detection
  const designAliases = ['design', 'product', 'code', 'design code', 'product code', 'item', 'item code', 'style'];
  const karigarAliases = ['karigar', 'artisan', 'worker', 'craftsman', 'maker'];
  const nameAliases = ['name', 'product name', 'generic', 'generic name', 'item name', 'description'];

  // Search first 10 rows for headers (support title rows)
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] as any[];
    if (!row || row.length < 3) continue; // Need at least 3 columns now

    // Look for design/product code column
    const designIndex = row.findIndex((cell) =>
      matchesHeaderAlias(String(cell || ''), designAliases)
    );

    // Look for karigar column
    const karigarIndex = row.findIndex((cell) =>
      matchesHeaderAlias(String(cell || ''), karigarAliases)
    );

    // Look for name column (generic product name) - but avoid numeric ratios
    const nameIndex = row.findIndex((cell) => {
      const cellStr = String(cell || '');
      return matchesHeaderAlias(cellStr, nameAliases) && !looksLikeNumericRatio(cellStr);
    });

    // All three columns are now required
    if (designIndex !== -1 && karigarIndex !== -1 && nameIndex !== -1) {
      headerRowIndex = i;
      designColIndex = designIndex;
      karigarColIndex = karigarIndex;
      nameColIndex = nameIndex;
      break;
    }
  }

  // If any required column is missing, return detailed error
  if (headerRowIndex === -1 || designColIndex === -1 || karigarColIndex === -1 || nameColIndex === -1) {
    const detectedHeaders = rows.length > 0 
      ? (rows[0] as any[]).slice(0, 5).map(c => String(c || '')).filter(h => h).join(', ') 
      : 'none';
    
    const missingColumns: string[] = [];
    if (designColIndex === -1) missingColumns.push('Design Code');
    if (nameColIndex === -1) missingColumns.push('Generic Name');
    if (karigarColIndex === -1) missingColumns.push('Karigar Name');
    
    return {
      sheetName,
      entries: new Map(),
      error: `Sheet "${sheetName}": Missing required column(s): ${missingColumns.join(', ')}. Detected headers: ${detectedHeaders || 'none'}`,
    };
  }

  const sheetEntries = new Map<string, KarigarMappingEntry>();

  // Process data rows (skip header row)
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] as any[];
    if (!row || row.length === 0) continue;

    // Apply normalization to all cell values
    const design = normalizeCellValue(row[designColIndex]);
    const karigar = normalizeCellValue(row[karigarColIndex]);
    const genericNameRaw = nameColIndex !== -1 && nameColIndex < row.length ? normalizeCellValue(row[nameColIndex]) : '';
    
    // Filter out numeric ratios from generic name
    const genericName = genericNameRaw && !looksLikeNumericRatio(genericNameRaw) ? genericNameRaw : '';

    // Skip empty or header-like rows - all three fields are now required
    if (!design || !karigar || !genericName) continue;
    if (normalizeHeader(design).includes('design') || normalizeHeader(karigar).includes('karigar')) continue;

    // Normalize design code for lookup using canonical normalization
    const designNormalized = normalizeDesignCode(design);
    
    // Skip if normalized design is empty
    if (!designNormalized) continue;

    const entry: KarigarMappingEntry = {
      design, // Keep original for display
      designNormalized, // Normalized for lookup
      karigar,
      genericName, // Now always present
    };

    // Use normalized design as key
    sheetEntries.set(designNormalized, entry);
  }

  if (sheetEntries.size === 0) {
    return {
      sheetName,
      entries: new Map(),
      error: `Sheet "${sheetName}": No valid design-karigar mappings found after parsing (all rows were empty or missing required fields)`,
    };
  }

  return {
    sheetName,
    entries: sheetEntries,
  };
}

async function parseExcelMapping(file: File): Promise<ParsedKarigarMapping> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        if (!window.XLSX) {
          reject(new Error('XLSX library not loaded'));
          return;
        }

        const buffer = data as ArrayBuffer;
        const workbook = window.XLSX.read(buffer, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('The workbook contains no sheets. Please upload a valid Excel file.'));
          return;
        }

        const result: ParsedKarigarMapping = {};
        const parseResults: SheetParseResult[] = [];
        
        // Scan ALL sheets in the workbook
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const parseResult = tryParseSheet(sheetName, worksheet, window.XLSX);
          parseResults.push(parseResult);

          if (parseResult.entries.size > 0) {
            result[sheetName] = {
              entries: parseResult.entries,
            };
          }
        }

        // If no sheets were successfully parsed, collect all errors
        if (Object.keys(result).length === 0) {
          const errorMessages = parseResults
            .filter(r => r.error)
            .map(r => r.error)
            .join('\n\n');
          
          reject(new Error(
            errorMessages || 
            'No valid sheets found. Please ensure your Master Design File contains all three required columns: Design Code, Generic Name, and Karigar Name.'
          ));
          return;
        }

        resolve(result);
      } catch (error: any) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

async function parsePdfMapping(file: File): Promise<ParsedKarigarMapping> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read PDF file'));
          return;
        }

        if (!window.pdfjsLib) {
          reject(new Error('PDF.js library not loaded'));
          return;
        }

        const typedArray = new Uint8Array(data as ArrayBuffer);
        const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise;

        const allText: string[] = [];

        // Extract text from all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          allText.push(pageText);
        }

        const fullText = allText.join('\n');

        // Parse the extracted text as a simple table
        const lines = fullText.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
          reject(new Error('PDF appears to be empty or contains no readable text'));
          return;
        }

        // Find header row
        let headerRowIndex = -1;
        let designColIndex = -1;
        let karigarColIndex = -1;
        let nameColIndex = -1;

        const designAliases = ['design', 'product', 'code', 'design code', 'product code', 'item', 'item code'];
        const karigarAliases = ['karigar', 'artisan', 'worker', 'craftsman'];
        const nameAliases = ['name', 'product name', 'generic', 'generic name', 'item name', 'description'];

        for (let i = 0; i < Math.min(10, lines.length); i++) {
          const cells = lines[i].split(/\s{2,}|\t/).map(c => c.trim());
          
          const designIndex = cells.findIndex((cell) =>
            matchesHeaderAlias(cell, designAliases)
          );

          const karigarIndex = cells.findIndex((cell) =>
            matchesHeaderAlias(cell, karigarAliases)
          );

          const nameIndex = cells.findIndex((cell) =>
            matchesHeaderAlias(cell, nameAliases) && !looksLikeNumericRatio(cell)
          );

          // All three columns are now required
          if (designIndex !== -1 && karigarIndex !== -1 && nameIndex !== -1) {
            headerRowIndex = i;
            designColIndex = designIndex;
            karigarColIndex = karigarIndex;
            nameColIndex = nameIndex;
            break;
          }
        }

        if (headerRowIndex === -1 || designColIndex === -1 || karigarColIndex === -1 || nameColIndex === -1) {
          const detectedHeaders = lines.length > 0 ? lines[0] : 'none';
          const missingColumns: string[] = [];
          if (designColIndex === -1) missingColumns.push('Design Code');
          if (nameColIndex === -1) missingColumns.push('Generic Name');
          if (karigarColIndex === -1) missingColumns.push('Karigar Name');
          
          reject(new Error(
            `PDF parsing failed: Missing required column(s): ${missingColumns.join(', ')}.\n\n` +
            `Detected headers: ${detectedHeaders}\n\n` +
            `Please ensure your Master Design File contains all three required columns.`
          ));
          return;
        }

        const entries = new Map<string, KarigarMappingEntry>();

        // Process data rows
        for (let i = headerRowIndex + 1; i < lines.length; i++) {
          const cells = lines[i].split(/\s{2,}|\t/).map(c => c.trim());
          
          const design = normalizeCellValue(cells[designColIndex] || '');
          const karigar = normalizeCellValue(cells[karigarColIndex] || '');
          const genericNameRaw = normalizeCellValue(cells[nameColIndex] || '');
          const genericName = genericNameRaw && !looksLikeNumericRatio(genericNameRaw) ? genericNameRaw : '';

          // All three fields are now required
          if (!design || !karigar || !genericName) continue;
          if (normalizeHeader(design).includes('design') || normalizeHeader(karigar).includes('karigar')) continue;

          const designNormalized = normalizeDesignCode(design);
          if (!designNormalized) continue;

          const entry: KarigarMappingEntry = {
            design,
            designNormalized,
            karigar,
            genericName,
          };

          entries.set(designNormalized, entry);
        }

        if (entries.size === 0) {
          reject(new Error('No valid design-karigar mappings found in PDF (all rows were empty or missing required fields)'));
          return;
        }

        resolve({
          'PDF': {
            entries,
          },
        });
      } catch (error: any) {
        reject(new Error(`Failed to parse PDF: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read PDF file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
