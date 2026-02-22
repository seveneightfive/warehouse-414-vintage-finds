import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { Product } from '@/types/database';

export async function generateSpecSheet(product: Product, siteUrl: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const black = [0, 0, 0] as const;
  const darkGray = [60, 60, 60] as const;
  const medGray = [130, 130, 130] as const;
  const lineGray = [200, 200, 200] as const;

  // Logo
  try {
    const logoData = await loadImageAsBase64(`${siteUrl}/images/logo-545.jpg`);
    if (logoData) {
      const logoH = 18;
      const logoW = logoH * 2.5;
      doc.addImage(logoData, 'JPEG', margin, y, logoW, logoH);
      y += logoH + 4;
    }
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...black);
    doc.text('WAREHOUSE 414', margin, y + 8);
    y += 14;
  }

  doc.setDrawColor(...lineGray);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Featured image (small square)
  const imageUrl = product.featured_image_url;
  let imgPlaced = false;
  let imgData: string | null = null;
  if (imageUrl) {
    try {
      imgData = await loadImageAsBase64(imageUrl);
      if (imgData) {
        imgPlaced = true;
      }
    } catch {
      // skip
    }
  }

  const imgSize = 45; // small square
  const textStartX = imgPlaced ? margin + imgSize + 8 : margin;
  const textW = imgPlaced ? contentW - imgSize - 8 : contentW;
  const imgStartY = y;

  if (imgPlaced && imgData) {
    doc.addImage(imgData, 'JPEG', margin, y, imgSize, imgSize);
  }

  // Title (beside image if present)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...black);
  const titleLines = doc.splitTextToSize(product.name, textW);
  doc.text(titleLines, textStartX, y + 5);
  y += titleLines.length * 7 + 3;

  // Price
  if (product.price) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(...darkGray);
    doc.text(`$${product.price.toLocaleString()}`, textStartX, y);
    y += 8;
  }

  // Ensure y is past the image
  if (imgPlaced) {
    y = Math.max(y, imgStartY + imgSize + 6);
  }

  doc.setDrawColor(...lineGray);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // Details table
  const details: [string, string][] = [];
  if (product.designer?.name) details.push(['Designer', product.designer.name]);
  if (product.maker?.name) details.push(['Maker', product.maker.name]);
  if (product.style?.name) details.push(['Style', product.style.name]);
  if (product.period?.name) details.push(['Period', product.period.name]);
  if (product.country?.name) details.push(['Country of Origin', product.country.name]);
  if (product.year_created) details.push(['Year', product.year_created]);
  if (product.product_dimensions) details.push(['Product Dimensions', product.product_dimensions]);
  if ((product as any).box_dimensions) details.push(['Box Dimensions', (product as any).box_dimensions]);
  if (product.materials) details.push(['Materials', product.materials]);
  if (product.condition) details.push(['Condition', product.condition]);
  if (product.sku) details.push(['SKU', product.sku]);

  const colW = contentW / 2;
  for (let i = 0; i < details.length; i += 2) {
    for (let col = 0; col < 2 && i + col < details.length; col++) {
      const [label, value] = details[i + col];
      const x = margin + col * colW;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...medGray);
      doc.text(label.toUpperCase(), x, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...black);
      doc.text(value, x, y + 4.5);
    }
    y += 13;
  }

  // Description
  const desc = product.short_description;
  if (desc) {
    y += 2;
    doc.setDrawColor(...lineGray);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...medGray);
    doc.text('DESCRIPTION', margin, y);
    y += 5;

    // Strip HTML tags for PDF
    const plainDesc = desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    const descLines = doc.splitTextToSize(plainDesc, contentW);
    doc.text(descLines, margin, y);
  }

  // QR Code + footer (anchored to bottom)
  const productUrl = `${siteUrl}/product/${product.id}`;
  const qrDataUrl = await QRCode.toDataURL(productUrl, {
    width: 200,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const footerY = pageH - 30;

  doc.setDrawColor(...lineGray);
  doc.line(margin, footerY - 5, pageW - margin, footerY - 5);

  const qrSize = 20;
  doc.addImage(qrDataUrl, 'PNG', pageW - margin - qrSize, footerY, qrSize, qrSize);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...medGray);
  doc.text('Scan to view online', pageW - margin - qrSize, footerY + qrSize + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...black);
  doc.text('WAREHOUSE 414', margin, footerY + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkGray);
  doc.text('785.232.8008', margin, footerY + 8);
  doc.text('sales@warehouse414.com', margin, footerY + 12.5);

  doc.setFontSize(6.5);
  doc.setTextColor(...medGray);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, margin, footerY + 17);

  const filename = `W414-${product.name.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40)}.pdf`;
  doc.save(filename);
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
