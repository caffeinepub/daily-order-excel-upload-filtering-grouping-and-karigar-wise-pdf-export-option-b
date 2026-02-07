import { normalizeCellValue, normalizeHeader, matchesHeaderAlias, normalizeDesignCode } from '@/utils/textNormalize';

export interface KarigarMappingEntry {
  design: string;
  designNormalized: string; // Normalized for lookup
  karigar: string;
  genericName?: string;
}

export interface KarigarMappingSheet {
  entries: Map<string, KarigarMappingEntry>;
}

export interface ParsedKarigarMapping {
  [sheetName: string]: KarigarMappingSheet;
}

/**
 * Parse karigar mapping workbook with flexible sheet support:
 * - Priority: sheets "1", "3", "2" (if they exist)
 * - Additionally: scan ALL other sheets for Design + Karigar columns
 * - Supports PDF extraction
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
    if (!row || row.length < 2) continue;

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

    if (designIndex !== -1 && karigarIndex !== -1) {
      headerRowIndex = i;
      designColIndex = designIndex;
      karigarColIndex = karigarIndex;
      nameColIndex = nameIndex;
      break;
    }
  }

  // If no headers found, return detailed error
  if (headerRowIndex === -1 || designColIndex === -1 || karigarColIndex === -1) {
    const detectedHeaders = rows.length > 0 
      ? (rows[0] as any[]).slice(0, 5).map(c => String(c || '')).filter(h => h).join(', ') 
      : 'none';
    
    const missingColumns: string[] = [];
    if (designColIndex === -1) missingColumns.push('Design/Product Code');
    if (karigarColIndex === -1) missingColumns.push('Karigar');
    
    return {
      sheetName,
      entries: new Map(),
      error: `Sheet "${sheetName}": Missing required columns: ${missingColumns.join(', ')}. Detected headers: ${detectedHeaders || 'none'}`,
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
    const genericNameRaw = nameColIndex !== -1 && nameColIndex < row.length ? normalizeCellValue(row[nameColIndex]) : undefined;
    
    // Filter out numeric ratios from generic name
    const genericName = genericNameRaw && !looksLikeNumericRatio(genericNameRaw) ? genericNameRaw : undefined;

    // Skip empty or header-like rows
    if (!design || !karigar) continue;
    if (normalizeHeader(design).includes('design') || normalizeHeader(karigar).includes('karigar')) continue;

    // Normalize design code for lookup using canonical normalization
    const designNormalized = normalizeDesignCode(design);
    
    // Skip if normalized design is empty
    if (!designNormalized) continue;

    const entry: KarigarMappingEntry = {
      design, // Keep original for display
      designNormalized, // Normalized for lookup
      karigar,
      genericName: genericName || undefined,
    };

    // Use normalized design as key
    sheetEntries.set(designNormalized, entry);
  }

  if (sheetEntries.size === 0) {
    return {
      sheetName,
      entries: new Map(),
      error: `Sheet "${sheetName}": No valid design-karigar mappings found after parsing (all rows were empty or invalid)`,
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
        
        // Priority sheets (traditional format)
        const prioritySheets = ['1', '3', '2'];
        
        // ALWAYS scan priority sheets first if they exist
        for (const sheetName of prioritySheets) {
          if (!workbook.SheetNames.includes(sheetName)) {
            continue;
          }

          const worksheet = workbook.Sheets[sheetName];
          const parseResult = tryParseSheet(sheetName, worksheet, window.XLSX);
          parseResults.push(parseResult);

          if (parseResult.entries.size > 0) {
            result[sheetName] = { entries: parseResult.entries };
          }
        }

        // ADDITIONALLY scan ALL remaining sheets (any name) for Design + Karigar columns
        for (const sheetName of workbook.SheetNames) {
          // Skip if already processed as priority sheet
          if (prioritySheets.includes(sheetName)) {
            continue;
          }

          const worksheet = workbook.Sheets[sheetName];
          const parseResult = tryParseSheet(sheetName, worksheet, window.XLSX);
          parseResults.push(parseResult);

          if (parseResult.entries.size > 0) {
            result[sheetName] = { entries: parseResult.entries };
          }
        }

        // Check if we found any valid mappings
        const totalEntries = Object.values(result).reduce((sum, sheet) => sum + sheet.entries.size, 0);
        
        if (totalEntries === 0) {
          // Build detailed error message
          const errorLines: string[] = [];
          
          errorLines.push('No valid design-karigar mappings found in any sheet.');
          errorLines.push('');
          errorLines.push('Checked sheets:');
          
          for (const result of parseResults) {
            if (result.error) {
              errorLines.push(`  • ${result.error}`);
            } else {
              errorLines.push(`  • Sheet "${result.sheetName}": OK but no data rows`);
            }
          }
          
          errorLines.push('');
          errorLines.push('Please ensure your file contains columns for:');
          errorLines.push('  • Design Code (or "Design", "Product Code")');
          errorLines.push('  • Karigar (or "Artisan", "Worker")');
          errorLines.push('  • Optional: Name (or "Generic Name", "Product Name")');
          
          reject(new Error(errorLines.join('\n')));
          return;
        }

        resolve(result);
      } catch (error: any) {
        reject(new Error(`Failed to parse mapping file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read mapping file'));
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

        // For PDF parsing, we'll use a simple text extraction approach
        // In a production environment, you might want to use a library like pdf.js
        const text = await extractTextFromPdf(data as ArrayBuffer);
        
        // Parse the extracted text to find tabular data
        const entries = parseTextToMapping(text);
        
        if (entries.size === 0) {
          reject(new Error('No valid design-karigar mappings found in PDF. Please ensure the PDF contains a table with design code, generic name, and karigar columns.'));
          return;
        }

        const result: ParsedKarigarMapping = {
          '1': { entries }
        };

        resolve(result);
      } catch (error: any) {
        reject(new Error(`Failed to parse PDF file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read PDF file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  // Simple text extraction - in production, use pdf.js or similar
  const uint8Array = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8');
  let text = decoder.decode(uint8Array);
  
  // Clean up PDF encoding artifacts
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
  
  return text;
}

function parseTextToMapping(text: string): Map<string, KarigarMappingEntry> {
  const entries = new Map<string, KarigarMappingEntry>();
  const lines = text.split(/[\r\n]+/).filter(line => line.trim());
  
  // Try to find header row
  let headerIndex = -1;
  let designColIndex = -1;
  let nameColIndex = -1;
  let karigarColIndex = -1;
  
  const designAliases = ['design', 'product', 'code'];
  const nameAliases = ['name', 'generic', 'product name'];
  const karigarAliases = ['karigar', 'artisan', 'worker'];
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    const parts = line.split(/[\t|,;]+/).map(p => p.trim());
    
    const designIdx = parts.findIndex(p => 
      matchesHeaderAlias(p, designAliases)
    );
    const nameIdx = parts.findIndex(p => 
      matchesHeaderAlias(p, nameAliases) && !looksLikeNumericRatio(p)
    );
    const karigarIdx = parts.findIndex(p => 
      matchesHeaderAlias(p, karigarAliases)
    );
    
    if (designIdx !== -1 && karigarIdx !== -1) {
      headerIndex = i;
      designColIndex = designIdx;
      nameColIndex = nameIdx;
      karigarColIndex = karigarIdx;
      break;
    }
  }
  
  // If no header found, assume first 3 columns: design, name, karigar
  if (headerIndex === -1) {
    headerIndex = 0;
    designColIndex = 0;
    nameColIndex = 1;
    karigarColIndex = 2;
  }
  
  // Parse data rows
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(/[\t|,;]+/).map(p => p.trim());
    
    if (parts.length < 2) continue;
    
    const design = normalizeCellValue(parts[designColIndex]);
    const genericNameRaw = nameColIndex !== -1 && parts[nameColIndex] ? normalizeCellValue(parts[nameColIndex]) : undefined;
    const genericName = genericNameRaw && !looksLikeNumericRatio(genericNameRaw) ? genericNameRaw : undefined;
    const karigar = normalizeCellValue(parts[karigarColIndex]);
    
    if (!design || !karigar) continue;
    if (normalizeHeader(design).includes('design') || normalizeHeader(karigar).includes('karigar')) continue;
    
    const designNormalized = normalizeDesignCode(design);
    if (!designNormalized) continue;
    
    entries.set(designNormalized, {
      design,
      designNormalized,
      karigar,
      genericName,
    });
  }
  
  return entries;
}
