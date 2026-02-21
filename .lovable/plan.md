

# Fix Collection Products Not Showing

## Problem
The query to `collection_products` orders by `sort_order`, but that column doesn't exist on the table. This causes a 400 error from Supabase, so no products load on the collection detail page.

## Fix

### File: `src/hooks/use-collections.ts`
Remove `.order('sort_order')` from the `useCollectionProducts` query. Replace with a default ordering (e.g., no explicit order, or order by `created_at` or `id`).

Also remove the `sort_order` field from the `CollectionProduct` type in `src/types/database.ts` since it doesn't exist in the actual table.

### Changes

1. **`src/hooks/use-collections.ts`** -- In `useCollectionProducts`, change `.order('sort_order')` to just remove the order clause (or use `.order('id')` as a fallback).

2. **`src/types/database.ts`** -- Remove `sort_order: number` from the `CollectionProduct` type to match the actual schema.

