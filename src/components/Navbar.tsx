import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: '/catalog', label: 'catalog' },
    { to: '/about', label: 'about' },
    { to: '/contact', label: 'contact' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(220,15%,8%)]/90 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="font-display text-xl tracking-[0.3em] uppercase text-white hover:text-primary transition-colors">
          Warehouse 414
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm tracking-[0.15em] lowercase transition-colors hover:text-primary ${
                location.pathname === link.to ? 'text-primary' : 'text-white/60'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {open && (
        <nav className="md:hidden bg-[hsl(220,15%,8%)] border-b border-white/10 px-4 pb-4 flex flex-col gap-3">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="text-sm tracking-[0.15em] lowercase text-white/60 hover:text-primary transition-colors"
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
