<template>
  <div class="row q-gutter-xs items-start no-wrap">
    <q-select
      v-model="selectedCode"
      :options="countryOptions"
      emit-value
      map-options
      option-value="code"
      option-label="label"
      outlined
      :label="label"
      :class="selectClass"
      :dense="dense"
      :filled="filled"
      :disable="disable"
      data-testid="phone-country-select"
    >
      <template v-slot:selected>
        <div class="row items-center no-wrap" v-if="selectedCountry">
          <span class="q-mr-xs" style="font-size: 1.2em">{{ selectedCountry.flag }}</span>
          <span class="text-caption text-grey-7">{{ selectedCountry.dial }}</span>
        </div>
        <span v-else class="text-grey-6">Pays</span>
      </template>
      <template v-slot:option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section avatar>
            <span style="font-size: 1.4em">{{ scope.opt.flag }}</span>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ scope.opt.label }}</q-item-label>
            <q-item-label caption>{{ scope.opt.dial }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-select>
    <q-input
      v-model="localPhone"
      :label="phoneLabel"
      :outlined="outlined"
      :filled="filled"
      :dense="dense"
      :disable="disable"
      :class="phoneClass"
      :rules="phoneRules"
      :hint="hint"
      data-testid="phone-number-input"
    >
      <template v-slot:prepend v-if="selectedCountry?.dial">
        <span class="text-grey-7 text-caption">{{ selectedCountry.dial }}</span>
      </template>
    </q-input>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { COUNTRY_OPTIONS, getCountryByCode, type CountryOption } from 'src/types';

const props = withDefaults(defineProps<{
  countryCode: string | null | undefined;
  phone: string | null | undefined;
  label?: string;
  phoneLabel?: string;
  selectClass?: string;
  phoneClass?: string;
  dense?: boolean;
  outlined?: boolean;
  filled?: boolean;
  disable?: boolean;
  hint?: string;
  phoneRules?: ((val: string) => true | string)[];
}>(), {
  label: 'Pays',
  phoneLabel: 'Téléphone',
  selectClass: 'col-4',
  phoneClass: 'col',
  dense: false,
  outlined: false,
  filled: true,
  disable: false,
  hint: '',
  phoneRules: () => [],
});

const emit = defineEmits<{
  'update:countryCode': [value: string | null];
  'update:phone': [value: string | null];
  'country-change': [country: CountryOption | undefined];
}>();

const countryOptions = COUNTRY_OPTIONS;

const selectedCode = computed({
  get: () => props.countryCode || 'BF',
  set: (val: string | null) => {
    emit('update:countryCode', val);
    const country = getCountryByCode(val);
    emit('country-change', country);
  },
});

const selectedCountry = computed(() => getCountryByCode(selectedCode.value));

const localPhone = computed({
  get: () => props.phone || '',
  set: (val: string | null) => emit('update:phone', val),
});

watch(() => selectedCode.value, (newCode, oldCode) => {
  if (oldCode && newCode !== oldCode) {
    const oldCountry = getCountryByCode(oldCode);
    const newCountry = getCountryByCode(newCode);
    if (oldCountry?.dial !== newCountry?.dial) {
      localPhone.value = '';
    }
  }
});
</script>
