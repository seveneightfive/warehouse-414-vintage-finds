import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────
interface Consignor {
  id: number;
  first_name: string | null;
  last_name: string | null;
  consignor_code: string | null;
}

interface InventoryProduct {
  id: string;
  name: string;
  price: number | null;
  status: string;
  date_received: string | null;
  notes: string | null;
  materials: string | null;
  intake_image_1: string | null;
  intake_image_2: string | null;
  intake_image_3: string | null;
  consignor_id: number | null;
  consignors: Consignor | null;
  production_week_products?: { production_week_id: string }[];
}

interface ProductionWeek {
  id: string;
  title: string;
  work_week_date: string;
  status: string | null;
  notes: string | null;
}

interface ProductionWeekWithProducts extends ProductionWeek {
  products: InventoryProduct[];
}

// ── Utility ────────────────────────────────────────────────────────────────
function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function consignorLabel(c: Consignor | null) {
  if (!c) return "—";
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return c.consignor_code ? `${c.consignor_code} · ${name}` : name || "—";
}

// ── Upload helper ──────────────────────────────────────────────────────────
async function uploadIntakeImage(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("intake-images")
    .upload(path, file, { upsert: false });
  if (error) { console.error(error); return null; }
  const { data } = supabase.storage.from("intake-images").getPublicUrl(path);
  return data.publicUrl;
}

