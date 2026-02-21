

# Add Collections Section to Home Page + Collection Detail Page

## Overview
Add a "Featured collections" section on the home page matching the screenshot layout (vertical title on the left, collection cards in a row), and create a `/collection/:slug` page showing the collection's products.

## What We'll Build

### 1. Types (`src/types/database.ts`)
Add `Collection` and `CollectionProduct` types:
- `Collection`: id, name, slug, description, cover_image (the `cover-image` column), created_at
- `CollectionProduct`: id, collection_id, product_id, sort_order

### 2. Data Hook (`src/hooks/use-collections.ts`)
- `useCollections()` -- fetch all collections from the `collections` table
- `useCollectionBySlug(slug)` -- fetch a single collection by slug
- `useCollectionProducts(collectionId)` -- fetch products via `collection_products` join table, including product relations (designer, images)

### 3. Home Page Collections Section (`src/components/FeaturedCollections.tsx`)
Layout matching the screenshot:
- Full-width light gray/off-white background
- Left side: "Featured collections" text rotated vertically (using CSS `writing-mode: vertical-rl` and `rotate-180`) with a vertical line below
- Right side: a row of collection cards (3 columns on desktop, scrollable or stacked on mobile)
- Each card shows the cover image (tall aspect ratio ~3:4) with the collection name in uppercase below, separated by a thin line
- Clicking a card navigates to `/collection/:slug`

### 4. Collection Detail Page (`src/pages/CollectionDetail.tsx`)
- Fetch collection by slug from URL params
- Display collection name as title (uppercase, tracked) and description below
- Grid of products from `collection_products`, each rendered using the existing `ProductCard` component linking to `/product/:id`

### 5. Routing (`src/App.tsx`)
- Add route `/collection/:slug` inside the public Layout group

## Technical Details

### Files to Create
- `src/hooks/use-collections.ts` -- 3 query hooks
- `src/components/FeaturedCollections.tsx` -- home page section component
- `src/pages/CollectionDetail.tsx` -- collection detail page

### Files to Modify
- `src/types/database.ts` -- add Collection and CollectionProduct types
- `src/pages/Index.tsx` -- import and render `<FeaturedCollections />` between hero and featured products
- `src/App.tsx` -- add `/collection/:slug` route

### Layout Details (from screenshot)
- The section has a light background (bg-muted or bg-secondary)
- "Featured collections" is displayed vertically on the left in a serif/display font
- A thin vertical line sits below the text
- Three collection cards sit to the right in equal columns
- Each card has a tall cover image, a bottom border, and the name in uppercase tracking-wide text below

### Supabase Queries
- Collections: `supabase.from('collections').select('*').order('name')`
- Collection by slug: `supabase.from('collections').select('*').eq('slug', slug).single()`
- Collection products: `supabase.from('collection_products').select('*, product:products(*, designer:designers(*), product_images(*))').eq('collection_id', id).order('sort_order')`

