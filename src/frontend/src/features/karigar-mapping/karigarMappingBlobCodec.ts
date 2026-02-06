import { ExternalBlob } from '../../backend';

export interface KarigarMappingData {
  [sheetName: string]: {
    entries: Array<{
      design: string;
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
 */
export async function decodeBlobToMapping(blob: ExternalBlob): Promise<KarigarMappingData> {
  const bytes = await blob.getBytes();
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(bytes);
  return JSON.parse(jsonString);
}
