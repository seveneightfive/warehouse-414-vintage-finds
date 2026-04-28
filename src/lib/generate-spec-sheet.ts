import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { Product } from "@/types/database";

export async function generateSpecSheet(product: Product, siteUrl: string, includePrice: boolean = true) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const black = [0, 0, 0] as const;
  const darkGray = [60, 60, 60] as const;
  const medGray = [130, 130, 130] as const;
  const lineGray = [200, 200, 200] as const;

  // ── HEADER ROW: Logo left, QR code right ──
  const headerH = 18;
  const qrSize = 18;

  // QR Code (top right)
  const productUrl = `${siteUrl}/product/${product.slug}`;
  const qrDataUrl = await QRCode.toDataURL(productUrl, {
    width: 200,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
  doc.addImage(qrDataUrl, "PNG", pageW - margin - qrSize, y, qrSize, qrSize);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...medGray);
  doc.text("scan to view online", pageW - margin - qrSize, y + qrSize + 3);

  // Logo (top left)
  try {
    const logoData = await loadImageAsBase64(`${siteUrl}/images/logo-545.jpg`);
    if (logoData) {
      const logoW = headerH * 2.5;
      doc.addImage(logoData, "JPEG", margin, y, logoW, headerH);
    }
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...black);
    doc.text("WAREHOUSE 414", margin, y + 8);
  }

  y += headerH + 6;

  // Divider
  doc.setDrawColor(...lineGray);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── PRODUCT TITLE + SKU ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...black);
  const titleLines = doc.splitTextToSize(product.name, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6 + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...medGray);
  doc.text(`SKU: ${product.sku}`, margin, y);
  y += 6;

  // ── PRICE (only if includePrice is true) ──
  if (includePrice && product.price) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...black);
    doc.text(`$${product.price.toLocaleString()}`, margin, y);
    y += 6;
  }

  doc.setDrawColor(...lineGray);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── TWO COLUMN: Image (60%) left, Dimensions (40%) right ──
  const imgColW = contentW * 0.58;
  const dimColX = margin + imgColW + 6;
  const dimColW = contentW * 0.38;
  const twoColStartY = y;

  // Featured image (left, large)
  if (product.featured_image_url) {
    try {
      const imgData = await loadImageAsBase64(product.featured_image_url);
      if (imgData) {
        const imgH = imgColW * 0.85;
        doc.addImage(imgData, "JPEG", margin, y, imgColW, imgH);
      }
    } catch {
      // skip
    }
  }

  // Dimensions (right column)
  let dimY = twoColStartY;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...medGray);
  doc.text("PRODUCT DIMENSIONS", dimColX, dimY);
  dimY += 5;

  if (product.product_dimensions) {
    const dimLines = doc.splitTextToSize(product.product_dimensions, dimColW);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...black);
    doc.text(dimLines, dimColX, dimY);
    dimY += dimLines.length * 5 + 6;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.text("Not specified", dimColX, dimY);
    dimY += 10;
  }

  if ((product as any).box_dimensions) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...medGray);
    doc.text("BOX / SHIPPING DIMENSIONS", dimColX, dimY);
    dimY += 5;
    const boxLines = doc.splitTextToSize((product as any).box_dimensions, dimColW);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...black);
    doc.text(boxLines, dimColX, dimY);
    dimY += boxLines.length * 5 + 6;
  }

  // Additional details in right column
  const rightDetails: [string, string][] = [];
  if (product.materials) rightDetails.push(["MATERIALS", product.materials]);
  if (product.year_created) rightDetails.push(["YEAR", product.year_created]);
  if (product.condition) rightDetails.push(["CONDITION", product.condition]);

  for (const [label, value] of rightDetails) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...medGray);
    doc.text(label, dimColX, dimY);
    dimY += 4;
    const valLines = doc.splitTextToSize(value, dimColW);
    doc.setFontSize(9);
    doc.setTextColor(...black);
    doc.text(valLines, dimColX, dimY);
    dimY += valLines.length * 5 + 5;
  }

  // Advance y past the taller of the two columns
  const imgH = imgColW * 0.85;
  y = Math.max(twoColStartY + imgH, dimY) + 6;

  doc.setDrawColor(...lineGray);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── ATTRIBUTION DETAILS ──
  const details: [string, string][] = [];
  if (product.designer?.name) details.push(["Designer", product.designer.name]);
  if (product.maker?.name) details.push(["Maker", product.maker.name]);
  if (product.style?.name) details.push(["Style", product.style.name]);
  if (product.period?.name) details.push(["Period", product.period.name]);
  if (product.country?.name) details.push(["Country of Origin", product.country.name]);

  const colW = contentW / 2;
  for (let i = 0; i < details.length; i += 2) {
    for (let col = 0; col < 2 && i + col < details.length; col++) {
      const [label, value] = details[i + col];
      const x = margin + col * colW;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...medGray);
      doc.text(label.toUpperCase(), x, y);
      doc.setFontSize(9);
      doc.setTextColor(...black);
      doc.text(value, x, y + 4.5);
    }
    y += 12;
  }

  // ── DESCRIPTION ──
  const desc = product.short_description;
  if (desc) {
    doc.setDrawColor(...lineGray);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...medGray);
    doc.text("DESCRIPTION", margin, y);
    y += 5;

    const plainDesc = desc
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    const descLines = doc.splitTextToSize(plainDesc, contentW);
    doc.text(descLines, margin, y);
  }

  // ── FOOTER ──
  const footerY = pageH - 18;
  doc.setDrawColor(...lineGray);
  doc.line(margin, footerY - 4, pageW - margin, footerY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...medGray);
  doc.text(`warehouse414.com  ·  sales@warehouse414.com  ·  785.232.8008`, margin, footerY);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, pageW - margin, footerY, { align: "right" });

  const filename = `W414-${product.name.replace(/[^a-zA-Z0-9]/g, "-").substring(0, 40)}.pdf`;
  doc.save(filename);
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
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
