/**
 * qr.constants.ts
 * Shared QR code color palette used by CreateLink and QRPanel.
 * Single source of truth — edit here and both components update.
 */
export const QR_COLORS: readonly string[] = [
  '#000000', // Black
  '#CE3B3D', // Red
  '#DF8A25', // Orange
  '#418641', // Green
  '#4FA1E7', // Light Blue
  '#405AC6', // Blue
  '#7055CE', // Purple
  '#C65089', // Pink
] as const;
