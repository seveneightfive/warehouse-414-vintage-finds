

# Switch Site Background to White, Keep Header Black

## Overview

Flip the main site theme from dark to light (white background, dark text) while preserving the dark header/navbar.

## Changes

### 1. Update CSS Variables (`src/index.css`)

Swap the `:root` color variables to a light theme:

- `--background`: white/near-white (e.g., `0 0% 100%`)
- `--foreground`: dark/near-black (e.g., `220 15% 10%`)
- `--card`: light gray (e.g., `220 10% 96%`)
- `--card-foreground`: dark
- `--secondary`: light warm gray
- `--secondary-foreground`: dark text
- `--muted`: light gray
- `--muted-foreground`: medium gray for subdued text
- `--border` / `--input`: light gray borders
- Keep `--primary` (brass/gold) as-is since it works on both light and dark

### 2. Add Navbar-Specific Dark Styling (`src/components/Navbar.tsx`)

Replace `bg-background/90` with explicit dark colors so the header stays black regardless of the site theme:

- Header: `bg-[hsl(220,15%,8%)]/90` (the original dark background)
- Mobile nav dropdown: same dark background
- Text colors: use explicit light text (`text-white`, `text-white/60`) instead of theme tokens

### 3. Review Page Content for Contrast

Several pages use `text-foreground`, `text-muted-foreground`, `bg-secondary`, etc. which will automatically adapt via the CSS variable changes. A few spots may need attention:

- **About page hero overlay card**: currently `bg-card/95` -- will become light, which works well on the image
- **About page "Buying & Selling" section**: uses `text-foreground/80` over an image with `bg-background/50` overlay -- the overlay needs to stay dark so text remains readable. Will change to an explicit dark overlay (`bg-black/50`)
- **Index hero**: similar overlay treatment, keep dark
- **Footer**: should stay dark to match header -- add explicit dark background colors

### 4. Footer Dark Override (`src/components/Footer.tsx`)

Similar to the navbar, override the footer to use explicit dark colors so it remains black.

## Technical Details

- No new dependencies
- No structural changes to components
- Only CSS variable values and a few explicit color overrides in Navbar, Footer, and image overlay sections

