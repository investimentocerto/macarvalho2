export type ViewMode = 
  | 'dashboard'
  | 'produtos'
  | 'bom'
  | 'processos'
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
  entryDate: string;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  processId: string;
  acquisitionCost: number;
  residualValue: number;
  estimatedUsefulLife: number;
  createdAt?: string;
}

export interface SaleRecord {
  id: string;
  date: string;
  client: string;
  item?: string;
  value: number;
  status: 'Faturado' | 'Separando' | 'Aguard. Pag.' | 'Cancelado';
}
