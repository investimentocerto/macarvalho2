'use client';

import React, { useEffect, useState } from 'react';
import { Calculator, Plus } from 'lucide-react';
import { dbService } from '@/lib/db-service';
import { calculateEmployeeHourlyCost, calculateProductionOrderCost, formatCurrency } from '@/lib/industrial-costs';
import { CostCharge, CostEmployee, CostOperation, Equipment, EquipmentMaintenance, IndirectCost, InventoryItem, ProcessStepItem, ProductionEntry, ProductionMaterialSeparation, ProductionOrder, ProductionProcess, Product } from '@/lib/types';

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

type Tab = 'apuracao' | 'ops' | 'colaboradores' | 'encargos' | 'equipamentos' | 'depreciacao' | 'manutencao' | 'indiretos';
const tabs: [Tab, string][] = [['apuracao', 'Apuração'], ['ops', 'OPs'], ['colaboradores', 'Colaboradores'], ['encargos', 'Encargos'], ['equipamentos', 'Equipamentos'], ['depreciacao', 'Depreciação'], ['manutencao', 'Manutenção'], ['indiretos', 'Custos Indiretos']];
const inputClass = 'w-full rounded-lg border border-[#dec1af] bg-white px-3 py-2 text-xs';

export const IndustrialCostsView: React.FC<IndustrialCostsViewProps> = ({ orders, entries, steps, separations, inventory, equipment, onCloseOrder, onNotify }) => {
  const [tab, setTab] = useState<Tab>('apuracao');
  const [orderId, setOrderId] = useState(orders[0]?.id || '');
  const [operation, setOperation] = useState<CostOperation | null>(null);
  const [employees, setEmployees] = useState<CostEmployee[]>([]);
  const [charges, setCharges] = useState<CostCharge[]>([]);
  const [indirectCosts, setIndirectCosts] = useState<IndirectCost[]>([]);
  const [maintenance, setMaintenance] = useState<EquipmentMaintenance[]>([]);
  const [employee, setEmployee] = useState({ code: '', name: '', role: '', sector: '', salary: '0', charges: '0', hours: '0', laborType: 'DIRETA' as CostEmployee['laborType'] });
  const [charge, setCharge] = useState({ code: '', description: '', percent: '0' });
  const [indirect, setIndirect] = useState({ code: '', description: '', category: 'Energia', amount: '0', competence: new Date().toISOString().slice(0, 10) });
  const [maintenanceForm, setMaintenanceForm] = useState({ equipmentId: equipment[0]?.id || '', amount: '0', date: new Date().toISOString().slice(0, 10), type: 'Preventiva' });

  useEffect(() => {
    Promise.all([dbService.fetchCostEmployees(), dbService.fetchCostCharges(), dbService.fetchIndirectCosts(), dbService.fetchMaintenance()]).then(([loadedEmployees, loadedCharges, loadedIndirect, loadedMaintenance]) => {
      if (loadedEmployees) setEmployees(loadedEmployees);
      if (loadedCharges) setCharges(loadedCharges);
      if (loadedIndirect) setIndirectCosts(loadedIndirect);
      if (loadedMaintenance) setMaintenance(loadedMaintenance);
    });
  }, []);

  const calculate = () => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;
    const result = calculateProductionOrderCost({ order, entries, steps, separations, inventory, employees, equipment, indirectCosts, maintenance });
    setOperation(result);
    dbService.saveCostOperation(result).then((saved) => onNotify?.(saved ? 'Custo da OP apurado e salvo.' : 'Falha ao salvar a apuração no banco.'));
  };

  const saveEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    const item: CostEmployee = { id: `employee-${Date.now()}`, code: employee.code, name: employee.name, role: employee.role, sector: employee.sector, laborType: employee.laborType, baseSalary: Number(employee.salary) || 0, additions: 0, benefits: 0, chargePercent: Number(employee.charges) || 0, monthlyHours: Number(employee.hours) || 0, productiveHours: Number(employee.hours) || 0, hourlyCost: 0, active: true };
    item.hourlyCost = calculateEmployeeHourlyCost(item);
    if (await dbService.saveCostEmployee(item)) { setEmployees((current) => [item, ...current]); onNotify?.('Colaborador cadastrado.'); }
  };

  const saveCharge = async (event: React.FormEvent) => {
    event.preventDefault();
    const item: CostCharge = { id: `charge-${Date.now()}`, code: charge.code, description: charge.description, percent: Number(charge.percent) || 0, chargeType: 'OUTROS', active: true };
    if (await dbService.saveCostCharge(item)) { setCharges((current) => [item, ...current]); onNotify?.('Encargo cadastrado.'); }
  };

  const saveIndirect = async (event: React.FormEvent) => {
    event.preventDefault();
    const item: IndirectCost = { id: `indirect-${Date.now()}`, code: indirect.code, description: indirect.description, category: indirect.category, amount: Number(indirect.amount) || 0, competence: indirect.competence, classification: 'FIXO', observation: '', active: true };
    if (await dbService.saveIndirectCost(item)) { setIndirectCosts((current) => [item, ...current]); onNotify?.('Custo indireto cadastrado.'); }
  };

  const saveMaintenance = async (event: React.FormEvent) => {
    event.preventDefault();
    const item: EquipmentMaintenance = { id: `maintenance-${Date.now()}`, equipmentId: maintenanceForm.equipmentId, maintenanceType: maintenanceForm.type, maintenanceDate: maintenanceForm.date, amount: Number(maintenanceForm.amount) || 0, supplier: '', observation: '' };
    if (await dbService.saveMaintenance(item)) { setMaintenance((current) => [item, ...current]); onNotify?.('Manutenção cadastrada.'); }
  };

  const order = orders.find((item) => item.id === orderId);
  const formField = (label: string, value: string, onChange: (value: string) => void, type = 'text') => <label className="text-xs font-bold text-[#574335]">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} mt-1`} /></label>;

  return <div className="space-y-6 pb-12 animate-fadeIn">
    <div><p className="text-xs uppercase tracking-[0.2em] text-[#574335] font-bold">Apuração integrada</p><h1 className="text-3xl font-black text-[#1a1c1b]">Custos Industriais</h1><p className="text-sm text-[#574335] mt-1">Cálculo baseado em OPs, materiais separados, roteiro, tempos e equipamentos.</p></div>
    <div className="flex flex-wrap gap-2 border-b border-[#dec1af]/50 pb-3">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-3 py-2 rounded-lg text-xs font-bold ${tab === id ? 'bg-[#954a00] text-white' : 'bg-white text-[#574335] border border-[#dec1af]'}`}>{label}</button>)}</div>

    {tab === 'apuracao' && <section className="bg-white rounded-2xl border border-[#dec1af]/50 p-5 space-y-5"><div className="flex items-end gap-3"><label className="text-xs font-bold text-[#574335]">OP<select value={orderId} onChange={(event) => setOrderId(event.target.value)} className={`${inputClass} mt-1 min-w-72`}><option value="">Selecione uma OP</option>{orders.map((item) => <option key={item.id} value={item.id}>{item.opNumber} - {item.productName}</option>)}</select></label><button onClick={calculate} disabled={!order} className="px-4 py-2 bg-[#954a00] text-white rounded-xl text-xs font-bold disabled:bg-stone-300"><Calculator className="w-4 h-4 inline mr-1" />Apurar custo</button></div>{operation && <><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">{[['Materiais', operation.materialCost], ['MOD', operation.directLaborCost], ['MOI', operation.indirectLaborCost], ['Energia', operation.energyCost], ['Manutenção', operation.maintenanceCost], ['Depreciação', operation.depreciationCost], ['Outros CIF', operation.otherIndirectCost], ['Custo industrial', operation.totalCost], ['Custo unitário', operation.unitCost]].map(([label, value]) => <div key={label as string} className="rounded-xl bg-[#f4f3f1] p-3"><span className="block text-xs text-[#574335]">{label}</span><strong className="text-lg">{formatCurrency(value as number)}</strong></div>)}</div><div className="grid grid-cols-2 gap-4 text-sm"><div className="p-3 rounded-xl bg-[#f4f3f1]">Quantidade embalagem: <b>{operation.finishedQuantity}</b></div><div className="p-3 rounded-xl bg-[#f4f3f1]">Rendimento: <b>{operation.yieldPercent.toFixed(2)}%</b> | Perda: <b>{operation.lossQuantity}</b></div></div><button onClick={() => order && onCloseOrder?.(order, { ...operation, status: 'FECHADO', closedAt: new Date().toISOString() })} disabled={!order || operation.finishedQuantity <= 0} className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:bg-stone-300">Fechar OP e lançar produto acabado</button><table className="w-full text-xs"><thead className="bg-[#f4f3f1]"><tr><th className="p-3 text-left">Etapa</th><th className="p-3 text-right">Horas</th><th className="p-3 text-right">MOD</th><th className="p-3 text-right">Equipamento</th><th className="p-3 text-right">Total</th></tr></thead><tbody>{operation.steps.map((item) => <tr key={item.id} className="border-b border-[#e9e8e6]"><td className="p-3">{steps.find((step) => step.id === item.stepId)?.title || item.stepId}</td><td className="p-3 text-right">{item.durationHours.toFixed(2)}</td><td className="p-3 text-right">{formatCurrency(item.laborCost)}</td><td className="p-3 text-right">{formatCurrency(item.equipmentCost)}</td><td className="p-3 text-right font-bold">{formatCurrency(item.totalCost)}</td></tr>)}</tbody></table></>}</section>}

    {tab === 'ops' && <section className="bg-white rounded-2xl border border-[#dec1af]/50 p-5"><h2 className="font-bold text-lg">Ordens para apuração</h2><div className="mt-4 space-y-2">{orders.map((item) => <div key={item.id} className="flex justify-between items-center p-3 rounded-lg bg-[#f4f3f1] text-xs"><span><b>{item.opNumber}</b> - {item.productName}</span><button onClick={() => { setOrderId(item.id); setTab('apuracao'); }} className="text-[#954a00] font-bold">APURAR CUSTO</button></div>)}</div></section>}

    {tab === 'colaboradores' && <section className="bg-white rounded-2xl border border-[#dec1af]/50 p-5"><h2 className="font-bold text-lg">Colaboradores</h2><form onSubmit={saveEmployee} className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">{formField('Código', employee.code, (value) => setEmployee({ ...employee, code: value }))}{formField('Nome', employee.name, (value) => setEmployee({ ...employee, name: value }))}{formField('Cargo', employee.role, (value) => setEmployee({ ...employee, role: value }))}{formField('Setor', employee.sector, (value) => setEmployee({ ...employee, sector: value }))}{formField('Salário', employee.salary, (value) => setEmployee({ ...employee, salary: value }), 'number')}{formField('Encargos %', employee.charges, (value) => setEmployee({ ...employee, charges: value }), 'number')}{formField('Horas produtivas', employee.hours, (value) => setEmployee({ ...employee, hours: value }), 'number')}<button className="self-end px-3 py-2 bg-[#954a00] text-white rounded-xl font-bold"><Plus className="w-4 h-4 inline mr-1" />Cadastrar</button></form><div className="mt-5 space-y-2">{employees.map((item) => <div key={item.id} className="flex justify-between p-3 rounded-lg bg-[#f4f3f1] text-xs">{item.code} - {item.name} ({item.laborType}) <b>{formatCurrency(item.hourlyCost)}/h</b></div>)}</div></section>}

    {tab === 'encargos' && <section className="bg-white rounded-2xl border border-[#dec1af]/50 p-5"><h2 className="font-bold text-lg">Encargos</h2><form onSubmit={saveCharge} className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">{formField('Código', charge.code, (value) => setCharge({ ...charge, code: value }))}{formField('Descrição', charge.description, (value) => setCharge({ ...charge, description: value }))}{formField('Percentual', charge.percent, (value) => setCharge({ ...charge, percent: value }), 'number')}<button className="self-end px-3 py-2 bg-[#954a00] text-white rounded-xl font-bold"><Plus className="w-4 h-4 inline mr-1" />Cadastrar</button></form><div className="mt-5 space-y-2">{charges.map((item) => <div key={item.id} className="p-3 rounded-lg bg-[#f4f3f1] text-xs">{item.code} - {item.description}: <b>{item.percent}%</b></div>)}</div></section>}

    {tab === 'equipamentos' && <section className="bg-white rounded-2xl border border-[#dec1af]/50 p-5"><h2 className="font-bold text-lg">Equipamentos</h2><div className="mt-4 space-y-2">{equipment.map((item) => <div key={item.id} className="flex justify-between p-3 rounded-lg bg-[#f4f3f1] text-xs"><span>{item.code} - {item.name}</span><span>{item.powerKw || 0} kW | tarifa {formatCurrency(item.energyTariff || 0)}</span></div>)}</div></section>}

    {tab === 'depreciacao' && <section className="bg-white rounded-2xl border border-[#dec1af]/50 p-5"><h2 className="font-bold text-lg">Depreciação</h2><div className="mt-4 space-y-2">{equipment.map((item) => <div key={item.id} className="p-3 rounded-lg bg-[#f4f3f1] text-xs">{item.name}: aquisição {formatCurrency(item.acquisitionCost)}, residual {formatCurrency(item.residualValue)}, vida útil {item.estimatedUsefulLife} anos</div>)}</div></section>}

    {tab === 'manutencao' && <section className="bg-white rounded-2xl border border-[#dec1af]/50 p-5"><h2 className="font-bold text-lg">Manutenção</h2><form onSubmit={saveMaintenance} className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4"><select className={inputClass} value={maintenanceForm.equipmentId} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, equipmentId: event.target.value })}>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{formField('Tipo', maintenanceForm.type, (value) => setMaintenanceForm({ ...maintenanceForm, type: value }))}{formField('Data', maintenanceForm.date, (value) => setMaintenanceForm({ ...maintenanceForm, date: value }), 'date')}{formField('Valor', maintenanceForm.amount, (value) => setMaintenanceForm({ ...maintenanceForm, amount: value }), 'number')}<button className="self-end px-3 py-2 bg-[#954a00] text-white rounded-xl font-bold"><Plus className="w-4 h-4 inline mr-1" />Cadastrar</button></form><div className="mt-5 space-y-2">{maintenance.map((item) => <div key={item.id} className="p-3 rounded-lg bg-[#f4f3f1] text-xs">{item.maintenanceDate}: {formatCurrency(item.amount)}</div>)}</div></section>}

    {tab === 'indiretos' && <section className="bg-white rounded-2xl border border-[#dec1af]/50 p-5"><h2 className="font-bold text-lg">Custos Indiretos</h2><form onSubmit={saveIndirect} className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">{formField('Código', indirect.code, (value) => setIndirect({ ...indirect, code: value }))}{formField('Descrição', indirect.description, (value) => setIndirect({ ...indirect, description: value }))}{formField('Categoria', indirect.category, (value) => setIndirect({ ...indirect, category: value }))}{formField('Valor', indirect.amount, (value) => setIndirect({ ...indirect, amount: value }), 'number')}<button className="self-end px-3 py-2 bg-[#954a00] text-white rounded-xl font-bold"><Plus className="w-4 h-4 inline mr-1" />Cadastrar</button></form><div className="mt-5 space-y-2">{indirectCosts.map((item) => <div key={item.id} className="p-3 rounded-lg bg-[#f4f3f1] text-xs">{item.code} - {item.description}: <b>{formatCurrency(item.amount)}</b></div>)}</div></section>}
  </div>;
};