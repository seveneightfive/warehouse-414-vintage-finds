import { Link } from 'react-router-dom';

const Footer = () => {
  const socialLinks = [
    { label: 'facebook', href: '#' },
    { label: 'instagram', href: '#' },
    { label: '1stdibs', href: '#' },
    { label: 'chairish', href: '#' },
    { label: 'ebay', href: '#' },
  ];

  const navLinks = [
    { to: '/catalog', label: 'catalog' },
    { to: '/about', label: 'about' },
    { to: '/contact', label: 'contact' },
  ];

  return (
    <footer className="border-t border-white/10 bg-[hsl(220,15%,8%)] mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-display text-lg tracking-[0.3em] uppercase text-white mb-4">
              Warehouse 414
            </h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Curated vintage & mid-century modern furniture for the discerning collector.
            </p>
          </div>

          {/* Nav */}
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">navigate</h4>
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm lowercase text-white/50 hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">follow</h4>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm lowercase text-white/50 hover:text-primary transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center">
          <p className="text-xs text-white/40 tracking-wider">
            © {new Date().getFullYear()} warehouse 414. all rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
