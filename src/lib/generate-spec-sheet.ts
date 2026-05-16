import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { Product } from "@/types/database";

export async function generateSpecSheet(
  product: Product,
  siteUrl: string,
  includePrice: boolean = true
) {
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

  // Normalize site URL (no trailing slash)
  const normalizedSite = siteUrl.replace(/\/$/, "");

  // ── HEADER ROW: Logo left, QR code right ──
  const headerH = 22;
  const qrSize = 22;

  // QR Code (top right) — encodes the public product URL
  try {
    const productUrl = `${normalizedSite}/product/${product.slug}`;
    const qrDataUrl = await QRCode.toDataURL(productUrl, {
      width: 300,
      margin: 0,
      color: { dark: "#000000", light: "#ffffff" },
    });
    doc.addImage(qrDataUrl, "PNG", pageW - margin - qrSize, y, qrSize, qrSize);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...medGray);
    doc.text("scan to view online", pageW - margin - qrSize / 2, y + qrSize + 3, {
      align: "center",
    });
  } catch (err) {
    console.error("[spec-sheet] QR generation failed:", err);
  }

  // Logo (top left)
  const logoUrl = `${normalizedSite}/images/logo-545.jpg`;
  let logoDrawn = false;
  const logoData = await loadImageAsBase64(logoUrl);
  if (logoData) {
    try {
      const { width, height } = await getImageDimensions(logoData);
      const ratio = width / height;
      let drawH = headerH;
      let drawW = drawH * ratio;
      const maxW = contentW * 0.5;
      if (drawW > maxW) {
        drawW = maxW;
        drawH = drawW / ratio;
      }
      const format = logoData.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(logoData, format, margin, y, drawW, drawH);
      logoDrawn = true;
    } catch (err) {
      console.error("[spec-sheet] addImage(logo) failed:", err);
    }
  }

  if (!logoDrawn) {
    console.warn("[spec-sheet] Logo not loaded — using text fallback. URL was:", logoUrl);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...black);
    doc.text("WAREHOUSE 414", margin, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...medGray);
    doc.text("HIGH STYLE FASHIONABLE VINTAGE FURNISHINGS & ART", margin, y + 13);
  }

  y += headerH + 8;

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

  // ── PRICE ──
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

  // ── TWO COLUMN: meta details LEFT, featured image RIGHT ──
  let featuredImg: { data: string; format: "JPEG" | "PNG"; ratio: number } | null = null;
  if (product.featured_image_url) {
    const loaded = await loadImageAsBase64(product.featured_image_url);
    if (loaded) {
      try {
        const { width, height } = await getImageDimensions(loaded);
        featuredImg = {
          data: loaded,
          format: loaded.startsWith("data:image/png") ? "PNG" : "JPEG",
          ratio: width / height,
        };
      } catch (err) {
        console.error("[spec-sheet] featured image dim read failed:", err);
      }
    } else {
      console.warn(
        "[spec-sheet] featured_image_url could not be loaded:",
        product.featured_image_url
      );
    }
  }

  const hasImage = !!featuredImg;
  const metaColW = hasImage ? contentW * 0.55 : contentW;
  const gutter = hasImage ? 6 : 0;
  const imgColW = hasImage ? contentW - metaColW - gutter : 0;
  const metaColX = margin;
  const imgColX = margin + metaColW + gutter;
  const twoColStartY = y;

  // Featured image (right)
  let imgH = 0;
  if (featuredImg) {
    let drawW = imgColW;
    let drawH = drawW / featuredImg.ratio;
    const maxH = 110;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * featuredImg.ratio;
    }
    const xOffset = (imgColW - drawW) / 2;
    try {
      doc.addImage(
        featuredImg.data,
        featuredImg.format,
        imgColX + xOffset,
        y,
        drawW,
        drawH
      );
      imgH = drawH;
    } catch (err) {
      console.error("[spec-sheet] addImage(featured) failed:", err);
    }
  }

  // Meta column (left): Materials, Dimensions, Shipping
  let metaY = twoColStartY;
  const writeMetaLabel = (label: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...medGray);
    doc.text(label, metaColX, metaY);
    metaY += 4.5;
  };
  const writeMetaValue = (value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...black);
    const lines = doc.splitTextToSize(value, metaColW);
    doc.text(lines, metaColX, metaY);
    metaY += lines.length * 4.5 + 4;
  };

  if (product.materials) {
    writeMetaLabel("MATERIALS");
    writeMetaValue(product.materials);
  }

  writeMetaLabel("PRODUCT DIMENSIONS");
  if (product.product_dimensions) {
    writeMetaValue(product.product_dimensions);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.text("Not specified", metaColX, metaY);
    metaY += 8;
  }

  if ((product as any).box_dimensions) {
    writeMetaLabel("SHIPPING / CRATED DIMENSIONS");
    writeMetaValue((product as any).box_dimensions);
  }

  if (product.year_created) {
    writeMetaLabel("YEAR");
    writeMetaValue(product.year_created);
  }
  if (product.condition) {
    writeMetaLabel("CONDITION");
    writeMetaValue(product.condition);
  }

  y = Math.max(twoColStartY + imgH, metaY) + 6;

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

  if (details.length > 0) {
    const colW = contentW / 2;
    for (let i = 0; i < details.length; i += 2) {
      for (let col = 0; col < 2 && i + col < details.length; col++) {
        const [label, value] = details[i + col];
        const x = margin + col * colW;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...medGray);
        doc.text(label.toUpperCase(), x, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...black);
        doc.text(value, x, y + 4.5);
      }
      y += 12;
    }
  }

  // ── DESCRIPTION ──
  const desc = product.short_description;
  if (desc) {
    doc.setDrawColor(...lineGray);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...medGray);
    doc.text("DESCRIPTION", margin, y);
    y += 5;

    const plainDesc = desc
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    doc.setFont("helvetica", "normal");
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
  doc.text(
    `warehouse414.com  ·  sales@warehouse414.com  ·  785.232.8008`,
    margin,
    footerY
  );
  doc.text(`Generated ${new Date().toLocaleDateString()}`, pageW - margin, footerY, {
    align: "right",
  });

  const filename = `W414-${product.name.replace(/[^a-zA-Z0-9]/g, "-").substring(0, 40)}.pdf`;
  doc.save(filename);
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
      console.warn("[spec-sheet] image fetch !ok:", url, response.status);
      return null;
    }
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => {
        console.warn("[spec-sheet] FileReader error:", url);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("[spec-sheet] image fetch threw:", url, err);
    return null;
  }
}

async function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = dataUrl;
  });
}
