import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { 
  Product, 
  BOMComponent, 
  ProcessStepItem, 
  InventoryItem, 
  StockMovement, 
  ProductionOrder, 
  ProductionEntry,
  ProductionMaterialSeparation,
  SaleRecord,
  ProductionProcess,
  Equipment
} from './types';

export const dbService = {
  // PRODUCTS
  async fetchProducts(): Promise<Product[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return null;

    const { data, error } = await supabase.from('products').select('*').order('code');
    if (error) {
      console.warn('Erro ao carregar produtos do Supabase:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      stock: Number(row.stock || 0),
      minStock: Number(row.min_stock || 0),
      maxStock: row.max_stock ? Number(row.max_stock) : undefined,
      price: Number(row.price || 0),
      unit: row.unit || 'UN',
      status: row.status,
      description: row.description || '',
      createdAt: row.created_at || new Date().toISOString(),
      bomCost: Number(row.bom_cost || 0),
      laborCost: Number(row.labor_cost || 0),
      imageUrl: row.image_url,
      sku: row.sku,
    }));
  },

  async saveProduct(product: Product): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;

    const { error } = await supabase.from('products').upsert({
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      stock: product.stock,
      min_stock: product.minStock,
      max_stock: product.maxStock,
      price: product.price,
      unit: product.unit,
      status: product.status,
      description: product.description,
      bom_cost: product.bomCost,
      labor_cost: product.laborCost,
      image_url: product.imageUrl,
      sku: product.sku,
      updated_at: new Date().toISOString(),
    });

    return !error;
  },

  async deleteProduct(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.warn('Erro ao excluir produto:', error.message);
      return false;
    }
    return true;
  },

  // INVENTORY ITEMS
  async fetchInventory(): Promise<InventoryItem[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return null;

    const { data, error } = await supabase.from('inventory_items').select('*').order('code');
    if (error) {
      console.warn('Erro ao carregar inventário do Supabase:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      unit: row.unit,
      balance: Number(row.balance || 0),
      minStock: Number(row.min_stock || 0),
      maxStock: Number(row.max_stock || 100),
      unitCost: Number(row.unit_cost || 0),
      status: row.status,
      batch: row.batch,
      imageUrl: row.image_url,
      leadTimeDays: row.lead_time_days,
      lastPurchaseDate: row.last_purchase_date,
    }));
  },

  async saveInventoryItem(item: InventoryItem): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;

    const { error } = await supabase.from('inventory_items').upsert({
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      balance: item.balance,
      min_stock: item.minStock,
      max_stock: item.maxStock,
      unit_cost: item.unitCost,
      status: item.status,
      batch: item.batch,
      image_url: item.imageUrl,
      lead_time_days: item.leadTimeDays,
      last_purchase_date: item.lastPurchaseDate,
      updated_at: new Date().toISOString(),
    });

    return !error;
  },

  // PRODUCTION ORDERS
  async fetchProductionOrders(): Promise<ProductionOrder[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return null;

    const { data, error } = await supabase.from('production_orders').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Erro ao carregar OPs do Supabase:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      opNumber: row.op_number,
      productId: row.product_id || undefined,
      productName: row.product_name,
      productCode: row.product_code,
      progress: Number(row.progress || 0),
      forecast: row.forecast || undefined,
      status: row.status,
      line: row.line || undefined,
      quantity: Number(row.quantity || 1),
      unit: row.unit || 'un',
      openingDate: row.opening_date || row.created_at || new Date().toISOString(),
      productionStart: row.production_start || undefined,
      productionEnd: row.production_end || undefined,
      producedQuantity: Number(row.produced_quantity || 0),
    }));
  },

  async saveProductionOrder(order: ProductionOrder): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;

    const { error } = await supabase.from('production_orders').upsert({
      id: order.id,
      op_number: order.opNumber,
      product_id: order.productId,
      product_name: order.productName,
      product_code: order.productCode,
      progress: order.progress,
      forecast: order.forecast,
      status: order.status,
      line: order.line,
      quantity: order.quantity,
      unit: order.unit,
      opening_date: order.openingDate,
      production_start: order.productionStart,
      production_end: order.productionEnd,
      produced_quantity: order.producedQuantity || 0,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Erro ao salvar Ordem de Produção no Supabase:', error.message, error.details || '');
    }
    return !error;
  },

  async deleteProductionOrder(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;
    const { error } = await supabase.from('production_orders').delete().eq('id', id);
    if (error) console.error('Erro ao excluir Ordem de Produção:', error.message);
    return !error;
  },

  // LANÇAMENTOS DE PRODUÇÃO POR ETAPA
  async fetchProductionEntries(): Promise<ProductionEntry[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return null;
    const { data, error } = await supabase.from('production_entries').select('*').order('entry_date', { ascending: false });
    if (error) {
      console.warn('Erro ao carregar lançamentos de produção:', error.message);
      return null;
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      orderId: row.order_id,
      stepId: row.step_id,
      quantityProduced: Number(row.quantity_produced || 0),
      startedAt: row.started_at || undefined,
      endedAt: row.ended_at || undefined,
      entryDate: row.entry_date,
    }));
  },

  async saveProductionEntry(entry: ProductionEntry): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;
    const { error } = await supabase.from('production_entries').upsert({
      id: entry.id,
      order_id: entry.orderId,
      step_id: entry.stepId,
      quantity_produced: entry.quantityProduced,
      started_at: entry.startedAt,
      ended_at: entry.endedAt,
      entry_date: entry.entryDate,
    });
    return !error;
  },

  async fetchProductionMaterialSeparations(): Promise<ProductionMaterialSeparation[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return null;
    const { data, error } = await supabase.from('production_material_separations').select('*');
    if (error) {
      console.warn('Erro ao carregar separações de materiais:', error.message);
      return null;
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      orderId: row.order_id,
      inventoryItemId: row.inventory_item_id,
      quantity: Number(row.quantity || 0),
      separatedAt: row.separated_at,
    }));
  },

  async saveProductionMaterialSeparation(separation: ProductionMaterialSeparation): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;
    const { error } = await supabase.from('production_material_separations').upsert({
      id: separation.id,
      order_id: separation.orderId,
      inventory_item_id: separation.inventoryItemId,
      quantity: separation.quantity,
      separated_at: separation.separatedAt,
    });
    if (error) console.error('Erro ao salvar separação de material:', error.message);
    return !error;
  },

  // SALES RECORDS
  async fetchSales(): Promise<SaleRecord[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return null;

    const { data, error } = await supabase.from('sales_records').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Erro ao carregar vendas do Supabase:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      date: row.date,
      client: row.client,
      item: row.item,
      value: Number(row.value || 0),
      status: row.status,
    }));
  },

  async saveSale(sale: SaleRecord): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;

    const { error } = await supabase.from('sales_records').upsert({
      id: sale.id,
      date: sale.date,
      client: sale.client,
      item: sale.item,
      value: sale.value,
      status: sale.status,
    });

    return !error;
  },

  // BOM COMPONENTS
  async fetchBOMComponents(): Promise<BOMComponent[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return null;

    const { data, error } = await supabase.from('bom_components').select('*').order('level');
    if (error) {
      console.warn('Erro ao carregar componentes BOM do Supabase:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      level: row.level,
      name: row.name,
      icon: row.icon,
      quantity: Number(row.quantity || 1),
      unit: row.unit,
      unitCost: Number(row.unit_cost || 0),
      totalCost: Number(row.total_cost || 0),
      imageUrl: row.image_url,
    }));
  },

  async saveBOMComponent(comp: BOMComponent): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;

    const { error } = await supabase.from('bom_components').upsert({
      id: comp.id,
      level: comp.level,
      name: comp.name,
      icon: comp.icon,
      quantity: comp.quantity,
      unit: comp.unit,
      unit_cost: comp.unitCost,
      total_cost: comp.totalCost,
      image_url: comp.imageUrl,
    });

    return !error;
  },

  // PROCESS STEPS
  async fetchProcessSteps(): Promise<ProcessStepItem[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return null;

    const { data, error } = await supabase.from('process_steps').select('*').order('step_number');
    if (error) {
      console.warn('Erro ao carregar etapas de roteiro do Supabase:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      productId: row.product_id || undefined,
      stepNumber: row.step_number,
      title: row.title,
      cost: Number(row.cost || 0),
      machine: row.machine,
      line: row.line,
      durationMinutes: row.duration_minutes,
      durationFormatted: row.duration_formatted,
      hourlyRateText: row.hourly_rate_text,
      processId: row.process_id || undefined,
      equipmentId: row.equipment_id || undefined,
      costCenterCode: row.cost_center_code || undefined,
      hourlyRate: row.hourly_rate !== null && row.hourly_rate !== undefined ? Number(row.hourly_rate) : undefined,
      unitsPerHour: row.units_per_hour !== null && row.units_per_hour !== undefined ? Number(row.units_per_hour) : undefined,
      laborQuantity: row.labor_quantity !== null && row.labor_quantity !== undefined ? Number(row.labor_quantity) : undefined,
    }));
  },

  async saveProcessStep(step: ProcessStepItem): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;

    const { error } = await supabase.from('process_steps').upsert({
      id: step.id,
      product_id: step.productId,
      step_number: step.stepNumber,
      title: step.title,
      cost: step.cost,
      machine: step.machine,
      line: step.line,
      duration_minutes: step.durationMinutes,
      duration_formatted: step.durationFormatted,
      hourly_rate_text: step.hourlyRateText,
      process_id: step.processId,
      equipment_id: step.equipmentId,
      cost_center_code: step.costCenterCode,
      hourly_rate: step.hourlyRate,
      units_per_hour: step.unitsPerHour,
      labor_quantity: step.laborQuantity,
    });

    if (error) {
      console.error('Erro ao salvar etapa do roteiro no Supabase:', error.message, error.details || '');
      return false;
    }

    return true;
  },

  // STOCK MOVEMENTS
  async fetchStockMovements(): Promise<StockMovement[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return null;

    const { data, error } = await supabase.from('stock_movements').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Erro ao carregar movimentações do Supabase:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      itemName: row.item_name,
      itemCode: row.item_code,
      quantity: Number(row.quantity),
      unit: row.unit,
      timestamp: row.timestamp,
    }));
  },

  async saveStockMovement(mov: StockMovement): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;

    const { error } = await supabase.from('stock_movements').upsert({
      id: mov.id,
      type: mov.type,
      title: mov.title,
      item_name: mov.itemName,
      item_code: mov.itemCode,
      quantity: mov.quantity,
      unit: mov.unit,
      timestamp: mov.timestamp,
    });

    return !error;
  },

  // DELETE BOM COMPONENT
  async deleteBOMComponent(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;
    const { error } = await supabase.from('bom_components').delete().eq('id', id);
    return !error;
  },

  // DELETE PROCESS STEP
  async deleteProcessStep(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;
    const { error } = await supabase.from('process_steps').delete().eq('id', id);
    return !error;
  },

  // PRODUCTION PROCESSES / CENTROS DE CUSTO
  async fetchProductionProcesses(): Promise<ProductionProcess[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('macarvalho_production_processes');
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            return null;
          }
        }
      }
      return null;
    }

    const { data, error } = await supabase.from('production_processes').select('*').order('code');
    if (error) {
      console.warn('Erro ao carregar processos produtivos do Supabase:', error.message);
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('macarvalho_production_processes');
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            return null;
          }
        }
      }
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      description: row.description,
      hourlyRate: Number(row.hourly_rate || 0),
      createdAt: row.created_at,
    }));
  },

  async saveProductionProcess(proc: ProductionProcess): Promise<boolean> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_production_processes');
        let list: ProductionProcess[] = stored ? JSON.parse(stored) : [];
        const index = list.findIndex((p) => p.id === proc.id);
        if (index >= 0) {
          list[index] = proc;
        } else {
          list.push(proc);
        }
        localStorage.setItem('macarvalho_production_processes', JSON.stringify(list));
      } catch (e) {
        console.warn('Erro ao salvar processo no localStorage:', e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;

    const { error } = await supabase.from('production_processes').upsert({
      id: proc.id,
      code: proc.code,
      description: proc.description,
      hourly_rate: proc.hourlyRate,
      created_at: proc.createdAt || new Date().toISOString(),
    });

    return !error;
  },

  async deleteProductionProcess(id: string): Promise<boolean> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_production_processes');
        if (stored) {
          const list: ProductionProcess[] = JSON.parse(stored);
          const filtered = list.filter((p) => p.id !== id);
          localStorage.setItem('macarvalho_production_processes', JSON.stringify(filtered));
        }
      } catch (e) {
        console.warn('Erro ao remover processo do localStorage:', e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;

    const { error } = await supabase.from('production_processes').delete().eq('id', id);
    return !error;
  },

  // EQUIPAMENTOS VINCULADOS A CENTROS DE CUSTO
  async fetchEquipment(): Promise<Equipment[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('macarvalho_equipment');
        if (stored) {
          try { return JSON.parse(stored); } catch { return null; }
        }
      }
      return null;
    }

    const { data, error } = await supabase.from('equipment').select('*').order('code');
    if (error) {
      console.warn('Erro ao carregar equipamentos do Supabase:', error.message);
      return null;
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      processId: row.process_id,
      acquisitionCost: Number(row.acquisition_cost || 0),
      residualValue: Number(row.residual_value || 0),
      estimatedUsefulLife: Number(row.estimated_useful_life || 0),
      createdAt: row.created_at,
    }));
  },

  async saveEquipment(equipment: Equipment): Promise<boolean> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_equipment');
        const list: Equipment[] = stored ? JSON.parse(stored) : [];
        const index = list.findIndex((item) => item.id === equipment.id);
        if (index >= 0) list[index] = equipment; else list.push(equipment);
        localStorage.setItem('macarvalho_equipment', JSON.stringify(list));
      } catch (e) { console.warn('Erro ao salvar equipamento no localStorage:', e); }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;
    const { error } = await supabase.from('equipment').upsert({
      id: equipment.id,
      code: equipment.code,
      name: equipment.name,
      process_id: equipment.processId,
      acquisition_cost: equipment.acquisitionCost,
      residual_value: equipment.residualValue,
      estimated_useful_life: equipment.estimatedUsefulLife,
      created_at: equipment.createdAt || new Date().toISOString(),
    });
    return !error;
  },

  async deleteEquipment(id: string): Promise<boolean> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_equipment');
        if (stored) {
          const list: Equipment[] = JSON.parse(stored);
          localStorage.setItem('macarvalho_equipment', JSON.stringify(list.filter((item) => item.id !== id)));
        }
      } catch (e) { console.warn('Erro ao remover equipamento do localStorage:', e); }
    }
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;
    const { error } = await supabase.from('equipment').delete().eq('id', id);
    return !error;
  }
};
