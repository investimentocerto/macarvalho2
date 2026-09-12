import {
  CostEmployee,
  CostOperation,
  CostOperationItem,
  CostOperationStep,
  Equipment,
  EquipmentMaintenance,
  IndirectCost,
  InventoryItem,
  ProcessStepItem,
  ProductionEntry,
  ProductionMaterialSeparation,
  ProductionOrder,
} from './types';

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

export function calculateEmployeeHourlyCost(employee: Pick<CostEmployee, 'baseSalary' | 'additions' | 'benefits' | 'chargePercent' | 'productiveHours'>): number {
  const monthlyCost = employee.baseSalary + employee.additions + employee.benefits;
  const withCharges = monthlyCost * (1 + employee.chargePercent / 100);
  return employee.productiveHours > 0 ? withCharges / employee.productiveHours : 0;
}

export function calculateMaterialCost(
  separations: ProductionMaterialSeparation[],
  inventory: InventoryItem[],
): { total: number; items: CostOperationItem[] } {
  const items = separations.map((separation) => {
    const inventoryItem = inventory.find((item) => item.id === separation.inventoryItemId);
    const unitCost = separation.unitCostSnapshot ?? inventoryItem?.unitCost ?? 0;
    const amount = separation.totalCost ?? separation.quantity * unitCost;
    return {
      id: `material-${separation.id}`,
      category: inventoryItem?.category || 'Insumos',
      sourceId: separation.inventoryItemId,
      description: inventoryItem?.name || separation.inventoryItemId,
      quantity: separation.quantity,
      unitCost,
      amount,
    };
  });
  return { total: items.reduce((sum, item) => sum + item.amount, 0), items };
}

