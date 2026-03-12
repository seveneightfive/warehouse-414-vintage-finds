import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

type AdminInboxProps = {
  title: string;
  tableName: string;
  showAmount?: boolean;
  filterType?: 'offer' | 'non-offer';
};

const AdminInbox = ({ title, tableName, showAmount, filterType }: AdminInboxProps) => {
  const { data: items, isLoading } = useQuery({
    queryKey: [tableName, filterType],
    queryFn: async () => {
      let query = supabase
        .from(tableName)
        .select('*, product:products(name)')
        .order('created_at', { ascending: false });
      if (filterType === 'offer') query = query.eq('inquiry_type', 'offer');
      if (filterType === 'non-offer') query = query.neq('inquiry_type', 'offer');
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl tracking-wide text-foreground mb-6">{title}</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              {showAmount && <TableHead>Amount</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.map((item: Record<string, unknown>) => (
              <TableRow key={item.id as string}>
                <TableCell>{(item.product as Record<string, string>)?.name || '—'}</TableCell>
                <TableCell>{item.customer_name as string}</TableCell>
                <TableCell className="text-muted-foreground">{item.customer_email as string}</TableCell>
                {showAmount && <TableCell>${Number(item.offer_amount).toLocaleString()}</TableCell>}
                <TableCell className="text-muted-foreground text-xs">{new Date(item.created_at as string).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost">View</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AdminInbox;