// ── Add Inventory Modal ────────────────────────────────────────────────────
function AddInventoryModal({
  consignors,
  onClose,
  onSaved,
}: {
  consignors: Consignor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    consignor_id: "",
    price: "",
    date_received: new Date().toISOString().split("T")[0],
    notes: "",
    materials: "",
  });
  const [images, setImages] = useState<(File | null)[]>([null, null, null]);
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function handleImageChange(idx: number, file: File | null) {
    const next = [...images];
    next[idx] = file;
    setImages(next);
    const prevNext = [...previews];
    prevNext[idx] = file ? URL.createObjectURL(file) : null;
    setPreviews(prevNext);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError(null);

    const urls: (string | null)[] = [null, null, null];
    for (let i = 0; i < 3; i++) {
      if (images[i]) urls[i] = await uploadIntakeImage(images[i]!);
    }

    const { error: dbErr } = await supabase.from("products").insert({
      name: form.name.trim(),
      consignor_id: form.consignor_id ? Number(form.consignor_id) : null,
      price: form.price ? parseFloat(form.price) : null,
      status: "inventory",
      date_received: form.date_received || null,
      notes: form.notes.trim() || null,
      materials: form.materials.trim() || null,
      intake_image_1: urls[0],
      intake_image_2: urls[1],
      intake_image_3: urls[2],
      slug: form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now(),
    });

    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>Add Inventory</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            <div className="form-field full">
              <label>Title <span className="req">*</span></label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Item title"
              />
            </div>

            <div className="form-field">
              <label>Consignor</label>
              <select
                value={form.consignor_id}
                onChange={(e) => setForm({ ...form, consignor_id: e.target.value })}
              >
                <option value="">— None —</option>
                {consignors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {consignorLabel(c)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Est. Price</label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-field">
              <label>Date Received</label>
              <input
                type="date"
                value={form.date_received}
                onChange={(e) => setForm({ ...form, date_received: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>Materials</label>
              <input
                value={form.materials}
                onChange={(e) => setForm({ ...form, materials: e.target.value })}
                placeholder="e.g. walnut, brass, wool"
              />
            </div>

            <div className="form-field full">
              <label>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Condition notes, provenance, etc."
                rows={3}
              />
            </div>
          </div>

          <div className="image-upload-section">
            <label className="section-label">Intake Photos <span className="muted">(internal reference, up to 3)</span></label>
            <div className="image-upload-row">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`image-slot ${previews[idx] ? "has-image" : ""}`}
                  onClick={() => fileRefs[idx].current?.click()}
                >
                  {previews[idx] ? (
                    <>
                      <img src={previews[idx]!} alt="" />
                      <button
                        className="remove-image"
                        onClick={(e) => { e.stopPropagation(); handleImageChange(idx, null); }}
                      >✕</button>
                    </>
                  ) : (
                    <div className="image-placeholder">
                      <span className="plus">+</span>
                      <span className="slot-label">Photo {idx + 1}</span>
                    </div>
                  )}
                  <input
                    ref={fileRefs[idx]}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleImageChange(idx, e.target.files?.[0] || null)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Add to Inventory"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Inventory Modal ───────────────────────────────────────────────────
function EditInventoryModal({
  product,
  consignors,
  onClose,
  onSaved,
}: {
  product: InventoryProduct;
  consignors: Consignor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: product.name || "",
    consignor_id: product.consignor_id ? String(product.consignor_id) : "",
    price: product.price != null ? String(product.price) : "",
    date_received: product.date_received || "",
    notes: product.notes || "",
    materials: product.materials || "",
  });
  const [imageUrls, setImageUrls] = useState<(string | null)[]>([
    product.intake_image_1,
    product.intake_image_2,
    product.intake_image_3,
  ]);
  const [newFiles, setNewFiles] = useState<(File | null)[]>([null, null, null]);
  const [previews, setPreviews] = useState<(string | null)[]>([
    product.intake_image_1,
    product.intake_image_2,
    product.intake_image_3,
  ]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const isAssignedToWeek = !!(product.production_week_products && product.production_week_products.length > 0);

  function handleImageChange(idx: number, file: File | null) {
    const nf = [...newFiles];
    nf[idx] = file;
    setNewFiles(nf);

    const pv = [...previews];
    pv[idx] = file ? URL.createObjectURL(file) : null;
    setPreviews(pv);

    const urls = [...imageUrls];
    urls[idx] = null;
    setImageUrls(urls);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError(null);

    const finalUrls: (string | null)[] = [...imageUrls];
    for (let i = 0; i < 3; i++) {
      if (newFiles[i]) {
        const url = await uploadIntakeImage(newFiles[i]!);
        finalUrls[i] = url;
      }
    }

    const { error: dbErr } = await supabase
      .from("products")
      .update({
        name: form.name.trim(),
        consignor_id: form.consignor_id ? Number(form.consignor_id) : null,
        price: form.price ? parseFloat(form.price) : null,
        date_received: form.date_received || null,
        notes: form.notes.trim() || null,
        materials: form.materials.trim() || null,
        intake_image_1: finalUrls[0],
        intake_image_2: finalUrls[1],
        intake_image_3: finalUrls[2],
      })
      .eq("id", product.id);

    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    onSaved();
    onClose();
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    if (isAssignedToWeek) {
      const { error: joinErr } = await supabase
        .from("production_week_products")
        .delete()
        .eq("product_id", product.id);
      if (joinErr) {
        setError(joinErr.message);
        setDeleting(false);
        return;
      }
    }

    const { error: dbErr } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    setDeleting(false);
    if (dbErr) { setError(dbErr.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>Edit Inventory</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          {isAssignedToWeek && (
            <div className="form-info">
              This item is currently assigned to a production week.
            </div>
          )}

          <div className="form-grid">
            <div className="form-field full">
              <label>Title <span className="req">*</span></label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Item title"
              />
            </div>

            <div className="form-field">
              <label>Consignor</label>
              <select
                value={form.consignor_id}
                onChange={(e) => setForm({ ...form, consignor_id: e.target.value })}
              >
                <option value="">— None —</option>
                {consignors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {consignorLabel(c)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Est. Price</label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-field">
              <label>Date Received</label>
              <input
                type="date"
                value={form.date_received}
                onChange={(e) => setForm({ ...form, date_received: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>Materials</label>
              <input
                value={form.materials}
                onChange={(e) => setForm({ ...form, materials: e.target.value })}
                placeholder="e.g. walnut, brass, wool"
              />
            </div>

            <div className="form-field full">
              <label>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Condition notes, provenance, etc."
                rows={3}
              />
            </div>
          </div>

          <div className="image-upload-section">
            <label className="section-label">Intake Photos <span className="muted">(click to replace)</span></label>
            <div className="image-upload-row">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`image-slot ${previews[idx] ? "has-image" : ""}`}
                  onClick={() => fileRefs[idx].current?.click()}
                >
                  {previews[idx] ? (
                    <>
                      <img src={previews[idx]!} alt="" />
                      <button
                        className="remove-image"
                        onClick={(e) => { e.stopPropagation(); handleImageChange(idx, null); }}
                      >✕</button>
                    </>
                  ) : (
                    <div className="image-placeholder">
                      <span className="plus">+</span>
                      <span className="slot-label">Photo {idx + 1}</span>
                    </div>
                  )}
                  <input
                    ref={fileRefs[idx]}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleImageChange(idx, e.target.files?.[0] || null)}
                  />
                </div>
              ))}
            </div>
          </div>

          {confirmDelete && (
            <div className="delete-confirm">
              <p><strong>Delete this item?</strong> This cannot be undone.{isAssignedToWeek && " It will also be removed from its production week."}</p>
              <div className="delete-confirm-actions">
                <button className="btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Cancel
                </button>
                <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer modal-footer--split">
          <button
            className="btn-danger-outline"
            onClick={() => setConfirmDelete(true)}
            disabled={saving || deleting || confirmDelete}
          >
            Delete
          </button>
          <div className="footer-right">
            <button className="btn-secondary" onClick={onClose} disabled={saving || deleting}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || deleting}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Production Week Modal ───────────────────────────────────────────
function CreateWeekModal({
  selectedIds,
  onClose,
  onSaved,
}: {
  selectedIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [weekDate, setWeekDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) { setError("Week title is required."); return; }
    setSaving(true);
    setError(null);

    const { data: week, error: wErr } = await supabase
      .from("production_weeks")
      .insert({ title: title.trim(), work_week_date: weekDate, notes: notes.trim() || null })
      .select()
      .single();

    if (wErr || !week) { setError(wErr?.message || "Failed to create week."); setSaving(false); return; }

    const rows = selectedIds.map((pid, i) => ({
      production_week_id: week.id,
      product_id: pid,
      sort_order: i,
    }));

    const { error: jErr } = await supabase.from("production_week_products").insert(rows);
    setSaving(false);
    if (jErr) { setError(jErr.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-box--sm">
        <div className="modal-header">
          <h2>Create Production Week</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <p className="week-item-count">{selectedIds.length} item{selectedIds.length !== 1 ? "s" : ""} selected</p>

          <div className="form-grid">
            <div className="form-field full">
              <label>Week Title <span className="req">*</span></label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Spring Drop Wk 1"
              />
            </div>
            <div className="form-field">
              <label>Week of</label>
              <input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
            </div>
            <div className="form-field full">
              <label>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Creating…" : "Create Week"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Production Week Modal ─────────────────────────────────────────────
function EditWeekModal({
  week,
  onClose,
  onSaved,
}: {
  week: ProductionWeek;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(week.title || "");
  const [weekDate, setWeekDate] = useState(week.work_week_date || "");
  const [status, setStatus] = useState(week.status || "planned");
  const [notes, setNotes] = useState(week.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) { setError("Week title is required."); return; }
    setSaving(true);
    setError(null);

    const { error: wErr } = await supabase
      .from("production_weeks")
      .update({
        title: title.trim(),
        work_week_date: weekDate,
        status,
        notes: notes.trim() || null,
      })
      .eq("id", week.id);

    setSaving(false);
    if (wErr) { setError(wErr.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-box--sm">
        <div className="modal-header">
          <h2>Edit Production Week</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            <div className="form-field full">
              <label>Week Title <span className="req">*</span></label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Week of</label>
              <input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="form-field full">
              <label>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminInventory() {
  const [view, setView] = useState<"inventory" | "weeks">("inventory");
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [consignors, setConsignors] = useState<Consignor[]>([]);
  const [weeks, setWeeks] = useState<ProductionWeekWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [editingWeek, setEditingWeek] = useState<ProductionWeek | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    const [{ data: prods }, { data: cons }, { data: ws }] = await Promise.all([
      supabase
        .from("products")
        .select(`
          id, name, price, status, date_received, notes, materials,
          intake_image_1, intake_image_2, intake_image_3, consignor_id,
          consignors ( id, first_name, last_name, consignor_code ),
          production_week_products ( production_week_id )
        `)
        .eq("status", "inventory")
        .order("date_received", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("consignors").select("id, first_name, last_name, consignor_code").order("last_name"),
      supabase
        .from("production_weeks")
        .select(`
          id, title, work_week_date, status, notes,
          production_week_products (
            sort_order,
            products (
              id, name, price, status, date_received, notes, materials,
              intake_image_1, intake_image_2, intake_image_3, consignor_id,
              consignors ( id, first_name, last_name, consignor_code )
            )
          )
        `)
        .order("work_week_date", { ascending: false }),
    ]);

    setProducts((prods as InventoryProduct[]) || []);
    setConsignors((cons as Consignor[]) || []);

    // Flatten production_week_products → products array, sorted by sort_order
    const weeksFlat: ProductionWeekWithProducts[] = ((ws as any[]) || []).map((w) => {
      const items = (w.production_week_products || [])
        .slice()
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((joined: any) => joined.products)
        .filter(Boolean);
      return {
        id: w.id,
        title: w.title,
        work_week_date: w.work_week_date,
        status: w.status,
        notes: w.notes,
        products: items,
      };
    });
    setWeeks(weeksFlat);

    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.id)));
  }

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const ungrouped = filtered.filter(
    (p) => !p.production_week_products?.length
  );
  const grouped = filtered.filter(
    (p) => p.production_week_products && p.production_week_products.length > 0
  );

  // Search-filtered weeks: a week shows if its title matches OR any of its items match
  const filteredWeeks = weeks
    .map((w) => ({
      ...w,
      products: search
        ? w.products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
        : w.products,
    }))
    .filter((w) =>
      !search ||
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.products.length > 0
    );

  const totalItemsInWeeks = weeks.reduce((sum, w) => sum + w.products.length, 0);

  return (
    <>
      <style>{`
        /* ── Base ── */
        .inv-page { font-family: 'Josefin Sans', system-ui, sans-serif; color: var(--foreground, #111); background: var(--background, #fafaf8); min-height: 100vh; }
        
        /* ── Header ── */
        .inv-header { display: flex; align-items: center; justify-content: space-between; padding: 28px 32px 0; border-bottom: 2px solid #e5e2d9; padding-bottom: 20px; }
        .inv-header h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; margin: 0; }
        .inv-meta { font-size: .75rem; color: #888; margin-top: 2px; }
        .btn-add-inventory { background: #111; color: #fff; border: none; padding: 10px 20px; font-family: inherit; font-size: .8rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; transition: background .15s; }
        .btn-add-inventory:hover { background: #333; }
        
        /* ── Toolbar ── */
        .inv-toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 32px; border-bottom: 1px solid #e5e2d9; flex-wrap: wrap; }
        .inv-search { flex: 1; max-width: 320px; min-width: 200px; }
        .inv-search input { width: 100%; border: 1px solid #d8d4cb; background: #fff; padding: 8px 12px; font-family: inherit; font-size: .85rem; outline: none; color: #111; }
        .inv-search input:focus { border-color: #111; }
        .inv-count { font-size: .75rem; color: #888; margin-left: auto; }
        .btn-group-week { background: #f0ede6; color: #111; border: 1px solid #c8c4bb; padding: 8px 16px; font-family: inherit; font-size: .78rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; transition: background .15s; }
        .btn-group-week:hover:not(:disabled) { background: #e0dcd3; }
        .btn-group-week:disabled { opacity: .4; cursor: default; }
        .btn-view-weeks {
          background: #fff;
          color: #111;
          border: 1px solid #c8c4bb;
          padding: 8px 16px;
          font-family: inherit;
          font-size: .78rem;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all .15s;
        }
        .btn-view-weeks:hover { background: #f0ede6; }
        .btn-view-weeks.is-active {
          background: #111;
          color: #fff;
          border-color: #111;
        }
        
        /* ── Table ── */
        .inv-table-wrap { padding: 24px 32px; }
        .inv-section-label { font-size: .7rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #999; margin-bottom: 8px; }
        table.inv-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        .inv-table th { font-size: .7rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #888; padding: 6px 10px; border-bottom: 2px solid #e5e2d9; text-align: left; background: transparent; }
        .inv-table td { padding: 10px 10px; border-bottom: 1px solid #eeebe4; font-size: .82rem; vertical-align: middle; }
        .inv-table tr:hover td { background: #f7f5f0; }
        .inv-table tr.is-selected td { background: #fdf8ee; }
        .inv-table input[type=checkbox] { accent-color: #111; width: 14px; height: 14px; cursor: pointer; }
        .cell-thumb { display: flex; gap: 4px; }
        .thumb { width: 36px; height: 36px; object-fit: cover; border: 1px solid #e0ddd4; }
        .thumb-empty { width: 36px; height: 36px; background: #f0ede6; border: 1px dashed #ccc; }
        .cell-title { font-weight: 600; color: #111; }
        .cell-consignor { color: #666; }
        .cell-price { font-variant-numeric: tabular-nums; }
        .badge-grouped { display: inline-block; font-size: .65rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; background: #e8f5e9; color: #2e7d32; padding: 2px 7px; border: 1px solid #c8e6c9; }
        .empty-state { text-align: center; padding: 48px; color: #aaa; font-size: .9rem; }

        /* ── Row action button ── */
        .col-actions { width: 60px; text-align: right; }
        .btn-edit-row {
          background: transparent;
          border: 1px solid #d8d4cb;
          color: #555;
          font-family: inherit;
          font-size: .68rem;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          padding: 4px 10px;
          cursor: pointer;
          transition: all .15s;
        }
        .btn-edit-row:hover {
          background: #111;
          color: #fff;
          border-color: #111;
        }

        /* ── Production week section ── */
        .week-section {
          margin-bottom: 32px;
          border: 1px solid #e5e2d9;
          background: #fff;
        }
        .week-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 20px;
          background: #f7f5f0;
          border-bottom: 1px solid #e5e2d9;
        }
        .week-header-info { flex: 1; min-width: 0; }
        .week-header-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
        .week-title {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: #111;
          margin: 0;
        }
        .week-date {
          font-size: .78rem;
          color: #555;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .week-status {
          display: inline-block;
          font-size: .62rem;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          padding: 2px 8px;
          border: 1px solid;
        }
        .week-status--planned { background: #eef2ff; color: #3f4cb1; border-color: #c8d0f0; }
        .week-status--in_progress { background: #fff7e0; color: #8a6800; border-color: #f0deb0; }
        .week-status--complete { background: #e8f5e9; color: #2e7d32; border-color: #c8e6c9; }
        .week-status--archived { background: #f0f0f0; color: #777; border-color: #d8d4cb; }
        .week-notes {
          font-size: .8rem;
          color: #666;
          margin: 6px 0 0;
          line-height: 1.45;
        }
        .week-meta-counts { font-size: .72rem; color: #888; margin-top: 4px; }
        .btn-edit-week {
          background: transparent;
          border: 1px solid #c8c4bb;
          color: #555;
          font-family: inherit;
          font-size: .68rem;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          padding: 5px 11px;
          cursor: pointer;
          transition: all .15s;
          flex-shrink: 0;
        }
        .btn-edit-week:hover {
          background: #111;
          color: #fff;
          border-color: #111;
        }
        .week-table-wrap { padding: 0; }
        .week-table-wrap table.inv-table { margin-bottom: 0; }
        .week-table-wrap .inv-table th:first-child,
        .week-table-wrap .inv-table td:first-child { padding-left: 20px; }
        .week-table-wrap .inv-table th:last-child,
        .week-table-wrap .inv-table td:last-child { padding-right: 20px; }
        .week-table-wrap .inv-table tr:last-child td { border-bottom: none; }
        .week-empty {
          padding: 20px;
          text-align: center;
          color: #aaa;
          font-size: .85rem;
          font-style: italic;
        }
        
        /* ── Modals ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
        .modal-box { background: #fff; width: 100%; max-width: 620px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; }
        .modal-box--sm { max-width: 440px; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid #e5e2d9; }
        .modal-header h2 { font-size: 1rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; margin: 0; }
        .modal-close { background: none; border: none; font-size: 1rem; cursor: pointer; color: #666; padding: 0 4px; }
        .modal-close:hover { color: #111; }
        .modal-body { padding: 20px 24px; flex: 1; }
        .modal-footer { padding: 16px 24px; border-top: 1px solid #e5e2d9; display: flex; gap: 10px; justify-content: flex-end; }
        .modal-footer--split { justify-content: space-between; }
        .footer-right { display: flex; gap: 10px; }
        
        /* ── Form ── */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-field { display: flex; flex-direction: column; gap: 4px; }
        .form-field.full { grid-column: 1 / -1; }
        .form-field label { font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #777; }
        .form-field input, .form-field select, .form-field textarea { border: 1px solid #d8d4cb; padding: 8px 10px; font-family: inherit; font-size: .85rem; color: #111; background: #fff; outline: none; resize: vertical; }
        .form-field input:focus, .form-field select:focus, .form-field textarea:focus { border-color: #111; }
        .input-prefix { display: flex; align-items: center; border: 1px solid #d8d4cb; background: #fff; }
        .input-prefix span { padding: 0 8px; color: #999; font-size: .85rem; }
        .input-prefix input { border: none; padding: 8px 8px 8px 0; flex: 1; outline: none; font-family: inherit; font-size: .85rem; }
        .form-error { background: #ffeaea; border: 1px solid #ffbaba; color: #c00; padding: 8px 12px; font-size: .82rem; margin-bottom: 12px; }
        .form-info { background: #fdf8ee; border: 1px solid #f0e4c2; color: #6b5a1f; padding: 8px 12px; font-size: .82rem; margin-bottom: 12px; }
        .req { color: #e00; }
        
        /* ── Image upload ── */
        .image-upload-section { margin-top: 20px; }
        .section-label { font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #777; display: block; margin-bottom: 10px; }
        .muted { font-weight: 400; color: #aaa; text-transform: none; letter-spacing: 0; }
        .image-upload-row { display: flex; gap: 10px; }
        .image-slot { width: 120px; height: 100px; border: 1.5px dashed #ccc; cursor: pointer; position: relative; overflow: hidden; flex-shrink: 0; transition: border-color .15s; }
        .image-slot:hover { border-color: #111; }
        .image-slot img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .image-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 4px; }
        .image-placeholder .plus { font-size: 1.4rem; color: #bbb; line-height: 1; }
        .slot-label { font-size: .68rem; color: #bbb; letter-spacing: .05em; }
        .remove-image { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,.55); color: #fff; border: none; width: 20px; height: 20px; cursor: pointer; font-size: .7rem; display: flex; align-items: center; justify-content: center; }
        
        /* ── Buttons ── */
        .btn-primary { background: #111; color: #fff; border: none; padding: 10px 22px; font-family: inherit; font-size: .8rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }
        .btn-primary:hover:not(:disabled) { background: #333; }
        .btn-primary:disabled { opacity: .5; cursor: default; }
        .btn-secondary { background: transparent; color: #111; border: 1px solid #d8d4cb; padding: 10px 22px; font-family: inherit; font-size: .8rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }
        .btn-secondary:hover { background: #f5f2eb; }
        .btn-danger { background: #c0392b; color: #fff; border: none; padding: 10px 22px; font-family: inherit; font-size: .8rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }
        .btn-danger:hover:not(:disabled) { background: #a93226; }
        .btn-danger:disabled { opacity: .5; cursor: default; }
        .btn-danger-outline { background: transparent; color: #c0392b; border: 1px solid #e6c2bd; padding: 10px 22px; font-family: inherit; font-size: .8rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }
        .btn-danger-outline:hover:not(:disabled) { background: #fdecea; border-color: #c0392b; }
        .btn-danger-outline:disabled { opacity: .4; cursor: default; }

        /* ── Delete confirm ── */
        .delete-confirm {
          margin-top: 20px;
          padding: 14px 16px;
          background: #fdecea;
          border: 1px solid #f5c2bc;
        }
        .delete-confirm p { margin: 0 0 10px; font-size: .85rem; color: #7a2419; }
        .delete-confirm-actions { display: flex; gap: 8px; justify-content: flex-end; }

        /* ── Week count badge ── */
        .week-item-count { font-size: .85rem; color: #555; margin: 0 0 16px; padding: 10px 12px; background: #f7f5f0; border-left: 3px solid #111; }
      `}</style>

      <div className="inv-page">
        {/* Header */}
        <div className="inv-header">
          <div>
            <h1>Inventory</h1>
            <div className="inv-meta">
              {view === "inventory"
                ? `${products.length} item${products.length !== 1 ? "s" : ""} in inventory`
                : `${weeks.length} production week${weeks.length !== 1 ? "s" : ""} · ${totalItemsInWeeks} item${totalItemsInWeeks !== 1 ? "s" : ""} assigned`}
            </div>
          </div>
          <button className="btn-add-inventory" onClick={() => setShowAddModal(true)}>
            + Add Inventory
          </button>
        </div>

        {/* Toolbar */}
        <div className="inv-toolbar">
          <div className="inv-search">
            <input
              placeholder={view === "inventory" ? "Search inventory…" : "Search weeks or items…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {view === "inventory" && (
            <button
              className="btn-group-week"
              disabled={selected.size === 0}
              onClick={() => setShowWeekModal(true)}
            >
              Group into Week {selected.size > 0 ? `(${selected.size})` : ""}
            </button>
          )}
          <button
            className={`btn-view-weeks ${view === "weeks" ? "is-active" : ""}`}
            onClick={() => {
              setSelected(new Set());
              setView(view === "weeks" ? "inventory" : "weeks");
            }}
          >
            {view === "weeks" ? "← Back to Inventory" : `Production Weeks (${weeks.length})`}
          </button>
          <span className="inv-count">
            {view === "inventory" ? `${filtered.length} shown` : `${filteredWeeks.length} week${filteredWeeks.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Body */}
        <div className="inv-table-wrap">
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : view === "inventory" ? (
            // ── INVENTORY VIEW ──────────────────────────────────────────────
            filtered.length === 0 ? (
              <div className="empty-state">No inventory items found.</div>
            ) : (
              <>
                {ungrouped.length > 0 && (
                  <>
                    <div className="inv-section-label">Unassigned ({ungrouped.length})</div>
                    <table className="inv-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              checked={selected.size === filtered.length && filtered.length > 0}
                              onChange={toggleAll}
                            />
                          </th>
                          <th>Photos</th>
                          <th>Title</th>
                          <th>Consignor</th>
                          <th>Est. Price</th>
                          <th>Received</th>
                          <th>Materials</th>
                          <th>Notes</th>
                          <th className="col-actions"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {ungrouped.map((p) => (
                          <tr key={p.id} className={selected.has(p.id) ? "is-selected" : ""}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selected.has(p.id)}
                                onChange={() => toggleSelect(p.id)}
                              />
                            </td>
                            <td>
                              <div className="cell-thumb">
                                {[p.intake_image_1, p.intake_image_2, p.intake_image_3].map((url, i) =>
                                  url ? (
                                    <img key={i} src={url} className="thumb" alt="" />
                                  ) : (
                                    <div key={i} className="thumb-empty" />
                                  )
                                )}
                              </div>
                            </td>
                            <td className="cell-title">{p.name}</td>
                            <td className="cell-consignor">{consignorLabel(p.consignors)}</td>
                            <td className="cell-price">{p.price != null ? `$${Number(p.price).toLocaleString()}` : "—"}</td>
                            <td>{formatDate(p.date_received)}</td>
                            <td>{p.materials || "—"}</td>
                            <td>{p.notes ? p.notes.slice(0, 60) + (p.notes.length > 60 ? "…" : "") : "—"}</td>
                            <td className="col-actions">
                              <button className="btn-edit-row" onClick={() => setEditingProduct(p)}>
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {grouped.length > 0 && (
                  <>
                    <div className="inv-section-label">Assigned to a Week ({grouped.length})</div>
                    <table className="inv-table">
                      <thead>
                        <tr>
                          <th><input type="checkbox" disabled /></th>
                          <th>Photos</th>
                          <th>Title</th>
                          <th>Consignor</th>
                          <th>Est. Price</th>
                          <th>Received</th>
                          <th>Week</th>
                          <th className="col-actions"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped.map((p) => {
                          const weekId = p.production_week_products?.[0]?.production_week_id;
                          const weekRef = weeks.find((w) => w.id === weekId);
                          return (
                            <tr key={p.id}>
                              <td><input type="checkbox" disabled checked={false} /></td>
                              <td>
                                <div className="cell-thumb">
                                  {[p.intake_image_1, p.intake_image_2, p.intake_image_3].map((url, i) =>
                                    url ? <img key={i} src={url} className="thumb" alt="" /> : <div key={i} className="thumb-empty" />
                                  )}
                                </div>
                              </td>
                              <td className="cell-title">{p.name}</td>
                              <td className="cell-consignor">{consignorLabel(p.consignors)}</td>
                              <td className="cell-price">{p.price != null ? `$${Number(p.price).toLocaleString()}` : "—"}</td>
                              <td>{formatDate(p.date_received)}</td>
                              <td>{weekRef ? formatDate(weekRef.work_week_date) : <span className="badge-grouped">In Week</span>}</td>
                              <td className="col-actions">
                                <button className="btn-edit-row" onClick={() => setEditingProduct(p)}>
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )
          ) : (
            // ── PRODUCTION WEEKS VIEW ───────────────────────────────────────
            filteredWeeks.length === 0 ? (
              <div className="empty-state">
                {weeks.length === 0
                  ? "No production weeks yet. Select inventory items and click \"Group into Week\" to create one."
                  : "No weeks match your search."}
              </div>
            ) : (
              filteredWeeks.map((w) => (
                <div key={w.id} className="week-section">
                  <div className="week-header">
                    <div className="week-header-info">
                      <div className="week-header-title-row">
                        <h3 className="week-title">{w.title}</h3>
                        <span className="week-date">{formatDate(w.work_week_date)}</span>
                        {w.status && (
                          <span className={`week-status week-status--${w.status}`}>
                            {w.status.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      {w.notes && <p className="week-notes">{w.notes}</p>}
                      <div className="week-meta-counts">
                        {w.products.length} item{w.products.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <button className="btn-edit-week" onClick={() => setEditingWeek(w)}>
                      Edit Week
                    </button>
                  </div>

                  <div className="week-table-wrap">
                    {w.products.length === 0 ? (
                      <div className="week-empty">No items in this week{search ? " match your search" : ""}.</div>
                    ) : (
                      <table className="inv-table">
                        <thead>
                          <tr>
                            <th>Photos</th>
                            <th>Title</th>
                            <th>Consignor</th>
                            <th>Est. Price</th>
                            <th>Received</th>
                            <th>Materials</th>
                            <th className="col-actions"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {w.products.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <div className="cell-thumb">
                                  {[p.intake_image_1, p.intake_image_2, p.intake_image_3].map((url, i) =>
                                    url ? <img key={i} src={url} className="thumb" alt="" /> : <div key={i} className="thumb-empty" />
                                  )}
                                </div>
                              </td>
                              <td className="cell-title">{p.name}</td>
                              <td className="cell-consignor">{consignorLabel(p.consignors)}</td>
                              <td className="cell-price">{p.price != null ? `$${Number(p.price).toLocaleString()}` : "—"}</td>
                              <td>{formatDate(p.date_received)}</td>
                              <td>{p.materials || "—"}</td>
                              <td className="col-actions">
                                <button className="btn-edit-row" onClick={() => setEditingProduct(p)}>
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {showAddModal && (
        <AddInventoryModal
          consignors={consignors}
          onClose={() => setShowAddModal(false)}
          onSaved={loadData}
        />
      )}

      {showWeekModal && (
        <CreateWeekModal
          selectedIds={Array.from(selected)}
          onClose={() => setShowWeekModal(false)}
          onSaved={() => { setSelected(new Set()); loadData(); }}
        />
      )}

      {editingProduct && (
        <EditInventoryModal
          product={editingProduct}
          consignors={consignors}
          onClose={() => setEditingProduct(null)}
          onSaved={loadData}
        />
      )}

      {editingWeek && (
        <EditWeekModal
          week={editingWeek}
          onClose={() => setEditingWeek(null)}
          onSaved={loadData}
        />
      )}
    </>
  );
}
