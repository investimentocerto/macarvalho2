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
  Wrench,
  Zap,
  Eye,
  X,
  Cpu,
  Save,
  AlertTriangle,
  Workflow,
  Calendar,
} from 'lucide-react';
import { dbService } from '@/lib/db-service';
import {
  calculateEmployeeCostDetails,
  calculateEmployeeHourlyCost,
  calculateProductionOrderCost,
  formatCurrency,
  formatNumber,
  getEquipmentDepreciationDetails,
  getEquipmentEnergyDetails,
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
  onAddEquipment?: (equipment: Equipment) => void;
  onUpdateEquipment?: (equipment: Equipment) => void;
  onDeleteEquipment?: (id: string) => void;
  onAddProcess?: (process: ProductionProcess) => void;
  onUpdateProcess?: (process: ProductionProcess) => void;
  onDeleteProcess?: (id: string) => void;
  onCloseOrder?: (order: ProductionOrder, operation: CostOperation) => void;
  onNotify?: (message: string) => void;
  onUpdateSectors?: (sectors: CostSector[]) => void;
}

type Tab =
  | 'apuracao'
  | 'ops'
  | 'centros-custo'
  | 'setores'
  | 'colaboradores'
  | 'encargos'
  | 'equipamentos'
  | 'manutencao'
  | 'indiretos';

