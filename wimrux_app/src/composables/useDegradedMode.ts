import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useFnecApi } from './useFnecApi';
import type { PendingCertification } from 'src/types';

interface SfeDevice { nim: string; ifu: string; jwt_secret: string; status: string }

export function useDegradedMode() {
  const queue = ref<PendingCertification[]>([]);
  const processing = ref(false);
  const fnecApi = useFnecApi();

  async function loadQueue() {
    const { data } = await insforge.database
      .from('pending_certification_queue')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) queue.value = data as PendingCertification[];
  }

  async function enqueue(invoiceId: string, errorMsg: string) {
    // Check if already in queue
    const { data: existing } = await insforge.database
      .from('pending_certification_queue')
      .select('id, attempts')
      .eq('invoice_id', invoiceId)
      .limit(1);

    const rows = existing as PendingCertification[] | null;
    if (rows && rows.length > 0) {
      const row = rows[0];
      if (row) {
        await insforge.database
          .from('pending_certification_queue')
          .update({ attempts: (row.attempts || 0) + 1, last_attempt_at: new Date().toISOString(), error_message: errorMsg })
          .eq('id', row.id);
      }
    } else {
      await insforge.database
        .from('pending_certification_queue')
        .insert({ invoice_id: invoiceId, attempts: 1, last_attempt_at: new Date().toISOString(), error_message: errorMsg });
    }
    await loadQueue();
  }

  async function retryOne(pendingId: string, invoiceId: string) {
    processing.value = true;
    try {
      // Load device
      const { data: devData } = await insforge.database.from('devices').select('*').eq('status', 'ACTIF').limit(1);
      const devRows = devData as SfeDevice[] | null;
      const dev = devRows?.[0];
      if (!dev) throw new Error('Aucun appareil SFE actif');

      // Load invoice
      const { data: invData } = await insforge.database.from('invoices').select('*').eq('id', invoiceId).limit(1);
      const invRows = invData as Record<string, unknown>[] | null;
      const inv = invRows?.[0];
      if (!inv) throw new Error('Facture introuvable');

      // Load items
      const { data: itemsData } = await insforge.database.from('invoice_items').select('*').eq('invoice_id', invoiceId);
      const items = (itemsData || []) as Record<string, unknown>[];

      // Auth
      const authResult = await fnecApi.getToken({ clientId: dev.ifu, clientSecret: dev.jwt_secret, nim: dev.nim });
      if (authResult.error) throw new Error(authResult.error.message);

      // Submit
      const submitResult = await fnecApi.submitInvoice({
        ifu: dev.ifu,
        type: inv['type'] as string,
        reference: inv['reference'] as string,
        items: items.map(i => ({
          code: (i['code'] as string) || 'ART001',
          name: i['name'] as string,
          type: i['type'] as string,
          price: i['price'] as number,
          quantity: i['quantity'] as number,
          unit: (i['unit'] as string) || 'unité',
          taxGroup: i['tax_group'] as string,
          specificTax: (i['specific_tax'] as number) || 0,
        })),
        priceMode: inv['price_mode'] as string,
      });
      if (submitResult.error) throw new Error(submitResult.error.message);

      const uid = submitResult.data?.uid;
      if (!uid) throw new Error('UID manquant');

      // Confirm
      const confirmResult = await fnecApi.confirmInvoice(uid);
      if (confirmResult.error) throw new Error(confirmResult.error.message);

      const cert = confirmResult.data;
      if (cert) {
        await insforge.database.from('invoices').update({
          status: 'certified',
          fnec_uid: uid,
          fiscal_number: cert.fiscalNumber,
          code_secef_dgi: cert.codeSECeFDGI,
          qr_code: cert.qrCode,
          signature: cert.signature,
          nim: cert.nim,
          counters: cert.counters,
          certification_datetime: cert.dateTime,
          certified_at: new Date().toISOString(),
        }).eq('id', invoiceId);

        // Remove from queue
        await insforge.database.from('pending_certification_queue').delete().eq('id', pendingId);
        await loadQueue();
        return { success: true, fiscalNumber: cert.fiscalNumber };
      }
      return { success: false, error: 'Certification incomplète' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      await insforge.database.from('pending_certification_queue').update({
        attempts: queue.value.find(q => q.id === pendingId)?.attempts ?? 0 + 1,
        last_attempt_at: new Date().toISOString(),
        error_message: msg,
      }).eq('id', pendingId);
      await loadQueue();
      return { success: false, error: msg };
    } finally {
      processing.value = false;
    }
  }

  async function retryAll() {
    for (const item of queue.value) {
      await retryOne(item.id, item.invoice_id);
    }
  }

  return { queue, processing, loadQueue, enqueue, retryOne, retryAll };
}
