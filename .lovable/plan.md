

# Swap Header Logo

## Overview

Replace the current logo asset with the new one from the provided URL and remove the `invert` CSS class since this logo is already light-colored and will display correctly on the black header.

## Changes

### 1. Download new logo asset

Save the image from `https://aevfqaltuiumvnzusmkg.supabase.co/storage/v1/object/public/site-images/logo-545.jpg` as `src/assets/logo.jpg` (replacing the existing file).

### 2. Update `src/components/Navbar.tsx`

- Remove the `invert` class from the `<img>` tag on line 20 since this logo is already light/white and doesn't need color inversion
- The import path stays the same (`@/assets/logo.jpg`)

## Technical Details

- Single file modification: `Navbar.tsx` line 20 changes from `className="h-10 w-auto invert"` to `className="h-10 w-auto"`
- One asset replacement: `src/assets/logo.jpg`
- No new dependencies

