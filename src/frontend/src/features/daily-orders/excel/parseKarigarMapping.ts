export interface KarigarMappingEntry {
  design: string;
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

          if (rows.length === 0) continue;

          // Find header row and column indices
          let headerRowIndex = -1;
          let designColIndex = -1;
          let karigarColIndex = -1;
          let nameColIndex = -1;

          // Search first few rows for headers
          for (let i = 0; i < Math.min(5, rows.length); i++) {
            const row = rows[i] as any[];
            if (!row) continue;

            const normalizedRow = row.map((cell) =>
              String(cell || '').trim().toLowerCase()
            );

            // Look for design/product code column
            const designIndex = normalizedRow.findIndex((cell) =>
              cell.includes('design') || cell.includes('product') || cell.includes('code')
            );

            // Look for karigar column
            const karigarIndex = normalizedRow.findIndex((cell) =>
              cell.includes('karigar') || cell.includes('artisan') || cell.includes('worker')
            );

            // Look for name column (generic product name)
            const nameIndex = normalizedRow.findIndex((cell) =>
              cell === 'name' || cell.includes('product name') || cell.includes('generic')
            );

            if (designIndex !== -1 && karigarIndex !== -1) {
              headerRowIndex = i;
              designColIndex = designIndex;
              karigarColIndex = karigarIndex;
              nameColIndex = nameIndex;
              break;
            }
          }

          // If no headers found, try positional (first two columns)
          if (headerRowIndex === -1) {
            headerRowIndex = 0;
            designColIndex = 0;
            karigarColIndex = 1;
            // Try to find Name column in first row
            const firstRow = rows[0] as any[];
            if (firstRow) {
              const normalizedRow = firstRow.map((cell) =>
                String(cell || '').trim().toLowerCase()
              );
              nameColIndex = normalizedRow.findIndex((cell) => cell === 'name');
            }
          }

          const sheetEntries = new Map<string, KarigarMappingEntry>();

          // Process data rows (skip header row)
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i] as any[];
            if (!row || row.length === 0) continue;

            const design = String(row[designColIndex] || '').trim();
            const karigar = String(row[karigarColIndex] || '').trim();
            const genericName = nameColIndex !== -1 ? String(row[nameColIndex] || '').trim() : undefined;

            // Skip empty or header-like rows
            if (!design || !karigar) continue;
            if (design.toLowerCase() === 'design' || karigar.toLowerCase() === 'karigar') continue;

            const entry: KarigarMappingEntry = {
              design,
              karigar,
              genericName: genericName || undefined,
            };

            sheetEntries.set(design, entry);
          }

          if (sheetEntries.size > 0) {
            result[sheetName] = { entries: sheetEntries };
          }
        }

        if (!foundAnySheet) {
          reject(new Error('No sheets named "1", "2", or "3" found in the workbook. Please ensure the file contains the required sheets.'));
          return;
        }

        const totalEntries = Object.values(result).reduce((sum, sheet) => sum + sheet.entries.size, 0);
        if (totalEntries === 0) {
          reject(new Error('No valid design-karigar mappings found in sheets "1", "2", or "3". Please ensure the sheets contain design/product code and karigar columns.'));
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
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].toLowerCase();
    const parts = line.split(/[\t|,;]+/).map(p => p.trim());
    
    const designIdx = parts.findIndex(p => 
      p.includes('design') || p.includes('product') || p.includes('code')
    );
    const nameIdx = parts.findIndex(p => 
      p === 'name' || p.includes('generic') || p.includes('product name')
    );
    const karigarIdx = parts.findIndex(p => 
      p.includes('karigar') || p.includes('artisan') || p.includes('worker')
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
    
    const design = parts[designColIndex] || '';
    const genericName = nameColIndex !== -1 && parts[nameColIndex] ? parts[nameColIndex] : undefined;
    const karigar = parts[karigarColIndex] || '';
    
    if (!design || !karigar) continue;
    if (design.toLowerCase().includes('design') || karigar.toLowerCase().includes('karigar')) continue;
    
    entries.set(design, {
      design,
      karigar,
      genericName,
    });
  }
  
  return entries;
}
