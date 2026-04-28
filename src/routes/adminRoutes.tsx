import { ReactNode } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProductsAvailable from '@/pages/admin/products/AdminProductsAvailable';
import { createProductStatusPage } from '@/pages/admin/products/createProductStatusPage';
import AdminHolds from '@/pages/admin/AdminHolds';
import AdminInventory from '@/pages/admin/AdminInventory';
import AdminCrudList from '@/components/AdminCrudList';

// Create pages for each status using the factory
const AdminProductsDraft = createProductStatusPage({ status: 'draft' });
const AdminProductsAtAuction = createProductStatusPage({ status: 'at_auction' });
const AdminProductsSold = createProductStatusPage({ status: 'sold' });

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
    path: '/admin/products/available',
    element: (
      <AdminLayout>
        <AdminProductsAvailable />
      </AdminLayout>
    ),
  },
  {
    path: '/admin/products/draft',
    element: (
      <AdminLayout>
        <AdminProductsDraft />
      </AdminLayout>
    ),
  },
  {
    path: '/admin/products/at-auction',
    element: (
      <AdminLayout>
        <AdminProductsAtAuction />
      </AdminLayout>
    ),
  },
  {
    path: '/admin/products/sold',
    element: (
      <AdminLayout>
        <AdminProductsSold />
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
        {/* This points to your existing AdminProductEditor component */}
        {/* Make sure it exists at /pages/admin/products/AdminProductEditor.tsx */}
        <div>Product Editor</div>
      </AdminLayout>
    ),
  },
  {
    path: '/admin/products/new',
    element: (
      <AdminLayout>
        {/* This points to your existing AdminProductEditor component in "new" mode */}
        <div>New Product</div>
      </AdminLayout>
    ),
  },
];

export default adminRoutes;
