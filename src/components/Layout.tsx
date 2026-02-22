import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
  const location = useLocation();
  const isProductPage = location.pathname.startsWith('/product/');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-14 md:pt-[6.5rem]">
        <Outlet />
      </main>
      {!isProductPage && <Footer />}
    </div>
  );
};

export default Layout;
