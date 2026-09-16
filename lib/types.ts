export type ViewMode = 
  | 'dashboard'
  | 'produtos'
  | 'bom'
  | 'estoque'
  | 'compras'
  | 'vendas'
  | 'ordens-producao'
  | 'custos-industriais';

export interface ProductionProcess {
  id: string;
  code: string; // Código do Centro de Custo (ex: CC-01, CC-MISTURA, CC-ENVASE)
  description: string; // Descrição do processo produtivo
  hourlyRate: number; // Valor hora do centro de custo (R$/h)
  createdAt?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  maxStock?: number;
  price: number;
  unit: string;
  status: 'Ativo' | 'Inativo';
  description: string;
  createdAt: string;
  bomCost: number;
  laborCost: number;
  imageUrl?: string;
  sku?: string;
}

export interface BOMComponentItem {
  id: string;
  level: string; // e.g. "1", "1.1", "1.2"
  name: string;
  icon?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  imageUrl?: string;
}

export type BOMComponent = BOMComponentItem;

export interface ProcessStepItem {
  id: string;
  productId?: string;
  stepNumber: number; // e.g. 10, 20, 30, 40
  title: string;
  cost: number;
  machine: string;
  line: string;
  durationMinutes: number;
  durationFormatted: string;
  hourlyRateText: string;
  processId?: string;
  equipmentId?: string;
  costCenterCode?: string;
  hourlyRate?: number;
  unitsPerHour?: number;
  laborQuantity?: number;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: 'Matéria-Prima' | 'Embalagens' | 'Componentes' | 'Produto Acabado' | 'Insumos';
  unit: string;
  balance: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  status: 'Normal' | 'Baixo' | 'Crítico' | 'Esgotado';
  batch?: string;
  imageUrl?: string;
  leadTimeDays?: number;
  lastPurchaseDate?: string;
}

export interface StockMovement {
  id: string;
  type: 'entrada' | 'saida' | 'ajuste';
  title: string;
  itemName: string;
  itemCode?: string;
  quantity: number;
  unit: string;
  timestamp: string;
  productionOrderId?: string;
  productId?: string;
  sourceType?: string;
  sourceId?: string;
  unitCost?: number;
  totalCost?: number;
}

export interface ProductionOrder {
  id: string;
  opNumber: string;
  productId?: string;
  productName: string;
  productCode: string;
  progress: number;
  forecast?: string;
  status: 'Em Andamento' | 'Parada' | 'Concluída' | 'Planejada';
  line?: string;
  quantity: number;
  unit: string;
  openingDate: string;
  productionStart?: string;
  productionEnd?: string;
  producedQuantity?: number;
}

export interface ProductionEntry {
  id: string;
  orderId: string;
  stepId: string;
  quantityProduced: number;
  startedAt?: string;
  endedAt?: string;
  hoursWorked?: number;
  entryDate: string;
  employeeId?: string;
  employeeName?: string;
  hourlyCostSnapshot?: number;
  modCost?: number;
  notes?: string;
}

export interface ProductionMaterialSeparation {
  id: string;
  orderId: string;
  inventoryItemId: string;
  quantity: number;
  separatedAt: string;
  unitCostSnapshot?: number;
  totalCost?: number;
  competenceDate?: string;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  description?: string;
  processId: string;
  acquisitionCost: number;
  residualValue: number;
  estimatedUsefulLife: number;
  powerKw?: number;
  energyTariff?: number;
  maintenanceCostPerHour?: number;
  otherCostPerHour?: number;
  productiveHoursAvailable?: number;
  createdAt?: string;
}

export type CostLaborType = 'DIRETA' | 'INDIRETA';
export type CostApportionmentStatus = 'NAO_APURADO' | 'EM_CALCULO' | 'APURADO' | 'FECHADO' | 'REABERTO';
export type CostDriverType = 'HORAS_PRODUTIVAS' | 'QUANTIDADE_PRODUZIDA' | 'QUANTIDADE_OPS' | 'CUSTO_MOD';

export interface CostSector {
  id: string;
  code: string;
  name: string;
  costCenterId: string;
  active: boolean;
  operationType?: string;
  standardTimeMinutes?: number;
  description?: string;
  createdAt?: string;
}

export type ManufacturingProcessItem = CostSector;

export interface CostEmployeeChargeDetail {
  chargeId: string;
  code: string;
  description: string;
  percent: number;
  baseAmount: number;
  calculatedAmount: number;
  chargeType: string;
}

export interface CostBenefitItem {
  id: string;
  name: string;
  amount: number;
}

