// =============================================================================
// WIMRUX® FINANCES — Composable Password Strength (T19.2)
// Mesure force mot de passe + règles de validation
// =============================================================================
import { ref, computed } from 'vue';

export interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

const RULES: PasswordRule[] = [
  { id: 'length',     label: 'Au moins 8 caractères',          test: (pw) => pw.length >= 8 },
  { id: 'uppercase',  label: 'Au moins une majuscule',         test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lowercase',  label: 'Au moins une minuscule',         test: (pw) => /[a-z]/.test(pw) },
  { id: 'digit',      label: 'Au moins un chiffre',            test: (pw) => /\d/.test(pw) },
  { id: 'special',    label: 'Au moins un caractère spécial',  test: (pw) => /[^A-Za-z0-9]/.test(pw) },
  { id: 'no_spaces',  label: 'Pas d\'espaces',                 test: (pw) => !/\s/.test(pw) },
];

export function usePasswordStrength() {
  const password = ref('');

  const ruleResults = computed(() =>
    RULES.map(r => ({ ...r, passed: r.test(password.value) }))
  );

  const passedCount = computed(() => ruleResults.value.filter(r => r.passed).length);

  const strength = computed<'weak' | 'fair' | 'good' | 'strong'>(() => {
    const score = passedCount.value;
    if (score <= 2) return 'weak';
    if (score <= 3) return 'fair';
    if (score <= 5) return 'good';
    return 'strong';
  });

  const strengthPercent = computed(() => Math.round((passedCount.value / RULES.length) * 100));

  const strengthColor = computed<string>(() => {
    switch (strength.value) {
      case 'weak': return 'negative';
      case 'fair': return 'orange';
      case 'good': return 'blue';
      case 'strong': return 'positive';
      default: return 'grey';
    }
  });

  const strengthLabel = computed<string>(() => {
    switch (strength.value) {
      case 'weak': return 'Faible';
      case 'fair': return 'Moyen';
      case 'good': return 'Bon';
      case 'strong': return 'Fort';
      default: return '';
    }
  });

  const isValid = computed(() => passedCount.value >= 5);

  return {
    password, ruleResults, passedCount, strength,
    strengthPercent, strengthColor, strengthLabel, isValid,
  };
}