export function calculateDurationHours(startedAt?: string, endedAt?: string): number {
  if (!startedAt || !endedAt) return 0;
  const parse = (value: string) => {
    const [hours, minutes, seconds = '0'] = value.split(':').map(Number);
    if (![hours, minutes, seconds].every(Number.isFinite) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;
    return hours * 3600 + minutes * 60 + seconds;
  };
  const start = parse(startedAt);
  const end = parse(endedAt);
  if (start === null || end === null) return 0;
  const elapsed = end >= start ? end - start : (24 * 3600) - start + end;
  return elapsed > 0 ? elapsed / 3600 : 0;
}

export function calculateEquipmentDepreciation(equipment: Pick<Equipment, 'acquisitionCost' | 'residualValue' | 'estimatedUsefulLife' | 'productiveHoursAvailable'>, hours: number): number {
  if (equipment.estimatedUsefulLife <= 0 || equipment.productiveHoursAvailable <= 0 || hours <= 0) return 0;
  const monthly = Math.max(0, equipment.acquisitionCost - equipment.residualValue) / equipment.estimatedUsefulLife / 12;
  return monthly / equipment.productiveHoursAvailable * hours;
}

export function calculateEnergyCost(equipment: Pick<Equipment, 'powerKw' | 'energyTariff'>, hours: number): number {
  return Math.max(0, equipment.powerKw || 0) * Math.max(0, equipment.energyTariff || 0) * Math.max(0, hours);
}

export function calculateMaintenanceCost(equipment: Pick<Equipment, 'maintenanceCostPerHour'>, hours: number): number {
  return Math.max(0, equipment.maintenanceCostPerHour || 0) * Math.max(0, hours);
}

export function calculateYield(plannedQuantity: number, finishedQuantity: number): { yieldPercent: number; lossQuantity: number } {
  const planned = Math.max(0, plannedQuantity);
  const finished = Math.max(0, finishedQuantity);
  return {
    yieldPercent: planned > 0 ? finished / planned * 100 : 0,
    lossQuantity: Math.max(0, planned - finished),
  };
}

export interface ProductionCostInputs {
  order: ProductionOrder;
  entries: ProductionEntry[];
  steps: ProcessStepItem[];
  separations: ProductionMaterialSeparation[];
  inventory: InventoryItem[];
  employees: CostEmployee[];
  equipment: Equipment[];
  indirectCosts?: IndirectCost[];
  maintenance?: EquipmentMaintenance[];
}

export function calculateProductionOrderCost(inputs: ProductionCostInputs): CostOperation {
  const material = calculateMaterialCost(inputs.separations.filter((item) => item.orderId === inputs.order.id), inputs.inventory);
  const orderEntries = inputs.entries.filter((entry) => entry.orderId === inputs.order.id);
  const steps: CostOperationStep[] = [];

  for (const entry of orderEntries) {
    const step = inputs.steps.find((item) => item.id === entry.stepId);
    if (!step) continue;
    const hours = calculateDurationHours(entry.startedAt, entry.endedAt);
    const employee = inputs.employees.find((item) => item.id === (entry as ProductionEntry & { employeeId?: string }).employeeId);
    const manHours = hours * Math.max(1, step.laborQuantity || 1);
    const laborCost = employee ? manHours * calculateEmployeeHourlyCost(employee) : 0;
    const machine = inputs.equipment.find((item) => item.id === step.equipmentId);
    const equipmentCost = machine ? calculateEquipmentDepreciation(machine, hours) + calculateEnergyCost(machine, hours) + calculateMaintenanceCost(machine, hours) + (machine.otherCostPerHour || 0) * hours : 0;
    steps.push({
      id: `step-cost-${entry.id}`,
      stepId: step.id,
      durationHours: hours,
      manHours,
      laborCost,
      equipmentCost,
      energyCost: machine ? calculateEnergyCost(machine, hours) : 0,
      maintenanceCost: machine ? calculateMaintenanceCost(machine, hours) : 0,
      depreciationCost: machine ? calculateEquipmentDepreciation(machine, hours) : 0,
      totalCost: laborCost + equipmentCost,
    });
  }

  const directLaborCost = steps.reduce((sum, step) => sum + step.laborCost, 0);
  const equipmentEnergy = steps.reduce((sum, step) => sum + step.energyCost, 0);
  const maintenanceCost = steps.reduce((sum, step) => sum + step.maintenanceCost, 0);
  const depreciationCost = steps.reduce((sum, step) => sum + step.depreciationCost, 0);
  const indirectLaborCost = (inputs.employees || []).filter((employee) => employee.laborType === 'INDIRETA').reduce((sum, employee) => sum + employee.baseSalary * (1 + employee.chargePercent / 100), 0);
  const otherIndirectCost = (inputs.indirectCosts || []).filter((cost) => cost.active).reduce((sum, cost) => sum + cost.amount, 0);
  const finishedQuantity = inputs.steps.filter((step) => /embalagem/i.test(`${step.title} ${step.line} ${step.costCenterCode || ''}`)).flatMap((step) => orderEntries.filter((entry) => entry.stepId === step.id)).reduce((sum, entry) => sum + entry.quantityProduced, 0);
  const yieldData = calculateYield(inputs.order.quantity, finishedQuantity);
  const totalCost = material.total + directLaborCost + indirectLaborCost + equipmentEnergy + maintenanceCost + depreciationCost + otherIndirectCost;

  return {
    id: `cost-${inputs.order.id}`,
    orderId: inputs.order.id,
    status: 'APURADO',
    plannedQuantity: inputs.order.quantity,
    finishedQuantity,
    ...yieldData,
    materialCost: material.total,
    directLaborCost,
    indirectLaborCost,
    energyCost: equipmentEnergy,
    maintenanceCost,
    depreciationCost,
    otherIndirectCost,
    totalCost,
    unitCost: finishedQuantity > 0 ? totalCost / finishedQuantity : 0,
    version: 1,
    recalculationReason: '',
    calculatedAt: new Date().toISOString(),
    items: material.items,
    steps,
  };
}
