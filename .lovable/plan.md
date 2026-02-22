

## Fix Mobile Layout Overflow on Product Detail Page

### Problem
On mobile, the product detail page has two overflow issues:
1. The hero image gallery extends beyond the right edge of the screen
2. Text content may also overflow past the screen width

### Root Cause
The outer page wrapper (`div.pb-24`) lacks `overflow-x-hidden`, allowing child elements to extend beyond the viewport. Additionally, the horizontal image row has `min-w-[200px]` items that can push content wider than the screen.

### Changes

**File: `src/pages/ProductDetail.tsx`**

1. Add `overflow-x-hidden` to the root wrapper div (line 71) to prevent any content from spilling past the screen edge:
   - Change `<div className="pb-24">` to `<div className="pb-24 overflow-x-hidden">`

2. Ensure the gallery container properly constrains on mobile by adding `max-w-full` to the gallery wrapper div (line 76):
   - Change `<div>` to `<div className="max-w-full overflow-hidden">`

3. Fix the horizontal image row items (line 161) to use a smaller `min-w` on mobile:
   - Change `min-w-[200px]` to `min-w-[150px] md:min-w-[200px]`

These three small changes will ensure the entire page stays within the viewport width on mobile devices.

