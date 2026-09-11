'use client';

import React, { useState } from 'react';
import { ViewMode, ProductionOrder, SaleRecord } from '@/lib/types';
import { 
  ShoppingBag, 
  Warehouse, 
  ClipboardList, 
  CheckCircle2, 
  DollarSign,
  Package,
  Plus,
  Sparkles,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: ViewMode) => void;
  productionOrders: ProductionOrder[];
  salesRecords: SaleRecord[];
  productsCount: number;
  inventoryCount: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  productionOrders,
  salesRecords,
  productsCount,
  inventoryCount,
}) => {
  const totalFaturado = salesRecords.reduce((acc, sale) => acc + (sale.value || 0), 0);
  const activeOps = productionOrders.filter(op => op.status === 'Em Andamento' || op.status === 'Planejada');
  const hasZeroLaunches = productsCount === 0 && productionOrders.length === 0 && salesRecords.length === 0;

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Top Welcome / Initial State Notice */}
      {hasZeroLaunches ? (
        <div 
          id="dashboard-fresh-start-banner"
          className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 text-amber-950 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#954a00] shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-[#954a00]" />
            </div>
            <div>
              <div className="font-bold text-base text-[#954a00] flex items-center gap-2">
                Sistema Pronto para Novos Lançamentos
                <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  Início do Zero
                </span>
              </div>
              <p className="text-xs text-[#574335] mt-1 leading-relaxed max-w-2xl">
                Todos os registros e ordens anteriores foram limpos conforme solicitado. Você está pronto para cadastrar os cosméticos artesanais, cadastrar matérias-primas e gerar novas ordens de produção.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="btn-quick-new-product"
              onClick={() => onNavigate('produtos')}
              className="px-3.5 py-2 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Produto
            </button>
            <button
              id="btn-quick-new-stock"
              onClick={() => onNavigate('estoque')}
              className="px-3.5 py-2 bg-white hover:bg-amber-100/50 text-[#954a00] border border-[#954a00]/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Warehouse className="w-4 h-4" />
              Adicionar Matéria-Prima
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Painel Operacional Ativo</span>
              <p className="text-xs text-emerald-900">Operando com cadastros atualizados de produção e estoque.</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div 
          id="kpi-faturamento"
          className="bg-white p-4 rounded-xl shadow-xs border border-[#dec1af]/40 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-[#574335]">Faturamento Total</span>
            <div className="w-7 h-7 rounded-full bg-[#f47d00]/10 flex items-center justify-center text-[#954a00]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1a1c1b] tracking-tight">
              R$ {totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-[#574335] mt-1">
              <span>{salesRecords.length} pedidos faturados</span>
            </div>
          </div>
        </div>

        {/* Produtos Cadastrados */}
        <div 
          id="kpi-produtos"
          className="bg-white p-4 rounded-xl shadow-xs border border-[#dec1af]/40 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-[#574335]">Catálogo de Cosméticos</span>
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-[#954a00]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1a1c1b] tracking-tight">{productsCount}</div>
            <div className="text-xs text-[#574335] mt-1">
              Produtos cadastrados
            </div>
          </div>
        </div>

        {/* Matérias-Primas / Estoque */}
        <div 
          id="kpi-estoque"
          className="bg-white p-4 rounded-xl shadow-xs border border-[#dec1af]/40 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-[#574335]">Itens no Estoque</span>
            <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-700">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1a1c1b] tracking-tight">{inventoryCount}</div>
            <div className="text-xs text-[#574335] mt-1">
              Insumos e embalagens
            </div>
          </div>
        </div>

        {/* Ordens de Produção (OPs) */}
        <div 
          id="kpi-ops"
          className="bg-white p-4 rounded-xl shadow-xs border border-[#dec1af]/40 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-[#574335]">Ordens Ativas (OPs)</span>
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1a1c1b] tracking-tight">{activeOps.length}</div>
            <div className="text-xs text-[#574335] mt-1">
              Lotes em fabricação
            </div>
          </div>
        </div>
      </div>

      {/* Production Orders & Recent Sales Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produção / Ordens */}
        <div className="bg-white rounded-xl shadow-xs border border-[#dec1af]/40 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#dec1af]/30 bg-[#f4f3f1] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#954a00]" />
              <h3 className="font-bold text-sm text-[#1a1c1b]">Ordens de Produção Recentes</h3>
            </div>
            <span className="bg-[#954a00] text-white px-2.5 py-0.5 rounded-full text-xs font-bold shadow-2xs">
              {productionOrders.length} OPs
            </span>
          </div>

          <div className="overflow-x-auto flex-1 min-h-[200px]">
            {productionOrders.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-[#574335]">
                <ClipboardList className="w-10 h-10 text-[#dec1af] mb-2" />
                <div className="font-semibold text-sm text-[#1a1c1b]">Nenhuma ordem de produção iniciada</div>
                <p className="text-xs text-[#574335] max-w-sm mt-1 mb-4">
                  Crie uma nova OP para controlar lotes, prazos e quantidades da produção de cosméticos.
                </p>
                <button
                  id="btn-empty-create-op"
                  onClick={() => onNavigate('ordens-producao')}
                  className="px-3.5 py-1.5 bg-[#954a00] text-white text-xs font-bold rounded-lg hover:bg-[#713700] transition-colors"
                >
                  Criar Primeira Ordem de Produção
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white border-b border-[#e9e8e6] text-[#574335] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-4">OP</th>
                    <th className="py-2.5 px-4">Produto</th>
                    <th className="py-2.5 px-4">Progresso</th>
                    <th className="py-2.5 px-4 text-right">Previsão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9e8e6]">
                  {productionOrders.slice(0, 5).map((op) => (
                    <tr key={op.id} className="hover:bg-[#f4f3f1] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#954a00]">{op.opNumber}</td>
                      <td className="py-3 px-4 font-medium text-[#1a1c1b]">{op.productName}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-[#e9e8e6] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-600 rounded-full" 
                              style={{ width: `${op.progress}%` }}
                            ></div>
                          </div>
                          <span className="font-mono text-[11px] text-[#574335]">{op.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#574335]">
                        {op.forecast}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-3 bg-[#faf9f7] border-t border-[#e9e8e6] text-center">
            <button
              id="btn-goto-ops"
              onClick={() => onNavigate('ordens-producao')}
              className="text-xs font-bold uppercase tracking-wider text-[#954a00] hover:text-[#713700] transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <span>Gerenciar Ordens de Produção</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Vendas Recentes */}
        <div className="bg-white rounded-xl shadow-xs border border-[#dec1af]/40 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#dec1af]/30 bg-[#f4f3f1] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-stone-700" />
              <h3 className="font-bold text-sm text-[#1a1c1b]">Vendas Recentes</h3>
            </div>
            <span className="text-xs text-[#574335]">Faturamento</span>
          </div>

          <div className="overflow-x-auto flex-1 min-h-[200px]">
            {salesRecords.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-[#574335]">
                <ShoppingBag className="w-10 h-10 text-[#dec1af] mb-2" />
                <div className="font-semibold text-sm text-[#1a1c1b]">Nenhuma venda registrada ainda</div>
                <p className="text-xs text-[#574335] max-w-sm mt-1 mb-4">
                  Inicie os lançamentos registrando pedidos de venda para clientes ou lojas parceiras.
                </p>
                <button
                  id="btn-empty-create-sale"
                  onClick={() => onNavigate('vendas')}
                  className="px-3.5 py-1.5 bg-[#954a00] text-white text-xs font-bold rounded-lg hover:bg-[#713700] transition-colors"
                >
                  Registrar Primeiro Pedido
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white border-b border-[#e9e8e6] text-[#574335] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-4">Data</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4 text-right">Valor</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9e8e6]">
                  {salesRecords.slice(0, 5).map((sale) => (
                    <tr key={sale.id} className="hover:bg-[#f4f3f1] transition-colors">
                      <td className="py-3 px-4 text-[#574335]">{sale.date}</td>
                      <td className="py-3 px-4 font-medium text-[#1a1c1b]">{sale.client}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#1a1c1b]">
                        R$ {sale.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-3 bg-[#faf9f7] border-t border-[#e9e8e6] text-center">
            <button
              id="btn-goto-sales"
              onClick={() => onNavigate('vendas')}
              className="text-xs font-bold uppercase tracking-wider text-[#954a00] hover:text-[#713700] transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <span>Ver Módulo de Vendas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
