import { useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Package, Users, Palette, LogOut, Globe,
  Clock, Layers, ShoppingBag, MessageSquare, HandCoins, Menu, X,
  UserCheck, FolderOpen, Archive,
} from 'lucide-react';

// Statuses that belong to the Inventory nav item
const INVENTORY_STATUSES = new Set(['inventory', 'draft', 'deactivated']);

const AdminLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;

  const searchParams = new URLSearchParams(location.search);
  const currentStatus = searchParams.get('status');

  const isProductsActive =
    location.pathname === '/admin/products' &&
    (currentStatus === null || !INVENTORY_STATUSES.has(currentStatus));

  const isInventoryActive =
    (location.pathname === '/admin/products' && currentStatus !== null && INVENTORY_STATUSES.has(currentStatus)) ||
    location.pathname === '/admin/inventory';

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
      active
        ? 'bg-primary text-primary-foreground font-medium'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }`;

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="space-y-0.5">
      <Link to="/admin" onClick={onNavigate} className={linkClass(isActive('/admin', true))}>
        <LayoutDashboard size={16} /> Dashboard
      </Link>
      <Link to="/admin/products" onClick={onNavigate} className={linkClass(isProductsActive)}>
        <Package size={16} /> Products
      </Link>
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
    </div>
  );

  return (
    <div className="min-h-screen bg-background">

      {/* ── Mobile nav overlay ── */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-card flex flex-col shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
              <Link
                to="/"
                onClick={() => setMobileNavOpen(false)}
                className="font-display text-sm tracking-[0.2em] uppercase text-foreground"
              >
                W414 Admin
              </Link>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto p-3">
              <NavLinks onNavigate={() => setMobileNavOpen(false)} />
            </nav>
            {/* Sign out */}
            <div className="p-3 border-t border-border shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setMobileNavOpen(false); signOut(); }}
                className="w-full justify-start text-muted-foreground"
              >
                <LogOut size={16} className="mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* ── Desktop sidebar ── */}
        <aside className="hidden md:flex w-56 shrink-0 border-r border-border bg-card flex-col sticky top-0 h-screen">
          <div className="p-4 border-b border-border">
            <Link to="/" className="font-display text-sm tracking-[0.2em] uppercase text-foreground">
              W414 Admin
            </Link>
          </div>
          <nav className="flex-1 p-2 overflow-y-auto">
            <NavLinks />
          </nav>
          <div className="p-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-muted-foreground">
              <LogOut size={16} className="mr-2" /> Sign Out
            </Button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-card sticky top-0 z-40">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Menu size={22} />
            </button>
            <span className="font-display text-sm tracking-[0.2em] uppercase text-foreground">
              W414 Admin
            </span>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-x-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
