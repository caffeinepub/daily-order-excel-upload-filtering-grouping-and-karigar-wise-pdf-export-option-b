import { useQuery } from '@tanstack/react-query';
import { ExternalBlob } from '@/backend';
import { decodeBlobToMapping } from './karigarMappingBlobCodec';
import { getMappingSheetReadOrder } from './getMappingSheetReadOrder';

export interface MappingSummary {
  totalEntries: number;
  sheetNames: string[];
}

/**
 * Hook to decode a karigar mapping blob and compute a user-facing summary.
 * Returns total entries and sheet names used, with safe error handling.
 */
export function useKarigarMappingSummary(mappingBlob: ExternalBlob | null): {
  summary: MappingSummary | null;
  isLoading: boolean;
  error: string | null;
} {
  const query = useQuery({
    queryKey: ['mappingSummary', mappingBlob?.getDirectURL()],
    queryFn: async () => {
      if (!mappingBlob) {
        return null;
      }

      try {
        const mappingData = await decodeBlobToMapping(mappingBlob);
        
        // Get all sheet names in deterministic order
        const availableSheetNames = Object.keys(mappingData);
        const orderedSheetNames = getMappingSheetReadOrder(availableSheetNames);
        
        // Count total entries across all sheets
        let totalEntries = 0;
        for (const sheetName of orderedSheetNames) {
          const sheet = mappingData[sheetName];
          if (sheet && sheet.entries) {
            totalEntries += sheet.entries.length;
          }
        }

        return {
          totalEntries,
          sheetNames: orderedSheetNames,
        };
      } catch (error: any) {
        throw new Error(`Failed to decode mapping: ${error.message || 'Unknown error'}`);
      }
    },
    enabled: !!mappingBlob,
    retry: false,
  });

  return {
    summary: query.data || null,
    isLoading: query.isLoading,
    error: query.error ? String(query.error) : null,
  };
}
