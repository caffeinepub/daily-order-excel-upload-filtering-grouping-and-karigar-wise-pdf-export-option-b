# Specification

## Summary
**Goal:** Fix karigar mapping so the app parses mapping tables from any worksheet and reliably matches/enriches orders using consistent design-code normalization.

**Planned changes:**
- Update mapping workbook parsing to scan all sheets for a valid mapping table (Design + KARIGAR, optional NAME), while still applying sheet priority order: "1" → "3" → "2" → remaining sheets in a deterministic order.
- Update Order List enrichment to use mappings from any parsed sheet (not only "1"/"3"/"2"), preserving priority behavior but falling back to other sheets when needed.
- Ensure both mapping ingestion and order enrichment use the same shared `normalizeDesignCode` logic, and add/keep UI diagnostics that show sample normalized mapping keys and order keys when 0 matches occur.

**User-visible outcome:** Users can upload mapping workbooks where the mapping table is on any sheet name (including when sheets "1"/"2"/"3" exist), and orders will correctly enrich with Generic Name/Karigar based on normalized design-code matching, with clearer debug info when no matches are found.
