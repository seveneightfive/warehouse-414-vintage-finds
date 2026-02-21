import { Facebook, Instagram } from 'lucide-react';
import firstdibsLogo from '@/assets/1stdibs-logo.png';
import chairishLogo from '@/assets/chairish-logo.png';
import ebayLogo from '@/assets/ebay-logo.png';

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-[hsl(220,15%,8%)] mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-display text-lg tracking-[0.3em] uppercase text-white mb-2">
              Warehouse 414
            </h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Curated vintage & mid-century modern furniture for the discerning collector.
            </p>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <a href="#" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-primary transition-colors" aria-label="Facebook">
              <Facebook size={20} />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-primary transition-colors" aria-label="Instagram">
              <Instagram size={20} />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity" aria-label="1stDibs">
              <img src={firstdibsLogo} alt="1stDibs" className="h-5 w-auto brightness-0 invert" />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity" aria-label="Chairish">
              <img src={chairishLogo} alt="Chairish" className="h-5 w-auto brightness-0 invert" />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity" aria-label="eBay">
              <img src={ebayLogo} alt="eBay" className="h-5 w-auto brightness-0 invert" />
            </a>
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
