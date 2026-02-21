import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Clock, HandCoins, MessageSquare } from 'lucide-react';

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [products, holds, offers, inquiries] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('product_holds').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('purchase_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      return {
        products: products.count || 0,
        holds: holds.count || 0,
        offers: offers.count || 0,
        inquiries: inquiries.count || 0,
      };
    },
  });

  const cards = [
    { label: 'Total Products', value: stats?.products ?? '—', icon: Package },
    { label: 'Pending Holds', value: stats?.holds ?? '—', icon: Clock },
    { label: 'Pending Offers', value: stats?.offers ?? '—', icon: HandCoins },
    { label: 'Pending Inquiries', value: stats?.inquiries ?? '—', icon: MessageSquare },
  ];

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
