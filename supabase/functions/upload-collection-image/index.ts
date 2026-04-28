// Upload collection cover image to Bunny.net CDN storage
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
    const collectionId = formData.get("collectionId") as string;
    const slug = formData.get("slug") as string;

    if (!file || !collectionId || !slug) {
      return new Response(JSON.stringify({ error: "file, collectionId, and slug are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storageApiKey = Deno.env.get("BUNNY_STORAGE_API_KEY")!;
    const cdnHostname = Deno.env.get("BUNNY_CDN_HOSTNAME")!;

    // Build path: collections/{slug}/{filename}
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `collections/${slug}/${sanitizedName}`;

    // Upload to Bunny.net
    const fileBuffer = await file.arrayBuffer();
    const uploadUrl = `https://la.storage.bunnycdn.com/warehouseimages/${storagePath}`;

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

    // Update the collection's cover_image
    const { error: updateErr } = await supabase
      .from("collections")
      .update({ cover_image: cdnUrl })
      .eq("id", collectionId);

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ cdn_url: cdnUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
