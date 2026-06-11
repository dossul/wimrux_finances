// =============================================================================
// WIMRUX® FINANCES — Composable Emprunts (T7.x)
// Méthodes : constant_annuity | constant_principal | bullet
// =============================================================================
import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import type {
  Loan, LoanInput, LoanScheduleEntry, AmortizationMethod, PaymentFrequency, DebtRatio
} from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

interface ScheduleRow {
  installment_number: number;
  due_date: string;
  principal: number;
  interest: number;
  total: number;
  remaining_balance: number;
}

export function useLoans() {
  const loans     = ref<Loan[]>([]);
  const schedule  = ref<LoanScheduleEntry[]>([]);
  const debtRatio = ref<DebtRatio | null>(null);
  const loading   = ref(false);
  const error     = ref<string | null>(null);
  const companyStore = useCompanyStore();

  async function loadLoans(filters?: { status?: string }) {
    loading.value = true;
    try {
      let q = appwriteDb.from('loans').select('*')
        .eq('company_id', companyStore.company!.id)
        .order('start_date', { ascending: false });
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }
      loans.value = data || [];
    } finally { loading.value = false; }
  }

  async function createLoan(payload: LoanInput) {
    loading.value = true;
    try {
      const { data, error: err } = await appwriteDb.from('loans').insert([{
        ...payload,
        company_id: companyStore.company!.id,
        outstanding_balance: payload.principal_amount,
      }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
      if (err) { error.value = err.message; return null; }
      if (data) {
        loans.value.unshift(data);
        await generateLoanSchedule(data.id);
      }
      return data as Loan;
    } finally { loading.value = false; }
  }

  async function updateLoan(id: string, payload: Partial<Loan>) {
    const { data, error: err } = await appwriteDb.from('loans')
      .update(id, payload)
    if (err) { error.value = err.message; return null; }
    if (data) {
      const idx = loans.value.findIndex(l => l.id === id);
      if (idx !== -1) loans.value[idx] = data;
    }
    return data as Loan;
  }

  async function deleteLoan(id: string) {
    const { error: err } = await appwriteDb.from('loans')
      .delete().eq('id', id).eq('company_id', companyStore.company!.id);
    if (err) { error.value = err.message; return false; }
    loans.value = loans.value.filter(l => l.id !== id);
    return true;
  }

  // ---------------------------------------------------------------------------
  // CALCUL ÉCHÉANCIER
  // ---------------------------------------------------------------------------
  function frequencyToMonths(freq: PaymentFrequency): number {
    return { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 }[freq];
  }

  function computeSchedule(
    principal: number,
    annualRate: number,
    durationMonths: number,
    method: AmortizationMethod,
    firstPaymentDate: string,
    frequency: PaymentFrequency = 'monthly'
  ): ScheduleRow[] {
    const rows: ScheduleRow[] = [];
    const monthsPerPayment = frequencyToMonths(frequency);
    const nInstallments = Math.ceil(durationMonths / monthsPerPayment);
    const periodicRate = (annualRate / 100) * (monthsPerPayment / 12);

    let balance = principal;
    const firstDate = new Date(firstPaymentDate);

    if (method === 'constant_annuity') {
      // Annuité = K * r / (1 - (1+r)^-n)
      const annuity = periodicRate > 0
        ? (principal * periodicRate) / (1 - Math.pow(1 + periodicRate, -nInstallments))
        : principal / nInstallments;
      for (let i = 1; i <= nInstallments; i++) {
        const interest = balance * periodicRate;
        const principalPart = annuity - interest;
        balance -= principalPart;
        rows.push({
          installment_number: i,
          due_date: addMonths(firstDate, (i - 1) * monthsPerPayment),
          principal: round2(principalPart),
          interest: round2(interest),
          total: round2(annuity),
          remaining_balance: round2(Math.max(balance, 0)),
        });
      }
    } else if (method === 'constant_principal') {
      const principalPart = principal / nInstallments;
      for (let i = 1; i <= nInstallments; i++) {
        const interest = balance * periodicRate;
        balance -= principalPart;
        rows.push({
          installment_number: i,
          due_date: addMonths(firstDate, (i - 1) * monthsPerPayment),
          principal: round2(principalPart),
          interest: round2(interest),
          total: round2(principalPart + interest),
          remaining_balance: round2(Math.max(balance, 0)),
        });
      }
    } else if (method === 'bullet') {
      // Que les intérêts pendant la durée, capital remboursé à la dernière échéance
      for (let i = 1; i <= nInstallments; i++) {
        const interest = balance * periodicRate;
        const isLast = i === nInstallments;
        const principalPart = isLast ? balance : 0;
        if (isLast) balance = 0;
        rows.push({
          installment_number: i,
          due_date: addMonths(firstDate, (i - 1) * monthsPerPayment),
          principal: round2(principalPart),
          interest: round2(interest),
          total: round2(principalPart + interest),
          remaining_balance: round2(balance),
        });
      }
    }
    return rows;
  }

  function addMonths(date: Date, months: number): string {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0] as string;
  }
  function round2(n: number): number { return Math.round(n * 100) / 100; }

  async function generateLoanSchedule(loanId: string) {
    const loan = loans.value.find(l => l.id === loanId);
    if (!loan) return;
    const rows = computeSchedule(
      loan.principal_amount, loan.interest_rate, loan.duration_months,
      loan.amortization_method, loan.first_payment_date, loan.payment_frequency
    );
    // Effacer ancien
    await appwriteDb.from('loan_schedule')
      .delete().eq('loan_id', loanId);
    if (rows.length > 0) {
      const toInsert = rows.map(r => ({
        ...r, loan_id: loanId, company_id: companyStore.company!.id, is_paid: false,
      }));
      await appwriteDb.from('loan_schedule').insert(toInsert);
    }
  }

  async function loadSchedule(loanId: string) {
    const { data, error: err } = await appwriteDb.from('loan_schedule')
      .select('*').eq('loan_id', loanId).eq('company_id', companyStore.company!.id)
      .order('installment_number');
    if (err) { error.value = err.message; return; }
    schedule.value = data || [];
  }

  async function markInstallmentPaid(scheduleId: string, paidAmount: number, txId?: string) {
    const update: Partial<LoanScheduleEntry> = {
      is_paid: true,
      paid_at: new Date().toISOString(),
      paid_amount: paidAmount,
    };
    if (txId) update.bank_transaction_id = txId;
    const { data, error: err } = await appwriteDb.from('loan_schedule')
      .update(scheduleId, update);
    if (err) { error.value = err.message; return null; }
    // Recalculer outstanding_balance du loan
    if (data) {
      const { data: remaining } = await appwriteDb.from('loan_schedule')
        .select('principal').eq('loan_id', data.loan_id).eq('is_paid', false);
      const newBalance = (remaining || []).reduce((s, r) => s + Number(r.principal), 0);
      await updateLoan(data.loan_id, { outstanding_balance: newBalance });
    }
    return data;
  }

  async function loadDebtRatio() {
    const { data } = await appwriteDb.from('v_debt_ratio')
      .select('*').eq('company_id', companyStore.company!.id).single();
    debtRatio.value = data ?? null;
  }

  // STATS
  const stats = computed(() => {
    const active = loans.value.filter(l => l.status === 'active');
    return {
      activeCount: active.length,
      totalPrincipal: active.reduce((s, l) => s + Number(l.principal_amount), 0),
      totalOutstanding: active.reduce((s, l) => s + Number(l.outstanding_balance ?? 0), 0),
      totalInterestPaid: loans.value.reduce((s, l) => s + Number(l.total_interest_paid), 0),
    };
  });

  return {
    loans, schedule, debtRatio, loading, error, stats,
    loadLoans, createLoan, updateLoan, deleteLoan,
    computeSchedule, generateLoanSchedule, loadSchedule,
    markInstallmentPaid, loadDebtRatio,
  };
}
