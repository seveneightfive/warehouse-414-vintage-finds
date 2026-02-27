

## Admin Product Form Improvements

Four changes to `src/pages/admin/AdminProductForm.tsx`:

### 1. Product Dimensions and Box Dimensions -- Change to Textarea (4 rows)
Currently these are `<Input>` fields. Change both to `<Textarea rows={4}>` so they are 4 lines tall.

### 2. Long Description -- Increase rows
Change `rows={4}` to `rows={7}` for a couple more lines of space.

### 3. Attribution helper text
Add a descriptive paragraph below the "Attribution" heading:
> Type in attribution that precedes the maker/designer/period. Examples: by, in the style of, attributed to

### 4. Searchable Combobox for Designer and Maker
Replace the standard `<Select>` dropdowns for Designer and Maker with a searchable combobox using the existing `cmdk` + `Popover` components (already installed). This will create a new `ComboboxField` component inline in the form file that:
- Opens a popover with a search input
- Filters the options list as you type
- Shows a "None" option to clear the selection
- Displays the selected name on the trigger button

### Technical Details

**File: `src/pages/admin/AdminProductForm.tsx`**

- Import `Popover`, `PopoverTrigger`, `PopoverContent` from `@/components/ui/popover`
- Import `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem` from `@/components/ui/command`
- Import `Check`, `ChevronsUpDown` from `lucide-react`
- Add a `ComboboxField` component that wraps `FormField` with a Popover+Command combobox pattern
- Replace `<SelectField>` usage for `designer_id` and `maker_id` with `<ComboboxField>`
- Change `product_dimensions` and `box_dimensions` from `<Input>` to `<Textarea rows={4}>`
- Change `long_description` from `rows={4}` to `rows={7}`
- Add helper text `<p>` after the Attribution `<h2>`
