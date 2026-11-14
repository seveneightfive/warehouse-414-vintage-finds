import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, BarChart3, Monitor, Smartphone, Tablet } from "lucide-react";

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

// Vercel folds everything past the top N into one row named "Others".
const SITE_URL = "https://www.warehouse414.com";

const isOthers = (name: string) => name === "Others";

const shortDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

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

function TopList({
  title, rows, label, othersLabel, empty, href,
}: {
  title: string;
  rows: Item[];
  label: (n: string) => string;
  othersLabel: string;
  empty: string;
  /** When given, each row (except "Others") links to this URL in a new tab. */
  href?: (n: string) => string;
}) {
  const ordered = [...rows.filter((r) => !isOthers(r.name)), ...rows.filter((r) => isOthers(r.name))];
  const max = Math.max(1, ...rows.filter((r) => !isOthers(r.name)).map((r) => r.visitors));
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground">{title}</h3>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">visitors</span>
      </div>
      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {ordered.map((r) => {
            const others = isOthers(r.name);
            const text = others ? othersLabel : label(r.name);
            const link = !others && href ? href(r.name) : null;
            return (
              <li
                key={r.name}
                className={`relative flex items-center justify-between gap-3 text-sm px-2 py-1 ${others ? "text-muted-foreground border-t pt-2 mt-1" : ""}`}
              >
                {!others && (
                  <span
                    className="absolute inset-y-0 left-0 rounded bg-muted"
                    style={{ width: `${Math.min(100, (r.visitors / max) * 100)}%` }}
                    aria-hidden
                  />
                )}
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative truncate inline-flex items-center gap-1 hover:underline underline-offset-2"
                    title={`Open ${text}`}
                  >
                    <span className="truncate">{text}</span>
                    <ArrowUpRight size={12} className="shrink-0 text-muted-foreground" />
                  </a>
                ) : (
                  <span className={`relative truncate ${others ? "italic" : ""}`} title={text}>{text}</span>
                )}
                <span className="relative tabular-nums">{fmt(r.visitors)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const deviceIcon = (name: string) =>
  /mobile|phone/i.test(name) ? Smartphone : /tablet/i.test(name) ? Tablet : Monitor;

export default function SiteAnalytics() {
  const [days, setDays] = useState<7 | 30>(30);
  const [hover, setHover] = useState<number | null>(null);

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
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* Daily visitors */}
          {data && data.daily.length > 0 && (
            <div className="border rounded-lg p-4 bg-card">
              <div className="flex items-baseline justify-between gap-3 mb-3 min-h-[1.25rem]">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Visitors per day</div>
                {/* Hover (or tap) a bar to see that day's numbers */}
                <div className="text-sm tabular-nums">
                  {hover !== null && data.daily[hover] ? (
                    <>
                      <span className="text-muted-foreground">{shortDate(data.daily[hover].date)}: </span>
                      <strong className="font-medium">{fmt(data.daily[hover].visitors)}</strong> visitors
                      <span className="text-muted-foreground"> · {fmt(data.daily[hover].pageviews)} page views</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Hover a bar for the day's numbers</span>
                  )}
                </div>
              </div>
              <div className="flex items-end gap-[2px] h-28" onMouseLeave={() => setHover(null)}>
                {data.daily.map((d, i) => (
                  <button
                    type="button"
                    key={d.date}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onClick={() => setHover(i)}
                    aria-label={`${shortDate(d.date)}: ${fmt(d.visitors)} visitors, ${fmt(d.pageviews)} page views`}
                    className="relative flex-1 h-full flex items-end group focus:outline-none"
                  >
                    <span
                      className={`w-full rounded-t-sm min-h-[2px] transition-colors ${hover === i ? "bg-foreground" : "bg-foreground/70 group-hover:bg-foreground"}`}
                      style={{ height: `${(d.visitors / maxDaily) * 100}%` }}
                    />
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                <span>{shortDate(data.since)}</span>
                <span>{shortDate(data.until)}</span>
              </div>
            </div>
          )}

          {/* Breakdowns */}
          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <TopList
                title="Top pages"
                rows={data.topPages}
                label={(n) => (n === "/" || !n ? "/ (home)" : n)}
                othersLabel="All other pages combined"
                empty="No page views yet"
                href={(n) => `${SITE_URL}${n || "/"}`}
              />
              <TopList
                title="Top referrers"
                rows={data.topReferrers}
                label={(n) => n || "Direct / none"}
                othersLabel="All other sites combined"
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
