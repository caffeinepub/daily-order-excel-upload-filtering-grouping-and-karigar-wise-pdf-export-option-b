import { useQuery } from '@tanstack/react-query';
import { ExternalBlob } from '@/backend';
import { decodeBlobToMapping } from '../karigar-mapping/karigarMappingBlobCodec';
import { normalizeDesignCode } from '@/utils/textNormalize';

export interface MappingLookupResult {
  mappingLookup: Map<string, { karigar: string; genericName?: string }>;
  mappingEntryCount: number;
  decodeError: string | null;
  isDecoding: boolean;
}

/**
 * Hook to decode and build a lookup map from the karigar mapping blob.
 * Returns a reactive lookup that rebuilds whenever the mapping blob changes.
 * Always recomputes normalized keys from stored design values using current normalization rules.
 */
export function useKarigarMappingLookup(mappingBlob: ExternalBlob | null): MappingLookupResult {
  const query = useQuery({
    queryKey: ['decodedMappingLookup', mappingBlob?.getDirectURL()],
    queryFn: async () => {
      if (!mappingBlob) {
        return {
          lookup: new Map<string, { karigar: string; genericName?: string }>(),
          entryCount: 0,
        };
      }

      try {
        const mappingData = await decodeBlobToMapping(mappingBlob);
        const lookup = new Map<string, { karigar: string; genericName?: string }>();

        // Priority: sheets 1, 3, 2
        const sheetsToRead = ['1', '3', '2'];

        for (const sheetName of sheetsToRead) {
          const sheet = mappingData[sheetName];
          if (!sheet || !sheet.entries) continue;

          for (const entry of sheet.entries) {
            // Always recompute normalized key from the stored design field using current rules
            // This ensures older blobs work with updated normalization logic
            const normalizedKey = normalizeDesignCode(entry.design);

            if (!normalizedKey) continue;

            // Only add if not already present (priority order)
            if (!lookup.has(normalizedKey)) {
              lookup.set(normalizedKey, {
                karigar: entry.karigar,
                genericName: entry.genericName,
              });
            }
          }
        }

        return {
          lookup,
          entryCount: lookup.size,
        };
      } catch (error: any) {
        throw new Error(`Failed to decode mapping: ${error.message || 'Unknown error'}`);
      }
    },
    enabled: true,
    retry: false,
    staleTime: 0, // Always refetch when dependencies change
  });

  return {
    mappingLookup: query.data?.lookup || new Map(),
    mappingEntryCount: query.data?.entryCount || 0,
    decodeError: query.error ? String(query.error) : null,
    isDecoding: query.isLoading,
  };
}
