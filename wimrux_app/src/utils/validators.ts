// ============================================================================
// Validateurs DGI Burkina Faso — WIMRUX® FINANCES
// ============================================================================

// Adresse cadastrale : format SSSS LLL PPPP
// S = Section (4 chiffres), L = Lot (3 chiffres), P = Parcelle (4 chiffres)
// Ex: "0012 045 0023"
const CADASTRAL_REGEX = /^\d{4}\s\d{3}\s\d{4}$/;

export function isValidCadastralAddress(address: string): boolean {
  return CADASTRAL_REGEX.test(address.trim());
}

export function formatCadastralAddress(address: string): string | null {
  const cleaned = address.replace(/[^0-9]/g, '');
  if (cleaned.length !== 11) return null;
  return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`;
}

// IFU : exactement 8 chiffres (Burkina Faso)
const IFU_REGEX = /^\d{8}$/;

export function isValidIFU(ifu: string): boolean {
  return IFU_REGEX.test(ifu.trim());
}

// IFU export : format libre (non-résident)
export function isValidExportIFU(ifu: string): boolean {
  return ifu.trim().length >= 1 && ifu.trim().length <= 20;
}

// NIM : format alphanumérique, 10-20 caractères
const NIM_REGEX = /^[A-Z0-9]{10,20}$/;

export function isValidNIM(nim: string): boolean {
  return NIM_REGEX.test(nim.trim().toUpperCase());
}

// Référence facture : TYPE-ANNÉE-NUMÉRO (ex: FV-2026-00001)
const INVOICE_REF_REGEX = /^(FV|FT|FA|EV|ET|EA)-\d{4}-\d{5}$/;

export function isValidInvoiceReference(ref: string): boolean {
  return INVOICE_REF_REGEX.test(ref.trim());
}
