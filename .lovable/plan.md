

## Add Bunny.net Image Upload to Admin Product Form

Upload product images from the admin form directly to Bunny.net Storage, then store the CDN URLs in the database.

### Setup

You'll need three values from your Bunny.net account:
- **Storage API Key** (found in Storage Zone > FTP & API Access > Password)
- **Storage Zone Name** (e.g., `warehouse414`)
- **CDN Hostname** (e.g., `warehouse414.b-cdn.net` — found in your Pull Zone or Storage Zone settings)

These will be stored as Supabase secrets and used by an edge function.

### Changes

**1. Supabase Edge Function: `upload-product-image`**
- Receives a file (multipart form data) + product ID + sort order
- Uploads the file to Bunny.net Storage via their REST API: `PUT https://{region}.storage.bunnycdn.com/{zone}/{path}`
- Returns the public CDN URL: `https://{cdn-hostname}/{path}`
- Path format: `products/{productId}/{timestamp}-{filename}`

**2. Supabase Edge Function: `delete-product-image`**
- Receives the storage path
- Deletes the file from Bunny.net Storage via `DELETE` API call

**3. `src/pages/admin/AdminProductForm.tsx` — Images section**
- Replace the read-only images grid with a managed section (visible for both new and existing products)
- Add a file input button ("Upload Images") that accepts multiple image files
- On file select: call the edge function, which uploads to Bunny.net and returns the CDN URL
- Insert a row into `product_images` table with the URL and sort order
- Auto-set `featured_image_url` on the product to the first image (lowest sort_order)
- Show a delete button (X) on each image thumbnail — removes from `product_images` table and Bunny.net storage
- For **new products**: save the product first, then redirect to edit mode so images can be attached
- Show a loading spinner on each image while uploading

**4. Migration for edge function config**
- Add `[functions.upload-product-image]` and `[functions.delete-product-image]` with `verify_jwt = false` (auth validated in code)

### Flow
```text
Admin clicks "Upload" → selects files
  → Edge function receives file
  → Uploads to Bunny.net Storage
  → Returns CDN URL
  → Inserts into product_images table
  → Updates featured_image_url if first image
  → Thumbnail appears in grid
```

