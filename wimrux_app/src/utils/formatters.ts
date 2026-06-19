// ============================================================================
// Formatters Burkina Faso — WIMRUX® FINANCES
// ============================================================================

import type {
  CadastralAddress,
  LegalForm,
  PartnerBankAccount,
  PartnerContact,
  PhysicalAddress,
  PostalAddress,
  TaxDivision,
  TaxRegimeBF,
} from 'src/types';
import {
  LEGAL_FORM_LABELS,
  PARTNER_CONTACT_ROLE_LABELS,
  TAX_DIVISION_TYPE_LABELS,
  TAX_REGIME_LABELS,
} from 'src/types';

export function fmtLegalForm(form?: LegalForm | null, other?: string | null): string {
  if (!form) return '';
  if (form === 'AUTRE' && other) return `${LEGAL_FORM_LABELS[form]} : ${other}`;
  return LEGAL_FORM_LABELS[form] || form;
}

export function fmtPhysicalAddress(addr?: PhysicalAddress | null): string {
  if (!addr) return '';
  const parts = [addr.sector, addr.district, addr.city].filter(Boolean);
  return parts.join(', ');
}

export function fmtCadastralAddress(addr?: CadastralAddress | null): string {
  if (!addr || !addr.section || !addr.lot || !addr.parcel) return '';
  return `Plle ${addr.parcel}, Lot ${addr.lot}, Section ${addr.section}`;
}

export function fmtPostalAddress(addr?: PostalAddress | null): string {
  if (!addr || !addr.post_office || !addr.po_box || !addr.postal_code) return '';
  const boxNum = addr.po_box.replace(/^bp/i, '').trim();
  return `${addr.post_office} BP${boxNum}, ${addr.postal_code}`;
}

export function fmtPhone(phone?: string | null, countryCode?: string | null): string {
  if (!phone) return '';
  const clean = phone.replace(/\s/g, '').trim();
  if (clean.startsWith('+')) return clean;
  if (countryCode) {
    const cc = countryCode.replace(/[^0-9]/g, '');
    if (cc) return `+${cc} ${clean}`;
  }
  return clean;
}

export function fmtTaxRegime(regime?: TaxRegimeBF | null): string {
  if (!regime) return '';
  return TAX_REGIME_LABELS[regime] || regime;
}

export function fmtTaxDivision(division?: TaxDivision | null): string {
  if (!division) return '';
  if (division.type === 'DGE') return TAX_DIVISION_TYPE_LABELS.DGE;
  if (division.type === 'DPI') {
    return `${TAX_DIVISION_TYPE_LABELS.DPI}${division.province ? ` — ${division.province}` : ''}`;
  }
  return `${TAX_DIVISION_TYPE_LABELS[division.type]} — ${division.sub_division || ''}`;
}

export function fmtPartnerContact(contact?: PartnerContact | null): string {
  if (!contact) return '';
  const role = PARTNER_CONTACT_ROLE_LABELS[contact.role] || contact.role;
  return `${role} : ${contact.name}, ${contact.function}, ${contact.phone}, ${contact.email}`;
}

export function fmtBankAccount(account?: PartnerBankAccount | null): string {
  if (!account) return '';
  const parts = [account.bank_name, account.account_number, account.iban, account.bic].filter(Boolean);
  return parts.join(' — ');
}

export function fmtBankAccounts(accounts?: PartnerBankAccount[] | null): string[] {
  if (!accounts || accounts.length === 0) return [];
  return accounts.map(fmtBankAccount).filter(Boolean);
}
