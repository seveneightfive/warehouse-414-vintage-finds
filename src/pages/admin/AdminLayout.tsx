import { useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard, Package, Users, Palette, LogOut, Tag, Globe,
  Clock, Layers, ShoppingBag, MessageSquare, HandCoins, Menu,
  UserCheck, FolderOpen, Archive, ChevronDown, ChevronRight,
} from 'lucide-react';

// ─── Nav structure ────────────────────────────────────────────────────────────

type NavItem =
  | { type: 'link';  to: string; icon: React.ElementType; label: string; exact?: boolean }
  | { type: 'group'; icon: React.ElementType; label: string; basePath: string;
      children: { to: string; label: string }[] };

const navItems: NavItem[] = [
  { type: 'link', to: '/admin',            icon: LayoutDashboard, label: 'Dashboard', exact: true },

  // Products group — links to /admin/products with a status param
  {
    type: 'group',
    icon: Package,
    label: 'Products',
    basePath: '/admin/products',
    children: [
      { to: '/admin/products?status=available',  label: 'Available'   },
      { to: '/admin/products?status=on_hold',     label: 'On Hold'     },
      { to: '/admin/products?status=at_auction',  label: 'At Auction'  },
      { to: '/admin/products?status=sold',        label: 'Sold'        },
    ],
  },

  // Inventory group
  {
    type: 'group',
    icon: Archive,
    label: 'Inventory',
    basePath: '/admin/inventory',
    children: [
      { to: '/admin/products?status=inventory',   label: 'Inventory'   },
      { to: '/admin/products?status=draft',        label: 'Drafts'      },
      { to: '/admin/products?status=deactivated',  label: 'Deactivated' },
    ],
  },

  { type: 'link', to: '/admin/holds',       icon: Clock,         label: 'Holds'       },
  { type: 'link', to: '/admin/consignors',  icon: UserCheck,     label: 'Consignors'  },
  { type: 'link', to: '/admin/offers',      icon: HandCoins,     label: 'Offers'      },
  { type: 'link', to: '/admin/inquiries',   icon: MessageSquare, label: 'Inquiries'   },
  { type: 'link', to: '/admin/designers',   icon: Users,         label: 'Designers'   },
  { type: 'link', to: '/admin/makers',      icon: ShoppingBag,   label: 'Makers'      },
  { type: 'link', to: '/admin/categories',  icon: Layers,        label: 'Categories'  },
  { type: 'link', to: '/admin/collections', icon: FolderOpen,    label: 'Collections' },
  { type: 'link', to: '/admin/styles',      icon: Palette,       label: 'Styles'      },
  { type: 'link', to: '/admin/periods',     icon: Tag,           label: 'Periods'     },
  { type: 'link', to: '/admin/countries',   icon: Globe,         label: 'Countries'   },
];

// ─── Expandable nav group ─────────────────────────────────────────────────────

const NavGroup = ({
  item,
  location,
  onNavigate,
}: {
  item: Extract<NavItem, { type: 'group' }>;
  location: ReturnType<typeof useLocation>;
  onNavigate?: () => void;
}) => {
  // Auto-expand when any child route is active
  const isChildActive = item.children.some((c) => location.search.includes(c.to.split('?')[1] ?? '') && location.pathname === '/admin/products');
  const [open, setOpen] = useState(isChildActive);
  const groupActive = location.pathname === '/admin/products' && isChildActive;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
          groupActive
            ? 'bg-primary/10 text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        <item.icon size={16} className="shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="ml-7 mt-0.5 space-y-0.5">
          {item.children.map((child) => {
            const [path, qs] = child.to.split('?');
            const childActive = location.pathname === path && location.search === `?${qs}`;
            return (
              <Link
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                  childActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Nav links renderer ───────────────────────────────────────────────────────

const NavLinks = ({
  location,
  onNavigate,
}: {
  location: ReturnType<typeof useLocation>;
  onNavigate?: () => void;
}) => {
  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <>
      {navItems.map((item, i) => {
        if (item.type === 'group') {
          return (
            <NavGroup key={i} item={item} location={location} onNavigate={onNavigate} />
          );
        }
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive(item.to, item.exact)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
};

// ─── Layout ───────────────────────────────────────────────────────────────────

const AdminLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;

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
          <NavLinks location={location} />
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
            <SheetContent side="left" className="w-56 p-0">
              <div className="p-4 border-b border-border">
                <Link to="/" onClick={() => setSheetOpen(false)} className="font-display text-sm tracking-[0.2em] uppercase text-foreground">
                  W414 Admin
                </Link>
              </div>
              <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                <NavLinks location={location} onNavigate={() => setSheetOpen(false)} />
              </nav>
              <div className="p-3 border-t border-border">
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
