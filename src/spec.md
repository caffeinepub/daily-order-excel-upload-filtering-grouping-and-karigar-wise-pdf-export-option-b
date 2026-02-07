# Specification

## Summary
**Goal:** Make the mapping upload a fixed “Master Design File” format (Design Code + Generic Name + Karigar Name) and add Karigar-based filtering on the Order List.

**Planned changes:**
- Update Mapping upload UI copy to remove flexible/optional rules and clearly require exactly these columns in the uploaded Master Design File: Design Code, Generic Name, Karigar Name (allow any sheet name).
- Update mapping validation/parsing so uploads missing any required column show a clear error listing missing column(s), and successful uploads store mapping rows with design, genericName, and karigar, continuing to work with `useKarigarMappingLookup()`.
- Ensure Order List enrichment matches orders to mappings via normalized design code, displaying Generic Name and Karigar Name when mapped.
- Add a Karigar filter control on the Order List page with “All” plus options for karigars present in enriched data and an “Unmapped” option (when applicable), filtering the visible orders/groups accordingly.

**User-visible outcome:** Users can upload a fixed-format Master Design File (Design Code, Generic Name, Karigar Name), see clear errors if columns are missing, and filter the Order List by karigar (or show all / unmapped).
