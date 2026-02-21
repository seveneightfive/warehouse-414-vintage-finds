

# Make All Pages Mobile-Friendly

## Problem

The site has horizontal scrolling on mobile due to two root causes:
1. **Leftover Vite template CSS** in `App.css` -- the `#root` rule adds `padding: 2rem` and `max-width: 1280px`, pushing content beyond the viewport
2. **No overflow protection** on the root/body elements

The page layouts themselves are mostly already responsive (using `md:grid-cols-2`, `container mx-auto px-4`, etc.), so the fix is primarily about removing conflicting styles and adding overflow guards.

## Changes

### 1. Clean up `src/App.css`
Remove or neutralize the `#root` styles that conflict with the full-width layout:
- Remove `max-width: 1280px`, `padding: 2rem`, `margin: 0 auto`, and `text-align: center` from the `#root` rule
- The remaining styles (`.logo`, `.card`, `.read-the-docs`, keyframes) are unused Vite boilerplate and can also be removed, leaving the file essentially empty or deletable

### 2. Add overflow protection in `src/index.css`
Add `overflow-x: hidden` to the `html` and `body` elements to prevent any edge-case horizontal scroll caused by full-bleed sections (parallax images, hero sections, etc.):
```css
html, body {
  overflow-x: hidden;
}
```

### 3. Minor mobile refinements in `src/pages/ProductDetail.tsx`
- Reduce padding on mobile: change `py-12` to `py-6 md:py-12` and `gap-12` to `gap-6 md:gap-12`
- Make the product title smaller on mobile: `text-2xl md:text-3xl`
- Reduce price size on mobile: `text-xl md:text-2xl`

### 4. Catalog toolbar mobile fix (`src/pages/Catalog.tsx`)
- The sticky toolbar search bar has `max-w-md` which is fine, but the flex container could overflow on very small screens. Add `min-w-0` to the search container to allow it to shrink properly.

### 5. About page -- no changes needed
Already uses responsive classes (`md:grid-cols-2`, `md:text-5xl`, etc.)

### 6. Contact page -- no changes needed
Already uses `max-w-xl` with `px-4`, works well on mobile

### 7. Footer -- no changes needed
Already responsive with `grid-cols-1 md:grid-cols-3`

## Summary of Files Modified
- `src/App.css` -- gut the conflicting `#root` styles
- `src/index.css` -- add `overflow-x: hidden` guard
- `src/pages/ProductDetail.tsx` -- tighten spacing on mobile
- `src/pages/Catalog.tsx` -- minor flex shrink fix

