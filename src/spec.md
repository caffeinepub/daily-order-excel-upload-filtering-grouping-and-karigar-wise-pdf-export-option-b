# Specification

## Summary
**Goal:** Correct karigar mapping parsing and make it a persisted standard dataset, while updating the UI to a 3-tab landing layout and enhancing Order List browsing (factory swipe view, karigar grouping, downloads, and generic names).

**Planned changes:**
- Fix karigar mapping Excel parsing to read the correct columns via header-based detection, prioritize sheets "1" and "3", and treat the "Name" column as the generic product name for each design/product code.
- Add backend storage and APIs for a standard (non-daily) karigar mapping dataset, including full replacement on upload and fetch of the currently saved mapping (anonymous access; empty result when none exists).
- Refactor the app entry UI into a landing header titled "Shree I Jewellery Order Management System" with three tabs: "Order List", "Daily Order Upload", and "Karigar Mapping".
- Update the "Order List" tab to show one factory at a time with swipe navigation between factories, group orders by karigar, and add a per-karigar download action above each karigar group while keeping existing per-factory export.
- Sort displayed orders to group identical design/product codes together and show the generic product name alongside the design/product code when available from the stored mapping.
- Update the "Karigar Mapping" tab to allow uploading a mapping workbook independently of daily uploads, show English success/error states, persist the mapping to the backend, and make it immediately available to Order List and mapping-apply workflows.

**User-visible outcome:** Users can upload and maintain a standard karigar mapping (with generic product names) that applies across all dates, navigate the app via three tabs, swipe between factories in the Order List, view orders grouped by karigar and design code with generic names, and download orders per karigar or per factory with English UI messaging.
