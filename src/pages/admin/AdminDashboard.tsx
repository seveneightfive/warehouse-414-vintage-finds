import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Package,
  Pencil,
  Gavel,
  CheckCircle2,
  Clock,
  MessageSquare,
  HandCoins,
  CalendarDays,
  ChevronRight,
  X,
} from "lucide-react";

/* ---------- types ---------- */

type StatusKey = "available" | "draft" | "at_auction" | "sold" | "on_hold";

type Stat = { key: StatusKey; label: string; count: number; href: string; icon: any };

type ProductionWeek = {
  id: string;
  title: string | null;
  work_week_date: string; // 'YYYY-MM-DD'
  status: string | null;
  notes: string | null;
};

type WeekProduct = {
  id: string;
  product_id: string;
  production_week_id: string;
  products: { id: string; name: string | null; status: string | null } | null;
};

type Inquiry = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  inquiry_type: string | null;
  message: string | null;
  offer_amount: string | null;
  is_read: boolean | null;
  status: string | null;
  created_at: string;
  product_id: string | null;
  products: { name: string | null } | null;
};

type Hold = {
  id: string;
  product_id: string;
  customer_name: string | null;
  customer_email: string | null;
  expires_at: string | null;
  products: { name: string | null } | null;
};

/* ---------- helpers ---------- */

