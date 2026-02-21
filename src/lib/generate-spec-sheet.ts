import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { Product } from '@/types/database';

export async function generateSpecSheet(product: Product, siteUrl: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Colors
  const dark = [30, 32, 38] as const;
  const brass = [194, 160, 82] as const;
  const gray = [140, 140, 150] as const;
  const white = [230, 225, 215] as const;

  // Background
  doc.setFillColor(...dark);
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F');

  // Header line
  doc.setDrawColor(...brass);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...white);
  doc.text('WAREHOUSE 414', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text('SPEC SHEET', pageW - margin, y, { align: 'right' });
  y += 4;

  doc.setFontSize(7);
  doc.text('Curated Vintage & Mid-Century Modern Furniture', margin, y);
  y += 8;

  doc.setDrawColor(...brass);
  doc.line(margin, y, pageW - margin, y);
  y += 12;

  // Product image (if available)
  const firstImage = product.product_images?.sort((a, b) => a.position - b.position)?.[0];
  if (firstImage) {
    try {
      const imgData = await loadImageAsBase64(firstImage.url);
      if (imgData) {
        const imgW = contentW;
        const imgH = imgW * 0.6;
        doc.addImage(imgData, 'JPEG', margin, y, imgW, imgH);
        y += imgH + 10;
      }
    } catch {
      // Skip image if it fails to load
    }
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...white);
  const titleLines = doc.splitTextToSize(product.title, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 4;

  // Price
  if (product.price) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(...brass);
    doc.text(`$${product.price.toLocaleString()}`, margin, y);
    y += 10;
  }

  // Divider
  doc.setDrawColor(60, 62, 68);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Details grid
  const details: [string, string][] = [];
  if (product.designer?.name) details.push(['Designer', product.designer.name]);
  if (product.maker?.name) details.push(['Maker', product.maker.name]);
  if (product.category?.name) details.push(['Category', product.category.name]);
  if (product.style?.name) details.push(['Style', product.style.name]);
  if (product.period?.name) details.push(['Period', product.period.name]);
  if (product.country?.name) details.push(['Country of Origin', product.country.name]);
  if (product.year) details.push(['Year', String(product.year)]);
  if (product.dimensions) details.push(['Dimensions', product.dimensions]);
  if (product.materials) details.push(['Materials', product.materials]);
  if (product.condition) details.push(['Condition', product.condition]);

  const colW = contentW / 2;
  for (let i = 0; i < details.length; i += 2) {
    for (let col = 0; col < 2 && i + col < details.length; col++) {
      const [label, value] = details[i + col];
      const x = margin + col * colW;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...gray);
      doc.text(label.toUpperCase(), x, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...white);
      doc.text(value, x, y + 5);
    }
    y += 14;
  }

  // Description
  if (product.description) {
    y += 4;
    doc.setDrawColor(60, 62, 68);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text('DESCRIPTION', margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(...white);
    const descLines = doc.splitTextToSize(product.description, contentW);
    doc.text(descLines, margin, y);
    y += descLines.length * 4.5 + 6;
  }

  // QR Code + footer
  const productUrl = `${siteUrl}/product/${product.id}`;
  const qrDataUrl = await QRCode.toDataURL(productUrl, {
    width: 200,
    margin: 1,
    color: { dark: '#e6e1d7', light: '#1e2026' },
  });

  const footerY = doc.internal.pageSize.getHeight() - 35;

  // Footer line
  doc.setDrawColor(...brass);
  doc.line(margin, footerY - 5, pageW - margin, footerY - 5);

  // QR code
  const qrSize = 22;
  doc.addImage(qrDataUrl, 'PNG', pageW - margin - qrSize, footerY, qrSize, qrSize);

  // Footer text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text('Scan to view online', pageW - margin - qrSize, footerY + qrSize + 4);

  doc.setFontSize(8);
  doc.setTextColor(...white);
  doc.text('WAREHOUSE 414', margin, footerY + 4);

  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text(siteUrl, margin, footerY + 9);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, margin, footerY + 14);

  // Save
  const filename = `W414-${product.title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40)}.pdf`;
  doc.save(filename);
}

function loadImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
