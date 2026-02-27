import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, HandCoins, MessageSquare } from "lucide-react";

const AdminDashboard = () => {
  const { data: stats, isError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [products, holds, offers, inquiries] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("product_holds").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("purchase_inquiries")
          .select("id", { count: "exact", head: true })
          .eq("inquiry_type", "offer")
          .eq("is_read", false),
        supabase
          .from("purchase_inquiries")
          .select("id", { count: "exact", head: true })
          .neq("inquiry_type", "offer")
          .eq("is_read", false),
      ]);
      if (products.error) throw products.error;
      if (holds.error) throw holds.error;
      if (offers.error) throw offers.error;
      if (inquiries.error) throw inquiries.error;
      return {
        products: products.count || 0,
        holds: holds.count || 0,
        offers: offers.count || 0,
        inquiries: inquiries.count || 0,
      };
    },
    retry: 1,
  });

  const cards = [
    { label: "Total Products", value: stats?.products ?? "—", icon: Package },
    { label: "Pending Holds", value: stats?.holds ?? "—", icon: Clock },
    { label: "Pending Offers", value: stats?.offers ?? "—", icon: HandCoins },
    { label: "Pending Inquiries", value: stats?.inquiries ?? "—", icon: MessageSquare },
  ];

  if (isError) {
    return (
      <div>
        <h1 className="font-display text-2xl tracking-wide text-foreground mb-6">Dashboard</h1>
        <p className="text-destructive">
          Failed to load dashboard stats. Check your database connection and RLS policies.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl tracking-wide text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">{c.label}</CardTitle>
              <c.icon size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
