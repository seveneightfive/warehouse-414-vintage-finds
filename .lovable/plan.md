

## Persist "Hide Sold" Filter via URL Query Parameter

### Problem
The "Hide Sold" toggle uses local React state (`useState`), so it resets when navigating away and back. All other filters already use URL search params and persist correctly.

### Solution
Move `hideSold` from `useState` to a URL search parameter (`sold=hidden`), matching the pattern already used by every other filter on the page.

### Changes

**File: `src/pages/Catalog.tsx`**

1. Remove the `useState` for `hideSold` and instead derive it from search params:
   - Remove: `const [hideSold, setHideSold] = useState(false);`
   - Add: `const hideSold = searchParams.get('sold') === 'hidden';`

2. Update the toggle handler to use `setParam` instead of `setHideSold`:
   - Desktop button `onClick`: change from `() => setHideSold(!hideSold)` to `() => setParam('sold', hideSold ? '' : 'hidden')`
   - Mobile button `onClick`: same change

3. No other changes needed -- the existing `status: hideSold ? 'available' : undefined` query logic and `clearFilters` (which resets all params) already work correctly with this approach.

### Why this works
- Browser back button restores the previous URL including `?sold=hidden`, so the filter persists naturally
- `clearFilters` already calls `setSearchParams({})`, which will also clear this param
- Consistent with how every other filter on the page works

