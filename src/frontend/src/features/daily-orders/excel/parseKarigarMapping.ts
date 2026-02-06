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
 * Parse karigar mapping workbook with sheets "1", "2", "3" (Excel) or extract from PDF
 * Uses header-based column detection to find design/product code, karigar, and optional Name columns
 * Sheets 1 and 3 take priority over sheet 2
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

        const result: ParsedKarigarMapping = {};
        const sheetsToRead = ['1', '3', '2']; // Priority order
        let foundAnySheet = false;
        const sheetErrors: string[] = [];

        for (const sheetName of sheetsToRead) {
          if (!workbook.SheetNames.includes(sheetName)) {
            continue;
          }

          foundAnySheet = true;
          const worksheet = workbook.Sheets[sheetName];
          const rows = window.XLSX.utils.sheet_to_json<any>(worksheet, {
            header: 1,
            raw: false,
            defval: '',
            blankrows: false,
          });

          if (rows.length === 0) {
            sheetErrors.push(`Sheet "${sheetName}" is empty`);
            continue;
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

          // If no headers found with confidence, reject this sheet
          if (headerRowIndex === -1 || designColIndex === -1 || karigarColIndex === -1) {
            const detectedHeaders = rows.length > 0 ? (rows[0] as any[]).slice(0, 5).map(c => String(c || '')).join(', ') : 'none';
            sheetErrors.push(
              `Could not find Design Code and Karigar columns in sheet "${sheetName}". ` +
              `Detected headers: ${detectedHeaders}. ` +
              `Please ensure the sheet has columns for design/product code and karigar/artisan.`
            );
            continue;
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

          if (sheetEntries.size > 0) {
            result[sheetName] = { entries: sheetEntries };
          } else {
            sheetErrors.push(`Sheet "${sheetName}" contains no valid design-karigar mappings after parsing`);
          }
        }

        if (!foundAnySheet) {
          reject(new Error('No sheets named "1", "2", or "3" found in the workbook. Please ensure the file contains the required sheets.'));
          return;
        }

        const totalEntries = Object.values(result).reduce((sum, sheet) => sum + sheet.entries.size, 0);
        if (totalEntries === 0) {
          const errorDetails = sheetErrors.length > 0 ? '\n\n' + sheetErrors.join('\n') : '';
          reject(new Error(
            `No valid design-karigar mappings found in sheets "1", "2", or "3". ` +
            `Please ensure the sheets contain design/product code and karigar columns with data.${errorDetails}`
          ));
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