// Monday of the week containing `d`, returned as 'YYYY-MM-DD'
function mondayOf(d: Date): string {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(iso + "T00:00:00") : new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function fmtTimeUntil(iso: string | null): { label: string; expired: boolean; soon: boolean } {
  if (!iso) return { label: "—", expired: false, soon: false };
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { label: "expired", expired: true, soon: false };
  const h = Math.round(ms / 3600000);
  if (h < 24) return { label: `${h}h left`, expired: false, soon: true };
  const d = Math.round(h / 24);
  return { label: `${d}d left`, expired: false, soon: d <= 2 };
}

/* ============================================================ */
/* Component                                                    */
/* ============================================================ */

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stat[]>([
    { key: "available", label: "Available", count: 0, href: "/admin/products/available", icon: Package },
    { key: "draft", label: "Draft", count: 0, href: "/admin/products/draft", icon: Pencil },
    { key: "at_auction", label: "At Auction", count: 0, href: "/admin/products/at-auction", icon: Gavel },
    { key: "sold", label: "Sold", count: 0, href: "/admin/products/sold", icon: CheckCircle2 },
    { key: "on_hold", label: "On Hold", count: 0, href: "/admin/holds", icon: Clock },
  ]);

  const [weeks, setWeeks] = useState<ProductionWeek[]>([]);
  const [weekProducts, setWeekProducts] = useState<Record<string, WeekProduct[]>>({});
  const [editingWeek, setEditingWeek] = useState<ProductionWeek | null>(null);
  const [assignWeek, setAssignWeek] = useState<ProductionWeek | null>(null);

  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([]);
  const [recentOffers, setRecentOffers] = useState<Inquiry[]>([]);
  const [expiringHolds, setExpiringHolds] = useState<Hold[]>([]);

  const [loading, setLoading] = useState(true);

  /* The three weeks we care about: current Monday + next two Mondays */
  const weekTargets = useMemo(() => {
    const m0 = mondayOf(new Date());
    return [m0, addDays(m0, 7), addDays(m0, 14)];
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      // ---- Stats: count products by status ----
      const statusKeys: StatusKey[] = ["available", "draft", "at_auction", "sold", "on_hold"];
      const counts = await Promise.all(
        statusKeys.map((s) =>
          supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("status", s)
            .then((r) => r.count ?? 0),
        ),
      );
      setStats((prev) => prev.map((s, i) => ({ ...s, count: counts[i] })));

      // ---- Production weeks: fetch the three target weeks (auto-create if missing) ----
      const { data: existing } = await supabase
        .from("production_weeks")
        .select("*")
        .in("work_week_date", weekTargets);

      const byDate: Record<string, ProductionWeek> = {};
      (existing ?? []).forEach((w: any) => {
        byDate[w.work_week_date] = w;
      });

      const missing = weekTargets.filter((d) => !byDate[d]);
      if (missing.length) {
        const inserts = missing.map((d) => ({
          work_week_date: d,
          title: null,
          status: "planned",
          notes: null,
        }));
        const { data: created } = await supabase.from("production_weeks").insert(inserts).select("*");
        (created ?? []).forEach((w: any) => {
          byDate[w.work_week_date] = w;
        });
      }

      const ordered = weekTargets.map((d) => byDate[d]).filter(Boolean);
      setWeeks(ordered);

      // ---- Products assigned to those weeks ----
      const weekIds = ordered.map((w) => w.id);
      if (weekIds.length) {
        const { data: wpRows } = await supabase
          .from("production_week_products")
          .select("id, product_id, production_week_id, products(id, name, status)")
          .in("production_week_id", weekIds);
        const grouped: Record<string, WeekProduct[]> = {};
        (wpRows ?? []).forEach((r: any) => {
          (grouped[r.production_week_id] ||= []).push(r);
        });
        setWeekProducts(grouped);
      } else {
        setWeekProducts({});
      }

      // ---- Recent inquiries (non-offer) and offers ----
      const { data: inqRows } = await supabase
        .from("purchase_inquiries")
        .select("id, customer_name, customer_email, inquiry_type, message, offer_amount, is_read, status, created_at, product_id, products(name)")
        .neq("inquiry_type", "offer")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentInquiries((inqRows as any) ?? []);

      const { data: offRows } = await supabase
        .from("purchase_inquiries")
        .select("id, customer_name, customer_email, inquiry_type, message, offer_amount, is_read, status, created_at, product_id, products(name)")
        .eq("inquiry_type", "offer")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentOffers((offRows as any) ?? []);

      // ---- Expiring holds: next 7 days ----
      const sevenDays = new Date();
      sevenDays.setDate(sevenDays.getDate() + 7);
      const { data: holdRows } = await supabase
        .from("product_holds")
        .select("id, product_id, customer_name, customer_email, expires_at, products(name)")
        .lte("expires_at", sevenDays.toISOString())
        .order("expires_at", { ascending: true })
        .limit(10);
      setExpiringHolds((holdRows as any) ?? []);
    } catch (err) {
      console.error("dashboard load failed", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- render ---------- */

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lowercase tracking-tight">dashboard</h1>
        <button
          onClick={() => navigate("/admin/inventory")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition"
        >
          <Plus size={16} /> Add Inventory
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.key}
              to={s.href}
              className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs uppercase tracking-wide">{s.label}</span>
                <Icon size={14} />
              </div>
              <div className="text-2xl font-medium">{loading ? "—" : s.count.toLocaleString()}</div>
            </Link>
          );
        })}
      </div>

      {/* Production weeks */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-muted-foreground" />
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground">Production Weeks</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {weeks.map((w, i) => {
            const products = weekProducts[w.id] ?? [];
            const isCurrent = i === 0;
            return (
              <div
                key={w.id}
                className={`border rounded-lg p-4 bg-card ${isCurrent ? "ring-1 ring-primary/40" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {isCurrent ? "Current" : i === 1 ? "Next Week" : "In 2 Weeks"}
                    </div>
                    <div className="text-base mt-0.5">{w.title || `Week of ${fmtDate(w.work_week_date)}`}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(w.work_week_date)}</div>
                  </div>
                  <button
                    onClick={() => setEditingWeek(w)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Pencil size={13} />
                  </button>
                </div>

                <div className="mt-3 text-sm">
                  {products.length === 0 ? (
                    <div className="text-muted-foreground text-xs italic">No products assigned</div>
                  ) : (
                    <ul className="space-y-1">
                      {products.slice(0, 5).map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate">{p.products?.name ?? "Untitled"}</span>
                          <span className="text-muted-foreground shrink-0">{p.products?.status ?? ""}</span>
                        </li>
                      ))}
                      {products.length > 5 && (
                        <li className="text-xs text-muted-foreground">+{products.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </div>

                <button
                  onClick={() => setAssignWeek(w)}
                  className="mt-3 w-full text-xs px-3 py-1.5 rounded border hover:bg-muted transition"
                >
                  Assign Products
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Inquiries + Offers */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RecentList
          title="Recent Inquiries"
          icon={MessageSquare}
          rows={recentInquiries}
          emptyText="No inquiries"
          href="/admin/inquiries"
        />
        <RecentList
          title="Recent Offers"
          icon={HandCoins}
          rows={recentOffers}
          emptyText="No offers"
          href="/admin/offers"
          showAmount
        />
      </section>

      {/* Expiring holds */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground" />
            <h2 className="text-sm uppercase tracking-wide text-muted-foreground">Expiring Holds (next 7 days)</h2>
          </div>
          <Link to="/admin/holds" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            All holds <ChevronRight size={12} />
          </Link>
        </div>
        <div className="border rounded-lg bg-card divide-y">
          {expiringHolds.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground italic">No holds expiring soon</div>
          )}
          {expiringHolds.map((h) => {
            const t = fmtTimeUntil(h.expires_at);
            return (
              <div key={h.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{h.products?.name ?? "Untitled product"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {h.customer_name || h.customer_email || "—"}
                  </div>
                </div>
                <div className="text-xs shrink-0">
                  <span
                    className={
                      t.expired
                        ? "text-destructive"
                        : t.soon
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    }
                  >
                    {t.label}
                  </span>
                  <span className="text-muted-foreground ml-2">{fmtDate(h.expires_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modals */}
      {editingWeek && (
        <EditWeekModal
          week={editingWeek}
          onClose={() => setEditingWeek(null)}
          onSaved={() => {
            setEditingWeek(null);
            loadAll();
          }}
        />
      )}

      {assignWeek && (
        <AssignProductsModal
          week={assignWeek}
          existing={weekProducts[assignWeek.id] ?? []}
          onClose={() => setAssignWeek(null)}
          onSaved={() => {
            setAssignWeek(null);
            loadAll();
          }}
        />
      )}
    </div>
  );
}

/* ============================================================ */
/* RecentList                                                   */
/* ============================================================ */

function RecentList({
  title,
  icon: Icon,
  rows,
  emptyText,
  href,
  showAmount = false,
}: {
  title: string;
  icon: any;
  rows: Inquiry[];
  emptyText: string;
  href: string;
  showAmount?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-muted-foreground" />
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground">{title}</h2>
        </div>
        <Link to={href} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          View all <ChevronRight size={12} />
        </Link>
      </div>
      <div className="border rounded-lg bg-card divide-y">
        {rows.length === 0 && <div className="p-4 text-sm text-muted-foreground italic">{emptyText}</div>}
        {rows.map((r) => (
          <Link
            key={r.id}
            to={href}
            className={`block p-3 text-sm hover:bg-muted/50 transition ${
              r.is_read === false ? "bg-muted/20" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {r.is_read === false && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  <span className="truncate">{r.customer_name || r.customer_email || "Anonymous"}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.products?.name ?? "—"}
                </div>
              </div>
              <div className="text-right shrink-0">
                {showAmount && r.offer_amount && (
                  <div className="text-sm">${r.offer_amount}</div>
                )}
                <div className="text-xs text-muted-foreground">{fmtTimeAgo(r.created_at)}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ */
/* Edit week (title / date / notes)                             */
/* ============================================================ */

function EditWeekModal({
  week,
  onClose,
  onSaved,
}: {
  week: ProductionWeek;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(week.title ?? "");
  const [notes, setNotes] = useState(week.notes ?? "");
  const [date, setDate] = useState(week.work_week_date);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("production_weeks")
      .update({ title: title || null, notes: notes || null, work_week_date: date })
      .eq("id", week.id);
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    onSaved();
  }

  return (
    <ModalShell title="Edit Production Week" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Week of ${fmtDate(week.work_week_date)}`}
            className="w-full border rounded px-3 py-2 text-sm bg-background"
          />
        </Field>
        <Field label="Week Of (Monday)">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm bg-background"
          />
        </Field>
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border rounded px-3 py-2 text-sm bg-background"
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm border rounded">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </ModalShell>
  );
}

/* ============================================================ */
/* Assign products to week                                      */
/* ============================================================ */

function AssignProductsModal({
  week,
  existing,
  onClose,
  onSaved,
}: {
  week: ProductionWeek;
  existing: WeekProduct[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: string; name: string | null; status: string | null }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(existing.map((e) => e.product_id)),
  );
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  async function runSearch() {
    setSearching(true);
    let q = supabase.from("products").select("id, name, status").limit(50).order("name");
    if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
    const { data } = await q;
    setResults((data as any) ?? []);
    setSearching(false);
  }

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Always include existing rows in the visible list so we can uncheck them
  const existingProducts = existing
    .map((e) => e.products)
    .filter(Boolean) as { id: string; name: string | null; status: string | null }[];
  const merged = useMemo(() => {
    const map = new Map<string, { id: string; name: string | null; status: string | null }>();
    existingProducts.forEach((p) => map.set(p.id, p));
    results.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [results, existingProducts]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const original = new Set(existing.map((e) => e.product_id));
    const toAdd = [...selected].filter((id) => !original.has(id));
    const toRemove = [...original].filter((id) => !selected.has(id));

    if (toAdd.length) {
      const rows = toAdd.map((product_id) => ({
        production_week_id: week.id,
        product_id,
      }));
      const { error } = await supabase.from("production_week_products").insert(rows);
      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }
    if (toRemove.length) {
      const { error } = await supabase
        .from("production_week_products")
        .delete()
        .eq("production_week_id", week.id)
        .in("product_id", toRemove);
      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onSaved();
  }

  return (
    <ModalShell
      title={`Assign Products — ${week.title || fmtDate(week.work_week_date)}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Search products by name…"
            className="flex-1 border rounded px-3 py-2 text-sm bg-background"
          />
          <button onClick={runSearch} className="px-3 py-2 text-sm border rounded hover:bg-muted">
            Search
          </button>
        </div>

        <div className="text-xs text-muted-foreground">
          {selected.size} selected · {searching ? "searching…" : `${merged.length} shown`}
        </div>

        <div className="border rounded max-h-80 overflow-y-auto divide-y">
          {merged.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground italic">No products found</div>
          )}
          {merged.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-3 p-2 text-sm hover:bg-muted/40 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
              />
              <span className="flex-1 truncate">{p.name ?? "Untitled"}</span>
              <span className="text-xs text-muted-foreground">{p.status}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm border rounded">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Assignments"}
        </button>
      </div>
    </ModalShell>
  );
}

/* ============================================================ */
/* small primitives                                              */
/* ============================================================ */

function ModalShell({
  title,
  onClose,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className={`bg-background border rounded-lg shadow-lg w-full ${wide ? "max-w-2xl" : "max-w-md"} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
