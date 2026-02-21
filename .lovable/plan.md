
# Add Back Arrow to Product Detail Page

## What We're Doing
Adding a back arrow in the top-left corner of the navbar (opposite the menu links) that appears only on product detail pages, allowing users to navigate back to the catalog without losing their place.

## Approach
Modify the Navbar component to detect when the user is on a `/product/` route and show an `ArrowLeft` icon in the left column that navigates back to `/catalog`. This uses the existing 3-column grid on desktop (replacing the empty left spacer) and adds the arrow before the logo on mobile.

## Technical Details

### File: `src/components/Navbar.tsx`
- Import `ArrowLeft` from `lucide-react`
- Detect product detail pages via `location.pathname.startsWith('/product/')`
- **Desktop**: Replace the empty `<div />` left spacer with a `<Link to="/catalog">` containing the `ArrowLeft` icon (white, hover:opacity effect), using `justify-self-start`
- **Mobile**: Add the same back arrow link before the logo in the mobile flex layout
- Use `useNavigate` with `navigate(-1)` as an alternative -- but linking directly to `/catalog` is more reliable since the user may have arrived from elsewhere

### Behavior
- Arrow only visible on product detail pages (`/product/:id`)
- Clicking navigates to `/catalog`
- Styled white to match the black navbar bar, with hover opacity transition
