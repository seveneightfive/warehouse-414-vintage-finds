

# Two-Tone Header Banner with Split Logo

## Overview

Redesign the header as a two-row horizontal banner: a black top row containing the top logo mark and the navigation menu, and a white bottom row containing the bottom logo text. The logo parts are centered/aligned so they stack naturally as one visual unit.

## Visual Layout

```text
+========================================================+
| BLACK BAR:  [top-logo-mark]     catalog  about  contact |
+========================================================+
| WHITE BAR:          [bottom-logo-text]                  |
+========================================================+
```

## Changes

### 1. Download two new logo assets

- Save `logo-top-CdpEE7hC.png` as `src/assets/logo-top.png`
- Save `Warehouse-logo-bottom.png` as `src/assets/logo-bottom.png`

### 2. Rewrite `src/components/Navbar.tsx`

**Black top row:**
- Full-width black background (`bg-black`)
- Left side: top logo image (linked to `/`), sized appropriately (~h-10)
- Right side: nav links in Kabel font (`font-display` class which applies the Kabel font + lowercase)
- Nav link styling: `text-white/60` default, `text-primary` when active, using `font-display` class with `tracking-[0.15em]`
- Mobile hamburger menu on the right

**White bottom row:**
- Full-width white background (`bg-white`)
- Center-aligned bottom logo image, sized to visually align with the top logo (~h-8)
- Linked to `/` as well

**Mobile nav dropdown:**
- Opens below both rows, dark background
- Links use `font-display` class (Kabel, lowercase)

### 3. Update `src/components/Layout.tsx`

- Increase `pt-16` to account for the taller two-row header (approximately `pt-24` or `pt-28` depending on final heights)

### 4. Update `src/pages/Catalog.tsx` sticky bar

- Adjust `top-16` to match the new header height so the sticky toolbar sits just below the header

## Technical Details

- Two new image assets downloaded from the provided Supabase URLs
- The `font-display` class (already defined in `src/index.css`) applies Kabel font and lowercase text -- used on all nav links
- The header remains `fixed top-0` with `z-50`
- No new dependencies required

