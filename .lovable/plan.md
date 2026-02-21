

# Show Sold Products in Catalog

## Change
Update the default status filter in `src/hooks/use-products.ts` to include `sold` products.

## Technical Details

### File: `src/hooks/use-products.ts`
- Line 37: Change `.in('status', ['available', 'on_hold'])` to `.in('status', ['available', 'on_hold', 'sold'])`

This ensures sold products appear in the catalog grid with their existing black "sold" badge overlay. No other files need changes -- the badge rendering logic in `ProductCard.tsx` is already in place.

