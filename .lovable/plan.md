

## Make Designer Bio Field a Large Textarea

The `AdminCrudList` component currently renders all columns as single-line `<Input>` fields. To make the "Bio" field a large text box, I'll add an optional `type` property to the column config.

### Changes

**`src/pages/admin/AdminCrudList.tsx`**
- Update the column type to support an optional `type: 'textarea'` property
- In the form rendering loop (lines 119-128), check if `col.type === 'textarea'` and render a `<Textarea rows={8}>` instead of `<Input>`
- Import `Textarea` from `@/components/ui/textarea`
- Make textarea fields not required (bio is optional)

**`src/App.tsx`**
- Update the designers route to mark the `bio` column as `type: 'textarea'`:
  ```
  columns={[{ key: 'name', label: 'Name' }, { key: 'bio', label: 'Bio', type: 'textarea' }]}
  ```

This approach keeps the component generic so any future CRUD list can also use textarea fields.
