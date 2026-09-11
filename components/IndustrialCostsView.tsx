'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, CheckCircle2, DollarSign, Factory, FileText, Pencil, Plus, Trash2, Copy, TrendingUp } from 'lucide-react';
import {
  INDUSTRIAL_COSTS_STORAGE_KEY,
  INDUSTRIAL_COST_MONTHS,
  IndustrialCostRecord,
  calculateIndustrialCostSnapshot,
  formatBarValue,
  formatCurrency,
  getNextMonth,
} from '@/lib/industrial-costs';

interface IndustrialCostsViewProps {
  onNotify?: (message: string) => void;
}

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const defaultForm = {
  year: currentYear,
  month: currentMonth,
  productionQuantity: 100000,
  erpTotalCost: 100000,
  utilities: 5000,
  consumables: 2500,
  notes: '',
};

function loadRecords(): IndustrialCostRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(INDUSTRIAL_COSTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecords(records: IndustrialCostRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INDUSTRIAL_COSTS_STORAGE_KEY, JSON.stringify(records));
}

function buildEmptyRecord(form: typeof defaultForm): IndustrialCostRecord {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    year: Number(form.year),
    month: Number(form.month),
    productionQuantity: Number(form.productionQuantity),
    erpTotalCost: Number(form.erpTotalCost),
    utilities: Number(form.utilities),
    consumables: Number(form.consumables),
    notes: form.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const IndustrialCostsView: React.FC<IndustrialCostsViewProps> = ({ onNotify }) => {
  const [records, setRecords] = useState<IndustrialCostRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState('');

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesYear = filterYear ? Number(record.year) === Number(filterYear) : true;
      const matchesMonth = filterMonth ? Number(record.month) === Number(filterMonth) : true;
      return matchesYear && matchesMonth;
    });
  }, [records, filterYear, filterMonth]);

  const selectedRecord = records.find((record) => record.id === selectedRecordId) || null;

  const currentSnapshot = useMemo(() => {
    const snapshot = calculateIndustrialCostSnapshot({
      erpTotalCost: Number(form.erpTotalCost),
      utilities: Number(form.utilities),
      consumables: Number(form.consumables),
      productionQuantity: Number(form.productionQuantity),
    });

    return snapshot;
  }, [form]);

  const cardStats = useMemo(() => {
    if (records.length === 0) {
      return {
        erpTotalCost: 0,
        utilities: 0,
        consumables: 0,
        totalAdditional: 0,
        productionQuantity: 0,
        erpPerBar: 0,
        additionalPerBar: 0,
        realisticCost: 0,
        realisticCostPerBar: 0,
      };
    }

    const latest = [...records].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    const snapshot = calculateIndustrialCostSnapshot(latest);

    return {
      erpTotalCost: latest.erpTotalCost,
      utilities: latest.utilities,
      consumables: latest.consumables,
      totalAdditional: snapshot.totalAdditionalCost,
      productionQuantity: latest.productionQuantity,
      erpPerBar: latest.productionQuantity > 0 ? latest.erpTotalCost / latest.productionQuantity : 0,
      additionalPerBar: snapshot.additionalCostPerBar,
      realisticCost: snapshot.realisticCost,
      realisticCostPerBar: snapshot.realisticCostPerBar,
    };
  }, [records]);

  const saveRecord = () => {
    const yearValue = Number(form.year);
    const monthValue = Number(form.month);
    const productionQuantity = Number(form.productionQuantity);
    const erpTotalCost = Number(form.erpTotalCost);
    const utilities = Number(form.utilities);
    const consumables = Number(form.consumables);

    if (!yearValue) {
      setValidationError('Informe o ano.');
      return;
    }

    if (!monthValue) {
      setValidationError('Informe o mês.');
      return;
    }

    if (utilities < 0) {
      setValidationError('O valor não pode ser negativo.');
      return;
    }

    if (consumables < 0) {
      setValidationError('O valor não pode ser negativo.');
      return;
    }

    if (productionQuantity <= 0) {
      setValidationError('A quantidade produzida deve ser maior que zero.');
      return;
    }

    const duplicate = records.some(
      (record) =>
        record.year === yearValue &&
        record.month === monthValue &&
        (!isEditing || record.id !== selectedRecordId)
    );

    if (duplicate) {
      setValidationError('Já existe um cadastro para este mês.');
      return;
    }

    const nextRecord = buildEmptyRecord(form);
    const existing = isEditing && selectedRecordId ? records : [];

    const updatedList = isEditing && selectedRecordId
      ? records.map((record) => (record.id === selectedRecordId ? { ...record, ...nextRecord, updatedAt: new Date().toISOString() } : record))
      : [nextRecord, ...records];

    setRecords(updatedList);
    saveRecords(updatedList);
    setValidationError(null);
    setSelectedRecordId(isEditing && selectedRecordId ? selectedRecordId : nextRecord.id);
    setIsEditing(false);
    if (onNotify) onNotify('Dados salvos com sucesso.');
  };

  const handleEdit = (record: IndustrialCostRecord) => {
    setIsEditing(true);
    setSelectedRecordId(record.id);
    setForm({
      year: record.year,
      month: record.month,
      productionQuantity: record.productionQuantity,
      erpTotalCost: record.erpTotalCost,
      utilities: record.utilities,
      consumables: record.consumables,
      notes: record.notes,
    });
    setValidationError(null);
  };

  const handleDuplicate = (record: IndustrialCostRecord) => {
    const { year, month } = getNextMonth(record.year, record.month);
    const duplicateRecord = {
      ...record,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      year,
      month,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: record.notes ? `${record.notes} (duplicado)` : 'Duplicado',
    };

    const updatedList = [duplicateRecord, ...records];
    setRecords(updatedList);
    saveRecords(updatedList);
    if (onNotify) onNotify('Cadastro duplicado com sucesso.');
  };

  const handleDelete = (recordId: string) => {
    const target = records.find((record) => record.id === recordId);
    if (!target) return;

    const updatedList = records.filter((record) => record.id !== recordId);
    setRecords(updatedList);
    saveRecords(updatedList);

    if (selectedRecordId === recordId) {
      setSelectedRecordId(null);
      setIsEditing(false);
      setForm(defaultForm);
    }

    if (onNotify) onNotify('Cadastro removido com sucesso.');
  };

  const handleReset = () => {
    setIsEditing(false);
    setSelectedRecordId(null);
    setForm(defaultForm);
    setValidationError(null);
  };

  const summaryCards = [
    { label: 'Custo do ERP', value: formatCurrency(cardStats.erpTotalCost), icon: DollarSign },
    { label: 'Utilidades', value: formatCurrency(cardStats.utilities), icon: Calculator },
    { label: 'Consumíveis', value: formatCurrency(cardStats.consumables), icon: FileText },
    { label: 'Total de Custos Adicionais', value: formatCurrency(cardStats.totalAdditional), icon: TrendingUp },
    { label: 'Quantidade Produzida', value: `${new Intl.NumberFormat('pt-BR').format(cardStats.productionQuantity)} barras`, icon: Factory },
    { label: 'Custo do ERP por Barra', value: formatCurrency(cardStats.erpPerBar), icon: DollarSign },
    { label: 'Custo Adicional por Barra', value: formatCurrency(cardStats.additionalPerBar), icon: Calculator },
    { label: 'Custo Industrial Realista', value: formatCurrency(cardStats.realisticCost), icon: TrendingUp },
    { label: 'Custo Industrial Realista por Barra', value: formatCurrency(cardStats.realisticCostPerBar), icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#574335] font-bold">Gestão industrial</p>
          <h1 className="text-3xl font-black text-[#1a1c1b] tracking-tight">Custos Industriais</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-[#dec1af]/50 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium text-[#574335]">{label}</span>
              <div className="rounded-full bg-[#fef3c7] p-2 text-[#954a00]">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className={`text-xl font-black ${label === 'Custo Industrial Realista por Barra' ? 'text-[#954a00] text-2xl' : 'text-[#1a1c1b]'}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="rounded-2xl border border-[#dec1af]/50 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1a1c1b]">Período</h2>
            <button onClick={handleReset} className="text-xs font-bold text-[#954a00] underline">Limpar formulário</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2 text-sm text-[#1a1c1b]">
              <span className="font-medium">Ano</span>
              <input
                type="number"
                value={form.year}
                onChange={(event) => setForm((prev) => ({ ...prev, year: Number(event.target.value) }))}
                className="w-full rounded-xl border border-[#dec1af] bg-[#faf9f7] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#954a00]/20"
                min={2024}
              />
            </label>

            <label className="space-y-2 text-sm text-[#1a1c1b]">
              <span className="font-medium">Mês</span>
              <select
                value={form.month}
                onChange={(event) => setForm((prev) => ({ ...prev, month: Number(event.target.value) }))}
                className="w-full rounded-xl border border-[#dec1af] bg-[#faf9f7] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#954a00]/20"
              >
                <option value="">Selecione</option>
                {INDUSTRIAL_COST_MONTHS.map((monthName, index) => (
                  <option key={monthName} value={index + 1}>{monthName}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-bold text-[#1a1c1b]">Custos Industriais Adicionais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2 text-sm text-[#1a1c1b]">
                <span className="font-medium">Utilidades</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.utilities}
                  onChange={(event) => setForm((prev) => ({ ...prev, utilities: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-[#dec1af] bg-[#faf9f7] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#954a00]/20"
                />
              </label>

              <label className="space-y-2 text-sm text-[#1a1c1b]">
                <span className="font-medium">Consumíveis</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.consumables}
                  onChange={(event) => setForm((prev) => ({ ...prev, consumables: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-[#dec1af] bg-[#faf9f7] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#954a00]/20"
                />
              </label>
            </div>

            <div className="rounded-xl bg-[#f6f1ea] p-3 text-sm text-[#1a1c1b]">
              <span className="font-bold">Total de Custos Adicionais:</span>{' '}
              <span className="font-black text-[#954a00]">{formatCurrency(currentSnapshot.totalAdditionalCost)}</span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-bold text-[#1a1c1b]">Dados de Produção</h3>
            <label className="space-y-2 text-sm text-[#1a1c1b]">
              <span className="font-medium">Quantidade produzida de barras</span>
              <input
                type="number"
                step="1"
                min="1"
                value={form.productionQuantity}
                onChange={(event) => setForm((prev) => ({ ...prev, productionQuantity: Number(event.target.value) }))}
                className="w-full rounded-xl border border-[#dec1af] bg-[#faf9f7] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#954a00]/20"
              />
            </label>
            <div className="rounded-xl bg-[#f4f3f1] p-3 text-sm text-[#1a1c1b]">
              <span className="font-bold">Custo Adicional por Barra:</span>{' '}
              <span className="font-black text-[#954a00]">{formatBarValue(currentSnapshot.additionalCostPerBar)}</span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-bold text-[#1a1c1b]">Dados do ERP</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-2 text-sm text-[#1a1c1b]">
                <span className="font-medium">Custo total do ERP</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.erpTotalCost}
                  onChange={(event) => setForm((prev) => ({ ...prev, erpTotalCost: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-[#dec1af] bg-[#faf9f7] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#954a00]/20"
                />
              </label>

              <label className="space-y-2 text-sm text-[#1a1c1b]">
                <span className="font-medium">Quantidade produzida</span>
                <input
                  type="number"
                  step="1"
                  value={form.productionQuantity}
                  readOnly
                  className="w-full rounded-xl border border-[#dec1af] bg-[#f0efe9] px-3 py-2.5 text-sm text-[#574335]"
                />
              </label>

              <label className="space-y-2 text-sm text-[#1a1c1b]">
                <span className="font-medium">Custo do ERP por barra</span>
                <input
                  type="text"
                  value={formatCurrency(form.productionQuantity > 0 ? form.erpTotalCost / form.productionQuantity : 0)}
                  readOnly
                  className="w-full rounded-xl border border-[#dec1af] bg-[#f0efe9] px-3 py-2.5 text-sm text-[#574335]"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-lg font-bold text-[#1a1c1b]">Cálculo do Custo Industrial Realista</h3>
            <div className="mt-3 flex flex-col gap-2 text-sm text-[#1a1c1b]">
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span>Custo do ERP</span>
                <span className="font-bold">{formatCurrency(form.erpTotalCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span>Custos Industriais Adicionais</span>
                <span className="font-bold">{formatCurrency(currentSnapshot.totalAdditionalCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#954a00] px-3 py-2 text-white">
                <span>Custo Industrial Realista</span>
                <span className="font-black">{formatCurrency(currentSnapshot.realisticCost)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <h3 className="text-lg font-bold text-[#1a1c1b]">Observações</h3>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-[#dec1af] bg-[#faf9f7] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#954a00]/20"
              placeholder="Descreva observações relevantes sobre este mês de custo..."
            />
          </div>

          {validationError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 font-medium">
              {validationError}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={saveRecord}
              className="inline-flex items-center gap-2 rounded-xl bg-[#954a00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#7a3b00]"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isEditing ? 'Salvar alterações' : 'Salvar cadastro'}
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dec1af] bg-white px-4 py-2.5 text-sm font-bold text-[#1a1c1b] hover:bg-[#f4f3f1]"
            >
              <Plus className="h-4 w-4" />
              Novo cadastro
            </button>
          </div>
        </section>

        <aside className="rounded-2xl border border-[#dec1af]/50 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-[#1a1c1b]">Resultado</h2>
          <div className="mt-5 rounded-2xl bg-[#1a1c1b] p-5 text-white shadow-lg">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-300">Custo Industrial Realista por Barra</p>
            <div className="mt-3 text-3xl font-black text-amber-300">{formatCurrency(currentSnapshot.realisticCostPerBar)}</div>
          </div>

          <div className="mt-5 space-y-3 text-sm text-[#1a1c1b]">
            <div className="rounded-xl bg-[#f4f3f1] p-3 flex items-center justify-between">
              <span>Custo do ERP por Barra</span>
              <span className="font-bold">{formatCurrency(form.productionQuantity > 0 ? form.erpTotalCost / form.productionQuantity : 0)}</span>
            </div>
            <div className="rounded-xl bg-[#f4f3f1] p-3 flex items-center justify-between">
              <span>Custo Adicional por Barra</span>
              <span className="font-bold">{formatCurrency(currentSnapshot.additionalCostPerBar)}</span>
            </div>
          </div>
        </aside>
      </div>

      <section className="rounded-2xl border border-[#dec1af]/50 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#1a1c1b]">Histórico de Custos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm text-[#1a1c1b]">
              <span className="mb-1 block font-medium">Ano</span>
              <select value={filterYear} onChange={(event) => setFilterYear(Number(event.target.value))} className="w-full rounded-xl border border-[#dec1af] bg-[#faf9f7] px-3 py-2.5 text-sm">
                <option value="">Todos</option>
                {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-[#1a1c1b]">
              <span className="mb-1 block font-medium">Mês</span>
              <select value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)} className="w-full rounded-xl border border-[#dec1af] bg-[#faf9f7] px-3 py-2.5 text-sm">
                <option value="">Todos</option>
                {INDUSTRIAL_COST_MONTHS.map((monthName, index) => (
                  <option key={monthName} value={String(index + 1)}>{monthName}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#dec1af]/40 bg-[#f4f3f1] text-[#574335]">
                <th className="px-3 py-3 font-semibold">Ano</th>
                <th className="px-3 py-3 font-semibold">Mês</th>
                <th className="px-3 py-3 font-semibold">Quantidade Produzida</th>
                <th className="px-3 py-3 font-semibold">Custo do ERP</th>
                <th className="px-3 py-3 font-semibold">Utilidades</th>
                <th className="px-3 py-3 font-semibold">Consumíveis</th>
                <th className="px-3 py-3 font-semibold">Total de Custos Adicionais</th>
                <th className="px-3 py-3 font-semibold">Custo Industrial Realista</th>
                <th className="px-3 py-3 font-semibold">Custo Industrial Realista por Barra</th>
                <th className="px-3 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-[#574335]">
                    Nenhum custo cadastrado para este filtro.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const snapshot = calculateIndustrialCostSnapshot(record);
                  return (
                    <tr key={record.id} className="border-b border-[#e9e8e6] align-top">
                      <td className="px-3 py-3">{record.year}</td>
                      <td className="px-3 py-3">{INDUSTRIAL_COST_MONTHS[(record.month - 1) % INDUSTRIAL_COST_MONTHS.length]}</td>
                      <td className="px-3 py-3">{new Intl.NumberFormat('pt-BR').format(record.productionQuantity)}</td>
                      <td className="px-3 py-3">{formatCurrency(record.erpTotalCost)}</td>
                      <td className="px-3 py-3">{formatCurrency(record.utilities)}</td>
                      <td className="px-3 py-3">{formatCurrency(record.consumables)}</td>
                      <td className="px-3 py-3">{formatCurrency(snapshot.totalAdditionalCost)}</td>
                      <td className="px-3 py-3">{formatCurrency(snapshot.realisticCost)}</td>
                      <td className="px-3 py-3 font-bold text-[#954a00]">{formatCurrency(snapshot.realisticCostPerBar)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(record)} className="rounded-lg border border-[#dec1af] bg-white p-2 text-[#954a00] hover:bg-[#f4f3f1]" title="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDuplicate(record)} className="rounded-lg border border-[#dec1af] bg-white p-2 text-[#1a1c1b] hover:bg-[#f4f3f1]" title="Duplicar">
                            <Copy className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(record.id)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100" title="Excluir">
                            <Trash2 className="h-4 w-4" />
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
      </section>
    </div>
  );
};
