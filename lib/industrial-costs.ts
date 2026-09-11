export interface IndustrialCostRecord {
  id: string;
  year: number;
  month: number;
  productionQuantity: number;
  erpTotalCost: number;
  utilities: number;
  consumables: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface IndustrialCostSnapshot {
  totalAdditionalCost: number;
  additionalCostPerBar: number;
  realisticCost: number;
  realisticCostPerBar: number;
}

export const INDUSTRIAL_COSTS_STORAGE_KEY = 'macarvalho-industrial-costs-records-v1';

export const INDUSTRIAL_COST_MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export function calculateIndustrialCostSnapshot(
  record: Pick<
    IndustrialCostRecord,
    'erpTotalCost' | 'utilities' | 'consumables' | 'productionQuantity'
  >
): IndustrialCostSnapshot {
  const totalAdditionalCost = (record.utilities ?? 0) + (record.consumables ?? 0);
  const additionalCostPerBar =
    record.productionQuantity > 0 ? totalAdditionalCost / record.productionQuantity : 0;
  const realisticCost = (record.erpTotalCost ?? 0) + totalAdditionalCost;
  const realisticCostPerBar =
    record.productionQuantity > 0 ? realisticCost / record.productionQuantity : 0;

  return {
    totalAdditionalCost,
    additionalCostPerBar,
    realisticCost,
    realisticCostPerBar,
  };
}

export function getNextMonth(year: number, month: number): { year: number; month: number } {
  const nextMonthIndex = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return { year: nextYear, month: nextMonthIndex };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatBarValue(value: number): string {
  return `${formatCurrency(value)} por barra`;
}