export interface CostEmployee {
  id: string;
  code: string;
  name: string;
  role: string;
  sector: string;
  sectorId?: string;
  processId?: string; // Foreign key to production_processes / Centro de Custo
  costCenterId?: string;
  costCenterCode?: string;
  costCenterDescription?: string;
  laborType: CostLaborType;
  baseSalary: number;
  additions: number;
  benefits: number;
  benefitsDetail?: CostBenefitItem[];
  chargePercent: number; // Percentual consolidado calculado automaticamente
  totalChargesAmount?: number; // Total em R$ dos encargos calculados
  totalMonthlyCost?: number; // Salário Base + Encargos + Benefícios
  chargesDetail?: CostEmployeeChargeDetail[]; // Composição individual item a item
  selectedChargeIds?: string[]; // IDs dos encargos selecionados
  monthlyHours: number;
  productiveHours: number;
  hourlyCost: number; // totalMonthlyCost / productiveHours
  validFrom?: string;
  validUntil?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CostEmployeeHistory {
  id: string;
  employeeId: string;
  competenceDate: string;
  baseSalary: number;
  benefits: number;
  totalChargesAmount: number;
  totalMonthlyCost: number;
  productiveHours: number;
  hourlyCost: number;
  laborType: CostLaborType;
  sectorId?: string;
  sectorName?: string;
  processId?: string;
  costCenterCode?: string;
  chargesDetail?: CostEmployeeChargeDetail[];
  benefitsDetail?: CostBenefitItem[];
  createdAt?: string;
}

export interface CostCharge {
  id: string;
  code: string;
  description: string;
  percent: number;
  chargeType: string;
  validFrom?: string;
  validUntil?: string;
  active: boolean;
}

export interface CostDriver {
  id: string;
  code: string;
  description: string;
  driverType: string;
  unit: string;
  active: boolean;
}

export interface IndirectCost {
  id: string;
  code: string;
  description: string;
  category: string;
  processId?: string;
  amount: number;
  competence: string;
  classification: 'FIXO' | 'VARIAVEL';
  driverId?: string;
  observation: string;
  active: boolean;
}

export interface EquipmentMaintenance {
  id: string;
  equipmentId: string;
  processId?: string;
  maintenanceType: string;
  maintenanceDate: string;
  amount: number;
  supplier: string;
  observation: string;
}

export interface CostOperationItem {
  id: string;
  category: string;
  sourceId?: string;
  description: string;
  quantity: number;
  unitCost: number;
  amount: number;
}

export interface CostOperationStep {
  id: string;
  stepId: string;
  durationHours: number;
  manHours: number;
  laborCost: number;
  equipmentCost: number;
  energyCost: number;
  maintenanceCost: number;
  depreciationCost: number;
  totalCost: number;
  equipmentId?: string;
  equipmentName?: string;
  costCenterCode?: string;
  costCenterName?: string;
}

export interface CostMoiAllocation {
  costCenterId: string;
  costCenterCode: string;
  costCenterName: string;
  totalMoiCost: number;
  driverType: CostDriverType;
  driverUnit: string;
  totalDriverVolume: number;
  ratePerUnit: number;
  opDriverVolume: number;
  allocatedAmount: number;
}

export interface LaborCostBarSummary {
  totalGoodBars: number;
  totalDirectLabor: number;
  totalIndirectLabor: number;
  totalLaborCost: number;
  directLaborPerBar: number;
  indirectLaborPerBar: number;
  totalLaborPerBar: number;
}

export interface CostOperation {
  id: string;
  orderId: string;
  status: CostApportionmentStatus;
  plannedQuantity: number;
  finishedQuantity: number;
  yieldPercent: number;
  lossQuantity: number;
  materialCost: number;
  directLaborCost: number;
  indirectLaborCost: number;
  energyCost: number;
  maintenanceCost: number;
  depreciationCost: number;
  otherIndirectCost: number;
  totalCost: number;
  unitCost: number;
  version: number;
  recalculationReason: string;
  calculatedAt?: string;
  closedAt?: string;
  items: CostOperationItem[];
  steps: CostOperationStep[];
  moiAllocations?: CostMoiAllocation[];
  goodBarsQuantity?: number;
  modPerBar?: number;
  moiPerBar?: number;
  totalLaborPerBar?: number;
  analysisMonth?: string;
  monthIndirectTotal?: number;
  indirectCostSharePercent?: number;
}

export interface SaleRecord {
  id: string;
  date: string;
  client: string;
  item?: string;
  value: number;
  status: 'Faturado' | 'Separando' | 'Aguard. Pag.' | 'Cancelado';
}