const tabs: [Tab, string, string][] = [
  ['apuracao', 'Apuração Integrada', 'MOD direta, MOI rateada e Custo por Barra'],
  ['ops', 'Ordens de Produção', 'Seleção de OPs para custeio'],
  ['centros-custo', 'Centros de Custo', 'Gestão de Centros de Custo da fábrica'],
  ['setores', 'Processos de Fabricação', 'Cadastro de processos produtivos com vínculo a Centro de Custo'],
  ['colaboradores', 'Colaboradores', 'MOD/MOI, vínculo direto ao Centro de Custo e Encargos'],
  ['encargos', 'Encargos & Provisões', 'Tabela oficial de encargos e provisões CLT'],
  ['equipamentos', 'Equipamentos', 'Cadastro centralizado de máquinas, depreciação CIF e energia CIF'],
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
  onAddEquipment,
  onUpdateEquipment,
  onDeleteEquipment,
  onAddProcess,
  onUpdateProcess,
  onDeleteProcess,
  onCloseOrder,
  onNotify,
  onUpdateSectors,
}) => {
  const [tab, setTab] = useState<Tab>('apuracao');
  const [orderId, setOrderId] = useState(orders[0]?.id || '');
  const [operation, setOperation] = useState<CostOperation | null>(null);
  const [moiDriver, setMoiDriver] = useState<CostDriverType>('HORAS_PRODUTIVAS');

  // Centros de Custo gerenciados na aba CUSTOS INDUSTRIAIS -> CENTRO DE CUSTO (production_processes)
  const [processesList, setProcessesList] = useState<ProductionProcess[]>(processes || []);
  const [prevProcessesProp, setPrevProcessesProp] = useState(processes);

  if (processes !== prevProcessesProp) {
    setPrevProcessesProp(processes);
    setProcessesList(processes || []);
  }

  const [costCenterSearch, setCostCenterSearch] = useState('');
  const [isCostCenterModalOpen, setIsCostCenterModalOpen] = useState(false);
  const [editingCostCenterId, setEditingCostCenterId] = useState<string | null>(null);
  const [costCenterForm, setCostCenterForm] = useState({
    code: '',
    description: '',
    hourlyRate: '0.00',
  });

  // Modal de exclusão com desvinculação de Centro de Custo
  const [costCenterToDelete, setCostCenterToDelete] = useState<{
    proc: ProductionProcess;
    linkedSectors: CostSector[];
    linkedEq: Equipment[];
    linkedSteps: ProcessStepItem[];
    linkedEmp: CostEmployee[];
  } | null>(null);

  // Modal genérico de confirmação (Equipamentos, Colaboradores, Setores, Encargos)
  const [genericConfirmModal, setGenericConfirmModal] = useState<{
    title: string;
    description: string;
    details?: string[];
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Dados carregados
  const [employees, setEmployees] = useState<CostEmployee[]>([]);
  const [charges, setCharges] = useState<CostCharge[]>([]);
  const [sectors, setSectors] = useState<CostSector[]>([]);
  const [indirectCosts, setIndirectCosts] = useState<IndirectCost[]>([]);
  const [maintenance, setMaintenance] = useState<EquipmentMaintenance[]>([]);
  const [historyList, setHistoryList] = useState<CostEmployeeHistory[]>([]);
  const [historyModalEmployee, setHistoryModalEmployee] = useState<CostEmployee | null>(null);

  // Equipamentos gerenciados na aba CUSTOS INDUSTRIAIS -> EQUIPAMENTOS
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(equipment || []);
  const [prevEquipmentProp, setPrevEquipmentProp] = useState(equipment);

  if (equipment !== prevEquipmentProp) {
    setPrevEquipmentProp(equipment);
    setEquipmentList(equipment || []);
  }

  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [equipmentProcessFilter, setEquipmentProcessFilter] = useState('');
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [viewingEquipment, setViewingEquipment] = useState<Equipment | null>(null);

  const [equipmentForm, setEquipmentForm] = useState({
    code: '',
    name: '',
    description: '',
    processId: processes[0]?.id || '',
    acquisitionCost: '0',
    residualValue: '0',
    estimatedUsefulLife: '5',
    productiveHoursAvailable: '220',
    powerKw: '0',
    energyTariff: '0.85',
    maintenanceCostPerHour: '0',
    otherCostPerHour: '0',
  });

  // Filtro na listagem de colaboradores
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<'ALL' | 'DIRETA' | 'INDIRETA'>('ALL');
  const [employeeCostCenterFilter, setEmployeeCostCenterFilter] = useState('ALL');

  // Estado do formulário de colaborador (vinculado diretamente a Centro de Custo)
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState({
    code: '',
    name: '',
    role: '',
    costCenterId: '',
    laborType: 'DIRETA' as CostEmployee['laborType'],
    baseSalary: '3000',
    additions: '0',
    benefits: '450',
    productiveHours: '176',
    monthlyHours: '220',
    validFrom: new Date().toISOString().slice(0, 10),
    selectedChargeIds: [] as string[],
  });

  // Estado do formulário e filtros de processos de fabricação (vinculados a Centro de Custo)
  const [editingProcessFormId, setEditingProcessFormId] = useState<string | null>(null);
  const [processForm, setProcessForm] = useState({
    code: '',
    name: '',
    costCenterId: '',
    operationType: 'Semiautomática',
    standardTimeMinutes: '',
    description: '',
    active: true,
  });
  const [processSearch, setProcessSearch] = useState('');
  const [processCostCenterFilter, setProcessCostCenterFilter] = useState('ALL');

  // Estado do formulário de encargo
  const [chargeForm, setChargeForm] = useState({
    code: '',
    description: '',
    percent: '8.00',
    chargeType: 'ENCARGO' as CostCharge['chargeType'],
  });

  // Estado do formulário de indiretos com data de lançamento e rateio por mês
  const [indirect, setIndirect] = useState({
    code: '',
    description: '',
    category: 'Energia Elétrica Industrial',
    amount: '',
    competence: new Date().toISOString().slice(0, 10),
    classification: 'FIXO' as 'FIXO' | 'VARIAVEL',
    processId: '',
    observation: '',
  });

  // Filtro de competência mensal para a aba de Custos Indiretos (ex: '2026-09' ou 'ALL')
  const [indirectMonthFilter, setIndirectMonthFilter] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

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
        setEmpForm((prev) => (prev.selectedChargeIds.length === 0 && loadedCharges.length > 0 ? {
          ...prev,
          selectedChargeIds: loadedCharges.map((c) => c.id),
        } : prev));
      }
      if (loadedSectors) {
        setSectors(loadedSectors);
      }
      if (loadedIndirect && loadedIndirect.length > 0) {
        setIndirectCosts(loadedIndirect);
      } else {
        const curMonth = new Date().toISOString().slice(0, 7);
        setIndirectCosts([
          {
            id: 'cif-1',
            code: 'CIF-001',
            description: 'Energia Elétrica Fabril',
            category: 'Energia Elétrica Industrial',
            amount: 3200,
            competence: `${curMonth}-05`,
            classification: 'FIXO',
            observation: 'Fatura de energia fabril - Concessionária',
            active: true,
          },
          {
            id: 'cif-2',
            code: 'CIF-002',
            description: 'Aluguel do Galpão Industrial',
            category: 'Aluguel Fabril',
            amount: 4500,
            competence: `${curMonth}-01`,
            classification: 'FIXO',
            observation: 'Locação predial setor fabril',
            active: true,
          },
          {
            id: 'cif-3',
            code: 'CIF-003',
            description: 'Água e Saneamento Industrial',
            category: 'Utilidades',
            amount: 680,
            competence: `${curMonth}-10`,
            classification: 'FIXO',
            observation: 'Abastecimento água industrial',
            active: true,
          },
        ]);
      }
      if (loadedMaintenance) setMaintenance(loadedMaintenance);
    });
  }, []);

  // Centro de Custo selecionado no formulário do colaborador
  const selectedCostCenter = useMemo(() => {
    const targetId = empForm.costCenterId || processesList[0]?.id;
    return (
      processesList.find((p) => p.id === targetId) ||
      processesList[0] ||
      null
    );
  }, [processesList, empForm.costCenterId]);

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
      equipment: equipmentList,
      processes: processesList,
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

  // Cálculos em tempo real da aba/modal de Equipamentos
  const liveEquipmentCalc = useMemo(() => {
    const acq = Math.max(0, Number(equipmentForm.acquisitionCost) || 0);
    const res = Math.max(0, Number(equipmentForm.residualValue) || 0);
    const life = Math.max(0, Number(equipmentForm.estimatedUsefulLife) || 0);
    const prodHours = Math.max(1, Number(equipmentForm.productiveHoursAvailable) || 220);
    const power = Math.max(0, Number(equipmentForm.powerKw) || 0);
    const tariff = Math.max(0, Number(equipmentForm.energyTariff) || 0);
    const maint = Math.max(0, Number(equipmentForm.maintenanceCostPerHour) || 0);
    const other = Math.max(0, Number(equipmentForm.otherCostPerHour) || 0);

    const depr = getEquipmentDepreciationDetails({
      acquisitionCost: acq,
      residualValue: res,
      estimatedUsefulLife: life,
      productiveHoursAvailable: prodHours,
    });

    const energy = getEquipmentEnergyDetails({
      powerKw: power,
      energyTariff: tariff,
      productiveHoursAvailable: prodHours,
    });

    // Custo operacional do equipamento por hora (sem energia, pois energia é CIF!)
    const hourlyDirectEquipmentCost = depr.hourlyDepreciation + maint + other;

    return {
      ...depr,
      ...energy,
      hourlyDirectEquipmentCost,
    };
  }, [equipmentForm]);

  // Handlers para o CRUD de Equipamentos
  const handleOpenNewEquipment = () => {
    setEditingEquipmentId(null);
    setEquipmentForm({
      code: '',
      name: '',
      description: '',
      processId: processes[0]?.id || '',
      acquisitionCost: '0',
      residualValue: '0',
      estimatedUsefulLife: '5',
      productiveHoursAvailable: '220',
      powerKw: '0',
      energyTariff: '0.85',
      maintenanceCostPerHour: '0',
      otherCostPerHour: '0',
    });
    setIsEquipmentModalOpen(true);
  };

  const handleOpenEditEquipment = (eq: Equipment) => {
    setEditingEquipmentId(eq.id);
    setEquipmentForm({
      code: eq.code,
      name: eq.name,
      description: eq.description || '',
      processId: eq.processId,
      acquisitionCost: String(eq.acquisitionCost || 0),
      residualValue: String(eq.residualValue || 0),
      estimatedUsefulLife: String(eq.estimatedUsefulLife || 5),
      productiveHoursAvailable: String(eq.productiveHoursAvailable || 220),
      powerKw: String(eq.powerKw || 0),
      energyTariff: String(eq.energyTariff || 0.85),
      maintenanceCostPerHour: String(eq.maintenanceCostPerHour || 0),
      otherCostPerHour: String(eq.otherCostPerHour || 0),
    });
    setIsEquipmentModalOpen(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentForm.code.trim() || !equipmentForm.name.trim() || !equipmentForm.processId) {
      onNotify?.('Preencha os campos obrigatórios: Código, Nome e Centro de Custo.');
      return;
    }

    const item: Equipment = {
      id: editingEquipmentId || `eq-${Date.now()}`,
      code: equipmentForm.code.trim().toUpperCase(),
      name: equipmentForm.name.trim(),
      description: equipmentForm.description.trim(),
      processId: equipmentForm.processId,
      acquisitionCost: Math.max(0, Number(equipmentForm.acquisitionCost) || 0),
      residualValue: Math.max(0, Number(equipmentForm.residualValue) || 0),
      estimatedUsefulLife: Math.max(0, Number(equipmentForm.estimatedUsefulLife) || 0),
      productiveHoursAvailable: Math.max(1, Number(equipmentForm.productiveHoursAvailable) || 220),
      powerKw: Math.max(0, Number(equipmentForm.powerKw) || 0),
      energyTariff: Math.max(0, Number(equipmentForm.energyTariff) || 0),
      maintenanceCostPerHour: Math.max(0, Number(equipmentForm.maintenanceCostPerHour) || 0),
      otherCostPerHour: Math.max(0, Number(equipmentForm.otherCostPerHour) || 0),
      createdAt: editingEquipmentId
        ? equipmentList.find((e) => e.id === editingEquipmentId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
    };

    if (editingEquipmentId) {
      setEquipmentList((prev) => prev.map((eq) => (eq.id === item.id ? item : eq)));
      onUpdateEquipment?.(item);
      await dbService.saveEquipment(item);
      onNotify?.(`Equipamento "${item.name}" atualizado com sucesso!`);
    } else {
      setEquipmentList((prev) => [item, ...prev]);
      onAddEquipment?.(item);
      await dbService.saveEquipment(item);
      onNotify?.(`Equipamento "${item.name}" cadastrado com sucesso!`);
    }

    setIsEquipmentModalOpen(false);
    setEditingEquipmentId(null);
  };

  const handleDeleteEquipmentClick = (eq: Equipment) => {
    // Validação de integridade referencial: verificar se está em etapas de roteiro ou manutenção
    const hasRouteStep = steps.some((s) => s.equipmentId === eq.id);
    const hasMaintenance = maintenance.some((m) => m.equipmentId === eq.id);

    if (hasRouteStep || hasMaintenance) {
      const reasons: string[] = [];
      if (hasRouteStep) reasons.push('etapas de roteiro de produção');
      if (hasMaintenance) reasons.push('registros de manutenção');
      setGenericConfirmModal({
        title: `Vínculos no Equipamento "${eq.name}"`,
        description: `Não é possível excluir o equipamento (${eq.code}) pois ele possui vínculos ativos em:`,
        details: reasons,
        confirmLabel: 'Entendido',
        isDestructive: false,
        onConfirm: () => setGenericConfirmModal(null),
      });
      return;
    }

    setGenericConfirmModal({
      title: `Excluir Equipamento "${eq.name}"?`,
      description: `Código: ${eq.code}. Esta ação removerá o equipamento do cadastro de custos industriais.`,
      confirmLabel: 'Excluir Equipamento',
      isDestructive: true,
      onConfirm: async () => {
        setEquipmentList((prev) => prev.filter((item) => item.id !== eq.id));
        onDeleteEquipment?.(eq.id);
        await dbService.deleteEquipment(eq.id);
        onNotify?.(`Equipamento "${eq.name}" excluído com sucesso.`);
        setGenericConfirmModal(null);
      },
    });
  };

  // Filtragem da lista de equipamentos
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((item) => {
      const matchesSearch =
        !equipmentSearch.trim() ||
        item.code.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        item.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(equipmentSearch.toLowerCase()));
      const matchesProcess = !equipmentProcessFilter || item.processId === equipmentProcessFilter;
      return matchesSearch && matchesProcess;
    });
  }, [equipmentList, equipmentSearch, equipmentProcessFilter]);

  // Salvar / Atualizar Colaborador
  const handleSaveEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!empForm.name.trim()) {
      onNotify?.('Informe o nome do colaborador.');
      return;
    }

    const targetProcess =
      processesList.find((p) => p.id === empForm.costCenterId) ||
      processesList[0];

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
      sector: targetProcess ? `${targetProcess.code} - ${targetProcess.description}` : 'Geral',
      processId: targetProcess?.id,
      costCenterId: targetProcess?.id,
      costCenterCode: targetProcess?.code,
      costCenterDescription: targetProcess?.description,
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
        costCenterId: processesList[0]?.id || '',
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
    const resolvedCCId =
      emp.costCenterId ||
      emp.processId ||
      sectors.find((s) => s.id === emp.sectorId)?.costCenterId ||
      processesList.find((p) => emp.sector && (emp.sector.includes(p.code) || emp.sector.includes(p.description)))?.id ||
      processesList[0]?.id ||
      '';

    setEmpForm({
      code: emp.code,
      name: emp.name,
      role: emp.role,
      costCenterId: resolvedCCId,
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
  const handleDeleteEmployee = (id: string, name: string) => {
    setGenericConfirmModal({
      title: `Excluir Colaborador "${name}"?`,
      description: `Tem certeza que deseja remover este colaborador do cadastro de mão de obra?`,
      confirmLabel: 'Excluir Colaborador',
      isDestructive: true,
      onConfirm: async () => {
        const deleted = await dbService.deleteCostEmployee(id);
        if (deleted) {
          setEmployees((current) => current.filter((e) => e.id !== id));
          onNotify?.(`Colaborador ${name} removido.`);
        }
        setGenericConfirmModal(null);
      },
    });
  };

  // Abrir histórico de competências do colaborador
  const handleOpenHistory = async (emp: CostEmployee) => {
    setHistoryModalEmployee(emp);
    const records = await dbService.fetchCostEmployeeHistory(emp.id);
    setHistoryList(records);
  };

  // Filtro na listagem de Centros de Custo (production_processes)
  const filteredCostCenters = useMemo(() => {
    return processesList.filter((proc) => {
      const q = costCenterSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        proc.code.toLowerCase().includes(q) ||
        proc.description.toLowerCase().includes(q)
      );
    });
  }, [processesList, costCenterSearch]);

  // Handlers: Centros de Custo
  const handleOpenNewCostCenter = () => {
    setEditingCostCenterId(null);
    const nextNum = processesList.length + 1;
    setCostCenterForm({
      code: `CC-${String(nextNum).padStart(2, '0')}`,
      description: '',
      hourlyRate: '0.00',
    });
    setIsCostCenterModalOpen(true);
  };

  const handleEditCostCenter = (proc: ProductionProcess) => {
    setEditingCostCenterId(proc.id);
    setCostCenterForm({
      code: proc.code,
      description: proc.description,
      hourlyRate: (proc.hourlyRate || 0).toFixed(2),
    });
    setIsCostCenterModalOpen(true);
  };

  const handleSaveCostCenter = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!costCenterForm.code.trim() || !costCenterForm.description.trim()) {
      onNotify?.('Preencha o código e a descrição do Centro de Custo.');
      return;
    }

    const payload: ProductionProcess = {
      id: editingCostCenterId || `proc-${Date.now()}`,
      code: costCenterForm.code.trim().toUpperCase(),
      description: costCenterForm.description.trim(),
      hourlyRate: Math.max(0, parseFloat(costCenterForm.hourlyRate) || 0),
      createdAt: editingCostCenterId
        ? processesList.find((p) => p.id === editingCostCenterId)?.createdAt
        : new Date().toISOString(),
    };

    const saved = await dbService.saveProductionProcess(payload);
    if (saved) {
      if (editingCostCenterId) {
        setProcessesList((prev) => prev.map((p) => (p.id === payload.id ? payload : p)));
        onUpdateProcess?.(payload);
      } else {
        setProcessesList((prev) => [...prev, payload]);
        onAddProcess?.(payload);
      }
      setIsCostCenterModalOpen(false);
      onNotify?.(`Centro de Custo [${payload.code}] salvo com sucesso.`);
    } else {
      onNotify?.('Erro ao salvar Centro de Custo.');
    }
  };

  const handleRequestDeleteCostCenter = (proc: ProductionProcess) => {
    const linkedSectors = sectors.filter((s) => s.costCenterId === proc.id);
    const linkedEq = equipmentList.filter((e) => e.processId === proc.id);
    const linkedSteps = steps.filter((st) => st.processId === proc.id || st.costCenterCode === proc.code);
    const linkedEmp = employees.filter(
      (emp) => emp.costCenterId === proc.id || emp.processId === proc.id || emp.costCenterCode === proc.code
    );

    setCostCenterToDelete({
      proc,
      linkedSectors,
      linkedEq,
      linkedSteps,
      linkedEmp,
    });
  };

  const handleConfirmDeleteCostCenter = async (unlinkAssociations: boolean = false) => {
    if (!costCenterToDelete) return;
    const { proc, linkedSectors, linkedEq, linkedEmp } = costCenterToDelete;

    try {
      if (unlinkAssociations) {
        // 1. Desvincular Setores
        for (const sec of linkedSectors) {
          const updatedSec: CostSector = { ...sec, costCenterId: '' };
          await dbService.saveCostSector(updatedSec);
        }
        setSectors((prev) => prev.map((s) => (s.costCenterId === proc.id ? { ...s, costCenterId: '' } : s)));

        // 2. Desvincular Equipamentos
        for (const eq of linkedEq) {
          const updatedEq: Equipment = { ...eq, processId: '' };
          await dbService.saveEquipment(updatedEq);
          onUpdateEquipment?.(updatedEq);
        }
        setEquipmentList((prev) => prev.map((e) => (e.processId === proc.id ? { ...e, processId: '' } : e)));

        // 3. Desvincular Colaboradores
        for (const emp of linkedEmp) {
          const updatedEmp: CostEmployee = {
            ...emp,
            costCenterId: undefined,
            processId: undefined,
            costCenterCode: undefined,
          };
          await dbService.saveCostEmployee(updatedEmp);
        }
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.costCenterId === proc.id || emp.processId === proc.id || emp.costCenterCode === proc.code
              ? { ...emp, costCenterId: undefined, processId: undefined, costCenterCode: undefined }
              : emp
          )
        );
      }

      // 4. Remover o Centro de Custo no DB e estado
      await dbService.deleteProductionProcess(proc.id);
      setProcessesList((prev) => prev.filter((p) => p.id !== proc.id));
      onDeleteProcess?.(proc.id);
      onNotify?.(`Centro de Custo [${proc.code}] excluído com sucesso.`);
    } catch (err) {
      console.error('Erro ao excluir centro de custo:', err);
      setProcessesList((prev) => prev.filter((p) => p.id !== proc.id));
      onDeleteProcess?.(proc.id);
      onNotify?.(`Centro de Custo [${proc.code}] removido.`);
    } finally {
      setCostCenterToDelete(null);
    }
  };

  const handleDeleteCostCenter = (proc: ProductionProcess) => {
    handleRequestDeleteCostCenter(proc);
  };

  // Salvar ou Atualizar Processo de Fabricação
  const handleSaveManufacturingProcess = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!processForm.name.trim()) {
      onNotify?.('Informe o nome do processo de fabricação.');
      return;
    }

    const targetCC = processesList.find((p) => p.id === processForm.costCenterId) || processesList[0];
    const item: CostSector = {
      id: editingProcessFormId || `proc-fab-${Date.now()}`,
      code: processForm.code || `PROC-${String(sectors.length + 1).padStart(3, '0')}`,
      name: processForm.name.trim(),
      costCenterId: targetCC?.id || (processesList[0]?.id ?? 'proc-cc-001'),
      active: processForm.active !== undefined ? processForm.active : true,
      operationType: processForm.operationType || 'Semiautomática',
      standardTimeMinutes: processForm.standardTimeMinutes ? Number(processForm.standardTimeMinutes) : undefined,
      description: processForm.description.trim(),
      createdAt: new Date().toISOString(),
    };

    const saved = await dbService.saveCostSector(item);
    if (saved) {
      let updatedSectors: CostSector[] = [];
      setSectors((current) => {
        const index = current.findIndex((s) => s.id === item.id);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = item;
          updatedSectors = updated;
          return updated;
        }
        updatedSectors = [...current, item];
        return updatedSectors;
      });
      onUpdateSectors?.(updatedSectors);

      const wasEditing = Boolean(editingProcessFormId);
      setEditingProcessFormId(null);
      setProcessForm({
        code: '',
        name: '',
        costCenterId: processesList[0]?.id || '',
        operationType: 'Semiautomática',
        standardTimeMinutes: '',
        description: '',
        active: true,
      });

      onNotify?.(
        wasEditing
          ? `Processo de fabricação "${item.name}" atualizado e salvo no Supabase!`
          : `Processo de fabricação "${item.name}" salvo com sucesso no banco de dados Supabase!`
      );
    } else {
      onNotify?.('Aviso: O processo foi salvo localmente, mas houve uma falha ao persistir no Supabase.');
    }
  };

  const handleEditManufacturingProcess = (proc: CostSector) => {
    setEditingProcessFormId(proc.id);
    setProcessForm({
      code: proc.code,
      name: proc.name,
      costCenterId: proc.costCenterId || processesList[0]?.id || '',
      operationType: proc.operationType || 'Semiautomática',
      standardTimeMinutes: proc.standardTimeMinutes ? String(proc.standardTimeMinutes) : '',
      description: proc.description || '',
      active: proc.active !== false,
    });
    const el = document.getElementById('form-manufacturing-process');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEditProcess = () => {
    setEditingProcessFormId(null);
    setProcessForm({
      code: '',
      name: '',
      costCenterId: processesList[0]?.id || '',
      operationType: 'Semiautomática',
      standardTimeMinutes: '',
      description: '',
      active: true,
    });
  };

  // Alternar Status Ativo / Inativo de Processo
  const handleToggleProcessActive = async (proc: CostSector) => {
    const updated: CostSector = { ...proc, active: !proc.active };
    const saved = await dbService.saveCostSector(updated);
    if (saved) {
      let updatedSectors: CostSector[] = [];
      setSectors((current) => {
        const nextList = current.map((s) => (s.id === proc.id ? updated : s));
        updatedSectors = nextList;
        return nextList;
      });
      onUpdateSectors?.(updatedSectors);
      onNotify?.(`Processo "${proc.name}" agora está ${updated.active ? 'Ativo' : 'Inativo'}.`);
    }
  };

  // Excluir Processo de Fabricação (com validação de integridade do roteiro produtivo)
  const handleDeleteManufacturingProcess = (id: string, name: string) => {
    const linkedStepsCount = steps.filter((s) => s.processId === id).length;
    if (linkedStepsCount > 0) {
      setGenericConfirmModal({
        title: `Processo em Uso no Roteiro de Produção`,
        description: `O processo "${name}" está vinculado a ${linkedStepsCount} etapa(s) de roteiro produtivo. Para não corromper o histórico e a rastreabilidade fabril, ele não deve ser excluído fisicamente, mas sim INATIVADO. Processos inativos não aparecem para novos roteiros, mas permanecem nos produtos existentes.`,
        confirmLabel: 'Inativar Processo',
        isDestructive: false,
        onConfirm: async () => {
          const target = sectors.find((s) => s.id === id);
          if (target) {
            const updated: CostSector = { ...target, active: false };
            const saved = await dbService.saveCostSector(updated);
            if (saved) {
              let updatedSectors: CostSector[] = [];
              setSectors((current) => {
                const nextList = current.map((s) => (s.id === id ? updated : s));
                updatedSectors = nextList;
                return nextList;
              });
              onUpdateSectors?.(updatedSectors);
              onNotify?.(`Processo "${name}" foi inativado.`);
            }
          }
          setGenericConfirmModal(null);
        },
      });
      return;
    }

    setGenericConfirmModal({
      title: `Remover Processo de Fabricação "${name}"?`,
      description: `Tem certeza que deseja remover este processo de fabricação do cadastro fabril?`,
      confirmLabel: 'Remover Processo',
      isDestructive: true,
      onConfirm: async () => {
        const deleted = await dbService.deleteCostSector(id);
        if (deleted) {
          let remainingSectors: CostSector[] = [];
          setSectors((current) => {
            const nextList = current.filter((s) => s.id !== id);
            remainingSectors = nextList;
            return nextList;
          });
          onUpdateSectors?.(remainingSectors);
          onNotify?.(`Processo de fabricação "${name}" removido.`);
        }
        setGenericConfirmModal(null);
      },
    });
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
  const handleDeleteCharge = (id: string, desc: string) => {
    setGenericConfirmModal({
      title: `Remover Encargo "${desc}"?`,
      description: `Tem certeza que deseja excluir esta taxa/encargo social?`,
      confirmLabel: 'Remover Encargo',
      isDestructive: true,
      onConfirm: async () => {
        const deleted = await dbService.deleteCostCharge(id);
        if (deleted) {
          setCharges((current) => current.filter((c) => c.id !== id));
          setEmpForm((prev) => ({
            ...prev,
            selectedChargeIds: prev.selectedChargeIds.filter((cid) => cid !== id),
          }));
          onNotify?.(`Encargo "${desc}" removido.`);
        }
        setGenericConfirmModal(null);
      },
    });
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

  // Salvar Custo Indireto com validação de data de lançamento e valor
  const saveIndirect = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!indirect.description.trim()) {
      onNotify?.('Informe a descrição do custo indireto.');
      return;
    }
    const val = Number(indirect.amount);
    if (isNaN(val) || val <= 0) {
      onNotify?.('Informe um valor monetário válido maior que zero.');
      return;
    }
    if (!indirect.competence) {
      onNotify?.('Informe a data de lançamento para o rateio por competência.');
      return;
    }

    const nextSeq = indirectCosts.length + 1;
    const generatedCode = indirect.code.trim() || `CIF-${String(nextSeq).padStart(3, '0')}`;
    const item: IndirectCost = {
      id: `indirect-${Date.now()}`,
      code: generatedCode,
      description: indirect.description.trim(),
      category: indirect.category.trim() || 'Custos Gerais Fabris',
      processId: indirect.processId || undefined,
      amount: val,
      competence: indirect.competence,
      classification: indirect.classification || 'FIXO',
      observation: indirect.observation.trim(),
      active: true,
    };

    if (await dbService.saveIndirectCost(item)) {
      setIndirectCosts((current) => [item, ...current]);
      setIndirect({
        code: '',
        description: '',
        category: 'Energia Elétrica Industrial',
        amount: '',
        competence: indirect.competence, // mantém a data para agilizar novos lançamentos no mesmo mês
        classification: 'FIXO',
        processId: '',
        observation: '',
      });
      onNotify?.(`Custo indireto ${item.code} cadastrado com sucesso.`);
    } else {
      onNotify?.('Erro ao salvar custo indireto no banco de dados.');
    }
  };

  // Excluir Custo Indireto com confirmação segura
  const handleDeleteIndirect = (item: IndirectCost) => {
    setGenericConfirmModal({
      title: 'Excluir Custo Indireto (CIF)',
      description: `Tem certeza que deseja excluir o custo "${item.code} - ${item.description}" lançado em ${item.competence}?`,
      details: [
        `Valor: ${formatCurrency(item.amount)}`,
        `Data/Competência: ${item.competence}`,
        `Categoria: ${item.category} (${item.classification})`,
        'Este custo será removido imediatamente e o rateio mensal das Ordens de Produção será recalculado.',
      ],
      confirmLabel: 'Sim, Excluir Lançamento',
      isDestructive: true,
      onConfirm: async () => {
        const ok = await dbService.deleteIndirectCost(item.id);
        if (ok) {
          setIndirectCosts((prev) => prev.filter((c) => c.id !== item.id));
          onNotify?.(`Custo indireto ${item.code} excluído com sucesso.`);
        } else {
          onNotify?.('Erro ao excluir custo indireto no banco de dados.');
        }
      },
    });
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

  // Colaboradores filtrados (com busca e filtro por Centro de Custo)
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const empCC = processesList.find(
        (p) => p.id === emp.costCenterId || p.id === emp.processId
      );
      const ccCode = empCC?.code || emp.costCenterCode || '';
      const ccDesc = empCC?.description || emp.costCenterDescription || '';

      const matchSearch =
        !employeeSearch ||
        emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.code.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.role.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.sector.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        ccCode.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        ccDesc.toLowerCase().includes(employeeSearch.toLowerCase());

      const matchType =
        employeeTypeFilter === 'ALL' || emp.laborType === employeeTypeFilter;

      const matchCC =
        employeeCostCenterFilter === 'ALL' ||
        emp.costCenterId === employeeCostCenterFilter ||
        emp.processId === employeeCostCenterFilter ||
        (empCC && empCC.id === employeeCostCenterFilter);

      return matchSearch && matchType && matchCC;
    });
  }, [employees, employeeSearch, employeeTypeFilter, employeeCostCenterFilter, processesList]);

  // Processos de fabricação filtrados
  const filteredManufacturingProcesses = useMemo(() => {
    return sectors.filter((proc) => {
      const matchSearch =
        !processSearch ||
        proc.name.toLowerCase().includes(processSearch.toLowerCase()) ||
        proc.code.toLowerCase().includes(processSearch.toLowerCase()) ||
        (proc.description && proc.description.toLowerCase().includes(processSearch.toLowerCase()));

      const matchCC =
        processCostCenterFilter === 'ALL' || proc.costCenterId === processCostCenterFilter;

      return matchSearch && matchCC;
    });
  }, [sectors, processSearch, processCostCenterFilter]);

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
              {processesList.length}
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
              {id === 'apuracao' && <Calculator className="w-3.5 h-3.5" />}
              {id === 'ops' && <Clock className="w-3.5 h-3.5" />}
              {id === 'centros-custo' && <Building2 className="w-3.5 h-3.5" />}
              {id === 'setores' && <Workflow className="w-3.5 h-3.5" />}
              {id === 'colaboradores' && <Users className="w-3.5 h-3.5" />}
              {id === 'encargos' && <DollarSign className="w-3.5 h-3.5" />}
              {id === 'equipamentos' && <Cpu className="w-3.5 h-3.5" />}
              {id === 'manutencao' && <Wrench className="w-3.5 h-3.5" />}
              {id === 'indiretos' && <PieChart className="w-3.5 h-3.5" />}
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#574335]">
                      Composição Contábil do Custo Industrial Total
                    </h4>
                    <span className="text-[11px] font-medium text-[#574335]">
                      Separação Contábil: <strong>Custos Diretos</strong> e <strong>Custos Indiretos de Fabricação (CIF)</strong>
                    </span>
                  </div>

                  {/* Grupo: Custos Diretos */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      Custos Diretos de Fabricação
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#e9e8e6]">
                        <span className="block text-[11px] font-bold text-[#574335]">Insumos / Matérias-Primas</span>
                        <strong className="text-lg font-black text-[#1a1c1b]">
                          {formatCurrency(operation.materialCost)}
                        </strong>
                      </div>

                      <div className="rounded-xl bg-emerald-50/80 p-3.5 border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <span className="block text-[11px] font-bold text-emerald-900">MOD (Mão de Obra Direta)</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-800">
                            Horas Apontadas na OP
                          </span>
                        </div>
                        <strong className="text-lg font-black text-emerald-700">
                          {formatCurrency(operation.directLaborCost)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Grupo: Custos Indiretos (CIF) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                      Custos Indiretos de Fabricação (CIF)
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                      <div className="rounded-xl bg-amber-50/80 p-3.5 border border-amber-200">
                        <div className="flex items-center justify-between">
                          <span className="block text-[11px] font-bold text-amber-900">MOI (Indireta Rateada)</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-800">
                            Rateio CC
                          </span>
                        </div>
                        <strong className="text-lg font-black text-amber-700">
                          {formatCurrency(operation.indirectLaborCost)}
                        </strong>
                      </div>

                      <div className="rounded-xl bg-sky-50/80 p-3.5 border border-sky-200">
                        <div className="flex items-center justify-between">
                          <span className="block text-[11px] font-bold text-sky-900">CIF - Energia Elétrica</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-200/70 text-sky-800">
                            Consumo kWh
                          </span>
                        </div>
                        <strong className="text-lg font-black text-sky-800">
                          {formatCurrency(operation.energyCost)}
                        </strong>
                      </div>

                      <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#e9e8e6]">
                        <span className="block text-[11px] font-bold text-[#574335]">CIF - Depreciação de Máquinas</span>
                        <strong className="text-lg font-black text-[#1a1c1b]">
                          {formatCurrency(operation.depreciationCost)}
                        </strong>
                      </div>

                      <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#e9e8e6]">
                        <span className="block text-[11px] font-bold text-[#574335]">CIF - Manutenção de Máquinas</span>
                        <strong className="text-lg font-black text-[#1a1c1b]">
                          {formatCurrency(operation.maintenanceCost)}
                        </strong>
                      </div>

                      <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#e9e8e6]">
                        <div className="flex items-center justify-between">
                          <span className="block text-[11px] font-bold text-[#574335]">CIF - Outros Custos Indiretos</span>
                          {operation.analysisMonth && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              Mês {operation.analysisMonth.slice(5, 7)}/{operation.analysisMonth.slice(0, 4)}
                            </span>
                          )}
                        </div>
                        <strong className="text-lg font-black text-[#1a1c1b]">
                          {formatCurrency(operation.otherIndirectCost)}
                        </strong>
                        {operation.monthIndirectTotal !== undefined && operation.monthIndirectTotal > 0 && (
                          <span className="block text-[10px] text-stone-500 mt-0.5">
                            Rateio de {formatCurrency(operation.monthIndirectTotal)} do mês ({operation.indirectCostSharePercent || 0}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grupo: Totais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="rounded-xl bg-[#954a00]/10 p-4 border border-[#954a00]/30 flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-bold text-[#954a00]">Custo Industrial Total da OP</span>
                        <span className="text-[11px] text-[#574335]">Custos Diretos + CIF Totais</span>
                      </div>
                      <strong className="text-2xl font-black text-[#954a00]">
                        {formatCurrency(operation.totalCost)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-stone-900 text-white p-4 border border-stone-800 flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-bold text-stone-300">Custo Total por Barra Produzida</span>
                        <span className="text-[11px] text-stone-400">Total / {operation.goodBarsQuantity || operation.finishedQuantity} barras boas</span>
                      </div>
                      <strong className="text-2xl font-black text-amber-400">
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
                      Detalhamento de MOD Direta e Custos de Máquina por Etapa do Roteiro
                    </h4>
                    <span className="text-xs text-[#574335]">
                      {operation.steps.length} etapas apuradas
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#e9e8e6]">
                    <table className="w-full text-xs">
                      <thead className="bg-[#f4f3f1] text-[#574335]">
                        <tr>
                          <th className="p-3 text-left">Centro de Custo & Equipamento</th>
                          <th className="p-3 text-left">Etapa / Roteiro</th>
                          <th className="p-3 text-right">Tempo Real OP (h)</th>
                          <th className="p-3 text-right">Homem-Hora</th>
                          <th className="p-3 text-right text-emerald-800">MOD Direta</th>
                          <th className="p-3 text-right text-sky-800">CIF - Energia</th>
                          <th className="p-3 text-right text-emerald-700">CIF - Depreciação</th>
                          <th className="p-3 text-right text-amber-800">CIF - Manutenção</th>
                          <th className="p-3 text-right font-bold text-[#1a1c1b]">Total da Etapa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operation.steps.map((item) => {
                          const stepObj = steps.find((s) => s.id === item.stepId);
                          const procCode = item.costCenterCode || stepObj?.costCenterCode;
                          const procObj = processesList.find((p) => p.code === procCode || p.id === stepObj?.processId);
                          const machineObj = equipmentList.find(
                            (e) =>
                              e.id === item.equipmentId ||
                              e.id === stepObj?.equipmentId ||
                              (stepObj?.machine && (e.name.toLowerCase() === stepObj.machine.toLowerCase() || e.code.toLowerCase() === stepObj.machine.toLowerCase()))
                          );

                          return (
                            <tr key={item.id} className="border-b border-[#e9e8e6] hover:bg-stone-50">
                              <td className="p-3 text-[#1a1c1b]">
                                <div className="font-bold flex items-center gap-1.5">
                                  {procCode ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-bold">
                                      {procCode}
                                    </span>
                                  ) : null}
                                  <span>{procObj?.description || item.costCenterName || 'Centro Fabril'}</span>
                                </div>
                                <div className="text-[11px] text-[#574335] mt-0.5 flex items-center gap-1">
                                  <Cpu className="w-3 h-3 text-stone-400" />
                                  <span>
                                    {machineObj ? `${machineObj.code} - ${machineObj.name}` : (item.equipmentName || stepObj?.machine || 'Operação Manual')}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 font-medium text-[#1a1c1b]">
                                {stepObj?.title || item.stepId}
                              </td>
                              <td className="p-3 text-right font-bold text-[#1a1c1b]">
                                {item.durationHours.toFixed(2)} h
                              </td>
                              <td className="p-3 text-right text-[#574335]">
                                {item.manHours.toFixed(2)} h
                              </td>
                              <td className="p-3 text-right font-semibold text-emerald-700">
                                {formatCurrency(item.laborCost)}
                              </td>
                              <td className="p-3 text-right font-semibold text-sky-800">
                                {formatCurrency(item.energyCost)}
                              </td>
                              <td className="p-3 text-right font-semibold text-emerald-800">
                                {formatCurrency(item.depreciationCost)}
                              </td>
                              <td className="p-3 text-right font-semibold text-amber-800">
                                {formatCurrency(item.maintenanceCost)}
                              </td>
                              <td className="p-3 text-right font-black text-[#1a1c1b]">
                                {formatCurrency(item.totalCost)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="px-3.5 py-2.5 bg-stone-50 border-t border-[#e9e8e6] text-[11px] text-[#574335] flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-[#954a00] shrink-0" />
                      <span>
                        <strong>Regra de Classificação Contábil:</strong> A depreciação, energia elétrica e manutenção das máquinas são calculadas estritamente pelo tempo real de operação registrado na OP (sem duplicidade). As horas disponíveis do equipamento calibram a taxa horária de depreciação cadastral. A energia e a depreciação são classificadas como CIF (Custos Indiretos de Fabricação).
                      </span>
                    </div>
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
      {/* ABA: ORDENS DE PRODUÇÃO (Seleção e Consulta de OPs) */}
      {/* ========================================================================= */}
      {tab === 'ops' && (
        <section id="section-ops" className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dec1af]/30 pb-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#954a00]">
                  Produção Fabril
                </span>
                <h2 className="text-xl font-black text-[#1a1c1b] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#954a00]" />
                  Ordens de Produção
                </h2>
                <p className="text-xs text-[#574335] mt-0.5">
                  Consulte as Ordens de Produção e selecione qualquer ordem para apurar os custos industriais (MOD direta, MOI rateada, CIF energia e CIF depreciação).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#dec1af]/60">
              <table className="w-full text-xs">
                <thead className="bg-[#f4f3f1] text-[#574335] font-bold">
                  <tr>
                    <th className="p-3 text-left">Número OP</th>
                    <th className="p-3 text-left">Produto</th>
                    <th className="p-3 text-right">Lote Planejado</th>
                    <th className="p-3 text-left">Data de Criação</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Apontamentos Realizados</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#574335]">
                        <Clock className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                        <p className="font-semibold text-sm">Nenhuma Ordem de Produção cadastrada</p>
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => {
                      const ordEntries = entries.filter((e) => e.orderId === ord.id);
                      const totalHours = ordEntries.reduce((sum, e) => {
                        const h = e.hoursWorked || 0;
                        return sum + h;
                      }, 0);

                      return (
                        <tr key={ord.id} className="border-b border-[#e9e8e6] hover:bg-stone-50 transition-colors">
                          <td className="p-3 font-bold text-[#1a1c1b]">{ord.opNumber}</td>
                          <td className="p-3 font-medium text-[#1a1c1b]">{ord.productName}</td>
                          <td className="p-3 text-right font-semibold">{ord.quantity} barras</td>
                          <td className="p-3 text-[#574335]">
                            {ord.openingDate ? new Date(ord.openingDate).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ord.status === 'Concluída'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.status === 'Em Andamento'
                                  ? 'bg-sky-100 text-sky-800'
                                  : ord.status === 'Parada'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td className="p-3 text-center text-[#574335]">
                            <span className="font-semibold text-[#1a1c1b]">{ordEntries.length}</span> apontamentos
                            {totalHours > 0 && ` (${totalHours.toFixed(2)}h)`}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setOrderId(ord.id);
                                setTab('apuracao');
                              }}
                              className="px-3 py-1.5 bg-[#954a00] hover:bg-[#7a3c00] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 mx-auto shadow-xs"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              Apurar Custos
                            </button>
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
      {/* ABA: CENTRO DE CUSTO (production_processes) */}
      {/* ========================================================================= */}
      {tab === 'centros-custo' && (
        <section id="section-centros-custo" className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dec1af]/30 pb-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#954a00]">
                  Estrutura Fabril & Contábil
                </span>
                <h2 className="text-xl font-black text-[#1a1c1b] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#954a00]" />
                  Centros de Custo Fabris
                </h2>
                <p className="text-xs text-[#574335] mt-0.5">
                  Gestão centralizada dos Centros de Custo fabris (<code className="bg-stone-100 px-1 py-0.5 rounded text-[11px]">production_processes</code>). Base estrutural para alocação de Setores, Equipamentos, Colaboradores e rateio de CIF/MOI.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-novo-centro-custo"
                  onClick={handleOpenNewCostCenter}
                  className="px-4 py-2.5 bg-[#954a00] hover:bg-[#7a3c00] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Novo Centro de Custo
                </button>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#dec1af]/40">
                <span className="block text-[11px] font-bold text-[#574335]">Total de Centros de Custo</span>
                <strong className="text-xl font-black text-[#1a1c1b]">{processesList.length}</strong>
                <span className="block text-[10px] text-stone-500 mt-0.5">Centros cadastrados</span>
              </div>

              <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#dec1af]/40">
                <span className="block text-[11px] font-bold text-[#574335]">Processos Vinculados</span>
                <strong className="text-xl font-black text-amber-900">
                  {sectors.filter((s) => processesList.some((p) => p.id === s.costCenterId)).length}
                </strong>
                <span className="block text-[10px] text-stone-500 mt-0.5">Processos fabris alocados</span>
              </div>

              <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#dec1af]/40">
                <span className="block text-[11px] font-bold text-[#574335]">Equipamentos Alocados</span>
                <strong className="text-xl font-black text-emerald-800">
                  {equipmentList.filter((e) => processesList.some((p) => p.id === e.processId)).length}
                </strong>
                <span className="block text-[10px] text-stone-500 mt-0.5">Máquinas fabris vinculadas</span>
              </div>

              <div className="rounded-xl bg-[#f4f3f1] p-3.5 border border-[#dec1af]/40">
                <span className="block text-[11px] font-bold text-[#574335]">Colaboradores Alocados</span>
                <strong className="text-xl font-black text-sky-900">
                  {employees.filter((emp) =>
                    processesList.some((p) => p.id === emp.costCenterId || p.id === emp.processId || p.code === emp.costCenterCode)
                  ).length}
                </strong>
                <span className="block text-[10px] text-stone-500 mt-0.5">Mão de obra (MOD + MOI)</span>
              </div>
            </div>

            {/* Barra de Pesquisa */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Pesquisar por código ou descrição do centro de custo..."
                  value={costCenterSearch}
                  onChange={(e) => setCostCenterSearch(e.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>

              <span className="text-xs text-[#574335]">
                Exibindo <strong>{filteredCostCenters.length}</strong> de <strong>{processesList.length}</strong> centros de custo
              </span>
            </div>

            {/* Listagem de Centros de Custo */}
            <div className="overflow-x-auto rounded-xl border border-[#dec1af]/60">
              <table className="w-full text-xs">
                <thead className="bg-[#f4f3f1] text-[#574335] font-bold">
                  <tr>
                    <th className="p-3 text-left">Código</th>
                    <th className="p-3 text-left">Descrição</th>
                    <th className="p-3 text-right">Taxa Referência (R$/h)</th>
                    <th className="p-3 text-center">Processos de Fabricação</th>
                    <th className="p-3 text-center">Equipamentos Vinculados</th>
                    <th className="p-3 text-center">Colaboradores</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCostCenters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#574335]">
                        <Building2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                        <p className="font-semibold text-sm">Nenhum Centro de Custo encontrado</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {costCenterSearch
                            ? 'Nenhum resultado corresponde à pesquisa.'
                            : 'Clique em "Novo Centro de Custo" para cadastrar o primeiro centro fabril.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCostCenters.map((proc) => {
                      const linkedSectors = sectors.filter((s) => s.costCenterId === proc.id);
                      const linkedEq = equipmentList.filter((e) => e.processId === proc.id);
                      const linkedEmp = employees.filter(
                        (emp) => emp.costCenterId === proc.id || emp.processId === proc.id || emp.costCenterCode === proc.code
                      );

                      return (
                        <tr key={proc.id} className="border-b border-[#e9e8e6] hover:bg-stone-50 transition-colors">
                          <td className="p-3 font-bold text-[#1a1c1b] whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-[#954a00]/10 text-[#954a00] font-black">
                              {proc.code}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-[#1a1c1b]">
                            <div>{proc.description}</div>
                          </td>
                          <td className="p-3 text-right font-semibold text-[#1a1c1b]">
                            {proc.hourlyRate ? formatCurrency(proc.hourlyRate) : 'R$ 0,00'}/h
                          </td>
                          <td className="p-3 text-center">
                            {linkedSectors.length > 0 ? (
                              <span
                                title={linkedSectors.map((s) => s.name).join(', ')}
                                className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px]"
                              >
                                {linkedSectors.length} {linkedSectors.length === 1 ? 'processo' : 'processos'}
                              </span>
                            ) : (
                              <span className="text-stone-400 italic text-[11px]">0 processos</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {linkedEq.length > 0 ? (
                              <span
                                title={linkedEq.map((e) => e.name).join(', ')}
                                className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px]"
                              >
                                {linkedEq.length} {linkedEq.length === 1 ? 'máquina' : 'máquinas'}
                              </span>
                            ) : (
                              <span className="text-stone-400 italic text-[11px]">0 máquinas</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {linkedEmp.length > 0 ? (
                              <span
                                title={linkedEmp.map((e) => e.name).join(', ')}
                                className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 font-bold text-[11px]"
                              >
                                {linkedEmp.length} {linkedEmp.length === 1 ? 'colab.' : 'colabs.'}
                              </span>
                            ) : (
                              <span className="text-stone-400 italic text-[11px]">0 colabs.</span>
                            )}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                title="Editar Centro de Custo"
                                onClick={() => handleEditCostCenter(proc)}
                                className="p-1.5 rounded-lg text-stone-600 hover:bg-[#dec1af]/30 hover:text-[#954a00] transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Excluir Centro de Custo"
                                onClick={() => handleDeleteCostCenter(proc)}
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

            {/* Painel Informativo da Estrutura */}
            <div className="p-4 rounded-xl bg-[#f4f3f1] border border-[#dec1af]/40 text-xs text-[#574335] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#1a1c1b]">
                <Info className="w-4 h-4 text-[#954a00]" />
                <span>Hierarquia Organizacional e Contábil do ERP</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                <strong>CENTRO DE CUSTO</strong> (entidade <code className="bg-white px-1 py-0.5 rounded text-[10px]">production_processes</code>) agrega:{' '}
                <strong>SETORES</strong> (<code className="bg-white px-1 py-0.5 rounded text-[10px]">costCenterId</code>) onde trabalham os <strong>COLABORADORES</strong>;{' '}
                <strong>EQUIPAMENTOS</strong> (<code className="bg-white px-1 py-0.5 rounded text-[10px]">processId</code>) que depreciam e consomem energia por tempo real da OP;{' '}
                <strong>MANUTENÇÕES</strong> e <strong>MOI RATEADA</strong>. A exclusão de um Centro de Custo é bloqueada automaticamente enquanto houver vínculos ativos.
              </p>
            </div>
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
                      costCenterId: processesList[0]?.id || '',
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
              {/* Bloco 1: Dados Básicos */}
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

              {/* Bloco 2: Centro de Custo Vinculado & Classificação MOD vs MOI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f4f3f1]/70 p-4 rounded-2xl border border-[#dec1af]/40">
                {/* Seleção de Centro de Custo */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#574335] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#954a00]" />
                      Centro de Custo do Colaborador *
                    </label>
                    <button
                      type="button"
                      onClick={() => setTab('centros-custo')}
                      className="text-[11px] font-bold text-[#954a00] hover:underline"
                    >
                      + Gerenciar Centros de Custo
                    </button>
                  </div>

                  <select
                    id="select-emp-cost-center"
                    required
                    value={empForm.costCenterId || (processesList[0]?.id ?? '')}
                    onChange={(e) => setEmpForm({ ...empForm, costCenterId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Selecione o Centro de Custo...</option>
                    {processesList.map((proc) => (
                      <option key={proc.id} value={proc.id}>
                        [{proc.code}] {proc.description}
                      </option>
                    ))}
                  </select>

                  {/* Badge e Detalhes do Centro de Custo Selecionado */}
                  <div className="mt-2.5 p-2.5 rounded-xl bg-white border border-[#dec1af] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#574335]">Centro de Custo:</span>
                      <span className="px-2 py-0.5 rounded bg-amber-100 font-bold text-amber-900 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {selectedCostCenter
                          ? `[${selectedCostCenter.code}] ${selectedCostCenter.description}`
                          : 'Centro de Custo Geral'}
                      </span>
                    </div>
                    {selectedCostCenter && (
                      <span className="text-[11px] text-stone-500 font-medium">
                        Taxa ref: {formatCurrency(selectedCostCenter.hourlyRate || 0)}/h
                      </span>
                    )}
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
                    placeholder="Buscar nome, centro de custo, matrícula..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className={`${inputClass} pl-8 py-1.5 text-xs w-60`}
                  />
                </div>

                <div className="w-56">
                  <select
                    value={employeeCostCenterFilter}
                    onChange={(e) => setEmployeeCostCenterFilter(e.target.value)}
                    className={`${inputClass} py-1.5 text-xs`}
                  >
                    <option value="ALL">Todos os Centros de Custo</option>
                    {processesList.map((proc) => (
                      <option key={proc.id} value={proc.id}>
                        [{proc.code}] {proc.description}
                      </option>
                    ))}
                  </select>
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
                    <th className="p-3 text-left">Centro de Custo</th>
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
                      const empCC = processesList.find(
                        (p) => p.id === emp.costCenterId || p.id === emp.processId || p.code === emp.costCenterCode
                      );

                      return (
                        <tr key={emp.id} className="border-b border-[#e9e8e6] hover:bg-stone-50/80">
                          <td className="p-3">
                            <strong className="block text-[#1a1c1b]">{emp.name}</strong>
                            <span className="text-[11px] text-[#574335]">
                              {emp.code} • {emp.role || 'Geral'}
                            </span>
                          </td>

                          <td className="p-3">
                            {empCC ? (
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded bg-amber-100 font-bold text-amber-900 text-[11px]">
                                    {empCC.code}
                                  </span>
                                  <span className="font-semibold text-stone-800 text-xs">
                                    {empCC.description}
                                  </span>
                                </div>
                                {empCC.hourlyRate && (
                                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                                    Taxa ref: {formatCurrency(empCC.hourlyRate)}/h
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-stone-400 italic text-xs">Centro de Custo Geral</span>
                            )}
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
      {/* ABA: PROCESSOS DE FABRICAÇÃO (Vinculados aos Centros de Custo)            */}
      {/* ========================================================================= */}
      {tab === 'setores' && (
        <section id="section-processos-fabricacao" className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dec1af]/30 pb-5">
              <div>
                <h2 className="text-xl font-black text-[#1a1c1b] mt-1">
                  Processos de Fabricação
                </h2>
              </div>
            </div>

            {/* Formulário de Cadastro / Edição de Processo de Fabricação */}
            <div id="form-manufacturing-process" className="bg-[#f4f3f1] p-5 rounded-2xl border border-[#dec1af]/50 space-y-4">
              <div className="flex items-center justify-between border-b border-[#dec1af]/40 pb-3">
                <div className="flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-[#954a00]" />
                  <h3 className="font-bold text-sm text-[#1a1c1b]">
                    {editingProcessFormId ? `Editando Processo: ${processForm.name}` : 'Cadastrar Novo Processo de Fabricação'}
                  </h3>
                </div>

                {editingProcessFormId && (
                  <button
                    type="button"
                    onClick={handleCancelEditProcess}
                    className="px-2.5 py-1 text-xs text-stone-600 bg-white hover:bg-stone-100 rounded-lg font-medium border border-stone-200"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveManufacturingProcess} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Código do Processo</label>
                    <input
                      type="text"
                      placeholder="Ex: 001, 002"
                      value={processForm.code}
                      onChange={(e) => setProcessForm({ ...processForm, code: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className={labelClass}>Descrição do Processo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Fase Oleosa, Mistura, Embalagem"
                      value={processForm.name}
                      onChange={(e) => setProcessForm({ ...processForm, name: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className={labelClass}>Centro de Custo Vinculado *</label>
                    <select
                      required
                      value={processForm.costCenterId || (processesList[0]?.id ?? '')}
                      onChange={(e) => setProcessForm({ ...processForm, costCenterId: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Selecione o Centro de Custo...</option>
                      {processesList.map((proc) => (
                        <option key={proc.id} value={proc.id}>
                          [{proc.code}] {proc.description}
                        </option>
                      ))}
                      {processesList.length === 0 && (
                        <option value="proc-cc-001">[CC-01] Centro de Custo Fabril Geral (Padrão)</option>
                      )}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Status</label>
                    <select
                      value={processForm.active ? 'true' : 'false'}
                      onChange={(e) => setProcessForm({ ...processForm, active: e.target.value === 'true' })}
                      className={inputClass}
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  {editingProcessFormId && (
                    <button
                      type="button"
                      onClick={handleCancelEditProcess}
                      className="px-4 py-2 text-xs font-bold text-stone-600 bg-white hover:bg-stone-200 rounded-xl border border-stone-300"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#954a00] hover:bg-[#7a3c00] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {editingProcessFormId ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Salvar Alterações
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Cadastrar Processo de Fabricação
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Barra de Pesquisa e Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Pesquisar processo, código ou instrução..."
                    value={processSearch}
                    onChange={(e) => setProcessSearch(e.target.value)}
                    className={`${inputClass} pl-8 py-1.5 text-xs`}
                  />
                </div>

                <div className="w-full sm:w-60">
                  <select
                    value={processCostCenterFilter}
                    onChange={(e) => setProcessCostCenterFilter(e.target.value)}
                    className={`${inputClass} py-1.5 text-xs`}
                  >
                    <option value="ALL">Todos os Centros de Custo</option>
                    {processesList.map((proc) => (
                      <option key={proc.id} value={proc.id}>
                        [{proc.code}] {proc.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <span className="text-xs text-[#574335] whitespace-nowrap">
                Exibindo <strong>{filteredManufacturingProcesses.length}</strong> de <strong>{sectors.length}</strong> processos
              </span>
            </div>

            {/* Listagem de Processos de Fabricação */}
            <div className="overflow-x-auto rounded-xl border border-[#dec1af]/60">
              <table className="w-full text-xs">
                <thead className="bg-[#f4f3f1] text-[#574335] font-bold">
                  <tr>
                    <th className="p-3 text-left">Código</th>
                    <th className="p-3 text-left">Processo de Fabricação</th>
                    <th className="p-3 text-left">Centro de Custo Vinculado</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredManufacturingProcesses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#574335]">
                        <Workflow className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                        <p className="font-semibold text-sm">Nenhum processo de fabricação encontrado</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {processSearch || processCostCenterFilter !== 'ALL'
                            ? 'Nenhum resultado corresponde aos filtros informados.'
                            : 'Cadastre os processos operacionais utilizando o formulário acima.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredManufacturingProcesses.map((proc) => {
                      const cc = processesList.find((p) => p.id === proc.costCenterId);

                      return (
                        <tr key={proc.id} className="border-b border-[#e9e8e6] hover:bg-stone-50 transition-colors">
                          <td className="p-3 font-bold text-[#1a1c1b] whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-[#954a00]/10 text-[#954a00] font-black">
                              {proc.code}
                            </span>
                          </td>
                          <td className="p-3">
                            <strong className="block text-[#1a1c1b] text-sm">{proc.name}</strong>
                            {proc.description && (
                              <span className="text-[11px] text-stone-500 block mt-0.5">
                                {proc.description}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {cc ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-amber-100 font-bold text-amber-900 text-[11px]">
                                  {cc.code}
                                </span>
                                <span className="font-medium text-stone-800 text-xs">
                                  {cc.description}
                                </span>
                              </div>
                            ) : (
                              <span className="text-stone-400 italic text-xs">Centro de Custo Geral</span>
                            )}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleProcessActive(proc)}
                              title={proc.active !== false ? 'Clique para inativar processo' : 'Clique para ativar processo'}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                                proc.active !== false
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${proc.active !== false ? 'bg-emerald-600' : 'bg-stone-500'}`} />
                              {proc.active !== false ? 'Ativo' : 'Inativo'}
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                title="Editar Processo de Fabricação"
                                onClick={() => handleEditManufacturingProcess(proc)}
                                className="p-1.5 rounded-lg text-stone-600 hover:bg-amber-100 hover:text-amber-900 transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Remover Processo de Fabricação"
                                onClick={() => handleDeleteManufacturingProcess(proc.id, proc.name)}
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
      {/* ABA: EQUIPAMENTOS (CENTRALIZADO COM DEPRECIAÇÃO CIF E ENERGIA CIF) */}
      {/* ========================================================================= */}
      {tab === 'equipamentos' && (
        <section id="section-equipamentos" className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-6">
            {/* Cabeçalho da Aba */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#dec1af]/30 pb-5">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#954a00]">
                  Ativos Fabris & Custeio
                </span>
                <h2 className="text-xl font-black text-[#1a1c1b]">
                  Equipamentos & Máquinas Industriais
                </h2>
                <p className="text-xs text-[#574335] mt-0.5">
                  Gestão centralizada de ativos fabris, parâmetros de depreciação (CIF), potência/energia elétrica (CIF) e manutenção.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="btn-novo-equipamento"
                  onClick={handleOpenNewEquipment}
                  className="px-4 py-2.5 bg-[#954a00] hover:bg-[#7a3c00] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Novo Equipamento
                </button>
              </div>
            </div>

            {/* Painel de Indicadores Gerais da Frota */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#f4f3f1] border border-[#e9e8e6]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#574335]">
                  Equipamentos Ativos
                </span>
                <strong className="text-xl font-black text-[#1a1c1b]">
                  {equipmentList.length}
                </strong>
                <span className="block text-[10px] text-[#574335] mt-0.5">
                  Máquinas cadastradas
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  Potência Instalada
                </span>
                <strong className="text-xl font-black text-amber-800">
                  {equipmentList.reduce((acc, eq) => acc + (eq.powerKw || 0), 0).toFixed(1)} kW
                </strong>
                <span className="block text-[10px] text-amber-700 mt-0.5">
                  Carga total do parque
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-sky-900">
                  Total Valor de Aquisição
                </span>
                <strong className="text-xl font-black text-sky-800">
                  {formatCurrency(equipmentList.reduce((acc, eq) => acc + (eq.acquisitionCost || 0), 0))}
                </strong>
                <span className="block text-[10px] text-sky-700 mt-0.5">
                  Base depreciável fabril
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                  Depreciação Total / Mês
                </span>
                <strong className="text-xl font-black text-emerald-800">
                  {formatCurrency(
                    equipmentList.reduce((acc, eq) => {
                      const d = getEquipmentDepreciationDetails(eq);
                      return acc + d.monthlyDepreciation;
                    }, 0)
                  )}
                </strong>
                <span className="block text-[10px] text-emerald-700 mt-0.5">
                  Apurada como CIF
                </span>
              </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por código, nome ou descrição do equipamento..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#dec1af] bg-white text-[#1a1c1b] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#954a00]/30 transition-all"
                />
              </div>

              <div className="w-full sm:w-64">
                <select
                  value={equipmentProcessFilter}
                  onChange={(e) => setEquipmentProcessFilter(e.target.value)}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-[#dec1af] bg-white text-[#1a1c1b] focus:outline-none focus:ring-2 focus:ring-[#954a00]/30 transition-all"
                >
                  <option value="">Todos os Centros de Custo</option>
                  {processes.map((proc) => (
                    <option key={proc.id} value={proc.id}>
                      {proc.code} - {proc.description}
                    </option>
                  ))}
                </select>
              </div>

              {(equipmentSearch || equipmentProcessFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setEquipmentSearch('');
                    setEquipmentProcessFilter('');
                  }}
                  className="px-3 py-2 text-xs text-[#574335] hover:text-[#954a00] hover:bg-stone-100 rounded-xl transition-all"
                >
                  Limpar Filtros
                </button>
              )}
            </div>

            {/* Listagem de Equipamentos */}
            <div className="overflow-x-auto rounded-xl border border-[#dec1af]/60">
              <table className="w-full text-xs">
                <thead className="bg-[#f4f3f1] text-[#574335] font-bold">
                  <tr>
                    <th className="p-3 text-left">Código</th>
                    <th className="p-3 text-left">Equipamento</th>
                    <th className="p-3 text-left">Centro de Custo</th>
                    <th className="p-3 text-right">Aquisição</th>
                    <th className="p-3 text-right">Vida Útil</th>
                    <th className="p-3 text-right text-emerald-800">Depreciação / h [CIF]</th>
                    <th className="p-3 text-right text-amber-800">Potência</th>
                    <th className="p-3 text-right text-sky-800">Energia / h [CIF]</th>
                    <th className="p-3 text-right font-black text-[#1a1c1b]">Custo Máq. / h</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipment.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-[#574335]">
                        <Cpu className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                        <p className="font-semibold text-sm">Nenhum equipamento encontrado</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {equipmentSearch || equipmentProcessFilter
                            ? 'Ajuste os filtros de busca para ver resultados.'
                            : 'Clique em "Novo Equipamento" para cadastrar.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredEquipment.map((eq) => {
                      const proc = processes.find((p) => p.id === eq.processId);
                      const deprDetails = getEquipmentDepreciationDetails(eq);
                      const energyDetails = getEquipmentEnergyDetails(eq);
                      const directMachineCost =
                        deprDetails.hourlyDepreciation +
                        (eq.maintenanceCostPerHour || 0) +
                        (eq.otherCostPerHour || 0);

                      return (
                        <tr key={eq.id} className="border-b border-[#e9e8e6] hover:bg-stone-50 transition-colors">
                          <td className="p-3 font-bold text-[#1a1c1b] whitespace-nowrap">
                            {eq.code}
                          </td>
                          <td className="p-3 font-medium text-[#1a1c1b]">
                            <div>{eq.name}</div>
                            {eq.description && (
                              <div className="text-[10px] text-[#574335] truncate max-w-xs">
                                {eq.description}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-[#574335]">
                            {proc ? (
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium">
                                {proc.code} - {proc.description}
                              </span>
                            ) : (
                              <span className="text-stone-400 italic">Não vinculado</span>
                            )}
                          </td>
                          <td className="p-3 text-right text-[#574335] whitespace-nowrap">
                            {formatCurrency(eq.acquisitionCost || 0)}
                          </td>
                          <td className="p-3 text-right text-[#574335] whitespace-nowrap">
                            {eq.estimatedUsefulLife || 0} anos
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                            {formatCurrency(deprDetails.hourlyDepreciation)}
                          </td>
                          <td className="p-3 text-right text-amber-800 whitespace-nowrap">
                            {eq.powerKw ? `${eq.powerKw} kW` : '0 kW'}
                          </td>
                          <td className="p-3 text-right font-bold text-sky-800 whitespace-nowrap">
                            {formatCurrency(energyDetails.hourlyEnergyCost)}
                          </td>
                          <td className="p-3 text-right font-black text-[#1a1c1b] whitespace-nowrap">
                            {formatCurrency(directMachineCost)}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                title="Visualizar Detalhes"
                                onClick={() => setViewingEquipment(eq)}
                                className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Editar Equipamento"
                                onClick={() => handleOpenEditEquipment(eq)}
                                className="p-1.5 rounded-lg text-[#954a00] hover:bg-[#954a00]/10 transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Excluir Equipamento"
                                onClick={() => handleDeleteEquipmentClick(eq)}
                                className="p-1.5 rounded-lg text-stone-500 hover:bg-red-100 hover:text-red-700 transition-all"
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

          {/* ========================================================================= */}
          {/* MODAL: CADASTRO / EDIÇÃO DE EQUIPAMENTO */}
          {/* ========================================================================= */}
          {isEquipmentModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
              <div className="bg-white rounded-2xl border border-[#dec1af] shadow-2xl max-w-3xl w-full p-6 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#dec1af]/40 pb-4">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-[#954a00]">
                      {editingEquipmentId ? 'Edição de Ativo Fabril' : 'Novo Ativo Fabril'}
                    </span>
                    <h3 className="text-lg font-black text-[#1a1c1b]">
                      {editingEquipmentId
                        ? `Editar Equipamento: ${equipmentForm.name}`
                        : 'Cadastro de Equipamento & Parâmetros de Custo'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEquipmentModalOpen(false);
                      setEditingEquipmentId(null);
                    }}
                    className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEquipment} className="space-y-6">
                  {/* SEÇÃO 1: Identificação */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#574335] flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-[#954a00]" />
                      1. Identificação do Equipamento
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Código do Equipamento *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: EQ-MIST-01"
                          value={equipmentForm.code}
                          onChange={(e) => setEquipmentForm({ ...equipmentForm, code: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Nome do Equipamento *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Misturador Térmico Inox 50L"
                          value={equipmentForm.name}
                          onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Centro de Custo / Processo *</label>
                        <select
                          required
                          value={equipmentForm.processId}
                          onChange={(e) => setEquipmentForm({ ...equipmentForm, processId: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">Selecione o centro de custo...</option>
                          {processes.map((proc) => (
                            <option key={proc.id} value={proc.id}>
                              {proc.code} - {proc.description}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Descrição / Especificações Técnicas</label>
                        <input
                          type="text"
                          placeholder="Ex: Capacidade 50L, acabamento sanitário, controle eletrônico de rotação"
                          value={equipmentForm.description}
                          onChange={(e) => setEquipmentForm({ ...equipmentForm, description: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 2: Depreciação (CIF) */}
                  <div className="space-y-3 p-4 rounded-xl bg-emerald-50/40 border border-emerald-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-700" />
                        2. Depreciação do Ativo
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                        Classificação na Apuração: CIF - Depreciação
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className={labelClass}>Valor de Aquisição (R$)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={equipmentForm.acquisitionCost}
                          onChange={(e) => setEquipmentForm({ ...equipmentForm, acquisitionCost: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Valor Residual (R$)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={equipmentForm.residualValue}
                          onChange={(e) => setEquipmentForm({ ...equipmentForm, residualValue: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Vida Útil Estimada (anos)</label>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          value={equipmentForm.estimatedUsefulLife}
                          onChange={(e) => setEquipmentForm({ ...equipmentForm, estimatedUsefulLife: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Horas Produtivas / Mês</label>
                        <input
                          type="number"
                          step="any"
                          min="1"
                          value={equipmentForm.productiveHoursAvailable}
                          onChange={(e) => setEquipmentForm({ ...equipmentForm, productiveHoursAvailable: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Pré-visualização de cálculo de depreciação */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-center">
                        <span className="block text-[10px] uppercase font-bold text-[#574335]">
                          Valor Depreciável
                        </span>
                        <strong className="text-xs font-black text-emerald-800">
                          {formatCurrency(liveEquipmentCalc.depreciableValue)}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-center">
                        <span className="block text-[10px] uppercase font-bold text-[#574335]">
                          Depreciação Mensal
                        </span>
                        <strong className="text-xs font-black text-emerald-800">
                          {formatCurrency(liveEquipmentCalc.monthlyDepreciation)}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-300 text-center">
                        <span className="block text-[10px] uppercase font-bold text-emerald-900">
                          Depreciação / Hora (CIF)
                        </span>
                        <strong className="text-sm font-black text-emerald-700">
                          {formatCurrency(liveEquipmentCalc.hourlyDepreciation)} / h
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 3: Energia Elétrica (CIF) */}
                  <div className="space-y-3 p-4 rounded-xl bg-sky-50/40 border border-sky-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-sky-700" />
                        3. Energia Elétrica
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200 text-sky-900">
                        Custo de Energia = CIF (Custo Indireto de Fabricação)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Potência Nominal (kW)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={equipmentForm.powerKw}
                          onChange={(e) => setEquipmentForm({ ...equipmentForm, powerKw: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Tarifa de Energia (R$ / kWh)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={equipmentForm.energyTariff}
                          onChange={(e) => setEquipmentForm({ ...equipmentForm, energyTariff: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Pré-visualização de cálculo de energia */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="bg-white p-2.5 rounded-lg border border-sky-200 text-center">
                        <span className="block text-[10px] uppercase font-bold text-[#574335]">
                          Consumo Estimado / Mês
                        </span>
                        <strong className="text-xs font-black text-sky-900">
                          {formatNumber(liveEquipmentCalc.estimatedMonthlyKwh)} kWh
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-sky-300 text-center">
                        <span className="block text-[10px] uppercase font-bold text-sky-900">
                          Custo de Energia / Hora (CIF)
                        </span>
                        <strong className="text-sm font-black text-sky-800">
                          {formatCurrency(liveEquipmentCalc.hourlyEnergyCost)} / h
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-sky-200 text-center">
                        <span className="block text-[10px] uppercase font-bold text-[#574335]">
                          Custo Estimado / Mês
                        </span>
                        <strong className="text-xs font-black text-sky-900">
                          {formatCurrency(liveEquipmentCalc.estimatedMonthlyEnergyCost)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 4: Manutenção e Outros Custos */}
                  <div className="space-y-3 p-4 rounded-xl bg-amber-50/40 border border-amber-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-amber-700" />
                      4. Manutenção & Outros Custos Operacionais
                    </h4>

                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Custo de Manutenção Estimado (R$ / h)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={equipmentForm.maintenanceCostPerHour}
                          onChange={(e) => setEquipmentForm({ ...equipmentForm, maintenanceCostPerHour: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Outros Custos Operacionais (R$ / h)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={equipmentForm.otherCostPerHour}
                          onChange={(e) => setEquipmentForm({ ...equipmentForm, otherCostPerHour: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Resumo do custo da máquina sem energia */}
                    <div className="p-3 bg-white rounded-lg border border-amber-300 flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-bold text-[#1a1c1b]">
                          Custo Operacional Total do Equipamento / Hora
                        </span>
                        <span className="text-[10px] text-[#574335]">
                          Depreciação ({formatCurrency(liveEquipmentCalc.hourlyDepreciation)}) + Manutenção ({formatCurrency(Number(equipmentForm.maintenanceCostPerHour) || 0)}) + Outros ({formatCurrency(Number(equipmentForm.otherCostPerHour) || 0)})
                        </span>
                      </div>
                      <strong className="text-base font-black text-[#954a00]">
                        {formatCurrency(liveEquipmentCalc.hourlyDirectEquipmentCost)} / h
                      </strong>
                    </div>
                  </div>

                  {/* Botões do Formulário */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#dec1af]/40">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEquipmentModalOpen(false);
                        setEditingEquipmentId(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-[#574335] hover:bg-stone-100 rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#954a00] hover:bg-[#7a3c00] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {editingEquipmentId ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: VISUALIZAÇÃO DETALHADA DE EQUIPAMENTO */}
          {/* ========================================================================= */}
          {viewingEquipment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl border border-[#dec1af] shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#dec1af]/40 pb-4">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-[#954a00]">
                      Ficha do Ativo Fabril
                    </span>
                    <h3 className="text-lg font-black text-[#1a1c1b]">
                      {viewingEquipment.code} - {viewingEquipment.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingEquipment(null)}
                    className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Centro de custo e descrição */}
                  <div className="p-3.5 rounded-xl bg-[#f4f3f1] border border-[#e9e8e6] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#574335] font-bold">Centro de Custo / Processo:</span>
                      <span className="text-xs font-black text-[#1a1c1b]">
                        {(() => {
                          const p = processes.find((item) => item.id === viewingEquipment.processId);
                          return p ? `${p.code} - ${p.description}` : 'Não vinculado';
                        })()}
                      </span>
                    </div>
                    {viewingEquipment.description && (
                      <p className="text-xs text-[#574335] pt-1">
                        <strong>Descrição:</strong> {viewingEquipment.description}
                      </p>
                    )}
                  </div>

                  {/* Seção Depreciação */}
                  {(() => {
                    const depr = getEquipmentDepreciationDetails(viewingEquipment);
                    const energy = getEquipmentEnergyDetails(viewingEquipment);
                    const machineHourCost =
                      depr.hourlyDepreciation +
                      (viewingEquipment.maintenanceCostPerHour || 0) +
                      (viewingEquipment.otherCostPerHour || 0);

                    return (
                      <>
                        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-900 uppercase">
                              Depreciação (CIF)
                            </span>
                            <span className="text-xs font-black text-emerald-800">
                              {formatCurrency(depr.hourlyDepreciation)} / hora
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-[10px] text-stone-500 block">Aquisição:</span>
                              <strong className="text-stone-800">{formatCurrency(viewingEquipment.acquisitionCost)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-500 block">Residual:</span>
                              <strong className="text-stone-800">{formatCurrency(viewingEquipment.residualValue)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-500 block">Vida Útil:</span>
                              <strong className="text-stone-800">{viewingEquipment.estimatedUsefulLife} anos</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-500 block">Mensal:</span>
                              <strong className="text-stone-800">{formatCurrency(depr.monthlyDepreciation)}/mês</strong>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-sky-900 uppercase">
                              Energia Elétrica (CIF)
                            </span>
                            <span className="text-xs font-black text-sky-800">
                              {formatCurrency(energy.hourlyEnergyCost)} / hora
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-[10px] text-stone-500 block">Potência:</span>
                              <strong className="text-stone-800">{viewingEquipment.powerKw || 0} kW</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-500 block">Tarifa:</span>
                              <strong className="text-stone-800">{formatCurrency(viewingEquipment.energyTariff || 0)}/kWh</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-500 block">Consumo Mensal:</span>
                              <strong className="text-stone-800">{formatNumber(energy.estimatedMonthlyKwh)} kWh</strong>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-amber-900 uppercase">
                              Custo Operacional da Máquina / Hora (Sem Energia)
                            </span>
                            <span className="text-sm font-black text-[#954a00]">
                              {formatCurrency(machineHourCost)} / hora
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[10px] text-stone-500 block">Manutenção Estimada:</span>
                              <strong className="text-stone-800">{formatCurrency(viewingEquipment.maintenanceCostPerHour || 0)}/h</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-500 block">Outros Custos / Hora:</span>
                              <strong className="text-stone-800">{formatCurrency(viewingEquipment.otherCostPerHour || 0)}/h</strong>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="flex justify-end pt-3 border-t border-[#dec1af]/40">
                  <button
                    type="button"
                    onClick={() => {
                      const eq = viewingEquipment;
                      setViewingEquipment(null);
                      handleOpenEditEquipment(eq);
                    }}
                    className="px-4 py-2 bg-[#954a00] text-white rounded-xl text-xs font-bold hover:bg-[#7a3c00] transition-all flex items-center gap-1.5 mr-2"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingEquipment(null)}
                    className="px-4 py-2 text-xs font-bold text-[#574335] hover:bg-stone-100 rounded-xl transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
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
              {equipmentList.map((item) => (
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
      {tab === 'indiretos' && (() => {
        // Custos indiretos filtrados por competência mensal
        const filteredIndirectCosts = indirectMonthFilter === 'ALL'
          ? indirectCosts
          : indirectCosts.filter((c) => (c.competence || '').slice(0, 7) === indirectMonthFilter);

        const totalFilteredIndirect = filteredIndirectCosts.reduce(
          (sum, c) => sum + (c.active !== false ? c.amount : 0),
          0
        );

        // OPs do mês selecionado
        const ordersInMonth = indirectMonthFilter === 'ALL'
          ? orders
          : orders.filter((o) => (o.openingDate || o.productionStart || '').slice(0, 7) === indirectMonthFilter);

        const avgIndirectPerOrder = ordersInMonth.length > 0
          ? totalFilteredIndirect / ordersInMonth.length
          : totalFilteredIndirect;

        // Lista de meses disponíveis para seleção rápida
        const distinctMonths = Array.from(
          new Set(
            [
              new Date().toISOString().slice(0, 7),
              ...indirectCosts.map((c) => (c.competence || '').slice(0, 7)),
              ...orders.map((o) => (o.openingDate || o.productionStart || '').slice(0, 7)),
            ].filter(Boolean)
          )
        ).sort().reverse();

        return (
          <section className="space-y-6">
            {/* Header com Contexto de Competência Mensal */}
            <div className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-amber-100 text-[#954a00]">
                      <Calendar className="w-5 h-5" />
                    </span>
                    <h2 className="font-black text-xl text-[#1a1c1b]">
                      Custos Indiretos Gerais de Fabricação (CIF)
                    </h2>
                  </div>
                  <p className="text-xs text-[#574335] mt-1 max-w-2xl">
                    Cadastre despesas industriais indiretas (energia, aluguel, utilidades, terceirizados). 
                    Cada lançamento possui <strong>data de lançamento</strong> para apuração do rateio exato no mês correspondente da Ordem de Produção.
                  </p>
                </div>

                {/* Filtro do Mês a ser analisado */}
                <div className="flex items-center gap-2 bg-[#f4f3f1] p-2 rounded-xl border border-[#dec1af]/50">
                  <div className="text-right pr-2 border-r border-[#dec1af]/40">
                    <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      Mês Analisado
                    </span>
                    <span className="text-xs font-black text-[#954a00]">
                      {indirectMonthFilter === 'ALL' ? 'Todos os Meses' : `${indirectMonthFilter.slice(5, 7)}/${indirectMonthFilter.slice(0, 4)}`}
                    </span>
                  </div>

                  <input
                    type="month"
                    value={indirectMonthFilter === 'ALL' ? '' : indirectMonthFilter}
                    onChange={(e) => setIndirectMonthFilter(e.target.value || 'ALL')}
                    className="px-2 py-1.5 bg-white border border-[#dec1af] rounded-lg text-xs font-bold text-[#1a1c1b] focus:outline-none focus:ring-2 focus:ring-[#954a00]"
                  />

                  <button
                    type="button"
                    onClick={() => setIndirectMonthFilter(indirectMonthFilter === 'ALL' ? new Date().toISOString().slice(0, 7) : 'ALL')}
                    className="px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-[#dec1af] rounded-lg text-[11px] font-bold text-[#574335] transition-colors"
                  >
                    {indirectMonthFilter === 'ALL' ? 'Mês Atual' : 'Ver Todos'}
                  </button>
                </div>
              </div>

              {/* Indicadores do Mês Analisado */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#dec1af]/30">
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                  <span className="block text-[10px] font-bold uppercase text-amber-900 tracking-wider">
                    Total Indireto do Mês
                  </span>
                  <strong className="text-xl font-black text-[#954a00]">
                    {formatCurrency(totalFilteredIndirect)}
                  </strong>
                  <span className="block text-[10px] text-amber-800 mt-0.5">
                    {indirectMonthFilter === 'ALL' ? 'Acumulado geral' : `Competência ${indirectMonthFilter.slice(5, 7)}/${indirectMonthFilter.slice(0, 4)}`}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="block text-[10px] font-bold uppercase text-stone-600 tracking-wider">
                    Lançamentos
                  </span>
                  <strong className="text-xl font-black text-stone-900">
                    {filteredIndirectCosts.length}
                  </strong>
                  <span className="block text-[10px] text-stone-500 mt-0.5">
                    {filteredIndirectCosts.length === 1 ? '1 custo registrado' : `${filteredIndirectCosts.length} custos registrados`}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="block text-[10px] font-bold uppercase text-stone-600 tracking-wider">
                    OPs no Período
                  </span>
                  <strong className="text-xl font-black text-stone-900">
                    {ordersInMonth.length}
                  </strong>
                  <span className="block text-[10px] text-stone-500 mt-0.5">
                    {ordersInMonth.length === 1 ? '1 ordem de produção' : `${ordersInMonth.length} ordens de produção`}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <span className="block text-[10px] font-bold uppercase text-emerald-900 tracking-wider">
                    Rateio Médio Estimado / OP
                  </span>
                  <strong className="text-xl font-black text-emerald-800">
                    {formatCurrency(avgIndirectPerOrder)}
                  </strong>
                  <span className="block text-[10px] text-emerald-700 mt-0.5">
                    Proporcional às horas/volume
                  </span>
                </div>
              </div>
            </div>

            {/* Formulário: Lançamento de Novo Custo Indireto com Data */}
            <div className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#dec1af]/30">
                <div>
                  <h3 className="font-bold text-sm text-[#1a1c1b] flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#954a00]" />
                    Novo Lançamento de Custo Indireto (CIF)
                  </h3>
                  <p className="text-[11px] text-[#574335]">
                    Informe a data de competência para associar ao mês correto de rateio das OPs.
                  </p>
                </div>

                {indirect.competence && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-200">
                    Competência Selecionada: {indirect.competence.slice(5, 7)}/{indirect.competence.slice(0, 4)}
                  </span>
                )}
              </div>

              <form onSubmit={saveIndirect} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Data de Lançamento */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#574335] mb-1">
                      Data de Lançamento *
                    </label>
                    <input
                      type="date"
                      required
                      value={indirect.competence}
                      onChange={(e) => setIndirect({ ...indirect, competence: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  {/* Código */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#574335] mb-1">
                      Código (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder={`Ex: CIF-${String(indirectCosts.length + 1).padStart(3, '0')}`}
                      value={indirect.code}
                      onChange={(e) => setIndirect({ ...indirect, code: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  {/* Descrição */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[#574335] mb-1">
                      Descrição do Custo Indireto *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Energia Elétrica Fabril, Aluguel do Galpão, Água..."
                      value={indirect.description}
                      onChange={(e) => setIndirect({ ...indirect, description: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  {/* Categoria */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#574335] mb-1">
                      Categoria do Custo *
                    </label>
                    <select
                      value={indirect.category}
                      onChange={(e) => setIndirect({ ...indirect, category: e.target.value })}
                      className={inputClass}
                    >
                      <option value="Energia Elétrica Industrial">Energia Elétrica Industrial</option>
                      <option value="Aluguel Fabril">Aluguel Fabril</option>
                      <option value="Utilidades">Utilidades (Água, Gás)</option>
                      <option value="Manutenção Predial">Manutenção Predial / Instalações</option>
                      <option value="Serviços de Terceiros">Serviços de Terceiros</option>
                      <option value="Limpeza e Higienização">Limpeza e Higienização</option>
                      <option value="Segurança e Vigilância">Segurança e Vigilância</option>
                      <option value="Insumos Indiretos">Insumos Indiretos / EPIs</option>
                      <option value="Custos Gerais Fabris">Custos Gerais Fabris</option>
                    </select>
                  </div>

                  {/* Classificação */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#574335] mb-1">
                      Classificação *
                    </label>
                    <select
                      value={indirect.classification}
                      onChange={(e) => setIndirect({ ...indirect, classification: e.target.value as 'FIXO' | 'VARIAVEL' })}
                      className={inputClass}
                    >
                      <option value="FIXO">Fixo</option>
                      <option value="VARIAVEL">Variável</option>
                    </select>
                  </div>

                  {/* Centro de Custo */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#574335] mb-1">
                      Centro de Custo / Processo
                    </label>
                    <select
                      value={indirect.processId}
                      onChange={(e) => setIndirect({ ...indirect, processId: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Geral da Fábrica (Comum a todas as etapas)</option>
                      {processesList.map((proc) => (
                        <option key={proc.id} value={proc.id}>
                          {proc.code} - {proc.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Valor */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#574335] mb-1">
                      Valor (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0,00"
                      value={indirect.amount}
                      onChange={(e) => setIndirect({ ...indirect, amount: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  {/* Observação / Documento */}
                  <div className="sm:col-span-2 md:col-span-4">
                    <label className="block text-[11px] font-bold text-[#574335] mb-1">
                      Observação / Documento Fiscal (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Fatura 998243, Fornecedor Enel, ref. Setembro/2026..."
                      value={indirect.observation}
                      onChange={(e) => setIndirect({ ...indirect, observation: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#954a00] hover:bg-[#7c3d00] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Custo Indireto
                  </button>
                </div>
              </form>
            </div>

            {/* Listagem de Custos Indiretos Lançados */}
            <div className="bg-white rounded-2xl border border-[#dec1af] p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#dec1af]/30">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#1a1c1b]">
                    Custos Indiretos Registrados
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold">
                    {filteredIndirectCosts.length} {filteredIndirectCosts.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                {indirectMonthFilter !== 'ALL' && (
                  <span className="text-xs text-[#574335]">
                    Exibindo lançamentos do mês <strong>{indirectMonthFilter.slice(5, 7)}/{indirectMonthFilter.slice(0, 4)}</strong>
                  </span>
                )}
              </div>

              {filteredIndirectCosts.length === 0 ? (
                <div className="py-12 text-center text-[#574335] space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="font-bold text-sm text-stone-700">
                    Nenhum custo indireto encontrado para {indirectMonthFilter === 'ALL' ? 'o período' : `o mês ${indirectMonthFilter.slice(5, 7)}/${indirectMonthFilter.slice(0, 4)}`}.
                  </p>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    Utilize o formulário acima para registrar despesas industriais com a data do mês a ser analisado.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredIndirectCosts.map((item) => {
                    const proc = item.processId ? processesList.find((p) => p.id === item.processId) : null;
                    const compDateFormatted = item.competence
                      ? `${item.competence.slice(8, 10)}/${item.competence.slice(5, 7)}/${item.competence.slice(0, 4)}`
                      : 'Sem data';
                    const compMonth = item.competence ? `${item.competence.slice(5, 7)}/${item.competence.slice(0, 4)}` : '-';

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-[#fcfbfa] hover:bg-stone-50 border border-[#dec1af]/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-[#954a00] font-black text-[11px] border border-amber-200">
                              {item.code}
                            </span>

                            <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-bold text-[11px] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-stone-500" />
                              Lançamento: {compDateFormatted}
                            </span>

                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-bold text-[10px] border border-amber-200">
                              Mês de Rateio: {compMonth}
                            </span>

                            <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-medium text-[10px]">
                              {item.category}
                            </span>

                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              item.classification === 'FIXO'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-purple-50 text-purple-800 border border-purple-200'
                            }`}>
                              {item.classification}
                            </span>

                            {proc && (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                CC: {proc.code} - {proc.description}
                              </span>
                            )}
                          </div>

                          <div className="text-sm font-bold text-[#1a1c1b]">
                            {item.description}
                          </div>

                          {item.observation && (
                            <p className="text-xs text-stone-500 italic">
                              {item.observation}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#dec1af]/30">
                          <div className="text-right">
                            <span className="block text-[10px] uppercase font-bold text-stone-500">
                              Valor do Lançamento
                            </span>
                            <span className="text-lg font-black text-[#954a00]">
                              {formatCurrency(item.amount)}
                            </span>
                          </div>

                          {/* Botão de Excluir Lançamento */}
                          <button
                            type="button"
                            onClick={() => handleDeleteIndirect(item)}
                            title="Excluir Custo Indireto"
                            className="p-2.5 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-xl transition-all shadow-2xs"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })()}

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

      {/* Modal: Cadastro / Edição de Centro de Custo */}
      {isCostCenterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dec1af] shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-[#dec1af]/40 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#954a00]" />
                <h3 className="text-lg font-black text-[#1a1c1b]">
                  {editingCostCenterId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCostCenterModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCostCenter} className="space-y-4">
              <div>
                <label className={labelClass}>Código do Centro de Custo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CC-01, CC-FORJA, CC-USINAGEM"
                  value={costCenterForm.code}
                  onChange={(e) =>
                    setCostCenterForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                  }
                  className={inputClass}
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Identificador alfanumérico único para alocação de setores e máquinas.
                </span>
              </div>

              <div>
                <label className={labelClass}>Descrição / Nome do Centro de Custo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Forjaria e Conformação, Usinagem CNC, Montagem"
                  value={costCenterForm.description}
                  onChange={(e) =>
                    setCostCenterForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Taxa Horária de Referência (R$/h)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costCenterForm.hourlyRate}
                  onChange={(e) =>
                    setCostCenterForm((prev) => ({ ...prev, hourlyRate: e.target.value }))
                  }
                  className={inputClass}
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Taxa padrão de referência por hora de processo (opcional).
                </span>
              </div>

              <div className="p-3 bg-[#f4f3f1] rounded-xl border border-[#dec1af]/40 text-[11px] text-[#574335]">
                Ao salvar, este Centro de Custo fica imediatamente disponível para vincular novos Setores e Equipamentos sem perder nenhum dado já existente.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#dec1af]/30">
                <button
                  type="button"
                  onClick={() => setIsCostCenterModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#954a00] hover:bg-[#7a3c00] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingCostCenterId ? 'Atualizar Centro de Custo' : 'Salvar Centro de Custo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação e desvinculação para Centro de Custo */}
      {costCenterToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#dec1af]/60 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#dec1af]/30 flex items-center justify-between bg-[#fdfbf9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1a1c1b]">Excluir Centro de Custo</h3>
                  <p className="text-xs text-[#574335]">Confirmação de exclusão no sistema fabril</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCostCenterToDelete(null)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-[#1a1c1b]">
              {/* Identificação do Centro de Custo */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md bg-[#954a00]/10 text-[#954a00] font-black text-xs">
                  {costCenterToDelete.proc.code}
                </span>
                <div className="font-semibold text-sm text-[#1a1c1b]">
                  {costCenterToDelete.proc.description}
                </div>
              </div>

              {/* Verifica se possui vínculos */}
              {(() => {
                const { linkedSectors, linkedEq, linkedSteps, linkedEmp } = costCenterToDelete;
                const hasLinks =
                  linkedSectors.length > 0 ||
                  linkedEq.length > 0 ||
                  linkedSteps.length > 0 ||
                  linkedEmp.length > 0;

                if (hasLinks) {
                  return (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Este Centro de Custo possui cadastros vinculados:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800 pl-1">
                          {linkedSectors.length > 0 && (
                            <li>
                              <strong>{linkedSectors.length} setor(es) fabril(is):</strong>{' '}
                              {linkedSectors.map((s) => s.name).join(', ')}
                            </li>
                          )}
                          {linkedEq.length > 0 && (
                            <li>
                              <strong>{linkedEq.length} equipamento(s):</strong>{' '}
                              {linkedEq.map((e) => `${e.name} (${e.code})`).join(', ')}
                            </li>
                          )}
                          {linkedEmp.length > 0 && (
                            <li>
                              <strong>{linkedEmp.length} colaborador(es) associado(s):</strong>{' '}
                              {linkedEmp.map((e) => e.name).join(', ')}
                            </li>
                          )}
                          {linkedSteps.length > 0 && (
                            <li>
                              <strong>{linkedSteps.length} etapa(s) de roteiro</strong>
                            </li>
                          )}
                        </ul>
                      </div>
                      <p className="text-[11px] text-[#574335] leading-relaxed">
                        Para manter a integridade do seu sistema, o botão abaixo irá{' '}
                        <strong>desvincular automaticamente</strong> esses registros (eles continuarão existindo normalmente na fábrica) e concluirá a exclusão do Centro de Custo.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <p className="text-sm text-stone-700">
                      Tem certeza que deseja excluir o Centro de Custo{' '}
                      <strong>
                        [{costCenterToDelete.proc.code}] {costCenterToDelete.proc.description}
                      </strong>
                      ?
                    </p>
                    <p className="text-xs text-stone-500">
                      Este centro não possui setores ou máquinas vinculadas no momento. A exclusão será imediata.
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-stone-50 border-t border-[#dec1af]/30 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCostCenterToDelete(null)}
                className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>

              {costCenterToDelete.linkedSectors.length > 0 ||
              costCenterToDelete.linkedEq.length > 0 ||
              costCenterToDelete.linkedSteps.length > 0 ||
              costCenterToDelete.linkedEmp.length > 0 ? (
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteCostCenter(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Desvincular Registros e Excluir
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteCostCenter(false)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirmar Exclusão
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal genérico de confirmação para outros cadastros */}
      {genericConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#dec1af]/60 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#dec1af]/30 flex items-center justify-between bg-[#fdfbf9]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    genericConfirmModal.isDestructive ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {genericConfirmModal.isDestructive ? (
                    <Trash2 className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1a1c1b]">{genericConfirmModal.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGenericConfirmModal(null)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-[#1a1c1b]">
              <p className="text-stone-700 leading-relaxed">{genericConfirmModal.description}</p>
              {genericConfirmModal.details && genericConfirmModal.details.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  {genericConfirmModal.details.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 bg-stone-50 border-t border-[#dec1af]/30 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setGenericConfirmModal(null)}
                className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={genericConfirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 text-white cursor-pointer ${
                  genericConfirmModal.isDestructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#954a00] hover:bg-[#7a3c00]'
                }`}
              >
                {genericConfirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
