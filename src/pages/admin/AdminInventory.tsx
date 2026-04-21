import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
  status: string;
  notes: string | null;
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

    // Upload images
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

          {/* Image uploads */}
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

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminInventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [consignors, setConsignors] = useState<Consignor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    const [{ data: prods }, { data: cons }] = await Promise.all([
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
    ]);
    setProducts((prods as InventoryProduct[]) || []);
    setConsignors((cons as Consignor[]) || []);
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
        .inv-toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 32px; border-bottom: 1px solid #e5e2d9; }
        .inv-search { flex: 1; max-width: 320px; }
        .inv-search input { width: 100%; border: 1px solid #d8d4cb; background: #fff; padding: 8px 12px; font-family: inherit; font-size: .85rem; outline: none; color: #111; }
        .inv-search input:focus { border-color: #111; }
        .inv-count { font-size: .75rem; color: #888; margin-left: auto; }
        .btn-group-week { background: #f0ede6; color: #111; border: 1px solid #c8c4bb; padding: 8px 16px; font-family: inherit; font-size: .78rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; transition: background .15s; }
        .btn-group-week:hover:not(:disabled) { background: #e0dcd3; }
        .btn-group-week:disabled { opacity: .4; cursor: default; }
        
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
        
        /* ── Week count badge ── */
        .week-item-count { font-size: .85rem; color: #555; margin: 0 0 16px; padding: 10px 12px; background: #f7f5f0; border-left: 3px solid #111; }
      `}</style>

      <div className="inv-page">
        {/* Header */}
        <div className="inv-header">
          <div>
            <h1>Inventory</h1>
            <div className="inv-meta">{products.length} item{products.length !== 1 ? "s" : ""} in inventory</div>
          </div>
          <button className="btn-add-inventory" onClick={() => setShowAddModal(true)}>
            + Add Inventory
          </button>
        </div>

        {/* Toolbar */}
        <div className="inv-toolbar">
          <div className="inv-search">
            <input
              placeholder="Search inventory…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn-group-week"
            disabled={selected.size === 0}
            onClick={() => setShowWeekModal(true)}
          >
            Group into Week {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
          <span className="inv-count">{filtered.length} shown</span>
        </div>

        {/* Table */}
        <div className="inv-table-wrap">
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">No inventory items found.</div>
          ) : (
            <>
              {/* Ungrouped */}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* Grouped */}
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
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.map((p) => (
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
                          <td><span className="badge-grouped">In Week</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
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
    </>
  );
}
