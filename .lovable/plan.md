

## Fix Mobile Layout - Product Detail Image Gallery

### Problem
The hero image gallery on the product detail page extends beyond the phone screen width on mobile. The image and its container are not properly constrained within the CSS grid, causing horizontal overflow.

### Root Cause
CSS Grid children default to `min-width: auto`, which means they won't shrink below their content size. The gallery's `aspect-square` container calculates its width based on content rather than being constrained by the grid column. Adding `min-w-0` forces grid children to respect the column boundary.

### Changes

**File: `src/pages/ProductDetail.tsx`**

1. Add `min-w-0` to the gallery wrapper (line 76) so the grid child shrinks to fit:
   - Change: `<div className="max-w-full overflow-hidden">`
   - To: `<div className="w-full min-w-0 overflow-hidden">`

2. Add `min-w-0` to the "Basic Info" column (line 120) to prevent text overflow on mobile:
   - Change: `<div>`
   - To: `<div className="min-w-0">`

These two small additions ensure both grid columns respect the viewport boundary on mobile.
