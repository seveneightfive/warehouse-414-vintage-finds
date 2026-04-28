import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authCheck = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await authCheck.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { isEditing, productId, values, designers, makers, categories } = body ?? {};
    if (typeof isEditing !== 'boolean') {
      return new Response(JSON.stringify({ error: 'isEditing must be boolean' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isEditing && !productId) {
      return new Response(JSON.stringify({ error: 'productId is required for edits' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const row = { ...values };
    if (row.tags && typeof row.tags === 'string') {
      row.tags = row.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    for (const key of Object.keys(row)) {
      if (row[key] === '' || row[key] === undefined) {
        row[key] = null;
      }
    }
    row.consignor_id = row.consignor_id ?? null;

    let savedProductId = productId;
    if (isEditing) {
      const { error } = await supabase.from('products').update(row).eq('id', productId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('products').insert(row).select('id').single();
      if (error) throw error;
      savedProductId = data.id;
    }

    if (!savedProductId) {
      throw new Error('Unable to determine product ID');
    }

    await supabase.from('product_designers').delete().eq('product_id', savedProductId);
    if (Array.isArray(designers) && designers.length > 0) {
      const rows = designers.filter((d: any) => d.designer_id).map((d: any) => ({
        product_id: savedProductId,
        designer_id: d.designer_id,
        attribution_type: d.attribution_type || 'by',
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from('product_designers').insert(rows);
        if (error) throw error;
      }
    }

    await supabase.from('product_makers').delete().eq('product_id', savedProductId);
    if (Array.isArray(makers) && makers.length > 0) {
      const rows = makers.filter((m: any) => m.maker_id).map((m: any) => ({
        product_id: savedProductId,
        maker_id: m.maker_id,
        attribution_type: m.attribution_type || 'by',
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from('product_makers').insert(rows);
        if (error) throw error;
      }
    }

    await supabase.from('product_categories').delete().eq('product_id', savedProductId);
    if (Array.isArray(categories) && categories.length > 0) {
      const rows = categories.filter((c: any) => c.category_id).map((c: any, i: number) => ({
        product_id: savedProductId,
        category_id: c.category_id,
        subcategory_id: c.sub_subcategory_id ?? c.subcategory_id ?? null,
        is_primary: i === 0,
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from('product_categories').insert(rows);
        if (error) throw error;
      }
    }

    return new Response(JSON.stringify({ id: savedProductId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
