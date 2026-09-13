'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Plus,
  Users,
  Briefcase,
  Layers,
  Building2,
  Clock,
  TrendingUp,
  CheckCircle2,
  History,
  AlertCircle,
  Trash2,
  Edit2,
  ChevronRight,
  Info,
  DollarSign,
  PieChart,
  ShieldCheck,
  CheckSquare,
  Square,
  Search,
  Filter,
} from 'lucide-react';
import { dbService } from '@/lib/db-service';
import {
  calculateEmployeeCostDetails,
  calculateEmployeeHourlyCost,
  calculateProductionOrderCost,
  formatCurrency,
  formatNumber,
} from '@/lib/industrial-costs';
import {
  CostCharge,
  CostDriverType,
  CostEmployee,
  CostEmployeeHistory,
  CostOperation,
  CostSector,
  Equipment,
  EquipmentMaintenance,
  IndirectCost,
  InventoryItem,
  ProcessStepItem,
  Product,
  ProductionEntry,
  ProductionMaterialSeparation,
  ProductionOrder,
  ProductionProcess,
} from '@/lib/types';

interface IndustrialCostsViewProps {
  products: Product[];
  orders: ProductionOrder[];
  entries: ProductionEntry[];
  steps: ProcessStepItem[];
  separations: ProductionMaterialSeparation[];
  inventory: InventoryItem[];
  equipment: Equipment[];
  processes: ProductionProcess[];
  onCloseOrder?: (order: ProductionOrder, operation: CostOperation) => void;
  onNotify?: (message: string) => void;
}

type Tab =
  | 'apuracao'
  | 'ops'
  | 'colaboradores'
  | 'setores'
  | 'encargos'
  | 'equipamentos'
  | 'depreciacao'
  | 'manutencao'
  | 'indiretos';

const tabs: [Tab, string, string][] = [
  ['apuracao', 'Apuração Integrada', 'MOD direta, MOI rateada e Custo por Barra'],
  ['colaboradores', 'Colaboradores', 'MOD/MOI, Setor -> Centro de Custo e Encargos'],
  ['setores', 'Setores', 'Vínculo de Setor a Centro de Custo'],
  ['encargos', 'Encargos & Provisões', 'Tabela oficial de encargos e provisões CLT'],
  ['ops', 'Ordens de Produção', 'Seleção de OPs para custeio'],
  ['equipamentos', 'Equipamentos', 'Máquinas e potência'],
  ['depreciacao', 'Depreciação', 'Vida útil e taxa de depreciação'],
  ['manutencao', 'Manutenção', 'Preventiva e corretiva'],
  ['indiretos', 'Custos Indiretos (CIF)', 'Outros custos de infraestrutura e fábrica'],
];

const inputClass =
  'w-full rounded-xl border border-[#dec1af] bg-white px-3 py-2 text-xs text-[#1a1c1b] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#954a00]/30 transition-all';
const labelClass = 'block text-xs font-bold text-[#574335] mb-1';

