

# Catalog: Filter Drawer + Sticky Toolbar

## Overview

Move the filter dropdowns into a slide-out Sheet (side drawer) triggered by a "Filter" button. Add a sticky toolbar at the top of the catalog page containing the search input, filter button, and a "back to catalog" link that stays visible while scrolling.

## Changes

### 1. Modify `src/pages/Catalog.tsx`

- **Sticky toolbar**: Wrap the search input, filter button, and active filter count in a `sticky top-16 z-40 bg-background` bar (top-16 accounts for the fixed navbar). Add a bottom border for visual separation.
- **Filter drawer**: Use the existing `Sheet` component (from `src/components/ui/sheet.tsx`) opening from the right side. Move all six Select dropdowns (Designer, Maker, Category, Style, Period, Country) into the Sheet body, stacked vertically with labels. Include a "Clear Filters" and "Close" button inside the drawer.
- **Filter badge**: Show an active filter count badge on the filter button when filters are applied.
- **Back to top**: The page title "Catalog" stays in the sticky bar as a clickable element that scrolls to the top, serving as the "back to catalog" anchor.

### Layout of sticky bar

```text
+-----------------------------------------------------------+
|  Catalog (title/anchor)   [Search input...]   [Filter (3)] |
+-----------------------------------------------------------+
```

### Drawer contents (right side sheet)

```text
+-----------------------------+
|  Filters              [X]   |
|-----------------------------|
|  Designer      [Select v]   |
|  Maker         [Select v]   |
|  Category      [Select v]   |
|  Style         [Select v]   |
|  Period        [Select v]   |
|  Country       [Select v]   |
|                              |
|  [Clear Filters]             |
+-----------------------------+
```

## Technical Details

- Import `Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger` from `@/components/ui/sheet`
- Import `SlidersHorizontal` icon from lucide-react for the filter button
- Add `useState<boolean>` for drawer open state
- The sticky bar uses `sticky top-16 z-40 bg-background border-b border-border py-4` -- `top-16` aligns it below the fixed 64px navbar
- Active filter count is computed from the existing `hasFilters` logic, counting non-empty filter values
- No new files or dependencies needed
- The product grid scrolls normally below the sticky bar

