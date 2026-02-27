import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type AdminInboxProps = {
  title: string;
  tableName: string;
  showAmount?: boolean;
};

const AdminInbox = ({ title, tableName, showAmount }: AdminInboxProps) => {
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useQuery({
    queryKey: [tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*, product:products(title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, productId }: { id: string; status: string; productId?: string }) => {
      const { error } = await supabase.from(tableName).update({ status }).eq('id', id);
      if (error) throw error;
      // Sync product status for holds
      if (tableName === 'product_holds' && productId) {
        if (status === 'approved') {
          await supabase.from('products').update({ status: 'on_hold' }).eq('id', productId);
        } else if (status === 'released') {
          await supabase.from('products').update({ status: 'available' }).eq('id', productId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Updated');
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
                <TableCell>{(item.product as Record<string, string>)?.title || '—'}</TableCell>
                <TableCell>{item.customer_name as string}</TableCell>
                <TableCell className="text-muted-foreground">{item.customer_email as string}</TableCell>
                {showAmount && <TableCell>${Number(item.amount).toLocaleString()}</TableCell>}
                <TableCell><Badge variant={item.status === 'pending' ? 'secondary' : 'default'}>{item.status as string}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(item.created_at as string).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {item.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: item.id as string, status: 'approved', productId: item.product_id as string })}>
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: item.id as string, status: 'declined' })}>
                          Decline
                        </Button>
                      </>
                    )}
                    {tableName === 'product_holds' && item.status === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: item.id as string, status: 'released', productId: item.product_id as string })}>
                        Release Hold
                      </Button>
                    )}
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
