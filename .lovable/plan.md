

## Update Mobile Side Padding to 20px

All sections in the Product Detail page currently use Tailwind's `px-4` (16px). This will be changed to `px-5` (20px) on mobile, keeping the existing desktop padding via the container.

### Changes

**File: `src/pages/ProductDetail.tsx`**

Replace `px-4` with `px-5` on all section containers (lines 39, 52, 70, 140, 153, 166, 191, 203). This applies 20px padding on both sides across:

- Loading skeleton
- "Not found" state
- Hero section (gallery + info)
- "About This Piece" section
- Image row section
- Product details/specs section
- Similar products section
- Sticky action bar

A simple find-and-replace of `px-4` to `px-5` across the file covers all cases consistently.

