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