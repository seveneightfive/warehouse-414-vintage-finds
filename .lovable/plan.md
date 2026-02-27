

## Fix: Missing `offers` Table Causing Dashboard Failure

### Root Cause

The `offers` table does not exist in the database. All customer actions (questions, offers, purchases) are stored in the `purchase_inquiries` table with an `inquiry_type` column to distinguish them. Only `product_holds` is a separate table. However, the admin dashboard and inbox code incorrectly reference a non-existent `offers` table.

### Changes

**1. `src/pages/admin/AdminDashboard.tsx`**
- Replace the query on `offers` table with a query on `purchase_inquiries` filtered by `inquiry_type = 'offer'`
- The "Pending Offers" card will count offers from `purchase_inquiries` where `inquiry_type = 'offer'` and `status = 'pending'`
- The "Pending Inquiries" card will count non-offer entries from `purchase_inquiries` where `inquiry_type != 'offer'` and `status = 'pending'`

**2. `src/App.tsx`**
- Change the offers admin route from `tableName="offers"` to `tableName="purchase_inquiries"` with appropriate filtering

**3. `src/pages/admin/AdminInbox.tsx`**
- Add support for an optional `filter` prop so the Offers page can filter `purchase_inquiries` by `inquiry_type = 'offer'` and the Inquiries page can exclude offers
- The `showAmount` prop will read `offer_amount` from `purchase_inquiries` instead of `amount` from a non-existent `offers` table

**4. `src/components/InquiryDialog.tsx`**
- Update the config for `offer` to use `purchase_inquiries` table instead of `offers` (though this component may not be actively used since ProductActions handles submissions directly)

### Summary

| File | Change |
|------|--------|
| `AdminDashboard.tsx` | Query `purchase_inquiries` with `inquiry_type` filter instead of `offers` table |
| `App.tsx` | Update offers route to use `purchase_inquiries` table |
| `AdminInbox.tsx` | Add `inquiry_type` filter support; read `offer_amount` instead of `amount` |
| `InquiryDialog.tsx` | Fix table name from `offers` to `purchase_inquiries` |

### RLS Policy

After the code fix, you only need to add policies for tables that actually exist:

```sql
CREATE POLICY "Authenticated users can read product_holds"
ON public.product_holds FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read purchase_inquiries"
ON public.purchase_inquiries FOR SELECT TO authenticated USING (true);
```
