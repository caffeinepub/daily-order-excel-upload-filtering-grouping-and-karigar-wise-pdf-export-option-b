export interface KarigarMapping {
  [design: string]: string; // design -> karigar name
}

/**
 * Parse karigar mapping workbook with sheets "1", "2", "3"
 * Each sheet should have design names and corresponding karigar names
 */
export async function parseKarigarMapping(file: File): Promise<KarigarMapping> {
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

        const mapping: KarigarMapping = {};
        const sheetsToRead = ['1', '2', '3'];

        // Process each sheet
        for (const sheetName of sheetsToRead) {
          if (!workbook.SheetNames.includes(sheetName)) {
            continue; // Skip if sheet doesn't exist
          }

          const worksheet = workbook.Sheets[sheetName];
          const data = window.XLSX.utils.sheet_to_json<any[]>(worksheet, { 
            header: 1, 
            raw: false, 
            defval: '',
            blankrows: false 
          });

          // Process rows - assume first row might be headers, but also process it
          // Look for design and karigar columns
          for (let i = 0; i < data.length; i++) {
            const row = data[i] as any[];
            if (!row || row.length < 2) continue;

            // Try to find design and karigar in the row
            // Common patterns: [Design, Karigar], [design name, karigar name]
            // We'll take first two non-empty columns as design and karigar
            const values = row.map(cell => String(cell || '').trim()).filter(v => v);
            
            if (values.length >= 2) {
              const design = values[0];
              const karigar = values[1];
              
              // Skip header-like rows
              if (design.toLowerCase() === 'design' || karigar.toLowerCase() === 'karigar') {
                continue;
              }
              
              if (design && karigar) {
                mapping[design] = karigar;
              }
            }
          }
        }

        if (Object.keys(mapping).length === 0) {
          reject(new Error('No valid design-karigar mappings found in sheets "1", "2", or "3". Please ensure the file contains design names and karigar names.'));
          return;
        }

        resolve(mapping);
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
