import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionType = 'inquiry' | 'offer' | 'purchase' | 'hold' | 'specsheet' | null;

interface Product {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  short_description?: string;
  long_description?: string;
  product_dimensions?: string;
  box_dimensions?: string;
  materials?: string;
  featured_image_url?: string;
  status: string;
}

interface ProductActionsProps {
  product: Product;
  /** 'actions' = Inquire/Purchase dropdown. 'specsheet' = spec sheet button only. */
  mode?: 'actions' | 'specsheet';
}

// ─── Shared form field components ────────────────────────────────────────────

const FormField = ({ label, type = 'text', value, onChange, placeholder, required, min, step }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; min?: string; step?: string;
}) => (
  <div className="space-y-1">
    <label className="block text-[11px] tracking-[0.12em] uppercase text-muted-foreground font-display">
      {label}{required && <span className="text-primary ml-1">*</span>}
    </label>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} required={required} min={min} step={step}
      className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-display
        focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary
        placeholder:text-muted-foreground/50 transition-colors"
    />
  </div>
);

const TextAreaField = ({ label, value, onChange, placeholder, required, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; rows?: number;
}) => (
  <div className="space-y-1">
    <label className="block text-[11px] tracking-[0.12em] uppercase text-muted-foreground font-display">
      {label}{required && <span className="text-primary ml-1">*</span>}
    </label>
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} required={required} rows={rows}
      className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-display
        focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary
        placeholder:text-muted-foreground/50 transition-colors resize-none"
    />
  </div>
);

// ─── Modal rendered via portal to escape sticky bar stacking context ──────────

