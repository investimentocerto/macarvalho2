'use client';

import React, { useState, useMemo } from 'react';
import { InventoryItem, StockMovement, ViewMode } from '@/lib/types';
import { 
  Search, 
  Download, 
  Plus, 
  AlertTriangle, 
  ShoppingCart, 
  ArrowDown, 
  ArrowUp, 
  RefreshCw, 
  Warehouse,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Pencil
} from 'lucide-react';

interface InventoryViewProps {
  items: InventoryItem[];
  movements: StockMovement[];
  onNavigate: (view: ViewMode) => void;
  onAddItem: (item: InventoryItem) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onAddMovement: (mov: StockMovement) => void;
  onOpenImageModalForUrl: (title: string, url: string) => void;
  onNotify: (msg: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  movements,
  onNavigate,
  onAddItem,
  onUpdateItem,
  onAddMovement,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas Categorias');
  const [statusFilter, setStatusFilter] = useState('Qualquer Status');
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen] = useState(false);

  // New Item State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<InventoryItem['category']>('Matéria-Prima');
  const [newUnit, setNewUnit] = useState('KG');
  const [newBalance, setNewBalance] = useState('20');
  const [newMin, setNewMin] = useState('5');
  const [newMax, setNewMax] = useState('100');
  const [newCost, setNewCost] = useState('32.00');
  const [newImageUrl, setNewImageUrl] = useState('');

