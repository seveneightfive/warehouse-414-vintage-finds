const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-client-runtime",
};

const buildHtml = (payload: Record<string, unknown>) => {
  const rows = Object.entries(payload)
    .map(
      ([key, value]) =>
        `<tr><td style="padding: 4px 8px; font-weight: 600; text-transform: capitalize;">${key.replace(/_/g, ' ')}</td><td style="padding: 4px 8px;">${value ?? 'N/A'}</td></tr>`
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h1 style="font-size: 20px; margin-bottom: 16px;">New warehouse414 inquiry</h1>
      <table style="border-collapse: collapse; width: 100%;">
        ${rows}
      </table>
    </div>
  `;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json();
    const {
      product_id,
      product_title,
      type,
      inquiry_type,
      customer_name,
      customer_email,
      customer_phone,
      message,
      offer_amount,
    } = payload as Record<string, unknown>;

    if (!product_id || !product_title || !type || !inquiry_type || !customer_name || !customer_email) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("EMAIL_FROM") || "no-reply@warehouse414.com";
    const to = Deno.env.get("EMAIL_TO") || "sales@warehouse414.com";

    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const subject = `New ${String(type).toUpperCase()} for ${String(product_title)}`;
    const text = `New inquiry from warehouse414:\n\nProduct: ${String(product_title)}\nProduct ID: ${String(product_id)}\nSubmission type: ${String(type)}\nInquiry type: ${String(inquiry_type)}\nCustomer name: ${String(customer_name)}\nCustomer email: ${String(customer_email)}\nCustomer phone: ${String(customer_phone ?? "N/A")}\nOffer amount: ${offer_amount ?? "N/A"}\nMessage: ${message ?? "N/A"}`;

    const html = buildHtml({
      product_title,
      product_id,
      type,
      inquiry_type,
      customer_name,
      customer_email,
      customer_phone: customer_phone ?? "N/A",
      offer_amount: offer_amount ?? "N/A",
      message: message ?? "N/A",
    });

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      return jsonResponse({ error: `Email send failed: ${resendRes.status} ${errText}` }, resendRes.status);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
