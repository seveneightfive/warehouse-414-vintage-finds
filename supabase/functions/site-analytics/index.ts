// Site analytics for the admin dashboard, read from Vercel Web Analytics.
//
// The Vercel access token never reaches the browser: the dashboard calls this
// function, which checks the caller is a signed-in admin, queries Vercel's
// Web Analytics API and returns a small summary.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   VERCEL_ANALYTICS_TOKEN  a Vercel access token for the team that owns the project
//   VERCEL_PROJECT_ID       e.g. prj_…
//   VERCEL_TEAM_ID          e.g. team_… (omit for a personal-account project)
//
// Bounce rate isn't offered by Vercel's API, so it isn't returned here.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const API = "https://api.vercel.com/v1/query/web-analytics/visits";
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; body: unknown }>();

type Row = Record<string, unknown> & { pageviews?: number; visitors?: number };

const day = (d: Date) => d.toISOString().slice(0, 10);

// Tolerate a token pasted with spaces, quotes or a leading "Bearer ".
const token = () =>
  (Deno.env.get("VERCEL_ANALYTICS_TOKEN") ?? "").trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "");

async function vercel(path: "count" | "aggregate", params: Record<string, string>) {
  const qs = new URLSearchParams({ projectId: Deno.env.get("VERCEL_PROJECT_ID")!.trim(), ...params });
  const teamId = Deno.env.get("VERCEL_TEAM_ID")?.trim();
  if (teamId) qs.set("teamId", teamId);
  const res = await fetch(`${API}/${path}?${qs}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403 && text.includes("invalidToken")) {
      throw new Error("Vercel rejected the access token. Create a new token scoped to the seveneightfives-projects team and update VERCEL_ANALYTICS_TOKEN.");
    }
    throw new Error(`Vercel ${path} ${params.by ?? ""} failed: ${res.status} ${text}`);
  }
  return (await res.json()).data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Admins only ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    if (!Deno.env.get("VERCEL_ANALYTICS_TOKEN") || !Deno.env.get("VERCEL_PROJECT_ID")) {
      return json({ error: "not_configured" }, 503);
    }

    // ── Range: last 7 or 30 days, plus the period before it for comparison ──
    const { days: rawDays } = await req.json().catch(() => ({}));
    const days = rawDays === 7 ? 7 : 30;
    const cacheKey = String(days);
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS) return json(hit.body);

    const until = new Date();
    const since = new Date(until.getTime() - (days - 1) * 86400000);
    const prevUntil = new Date(since.getTime() - 86400000);
    const prevSince = new Date(prevUntil.getTime() - (days - 1) * 86400000);
    const range = { since: day(since), until: day(until) };

    const [totals, previous, daily, pages, referrers, devices] = await Promise.all([
      vercel("count", range),
      vercel("count", { since: day(prevSince), until: day(prevUntil) }),
      vercel("aggregate", { ...range, by: "day", limit: "100" }),
      vercel("aggregate", { ...range, by: "requestPath", limit: "10" }),
      vercel("aggregate", { ...range, by: "referrerHostname", limit: "10" }),
      vercel("aggregate", { ...range, by: "deviceType", limit: "5" }),
    ]);

    const pick = (rows: Row[], key: string) =>
      (rows ?? []).map((r) => ({
        name: (r[key] as string) ?? "",
        pageviews: r.pageviews ?? 0,
        visitors: r.visitors ?? 0,
      }));

    const body = {
      days,
      since: range.since,
      until: range.until,
      totals: { pageviews: totals?.pageviews ?? 0, visitors: totals?.visitors ?? 0 },
      previous: { pageviews: previous?.pageviews ?? 0, visitors: previous?.visitors ?? 0 },
      daily: (daily as Row[] ?? []).map((r) => ({
        date: String(r.timestamp).slice(0, 10),
        pageviews: r.pageviews ?? 0,
        visitors: r.visitors ?? 0,
      })),
      topPages: pick(pages, "requestPath"),
      topReferrers: pick(referrers, "referrerHostname"),
      devices: pick(devices, "deviceType"),
      fetchedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, { at: Date.now(), body });
    return json(body);
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
