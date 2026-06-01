import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import type { ApprovalWorkflow, ApprovalWorkflowInput } from 'src/types';

export const APPROVAL_DOMAINS = [
  { value: 'petty_cash_replenishment', label: 'Approvisionnement petite caisse' },
  { value: 'mobile_wallet_replenishment', label: 'Approvisionnement wallet mobile' },
  { value: 'expense_request', label: 'Demande de dépense' },
  { value: 'invoice_payment', label: 'Paiement de facture' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'loan_request', label: "Demande d'emprunt" },
  { value: 'investment_purchase', label: 'Achat investissement' },
];

export function useApprovalWorkflow() {
  const companyStore = useCompanyStore();
  const companyId = computed(() => companyStore.company?.id ?? '');

  const workflows = ref<ApprovalWorkflow[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadWorkflows() {
    loading.value = true;
    error.value = null;
    const { data, error: err } = await insforge.database
      .from('approval_workflows')
      .select('*')
      .eq('company_id', companyId.value)
      .order('domain')
      .order('threshold_amount');
    if (err) { error.value = err.message; }
    else { workflows.value = data as ApprovalWorkflow[]; }
    loading.value = false;
  }

  async function createWorkflow(input: ApprovalWorkflowInput): Promise<ApprovalWorkflow | null> {
    const { data, error: err } = await insforge.database
      .from('approval_workflows')
      .insert([{ ...input, company_id: companyId.value }])
      .select()
      .single();
    if (err) { error.value = err.message; return null; }
    await loadWorkflows();
    return data as ApprovalWorkflow;
  }

  async function updateWorkflow(id: string, input: Partial<ApprovalWorkflowInput>): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('approval_workflows')
      .update(input)
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    await loadWorkflows();
    return true;
  }

  async function deleteWorkflow(id: string): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('approval_workflows')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    await loadWorkflows();
    return true;
  }

  async function toggleActive(id: string, isActive: boolean): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('approval_workflows')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    await loadWorkflows();
    return true;
  }

  /**
   * Returns the workflow that applies for a given domain and amount.
   * Picks the highest threshold_amount that the amount meets or exceeds.
   */
  function resolveWorkflow(domain: string, amount: number): ApprovalWorkflow | null {
    const eligible = workflows.value
      .filter(w => w.is_active && w.domain === domain && amount >= w.threshold_amount)
      .sort((a, b) => b.threshold_amount - a.threshold_amount);
    return eligible[0] || null;
  }

  function requiredLevelsFor(domain: string, amount: number): number {
    const wf = resolveWorkflow(domain, amount);
    return wf?.required_levels ?? 1;
  }

  function approverRolesFor(domain: string, amount: number): (string | null)[] {
    const wf = resolveWorkflow(domain, amount);
    if (!wf) return [];
    return [wf.approver_role_l1, wf.approver_role_l2, wf.approver_role_l3].filter(r => !!r);
  }

  const activeWorkflows = computed(() => workflows.value.filter(w => w.is_active));

  return {
    workflows, loading, error, activeWorkflows,
    loadWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, toggleActive,
    resolveWorkflow, requiredLevelsFor, approverRolesFor,
  };
}
