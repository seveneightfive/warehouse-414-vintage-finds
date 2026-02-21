import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, ArrowLeft } from 'lucide-react';
import logoTop from '@/assets/logo-top.png';
import logoBottom from '@/assets/logo-bottom.png';

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isProductPage = location.pathname.startsWith('/product/');

  const links = [
    { to: '/catalog', label: 'catalog' },
    { to: '/about', label: 'about' },
    { to: '/contact', label: 'contact' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Black top row */}
      <div className="bg-black">
        {/* Desktop: 3-column grid for centered logo */}
        <div className="container mx-auto hidden md:grid grid-cols-3 items-center h-14 px-4">
          <div className="justify-self-start">
            {isProductPage && (
              <button onClick={() => navigate(-1)} className="text-white hover:opacity-70 transition-opacity">
                <ArrowLeft size={20} />
              </button>
            )}
          </div>
          <Link to="/" className="justify-self-center hover:opacity-80 transition-opacity">
            <img src={logoTop} alt="Warehouse 414" className="h-10 w-auto" />
          </Link>
          <nav className="justify-self-end flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-display text-sm tracking-[0.15em] transition-colors hover:text-primary ${
                  location.pathname === link.to ? 'text-primary' : 'text-white/60'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        {/* Mobile: flex layout */}
        <div className="container mx-auto flex md:hidden items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            {isProductPage && (
              <button onClick={() => navigate(-1)} className="text-white hover:opacity-70 transition-opacity">
                <ArrowLeft size={20} />
              </button>
            )}
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <img src={logoTop} alt="Warehouse 414" className="h-10 w-auto" />
            </Link>
          </div>
          <button className="text-white" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* White bottom row */}
      <div className="bg-white border-b border-border">
        <div className="container mx-auto flex justify-center py-2 px-4">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <img src={logoBottom} alt="Warehouse 414" className="h-8 w-auto" />
          </Link>
        </div>
      </div>

      {/* Mobile Nav */}
      {open && (
        <nav className="md:hidden bg-black border-b border-white/10 px-4 pb-4 flex flex-col gap-3">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="font-display text-sm tracking-[0.15em] text-white/60 hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};

export default Navbar;