function Modal({ current, activeAction, closeModal, success, error, loading,
  name, setName, email, setEmail, phone, setPhone, message, setMessage,
  offerAmount, setOfferAmount, zipCode, setZipCode,
  includePrice, setIncludePrice, product }: any) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className="bg-card border border-border rounded-sm shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="font-display text-sm tracking-[0.15em] uppercase text-foreground">
              {current.title}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1 font-display line-clamp-1">
              {current.subtitle}
            </p>
          </div>
          <button onClick={closeModal}
            className="text-muted-foreground hover:text-foreground transition-colors ml-4 mt-0.5 p-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {success ? (
            <div className="py-4 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9l4.5 4.5L15 5" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-display text-foreground leading-relaxed">{success}</p>
              <button onClick={closeModal}
                className="text-[11px] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors font-display">
                Close
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-sm px-3 py-2">
                  <p className="text-xs text-destructive font-display">{error}</p>
                </div>
              )}

              <FormField label="Your Name" value={name} onChange={setName} placeholder="Full name" required />
              <FormField label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />

              {activeAction !== 'specsheet' && (
                <FormField label="Phone (optional)" type="tel" value={phone} onChange={setPhone} placeholder="(555) 000-0000" />
              )}

              {activeAction === 'offer' && (
                <FormField label="Your Offer" type="number" value={offerAmount} onChange={setOfferAmount}
                  placeholder={product?.price ? `Listed at $${product.price.toLocaleString()}` : 'Amount in USD'}
                  required min="1" step="1"
                />
              )}

              {activeAction === 'purchase' && (
                <FormField label="Shipping Zip Code" value={zipCode} onChange={setZipCode}
                  placeholder="For freight quote" required />
              )}

              {(activeAction === 'inquiry' || activeAction === 'offer') && (
                <TextAreaField
                  label={activeAction === 'offer' ? 'Message (optional)' : 'Your Question'}
                  value={message} onChange={setMessage}
                  placeholder={activeAction === 'offer' ? 'Any additional context...' : 'What would you like to know?'}
                  required={activeAction === 'inquiry'} rows={3}
                />
              )}

              {(activeAction === 'hold' || activeAction === 'purchase') && (
                <TextAreaField label="Notes (optional)" value={message} onChange={setMessage}
                  placeholder="Any questions or additional details..." rows={2} />
              )}

              {activeAction === 'specsheet' && (
                <div className="flex items-center gap-3 py-1">
                  <button type="button" onClick={() => setIncludePrice((p: boolean) => !p)}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none
                      ${includePrice ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow
                      transition-transform duration-200 ${includePrice ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-[11px] tracking-[0.1em] uppercase font-display text-foreground">
                    Include price on spec sheet
                  </span>
                </div>
              )}

              {activeAction === 'hold' && (
                <p className="text-[10px] text-muted-foreground font-display leading-relaxed border-l-2 border-primary/30 pl-3">
                  Holds are valid for 5 days. After that, the item returns to available status.
                  We'll send a confirmation to your email.
                </p>
              )}

              {activeAction === 'purchase' && (
                <p className="text-[10px] text-muted-foreground font-display leading-relaxed border-l-2 border-primary/30 pl-3">
                  All purchases are handled personally. We'll contact you with a freight quote
                  and invoice tailored to your location.
                </p>
              )}

              <button onClick={current.onSubmit} disabled={loading}
                className="w-full mt-2 py-2.5 bg-primary text-primary-foreground font-display
                  text-[11px] tracking-[0.2em] uppercase rounded-sm
                  hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Processing...
                  </span>
                ) : current.submitLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductActions({ product, mode = 'actions' }: ProductActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [includePrice, setIncludePrice] = useState(true);

  const isSold = product.status === 'sold';

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = activeAction ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [activeAction]);

  const resetForm = () => {
    setName(''); setEmail(''); setPhone(''); setMessage('');
    setOfferAmount(''); setZipCode(''); setSuccess(null); setError(null);
  };

  const openAction = (action: ActionType) => { resetForm(); setActiveAction(action); setMenuOpen(false); };
  const closeModal = () => { setActiveAction(null); resetForm(); };

  // ── Submissions ──────────────────────────────────────────────────────────────

  const submitInquiry = async () => {
    if (!name || !email || !message) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('purchase_inquiries').insert({
        product_id: product.id, customer_name: name, customer_email: email,
        customer_phone: phone || null, inquiry_type: 'question', message,
      });
      if (error) throw error;
      setSuccess("Your question has been sent. We'll be in touch shortly.");
    } catch (e: any) { setError(e.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  const submitOffer = async () => {
    if (!name || !email || !offerAmount) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('purchase_inquiries').insert({
        product_id: product.id, customer_name: name, customer_email: email,
        customer_phone: phone || null, inquiry_type: 'offer',
        offer_amount: parseFloat(offerAmount), message: message || null,
      });
      if (error) throw error;
      setSuccess("Your offer has been received. We'll respond within 1–2 business days.");
    } catch (e: any) { setError(e.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  const submitPurchase = async () => {
    if (!name || !email || !zipCode) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('purchase_inquiries').insert({
        product_id: product.id, customer_name: name, customer_email: email,
        customer_phone: phone || null, inquiry_type: 'purchase',
        shipping_zip: zipCode, message: message || null,
      });
      if (error) throw error;
      setSuccess("Thank you! We'll prepare a shipping quote and invoice for you shortly.");
    } catch (e: any) { setError(e.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  const submitHold = async () => {
    if (!name || !email) return;
    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);
      const { error } = await supabase.from('product_holds').insert({
        product_id: product.id, customer_name: name, customer_email: email,
        customer_phone: phone || null, expires_at: expiresAt.toISOString(), notes: message || null,
      });
      if (error) throw error;
      setSuccess(`This item has been placed on hold for you until ${expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`);
    } catch (e: any) { setError(e.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  const submitSpecSheet = async () => {
    if (!name || !email) return;
    setLoading(true);
    try {
      const { error: dbError } = await supabase.from('spec_sheet_downloads').insert({
        product_id: product.id, customer_name: name, customer_email: email, include_price: includePrice,
      });
      if (dbError) throw dbError;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageW = 215.9, margin = 20, contentW = pageW - margin * 2;
      let y = margin;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(40, 30, 20);
      doc.text('WAREHOUSE 414', margin, y); y += 7;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120, 100, 80);
      doc.text('HIGH STYLE FASHIONABLE VINTAGE FURNISHINGS & ART', margin, y); y += 4;
      doc.setDrawColor(180, 150, 100); doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y); y += 10;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(40, 30, 20);
      const nameLines = doc.splitTextToSize(product.name, contentW);
      doc.text(nameLines, margin, y); y += nameLines.length * 7 + 4;

      if (product.sku) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(140, 120, 90);
        doc.text(`SKU: ${product.sku}`, margin, y); y += 6;
      }
      if (includePrice && product.price) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(160, 120, 50);
        doc.text(`$${product.price.toLocaleString()}`, margin, y); y += 9;
      }

      doc.setDrawColor(220, 200, 170); doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y); y += 8;

      const addSection = (title: string, content: string) => {
        if (!content) return;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(100, 80, 55);
        doc.text(title.toUpperCase(), margin, y); y += 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(50, 40, 30);
        const lines = doc.splitTextToSize(content, contentW);
        doc.text(lines, margin, y); y += lines.length * 5.5 + 7;
      };

      addSection('Description', product.short_description || product.long_description || '');
      addSection('Materials', product.materials || '');
      addSection('Dimensions', product.product_dimensions || '');
      addSection('Shipping / Crated Dimensions', product.box_dimensions || '');

      const footerY = 279 - 15;
      doc.setDrawColor(180, 150, 100); doc.setLineWidth(0.5);
      doc.line(margin, footerY, pageW - margin, footerY);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 130, 100);
      doc.text('warehouse414.com  ·  chris@warehouse414.com  ·  785.232.8008', margin, footerY + 5);
      doc.text(`Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, pageW - margin, footerY + 5, { align: 'right' });

      doc.save(`${product.sku || product.id}-spec-sheet.pdf`);
      setSuccess('Your spec sheet is downloading now.');
    } catch (e: any) { setError(e.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  // ── Modal config ─────────────────────────────────────────────────────────────

  const modalConfig: Record<string, { title: string; subtitle: string; onSubmit: () => void; submitLabel: string }> = {
    inquiry: { title: 'Ask a Question', subtitle: product.name, onSubmit: submitInquiry, submitLabel: 'Send Question' },
    offer: { title: 'Make an Offer', subtitle: product.price ? `Listed at $${product.price.toLocaleString()}` : product.name, onSubmit: submitOffer, submitLabel: 'Submit Offer' },
    purchase: { title: 'Purchase This Piece', subtitle: "We'll prepare a shipping quote and invoice", onSubmit: submitPurchase, submitLabel: 'Request Invoice' },
    hold: { title: 'Place on Hold', subtitle: 'Reserve this item for up to 5 days', onSubmit: submitHold, submitLabel: 'Confirm Hold' },
    specsheet: { title: 'Download Spec Sheet', subtitle: 'Enter your details to receive the PDF', onSubmit: submitSpecSheet, submitLabel: 'Download PDF' },
  };

  const current = activeAction ? modalConfig[activeAction] : null;

  const modalProps = {
    current, activeAction, closeModal, success, error, loading,
    name, setName, email, setEmail, phone, setPhone, message, setMessage,
    offerAmount, setOfferAmount, zipCode, setZipCode, includePrice, setIncludePrice, product,
  };

  // ── Spec Sheet mode ──────────────────────────────────────────────────────────

  if (mode === 'specsheet') {
    return (
      <>
        <button
          onClick={() => openAction('specsheet')}
          className="flex items-center gap-2 px-3 py-2 border border-border rounded-sm
            font-display text-[11px] tracking-[0.15em] uppercase text-muted-foreground
            hover:text-foreground hover:border-foreground transition-colors duration-200 shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Spec Sheet
        </button>
        {activeAction === 'specsheet' && current && createPortal(<Modal {...modalProps} />, document.body)}
      </>
    );
  }

  // ── Actions mode (default) ───────────────────────────────────────────────────

  const actionMenuItems = [
    { action: 'inquiry' as ActionType, label: 'Ask a Question', icon: '?', desc: 'Get more details about this piece' },
    { action: 'offer' as ActionType, label: 'Make an Offer', icon: '$', desc: 'Submit your best offer' },
    ...(!isSold ? [
      { action: 'purchase' as ActionType, label: 'Purchase', icon: '→', desc: 'Begin the buying process' },
      { action: 'hold' as ActionType, label: 'Place on Hold', icon: '⏱', desc: 'Reserve for up to 5 days' },
    ] : []),
  ];

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="flex items-center gap-2.5 px-5 py-2.5 bg-primary text-primary-foreground
            font-display text-[11px] tracking-[0.2em] uppercase rounded-sm
            hover:bg-primary/90 transition-colors duration-200 select-none"
        >
          <span>Inquire / Purchase</span>
          <span className="text-xs" style={{ display: 'inline-block', transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▾
          </span>
        </button>

        {/* Dropdown opens UPWARD above the sticky bar */}
        {menuOpen && (
          <div className="absolute right-0 bottom-full mb-1.5 w-64 bg-card border border-border
            rounded-sm shadow-xl z-50 overflow-hidden">
            {actionMenuItems.map((item, i) => (
              <button
                key={item.action}
                onClick={() => openAction(item.action)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left
                  hover:bg-muted transition-colors duration-100
                  ${i < actionMenuItems.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <span className="w-6 h-6 flex items-center justify-center text-primary
                  font-display text-xs border border-primary/30 rounded-sm shrink-0 mt-0.5">
                  {item.icon}
                </span>
                <div>
                  <div className="text-[11px] font-display tracking-[0.12em] uppercase text-foreground">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-display">
                    {item.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal via portal — renders into document.body, z-index 9999, above everything */}
      {activeAction && activeAction !== 'specsheet' && current && createPortal(<Modal {...modalProps} />, document.body)}
    </>
  );
}
