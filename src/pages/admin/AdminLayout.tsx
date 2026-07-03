import { useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard, Package, Users, Palette, LogOut, Globe,
  Clock, Layers, ShoppingBag, MessageSquare, HandCoins, Menu,
  UserCheck, FolderOpen, Archive,
} from 'lucide-react';

// Statuses that belong to the Inventory nav item
const INVENTORY_STATUSES = new Set(['inventory', 'draft', 'deactivated']);

const AdminLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;

  // Parse the current status param so we can correctly highlight Products vs Inventory
  const searchParams = new URLSearchParams(location.search);
  const currentStatus = searchParams.get('status');

  // "Products" is active when on /admin/products with NO status param,
  // or with a products-group status (available, on_hold, at_auction, sold)
  const isProductsActive =
    location.pathname === '/admin/products' &&
    (currentStatus === null || !INVENTORY_STATUSES.has(currentStatus));

  // "Inventory" is active when on /admin/products with an inventory-group status,
  // or on the /admin/inventory redirect route
  const isInventoryActive =
    (location.pathname === '/admin/products' && currentStatus !== null && INVENTORY_STATUSES.has(currentStatus)) ||
    location.pathname === '/admin/inventory';

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const linkClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }`;

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {/* Dashboard */}
      <Link to="/admin" onClick={onNavigate} className={linkClass(isActive('/admin', true))}>
        <LayoutDashboard size={16} /> Dashboard
      </Link>

      {/* Products — goes to /admin/products (defaults to available tab) */}
      <Link to="/admin/products" onClick={onNavigate} className={linkClass(isProductsActive)}>
        <Package size={16} /> Products
      </Link>

      {/* Inventory — goes to /admin/inventory which redirects to ?status=inventory */}
      <Link to="/admin/inventory" onClick={onNavigate} className={linkClass(isInventoryActive)}>
        <Archive size={16} /> Inventory
      </Link>

      <Link to="/admin/holds" onClick={onNavigate} className={linkClass(isActive('/admin/holds'))}>
        <Clock size={16} /> Holds
      </Link>
      <Link to="/admin/consignors" onClick={onNavigate} className={linkClass(isActive('/admin/consignors'))}>
        <UserCheck size={16} /> Consignors
      </Link>
      <Link to="/admin/offers" onClick={onNavigate} className={linkClass(isActive('/admin/offers'))}>
        <HandCoins size={16} /> Offers
      </Link>
      <Link to="/admin/inquiries" onClick={onNavigate} className={linkClass(isActive('/admin/inquiries'))}>
        <MessageSquare size={16} /> Inquiries
      </Link>
      <Link to="/admin/designers" onClick={onNavigate} className={linkClass(isActive('/admin/designers'))}>
        <Users size={16} /> Designers
      </Link>
      <Link to="/admin/makers" onClick={onNavigate} className={linkClass(isActive('/admin/makers'))}>
        <ShoppingBag size={16} /> Makers
      </Link>
      <Link to="/admin/categories" onClick={onNavigate} className={linkClass(isActive('/admin/categories'))}>
        <Layers size={16} /> Categories
      </Link>
      <Link to="/admin/collections" onClick={onNavigate} className={linkClass(isActive('/admin/collections'))}>
        <FolderOpen size={16} /> Collections
      </Link>
      <Link to="/admin/styles-periods" onClick={onNavigate} className={linkClass(isActive('/admin/styles-periods'))}>
        <Palette size={16} /> Styles / Periods
      </Link>
      <Link to="/admin/countries" onClick={onNavigate} className={linkClass(isActive('/admin/countries'))}>
        <Globe size={16} /> Countries
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border bg-card flex-col sticky top-0 h-screen">
        <div className="p-4 border-b border-border">
          <Link to="/" className="font-display text-sm tracking-[0.2em] uppercase text-foreground">
            W414 Admin
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-muted-foreground">
            <LogOut size={16} className="mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 h-12 border-b border-border bg-card sticky top-0 z-30">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 max-w-[85vw] p-0 z-50 flex flex-col">
  <div className="p-4 border-b border-border shrink-0">
    <Link to="/" onClick={() => setSheetOpen(false)} className="font-display text-sm tracking-[0.2em] uppercase text-foreground">
      W414 Admin
    </Link>
  </div>
  <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
    <NavLinks onNavigate={() => setSheetOpen(false)} />
  </nav>
  <div className="p-3 border-t border-border shrink-0">
    <Button variant="ghost" size="sm" onClick={() => { setSheetOpen(false); signOut(); }} className="w-full justify-start text-muted-foreground">
      <LogOut size={16} className="mr-2" /> Sign Out
    </Button>
  </div>
</SheetContent>
          </Sheet>
          <span className="font-display text-sm tracking-[0.2em] uppercase text-foreground">W414 Admin</span>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
