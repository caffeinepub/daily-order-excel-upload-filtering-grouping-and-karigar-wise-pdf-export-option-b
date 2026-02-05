# Specification

## Summary
**Goal:** Let users upload both a cumulative OrderList workbook and a multi-sheet Design→Karigar mapping workbook for a selected date (default today) to automatically group/filter orders by karigar while preserving manual assignment controls.

**Planned changes:**
- Update the Daily Orders page UI to include two clearly labeled uploads: one for the OrderList file and one for the karigar mapping file (English text).
- Extend OrderList import to accept .xlsx/.xls (and still .csv), parse required columns (Order No, Design, Weight, Size, Quantity, Remarks), show a clear missing-columns error, and store the imported rows as the selected date’s orders (even if the file is cumulative).
- Add parsing for the mapping workbook (e.g., “mbar0502 copy”) by reading sheets named “1”, “2”, and “3” and combining them into a single Design → Karigar mapping.
- Implement an explicit “Apply mapping” workflow that applies the mapping to orders for the selected date, shows a results summary (matched/assigned counts + unmatched designs/orders), and provides an option to overwrite existing assignments vs only fill missing.
- Persist auto-assignments for the selected date using existing backend assignment storage so grouping remains after reload; ensure manual assignment remains available and can override auto-assigned results.

**User-visible outcome:** On Daily Orders, users can upload an OrderList Excel/CSV to load today’s (selected date’s) orders, upload a mapping workbook to auto-assign/group orders by karigar (with a clear apply/summary step), filter by karigar, and still manually adjust assignments.
