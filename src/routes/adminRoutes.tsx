import { ReactNode } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminProductForm from '@/pages/admin/AdminProductForm';
import AdminHolds from '@/pages/admin/AdminHolds';
import AdminInventory from '@/pages/admin/AdminInventory';
import AdminCrudList from '@/components/AdminCrudList';

// Layout wrapper for admin pages
interface AdminLayoutProps {
  children: ReactNode;
}

function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// Routes configuration
export const adminRoutes = [
  {
    path: '/admin',
    element: (
      <AdminLayout>
        <AdminDashboard />
      </AdminLayout>
    ),
  },
  {
    path: '/admin/products',
    element: (
      <AdminLayout>
        <AdminProducts />
      </AdminLayout>
    ),
  },
  {
    path: '/admin/holds',
    element: (
      <AdminLayout>
        <AdminHolds />
      </AdminLayout>
    ),
  },
  {
    path: '/admin/inventory',
    element: (
      <AdminLayout>
        <AdminInventory />
      </AdminLayout>
    ),
  },
  {
    path: '/admin/curated-sets',
    element: (
      <AdminLayout>
        <AdminCrudList
          title="Curated Sets"
          tableName="curated_sets"
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ]}
          productFk="curated_set_id"
        />
      </AdminLayout>
    ),
  },
  // Product editor route (shared by all statuses)
  {
    path: '/admin/products/:id',
    element: (
      <AdminLayout>
        <AdminProductForm />
      </AdminLayout>
    ),
  },
  {
    path: '/admin/products/new',
    element: (
      <AdminLayout>
        <AdminProductForm />
      </AdminLayout>
    ),
  },
];

export default adminRoutes;
