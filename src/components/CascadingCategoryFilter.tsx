import { useState, useEffect } from 'react';
import SearchableSelect from './SearchableSelect';

interface CategoryFilterProps {
  categories: any[];
  value: string;
  onChange: (categoryId: string) => void;
}

export default function CascadingCategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('');

  // Build category hierarchy
  const hierarchy = {
    categories: [] as Array<{ id: string; name: string }>,
    subcategoriesByCategory: {} as Record<string, Array<{ id: string; name: string }>>,
    subSubcategoriesBySubcategory: {} as Record<string, Array<{ id: string; name: string }>>,
  };

  categories.forEach((cat: any) => {
    // Add main category
    if (!hierarchy.categories.find((c) => c.id === cat.id)) {
      hierarchy.categories.push({ id: cat.id, name: cat.name });
    }

    // Add subcategory
    if (cat.subcategory_id && cat.subcategory_name) {
      if (!hierarchy.subcategoriesByCategory[cat.id]) {
        hierarchy.subcategoriesByCategory[cat.id] = [];
      }
      
      // Only add top-level subcategories (no parent_id)
      if (!cat.parent_id) {
        const exists = hierarchy.subcategoriesByCategory[cat.id].find(
          (s) => s.id === cat.subcategory_id
        );
        if (!exists) {
          hierarchy.subcategoriesByCategory[cat.id].push({
            id: cat.subcategory_id,
            name: cat.subcategory_name,
          });
        }
      }

      // Add sub-subcategory
      if (cat.parent_id) {
        if (!hierarchy.subSubcategoriesBySubcategory[cat.parent_id]) {
          hierarchy.subSubcategoriesBySubcategory[cat.parent_id] = [];
        }
        const exists = hierarchy.subSubcategoriesBySubcategory[cat.parent_id].find(
          (s) => s.id === cat.subcategory_id
        );
        if (!exists) {
          hierarchy.subSubcategoriesBySubcategory[cat.parent_id].push({
            id: cat.subcategory_id,
            name: cat.subcategory_name,
          });
        }
      }
    }
  });

  // Initialize from current value
  useEffect(() => {
    if (value && categories.length > 0) {
      const match = categories.find((cat: any) => {
        return (
          cat.id === value ||
          cat.subcategory_id === value
        );
      });

      if (match) {
        setSelectedCategory(match.id);
        if (match.subcategory_id === value && !match.parent_id) {
          setSelectedSubcategory(value);
        } else if (match.parent_id) {
          setSelectedSubcategory(match.parent_id);
          setSelectedSubSubcategory(value);
        }
      }
    }
  }, [value, categories]);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedSubcategory('');
    setSelectedSubSubcategory('');
    onChange(catId);
  };

  const handleSubcategoryChange = (subcatId: string) => {
    setSelectedSubcategory(subcatId);
    setSelectedSubSubcategory('');
    onChange(subcatId);
  };

  const handleSubSubcategoryChange = (subSubcatId: string) => {
    setSelectedSubSubcategory(subSubcatId);
    onChange(subSubcatId);
  };

  const availableSubcategories = selectedCategory
    ? hierarchy.subcategoriesByCategory[selectedCategory] || []
    : [];

  const availableSubSubcategories = selectedSubcategory
    ? hierarchy.subSubcategoriesBySubcategory[selectedSubcategory] || []
    : [];

  return (
    <div className="space-y-3">
      <SearchableSelect
        label="Category"
        value={selectedCategory}
        options={hierarchy.categories}
        onChange={handleCategoryChange}
      />

      {selectedCategory && availableSubcategories.length > 0 && (
        <SearchableSelect
          label="Subcategory"
          value={selectedSubcategory}
          options={availableSubcategories}
          onChange={handleSubcategoryChange}
        />
      )}

      {selectedSubcategory && availableSubSubcategories.length > 0 && (
        <SearchableSelect
          label="Type"
          value={selectedSubSubcategory}
          options={availableSubSubcategories}
          onChange={handleSubSubcategoryChange}
        />
      )}
    </div>
  );
}
