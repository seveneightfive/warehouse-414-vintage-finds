import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, ExternalLink, Monitor, Smartphone, Tablet } from "lucide-react";

// Site traffic from Vercel Web Analytics, via the `site-analytics` edge function
// (which holds the Vercel token and only answers admins).

type Item = { name: string; pageviews: number; visitors: number };
type Analytics = {
  days: number;
  since: string;
  until: string;
  totals: { pageviews: number; visitors: number };
  previous: { pageviews: number; visitors: number };
  daily: { date: string; pageviews: number; visitors: number }[];
  topPages: Item[];
  topReferrers: Item[];
  devices: Item[];
  fetchedAt: string;
};

// Bounce rate is only available in Vercel's own dashboard.
const VERCEL_ANALYTICS_URL = "https://vercel.com/seveneightfives-projects/warehouse414/analytics";

const fmt = (n: number) => n.toLocaleString();

function Change({ now, before }: { now: number; before: number }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return (
    <span className={`text-xs ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}% <span className="text-muted-foreground">vs prior</span>
    </span>
  );
}

function TopList({ title, rows, label, empty }: { title: string; rows: Item[]; label: (n: string) => string; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground">{title}</h3>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">visitors</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.name} className="relative flex items-center justify-between gap-3 text-sm px-2 py-1">
              <span
                className="absolute inset-y-0 left-0 rounded bg-muted"
                style={{ width: `${(r.visitors / max) * 100}%` }}
                aria-hidden
              />
              <span className="relative truncate" title={label(r.name)}>{label(r.name)}</span>
              <span className="relative tabular-nums">{fmt(r.visitors)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const deviceIcon = (name: string) =>
  /mobile|phone/i.test(name) ? Smartphone : /tablet/i.test(name) ? Tablet : Monitor;

export default function SiteAnalytics() {
  const [days, setDays] = useState<7 | 30>(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ["site-analytics", days],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("site-analytics", { body: { days } });
      if (error) {
        // Surface the function's own message (e.g. "not_configured") when there is one.
        const ctx = (error as { context?: Response }).context;
        const body = ctx ? await ctx.json().catch(() => null) : null;
        throw new Error(body?.error ?? error.message);
      }
      return data as Analytics;
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const maxDaily = Math.max(1, ...(data?.daily ?? []).map((d) => d.visitors));
  const deviceTotal = (data?.devices ?? []).reduce((s, d) => s + d.visitors, 0) || 1;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-muted-foreground" />
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground">Website traffic</h2>
        </div>
        <div className="inline-flex rounded-md border overflow-hidden text-sm">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 ${days === d ? "bg-foreground text-background" : "bg-background hover:bg-muted"}`}
            >
              Last {d} days
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="border rounded-lg p-4 bg-card text-sm text-muted-foreground">
          {(error as Error).message === "not_configured"
            ? "Website analytics isn't connected yet. A Vercel access token needs to be added to the site-analytics function."
            : `Couldn't load website analytics: ${(error as Error).message}`}
        </div>
      ) : (
        <>
          {/* Headline numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="border rounded-lg p-4 bg-card">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Visitors</div>
              <div className="text-2xl font-medium">{isLoading ? "—" : fmt(data!.totals.visitors)}</div>
              {data && <Change now={data.totals.visitors} before={data.previous.visitors} />}
            </div>
            <div className="border rounded-lg p-4 bg-card">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Page views</div>
              <div className="text-2xl font-medium">{isLoading ? "—" : fmt(data!.totals.pageviews)}</div>
              {data && <Change now={data.totals.pageviews} before={data.previous.pageviews} />}
            </div>
            <a
              href={VERCEL_ANALYTICS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 lg:col-span-1 border rounded-lg p-4 bg-card hover:bg-muted/50 transition"
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Bounce rate</div>
              <div className="text-sm inline-flex items-center gap-1">
                View in Vercel <ExternalLink size={13} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">Vercel doesn't share bounce rate outside its own dashboard.</div>
            </a>
          </div>

          {/* Daily visitors */}
          {data && data.daily.length > 0 && (
            <div className="border rounded-lg p-4 bg-card">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Visitors per day</div>
              <div className="flex items-end gap-[2px] h-28">
                {data.daily.map((d) => (
                  <div
                    key={d.date}
                    className="flex-1 bg-foreground/80 hover:bg-foreground rounded-t-sm min-h-[2px]"
                    style={{ height: `${(d.visitors / maxDaily) * 100}%` }}
                    title={`${new Date(d.date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${fmt(d.visitors)} visitors, ${fmt(d.pageviews)} page views`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                <span>{new Date(data.since + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                <span>{new Date(data.until + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              </div>
            </div>
          )}

          {/* Breakdowns */}
          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <TopList title="Top pages" rows={data.topPages} label={(n) => n || "/"} empty="No page views yet" />
              <TopList
                title="Top referrers"
                rows={data.topReferrers}
                label={(n) => n || "Direct / none"}
                empty="No referrers yet"
              />
              <div className="border rounded-lg p-4 bg-card">
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Devices</h3>
                <ul className="space-y-3">
                  {data.devices.map((d) => {
                    const Icon = deviceIcon(d.name);
                    const pct = Math.round((d.visitors / deviceTotal) * 100);
                    return (
                      <li key={d.name} className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="inline-flex items-center gap-2 capitalize">
                            <Icon size={14} className="text-muted-foreground" /> {d.name || "Unknown"}
                          </span>
                          <span className="tabular-nums">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded bg-muted">
                          <div className="h-full rounded bg-foreground/80" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
          {data && (
            <p className="text-[11px] text-muted-foreground">
              From Vercel Web Analytics · production site · updated every 10 minutes
            </p>
          )}
        </>
      )}
    </section>
  );
}
