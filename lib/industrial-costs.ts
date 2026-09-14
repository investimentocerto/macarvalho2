import {
  CostCharge,
  CostDriverType,
  CostEmployee,
  CostEmployeeChargeDetail,
  CostMoiAllocation,
  CostOperation,
  CostOperationItem,
  CostOperationStep,
  Equipment,
  EquipmentMaintenance,
  IndirectCost,
  InventoryItem,
  LaborCostBarSummary,
  ProcessStepItem,
  ProductionEntry,
  ProductionMaterialSeparation,
  ProductionOrder,
  ProductionProcess,
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

/**
 * Calcula detalhadamente a composição de custo mensal do colaborador:
 * Salário Base + Encargos Selecionados (do cadastro de encargos) + Benefícios = Custo Mensal Total
 * Custo/Hora = Custo Mensal Total / Horas Produtivas
 * NÃO permite percentual fixo arbitrário ou digitado manualmente.
 */
export function calculateEmployeeCostDetails(
  employee: Partial<CostEmployee>,
  allCharges: CostCharge[] = []
): {
  baseSalary: number;
  totalBenefits: number;
  totalChargesAmount: number;
  totalMonthlyCost: number;
  chargePercent: number;
  hourlyCost: number;
  chargesDetail: CostEmployeeChargeDetail[];
} {
  const baseSalary = Math.max(0, Number(employee.baseSalary) || 0);
  const additions = Math.max(0, Number(employee.additions) || 0);
  const productiveHours = Math.max(0, Number(employee.productiveHours) || 0);

  // Benefícios: soma de itens detalhados ou campo numérico consolidado
  let totalBenefits = 0;
  if (employee.benefitsDetail && employee.benefitsDetail.length > 0) {
    totalBenefits = employee.benefitsDetail.reduce((acc, b) => acc + Math.max(0, Number(b.amount) || 0), 0);
  } else {
    totalBenefits = Math.max(0, Number(employee.benefits) || 0);
  }

  // Base de cálculo dos encargos sobre a folha
  const chargeBase = baseSalary + additions;

  // Encargos selecionados pelo usuário a partir do cadastro oficial de encargos
  const selectedIds = new Set(employee.selectedChargeIds || []);
  const chargesDetail: CostEmployeeChargeDetail[] = [];
  let totalChargesAmount = 0;

  for (const charge of allCharges) {
    const isSelected = selectedIds.has(charge.id) || (
      // Se não houver selectedChargeIds explícito mas houver chargesDetail histórico
      !employee.selectedChargeIds && employee.chargesDetail?.some((cd) => cd.chargeId === charge.id)
    );

    if (isSelected && charge.active) {
      const percent = Math.max(0, Number(charge.percent) || 0);
      const calculatedAmount = (chargeBase * percent) / 100;
      totalChargesAmount += calculatedAmount;

      chargesDetail.push({
        chargeId: charge.id,
        code: charge.code,
        description: charge.description,
        percent,
        baseAmount: chargeBase,
        calculatedAmount,
        chargeType: charge.chargeType,
      });
    }
  }

  // Se o colaborador já possuía chargesDetail salvo diretamente (ex: vindo do banco/histórico)
  if (chargesDetail.length === 0 && employee.chargesDetail && employee.chargesDetail.length > 0) {
    for (const item of employee.chargesDetail) {
      const calculatedAmount = Number(item.calculatedAmount) || (chargeBase * (Number(item.percent) || 0)) / 100;
      totalChargesAmount += calculatedAmount;
      chargesDetail.push({
        ...item,
        baseAmount: chargeBase,
        calculatedAmount,
      });
    }
  }

  const chargePercent = chargeBase > 0 ? (totalChargesAmount / chargeBase) * 100 : 0;
  const totalMonthlyCost = baseSalary + additions + totalChargesAmount + totalBenefits;
  const hourlyCost = productiveHours > 0 ? totalMonthlyCost / productiveHours : 0;

  return {
    baseSalary,
    totalBenefits,
    totalChargesAmount,
    totalMonthlyCost,
    chargePercent,
    hourlyCost,
    chargesDetail,
  };
}

export function calculateEmployeeHourlyCost(
  employee: Pick<CostEmployee, 'baseSalary' | 'additions' | 'benefits' | 'chargePercent' | 'productiveHours'> & Partial<CostEmployee>,
  allCharges?: CostCharge[]
): number {
  if (employee.hourlyCost && employee.hourlyCost > 0) {
    return employee.hourlyCost;
  }
  const details = calculateEmployeeCostDetails(employee, allCharges || []);
  return details.hourlyCost;
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

  // Se forem datas completas ou timestamps ISO (ex: "2026-09-14T10:00:00Z")
  if (startedAt.includes('T') || startedAt.includes('-')) {
    const startMs = Date.parse(startedAt);
    const endMs = Date.parse(endedAt);
    if (!isNaN(startMs) && !isNaN(endMs) && endMs >= startMs) {
      return (endMs - startMs) / (1000 * 3600);
    }
  }

  // Formatos simples de horário ("HH:mm" ou "HH:mm:ss")
  const parse = (value: string) => {
    const parts = value.split(':').map(Number);
    if (parts.length < 2) return null;
    const [hours, minutes, seconds = 0] = parts;
    if (![hours, minutes, seconds].every(Number.isFinite) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;
    return hours * 3600 + minutes * 60 + seconds;
  };
  const start = parse(startedAt);
  const end = parse(endedAt);
  if (start === null || end === null) return 0;
  const elapsed = end >= start ? end - start : (24 * 3600) - start + end;
  return elapsed > 0 ? elapsed / 3600 : 0;
}

/**
 * Calcula a taxa horária de depreciação do equipamento com base nos parâmetros cadastrais:
 * (Valor Aquisição - Valor Residual) / Vida Útil (anos) / 12 / Horas Disponíveis Mensais
 */
export function getEquipmentHourlyDepreciationRate(
  equipment: Pick<Equipment, 'acquisitionCost' | 'residualValue' | 'estimatedUsefulLife' | 'productiveHoursAvailable'>
): number {
  const acquisitionCost = Math.max(0, Number(equipment.acquisitionCost) || 0);
  const residualValue = Math.max(0, Number(equipment.residualValue) || 0);
  const estimatedUsefulLife = Math.max(0, Number(equipment.estimatedUsefulLife) || 0);
  const productiveHours = Math.max(1, Number(equipment.productiveHoursAvailable) || 220);

  const depreciableValue = Math.max(0, acquisitionCost - residualValue);
  if (estimatedUsefulLife <= 0 || productiveHours <= 0 || depreciableValue <= 0) return 0;
  const annualDepreciation = depreciableValue / estimatedUsefulLife;
  const monthlyDepreciation = annualDepreciation / 12;
  return monthlyDepreciation / productiveHours;
}

/**
 * Calcula a depreciação apropriada à Ordem de Produção:
 * Depreciação da OP = Taxa Horária de Depreciação × Horas Efetivamente Operadas na OP
 * 
 * Regra: É PROIBIDO usar productiveHoursAvailable como tempo da OP.
 * O tempo da OP deve ser o tempo real registrado na produção (ProductionEntry).
 */
export function calculateEquipmentDepreciation(
  equipment: Pick<Equipment, 'acquisitionCost' | 'residualValue' | 'estimatedUsefulLife' | 'productiveHoursAvailable'>,
  hours: number
): number {
  if (!hours || hours <= 0) return 0;
  const hourlyRate = getEquipmentHourlyDepreciationRate(equipment);
  return hourlyRate * hours;
}

export function getEquipmentDepreciationDetails(
  equipment: Pick<Equipment, 'acquisitionCost' | 'residualValue' | 'estimatedUsefulLife' | 'productiveHoursAvailable'>
): {
  depreciableValue: number;
  monthlyDepreciation: number;
  hourlyDepreciation: number;
} {
  const acquisitionCost = Math.max(0, Number(equipment.acquisitionCost) || 0);
  const residualValue = Math.max(0, Number(equipment.residualValue) || 0);
  const estimatedUsefulLife = Math.max(0, Number(equipment.estimatedUsefulLife) || 0);
  const productiveHours = Math.max(1, Number(equipment.productiveHoursAvailable) || 220);

  const depreciableValue = Math.max(0, acquisitionCost - residualValue);
  const monthlyDepreciation = estimatedUsefulLife > 0 ? depreciableValue / estimatedUsefulLife / 12 : 0;
  const hourlyDepreciation = (productiveHours > 0 && monthlyDepreciation > 0) ? monthlyDepreciation / productiveHours : 0;

  return {
    depreciableValue,
    monthlyDepreciation,
    hourlyDepreciation,
  };
}

export function getEquipmentEnergyDetails(
  equipment: Pick<Equipment, 'powerKw' | 'energyTariff' | 'productiveHoursAvailable'>
): {
  powerKw: number;
  energyTariff: number;
  hourlyEnergyCost: number;
  estimatedMonthlyKwh: number;
  estimatedMonthlyEnergyCost: number;
} {
  const powerKw = Math.max(0, Number(equipment.powerKw) || 0);
  const energyTariff = Math.max(0, Number(equipment.energyTariff) || 0);
  const productiveHours = Math.max(0, Number(equipment.productiveHoursAvailable) || 220);

  const hourlyEnergyCost = powerKw * energyTariff;
  const estimatedMonthlyKwh = powerKw * productiveHours;
  const estimatedMonthlyEnergyCost = estimatedMonthlyKwh * energyTariff;

  return {
    powerKw,
    energyTariff,
    hourlyEnergyCost,
    estimatedMonthlyKwh,
    estimatedMonthlyEnergyCost,
  };
}

export function calculateEnergyCost(
  equipment: Pick<Equipment, 'powerKw' | 'energyTariff'>,
  hours: number
): number {
  return Math.max(0, equipment.powerKw || 0) * Math.max(0, equipment.energyTariff || 0) * Math.max(0, hours);
}

export function calculateMaintenanceCost(
  equipment: Pick<Equipment, 'maintenanceCostPerHour'>,
  hours: number
): number {
  return Math.max(0, equipment.maintenanceCostPerHour || 0) * Math.max(0, hours);
}

export function calculateYield(
  plannedQuantity: number,
  finishedQuantity: number
): { yieldPercent: number; lossQuantity: number } {
  const planned = Math.max(0, plannedQuantity);
  const finished = Math.max(0, finishedQuantity);
  return {
    yieldPercent: planned > 0 ? (finished / planned) * 100 : 0,
    lossQuantity: Math.max(0, planned - finished),
  };
}

/**
 * Apuração de Mão de Obra Indireta (MOI):
 * 1. Agrupa os colaboradores indiretos (laborType === 'INDIRETA') por Centro de Custo (processId / costCenterId).
 * 2. Soma o Custo Mensal Total de cada Centro de Custo.
 * 3. Rateia para as OPs do período com base no direcionador configurável (padrão: HORAS_PRODUTIVAS).
 */
export function calculateMoiApportionment(
  orders: ProductionOrder[],
  allEntries: ProductionEntry[],
  employees: CostEmployee[],
  processes: ProductionProcess[],
  driverType: CostDriverType = 'HORAS_PRODUTIVAS',
  targetOrderId?: string
): {
  totalPeriodMoi: number;
  allocations: CostMoiAllocation[];
  orderAllocatedMoi: number;
} {
  const indirectEmployees = employees.filter((e) => e.laborType === 'INDIRETA' && e.active !== false);
  if (indirectEmployees.length === 0) {
    return { totalPeriodMoi: 0, allocations: [], orderAllocatedMoi: 0 };
  }

  // 1. Agrupamento por Centro de Custo
  const costCenterMap = new Map<string, {
    costCenterId: string;
    costCenterCode: string;
    costCenterName: string;
    totalMoiCost: number;
  }>();

  for (const emp of indirectEmployees) {
    const ccId = emp.costCenterId || emp.processId || 'cc-geral';
    const proc = processes.find((p) => p.id === ccId);
    const code = proc?.code || emp.costCenterCode || 'CC-GERAL';
    const name = proc?.description || emp.sector || 'Apoio Geral / Indireto';

    const empMonthlyCost = emp.totalMonthlyCost && emp.totalMonthlyCost > 0
      ? emp.totalMonthlyCost
      : (emp.baseSalary + emp.additions + emp.benefits) * (1 + (emp.chargePercent || 0) / 100);

    const existing = costCenterMap.get(ccId) || {
      costCenterId: ccId,
      costCenterCode: code,
      costCenterName: name,
      totalMoiCost: 0,
    };
    existing.totalMoiCost += empMonthlyCost;
    costCenterMap.set(ccId, existing);
  }

  // 2. Volumes do direcionador no período
  // Calcular métricas por OP
  const opMetrics = new Map<string, { hours: number; quantity: number }>();
  let totalPeriodHours = 0;
  let totalPeriodQuantity = 0;

  for (const order of orders) {
    const orderEntries = allEntries.filter((e) => e.orderId === order.id);
    let hours = 0;
    for (const ent of orderEntries) {
      hours += calculateDurationHours(ent.startedAt, ent.endedAt);
    }
    // Fallback: se não houver tempo apontado, assume 1h mínima por OP para não zerar rateio
    if (hours <= 0) hours = 1;

    const quantity = Math.max(1, order.producedQuantity || order.quantity || 1);

    opMetrics.set(order.id, { hours, quantity });
    totalPeriodHours += hours;
    totalPeriodQuantity += quantity;
  }

  if (totalPeriodHours <= 0) totalPeriodHours = 1;
  if (totalPeriodQuantity <= 0) totalPeriodQuantity = 1;

  // 3. Montar as alocações de MOI por Centro de Custo
  const allocations: CostMoiAllocation[] = [];
  let totalPeriodMoi = 0;
  let orderAllocatedMoi = 0;

  for (const cc of costCenterMap.values()) {
    totalPeriodMoi += cc.totalMoiCost;

    let totalDriverVolume = totalPeriodHours;
    let driverUnit = 'Horas Produtivas (h)';
    let opDriverVolume = targetOrderId ? (opMetrics.get(targetOrderId)?.hours || 0) : 0;

    if (driverType === 'QUANTIDADE_PRODUZIDA') {
      totalDriverVolume = totalPeriodQuantity;
      driverUnit = 'Barras / Unidades';
      opDriverVolume = targetOrderId ? (opMetrics.get(targetOrderId)?.quantity || 0) : 0;
    } else if (driverType === 'QUANTIDADE_OPS') {
      totalDriverVolume = Math.max(1, orders.length);
      driverUnit = 'Ordens de Produção';
      opDriverVolume = 1;
    }

    const ratePerUnit = totalDriverVolume > 0 ? cc.totalMoiCost / totalDriverVolume : 0;
    const allocatedAmount = opDriverVolume * ratePerUnit;

    if (targetOrderId) {
      orderAllocatedMoi += allocatedAmount;
    }

    allocations.push({
      costCenterId: cc.costCenterId,
      costCenterCode: cc.costCenterCode,
      costCenterName: cc.costCenterName,
      totalMoiCost: cc.totalMoiCost,
      driverType,
      driverUnit,
      totalDriverVolume,
      ratePerUnit,
      opDriverVolume,
      allocatedAmount,
    });
  }

  return { totalPeriodMoi, allocations, orderAllocatedMoi };
}

/**
 * Indicador Gerencial Médio por Barra:
 * (MOD total + MOI total) / quantidade de barras boas produzidas
 */
export function calculateLaborCostBarSummary(
  directLaborTotal: number,
  indirectLaborTotal: number,
  goodBarsQuantity: number
): LaborCostBarSummary {
  const goodBars = Math.max(0, goodBarsQuantity);
  const totalLaborCost = directLaborTotal + indirectLaborTotal;
  const directLaborPerBar = goodBars > 0 ? directLaborTotal / goodBars : 0;
  const indirectLaborPerBar = goodBars > 0 ? indirectLaborTotal / goodBars : 0;
  const totalLaborPerBar = goodBars > 0 ? totalLaborCost / goodBars : 0;

  return {
    totalGoodBars: goodBars,
    totalDirectLabor: directLaborTotal,
    totalIndirectLabor: indirectLaborTotal,
    totalLaborCost,
    directLaborPerBar,
    indirectLaborPerBar,
    totalLaborPerBar,
  };
}

export interface ProductionCostInputs {
  order: ProductionOrder;
  orders?: ProductionOrder[];
  entries: ProductionEntry[];
  steps: ProcessStepItem[];
  separations: ProductionMaterialSeparation[];
  inventory: InventoryItem[];
  employees: CostEmployee[];
  equipment: Equipment[];
  processes?: ProductionProcess[];
  charges?: CostCharge[];
  indirectCosts?: IndirectCost[];
  maintenance?: EquipmentMaintenance[];
  moiDriver?: CostDriverType;
}

export function calculateProductionOrderCost(inputs: ProductionCostInputs): CostOperation {
  const material = calculateMaterialCost(
    inputs.separations.filter((item) => item.orderId === inputs.order.id),
    inputs.inventory
  );

  const orderEntries = inputs.entries.filter((entry) => entry.orderId === inputs.order.id);
  const steps: CostOperationStep[] = [];

  // 1. Apuração Direta de MOD por Horas Registradas na OP:
  // Colaborador -> Hora registrada -> Processo/Etapa -> OP -> Produto
  for (const entry of orderEntries) {
    const step = inputs.steps.find((item) => item.id === entry.stepId);
    if (!step) continue;

    // Prioridade estrita do tempo real de operação da OP (Seção 9):
    // 1. Se hoursWorked estiver informado e for maior que zero, utilizar hoursWorked.
    // 2. Caso contrário, calcular através de startedAt -> endedAt (calculateDurationHours).
    // 3. Se não houver tempo válido, considerar zero.
    let hours = 0;
    if (entry.hoursWorked !== undefined && entry.hoursWorked !== null && Number(entry.hoursWorked) > 0) {
      hours = Number(entry.hoursWorked);
    } else if (entry.startedAt && entry.endedAt) {
      hours = calculateDurationHours(entry.startedAt, entry.endedAt);
    }
    if (isNaN(hours) || hours < 0) hours = 0;

    const employee = inputs.employees.find((item) => item.id === entry.employeeId);
    const manHours = hours * Math.max(1, step.laborQuantity || 1);

    // Se o apontamento já possui snapshot histórico de custo-hora, usa o snapshot gravado (não recalcula com dados futuros)
    let hourlyRate = 0;
    if (entry.hourlyCostSnapshot !== undefined && entry.hourlyCostSnapshot > 0) {
      hourlyRate = entry.hourlyCostSnapshot;
    } else if (employee) {
      hourlyRate = calculateEmployeeHourlyCost(employee, inputs.charges);
    } else {
      const processEmployees = inputs.employees.filter(
        (e) => e.laborType === 'DIRETA' && e.active !== false && (e.processId === step.processId || e.costCenterCode === step.costCenterCode)
      );
      if (processEmployees.length > 0) {
        const sumRates = processEmployees.reduce((sum, e) => sum + calculateEmployeeHourlyCost(e, inputs.charges), 0);
        hourlyRate = sumRates / processEmployees.length;
      } else {
        hourlyRate = step.hourlyRate || 0;
      }
    }

    // Prioriza custo de MOD já apurado no apontamento ou horas * taxa
    const laborCost = (entry.modCost !== undefined && entry.modCost > 0)
      ? entry.modCost
      : manHours * hourlyRate;

    // Identificação do equipamento da etapa (por ID ou correspondência de nome/código)
    const machine = inputs.equipment.find(
      (item) =>
        item.id === step.equipmentId ||
        (step.machine && (item.name.toLowerCase() === step.machine.toLowerCase() || item.code.toLowerCase() === step.machine.toLowerCase()))
    );

    // Identificação do Centro de Custo associado ao equipamento ou à etapa
    const procId = machine?.processId || step.processId;
    const proc = inputs.processes?.find((p) => p.id === procId);
    const costCenterCode = proc?.code || step.costCenterCode;
    const costCenterName = proc?.description;

    // Cálculo dos custos de máquina estritamente pelo tempo real de operação da OP (hours):
    const stepDepreciation = machine ? calculateEquipmentDepreciation(machine, hours) : 0;
    const stepEnergy = machine ? calculateEnergyCost(machine, hours) : 0;
    const stepMaintenance = machine ? calculateMaintenanceCost(machine, hours) : 0;
    const stepOtherEquipment = machine ? ((machine.otherCostPerHour || 0) * hours) : 0;

    // Regra oficial de classificação contábil:
    // equipmentCost = depreciationCost + maintenanceCost + otherEquipmentCost (sem energia!)
    // A energia elétrica é classificada separadamente como CIF - Energia Elétrica
    const equipmentCost = stepDepreciation + stepMaintenance + stepOtherEquipment;

    steps.push({
      id: `step-cost-${entry.id}`,
      stepId: step.id,
      durationHours: hours,
      manHours,
      laborCost,
      equipmentCost,
      energyCost: stepEnergy,
      maintenanceCost: stepMaintenance,
      depreciationCost: stepDepreciation,
      totalCost: laborCost + equipmentCost + stepEnergy,
      equipmentId: machine?.id,
      equipmentName: machine?.name || step.machine,
      costCenterCode,
      costCenterName,
    });
  }

  const directLaborCost = steps.reduce((sum, step) => sum + step.laborCost, 0);
  const energyCost = steps.reduce((sum, step) => sum + step.energyCost, 0);
  const maintenanceCost = steps.reduce((sum, step) => sum + step.maintenanceCost, 0);
  const depreciationCost = steps.reduce((sum, step) => sum + step.depreciationCost, 0);
  const otherEquipmentCost = steps.reduce(
    (sum, step) => sum + Math.max(0, step.equipmentCost - step.depreciationCost - step.maintenanceCost),
    0
  );

  // 2. Apuração de MOI Rateada por Direcionador Configurável (não dividida diretamente)
  const allOrders = inputs.orders && inputs.orders.length > 0 ? inputs.orders : [inputs.order];
  const moiResult = calculateMoiApportionment(
    allOrders,
    inputs.entries,
    inputs.employees,
    inputs.processes || [],
    inputs.moiDriver || 'HORAS_PRODUTIVAS',
    inputs.order.id
  );
  const indirectLaborCost = moiResult.orderAllocatedMoi;

  // 3. Outros custos indiretos (além de MOI)
  const baseIndirectCost = (inputs.indirectCosts || [])
    .filter((cost) => cost.active)
    .reduce((sum, cost) => sum + cost.amount, 0);
  const otherIndirectCost = baseIndirectCost + otherEquipmentCost;

  // Quantidade de barras boas produzidas (etapa de embalagem / final)
  const packagingEntries = inputs.steps
    .filter((step) => /embalagem|envase|final/i.test(`${step.title} ${step.line || ''} ${step.costCenterCode || ''}`))
    .flatMap((step) => orderEntries.filter((entry) => entry.stepId === step.id));

  let goodBarsQuantity = packagingEntries.reduce((sum, entry) => sum + entry.quantityProduced, 0);
  if (goodBarsQuantity <= 0) {
    goodBarsQuantity = inputs.order.producedQuantity || inputs.order.quantity;
  }

  const yieldData = calculateYield(inputs.order.quantity, goodBarsQuantity);
  // Estrutura CIF: Materiais + MOD + MOI + Energia(CIF) + Manutenção(CIF) + Depreciação(CIF) + Outros CIF
  const totalCost = material.total + directLaborCost + indirectLaborCost + energyCost + maintenanceCost + depreciationCost + otherIndirectCost;
  const unitCost = goodBarsQuantity > 0 ? totalCost / goodBarsQuantity : 0;

  // Indicador médio de mão de obra por barra
  const barSummary = calculateLaborCostBarSummary(directLaborCost, indirectLaborCost, goodBarsQuantity);

  return {
    id: `cost-${inputs.order.id}`,
    orderId: inputs.order.id,
    status: 'APURADO',
    plannedQuantity: inputs.order.quantity,
    finishedQuantity: goodBarsQuantity,
    goodBarsQuantity,
    ...yieldData,
    materialCost: material.total,
    directLaborCost,
    indirectLaborCost,
    energyCost,
    maintenanceCost,
    depreciationCost,
    otherIndirectCost,
    totalCost,
    unitCost,
    version: 1,
    recalculationReason: '',
    calculatedAt: new Date().toISOString(),
    items: material.items,
    steps,
    moiAllocations: moiResult.allocations,
    modPerBar: barSummary.directLaborPerBar,
    moiPerBar: barSummary.indirectLaborPerBar,
    totalLaborPerBar: barSummary.totalLaborPerBar,
  };
}
