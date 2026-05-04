import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Check,
  X,
  Reply,
  HandCoins,
  Mail,
  Phone,
  Package,
  Clock,
} from "lucide-react";

type Offer = {
  id: string;
  product_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  message: string | null;
  offer_amount: string | null;
  shipping_zip: string | null;
  is_read: boolean | null;
  status: string | null; // 'new' | 'accepted' | 'declined' | 'countered' | 'closed'
  admin_response: string | null;
  counter_amount: number | null;
  responded_at: string | null;
  created_at: string;
  products: { id: string; name: string | null; price: number | null; status: string | null } | null;
};

type FilterTab = "all" | "new" | "accepted" | "declined" | "countered";

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

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "new";
  const map: Record<string, string> = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    accepted: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    declined: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    countered: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    closed: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${map[s] ?? map.new}`}>
      {s}
    </span>
  );
}

/* ---------- Quick-reply templates ---------- */

const TEMPLATES: Record<string, string> = {
  accepted:
    "Hi {{name}},\n\nThanks for your offer of ${{amount}} on {{product}}. We're happy to accept — I'll follow up shortly with payment and shipping details.\n\nBest,",
  declined:
    "Hi {{name}},\n\nThank you for your offer on {{product}}. Unfortunately, we're not able to accept it at this time. Please let us know if you'd like to discuss a different price.\n\nBest,",
  countered:
    "Hi {{name}},\n\nThanks for your interest in {{product}}. We're not able to do ${{amount}}, but we could meet you at ${{counter}}. Let me know if that works.\n\nBest,",
};

function fillTemplate(t: string, o: Offer, counter: string): string {
  return t
    .replace(/\{\{name\}\}/g, o.customer_name?.split(" ")[0] ?? "there")
    .replace(/\{\{amount\}\}/g, o.offer_amount ?? "—")
    .replace(/\{\{product\}\}/g, o.products?.name ?? "this piece")
    .replace(/\{\{counter\}\}/g, counter || "—");
}

/* ============================================================ */

export default function AdminOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  // per-row response state (only relevant while an action panel is open)
  const [responseText, setResponseText] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [pendingAction, setPendingAction] = useState<"accept" | "decline" | "counter" | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("purchase_inquiries")
      .select(
        "id, product_id, customer_name, customer_email, customer_phone, message, offer_amount, shipping_zip, is_read, status, admin_response, counter_amount, responded_at, created_at, products(id, name, price, status)",
      )
      .eq("inquiry_type", "offer")
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setOffers((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return offers;
    return offers.filter((o) => (o.status ?? "new") === filter);
  }, [offers, filter]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: offers.length, new: 0, accepted: 0, declined: 0, countered: 0 };
    offers.forEach((o) => {
      const s = o.status ?? "new";
      if (out[s] !== undefined) out[s]++;
    });
    return out;
  }, [offers]);

  async function markRead(id: string, current: boolean | null) {
    const { error } = await supabase
      .from("purchase_inquiries")
      .update({ is_read: !(current ?? false) })
      .eq("id", id);
    if (!error) {
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, is_read: !(current ?? false) } : o)));
    }
  }

  function openAction(o: Offer, action: "accept" | "decline" | "counter") {
    setActiveId(o.id);
    setPendingAction(action);
    setCounterAmount(action === "counter" ? "" : "");
    const tplKey = action === "accept" ? "accepted" : action === "decline" ? "declined" : "countered";
    setResponseText(fillTemplate(TEMPLATES[tplKey], o, ""));
  }

  function cancelAction() {
    setPendingAction(null);
    setResponseText("");
    setCounterAmount("");
  }

  async function submitAction(o: Offer) {
    if (!pendingAction) return;
    setSaving(true);
    const newStatus =
      pendingAction === "accept" ? "accepted" : pendingAction === "decline" ? "declined" : "countered";
    const update: any = {
      status: newStatus,
      admin_response: responseText || null,
      responded_at: new Date().toISOString(),
      is_read: true,
    };
    if (pendingAction === "counter") {
      const n = Number(counterAmount);
      if (!Number.isFinite(n) || n <= 0) {
        alert("Enter a counter amount");
        setSaving(false);
        return;
      }
      update.counter_amount = n;
    } else {
      update.counter_amount = null;
    }
    const { error } = await supabase
      .from("purchase_inquiries")
      .update(update)
      .eq("id", o.id);
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    cancelAction();
    setActiveId(null);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lowercase tracking-tight flex items-center gap-2">
          <HandCoins size={20} /> offers
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b">
        {(["all", "new", "countered", "accepted", "declined"] as FilterTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-2 text-sm capitalize border-b-2 -mb-px transition ${
              filter === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t} <span className="text-xs text-muted-foreground">({counts[t] ?? 0})</span>
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {!loading && filtered.length === 0 && (
        <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
          No offers in this view.
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.map((o) => {
          const isOpen = activeId === o.id;
          const unread = o.is_read === false;
          return (
            <div
              key={o.id}
              className={`border rounded-lg bg-card overflow-hidden ${unread ? "border-primary/40" : ""}`}
            >
              {/* Row header (always visible) */}
              <button
                onClick={() => {
                  setActiveId(isOpen ? null : o.id);
                  if (!isOpen && unread) markRead(o.id, false);
                  if (isOpen) cancelAction();
                }}
                className="w-full text-left p-4 hover:bg-muted/30 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {unread && <span className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {o.customer_name || o.customer_email || "Anonymous"}
                        </span>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <Package size={11} />
                        <span className="truncate">{o.products?.name ?? "—"}</span>
                        {o.products?.price != null && (
                          <span>· asking ${Number(o.products.price).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {o.offer_amount && (
                      <div className="text-base font-medium">${o.offer_amount}</div>
                    )}
                    {o.counter_amount != null && o.status === "countered" && (
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        countered ${Number(o.counter_amount).toLocaleString()}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {ago(o.created_at)}
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded panel */}
              {isOpen && (
                <div className="border-t p-4 bg-muted/10 space-y-4">
                  {/* Contact */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {o.customer_email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail size={11} /> {o.customer_email}
                      </span>
                    )}
                    {o.customer_phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={11} /> {o.customer_phone}
                      </span>
                    )}
                    {o.shipping_zip && <span>ZIP {o.shipping_zip}</span>}
                    <span>· {fmt(o.created_at)}</span>
                  </div>

                  {/* Message */}
                  {o.message && (
                    <div className="text-sm bg-background border rounded p-3 whitespace-pre-wrap">
                      {o.message}
                    </div>
                  )}

                  {/* Existing admin response */}
                  {o.admin_response && !pendingAction && (
                    <div className="text-sm">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        Your reply · {fmt(o.responded_at)}
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded p-3 whitespace-pre-wrap">
                        {o.admin_response}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!pendingAction && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openAction(o, "accept")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        onClick={() => openAction(o, "counter")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-amber-600 text-white hover:bg-amber-700"
                      >
                        <Reply size={14} /> Counter
                      </button>
                      <button
                        onClick={() => openAction(o, "decline")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                      >
                        <X size={14} /> Decline
                      </button>
                      <button
                        onClick={() => markRead(o.id, o.is_read)}
                        className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                      >
                        Mark as {o.is_read ? "unread" : "read"}
                      </button>
                    </div>
                  )}

                  {/* Action panel */}
                  {pendingAction && (
                    <div className="space-y-3 border-t pt-4">
                      <div className="text-sm font-medium capitalize">{pendingAction} offer</div>

                      {pendingAction === "counter" && (
                        <div>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                            Counter amount
                          </div>
                          <input
                            type="number"
                            value={counterAmount}
                            onChange={(e) => {
                              setCounterAmount(e.target.value);
                              setResponseText(fillTemplate(TEMPLATES.countered, o, e.target.value));
                            }}
                            placeholder="0.00"
                            className="w-40 border rounded px-3 py-2 text-sm bg-background"
                          />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Reply (placeholder — copy & paste into email)
                          </div>
                          <button
                            onClick={() => {
                              const tplKey =
                                pendingAction === "accept"
                                  ? "accepted"
                                  : pendingAction === "decline"
                                  ? "declined"
                                  : "countered";
                              setResponseText(fillTemplate(TEMPLATES[tplKey], o, counterAmount));
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Reset template
                          </button>
                        </div>
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          rows={6}
                          className="w-full border rounded px-3 py-2 text-sm bg-background font-mono"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button onClick={cancelAction} className="px-3 py-1.5 text-sm border rounded">
                          Cancel
                        </button>
                        <button
                          onClick={() => submitAction(o)}
                          disabled={saving}
                          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded disabled:opacity-50"
                        >
                          {saving ? "Saving…" : `Save ${pendingAction}`}
                        </button>
                      </div>
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
