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

// Card select with an inner join on product_categories. Used only when a
// category filter is active. `!inner` forces only products that have a
// matching product_categories row, and lets us filter by category_id /
// subcategory_id at the database level instead of pre-querying ids.
const PRODUCT_CARD_SELECT_WITH_CATEGORY_FILTER = `
  id, name, slug, price, status, featured_image_url, created_at, sale_price,
  product_designers ( attribution_type, designer:designers(id, name, slug) ),
  product_makers    ( attribution_type, maker:makers(id, name, slug) ),
  product_categories!inner ( is_primary, category_id, subcategory_id, category:categories(id, name, slug) ),
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
 * (or L1 category id) that products may be tagged with.
 *
 * Tagging convention in this database:
 *   - L1 only:     product_categories.category_id = X, subcategory_id = NULL
 *   - L2 chosen:   product_categories.subcategory_id IN (L2 + its L3 children)
 *   - L3 chosen:   product_categories.subcategory_id = L3
 */
async function resolveCategoryDescendants(filters: ProductFilters): Promise<{
  subcategoryIds: string[] | null;
  categoryId: string | null;
}> {
  if (filters.sub_subcategory_id) {
    return { subcategoryIds: [filters.sub_subcategory_id], categoryId: null };
  }

  if (filters.subcategory_id) {
    const { data: children } = await supabase
      .from("subcategories")
      .select("id")
      .eq("parent_id", filters.subcategory_id);
    const ids = [filters.subcategory_id, ...(children ?? []).map((c) => c.id)];
    return { subcategoryIds: ids, categoryId: null };
  }

  if (filters.category_id) {
    // L1 selected: any product_categories row with this category_id matches,
    // regardless of which subcategory_id (if any) it has.
    return { subcategoryIds: null, categoryId: filters.category_id };
  }

  return { subcategoryIds: null, categoryId: null };
}

export function useInfiniteProducts(filters?: ProductFilters) {
  return useInfiniteQuery({
    queryKey: ["products-infinite", filters],
    queryFn: async ({ pageParam }: { pageParam: Cursor | undefined }) => {
      const hasCategoryFilter = !!(
        filters?.category_id ||
        filters?.subcategory_id ||
        filters?.sub_subcategory_id
      );

      let categoryFilterIds: string[] | null = null;
      let categoryFilterL1: string | null = null;

      if (hasCategoryFilter) {
        const resolved = await resolveCategoryDescendants(filters!);
        categoryFilterIds = resolved.subcategoryIds;
        categoryFilterL1 = resolved.categoryId;
      }

      // Only switch to the inner-join select when a category filter is on,
      // so products without any product_categories row aren't accidentally
      // hidden in the unfiltered case.
      const selectClause = hasCategoryFilter
        ? PRODUCT_CARD_SELECT_WITH_CATEGORY_FILTER
        : PRODUCT_CARD_SELECT;

      let query = supabase
        .from("products")
        .select(selectClause)
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

      // Filter at the DB level via the joined product_categories table.
      // PostgREST allows this on inner-joined relations directly.
      if (categoryFilterL1) {
        query = (query as any).eq("product_categories.category_id", categoryFilterL1);
      } else if (categoryFilterIds && categoryFilterIds.length > 0) {
        query = (query as any).in("product_categories.subcategory_id", categoryFilterIds);
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

      // Inner joins can produce duplicate product rows when multiple
      // product_categories rows match. De-dupe by id, preserving order.
      const seen = new Set<string>();
      const unique: Product[] = [];
      for (const p of (data as unknown as Product[]) ?? []) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          unique.push(p);
        }
      }
      return unique;
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

      const l3ByParent = new Map<string, CategoryNode[]>();
      for (const s of subs) {
        if (s.parent_id) {
          const arr = l3ByParent.get(s.parent_id) ?? [];
          arr.push({ id: s.id, name: s.name, slug: s.slug, children: [] });
          l3ByParent.set(s.parent_id, arr);
        }
      }

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
        categories: cats,
        categoryTree,
        stylesPeriods: stylesPeriods.data || [],
        countries: countries.data || [],
        colors: colors.data || [],
      };
    },
  });
}
