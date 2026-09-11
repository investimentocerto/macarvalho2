'use client';

import React, { useState, useMemo } from 'react';
import { ProductionProcess } from '@/lib/types';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Factory, 
  Clock, 
  DollarSign, 
  Calculator, 
  X, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';

interface ProductionProcessesViewProps {
  processes: ProductionProcess[];
  onAddProcess: (process: ProductionProcess) => void;
  onUpdateProcess: (process: ProductionProcess) => void;
  onDeleteProcess: (id: string) => void;
  onNotify: (msg: string) => void;
}

export const ProductionProcessesView: React.FC<ProductionProcessesViewProps> = ({
  processes,
  onAddProcess,
  onUpdateProcess,
  onDeleteProcess,
  onNotify,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProductionProcess | null>(null);
  const [processToDelete, setProcessToDelete] = useState<ProductionProcess | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [sampleUnitsPerHour, setSampleUnitsPerHour] = useState('20');

  // Open modal for new process
  const handleOpenNew = () => {
    setEditingProcess(null);
    setCode('');
    setDescription('');
    setHourlyRate('');
    setSampleUnitsPerHour('20');
    setIsModalOpen(true);
  };

  // Open modal for editing process
  const handleOpenEdit = (proc: ProductionProcess) => {
    setEditingProcess(proc);
    setCode(proc.code);
    setDescription(proc.description);
    setHourlyRate(proc.hourlyRate.toString());
    setSampleUnitsPerHour('20');
    setIsModalOpen(true);
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !code.trim()) {
      onNotify('Por favor preencha o código do centro de custo e a descrição.');
      return;
    }

    const rate = parseFloat(hourlyRate) || 0;

    if (editingProcess) {
      const updated: ProductionProcess = {
        ...editingProcess,
        code: code.trim().toUpperCase(),
        description: description.trim(),
        hourlyRate: rate,
      };
      onUpdateProcess(updated);
      onNotify(`Processo "${updated.code}" atualizado com sucesso!`);
    } else {
      const newProc: ProductionProcess = {
        id: `proc-cc-${Date.now()}`,
        code: code.trim().toUpperCase(),
        description: description.trim(),
        hourlyRate: rate,
        createdAt: new Date().toISOString(),
      };
      onAddProcess(newProc);
      onNotify(`Processo "${newProc.code}" cadastrado com sucesso!`);
    }

    setIsModalOpen(false);
  };

  // Filtered list
  const filteredProcesses = useMemo(() => {
    return processes.filter((p) => {
      const term = searchTerm.toLowerCase();
      return (
        p.code.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
      );
    });
  }, [processes, searchTerm]);

  // Statistics
  const avgHourlyRate = useMemo(() => {
    if (processes.length === 0) return 0;
    const sum = processes.reduce((acc, p) => acc + p.hourlyRate, 0);
    return sum / processes.length;
  }, [processes]);

  const maxRateProcess = useMemo(() => {
    if (processes.length === 0) return null;
    return [...processes].sort((a, b) => b.hourlyRate - a.hourlyRate)[0];
  }, [processes]);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#ffdcc6] text-[#954a00] flex items-center gap-1.5">
              <Factory className="w-3.5 h-3.5" />
              Engenharia & Custos
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1c1b]">
            Processos Produtivos & Centros de Custo
          </h1>
          <p className="text-xs sm:text-sm text-[#574335] mt-0.5">
            Cadastre as etapas de produção artesanal, centros de custo e valor hora para cálculo automático no Roteiro de Produção (BOM).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-add-process"
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Processo Produtivo
          </button>
        </div>
      </div>

      {/* Quick KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#dec1af]/40 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#ffdcc6]/60 flex items-center justify-center text-[#954a00] shrink-0">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#574335] font-semibold block">Total de Processos</span>
            <span className="text-2xl font-bold text-[#1a1c1b]">{processes.length}</span>
            <span className="text-[11px] text-[#574335] block">Centros de Custo ativos</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#dec1af]/40 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#574335] font-semibold block">Valor Hora Médio</span>
            <span className="text-2xl font-bold text-[#1a1c1b]">
              R$ {avgHourlyRate.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[11px] text-[#574335] block">Média por centro de custo</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#dec1af]/40 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[#574335] font-semibold block">Fórmula de Apropriação</span>
            <span className="text-sm font-bold text-[#1a1c1b] truncate block">
              Valor Hora ÷ Produção/h
            </span>
            <span className="text-[11px] text-emerald-700 block font-medium">
              Rateio unitário automático
            </span>
          </div>
        </div>
      </div>

      {/* Process Table & Info Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#dec1af]/40 overflow-hidden flex flex-col">
        {/* Search & Filter Header */}
        <div className="p-4 bg-[#f4f3f1] border-b border-[#dec1af]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#574335]/60 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#dec1af]/60 rounded-xl text-xs text-[#1a1c1b] placeholder:text-[#574335]/50 focus:outline-none focus:ring-2 focus:ring-[#954a00]/30"
            />
          </div>

          <div className="text-xs text-[#574335] flex items-center gap-2 self-end sm:self-center">
            <span>Mostrando <b>{filteredProcesses.length}</b> de {processes.length} processos</span>
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          {filteredProcesses.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-[#574335]">
              <Factory className="w-12 h-12 text-[#dec1af] mb-3" />
              <h3 className="font-bold text-base text-[#1a1c1b]">Nenhum processo produtivo cadastrado</h3>
              <p className="text-xs text-[#574335] mt-1 max-w-sm">
                Cadastre processos como &quot;Mistura & Aquecimento&quot;, &quot;Envase Artesanal&quot; ou &quot;Rotulagem&quot; com o respectivo valor hora do centro de custo.
              </p>
              <button
                onClick={handleOpenNew}
                className="mt-4 px-4 py-2 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Primeiro Processo
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-[#f4f3f1] text-[#574335] uppercase tracking-wider font-semibold border-b border-[#dec1af]/30 h-10">
                  <th className="py-2.5 px-4 w-36">Cód. Centro Custo</th>
                  <th className="py-2.5 px-4">Descrição do Processo</th>
                  <th className="py-2.5 px-4 text-right w-36">Valor Hora (R$/h)</th>
                  <th className="py-2.5 px-4 w-44 text-center">Exemplo (20 un/h)</th>
                  <th className="py-2.5 px-4 text-center w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9e8e6]">
                {filteredProcesses.map((proc) => {
                  const sampleCost = proc.hourlyRate > 0 ? (proc.hourlyRate / 20) : 0;

                  return (
                    <tr 
                      key={proc.id} 
                      onClick={() => handleOpenEdit(proc)}
                      className="hover:bg-[#f4f3f1] transition-colors group cursor-pointer h-12"
                      title="Clique para editar este processo"
                    >
                      <td className="px-4 font-mono font-bold text-[#954a00]">
                        <span className="px-2 py-0.5 bg-[#ffdcc6] rounded-md border border-[#dec1af]/50">
                          {proc.code}
                        </span>
                      </td>
                      <td className="px-4 font-medium text-[#1a1c1b]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{proc.description}</span>
                        </div>
                      </td>
                      <td className="px-4 text-right font-bold text-[#1a1c1b] text-sm">
                        R$ {proc.hourlyRate.toFixed(2).replace('.', ',')}
                        <span className="text-[10px] text-[#574335] font-normal block">/ hora</span>
                      </td>
                      <td className="px-4 text-center text-[#574335]">
                        <span className="inline-block px-2 py-1 bg-stone-100 rounded-md font-mono text-[11px] font-semibold text-stone-800">
                          R$ {sampleCost.toFixed(2).replace('.', ',')} / un
                        </span>
                      </td>
                      <td className="px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(proc)}
                            className="p-1.5 text-[#574335] hover:text-[#954a00] hover:bg-amber-50 rounded-lg transition-colors"
                            title="Editar processo"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProcessToDelete(proc)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover processo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Info Box */}
        <div className="p-4 bg-[#fbfaf8] border-t border-[#dec1af]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#574335]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#954a00] shrink-0" />
            <span>
              Ao adicionar etapas no <b>Roteiro de Produção da Estrutura (BOM)</b>, você selecionará estes centros de custo e informará a produção estimada por hora.
            </span>
          </div>
          <span className="font-semibold text-[#954a00]">MaCarvalho Engenharia</span>
        </div>
      </div>

      {/* Modal: Cadastro / Edição de Processo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-[#954a00] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Factory className="w-4 h-4 text-amber-200" />
                {editingProcess ? 'Editar Processo Produtivo' : 'Novo Processo Produtivo'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-bold text-[#574335] mb-1">
                    Cód. Centro de Custo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CC-01 ou CC-MIST"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border border-[#dec1af] rounded-xl font-mono font-bold text-[#954a00] uppercase focus:ring-2 focus:ring-[#954a00]/20 focus:border-[#954a00]"
                  />
                  <span className="text-[10px] text-[#574335] mt-0.5 block">Identificador contábil</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#574335] mb-1">
                    Descrição do Processo Produtivo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mistura e Homogeneização a Quente"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-xl focus:ring-2 focus:ring-[#954a00]/20 focus:border-[#954a00]"
                  />
                  <span className="text-[10px] text-[#574335] mt-0.5 block">Nome da atividade fabril</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1 flex items-center justify-between">
                  <span>Valor Hora do Centro de Custo (R$/hora) *</span>
                  <span className="text-[11px] text-[#954a00] font-normal">Custo total hora-máquina / artesão</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-[#574335]">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0,00"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-[#dec1af] rounded-xl font-bold text-sm text-[#1a1c1b] focus:ring-2 focus:ring-[#954a00]/20 focus:border-[#954a00]"
                  />
                </div>
              </div>

              {/* Real-time Calculation Simulator */}
              <div className="p-3.5 bg-[#ffdcc6]/30 rounded-xl border border-[#dec1af]/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#954a00] flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5" />
                    Simulador da Fórmula de Custo:
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-[#574335]">
                    <span>Produção por hora:</span>
                    <input
                      type="number"
                      min="1"
                      value={sampleUnitsPerHour}
                      onChange={(e) => setSampleUnitsPerHour(e.target.value)}
                      className="w-14 p-1 bg-white border border-[#dec1af] rounded text-center font-bold text-xs"
                    />
                    <span>un/h</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#dec1af]/40 text-xs">
                  <span className="text-[#574335]">
                    R$ {(parseFloat(hourlyRate) || 0).toFixed(2).replace('.', ',')} / hora ÷ {(parseFloat(sampleUnitsPerHour) || 1)} un/hora =
                  </span>
                  <span className="font-bold text-sm text-[#954a00]">
                    R$ {((parseFloat(hourlyRate) || 0) / (parseFloat(sampleUnitsPerHour) || 1)).toFixed(2).replace('.', ',')} / un
                  </span>
                </div>
                <p className="text-[10px] text-[#574335]">
                  * Na tela de <b>Estrutura (BOM)</b>, ao selecionar este processo, você definirá a produção por hora exata para cada cosmético.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#dec1af]/30">
                {editingProcess && (
                  <button
                    type="button"
                    onClick={() => {
                      const proc = editingProcess;
                      setIsModalOpen(false);
                      setProcessToDelete(proc);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 font-bold rounded-xl transition-colors text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Processo
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#574335] font-bold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    {editingProcess ? 'Salvar Alterações' : 'Cadastrar Processo'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Processo */}
      {processToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-red-200 overflow-hidden">
            <div className="p-4 bg-red-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Excluir Processo Produtivo
              </h3>
              <button
                onClick={() => setProcessToDelete(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#574335] leading-relaxed">
                Tem certeza que deseja remover o processo <b>&quot;{processToDelete.code} - {processToDelete.description}&quot;</b>?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProcessToDelete(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#574335] font-bold text-xs rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteProcess(processToDelete.id);
                    onNotify(`Processo "${processToDelete.code}" removido com sucesso!`);
                    setProcessToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
