import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Clock, Archive, BookOpen, BarChart3,
  ChevronDown, ChevronRight, Menu, X,
} from 'lucide-react';

const AdminSidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [expandProducts, setExpandProducts] = useState(
    location.pathname.startsWith('/admin/products')
  );

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

            {/* Product sub-pages */}
            {expandProducts && (
              <div className="ml-2 space-y-1 border-l border-border/50 pl-3">
                <Link
                  to="/admin/products/available"
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded text-xs tracking-wide
                    transition-colors font-display
                    ${
                      isActive('/admin/products/available')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  Available
                </Link>
                <Link
                  to="/admin/products/draft"
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded text-xs tracking-wide
                    transition-colors font-display
                    ${
                      isActive('/admin/products/draft')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  Draft
                </Link>
                <Link
                  to="/admin/products/at-auction"
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded text-xs tracking-wide
                    transition-colors font-display
                    ${
                      isActive('/admin/products/at-auction')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  At Auction
                </Link>
                <Link
                  to="/admin/products/sold"
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded text-xs tracking-wide
                    transition-colors font-display
                    ${
                      isActive('/admin/products/sold')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  Sold
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

          {/* Curated Sets (renamed from Collections) */}
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
            Curated Sets
          </Link>

          {/* Reports (disabled for now) */}
          <div
            title="Coming soon"
            className="flex items-center gap-3 px-4 py-2.5 rounded-md text-muted-foreground opacity-50 cursor-not-allowed"
          >
            <BarChart3 size={18} />
            <span className="font-display text-sm tracking-wide">Reports</span>
          </div>
        </nav>

        {/* Footer */}
        <div className="hidden lg:block px-6 py-4 border-t border-border text-xs text-muted-foreground text-center">
          <p>Warehouse 414</p>
          <p>v1.0</p>
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
