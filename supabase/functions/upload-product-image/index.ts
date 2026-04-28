import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BUNNY_STORAGE_API_KEY = Deno.env.get("BUNNY_STORAGE_API_KEY")!;
    const BUNNY_STORAGE_ZONE = Deno.env.get("BUNNY_STORAGE_ZONE") || "warehouseimages";
    const BUNNY_CDN_URL = Deno.env.get("BUNNY_CDN_URL")!;
    const BUNNY_STORAGE_REGION = Deno.env.get("BUNNY_STORAGE_REGION") || "la";

    const storageHost = `${BUNNY_STORAGE_REGION}.storage.bunnycdn.com`;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const formData = await req.formData();

    // Accept files sent as 'file', 'file_0', 'file_1', etc.
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File && (key === "file" || key.startsWith("file_") || key.startsWith("files"))) {
        files.push(value);
      }
    }

    const productId = (formData.get("productId") as string) || (formData.get("product_id") as string);
    const sku = formData.get("sku") as string;
    const startSortOrder = parseInt(
      (formData.get("startSortOrder") as string) || (formData.get("start_sort_order") as string) || "0",
    );

    console.log(`productId: ${productId}, sku: ${sku}, files: ${files.length}`);
    console.log("All form keys:", [...formData.keys()].join(", "));

    if (!productId || !sku) {
      throw new Error("productId and sku are required");
    }

    if (files.length === 0) {
      throw new Error("No files found in request");
    }

    const uploadedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const timestamp = Date.now();
      const filename = `${timestamp}-${i}.${ext}`;
      const storagePath = `${sku}/${filename}`;

      console.log(`Uploading ${filename} to ${storageHost}/${BUNNY_STORAGE_ZONE}/${storagePath}`);

      const arrayBuffer = await file.arrayBuffer();
      const uploadUrl = `https://${storageHost}/${BUNNY_STORAGE_ZONE}/${storagePath}`;

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          AccessKey: BUNNY_STORAGE_API_KEY,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: arrayBuffer,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Bunny upload failed: ${uploadResponse.status} ${errorText}`);
      }

      console.log(`Successfully uploaded ${filename}`);

      let cdnBase = BUNNY_CDN_URL;
      if (!cdnBase.startsWith("http")) cdnBase = `https://${cdnBase}`;
      const cdnUrl = `${cdnBase}/${storagePath}`;
      const sortOrder = startSortOrder + i;

      const { data: imageRecord, error: insertError } = await supabase
        .from("product_images")
        .insert({
          product_id: productId,
          image_url: cdnUrl,
          sort_order: sortOrder,
          alt_text: `Product image ${sortOrder + 1}`,
        })
        .select()
        .single();

      if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);

      // First image becomes featured
      if (sortOrder === 0) {
        await supabase.from("products").update({ featured_image_url: cdnUrl }).eq("id", productId);
      }

      uploadedImages.push({
        id: imageRecord.id,
        image_url: cdnUrl,
        storage_path: storagePath,
        sort_order: sortOrder,
      });
    }

    return new Response(JSON.stringify({ success: true, images: uploadedImages }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
