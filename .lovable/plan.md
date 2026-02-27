

## Fix: Admin Panel Not Loading

### Root Cause Analysis

After reviewing the code and console logs, I identified two issues:

1. **AdminInbox query references wrong column**: Line 22 of `AdminInbox.tsx` selects `product:products(title)` but the products table uses `name`, not `title`. This causes a Supabase error when the component renders (holds, offers, inquiries pages). While this doesn't directly affect the `/admin` dashboard route, it could cause issues during component initialization.

2. **Missing error handling in AdminDashboard**: The dashboard queries (`product_holds`, `offers`, `purchase_inquiries`) have no error handling. If any query fails (e.g., due to RLS policies or missing tables), the component silently fails and may show a blank page.

3. **React Router ref warning**: The console shows "Function components cannot be given refs" for `AdminLayout`. This is a known React Router v6 issue but is only a warning -- not a crash.

### Fixes

**File: `src/pages/admin/AdminInbox.tsx` (line 22)**
- Change `product:products(title)` to `product:products(name)` to match the actual column name
- Update line 70 to display `item.product.name` instead of `item.product.title`

**File: `src/pages/admin/AdminDashboard.tsx`**
- Add try/catch error handling around the stats queries
- Add an error state display so failures are visible instead of showing a blank page

**File: `src/pages/admin/AdminLayout.tsx`**
- No changes needed -- the ref warning is cosmetic and does not prevent rendering

### Summary

| File | Change |
|------|--------|
| `src/pages/admin/AdminInbox.tsx` | Fix `products(title)` to `products(name)`, add error handling |
| `src/pages/admin/AdminDashboard.tsx` | Add try/catch and error state for robustness |

