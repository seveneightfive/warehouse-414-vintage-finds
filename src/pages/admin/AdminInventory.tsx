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
  <h1 className="text-2xl font-bold mb-4 lowercase">inventory management</h1>
  <p className="mb-4 lowercase">found {products.length} inventory items</p>

  {products.length === 0 ? (
    <div className="text-center py-8 text-muted-foreground lowercase">
      no inventory items found
    </div>
  ) : (
    <div className="border rounded overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-black text-white lowercase">
          <tr>
            <th className="text-left p-3">name</th>
            <th className="text-left p-3">status</th>
            <th className="text-left p-3">actions</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product: any) => (
            <tr
              key={product.id}
              className="border-b hover:bg-gray-50"
            >
              <td className="p-3">{product.name}</td>

              <td className="p-3 text-muted-foreground">
                {product.status}
              </td>

              <td className="p-3">
                <div className="flex gap-2">
                  <button className="text-xs border px-2 py-1 hover:bg-black hover:text-white">
                    edit
                  </button>

                  <button className="text-xs border px-2 py-1 hover:bg-black hover:text-white">
                    view
                  </button>

                  <button className="text-xs border px-2 py-1 hover:bg-black hover:text-white">
                    sold
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    )}
</div>
);
}
