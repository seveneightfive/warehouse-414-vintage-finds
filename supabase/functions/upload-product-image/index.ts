// Upload product images to Bunny.net CDN storage
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
    // Auth check
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

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const productId = formData.get("product_id") as string;
    const sku = formData.get("sku") as string;
    const sortOrder = parseInt(formData.get("sort_order") as string || "0", 10);

    if (!file || !productId || !sku) {
      return new Response(JSON.stringify({ error: "file, product_id, and sku are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storageApiKey = Deno.env.get("BUNNY_STORAGE_API_KEY")!;
    const cdnHostname = Deno.env.get("BUNNY_CDN_HOSTNAME")!;

    // Build path using SKU and original filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `products/${sku}/${sanitizedName}`;

    // Upload to Bunny.net (warehouseimages storage zone)
    const fileBuffer = await file.arrayBuffer();
    const uploadUrl = `https://storage.bunnycdn.com/warehouseimages/${storagePath}`;

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: storageApiKey,
        "Content-Type": "application/octet-stream",
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Bunny upload failed: ${uploadRes.status} ${errText}`);
    }

    const cdnUrl = `https://${cdnHostname}/${storagePath}`;

    // Insert into product_images
    const { data: imgRow, error: insertErr } = await supabase
      .from("product_images")
      .insert({ product_id: productId, image_url: cdnUrl, sort_order: sortOrder })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // If sort_order is 0, set as featured image
    if (sortOrder === 0) {
      await supabase
        .from("products")
        .update({ featured_image_url: cdnUrl })
        .eq("id", productId);
    }

    return new Response(
      JSON.stringify({ image: imgRow, cdn_url: cdnUrl, storage_path: storagePath }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
