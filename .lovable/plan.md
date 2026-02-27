

## Add Search to Admin List Pages

Add a client-side search/filter input to the top of the Makers, Designers, Styles, and Products admin pages.

### Changes

**1. `src/pages/admin/AdminCrudList.tsx`** (covers Makers, Designers, Styles)
- Add a `searchQuery` state variable
- Add a search `<Input>` with a Search icon between the header row and the table
- Filter `items` client-side: match `searchQuery` against all column values (case-insensitive)
- This automatically covers Makers, Designers, and Styles since they all use this component

**2. `src/pages/admin/AdminProducts.tsx`**
- Add a `searchQuery` state variable
- Add a search `<Input>` with a Search icon between the header row and the table
- Filter `products` client-side by matching against `name`, `designer.name`, `category.name`, and `status` (case-insensitive)

### UI
Both pages will have a simple search bar below the title/action row:

```text
+------------------------------------------+
| [Title]                      [Add Button] |
| [Search icon] Search...                   |
+------------------------------------------+
| Table rows (filtered)                     |
```

The search input will use the existing `Input` component with a `Search` icon from lucide-react, styled consistently with the admin panel.
