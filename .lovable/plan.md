

# Rebuild the About Page

Replicate the About page from the reference warehouse414 project, adapting it to this project's dark color scheme.

## What Changes

The current About page is a simple text block. The new version will be a rich, multi-section page with:

1. **Full-bleed hero** -- full-screen image with parallax scroll, overlaid white card containing the "warehouse four fourteen" heading and intro copy, plus a "View Collection" link
2. **"Our Story" section** -- two-column layout (text + image) on a secondary background
3. **Ken Burns reveal image** -- full-width image that slowly zooms on hover
4. **"Our Process" section** -- three-column grid (Sourcing, Documentation, Delivery) with stripe-pattern icons
5. **"Buying & Selling" parallax section** -- full-width background image with parallax, overlay text, and "Send Email" CTA linking to /contact

## New Files to Create

- **`src/hooks/useParallax.ts`** -- custom hook that tracks scroll position and returns a ref + transform style for parallax movement
- **`src/hooks/useScrollReveal.ts`** -- custom hook using IntersectionObserver to trigger fade-in animations when elements enter the viewport
- **`src/components/RevealSection.tsx`** -- wrapper component that applies the scroll-reveal animation with configurable delay

## Files to Modify

- **`src/pages/About.tsx`** -- completely rewritten with the five sections described above
- **`src/index.css`** -- add the `.stripe-pattern` CSS class (repeating horizontal lines) and stripe CSS variables

## Assets

The three About page images (`about-hero.jpg`, `about-ways-to-shop.jpg`, `about-buying.jpg`) and `hero-bg.jpg` will be copied from the reference project into `src/assets/`.

## Technical Details

- The parallax hook uses `requestAnimationFrame` for smooth scroll-based transforms with `scale(1.2)` to prevent gaps
- The scroll reveal hook uses `IntersectionObserver` with a configurable threshold; once visible, the element stays visible (one-shot)
- RevealSection applies `opacity-0 translate-y-12` transitioning to `opacity-100 translate-y-0` over 1 second with optional delay
- The stripe-pattern uses `repeating-linear-gradient` with 4px black/white bands -- colors will be adapted to use the current project's foreground/background CSS variables
- The hero overlay card uses `bg-white/95 backdrop-blur-sm` which will be adapted to fit the dark theme (e.g., `bg-card/95`)
- No new dependencies required

