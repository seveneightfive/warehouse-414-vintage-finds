

# Center-Align Split Logo in Header

## Overview

Restructure the header so the top "Warehouse" logo and bottom "414" logo are always vertically centered/aligned as one visual unit, while keeping the nav links in the black bar.

## Current Problem

The top logo is left-aligned (flex `justify-between` pushes it left, nav right), while the bottom logo is center-aligned. They don't stack as one cohesive logo.

## Solution

Use a three-column layout in the black top row so the logo sits in the center column, with an empty left spacer and the nav on the right. The bottom row already centers its logo, so both will align.

```text
+========================================================+
| BLACK:  [spacer]    [WAREHOUSE logo]    catalog about   |
+========================================================+
| WHITE:              [414 logo]                          |
+========================================================+
```

## Changes

### 1. Update `src/components/Navbar.tsx`

**Black top row** -- change the inner container from `flex justify-between` to a 3-column grid:
- Left column: empty spacer (matches nav width for balance) on desktop; logo on mobile (keep mobile as-is with flex)
- Center column: top logo image, centered
- Right column: nav links on desktop, hamburger on mobile

**Desktop approach**: Use `grid grid-cols-3` with the logo in the center cell (`justify-self-center`) and nav in the right cell (`justify-self-end`). The left cell is an empty div that balances the layout.

**Mobile approach**: Keep the current flex layout (logo left, hamburger right) since the three-column centering matters less on small screens.

**Bottom row**: No changes needed -- already centered.

## Technical Details

- Only `src/components/Navbar.tsx` is modified
- Desktop: `hidden md:grid md:grid-cols-3 items-center h-14 px-4` with logo in center cell
- Mobile: `flex md:hidden items-center justify-between h-14 px-4` keeping current behavior
- No new dependencies or files