  // Adjustment State
  const [adjustItemCode, setAdjustItemCode] = useState('');
  const [adjustType, setAdjustType] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustReason, setAdjustReason] = useState('Entrada de Lote / Fornecedor');

  // Edit Item State
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<InventoryItem['category']>('Matéria-Prima');
  const [editUnit, setEditUnit] = useState('KG');
  const [editBalance, setEditBalance] = useState('0');
  const [editMin, setEditMin] = useState('0');
  const [editMax, setEditMax] = useState('0');
  const [editCost, setEditCost] = useState('0.00');
  const [editBatch, setEditBatch] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setEditCode(item.code);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.unit);
    setEditBalance(item.balance.toString());
    setEditMin(item.minStock.toString());
    setEditMax(item.maxStock.toString());
    setEditCost(item.unitCost.toString());
    setEditBatch(item.batch || '');
    setEditImageUrl(item.imageUrl || '');
    setIsEditItemModalOpen(true);
  };

  const handleUpdateItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editCode.trim() || !editName.trim()) return;

    const bal = Number(editBalance) || 0;
    const min = Number(editMin) || 0;
    const max = Number(editMax) || 0;

    let status: InventoryItem['status'] = 'Normal';
    if (bal <= 0) status = 'Esgotado';
    else if (bal <= min * 0.5) status = 'Crítico';
    else if (bal <= min) status = 'Baixo';

    const updated: InventoryItem = {
      ...editingItem,
      code: editCode.trim().toUpperCase(),
      name: editName.trim(),
      category: editCategory,
      unit: editUnit,
      balance: bal,
      minStock: min,
      maxStock: max,
      unitCost: Number(editCost) || 0,
      batch: editBatch.trim() || undefined,
      imageUrl: editImageUrl.trim() || undefined,
      status,
    };

    onUpdateItem(updated);
    setIsEditItemModalOpen(false);
    setEditingItem(null);
    onNotify(`Item "${updated.name}" atualizado com sucesso!`);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = 
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.batch && item.batch.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === 'Todas Categorias' || item.category === categoryFilter;
      const matchesStatus = 
        statusFilter === 'Qualquer Status' ||
        (statusFilter === 'Estoque Baixo' && item.status === 'Baixo') ||
        (statusFilter === 'Crítico' && item.status === 'Crítico') ||
        (statusFilter === 'Sem Estoque' && item.status === 'Esgotado') ||
        item.status === statusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  // Critical items requiring replenishment
  const criticalItems = useMemo(() => {
    return items.filter(i => i.status === 'Crítico' || i.status === 'Esgotado');
  }, [items]);

  // Total allocated inventory value
  const totalAllocatedValue = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.balance * curr.unitCost), 0);
  }, [items]);

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;

    const balanceNum = parseFloat(newBalance) || 0;
    const minNum = parseFloat(newMin) || 0;
    const maxNum = parseFloat(newMax) || 100;
    const costNum = parseFloat(newCost) || 0;

    let itemStatus: InventoryItem['status'] = 'Normal';
    if (balanceNum === 0) itemStatus = 'Esgotado';
    else if (balanceNum <= minNum) itemStatus = 'Crítico';
    else if (balanceNum <= minNum * 1.5) itemStatus = 'Baixo';

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      code: newCode.toUpperCase(),
      name: newName,
      category: newCategory,
      unit: newUnit,
      balance: balanceNum,
      minStock: minNum,
      maxStock: maxNum,
      unitCost: costNum,
      leadTimeDays: 5,
      status: itemStatus,
      imageUrl: newImageUrl || undefined,
      lastPurchaseDate: new Date().toLocaleDateString('pt-BR'),
      batch: `LT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    };

    onAddItem(newItem);
    setIsNewItemModalOpen(false);

    // Register initial stock movement
    if (balanceNum > 0) {
      const initMov: StockMovement = {
        id: `mov-${Date.now()}`,
        title: 'Saldo Inicial de Cadastro',
        itemName: newItem.name,
        quantity: balanceNum,
        unit: newItem.unit,
        type: 'entrada',
        timestamp: 'Agora',
      };
      onAddMovement(initMov);
    }

    // Reset Form
    setNewCode('');
    setNewName('');
    setNewImageUrl('');
    onNotify(`Item "${newItem.name}" adicionado ao inventário!`);
  };

  const handleStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCode = adjustItemCode || (items[0] && items[0].code);
    if (!targetCode) {
      onNotify('Cadastre primeiro um item no estoque para lançar movimentações.');
      return;
    }

    const item = items.find(i => i.code === targetCode);
    if (!item) return;

    const qty = parseFloat(adjustQty) || 0;
    let newBalance = item.balance;

    if (adjustType === 'entrada') {
      newBalance += qty;
    } else if (adjustType === 'saida') {
      newBalance = Math.max(0, newBalance - qty);
    } else {
      newBalance = qty;
    }

    let itemStatus: InventoryItem['status'] = 'Normal';
    if (newBalance === 0) itemStatus = 'Esgotado';
    else if (newBalance <= item.minStock) itemStatus = 'Crítico';
    else if (newBalance <= item.minStock * 1.5) itemStatus = 'Baixo';

    const updatedItem: InventoryItem = {
      ...item,
      balance: newBalance,
      status: itemStatus,
    };

    onUpdateItem(updatedItem);

    const mov: StockMovement = {
      id: `mov-${Date.now()}`,
      title: adjustReason || (adjustType === 'entrada' ? 'Recebimento de Insumo' : 'Consumo em Produção'),
      itemName: item.name,
      quantity: adjustType === 'saida' ? -qty : qty,
      unit: item.unit,
      type: adjustType,
      timestamp: 'Agora',
    };
    onAddMovement(mov);

    setIsStockAdjustmentModalOpen(false);
    onNotify(`Movimentação para ${item.code} registrada com sucesso!`);
  };

  const handleExport = () => {
    const headers = 'Codigo,Nome,Categoria,Unidade,Saldo,Min,Max,CustoUnitario,ValorTotal,Status\n';
    const rows = filteredItems
      .map(i => `"${i.code}","${i.name}","${i.category}","${i.unit}",${i.balance},${i.minStock},${i.maxStock},${i.unitCost},${i.balance * i.unitCost},"${i.status}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `estoque_macarvalho_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1c1b]">Estoque & Matérias-Primas</h1>
          <p className="text-xs sm:text-sm text-[#574335] mt-0.5">
            Controle de bases, essências, manteigas, óleos vegetais e embalagens MaCarvalho.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-center w-9 h-9 bg-white border border-[#dec1af]/60 rounded-xl text-[#574335] hover:bg-[#e9e8e6] transition-colors"
            title="Exportar CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (items.length === 0) {
                onNotify('Cadastre um item no estoque antes de realizar ajustes.');
                setIsNewItemModalOpen(true);
              } else {
                setIsStockAdjustmentModalOpen(true);
              }
            }}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-[#dec1af] text-[#954a00] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Lançar Movimento
          </button>
          <button
            onClick={() => setIsNewItemModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Item
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#f4f3f1] p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 border border-[#dec1af]/40">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#574335]/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código, nome ou lote..."
              className="w-full pl-9 pr-3 py-1.5 bg-white rounded-lg text-xs text-[#1a1c1b] border border-[#dec1af]/60 focus:outline-none focus:ring-1 focus:ring-[#954a00]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white text-xs text-[#1a1c1b] py-1.5 px-3 rounded-lg border border-[#dec1af]/60 focus:outline-none focus:ring-1 focus:ring-[#954a00] cursor-pointer"
          >
            <option>Todas Categorias</option>
            <option>Matéria-Prima</option>
            <option>Embalagens</option>
            <option>Componentes</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white text-xs text-[#1a1c1b] py-1.5 px-3 rounded-lg border border-[#dec1af]/60 focus:outline-none focus:ring-1 focus:ring-[#954a00] cursor-pointer"
          >
            <option>Qualquer Status</option>
            <option>Normal</option>
            <option>Estoque Baixo</option>
            <option>Crítico</option>
            <option>Sem Estoque</option>
          </select>
        </div>

        <span className="text-xs text-[#574335]">
          {filteredItems.length} de {items.length} itens
        </span>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Inventory Table (Span 8) */}
        <div className="xl:col-span-8 flex flex-col gap-3">
          <div className="bg-white rounded-2xl shadow-xs border border-[#dec1af]/40 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              {filteredItems.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center text-[#574335]">
                  <Warehouse className="w-12 h-12 text-[#dec1af] mb-2" />
                  <h3 className="font-bold text-base text-[#1a1c1b]">Nenhum item em estoque</h3>
                  <p className="text-xs text-[#574335] max-w-sm mt-1 mb-5 leading-relaxed">
                    Cadastre suas bases glicerinadas, óleos essenciais, extratos ou embalagens para iniciar o controle de almoxarifado.
                  </p>
                  <button
                    onClick={() => setIsNewItemModalOpen(true)}
                    className="px-4 py-2 bg-[#954a00] hover:bg-[#713700] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar Matéria-Prima
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                  <thead>
                    <tr className="h-10 bg-[#f4f3f1] text-[#574335] uppercase tracking-wider font-semibold border-b border-[#dec1af]/30">
                      <th className="py-2.5 px-4 w-20">Código</th>
                      <th className="py-2.5 px-4">Item / Insumo</th>
                      <th className="py-2.5 px-4 w-28">Categoria</th>
                      <th className="py-2.5 px-4 text-center w-12">UN</th>
                      <th className="py-2.5 px-4 text-right w-20">Saldo</th>
                      <th className="py-2.5 px-4 text-right w-20">Mín/Máx</th>
                      <th className="py-2.5 px-4 text-right w-24">Custo Un.</th>
                      <th className="py-2.5 px-4 text-right w-24">Valor Total</th>
                      <th className="py-2.5 px-4 text-center w-20">Status</th>
                      <th className="py-2.5 px-2 text-center w-12">Editar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e9e8e6]">
                    {filteredItems.map((item) => {
                      const totalVal = item.balance * item.unitCost;

                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => handleOpenEditItem(item)}
                          className="h-10 hover:bg-[#ffdcc6]/20 transition-colors group cursor-pointer"
                          title="Clique para editar este insumo do estoque"
                        >
                          <td className="px-4 font-mono font-medium text-[#574335]">{item.code}</td>
                          <td className="px-4 font-bold text-[#1a1c1b] truncate max-w-[180px]">
                            <div className="flex items-center gap-2">
                              {item.imageUrl && (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-5 h-5 rounded object-cover border border-[#dec1af]/40 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <span className={item.status === 'Esgotado' ? 'line-through text-stone-400' : ''}>
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 text-[#574335]">{item.category}</td>
                          <td className="px-4 text-center text-[#574335]">{item.unit}</td>
                          <td className={`px-4 text-right font-bold ${
                            item.status === 'Crítico' || item.status === 'Esgotado' ? 'text-red-600' : 'text-[#1a1c1b]'
                          }`}>
                            {item.balance.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 text-right text-[11px] text-[#574335]">
                            {item.minStock} / {item.maxStock}
                          </td>
                          <td className="px-4 text-right text-[#574335]">
                            R$ {item.unitCost.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-4 text-right font-bold text-[#1a1c1b]">
                            R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.status === 'Normal'
                                ? 'bg-[#9df897] text-[#002204]'
                                : item.status === 'Baixo'
                                ? 'bg-amber-100 text-amber-900'
                                : item.status === 'Crítico'
                                ? 'bg-red-600 text-white animate-pulse'
                                : 'bg-stone-200 text-stone-600'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenEditItem(item)}
                              className="p-1.5 text-[#574335] hover:text-[#954a00] hover:bg-white rounded-lg transition-colors"
                              title="Editar insumo"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right: Action Center, Total Allocated, Recent History (Span 4) */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          {/* Valor Total Alocado Card */}
          <div className="bg-[#954a00] text-white rounded-2xl shadow-md p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/80">Valor Total em Estoque</span>
              <span className="text-2xl font-bold tracking-tight text-white mt-1">
                R$ {totalAllocatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-white/70 mt-0.5">{items.length} itens estocados</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Warehouse className="w-5 h-5" />
            </div>
          </div>

          {/* Action Center Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-[#dec1af]/40 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm text-[#1a1c1b]">Reposição de Insumos</h3>
            </div>
            
            {criticalItems.length === 0 ? (
              <div className="p-4 bg-[#faf9f7] rounded-xl border border-[#dec1af]/40 text-center flex items-center gap-2.5 text-xs text-[#574335]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Nenhum insumo em nível crítico de estoque.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {criticalItems.slice(0, 3).map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#f4f3f1] border border-[#dec1af]/30"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#1a1c1b]">{item.code} • {item.name}</div>
                      <div className="text-[11px] font-bold text-red-600">
                        {item.balance} {item.unit} (Mínimo: {item.minStock})
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('compras')}
                      className="text-[#954a00] hover:text-[#713700] p-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                      title="Ir para compras"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Movements History */}
          <div className="bg-white rounded-2xl shadow-xs border border-[#dec1af]/40 overflow-hidden flex flex-col">
            <div className="p-4 bg-[#f4f3f1] border-b border-[#dec1af]/30 flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1a1c1b]">Movimentações Recentes</h3>
              <span className="text-[11px] text-[#574335]">{movements.length} lançamentos</span>
            </div>

            <div className="p-3 flex flex-col gap-2 overflow-y-auto max-h-[300px]">
              {movements.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#574335]">
                  Nenhuma movimentação de estoque registrada.
                </div>
              ) : (
                movements.map((mov) => (
                  <div 
                    key={mov.id} 
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#f4f3f1] transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      mov.type === 'entrada' 
                        ? 'bg-[#9df897] text-[#002204]' 
                        : mov.type === 'saida'
                        ? 'bg-stone-200 text-stone-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {mov.type === 'entrada' ? (
                        <ArrowDown className="w-4 h-4" />
                      ) : mov.type === 'saida' ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#1a1c1b] truncate">{mov.title}</div>
                      <div className="text-[11px] text-[#574335] truncate">{mov.itemName}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold ${
                        mov.quantity > 0 ? 'text-[#0d6e1f]' : 'text-[#574335]'
                      }`}>
                        {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity} {mov.unit}
                      </span>
                      <div className="text-[10px] text-[#574335]/70">{mov.timestamp}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Novo Item de Estoque */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden">
            <div className="p-4 bg-[#954a00] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Warehouse className="w-4 h-4" /> Cadastrar Insumo / Matéria-Prima
              </h3>
              <button onClick={() => setIsNewItemModalOpen(false)}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MP-001"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Categoria *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as InventoryItem['category'])}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg bg-white"
                  >
                    <option value="Matéria-Prima">Matéria-Prima</option>
                    <option value="Embalagens">Embalagens (Frascos, Potes)</option>
                    <option value="Componentes">Componentes (Rótulos, Válvulas)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Nome do Insumo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Base Glicerinada Vegetal 100% Pura"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Saldo Inicial</label>
                  <input
                    type="number"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Mínimo</label>
                  <input
                    type="number"
                    value={newMin}
                    onChange={(e) => setNewMin(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Unidade</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="KG, L, UN"
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Custo Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#f47d00]" />
                  Link Direto da Foto (HTML)
                </label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/material.jpg"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dec1af]/30">
                <button
                  type="button"
                  onClick={() => setIsNewItemModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 text-[#574335] font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lançar Movimento de Estoque */}
      {isStockAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden">
            <div className="p-4 bg-[#954a00] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Lançar Movimentação de Estoque
              </h3>
              <button onClick={() => setIsStockAdjustmentModalOpen(false)}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#574335] mb-1">Selecionar Insumo *</label>
                <select
                  value={adjustItemCode || (items[0] && items[0].code)}
                  onChange={(e) => setAdjustItemCode(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg bg-white"
                >
                  {items.map(i => (
                    <option key={i.id} value={i.code}>
                      {i.code} - {i.name} (Saldo: {i.balance} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Tipo de Movimento</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg bg-white"
                  >
                    <option value="entrada">Entrada (+)</option>
                    <option value="saida">Saída (-)</option>
                    <option value="ajuste">Ajuste de Balanço</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Quantidade</label>
                  <input
                    type="number"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-bold text-[#1a1c1b]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Motivo / Documento</label>
                <input
                  type="text"
                  placeholder="Ex: NFe 10429 ou Produção Lote Saboaria"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dec1af]/30">
                <button
                  type="button"
                  onClick={() => setIsStockAdjustmentModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 text-[#574335] font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] text-white font-bold rounded-xl shadow-xs"
                >
                  Confirmar Movimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Insumo do Estoque */}
      {isEditItemModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden">
            <div className="p-4 bg-[#954a00] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-200" /> Editar Item do Estoque: {editingItem.name}
              </h3>
              <button onClick={() => setIsEditItemModalOpen(false)}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleUpdateItemSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Código / SKU *</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Categoria *</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg bg-white"
                  >
                    <option value="Matéria-Prima">Matéria-Prima</option>
                    <option value="Embalagens">Embalagens</option>
                    <option value="Componentes">Componentes</option>
                    <option value="Insumos">Insumos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Nome do Insumo / Item *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg font-semibold text-[#1a1c1b]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Unidade</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg bg-white"
                  >
                    <option value="KG">Quilo (KG)</option>
                    <option value="G">Gramas (G)</option>
                    <option value="ML">Mililitros (ML)</option>
                    <option value="L">Litros (L)</option>
                    <option value="UN">Unidade (UN)</option>
                    <option value="PCT">Pacote (PCT)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Saldo Atual</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Custo Un. (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-bold text-[#954a00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={editMin}
                    onChange={(e) => setEditMin(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Estoque Máximo</label>
                  <input
                    type="number"
                    min="0"
                    value={editMax}
                    onChange={(e) => setEditMax(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Lote Atual / Origem</label>
                  <input
                    type="text"
                    placeholder="Ex: LOTE-2025-01"
                    value={editBatch}
                    onChange={(e) => setEditBatch(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-[#f47d00]" />
                    URL da Imagem
                  </label>
                  <input
                    type="url"
                    placeholder="https://exemplo.com/foto.png"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dec1af]/30">
                <button
                  type="button"
                  onClick={() => setIsEditItemModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 text-[#574335] font-bold rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
