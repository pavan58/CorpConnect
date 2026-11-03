import "server-only";
import QRCode from "qrcode";

/** Crisp SVG QR code (error correction M survives print smudges and small logos). */
export function qrSvg(text: string, color = "#0a2540") {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: color, light: "#ffffff" } });
}
