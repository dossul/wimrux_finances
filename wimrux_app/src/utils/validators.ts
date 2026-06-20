// ============================================================================
// Validateurs DGI Burkina Faso — WIMRUX® FINANCES
// ============================================================================

// ============================================================================
// Adresse cadastrale
// ============================================================================

// Legacy : format numérique SSSS LLL PPPP (conservé pour compatibilité données existantes)
const CADASTRAL_NUMERIC_REGEX = /^\d{4}\s\d{3}\s\d{4}$/;

export function isValidLegacyCadastralAddress(address: string): boolean {
  return CADASTRAL_NUMERIC_REGEX.test(address.trim());
}

export function formatLegacyCadastralAddress(address: string): string | null {
  const cleaned = address.replace(/[^0-9]/g, '');
  if (cleaned.length !== 11) return null;
  return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`;
}

// Nouveau format alphanumérique : chaque champ est libre, on vérifie juste qu'il n'est pas vide
export function isValidCadastralAddressParts(parts: { section?: string; lot?: string; parcel?: string }): boolean {
  const s = (parts.section || '').trim();
  const l = (parts.lot || '').trim();
  const p = (parts.parcel || '').trim();
  return !!(s && l && p);
}

export function formatCadastralAddress(parts: { section?: string; lot?: string; parcel?: string }): string {
  if (!isValidCadastralAddressParts(parts)) return '';
  return `Plle ${(parts.parcel || '').trim()}, Lot ${(parts.lot || '').trim()}, Section ${(parts.section || '').trim()}`;
}

// Backward-compatible validator used by legacy UI fields
export function isValidCadastralAddress(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed) return true;
  return isValidLegacyCadastralAddress(trimmed);
}

// ============================================================================
// Adresse postale
// ============================================================================

export function isValidPostalAddress(parts: { post_office?: string; po_box?: string; postal_code?: string }): boolean {
  const po = (parts.post_office || '').trim();
  const box = (parts.po_box || '').trim();
  const code = (parts.postal_code || '').trim();
  return !!(po && box && code);
}

export function formatPostalAddress(parts: { post_office?: string; po_box?: string; postal_code?: string }): string {
  if (!isValidPostalAddress(parts)) return '';
  const box = (parts.po_box || '').trim();
  const boxNum = box.replace(/^bp/i, '').trim();
  return `${(parts.post_office || '').trim()} BP${boxNum}, ${(parts.postal_code || '').trim()}`;
}

// ============================================================================
// Téléphone
// ============================================================================

export function isValidPhoneWithCountryCode(phone: string, _countryCode?: string): boolean {
  const p = phone.trim();
  if (!p) return true;
  const digits = p.replace(/[^0-9]/g, '');
  return /^[+\s\d]+$/.test(p) && digits.length >= 6 && digits.length <= 15 && p.length <= 20;
}

export function formatPhoneWithCountryCode(phone: string, countryCode?: string): string {
  const p = phone.replace(/\s/g, '').trim();
  if (!p) return '';
  if (p.startsWith('+')) return p;
  if (countryCode) {
    const cc = countryCode.replace(/[^0-9]/g, '');
    return `+${cc} ${p}`;
  }
  return p;
}

// ============================================================================
// IFU
// ============================================================================

// IFU Burkina Faso : alphanumérique, 1-20 caractères (format DGI/SECeF accepté)
const IFU_REGEX = /^[A-Za-z0-9]{1,20}$/;

export function isValidIFU(ifu: string): boolean {
  return IFU_REGEX.test(ifu.trim());
}

// IFU export : format libre (non-résident)
export function isValidExportIFU(ifu: string): boolean {
  return ifu.trim().length >= 1 && ifu.trim().length <= 20;
}

// IFU message d'erreur uniformisé
export const IFU_ERROR_MSG = 'Format IFU invalide (alphanumérique, 1-20 caractères)';
export const IFU_ERROR_MSG_BF = 'IFU invalide (alphanumérique, 1-20 caractères)';
export const IFU_ERROR_MSG_EXPORT = 'IFU export : 1 à 20 caractères alphanumériques';

// TVA : validation du taux en pourcentage (0-100)
export function isValidVatRatePercent(percent: number): boolean {
  return percent > 0 && percent <= 100;
}

// TVA : conversion pourcentage -> fraction (18 -> 0.18)
export function vatPercentToFraction(percent: number | null | undefined): number | null {
  if (percent == null || isNaN(percent)) return null;
  return percent / 100;
}

// TVA : conversion fraction -> pourcentage (0.18 -> 18)
export function vatFractionToPercent(fraction: number | null | undefined): number | null {
  if (fraction == null || isNaN(fraction)) return null;
  return fraction * 100;
}

// ============================================================================
// NIM
// ============================================================================

// NIM : format alphanumérique, 10-20 caractères
const NIM_REGEX = /^[A-Z0-9]{10,20}$/;

export function isValidNIM(nim: string): boolean {
  return NIM_REGEX.test(nim.trim().toUpperCase());
}

// ============================================================================
// Référence facture
// ============================================================================

// Référence facture : TYPE-ANNÉE-NUMÉRO (ex: FV-2026-00001)
const INVOICE_REF_REGEX = /^(FV|FT|FA|EV|ET|EA)-\d{4}-\d{5}$/;

export function isValidInvoiceReference(ref: string): boolean {
  return INVOICE_REF_REGEX.test(ref.trim());
}

// ============================================================================
// Division fiscale
// ============================================================================

export function isValidTaxDivision(division: { type: string; sub_division?: string | undefined; province?: string | undefined }): boolean {
  const type = division.type;
  if (!['DGE', 'DME', 'DCI', 'DPI'].includes(type)) return false;
  if (type === 'DGE') return true;
  if (type === 'DME') {
    return !!division.sub_division && ['I', 'II', 'III', 'IV', 'V'].includes(division.sub_division);
  }
  if (type === 'DCI') {
    return !!division.sub_division && ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'].includes(division.sub_division);
  }
  if (type === 'DPI') {
    return !!(division.province && division.province.trim().length > 0);
  }
  return false;
}

export function formatTaxDivision(division: { type: string; sub_division?: string; province?: string }): string {
  if (division.type === 'DGE') return 'DGE';
  if (division.type === 'DPI') return `DPI — ${division.province || ''}`;
  return `${division.type} — ${division.sub_division || ''}`;
}

// ============================================================================
// Forme juridique
// ============================================================================

export const LEGAL_FORM_VALUES = ['SA', 'SARL', 'SAS', 'SNC', 'PHYSIQUE', 'SCS', 'AUTRE'] as const;

export function isValidLegalForm(form: string): boolean {
  return LEGAL_FORM_VALUES.includes(form as typeof LEGAL_FORM_VALUES[number]);
}

// ============================================================================
// Comptes bancaires
// ============================================================================

export function isValidPartnerBankAccount(account: { bank_name?: string; account_number?: string; iban?: string }): boolean {
  return !!(
    (account.bank_name || '').trim() &&
    (account.account_number || '').trim()
  );
}

// ============================================================================
// Contacts
// ============================================================================

export function isValidPartnerContact(contact: { role?: string; name?: string; function?: string; phone?: string; email?: string }): boolean {
  return !!(
    contact.role &&
    (contact.name || '').trim() &&
    (contact.function || '').trim() &&
    (contact.phone || '').trim() &&
    (contact.email || '').trim()
  );
}

// ============================================================================
// E-mail
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}
