import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import { useAuthStore } from 'src/stores/auth-store';
import type {
  PettyCashAccount,
  PettyCashAccountInput,
  PettyCashMovement,
  PettyCashMovementInput,
  PettyCashSummary,
  ReplenishmentRequest,
  ReplenishmentRequestInput,
  ReplenishmentApproval,
} from 'src/types';

export function usePettyCash() {
  const companyStore = useCompanyStore();
  const authStore = useAuthStore();
  const companyId = computed(() => companyStore.company?.id ?? '');
  const currentUserId = computed(() => authStore.user?.id ?? 'unknown');

  const accounts = ref<PettyCashAccount[]>([]);
  const summaries = ref<PettyCashSummary[]>([]);
  const movements = ref<PettyCashMovement[]>([]);
  const requests = ref<ReplenishmentRequest[]>([]);
  const approvals = ref<ReplenishmentApproval[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Accounts ---

  async function loadAccounts() {
    loading.value = true;
    error.value = null;
    const { data, error: err } = await insforge.database
      .from('petty_cash_accounts')
      .select('*')
      .eq('company_id', companyId.value)
      .order('name');
    if (err) { error.value = err.message; }
    else { accounts.value = data as PettyCashAccount[]; }
    loading.value = false;
  }

  async function loadSummaries() {
    loading.value = true;
    error.value = null;
    const { data, error: err } = await insforge.database
      .from('v_petty_cash_summary')
      .select('*')
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; }
    else { summaries.value = data as PettyCashSummary[]; }
    loading.value = false;
  }

  async function createAccount(input: PettyCashAccountInput): Promise<PettyCashAccount | null> {
    const { data, error: err } = await insforge.database
      .from('petty_cash_accounts')
      .insert([{ ...input, company_id: companyId.value }])
      .select()
      .single();
    if (err) { error.value = err.message; return null; }
    await loadSummaries();
    return data as PettyCashAccount;
  }

  async function updateAccount(id: string, input: Partial<PettyCashAccountInput>): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('petty_cash_accounts')
      .update(input)
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    await loadSummaries();
    return true;
  }

  async function deleteAccount(id: string): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('petty_cash_accounts')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    await loadSummaries();
    return true;
  }

  // --- Movements ---

  async function loadMovements(pettyCashId: string) {
    loading.value = true;
    error.value = null;
    const { data, error: err } = await insforge.database
      .from('petty_cash_movements')
      .select('*')
      .eq('petty_cash_id', pettyCashId)
      .eq('company_id', companyId.value)
      .order('movement_date', { ascending: false });
    if (err) { error.value = err.message; }
    else { movements.value = data as PettyCashMovement[]; }
    loading.value = false;
  }

  async function addMovement(input: PettyCashMovementInput): Promise<PettyCashMovement | null> {
    const { data, error: err } = await insforge.database
      .from('petty_cash_movements')
      .insert([{ ...input, company_id: companyId.value, recorded_by: input.recorded_by || currentUserId.value }])
      .select()
      .single();
    if (err) { error.value = err.message; return null; }

    // Update balance on the account
    const account = accounts.value.find(a => a.id === input.petty_cash_id)
      || summaries.value.find(s => s.id === input.petty_cash_id);
    if (account) {
      const delta = input.direction === 'in' ? input.amount : -input.amount;
      await insforge.database
        .from('petty_cash_accounts')
        .update({ current_balance: (account.current_balance || 0) + delta })
        .eq('id', input.petty_cash_id);
    }

    await loadMovements(input.petty_cash_id);
    await loadSummaries();
    return data as PettyCashMovement;
  }

  async function deleteMovement(movement: PettyCashMovement): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('petty_cash_movements')
      .delete()
      .eq('id', movement.id);
    if (err) { error.value = err.message; return false; }

    // Reverse balance
    const account = summaries.value.find(s => s.id === movement.petty_cash_id);
    if (account) {
      const delta = movement.direction === 'in' ? -movement.amount : movement.amount;
      await insforge.database
        .from('petty_cash_accounts')
        .update({ current_balance: (account.current_balance || 0) + delta })
        .eq('id', movement.petty_cash_id);
    }

    await loadMovements(movement.petty_cash_id);
    await loadSummaries();
    return true;
  }

  // --- Replenishment requests ---

  async function loadRequests(targetId?: string) {
    loading.value = true;
    let query = insforge.database
      .from('replenishment_requests')
      .select('*')
      .eq('company_id', companyId.value)
      .order('requested_at', { ascending: false });
    if (targetId) query = query.eq('target_id', targetId);
    const { data, error: err } = await query;
    if (err) { error.value = err.message; }
    else { requests.value = data as ReplenishmentRequest[]; }
    loading.value = false;
  }

  async function createRequest(input: ReplenishmentRequestInput): Promise<ReplenishmentRequest | null> {
    const { data, error: err } = await insforge.database
      .from('replenishment_requests')
      .insert([{
        ...input,
        company_id: companyId.value,
        requested_by: currentUserId.value,
      }])
      .select()
      .single();
    if (err) { error.value = err.message; return null; }
    await loadRequests();
    return data as ReplenishmentRequest;
  }

  async function cancelRequest(id: string): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('replenishment_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    await loadRequests();
    return true;
  }

  // --- Approvals ---

  async function loadApprovals(requestId: string) {
    const { data, error: err } = await insforge.database
      .from('replenishment_approvals')
      .select('*')
      .eq('request_id', requestId)
      .order('level');
    if (err) { error.value = err.message; }
    else { approvals.value = data as ReplenishmentApproval[]; }
  }

  async function approve(requestId: string, level: number, comment?: string): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('replenishment_approvals')
      .insert([{
        request_id: requestId,
        level,
        approver_id: currentUserId.value,
        decision: 'approved',
        comment: comment || null,
      }]);
    if (err) { error.value = err.message; return false; }

    // Advance status
    const req = requests.value.find(r => r.id === requestId);
    if (req) {
      let nextStatus: string;
      if (level >= req.required_levels) {
        nextStatus = 'approved_final';
      } else {
        nextStatus = `approved_l${level}`;
      }
      await insforge.database
        .from('replenishment_requests')
        .update({ status: nextStatus, current_level: level + 1 })
        .eq('id', requestId);
    }

    await loadRequests();
    await loadApprovals(requestId);
    return true;
  }

  async function reject(requestId: string, level: number, comment?: string): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('replenishment_approvals')
      .insert([{
        request_id: requestId,
        level,
        approver_id: currentUserId.value,
        decision: 'rejected',
        comment: comment || null,
      }]);
    if (err) { error.value = err.message; return false; }

    await insforge.database
      .from('replenishment_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    await loadRequests();
    await loadApprovals(requestId);
    return true;
  }

  async function disburse(requestId: string, pettyCashId: string, amount: number): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('replenishment_requests')
      .update({ status: 'disbursed', disbursed_at: new Date().toISOString() })
      .eq('id', requestId);
    if (err) { error.value = err.message; return false; }

    // Add 'in' movement to the petty cash account
    await addMovement({
      petty_cash_id: pettyCashId,
      direction: 'in',
      amount,
      label: `Approvisionnement (demande ${requestId.slice(0, 8)})`,
      movement_date: new Date().toISOString().slice(0, 10),
    });

    await loadRequests();
    return true;
  }

  // --- Stats ---
  const totalBalance = computed(() =>
    summaries.value.filter(s => s.is_active).reduce((sum, s) => sum + (s.current_balance || 0), 0)
  );
  const pendingRequestCount = computed(() =>
    requests.value.filter(r => r.status === 'pending' || r.status.startsWith('approved_l')).length
  );

  return {
    accounts, summaries, movements, requests, approvals,
    loading, error,
    totalBalance, pendingRequestCount,
    loadAccounts, loadSummaries,
    createAccount, updateAccount, deleteAccount,
    loadMovements, addMovement, deleteMovement,
    loadRequests, createRequest, cancelRequest,
    loadApprovals, approve, reject, disburse,
  };
}
