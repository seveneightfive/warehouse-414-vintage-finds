import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  Mail,
  Phone,
  Package,
  Clock,
  CheckCheck,
  Circle,
} from "lucide-react";

type Inquiry = {
  id: string;
  product_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  inquiry_type: string | null;
  message: string | null;
  shipping_zip: string | null;
  is_read: boolean | null;
  created_at: string;
  products: { id: string; name: string | null } | null;
};

type FilterTab = "all" | "unread" | "read";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export default function AdminInquiries() {
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("purchase_inquiries")
      .select(
        "id, product_id, customer_name, customer_email, customer_phone, inquiry_type, message, shipping_zip, is_read, created_at, products(id, name)",
      )
      .neq("inquiry_type", "offer")
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setRows((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "unread") return rows.filter((r) => r.is_read === false);
    if (filter === "read") return rows.filter((r) => r.is_read === true);
    return rows;
  }, [rows, filter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      unread: rows.filter((r) => r.is_read === false).length,
      read: rows.filter((r) => r.is_read === true).length,
    }),
    [rows],
  );

  async function toggleRead(id: string, current: boolean | null) {
    const next = !(current ?? false);
    // Optimistic update
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: next } : r)));
    const { error } = await supabase
      .from("purchase_inquiries")
      .update({ is_read: next })
      .eq("id", id);
    if (error) {
      // revert
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: current } : r)));
      alert(error.message);
    }
  }

  async function markAllRead() {
    const unreadIds = rows.filter((r) => r.is_read === false).map((r) => r.id);
    if (!unreadIds.length) return;
    setRows((prev) => prev.map((r) => (unreadIds.includes(r.id) ? { ...r, is_read: true } : r)));
    const { error } = await supabase
      .from("purchase_inquiries")
      .update({ is_read: true })
      .in("id", unreadIds);
    if (error) {
      alert(error.message);
      load();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lowercase tracking-tight flex items-center gap-2">
          <MessageSquare size={20} /> inquiries
        </h1>
        {counts.unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <CheckCheck size={13} /> Mark all read ({counts.unread})
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b">
        {(["all", "unread", "read"] as FilterTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-2 text-sm capitalize border-b-2 -mb-px transition ${
              filter === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t} <span className="text-xs text-muted-foreground">({counts[t]})</span>
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {!loading && filtered.length === 0 && (
        <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
          No inquiries in this view.
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((r) => {
          const isOpen = activeId === r.id;
          const unread = r.is_read === false;
          return (
            <div
              key={r.id}
              className={`border rounded-lg bg-card overflow-hidden ${unread ? "border-primary/40" : ""}`}
            >
              <div className="flex items-stretch">
                <button
                  onClick={() => {
                    setActiveId(isOpen ? null : r.id);
                    if (!isOpen && unread) toggleRead(r.id, false);
                  }}
                  className="flex-1 text-left p-4 hover:bg-muted/30 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {unread && <span className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`${unread ? "font-medium" : ""}`}>
                            {r.customer_name || r.customer_email || "Anonymous"}
                          </span>
                          {r.inquiry_type && r.inquiry_type !== "general" && (
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {r.inquiry_type}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <Package size={11} />
                          <span className="truncate">{r.products?.name ?? "—"}</span>
                        </div>
                        {r.message && !isOpen && (
                          <div className="text-sm text-muted-foreground mt-1 truncate">
                            {r.message}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1 shrink-0">
                      <Clock size={10} /> {ago(r.created_at)}
                    </div>
                  </div>
                </button>

                {/* Read toggle (always accessible) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRead(r.id, r.is_read);
                  }}
                  title={r.is_read ? "Mark as unread" : "Mark as read"}
                  className="px-3 border-l hover:bg-muted/30 text-muted-foreground hover:text-foreground transition"
                >
                  {r.is_read ? <CheckCheck size={14} /> : <Circle size={14} />}
                </button>
              </div>

              {isOpen && (
                <div className="border-t p-4 bg-muted/10 space-y-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {r.customer_email && (
                      <a
                        href={`mailto:${r.customer_email}`}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <Mail size={11} /> {r.customer_email}
                      </a>
                    )}
                    {r.customer_phone && (
                      <a
                        href={`tel:${r.customer_phone}`}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <Phone size={11} /> {r.customer_phone}
                      </a>
                    )}
                    {r.shipping_zip && <span>ZIP {r.shipping_zip}</span>}
                    <span>· {fmt(r.created_at)}</span>
                  </div>
                  {r.message && (
                    <div className="text-sm bg-background border rounded p-3 whitespace-pre-wrap">
                      {r.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
