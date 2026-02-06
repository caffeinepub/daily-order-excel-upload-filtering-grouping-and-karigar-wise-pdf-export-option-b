# Specification

## Summary
**Goal:** Make Daily Order Upload parsing reliably extract Order No, Design, Weight, Size, Quantity, and Remarks from common Excel/CSV OrderList files, and surface clear parse diagnostics to the user.

**Planned changes:**
- Improve Daily Order Upload parser header detection to handle extra title rows before the real header row.
- Normalize and match common header label variations (casing/punctuation, e.g., “Remark's”, “Qty.”, “Net Wt”) and handle unusual/hidden whitespace so required fields populate when present.
- Keep .csv upload compatibility and avoid regressions in Order No/Design extraction.
- Add user-visible parsing diagnostics in the Daily Order Upload UI: missing optional columns warnings and which row was detected as the header.
- Ensure the upload flow remains resilient: parsed rows always populate the table; parsing failures show a clear English error and allow retry; backend save failures show a separate English error while keeping parsed rows visible.

**User-visible outcome:** Uploading an OrderList .xlsx/.xls/.csv more consistently fills Weight/Size/Quantity/Remarks when present, and the page clearly shows parsing warnings (missing columns, detected header row) without crashing; parsed results remain visible even if saving fails.
