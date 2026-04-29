import SearchableSelect from "@/components/SearchableSelect";
import type { CategoryNode } from "@/hooks/use-products";

type Props = {
  tree: CategoryNode[] | undefined;
  categoryId: string;
  subcategoryId: string;
  subSubcategoryId: string;
  onChange: (next: {
    categoryId: string;
    subcategoryId: string;
    subSubcategoryId: string;
  }) => void;
};

/**
 * Cascading 3-level category filter.
 *
 * - Picking a Category resets Subcategory and Sub-subcategory.
 * - Picking a Subcategory resets Sub-subcategory.
 * - Subcategory only renders when a Category is chosen and has children.
 * - Sub-subcategory only renders when a Subcategory is chosen and has children.
 */
const CategoryFilter = ({
  tree,
  categoryId,
  subcategoryId,
  subSubcategoryId,
  onChange,
}: Props) => {
  const selectedCategory = tree?.find((c) => c.id === categoryId);
  const selectedSubcategory = selectedCategory?.children.find(
    (s) => s.id === subcategoryId,
  );

  const categoryOptions = tree?.map(({ id, name }) => ({ id, name }));
  const subcategoryOptions = selectedCategory?.children.map(({ id, name }) => ({
    id,
    name,
  }));
  const subSubcategoryOptions = selectedSubcategory?.children.map(({ id, name }) => ({
    id,
    name,
  }));

  return (
    <div className="space-y-4">
      <SearchableSelect
        label="Category"
        value={categoryId}
        options={categoryOptions}
        onChange={(v) =>
          onChange({
            categoryId: v,
            subcategoryId: "",
            subSubcategoryId: "",
          })
        }
      />

      {categoryId && subcategoryOptions && subcategoryOptions.length > 0 && (
        <SearchableSelect
          label="Subcategory"
          value={subcategoryId}
          options={subcategoryOptions}
          onChange={(v) =>
            onChange({
              categoryId,
              subcategoryId: v,
              subSubcategoryId: "",
            })
          }
        />
      )}

      {subcategoryId &&
        subSubcategoryOptions &&
        subSubcategoryOptions.length > 0 && (
          <SearchableSelect
            label="Type"
            value={subSubcategoryId}
            options={subSubcategoryOptions}
            onChange={(v) =>
              onChange({
                categoryId,
                subcategoryId,
                subSubcategoryId: v,
              })
            }
          />
        )}
    </div>
  );
};

export default CategoryFilter;
