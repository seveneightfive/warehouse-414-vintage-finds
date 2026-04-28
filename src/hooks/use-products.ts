import { supabase } from "@/integrations/supabase/client";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { Product } from "@/types/database";

const PAGE_SIZE = 50;

// ─── Shared select fragments ──────────────────────────────────────────────────

/** Full junction selects — used on single-product detail pages */
const PRODUCT_DETAIL_SELECT = `
  *,
  product_designers ( attribution_type, designer:designers(id, name, slug) ),
  product_makers    ( attribution_type, maker:makers(id, name, slug) ),
  product_categories(
    is_primary,
    category:categories(id, name, slug),
    subcategory:subcategories(id, name, slug)
  ),
  style:styles(*),
  period:periods(*),
  country:countries(*),
  product_images(*),
  product_colors(*, color:colors(*))
`;

/** Lightweight select for list/card views */
const PRODUCT_CARD_SELECT = `
  id, name, slug, price, status, featured_image_url, created_at, sale_price,
  product_designers ( attribution_type, designer:designers(id, name, slug) ),
  product_makers    ( attribution_type, maker:makers(id, name, slug) ),
  product_categories( is_primary, category:categories(id, name, slug) ),
  product_images(image_url, sort_order)
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Cursor = { created_at: string; id: string };

type ProductFilters = {
  designer_slug?: string;
  maker_slug?: string;
  category_id?: string;
  style_id?: string;
  period_id?: string;
  country_id?: string;
  color_id?: string;
  search?: string;
  year_min?: number;
  year_max?: number;
  status?: string;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Infinite-scroll product list. Filters via junction tables for
 * designer_slug and maker_slug (supports multi-designer/maker products).
 */
export function useInfiniteProducts(filters?: ProductFilters) {
  return useInfiniteQuery({
    queryKey: ["products-infinite", filters],
    queryFn: async ({ pageParam }: { pageParam: Cursor | undefined }) => {
      let query = supabase
        .from("products")
        .select(PRODUCT_CARD_SELECT)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE);

      // Status filter
      if (filters?.status) {
        query = query.eq("status", filters.status);
      } else {
        query = query.in("status", ["available", "on_hold", "sold", "at_auction"]);
      }

      // Cursor pagination
      if (pageParam) {
        query = query.or(
          `created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`,
        );
      }

      // Junction-table filters: filter via the nested relationship
      // Supabase supports filtering on joined tables with !inner
      if (filters?.designer_slug) {
        query = (query as any).eq("product_designers.designer.slug", filters.designer_slug);
      }
      if (filters?.maker_slug) {
        query = (query as any).eq("product_makers.maker.slug", filters.maker_slug);
      }
      if (filters?.category_id) {
        query = (query as any).eq("product_categories.category_id", filters.category_id);
      }

      // Direct-column filters
      if (filters?.style_id) query = query.eq("style_id", filters.style_id);
      if (filters?.period_id) query = query.eq("period_id", filters.period_id);
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

/**
 * Simple product list — used for "other pieces by this designer/maker" sections.
 * Accepts legacy ID-based filters for backwards compat, plus new junction filters.
 */
export function useProducts(filters?: {
  designer_id?: string;
  maker_id?: string;
  category_id?: string;
  style_id?: string;
  period_id?: string;
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

      // For "pieces by designer/maker", filter via junction tables
      // We use the legacy _id columns here since we have the UUID directly
      // (the junction row will always exist from migration)
      if (filters?.designer_id) {
        // Filter products that have this designer in product_designers
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

      if (filters?.style_id) query = query.eq("style_id", filters.style_id);
      if (filters?.period_id) query = query.eq("period_id", filters.period_id);
      if (filters?.country_id) query = query.eq("country_id", filters.country_id);
      if (filters?.search) query = query.ilike("name", `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Product[];
    },
  });
}

/**
 * Single product detail — full data including all designers, makers, categories.
 */
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

/**
 * Similar products — uses product_categories junction to find products
 * sharing any category with the current product.
 */
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
        // Fallback: just return recent available products
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

export function useFilterOptions() {
  return useQuery({
    queryKey: ["filter-options"],
    queryFn: async () => {
      const [designers, makers, categories, styles, periods, countries, colors] =
        await Promise.all([
          supabase.from("designers").select("*").order("name"),
          supabase.from("makers").select("*").order("name"),
          supabase.from("categories").select("*, subcategories(*)").order("name"),
          supabase.from("styles").select("*").order("name"),
          supabase.from("periods").select("*").order("name"),
          supabase.from("countries").select("*").order("name"),
          supabase.from("colors").select("*").order("name"),
        ]);
      return {
        designers: designers.data || [],
        makers: makers.data || [],
        categories: categories.data || [],
        styles: styles.data || [],
        periods: periods.data || [],
        countries: countries.data || [],
        colors: colors.data || [],
      };
    },
  });
}
