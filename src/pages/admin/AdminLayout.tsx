import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Package, Users, Palette, LogOut, Tag, Globe, Clock, Layers, ShoppingBag, MessageSquare, HandCoins } from 'lucide-react';

const AdminLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/admin/products', icon: Package, label: 'Products' },
    { to: '/admin/holds', icon: Clock, label: 'Holds' },
    { to: '/admin/offers', icon: HandCoins, label: 'Offers' },
    { to: '/admin/inquiries', icon: MessageSquare, label: 'Inquiries' },
    { to: '/admin/designers', icon: Users, label: 'Designers' },
    { to: '/admin/makers', icon: ShoppingBag, label: 'Makers' },
    { to: '/admin/categories', icon: Layers, label: 'Categories' },
    { to: '/admin/styles', icon: Palette, label: 'Styles' },
    { to: '/admin/periods', icon: Tag, label: 'Periods' },
    { to: '/admin/countries', icon: Globe, label: 'Countries' },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <Link to="/" className="font-display text-sm tracking-[0.2em] uppercase text-foreground">
            W414 Admin
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive(item.to, item.exact)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-muted-foreground">
            <LogOut size={16} className="mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
