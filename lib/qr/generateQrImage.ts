import QRCode from "qrcode";

/**
 * Renders a qrToken as a PNG buffer for emailing (Resend attachment). The
 * payload is the raw token string only — never PII.
 */
export async function generateQrPngBuffer(qrToken: string): Promise<Buffer> {
  return QRCode.toBuffer(qrToken, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
}
