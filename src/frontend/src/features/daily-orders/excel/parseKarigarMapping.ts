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
 * Parse karigar mapping workbook with sheets "1", "2", "3"
 * Uses header-based column detection to find design/product code, karigar, and optional Name columns
 * Sheets 1 and 3 take priority over sheet 2
 */
export async function parseKarigarMapping(file: File): Promise<ParsedKarigarMapping> {
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
