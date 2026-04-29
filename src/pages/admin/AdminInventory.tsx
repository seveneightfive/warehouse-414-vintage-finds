import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, status")
          .eq("status", "inventory");

        if (error) {
          console.error("Error loading inventory:", error);
          return;
        }

        setProducts(data || []);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <div className="p-6">Loading inventory...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inventory Management</h1>
      <p className="mb-4">Found {products.length} inventory items</p>

      {products.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No inventory items found. Products with status "inventory" will appear here.
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product: any) => (
            <div key={product.id} className="p-4 border rounded">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-muted-foreground">Status: {product.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
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
