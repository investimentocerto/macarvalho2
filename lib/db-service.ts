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
  Equipment,
  CostSector,
  CostEmployee,
  CostEmployeeHistory,
  CostCharge,
  CostDriver,
  IndirectCost,
  EquipmentMaintenance,
  CostOperation
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

  // LANÇAMENTOS DE PRODUÇÃO POR ETAPA E APONTAMENTO DE MOD
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
      employeeId: row.employee_id || undefined,
      employeeName: row.employee_name || undefined,
      hoursWorked: row.hours_worked !== undefined && row.hours_worked !== null ? Number(row.hours_worked) : undefined,
      hourlyCostSnapshot: row.hourly_cost_snapshot !== undefined && row.hourly_cost_snapshot !== null ? Number(row.hourly_cost_snapshot) : undefined,
      modCost: row.mod_cost !== undefined && row.mod_cost !== null ? Number(row.mod_cost) : undefined,
      notes: row.notes || undefined,
    }));
  },

  async saveProductionEntry(entry: ProductionEntry): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;

    // Tentar salvar com todas as colunas de MOD
    const payload: any = {
      id: entry.id,
      order_id: entry.orderId,
      step_id: entry.stepId,
      quantity_produced: entry.quantityProduced,
      started_at: entry.startedAt || null,
      ended_at: entry.endedAt || null,
      entry_date: entry.entryDate,
      employee_id: entry.employeeId || null,
      employee_name: entry.employeeName || null,
      hours_worked: entry.hoursWorked || 0,
      hourly_cost_snapshot: entry.hourlyCostSnapshot || 0,
      mod_cost: entry.modCost || 0,
      notes: entry.notes || null,
    };

    const { error } = await supabase.from('production_entries').upsert(payload);
    if (error) {
      console.warn('Tentativa com colunas MOD falhou, tentando schema básico:', error.message);
      // Fallback para caso as colunas novas ainda não tenham sido criadas no Supabase
      const basicPayload: any = {
        id: entry.id,
        order_id: entry.orderId,
        step_id: entry.stepId,
        quantity_produced: entry.quantityProduced,
        started_at: entry.startedAt || null,
        ended_at: entry.endedAt || null,
        entry_date: entry.entryDate,
        employee_id: entry.employeeId || null,
      };
      const basicRes = await supabase.from('production_entries').upsert(basicPayload);
      if (basicRes.error) {
        console.error('Erro ao salvar lançamento de produção no Supabase:', basicRes.error.message);
        return false;
      }
    }
    return true;
  },

  async deleteProductionEntry(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;
    const { error } = await supabase.from('production_entries').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir lançamento de produção:', error.message);
      return false;
    }
    return true;
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
      unitCostSnapshot: row.unit_cost_snapshot !== null && row.unit_cost_snapshot !== undefined ? Number(row.unit_cost_snapshot) : undefined,
      totalCost: row.total_cost !== null && row.total_cost !== undefined ? Number(row.total_cost) : undefined,
      competenceDate: row.competence_date || undefined,
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
      unit_cost_snapshot: separation.unitCostSnapshot,
      total_cost: separation.totalCost,
      competence_date: separation.competenceDate,
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
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase.from('process_steps').select('*').order('step_number');
      if (!error && data) {
        const mapped: ProcessStepItem[] = data.map((row: any) => ({
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
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('macarvalho_process_steps', JSON.stringify(mapped));
          } catch (e) {
            // ignore
          }
        }
        return mapped;
      }
      console.warn('Erro ao carregar etapas de roteiro do Supabase:', error?.message);
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_process_steps');
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) return list;
        }
      } catch (e) {
        console.warn('Erro ao ler etapas do localStorage:', e);
      }
    }

    return null;
  },

  async saveProcessStep(step: ProcessStepItem): Promise<boolean> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_process_steps');
        const list: ProcessStepItem[] = stored ? JSON.parse(stored) : [];
        const index = list.findIndex((s) => s.id === step.id);
        if (index >= 0) list[index] = step; else list.push(step);
        localStorage.setItem('macarvalho_process_steps', JSON.stringify(list));
      } catch (e) {
        console.warn('Erro ao salvar etapa no localStorage:', e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;

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

  async deleteProcessStep(id: string): Promise<boolean> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_process_steps');
        if (stored) {
          const list: ProcessStepItem[] = JSON.parse(stored);
          localStorage.setItem('macarvalho_process_steps', JSON.stringify(list.filter((s) => s.id !== id)));
        }
      } catch (e) {
        console.warn('Erro ao remover etapa do roteiro no localStorage:', e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;
    const { error } = await supabase.from('process_steps').delete().eq('id', id);
    return !error;
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
      productionOrderId: row.production_order_id || undefined,
      productId: row.product_id || undefined,
      sourceType: row.source_type || undefined,
      sourceId: row.source_id || undefined,
      unitCost: row.unit_cost !== null && row.unit_cost !== undefined ? Number(row.unit_cost) : undefined,
      totalCost: row.total_cost !== null && row.total_cost !== undefined ? Number(row.total_cost) : undefined,
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
      production_order_id: mov.productionOrderId,
      product_id: mov.productId,
      source_type: mov.sourceType,
      source_id: mov.sourceId,
      unit_cost: mov.unitCost,
      total_cost: mov.totalCost,
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
    if (error) {
      console.warn('Erro ao excluir processo no Supabase:', error.message);
    }
    return true;
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
      description: row.description || '',
      processId: row.process_id,
      acquisitionCost: Number(row.acquisition_cost || 0),
      residualValue: Number(row.residual_value || 0),
      estimatedUsefulLife: Number(row.estimated_useful_life || 0),
      powerKw: Number(row.power_kw || 0),
      energyTariff: Number(row.energy_tariff || 0),
      maintenanceCostPerHour: Number(row.maintenance_cost_per_hour || 0),
      otherCostPerHour: Number(row.other_cost_per_hour || 0),
      productiveHoursAvailable: Number(row.productive_hours_available || 220),
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
    const payload: any = {
      id: equipment.id,
      code: equipment.code,
      name: equipment.name,
      description: equipment.description || null,
      process_id: equipment.processId,
      acquisition_cost: equipment.acquisitionCost,
      residual_value: equipment.residualValue,
      estimated_useful_life: equipment.estimatedUsefulLife,
      power_kw: equipment.powerKw || 0,
      energy_tariff: equipment.energyTariff || 0,
      maintenance_cost_per_hour: equipment.maintenanceCostPerHour || 0,
      other_cost_per_hour: equipment.otherCostPerHour || 0,
      productive_hours_available: equipment.productiveHoursAvailable || 220,
      created_at: equipment.createdAt || new Date().toISOString(),
    };
    let { error } = await supabase.from('equipment').upsert(payload);
    if (error && error.message && error.message.toLowerCase().includes('description')) {
      delete payload.description;
      const retry = await supabase.from('equipment').upsert(payload);
      error = retry.error;
    }
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
  },

  // INDUSTRIAL COSTS: SETORES VINCULADOS A CENTROS DE CUSTO (PROCESSOS DE FABRICAÇÃO)
  async fetchCostSectors(): Promise<CostSector[] | null> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase.from('cost_sectors').select('*').order('code');
      if (!error && data && data.length > 0) {
        const mapped: CostSector[] = data.map((row: any) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          costCenterId: row.cost_center_id,
          active: row.active !== false,
          operationType: row.operation_type || row.operationType || 'Semiautomática',
          standardTimeMinutes: Number(row.standard_time_minutes || row.standardTimeMinutes || 0),
          description: row.description || '',
          createdAt: row.created_at,
        }));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('macarvalho_cost_sectors', JSON.stringify(mapped));
          } catch (e) {
            // ignore
          }
        }
        return mapped;
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_cost_sectors');
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list) && list.length > 0) return list;
        }
      } catch (e) {
        console.warn('Erro ao ler setores do localStorage:', e);
      }
    }

    const defaultManufacturingProcesses: CostSector[] = [
      {
        id: 'proc-fab-001',
        code: '001',
        name: 'Mistura & Homogeneização em Tacho',
        costCenterId: 'proc-cc-001',
        active: true,
        operationType: 'Semiautomática',
        standardTimeMinutes: 45,
        description: 'Mistura e homogeneização das matérias-primas na temperatura controlada',
      },
      {
        id: 'proc-fab-002',
        code: '002',
        name: 'Envase & Fechamento Automático',
        costCenterId: 'proc-cc-002',
        active: true,
        operationType: 'Automatizada',
        standardTimeMinutes: 30,
        description: 'Linha de envase contínuo, selagem térmica e tampamento de embalagens',
      },
      {
        id: 'proc-fab-003',
        code: '003',
        name: 'Rotulagem & Codificação de Lote',
        costCenterId: 'proc-cc-002',
        active: true,
        operationType: 'Automatizada',
        standardTimeMinutes: 20,
        description: 'Aplicação de rótulo adesivo e impressão de data de validade/lote',
      },
      {
        id: 'proc-fab-004',
        code: '004',
        name: 'Inspeção de Qualidade & Embalagem Final',
        costCenterId: 'proc-cc-001',
        active: true,
        operationType: 'Manual',
        standardTimeMinutes: 25,
        description: 'Inspeção visual de conformidade, encaixotamento e paletização',
      },
    ];

    return defaultManufacturingProcesses;
  },

  async saveCostSector(sector: CostSector): Promise<boolean> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_cost_sectors');
        const list: CostSector[] = stored ? JSON.parse(stored) : [];
        const index = list.findIndex((s) => s.id === sector.id);
        if (index >= 0) list[index] = sector; else list.push(sector);
        localStorage.setItem('macarvalho_cost_sectors', JSON.stringify(list));
      } catch (e) {
        console.warn('Erro ao salvar processo de fabricação no localStorage:', e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;

    const { error } = await supabase.from('cost_sectors').upsert({
      id: sector.id,
      code: sector.code,
      name: sector.name,
      cost_center_id: sector.costCenterId,
      active: sector.active,
      operation_type: sector.operationType,
      standard_time_minutes: sector.standardTimeMinutes,
      description: sector.description,
      created_at: sector.createdAt || new Date().toISOString(),
    });

    return !error;
  },

  async deleteCostSector(id: string): Promise<boolean> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_cost_sectors');
        if (stored) {
          const list: CostSector[] = JSON.parse(stored);
          localStorage.setItem('macarvalho_cost_sectors', JSON.stringify(list.filter((s) => s.id !== id)));
        }
      } catch (e) {
        console.warn('Erro ao remover setor do localStorage:', e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;
    const { error } = await supabase.from('cost_sectors').delete().eq('id', id);
    return !error;
  },

  // INDUSTRIAL COSTS: COLABORADORES COM COMPOSIÇÃO DE CUSTO REAL
  async fetchCostEmployees(): Promise<CostEmployee[] | null> {
    let localEmployees: CostEmployee[] | null = null;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_cost_employees');
        if (stored) localEmployees = JSON.parse(stored);
      } catch (e) {
        console.warn('Erro ao carregar colaboradores do localStorage:', e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return localEmployees || [];
    }

    const { data, error } = await supabase.from('cost_employees').select('*').order('name');
    if (error || !data) {
      return localEmployees;
    }

    // Carregar os encargos vinculados da tabela join N:N
    let employeeChargesMap = new Map<string, string[]>();
    try {
      const { data: chargesRel } = await supabase.from('cost_employee_charges').select('employee_id, charge_id');
      if (chargesRel) {
        for (const rel of chargesRel) {
          const existing = employeeChargesMap.get(rel.employee_id) || [];
          existing.push(rel.charge_id);
          employeeChargesMap.set(rel.employee_id, existing);
        }
      }
    } catch {
      // Falha silenciosa se a migration N:N ainda não foi executada
    }

    return (data || []).map((row: any) => {
      const selectedChargeIds = row.selected_charge_ids || employeeChargesMap.get(row.id) || [];
      const chargesDetail = Array.isArray(row.charges_detail) ? row.charges_detail : [];
      const benefitsDetail = Array.isArray(row.benefits_detail) ? row.benefits_detail : [];

      const baseSalary = Number(row.base_salary || 0);
      const additions = Number(row.additions || 0);
      const benefits = Number(row.benefits || 0);
      const chargePercent = Number(row.charge_percent || 0);
      const productiveHours = Number(row.productive_hours || 0);

      const totalChargesAmount = Number(row.total_charges_amount || ((baseSalary + additions) * chargePercent) / 100);
      const totalMonthlyCost = Number(row.total_monthly_cost || (baseSalary + additions + totalChargesAmount + benefits));
      const hourlyCost = Number(row.hourly_cost || (productiveHours > 0 ? totalMonthlyCost / productiveHours : 0));

      return {
        id: row.id,
        code: row.code,
        name: row.name,
        role: row.role || '',
        sector: row.sector || '',
        sectorId: row.sector_id || undefined,
        processId: row.process_id || row.cost_center_id || undefined,
        costCenterId: row.cost_center_id || row.process_id || undefined,
        laborType: row.labor_type,
        baseSalary,
        additions,
        benefits,
        benefitsDetail,
        chargePercent,
        totalChargesAmount,
        totalMonthlyCost,
        chargesDetail,
        selectedChargeIds,
        monthlyHours: Number(row.monthly_hours || 0),
        productiveHours,
        hourlyCost,
        validFrom: row.valid_from || undefined,
        validUntil: row.valid_until || undefined,
        active: row.active !== false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  },

  async saveCostEmployee(employee: CostEmployee): Promise<boolean> {
    // 1. Salvar no localStorage para fallback instantâneo
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_cost_employees');
        const list: CostEmployee[] = stored ? JSON.parse(stored) : [];
        const index = list.findIndex((e) => e.id === employee.id);
        if (index >= 0) list[index] = employee; else list.push(employee);
        localStorage.setItem('macarvalho_cost_employees', JSON.stringify(list));
      } catch (e) {
        console.warn('Erro ao salvar colaborador no localStorage:', e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;

    // 2. Persistência no Supabase
    const payload: Record<string, any> = {
      id: employee.id,
      code: employee.code,
      name: employee.name,
      role: employee.role,
      sector: employee.sector,
      sector_id: employee.sectorId || null,
      process_id: employee.processId || employee.costCenterId || null,
      cost_center_id: employee.costCenterId || employee.processId || null,
      labor_type: employee.laborType,
      base_salary: employee.baseSalary,
      additions: employee.additions || 0,
      benefits: employee.benefits || 0,
      charge_percent: employee.chargePercent || 0,
      total_charges_amount: employee.totalChargesAmount || 0,
      total_monthly_cost: employee.totalMonthlyCost || 0,
      charges_detail: employee.chargesDetail || [],
      benefits_detail: employee.benefitsDetail || [],
      selected_charge_ids: employee.selectedChargeIds || [],
      monthly_hours: employee.monthlyHours || 0,
      productive_hours: employee.productiveHours || 0,
      hourly_cost: employee.hourlyCost || 0,
      valid_from: employee.validFrom || null,
      valid_until: employee.validUntil || null,
      active: employee.active !== false,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('cost_employees').upsert(payload);
    if (error) {
      console.warn('Aviso ao salvar cost_employees (tentando fallback retrocompatível):', error.message);
      // Fallback caso colunas adicionadas ainda não tenham sido migradas
      const simplePayload = {
        id: employee.id,
        code: employee.code,
        name: employee.name,
        role: employee.role,
        sector: employee.sector,
        process_id: employee.processId || employee.costCenterId || null,
        labor_type: employee.laborType,
        base_salary: employee.baseSalary,
        additions: employee.additions || 0,
        benefits: employee.benefits || 0,
        charge_percent: employee.chargePercent || 0,
        monthly_hours: employee.monthlyHours || 0,
        productive_hours: employee.productiveHours || 0,
        hourly_cost: employee.hourlyCost || 0,
        valid_from: employee.validFrom || null,
        valid_until: employee.validUntil || null,
        active: employee.active !== false,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('cost_employees').upsert(simplePayload);
    }

    // 3. Atualizar relacionamento N:N na tabela cost_employee_charges
    try {
      await supabase.from('cost_employee_charges').delete().eq('employee_id', employee.id);
      if (employee.selectedChargeIds && employee.selectedChargeIds.length > 0) {
        const relations = employee.selectedChargeIds.map((chargeId) => ({
          id: `${employee.id}-${chargeId}`,
          employee_id: employee.id,
          charge_id: chargeId,
          created_at: new Date().toISOString(),
        }));
        await supabase.from('cost_employee_charges').insert(relations);
      }
    } catch {
      // Silencioso se tabela ainda não criada
    }

    // 4. Registrar no Histórico de Competência para não sobrescrever histórico de custos
    try {
      await supabase.from('cost_employee_history').insert({
        id: `hist-${employee.id}-${Date.now()}`,
        employee_id: employee.id,
        competence_date: new Date().toISOString().slice(0, 10),
        base_salary: employee.baseSalary,
        benefits: employee.benefits,
        total_charges_amount: employee.totalChargesAmount || 0,
        total_monthly_cost: employee.totalMonthlyCost || 0,
        productive_hours: employee.productiveHours,
        hourly_cost: employee.hourlyCost,
        labor_type: employee.laborType,
        sector_id: employee.sectorId || null,
        process_id: employee.processId || employee.costCenterId || null,
        charges_detail: employee.chargesDetail || [],
        benefits_detail: employee.benefitsDetail || [],
        created_at: new Date().toISOString(),
      });
    } catch {
      // Silencioso se histórico opcional
    }

    return true;
  },

  async deleteCostEmployee(id: string): Promise<boolean> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_cost_employees');
        if (stored) {
          const list: CostEmployee[] = JSON.parse(stored);
          localStorage.setItem('macarvalho_cost_employees', JSON.stringify(list.filter((e) => e.id !== id)));
        }
      } catch (e) {
        console.warn('Erro ao remover colaborador do localStorage:', e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;

    await supabase.from('cost_employee_charges').delete().eq('employee_id', id);
    const { error } = await supabase.from('cost_employees').delete().eq('id', id);
    return !error;
  },

  async fetchCostEmployeeHistory(employeeId?: string): Promise<CostEmployeeHistory[]> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return [];

    let query = supabase.from('cost_employee_history').select('*').order('created_at', { ascending: false });
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      competenceDate: row.competence_date,
      baseSalary: Number(row.base_salary || 0),
      benefits: Number(row.benefits || 0),
      totalChargesAmount: Number(row.total_charges_amount || 0),
      totalMonthlyCost: Number(row.total_monthly_cost || 0),
      productiveHours: Number(row.productive_hours || 0),
      hourlyCost: Number(row.hourly_cost || 0),
      laborType: row.labor_type,
      sectorId: row.sector_id,
      processId: row.process_id,
      chargesDetail: Array.isArray(row.charges_detail) ? row.charges_detail : [],
      benefitsDetail: Array.isArray(row.benefits_detail) ? row.benefits_detail : [],
      createdAt: row.created_at,
    }));
  },

  // INDUSTRIAL COSTS: ENCARGOS TRABALHISTAS & PROVISÕES
  async fetchCostCharges(): Promise<CostCharge[] | null> {
    const defaultCharges: CostCharge[] = [
      { id: 'chg-inss', code: 'INSS', description: 'INSS Patronal (Previdência)', percent: 20.00, chargeType: 'ENCARGO', active: true },
      { id: 'chg-fgts', code: 'FGTS', description: 'FGTS (Fundo de Garantia)', percent: 8.00, chargeType: 'ENCARGO', active: true },
      { id: 'chg-rat', code: 'RAT', description: 'RAT / Riscos Ambientais do Trabalho', percent: 3.00, chargeType: 'ENCARGO', active: true },
      { id: 'chg-saledu', code: 'SAL-EDU', description: 'Salário-Educação', percent: 2.50, chargeType: 'ENCARGO', active: true },
      { id: 'chg-senai', code: 'SENAI', description: 'SENAI (Serviço Nac. Aprendizagem)', percent: 1.00, chargeType: 'ENCARGO', active: true },
      { id: 'chg-sesi', code: 'SESI', description: 'SESI (Serviço Social da Indústria)', percent: 1.50, chargeType: 'ENCARGO', active: true },
      { id: 'chg-sebrae', code: 'SEBRAE', description: 'SEBRAE', percent: 0.60, chargeType: 'ENCARGO', active: true },
      { id: 'chg-incra', code: 'INCRA', description: 'INCRA', percent: 0.20, chargeType: 'ENCARGO', active: true },
      { id: 'chg-13', code: '13-SAL', description: 'Provisão 13º Salário', percent: 8.33, chargeType: 'PROVISAO', active: true },
      { id: 'chg-ferias', code: 'FERIAS', description: 'Provisão Férias Constitucionais', percent: 8.33, chargeType: 'PROVISAO', active: true },
      { id: 'chg-terco-ferias', code: '1/3-FERIAS', description: 'Provisão 1/3 de Férias', percent: 2.78, chargeType: 'PROVISAO', active: true },
    ];

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_cost_charges');
        if (stored) {
          const list: CostCharge[] = JSON.parse(stored);
          if (Array.isArray(list) && list.length > 0) return list;
        }
      } catch (e) {
        console.warn('Erro ao ler encargos do localStorage:', e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return defaultCharges;
    }

    const { data, error } = await supabase.from('cost_charges').select('*').order('code');
    if (error || !data || data.length === 0) {
      return defaultCharges;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      description: row.description,
      percent: Number(row.percent || 0),
      chargeType: row.charge_type,
      validFrom: row.valid_from || undefined,
      validUntil: row.valid_until || undefined,
      active: row.active !== false,
    }));
  },

  async saveCostCharge(charge: CostCharge): Promise<boolean> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_cost_charges');
        const list: CostCharge[] = stored ? JSON.parse(stored) : [];
        const index = list.findIndex((c) => c.id === charge.id);
        if (index >= 0) list[index] = charge; else list.push(charge);
        localStorage.setItem('macarvalho_cost_charges', JSON.stringify(list));
      } catch (e) {
        console.warn('Erro ao salvar encargo no localStorage:', e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;

    const { error } = await supabase.from('cost_charges').upsert({
      id: charge.id,
      code: charge.code,
      description: charge.description,
      percent: charge.percent,
      charge_type: charge.chargeType,
      valid_from: charge.validFrom,
      valid_until: charge.validUntil,
      active: charge.active,
    });
    return !error;
  },

  async deleteCostCharge(id: string): Promise<boolean> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('macarvalho_cost_charges');
        if (stored) {
          const list: CostCharge[] = JSON.parse(stored);
          localStorage.setItem('macarvalho_cost_charges', JSON.stringify(list.filter((c) => c.id !== id)));
        }
      } catch (e) {
        console.warn('Erro ao remover encargo do localStorage:', e);
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return true;
    const { error } = await supabase.from('cost_charges').delete().eq('id', id);
    return !error;
  },

  async fetchCostDrivers(): Promise<CostDriver[] | null> {
    const defaultDrivers: CostDriver[] = [
      { id: 'drv-horas-prod', code: 'DRV-HORAS', description: 'Horas Produtivas das OPs', driverType: 'HORAS_PRODUTIVAS', unit: 'Horas (h)', active: true },
      { id: 'drv-qtd-prod', code: 'DRV-QTD', description: 'Quantidade de Barras Produzidas', driverType: 'QUANTIDADE_PRODUZIDA', unit: 'Barras', active: true },
      { id: 'drv-qtd-ops', code: 'DRV-OPS', description: 'Quantidade de Ordens de Produção', driverType: 'QUANTIDADE_OPS', unit: 'OPs', active: true },
      { id: 'drv-custo-mod', code: 'DRV-MOD', description: 'Proporcional ao Custo de MOD', driverType: 'CUSTO_MOD', unit: 'R$', active: true },
    ];

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return defaultDrivers;

    const { data, error } = await supabase.from('cost_drivers').select('*').order('code');
    if (error || !data || data.length === 0) return defaultDrivers;

    return (data || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      description: row.description,
      driverType: row.driver_type,
      unit: row.unit,
      active: row.active !== false,
    }));
  },

  async saveCostDriver(driver: CostDriver): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;
    const { error } = await supabase.from('cost_drivers').upsert({
      id: driver.id,
      code: driver.code,
      description: driver.description,
      driver_type: driver.driverType,
      unit: driver.unit,
      active: driver.active,
    });
    return !error;
  },

  async fetchIndirectCosts(): Promise<IndirectCost[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return null;
    const { data, error } = await supabase.from('cost_indirect').select('*').order('competence', { ascending: false });
    if (error) return null;
    return (data || []).map((row: any) => ({ id: row.id, code: row.code, description: row.description, category: row.category, processId: row.process_id || undefined, amount: Number(row.amount || 0), competence: row.competence, classification: row.classification, driverId: row.driver_id || undefined, observation: row.observation || '', active: row.active !== false }));
  },

  async saveIndirectCost(cost: IndirectCost): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;
    const { error } = await supabase.from('cost_indirect').upsert({ id: cost.id, code: cost.code, description: cost.description, category: cost.category, process_id: cost.processId, amount: cost.amount, competence: cost.competence, classification: cost.classification, driver_id: cost.driverId, observation: cost.observation, active: cost.active });
    return !error;
  },

  async fetchMaintenance(): Promise<EquipmentMaintenance[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return null;
    const { data, error } = await supabase.from('equipment_maintenance').select('*').order('maintenance_date', { ascending: false });
    if (error) return null;
    return (data || []).map((row: any) => ({ id: row.id, equipmentId: row.equipment_id, processId: row.process_id || undefined, maintenanceType: row.maintenance_type, maintenanceDate: row.maintenance_date, amount: Number(row.amount || 0), supplier: row.supplier || '', observation: row.observation || '' }));
  },

  async saveMaintenance(maintenance: EquipmentMaintenance): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;
    const { error } = await supabase.from('equipment_maintenance').upsert({ id: maintenance.id, equipment_id: maintenance.equipmentId, process_id: maintenance.processId, maintenance_type: maintenance.maintenanceType, maintenance_date: maintenance.maintenanceDate, amount: maintenance.amount, supplier: maintenance.supplier, observation: maintenance.observation });
    return !error;
  },

  async saveCostOperation(operation: CostOperation): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return false;
    const { error } = await supabase.from('cost_op').upsert({ id: operation.id, order_id: operation.orderId, status: operation.status, planned_quantity: operation.plannedQuantity, finished_quantity: operation.finishedQuantity, yield_percent: operation.yieldPercent, loss_quantity: operation.lossQuantity, material_cost: operation.materialCost, direct_labor_cost: operation.directLaborCost, indirect_labor_cost: operation.indirectLaborCost, energy_cost: operation.energyCost, maintenance_cost: operation.maintenanceCost, depreciation_cost: operation.depreciationCost, other_indirect_cost: operation.otherIndirectCost, total_cost: operation.totalCost, unit_cost: operation.unitCost, version: operation.version, recalculation_reason: operation.recalculationReason, calculated_at: operation.calculatedAt, closed_at: operation.closedAt });
    if (error) return false;
    const items = operation.items.map((item) => ({ id: item.id, cost_op_id: operation.id, category: item.category, source_id: item.sourceId, description: item.description, quantity: item.quantity, unit_cost: item.unitCost, amount: item.amount }));
    const steps = operation.steps.map((step) => ({ id: step.id, cost_op_id: operation.id, step_id: step.stepId, duration_hours: step.durationHours, man_hours: step.manHours, labor_cost: step.laborCost, equipment_cost: step.equipmentCost, energy_cost: step.energyCost, maintenance_cost: step.maintenanceCost, depreciation_cost: step.depreciationCost, total_cost: step.totalCost }));
    if (items.length > 0 && !(await supabase.from('cost_op_items').upsert(items)).error) {
      if (steps.length === 0 || !(await supabase.from('cost_op_steps').upsert(steps)).error) return true;
    }
    return items.length === 0 && (steps.length === 0 || !(await supabase.from('cost_op_steps').upsert(steps)).error);
  },

  async createFinishedProductEntryIfMissing(order: ProductionOrder, product: Product, quantity: number, unitCost: number): Promise<{ success: boolean; created: boolean }> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured() || quantity <= 0) return { success: false, created: false };
    const existing = await supabase.from('stock_movements').select('id').eq('production_order_id', order.id).eq('source_type', 'finished_product').limit(1);
    if (existing.error) return { success: false, created: false };
    if ((existing.data || []).length > 0) return { success: true, created: false };
    const updatedProduct = { ...product, stock: product.stock + quantity };
    const savedProduct = await this.saveProduct(updatedProduct);
    if (!savedProduct) return { success: false, created: false };
    const { error } = await supabase.from('stock_movements').insert({
      id: `finished-${order.id}`,
      type: 'entrada',
      title: `Entrada produto acabado ${order.opNumber}`,
      item_name: product.name,
      item_code: product.code,
      product_id: product.id,
      production_order_id: order.id,
      source_type: 'finished_product',
      source_id: order.id,
      quantity,
      unit: product.unit,
      unit_cost: unitCost,
      total_cost: quantity * unitCost,
      timestamp: new Date().toISOString(),
    });
    if (error) {
      await this.saveProduct(product);
    }
    return { success: !error, created: !error };
  },
};
