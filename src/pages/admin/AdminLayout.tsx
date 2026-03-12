import { useState, useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LayoutDashboard, Package, Users, Palette, LogOut, Tag, Globe, Clock, Layers, ShoppingBag, MessageSquare, HandCoins, Menu, UserCheck } from 'lucide-react';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/holds', icon: Clock, label: 'Holds' },
  { to: '/admin/consignors', icon: UserCheck, label: 'Consignors' },
  { to: '/admin/offers', icon: HandCoins, label: 'Offers' },
  { to: '/admin/inquiries', icon: MessageSquare, label: 'Inquiries' },
  { to: '/admin/designers', icon: Users, label: 'Designers' },
  { to: '/admin/makers', icon: ShoppingBag, label: 'Makers' },
  { to: '/admin/categories', icon: Layers, label: 'Categories' },
  { to: '/admin/styles', icon: Palette, label: 'Styles' },
  { to: '/admin/periods', icon: Tag, label: 'Periods' },
  { to: '/admin/countries', icon: Globe, label: 'Countries' },
];

const AdminLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/admin', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {navItems.map((item) => (
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
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar - sticky */}
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
            <SheetContent side="left" className="w-56 p-0">
              <div className="p-4 border-b border-border">
                <Link to="/" onClick={() => setSheetOpen(false)} className="font-display text-sm tracking-[0.2em] uppercase text-foreground">
                  W414 Admin
                </Link>
              </div>
              <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                <NavLinks onNavigate={() => setSheetOpen(false)} />
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
