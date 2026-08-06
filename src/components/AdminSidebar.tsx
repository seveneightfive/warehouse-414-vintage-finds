import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Clock, Archive, BookOpen,
  ChevronDown, ChevronRight, Menu, X, MessageSquare, DollarSign,
  Grid, Users, Hammer, Palette, Globe, LogOut, UserCircle2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [expandProducts, setExpandProducts] = useState(
    location.pathname.startsWith('/admin/products')
  );

  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || (user?.email ? user.email.split('@')[0] : null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      console.error('Logout failed:', err);
      setIsLoggingOut(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const isProductsActive = location.pathname.startsWith('/admin/products');

  return (
    <>
      {/* Mobile menu toggle */}
      <div className="sticky top-0 z-40 lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <h2 className="font-display text-lg tracking-wide">W414 ADMIN</h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative top-0 left-0 z-30 lg:z-auto
          h-screen lg:h-auto w-56 lg:w-64
          bg-card border-r border-border
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="hidden lg:block px-6 py-6 border-b border-border">
          <h1 className="font-display text-sm tracking-[0.2em] uppercase text-foreground">
            W414 Admin
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {/* Dashboard */}
          <Link
            to="/admin"
            onClick={() => setIsOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-md
              font-display text-sm tracking-wide transition-colors
              ${
                isActive('/admin')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>

          {/* Products (collapsible) */}
          <div className="space-y-1">
            <button
              onClick={() => setExpandProducts(!expandProducts)}
              className={`
                w-full flex items-center justify-between px-4 py-2.5 rounded-md
                font-display text-sm tracking-wide transition-colors
                ${
                  isProductsActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Package size={18} />
                Products
              </div>
              {expandProducts ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {expandProducts && (
              <div className="ml-2 space-y-1 border-l border-border/50 pl-3">
                <Link
                  to="/admin/products"
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded text-xs tracking-wide
                    transition-colors font-display
                    ${
                      isActive('/admin/products')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  All Products
                </Link>
                <Link
                  to="/admin/products/new"
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded text-xs tracking-wide
                    transition-colors font-display
                    ${
                      isActive('/admin/products/new')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  Add Product
                </Link>
              </div>
            )}
          </div>

          {/* Holds */}
          <Link
            to="/admin/holds"
            onClick={() => setIsOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-md
              font-display text-sm tracking-wide transition-colors
              ${
                isActive('/admin/holds')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            <Clock size={18} />
            Holds
          </Link>

          {/* Inventory */}
          <Link
            to="/admin/inventory"
            onClick={() => setIsOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-md
              font-display text-sm tracking-wide transition-colors
              ${
                isActive('/admin/inventory')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            <Archive size={18} />
            Inventory
          </Link>

          {/* Consignors */}
          <Link
            to="/admin/consignors"
            onClick={() => setIsOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-md
              font-display text-sm tracking-wide transition-colors
              ${
                isActive('/admin/consignors')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            <Package size={18} />
            Consignors
          </Link>

          {/* Inquiries */}
          <Link
            to="/admin/inquiries"
            onClick={() => setIsOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-md
              font-display text-sm tracking-wide transition-colors
              ${
                isActive('/admin/inquiries')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            <MessageSquare size={18} />
            Inquiries
          </Link>

          {/* Offers */}
          <Link
            to="/admin/offers"
            onClick={() => setIsOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-md
              font-display text-sm tracking-wide transition-colors
              ${
                isActive('/admin/offers')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            <DollarSign size={18} />
            Offers
          </Link>

          {/* Taxonomy */}
          <div className="pt-4 mt-4 border-t border-border">
            <p className="text-xs text-muted-foreground tracking-widest uppercase px-4 mb-2">Taxonomy</p>

            <Link
              to="/admin/categories"
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-md
                font-display text-sm tracking-wide transition-colors
                ${
                  isActive('/admin/categories')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }
              `}
            >
              <Grid size={18} />
              Categories
            </Link>

            <Link
              to="/admin/designers"
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-md
                font-display text-sm tracking-wide transition-colors
                ${
                  isActive('/admin/designers')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }
              `}
            >
              <Users size={18} />
              Designers
            </Link>

            <Link
              to="/admin/makers"
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-md
                font-display text-sm tracking-wide transition-colors
                ${
                  isActive('/admin/makers')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }
              `}
            >
              <Hammer size={18} />
              Makers
            </Link>

            <Link
              to="/admin/curated-sets"
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-md
                font-display text-sm tracking-wide transition-colors
                ${
                  isActive('/admin/curated-sets')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }
              `}
            >
              <BookOpen size={18} />
              Homepage Banners
            </Link>

            <Link
              to="/admin/styles-periods"
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-md
                font-display text-sm tracking-wide transition-colors
                ${
                  isActive('/admin/styles-periods')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }
              `}
            >
              <Palette size={18} />
              Styles / Periods
            </Link>

            <Link
              to="/admin/countries"
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-md
                font-display text-sm tracking-wide transition-colors
                ${
                  isActive('/admin/countries')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }
              `}
            >
              <Globe size={18} />
              Countries
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-border space-y-3">
          {/* Signed-in user indicator */}
          {user ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted/60">
              <UserCircle2 size={16} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-display tracking-wide text-foreground truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-destructive/10">
              <UserCircle2 size={16} className="text-destructive shrink-0" />
              <p className="text-xs font-display tracking-wide text-destructive">Not signed in</p>
            </div>
          )}

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="
              w-full flex items-center gap-3 px-4 py-2.5 rounded-md
              font-display text-sm tracking-wide transition-colors
              text-muted-foreground hover:text-foreground hover:bg-muted
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <LogOut size={18} />
            {isLoggingOut ? 'Logging out…' : 'Log Out'}
          </button>

          <div className="hidden lg:block text-xs text-muted-foreground text-center">
            <p>Warehouse 414</p>
            <p>v1.0</p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default AdminSidebar;
