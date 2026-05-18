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

export const QR_BG_COLORS: readonly string[] = [
  "#ffffff", 
  "#f8f9fa", 
  "#e9ecef", 
  "#ffd43b", 
  "#74c0fc"
] as const;

export const ERROR_CORRECTION_OPTIONS = [
  { value: "L" as const, label: "L", desc: "Low (7%)" },
  { value: "M" as const, label: "M", desc: "Medium (15%)" },
  { value: "Q" as const, label: "Q", desc: "Quartile (25%)" },
  { value: "H" as const, label: "H", desc: "High (30%)" },
] as const;
