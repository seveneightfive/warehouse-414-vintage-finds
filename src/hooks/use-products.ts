import { supabase } from "@/integrations/supabase/client";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { Product } from "@/types/database";

const PAGE_SIZE = 50;

// ─── Shared select fragments ──────────────────────────────────────────────────

const PRODUCT_DETAIL_SELECT = `
  *,
  product_designers ( attribution_type, designer:designers(id, name, slug) ),
  product_makers    ( attribution_type, maker:makers(id, name, slug) ),
  product_categories(
    is_primary,
    category:categories(id, name, slug),
    subcategory:subcategories(id, name, slug)
  ),
  product_styles_periods ( attribution_type, styles_periods:styles_periods(id, name, slug) ),
  country:countries(*),
  product_images(*),
  product_colors(*, color:colors(*))
`;

const PRODUCT_CARD_SELECT = `
  id, name, slug, price, status, featured_image_url, created_at, sale_price,
  product_designers ( attribution_type, designer:designers(id, name, slug) ),
  product_makers    ( attribution_type, maker:makers(id, name, slug) ),
  product_categories( is_primary, category:categories(id, name, slug) ),
  product_styles_periods ( attribution_type, styles_periods:styles_periods(id, name, slug) ),
  product_images(image_url, sort_order)
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Cursor = { created_at: string; id: string };

type ProductFilters = {
  designer_slug?: string;
  maker_slug?: string;
  category_id?: string;
  subcategory_id?: string;
  sub_subcategory_id?: string;
  style_period_id?: string;
  country_id?: string;
  color_id?: string;
  search?: string;
  year_min?: number;
  year_max?: number;
  status?: string;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Resolves a category/subcategory selection into the set of subcategory ids
 * (and optionally the L1 category id) that should be matched against
 * product_categories. This is what makes "select a parent → show all
 * descendants" work.
 */
async function resolveCategoryDescendants(filters: ProductFilters): Promise<{
  subcategoryIds: string[] | null;
  categoryId: string | null;
}> {
  // Deepest selection wins
  if (filters.sub_subcategory_id) {
    return { subcategoryIds: [filters.sub_subcategory_id], categoryId: null };
  }

  if (filters.subcategory_id) {
    // Include the L2 itself + all its L3 children
    const { data: children } = await supabase
      .from("subcategories")
      .select("id")
      .eq("parent_id", filters.subcategory_id);
    const ids = [filters.subcategory_id, ...(children ?? []).map((c) => c.id)];
    return { subcategoryIds: ids, categoryId: null };
  }

  if (filters.category_id) {
    // L1 selected — match either the L1 directly OR any descendant subcategory.
    const { data: subs } = await supabase
      .from("subcategories")
      .select("id")
      .eq("category_id", filters.category_id);
    const subIds = (subs ?? []).map((s) => s.id);

    if (subIds.length === 0) {
      return { subcategoryIds: null, categoryId: filters.category_id };
    }

    // Also pull L3s under those L2s
    const { data: grandkids } = await supabase
      .from("subcategories")
      .select("id")
      .in("parent_id", subIds);
    const allSubIds = [...subIds, ...(grandkids ?? []).map((g) => g.id)];
    return { subcategoryIds: allSubIds, categoryId: filters.category_id };
  }

  return { subcategoryIds: null, categoryId: null };
}

export function useInfiniteProducts(filters?: ProductFilters) {
  return useInfiniteQuery({
    queryKey: ["products-infinite", filters],
    queryFn: async ({ pageParam }: { pageParam: Cursor | undefined }) => {
      // Pre-resolve category hierarchy into a product id list.
      // Doing this as a pre-query is more reliable across three levels
      // than trying to compose nested OR filters in PostgREST.
      let categoryProductIds: string[] | null = null;

      if (filters?.category_id || filters?.subcategory_id || filters?.sub_subcategory_id) {
        const { subcategoryIds, categoryId } = await resolveCategoryDescendants(filters);

        const idSets: string[][] = [];

        if (subcategoryIds && subcategoryIds.length > 0) {
          const { data } = await supabase
            .from("product_categories")
            .select("product_id")
            .in("subcategory_id", subcategoryIds);
          idSets.push((data ?? []).map((r) => r.product_id));
        }

        if (categoryId) {
          const { data } = await supabase
            .from("product_categories")
            .select("product_id")
            .eq("category_id", categoryId);
          idSets.push((data ?? []).map((r) => r.product_id));
        }

        const merged = new Set<string>();
        idSets.forEach((set) => set.forEach((id) => merged.add(id)));
        categoryProductIds = [...merged];

        if (categoryProductIds.length === 0) return [] as Product[];
      }

      let query = supabase
        .from("products")
        .select(PRODUCT_CARD_SELECT)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE);

      if (filters?.status) {
        query = query.eq("status", filters.status);
      } else {
        query = query.in("status", ["available", "on_hold", "sold", "at_auction"]);
      }

      if (pageParam) {
        query = query.or(
          `created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`,
        );
      }

      if (categoryProductIds) {
        query = query.in("id", categoryProductIds);
      }

      if (filters?.designer_slug) {
        query = (query as any).eq("product_designers.designer.slug", filters.designer_slug);
      }
      if (filters?.maker_slug) {
        query = (query as any).eq("product_makers.maker.slug", filters.maker_slug);
      }
      if (filters?.style_period_id) {
        query = (query as any).eq("product_styles_periods.styles_periods.id", filters.style_period_id);
      }

      if (filters?.country_id) query = query.eq("country_id", filters.country_id);
      if (filters?.search) query = query.ilike("name", `%${filters.search}%`);
      if (filters?.year_min) query = query.gte("year_created", filters.year_min);
      if (filters?.year_max) query = query.lte("year_created", filters.year_max);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Product[];
    },
    initialPageParam: undefined as Cursor | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { created_at: last.created_at, id: last.id };
    },
  });
}

export function useProducts(filters?: {
  designer_id?: string;
  maker_id?: string;
  category_id?: string;
  style_period_id?: string;
  country_id?: string;
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["products", filters],
    enabled: !!filters && Object.values(filters).some(Boolean),
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(PRODUCT_CARD_SELECT)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      } else {
        query = query.in("status", ["available", "on_hold", "sold", "at_auction"]);
      }

      if (filters?.designer_id) {
        const { data: pds } = await supabase
          .from("product_designers")
          .select("product_id")
          .eq("designer_id", filters.designer_id);
        const ids = (pds ?? []).map((r) => r.product_id);
        if (ids.length === 0) return [] as Product[];
        query = query.in("id", ids);
      }

      if (filters?.maker_id) {
        const { data: pms } = await supabase
          .from("product_makers")
          .select("product_id")
          .eq("maker_id", filters.maker_id);
        const ids = (pms ?? []).map((r) => r.product_id);
        if (ids.length === 0) return [] as Product[];
        query = query.in("id", ids);
      }

      if (filters?.category_id) {
        const { data: pcs } = await supabase
          .from("product_categories")
          .select("product_id")
          .eq("category_id", filters.category_id);
        const ids = (pcs ?? []).map((r) => r.product_id);
        if (ids.length === 0) return [] as Product[];
        query = query.in("id", ids);
      }

      if (filters?.style_period_id) {
        const { data: psps } = await supabase
          .from("product_styles_periods")
          .select("product_id")
          .eq("style_period_id", filters.style_period_id);
        const ids = (psps ?? []).map((r) => r.product_id);
        if (ids.length === 0) return [] as Product[];
        query = query.in("id", ids);
      }
      if (filters?.country_id) query = query.eq("country_id", filters.country_id);
      if (filters?.search) query = query.ilike("name", `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Product[];
    },
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_DETAIL_SELECT)
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data as unknown as Product;
    },
    enabled: !!slug,
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, slug, price, status, featured_image_url, created_at, sale_price,
          product_designers ( attribution_type, designer:designers(id, name, slug) ),
          product_images(*)
        `)
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as unknown as Product[];
    },
  });
}

export function useSimilarProducts(
  productId: string | undefined,
  categoryIds: string[] | undefined,
) {
  return useQuery({
    queryKey: ["products", "similar", productId, categoryIds],
    queryFn: async () => {
      if (!productId) return [];

      let ids: string[] = [];

      if (categoryIds && categoryIds.length > 0) {
        const { data: pcs } = await supabase
          .from("product_categories")
          .select("product_id")
          .in("category_id", categoryIds)
          .neq("product_id", productId);
        ids = [...new Set((pcs ?? []).map((r) => r.product_id))].slice(0, 4);
      }

      if (ids.length === 0) {
        const { data, error } = await supabase
          .from("products")
          .select(`id, name, slug, price, status, featured_image_url, created_at, sale_price,
            product_designers(attribution_type, designer:designers(id, name, slug)),
            product_images(image_url, sort_order)`)
          .neq("id", productId)
          .eq("status", "available")
          .limit(4);
        if (error) throw error;
        return data as unknown as Product[];
      }

      const { data, error } = await supabase
        .from("products")
        .select(`id, name, slug, price, status, featured_image_url, created_at, sale_price,
          product_designers(attribution_type, designer:designers(id, name, slug)),
          product_images(image_url, sort_order)`)
        .in("id", ids)
        .eq("status", "available");
      if (error) throw error;
      return data as unknown as Product[];
    },
    enabled: !!productId,
  });
}

/**
 * Categories returned as a 3-level tree:
 *   category (L1) → subcategory (L2, parent_id IS NULL) → sub-subcategory (L3)
 *
 * `subcategories` serves dual duty: rows with parent_id NULL are L2 children
 * of a category; rows with parent_id set are L3 children of an L2 row.
 */
export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  children: CategoryNode[];
};

export function useFilterOptions() {
  return useQuery({
    queryKey: ["filter-options"],
    queryFn: async () => {
      const [designers, makers, categoriesRaw, subcategoriesRaw, stylesPeriods, countries, colors] =
        await Promise.all([
          supabase.from("designers").select("*").order("name"),
          supabase.from("makers").select("*").order("name"),
          supabase.from("categories").select("id, name, slug").order("name"),
          supabase
            .from("subcategories")
            .select("id, name, slug, category_id, parent_id")
            .order("name"),
          supabase.from("styles_periods").select("*").order("name"),
          supabase.from("countries").select("*").order("name"),
          supabase.from("colors").select("*").order("name"),
        ]);

      const subs = subcategoriesRaw.data ?? [];
      const cats = categoriesRaw.data ?? [];

      // L3 grouped by their L2 parent
      const l3ByParent = new Map<string, CategoryNode[]>();
      for (const s of subs) {
        if (s.parent_id) {
          const arr = l3ByParent.get(s.parent_id) ?? [];
          arr.push({ id: s.id, name: s.name, slug: s.slug, children: [] });
          l3ByParent.set(s.parent_id, arr);
        }
      }

      // L2 grouped by their L1 category, with L3s attached
      const l2ByCategory = new Map<string, CategoryNode[]>();
      for (const s of subs) {
        if (!s.parent_id && s.category_id) {
          const arr = l2ByCategory.get(s.category_id) ?? [];
          arr.push({
            id: s.id,
            name: s.name,
            slug: s.slug,
            children: l3ByParent.get(s.id) ?? [],
          });
          l2ByCategory.set(s.category_id, arr);
        }
      }

      const categoryTree: CategoryNode[] = cats.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        children: l2ByCategory.get(c.id) ?? [],
      }));

      return {
        designers: designers.data || [],
        makers: makers.data || [],
        categories: cats,         // legacy flat list (kept for back-compat)
        categoryTree,             // new hierarchical tree
        stylesPeriods: stylesPeriods.data || [],
        countries: countries.data || [],
        colors: colors.data || [],
      };
    },
  });
}
