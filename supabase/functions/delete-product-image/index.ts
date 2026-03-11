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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_id, storage_path } = await req.json();

    if (!image_id) {
      return new Response(JSON.stringify({ error: "image_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get image info before deleting
    const { data: imgData } = await supabase
      .from("product_images")
      .select("product_id, image_url, sort_order")
      .eq("id", image_id)
      .single();

    // Delete from product_images
    const { error: deleteErr } = await supabase
      .from("product_images")
      .delete()
      .eq("id", image_id);

    if (deleteErr) throw deleteErr;

    // Delete from Bunny.net storage if path provided
    if (storage_path) {
      const storageApiKey = Deno.env.get("BUNNY_STORAGE_API_KEY")!;
      const deleteUrl = `https://storage.bunnycdn.com/warehouseimages/${storage_path}`;

      await fetch(deleteUrl, {
        method: "DELETE",
        headers: { AccessKey: storageApiKey },
      });
    }

    // If this was the featured image, update to next available
    if (imgData) {
      const { data: remaining } = await supabase
        .from("product_images")
        .select("image_url")
        .eq("product_id", imgData.product_id)
        .order("sort_order", { ascending: true })
        .limit(1);

      const newFeatured = remaining?.[0]?.image_url || null;
      await supabase
        .from("products")
        .update({ featured_image_url: newFeatured })
        .eq("id", imgData.product_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
