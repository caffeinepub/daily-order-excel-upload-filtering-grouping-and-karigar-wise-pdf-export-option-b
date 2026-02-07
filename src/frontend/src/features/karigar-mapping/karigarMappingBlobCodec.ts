import { ExternalBlob } from '@/backend';
import { normalizeDesignCode } from '@/utils/textNormalize';

/**
 * Persisted format for karigar mapping data
 */
export interface KarigarMappingData {
  [sheetName: string]: {
    entries: Array<{
      design: string;
      designNormalized: string;
      karigar: string;
      genericName: string; // Now required
    }>;
  };
}

/**
 * Encode mapping data to ExternalBlob for backend storage
 */
export function encodeMappingToBlob(data: KarigarMappingData): ExternalBlob {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(jsonString);
  return ExternalBlob.fromBytes(bytes);
}

/**
 * Decode mapping data from ExternalBlob
 * Always recomputes normalized keys using current normalization rules
 */
export async function decodeMappingFromBlob(blob: ExternalBlob): Promise<KarigarMappingData> {
  const bytes = await blob.getBytes();
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(bytes);
  const rawData = JSON.parse(jsonString) as KarigarMappingData;

  // Recompute normalized keys for backward compatibility
  const recomputedData: KarigarMappingData = {};
  for (const [sheetName, sheet] of Object.entries(rawData)) {
    recomputedData[sheetName] = {
      entries: sheet.entries.map(entry => ({
        design: entry.design,
        designNormalized: normalizeDesignCode(entry.design), // Always recompute
        karigar: entry.karigar,
        genericName: entry.genericName || '', // Ensure genericName is always present
      })),
    };
  }

  return recomputedData;
}

/**
 * Alias for backward compatibility
 */
export const decodeBlobToMapping = decodeMappingFromBlob;
