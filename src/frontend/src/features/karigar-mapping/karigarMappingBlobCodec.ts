import { ExternalBlob } from '../../backend';
import { normalizeDesignCode } from '@/utils/textNormalize';

export interface KarigarMappingData {
  [sheetName: string]: {
    entries: Array<{
      design: string;
      designNormalized: string; // Canonical normalized key for lookup
      karigar: string;
      genericName?: string;
    }>;
  };
}

/**
 * Encode mapping data to ExternalBlob (JSON bytes)
 */
export function encodeMappingToBlob(data: KarigarMappingData): ExternalBlob {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(jsonString);
  return ExternalBlob.fromBytes(bytes);
}

/**
 * Decode ExternalBlob to mapping data
 * Backward-compatible: always recomputes designNormalized keys from design field using current normalization rules
 */
export async function decodeBlobToMapping(blob: ExternalBlob): Promise<KarigarMappingData> {
  try {
    const bytes = await blob.getBytes();
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(bytes);
    const data = JSON.parse(jsonString) as any;
    
    // Ensure backward compatibility: always recompute designNormalized from design field
    const result: KarigarMappingData = {};
    
    for (const [sheetName, sheet] of Object.entries(data)) {
      if (!sheet || typeof sheet !== 'object' || !Array.isArray((sheet as any).entries)) {
        continue;
      }
      
      const entries = (sheet as any).entries.map((entry: any) => {
        // Always recompute normalized key from design field using current rules
        // This ensures older blobs work with updated normalization logic
        const designNormalized = normalizeDesignCode(entry.design);
        
        return {
          design: entry.design || '',
          designNormalized,
          karigar: entry.karigar || '',
          genericName: entry.genericName || undefined,
        };
      });
      
      result[sheetName] = { entries };
    }
    
    return result;
  } catch (error: any) {
    throw new Error(`Failed to decode mapping blob: ${error.message}`);
  }
}
