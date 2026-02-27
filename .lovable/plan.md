

## Admin Product Management Dashboard

### Overview
Build a full product add/edit form page, enhance the existing admin with hold management, cross-listing URL fields, and sold-on-platform tracking. Most of the admin infrastructure (layout, sidebar, inbox views, CRUD lists) already exists -- the main gap is the product create/edit form and a database column for tracking which platform an item sold on.

### Database Change

**Add `sold_on` column to the `products` table** via migration:
- Column: `sold_on TEXT NULL` -- stores the platform name (e.g., "1stDibs", "Chairish", "eBay", "Direct", "Website")
- Update the `Product` type in `src/types/database.ts` to include `sold_on: string | null`

### New Page: Product Add/Edit Form

**File: `src/pages/admin/AdminProductForm.tsx`**

A comprehensive form for creating and editing products with these sections:

1. **Basic Info** -- Name, SKU, short description, long description, price, status dropdown (available / on_hold / sold / inventory)
2. **Taxonomy** -- Designer, maker, category, style, period, country (all as select dropdowns populated from their respective tables)
3. **Attribution** -- Designer attribution, maker attribution, period attribution text fields
4. **Dimensions & Condition** -- Product dimensions, box dimensions, dimension notes, materials, condition, year created
5. **Cross-Listing URLs** -- Quick fields for 1stDibs URL, Chairish URL, eBay URL (these columns already exist in the database)
6. **Sold Info** -- When status is set to "sold", show a "Sold On" dropdown with options: 1stDibs, Chairish, eBay, Website, Direct, Other
7. **Notes** -- Internal admin notes field
8. **Images** -- Display existing images (for edit mode); image upload will use Supabase storage

The form will:
- Load existing product data when editing (`/admin/products/:id`)
- Create a new product when at `/admin/products/new`
- Use `react-hook-form` with zod validation
- Pre-fetch all taxonomy options (designers, makers, categories, etc.) via parallel queries

### Route Updates

**File: `src/App.tsx`**

Add two new routes inside the admin layout:
- `<Route path="products/new" element={<AdminProductForm />} />`
- `<Route path="products/:id" element={<AdminProductForm />} />`

### Hold Management Enhancement

**File: `src/pages/admin/AdminInbox.tsx`**

When viewing Holds, the "Approve" action will also update the product's status to `on_hold`. Add a "Release Hold" button that sets both the hold status to `released` and the product status back to `available`.

### Changes Summary

| File | Change |
|------|--------|
| Migration | Add `sold_on` column to `products` |
| `src/types/database.ts` | Add `sold_on` field to Product type |
| `src/pages/admin/AdminProductForm.tsx` | New -- full product create/edit form |
| `src/App.tsx` | Add routes for product new/edit |
| `src/pages/admin/AdminInbox.tsx` | Enhance hold approve/release to update product status |

