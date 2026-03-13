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
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminCrudList from "./pages/admin/AdminCrudList";
import AdminCategoryManager from "./pages/admin/AdminCategoryManager";
import AdminCollections from "./pages/admin/AdminCollections";
import AdminCollectionDetail from "./pages/admin/AdminCollectionDetail";
import AdminInbox from "./pages/admin/AdminInbox";
import AdminHolds from "./pages/admin/AdminHolds";
import AdminConsignors from "./pages/admin/AdminConsignors";
import CollectionDetail from "./pages/CollectionDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<AdminProductForm />} />
              <Route path="products/:id" element={<AdminProductForm />} />
              <Route path="holds" element={<AdminHolds />} />
              <Route path="consignors" element={<AdminConsignors />} />
              <Route path="offers" element={<AdminInbox title="Offers" tableName="purchase_inquiries" filterType="offer" showAmount />} />
              <Route path="inquiries" element={<AdminInbox title="Inquiries" tableName="purchase_inquiries" filterType="non-offer" />} />
              <Route path="designers" element={<AdminCrudList title="Designers" tableName="designers" columns={[{ key: 'name', label: 'Name' }, { key: 'about', label: 'Bio', type: 'textarea' }]} productFk="designer_id" />} />
              <Route path="makers" element={<AdminCrudList title="Makers" tableName="makers" columns={[{ key: 'name', label: 'Name' }, { key: 'about', label: 'Bio', type: 'textarea' }]} productFk="maker_id" />} />
              <Route path="categories" element={<AdminCategoryManager />} />
              <Route path="collections" element={<AdminCollections />} />
              <Route path="collections/:id" element={<AdminCollectionDetail />} />
              <Route path="styles" element={<AdminCrudList title="Styles" tableName="styles" />} />
              <Route path="periods" element={<AdminCrudList title="Periods" tableName="periods" />} />
              <Route path="countries" element={<AdminCrudList title="Countries" tableName="countries" />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
