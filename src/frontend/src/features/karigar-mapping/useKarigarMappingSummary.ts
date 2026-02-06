import { useQuery } from '@tanstack/react-query';
import { ExternalBlob } from '@/backend';
import { decodeBlobToMapping } from './karigarMappingBlobCodec';

export interface MappingSummary {
  totalEntries: number;
  sheetNames: string[];
  error?: string;
}

/**
 * Hook to compute a user-facing summary of the karigar mapping blob
 * Returns total entries and sheet names used
 */
export function useKarigarMappingSummary(blob: ExternalBlob | null | undefined) {
  return useQuery<MappingSummary>({
    queryKey: ['karigarMappingSummary', blob?.getDirectURL()],
    queryFn: async (): Promise<MappingSummary> => {
      if (!blob) {
        return { totalEntries: 0, sheetNames: [] };
      }

      try {
        const mappingData = await decodeBlobToMapping(blob);
        
        const sheetNames = Object.keys(mappingData);
        const totalEntries = Object.values(mappingData).reduce(
          (sum, sheet) => sum + sheet.entries.length,
          0
        );

        return {
          totalEntries,
          sheetNames,
        };
      } catch (error: any) {
        return {
          totalEntries: 0,
          sheetNames: [],
          error: `Failed to read mapping: ${error.message}`,
        };
      }
    },
    enabled: !!blob,
    staleTime: Infinity, // Summary doesn't change unless blob changes
  });
}
