import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import DesignerDetail from "./pages/DesignerDetail";
import MakerDetail from "./pages/MakerDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminHolds from "./pages/admin/AdminHolds";
import AdminOffers from "@/pages/admin/AdminOffers";
import AdminInquiries from "@/pages/admin/AdminInquiries";
import AdminCrudList from "./pages/admin/AdminCrudList";
import AdminCategoryManager from "./pages/admin/AdminCategoryManager";
import AdminCollections from "./pages/admin/AdminCollections";
import AdminCollectionDetail from "./pages/admin/AdminCollectionDetail";
import AdminConsignors from "./pages/admin/AdminConsignors";
import AdminConsignorDetail from "./pages/admin/AdminConsignorDetail";
import AdminInventory from "./pages/admin/AdminInventory";
import CollectionDetail from "./pages/CollectionDetail";
import AdminSidebar from "./components/AdminSidebar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Admin layout wrapper
function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>  // <-- This closing div tag was missing!
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/product/:slug" element={<ProductDetail />} />
              <Route path="/designer/:slug" element={<DesignerDetail />} />
              <Route path="/maker/:slug" element={<MakerDetail />} />
              <Route path="/collection/:slug" element={<CollectionDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
            </Route>

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin Dashboard */}
            <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />

            {/* Products */}
            <Route path="/admin/products" element={<AdminLayout><AdminProducts /></AdminLayout>} />
            <Route path="/admin/products/new" element={<AdminLayout><AdminProductForm /></AdminLayout>} />
            <Route path="/admin/products/:id" element={<AdminLayout><AdminProductForm /></AdminLayout>} />

            {/* Holds */}
            <Route path="/admin/holds" element={<AdminLayout><AdminHolds /></AdminLayout>} />

            {/* Consignors */}
            <Route path="/admin/consignors" element={<AdminLayout><AdminConsignors /></AdminLayout>} />
            <Route path="/admin/consignors/:id" element={<AdminLayout><AdminConsignorDetail /></AdminLayout>} />

            {/* Inquiries & Offers */}
            <Route path="/admin/offers" element={<ProtectedAdminRoute><AdminOffers /></ProtectedAdminRoute>} />
            <Route path="/admin/inquiries" element={<ProtectedAdminRoute><AdminInquiries /></ProtectedAdminRoute>} />
            
            {/* Designers & Makers */}
            <Route path="/admin/designers" element={<AdminLayout><AdminCrudList title="Designers" tableName="designers" columns={[{ key: 'name', label: 'Name' }, { key: 'about', label: 'Bio', type: 'textarea' }]} productFk="designer_id" /></AdminLayout>} />
            <Route path="/admin/makers" element={<AdminLayout><AdminCrudList title="Makers" tableName="makers" columns={[{ key: 'name', label: 'Name' }, { key: 'about', label: 'Bio', type: 'textarea' }]} productFk="maker_id" /></AdminLayout>} />

            {/* Taxonomy */}
            <Route path="/admin/categories" element={<AdminLayout><AdminCategoryManager /></AdminLayout>} />
            <Route path="/admin/curated-sets" element={<AdminLayout><AdminCollections /></AdminLayout>} />
            <Route path="/admin/curated-sets/:id" element={<AdminLayout><AdminCollectionDetail /></AdminLayout>} />
            <Route path="/admin/styles-periods" element={<AdminLayout><AdminCrudList title="Styles / Periods" tableName="styles_periods" /></AdminLayout>} />
            <Route path="/admin/countries" element={<AdminLayout><AdminCrudList title="Countries" tableName="countries" /></AdminLayout>} />

            {/* Inventory */}
            <Route path="/admin/inventory" element={<AdminLayout><AdminInventory /></AdminLayout>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
