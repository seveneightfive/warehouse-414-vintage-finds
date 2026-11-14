import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import AdminSidebar from "./AdminSidebar";

/**
 * Every /admin page goes through here. It does two jobs:
 *
 * 1. Guard — no signed-in admin, no dashboard. Previously most admin routes
 *    rendered without any check, and because products are publicly readable
 *    the pages looked normal to a signed-out phone; every save then silently
 *    did nothing. Now the user is sent to sign in, and brought back to the
 *    page they were on afterwards.
 * 2. Layout — stacks the top bar above the content on phones (it used to sit
 *    beside it and squeeze the page), and uses the dynamic viewport height so
 *    iOS/Android browser toolbars don't hide the bottom of the page.
 */
export default function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto overscroll-contain bg-background">
        <div className="container mx-auto px-3 py-4 sm:px-4 lg:px-6 lg:py-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </main>
    </div>
  );
}