export const IndustrialCostsView: React.FC<IndustrialCostsViewProps> = ({
  orders,
  entries,
  steps,
  separations,
  inventory,
  equipment,
  processes,
  onCloseOrder,
  onNotify,
}) => {
  const [tab, setTab] = useState<Tab>('apuracao');
  const [orderId, setOrderId] = useState(orders[0]?.id || '');
  const [operation, setOperation] = useState<CostOperation | null>(null);
  const [moiDriver, setMoiDriver] = useState<CostDriverType>('HORAS_PRODUTIVAS');

  // Dados carregados
  const [employees, setEmployees] = useState<CostEmployee[]>([]);
  const [charges, setCharges] = useState<CostCharge[]>([]);
  const [sectors, setSectors] = useState<CostSector[]>([]);
  const [indirectCosts, setIndirectCosts] = useState<IndirectCost[]>([]);
  const [maintenance, setMaintenance] = useState<EquipmentMaintenance[]>([]);
  const [historyList, setHistoryList] = useState<CostEmployeeHistory[]>([]);
  const [historyModalEmployee, setHistoryModalEmployee] = useState<CostEmployee | null>(null);

  // Filtro na listagem de colaboradores
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<'ALL' | 'DIRETA' | 'INDIRETA'>('ALL');

  // Estado do formulário de colaborador
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState({
    code: '',
    name: '',
    role: '',
    sectorId: '',
    laborType: 'DIRETA' as CostEmployee['laborType'],
    baseSalary: '3000',
    additions: '0',
    benefits: '450',
    productiveHours: '176',
    monthlyHours: '220',
    validFrom: new Date().toISOString().slice(0, 10),
    selectedChargeIds: [] as string[],
  });

  // Estado do formulário de setor
  const [sectorForm, setSectorForm] = useState({
    code: '',
    name: '',
    costCenterId: processes[0]?.id || '',
  });

  // Estado do formulário de encargo
  const [chargeForm, setChargeForm] = useState({
    code: '',
    description: '',
    percent: '8.00',
    chargeType: 'ENCARGO' as CostCharge['chargeType'],
  });

  // Estado do formulário de indiretos
  const [indirect, setIndirect] = useState({
    code: '',
    description: '',
    category: 'Energia Elétrica Industrial',
    amount: '1500',
    competence: new Date().toISOString().slice(0, 10),
  });

  // Estado do formulário de manutenção
  const [maintenanceForm, setMaintenanceForm] = useState({
    equipmentId: equipment[0]?.id || '',
    amount: '0',
    date: new Date().toISOString().slice(0, 10),
    type: 'Preventiva',
  });

  // Carregar dados iniciais do Supabase / DB
  useEffect(() => {
    Promise.all([
      dbService.fetchCostEmployees(),
      dbService.fetchCostCharges(),
      dbService.fetchCostSectors(),
      dbService.fetchIndirectCosts(),
      dbService.fetchMaintenance(),
    ]).then(([loadedEmployees, loadedCharges, loadedSectors, loadedIndirect, loadedMaintenance]) => {
      if (loadedEmployees) setEmployees(loadedEmployees);
      if (loadedCharges) {
        setCharges(loadedCharges);
        // Preselecionar encargos padrão se form estiver vazio
        if (empForm.selectedChargeIds.length === 0 && loadedCharges.length > 0) {
          setEmpForm((prev) => ({
            ...prev,
            selectedChargeIds: loadedCharges.map((c) => c.id),
          }));
        }
      }
      if (loadedSectors) {
        setSectors(loadedSectors);
        if (!empForm.sectorId && loadedSectors.length > 0) {
          setEmpForm((prev) => ({ ...prev, sectorId: loadedSectors[0].id }));
        }
      }
      if (loadedIndirect) setIndirectCosts(loadedIndirect);
      if (loadedMaintenance) setMaintenance(loadedMaintenance);
    });
  }, []);

  // Setor atual selecionado no formulário
  const selectedSector = useMemo(() => {
    return sectors.find((s) => s.id === empForm.sectorId) || sectors[0];
  }, [sectors, empForm.sectorId]);

  // Centro de custo vinculado ao setor selecionado
  const boundCostCenter = useMemo(() => {
    if (!selectedSector) return null;
    return processes.find((p) => p.id === selectedSector.costCenterId);
  }, [selectedSector, processes]);

  // Cálculo da composição de custo em tempo real do formulário de colaborador
  const liveCostDetails = useMemo(() => {
    const tempEmployee: Partial<CostEmployee> = {
      baseSalary: Number(empForm.baseSalary) || 0,
      additions: Number(empForm.additions) || 0,
      benefits: Number(empForm.benefits) || 0,
      productiveHours: Number(empForm.productiveHours) || 0,
      selectedChargeIds: empForm.selectedChargeIds,
    };
    return calculateEmployeeCostDetails(tempEmployee, charges);
  }, [empForm.baseSalary, empForm.additions, empForm.benefits, empForm.productiveHours, empForm.selectedChargeIds, charges]);

  // Executar apuração da OP selecionada
  const calculate = () => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
      onNotify?.('Selecione uma ordem de produção para apurar o custo.');
      return;
    }

    const result = calculateProductionOrderCost({
      order,
      orders,
      entries,
      steps,
      separations,
      inventory,
      employees,
      equipment,
      processes,
      charges,
      indirectCosts,
      maintenance,
      moiDriver,
    });

    setOperation(result);
    dbService
      .saveCostOperation(result)
      .then((saved) =>
        onNotify?.(
          saved
            ? `Custo da OP ${order.opNumber} apurado com sucesso (MOD + MOI rateada).`
            : 'Apuração realizada. Não foi possível persistir no Supabase.'
        )
      );
  };

  // Salvar / Atualizar Colaborador
  const handleSaveEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!empForm.name.trim()) {
      onNotify?.('Informe o nome do colaborador.');
      return;
    }

    const targetSector = sectors.find((s) => s.id === empForm.sectorId);
    const targetProcess = processes.find((p) => p.id === targetSector?.costCenterId);

    const baseSalary = Math.max(0, Number(empForm.baseSalary) || 0);
    const additions = Math.max(0, Number(empForm.additions) || 0);
    const benefits = Math.max(0, Number(empForm.benefits) || 0);
    const productiveHours = Math.max(0, Number(empForm.productiveHours) || 0);
    const monthlyHours = Math.max(0, Number(empForm.monthlyHours) || 0);

    const employeeItem: CostEmployee = {
      id: editingEmployeeId || `employee-${Date.now()}`,
      code: empForm.code || `COL-${String(employees.length + 1).padStart(3, '0')}`,
      name: empForm.name,
      role: empForm.role,
      sector: targetSector?.name || 'Produção',
      sectorId: targetSector?.id,
      processId: targetProcess?.id,
      costCenterId: targetProcess?.id,
      costCenterCode: targetProcess?.code,
      laborType: empForm.laborType,
      baseSalary,
      additions,
      benefits,
      chargePercent: liveCostDetails.chargePercent,
      totalChargesAmount: liveCostDetails.totalChargesAmount,
      totalMonthlyCost: liveCostDetails.totalMonthlyCost,
      chargesDetail: liveCostDetails.chargesDetail,
      selectedChargeIds: empForm.selectedChargeIds,
      monthlyHours,
      productiveHours,
      hourlyCost: liveCostDetails.hourlyCost,
      validFrom: empForm.validFrom,
      active: true,
    };

    const saved = await dbService.saveCostEmployee(employeeItem);
    if (saved) {
      setEmployees((current) => {
        const index = current.findIndex((e) => e.id === employeeItem.id);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = employeeItem;
          return updated;
        }
        return [employeeItem, ...current];
      });

      onNotify?.(
        editingEmployeeId
          ? `Colaborador ${employeeItem.name} atualizado com sucesso.`
          : `Colaborador ${employeeItem.name} cadastrado com sucesso.`
      );

      // Reset form
      setEditingEmployeeId(null);
      setEmpForm({
        code: '',
        name: '',
        role: '',
        sectorId: sectors[0]?.id || '',
        laborType: 'DIRETA',
        baseSalary: '3000',
        additions: '0',
        benefits: '450',
        productiveHours: '176',
        monthlyHours: '220',
        validFrom: new Date().toISOString().slice(0, 10),
        selectedChargeIds: charges.map((c) => c.id),
      });
    } else {
      onNotify?.('Erro ao salvar colaborador no banco.');
    }
  };

  // Carregar colaborador para edição
  const handleEditEmployee = (emp: CostEmployee) => {
    setEditingEmployeeId(emp.id);
    setEmpForm({
      code: emp.code,
      name: emp.name,
      role: emp.role,
      sectorId: emp.sectorId || sectors.find((s) => s.name === emp.sector)?.id || sectors[0]?.id || '',
      laborType: emp.laborType,
      baseSalary: String(emp.baseSalary),
      additions: String(emp.additions || 0),
      benefits: String(emp.benefits || 0),
      productiveHours: String(emp.productiveHours || 176),
      monthlyHours: String(emp.monthlyHours || 220),
      validFrom: emp.validFrom || new Date().toISOString().slice(0, 10),
      selectedChargeIds: emp.selectedChargeIds || emp.chargesDetail?.map((c) => c.chargeId) || charges.map((c) => c.id),
    });
    setTab('colaboradores');
  };

  // Excluir colaborador
  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o colaborador ${name}?`)) return;
    const deleted = await dbService.deleteCostEmployee(id);
    if (deleted) {
      setEmployees((current) => current.filter((e) => e.id !== id));
      onNotify?.(`Colaborador ${name} removido.`);
    }
  };

  // Abrir histórico de competências do colaborador
  const handleOpenHistory = async (emp: CostEmployee) => {
    setHistoryModalEmployee(emp);
    const records = await dbService.fetchCostEmployeeHistory(emp.id);
    setHistoryList(records);
  };

  // Salvar Setor
  const handleSaveSector = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sectorForm.name.trim()) {
      onNotify?.('Informe o nome do setor.');
      return;
    }
    const newSector: CostSector = {
      id: `sec-${Date.now()}`,
      code: sectorForm.code || `SET-${String(sectors.length + 1).padStart(3, '0')}`,
      name: sectorForm.name,
      costCenterId: sectorForm.costCenterId || processes[0]?.id || 'cc-geral',
      active: true,
    };
    const saved = await dbService.saveCostSector(newSector);
    if (saved) {
      setSectors((current) => [...current, newSector]);
      setSectorForm({ code: '', name: '', costCenterId: processes[0]?.id || '' });
      onNotify?.(`Setor "${newSector.name}" cadastrado e vinculado ao Centro de Custo.`);
    }
  };

  // Excluir Setor
  const handleDeleteSector = async (id: string, name: string) => {
    if (!confirm(`Deseja remover o setor "${name}"?`)) return;
    const deleted = await dbService.deleteCostSector(id);
    if (deleted) {
      setSectors((current) => current.filter((s) => s.id !== id));
      onNotify?.(`Setor "${name}" removido.`);
    }
  };

  // Salvar Encargo
  const handleSaveCharge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chargeForm.description.trim()) {
      onNotify?.('Informe a descrição do encargo.');
      return;
    }
    const newCharge: CostCharge = {
      id: `charge-${Date.now()}`,
      code: chargeForm.code || `CHG-${String(charges.length + 1).padStart(3, '0')}`,
      description: chargeForm.description,
      percent: Number(chargeForm.percent) || 0,
      chargeType: chargeForm.chargeType,
      active: true,
    };
    const saved = await dbService.saveCostCharge(newCharge);
    if (saved) {
      setCharges((current) => [...current, newCharge]);
      setChargeForm({ code: '', description: '', percent: '8.00', chargeType: 'ENCARGO' });
      onNotify?.(`Encargo "${newCharge.description}" cadastrado.`);
    }
  };

  // Excluir Encargo
  const handleDeleteCharge = async (id: string, desc: string) => {
    if (!confirm(`Deseja remover o encargo "${desc}"?`)) return;
    const deleted = await dbService.deleteCostCharge(id);
    if (deleted) {
      setCharges((current) => current.filter((c) => c.id !== id));
      setEmpForm((prev) => ({
        ...prev,
        selectedChargeIds: prev.selectedChargeIds.filter((cid) => cid !== id),
      }));
      onNotify?.(`Encargo "${desc}" removido.`);
    }
  };

  // Toggle de encargo individual no formulário de colaborador
  const toggleChargeSelection = (chargeId: string) => {
    setEmpForm((prev) => {
      const exists = prev.selectedChargeIds.includes(chargeId);
      const updated = exists
        ? prev.selectedChargeIds.filter((id) => id !== chargeId)
        : [...prev.selectedChargeIds, chargeId];
      return { ...prev, selectedChargeIds: updated };
    });
  };

  // Selecionar todos os encargos
  const handleSelectAllCharges = () => {
    setEmpForm((prev) => ({
      ...prev,
      selectedChargeIds: charges.map((c) => c.id),
    }));
  };

  // Limpar seleção de encargos
  const handleClearCharges = () => {
    setEmpForm((prev) => ({ ...prev, selectedChargeIds: [] }));
  };

  // Salvar Custo Indireto
  const saveIndirect = async (event: React.FormEvent) => {
    event.preventDefault();
    const item: IndirectCost = {
      id: `indirect-${Date.now()}`,
      code: indirect.code || `CIF-${String(indirectCosts.length + 1).padStart(3, '0')}`,
      description: indirect.description,
      category: indirect.category,
      amount: Number(indirect.amount) || 0,
      competence: indirect.competence,
      classification: 'FIXO',
      observation: '',
      active: true,
    };
    if (await dbService.saveIndirectCost(item)) {
      setIndirectCosts((current) => [item, ...current]);
      onNotify?.('Custo indireto cadastrado.');
    }
  };

  // Salvar Manutenção
  const saveMaintenance = async (event: React.FormEvent) => {
    event.preventDefault();
    const item: EquipmentMaintenance = {
      id: `maintenance-${Date.now()}`,
      equipmentId: maintenanceForm.equipmentId,
      maintenanceType: maintenanceForm.type,
      maintenanceDate: maintenanceForm.date,
      amount: Number(maintenanceForm.amount) || 0,
      supplier: '',
      observation: '',
    };
    if (await dbService.saveMaintenance(item)) {
      setMaintenance((current) => [item, ...current]);
      onNotify?.('Manutenção cadastrada.');
    }
  };

  // Colaboradores filtrados
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        !employeeSearch ||
        emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.code.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.role.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.sector.toLowerCase().includes(employeeSearch.toLowerCase());

      const matchType =
        employeeTypeFilter === 'ALL' || emp.laborType === employeeTypeFilter;

      return matchSearch && matchType;
    });
  }, [employees, employeeSearch, employeeTypeFilter]);

  const selectedOrder = orders.find((item) => item.id === orderId);

  return (
    <div id="industrial-costs-container" className="space-y-6 pb-16 animate-fadeIn">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dec1af]/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#954a00]/10 text-[#954a00]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Módulo Fabril Integrado
            </span>
            <span className="text-xs text-[#574335]/70 font-medium">ERP MaCarvalho</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1a1c1b] mt-1">
            Custos Industriais & Mão de Obra
          </h1>
          <p className="text-sm text-[#574335] mt-1 max-w-2xl">
            Apuração contábil e gerencial de <strong>MOD</strong> (por apontamento de horas) e <strong>MOI</strong> (acumulada por Centro de Custo e rateada por direcionador), com composição salarial auditável.
          </p>
        </div>

        {/* Resumo Rápido de Mão de Obra */}
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2.5 rounded-xl border border-[#dec1af] shadow-xs">
            <span className="block text-[10px] uppercase tracking-wider font-bold text-[#574335]">
              MOD Cadastrados
            </span>
            <span className="text-lg font-black text-emerald-700">
              {employees.filter((e) => e.laborType === 'DIRETA' && e.active !== false).length}
            </span>
          </div>
          <div className="bg-white px-4 py-2.5 rounded-xl border border-[#dec1af] shadow-xs">
            <span className="block text-[10px] uppercase tracking-wider font-bold text-[#574335]">
              MOI Cadastrados
            </span>
            <span className="text-lg font-black text-amber-700">
              {employees.filter((e) => e.laborType === 'INDIRETA' && e.active !== false).length}
            </span>
          </div>
          <div className="bg-white px-4 py-2.5 rounded-xl border border-[#dec1af] shadow-xs">
            <span className="block text-[10px] uppercase tracking-wider font-bold text-[#574335]">
              Centros de Custo
            </span>
            <span className="text-lg font-black text-[#954a00]">
              {processes.length || sectors.length}
            </span>
          </div>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="flex flex-wrap gap-2 border-b border-[#dec1af]/50 pb-3">
        {tabs.map(([id, label]) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              id={`tab-btn-${id}`}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-[#954a00] text-white shadow-sm'
                  : 'bg-white text-[#574335] border border-[#dec1af] hover:bg-[#dec1af]/20'
              }`}
            >
              {id === 'colaboradores' && <Users className="w-3.5 h-3.5" />}
              {id === 'setores' && <Layers className="w-3.5 h-3.5" />}
              {id === 'encargos' && <DollarSign className="w-3.5 h-3.5" />}
              {id === 'apuracao' && <Calculator className="w-3.5 h-3.5" />}
              {id === 'ops' && <Clock className="w-3.5 h-3.5" />}
              {label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* ABA: APURAÇÃO INTEGRADA (MOD DIRETA vs MOI RATEADA & CUSTO POR BARRA) */}
      {/* ========================================================================= */}
      {tab === 'apuracao' && (
        <section id="section-apuracao" className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#dec1af]/30 pb-5">
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold tracking-wider text-[#954a00]">
                  Etapa de Custeio
                </span>
                <h2 className="text-xl font-black text-[#1a1c1b]">
                  Apuração de Custo por Ordem de Produção
                </h2>
                <p className="text-xs text-[#574335]">
                  MOD apurada estritamente pelas horas apontadas nos processos/etapas. MOI acumulada por Centro de Custo e rateada pelo direcionador.
                </p>
              </div>

              {/* Controles de Apuração */}
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className={labelClass}>Ordem de Produção (OP)</label>
                  <select
                    id="select-op-apuracao"
                    value={orderId}
                    onChange={(event) => setOrderId(event.target.value)}
                    className={`${inputClass} min-w-[280px]`}
                  >
                    <option value="">Selecione uma OP...</option>
                    {orders.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.opNumber} - {item.productName} ({item.quantity} barras)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Direcionador de Rateio de MOI</label>
                  <select
                    id="select-driver-moi"
                    value={moiDriver}
                    onChange={(event) => setMoiDriver(event.target.value as CostDriverType)}
                    className={`${inputClass} min-w-[220px]`}
                  >
                    <option value="HORAS_PRODUTIVAS">Horas Produtivas da OP (h) [Padrão]</option>
                    <option value="QUANTIDADE_PRODUZIDA">Quantidade de Barras Produzidas</option>
                    <option value="QUANTIDADE_OPS">Quantidade de OPs do Período</option>
                  </select>
                </div>

                <button
                  id="btn-apurar-custo"
                  onClick={calculate}
                  disabled={!selectedOrder}
                  className="px-5 py-2.5 bg-[#954a00] hover:bg-[#7a3c00] text-white rounded-xl text-xs font-bold disabled:bg-stone-300 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Calculator className="w-4 h-4" />
                  Apurar Custo Industrial
                </button>
              </div>
            </div>

            {/* Resultado da Apuração */}
            {operation && (
              <div className="space-y-6 animate-fadeIn">
                {/* Indicador Gerencial Principal: Mão de Obra por Barra */}
                <div className="bg-gradient-to-r from-[#dec1af]/20 via-[#f4f3f1] to-white p-5 rounded-2xl border border-[#dec1af]">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-bold text-[#954a00]">
                        Indicador Gerencial Médio
                      </span>
                      <h3 className="text-lg font-black text-[#1a1c1b]">
                        Custo de Mão de Obra por Barra Produzida
                      </h3>
                      <p className="text-xs text-[#574335]">
                        Baseado em <strong>{operation.goodBarsQuantity || operation.finishedQuantity}</strong> barras boas embaladas na OP {selectedOrder?.opNumber}.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="bg-white px-4 py-3 rounded-xl border border-emerald-300 shadow-xs">
                        <span className="block text-[10px] uppercase font-bold text-emerald-800">
                          MOD Direta / Barra
                        </span>
                        <span className="text-lg font-black text-emerald-700">
                          {formatCurrency(operation.modPerBar ?? (operation.directLaborCost / (operation.goodBarsQuantity || 1)))}
                        </span>
                      </div>

                      <div className="bg-white px-4 py-3 rounded-xl border border-amber-300 shadow-xs">
                        <span className="block text-[10px] uppercase font-bold text-amber-800">
                          MOI Rateada / Barra
                        </span>
                        <span className="text-lg font-black text-amber-700">
                          {formatCurrency(operation.moiPerBar ?? (operation.indirectLaborCost / (operation.goodBarsQuantity || 1)))}
                        </span>
                      </div>

                      <div className="bg-[#954a00] text-white px-5 py-3 rounded-xl shadow-xs">
                        <span className="block text-[10px] uppercase font-bold text-amber-200">
                          Total Mão de Obra / Barra
                        </span>
                        <span className="text-xl font-black">
                          {formatCurrency(operation.totalLaborPerBar ?? ((operation.directLaborCost + operation.indirectLaborCost) / (operation.goodBarsQuantity || 1)))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grade de Elementos de Custo Industrial */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#574335] mb-3">
                    Composição Contábil do Custo Industrial Total
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                    <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#e9e8e6]">
                      <span className="block text-[11px] font-bold text-[#574335]">Insumos / Materiais</span>
                      <strong className="text-lg font-black text-[#1a1c1b]">
                        {formatCurrency(operation.materialCost)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-emerald-50/80 p-3.5 border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <span className="block text-[11px] font-bold text-emerald-900">MOD (Direta)</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-800">
                          Horas OP
                        </span>
                      </div>
                      <strong className="text-lg font-black text-emerald-700">
                        {formatCurrency(operation.directLaborCost)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-amber-50/80 p-3.5 border border-amber-200">
                      <div className="flex items-center justify-between">
                        <span className="block text-[11px] font-bold text-amber-900">MOI (Rateada)</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-800">
                          Rateio CC
                        </span>
                      </div>
                      <strong className="text-lg font-black text-amber-700">
                        {formatCurrency(operation.indirectLaborCost)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#e9e8e6]">
                      <span className="block text-[11px] font-bold text-[#574335]">Energia & Utilidades</span>
                      <strong className="text-lg font-black text-[#1a1c1b]">
                        {formatCurrency(operation.energyCost)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#e9e8e6]">
                      <span className="block text-[11px] font-bold text-[#574335]">Manutenção de Máquinas</span>
                      <strong className="text-lg font-black text-[#1a1c1b]">
                        {formatCurrency(operation.maintenanceCost)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#e9e8e6]">
                      <span className="block text-[11px] font-bold text-[#574335]">Depreciação</span>
                      <strong className="text-lg font-black text-[#1a1c1b]">
                        {formatCurrency(operation.depreciationCost)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#e9e8e6]">
                      <span className="block text-[11px] font-bold text-[#574335]">Outros Custos Indiretos</span>
                      <strong className="text-lg font-black text-[#1a1c1b]">
                        {formatCurrency(operation.otherIndirectCost)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-[#954a00]/10 p-3.5 border border-[#954a00]/30">
                      <span className="block text-[11px] font-bold text-[#954a00]">Custo Industrial Total</span>
                      <strong className="text-xl font-black text-[#954a00]">
                        {formatCurrency(operation.totalCost)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-stone-900 text-white p-3.5 border border-stone-800">
                      <span className="block text-[11px] font-bold text-stone-300">Custo Total / Barra</span>
                      <strong className="text-xl font-black text-amber-400">
                        {formatCurrency(operation.unitCost)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Detalhe de Rateio de MOI por Centro de Custo */}
                {operation.moiAllocations && operation.moiAllocations.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-amber-700" />
                        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                          Detalhamento do Rateio de Mão de Obra Indireta (MOI)
                        </h4>
                      </div>
                      <span className="text-[11px] text-amber-800 font-medium">
                        Direcionador aplicado: <strong>{moiDriver}</strong>
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-amber-200/80 text-amber-900 font-bold">
                            <th className="py-2 text-left">Centro de Custo</th>
                            <th className="py-2 text-right">Custo Mensal MOI</th>
                            <th className="py-2 text-right">Volume Total Direcionador</th>
                            <th className="py-2 text-right">Taxa por Unidade</th>
                            <th className="py-2 text-right">Volume desta OP</th>
                            <th className="py-2 text-right">MOI Alocada à OP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {operation.moiAllocations.map((alloc, idx) => (
                            <tr key={idx} className="border-b border-amber-100 last:border-0">
                              <td className="py-2 font-medium text-[#1a1c1b]">
                                {alloc.costCenterCode} - {alloc.costCenterName}
                              </td>
                              <td className="py-2 text-right text-[#574335]">
                                {formatCurrency(alloc.totalMoiCost)}
                              </td>
                              <td className="py-2 text-right text-[#574335]">
                                {formatNumber(alloc.totalDriverVolume)} {alloc.driverUnit}
                              </td>
                              <td className="py-2 text-right text-[#574335]">
                                {formatCurrency(alloc.ratePerUnit)} / un
                              </td>
                              <td className="py-2 text-right font-semibold text-[#1a1c1b]">
                                {formatNumber(alloc.opDriverVolume)}
                              </td>
                              <td className="py-2 text-right font-black text-amber-800">
                                {formatCurrency(alloc.allocatedAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Detalhamento de MOD por Etapa / Processo */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#574335]">
                      Detalhamento de MOD Direta e Máquinas por Etapa do Roteiro
                    </h4>
                    <span className="text-xs text-[#574335]">
                      {operation.steps.length} etapas apuradas
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#e9e8e6]">
                    <table className="w-full text-xs">
                      <thead className="bg-[#f4f3f1] text-[#574335]">
                        <tr>
                          <th className="p-3 text-left">Etapa / Processo</th>
                          <th className="p-3 text-right">Duração (h)</th>
                          <th className="p-3 text-right">Homem-Hora</th>
                          <th className="p-3 text-right text-emerald-800">MOD Direta</th>
                          <th className="p-3 text-right">Energia</th>
                          <th className="p-3 text-right">Equipamento</th>
                          <th className="p-3 text-right font-bold">Total da Etapa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operation.steps.map((item) => {
                          const stepObj = steps.find((s) => s.id === item.stepId);
                          return (
                            <tr key={item.id} className="border-b border-[#e9e8e6] hover:bg-stone-50">
                              <td className="p-3 font-medium text-[#1a1c1b]">
                                {stepObj?.title || item.stepId}
                                {stepObj?.costCenterCode && (
                                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                                    {stepObj.costCenterCode}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">{item.durationHours.toFixed(2)} h</td>
                              <td className="p-3 text-right">{item.manHours.toFixed(2)} h</td>
                              <td className="p-3 text-right font-semibold text-emerald-700">
                                {formatCurrency(item.laborCost)}
                              </td>
                              <td className="p-3 text-right">{formatCurrency(item.energyCost)}</td>
                              <td className="p-3 text-right">{formatCurrency(item.equipmentCost)}</td>
                              <td className="p-3 text-right font-black text-[#1a1c1b]">
                                {formatCurrency(item.totalCost)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Botão de Fechamento de OP e Envio para Estoque */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() =>
                      selectedOrder &&
                      onCloseOrder?.(selectedOrder, {
                        ...operation,
                        status: 'FECHADO',
                        closedAt: new Date().toISOString(),
                      })
                    }
                    disabled={!selectedOrder || operation.finishedQuantity <= 0}
                    className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold disabled:bg-stone-300 shadow-sm transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Encerrar OP e Registrar Custo Histórico
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ABA: COLABORADORES (MOD / MOI, SETOR -> CENTRO DE CUSTO, ENCARGOS REAIS) */}
      {/* ========================================================================= */}
      {tab === 'colaboradores' && (
        <section id="section-colaboradores" className="space-y-6">
          {/* Formulário de Cadastro / Edição de Colaborador */}
          <div className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#dec1af]/30 pb-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#954a00]">
                  {editingEmployeeId ? 'Edição de Colaborador' : 'Novo Colaborador'}
                </span>
                <h2 className="text-xl font-black text-[#1a1c1b]">
                  {editingEmployeeId ? `Editando: ${empForm.name}` : 'Cadastro de Mão de Obra Fabril'}
                </h2>
                <p className="text-xs text-[#574335] mt-0.5">
                  Vínculo estrutural <strong>Colaborador → Setor → Centro de Custo</strong> com seleção dinâmica de encargos CLT e apuração exata de custo/hora.
                </p>
              </div>

              {editingEmployeeId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingEmployeeId(null);
                    setEmpForm({
                      code: '',
                      name: '',
                      role: '',
                      sectorId: sectors[0]?.id || '',
                      laborType: 'DIRETA',
                      baseSalary: '3000',
                      additions: '0',
                      benefits: '450',
                      productiveHours: '176',
                      monthlyHours: '220',
                      validFrom: new Date().toISOString().slice(0, 10),
                      selectedChargeIds: charges.map((c) => c.id),
                    });
                  }}
                  className="px-3 py-1.5 text-xs text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg font-medium"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-6">
              {/* Bloco 1: Dados Básicos e Vínculo Setor -> Centro de Custo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Código da Matrícula</label>
                  <input
                    id="input-emp-code"
                    type="text"
                    value={empForm.code}
                    placeholder="Ex: COL-001"
                    onChange={(e) => setEmpForm({ ...empForm, code: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Nome Completo *</label>
                  <input
                    id="input-emp-name"
                    type="text"
                    required
                    value={empForm.name}
                    placeholder="Ex: Carlos Eduardo Silveira"
                    onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Função / Cargo</label>
                  <input
                    id="input-emp-role"
                    type="text"
                    value={empForm.role}
                    placeholder="Ex: Operador de Envase"
                    onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Bloco 2: Setor com Centro de Custo Vinculado & Classificação MOD vs MOI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f4f3f1]/70 p-4 rounded-2xl border border-[#dec1af]/40">
                {/* 1.1 Setor -> Centro de Custo */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#574335] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#954a00]" />
                      Setor do Colaborador
                    </label>
                    <button
                      type="button"
                      onClick={() => setTab('setores')}
                      className="text-[11px] font-bold text-[#954a00] hover:underline"
                    >
                      + Gerenciar Setores
                    </button>
                  </div>

                  <select
                    id="select-emp-sector"
                    value={empForm.sectorId}
                    onChange={(e) => setEmpForm({ ...empForm, sectorId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Selecione um setor...</option>
                    {sectors.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.code} - {sec.name}
                      </option>
                    ))}
                  </select>

                  {/* Badge de Vínculo: Colaborador -> Setor -> Centro de Custo */}
                  <div className="mt-2.5 p-2.5 rounded-xl bg-white border border-[#dec1af] flex items-center gap-2 text-xs">
                    <span className="font-bold text-[#574335]">Vínculo:</span>
                    <span className="px-2 py-0.5 rounded bg-stone-100 font-semibold text-stone-800">
                      {selectedSector?.name || 'Sem Setor'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#dec1af]" />
                    <span className="px-2 py-0.5 rounded bg-amber-100 font-bold text-amber-900 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {boundCostCenter
                        ? `${boundCostCenter.code} - ${boundCostCenter.description}`
                        : 'Centro de Custo Geral'}
                    </span>
                  </div>
                </div>

                {/* 1.3 Tipo de Mão de Obra (MOD vs MOI) */}
                <div>
                  <label className="text-xs font-bold text-[#574335] mb-1 block">
                    Tipo de Mão de Obra
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      id="btn-labor-direta"
                      onClick={() => setEmpForm({ ...empForm, laborType: 'DIRETA' })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        empForm.laborType === 'DIRETA'
                          ? 'border-emerald-500 bg-emerald-50/90 shadow-xs'
                          : 'border-[#dec1af] bg-white hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            empForm.laborType === 'DIRETA' ? 'bg-emerald-600' : 'bg-stone-300'
                          }`}
                        />
                        <strong className="text-xs text-emerald-900">MOD (Direta)</strong>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-1">
                        Custo apurado diretamente pelas horas trabalhadas nas OPs e etapas.
                      </p>
                    </button>

                    <button
                      type="button"
                      id="btn-labor-indireta"
                      onClick={() => setEmpForm({ ...empForm, laborType: 'INDIRETA' })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        empForm.laborType === 'INDIRETA'
                          ? 'border-amber-500 bg-amber-50/90 shadow-xs'
                          : 'border-[#dec1af] bg-white hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            empForm.laborType === 'INDIRETA' ? 'bg-amber-600' : 'bg-stone-300'
                          }`}
                        />
                        <strong className="text-xs text-amber-900">MOI (Indireta)</strong>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-1">
                        Acumulado no Centro de Custo e rateado mensalmente por direcionador.
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bloco 3: 1.2 Seleção Dinâmica de Encargos Trabalhistas & Provisões CLT */}
              <div className="rounded-2xl border border-[#dec1af] bg-white p-5 space-y-4 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#dec1af]/30 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#954a00]" />
                      <h3 className="text-sm font-black text-[#1a1c1b]">
                        Encargos & Provisões Aplicáveis ao Colaborador
                      </h3>
                    </div>
                    <p className="text-xs text-[#574335] mt-0.5">
                      Não é permitido percentual arbitrário solto. Selecione abaixo quais encargos oficiais incidem sobre este colaborador.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllCharges}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
                    >
                      Selecionar Todos
                    </button>
                    <button
                      type="button"
                      onClick={handleClearCharges}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
                    >
                      Limpar
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('encargos')}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#954a00]/10 hover:bg-[#954a00]/20 text-[#954a00]"
                    >
                      Editar Cadastro de Encargos
                    </button>
                  </div>
                </div>

                {/* Grade de Checkboxes de Encargos */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {charges.map((chg) => {
                    const isSelected = empForm.selectedChargeIds.includes(chg.id);
                    return (
                      <button
                        type="button"
                        key={chg.id}
                        id={`charge-toggle-${chg.id}`}
                        onClick={() => toggleChargeSelection(chg.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 ${
                          isSelected
                            ? 'border-[#954a00] bg-[#954a00]/5 text-[#1a1c1b]'
                            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <span className="mt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#954a00]" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-400" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <strong className="text-xs font-bold truncate">{chg.code}</strong>
                            <span className="text-xs font-black text-[#954a00]">
                              {chg.percent.toFixed(2)}%
                            </span>
                          </div>
                          <span className="block text-[11px] text-[#574335] truncate">
                            {chg.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Resumo da Alíquota de Encargos Selecionados */}
                <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-[#f4f3f1] border border-[#dec1af]/50 text-xs">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#954a00]" />
                    <span className="text-[#574335]">
                      Total de Encargos Selecionados: <strong>{empForm.selectedChargeIds.length}</strong> de {charges.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-bold">
                    <span>
                      Alíquota Calculada: <strong className="text-lg text-[#954a00]">{liveCostDetails.chargePercent.toFixed(2)}%</strong>
                    </span>
                    <span>
                      Valor Mensal: <strong className="text-lg text-[#954a00]">{formatCurrency(liveCostDetails.totalChargesAmount)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloco 4: 1.4 Composição do Custo Mensal (Salário, Benefícios, Horas) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Salário Base Mensal (R$)</label>
                  <input
                    id="input-emp-salary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={empForm.baseSalary}
                    onChange={(e) => setEmpForm({ ...empForm, baseSalary: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Adicionais / Insalubridade (R$)</label>
                  <input
                    id="input-emp-additions"
                    type="number"
                    min="0"
                    step="0.01"
                    value={empForm.additions}
                    onChange={(e) => setEmpForm({ ...empForm, additions: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Benefícios Mensais (VR, VT, etc. R$)</label>
                  <input
                    id="input-emp-benefits"
                    type="number"
                    min="0"
                    step="0.01"
                    value={empForm.benefits}
                    onChange={(e) => setEmpForm({ ...empForm, benefits: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Horas Produtivas / Mês (h)</label>
                  <input
                    id="input-emp-hours"
                    type="number"
                    min="1"
                    value={empForm.productiveHours}
                    onChange={(e) => setEmpForm({ ...empForm, productiveHours: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Bloco 5: Exibição Transparente da Composição do Custo Mensal & Custo/Hora */}
              <div className="bg-gradient-to-br from-amber-50/60 to-[#f4f3f1] p-5 rounded-2xl border border-amber-200 shadow-xs">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#954a00] block mb-2">
                  Cálculo Automático da Composição de Custo do Colaborador
                </span>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                    <span className="block text-[10px] text-[#574335] uppercase font-bold">
                      Salário Base
                    </span>
                    <strong className="text-base text-[#1a1c1b]">
                      {formatCurrency(liveCostDetails.baseSalary)}
                    </strong>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                    <span className="block text-[10px] text-[#574335] uppercase font-bold">
                      Encargos ({liveCostDetails.chargePercent.toFixed(2)}%)
                    </span>
                    <strong className="text-base text-amber-800">
                      {formatCurrency(liveCostDetails.totalChargesAmount)}
                    </strong>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                    <span className="block text-[10px] text-[#574335] uppercase font-bold">
                      Benefícios
                    </span>
                    <strong className="text-base text-[#1a1c1b]">
                      {formatCurrency(liveCostDetails.totalBenefits)}
                    </strong>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#954a00] shadow-xs">
                    <span className="block text-[10px] text-[#954a00] uppercase font-bold">
                      Custo Mensal Total
                    </span>
                    <strong className="text-lg text-[#954a00]">
                      {formatCurrency(liveCostDetails.totalMonthlyCost)}
                    </strong>
                  </div>

                  <div className="bg-stone-900 text-white p-3 rounded-xl shadow-xs">
                    <span className="block text-[10px] text-stone-300 uppercase font-bold">
                      Custo Hora (R$/h)
                    </span>
                    <strong className="text-xl text-amber-400">
                      {formatCurrency(liveCostDetails.hourlyCost)}/h
                    </strong>
                  </div>
                </div>
              </div>

              {/* Botão de Gravação */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  id="btn-salvar-colaborador"
                  className="px-6 py-3 bg-[#954a00] hover:bg-[#7a3c00] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {editingEmployeeId ? 'Salvar Alterações do Colaborador' : 'Cadastrar Colaborador'}
                </button>
              </div>
            </form>
          </div>

          {/* Listagem de Colaboradores Cadastrados */}
          <div className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[#1a1c1b]">
                  Colaboradores Cadastrados ({filteredEmployees.length})
                </h3>
                <p className="text-xs text-[#574335]">
                  Gestão contábil e rateio por Setor & Centro de Custo.
                </p>
              </div>

              {/* Barra de Busca e Filtros */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Buscar nome, setor, matrícula..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className={`${inputClass} pl-8 py-1.5 text-xs w-64`}
                  />
                </div>

                <div className="flex items-center bg-[#f4f3f1] p-1 rounded-xl border border-[#dec1af]">
                  <button
                    type="button"
                    onClick={() => setEmployeeTypeFilter('ALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      employeeTypeFilter === 'ALL'
                        ? 'bg-[#954a00] text-white shadow-xs'
                        : 'text-[#574335] hover:text-[#1a1c1b]'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeTypeFilter('DIRETA')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      employeeTypeFilter === 'DIRETA'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-[#574335] hover:text-[#1a1c1b]'
                    }`}
                  >
                    MOD
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeTypeFilter('INDIRETA')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      employeeTypeFilter === 'INDIRETA'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-[#574335] hover:text-[#1a1c1b]'
                    }`}
                  >
                    MOI
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela de Colaboradores */}
            <div className="overflow-x-auto rounded-xl border border-[#dec1af]/60">
              <table className="w-full text-xs">
                <thead className="bg-[#f4f3f1] text-[#574335] font-bold">
                  <tr>
                    <th className="p-3 text-left">Colaborador</th>
                    <th className="p-3 text-left">Setor → Centro de Custo</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-right">Salário Base</th>
                    <th className="p-3 text-right">Encargos (R$)</th>
                    <th className="p-3 text-right">Benefícios</th>
                    <th className="p-3 text-right">Custo Mensal</th>
                    <th className="p-3 text-right">Custo Hora</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-stone-500">
                        Nenhum colaborador encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const empSector = sectors.find((s) => s.id === emp.sectorId || s.name === emp.sector);
                      const empCC = processes.find((p) => p.id === emp.processId || p.id === empSector?.costCenterId);

                      return (
                        <tr key={emp.id} className="border-b border-[#e9e8e6] hover:bg-stone-50/80">
                          <td className="p-3">
                            <strong className="block text-[#1a1c1b]">{emp.name}</strong>
                            <span className="text-[11px] text-[#574335]">
                              {emp.code} • {emp.role || 'Geral'}
                            </span>
                          </td>

                          <td className="p-3">
                            <span className="font-semibold text-stone-800">
                              {empSector?.name || emp.sector || 'Geral'}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-[#954a00] mt-0.5">
                              <Layers className="w-3 h-3" />
                              <span>{empCC?.code ? `${empCC.code} - ${empCC.description}` : 'CC Geral'}</span>
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            {emp.laborType === 'DIRETA' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                MOD (Direta)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                MOI (Indireta)
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right text-[#1a1c1b]">
                            {formatCurrency(emp.baseSalary)}
                          </td>

                          <td className="p-3 text-right text-amber-800 font-medium">
                            {formatCurrency(emp.totalChargesAmount || ((emp.baseSalary + (emp.additions || 0)) * (emp.chargePercent || 0)) / 100)}
                            <span className="block text-[10px] text-stone-500">
                              ({(emp.chargePercent || 0).toFixed(2)}%)
                            </span>
                          </td>

                          <td className="p-3 text-right text-[#574335]">
                            {formatCurrency(emp.benefits || 0)}
                          </td>

                          <td className="p-3 text-right font-bold text-[#1a1c1b]">
                            {formatCurrency(emp.totalMonthlyCost || (emp.baseSalary + (emp.benefits || 0)) * (1 + (emp.chargePercent || 0) / 100))}
                          </td>

                          <td className="p-3 text-right font-black text-[#954a00] text-sm">
                            {formatCurrency(emp.hourlyCost || calculateEmployeeHourlyCost(emp, charges))}/h
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                title="Editar Colaborador"
                                onClick={() => handleEditEmployee(emp)}
                                className="p-1.5 rounded-lg text-stone-600 hover:bg-[#dec1af]/30 hover:text-[#954a00] transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                title="Histórico de Competência"
                                onClick={() => handleOpenHistory(emp)}
                                className="p-1.5 rounded-lg text-stone-600 hover:bg-amber-100 hover:text-amber-800 transition-all"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                title="Excluir Colaborador"
                                onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                className="p-1.5 rounded-lg text-stone-600 hover:bg-red-100 hover:text-red-700 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ABA: SETORES (1.1 Setor -> Centro de Custo) */}
      {/* ========================================================================= */}
      {tab === 'setores' && (
        <section id="section-setores" className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-[#954a00]">
                Estrutura Organizacional
              </span>
              <h2 className="text-xl font-black text-[#1a1c1b]">
                Setores & Centros de Custo Fabris
              </h2>
              <p className="text-xs text-[#574335] mt-0.5">
                Cada colaborador é associado a um Setor, e cada Setor é estritamente vinculado a um Centro de Custo existente do ERP (tabela de processos produtivos).
              </p>
            </div>

            {/* Formulário de Novo Setor */}
            <form onSubmit={handleSaveSector} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#f4f3f1] p-4 rounded-2xl border border-[#dec1af]/40">
              <div>
                <label className={labelClass}>Código do Setor</label>
                <input
                  type="text"
                  placeholder="Ex: SET-EMB"
                  value={sectorForm.code}
                  onChange={(e) => setSectorForm({ ...sectorForm, code: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Nome do Setor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Envase & Embalagem Final"
                  value={sectorForm.name}
                  onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Centro de Custo Vinculado *</label>
                <select
                  required
                  value={sectorForm.costCenterId}
                  onChange={(e) => setSectorForm({ ...sectorForm, costCenterId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Selecione o Centro de Custo...</option>
                  {processes.map((proc) => (
                    <option key={proc.id} value={proc.id}>
                      {proc.code} - {proc.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 bg-[#954a00] hover:bg-[#7a3c00] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Setor
                </button>
              </div>
            </form>

            {/* Listagem de Setores */}
            <div className="overflow-x-auto rounded-xl border border-[#dec1af]/60">
              <table className="w-full text-xs">
                <thead className="bg-[#f4f3f1] text-[#574335] font-bold">
                  <tr>
                    <th className="p-3 text-left">Código</th>
                    <th className="p-3 text-left">Nome do Setor</th>
                    <th className="p-3 text-left">Centro de Custo Vinculado</th>
                    <th className="p-3 text-center">Colaboradores Alocados</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sectors.map((sec) => {
                    const cc = processes.find((p) => p.id === sec.costCenterId);
                    const employeeCount = employees.filter(
                      (e) => e.sectorId === sec.id || e.sector === sec.name
                    ).length;

                    return (
                      <tr key={sec.id} className="border-b border-[#e9e8e6] hover:bg-stone-50">
                        <td className="p-3 font-bold text-[#1a1c1b]">{sec.code}</td>
                        <td className="p-3 font-medium text-[#1a1c1b]">{sec.name}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">
                            <Layers className="w-3 h-3" />
                            {cc ? `${cc.code} - ${cc.description}` : 'CC Geral da Fábrica'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-[#574335]">
                          {employeeCount} colaborador(es)
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            title="Remover Setor"
                            onClick={() => handleDeleteSector(sec.id, sec.name)}
                            className="p-1.5 rounded-lg text-stone-600 hover:bg-red-100 hover:text-red-700 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ABA: ENCARGOS & PROVISÕES (Tabela Oficial) */}
      {/* ========================================================================= */}
      {tab === 'encargos' && (
        <section id="section-encargos" className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-[#954a00]">
                Tributos & Legislação Trabalhista
              </span>
              <h2 className="text-xl font-black text-[#1a1c1b]">
                Cadastro Oficial de Encargos Sociais & Provisões CLT
              </h2>
              <p className="text-xs text-[#574335] mt-0.5">
                Os percentuais definidos aqui alimentam diretamente a seleção no cadastro dos colaboradores, sem digitação manual de percentuais soltos.
              </p>
            </div>

            {/* Formulário de Encargo */}
            <form onSubmit={handleSaveCharge} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-[#f4f3f1] p-4 rounded-2xl border border-[#dec1af]/40">
              <div>
                <label className={labelClass}>Código</label>
                <input
                  type="text"
                  placeholder="Ex: FGTS"
                  value={chargeForm.code}
                  onChange={(e) => setChargeForm({ ...chargeForm, code: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Descrição do Encargo / Provisão *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: FGTS - Fundo de Garantia por Tempo de Serviço"
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Percentual (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={chargeForm.percent}
                  onChange={(e) => setChargeForm({ ...chargeForm, percent: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 bg-[#954a00] hover:bg-[#7a3c00] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Encargo
                </button>
              </div>
            </form>

            {/* Listagem de Encargos */}
            <div className="overflow-x-auto rounded-xl border border-[#dec1af]/60">
              <table className="w-full text-xs">
                <thead className="bg-[#f4f3f1] text-[#574335] font-bold">
                  <tr>
                    <th className="p-3 text-left">Código</th>
                    <th className="p-3 text-left">Descrição</th>
                    <th className="p-3 text-right">Alíquota (%)</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((item) => (
                    <tr key={item.id} className="border-b border-[#e9e8e6] hover:bg-stone-50">
                      <td className="p-3 font-bold text-[#1a1c1b]">{item.code}</td>
                      <td className="p-3 font-medium text-[#1a1c1b]">{item.description}</td>
                      <td className="p-3 text-right font-black text-[#954a00] text-sm">
                        {item.percent.toFixed(2)}%
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                          {item.chargeType || 'ENCARGO'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          title="Remover Encargo"
                          onClick={() => handleDeleteCharge(item.id, item.description)}
                          className="p-1.5 rounded-lg text-stone-600 hover:bg-red-100 hover:text-red-700 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ABA: OPS */}
      {/* ========================================================================= */}
      {tab === 'ops' && (
        <section className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-4">
          <h2 className="font-black text-lg text-[#1a1c1b]">Ordens de Produção para Apuração</h2>
          <div className="space-y-2 mt-4">
            {orders.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-3.5 rounded-xl bg-[#f4f3f1] text-xs border border-[#dec1af]/30"
              >
                <div>
                  <strong className="text-[#1a1c1b] text-sm">{item.opNumber}</strong>
                  <span className="text-[#574335] ml-2">
                    {item.productName} • {item.quantity} barras planejadas • status: {item.status}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setOrderId(item.id);
                    setTab('apuracao');
                  }}
                  className="px-3 py-1.5 bg-[#954a00] text-white rounded-lg font-bold text-xs hover:bg-[#7a3c00] transition-all"
                >
                  APURAR CUSTO
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ABA: EQUIPAMENTOS */}
      {/* ========================================================================= */}
      {tab === 'equipamentos' && (
        <section className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-4">
          <h2 className="font-black text-lg text-[#1a1c1b]">Equipamentos & Máquinas Industriais</h2>
          <div className="space-y-2 mt-4">
            {equipment.map((item) => (
              <div
                key={item.id}
                className="flex justify-between p-3.5 rounded-xl bg-[#f4f3f1] text-xs border border-[#dec1af]/30"
              >
                <div>
                  <strong className="text-[#1a1c1b] text-sm">{item.code} - {item.name}</strong>
                  <span className="text-[#574335] ml-2">{item.description}</span>
                </div>
                <span className="font-semibold text-[#574335]">
                  {item.powerKw || 0} kW • Tarifa: {formatCurrency(item.energyTariff || 0)}/kWh
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ABA: DEPRECIAÇÃO */}
      {/* ========================================================================= */}
      {tab === 'depreciacao' && (
        <section className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-4">
          <h2 className="font-black text-lg text-[#1a1c1b]">Depreciação de Máquinas & Linha</h2>
          <div className="space-y-2 mt-4">
            {equipment.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-[#f4f3f1] text-xs border border-[#dec1af]/30 flex justify-between"
              >
                <strong className="text-[#1a1c1b]">{item.name}</strong>
                <span className="text-[#574335]">
                  Aquisição: {formatCurrency(item.acquisitionCost)} • Residual: {formatCurrency(item.residualValue)} • Vida útil: {item.estimatedUsefulLife} anos
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ABA: MANUTENÇÃO */}
      {/* ========================================================================= */}
      {tab === 'manutencao' && (
        <section className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-4">
          <h2 className="font-black text-lg text-[#1a1c1b]">Manutenção Industrial</h2>
          <form onSubmit={saveMaintenance} className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <select
              className={inputClass}
              value={maintenanceForm.equipmentId}
              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, equipmentId: e.target.value })}
            >
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Tipo"
              value={maintenanceForm.type}
              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={maintenanceForm.date}
              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Valor"
              value={maintenanceForm.amount}
              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, amount: e.target.value })}
              className={inputClass}
            />
            <button className="px-3 py-2 bg-[#954a00] text-white rounded-xl font-bold text-xs">
              <Plus className="w-4 h-4 inline mr-1" />
              Cadastrar
            </button>
          </form>
          <div className="space-y-2 mt-4">
            {maintenance.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-[#f4f3f1] text-xs flex justify-between">
                <span>{item.maintenanceDate} - {item.maintenanceType}</span>
                <strong>{formatCurrency(item.amount)}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ABA: CUSTOS INDIRETOS */}
      {/* ========================================================================= */}
      {tab === 'indiretos' && (
        <section className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-4">
          <h2 className="font-black text-lg text-[#1a1c1b]">Custos Indiretos Gerais de Fabricação (CIF)</h2>
          <form onSubmit={saveIndirect} className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <input
              type="text"
              placeholder="Código"
              value={indirect.code}
              onChange={(e) => setIndirect({ ...indirect, code: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Descrição"
              value={indirect.description}
              onChange={(e) => setIndirect({ ...indirect, description: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Categoria"
              value={indirect.category}
              onChange={(e) => setIndirect({ ...indirect, category: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Valor"
              value={indirect.amount}
              onChange={(e) => setIndirect({ ...indirect, amount: e.target.value })}
              className={inputClass}
            />
            <button className="px-3 py-2 bg-[#954a00] text-white rounded-xl font-bold text-xs">
              <Plus className="w-4 h-4 inline mr-1" />
              Cadastrar
            </button>
          </form>
          <div className="space-y-2 mt-4">
            {indirectCosts.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-[#f4f3f1] text-xs flex justify-between">
                <span>{item.code} - {item.description} ({item.category})</span>
                <strong>{formatCurrency(item.amount)}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HISTÓRICO DE COMPETÊNCIAS DO COLABORADOR (3. Integridade Histórica) */}
      {/* ========================================================================= */}
      {historyModalEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dec1af] max-w-2xl w-full p-6 space-y-4 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#dec1af]/40 pb-3">
              <div>
                <span className="text-xs uppercase font-bold text-[#954a00]">Auditoria Salarial</span>
                <h3 className="text-lg font-black text-[#1a1c1b]">
                  Histórico de Competências: {historyModalEmployee.name}
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalEmployee(null)}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#574335]">
              As alterações salariais ou de encargos não recalculam silenciosamente ordens de produção fechadas no passado. Abaixo estão os registros auditáveis por competência.
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {historyList.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl">
                  Nenhuma alteração salarial anterior registrada para este colaborador. O valor atual permanece vigente.
                </div>
              ) : (
                historyList.map((hist) => (
                  <div
                    key={hist.id}
                    className="p-3.5 rounded-xl border border-stone-200 bg-[#f4f3f1] text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1a1c1b]">
                        Competência: {hist.competenceDate}
                      </span>
                      <span className="font-black text-[#954a00]">
                        {formatCurrency(hist.hourlyCost)}/h
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-[11px] text-[#574335]">
                      <div>Salário Base: {formatCurrency(hist.baseSalary)}</div>
                      <div>Encargos: {formatCurrency(hist.totalChargesAmount)}</div>
                      <div>Benefícios: {formatCurrency(hist.benefits)}</div>
                      <div className="font-bold text-[#1a1c1b]">
                        Total: {formatCurrency(hist.totalMonthlyCost)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryModalEmployee(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
