import PDFDocument from "pdfkit";
import type { CertificateTemplate } from "@/lib/db/models/Society";

interface CertificateParams {
  attendeeName: string;
  eventTitle: string;
  societyName: string;
  eventDate: Date;
  template: CertificateTemplate;
}

/**
 * Renders a single-page landscape PDF certificate as a Buffer. If the
 * society hasn't configured a backgroundUrl, falls back to a plain
 * bordered layout so certificate generation never blocks on template setup.
 *
 * layoutConfig positions (nameY, titleY) are fractions of page height
 * (0 = top, 1 = bottom) so the same config works regardless of page size.
 */
export async function generateCertificatePdf({
  attendeeName,
  eventTitle,
  societyName,
  eventDate,
  template,
}: CertificateParams): Promise<Buffer> {
  const layout = template.layoutConfig ?? {};
  const accentColor = layout.accentColor ?? "#3457d5";
  const fontFamily = layout.fontFamily ?? "Helvetica";
  const nameY = layout.nameY ?? 0.5;
  const titleY = layout.titleY ?? 0.35;

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  if (template.backgroundUrl) {
    try {
      const bg = await fetchImageBuffer(template.backgroundUrl);
      doc.image(bg, 0, 0, { width: pageWidth, height: pageHeight });
    } catch (err) {
      console.error("Failed to load certificate background, using fallback", err);
      drawFallbackBorder(doc, pageWidth, pageHeight, accentColor);
    }
  } else {
    drawFallbackBorder(doc, pageWidth, pageHeight, accentColor);
  }

  doc
    .font(fontFamily)
    .fontSize(16)
    .fillColor("#555")
    .text(societyName.toUpperCase(), 0, pageHeight * titleY - 40, {
      align: "center",
      width: pageWidth,
    });

  doc
    .font(fontFamily)
    .fontSize(20)
    .fillColor("#333")
    .text("Certificate of Participation", 0, pageHeight * titleY, {
      align: "center",
      width: pageWidth,
    });

  doc
    .font(fontFamily)
    .fontSize(36)
    .fillColor(accentColor)
    .text(attendeeName, 0, pageHeight * nameY, {
      align: "center",
      width: pageWidth,
    });

  doc
    .font(fontFamily)
    .fontSize(14)
    .fillColor("#555")
    .text(
      `for participating in "${eventTitle}" on ${eventDate.toLocaleDateString("en-US", {
        dateStyle: "long",
      })}`,
      0,
      pageHeight * nameY + 60,
      { align: "center", width: pageWidth }
    );

  if (template.signatureUrl) {
    try {
      const sig = await fetchImageBuffer(template.signatureUrl);
      doc.image(sig, pageWidth - 220, pageHeight - 120, { width: 140 });
    } catch (err) {
      console.error("Failed to load certificate signature image", err);
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function drawFallbackBorder(
  doc: PDFKit.PDFDocument,
  width: number,
  height: number,
  accentColor: string
) {
  doc.rect(20, 20, width - 40, height - 40).lineWidth(3).stroke(accentColor);
  doc.rect(30, 30, width - 60, height - 60).lineWidth(1).stroke(accentColor);
}
