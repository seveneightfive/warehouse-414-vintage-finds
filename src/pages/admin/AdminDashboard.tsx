import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, HandCoins, MessageSquare, Users, Building2, Tags, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = {
  available: "hsl(220, 70%, 55%)",
  sold: "hsl(220, 10%, 65%)",
  other: "hsl(42, 40%, 75%)",
};

const AdminDashboard = () => {
  const { data: stats, isError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [products, holds, offers, inquiries, designers, makers, categories] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("status", "on_hold"),
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
        supabase.from("designers").select("id", { count: "exact", head: true }),
        supabase.from("makers").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
      ]);
      if (products.error) throw products.error;
      if (holds.error) throw holds.error;
      if (offers.error) throw offers.error;
      if (inquiries.error) throw inquiries.error;
      if (designers.error) throw designers.error;
      if (makers.error) throw makers.error;
      if (categories.error) throw categories.error;
      return {
        products: products.count || 0,
        holds: holds.count || 0,
        offers: offers.count || 0,
        inquiries: inquiries.count || 0,
        designers: designers.count || 0,
        makers: makers.count || 0,
        categories: categories.count || 0,
      };
    },
    retry: 1,
  });

  const { data: categoryData } = useQuery({
    queryKey: ["admin-category-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories_with_product_count" as any)
        .select("*")
        .order("total_product_count", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        name: string;
        total_product_count: number;
        available_product_count: number;
        sold_product_count: number;
      }>;
    },
    retry: 1,
  });

  const categorySummary = categoryData?.reduce(
    (acc, c) => ({
      total: acc.total + (c.total_product_count || 0),
      available: acc.available + (c.available_product_count || 0),
      sold: acc.sold + (c.sold_product_count || 0),
    }),
    { total: 0, available: 0, sold: 0 }
  );

  const chartData = categoryData
    ?.filter((c) => c.total_product_count > 0)
    .map((c) => ({
      name: c.name,
      available: c.available_product_count || 0,
      sold: c.sold_product_count || 0,
      other: Math.max(0, (c.total_product_count || 0) - (c.available_product_count || 0) - (c.sold_product_count || 0)),
    }));

  const cards = [
    { label: "Total Products", value: stats?.products ?? "—", icon: Package, to: "/admin/products" },
    { label: "Pending Holds", value: stats?.holds ?? "—", icon: Clock, to: "/admin/holds" },
    { label: "Pending Offers", value: stats?.offers ?? "—", icon: HandCoins, to: "/admin/offers" },
    { label: "Pending Inquiries", value: stats?.inquiries ?? "—", icon: MessageSquare, to: "/admin/inquiries" },
    { label: "Designers", value: stats?.designers ?? "—", icon: Users, to: "/admin/designers" },
    { label: "Makers", value: stats?.makers ?? "—", icon: Building2, to: "/admin/makers" },
    { label: "Categories", value: stats?.categories ?? "—", icon: Tags, to: "/admin/categories" },
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

  const summaryCards = [
    { label: "Total Products", value: categorySummary?.total ?? 0, color: "text-foreground" },
    { label: "Available", value: categorySummary?.available ?? 0, color: "text-blue-600" },
    { label: "Sold", value: categorySummary?.sold ?? 0, color: "text-muted-foreground" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl tracking-wide text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link to={c.to} key={c.label} className="block">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">{c.label}</CardTitle>
                <c.icon size={18} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-display text-foreground">{c.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Category Inventory Section */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-muted-foreground" />
          <h2 className="font-display text-xl tracking-wide text-foreground">Category Inventory</h2>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {summaryCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-2xl font-display ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {chartData && chartData.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={chartData.length * 40 + 40}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(220, 10%, 40%)" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11, fill: "hsl(220, 15%, 10%)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid hsl(220, 10%, 88%)",
                    }}
                  />
                  <Bar dataKey="available" stackId="a" fill={COLORS.available} name="Available" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="sold" stackId="a" fill={COLORS.sold} name="Sold" />
                  <Bar dataKey="other" stackId="a" fill={COLORS.other} name="Other" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.available }} /> Available</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.sold }} /> Sold</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.other }} /> Other</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
