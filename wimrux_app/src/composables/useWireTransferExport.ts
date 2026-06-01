// =============================================================================
// WIMRUX® FINANCES — Export SEPA XML (pacs.008.001.08) + PDF Ordre de virement
// Génération XML manuelle ISO 20022 sans dépendance externe
// =============================================================================
import type { WireTransfer } from 'src/types';
import type { Company } from 'src/types';

// ---------------------------------------------------------------------------
// SEPA XML (ISO 20022 pacs.008.001.08 — Credit Transfer)
// ---------------------------------------------------------------------------

function xmlEscape(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatAmount(n: number): string {
  return n.toFixed(2);
}

function nowISO(): string {
  return new Date().toISOString().replace('Z', '+00:00');
}

export function generateSEPACreditTransfer(
  transfers: WireTransfer[],
  company: Company,
): string {
  const batchId    = `WIMRUX-${Date.now()}`;
  const msgId      = batchId;
  const creDtTm    = nowISO();
  const nbOfTxs    = transfers.length;
  const ctrlSum    = formatAmount(transfers.reduce((s, t) => s + Number(t.amount), 0));
  const currency   = transfers[0]?.currency ?? 'XOF';

  const txBlocks = transfers.map((t, i) => {
    const endToEndId = `${t.reference}-${i + 1}`;
    return `
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${xmlEscape(t.reference)}</InstrId>
        <EndToEndId>${xmlEscape(endToEndId)}</EndToEndId>
      </PmtId>
      <Amt>
        <InstdAmt Ccy="${xmlEscape(t.currency || currency)}">${formatAmount(Number(t.amount))}</InstdAmt>
      </Amt>
      ${t.beneficiary_bic ? `<CdtrAgt>
        <FinInstnId>
          <BIC>${xmlEscape(t.beneficiary_bic)}</BIC>
        </FinInstnId>
      </CdtrAgt>` : ''}
      <Cdtr>
        <Nm>${xmlEscape(t.beneficiary_name)}</Nm>
      </Cdtr>
      ${t.beneficiary_iban ? `<CdtrAcct>
        <Id>
          <IBAN>${xmlEscape(t.beneficiary_iban)}</IBAN>
        </Id>
      </CdtrAcct>` : ''}
      ${t.motif ? `<RmtInf>
        <Ustrd>${xmlEscape(t.motif)}</Ustrd>
      </RmtInf>` : ''}
    </CdtTrfTxInf>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${xmlEscape(msgId)}</MsgId>
      <CreDtTm>${creDtTm}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <InstgAgt>
        <FinInstnId>
          <Nm>${xmlEscape(company.name)}</Nm>
        </FinInstnId>
      </InstgAgt>
    </GrpHdr>${txBlocks}
  </FIToFICstmrCdtTrf>
</Document>`;
}

// ---------------------------------------------------------------------------
// Téléchargement du fichier XML
// ---------------------------------------------------------------------------
export function downloadSEPAXml(
  transfers: WireTransfer[],
  company: Company,
): void {
  const xml      = generateSEPACreditTransfer(transfers, company);
  const blob     = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url      = URL.createObjectURL(blob);
  const filename = `SEPA_${new Date().toISOString().split('T')[0]}_${transfers.length}tx.xml`;

  const a        = document.createElement('a');
  a.href         = url;
  a.download     = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// PDF Ordre de virement (texte tabulé → Blob via HTML → window.print)
// Réutilise le pattern window.print() existant dans useInvoicePdf
// ---------------------------------------------------------------------------
export function printWireTransferOrder(t: WireTransfer, company: Company): void {
  const dateStr  = t.scheduled_date ?? new Date().toISOString().split('T')[0];
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ordre de virement — ${t.reference}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 40px; }
    h1 { text-align: center; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    td { padding: 8px 12px; border: 1px solid #ccc; }
    td:first-child { font-weight: bold; background: #f8f8f8; width: 35%; }
    .section-title { font-weight: bold; font-size: 13px; border: none; background: #003366; color: #fff; padding: 6px 12px; }
    .signatures { display: flex; gap: 60px; margin-top: 48px; }
    .sig-box { flex: 1; border-top: 1px solid #000; padding-top: 8px; text-align: center; font-size: 11px; color: #666; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Ordre de virement</h1>
  <div class="subtitle">${xmlEscape(company.name)} — ${dateStr}</div>

  <table>
    <tr><td class="section-title" colspan="2">ÉMETTEUR</td></tr>
    <tr><td>Société</td><td>${xmlEscape(company.name)}</td></tr>
    <tr><td>IFU / NIF</td><td>${xmlEscape(company.ifu ?? '')}</td></tr>
    ${company.phone ? `<tr><td>Téléphone</td><td>${xmlEscape(company.phone)}</td></tr>` : ''}
  </table>

  <table>
    <tr><td class="section-title" colspan="2">BÉNÉFICIAIRE</td></tr>
    <tr><td>Nom</td><td>${xmlEscape(t.beneficiary_name)}</td></tr>
    ${t.beneficiary_iban ? `<tr><td>IBAN / Compte</td><td>${xmlEscape(t.beneficiary_iban)}</td></tr>` : ''}
    ${t.beneficiary_bic  ? `<tr><td>BIC / SWIFT</td><td>${xmlEscape(t.beneficiary_bic)}</td></tr>`  : ''}
    ${t.beneficiary_bank ? `<tr><td>Banque</td><td>${xmlEscape(t.beneficiary_bank)}</td></tr>`       : ''}
  </table>

  <table>
    <tr><td class="section-title" colspan="2">VIREMENT</td></tr>
    <tr><td>Référence</td><td>${xmlEscape(t.reference)}</td></tr>
    <tr><td>Montant</td><td><strong>${Number(t.amount).toLocaleString('fr-FR')} ${xmlEscape(t.currency || 'XOF')}</strong></td></tr>
    <tr><td>Date d'exécution</td><td>${dateStr}</td></tr>
    ${t.motif ? `<tr><td>Motif</td><td>${xmlEscape(t.motif)}</td></tr>` : ''}
  </table>

  <div class="signatures">
    <div class="sig-box">Établi par<br><br><br><br>_______________________</div>
    <div class="sig-box">Approuvé par<br><br><br><br>_______________________</div>
    <div class="sig-box">Cachet &amp; Signature<br><br><br><br>_______________________</div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}
