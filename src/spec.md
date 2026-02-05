# Specification

## Summary
**Goal:** Enable daily manual Excel upload of portal-exported orders, extract and manage only the required order fields, assign orders/designs to karigars (and optional factories), and export karigar-wise PDFs—while saving/reopening past dates without re-uploading.

**Planned changes:**
- Add a “Daily Orders” page with a date picker (default today) and an Excel (.xls/.xlsx) upload control with clear success/failure states and selected date/file name display.
- Parse the uploaded Excel and extract only: Order No, Design, Weight, Size, Quantity, Remarks; validate required columns and handle empty cells gracefully.
- Render an interactive table with sorting by Design and a text search/filter across extracted fields (at least Order No, Design, Remarks).
- Provide UI to assign a required Karigar and optional Factory to each order or Design for the selected date; show grouped views by karigar (and factory if used) and allow editing/removing assignments.
- Generate downloadable PDFs per karigar group for the selected date, with a header (date + karigar name) and a table of the 6 extracted fields; handle empty groups with disabled export or a clear “No orders” message.
- Implement backend storage and retrieval for daily orders and assignment data keyed by date, so users can reopen prior dates and re-export PDFs without re-uploading.
- Apply a consistent, distinct visual theme across upload, table, grouping, and export screens, including empty/loading/error states, with all UI text in English.

**User-visible outcome:** A user can pick a date, upload that day’s Excel, view only the required order details in a searchable/sortable table, assign orders/designs to karigars (optionally factories), browse orders grouped by karigar, export karigar-wise PDFs for that date, and later reopen past dates with saved data and re-export without re-uploading.
