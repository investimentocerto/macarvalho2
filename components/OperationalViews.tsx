'use client';

import React, { useState } from 'react';
import { ProductionOrder, SaleRecord, ViewMode } from '@/lib/types';
import { 
  ClipboardList, 
  ShoppingCart, 
  Tag, 
  CheckCircle2, 
  Play, 
  Pause, 
  Plus, 
  X,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';

interface PurchaseItem {
  id: string;
  item: string;
  supplier: string;
  quantity: number;
  unit: string;
  status: 'Cotação' | 'Aguardando Entrega' | 'Recebido';
  value: number;
}

interface OperationalViewsProps {
  view: ViewMode;
  productionOrders: ProductionOrder[];
  salesRecords: SaleRecord[];
  onAddProductionOrder?: (order: ProductionOrder) => void;
  onUpdateOpStatus: (opId: string, newStatus: ProductionOrder['status']) => void;
  onAddSaleRecord?: (sale: SaleRecord) => void;
  onNotify: (msg: string) => void;
}

export const OperationalViews: React.FC<OperationalViewsProps> = ({
  view,
  productionOrders,
  salesRecords,
  onAddProductionOrder,
  onUpdateOpStatus,
  onAddSaleRecord,
  onNotify,
}) => {
  // Local state for modals
  const [isOpModalOpen, setIsOpModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  // New OP Form
  const [newOpNumber, setNewOpNumber] = useState('OP-2026-001');
  const [newOpProduct, setNewOpProduct] = useState('');
  const [newOpQuantity, setNewOpQuantity] = useState('50');
  const [newOpLine, setNewOpLine] = useState('Bancada Artesanal - Saboaria');
  const [newOpForecast, setNewOpForecast] = useState('Hoje');

  // New Sale Form
  const [newSaleClient, setNewSaleClient] = useState('');
  const [newSaleItem, setNewSaleItem] = useState('');
  const [newSaleValue, setNewSaleValue] = useState('250.00');

  // Purchase items local state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseItem[]>([]);
  const [newPurItem, setNewPurItem] = useState('');
  const [newPurSupplier, setNewPurSupplier] = useState('');
  const [newPurQty, setNewPurQty] = useState('10');
  const [newPurUnit, setNewPurUnit] = useState('KG');
  const [newPurVal, setNewPurVal] = useState('450.00');

  const handleCreateOP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpProduct) {
      onNotify('Por favor informe o nome do produto da OP.');
      return;
    }

    const order: ProductionOrder = {
      id: `op-${Date.now()}`,
      opNumber: newOpNumber,
      productName: newOpProduct,
      productCode: `PRD-${Math.floor(100 + Math.random() * 900)}`,
      progress: 10,
      forecast: newOpForecast,
      status: 'Em Andamento',
      line: newOpLine,
      quantity: Number(newOpQuantity) || 1,
      unit: 'UN',
    };

    if (onAddProductionOrder) {
      onAddProductionOrder(order);
    }
    setIsOpModalOpen(false);
    setNewOpProduct('');
    setNewOpNumber(`OP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    onNotify(`Ordem de Produção ${order.opNumber} criada com sucesso!`);
  };

  const handleCreateSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSaleClient) {
      onNotify('Por favor informe o nome do cliente.');
      return;
    }

    const sale: SaleRecord = {
      id: `sale-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR'),
      client: newSaleClient,
      item: newSaleItem || 'Lote de Cosméticos',
      value: Number(newSaleValue) || 0,
      status: 'Faturado',
    };

    if (onAddSaleRecord) {
      onAddSaleRecord(sale);
    }
    setIsSaleModalOpen(false);
    setNewSaleClient('');
    setNewSaleItem('');
    onNotify(`Venda para ${sale.client} registrada com sucesso!`);
  };

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPurItem) {
      onNotify('Informe o insumo a cotar.');
      return;
    }

    const pur: PurchaseItem = {
      id: `pur-${Date.now()}`,
      item: newPurItem,
      supplier: newPurSupplier || 'Fornecedor Cadastrado',
      quantity: Number(newPurQty) || 1,
      unit: newPurUnit,
      status: 'Cotação',
      value: Number(newPurVal) || 0,
    };

    setPurchaseOrders(prev => [pur, ...prev]);
    setIsPurchaseModalOpen(false);
    setNewPurItem('');
    setNewPurSupplier('');
    onNotify(`Cotação para "${pur.item}" registrada!`);
  };

  // 1. ORDENS DE PRODUÇÃO
  if (view === 'ordens-producao') {
    return (
      <div className="flex flex-col gap-6 animate-fadeIn pb-12">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1c1b]">Ordens de Produção (OPs)</h1>
            <p className="text-xs sm:text-sm text-[#574335] mt-1">
              Planejamento e acompanhamento dos lotes artesanais de cosméticos MaCarvalho.
            </p>
          </div>
          <button
            id="btn-open-new-op-modal"
            onClick={() => setIsOpModalOpen(true)}
            className="px-4 py-2 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Criar Nova OP
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-[#dec1af]/40 overflow-hidden">
          {productionOrders.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-[#574335]">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#954a00] mb-3">
                <ClipboardList className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-[#1a1c1b]">Nenhuma Ordem de Produção Ativa</h3>
              <p className="text-xs text-[#574335] max-w-md mt-1 mb-5 leading-relaxed">
                Você limpou os lançamentos. Clique no botão abaixo para iniciar o primeiro lote de produção artesanal.
              </p>
              <button
                id="btn-create-first-op"
                onClick={() => setIsOpModalOpen(true)}
                className="px-4 py-2.5 bg-[#954a00] hover:bg-[#713700] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Criar Primeira Ordem de Produção
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f4f3f1] text-[#574335] uppercase font-semibold border-b border-[#dec1af]/40">
                    <th className="py-3.5 px-4">Número OP</th>
                    <th className="py-3.5 px-4">Produto</th>
                    <th className="py-3.5 px-4">Bancada / Linha</th>
                    <th className="py-3.5 px-4 text-center">Quantidade</th>
                    <th className="py-3.5 px-4">Progresso</th>
                    <th className="py-3.5 px-4">Previsão</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9e8e6]">
                  {productionOrders.map((op) => (
                    <tr key={op.id} className="hover:bg-[#f4f3f1] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#954a00]">{op.opNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-[#1a1c1b]">{op.productName}</td>
                      <td className="py-3.5 px-4 text-[#574335]">{op.line}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-[#1a1c1b]">{op.quantity} {op.unit || 'un'}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-[#e9e8e6] h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                op.status === 'Concluída' ? 'bg-emerald-600' : 'bg-[#954a00]'
                              }`}
                              style={{ width: `${op.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-mono text-[#574335]">{op.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#574335] font-medium">{op.forecast}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          op.status === 'Concluída'
                            ? 'bg-emerald-100 text-emerald-800'
                            : op.status === 'Em Andamento'
                            ? 'bg-amber-100 text-amber-900'
                            : op.status === 'Parada'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}>
                          {op.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {op.status === 'Em Andamento' ? (
                            <button
                              onClick={() => onUpdateOpStatus(op.id, 'Parada')}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                              title="Pausar Lote"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpdateOpStatus(op.id, 'Em Andamento')}
                              className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
                              title="Iniciar Lote"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onUpdateOpStatus(op.id, 'Concluída')}
                            className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="Concluir Lote"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Nova OP */}
        {isOpModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fadeIn">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#dec1af]/30">
                <h3 className="font-bold text-lg text-[#1a1c1b]">Nova Ordem de Produção</h3>
                <button 
                  onClick={() => setIsOpModalOpen(false)}
                  className="p-1 text-[#574335] hover:text-[#1a1c1b] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOP} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-[#1a1c1b] block mb-1">Número do Lote / OP</label>
                  <input
                    type="text"
                    value={newOpNumber}
                    onChange={(e) => setNewOpNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-[#dec1af] rounded-lg bg-[#faf9f7] font-mono text-xs focus:ring-1 focus:ring-[#954a00] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1a1c1b] block mb-1">Cosmético / Produto</label>
                  <input
                    type="text"
                    placeholder="Ex: Sabonete de Argila Branca & Lavanda 120g"
                    value={newOpProduct}
                    onChange={(e) => setNewOpProduct(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-[#dec1af] rounded-lg text-xs focus:ring-1 focus:ring-[#954a00] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#1a1c1b] block mb-1">Quantidade do Lote</label>
                    <input
                      type="number"
                      value={newOpQuantity}
                      onChange={(e) => setNewOpQuantity(e.target.value)}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-[#dec1af] rounded-lg text-xs focus:ring-1 focus:ring-[#954a00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#1a1c1b] block mb-1">Previsão</label>
                    <input
                      type="text"
                      placeholder="Ex: 2 dias, 24/11"
                      value={newOpForecast}
                      onChange={(e) => setNewOpForecast(e.target.value)}
                      className="w-full px-3 py-2 border border-[#dec1af] rounded-lg text-xs focus:ring-1 focus:ring-[#954a00] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-[#1a1c1b] block mb-1">Bancada / Processo</label>
                  <select
                    value={newOpLine}
                    onChange={(e) => setNewOpLine(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dec1af] rounded-lg text-xs focus:ring-1 focus:ring-[#954a00] focus:outline-none bg-white"
                  >
                    <option value="Bancada Artesanal - Saboaria">Bancada Artesanal - Saboaria</option>
                    <option value="Bancada de Emulsões & Cremes">Bancada de Emulsões & Cremes</option>
                    <option value="Envase & Rotulagem Manual">Envase & Rotulagem Manual</option>
                    <option value="Cura e Maturação">Cura e Maturação</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-[#dec1af]/30">
                  <button
                    type="button"
                    onClick={() => setIsOpModalOpen(false)}
                    className="px-4 py-2 border border-[#dec1af] rounded-xl text-xs font-semibold text-[#574335] hover:bg-stone-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Salvar e Iniciar OP
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. COMPRAS
  if (view === 'compras') {
    return (
      <div className="flex flex-col gap-6 animate-fadeIn pb-12">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1c1b]">Compras & Matérias-Primas</h1>
            <p className="text-xs sm:text-sm text-[#574335] mt-1">
              Cotações e aquisição de bases glicerinadas, óleos vegetais, essências e frascos.
            </p>
          </div>
          <button
            id="btn-open-purchase-modal"
            onClick={() => setIsPurchaseModalOpen(true)}
            className="px-4 py-2 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nova Cotação / Compra
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-[#dec1af]/40 overflow-hidden">
          {purchaseOrders.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-[#574335]">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#954a00] mb-3">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-[#1a1c1b]">Nenhuma Compra Registrada</h3>
              <p className="text-xs text-[#574335] max-w-md mt-1 mb-5 leading-relaxed">
                Você pode registrar pedidos de compras de insumos para alimentar o estoque da MaCarvalho Cosméticos Artesanais.
              </p>
              <button
                id="btn-create-first-purchase"
                onClick={() => setIsPurchaseModalOpen(true)}
                className="px-4 py-2.5 bg-[#954a00] hover:bg-[#713700] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Registrar Primeira Cotação de Insumos
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f4f3f1] text-[#574335] uppercase font-semibold border-b border-[#dec1af]/40">
                    <th className="py-3 px-4">Insumo / Matéria-Prima</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4 text-center">Quantidade</th>
                    <th className="py-3 px-4 text-right">Valor Previsto</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9e8e6]">
                  {purchaseOrders.map((p) => (
                    <tr key={p.id} className="hover:bg-[#f4f3f1] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#1a1c1b]">{p.item}</td>
                      <td className="py-3 px-4 text-[#574335]">{p.supplier}</td>
                      <td className="py-3 px-4 text-center font-medium">{p.quantity} {p.unit}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#1a1c1b]">
                        R$ {p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Nova Compra */}
        {isPurchaseModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fadeIn">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#dec1af]/30">
                <h3 className="font-bold text-lg text-[#1a1c1b]">Nova Cotação de Insumos</h3>
                <button onClick={() => setIsPurchaseModalOpen(false)} className="p-1 text-[#574335]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-[#1a1c1b] block mb-1">Insumo ou Embalagem</label>
                  <input
                    type="text"
                    placeholder="Ex: Base Glicerinada Vegetal 100% Pura"
                    value={newPurItem}
                    onChange={(e) => setNewPurItem(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-[#dec1af] rounded-lg text-xs focus:ring-1 focus:ring-[#954a00] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1a1c1b] block mb-1">Fornecedor / Distribuidor</label>
                  <input
                    type="text"
                    placeholder="Ex: Fornecedor de Essências Naturais Ltda"
                    value={newPurSupplier}
                    onChange={(e) => setNewPurSupplier(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dec1af] rounded-lg text-xs focus:ring-1 focus:ring-[#954a00] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#1a1c1b] block mb-1">Quantidade</label>
                    <input
                      type="number"
                      value={newPurQty}
                      onChange={(e) => setNewPurQty(e.target.value)}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-[#dec1af] rounded-lg text-xs focus:ring-1 focus:ring-[#954a00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#1a1c1b] block mb-1">Valor Estimado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPurVal}
                      onChange={(e) => setNewPurVal(e.target.value)}
                      className="w-full px-3 py-2 border border-[#dec1af] rounded-lg text-xs focus:ring-1 focus:ring-[#954a00] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-[#dec1af]/30">
                  <button
                    type="button"
                    onClick={() => setIsPurchaseModalOpen(false)}
                    className="px-4 py-2 border border-[#dec1af] rounded-xl text-xs font-semibold text-[#574335]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Registrar Cotação
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. VENDAS
  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1c1b]">Pedidos de Venda & Faturamento</h1>
          <p className="text-xs sm:text-sm text-[#574335] mt-1">
            Pedidos de clientes, lojas revendedoras e e-commerce MaCarvalho.
          </p>
        </div>
        <button
          id="btn-open-new-sale-modal"
          onClick={() => setIsSaleModalOpen(true)}
          className="px-4 py-2 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Pedido de Venda
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-[#dec1af]/40 overflow-hidden">
        {salesRecords.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-[#574335]">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#954a00] mb-3">
              <Tag className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-[#1a1c1b]">Nenhum Pedido de Venda Registrado</h3>
            <p className="text-xs text-[#574335] max-w-md mt-1 mb-5 leading-relaxed">
              Todos os lançamentos antigos foram limpos. Registre seu primeiro pedido de venda para dar início ao histórico comercial.
            </p>
            <button
              id="btn-create-first-sale"
              onClick={() => setIsSaleModalOpen(true)}
              className="px-4 py-2.5 bg-[#954a00] hover:bg-[#713700] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Lançar Primeiro Pedido de Venda
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f4f3f1] text-[#574335] uppercase font-semibold border-b border-[#dec1af]/40">
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Cliente / Destinatário</th>
                  <th className="py-3.5 px-4">Item Faturado</th>
                  <th className="py-3.5 px-4 text-right">Valor Total</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9e8e6]">
                {salesRecords.map((sale) => (
                  <tr key={sale.id} className="hover:bg-[#f4f3f1] transition-colors">
                    <td className="py-3.5 px-4 text-[#574335] font-medium">{sale.date}</td>
                    <td className="py-3.5 px-4 font-bold text-[#1a1c1b]">{sale.client}</td>
                    <td className="py-3.5 px-4 text-[#574335]">{sale.item}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#1a1c1b]">
                      R$ {sale.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        sale.status === 'Faturado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sale.status === 'Separando'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-stone-200 text-stone-800'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nova Venda */}
      {isSaleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#dec1af]/30">
              <h3 className="font-bold text-lg text-[#1a1c1b]">Novo Pedido de Venda</h3>
              <button onClick={() => setIsSaleModalOpen(false)} className="p-1 text-[#574335]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSale} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#1a1c1b] block mb-1">Nome do Cliente / Empresa</label>
                <input
                  type="text"
                  placeholder="Ex: Boutique Botânica & Aromas"
                  value={newSaleClient}
                  onChange={(e) => setNewSaleClient(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#dec1af] rounded-lg text-xs focus:ring-1 focus:ring-[#954a00] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1a1c1b] block mb-1">Itens do Pedido</label>
                <input
                  type="text"
                  placeholder="Ex: Kit 50 Sabonetes Esfoliantes de Aveia & Mel"
                  value={newSaleItem}
                  onChange={(e) => setNewSaleItem(e.target.value)}
                  className="w-full px-3 py-2 border border-[#dec1af] rounded-lg text-xs focus:ring-1 focus:ring-[#954a00] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1a1c1b] block mb-1">Valor Total (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newSaleValue}
                  onChange={(e) => setNewSaleValue(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#dec1af] rounded-lg text-xs focus:ring-1 focus:ring-[#954a00] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#dec1af]/30">
                <button
                  type="button"
                  onClick={() => setIsSaleModalOpen(false)}
                  className="px-4 py-2 border border-[#dec1af] rounded-xl text-xs font-semibold text-[#574335]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Faturar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
