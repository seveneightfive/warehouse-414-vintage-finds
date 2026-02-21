

# Refactor Catalog: Cursor-Based Pagination + Infinite Scroll

## Important Note on SSR

This project is a **Vite + React single-page application** -- it has no server-side rendering capability. True SSR and HTML pagination fallbacks (`/catalog?page=2`) would require migrating to a framework like Next.js, which is outside Lovable's scope. This plan implements everything that **is** feasible within the current stack, which covers the vast majority of the performance and scalability goals.

## What We'll Build

### 1. Cursor-Based Infinite Query Hook (`src/hooks/use-products.ts`)

Replace the current `useProducts` with a new `useInfiniteProducts` hook using TanStack React Query's `useInfiniteQuery`:

- **Page size**: 50 products per fetch
- **Cursor**: composite `(created_at, id)` -- the last item's values become the cursor for the next page
- **Supabase query**: `created_at` DESC + `id` DESC ordering, with `.lt('created_at', cursor.created_at).or(and(created_at.eq.${cursor.created_at},id.lt.${cursor.id}))` for cursor filtering
- **No OFFSET** -- pure cursor-based pagination
- **`getNextPageParam`**: returns `undefined` when fewer than 50 results come back (signals end of data)
- Keeps all existing filter support (designer, maker, category, style, period, country, search)
- The old `useProducts` hook is kept for other usages (admin, etc.) but the catalog switches to the new hook

### 2. Infinite Scroll with IntersectionObserver (`src/hooks/use-infinite-scroll.ts`)

Create a small custom hook:

- Accepts a ref to a sentinel element + `fetchNextPage` / `hasNextPage` / `isFetchingNextPage` from useInfiniteQuery
- Uses `IntersectionObserver` with `rootMargin: "300px"` to preload before the user reaches the bottom
- Disconnects observer when `hasNextPage` is false
- Prevents duplicate requests by checking `isFetchingNextPage`

### 3. Updated Catalog Page (`src/pages/Catalog.tsx`)

- Switch from `useProducts` to `useInfiniteProducts`
- Flatten pages: `data.pages.flatMap(page => page)` to get the full product list
- Add a sentinel `<div ref={sentinelRef} />` after the product grid
- Show skeleton loaders for both initial load and subsequent page fetches
- Handle edge cases: empty catalog, API errors, end of results
- Filter changes reset the infinite query (new cursor)

### 4. Image Optimization (`src/components/ProductCard.tsx`)

- Add `decoding="async"` to all product images
- Add explicit `width={400} height={400}` attributes (aspect-square cards)
- `loading="lazy"` is already present -- keep it
- Note: `srcset`/`sizes` and WebP/AVIF depend on image hosting capabilities (Supabase storage serves original formats). We'll add `sizes` attribute for responsive hints.

### 5. Loading & Error States

- Initial load: 12 skeleton cards (existing pattern)
- Fetching next page: 4 skeleton cards appended at the bottom
- Error state: retry button with error message
- End of results: subtle "You've seen all products" text

## Technical Details

### Files to Create
- `src/hooks/use-infinite-scroll.ts` -- IntersectionObserver hook (~25 lines)

### Files to Modify

**`src/hooks/use-products.ts`**
- Add new `useInfiniteProducts` function using `useInfiniteQuery`
- Accepts same filter params plus internally manages cursor
- Returns `{ data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError }`

**`src/pages/Catalog.tsx`**
- Import `useInfiniteProducts` instead of `useProducts`
- Flatten paginated data for rendering
- Add sentinel div with ref for infinite scroll
- Add bottom loading skeletons and end-of-list indicator
- Update "View Products" count in filter drawer (use total from first page or accumulated count)

**`src/components/ProductCard.tsx`**
- Add `decoding="async"`, `width={400}`, `height={400}`, and `sizes` attribute to `<img>`

### Cursor Logic (Supabase)

Since Supabase's PostgREST API doesn't support composite `WHERE (a, b) < (x, y)` directly, we'll use the `.or()` filter:

```ts
// For cursor { created_at, id }:
query = query.or(
  `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
);
```

This correctly handles products with identical `created_at` timestamps by using `id` as a tiebreaker.

### Performance Impact
- Initial load drops from "all products" to 50 -- major improvement
- Subsequent loads are 50 at a time, triggered by scroll proximity
- No OFFSET means consistent query performance regardless of page depth
- Images load lazily with proper dimensions to prevent layout shift

